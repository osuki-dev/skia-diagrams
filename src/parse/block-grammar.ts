import type { DiagramIR, Marker, Shape, Style } from "../types.ts";
import type { BlockGroup } from "./extended-blocks.ts";
import { addNode, fail, label, parseStyle, ParseFailure } from "./common.ts";
import { runOfficialBlockGrammar } from "./generated/mermaid-block.ts";

/** Lossless official AST fields used by the native layout and style adapter. */
interface OfficialBlock {
  id?: string;
  label?: string;
  type?: string;
  typeStr?: string;
  directions?: string[];
  widthInColumns?: number;
  width?: number;
  columns?: number;
  children?: OfficialBlock[];
  start?: string;
  end?: string;
  thickness?: string;
  pattern?: string;
  arrowTypeStart?: string;
  arrowTypeEnd?: string;
  css?: string;
  styleClass?: string;
  stylesStr?: string;
}
const shapeTypes: Record<string, Shape> = {
  square: "rect",
  round: "round",
  circle: "circle",
  rect_left_inv_arrow: "flag",
  diamond: "diamond",
  hexagon: "hexagon",
  stadium: "stadium",
  subroutine: "subroutine",
  cylinder: "cylinder",
  doublecircle: "doublecircle",
  lean_right: "parallelogram",
  lean_left: "reverse-parallelogram",
  trapezoid: "trapezoid",
  inv_trapezoid: "reverse-trapezoid",
};
const delimiters: Record<string, string> = {
  "[]": "square",
  "()": "round",
  "(())": "circle",
  ">]": "rect_left_inv_arrow",
  "{}": "diamond",
  "{{}}": "hexagon",
  "([])": "stadium",
  "[[]]": "subroutine",
  "[()]": "cylinder",
  "((()))": "doublecircle",
  "[//]": "lean_right",
  "[\\\\]": "lean_left",
  "[/\\]": "trapezoid",
  "[\\/]": "inv_trapezoid",
  "<[]>": "block_arrow",
};
const marker = (value?: string): Marker =>
  value === "arrow_point"
    ? "arrow"
    : value === "arrow_circle"
      ? "circle"
      : value === "arrow_cross"
        ? "cross"
        : "none";
function limit(message: string): never {
  throw new ParseFailure({ kind: "limit", message, line: 1, column: 1 });
}
function asBlock(value: unknown): OfficialBlock {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail(1, "Invalid official block semantic value");
  return value as OfficialBlock;
}
function flatten(value: unknown): OfficialBlock[] {
  if (!Array.isArray(value)) return [asBlock(value)];
  return value.flatMap((item) => (Array.isArray(item) ? flatten(item) : [asBlock(item)]));
}
function typedNode(value: unknown): OfficialBlock {
  const node = asBlock(value);
  return { ...node, type: node.type ?? delimiters[node.typeStr ?? ""] ?? "na" };
}

/** Remove comments/accessibility metadata outside strings, preserving source line numbers. */
function prepareSource(ir: DiagramIR, source: string): string {
  let quote = false,
    result = "";
  for (let index = 0; index < source.length; index++) {
    const c = source[index];
    if (c === '"') quote = !quote;
    if (!quote && c === "%" && source[index + 1] === "%") {
      while (index < source.length && source[index] !== "\n") {
        result += " ";
        index++;
      }
      if (index < source.length) result += "\n";
      continue;
    }
    if (!quote && (index === 0 || source[index - 1] === "\n")) {
      const rest = source.slice(index);
      const title = /^\s*accTitle\s*:\s*([^\n]*)/.exec(rest);
      const description = /^\s*accDescr\s*(?::\s*([^\n]*)|\{([\s\S]*?)\})/.exec(rest);
      const metadata = title ?? description;
      if (metadata) {
        if (title) ir.title = label(title[1]);
        else ir.description = label(description![1] ?? description![2]);
        result += metadata[0].replace(/[^\n]/g, " ");
        index += metadata[0].length - 1;
        continue;
      }
    }
    result += c;
  }
  return result;
}

