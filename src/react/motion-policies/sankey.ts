import { createMotionCollector, type DiagramMotionPolicy } from "../motion-policy.ts";
export const sankeyMotion: DiagramMotionPolicy = (scene) => {
  const c = createMotionCollector(scene);
  let min = Infinity,
    max = -Infinity;
  for (const p of scene.primitives) {
    if (p.semantic?.kind !== "edge" || p.type !== "path") continue;
    const x = p.points[0]?.x ?? 0;
    min = Math.min(min, x);
    max = Math.max(max, x);
  }
  const span = Math.max(1, max - min);
  for (const p of scene.primitives) {
    if (p.semantic?.kind === "edge" && p.type === "path") {
      const phase = Math.min(5, Math.floor((((p.points[0]?.x ?? min) - min) / span) * 5));
      c.layer(p, `flow:${phase}`, { mode: "draw-x", delay: phase * 0.08 });
    } else if (p.semantic?.kind === "node") c.layer(p, "nodes", { mode: "fade", delay: 0.5 });
    else c.static(p);
  }
  return c.finish();
};
