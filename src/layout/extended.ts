import type { LayoutOptions, ParsedDiagram, Scene, TextMeasurer } from "../types.ts";

import { layoutExtendedBlocks } from "./extended-blocks.ts";
import { layoutExtendedSets } from "./extended-sets.ts";
import { layoutExtendedUml } from "./extended-uml.ts";
import { layoutExtendedSankey } from "./extended-sankey.ts";

export function layoutExtended(
  parsed: ParsedDiagram,
  measure: TextMeasurer,
  options: LayoutOptions = {},
): Scene | undefined {
  return (
    layoutExtendedSankey(parsed, measure, options) ??
    layoutExtendedBlocks(parsed, measure, options) ??
    layoutExtendedSets(parsed, measure, options) ??
    layoutExtendedUml(parsed, measure, options)
  );
}
