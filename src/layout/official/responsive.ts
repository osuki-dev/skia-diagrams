import type { LayoutOptions, ParsedDiagram, Scene, TextMeasurer } from "../../types.ts";

/** Diagram frames and their typography scale together when larger host text
 * would otherwise collide with fixed semantic regions. Host padding stays exact. */
export function responsiveScene(
  parsed: ParsedDiagram,
  measure: TextMeasurer,
  options: LayoutOptions,
  layout: (
    parsed: ParsedDiagram,
    measure: TextMeasurer,
    options: LayoutOptions,
  ) => Scene | undefined,
): Scene | undefined {
  const ratio = (options.fontSize ?? 14) / 14;
  const scaledMeasure: TextMeasurer = (text, style) => {
    const m = measure(text, {
      ...style,
      fontSize: style.fontSize * ratio,
      maxWidth: style.maxWidth === undefined ? undefined : style.maxWidth * ratio,
    });
    return {
      ...m,
      width: m.width / ratio,
      height: m.height / ratio,
      lineBaselines: m.lineBaselines?.map((y) => y / ratio),
    };
  };
  const scene = layout(parsed, scaledMeasure, {
    ...options,
    fontSize: 14,
    padding: (options.padding ?? 20) / ratio,
  });
  if (!scene) return undefined;
  const point = (p: { x: number; y: number }) => ({ x: p.x * ratio, y: p.y * ratio });
  for (const p of scene.primitives) {
    if (p.type === "path") {
      p.points = p.points.map(point);
      if (p.curves)
        p.curves = p.curves.map((c) => ({
          control1: point(c.control1),
          control2: point(c.control2),
          end: point(c.end),
        }));
    } else {
      p.x *= ratio;
      p.y *= ratio;
      p.width *= ratio;
      p.height *= ratio;
      if (p.type === "shape" && p.motion)
        p.motion = { ...p.motion, baseline: p.motion.baseline * ratio };
      if (p.type === "text") {
        p.fontSize *= ratio;
        p.lineBaselines = p.lineBaselines?.map((y) => y * ratio);
      }
    }
  }
  for (const hit of scene.interactions ?? []) {
    hit.x *= ratio;
    hit.y *= ratio;
    hit.width *= ratio;
    hit.height *= ratio;
    if (hit.hit?.type === "polygon") hit.hit.points = hit.hit.points.map(point);
    else if (hit.hit?.type === "circle" || hit.hit?.type === "sector") {
      hit.hit.cx *= ratio;
      hit.hit.cy *= ratio;
      hit.hit.radius *= ratio;
    } else if (hit.hit?.type === "venn")
      hit.hit.circles = hit.hit.circles.map((circle) => ({
        ...circle,
        cx: circle.cx * ratio,
        cy: circle.cy * ratio,
        radius: circle.radius * ratio,
      }));
  }
  scene.bounds = {
    x: scene.bounds.x * ratio,
    y: scene.bounds.y * ratio,
    width: scene.bounds.width * ratio,
    height: scene.bounds.height * ratio,
  };
  return scene;
}
