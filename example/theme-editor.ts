// This pure helper is also exercised by root-only tests before the example's
// dependencies are installed. Resolve the local standalone source directly.
import { lightTheme, type DiagramTheme } from "../src/render/theme.ts";
import type { DiagramLayoutStyles } from "../src/types.ts";
const styleKeys = {
  flowchart: ["minNodeWidth", "minNodeHeight"],
  sequence: ["participantWidth", "laneGap", "rowGap", "activationWidth"],
  class: ["cellPaddingX", "cellPaddingY"],
  state: ["nodePaddingX", "nodePaddingY", "terminalSize"],
  er: ["cellPaddingX", "cellPaddingY", "rowGap"],
  gantt: ["plotWidth", "labelWidth", "barHeight", "rowGap"],
  pie: ["diameter", "legendGap", "legendRowGap"],
  gitgraph: ["commitRadius", "columnGap", "laneGap"],
  mindmap: ["nodePaddingX", "nodePaddingY", "radialGap", "branchGap"],
  timeline: ["cardWidth", "eventGap", "periodScale"],
  journey: ["cardWidth", "cardGap", "scoreRadius", "actorGap"],
  quadrant: ["plotSize", "labelGap", "pointRadius"],
  xychart: ["plotWidth", "plotHeight", "barGap", "pointRadius"],
} satisfies { [K in keyof DiagramLayoutStyles]: (keyof NonNullable<DiagramLayoutStyles[K]>)[] };
function entries(value: unknown, label: string): [string, unknown][] {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error(`Invalid ${label}`);
  return Object.entries(value);
}
function numbers(value: unknown, allowed: readonly string[], label: string) {
  for (const [key, number] of entries(value, label))
    if (
      !allowed.includes(key) ||
      typeof number !== "number" ||
      !Number.isFinite(number) ||
      number < 0
    )
      throw new Error(`Invalid ${label} token: ${key}`);
}
export function readThemeOverrides(source: string): Partial<DiagramTheme> {
  const parsed: unknown = JSON.parse(source);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
    throw new Error("Theme tokens must be a JSON object");
  const result: Partial<DiagramTheme> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (!Object.hasOwn(lightTheme, key)) throw new Error(`Unknown theme token: ${key}`);
    const token = lightTheme[key as keyof DiagramTheme];
    if (key === "lineWeights") {
      numbers(value, ["node", "edge", "frame", "grid", "series"], "lineWeights");
      Object.assign(result, { lineWeights: value });
      continue;
    }
    if (key === "layout") {
      if (typeof value !== "object" || value === null || Array.isArray(value))
        throw new Error("Invalid layout tokens");
      const allowed = [
        "nodeSeparation",
        "rankSeparation",
        "padding",
        "maxLabelWidth",
        "maxLabelLines",
        "nodePaddingX",
        "nodePaddingY",
        "edgeLabelPaddingX",
        "edgeLabelPaddingY",
        "titleScale",
        "headerScale",
      ];
      for (const [name, number] of Object.entries(value)) {
        if (name === "typeStyles") {
          for (const [kind, tokens] of entries(number, "typeStyles")) {
            if (!Object.hasOwn(styleKeys, kind)) throw new Error(`Invalid diagram style: ${kind}`);
            numbers(tokens, styleKeys[kind as keyof DiagramLayoutStyles], kind);
          }
          continue;
        }
        if (
          !allowed.includes(name) ||
          typeof number !== "number" ||
          !Number.isFinite(number) ||
          number < 0
        )
          throw new Error(`Invalid layout token: ${name}`);
      }
      Object.assign(result, { layout: value });
      continue;
    }
    const valid =
      key === "palette" || key === "paletteText" || key === "paletteFill"
        ? Array.isArray(value) &&
          value.length >= 1 &&
          value.every((color) => typeof color === "string")
        : typeof value === typeof token && (typeof value !== "number" || Number.isFinite(value));
    if (!valid) throw new Error(`Invalid token value: ${key}`);
    Object.assign(result, { [key]: value });
  }
  return result;
}
