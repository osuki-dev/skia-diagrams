import { readYamlMapping } from "./yaml.ts";
import type { DiagramIR } from "../types.ts";
import { addNode, fail, label } from "./common.ts";
function objectMetadata(source: string, line: number): Record<string, unknown> {
  return readYamlMapping(source, line, "Sequence metadata");
}
/** Native sequence syntax:
 * | Participants | participant/actor, aliases, symbol metadata, box groups, creation/destruction, menus |
 * | Messages | solid/dashed arrows, bidirectional arrows, cross/open/half endpoints, connections, self messages |
 * | Activations | activate/deactivate, +/- shorthand, nested stack offsets |
 * | Notes | left of/right of/over, aliases and line breaks |
 * | Fragments | loop/alt/else/opt/par/and/critical/option/break/rect, nested frames |
 * | Other | autonumber, title/accessibility labels, standalone %% comments |
 */
export function parseSequence(ir: DiagramIR, lines: { text: string; line: number }[]): void {
  const frames: string[] = [];
  const boxes: string[] = [];
  let count = 0,
    numbered = false,
    numberStep = 1;
  for (const { text, line } of lines) {
    const declaration =
      /^(create\s+)?(participant|actor)\s+([^\s@]+)(?:\s*@\s*(\{.*\}))?(?:\s+as\s+(.+))?$/.exec(
        text,
      );
    if (declaration) {
      const metadata = declaration[4] ? objectMetadata(declaration[4], line) : {};
      if (metadata.type !== undefined && typeof metadata.type !== "string")
        fail(line, "Participant type must be a string");
      if (metadata.alias !== undefined && typeof metadata.alias !== "string")
        fail(line, "Participant alias must be a string");
      const node = addNode(
        ir,
        declaration[3],
        declaration[5] ?? (metadata.alias as string | undefined) ?? declaration[3],
        declaration[2] === "actor" ? "circle" : "rect",
        boxes.at(-1),
      );
      node.shape = declaration[2] === "actor" ? "circle" : "rect";
      if (metadata.type) node.sequence = { ...node.sequence, type: metadata.type as string };
      if (declaration[1]) ir.events.push({ type: "create", from: node.id, label: "" });
      continue;
    }
    const autonumber = /^autonumber(?:\s+(off|\d+)(?:\s+(\d+))?)?$/.exec(text);
    if (autonumber) {
      numbered = autonumber[1] !== "off";
      if (autonumber[1] && autonumber[1] !== "off") {
        numberStep = Number(autonumber[2] ?? 1);
        count = Number(autonumber[1]) - numberStep;
        if (numberStep <= 0) fail(line, "Autonumber increment must be positive");
      }
      continue;
    }
    const message =
      /^([^\s:]+?)\s*(\(\))?\s*(<<-->>|<<->>|-->>|->>|-->|->|--x|-x|--\)|-\)|--\\|-\\|--\/|-\/)([+-]?)\s*(\(\))?\s*([^\s:]+?)\s*:\s*(.*)$/.exec(
        text,
      );
    if (message) {
      addNode(ir, message[1]);
      addNode(ir, message[6]);
      if (message[4] === "+")
        ir.events.push({ type: "activate", from: message[6], label: "", flags: ["message"] });
      const flags = [message[3]];
      if (message[2]) flags.push("source-connected");
      if (message[5]) flags.push("target-connected");
      if (numbered) count += numberStep;
      ir.events.push({
        type: "message",
        from: message[1],
        to: message[6],
        label: `${numbered ? `${count}. ` : ""}${label(message[7])}`,
        flags,
      });
      if (message[4] === "-") ir.events.push({ type: "deactivate", from: message[1], label: "" });
      continue;
    }
    const destroy = /^destroy\s+(\S+)$/.exec(text);
    if (destroy) {
      addNode(ir, destroy[1]);
      ir.events.push({ type: "destroy", from: destroy[1], label: "" });
      continue;
    }
    const menu = /^(link|links)\s+([^:]+):\s*(.*)$/.exec(text);
    if (menu) {
      const node = addNode(ir, menu[2].trim());
      const links = menu[1] === "links" ? objectMetadata(menu[3], line) : undefined;
      const entry = menu[1] === "link" ? /^(.*?)\s*@\s*(\S+)\s*$/.exec(menu[3]) : undefined;
      if (menu[1] === "link" && !entry) fail(line, "Invalid participant link");
      const entries = links ? Object.entries(links) : [[entry![1], entry![2]]];
      for (const [name, url] of entries) {
        if (typeof url !== "string") fail(line, "Participant link URL must be a string");
        node.sequence ??= {};
        node.sequence.links ??= [];
        node.sequence.links.push({ label: label(name), url });
      }
      continue;
    }
    const activation = /^(activate|deactivate)\s+(\S+)$/.exec(text);
    if (activation) {
      addNode(ir, activation[2]);
      ir.events.push({ type: activation[1], from: activation[2], label: "" });
      continue;
    }
    const note = /^Note\s+(left of|right of|over)\s+([^:]+):\s*(.*)$/i.exec(text);
    if (note) {
      const ids = note[2].split(",").map((s) => s.trim());
      for (const id of ids) addNode(ir, id);
      ir.events.push({
        type: "note",
        from: ids[0],
        to: ids.at(-1),
        label: label(note[3]),
        flags: [note[1].toLowerCase()],
      });
      continue;
    }
    const frame = /^(loop|alt|opt|par|critical|break|rect|box)\b\s*(.*)$/.exec(text);
    if (frame) {
      if (frame[1] === "box") {
        const id = `sequence-box-${ir.clusters.length}`;
        const color =
          /^(transparent|#[\da-f]{3,8}|rgb\([^)]*\)|rgba\([^)]*\)|aqua|blue|green|red|yellow|purple|orange)\s*(.*)$/i.exec(
            frame[2],
          );
        ir.clusters.push({
          id,
          parent: boxes.at(-1),
          label: label(color?.[2] ?? frame[2]),
          style: color ? { fill: color[1] } : undefined,
        });
        boxes.push(id);
        frames.push("box");
        continue;
      }
      frames.push(frame[1]);
      ir.events.push({
        type: "frame",
        label: `${frame[1]} ${label(frame[2])}`,
        depth: frames.filter((f) => f !== "box").length,
        flags: [frame[1], frame[1] === "rect" ? frame[2] : ""],
      });
      continue;
    }
    if (/^(else|and|option)\b/.test(text)) {
      const enclosing = frames.at(-1);
      if (!enclosing || enclosing === "box") fail(line, "Fragment separator outside fragment");
      ir.events.push({
        type: "separator",
        label: text,
        depth: frames.filter((f) => f !== "box").length,
      });
      continue;
    }
    if (text === "end") {
      const enclosing = frames.pop();
      if (!enclosing) fail(line, "Unmatched end");
      if (enclosing === "box") {
        boxes.pop();
        continue;
      }
      ir.events.push({
        type: "end",
        label: "",
        depth: frames.filter((f) => f !== "box").length + 1,
      });
      continue;
    }
    if (/^(title|accTitle|accDescr)\b/.test(text)) {
      const value = label(text.replace(/^\S+\s*:?\s*/, ""));
      if (text.startsWith("accDescr")) ir.description = value;
      else ir.title = value;
      continue;
    }
    fail(line, `Unsupported sequence statement: ${text}`);
  }
  if (frames.length) fail(lines.at(-1)?.line ?? 1, "Unclosed sequence fragment");
}
