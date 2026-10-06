import { createMotionCollector, type DiagramMotionPolicy } from "../motion-policy.ts";

/** Requirement identity precedes its fields, risk/verification status and relationships. */
export const requirementMotion: DiagramMotionPolicy = (scene) => {
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
      const status = semantic.role === "risk" || semantic.role === "verifymethod";
      const row = Math.min(3, semantic.row ?? 0);
      collector.layer(
        primitive,
        semantic.role === "header" ? "identities" : status ? "verification-status" : `field:${row}`,
        {
          mode: status ? "scale" : semantic.role === "header" ? "fade" : "lift",
          delay: semantic.role === "header" ? 0.04 : status ? 0.38 : 0.14 + row * 0.055,
        },
      );
    } else collector.static(primitive);
  }
  return collector.finish();
};
