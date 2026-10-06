import { parseExtended } from "../src/parse/extended.ts";
import type { Primitive } from "../src/types.ts";
import { hitTestInteraction } from "../src/react/hit-test.ts";
import { describe, expect, test } from "bun:test";
import catalog from "./fixtures/official-mermaid/catalog.json" with { type: "json" };
import { parseExtendedSankey } from "../src/parse/extended-sankey.ts";
import { layoutExtendedSankey } from "../src/layout/extended-sankey.ts";
import { estimateText } from "../src/layout/measure.ts";

describe("native Sankey syntax and geometry", () => {
  test("official CSV examples preserve links, quoted labels and configuration", () => {
    for (const example of catalog.types.find((type) => type.type === "sankey")!.cases) {
      const parsed = parseExtendedSankey(example.source)!;
      expect(parsed.kind).toBe("sankey");
      const scene = layoutExtendedSankey(parsed, estimateText)!;
      expect(
        scene.primitives.some((primitive) => primitive.type === "path" && primitive.closed),
      ).toBe(true);
      expect(scene.bounds.height).toBeGreaterThan(0);
      if (parsed.kind === "sankey") expect(parsed.ir.edges.length).toBeGreaterThan(0);
    }
    const quoted = parseExtendedSankey('sankey\nA,"B, ""quoted""",5')!;
    if (quoted.kind === "sankey") expect(quoted.ir.nodes[1].label).toBe('B, "quoted"');
    else throw new Error("Quoted CSV failed");
  });
  test("ribbon thickness conserves incoming and outgoing flow", () => {
    const parsed = parseExtendedSankey("sankey\nA,B,2\nA,C,6")!;
    const scene = layoutExtendedSankey(parsed, estimateText)!;
    const bands = scene.primitives.filter((primitive) => primitive.type === "path");
    const thickness = bands.map((band) => Math.abs(band.points.at(-1)!.y - band.points[0].y));
    expect(thickness[1] / thickness[0]).toBeCloseTo(3, 8);
  });
  test("invalid CSV and cycles produce actionable failures", () => {
    expect(parseExtendedSankey('sankey\nA,"B,5')?.kind).toBe("error");
    expect(parseExtendedSankey("sankey\nA,B,NaN")?.kind).toBe("error");
    expect(() =>
      layoutExtendedSankey(parseExtendedSankey("sankey\nA,B,1\nB,A,1")!, estimateText),
    ).toThrow("acyclic");
  });
});

test("dense energy example keeps measured labels readable and within scene bounds", () => {
  const example = catalog.types.find((type) => type.type === "sankey")!.cases[0];
  const scene = layoutExtendedSankey(parseExtendedSankey(example.source)!, estimateText)!;
  const labels = scene.primitives.filter((primitive) => primitive.type === "text");
  for (const label of labels) {
    expect(label.x).toBeGreaterThanOrEqual(scene.bounds.x);
    expect(label.y).toBeGreaterThanOrEqual(scene.bounds.y);
    expect(label.x + label.width).toBeLessThanOrEqual(scene.bounds.width);
    expect(label.y + label.height).toBeLessThanOrEqual(scene.bounds.height);
  }
  for (let i = 0; i < labels.length; i++)
    for (let j = i + 1; j < labels.length; j++) {
      const a = labels[i],
        b = labels[j];
      const overlaps =
        a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
      expect(overlaps).toBe(false);
    }
});

test("zero-valued links are valid official syntax and remain finite", () => {
  const parsed = parseExtendedSankey("sankey\nA,B,0")!;
  expect(parsed.kind).toBe("sankey");
  const scene = layoutExtendedSankey(parsed, estimateText)!;
  for (const primitive of scene.primitives) {
    if (primitive.type === "path")
      for (const point of primitive.points) expect(Number.isFinite(point.y)).toBe(true);
    else expect(Number.isFinite(primitive.height)).toBe(true);
  }
});

