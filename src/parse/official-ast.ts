import type { DiagramIR, ParsedDiagram } from "../types.ts";
import type {
  Architecture,
  Cynefin,
  EventModel,
  Packet,
  Radar,
  Treemap,
  TreeView,
  Wardley,
} from "@mermaid-js/parser";
import { addNode, emptyIR, ParseFailure } from "./common.ts";
import { readDiagramMetadata } from "./metadata.ts";

const officialTypes = {
  packet: "packet",
  "packet-beta": "packet",
  "treeView-beta": "treeView",
  "architecture-beta": "architecture",
  eventmodeling: "eventmodeling",
  "radar-beta": "radar",
  "treemap-beta": "treemap",
  wardley: "wardley",
  "wardley-beta": "wardley",
  cynefin: "cynefin",
  "cynefin-beta": "cynefin",
} as const;
type OfficialType = (typeof officialTypes)[keyof typeof officialTypes];
type OfficialAst =
  | Architecture
  | Cynefin
  | EventModel
  | Packet
  | Radar
  | Treemap
  | TreeView
  | Wardley;

/** Keep semantic AST fields, but never expose cyclic Langium internals to layouts. */
function semanticData(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(semanticData);
  if (value === null || typeof value !== "object") return value;
  if ("$refText" in value) return { $refText: value.$refText };
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !key.startsWith("$") || key === "$type")
      .map(([key, field]) => [key, semanticData(field)]),
  );
}

function projectAst(ast: OfficialAst, ir: DiagramIR): void {
  switch (ast.$type) {
    case "Packet":
      for (const block of ast.blocks)
        ir.events.push({
          type: "packet",
          label: block.label,
          start: block.start,
          end: block.end,
          value: block.bits,
        });
      break;
    case "TreeView":
      ast.nodes.forEach((node, index) => {
        addNode(ir, `tree-${index}`, node.name);
        ir.events.push({ type: "tree", label: node.name, depth: node.indent?.length ?? 0 });
      });
      break;
    case "Architecture":
      ir.direction = "LR";
      ir.clusters = ast.groups.map((group) => ({
        id: group.id,
        label: group.title ?? group.id,
        parent: group.in,
      }));
      for (const service of ast.services)
        addNode(ir, service.id, service.title ?? service.id, "round", service.in);
      for (const junction of ast.junctions) addNode(ir, junction.id, "", "circle", junction.in);
      ir.edges = ast.edges.map((edge) => ({
        from: edge.lhsId,
        to: edge.rhsId,
        label: edge.title ?? "",
        start: edge.lhsInto ? "arrow" : "none",
        end: edge.rhsInto ? "arrow" : "none",
      }));
      break;
    case "Radar": {
      const labels = ast.axes.map((axis) => axis.label ?? axis.name);
      const options = Object.fromEntries(ast.options.map((option) => [option.name, option.value]));
      let maxValue = 0;
      for (const curve of ast.curves)
        for (const entry of curve.entries) maxValue = Math.max(maxValue, entry.value);
      ir.axis = {
        labels,
        min: typeof options.min === "number" ? options.min : 0,
        max: typeof options.max === "number" ? options.max : maxValue,
      };
      for (const curve of ast.curves) {
        const keyedEntries = new Map(
          curve.entries
            .filter((entry) => entry.axis)
            .map((entry) => [entry.axis!.$refText, entry.value]),
        );
        const values = ast.axes.map((axis, index) =>
          keyedEntries.size
            ? (keyedEntries.get(axis.name) ?? 0)
            : (curve.entries[index]?.value ?? 0),
        );
        ir.events.push({ type: "radar", label: curve.label ?? curve.name, values });
      }
      break;
    }
    case "Treemap":
      ast.TreemapRows.forEach((row, index) => {
        if (!row.item) return;
        addNode(ir, `treemap-${index}`, row.item.name);
        ir.events.push({
          type: row.item.$type === "Leaf" ? "leaf" : "section",
          label: row.item.name,
          depth: Number(row.indent ?? 0),
          value: "value" in row.item ? Number(row.item.value) : undefined,
        });
      });
      break;
    case "Wardley":
      ir.direction = "LR";
      for (const component of [...ast.anchors, ...ast.components]) {
        addNode(ir, component.name, component.name, "circle");
        ir.events.push({
          type: component.$type.toLowerCase(),
          label: component.name,
          values: [component.evolution, component.visibility],
        });
      }
      ir.edges = ast.links.map((link) => ({
        from: link.from,
        to: link.to,
        label: "",
        start: link.arrow?.startsWith("<") ? "arrow" : "none",
        end: link.arrow?.endsWith(">") ? "arrow" : "none",
      }));
      break;
    case "Cynefin":
      for (const domain of ast.domains)
        for (const item of domain.items)
          ir.events.push({ type: "domain", label: item.label, section: domain.domain });
      ir.edges = ast.transitions.map((transition) => ({
        from: transition.from,
        to: transition.to,
        label: transition.label,
        start: "none",
        end: "arrow",
      }));
      break;
    case "EventModel":
      ir.direction = "LR";
      for (const frame of ast.frames) {
        addNode(ir, frame.name, frame.entityIdentifier, "round");
        ir.events.push({
          type: frame.modelEntityType,
          label: frame.entityIdentifier,
          section: frame.name,
        });
        for (const source of frame.sourceFrames)
          ir.edges.push({
            from: source.$refText,
            to: frame.name,
            label: "",
            start: "none",
            end: "arrow",
          });
      }
      break;
  }
}

