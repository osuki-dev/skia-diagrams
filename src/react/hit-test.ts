import type { DiagramInteraction, Point, Rect, Scene } from "../types.ts";
const tau = Math.PI * 2;
const normalize = (angle: number) => ((angle % tau) + tau) % tau;
function inPolygon(points: readonly Point[], point: Point): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[j],
      b = points[i];
    const cross = (point.x - a.x) * (b.y - a.y) - (point.y - a.y) * (b.x - a.x);
    if (
      Math.abs(cross) < 1e-8 &&
      point.x >= Math.min(a.x, b.x) &&
      point.x <= Math.max(a.x, b.x) &&
      point.y >= Math.min(a.y, b.y) &&
      point.y <= Math.max(a.y, b.y)
    )
      return true;
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}
/** Test semantic geometry rather than overlapping bounding boxes. */
export function hitTestInteraction(scene: Scene, point: Point): DiagramInteraction | undefined {
  const interactions = scene.interactions ?? [];
  for (let index = interactions.length - 1; index >= 0; index--) {
    const item = interactions[index];
    if (
      point.x < item.x ||
      point.x > item.x + item.width ||
      point.y < item.y ||
      point.y > item.y + item.height
    )
      continue;
    const hit = item.hit;
    if (hit?.type === "sector" || hit?.type === "circle") {
      const distance = Math.hypot(point.x - hit.cx, point.y - hit.cy);
      if (distance > hit.radius || (hit.type === "sector" && distance < (hit.innerRadius ?? 0)))
        continue;
      if (
        hit.type === "sector" &&
        hit.sweepAngle < tau &&
        normalize(Math.atan2(point.y - hit.cy, point.x - hit.cx) - hit.startAngle) > hit.sweepAngle
      )
        continue;
    } else if (hit?.type === "polygon" && !inPolygon(hit.points, point)) continue;
    else if (
      hit?.type === "venn" &&
      !hit.circles.every(
        (circle) =>
          Math.hypot(point.x - circle.cx, point.y - circle.cy) <= circle.radius === circle.included,
      )
    )
      continue;
    return item;
  }
}

/** Invert the viewer centering, pan and zoom exactly before semantic hit testing. */
export function viewerPointToScene(
  point: Point,
  bounds: Rect,
  viewport: { width: number; height: number },
  scale: number,
  pan: Point,
): Point {
  return {
    x: (point.x - (viewport.width - bounds.width * scale) / 2 - pan.x) / scale + bounds.x,
    y: (point.y - (viewport.height - bounds.height * scale) / 2 - pan.y) / scale + bounds.y,
  };
}
