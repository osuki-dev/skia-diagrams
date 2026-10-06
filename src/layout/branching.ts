import type { DiagramIR } from "../types.ts";

/** Closed sibling handoffs share a decision rank but keep their authored edges.
 * Outgoing work beyond the sibling group requires ordinary Dagre ranks. */
export function terminalBranchHandoffs(ir: DiagramIR): Set<number> {
  if (ir.direction !== "TB" || ir.clusters.length) return new Set();
  const decisions = new Set(
    ir.nodes.filter((node) => node.shape === "diamond").map((node) => node.id),
  );
  const incoming = new Map<string, Set<string>>();
  for (const edge of ir.edges) {
    if (!decisions.has(edge.from)) continue;
    const parents = incoming.get(edge.to) ?? new Set<string>();
    parents.add(edge.from);
    incoming.set(edge.to, parents);
  }
  const candidates = new Set<number>();
  for (const [index, edge] of ir.edges.entries()) {
    if (edge.from === edge.to) continue;
    const from = incoming.get(edge.from),
      to = incoming.get(edge.to);
    if (from && to && [...from].some((parent) => to.has(parent))) candidates.add(index);
  }
  const continued = new Set(
    ir.edges.filter((_, index) => !candidates.has(index)).map((edge) => edge.from),
  );
  return new Set(
    [...candidates].filter(
      (index) => !continued.has(ir.edges[index].from) && !continued.has(ir.edges[index].to),
    ),
  );
}
