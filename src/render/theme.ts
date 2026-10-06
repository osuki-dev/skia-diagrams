import { boundedNumber } from "../layout/options.ts";
import type { LayoutOptions, Style } from "../types.ts";
export interface DiagramTheme {
  background: string;
  nodeFill: string;
  nodeStroke: string;
  nodeText: string;
  edgeStroke: string;
  edgeText: string;
  edgeTextBackground: string;
  clusterFill: string;
  clusterStroke: string;
  clusterText: string;
  accent: string;
  noteFill: string;
  noteText: string;
  fontFamily: string;
  fontFamilyMono: string;
  fontSize: number;
  strokeWidth: number;
  /** Native control borders; omitted values use the host platform hairline. */
  controlBorderWidth?: number;
  radius: number;
  palette: string[];
  /** Soft category surfaces used by the approved node and table design. */
  paletteFill?: string[];
  /** Text on filled chart categories; hosts can pair this with their palette. */
  paletteText?: string[];
  /** Optional geometry tokens; fontSize remains the theme's authoritative size. */
  layout?: Omit<LayoutOptions, "fontSize" | "radius">;
  arrowSize?: number;
  /** Optional modern roles fall back to existing host colors when omitted. */
  headerFill?: string;
  headerText?: string;
  mutedText?: string;
  gridStroke?: string;
  /** Ratios to strokeWidth; explicit Mermaid stroke widths remain absolute. */
  lineWeights?: Partial<Record<NonNullable<Style["strokeRole"]>, number>>;
}
/** Standalone snapshot of Muqun's Osuki pack, read 2026-10-06 from
 * app/src/constants/theme-packs.ts (Osuki colors and terminal ANSI accents).
 * No runtime import/dependency. The approved design uses stronger slate outlines
 * and neutral header bands over the pack's paper/ink/coral. Hosts override every token. */
export const lightTheme: DiagramTheme = {
  background: "#F7F3EC",
  nodeFill: "#ffffff",
  nodeStroke: "#344054",
  nodeText: "#050B12",
  edgeStroke: "#475467",
  edgeText: "#050B12",
  edgeTextBackground: "#F7F3EC",
  clusterFill: "#F7F3EC",
  clusterStroke: "#98A2B3",
  clusterText: "#050B12",
  accent: "#FF5A4A",
  noteFill: "rgba(255, 90, 74, 0.14)",
  noteText: "#050B12",
  fontFamily: "sans-serif",
  fontFamilyMono: "monospace",
  fontSize: 14,
  strokeWidth: 1.25,
  radius: 8,
  arrowSize: 11,
  layout: { padding: 20, nodePaddingX: 16, nodePaddingY: 12 },
  headerFill: "#EEF0F4",
  headerText: "#050B12",
  mutedText: "#667085",
  gridStroke: "rgba(71, 84, 103, 0.18)",
  lineWeights: { node: 1, edge: 1.2, frame: 0.8, grid: 0.7, series: 1.9 },
  palette: ["#FF5A4A", "#3E63FF", "#1F9D6B", "#D98A1F", "#D93025", "#6941C6", "#0E7090", "#475467"],
  paletteFill: [
    "#FFD8D1",
    "#DDE7FF",
    "#D9F1E4",
    "#FCE8C6",
    "#FADDD9",
    "#ECE1FA",
    "#D5EFF2",
    "#E9ECF0",
  ],
  paletteText: [
    "#050B12",
    "#FCFBFA",
    "#050B12",
    "#050B12",
    "#FCFBFA",
    "#FCFBFA",
    "#FCFBFA",
    "#FCFBFA",
  ],
};
export const darkTheme: DiagramTheme = {
  ...lightTheme,
  background: "#050B12",
  nodeFill: "#131B26",
  nodeStroke: "#8B95A5",
  nodeText: "#FCFBFA",
  edgeStroke: "#B6BDC8",
  edgeText: "#B6BDC8",
  edgeTextBackground: "#050B12",
  clusterFill: "#0B111A",
  clusterStroke: "#8B95A5",
  clusterText: "#FCFBFA",
  noteFill: "rgba(255, 90, 74, 0.24)",
  noteText: "#FCFBFA",
  headerFill: "#0B111A",
  headerText: "#FCFBFA",
  mutedText: "#B6BDC8",
  gridStroke: "rgba(182, 189, 200, 0.24)",
  palette: ["#FF5A4A", "#6B87FF", "#34C08B", "#F0A93C", "#F2554A", "#C7A0FF", "#67E3F9", "#B6BDC8"],
  paletteFill: [
    "#44241F",
    "#1D2B4C",
    "#123B30",
    "#42351C",
    "#432626",
    "#342346",
    "#143640",
    "#26303D",
  ],
  paletteText: Array(8).fill("#050B12"),
};
/** Merge known nested theme groups without mutating host objects or replacing siblings. */
export function mergeThemeOverrides(
  base?: Partial<DiagramTheme>,
  override?: Partial<DiagramTheme>,
): Partial<DiagramTheme> | undefined {
  if (!base) return override;
  if (!override) return base;
  const typeStyles = { ...base.layout?.typeStyles, ...override.layout?.typeStyles };
  for (const key of Object.keys(typeStyles) as (keyof typeof typeStyles)[]) {
    Object.assign(typeStyles, {
      [key]: { ...base.layout?.typeStyles?.[key], ...override.layout?.typeStyles?.[key] },
    });
  }
  return {
    ...base,
    ...override,
    ...(base.lineWeights || override.lineWeights
      ? { lineWeights: { ...base.lineWeights, ...override.lineWeights } }
      : {}),
    ...(base.layout || override.layout
      ? {
          layout: {
            ...base.layout,
            ...override.layout,
            ...(Object.keys(typeStyles).length ? { typeStyles } : {}),
          },
        }
      : {}),
  };
}

