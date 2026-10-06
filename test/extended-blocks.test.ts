import { describe, expect, test } from "bun:test";
import catalog from "./fixtures/official-mermaid/catalog.json" with { type: "json" };
import { parseExtendedBlocks } from "../src/parse/extended-blocks.ts";
import { layoutExtendedBlocks } from "../src/layout/extended-blocks.ts";
import { hitTestInteraction } from "../src/react/hit-test.ts";

describe("native official block, kanban, and swimlane syntax", () => {
  for (const entry of catalog.types.filter((t) =>
    ["block", "kanban", "swimlanes"].includes(t.type),
  )) {
    for (const fixture of entry.cases) {
      test(fixture.id + " " + fixture.title, () => {
        const parsed = parseExtendedBlocks(fixture.source)!;
        expect(parsed.kind).toBe(entry.type as typeof parsed.kind);
        const scene = layoutExtendedBlocks(parsed)!;
        expect(scene.primitives.length).toBeGreaterThan(0);
        expect(Number.isFinite(scene.bounds.width)).toBe(true);
        expect(Number.isFinite(scene.bounds.height)).toBe(true);
      });
    }
  }
  test("preserves nested block columns, spans and explicit styles", () => {
    const parsed = parseExtendedBlocks(
      "block\ncolumns 3\nblock:g:2\n columns 2\n A B\nend\nC\nstyle A fill:#abc",
    )!;
    if (parsed.kind !== "block") throw new Error("Expected block");
    expect(parsed.ir.nodes.find((n) => n.id === "A")?.style?.fill).toBe("#abc");
    const scene = layoutExtendedBlocks(parsed)!;
    const a = scene.primitives.find((p) => p.type === "shape" && p.id === "A")!;
    const b = scene.primitives.find((p) => p.type === "shape" && p.id === "B")!;
    expect(a.type === "shape" && b.type === "shape" && b.x > a.x).toBe(true);
  });
  test("does not misclassify unrelated diagrams", () => {
    expect(parseExtendedBlocks("flowchart LR\nA-->B")).toBeUndefined();
  });
  test("preserves kanban task metadata and ticket URL configuration", () => {
    const fixture = catalog.types.find((t) => t.type === "kanban")!.cases[2];
    const parsed = parseExtendedBlocks(fixture.source)!;
    if (parsed.kind !== "kanban") throw new Error("Expected kanban");
    expect(parsed.ir.data?.config).toEqual({
      ticketBaseUrl: "https://mermaidchart.atlassian.net/browse/#TICKET#",
    });
    const scene = layoutExtendedBlocks(parsed)!;
    expect(scene.primitives.some((p) => p.type === "text" && p.text === "MC-2038")).toBe(true);
  });
  test("rejects unclosed groups, invalid spans and malformed metadata", () => {
    expect(parseExtendedBlocks("block\nblock:g\nA")?.kind).toBe("error");
    expect(parseExtendedBlocks("block\nA:0")?.kind).toBe("error");
    expect(parseExtendedBlocks("kanban\nTodo\n  A[Task]@{assigned: [x]}")?.kind).toBe("error");
  });
});

test("kanban ticket links are authored native hit regions, without preview expansion", () => {
  const parsed = parseExtendedBlocks(
    "---\nconfig:\n  kanban:\n    ticketBaseUrl: https://tickets.example.com/#TICKET#\n---\nkanban\nTodo\n  task[Fix crash]@{ ticket: ISSUE-12 }",
  )!;
  const scene = layoutExtendedBlocks(parsed)!;
  expect(scene.interactions?.filter((i) => i.kind === "link")).toHaveLength(1);
  const link = scene.interactions!.find((i) => i.kind === "link")!;
  expect(link).toMatchObject({
    kind: "link",
    target: "https://tickets.example.com/ISSUE-12",
    label: "ISSUE-12: Fix crash",
  });
  expect(link.width).toBeGreaterThan(0);
  expect(link.height).toBeGreaterThan(0);
  expect(
    hitTestInteraction(scene, { x: link.x + link.width / 2, y: link.y + link.height / 2 })?.kind,
  ).toBe("link");
  const plain = layoutExtendedBlocks(
    parseExtendedBlocks("kanban\nTodo\n  task[Fix crash]@{ ticket: ISSUE-12 }")!,
  )!;
  expect(plain.interactions?.filter((i) => i.kind === "link")).toHaveLength(0);
  expect(plain.interactions?.[0].kind).toBe("data");
});

