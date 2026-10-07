import type { Primitive } from "../../types.ts";
import { createMotionCollector, type DiagramMotionPolicy } from "../motion-policy.ts";

/** Authored wedges sweep in source order. Their values, leader and legend follow
 * that wedge; the heavy outer rim traces only after the data is visible. */
export const pieMotion: DiagramMotionPolicy = (scene) => {
  const collector = createMotionCollector(scene);
  const sectors = scene.primitives.filter(
    (p): p is Extract<Primitive, { type: "sector" }> => p.type === "sector",
  );
  if (!sectors.length) {
    for (const p of scene.primitives) collector.static(p);
    return collector.finish();
  }
  const sectorIndices = new Map(sectors.map((sector, index) => [sector, index]));
  const phases = Math.min(4, sectors.length);
  const total = sectors.reduce((sum, sector) => sum + sector.sweepAngle, 0);
  const groups = Array.from({ length: phases }, (_, phase) => {
    const members = sectors.filter(
      (_, index) => Math.floor((index * phases) / sectors.length) === phase,
    );
    const first = members[0],
      sweep = members.reduce((sum, p) => sum + p.sweepAngle, 0);
    const previous = sectors
      .slice(0, sectorIndices.get(first)!)
      .reduce((sum, p) => sum + p.sweepAngle, 0);
    const delay = 0.03 + (0.69 * previous) / Math.max(0.001, total),
      span = Math.max(0.04, (0.69 * sweep) / Math.max(0.001, total));
    return {
      members,
      delay,
      span,
      end: delay + span,
      circle: {
        cx: first.cx,
        cy: first.cy,
        radius: members.reduce((max, p) => Math.max(max, p.radius), 0) + 2,
        startAngle: first.startAngle,
        sweepAngle: sweep,
      },
    };
  });
  for (const p of scene.primitives) {
    const index = p.type === "sector" ? sectorIndices.get(p) : p.semantic?.row;
    const phase =
      index === undefined || index < 0
        ? undefined
        : groups[Math.min(phases - 1, Math.floor((index * phases) / sectors.length))];
    if (p.type === "sector" && phase) {
      collector.layer(p, `pie-wedge:${groups.indexOf(phase)}`, {
        mode: "radial",
        easing: "linear",
        delay: phase.delay,
        span: phase.span,
        circle: phase.circle,
      });
    } else if (phase && ["percentage", "callout", "legend"].includes(p.semantic?.role ?? "")) {
      const delay = phase.end + 0.02;
      const numeric =
        p.semantic?.role === "percentage" && collector.number(p, { delay, span: 0.16 });
      if (!numeric)
        collector.layer(p, `pie-followup:${groups.indexOf(phase)}`, {
          mode: "fade",
          delay,
          span: 0.14,
        });
    } else if (p.type === "text" && p.motion && !p.semantic) {
      // Host-authored numeric annotations without a row wait until all wedges exist.
      if (
        !collector.number(p, {
          delay: Math.max(...groups.map((group) => group.end)) + 0.02,
          span: 0.16,
        })
      )
        collector.layer(p, "pie-extra-values", { mode: "fade", delay: 0.76, span: 0.16 });
    } else if (p.semantic?.role === "rim") {
      collector.layer(p, "pie-rim", {
        mode: "trace",
        delay: Math.min(0.8, Math.max(...groups.map((group) => group.end)) + 0.04),
        span: 0.16,
      });
    } else collector.layer(p, "pie-title", { mode: "fade", delay: 0, span: 0.12 });
  }
  return collector.finish();
};
