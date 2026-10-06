import { createMotionCollector, type DiagramMotionPolicy } from "../motion-policy.ts";
export const ishikawaMotion: DiagramMotionPolicy = (scene) => {
  const c = createMotionCollector(scene);
  let firstPath = true;
  for (const p of scene.primitives) {
    if (p.type === "path") {
      const spine = p.semantic?.id === "ishikawa-spine" || firstPath;
      const bone = p.semantic
        ? p.semantic.id.startsWith("bone:")
        : p.points.length === 2 &&
          p.points[0]!.x !== p.points[1]!.x &&
          p.points[0]!.y !== p.points[1]!.y;
      c.layer(p, spine ? "spine" : bone ? "bones" : "causes", {
        mode: spine && p.points[0]?.x === p.points[1]?.x ? "draw-y" : "draw-x",
        delay: spine ? 0 : bone ? 0.2 : 0.4,
      });
      firstPath = false;
    } else c.layer(p, "labels", { mode: "fade", delay: 0.55 });
  }
  return c.finish();
};
