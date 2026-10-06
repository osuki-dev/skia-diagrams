import { createMotionCollector, type DiagramMotionPolicy } from "../motion-policy.ts";

/** Authored frame order drives commands, events, projections and outgoing causality. */
export const eventmodelingMotion: DiagramMotionPolicy = (scene) => {
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
    if (tag.role === "causal")
      motion.layer(p, `causal:${step}`, {
        mode: "trace",
        delay: 0.14 + step * 0.15,
      });
    else if (tag.role === "payload")
      motion.layer(p, `payload:${step}`, {
        mode: "fade",
        delay: 0.25 + step * 0.15,
      });
    else motion.layer(p, `frame:${step}`, { mode: "lift", delay: step * 0.15 });
  }
  return motion.finish();
};
