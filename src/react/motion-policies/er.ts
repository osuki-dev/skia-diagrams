import { createMotionCollector, type DiagramMotionPolicy } from "../motion-policy.ts";

/** Entity attributes enter as complete rows so keys, types and comments stay together. */
export const erMotion: DiagramMotionPolicy = (scene) => {
  const collector = createMotionCollector(scene);
  for (const primitive of scene.primitives) {
    const semantic = primitive.semantic;
    if (semantic?.kind === "edge")
      collector.layer(
        primitive,
        semantic.part === "label" ? "cardinality-labels" : "cardinalities",
        {
          mode: semantic.part === "label" ? "fade" : "trace",
          delay: 0.48,
        },
      );
    else if (primitive.type === "text" && semantic?.kind === "node") {
      const row = Math.min(4, semantic.row ?? 0);
      collector.layer(primitive, semantic.role === "header" ? "entities" : `attribute-row:${row}`, {
        mode: semantic.role === "header" ? "fade" : "lift",
        delay: semantic.role === "header" ? 0.04 : 0.16 + row * 0.055,
      });
    } else collector.static(primitive);
  }
  return collector.finish();
};
