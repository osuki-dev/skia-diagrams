import type { Point, Rect } from "../../types.ts";
import { OfficialScene } from "./context.ts";
import { architectureIcon } from "./architecture-icons.ts";
import { alignArchitecture, type ArchitectureAlignment } from "./architecture-alignment.ts";
interface ArchitectureData {
  alignments?: ArchitectureAlignment[];
  services: { id: string; title?: string; icon?: string; iconText?: string; in?: string }[];
  junctions: { id: string; in?: string }[];
  groups: { id: string; title?: string; in?: string; icon?: string }[];
  edges: {
    lhsId: string;
    rhsId: string;
    lhsDir: string;
    rhsDir: string;
    lhsInto: boolean;
    rhsInto: boolean;
    lhsGroup?: boolean;
    rhsGroup?: boolean;
    title?: string;
  }[];
}
const direction: Record<string, Point> = {
  L: { x: -1, y: 0 },
  R: { x: 1, y: 0 },
  T: { x: 0, y: -1 },
  B: { x: 0, y: 1 },
};
export function architecture(scene: OfficialScene, data: ArchitectureData): void {
  const items = [...data.services, ...data.junctions],
    positions = new Map<string, Point>();
  const itemIds = new Set(items.map((item) => item.id));
  const adjacency = new Map<string, { target: string; side: string }[]>();
  for (const edge of data.edges) {
    const forward = adjacency.get(edge.lhsId) ?? [],
      reverse = adjacency.get(edge.rhsId) ?? [];
    forward.push({ target: edge.rhsId, side: edge.lhsDir });
    reverse.push({ target: edge.lhsId, side: edge.rhsDir });
    adjacency.set(edge.lhsId, forward);
    adjacency.set(edge.rhsId, reverse);
  }
  let nextComponentX = 0;
  for (const item of items) {
    if (positions.has(item.id)) continue;
    positions.set(item.id, { x: 0, y: 0 });
    const queue = [item.id];
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const id = queue[cursor]!,
        origin = positions.get(id)!;
      for (const { target, side } of adjacency.get(id) ?? []) {
        if (!positions.has(target) && itemIds.has(target)) {
          const vector = direction[side] ?? direction.R!;
          positions.set(target, { x: origin.x + vector.x, y: origin.y + vector.y });
          queue.push(target);
        }
      }
    }
    // Pack connected components by their actual occupied tracks. A fixed
    // four-column stride wastes space and can overlap larger components.
    const componentPositions = queue.map((id) => positions.get(id)!);
    const componentMin = Math.min(...componentPositions.map((p) => p.x));
    const componentMax = Math.max(...componentPositions.map((p) => p.x));
    for (const position of componentPositions) position.x += nextComponentX - componentMin;
    nextComponentX += componentMax - componentMin + 1;
  }
  alignArchitecture(positions, data.alignments ?? []);
  const minX = Math.min(0, ...Array.from(positions.values(), (p) => p.x)),
    minY = Math.min(0, ...Array.from(positions.values(), (p) => p.y));
  const rectangles = new Map<string, Rect>(),
    junctionIds = new Set(data.junctions.map((j) => j.id));
  const occupied = new Set<string>();
  const cardWidth = Math.max(116, scene.fontSize * 8),
    labelHeight = Math.max(
      scene.fontSize * 1.4,
      ...data.services.map(
        (service) =>
          scene.measure(service.title ?? service.id, {
            fontSize: scene.fontSize,
            maxWidth: cardWidth - 16,
          }).height,
      ),
    ),
    cardHeight = 48 + labelHeight + 10,
    stepX = cardWidth + 64,
    groupHeader = Math.max(
      32,
      scene.fontSize * 2.2,
      ...data.groups.map(
        (group) =>
          scene.measure(group.title ?? group.id, {
            fontSize: scene.fontSize,
            fontWeight: 600,
            maxWidth: cardWidth - 2,
          }).height + 14,
      ),
    ),
    stepY = cardHeight + Math.max(64, scene.fontSize * 3, groupHeader + 30);
  for (const item of items) {
    const p = positions.get(item.id)!;
    while (occupied.has(`${p.x},${p.y}`)) p.y++;
    occupied.add(`${p.x},${p.y}`);
    rectangles.set(item.id, {
      x: scene.padding + 35 + (p.x - minX) * stepX,
      y: scene.top + groupHeader + 13 + (p.y - minY) * stepY,
      width: junctionIds.has(item.id) ? 12 : cardWidth,
      height: junctionIds.has(item.id) ? 12 : cardHeight,
    });
  }
  const groupRects = new Map<string, Rect>();
  const resolveGroup = (id: string, visiting = new Set<string>()): Rect | undefined => {
    if (visiting.has(id)) throw new Error("Architecture groups contain a cycle");
    if (groupRects.has(id)) return groupRects.get(id);
    visiting.add(id);
    const children = items.filter((item) => item.in === id).map((item) => rectangles.get(item.id)!);
    for (const child of data.groups.filter((group) => group.in === id)) {
      const r = resolveGroup(child.id, visiting);
      if (r) children.push(r);
    }
    visiting.delete(id);
    if (!children.length) return undefined;
    const x = Math.min(...children.map((r) => r.x)) - 22,
      y = Math.min(...children.map((r) => r.y)) - groupHeader;
    const r = {
      x,
      y,
      width: Math.max(...children.map((r) => r.x + r.width)) - x + 22,
      height: Math.max(...children.map((r) => r.y + r.height)) - y + 22,
    };
    groupRects.set(id, r);
    return r;
  };
  data.groups.forEach((g) => resolveGroup(g.id));
  const headingRects: Rect[] = [];
  // Parents precede descendants so translucent group surfaces never cover nodes.
  [...data.groups]
    .sort((a, b) => (groupRects.get(b.id)?.width ?? 0) - (groupRects.get(a.id)?.width ?? 0))
    .forEach((g) => {
      const r = groupRects.get(g.id);
      if (r) {
        const firstPrimitive = scene.primitives.length;
        scene.box(r, "headerFill", "gridStroke", "round");
        const resolved = g.icon
          ? architectureIcon(
              scene,
              g.icon,
              { x: r.x + 10, y: r.y + 6, width: 18, height: 18 },
              "mutedText",
            )
          : false;
        const label = (g.title ?? g.id) + (g.icon && !resolved ? ` [icon:${g.icon}]` : "");
        const labelX = r.x + (resolved ? 36 : 10),
          labelWidth = r.width - (resolved ? 46 : 20),
          labelMetrics = scene.measure(label, {
            fontSize: scene.fontSize,
            fontWeight: 600,
            maxWidth: labelWidth,
          });
        headingRects.push({
          x: labelX,
          y: r.y + 7,
          width: labelMetrics.width,
          height: labelMetrics.height,
        });
        scene.text(
          label,
          r.x + (resolved ? 36 : 10),
          r.y + 7,
          r.width - (resolved ? 46 : 20),
          "mutedText",
          600,
        );
        for (const p of scene.primitives.slice(firstPrimitive))
          p.semantic = { kind: "frame", id: g.id };
      }
    });
  const contact = (r: Rect, side: string): Point => {
    const v = direction[side] ?? direction.R!;
    return {
      x: r.x + r.width / 2 + (v.x * r.width) / 2,
      y: r.y + r.height / 2 + (v.y * r.height) / 2,
    };
  };
  for (const [edgeIndex, edge] of data.edges.entries()) {
    const firstPrimitive = scene.primitives.length;
    const lhsParent = items.find((item) => item.id === edge.lhsId)?.in,
      rhsParent = items.find((item) => item.id === edge.rhsId)?.in;
    const a =
        (edge.lhsGroup && lhsParent ? groupRects.get(lhsParent) : rectangles.get(edge.lhsId)) ??
        groupRects.get(edge.lhsId),
      b =
        (edge.rhsGroup && rhsParent ? groupRects.get(rhsParent) : rectangles.get(edge.rhsId)) ??
        groupRects.get(edge.rhsId);
    if (!a || !b) continue;
    const from = contact(a, edge.lhsDir),
      to = contact(b, edge.rhsDir);
    const horizontal = edge.lhsDir === "L" || edge.lhsDir === "R";
    let points = horizontal
      ? [from, { x: (from.x + to.x) / 2, y: from.y }, { x: (from.x + to.x) / 2, y: to.y }, to]
      : [from, { x: from.x, y: (from.y + to.y) / 2 }, { x: to.x, y: (from.y + to.y) / 2 }, to];
    if (!horizontal && from.x === to.x) {
      const headings = headingRects.filter(
        (r) =>
          from.x >= r.x - 6 &&
          from.x <= r.x + r.width + 6 &&
          Math.min(from.y, to.y) < r.y + r.height &&
          Math.max(from.y, to.y) > r.y,
      );
      if (headings.length) {
        const descending = to.y > from.y;
        headings.sort((a, b) => (descending ? a.y - b.y : b.y - a.y));
        points = [from];
        for (const heading of headings) {
          const before = descending ? heading.y - 6 : heading.y + heading.height + 6,
            after = descending ? heading.y + heading.height + 6 : heading.y - 6,
            corridor = heading.x + heading.width + 12;
          points.push(
            { x: from.x, y: before },
            { x: corridor, y: before },
            { x: corridor, y: after },
            { x: from.x, y: after },
          );
        }
        points.push(to);
      }
    }
    scene.primitives.push({
      type: "path",
      points,
      stroke: "edgeStroke",
      strokeRole: "edge",
      start: edge.lhsInto ? "arrow" : "none",
      end: edge.rhsInto ? "arrow" : "none",
    });
    if (edge.title)
      scene.text(edge.title, (from.x + to.x) / 2 + 6, (from.y + to.y) / 2 - 18, 150, "mutedText");
    for (const p of scene.primitives.slice(firstPrimitive))
      p.semantic = {
        kind: "edge",
        id: `architecture-edge:${edgeIndex}`,
        from: edge.lhsId,
        to: edge.rhsId,
      };
  }
  data.services.forEach((service, i) => {
    const firstPrimitive = scene.primitives.length;
    const r = rectangles.get(service.id)!;
    scene.data(
      `architecture:${service.id}`,
      service.title ?? service.id,
      r,
      undefined,
      `${service.title ?? service.id}${service.icon ? ` · ${service.icon}` : ""}`,
    );
    scene.box(r, `paletteFill:${i % 8}`, `palette:${i % 8}`, "round", service.id);
    const icon = service.icon;
    if (
      icon &&
      !architectureIcon(
        scene,
        icon,
        { x: r.x + (r.width - 32) / 2, y: r.y + 8, width: 32, height: 32 },
        `palette:${i % 8}`,
      )
    ) {
      scene.text(service.iconText ?? icon, r.x + 6, r.y + 14, r.width - 12, "mutedText", 400, 9);
    }

    scene.text(service.title ?? service.id, r.x + 8, r.y + 48, r.width - 16, "nodeText", 500);
    for (const p of scene.primitives.slice(firstPrimitive))
      p.semantic = { kind: "node", id: service.id };
  });
  data.junctions.forEach((j) => {
    const r = rectangles.get(j.id)!;
    scene.box(r, "edgeStroke", "edgeStroke", "circle", j.id);
    scene.primitives.at(-1)!.semantic = { kind: "node", id: j.id };
  });
}