/** Official syntax is generated at build time; only native semantic adaptation runs here. */
export function parseOfficialBlock(ir: DiagramIR, source: string): void {
  let generated = 0,
    operations = 0,
    hierarchy: OfficialBlock[] | undefined;
  const debug = () => {
    if (++operations > 24000) limit("Block diagram exceeds parser operation limits");
  };
  const edgeEnd = (value: string) =>
    value.trim().endsWith(">")
      ? "arrow_point"
      : value.trim().endsWith("o")
        ? "arrow_circle"
        : value.trim().endsWith("x")
          ? "arrow_cross"
          : "";
  const edgeStart = (value: string) =>
    value.trim().startsWith("<")
      ? "arrow_point"
      : value.trim().startsWith("o")
        ? "arrow_circle"
        : value.trim().startsWith("x")
          ? "arrow_cross"
          : "arrow_open";
  runOfficialBlockGrammar(prepareSource(ir, source), {
    getLogger: () => ({ debug }),
    generateId: () => {
      if (++generated > 300) limit("Block diagram exceeds 300 generated cells");
      return "__block" + generated;
    },
    typeStr2Type: (value) => delimiters[value ?? ""] ?? "na",
    edgeStrToEdgeData: edgeEnd,
    edgeStrToEdgeStartData: edgeStart,
    edgeStrToThickness: (value) => (value.includes("==") ? "thick" : "normal"),
    edgeStrToPattern: (value) => (value.includes(".-") ? "dotted" : "solid"),
    setHierarchy: (value) => {
      hierarchy = flatten(value);
    },
    linkNodes: (from, linkValue, to) => {
      const previous = flatten(from).map(typedNode),
        target = typedNode(to);
      const origin = [...previous].reverse().find((item) => item.type !== "edge");
      const link = asBlock(linkValue) as OfficialBlock & { edgeTypeStr: string };
      if (!origin?.id || !target.id) fail(1, "Block link requires endpoints");
      const edge: OfficialBlock = {
        id: origin.id + "-" + target.id,
        type: "edge",
        start: origin.id,
        end: target.id,
        label: link.label ?? "",
        thickness: link.edgeTypeStr.includes("==") ? "thick" : "normal",
        pattern: link.edgeTypeStr.includes(".-")
          ? "dotted"
          : link.edgeTypeStr.includes("~~~")
            ? "invisible"
            : "solid",
        arrowTypeStart: edgeStart(link.edgeTypeStr),
        arrowTypeEnd: edgeEnd(link.edgeTypeStr),
      };
      return [...previous, edge, target];
    },
    parseError: (message, hash) => fail(hash.loc?.first_line ?? (hash.line ?? 0) + 1, message),
  });
  if (!hierarchy) fail(1, "Block diagram requires at least one block");
  const root: BlockGroup = { id: "__root", cells: [] },
    placed = new Set<string>();
  const classes = new Map<string, Style>(),
    assignments: { ids: string[]; name: string }[] = [],
    styles: { ids: string[]; style: Style }[] = [];
  let count = 0;
  const visit = (items: OfficialBlock[], group: BlockGroup, depth: number) => {
    if (depth > 100) limit("Block diagram exceeds nesting limits");
    for (const item of items) {
      if (item.type === "column-setting") {
        const value = item.columns ?? -1;
        if (value > 300) limit("Block diagram exceeds 300 columns");
        group.columns = value < 1 ? undefined : value;
        continue;
      }
      if (item.type === "classDef") {
        if (item.id) classes.set(item.id, parseStyle(item.css ?? ""));
        continue;
      }
      if (item.type === "applyClass") {
        assignments.push({
          ids: (item.id ?? "").split(",").map((id) => id.trim()),
          name: (item.styleClass ?? "").trim(),
        });
        continue;
      }
      if (item.type === "applyStyles") {
        styles.push({
          ids: (item.id ?? "").split(",").map((id) => id.trim()),
          style: parseStyle(item.stylesStr ?? ""),
        });
        continue;
      }
      if (item.type === "edge") {
        if (ir.edges.length >= 600) limit("Block diagram exceeds 600 links");
        if (!item.start || !item.end) fail(1, "Block edge requires endpoints");
        ir.edges.push({
          from: item.start,
          to: item.end,
          label: label(item.label ?? ""),
          start: marker(item.arrowTypeStart),
          end: marker(item.arrowTypeEnd),
          ...(item.pattern === "dotted" ? { dashed: true } : {}),
          ...(item.thickness === "thick" ? { thick: true } : {}),
          ...(item.pattern === "invisible"
            ? { style: { stroke: "transparent" }, metadata: { invisible: true } }
            : {}),
        });
        continue;
      }
      const id = item.id;
      if (!id) fail(1, "Block node requires an id");
      const span = item.type === "space" ? (item.width ?? 1) : (item.widthInColumns ?? 1);
      if (span < 1) fail(1, "Block span must be positive");
      if (span > 300) limit("Block span exceeds 300 columns");
      if (item.type === "space") {
        if (++count > 300) limit("Block diagram exceeds 300 cells");
        group.cells.push({ id, span, space: true });
        continue;
      }
      const existing = ir.nodes.find((node) => node.id === id);
      const existingShape = existing?.shape;
      const node = addNode(ir, id, item.label || id, shapeTypes[item.type ?? "na"] ?? "rect");
      if (existingShape && item.type === "na") node.shape = existingShape;
      if (item.type === "na" && item.typeStr)
        node.metadata = { ...node.metadata, blockTypeString: item.typeStr };
      if (item.type === "composite") node.metadata = { ...node.metadata, blockComposite: true };
      if (!placed.has(id)) {
        if (++count > 300) limit("Block diagram exceeds 300 cells");
        placed.add(id);
        if (item.type === "composite") {
          const child: BlockGroup = {
            id,
            ...(item.label ? { label: label(item.label) } : {}),
            cells: [],
          };
          group.cells.push({ id, span, group: child });
          visit(flatten(item.children ?? []), child, depth + 1);
        } else
          group.cells.push({
            id,
            span,
            ...(item.directions
              ? { arrows: item.directions.map((direction) => direction.trim()) }
              : {}),
          });
      }
    }
  };
  visit(hierarchy, root, 0);
  for (const node of ir.nodes)
    if (classes.has("default")) node.style = { ...classes.get("default"), ...node.style };
  for (const assignment of assignments)
    for (const id of assignment.ids) {
      const node = ir.nodes.find((n) => n.id === id),
        style = classes.get(assignment.name);
      if (node && style) node.style = { ...node.style, ...style };
    }
  for (const entry of styles)
    for (const id of entry.ids) {
      const node = ir.nodes.find((n) => n.id === id);
      if (node) node.style = { ...node.style, ...entry.style };
    }
  ir.data = { block: root, officialBlock: hierarchy };
}
