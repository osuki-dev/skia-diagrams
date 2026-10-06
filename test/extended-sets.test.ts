import { expect, test } from "bun:test";
import { parseExtendedSets } from "../src/parse/extended-sets.ts";
import { circleOverlap, layoutExtendedSets } from "../src/layout/extended-sets.ts";
import { hitTestInteraction } from "../src/react/hit-test.ts";
import { estimateText } from "../src/layout/measure.ts";
import catalog from "./fixtures/official-mermaid/catalog.json" with { type: "json" };

for (const type of catalog.types.filter((type) => ["venn", "ishikawa"].includes(type.type))) {
  for (const example of type.cases)
    test(`native sets official ${example.id}`, () => {
      const parsed = parseExtendedSets(example.source);
      expect(parsed?.kind as string).toBe(type.type);
      const scene = layoutExtendedSets(parsed!, estimateText)!;
      expect(scene.bounds.width).toBeGreaterThan(0);
      expect(scene.bounds.height).toBeGreaterThan(0);
      for (const node of parsed!.kind !== "error" && parsed!.kind !== "unsupported"
        ? parsed!.ir.nodes
        : [])
        expect(scene.accessibilityLabel).toContain(node.label);
      for (const primitive of scene.primitives)
        if (primitive.type !== "path") {
          expect(Number.isFinite(primitive.x)).toBe(true);
          expect(primitive.x).toBeGreaterThanOrEqual(scene.bounds.x);
          expect(primitive.x + primitive.width).toBeLessThanOrEqual(
            scene.bounds.x + scene.bounds.width,
          );
        }
    });
}
test("Venn preserves quoted identifiers, overlaps, text and explicit styles", () => {
  const parsed = parseExtendedSets(
    'venn-beta\nset "Foo Bar"["Alpha"]:20\ntext child["Details"]\nset B:12\nunion "Foo Bar",B["Shared"]:3\nstyle child color:red\nstyle B fill:#336699,fill-opacity:0.4',
  );
  expect(parsed?.kind).toBe("venn");
  const scene = layoutExtendedSets(parsed!, estimateText)!;
  expect(
    scene.primitives.some(
      (primitive) =>
        primitive.type === "text" && primitive.text === "Details" && primitive.color === "red",
    ),
  ).toBe(true);
  expect(
    scene.primitives.some(
      (primitive) =>
        primitive.type === "shape" && primitive.fill === "#336699" && primitive.opacity === 0.4,
    ),
  ).toBe(true);
});
test("Venn rejects undefined, duplicate and impossible sets without hiding failures", () => {
  for (const source of [
    "venn-beta\nset A\nunion A,B",
    "venn-beta\nset A\nset A",
    "venn-beta\nset A:1\nset B:2\nunion A,B:3",
  ])
    expect(parseExtendedSets(source)?.kind).toBe("error");
});
test("circle overlap respects disjoint, containment and half overlap areas", () => {
  expect(circleOverlap(10, 20, 31)).toBe(0);
  expect(circleOverlap(10, 20, 5)).toBeCloseTo(Math.PI * 100);
  expect(circleOverlap(10, 10, 10)).toBeCloseTo(122.83697);
});

test("Venn bounds the maximum supported circle and label workload", () => {
  const lines = ["venn-beta"];
  for (let i = 0; i < 20; i++) lines.push(`set S${i}:20`);
  for (let i = 0; i < 20; i++) for (let j = i + 1; j < 20; j++) lines.push(`union S${i},S${j}:20`);
  for (let i = 0; i < 90; i++) lines.push(`text T${i}`);
  const parsed = parseExtendedSets(lines.join("\n"));
  expect(parsed?.kind).toBe("venn");
  const start = performance.now();
  const scene = layoutExtendedSets(parsed!, estimateText)!;
  // Generous regression guard; the old per-region 5px scan had no fixed work cap.
  expect(performance.now() - start).toBeLessThan(2000);
  expect(scene.primitives.filter((primitive) => primitive.type === "text")).toHaveLength(300);
  expect(Object.values(scene.bounds).every(Number.isFinite)).toBe(true);
  for (const primitive of scene.primitives)
    if (primitive.type !== "path")
      expect(
        [primitive.x, primitive.y, primitive.width, primitive.height].every(Number.isFinite),
      ).toBe(true);
});
test("Venn rejects higher-order intersections larger than authored pair intersections", () => {
  expect(
    parseExtendedSets("venn-beta\nset A:20\nset B:20\nset C:20\nunion A,B:1\nunion A,B,C:4")?.kind,
  ).toBe("error");
});

