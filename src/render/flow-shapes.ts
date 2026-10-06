import type { Point, Rect, Shape } from "../types.ts";

/** Shared native/SVG contours. Coordinates and decorations stay inside the node bounds. */
export type ShapeCommand =
  | { kind: "move" | "line"; point: Point }
  | { kind: "curve"; control1: Point; control2: Point; point: Point }
  | { kind: "close" };
export interface ShapeContour {
  commands: ShapeCommand[];
  fill: boolean;
  ink?: boolean;
}

export function modernShapeContours(shape: Shape, rect: Rect): ShapeContour[] | undefined {
  const { x, y, width: w, height: h } = rect;
  const p = (a: number, b: number): Point => ({ x: x + a * w, y: y + b * h });
  const contours: ShapeContour[] = [];
  let commands: ShapeCommand[] = [];
  const start = (a: number, b: number, fill = true, ink = false) => {
    commands = [{ kind: "move", point: p(a, b) }];
    contours.push({ commands, fill, ink });
  };
  const line = (a: number, b: number) => commands.push({ kind: "line", point: p(a, b) });
  const curve = (a: number, b: number, c: number, d: number, e: number, f: number) =>
    commands.push({ kind: "curve", control1: p(a, b), control2: p(c, d), point: p(e, f) });
  const close = () => commands.push({ kind: "close" });
  const box = (a = 0, b = 0, c = 1, d = 1) => {
    start(a, b);
    line(c, b);
    line(c, d);
    line(a, d);
    close();
  };
  const polygon = (points: number[][]) => {
    start(points[0][0], points[0][1]);
    points.slice(1).forEach(([a, b]) => line(a, b));
    close();
  };
  const ellipse = (a = 0, b = 0, c = 1, d = 1, ink = false) => {
    const rx = (c - a) / 2,
      ry = (d - b) / 2,
      cx = (a + c) / 2,
      cy = (b + d) / 2,
      k = 0.5522847498307936;
    start(c, cy, true, ink);
    curve(c, cy + k * ry, cx + k * rx, d, cx, d);
    curve(cx - k * rx, d, a, cy + k * ry, a, cy);
    curve(a, cy - k * ry, cx - k * rx, b, cx, b);
    curve(cx + k * rx, b, c, cy - k * ry, c, cy);
    close();
  };
  const wave = (top = false, a = 0, b = 0, c = 1, d = 1) => {
    start(a, top ? b + 0.12 : b);
    if (top) curve(0.3, b - 0.04, 0.65, b + 0.28, c, b + 0.12);
    else line(c, b);
    line(c, d - 0.12);
    curve(0.7, d + 0.08, 0.3, d - 0.32, a, d - 0.12);
    close();
  };
  const ruled = () => {
    for (const b of [0.25, 0.4, 0.55]) {
      start(0.16, b, false);
      line(0.84, b);
    }
  };
  switch (shape) {
    case "text":
      return [];
    case "notch-rect":
      polygon([
        [0.15, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0.25],
      ]);
      break;
    case "hourglass":
      polygon([
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ]);
      break;
    case "bolt":
      polygon([
        [1, 0],
        [0, 0.55],
        [0.6, 0.55],
        [0, 1],
        [1, 0.45],
        [0.4, 0.45],
      ]);
      break;
    case "tri":
      polygon([
        [0.5, 0],
        [1, 1],
        [0, 1],
      ]);
      break;
    case "flip-tri":
      polygon([
        [0, 0],
        [1, 0],
        [0.5, 1],
      ]);
      break;
    case "notch-pent":
      polygon([
        [0.1, 0],
        [0.9, 0],
        [1, 0.2],
        [1, 1],
        [0, 1],
        [0, 0.2],
      ]);
      break;
    case "sl-rect":
      polygon([
        [0, 0.2],
        [1, 0],
        [1, 1],
        [0, 1],
      ]);
      break;
    case "doc":
    case "lin-doc":
    case "tag-doc":
      wave();
      if (shape === "lin-doc") ruled();
      break;
    case "paper-tape":
      wave(true);
      break;
    case "docs":
      wave(false, 0.12, 0, 1, 0.88);
      wave(false, 0.06, 0.06, 0.94, 0.94);
      wave(false, 0, 0.12, 0.88, 1);
      break;
    case "st-rect":
      box(0.12, 0, 1, 0.88);
      box(0.06, 0.06, 0.94, 0.94);
      box(0, 0.12, 0.88, 1);
      break;
    case "lin-rect":
    case "div-rect":
    case "win-pane":
    case "tag-rect":
      box();
      if (shape === "lin-rect") {
        start(0.12, 0, false);
        line(0.12, 1);
      }
      if (shape === "div-rect" || shape === "win-pane") {
        start(0, 0.2, false);
        line(1, 0.2);
      }
      if (shape === "win-pane") {
        start(0.15, 0, false);
        line(0.15, 1);
      }
      break;
    case "sm-circ":
    case "f-circ":
      ellipse(0, 0, 1, 1, true);
      break;
    case "fr-circ":
      ellipse();
      ellipse(0.18, 0.18, 0.82, 0.82, true);
      break;
    case "cross-circ":
      ellipse();
      start(0.1464, 0.1464, false);
      line(0.8536, 0.8536);
      start(0.8536, 0.1464, false);
      line(0.1464, 0.8536);
      break;
    case "fork":
      box();
      contours[0].ink = true;
      break;
    case "delay":
      start(0, 0);
      line(0.65, 0);
      curve(1.1166666666666667, 0, 1.1166666666666667, 1, 0.65, 1);
      line(0, 1);
      close();
      break;
    case "curv-trap":
      start(0.18, 0);
      line(0.7, 0);
      curve(1.1, 0, 1.1, 1, 0.7, 1);
      line(0.18, 1);
      line(0, 0.5);
      close();
      break;
    case "bow-rect":
      start(0, 0);
      line(1, 0);
      curve(0.78, 0.25, 0.78, 0.75, 1, 1);
      line(0, 1);
      curve(0.22, 0.75, 0.22, 0.25, 0, 0);
      close();
      break;
    case "h-cyl":
      start(0.12, 0);
      line(0.88, 0);
      curve(1.04, 0, 1.04, 1, 0.88, 1);
      line(0.12, 1);
      curve(-0.04, 1, -0.04, 0, 0.12, 0);
      close();
      start(0.88, 0, false);
      curve(0.72, 0, 0.72, 1, 0.88, 1);
      break;
    case "lin-cyl":
      start(0, 0.12);
      curve(0, -0.04, 1, -0.04, 1, 0.12);
      line(1, 0.88);
      curve(1, 1.04, 0, 1.04, 0, 0.88);
      close();
      for (const b of [0.12, 0.22, 0.32]) {
        start(0, b, false);
        curve(0, b + 0.16, 1, b + 0.16, 1, b);
      }
      break;
    case "brace":
    case "brace-r":
    case "braces":
      for (const right of shape === "braces" ? [false, true] : [shape === "brace-r"]) {
        const a = right ? 1 : 0,
          b = right ? 0.9 : 0.1,
          c = right ? 0.8 : 0.2;
        start(c, 0, false);
        curve(b, 0, b, 0.2, b, 0.3);
        curve(b, 0.45, a, 0.45, a, 0.5);
        curve(a, 0.55, b, 0.55, b, 0.7);
        curve(b, 0.8, b, 1, c, 1);
      }
      break;
    default:
      return undefined;
  }
  if (shape === "tag-doc" || shape === "tag-rect") {
    start(0.8, 0, false);
    line(0.8, 0.2);
    line(1, 0.2);
  }
  return contours;
}

