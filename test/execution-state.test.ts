import { expect, test } from "bun:test";
import { executionPrimitives, type DiagramExecutionState } from "../src/react/execution-state.ts";
import type { Scene } from "../src/types.ts";
const scene: Scene = {
  kind: "flowchart",
  bounds: { x: 0, y: 0, width: 100, height: 100 },
  accessibilityLabel: "Execution",
  primitives: [
    {
      type: "shape",
      shape: "rect",
      x: 0,
      y: 0,
      width: 30,
      height: 20,
      semantic: { kind: "node", id: "constructor", part: "body" },
    },
    {
      type: "text",
      text: "Run",
      fontSize: 14,
      x: 3,
      y: 3,
      width: 20,
      height: 14,
      semantic: { kind: "node", id: "constructor", part: "label" },
    },
    {
      type: "path",
      points: [
        { x: 30, y: 10 },
        { x: 80, y: 10 },
      ],
      semantic: { kind: "edge", id: "worker-start", from: "constructor", to: "Complete" },
    },
    {
      type: "shape",
      shape: "rect",
      x: 0,
      y: 30,
      width: 90,
      height: 50,
      semantic: { kind: "frame", id: "container" },
    },
  ],
};
test("execution state selects only explicitly supplied source IDs and leaves omitted items alone", () => {
  const execution: DiagramExecutionState = {
    nodes: Object.freeze({ constructor: "active" as const }),
    edges: { "worker-start": "completed" },
  };
  const selected = executionPrimitives(scene, execution);
  expect(selected.map((item) => [item.primitive.semantic!.id, item.status])).toEqual([
    ["constructor", "active"],
    ["constructor", "active"],
    ["worker-start", "completed"],
  ]);
  expect(selected[0].primitive).toBe(scene.primitives[0]);
  expect(Object.entries(execution.nodes!)).toEqual([["constructor", "active"]]);
});
test("inherited node names, unknown edges and idle state produce no invented execution", () => {
  expect(executionPrimitives(scene, { nodes: {}, edges: { unknown: "active" } })).toEqual([]);
  expect(
    executionPrimitives(scene, {
      nodes: Object.freeze({ constructor: "idle" as const }),
      edges: { "worker-start": "idle" },
    }),
  ).toEqual([]);
});
