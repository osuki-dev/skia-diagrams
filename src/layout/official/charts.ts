import { compactPacket } from "./packet-compact.ts";
import type { Point, Rect, Style } from "../../types.ts";
import { clamp, OfficialScene, reference } from "./context.ts";
import { parseStyle } from "../../parse/common.ts";
import { squarify } from "./treemap-tiling.ts";
interface PacketData {
  config?: { packet?: { bitsPerRow?: number; showBits?: boolean; bitOrder?: string } };
  blocks: { start: number; end?: number; bits?: number; label: string }[];
}
export function packet(scene: OfficialScene, data: PacketData): void {
  if (compactPacket(scene, data)) return;
  const config = data.config?.packet;
  const bitsPerRow = Math.max(1, Math.min(128, Math.floor(config?.bitsPerRow ?? 32))),
    cell = 22,
    x = scene.padding,
    top = scene.top + 24,
    descending = config?.bitOrder === "descending";
  const segments: {
    index: number;
    label: string;
    start: number;
    end: number;
    bit: number;
    row: number;
    column: number;
    length: number;
    fontSize: number;
    height: number;
  }[] = [];
  const heights = new Map<number, number>();
  let cursor = 0;
  for (const [index, block] of data.blocks.entries()) {
    const start = Number.isFinite(block.start) ? block.start : cursor;
    const end = block.end ?? start + (block.bits || 1) - 1;
    if (start < 0 || end < start || end > 65535) throw new Error("Invalid packet bit range");
    cursor = end + 1;
    for (let bit = start; bit <= end;) {
      const row = Math.floor(bit / bitsPerRow),
        column = bit % bitsPerRow;
      const length = Math.min(end - bit + 1, bitsPerRow - column);
      const nominalLabelSize = length <= 2 ? Math.min(scene.fontSize, 7) : scene.fontSize;
      const longestWordWidth = Math.max(
        1,
        ...block.label
          .split(/\s+/)
          .map((word) => scene.measure(word, { fontSize: nominalLabelSize }).width),
      );
      const fontSize = Math.min(
        nominalLabelSize,
        (nominalLabelSize * Math.max(1, length * cell - 8)) / longestWordWidth,
      );
      const measured = scene.measure(block.label, {
        fontSize,
        maxWidth: Math.max(1, length * cell - 8),
      });
      const height = Math.max(42, measured.height + 20);
      heights.set(row, Math.max(heights.get(row) ?? 42, height));
      segments.push({
        index,
        label: block.label,
        start,
        end,
        bit,
        row,
        column,
        length,
        fontSize,
        height,
      });
      bit += length;
    }
  }
  const rowTops = new Map<number, number>();
  let y = top;
  const lastRow = Math.max(0, ...heights.keys());
  for (let row = 0; row <= lastRow; row++) {
    rowTops.set(row, y);
    y += (heights.get(row) ?? 42) + 22;
  }
  for (const item of segments) {
    const { index, label, start, end, bit, row, column, length, fontSize } = item;
    const r = {
      x: x + (descending ? bitsPerRow - column - length : column) * cell,
      y: rowTops.get(row)!,
      width: length * cell,
      height: heights.get(row)!,
    };
    scene.data(
      `packet:${index}:${bit}`,
      label,
      r,
      end - start + 1,
      `${label}: bits ${start}–${end} (${end - start + 1} bits)`,
    );
    const fieldStart = scene.primitives.length;
    scene.box(r, `paletteFill:${index % 8}`, "nodeStroke", "rect");
    const measured = scene.measure(label, { fontSize, maxWidth: Math.max(1, r.width - 8) });
    scene.text(
      label,
      r.x + 4,
      r.y + (r.height - measured.height) / 2,
      Math.max(1, r.width - 8),
      "nodeText",
      400,
      fontSize,
    );
    for (let i = fieldStart; i < scene.primitives.length; i++)
      scene.primitives[i]!.semantic = {
        kind: "node",
        id: `packet:${index}:${bit}`,
        role: "field",
        row: bit,
      };
    if (config?.showBits !== false) {
      const left = String(descending ? bit + length - 1 : bit),
        right = String(descending ? bit : bit + length - 1);
      const budget = length > 1 ? (r.width - 8) / 2 : r.width - 4;
      const nominal = scene.fontSize * 0.75;
      const width = Math.max(
        scene.measure(left, { fontSize: nominal }).width,
        scene.measure(right, { fontSize: nominal }).width,
      );
      const size = Math.min(nominal, (nominal * budget) / Math.max(1, width));
      const leftWidth = scene.measure(left, { fontSize: size }).width,
        rightWidth = scene.measure(right, { fontSize: size }).width;
      scene.text(left, r.x + 2, r.y - 19, leftWidth + 1, "mutedText", 400, size);
      if (length > 1)
        scene.text(
          right,
          r.x + r.width - rightWidth - 2,
          r.y - 19,
          rightWidth + 1,
          "mutedText",
          400,
          size,
        );
    }
  }
}

