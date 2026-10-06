import type { DiagramPrimitiveSemantic, Edge, Primitive } from "../types.ts";

/** Authored edge IDs win; unnamed parallel edges get stable endpoint-local ordinals. */
export function edgeSemanticIdentifiers(edges: readonly Edge[]): string[] {
  const counts = new Map<string, number>();
  return edges.map((edge) => {
    const key = JSON.stringify([edge.from, edge.to]);
    const ordinal = counts.get(key) ?? 0;
    counts.set(key, ordinal + 1);
    return edge.id ?? `${encodeURIComponent(edge.from)}->${encodeURIComponent(edge.to)}#${ordinal}`;
  });
}
export function tagPrimitiveRange(
  primitives: Primitive[],
  start: number,
  semantic: DiagramPrimitiveSemantic,
): void {
  for (let index = start; index < primitives.length; index++) {
    const p = primitives[index];
    p.semantic = {
      ...semantic,
      part: p.type === "text" ? "label" : p.type === "image" ? "icon" : "body",
      ...p.semantic,
    };
  }
}
