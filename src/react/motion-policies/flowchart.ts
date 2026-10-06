import { createMotionCollector, type DiagramMotionPolicy } from "../motion-policy.ts";
import { boardFlowPhases, boardNodePhase } from "./board-order.ts";
/** Structure is introduced in dependency order; execution is a separate host-controlled overlay. */
export const flowchartMotion: DiagramMotionPolicy = (scene) => {
  const collector = createMotionCollector(scene);
  const phases = boardFlowPhases(scene, 3);
  for (const p of scene.primitives) {
    const semantic = p.semantic;
    if (!semantic || semantic.kind === "frame") {
      collector.static(p);
      continue;
    }
    const phase =
      semantic.kind === "edge" ? (phases.get(semantic.from ?? "") ?? 0) : boardNodePhase(p, phases);
    const edge = semantic.kind === "edge";
    const label = semantic.part === "label";
    collector.layer(p, `${edge ? "connection" : "node"}:${label ? "label" : "body"}:${phase}`, {
      mode: edge && p.type === "path" ? "trace" : "fade",
      delay: phase * 0.3 + (edge ? (label ? 0.28 : 0.1) : label ? 0.06 : 0),
      span: edge ? 0.18 : 0.12,
    });
  }
  return collector.finish();
};
