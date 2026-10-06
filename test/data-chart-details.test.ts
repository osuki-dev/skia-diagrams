import { expect, test } from "bun:test";
import { parseDiagram, layoutDiagram, estimateText } from "../src/index.ts";
import { OfficialScene } from "../src/layout/official/context.ts";
import { hitTestInteraction } from "../src/react/hit-test.ts";
import { xychartMotion } from "../src/react/motion-policies/xychart.ts";
import { ganttMotion } from "../src/react/motion-policies/gantt.ts";
import type { DiagramInteraction, Primitive, Rect } from "../src/types.ts";

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

test("XY leaf motion follows horizontal categorical axis and keeps circle legend static", () => {
  const scene = layoutDiagram(
    parseDiagram(`xychart horizontal
    x-axis [A, B, C]
    y-axis -50 --> 50
    bar [-30, 20, 10]
    line [-10, 20, 30]`),
    estimateText,
    {
      typeStyles: { xychart: { legendMarker: "circle" } },
    },
  );
  const plan = xychartMotion(scene);
  expect(plan.layers.some((layer) => layer.mode === "grow-x")).toBe(true);
  expect(plan.layers.some((layer) => layer.mode === "draw-y")).toBe(true);
  const legendMarkers = scene.primitives.filter(
    (p) => p.type === "shape" && p.shape === "circle" && p.width === 10,
  );
  expect(legendMarkers).toHaveLength(2);
  for (const marker of legendMarkers) expect(plan.staticPrimitives).toContain(marker);
  const owned = [
    ...plan.staticPrimitives,
    ...plan.layers.flatMap((layer) => layer.primitives),
    ...plan.numbers.map((number) => number.primitive),
  ];
  expect(new Set(owned).size).toBe(scene.primitives.length);
  expect(owned.length).toBe(scene.primitives.length);
});

test("Gantt leaf reveals tasks from their individual starts and keeps task labels static", () => {
  const scene = layoutDiagram(
    parseDiagram(`gantt
    dateFormat X
    axisFormat %s
    First : 0, 40
    Second : 30, 70
    Release : milestone, 70, 71`),
    estimateText,
  );
  const plan = ganttMotion(scene);
  const taskLayers = plan.layers.filter((layer) => layer.mode === "draw-x");
  expect(taskLayers.length).toBeGreaterThan(0);
  for (const layer of taskLayers) {
    for (const primitive of layer.primitives) {
      expect(primitive.type).toBe("shape");
      if (primitive.type === "shape")
        expect(layer.regions!.some((region) => Math.abs(region.x + 2 - primitive.x) < 0.1)).toBe(
          true,
        );
    }
  }
  expect(plan.staticPrimitives.some((p) => p.type === "text" && p.text === "First")).toBe(true);
  expect(
    plan.layers.some(
      (layer) =>
        layer.mode === "fade" &&
        layer.primitives.some((p) => p.type === "shape" && p.shape === "diamond"),
    ),
  ).toBe(true);
});

test("XY data-label motion counts actual values while axis ticks remain static", () => {
  const scene = layoutDiagram(
    parseDiagram(`---
config:
  xyChart:
    showDataLabel: true
    showDataLabelOutsideBar: true
---
xychart
  x-axis [A, B]
  y-axis 0 --> 50
  bar [12.5, 30]`),
    estimateText,
    { viewportWidth: 320 },
  );
  const plan = xychartMotion(scene);
  expect(plan.numbers.map((number) => number.value)).toEqual([12.5, 30]);
  expect(plan.numbers[0].decimals).toBe(1);
  expect(plan.staticPrimitives.some((p) => p.type === "text" && p.text === "50")).toBe(true);
});

