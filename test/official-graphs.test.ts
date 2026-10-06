import { expect, test } from "bun:test";
import { officialCatalog } from "../example/official-fixtures.ts";
import { parseGraph } from "../src/parse/graphs.ts";
import { emptyIR } from "../src/parse/common.ts";
import { readFrontMatter } from "../src/parse/frontmatter.ts";
import { parseDiagram } from "../src/parse/index.ts";

test("official class, state and ER sources retain their native graph semantics", () => {
  for (const type of officialCatalog.types) {
    const kind =
      type.type === "classDiagram"
        ? "class"
        : type.type === "stateDiagram"
          ? "state"
          : type.type === "entityRelationshipDiagram"
            ? "er"
            : undefined;
    if (!kind) continue;
    for (const fixture of type.cases) {
      const lines = readFrontMatter(fixture.source)
        .source.split("\n")
        .map((text, index) => ({ text: text.trim(), line: index + 1 }))
        .filter((line) => line.text && !line.text.startsWith("%%"));
      lines.shift();
      const ir = emptyIR();
      parseGraph(ir, kind, lines);
      expect(ir.nodes.length + ir.clusters.length + ir.events.length).toBeGreaterThan(0);
    }
  }
});

test("class namespaces, notes and interactions are preserved without executing callbacks", () => {
  const result = parseDiagram(
    'classDiagram\nnamespace Auth {\nclass UserService {\n+login()\n}\n}\nnote for UserService "Signs in"\nclick UserService call openUser() "View user"',
  );
  if (result.kind !== "class") throw new Error(JSON.stringify(result));
  expect(result.ir.nodes[0].parent).toBe("Auth");
  expect(result.ir.nodes[0].label).toContain("+login()");
  expect(result.ir.events).toContainEqual({
    type: "class-note",
    from: "UserService",
    label: "Signs in",
  });
  expect(result.ir.events).toContainEqual({
    type: "interaction",
    from: "UserService",
    to: "openUser()",
    label: "View user",
    flags: ["callback"],
  });
});

test("ER alias attributes, cardinality aliases and class style precedence survive parsing", () => {
  const result = parseDiagram(
    "erDiagram\np[Person] {\nstring? name\n}\np only one to zero or more ACCOUNT : owns\nclassDef default fill:white,stroke:black\nclassDef highlighted fill:red\np:::highlighted",
  );
  if (result.kind !== "er") throw new Error(JSON.stringify(result));
  expect(result.ir.nodes[0].label).toStartWith("Person");
  expect(result.ir.nodes[0].attributes?.[0].type).toBe("string?");
  expect(result.ir.nodes[0].style).toEqual({ fill: "red", stroke: "black" });
  expect(result.ir.edges[0]).toMatchObject({ start: "er-one", end: "er-zero-many" });
});

test("ER authored aliases remain separate from attribute text for native headers", () => {
  const result = parseDiagram(
    'erDiagram\nORDER["Purchase order<br/>Verified"] {\nint id PK\nstring status\n}',
  );
  if (result.kind !== "er") throw new Error(JSON.stringify(result));
  expect(result.ir.nodes[0].metadata?.headerLabel).toBe("Purchase order\nVerified");
  expect(result.ir.nodes[0].attributes).toHaveLength(2);
});

test("class generics and dotted namespaces retain their official displayed hierarchy", () => {
  const result = parseDiagram(
    "classDiagram\nnamespace Company.Engineering.Backend {\nclass Square~Shape~ {\nList~List~int~~ getPoints()\n}\n}\nnamespace Company.Engineering.Frontend {\nclass Viewer\n}",
  );
  if (result.kind !== "class") throw new Error(JSON.stringify(result));
  expect(result.ir.clusters.map(({ id, parent }) => [id, parent])).toEqual([
    ["Company", undefined],
    ["Company.Engineering", "Company"],
    ["Company.Engineering.Backend", "Company.Engineering"],
    ["Company.Engineering.Frontend", "Company.Engineering"],
  ]);
  expect(result.ir.nodes[0].label).toBe("Square<Shape>\nList<List<int>> getPoints()");
});
