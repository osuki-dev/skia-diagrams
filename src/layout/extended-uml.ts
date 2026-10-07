import type {
  DiagramPrimitiveSemantic,
  LayoutOptions,
  ParsedDiagram,
  Point,
  Primitive,
  Node,
  Shape,
  Rect,
  Scene,
  TextMeasurer,
} from "../types.ts";
import type { UmlData } from "../parse/extended-uml.ts";
import { renderUsecaseActor, renderUsecaseBusinessMark } from "./usecase-symbols.ts";
import { c4Grid } from "./c4-grid.ts";
import { placeLabels, type LabelObstacle } from "./label-placement.ts";
import { compoundLayout } from "./graph.ts";
import { compactTableGraph } from "./compact-table-graph.ts";
import { intersectShape } from "../render/geometry.ts";
import { layoutZenuml } from "./extended-zenuml.ts";
import {
  measureUsecaseTable,
  renderUsecaseTable,
  type UsecaseTableMetrics,
} from "./usecase-table.ts";

const requirementFieldNames = new Map([
  ["id", "ID"],
  ["text", "Text"],
  ["risk", "Risk"],
  ["verifymethod", "Verification"],
  ["type", "Type"],
  ["docref", "Doc Ref"],
]);
function requirementFieldText(key: string, value: string): string {
  const display = ["risk", "verifymethod"].includes(key)
    ? value.slice(0, 1).toUpperCase() + value.slice(1).toLowerCase()
    : value;
  return `${requirementFieldNames.get(key) ?? key}: ${display}`;
}
function requirementTypeText(type: string): string {
  return type.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^(.)/, (char) => char.toUpperCase());
}
function c4Form(metadata: UmlData["nodes"][string] | undefined): string {
  const fields = metadata?.fields;
  const words = [fields?.shape, fields?.sprite, ...(fields?.tags?.split(",") ?? [])];
  const named = words
    .filter(Boolean)
    .map((word) => word!.trim().toLowerCase())
    .find((word) =>
      [
        "person",
        "box",
        "rounded",
        "cylinder",
        "database",
        "db",
        "queue",
        "pipe",
        "component",
      ].includes(word),
    );
  if (named) return named;
  const type = metadata?.type ?? "";
  return type.startsWith("Person")
    ? "person"
    : /Db/.test(type)
      ? "db"
      : /Queue/.test(type)
        ? "queue"
        : /Component/.test(type)
          ? "component"
          : "rounded";
}
/** SysML compartments, C4 descriptions and use-case actor silhouettes share only
 * routing. Their contents and visual semantics remain type-specific. */
