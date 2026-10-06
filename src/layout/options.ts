import type { LayoutOptions } from "../types.ts";

/** Finite host/config dimensions with explicit per-use bounds. */
export function boundedNumber(value: unknown, fallback: number, min = 0, max = 2400): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
}

/** Normalize host geometry once before dispatching to any diagram family. */
export function normalizeLayoutOptions(options: LayoutOptions): LayoutOptions {
  const fontSize = boundedNumber(options.fontSize, 14, 6, 72);
  const normalized: LayoutOptions = {
    ...options,
    fontSize,
    radius: boundedNumber(options.radius, 8, 0, 80),
    padding: boundedNumber(options.padding, 20, 0, 2400),
    nodeSeparation: boundedNumber(options.nodeSeparation, fontSize * 2.1, 0, 2400),
    rankSeparation: boundedNumber(options.rankSeparation, fontSize * 3.2, 0, 2400),
    ...(options.maxLabelWidth !== undefined
      ? { maxLabelWidth: boundedNumber(options.maxLabelWidth, 320, 48, 2400) }
      : {}),
    ...(options.maxLabelLines !== undefined
      ? { maxLabelLines: Math.floor(boundedNumber(options.maxLabelLines, 12, 1, 200)) }
      : {}),
  };
  for (const key of [
    "viewportWidth",
    "nodePaddingX",
    "nodePaddingY",
    "edgeLabelPaddingX",
    "edgeLabelPaddingY",
    "titleScale",
    "headerScale",
  ] as const) {
    if (normalized[key] !== undefined && !Number.isFinite(normalized[key])) delete normalized[key];
  }
  if (options.typeStyles) {
    normalized.typeStyles = {};
    for (const [kind, settings] of Object.entries(options.typeStyles)) {
      if (!settings) continue;
      Object.assign(normalized.typeStyles, {
        [kind]: Object.fromEntries(
          Object.entries(settings).filter(
            ([, value]) => typeof value !== "number" || Number.isFinite(value),
          ),
        ),
      });
    }
  }
  return normalized;
}
