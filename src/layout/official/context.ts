import { boundedNumber } from "../options.ts";
import { clonePrimitive, translatePrimitive } from "../scene-geometry.ts";
import { translateInteraction } from "../interactions.ts";
import type {
  DiagramKind,
  DiagramInteraction,
  LayoutOptions,
  Point,
  Primitive,
  Rect,
  Scene,
  Shape,
  TextMeasurer,
} from "../../types.ts";
import { runsForLines } from "../../render/text.ts";

/** Shared native primitive construction. Geometry remains independent of the palette. */
export class OfficialScene {
  readonly primitives: Primitive[] = [];
  readonly interactions: DiagramInteraction[] = [];
  readonly fontSize: number;
  readonly padding: number;
  readonly top: number;
  constructor(
    readonly kind: DiagramKind,
    readonly measure: TextMeasurer,
    readonly options: LayoutOptions,
    readonly title?: string,
  ) {
    this.fontSize = boundedNumber(options.fontSize, 14, 6, 72);
    this.padding = boundedNumber(options.padding, 20, 0, 200);
    this.top = this.padding + (title ? this.fontSize * 2.8 : 0);
    if (title) {
      const titleWidth =
        options.viewportWidth === undefined
          ? undefined
          : Math.max(48, options.viewportWidth - this.padding * 2);
      this.text(
        title,
        this.padding,
        this.padding,
        titleWidth,
        "nodeText",
        600,
        this.fontSize * 1.3,
      );
      const titleText = this.primitives.at(-1)!;
      if (titleText.type === "text")
        this.top =
          this.padding + Math.max(this.fontSize * 2.8, titleText.height + this.fontSize * 0.7);
    }
  }
  text(
    value: string,
    x: number,
    y: number,
    width?: number,
    color = "nodeText",
    weight = 400,
    fontSize = this.fontSize,
  ): void {
    if (!value) return;
    const m = this.measure(value, { fontSize, fontWeight: weight, maxWidth: width });
    this.primitives.push({
      type: "text",
      text: value,
      x,
      y,
      width: width ?? m.width,
      height: m.height,
      fontSize,
      fontWeight: weight,
      color,
      lineBaselines: m.lineBaselines,
      lineRuns: runsForLines(value, m.lines),
    });
  }
  box(
    rect: Rect,
    fill: string | undefined = "nodeFill",
    stroke = "nodeStroke",
    shape: Shape = "round",
    id?: string,
  ): void {
    this.primitives.push({
      type: "shape",
      ...rect,
      shape,
      radius: this.options.radius ?? 8,
      fill,
      stroke,
      id,
      strokeRole: "node",
    });
  }
  line(points: Point[], stroke = "edgeStroke", arrow = false, dash?: number[]): void {
    this.primitives.push({
      type: "path",
      points,
      stroke,
      strokeRole: "edge",
      end: arrow ? "arrow" : "none",
      dash,
    });
  }
  data(id: string, label: string, bounds: Rect, value?: number, tooltip = label): void {
    this.interactions.push({ ...bounds, id, label, kind: "data", target: id, value, tooltip });
  }
  icon(name: string, bounds: Rect): boolean {
    const primitives = this.options.resolveIcon?.(name, bounds);
    if (primitives === undefined) return false;
    for (const primitive of primitives) this.primitives.push(clonePrimitive(primitive));
    return true;
  }
  finish(): Scene {
    let minX = 0,
      minY = 0,
      maxX = this.padding,
      maxY = this.top;
    for (const p of this.primitives) {
      if (p.type === "path")
        for (const point of [
          ...p.points,
          ...(p.curves?.flatMap((c) => [c.control1, c.control2, c.end]) ?? []),
        ]) {
          minX = Math.min(minX, point.x);
          minY = Math.min(minY, point.y);
          maxX = Math.max(maxX, point.x);
          maxY = Math.max(maxY, point.y);
        }
      else {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x + p.width);
        maxY = Math.max(maxY, p.y + p.height);
      }
    }
    if (minX < 0 || minY < 0) {
      const dx = minX < 0 ? this.padding - minX : 0,
        dy = minY < 0 ? this.padding - minY : 0;
      for (let index = 0; index < this.primitives.length; index++)
        this.primitives[index] = translatePrimitive(this.primitives[index], dx, dy);
      for (let index = 0; index < this.interactions.length; index++)
        this.interactions[index] = translateInteraction(this.interactions[index], dx, dy);
      maxX += dx;
      maxY += dy;
    }
    return {
      kind: this.kind,
      bounds: { x: 0, y: 0, width: maxX + this.padding, height: maxY + this.padding },
      primitives: this.primitives,
      interactions: this.interactions,
      accessibilityLabel: this.primitives
        .filter((p) => p.type === "text")
        .map((p) => p.text)
        .join(". "),
    };
  }
}
export function reference(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const v = value as Record<string, unknown>;
    return String(v.$refText ?? v.name ?? "");
  }
  return "";
}
export function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}
