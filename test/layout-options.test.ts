import { expect, test } from "bun:test";
import { parseDiagramAsync, layoutDiagram } from "../src/index.ts";
import { normalizeLayoutOptions } from "../src/layout/options.ts";
import type { LayoutOptions } from "../src/types.ts";

test("non-finite shared host options yield finite scenes across layout families", async () => {
  const options: LayoutOptions = {
    fontSize: NaN,
    radius: Infinity,
    padding: -Infinity,
    nodeSeparation: NaN,
    rankSeparation: Infinity,
    maxLabelWidth: NaN,
    maxLabelLines: Infinity,
  };
  for (const source of [
    "flowchart LR\nA --> B",
    "sequenceDiagram\nA->>B: Hello",
    'pie\n"A": 2\n"B": 3',
    'packet-beta\n0-7: "Data"',
    "sankey-beta\nA,B,4",
    "block-beta\nA B",
  ]) {
    const scene = layoutDiagram(await parseDiagramAsync(source), undefined, options);
    expect(
      [scene.bounds.x, scene.bounds.y, scene.bounds.width, scene.bounds.height].every(
        Number.isFinite,
      ),
    ).toBe(true);
    expect(scene.bounds.width).toBeGreaterThan(0);
    expect(scene.bounds.height).toBeGreaterThan(0);
  }
});

test("normalization preserves authored finite values and callbacks without mutation", () => {
  const resolveIcon = () => undefined;
  const options: LayoutOptions = {
    fontSize: 18,
    padding: 26,
    nodeSeparation: 90,
    maxLabelLines: 7.8,
    resolveIcon,
    typeStyles: {
      pie: { diameter: 260, legendPosition: "right" },
      xychart: { pointRadius: NaN, seriesLabels: ["Revenue"] },
    },
  };
  const normalized = normalizeLayoutOptions(options);
  expect(normalized).toMatchObject({
    fontSize: 18,
    padding: 26,
    nodeSeparation: 90,
    maxLabelLines: 7,
    resolveIcon,
    typeStyles: {
      pie: { diameter: 260, legendPosition: "right" },
      xychart: { seriesLabels: ["Revenue"] },
    },
  });
  expect(normalized.typeStyles?.xychart?.pointRadius).toBeUndefined();
  expect(options.typeStyles?.xychart?.pointRadius).toBeNaN();
  expect(options.maxLabelLines).toBe(7.8);
});
