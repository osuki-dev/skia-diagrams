import { createMotionCollector, type DiagramMotionPolicy } from "../motion-policy.ts";
export const kanbanMotion: DiagramMotionPolicy = (scene) => {
  const c = createMotionCollector(scene);
  const cards = (scene.interactions ?? []).filter((i) => i.kind === "data");
  for (const p of scene.primitives) {
    if (p.type === "path") {
      c.static(p);
      continue;
    }
    const index = cards.findIndex(
      (r) =>
        p.x >= r.x &&
        p.y >= r.y &&
        p.x + p.width <= r.x + r.width + 1 &&
        p.y + p.height <= r.y + r.height + 1,
    );
    if (index < 0) c.static(p);
    else {
      const phase = Math.min(7, Math.floor(index / Math.max(1, Math.ceil(cards.length / 8))));
      c.layer(p, `cards:${phase}`, { mode: "lift", delay: phase * 0.08 });
    }
  }
  return c.finish();
};
