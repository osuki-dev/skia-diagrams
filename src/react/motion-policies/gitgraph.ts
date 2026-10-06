import { createMotionCollector, type DiagramMotionPolicy } from "../motion-policy.ts";

/** Branch connections precede their chronological commits; tags and labels
 * belong to that commit's phase rather than a chart-wide text fade. */
export const gitgraphMotion: DiagramMotionPolicy = (scene) => {
  const motion = createMotionCollector(scene);
  const maximum = Math.max(1, ...scene.primitives.map((p) => p.semantic?.row ?? 0));
  for (const p of scene.primitives) {
    const semantic = p.semantic;
    if (!semantic || semantic.kind === "frame") {
      motion.static(p);
      continue;
    }
    const phase = Math.min(3, Math.floor(((semantic.row ?? 0) * 3) / maximum));
    if (semantic.kind === "edge")
      motion.layer(p, `track:${phase}`, { mode: "trace", delay: phase * 0.16, span: 0.22 });
    else
      motion.layer(p, `commit:${phase}`, { mode: "fade", delay: 0.1 + phase * 0.16, span: 0.24 });
  }
  return motion.finish();
};
