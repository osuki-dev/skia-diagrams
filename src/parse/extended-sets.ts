import type { ParsedDiagram, Style } from "../types.ts";
import { emptyIR, fail, label, ParseFailure, parseStyle, stripComment } from "./common.ts";
import { readDiagramMetadata as readFrontMatter } from "./metadata.ts";

export interface VennRegion {
  id: string;
  sets: string[];
  label: string;
  size: number;
  /** Explicit authored size; defaults only influence circle geometry. */
  authoredSize?: number;
  style: Style;
  opacity?: number;
  texts: { id: string; label: string; style: Style }[];
}
export interface Cause {
  id: string;
  label: string;
  children: Cause[];
}
const identifier = /^(?:"((?:\\.|[^"\\])*)"|([\w\p{L}\p{N}-]+))/u;
function regionExpression(value: string, line: number) {
  const ids: string[] = [];
  let rest = value.trim();
  do {
    const match = identifier.exec(rest);
    if (!match) fail(line, "Expected a set identifier");
    ids.push(label(match[1] ?? match[2]));
    rest = rest.slice(match[0].length).trim();
    if (!rest.startsWith(",")) break;
    rest = rest.slice(1).trim();
  } while (rest);
  const suffix = /^(?:\[\s*("(?:\\.|[^"\\])*"|[^\]]*)\s*\])?\s*(?::\s*(\d+(?:\.\d+)?))?$/.exec(
    rest,
  );
  if (!suffix) fail(line, "Invalid region label or size");
  const size = suffix[2] === undefined ? undefined : Number(suffix[2]);
  if (size !== undefined && (!Number.isFinite(size) || size <= 0))
    fail(line, "Region size must be positive");
  return { ids, label: suffix[1] === undefined ? ids.join(" ∩ ") : label(suffix[1]), size };
}
export function parseExtendedSets(source: string): ParsedDiagram | undefined {
  try {
    const front = readFrontMatter(source);
    const lines = front.source
      .split(/\r?\n/)
      .map((text, index) => ({ text, line: index + 1 }))
      .filter(({ text }) => stripComment(text));
    const header = lines.shift();
    const kind = header?.text.trim();
    if (kind !== "venn-beta" && kind !== "ishikawa-beta") return undefined;
    const ir = emptyIR();
    if (front.title) ir.title = front.title;
    if (kind === "ishikawa-beta") {
      const problem = lines.shift();
      if (!problem) fail(header!.line, "Ishikawa requires a problem statement");
      const root: Cause = { id: "problem", label: label(stripComment(problem.text)), children: [] };
      const stack: { indent: number; cause: Cause }[] = [{ indent: -1, cause: root }];
      for (const { text, line } of lines) {
        const indent = text.match(/^\s*/)?.[0].replace(/\t/g, "    ").length ?? 0;
        while (stack.length > 1 && stack.at(-1)!.indent >= indent) stack.pop();
        const cause: Cause = {
          id: `cause-${line}`,
          label: label(stripComment(text)),
          children: [],
        };
        stack.at(-1)!.cause.children.push(cause);
        stack.push({ indent, cause });
        ir.nodes.push({ id: cause.id, label: cause.label, shape: "rect" });
      }
      if (!root.children.length) fail(problem.line, "Ishikawa requires at least one cause");
      ir.nodes.unshift({ id: root.id, label: root.label, shape: "round" });
      if (ir.nodes.length > 300) fail(header!.line, "Diagram exceeds 300 causes");
      ir.data = { root };
      return { kind: "ishikawa", ir };
    }
    const regions: VennRegion[] = [],
      sets = new Set<string>();
    let active: VennRegion | undefined;
    const targets = new Map<string, Style>();
    for (const { text, line } of lines) {
      const value = stripComment(text);
      if (value.startsWith("title ")) {
        ir.title = label(value.slice(6));
        continue;
      }
      const command = /^(set|union|text)\s+(.+)$/.exec(value);
      if (command) {
        const expression = regionExpression(command[2], line);
        if (command[1] === "text") {
          if (!active || expression.ids.length !== 1 || expression.size !== undefined)
            fail(line, "Text must follow a set or union");
          const id = expression.ids[0];
          if (targets.has(id)) fail(line, `Duplicate identifier ${id}`);
          const item = { id, label: expression.label, style: {} };
          active.texts.push(item);
          targets.set(id, item.style);
          continue;
        }
        if (command[1] === "set") {
          if (expression.ids.length !== 1) fail(line, "A set has exactly one identifier");
          if (sets.has(expression.ids[0])) fail(line, "Duplicate set identifier");
          sets.add(expression.ids[0]);
        } else {
          if (expression.ids.length < 2 || new Set(expression.ids).size !== expression.ids.length)
            fail(line, "A union requires distinct set identifiers");
          for (const id of expression.ids)
            if (!sets.has(id)) fail(line, `Union references undefined set ${id}`);
        }
        active = {
          id: expression.ids.join(","),
          sets: expression.ids,
          label: expression.label,
          ...(expression.size === undefined ? {} : { authoredSize: expression.size }),
          size:
            expression.size ?? (expression.ids.length === 1 ? 10 : 3 / (expression.ids.length - 1)),
          style: {},
          texts: [],
        };
        if (targets.has(active.id)) fail(line, "Duplicate region identifier");
        regions.push(active);
        targets.set(active.id, active.style);
        continue;
      }
      const styled =
        /^style\s+(.+?)\s+((?:fill|color|stroke|stroke-width|fill-opacity)\s*:.*)$/.exec(value);
      if (styled) {
        const style = parseStyle(styled[2]);
        const opacity = /(?:^|,)\s*fill-opacity\s*:\s*(\d*(?:\.\d+)?)/.exec(styled[2]);
        for (const id of styled[1].split(",").map((id) => label(id))) {
          const target = targets.get(id);
          if (!target) fail(line, `Style references undefined identifier ${id}`);
          Object.assign(target, style);
          if (opacity) {
            const region = regions.find((region) => region.id === id);
            if (region) region.opacity = Math.min(1, Math.max(0, Number(opacity[1])));
          }
        }
        continue;
      }
      fail(line, "Invalid Venn statement");
    }
    if (!sets.size) fail(header!.line, "Venn requires at least one set");
    if (sets.size > 20 || regions.length > 300) fail(header!.line, "Venn exceeds layout limits");
    for (const region of regions.filter((region) => region.sets.length > 1)) {
      if (region.sets.some((id) => region.size > regions.find((set) => set.id === id)!.size))
        fail(header!.line, "A union size cannot exceed its sets");
    }
    // Authored intersection sizes must be monotonic: A∩B∩C cannot exceed A∩B.
    for (const region of regions)
      for (const subset of regions) {
        if (
          subset.sets.length < region.sets.length &&
          subset.sets.every((id) => region.sets.includes(id)) &&
          subset.size < region.size
        )
          fail(header!.line, `Region ${region.id} exceeds its containing region ${subset.id}`);
      }
    if (regions.reduce((count, region) => count + 1 + region.texts.length, 0) > 300)
      fail(header!.line, "Venn exceeds 300 nodes");
    ir.data = { regions };
    ir.nodes = regions.map(({ id, label, style }) => ({ id, label, style, shape: "circle" }));
    return { kind: "venn", ir };
  } catch (error) {
    if (error instanceof ParseFailure) return { kind: "error", error: error.detail };
    throw error;
  }
}
