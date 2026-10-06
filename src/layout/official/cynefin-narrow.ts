import { OfficialScene } from "./context.ts";
import type { CynefinData } from "./maps.ts";

/** Preserve the domain matrix while reserving a complete central confusion band. */
export function narrowCynefin(scene: OfficialScene, data: CynefinData, width: number): void {
  const x = scene.padding,
    top = scene.top,
    column = width / 2,
    inset = 12;
  const names = ["complex", "complicated", "chaotic", "clear"];
  const strategies = [
    ["Probe > Sense > Respond", "Emergent Practices"],
    ["Sense > Analyse > Respond", "Good Practices"],
    ["Act > Sense > Respond", "Novel Practices"],
    ["Sense > Categorise > Respond", "Best Practices"],
  ];
  const contents = names.map((name, i) => [
    name[0]!.toUpperCase() + name.slice(1),
    ...strategies[i]!,
    ...(data.domains
      .find(
        (d) =>
          d.domain.toLowerCase() === name ||
          (name === "clear" && d.domain.toLowerCase() === "obvious"),
      )
      ?.items.map((item) => item.label) ?? []),
  ]);
  const heights = contents.map((lines) =>
    lines.map(
      (line, i) =>
        scene.measure(line, {
          fontSize: scene.fontSize * (i === 1 || i === 2 ? 0.85 : 1),
          maxWidth: column - inset * 2,
        }).height,
    ),
  );
  const rowHeights = [0, 1].map((row) =>
    Math.max(
      ...[row * 2, row * 2 + 1].map(
        (i) => heights[i]!.reduce((a, b) => a + b, 0) + contents[i]!.length * 10 + inset * 2,
      ),
    ),
  );
  const confusion = data.domains.find((d) =>
    ["confusion", "confused", "disorder"].includes(d.domain.toLowerCase()),
  );
  const centerLines = [
    "Confusion",
    "Disorder",
    ...(confusion?.items.map((item) => item.label) ?? []),
  ];
  const centerWidth = width * 0.5;
  const centerHeights = centerLines.map(
    (line) => scene.measure(line, { fontSize: scene.fontSize, maxWidth: centerWidth }).height,
  );
  const centerTextHeight = centerHeights.reduce((a, b) => a + b, 0) + (centerLines.length - 1) * 8;
  const centerHeight = Math.max(120, centerTextHeight * 2 + 32);
  const centerY = top + rowHeights[0]! + centerHeight / 2;
  names.forEach((name, i) => {
    const start = scene.primitives.length;
    const dx = x + (i % 2) * column,
      dy = i < 2 ? top : top + rowHeights[0]! + centerHeight;
    const height = rowHeights[Math.floor(i / 2)]!;
    scene.box(
      { x: dx, y: dy, width: column, height },
      `paletteFill:${[1, 2, 0, 3][i]}`,
      "nodeStroke",
      "rect",
      `cynefin:${name}`,
    );
    scene.data(
      `cynefin:${name}`,
      contents[i]![0]!,
      { x: dx, y: dy, width: column, height },
      undefined,
      contents[i]!.slice(3).join(" · ") || name,
    );
    let py = dy + inset;
    contents[i]!.forEach((line, j) => {
      scene.text(
        line,
        dx + inset,
        py,
        column - inset * 2,
        j === 1 || j === 2 ? "mutedText" : "nodeText",
        j === 0 ? 600 : 400,
        scene.fontSize * (j === 1 || j === 2 ? 0.85 : 1),
      );
      py += heights[i]![j]! + 10;
    });
    for (const primitive of scene.primitives.slice(start))
      primitive.semantic = {
        kind: "frame",
        id: `cynefin:${name}`,
        role: "domain",
        part: primitive.type === "text" ? "label" : "body",
      };
  });
  const start = scene.primitives.length;
  const rect = { x, y: top + rowHeights[0]!, width, height: centerHeight };
  scene.box(rect, "headerFill", "nodeStroke", "diamond", "cynefin:confusion");
  scene.data(
    "cynefin:confusion",
    "Confusion",
    rect,
    undefined,
    centerLines.slice(2).join(" · ") || "Disorder",
  );
  scene.interactions.at(-1)!.hit = {
    type: "polygon",
    points: [
      { x: x + width / 2, y: rect.y },
      { x: x + width, y: centerY },
      { x: x + width / 2, y: rect.y + centerHeight },
      { x, y: centerY },
    ],
  };
  let py = centerY - centerTextHeight / 2;
  centerLines.forEach((line, i) => {
    scene.text(
      line,
      x + (width - centerWidth) / 2,
      py,
      centerWidth,
      i === 0 ? "nodeText" : "mutedText",
      i === 0 ? 600 : 400,
    );
    py += centerHeights[i]! + 8;
  });
  for (const primitive of scene.primitives.slice(start))
    primitive.semantic = {
      kind: "frame",
      id: "cynefin:confusion",
      role: "domain",
      part: primitive.type === "text" ? "label" : "body",
    };
  let footer = top + rowHeights[0]! + centerHeight + rowHeights[1]! + 20;
  data.transitions.forEach((transition) => {
    const from = names.indexOf(transition.from.toLowerCase()),
      to = names.indexOf(transition.to.toLowerCase());
    if (from >= 0 && to >= 0) {
      const fromBottom = from >= 2,
        toBottom = to >= 2;
      const fx = x + ((from % 2) + 0.5) * column,
        tx = x + ((to % 2) + 0.5) * column;
      if (fromBottom === toBottom) {
        const py = fromBottom
          ? top + rowHeights[0]! + centerHeight + rowHeights[1]! - 6
          : top + rowHeights[0]! - 6;
        scene.line(
          [
            { x: fx, y: py },
            { x: tx, y: py },
          ],
          "palette:0",
          true,
          [4, 4],
        );
      } else {
        const fy = fromBottom ? top + rowHeights[0]! + centerHeight : top + rowHeights[0]!;
        const ty = toBottom ? top + rowHeights[0]! + centerHeight : top + rowHeights[0]!;
        const side = from % 2 === 0 ? x + 6 : x + width - 6;
        scene.line(
          [
            { x: fx, y: fy },
            { x: side, y: fy },
            { x: side, y: ty },
            { x: tx, y: ty },
          ],
          "palette:0",
          true,
          [4, 4],
        );
      }
      scene.primitives.at(-1)!.semantic = {
        kind: "edge",
        id: `cynefin:${transition.from}:${transition.to}`,
        from: `cynefin:${transition.from}`,
        to: `cynefin:${transition.to}`,
        role: "transition",
      };
    }
    const label = `${transition.from} > ${transition.to}: ${transition.label}`;
    scene.text(label, x, footer, width, "palette:0");
    const text = scene.primitives.at(-1)!;
    if (text.type === "text") footer += text.height + 12;
  });
}
