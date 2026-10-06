import { createMotionCollector, type DiagramMotionPolicy } from "../motion-policy.ts";

/** Components establish positions before dependencies and evolution movements appear. */
export const wardleyMotion: DiagramMotionPolicy = (scene) => {
  const collector = createMotionCollector(scene);
  const nodes = scene.interactions?.filter((i) => i.id.startsWith("wardley:")) ?? [];
  const nodesById = new Map<string, (typeof nodes)[number]>();
  for (const node of nodes) if (!nodesById.has(node.id)) nodesById.set(node.id, node);
  for (const p of scene.primitives) {
    if (collector.number(p)) continue;
    if (p.semantic?.role === "dependency")
      collector.layer(p, "wardley-dependencies", {
        mode: p.type === "path" ? "trace" : "fade",
        delay: 0.38,
      });
    else if (p.semantic?.role === "movement")
      collector.layer(p, "wardley-evolution", {
        mode: p.type === "path" ? "trace" : "fade",
        delay: 0.6,
      });
    else if (p.semantic?.role === "component") {
      const node = nodesById.get(p.semantic.id);
      const phase = node
        ? Math.max(
            0,
            Math.min(2, Math.floor(((node.y - scene.bounds.y) / scene.bounds.height) * 3)),
          )
        : 0;
      collector.layer(p, `wardley-components:${phase}`, {
        mode: "lift",
        delay: 0.1 + phase * 0.08,
      });
    } else collector.static(p);
  }
  return collector.finish();
};
