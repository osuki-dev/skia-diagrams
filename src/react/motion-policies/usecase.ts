import { createMotionCollector, type DiagramMotionPolicy } from "../motion-policy.ts";
import { boardFlowPhases, boardNodePhase } from "./board-order.ts";

/** Actors remain anchors while use cases settle, notes lift and authored relations trace. */
export const usecaseMotion: DiagramMotionPolicy = (scene) => {
  const collector = createMotionCollector(scene),
    ranks = boardFlowPhases(scene, 3);
  for (const primitive of scene.primitives) {
    const semantic = primitive.semantic;
    if (!semantic || semantic.kind === "frame" || semantic.role === "actor") {
      collector.static(primitive);
      continue;
    }
    const phase = boardNodePhase(primitive, ranks);
    if (semantic.kind === "node") {
      if (semantic.role === "note")
        collector.layer(primitive, "usecase-notes", { mode: "lift", delay: 0.4 });
      else
        collector.layer(primitive, `usecase-nodes:${phase}`, {
          mode: "scale",
          delay: 0.08 + phase * 0.1,
        });
    } else {
      collector.layer(
        primitive,
        `usecase-links:${phase}:${primitive.type === "path" ? "path" : "label"}`,
        { mode: primitive.type === "path" ? "trace" : "fade", delay: 0.44 + phase * 0.08 },
      );
    }
  }
  return collector.finish();
};
