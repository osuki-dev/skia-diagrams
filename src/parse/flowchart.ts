import { readYamlMapping } from "./yaml.ts";
import type { Cluster, DiagramIR, Edge, Marker, Node } from "../types.ts";
import { addNode, fail, label, parseStyle, splitStatements, stripComment } from "./common.ts";

const shapes: [string, string, Node["shape"]][] = [
  ["(((", ")))", "doublecircle"],
  ["([", "])", "stadium"],
  ["[[", "]]", "subroutine"],
  ["[(", ")]", "cylinder"],
  ["((", "))", "circle"],
  ["{{", "}}", "hexagon"],
  ["[/", "/]", "parallelogram"],
  ["[\\", "\\]", "reverse-parallelogram"],
  ["[/", "\\]", "trapezoid"],
  ["[\\", "/]", "reverse-trapezoid"],
  ["[", "]", "rect"],
  ["(", ")", "round"],
  ["{", "}", "diamond"],
  [">", "]", "flag"],
];
/** Canonical Mermaid aliases remain canonical in the IR for native shape rendering. */
const shapeAliases: Record<string, Node["shape"]> = {
  rounded: "round",
  event: "round",
  process: "rect",
  proc: "rect",
  terminal: "stadium",
  pill: "stadium",
  subproc: "subroutine",
  "sub-process": "subroutine",
  framed: "subroutine",
  cyl: "cylinder",
  database: "cylinder",
  db: "cylinder",
  odd: "flag",
  hex: "hexagon",
  prepare: "hexagon",
  "lean-r": "parallelogram",
  "lean-l": "reverse-parallelogram",
  "trap-b": "trapezoid",
  "trap-t": "reverse-trapezoid",
  "dbl-circ": "doublecircle",
};
const modernShapes = new Set([
  "rect",
  "round",
  "stadium",
  "subroutine",
  "cylinder",
  "circle",
  "flag",
  "diamond",
  "hexagon",
  "parallelogram",
  "reverse-parallelogram",
  "trapezoid",
  "reverse-trapezoid",
  "doublecircle",
  "text",
  "paper-tape",
  "notch-rect",
  "lin-rect",
  "sm-circ",
  "fr-circ",
  "fork",
  "hourglass",
  "brace",
  "brace-r",
  "braces",
  "bolt",
  "doc",
  "delay",
  "h-cyl",
  "lin-cyl",
  "curv-trap",
  "div-rect",
  "tri",
  "win-pane",
  "f-circ",
  "lin-doc",
  "notch-pent",
  "flip-tri",
  "sl-rect",
  "docs",
  "st-rect",
  "bow-rect",
  "cross-circ",
  "tag-doc",
  "tag-rect",
]);
const modernAliases: Record<string, string> = {
  flag: "paper-tape",
  "framed-circle": "fr-circ",
  comment: "brace",
  das: "h-cyl",
  processes: "st-rect",
  "manual-file": "flip-tri",
  "manual-input": "sl-rect",
  procs: "st-rect",
  "paper-tape": "paper-tape",
  datastore: "lin-cyl",
  card: "notch-rect",
  "lined-rectangle": "lin-rect",
  "small-circle": "sm-circ",
  stop: "fr-circ",
  join: "fork",
  collate: "hourglass",
  "brace-l": "brace",
  lightning: "bolt",
  document: "doc",
  "horizontal-cylinder": "h-cyl",
  disk: "lin-cyl",
  display: "curv-trap",
  "divided-rectangle": "div-rect",
  triangle: "tri",
  "internal-storage": "win-pane",
  junction: "f-circ",
  "lined-document": "lin-doc",
  "loop-limit": "notch-pent",
  "inverted-triangle": "flip-tri",
  "sloped-rectangle": "sl-rect",
  documents: "docs",
  "stacked-rectangle": "st-rect",
  "stored-data": "bow-rect",
  summary: "cross-circ",
  "tagged-document": "tag-doc",
  "tagged-rectangle": "tag-rect",
};
type Properties = Record<string, unknown>;
type PropertyNode = Node & { metadata?: Properties };
type PropertyEdge = Edge & { id?: string; metadata?: Properties };
type PropertyCluster = Cluster & { metadata?: Properties };
function properties(source: string, line: number): Properties {
  return readYamlMapping(source, line, "Properties");
}
function nodeToken(ir: DiagramIR, input: string, parent: string | undefined, line: number): string {
  const match = /^([\p{L}\p{N}_-]+)([\s\S]*)$/u.exec(input.trim());
  if (!match) fail(line, `Invalid node: ${input}`);
  const [, id, rest] = match;
  const content = rest.replace(/:::[\w-]+$/, "").trim();
  if (content.startsWith("@{")) {
    const props = properties(content.slice(1), line);
    const edge = ir.edges.find((entry) => (entry as PropertyEdge).id === id) as
      | PropertyEdge
      | undefined;
    if (edge) {
      edge.metadata = { ...edge.metadata, ...props };
      return id;
    }
    const cluster = ir.clusters.find((entry) => entry.id === id) as PropertyCluster | undefined;
    if (cluster) {
      cluster.metadata = { ...cluster.metadata, ...props };
      return id;
    }
    const node = addNode(
      ir,
      id,
      typeof props.label === "string" ? props.label : id,
      "rect",
      parent,
    ) as PropertyNode;
    node.metadata = { ...node.metadata, ...props };
    if (typeof props.shape === "string") {
      const shape = shapeAliases[props.shape] ?? modernAliases[props.shape] ?? props.shape;
      if (!modernShapes.has(shape)) fail(line, `Unknown node shape: ${props.shape}`);
      node.shape = shape as Node["shape"];
    }
    if (typeof props.icon === "string") node.metadata.shape = "icon";
    if (typeof props.img === "string") node.metadata.shape = "image";
    return id;
  }
  if (!content) {
    addNode(ir, id, id, "rect", parent);
    return id;
  }
  for (const [open, close, shape] of shapes)
    if (content.startsWith(open) && content.endsWith(close)) {
      const node = addNode(ir, id, content.slice(open.length, -close.length), shape, parent);
      node.shape = shape;
      node.label = label(content.slice(open.length, -close.length));
      return id;
    }
  fail(line, `Unsupported node shape: ${input}`);
}
function arrowMatches(
  source: string,
): { index: number; end: number; token: string; label: string; id?: string }[] {
  const matches: { index: number; end: number; token: string; label: string; id?: string }[] = [];
  let depth = 0,
    quote = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '"' && source[i - 1] !== "\\") quote = !quote;
    if (quote) continue;
    if ("[({".includes(c)) {
      depth++;
      continue;
    }
    if ("])}".includes(c)) {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth) continue;
    const edgeId = /^([\w-]+)@(?=[<ox~=-])/.exec(source.slice(i));
    const offset = edgeId?.[0].length ?? 0;
    const arrowSource = source.slice(i + offset);
    const spaced = /^([<ox]?)(--|==|-\.)\s+(.+?)\s+(-{2,}[>ox]?|={2,}[>ox]?|\.-[>ox]?)/.exec(
      arrowSource,
    );
    if (spaced) {
      matches.push({
        index: i,
        end: i + offset + spaced[0].length,
        token: spaced[1] + (spaced[4].startsWith(".") ? "-" + spaced[4] : spaced[4]),
        label: label(spaced[3]),
        ...(edgeId ? { id: edgeId[1] } : {}),
      });
      i += offset + spaced[0].length - 1;
      continue;
    }
    const match =
      /^(?:[<ox](?:-\.+-+|[-=]{2,})[>ox]?|[-]+[>ox]|[-]{3,}|-\.+-+[>ox]?|[=]{2,}[>ox]?|~{3,})/.exec(
        arrowSource,
      );
    if (!match) continue;
    let end = i + offset + match[0].length,
      text = "";
    if (source[end] === "|") {
      const close = source.indexOf("|", end + 1);
      if (close < 0) continue;
      text = source.slice(end + 1, close);
      end = close + 1;
    }
    matches.push({
      index: i,
      end,
      token: match[0],
      label: label(text),
      ...(edgeId ? { id: edgeId[1] } : {}),
    });
    i = end - 1;
  }
  return matches;
}
export function parseFlowchart(ir: DiagramIR, source: string): void {
  const stack: string[] = [];
  const classes = new Map<string, ReturnType<typeof parseStyle>>();
  const classAnimations = new Map<string, string>();
  const assigned: [string, string][] = [];
  const statements = splitStatements(source);
  const header = statements.shift();
  const direction = /^(?:flowchart|graph)(?:\s+(TD|TB|BT|LR|RL))?$/.exec(header?.text ?? "");
  if (!direction) fail(1, "Expected flowchart direction TD, TB, BT, LR or RL");
  ir.direction = direction[1] === "TD" || !direction[1] ? "TB" : direction[1];
  for (const { text: raw, line } of statements) {
    const text = stripComment(raw);
    const parent = stack.at(-1);
    if (/^subgraph\s/.test(text)) {
      const quoted = /^subgraph\s+"([\s\S]*)"$/.exec(text);
      if (quoted) {
        const id = `subgraph-${ir.clusters.length}`;
        ir.clusters.push({ id, label: label(quoted[1]), parent });
        stack.push(id);
        continue;
      }
      const title = text.replace(/^subgraph\s+/, "");
      const explicit = /^([\p{L}\p{M}\p{N}_-]+)\s*\[(.*)\]$/u.exec(title);
      const content = explicit?.[2] ?? title;
      const quotedTitle = /^"[^"\n]*"$/.test(content.trim());
      if (!content.trim() || (!quotedTitle && /[[\](){}"<>]/.test(content)))
        fail(line, 'Invalid subgraph title; quote special characters: subgraph id ["Title"]');
      const id =
        explicit?.[1] ??
        (/^[\p{L}\p{M}\p{N}_-]+$/u.test(title) ? title : `subgraph-${ir.clusters.length}`);
      ir.clusters.push({ id, label: label(content), parent });
      stack.push(id);
      continue;
    }
    if (text === "end") {
      if (!stack.pop()) fail(line, "Unmatched end");
      continue;
    }
    if (/^direction\s/.test(text)) {
      const cluster = ir.clusters.find((c) => c.id === parent);
      if (!cluster) fail(line, "direction requires a subgraph");
      cluster.direction = text.slice(10).trim();
      if (cluster.direction === "TD") cluster.direction = "TB";
      if (!["TB", "BT", "LR", "RL"].includes(cluster.direction))
        fail(line, "Invalid subgraph direction");
      continue;
    }
    const style = /^style\s+(\S+)\s+(.+)$/.exec(text);
    if (style) {
      for (const id of style[1].split(",")) {
        const cluster = ir.clusters.find((entry) => entry.id === id);
        const target =
          cluster ?? ir.edges.find((entry) => (entry as PropertyEdge).id === id) ?? addNode(ir, id);
        target.style = { ...target.style, ...parseStyle(style[2]) };
      }
      continue;
    }
    const def = /^classDef\s+(\S+)\s+(.+)$/.exec(text);
    if (def) {
      for (const name of def[1].split(",")) {
        classes.set(name, parseStyle(def[2]));
        if (/(?:^|,)\s*animation\s*:/.test(def[2])) classAnimations.set(name, def[2]);
      }
      continue;
    }
    const cls = /^class\s+(\S+)\s+(\S+)$/.exec(text);
    if (cls) {
      for (const id of cls[1].split(","))
        for (const name of cls[2].split(",")) assigned.push([id, name]);
      continue;
    }
    const link = /^linkStyle\s+(\d+(?:,\d+)*|default)\s+(.+)$/.exec(text);
    if (link) {
      for (const [index, edge] of ir.edges.entries())
        if (link[1] === "default" || link[1].split(",").map(Number).includes(index))
          edge.style = parseStyle(link[2]);
      continue;
    }
    if (/^click\s/.test(text)) {
      const match =
        /^click\s+(\S+)\s+(?:href\s+|call\s+)?("[^"]*"|\S+)(?:\s+"([^"]*)")?(?:\s+(_\w+))?$/.exec(
          text,
        );
      if (!match) fail(line, "Invalid click declaration");
      const node = addNode(ir, match[1]) as PropertyNode;
      const target = label(match[2]);
      node.interaction = {
        kind: match[2].startsWith('"') ? "link" : "callback",
        target: match[2].startsWith('"') ? target : target.replace(/\(\)$/, ""),
        ...(match[3] ? { tooltip: label(match[3]) } : {}),
      };
      node.metadata = {
        ...node.metadata,
        interaction: {
          ...(match[2].startsWith('"')
            ? { type: "link", href: target }
            : { type: "callback", callback: target.replace(/\(\)$/, "") }),
          ...(match[3] ? { tooltip: match[3] } : {}),
          ...(match[4] ? { target: match[4] } : {}),
        },
      };
      continue;
    }
    if (/^accTitle\s*:/.test(text)) {
      ir.title = label(text.replace(/^accTitle\s*:/, ""));
      continue;
    }
    if (/^accDescr\s*:/.test(text)) {
      ir.description = label(text.replace(/^accDescr\s*:/, ""));
      continue;
    }
    const description = /^accDescr\s*\{([\s\S]*)\}$/.exec(text);
    if (description) {
      ir.description = label(description[1]);
      continue;
    }
    const normalized = text;
    const arrows = arrowMatches(normalized);
    const chunks: string[] = [];
    let begin = 0;
    for (const arrow of arrows) {
      chunks.push(normalized.slice(begin, arrow.index));
      begin = arrow.end;
    }
    chunks.push(normalized.slice(begin));
    const groups = chunks.map((chunk) =>
      splitNodes(chunk).map((token) => {
        const id = nodeToken(ir, token, parent, line);
        const clsName = /:::([\w-]+)$/.exec(token.trim());
        if (clsName) assigned.push([id, clsName[1]]);
        return id;
      }),
    );
    for (const [index, arrow] of arrows.entries()) {
      const marker = (c: string): Marker =>
        c === "o" ? "circle" : c === "x" ? "cross" : c === "<" || c === ">" ? "arrow" : "none";
      const minLength = Math.max(
        1,
        arrow.token.includes(".")
          ? arrow.token.split(".").length - 1
          : arrow.token.replace(/[<>ox]/g, "").length - (/[>ox]$/.test(arrow.token) ? 1 : 2),
      );
      for (const from of groups[index])
        for (const to of groups[index + 1])
          ir.edges.push({
            ...(arrow.id ? { id: arrow.id } : {}),
            ...(arrow.token.startsWith("~")
              ? { style: { stroke: "transparent" }, metadata: { invisible: true } }
              : {}),
            from,
            to,
            label: arrow.label,
            start: marker(arrow.token[0]),
            end: marker(arrow.token.at(-1) ?? ""),
            dashed: arrow.token.includes("."),
            thick: arrow.token.includes("="),
            ...(minLength > 1 ? { minLength } : {}),
          });
    }
  }
  if (stack.length) fail(statements.at(-1)?.line ?? 1, "Unclosed subgraph");
  ir.nodes = ir.nodes.filter((n) => !ir.clusters.some((c) => c.id === n.id));
  for (const [id, name] of assigned) {
    const node =
      ir.nodes.find((n) => n.id === id) ??
      ir.edges.find((edge) => (edge as PropertyEdge).id === id) ??
      ir.clusters.find((cluster) => cluster.id === id);
    const style = classes.get(name);
    if (node && style) node.style = { ...node.style, ...style };
    const animation = classAnimations.get(name);
    if (node && animation) {
      const target = node as PropertyNode;
      target.metadata = { ...target.metadata, animationStyle: animation };
    }
  }
  const defaultStyle = classes.get("default");
  if (defaultStyle)
    for (const node of ir.nodes)
      if (!assigned.some(([id]) => id === node.id)) node.style = { ...defaultStyle, ...node.style };
}
function splitNodes(source: string): string[] {
  const parts: string[] = [];
  let start = 0,
    depth = 0,
    quote = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '"' && source[i - 1] !== "\\") quote = !quote;
    if (quote) continue;
    if ("[({".includes(c)) depth++;
    if ("])}".includes(c)) depth = Math.max(0, depth - 1);
    if (c === "&" && depth === 0) {
      parts.push(source.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(source.slice(start));
  return parts;
}
