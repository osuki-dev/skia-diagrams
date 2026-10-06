import { expect, test } from "bun:test";
import { officialCatalog } from "../example/official-fixtures.ts";
import { parseDiagram } from "../src/index.ts";

test("official fixtures retain original source, canonical names and pinned provenance", async () => {
  const archived = await Bun.file("test/fixtures/official-mermaid/catalog.json").json();
  expect(officialCatalog).toEqual(archived);
  expect(officialCatalog.types).toHaveLength(31);
  const ids = new Set<string>();
  for (const type of officialCatalog.types) {
    expect(type.url).toContain(officialCatalog.revision);
    for (const example of type.cases) {
      expect(ids.has(example.id)).toBe(false);
      ids.add(example.id);
      expect(new Bun.CryptoHasher("sha256").update(example.source).digest("hex")).toBe(
        example.sha256,
      );
      expect(example.cjk as boolean).toBe(/[\u3400-\u9fff]/.test(example.source));
    }
  }
  expect(ids.size).toBe(511);
});
test("official front matter and current XY keyword parse without rewriting the example", () => {
  const flow = officialCatalog.types.find((type) => type.type === "flowchart")!.cases[0];
  expect(parseDiagram(flow.source)).toMatchObject({ kind: "flowchart", ir: { title: "Node" } });
  const xy = officialCatalog.types.find((type) => type.type === "xyChart")!.cases[0];
  expect(parseDiagram(xy.source).kind).toBe("xychart");
  expect(parseDiagram("---\ntitle: [bad]\n---\nflowchart TD\nA-->B").kind).toBe("error");
});
