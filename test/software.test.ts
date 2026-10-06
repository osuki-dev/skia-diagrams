import { expect, test } from "bun:test";
import {
  parseDiagram,
  layoutDiagram,
  renderToSvg,
  estimateText,
  lightTheme,
} from "../src/index.ts";
import { SceneCache } from "../src/layout/cache.ts";
import { clampViewerZoom, panLimit } from "../src/react/viewport.ts";
import { clipPolyline } from "../src/layout/clip.ts";
import { advancedFixtures } from "./advanced-fixtures.ts";
import { dateTicks, parseDate, formatAxisDate } from "../src/parse/dates.ts";
import type { Primitive } from "../src/types.ts";
const scene = (source: string) => layoutDiagram(parseDiagram(source));
const shapes = (source: string) =>
  scene(source).primitives.filter(
    (p): p is Extract<Primitive, { type: "shape" }> => p.type === "shape",
  );
for (const [name, source] of Object.entries(advancedFixtures))
  test(`advanced subset ${name} serializes Scene`, () => {
    const output = scene(source);
    expect(JSON.parse(JSON.stringify(output))).toEqual(output);
  });
test("bounded Scene LRU keys include source, every theme token and font identity", () => {
  const cache = new SceneCache(2, 100);
  const source = "flowchart LR\nA-->B";
  const key = cache.key(source, lightTheme, "font-1");
  let calls = 0;
  const measure: typeof estimateText = (...args) => {
    calls++;
    return estimateText(...args);
  };
  const first = cache.prepare(key, source, measure, 14);
  const measured = calls;
  expect(cache.prepare(key, source, measure, 14)).toBe(first);
  expect(calls).toBe(measured);
  const secondKey = cache.key(source, { ...lightTheme, fontFamily: "other" }, "font-1");
  const thirdKey = cache.key(source, lightTheme, "font-2");
  cache.prepare(secondKey, source, measure, 14);
  cache.prepare(thirdKey, source, measure, 14);
  expect(cache.size).toBe(2);
  expect(cache.get(key)).toBeUndefined();
  expect(cache.primitiveCount).toBeLessThanOrEqual(100);
  const noRoom = new SceneCache(2, 1);
  noRoom.prepare(key, source, measure, 14);
  expect(noRoom.size).toBe(0);
});
test("color edits reuse geometry while font, radius, spacing and provider changes invalidate it", () => {
  const cache = new SceneCache();
  const source = "flowchart LR\nA(Start)-->B(Done)";
  const key = cache.layoutKey(source, lightTheme, "provider-1");
  const recolored = {
    ...lightTheme,
    background: "#112233",
    nodeFill: "#334455",
    palette: ["#abcdef"],
    lineWeights: { edge: 3 },
    strokeWidth: 2,
    arrowSize: 16,
  };
  expect(cache.layoutKey(source, recolored, "provider-1")).toBe(key);
  expect(cache.key(source, recolored, "provider-1")).not.toBe(
    cache.key(source, lightTheme, "provider-1"),
  );
  let calls = 0;
  const measure: typeof estimateText = (...args) => {
    calls++;
    return estimateText(...args);
  };
  const first = cache.prepare(key, source, measure, {
    ...lightTheme.layout,
    fontSize: lightTheme.fontSize,
    radius: lightTheme.radius,
  });
  const before = calls;
  expect(cache.prepare(cache.layoutKey(source, recolored, "provider-1"), source, measure, 14)).toBe(
    first,
  );
  expect(calls).toBe(before);
  for (const theme of [
    { ...lightTheme, fontFamily: "other" },
    { ...lightTheme, fontSize: 20 },
    { ...lightTheme, radius: 18 },
    { ...lightTheme, layout: { padding: 40 } },
  ])
    expect(cache.layoutKey(source, theme, "provider-1")).not.toBe(key);
  expect(cache.layoutKey(source, lightTheme, "provider-2")).not.toBe(key);
});
test("large-scene viewers can fit, inspect at actual 1x, and zoom to absolute 6x with bounded pan", () => {
  expect(clampViewerZoom(0.01, 0.01)).toBe(0.01);
  expect(clampViewerZoom(1, 0.01)).toBe(1);
  expect(clampViewerZoom(100, 0.01)).toBe(6);
  expect(clampViewerZoom(0.01, 1)).toBe(0.5);
  expect(panLimit(10000, 400, 1)).toBe(4800);
  expect(panLimit(100, 400, 1)).toBe(60);
});
test("subgraphs honor independent directions and reserve non-overlapping title bands", () => {
  const source =
    "flowchart TD\nsubgraph outer [Title reserve]\ndirection LR\nA[Alpha]-->B[Beta]\nsubgraph inner [Nested title]\ndirection TB\nC[Gamma]-->D[Delta]\nend\nB-->C\nend\nZ-->outer";
  const output = scene(source);
  expect(output).toMatchSnapshot();
  const text = output.primitives.filter(
    (p): p is Extract<Primitive, { type: "text" }> => p.type === "text",
  );
  const label = (value: string) => text.find((p) => p.text === value)!;
  expect(label("Alpha").x).toBeLessThan(label("Beta").x);
  expect(label("Gamma").y).toBeLessThan(label("Delta").y);
  expect(label("Alpha").y).toBeGreaterThan(
    label("Title reserve").y + label("Title reserve").height,
  );
  expect(label("Gamma").y).toBeGreaterThan(label("Nested title").y + label("Nested title").height);
});
test("state compound endpoints, fork/join and inline/multiline notes lay out", () => {
  const source =
    "stateDiagram-v2\n[*]-->Running\nstate Running {\nstate f <<fork>>\nstate j <<join>>\nf-->A\nf-->B\nA-->j\nB-->j\n}\nRunning-->[*]\nnote right of Running: external\nnote left of A\nline one\nline two\nend note";
  const parsed = parseDiagram(source);
  expect(parsed).toMatchSnapshot();
  const output = layoutDiagram(parsed);
  expect(
    output.primitives.filter((p) => p.type === "shape" && p.shape === "rect" && p.height === 8),
  ).toHaveLength(2);
  expect(output.primitives.filter((p) => p.type === "shape" && p.fill === "noteFill")).toHaveLength(
    2,
  );
});
test("sequence boxes group participants and separators match their enclosing nested frame", () => {
  const source =
    "sequenceDiagram\nbox rgb(220,240,255) Team\nparticipant A as Alice\nparticipant B as Bob\nend\nparticipant C\nalt outer\nloop inner\nA->>B: work\nend\nelse other\nB-->>C: reply\nend";
  const parsed = parseDiagram(source);
  expect(parsed).toMatchSnapshot();
  const output = layoutDiagram(parsed);
  expect(output).toMatchSnapshot();
  const box = output.primitives.find((p) => p.type === "shape" && p.fill === "rgb(220,240,255)");
  expect(box?.type).toBe("shape");
  const separator = output.primitives.find(
    (p) => p.type === "path" && p.dash && p.points[0].y === p.points[1].y,
  );
  expect(separator).toBeDefined();
});
test("dateFormat round trips strictly, axisFormat applies, and adaptive ticks are bounded", () => {
  expect(parseDate("31/02/2026", "DD/MM/YYYY")).toBeNaN();
  const time = parseDate("05/10/2026 13:02", "DD/MM/YYYY HH:mm");
  expect(formatAxisDate(time, "%d %b %Y %H:%M")).toBe("05 Oct 2026 13:02");
  for (const duration of [5, 30, 365, 3650]) {
    const ticks = dateTicks(time, time + duration * 86400000);
    expect(ticks.length).toBeLessThanOrEqual(12);
    expect(ticks.every((t) => t >= time && t <= time + duration * 86400000)).toBe(true);
  }
  const output = scene(
    "gantt\ndateFormat DD/MM/YYYY\naxisFormat %d %b\nsection Work\nDone :done, a, 01/10/2026, 2d\nActive :active, b, after a, 3d\nCritical :crit, c, after b, 4d\nRelease :milestone, r, after c, 0d",
  );
  expect(output.primitives.some((p) => p.type === "text" && p.text.includes("Oct"))).toBe(true);
  expect(output.primitives.some((p) => p.type === "shape" && p.shape === "diamond")).toBe(true);
  expect(output.primitives.some((p) => p.type === "shape" && p.fill === "palette:2")).toBe(true);
});
test("pie sectors are analytic in Scene and SVG, including one full-circle slice", () => {
  const output = scene('pie\n"All" : 10');
  expect(output.primitives.find((p) => p.type === "sector")).toMatchObject({
    sweepAngle: Math.PI * 2,
  });
  const sector = output.primitives.find((p) => p.type === "sector");
  if (!sector || sector.type !== "sector") throw new Error("Missing pie sector");
  expect(renderToSvg(output)).toContain(` A${sector.radius} ${sector.radius} `);
});
test("Git merges use curved shared geometry", () => {
  const output = scene(
    "gitGraph\ncommit\nbranch feature\ncheckout feature\ncommit\ncheckout main\nmerge feature",
  );
  expect(
    output.primitives.some((p) => p.type === "path" && p.smooth && p.points.length === 4),
  ).toBe(true);
  expect(renderToSvg(output)).toContain(" C");
});
test("weighted radial trees honor shapes and all node boxes remain collision free", () => {
  const source =
    "mindmap\n root((Root))\n  Big[Large branch]\n   A[Long label alpha]\n   B[Long label beta]\n   C[Long label gamma]\n  Small{{Small}}";
  const nodes = shapes(source);
  expect(nodes.some((p) => p.shape === "hexagon")).toBe(true);
  for (const [index, a] of nodes.entries())
    for (const b of nodes.slice(index + 1))
      expect(
        a.x + a.width <= b.x ||
          b.x + b.width <= a.x ||
          a.y + a.height <= b.y ||
          b.y + b.height <= a.y,
      ).toBe(true);
});
test("quadrant labels sit in their actual quadrants and XY axes keep independent domains", () => {
  const output = scene(
    "quadrantChart\nx-axis Low --> High\ny-axis Small --> Large\nquadrant-1 Q1\nquadrant-2 Q2\nquadrant-3 Q3\nquadrant-4 Q4\nPoint: [0.3, 0.7]",
  );
  const labels = output.primitives.filter(
    (p): p is Extract<Primitive, { type: "text" }> => p.type === "text",
  );
  expect(labels.find((p) => p.text === "Q1")!.x).toBeGreaterThan(
    labels.find((p) => p.text === "Q2")!.x,
  );
  expect(labels.find((p) => p.text === "Q4")!.y).toBeGreaterThan(
    labels.find((p) => p.text === "Q1")!.y,
  );
  const parsed = parseDiagram(
    'xychart-beta\nx-axis "Year" 2020 --> 2022\ny-axis "Amount" -20 --> 100\nbar [20, 40, 80]\nbar [30, 45, 60]\nline [30, 60, 90]',
  );
  if (parsed.kind === "error" || parsed.kind === "unsupported")
    throw new Error("Expected XY chart");
  expect(parsed.ir.axis).toMatchObject({ xMin: 2020, xMax: 2022, min: -20, max: 100 });
  const bars = layoutDiagram(parsed).primitives.filter(
    (p): p is Extract<Primitive, { type: "shape" }> => p.type === "shape",
  );
  expect(bars[0].x + bars[0].width).toBeLessThanOrEqual(bars[3].x);
});
test("sequence self messages keep lifelines through the final row and preserve arrow semantics", () => {
  const output = scene(
    "sequenceDiagram\nparticipant A as A very long participant name\n" +
      Array(50).fill("A->>A: self").join("\n"),
  );
  const paths = output.primitives.filter(
    (p): p is Extract<Primitive, { type: "path" }> => p.type === "path",
  );
  const lifeline = paths.find((p) => p.dash)!;
  expect(lifeline.points[1].y).toBeGreaterThan(
    Math.max(...paths.filter((p) => p.end).flatMap((p) => p.points.map((point) => point.y))),
  );
  const arrows = scene(
    "sequenceDiagram\nA->B: none\nB-->A: dotted none\nA-)B: async\nB->>A: arrow",
  ).primitives.filter(
    (p): p is Extract<Primitive, { type: "path" }> => p.type === "path" && !!p.end,
  );
  expect(arrows.map((p) => p.end)).toEqual(["none", "none", "open", "arrow"]);
});
test("journey actors have separate lanes and timeline cards never overlap", () => {
  const journey = scene("journey\nsection Work\nCoffee :5: Me\nCode :3: Me, Team\nShip :1: Team");
  expect(journey.primitives.some((p) => p.type === "text" && p.text === "Team")).toBe(true);
  expect(
    journey.primitives.filter((p) => p.type === "shape" && p.shape === "circle" && p.width === 30),
  ).toHaveLength(3);
  const cards = shapes(
    "timeline\nsection Work\n2020 : A very long description which grows the card\n2021 : Launch\nsection Later\n2022 : Grow",
  ).filter((p) => p.shape === "round");
  for (const [index, card] of cards.entries())
    if (index) expect(card.x).toBeGreaterThan(cards[index - 1].x + cards[index - 1].width);
});
test("ER attributes are structured columns with keys and escaped comments", () => {
  const source =
    'erDiagram\nUSER {\nint id PK "primary key"\nstring name UK "<script>"\n}\nUSER ||--o{ ORDER : places';
  const parsed = parseDiagram(source);
  if (parsed.kind === "error" || parsed.kind === "unsupported") throw new Error("Expected ER");
  expect(parsed.ir.nodes[0].attributes?.[0]).toEqual({
    type: "int",
    name: "id",
    key: "PK",
    comment: "primary key",
  });
  expect(renderToSvg(layoutDiagram(parsed))).toContain("&lt;script&gt;");
});
test("edge length variants affect dagre ranks and node style subsets remain intact", () => {
  const normal = scene("flowchart TD\nA-->B"),
    long = scene("flowchart TD\nA---->B");
  expect(long.bounds.height).toBeGreaterThan(normal.bounds.height);
  const parsed = parseDiagram(
    "flowchart LR\nA-..->B\nstyle A fill:rgb(1,2,3),stroke:#333,stroke-width:4px,stroke-dasharray:5\\,5",
  );
  if (parsed.kind === "error" || parsed.kind === "unsupported")
    throw new Error("Expected styled flowchart");
  expect(parsed.ir.edges[0].minLength).toBe(2);
  expect(parsed.ir.nodes[0].style).toMatchObject({
    fill: "rgb(1,2,3)",
    strokeWidth: 4,
    dash: [5, 5],
  });
});
test("bounded CJK and emphasized labels wrap, ellipsize, and preserve identical Scene lines for SVG", () => {
  const output = layoutDiagram(
    parseDiagram('flowchart LR\nA["`**中文流程图中文流程图中文流程图中文流程图**`"]'),
    estimateText,
    { maxLabelWidth: 56, maxLabelLines: 2 },
  );
  const label = output.primitives.find((p) => p.type === "text");
  if (label?.type !== "text") throw new Error("Missing label");
  expect(label.lineRuns).toHaveLength(2);
  expect(label.lineRuns![0][0].bold).toBe(true);
  expect(label.lineRuns![1].at(-1)?.text).toBe("…");
  expect(renderToSvg(output)).toContain('font-weight="700"');
  expect(renderToSvg(output)).toContain("…");
  expect(estimateText("中文流程图中文", { fontSize: 14, maxWidth: 28 }).lines).toHaveLength(4);
});
test("forward declarations keep explicit node shapes and cross-cluster references never reparent nodes", () => {
  const parsed = parseDiagram(
    "flowchart LR\nA-->B\nsubgraph first\nA((A))\nend\nsubgraph second\nA-->C\nend\nclassDef default fill:#abc\nclassDef one,two stroke:#333\nclass B two",
  );
  if (parsed.kind === "error" || parsed.kind === "unsupported") throw new Error("Expected graph");
  expect(parsed.ir.nodes.find((n) => n.id === "A")).toMatchObject({
    shape: "circle",
    parent: "first",
    style: { fill: "#abc" },
  });
  expect(parsed.ir.nodes.find((n) => n.id === "B")?.style?.stroke).toBe("#333");
  expect(layoutDiagram(parsed).bounds.width).toBeGreaterThan(0);
});
test("Git branch commands switch lanes, repeated labels stay distinct, and self merges fail", () => {
  const parsed = parseDiagram(
    'gitGraph\ncommit id:"first"\nbranch feature\ncommit id:"work"\ncheckout main\nmerge feature id:"merged"',
  );
  if (parsed.kind === "error" || parsed.kind === "unsupported") throw new Error("Expected Git");
  expect(parsed.ir.events.map((e) => e.from)).toEqual(["main", "feature", "main"]);
  const repeated = parseDiagram('gitGraph\ncommit id:"same"\ncommit id:"same"');
  if (repeated.kind !== "gitgraph") throw new Error("Expected repeated Git label");
  expect(repeated.ir.nodes.map((node) => node.label)).toEqual(["same", "same"]);
  expect(new Set(repeated.ir.nodes.map((node) => node.id)).size).toBe(2);
  expect(parseDiagram('gitGraph\ncommit\nmerge main id:"self"').kind).toBe("error");
});
test("XY out-of-domain series clip at exact linear intersections", () => {
  expect(
    clipPolyline(
      [
        { x: 0, y: -1 },
        { x: 2, y: 1 },
      ],
      { x: 0, y: 0, width: 2, height: 2 },
    ),
  ).toEqual([
    [
      { x: 1, y: 0 },
      { x: 2, y: 1 },
    ],
  ]);
  const output = scene(
    "xychart-beta\nx-axis [a,b,c]\ny-axis 0 --> 10\nline [-5,20,5]\nbar [-5,20,5]",
  );
  const frame = output.primitives.find((p) => p.type === "path" && p.strokeRole === "frame");
  if (!frame || frame.type !== "path") throw new Error("Missing XY frame");
  const top = Math.min(...frame.points.map((p) => p.y)),
    bottom = Math.max(...frame.points.map((p) => p.y));
  for (const p of output.primitives) {
    if (p.type === "path" && p.strokeRole === "series" && p.stroke?.startsWith("palette"))
      expect(p.points.every((point) => point.y >= top && point.y <= bottom)).toBe(true);
    if (p.type === "shape" && p.shape === "round")
      expect(p.y >= top && p.y + p.height <= bottom).toBe(true);
  }
});
test("horizontal XY charts transpose series without rotating text", () => {
  const output = scene(
    "xychart-beta horizontal\nx-axis [a,b,c]\ny-axis -10 --> 50\nbar [10,20,30]\nline [20,30,40]",
  );
  const bars = output.primitives.filter(
    (p): p is Extract<Primitive, { type: "shape" }> => p.type === "shape",
  );
  expect(bars[2].y).toBeGreaterThan(bars[0].y);
  expect(bars[2].width).toBeGreaterThan(bars[0].width);
  expect(
    output.primitives.some((p) => p.type === "text" && p.text === "a" && p.x < bars[0].x),
  ).toBe(true);
});
