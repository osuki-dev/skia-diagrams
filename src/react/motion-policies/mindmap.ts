import { createMotionCollector, type DiagramMotionPolicy } from "../motion-policy.ts";

/** Root first, then branch strokes and their complete node/icon/label groups.
 * Scale pivots belong to each group's node, avoiding a chart-wide text drift. */
export const mindmapMotion: DiagramMotionPolicy = (scene) => {
  const motion = createMotionCollector(scene);
  const bodies = new Map(
    scene.primitives.flatMap((p) =>
      p.type === "shape" && p.semantic?.kind === "node" && p.semantic.part === "body"
        ? [[p.semantic.id, p] as const]
        : [],
    ),
  );
  const root = [...bodies.values()].find((shape) => shape.semantic?.role === "root");
  for (const p of scene.primitives) {
    const semantic = p.semantic;
    if (!semantic) {
      motion.static(p);
      continue;
    }
    const phase = Math.min(3, Math.max(0, semantic.row ?? 0));
    if (semantic.kind === "edge")
      motion.layer(p, `branch-stroke:${phase}`, {
        mode: "trace",
        delay: Math.max(0, phase - 1) * 0.17 + 0.1,
        span: 0.22,
      });
    else {
      const body = bodies.get(semantic.id);
      const pivot = root ?? body;
      motion.layer(p, `branch-node:${phase}`, {
        mode: "scale",
        delay: phase ? phase * 0.17 + 0.1 : 0,
        span: 0.23,
        ...(pivot
          ? { center: { x: pivot.x + pivot.width / 2, y: pivot.y + pivot.height / 2 } }
          : {}),
      });
    }
  }
  return motion.finish();
};
