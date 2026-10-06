import { OfficialScene } from "./context.ts";
interface PacketData {
  config?: {
    packet?: { bitsPerRow?: number; showBits?: boolean; bitOrder?: string };
  };
  blocks: { start: number; end?: number; bits?: number; label: string }[];
}
/** Preserve bit geometry; narrow fields get readable range-labelled rows instead of tiny type. */
export function compactPacket(scene: OfficialScene, data: PacketData): boolean {
  if (!Number.isFinite(scene.options.viewportWidth)) return false;
  const width = Math.max(100, scene.options.viewportWidth! - scene.padding * 2),
    config = data.config?.packet;
  const bits = Math.max(1, Math.min(128, Math.floor(config?.bitsPerRow ?? 32))),
    cell = width / bits,
    descending = config?.bitOrder === "descending",
    x = scene.padding;
  const rows = new Map<
    number,
    {
      index: number;
      label: string;
      start: number;
      end: number;
      bit: number;
      length: number;
      column: number;
    }[]
  >();
  let cursor = 0;
  for (const [index, block] of data.blocks.entries()) {
    const start = Number.isFinite(block.start) ? block.start : cursor,
      end = block.end ?? start + (block.bits || 1) - 1;
    if (start < 0 || end < start || end > 65535) throw new Error("Invalid packet bit range");
    cursor = end + 1;
    for (let bit = start; bit <= end;) {
      const row = Math.floor(bit / bits),
        column = bit % bits,
        length = Math.min(end - bit + 1, bits - column),
        items = rows.get(row) ?? [];
      items.push({
        index,
        label: block.label,
        start,
        end,
        bit,
        length,
        column,
      });
      rows.set(row, items);
      bit += length;
    }
  }
  let y = scene.top + 30;
  for (const [row, fields] of rows) {
    const height = Math.max(36, scene.fontSize * 1.5 + 16);
    const tickSize = Math.max(Math.min(10, scene.fontSize), scene.fontSize * 0.75),
      occupied: { left: number; right: number }[] = [];
    const tick = (bit: number) => {
      const column = bit % bits,
        center = x + (descending ? bits - column - 0.5 : column + 0.5) * cell;
      const label = String(bit),
        m = scene.measure(label, { fontSize: tickSize }),
        left = Math.max(
          x,
          Math.min(x + width - Math.ceil(m.width) - 2, center - (Math.ceil(m.width) + 2) / 2),
        ),
        right = left + Math.ceil(m.width) + 2;
      if (occupied.some((r) => left < r.right + 6 && right + 6 > r.left)) return;
      occupied.push({ left, right });
      scene.text(label, left, y - 24, Math.ceil(m.width) + 2, "mutedText", 400, tickSize);
    };
    if (config?.showBits !== false) {
      tick(row * bits);
      tick(row * bits + bits - 1);
      for (const field of fields) {
        tick(field.bit);
        tick(field.bit + field.length - 1);
      }
    }
    for (const f of fields) {
      const r = {
        x: x + (descending ? bits - f.column - f.length : f.column) * cell,
        y,
        width: f.length * cell,
        height,
      };
      const fieldStart = scene.primitives.length;
      scene.box(r, `paletteFill:${f.index % 8}`, "nodeStroke", "rect");
      scene.data(
        `packet:${f.index}:${f.bit}`,
        f.label,
        r,
        f.end - f.start + 1,
        `${f.label}: bits ${f.start}–${f.end} (${f.end - f.start + 1} bits)`,
      );
      const m = scene.measure(f.label, {
        fontSize: scene.fontSize,
        maxWidth: Math.max(1, r.width - 8),
      });
      const longest = Math.max(
        ...f.label
          .split(/\s+/)
          .map((word) => scene.measure(word, { fontSize: scene.fontSize }).width),
      );
      if (longest <= r.width - 8 && m.height <= height - 12)
        scene.text(f.label, r.x + 4, y + (height - m.height) / 2, r.width - 8);
      for (let i = fieldStart; i < scene.primitives.length; i++)
        scene.primitives[i]!.semantic = {
          kind: "node",
          id: `packet:${f.index}:${f.bit}`,
          role: "field",
          row: f.bit,
        };
    }
    y += height + 12;
    for (const f of fields) {
      const label = `${f.bit}–${f.bit + f.length - 1}  ${f.label}`,
        maxWidth = width - 22,
        m = scene.measure(label, { fontSize: scene.fontSize, maxWidth });
      const legendStart = scene.primitives.length;
      scene.box(
        { x, y: y + 4, width: 10, height: 10 },
        `palette:${f.index % 8}`,
        "transparent",
        "round",
      );
      scene.text(label, x + 22, y, maxWidth);
      for (let i = legendStart; i < scene.primitives.length; i++)
        scene.primitives[i]!.semantic = {
          kind: "node",
          id: `packet:${f.index}:${f.bit}`,
          role: "label",
          row: f.bit,
        };
      scene.data(
        `packet:range:${f.index}:${f.bit}`,
        f.label,
        { x, y, width, height: m.height },
        f.end - f.start + 1,
        `${f.label}: bits ${f.start}–${f.end} (${f.end - f.start + 1} bits)`,
      );
      y += m.height + 8;
    }
    y += 26;
  }
  return true;
}
