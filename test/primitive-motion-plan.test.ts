import { createNumericFallbacks, numericTiming } from "../src/react/numeric-motion-timing.ts";
import type { NumericMotion } from "../src/react/primitive-motion-plan.ts";
import { expect, test } from "bun:test";
import { createPrimitiveMotionPlan } from "../src/react/primitive-motion-plan.ts";
import type { Primitive, Scene } from "../src/types.ts";
const shape = (
  x: number,
  y: number,
  width: number,
  height: number,
  fill = "palette:0",
): Extract<Primitive, { type: "shape" }> => ({
  type: "shape",
  shape: "rect",
  x,
  y,
  width,
  height,
  fill,
});
const text = (value: string): Extract<Primitive, { type: "text" }> => ({
  type: "text",
  text: value,
  x: 10,
  y: 10,
  width: 50,
  height: 20,
  fontSize: 14,
});
function scene(kind: Scene["kind"], primitives: Primitive[]): Scene {
  return {
    kind,
    primitives,
    bounds: { x: 0, y: 0, width: 400, height: 300 },
    accessibilityLabel: kind,
  };
}
test("XY separates real bar transforms from unchanged axes and category labels", () => {
  const axis: Primitive = {
    type: "path",
    points: [
      { x: 0, y: 100 },
      { x: 200, y: 100 },
    ],
    strokeRole: "grid",
  };
  const bar = { ...shape(20, 40, 20, 60), motion: { axis: "y" as const, baseline: 100 } };
  const label = text("Jan");
  const chart = scene("xychart", [axis, bar, label]);
  chart.interactions = [
    {
      id: "xy-0-0",
      label: "Product",
      kind: "data",
      target: "Product",
      value: 60,
      x: 20,
      y: 40,
      width: 20,
      height: 60,
    },
  ];
  const plan = createPrimitiveMotionPlan(chart);
  expect(plan.staticPrimitives).toEqual([axis, label]);
  expect(plan.layers).toHaveLength(1);
  expect(plan.layers[0].mode).toBe("grow-y");
  expect(plan.layers[0].primitives).toEqual([bar]);
});
test("pie values become counters while sectors and legends have separate ownership", () => {
  const sector: Primitive = {
    type: "sector",
    x: 10,
    y: 10,
    width: 200,
    height: 200,
    cx: 110,
    cy: 110,
    radius: 100,
    startAngle: -Math.PI / 2,
    sweepAngle: Math.PI,
  };
  const label = text("Product");
  const number = { ...text("40%"), motion: { value: 40, suffix: "%" } };
  const plan = createPrimitiveMotionPlan(scene("pie", [sector, label, number]));
  expect(plan.layers[0].mode).toBe("radial");
  expect(plan.numbers[0]).toMatchObject({ value: 40, suffix: "%", decimals: 0 });
  expect(
    plan.layers.some((layer) => layer.primitives.includes(label) && layer.mode === "fade"),
  ).toBe(true);
  expect(plan.numbers[0].delay).toBeGreaterThanOrEqual(plan.layers[0].delay + plan.layers[0].span!);
});
test("partition remains bounded and every original primitive has exactly one owner", () => {
  for (const kind of ["flowchart", "timeline", "sequence", "gantt", "mindmap", "radar"] as const) {
    const input = scene(kind, [
      shape(0, 0, 20, 20),
      text("Label"),
      {
        type: "path",
        points: [
          { x: 0, y: 40 },
          { x: 200, y: 40 },
        ],
      },
    ]);
    const plan = createPrimitiveMotionPlan(input);
    const owned = [
      ...plan.staticPrimitives,
      ...plan.layers.flatMap((layer) => layer.primitives),
      ...plan.numbers.map((n) => n.primitive),
    ];
    expect(owned.length).toBe(input.primitives.length);
    expect(new Set(owned).size).toBe(input.primitives.length);
    expect(plan.layers.length).toBeLessThanOrEqual(12);
  }
});

test("negative and horizontal bars retain the authored zero coordinate", () => {
  for (const axis of ["x", "y"] as const) {
    const bar: Extract<Primitive, { type: "shape" }> = {
      type: "shape",
      shape: "rect",
      x: 40,
      y: 40,
      width: 60,
      height: 60,
      fill: "palette:0",
      motion: { axis, baseline: 40 },
    };
    const chart = scene("xychart", [bar]);
    chart.interactions = [
      {
        id: "xy-0-0",
        label: "Negative",
        kind: "data",
        target: "Negative",
        value: -60,
        x: 40,
        y: 40,
        width: 60,
        height: 60,
      },
    ];
    expect(createPrimitiveMotionPlan(chart).layers[0]).toMatchObject({
      mode: axis === "x" ? "grow-x" : "grow-y",
      baseline: 40,
    });
  }
});
test("unannotated numeric labels remain ordinary text", () => {
  expect(createPrimitiveMotionPlan(scene("pie", [text("40%")])).numbers).toHaveLength(0);
  expect(
    createPrimitiveMotionPlan(
      scene("xychart", [
        { ...text("12.34 units"), motion: { value: 12.34, decimals: 2, suffix: " units" } },
      ]),
    ).numbers[0],
  ).toMatchObject({ value: 12.34, decimals: 2, suffix: " units" });
});

function number(delay: number, span = 0.16): NumericMotion {
  return {
    primitive: {
      type: "text",
      x: 10,
      y: 20,
      width: 100,
      height: 24,
      fontSize: 24,
      fontWeight: 700,
      fontStyle: "italic",
      text: "**40%**",
      literal: true,
      color: "#fff",
      lineRuns: [[{ text: "**40%**", bold: false, italic: false }]],
    },
    value: 40,
    decimals: 0,
    prefix: "",
    suffix: "%",
    delay,
    span,
  };
}

test("numeric phases honor semantic slice timing rather than geometric label position", () => {
  expect(numericTiming(number(0.63))).toEqual({ delay: 0.63, span: 0.16 });
  expect(numericTiming(number(NaN, Infinity))).toEqual({ delay: 0, span: 1 });
  const late = numericTiming(number(1, 1));
  expect(late.delay).toBe(0.9);
  expect(late.delay + late.span).toBe(1);
});

test("timed Paragraph fallbacks preserve typography and never precede a member's reveal", () => {
  const groups = createNumericFallbacks();
  const values = Array.from({ length: 24 }, (_, index) => number(index / 26));
  for (const value of values) groups.add(value, numericTiming(value));
  const output = groups.finish();
  expect(output.length).toBeLessThanOrEqual(4);
  expect(output.flatMap((group) => group.primitives)).toHaveLength(24);
  for (const group of output) {
    expect(group.delay + group.span).toBeLessThanOrEqual(1);
    for (const p of group.primitives) {
      const original = values.find((value) => value.primitive === p)!;
      expect(p).toBe(original.primitive);
      expect(group.delay).toBeGreaterThanOrEqual(original.delay!);
    }
  }
});
