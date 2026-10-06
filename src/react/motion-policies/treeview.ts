import { createMotionCollector, type DiagramMotionPolicy } from "../motion-policy.ts";
export const treeviewMotion: DiagramMotionPolicy = (scene) => {
  const c = createMotionCollector(scene),
    rows = (scene.interactions ?? []).filter((i) => i.id.startsWith("treeview:"));
  for (const p of scene.primitives) {
    const y = p.type === "path" ? (p.points.at(-1)?.y ?? 0) : p.y;
    const row = rows.findIndex((r) => y >= r.y - 1 && y < r.y + r.height + 4);
    if (row < 0) c.static(p);
    else {
      const phase = Math.min(4, Math.floor(row / Math.max(1, Math.ceil(rows.length / 5))));
      c.layer(p, `hierarchy:${phase}:${p.type === "path" ? "branch" : "row"}`, {
        mode: p.type === "path" ? "draw-y" : "lift",
        delay: phase * 0.13,
      });
    }
  }
  return c.finish();
};
