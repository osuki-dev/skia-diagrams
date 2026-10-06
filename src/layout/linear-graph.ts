import type { Graph, GraphLabel, NodeLabel, EdgeLabel } from "@dagrejs/dagre";

/** A directed path needs no recursive ranking or crossing minimization. Dagre's
 * DFS grows with the path (including dummy ranks) and exhausts Hermes' native
 * stack for legal 300-node diagrams. Preserve its straight, unlabeled geometry
 * with an iterative pass; leave branched, cyclic and labeled graphs to Dagre. */
export function layoutLinearGraph(graph: Graph<GraphLabel, NodeLabel, EdgeLabel>): boolean {
  const nodes = graph.nodes();
  if (nodes.length < 2 || graph.edgeCount() !== nodes.length - 1) return false;
  const sources = graph.sources();
  if (sources.length !== 1) return false;
  const path: string[] = [];
  let current: string | undefined = sources[0];
  while (current !== undefined && path.length < nodes.length) {
    path.push(current);
    const edges = graph.outEdges(current) ?? [];
    if (edges.length > 1) return false;
    const edge = edges[0];
    if (edge) {
      const label = graph.edge(edge);
      if (label.width || label.height || (label.minlen ?? 1) < 1) return false;
    }
    current = edge?.w;
  }
  if (current !== undefined || path.length !== nodes.length) return false;

  const settings = graph.graph();
  const direction = (settings.rankdir ?? "TB").toUpperCase();
  const horizontal = direction === "LR" || direction === "RL";
  const reverse = direction === "BT" || direction === "RL";
  const margin = horizontal ? (settings.marginx ?? 0) : (settings.marginy ?? 0);
  const crossMargin = horizontal ? (settings.marginy ?? 0) : (settings.marginx ?? 0);
  const separation = settings.ranksep ?? 50;
  const crossSize = path.reduce(
    (maximum, id) => Math.max(maximum, horizontal ? graph.node(id).height! : graph.node(id).width!),
    0,
  );
  const cross = crossMargin + crossSize / 2;
  let extent = margin;
  let rank = 0;
  for (const [index, id] of path.entries()) {
    const node = graph.node(id);
    const size = horizontal ? node.width! : node.height!;
    node.x = horizontal ? extent + size / 2 : cross;
    node.y = horizontal ? cross : extent + size / 2;
    node.rank = rank;
    node.order = 0;
    extent += size;
    if (index < path.length - 1) {
      const edge = graph.edge(graph.outEdges(id)![0]);
      const length = edge.minlen ?? 1;
      extent += separation * length;
      rank += length * 2;
    }
  }
  extent += margin;
  settings.width = horizontal ? extent : crossSize + crossMargin * 2;
  settings.height = horizontal ? crossSize + crossMargin * 2 : extent;
  if (reverse) {
    for (const id of path) {
      const node = graph.node(id);
      if (horizontal) node.x = extent - node.x!;
      else node.y = extent - node.y!;
    }
  }
  for (const edge of graph.edges()) {
    const from = graph.node(edge.v),
      to = graph.node(edge.w);
    const sign = reverse ? -1 : 1;
    const start = horizontal
      ? from.x! + (sign * from.width!) / 2
      : from.y! + (sign * from.height!) / 2;
    const end = horizontal ? to.x! - (sign * to.width!) / 2 : to.y! - (sign * to.height!) / 2;
    const label = graph.edge(edge);
    const steps = (label.minlen ?? 1) * 2;
    label.points = Array.from({ length: steps + 1 }, (_, index) => {
      const position = start + ((end - start) * index) / steps;
      return horizontal ? { x: position, y: cross } : { x: cross, y: position };
    });
  }
  return true;
}
