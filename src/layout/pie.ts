import type { DiagramIR, LayoutOptions, Point, Primitive, Scene, TextMeasurer } from "../types.ts";
import { boundedNumber } from "./options.ts";
import { runsForLines } from "../render/text.ts";

const tau = Math.PI * 2;
const normalize = (angle: number) => ((angle % tau) + tau) % tau;

/** Measure the complete legend before selecting an arrangement for the host viewport. */
export function layoutPie(
  ir: DiagramIR,
  primitives: Primitive[],
  fontSize: number,
  measure: TextMeasurer,
  options: LayoutOptions,
  interactions: NonNullable<Scene["interactions"]>,
): void {
  const style = options.typeStyles?.pie;
  const config = ir.data?.config as
    | {
        pie?: { donutHole?: number; textPosition?: number; highlightSlice?: string };
        themeVariables?: { pieOuterStrokeWidth?: string | number };
      }
    | undefined;
  const pie = config?.pie;
  const hole = boundedNumber(style?.donutHole, boundedNumber(pie?.donutHole, 0, 0, 0.9), 0, 0.9);
  const textPosition = boundedNumber(
    style?.textPosition,
    boundedNumber(pie?.textPosition, 0.64, 0, 1),
    0,
    1,
  );
  const highlightScale = boundedNumber(style?.highlightScale, 1.05, 1, 2);
  const outerStroke = boundedNumber(
    style?.outerStrokeWidth,
    Math.max(0, Number.parseFloat(String(config?.themeVariables?.pieOuterStrokeWidth ?? "0")) || 0),
    0,
    80,
  );
  const padding = options.padding ?? 20;
  const viewport = options.viewportWidth;
  const contentWidth = viewport ? Math.max(100, viewport - padding * 2) : undefined;
  const total = ir.events.reduce((sum, event) => sum + (event.value ?? 0), 0);
  if (!Number.isFinite(total) || total <= 0)
    throw new Error("Pie total must be positive and finite");
  const showData = ir.data?.showData === true;
  const rows = ir.events.map((event) => {
    const percent = Math.round(((event.value ?? 0) / total) * 100);
    const value = `${percent}%`,
      label = showData ? `${event.label} [${event.value ?? 0}]` : event.label;
    return {
      event,
      value,
      percent,
      label,
      percentMetrics: measure(value, { fontSize, literal: true }),
      valueMetrics: measure(value, { fontSize, fontWeight: 600, literal: true }),
      labelMetrics: measure(label, { fontSize, literal: true }),
    };
  });
  const labelWidth = Math.max(0, ...rows.map((row) => row.labelMetrics.width));
  const valueWidth = Math.max(0, ...rows.map((row) => row.valueMetrics.width));
  const legendGap = boundedNumber(style?.legendGap, 24, 12),
    rowGap = boundedNumber(style?.legendRowGap, 12, 6);
  const requestedDiameter = boundedNumber(style?.diameter, 180, 100, 1200);
  const fitsAt = (row: (typeof rows)[number], startAngle: number, d: number) => {
    const radius = d / 2,
      sweep = ((row.event.value ?? 0) / total) * tau,
      midpoint = startAngle + sweep / 2;
    const outer = radius * (pie?.highlightSlice === row.event.label ? highlightScale : 1),
      inner = outer * hole;
    const x = radius * textPosition * Math.cos(midpoint) - row.percentMetrics.width / 2,
      y = radius * textPosition * Math.sin(midpoint) - row.percentMetrics.height / 2;
    return [
      [x, y],
      [x + row.percentMetrics.width, y],
      [x + row.percentMetrics.width, y + row.percentMetrics.height],
      [x, y + row.percentMetrics.height],
    ].every(([px, py]) => {
      const distance = Math.hypot(px, py);
      return (
        distance <= outer - 2 &&
        distance >= inner + 2 &&
        normalize(Math.atan2(py, px) - startAngle) <= sweep
      );
    });
  };
  let leftGutter = 0,
    rightGutter = 0,
    diameter = requestedDiameter;
  if (contentWidth && style?.diameter === undefined) {
    // Reserve only gutters actually required by measured labels; allocating both
    // sides unconditionally would shrink a readable pie into more callouts.
    for (let attempt = 0; attempt < 8; attempt++) {
      let angle = -Math.PI / 2,
        left = leftGutter,
        right = rightGutter;
      for (const row of rows) {
        const sweep = ((row.event.value ?? 0) / total) * tau;
        if (!fitsAt(row, angle, diameter)) {
          const required = row.percentMetrics.width + 26;
          if (Math.cos(angle + sweep / 2) < 0) left = Math.max(left, required);
          else right = Math.max(right, required);
        }
        angle += sweep;
      }
      const next = Math.min(
        requestedDiameter,
        Math.max(
          80,
          contentWidth -
            left -
            right -
            outerStroke * 2 -
            (pie?.highlightSlice ? requestedDiameter * (highlightScale - 1) * 2 : 0) -
            (outerStroke ? 8 : 0),
        ),
      );
      if (left === leftGutter && right === rightGutter && next === diameter) break;
      leftGutter = left;
      rightGutter = right;
      diameter = next;
    }
  }
  const legendRequired = 22 + labelWidth + (showData ? 0 : 16 + valueWidth);
  const legendRight =
    style?.legendPosition === "right" ||
    (style?.legendPosition !== "bottom" &&
      (!contentWidth ||
        requestedDiameter + leftGutter + rightGutter + legendGap + legendRequired + 10 <=
          contentWidth));
  const radius = diameter / 2,
    chartX = contentWidth ? padding + leftGutter : 24,
    chartY = 24,
    cx = chartX + radius,
    cy = chartY + radius;
  let angle = -Math.PI / 2;
  const slices = rows.map((row, index) => {
    const sweep = ((row.event.value ?? 0) / total) * tau,
      midpoint = angle + sweep / 2;
    const r = radius * (pie?.highlightSlice === row.event.label ? highlightScale : 1),
      inner = r * hole;
    const x = cx + radius * textPosition * Math.cos(midpoint) - row.percentMetrics.width / 2,
      y = cy + radius * textPosition * Math.sin(midpoint) - row.percentMetrics.height / 2;
    const fits = [
      [x, y],
      [x + row.percentMetrics.width, y],
      [x + row.percentMetrics.width, y + row.percentMetrics.height],
      [x, y + row.percentMetrics.height],
    ].every(([px, py]) => {
      const distance = Math.hypot(px - cx, py - cy);
      return (
        distance <= r - 2 &&
        distance >= inner + 2 &&
        normalize(Math.atan2(py - cy, px - cx) - angle) <= sweep
      );
    });
    const slice = {
      ...row,
      index,
      startAngle: angle,
      sweep,
      midpoint,
      r,
      inner,
      x,
      y,
      fits,
      right: Math.cos(midpoint) >= 0,
    };
    angle += sweep;
    return slice;
  });
  const semantic = (
    index: number,
    role: string,
    part: "body" | "label" = "body",
  ): Primitive["semantic"] => ({
    kind: role === "callout" ? "edge" : "node",
    id: `pie-${index}`,
    group: `pie-${index}`,
    row: index,
    role,
    part,
  });
  const drawText = (
    value: string,
    x: number,
    y: number,
    color?: string,
    weight = 400,
    maxWidth?: number,
    numeric?: number,
    meaning?: Primitive["semantic"],
  ) => {
    const metrics = measure(value, {
      fontSize,
      fontWeight: weight,
      literal: true,
      ...(maxWidth ? { maxWidth } : {}),
    });
    primitives.push({
      type: "text",
      literal: true,
      text: value,
      x,
      y,
      width: metrics.width,
      height: metrics.height,
      fontSize,
      ...(weight !== 400 ? { fontWeight: weight } : {}),
      color,
      lineRuns: runsForLines(value, metrics.lines, true),
      ...(metrics.lineBaselines ? { lineBaselines: metrics.lineBaselines } : {}),
      ...(numeric === undefined ? {} : { motion: { value: numeric, suffix: "%" } }),
      ...(meaning ? { semantic: meaning } : {}),
    });
    return metrics;
  };
  for (const slice of slices) {
    const rect = { x: cx - slice.r, y: cy - slice.r, width: slice.r * 2, height: slice.r * 2 };
    interactions.push({
      id: `pie-${slice.index}`,
      label: slice.event.label,
      kind: "data",
      target: slice.event.label,
      value: slice.event.value,
      tooltip: `${Math.round(((slice.event.value ?? 0) / total) * 10000) / 100}% of total`,
      ...rect,
      hit: {
        type: "sector",
        cx,
        cy,
        radius: slice.r,
        ...(slice.inner ? { innerRadius: slice.inner } : {}),
        startAngle: slice.startAngle,
        sweepAngle: slice.sweep,
      },
    });
    primitives.push({
      type: "sector",
      semantic: semantic(slice.index, "slice"),
      cx,
      cy,
      radius: slice.r,
      ...(slice.inner ? { innerRadius: slice.inner } : {}),
      ...rect,
      startAngle: slice.startAngle,
      sweepAngle: slice.sweep,
      fill: `palette:${slice.index}`,
      stroke: "background",
      strokeRole: "series",
    });
    if (slice.fits)
      drawText(
        slice.value,
        slice.x,
        slice.y,
        style?.labelColor ?? `paletteText:${slice.index}`,
        400,
        undefined,
        slice.percent,
        semantic(slice.index, "percentage", "label"),
      );
  }
  // A single closed contour follows each sector's radius. Short tangent bridges
  // blend the highlighted rim into its neighbours without doubled caps or spikes.
  if (outerStroke > 0) {
    const at = (r: number, a: number): Point => ({
      x: cx + r * Math.cos(a),
      y: cy + r * Math.sin(a),
    });
    const joins = slices.map((slice, index) => {
      const next = slices[(index + 1) % slices.length];
      return Math.abs(slice.r - next.r) > 1e-8
        ? Math.min(0.04, slice.sweep / 4, next.sweep / 4)
        : 0;
    });
    const curves: { control1: Point; control2: Point; end: Point }[] = [];
    const start = at(slices[0].r + outerStroke / 2, slices[0].startAngle + joins.at(-1)!);
    let previous = start;
    for (const [index, slice] of slices.entries()) {
      const r = slice.r + outerStroke / 2;
      const firstAngle = slice.startAngle + joins[(index + slices.length - 1) % slices.length];
      const lastAngle = slice.startAngle + slice.sweep - joins[index];
      const sweep = lastAngle - firstAngle,
        count = Math.max(1, Math.ceil(sweep / (Math.PI / 2))),
        step = sweep / count;
      for (let i = 0; i < count; i++) {
        const a = firstAngle + i * step,
          b = a + step,
          k = (4 / 3) * Math.tan(step / 4),
          from = at(r, a),
          end = at(r, b);
        curves.push({
          control1: { x: from.x - k * r * Math.sin(a), y: from.y + k * r * Math.cos(a) },
          control2: { x: end.x + k * r * Math.sin(b), y: end.y - k * r * Math.cos(b) },
          end,
        });
        previous = end;
      }
      if (joins[index]) {
        const next = slices[(index + 1) % slices.length],
          endAngle = slice.startAngle + slice.sweep + joins[index];
        const end = at(next.r + outerStroke / 2, endAngle),
          distance = Math.hypot(end.x - previous.x, end.y - previous.y) / 3;
        curves.push({
          control1: {
            x: previous.x - distance * Math.sin(lastAngle),
            y: previous.y + distance * Math.cos(lastAngle),
          },
          control2: {
            x: end.x + distance * Math.sin(endAngle),
            y: end.y - distance * Math.cos(endAngle),
          },
          end,
        });
        previous = end;
      }
    }
    primitives.push({
      type: "path",
      points: [start, previous],
      curves,
      closed: true,
      fill: "none",
      stroke: "nodeStroke",
      strokeWidth: outerStroke,
      semantic: { kind: "frame", id: "pie:rim", role: "rim" },
    });
  }
  let calloutBottom = chartY + diameter;
  const clearance = Math.max(...slices.map((slice) => slice.r)) + outerStroke + 2;
  for (const right of [false, true]) {
    const outside = slices
      .filter((slice) => !slice.fits && slice.right === right)
      .sort((a, b) => a.y - b.y);
    const placed: { x: number; y: number; width: number; height: number }[] = [];
    for (const slice of outside) {
      const at = (r: number): Point => ({
        x: cx + r * Math.cos(slice.midpoint),
        y: cy + r * Math.sin(slice.midpoint),
      });
      const edge = at(slice.r + outerStroke),
        exit = at(slice.r + outerStroke + 12);
      const width = slice.percentMetrics.width,
        height = slice.percentMetrics.height;
      const gutterX = right ? chartX + diameter + 18 : chartX - 18 - width;
      let x = right ? exit.x + 8 : exit.x - 8 - width,
        y = Math.max(-8, exit.y - height / 2);
      for (let attempt = 0; attempt < 64; attempt++) {
        const nearestX = Math.max(x, Math.min(cx, x + width)),
          nearestY = Math.max(y, Math.min(cy, y + height));
        const collision = placed.find(
          (rect) =>
            x < rect.x + rect.width &&
            x + width > rect.x &&
            y < rect.y + rect.height + 6 &&
            y + height + 6 > rect.y,
        );
        if (collision) {
          y = collision.y + collision.height + 6;
          x = gutterX;
          continue;
        }
        if (Math.hypot(nearestX - cx, nearestY - cy) >= clearance) break;
        x = right ? Math.min(gutterX, x + 4) : Math.max(gutterX, x - 4);
      }
      const endpoint = { x: right ? x : x + width, y: y + height / 2 };
      // Normally one short radial leg and one short horizontal leg are enough.
      // A local elbow accommodates packed labels without a diagonal through the rim.
      const points =
        Math.abs(endpoint.y - exit.y) < 0.01
          ? [edge, exit, endpoint]
          : [edge, exit, { x: endpoint.x, y: exit.y }, endpoint];
      primitives.push({
        type: "path",
        points,
        stroke: "mutedText",
        strokeRole: "grid",
        semantic: semantic(slice.index, "callout"),
      });
      drawText(
        slice.value,
        x,
        y,
        "nodeText",
        400,
        undefined,
        slice.percent,
        semantic(slice.index, "percentage", "label"),
      );
      placed.push({ x, y, width, height });
      calloutBottom = Math.max(calloutBottom, y + height);
    }
  }
  const rightCalloutWidth = Math.max(
    0,
    ...slices
      .filter((slice) => !slice.fits && slice.right)
      .map((slice) => slice.percentMetrics.width),
  );
  const legendX = legendRight
    ? chartX + diameter + legendGap + (rightCalloutWidth ? rightCalloutWidth + 36 : 0)
    : contentWidth
      ? padding
      : 24;
  const legendTextWidth =
    contentWidth && !legendRight
      ? Math.max(48, contentWidth - 22 - (showData ? 0 : 16 + valueWidth))
      : undefined;
  const measuredRows = rows.map((row) => ({
    ...row,
    metrics: measure(row.label, {
      fontSize,
      literal: true,
      ...(legendTextWidth ? { maxWidth: legendTextWidth } : {}),
    }),
  }));
  const legendHeight =
    measuredRows.reduce(
      (sum, row) => sum + Math.max(row.metrics.height, row.valueMetrics.height, 10) + rowGap,
      0,
    ) - rowGap;
  let legendY = legendRight ? Math.max(chartY, cy - legendHeight / 2) : calloutBottom + legendGap;
  for (const [index, row] of measuredRows.entries()) {
    primitives.push({
      type: "shape",
      shape: "round",
      x: legendX,
      y: legendY + 3,
      width: 10,
      height: 10,
      fill: `palette:${index}`,
      strokeWidth: 0,
      radius: boundedNumber(options.radius, 5, 0, 5),
      semantic: semantic(index, "legend"),
    });
    drawText(
      row.label,
      legendX + 22,
      legendY,
      undefined,
      400,
      legendTextWidth,
      undefined,
      semantic(index, "legend", "label"),
    );
    if (!showData)
      drawText(
        row.value,
        legendX + 22 + (legendTextWidth ?? labelWidth) + 16 + valueWidth - row.valueMetrics.width,
        legendY,
        "nodeText",
        600,
        undefined,
        row.percent,
        semantic(index, "legend", "label"),
      );
    legendY += Math.max(row.metrics.height, row.valueMetrics.height, 10) + rowGap;
  }
}