test("signed official CSV values retain semantics and bounded thin links", () => {
  const parsed = parseExtendedSankey("sankey\nA,B,-1\nB,C,2")!;
  expect(parsed.kind).toBe("sankey");
  if (parsed.kind === "sankey") expect(parsed.ir.edges[0].label).toBe("-1");
  const scene = layoutExtendedSankey(parsed, estimateText)!;
  expect(scene.accessibilityLabel).toContain("A to B: -1");
  expect(
    scene.primitives.some(
      (primitive) => primitive.type === "path" && !primitive.closed && primitive.strokeWidth === 1,
    ),
  ).toBe(true);
  for (const primitive of scene.primitives) {
    if (primitive.type === "path")
      for (const point of primitive.points) expect(Number.isFinite(point.y)).toBe(true);
    else expect(primitive.height).toBeGreaterThanOrEqual(0);
  }
});

test("joined ribbons stack to the shared node extent without losing flow", () => {
  const scene = layoutExtendedSankey(
    parseExtendedSankey("sankey\nA,C,2\nB,C,6\nC,D,8")!,
    estimateText,
  )!;
  const ribbons = scene.primitives.filter(
    (primitive): primitive is Extract<Primitive, { type: "path" }> =>
      primitive.type === "path" && Boolean(primitive.closed),
  );
  const node = scene.primitives.find(
    (primitive) => primitive.type === "shape" && primitive.id === "C",
  );
  if (!node || node.type !== "shape") throw new Error("Missing shared Sankey node");
  const width = (index: number) => ribbons[index].points.at(-1)!.y - ribbons[index].points[0].y;
  expect(width(0) + width(1)).toBeCloseTo(node.height, 8);
  expect(width(2)).toBeCloseTo(node.height, 8);
  expect(ribbons[1].points[24].y - ribbons[0].points[24].y).toBeCloseTo(width(0), 8);
});

test("CSV quoted multiline labels and literal comment prefixes remain data", () => {
  const parsed = parseExtendedSankey('sankey\n%% comment\n"%% literal","Line one\nLine two",3')!;
  expect(parsed.kind).toBe("sankey");
  if (parsed.kind === "sankey") {
    expect(parsed.ir.nodes.map((node) => node.label)).toEqual(["%% literal", "Line one\nLine two"]);
    expect(parsed.ir.edges).toHaveLength(1);
  }
});

test("leading comments before the Sankey header are accepted", () => {
  expect(parseExtendedSankey("%% Before header\n\nsankey\nA,B,1")?.kind).toBe("sankey");
});

test("syntax errors retain source line numbers after frontmatter", () => {
  const parsed = parseExtendedSankey("---\ntitle: Example\n---\nsankey\nA,B,not-a-number");
  expect(parsed?.kind).toBe("error");
  if (parsed?.kind === "error") expect(parsed.error.line).toBe(5);
});

test("prototype-like node labels do not become inherited color properties", () => {
  const parsed = parseExtendedSankey("sankey\nconstructor,__proto__,1")!;
  const scene = layoutExtendedSankey(parsed, estimateText)!;
  const nodes = scene.primitives.filter((primitive) => primitive.type === "shape");
  expect(nodes.map((node) => node.fill)).toEqual(["palette:0", "palette:1"]);
});

test("Sankey data interactions select actual ribbons and readable node labels", () => {
  const scene = layoutExtendedSankey(parseExtendedSankey("sankey\nA,B,2\nA,C,6")!, estimateText)!;
  const flow = scene.interactions!.find((item) => item.id === "sankey-flow-0")!;
  if (flow.hit?.type !== "polygon") throw new Error("Sankey flow must use exact ribbon geometry");
  const upper = flow.hit.points[12],
    lower = flow.hit.points[37];
  const flowOnly = { ...scene, interactions: [flow] };
  expect(hitTestInteraction(flowOnly, { x: upper.x, y: (upper.y + lower.y) / 2 })?.value).toBe(2);
  expect(hitTestInteraction(flowOnly, { x: flow.x + 1, y: flow.y + 0.1 })).toBeUndefined();
  const label = scene.interactions!.find((item) => item.id === "sankey-label-0")!;
  expect(
    hitTestInteraction(scene, {
      x: label.x + label.width / 2,
      y: label.y + label.height / 2,
    })?.target,
  ).toBe("A");
});

