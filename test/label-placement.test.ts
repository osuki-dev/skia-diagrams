import { describe, expect, test } from "bun:test";
import { placeLabels } from "../src/layout/label-placement.ts";
import { layoutDiagram } from "../src/layout/index.ts";
import { parseDiagram } from "../src/parse/index.ts";
import { estimateText } from "../src/layout/measure.ts";
import catalog from "./fixtures/official-mermaid/catalog.json" with { type: "json" };
import type { Primitive, Rect } from "../src/types.ts";

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
function circleOverlaps(rect: Rect, cx: number, cy: number, radius: number): boolean {
  const x = Math.max(rect.x, Math.min(cx, rect.x + rect.width));
  const y = Math.max(rect.y, Math.min(cy, rect.y + rect.height));
  return Math.hypot(x - cx, y - cy) < radius;
}

describe("measured chart labels", () => {
  test("coincident data points keep every label readable and preserve anchors", () => {
    const anchors = Array.from({ length: 300 }, (_, index) => ({
      id: String(index),
      x: 140,
      y: 140,
      width: 96,
      height: 20,
      radius: index % 3 === 0 ? 48 : 5,
    }));
    const original = JSON.stringify(anchors);
    const labels = placeLabels(anchors, { x: 0, y: 0, width: 280, height: 280 }, [
      { x: 0, y: 0, width: 280, height: 35 },
    ]);
    expect(labels).toHaveLength(300);
    expect(JSON.stringify(anchors)).toBe(original);
    expect(labels).toEqual(
      placeLabels(anchors, { x: 0, y: 0, width: 280, height: 280 }, [
        { x: 0, y: 0, width: 280, height: 35 },
      ]),
    );
    const collisions: string[] = [];
    for (let i = 0; i < labels.length; i++) {
      if (circleOverlaps(labels[i], 140, 140, 48)) collisions.push(`anchor/${i}`);
      for (let j = i + 1; j < labels.length; j++)
        if (overlaps(labels[i], labels[j])) collisions.push(`${i}/${j}`);
    }
    expect(collisions).toEqual([]);
  });

  for (const fixture of catalog.types
    .find((type) => type.type === "quadrantChart")!
    .cases.filter(
      (fixture) => fixture.id === "quadrantChart/001" || fixture.id === "quadrantChart/003",
    )) {
    test(`${fixture.id} has no point-label, heading-label, or label-label collisions`, () => {
      const parsed = parseDiagram(fixture.source);
      expect(parsed.kind).toBe("quadrant");
      if (parsed.kind === "error" || parsed.kind === "unsupported")
        throw new Error("Official quadrant fixture failed to parse");
      const scene = layoutDiagram(parsed, estimateText);
      const texts = scene.primitives.filter(
        (primitive): primitive is Extract<Primitive, { type: "text" }> => primitive.type === "text",
      );
      const dataLabels = texts.filter((primitive) => primitive.text.startsWith("Campaign"));
      const markers = scene.primitives.filter(
        (primitive): primitive is Extract<Primitive, { type: "shape" }> =>
          primitive.type === "shape" && primitive.shape === "circle",
      );
      expect(dataLabels).toHaveLength(6);
      expect(markers).toHaveLength(6);
      for (const label of dataLabels) {
        for (const other of texts) if (label !== other) expect(overlaps(label, other)).toBe(false);
        for (const marker of markers)
          expect(
            circleOverlaps(
              label,
              marker.x + marker.width / 2,
              marker.y + marker.height / 2,
              marker.width / 2,
            ),
          ).toBe(false);
        expect(label.x).toBeGreaterThanOrEqual(scene.bounds.x);
        expect(label.y + label.height).toBeLessThanOrEqual(scene.bounds.y + scene.bounds.height);
      }
      for (const event of parsed.ir.events.filter((event) => event.type !== "axis-label")) {
        expect(dataLabels.find((label) => label.text === event.label)).toBeDefined();
      }
      expect(scene.interactions!.every((interaction) => interaction.hit?.type === "circle")).toBe(
        true,
      );
    });
  }

  test("host font sizes keep headings and data labels clear of authored markers", () => {
    const fixtures = catalog.types.find((type) => type.type === "quadrantChart")!.cases;
    for (const fontSize of [10, 14, 24, 32, 48, 72])
      for (const fixture of [fixtures[0], fixtures[2]]) {
        const scene = layoutDiagram(parseDiagram(fixture.source), estimateText, { fontSize });
        const labels = scene.primitives.filter(
          (primitive): primitive is Extract<Primitive, { type: "text" }> =>
            primitive.type === "text",
        );
        const markers = scene.primitives.filter(
          (primitive): primitive is Extract<Primitive, { type: "shape" }> =>
            primitive.type === "shape" && primitive.shape === "circle",
        );
        for (let i = 0; i < labels.length; i++) {
          for (let j = i + 1; j < labels.length; j++)
            expect(overlaps(labels[i], labels[j])).toBe(false);
          for (const marker of markers)
            expect(
              circleOverlaps(
                labels[i],
                marker.x + marker.width / 2,
                marker.y + marker.height / 2,
                marker.width / 2,
              ),
            ).toBe(false);
        }
      }
  });

  test("short y-axis captions reserve their origin and native replay rounding", () => {
    for (const fontSize of [10, 14, 18, 24]) {
      const source = `quadrantChart\ny-axis Low --> High\nA: [0.2, 0.8]`;
      const scene = layoutDiagram(parseDiagram(source), estimateText, {
        fontSize,
      });
      const caption = scene.primitives.find(
        (primitive): primitive is Extract<Primitive, { type: "text" }> =>
          primitive.type === "text" && primitive.text === "High",
      )!;
      const frame = scene.primitives.find(
        (primitive): primitive is Extract<Primitive, { type: "shape" }> =>
          primitive.type === "shape" && primitive.strokeRole === "frame",
      )!;
      expect(caption.lineRuns).toHaveLength(1);
      expect(caption.lineRuns![0].map((run) => run.text).join("")).toBe("High");
      expect(caption.width).toBeGreaterThan(estimateText("High", { fontSize }).width);
      expect(caption.x + caption.width).toBeLessThan(frame.x);
    }
  });

  test("long labels wrap without losing any source text", () => {
    const source = `quadrantChart\nquadrant-1 A long quadrant heading requiring wrapping\nOne particularly long source label that must remain complete: [0.8, 0.8]\nAnother particularly long source label that must remain complete: [0.8, 0.8]`;
    const parsed = parseDiagram(source);
    const scene = layoutDiagram(parsed, estimateText, { maxLabelLines: 1 });
    const labels = scene.primitives.filter(
      (primitive): primitive is Extract<Primitive, { type: "text" }> => primitive.type === "text",
    );
    expect(labels).toHaveLength(3);
    expect(
      labels.every((label) => !label.lineRuns?.flat().some((run) => run.text.includes("…"))),
    ).toBe(true);
    expect(labels.every((label) => label.height > 20)).toBe(true);
    for (let i = 0; i < labels.length; i++)
      for (let j = i + 1; j < labels.length; j++)
        expect(overlaps(labels[i], labels[j])).toBe(false);
  });
});
