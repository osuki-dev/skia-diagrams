import { expect, test } from "bun:test";
import {
  curveSegments,
  cylinderGeometry,
  intersectShape,
  markerGeometry,
  markerShaft,
  circleMarkerCenter,
} from "../src/render/geometry.ts";
import type { Point } from "../src/types.ts";
import {
  layoutDiagram,
  parseDiagram,
  renderToSvg,
  lightTheme,
  darkTheme,
  resolveColor,
} from "../src/index.ts";
import { flowchartDetailFixtures } from "./flowchart-fixtures.ts";
import { detailedFixtures } from "../example/fixture-cases.ts";

test("smoothed orthogonal routes stay in the routed corridor, including endpoint tangents", () => {
  const points = [
    { x: 0, y: 0 },
    { x: 0, y: 40 },
    { x: 60, y: 40 },
    { x: 60, y: 80 },
  ];
  const segments = curveSegments(points);
  for (const segment of segments)
    for (const point of [segment.control1, segment.control2, segment.end]) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(60);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(80);
    }
  expect(segments[0].control1.x).toBe(0);
  expect(segments.at(-1)?.control2.x).toBe(60);
  expect(segments.at(-1)?.end).toEqual(points.at(-1));
});

test("stadium and rounded-corner endpoints contact their silhouettes, not bounding rectangles", () => {
  const rect = { x: 0, y: 0, width: 120, height: 40 };
  const toward = { x: 200, y: -30 };
  for (const [shape, radius] of [
    ["stadium", 20],
    ["round", 12],
  ] as const) {
    const tip = intersectShape(shape, rect, toward, radius);
    const corner = { x: rect.width - radius, y: radius };
    expect(tip.x).toBeGreaterThan(corner.x);
    expect(tip.y).toBeLessThan(corner.y);
    expect(Math.hypot(tip.x - corner.x, tip.y - corner.y)).toBeCloseTo(radius, 5);
    expect((tip.x - 60) * -50 - (tip.y - 20) * 140).toBeCloseTo(0, 5);
  }
});

test("cylinder contacts follow the rendered cubic cap, not its empty bounding corners", () => {
  const rect = { x: 0, y: 0, width: 120, height: 60 };
  const cap = cylinderGeometry(rect),
    start = cap.start,
    segment = cap.top[0];
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
  for (const t of [0.1, 0.25, 0.5, 0.75, 0.9]) {
    const boundary = at(t);
    const tip = intersectShape("cylinder", rect, {
      x: 60 + 4 * (boundary.x - 60),
      y: 30 + 4 * (boundary.y - 30),
    });
    expect(tip.x).toBeCloseTo(boundary.x, 4);
    expect(tip.y).toBeCloseTo(boundary.y, 4);
  }
});

test("short legs, duplicates and reversals never produce nonfinite or overshooting curves", () => {
  for (const points of [
    [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ],
    [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 0, y: 0 },
    ],
    [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ],
  ])
    for (const segment of curveSegments(points))
      for (const point of [segment.control1, segment.control2, segment.end]) {
        expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true);
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(5);
        expect(point.y).toBeLessThanOrEqual(1);
      }
});

test("phone-scale filled and open markers retain discernible width at the default inline scale", () => {
  for (const marker of [
    "arrow",
    "open",
    "hollow-triangle",
    "diamond",
    "hollow-diamond",
    "cross",
    "crow",
  ] as const) {
    const geometry = markerGeometry(marker, { x: 0, y: 20 }, { x: 0, y: 0 }, 10);
    const points = geometry.paths.flat();
    expect(
      (Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x))) * 0.9,
    ).toBeGreaterThanOrEqual(9);
  }
});
test("circle terminals touch the node at their outer tangent and remain wholly visible", () => {
  expect(circleMarkerCenter({ x: 100, y: 20 }, { x: 0, y: 20 })).toEqual({ x: 96, y: 20 });
  expect(circleMarkerCenter({ x: 0, y: 20 }, { x: 100, y: 20 }).x).toBeCloseTo(4);
});
test("hollow UML markers have no shaft drawn through their open interiors", () => {
  const points = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ];
  expect(markerShaft(points, "hollow-triangle", "hollow-diamond", 10)).toEqual([
    { x: 10, y: 0 },
    { x: 86, y: 0 },
  ]);
  expect(markerShaft(points, "open", "arrow", 10)).toEqual(points);
  expect(
    markerShaft(
      [
        { x: 0, y: 0 },
        { x: 2, y: 0 },
      ],
      "hollow-triangle",
      undefined,
      10,
    ),
  ).toEqual([]);
  const scene = layoutDiagram(parseDiagram("classDiagram\nAnimal <|-- Dog"));
  const path = scene.primitives.find((p) => p.type === "path");
  if (!path || path.type !== "path") throw new Error("Missing UML relationship");
  const shaft = markerShaft(path.points, path.start, path.end, lightTheme.arrowSize);
  const svg = renderToSvg(scene, lightTheme);
  expect(svg).toContain(`M${shaft[0].x} ${shaft[0].y}`);
  expect(svg).toMatch(/<polygon[^>]+fill="none"/);
});
test("default category text keeps 4.5:1 contrast in both Osuki palettes", () => {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5]
      .map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
      .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  for (const theme of [lightTheme, darkTheme])
    for (const [i, color] of theme.palette.entries()) {
      const a = luminance(color),
        b = luminance(resolveColor(`paletteText:${i}`, theme.nodeText, theme));
      expect((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
});
test("branch, merge, cycle and nested smoothed routes do not enter unrelated node interiors", () => {
  for (const source of Object.values(flowchartDetailFixtures)) {
    const scene = layoutDiagram(parseDiagram(source));
    const nodes = scene.primitives.filter(
      (p) => p.type === "shape" && !!p.id && p.fill !== "clusterFill",
    );
    for (const path of scene.primitives)
      if (path.type === "path") {
        let start = path.points[0];
        for (const segment of path.smooth
          ? curveSegments(path.points)
          : path.points
              .slice(1)
              .map((end, index) => ({ control1: path.points[index], control2: end, end }))) {
          for (let i = 1; i < 20; i++) {
            const t = i / 20;
            const point = {
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
            };
            for (const node of nodes)
              if (node.type === "shape") {
                const center = { x: node.x + node.width / 2, y: node.y + node.height / 2 };
                const boundary = intersectShape(node.shape, node, point);
                expect(
                  Math.hypot(point.x - center.x, point.y - center.y) + 0.01,
                ).toBeGreaterThanOrEqual(Math.hypot(boundary.x - center.x, boundary.y - center.y));
              }
          }
          start = segment.end;
        }
      }
  }
});
test("ending nested sequence frames do not strike through the following else label", () => {
  const scene = layoutDiagram(parseDiagram(detailedFixtures.Sequence));
  const label = scene.primitives.find((p) => p.type === "text" && p.text === "else other");
  if (!label || label.type !== "text") throw new Error("Missing else label");
  const frames = scene.primitives.filter(
    (p) => p.type === "shape" && p.stroke === "clusterStroke" && p.fill === "transparent",
  );
  expect(frames).toHaveLength(2);
  const inner = frames.find((p) => p.type === "shape" && p.y > 150);
  if (!inner || inner.type !== "shape") throw new Error("Missing inner frame");
  expect(inner.y + inner.height).toBeLessThanOrEqual(label.y - 4);
});
