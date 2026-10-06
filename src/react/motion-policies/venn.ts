import { createMotionCollector, type DiagramMotionPolicy } from "../motion-policy.ts";

/** Set contours retain their intersections throughout entrance; labels follow overlaps. */
export const vennMotion: DiagramMotionPolicy = (scene) => {
  const collector = createMotionCollector(scene);
  const regionLabels = new Set(
    scene.interactions?.map((interaction) => interaction.label.replace(/\s+/g, " ")) ?? [],
  );
  for (const primitive of scene.primitives) {
    const phase = Math.min(3, primitive.semantic?.row ?? 0);
    if (primitive.semantic?.role === "venn-contour") {
      collector.layer(primitive, `contour:${phase}`, {
        mode: "trace",
        delay: phase * 0.07,
        span: 0.34,
      });
    } else if (primitive.semantic?.role === "venn-fill") {
      collector.layer(primitive, `overlap:${phase}`, {
        mode: "fade",
        delay: 0.2 + phase * 0.07,
        span: 0.4,
      });
    } else if (primitive.type === "text" && regionLabels.has(primitive.text.replace(/\s+/g, " "))) {
      collector.layer(primitive, "overlap-labels", { mode: "fade", delay: 0.5, span: 0.36 });
    } else collector.static(primitive);
  }
  return collector.finish();
};
