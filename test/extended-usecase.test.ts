import { expect, test } from "bun:test";
import { parseUsecase } from "../src/parse/extended-usecase.ts";
import type { UsecaseJsonRow } from "../src/parse/usecase-json.ts";
import catalog from "./fixtures/official-mermaid/catalog.json" with { type: "json" };

test("all pinned official use-case examples parse without DOM dependencies", () => {
  const cases = catalog.types.find((type) => type.type === "usecase")!.cases;
  expect(cases).toHaveLength(24);
  for (const example of cases) {
    const parsed = parseUsecase(example.source);
    expect(parsed?.kind, example.id).toBe("usecase");
    if (parsed?.kind !== "usecase") continue;
    const ids = new Set(parsed.ir.nodes.map((node) => node.id));
    for (const edge of parsed.ir.edges) {
      expect(ids.has(edge.from), `${example.id}: ${edge.from}`).toBe(true);
      expect(ids.has(edge.to), `${example.id}: ${edge.to}`).toBe(true);
    }
  }
});

test("complete example preserves business actors, boundaries, notes and edge animation", () => {
  const example = catalog.types.find((type) => type.type === "usecase")!.cases[22];
  const parsed = parseUsecase(example.source);
  expect(parsed?.kind).toBe("usecase");
  if (parsed?.kind !== "usecase") return;
  expect(parsed.ir.nodes.find((node) => node.id === "Staff")?.metadata).toMatchObject({
    role: "actor",
    type: "hollow",
    business: true,
    stereotype: "Employee",
  });
  expect(parsed.ir.nodes.find((node) => node.id === "Checkout")?.parent).toBe("ordering");
  expect(parsed.ir.data?.notes).toEqual([
    { target: "Checkout", text: "Validates the **cart** before payment", labelType: "markdown" },
  ]);
  expect(parsed.ir.edges.find((edge) => edge.id === "starts")).toMatchObject({
    label: "places order",
    minLength: 2,
    metadata: { animation: "fast" },
  });
  expect(parsed.ir.edges.find((edge) => edge.id === "pays")).toMatchObject({
    label: "«include»",
    dashed: true,
    style: { stroke: "#6b46c1", strokeWidth: 2 },
  });
  expect(parsed.ir.nodes.find((node) => node.id === "OrderData")?.metadata?.data).toEqual({
    status: "pending",
    items: [{ name: "Book", quantity: 1 }],
    total: 29.95,
  });
});

test("association terminals distinguish arrow, circle, cross and generalization", () => {
  const parsed = parseUsecase("usecase-beta\nactor User\nUser --o A\nA x-- User\nUser --|> A\n");
  expect(parsed?.kind).toBe("usecase");
  if (parsed?.kind !== "usecase") return;
  expect(parsed.ir.edges.map((edge) => [edge.start, edge.end])).toEqual([
    ["none", "circle"],
    ["cross", "none"],
    ["none", "hollow-triangle"],
  ]);
});

test("invalid statements and unclosed boundaries return explicit syntax errors", () => {
  expect(parseUsecase('pie\n"A": 3\n')).toBeUndefined();
  expect(parseUsecase("usecase-beta\nsystemBoundary Store\nA\n")?.kind).toBe("error");
  expect(parseUsecase("usecase-beta\nunsupported command\n")?.kind).toBe("error");
  expect(parseUsecase("usecase-beta\nA@{type: x, type: y}\n")?.kind).toBe("error");
});

