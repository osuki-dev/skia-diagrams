import { expect, test } from "bun:test";
import { officialCatalog } from "../example/official-fixtures.ts";
import { layoutDiagram, parseDiagram } from "../src/index.ts";
import { pieMotion } from "../src/react/motion-policies/pie.ts";
import type { Primitive, Scene } from "../src/types.ts";

const source = officialCatalog.types.find((type) => type.type === "pie")!.cases[1].source;
function owned(scene: Scene) {
  const plan = pieMotion(scene),
    primitives = [
      ...plan.staticPrimitives,
      ...plan.layers.flatMap((layer) => layer.primitives),
      ...plan.numbers.map((number) => number.primitive),
    ];
  expect(primitives).toHaveLength(scene.primitives.length);
  expect(new Set(primitives).size).toBe(scene.primitives.length);
  expect(primitives.every((p) => scene.primitives.includes(p))).toBe(true);
  expect(plan.layers.length).toBeLessThanOrEqual(12);
  return plan;
}

test("pie wedges follow exact authored angles and weighted timing; the rim never precedes data", () => {
  const scene = layoutDiagram(parseDiagram(source)),
    plan = owned(scene),
    wedges = plan.layers.filter((layer) => layer.mode === "radial");
  expect(wedges).toHaveLength(4);
  const sectors = scene.primitives.filter(
    (p): p is Extract<Primitive, { type: "sector" }> => p.type === "sector",
  );
  for (const [index, wedge] of wedges.entries()) {
    expect(wedge.primitives).toEqual([sectors[index]]);
    expect(wedge.circle?.startAngle).toBe(sectors[index].startAngle);
    expect(wedge.circle?.sweepAngle).toBe(sectors[index].sweepAngle);
    if (index) expect(wedge.delay).toBeGreaterThan(wedges[index - 1].delay);
  }
  expect(wedges[1].span!).toBeGreaterThan(wedges[0].span!);
  const rim = plan.layers.find((layer) =>
    layer.primitives.some((p) => p.semantic?.role === "rim"),
  )!;
  expect(rim.mode).toBe("trace");
  expect(rim.delay).toBeGreaterThanOrEqual(
    Math.max(...wedges.map((layer) => layer.delay + layer.span!)),
  );
  expect(plan.staticPrimitives.some((p) => p.semantic?.role === "rim" || p.type === "text")).toBe(
    false,
  );
});

test("outside percentages and leaders wait for their own wedge; matched legends keep actual text and colors", () => {
  const scene = layoutDiagram(parseDiagram(source), undefined, {
      fontSize: 24,
      viewportWidth: 320,
    }),
    plan = owned(scene),
    wedges = plan.layers.filter((layer) => layer.mode === "radial");
  const outside = scene.primitives.filter((p) => p.semantic?.role === "callout");
  expect(outside.length).toBeGreaterThan(0);
  for (const leader of outside) {
    const index = leader.semantic!.row!,
      wedge = wedges[index],
      followup = plan.layers.find((layer) => layer.primitives.includes(leader))!;
    expect(followup.delay).toBeGreaterThanOrEqual(wedge.delay + wedge.span!);
    expect(
      followup.primitives.some((p) => p.semantic?.role === "legend" && p.semantic.row === index),
    ).toBe(true);
  }
  for (const number of plan.numbers) {
    const wedge = wedges[number.primitive.semantic!.row!],
      delay = number.delay!;
    expect(delay).toBeGreaterThanOrEqual(wedge.delay + wedge.span!);
    expect(number.suffix).toBe("%");
    expect(number.primitive.color).toBeDefined();
  }
  expect(
    new Set(
      plan.layers
        .filter((layer) => layer.primitives.some((p) => p.semantic?.role === "legend"))
        .map((layer) => layer.delay),
    ).size,
  ).toBe(4);
});

test("many-slice pie retains every final primitive within four meaningful angular phases", () => {
  const scene = layoutDiagram(
      parseDiagram(
        "pie\n" +
          Array.from({ length: 32 }, (_, index) => `"Item ${index}" : ${index + 1}`).join("\n"),
      ),
    ),
    plan = owned(scene);
  expect(plan.layers.filter((layer) => layer.mode === "radial")).toHaveLength(4);
  expect(plan.numbers).toHaveLength(24);
  expect(
    plan.layers.filter((layer) => layer.primitives.some((p) => p.semantic?.role === "legend"))
      .length,
  ).toBe(4);
  expect(
    plan.layers.some((layer) => layer.primitives.some((p) => p.semantic?.role === "percentage")),
  ).toBe(true);
});
