import type { ParsedDiagram } from "../types.ts";
import { parseExtendedBlocks } from "./extended-blocks.ts";
import { parseExtendedSets } from "./extended-sets.ts";
import { parseExtendedUml } from "./extended-uml.ts";
import { parseExtendedSankey } from "./extended-sankey.ts";

/** Native extended grammars; unrelated types avoid reparsing YAML metadata. */
export function parseExtended(source: string): ParsedDiagram | undefined {
  const normalized = source.replace(/%%\{\s*(?:init|initialize)\s*:\s*[\s\S]*?\}%%/g, (directive) =>
    directive.replace(/[^\n]/g, " "),
  );
  const keyword = normalized
    .replace(/^\uFEFF?---\s*\r?\n[\s\S]*?\r?\n---\s*(?:\r?\n|$)/, "")
    .replace(/^(?:\s*%%[^\n]*\n)*/, "")
    .trimStart()
    .split(/[\s;]/)[0];
  if (/^sankey(?:-beta)?$/.test(keyword)) return parseExtendedSankey(source);
  if (["block", "block-beta", "kanban", "swimlane-beta"].includes(keyword))
    return parseExtendedBlocks(source);
  if (["venn-beta", "ishikawa-beta"].includes(keyword)) return parseExtendedSets(source);
  if (
    ["requirementDiagram", "usecase", "usecase-beta", "zenuml"].includes(keyword) ||
    /^C4(?:Context|Container|Component|Dynamic|Deployment)$/.test(keyword)
  )
    return parseExtendedUml(source);
  return undefined;
}
