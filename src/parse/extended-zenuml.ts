import type { ParsedDiagram, Event } from "../types.ts";
import { readDiagramMetadata as readFrontMatter } from "./metadata.ts";
import { emptyIR, fail, label } from "./common.ts";

/** ZenUML is parsed as a sequence of messages and nested scopes, never executed. */
export function parseZenuml(source: string): ParsedDiagram | undefined {
  const frontMatter = readFrontMatter(source);
  const cleaned = frontMatter.source
    .replace(/%%\{[\s\S]*?\}%%/g, (match) => match.replace(/[^\n]/g, " "))
    .replace(/^[ \t]*%%[^\n]*/gm, (match) => match.replace(/[^\n]/g, " "));
  const header = /^\s*zenuml\b/i.exec(cleaned);
  if (!header) return undefined;
  const ir = emptyIR();
  if (frontMatter.title !== undefined) ir.title = frontMatter.title;
  const participants = new Map<string, number>();
  const scopes: { kind: "call" | "fragment" | "group"; from: string; to: string; depth: number }[] =
    [];
  let annotation = "";
  let inBody = false;
  let comments: string[] = [];
  let pendingRole: string | undefined, pendingStereotype: string | undefined;
  const namePattern = String.raw`(?:"(?:[^"\r\n]|"")*"|[\p{L}\p{N}_$]+)`;
  const endpointPattern = String.raw`(?:(?:\[[^\]]+\]|:\w+:)\s*)?${namePattern}`;
  const endpointEmojis = new Map<string, string>();
  const nameValue = (value: string) => {
    const emoji = /^(\[[^\]]+\]|:\w+:)\s*([\s\S]*)$/.exec(value);
    const id = label(emoji?.[2] ?? value).replace(/""/g, '"');
    if (emoji) endpointEmojis.set(id, emoji[1].replace(/^\[|\]$/g, ""));
    return id;
  };
  const declaration = new RegExp(
    `^(?:@(\\w+)\\s*)?(?:<<([^>]*)>>\\s*)?(?:(\\[[^\\]]+\\]|:\\w+:)\\s*)?(${namePattern})(?:\\s+(\\d+))?(?:\\s+as(?:\\s+(${namePattern}))?)?(?:\\s*(#[\\da-fA-F]+))?$`,
    "u",
  );
  const addParticipant = (id: string, alias = id, role?: string) => {
    if (!id) return;
    const group = [...scopes].reverse().find((scope) => scope.kind === "group");
    if (participants.has(id)) {
      const node = ir.nodes[participants.get(id)!];
      if (alias !== id) node.label = label(alias);
      if (role) {
        node.annotation = role;
        node.shape = role === "Database" ? "cylinder" : "round";
      }
      if (group) node.parent = group.to;
      if (endpointEmojis.has(id))
        node.metadata = { ...node.metadata, emoji: endpointEmojis.get(id) };
      return;
    }
    participants.set(id, ir.nodes.length);
    ir.nodes.push({
      id,
      label: label(alias),
      shape: role === "Database" ? "cylinder" : "round",
      ...(role ? { annotation: role } : {}),
      ...(group ? { parent: group.to } : {}),
      ...(endpointEmojis.has(id) ? { metadata: { emoji: endpointEmojis.get(id) } } : {}),
    });
    if (ir.nodes.length > 300) fail(1, "ZenUML exceeds 300 participants");
  };
  const emit = (event: Event) => {
    if (event.type !== "note") inBody = true;
    ir.events.push(event);
    if (ir.events.length > 600) fail(1, "ZenUML exceeds 600 events");
  };
  const caller = () =>
    [...scopes].reverse().find((scope) => scope.kind === "call")?.to ??
    (ir.data?.starter as string | undefined) ??
    "";
  const statements = scanStatements(cleaned.slice(header[0].length), header[0].split("\n").length);
  ir.data = {
    dialect: "zenuml",
    ...(frontMatter.config ? { config: frontMatter.config } : {}),
    statements: statements.map((entry) => ({ ...entry })),
  };
  for (let index = 0; index < statements.length; index++) {
    let statement = statements[index].text.trim();
    statement = statement.replace(/^(?:(?:const|readonly|static|await)\s+)+/, "");
    const line = statements[index].line;
    if (
      statement === "}" &&
      /^(else(?:\s+if)?|catch|finally)\b.*\{$/s.test(statements[index + 1]?.text ?? "")
    ) {
      statement += " " + statements[++index].text;
    }
    if (!statement || statement.startsWith("%%")) continue;
    if (statement.startsWith("//")) {
      comments.push(statement.slice(2).trim());
      continue;
    }
    // Closing a call restores its caller; closing a branch keeps the outer scope.
    while (statement.startsWith("}")) {
      const scope = scopes.pop();
      if (!scope) fail(line, "Unmatched ZenUML closing brace");
      const continuation = /^(else(?:\s+if)?|catch|finally)\b(.*?)\{$/.exec(
        statement.slice(1).trim(),
      );
      if (scope.kind === "fragment" && continuation) {
        emit({
          type: "fragmentBranch",
          label: `${continuation[1]}${continuation[2]}`.trim(),
          depth: scope.depth,
        });
        scopes.push(scope);
        statement = "";
        break;
      }
      if (scope.kind !== "group")
        emit({
          type: scope.kind === "call" ? "callEnd" : "fragmentEnd",
          label: "",
          from: scope.from,
          to: scope.to,
          depth: scope.depth,
        });
      statement = statement.slice(1).trim();
    }
    if (!statement) continue;
    if (/^title\s+/.test(statement)) {
      if (frontMatter.title === undefined) ir.title = statement.slice(6).trim();
      continue;
    }
    if (/^@(startuml|enduml|startzenuml|endzenuml)$/.test(statement) || /^!theme\b/.test(statement))
      continue;
    const starter = new RegExp(`^@(?:Starter|starter)(?:\\((${namePattern})?\\))?$`, "u").exec(
      statement,
    );
    if (starter) {
      ir.data.starter = starter[1] ? nameValue(starter[1]) : "";
      if (starter[1]) addParticipant(nameValue(starter[1]));
      continue;
    }
    const group = new RegExp(`^group(?:\\s+(${namePattern}))?\\s*(\\{)?$`, "u").exec(statement);
    if (group) {
      const id = `zen-group-${ir.clusters.length}`;
      const outer = [...scopes].reverse().find((scope) => scope.kind === "group");
      ir.clusters.push({
        id,
        label: group[1] ? nameValue(group[1]) : "",
        ...(outer ? { parent: outer.to } : {}),
      });
      if (ir.clusters.length > 300) fail(line, "ZenUML exceeds 300 participant groups");
      if (group[2]) scopes.push({ kind: "group", from: "", to: id, depth: scopes.length });
      continue;
    }
    if (/^=+/.test(statement)) {
      emit({
        type: "divider",
        label: statement.replace(/^=+|=+$/g, "").trim(),
        depth: scopes.length,
      });
      continue;
    }
    const inlineReply = /^@(return|reply)\s+(.+)$/is.exec(statement);
    if (inlineReply) {
      annotation = inlineReply[1];
      statement = inlineReply[2];
    }
    if (/^@(return|reply)$/i.test(statement)) {
      annotation = statement.slice(1).toLowerCase();
      continue;
    }
    const onlyAnnotation = /^@(\w+)$/.exec(statement);
    if (onlyAnnotation) {
      pendingRole = onlyAnnotation[1];
      continue;
    }
    const onlyStereotype = /^<<([^>]*)(?:>>|>)?$/.exec(statement);
    if (onlyStereotype) {
      pendingStereotype = onlyStereotype[1];
      continue;
    }
    const participant = declaration.exec(statement);
    if (
      participant &&
      (!inBody ||
        participant[1] ||
        participant[2] ||
        participant[3] ||
        participant[5] ||
        participant[6] ||
        participant[7]) &&
      ![
        "opt",
        "par",
        "try",
        "catch",
        "finally",
        "else",
        "critical",
        "section",
        "frame",
        "if",
        "while",
        "loop",
        "for",
        "foreach",
        "forEach",
        "group",
        "return",
      ].includes(participant[4])
    ) {
      const id = nameValue(participant[4]);
      addParticipant(
        id,
        participant[6] ? nameValue(participant[6]) : id,
        participant[1] ?? pendingRole,
      );
      const node = ir.nodes[participants.get(id)!];
      node.metadata = {
        ...node.metadata,
        ...((participant[2] ?? pendingStereotype)
          ? { stereotype: participant[2] ?? pendingStereotype }
          : {}),
        ...(participant[3] ? { emoji: participant[3].replace(/^\[|\]$/g, "") } : {}),
        ...(participant[5] ? { width: Number(participant[5]) } : {}),
      };
      if (participant[7]) node.style = { fill: participant[7] };
      pendingRole = undefined;
      pendingStereotype = undefined;
      comments = [];
      continue;
    }
    const opens = statement.endsWith("{");
    if (opens) statement = statement.slice(0, -1).trim();
    const fragment =
      /^(while|for|forEach|loop|if|else(?:\s+if)?|opt|par|try|catch|finally|critical|section|frame|foreach)\b\s*([\s\S]*)$/.exec(
        statement,
      );
    if (fragment || (opens && !statement)) {
      const depth = scopes.length;
      emit({
        type: "fragmentStart",
        label: fragment ? [fragment[1], fragment[2]].filter(Boolean).join(" ") : "section",
        depth,
        flags: [fragment?.[1] ?? "section"],
      });
      if (opens) scopes.push({ kind: "fragment", from: "", to: "", depth });
      else emit({ type: "fragmentEnd", label: "", depth });
      comments = [];
      continue;
    }
    const returned = /^return(?:\s+(.*))?$/.exec(statement);
    if (returned) {
      const call = [...scopes].reverse().find((scope) => scope.kind === "call");

      emit({
        type: "reply",
        label: returned[1] ?? "",
        from: call?.to ?? caller(),
        to: call?.from ?? caller(),
        depth: scopes.length,
      });
      comments = [];
      continue;
    }
    const reference = /^ref\(([^)]*)\)$/.exec(statement);
    if (reference) {
      const targets = reference[1]
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      targets.forEach((target) => addParticipant(target));
      emit({
        type: "ref",
        label: targets.join(", "),
        from: targets[0],
        to: targets.at(-1),
        depth: scopes.length,
      });
      continue;
    }
    const assignment = new RegExp(
      `^(?:(${namePattern})\\s+)?(${namePattern}(?:\\s*,\\s*${namePattern})*)\\s*=\\s*([\\s\\S]*)$`,
      "u",
    ).exec(statement);
    const assigned = assignment ? nameValue(assignment[2]) : undefined;
    const body = assignment?.[3] ?? statement;
    const creation = new RegExp(`^new(?:\\s+(${namePattern}))?(\\([\\s\\S]*\\))?$`, "u").exec(body);
    if (creation) {
      const to = creation[1] ? nameValue(creation[1]) : (assigned ?? "new");
      addParticipant(to);
      if (assigned)
        ir.nodes[participants.get(to)!].metadata = {
          ...ir.nodes[participants.get(to)!].metadata,
          assignee: assigned,
          ...(assignment?.[1] ? { assignmentType: nameValue(assignment[1]) } : {}),
        };
      emit({
        type: "create",
        label: `new ${to}${creation[2] ?? ""}`,
        from: caller(),
        to,
        depth: scopes.length,
        ...(opens ? { flags: ["scope"] } : {}),
      });
      if (opens) scopes.push({ kind: "call", from: caller(), to, depth: scopes.length });
      comments = [];
      continue;
    }
    const asynchronous = new RegExp(
      `^(?:(${endpointPattern})\\s*(--?>)\\s*)?(${endpointPattern})\\s*:\\s*([\\s\\S]*)$`,
      "u",
    ).exec(body);
    if (asynchronous) {
      const from = asynchronous[1] ? nameValue(asynchronous[1]) : caller(),
        to = nameValue(asynchronous[3]);
      addParticipant(from);
      addParticipant(to);
      if (comments.length)
        emit({ type: "note", label: comments.join("\n"), from, to, depth: scopes.length });
      emit({
        type: annotation || asynchronous[2] === "-->" ? "reply" : "async",
        label: asynchronous[4],
        from,
        to,
        depth: scopes.length,
      });
      annotation = "";
      comments = [];
      continue;
    }
    const bareArrow = new RegExp(
      `^(${endpointPattern})\\s*(--?>|-)\\s*(${endpointPattern})?$`,
      "u",
    ).exec(body);
    if (bareArrow) {
      const from = nameValue(bareArrow[1]),
        to = bareArrow[3] ? nameValue(bareArrow[3]) : caller();
      addParticipant(from);
      addParticipant(to);
      emit({
        type: bareArrow[2] === "-->" ? "reply" : "async",
        label: "",
        from,
        to,
        depth: scopes.length,
      });
      continue;
    }
    const call = new RegExp(
      `^(?:(${endpointPattern})\\s*->\\s*)?(?:(${endpointPattern})\\.)?((?:${endpointPattern}(?:\\([\\s\\S]*\\))?)(?:\\.(?:${endpointPattern}(?:\\([\\s\\S]*\\))?))*)?$`,
      "u",
    ).exec(body);
    if (call && (call[2] || call[3] || assignment)) {
      const from = call[1] ? nameValue(call[1]) : caller(),
        to = call[2] ? nameValue(call[2]) : caller(),
        depth = scopes.length;
      addParticipant(from);
      addParticipant(to);
      if (comments.length) emit({ type: "note", label: comments.join("\n"), from, to, depth });
      emit({
        type: "call",
        label: call[3] ?? "",
        from,
        to,
        depth,
        ...(opens ? { flags: ["scope"] } : {}),
      });
      if (opens) scopes.push({ kind: "call", from, to, depth });
      else if (assigned)
        emit({
          type: "reply",
          label: assigned,
          from: to,
          to: from,
          depth,
          flags: ["assignment"],
        });
      comments = [];
      continue;
    }
    fail(line, `Unsupported ZenUML statement: ${statement}`);
  }
  if (scopes.length) fail(source.split("\n").length, "Unclosed ZenUML scope");
  const isMessage = (event: Event) =>
    ["call", "create", "async", "reply", "note"].includes(event.type);
  if (
    !ir.nodes.length ||
    ir.events.some((event) => isMessage(event) && (event.from === "" || event.to === ""))
  ) {
    ir.nodes.unshift({
      id: "_STARTER_",
      label: "",
      shape: "rect",
      annotation: "Actor",
      metadata: { implicitStarter: true },
    });
    for (const event of ir.events) {
      if (!isMessage(event)) continue;
      if (event.from === "") event.from = "_STARTER_";
      if (event.to === "") event.to = "_STARTER_";
    }
  }
  ir.data.numbering = numberEvents(ir.events);
  return { kind: "zenuml", ir };
}

