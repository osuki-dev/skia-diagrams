import { expect, test } from "bun:test";
import dagre from "@dagrejs/dagre";
import { layoutLinearGraph } from "../src/layout/linear-graph.ts";

function path(direction: string, count: number) {
  const graph = new dagre.graphlib.Graph({ multigraph: true })
    .setGraph({ rankdir: direction, ranksep: 49, nodesep: 35, marginx: 24, marginy: 18 })
    .setDefaultEdgeLabel(() => ({}));
  for (let index = 0; index < count; index++) {
    graph.setNode(String(index), { width: 60 + (index % 4) * 20, height: 30 + (index % 3) * 10 });
    if (index)
      graph.setEdge(
        String(index - 1),
        String(index),
        {
          width: 0,
          height: 0,
          minlen: 1 + (index % 3),
          labelpos: "c",
        },
        String(index),
      );
  }
  return graph;
}

test("iterative path layout preserves Dagre bounds, ranks and routed geometry in every direction", () => {
  for (const direction of ["TD", "TB", "BT", "LR", "RL"]) {
    for (const count of [2, 12, 300]) {
      const actual = path(direction, count),
        expected = path(direction, count);
      expect(layoutLinearGraph(actual)).toBe(true);
      dagre.layout(expected);
      expect(actual.graph()).toEqual(expected.graph());
      for (const id of actual.nodes()) expect(actual.node(id)).toEqual(expected.node(id));
      for (const edge of actual.edges()) expect(actual.edge(edge)).toEqual(expected.edge(edge));
    }
  }
});

test("branched, labeled, cyclic and disconnected graphs retain the general layout", () => {
  const branch = path("TB", 3);
  branch.setEdge("0", "2", {});
  const labeled = path("LR", 3);
  labeled.edge(labeled.edges()[0]).width = 40;
  const cyclic = path("TB", 3);
  cyclic.setEdge("2", "0", {});
  const disconnected = path("TB", 3);
  disconnected.setNode("detached", { width: 50, height: 30 });
  for (const graph of [branch, labeled, cyclic, disconnected])
    expect(layoutLinearGraph(graph)).toBe(false);
});