/** Flattening is only used for ray intersections; drawing retains exact cubic curves. */
export function contourPoints(commands: ShapeCommand[]): Point[] {
  const points: Point[] = [];
  for (const command of commands) {
    if (command.kind === "move" || command.kind === "line") points.push(command.point);
    else if (command.kind === "curve") {
      const a = points.at(-1)!;
      for (let i = 1; i <= 32; i++) {
        const t = i / 32,
          u = 1 - t;
        points.push({
          x:
            u * u * u * a.x +
            3 * u * u * t * command.control1.x +
            3 * u * t * t * command.control2.x +
            t * t * t * command.point.x,
          y:
            u * u * u * a.y +
            3 * u * u * t * command.control1.y +
            3 * u * t * t * command.control2.y +
            t * t * t * command.point.y,
        });
      }
    }
  }
  return points;
}
export function contourSvg(commands: ShapeCommand[]): string {
  return commands
    .map((command) =>
      command.kind === "close"
        ? "Z"
        : command.kind === "curve"
          ? `C${command.control1.x} ${command.control1.y} ${command.control2.x} ${command.control2.y} ${command.point.x} ${command.point.y}`
          : `${command.kind === "move" ? "M" : "L"}${command.point.x} ${command.point.y}`,
    )
    .join(" ");
}