interface ZenStatement {
  text: string;
  line: number;
}
/** Balanced tokenization keeps quoted text and nested arguments intact. */
function scanStatements(source: string, initialLine: number): ZenStatement[] {
  source = source
    .replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, " "))
    .replace(/^(?:[ \t]*#[ \t]|')[^\n]*/gm, (match) => match.replace(/[^\n]/g, " "));
  const statements: ZenStatement[] = [];
  const endpoint = String.raw`(?:(?:\[[^\]]+\]|:\w+:)\s*)?(?:"(?:[^"]|"")*"|[\p{L}\p{N}_$]+)`;
  const asynchronousPrefix = new RegExp(`^\\s*(?:${endpoint}\\s*--?>\\s*)?${endpoint}\\s*:`, "u");
  let buffer = "",
    line = initialLine,
    startLine = line;
  let quote = "",
    escaped = false,
    parentheses = 0,
    brackets = 0;
  const flush = () => {
    if (buffer.trim()) statements.push({ text: buffer.trim(), line: startLine });
    buffer = "";
    startLine = line;
  };
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (quote) {
      // Official USTRING stops at a line ending, allowing an in-progress name.
      if (quote === '"' && char === "\n" && !parentheses && !brackets) {
        buffer += '"';
        quote = "";
        flush();
        line++;
        startLine = line;
        continue;
      }
      buffer += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      if (char === "\n") line++;
      continue;
    }
    const dividerLabel = /^\s*==/.test(buffer);
    const asyncLabel = asynchronousPrefix.test(buffer);
    if (!asyncLabel && !dividerLabel && (char === '"' || char === "'")) {
      quote = char;
      buffer += char;
      continue;
    }
    if (!asyncLabel && !dividerLabel && char === "/" && source[index + 1] === "/") {
      flush();
      const end = source.indexOf("\n", index);
      const stop = end < 0 ? source.length : end;
      statements.push({ text: source.slice(index, stop), line });
      index = stop - 1;
      continue;
    }
    if (!asyncLabel && !dividerLabel && char === "(") parentheses++;
    if (!asyncLabel && !dividerLabel && char === ")" && --parentheses < 0)
      fail(line, "Unmatched ZenUML closing parenthesis");
    if (!asyncLabel && !dividerLabel && char === "[") brackets++;
    if (!asyncLabel && !dividerLabel && char === "]" && --brackets < 0)
      fail(line, "Unmatched ZenUML closing bracket");
    const topLevel = parentheses === 0 && brackets === 0;
    if (char === "\n") {
      if (topLevel) flush();
      else buffer += char;
      line++;
      if (!buffer) startLine = line;
    } else if (char === ";" && topLevel && !dividerLabel) flush();
    else if (char === "{" && topLevel && !dividerLabel) {
      buffer += char;
      flush();
    } else if (char === "}" && topLevel && !dividerLabel) {
      flush();
      statements.push({ text: char, line });
    } else {
      if (!buffer.trim() && !/\s/.test(char)) startLine = line;
      buffer += char;
    }
  }
  if (quote === '"' && !parentheses && !brackets) {
    buffer += '"';
    quote = "";
  }
  if (quote) fail(line, "Unclosed ZenUML quoted string");
  if (parentheses || brackets) fail(line, "Unclosed ZenUML arguments");
  flush();
  return statements;
}

/** Official ZenUML numbers messages and fragments in their lexical scope. */
function numberEvents(events: Event[]): string[] {
  const scopes = [{ prefix: "", counter: 0 }];
  const numbers: string[] = [];
  for (const event of events) {
    if (event.type === "callEnd" || event.type === "fragmentEnd") {
      scopes.pop();
      numbers.push("");
      continue;
    }
    if (event.type === "note" || event.type === "fragmentBranch") {
      numbers.push("");
      continue;
    }
    if (event.flags?.includes("assignment")) {
      numbers.push(`${numbers.at(-1)}.1`);
      continue;
    }
    const scope = scopes.at(-1)!;
    const number = [scope.prefix, String(++scope.counter)].filter(Boolean).join(".");
    numbers.push(event.type === "divider" ? "" : number);
    if (
      event.type === "fragmentStart" ||
      ((event.type === "call" || event.type === "create") && event.flags?.includes("scope"))
    )
      scopes.push({ prefix: number, counter: 0 });
  }
  return numbers;
}
