import { readDiagramMetadata } from "../parse/metadata.ts";

/** Pie can wrap its legend at readable size; other natural layouts keep authored geometry. */
export function inlineLayoutWidth(
  source: string,
  availableWidth: number | undefined,
  fitToViewport: boolean | undefined,
): number | undefined {
  if (!availableWidth || !Number.isFinite(availableWidth)) return undefined;
  // Fit scales the natural scene; passing a width here would reflow its geometry.
  if (fitToViewport) return undefined;
  try {
    const { source: cleaned } = readDiagramMetadata(source);
    const header = cleaned
      .split(/\r?\n/)
      .find((line) => line.trim() && !line.trim().startsWith("%%"));
    const keyword = header?.trim().split(/[\s;]/)[0].replace(/:$/, "");
    return keyword === "pie" ? availableWidth : undefined;
  } catch {
    // Preparation reports invalid metadata; width selection does not own diagnostics.
    return undefined;
  }
}
