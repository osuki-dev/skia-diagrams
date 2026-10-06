import type { DiagramIR, LayoutOptions, Primitive, Scene, TextMeasurer, Rect } from "../types.ts";
import { runsForLines } from "../render/text.ts";

/** Narrow temporal diagrams retain authored ordering as vertical, readable sections. */
export function layoutCompactTemporal(
  ir: DiagramIR,
  kind: Scene["kind"],
  primitives: Primitive[],
  interactions: NonNullable<Scene["interactions"]>,
  measure: TextMeasurer,
  options: LayoutOptions,
): boolean {
  if ((kind !== "timeline" && kind !== "journey") || !Number.isFinite(options.viewportWidth))
    return false;
  const size = options.fontSize ?? 14,
    padding = options.padding ?? 20;
  const available = Math.max(100, options.viewportWidth! - padding * 2),
    left = kind === "timeline" ? padding + 32 : padding,
    width = available - (kind === "timeline" ? 32 : 0);
  const text = (
    value: string,
    x: number,
    y: number,
    maxWidth: number,
    color = "nodeText",
    fontSize = size,
    weight = 400,
    row?: number,
    role = "label",
  ) => {
    const m = measure(value, { fontSize, fontWeight: weight, maxWidth });
    primitives.push({
      type: "text",
      text: value,
      x,
      y,
      width: maxWidth,
      height: m.height,
      fontSize,
      fontWeight: weight,
      color,
      lineRuns: runsForLines(value, m.lines),
      lineBaselines: m.lineBaselines,
      ...(row === undefined
        ? {}
        : {
            semantic: {
              kind: "node" as const,
              id: `${kind}:${role === "score" ? "score" : role === "actor" ? "actor" : "event"}:${row}`,
              role,
              row,
            },
          }),
    });
    return m.height;
  };
  const box = (rect: Rect, id: string, fill = "nodeFill", stroke = "nodeStroke", row?: number) =>
    primitives.push({
      type: "shape",
      shape: "round",
      ...rect,
      radius: options.radius ?? 8,
      fill,
      stroke,
      strokeRole: "node",
      semantic: { kind: "node", id, role: "body", row },
    });
  let y = 20,
    previousSection: string | undefined,
    previousMarker: { x: number; y: number } | undefined;
  for (const [index, event] of ir.events.entries()) {
    if (event.section && event.section !== previousSection) {
      y += text(event.section, left, y, width, "headerText", size * 1.08, 600) + 16;
      previousSection = event.section;
    }
    if (kind === "timeline") {
      const [period, ...entries] = event.label.split("\n"),
        pm = measure(period, { fontSize: size * 1.15, fontWeight: 600, maxWidth: width - 24 }),
        em = measure(entries.join("\n"), { fontSize: size, maxWidth: width - 24 });
      const height = 24 + pm.height + (entries.length ? 8 + em.height : 0),
        center = { x: padding + 8, y: y + height / 2 },
        radius = 6;
      if (previousMarker)
        primitives.push({
          type: "path",
          points: [
            { x: center.x, y: previousMarker.y + radius },
            { x: center.x, y: center.y - radius },
          ],
          stroke: "nodeText",
          strokeRole: "frame",
        });
      primitives.push({
        type: "path",
        points: [
          { x: center.x + radius, y: center.y },
          { x: left, y: center.y },
        ],
        stroke: "accent",
        strokeRole: "frame",
        semantic: { kind: "edge", id: `timeline:stem:${index}`, role: "stem", row: index },
      });
      primitives.push({
        type: "shape",
        shape: "circle",
        x: center.x - radius,
        y: center.y - radius,
        width: radius * 2,
        height: radius * 2,
        fill: "accent",
        strokeWidth: 0,
        semantic: { kind: "node", id: `timeline:marker:${index}`, role: "marker", row: index },
      });
      box({ x: left, y, width, height }, `timeline:event:${index}`, "nodeFill", "accent", index);
      text(period, left + 12, y + 12, width - 24, "accent", size * 1.15, 600, index);
      if (entries.length)
        text(
          entries.join("\n"),
          left + 12,
          y + 12 + pm.height + 8,
          width - 24,
          "nodeText",
          size,
          400,
          index,
        );
      interactions.push({
        id: `timeline:event:${index}`,
        kind: "data",
        target: `timeline:event:${index}`,
        label: event.label,
        tooltip: event.section ? `${event.section}: ${event.label}` : event.label,
        x: left,
        y,
        width,
        height,
      });
      previousMarker = center;
      y += height + 28;
    } else {
      const m = measure(event.label, { fontSize: size, fontWeight: 600, maxWidth: width - 36 }),
        height = m.height + 28,
        color = index === 0 ? 7 : ((index - 1) % 3) + 1;
      const points = [
        { x: left, y },
        { x: left + width - 12, y },
        { x: left + width, y: y + height / 2 },
        { x: left + width - 12, y: y + height },
        { x: left, y: y + height },
        { x: left + 12, y: y + height / 2 },
      ];
      primitives.push({
        type: "path",
        points,
        closed: true,
        fill: `paletteFill:${color}`,
        stroke: `palette:${color}`,
        strokeRole: "node",
        semantic: { kind: "node", id: `journey:event:${index}`, role: "stage", row: index },
      });
      text(event.label, left + 18, y + 14, width - 36, "nodeText", size, 600, index);
      interactions.push({
        id: `journey:event:${index}`,
        kind: "data",
        target: `journey:event:${index}`,
        label: event.label,
        value: event.value,
        tooltip: `${event.label}: satisfaction ${event.value}/5`,
        x: left,
        y,
        width,
        height,
        hit: { type: "polygon", points },
      });
      y += height + 20;
      const r = 15,
        cx = left + r,
        cy = y + r,
        scoreColor = `palette:${event.value! <= 2 ? 0 : event.value! >= 4 ? 2 : 3}`;
      const scoreSemantic = {
        kind: "node" as const,
        id: `journey:score:${index}`,
        role: "score",
        row: index,
      };
      primitives.push({
        type: "shape",
        shape: "circle",
        x: cx - r,
        y: cy - r,
        width: r * 2,
        height: r * 2,
        fill: "nodeFill",
        stroke: scoreColor,
        semantic: scoreSemantic,
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
          semantic: scoreSemantic,
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
        semantic: scoreSemantic,
      });
      const scoreHeight = text(
        `Satisfaction ${event.value}/5`,
        left + 44,
        y + 5,
        width - 44,
        "nodeText",
        size,
        400,
        index,
        "score",
      );
      interactions.push({
        id: `journey:score:${index}`,
        kind: "data",
        target: `journey:score:${index}`,
        label: event.label,
        value: event.value,
        tooltip: `${event.label}: satisfaction ${event.value}/5`,
        x: cx - r,
        y: cy - r,
        width: r * 2,
        height: r * 2,
        hit: { type: "circle", cx, cy, radius: r },
      });
      y += Math.max(30, scoreHeight + 10) + 18;
      for (const [actorIndex, actor] of (event.actors ?? []).entries()) {
        y += text(actor, left, y, width, "mutedText", size, 400) + 6;
        const taskHeight =
          measure(event.label, { fontSize: size, maxWidth: width - 20 }).height + 20;
        box(
          { x: left, y, width, height: taskHeight },
          `journey:actor:${actorIndex}:${index}`,
          "headerFill",
          "nodeStroke",
          index,
        );
        text(event.label, left + 10, y + 10, width - 20, "nodeText", size, 400, index, "actor");
        interactions.push({
          id: `journey:actor:${actorIndex}:${index}`,
          kind: "data",
          target: `journey:actor:${actorIndex}:${index}`,
          label: `${actor}: ${event.label}`,
          tooltip: `${actor}: ${event.label}`,
          value: event.value,
          x: left,
          y,
          width,
          height: taskHeight,
        });
        y += taskHeight + 12;
      }
      if (index < ir.events.length - 1) {
        primitives.push({
          type: "path",
          points: [
            { x: left + width / 2, y },
            { x: left + width / 2, y: y + 20 },
          ],
          stroke: "edgeStroke",
          strokeRole: "edge",
          end: "arrow",
          semantic: { kind: "edge", id: `journey:next:${index}`, role: "actor-link", row: index },
        });
        y += 40;
      }
    }
  }
  return true;
}
