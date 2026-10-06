import { createMotionCollector, type DiagramMotionPolicy } from "../motion-policy.ts";

/** Bars grow from the authored zero; line segments follow the categorical axis. */
export const xychartMotion: DiagramMotionPolicy = (scene) => {
  const motion = createMotionCollector(scene);
  const points = (scene.interactions ?? []).filter((item) => item.id.startsWith("xy-"));
  const centers = new Map<string, { x: number; y: number }[]>();
  for (const point of points) {
    const center = { x: point.x + point.width / 2, y: point.y + point.height / 2 };
    const key = `${Math.floor(center.x * 10)}:${Math.floor(center.y * 10)}`;
    const bucket = centers.get(key) ?? [];
    bucket.push(center);
    centers.set(key, bucket);
  }
  const hasPoint = (x: number, y: number) => {
    const cellX = Math.floor(x * 10),
      cellY = Math.floor(y * 10);
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (const point of centers.get(`${cellX + dx}:${cellY + dy}`) ?? [])
          if (Math.abs(point.x - x) < 0.1 && Math.abs(point.y - y) < 0.1) return true;
    return false;
  };
  const direction = scene.primitives.find((p) => p.type === "path" && p.motion);
  const axis = direction?.type === "path" ? direction.motion!.axis : "x";
  for (const p of scene.primitives) {
    if (motion.number(p)) continue;
    if (p.type === "shape" && p.motion && Number.isFinite(p.motion.baseline)) {
      motion.layer(p, `bars:${p.fill}:${p.motion.axis}:${p.motion.baseline}`, {
        mode: p.motion.axis === "x" ? "grow-x" : "grow-y",
        baseline: p.motion.baseline,
      });
    } else if (p.type === "path" && p.strokeRole === "series") {
      motion.layer(p, "lines", { mode: p.motion?.axis === "y" ? "draw-y" : "draw-x", delay: 0.22 });
    } else if (
      p.type === "shape" &&
      p.shape === "circle" &&
      hasPoint(p.x + p.width / 2, p.y + p.height / 2)
    ) {
      motion.layer(p, "lines", { mode: axis === "y" ? "draw-y" : "draw-x", delay: 0.22 });
    } else motion.static(p);
  }
  return motion.finish();
};
