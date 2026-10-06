import { createMotionCollector, type DiagramMotionPolicy } from "../motion-policy.ts";
import { boardFlowPhases, boardNodePhase } from "./board-order.ts";

/** Stable boundaries establish context before dependent systems assemble and links trace. */
export const c4Motion: DiagramMotionPolicy = (scene) => {
  const collector = createMotionCollector(scene),
    ranks = boardFlowPhases(scene, 3);
  const parents = new Map(
    scene.primitives.flatMap((p) =>
      p.semantic?.kind === "frame" ? [[p.semantic.id, p.semantic.group] as const] : [],
    ),
  );
  const depth = (group?: string) => {
    let value = 0;
    const visited = new Set<string>();
    while (group && !visited.has(group)) {
      visited.add(group);
      value++;
      group = parents.get(group);
    }
    return value;
  };
  for (const primitive of scene.primitives) {
    const semantic = primitive.semantic;
    if (!semantic || semantic.kind === "frame") {
      collector.static(primitive);
      continue;
    }
    const phase = Math.min(
      2,
      Math.max(
        boardNodePhase(primitive, ranks),
        semantic.kind === "node" ? depth(semantic.group) : 0,
      ),
    );
    if (semantic.kind === "node") {
      collector.layer(primitive, `c4-nodes:${phase}`, { mode: "lift", delay: 0.08 + phase * 0.11 });
    } else {
      collector.layer(
        primitive,
        `c4-links:${phase}:${primitive.type === "path" ? "path" : "label"}`,
        { mode: primitive.type === "path" ? "trace" : "fade", delay: 0.42 + phase * 0.09 },
      );
    }
  }
  return collector.finish();
};
