import type { Point, Primitive, Rect, Scene } from "../types.ts";
import type { DiagramTheme } from "./theme.ts";
import { resolveStrokeWidth } from "./theme.ts";

function finite(value: unknown, name: string, nonnegative = false): void {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isFinite(Math.fround(value)) ||
    (nonnegative && value < 0)
  )
    throw new RangeError(
      `Native drawing requires finite ${nonnegative ? "nonnegative " : ""}${name}`,
    );
}
function point(value: Point): void {
  finite(value?.x, "point x");
  finite(value?.y, "point y");
}
function rect(value: Rect): void {
  point(value);
  finite(value?.width, "rectangle width", true);
  finite(value?.height, "rectangle height", true);
  finite(value.x + value.width, "rectangle right");
  finite(value.y + value.height, "rectangle bottom");
}
function primitive(value: Primitive, theme: DiagramTheme): void {
  if (!value || typeof value !== "object") throw new TypeError("Invalid native primitive");
  finite(resolveStrokeWidth(value, theme), "stroke width", true);
  if (value.opacity !== undefined) finite(value.opacity, "opacity");
  if ("fontWeight" in value && value.fontWeight !== undefined)
    finite(value.fontWeight, "font weight", true);
  if (value.dash?.length) {
    let sum = 0;
    for (const interval of value.dash) {
      finite(interval, "dash interval", true);
      sum += interval;
    }
    if (!Number.isFinite(sum) || !Number.isFinite(Math.fround(sum)) || sum <= 0)
      throw new RangeError("Native drawing requires a finite positive dash sum");
  }
  if (value.gradient) {
    point(value.gradient.from);
    point(value.gradient.to);
    for (const stop of value.gradient.stops) finite(stop.offset, "gradient offset");
  }
  if ("textOutline" in value && value.textOutline)
    finite(value.textOutline.width, "text outline width", true);
  switch (value.type) {
    case "path":
      for (const item of value.points) point(item);
      if (value.curves?.length && !value.points.length)
        throw new RangeError("Native cubic paths require an initial point");
      for (const curve of value.curves ?? []) {
        point(curve.control1);
        point(curve.control2);
        point(curve.end);
      }
      break;
    case "shape":
      rect(value);
      if (value.radius !== undefined) finite(value.radius, "shape radius", true);
      break;
    case "sector":
      rect(value);
      finite(value.cx, "sector center x");
      finite(value.cy, "sector center y");
      finite(value.radius, "sector radius", true);
      if (value.innerRadius !== undefined) finite(value.innerRadius, "sector inner radius", true);
      finite(value.startAngle, "sector start angle");
      finite(value.sweepAngle, "sector sweep angle");
      break;
    case "text":
      rect(value);
      finite(value.fontSize, "text font size", true);
      if (typeof value.text !== "string") throw new TypeError("Native text must be a string");
      for (const baseline of value.lineBaselines ?? []) finite(baseline, "text baseline");
      break;
    case "image":
      rect(value);
      break;
    default:
      throw new TypeError("Unsupported native primitive");
  }
}

/** Reject unsafe numbers before crossing JSI or allocating native resources.
 * Shared public drawing entries call this once; validated replay stays private. */
export function validateNativeScene(scene: Scene, theme: DiagramTheme): void {
  rect(scene?.bounds);
  if (scene.bounds.width <= 0 || scene.bounds.height <= 0)
    throw new RangeError("Native drawing bounds must be positive");
  if (!Array.isArray(scene.primitives)) throw new TypeError("Native primitives must be an array");
  if (typeof theme.fontFamily !== "string")
    throw new TypeError("Native font family must be a string");
  finite(theme.strokeWidth, "theme stroke width", true);
  finite(theme.radius, "theme radius", true);
  finite(theme.fontSize, "theme font size", true);
  if (theme.arrowSize !== undefined) finite(theme.arrowSize, "arrow size", true);
  for (const item of scene.primitives) primitive(item, theme);
}
