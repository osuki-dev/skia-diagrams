import { expect, test } from "bun:test";
import { parseDiagramAsync } from "../src/parse/index.ts";
import { layoutDiagram } from "../src/layout/index.ts";
import { estimateText } from "../src/layout/measure.ts";
import type { Primitive } from "../src/types.ts";
import catalog from "./fixtures/official-mermaid/catalog.json" with { type: "json" };
import { quadrantMotion } from "../src/react/motion-policies/quadrant.ts";
import { vennMotion } from "../src/react/motion-policies/venn.ts";
import { treemapMotion } from "../src/react/motion-policies/treemap.ts";

for (const type of ["quadrantChart", "venn", "treemap"])
  test(`${type} fits phone widths with host-sized readable text`, async () => {
    const fixture = catalog.types.find((fixture) => fixture.type === type)!.cases[0];
    const parsed = await parseDiagramAsync(fixture.source);
    const policy =
      type === "quadrantChart" ? quadrantMotion : type === "venn" ? vennMotion : treemapMotion;
    for (const [viewportWidth, fontSize] of [
      [320, 24],
      [375, 14],
    ] as const) {
      const scene = layoutDiagram(parsed, estimateText, {
        viewportWidth,
        fontSize,
      });
      expect(scene.bounds.width).toBeLessThanOrEqual(viewportWidth + 1);
      const labels = scene.primitives.filter(
        (primitive): primitive is Extract<Primitive, { type: "text" }> => primitive.type === "text",
      );
      expect(labels.every((label) => label.fontSize >= fontSize)).toBe(true);
      expect(
        labels.every(
          (label) =>
            !label.text.includes("…") &&
            !label.lineRuns?.flat().some((run) => run.text.includes("…")),
        ),
      ).toBe(true);
      const overlaps: string[] = [];
      for (let i = 0; i < labels.length; i++)
        for (const b of labels.slice(i + 1)) {
          const a = labels[i];
          if (
            a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y
          )
            overlaps.push(`${a.text} / ${b.text}`);
        }
      expect(overlaps).toEqual([]);
      const plan = policy(scene);
      const owned = [
        ...plan.staticPrimitives,
        ...plan.layers.flatMap((layer) => layer.primitives),
        ...plan.numbers.map((number) => number.primitive),
      ];
      expect(new Set(owned).size).toBe(scene.primitives.length);
      expect(owned).toHaveLength(scene.primitives.length);
      expect(plan.layers.length).toBeLessThanOrEqual(12);
      expect(plan.numbers.every((number) => number.primitive.motion?.value === number.value)).toBe(
        true,
      );
      if (type === "quadrantChart")
        expect(plan.layers.every((layer) => layer.mode === "fade")).toBe(true);
    }
  });

test("Venn contour tracing and overlap fills own distinct semantic phases", async () => {
  const fixture = catalog.types.find((fixture) => fixture.type === "venn")!.cases[0];
  const scene = layoutDiagram(await parseDiagramAsync(fixture.source), estimateText, {
    viewportWidth: 320,
  });
  const plan = vennMotion(scene);
  expect(plan.layers.some((layer) => layer.mode === "trace")).toBe(true);
  for (const layer of plan.layers)
    for (const primitive of layer.primitives) {
      if (primitive.semantic?.role === "venn-contour") expect(layer.mode).toBe("trace");
      if (primitive.semantic?.role === "venn-fill") expect(layer.mode).toBe("fade");
    }
  expect(scene.interactions!.every((interaction) => interaction.hit?.type === "venn")).toBe(true);
});

test("Treemap hierarchical numeric motion counts values, never digits in labels", async () => {
  const source = `treemap-beta\n"Budget 2026"\n    "Team 42": 10\n    "Team 2027": 30`;
  const scene = layoutDiagram(await parseDiagramAsync(source), estimateText, {
    viewportWidth: 320,
  });
  const plan = treemapMotion(scene);
  expect(plan.numbers.length).toBeGreaterThan(0);
  expect(
    plan.numbers.every(
      (number) =>
        !number.primitive.text.includes("Budget") && !number.primitive.text.includes("Team"),
    ),
  ).toBe(true);
  expect(plan.numbers.map((number) => number.value)).toContain(10);
  expect(plan.numbers.map((number) => number.value)).toContain(30);
  const parents = plan.layers.filter((layer) =>
    layer.primitives.some(
      (primitive) => primitive.type === "shape" && primitive.id?.startsWith("treemap:parent:"),
    ),
  );
  const children = plan.layers.filter((layer) =>
    layer.primitives.some(
      (primitive) => primitive.type === "shape" && primitive.id?.startsWith("treemap:leaf:"),
    ),
  );
  expect(Math.max(...parents.map((layer) => layer.delay))).toBeLessThan(
    Math.min(...children.map((layer) => layer.delay)),
  );
});
