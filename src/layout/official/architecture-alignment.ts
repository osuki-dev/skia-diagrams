import type { Point } from "../../types.ts";
export interface ArchitectureAlignment {
  direction: "row" | "column";
  members: string[];
}

/** Equality groups plus ordered tracks; longest-path ranks avoid iterative drift. */
export function alignArchitecture(
  positions: Map<string, Point>,
  alignments: ArchitectureAlignment[],
) {
  for (const axis of ["x", "y"] as const) {
    const parent = new Map([...positions.keys()].map((id) => [id, id]));
    const root = (id: string): string => {
      let current = id;
      while (parent.get(current) !== current) current = parent.get(current)!;
      while (id !== current) {
        const next = parent.get(id)!;
        parent.set(id, current);
        id = next;
      }
      return current;
    };
    const constrained = new Set<string>();
    for (const alignment of alignments) {
      const members = alignment.members.filter((id) => positions.has(id));
      members.forEach((id) => constrained.add(id));
      const equality = alignment.direction === (axis === "x" ? "column" : "row");
      if (equality) for (const id of members.slice(1)) parent.set(root(id), root(members[0]!));
    }
    const edges = new Map<string, Set<string>>(),
      indegrees = new Map<string, number>();
    for (const id of constrained) {
      const key = root(id);
      edges.set(key, new Set());
      indegrees.set(key, 0);
    }
    for (const alignment of alignments) {
      if (alignment.direction === (axis === "x" ? "column" : "row")) continue;
      const members = alignment.members.filter((id) => positions.has(id));
      for (let index = 1; index < members.length; index++) {
        const from = root(members[index - 1]!),
          to = root(members[index]!);
        if (from === to) throw new Error("Architecture alignment has conflicting ordered tracks");
        if (!edges.get(from)!.has(to)) {
          edges.get(from)!.add(to);
          indegrees.set(to, indegrees.get(to)! + 1);
        }
      }
    }
    const queue = [...indegrees].filter(([, degree]) => degree === 0).map(([id]) => id),
      rank = new Map<string, number>();
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const from = queue[cursor]!;
      for (const to of edges.get(from)!) {
        rank.set(to, Math.max(rank.get(to) ?? 0, (rank.get(from) ?? 0) + 1));
        indegrees.set(to, indegrees.get(to)! - 1);
        if (indegrees.get(to) === 0) queue.push(to);
      }
    }
    if (queue.length !== indegrees.size)
      throw new Error("Architecture alignment has cyclic ordered tracks");
    for (const id of constrained) positions.get(id)![axis] = rank.get(root(id)) ?? 0;
  }
}
