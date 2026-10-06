import type { DiagramKind, ParsedDiagram } from "../types.ts";
import { emptyIR, ParseFailure, fail } from "./common.ts";
import { parseFlowchart } from "./flowchart.ts";
import { parseSequence } from "./sequence.ts";
import { parseGraph } from "./graphs.ts";
import { readDiagramMetadata, mergeDiagramConfig } from "./metadata.ts";
import { parseChart } from "./charts.ts";
import { parseExtended } from "./extended.ts";
const kinds: Record<string, DiagramKind> = {
  flowchart: "flowchart",
  graph: "flowchart",
  sequenceDiagram: "sequence",
  classDiagram: "class",
  "stateDiagram-v2": "state",
  stateDiagram: "state",
  erDiagram: "er",
  gantt: "gantt",
  pie: "pie",
  gitGraph: "gitgraph",
  mindmap: "mindmap",
  timeline: "timeline",
  journey: "journey",
  quadrantChart: "quadrant",
  "xychart-beta": "xychart",
  xychart: "xychart",
};
export function parseDiagram(source: string): ParsedDiagram {
  if (typeof source !== "string")
    return {
      kind: "error",
      error: { kind: "syntax", line: 1, column: 1, message: "Diagram source must be a string" },
    };
  if (source.length > 200000)
    return {
      kind: "error",
      error: { kind: "limit", line: 1, column: 1, message: "Diagram source exceeds 200 KB" },
    };
  const ir = emptyIR();
  try {
    const frontMatter = readDiagramMetadata(source);
    if (frontMatter.config) ir.data = { config: frontMatter.config };
    if (frontMatter.title !== undefined) ir.title = frontMatter.title;
    if (frontMatter.config?.theme === "dark") ir.theme = "dark";
    if (
      frontMatter.config?.themeVariables &&
      typeof frontMatter.config.themeVariables === "object"
    ) {
      ir.variables = Object.fromEntries(
        Object.entries(frontMatter.config.themeVariables).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      );
    }
    const cleaned = frontMatter.source;
    const lines = cleaned
      .split(/\r?\n/)
      .map((text, index) => ({ text, line: index + 1 }))
      .filter((l) => l.text.trim() && !l.text.trim().startsWith("%%"));
    const header = lines.shift();
    if (!header) fail(1, "Empty diagram");
    const keyword = header.text.trim().split(/[\s;]/)[0].replace(/:$/, "");
    const kind = kinds[keyword];
    if (!kind) {
      const extended = parseExtended(source);
      if (!extended) return { kind: "unsupported", type: keyword };
      if (extended.kind !== "error" && extended.kind !== "unsupported") {
        if (ir.theme !== undefined) extended.ir.theme = ir.theme;
        if (ir.variables !== undefined) extended.ir.variables = ir.variables;
        if (extended.ir.title === undefined && ir.title !== undefined) extended.ir.title = ir.title;
        const config = mergeDiagramConfig(
          extended.ir.data?.config as Record<string, unknown> | undefined,
          frontMatter.config,
        );
        if (config) extended.ir.data = { ...extended.ir.data, config };
      }
      return extended;
    }
    if (kind === "pie") {
      const title = /\btitle\s+(.+)$/.exec(header.text)?.[1];
      if (title) ir.title = title.trim();
      if (/\bshowData\b/.test(header.text)) ir.data = { ...ir.data, showData: true };
    }
    if (kind === "xychart") {
      const orientation = header.text.trim().slice(keyword.length).trim();
      if (orientation && orientation !== "horizontal")
        fail(header.line, "Unsupported XY orientation");
      if (orientation) ir.horizontal = true;
    }
    if (kind === "flowchart") parseFlowchart(ir, cleaned);
    else if (kind === "sequence")
      parseSequence(
        ir,
        lines.map((l) => ({ ...l, text: l.text.trim() })),
      );
    else if (["class", "state", "er"].includes(kind))
      parseGraph(
        ir,
        kind,
        lines.map((l) => ({ ...l, text: l.text.trim() })),
      );
    else
      parseChart(
        ir,
        kind,
        lines.map((l) => ({ ...l, text: kind === "mindmap" ? l.text : l.text.trim() })),
      );
    if (
      ir.nodes.length > 300 ||
      ir.clusters.length > 300 ||
      ir.edges.length > 600 ||
      ir.events.length > 600
    )
      return {
        kind: "error",
        error: {
          kind: "limit",
          line: 1,
          column: 1,
          message: "Diagram exceeds 300 nodes or 600 edges/events",
        },
      };
    if (!ir.nodes.length && !ir.events.length && kind !== "gantt")
      fail(header.line, "Diagram has no content");
    return { kind, ir };
  } catch (error) {
    return {
      kind: "error",
      error:
        error instanceof ParseFailure
          ? error.detail
          : {
              kind: "syntax",
              line: 1,
              column: 1,
              message: error instanceof Error ? error.message : "Invalid diagram",
            },
    };
  }
}
/** Official Langium grammars are loaded on demand, without a DOM or browser. */
export async function parseDiagramAsync(source: string): Promise<ParsedDiagram> {
  const parsed = parseDiagram(source);
  if (parsed.kind !== "unsupported") return parsed;
  const { parseOfficialAst } = await import("./official-ast.ts");
  return (await parseOfficialAst(source)) ?? parsed;
}
