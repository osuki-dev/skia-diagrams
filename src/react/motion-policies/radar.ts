import { createMotionCollector, type DiagramMotionPolicy } from "../motion-policy.ts";

/** Axes remain readable while each authored series expands from the plot origin. */
export const radarMotion: DiagramMotionPolicy = (scene) => {
  const collector = createMotionCollector(scene);
  const axis = scene.primitives.find(
    (p) => p.type === "path" && p.stroke === "gridStroke" && !p.closed && p.points.length === 2,
  );
  const center = axis?.type === "path" ? axis.points[0] : undefined;
  const groups = [
    ...new Set(
      scene.primitives.flatMap((p) =>
        p.semantic?.role === "series" && p.semantic.group ? [p.semantic.group] : [],
      ),
    ),
  ];
  for (const p of scene.primitives) {
    if (collector.number(p)) continue;
    const index = groups.indexOf(p.semantic?.group ?? "");
    if (p.semantic?.role === "series" && index >= 0)
      collector.layer(p, `radar-series:${index % 5}`, {
        mode: center ? "scale" : "fade",
        center,
        delay: 0.12 + (index % 5) * 0.08,
      });
    else if (p.semantic?.role === "marker" && index >= 0)
      collector.layer(p, `radar-points:${index % 5}`, {
        mode: "fade",
        delay: 0.42 + (index % 5) * 0.06,
      });
    else collector.static(p);
  }
  return collector.finish();
};
