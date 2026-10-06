import { layoutDiagram, parseDiagram } from "../src/index.ts";
import { nextDataSelection } from "../src/react/data-selection-state.ts";
import { pieSelection } from "../src/react/pie-selection.ts";
import { expect, test } from "bun:test";
import { hitTestInteraction, viewerPointToScene } from "../src/react/hit-test.ts";
import type { Scene, DiagramInteraction } from "../src/types.ts";

test("pie data selection respects radial and angular geometry with overlapping bounding boxes", () => {
  const scene: Scene = {
    kind: "pie",
    bounds: { x: 0, y: 0, width: 100, height: 100 },
    primitives: [],
    accessibilityLabel: "Pie",
    interactions: [0, 1].map((i) => ({
      id: String(i),
      label: String(i),
      kind: "data",
      target: String(i),
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      hit: {
        type: "sector",
        cx: 50,
        cy: 50,
        radius: 50,
        startAngle: i * Math.PI,
        sweepAngle: Math.PI,
      },
    })),
  };
  expect(hitTestInteraction(scene, { x: 50, y: 75 })?.id).toBe("0");
  expect(hitTestInteraction(scene, { x: 50, y: 25 })?.id).toBe("1");
  expect(hitTestInteraction(scene, { x: 0, y: 0 })).toBeUndefined();
});

test("viewer hit coordinates invert centered zoom and pan with nonzero scene bounds", () => {
  const bounds = { x: -20, y: 30, width: 200, height: 100 };
  const viewport = { width: 320, height: 240 };
  const point = viewerPointToScene({ x: 170, y: 95 }, bounds, viewport, 1.5, { x: 10, y: -25 });
  expect(point.x).toBe(80);
  expect(point.y).toBe(80);
});

test("polygon hit testing excludes empty rectangle corners and includes boundary", () => {
  const scene: Scene = {
    kind: "flowchart",
    bounds: { x: 0, y: 0, width: 100, height: 100 },
    primitives: [],
    accessibilityLabel: "Diamond",
    interactions: [
      {
        id: "diamond",
        label: "Review",
        kind: "callback",
        target: "review",
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        hit: {
          type: "polygon",
          points: [
            { x: 50, y: 0 },
            { x: 100, y: 50 },
            { x: 50, y: 100 },
            { x: 0, y: 50 },
          ],
        },
      },
    ],
  };
  expect(hitTestInteraction(scene, { x: 1, y: 1 })).toBeUndefined();
  expect(hitTestInteraction(scene, { x: 50, y: 0 })?.id).toBe("diamond");
  expect(hitTestInteraction(scene, { x: 50, y: 50 })?.id).toBe("diamond");
});

test("Venn hit regions honor both included and excluded circles", () => {
  const scene: Scene = {
    kind: "venn",
    bounds: { x: 0, y: 0, width: 150, height: 100 },
    primitives: [],
    accessibilityLabel: "Sets",
    interactions: [
      {
        id: "only-a",
        label: "A only",
        kind: "data",
        target: "a",
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        hit: {
          type: "venn",
          circles: [
            { cx: 50, cy: 50, radius: 50, included: true },
            { cx: 100, cy: 50, radius: 50, included: false },
          ],
        },
      },
    ],
  };
  expect(hitTestInteraction(scene, { x: 25, y: 50 })?.id).toBe("only-a");
  expect(hitTestInteraction(scene, { x: 75, y: 50 })).toBeUndefined();
});

test("data selection toggles by stable ID, switches duplicate names, and retains links", () => {
  const first: DiagramInteraction = {
    id: "pie:0",
    kind: "data",
    label: "Product",
    target: "Product",
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  };
  const second = { ...first, id: "pie:1" };
  const selected = nextDataSelection(undefined, first);
  expect(selected).toBe(first);
  expect(nextDataSelection(selected, { ...first })).toBeUndefined();
  expect(nextDataSelection(selected, second)).toBe(second);
  expect(nextDataSelection(second, first)).toBe(first);
  expect(nextDataSelection(first, { ...first, kind: "link", target: "https://example.com" })).toBe(
    first,
  );
  expect(nextDataSelection(first, { ...first, kind: "callback", target: "inspectProduct" })).toBe(
    first,
  );
});

test("Pie selection partitions native geometry once and moves its real wedge and percentage along the midpoint", () => {
  const scene = layoutDiagram(
    parseDiagram('pie\n"Product":40\n"Marketing":25\n"Operations":20\n"Support":15'),
  );
  const original = JSON.stringify(scene);
  for (const interaction of scene.interactions!) {
    const plan = pieSelection(scene, interaction)!;
    expect(plan).toBeDefined();
    const sector = plan.selected.find((p) => p.type === "sector")!;
    if (sector.type !== "sector") throw new Error("Expected sector");
    const angle = sector.startAngle + sector.sweepAngle / 2;
    expect(Math.atan2(plan.offset.y, plan.offset.x)).toBeCloseTo(
      Math.atan2(Math.sin(angle), Math.cos(angle)),
      6,
    );
    expect(Math.hypot(plan.offset.x, plan.offset.y)).toBeLessThanOrEqual(5);
    expect(plan.selected.some((p) => p.semantic?.role === "percentage")).toBe(true);
    expect(plan.fixed.filter((p) => p.semantic?.role === "legend")).toEqual(
      scene.primitives.filter((p) => p.semantic?.role === "legend"),
    );
    const owned = [...plan.fixed, ...plan.other, ...plan.selected];
    expect(owned).toHaveLength(scene.primitives.length);
    expect(new Set(owned).size).toBe(scene.primitives.length);
  }
  expect(JSON.stringify(scene)).toBe(original);
});
