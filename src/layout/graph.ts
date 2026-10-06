import dagre from "@dagrejs/dagre";
import type { Graph, GraphLabel, NodeLabel, EdgeLabel } from "@dagrejs/dagre";
import type { DiagramIR, LayoutOptions, TextMeasurer, Point } from "../types.ts";
import { layoutLinearGraph } from "./linear-graph.ts";

export interface LayoutGraphNode {
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface LayoutGraphEdge {
  points: Point[];
  x: number;
  y: number;
}

export interface LayoutGraphDescriptor {
  v: string;
  w: string;
  name?: string;
}

/** Only operations used by layout consumers; mutation results are deliberately
 * independent of Graphlib's fluent setters or Map's deletion boolean. */
export interface LayoutGraph {
  node(id: string): LayoutGraphNode;
  nodes(): string[];
  edges(): LayoutGraphDescriptor[];
  outEdges(from: string, to?: string): LayoutGraphDescriptor[] | undefined;
  removeEdge(edge: LayoutGraphDescriptor): void;
  setEdge(from: string, to: string, label: LayoutGraphEdge, name?: string): void;
  edge(edge: LayoutGraphDescriptor): LayoutGraphEdge;
}

type RoutedEdge = LayoutGraphEdge & { index?: number };
type PositionedGraph = Graph<GraphLabel, LayoutGraphNode, RoutedEdge>;

/** Lay out each compound level independently: a child cluster is an atomic box
 * to its parent, with its own rank direction and a reserved title band. */
function layoutInternal(
  ir: DiagramIR,
  sizes: Map<string, { width: number; height: number }>,
  measure: TextMeasurer,
  options: LayoutOptions,
  flowchart = false,
) {
  const fontSize = options.fontSize ?? 14,
    padding = options.padding ?? 24;
  const result = new dagre.graphlib.Graph<GraphLabel, LayoutGraphNode, RoutedEdge>({
    multigraph: true,
  }).setGraph({});
  const clustersById = new Map(ir.clusters.map((cluster) => [cluster.id, cluster]));
  const clusterChildren = new Map<string | undefined, typeof ir.clusters>();
  const nodeChildren = new Map<string | undefined, typeof ir.nodes>();
  const parents = new Map([...ir.nodes, ...ir.clusters].map((node) => [node.id, node.parent]));
  for (const cluster of ir.clusters) {
    const children = clusterChildren.get(cluster.parent) ?? [];
    children.push(cluster);
    clusterChildren.set(cluster.parent, children);
    // Validate every component, including cycles disconnected from the root.
    let current: string | undefined = cluster.id;
    const visited = new Set<string>();
    while (current !== undefined) {
      if (visited.has(current)) throw new Error("Cyclic cluster parent");
      if (visited.size >= 64) throw new Error("Cluster nesting exceeds 64 levels");
      visited.add(current);
      if (!clustersById.has(current)) throw new Error("Unknown cluster parent");
      current = parents.get(current);
    }
  }
  for (const node of ir.nodes) {
    if (node.parent !== undefined && !clustersById.has(node.parent))
      throw new Error("Unknown cluster parent");
    const children = nodeChildren.get(node.parent) ?? [];
    children.push(node);
    nodeChildren.set(node.parent, children);
  }
  const ancestry = new Map<string | undefined, Map<string, string | undefined>>();
  const rootChild = (id: string, parent?: string): string | undefined => {
    const cache = ancestry.get(parent) ?? new Map<string, string | undefined>();
    ancestry.set(parent, cache);
    if (cache.has(id)) return cache.get(id);
    let current: string | undefined = id;
    while (current !== undefined && parents.get(current) !== parent) current = parents.get(current);
    cache.set(id, current);
    return current;
  };
  function solve(
    parent?: string,
    inheritedDirection = ir.direction,
  ): { width: number; height: number; graph: PositionedGraph } {
    const cluster = parent === undefined ? undefined : clustersById.get(parent);
    const direction = cluster?.direction ?? inheritedDirection;
    const title = cluster
      ? measure(cluster.label, {
          fontSize: fontSize * Math.max(1, Math.min(1.5, options.headerScale ?? 1.08)),
          fontWeight: 600,
        })
      : { width: 0, height: 0 };
    const titleBand = cluster ? title.height + 16 : 0;
    const inputGraph = new dagre.graphlib.Graph<
      GraphLabel,
      NodeLabel,
      EdgeLabel & { index?: number }
    >({ multigraph: true })
      .setGraph({
        rankdir: direction as GraphLabel["rankdir"],
        nodesep: options.nodeSeparation ?? fontSize * 2.5,
        ranksep: options.rankSeparation ?? fontSize * 3.5,
        marginx: padding,
        marginy: padding,
      })
      .setDefaultEdgeLabel(() => ({}));
    const children = clusterChildren.get(parent) ?? [];
    const nested = new Map(children.map((c) => [c.id, solve(c.id, direction)]));
    for (const node of nodeChildren.get(parent) ?? [])
      inputGraph.setNode(node.id, sizes.get(node.id)!);
    for (const [id, child] of nested)
      inputGraph.setNode(id, { width: child.width, height: child.height });
    for (const [index, edge] of ir.edges.entries()) {
      const from = rootChild(edge.from, parent),
        to = rootChild(edge.to, parent);
      if (!from || !to || (from === to && edge.from !== edge.to)) continue;
      const m = measure(edge.label, { fontSize });
      inputGraph.setEdge(
        from,
        to,
        {
          width:
            edge.label && flowchart
              ? m.width + Math.max(0, options.edgeLabelPaddingX ?? 6) * 2
              : m.width,
          height: edge.label
            ? m.height + (flowchart ? Math.max(0, options.edgeLabelPaddingY ?? 3) * 2 : 8)
            : 0,
          labelpos: "c",
          index,
          minlen: edge.minLength ?? 1,
        },
        String(index),
      );
    }
    // Keep existing small-graph coordinates bit-for-bit (including Dagre's
    // floating-point accumulation); only long paths need the stack-safe pass.
    if (inputGraph.nodeCount() < 64 || !layoutLinearGraph(inputGraph)) dagre.layout(inputGraph);
    // Dagre mutates input labels into positioned nodes and routed edges. Keep
    // that postcondition at this boundary rather than relying on default labels.
    const graph = inputGraph as PositionedGraph;
    const width = Math.max(graph.graph().width ?? 0, title.width + padding * 2, 80);
    const height = Math.max(graph.graph().height ?? 0, 40) + titleBand;
    const shiftX = (width - (graph.graph().width ?? width)) / 2;
    for (const id of graph.nodes()) {
      const node = graph.node(id);
      node.x += shiftX;
      node.y += titleBand;
      const child = nested.get(id);
      if (child) {
        const dx = node.x - child.width / 2,
          dy = node.y - child.height / 2;
        for (const childId of child.graph.nodes()) {
          const n = child.graph.node(childId);
          graph.setNode(childId, { ...n, x: n.x + dx, y: n.y + dy });
        }
        for (const e of child.graph.edges()) {
          const route = child.graph.edge(e);
          graph.setEdge(
            e.v,
            e.w,
            {
              ...route,
              x: (route.x ?? 0) + dx,
              y: (route.y ?? 0) + dy,
              points: route.points.map((p: { x: number; y: number }) => ({
                x: p.x + dx,
                y: p.y + dy,
              })),
            },
            e.name,
          );
        }
      }
    }
    // Routes generated at this level use the original semantic endpoint IDs.
    for (const e of graph.edges()) {
      const route = graph.edge(e);
      if (route.index === undefined) continue;
      const edge = ir.edges[route.index];
      const points = route.points.map((p: { x: number; y: number }) => ({
        x: p.x + shiftX,
        y: p.y + titleBand,
      }));
      graph.removeEdge(e.v, e.w, e.name);
      graph.setEdge(
        edge.from,
        edge.to,
        {
          ...route,
          index: undefined,
          points,
          x: (route.x ?? 0) + shiftX,
          y: (route.y ?? 0) + titleBand,
        },
        e.name,
      );
    }
    return { width, height, graph };
  }
  const solved = solve();
  for (const id of solved.graph.nodes()) result.setNode(id, solved.graph.node(id));
  for (const e of solved.graph.edges()) result.setEdge(e.v, e.w, solved.graph.edge(e), e.name);
  for (const [index, edge] of ir.edges.entries()) {
    if (result.edge({ v: edge.from, w: edge.to, name: String(index) })) continue;
    const from = result.node(edge.from),
      to = result.node(edge.to);
    if (!from || !to) throw new Error("Unknown compound edge endpoint");
    result.setEdge(
      edge.from,
      edge.to,
      {
        points: [
          { x: from.x, y: from.y },
          { x: to.x, y: to.y },
        ],
        x: (from.x + to.x) / 2,
        y: (from.y + to.y) / 2,
      },
      String(index),
    );
  }
  return result;
}

/** Dagre/graphlib use object-backed indexes internally. Keep legal Mermaid IDs
 * such as __proto__ away from those indexes and expose only semantic IDs. */
export function compoundLayout(
  ir: DiagramIR,
  sizes: Map<string, { width: number; height: number }>,
  measure: TextMeasurer,
  options: LayoutOptions,
  flowchart = false,
): LayoutGraph {
  const internal = (id: string) => `diagram:${id}`;
  const semantic = (id: string) => id.slice("diagram:".length);
  const parent = (id: string | undefined) => (id === undefined ? undefined : internal(id));
  const graph = layoutInternal(
    {
      ...ir,
      nodes: ir.nodes.map((node) => ({
        ...node,
        id: internal(node.id),
        parent: parent(node.parent),
      })),
      clusters: ir.clusters.map((cluster) => ({
        ...cluster,
        id: internal(cluster.id),
        parent: parent(cluster.parent),
      })),
      edges: ir.edges.map((edge) => ({
        ...edge,
        from: internal(edge.from),
        to: internal(edge.to),
      })),
    },
    new Map([...sizes].map(([id, size]) => [internal(id), { ...size }])),
    measure,
    options,
    flowchart,
  );
  type Descriptor = LayoutGraphDescriptor;
  const restore = (edge: Descriptor) => ({ ...edge, v: semantic(edge.v), w: semantic(edge.w) });
  return {
    node: (id: string) => graph.node(internal(id)),
    nodes: () => graph.nodes().map(semantic),
    edges: () => graph.edges().map(restore),
    outEdges: (from: string, to?: string): Descriptor[] | undefined =>
      graph.outEdges(internal(from), to === undefined ? undefined : internal(to))?.map(restore),
    removeEdge: (edge: Descriptor) => {
      graph.removeEdge({ ...edge, v: internal(edge.v), w: internal(edge.w) });
    },
    setEdge: (from: string, to: string, label: LayoutGraphEdge, name?: string) => {
      graph.setEdge(internal(from), internal(to), label, name);
    },
    edge: (edge: { v: string; w: string; name?: string }) =>
      graph.edge({ ...edge, v: internal(edge.v), w: internal(edge.w) }),
  };
}
