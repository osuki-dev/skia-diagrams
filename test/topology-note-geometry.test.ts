import { expect, test } from "bun:test";
import { layoutDiagram, parseDiagram } from "../src/index.ts";
import type { Point, Rect } from "../src/types.ts";

function onPerimeter(point: Point, rect: Rect) {
  const epsilon = 0.001;
  return (
    point.x >= rect.x - epsilon &&
    point.x <= rect.x + rect.width + epsilon &&
    point.y >= rect.y - epsilon &&
    point.y <= rect.y + rect.height + epsilon &&
    Math.min(
      Math.abs(point.x - rect.x),
      Math.abs(point.x - rect.x - rect.width),
      Math.abs(point.y - rect.y),
      Math.abs(point.y - rect.y - rect.height),
    ) < epsilon
  );
}

for (const fontSize of [10, 14, 18, 24]) {
  test(`attached UML notes meet silhouettes and stay outside their nodes at ${fontSize}pt`, () => {
    for (const source of [
      'classDiagram\nclass Service\nnote for Service "Two lines\\nHost-owned font"',
      "stateDiagram-v2\nA --> B\nnote right of A\nTwo lines\nHost-owned font\nend note\nnote left of B: Left note",
    ]) {
      const parsed = parseDiagram(source);
      expect(parsed.kind).not.toBe("error");
      const scene = layoutDiagram(parsed, undefined, { fontSize });
      const notes = scene.primitives.filter((p) => p.type === "shape" && p.fill === "noteFill");
      const connectors = scene.primitives.filter((p) => p.type === "path" && p.dash?.[0] === 4);
      expect(connectors.length).toBe(notes.length);
      for (const note of notes) {
        if (note.type !== "shape") throw new Error("Expected note surface");
        const connector = connectors.find(
          (p) => p.type === "path" && onPerimeter(p.points.at(-1)!, note),
        );
        expect(connector).toBeDefined();
        if (connector?.type !== "path") throw new Error("Missing perimeter connector");
        const owner = scene.primitives.find(
          (p) => p.type === "shape" && p.id && onPerimeter(connector.points[0], p),
        );
        expect(owner).toBeDefined();
        expect(scene.primitives.indexOf(connector)).toBeLessThan(scene.primitives.indexOf(note));
        expect(connector.start).toBeUndefined();
        expect(connector.end).toBeUndefined();
      }
    }
  });
}

test("multiple attached notes reserve distinct centered stacks on each side", () => {
  for (const fontSize of [10, 14, 18, 24]) {
    const scene = layoutDiagram(
      parseDiagram(
        "stateDiagram-v2\nA --> B\nnote right of A: First\nnote right of A: Second\nnote left of A: Third\nnote left of A: Fourth",
      ),
      undefined,
      { fontSize },
    );
    const notes = scene.primitives.filter((p) => p.type === "shape" && p.fill === "noteFill");
    expect(notes).toHaveLength(4);
    for (let i = 0; i < notes.length; i++)
      for (let j = i + 1; j < notes.length; j++) {
        const a = notes[i],
          b = notes[j];
        if (a.type !== "shape" || b.type !== "shape") throw new Error("Expected note surface");
        const overlap =
          a.x < b.x + b.width &&
          b.x < a.x + a.width &&
          a.y < b.y + b.height &&
          b.y < a.y + a.height;
        expect(overlap).toBe(false);
      }
    expect(scene.primitives.filter((p) => p.type === "path" && p.dash?.[0] === 4)).toHaveLength(4);
  }
});
