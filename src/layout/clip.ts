import type { Point, Rect } from "../types.ts";
/** Liang–Barsky clipping preserves linear intersections at plot boundaries. */
export function clipPolyline(points: Point[], rect: Rect): Point[][] {
  const paths: Point[][] = [];
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1],
      b = points[index],
      dx = b.x - a.x,
      dy = b.y - a.y;
    let enter = 0,
      exit = 1,
      visible = true;
    for (const [p, q] of [
      [-dx, a.x - rect.x],
      [dx, rect.x + rect.width - a.x],
      [-dy, a.y - rect.y],
      [dy, rect.y + rect.height - a.y],
    ]) {
      if (p === 0) {
        if (q < 0) visible = false;
        continue;
      }
      const t = q / p;
      if (p < 0) enter = Math.max(enter, t);
      else exit = Math.min(exit, t);
      if (enter > exit) visible = false;
    }
    if (!visible) continue;
    const start = { x: a.x + enter * dx, y: a.y + enter * dy },
      end = { x: a.x + exit * dx, y: a.y + exit * dy };
    const previous = paths.at(-1),
      last = previous?.at(-1);
    if (last && Math.abs(last.x - start.x) < 1e-8 && Math.abs(last.y - start.y) < 1e-8)
      previous!.push(end);
    else paths.push([start, end]);
  }
  return paths;
}
