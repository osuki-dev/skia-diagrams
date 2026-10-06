import { modernShapeContours, contourPoints } from "./flow-shapes.ts";
import type { Marker, Point, Rect, Shape } from "../types.ts";
export function intersectShape(shape: Shape, rect: Rect, toward: Point, radius = 6): Point {
  const x = rect.x + rect.width / 2,
    y = rect.y + rect.height / 2;
  const dx = toward.x - x,
    dy = toward.y - y;
  const rx = rect.width / 2,
    ry = rect.height / 2;
  if (!dx && !dy) return { x, y };
  const modern = modernShapeContours(shape, rect);
  if (modern?.length) {
    const outlines = modern.filter((contour) => contour.fill);
    let nearest = -Infinity;
    for (const contour of outlines.length ? outlines : modern) {
      const points = contourPoints(contour.commands);
      for (let i = 0; i < points.length; i++) {
        const a = points[i],
          b = points[(i + 1) % points.length];
        const ex = b.x - a.x,
          ey = b.y - a.y,
          denominator = dx * ey - dy * ex;
        if (Math.abs(denominator) < 1e-10) continue;
        const ax = a.x - x,
          ay = a.y - y;
        const distance = (ax * ey - ay * ex) / denominator;
        const along = (ax * dy - ay * dx) / denominator;
        if (distance > 1e-10 && along >= -1e-10 && along <= 1 + 1e-10)
          nearest = Math.max(nearest, distance);
      }
    }
    if (Number.isFinite(nearest)) return { x: x + dx * nearest, y: y + dy * nearest };
  }
  if (shape === "cylinder") {
    // Intersect the very same cubic cap drawn by Skia/SVG. An ellipse formula
    // is only an approximation of that cap, and a box misses its corners.
    const geometry = cylinderGeometry(rect);
    const cross = (p: Point) => (p.x - x) * dy - (p.y - y) * dx;
    let start = geometry.start;
    for (const segment of [...geometry.top, ...geometry.bottom]) {
      if (segment === geometry.bottom[0]) start = geometry.side;
      const a = cross(start),
        b = cross(segment.end);
      if (a * b <= 0) {
        let lo = 0,
          hi = 1;
        const at = (t: number): Point => ({
          x:
            (1 - t) ** 3 * start.x +
            3 * (1 - t) ** 2 * t * segment.control1.x +
            3 * (1 - t) * t * t * segment.control2.x +
            t ** 3 * segment.end.x,
          y:
            (1 - t) ** 3 * start.y +
            3 * (1 - t) ** 2 * t * segment.control1.y +
            3 * (1 - t) * t * t * segment.control2.y +
            t ** 3 * segment.end.y,
        });
        for (let i = 0; i < 32; i++) {
          const mid = (lo + hi) / 2;
          if (a * cross(at(mid)) > 0) lo = mid;
          else hi = mid;
        }
        const p = at(a === 0 ? 0 : b === 0 ? 1 : (lo + hi) / 2);
        if ((p.x - x) * dx + (p.y - y) * dy > 0) return p;
      }
      start = segment.end;
    }
    // No cap hit on the forward ray: it meets one of the vertical sides.
  }
  if (shape === "round" || shape === "stadium") {
    const r = Math.min(rx, ry, Math.max(0, shape === "stadium" ? ry : radius));
    const boxScale = Math.min(dx ? rx / Math.abs(dx) : Infinity, dy ? ry / Math.abs(dy) : Infinity);
    const bx = Math.abs(dx * boxScale),
      by = Math.abs(dy * boxScale);
    if (r && bx > rx - r && by > ry - r) {
      const cx = rx - r,
        cy = ry - r;
      const dot = Math.abs(dx) * cx + Math.abs(dy) * cy;
      const squared = dx * dx + dy * dy;
      const scale =
        (dot + Math.sqrt(Math.max(0, dot * dot - squared * (cx * cx + cy * cy - r * r)))) / squared;
      return { x: x + dx * scale, y: y + dy * scale };
    }
    return { x: x + dx * boxScale, y: y + dy * boxScale };
  }
  if (
    [
      "hexagon",
      "flag",
      "trapezoid",
      "reverse-trapezoid",
      "parallelogram",
      "reverse-parallelogram",
    ].includes(shape)
  ) {
    const points = shapePoints(shape, rect);
    let nearest = Infinity;
    for (let i = 0; i < points.length; i++) {
      const a = points[i],
        b = points[(i + 1) % points.length];
      const ex = b.x - a.x,
        ey = b.y - a.y;
      const denominator = dx * ey - dy * ex;
      if (Math.abs(denominator) < 1e-10) continue;
      const ax = a.x - x,
        ay = a.y - y;
      const distance = (ax * ey - ay * ex) / denominator;
      const along = (ax * dy - ay * dx) / denominator;
      if (distance >= 0 && along >= -1e-10 && along <= 1 + 1e-10)
        nearest = Math.min(nearest, distance);
    }
    if (Number.isFinite(nearest)) return { x: x + dx * nearest, y: y + dy * nearest };
  }
  const scale =
    shape === "circle" || shape === "doublecircle"
      ? 1 / Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry))
      : shape === "diamond"
        ? 1 / (Math.abs(dx) / rx + Math.abs(dy) / ry)
        : Math.min(dx ? rx / Math.abs(dx) : Infinity, dy ? ry / Math.abs(dy) : Infinity);
  return { x: x + dx * scale, y: y + dy * scale };
}
export function shapePoints(shape: Shape, r: Rect): Point[] {
  const modern = modernShapeContours(shape, r);
  if (modern?.length) return contourPoints(modern[0].commands);
  const { x, y, width: w, height: h } = r;
  const points: Record<string, [number, number][]> = {
    diamond: [
      [0.5, 0],
      [1, 0.5],
      [0.5, 1],
      [0, 0.5],
    ],
    hexagon: [
      [0.2, 0],
      [0.8, 0],
      [1, 0.5],
      [0.8, 1],
      [0.2, 1],
      [0, 0.5],
    ],
    flag: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0.2, 0.5],
    ],
    parallelogram: [
      [0.2, 0],
      [1, 0],
      [0.8, 1],
      [0, 1],
    ],
    "reverse-parallelogram": [
      [0, 0],
      [0.8, 0],
      [1, 1],
      [0.2, 1],
    ],
    trapezoid: [
      [0.2, 0],
      [0.8, 0],
      [1, 1],
      [0, 1],
    ],
    "reverse-trapezoid": [
      [0, 0],
      [1, 0],
      [0.8, 1],
      [0.2, 1],
    ],
  };
  return (
    points[shape] ?? [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ]
  ).map(([a, b]) => ({ x: x + a * w, y: y + b * h }));
}
export function markerPoints(marker: Marker, tip: Point, previous: Point, size = 10): Point[] {
  const angle = Math.atan2(tip.y - previous.y, tip.x - previous.x);
  const scale = size / 10;
  const point = (forward: number, side: number): Point => ({
    x: tip.x + scale * (forward * Math.cos(angle) - side * Math.sin(angle)),
    y: tip.y + scale * (forward * Math.sin(angle) + side * Math.cos(angle)),
  });
  if (marker === "diamond" || marker === "hollow-diamond")
    return [point(0, 0), point(-7, -5), point(-14, 0), point(-7, 5)];
  if (marker === "cross") return [point(-8, -5), point(0, 5), point(-8, 5), point(0, -5)];
  if (marker === "crow")
    return [point(0, -6), point(-12, 0), point(0, 0), point(-12, 0), point(0, 6)];
  return [point(-10, -5), tip, point(-10, 5)];
}
/** A cross has two independent strokes, not a connected four-point polyline. */
export function markerGeometry(marker: Marker, tip: Point, previous: Point, size = 10) {
  const points = markerPoints(marker, tip, previous, size);
  return {
    paths: marker === "cross" ? [points.slice(0, 2), points.slice(2)] : [points],
    closed: !["open", "cross", "crow"].includes(marker),
    filled: !["open", "hollow-triangle", "hollow-diamond", "cross", "crow"].includes(marker),
  };
}
/** The circle's outer tangent, not its center, touches a node boundary. */
export function circleMarkerCenter(tip: Point, previous: Point, radius = 4): Point {
  const angle = Math.atan2(tip.y - previous.y, tip.x - previous.x);
  return { x: tip.x - radius * Math.cos(angle), y: tip.y - radius * Math.sin(angle) };
}
/** Keep the shaft out of hollow UML terminals without painting an opaque mask
 * over a cluster or host background. Marker geometry still uses the original tip. */
