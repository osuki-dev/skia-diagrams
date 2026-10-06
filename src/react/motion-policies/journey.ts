import { createMotionCollector, type DiagramMotionPolicy } from "../motion-policy.ts";

/** Each authored task leads its satisfaction score and participating actor activity. */
export const journeyMotion: DiagramMotionPolicy = (scene) => {
  const motion = createMotionCollector(scene);
  let count = 0;
  for (const p of scene.primitives)
    if (p.semantic?.row !== undefined) count = Math.max(count, p.semantic.row + 1);
  for (const p of scene.primitives) {
    const tag = p.semantic;
    if (tag?.row === undefined) {
      motion.static(p);
      continue;
    }
    const step = Math.min(3, Math.floor((tag.row * 4) / Math.max(1, count)));
    if (tag.role === "stage" || tag.id.startsWith("journey:event:"))
      motion.layer(p, `stage:${step}`, { mode: "draw-x", delay: step * 0.13 });
    else if (tag.role === "score" || tag.id.startsWith("journey:score:"))
      motion.layer(p, `score:${step}`, {
        mode: "fade",
        delay: 0.18 + step * 0.13,
      });
    else if (tag.role === "actor-link")
      motion.layer(p, `actor-link:${Math.floor(step / 2)}`, {
        mode: "trace",
        delay: 0.45 + Math.floor(step / 2) * 0.18,
      });
    else
      motion.layer(p, `actor-activity:${Math.floor(step / 2)}`, {
        mode: "lift",
        delay: 0.35 + Math.floor(step / 2) * 0.18,
      });
  }
  return motion.finish();
};
