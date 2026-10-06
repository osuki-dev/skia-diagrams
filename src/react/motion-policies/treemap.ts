import { createMotionCollector, type DiagramMotionPolicy } from "../motion-policy.ts";

/** Parent frames precede descendant tiles; area encodes data rather than animation scale. */
export const treemapMotion: DiagramMotionPolicy = (scene) => {
  const collector = createMotionCollector(scene);
  for (const primitive of scene.primitives) {
    if (collector.number(primitive)) continue;
    if (primitive.type === "shape" && primitive.id?.startsWith("treemap:")) {
      const depth = Math.min(3, Number(primitive.id.split(":")[2]) || 0);
      collector.layer(primitive, `tiles:${depth}`, { mode: "fade", delay: depth * 0.12 });
    } else if (primitive.type === "text" && primitive.semantic?.id.startsWith("treemap:")) {
      const depth = Math.min(3, primitive.semantic.row ?? 0);
      collector.layer(primitive, `tile-labels:${depth}`, {
        mode: "fade",
        delay: depth * 0.12 + 0.14,
      });
    } else collector.static(primitive);
  }
  return collector.finish();
};