interface RadarData {
  config?: {
    radar?: { axisScaleFactor?: number; curveTension?: number };
    themeVariables?: { radar?: { curveOpacity?: number }; [key: string]: unknown };
  };
  axes: { name: string; label?: string }[];
  curves: { name: string; label?: string; entries: { value: number; axis?: unknown }[] }[];
  options: { name: string; value: unknown }[];
}
export function radar(scene: OfficialScene, data: RadarData): void {
  const count = data.axes.length;
  if (count < 3) throw new Error("Radar requires at least three axes");
  const settings = new Map(data.options.map((o) => [o.name, o.value]));
  const values = data.curves.flatMap((c) => c.entries.map((e) => e.value));
  const min = Number(settings.get("min") ?? 0),
    max = Number(settings.get("max") ?? Math.max(1, ...values));
  if (!(max > min)) throw new Error("Radar maximum must exceed its minimum");
  const viewport = scene.options.viewportWidth;
  const usable = viewport === undefined ? undefined : Math.max(120, viewport - scene.padding * 2);
  const axisKey = usable !== undefined && scene.fontSize >= 18;
  const labelBudget = usable === undefined ? undefined : Math.max(44, Math.min(160, usable * 0.48));
  const labelMetrics = data.axes.map((axis) =>
    scene.measure(axis.label ?? axis.name, { fontSize: scene.fontSize, maxWidth: labelBudget }),
  );
  const gap = Math.max(12, scene.fontSize * 0.6);
  const labelHeight = Math.max(...labelMetrics.map((m) => m.height));
  const fittedRadius =
    usable === undefined
      ? 150
      : Math.min(
          ...labelMetrics.map((m, i) => {
            const dx = Math.abs(Math.cos((i / count) * Math.PI * 2 - Math.PI / 2));
            return dx < 0.1 ? 150 : (usable / 2 - m.width / 2 - gap) / (dx * 1.18);
          }),
        );
  const radius =
      usable === undefined
        ? 150
        : axisKey
          ? Math.min(150, (usable / 2 - scene.fontSize * 0.4 - 6) / 1.18)
          : Math.max(32, Math.min(150, fittedRadius)),
    cx = usable === undefined ? scene.padding + 220 : scene.padding + usable / 2,
    cy = usable === undefined ? scene.top + 200 : scene.top + labelHeight + gap + radius;
  const point = (index: number, ratio: number): Point => ({
    x: cx + Math.cos((index / count) * Math.PI * 2 - Math.PI / 2) * radius * ratio,
    y: cy + Math.sin((index / count) * Math.PI * 2 - Math.PI / 2) * radius * ratio,
  });
  const ticks = Math.max(1, Math.min(20, Number(settings.get("ticks") ?? 5)));
  for (let t = 1; t <= ticks; t++) {
    if ((settings.get("graticule") ?? "circle") === "circle")
      scene.box(
        {
          x: cx - (radius * t) / ticks,
          y: cy - (radius * t) / ticks,
          width: (radius * 2 * t) / ticks,
          height: (radius * 2 * t) / ticks,
        },
        "transparent",
        "gridStroke",
        "circle",
      );
    else {
      const points = data.axes.map((_, i) => point(i, t / ticks));
      scene.primitives.push({
        type: "path",
        points,
        closed: true,
        stroke: "gridStroke",
        strokeRole: "grid",
      });
    }
    const labelStride = Math.max(1, Math.ceil((scene.fontSize * 0.9 * ticks) / radius));
    if (usable === undefined || t === ticks || t % labelStride === 0)
      scene.text(
        String(Math.round((min + ((max - min) * t) / ticks) * 100) / 100),
        cx + 5,
        cy - (radius * t) / ticks - (usable !== undefined ? scene.fontSize * 0.75 : 0),
        undefined,
        "mutedText",
        400,
        scene.fontSize * 0.75,
      );
  }
  const axisLabels = data.axes.map((axis, index) => {
    const endpoint = point(index, usable === undefined ? 1 : 1.18),
      label = axisKey ? String(index + 1) : (axis.label ?? axis.name),
      m = axisKey ? scene.measure(label, { fontSize: scene.fontSize * 0.8 }) : labelMetrics[index]!;
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2,
      dx = Math.cos(angle),
      dy = Math.sin(angle);
    return {
      label,
      width: m.width + 2,
      height: m.height,
      x:
        endpoint.x +
        (usable !== undefined
          ? -m.width / 2
          : dx > 0.2
            ? gap
            : dx < -0.2
              ? -m.width - gap
              : -m.width / 2),
      y: endpoint.y + (dy > 0.2 ? gap : dy < -0.2 ? -m.height - gap : -m.height / 2),
    };
  });
  const legendX = Math.max(
    scene.padding + 460,
    ...axisLabels.map((label) => label.x + label.width + 24),
  );
  const legendTop =
    Math.max(cy + radius, ...axisLabels.map((label) => label.y + label.height)) + 24;
  let legendY = legendTop;
  data.axes.forEach((axis, i) => {
    scene.line(
      [
        { x: cx, y: cy },
        point(i, Math.max(0.1, Math.min(2, data.config?.radar?.axisScaleFactor ?? 1))),
      ],
      "gridStroke",
    );
    const label = axisLabels[i]!;
    scene.text(
      label.label,
      label.x,
      label.y,
      label.width,
      "nodeText",
      400,
      scene.fontSize * (axisKey ? 0.8 : 1),
    );
  });
  data.curves.forEach((curve, index) => {
    const seriesStart = scene.primitives.length;
    const authoredColor = data.config?.themeVariables?.[`cScale${index}`];
    const curveColor = typeof authoredColor === "string" ? authoredColor : `palette:${index % 8}`;
    const keyed = new Map(
      curve.entries.filter((e) => e.axis).map((e) => [reference(e.axis), e.value]),
    );
    const points = data.axes.map((axis, i) =>
      point(
        i,
        clamp(((keyed.get(axis.name) ?? curve.entries[i]?.value ?? min) - min) / (max - min)),
      ),
    );
    const smooth = (settings.get("graticule") ?? "circle") === "circle";
    const opacity = clamp(data.config?.themeVariables?.radar?.curveOpacity ?? 0.3);
    const curves = smooth
      ? closedRadarCurve(points, data.config?.radar?.curveTension ?? 0.17)
      : undefined;
    if (opacity > 0)
      scene.primitives.push({
        type: "path",
        points,
        curves,
        closed: true,
        fill: curveColor,
        opacity,
      });
    scene.primitives.push({
      type: "path",
      points,
      curves,
      closed: true,
      stroke: curveColor,
      strokeRole: "series",
    });
    for (const primitive of scene.primitives.slice(seriesStart))
      primitive.semantic = {
        kind: "node",
        id: `radar:curve:${curve.name}`,
        group: curve.name,
        role: "series",
      };
    points.forEach((p, axisIndex) => {
      const axis = data.axes[axisIndex]!,
        value = keyed.get(axis.name) ?? curve.entries[axisIndex]?.value ?? min;
      scene.data(
        `radar:${curve.name}:${axis.name}`,
        `${curve.label ?? curve.name} / ${axis.label ?? axis.name}`,
        { x: p.x - 10, y: p.y - 10, width: 20, height: 20 },
        value,
        `${curve.label ?? curve.name} · ${axis.label ?? axis.name}: ${value}`,
      );
      scene.box({ x: p.x - 3, y: p.y - 3, width: 6, height: 6 }, curveColor, curveColor, "circle");
      scene.primitives.at(-1)!.semantic = {
        kind: "node",
        id: `radar:${curve.name}:${axis.name}`,
        group: curve.name,
        role: "marker",
      };
    });
    if (settings.get("showLegend") !== false) {
      const label = curve.label ?? curve.name;
      const lx = usable === undefined ? legendX : scene.padding;
      const ly = usable === undefined ? scene.top + 20 + index * 28 : legendY;
      const lm = scene.measure(label, {
        fontSize: scene.fontSize,
        maxWidth: usable === undefined ? undefined : usable - 24,
      });
      const legendHeight = Math.max(24, lm.height + 8);
      scene.data(
        `radar:curve:${curve.name}`,
        curve.label ?? curve.name,
        {
          x: lx,
          y: ly - 4,
          width: usable ?? 20 + lm.width,
          height: legendHeight,
        },
        undefined,
        `${curve.label ?? curve.name}: ${curve.entries.map((e) => e.value).join(", ")}`,
      );
      scene.box({ x: lx, y: ly + 4, width: 12, height: 12 }, curveColor, curveColor, "circle");
      scene.primitives.at(-1)!.semantic = {
        kind: "node",
        id: `radar:curve:${curve.name}`,
        group: curve.name,
        role: "legend",
      };
      scene.text(label, lx + 20, ly, usable === undefined ? undefined : usable - 24);
      scene.primitives.at(-1)!.semantic = {
        kind: "node",
        id: `radar:curve:${curve.name}`,
        group: curve.name,
        role: "legend",
        part: "label",
      };
      legendY += legendHeight + 8;
    }
  });
  if (axisKey)
    data.axes.forEach((axis, index) => {
      const text = `${index + 1}. ${axis.label ?? axis.name}`;
      scene.text(text, scene.padding, legendY + 12, usable, "mutedText");
      const primitive = scene.primitives.at(-1)!;
      if (primitive.type === "text") legendY += primitive.height + 8;
    });
}
interface TreeItem {
  name: string;
  value: number;
  children: TreeItem[];
  style?: Style;
}
interface TreemapData {
  config?: {
    treemap?: {
      diagramPadding?: number;
      padding?: number;
      valueFormat?: string;
      nodeWidth?: number;
      nodeHeight?: number;
    };
  };
  TreemapRows: {
    indent?: string | number;
    item?: { $type: string; name: string; value?: number; classSelector?: string };
    className?: string;
    styleText?: string;
  }[];
}
/** Squarified sibling areas preserve nested section frames and authored styles. */
export function treemap(scene: OfficialScene, data: TreemapData): void {
  const root: TreeItem = { name: "", value: 0, children: [] },
    stack: { indent: number; item: TreeItem }[] = [{ indent: -1, item: root }];
  const styles = new Map(
    data.TreemapRows.filter((row) => row.className && row.styleText).map((row) => [
      row.className!,
      parseStyle(row.styleText!),
    ]),
  );
  for (const row of data.TreemapRows) {
    if (!row.item) continue;
    if (row.item.$type !== "Leaf" && row.item.$type !== "Section") continue;
    const indent =
      typeof row.indent === "number"
        ? row.indent
        : (row.indent ?? "").replace(/\t/g, "    ").length;
    while (stack.length > 1 && stack.at(-1)!.indent >= indent) stack.pop();
    const item: TreeItem = {
      name: row.item.name,
      value: Math.max(0, row.item.value ?? 0),
      children: [],
      style: styles.get(row.item.classSelector ?? ""),
    };
    stack.at(-1)!.item.children.push(item);
    if (row.item.$type === "Section") stack.push({ indent, item });
  }
  const weight = (item: TreeItem): number => {
    if (item.children.length) {
      item.value = item.children.reduce((sum, child) => sum + weight(child), 0);
      item.children.sort((a, b) => b.value - a.value);
    }
    return item.value;
  };
  weight(root);
  if (!(root.value > 0)) throw new Error("Treemap requires positive values");
  const config = data.config?.treemap;
  const requestedMargin = Math.max(0, Math.min(400, config?.diagramPadding ?? 0));
  const margin = scene.options.viewportWidth ? Math.min(12, requestedMargin) : requestedMargin;
  const width = scene.options.viewportWidth
    ? Math.max(80, scene.options.viewportWidth - scene.padding * 2 - margin * 2)
    : Math.max(80, Math.min(2400, (config?.nodeWidth ?? 96) * 10));
  const leafCount = (item: TreeItem): number =>
    item.children.length ? item.children.reduce((sum, child) => sum + leafCount(child), 0) : 1;
  const height = Math.max(
    300,
    Math.min(
      2400,
      Math.max(
        (config?.nodeHeight ?? 50) * 10,
        scene.options.viewportWidth ? leafCount(root) * scene.fontSize * 5 : 0,
      ),
    ),
  );
  const frame = {
    x: scene.padding + margin,
    y: scene.top + margin + scene.fontSize * 2,
    width,
    height,
  };
  const callouts: { item: TreeItem; depth: number; tint: number }[] = [];
  let color = 0,
    leafIndex = 0;
  const addValue = (
    item: TreeItem,
    x: number,
    y: number,
    available: number,
    color = "mutedText",
  ) => {
    const value = formatValue(item.value, config?.valueFormat);
    scene.text(value, x, y, available, color);
    const primitive = scene.primitives.at(-1);
    // Only actual numeric values opt in; labels such as "Category 2026" stay labels.
    if (primitive?.type === "text" && !config?.valueFormat)
      primitive.motion = { value: item.value, decimals: Number.isInteger(item.value) ? 0 : 2 };
  };
  const collectHidden = (item: TreeItem, depth: number, tint: number): void => {
    callouts.push({ item, depth, tint });
    item.children.forEach((child) => collectHidden(child, depth + 1, tint));
  };
  const partition = (items: TreeItem[], r: Rect, depth: number, inheritedTint?: number): void => {
    if (!items.length) return;
    if (items.length !== 1) {
      const tiles = squarify(
        items.map((item) => item.value),
        r,
      );
      items.forEach((item, index) => {
        const tile = tiles[index]!;
        if (tile.width > 0 && tile.height > 0) partition([item], tile, depth, inheritedTint);
        else collectHidden(item, depth, inheritedTint ?? color++ % 8);
      });
      return;
    }
    const item = items[0]!,
      tint = inheritedTint ?? color++ % 8;
    const index = leafIndex++;
    const tileId = `treemap:${item.children.length ? "parent" : "leaf"}:${depth}:${index}`;
    const tagLastText = () => {
      const primitive = scene.primitives.at(-1);
      if (primitive?.type === "text")
        primitive.semantic = { kind: "node", id: tileId, row: depth, part: "label" };
    };
    if (!item.children.length)
      scene.data(
        `treemap:${index}`,
        item.name,
        r,
        item.value,
        `${item.name}: ${formatValue(item.value, config?.valueFormat)}`,
      );
    scene.box(
      r,
      item.style?.fill ?? `paletteFill:${tint}`,
      item.style?.stroke ?? "background",
      "rect",
      tileId,
    );
    Object.assign(scene.primitives.at(-1)!, item.style);
    const usable = r.width - 12;
    if (usable < scene.fontSize * 2 || r.height < scene.fontSize * 2) {
      collectHidden(item, depth, tint);
      return;
    }
    const label = scene.measure(item.name, {
      fontSize: scene.fontSize,
      fontWeight: item.children.length ? 600 : 400,
      maxWidth: usable,
    });
    const value = formatValue(item.value, config?.valueFormat);
    const valueMetrics = scene.measure(value, { fontSize: scene.fontSize, maxWidth: usable });
    if (item.children.length) {
      const sideBySide =
        label.lines.length === 1 && label.width + valueMetrics.width + 18 <= usable;
      const headerHeight =
        10 +
        Math.max(
          label.height,
          sideBySide ? valueMetrics.height : label.height + 4 + valueMetrics.height,
        );
      if (r.height <= headerHeight + 12) {
        collectHidden(item, depth, tint);
        return;
      }
      scene.text(
        item.name,
        r.x + 6,
        r.y + 5,
        sideBySide ? usable - valueMetrics.width - 12 : usable,
        item.style?.color ?? "nodeText",
        600,
      );
      tagLastText();
      addValue(
        item,
        sideBySide ? r.x + r.width - valueMetrics.width - 6 : r.x + 6,
        sideBySide ? r.y + 5 : r.y + 9 + label.height,
        sideBySide ? valueMetrics.width + 1 : usable,
        item.style?.color ?? "mutedText",
      );
      tagLastText();
      partition(
        item.children,
        {
          x: r.x + 4,
          y: r.y + headerHeight,
          width: r.width - 8,
          height: r.height - headerHeight - 4,
        },
        depth + 1,
        tint,
      );
    } else {
      const contentHeight = label.height + 6 + valueMetrics.height;
      if (contentHeight + 12 > r.height) {
        callouts.push({ item, depth, tint });
        return;
      }
      const labelY = r.y + (r.height - contentHeight) / 2;
      scene.text(item.name, r.x + 6, labelY, usable, item.style?.color ?? "nodeText");
      tagLastText();
      addValue(item, r.x + 6, labelY + label.height + 6, usable, item.style?.color ?? "mutedText");
      tagLastText();
    }
  };
  addValue(root, scene.padding + margin, scene.top + margin, width);
  partition(root.children, frame, 0);
  let calloutY = frame.y + frame.height + 16;
  for (const { item, depth, tint } of callouts) {
    const indent = Math.min(3, depth) * 8;
    scene.box(
      { x: frame.x + indent, y: calloutY + 4, width: 4, height: scene.fontSize },
      `palette:${tint}`,
      "transparent",
      "rect",
    );
    const usable = width - indent - 14;
    const label = scene.measure(item.name, {
      fontSize: scene.fontSize,
      fontWeight: item.children.length ? 600 : 400,
      maxWidth: usable,
    });
    scene.text(
      item.name,
      frame.x + indent + 10,
      calloutY,
      usable,
      item.style?.color ?? "nodeText",
      item.children.length ? 600 : 400,
    );
    addValue(
      item,
      frame.x + indent + 10,
      calloutY + label.height + 4,
      usable,
      item.style?.color ?? "mutedText",
    );
    const valueHeight = scene.measure(formatValue(item.value, config?.valueFormat), {
      fontSize: scene.fontSize,
      maxWidth: usable,
    }).height;
    calloutY += label.height + valueHeight + 16;
  }
}