/** Parse official grammars lazily without loading a DOM, browser, renderer, or fonts. */
export async function parseOfficialAst(source: string): Promise<ParsedDiagram | undefined> {
  let type: OfficialType | undefined;
  try {
    const metadata = readDiagramMetadata(source);
    const cleaned = metadata.source
      .replace(/%%\{[\s\S]*?\}%%/g, (directive) => directive.replace(/[^\n]/g, ""))
      .replace(/^[\t ]+$/gm, "");
    const firstLine = cleaned
      .split(/\r?\n/)
      .find((line) => line.trim() && !line.trim().startsWith("%%"));
    const keyword = firstLine?.trim().split(/\s/)[0];
    type = officialTypes[keyword as keyof typeof officialTypes];
    if (!type) return undefined;
    if (source.length > 200000)
      return {
        kind: "error",
        error: { kind: "limit", line: 1, column: 1, message: "Diagram source exceeds 200 KB" },
      };
    const { parse } = await import("@mermaid-js/parser");
    // The parser overloads select the same AST union from a runtime grammar name.
    const parseAst = parse as (kind: OfficialType, input: string) => Promise<OfficialAst>;
    const ast = await parseAst(type, cleaned);
    const ir = emptyIR();
    ir.title = metadata.title ?? ast.title ?? ast.accTitle;
    ir.description = ast.accDescr;
    ir.data = semanticData(ast) as Record<string, unknown>;
    if (metadata.config) ir.data.config = metadata.config;
    if (metadata.config?.theme === "dark") ir.theme = "dark";
    const variables = metadata.config?.themeVariables;
    if (variables && typeof variables === "object" && !Array.isArray(variables))
      ir.variables = Object.fromEntries(
        Object.entries(variables).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      );
    projectAst(ast, ir);
    return { kind: type === "treeView" ? "treeview" : type, ir };
  } catch (cause) {
    if (cause instanceof ParseFailure) return { kind: "error", error: cause.detail };
    const message = cause instanceof Error ? cause.message : String(cause);
    const position = /(?:error on|at) line (\d+), column (\d+)/i.exec(message);
    return {
      kind: "error",
      error: {
        kind: "syntax",
        line: Number(position?.[1] ?? 1),
        column: Number(position?.[2] ?? 1),
        message,
      },
    };
  }
}