test("narrow Gantt keeps task text, full task bars and measured date ticks in its viewport", () => {
  const scene = layoutDiagram(
    parseDiagram(`gantt
    dateFormat YYYY-MM-DD
    section Full delivery and verification schedule
    First complete task description : 2025-01-01, 30d
    Second complete task description : 2025-01-15, 30d`),
    estimateText,
    { viewportWidth: 320 },
  );
  expect(scene.bounds.width).toBeLessThanOrEqual(320);
  const tasks = scene.primitives.filter(
    (p) => p.type === "text" && p.text.includes("complete task description"),
  );
  expect(tasks).toHaveLength(2);
  for (const task of tasks)
    if (task.type === "text") {
      expect(task.fontSize).toBe(14);
      expect(
        task
          .lineRuns!.flat()
          .map((run) => run.text)
          .join("")
          .replace(/\s+/g, ""),
      ).toBe(task.text.replace(/\s+/g, ""));
    }
  expect(
    scene
      .interactions!.filter((item) => item.id.startsWith("gantt-"))
      .every((item) => item.x + item.width <= scene.bounds.x + scene.bounds.width),
  ).toBe(true);
});

for (const horizontal of [false, true]) {
  test(`narrow XY layout preserves full wrapped legend and axis text (${horizontal ? "horizontal" : "vertical"})`, () => {
    const scene = layoutDiagram(
      parseDiagram(`xychart ${horizontal ? "horizontal" : ""}
      x-axis "Full category description" [Alpha, Beta, Gamma]
      y-axis "Annual revenue for the complete period" -50 --> 50
      bar [-30, 40, 10]
      line [-20, 30, 5]`),
      estimateText,
      {
        viewportWidth: 320,
        typeStyles: {
          xychart: {
            legendPosition: "right",
            seriesLabels: [
              "Full marketing conversion series description",
              "Full annual customer retention series description",
            ],
          },
        },
      },
    );
    expect(scene.bounds.width).toBeLessThanOrEqual(320);
    const labels = scene.primitives.filter((p) => p.type === "text");
    const legends = labels.filter((p) => p.text.includes("series description"));
    expect(legends).toHaveLength(2);
    for (const legend of legends) {
      expect(legend.fontSize).toBe(14);
      expect(
        legend
          .lineRuns!.flat()
          .map((run) => run.text)
          .join("")
          .replace(/\s+/g, ""),
      ).toBe(legend.text.replace(/\s+/g, ""));
    }
    expect(overlaps(legends[0], legends[1])).toBe(false);
    expect(labels.find((p) => p.text === "Annual revenue for the complete period")).toBeDefined();
  });
}

for (const horizontal of [false, true]) {
  for (const titled of [false, true]) {
    test(`XY bar animation uses actual zero baseline for positive and negative values (${horizontal ? "horizontal" : "vertical"}, ${titled ? "titled" : "untitled"})`, () => {
      const scene = layoutDiagram(
        parseDiagram(`xychart ${horizontal ? "horizontal" : ""}
        ${titled ? 'title "Positive and negative results"' : ""}
        x-axis [Loss, Gain]
        y-axis -50 --> 50
        bar [-30, 40]`),
        estimateText,
      );
      const bars = scene.primitives.filter(
        (p): p is Extract<Primitive, { type: "shape" }> =>
          p.type === "shape" && p.motion !== undefined,
      );
      expect(bars).toHaveLength(2);
      expect(bars[0].motion!.axis).toBe(horizontal ? "x" : "y");
      expect(bars[0].motion!.baseline).toBe(bars[1].motion!.baseline);
      const baseline = bars[0].motion!.baseline;
      if (horizontal) {
        expect(bars[0].x + bars[0].width).toBeCloseTo(baseline, 6);
        expect(bars[1].x).toBeCloseTo(baseline, 6);
      } else {
        expect(bars[0].y).toBeCloseTo(baseline, 6);
        expect(bars[1].y + bars[1].height).toBeCloseTo(baseline, 6);
      }
      expect(scene.primitives.filter((p) => p.type === "shape" && p.motion)).toHaveLength(2);
    });
  }
}

