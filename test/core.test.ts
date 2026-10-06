import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import {
  findMermaidFences,
  layoutDiagram,
  parseDiagram,
  renderToSvg,
  lightTheme,
  resolveDiagramTheme,
  type ParsedDiagram,
  type Primitive,
} from "../src/index.ts";
import { intersectShape, curveSegments } from "../src/render/geometry.ts";
const fixtureDirectory = `${import.meta.dir}/../fixtures`;
const fixtures = Object.fromEntries(
  readdirSync(fixtureDirectory)
    .filter((file) => file.endsWith(".mmd"))
    .sort()
    .map((file) => [file.slice(0, -4), readFileSync(`${fixtureDirectory}/${file}`, "utf8")]),
);
function valid(source: string): Exclude<ParsedDiagram, { kind: "error" | "unsupported" }> {
  const parsed = parseDiagram(source);
  if (parsed.kind === "error" || parsed.kind === "unsupported")
    throw new Error(JSON.stringify(parsed));
  return parsed;
}
describe("M0–M5 type fixtures", () => {
  for (const [kind, source] of Object.entries(fixtures))
    test(`${kind} parses, serializes, lays out and exports`, () => {
      const parsed = valid(source);
      expect(String(parsed.kind)).toBe(kind);
      expect(parsed).toMatchSnapshot();
      expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
      const scene = layoutDiagram(parsed);
      expect(scene.bounds.width).toBeGreaterThan(0);
      expect(scene.bounds.height).toBeGreaterThan(0);
      for (const primitive of scene.primitives) {
        const points =
          primitive.type === "path"
            ? primitive.points
            : [
                { x: primitive.x, y: primitive.y },
                { x: primitive.x + primitive.width, y: primitive.y + primitive.height },
              ];
        for (const p of points) {
          expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
          expect(p.x).toBeGreaterThanOrEqual(scene.bounds.x);
          expect(p.y).toBeGreaterThanOrEqual(scene.bounds.y);
          expect(p.x).toBeLessThanOrEqual(scene.bounds.x + scene.bounds.width);
          expect(p.y).toBeLessThanOrEqual(scene.bounds.y + scene.bounds.height);
        }
      }
      expect(renderToSvg(scene, lightTheme)).toContain("<svg");
    });
});
test("streaming fences close only with a matching delimiter", () => {
  expect(findMermaidFences("```mermaid\nflowchart TD\nA-->B")[0].closed).toBe(false);
  expect(findMermaidFences("````mermaid\nA\n```\n~~~~\n````")[0]).toMatchObject({
    closed: true,
    source: "A\n```\n~~~~",
  });
  expect(findMermaidFences("```text\n```mermaid\nA\n```")).toEqual([]);
  expect(findMermaidFences("~~~mermaid\nA\n~~~\n")[0]).toMatchObject({ closed: true, source: "A" });
});
test("flowchart directions and non-overlap", () => {
  for (const direction of ["TD", "TB", "BT", "LR", "RL"]) {
    const scene = layoutDiagram(
      valid(`flowchart ${direction}\nA[Alpha] --> B[Beta]\nA --> C[Gamma]`),
    );
    const nodes = scene.primitives.filter((p) => p.type === "shape");
    expect(nodes.length).toBe(3);
    for (const [index, a] of nodes.entries())
      for (const b of nodes.slice(index + 1))
        expect(
          a.x + a.width <= b.x ||
            b.x + b.width <= a.x ||
            a.y + a.height <= b.y ||
            b.y + b.height <= a.y,
        ).toBe(true);
    const [a, b] = nodes;
    expect(
      direction === "LR"
        ? a.x < b.x
        : direction === "RL"
          ? a.x > b.x
          : direction === "BT"
            ? a.y > b.y
            : a.y < b.y,
    ).toBe(true);
  }
});
test("all flowchart node shapes", () => {
  const tokens = [
    "[Rectangle]",
    "(Round)",
    "([Stadium])",
    "[[Subroutine]]",
    "[(Cylinder)]",
    "((Circle))",
    ">Flag]",
    "{Diamond}",
    "{{Hexagon}}",
    "[/Para/]",
    "[\\Reverse\\]",
    "[/Trap\\]",
    "[\\ReverseTrap/]",
    "(((Double)))",
  ];
  const parsed = valid(`flowchart LR\n${tokens.map((token, i) => `N${i}${token}`).join("\n")}`);
  expect(new Set(parsed.ir.nodes.map((n) => n.shape)).size).toBe(14);
});
test("flowchart edges, cartesian expansion, chaining and labels", () => {
  for (const arrow of [
    "-->",
    "---",
    "-.->",
    "-.-",
    "==>",
    "===",
    "--o",
    "--x",
    "<-->",
    "o--o",
    "x--x",
    "---->",
  ])
    expect(valid(`flowchart TD\nA ${arrow} B`).ir.edges).toHaveLength(1);
  expect(valid("flowchart LR\nA & B --> C & D --> E").ir.edges).toHaveLength(6);
  expect(valid("flowchart TD\nA -- hello --> B").ir.edges[0].label).toBe("hello");
  expect(valid('flowchart TD\nA["a --> b & c"] --> B').ir.nodes[0].label).toBe("a --> b & c");
});
test("nested clusters enclose children and style classes apply", () => {
  const parsed = valid(
    "flowchart TD\nsubgraph outer [Outer]\nsubgraph inner [Inner]\nA[Alpha]:::hot --> B[Beta]\nend\nend\nclassDef hot fill:#f9f,stroke:#333,color:#111",
  );
  expect(parsed.ir.nodes[0].style?.fill).toBe("#f9f");
  const scene = layoutDiagram(parsed);
  const clusters = scene.primitives.filter(
    (p): p is Extract<Primitive, { type: "shape" }> =>
      p.type === "shape" && p.fill === "clusterFill",
  );
  const children = scene.primitives.filter(
    (p): p is Extract<Primitive, { type: "shape" }> =>
      p.type === "shape" && p.fill !== "clusterFill",
  );
  for (const cluster of clusters)
    for (const node of children)
      expect(
        node.x >= cluster.x &&
          node.y >= cluster.y &&
          node.x + node.width <= cluster.x + cluster.width &&
          node.y + node.height <= cluster.y + cluster.height,
      ).toBe(true);
});
test("SVG escapes labels and attribute injection", () => {
  const scene = layoutDiagram(valid('flowchart TD\nA["<script>& #quot; 中文<br/>next"]'));
  const svg = renderToSvg(scene, { ...lightTheme, fontFamily: '" onload="evil' });
  expect(svg).not.toContain("<script>");
  expect(svg).toContain("&lt;script&gt;");
  expect(svg).toContain("&quot; onload=&quot;evil");
  expect(svg).toContain("<tspan");
});
test("comments inside labels survive, and restricted emphasis exports as text spans", () => {
  const parsed = valid(
    'flowchart TD\nA["`**Bold** and *italic* %% text`"] --> B %% actual comment',
  );
  expect(parsed.ir.nodes[0].label).toContain("%% text");
  const svg = renderToSvg(layoutDiagram(parsed));
  expect(svg).toContain('font-weight="700"');
  expect(svg).toContain('font-style="italic"');
  expect(svg).not.toContain("**Bold**");
});
test("sequence supports every listed arrow and fragment keyword without losing events", () => {
  for (const arrow of ["->>", "-->>", "->", "-->", "-x", "--x", "-)", "--)"]) {
    const parsed = valid(`sequenceDiagram\nparticipant A\nparticipant B\nA${arrow}B: hi`);
    expect(parsed.ir.events[0]).toMatchObject({
      type: "message",
      from: "A",
      to: "B",
      flags: [arrow],
    });
  }
  for (const frame of ["loop", "alt", "opt", "par", "critical", "break", "rect"]) {
    const parsed = valid(`sequenceDiagram\n${frame} condition\nA->>A: self\nend`);
    expect(parsed.ir.events.map((e) => e.type)).toEqual(["frame", "message", "end"]);
    expect(
      layoutDiagram(parsed).primitives.some((p) => p.type === "path" && p.points.length === 4),
    ).toBe(true);
  }
});
test("Gantt weekend exclusions and after dependencies are deterministic UTC dates", () => {
  const parsed = valid(
    "gantt\ndateFormat YYYY-MM-DD\nexcludes weekends\nA :a, 2026-01-02, 1d\nB :b, after a, 2d",
  );
  expect(new Date(parsed.ir.events[0].end!).toISOString()).toBe("2026-01-05T00:00:00.000Z");
  expect(parsed.ir.events[1].start).toBe(parsed.ir.events[0].end);
});
test("class compartments and ER attribute headers have explicit separators", () => {
  const classScene = layoutDiagram(valid("classDiagram\nclass A {\n+name: string\n+run()\n}"));
  expect(
    classScene.primitives.filter(
      (p) => p.type === "path" && p.stroke === "gridStroke" && p.strokeRole === "frame",
    ),
  ).toHaveLength(2);
  const erScene = layoutDiagram(valid("erDiagram\nA {\nstring name\n}"));
  expect(
    erScene.primitives.filter(
      (p) => p.type === "path" && p.stroke === "gridStroke" && p.strokeRole === "frame",
    ),
  ).toHaveLength(1);
});
test("sequence notes are positioned on the declared side", () => {
  const left = layoutDiagram(
    valid("sequenceDiagram\nparticipant A\nNote left of A: note"),
  ).primitives.find((p) => p.type === "shape" && p.fill === "noteFill");
  const right = layoutDiagram(
    valid("sequenceDiagram\nparticipant A\nNote right of A: note"),
  ).primitives.find((p) => p.type === "shape" && p.fill === "noteFill");
  if (left?.type !== "shape" || right?.type !== "shape") throw new Error("Missing note shapes");
  expect(left.x + left.width).toBeLessThan(right.x);
});
test("ER cardinalities produce distinct endpoint markers", () => {
  for (const [relation, start, end] of [
    ["||--o{", "er-one", "er-zero-many"],
    ["|o--||", "er-zero-one", "er-one"],
    ["}|--|{", "er-one-many", "er-one-many"],
    ["}o--o{", "er-zero-many", "er-zero-many"],
  ]) {
    expect(valid(`erDiagram\nA ${relation} B : relates`).ir.edges[0]).toMatchObject({ start, end });
  }
});
test("sequence actors have dedicated head and stick-figure geometry", () => {
  const scene = layoutDiagram(
    valid("sequenceDiagram\nactor A as Alice\nparticipant B as Bob\nA->>B: hi"),
  );
  expect(
    scene.primitives.some((p) => p.type === "shape" && p.shape === "circle" && p.width === 16),
  ).toBe(true);
});
test("unknown types, syntax errors and size limits never produce a partial graph", () => {
  expect(parseDiagram("sankey-beta\na,b,1").kind).toBe("sankey");
  expect(parseDiagram("flowchart TD\nA -->")).toMatchObject({
    kind: "error",
    error: { kind: "syntax", line: 2 },
  });
  expect(
    parseDiagram(`flowchart TD\n${Array.from({ length: 301 }, (_, i) => `N${i}`).join("\n")}`),
  ).toMatchObject({ kind: "error", error: { kind: "limit" } });
  expect(parseDiagram("x".repeat(200001))).toMatchObject({
    kind: "error",
    error: { kind: "limit" },
  });
  expect(parseDiagram("sequenceDiagram\nloop x\nA->>B: hi")).toMatchObject({ kind: "error" });
});
test("edge endpoints intersect circle and diamond boundaries", () => {
  const rect = { x: 0, y: 0, width: 100, height: 100 };
  const circle = intersectShape("circle", rect, { x: 150, y: 150 });
  expect(Math.hypot(circle.x - 50, circle.y - 50)).toBeCloseTo(50);
  const diamond = intersectShape("diamond", rect, { x: 150, y: 150 });
  expect(Math.abs(diamond.x - 50) + Math.abs(diamond.y - 50)).toBeCloseTo(50);
});
test("smooth edges preserve route endpoints and export cubic segments", () => {
  const points = [
    { x: 0, y: 0 },
    { x: 50, y: 0 },
    { x: 50, y: 80 },
    { x: 100, y: 80 },
  ];
  const segments = curveSegments(points);
  // Rounded bends intentionally trim interior waypoints, not the terminal contacts.
  expect(segments.at(-1)?.end).toEqual(points.at(-1));
  expect(
    segments.every((segment) =>
      [segment.control1, segment.control2, segment.end].every(
        (p) => p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 80,
      ),
    ),
  ).toBe(true);
  expect(segments[0].control1.y).toBe(0);
  const scene = layoutDiagram(valid("flowchart TD\nA-->B\nA-->C\nB-->D\nC-->D"));
  expect(scene.primitives.filter((p) => p.type === "path").every((p) => p.smooth)).toBe(true);
  expect(renderToSvg(scene)).toContain(" C");
});
test("directive is data only and records the supported theme subset", () => {
  expect(
    valid(
      "%%{init: {'theme':'dark','themeVariables':{'primaryColor':'#123'}}}%%\nflowchart TD\nA-->B",
    ).ir,
  ).toMatchObject({ theme: "dark", variables: { primaryColor: "#123" } });
});
test("host tokens override directives and update typography, colors, palette and geometry", () => {
  const overrides = {
    ...lightTheme,
    nodeFill: "#123456",
    fontFamily: "custom",
    fontFamilyMono: "code",
    fontSize: 22,
    strokeWidth: 3,
    radius: 18,
    palette: ["#abcdef"],
  };
  const first = resolveDiagramTheme(overrides, "light", {
    theme: "dark",
    variables: { primaryColor: "#000000" },
  });
  expect(first).toEqual(overrides);
  const second = resolveDiagramTheme({ ...overrides, nodeFill: "#fedcba", fontSize: 12 });
  expect(second.nodeFill).toBe("#fedcba");
  expect(second.fontSize).toBe(12);
  const source = valid("flowchart TD\nA[Label]");
  expect(
    layoutDiagram(source, undefined, { fontSize: first.fontSize }).bounds.width,
  ).toBeGreaterThan(layoutDiagram(source, undefined, { fontSize: second.fontSize }).bounds.width);
  expect(resolveDiagramTheme(undefined, "light", { theme: "dark" }).nodeText).not.toBe(
    lightTheme.nodeText,
  );
});
