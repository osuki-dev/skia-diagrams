import type { Node, Point, Primitive, Rect, TextMeasurer } from "../types.ts";

/** Icons are host-owned native primitives. An unregistered name uses Mermaid's fallback. */
export type UsecaseIconResolver = (name: string, rect: Rect) => readonly Primitive[] | undefined;

export interface UsecaseActorOptions {
  fontSize?: number;
  radius?: number;
  strokeWidth?: number;
  measure?: TextMeasurer;
}

type ActorVariant = "normal" | "hollow" | "awesome" | "icon";

/** Native geometry follows Mermaid's 56 × 72 actor figure, without icon fonts or SVG. */
export function renderUsecaseActor(
  node: Node,
  rect: Rect,
  primitives: Primitive[],
  resolveIcon?: UsecaseIconResolver,
  options: UsecaseActorOptions = {},
): void {
  const metadata = node.metadata ?? {};
  const variant: ActorVariant =
    typeof metadata.icon === "string"
      ? "icon"
      : metadata.type === "hollow" || metadata.type === "awesome"
        ? metadata.type
        : "normal";
  const scale = Math.max(0, Math.min(1, (rect.width - 16) / 56, (rect.height - 16) / 72));
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + 8 + 36 * scale;
  const stroke = node.style?.stroke ?? "nodeStroke";
  const fill = node.style?.fill ?? "paletteFill:1";
  const strokeWidth = node.style?.strokeWidth ?? options.strokeWidth;
  const point = (x: number, y: number): Point => ({ x: cx + x * scale, y: cy + y * scale });
  const path = (
    points: Point[],
    closed = false,
    pathFill = "none",
    pathStroke = stroke,
    width = strokeWidth,
  ) => {
    primitives.push({
      type: "path",
      points,
      closed,
      fill: pathFill,
      stroke: pathStroke,
      strokeWidth: width,
      strokeRole: "node",
    });
  };
  const circle = (y: number, radius: number, circleFill = fill) => {
    const origin = point(-radius, y - radius);
    primitives.push({
      type: "shape",
      shape: "circle",
      ...origin,
      width: radius * 2 * scale,
      height: radius * 2 * scale,
      fill: circleFill,
      stroke,
      strokeWidth,
      strokeRole: "node",
    });
  };
  if (variant === "normal") {
    circle(-24, 12);
    for (const [a, b] of [
      [
        [0, -12],
        [0, 8],
      ],
      [
        [-17, -5],
        [17, -5],
      ],
      [
        [0, 8],
        [-15, 28],
      ],
      [
        [0, 8],
        [15, 28],
      ],
    ]) {
      path([point(a[0], a[1]), point(b[0], b[1])]);
    }
  } else if (variant === "hollow") {
    circle(-23, 9, "none");
    path(
      [
        [-22, -10],
        [22, -10],
        [22, 0],
        [6, 0],
        [22, 17],
        [13, 28],
        [0, 13],
        [-13, 28],
        [-22, 17],
        [-6, 0],
        [-22, 0],
      ].map(([x, y]) => point(x, y)),
      true,
    );
  } else if (variant === "awesome") {
    circle(-21, 13);
    const body: Point[] = [point(-24, 25)];
    appendCubic(body, point(-24, 7), point(-14, -3), point(0, -3));
    appendCubic(body, point(14, -3), point(24, 7), point(24, 25));
    appendCubic(body, point(24, 28), point(21, 30), point(18, 30));
    body.push(point(-18, 30));
    appendCubic(body, point(-21, 30), point(-24, 28), point(-24, 25));
    path(body, true, fill);
  } else {
    const frame = point(-26, -28);
    primitives.push({
      type: "shape",
      shape: "round",
      ...frame,
      width: 52 * scale,
      height: 52 * scale,
      radius: (options.radius ?? 8) * scale,
      fill,
      stroke,
      strokeWidth,
      strokeRole: "node",
    });
    const iconRect = { ...point(-21, -23), width: 42 * scale, height: 42 * scale };
    const icon = resolveIcon?.(String(metadata.icon ?? ""), iconRect);
    if (icon) primitives.push(...icon);
    else {
      primitives.push({
        type: "shape",
        shape: "rect",
        ...iconRect,
        fill: "paletteFill:1",
        strokeWidth: 0,
      });
      const fontSize = options.fontSize ?? 14;
      const label = String(metadata.icon);
      const metrics = options.measure?.(label, {
        fontSize,
        maxWidth: Math.max(1, rect.width - 16),
        literal: true,
      });
      primitives.push({
        type: "text",
        text: label,
        x: rect.x + 8,
        y: rect.y + 84,
        width: Math.max(1, rect.width - 16),
        height: metrics?.height ?? fontSize * 1.4,
        fontSize,
        literal: true,
        ...(metrics?.lineBaselines ? { lineBaselines: metrics.lineBaselines } : {}),
        color: "mutedText",
      });
      const question: Point[] = [point(-7, -10)];
      appendCubic(question, point(-7, -20), point(9, -20), point(9, -10));
      appendCubic(question, point(9, -3), point(0, -3), point(0, 4));
      path(question, false, "none", "paletteText:1", strokeWidth);
      const dot = point(-1.75, 9);
      primitives.push({
        type: "shape",
        shape: "circle",
        ...dot,
        width: 3.5 * scale,
        height: 3.5 * scale,
        fill: "paletteText:1",
        strokeWidth: 0,
      });
    }
  }
  if (metadata.business === true) {
    if (variant === "icon") path([point(12, -8), point(26, -26)]);
    else {
      const [headY, radius] =
        variant === "normal" ? [-24, 12] : variant === "hollow" ? [-23, 9] : [-21, 13];
      const centerOffset = radius * 0.6,
        halfChord = radius * 0.8;
      const directionX = Math.cos(Math.PI / 3),
        directionY = -Math.sin(Math.PI / 3);
      const markerX = centerOffset * -directionY,
        markerY = headY + centerOffset * directionX;
      path([
        point(markerX - halfChord * directionX, markerY - halfChord * directionY),
        point(markerX + halfChord * directionX, markerY + halfChord * directionY),
      ]);
    }
  }
}

