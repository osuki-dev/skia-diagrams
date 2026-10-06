import { createMotionCollector, type DiagramMotionPolicy } from "../motion-policy.ts";

/** Author chronology owns the phases; the horizontal or vertical axis remains fixed. */
export const timelineMotion: DiagramMotionPolicy = (scene) => {
  const motion = createMotionCollector(scene);
  let eventCount = 0;
  for (const primitive of scene.primitives) {
    if (primitive.semantic?.row !== undefined)
      eventCount = Math.max(eventCount, primitive.semantic.row + 1);
  }
  for (const primitive of scene.primitives) {
    const semantic = primitive.semantic;
    if (!semantic || semantic.row === undefined) {
      motion.static(primitive);
      continue;
    }
    const phase = Math.min(3, Math.floor((semantic.row * 4) / Math.max(1, eventCount)));
    if (semantic.role === "stem")
      motion.layer(primitive, `stem:${phase}`, { mode: "trace", delay: phase * 0.14 });
    else if (semantic.role === "marker")
      motion.layer(primitive, `marker:${phase}`, { mode: "fade", delay: phase * 0.14 + 0.12 });
    else if (semantic.role === "event" || semantic.role === "body" || semantic.role === "label")
      motion.layer(primitive, `event:${phase}`, { mode: "lift", delay: phase * 0.14 + 0.22 });
    else motion.static(primitive);
  }
  return motion.finish();
};