export function markerShaft(points: Point[], start?: Marker, end?: Marker, size = 10): Point[] {
  const inset = (marker?: Marker) =>
    marker === "hollow-triangle" ? size : marker === "hollow-diamond" ? size * 1.4 : 0;
  if (!inset(start) && !inset(end)) return points;
  const trim = (route: Point[], remaining: number): Point[] => {
    if (!remaining) return route;
    for (let i = 1; i < route.length; i++) {
      const a = route[i - 1],
        b = route[i],
        length = Math.hypot(b.x - a.x, b.y - a.y);
      if (length > remaining)
        return [
          {
            x: a.x + ((b.x - a.x) * remaining) / length,
            y: a.y + ((b.y - a.y) * remaining) / length,
          },
          ...route.slice(i),
        ];
      remaining -= length;
    }
    return [];
  };
  return trim(trim(points, inset(start)).slice().reverse(), inset(end)).reverse();
}
/** Cubic ellipse approximation shared by both renderers, entirely inside bounds. */
export function cylinderGeometry(rect: Rect) {
  const { x, y, width: w, height: h } = rect;
  const ry = Math.min(8, h / 4),
    k = 0.5522847498307936;
  const left = x,
    right = x + w,
    cx = x + w / 2,
    top = y + ry,
    bottom = y + h - ry;
  return {
    start: { x: left, y: top },
    top: [
      {
        control1: { x: left, y: top - k * ry },
        control2: { x: cx - (k * w) / 2, y },
        end: { x: cx, y },
      },
      {
        control1: { x: cx + (k * w) / 2, y },
        control2: { x: right, y: top - k * ry },
        end: { x: right, y: top },
      },
    ],
    side: { x: right, y: bottom },
    bottom: [
      {
        control1: { x: right, y: bottom + k * ry },
        control2: { x: cx + (k * w) / 2, y: y + h },
        end: { x: cx, y: y + h },
      },
      {
        control1: { x: cx - (k * w) / 2, y: y + h },
        control2: { x: left, y: bottom + k * ry },
        end: { x: left, y: bottom },
      },
    ],
    rim: [
      {
        control1: { x: left, y: top + k * ry },
        control2: { x: cx - (k * w) / 2, y: y + 2 * ry },
        end: { x: cx, y: y + 2 * ry },
      },
      {
        control1: { x: cx + (k * w) / 2, y: y + 2 * ry },
        control2: { x: right, y: top + k * ry },
        end: { x: right, y: top },
      },
    ],
  };
}
/** Round only the routed corners. Each cubic stays inside the convex hull of
 * its trim points and corner, unlike Catmull-Rom which can overshoot into nodes.
 * The untrimmed terminal legs keep marker tangents aligned with node contact. */
