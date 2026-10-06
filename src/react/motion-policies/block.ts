import { createMotionCollector, type DiagramMotionPolicy } from "../motion-policy.ts";
/** Grid cells settle in reading order; authored links trace after cell assembly. */
export const blockMotion: DiagramMotionPolicy = (scene) => {
  const collector = createMotionCollector(scene);
  const nodes = scene.primitives.filter((p) => p.semantic?.kind === "node" && p.type !== "text");
  const rows = [
    ...new Set(
      nodes.map((p) => (p.type === "path" ? Math.min(...p.points.map((point) => point.y)) : p.y)),
    ),
  ].sort((a, b) => a - b);
  const rowById = new Map(
    nodes.map((p) => [
      p.semantic!.id,
      p.type === "path" ? Math.min(...p.points.map((point) => point.y)) : p.y,
    ]),
  );
  for (const p of scene.primitives) {
    if (collector.number(p)) continue;
    const semantic = p.semantic;
    if (semantic?.kind === "frame" || !semantic) {
      collector.static(p);
      continue;
    }
    const row =
      rowById.get(semantic.kind === "edge" ? (semantic.to ?? semantic.from ?? "") : semantic.id) ??
      rows[0] ??
      0;
    const index = Math.max(0, rows.indexOf(row)),
      phase = Math.min(3, Math.floor((index * 4) / Math.max(1, rows.length)));
    if (semantic.kind === "node")
      collector.layer(p, `block-cells:${phase}`, { mode: "scale", delay: phase * 0.09 });
    else
      collector.layer(p, p.type === "path" ? `block-links:${phase}` : "block-links-labels", {
        mode: p.type === "path" ? "trace" : "fade",
        delay: p.type === "path" ? 0.46 + phase * 0.06 : 0.7,
      });
  }
  return collector.finish();
};
