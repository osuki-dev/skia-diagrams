import { parseDiagram, parseDiagramAsync } from "../parse/index.ts";
import { layoutDiagram } from "./index.ts";
import type { Scene, TextMeasurer, DiagramError, LayoutOptions, ParsedDiagram } from "../types.ts";
import type { DiagramTheme } from "../render/theme.ts";
export type SceneResult =
  | { status: "ready"; scene: Scene }
  | { status: "error"; error: DiagramError }
  | { status: "unsupported"; type: string };
export function sourceHash(source: string): string {
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16);
}
/** LRU owns only serializable scenes, never a native resource or shared Picture.
 * Full source is part of the key so hash collisions cannot return another graph. */
export class SceneCache {
  private entries = new Map<string, { result: SceneResult; cost: number }>();
  private cost = 0;
  private pending = new Map<string, Promise<SceneResult>>();
  constructor(
    private maxEntries = 32,
    private maxPrimitives = 20000,
  ) {
    if (
      !Number.isSafeInteger(maxEntries) ||
      maxEntries < 0 ||
      !Number.isSafeInteger(maxPrimitives) ||
      maxPrimitives < 0
    )
      throw new RangeError("Scene cache budgets must be nonnegative safe integers");
  }
  key(source: string, theme: unknown, fontKey: string): string {
    return JSON.stringify([
      sourceHash(source),
      source.length > 200000 ? ["too-large", source.length] : source,
      theme,
      fontKey,
    ]);
  }
  /** Colors and line weights affect replay, not geometry. Font identity is
   * supplied separately so host providers never share incompatible metrics. */
  layoutKey(source: string, theme: DiagramTheme, fontKey: string): string {
    return this.key(
      source,
      [theme.fontFamily, theme.fontSize, theme.radius, theme.layout],
      fontKey,
    );
  }
  get(key: string): SceneResult | undefined {
    const entry = this.entries.get(key);
    if (!entry) return;
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.result;
  }
  prepare(
    key: string,
    source: string,
    measure: TextMeasurer,
    fontSize: number | LayoutOptions,
  ): SceneResult {
    const hit = this.get(key);
    if (hit) return hit;
    return this.finish(key, parseDiagram(source), measure, fontSize);
  }
  prepareAsync(
    key: string,
    source: string,
    measure: TextMeasurer,
    fontSize: number | LayoutOptions,
  ): Promise<SceneResult> {
    const hit = this.get(key);
    if (hit) return Promise.resolve(hit);
    const inFlight = this.pending.get(key);
    if (inFlight) return inFlight;
    const request = parseDiagramAsync(source)
      .then(
        (parsed) =>
          // A synchronous request may already have committed this exact geometry.
          this.get(key) ?? this.finish(key, parsed, measure, fontSize),
      )
      .finally(() => {
        this.pending.delete(key);
      });
    this.pending.set(key, request);
    return request;
  }
  private finish(
    key: string,
    parsed: ParsedDiagram,
    measure: TextMeasurer,
    fontSize: number | LayoutOptions,
  ): SceneResult {
    let result: SceneResult;
    if (parsed.kind === "error") result = { status: "error", error: parsed.error };
    else if (parsed.kind === "unsupported") result = { status: "unsupported", type: parsed.type };
    else {
      try {
        result = {
          status: "ready",
          scene: layoutDiagram(
            parsed,
            measure,
            typeof fontSize === "number" ? { fontSize } : fontSize,
          ),
        };
      } catch (error) {
        result = {
          status: "error",
          error: {
            kind: "layout",
            line: 1,
            column: 1,
            message: error instanceof Error ? error.message : "Layout failed",
          },
        };
      }
    }
    const cost = result.status === "ready" ? result.scene.primitives.length : 1;
    if (cost <= this.maxPrimitives) {
      this.entries.set(key, { result, cost });
      this.cost += cost;
      while (this.entries.size > this.maxEntries || this.cost > this.maxPrimitives) {
        const oldest = this.entries.keys().next().value!;
        this.cost -= this.entries.get(oldest)!.cost;
        this.entries.delete(oldest);
      }
    }
    return result;
  }
  get size() {
    return this.entries.size;
  }
  get primitiveCount() {
    return this.cost;
  }
}
