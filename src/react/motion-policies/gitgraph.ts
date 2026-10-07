import { createMotionCollector, type DiagramMotionPolicy } from "../motion-policy.ts";

/** Branch connections precede their chronological commits; tags and labels
 * belong to that commit's phase rather than a chart-wide text fade. */
export const gitgraphMotion: DiagramMotionPolicy = (scene) => {
  const motion = createMotionCollector(scene);
  let count = 1;
  for (const p of scene.primitives) count = Math.max(count, (p.semantic?.row ?? 0) + 1);
  const phases = Math.min(6, count);
  const step = 0.72 / Math.max(1, phases - 1);
  for (const p of scene.primitives) {
    const semantic = p.semantic;
    if (!semantic || semantic.kind === "frame") {
      motion.static(p);
      continue;
    }
    const phase = Math.min(phases - 1, Math.floor(((semantic.row ?? 0) * phases) / count));
    const arrival = 0.04 + phase * step;
    if (semantic.kind === "edge")
      motion.layer(p, `track:${phase}`, {
        mode: "trace",
        delay: Math.max(0, arrival - step),
        span: phase === 0 ? 0.04 : step,
        easing: "linear",
      });
    else motion.layer(p, `commit:${phase}`, { mode: "fade", delay: arrival, span: 0.18 });
  }
  return motion.finish();
};
