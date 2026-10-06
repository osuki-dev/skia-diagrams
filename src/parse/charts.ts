import type { DiagramIR, DiagramKind } from "../types.ts";
import { addNode, fail, label } from "./common.ts";
import { parseDate } from "./dates.ts";
/** Native chart grammar. Authored style/configuration metadata is kept in IR data
 * for type-specific layouts; parsing never executes callbacks, icons or CSS. */
export function parseChart(
  ir: DiagramIR,
  kind: DiagramKind,
  lines: { text: string; line: number }[],
): void {
  if (kind === "mindmap") {
    const joined: typeof lines = [];
    for (let index = 0; index < lines.length; index++) {
      const statement = { ...lines[index] };
      const quotes = (text: string) => [...text.matchAll(/(?<!\\)"/g)].length;
      if (quotes(statement.text) % 2) {
        while (quotes(statement.text) % 2 && index + 1 < lines.length)
          statement.text += "\n" + lines[++index].text;
        if (quotes(statement.text) % 2) fail(statement.line, "Unclosed mindmap label");
      }
      joined.push(statement);
    }
    lines = joined;
  }
  let section = "",
    branch = "main",
    previous: string | undefined,
    excludeWeekends = false;
  const config = ir.data?.config as { gitGraph?: { mainBranchName?: string } } | undefined;
  branch = config?.gitGraph?.mainBranchName ?? "main";
  const branches = new Map<string, string | undefined>([[branch, undefined]]);
  const commits = new Map<string, string>();
  const tree: { id: string; indent: number }[] = [];
  const tasks = new Map<string, { start: number; end: number }>();
  const untilTasks: { id: string; dependencies: string[]; line: number; event: number }[] = [];
  const excludedDays = new Set<number>();
  const excludedDates = new Set<string>();
  let weekendStart = 6;
  let lastTaskEnd: number | undefined;
  for (const { text, line } of lines) {
    if (kind === "gantt" && text.startsWith("%")) continue;
    if (/^accTitle\s*:/.test(text)) {
      ir.title = label(text.replace(/^accTitle\s*:\s*/, ""));
      continue;
    }
    if (/^accDescr\s*:/.test(text)) {
      ir.description = label(text.replace(/^accDescr\s*:\s*/, ""));
      continue;
    }
    if (/^(title|accTitle)\s/.test(text)) {
      ir.title = label(text.replace(/^\S+\s+/, ""));
      continue;
    }
    if (/^section\s/.test(text)) {
      section = label(text.slice(8));
      continue;
    }
    if (kind === "pie") {
      const m = /^"((?:\\.|[^"\\])+)"\s*:\s*([\d.]+)$/.exec(text);
      if (!m || !Number.isFinite(Number(m[2])) || Number(m[2]) <= 0)
        fail(line, "Pie requires a positive value");
      ir.events.push({ type: "slice", label: label(m[1]), value: Number(m[2]) });
      continue;
    }
    if (kind === "gitgraph") {
      const command = /^(commit|branch|checkout|switch|merge|cherry-pick)\b(.*)$/.exec(text);
      if (!command) fail(line, "Unsupported gitGraph command");
      const args = command[2].trim();
      if (command[1] === "branch") {
        const name = label(args.match(/^("(?:\\.|[^"\\])*"|\S+)/)?.[0] ?? "");
        if (!name || branches.has(name)) fail(line, "Invalid or duplicate branch");
        ir.data ??= {};
        const declarations = (ir.data.gitBranchDeclarations ??= [branch]) as string[];
        declarations.push(name);
        const starts = (ir.data.gitBranchStarts ??= Object.create(null)) as Record<
          string,
          string | undefined
        >;
        starts[name] = previous;
        const order = /order:\s*(\d+)/.exec(args)?.[1];
        if (order) {
          ir.data ??= {};
          const branchOptions = (ir.data.gitBranches ??= Object.create(null)) as Record<
            string,
            { order: number }
          >;
          branchOptions[name] = { order: Number(order) };
        }
        branches.set(name, previous);
        branch = name;
        continue;
      }
      if (command[1] === "checkout" || command[1] === "switch") {
        const name = label(args);
        if (!branches.has(name)) fail(line, "Unknown branch");
        branch = name;
        previous = branches.get(branch);
        continue;
      }
      const authoredId = /id:\s*"([^"]+)"/.exec(args)?.[1];
      const cherryPick = command[1] === "cherry-pick";
      const pickedId = authoredId ? (commits.get(authoredId) ?? authoredId) : undefined;
      if (cherryPick && (!authoredId || !ir.nodes.some((node) => node.id === pickedId)))
        fail(line, "Unknown cherry-pick commit");
      let id = cherryPick
        ? `cherry-pick-${ir.nodes.length}`
        : (authoredId ?? `commit-${ir.nodes.length}`);
      const duplicate = ir.nodes.some((node) => node.id === id);
      if (duplicate) {
        const base = `commit-${ir.nodes.length}`;
        id = base;
        let suffix = 1;
        while (ir.nodes.some((node) => node.id === id)) id = `${base}-${suffix++}`;
      }
      const node = addNode(ir, id, authoredId ?? id, "circle", branch);
      const message = /msg:\s*"([^"]*)"/.exec(args)?.[1];
      const tags = [...args.matchAll(/tag:\s*"([^"]+)"/g)].map((match) => match[1]);
      if (duplicate || message !== undefined || tags.length)
        node.metadata = {
          ...node.metadata,
          ...(duplicate ? { authoredId } : {}),
          ...(message !== undefined ? { message } : {}),
          ...(tags.length ? { tags } : {}),
        };
      if (authoredId && !cherryPick) commits.set(authoredId, id);
      const commitType = /type:\s*(NORMAL|REVERSE|HIGHLIGHT)/.exec(args)?.[1];
      ir.events.push({
        type: "commit",
        label: id,
        from: branch,
        ...(cherryPick ? { to: pickedId } : {}),
        ...(commitType ? { flags: [commitType] } : {}),
      });
      if (previous)
        ir.edges.push({ from: previous, to: id, label: "", start: "none", end: "none" });
      if (command[1] === "merge") {
        const mergeBranch = label(args.match(/^("(?:\\.|[^"\\])*"|\S+)/)?.[0] ?? "");
        const target = branches.get(mergeBranch);
        if (!target || mergeBranch === branch) fail(line, "Invalid merge branch");
        ir.edges.push({ from: target, to: id, label: "merge", start: "none", end: "none" });
      }
      branches.set(branch, id);
      previous = id;
      continue;
    }
    if (kind === "mindmap") {
      const indent = /^\s*/.exec(text)?.[0].length ?? 0;
      const content = text.trim();
      if (content.startsWith("::icon(") || content.startsWith(":::")) {
        const node = ir.nodes.at(-1);
        if (!node) fail(line, "Mindmap annotation requires a node");
        ir.data ??= {};
        const annotations = (ir.data.mindmapAnnotations ??= {}) as Record<string, string[]>;
        (annotations[node.id] ??= []).push(content);
        continue;
      }
      const id = `node-${ir.nodes.length}`;
      while (tree.length && tree.at(-1)!.indent >= indent) tree.pop();
      const m = /^(?:[\w-]+)?(\(\(|\(|\[|\{\{|\)|>)([\s\S]*?)(\)\)|\)|\]|\}\}|\()$/.exec(content);
      addNode(
        ir,
        id,
        m?.[2] ?? content,
        m?.[1] === "(("
          ? "circle"
          : m?.[1] === "{{"
            ? "hexagon"
            : m?.[1] === "("
              ? "round"
              : "rect",
      );
      if (tree.length)
        ir.edges.push({ from: tree.at(-1)!.id, to: id, label: "", start: "none", end: "none" });
      tree.push({ id, indent });
      continue;
    }
    if (kind === "timeline") {
      if (text.startsWith(":")) {
        const period = ir.events.at(-1);
        if (!period || period.type !== "period")
          fail(line, "Timeline continuation requires a period");
        period.label += "\n" + text.slice(1).split(":").map(label).filter(Boolean).join("\n");
        continue;
      }
      const m = /^([^:]+)\s*:\s*(.+)$/.exec(text);
      if (!m) fail(line, "Timeline requires period : event");
      ir.events.push({
        type: "period",
        label: [label(m[1]), ...m[2].split(":").map(label)].filter(Boolean).join("\n"),
        section,
      });
      continue;
    }
    if (kind === "journey") {
      const m = /^([^:]+)\s*:\s*([1-5])\s*:\s*(.+)$/.exec(text);
      if (!m) fail(line, "Journey requires task : score 1-5 : actors");
      ir.events.push({
        type: "step",
        label: label(m[1]),
        actors: m[3].split(",").map(label),
        section,
        value: Number(m[2]),
      });
      continue;
    }
    if (kind === "quadrant") {
      if (/^(x-axis|y-axis|quadrant-[1-4])\s/.test(text)) {
        ir.events.push({ type: "axis-label", label: text });
        continue;
      }
      if (text.startsWith("classDef ")) {
        const definition = /^classDef\s+([\w-]+)\s+(.+)$/.exec(text);
        if (!definition) fail(line, "Invalid quadrant class definition");
        ir.data ??= {};
        const classes = (ir.data.quadrantClasses ??= {}) as Record<string, Record<string, string>>;
        classes[definition[1]] = quadrantStyle(definition[2], line);
        continue;
      }
      const m = /^(.+?)\s*:\s*\[([\d.]+),\s*([\d.]+)\](?:\s+(.+))?$/.exec(text);
      if (!m || [Number(m[2]), Number(m[3])].some((v) => !Number.isFinite(v) || v < 0 || v > 1))
        fail(line, "Quadrant point must be in [0, 1]");
      const [pointLabel, className] = m[1].split(":::");
      if (className || m[4]) {
        ir.data ??= {};
        const styles = (ir.data.quadrantPoints ??= {}) as Record<
          number,
          { className?: string; style: Record<string, string> }
        >;
        styles[ir.events.length] = {
          ...(className ? { className } : {}),
          style: m[4] ? quadrantStyle(m[4], line) : {},
        };
      }
      ir.events.push({
        type: "point",
        label: label(pointLabel),
        values: [Number(m[2]), Number(m[3])],
      });
      continue;
    }
    if (kind === "xychart") {
      const axis = /^([xy])-axis(?:\s+"([^"]*)")?\s+(.+)$/.exec(text);
      if (axis) {
        if (axis[1] === "x") {
          const categories = /^\[(.*)\]$/.exec(axis[3]);
          if (categories) {
            ir.axis = {
              ...(ir.axis ?? { min: 0, max: 100 }),
              labels: categories[1].split(",").map(label),
              xTitle: axis[2],
            };
            continue;
          }
        }
        const range = /^(-?[\d.]+)\s*-->\s*(-?[\d.]+)$/.exec(axis[3]);
        if (
          !range ||
          !Number.isFinite(Number(range[1])) ||
          !Number.isFinite(Number(range[2])) ||
          Number(range[2]) <= Number(range[1])
        )
          fail(line, "Invalid axis range");
        ir.axis = {
          ...(ir.axis ?? { labels: [], min: 0, max: 100 }),
          ...(axis[1] === "x"
            ? { xMin: Number(range[1]), xMax: Number(range[2]), xTitle: axis[2] }
            : { min: Number(range[1]), max: Number(range[2]), yTitle: axis[2], explicitY: true }),
        };
        continue;
      }
      const m = /^(bar|line)(?:\s+"((?:\\.|[^"\\])*)")?\s+\[([^\]]+)\]$/.exec(text);
      if (!m) fail(line, "Unsupported XY chart statement");
      const entries = m[3]
        .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
        .map((entry) =>
          /^\s*(-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)(?:\s+"((?:\\.|[^"\\])*)")?\s*$/.exec(
            entry,
          ),
        );
      if (entries.some((entry) => !entry || !Number.isFinite(Number(entry[1]))))
        fail(line, "Invalid series value");
      const values = entries.map((entry) => Number(entry![1]));
      const pointLabels = entries.map((entry) => label(entry![2] ?? ""));
      if (pointLabels.some(Boolean)) {
        ir.data ??= {};
        const labels = (ir.data.xyPointLabels ??= {}) as Record<number, string[]>;
        labels[ir.events.length] = pointLabels;
      }
      ir.events.push({ type: m[1], label: label(m[2] ?? ""), values });
      continue;
    }
    if (kind === "gantt") {
      ir.gantt ??= { dateFormat: "YYYY-MM-DD", axisFormat: "%Y-%m-%d" };
      if (/^dateFormat\s/.test(text)) {
        const format = text.slice(11).trim();
        if (!/^(?:X|x|(?:YYYY|MM|DD|HH|mm|ss|[-/: .])+)$/.test(format))
          fail(line, "Unsupported dateFormat token");
        ir.gantt.dateFormat = format;
        continue;
      }
      if (/^axisFormat\s/.test(text)) {
        ir.gantt.axisFormat = text.slice(11).trim();
        ir.data ??= {};
        const options = (ir.data.ganttOptions ??= {}) as Record<string, string>;
        options.axisFormat = ir.gantt.axisFormat;
        continue;
      }
      if (/^(tickInterval|weekday|todayMarker|weekend)\s/.test(text)) {
        const [key, ...value] = text.split(/\s+/);
        ir.data ??= {};
        const options = (ir.data.ganttOptions ??= {}) as Record<string, string>;
        options[key] = value.join(" ");
        if (key === "weekend") {
          weekendStart = [
            "sunday",
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
          ].indexOf(value[0]);
          if (weekendStart < 0) fail(line, "Invalid weekend start day");
        }
        continue;
      }
      if (/^excludes\s/.test(text)) {
        for (const value of text
          .replace(/^excludes\s+/, "")
          .split(/[, ]+/)
          .filter(Boolean)) {
          if (value === "weekends") {
            excludeWeekends = true;
            continue;
          }
          const day = [
            "sunday",
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
          ].indexOf(value);
          if (day >= 0) excludedDays.add(day);
          else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) excludedDates.add(value);
          else fail(line, "Invalid excluded date or weekday");
        }
        continue;
      }
      const m = /^(.+?)\s*:\s*(.+)$/.exec(text);
      if (!m) fail(line, "Gantt requires task : id, start, duration");
      const fields = m[2]
        .replace(/\s+%.*$/, "")
        .split(",")
        .map((s) => s.trim());
      const flags: string[] = [];
      while (["done", "active", "crit", "milestone", "vert"].includes(fields[0]))
        flags.push(fields.shift()!);
      const id = fields.length >= 3 ? fields.shift()! : `task-${ir.events.length}`;
      if (fields.length === 1) {
        if (lastTaskEnd === undefined) fail(line, "Implicit task start requires a preceding task");
        fields.unshift("__previous__");
      }
      if (tasks.has(id) || fields.length !== 2) fail(line, "Duplicate task or invalid task fields");
      const startText = fields[0];
      let start: number;
      if (startText === "__previous__") start = lastTaskEnd!;
      else if (/^after\s/.test(startText)) {
        const dependencies = startText
          .slice(6)
          .trim()
          .split(/\s+/)
          .map((id) => tasks.get(id));
        if (dependencies.some((task) => !task)) fail(line, "Unknown after dependency");
        start = Math.max(...dependencies.map((task) => task!.end));
      } else {
        start = parseGanttDate(startText, ir.gantt.dateFormat);
        if (!Number.isFinite(start)) fail(line, "Invalid date for dateFormat");
      }
      const duration = /^(\d+(?:\.\d+)?)([smhdw])$/.exec(fields[1] ?? "");
      const until = /^until\s+(.+)$/.exec(fields[1]);
      const durationUnit: Record<string, number> = {
        s: 1000,
        m: 60000,
        h: 3600000,
        d: 86400000,
        w: 604800000,
      };
      if (duration && Number(duration[1]) * durationUnit[duration[2]] > 36500 * 86400000)
        fail(line, "Task duration exceeds 100 years");
      let end = duration
        ? start + Number(duration[1]) * durationUnit[duration[2]]
        : until
          ? start
          : parseGanttDate(fields[1], ir.gantt.dateFormat);
      if (
        duration &&
        ["d", "w"].includes(duration[2]) &&
        (excludeWeekends || excludedDays.size || excludedDates.size)
      ) {
        const days = Number(duration[1]) * (duration[2] === "w" ? 7 : 1);
        if (days > 36500) fail(line, "Task duration exceeds 100 years");
        end = start;
        const allExcludedDays = new Set(excludedDays);
        if (excludeWeekends) {
          allExcludedDays.add(weekendStart);
          allExcludedDays.add((weekendStart + 1) % 7);
        }
        if (allExcludedDays.size === 7) fail(line, "All weekdays are excluded");
        let visited = 0;
        for (let remaining = days; remaining > 0;) {
          if (++visited > 36500 * 7) fail(line, "Excluded days prevent bounded task scheduling");
          end += 86400000;
          const day = new Date(end).getUTCDay();
          const excludedWeekend =
            excludeWeekends && (day === weekendStart || day === (weekendStart + 1) % 7);
          if (
            !excludedWeekend &&
            !excludedDays.has(day) &&
            !excludedDates.has(new Date(end).toISOString().slice(0, 10))
          )
            remaining--;
        }
      }
      if (!Number.isFinite(end) || !Number.isFinite(new Date(end).getTime()) || end < start)
        fail(line, "Invalid task end or duration");
      tasks.set(id, { start, end });
      lastTaskEnd = end;
      if (until)
        untilTasks.push({
          id,
          dependencies: until[1].trim().split(/\s+/),
          line,
          event: ir.events.length,
        });
      ir.events.push({
        type: "task",
        label: label(m[1]),
        section,
        from: id,
        start,
        end,
        flags,
      });
      continue;
    }
    fail(line, `Unsupported ${kind} statement: ${text}`);
  }
  for (const pending of untilTasks) {
    const dependencies = pending.dependencies.map((id) => tasks.get(id));
    if (dependencies.some((task) => !task)) fail(pending.line, "Unknown until dependency");
    const end = Math.min(...dependencies.map((task) => task!.start));
    if (end < tasks.get(pending.id)!.start)
      fail(pending.line, "Until dependency precedes task start");
    tasks.get(pending.id)!.end = end;
    ir.events[pending.event].end = end;
  }
}

/** Partial date formats use a stable UTC epoch rather than the device's current date. */
function parseGanttDate(value: string, format: string): number {
  if (format === "X" || format === "x") return parseDate(value, format);
  let completedFormat = format;
  let completedValue = value;
  for (const [token, fallback] of [
    ["YYYY", "1970"],
    ["MM", "01"],
    ["DD", "01"],
  ]) {
    if (!completedFormat.includes(token)) {
      completedFormat = token + " " + completedFormat;
      completedValue = fallback + " " + completedValue;
    }
  }
  return parseDate(completedValue, completedFormat);
}

function quadrantStyle(source: string, line: number): Record<string, string> {
  const result: Record<string, string> = {};
  for (const field of source.split(",")) {
    const pair = /^\s*(color|radius|stroke-color|stroke-width)\s*:\s*(.+?)\s*$/.exec(field);
    if (!pair) fail(line, "Invalid quadrant style");
    if (["radius", "stroke-width"].includes(pair[1]) && !/^\d+(?:\.\d+)?(?:px)?$/.test(pair[2]))
      fail(line, "Quadrant radius and stroke width must be nonnegative");
    result[pair[1]] = pair[2];
  }
  return result;
}
