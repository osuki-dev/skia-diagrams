import type { Node, Primitive, Rect, Scene, TextMeasurer } from "../types.ts";
import type { UsecaseJsonRow } from "../parse/usecase-json.ts";
export interface UsecaseTableMetrics {
  width: number;
  height: number;
  headerHeight: number;
  keyWidth: number;
  rows: (UsecaseJsonRow & { height: number })[];
}
/** JSON leaves remain separate key/value cells, including blank continuation keys. */
export function measureUsecaseTable(
  node: Node,
  measure: TextMeasurer,
  fontSize: number,
  maxWidth: number,
): UsecaseTableMetrics {
  const rows = (node.metadata?.dataEntries as UsecaseJsonRow[] | undefined) ?? [];
  const keyWidth =
    Math.ceil(
      Math.max(
        60,
        ...rows.map((row) => measure(row.key, { fontSize, maxWidth, literal: true }).width),
      ),
    ) + 1;
  const valueWidth =
    Math.ceil(
      Math.max(
        60,
        ...rows.map((row) => measure(row.value, { fontSize, maxWidth, literal: true }).width),
      ),
    ) + 1;
  const width = Math.max(
    measure(node.label, { fontSize, fontWeight: 600, literal: true }).width + 24,
    keyWidth + valueWidth + 48,
  );
  const headerHeight =
    measure(node.label, { fontSize, fontWeight: 600, maxWidth: width - 24, literal: true }).height +
    24;
  const measured = rows.map((row) => ({
    ...row,
    height:
      Math.max(
        measure(row.key, { fontSize, maxWidth: keyWidth, literal: true }).height,
        measure(row.value, { fontSize, maxWidth: width - keyWidth - 48, literal: true }).height,
      ) + 16,
  }));
  return {
    width,
    height: headerHeight + measured.reduce((sum, row) => sum + row.height, 0),
    headerHeight,
    keyWidth,
    rows: measured,
  };
}
export function renderUsecaseTable(
  node: Node,
  rect: Rect,
  table: UsecaseTableMetrics,
  measure: TextMeasurer,
  fontSize: number,
  primitives: Primitive[],
  interactions: NonNullable<Scene["interactions"]>,
): void {
  const color = node.style?.color ?? "nodeText",
    stroke = node.style?.stroke ?? "nodeStroke",
    dividerX = rect.x + table.keyWidth + 24;
  const text = (value: string, x: number, y: number, width: number, weight = 400) => {
    if (!value) return;
    const metrics = measure(value, {
      fontSize,
      fontWeight: weight,
      maxWidth: width,
      literal: true,
    });
    primitives.push({
      type: "text",
      text: value,
      x,
      y,
      width,
      height: metrics.height,
      fontSize,
      fontWeight: weight,
      color,
      literal: true,
      ...(metrics.lineBaselines ? { lineBaselines: metrics.lineBaselines } : {}),
    });
  };
  const line = (x1: number, y1: number, x2: number, y2: number) =>
    primitives.push({
      type: "path",
      points: [
        { x: x1, y: y1 },
        { x: x2, y: y2 },
      ],
      stroke,
      strokeWidth: node.style?.strokeWidth,
      strokeRole: "grid",
    });
  text(node.label, rect.x + 12, rect.y + 12, rect.width - 24, node.style?.fontWeight ?? 600);
  let y = rect.y + table.headerHeight;
  line(rect.x, y, rect.x + rect.width, y);
  line(dividerX, y, dividerX, rect.y + rect.height);
  for (const [index, row] of table.rows.entries()) {
    text(row.key, rect.x + 12, y + 8, table.keyWidth, node.style?.fontWeight ?? 400);
    text(
      row.value,
      dividerX + 12,
      y + 8,
      rect.width - table.keyWidth - 48,
      node.style?.fontWeight ?? 400,
    );
    const numeric = Number(row.value);
    interactions.push({
      id: `${node.id}:${row.accessibleKey}`,
      kind: "data",
      target: `${node.id}:${row.accessibleKey}`,
      label: `${node.label} · ${row.accessibleKey}`,
      tooltip: `${row.accessibleKey}: ${row.value}`,
      ...(row.value.trim() && Number.isFinite(numeric) ? { value: numeric } : {}),
      x: rect.x,
      y,
      width: rect.width,
      height: row.height,
    });
    y += row.height;
    if (index < table.rows.length - 1) line(rect.x, y, rect.x + rect.width, y);
  }
}
