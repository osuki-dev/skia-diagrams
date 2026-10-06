import { createMotionCollector, type DiagramMotionPolicy } from "../motion-policy.ts";

/** Exact source bit ranges drive reveal order, independent of MSB-first geometry. */
export const packetMotion: DiagramMotionPolicy = (scene) => {
  const motion = createMotionCollector(scene);
  const bits = [
    ...new Set(
      scene.primitives.flatMap((p) => (p.semantic?.row === undefined ? [] : [p.semantic.row])),
    ),
  ].sort((a, b) => a - b);
  const phases = new Map(
    bits.map((bit, index) => [
      bit,
      Math.min(3, Math.floor((index * 4) / Math.max(1, bits.length))),
    ]),
  );
  const regions = new Map<number, { x: number; y: number; width: number; height: number }[]>();
  for (const p of scene.primitives) {
    const bit = p.semantic?.row;
    if (bit === undefined || p.type === "path") continue;
    const phase = phases.get(bit)!;
    const group = regions.get(phase) ?? [];
    group.push({
      x: p.x - 2,
      y: p.y - 2,
      width: p.width + 4,
      height: p.height + 4,
    });
    regions.set(phase, group);
  }
  for (const p of scene.primitives) {
    const bit = p.semantic?.row;
    if (bit === undefined) {
      motion.static(p);
      continue;
    }
    const phase = phases.get(bit)!;
    motion.layer(p, `bits:${phase}`, {
      mode: "draw-x",
      delay: phase * 0.17,
      regions: regions.get(phase),
    });
  }
  return motion.finish();
};
