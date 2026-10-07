import { clonePrimitive } from "./scene-geometry.ts";
import { runsForLines } from "../render/text.ts";
import type { ParsedDiagram, TextMeasurer, LayoutOptions, Scene, Primitive } from "../types.ts";

/** Native lifelines, activation bars, messages, notes, and structured fragments. */
export function layoutZenuml(
  parsed: ParsedDiagram,
  measure: TextMeasurer,
  options: LayoutOptions = {},
): Scene | undefined {
  if (parsed.kind !== "zenuml") return undefined;
  const { ir } = parsed;
  const padding = options.padding ?? 20,
    fontSize = options.fontSize ?? 14;
  let gap = options.typeStyles?.sequence?.laneGap ?? 80;
  const rowGap = Math.max(fontSize * 2.6, options.typeStyles?.sequence?.rowGap ?? 52);
  const primitives: Primitive[] = [];
  const text = (value: string, x: number, y: number, width?: number) => {
    const metrics = measure(value, { fontSize, maxWidth: options.maxLabelWidth ?? 320 });
    primitives.push({
      type: "text",
      text: value,
      x,
      y,
      width: width ?? metrics.width,
      height: metrics.height,
      fontSize,
      color: "nodeText",
      lineRuns: runsForLines(value, metrics.lines),
      ...(metrics.lineBaselines ? { lineBaselines: metrics.lineBaselines } : {}),
    });
    return metrics;
  };
  const numbers = (ir.data?.numbering ?? []) as string[];
  const gutter = Math.max(24, ...numbers.map((number) => measure(number, { fontSize }).width + 12));
  const contentLeft = padding + gutter;
  const displayLabels = ir.nodes.map((node) =>
    [
      node.metadata?.stereotype ? `«${node.metadata.stereotype}»` : "",
      node.metadata?.emoji
        ? `${emojiLabel(String(node.metadata.emoji))} ${node.label}`
        : node.label,
    ]
      .filter(Boolean)
      .join("\n"),
  );
  const widths = ir.nodes.map((node, index) =>
    Math.max(
      typeof node.metadata?.width === "number" && Number.isFinite(node.metadata.width)
        ? Math.max(40, Math.min(2400, node.metadata.width))
        : (options.typeStyles?.sequence?.participantWidth ?? 100),
      measure(displayLabels[index], { fontSize }).width + 24,
    ),
  );
  const messageWidth = Math.max(
    0,
    ...ir.events
      .filter((event) => ["call", "async", "reply", "create"].includes(event.type))
      .map(
        (event) =>
          measure(event.label, { fontSize, maxWidth: options.maxLabelWidth ?? 320 }).width +
          24 +
          (event.type === "create" ? Math.max(...widths) / 2 : 0),
      ),
  );
  const narrowestHeader = Math.min(...widths);
  gap = Math.max(gap, messageWidth - narrowestHeader);
  const lanes = new Map<string, number>();
  let cursor = contentLeft + 50;
  widths.forEach((width, index) => {
    lanes.set(ir.nodes[index].id, cursor + width / 2);
    cursor += width + gap;
  });
  const titleHeight = ir.title
    ? Math.max(
        fontSize * 2.5,
        measure(ir.title, { fontSize, maxWidth: options.maxLabelWidth ?? 320 }).height + 16,
      )
    : 0;
  if (ir.title) text(ir.title, padding, padding);
  const groupHeight = ir.clusters.length
    ? Math.max(
        30,
        ...ir.clusters.map((cluster) => measure(cluster.label, { fontSize }).height + 12),
      )
    : 0;
  const headerY = padding + titleHeight + groupHeight,
    headerHeight = Math.max(
      fontSize *
        (ir.nodes.some((node) => node.annotation && node.annotation !== "Database") ? 5 : 2.8),
      ...displayLabels.map(
        (value, index) =>
          measure(value, { fontSize }).height +
          (ir.nodes[index].annotation === "Actor"
            ? fontSize * 3.5 + 8
            : ir.nodes[index].annotation
              ? fontSize * 2.5 + 8
              : 16),
      ),
    );
  for (const cluster of ir.clusters) {
    const memberIndexes = ir.nodes.flatMap((node, index) => {
      let parent = node.parent;
      while (parent) {
        if (parent === cluster.id) return [index];
        parent = ir.clusters.find((group) => group.id === parent)?.parent;
      }
      return [];
    });
    if (!memberIndexes.length) continue;
    const left =
      Math.min(
        ...memberIndexes.map((index) => lanes.get(ir.nodes[index].id)! - widths[index] / 2),
      ) - 10;
    const right =
      Math.max(
        ...memberIndexes.map((index) => lanes.get(ir.nodes[index].id)! + widths[index] / 2),
      ) + 10;
    primitives.push({
      type: "shape",
      shape: "rect",
      id: cluster.id,
      x: left,
      y: headerY - groupHeight,
      width: right - left,
      height: headerHeight + groupHeight + 10,
      fill: "transparent",
      stroke: "clusterStroke",
      strokeRole: "frame",
    });
    text(cluster.label, left + 8, headerY - groupHeight + 5);
  }
  const rows = ir.events.map(
    (event) =>
      Math.max(
        rowGap,
        measure(event.label, { fontSize, maxWidth: 320 }).height + 24,
        event.type === "ref" ||
          (event.type === "fragmentStart" && fragmentHeading(event.label).condition)
          ? (event.type === "ref"
              ? fontSize * 1.6
              : 6 + measure(fragmentHeading(event.label).name, { fontSize }).height + 6) +
              measure(
                event.type === "ref"
                  ? `[ref(${event.label})]`
                  : `[${fragmentHeading(event.label).condition}]`,
                { fontSize, maxWidth: 320 },
              ).height +
              16
          : 0,
      ) +
      (event.from && event.from === event.to && ["call", "async", "reply"].includes(event.type)
        ? 20
        : 0),
  );
  const created = new Map<string, number>();
  const createdOrder = new Map<string, number>();
  let creationMessageOrdinal = -1;
  let eventY = headerY + headerHeight + 15;
  for (const [index, event] of ir.events.entries()) {
    if (["call", "async", "reply", "create"].includes(event.type)) creationMessageOrdinal++;
    if (event.type === "create" && event.to && !created.has(event.to)) {
      created.set(event.to, eventY + rows[index] - 12 - headerHeight / 2);
      createdOrder.set(event.to, creationMessageOrdinal);
    }
    eventY += rows[index];
  }
  const bottom = headerY + headerHeight + rows.reduce((sum, row) => sum + row, 0) + 30;
  for (const [index, node] of ir.nodes.entries()) {
    const participantStart = primitives.length;
    const x = lanes.get(node.id)!;
    const participantY = created.get(node.id) ?? headerY;
    const iconSize = fontSize * 2.5;
    const annotationIcon = node.annotation
      ? options.resolveIcon?.(node.annotation, {
          x: x - iconSize / 2,
          y: participantY,
          width: iconSize,
          height: iconSize,
        })
      : undefined;
    const emoji = node.metadata?.emoji ? String(node.metadata.emoji) : undefined;
    const emojiIcon = emoji
      ? options.resolveIcon?.(emoji.replace(/^:|:$/g, ""), {
          x: x - widths[index] / 2 + 8,
          y: participantY + 8,
          width: fontSize * 1.5,
          height: fontSize * 1.5,
        })
      : undefined;
    primitives.push({
      type: "path",
      points: [
        { x, y: participantY + headerHeight },
        { x, y: bottom },
      ],
      stroke: "clusterStroke",
      dash: [5, 5],
      strokeRole: "grid",
      semantic: { kind: "edge", id: `lifeline:${node.id}`, role: "lifeline", group: node.id },
    });
    if (annotationIcon !== undefined) {
      appendIcon(primitives, annotationIcon);
      const label = node.metadata?.stereotype
        ? `«${node.metadata.stereotype}»\n${node.label}`
        : node.label;
      const metrics = measure(label, { fontSize });
      text(label, x - metrics.width / 2, participantY + iconSize + 8);
    } else if (node.annotation === "Actor") {
      const scale = fontSize / 14;
      primitives.push({
        type: "shape",
        shape: "circle",
        id: node.id,
        x: x - 7 * scale,
        y: participantY,
        width: 14 * scale,
        height: 14 * scale,
        fill: `paletteFill:${index % 8}`,
        stroke: "edgeStroke",
      });
      for (const points of [
        [
          { x, y: participantY + 14 * scale },
          { x, y: participantY + 34 * scale },
        ],
        [
          { x: x - 14 * scale, y: participantY + 23 * scale },
          { x: x + 14 * scale, y: participantY + 23 * scale },
        ],
        [
          { x: x - 12 * scale, y: participantY + 47 * scale },
          { x, y: participantY + 34 * scale },
          { x: x + 12 * scale, y: participantY + 47 * scale },
        ],
      ])
        primitives.push({ type: "path", points, stroke: "edgeStroke", strokeRole: "node" });
      const metrics = measure(displayLabels[index], { fontSize });
      text(displayLabels[index], x - metrics.width / 2, participantY + 49 * scale);
    } else {
      primitives.push({
        type: "shape",
        shape: node.shape,
        id: node.id,
        x: x - widths[index] / 2,
        y: participantY,
        width: widths[index],
        height: headerHeight,
        fill: node.style?.fill ?? `paletteFill:${index % 8}`,
        stroke: node.style?.stroke ?? `palette:${index % 8}`,
        strokeRole: "node",
      });
      const label =
        emojiIcon !== undefined
          ? node.metadata?.stereotype
            ? `«${node.metadata.stereotype}»\n${node.label}`
            : node.label
          : displayLabels[index];
      const displayed =
        node.annotation && node.annotation !== "Database" ? `@${node.annotation}\n${label}` : label;
      const metrics = measure(displayed, { fontSize });
      text(displayed, x - metrics.width / 2, participantY + (headerHeight - metrics.height) / 2);
      if (node.annotation && node.annotation !== "Database")
        primitives.push({
          type: "shape",
          shape: "rect",
          id: `zenuml-unresolved-icon:${node.annotation}`,
          x: x - widths[index] / 2 + 4,
          y: participantY + 4,
          width: 8,
          height: 8,
          fill: "transparent",
          stroke: "mutedText",
        });
    }
    if (emojiIcon !== undefined) appendIcon(primitives, emojiIcon);
    else if (emoji && !/\p{Extended_Pictographic}/u.test(emoji))
      primitives.push({
        type: "shape",
        shape: "rect",
        id: `zenuml-unresolved-icon:${emoji.replace(/^:|:$/g, "")}`,
        x: x - widths[index] / 2 + 4,
        y: participantY + 4,
        width: 8,
        height: 8,
        fill: "transparent",
        stroke: "mutedText",
      });
    for (const primitive of primitives.slice(participantStart))
      if (!primitive.semantic)
        primitive.semantic = {
          kind: "node",
          id: node.id,
          role: "participant",
          group: node.id,
          row: createdOrder.get(node.id) ?? -1,
          part: primitive.type === "text" ? "label" : "body",
        };
  }
  let messageOrdinal = -1;
  const activationWidth = options.typeStyles?.sequence?.activationWidth ?? 10;
  const activationOffset = activationWidth * 0.6;
  const active: { from: string; to: string; x: number; y: number; depth: number; row: number }[] =
    [];
  const currentActivation = (id: string | undefined) => {
    for (let index = active.length - 1; index >= 0; index--)
      if (active[index].to === id) return active[index];
    return undefined;
  };
  const frames: { y: number; depth: number; label: string; number: string }[] = [];
  let y = headerY + headerHeight + 15;
  for (const [index, event] of ir.events.entries()) {
    const fromX = lanes.get(event.from ?? "") ?? contentLeft;
    let toX = lanes.get(event.to ?? "") ?? contentLeft;
    if (event.type === "create") {
      const target = ir.nodes.findIndex((node) => node.id === event.to);
      toX -= (widths[target] ?? 0) / 2;
    }
    if (event.type === "fragmentStart") {
      frames.push({ y, depth: event.depth ?? 0, label: event.label, number: numbers[index] ?? "" });
    } else if (event.type === "fragmentBranch") {
      const frame = frames.at(-1);
      const inset = (frame?.depth ?? 0) * 6;
      primitives.push({
        type: "path",
        points: [
          { x: contentLeft + inset, y },
          { x: cursor - gap - inset, y },
        ],
        stroke: "clusterStroke",
        strokeRole: "frame",
        dash: [5, 5],
      });
      text(
        event.label === "else"
          ? "[else]"
          : event.label.startsWith("else if")
            ? `[${event.label
                .slice(7)
                .trim()
                .replace(/^\(|\)$/g, "")}]`
            : event.label,
        contentLeft + inset + 8,
        y + 6,
      );
    } else if (event.type === "fragmentEnd") {
      const frame = frames.pop();
      if (frame) {
        const inset = frame.depth * 6;
        primitives.unshift({
          type: "shape",
          shape: "rect",
          x: contentLeft + inset,
          y: frame.y,
          width: cursor - gap - contentLeft - inset * 2,
          height: y - frame.y,
          fill: "transparent",
          stroke: "clusterStroke",
          strokeRole: "frame",
        });
        const heading = fragmentHeading(frame.label);
        const headingMetrics = text(heading.name, contentLeft + inset + 8, frame.y + 6);
        if (heading.condition)
          text(
            `[${heading.condition}]`,
            contentLeft + inset + 8,
            frame.y + 6 + headingMetrics.height + 6,
          );

        const numberWidth = measure(frame.number, { fontSize }).width;
        text(frame.number, contentLeft + inset - numberWidth - 6, frame.y + 6);
      }
    } else if (event.type === "callEnd") {
      const activation = active.pop();
      if (activation)
        primitives.push({
          type: "shape",
          shape: "rect",
          x: activation.x,
          y: activation.y,
          width: activationWidth,
          height: Math.max(8, y - activation.y),
          fill: "paletteFill:0",
          stroke: "accent",
          strokeRole: "node",
          semantic: {
            kind: "edge",
            id: `activation:${activation.to}:${activation.y}`,
            role: "activation",
            row: activation.row,
            group: activation.to,
          },
        });
    } else if (event.type === "divider") {
      const metrics = measure(event.label, { fontSize });
      const center = (contentLeft + cursor - gap) / 2;
      const midY = y + rows[index] / 2;
      for (const [left, right] of [
        [contentLeft, center - metrics.width / 2 - 8],
        [center + metrics.width / 2 + 8, cursor - gap],
      ])
        if (right > left)
          primitives.push({
            type: "path",
            points: [
              { x: left, y: midY },
              { x: right, y: midY },
            ],
            stroke: "clusterStroke",
            strokeRole: "frame",
          });
      text(event.label, center - metrics.width / 2, midY - metrics.height / 2);
    } else if (event.type === "ref") {
      const left = Math.min(fromX, toX) - 30,
        width = Math.max(120, Math.abs(toX - fromX) + 60);
      primitives.push({
        type: "shape",
        shape: "rect",
        x: left,
        y,
        width,
        height: rows[index],
        fill: "clusterFill",
        stroke: "clusterStroke",
        strokeRole: "frame",
      });
      text("Ref", left + 10, y + 5);
      text(`[ref(${event.label.replace(/,\s+/g, ",")})]`, left + 10, y + fontSize * 1.6);
      text(
        numbers[index] ?? "",
        Math.max(padding, left - measure(numbers[index] ?? "", { fontSize }).width - 6),
        y + 8,
      );
    } else if (event.type === "note") {
      const noteStart = primitives.length;
      const metrics = measure(event.label, { fontSize, maxWidth: 320 });
      const x = Math.min(fromX, toX) + 12;
      primitives.push({
        type: "shape",
        shape: "round",
        x,
        y,
        width: metrics.width + 20,
        height: metrics.height + 16,
        fill: "noteFill",
        stroke: "clusterStroke",
      });
      text(event.label, x + 10, y + 8);
      for (const primitive of primitives.slice(noteStart))
        primitive.semantic = {
          kind: "edge",
          id: `note:${index}`,
          role: "note",
          row: Math.max(0, messageOrdinal),
          group: `note:${index}`,
          part: primitive.type === "text" ? "label" : "body",
        };
    } else {
      messageOrdinal++;
      const messageStart = primitives.length;
      const arrowY = y + rows[index] - 12 - (fromX === toX ? 20 : 0);
      const sourceActivation = currentActivation(event.from);
      const targetActivation = currentActivation(event.to);
      const createsActivation = event.type === "call" || event.type === "create";
      const activationDepth = active.filter((activation) => activation.to === event.to).length;
      const targetCenter = lanes.get(event.to ?? "") ?? toX;
      const newActivationX =
        targetCenter + activationDepth * activationOffset - activationWidth / 2;
      const selfCall = event.from === event.to;
      const goesRight = selfCall || targetCenter >= fromX;
      const sender = sourceActivation
        ? sourceActivation.x + (goesRight ? activationWidth : 0)
        : fromX;
      const receiver =
        event.type === "create"
          ? toX
          : createsActivation
            ? newActivationX + (selfCall || !goesRight ? activationWidth : 0)
            : targetActivation
              ? targetActivation.x + (selfCall || !goesRight ? activationWidth : 0)
              : toX;
      const loopRight = Math.max(sender, receiver) + Math.max(32, fontSize * 2.3);
      const points = selfCall
        ? [
            { x: sender, y: arrowY },
            { x: loopRight, y: arrowY },
            { x: loopRight, y: arrowY + 16 },
            { x: receiver, y: arrowY + 16 },
          ]
        : [
            { x: sender, y: arrowY },
            { x: receiver, y: arrowY },
          ];
      primitives.push({
        type: "path",
        points,
        stroke: "edgeStroke",
        end: event.type === "async" ? "open" : "arrow",
        strokeRole: "edge",
        ...(event.type === "reply" ? { dash: [5, 4] } : {}),
      });
      let messageLabel = event.type === "create" ? creationLabel(event.label) : event.label;
      const methodEmoji = /^(\[[^\]]+\]|:\w+:)\s*([\s\S]*)$/.exec(messageLabel);
      let labelX = Math.min(sender, receiver) + 10;
      if (sourceActivation && selfCall) labelX = sourceActivation.x + activationWidth + 10;
      if (methodEmoji) {
        const name = methodEmoji[1].replace(/^\[|\]$|^:|:$/g, "");
        const icon = options.resolveIcon?.(name, {
          x: labelX,
          y: y + 4,
          width: fontSize * 1.5,
          height: fontSize * 1.5,
        });
        if (icon !== undefined) {
          appendIcon(primitives, icon);
          messageLabel = methodEmoji[2];
          labelX += fontSize * 1.5 + 4;
        } else if (/\p{Extended_Pictographic}/u.test(name))
          messageLabel = `${name} ${methodEmoji[2]}`;
        else
          primitives.push({
            type: "shape",
            shape: "rect",
            id: `zenuml-unresolved-icon:${name}`,
            x: labelX,
            y: y + 4,
            width: 6,
            height: 6,
            fill: "transparent",
            stroke: "mutedText",
          });
      }
      text(messageLabel, labelX, y + 4);
      const number = numbers[index] ?? "";
      const numberWidth = measure(number, { fontSize }).width;
      const numberAnchor = Math.min(
        sourceActivation?.x ?? fromX,
        targetActivation?.x ?? targetCenter,
      );
      text(number, Math.max(padding, numberAnchor - numberWidth - 12), y + 4);
      if ((event.type === "call" || event.type === "create") && !event.flags?.includes("scope")) {
        primitives.push({
          type: "shape",
          shape: "rect",
          x: newActivationX,
          y: event.type === "create" ? arrowY + headerHeight / 2 : selfCall ? arrowY + 16 : arrowY,
          width: activationWidth,
          height: 12,
          fill: "paletteFill:0",
          stroke: "accent",
          strokeRole: "node",
          semantic: {
            kind: "edge",
            id: `activation:${event.to}:${arrowY}`,
            role: "activation",
            row: messageOrdinal,
            group: event.to,
          },
        });
      }
      for (const primitive of primitives.slice(messageStart))
        if (!primitive.semantic)
          primitive.semantic = {
            kind: "edge",
            id: `message:${messageOrdinal}`,
            role: "message",
            row: messageOrdinal,
            group: `message:${messageOrdinal}`,
            from: event.from,
            to: event.to,
            part: primitive.type === "path" ? "body" : "label",
          };
      if ((event.type === "call" || event.type === "create") && event.flags?.includes("scope"))
        active.push({
          from: event.from ?? "",
          to: event.to ?? "",
          x: newActivationX,
          y: event.type === "create" ? arrowY + headerHeight / 2 : selfCall ? arrowY + 16 : arrowY,
          depth: activationDepth,
          row: messageOrdinal,
        });
    }
    y += rows[index];
  }
  // Leave room for the measured longest message rather than truncating arrows' labels.
  let width = cursor - gap + padding;
  for (const primitive of primitives)
    if (primitive.type !== "path") width = Math.max(width, primitive.x + primitive.width + padding);
  return {
    kind: "zenuml",
    bounds: { x: 0, y: 0, width, height: bottom + padding },
    primitives,
    accessibilityLabel: [
      ir.title ?? "ZenUML",
      ...ir.nodes.map((node) => node.label),
      ...ir.events.map((event) => event.label).filter(Boolean),
    ].join(". "),
  };
}

function fragmentHeading(label: string): { name: string; condition: string } {
  const match = /^(\w+)\s*([\s\S]*)$/.exec(label)!;
  const names: Record<string, string> = {
    if: "Alt",
    while: "Loop",
    for: "Loop",
    forEach: "Loop",
    loop: "Loop",
    opt: "Opt",
    par: "Par",
    try: "Try",
    critical: "Critical",
    section: "Section",
    frame: "Section",
    foreach: "Loop",
  };
  return { name: names[match[1]] ?? match[1], condition: match[2].trim().replace(/^\(|\)$/g, "") };
}
function creationLabel(label: string): string {
  const parameters = /^new\s+[\w$]+(?:\(([\s\S]*)\))?$/.exec(label)?.[1];
  return parameters?.trim() ? `«${parameters.trim()}»` : "«create»";
}
function emojiLabel(value: string): string {
  return /\p{Extended_Pictographic}/u.test(value) ? value : `:${value.replace(/^:|:$/g, "")}:`;
}
function appendIcon(primitives: Primitive[], icon: readonly Primitive[]): void {
  for (const primitive of icon) primitives.push(clonePrimitive(primitive));
}
