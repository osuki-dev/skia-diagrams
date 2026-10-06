import { expect, test } from "bun:test";
import {
  layoutDiagram,
  parseDiagram,
  estimateText,
  lightTheme,
  darkTheme,
  renderToSvg,
} from "../src/index.ts";
import { flowchartDetailFixtures } from "./flowchart-fixtures.ts";
import { detailedFixtures, supportedTypes, subsetDescriptions } from "../example/fixture-cases.ts";
import { intersectShape, markerGeometry, curveSegments } from "../src/render/geometry.ts";
import { readThemeOverrides } from "../example/theme-editor.ts";
import type { Primitive } from "../src/types.ts";
type ShapePrimitive = Extract<Primitive, { type: "shape" }>;
for (const [name, source] of Object.entries(flowchartDetailFixtures))
  test(`flowchart detail ${name}: bounds, node and label clearances`, () => {
    const output = layoutDiagram(parseDiagram(source));
    const nodes = output.primitives.filter(
      (p): p is ShapePrimitive => p.type === "shape" && !!p.id && p.fill !== "clusterFill",
    );
    const pills = output.primitives.filter(
      (p): p is ShapePrimitive => p.type === "shape" && p.fill === "edgeTextBackground",
    );
    for (const pill of pills)
      for (const node of nodes)
        expect(
          pill.x + pill.width <= node.x ||
            node.x + node.width <= pill.x ||
            pill.y + pill.height <= node.y ||
            node.y + node.height <= pill.y,
        ).toBe(true);
    for (const p of output.primitives)
      if (p.type !== "path") {
        expect(p.x).toBeGreaterThanOrEqual(output.bounds.x);
        expect(p.y).toBeGreaterThanOrEqual(output.bounds.y);
        expect(p.x + p.width).toBeLessThanOrEqual(output.bounds.x + output.bounds.width + 0.001);
        expect(p.y + p.height).toBeLessThanOrEqual(output.bounds.y + output.bounds.height + 0.001);
      }
    for (const node of nodes)
      if (node.shape === "diamond") {
        const label = output.primitives.find(
          (p) =>
            p.type === "text" &&
            p.x >= node.x &&
            p.x + p.width <= node.x + node.width &&
            p.y >= node.y &&
            p.y + p.height <= node.y + node.height,
        );
        expect(label?.type).toBe("text");
        if (label && label.type === "text")
          expect((label.width + 12) / node.width + (label.height + 12) / node.height).toBeLessThan(
            1,
          );
      }
  });
