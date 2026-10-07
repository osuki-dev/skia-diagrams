import { layoutCompactTemporal } from "./temporal-compact.ts";
import { boundedNumber as styleSize, normalizeLayoutOptions } from "./options.ts";
import { translateInteraction } from "./interactions.ts";
import { translatePrimitive } from "./scene-geometry.ts";
import { layoutPie } from "./pie.ts";
import { edgeSemanticIdentifiers, tagPrimitiveRange } from "./semantic-elements.ts";
import { layoutQuadrant } from "./quadrant.ts";
import { terminalBranchHandoffs } from "./branching.ts";
import { entityHeader, entityTable } from "./tables.ts";
import { layoutOfficial } from "./official-ast.ts";
import { layoutExtended } from "./extended.ts";
import { compoundLayout } from "./graph.ts";
import { compactTableGraph } from "./compact-table-graph.ts";
import { narrowGitgraph } from "./gitgraph-responsive.ts";
import type {
  DiagramIR,
  Node,
  LayoutOptions,
  ParsedDiagram,
  Point,
  Primitive,
  Scene,
  TextMeasurer,
  Shape,
} from "../types.ts";
import { estimateText } from "./measure.ts";
import { intersectShape, curveSegments } from "../render/geometry.ts";
import { dateTicks, formatAxisDate } from "../parse/dates.ts";
import { runsForLines } from "../render/text.ts";
import { clipPolyline } from "./clip.ts";
import { placeLabels } from "./label-placement.ts";

