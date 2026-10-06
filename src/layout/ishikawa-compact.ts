import type {
  DiagramInteraction,
  LayoutOptions,
  ParsedDiagram,
  Primitive,
  Scene,
  TextMeasurer,
} from "../types.ts";
import type { Cause } from "../parse/extended-sets.ts";

/** A vertical fishbone retains the common spine and cause hierarchy at readable native sizes. */
export function compactIshikawa(
  parsed: Extract<ParsedDiagram, { ir: unknown }>,
  measure: TextMeasurer,
  options: LayoutOptions,
): Scene {
  const root = parsed.ir.data?.root as Cause;
  const padding = options.padding ?? 20,
    fontSize = options.fontSize ?? 14;
  const width = options.viewportWidth!,
    contentWidth = width - padding * 2;
  const oneSided = fontSize >= 18;
  const center = oneSided ? padding + 10 : width / 2;
  const primitives: Primitive[] = [],
    interactions: DiagramInteraction[] = [];
  let y = padding;
  const label = (
    cause: Cause,
    x: number,
    maxWidth: number,
    weight: number,
    ancestors: string[],
    color = "nodeText",
  ) => {
    const metrics = measure(cause.label, { fontSize, fontWeight: weight, maxWidth });
    primitives.push({
      type: "text",
      text: metrics.lines.join("\n"),
      x,
      y,
      width: maxWidth,
      height: metrics.height,
      fontSize,
      fontWeight: weight,
      color,
      semantic: { kind: "node", id: cause.id },
      ...(metrics.lineBaselines ? { lineBaselines: metrics.lineBaselines } : {}),
    });
    interactions.push({
      id: `ishikawa:${cause.id}`,
      target: cause.id,
      label: cause.label,
      kind: "data",
      tooltip: [...ancestors, cause.label].join(" → "),
      x,
      y,
      width: maxWidth,
      height: metrics.height,
    });
    return metrics.height;
  };
  if (parsed.ir.title) {
    const metrics = measure(parsed.ir.title, {
      fontSize: fontSize * 1.3,
      fontWeight: 700,
      maxWidth: contentWidth,
    });
    primitives.push({
      type: "text",
      text: metrics.lines.join("\n"),
      x: padding,
      y,
      width: contentWidth,
      height: metrics.height,
      fontSize: fontSize * 1.3,
      fontWeight: 700,
      color: "nodeText",
    });
    y += metrics.height + 16;
  }
  const headTop = y;
  const headHeight = label(root, padding + 12, contentWidth - 24, 700, []);
  primitives.unshift({
    type: "shape",
    shape: "round",
    x: padding,
    y: headTop - 8,
    width: contentWidth,
    height: headHeight + 16,
    fill: "paletteFill:0",
    stroke: "accent",
    semantic: { kind: "node", id: root.id },
  });
  y += headHeight + 32;
  const spineTop = y - 12;
  root.children.forEach((category, index) => {
    const right = oneSided || index % 2 === 1;
    const x = right ? center + 22 : padding;
    const maxWidth = oneSided ? width - padding - x : contentWidth / 2 - 22;
    const categoryY = y;
    const height = label(category, x, maxWidth, 700, [root.label], `palette:${index % 8}`);
    primitives.push({
      type: "path",
      points: [
        { x: center, y: categoryY - 8 },
        { x: right ? center + 14 : center - 14, y: categoryY + height / 2 },
      ],
      stroke: `palette:${index % 8}`,
      strokeRole: "edge",
      semantic: { kind: "edge", id: `bone:${category.id}`, from: root.id, to: category.id },
    });
    y += height + 12;
    const add = (cause: Cause, parent: Cause, ancestors: string[], level: number) => {
      const inset = Math.min(level * 8, maxWidth / 3);
      const start = right ? x + inset : x;
      const h = label(cause, start, maxWidth - inset, cause.children.length ? 600 : 400, ancestors);
      primitives.push({
        type: "path",
        points: [
          { x: right ? center + 14 : center - 14, y: y + h / 2 },
          { x: right ? start - 4 : start + maxWidth - inset + 4, y: y + h / 2 },
        ],
        stroke: `palette:${index % 8}`,
        strokeRole: "edge",
        semantic: { kind: "edge", id: `cause:${cause.id}`, from: parent.id, to: cause.id },
      });
      y += h + 12;
      cause.children.forEach((child) => add(child, cause, [...ancestors, cause.label], level + 1));
    };
    category.children.forEach((cause) => add(cause, category, [root.label, category.label], 1));
    y += 16;
  });
  primitives.unshift({
    type: "path",
    points: [
      { x: center, y },
      { x: center, y: spineTop },
    ],
    stroke: "edgeStroke",
    end: "arrow",
    strokeRole: "edge",
    semantic: { kind: "edge", id: "ishikawa-spine", to: root.id },
  });
  return {
    kind: "ishikawa",
    bounds: { x: 0, y: 0, width, height: y + padding },
    primitives,
    interactions,
    accessibilityLabel: parsed.ir.nodes.map((n) => n.label).join(". "),
  };
}
