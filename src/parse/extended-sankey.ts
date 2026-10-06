import type { ParsedDiagram } from "../types.ts";
import { emptyIR, fail, ParseFailure } from "./common.ts";
import { readDiagramMetadata } from "./metadata.ts";

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}
export interface SankeyData {
  links: SankeyLink[];
  config: Record<string, unknown>;
}

/** Mermaid Sankey uses RFC 4180 CSV: doubled quotes and multiline fields are data. */
function rows(source: string, lineOffset = 0): { fields: string[]; line: number }[] {
  const result: { fields: string[]; line: number }[] = [];
  let fields: string[] = [],
    field = "",
    quoted = false,
    afterQuote = false,
    quotedFirst = false,
    line = 1 + lineOffset,
    start = 1 + lineOffset;
  const finish = () => {
    fields.push(field.trim());
    if (fields.some(Boolean) && (quotedFirst || !fields[0].startsWith("%%")))
      result.push({ fields, line: start });
    fields = [];
    field = "";
    afterQuote = false;
    quotedFirst = false;
    start = line + 1;
  };
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          afterQuote = true;
        }
      } else {
        field += char;
        if (char === "\n") line++;
      }
      continue;
    }
    if (char === '"' && !field.trim() && !afterQuote) {
      quoted = true;
      if (!fields.length) quotedFirst = true;
      field = "";
    } else if (char === ",") {
      fields.push(field.trim());
      field = "";
      afterQuote = false;
    } else if (char === "\n") {
      finish();
      line++;
    } else if (char !== "\r") {
      if (afterQuote && char.trim()) fail(line, "Unexpected text after quoted CSV field");
      field += char;
    }
  }
  if (quoted) fail(line, "Unterminated quoted CSV field");
  finish();
  return result;
}

export function parseExtendedSankey(source: string): ParsedDiagram | undefined {
  const withoutFrontMatter = source
    .replace(/%%\{\s*(?:init|initialize)\s*:\s*[\s\S]*?\}%%/g, (directive) =>
      directive.replace(/[^\n]/g, " "),
    )
    .replace(/^\uFEFF?---\s*\r?\n[\s\S]*?\r?\n---\s*(?:\r?\n|$)/, "");
  const withoutLeadingComments = (text: string) =>
    text.replace(/^(?:\s*%%[^\n]*(?:\n|$))*/, "").trimStart();
  if (!/^sankey(?:-beta)?\b/.test(withoutLeadingComments(withoutFrontMatter))) return;
  try {
    const metadata = readDiagramMetadata(source);
    const normalized = withoutLeadingComments(metadata.source);
    const header = /^sankey(?:-beta)?[^\S\r\n]*(?:\r?\n|$)/.exec(normalized);
    if (!header) fail(1, "Sankey header must be followed by CSV rows");
    const body = normalized.slice(header[0].length);
    const prefixLength = metadata.source.length - normalized.length + header[0].length;
    const lineOffset = (metadata.source.slice(0, prefixLength).match(/\n/g) ?? []).length;
    const links: SankeyLink[] = [];
    for (const row of rows(body, lineOffset)) {
      if (row.fields.length !== 3) fail(row.line, "Sankey rows require source,target,value");
      const [from, to, raw] = row.fields;
      const value = parseFloat(raw);
      if (!from || !to || !raw || !Number.isFinite(value))
        fail(row.line, "Sankey endpoints must be nonempty and values must be finite numbers");
      if (from === to) fail(row.line, "Sankey links cannot connect a node to itself");
      links.push({ source: from, target: to, value });
      if (links.length > 600) fail(row.line, "Sankey exceeds 600 links");
    }
    if (!links.length) fail(1, "Sankey requires at least one link");
    const names = [...new Set(links.flatMap((link) => [link.source, link.target]))];
    if (names.length > 300) fail(1, "Sankey exceeds 300 nodes");
    const ir = emptyIR();
    ir.direction = "LR";
    ir.nodes = names.map((name) => ({ id: name, label: name, shape: "rect" }));
    ir.edges = links.map((link) => ({
      from: link.source,
      to: link.target,
      label: String(link.value),
      start: "none",
      end: "none",
    }));
    if (metadata.title) ir.title = metadata.title;
    const config = metadata.config?.sankey;
    ir.data = {
      links,
      config: config && typeof config === "object" && !Array.isArray(config) ? config : {},
    };
    return { kind: "sankey", ir };
  } catch (error) {
    if (error instanceof ParseFailure) return { kind: "error", error: error.detail };
    throw error;
  }
}