test("kanban initialize directives supply authored ticket link configuration", () => {
  const parsed = parseExtendedBlocks(
    '%%{initialize: {"kanban":{"ticketBaseUrl":"https://example.com/#TICKET#"}}}%%\nkanban\n  todo[To do]\n    task[Ship]@{ticket: RELEASE-1}',
  )!;
  const scene = layoutExtendedBlocks(parsed)!;
  expect(scene.interactions?.find((item) => item.kind === "link")?.target).toBe(
    "https://example.com/RELEASE-1",
  );
});

test("block inline links create positioned nodes and styles can target multiple blocks", () => {
  const parsed = parseExtendedBlocks('block\nA["Start"]-->B["End"]\nstyle A,B fill:#abc')!;
  if (parsed.kind !== "block") throw new Error("Expected block");
  const scene = layoutExtendedBlocks(parsed)!;
  expect(scene.primitives.filter((p) => p.type === "shape" && p.fill === "#abc")).toHaveLength(2);
  expect(scene.primitives.filter((p) => p.type === "path")).toHaveLength(1);
});

test("swimlane handoffs route around unrelated tasks and contact actual node boundaries", () => {
  const source = catalog.types.find((type) => type.type === "swimlanes")!.cases[0].source;
  const parsed = parseExtendedBlocks(source)!;
  const scene = layoutExtendedBlocks(parsed)!;
  const pick = scene.primitives.find((p) => p.type === "shape" && p.id === "Pick")!;
  const paths = scene.primitives.filter((p) => p.type === "path");
  const invoiceHandoff = paths[3];
  if (pick.type !== "shape" || invoiceHandoff.type !== "path")
    throw new Error("Missing swimlane primitives");
  for (let index = 1; index < invoiceHandoff.points.length; index++) {
    const a = invoiceHandoff.points[index - 1],
      b = invoiceHandoff.points[index];
    const crosses =
      a.x === b.x
        ? a.x > pick.x &&
          a.x < pick.x + pick.width &&
          Math.max(a.y, b.y) > pick.y &&
          Math.min(a.y, b.y) < pick.y + pick.height
        : a.y > pick.y &&
          a.y < pick.y + pick.height &&
          Math.max(a.x, b.x) > pick.x &&
          Math.min(a.x, b.x) < pick.x + pick.width;
    expect(crosses).toBe(false);
  }
});

test("block grammar permits inline columns and composite block commands", () => {
  const parsed = parseExtendedBlocks("block columns 3 A block:g:2 columns 2 B C end")!;
  expect(parsed.kind).toBe("block");
  const scene = layoutExtendedBlocks(parsed)!;
  expect(
    scene.primitives.filter((p) => p.type === "shape").map((p) => (p.type === "shape" ? p.id : "")),
  ).toEqual(["A", "g", "B", "C"]);
});

test("block preserves multiline labels and accessibility descriptions, including comment-like text", () => {
  const parsed = parseExtendedBlocks(
    '%% Leading comment\nblock\n A["First\n%% literal text\nlast"] B["-->"]\n accDescr {\n  First paragraph.\n  Second paragraph.\n }',
  )!;
  if (parsed.kind !== "block") throw new Error("Expected block");
  expect(parsed.ir.nodes.find((n) => n.id === "A")?.label).toBe("First\n%% literal text\nlast");
  expect(parsed.ir.nodes.find((n) => n.id === "B")?.label).toBe("-->");
  expect(parsed.ir.edges).toHaveLength(0);
  expect(parsed.ir.description).toContain("Second paragraph.");
  expect(layoutExtendedBlocks(parsed)!.accessibilityLabel).toContain("First paragraph.");
});

test("block reversed delimiters follow upstream rectangle fallback and retain authored type strings", () => {
  const parsed = parseExtendedBlocks(
    'block\n A)"Reversed"(\n B))"Reverse circle"((\n C-)"Right lean"(-',
  )!;
  if (parsed.kind !== "block") throw new Error("Expected block");
  expect(parsed.ir.nodes.map((n) => [n.id, n.label, n.shape, n.metadata?.blockTypeString])).toEqual(
    [
      ["A", "Reversed", "rect", ")("],
      ["B", "Reverse circle", "rect", "))(("],
      ["C", "Right lean", "rect", "-)(-"],
    ],
  );
});

test("block tilde identifiers follow the official lexer's node precedence", () => {
  const parsed = parseExtendedBlocks("block\nA ~~~ B")!;
  if (parsed.kind !== "block") throw new Error("Expected block");
  expect(parsed.ir.nodes.map((node) => node.id)).toEqual(["A", "~~~", "B"]);
  expect(parsed.ir.edges).toHaveLength(0);
});

