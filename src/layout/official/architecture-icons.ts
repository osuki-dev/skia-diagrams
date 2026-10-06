import type { Rect } from "../../types.ts";
import type { OfficialScene } from "./context.ts";

/** Native vector symbols shared by service cards and group headings. */
export function architectureIcon(
  scene: OfficialScene,
  icon: string,
  rect: Rect,
  stroke: string,
): boolean {
  if (scene.icon(icon, rect)) return true;
  const box = (
    x: number,
    y: number,
    width: number,
    height: number,
    shape: "rect" | "circle" | "cylinder",
  ) =>
    scene.box(
      {
        x: rect.x + x * rect.width,
        y: rect.y + y * rect.height,
        width: width * rect.width,
        height: height * rect.height,
      },
      "nodeFill",
      stroke,
      shape,
    );
  const line = (points: [number, number][]) =>
    scene.line(
      points.map(([x, y]) => ({
        x: rect.x + x * rect.width,
        y: rect.y + y * rect.height,
      })),
      stroke,
    );
  if (icon === "database") box(0.05, 0.06, 0.9, 0.85, "cylinder");
  else if (icon === "disk") {
    box(0, 0.05, 1, 0.88, "rect");
    box(0.18, 0.14, 0.62, 0.62, "circle");
    line([
      [0.5, 0.46],
      [0.81, 0.68],
    ]);
  } else if (icon === "cloud") {
    box(0.04, 0.4, 0.5, 0.5, "circle");
    box(0.27, 0.1, 0.62, 0.62, "circle");
    box(0.58, 0.4, 0.4, 0.4, "circle");
  } else if (icon === "server") {
    box(0, 0, 1, 1, "rect");
    for (let row = 0; row < 3; row++) {
      const y = 0.21 + row * 0.28;
      line([
        [0.13, y],
        [0.65, y],
      ]);
      box(0.79, y - 0.04, 0.08, 0.08, "circle");
    }
  } else if (icon === "internet") {
    box(0.05, 0.05, 0.9, 0.9, "circle");
    line([
      [0.05, 0.5],
      [0.95, 0.5],
    ]);
    line([
      [0.5, 0.05],
      [0.5, 0.95],
    ]);
  } else return false;
  return true;
}