/** Host-owned assets determine geometry without putting Skia objects in the IR. */
function mediaNodeMetrics(
  node: Node,
  measure: TextMeasurer,
  fontSize: number,
  options: LayoutOptions,
) {
  const metadata = node.metadata ?? {};
  const label =
    typeof metadata.label === "string" ? metadata.label : node.label !== node.id ? node.label : "";
  const metrics = measure(label, { fontSize });
  const height = styleSize(typeof metadata.h === "number" ? metadata.h : undefined, 48, 1, 1200);
  const intrinsic =
    typeof metadata.img === "string" && metadata.constraint === "on"
      ? options.resolveImageSize?.(metadata.img)
      : undefined;
  const ratio =
    intrinsic &&
    Number.isFinite(intrinsic.width) &&
    Number.isFinite(intrinsic.height) &&
    intrinsic.width > 0 &&
    intrinsic.height > 0
      ? intrinsic.width / intrinsic.height
      : 1;
  const width = styleSize(
    typeof metadata.w === "number" ? metadata.w : undefined,
    height * ratio,
    1,
    1200,
  );
  return { label, metrics, width, height };
}
export function layoutDiagram(
  parsed: ParsedDiagram,
  measure: TextMeasurer = estimateText,
  options: LayoutOptions = {},
): Scene {
  if (parsed.kind === "error" || parsed.kind === "unsupported")
    throw new Error("Cannot layout an invalid or unsupported diagram");
  options = normalizeLayoutOptions(options);
  const { ir, kind } = parsed;
  if (options.viewportWidth !== undefined && ["class", "er", "requirement"].includes(kind))
    options = {
      ...options,
      maxLabelWidth: Math.min(
        options.maxLabelWidth ?? 320,
        Math.max(48, options.viewportWidth - (options.padding ?? 20) * 2 - 24),
      ),
      maxLabelLines: options.maxLabelLines ?? 200,
    };
  const fontSize = options.fontSize ?? 14;
  const originalMeasure = measure;
  const maxLabelWidth = Math.max(48, options.maxLabelWidth ?? 320),
    maxLabelLines = Math.max(1, Math.floor(options.maxLabelLines ?? 12));
  measure = (value, style) => {
    const boundedStyle = { ...style, maxWidth: style.maxWidth ?? maxLabelWidth };
    const metrics = originalMeasure(value, boundedStyle);
    if (metrics.lines.length <= maxLabelLines) return metrics;
    const lines = metrics.lines.slice(0, maxLabelLines);
    let last = lines.at(-1)!;
    // Replay uses the measured longest-line width, which may be narrower than
    // maxLabelWidth. An ellipsis fitted only to the upper bound can reflow into
    // an extra line and escape the node's measured height.
    const lineWidth = Math.min(metrics.width, boundedStyle.maxWidth);
    while (
      last &&
      originalMeasure(last + "…", { ...boundedStyle, maxWidth: undefined }).width > lineWidth
    )
      last = last.slice(0, -1);
    lines[lines.length - 1] = last + "…";
    return { ...metrics, height: (metrics.height * maxLabelLines) / metrics.lines.length, lines };
  };
  const padding = options.padding ?? 20;
  const headerSize = fontSize * styleSize(options.headerScale, 1.08, 1, 1.5);
  const titleSize = fontSize * styleSize(options.titleScale, 1.3, 1, 2);
  const nodeShape = (form: Shape): Shape =>
    form === "rect" && ["class", "er", "state"].includes(kind) ? "round" : form;
  options = {
    radius: 8,
    nodeSeparation: fontSize * 2.1,
    rankSeparation: fontSize * 3.2,
    ...options,
    padding,
  };
  const primitives: Primitive[] = [];
  const interactions: NonNullable<Scene["interactions"]> = [];
  if (
    ir.nodes.length > 300 ||
    ir.clusters.length > 300 ||
    ir.edges.length > 600 ||
    ir.events.length > 600
  )
    throw new Error("Diagram exceeds layout limits");
  const specialized =
    layoutOfficial(parsed, measure, options) ?? layoutExtended(parsed, measure, options);
  if (specialized) return specialized;

  const text = (
    value: string,
    x: number,
    y: number,
    width?: number,
    color?: string,
    size = fontSize,
    weight = 400,
  ) => {
    const metrics = measure(value, {
      fontSize: size,
      fontWeight: weight,
      ...(["pie", "class", "er"].includes(kind) && width
        ? { maxWidth: width + (["class", "er"].includes(kind) ? 1 : 0) }
        : {}),
    });
    primitives.push({
      type: "text",
      text: value,
      x,
      y,
      width: width ?? metrics.width,
      height: metrics.height,
      fontSize: size,
      ...(weight !== 400 ? { fontWeight: weight } : {}),
      color,
      lineRuns: runsForLines(value, metrics.lines),
      ...(metrics.lineBaselines
        ? { lineBaselines: metrics.lineBaselines.slice(0, metrics.lines.length) }
        : {}),
    });
    return metrics;
  };
  const shape = (
    label: string,
    x: number,
    y: number,
    width: number,
    height: number,
    form: "rect" | "round" | "circle" = "round",
    fill?: string,
  ) => {
    if (fill === "noteFill")
      primitives.push({
        type: "shape",
        shape: form,
        x,
        y,
        width,
        height,
        fill: "background",
        strokeWidth: 0,
      });
    primitives.push({ type: "shape", shape: form, x, y, width, height, fill, strokeRole: "node" });
    text(
      label,
      x + 10,
      y + 8,
      Math.max(1, width - 20),
      fill === "noteFill" ? "noteText" : undefined,
    );
  };
  const path = (points: Point[], dashed = false) =>
    primitives.push({
      type: "path",
      points,
      strokeRole: "edge",
      dash: dashed ? [4, 5] : undefined,
    });
  if (["flowchart", "class", "state", "er"].includes(kind)) {
    const sizes = new Map<string, { width: number; height: number }>();
    const entityTables = new Map<string, ReturnType<typeof entityTable>>();
    const tableBudget =
      ["class", "er"].includes(kind) && options.viewportWidth !== undefined
        ? Math.max(
            120,
            options.viewportWidth -
              padding * 2 -
              Math.max(24, Math.min(72, ir.edges.length * Math.max(6, fontSize * 0.4))),
          )
        : undefined;
    for (const node of ir.nodes) {
      const m = measure(node.label, { fontSize });
      const sections = tableSections(kind, kind === "er" ? entityHeader(node) : node.label);
      const tableStyle = kind === "class" ? options.typeStyles?.class : options.typeStyles?.er;
      let depth = 0,
        parent = node.parent;
      while (parent) {
        depth++;
        parent = ir.clusters.find((cluster) => cluster.id === parent)?.parent;
      }
      const nodeTableBudget =
        tableBudget === undefined ? undefined : Math.max(80, tableBudget - depth * 16);
      const cellX = styleSize(tableStyle?.cellPaddingX, 14),
        cellY = styleSize(tableStyle?.cellPaddingY, 9);
      let width = Math.max(48, m.width + 36),
        height = Math.max(40, m.height + 28);
      if (kind === "flowchart") {
        const insetX = Math.max(0, options.nodePaddingX ?? fontSize * (16 / 14)),
          insetY = Math.max(0, options.nodePaddingY ?? fontSize * (12 / 14));
        width = Math.max(
          styleSize(options.typeStyles?.flowchart?.minNodeWidth, fontSize * 3.5),
          m.width + insetX * 2,
        );
        height = Math.max(
          styleSize(options.typeStyles?.flowchart?.minNodeHeight, fontSize * 3),
          m.height + insetY * 2,
        );
        // Fit the entire padded text rectangle, not just its center, inside
        // the actual silhouette. sqrt(2) scaling clips multiline diamonds.
        if (node.shape === "diamond") {
          width *= 2;
          height *= 2;
        } else if (
          [
            "hexagon",
            "flag",
            "parallelogram",
            "reverse-parallelogram",
            "trapezoid",
            "reverse-trapezoid",
          ].includes(node.shape)
        )
          width /= 0.6;
        else if (["circle", "doublecircle"].includes(node.shape))
          width = height = Math.hypot(width, height) + (node.shape === "doublecircle" ? 10 : 0);
        else if (node.shape === "stadium") width += height / 2;
        else if (node.shape === "subroutine") width += 16;
        else if (node.shape === "cylinder") height += 16;
      } else if (node.shape === "diamond") {
        width = (m.width + 28) * 2;
        height = (m.height + 20) * 2;
      } else if (kind === "state") {
        width = Math.max(56, m.width + 2 * styleSize(options.typeStyles?.state?.nodePaddingX, 16));
        height = Math.max(
          42,
          m.height + 2 * styleSize(options.typeStyles?.state?.nodePaddingY, 12),
        );
      }
      if (sections) {
        const metrics = sections.map((section, index) => {
          const style = {
            fontSize: index ? fontSize : headerSize,
            fontWeight: index ? 400 : 600,
            ...(nodeTableBudget === undefined ? {} : { maxWidth: nodeTableBudget - cellX * 2 }),
          };
          if (kind === "class" && index > 0) {
            const rows = section.split("\n").map((row) => measure(row, style));
            return {
              width: Math.max(0, ...rows.map((row) => row.width)),
              height: rows.reduce((height, row) => height + row.height, 0),
            };
          }
          return measure(section, style);
        });
        width = Math.max(80, ...metrics.map((metric) => metric.width + cellX * 2));
        height = metrics.reduce((sum, metric) => sum + metric.height + cellY * 2, 0);
      }
      if (["circle", "doublecircle"].includes(node.shape)) width = height = Math.max(width, height);
      if (node.attributes) {
        const table = entityTable(
          node,
          measure,
          fontSize,
          headerSize,
          cellX,
          cellY,
          styleSize(options.typeStyles?.er?.rowGap, 0),
          nodeTableBudget,
        );
        entityTables.set(node.id, table);
        width = table.width;
        height = table.height;
      }
      if (kind === "er" && !node.attributes) {
        const ports = ir.edges.filter(
          (edge) => edge.from === node.id || edge.to === node.id,
        ).length;
        height = Math.max(height, ports * fontSize * 1.2 + cellY * 2);
      }
      if (typeof node.metadata?.icon === "string" || typeof node.metadata?.img === "string") {
        const media = mediaNodeMetrics(node, measure, fontSize, options);
        width = Math.max(media.width, media.label ? media.metrics.width + 8 : 0);
        height = media.height + (media.label ? media.metrics.height + 12 : 0);
      }
      if (node.role === "start" || node.role === "end")
        width = height = styleSize(options.typeStyles?.state?.terminalSize, 18, 12, 48);
      if (node.role === "fork" || node.role === "join") {
        const direction = ir.clusters.find((c) => c.id === node.parent)?.direction ?? ir.direction;
        width = direction === "LR" || direction === "RL" ? 8 : 70;
        height = direction === "LR" || direction === "RL" ? 70 : 8;
      }
      sizes.set(node.id, { width, height });
    }
    const noteMargins = new Map<
      string,
      { left: number; right: number; height: number; leftHeight: number; rightHeight: number }
    >();
    for (const note of ir.events.filter(
      (e) => e.type === "state-note" || (e.type === "class-note" && e.from),
    )) {
      const m = measure(note.label, {
          fontSize,
          ...(tableBudget === undefined ? {} : { maxWidth: tableBudget - 20 }),
        }),
        margin = noteMargins.get(note.from!) ?? {
          left: 0,
          right: 0,
          height: 0,
          leftHeight: 0,
          rightHeight: 0,
        };
      const side = note.flags?.[0] === "left" ? "left" : "right";
      margin[side] = Math.max(margin[side], m.width + (tableBudget === undefined ? 40 : 20));
      const heightKey = side === "left" ? "leftHeight" : "rightHeight";
      margin[heightKey] += m.height + 16 + (margin[heightKey] ? 12 : 0);
      margin.height =
        tableBudget === undefined
          ? Math.max(margin.leftHeight, margin.rightHeight)
          : margin.leftHeight + margin.rightHeight;
      noteMargins.set(note.from!, margin);
    }
    const reserved = new Map(
      [...sizes].map(([id, size]) => {
        const margin = noteMargins.get(id);
        return [
          id,
          margin
            ? {
                width:
                  tableBudget === undefined
                    ? size.width + margin.left + margin.right
                    : Math.max(size.width, margin.left, margin.right),
                height:
                  tableBudget === undefined
                    ? Math.max(size.height, margin.height)
                    : size.height + margin.height + 20,
              }
            : { ...size },
        ];
      }),
    );
    // Concurrent state regions are separate layout boxes within their authored
    // composite. They share the outer frame, rather than becoming extra states.
    const regions = ir.events.filter((event) => event.type === "state-region" && event.from);
    const regionClusters = regions
      .flatMap((event) =>
        Array.from({ length: (event.value ?? 0) + 1 }, (_, index) => ({
          id: `${event.from}-region-${index}`,
          label: "",
          parent: event.from,
          direction: ir.direction,
        })),
      )
      .filter((region, index, all) => all.findIndex((item) => item.id === region.id) === index);
    const graphIR = regions.length
      ? {
          ...ir,
          nodes: ir.nodes.map((node) =>
            typeof node.metadata?.stateRegion === "number"
              ? { ...node, parent: `${node.parent}-region-${node.metadata.stateRegion}` }
              : node,
          ),
          clusters: [...ir.clusters, ...regionClusters],
        }
      : ir;
    // Terminal decision siblings can hand work across the same row. Keep the
    // authored handoff as a routed edge without asking Dagre to add a new rank.
    const siblingHandoffs = kind === "flowchart" ? terminalBranchHandoffs(ir) : new Set<number>();
    const handoffTargets = new Set(
      [...siblingHandoffs].flatMap((index) => [ir.edges[index].from, ir.edges[index].to]),
    );
    if (siblingHandoffs.size) {
      const targets = new Set(
        [...siblingHandoffs].flatMap((index) => [ir.edges[index].from, ir.edges[index].to]),
      );
      const rowHeight = Math.max(...[...targets].map((id) => sizes.get(id)!.height));
      for (const id of targets) {
        sizes.get(id)!.height = rowHeight;
        reserved.get(id)!.height = Math.max(rowHeight, reserved.get(id)!.height);
      }
    }
    const rankedEdges = graphIR.edges
      .map((edge, index) => ({ edge, index }))
      .filter(({ index }) => !siblingHandoffs.has(index));
    let graph = compoundLayout(
      siblingHandoffs.size ? { ...graphIR, edges: rankedEdges.map(({ edge }) => edge) } : graphIR,
      reserved,
      measure,
      siblingHandoffs.size
        ? {
            ...options,
            nodeSeparation: Math.max(
              options.nodeSeparation ?? fontSize * 2.1,
              ...ir.nodes
                .filter((node) => node.shape === "diamond")
                .map(
                  (node) =>
                    sizes.get(node.id)!.width -
                    Math.min(
                      ...ir.edges
                        .filter((edge) => edge.from === node.id)
                        .map((edge) => sizes.get(edge.to)!.width),
                    ) +
                    2 *
                      Math.max(
                        fontSize,
                        ...ir.edges
                          .filter((edge) => edge.from === node.id)
                          .map(
                            (edge) =>
                              measure(edge.label, { fontSize }).width +
                              2 * (options.edgeLabelPaddingX ?? 6),
                          ),
                      ),
                ),
            ),
          }
        : options,
      kind === "flowchart",
    );
    if (tableBudget !== undefined)
      graph = compactTableGraph(ir, reserved, measure, options, graph, kind === "er");
    if (siblingHandoffs.size) {
      const routes = rankedEdges.map(({ edge, index }, rankedIndex) => ({
        edge,
        index,
        route: graph.edge({ v: edge.from, w: edge.to, name: String(rankedIndex) }),
      }));
      for (const { edge } of routes) {
        for (const candidate of graph.outEdges(edge.from, edge.to) ?? [])
          graph.removeEdge(candidate);
      }
      for (const { edge, index, route } of routes)
        graph.setEdge(edge.from, edge.to, route, String(index));
      const decisions = ir.nodes.filter((node) => node.shape === "diamond");
      if (decisions.length === 1) {
        const targets = ir.edges
          .filter((edge) => edge.from === decisions[0].id)
          .map((edge) => graph.node(edge.to));
        if (targets.length > 1 && targets[0].x > targets.at(-1)!.x) {
          const axis =
            Math.min(
              ...ir.nodes.map((node) => graph.node(node.id).x - graph.node(node.id).width / 2),
            ) +
            Math.max(
              ...ir.nodes.map((node) => graph.node(node.id).x + graph.node(node.id).width / 2),
            );
          for (const id of graph.nodes()) graph.node(id).x = axis - graph.node(id).x;
          for (const descriptor of graph.edges()) {
            const route = graph.edge(descriptor);
            route.points = route.points.map((point: Point) => ({ ...point, x: axis - point.x }));
            if (typeof route.x === "number") route.x = axis - route.x;
          }
        }
      }
      let lane =
        Math.max(
          ...ir.nodes.map((node) => {
            const position = graph.node(node.id);
            return position.y + position.height / 2;
          }),
        ) + Math.max(24, (options.rankSeparation ?? fontSize * 3.2) / 2);
      for (const index of siblingHandoffs) {
        const edge = ir.edges[index],
          from = graph.node(edge.from),
          to = graph.node(edge.to);
        graph.setEdge(
          edge.from,
          edge.to,
          {
            points: [
              { x: from.x, y: from.y + from.height / 2 },
              { x: from.x, y: lane },
              { x: to.x, y: lane },
              { x: to.x, y: to.y + to.height / 2 },
            ],
            x: (from.x + to.x) / 2,
            y: lane,
          },
          String(index),
        );
        lane += Math.max(12, fontSize * 1.2);
      }
    }

    for (const [id, size] of sizes) {
      const n = graph.node(id),
        margin = noteMargins.get(id);
      if (margin && tableBudget === undefined) n.x += (margin.left - margin.right) / 2;
      if (margin && tableBudget !== undefined) n.y -= (margin.height + 20) / 2;
      n.width = size.width;
      n.height = size.height;
    }
    if (tableBudget !== undefined)
      for (const descriptor of graph.edges()) {
        if (descriptor.v === descriptor.w || kind === "er") continue;
        const route = graph.edge(descriptor),
          from = graph.node(descriptor.v),
          to = graph.node(descriptor.w);
        route.points[0] = { x: from.x, y: from.y };
        route.points[1].y = from.y;
        route.points.at(-1)!.x = to.x;
        route.points.at(-1)!.y = to.y;
        route.points.at(-2)!.y = to.y;
      }
    const nodesById = new Map(ir.nodes.map((node) => [node.id, node]));
    for (const [index, edge] of ir.edges.entries()) {
      const route = graph.edge({ v: edge.from, w: edge.to, name: String(index) });
      for (const [id, tipIndex, neighborIndex] of [
        [edge.from, 0, 1],
        [edge.to, route.points.length - 1, route.points.length - 2],
      ] as const) {
        const node = nodesById.get(id);
        const position = graph.node(id);
        const toward = route.points[neighborIndex];
        if (kind === "er" && tableBudget !== undefined) continue;
        if (toward)
          route.points[tipIndex] = intersectShape(
            nodeShape(node?.shape ?? "rect"),
            {
              x: position.x - position.width / 2,
              y: position.y - position.height / 2,
              width: position.width,
              height: position.height,
            },
            toward,
            options.radius,
          );
      }
    }
    for (const cluster of ir.clusters) {
      const n = graph.node(cluster.id);
      primitives.push({
        type: "shape",
        id: cluster.id,
        shape: "round",
        x: n.x - n.width / 2,
        y: n.y - n.height / 2,
        width: n.width,
        height: n.height,
        fill: "clusterFill",
        stroke: "clusterStroke",
        strokeRole: "frame",
        ...cluster.style,
      });
      text(
        cluster.label,
        n.x - n.width / 2 + (kind === "flowchart" ? padding / 2 : 10),
        n.y - n.height / 2 + (kind === "flowchart" ? padding / 2 : 4),
        undefined,
        "clusterText",
        headerSize,
        600,
      );
    }
    for (const parent of new Set(regionClusters.map((region) => region.parent))) {
      const outer = graph.node(parent!);
      const boxes = regionClusters
        .filter((region) => region.parent === parent)
        .map((region) => graph.node(region.id));
      const horizontal =
        Math.max(...boxes.map((box) => box.x)) - Math.min(...boxes.map((box) => box.x)) >=
        Math.max(...boxes.map((box) => box.y)) - Math.min(...boxes.map((box) => box.y));
      boxes.sort((a, b) => (horizontal ? a.x - b.x : a.y - b.y));
      for (let index = 1; index < boxes.length; index++) {
        const previous = boxes[index - 1],
          next = boxes[index];
        const position = horizontal
          ? (previous.x + previous.width / 2 + next.x - next.width / 2) / 2
          : (previous.y + previous.height / 2 + next.y - next.height / 2) / 2;
        primitives.push({
          type: "path",
          points: horizontal
            ? [
                { x: position, y: outer.y - outer.height / 2 + headerSize + padding },
                { x: position, y: outer.y + outer.height / 2 - padding / 2 },
              ]
            : [
                { x: outer.x - outer.width / 2 + padding / 2, y: position },
                { x: outer.x + outer.width / 2 - padding / 2, y: position },
              ],
          dash: [5, 4],
          stroke: "clusterStroke",
          strokeRole: "frame",
        });
      }
    }
    let feedbackX = 0,
      feedbackY = 0;
    for (const node of ir.nodes) {
      const position = graph.node(node.id);
      feedbackX = Math.max(feedbackX, position.x + position.width / 2);
      feedbackY = Math.max(feedbackY, position.y + position.height / 2);
    }
    feedbackX += Math.max(20, options.nodeSeparation ?? 40);
    const semanticEdgeIds = edgeSemanticIdentifiers(ir.edges);
    for (const [index, edge] of ir.edges.entries()) {
      const semanticStart = primitives.length;
      const e = graph.edge({ v: edge.from, w: edge.to, name: String(index) });
      // Route vertical feedback outside the graph so it cannot overlap the forward path.
      const from = graph.node(edge.from),
        to = graph.node(edge.to);
      const feedback =
        kind === "flowchart" &&
        ir.direction === "TB" &&
        !ir.clusters.length &&
        to.y < from.y &&
        !ir.nodes.some((node) => {
          if (node.id === edge.from || node.id === edge.to) return false;
          const position = graph.node(node.id);
          return [from, to].some(
            (endpoint) =>
              Math.abs(position.y - endpoint.y) < position.height / 2 &&
              position.x + position.width / 2 > endpoint.x + endpoint.width / 2,
          );
        });
      if (feedback) {
        const outerX = feedbackX;
        e.points = [
          { x: from.x + from.width / 2, y: from.y },
          { x: outerX, y: from.y },
          { x: outerX, y: to.y },
          { x: to.x + to.width / 2, y: to.y },
        ];
        e.x = outerX;
        e.y = (from.y + to.y) / 2;
      }
      const stateHorizontal =
        kind === "state" &&
        ir.direction === "LR" &&
        !ir.clusters.length &&
        Math.abs(from.y - to.y) < 0.01;
      if (stateHorizontal) {
        if (to.x > from.x) {
          e.points = [
            { x: from.x + from.width / 2, y: from.y },
            { x: to.x - to.width / 2, y: to.y },
          ];
          e.x = (from.x + from.width / 2 + to.x - to.width / 2) / 2;
          e.y = from.y - fontSize / 2 - 6;
        } else {
          const lane = feedbackY + Math.max(24, (options.rankSeparation ?? fontSize * 3.2) / 2);
          e.points = [
            { x: from.x, y: from.y + from.height / 2 },
            { x: from.x, y: lane },
            { x: to.x, y: lane },
            { x: to.x, y: to.y + to.height / 2 },
          ];
          e.x = (from.x + to.x) / 2;
          e.y = lane + fontSize / 2 + 6;
        }
      }
      const branchTurn =
        kind === "flowchart" &&
        ir.direction === "TB" &&
        nodesById.get(edge.from)?.shape === "diamond" &&
        from.y < to.y &&
        Math.abs(from.x - to.x) > 0.01 &&
        handoffTargets.has(edge.to);
      if (branchTurn) {
        const side = to.x < from.x ? -1 : 1;
        const exitX = from.x + (side * from.width) / 2;
        e.points = [
          { x: exitX, y: from.y },
          { x: to.x, y: from.y },
          { x: to.x, y: to.y - to.height / 2 },
        ];
        e.x = (exitX + to.x) / 2;
        e.y = from.y - fontSize / 2 - 6;
      }
      const straight =
        kind === "flowchart" &&
        ir.direction === "TB" &&
        !ir.clusters.length &&
        to.y > from.y &&
        Math.abs(from.x - to.x) < 0.01 &&
        !ir.nodes.some((node) => {
          if (node.id === edge.from || node.id === edge.to) return false;
          const position = graph.node(node.id);
          return (
            position.y > from.y &&
            position.y < to.y &&
            Math.abs(position.x - from.x) < position.width / 2
          );
        });
      if (straight) {
        e.points = [
          { x: from.x, y: from.y + from.height / 2 },
          { x: to.x, y: to.y - to.height / 2 },
        ];
        e.x = from.x;
        e.y = (from.y + from.height / 2 + to.y - to.height / 2) / 2;
      }
      primitives.push({
        type: "path",
        points: e.points,
        smooth:
          tableBudget === undefined &&
          !feedback &&
          !straight &&
          !branchTurn &&
          !stateHorizontal &&
          !siblingHandoffs.has(index),
        start: edge.start,
        end: edge.end,
        strokeRole: "edge",
        strokeWidth: edge.style?.strokeWidth ?? (edge.thick ? 3 : undefined),
        stroke: edge.style?.stroke,
        dash: edge.style?.dash ?? (edge.dashed ? [5, 4] : undefined),
        ...(["class", "er"].includes(kind)
          ? {
              semantic: {
                kind: "edge" as const,
                id: `relationship:${index}`,
                from: edge.from,
                to: edge.to,
                part: "body" as const,
              },
            }
          : {}),
      });
      if (edge.label) {
        const m = measure(edge.label, { fontSize });
        const labelPaddingX =
            kind === "flowchart" ? Math.max(0, options.edgeLabelPaddingX ?? 6) : 4,
          labelPaddingY = kind === "flowchart" ? Math.max(0, options.edgeLabelPaddingY ?? 3) : 2;
        primitives.push({
          type: "shape",
          shape: "round",
          x: e.x - m.width / 2 - labelPaddingX,
          y: e.y - m.height / 2 - labelPaddingY,
          width: m.width + labelPaddingX * 2,
          height: m.height + labelPaddingY * 2,
          fill: "edgeTextBackground",
          strokeWidth: 0,
          ...(["class", "er"].includes(kind)
            ? {
                semantic: {
                  kind: "edge" as const,
                  id: `relationship:${index}`,
                  from: edge.from,
                  to: edge.to,
                  part: "label" as const,
                },
              }
            : {}),
        });
        text(
          edge.label,
          e.x - m.width / 2,
          e.y - m.height / 2,
          undefined,
          edge.style?.stroke ?? "edgeText",
        );
        if (["class", "er"].includes(kind))
          primitives.at(-1)!.semantic = {
            kind: "edge",
            id: `relationship:${index}`,
            from: edge.from,
            to: edge.to,
            part: "label",
          };
      }
      tagPrimitiveRange(primitives, semanticStart, {
        kind: "edge",
        id: semanticEdgeIds[index],
        from: edge.from,
        to: edge.to,
        role: "connection",
      });
    }
    for (const node of ir.nodes) {
      const semanticStart = primitives.length;
      const n = graph.node(node.id);
      if (node.interaction)
        interactions.push({
          id: node.id,
          label: node.label,
          x: n.x - n.width / 2,
          y: n.y - n.height / 2,
          width: n.width,
          height: n.height,
          ...node.interaction,
        });
      if (typeof node.metadata?.icon === "string" || typeof node.metadata?.img === "string") {
        const metadata = node.metadata;
        const {
          label,
          metrics: m,
          height: mediaHeight,
          width: mediaWidth,
        } = mediaNodeMetrics(node, measure, fontSize, options);
        const labelAbove = metadata.pos === "t";
        const media = {
          x: n.x - mediaWidth / 2,
          y: n.y - n.height / 2 + (labelAbove && label ? m.height + 12 : 0),
          width: mediaWidth,
          height: mediaHeight,
        };
        if (typeof metadata.img === "string")
          primitives.push({ type: "image", asset: metadata.img, ...media, ...node.style });
        else {
          if (!options.resolveIcon)
            throw new Error(`Native icon resolver is required for ${metadata.icon}`);
          const resolved = options.resolveIcon(metadata.icon as string, media);
          if (!resolved) throw new Error(`Native icon is not registered: ${metadata.icon}`);
          if (metadata.form) {
            if (!["square", "rounded", "circle"].includes(String(metadata.form)))
              throw new Error(`Unsupported icon form: ${metadata.form}`);
            primitives.push({
              type: "shape",
              shape:
                metadata.form === "circle"
                  ? "circle"
                  : metadata.form === "rounded"
                    ? "round"
                    : "rect",
              ...media,
              fill: node.style?.fill ?? "nodeFill",
              strokeRole: "node",
              ...node.style,
            });
          }
          primitives.push(...resolved.map((primitive) => ({ ...primitive })));
        }
        if (label)
          text(
            label,
            n.x - m.width / 2,
            labelAbove ? n.y - n.height / 2 : media.y + media.height + 12,
            m.width,
            node.style?.color,
          );
        tagPrimitiveRange(primitives, semanticStart, {
          kind: "node",
          id: node.id,
          role: node.role ?? "node",
        });
        continue;
      }
      primitives.push({
        type: "shape",
        id: node.id,
        shape: node.role ? node.shape : nodeShape(node.shape),
        x: n.x - n.width / 2,
        y: n.y - n.height / 2,
        width: n.width,
        height: n.height,
        strokeRole: "node",
        ...node.style,
        ...(kind === "er"
          ? { stroke: node.style?.stroke ?? `palette:${ir.nodes.indexOf(node) + 1}` }
          : {}),
        ...(kind === "state" &&
        !node.role &&
        ir.nodes.filter((item) => !item.role).indexOf(node) > 0
          ? { fill: node.style?.fill ?? "paletteFill:1", stroke: node.style?.stroke ?? "palette:1" }
          : {}),
        ...(node.role
          ? {
              fill: node.role === "end" ? "paletteFill:0" : "nodeText",
              ...(node.role === "end" ? { stroke: "accent" } : {}),
            }
          : {}),
      });
      const outlined = ["class", "er", "state"].includes(kind) && !node.role;
      const background = primitives.at(-1)!;
      const outline =
        outlined && background.type === "shape"
          ? { ...background, fill: "transparent" }
          : undefined;
      if (outline && background.type === "shape") {
        background.strokeWidth = 0;
        delete background.id;
      }
      if (node.role === "end")
        primitives.push({
          type: "shape",
          shape: "circle",
          x: n.x - 4,
          y: n.y - 4,
          width: 8,
          height: 8,
          fill: "accent",
          strokeWidth: 0,
        });
      const sections = tableSections(kind, kind === "er" ? entityHeader(node) : node.label);
      const tableStyle = kind === "class" ? options.typeStyles?.class : options.typeStyles?.er;
      const cellX = styleSize(tableStyle?.cellPaddingX, 14),
        cellY = styleSize(tableStyle?.cellPaddingY, 9);
      if (sections && !node.style?.fill) {
        const measuredHeaderHeight =
          measure(sections[0], {
            fontSize: headerSize,
            fontWeight: 600,
            maxWidth: n.width - cellX * 2 + 1,
          }).height +
          cellY * 2;
        const headerHeight =
          kind === "er" && !node.attributes ? n.height : Math.min(n.height, measuredHeaderHeight);
        primitives.push({
          type: "shape",
          shape: "round",
          x: n.x - n.width / 2 + 1,
          y: n.y - n.height / 2 + 1,
          width: n.width - 2,
          height: headerHeight - 1,
          fill:
            kind === "er"
              ? `paletteFill:${ir.nodes.indexOf(node) + 1}`
              : ir.nodes.indexOf(node)
                ? "paletteFill:1"
                : "headerFill",
          strokeWidth: 0,
          radius: options.radius ?? 8,
        });
      }
      if (node.attributes) {
        const table = entityTables.get(node.id)!;
        const { columns, widths } = table;
        let y = n.y - n.height / 2 + cellY;
        text(
          table.title,
          n.x - n.width / 2 + cellX,
          y,
          undefined,
          node.style?.color ?? "headerText",
          headerSize,
          600,
        );
        primitives.at(-1)!.semantic = { kind: "node", id: node.id, part: "label", role: "header" };
        y = n.y - n.height / 2 + table.headerHeight;
        primitives.push({
          type: "path",
          points: [
            { x: n.x - n.width / 2, y },
            { x: n.x + n.width / 2, y },
          ],
          stroke: node.style?.stroke ?? "gridStroke",
          strokeWidth: node.style?.strokeWidth,
          strokeRole: "frame",
        });
        for (const [rowIndex, attribute] of node.attributes.entries()) {
          const rowTop = y;
          let x = n.x - n.width / 2;
          if (table.stackedAttributes) {
            const left = n.x - n.width / 2 + cellX;
            const keyMetrics = measure(attribute.key, { fontSize, fontWeight: 600 });
            const keyWidth = attribute.key ? keyMetrics.width + 12 : 0;
            if (attribute.key) {
              text(
                attribute.key,
                left,
                y + cellY,
                keyWidth - 12,
                node.style?.color ?? "nodeText",
                fontSize,
                600,
              );
              primitives.at(-1)!.semantic = {
                kind: "node",
                id: node.id,
                part: "label",
                role: "key",
                row: rowIndex,
              };
            }
            text(
              attribute.name,
              left + (table.keyOnOwnLine[rowIndex] ? 0 : keyWidth),
              y + cellY + (table.keyOnOwnLine[rowIndex] ? keyMetrics.height + 6 : 0),
              n.width - cellX * 2 - (table.keyOnOwnLine[rowIndex] ? 0 : keyWidth),
              node.style?.color ?? "nodeText",
            );
            primitives.at(-1)!.semantic = {
              kind: "node",
              id: node.id,
              part: "label",
              role: "name",
              row: rowIndex,
            };
            text(
              attribute.type,
              left,
              y + cellY + table.primaryHeights[rowIndex] + 6,
              n.width - cellX * 2,
              node.style?.color ?? "mutedText",
            );
            primitives.at(-1)!.semantic = {
              kind: "node",
              id: node.id,
              part: "label",
              role: "type",
              row: rowIndex,
            };
          } else
            for (const [index, column] of columns.entries()) {
              if (attribute[column]) {
                text(
                  attribute[column],
                  x + cellX,
                  y + cellY,
                  widths[index] - cellX * 2,
                  node.style?.color ??
                    (column === "key"
                      ? "nodeText"
                      : column === "type" || column === "comment"
                        ? "mutedText"
                        : "nodeText"),
                  fontSize,
                  column === "key" ? 600 : 400,
                );
                primitives.at(-1)!.semantic = {
                  kind: "node",
                  id: node.id,
                  part: "label",
                  role: column,
                  row: rowIndex,
                };
              }
              x += widths[index];
            }
          if (table.stackedComments) {
            let columnX = n.x - n.width / 2;
            for (const width of widths.slice(0, -1)) {
              columnX += width;
              primitives.push({
                type: "path",
                points: [
                  { x: columnX, y: rowTop },
                  { x: columnX, y: rowTop + table.dataHeights[rowIndex] },
                ],
                stroke: node.style?.stroke ?? "gridStroke",
                strokeRole: "grid",
              });
            }
            if (attribute.comment) {
              const commentY = rowTop + table.dataHeights[rowIndex];
              primitives.push({
                type: "path",
                points: [
                  { x: n.x - n.width / 2, y: commentY },
                  { x: n.x + n.width / 2, y: commentY },
                ],
                stroke: node.style?.stroke ?? "gridStroke",
                strokeRole: "grid",
              });
              text(
                attribute.comment,
                n.x - n.width / 2 + cellX,
                commentY + cellY,
                n.width - cellX * 2,
                node.style?.color ?? "mutedText",
              );
              primitives.at(-1)!.semantic = {
                kind: "node",
                id: node.id,
                part: "label",
                role: "comment",
                row: rowIndex,
              };
            }
          }
          y += table.rowHeights[rowIndex];
          if (attribute !== node.attributes.at(-1))
            primitives.push({
              type: "path",
              points: [
                { x: n.x - n.width / 2, y },
                { x: n.x + n.width / 2, y },
              ],
              stroke: node.style?.stroke ?? "gridStroke",
              strokeWidth: node.style?.strokeWidth,
              strokeRole: "grid",
            });
        }
        let columnX = n.x - n.width / 2;
        for (const width of table.stackedComments ? [] : widths.slice(0, -1)) {
          columnX += width;
          primitives.push({
            type: "path",
            points: [
              { x: columnX, y: n.y - n.height / 2 + table.headerHeight },
              { x: columnX, y: n.y + n.height / 2 },
            ],
            stroke: node.style?.stroke ?? "gridStroke",
            strokeWidth: node.style?.strokeWidth,
            strokeRole: "grid",
          });
        }
      } else if (sections) {
        let y = n.y - n.height / 2;
        for (const [index, section] of sections.entries()) {
          const size = index ? fontSize : headerSize,
            weight = index ? 400 : 600;
          const m = measure(section, {
            fontSize: size,
            fontWeight: weight,
            maxWidth: n.width - cellX * 2 + 1,
          });
          if (section) {
            let rowY = y + cellY;
            const rows = kind === "class" && index > 0 ? section.split("\n") : [section];
            for (const [rowIndex, row] of rows.entries()) {
              const metrics = text(
                row,
                (kind === "class" && index === 0) || (kind === "er" && !node.attributes)
                  ? n.x - m.width / 2
                  : n.x - n.width / 2 + cellX,
                kind === "er" && !node.attributes ? n.y - m.height / 2 : rowY,
                (kind === "class" && index === 0) || (kind === "er" && !node.attributes)
                  ? m.width
                  : n.width - cellX * 2,
                node.style?.color ?? (index ? "nodeText" : "headerText"),
                size,
                weight,
              );
              primitives.at(-1)!.semantic = {
                kind: "node",
                id: node.id,
                part: "label",
                role: index === 0 ? "header" : index === 1 ? "attribute" : "method",
                row: rowIndex,
              };
              rowY += metrics.height;
            }
            if (kind === "class" && index > 0) m.height = rowY - y - cellY;
          }
          y += m.height + cellY * 2;
          if (index < sections.length - 1)
            primitives.push({
              type: "path",
              points: [
                { x: n.x - n.width / 2, y },
                { x: n.x + n.width / 2, y },
              ],
              stroke: node.style?.stroke ?? "gridStroke",
              strokeWidth: node.style?.strokeWidth,
              strokeRole: "frame",
            });
        }
      } else {
        const m = measure(node.label, { fontSize });
        text(node.label, n.x - m.width / 2, n.y - m.height / 2, m.width, node.style?.color);
      }
      if (outline) primitives.push(outline);
      tagPrimitiveRange(primitives, semanticStart, {
        kind: "node",
        id: node.id,
        role: node.role ?? "node",
      });
    }
    const noteOffsets = new Map<string, number>();
    for (const note of ir.events.filter(
      (e) => e.type === "state-note" || (e.type === "class-note" && e.from),
    )) {
      const n = graph.node(note.from!);
      const m = measure(note.label, {
        fontSize,
        ...(tableBudget === undefined ? {} : { maxWidth: tableBudget - 20 }),
      });
      const side = note.flags?.[0] === "left" ? "left" : "right",
        stackKey = tableBudget === undefined ? `${note.from}:${side}` : note.from!,
        stackHeight = noteMargins.get(note.from!)![side === "left" ? "leftHeight" : "rightHeight"],
        stackOffset = noteOffsets.get(stackKey) ?? 0;
      const noteRect = {
        x:
          tableBudget === undefined
            ? note.flags?.[0] === "left"
              ? n.x - n.width / 2 - m.width - 40
              : n.x + n.width / 2 + 20
            : n.x - (m.width + 20) / 2,
        y:
          tableBudget === undefined
            ? n.y - stackHeight / 2 + stackOffset
            : n.y + n.height / 2 + 20 + stackOffset,
        width: m.width + 20,
        height: m.height + 16,
      };
      noteOffsets.set(stackKey, stackOffset + noteRect.height + 12);
      const noteCenter = {
        x: noteRect.x + noteRect.width / 2,
        y: noteRect.y + noteRect.height / 2,
      };
      const node = nodesById.get(note.from!);
      // Attach notes to the visible silhouettes, never the reserved layout box.
      // The shaft precedes the note surface so it cannot cover note text.
      path(
        [
          intersectShape(
            node?.shape ?? "round",
            {
              x: n.x - n.width / 2,
              y: n.y - n.height / 2,
              width: n.width,
              height: n.height,
            },
            noteCenter,
            options.radius ?? 8,
          ),
          intersectShape("rect", noteRect, { x: n.x, y: n.y }),
        ],
        true,
      );
      shape(
        note.label,
        noteRect.x,
        noteRect.y,
        noteRect.width,
        noteRect.height,
        "rect",
        "noteFill",
      );
    }
    let freeNoteY =
      Math.max(
        0,
        ...ir.nodes.map((node) => {
          const n = graph.node(node.id);
          return n.y + n.height / 2;
        }),
      ) + padding;
    for (const note of ir.events.filter((event) => event.type === "class-note" && !event.from)) {
      const m = measure(note.label, { fontSize });
      shape(note.label, padding, freeNoteY, m.width + 20, m.height + 16, "rect", "noteFill");
      freeNoteY += m.height + 16 + padding;
    }
  } else if (kind === "sequence") {
    let messageOrdinal = -1;
    const messageOrderByY = new Map<number, number>();
    const tagSequence = (
      range: Primitive[],
      role: string,
      row: number,
      id: string,
      from?: string,
      to?: string,
    ) => {
      for (const primitive of range)
        primitive.semantic = {
          kind: role === "participant" ? "node" : role === "frame" ? "frame" : "edge",
          id,
          role,
          row,
          group: id,
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
          part: primitive.type === "text" ? "label" : "body",
        };
    };
    const sequenceStyle = options.typeStyles?.sequence;
    const participantWidth = styleSize(sequenceStyle?.participantWidth, 104, 64);
    const activationWidth = styleSize(sequenceStyle?.activationWidth, 8, 4, 24);
    const creationAllowance = ir.events.some((event) => event.type === "create")
      ? Math.max(
          participantWidth,
          ...ir.nodes.map(
            (node) => measure(node.label, { fontSize: headerSize, fontWeight: 600 }).width + 28,
          ),
        ) / 2
      : 0;
    const messageWidth = Math.max(
      104,
      ...ir.events.map((e) => measure(e.label, { fontSize }).width + 28 + creationAllowance),
    );
    const spacing = Math.max(
      styleSize(sequenceStyle?.laneGap, 144, 96),
      messageWidth,
      ...ir.nodes.map(
        (node) => measure(node.label, { fontSize: headerSize, fontWeight: 600 }).width + 36,
      ),
    );
    const headerHeight = Math.max(
      44,
      ...ir.nodes.map(
        (node) =>
          measure(node.label, { fontSize: headerSize, fontWeight: 600 }).height +
          (node.shape === "circle" ||
          ["boundary", "control", "entity"].includes(node.sequence?.type ?? "")
            ? 56
            : 24),
      ),
    );
    const boxBand = ir.clusters.length
      ? Math.max(...ir.clusters.map((c) => measure(c.label, { fontSize }).height)) + 16
      : 0;
    const headerY = padding + boxBand;
    const linkBand = Math.max(
      0,
      ...ir.nodes.map((node) =>
        (node.sequence?.links ?? []).reduce(
          (sum, link) => sum + measure(link.label, { fontSize }).height + 6,
          0,
        ),
      ),
    );
    const firstRow = headerY + headerHeight + 32 + linkBand;
    const participantWidths = new Map(
      ir.nodes.map((n) => [
        n.id,
        Math.max(
          participantWidth,
          measure(n.label, { fontSize: headerSize, fontWeight: 600 }).width + 28,
        ),
      ]),
    );
    const halfHeader = Math.max(participantWidth, ...participantWidths.values()) / 2;
    const xs = new Map(ir.nodes.map((n, i) => [n.id, padding + halfHeader + i * spacing]));
    const drawParticipant = (n: (typeof ir.nodes)[number], participantY: number) => {
      const participantStart = primitives.length;
      const x = xs.get(n.id)!;
      const symbol = n.sequence?.type;
      if (symbol && ["boundary", "control", "entity"].includes(symbol)) {
        primitives.push({
          type: "shape",
          shape: "circle",
          x: x - 12,
          y: participantY + 4,
          width: 24,
          height: 24,
          strokeRole: "node",
        });
        if (symbol === "boundary") {
          path([
            { x: x - 22, y: participantY + 16 },
            { x: x - 12, y: participantY + 16 },
          ]);
          path([
            { x: x - 22, y: participantY + 4 },
            { x: x - 22, y: participantY + 28 },
          ]);
        } else if (symbol === "entity")
          path([
            { x: x - 14, y: participantY + 32 },
            { x: x + 14, y: participantY + 32 },
          ]);
        else
          primitives.push({
            type: "path",
            points: [
              { x: x + 5, y: participantY + 6 },
              { x: x - 2, y: participantY + 1 },
              { x: x - 7, y: participantY + 6 },
            ],
            end: "arrow",
            strokeRole: "edge",
          });
        const m = measure(n.label, { fontSize: headerSize, fontWeight: 600 });
        text(n.label, x - m.width / 2, participantY + 38, m.width, "headerText", headerSize, 600);
      } else if (n.shape === "circle" && !symbol) {
        primitives.push({
          type: "shape",
          shape: "circle",
          x: x - 8,
          y: participantY,
          width: 16,
          height: 16,
          strokeRole: "node",
        });
        path([
          { x, y: participantY + 16 },
          { x, y: participantY + 36 },
        ]);
        path([
          { x: x - 15, y: participantY + 24 },
          { x: x + 15, y: participantY + 24 },
        ]);
        path([
          { x: x - 12, y: participantY + 48 },
          { x, y: participantY + 36 },
          { x: x + 12, y: participantY + 48 },
        ]);
        const m = measure(n.label, { fontSize: headerSize, fontWeight: 600 });
        text(n.label, x - m.width / 2, participantY + 52, m.width, "headerText", headerSize, 600);
      } else {
        const width = participantWidths.get(n.id)!,
          m = measure(n.label, { fontSize: headerSize, fontWeight: 600 });
        if (symbol === "collections")
          primitives.push({
            type: "shape",
            shape: "rect",
            x: x - width / 2 + 5,
            y: participantY - 5,
            width,
            height: headerHeight,
            fill: "headerFill",
            strokeRole: "node",
          });
        primitives.push({
          type: "shape",
          shape:
            symbol === "database"
              ? "cylinder"
              : symbol === "queue"
                ? "stadium"
                : symbol === "collections"
                  ? "rect"
                  : "round",
          x: x - width / 2,
          y: participantY,
          width,
          height: headerHeight,
          fill: ir.nodes.indexOf(n) ? `paletteFill:${ir.nodes.indexOf(n)}` : "headerFill",
          stroke: ir.nodes.indexOf(n) ? `palette:${ir.nodes.indexOf(n)}` : "nodeStroke",
          strokeRole: "node",
        });
        text(
          n.label,
          x - m.width / 2,
          participantY + (headerHeight - m.height) / 2,
          m.width,
          "headerText",
          headerSize,
          600,
        );
      }
      for (const [index, link] of (n.sequence?.links ?? []).entries()) {
        const m = measure(link.label, { fontSize });
        const linkY = participantY + headerHeight + 6 + index * (m.height + 6);
        text(link.label, x - m.width / 2, linkY, m.width, "accent");
        interactions.push({
          id: `${n.id}-link-${index}`,
          label: link.label,
          x: x - m.width / 2 - 6,
          y: linkY - 3,
          width: m.width + 12,
          height: m.height + 6,
          kind: "link",
          target: link.url,
        });
      }
      tagSequence(primitives.slice(participantStart), "participant", messageOrdinal, n.id);
    };
    const created = new Set(
      ir.events.filter((event) => event.type === "create").map((event) => event.from),
    );
    const lineById = new Map<string, Extract<Primitive, { type: "path" }>>();
    for (const n of ir.nodes) {
      const x = xs.get(n.id)!;
      if (!created.has(n.id)) drawParticipant(n, headerY);
      const lifeline: Extract<Primitive, { type: "path" }> = {
        type: "path",
        points: [
          { x, y: headerY + headerHeight },
          { x, y: firstRow },
        ],
        dash: [4, 5],
        stroke: "clusterStroke",
        strokeRole: "grid",
        semantic: { kind: "edge", id: `lifeline:${n.id}`, role: "lifeline", group: n.id },
      };
      primitives.push(lifeline);
      lineById.set(n.id, lifeline);
    }
    let y = firstRow;
    const pendingCreation = new Set<string>();
    const pendingDestruction = new Set<string>();
    const destructionY = new Map<string, number>();
    const frames: { y: number; label: string; depth: number; fill?: string }[] = [];
    const activations = new Map<string, number[]>();
    const backgrounds: Primitive[] = [];
    const sequenceNotes: Primitive[] = [];
    let lastMessageY = firstRow;
    const sequenceRow = (event: DiagramIR["events"][number]) =>
      Math.max(
        44,
        measure(event.label, { fontSize }).height + styleSize(sequenceStyle?.rowGap, 24, 16),
      );
    for (const [eventIndex, event] of ir.events.entries()) {
      const x = xs.get(event.from ?? "") ?? padding;
      const target = xs.get(event.to ?? "") ?? x;
      const row = sequenceRow(event);
      if (event.type === "create") {
        pendingCreation.add(event.from!);
        continue;
      }
      if (event.type === "destroy") {
        pendingDestruction.add(event.from!);
        continue;
      }
      if (event.type === "activate") {
        const starts = activations.get(event.from!) ?? [];
        const previous = ir.events[eventIndex - 1],
          next = ir.events[eventIndex + 1];
        starts.push(
          event.flags?.includes("message") && next?.type === "message"
            ? y + sequenceRow(next) - 8 + (next.from === next.to ? 24 : 0)
            : previous?.type === "message" && previous.to === event.from
              ? lastMessageY
              : y,
        );
        activations.set(event.from!, starts);
        continue;
      }
      if (event.type === "deactivate") {
        const starts = activations.get(event.from!);
        const start = starts?.pop();
        if (start === undefined) throw new Error("Unmatched sequence deactivation");
        primitives.push({
          type: "shape",
          shape: "rect",
          x: x - activationWidth / 2 + (starts?.length ?? 0) * activationWidth * 0.6,
          y: start,
          width: activationWidth,
          height: Math.max(
            10,
            (ir.events[eventIndex - 1]?.type === "message" &&
            ir.events[eventIndex - 1].from === event.from
              ? lastMessageY
              : y) - start,
          ),
          fill: "accent",
          strokeWidth: 0,
          semantic: {
            kind: "edge",
            id: `activation:${event.from}:${start}`,
            role: "activation",
            row: messageOrderByY.get(start) ?? 0,
            group: event.from,
          },
        });
        continue;
      }
      if (event.type === "frame") {
        frames.push({
          y,
          label: event.flags?.[0] === "rect" ? "" : event.label,
          depth: event.depth ?? 1,
          fill: event.flags?.[0] === "rect" ? event.flags[1] : undefined,
        });
        y += row;
        continue;
      }
      if (event.type === "end") {
        const f = frames.pop();
        if (f) {
          backgrounds.push({
            type: "shape",
            shape: "rect",
            x: padding / 2 + f.depth * 12,
            y: f.y,
            width: Math.max(spacing, ir.nodes.length * spacing - 80) - f.depth * 24,
            height: y - f.y,
            fill: f.fill ?? "transparent",
            stroke: "clusterStroke",
            strokeRole: "frame",
          });
          text(f.label, padding + f.depth * 4, f.y + 6, undefined, "headerText", headerSize, 600);
        }
        continue;
      }
      if (event.type === "separator") {
        const depth = frames.at(-1)?.depth ?? 1;
        const left = padding / 2 + depth * 12;
        const right = left + Math.max(spacing, ir.nodes.length * spacing - 80) - depth * 24;
        path(
          [
            { x: left, y },
            { x: right, y },
          ],
          true,
        );
        text(event.label, left + 8, y + 4);
      }
      if (event.type === "note") {
        const placement = event.flags?.[0] ?? "over";
        const noteWidth = Math.max(
          130,
          measure(event.label, { fontSize }).width + 20,
          placement === "over" ? Math.abs(target - x) + 130 : 0,
        );
        const noteX =
          placement === "left of"
            ? x - noteWidth - 20
            : placement === "right of"
              ? x + 20
              : Math.min(x, target) - 65;
        const noteStart = primitives.length;
        shape(
          event.label,
          noteX,
          y,
          noteWidth,
          measure(event.label, { fontSize }).height + 16,
          "rect",
          "noteFill",
        );
        tagSequence(
          primitives.slice(noteStart),
          "note",
          Math.max(0, messageOrdinal),
          `note:${eventIndex}`,
        );
        sequenceNotes.push(...primitives.splice(noteStart));
      }
      if (event.type === "message") {
        const arrowY = y + row - 8;
        messageOrdinal++;
        const arrivalY = arrowY + (x === target ? 24 : 0);
        messageOrderByY.set(arrivalY, messageOrdinal);
        lastMessageY = arrivalY;
        const createdHere = new Set(pendingCreation);
        for (const id of pendingCreation) {
          const node = ir.nodes.find((node) => node.id === id)!;
          drawParticipant(node, arrowY - headerHeight / 2);
          lineById.get(id)!.points[0].y = arrowY + headerHeight / 2;
        }
        pendingCreation.clear();
        for (const id of pendingDestruction) {
          const destructionStart = primitives.length;
          destructionY.set(id, arrowY);
          const x = xs.get(id)!;
          path([
            { x: x - 7, y: arrowY - 7 },
            { x: x + 7, y: arrowY + 7 },
          ]);
          path([
            { x: x - 7, y: arrowY + 7 },
            { x: x + 7, y: arrowY - 7 },
          ]);
          tagSequence(
            primitives.slice(destructionStart),
            "destruction",
            messageOrdinal,
            `destruction:${id}`,
            event.from,
            id,
          );
        }
        pendingDestruction.clear();
        const activityContact = (id: string, toward: number, includePending = false) => {
          const center = xs.get(id)!;
          const contactY = includePending ? arrivalY : arrowY;
          const next = ir.events[eventIndex + 1];
          const receivesExplicitActivation =
            includePending &&
            event.to === id &&
            next?.type === "activate" &&
            next.from === id &&
            !next.flags?.includes("message");
          const depth =
            (activations.get(id) ?? []).filter((start) => start <= contactY + 0.001).length +
            (receivesExplicitActivation ? 1 : 0);
          return depth
            ? center +
                (depth - 1) * activationWidth * 0.6 +
                ((toward >= center ? 1 : -1) * activationWidth) / 2
            : center;
        };
        const sender = activityContact(event.from!, x === target ? x + 1 : target);
        const createdTarget = createdHere.has(event.to!)
          ? ir.nodes.find((node) => node.id === event.to)
          : undefined;
        const receiver =
          createdTarget && (createdTarget.shape !== "circle" || createdTarget.sequence?.type)
            ? target + ((x < target ? -1 : 1) * participantWidths.get(event.to!)!) / 2
            : activityContact(event.to!, x === target ? target + 1 : x, true);
        const points =
          x === target
            ? [
                { x: sender, y: y + row - 8 },
                { x: Math.max(sender, receiver) + 70, y: y + row - 8 },
                { x: Math.max(sender, receiver) + 70, y: y + row + 16 },
                { x: receiver, y: y + row + 16 },
              ]
            : [
                { x: sender, y: y + row - 8 },
                { x: receiver, y: y + row - 8 },
              ];
        primitives.push({
          type: "path",
          points,
          strokeRole: "edge",
          start: event.flags?.[0].startsWith("<<") ? "arrow" : "none",
          end: event.flags?.[0].includes("x")
            ? "cross"
            : event.flags?.[0].endsWith(")")
              ? "open"
              : event.flags?.[0].endsWith(">>")
                ? "arrow"
                : "none",
          dash: event.flags?.[0].includes("--") ? [5, 4] : undefined,
          semantic: {
            kind: "edge",
            id: `message:${messageOrdinal}`,
            role: "message",
            row: messageOrdinal,
            group: `message:${messageOrdinal}`,
            from: event.from,
            to: event.to,
            part: "body",
          },
        });
        const labelStart = primitives.length;
        const labelLifeline = x <= target ? event.from! : event.to!;
        const labelDepth = activations.get(labelLifeline)?.length ?? 0;
        const labelInset = labelDepth
          ? (labelDepth - 1) * activationWidth * 0.6 + activationWidth / 2
          : 0;
        text(event.label, Math.min(x, target) + labelInset + 8, y);
        tagSequence(
          primitives.slice(labelStart),
          "message",
          messageOrdinal,
          `message:${messageOrdinal}`,
          event.from,
          event.to,
        );
      }
      y += row + (x === target && event.type === "message" ? 24 : 0);
    }
    for (const [id, starts] of activations)
      for (const [depth, start] of starts.entries())
        primitives.push({
          type: "shape",
          shape: "rect",
          x: xs.get(id)! - activationWidth / 2 + depth * activationWidth * 0.6,
          y: start,
          width: activationWidth,
          height: Math.max(10, y - start),
          fill: "accent",
          strokeWidth: 0,
          semantic: {
            kind: "edge",
            id: `activation:${id}:${start}`,
            role: "activation",
            row: messageOrderByY.get(start) ?? 0,
            group: id,
          },
        });
    for (const [id, lifeline] of lineById) lifeline.points[1].y = destructionY.get(id) ?? y + 16;
    const belongs = (node: (typeof ir.nodes)[number], id: string) => {
      let parent = node.parent;
      while (parent) {
        if (parent === id) return true;
        parent = ir.clusters.find((c) => c.id === parent)?.parent;
      }
      return false;
    };
    const groups: Primitive[] = [];
    for (const cluster of ir.clusters) {
      const members = ir.nodes.filter((n) => belongs(n, cluster.id));
      if (!members.length) continue;
      const left =
        Math.min(...members.map((n) => xs.get(n.id)! - participantWidths.get(n.id)! / 2)) - 12;
      const right =
        Math.max(...members.map((n) => xs.get(n.id)! + participantWidths.get(n.id)! / 2)) + 12;
      groups.push({
        type: "shape",
        shape: "rect",
        x: left,
        y: padding,
        width: right - left,
        height: y - padding + 16,
        fill: cluster.style?.fill ?? "clusterFill",
        stroke: "clusterStroke",
        strokeRole: "frame",
      });
      const m = measure(cluster.label, { fontSize });
      groups.push({
        type: "text",
        text: cluster.label,
        x: left + 8,
        y: padding + 4,
        width: m.width,
        height: m.height,
        fontSize,
        color: "clusterText",
        ...(m.lineBaselines ? { lineBaselines: m.lineBaselines.slice(0, m.lines.length) } : {}),
      });
    }
    tagSequence([...groups, ...backgrounds], "frame", 0, "sequence-frames");
    primitives.unshift(...groups, ...backgrounds);
    primitives.push(...sequenceNotes);
  } else
    layoutChart(ir, kind, primitives, fontSize, measure, options, interactions, originalMeasure);
  if (ir.title) {
    const titleWidth = options.viewportWidth
      ? Math.max(48, options.viewportWidth - padding * 3)
      : undefined;
    let title = originalMeasure(ir.title, {
      fontSize: titleSize,
      fontWeight: 600,
      ...(titleWidth ? { maxWidth: titleWidth } : {}),
    });
    // Keep short trailing words with their context without shrinking the font.
    if (titleWidth && title.lines.length > 1) {
      const last = originalMeasure(title.lines.at(-1)!, { fontSize: titleSize, fontWeight: 600 });
      if (last.width < titleWidth * 0.3) {
        const lines = title.lines.length;
        for (let attempt = 1; attempt <= 4; attempt++) {
          const balanced = originalMeasure(ir.title, {
            fontSize: titleSize,
            fontWeight: 600,
            maxWidth: titleWidth * (1 - attempt * 0.08),
          });
          if (balanced.lines.length > lines) break;
          title = balanced;
        }
      }
    }
    const band = title.height + 16;
    for (let index = 0; index < interactions.length; index++)
      interactions[index] = translateInteraction(interactions[index], 0, band);
    for (let index = 0; index < primitives.length; index++)
      primitives[index] = translatePrimitive(primitives[index], 0, band);
    primitives.push({
      type: "text",
      text: ir.title,
      x: padding,
      y: 0,
      width: title.width,
      height: title.height,
      fontSize: titleSize,
      fontWeight: 600,
      color: "nodeText",
      lineRuns: runsForLines(ir.title, title.lines),
      ...(title.lineBaselines ? { lineBaselines: [...title.lineBaselines] } : {}),
      semantic: { kind: "frame", id: "diagram-title", role: "title", part: "label" },
    });
  }
  let minX = 0,
    minY = 0,
    maxX = 1,
    maxY = 1;
  const include = (x: number, y: number) => {
    minX = Math.min(minX, x - padding);
    minY = Math.min(minY, y - padding);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };
  for (const primitive of primitives) {
    if (primitive.type === "path") {
      for (const point of primitive.points) include(point.x, point.y);
      if (primitive.curves || primitive.smooth)
        for (const segment of primitive.curves ?? curveSegments(primitive.points)) {
          include(segment.control1.x, segment.control1.y);
          include(segment.control2.x, segment.control2.y);
        }
    } else {
      include(primitive.x, primitive.y);
      include(primitive.x + primitive.width, primitive.y + primitive.height);
    }
  }
  const width = maxX - minX + padding,
    height = maxY - minY + padding;
  if (![width, height].every(Number.isFinite) || width > 100000 || height > 100000)
    throw new Error("Invalid or excessive layout bounds");
  return {
    kind,
    bounds: { x: minX, y: minY, width, height },
    primitives,
    ...(interactions.length ? { interactions } : {}),
    accessibilityLabel:
      [ir.title, ir.description].filter(Boolean).join(". ") ||
      `${kind} diagram, ${ir.nodes.length} nodes, ${ir.edges.length} edges, ${ir.events.length} events`,
  };
}

