import { readYamlMapping } from "./yaml.ts";
import type { Cluster, Edge, Node, ParsedDiagram, Style } from "../types.ts";
import {
  addNode,
  emptyIR,
  fail,
  label,
  ParseFailure,
  parseStyle,
  splitStatements,
  stripComment,
} from "./common.ts";
import { readDiagramMetadata } from "./metadata.ts";
import { readUsecaseJson, type UsecaseJsonRow } from "./usecase-json.ts";

/** Native use-case grammar: declarations, boundaries, associations and safe data tables. */
export function parseUsecase(source: string): ParsedDiagram | undefined {
  if (!/^\s*usecase(?:-beta)?\b/m.test(source)) return undefined;
  try {
    const front = readDiagramMetadata(source);
    const statements = splitStatements(front.source);
    if (!/^usecase(?:-beta)?$/.test(statements[0]?.text ?? "")) return undefined;
    const ir = emptyIR();
    ir.direction = "LR";
    if (front.title) ir.title = front.title;
    const notes: { target: string; text: string; labelType: "text" | "markdown" }[] = [];
    const boundaries: Record<string, Record<string, unknown>> = Object.create(null);
    ir.data = { notes, boundaries, config: front.config ?? {} };
    const stack: string[] = [];
    const definitions = new Map<string, Style>();
    const classAssignments = new Map<string, string[]>();
    const explicitStyles = new Map<string, Style>();
    const edgeById = new Map<string, Edge>();
    const target = (id: string): Node | Edge | Cluster | undefined =>
      ir.nodes.find((node) => node.id === id) ??
      edgeById.get(id) ??
      ir.clusters.find((cluster) => cluster.id === id);
    const assignClasses = (id: string, classes: string[]) =>
      classAssignments.set(id, [...(classAssignments.get(id) ?? []), ...classes]);
    const declaration = (raw: string, line: number, role = "usecase"): string => {
      let text = raw.trim();
      const classes = /:::(\w+(?:,\w+)*)$/.exec(text);
      if (classes) text = text.slice(0, classes.index).trim();
      const stereotype = /<<([^<>]+)>>/.exec(text);
      if (stereotype) text = text.replace(stereotype[0], "").trim();
      let metadata: Record<string, unknown> = {};
      let dataEntries: UsecaseJsonRow[] = [];
      const attrs = /@\{([\s\S]*)\}/.exec(text);
      if (attrs) {
        if (role === "json") {
          const json = readUsecaseJson(`{${attrs[1]}}`, line);
          metadata = json.data;
          dataEntries = json.rows;
        } else metadata = readYamlMapping(`{${attrs[1]}}`, line, "Use-case attributes");
        text = text.replace(attrs[0], "").trim();
      }
      const quoted = /^"([\s\S]*)"$/.exec(text);
      const named = /^([\w-]+)(?:\(([\s\S]*)\)|\[([\s\S]*)\])?$/.exec(text);
      if (!quoted && !named) fail(line, `Invalid ${role} declaration: ${text}`);
      const id = quoted ? label(quoted[1]).replace(/\W+/g, "_") : named![1];
      const caption = quoted ? quoted[1] : (named![2] ?? named![3] ?? id);
      const labelType = /^"?`[\s\S]*`"?$/.test(caption.trim()) ? "markdown" : "text";
      if (role === "boundary") {
        const existing = ir.clusters.find((cluster) => cluster.id === id);
        if (existing) fail(line, `Duplicate system boundary: ${id}`);
        ir.clusters.push({ id, label: label(caption), parent: stack.at(-1) });
        boundaries[id] = { ...metadata, labelType };
        stack.push(id);
      } else if (
        target(id) &&
        attrs &&
        !named?.[2] &&
        !named?.[3] &&
        !quoted &&
        role === "usecase"
      ) {
        const element = target(id)!;
        if (boundaries[id]) Object.assign(boundaries[id], metadata);
        else
          (element as Node | Edge).metadata = { ...(element as Node | Edge).metadata, ...metadata };
      } else {
        const node = addNode(
          ir,
          id,
          caption,
          role === "json" || named?.[3] !== undefined ? "rect" : "stadium",
          stack.at(-1),
        );
        node.metadata = {
          ...node.metadata,
          role,
          labelType,
          ...metadata,
          ...(stereotype ? { stereotype: stereotype[1] } : {}),
        };
        if (role === "json") {
          node.metadata.data = metadata;
          node.metadata.dataEntries = dataEntries;
        }
        if (stereotype) node.annotation = `«${stereotype[1]}»`;
      }
      if (classes) assignClasses(id, classes[1].split(","));
      return id;
    };
    for (const statement of statements.slice(1)) {
      const text = stripComment(statement.text);
      const line = statement.line;
      if (!text) continue;
      if (text === "end") {
        if (!stack.length) fail(line, "Unexpected boundary end");
        stack.pop();
        continue;
      }
      const direction = /^direction\s+(LR|RL|TB|TD|BT)$/.exec(text);
      if (direction) {
        ir.direction = direction[1] === "TD" ? "TB" : direction[1];
        continue;
      }
      const title = /^(?:accTitle:|title\s+)\s*([\s\S]+)$/.exec(text);
      if (title) {
        ir.title = label(title[1]);
        continue;
      }
      const description = /^accDescr\s*(?::\s*([\s\S]+)|\{([\s\S]*)\})$/.exec(text);
      if (description) {
        ir.description = (description[1] ?? description[2]).trim();
        continue;
      }
      const note = /^note\s+for\s+([\w-]+)\s+"([\s\S]*)"$/.exec(text);
      if (note) {
        notes.push({
          target: note[1],
          text: label(`"${note[2]}"`),
          labelType: /^`[\s\S]*`$/.test(note[2]) ? "markdown" : "text",
        });
        continue;
      }
      const classDef = /^classDef\s+([\w,-]+)\s+([\s\S]+)$/.exec(text);
      if (classDef) {
        for (const name of classDef[1].split(",")) definitions.set(name, parseStyle(classDef[2]));
        continue;
      }
      const classes = /^class\s+([\w,-]+)\s+([\w,-]+)$/.exec(text);
      if (classes) {
        for (const id of classes[1].split(",")) assignClasses(id, classes[2].split(","));
        continue;
      }
      const style = /^style\s+([\w-]+)\s+([\s\S]+)$/.exec(text);
      if (style) {
        explicitStyles.set(style[1], parseStyle(style[2]));
        continue;
      }
      if (text.startsWith("systemBoundary ")) {
        declaration(text.slice(15), line, "boundary");
        continue;
      }
      if (text.startsWith("actor ")) {
        declaration(text.slice(6), line, "actor");
        continue;
      }
      if (text.startsWith("json ")) {
        declaration(text.slice(5), line, "json");
        continue;
      }
      // Labelled associations have separate leading dashes and trailing arrow.
      const labelled = /^([\w-]+)\s+(?:([\w-]+)@)?--\s+(.+?)\s+(-{2,}>|--\|>)\s+([\w-]+)$/.exec(
        text,
      );
      const simple =
        /^([\w-]+)\s*(?:([\w-]+)@)?([ox<]?--+[ox>]?|--\|>|\.\.>)\s*(?::\s*(include|extend)\s+)?([\w-]+)$/.exec(
          text,
        );
      if (labelled || simple) {
        const match = labelled ?? simple!;
        const from = match[1],
          id = match[2];
        const operator = labelled ? match[4] : match[3];
        const to = match[5];
        const relation = labelled ? label(match[3]) : match[4] ? `«${match[4]}»` : "";
        const edge: Edge = {
          from,
          to,
          label: relation,
          start: operator.startsWith("<")
            ? "arrow"
            : operator.startsWith("o")
              ? "circle"
              : operator.startsWith("x")
                ? "cross"
                : "none",
          end: operator.endsWith("|>")
            ? "hollow-triangle"
            : operator.endsWith(">")
              ? "arrow"
              : operator.endsWith("o")
                ? "circle"
                : operator.endsWith("x")
                  ? "cross"
                  : "none",
          metadata: {
            labelType: labelled && /^"`[\s\S]*`"$/.test(match[3].trim()) ? "markdown" : "text",
          },
          dashed: operator === "..>",
          minLength: Math.max(1, (operator.match(/-/g)?.length ?? 2) - 1),
        };
        if (id) {
          if (edgeById.has(id)) fail(line, `Duplicate edge ID: ${id}`);
          edge.id = id;
          edgeById.set(id, edge);
        }
        ir.edges.push(edge);
        for (const endpoint of [from, to])
          if (!target(endpoint)) {
            const node = addNode(ir, endpoint, endpoint, "stadium");
            node.metadata = { role: "usecase" };
          }
        continue;
      }
      declaration(text, line);
    }
    if (stack.length) fail(statements.at(-1)?.line ?? 1, "Unclosed system boundary");
    for (const element of [...ir.nodes, ...ir.edges, ...ir.clusters]) {
      const id = element.id;
      const assigned = id ? (classAssignments.get(id) ?? []) : [];
      let style: Style = { ...definitions.get("default") };
      for (const name of assigned) style = { ...style, ...definitions.get(name) };
      style = { ...style, ...(id ? explicitStyles.get(id) : {}) };
      if (Object.keys(style).length) element.style = style;
      if ("shape" in element && assigned.length) element.classes = assigned;
    }
    return { kind: "usecase", ir };
  } catch (error) {
    if (error instanceof ParseFailure) return { kind: "error", error: error.detail };
    throw error;
  }
}