/** Business use cases carry a diagonal chord at the right edge of their ellipse. */
export function renderUsecaseBusinessMark(node: Node, rect: Rect, primitives: Primitive[]): void {
  if (
    node.metadata?.business !== true ||
    node.metadata.role === "actor" ||
    rect.width <= 0 ||
    rect.height <= 0
  )
    return;
  const rx = rect.width / 2,
    ry = rect.height / 2;
  const startX = rx * 0.68,
    endX = rx * 0.96;
  const center = { x: rect.x + rx, y: rect.y + ry };
  primitives.push({
    type: "path",
    points: [
      { x: center.x + startX, y: center.y + ry * Math.sqrt(1 - (startX / rx) ** 2) },
      { x: center.x + endX, y: center.y - ry * Math.sqrt(1 - (endX / rx) ** 2) },
    ],
    stroke: node.style?.stroke ?? "nodeStroke",
    strokeWidth: node.style?.strokeWidth,
    strokeRole: "node",
  });
}

/** Flatten fixed cubic glyph contours into portable native path points. */
function appendCubic(points: Point[], c1: Point, c2: Point, end: Point): void {
  const start = points[points.length - 1];
  for (let step = 1; step <= 12; step++) {
    const t = step / 12,
      u = 1 - t;
    points.push({
      x: u ** 3 * start.x + 3 * u ** 2 * t * c1.x + 3 * u * t ** 2 * c2.x + t ** 3 * end.x,
      y: u ** 3 * start.y + 3 * u ** 2 * t * c1.y + 3 * u * t ** 2 * c2.y + t ** 3 * end.y,
    });
  }
}
