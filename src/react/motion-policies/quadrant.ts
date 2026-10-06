import { createMotionCollector, type DiagramMotionPolicy } from "../motion-policy.ts";

/** Axes and region semantics stay fixed; authored data appears at its real location. */
export const quadrantMotion: DiagramMotionPolicy = (scene) => {
  const collector = createMotionCollector(scene);
  const dataLabels = new Set(scene.interactions?.map((interaction) => interaction.label) ?? []);
  let marker = 0;
  for (const primitive of scene.primitives) {
    if (primitive.type === "shape" && primitive.shape === "circle") {
      const phase = Math.min(3, marker++ % 4);
      collector.layer(primitive, `markers:${phase}`, { mode: "fade", delay: phase * 0.07 });
    } else if (
      primitive.type === "text" &&
      (primitive.semantic?.role === "data-label" || dataLabels.has(primitive.text))
    ) {
      collector.layer(primitive, "data-labels", { mode: "fade", delay: 0.36 });
    } else collector.static(primitive);
  }
  return collector.finish();
};
