import type { Rect } from "../../types.ts";
import { clamp, OfficialScene } from "./context.ts";
import { clearTextFromPaths } from "./text-clearance.ts";
import { narrowCynefin } from "./cynefin-narrow.ts";
interface WardleyData {
  size?: { width: number; height: number };
  evolution?: { stages: { name: string; secondName?: string; boundary?: number }[] };
  components: {
    name: string;
    visibility: number;
    evolution: number;
    inertia?: boolean;
    label?: { negX?: boolean; negY?: boolean; offsetX: number; offsetY: number };
    decorator?: { strategy: string };
  }[];
  anchors: { name: string; visibility: number; evolution: number }[];
  links: {
    from: string;
    to: string;
    arrow?: string;
    fromPort?: string;
    toPort?: string;
    linkLabel?: string;
  }[];
  accelerators: { name: string; x: number; y: number }[];
  deaccelerators: { name: string; x: number; y: number }[];
  annotation: { number: number; x: number; y: number; text: string }[];
  annotations: { x: number; y: number }[];
  evolves: { component: string; target: number }[];
  notes: { text: string; visibility: number; evolution: number }[];
  pipelines: { parent: string; components: { name: string; evolution: number }[] }[];
}
export function wardley(scene: OfficialScene, data: WardleyData): void {
  const viewport = scene.options.viewportWidth;
  const narrow = viewport !== undefined;
  const right = narrow ? viewport - scene.padding : Infinity;
  const margin = narrow
    ? scene.measure("Invisible", { fontSize: scene.fontSize * 0.8 }).width + 12
    : 85;
  const x = scene.padding + margin,
    y = scene.top + (narrow ? scene.fontSize * 2 + 16 : 20),
    w = narrow ? Math.max(80, right - x) : clamp(data.size?.width ?? 640, 240, 2400),
    h = narrow ? Math.max(540, scene.fontSize * 36) : clamp(data.size?.height ?? 420, 180, 2400);
  const labelBudget = narrow ? Math.min(140, viewport - scene.padding * 2) : 200;
  const boundedX = (px: number, width: number): number =>
    narrow ? Math.max(scene.padding, Math.min(right - width, px)) : px;
  scene.line(
    [
      { x, y },
      { x, y: y + h },
      { x: x + w, y: y + h },
    ],
    "nodeStroke",
    true,
  );
  const stages: { name: string; secondName?: string; boundary?: number }[] =
    data.evolution?.stages ??
    ["Genesis", "Custom Built", "Product", "Commodity"].map((name) => ({ name }));
  let previousBoundary = 0;
  stages.forEach((stage, i) => {
    const boundary = stage.boundary !== undefined ? clamp(stage.boundary) : (i + 1) / stages.length;
    if (i > 0)
      scene.line(
        [
          { x: x + w * previousBoundary, y },
          { x: x + w * previousBoundary, y: y + h },
        ],
        "gridStroke",
        false,
        [4, 5],
      );
    const stageWidth = narrow ? Math.max(16, w * (boundary - previousBoundary) - 8) : undefined;
    scene.text(
      narrow ? String(i + 1) : stage.name,
      x + w * previousBoundary + (narrow ? 4 : 12),
      y + h + 12,
      stageWidth,
    );
    if (stage.secondName && !narrow)
      scene.text(
        stage.secondName,
        x + w * previousBoundary + 12,
        y +
          h +
          16 +
          scene.measure(stage.name, { fontSize: scene.fontSize, maxWidth: stageWidth }).height,
        stageWidth,
        "mutedText",
      );
    previousBoundary = boundary;
  });
  let footer = y + h + (narrow ? scene.fontSize * 2 + 28 : 65);
  if (narrow)
    for (const [i, stage] of stages.entries()) {
      const label = `${i + 1}. ${stage.name}${stage.secondName ? ` · ${stage.secondName}` : ""}`;
      scene.text(label, scene.padding, footer, viewport - scene.padding * 2, "mutedText");
      const text = scene.primitives.at(-1)!;
      if (text.type === "text") footer += text.height + 8;
    }
  scene.text(
    "Visible",
    scene.padding,
    y,
    undefined,
    "nodeText",
    400,
    scene.fontSize * (narrow ? 0.8 : 1),
  );
  scene.text(
    "Invisible",
    scene.padding,
    y + h - 18,
    undefined,
    "nodeText",
    400,
    scene.fontSize * (narrow ? 0.8 : 1),
  );
  scene.text(
    "Evolution",
    boundedX(x + w / 2 - 35, scene.measure("Evolution", { fontSize: scene.fontSize }).width),
    narrow ? footer : y + h + 42,
    undefined,
    "mutedText",
  );
  if (narrow) footer += scene.fontSize * 2 + 12;
  scene.text(
    "Visibility",
    scene.padding,
    narrow ? scene.top : y + h / 2,
    narrow ? undefined : 70,
    "mutedText",
  );
  const nodes = new Map(
    [...data.components, ...data.anchors].map((c) => [
      c.name,
      { x: x + clamp(c.evolution) * w, y: y + (1 - clamp(c.visibility)) * h },
    ]),
  );
  for (const link of data.links) {
    const from = nodes.get(link.from),
      to = nodes.get(link.to);
    if (!from || !to) continue;
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    if (distance < 16) continue;
    const dx = ((to.x - from.x) / distance) * 8,
      dy = ((to.y - from.y) / distance) * 8;
    scene.primitives.push({
      type: "path",
      points: [
        { x: from.x + dx, y: from.y + dy },
        { x: to.x - dx, y: to.y - dy },
      ],
      stroke: "edgeStroke",
      strokeRole: "edge",
      semantic: {
        kind: "edge",
        id: `wardley:${link.from}:${link.to}`,
        from: `wardley:${link.from}`,
        to: `wardley:${link.to}`,
        role: "dependency",
      },
      start: link.fromPort?.includes("<") || link.arrow?.startsWith("<") ? "arrow" : "none",
      end:
        link.arrow?.includes(">") || link.fromPort?.includes(">") || link.toPort?.includes(">")
          ? "arrow"
          : "none",
    });
    const quotedLabel = link.arrow?.match(/['"]([^'"]+)['"]/)?.[1];
    if (quotedLabel)
      scene.text(quotedLabel, (from.x + to.x) / 2 + 4, (from.y + to.y) / 2 - 18, 160, "mutedText");
    if (link.linkLabel)
      scene.text(
        link.linkLabel,
        (from.x + to.x) / 2 + 4,
        (from.y + to.y) / 2 - 18,
        160,
        "mutedText",
      );
  }
  for (const pipeline of data.pipelines) {
    const parent = nodes.get(pipeline.parent);
    if (!parent || !pipeline.components.length) continue;
    const xs = pipeline.components.map((c) => x + clamp(c.evolution) * w);
    const left = Math.min(...xs),
      right = Math.max(...xs);
    scene.box(
      { x: left - 12, y: parent.y - 20, width: right - left + 24, height: 40 },
      "nodeFill",
      "nodeStroke",
      "rect",
    );
    pipeline.components.forEach((c) => {
      const px = x + clamp(c.evolution) * w;
      scene.box(
        { x: px - 5, y: parent.y - 5, width: 10, height: 10 },
        "palette:1",
        "palette:1",
        "circle",
      );
      scene.text(c.name, boundedX(px + 8, labelBudget), parent.y + 8, labelBudget);
    });
  }
  for (const evolution of data.evolves) {
    const start = nodes.get(evolution.component);
    if (start)
      scene.line(
        [
          { x: start.x + (x + clamp(evolution.target) * w >= start.x ? 8 : -8), y: start.y },
          { x: x + clamp(evolution.target) * w, y: start.y },
        ],
        "palette:0",
        true,
        [5, 4],
      );
    if (start)
      scene.primitives.at(-1)!.semantic = {
        kind: "edge",
        id: `wardley:evolve:${evolution.component}`,
        from: `wardley:${evolution.component}`,
        role: "movement",
      };
  }
  const occupied: Rect[] = narrow
    ? Array.from(nodes.values(), (p) => ({ x: p.x - 12, y: p.y - 12, width: 24, height: 24 }))
    : data.notes.map((note) => {
        const m = scene.measure(note.text, { fontSize: scene.fontSize, maxWidth: labelBudget });
        return {
          x: boundedX(x + clamp(note.evolution) * w, labelBudget),
          y: y + (1 - clamp(note.visibility)) * h,
          width: m.width + 4,
          height: m.height + 4,
        };
      });
  const overlaps = (a: Rect, b: Rect): boolean =>
    a.x < b.x + b.width + 4 &&
    a.x + a.width + 4 > b.x &&
    a.y < b.y + b.height + 4 &&
    a.y + a.height + 4 > b.y;
  if (narrow) {
    for (const annotation of data.annotation)
      occupied.push({
        x: x + clamp(annotation.x) * w - 14,
        y: y + (1 - clamp(annotation.y)) * h - 14,
        width: 28,
        height: 28,
      });
    for (const force of [...data.accelerators, ...data.deaccelerators]) {
      const m = scene.measure(force.name, { fontSize: scene.fontSize, maxWidth: labelBudget });
      occupied.push({
        x: boundedX(x + clamp(force.x) * w - 30, labelBudget),
        y: y + (1 - clamp(force.y)) * h - 25,
        width: labelBudget,
        height: m.height,
      });
    }
  }
  [...data.components, ...data.anchors].forEach((node, index) => {
    const p = nodes.get(node.name)!;
    const anchor = index >= data.components.length;
    scene.data(
      `wardley:${node.name}`,
      node.name,
      { x: p.x - 10, y: p.y - 10, width: 20, height: 20 },
      node.evolution,
      `${node.name}: visibility ${node.visibility}, evolution ${node.evolution}`,
    );
    const nodeHit = scene.interactions.at(-1)!;
    nodeHit.hit = anchor
      ? {
          type: "polygon",
          points: [
            { x: p.x, y: p.y - 10 },
            { x: p.x + 10, y: p.y },
            { x: p.x, y: p.y + 10 },
            { x: p.x - 10, y: p.y },
          ],
        }
      : { type: "circle", cx: p.x, cy: p.y, radius: 10 };
    scene.box(
      { x: p.x - 6, y: p.y - 6, width: 12, height: 12 },
      anchor ? "palette:0" : "nodeFill",
      anchor ? "palette:0" : "nodeStroke",
      anchor ? "diamond" : "circle",
    );
    scene.primitives.at(-1)!.semantic = {
      kind: "node",
      id: `wardley:${node.name}`,
      role: "component",
      part: "body",
    };
    const component = index < data.components.length ? data.components[index] : undefined;
    const label = component?.label;
    const metrics = scene.measure(node.name, { fontSize: scene.fontSize, maxWidth: labelBudget });
    const labelWidth = metrics.width + 2,
      labelHeight =
        metrics.height +
        (component?.decorator
          ? scene.measure(component.decorator.strategy, {
              fontSize: scene.fontSize * 0.8,
              maxWidth: Math.max(80, labelWidth),
            }).height + 4
          : 0);
    const preferred = {
      x: p.x + (label ? (label.negX ? -1 : 1) * label.offsetX : 10),
      y: p.y + (label ? (label.negY ? -1 : 1) * label.offsetY : -20),
      width: labelWidth,
      height: labelHeight,
    };
    const candidates = [
      preferred,
      { ...preferred, y: p.y - labelHeight - 12 },
      { ...preferred, y: p.y + 16 },
      { ...preferred, x: p.x - labelWidth - 12 },
      { ...preferred, x: p.x - labelWidth - 12, y: p.y + 16 },
      ...(narrow
        ? Array.from({ length: 12 }, (_, i) => ({
            ...preferred,
            y: p.y + (i % 2 ? 1 : -1) * (Math.floor(i / 2) + 1) * (labelHeight + 12),
          }))
        : []),
    ];
    if (narrow)
      candidates.forEach((candidate) => {
        candidate.x = boundedX(candidate.x, Math.max(80, labelWidth));
        candidate.y = Math.max(y + 24, Math.min(y + h - labelHeight - 24, candidate.y));
      });
    if (narrow)
      for (let py = y + 24; py + labelHeight < y + h - 24; py += scene.fontSize + 8) {
        for (const px of [scene.padding, boundedX(right - labelWidth, labelWidth)])
          candidates.push({ ...preferred, x: px, y: py });
      }
    const placed =
      label && !narrow
        ? preferred
        : (candidates.find((candidate) => !occupied.some((rect) => overlaps(candidate, rect))) ??
          preferred);
    occupied.push(placed);
    if (narrow && Math.hypot(placed.x - p.x, placed.y - p.y) > 50) {
      const end = {
        x: Math.max(placed.x, Math.min(placed.x + labelWidth, p.x)),
        y: Math.max(placed.y, Math.min(placed.y + labelHeight, p.y)),
      };
      const length = Math.hypot(end.x - p.x, end.y - p.y);
      if (length > 12)
        scene.line(
          [{ x: p.x + ((end.x - p.x) * 8) / length, y: p.y + ((end.y - p.y) * 8) / length }, end],
          "gridStroke",
          false,
          [2, 3],
        );
    }
    scene.text(node.name, placed.x, placed.y, labelWidth);
    scene.primitives.at(-1)!.semantic = {
      kind: "node",
      id: `wardley:${node.name}`,
      role: "component",
      part: "label",
    };
    Object.assign(scene.primitives.at(-1)!, { textOutline: { color: "background", width: 3 } });
    if (component?.decorator) {
      scene.text(
        component.decorator.strategy,
        placed.x,
        placed.y + metrics.height + 2,
        Math.max(80, labelWidth),
        "mutedText",
        400,
        scene.fontSize * 0.8,
      );
      scene.primitives.at(-1)!.semantic = {
        kind: "node",
        id: `wardley:${node.name}`,
        role: "component",
        part: "label",
      };
      Object.assign(scene.primitives.at(-1)!, { textOutline: { color: "background", width: 3 } });
    }
    if ("inertia" in node && node.inertia)
      scene.line(
        [
          { x: p.x - 12, y: p.y - 9 },
          { x: p.x - 12, y: p.y + 9 },
        ],
        "palette:0",
      );
  });
  for (const [forces, forward] of [
    [data.accelerators, true],
    [data.deaccelerators, false],
  ] as const)
    for (const force of forces) {
      const px = x + clamp(force.x) * w,
        py = y + (1 - clamp(force.y)) * h;
      scene.line(
        [
          { x: px + (forward ? -18 : 18), y: py },
          { x: px + (forward ? 18 : -18), y: py },
        ],
        forward ? "palette:2" : "palette:0",
        true,
      );
      scene.text(force.name, boundedX(px - 30, labelBudget), py - 25, labelBudget, "mutedText");
    }
  for (const annotation of data.annotation) {
    const px = x + clamp(annotation.x) * w,
      py = y + (1 - clamp(annotation.y)) * h;
    scene.box({ x: px - 10, y: py - 10, width: 20, height: 20 }, "noteFill", "accent", "circle");
    scene.text(String(annotation.number), px - 4, py - 9, undefined, "nodeText", 600);
  }
  const legend = data.annotations[0];
  if (narrow) {
    for (const label of [
      ...data.annotation.map((annotation) => `${annotation.number}. ${annotation.text}`),
      ...data.notes.map((note) => note.text),
    ]) {
      scene.text(label, scene.padding, footer, viewport - scene.padding * 2, "mutedText");
      const text = scene.primitives.at(-1)!;
      if (text.type === "text") footer += text.height + 12;
    }
  } else if (legend)
    data.annotation.forEach((annotation, i) =>
      scene.text(
        `${annotation.number}. ${annotation.text}`,
        boundedX(x + clamp(legend.x) * w, narrow ? labelBudget : 250),
        y + (1 - clamp(legend.y)) * h + i * 24,
        narrow ? labelBudget : 250,
        "mutedText",
      ),
    );
  else
    data.annotation.forEach((annotation, i) =>
      scene.text(
        `${annotation.number}. ${annotation.text}`,
        narrow ? scene.padding : x,
        footer + (narrow ? scene.fontSize * 2 + 16 + i * scene.fontSize * 4 : i * 24),
        narrow ? viewport - scene.padding * 2 : 350,
        "mutedText",
      ),
    );
  for (const note of narrow ? [] : data.notes)
    scene.text(
      note.text,
      boundedX(x + clamp(note.evolution) * w, labelBudget),
      y + (1 - clamp(note.visibility)) * h,
      labelBudget,
      "mutedText",
    );
  const cleared = clearTextFromPaths(scene.primitives);
  scene.primitives.splice(0, scene.primitives.length, ...cleared);
}
export interface CynefinData {
  domains: { domain: string; items: { label: string }[] }[];
  transitions: { from: string; to: string; label: string }[];
}
export function cynefin(scene: OfficialScene, data: CynefinData): void {
  if (
    scene.options.viewportWidth !== undefined &&
    scene.options.viewportWidth - scene.padding * 2 < 640
  ) {
    narrowCynefin(scene, data, Math.max(120, scene.options.viewportWidth - scene.padding * 2));
    return;
  }
  const x = scene.padding,
    y = scene.top,
    w = 640,
    h = 440;
  const locations = new Map<string, { x: number; y: number }>();
  const slots = ["complex", "complicated", "chaotic", "clear"];
  const subtitles = [
    ["Probe > Sense > Respond", "Emergent Practices"],
    ["Sense > Analyse > Respond", "Good Practices"],
    ["Act > Sense > Respond", "Novel Practices"],
    ["Sense > Categorise > Respond", "Best Practices"],
  ];
  slots.forEach((domain, index) => {
    const start = scene.primitives.length;
    const dx = x + ((index % 2) * w) / 2,
      dy = y + (Math.floor(index / 2) * h) / 2,
      contentOffset = index >= 2 ? 70 : 0;
    scene.data(
      `cynefin:${domain}`,
      domain[0]!.toUpperCase() + domain.slice(1),
      { x: dx, y: dy, width: w / 2, height: h / 2 },
      undefined,
      data.domains
        .find((d) => d.domain.toLowerCase() === domain)
        ?.items.map((item) => item.label)
        .join(" · ") || domain,
    );
    scene.box(
      { x: dx, y: dy, width: w / 2, height: h / 2 },
      `paletteFill:${[1, 2, 0, 3][index]}`,
      "nodeStroke",
      "rect",
    );
    scene.text(
      domain[0]!.toUpperCase() + domain.slice(1),
      dx + 18,
      dy + 14 + contentOffset,
      undefined,
      "nodeText",
      600,
    );
    scene.text(
      subtitles[index]![0]!,
      dx + 18,
      dy + 40 + contentOffset,
      w / 2 - 38,
      "mutedText",
      400,
      scene.fontSize * 0.85,
    );
    scene.text(
      subtitles[index]![1]!,
      dx + 18,
      dy + 61 + contentOffset,
      w / 2 - 38,
      "mutedText",
      400,
      scene.fontSize * 0.85,
    );
    locations.set(domain, { x: dx + w / 4, y: dy + h / 4 });
    const block = data.domains.find(
      (d) =>
        d.domain.toLowerCase() === domain ||
        (domain === "clear" && d.domain.toLowerCase() === "obvious"),
    );
    block?.items.forEach((item, i) =>
      scene.text(item.label, dx + 22, dy + 91 + contentOffset + i * 25, w / 2 - 48),
    );
    for (const primitive of scene.primitives.slice(start))
      primitive.semantic = {
        kind: "frame",
        id: `cynefin:${domain}`,
        role: "domain",
        part: primitive.type === "text" ? "label" : "body",
      };
  });
  const confusionStart = scene.primitives.length;
  const center = { x: x + w / 2, y: y + h / 2 };
  scene.box(
    { x: center.x - 150, y: center.y - 75, width: 300, height: 150 },
    "headerFill",
    "nodeStroke",
    "diamond",
  );
  scene.data(
    "cynefin:confusion",
    "Confusion",
    { x: center.x - 150, y: center.y - 75, width: 300, height: 150 },
    undefined,
    data.domains
      .find((d) => d.domain.toLowerCase() === "confusion")
      ?.items.map((item) => item.label)
      .join(" · ") || "Disorder",
  );
  scene.interactions.at(-1)!.hit = {
    type: "polygon",
    points: [
      { x: center.x, y: center.y - 75 },
      { x: center.x + 150, y: center.y },
      { x: center.x, y: center.y + 75 },
      { x: center.x - 150, y: center.y },
    ],
  };
  scene.text("Confusion", center.x - 35, center.y - 46, 80, "nodeText", 600);
  scene.text("Disorder", center.x - 26, center.y - 25, 80, "mutedText", 400, scene.fontSize * 0.85);
  const confusion = data.domains.find((d) =>
    ["confusion", "confused", "disorder"].includes(d.domain.toLowerCase()),
  );
  confusion?.items.forEach((item, i) =>
    scene.text(item.label, center.x - 95, center.y + 1 + i * 22, 190, "mutedText"),
  );
  for (const primitive of scene.primitives.slice(confusionStart))
    primitive.semantic = {
      kind: "frame",
      id: "cynefin:confusion",
      role: "domain",
      part: primitive.type === "text" ? "label" : "body",
    };
  locations.set("confused", center);
  locations.set("disorder", center);
  data.transitions.forEach((transition, index) => {
    const a = locations.get(transition.from.toLowerCase()),
      b = locations.get(transition.to.toLowerCase());
    if (!a || !b) return;
    const top = y + 170,
      bottom = y + h - 12;
    const sameRow = Math.abs(a.y - b.y) < 1;
    if (sameRow) {
      const py = a.y < center.y ? top : bottom,
        bow = a.y < center.y ? -40 : 32;
      const from = { x: a.x, y: py },
        to = { x: b.x, y: py };
      scene.primitives.push({
        type: "path",
        points: [from, to],
        curves: [
          {
            control1: { x: from.x + (to.x - from.x) / 3, y: py + bow },
            control2: { x: from.x + ((to.x - from.x) * 2) / 3, y: py + bow },
            end: to,
          },
        ],
        stroke: "palette:0",
        strokeRole: "edge",
        end: "arrow",
        dash: [4, 4],
      });
    } else {
      const px = a.x < center.x ? x + 12 : x + w - 12;
      scene.line(
        [
          { x: px, y: a.y < center.y ? top : bottom },
          { x: px, y: b.y < center.y ? top : bottom },
        ],
        "palette:0",
        true,
        [4, 4],
      );
    }
    const label = `${transition.from} > ${transition.to}: ${transition.label}`;
    scene.text(label, x + 10, y + h + 36 + index * (scene.fontSize * 1.4 + 8), w - 20, "palette:0");
  });
}
