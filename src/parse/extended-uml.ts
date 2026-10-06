import type { DiagramIR, ParsedDiagram, Style, Edge } from "../types.ts";
import { addNode, emptyIR, fail, label, ParseFailure, parseStyle } from "./common.ts";
import { c4Statements } from "./c4-statements.ts";
import { readDiagramMetadata as readFrontMatter } from "./metadata.ts";
import { parseUsecase } from "./extended-usecase.ts";
import { parseZenuml } from "./extended-zenuml.ts";

export interface UmlNodeData {
  type: string;
  fields: Record<string, string>;
  classes?: string[];
}
export interface UmlData {
  nodes: Record<string, UmlNodeData>;
  layout?: Record<string, string>;
  c4Type?: string;
}
function splitArguments(text: string): string[] {
  const result: string[] = [];
  let start = 0,
    quote = false,
    depth = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"' && text[i - 1] !== "\\") quote = !quote;
    if (quote) continue;
    if (c === "(") depth++;
    if (c === ")") depth--;
    if (c === "," && !depth) {
      result.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  if (quote || depth) fail(1, "Unclosed C4 argument");
  result.push(text.slice(start).trim());
  return result.map(label);
}
function clean(source: string): string {
  return readFrontMatter(source)
    .source.replace(/%%\{[\s\S]*?\}%%/g, "")
    .replace(/^\s*%%.*$/gm, "");
}
function applyStyles(
  ir: DiagramIR,
  classes: Map<string, Style>,
  assignments: Map<string, string[]>,
  direct: Map<string, Style>,
) {
  for (const node of ir.nodes) {
    node.style = { ...classes.get("default") };
    for (const cls of assignments.get(node.id) ?? []) Object.assign(node.style, classes.get(cls));
    Object.assign(node.style, direct.get(node.id));
  }
}
function requirementStatements(source: string): { text: string; line: number }[] {
  const statements: { text: string; line: number }[] = [];
  let buffer = "",
    line = 1,
    start = 1,
    quoted = false,
    escaped = false,
    hasText = false;
  const flush = () => {
    if (buffer.trim()) statements.push({ text: buffer.trim(), line: start });
    buffer = "";
    hasText = false;
  };
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (!hasText && char.trim()) {
      start = line;
      hasText = true;
    }
    if (quoted) {
      buffer += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') {
      quoted = true;
      buffer += char;
    } else if (char === "%" && source[i + 1] === "%") {
      while (i < source.length && source[i] !== "\n") i++;
      flush();
      if (i < source.length) line++;
      continue;
    } else if (char === "{") {
      buffer += char;
      flush();
    } else if (char === "}") {
      flush();
      buffer = "}";
      flush();
    } else if (char === ";" || char === "\n") flush();
    else buffer += char;
    if (char === "\n") line++;
  }
  if (quoted) fail(start, "Unclosed requirement quoted field");
  flush();
  return statements;
}
function requirement(source: string): ParsedDiagram {
  const ir = emptyIR(),
    data: UmlData = { nodes: Object.create(null) as Record<string, UmlNodeData> };
  ir.data = { uml: data };
  const classes = new Map<string, Style>(),
    assignments = new Map<string, string[]>(),
    direct = new Map<string, Style>();
  let active: string | undefined,
    accessibilityBlock = false;
  const descriptionLines: string[] = [];
  for (const { text: s, line: sourceLine } of requirementStatements(source)) {
    if (!s || s === "requirementDiagram") continue;
    if (accessibilityBlock) {
      if (s === "}") {
        ir.description = descriptionLines.join("\n");
        accessibilityBlock = false;
      } else descriptionLines.push(s);
      continue;
    }
    if (!active && /^accDescr\s*\{$/.test(s)) {
      accessibilityBlock = true;
      continue;
    }
    if (!active) {
      const accessible = /^(accTitle\s*:|accDescr\s*:|accDescription\s+)(.*)$/s.exec(s);
      if (accessible) {
        if (accessible[1].startsWith("accTitle"))
          ir.data!.accessibilityTitle = label(accessible[2]);
        else ir.description = label(accessible[2]);
        continue;
      }
    }

    if (active) {
      if (s === "}") {
        active = undefined;
        continue;
      }
      const field = /^(id|text|risk|verifymethod|type|docref)\s*:\s*(.*)$/is.exec(s);
      if (!field) fail(sourceLine, "Invalid requirement field");
      const key = field[1].toLowerCase(),
        value = label(field[2]);
      if (key === "risk" && !/^(low|medium|high)$/i.test(value))
        fail(sourceLine, "Invalid requirement risk");
      if (key === "verifymethod" && !/^(analysis|inspection|test|demonstration)$/i.test(value))
        fail(sourceLine, "Invalid verification method");
      data.nodes[active].fields[key] = value;
      continue;
    }
    let m =
      /^(requirement|functionalRequirement|interfaceRequirement|performanceRequirement|physicalRequirement|designConstraint|element)\s+("[^"]+"|[^\s:{]+)(?::::([\w,]+))?\s*\{\s*$/.exec(
        s,
      );
    if (m) {
      const id = label(m[2]);

      addNode(ir, id, id.replace(/^__(.+)__$/s, "$1"), "rect");
      data.nodes[id] = { type: m[1], fields: Object.create(null) as Record<string, string> };
      if (m[3]) assignments.set(id, m[3].split(","));
      active = id;
      continue;
    }
    m = /^direction\s+(TB|BT|LR|RL)$/.exec(s);
    if (m) {
      ir.direction = m[1];
      continue;
    }
    m = /^classDef\s+([\w,]+)\s+(.+)$/.exec(s);
    if (m) {
      for (const id of m[1].split(",")) classes.set(id, parseStyle(m[2]));
      continue;
    }
    m = /^class\s+([^\s]+)\s+([\w,]+)$/.exec(s);
    if (m) {
      for (const id of m[1].split(",")) assignments.set(label(id), m[2].split(","));
      continue;
    }
    m = /^style\s+([^\s]+)\s+(.+)$/.exec(s);
    if (m) {
      for (const id of m[1].split(",")) direct.set(label(id), parseStyle(m[2]));
      continue;
    }
    m = /^("[^"]+"|[^\s]+):::([\w,]+)$/.exec(s);
    if (m) {
      assignments.set(label(m[1]), m[2].split(","));
      continue;
    }
    m =
      /^(.*?)\s+(-|<-)\s+(contains|copies|derives|satisfies|verifies|refines|traces)\s+(->|-)\s+(.*?)$/.exec(
        s,
      );
    if (m) {
      const reverse = m[2] === "<-";
      if ((reverse && m[4] !== "-") || (!reverse && m[4] !== "->"))
        fail(sourceLine, "Invalid requirement relationship");
      ir.edges.push({
        from: label(reverse ? m[5] : m[1]),
        to: label(reverse ? m[1] : m[5]),
        label: m[3],
        start: m[3] === "contains" ? "circle" : "none",
        end: m[3] === "contains" ? "none" : "open",
        dashed: m[3] !== "contains",
      });
      continue;
    }

    fail(sourceLine, "Unknown requirement statement");
  }
  if (accessibilityBlock) fail(1, "Unclosed accessibility description");
  if (active) fail(source.split("\n").length, "Unclosed requirement");
  for (const edge of ir.edges)
    if (!data.nodes[edge.from] || !data.nodes[edge.to]) fail(1, "Unknown requirement endpoint");
  applyStyles(ir, classes, assignments, direct);
  return { kind: "requirement", ir };
}
function c4(source: string): ParsedDiagram {
  const ir = emptyIR(),
    data: UmlData = {
      nodes: Object.create(null) as Record<string, UmlNodeData>,
      c4Type: source.trim().split(/[\s;]/)[0],
    };
  ir.data = { uml: data };
  ir.direction = "TB";
  const parents: string[] = [];
  let accessibilityBlock = false;
  const descriptionLines: string[] = [];
  for (const { text: s, line: sourceLine } of c4Statements(source)) {
    if (accessibilityBlock) {
      if (s === "}") {
        ir.description = descriptionLines.join("\n");
        accessibilityBlock = false;
      } else descriptionLines.push(s);
      continue;
    }
    if (/^accDescr\s*\{$/.test(s)) {
      accessibilityBlock = true;
      continue;
    }
    const accessible = /^(accTitle\s*:|accDescr\s*:|accDescription\s+)(.*)$/s.exec(s);
    if (accessible) {
      if (accessible[1].startsWith("accTitle")) ir.data!.accessibilityTitle = label(accessible[2]);
      else ir.description = label(accessible[2]);
      continue;
    }
    if (!s || /^C4(Context|Container|Component|Dynamic|Deployment)$/.test(s)) continue;
    const direction = /^direction\s+(TB|BT|LR|RL)$/.exec(s);
    if (direction) {
      ir.direction = direction[1];
      continue;
    }
    if (s.startsWith("title ")) {
      ir.title = label(s.slice(6));
      continue;
    }
    if (s === "}") {
      if (!parents.pop()) fail(sourceLine, "Unexpected C4 closing boundary");
      continue;
    }
    const m = /^(\w+)\s*\(([\s\S]*)\)\s*(\{)?$/.exec(s);
    if (!m) fail(sourceLine, "Invalid C4 declaration");
    const [fn, args, boundary] = [m[1], splitArguments(m[2]), Boolean(m[3])];
    const params = Object.fromEntries(
      args
        .filter((v) => v.startsWith("$"))
        .map((v) => {
          const p = v.indexOf("=");
          return [v.slice(1, p), label(v.slice(p + 1))];
        }),
    );
    const positional = args.map((v) => (v.startsWith("$") ? "" : v));
    if (fn === "RelIndex") {
      positional.shift();
      args.shift();
    }
    const keys =
      fn === "UpdateLayoutConfig"
        ? ["c4ShapeInRow", "c4BoundaryInRow"]
        : fn === "UpdateElementStyle"
          ? [
              "id",
              "bgColor",
              "fontColor",
              "borderColor",
              "shadowing",
              "shape",
              "sprite",
              "techn",
              "legendText",
              "legendSprite",
            ]
          : fn === "UpdateRelStyle"
            ? ["from", "to", "textColor", "lineColor", "offsetX", "offsetY"]
            : /^(?:(?:Bi)?Rel|RelIndex)/.test(fn)
              ? ["from", "to", "label", "techn", "descr", "sprite", "tags", "link"]
              : /^(Enterprise|System|Container)_Boundary$/.test(fn)
                ? ["id", "label", "tags", "link"]
                : /^(Deployment_Node|Node)/.test(fn)
                  ? ["id", "label", "type", "descr", "sprite", "tags", "link"]
                  : fn === "Boundary"
                    ? ["id", "label", "type", "tags", "link"]
                    : /^(Container|Component)/.test(fn)
                      ? ["id", "label", "techn", "descr", "sprite", "tags", "link"]
                      : ["id", "label", "descr", "sprite", "tags", "link"];
    for (const [i, key] of keys.entries())
      if (params[key] === undefined && positional[i] !== undefined) params[key] = positional[i];
    if (fn === "UpdateLayoutConfig") {
      data.layout = { ...data.layout, ...params };
      continue;
    }
    if (fn === "UpdateElementStyle") {
      const n = [...ir.nodes, ...ir.clusters].find((n) => n.id === args[0]);
      if (!n) fail(sourceLine, "Unknown C4 styled element");
      if (data.nodes[args[0]]) {
        Object.assign(data.nodes[args[0]].fields, params);
        if (params.techn !== undefined) data.nodes[args[0]].fields.technology = params.techn;
        if (params.descr !== undefined) data.nodes[args[0]].fields.description = params.descr;
        const node = ir.nodes.find((node) => node.id === args[0])!;
        node.metadata = { ...node.metadata, ...params };
      } else
        Object.assign(
          (ir.data!.boundaries as Record<string, Record<string, unknown>>)[args[0]],
          params,
        );
      n.style = {
        ...n.style,
        ...(params.fontColor ? { color: params.fontColor } : {}),
        ...(params.bgColor ? { fill: params.bgColor } : {}),
        ...(params.borderColor ? { stroke: params.borderColor } : {}),
      };
      continue;
    }
    if (fn === "UpdateRelStyle") {
      for (const key of ["offsetX", "offsetY"])
        if (params[key] !== undefined && !Number.isFinite(Number(params[key])))
          fail(sourceLine, "Invalid C4 relationship offset");
      const e = ir.edges.find((e) => e.from === args[0] && e.to === args[1]);
      if (!e) fail(sourceLine, "Unknown C4 styled relationship");
      e.style = {
        ...e.style,
        ...(params.lineColor ? { stroke: params.lineColor } : {}),
        ...(params.textColor ? { color: params.textColor } : {}),
      };
      ir.events.push({
        type: "relationOffset",
        label: "",
        from: args[0],
        to: args[1],
        values: [Number(params.offsetX ?? 0), Number(params.offsetY ?? 0)],
      });
      continue;
    }
    if (/^(?:(?:Bi)?Rel(?:_(?:Back|U|Up|D|Down|L|Left|R|Right))?|RelIndex)$/.test(fn)) {
      if (args.length < 3) fail(sourceLine, "C4 relation needs endpoints and label");
      const reverse = fn === "Rel_Back";
      const existing = ir.edges.find((edge) => edge.from === args[0] && edge.to === args[1]);
      const edge: Edge = {
        from: args[0],
        to: args[1],
        label: [
          data.c4Type === "C4Dynamic" ? `${ir.edges.length + 1}: ${args[2]}` : args[2],
          (params.techn ?? positional[3]) ? `[${params.techn ?? positional[3]}]` : undefined,
        ]
          .filter(Boolean)
          .join("\n"),
        metadata: { ...params, relationship: fn, description: params.descr ?? "" },
        start: fn === "BiRel" || reverse ? "arrow" : "none",
        end: reverse ? "none" : "arrow",
      };
      if (existing) Object.assign(existing, edge);
      else ir.edges.push(edge);
      continue;
    }
    if (
      /^(?:Enterprise_Boundary|System_Boundary|Container_Boundary|Boundary|Deployment_Node|Deployment_Node_L|Deployment_Node_R|Node|Node_L|Node_R)$/.test(
        fn,
      )
    ) {
      if (args.length < 2) fail(sourceLine, "C4 boundary needs id and label");
      ir.clusters.push({
        id: args[0],
        label: [
          args[1],
          `[${params.type || (fn === "Enterprise_Boundary" ? "ENTERPRISE" : fn === "System_Boundary" ? "SYSTEM" : fn === "Container_Boundary" ? "CONTAINER" : "")}]`,
          /^(Deployment_Node|Node)/.test(fn) ? (params.descr ?? positional[3]) : undefined,
        ]
          .filter((value) => value && value !== "[]")
          .join("\n"),
        parent: parents.at(-1),
        style: /^(Deployment_Node|Node)/.test(fn) ? {} : undefined,
      });
      ir.data!.boundaries ??= Object.create(null) as Record<string, unknown>;
      (ir.data!.boundaries as Record<string, unknown>)[args[0]] = {
        type: fn,
        ...params,
        description: params.descr ?? "",
      };
      if (boundary) parents.push(args[0]);
      continue;
    }
    if (
      !/^(?:Person|System|SystemDb|SystemQueue|Container|ContainerDb|ContainerQueue|Component|ComponentDb|ComponentQueue)(?:_Ext)?$/.test(
        fn,
      )
    )
      fail(sourceLine, `Unknown C4 function ${fn}`);
    if (args.length < 2 || boundary) fail(sourceLine, "Invalid C4 element");
    const technological = /^(Container|Component)/.test(fn);
    const node = addNode(
      ir,
      args[0],
      args[1],
      /Db/.test(fn) ? "cylinder" : "round",
      parents.at(-1),
    );
    const attributeStart = technological ? 4 : 3;
    const attributes = {
      sprite: positional[attributeStart] ?? "",
      tags: positional[attributeStart + 1] ?? "",
      link: positional[attributeStart + 2] ?? "",
      ...params,
    };
    node.metadata = { ...attributes, type: fn };
    data.nodes[args[0]] = {
      type: fn,
      fields: Object.assign(Object.create(null) as Record<string, string>, {
        technology: technological ? (params.techn ?? positional[2] ?? "") : "",
        description: params.descr ?? positional[technological ? 3 : 2] ?? "",
        ...attributes,
      }),
    };
  }
  if (accessibilityBlock) fail(1, "Unclosed accessibility description");
  if (parents.length) fail(1, "Unclosed C4 boundary");
  for (const edge of ir.edges)
    if (!data.nodes[edge.from] || !data.nodes[edge.to]) fail(1, "Unknown C4 relationship endpoint");
  return { kind: "c4", ir };
}
export function parseExtendedUml(source: string): ParsedDiagram | undefined {
  try {
    const front = readFrontMatter(source),
      normalized = clean(source),
      keyword = normalized.trim().split(/[\s;]/)[0];
    let parsed: ParsedDiagram | undefined;
    if (keyword === "requirementDiagram") parsed = requirement(normalized);
    else if (/^C4(Context|Container|Component|Dynamic|Deployment)$/.test(keyword))
      parsed = c4(normalized);
    else return parseUsecase(source) ?? parseZenuml(source);
    if (parsed.kind !== "error" && parsed.kind !== "unsupported") {
      parsed.ir.title ??= front.title;
      if (parsed.ir.title === undefined) delete parsed.ir.title;
      parsed.ir.data ??= {};
      if (front.config) parsed.ir.data.config = front.config;
      if (parsed.kind === "c4") {
        const config = front.config?.c4;
        if (config && typeof config === "object") {
          const fields = Object.fromEntries(
            Object.entries(config)
              .filter(
                ([key, value]) =>
                  ["c4ShapeInRow", "c4BoundaryInRow"].includes(key) &&
                  typeof value === "number" &&
                  Number.isFinite(value),
              )
              .map(([key, value]) => [key, String(value)]),
          );
          const data = parsed.ir.data.uml as UmlData;
          data.layout = { ...fields, ...data.layout };
        }
      }
    }
    return parsed;
  } catch (error) {
    if (error instanceof ParseFailure) return { kind: "error", error: error.detail };
    throw error;
  }
}