export function curveSegments(points: Point[]): { control1: Point; control2: Point; end: Point }[] {
  const route = points.filter((p, i) => !i || p.x !== points[i - 1].x || p.y !== points[i - 1].y);
  const segments: { control1: Point; control2: Point; end: Point }[] = [];
  if (route.length < 2) return segments;
  let start = route[0];
  const between = (a: Point, b: Point, t: number): Point => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  });
  const line = (end: Point) => {
    if (start.x === end.x && start.y === end.y) return;
    segments.push({
      control1: between(start, end, 1 / 3),
      control2: between(start, end, 2 / 3),
      end,
    });
    start = end;
  };
  for (let i = 1; i < route.length - 1; i++) {
    const before = route[i - 1],
      corner = route[i],
      after = route[i + 1];
    const incoming = Math.hypot(corner.x - before.x, corner.y - before.y),
      outgoing = Math.hypot(after.x - corner.x, after.y - corner.y);
    const cross =
      (corner.x - before.x) * (after.y - corner.y) - (corner.y - before.y) * (after.x - corner.x);
    if (Math.abs(cross) < 1e-8) {
      line(corner);
      continue;
    }
    const trim = Math.min(12, incoming / 3, outgoing / 3);
    const entry = between(corner, before, trim / incoming),
      exit = between(corner, after, trim / outgoing);
    line(entry);
    segments.push({
      control1: between(entry, corner, 2 / 3),
      control2: between(exit, corner, 2 / 3),
      end: exit,
    });
    start = exit;
  }
  line(route.at(-1)!);
  return segments;
}
export function erMarkerGeometry(
  marker: Marker,
  tip: Point,
  previous: Point,
): { lines: Point[][]; circles: Point[] } | undefined {
  if (!marker.startsWith("er-")) return undefined;
  const angle = Math.atan2(tip.y - previous.y, tip.x - previous.x);
  const point = (forward: number, side: number): Point => ({
    x: tip.x + forward * Math.cos(angle) - side * Math.sin(angle),
    y: tip.y + forward * Math.sin(angle) + side * Math.cos(angle),
  });
  const bar = (offset: number): Point[] => [point(offset, -6), point(offset, 6)];
  const many = marker.endsWith("many");
  const lines: Point[][] = many
    ? [
        [point(0, -6), point(-12, 0)],
        [tip, point(-12, 0)],
        [point(0, 6), point(-12, 0)],
      ]
    : [bar(-4)];
  const circles: Point[] = [];
  if (marker.includes("zero")) circles.push(point(many ? -20 : -14, 0));
  else lines.push(bar(many ? -18 : -10));
  return { lines, circles };
}