function formatValue(value: number, format?: string): string {
  const currency = format?.startsWith("$") ? "$" : "";
  const percent = format?.includes("%");
  const digits = Number(
    format?.match(/\.(\d+)/)?.[1] ?? (percent ? 0 : Number.isInteger(value) ? 0 : 2),
  );
  const adjusted = percent ? value * 100 : value;
  const rendered = adjusted.toLocaleString("en-US", {
    minimumFractionDigits: Math.min(20, digits),
    maximumFractionDigits: Math.min(20, digits),
    useGrouping: format?.includes(",") ?? true,
  });
  return currency + rendered + (percent ? "%" : "");
}

/** The upstream radar cubic controls replay directly in Skia and SVG. */
function closedRadarCurve(
  points: Point[],
  tension: number,
): { control1: Point; control2: Point; end: Point }[] {
  const result: { control1: Point; control2: Point; end: Point }[] = [],
    t = clamp(tension, 0, 1);
  for (let i = 0; i < points.length; i++) {
    const a = points[(i - 1 + points.length) % points.length]!,
      b = points[i]!,
      c = points[(i + 1) % points.length]!,
      d = points[(i + 2) % points.length]!;
    result.push({
      control1: { x: b.x + (c.x - a.x) * t, y: b.y + (c.y - a.y) * t },
      control2: { x: c.x - (d.x - b.x) * t, y: c.y - (d.y - b.y) * t },
      end: c,
    });
  }
  return result;
}
