import { createMotionCollector, type DiagramMotionPolicy } from "../motion-policy.ts";

/** Class names, attributes, methods and relationships have separate reveal phases. */
export const classMotion: DiagramMotionPolicy = (scene) => {
  const collector = createMotionCollector(scene);
  for (const primitive of scene.primitives) {
    const semantic = primitive.semantic;
    if (semantic?.kind === "edge")
      collector.layer(
        primitive,
        semantic.part === "label" ? "relationship-labels" : "relationships",
        {
          mode: semantic.part === "label" ? "fade" : "trace",
          delay: 0.5,
        },
      );
    else if (primitive.type === "text" && semantic?.kind === "node") {
      const row = Math.min(2, semantic.row ?? 0);
      const role = semantic.role ?? "note";
      collector.layer(primitive, `${role}:${row}`, {
        mode: role === "method" ? "lift" : "fade",
        delay:
          role === "header" ? 0.04 : role === "attribute" ? 0.16 + row * 0.07 : 0.34 + row * 0.05,
      });
    } else collector.static(primitive);
  }
  return collector.finish();
};