for (const horizontal of [false, true]) {
  for (const fontSize of [10, 14, 18, 24]) {
    test(`XY measured axis and legend bands remain separate at ${fontSize}px (${horizontal ? "horizontal" : "vertical"})`, () => {
      const source = `xychart ${horizontal ? "horizontal" : ""}
        x-axis "Quarter of launch" [Q1, Q2, Q3, Q4]
        y-axis "Annual revenue in millions" 0 --> 100
        line [25, 45, 70, 90]`;
      const scene = layoutDiagram(parseDiagram(source), estimateText, { fontSize });
      const text = scene.primitives.filter((p) => p.type === "text");
      const headings = text.filter((p) => p.fontWeight === 600);
      expect(headings).toHaveLength(2);
      for (const heading of headings) {
        for (const other of text) {
          if (heading !== other) expect(overlaps(heading, other)).toBe(false);
        }
      }
      const legend = text.find((p) => p.text === "Line 1")!;
      const ticks = text.filter((p) => p !== legend && p.fontWeight !== 600);
      for (const tick of ticks) expect(overlaps(legend, tick)).toBe(false);
    });
  }
}

test("Gantt Unix-time durations retain proportional visible widths below one day", () => {
  const scene = layoutDiagram(
    parseDiagram(`gantt
    dateFormat X
    axisFormat %s
    Long : 0, 71
    Short : 0, 36`),
    estimateText,
  );
  const bars = scene.interactions!.filter((item) => item.id.startsWith("gantt-"));
  expect(bars).toHaveLength(2);
  expect(bars[0].width).toBeGreaterThan(300);
  expect(bars[0].width / bars[1].width).toBeCloseTo(71 / 36, 5);
});

test("XY authored annotations use measured collision placement without moving source points", () => {
  const scene = layoutDiagram(
    parseDiagram(`xychart
    x-axis [Q1, Q2]
    y-axis 0 --> 100
    line [50 "First campaign conversion result", 50 "Second campaign conversion result"]
    line [50 "Third campaign conversion result", 50 "Fourth campaign conversion result"]`),
    estimateText,
    { fontSize: 24 },
  );
  const annotations = scene.primitives.filter(
    (p): p is Extract<Primitive, { type: "text" }> =>
      p.type === "text" && p.text.includes("campaign conversion result"),
  );
  expect(annotations).toHaveLength(4);
  for (let a = 0; a < annotations.length; a++)
    for (let b = a + 1; b < annotations.length; b++)
      expect(overlaps(annotations[a], annotations[b])).toBe(false);
  const hits = scene.interactions!.filter((item) => item.id.startsWith("xy-"));
  expect(hits[0].x).toBe(hits[2].x);
  expect(hits[0].y).toBe(hits[2].y);
});

test("Gantt section headers fit their measured bands at 24px", () => {
  const scene = layoutDiagram(
    parseDiagram(`gantt
    dateFormat X
    axisFormat %s
    section Delivery schedule
    Long : 0, 71
    section Verification schedule
    Short : 0, 36`),
    estimateText,
    { fontSize: 24 },
  );
  const bands = scene.primitives.filter(
    (p): p is Extract<Primitive, { type: "shape" }> =>
      p.type === "shape" && p.fill === "headerFill",
  );
  const headings = scene.primitives.filter(
    (p): p is Extract<Primitive, { type: "text" }> => p.type === "text" && p.fontWeight === 600,
  );
  expect(headings).toHaveLength(2);
  for (let index = 0; index < headings.length; index++) {
    const heading = headings[index],
      band = bands[index];
    expect(heading.y).toBeGreaterThanOrEqual(band.y);
    expect(heading.y + heading.height).toBeLessThanOrEqual(band.y + band.height);
  }
});

for (const hit of [
  { type: "circle", cx: -40, cy: -40, radius: 10 },
  { type: "sector", cx: -40, cy: -40, radius: 10, startAngle: 0, sweepAngle: Math.PI * 2 },
  {
    type: "polygon",
    points: [
      { x: -50, y: -50 },
      { x: -30, y: -50 },
      { x: -40, y: -30 },
    ],
  },
  { type: "venn", circles: [{ cx: -40, cy: -40, radius: 10, included: true }] },
] satisfies NonNullable<DiagramInteraction["hit"]>[]) {
  test(`native ${hit.type} hits follow scene translation caused by negative label bounds`, () => {
    const builder = new OfficialScene("radar", estimateText, { padding: 20 });
    builder.box({ x: -50, y: -50, width: 20, height: 20 });
    builder.interactions.push({
      id: "data",
      label: "Data",
      kind: "data",
      target: "data",
      x: -50,
      y: -50,
      width: 20,
      height: 20,
      hit,
    });
    const scene = builder.finish();
    expect(hitTestInteraction(scene, { x: 30, y: 30 })?.id).toBe("data");
    expect(hitTestInteraction(scene, { x: -40, y: -40 })).toBeUndefined();
  });
}