test("JSON table rows keep source order and boundary updates do not create nodes", () => {
  const json = catalog.types.find((type) => type.type === "usecase")!.cases[16];
  const parsed = parseUsecase(json.source);
  if (parsed?.kind !== "usecase") throw new Error("Expected use-case data table");
  const entries = parsed.ir.nodes.find((node) => node.id === "Payload")?.metadata
    ?.dataEntries as UsecaseJsonRow[];
  expect(entries.slice(0, 2)).toEqual([
    { key: "2", accessibleKey: "2", value: "second in source" },
    { key: "1", accessibleKey: "1", value: "first after 2" },
  ]);
  expect(entries.find((entry) => entry.key === "emptyObject")?.value).toEqual("{}");
  expect(entries.find((entry) => entry.key === "emptyArray")?.value).toEqual("[]");
  const boundary = parseUsecase(
    'usecase-beta\nsystemBoundary "Payment service"\nA\nend\nPayment_service@{type: package}\n',
  );
  if (boundary?.kind !== "usecase") throw new Error("Expected use-case boundary");
  expect(boundary.ir.nodes.map((node) => node.id)).toEqual(["A"]);
  expect(boundary.ir.data?.boundaries).toMatchObject({ Payment_service: { type: "package" } });
});

test("plain labels keep literal emphasis markers while explicit backtick strings carry markdown semantics", () => {
  const cases = catalog.types.find((type) => type.type === "usecase")!.cases;
  const plain = parseUsecase(cases[6].source);
  const markdown = parseUsecase(cases[7].source);
  if (plain?.kind !== "usecase" || markdown?.kind !== "usecase")
    throw new Error("Expected label examples");
  expect(plain.ir.nodes.find((node) => node.id === "Literal")).toMatchObject({
    label: "**Literal markers**",
    metadata: { labelType: "text" },
  });
  expect(plain.ir.nodes.find((node) => node.id === "Analyst")).toMatchObject({
    label: "*Analyst*",
    metadata: { labelType: "text" },
  });
  expect(markdown.ir.nodes.find((node) => node.id === "Literal")).toMatchObject({
    label: "**Literal markers**",
    metadata: { labelType: "text" },
  });
  expect(markdown.ir.nodes.find((node) => node.id === "Reviewer")).toMatchObject({
    label: "*Reviewer*",
    metadata: { labelType: "markdown" },
  });
  expect(markdown.ir.nodes.find((node) => node.id === "Formatted")).toMatchObject({
    label: "**Formatted label**\nwith a physical line break",
    metadata: { labelType: "markdown" },
  });
  expect(markdown.ir.edges[0]).toMatchObject({
    label: "opens **form**",
    metadata: { labelType: "markdown" },
  });
});

test("JSON tables flatten nested rows with source order, scalar arrays and strict JSON validation", () => {
  const parsed = parseUsecase(
    'usecase-beta\njson Data@{ "outer": { "2": "two", "1": "one" }, "items": [{ "name": "Book", "quantity": 1 }], "colors": ["Red", "Green"], "nil": null }\n',
  );
  if (parsed?.kind !== "usecase") throw new Error("Expected flattened JSON");
  expect(parsed.ir.nodes[0].metadata?.dataEntries).toEqual([
    { key: "outer.2", accessibleKey: "outer.2", value: "two" },
    { key: "outer.1", accessibleKey: "outer.1", value: "one" },
    { key: "items[0].name", accessibleKey: "items[0].name", value: "Book" },
    { key: "items[0].quantity", accessibleKey: "items[0].quantity", value: "1" },
    { key: "colors", accessibleKey: "colors", value: "Red" },
    { key: "", accessibleKey: "colors", value: "Green" },
    { key: "nil", accessibleKey: "nil", value: "null" },
  ]);
  expect(parseUsecase("usecase-beta\njson Data@{ active: true }\n")?.kind).toBe("error");
});

test("init directives merge with front matter without exposing directives to usecase grammar", () => {
  const parsed = parseUsecase(
    '---\nconfig:\n  usecase:\n    rankSpacing: 70\n---\n%%{init: {"usecase": {"nodeSpacing": 60}}}%%\nusecase-beta\nactor Customer\n',
  );
  if (parsed?.kind !== "usecase") throw new Error("Expected metadata configuration");
  expect(parsed.ir.data?.config).toMatchObject({ usecase: { nodeSpacing: 60, rankSpacing: 70 } });
});
