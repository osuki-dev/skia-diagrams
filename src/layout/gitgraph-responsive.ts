import type { DiagramIR, LayoutOptions, Point, Primitive, TextMeasurer } from "../types.ts";
import { intersectShape } from "../render/geometry.ts";

/** A narrow viewport keeps time on the vertical axis. Lanes remain distinct,
 * and authored labels occupy measured rows beside the graph instead of shrinking. */
export function narrowGitgraph(
  ir: DiagramIR,
  branches: readonly (string | undefined)[],
  measure: TextMeasurer,
  options: LayoutOptions,
  dotRadius: number,
): Primitive[] {
  const width = options.viewportWidth! - (options.padding ?? 20) * 2,
    size = options.fontSize ?? 14;
  const padding = 12,
    laneBand = Math.min(88, 26 + branches.length * 10);
  const labelX = padding + laneBand + 12,
    labelWidth = width - labelX - padding;
  const primitives: Primitive[] = [],
    nodes = new Map(ir.nodes.map((node) => [node.id, node]));
  const events = new Map(ir.events.map((event) => [event.label, event]));
  const rows = new Map(ir.events.map((event, index) => [event.label, index]));
  const positions = new Map<string, Point>();
  const showBranches =
    (ir.data?.config as { gitGraph?: { showBranches?: boolean } } | undefined)?.gitGraph
      ?.showBranches !== false;
  const showLabels =
    (ir.data?.config as { gitGraph?: { showCommitLabel?: boolean } } | undefined)?.gitGraph
      ?.showCommitLabel !== false;
  const color = (branch: string | undefined) =>
    `palette:${[1, 0, 2, 3][branches.indexOf(branch)] ?? 4}`;
  const text = (value: string, y: number, id: string, role: string, muted = false) => {
    const metrics = measure(value, { fontSize: size, maxWidth: labelWidth });
    primitives.push({
      type: "text",
      text: metrics.lines.join("\n"),
      x: labelX,
      y,
      width: metrics.width,
      height: metrics.height,
      fontSize: size,
      color: muted ? "mutedText" : "nodeText",
      ...(metrics.lineBaselines ? { lineBaselines: metrics.lineBaselines } : {}),
      semantic: {
        kind: rows.has(id) ? "node" : "frame",
        id,
        role,
        part: "label",
        row: rows.get(id),
      },
    });
    return metrics.height;
  };
  let y = 20;
  ir.events.forEach((event, index) => {
    const id = event.label,
      node = nodes.get(id)!,
      top = y;
    if (showBranches) y += text(event.from ?? "", y, id, "branch", true) + 5;
    const center = {
      x:
        padding +
        10 +
        branches.indexOf(event.from) * Math.min(10, 60 / Math.max(1, branches.length - 1)),
      y: top + dotRadius + 8,
    };
    positions.set(id, center);
    if (showLabels) y += text(node.label, y, id, "commit") + 6;
    const tags = node.metadata?.tags;
    if (Array.isArray(tags))
      for (const tag of tags)
        if (typeof tag === "string") {
          const metrics = measure(tag, {
            fontSize: size,
            maxWidth: Math.max(16, labelWidth * 0.8 - 16),
          });
          primitives.push({
            type: "shape",
            shape: "flag",
            x: labelX,
            y,
            width: Math.min(labelWidth, (metrics.width + 16) / 0.8),
            height: metrics.height + 10,
            fill: "paletteFill:3",
            stroke: color(event.from),
            strokeRole: "series",
            semantic: { kind: "node", id, role: "tag", part: "body", row: index },
          });
          const tagWidth = Math.min(labelWidth, (metrics.width + 16) / 0.8);
          primitives.push({
            type: "text",
            text: metrics.lines.join("\n"),
            x: labelX + tagWidth * 0.2 + 8,
            y: y + 5,
            width: metrics.width,
            height: metrics.height,
            fontSize: size,
            color: "nodeText",
            semantic: { kind: "node", id, role: "tag", part: "label", row: index },
          });
          y += metrics.height + 16;
        }
    if (typeof node.metadata?.message === "string")
      y += text(node.metadata.message, y, id, "message", true) + 6;
    y = Math.max(y, top + dotRadius * 2 + 20) + 20;
    const semantic = {
      kind: "node" as const,
      id,
      row: index,
      role: "commit",
      part: "body" as const,
    };
    if (event.flags?.includes("HIGHLIGHT"))
      primitives.push({
        type: "shape",
        shape: "rect",
        x: center.x - dotRadius - 4,
        y: center.y - dotRadius - 4,
        width: dotRadius * 2 + 8,
        height: dotRadius * 2 + 8,
        fill: "paletteFill:3",
        stroke: color(event.from),
        strokeRole: "series",
        semantic,
      });
    primitives.push({
      type: "shape",
      shape: event.flags?.includes("HIGHLIGHT") ? "rect" : "circle",
      x: center.x - dotRadius,
      y: center.y - dotRadius,
      width: dotRadius * 2,
      height: dotRadius * 2,
      fill: "nodeFill",
      stroke: color(event.from),
      strokeRole: "series",
      semantic,
    });
    if (event.flags?.includes("REVERSE"))
      for (const sign of [-1, 1])
        primitives.push({
          type: "path",
          points: [
            { x: center.x - dotRadius * 0.6, y: center.y - sign * dotRadius * 0.6 },
            { x: center.x + dotRadius * 0.6, y: center.y + sign * dotRadius * 0.6 },
          ],
          stroke: color(event.from),
          strokeRole: "series",
          semantic,
        });
  });
  const contact = (id: string, toward: Point) => {
    const p = positions.get(id)!,
      highlight = events.get(id)?.flags?.includes("HIGHLIGHT"),
      r = dotRadius + (highlight ? 4 : 0);
    return intersectShape(
      highlight ? "rect" : "circle",
      { x: p.x - r, y: p.y - r, width: r * 2, height: r * 2 },
      toward,
      0,
    );
  };
  const routes: Primitive[] = [];
  ir.edges.forEach((edge, index) => {
    const from = positions.get(edge.from)!,
      to = positions.get(edge.to)!;
    const mid = (from.y + to.y) / 2;
    const points = [from, { x: from.x, y: mid }, { x: to.x, y: mid }, to];
    points[0] = contact(edge.from, points[1]);
    points[3] = contact(edge.to, points[2]);
    routes.push({
      type: "path",
      points,
      smooth: from.x !== to.x,
      stroke: color(events.get(edge.to)?.from),
      strokeRole: "series",
      semantic: {
        kind: "edge",
        id: `git-edge-${index}`,
        from: edge.from,
        to: edge.to,
        row: ir.events.findIndex((e) => e.label === edge.to),
      },
    });
  });
  for (const branch of branches)
    if (!ir.events.some((event) => event.from === branch)) {
      const id = `empty-branch:${branch}`;
      const h = text(branch ?? "", y, id, "branch", true);
      routes.push({
        type: "path",
        points: [
          { x: padding + 10, y: y + 8 },
          { x: labelX - 8, y: y + 8 },
        ],
        dash: [4, 4],
        stroke: color(branch),
        strokeRole: "series",
        semantic: { kind: "frame", id, role: "branch" },
      });
      y += h + 24;
    }
  return [...routes, ...primitives];
}
