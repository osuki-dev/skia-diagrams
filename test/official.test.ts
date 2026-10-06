import { test, expect } from "bun:test";
import { officialExamples } from "./official.ts";
import { parseDiagram, layoutDiagram } from "../src/index.ts";
for (const { name, source } of officialExamples())
  test(`official subset ${name}`, () => {
    const parsed = parseDiagram(source);
    if (parsed.kind === "error" || parsed.kind === "unsupported")
      throw new Error(JSON.stringify(parsed) + "\n" + source);
    expect(parsed).toMatchSnapshot();
    const scene = layoutDiagram(parsed);
    const nodes = scene.primitives.filter(
      (p) => p.type === "shape" && parsed.ir.nodes.some((node) => node.id === p.id),
    );
    for (const [index, a] of nodes.entries())
      for (const b of nodes.slice(index + 1)) {
        if (a.type !== "shape" || b.type !== "shape") throw new Error("Expected node shapes");
        expect(
          a.x + a.width <= b.x + 0.01 ||
            b.x + b.width <= a.x + 0.01 ||
            a.y + a.height <= b.y + 0.01 ||
            b.y + b.height <= a.y + 0.01,
        ).toBe(true);
      }
    for (const node of parsed.ir.nodes.filter((node) => node.parent)) {
      const child = nodes.find((p) => p.type === "shape" && p.id === node.id),
        parent = scene.primitives.find((p) => p.type === "shape" && p.id === node.parent);
      if (child?.type !== "shape" || parent?.type !== "shape") continue; // Sequence groups are checked in dedicated grouping tests.
      expect(
        child.x >= parent.x &&
          child.y >= parent.y &&
          child.x + child.width <= parent.x + parent.width &&
          child.y + child.height <= parent.y + parent.height,
      ).toBe(true);
    }
    expect(scene.bounds.width).toBeGreaterThan(0);
    expect(scene.bounds.height).toBeGreaterThan(0);
    for (const primitive of scene.primitives) {
      const points =
        primitive.type === "path"
          ? primitive.points
          : [
              { x: primitive.x, y: primitive.y },
              { x: primitive.x + primitive.width, y: primitive.y + primitive.height },
            ];
      for (const point of points) {
        expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true);
        expect(
          point.x >= scene.bounds.x &&
            point.x <= scene.bounds.x + scene.bounds.width &&
            point.y >= scene.bounds.y &&
            point.y <= scene.bounds.y + scene.bounds.height,
        ).toBe(true);
      }
    }
  });
