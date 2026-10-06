import type { Skia, SkPath } from "react-native-skia";
import type { Point, Primitive } from "../types.ts";
import { cubicMarkerShaft, curveSegments, markerShaft } from "../render/geometry.ts";
import { resolveColor, resolveStrokeWidth, type DiagramTheme } from "../render/theme.ts";

export type TracePrimitive = Extract<Primitive, { type: "path" }>;
type PathApi = Pick<typeof Skia, "PathBuilder">;
export interface NativeTraceRecord {
  path: SkPath;
  color: string;
  width: number;
  opacity: number;
  dash?: number[];
  gradient?: { from: Point; to: Point; colors: string[]; positions: number[] };
}

/** The same marker-shortened shaft and cubic interpolation used by the renderer. */
export function createNativeStrokePathWithApi(
  api: PathApi,
  p: TracePrimitive,
  theme: DiagramTheme,
): SkPath {
  const authored =
    p.curves && p.points[0]
      ? cubicMarkerShaft(p.points[0], p.curves, p.start, p.end, theme.arrowSize ?? 10)
      : undefined;
  const points = authored
    ? [authored.start]
    : markerShaft(p.points, p.start, p.end, theme.arrowSize ?? 10);
  const curves = authored?.curves ?? (p.smooth ? curveSegments(points) : undefined);
  const geometry = [...points, ...(curves?.flatMap((c) => [c.control1, c.control2, c.end]) ?? [])];
  if (
    !points.length ||
    geometry.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))
  )
    throw new RangeError("Native trace requires finite nonempty path geometry");
  const builder = api.PathBuilder.Make();
  try {
    builder.moveTo(points[0]!.x, points[0]!.y);
    if (curves)
      for (const c of curves)
        builder.cubicTo(c.control1.x, c.control1.y, c.control2.x, c.control2.y, c.end.x, c.end.y);
    else for (const point of points.slice(1)) builder.lineTo(point.x, point.y);
    if (p.closed) builder.close();
    return builder.detach();
  } finally {
    builder.dispose();
  }
}

/** Ownership transfers to the caller only after the complete bundle succeeds. */
export function recordNativeTracesWithApi(
  api: PathApi,
  primitives: readonly TracePrimitive[],
  theme: DiagramTheme,
): { traces: NativeTraceRecord[]; resources: SkPath[] } {
  const resources: SkPath[] = [],
    traces: NativeTraceRecord[] = [];
  try {
    for (const p of primitives) {
      if (p.fill && p.fill !== "none" && p.fill !== "transparent")
        throw new TypeError("Filled paths must retain their recorded Picture");
      const width = resolveStrokeWidth(p, theme);
      if (
        !Number.isFinite(width) ||
        width < 0 ||
        (p.opacity !== undefined && !Number.isFinite(p.opacity))
      )
        throw new RangeError("Native trace requires finite paint values");
      if (
        p.dash?.some((interval) => !Number.isFinite(interval) || interval < 0) ||
        (p.dash?.length && !p.dash.some((interval) => interval > 0))
      )
        throw new RangeError(
          "Native trace dash intervals must be finite and nonnegative with a positive sum",
        );
      const path = createNativeStrokePathWithApi(api, p, theme);
      resources.push(path);
      const stops = p.gradient?.stops.slice().sort((a, b) => a.offset - b.offset);
      if (
        p.gradient &&
        (!Number.isFinite(p.gradient.from.x) ||
          !Number.isFinite(p.gradient.from.y) ||
          !Number.isFinite(p.gradient.to.x) ||
          !Number.isFinite(p.gradient.to.y) ||
          stops?.some((stop) => !Number.isFinite(stop.offset)))
      )
        throw new RangeError("Native trace gradient geometry must be finite");
      traces.push({
        path,
        width,
        color: resolveColor(p.stroke, theme.edgeStroke, theme),
        opacity: Math.max(0, Math.min(1, p.opacity ?? 1)),
        dash: p.dash?.length
          ? p.dash.length % 2
            ? [...p.dash, ...p.dash]
            : p.dash.slice()
          : undefined,
        gradient:
          p.gradient && stops && stops.length >= 2
            ? {
                from: { ...p.gradient.from },
                to: { ...p.gradient.to },
                colors: stops.map((stop) => resolveColor(stop.color, theme.edgeStroke, theme)),
                positions: stops.map((stop) => Math.max(0, Math.min(1, stop.offset))),
              }
            : undefined,
      });
    }
    return { traces, resources };
  } catch (error) {
    for (const resource of resources) resource.dispose();
    throw error;
  }
}
