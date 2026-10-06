import type { DiagramInteraction } from "../types.ts";
/** Keep visual and semantic hit geometry aligned after title or bounds translation. */
export function translateInteraction(
  item: DiagramInteraction,
  dx: number,
  dy: number,
): DiagramInteraction {
  const hit = item.hit;
  return {
    ...item,
    x: item.x + dx,
    y: item.y + dy,
    ...(hit
      ? {
          hit:
            hit.type === "polygon"
              ? {
                  ...hit,
                  points: hit.points.map((point) => ({ x: point.x + dx, y: point.y + dy })),
                }
              : hit.type === "venn"
                ? {
                    ...hit,
                    circles: hit.circles.map((circle) => ({
                      ...circle,
                      cx: circle.cx + dx,
                      cy: circle.cy + dy,
                    })),
                  }
                : { ...hit, cx: hit.cx + dx, cy: hit.cy + dy },
        }
      : {}),
  };
}