export interface CubicSegment {
  control1: Point;
  control2: Point;
  end: Point;
}
/** Subdivide authored cubics when a hollow marker consumes the terminal shaft.
 * Interior controls remain exact; sampled arc length only locates the cut parameter. */
export function cubicMarkerShaft(
  start: Point,
  curves: CubicSegment[],
  first?: Marker,
  last?: Marker,
  size = 10,
): { start: Point; curves: CubicSegment[] } {
  const inset = (marker?: Marker) =>
    marker === "hollow-triangle" ? size : marker === "hollow-diamond" ? size * 1.4 : 0;
  if (!inset(first) && !inset(last)) return { start, curves };
  const lerp = (a: Point, b: Point, t: number): Point => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  });
  const split = (a: Point, s: CubicSegment, t: number) => {
    const ab = lerp(a, s.control1, t),
      bc = lerp(s.control1, s.control2, t),
      cd = lerp(s.control2, s.end, t),
      abc = lerp(ab, bc, t),
      bcd = lerp(bc, cd, t),
      point = lerp(abc, bcd, t);
    return {
      left: { control1: ab, control2: abc, end: point },
      right: { control1: bcd, control2: cd, end: s.end },
      point,
    };
  };
  const length = (a: Point, s: CubicSegment) => {
    let total = 0,
      previous = a;
    for (let i = 1; i <= 32; i++) {
      const t = i / 32,
        u = 1 - t,
        point = {
          x:
            u * u * u * a.x +
            3 * u * u * t * s.control1.x +
            3 * u * t * t * s.control2.x +
            t * t * t * s.end.x,
          y:
            u * u * u * a.y +
            3 * u * u * t * s.control1.y +
            3 * u * t * t * s.control2.y +
            t * t * t * s.end.y,
        };
      total += Math.hypot(point.x - previous.x, point.y - previous.y);
      previous = point;
    }
    return total;
  };
  const trim = (a: Point, segments: CubicSegment[], distance: number) => {
    if (!distance) return { start: a, curves: segments };
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i],
        arc = length(a, segment);
      if (arc > distance) {
        let lo = 0,
          hi = 1;
        for (let step = 0; step < 28; step++) {
          const t = (lo + hi) / 2;
          if (length(a, split(a, segment, t).left) < distance) lo = t;
          else hi = t;
        }
        const cut = split(a, segment, (lo + hi) / 2);
        return { start: cut.point, curves: [cut.right, ...segments.slice(i + 1)] };
      }
      distance -= arc;
      a = segment.end;
    }
    return { start: a, curves: [] };
  };
  const reverse = (a: Point, segments: CubicSegment[]) => ({
    start: segments.at(-1)?.end ?? a,
    curves: segments
      .map((segment, i) => ({
        control1: segment.control2,
        control2: segment.control1,
        end: i ? segments[i - 1].end : a,
      }))
      .reverse(),
  });
  const head = trim(start, curves, inset(first)),
    reversed = reverse(head.start, head.curves),
    tail = trim(reversed.start, reversed.curves, inset(last));
  return reverse(tail.start, tail.curves);
}
