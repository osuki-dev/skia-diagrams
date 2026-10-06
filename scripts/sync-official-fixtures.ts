/** Download only official fenced examples; never rewrite source to make a test pass. */
const revision = "97b345154f2cd71f23a2aadb14af6dad46f63173";
const definitions = [
  ["flowchart", "Flowchart"],
  ["swimlanes", "Swimlanes Diagram"],
  ["sequenceDiagram", "Sequence Diagram"],
  ["classDiagram", "Class Diagram"],
  ["stateDiagram", "State Diagram"],
  ["entityRelationshipDiagram", "Entity Relationship Diagram"],
  ["userJourney", "User Journey"],
  ["gantt", "Gantt"],
  ["pie", "Pie Chart"],
  ["quadrantChart", "Quadrant Chart"],
  ["requirementDiagram", "Requirement Diagram"],
  ["usecase", "Use Case Diagram"],
  ["gitgraph", "GitGraph (Git) Diagram"],
  ["c4", "C4 Diagram"],
  ["mindmap", "Mindmaps"],
  ["timeline", "Timeline"],
  ["zenuml", "ZenUML"],
  ["sankey", "Sankey"],
  ["xyChart", "XY Chart"],
  ["block", "Block Diagram"],
  ["packet", "Packet"],
  ["kanban", "Kanban"],
  ["architecture", "Architecture"],
  ["radar", "Radar"],
  ["eventmodeling", "Event Modeling"],
  ["treemap", "Treemap"],
  ["venn", "Venn"],
  ["ishikawa", "Ishikawa"],
  ["wardley", "Wardley"],
  ["cynefin", "Cynefin"],
  ["treeView", "TreeView"],
] as const;
const results = await Promise.allSettled(
  definitions.map(async ([type, name]) => {
    const url = `https://raw.githubusercontent.com/mermaid-js/mermaid/${revision}/packages/mermaid/src/docs/syntax/${type}.md`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${type}: HTTP ${response.status}`);
    const document = await response.text();
    const examples = [...document.matchAll(/^```mermaid(?:-example)?[^\n]*\n([\s\S]*?)^```/gm)];
    if (!examples.length) throw new Error(`${type}: no official examples`);
    return {
      type,
      name,
      documentation: `https://mermaid.js.org/syntax/${type}.html`,
      url,
      cases: examples.map((example, index) => {
        const headings = [...document.slice(0, example.index).matchAll(/^#{1,6}\s+(.+)$/gm)];
        const title = headings.at(-1)?.[1] ?? name;
        const source = example[1].trimEnd() + "\n";
        return {
          id: `${type}/${String(index + 1).padStart(3, "0")}`,
          title,
          source,
          sha256: new Bun.CryptoHasher("sha256").update(source).digest("hex"),
          cjk: /[\u3400-\u9fff]/.test(source),
        };
      }),
    };
  }),
);
const errors = results.filter((result) => result.status === "rejected");
if (errors.length)
  throw new AggregateError(
    errors.map((result) => result.reason),
    "Official fixture download failed; existing catalog was not replaced",
  );
const types = results.map((result) => {
  if (result.status !== "fulfilled") throw result.reason;
  return result.value;
});
const catalog = { version: "12.1.0", revision, types };
await Bun.write(
  "test/fixtures/official-mermaid/catalog.json",
  JSON.stringify(catalog, null, 2) + "\n",
);
await Bun.write(
  "example/official-fixtures.ts",
  `/** Generated from Mermaid 12.1.0 official docs at ${revision}.\n * Run bun scripts/sync-official-fixtures.ts to update; preserve source exactly. */\nexport const officialCatalog = ${JSON.stringify(catalog, null, 2)} as const;\n`,
);
console.log(
  `Saved ${types.length} official types and ${types.reduce((sum, type) => sum + type.cases.length, 0)} unchanged examples.`,
);
