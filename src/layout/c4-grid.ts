import dagre from "@dagrejs/dagre";
import type { DiagramIR, LayoutOptions, TextMeasurer } from "../types.ts";
/** C4 uses authored-order rows, independently for elements and boundaries. */
export function c4Grid(
  ir: DiagramIR,
  sizes: Map<string, { width: number; height: number }>,
  measure: TextMeasurer,
  options: LayoutOptions,
  configuration: Record<string, string> = {},
) {
  const graph = new dagre.graphlib.Graph({ multigraph: true }).setGraph({});
  const pad = options.padding ?? 20;
  // Relation captions need a clear gutter between cards and boundary headers.
  let gap = options.nodeSeparation ?? 36;
  for (const edge of ir.edges)
    if (edge.label)
      gap = Math.max(
        gap,
        measure(edge.label, { fontSize: options.fontSize ?? 14, literal: true }).height + 32,
      );
  const columns = (key: string, fallback: number) => {
    const n = Number(configuration[key] ?? fallback);
    return Number.isFinite(n) && n >= 1 ? Math.min(300, Math.floor(n)) : fallback;
  };
  const shapeColumns = columns("c4ShapeInRow", 4),
    boundaryColumns = columns("c4BoundaryInRow", 2);
  type Item = {
    id: string;
    width: number;
    height: number;
    x: number;
    y: number;
    children?: Item[];
  };
  const solve = (
    parent?: string,
    ancestors = new Set<string>(),
  ): { width: number; height: number; items: Item[] } => {
    if (parent && ancestors.has(parent)) throw new Error("Cyclic C4 boundary");
    const visited = new Set(ancestors);
    if (parent) visited.add(parent);
    const items: Item[] = [];
    let y = pad,
      maxX = pad;
    const rows = (entries: Item[], count: number) => {
      for (let start = 0; start < entries.length; start += count) {
        const row = entries.slice(start, start + count),
          height = Math.max(...row.map((item) => item.height));
        let x = pad;
        for (const item of row) {
          item.x = x;
          item.y = y;
          items.push(item);
          x += item.width + gap;
        }
        maxX = Math.max(maxX, x - gap);
        y += height + gap;
      }
    };
    rows(
      ir.nodes
        .filter((n) => n.parent === parent)
        .map((n) => ({ id: n.id, ...sizes.get(n.id)!, x: 0, y: 0 })),
      shapeColumns,
    );
    rows(
      ir.clusters
        .filter((c) => c.parent === parent)
        .map((c) => {
          const nested = solve(c.id, visited),
            header = measure(c.label, {
              fontSize: options.fontSize ?? 14,
              fontWeight: 600,
              maxWidth: nested.width - 24,
            });
          return {
            id: c.id,
            width: Math.max(nested.width, header.width + pad * 2),
            height: nested.height + header.height + 20,
            x: 0,
            y: 0,
            children: nested.items.map((item) => ({ ...item, y: item.y + header.height + 20 })),
          };
        }),
      boundaryColumns,
    );
    return { width: Math.max(80, maxX + pad), height: Math.max(60, y - gap + pad), items };
  };
  const solved = solve();
  const place = (items: Item[], dx: number, dy: number) => {
    for (const item of items) {
      graph.setNode(item.id, {
        x: dx + item.x + item.width / 2,
        y: dy + item.y + item.height / 2,
        width: item.width,
        height: item.height,
      });
      if (item.children) place(item.children, dx + item.x, dy + item.y);
    }
  };
  place(solved.items, 0, 0);
  graph.setGraph({ width: solved.width, height: solved.height });
  for (const [index, edge] of ir.edges.entries()) {
    const f = graph.node(edge.from),
      t = graph.node(edge.to);
    graph.setEdge(
      edge.from,
      edge.to,
      {
        points: [
          { x: f.x, y: f.y },
          { x: t.x, y: t.y },
        ],
        x: (f.x + t.x) / 2,
        y: (f.y + t.y) / 2,
      },
      String(index),
    );
  }
  return graph;
}
