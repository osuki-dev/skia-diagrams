import { expect, test } from "bun:test";
import { parseDiagram } from "../src/parse/index.ts";
import { layoutDiagram } from "../src/layout/index.ts";
import catalog from "./fixtures/official-mermaid/catalog.json" with { type: "json" };

test("declared empty Git branches remain visible with explicit and main ordering", () => {
  for (const [id, expected] of [
    ["gitgraph/016", ["main", "test3", "test2", "test1"]],
    ["gitgraph/017", ["test2", "test3", "test4", "main", "test1"]],
  ] as const) {
    const source = catalog.types
      .find((type) => type.type === "gitgraph")!
      .cases.find((fixture) => fixture.id === id)!.source;
    const scene = layoutDiagram(parseDiagram(source));
    const names = new Set<string>(expected);
    const labels = scene.primitives
      .filter((primitive) => primitive.type === "text")
      .filter((primitive) => names.has(primitive.text));
    expect(labels.sort((a, b) => a.y - b.y).map((label) => label.text)).toEqual([...expected]);
  }
});

test("REVERSE uses a crossed circle and HIGHLIGHT uses nested squares", () => {
  const scene = layoutDiagram(
    parseDiagram(
      'gitGraph\ncommit id:"first"\ncommit id:"revert" type: REVERSE\ncommit id:"highlight" type: HIGHLIGHT',
    ),
  );
  expect(
    scene.primitives.filter((primitive) => primitive.type === "shape").map((shape) => shape.shape),
  ).toEqual(["circle", "circle", "rect", "rect"]);
  const routes = scene.primitives.filter((primitive) => primitive.type === "path");
  expect(routes).toHaveLength(4);
  const highlightFrame = scene.primitives
    .filter((primitive) => primitive.type === "shape")
    .find((shape) => shape.shape === "rect")!;
  expect(routes[1].points.at(-1)!.x).toBe(highlightFrame.x);
});

test("Git tags preserve authored commit labels in separate measured rows", () => {
  const source = catalog.types
    .find((type) => type.type === "gitgraph")!
    .cases.find((fixture) => fixture.id === "gitgraph/005")!.source;
  const parsed = parseDiagram(source);
  const scene = layoutDiagram(parsed);
  const labels = scene.primitives.filter((primitive) => primitive.type === "text");
  for (const [commit, tag] of [
    ["Normal", "v1.0.0"],
    ["Reverse", "RC_1"],
    ["Highlight", "8.8.4"],
  ]) {
    const commitText = labels.find((label) => label.text === commit)!;
    const tagText = labels.find((label) => label.text === tag)!;
    expect(commitText).toBeDefined();
    expect(tagText).toBeDefined();
    expect(tagText.y + tagText.height).toBeLessThan(commitText.y);
    const tagBox = scene.primitives
      .filter((primitive) => primitive.type === "shape")
      .find(
        (shape) =>
          shape.shape === "flag" &&
          shape.y === tagText.y - 5 &&
          shape.x < tagText.x &&
          shape.x + shape.width > tagText.x,
      )!;
    expect(tagText.x).toBeGreaterThan(tagBox.x + tagBox.width * 0.2);
    expect(tagText.x + tagText.width).toBeLessThan(tagBox.x + tagBox.width);
  }
});

test("Git declared branches without commits retain dashed native tracks", () => {
  const source = catalog.types
    .find((type) => type.type === "gitgraph")!
    .cases.find((fixture) => fixture.id === "gitgraph/016")!.source;
  const scene = layoutDiagram(parseDiagram(source));
  const tracks = scene.primitives
    .filter((primitive) => primitive.type === "path")
    .filter((primitive) => primitive.dash);
  expect(tracks).toHaveLength(3);
  for (const track of tracks) {
    expect(track.points.at(-1)!.x).toBeGreaterThan(track.points[0].x);
    expect(track.points[0].y).toBe(track.points.at(-1)!.y);
  }
});
