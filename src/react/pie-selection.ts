import type { DiagramInteraction, Primitive, Scene } from "../types.ts";

/** Pie selection moves only chart geometry. Legends, titles and hit regions retain
 * their authored positions; the native host animates this logical-space vector. */
export function pieSelection(scene: Scene, selection: DiagramInteraction) {
  if (scene.kind !== "pie" || selection.hit?.type !== "sector") return undefined;
  const hit = selection.hit;
  const sector = scene.primitives.find(
    (p): p is Extract<Primitive, { type: "sector" }> =>
      p.type === "sector" &&
      p.cx === hit.cx &&
      p.cy === hit.cy &&
      p.startAngle === hit.startAngle &&
      p.sweepAngle === hit.sweepAngle,
  );
  if (!sector) return undefined;
  const row = sector.semantic?.row;
  const index = scene.primitives.filter((p) => p.type === "sector").indexOf(sector);
  const selected: Primitive[] = [],
    other: Primitive[] = [],
    fixed: Primitive[] = [];
  for (const p of scene.primitives) {
    const chart = p.type === "sector" || ["percentage", "callout"].includes(p.semantic?.role ?? "");
    if (!chart) fixed.push(p);
    else if (p === sector || (row !== undefined && p.semantic?.row === row)) selected.push(p);
    else other.push(p);
  }
  const angle = sector.startAngle + sector.sweepAngle / 2;
  const distance = scene.primitives.some((p) => p.semantic?.role === "rim")
    ? 0
    : Math.min(5, sector.radius * 0.035);
  return {
    selected,
    other,
    fixed,
    row: row ?? index,
    offset: { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance },
  };
}
