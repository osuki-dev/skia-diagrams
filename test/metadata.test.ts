import { readYaml, readYamlMapping } from "../src/parse/yaml.ts";
import { readDiagramThemeDirective } from "../src/react/theme-directive.ts";
import { expect, test } from "bun:test";
import { mergeDiagramConfig, readDiagramMetadata } from "../src/parse/metadata.ts";

test("official initialization merges nested mappings with front matter priority", () => {
  const source = `---
config:
  theme: dark
  pie:
    textPosition: 0.6
---
%%{ initialize: {theme: base, pie: {textPosition: 0.4, showData: true}} }%%
pie
  "A": 1`;
  const result = readDiagramMetadata(source);
  expect(result.config).toEqual({
    theme: "dark",
    pie: { textPosition: 0.6, showData: true },
  });
  expect(result.source.split("\n").length).toBe(source.split("\n").length);
  expect(result.source).not.toContain("initialize");
});

test("multiple directives replace arrays while retaining nested settings", () => {
  const result = readDiagramMetadata(`%%{init: {themeVariables: {fontSize: 14, colors: [red]}} }%%
%%{init: {themeVariables: {fontSize: 18, colors: [blue, green]}} }%%
flowchart TD
A-->B`);
  expect(result.config?.themeVariables).toEqual({
    fontSize: 18,
    colors: ["blue", "green"],
  });
});

test("configuration keys cannot modify object prototypes", () => {
  const result = mergeDiagramConfig(
    JSON.parse('{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}'),
  )!;
  expect(Object.getPrototypeOf(result)).toBeNull();
  expect(Object.getPrototypeOf(result.__proto__)).toBeNull();
  expect(({} as Record<string, unknown>).polluted).toBeUndefined();
});

test("malformed initialization remains a diagnostic instead of silently disappearing", () => {
  expect(() => readDiagramMetadata('%%{init: [1, 2]}%%\npie\n"A":1')).toThrow();
});

test("metadata reader rejects duplicate keys, cycles and excessive nesting", () => {
  expect(() => readYamlMapping("{type: one, type: two}", 7, "Attributes")).toThrow(
    "Invalid attributes",
  );
  expect(() => readYaml("root: &root {child: *root}", 1, "Front matter")).toThrow("Cyclic");
  expect(() => readYaml("[".repeat(40) + "0" + "]".repeat(40), 1, "Attributes")).toThrow(
    "nesting limits",
  );
});

test("metadata keeps JSON-compatible values and ordered integer-like mapping keys", () => {
  const keys: string[] = [];
  expect(
    readYamlMapping(
      '{"2": second, "1": first, empty: {}, list: [], date: 2026-10-06}',
      1,
      "Attributes",
      keys,
    ),
  ).toEqual({
    "1": "first",
    "2": "second",
    empty: {},
    list: [],
    date: "2026-10-06",
  });
  expect(keys).toEqual(["2", "1", "empty", "list", "date"]);
});

test("official multiline quoted CSS keeps Mermaid YAML4 closing-indent semantics", async () => {
  const { readFrontMatter } = await import("../src/parse/frontmatter.ts");
  const { parseDiagramAsync } = await import("../src/index.ts");
  const source = await Bun.file(
    "design/theme-studio/official/comparison/cases/gantt/011/source.mmd",
  ).text();
  const metadata = readFrontMatter(source);
  expect(metadata.config?.gantt).toEqual({
    useWidth: 400,
    rightPadding: 0,
    topAxis: true,
    numberSectionStyles: 2,
  });
  expect(metadata.config?.themeCSS).toContain(
    "text[id^=workaround] { fill: red; y: 100%; font-size: 15px;}",
  );
  expect(metadata.source.split("\n").length).toBe(source.split("\n").length);
  const diagram = await parseDiagramAsync(source);
  expect(diagram.kind).toBe("gantt");
  if (diagram.kind === "gantt") expect(diagram.ir.events).toHaveLength(7);
  expect(
    readFrontMatter('---\nconfig:\n  note: "first\n  "\n---\nflowchart TD\nA').config?.note,
  ).toBe("first ");
  expect(
    readFrontMatter("---\nconfig:\n  note: 'first\n  '\n---\nflowchart TD\nA").config?.note,
  ).toBe("first ");
  expect(() =>
    readFrontMatter('---\nconfig:\n  note: "first\nbad continuation"\n---\nflowchart TD\nA'),
  ).toThrow("indentation");
});

test("appearance metadata works independently of a diagram grammar", () => {
  expect(
    readDiagramThemeDirective(
      '%%{init: {"theme":"dark", "themeVariables":{"primaryColor":"#123456", "fontSize":20}}}%%\nfutureOfficialDiagram\nsyntax unknown',
    ),
  ).toEqual({ theme: "dark", variables: { primaryColor: "#123456" } });
  expect(
    readDiagramThemeDirective(
      '---\nconfig:\n  theme: dark\n  themeVariables:\n    background: "#abcdef"\n---\nradar-beta\naxis a',
    ),
  ).toEqual({ theme: "dark", variables: { background: "#abcdef" } });
});
test("invalid metadata remains a preparation diagnostic", () => {
  expect(readDiagramThemeDirective("---\nconfig: []\n---\npie")).toBeUndefined();
});

test("public init configuration controls C4 row geometry and Kanban authored links", async () => {
  const { parseDiagram } = await import("../src/parse/index.ts");
  const { layoutDiagram } = await import("../src/layout/index.ts");
  const elements = 'C4Context\nPerson(a,"One")\nPerson(b,"Two")';
  const oneColumn = layoutDiagram(parseDiagram("%%{init: {c4: {c4ShapeInRow: 1}}}%%\n" + elements));
  const twoColumns = layoutDiagram(
    parseDiagram("%%{initialize: {c4: {c4ShapeInRow: 2}}}%%\n" + elements),
  );
  const region = (scene: typeof oneColumn, id: string) =>
    scene.interactions!.find((item) => item.target === id)!;
  expect(region(oneColumn, "b").y).toBeGreaterThan(region(oneColumn, "a").y);
  expect(region(twoColumns, "b").y).toBe(region(twoColumns, "a").y);
  expect(region(twoColumns, "b").x).toBeGreaterThan(region(twoColumns, "a").x);
  const board = layoutDiagram(
    parseDiagram(
      '%%{initialize: {kanban: {ticketBaseUrl: "https://example.com/#TICKET#"}}}%%\nkanban\n  Todo\n    task[Ship]@{ticket: DEMO-1}',
    ),
  );
  expect(board.interactions!.find((item) => item.kind === "link")!.target).toBe(
    "https://example.com/DEMO-1",
  );
});