export function resolveDiagramTheme(
  overrides?: Partial<DiagramTheme>,
  mode: "light" | "dark" = "light",
  directive?: { theme?: "light" | "dark"; variables?: Record<string, unknown> },
): DiagramTheme {
  const base = (overrides ? mode : (directive?.theme ?? mode)) === "dark" ? darkTheme : lightTheme;
  const variables = directive?.variables;
  const variable = (key: string, fallback: string) =>
    typeof variables?.[key] === "string" ? (variables[key] as string) : fallback;
  const xy = variables?.xyChart;
  const plotPalette =
    xy && typeof xy === "object" && !Array.isArray(xy)
      ? (xy as Record<string, unknown>).plotColorPalette
      : undefined;
  const palette =
    typeof plotPalette === "string"
      ? plotPalette
          .split(",")
          .map((color) => color.trim())
          .filter(Boolean)
          .slice(0, 128)
      : undefined;
  const mapped = variables
    ? {
        nodeFill: variable("primaryColor", base.nodeFill),
        nodeText: variable("primaryTextColor", base.nodeText),
        nodeStroke: variable("primaryBorderColor", base.nodeStroke),
        edgeStroke: variable("lineColor", base.edgeStroke),
        background: variable("background", base.background),
        ...(palette?.length ? { palette } : {}),
      }
    : {};
  const theme = mergeThemeOverrides({ ...base, ...mapped }, overrides) as DiagramTheme;
  return {
    ...theme,
    palette: theme.palette.length ? theme.palette : base.palette,
    fontSize: boundedNumber(theme.fontSize, base.fontSize, 6, 72),
    strokeWidth: boundedNumber(theme.strokeWidth, base.strokeWidth, 0, 10),
    controlBorderWidth:
      theme.controlBorderWidth !== undefined && Number.isFinite(theme.controlBorderWidth)
        ? boundedNumber(theme.controlBorderWidth, 0, 0, 10)
        : undefined,
    radius: boundedNumber(theme.radius, base.radius, 0, 80),
    arrowSize: boundedNumber(theme.arrowSize, base.arrowSize ?? 10, 4, 32),
  };
}
export function resolveColor(
  value: string | undefined,
  fallback: string,
  theme: DiagramTheme,
): string {
  if (!value) return fallback;
  if (value === "headerFill") return theme.headerFill ?? theme.clusterFill;
  if (value === "headerText") return theme.headerText ?? theme.nodeText;
  if (value === "mutedText") return theme.mutedText ?? theme.edgeText;
  if (value === "gridStroke") return theme.gridStroke ?? theme.clusterStroke;
  if (value.startsWith("paletteFill:"))
    return (
      theme.paletteFill?.[Number(value.slice(12)) % theme.paletteFill.length] ?? theme.nodeFill
    );
  if (value.startsWith("paletteText:"))
    return (
      theme.paletteText?.[Number(value.slice(12)) % theme.paletteText.length] ?? theme.nodeText
    );
  if (value.startsWith("palette:"))
    return theme.palette[Number(value.slice(8)) % theme.palette.length] ?? theme.accent;
  const token = theme[value as keyof DiagramTheme];
  return typeof token === "string" ? token : value;
}
export function resolveStrokeWidth(
  style: Pick<Style, "strokeWidth" | "strokeRole">,
  theme: DiagramTheme,
): number {
  if (style.strokeWidth !== undefined) return style.strokeWidth;
  const ratio = style.strokeRole ? (theme.lineWeights?.[style.strokeRole] ?? 1) : 1;
  return theme.strokeWidth * (Number.isFinite(ratio) ? Math.max(0, Math.min(4, ratio)) : 1);
}
