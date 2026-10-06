import { createMotionCollector, type DiagramMotionPolicy } from "../motion-policy.ts";
import { boardFlowPhases, boardNodePhase } from "./board-order.ts";
/** Initial states lead into transitions; cycles remain finite and execution stays host-owned. */
export const stateMotion: DiagramMotionPolicy = (scene) => {
  const collector = createMotionCollector(scene);
  const phases = boardFlowPhases(scene, 3);
  for (const p of scene.primitives) {
    const s = p.semantic;
    if (!s || s.kind === "frame") {
      collector.static(p);
      continue;
    }
    const phase = s.kind === "edge" ? (phases.get(s.from ?? "") ?? 0) : boardNodePhase(p, phases);
    collector.layer(p, `${s.kind}:${s.part === "label" ? "label" : "body"}:${phase}`, {
      mode: s.kind === "edge" && p.type === "path" ? "trace" : "fade",
      delay: phase * 0.3 + (s.kind === "edge" ? (s.part === "label" ? 0.3 : 0.12) : 0),
      span: s.kind === "edge" ? 0.18 : 0.16,
    });
  }
  return collector.finish();
};