test("Venn hit regions select authored overlaps and reject circle bounding-box corners", () => {
  const example = catalog.types.find((type) => type.type === "venn")!.cases[0];
  const scene = layoutExtendedSets(parseExtendedSets(example.source)!, estimateText)!;
  expect(scene.interactions).toHaveLength(7);
  for (const interaction of scene.interactions!) {
    const label = scene.primitives.find(
      (primitive) => primitive.type === "text" && primitive.text === interaction.label,
    )!;
    if (label.type === "text")
      expect(
        hitTestInteraction(scene, { x: label.x + label.width / 2, y: label.y + label.height / 2 })
          ?.target,
      ).toBe(interaction.target);
    expect(interaction.value).toBeUndefined();
  }
  const circle = scene.primitives.find((primitive) => primitive.type === "shape")!;
  if (circle.type === "shape")
    expect(hitTestInteraction(scene, { x: circle.x, y: circle.y })?.target).not.toBe(circle.id);
});
test("Venn interaction data exposes explicit sizes and region texts", () => {
  const source = 'venn-beta\nset A:20\ntext T["React"]\nset B:12\nunion A,B["Shared"]:3';
  const scene = layoutExtendedSets(parseExtendedSets(source)!, estimateText)!;
  expect(scene.interactions!.find((interaction) => interaction.target === "A,B")).toMatchObject({
    kind: "data",
    value: 3,
    label: "Shared",
  });
  expect(scene.interactions!.find((interaction) => interaction.target === "A")!.tooltip).toContain(
    "React",
  );
});

test("Ishikawa selection follows exact cause labels and ignores gaps and bones", () => {
  const example = catalog.types.find((type) => type.type === "ishikawa")!.cases[0];
  const parsed = parseExtendedSets(example.source)!;
  const scene = layoutExtendedSets(parsed, estimateText)!;
  if (parsed.kind === "error" || parsed.kind === "unsupported")
    throw new Error("Expected valid Ishikawa");
  expect(scene.interactions).toHaveLength(parsed.ir.nodes.length);
  for (const interaction of scene.interactions!) {
    expect(
      hitTestInteraction(scene, {
        x: interaction.x + interaction.width / 2,
        y: interaction.y + interaction.height / 2,
      })?.target,
    ).toBe(interaction.target);
    expect(interaction.value).toBeUndefined();
  }
  const spine = scene.primitives.find((primitive) => primitive.type === "path")!;
  if (spine.type === "path")
    expect(
      hitTestInteraction(scene, {
        x: (spine.points[0].x + spine.points[1].x) / 2,
        y: spine.points[0].y,
      }),
    ).toBeUndefined();
  const nested = scene.interactions!.find((interaction) => interaction.label === "Dirty lens")!;
  expect(nested.tooltip).toContain("Equipment → LENS → Dirty lens");
  for (let i = 0; i < scene.interactions!.length; i++)
    for (let j = i + 1; j < scene.interactions!.length; j++) {
      const a = scene.interactions![i],
        b = scene.interactions![j];
      expect(
        a.x >= b.x + b.width ||
          b.x >= a.x + a.width ||
          a.y >= b.y + b.height ||
          b.y >= a.y + a.height,
      ).toBe(true);
    }
});
