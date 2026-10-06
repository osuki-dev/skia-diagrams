import type { DiagramIR, LayoutOptions, TextMeasurer } from "../types.ts";
import type { LayoutGraph, LayoutGraphDescriptor, LayoutGraphEdge } from "./graph.ts";

/** A narrow reading layout preserves every graph edge while stacking table cards.
 * Each compound remains a real nested frame; routing uses a reserved outer lane. */
export function compactTableGraph(
  ir: DiagramIR,
  sizes: Map<string, { width: number; height: number }>,
  measure: TextMeasurer,
  options: LayoutOptions,
  ranked: LayoutGraph,
  distributePorts = false,
): LayoutGraph {
  sizes = new Map(sizes);
  type Descriptor = LayoutGraphDescriptor;
  type Route = LayoutGraphEdge;
  const positions = new Map<string, { width: number; height: number; x: number; y: number }>();
  const routes = new Map<string, { descriptor: Descriptor; route: Route }>();
  const routeKey = (descriptor: Descriptor) =>
    JSON.stringify([descriptor.v, descriptor.w, descriptor.name]);
  const graph: LayoutGraph = {
    node: (id: string) => positions.get(id)!,
    nodes: () => [...positions.keys()],
    edges: () => [...routes.values()].map((item) => item.descriptor),
    outEdges: (from: string, to?: string) =>
      [...routes.values()]
        .map((item) => item.descriptor)
        .filter((edge) => edge.v === from && (to === undefined || edge.w === to)),
    removeEdge: (descriptor: Descriptor) => {
      routes.delete(routeKey(descriptor));
    },
    setEdge: (from: string, to: string, label: LayoutGraphEdge, name?: string) => {
      const descriptor = { v: from, w: to, name };
      routes.set(routeKey(descriptor), { descriptor, route: label });
    },
    edge: (descriptor: Descriptor) => {
      const item = routes.get(routeKey(descriptor));
      if (!item) throw new Error(`Unknown compact graph edge: ${descriptor.v} -> ${descriptor.w}`);
      return item.route;
    },
  };
  const fontSize = options.fontSize ?? 14,
    padding = options.padding ?? 20;
  const all = [...ir.nodes, ...ir.clusters];
  const children = new Map<string | undefined, typeof all>();
  for (const node of all) {
    const siblings = children.get(node.parent) ?? [];
    siblings.push(node);
    children.set(node.parent, siblings);
  }
  const clusters = new Map(ir.clusters.map((cluster) => [cluster.id, cluster]));
  const layouts = new Map<
    string | undefined,
    { width: number; height: number; title: number; gap: number; children: typeof all }
  >();
  const solve = (parent?: string): { width: number; height: number } => {
    const siblings = [...(children.get(parent) ?? [])];
    const direction = clusters.get(parent ?? "")?.direction ?? ir.direction;
    const horizontal = direction === "LR" || direction === "RL";
    siblings.sort((a, b) => {
      const av = ranked.node(a.id),
        bv = ranked.node(b.id);
      return horizontal ? av.x - bv.x || av.y - bv.y : av.y - bv.y || av.x - bv.x;
    });
    for (const node of siblings) if (clusters.has(node.id)) sizes.set(node.id, solve(node.id));
    const inset = parent ? 8 : padding;
    const width = Math.max(80, ...siblings.map((node) => sizes.get(node.id)!.width)) + inset * 2;
    const title = parent
      ? measure(clusters.get(parent)!.label, {
          fontSize: fontSize * (options.headerScale ?? 1.08),
          fontWeight: 600,
          maxWidth: width - inset * 2,
        }).height + 16
      : 0;
    const outgoingLabels = new Map<string, number>();
    for (const edge of ir.edges)
      if (edge.label)
        outgoingLabels.set(
          edge.from,
          (outgoingLabels.get(edge.from) ?? 0) +
            measure(edge.label, { fontSize, maxWidth: width - inset * 2 }).height +
            12,
        );
    const gap = Math.max(
      options.rankSeparation ?? fontSize * 3.2,
      ...[...outgoingLabels.values()].map((height) => height + 12),
      ...ir.edges.map(
        (edge) => measure(edge.label, { fontSize, maxWidth: width - inset * 2 }).height + 20,
      ),
    );
    const height =
      title +
      inset * 2 +
      siblings.reduce((sum, node) => sum + sizes.get(node.id)!.height, 0) +
      Math.max(0, siblings.length - 1) * gap;
    layouts.set(parent, { width, height, title, gap, children: siblings });
    return { width, height };
  };
  const root = solve();
  const place = (parent: string | undefined, left: number, top: number) => {
    const layout = layouts.get(parent)!;
    let cursor = top + (parent ? 8 : padding) + layout.title;
    for (const node of layout.children) {
      const size = sizes.get(node.id)!;
      positions.set(node.id, { ...size, x: left + layout.width / 2, y: cursor + size.height / 2 });
      if (clusters.has(node.id)) place(node.id, left + (layout.width - size.width) / 2, cursor);
      cursor += size.height + layout.gap;
    }
  };
  place(undefined, 0, 0);
  const ports = new Map<string, string[]>();
  for (const [index, edge] of ir.edges.entries())
    for (const [end, id] of [
      ["from", edge.from],
      ["to", edge.to],
    ] as const) {
      const list = ports.get(id) ?? [];
      list.push(`${index}:${end}`);
      ports.set(id, list);
    }
  const port = (id: string, key: string) => {
    const node = graph.node(id),
      list = ports.get(id)!;
    const available = Math.max(0, node.height / 2 - fontSize * 0.65);
    const y =
      !distributePorts || list.length === 1
        ? node.y
        : node.y - available + (2 * available * list.indexOf(key)) / (list.length - 1);
    const radius = Math.min(options.radius ?? 8, node.width / 2, node.height / 2);
    const cornerY = Math.max(0, Math.abs(y - node.y) - (node.height / 2 - radius));
    const x =
      node.x +
      node.width / 2 -
      radius +
      Math.sqrt(Math.max(0, radius * radius - cornerY * cornerY));
    return { x: distributePorts ? x : node.x, y };
  };
  const captionOffsets = new Map<string, number>();
  const lanes: { from: number; to: number; lane: number }[] = [];
  for (const [index, edge] of ir.edges.entries()) {
    const from = graph.node(edge.from),
      to = graph.node(edge.to);
    const lower = Math.min(from.y, to.y),
      upper = Math.max(from.y, to.y);
    let laneIndex = 0;
    while (lanes.some((lane) => lane.lane === laneIndex && lane.from <= upper && lane.to >= lower))
      laneIndex++;
    lanes.push({ from: lower, to: upper, lane: laneIndex });
    const lane = root.width - Math.max(4, padding / 2) + laneIndex * Math.max(6, fontSize * 0.4);
    const label = measure(edge.label, { fontSize, maxWidth: root.width - padding * 2 });
    const fromPort = port(edge.from, `${index}:from`),
      toPort = port(edge.to, `${index}:to`);
    const captionOffset = captionOffsets.get(edge.from) ?? 0;
    if (edge.label) captionOffsets.set(edge.from, captionOffset + label.height + 12);
    graph.setEdge(
      edge.from,
      edge.to,
      {
        points:
          edge.from === edge.to
            ? [
                { x: from.x, y: from.y - from.height / 4 },
                { x: lane, y: from.y - from.height / 4 },
                { x: lane, y: from.y + from.height / 4 },
                { x: from.x, y: from.y + from.height / 4 },
              ]
            : [fromPort, { x: lane, y: fromPort.y }, { x: lane, y: toPort.y }, toPort],
        x: root.width / 2,
        y: from.y + from.height / 2 + 10 + captionOffset + label.height / 2,
      },
      String(index),
    );
  }
  return graph;
}