test("official block grammar preserves chains, adjacent links and endpoint markers", () => {
  const parsed = parseExtendedBlocks("block\nA --> B --> C D <--> E F <--x G H -.-o I")!;
  if (parsed.kind !== "block") throw new Error("Expected block");
  expect(parsed.ir.edges.map((edge) => [edge.from, edge.to])).toEqual([
    ["A", "B"],
    ["B", "C"],
    ["D", "E"],
    ["F", "G"],
    ["H", "I"],
  ]);
  expect(parsed.ir.edges[2]).toMatchObject({ start: "arrow", end: "arrow" });
  expect(parsed.ir.edges[3]).toMatchObject({ start: "arrow", end: "cross" });
  expect(parsed.ir.edges[4]).toMatchObject({ end: "circle", dashed: true });
});

test("board geometry reserves inscribed label space at large font sizes", () => {
  const parsed = parseExtendedBlocks('block\ncolumns 2\nA(("Start")) B>"Text in a box"]')!;
  const scene = layoutExtendedBlocks(parsed, undefined, { fontSize: 24 })!;
  const circle = scene.primitives.find((p) => p.type === "shape" && p.id === "A");
  const flag = scene.primitives.find((p) => p.type === "shape" && p.id === "B");
  const label = scene.primitives.find((p) => p.type === "text" && p.text.includes("Text"));
  if (circle?.type !== "shape" || flag?.type !== "shape" || label?.type !== "text")
    throw new Error("Missing board geometry");
  expect(circle.width).toBe(circle.height);
  expect(label.x).toBeGreaterThanOrEqual(flag.x + flag.width * 0.2 + 12);
});

test("named composite blocks preserve labels, spans and multiline child text", () => {
  const parsed = parseExtendedBlocks(
    'block\ncolumns 3\nblock:g["Server Group"]:2\ncolumns 1\n A["Service\none"]\nend\nB\nstyle g fill:#abc',
  )!;
  if (parsed.kind !== "block") throw new Error("Expected block");
  const scene = layoutExtendedBlocks(parsed)!;
  expect(scene.primitives.some((p) => p.type === "text" && p.text === "Server Group")).toBe(true);
  expect(
    scene.primitives.some((p) => p.type === "shape" && p.id === "g" && p.fill === "#abc"),
  ).toBe(true);
  const group = scene.primitives.find((p) => p.type === "shape" && p.id === "g")!;
  const child = scene.primitives.find((p) => p.type === "shape" && p.id === "A")!;
  if (group.type !== "shape" || child.type !== "shape")
    throw new Error("Missing composite geometry");
  expect(child.y).toBeGreaterThan(group.y + 24);
  expect(child.y + child.height).toBeLessThanOrEqual(group.y + group.height);
});

test("block multi-target style and classes permit whitespace after commas", () => {
  const parsed = parseExtendedBlocks(
    "block\nA B C\nclassDef green fill:#abc\nclass A, B green\nstyle B, C stroke:#def",
  )!;
  if (parsed.kind !== "block") throw new Error("Expected block");
  expect(parsed.ir.nodes.find((n) => n.id === "A")?.style?.fill).toBe("#abc");
  expect(parsed.ir.nodes.find((n) => n.id === "B")?.style).toMatchObject({
    fill: "#abc",
    stroke: "#def",
  });
  expect(parsed.ir.nodes.find((n) => n.id === "C")?.style?.stroke).toBe("#def");
});

test("native board data interactions preserve authored link priority and meaningful labels", () => {
  const parsed = parseExtendedBlocks(
    '%% Leading comment\nswimlane-beta LR\nsubgraph Team\n A[Review order]\n B[Ship order]\nend\nA-->B\nclick A "https://orders.example.com" "View order"',
  )!;
  if (parsed.kind !== "swimlanes") throw new Error("Expected swimlanes");
  const scene = layoutExtendedBlocks(parsed)!;
  expect(scene.interactions?.[0]).toMatchObject({
    kind: "link",
    target: "https://orders.example.com",
    label: "Review order",
    tooltip: "View order",
  });
  expect(scene.interactions?.find((i) => i.kind === "data" && i.target === "B")).toMatchObject({
    label: "Ship order",
    tooltip: "Ship order",
  });
  const block = layoutExtendedBlocks(parseExtendedBlocks('block\nA["Service"] B["Storage"]')!)!;
  expect(block.interactions?.map((i) => [i.kind, i.target, i.label])).toEqual([
    ["data", "A", "Service"],
    ["data", "B", "Storage"],
  ]);
});