test("long multiline decisions fit their entire padded text box", () => {
  const label =
    "A comfortably padded long decision\nsecond line of the same width\nthird line in a decision\nfourth line";
  const output = layoutDiagram(
    parseDiagram(`flowchart TD\nA{"${label.replaceAll("\n", "<br/>")}"}`),
  );
  const shape = output.primitives.find((p) => p.type === "shape") as ShapePrimitive;
  const measured = estimateText(label, { fontSize: 14 });
  expect((measured.width + 24) / shape.width + (measured.height + 16) / shape.height).toBeLessThan(
    1,
  );
});
test("all fourteen identities retain padded labels inside their silhouettes", () => {
  const forms = [
    "[中文<br/>流程图]",
    "(中文<br/>流程图)",
    "([中文<br/>流程图])",
    "[[中文<br/>流程图]]",
    "[(中文<br/>流程图)]",
    "((中文<br/>流程图))",
    ">中文<br/>流程图]",
    "{中文<br/>流程图}",
    "{{中文<br/>流程图}}",
    "[/中文<br/>流程图/]",
    "[\\中文<br/>流程图\\]",
    "[/中文<br/>流程图\\]",
    "[\\中文<br/>流程图/]",
    "(((中文<br/>流程图)))",
  ];
  const identities = new Set<string>();
  for (const form of forms) {
    const output = layoutDiagram(parseDiagram(`flowchart LR\nA${form}`)),
      shape = output.primitives.find((p) => p.type === "shape") as ShapePrimitive;
    identities.add(shape.shape);
    const label = output.primitives.find((p) => p.type === "text") as Extract<
      Primitive,
      { type: "text" }
    >;
    for (const x of [label.x - 4, label.x + label.width + 4])
      for (const y of [label.y - 4, label.y + label.height + 4]) {
        const boundary = intersectShape(shape.shape, shape, { x, y });
        const center = { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 };
        expect(Math.hypot(x - center.x, y - center.y)).toBeLessThanOrEqual(
          Math.hypot(boundary.x - center.x, boundary.y - center.y) + 0.001,
        );
      }
  }
  expect(identities.size).toBe(14);
});
test("SVG double-circle and subroutine interior strokes match injected width", () => {
  const svg = renderToSvg(
    layoutDiagram(parseDiagram("flowchart LR\nA(((Double))) --> B[[Routine]]")),
    { ...lightTheme, strokeWidth: 3 },
  );
  // Node envelope and its three interior/second-ring strokes stay exactly 3;
  // connections use the configurable contemporary edge-to-base ratio.
  expect(svg.match(/stroke-width="3"/g)?.length).toBe(4);
  expect(svg.match(/stroke-width="3.5999999999999996"/g)?.length).toBe(2);
});
test("geometry tokens and explicit Mermaid styles preserve host precedence", () => {
  const tokens = readThemeOverrides(
    '{"nodeFill":"#abc123","arrowSize":12,"layout":{"nodePaddingX":30,"nodePaddingY":20,"rankSeparation":70}}',
  );
  const source =
    "flowchart LR\nA[Alpha] -->|label| B[Beta]\nstyle A fill:#efefef,stroke:#123456,color:#112233,stroke-width:3\nlinkStyle 0 stroke:#234567,stroke-width:2";
  const scene = layoutDiagram(parseDiagram(source), estimateText, {
    ...tokens.layout,
    fontSize: 14,
  });
  const node = scene.primitives.find((p) => p.type === "shape" && p.id === "A") as ShapePrimitive;
  expect(node.width).toBe(estimateText("Alpha", { fontSize: 14 }).width + 60);
  expect(node.fill).toBe("#efefef");
  expect(node.strokeWidth).toBe(3);
  const svg = renderToSvg(scene, { ...lightTheme, ...tokens });
  expect(svg).toContain('fill="#efefef"');
  expect(svg).toContain('stroke="#234567"');
  expect(svg).toContain('fill="#112233"');
  expect(() => readThemeOverrides('{"layout":{"fontSize":1}}')).toThrow();
});
test("smooth endpoint markers use the actual terminal tangent and configurable size", () => {
  const points = [
      { x: 0, y: 0 },
      { x: 40, y: 20 },
      { x: 80, y: 0 },
    ],
    segments = curveSegments(points),
    tip = points[2],
    prior = segments[1].control2;
  const marker = markerGeometry("arrow", tip, prior, 9);
  const [left, center, right] = marker.paths[0];
  expect(center).toEqual(tip);
  const dx = tip.x - prior.x,
    dy = tip.y - prior.y,
    length = Math.hypot(dx, dy);
  expect(
    (((left.x + right.x) / 2 - tip.x) * dx) / length +
      (((left.y + right.y) / 2 - tip.y) * dy) / length,
  ).toBeCloseTo(-9);
  for (const shape of ["hexagon", "flag"] as const) {
    const boundary = intersectShape(
      shape,
      { x: 0, y: 0, width: 100, height: 60 },
      { x: -100, y: 30 },
    );
    expect(boundary.x).toBeCloseTo(shape === "flag" ? 20 : 0);
  }
});
test("all thirteen selectable detailed examples parse, layout and export their real scenes", () => {
  expect(supportedTypes).toHaveLength(13);
  for (const name of supportedTypes) {
    const parsed = parseDiagram(detailedFixtures[name]);
    expect(parsed.kind).not.toBe("error");
    expect(parsed.kind).not.toBe("unsupported");
    const scene = layoutDiagram(parsed);
    expect(scene.primitives.length).toBeGreaterThan(2);
    expect(subsetDescriptions[name]).toBeTruthy();
    expect(renderToSvg(scene, darkTheme)).toContain("<svg");
    expect(Number.isFinite(scene.bounds.width) && Number.isFinite(scene.bounds.height)).toBe(true);
  }
});
