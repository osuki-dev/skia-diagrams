import type { DiagramIR, DiagramKind, Marker } from "../types.ts";
import { addNode as insertNode, fail, label, parseStyle, stripComment } from "./common.ts";
/** Native class, state and ER grammar. Notes, interactions, styles and grouping
 * stay declarative; callbacks and links are dispatched only by the host. */
export function parseGraph(
  ir: DiagramIR,
  kind: DiagramKind,
  lines: { text: string; line: number }[],
): void {
  const stack: string[] = [];
  const blockKinds: string[] = [];
  const regions = new Map<string, number>();
  const terminals = new Map<string, string>();
  const terminalId = (role: "start" | "end") => {
    const parent = stack.at(-1);
    const scope = JSON.stringify([parent ?? null, parent ? (regions.get(parent) ?? 0) : 0, role]);
    const existing = terminals.get(scope);
    if (existing) return existing;
    let suffix = terminals.size;
    let id = `${role}-${suffix}`;
    while (
      ir.nodes.some((node) => node.id === id) ||
      ir.clusters.some((cluster) => cluster.id === id)
    )
      id = `${role}-${++suffix}`;
    terminals.set(scope, id);
    return id;
  };
  const genericLabel = (text: string) =>
    label(text)
      .replace(/~(?=[\p{L}\p{N}_])/gu, "<")
      .replace(/~/g, ">");
  const addNode = (...args: Parameters<typeof insertNode>) => {
    const parent = args[4] ?? (kind === "state" ? stack.at(-1) : undefined);
    if (parent !== undefined) args[4] = parent;
    const node = insertNode(...args);
    const region = parent ? regions.get(parent) : undefined;
    if (region !== undefined) node.metadata = { ...node.metadata, stateRegion: region };
    return node;
  };
  const definitions = new Map<string, ReturnType<typeof parseStyle>>();
  const memberships = new Map<string, string[]>();
  const assignClasses = (id: string, names: string) =>
    memberships.set(id, [...(memberships.get(id) ?? []), ...names.split(",")]);
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].line;
    let text = stripComment(lines[index].text).replace(/;$/, "").trim();
    if (!text) continue;
    text = text.replace(/([\w-]+):::(\w+)/g, (_, id: string, name: string) => {
      assignClasses(id, name);
      return id;
    });
    const accessible = /^acc(Title|Descr)\s*:\s*(.*)$/i.exec(text);
    if (accessible) {
      if (accessible[1].toLowerCase() === "title") ir.title = label(accessible[2]);
      else ir.description = label(accessible[2]);
      continue;
    }
    const classDef = /^classDef\s+(\w+)\s+(.+)$/.exec(text);
    if (classDef) {
      definitions.set(classDef[1], parseStyle(classDef[2]));
      continue;
    }
    const style = /^style\s+([^\s]+)\s+(.+)$/.exec(text);
    if (style) {
      for (const id of style[1].split(",")) {
        const target = ir.clusters.find((c) => c.id === id) ?? addNode(ir, id);
        target.style = { ...target.style, ...parseStyle(style[2]) };
      }
      continue;
    }
    const classAssignment = /^class\s+([\w,-]+(?:\s*,\s*[\w-]+)*)\s+(\w+)$/.exec(text);
    if (classAssignment) {
      for (const id of classAssignment[1].replace(/\s/g, "").split(","))
        assignClasses(id, classAssignment[2]);
      continue;
    }
    const noteClass = /^note(?:\s+for\s+([^\s]+))?\s+"([\s\S]*)"$/.exec(text);
    if (kind === "class" && noteClass) {
      ir.events.push({ type: "class-note", from: noteClass[1], label: label(noteClass[2]) });
      continue;
    }
    const interaction =
      /^(link|callback|click)\s+([\w-]+)\s+(?:(href|call)\s+)?(?:"([^"]+)"|([^\s]+))(?:\s+"([^"]*)")?$/.exec(
        text,
      );
    if (interaction) {
      addNode(ir, interaction[2]).interaction = {
        kind: interaction[1] === "callback" || interaction[3] === "call" ? "callback" : "link",
        target: interaction[4] ?? interaction[5],
        tooltip: label(interaction[6] ?? ""),
      };
      ir.events.push({
        type: "interaction",
        from: interaction[2],
        to: interaction[4] ?? interaction[5],
        label: label(interaction[6] ?? ""),
        flags: [interaction[1] === "callback" || interaction[3] === "call" ? "callback" : "link"],
      });
      continue;
    }
    const namespace = /^namespace\s+([\w.]+)(?:\["?([^\]"]+)"?\])?\s*\{$/.exec(text);
    const subgraph = /^subgraph\s+(?:([\w-]+)\s*\[([^\]]+)\]|(.+))$/.exec(text);
    if ((kind === "class" && namespace) || (kind === "er" && subgraph)) {
      let id = namespace?.[1] ?? subgraph?.[1] ?? label(subgraph![3]);
      const classConfig = (
        ir.data?.config as { class?: { hierarchicalNamespaces?: boolean } } | undefined
      )?.class;
      if (namespace && classConfig?.hierarchicalNamespaces !== false) {
        let parent = stack.at(-1);
        for (const [index, part] of id.split(".").entries()) {
          const namespaceId = parent ? `${parent}.${part}` : part;
          if (!ir.clusters.some((cluster) => cluster.id === namespaceId))
            ir.clusters.push({
              id: namespaceId,
              label: label(index === id.split(".").length - 1 ? (namespace[2] ?? part) : part),
              parent,
            });
          parent = namespaceId;
        }
        id = parent!;
      } else
        ir.clusters.push({
          id,
          label: label(namespace?.[2] ?? subgraph?.[2] ?? id),
          parent: stack.at(-1),
        });
      stack.push(id);
      blockKinds.push("cluster");
      continue;
    }
    if (kind === "er" && text === "end") {
      if (blockKinds.pop() !== "cluster") fail(line, "Unmatched subgraph end");
      stack.pop();
      continue;
    }
    if (kind === "state" && text === "--") {
      const parent = stack.at(-1);
      if (!parent) fail(line, "A concurrent region requires a composite state");
      const previous = regions.get(parent) ?? 0;
      if (!regions.has(parent))
        for (const node of ir.nodes)
          if (node.parent === parent) node.metadata = { ...node.metadata, stateRegion: 0 };
      regions.set(parent, previous + 1);
      ir.events.push({ type: "state-region", from: parent, label: "", value: previous + 1 });
      continue;
    }
    const annotation = /^(?:class\s+([\w-]+)\s+<<([^>]+)>>|<<([^>]+)>>\s+([\w-]+))$/.exec(text);
    if (kind === "class" && annotation) {
      const node = addNode(ir, annotation[1] ?? annotation[4]);
      node.label = `«${annotation[2] ?? annotation[3]}»\n${node.label}`;
      continue;
    }
    if (kind === "class")
      text = text.replace(/`([^`]+)`/g, (_, value: string) => {
        const id = `quoted-${Array.from(value)
          .map((c) => c.codePointAt(0)!.toString(16))
          .join("-")}`;
        addNode(ir, id, value);
        return id;
      });
    if (kind === "state") {
      const note = /^note\s+(left|right)\s+of\s+([\w-]+)(?:\s*:\s*(.*))?$/i.exec(text);
      if (note) {
        let content = note[3];
        if (content === undefined) {
          const parts: string[] = [];
          while (++index < lines.length && !/^end note$/i.test(lines[index].text))
            parts.push(lines[index].text);
          if (index === lines.length) fail(line, "Unclosed state note");
          content = parts.join("\n");
        }
        ir.events.push({
          type: "state-note",
          from: note[2],
          label: label(content),
          flags: [note[1].toLowerCase()],
        });
        continue;
      }
    }
    if (text === "}") {
      if (!stack.pop()) fail(line, "Unmatched closing brace");
      blockKinds.pop();
      continue;
    }
    const declaration =
      /^(?:class|state)\s+(?:"([^"]+)"\s+as\s+)?([\w-]+)(~[^\s{]+~)?(?:\["?([^\]"]+)"?\])?(?:\s*\{)?$/.exec(
        text,
      );
    if (declaration) {
      addNode(
        ir,
        declaration[2],
        declaration[4] ??
          declaration[1] ??
          genericLabel(`${declaration[2]}${declaration[3] ?? ""}`),
        "rect",
        stack.at(-1),
      );
      if (text.endsWith("{")) {
        if (kind === "state") {
          ir.clusters.push({
            id: declaration[2],
            label: declaration[1] ?? declaration[2],
            parent: stack.at(-1),
          });
          ir.nodes = ir.nodes.filter((n) => n.id !== declaration[2]);
        }
        stack.push(declaration[2]);
        blockKinds.push(kind === "state" ? "cluster" : "node");
      }
      continue;
    }
    const entity = /^([\w-]+)(?:\["?([^\]"]+)"?\])?\s*\{$/.exec(text);
    if (entity && kind === "er") {
      const node = addNode(ir, entity[1], entity[2] ?? entity[1], "rect", stack.at(-1));
      node.metadata = { ...node.metadata, headerLabel: label(entity[2] ?? entity[1]) };
      stack.push(entity[1]);
      blockKinds.push("node");
      continue;
    }
    if (stack.length && blockKinds.at(-1) === "node" && kind !== "state") {
      const node = ir.nodes.find((n) => n.id === stack.at(-1));
      if (node && kind === "er") {
        const attribute =
          /^([\w[\]()?,-]+)\s+([\w-]+)(?:\s+((?:PK|FK|UK)(?:\s*,\s*(?:PK|FK|UK))*))?(?:\s+"([^"\n]*)")?$/.exec(
            text,
          );
        if (!attribute) fail(line, 'ER attribute requires type name [PK,FK,UK] ["comment"]');
        (node.attributes ??= []).push({
          type: attribute[1],
          name: attribute[2],
          key: attribute[3] ?? "",
          comment: attribute[4] ?? "",
        });
      }
      if (node) node.label += `\n${kind === "class" ? genericLabel(text) : label(text)}`;
      continue;
    }
    const member = /^(\w+)\s*:\s*(.+)$/.exec(text);
    if (member && kind === "class") {
      const node = addNode(ir, member[1]);
      node.label += `\n${genericLabel(member[2])}`;
      continue;
    }
    if (kind === "er") {
      const aliases: Record<string, string> = {
        "only one": "||",
        "zero or one": "o|",
        "zero or more": "o{",
        "one or more": "|{",
        "many(0)": "o{",
        "many(1)": "|{",
        "0+": "o{",
        "1+": "|{",
        one: "||",
        "1": "||",
        many: "o{",
      };
      const words =
        /^([\w-]+)\s+(only one|zero or one|zero or more|one or more|many\([01]\)|[01]\+|one|1|many)\s+(optionally to|to)\s+(only one|zero or one|zero or more|one or more|many\([01]\)|[01]\+|one|1|many)\s+([\w-]+)(\s*:\s*.*)?$/i.exec(
          text,
        );
      if (words) {
        const reverse: Record<string, string> = { "o{": "}o", "|{": "}|" };
        const left = aliases[words[2].toLowerCase()];
        text = `${words[1]} ${reverse[left] ?? left}${words[3] === "to" ? "--" : ".."}${aliases[words[4].toLowerCase()]} ${words[5]}${words[6] ?? ""}`;
      }
    }
    const relation =
      /^([\w-]+|\[\*\])(?:\s+"([^"]*)")?\s*(<\|--\|>|<\|--|--\|>|\*--|--\*|o--|--o|<--|<\.\.|\.\.>|<\|\.\.|\.\.\|>|-->|\(\)--|--\(\)|\.\.|--|\|[|o][-.]+[|o]{1,2}|[|o{}]{1,2}[-.]+[|o{}]{1,2})\s*(?:"([^"]*)"\s+)?([\w-]+|\[\*\])(?:\s*:\s*(.*))?$/.exec(
        text,
      );
    if (relation) {
      const [, source, left, token, right, target, caption] = relation;
      const from = source === "[*]" ? terminalId("start") : source;
      const to = target === "[*]" ? terminalId("end") : target;
      if (!ir.clusters.some((c) => c.id === from))
        addNode(
          ir,
          from,
          source === "[*]" ? "" : source,
          source === "[*]" ? "circle" : "rect",
          stack.at(-1),
        );
      if (!ir.clusters.some((c) => c.id === to))
        addNode(
          ir,
          to,
          target === "[*]" ? "" : target,
          target === "[*]" ? "doublecircle" : "rect",
          stack.at(-1),
        );
      if (source === "[*]") ir.nodes.find((n) => n.id === from)!.role = "start";
      if (target === "[*]") ir.nodes.find((n) => n.id === to)!.role = "end";
      const mark = (start: boolean): Marker => {
        const t = start ? token : token.split("").reverse().join("");
        if (kind === "er") {
          const cardinalities = token.split(/[-.]+/);
          const cardinality = cardinalities[start ? 0 : 1];
          const markers: Record<string, Marker> = {
            "||": "er-one",
            "o|": "er-zero-one",
            "|o": "er-zero-one",
            "}|": "er-one-many",
            "|{": "er-one-many",
            "}o": "er-zero-many",
            "o{": "er-zero-many",
            "{o": "er-zero-many",
          };
          if (!markers[cardinality]) fail(line, `Unsupported ER cardinality: ${cardinality}`);
          return markers[cardinality];
        }
        if (t.startsWith("<|") || t.startsWith(">|")) return "hollow-triangle";
        if (t.startsWith("()") || t.startsWith(")(")) return "circle";
        if (t.startsWith("*")) return "diamond";
        if (t.startsWith("o")) return "hollow-diamond";
        if (t.startsWith("<") || t.startsWith(">")) return "arrow";
        return "none";
      };
      ir.edges.push({
        from,
        to,
        start: mark(true),
        end: mark(false),
        label: label([left, caption, right].filter(Boolean).join(" ")),
        dashed: token.includes("."),
      });
      continue;
    }
    const stateLabel = /^(\w+)\s*:\s*(.+)$/.exec(text);
    if (stateLabel && kind === "state") {
      addNode(ir, stateLabel[1], stateLabel[2]);
      continue;
    }
    const special = /^state\s+(\w+)\s+<<(choice|fork|join)>>$/.exec(text);
    if (special) {
      const node = addNode(
        ir,
        special[1],
        "",
        special[2] === "choice" ? "diamond" : "rect",
        stack.at(-1),
      );
      if (special[2] !== "choice") node.role = special[2] as "fork" | "join";
      continue;
    }
    if (/^direction\s+(TB|BT|LR|RL)$/.test(text)) {
      const cluster = ir.clusters.find((c) => c.id === stack.at(-1));
      if (cluster) cluster.direction = text.slice(10);
      else ir.direction = text.slice(10);
      continue;
    }
    if ((kind === "state" || kind === "er") && /^(?:[\w-]+|"[^"]+")$/.test(text)) {
      const id = label(text);
      addNode(ir, id, id, "rect", stack.at(-1));
      continue;
    }
    fail(line, `Unsupported ${kind} statement: ${text}`);
  }
  for (const node of ir.nodes) {
    const styles = [
      definitions.get("default"),
      ...(memberships.get(node.id) ?? []).map((name) => definitions.get(name)),
    ];
    const classes = memberships.get(node.id);
    if (classes) node.classes = classes;
    const resolved = Object.assign({}, ...styles.filter(Boolean));
    if (Object.keys(resolved).length) node.style = { ...resolved, ...node.style };
  }
  if (stack.length) fail(lines.at(-1)?.line ?? 1, "Unclosed block");
  // A forward transition may have introduced a placeholder before a composite declaration.
  ir.nodes = ir.nodes.filter((n) => !ir.clusters.some((c) => c.id === n.id));
  for (const event of ir.events)
    if (
      event.type === "state-note" &&
      ![...ir.nodes, ...ir.clusters].some((n) => n.id === event.from)
    )
      fail(1, "State note references an unknown state");
}
