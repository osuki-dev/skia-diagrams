import { readYamlMapping } from "./yaml.ts";
import type { DiagramIR, ParsedDiagram } from "../types.ts";
import { emptyIR, fail, label, ParseFailure, stripComment } from "./common.ts";
import { readDiagramMetadata as readFrontMatter } from "./metadata.ts";
import { parseFlowchart } from "./flowchart.ts";
import { parseOfficialBlock } from "./block-grammar.ts";

export interface BlockCell {
  id: string;
  span: number;
  space?: boolean;
  arrows?: string[];
  group?: BlockGroup;
}
export interface BlockGroup {
  id: string;
  label?: string;
  columns?: number;
  cells: BlockCell[];
}
export interface KanbanColumn {
  id: string;
  label: string;
  cards: KanbanCard[];
}
export interface KanbanCard {
  id: string;
  label: string;
  metadata: Record<string, string>;
}

function parseKanban(ir: DiagramIR, body: string, config?: Record<string, unknown>): void {
  const columns: KanbanColumn[] = [];
  let columnIndent: number | undefined,
    generated = 0;
  for (const [index, raw] of body.split(/\r?\n/).entries()) {
    if (!raw.trim() || raw.trim().startsWith("%%")) continue;
    const indent = raw.search(/\S/),
      text = stripComment(raw),
      line = index + 2;
    if (/^accTitle\s*:/.test(text)) {
      ir.title = label(text.replace(/^accTitle\s*:/, ""));
      continue;
    }
    if (/^accDescr\s*:/.test(text)) {
      ir.description = label(text.replace(/^accDescr\s*:/, ""));
      continue;
    }
    const match = /^(?:([\p{L}\p{N}_-]+))?(?:\[([\s\S]*?)\])?(?:\s*@\{([\s\S]*)\})?$/u.exec(text);
    if (!match || (!match[1] && match[2] === undefined)) fail(line, "Invalid kanban entry");
    const id = match[1] ?? `__kanban${++generated}`,
      title = label(match[2] ?? id);
    columnIndent ??= indent;
    if (indent === columnIndent) {
      if (match[3]) fail(line, "Kanban column cannot have task metadata");
      columns.push({ id, label: title, cards: [] });
    } else if (indent > columnIndent && columns.length) {
      const metadata: Record<string, string> = {};
      if (match[3]) {
        const data = readYamlMapping("{" + match[3] + "}", line, "Kanban metadata");
        for (const [key, value] of Object.entries(data)) {
          if (typeof value !== "string" && typeof value !== "number")
            fail(line, "Kanban metadata values must be text");
          metadata[key] = String(value);
        }
      }
      columns.at(-1)!.cards.push({ id, label: title, metadata });
    } else fail(line, "Inconsistent kanban indentation");
  }
  if (!columns.length) fail(1, "Kanban requires a column");
  if (columns.length + columns.reduce((n, c) => n + c.cards.length, 0) > 300)
    fail(1, "Kanban exceeds 300 entries");
  ir.data = {
    columns,
    ...(config?.kanban && typeof config.kanban === "object" ? { config: config.kanban } : {}),
  };
}

export function parseExtendedBlocks(source: string): ParsedDiagram | undefined {
  // Ignore unrelated types before parsing their front matter.
  const keyword = source
    .replace(/^\uFEFF?---\s*\r?\n[\s\S]*?\r?\n---\s*(?:\r?\n|$)/, "")
    .replace(/%%\{[\s\S]*?\}%%/g, "")
    .replace(/^(?:[ \t\r]*\n|[ \t]*%%[^\n]*(?:\n|$))*/, "")
    .trimStart()
    .split(/[\s;]/)[0];
  if (!["block", "block-beta", "kanban", "swimlane-beta"].includes(keyword)) return undefined;
  try {
    if (source.length > 200000) fail(1, "Diagram source exceeds 200 KB");
    const front = readFrontMatter(source),
      ir = emptyIR();
    if (front.title) ir.title = front.title;
    if (front.config?.theme === "dark") ir.theme = "dark";
    if (front.config?.themeVariables && typeof front.config.themeVariables === "object") {
      ir.variables = Object.fromEntries(
        Object.entries(front.config.themeVariables).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      );
    }
    const cleaned = front.source
        .replace(/%%\{[\s\S]*?\}%%/g, "")
        .replace(/^(?:[ \t\r]*\n|[ \t]*%%[^\n]*(?:\n|$))*/, "")
        .trimStart(),
      newline = cleaned.indexOf("\n");
    const body = newline < 0 ? "" : cleaned.slice(newline + 1);
    if (keyword === "swimlane-beta") {
      parseFlowchart(ir, cleaned.replace(/^swimlane-beta/, "flowchart"));
      if (!ir.clusters.length) fail(1, "Swimlane diagram requires a lane");
      for (const node of ir.nodes) {
        const authored = node.metadata?.interaction as Record<string, unknown> | undefined;
        if (!node.interaction && authored) {
          const kind =
            authored.type === "link"
              ? "link"
              : authored.type === "callback"
                ? "callback"
                : undefined;
          const target = kind === "link" ? authored.href : authored.callback;
          if (kind && typeof target === "string")
            node.interaction = {
              kind,
              target,
              ...(typeof authored.tooltip === "string" ? { tooltip: authored.tooltip } : {}),
            };
        }
      }
      return { kind: "swimlanes", ir };
    }
    if (keyword === "kanban") {
      parseKanban(ir, body, front.config);
      return { kind: "kanban", ir };
    }
    parseOfficialBlock(ir, cleaned);
    return { kind: "block", ir };
  } catch (error) {
    if (error instanceof ParseFailure) return { kind: "error", error: error.detail };
    throw error;
  }
}
