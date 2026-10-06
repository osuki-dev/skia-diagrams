import { expect, test } from "bun:test";
import type { Primitive } from "../src/types.ts";
import { clonePrimitive, translatePrimitive } from "../src/layout/scene-geometry.ts";
import { OfficialScene } from "../src/layout/official/context.ts";
import { estimateText } from "../src/layout/measure.ts";

test("host icon geometry is owned before bounds normalization", () => {
  const path: Primitive = {
    type: "path",
    points: [{ x: -10, y: -5 }],
    curves: [{ control1: { x: -8, y: -3 }, control2: { x: -2, y: 1 }, end: { x: 2, y: 3 } }],
    gradient: {
      from: { x: -10, y: -5 },
      to: { x: 2, y: 3 },
      stops: [
        { offset: 0, color: "accent" },
        { offset: 1, color: "background" },
      ],
    },
  };
  const original = structuredClone(path);
  const scene = new OfficialScene("architecture", estimateText, { resolveIcon: () => [path] });
  scene.icon("host", { x: 0, y: 0, width: 12, height: 8 });
  const output = scene.finish();
  expect(path).toEqual(original);
  expect(output.primitives[0]).toMatchObject({
    points: [{ x: 20, y: 20 }],
    curves: [{ control1: { x: 22, y: 22 }, control2: { x: 28, y: 26 }, end: { x: 32, y: 28 } }],
    gradient: { from: { x: 20, y: 20 }, to: { x: 32, y: 28 } },
  });
});

test("sector translations keep bounds, center and gradients aligned", () => {
  const source: Primitive = {
    type: "sector",
    x: 0,
    y: 0,
    width: 20,
    height: 20,
    cx: 10,
    cy: 10,
    radius: 10,
    startAngle: 0,
    sweepAngle: 90,
  };
  expect(translatePrimitive(source, 4, 8)).toMatchObject({ x: 4, y: 8, cx: 14, cy: 18 });
  expect(source).toMatchObject({ x: 0, y: 0, cx: 10, cy: 10 });
  const copy = clonePrimitive(source);
  expect(copy).toEqual(source);
  expect(copy).not.toBe(source);
});