function tableSections(kind: Scene["kind"], label: string): string[] | undefined {
  const lines = label.split("\n");
  const title =
    kind === "class" && lines[0].startsWith("«") ? lines.splice(0, 2).join("\n") : lines.shift()!;
  const members = lines;
  if (kind === "class")
    return [
      title,
      members.filter((member) => !member.includes("(")).join("\n"),
      members.filter((member) => member.includes("(")).join("\n"),
    ].filter((section, index) => index === 0 || section.length > 0);
  if (kind === "er") return [label];
  return undefined;
}
function layoutChart(
  ir: DiagramIR,
  kind: Scene["kind"],
  primitives: Primitive[],
  fontSize: number,
  measure: TextMeasurer,
  options: LayoutOptions,
  interactions: NonNullable<Scene["interactions"]>,
  unboundedMeasure: TextMeasurer = measure,
): void {
  const headerSize = fontSize * styleSize(options.headerScale, 1.08, 1, 1.5);
  const text = (
    value: string,
    x: number,
    y: number,
    color?: string,
    size = fontSize,
    weight = 400,
  ) => {
    const m = measure(value, { fontSize: size, fontWeight: weight });
    primitives.push({
      type: "text",
      text: value,
      x,
      y,
      width: m.width,
      height: m.height,
      fontSize: size,
      ...(weight !== 400 ? { fontWeight: weight } : {}),
      color,
      lineRuns: runsForLines(value, m.lines),
      ...(m.lineBaselines ? { lineBaselines: m.lineBaselines.slice(0, m.lines.length) } : {}),
    });
  };
  const box = (
    label: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fill?: string,
    border = true,
    radius?: number,
  ) => {
    const primitive: Extract<Primitive, { type: "shape" }> = {
      type: "shape",
      shape: "round",
      x,
      y,
      width,
      height,
      fill,
      strokeRole: "node",
      ...(!border ? { strokeWidth: 0 } : {}),
      ...(radius !== undefined ? { radius } : {}),
    };
    primitives.push(primitive);
    if (label)
      text(
        label,
        x + 8,
        y + 8,
        fill?.startsWith("palette:") ? fill.replace("palette:", "paletteText:") : undefined,
      );
    return primitive;
  };
  const path = (
    points: Point[],
    stroke?: string,
    role: "edge" | "grid" | "frame" | "series" = "edge",
  ) => primitives.push({ type: "path", points, stroke, strokeRole: role });
  if (kind === "pie") {
    layoutPie(ir, primitives, fontSize, unboundedMeasure, options, interactions);
    return;
  }
  if (kind === "gitgraph") {
    const style = options.typeStyles?.gitgraph;
    const config = (
      ir.data?.config as
        | {
            gitGraph?: {
              showCommitLabel?: boolean;
              showBranches?: boolean;
              mainBranchOrder?: number;
              mainBranchName?: string;
            };
          }
        | undefined
    )?.gitGraph;
    const showCommitLabels = config?.showCommitLabel !== false;
    const dotRadius = styleSize(style?.commitRadius, 6, 4, 20);
    const branchOptions = ir.data?.gitBranches as Record<string, { order: number }> | undefined;
    const declared = ir.data?.gitBranchDeclarations as string[] | undefined;
    const mainBranch = config?.mainBranchName ?? "main";
    const branches = [...new Set([...(declared ?? []), ...ir.events.map((e) => e.from)])]
      .map((branch) => ({
        branch,
        order:
          branch === mainBranch
            ? (config?.mainBranchOrder ?? 0)
            : (branchOptions?.[branch ?? ""]?.order ?? 0),
      }))
      .sort((a, b) => a.order - b.order)
      .map((item) => item.branch);
    const nodeById = new Map(ir.nodes.map((node) => [node.id, node]));
    const eventById = new Map(ir.events.map((event) => [event.label, event]));
    const labelFor = (id: string) => nodeById.get(id)?.label ?? id;
    const tagFor = (id: string): string => {
      const tags = nodeById.get(id)?.metadata?.tags;
      return Array.isArray(tags)
        ? tags.filter((tag): tag is string => typeof tag === "string").join("\n")
        : "";
    };
    const columnWidth = Math.max(
      styleSize(style?.columnGap, 72, 40),
      ...ir.events.map(
        (e) =>
          Math.max(
            showCommitLabels ? measure(labelFor(e.label), { fontSize }).width : 0,
            tagFor(e.label) ? (measure(tagFor(e.label), { fontSize }).width + 16) / 0.8 : 0,
            measure(String(nodeById.get(e.label)?.metadata?.message ?? ""), { fontSize }).width,
          ) + 28,
      ),
    );
    const rowHeight = Math.max(
      styleSize(style?.laneGap, 68, 48),
      ...ir.events.map(
        (e) =>
          measure(labelFor(e.label), { fontSize }).height +
          (tagFor(e.label) ? measure(tagFor(e.label), { fontSize }).height + 14 : 0) +
          (nodeById.get(e.label)?.metadata?.message
            ? measure(String(nodeById.get(e.label)?.metadata?.message), { fontSize }).height + 6
            : 0) +
          48,
      ),
      ...branches.map((branch) => measure(branch ?? "", { fontSize }).height + 24),
    );
    const left = Math.max(
      100,
      ...branches.map((branch) => measure(branch ?? "", { fontSize }).width + 40),
    );
    if (
      options.viewportWidth &&
      left + Math.max(1, ir.events.length) * columnWidth > options.viewportWidth
    ) {
      primitives.push(...narrowGitgraph(ir, branches, unboundedMeasure, options, dotRadius));
      return;
    }
    const baseY = Math.max(
      80,
      ...ir.events.map(
        (event) =>
          (tagFor(event.label) ? measure(tagFor(event.label), { fontSize }).height : 0) +
          dotRadius +
          30,
      ),
    );
    const positions = new Map<string, Point>();
    for (const [index, event] of ir.events.entries())
      positions.set(event.label, {
        x: left + index * columnWidth,
        y: baseY + branches.indexOf(event.from) * rowHeight,
      });
    const commitContact = (id: string, toward: Point) => {
      const center = positions.get(id)!;
      const highlighted = eventById.get(id)?.flags?.includes("HIGHLIGHT");
      const radius = dotRadius + (highlighted ? 4 : 0);
      return intersectShape(
        highlighted ? "rect" : "circle",
        { x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2 },
        toward,
        options.radius,
      );
    };
    for (const edge of ir.edges) {
      const from = positions.get(edge.from)!,
        to = positions.get(edge.to)!;
      const route =
        from.y === to.y
          ? [from, to]
          : [
              from,
              { x: from.x + (to.x - from.x) / 3, y: from.y },
              { x: to.x - (to.x - from.x) / 3, y: to.y },
              to,
            ];
      route[0] = commitContact(edge.from, route[1]);
      route[route.length - 1] = commitContact(edge.to, route[route.length - 2]);
      primitives.push({
        type: "path",
        points: route,
        smooth: from.y !== to.y,
        stroke: `palette:${[1, 0, 2, 3][branches.indexOf(eventById.get(edge.label === "merge" ? edge.from : edge.to)?.from)] ?? 4}`,
        strokeRole: "series",
        semantic: {
          kind: "edge",
          id: `git-edge-${ir.edges.indexOf(edge)}`,
          from: edge.from,
          to: edge.to,
          row: ir.events.findIndex((event) => event.label === edge.to),
        },
      });
    }
    for (const event of ir.events) {
      if (!event.to || !positions.has(event.to)) continue;
      const target = positions.get(event.label)!,
        source = positions.get(event.to)!;
      const color = `palette:${[1, 0, 2, 3][branches.indexOf(event.from)] ?? 4}`;
      primitives.push({
        type: "path",
        points: [commitContact(event.to, target), commitContact(event.label, source)],
        dash: [3, 4],
        stroke: color,
        strokeRole: "edge",
        semantic: {
          kind: "edge",
          id: `git-cherry-pick-${event.label}`,
          from: event.to,
          to: event.label,
          row: ir.events.indexOf(event),
        },
      });
    }
    if (config?.showBranches !== false) {
      const starts = ir.data?.gitBranchStarts as Record<string, string | undefined> | undefined;
      for (const [index, branch] of branches.entries()) {
        text(branch ?? "", 12, baseY - 10 + index * rowHeight, "mutedText", headerSize, 600);
        if (!ir.events.some((event) => event.from === branch)) {
          const origin = starts?.[branch ?? ""];
          const x = origin ? (positions.get(origin)?.x ?? left) : left;
          primitives.push({
            type: "path",
            points: [
              { x: x - 12, y: baseY + index * rowHeight },
              { x: x + Math.max(32, columnWidth * 0.5), y: baseY + index * rowHeight },
            ],
            stroke: `palette:${[1, 0, 2, 3][index] ?? 4}`,
            strokeRole: "series",
            dash: [4, 4],
          });
        }
      }
    }
    for (const [id, p] of positions) {
      const firstPrimitive = primitives.length;
      const event = eventById.get(id)!;
      const color = `palette:${[1, 0, 2, 3][branches.indexOf(event.from)] ?? 4}`;
      if (event.flags?.includes("HIGHLIGHT"))
        primitives.push({
          type: "shape",
          shape: "rect",
          x: p.x - dotRadius - 4,
          y: p.y - dotRadius - 4,
          width: dotRadius * 2 + 8,
          height: dotRadius * 2 + 8,
          fill: "paletteFill:3",
          stroke: color,
          strokeRole: "series",
        });
      primitives.push({
        type: "shape",
        shape: event.flags?.includes("HIGHLIGHT") ? "rect" : "circle",
        x: p.x - dotRadius,
        y: p.y - dotRadius,
        width: dotRadius * 2,
        height: dotRadius * 2,
        fill: "nodeFill",
        stroke: `palette:${[1, 0, 2, 3][branches.indexOf(eventById.get(id)?.from)] ?? 4}`,
        strokeRole: "series",
      });
      if (event.flags?.includes("REVERSE")) {
        path(
          [
            { x: p.x - dotRadius * 0.6, y: p.y - dotRadius * 0.6 },
            { x: p.x + dotRadius * 0.6, y: p.y + dotRadius * 0.6 },
          ],
          color,
          "series",
        );
        path(
          [
            { x: p.x - dotRadius * 0.6, y: p.y + dotRadius * 0.6 },
            { x: p.x + dotRadius * 0.6, y: p.y - dotRadius * 0.6 },
          ],
          color,
          "series",
        );
      }
      const tag = tagFor(id);
      if (tag) {
        const metrics = measure(tag, { fontSize });
        const tagY = p.y - dotRadius - metrics.height - 20;
        const tagWidth = (metrics.width + 16) / 0.8;
        const tagX = p.x - tagWidth / 2;
        primitives.push({
          type: "shape",
          shape: "flag",
          x: tagX,
          y: tagY - 5,
          width: tagWidth,
          height: metrics.height + 10,
          fill: "paletteFill:3",
          stroke: color,
          strokeRole: "series",
        });
        text(tag, tagX + tagWidth * 0.2 + 8, tagY, "nodeText");
      }
      if (showCommitLabels)
        text(labelFor(id), p.x - measure(labelFor(id), { fontSize }).width / 2, p.y + 15);
      const message = nodeById.get(id)?.metadata?.message;
      if (typeof message === "string" && message)
        text(
          message,
          p.x - measure(message, { fontSize }).width / 2,
          p.y + 15 + measure(labelFor(id), { fontSize }).height + 6,
          "mutedText",
        );
      for (const primitive of primitives.slice(firstPrimitive))
        primitive.semantic = {
          kind: "node",
          id,
          row: ir.events.indexOf(event),
          part: primitive.type === "text" ? "label" : "body",
          role: "commit",
        };
    }
    return;
  }
  if (kind === "mindmap") {
    const style = options.typeStyles?.mindmap;
    const annotations = ir.data?.mindmapAnnotations as Record<string, string[]> | undefined;
    const icons = new Map(
      ir.nodes.flatMap((node) => {
        const annotation = annotations?.[node.id]?.find((value) => value.startsWith("::icon("));
        const name = annotation?.match(/^::icon\((.*)\)$/)?.[1]?.trim();
        return name ? [[node.id, name] as const] : [];
      }),
    );
    const iconSize = Math.max(24, fontSize * 1.8),
      iconGap = 6;
    const positions = new Map<string, Point>();
    const form = (shape: Shape): Shape => (shape === "rect" ? "round" : shape);
    const children = new Map(ir.nodes.map((node) => [node.id, [] as string[]]));
    for (const edge of ir.edges) {
      if (!children.has(edge.from) || !children.has(edge.to))
        throw new Error("Unknown mindmap edge endpoint");
      children.get(edge.from)!.push(edge.to);
    }
    const childIds = new Set(ir.edges.map((edge) => edge.to));
    const roots = ir.nodes.filter((n) => !childIds.has(n.id));
    const nodeById = new Map(ir.nodes.map((node) => [node.id, node]));
    const depths = new Map<string, number>();
    const preorder: string[] = [];
    const pending = roots.map((node) => ({ id: node.id, depth: 0 }));
    while (pending.length) {
      const entry = pending.pop()!;
      if (depths.has(entry.id)) throw new Error("Mindmap requires an acyclic tree");
      if (entry.depth > 64) throw new Error("Mindmap nesting exceeds 64 levels");
      depths.set(entry.id, entry.depth);
      preorder.push(entry.id);
      for (const child of [...(children.get(entry.id) ?? [])].reverse())
        pending.push({ id: child, depth: entry.depth + 1 });
    }
    if (preorder.length !== ir.nodes.length)
      throw new Error("Mindmap requires one connected rooted tree");
    if (roots.length !== 1) throw new Error("Mindmap requires one rooted tree");
    const weights = new Map<string, number>();
    const weight = (id: string): number => {
      const value = Math.max(
        1,
        children.get(id)!.reduce((sum, child) => sum + weight(child), 0),
      );
      weights.set(id, value);
      return value;
    };
    weight(roots[0].id);
    const sizes = new Map(
      ir.nodes.map((n) => {
        const m = measure(n.label, { fontSize });
        let width = m.width + styleSize(style?.nodePaddingX, 16) * 2,
          height = m.height + styleSize(style?.nodePaddingY, 11) * 2;
        if (icons.has(n.id)) {
          width = Math.max(width, iconSize + styleSize(style?.nodePaddingX, 16) * 2);
          height += iconSize + iconGap;
        }
        if (n.shape === "circle" || n.shape === "doublecircle")
          width = height = Math.hypot(width, height);
        if (n.shape === "hexagon") width /= 0.6;
        return [n.id, { width, height }];
      }),
    );
    const place = (id: string, depth: number, start: number, sweep: number, radius: number) => {
      const angle = start + sweep / 2;
      positions.set(id, {
        x: depth * radius * Math.cos(angle),
        // Horizontal mindmaps reserve more room for labels than for row separation.
        y: depth * radius * Math.sin(angle) * 0.5,
      });
      if (depth === 0) {
        const branches = children.get(id)!;
        for (const side of [0, 1]) {
          const siblings = branches.filter((_, index) => index % 2 === side);
          const total = siblings.reduce((sum, child) => sum + weights.get(child)!, 0);
          let cursor = -Math.PI / 2;
          for (const child of siblings) {
            const span = ((side === 0 ? -Math.PI : Math.PI) * weights.get(child)!) / total;
            place(child, 1, cursor, span, radius);
            cursor += span;
          }
        }
        return;
      }
      let cursor = start;
      for (const child of children.get(id)!) {
        const span = (sweep * weights.get(child)!) / weights.get(id)!;
        place(child, depth + 1, cursor, span, radius);
        cursor += span;
      }
    };
    let clear = false;
    for (
      let attempt = 0, radius = styleSize(style?.radialGap, 120, 48);
      attempt < 24;
      attempt++, radius *= 1.25
    ) {
      place(roots[0].id, 0, -Math.PI, Math.PI * 2, radius);
      if (options.viewportWidth) {
        const left = Math.min(
          ...ir.nodes.map((node) => positions.get(node.id)!.x - sizes.get(node.id)!.width / 2),
        );
        const right = Math.max(
          ...ir.nodes.map((node) => positions.get(node.id)!.x + sizes.get(node.id)!.width / 2),
        );
        if (right - left + (options.padding ?? 20) * 2 > options.viewportWidth) break;
      }
      clear = ir.nodes.every((node, index) =>
        ir.nodes.slice(index + 1).every((other) => {
          const a = positions.get(node.id)!,
            b = positions.get(other.id)!,
            as = sizes.get(node.id)!,
            bs = sizes.get(other.id)!;
          return (
            Math.abs(a.x - b.x) >= (as.width + bs.width) / 2 + styleSize(style?.branchGap, 40) ||
            Math.abs(a.y - b.y) >= (as.height + bs.height) / 2 + styleSize(style?.branchGap, 16)
          );
        }),
      );
      // Branches must also leave horizontal room for their curved side exits.
      if (clear)
        clear = ir.edges.every((edge) => {
          if (edge.from !== roots[0].id) return true;
          const a = positions.get(edge.from)!,
            b = positions.get(edge.to)!;
          if (Math.abs(a.x - b.x) < 1) return true;
          return (
            Math.abs(a.x - b.x) >=
            (sizes.get(edge.from)!.width + sizes.get(edge.to)!.width) / 2 +
              styleSize(style?.branchGap, 40)
          );
        });
      if (clear) break;
    }
    if (!clear && !options.viewportWidth) throw new Error("Mindmap collision budget exceeded");
    const labelMetrics = new Map(
      ir.nodes.map((node) => [node.id, measure(node.label, { fontSize })]),
    );
    const intrinsicLeft = Math.min(
      ...ir.nodes.map((node) => positions.get(node.id)!.x - sizes.get(node.id)!.width / 2),
    );
    const intrinsicRight = Math.max(
      ...ir.nodes.map((node) => positions.get(node.id)!.x + sizes.get(node.id)!.width / 2),
    );
    const verticalTree =
      !!options.viewportWidth &&
      (!clear ||
        intrinsicRight - intrinsicLeft + (options.padding ?? 20) * 2 > options.viewportWidth);
    if (verticalTree) {
      let y = 12;
      for (const id of preorder) {
        const node = nodeById.get(id)!,
          indent = Math.min(72, (depths.get(id) ?? 0) * 14);
        const available = options.viewportWidth! - 24 - indent - (options.padding ?? 20) * 2;
        const inset = styleSize(style?.nodePaddingX, 16);
        const round = node.shape === "circle" || node.shape === "doublecircle";
        const metrics = unboundedMeasure(node.label, {
          fontSize,
          maxWidth: Math.max(
            24,
            round
              ? (available - inset * 2) / 1.6
              : node.shape === "hexagon"
                ? available * 0.6 - inset * 2
                : available - inset * 2,
          ),
        });
        labelMetrics.set(id, metrics);
        let w = metrics.width + inset * 2,
          h = metrics.height + styleSize(style?.nodePaddingY, 11) * 2;
        if (icons.has(id)) {
          w = Math.max(w, iconSize + inset * 2);
          h += iconSize + iconGap;
        }
        if (round) w = h = Math.hypot(w, h);
        if (node.shape === "hexagon") w /= 0.6;
        if (w > available + 0.01)
          throw new Error("Mindmap node cannot fit this viewport at the selected font size");
        sizes.set(id, { width: w, height: h });
        positions.set(id, { x: 12 + indent + w / 2, y: y + h / 2 });
        y += h + Math.max(20, styleSize(style?.branchGap, 16));
      }
    }
    const branchIndex = new Map<string, number>();
    const assignBranch = (id: string, index: number) => {
      branchIndex.set(id, index);
      for (const child of children.get(id)!) assignBranch(child, index);
    };
    children.get(roots[0].id)!.forEach((id, index) => assignBranch(id, index));
    for (const edge of ir.edges) {
      const from = positions.get(edge.from)!,
        to = positions.get(edge.to)!;
      const fromNode = nodeById.get(edge.from)!,
        toNode = nodeById.get(edge.to)!;
      const a = sizes.get(edge.from)!,
        b = sizes.get(edge.to)!;
      if (verticalTree) {
        const x = from.x - a.width / 2 - 8;
        primitives.push({
          type: "path",
          points: [
            { x: from.x - a.width / 2, y: from.y },
            { x, y: from.y },
            { x, y: to.y },
            { x: to.x - b.width / 2, y: to.y },
          ],
          stroke: `palette:${[1, 2, 3, 7][branchIndex.get(edge.to) ?? 0] ?? 1}`,
          strokeRole: "edge",
          semantic: {
            kind: "edge",
            id: `mindmap-${edge.to}`,
            from: edge.from,
            to: edge.to,
            row: depths.get(edge.to),
          },
        });
        continue;
      }
      const vertical = Math.abs(to.x - from.x) < 1;
      const start = intersectShape(
        form(fromNode.shape),
        { x: from.x - a.width / 2, y: from.y - a.height / 2, ...a },
        vertical ? { x: from.x, y: to.y } : { x: to.x, y: from.y },
        options.radius,
      );
      const end = intersectShape(
        form(toNode.shape),
        { x: to.x - b.width / 2, y: to.y - b.height / 2, ...b },
        vertical ? { x: to.x, y: from.y } : { x: from.x, y: to.y },
        options.radius,
      );
      const sign = vertical ? Math.sign(to.y - from.y) : Math.sign(to.x - from.x);
      const bend = Math.max(24, Math.abs(vertical ? end.y - start.y : end.x - start.x) / 2);
      const control1 = vertical
        ? { x: start.x, y: start.y + sign * bend }
        : { x: start.x + sign * bend, y: start.y };
      const control2 = vertical
        ? { x: end.x, y: end.y - sign * bend }
        : { x: end.x - sign * bend, y: end.y };
      primitives.push({
        type: "path",
        points: [start, end],
        curves: [{ control1, control2, end }],
        stroke: `palette:${[1, 2, 3, 7][branchIndex.get(edge.to) ?? 0] ?? 1}`,
        strokeRole: "edge",
        semantic: {
          kind: "edge",
          id: `mindmap-${edge.to}`,
          from: edge.from,
          to: edge.to,
          row: depths.get(edge.to),
        },
      });
    }

    for (const node of ir.nodes) {
      const firstPrimitive = primitives.length;
      const p = positions.get(node.id)!;
      const s = sizes.get(node.id)!,
        m = labelMetrics.get(node.id)!;
      primitives.push({
        type: "shape",
        shape: form(node.shape),
        x: p.x - s.width / 2,
        y: p.y - s.height / 2,
        ...s,
        fill:
          node.id === roots[0].id
            ? "palette:0"
            : `paletteFill:${[1, 2, 3, 7][branchIndex.get(node.id) ?? 0] ?? 1}`,
        stroke:
          node.id === roots[0].id
            ? "accent"
            : `palette:${[1, 2, 3, 7][branchIndex.get(node.id) ?? 0] ?? 1}`,
        strokeRole: "node",
      });
      const icon = icons.get(node.id);
      if (icon) {
        if (!options.resolveIcon) throw new Error(`Native icon resolver is required for ${icon}`);
        const contentTop = p.y - (m.height + iconSize + iconGap) / 2;
        const resolved = options.resolveIcon(icon, {
          x: p.x - iconSize / 2,
          y: contentTop,
          width: iconSize,
          height: iconSize,
        });
        if (!resolved) throw new Error(`Native icon is not registered: ${icon}`);
        primitives.push(...resolved);
        primitives.push({
          type: "text",
          text: m.lines.join("\n"),
          x: p.x - m.width / 2,
          y: contentTop + iconSize + iconGap,
          width: m.width,
          height: m.height,
          fontSize,
          color: "nodeText",
          ...(m.lineBaselines ? { lineBaselines: m.lineBaselines } : {}),
        });
      } else
        primitives.push({
          type: "text",
          text: m.lines.join("\n"),
          x: p.x - m.width / 2,
          y: p.y - m.height / 2,
          width: m.width,
          height: m.height,
          fontSize,
          color: "nodeText",
          ...(m.lineBaselines ? { lineBaselines: m.lineBaselines } : {}),
          lineRuns: runsForLines(node.label, m.lines),
        });
      for (const primitive of primitives.slice(firstPrimitive))
        primitive.semantic = {
          kind: "node",
          id: node.id,
          row: depths.get(node.id),
          part:
            primitive === primitives[firstPrimitive]
              ? "body"
              : primitive === primitives.at(-1)
                ? "label"
                : "icon",
          role: node.id === roots[0].id ? "root" : "branch",
        };
    }
    return;
  }
  if (kind === "gantt") {
    const style = options.typeStyles?.gantt;
    const table = style?.table === true;
    const ganttConfig = (
      ir.data?.config as
        | { gantt?: { useWidth?: unknown; rightPadding?: unknown; axisFormat?: unknown } }
        | undefined
    )?.gantt;
    const showSections = style?.showSections !== false;
    const authoredAxisFormat =
      (ir.data?.ganttOptions as Record<string, string> | undefined)?.axisFormat ??
      (typeof ganttConfig?.axisFormat === "string" ? ganttConfig.axisFormat : undefined);
    const viewportWidth = options.viewportWidth;
    const compact = viewportWidth !== undefined && Number.isFinite(viewportWidth);
    const labelLimit = compact ? Math.max(48, viewportWidth * 0.3) : undefined;
    const taskMetrics = (label: string) =>
      compact
        ? unboundedMeasure(label, { fontSize, maxWidth: labelLimit })
        : measure(label, { fontSize });
    const ganttText = (
      label: string,
      x: number,
      y: number,
      color = "nodeText",
      size = fontSize,
      weight = 400,
      maxWidth?: number,
    ) => {
      const m = compact
        ? unboundedMeasure(label, { fontSize: size, fontWeight: weight, maxWidth })
        : measure(label, { fontSize: size, fontWeight: weight });
      primitives.push({
        type: "text",
        text: label,
        x,
        y,
        width: m.width,
        height: m.height,
        fontSize: size,
        fontWeight: weight,
        color,
        lineRuns: runsForLines(label, m.lines),
        ...(m.lineBaselines ? { lineBaselines: m.lineBaselines } : {}),
      });
    };
    const labelWidth = Math.max(
      compact ? 48 : styleSize(style?.labelWidth, 104, 48),
      ...ir.events.map((e) => taskMetrics(e.label).width + (table ? 36 : 24)),
    );
    const barHeight = styleSize(style?.barHeight, 22, 10, 80);
    const rowHeight = (event: (typeof ir.events)[number]) =>
      Math.max(barHeight, taskMetrics(event.label).height) + styleSize(style?.rowGap, 16, 8);
    const start = ir.events.length ? Math.min(...ir.events.map((e) => e.start ?? 0)) : 0,
      dataEnd = ir.events.length ? Math.max(...ir.events.map((e) => e.end ?? 0)) : 86400000;
    // Complete date cells keep terminal milestones inside the framed table.
    const end = table
      ? dataEnd - start > 70 * 86400000
        ? Date.UTC(new Date(dataEnd).getUTCFullYear(), new Date(dataEnd).getUTCMonth() + 1, 1)
        : dataEnd + Math.max(1, (dataEnd - start) * 0.08)
      : dataEnd;
    // Durations are milliseconds; a one-day floor collapses official Unix-time examples.
    const ticks = table
      ? [...new Set([start, ...dateTicks(start, end), end])].sort((a, b) => a - b)
      : dateTicks(start, end);
    const axisLabels = ticks.map((tick) =>
      formatAxisDate(
        tick,
        authoredAxisFormat ?? (table && compact ? "%b %d" : (ir.gantt?.axisFormat ?? "%Y-%m-%d")),
      ),
    );
    const axisReserve =
      compact && !table
        ? Math.max(0, ...axisLabels.map((label) => measure(label, { fontSize }).width)) / 2
        : 0;
    const sourcePlotWidth =
      typeof ganttConfig?.useWidth === "number" &&
      Number.isFinite(ganttConfig.useWidth) &&
      ganttConfig.useWidth > 0
        ? Math.max(
            160,
            styleSize(ganttConfig.useWidth, 400, 160, 2400) -
              labelWidth -
              2 * (options.padding ?? 20) +
              12,
          )
        : 360;
    const plotWidth = compact
      ? Math.max(
          64,
          Math.min(
            styleSize(style?.plotWidth, sourcePlotWidth, 160),
            viewportWidth - labelWidth - 48 - axisReserve,
          ),
        )
      : styleSize(style?.plotWidth, sourcePlotWidth, 160);
    const scale = plotWidth / Math.max(1, end - start);
    const stride = Math.max(
      1,
      Math.ceil(
        Math.max(...axisLabels.map((label) => measure(label, { fontSize }).width + 8)) /
          (plotWidth / Math.max(1, ticks.length - 1)),
      ),
    );
    const sectionHeight = (label: string) =>
      Math.max(
        28,
        (compact
          ? unboundedMeasure(label, {
              fontSize: headerSize,
              fontWeight: 600,
              maxWidth: labelWidth + plotWidth - 24,
            })
          : measure(label, { fontSize: headerSize, fontWeight: 600 })
        ).height + 6,
      );
    const dateContext =
      table && ((compact && !authoredAxisFormat) || authoredAxisFormat?.includes("%y"))
        ? new Date(start).getUTCFullYear() === new Date(end).getUTCFullYear()
          ? String(new Date(start).getUTCFullYear())
          : `${new Date(start).getUTCFullYear()} – ${new Date(end).getUTCFullYear()}`
        : undefined;
    const dateContextHeight = dateContext ? measure(dateContext, { fontSize }).height + 6 : 0;
    const measuredHeader =
      Math.max(
        measure(style?.taskHeader ?? "Task", { fontSize: headerSize, fontWeight: 600 }).height,
        ...axisLabels.map((label) => measure(label, { fontSize }).height),
      ) +
      20 +
      dateContextHeight;
    const tableTop = 20;
    const headerHeight = Math.max(
      measuredHeader,
      styleSize(style?.headerHeight, measuredHeader, 20, 300),
    );
    const plotTop = table
      ? tableTop + headerHeight
      : Math.max(
          64,
          20 + Math.max(0, ...axisLabels.map((label) => measure(label, { fontSize }).height)) + 20,
        );
    const sectionBands = ir.events.reduce(
      (height, event, index) =>
        height +
        (showSections &&
        event.section &&
        (index === 0 || event.section !== ir.events[index - 1].section)
          ? sectionHeight(event.section) + 4
          : 0),
      0,
    );
    const plotBottom =
      plotTop + ir.events.reduce((sum, event) => sum + rowHeight(event), 0) + sectionBands;
    if (table) {
      box(
        "",
        12,
        tableTop,
        labelWidth + plotWidth - 12,
        headerHeight,
        "headerFill",
        false,
        options.radius,
      );
      text(
        style?.taskHeader ?? "Task",
        24,
        tableTop +
          (headerHeight -
            measure(style?.taskHeader ?? "Task", { fontSize: headerSize, fontWeight: 600 })
              .height) /
            2,
        "headerText",
        headerSize,
        600,
      );
      path(
        [
          { x: 12, y: plotTop },
          { x: labelWidth + plotWidth, y: plotTop },
        ],
        "gridStroke",
        "grid",
      );
      path(
        [
          { x: labelWidth, y: tableTop },
          { x: labelWidth, y: plotBottom },
        ],
        "gridStroke",
        "grid",
      );
    }
    if (dateContext) text(dateContext, labelWidth + 8, tableTop + 6, "mutedText");
    // Readable major labels are selected by measured bounds, including the
    // terminal date. Minor ticks never erase every time label in a narrow table.
    const tableLabels: { index: number; x: number; width: number; height: number }[] = [];
    if (table) {
      const add = (index: number) => {
        const metrics = measure(axisLabels[index], { fontSize });
        const tickX = labelWidth + (ticks[index] - start) * scale;
        const x = Math.max(
          labelWidth + 8,
          Math.min(labelWidth + plotWidth - metrics.width - 8, tickX - metrics.width / 2),
        );
        if (
          metrics.width + 16 > plotWidth ||
          tableLabels.some(
            (other) =>
              other.index === index ||
              (x < other.x + other.width + 8 && x + metrics.width + 8 > other.x),
          )
        )
          return;
        tableLabels.push({ index, x, width: metrics.width, height: metrics.height });
      };
      add(0);
      if (axisLabels.at(-1) !== axisLabels[0]) add(ticks.length - 1);
      for (let index = 1; index < ticks.length - 1; index++) {
        if (tableLabels.some((other) => axisLabels[other.index] === axisLabels[index])) continue;
        add(index);
      }
      for (const label of tableLabels)
        text(
          axisLabels[label.index],
          label.x,
          tableTop + dateContextHeight + (headerHeight - dateContextHeight - label.height) / 2,
          "headerText",
        );
    }
    for (const [index, tick] of ticks.entries()) {
      const x = labelWidth + (tick - start) * scale;
      if (!table && index % stride === 0)
        text(
          axisLabels[index],
          compact ? x - measure(axisLabels[index], { fontSize }).width / 2 : x,
          20,
          "mutedText",
        );
      // The outer frame owns its boundary strokes; the task divider is emitted
      // once. Keep interior grid contacts inside the rounded outline.
      if (
        table &&
        (index === 0 ||
          index === ticks.length - 1 ||
          !tableLabels.some((label) => label.index === index))
      )
        continue;
      const frameRadius = Math.min(options.radius ?? 8, plotWidth / 2, (plotBottom - tableTop) / 2);
      const edgeDistance = Math.min(x - 12, labelWidth + plotWidth - x);
      const cornerInset =
        table && edgeDistance < frameRadius
          ? frameRadius -
            Math.sqrt(Math.max(0, frameRadius ** 2 - (frameRadius - edgeDistance) ** 2)) +
            1
          : 0;
      path(
        [
          { x, y: table ? tableTop + cornerInset : plotTop - 14 },
          {
            x,
            y: plotBottom - cornerInset,
          },
        ],
        "gridStroke",
        "grid",
      );
    }
    const verticalMarkers: Primitive[] = [];
    let rowY = plotTop,
      previousSection = "";
    for (const event of ir.events) {
      if (showSections && event.section && event.section !== previousSection) {
        box(
          "",
          12,
          rowY - 3,
          labelWidth + plotWidth - 12,
          sectionHeight(event.section),
          "headerFill",
          false,
          options.radius,
        );
        ganttText(
          event.section,
          20,
          rowY,
          "headerText",
          headerSize,
          600,
          labelWidth + plotWidth - 24,
        );
        rowY += sectionHeight(event.section) + 4;
        previousSection = event.section;
      }
      const y = rowY;
      rowY += rowHeight(event);
      if (table && rowY < plotBottom - 0.1)
        path(
          [
            { x: 12, y: rowY },
            { x: labelWidth + plotWidth, y: rowY },
          ],
          "gridStroke",
          "grid",
        );
      const rowInset = table ? (rowHeight(event) - barHeight) / 2 : 0;
      ganttText(
        event.label,
        table ? 24 : 12,
        y +
          (table
            ? (rowHeight(event) - taskMetrics(event.label).height) / 2
            : Math.max(0, (barHeight - taskMetrics(event.label).height) / 2)),
        "nodeText",
        fontSize,
        400,
        labelLimit,
      );
      if (event.flags?.includes("milestone")) {
        interactions.push({
          id: `gantt-${ir.events.indexOf(event)}`,
          label: event.label,
          kind: "data",
          target: event.label,
          value: 0,
          x: labelWidth + ((event.start ?? 0) - start) * scale - 8,
          y: y + rowInset + (barHeight - 16) / 2,
          width: 16,
          height: 16,
          tooltip: new Date(event.start ?? 0).toISOString(),
        });
        primitives.push({
          type: "shape",
          shape: "diamond",
          x: labelWidth + ((event.start ?? 0) - start) * scale - 8,
          y: y + rowInset + (barHeight - 16) / 2,
          width: 16,
          height: 16,
          fill: table ? "background" : "accent",
          ...(table ? { stroke: "accent", strokeRole: "node" } : { strokeWidth: 0 }),
        });
        continue;
      }
      if (event.flags?.includes("vert")) {
        const x = labelWidth + ((event.start ?? 0) - start) * scale - 1;
        const y = plotTop + 4;
        const height = plotBottom - y - 4;
        verticalMarkers.push({
          type: "shape",
          shape: "round",
          x,
          y,
          width: 2,
          height,
          fill: "palette:1",
          strokeWidth: 0,
          radius: options.radius,
          motion: { axis: "y", baseline: y },
        });
        interactions.push({
          id: `gantt-${ir.events.indexOf(event)}`,
          label: event.label,
          kind: "data",
          target: event.label,
          value: 0,
          x,
          y,
          width: 2,
          height,
          tooltip: new Date(event.start ?? 0).toISOString(),
        });
        continue;
      }
      const bar = box(
        "",
        labelWidth + ((event.start ?? 0) - start) * scale,
        y + rowInset,
        Math.max(6, ((event.end ?? 0) - (event.start ?? 0)) * scale),
        barHeight,
        event.flags?.includes("crit")
          ? "accent"
          : event.flags?.includes("done")
            ? "palette:1"
            : event.flags?.includes("active")
              ? "palette:2"
              : "palette:1",
        false,
        options.radius,
      );
      interactions.push({
        id: `gantt-${ir.events.indexOf(event)}`,
        label: event.label,
        kind: "data",
        target: event.label,
        value: ((event.end ?? 0) - (event.start ?? 0)) / 86400000,
        x: bar.x,
        y: bar.y,
        width: bar.width,
        height: bar.height,
        tooltip: `${new Date(event.start ?? 0).toISOString()} → ${new Date(event.end ?? 0).toISOString()}`,
      });
      bar.motion = { axis: "x", baseline: bar.x };
      if (event.flags?.includes("active") || event.flags?.includes("done")) {
        bar.stroke = event.flags.includes("active") ? "palette:2" : "palette:1";
        bar.strokeWidth = undefined;
        bar.strokeRole = "node";
      }
    }
    primitives.push(...verticalMarkers);
    if (table)
      primitives.push({
        type: "shape",
        shape: "round",
        x: 12,
        y: tableTop,
        width: labelWidth + plotWidth - 12,
        height: plotBottom - tableTop,
        fill: "transparent",
        stroke: "clusterStroke",
        strokeRole: "frame",
        radius: options.radius,
      });
    return;
  }
  if (kind === "quadrant") {
    layoutQuadrant(ir, primitives, fontSize, measure, options, interactions, unboundedMeasure);
    return;
  }
  if (kind === "xychart") {
    const style = options.typeStyles?.xychart;
    const requestedPlotWidth = styleSize(style?.plotWidth, 320, 160);
    const viewportWidth = options.viewportWidth;
    const compact = viewportWidth !== undefined && Number.isFinite(viewportWidth);
    const padding = options.padding ?? 20;
    const sideLabelLimit = compact ? Math.max(48, viewportWidth * 0.3) : undefined;
    const chartMeasure = (label: string, size = fontSize, weight = 400, maxWidth?: number) =>
      compact
        ? unboundedMeasure(label, { fontSize: size, fontWeight: weight, maxWidth })
        : measure(label, { fontSize: size, fontWeight: weight });
    const chartText = (
      label: string,
      x: number,
      y: number,
      color = "nodeText",
      size = fontSize,
      weight = 400,
      maxWidth?: number,
    ) => {
      const m = chartMeasure(label, size, weight, maxWidth);
      primitives.push({
        type: "text",
        text: label,
        x,
        y,
        width: m.width,
        height: m.height,
        fontSize: size,
        fontWeight: weight,
        color,
        lineRuns: runsForLines(label, m.lines),
        ...(m.lineBaselines ? { lineBaselines: m.lineBaselines } : {}),
      });
    };
    const values = ir.events.flatMap((e) => e.values ?? []);
    const min = ir.axis?.explicitY ? ir.axis.min : Math.min(0, ...values),
      max = ir.axis?.explicitY ? ir.axis.max : Math.max(1, ...values);
    const count = Math.max(1, ...ir.events.map((e) => e.values?.length ?? 0));
    const labels = ir.axis?.labels.length
      ? ir.axis.labels
      : Array.from({ length: count }, (_, i) =>
          String(
            ir.axis?.xMin === undefined
              ? i + 1
              : ir.axis.xMin + ((ir.axis.xMax! - ir.axis.xMin) * i) / Math.max(1, count - 1),
          ),
        );
    if (ir.axis?.labels.length && ir.axis.labels.length !== count)
      throw new Error("XY categories must match series length");
    if (ir.events.some((e) => e.values?.length !== count))
      throw new Error("XY series must have the same length");
    const ticks = Array.from({ length: 6 }, (_, i) => min + ((max - min) * i) / 5);
    const tickLabel = (v: number) => String(Math.round(v * 100) / 100);
    const left = Math.max(
      32,
      ...(ir.horizontal ? labels : ticks.map(tickLabel)).map(
        (label) =>
          chartMeasure(label, fontSize, 400, ir.horizontal ? sideLabelLimit : undefined).width + 16,
      ),
    );
    const plotWidth = compact
      ? Math.max(80, Math.min(requestedPlotWidth, viewportWidth - left - padding * 2 - 8))
      : requestedPlotWidth;
    const plotHeight = Math.max(
      styleSize(style?.plotHeight, 220, 120),
      ir.horizontal && compact
        ? labels.reduce(
            (height, label) =>
              height + chartMeasure(label, fontSize, 400, sideLabelLimit).height + 8,
            0,
          )
        : 0,
    );
    const topTitle = ir.horizontal ? ir.axis?.xTitle : ir.axis?.yTitle;
    const bottomTitle = ir.horizontal ? ir.axis?.yTitle : ir.axis?.xTitle;
    const bandGap = Math.max(12, fontSize * 0.6);
    const topTitleHeight = topTitle ? chartMeasure(topTitle, headerSize, 600, plotWidth).height : 0;
    const bottomLabelHeight = Math.max(
      0,
      ...(ir.horizontal ? ticks.map(tickLabel) : labels).map(
        (label) =>
          chartMeasure(label, fontSize, 400, ir.horizontal ? plotWidth / 6 : plotWidth / count)
            .height,
      ),
    );
    const bottomTitleY = (bottom: number) => bottom + 12 + bottomLabelHeight + bandGap;
    const top = Math.max(48, 16 + topTitleHeight + bandGap),
      bottom = top + plotHeight,
      right = left + plotWidth;
    const dx = (ir.horizontal ? plotHeight : plotWidth) / count;
    const bars = ir.events.filter((e) => e.type === "bar");
    const barWidth =
      (dx * (1 - styleSize(style?.barGap, 0.3, 0.1, 0.8))) / Math.max(1, bars.length);
    const project = (index: number, v: number): Point =>
      ir.horizontal
        ? { x: left + ((v - min) / (max - min)) * plotWidth, y: top + (index + 0.5) * dx }
        : { x: left + (index + 0.5) * dx, y: bottom - ((v - min) / (max - min)) * plotHeight };
    path(
      [
        { x: left, y: top },
        { x: left, y: bottom },
        { x: right, y: bottom },
      ],
      "clusterStroke",
      "frame",
    );
    const numericTickStride =
      ir.horizontal && compact
        ? Math.max(
            1,
            Math.ceil(
              Math.max(...ticks.map((v) => measure(tickLabel(v), { fontSize }).width + 8)) /
                (plotWidth / Math.max(1, ticks.length - 1)),
            ),
          )
        : 1;
    for (const [tickIndex, v] of ticks.entries()) {
      const p = project(0, v),
        label = tickLabel(v),
        m = measure(label, { fontSize });
      path(
        ir.horizontal
          ? [
              { x: p.x, y: top },
              { x: p.x, y: bottom },
            ]
          : [
              { x: left, y: p.y },
              { x: right, y: p.y },
            ],
        "gridStroke",
        "grid",
      );
      if (tickIndex % numericTickStride === 0)
        text(
          label,
          ir.horizontal ? p.x - m.width / 2 : left - m.width - 12,
          ir.horizontal ? bottom + 12 : p.y - m.height / 2,
          "mutedText",
        );
    }
    const seriesMarkers: Primitive[] = [];
    const xyConfig = (
      ir.data?.config as
        | { xyChart?: { showDataLabel?: boolean; showDataLabelOutsideBar?: boolean } }
        | undefined
    )?.xyChart;
    const themeVariables = (
      ir.data?.config as
        | { themeVariables?: { xyChart?: { plotColorPalette?: unknown } } }
        | undefined
    )?.themeVariables;
    const authoredPalette = typeof themeVariables?.xyChart?.plotColorPalette === "string";
    const seriesPalette = (event: (typeof ir.events)[number], series: number) =>
      style?.seriesPalette?.[series] ??
      (authoredPalette
        ? series
        : event.type === "line"
          ? ir.events.filter((e) => e.type === "line").indexOf(event) + 1
          : series);
    const valueLabels: {
      id: string;
      label: string;
      x: number;
      y: number;
      width: number;
      height: number;
      radius: number;
      metrics: ReturnType<TextMeasurer>;
      motion: { value: number; decimals: number };
    }[] = [];
    for (const [series, event] of ir.events.entries()) {
      const seriesLabel =
        event.label ||
        style?.seriesLabels?.[series] ||
        `${event.type === "bar" ? "Bar" : "Line"} ${ir.events.slice(0, series + 1).filter((item) => item.type === event.type).length}`;
      const points = event.values!.map((v, index) => project(index, v));
      if (event.type === "line") {
        const radius = styleSize(style?.pointRadius, 3.5, 0, 12);
        for (let index = 1; index < points.length; index++) {
          const a = points[index - 1],
            b = points[index],
            distance = Math.hypot(b.x - a.x, b.y - a.y);
          const startRadius =
            event.values![index - 1] >= min && event.values![index - 1] <= max ? radius : 0;
          const endRadius = event.values![index] >= min && event.values![index] <= max ? radius : 0;
          if (distance <= startRadius + endRadius) continue;
          const start = {
            x: a.x + ((b.x - a.x) * startRadius) / distance,
            y: a.y + ((b.y - a.y) * startRadius) / distance,
          };
          const end = {
            x: b.x - ((b.x - a.x) * endRadius) / distance,
            y: b.y - ((b.y - a.y) * endRadius) / distance,
          };
          for (const clipped of clipPolyline([start, end], {
            x: left,
            y: top,
            width: plotWidth,
            height: plotHeight,
          })) {
            path(clipped, `palette:${seriesPalette(event, series)}`, "series");
            const line = primitives.at(-1);
            if (line?.type === "path") line.motion = { axis: ir.horizontal ? "y" : "x" };
          }
        }
        for (const [index, v] of event.values!.entries())
          if (v >= min && v <= max && radius > 0) {
            const p = project(index, v);
            interactions.push({
              id: `xy-${series}-${index}`,
              label: `${seriesLabel} · ${labels[index]}`,
              kind: "data",
              target: seriesLabel,
              value: v,
              x: p.x - Math.max(radius, 10),
              y: p.y - Math.max(radius, 10),
              width: Math.max(radius, 10) * 2,
              height: Math.max(radius, 10) * 2,
            });
            seriesMarkers.push({
              type: "shape",
              shape: "circle",
              x: p.x - radius,
              y: p.y - radius,
              width: radius * 2,
              height: radius * 2,
              fill: `palette:${seriesPalette(event, series)}`,
              stroke: "background",
              strokeRole: "node",
            });
          }
      } else
        for (const [index, v] of event.values!.entries()) {
          const baseline = project(index, Math.max(min, Math.min(max, 0)));
          const value = project(index, Math.max(min, Math.min(max, v)));
          const categoryStart =
            (ir.horizontal ? top : left) +
            index * dx +
            (dx - barWidth * bars.length) / 2 +
            bars.indexOf(event) * barWidth;
          const bar = box(
            "",
            ir.horizontal ? Math.min(value.x, baseline.x) : categoryStart,
            ir.horizontal ? categoryStart : Math.min(value.y, baseline.y),
            ir.horizontal ? Math.abs(value.x - baseline.x) : barWidth,
            ir.horizontal ? barWidth : Math.abs(value.y - baseline.y),
            `palette:${seriesPalette(event, series)}`,
            false,
            Math.min(3, options.radius ?? 8),
          );
          bar.motion = {
            axis: ir.horizontal ? "x" : "y",
            baseline: ir.horizontal ? baseline.x : baseline.y,
          };
          if (xyConfig?.showDataLabel) {
            const label = String(v);
            const metrics = unboundedMeasure(label, { fontSize });
            const numericMotion = {
              value: v,
              decimals: Math.min(10, label.split(".")[1]?.length ?? 0),
            };
            if (
              !xyConfig.showDataLabelOutsideBar &&
              metrics.width + 8 <= bar.width &&
              metrics.height + 8 <= bar.height
            ) {
              chartText(
                label,
                bar.x + (bar.width - metrics.width) / 2,
                bar.y + (bar.height - metrics.height) / 2,
                `paletteText:${seriesPalette(event, series)}`,
              );
              const labelPrimitive = primitives.at(-1);
              if (labelPrimitive?.type === "text") labelPrimitive.motion = numericMotion;
            } else
              valueLabels.push({
                id: `value:${series}:${index}`,
                label,
                ...value,
                width: metrics.width,
                height: metrics.height,
                radius: 0,
                metrics,
                motion: numericMotion,
              });
          }
          interactions.push({
            id: `xy-${series}-${index}`,
            label: `${seriesLabel} · ${labels[index]}`,
            kind: "data",
            target: seriesLabel,
            value: v,
            x: bar.x,
            y: bar.y,
            width: bar.width,
            height: bar.height,
          });
        }
    }
    primitives.push(...seriesMarkers);
    const authoredLabels = ir.data?.xyPointLabels as Record<number, string[]> | undefined;
    const annotations: {
      id: string;
      label: string;
      x: number;
      y: number;
      width: number;
      height: number;
      radius: number;
      metrics: ReturnType<TextMeasurer>;
      motion?: { value: number; decimals: number };
    }[] = [...valueLabels];
    for (const [series, event] of ir.events.entries()) {
      for (const [index, label] of (authoredLabels?.[series] ?? []).entries()) {
        if (!label || event.values![index] < min || event.values![index] > max) continue;
        const p = project(index, event.values![index]);
        const metrics = unboundedMeasure(label, { fontSize, maxWidth: plotWidth / 2 });
        annotations.push({
          id: `${series}:${index}`,
          label,
          ...p,
          width: metrics.width,
          height: metrics.height,
          radius: event.type === "line" ? styleSize(style?.pointRadius, 3.5, 0, 12) : 0,
          metrics,
        });
      }
    }
    const labelStride = Math.max(
      1,
      Math.ceil(
        Math.max(
          ...labels.map((l) =>
            ir.horizontal
              ? measure(l, { fontSize }).height + 8
              : measure(l, { fontSize }).width + 8,
          ),
        ) / dx,
      ),
    );
    const tickLabelGap = Math.max(10, fontSize * 0.75);
    let previousTickLabelEnd = -Infinity;
    for (const [index, l] of labels.entries())
      if (index % labelStride === 0) {
        const labelLimit = ir.horizontal
          ? sideLabelLimit
          : compact
            ? plotWidth / Math.ceil(count / labelStride) - 8
            : undefined;
        const m = chartMeasure(l, fontSize, 400, labelLimit);
        const labelX = ir.horizontal
          ? left - 12 - m.width
          : compact
            ? Math.max(left, Math.min(right - m.width, left + (index + 0.5) * dx - m.width / 2))
            : left + (index + 0.5) * dx - m.width / 2;
        const labelY = ir.horizontal ? top + (index + 0.5) * dx - m.height / 2 : bottom + 12;
        const start = ir.horizontal ? labelY : labelX;
        // A stride is only an estimate: edge clamping and wrapped labels can
        // change the final footprint. Check the actual emitted bounds as well.
        if (start < previousTickLabelEnd + tickLabelGap) continue;
        previousTickLabelEnd = start + (ir.horizontal ? m.height : m.width);
        chartText(l, labelX, labelY, "mutedText", fontSize, 400, labelLimit);
      }
    if (topTitle) chartText(topTitle, left, 16, "headerText", headerSize, 600, plotWidth);
    if (bottomTitle)
      chartText(bottomTitle, left, bottomTitleY(bottom), "headerText", headerSize, 600, plotWidth);
    const maxLegendLabelWidth = Math.max(
      0,
      ...ir.events.map(
        (event, index) =>
          chartMeasure(event.label || style?.seriesLabels?.[index] || "Series").width,
      ),
    );
    const legendRight =
      style?.legendPosition === "right" &&
      (!compact || right + 24 + 22 + maxLegendLabelWidth + padding * 2 < viewportWidth);
    const legendLeft = compact && !legendRight ? 16 : left;
    const legendLimit = compact && !legendRight ? viewportWidth - padding * 2 - 40 : undefined;
    const legendHeight = ir.events.reduce(
      (height, event, index) =>
        height +
        measure(event.label || style?.seriesLabels?.[index] || "Series", { fontSize }).height +
        bandGap,
      -bandGap,
    );
    let legendX = legendRight ? right + 24 : legendLeft,
      legendY = legendRight
        ? top + Math.max(0, (plotHeight - legendHeight) / 2)
        : bottomTitleY(bottom) +
          (bottomTitle
            ? chartMeasure(bottomTitle, headerSize, 600, plotWidth).height + bandGap
            : 0);
    let barIndex = 0,
      lineIndex = 0;
    let legendRowHeight = 0;
    for (const [index, event] of ir.events.entries()) {
      const label =
          event.label ||
          style?.seriesLabels?.[index] ||
          `${event.type === "bar" ? "Bar" : "Line"} ${event.type === "bar" ? ++barIndex : ++lineIndex}`,
        m = chartMeasure(label, fontSize, 400, legendLimit);
      if (
        !legendRight &&
        legendX + 24 + m.width > (compact ? viewportWidth - padding * 2 : right) &&
        legendX > legendLeft
      ) {
        legendX = legendLeft;
        legendY += legendRowHeight + bandGap;
        legendRowHeight = 0;
      }
      if (style?.legendMarker === "circle")
        primitives.push({
          type: "shape",
          shape: "circle",
          x: legendX + 2,
          y: legendY + m.height / 2 - 5,
          width: 10,
          height: 10,
          strokeWidth: 0,
          fill: `palette:${seriesPalette(event, index)}`,
        });
      else
        path(
          [
            { x: legendX, y: legendY + m.height / 2 },
            { x: legendX + 14, y: legendY + m.height / 2 },
          ],
          `palette:${seriesPalette(event, index)}`,
          "edge",
        );
      chartText(label, legendX + 22, legendY, "mutedText", fontSize, 400, legendLimit);
      legendRowHeight = Math.max(legendRowHeight, m.height);
      if (legendRight) legendY += m.height + bandGap;
      else legendX += m.width + 40;
    }
    const placements = placeLabels(
      annotations,
      { x: left, y: top, width: plotWidth, height: plotHeight },
      seriesMarkers
        .filter((p) => p.type === "shape")
        .map((p) => ({
          cx: p.x + p.width / 2,
          cy: p.y + p.height / 2,
          radius: p.width / 2,
        })),
      {
        gap: Math.max(4, fontSize * 0.3),
        gutterTop: Math.max(bottomTitleY(bottom), legendY) + fontSize * 2 + bandGap,
      },
    );
    let calloutY = Math.max(bottomTitleY(bottom), legendY + legendRowHeight) + bandGap;
    for (let index = 0; index < annotations.length; index++) {
      const annotation = annotations[index],
        placement = placements[index];
      if (compact && placement.y >= bottom) {
        // A textual callout list keeps dense value labels readable without
        // leaders running through axis captions or the series legend.
        const sourceIndex = Number(annotation.id.split(":").at(-1));
        const category = labels[sourceIndex] ?? String(sourceIndex + 1);
        const caption = `${category} · ${annotation.label}`;
        const captionWidth = viewportWidth - padding * 2 - 16;
        const metrics = chartMeasure(caption, fontSize, 400, captionWidth);
        chartText(caption, 16, calloutY, "nodeText", fontSize, 400, captionWidth);
        const primitive = primitives.at(-1);
        if (primitive?.type === "text" && annotation.motion)
          primitive.motion = { ...annotation.motion, prefix: `${category} · ` };
        calloutY += metrics.height + bandGap;
        continue;
      }
      if (placement.leader) path(placement.leader, "mutedText", "grid");
      primitives.push({
        type: "text",
        text: annotation.label,
        x: placement.x,
        y: placement.y,
        width: annotation.width,
        height: annotation.height,
        fontSize,
        color: "nodeText",
        lineRuns: runsForLines(annotation.label, annotation.metrics.lines),
        ...(annotation.motion ? { motion: annotation.motion } : {}),
        ...(annotation.metrics.lineBaselines
          ? { lineBaselines: annotation.metrics.lineBaselines }
          : {}),
      });
    }
    return;
  }
  if (
    layoutCompactTemporal(ir, kind, primitives, interactions, unboundedMeasure, {
      ...options,
      fontSize,
    })
  )
    return;
  const actors = [...new Set(ir.events.flatMap((e) => e.actors ?? []))];
  const journeyStyle = options.typeStyles?.journey,
    timelineStyle = options.typeStyles?.timeline;
  const timelineMarkers: Primitive[] = [];
  const timelineRadius = styleSize(timelineStyle?.markerRadius, 6, 3, 24);
  const sectionHeight = Math.max(
    0,
    ...ir.events.map((event) =>
      event.section ? measure(event.section, { fontSize: headerSize, fontWeight: 600 }).height : 0,
    ),
  );
  const cardY = Math.max(
    kind === "timeline" ? 32 : 76,
    sectionHeight ? 24 + sectionHeight + 16 : 0,
  );
  const timelineBaseline =
    cardY +
    Math.max(
      0,
      ...ir.events.map((event) => {
        const [period, ...items] = event.label.split("\n");
        return (
          measure(period, {
            fontSize: fontSize * styleSize(timelineStyle?.periodScale, 1.15, 1, 1.5),
            fontWeight: 600,
          }).height +
          measure(items.join("\n"), { fontSize }).height +
          32
        );
      }),
    ) +
    36;
  const cardHeight = Math.max(
    48,
    ...ir.events.map((e) => measure(e.label, { fontSize }).height + 24),
  );
  const scoreTop = cardY + cardHeight + 40;
  const actorTop = scoreTop + 92;
  const actorGap = Math.max(
    styleSize(journeyStyle?.actorGap, 34, 24),
    ...actors.map((actor) => measure(actor, { fontSize }).height + 12),
    ...ir.events.map((event) => measure(event.label, { fontSize }).height + 28),
  );
  if (kind === "journey")
    for (const [index, actor] of actors.entries())
      text(actor, 12, actorTop + index * actorGap - 8, "mutedText");
  let cursor =
    kind === "journey"
      ? Math.max(80, ...actors.map((actor) => measure(actor, { fontSize }).width + 24))
      : 24;
  let previousSection: string | undefined;
  let previousCenter: Point | undefined;
  for (const [eventIndex, event] of ir.events.entries()) {
    const x = cursor;
    const m = measure(event.label, { fontSize });
    const period = event.label.split("\n")[0];
    const periodSize = fontSize * styleSize(timelineStyle?.periodScale, 1.15, 1, 1.5);
    const width = Math.max(
      styleSize(kind === "journey" ? journeyStyle?.cardWidth : timelineStyle?.cardWidth, 144, 80),
      m.width + 28,
      kind === "timeline"
        ? measure(period, { fontSize: periodSize, fontWeight: 600 }).width + 28
        : 0,
    );
    if (event.section !== previousSection) {
      text(event.section ?? "", x, 24, "headerText", headerSize, 600);
      previousSection = event.section;
    }
    const eventPrimitiveStart = primitives.length;
    const card = box(
      "",
      x,
      cardY,
      width,
      kind === "journey" ? cardHeight : m.height + 28,
      "nodeFill",
    );
    if (kind === "journey") {
      primitives.pop();
      const color = eventIndex === 0 ? 7 : ((eventIndex - 1) % 3) + 1;
      primitives.push({
        type: "path",
        points: [
          { x, y: cardY },
          { x: x + width - 12, y: cardY },
          { x: x + width, y: cardY + cardHeight / 2 },
          { x: x + width - 12, y: cardY + cardHeight },
          { x, y: cardY + cardHeight },
          { x: x + 12, y: cardY + cardHeight / 2 },
        ],
        closed: true,
        fill: `paletteFill:${color}`,
        stroke: `palette:${color}`,
        strokeRole: "node",
      });
      text(
        event.label,
        x + (width - m.width) / 2,
        cardY + (cardHeight - m.height) / 2,
        "nodeText",
        fontSize,
        600,
      );
    } else {
      const [period, ...events] = event.label.split("\n");
      const pm = measure(period, { fontSize: periodSize, fontWeight: 600 });
      text(period, x + 14, cardY + 12, "accent", periodSize, 600);
      if (events.length) text(events.join("\n"), x + 14, cardY + 12 + pm.height + 8);
      // Include measured header growth rather than reserve a giant empty card.
      card.height = pm.height + measure(events.join("\n"), { fontSize }).height + 32;
      card.stroke = "accent";
    }
    for (let i = eventPrimitiveStart; i < primitives.length; i++)
      primitives[i]!.semantic = {
        kind: "node",
        id: `${kind}:event:${eventIndex}`,
        role: kind === "journey" ? "stage" : "event",
        row: eventIndex,
      };
    interactions.push({
      id: `${kind}:event:${eventIndex}`,
      kind: "data",
      target: `${kind}:event:${eventIndex}`,
      label: event.label,
      tooltip: event.section ? `${event.section}: ${event.label}` : event.label,
      x,
      y: cardY,
      width,
      height: card.height,
      ...(kind === "journey" ? { value: event.value } : {}),
    });
    if (kind === "journey") {
      const scoreRadius = styleSize(journeyStyle?.scoreRadius, 15, 10, 24);
      const cx = x + width / 2,
        cy = scoreTop;
      const scoreColor = `palette:${event.value! <= 2 ? 0 : event.value! >= 4 ? 2 : 3}`;
      if (previousCenter)
        path(
          [
            { x: previousCenter.x + scoreRadius, y: cy },
            { x: cx - scoreRadius, y: cy },
          ],
          "gridStroke",
          "edge",
        );
      const scorePrimitiveStart = primitives.length;
      primitives.push({
        type: "shape",
        shape: "circle",
        x: cx - scoreRadius,
        y: cy - scoreRadius,
        width: scoreRadius * 2,
        height: scoreRadius * 2,
        fill: "nodeFill",
        stroke: scoreColor,
        strokeRole: "node",
      });
      for (const dx of [-5, 5])
        primitives.push({
          type: "shape",
          shape: "circle",
          x: cx + dx - 1.5,
          y: cy - 6,
          width: 3,
          height: 3,
          fill: scoreColor,
          strokeWidth: 0,
        });
      primitives.push({
        type: "path",
        points: [
          { x: cx - 7, y: cy + 5 },
          { x: cx, y: cy + 5 + (event.value! - 3) * 2 },
          { x: cx + 7, y: cy + 5 },
        ],
        smooth: true,
        stroke: scoreColor,
        strokeRole: "edge",
      });
      text(
        String(event.value),
        cx - measure(String(event.value), { fontSize }).width / 2,
        cy + scoreRadius + 8,
      );
      for (let i = scorePrimitiveStart; i < primitives.length; i++)
        primitives[i]!.semantic = {
          kind: "node",
          id: `journey:score:${eventIndex}`,
          role: "score",
          row: eventIndex,
        };
      interactions.push({
        id: `journey:score:${eventIndex}`,
        kind: "data",
        target: `journey:score:${eventIndex}`,
        label: event.label,
        value: event.value,
        tooltip: `${event.label}: satisfaction ${event.value}/5`,
        x: cx - scoreRadius,
        y: cy - scoreRadius,
        width: scoreRadius * 2,
        height: scoreRadius * 2,
        hit: { type: "circle", cx, cy, radius: scoreRadius },
      });
      previousCenter = { x: cx, y: cy };
      for (const [actorIndex, actor] of actors.entries()) {
        const y = actorTop + actorIndex * actorGap;
        if (event.actors?.includes(actor)) {
          const actorPrimitiveStart = primitives.length;
          const activity = box(
            event.label,
            x,
            y - 12,
            width,
            Math.max(28, m.height + 16),
            "headerFill",
          );
          for (let i = actorPrimitiveStart; i < primitives.length; i++)
            primitives[i]!.semantic = {
              kind: "node",
              id: `journey:actor:${actorIndex}:${eventIndex}`,
              role: "actor",
              row: eventIndex,
            };
          interactions.push({
            id: `journey:actor:${actorIndex}:${eventIndex}`,
            kind: "data",
            target: `journey:actor:${actorIndex}:${eventIndex}`,
            label: `${actor}: ${event.label}`,
            tooltip: `${actor}: ${event.label}`,
            value: event.value,
            x: activity.x,
            y: activity.y,
            width: activity.width,
            height: activity.height,
          });
          const nextEvent = ir.events[eventIndex + 1];
          if (nextEvent?.actors?.includes(actor))
            primitives.push({
              type: "path",
              points: [
                { x: x + width + 4, y: y + 2 },
                { x: x + width + styleSize(journeyStyle?.cardGap, 24, 12) - 4, y: y + 2 },
              ],
              end: "arrow",
              semantic: {
                kind: "edge",
                id: `journey:actor-link:${actorIndex}:${eventIndex}`,
                role: "actor-link",
                row: eventIndex,
              },
              strokeRole: "edge",
            });
        }
      }
    } else {
      const center = { x: x + width / 2, y: timelineBaseline };
      path(
        [
          { x: previousCenter ? previousCenter.x + timelineRadius : x, y: center.y },
          { x: center.x - timelineRadius, y: center.y },
        ],
        "nodeText",
        "frame",
      );
      path(
        [
          { x: center.x, y: cardY + card.height },
          { x: center.x, y: center.y - timelineRadius },
        ],
        "accent",
        "frame",
      );
      primitives.at(-1)!.semantic = {
        kind: "edge",
        id: `timeline:stem:${eventIndex}`,
        role: "stem",
        row: eventIndex,
      };
      timelineMarkers.push({
        semantic: {
          kind: "node",
          id: `timeline:marker:${eventIndex}`,
          role: "marker",
          row: eventIndex,
        },
        type: "shape",
        shape: "circle",
        x: center.x - timelineRadius,
        y: center.y - timelineRadius,
        width: timelineRadius * 2,
        height: timelineRadius * 2,
        fill: "accent",
        strokeWidth: 0,
      });
      previousCenter = center;
    }
    cursor +=
      width +
      styleSize(kind === "journey" ? journeyStyle?.cardGap : timelineStyle?.eventGap, 24, 12);
  }
  if (kind === "timeline" && previousCenter) {
    primitives.push({
      type: "path",
      points: [
        { x: previousCenter.x + timelineRadius, y: previousCenter.y },
        { x: cursor - styleSize(timelineStyle?.eventGap, 24, 12) + 12, y: previousCenter.y },
      ],
      stroke: "nodeText",
      strokeRole: "frame",
      end: "open",
    });
    primitives.push(...timelineMarkers);
  }
}