export function layoutExtendedUml(
  parsed: ParsedDiagram,
  measure: TextMeasurer,
  options: LayoutOptions = {},
): Scene | undefined {
  if (parsed.kind === "zenuml") return layoutZenuml(parsed, measure, options);
  if (
    !["requirement", "usecase", "c4"].includes(parsed.kind) ||
    parsed.kind === "error" ||
    parsed.kind === "unsupported"
  )
    return undefined;
  const { ir, kind } = parsed,
    fontSize = options.fontSize ?? 14,
    padding = options.padding ?? 20;
  if (ir.nodes.length > 300 || ir.clusters.length > 300 || ir.edges.length > 600)
    throw new Error("Diagram exceeds layout limits");
  const data = ir.data?.uml as UmlData | undefined;
  const requirementBudget =
    kind === "requirement" && options.viewportWidth !== undefined
      ? Math.max(
          48,
          options.viewportWidth -
            padding * 3 -
            32 -
            Math.max(24, Math.min(72, ir.edges.length * Math.max(6, fontSize * 0.4))),
        )
      : undefined;
  const effectiveNodeShape = (node: Node): Shape => {
    if (kind !== "c4") return node.shape;
    const form = c4Form(data?.nodes[node.id]);
    return ["cylinder", "database", "db"].includes(form)
      ? "cylinder"
      : ["queue", "pipe"].includes(form)
        ? "h-cyl"
        : form === "box"
          ? "rect"
          : "round";
  };
  const actorIds = new Set(ir.nodes.filter((n) => n.metadata?.role === "actor").map((n) => n.id));
  const content = new Map<
    string,
    { header: string; body: string; actor: boolean; literal: boolean }
  >();
  const sizes = new Map<string, { width: number; height: number }>();
  const actorIconHeights = new Map<string, number>();
  const tables = new Map<string, UsecaseTableMetrics>();
  for (const node of ir.nodes) {
    const metadata = data?.nodes[node.id];
    const actor = kind === "c4" ? c4Form(metadata) === "person" : actorIds.has(node.id);
    const literal =
      kind === "c4" || (kind === "usecase" && node.metadata?.labelType !== "markdown");
    let header = node.label,
      body = "";
    if (kind === "requirement" && metadata) {
      header = `<<${requirementTypeText(metadata.type)}>>\n${node.label}`;
      body = Object.entries(metadata.fields)
        .map(([key, value]) => requirementFieldText(key, value))
        .join("\n");
    }
    if (kind === "usecase" && node.metadata?.stereotype)
      header = `«${String(node.metadata.stereotype)}»\n${header}`;
    if (kind === "usecase" && node.metadata?.role === "json")
      body = ((node.metadata.dataEntries as { key: string; value: unknown }[] | undefined) ?? [])
        .map((entry) => `${entry.key}: ${String(entry.value)}`)
        .join("\n");
    if (kind === "c4" && metadata) {
      body = [
        `[${metadata.type.startsWith("Person") ? "Person" : metadata.type.startsWith("System") ? "Software System" : metadata.type.startsWith("Container") ? "Container" : "Component"}${metadata.fields.technology ? `: ${metadata.fields.technology}` : ""}]`,
        metadata.fields.description,
      ]
        .filter(Boolean)
        .join("\n");
    }
    const hm = measure(header, {
        fontSize,
        fontWeight: 600,
        maxWidth: Math.min(options.maxLabelWidth ?? 260, requirementBudget ?? Infinity),
        ...(literal ? { literal: true } : {}),
      }),
      bm = measure(body, {
        fontSize,
        maxWidth: Math.min(options.maxLabelWidth ?? 260, requirementBudget ?? Infinity),
        ...(["usecase", "c4"].includes(kind) ? { literal: true } : {}),
      });
    if (kind === "requirement" && metadata) {
      const fields = Object.entries(metadata.fields).map(([key, value]) =>
        measure(requirementFieldText(key, value), {
          fontSize,
          fontWeight: node.style?.fontWeight ?? 400,
          maxWidth: Math.min(options.maxLabelWidth ?? 260, requirementBudget ?? Infinity),
        }),
      );
      bm.height = fields.reduce((height, field) => height + field.height, 0);
      bm.width = Math.max(0, ...fields.map((field) => field.width));
    }
    const iconMetrics =
      kind === "usecase" && actor && typeof node.metadata?.icon === "string"
        ? measure(node.metadata.icon, {
            fontSize,
            maxWidth: options.maxLabelWidth ?? 260,
            literal: true,
          })
        : undefined;
    actorIconHeights.set(node.id, iconMetrics ? iconMetrics.height + 4 : 0);
    const width =
        Math.max(
          iconMetrics ? iconMetrics.width + 33 : 0,
          actor ? 120 : 160,
          hm.width + 32 + (kind === "requirement" ? 1 : 0),
          bm.width + 32 + (kind === "requirement" ? 1 : 0),
          requirementBudget === undefined ? 0 : requirementBudget + 32,
        ) / (kind === "c4" && ["queue", "pipe"].includes(c4Form(metadata)) ? 0.62 : 1),
      height =
        hm.height +
        (body ? bm.height + 24 : 0) +
        32 +
        (actor ? 64 : 0) +
        (actorIconHeights.get(node.id) ?? 0);
    // The unboxed C4 person ends at its rendered description, not the larger
    // full-size body estimate used for system cards. Otherwise its connector
    // appears to terminate in an empty band beneath the person.
    let measuredHeight = height;
    if (kind === "c4" && actor) {
      const split = body.indexOf("\n");
      const stereotype = split < 0 ? body : body.slice(0, split);
      const description = split < 0 ? "" : body.slice(split + 1);
      const bodyWidth = width - 16;
      measuredHeight =
        84 +
        measure(header, { fontSize, fontWeight: 600, maxWidth: bodyWidth, literal: true }).height +
        8 +
        measure(stereotype, { fontSize: fontSize * 0.75, maxWidth: bodyWidth, literal: true })
          .height +
        (description
          ? 8 +
            measure(description, { fontSize: fontSize * 0.82, maxWidth: bodyWidth, literal: true })
              .height
          : 0) +
        12;
    }
    sizes.set(node.id, { width, height: measuredHeight });
    if (kind === "usecase" && node.metadata?.role === "json") {
      const table = measureUsecaseTable(node, measure, fontSize, options.maxLabelWidth ?? 260);
      tables.set(node.id, table);
      sizes.set(node.id, { width: table.width, height: table.height });
    }
    content.set(node.id, { header, body, actor, literal });
  }
  // Graphlib uses ordinary object dictionaries internally. Private graph IDs
  // prevent valid authored aliases such as __proto__ from changing those maps.
  const routeIds = new Map(
    [...ir.nodes, ...ir.clusters].map((node, index) => [node.id, `uml_${index}`]),
  );
  const routeId = (id: string) => {
    const mapped = routeIds.get(id);
    if (mapped === undefined) throw new Error(`Unknown UML graph target ${id}`);
    return mapped;
  };
  const routingIR = {
    ...ir,
    nodes: ir.nodes.map((node) => ({
      ...node,
      id: routeId(node.id),
      parent: node.parent === undefined ? undefined : routeId(node.parent),
    })),
    clusters: ir.clusters.map((cluster) => ({
      ...cluster,
      id: routeId(cluster.id),
      parent: cluster.parent === undefined ? undefined : routeId(cluster.parent),
    })),
    edges: ir.edges.map((edge) => ({
      ...edge,
      label: kind === "requirement" ? `<<${edge.label}>>` : edge.label,
      from: routeId(edge.from),
      to: routeId(edge.to),
    })),
  };
  const routingSizes = new Map([...sizes].map(([id, size]) => [routeId(id), size]));
  const notes = (
    (ir.data?.notes as { target: string; text: string; labelType?: string }[] | undefined) ?? []
  ).filter((note) => routeIds.has(note.target));
  const noteIds = notes.map((note, index) => {
    const id = `uml_note_${index}`,
      target = ir.nodes.find((node) => node.id === note.target)!,
      metrics = measure(note.text, {
        fontSize,
        maxWidth: 240,
        ...(note.labelType !== "markdown" ? { literal: true } : {}),
      });
    routingIR.nodes.push({
      id,
      label: note.text,
      shape: "rect",
      parent: target.parent === undefined ? undefined : routeId(target.parent),
    });
    routingIR.edges.push({
      from: routeId(note.target),
      to: id,
      label: "",
      start: "none",
      end: "none",
      dashed: true,
    });
    routingSizes.set(id, { width: Math.ceil(metrics.width) + 25, height: metrics.height + 24 });
    return id;
  });
  const literalRoutingTexts = new Set(
    kind === "c4"
      ? [...ir.edges.map((edge) => edge.label), ...ir.clusters.map((cluster) => cluster.label)]
      : kind === "usecase"
        ? [
            ...ir.edges
              .filter((edge) => edge.metadata?.labelType !== "markdown")
              .map((edge) => edge.label),
            ...ir.clusters
              .filter(
                (cluster) =>
                  (ir.data?.boundaries as Record<string, Record<string, unknown>> | undefined)?.[
                    cluster.id
                  ]?.labelType !== "markdown",
              )
              .map((cluster) => cluster.label),
          ]
        : [],
  );
  const routingMeasure: TextMeasurer = (value, style) =>
    measure(value, { ...style, ...(literalRoutingTexts.has(value) ? { literal: true } : {}) });
  let graph =
    kind === "c4"
      ? c4Grid(routingIR, routingSizes, routingMeasure, { ...options, padding }, data?.layout)
      : compoundLayout(routingIR, routingSizes, routingMeasure, { ...options, padding });
  if (requirementBudget !== undefined)
    graph = compactTableGraph(routingIR, routingSizes, routingMeasure, options, graph);
  const primitives: Primitive[] = [];
  const interactions: NonNullable<Scene["interactions"]> = [];
  const titleHeight = ir.title
    ? measure(ir.title, { fontSize: fontSize * 1.3, fontWeight: 700 }).height + padding
    : 0;
  // Keep semantic ownership on every authored component, including helper-painted icons.
  let activeSemantic: DiagramPrimitiveSemantic | undefined;
  const emit = (primitive: Primitive) =>
    primitives.push(
      activeSemantic ? { ...primitive, semantic: primitive.semantic ?? activeSemantic } : primitive,
    );
  const ownSince = (start: number) => {
    if (activeSemantic)
      for (let index = start; index < primitives.length; index++)
        primitives[index]!.semantic ??= activeSemantic;
  };
  const text = (
    value: string,
    x: number,
    y: number,
    width: number,
    color = "nodeText",
    weight = 400,
    size = fontSize,
    literal = false,
  ) => {
    if (!value) return;
    const metrics = measure(value, {
      fontSize: size,
      fontWeight: weight,
      maxWidth: width,
      ...(literal ? { literal: true } : {}),
    });
    emit({
      type: "text",
      text: value,
      x,
      y,
      width,
      height: metrics.height,
      fontSize: size,
      fontWeight: weight,
      color,
      ...(activeSemantic ? { semantic: { ...activeSemantic, part: "label" as const } } : {}),
      ...(literal ? { literal: true } : {}),
      ...(metrics.lineBaselines ? { lineBaselines: metrics.lineBaselines } : {}),
    });
  };
  const c4Body = (body: string, x: number, y: number, width: number, color = "nodeText") => {
    const split = body.indexOf("\n"),
      stereotype = split < 0 ? body : body.slice(0, split),
      description = split < 0 ? "" : body.slice(split + 1);
    text(stereotype, x, y, width, color, 400, fontSize * 0.75, true);
    if (description)
      text(
        description,
        x,
        y + measure(stereotype, { fontSize: fontSize * 0.75, maxWidth: width }).height + 8,
        width,
        color,
        400,
        fontSize * 0.82,
        true,
      );
  };
  const line = (points: Point[], stroke = "nodeStroke") =>
    emit({ type: "path", points, stroke, strokeRole: "node" });
  const boundaryHeaders: Rect[] = [];
  for (const cluster of ir.clusters) {
    activeSemantic =
      kind === "c4" || kind === "usecase" || kind === "requirement"
        ? { kind: "frame", id: cluster.id, group: cluster.parent }
        : undefined;
    const box = graph.node(routeId(cluster.id));
    emit({
      type: "shape",
      shape: "rect",
      x: box.x - box.width / 2,
      y: box.y - box.height / 2 + titleHeight,
      width: box.width,
      height: box.height,
      fill: cluster.style?.fill ?? "clusterFill",
      stroke: cluster.style?.stroke ?? "clusterStroke",
      dash:
        kind === "c4" &&
        /^(Deployment_Node|Node)/.test(
          String(
            (ir.data?.boundaries as Record<string, { type: string }> | undefined)?.[cluster.id]
              ?.type,
          ),
        )
          ? undefined
          : [5, 4],
      strokeRole: "frame",
    });
    text(
      cluster.label,
      box.x - box.width / 2 + 12,
      box.y - box.height / 2 + 12 + titleHeight,
      box.width - 24,
      "nodeText",
      600,
      fontSize,
      literalRoutingTexts.has(cluster.label),
    );
    const header = primitives.at(-1);
    if (kind === "c4" && header?.type === "text") {
      const metrics = measure(header.text, {
        fontSize: header.fontSize,
        fontWeight: header.fontWeight,
        maxWidth: header.width,
        literal: true,
      });
      boundaryHeaders.push({
        x: header.x,
        y: header.y,
        width: metrics.width,
        height: header.height,
      });
    }
  }
  const labelRects: Rect[] = [];
  const nodeRects = ir.nodes.map((node) => {
    const box = graph.node(routeId(node.id));
    return {
      x: box.x - box.width / 2,
      y: box.y - box.height / 2 + titleHeight,
      width: box.width,
      height: box.height,
    };
  });
  // Reserve every connector, including routes whose labels are emitted later.
  // Short segment boxes approximate the actual shaft without blocking the large
  // empty triangle enclosed by a diagonal connector's full bounding box.
  const relationObstacles: LabelObstacle[] = [...nodeRects, ...boundaryHeaders];
  if (kind === "c4") {
    for (const [index, edge] of ir.edges.entries()) {
      const points = graph.edge({
        v: routeId(edge.from),
        w: routeId(edge.to),
        name: String(index),
      }).points;
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1]!,
          b = points[i]!;
        const steps = Math.max(1, Math.min(256, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 12)));
        for (let step = 0; step < steps; step++) {
          const x1 = a.x + ((b.x - a.x) * step) / steps;
          const y1 = a.y + ((b.y - a.y) * step) / steps + titleHeight;
          const x2 = a.x + ((b.x - a.x) * (step + 1)) / steps;
          const y2 = a.y + ((b.y - a.y) * (step + 1)) / steps + titleHeight;
          relationObstacles.push({
            x: Math.min(x1, x2) - 3,
            y: Math.min(y1, y2) - 3,
            width: Math.abs(x2 - x1) + 6,
            height: Math.abs(y2 - y1) + 6,
          });
        }
      }
    }
  }
  const nodeById = new Map(ir.nodes.map((node) => [node.id, node]));
  for (const [edgeIndex, edge] of ir.edges.entries()) {
    activeSemantic =
      kind === "c4" || kind === "usecase" || kind === "requirement"
        ? { kind: "edge", id: `relation:${edgeIndex}`, from: edge.from, to: edge.to }
        : undefined;
    const route = graph.edge({
      v: routeId(edge.from),
      w: routeId(edge.to),
      name: String(edgeIndex),
    });
    const from = graph.node(routeId(edge.from)),
      to = graph.node(routeId(edge.to));
    let points: Point[] = route.points.map((p: Point) => ({ ...p, y: p.y + titleHeight }));
    if (points.length >= 2) {
      const fshape = effectiveNodeShape(nodeById.get(edge.from)!),
        tshape = effectiveNodeShape(nodeById.get(edge.to)!);
      points[0] = intersectShape(
        fshape,
        {
          x: from.x - from.width / 2,
          y: from.y - from.height / 2 + titleHeight,
          width: from.width,
          height: from.height,
        },
        points[1],
        options.radius ?? 8,
      );
      points[points.length - 1] = intersectShape(
        tshape,
        {
          x: to.x - to.width / 2,
          y: to.y - to.height / 2 + titleHeight,
          width: to.width,
          height: to.height,
        },
        points[points.length - 2],
        options.radius ?? 8,
      );
    }
    emit({
      type: "path",
      points,
      start: edge.start,
      end: edge.end,
      stroke: edge.style?.stroke ?? "edgeStroke",
      strokeWidth: edge.style?.strokeWidth,
      strokeRole: "edge",
      dash: edge.dashed ? [5, 4] : edge.style?.dash,
    });
    if (edge.label) {
      const edgeLabel = kind === "requirement" ? `<<${edge.label}>>` : edge.label;
      const edgeLiteral =
        kind === "c4" || (kind === "usecase" && edge.metadata?.labelType !== "markdown");
      const measured = measure(edgeLabel, { fontSize, ...(edgeLiteral ? { literal: true } : {}) });
      const m = { ...measured, width: Math.ceil(measured.width) + 1 };
      const offset = ir.events.find(
        (e) => e.type === "relationOffset" && e.from === edge.from && e.to === edge.to,
      )?.values ?? [0, 0];
      let x = route.x - m.width / 2 + offset[0],
        y = route.y + titleHeight - m.height / 2 + offset[1];
      if (kind === "c4") {
        let placed = placeLabels(
          [
            {
              id: String(edgeIndex),
              x: x + m.width / 2,
              y: y + m.height / 2,
              width: m.width + 8,
              height: m.height + 4,
            },
          ],
          { x: 0, y: titleHeight, width: graph.graph().width, height: graph.graph().height },
          [...relationObstacles, ...labelRects],
          { gap: 8 },
        )[0]!;
        // Authored offsets can move a caption inside its endpoint card. Before
        // using the shared callout gutter, try the visible shaft's midpoint so
        // the caption remains beside the relation it describes.
        if (placed.y >= titleHeight + graph.graph().height && points.length >= 2) {
          const start = points[0]!,
            end = points.at(-1)!;
          const nearby = placeLabels(
            [
              {
                id: String(edgeIndex),
                x: (start.x + end.x) / 2,
                y: (start.y + end.y) / 2,
                width: m.width + 8,
                height: m.height + 4,
              },
            ],
            { x: 0, y: titleHeight, width: graph.graph().width, height: graph.graph().height },
            [...relationObstacles, ...labelRects],
            { gap: 8 },
          )[0]!;
          if (nearby.y < placed.y) placed = nearby;
        }
        x = placed.x + 4;
        y = placed.y + 2;
        labelRects.push(placed);
      }
      emit({
        type: "shape",
        shape: "rect",
        x: x - 4,
        y: y - 2,
        width: m.width + 8,
        height: m.height + 4,
        fill: "background",
        strokeWidth: 0,
      });
      text(edgeLabel, x, y, m.width, edge.style?.color ?? "mutedText", 400, fontSize, edgeLiteral);
    }
  }
  for (const node of ir.nodes) {
    activeSemantic =
      kind === "c4" || kind === "usecase"
        ? {
            kind: "node",
            id: node.id,
            role: String(node.metadata?.role ?? data?.nodes[node.id]?.type ?? "usecase"),
            group: node.parent,
          }
        : undefined;
    const nodeStart = primitives.length;
    const box = graph.node(routeId(node.id)),
      item = content.get(node.id)!,
      x = box.x - box.width / 2,
      y = box.y - box.height / 2 + titleHeight;
    const hasLink = typeof node.metadata?.link === "string" && Boolean(node.metadata.link);
    if (!hasLink)
      interactions.push({
        id: node.id,
        label: node.label,
        kind: "data",
        target: node.id,
        tooltip: [node.label, item.body].filter(Boolean).join("\n"),
        x,
        y,
        width: box.width,
        height: box.height,
      });
    if (kind === "requirement" && data?.nodes[node.id] && !hasLink) {
      let fieldY =
        y +
        measure(item.header, {
          fontSize,
          fontWeight: node.style?.fontWeight ?? 600,
          maxWidth: box.width - 32,
        }).height +
        32;
      for (const [key, value] of Object.entries(data.nodes[node.id].fields)) {
        const fieldHeight = measure(requirementFieldText(key, value), {
          fontSize,
          fontWeight: node.style?.fontWeight ?? 400,
          maxWidth: box.width - 32,
        }).height;
        const numeric = Number(value);
        interactions.push({
          id: `${node.id}:${key}`,
          label: `${node.label} · ${key}`,
          kind: "data",
          target: `${node.id}:${key}`,
          tooltip: `${key}: ${value}`,
          ...(value.trim() && Number.isFinite(numeric) ? { value: numeric } : {}),
          x: x + 16,
          y: fieldY,
          width: box.width - 32,
          height: fieldHeight,
        });
        fieldY += fieldHeight;
      }
    }
    if (typeof node.metadata?.link === "string" && node.metadata.link)
      interactions.push({
        id: node.id,
        label: node.label,
        kind: "link",
        target: node.metadata.link,
        x,
        y,
        width: box.width,
        height: box.height,
      });
    const palette =
      kind === "c4"
        ? data?.nodes[node.id]?.type.endsWith("_Ext")
          ? 7
          : 1
        : kind === "requirement"
          ? data?.nodes[node.id]?.type === "element"
            ? 2
            : 1
          : 1;
    const c4Shape = c4Form(data?.nodes[node.id]);
    const effectiveShape = effectiveNodeShape(node);
    const contentX = x + (effectiveShape === "h-cyl" ? box.width * 0.14 + 16 : 16),
      contentWidth = effectiveShape === "h-cyl" ? box.width * 0.62 - 32 : box.width - 32;
    if (item.actor) {
      if (kind === "usecase") {
        renderUsecaseActor(
          node,
          { x, y, width: box.width, height: box.height },
          primitives,
          options.resolveIcon,
          { fontSize, radius: options.radius, measure },
        );
        text(
          item.header,
          x + 8,
          y + 88 + (actorIconHeights.get(node.id) ?? 0),
          box.width - 16,
          node.style?.color ?? "nodeText",
          node.style?.fontWeight ?? 600,
          fontSize,
          item.literal,
        );
        ownSince(nodeStart);
        continue;
      }
      const cx = box.x,
        headY = y + 12;
      emit({
        type: "shape",
        shape: "circle",
        x: cx - 10,
        y: headY,
        width: 20,
        height: 20,
        fill: node.style?.fill ?? `paletteFill:${palette}`,
        stroke: node.style?.stroke ?? "nodeStroke",
      });
      line([
        { x: cx, y: headY + 20 },
        { x: cx, y: headY + 48 },
      ]);
      line([
        { x: cx - 20, y: headY + 30 },
        { x: cx + 20, y: headY + 30 },
      ]);
      line([
        { x: cx, y: headY + 48 },
        { x: cx - 18, y: headY + 66 },
      ]);
      line([
        { x: cx, y: headY + 48 },
        { x: cx + 18, y: headY + 66 },
      ]);
      text(
        item.header,
        x + 8,
        y + 84,
        box.width - 16,
        node.style?.color ?? "nodeText",
        node.style?.fontWeight ?? 600,
        fontSize,
        item.literal,
      );
      if (item.body)
        c4Body(
          item.body,
          x + 8,
          y +
            84 +
            measure(item.header, { fontSize, fontWeight: 600, maxWidth: box.width - 16 }).height +
            8,
          box.width - 16,
          node.style?.color ?? "nodeText",
        );
      ownSince(nodeStart);
      continue;
    }
    emit({
      type: "shape",
      shape: effectiveShape,
      x,
      y,
      width: box.width,
      height: box.height,
      radius: options.radius ?? 8,
      fill: node.style?.fill ?? `paletteFill:${palette}`,
      stroke: node.style?.stroke ?? "nodeStroke",
      strokeWidth: node.style?.strokeWidth,
      dash: node.style?.dash,
      id: node.id,
    });
    if (kind === "c4" && c4Shape === "component") {
      for (const dy of [10, 28])
        emit({
          type: "shape",
          shape: "rect",
          x: x - 5,
          y: y + dy,
          width: 16,
          height: 10,
          fill: node.style?.fill ?? `paletteFill:${palette}`,
          stroke: node.style?.stroke ?? "nodeStroke",
        });
    }
    if (kind === "usecase")
      renderUsecaseBusinessMark(node, { x, y, width: box.width, height: box.height }, primitives);
    const table = tables.get(node.id);
    if (table) {
      renderUsecaseTable(
        node,
        { x, y, width: box.width, height: box.height },
        table,
        measure,
        fontSize,
        primitives,
        interactions,
      );
      ownSince(nodeStart);
      continue;
    }
    const hm = measure(item.header, {
      fontSize,
      fontWeight: 600,
      maxWidth: contentWidth,
      ...(item.literal ? { literal: true } : {}),
    });
    text(
      item.header,
      contentX,
      y + 16,
      contentWidth,
      node.style?.color ?? "nodeText",
      node.style?.fontWeight ?? 600,
      fontSize,
      item.literal,
    );
    if (kind === "requirement")
      primitives.at(-1)!.semantic = { kind: "node", id: node.id, part: "label", role: "header" };
    if (item.body) {
      const separator = y + hm.height + 24;
      if (kind === "requirement")
        line(
          [
            { x, y: separator },
            { x: x + box.width, y: separator },
          ],
          node.style?.stroke ?? "nodeStroke",
        );
      if (kind === "c4")
        c4Body(item.body, contentX, separator + 8, contentWidth, node.style?.color ?? "nodeText");
      else if (kind === "requirement" && data?.nodes[node.id]) {
        let fieldY = separator + 8;
        for (const [row, [key, value]] of Object.entries(data.nodes[node.id].fields).entries()) {
          const label = requirementFieldText(key, value);
          text(
            label,
            x + 16,
            fieldY,
            box.width - 32,
            node.style?.color ?? "nodeText",
            node.style?.fontWeight ?? 400,
          );
          primitives.at(-1)!.semantic = {
            kind: "node",
            id: node.id,
            part: "label",
            role: key.toLowerCase(),
            row,
          };
          fieldY += measure(label, {
            fontSize,
            fontWeight: node.style?.fontWeight ?? 400,
            maxWidth: box.width - 32,
          }).height;
        }
      } else
        text(
          item.body,
          x + 16,
          separator + 8,
          box.width - 32,
          node.style?.color ?? "nodeText",
          node.style?.fontWeight ?? 400,
          fontSize,
          kind === "usecase",
        );
    }
    ownSince(nodeStart);
    if (kind === "requirement") {
      const frame = primitives
        .slice(nodeStart)
        .find((primitive) => primitive.type === "shape" && primitive.id === node.id);
      if (frame?.type === "shape")
        primitives.push({
          ...frame,
          fill: "transparent",
          semantic: { kind: "frame", id: node.id, role: "table" },
        });
    }
  }
  for (const [index, note] of notes.entries()) {
    activeSemantic =
      kind === "usecase"
        ? { kind: "node", id: `note:${index}`, role: "note", group: note.target }
        : undefined;
    const box = graph.node(noteIds[index]),
      x = box.x - box.width / 2,
      y = box.y - box.height / 2 + titleHeight;
    const route = graph.edge({
      v: routeId(note.target),
      w: noteIds[index],
      name: String(ir.edges.length + index),
    });
    if (route)
      emit({
        type: "path",
        points: route.points.map((point: Point) => ({ ...point, y: point.y + titleHeight })),
        semantic:
          kind === "usecase"
            ? { kind: "edge", id: `note-link:${index}`, from: note.target, to: `note:${index}` }
            : undefined,
        stroke: "clusterStroke",
        dash: [5, 4],
        strokeRole: "edge",
      });
    emit({
      type: "shape",
      shape: "rect",
      x,
      y,
      width: box.width,
      height: box.height,
      fill: "noteFill",
      stroke: "clusterStroke",
    });
    text(
      note.text,
      x + 12,
      y + 12,
      box.width - 24,
      "noteText",
      400,
      fontSize,
      note.labelType !== "markdown",
    );
  }
  activeSemantic = undefined;
  if (ir.title)
    text(
      ir.title,
      padding,
      padding,
      Math.max(
        200,
        ...graph.nodes().map((id: string) => {
          const box = graph.node(id);
          return box.x + box.width / 2;
        }),
      ),
      "nodeText",
      700,
      fontSize * 1.3,
    );
  let maxX = padding,
    maxY = padding,
    minX = 0,
    minY = 0;
  for (const p of primitives) {
    if (p.type === "path") {
      for (const point of p.points) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }
    } else {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + p.width);
      maxY = Math.max(maxY, p.y + p.height);
    }
  }
  return {
    kind,
    bounds: {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
    },
    primitives,
    ...(interactions.length ? { interactions } : {}),
    accessibilityLabel: [
      ir.data?.accessibilityTitle,
      ir.title,
      ir.description,
      ...ir.nodes.map((n) => n.label),
      ...ir.edges.map((e) => e.label),
    ]
      .filter(Boolean)
      .join(". "),
  };
}
