import { expect, test } from "bun:test";
import { tracePaths } from "../src/react/trace-motion-plan.ts";
import type { PrimitiveMotionLayer } from "../src/react/primitive-motion-plan.ts";

const path = {
  type: "path" as const,
  points: [
    { x: 10, y: 10 },
    { x: 20, y: 30 },
  ],
  stroke: "edge",
  end: "arrow" as const,
};
const layer: PrimitiveMotionLayer = {
  mode: "trace",
  delay: 0.2,
  primitives: [path],
  bounds: { x: 0, y: 0, width: 50, height: 50 },
};
test("only complete stroke-only layers enter native trim and markers retain their authored path", () => {
  expect(Object.is(tracePaths(layer, 0), layer.primitives)).toBe(true);
  expect(tracePaths({ ...layer, primitives: [{ ...path, fill: "none" }] }, 0)).toHaveLength(1);
  expect(tracePaths({ ...layer, primitives: [{ ...path, fill: "accent" }] }, 0)).toBeUndefined();
  expect(
    tracePaths(
      {
        ...layer,
        primitives: [
          path,
          { type: "text", text: "Label", x: 0, y: 0, width: 20, height: 20, fontSize: 14 },
        ],
      },
      0,
    ),
  ).toBeUndefined();
  expect(tracePaths({ ...layer, mode: "fade" }, 0)).toBeUndefined();
  expect(layer.primitives).toEqual([path]);
});
test("global 64-path budget preserves overflow as whole Picture layers", () => {
  expect(tracePaths(layer, 63)).toHaveLength(1);
  expect(tracePaths(layer, 64)).toBeUndefined();
  const many = { ...layer, primitives: Array.from({ length: 65 }, () => ({ ...path })) };
  expect(tracePaths(many, 0)).toBeUndefined();
  expect(many.primitives).toHaveLength(65);
});
