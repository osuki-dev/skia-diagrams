import { createMotionCollector, type DiagramMotionPolicy } from "../motion-policy.ts";
import { boardFlowPhases, boardNodePhase } from "./board-order.ts";
/** Establish deployment boundaries, then services, then their routed connections. */
export const architectureMotion: DiagramMotionPolicy = (scene) => {
  const collector = createMotionCollector(scene),
    ranks = boardFlowPhases(scene, 4);
  for (const p of scene.primitives) {
    if (collector.number(p)) continue;
    const phase = boardNodePhase(p, ranks);
    if (p.semantic?.kind === "frame")
      collector.layer(p, "architecture-groups", { mode: "fade", delay: 0 });
    else if (p.semantic?.kind === "node")
      collector.layer(p, `architecture-services:${phase}`, {
        mode: "lift",
        delay: 0.15 + phase * 0.07,
      });
    else if (p.semantic?.kind === "edge")
      collector.layer(
        p,
        p.type === "path" ? `architecture-connections:${phase}` : "architecture-connections-labels",
        {
          mode: p.type === "path" ? "trace" : "fade",
          delay: p.type === "path" ? 0.48 + phase * 0.06 : 0.72,
        },
      );
    else collector.static(p);
  }
  return collector.finish();
};
