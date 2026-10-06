import { createMotionCollector, motionBounds, type DiagramMotionPolicy } from "../motion-policy.ts";
import { boardFlowPhases, boardNodePhase } from "./board-order.ts";
/** Ownership lanes stay fixed while tasks and handoffs progress in flow order. */
export const swimlanesMotion: DiagramMotionPolicy = (scene) => {
  const collector = createMotionCollector(scene),
    ranks = boardFlowPhases(scene, 5);
  const nodes = new Map<string, typeof scene.primitives>();
  for (const p of scene.primitives)
    if (p.semantic?.kind === "node") {
      const group = nodes.get(p.semantic.id) ?? [];
      group.push(p);
      nodes.set(p.semantic.id, group);
    }
  const regions = new Map<number, ReturnType<typeof motionBounds>[]>();
  for (const group of nodes.values()) {
    const phase = boardNodePhase(group[0]!, ranks),
      rectangles = regions.get(phase) ?? [];
    rectangles.push(motionBounds(group, scene.bounds));
    regions.set(phase, rectangles);
  }
  for (const p of scene.primitives) {
    if (collector.number(p)) continue;
    const phase = boardNodePhase(p, ranks);
    if (p.semantic?.kind === "node")
      collector.layer(p, `swimlane-tasks:${phase}`, {
        mode: "draw-x",
        delay: phase * 0.09,
        regions: regions.get(phase),
      });
    else if (p.semantic?.kind === "edge")
      collector.layer(
        p,
        p.type === "path" ? `swimlane-handoffs:${phase}` : "swimlane-handoffs-labels",
        {
          mode: p.type === "path" ? "trace" : "fade",
          delay: p.type === "path" ? 0.15 + phase * 0.1 : 0.7,
        },
      );
    else collector.static(p);
  }
  return collector.finish();
};
