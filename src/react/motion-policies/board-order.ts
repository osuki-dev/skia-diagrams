import type { Primitive, Scene } from "../../types.ts";

/** Iterative SCC condensation and longest-path ranks keep merges after every incoming branch. */
export function boardFlowRanks(scene: Scene): Map<string, number> {
  const ids = [
    ...new Set(
      scene.primitives.flatMap((p) => (p.semantic?.kind === "node" ? [p.semantic.id] : [])),
    ),
  ];
  const adjacency = new Map(ids.map((id) => [id, new Set<string>()])),
    reverse = new Map(ids.map((id) => [id, new Set<string>()]));
  for (const p of scene.primitives) {
    const edge = p.semantic;
    if (
      edge?.kind !== "edge" ||
      !edge.from ||
      !edge.to ||
      !adjacency.has(edge.from) ||
      !adjacency.has(edge.to)
    )
      continue;
    adjacency.get(edge.from)!.add(edge.to);
    reverse.get(edge.to)!.add(edge.from);
  }
  // Kosaraju uses explicit DFS frames so deep host graphs cannot overflow the JS stack.
  const successors = new Map([...adjacency].map(([id, next]) => [id, [...next]])),
    visited = new Set<string>(),
    order: string[] = [];
  for (const seed of ids) {
    if (visited.has(seed)) continue;
    visited.add(seed);
    const stack = [{ id: seed, cursor: 0 }];
    while (stack.length) {
      const frame = stack.at(-1)!,
        next = successors.get(frame.id)!;
      if (frame.cursor === next.length) {
        order.push(frame.id);
        stack.pop();
        continue;
      }
      const target = next[frame.cursor++];
      if (!visited.has(target)) {
        visited.add(target);
        stack.push({ id: target, cursor: 0 });
      }
    }
  }
  const component = new Map<string, number>();
  let count = 0;
  for (let index = order.length - 1; index >= 0; index--) {
    const seed = order[index];
    if (component.has(seed)) continue;
    component.set(seed, count);
    const stack = [seed];
    while (stack.length) {
      const id = stack.pop()!;
      for (const target of reverse.get(id)!)
        if (!component.has(target)) {
          component.set(target, count);
          stack.push(target);
        }
    }
    count++;
  }
  const outgoing = Array.from({ length: count }, () => new Set<number>()),
    indegrees = Array<number>(count).fill(0),
    ranks = Array<number>(count).fill(0);
  for (const [id, next] of adjacency)
    for (const target of next) {
      const from = component.get(id)!,
        to = component.get(target)!;
      if (from === to || outgoing[from].has(to)) continue;
      outgoing[from].add(to);
      indegrees[to]++;
    }
  const queue = indegrees.flatMap((degree, index) => (degree === 0 ? [index] : []));
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const from = queue[cursor];
    for (const to of outgoing[from]) {
      ranks[to] = Math.max(ranks[to], ranks[from] + 1);
      if (--indegrees[to] === 0) queue.push(to);
    }
  }
  return new Map(ids.map((id) => [id, ranks[component.get(id)!]]));
}
export function boardFlowPhases(scene: Scene, count: number): Map<string, number> {
  const ranks = boardFlowRanks(scene),
    maximum = Math.max(1, ...ranks.values());
  return new Map(
    [...ranks].map(([id, rank]) => [
      id,
      Math.min(count - 1, Math.floor((rank * (count - 1)) / maximum)),
    ]),
  );
}
export function boardNodePhase(p: Primitive, phases: Map<string, number>): number {
  const semantic = p.semantic;
  return semantic?.kind === "edge"
    ? Math.max(phases.get(semantic.from ?? "") ?? 0, phases.get(semantic.to ?? "") ?? 0)
    : (phases.get(semantic?.id ?? "") ?? 0);
}
