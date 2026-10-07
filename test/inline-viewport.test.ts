import { initialDiagramCamera } from "../src/react/initial-camera.ts";
import { expect, test } from "bun:test";
import { inlineViewport } from "../src/react/viewport.ts";
import { inlineLayoutWidth } from "../src/react/layout-viewport.ts";
import { layoutDiagram, parseDiagram } from "../src/index.ts";

test("only Pie receives a natural inline width budget through official metadata", () => {
  const pie = `---\ntitle: Minerals\n---\n%%{init: {"theme": "base"}}%%\n%% example\npie showData\n"Calcium": 40`;
  expect(inlineLayoutWidth(pie, 320, false)).toBe(320);
  for (const source of ["flowchart LR\nA-->B", "gantt\ntitle pie", "xychart-beta\nbar [1]"])
    expect(inlineLayoutWidth(source, 320, false)).toBeUndefined();
  expect(inlineLayoutWidth("flowchart LR\nA-->B", 320, true)).toBeUndefined();
  expect(inlineLayoutWidth(pie, 320, true)).toBeUndefined();
  expect(inlineLayoutWidth(pie, undefined, false)).toBeUndefined();
  expect(inlineLayoutWidth(pie, Number.NaN, false)).toBeUndefined();
});

test("theme previews fit complete tall and wide diagrams without changing normal inline scale", () => {
  for (const bounds of [
    { width: 200, height: 480 },
    { width: 640, height: 220 },
  ]) {
    const preview = inlineViewport(bounds, 320, { width: 390, height: 800 }, 0.9, 240, true);
    expect(preview.contentWidth).toBeLessThanOrEqual(320);
    expect(preview.contentHeight).toBeLessThanOrEqual(240);
    expect(preview.height).toBe(preview.contentHeight);
    expect(preview.overflow).toBe(false);
    expect(
      inlineViewport(bounds, 320, { width: 390, height: 800 }, 0.9, 240).scale,
    ).toBeGreaterThanOrEqual(0.9);
  }
});

test("legal 300-node chains retain scroll extent without allocating a scene-sized Canvas", () => {
  for (const direction of ["TD", "LR"]) {
    const source =
      `flowchart ${direction}\n` +
      Array.from({ length: 299 }, (_, i) => `N${i}-->N${i + 1}`).join("\n");
    const scene = layoutDiagram(parseDiagram(source));
    for (const width of [320, 360, 390]) {
      const view = inlineViewport(scene.bounds, width, { width, height: 800 }, 0.9);
      expect(view.width).toBeLessThanOrEqual(width);
      expect(view.height).toBeLessThanOrEqual(600);
      expect(view.scale).toBeGreaterThanOrEqual(0.9);
      expect(view.overflow).toBe(true);
      expect(view.contentWidth).toBeCloseTo(scene.bounds.width * view.scale);
      expect(view.contentHeight).toBeCloseTo(scene.bounds.height * view.scale);
      expect(
        direction === "TD" ? view.contentHeight / view.height : view.contentWidth / view.width,
      ).toBeGreaterThan(20);
    }
  }
});
test("extreme aspect ratios and host limits never enlarge the backing viewport past the window", () => {
  for (const bounds of [
    { width: 100000, height: 40 },
    { width: 40, height: 100000 },
    { width: 5000, height: 5000 },
  ]) {
    const v = inlineViewport(bounds, 100000, { width: 390, height: 800 }, 0.9, 100000);
    expect(v.width).toBeLessThanOrEqual(390);
    expect(v.height).toBeLessThanOrEqual(800);
    expect(v.contentWidth * v.contentHeight).toBeGreaterThan(v.width * v.height);
  }
  expect(inlineViewport({ width: 100, height: 40 }, 320, { width: 390, height: 800 }, 0.9)).toEqual(
    { width: 320, height: 40, contentWidth: 100, contentHeight: 40, overflow: false, scale: 1 },
  );
});

test("resizing and malformed host viewport tokens retain finite bounded dimensions", () => {
  for (const window of [
    { width: 320, height: 600 },
    { width: 800, height: 320 },
  ])
    for (const maxWidth of [0, -20, NaN, Infinity, 100000])
      for (const maxHeight of [0, -20, NaN, Infinity, 100000]) {
        const view = inlineViewport(
          { width: 50000, height: 50000 },
          maxWidth,
          window,
          NaN,
          maxHeight,
        );
        expect(view.width).toBeGreaterThan(0);
        expect(view.height).toBeGreaterThan(0);
        expect(view.width).toBeLessThanOrEqual(window.width);
        expect(view.height).toBeLessThanOrEqual(window.height);
        expect(view.scale).toBe(1);
      }
});

test("default inline viewport uses page height and only collapses very long scenes", () => {
  const view = inlineViewport({ width: 1800, height: 1200 }, 320, { width: 390, height: 800 });
  expect(view.scale).toBe(1);
  expect(view.width).toBe(320);
  expect(view.height).toBe(1200);
  expect(view.contentWidth).toBe(1800);
  expect(view.contentHeight).toBe(1200);
  expect(view.overflow).toBe(true);
  expect(inlineViewport({ width: 200, height: 900 }, 320, { width: 390, height: 800 }).height).toBe(
    900,
  );
  expect(
    inlineViewport({ width: 200, height: 15000 }, 320, { width: 390, height: 800 }).height,
  ).toBe(420);
  expect(
    inlineViewport({ width: 200, height: 900 }, 320, { width: 390, height: 800 }, 1, 240).height,
  ).toBe(240);
});

test("natural mindmap camera starts at the root without moving graph geometry", () => {
  const scene = layoutDiagram(
    parseDiagram(
      "mindmap\n  root((Project))\n    Research\n      Long research branch with multiple substantial words\n    Delivery\n      Long delivery branch with multiple substantial words\n    Operations\n      Long operations branch with multiple substantial words",
    ),
  );
  const root = scene.primitives.find((p) => p.type === "shape" && p.semantic?.role === "root");
  if (!root || root.type !== "shape") throw new Error("Missing semantic root");
  const geometry = JSON.stringify(scene);
  const viewport = { width: 320, height: 240, scale: 1 };
  const camera = initialDiagramCamera(scene, viewport);
  const rootX = root.x + root.width / 2 - scene.bounds.x - camera.x,
    rootY = root.y + root.height / 2 - scene.bounds.y - camera.y;
  expect(camera.x).toBeGreaterThan(0);
  expect(rootX).toBeGreaterThanOrEqual(0);
  expect(rootX).toBeLessThanOrEqual(viewport.width);
  expect(rootY).toBeGreaterThanOrEqual(0);
  expect(rootY).toBeLessThanOrEqual(viewport.height);
  expect(JSON.stringify(scene)).toBe(geometry);
  expect(
    initialDiagramCamera(scene, {
      width: scene.bounds.width,
      height: scene.bounds.height,
      scale: 1,
    }),
  ).toEqual({ x: 0, y: 0 });
  const flow = layoutDiagram(parseDiagram("flowchart LR\n A --> B"));
  expect(initialDiagramCamera(flow, viewport)).toEqual({ x: 0, y: 0 });
});
