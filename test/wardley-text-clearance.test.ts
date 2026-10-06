import { expect, test } from "bun:test";
import { clearTextFromPaths } from "../src/layout/official/text-clearance.ts";
import type { Primitive } from "../src/types.ts";

test("dependency gaps merge overlapping text obstacles and retain external arrow endpoints", () => {
  const source: Primitive[] = [
    {
      type: "path",
      points: [
        { x: 0, y: 20 },
        { x: 100, y: 20 },
      ],
      stroke: "edgeStroke",
      start: "arrow",
      end: "arrow",
    },
    { type: "text", text: "Note", x: 30, y: 10, width: 20, height: 20, fontSize: 14 },
    { type: "text", text: "Label", x: 45, y: 10, width: 20, height: 20, fontSize: 14 },
  ];
  const paths = clearTextFromPaths(source).filter((p) => p.type === "path");
  expect(paths).toHaveLength(2);
  expect(paths[0]!.points).toEqual([
    { x: 0, y: 20 },
    { x: 27, y: 20 },
  ]);
  expect(paths[1]!.points).toEqual([
    { x: 68, y: 20 },
    { x: 100, y: 20 },
  ]);
  expect(paths[0]!.start).toBe("arrow");
  expect(paths[0]!.end).toBe("none");
  expect(paths[1]!.start).toBe("none");
  expect(paths[1]!.end).toBe("arrow");
  expect(source[0]).toMatchObject({
    points: [
      { x: 0, y: 20 },
      { x: 100, y: 20 },
    ],
  });
});

test("diagonal crossings clear glyph rectangles without changing axes or parallel strokes", () => {
  const dependency: Primitive = {
    type: "path",
    points: [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    ],
    stroke: "edgeStroke",
    end: "arrow",
  };
  const axis: Primitive = { ...dependency, stroke: "nodeStroke" };
  const parallel: Primitive = {
    ...dependency,
    points: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ],
  };
  const label: Primitive = {
    type: "text",
    text: "Note",
    x: 30,
    y: 30,
    width: 30,
    height: 20,
    fontSize: 14,
  };
  const result = clearTextFromPaths([dependency, axis, parallel, label]);
  expect(result).toContain(axis);
  expect(result).toContain(parallel);
  const paths = result.filter(
    (p): p is Extract<Primitive, { type: "path" }> =>
      p.type === "path" && p !== axis && p !== parallel,
  );
  expect(paths).toHaveLength(2);
  expect(paths[0]!.points[1]).toEqual({ x: 27, y: 27 });
  expect(paths[1]!.points[0]).toEqual({ x: 53, y: 53 });
});