test("official Sankey numeric-prefix parsing and value affixes remain configurable", () => {
  const parsed = parseExtendedSankey(
    '---\nconfig:\n  sankey:\n    prefix: "$"\n    suffix: " USD"\n---\nsankey\nA,B,3.456 units',
  )!;
  expect(parsed.kind).toBe("sankey");
  const scene = layoutExtendedSankey(parsed, estimateText)!;
  expect(
    scene.primitives.some(
      (primitive) => primitive.type === "text" && primitive.text.includes("$3.46 USD"),
    ),
  ).toBe(true);
  expect(scene.interactions!.find((item) => item.id === "sankey-flow-0")!.value).toBe(3.456);
});

test("official Sankey plain labels preserve literal emphasis markers", () => {
  const scene = layoutExtendedSankey(parseExtendedSankey("sankey\n**A**,__B__,1")!, estimateText)!;
  const labels = scene.primitives.filter((primitive) => primitive.type === "text");
  expect(labels.every((label) => label.literal)).toBe(true);
  expect(labels.map((label) => label.text)).toEqual(["**A**\n1", "__B__\n1"]);
});

test("native extended dispatch accepts multiline Mermaid init directives", () => {
  expect(parseExtended('%%{init: {\n  "theme": "dark"\n}}%%\nsankey\nA,B,1')?.kind).toBe("sankey");
});

test("extended dispatch delegates unrelated types without changing them", () => {
  expect(parseExtended("flowchart LR\nA-->B")).toBeUndefined();
});

test("initialize aliases preserve specialized configuration and YAML wins", () => {
  const parsed = parseExtended(
    '---\nconfig:\n  sankey:\n    suffix: " kg"\n---\n%%{ initialize : {sankey: {showValues: false, suffix: " ignored"}} }%%\nsankey\nA,B,2',
  );
  expect(parsed?.kind).toBe("sankey");
  if (parsed?.kind === "sankey") {
    expect(parsed.ir.data?.config).toMatchObject({
      showValues: false,
      suffix: " kg",
    });
  }
});

test("public init configuration changes native Sankey geometry and labels", async () => {
  const { parseDiagram } = await import("../src/parse/index.ts");
  const { layoutDiagram } = await import("../src/layout/index.ts");
  const initialized = layoutDiagram(
    parseDiagram(
      "%%{ initialize : {sankey: {nodeWidth: 37, showValues: false}} }%%\nsankey\nA,B,2",
    ),
  );
  const nodes = initialized.primitives.filter((primitive) => primitive.type === "shape");
  expect(nodes.map((node) => node.width)).toEqual([37, 37]);
  expect(
    initialized.primitives
      .filter((primitive) => primitive.type === "text")
      .map((label) => label.text),
  ).toEqual(["A", "B"]);
  const overridden = layoutDiagram(
    parseDiagram(
      "---\nconfig:\n  sankey:\n    nodeWidth: 21\n    showValues: true\n---\n%%{init: {sankey: {nodeWidth: 37, showValues: false}}}%%\nsankey\nA,B,2",
    ),
  );
  expect(
    overridden.primitives
      .filter((primitive) => primitive.type === "shape")
      .map((node) => node.width),
  ).toEqual([21, 21]);
  expect(
    overridden.primitives
      .filter((primitive) => primitive.type === "text")
      .map((label) => label.text),
  ).toEqual(["A\n2", "B\n2"]);
});
