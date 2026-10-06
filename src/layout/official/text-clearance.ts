import type { Point, Primitive, Rect } from "../../types.ts";

/** Leave small, transparent gaps where straight dependency strokes meet labels. */
export function clearTextFromPaths(primitives: readonly Primitive[], padding = 3): Primitive[] {
  const labels = primitives.flatMap((p) =>
    p.type === "text"
      ? [
          {
            x: p.x - padding,
            y: p.y - padding,
            width: p.width + padding * 2,
            height: p.height + padding * 2,
          },
        ]
      : [],
  );
  return primitives.flatMap((p): Primitive[] => {
    if (
      p.type !== "path" ||
      p.curves?.length ||
      (p.stroke !== "edgeStroke" && p.stroke !== "palette:0")
    )
      return [p];
    if (
      !p.points.some(
        (point, index) =>
          index > 0 && labels.some((label) => segmentInRect(p.points[index - 1]!, point, label)),
      )
    )
      return [p];
    const result: Primitive[] = [];
    for (let index = 1; index < p.points.length; index++) {
      const a = p.points[index - 1]!,
        b = p.points[index]!;
      const blocked = labels
        .flatMap((label) => {
          const interval = segmentInRect(a, b, label);
          return interval ? [interval] : [];
        })
        .sort((a, b) => a[0] - b[0]);
      let cursor = 0;
      const add = (from: number, to: number): void => {
        if (to - from < 1e-8) return;
        const at = (t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        result.push({
          ...p,
          points: [at(from), at(to)],
          start: index === 1 && from === 0 ? p.start : "none",
          end: index === p.points.length - 1 && to === 1 ? p.end : "none",
        });
      };
      for (const [from, to] of blocked) {
        if (from > cursor) add(cursor, from);
        cursor = Math.max(cursor, to);
      }
      if (cursor < 1) add(cursor, 1);
    }
    return result;
  });
}

/** Parameter interval inside a rectangle, using slab clipping. */
function segmentInRect(a: Point, b: Point, rect: Rect): [number, number] | undefined {
  let enter = 0,
    leave = 1;
  for (const [position, delta, minimum, maximum] of [
    [a.x, b.x - a.x, rect.x, rect.x + rect.width],
    [a.y, b.y - a.y, rect.y, rect.y + rect.height],
  ] as const) {
    if (Math.abs(delta) < 1e-12) {
      if (position < minimum || position > maximum) return;
      continue;
    }
    const first = (minimum - position) / delta,
      last = (maximum - position) / delta;
    enter = Math.max(enter, Math.min(first, last));
    leave = Math.min(leave, Math.max(first, last));
    if (leave <= enter) return;
  }
  return [enter, leave];
}
