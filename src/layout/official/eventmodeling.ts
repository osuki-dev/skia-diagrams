import { OfficialScene, reference } from "./context.ts";
interface Frame {
  $type?: string;
  name: string;
  modelEntityType: string;
  entityIdentifier: unknown;
  sourceFrames: unknown[];
  dataInlineValue?: string;
  dataReference?: unknown;
}
interface EventModelData {
  frames: Frame[];
  dataEntities: { name: string; dataBlockValue: string }[];
  noteEntities: { sourceFrame: unknown; dataBlockValue: string }[];
}
const lanes = ["ui", "command", "event"];
const laneNames: Record<string, string> = {
  ui: "UI / Automation",
  command: "Command / Read model",
  event: "Events",
};
function laneFor(type: string): string {
  const canonical = aliases[type] ?? type;
  return canonical === "processor" ? "ui" : canonical === "readmodel" ? "command" : canonical;
}
const aliases: Record<string, string> = {
  cmd: "command",
  evt: "event",
  rmo: "readmodel",
  pcr: "processor",
};
const colors: Record<string, number> = {
  ui: 7,
  command: 1,
  event: 3,
  readmodel: 2,
  processor: 5,
};
export function eventmodeling(scene: OfficialScene, data: EventModelData): void {
  const frameLabel = (frame: Frame) => reference(frame.entityIdentifier) || frame.name;
  const frameLane = (frame: Frame) => {
    const name = frameLabel(frame),
      separator = name.lastIndexOf(".");
    return separator > 0 ? `stream:${name.slice(0, separator)}` : laneFor(frame.modelEntityType);
  };
  const displayLabel = (frame: Frame) => {
    const name = frameLabel(frame);
    return frameLane(frame).startsWith("stream:") ? name.slice(name.lastIndexOf(".") + 1) : name;
  };
  const present = new Set(data.frames.map(frameLane));
  const active = [
    ...lanes.filter((lane) => present.has(lane)),
    ...Array.from(present).filter((lane) => !lanes.includes(lane)),
  ];
  const payloadFor = (frame: Frame) =>
    frame.dataInlineValue ??
    data.dataEntities.find((d) => d.name === reference(frame.dataReference))?.dataBlockValue;
  const compact = Number.isFinite(scene.options.viewportWidth);
  const viewport = scene.options.viewportWidth ?? 0;
  const boxWidth = compact
      ? Math.max(100, viewport - scene.padding * 2 - 30)
      : Math.max(145, scene.fontSize * 8),
    textWidth = boxWidth - 18;
  const boxHeights = new Map(
    data.frames.map((frame) => [
      frame.name,
      Math.max(
        76,
        scene.measure(displayLabel(frame), {
          fontSize: scene.fontSize,
          maxWidth: textWidth,
        }).height +
          scene.fontSize * 1.1 +
          30,
      ),
    ]),
  );
  const payloadHeights = new Map(
    data.frames.map((frame) => [
      frame.name,
      payloadFor(frame)
        ? scene.measure(payloadFor(frame)!, {
            fontSize: scene.fontSize * 0.75,
            maxWidth: boxWidth,
          }).height + 8
        : 0,
    ]),
  );
  const notesByFrame = new Map<string, EventModelData["noteEntities"]>();
  for (const note of data.noteEntities) {
    const name = reference(note.sourceFrame),
      notes = notesByFrame.get(name) ?? [];
    notes.push(note);
    notesByFrame.set(name, notes);
  }
  const notesFor = (frame: Frame) => notesByFrame.get(frame.name) ?? [];
  const laneHeight = Math.max(
    150,
    ...data.frames.map(
      (frame) =>
        boxHeights.get(frame.name)! +
        payloadHeights.get(frame.name)! +
        notesFor(frame).reduce(
          (h, note) =>
            h +
            scene.measure(note.dataBlockValue, {
              fontSize: scene.fontSize * 0.75,
              maxWidth: boxWidth,
            }).height +
            8,
          0,
        ) +
        58,
    ),
  );
  const lanePitch = laneHeight + 20,
    columnPitch = boxWidth + 45;
  const indices = new Map(data.frames.map((frame, index) => [frame.name, index]));
  const depth = new Map<string, number>(),
    visiting = new Set<string>(),
    frames = new Map(data.frames.map((f) => [f.name, f]));
  const rank = (frame: Frame): number => {
    if (depth.has(frame.name)) return depth.get(frame.name)!;
    if (visiting.has(frame.name)) return 0;
    visiting.add(frame.name);
    let result = indices.get(frame.name)!;
    for (const source of frame.sourceFrames) {
      const parent = frames.get(reference(source));
      if (parent) result = Math.max(result, rank(parent) + 1);
    }
    visiting.delete(frame.name);
    depth.set(frame.name, result);
    return result;
  };
  data.frames.forEach(rank);
  const occupancy = new Set<string>(),
    positions = new Map<string, { x: number; y: number }>();
  const laneTops = new Map<string, number>(),
    laneHeights = new Map<string, number>();
  const laneLabel = (lane: string) =>
    lane.startsWith("stream:") ? `Stream: ${lane.slice(7)}` : laneNames[lane]!;
  let laneY = scene.top;
  if (compact)
    for (const lane of active) {
      laneTops.set(lane, laneY);
      const headerHeight = scene.measure(laneLabel(lane), {
        fontSize: scene.fontSize,
        fontWeight: 600,
        maxWidth: boxWidth,
      }).height;
      let nextY = laneY + headerHeight + 24;
      for (const frame of data.frames.filter((frame) => frameLane(frame) === lane)) {
        positions.set(frame.name, { x: scene.padding + 10, y: nextY });
        nextY +=
          boxHeights.get(frame.name)! +
          payloadHeights.get(frame.name)! +
          notesFor(frame).reduce(
            (height, note) =>
              height +
              scene.measure(note.dataBlockValue, {
                fontSize: scene.fontSize * 0.75,
                maxWidth: boxWidth,
              }).height +
              8,
            0,
          ) +
          24;
      }
      laneHeights.set(lane, nextY - laneY);
      laneY = nextY + 20;
    }
  else
    data.frames.forEach((frame) => {
      const lane = frameLane(frame);
      let column = depth.get(frame.name)!;
      while (occupancy.has(`${lane}:${column}`)) column++;
      occupancy.add(`${lane}:${column}`);
      positions.set(frame.name, {
        x: scene.padding + 170 + column * columnPitch,
        y: scene.top + active.indexOf(lane) * lanePitch + 28,
      });
    });
  const width = compact
    ? viewport - scene.padding
    : Math.max(320, ...Array.from(positions.values(), (p) => p.x + boxWidth + 15));
  active.forEach((lane, i) => {
    const y = compact ? laneTops.get(lane)! : scene.top + i * lanePitch;
    scene.box(
      {
        x: scene.padding,
        y,
        width: width - scene.padding,
        height: compact ? laneHeights.get(lane)! : laneHeight,
      },
      "background",
      "gridStroke",
      "rect",
    );
    scene.text(
      laneLabel(lane),
      scene.padding + 10,
      y + 10,
      compact ? boxWidth : 150,
      "mutedText",
      600,
    );
  });
  const connect = (fromName: string, toName: string) => {
    const from = positions.get(fromName),
      to = positions.get(toName);
    if (!from || !to) return;
    const forward = to.x >= from.x,
      corridor = compact ? from.x + boxWidth + 8 : (from.x + to.x + boxWidth) / 2;
    // Use side ports and the empty inter-column gutter so links never cross payloads below cards.
    scene.line(
      [
        {
          x: from.x + (forward ? boxWidth + 2 : -2),
          y: from.y + boxHeights.get(fromName)! / 2,
        },
        { x: corridor, y: from.y + boxHeights.get(fromName)! / 2 },
        { x: corridor, y: to.y + boxHeights.get(toName)! / 2 },
        {
          x: to.x + (compact ? boxWidth + 2 : forward ? -2 : boxWidth + 2),
          y: to.y + boxHeights.get(toName)! / 2,
        },
      ],
      "edgeStroke",
      true,
    );
    scene.primitives.at(-1)!.semantic = {
      kind: "edge",
      id: `eventmodeling:edge:${fromName}:${toName}`,
      from: `eventmodeling:${fromName}`,
      to: `eventmodeling:${toName}`,
      role: "causal",
      row: indices.get(fromName)!,
    };
  };
  for (const frame of data.frames) {
    const previous = data.frames[indices.get(frame.name)! - 1];
    if (previous && frame.sourceFrames.length === 0 && frame.$type !== "EmResetFrame")
      connect(previous.name, frame.name);
    for (const ref of frame.sourceFrames) connect(reference(ref), frame.name);
  }
  for (const frame of data.frames) {
    const p = positions.get(frame.name)!,
      color = colors[aliases[frame.modelEntityType] ?? frame.modelEntityType] ?? 7;
    scene.data(
      `eventmodeling:${frame.name}`,
      reference(frame.entityIdentifier) || frame.name,
      { ...p, width: boxWidth, height: boxHeights.get(frame.name)! },
      undefined,
      `${frame.modelEntityType}: ${reference(frame.entityIdentifier) || frame.name} (${frame.name})`,
    );
    const bodyStart = scene.primitives.length;
    scene.box(
      { ...p, width: boxWidth, height: boxHeights.get(frame.name)! },
      `paletteFill:${color}`,
      `palette:${color}`,
      "rect",
      frame.name,
    );
    scene.text(displayLabel(frame), p.x + 9, p.y + 10, textWidth, "nodeText", 500);
    scene.text(
      frame.name,
      p.x + 9,
      p.y + boxHeights.get(frame.name)! - scene.fontSize * 0.75 * 1.4 - 8,
      textWidth,
      "mutedText",
      400,
      scene.fontSize * 0.75,
    );
    for (let i = bodyStart; i < scene.primitives.length; i++)
      scene.primitives[i]!.semantic = {
        kind: "node",
        id: `eventmodeling:${frame.name}`,
        role: "frame",
        row: indices.get(frame.name)!,
      };
    const payloadStart = scene.primitives.length;
    let detailY = p.y + boxHeights.get(frame.name)! + 8;
    const payload = payloadFor(frame);
    if (payload) {
      scene.text(payload, p.x, detailY, boxWidth, "mutedText", 400, scene.fontSize * 0.75);
      detailY += payloadHeights.get(frame.name)!;
    }
    for (const note of notesFor(frame)) {
      scene.text(
        note.dataBlockValue,
        p.x,
        detailY,
        boxWidth,
        "mutedText",
        400,
        scene.fontSize * 0.75,
      );
      detailY +=
        scene.measure(note.dataBlockValue, {
          fontSize: scene.fontSize * 0.75,
          maxWidth: boxWidth,
        }).height + 8;
    }
    for (let i = payloadStart; i < scene.primitives.length; i++)
      scene.primitives[i]!.semantic = {
        kind: "node",
        id: `eventmodeling:${frame.name}`,
        role: "payload",
        row: indices.get(frame.name)!,
      };
  }
}
