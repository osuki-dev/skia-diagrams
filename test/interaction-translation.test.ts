import { expect, test } from "bun:test";
import { translateInteraction } from "../src/layout/interactions.ts";
import { hitTestInteraction } from "../src/react/hit-test.ts";
import type { DiagramInteraction, Scene } from "../src/types.ts";
for (const hit of [
  { type: "circle", cx: 5, cy: 5, radius: 4 },
  { type: "sector", cx: 5, cy: 5, radius: 4, startAngle: 0, sweepAngle: Math.PI * 2 },
  {
    type: "polygon",
    points: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 10 },
    ],
  },
  { type: "venn", circles: [{ cx: 5, cy: 5, radius: 4, included: true }] },
] satisfies NonNullable<DiagramInteraction["hit"]>[]) {
  test(`${hit.type} selections remain aligned after translated title/bounds`, () => {
    const item: DiagramInteraction = {
      id: "datum",
      label: "Datum",
      kind: "data",
      target: "Datum",
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      hit,
    };
    const original = JSON.stringify(item);
    const scene: Scene = {
      kind: "radar",
      primitives: [],
      accessibilityLabel: "Data",
      bounds: { x: 0, y: 0, width: 100, height: 100 },
      interactions: [translateInteraction(item, 20, 30)],
    };
    expect(hitTestInteraction(scene, { x: 25, y: 35 })?.id).toBe("datum");
    expect(hitTestInteraction(scene, { x: 5, y: 5 })).toBeUndefined();
    expect(JSON.stringify(item)).toBe(original);
  });
}
