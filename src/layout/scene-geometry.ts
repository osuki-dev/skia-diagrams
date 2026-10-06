import type { Point, Primitive } from "../types.ts";

const shifted = (point: Point, dx: number, dy: number): Point => ({
  ...point,
  x: point.x + dx,
  y: point.y + dy,
});

/** Own mutable scene geometry without mutating host-provided icon primitives. */
export function clonePrimitive(primitive: Primitive, dx = 0, dy = 0): Primitive {
  const copy = { ...primitive };
  if (copy.gradient)
    copy.gradient = {
      ...copy.gradient,
      from: shifted(copy.gradient.from, dx, dy),
      to: shifted(copy.gradient.to, dx, dy),
      stops: copy.gradient.stops.map((stop) => ({ ...stop })),
    };
  if (copy.dash) copy.dash = [...copy.dash];
  if (copy.type === "path") {
    copy.points = copy.points.map((point) => shifted(point, dx, dy));
    if (copy.curves)
      copy.curves = copy.curves.map((curve) => ({
        control1: shifted(curve.control1, dx, dy),
        control2: shifted(curve.control2, dx, dy),
        end: shifted(curve.end, dx, dy),
      }));
  } else if (copy.type === "text") {
    if (copy.motion) copy.motion = { ...copy.motion };
    if (copy.lineRuns) copy.lineRuns = copy.lineRuns.map((line) => line.map((run) => ({ ...run })));
    if (copy.lineBaselines) copy.lineBaselines = [...copy.lineBaselines];
  }
  if (copy.type !== "path") {
    copy.x += dx;
    copy.y += dy;
    if (copy.type === "sector") {
      copy.cx += dx;
      copy.cy += dy;
    }
    if (copy.type === "shape" && copy.motion)
      copy.motion = {
        ...copy.motion,
        baseline: copy.motion.baseline + (copy.motion.axis === "x" ? dx : dy),
      };
  }
  return copy;
}

/** Translate every scene-coordinate field, including authored gradients and sectors. */
export function translatePrimitive(primitive: Primitive, dx: number, dy: number): Primitive {
  return clonePrimitive(primitive, dx, dy);
}
