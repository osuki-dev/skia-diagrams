import { boundedNumber } from "./options.ts";
import type {
  DiagramInteraction,
  LayoutOptions,
  ParsedDiagram,
  Point,
  Primitive,
  Rect,
  Scene,
  TextMeasurer,
} from "../types.ts";
import type { BlockCell, BlockGroup, KanbanColumn } from "../parse/extended-blocks.ts";
import { intersectShape } from "../render/geometry.ts";
import { estimateText } from "./measure.ts";

/** Native board layouts: every primitive uses the shared renderer's theme tokens. */
export function layoutExtendedBlocks(
  parsed: ParsedDiagram,
  measure: TextMeasurer = estimateText,
  options: LayoutOptions = {},
): Scene | undefined {
  if (
    !["block", "kanban", "swimlanes"].includes(parsed.kind) ||
    parsed.kind === "error" ||
    parsed.kind === "unsupported"
  )
    return undefined;
  const { kind, ir } = parsed;
  const nodesById = new Map(ir.nodes.map((node) => [node.id, node]));
  const compoundIds = new Set<string>();
  const primitives: Primitive[] = [],
    interactions: DiagramInteraction[] = [],
    positions = new Map<string, Rect>();
  const size = boundedNumber(options.fontSize, 14, 6, 72);
  const padding = boundedNumber(options.padding, 20, 0, 200);
  const gap = boundedNumber(options.nodeSeparation, 24, 8, 300);
  // Reserve text inside the shape's inscribed area, rather than its bounding box.
  const nodeMetrics = (label: string, shape: string, availableWidth: number) => {
    const inset = shape === "flag" ? 0.2 : 0;
    const maxWidth = Math.max(24, availableWidth * (1 - inset) - 24);
    const measured = measure(label, { fontSize: size, maxWidth });
    const minimumHeight = shape === "diamond" ? measured.height * 2 + 32 : measured.height + 24;
    const diameter = Math.hypot(measured.width + 24, measured.height + 24);
    return {
      measured,
      maxWidth,
      height: shape === "circle" || shape === "doublecircle" ? diameter : minimumHeight,
      width:
        shape === "circle" || shape === "doublecircle"
          ? diameter
          : shape === "diamond"
            ? Math.max(availableWidth, measured.width * 2 + 32)
            : availableWidth,
    };
  };
  let width = padding * 2,
    height = padding * 2;
  const text = (
    value: string,
    x: number,
    y: number,
    maxWidth = 240,
    weight = 400,
    color = "nodeText",
  ) => {
    const metrics = measure(value, { fontSize: size, fontWeight: weight, maxWidth });
    primitives.push({
      type: "text",
      text: metrics.lines.join("\n"),
      x,
      y,
      width: kind === "kanban" ? maxWidth : metrics.width,
      height: metrics.height,
      fontSize: size,
      fontWeight: weight,
      color,
      ...(metrics.lineBaselines ? { lineBaselines: metrics.lineBaselines } : {}),
    });
    return metrics.height;
  };
  const shape = (
    rect: Rect,
    id?: string,
    fill = "nodeFill",
    stroke: string | undefined = "nodeStroke",
  ) =>
    primitives.push({
      type: "shape",
      shape: "round",
      ...rect,
      id,
      fill,
      stroke,
      strokeRole: "node",
      ...(id ? nodesById.get(id)?.style : undefined),
    });
  let top = padding;
  if (ir.title) top += text(ir.title, padding, top, 500, 700) + gap;
  if (kind === "kanban") {
    const columns = ir.data?.columns as KanbanColumn[] | undefined;
    if (!columns) throw new Error("Missing kanban semantic data");
    const available = options.viewportWidth
      ? Math.max(120, options.viewportWidth - padding * 2)
      : undefined;
    const cardWidth = available
      ? available - 24
      : Math.min(360, Math.max(160, options.maxLabelWidth ?? 220));
    const boardWidth = cardWidth + 24;
    const kanbanConfig = ir.data?.config as Record<string, unknown> | undefined;
    const ticketBaseUrl =
      typeof kanbanConfig?.ticketBaseUrl === "string" ? kanbanConfig.ticketBaseUrl : undefined;
    columns.forEach((column, index) => {
      const x = available ? padding : padding + index * (boardWidth + gap),
        first = primitives.length;
      let y = top + 16;
      y += text(column.label, x + 12, y, cardWidth, 700) + gap;
      for (const card of column.cards) {
        const cardTop = y,
          cardInteractionStart = interactions.length,
          shapeIndex = primitives.length;
        // Insert background before text while measuring real multiline task content.
        primitives.push({
          type: "shape",
          shape: "round",
          x: x + 12,
          y,
          width: cardWidth,
          height: 1,
          fill: "nodeFill",
          stroke: "nodeStroke",
          strokeRole: "node",
          id: card.id,
        });
        y += 12 + text(card.label, x + 24, y + 12, cardWidth - 24);
        const meta = card.metadata;
        if (meta.ticket) {
          const ticketTop = y + 8;
          const ticketHeight = text(meta.ticket, x + 24, ticketTop, cardWidth - 24, 500, "accent");
          if (ticketBaseUrl) {
            const target = ticketBaseUrl.replaceAll("#TICKET#", encodeURIComponent(meta.ticket));
            interactions.push({
              id: `${column.id}:${card.id}:ticket`,
              label: `${meta.ticket}: ${card.label}`,
              kind: "link",
              target,
              tooltip: `Open ticket ${meta.ticket}`,
              x: x + 12,
              y: ticketTop - 4,
              width: cardWidth,
              height: ticketHeight + 8,
            });
          }
          y += 8 + ticketHeight;
        }
        if (meta.assigned)
          y += 8 + text(`@${meta.assigned}`, x + 24, y + 8, cardWidth - 24, 400, "mutedText");
        if (meta.priority)
          y += 8 + text(meta.priority, x + 24, y + 8, cardWidth - 24, 500, "accent");
        y += 12;
        (primitives[shapeIndex] as Extract<Primitive, { type: "shape" }>).height = y - cardTop;
        interactions.splice(cardInteractionStart, 0, {
          id: `${column.id}:${card.id}:data`,
          kind: "data",
          target: card.id,
          label: card.label,
          tooltip: [
            card.label,
            ...Object.entries(meta).map(([key, value]) => `${key}: ${value}`),
          ].join("\n"),
          x: x + 12,
          y: cardTop,
          width: cardWidth,
          height: y - cardTop,
        });
        y += 12;
      }
      const bottom = Math.max(top + 100, y + 4);
      primitives.splice(first, 0, {
        type: "shape",
        shape: "round",
        x,
        y: top,
        width: boardWidth,
        height: bottom - top,
        fill: `paletteFill:${index % 8}`,
        stroke: "gridStroke",
        strokeRole: "frame",
        id: column.id,
      });
      width = Math.max(width, x + boardWidth + padding);
      height = Math.max(height, bottom + padding);
      if (available) top = bottom + gap;
    });
  } else if (kind === "block") {
    const root = ir.data?.block as BlockGroup | undefined;
    if (!root) throw new Error("Missing block semantic data");
    const unit = Math.max(100, Math.min(400, options.maxLabelWidth ?? 160));
    const metrics = new Map<
      BlockGroup,
      {
        columns: number;
        rows: { cells: { cell: BlockCell; column: number; span: number }[]; height: number }[];
        width: number;
        height: number;
      }
    >();
    const prepare = (group: BlockGroup): ReturnType<typeof metrics.get> & {} => {
      const columns =
        group.columns ??
        Math.max(
          1,
          group.cells.reduce((sum, c) => sum + c.span, 0),
        );
      let requiredUnit = unit;
      for (const cell of group.cells) {
        const span = Math.min(columns, cell.span);
        if (cell.group) {
          const child = prepare(cell.group);
          requiredUnit = Math.max(requiredUnit, (child.width + 24 - gap * (span - 1)) / span);
        } else {
          const node = nodesById.get(cell.id);
          const needed = nodeMetrics(
            node?.label ?? "",
            node?.shape ?? "rect",
            unit * span + gap * (span - 1),
          ).width;
          requiredUnit = Math.max(requiredUnit, (needed - gap * (span - 1)) / span);
        }
      }
      const rows: { cells: { cell: BlockCell; column: number; span: number }[]; height: number }[] =
        [];
      let col = 0;
      for (const cell of group.cells) {
        const span = Math.min(columns, cell.span);
        if (!rows.length || col + span > columns) {
          rows.push({ cells: [], height: 56 });
          col = 0;
        }
        const row = rows.at(-1)!;
        row.cells.push({ cell, column: col, span });
        col += span;
        const node = nodesById.get(cell.id);
        const contentHeight = cell.group
          ? metrics.get(cell.group)!.height + 24
          : cell.arrows
            ? measure(node?.label ?? "", { fontSize: size, maxWidth: requiredUnit * span - 64 })
                .height *
                2 +
              40
            : nodeMetrics(
                node?.label ?? "",
                node?.shape ?? "rect",
                (requiredUnit * span + gap * (span - 1)) / (node?.shape === "diamond" ? 2 : 1),
              ).height;
        row.height = Math.max(row.height, contentHeight);
      }
      const value = {
        columns,
        rows,
        width: columns * requiredUnit + (columns - 1) * gap,
        height:
          rows.reduce((sum, row) => sum + row.height, 0) +
          Math.max(0, rows.length - 1) * gap +
          (group.label
            ? measure(group.label, {
                fontSize: size,
                fontWeight: 600,
                maxWidth: columns * requiredUnit + (columns - 1) * gap,
              }).height + 8
            : 0),
      };
      metrics.set(group, value);
      return value;
    };
    const place = (group: BlockGroup, x: number, y: number, availableWidth: number) => {
      const layout = metrics.get(group)!,
        columnWidth = (availableWidth - gap * (layout.columns - 1)) / layout.columns;
      if (group.label) {
        y += text(group.label, x, y, availableWidth, 600, "clusterText") + 8;
        primitives.at(-1)!.semantic = { kind: "frame", id: group.id };
      }
      for (const row of layout.rows) {
        for (const { cell, column, span } of row.cells) {
          const rect = {
            x: x + column * (columnWidth + gap),
            y,
            width: columnWidth * span + gap * (span - 1),
            height: row.height,
          };
          if (cell.space) continue;
          if (cell.group) {
            positions.set(cell.id, rect);
            compoundIds.add(cell.id);
            shape(rect, cell.id, "clusterFill", "gridStroke");
            primitives.at(-1)!.semantic = { kind: "frame", id: cell.id };
            place(cell.group, rect.x + 12, rect.y + 12, rect.width - 24);
            continue;
          }
          const firstPrimitive = primitives.length;
          const node = nodesById.get(cell.id);
          if (!node) throw new Error(`Missing block node ${cell.id}`);
          const nm = nodeMetrics(
            node.label,
            node.shape,
            rect.width / (node.shape === "diamond" ? 2 : 1),
          );
          if (node.shape === "circle" || node.shape === "doublecircle") {
            const diameter = Math.min(rect.width, rect.height);
            rect.x += (rect.width - diameter) / 2;
            rect.y += (rect.height - diameter) / 2;
            rect.width = rect.height = diameter;
          }
          positions.set(cell.id, rect);
          let labelRect = { ...rect };
          if (cell.arrows) {
            const dirs = cell.arrows.flatMap((d) =>
              d === "x" ? ["left", "right"] : d === "y" ? ["up", "down"] : [d],
            );
            const cx = rect.x + rect.width / 2,
              cy = rect.y + rect.height / 2;
            if (dirs.length > 1) {
              const head = 20;
              const left = rect.x + (dirs.includes("left") ? head : 0),
                right = rect.x + rect.width - (dirs.includes("right") ? head : 0),
                upper = rect.y + (dirs.includes("up") ? head : 0),
                lower = rect.y + rect.height - (dirs.includes("down") ? head : 0);
              const halfX = Math.min((right - left) / 3, 20),
                halfY = Math.min((lower - upper) / 3, 20);
              const points: Point[] = [{ x: left, y: upper }];
              if (dirs.includes("up"))
                points.push(
                  { x: cx - halfX, y: upper },
                  { x: cx, y: rect.y },
                  { x: cx + halfX, y: upper },
                );
              points.push({ x: right, y: upper });
              if (dirs.includes("right"))
                points.push(
                  { x: right, y: cy - halfY },
                  { x: rect.x + rect.width, y: cy },
                  { x: right, y: cy + halfY },
                );
              points.push({ x: right, y: lower });
              if (dirs.includes("down"))
                points.push(
                  { x: cx + halfX, y: lower },
                  { x: cx, y: rect.y + rect.height },
                  { x: cx - halfX, y: lower },
                );
              points.push({ x: left, y: lower });
              if (dirs.includes("left"))
                points.push(
                  { x: left, y: cy + halfY },
                  { x: rect.x, y: cy },
                  { x: left, y: cy - halfY },
                );
              primitives.push({
                type: "path",
                points,
                closed: true,
                fill: node.style?.fill ?? "paletteFill:1",
                stroke: node.style?.stroke ?? "palette:1",
                strokeRole: "node",
              });
              labelRect = { x: left, y: upper, width: right - left, height: lower - upper };
            }
            for (const direction of dirs) {
              if (dirs.length > 1) break;
              const horizontal = direction === "left" || direction === "right",
                sign = direction === "left" || direction === "up" ? -1 : 1;
              const single = dirs.length === 1;
              const length = (horizontal ? rect.width : rect.height) * (single ? 1 : 0.5);
              const half = Math.min(
                  (horizontal ? rect.height : rect.width) / 4,
                  Math.max(12, (horizontal ? nm.measured.height : nm.measured.width) / 2 + 8),
                ),
                head = Math.min(20, length / 2);
              const originX = single && horizontal ? (sign > 0 ? rect.x : rect.x + rect.width) : cx;
              const originY =
                single && !horizontal ? (sign > 0 ? rect.y : rect.y + rect.height) : cy;
              if (single) {
                labelRect = horizontal
                  ? { ...rect, x: rect.x + (sign < 0 ? head : 0), width: rect.width - head }
                  : { ...rect, y: rect.y + (sign < 0 ? head : 0), height: rect.height - head };
              }
              const points = [
                [0, -half],
                [length - head, -half],
                [length - head, -half * 2],
                [length, 0],
                [length - head, half * 2],
                [length - head, half],
                [0, half],
              ].map(([a, b]) =>
                horizontal
                  ? { x: originX + sign * a, y: cy + b }
                  : { x: cx + b, y: originY + sign * a },
              );
              primitives.push({
                type: "path",
                points,
                closed: true,
                fill: node.style?.fill ?? "paletteFill:1",
                stroke: node.style?.stroke ?? "palette:1",
                strokeRole: "node",
              });
            }
          } else
            primitives.push({
              type: "shape",
              shape: node.shape,
              ...rect,
              id: node.id,
              fill: "nodeFill",
              stroke: "nodeStroke",
              strokeRole: "node",
              ...node.style,
            });
          if (node.shape === "flag") {
            labelRect.x += rect.width * 0.2;
            labelRect.width *= 0.8;
          }
          const maxWidth = cell.arrows ? Math.max(24, labelRect.width - 24) : nm.maxWidth;
          const m = measure(node.label, { fontSize: size, maxWidth });
          text(
            node.label,
            labelRect.x + (labelRect.width - m.width) / 2,
            labelRect.y + (labelRect.height - m.height) / 2,
            maxWidth,
            400,
            node.style?.color ?? "nodeText",
          );
          for (const p of primitives.slice(firstPrimitive))
            p.semantic = { kind: "node", id: node.id };
        }
        y += row.height + gap;
      }
    };
    const dimensions = prepare(root);
    place(root, padding, top, dimensions.width);
    width = dimensions.width + padding * 2;
    height = top + dimensions.height + padding;
  } else {
    const horizontal = ir.direction === "LR" || ir.direction === "RL";
    const lanes = ir.clusters.filter((c) => !c.parent);
    const nodeWidth = Math.max(120, Math.min(400, options.maxLabelWidth ?? 180));
    const maximumNodeWidth = Math.max(
      nodeWidth,
      ...ir.nodes.map((node) => nodeMetrics(node.label, node.shape, nodeWidth).width),
    );
    const maximumNodeHeight =
      Math.max(
        size,
        ...ir.nodes.map((node) => nodeMetrics(node.label, node.shape, nodeWidth).height),
      ) + 24;
    const laneSize = Math.max(140, maximumNodeWidth + 48, maximumNodeHeight + 48),
      timeGap = Math.max(maximumNodeWidth, maximumNodeHeight) + gap * 2;
    // Longest acyclic predecessor ranks align cross-lane handoffs. Back edges stay feedback edges.
    const ranks = new Map(ir.nodes.map((n) => [n.id, 0]));
    const predecessors = new Map<string, string[]>();
    for (const edge of ir.edges) {
      const inputs = predecessors.get(edge.to);
      if (inputs) inputs.push(edge.from);
      else predecessors.set(edge.to, [edge.from]);
    }
    const laneIndices = new Map(lanes.map((lane, index) => [lane.id, index]));
    const visiting = new Set<string>(),
      finished = new Set<string>();
    const rank = (id: string): number => {
      if (finished.has(id) || visiting.has(id)) return ranks.get(id) ?? 0;
      visiting.add(id);
      for (const predecessor of predecessors.get(id) ?? [])
        if (!visiting.has(predecessor))
          ranks.set(id, Math.max(ranks.get(id)!, rank(predecessor) + 1));
      visiting.delete(id);
      finished.add(id);
      return ranks.get(id)!;
    };
    for (const node of ir.nodes) rank(node.id);
    const occupied = new Set<string>();
    for (const node of ir.nodes) {
      let nodeRank = ranks.get(node.id) ?? 0;
      while (occupied.has(`${node.parent}:${nodeRank}`)) nodeRank++;
      occupied.add(`${node.parent}:${nodeRank}`);
      ranks.set(node.id, nodeRank);
    }
    const maxRank = Math.max(0, ...ranks.values());
    const timeLength = 100 + (maxRank + 1) * timeGap;
    lanes.forEach((lane, index) => {
      const firstPrimitive = primitives.length;
      const rect = horizontal
        ? { x: padding, y: top + index * laneSize, width: timeLength, height: laneSize }
        : { x: padding + index * laneSize, y: top, width: laneSize, height: timeLength };
      shape(rect, lane.id, `paletteFill:${index % 8}`, "gridStroke");
      text(lane.label, rect.x + 12, rect.y + 12, rect.width - 24, 700);
      for (const p of primitives.slice(firstPrimitive)) p.semantic = { kind: "frame", id: lane.id };
    });
    for (const node of ir.nodes) {
      const firstPrimitive = primitives.length;
      const laneIndex = node.parent ? (laneIndices.get(node.parent) ?? 0) : 0;
      const r = ranks.get(node.id) ?? 0,
        depth = ir.direction === "RL" || ir.direction === "BT" ? maxRank - r : r;
      const nm = nodeMetrics(node.label, node.shape, nodeWidth);
      const m = nm.measured;
      const rect = horizontal
        ? {
            x: padding + 100 + depth * timeGap,
            y: top + laneIndex * laneSize + (laneSize - nm.height) / 2,
            width: nm.width,
            height: nm.height,
          }
        : {
            x: padding + laneIndex * laneSize + (laneSize - nm.width) / 2,
            y: top + 64 + depth * timeGap,
            width: nm.width,
            height: nm.height,
          };
      positions.set(node.id, rect);
      primitives.push({
        type: "shape",
        shape: node.shape,
        ...rect,
        id: node.id,
        fill: "nodeFill",
        stroke: "nodeStroke",
        strokeRole: "node",
        ...node.style,
      });
      text(
        node.label,
        rect.x + (rect.width - m.width) / 2,
        rect.y + (rect.height - m.height) / 2,
        nm.maxWidth,
        400,
        node.style?.color ?? "nodeText",
      );
      for (const p of primitives.slice(firstPrimitive)) p.semantic = { kind: "node", id: node.id };
    }
    width = padding * 2 + (horizontal ? timeLength : lanes.length * laneSize);
    height = top + (horizontal ? lanes.length * laneSize : timeLength) + padding;
  }
  for (const [edgeIndex, edge] of ir.edges.entries()) {
    const firstPrimitive = primitives.length;
    const a = positions.get(edge.from),
      b = positions.get(edge.to);
    if (!a || !b) throw new Error(`Unknown diagram edge endpoint ${edge.from} → ${edge.to}`);
    // Contacts must face the gap between rectangles. Comparing top-left
    // coordinates routes into wide targets that overlap the source's x-span.
    const overlapX = a.x < b.x + b.width && b.x < a.x + a.width,
      overlapY = a.y < b.y + b.height && b.y < a.y + a.height,
      centerDX = b.x + b.width / 2 - a.x - a.width / 2,
      centerDY = b.y + b.height / 2 - a.y - a.height / 2;
    const horizontal = !overlapX && (overlapY || Math.abs(centerDX) >= Math.abs(centerDY));
    const forward = horizontal ? centerDX >= 0 : centerDY >= 0;
    const from = horizontal
      ? { x: a.x + (forward ? a.width : 0), y: a.y + a.height / 2 }
      : { x: a.x + a.width / 2, y: a.y + (forward ? a.height : 0) };
    const to = horizontal
      ? { x: b.x + (forward ? 0 : b.width), y: b.y + b.height / 2 }
      : { x: b.x + b.width / 2, y: b.y + (forward ? 0 : b.height) };
    if (!horizontal && overlapX) {
      const left = Math.max(a.x, b.x),
        right = Math.min(a.x + a.width, b.x + b.width),
        inset = Math.min(12, (right - left) / 4),
        x = Math.max(left + inset, Math.min(right - inset, a.x + a.width / 2));
      from.x = to.x = x;
    } else if (horizontal && overlapY) {
      const upper = Math.max(a.y, b.y),
        lower = Math.min(a.y + a.height, b.y + b.height),
        inset = Math.min(12, (lower - upper) / 4),
        y = Math.max(upper + inset, Math.min(lower - inset, a.y + a.height / 2));
      from.y = to.y = y;
    }
    let points = horizontal
      ? [from, { x: (from.x + to.x) / 2, y: from.y }, { x: (from.x + to.x) / 2, y: to.y }, to]
      : [from, { x: from.x, y: (from.y + to.y) / 2 }, { x: to.x, y: (from.y + to.y) / 2 }, to];
    const obstacles = [...positions.entries()]
      .filter(([id, rect]) => {
        // Compound containers are passable; actual sibling nodes are obstacles.
        if (id === edge.from || id === edge.to || compoundIds.has(id) || !nodesById.has(id))
          return false;
        return !(
          rect.x <= a.x &&
          rect.y <= a.y &&
          rect.x + rect.width >= a.x + a.width &&
          rect.y + rect.height >= a.y + a.height
        );
      })
      .map(([, rect]) => rect);
    const crosses = (route: Point[]) =>
      route.some((point, index) => {
        if (!index) return false;
        const previous = route[index - 1];
        return obstacles.some((rect) => {
          const clearance = 4;
          return point.x === previous.x
            ? point.x > rect.x - clearance &&
                point.x < rect.x + rect.width + clearance &&
                Math.max(point.y, previous.y) > rect.y - clearance &&
                Math.min(point.y, previous.y) < rect.y + rect.height + clearance
            : point.y > rect.y - clearance &&
                point.y < rect.y + rect.height + clearance &&
                Math.max(point.x, previous.x) > rect.x - clearance &&
                Math.min(point.x, previous.x) < rect.x + rect.width + clearance;
        });
      });
    if (crosses(points)) {
      const all = [a, b, ...obstacles],
        clearance = Math.max(12, gap / 2);
      const right = Math.max(...all.map((rect) => rect.x + rect.width)) + clearance;
      const bottom = Math.max(...all.map((rect) => rect.y + rect.height)) + clearance;
      const left = Math.max(2, Math.min(...all.map((rect) => rect.x)) - clearance);
      const upper = Math.max(2, Math.min(...all.map((rect) => rect.y)) - clearance);
      const candidates: Point[][] = [
        [
          { x: a.x + a.width, y: a.y + a.height / 2 },
          { x: right, y: a.y + a.height / 2 },
          { x: right, y: b.y + b.height / 2 },
          { x: b.x + b.width, y: b.y + b.height / 2 },
        ],
        [
          { x: a.x, y: a.y + a.height / 2 },
          { x: left, y: a.y + a.height / 2 },
          { x: left, y: b.y + b.height / 2 },
          { x: b.x, y: b.y + b.height / 2 },
        ],
        [
          { x: a.x + a.width / 2, y: a.y + a.height },
          { x: a.x + a.width / 2, y: bottom },
          { x: b.x + b.width / 2, y: bottom },
          { x: b.x + b.width / 2, y: b.y + b.height },
        ],
        [
          { x: a.x + a.width / 2, y: a.y },
          { x: a.x + a.width / 2, y: upper },
          { x: b.x + b.width / 2, y: upper },
          { x: b.x + b.width / 2, y: b.y },
        ],
      ];
      const distance = (route: Point[]) =>
        route.reduce(
          (sum, point, index) =>
            index
              ? sum +
                Math.abs(point.x - route[index - 1].x) +
                Math.abs(point.y - route[index - 1].y)
              : sum,
          0,
        );
      const clearRoutes = candidates.filter((route) => !crosses(route));
      if (!clearRoutes.length)
        throw new Error(`No unobstructed route for ${edge.from} → ${edge.to}`);
      points = clearRoutes.sort((one, two) => distance(one) - distance(two))[0];
    }
    const startNode = nodesById.get(edge.from),
      endNode = nodesById.get(edge.to);
    if (startNode && startNode.shape !== "rect")
      points[0] = intersectShape(startNode.shape, a, points[1], options.radius ?? 8);
    if (endNode && endNode.shape !== "rect")
      points[points.length - 1] = intersectShape(
        endNode.shape,
        b,
        points[points.length - 2],
        options.radius ?? 8,
      );
    width = Math.max(width, ...points.map((point) => point.x + padding));
    height = Math.max(height, ...points.map((point) => point.y + padding));
    primitives.push({
      type: "path",
      points,
      start: edge.start,
      end: edge.end,
      stroke: "edgeStroke",
      strokeRole: "edge",
      ...(edge.thick ? { strokeWidth: 3 } : {}),
      ...(edge.dashed ? { dash: [5, 4] } : {}),
      ...edge.style,
    });
    if (edge.label)
      text(
        edge.label,
        (from.x + to.x) / 2 + 4,
        (from.y + to.y) / 2 - size - 4,
        220,
        400,
        "mutedText",
      );
    for (const p of primitives.slice(firstPrimitive))
      p.semantic = { kind: "edge", id: `${kind}-edge:${edgeIndex}`, from: edge.from, to: edge.to };
  }
  const positionedNodes = ir.nodes.filter((node) => positions.has(node.id));
  for (const node of positionedNodes)
    if (node.interaction)
      interactions.push({
        ...positions.get(node.id)!,
        id: node.id,
        label: node.label,
        ...node.interaction,
      });
  // A child node receives the hit before a surrounding composite frame.
  positionedNodes.sort((one, two) => {
    const a = positions.get(one.id)!,
      b = positions.get(two.id)!;
    return a.width * a.height - b.width * b.height;
  });
  for (const node of positionedNodes)
    interactions.push({
      ...positions.get(node.id)!,
      id: `${node.id}:data`,
      kind: "data",
      target: node.id,
      label: node.label,
      tooltip: node.label,
    });
  return {
    kind,
    bounds: { x: 0, y: 0, width, height },
    primitives,
    accessibilityLabel: ir.description ?? ir.title ?? `${kind} diagram`,
    ...(interactions.length ? { interactions } : {}),
  };
}
