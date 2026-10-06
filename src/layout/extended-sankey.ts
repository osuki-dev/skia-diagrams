import { boundedNumber } from "./options.ts";
import type {
  DiagramInteraction,
  LayoutOptions,
  ParsedDiagram,
  Point,
  Primitive,
  Scene,
  TextMeasurer,
} from "../types.ts";
import type { SankeyData } from "../parse/extended-sankey.ts";

interface NodeGeometry {
  name: string;
  index: number;
  depth: number;
  value: number;
  x: number;
  y: number;
  height: number;
  incoming: number;
  outgoing: number;
}
export function layoutExtendedSankey(
  parsed: ParsedDiagram,
  measure: TextMeasurer,
  options: LayoutOptions = {},
): Scene | undefined {
  if (parsed.kind !== "sankey") return;
  const { links, config } = parsed.ir.data as unknown as SankeyData;
  const padding = options.padding ?? 20,
    fontSize = options.fontSize ?? 14;
  const viewport = options.viewportWidth ? Math.max(160, options.viewportWidth) : undefined;
  const compact = viewport !== undefined;
  const nodeWidth = boundedNumber(config.nodeWidth, 15, 2, compact ? 20 : 80);
  const nodePadding = boundedNumber(config.nodePadding, 14, 2, 100);
  let width = boundedNumber(config.width, 720, 180, 2400);
  const height = boundedNumber(config.height, 420, 100, 2400);
  const names = parsed.ir.nodes.map((node) => node.id);
  const byName = new Map<string, NodeGeometry>(
    names.map((name, index) => [
      name,
      { name, index, depth: 0, value: 0, x: 0, y: 0, height: 0, incoming: 0, outgoing: 0 },
    ]),
  );
  const indegrees = new Map(names.map((name) => [name, 0]));
  const incoming = new Map(names.map((name) => [name, 0]));
  const outgoing = new Map(names.map((name) => [name, 0]));
  const successors = new Map(names.map((name) => [name, [] as string[]]));
  for (const link of links) {
    indegrees.set(link.target, indegrees.get(link.target)! + 1);
    outgoing.set(link.source, outgoing.get(link.source)! + Math.max(0, link.value));
    incoming.set(link.target, incoming.get(link.target)! + Math.max(0, link.value));
    successors.get(link.source)!.push(link.target);
  }
  const queue = names.filter((name) => indegrees.get(name) === 0);
  let visited = 0;
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const name = queue[cursor],
      node = byName.get(name)!;
    visited++;
    for (const target of successors.get(name)!) {
      const other = byName.get(target)!;
      other.depth = Math.max(other.depth, node.depth + 1);
      indegrees.set(target, indegrees.get(target)! - 1);
      if (indegrees.get(target) === 0) queue.push(target);
    }
  }
  if (visited !== names.length) throw new Error("Sankey requires an acyclic directed graph");
  let maxDepth = 0;
  for (const node of byName.values()) maxDepth = Math.max(maxDepth, node.depth);
  const align = config.nodeAlignment ?? "justify";
  if (align === "justify") {
    for (const node of byName.values())
      if (!successors.get(node.name)!.length) node.depth = maxDepth;
  } else if (align === "right") {
    const distances = new Map(names.map((name) => [name, 0]));
    for (const name of [...queue].reverse())
      for (const target of successors.get(name)!)
        distances.set(name, Math.max(distances.get(name)!, distances.get(target)! + 1));
    for (const node of byName.values()) node.depth = maxDepth - distances.get(node.name)!;
  }
  if (align === "center") {
    for (const node of byName.values()) {
      const next = successors.get(node.name)!;
      if (incoming.get(node.name) === 0 && next.length)
        node.depth = Math.max(0, Math.min(...next.map((name) => byName.get(name)!.depth)) - 1);
    }
  }
  // Bucket once: a long chain must not scan all nodes for every depth.
  const columns = Array.from({ length: maxDepth + 1 }, () => [] as NodeGeometry[]);
  for (const node of byName.values()) columns[node.depth].push(node);
  for (const node of byName.values())
    node.value = Math.max(incoming.get(node.name)!, outgoing.get(node.name)!);
  const prefix = typeof config.prefix === "string" ? config.prefix : "";
  const suffix = typeof config.suffix === "string" ? config.suffix : "";
  const formattedValue = (value: number) => `${prefix}${Math.round(value * 100) / 100}${suffix}`;
  let centralDepth = 0,
    maximumFlow = 0;
  for (const node of byName.values())
    if (node.value > maximumFlow) {
      maximumFlow = node.value;
      centralDepth = node.depth;
    }
  const labelOnLeft = (node: NodeGeometry) =>
    config.labelStyle === "outlined" ? node.depth < centralDepth : node.depth >= maxDepth / 2;
  const labelMetrics = new Map(
    [...byName.values()].map((node) => {
      const value =
        config.showValues === false ? node.name : `${node.name}\n${formattedValue(node.value)}`;
      const metrics = measure(value, {
        literal: true,
        fontSize,
        maxWidth: Math.max(140, width / Math.max(2, maxDepth)),
      });
      // Paragraph width needs a pixel of reserve: fractional longest-line metrics
      // can otherwise reflow the same word when replayed at that exact width.
      return [node.name, { ...metrics, width: Math.ceil(metrics.width) + 1 }];
    }),
  );
  const leftWidths = columns.map((column) =>
    Math.max(
      0,
      ...column.filter(labelOnLeft).map((node) => labelMetrics.get(node.name)!.width + 8),
    ),
  );
  const rightWidths = columns.map((column) =>
    Math.max(
      0,
      ...column
        .filter((node) => !labelOnLeft(node))
        .map((node) => labelMetrics.get(node.name)!.width + 8),
    ),
  );
  const gaps = columns
    .slice(1)
    .map((_, index) => rightWidths[index] + nodeWidth + 30 + leftWidths[index + 1]);
  const minimumWidth =
    leftWidths[0] + gaps.reduce((sum, value) => sum + value, 0) + nodeWidth + rightWidths.at(-1)!;
  width = compact ? viewport! - padding * 2 : Math.max(width, minimumWidth);
  const columnX: number[] = [compact ? padding : padding + leftWidths[0]];
  const extraGap = Math.max(0, width - minimumWidth) / Math.max(1, maxDepth);
  for (let index = 1; index < columns.length; index++)
    columnX.push(
      compact
        ? padding + (index * (width - nodeWidth)) / Math.max(1, maxDepth)
        : columnX[index - 1] + gaps[index - 1] + extraGap,
    );
  const flowHeight = Math.max(
    height,
    Math.max(
      ...columns.map((column) =>
        column.reduce((sum, node) => sum + labelMetrics.get(node.name)!.height + 5, 0),
      ),
    ),
    Math.max(...columns.map((column) => column.length * (fontSize * 1.3 + nodePadding))),
  );
  const scaleCandidate = Math.min(
    ...columns
      .filter((column) => column.length)
      .map(
        (column) =>
          (flowHeight - (column.length - 1) * nodePadding) /
          column.reduce((sum, node) => sum + node.value, 0),
      ),
  );
  const scale = Number.isFinite(scaleCandidate) ? scaleCandidate : 0;
  const titleHeight = parsed.ir.title
    ? Math.max(
        fontSize * 2.5,
        measure(parsed.ir.title, {
          literal: true,
          fontSize: fontSize * 1.3,
          fontWeight: 700,
          ...(compact ? { maxWidth: width } : {}),
        }).height + 12,
      )
    : 0;
  for (const column of columns) {
    const used =
      column.reduce((sum, node) => sum + node.value * scale, 0) +
      Math.max(0, column.length - 1) * nodePadding;
    let y = padding + titleHeight + (flowHeight - used) / 2;
    for (const node of column) {
      node.x = columnX[node.depth];
      node.y = y;
      node.height = node.value * scale;
      y += node.height + nodePadding;
    }
  }
  const primitives: Primitive[] = [];
  const interactions: DiagramInteraction[] = [];
  const colors =
    config.nodeColors && typeof config.nodeColors === "object"
      ? (config.nodeColors as Record<string, string>)
      : {};
  const nodeColor = (node: NodeGeometry) => {
    const authored = Object.hasOwn(colors, node.name) ? colors[node.name] : undefined;
    return typeof authored === "string" ? authored : `palette:${node.index % 8}`;
  };
  const pointOnCurve = (x0: number, x1: number, y0: number, y1: number, t: number): Point => {
    const middle = (x0 + x1) / 2,
      u = 1 - t;
    return {
      x: u ** 3 * x0 + 3 * u * u * t * middle + 3 * u * t * t * middle + t ** 3 * x1,
      y: u ** 3 * y0 + 3 * u * u * t * y0 + 3 * u * t * t * y1 + t ** 3 * y1,
    };
  };
  for (const link of links) {
    const from = byName.get(link.source)!,
      to = byName.get(link.target)!;
    const band = Math.max(0, link.value * scale),
      x0 = from.x + nodeWidth,
      x1 = to.x;
    const y0 = from.y + from.outgoing,
      y1 = to.y + to.incoming;
    const top = Array.from({ length: 25 }, (_, step) => pointOnCurve(x0, x1, y0, y1, step / 24));
    const bottom = Array.from({ length: 25 }, (_, step) =>
      pointOnCurve(x0, x1, y0 + band, y1 + band, 1 - step / 24),
    );
    const fill =
      config.linkColor === "target"
        ? nodeColor(to)
        : typeof config.linkColor === "string" && !["source", "gradient"].includes(config.linkColor)
          ? config.linkColor
          : nodeColor(from);
    if (band > 0 || link.value < 0) {
      const margin = link.value < 0 ? 4 : 0;
      const points =
        link.value < 0
          ? [
              ...top.map((point) => ({ x: point.x, y: point.y - margin })),
              ...[...top].reverse().map((point) => ({ x: point.x, y: point.y + margin })),
            ]
          : [...top, ...bottom];
      const minY = Math.min(y0, y1) - margin,
        maxY = Math.max(y0 + band, y1 + band) + margin;
      const interaction: DiagramInteraction = {
        id: `sankey-flow-${interactions.length}`,
        kind: "data",
        target: `${link.source}→${link.target}`,
        label: `${link.source} to ${link.target}`,
        tooltip: `${link.source} → ${link.target}\n${formattedValue(link.value)}`,
        value: link.value,
        x: x0,
        y: minY,
        width: x1 - x0,
        height: maxY - minY,
        hit: { type: "polygon", points },
      };
      interactions.push(interaction);
    }
    primitives.push({
      type: "path",
      points: link.value < 0 ? top : [...top, ...bottom],
      semantic: {
        kind: "edge",
        id: `sankey-flow:${link.source}:${link.target}`,
        from: link.source,
        to: link.target,
      },
      closed: link.value >= 0,
      opacity: 0.4,
      ...(config.linkColor === undefined || config.linkColor === "gradient"
        ? {
            gradient: {
              from: { x: x0, y: y0 },
              to: { x: x1, y: y1 },
              stops: [
                { offset: 0, color: nodeColor(from) },
                { offset: 1, color: nodeColor(to) },
              ],
            },
          }
        : {}),
      fill: link.value < 0 ? undefined : fill,
      ...(link.value < 0 ? { stroke: fill } : {}),
      strokeWidth: link.value < 0 ? 1 : 0,
    });
    from.outgoing += band;
    to.incoming += band;
  }
  let boundWidth = width + padding * 2;
  const labelY = new Map<string, number>();
  for (const column of columns) {
    let bottom = padding + titleHeight;
    for (const node of column) {
      const metrics = labelMetrics.get(node.name)!;
      const y = Math.max(bottom, node.y + (node.height - metrics.height) / 2);
      labelY.set(node.name, y);
      bottom = y + metrics.height + 5;
    }
    let top = padding + titleHeight + flowHeight;
    for (const node of [...column].reverse()) {
      const metrics = labelMetrics.get(node.name)!;
      const y = Math.min(labelY.get(node.name)!, top - metrics.height);
      labelY.set(node.name, y);
      top = y - 5;
    }
  }
  for (const node of byName.values()) {
    primitives.push({
      type: "shape",
      shape: "rect",
      id: node.name,
      semantic: { kind: "node", id: node.name },
      x: node.x,
      y: node.y,
      width: nodeWidth,
      height: node.height,
      fill: nodeColor(node),
      strokeWidth: 0,
    });
    const fullMetrics = labelMetrics.get(node.name)!;
    const keyMetrics = compact
      ? measure(String(node.index + 1), { literal: true, fontSize, fontWeight: 600 })
      : fullMetrics;
    const metrics = { ...keyMetrics, width: Math.ceil(keyMetrics.width) + 1 };
    const rightmost = labelOnLeft(node);
    const x = compact
      ? Math.max(
          padding,
          Math.min(padding + width - metrics.width, node.x + (nodeWidth - metrics.width) / 2),
        )
      : rightmost
        ? node.x - metrics.width - 8
        : node.x + nodeWidth + 8;
    const y = labelY.get(node.name)!;
    const visibleKey = !compact || (width - nodeWidth) / Math.max(1, maxDepth) >= metrics.width + 4;
    if (!compact && Math.abs(y + metrics.height / 2 - node.y - node.height / 2) > fontSize) {
      const anchorX = rightmost ? node.x : node.x + nodeWidth;
      const labelX = rightmost ? x + metrics.width + 2 : x - 2;
      primitives.push({
        type: "path",
        points: [
          { x: anchorX, y: node.y + node.height / 2 },
          { x: labelX, y: y + metrics.height / 2 },
        ],
        stroke: "mutedText",
        strokeWidth: 0.75,
      });
    }
    if (visibleKey)
      primitives.push({
        type: "text",
        literal: true,
        semantic: { kind: "node", id: node.name },
        text: metrics.lines.join("\n"),
        x,
        y,
        width: metrics.width,
        height: metrics.height,
        fontSize,
        ...(compact ? { fontWeight: 600 } : {}),
        color: "nodeText",
        ...(config.labelStyle === "outlined"
          ? { textOutline: { color: "background", width: 3 } }
          : {}),
        ...(metrics.lineBaselines ? { lineBaselines: metrics.lineBaselines } : {}),
      });
    const nodeInteraction = {
      kind: "data" as const,
      target: node.name,
      label: node.name,
      tooltip: `${node.name}\nFlow: ${formattedValue(node.value)}`,
      value: node.value,
    };
    interactions.push({
      ...nodeInteraction,
      id: `sankey-node-${node.index}`,
      x: node.x,
      y: node.y,
      width: nodeWidth,
      height: node.height,
    });
    if (visibleKey)
      interactions.push({
        ...nodeInteraction,
        id: `sankey-label-${node.index}`,
        x,
        y,
        width: metrics.width,
        height: metrics.height,
      });
    if (!compact) boundWidth = Math.max(boundWidth, x + metrics.width + padding);
  }
  let legendHeight = 0;
  if (compact) {
    let legendY = padding + titleHeight + flowHeight + 24;
    for (const node of byName.values()) {
      const label =
        config.showValues === false
          ? `${node.index + 1}. ${node.name}`
          : `${node.index + 1}. ${node.name}\n${formattedValue(node.value)}`;
      const metrics = measure(label, { literal: true, fontSize, maxWidth: width - 24 });
      primitives.push({
        type: "shape",
        shape: "rect",
        x: padding,
        y: legendY + 4,
        width: 12,
        height: fontSize,
        fill: nodeColor(node),
        strokeWidth: 0,
      });
      primitives.push({
        type: "text",
        literal: true,
        semantic: { kind: "node", id: node.name },
        text: metrics.lines.join("\n"),
        x: padding + 24,
        y: legendY,
        width: width - 24,
        height: metrics.height,
        fontSize,
        color: "nodeText",
        ...(metrics.lineBaselines ? { lineBaselines: metrics.lineBaselines } : {}),
      });
      interactions.push({
        id: `sankey-legend-${node.index}`,
        kind: "data",
        target: node.name,
        label: node.name,
        value: node.value,
        tooltip: `${node.name}\nFlow: ${formattedValue(node.value)}`,
        x: padding,
        y: legendY,
        width,
        height: metrics.height,
      });
      legendY += metrics.height + 12;
    }
    legendHeight = legendY - padding - titleHeight - flowHeight;
  }
  if (parsed.ir.title) {
    const metrics = measure(parsed.ir.title, {
      literal: true,
      fontSize: fontSize * 1.3,
      fontWeight: 700,
      ...(compact ? { maxWidth: width } : {}),
    });
    primitives.push({
      type: "text",
      literal: true,
      text: parsed.ir.title,
      x: padding,
      y: padding,
      width: metrics.width,
      height: metrics.height,
      fontSize: fontSize * 1.3,
      fontWeight: 700,
      color: "nodeText",
    });
    boundWidth = Math.max(boundWidth, metrics.width + padding * 2);
  }
  return {
    kind: "sankey",
    interactions,
    bounds: {
      x: 0,
      y: 0,
      width: boundWidth,
      height: flowHeight + padding * 2 + titleHeight + legendHeight,
    },
    primitives,
    accessibilityLabel: `Sankey diagram. ${links.map((link) => `${link.source} to ${link.target}: ${link.value}`).join(". ")}`,
  };
}
