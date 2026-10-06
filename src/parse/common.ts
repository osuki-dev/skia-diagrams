import type { DiagramError, DiagramIR, Node, Style } from "../types.ts";
export class ParseFailure extends Error {
  constructor(public detail: DiagramError) {
    super(detail.message);
  }
}
export function fail(line: number, message: string): never {
  throw new ParseFailure({ kind: "syntax", line, column: 1, message });
}
export function label(text: string): string {
  const entities: Record<string, string> = {
    quot: '"',
    amp: "&",
    lt: "<",
    gt: ">",
    apos: "'",
    nbsp: "\u00a0",
    infin: "∞",
    hearts: "♥",
    copy: "©",
    reg: "®",
    trade: "™",
    ndash: "–",
    mdash: "—",
  };
  return text
    .trim()
    .replace(/^"|"$/g, "")
    .replace(/^`|`$/g, "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/(?:#|&)([a-z]+);/gi, (match, name: string) => entities[name.toLowerCase()] ?? match)
    .replace(/&?#(x[\da-f]+|\d+);/gi, (_, n: string) => {
      const code = n[0].toLowerCase() === "x" ? parseInt(n.slice(1), 16) : Number(n);
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
        ? String.fromCodePoint(code)
        : "\ufffd";
    })
    .replace(/\\"/g, '"');
}
export function emptyIR(): DiagramIR {
  return { nodes: [], edges: [], clusters: [], events: [], direction: "TB" };
}
export function stripComment(source: string): string {
  let quote = false,
    pipe = false,
    depth = 0;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '"' && source[i - 1] !== "\\") quote = !quote;
    if (quote) continue;
    if ("[({".includes(c)) depth++;
    if ("])}".includes(c)) depth = Math.max(0, depth - 1);
    if (c === "|" && depth === 0) pipe = !pipe;
    if (c === "%" && source[i + 1] === "%" && depth === 0 && !pipe)
      return source.slice(0, i).trim();
  }
  return source.trim();
}
export function addNode(
  ir: DiagramIR,
  id: string,
  text = id,
  shape: Node["shape"] = "rect",
  parent?: string,
): Node {
  let node = ir.nodes.find((n) => n.id === id);
  if (!node) {
    if (ir.nodes.length >= 300)
      throw new ParseFailure({
        kind: "limit",
        line: 1,
        column: 1,
        message: "Diagram exceeds 300 nodes",
      });
    node = { id, label: label(text), shape, parent };
    ir.nodes.push(node);
  } else if (text !== id) {
    node.label = label(text);
    node.shape = shape;
  }
  if (parent !== undefined && node.parent === undefined) node.parent = parent;
  return node;
}
export function parseStyle(source: string): Style {
  const style: Style = {};
  for (const entry of source.split(/(?<!\\),(?![^()]*\))/)) {
    const [key, ...rest] = entry.split(":");
    const value = rest.join(":").trim().replace(/\\,/g, " ");
    if (
      ["fill", "stroke", "color"].includes(key.trim()) &&
      /^(#[\da-f]{3,8}|[a-z]+|rgba?\([\d.,%\s]+\)|palette(?:Fill|Text)?:\d+)$/i.test(value)
    )
      Object.assign(style, { [key.trim()]: value });
    if (key.trim() === "font-weight" && /^(?:normal|bold|[1-9]00)$/.test(value))
      style.fontWeight = value === "bold" ? 700 : value === "normal" ? 400 : Number(value);
    if (key.trim() === "font-style" && /^(?:normal|italic)$/.test(value))
      style.fontStyle = value as "normal" | "italic";
    if (key.trim() === "stroke-width" && /^\d+(?:\.\d+)?(?:px)?$/.test(value))
      style.strokeWidth = Math.min(10, Math.max(0, parseFloat(value)));
    if (key.trim() === "stroke-dasharray" && /^[\d\s]+$/.test(value))
      style.dash = value.split(/\s+/).map(Number);
  }
  return style;
}
/** Split only outside quoted labels and node delimiters. */
export function splitStatements(source: string): { text: string; line: number }[] {
  const result: { text: string; line: number }[] = [];
  let start = 0,
    line = 1,
    startLine = 1,
    quote = false,
    depth = 0;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '"' && source[i - 1] !== "\\") quote = !quote;
    if (!quote) {
      if ("[({".includes(c)) depth++;
      if ("])}".includes(c)) depth = Math.max(0, depth - 1);
    }
    if ((c === "\n" || c === ";") && !quote && depth === 0) {
      result.push({ text: source.slice(start, i).trim(), line: startLine });
      start = i + 1;
      startLine = line + (c === "\n" ? 1 : 0);
    }
    if (c === "\n") line++;
  }
  result.push({ text: source.slice(start).trim(), line: startLine });
  return result.filter((r) => r.text && !r.text.startsWith("%%"));
}
