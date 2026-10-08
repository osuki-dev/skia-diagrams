import { describe, expect, test } from "bun:test";
import catalog from "./fixtures/official-mermaid/catalog.json" with { type: "json" };
import { emptyIR } from "../src/parse/common.ts";
import { parseFlowchart } from "../src/parse/flowchart.ts";

function parse(source: string) {
  const ir = emptyIR();
  parseFlowchart(ir, source.replace(/^---\n[\s\S]*?\n---\n/, ""));
  return ir;
}

describe("official flowchart syntax", () => {
  test("Unicode and multiword subgraph titles retain their full text and nesting", () => {
    const ir = parse(`graph TD
subgraph 方案2: 插件自治归属
subgraph 组一["标题 (推荐)"]
A --> B
end
end
subgraph My group
C --> D
end
组一 --> C`);
    expect(ir.clusters.map((group) => group.label)).toEqual([
      "方案2: 插件自治归属",
      "标题 (推荐)",
      "My group",
    ]);
    expect(ir.clusters[1].parent).toBe(ir.clusters[0].id);
    expect(ir.nodes.find((node) => node.id === "A")?.parent).toBe("组一");
    expect(ir.edges.at(-1)?.from).toBe("组一");
    expect(() => parse("graph TD\nsubgraph 方案1: 资源(推荐)\nA-->B\nend")).toThrow(
      "quote special characters",
    );
  });

  test("all archived official examples are accepted by the flowchart grammar", () => {
    const cases = catalog.types.find((type) => type.type === "flowchart")!.cases;
    expect(cases).toHaveLength(114);
    for (const example of cases) {
      const ir = parse(example.source);
      expect(ir.nodes.length + ir.clusters.length).toBeGreaterThan(0);
      const ids = new Set([...ir.nodes, ...ir.clusters].map((node) => node.id));
      for (const edge of ir.edges) {
        expect(ids.has(edge.from)).toBe(true);
        expect(ids.has(edge.to)).toBe(true);
      }
    }
  });

  test("modern properties preserve shape, label and host-owned assets", () => {
    const ir = parse(`flowchart LR
A@{ shape: manual-file, label: "Records" }
B@{ icon: "fa:user", form: "square", h: 60 }
C@{ img: "https://mermaid.js.org/favicon.svg", constraint: "on" }
A --> B --> C`);
    expect(ir.nodes[0]).toMatchObject({ shape: "flip-tri", label: "Records" });
    expect(ir.nodes[1]).toMatchObject({ metadata: { icon: "fa:user", form: "square", h: 60 } });
    expect(ir.nodes[2]).toMatchObject({
      metadata: { img: "https://mermaid.js.org/favicon.svg", constraint: "on" },
    });
  });

  test("edge IDs refer to edges without producing phantom nodes", () => {
    const ir = parse(`flowchart LR
A --> B e2@==> C
A e1@--> C
e1@{ animate: true, animation: fast, curve: linear }
classDef animated animation: dash 25s linear infinite
class e2 animated`);
    expect(ir.nodes.map((node) => node.id)).toEqual(["A", "B", "C"]);
    expect(ir.edges[0]).not.toHaveProperty("id");
    expect(ir.edges[1]).toMatchObject({
      id: "e2",
      thick: true,
      metadata: { animationStyle: "animation: dash 25s linear infinite" },
    });
    expect(ir.edges[2]).toMatchObject({
      id: "e1",
      metadata: { animate: true, animation: "fast", curve: "linear" },
    });
  });

  test("invisible constraints and collapsed groups remain semantic", () => {
    const ir = parse(`flowchart TD
subgraph group [My group]
A ~~~ B
end
group@{ view: collapsed }
style group fill:#fff
linkStyle 0 stroke-width:2px`);
    expect(ir.nodes).toHaveLength(2);
    expect(ir.clusters[0]).toMatchObject({
      metadata: { view: "collapsed" },
      style: { fill: "#fff" },
    });
    expect(ir.edges[0]).toMatchObject({ metadata: { invisible: true } });
  });

  test("callbacks and links are retained as declarative interaction data", () => {
    const ir = parse(`flowchart LR
A --> B
click A call selected() "Select a node"
click B href "https://example.com" "Read more" _blank`);
    expect(ir.nodes[0]).toMatchObject({
      metadata: {
        interaction: { type: "callback", callback: "selected", tooltip: "Select a node" },
      },
    });
    expect(ir.nodes[1]).toMatchObject({
      metadata: {
        interaction: {
          type: "link",
          href: "https://example.com",
          tooltip: "Read more",
          target: "_blank",
        },
      },
    });
  });

  test("unknown modern shapes are reported instead of rendered as rectangles", () => {
    expect(() => parse("flowchart LR\nA@{shape: invented}")).toThrow("Unknown node shape");
  });
});

test("start-only circle and cross markers survive unlabeled and labeled arrows", () => {
  const ir = parse(
    "flowchart LR\nA o--> B\nB x-.-> C\nC o-- labeled --> D\nD x--|cross label| E\nE e1@o-. note .-> F",
  );
  expect(ir.edges.map((edge) => [edge.start, edge.end, edge.dashed, edge.label])).toEqual([
    ["circle", "arrow", false, ""],
    ["cross", "arrow", true, ""],
    ["circle", "arrow", false, "labeled"],
    ["cross", "none", false, "cross label"],
    ["circle", "arrow", true, "note"],
  ]);
  expect(ir.edges.at(-1)?.id).toBe("e1");
});

test("flowchart click metadata also uses the typed native interaction contract", () => {
  const ir = parse(
    'flowchart LR\nA-->B\nclick A href "https://mermaid.js.org" "Open docs"\nclick B call selected() "Select"',
  );
  expect(ir.nodes[0].interaction).toEqual({
    kind: "link",
    target: "https://mermaid.js.org",
    tooltip: "Open docs",
  });
  expect(ir.nodes[1].interaction).toEqual({
    kind: "callback",
    target: "selected",
    tooltip: "Select",
  });
});