for (const radius of [undefined, 0, 8, 17]) {
  test(`Gantt table, section and tasks use shared radius ${radius}`, () => {
    const scene = layoutDiagram(
      parseDiagram(`gantt
    dateFormat X
    section Delivery
    First : 0, 40
    Release : milestone, 40, 41`),
      estimateText,
      {
        radius,
        typeStyles: { gantt: { table: true } },
      },
    );
    const shapes = scene.primitives.filter((p) => p.type === "shape");
    const rounded = shapes.filter((p) => p.shape !== "diamond");
    expect(rounded.length).toBeGreaterThanOrEqual(4);
    for (const shape of rounded) {
      expect(shape.shape).toBe("round");
      expect(shape.radius).toBe(radius ?? 8);
    }
    const milestone = shapes.find((p) => p.shape === "diamond")!;
    expect(milestone.radius).toBeUndefined();
  });
}

test("narrow XY edge category labels occupy distinct measured tick slots", () => {
  const scene = layoutDiagram(
    parseDiagram(`xychart
    x-axis [Category1, Category2, Category3, Category4]
    y-axis 0 --> 50
    bar [20, 30, 25, 35]`),
    estimateText,
    { fontSize: 24, viewportWidth: 320 },
  );
  const categoryLabels = scene.primitives.filter(
    (p): p is Extract<Primitive, { type: "text" }> =>
      p.type === "text" && p.text.startsWith("Category"),
  );
  expect(categoryLabels.length).toBeGreaterThan(1);
  for (let first = 0; first < categoryLabels.length; first++)
    for (let second = first + 1; second < categoryLabels.length; second++)
      expect(overlaps(categoryLabels[first], categoryLabels[second])).toBe(false);
  expect(scene.bounds.width).toBeLessThanOrEqual(320);
});

test("approved narrow Gantt table keeps time context and task labels inside the frame", () => {
  const scene = layoutDiagram(
    parseDiagram(`gantt
    title A Gantt Diagram
    dateFormat YYYY-MM-DD
    section Section
    A task : a1, 2014-01-01, 30d
    Another task : after a1, 20d
    section Another
    Task in Another : 2014-01-12, 12d
    another task : 24d`),
    estimateText,
    {
      fontSize: 14,
      viewportWidth: 343,
      typeStyles: { gantt: { table: true, taskHeader: "Task", showSections: false } },
    },
  );
  const frame = scene.primitives.find(
    (p): p is Extract<Primitive, { type: "shape" }> =>
      p.type === "shape" && p.strokeRole === "frame",
  )!;
  const headers = scene.primitives.filter(
    (p): p is Extract<Primitive, { type: "text" }> =>
      p.type === "text" && p.color === "headerText" && p.text !== "Task",
  );
  expect(headers.map((p) => p.text)).toContain("Jan 01");
  expect(headers.map((p) => p.text)).toContain("Feb 24");
  expect(scene.primitives.some((p) => p.type === "text" && p.text === "2014")).toBe(true);
  const divider = scene.primitives.find(
    (p): p is Extract<Primitive, { type: "path" }> =>
      p.type === "path" && p.points[0].x === p.points[1].x && p.points[0].y === frame.y,
  )!;
  const label = scene.primitives.find(
    (p): p is Extract<Primitive, { type: "text" }> =>
      p.type === "text" && p.text === "Task in Another",
  )!;
  expect(label.x + label.width).toBeLessThanOrEqual(divider.points[0].x - 12 + 0.001);
  const boundaryGrid = scene.primitives.filter(
    (p) =>
      p.type === "path" &&
      p.strokeRole === "grid" &&
      (p.points.every((point) => point.x === frame.x + frame.width) ||
        p.points.every((point) => point.y === frame.y + frame.height)),
  );
  expect(boundaryGrid).toHaveLength(0);
});
