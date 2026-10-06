import type { DiagramIR, LayoutOptions, Point, Primitive, Scene, TextMeasurer } from "../types.ts";
import { runsForLines } from "../render/text.ts";
import { boundedNumber } from "./options.ts";
import { roundedPanel } from "./rounded-panel.ts";
import { placeLabels, labelIntersectsObstacle, type LabelObstacle } from "./label-placement.ts";

/** Quadrant data coordinates and styles stay authored; only annotations move. */
export function layoutQuadrant(
  ir: DiagramIR,
  primitives: Primitive[],
  fontSize: number,
  measure: TextMeasurer,
  options: LayoutOptions,
  interactions: NonNullable<Scene["interactions"]>,
  unboundedMeasure: TextMeasurer = measure,
): void {
  const compact = options.viewportWidth !== undefined && options.viewportWidth < 500;
  const headerSize = fontSize * boundedNumber(options.headerScale, compact ? 1 : 1.08, 1, 1.5);
  const path = (
    points: Point[],
    stroke?: string,
    strokeRole: "edge" | "grid" | "frame" | "series" = "edge",
  ) => primitives.push({ type: "path", points, stroke, strokeRole });
  const style = options.typeStyles?.quadrant;
  const gap = boundedNumber(style?.labelGap, 12, 8),
    dot = boundedNumber(style?.pointRadius, 4.5, 3, 12);
  // Each heading owns its quadrant width; enlarge the plot for host fonts
  // before wrapping instead of letting adjacent headings share a text box.
  const headingWidth = Math.max(
    0,
    ...ir.events
      .filter((event) => event.type === "axis-label" && event.label.startsWith("quadrant-"))
      .map(
        (event) =>
          unboundedMeasure(event.label.slice(event.label.indexOf(" ") + 1), {
            fontSize: headerSize,
            fontWeight: 600,
          }).width,
      ),
  );
  const requestedSize = Math.min(
    1200,
    Math.max(boundedNumber(style?.plotSize, 280, 160, 1200), headingWidth * 2 + gap * 4),
  );
  const axisY =
    ir.events
      .find((e) => e.type === "axis-label" && e.label.startsWith("y-axis "))
      ?.label.slice(7)
      .split(/\s*-->\s*/) ?? [];
  const axisOriginX = 8;
  const viewport = options.viewportWidth;
  const axisColumnWidth = viewport
    ? Math.max(
        48,
        ...axisY.flatMap((caption) =>
          caption
            .split(/\s+/)
            .map((word) => Math.ceil(unboundedMeasure(word, { fontSize }).width) + 2),
        ),
      )
    : undefined;
  const measureAxis = (value: string) =>
    unboundedMeasure(value, {
      fontSize,
      ...(axisColumnWidth ? { maxWidth: axisColumnWidth } : {}),
    });
  const authoredPoints = ir.data?.quadrantPoints as
    | Record<number, { className?: string; style: Record<string, string> }>
    | undefined;
  const authoredClasses = ir.data?.quadrantClasses as
    | Record<string, Record<string, string>>
    | undefined;
  const largestRadius = Math.max(
    dot,
    ...Object.values(authoredPoints ?? {}).map((point) =>
      boundedNumber(
        Number.parseFloat(
          point.style.radius ?? authoredClasses?.[point.className ?? ""]?.radius ?? String(dot),
        ),
        dot,
        1,
        48,
      ),
    ),
  );
  const left = Math.max(
    24,
    ...axisY.map((label) => Math.ceil(measureAxis(label).width) + axisOriginX + gap + 1),
    viewport ? largestRadius + (options.padding ?? 20) : 0,
  );
  const size = viewport
    ? Math.min(
        requestedSize,
        Math.max(
          80,
          viewport - left - (options.padding ?? 20) * 2 - (compact ? gap : gap * 2 + largestRadius),
        ),
      )
    : requestedSize;
  const top = 32;
  const bottom = top + size,
    right = left + size;
  const obstacles: LabelObstacle[] = [];
  const captionRows: { label: string; color: string }[] = [];
  const addMeasuredText = (
    value: string,
    x: number,
    y: number,
    metrics: ReturnType<TextMeasurer>,
    color?: string,
    size = fontSize,
    weight = 400,
  ) => {
    const primitive: Extract<Primitive, { type: "text" }> = {
      type: "text",
      text: value,
      x,
      y,
      width: metrics.width,
      height: metrics.height,
      fontSize: size,
      ...(weight !== 400 ? { fontWeight: weight } : {}),
      color,
      lineRuns: runsForLines(value, metrics.lines),
      ...(metrics.lineBaselines
        ? { lineBaselines: metrics.lineBaselines.slice(0, metrics.lines.length) }
        : {}),
    };
    primitives.push(primitive);
    obstacles.push(primitive);
  };
  for (const [quadrant, color] of [
    [1, 1],
    [2, 2],
    [3, 7],
    [4, 0],
  ] as const) {
    primitives.push(
      roundedPanel(
        {
          x: left + (quadrant === 1 || quadrant === 4 ? size / 2 : 0),
          y: top + (quadrant > 2 ? size / 2 : 0),
          width: size / 2,
          height: size / 2,
        },
        options.radius ?? 8,
        [quadrant === 2, quadrant === 1, quadrant === 4, quadrant === 3],
        `paletteFill:${color}`,
      ),
    );
  }
  primitives.push({
    type: "shape",
    shape: "round",
    x: left,
    y: top,
    width: size,
    height: size,
    fill: "transparent",
    radius: options.radius ?? 8,
    stroke: "clusterStroke",
    strokeRole: "frame",
  });
  path(
    [
      { x: left + size / 2, y: top },
      { x: left + size / 2, y: bottom },
    ],
    "gridStroke",
    "grid",
  );
  path(
    [
      { x: left, y: top + size / 2 },
      { x: right, y: top + size / 2 },
    ],
    "gridStroke",
    "grid",
  );
  const classes = ir.data?.quadrantClasses as Record<string, Record<string, string>> | undefined;
  const points = ir.events.flatMap((event, index) => {
    if (event.type === "axis-label") return [];
    const x = left + event.values![0] * size,
      y = bottom - event.values![1] * size;
    const authored = (
      ir.data?.quadrantPoints as
        | Record<number, { className?: string; style: Record<string, string> }>
        | undefined
    )?.[index];
    const pointStyle = {
      ...(authored?.className ? classes?.[authored.className] : {}),
      ...authored?.style,
    };
    const radius = boundedNumber(
      pointStyle.radius !== undefined ? Number.parseFloat(pointStyle.radius) : undefined,
      dot,
      1,
      48,
    );
    const annotation = compact ? String(interactions.length + 1) : event.label;
    const metrics = unboundedMeasure(annotation, {
      fontSize,
      maxWidth: Math.max(64, size / 2 - gap * 2),
    });
    interactions.push({
      id: `quadrant-${index}`,
      label: event.label,
      kind: "data",
      target: event.label,
      x: x - Math.max(radius, 10),
      y: y - Math.max(radius, 10),
      width: Math.max(radius, 10) * 2,
      height: Math.max(radius, 10) * 2,
      hit: { type: "circle", cx: x, cy: y, radius },
      tooltip: `(${event.values![0]}, ${event.values![1]})`,
    });
    obstacles.push({
      cx: x,
      cy: y,
      radius: radius + (Number.parseFloat(pointStyle["stroke-width"] ?? "1.5") || 0) / 2,
    });
    return [
      {
        id: `quadrant-${index}`,
        event,
        annotation,
        x,
        y,
        radius,
        pointStyle,
        metrics,
        width: metrics.width,
        height: metrics.height,
      },
    ];
  });
  for (const event of ir.events
    .filter((event) => event.type === "axis-label")
    .sort(
      (a, b) => Number(a.label.startsWith("quadrant-")) - Number(b.label.startsWith("quadrant-")),
    )) {
    const [key, ...rest] = event.label.split(" "),
      label = rest.join(" ");
    if (key.startsWith("quadrant-")) {
      const quadrant = Number(key.slice(-1));
      const headingInset = compact ? 2 : gap;
      const metrics = unboundedMeasure(label, {
        fontSize: headerSize,
        fontWeight: 600,
        maxWidth: compact
          ? Math.max(
              size / 2 - headingInset * 2,
              ...label
                .split(/\s+/)
                .map(
                  (word) =>
                    Math.ceil(
                      unboundedMeasure(word, { fontSize: headerSize, fontWeight: 600 }).width,
                    ) + 1,
                ),
            )
          : size / 2 - headingInset * 2,
      });
      const quadrantLeft = left + (quadrant === 1 || quadrant === 4 ? size / 2 : 0);
      const quadrantTop = top + (quadrant > 2 ? size / 2 : 0);
      const headingX = quadrantLeft + size / 4 - metrics.width / 2;
      let headingY: number | undefined;
      for (
        let candidateY = quadrantTop + headingInset;
        metrics.width <= size / 2 - headingInset * 2 &&
        candidateY + metrics.height <= quadrantTop + size / 2 - headingInset;
        candidateY += Math.max(4, fontSize / 2)
      ) {
        const rect = { x: headingX, y: candidateY, width: metrics.width, height: metrics.height };
        if (
          !obstacles.some((obstacle) =>
            labelIntersectsObstacle(rect, obstacle, compact ? 2 : gap / 2),
          )
        ) {
          headingY = candidateY;
          break;
        }
      }
      if (headingY === undefined && compact) {
        captionRows.push({
          label,
          color: `palette:${quadrant === 1 ? 1 : quadrant === 2 ? 2 : quadrant === 3 ? 7 : 0}`,
        });
      } else if (headingY === undefined) {
        // Extremely large authored markers may occupy an entire quadrant.
        // Keep the heading visible in a reserved gutter without moving data.
        const [placement] = placeLabels(
          [
            {
              id: key,
              x: quadrantLeft + size / 4,
              y: quadrantTop + size / 4,
              width: metrics.width,
              height: metrics.height,
            },
          ],
          {
            x: quadrantLeft + gap,
            y: quadrantTop + gap,
            width: size / 2 - gap * 2,
            height: size / 2 - gap * 2,
          },
          obstacles,
          { gap },
        );
        addMeasuredText(label, placement.x, placement.y, metrics, "headerText", headerSize, 600);
        if (placement.leader) {
          const laneX = Math.max(
            right + gap * 2,
            ...points.map((point) => point.x + point.radius + gap * 2),
          );
          const labelCenterX = placement.x + placement.width / 2;
          path(
            [
              placement.leader[0],
              { x: laneX, y: placement.leader[0].y },
              { x: laneX, y: placement.y - gap / 2 },
              { x: labelCenterX, y: placement.y - gap / 2 },
              { x: labelCenterX, y: placement.y },
            ],
            "gridStroke",
            "grid",
          );
        }
      } else addMeasuredText(label, headingX, headingY, metrics, "headerText", headerSize, 600);
    } else {
      const [low, high = ""] = label.split(/\s*-->\s*/);
      if (key === "x-axis") {
        const lowMetrics = unboundedMeasure(low, { fontSize, maxWidth: size / 2 - gap });
        const highMetrics = unboundedMeasure(high, { fontSize, maxWidth: size / 2 - gap });
        addMeasuredText(low, left, bottom + gap, lowMetrics, "mutedText");
        addMeasuredText(high, right - highMetrics.width, bottom + gap, highMetrics, "mutedText");
      } else {
        const highMeasured = measureAxis(high);
        const lowMeasured = measureAxis(low);
        // Native Paragraph replay needs an integer pixel of breathing room
        // around fractional measured advances, especially for short axis words.
        const highMetrics = { ...highMeasured, width: Math.ceil(highMeasured.width) + 1 };
        const lowMetrics = { ...lowMeasured, width: Math.ceil(lowMeasured.width) + 1 };
        addMeasuredText(high, axisOriginX, top, highMetrics, "mutedText");
        const lowY =
          bottom - lowMetrics.height >= top + highMetrics.height + gap
            ? bottom - lowMetrics.height
            : bottom + gap;
        addMeasuredText(low, axisOriginX, lowY, lowMetrics, "mutedText");
      }
    }
  }
  const gutterTop = Math.max(
    bottom + gap * 3,
    ...obstacles.map((obstacle) =>
      "radius" in obstacle
        ? obstacle.cy + obstacle.radius + gap
        : obstacle.y + obstacle.height + gap * 2,
    ),
  );
  const placements = placeLabels(
    points,
    { x: left + gap / 2, y: top + gap / 2, width: size - gap, height: size - gap },
    obstacles,
    { gap: gap / 2, gutterTop },
  );
  // Leaders replay below markers and labels; endpoints stop on marker borders.
  const leaderLaneX = Math.max(
    right + gap * 2,
    ...points.map((point) => point.x + point.radius + gap * 2),
  );
  for (let index = 0; index < placements.length; index++) {
    const placement = placements[index],
      point = points[index];
    if (compact || !placement.leader) continue;
    if (placement.y >= gutterTop) {
      const labelCenter = placement.x + placement.width / 2;
      // Route external callouts through an outer lane and the reserved gutter
      // instead of drawing a diagonal across the x-axis labels.
      path(
        [
          { x: point.x + point.radius, y: point.y },
          { x: leaderLaneX, y: point.y },
          { x: leaderLaneX, y: placement.y - gap / 2 },
          { x: labelCenter, y: placement.y - gap / 2 },
          { x: labelCenter, y: placement.y },
        ],
        "gridStroke",
        "grid",
      );
    } else path(placement.leader, "gridStroke", "grid");
  }
  for (const point of points) {
    const { x, y, radius, pointStyle, event } = point;
    primitives.push({
      type: "shape",
      shape: "circle",
      x: x - radius,
      y: y - radius,
      width: radius * 2,
      height: radius * 2,
      fill:
        pointStyle.color ??
        `palette:${event.values![1] >= 0.5 ? (event.values![0] >= 0.5 ? 1 : 2) : event.values![0] >= 0.5 ? 0 : 7}`,
      stroke: pointStyle["stroke-color"] ?? "background",
      ...(pointStyle["stroke-width"]
        ? { strokeWidth: Number.parseFloat(pointStyle["stroke-width"]) }
        : {}),
      strokeRole: "node",
    });
  }
  for (let index = 0; index < points.length; index++) {
    const point = points[index],
      placement = placements[index];
    // A compact chart uses short keys at the real data position and full names below.
    // Keys which cannot fit near their circle are represented by the legend alone.
    if (compact && placement.y >= gutterTop) continue;
    addMeasuredText(
      point.annotation,
      placement.x,
      placement.y,
      point.metrics,
      point.pointStyle["label-color"],
    );
    if (compact)
      primitives[primitives.length - 1].semantic = {
        kind: "node",
        id: point.id,
        role: "data-label",
        row: index,
      };
  }
  if (compact) {
    let legendY = Math.max(
      bottom + gap * 3,
      ...obstacles.map((obstacle) =>
        "radius" in obstacle
          ? obstacle.cy + obstacle.radius + gap
          : obstacle.y + obstacle.height + gap,
      ),
    );
    const legendWidth = viewport! - (options.padding ?? 20) * 2 - 16;
    for (const caption of captionRows) {
      const metrics = unboundedMeasure(caption.label, {
        fontSize: headerSize,
        fontWeight: 600,
        maxWidth: legendWidth - 16,
      });
      primitives.push({
        type: "shape",
        shape: "rect",
        x: 8,
        y: legendY + 3,
        width: 4,
        height: metrics.height - 6,
        fill: caption.color,
        strokeWidth: 0,
      });
      addMeasuredText(caption.label, 20, legendY, metrics, "headerText", headerSize, 600);
      legendY += metrics.height + gap / 2;
    }
    const columnWidth = (legendWidth - gap) / 2;
    for (let index = 0; index < points.length; index += 2) {
      let rowHeight = 0;
      for (let column = 0; column < 2 && index + column < points.length; column++) {
        const point = points[index + column];
        const label = `${point.annotation}  ${point.event.label}`;
        const metrics = unboundedMeasure(label, { fontSize, maxWidth: columnWidth - 12 });
        const x = 8 + column * (columnWidth + gap);
        primitives.push({
          type: "shape",
          shape: "rect",
          x,
          y: legendY + 3,
          width: 4,
          height: Math.max(4, metrics.height - 6),
          fill:
            point.pointStyle.color ??
            `palette:${point.event.values![1] >= 0.5 ? (point.event.values![0] >= 0.5 ? 1 : 2) : point.event.values![0] >= 0.5 ? 0 : 7}`,
          strokeWidth: 0,
        });
        addMeasuredText(label, x + 12, legendY, metrics, point.pointStyle["label-color"]);
        primitives[primitives.length - 1].semantic = {
          kind: "node",
          id: point.id,
          role: "data-label",
          row: index + column,
        };
        interactions.push({
          id: `${point.id}-legend`,
          label: point.event.label,
          kind: "data",
          target: point.event.label,
          x,
          y: legendY,
          width: columnWidth,
          height: metrics.height,
          tooltip: `(${point.event.values![0]}, ${point.event.values![1]})`,
        });
        rowHeight = Math.max(rowHeight, metrics.height);
      }
      legendY += rowHeight + gap / 2;
    }
  }
}
