import { compactIshikawa } from "./ishikawa-compact.ts";
import type {
  DiagramInteraction,
  LayoutOptions,
  ParsedDiagram,
  Point,
  Primitive,
  Scene,
  TextMeasurer,
} from "../types.ts";
import type { Cause, VennRegion } from "../parse/extended-sets.ts";

/** Circle intersection area, used to respect authored set and overlap sizes. */
export function circleOverlap(a: number, b: number, distance: number): number {
  if (distance >= a + b) return 0;
  if (distance <= Math.abs(a - b)) return Math.PI * Math.min(a, b) ** 2;
  const clamp = (value: number) => Math.max(-1, Math.min(1, value));
  return (
    a * a * Math.acos(clamp((distance * distance + a * a - b * b) / (2 * distance * a))) +
    b * b * Math.acos(clamp((distance * distance + b * b - a * a) / (2 * distance * b))) -
    Math.sqrt(
      Math.max(
        0,
        (-distance + a + b) * (distance + a - b) * (distance - a + b) * (distance + a + b),
      ),
    ) /
      2
  );
}
function overlapDistance(a: number, b: number, area: number) {
  let low = Math.abs(a - b),
    high = a + b;
  for (let i = 0; i < 50; i++) {
    const middle = (low + high) / 2;
    if (circleOverlap(a, b, middle) > area) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}
export function layoutExtendedSets(
  parsed: ParsedDiagram,
  measure: TextMeasurer,
  options: LayoutOptions = {},
): Scene | undefined {
  if (parsed.kind !== "venn" && parsed.kind !== "ishikawa") return undefined;
  if (parsed.kind === "ishikawa" && options.viewportWidth)
    return compactIshikawa(parsed, measure, options);
  const fontSize = options.fontSize ?? 14,
    padding = options.padding ?? 20;
  const primitives: Primitive[] = [];
  const interactions: DiagramInteraction[] = [];
  const text = (
    value: string,
    x: number,
    y: number,
    color = "nodeText",
    weight = 400,
    centered = false,
  ) => {
    const metrics = measure(value, {
      fontSize,
      fontWeight: weight,
      maxWidth:
        parsed.kind === "venn" && options.viewportWidth
          ? Math.max(60, options.viewportWidth - padding - (centered ? padding : x) - 1)
          : (options.maxLabelWidth ?? 260),
    });
    const textWidth = Math.ceil(metrics.width) + 1;
    primitives.push({
      type: "text",
      text: metrics.lines.join("\n"),
      x: centered ? x - textWidth / 2 : x,
      y,
      width: textWidth,
      height: metrics.height,
      fontSize,
      fontWeight: weight,
      color,
      ...(metrics.lineBaselines ? { lineBaselines: metrics.lineBaselines } : {}),
    });
    return metrics;
  };
  let width = 0,
    height = 0;
  const titleHeight = parsed.ir.title
    ? text(parsed.ir.title, padding, padding, "nodeText", 700).height + padding
    : 0;
  if (parsed.kind === "venn") {
    const regions = parsed.ir.data?.regions as VennRegion[];
    if (!regions) throw new Error("Missing Venn semantic data");
    const sets = regions.filter((region) => region.sets.length === 1);
    const maximum = Math.max(...sets.map((set) => set.size));
    // Circle geometry grows with typography, keeping neighboring region labels
    // readable when a host increases fontSize instead of fixing the radii at 150.
    const radius = 150 * Math.max(1, fontSize / 14);
    const scale = (radius ** 2 * Math.PI) / maximum;
    const radii = sets.map((set) => Math.sqrt((set.size * scale) / Math.PI));
    const positions: Point[] = sets.map((_, i) => ({
      x: Math.cos((i * Math.PI * 2) / sets.length) * ((radius * 2) / 3),
      y: Math.sin((i * Math.PI * 2) / sets.length) * ((radius * 2) / 3),
    }));
    const distances = sets.map((left, i) =>
      sets.map((right, j) => {
        if (i === j) return 0;
        const union = regions.find(
          (region) =>
            region.sets.length === 2 &&
            region.sets.includes(left.id) &&
            region.sets.includes(right.id),
        );
        const implied = regions
          .filter((region) => region.sets.includes(left.id) && region.sets.includes(right.id))
          .reduce((value, region) => Math.max(value, region.size), 0);
        return overlapDistance(radii[i], radii[j], (union?.size ?? implied) * scale);
      }),
    );
    // Deterministic stress relaxation: pair constraints include implied overlaps
    // from higher-arity regions, rather than dropping those regions from the drawing.
    const iterations = Math.min(
      350,
      Math.max(48, Math.floor(80_000 / Math.max(1, (sets.length * (sets.length - 1)) / 2))),
    );
    for (let iteration = 0; iteration < iterations; iteration++)
      for (let i = 0; i < sets.length; i++)
        for (let j = i + 1; j < sets.length; j++) {
          const dx = positions[j].x - positions[i].x,
            dy = positions[j].y - positions[i].y;
          const length = Math.max(0.001, Math.hypot(dx, dy));
          const change = ((length - distances[i][j]) / length) * 0.12;
          positions[i].x += dx * change;
          positions[i].y += dy * change;
          positions[j].x -= dx * change;
          positions[j].y -= dy * change;
        }
    const rawMinX = Math.min(...positions.map((point, i) => point.x - radii[i]));
    const rawMaxX = Math.max(...positions.map((point, i) => point.x + radii[i]));
    const geometryScale = options.viewportWidth
      ? Math.min(1, Math.max(80, options.viewportWidth - padding * 2) / (rawMaxX - rawMinX))
      : 1;
    if (geometryScale < 1)
      for (let i = 0; i < sets.length; i++) {
        positions[i].x *= geometryScale;
        positions[i].y *= geometryScale;
        radii[i] *= geometryScale;
      }
    const minX = Math.min(...positions.map((point, i) => point.x - radii[i]));
    const minY = Math.min(...positions.map((point, i) => point.y - radii[i]));
    for (const point of positions) {
      point.x += padding - minX;
      point.y += padding + titleHeight - minY;
    }
    width = Math.max(...positions.map((point, i) => point.x + radii[i])) + padding;
    height = Math.max(...positions.map((point, i) => point.y + radii[i])) + padding;
    sets.forEach((set, i) => {
      const center = positions[i],
        radius = radii[i],
        tangent = radius * 0.5522847498307936;
      primitives.push({
        type: "shape",
        shape: "circle",
        id: set.id,
        x: center.x - radius,
        y: center.y - radius,
        width: radius * 2,
        height: radius * 2,
        fill: `palette:${i}`,
        ...set.style,
        strokeWidth: 0,
        opacity: set.opacity ?? 0.35,
        semantic: { kind: "node", id: set.id, role: "venn-fill", row: i },
      });
      const start = { x: center.x, y: center.y - radius };
      primitives.push({
        type: "path",
        points: [start],
        closed: true,
        curves: [
          {
            control1: { x: center.x + tangent, y: center.y - radius },
            control2: { x: center.x + radius, y: center.y - tangent },
            end: { x: center.x + radius, y: center.y },
          },
          {
            control1: { x: center.x + radius, y: center.y + tangent },
            control2: { x: center.x + tangent, y: center.y + radius },
            end: { x: center.x, y: center.y + radius },
          },
          {
            control1: { x: center.x - tangent, y: center.y + radius },
            control2: { x: center.x - radius, y: center.y + tangent },
            end: { x: center.x - radius, y: center.y },
          },
          {
            control1: { x: center.x - radius, y: center.y - tangent },
            control2: { x: center.x - tangent, y: center.y - radius },
            end: start,
          },
        ],
        stroke: set.style.stroke ?? `palette:${i}`,
        strokeWidth: set.style.strokeWidth,
        strokeRole: "node",
        opacity: set.opacity ?? 0.35,
        semantic: { kind: "frame", id: set.id, role: "venn-contour", row: i },
      });
    });
    const regionTextBounds: { x: number; y: number; width: number; height: number }[] = [];
    const legendRegions: VennRegion[] = [];
    for (const region of regions) {
      const included = sets.map((set) => region.sets.includes(set.id));
      let best: Point | undefined,
        score = -Infinity;
      // A global distance-evaluation budget avoids a source-dependent raster scan.
      // Restrict each region's search to the intersection of its included circles.
      const indices = included.flatMap((contains, i) => (contains ? [i] : []));
      const left = Math.max(...indices.map((i) => positions[i].x - radii[i]));
      const right = Math.min(...indices.map((i) => positions[i].x + radii[i]));
      const top = Math.max(...indices.map((i) => positions[i].y - radii[i]));
      const bottom = Math.min(...indices.map((i) => positions[i].y + radii[i]));
      if (right < left || bottom < top)
        throw new Error(`Venn region ${region.id} cannot be represented by overlapping circles`);
      const samples = Math.max(
        32,
        Math.min(4096, Math.floor(600_000 / (regions.length * sets.length))),
      );
      const aspect = Math.max(0.01, (right - left) / Math.max(1, bottom - top));
      const columns = Math.max(1, Math.min(samples, Math.ceil(Math.sqrt(samples * aspect))));
      const rows = Math.max(1, Math.floor(samples / columns));
      for (let row = 0; row < rows; row++)
        for (let column = 0; column < columns; column++) {
          const x = left + ((column + 0.5) / columns) * (right - left);
          const y = top + ((row + 0.5) / rows) * (bottom - top);
          let clearance = Infinity;
          for (let i = 0; i < sets.length; i++) {
            const insideDistance = radii[i] - Math.hypot(x - positions[i].x, y - positions[i].y);
            clearance = Math.min(clearance, included[i] ? insideDistance : -insideDistance);
          }
          if (clearance > score) {
            score = clearance;
            best = { x, y };
          }
        }
      if (!best || score < 0) {
        // Nested circles can have no exclusive region. Projection finds a point
        // in the requested intersection without fabricating a disjoint overlap.
        const candidate = {
          x: indices.reduce((sum, i) => sum + positions[i].x, 0) / indices.length,
          y: indices.reduce((sum, i) => sum + positions[i].y, 0) / indices.length,
        };
        for (let iteration = 0; iteration < 48; iteration++)
          for (const i of indices) {
            const dx = candidate.x - positions[i].x,
              dy = candidate.y - positions[i].y;
            const distance = Math.hypot(dx, dy);
            if (distance > radii[i]) {
              candidate.x = positions[i].x + (dx * radii[i]) / distance;
              candidate.y = positions[i].y + (dy * radii[i]) / distance;
            }
          }
        if (
          indices.some(
            (i) =>
              Math.hypot(candidate.x - positions[i].x, candidate.y - positions[i].y) >
              radii[i] + 0.01,
          )
        )
          throw new Error(`Venn region ${region.id} cannot be represented by overlapping circles`);
        best = candidate;
      }
      interactions.push({
        id: `venn:${region.id}`,
        target: region.id,
        kind: "data",
        label: region.label,
        tooltip: [
          region.label,
          region.sets.length > 1 ? `Intersection: ${region.sets.join(" ∩ ")}` : `Set: ${region.id}`,
          region.authoredSize === undefined ? undefined : `Size: ${region.authoredSize}`,
          ...region.texts.map((item) => item.label),
        ]
          .filter(Boolean)
          .join("\n"),
        ...(region.authoredSize === undefined ? {} : { value: region.authoredSize }),
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
        hit: {
          type: "venn",
          circles: positions.map((point, i) => ({
            cx: point.x,
            cy: point.y,
            radius: radii[i],
            included: included[i],
          })),
        },
      });
      let textHeight = measure(region.label, {
        fontSize,
        fontWeight: 600,
        maxWidth: options.maxLabelWidth ?? 260,
      }).height;
      let textWidth = measure(region.label, {
        fontSize,
        fontWeight: 600,
        maxWidth: options.maxLabelWidth ?? 260,
      }).width;
      for (const item of region.texts) {
        const metrics = measure(item.label, { fontSize, maxWidth: options.maxLabelWidth ?? 260 });
        textHeight += metrics.height + 4;
        textWidth = Math.max(textWidth, metrics.width);
      }
      const labelBounds = {
        x: best.x - textWidth / 2 - 1,
        y: best.y - textHeight / 2,
        width: textWidth + 2,
        height: textHeight,
      };
      const corners = [
        [labelBounds.x, labelBounds.y],
        [labelBounds.x + labelBounds.width, labelBounds.y],
        [labelBounds.x, labelBounds.y + labelBounds.height],
        [labelBounds.x + labelBounds.width, labelBounds.y + labelBounds.height],
      ];
      const inRegion = corners.every(([x, y]) =>
        positions.every((point, index) =>
          included[index]
            ? Math.hypot(x - point.x, y - point.y) < radii[index] - 2
            : Math.hypot(x - point.x, y - point.y) > radii[index] + 2,
        ),
      );
      const collides = regionTextBounds.some(
        (label) =>
          labelBounds.x < label.x + label.width + 4 &&
          labelBounds.x + labelBounds.width + 4 > label.x &&
          labelBounds.y < label.y + label.height + 4 &&
          labelBounds.y + labelBounds.height + 4 > label.y,
      );
      if (options.viewportWidth && (!inRegion || collides)) {
        legendRegions.push(region);
      } else {
        regionTextBounds.push(labelBounds);
        let y = best.y - textHeight / 2;
        y += text(region.label, best.x, y, region.style.color ?? "nodeText", 600, true).height;
        for (const item of region.texts)
          y +=
            text(
              item.label,
              best.x,
              y + 4,
              item.style.color ?? region.style.color ?? "nodeText",
              400,
              true,
            ).height + 4;
      }
    }
    let legendY = height + 12;
    for (const region of legendRegions) {
      for (const [index, setId] of region.sets.entries()) {
        const tint = sets.findIndex((set) => set.id === setId);
        primitives.push({
          type: "shape",
          shape: "rect",
          x: padding + index * 4,
          y: legendY + 4,
          width: 3,
          height: fontSize,
          fill: `palette:${tint}`,
          strokeWidth: 0,
        });
      }
      const legendX = padding + region.sets.length * 4 + 8;
      const metrics = text(region.label, legendX, legendY, region.style.color ?? "nodeText", 600);
      legendY += metrics.height + 4;
      if (region.sets.length > 1 || region.label !== region.sets[0]) {
        const meaning =
          region.sets.length > 1
            ? `Intersection: ${region.sets.join(" & ")}`
            : `Set: ${region.sets[0]}`;
        legendY += text(meaning, padding, legendY, "mutedText").height + 4;
      }
      if (region.authoredSize !== undefined)
        legendY += text(`Size: ${region.authoredSize}`, padding, legendY, "mutedText").height + 4;
      for (const item of region.texts)
        legendY +=
          text(item.label, padding, legendY, item.style.color ?? region.style.color ?? "nodeText")
            .height + 4;
      legendY += 12;
    }
  } else {
    const root = parsed.ir.data?.root as Cause;
    if (!root) throw new Error("Missing Ishikawa semantic data");
    const interactWithLastLabel = (cause: Cause, ancestors: string[]) => {
      const label = primitives.at(-1);
      if (label?.type !== "text") throw new Error("Ishikawa interaction requires a measured label");
      interactions.push({
        id: `ishikawa:${cause.id}`,
        target: cause.id,
        label: cause.label,
        kind: "data",
        tooltip:
          [...ancestors, cause.label].join(" → ") +
          (cause.children.length
            ? `\nCauses: ${cause.children.map((child) => child.label).join(", ")}`
            : ""),
        x: label.x,
        y: label.y,
        width: label.width,
        height: label.height,
      });
    };
    const categoryColumns = Math.ceil(root.children.length / 2);
    const categoryWidths = root.children.map((cause) => {
      const labels: string[] = [];
      const collect = (item: Cause) => {
        labels.push(item.label);
        item.children.forEach(collect);
      };
      collect(cause);
      return Math.max(240, ...labels.map((value) => measure(value, { fontSize }).width + 70));
    });
    const columns = Array.from({ length: categoryColumns }, (_, i) =>
      Math.max(categoryWidths[i * 2] ?? 240, categoryWidths[i * 2 + 1] ?? 240),
    );
    const depthCount = (cause: Cause): number =>
      1 + cause.children.reduce((sum, child) => sum + depthCount(child), 0);
    const depth = Math.max(...root.children.map(depthCount));
    const maximumLabelHeight = Math.max(
      fontSize * 1.4,
      ...parsed.ir.nodes.map(
        (node) =>
          measure(node.label, { fontSize, fontWeight: 600, maxWidth: options.maxLabelWidth ?? 260 })
            .height,
      ),
    );
    const branchHeight = Math.max(190, depth * (maximumLabelHeight + 12));
    const spineY = padding + titleHeight + branchHeight;
    const problemMetrics = measure(root.label, { fontSize, fontWeight: 700 });
    const spineEnd = padding + columns.reduce((sum, value) => sum + value, 0) + 70;
    width = spineEnd + problemMetrics.width + 48 + padding;
    height = spineY + branchHeight + padding;
    primitives.push({
      type: "path",
      points: [
        { x: padding, y: spineY },
        { x: spineEnd, y: spineY },
      ],
      stroke: "edgeStroke",
      end: "arrow",
      strokeRole: "edge",
    });
    primitives.push({
      type: "shape",
      shape: "round",
      x: spineEnd + 8,
      y: spineY - problemMetrics.height / 2 - 12,
      width: problemMetrics.width + 32,
      height: problemMetrics.height + 24,
      fill: "paletteFill:0",
      stroke: "accent",
    });
    text(root.label, spineEnd + 24, spineY - problemMetrics.height / 2, "nodeText", 700);
    interactWithLastLabel(root, []);
    root.children.forEach((category, index) => {
      const column = Math.floor(index / 2),
        sign = index % 2 === 0 ? -1 : 1;
      const anchorX = padding + columns.slice(0, column + 1).reduce((sum, value) => sum + value, 0);
      const branchTop = { x: anchorX - 100, y: spineY + sign * (branchHeight - 35) };
      primitives.push({
        type: "path",
        points: [{ x: anchorX, y: spineY }, branchTop],
        stroke: `palette:${index}`,
        strokeRole: "edge",
      });
      text(
        category.label,
        branchTop.x,
        branchTop.y + (sign < 0 ? -fontSize * 1.8 : 8),
        `palette:${index}`,
        700,
        true,
      );
      interactWithLastLabel(category, [root.label]);
      let row = 0;
      const count = depthCount(category) - 1;
      const addCause = (cause: Cause, parent: Point, level: number, ancestors: string[]) => {
        row++;
        const fraction = row / (count + 1);
        const rowY = spineY + sign * (branchHeight - 35) * fraction;
        const point =
          level === 1 ? { x: anchorX - 100 * fraction, y: rowY } : { x: parent.x, y: rowY };
        if (level > 1)
          primitives.push({
            type: "path",
            points: [parent, point],
            stroke: `palette:${index}`,
            strokeRole: "edge",
          });
        const end = { x: point.x - 30 - level * 16, y: point.y };
        primitives.push({
          type: "path",
          points: [point, end],
          stroke: `palette:${index}`,
          strokeRole: "edge",
        });
        const metrics = measure(cause.label, {
          fontSize,
          fontWeight: cause.children.length ? 600 : 400,
          maxWidth: options.maxLabelWidth ?? 260,
        });
        text(
          cause.label,
          end.x - metrics.width - 8,
          end.y - metrics.height / 2,
          "nodeText",
          cause.children.length ? 600 : 400,
        );
        interactWithLastLabel(cause, ancestors);
        cause.children.forEach((child) =>
          addCause(child, end, level + 1, [...ancestors, cause.label]),
        );
      };
      category.children.forEach((cause) =>
        addCause(cause, branchTop, 1, [root.label, category.label]),
      );
    });
  }
  // Include measured labels, not merely the skeletal geometry, in camera bounds.
  let minX = 0,
    minY = 0;
  for (const primitive of primitives) {
    if (primitive.type === "path")
      for (const point of primitive.points) {
        minX = Math.min(minX, point.x - padding);
        minY = Math.min(minY, point.y - padding);
        width = Math.max(width, point.x + padding);
        height = Math.max(height, point.y + padding);
      }
    else {
      minX = Math.min(minX, primitive.x - padding);
      minY = Math.min(minY, primitive.y - padding);
      width = Math.max(width, primitive.x + primitive.width + padding);
      height = Math.max(height, primitive.y + primitive.height + padding);
    }
  }
  return {
    kind: parsed.kind,
    bounds: { x: minX, y: minY, width: width - minX, height: height - minY },
    primitives,
    ...(interactions.length ? { interactions } : {}),
    accessibilityLabel: [
      parsed.ir.title,
      ...primitives
        .filter((primitive) => primitive.type === "text")
        .map((primitive) => primitive.text),
    ]
      .filter(Boolean)
      .join(". "),
  };
}
