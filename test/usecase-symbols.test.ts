import { expect, test } from "bun:test";
import type { Node, Primitive } from "../src/types.ts";
import { renderUsecaseActor, renderUsecaseBusinessMark } from "../src/layout/usecase-symbols.ts";
import { estimateText } from "../src/layout/measure.ts";
import { lightTheme, resolveColor, resolveStrokeWidth } from "../src/render/theme.ts";
const rect = { x: 100, y: 20, width: 120, height: 110 };
const actor = (type: string, business = false): Node => ({
  id: "Actor",
  label: "Actor",
  shape: "stadium",
  metadata: { role: "actor", type, business },
});

test("normal, hollow and awesome actor contours preserve their distinct native silhouettes", () => {
  const normal: Primitive[] = [],
    hollow: Primitive[] = [],
    awesome: Primitive[] = [];
  renderUsecaseActor(actor("normal"), rect, normal);
  renderUsecaseActor(actor("hollow"), rect, hollow);
  renderUsecaseActor(actor("awesome"), rect, awesome);
  expect(normal.filter((primitive) => primitive.type === "path")).toHaveLength(4);
  expect(hollow.find((primitive) => primitive.type === "shape")?.fill).toBe("none");
  expect(hollow.find((primitive) => primitive.type === "path")).toMatchObject({
    closed: true,
    fill: "none",
  });
  expect(awesome.find((primitive) => primitive.type === "path")).toMatchObject({
    closed: true,
    fill: "paletteFill:1",
  });
  for (const glyph of [normal, hollow, awesome]) {
    expect(glyph.some((primitive) => primitive.type === "text")).toBe(false);
    for (const primitive of glyph) {
      if (primitive.type !== "path") continue;
      for (const point of primitive.points) {
        expect(point.x).toBeGreaterThanOrEqual(rect.x);
        expect(point.x).toBeLessThanOrEqual(rect.x + rect.width);
        expect(point.y).toBeGreaterThanOrEqual(rect.y);
        expect(point.y).toBeLessThanOrEqual(rect.y + 80);
      }
    }
  }
});

test("business actor slash stays on the head and inherits authored styling", () => {
  const primitives: Primitive[] = [];
  renderUsecaseActor(
    { ...actor("hollow", true), style: { stroke: "#123456", strokeWidth: 3 } },
    rect,
    primitives,
  );
  const marker = primitives.at(-1);
  expect(marker).toMatchObject({ type: "path", stroke: "#123456", strokeWidth: 3 });
  if (marker?.type !== "path") throw new Error("Expected business actor marker");
  expect(marker.points[0].x).toBeLessThan(marker.points[1].x);
  expect(marker.points[0].y).toBeGreaterThan(marker.points[1].y);
  expect(marker.points.every((point) => point.y >= rect.y && point.y < rect.y + 40)).toBe(true);
});

test("host icons resolve as native primitives and missing icons use a vector fallback", () => {
  const node = { ...actor("normal"), metadata: { role: "actor", icon: "custom:user" } };
  const missing: Primitive[] = [],
    registered: Primitive[] = [];
  renderUsecaseActor(node, rect, missing);
  expect(
    missing.some(
      (primitive) =>
        primitive.type === "shape" &&
        primitive.shape === "rect" &&
        primitive.fill === "paletteFill:1",
    ),
  ).toBe(true);
  expect(
    missing.some((primitive) => primitive.type === "text" && primitive.text === "custom:user"),
  ).toBe(true);
  renderUsecaseActor(node, rect, registered, (name, iconRect) => {
    expect(name).toBe("custom:user");
    expect(iconRect.width).toBe(42);
    return [{ type: "shape", shape: "diamond", ...iconRect, fill: "accent" }];
  });
  expect(
    registered.some((primitive) => primitive.type === "shape" && primitive.shape === "diamond"),
  ).toBe(true);
  expect(
    registered.some(
      (primitive) =>
        primitive.type === "shape" &&
        primitive.shape === "rect" &&
        primitive.fill === "paletteFill:1",
    ),
  ).toBe(false);
});

test("business use case marker follows the right ellipse boundary", () => {
  const primitives: Primitive[] = [];
  renderUsecaseBusinessMark(
    {
      id: "Quote",
      label: "Quote",
      shape: "stadium",
      metadata: { business: true, role: "usecase" },
    },
    rect,
    primitives,
  );
  expect(primitives).toHaveLength(1);
  const marker = primitives[0];
  if (marker.type !== "path") throw new Error("Expected business marker");
  for (const point of marker.points) {
    const x = (point.x - rect.x - rect.width / 2) / (rect.width / 2);
    const y = (point.y - rect.y - rect.height / 2) / (rect.height / 2);
    expect(x * x + y * y).toBeCloseTo(1, 8);
  }
});

test("fallback actor inherits host tokens, geometry and authored stroke precedence", () => {
  const node = { ...actor("normal"), metadata: { role: "actor", icon: "missing:host" } };
  const primitives: Primitive[] = [];
  renderUsecaseActor(node, rect, primitives, undefined, {
    fontSize: 24,
    radius: 12,
    measure: estimateText,
  });
  const theme = {
    ...lightTheme,
    strokeWidth: 3,
    nodeStroke: "#345678",
    paletteFill: ["#112233", "#223344"],
    paletteText: ["#eeeeee", "#fedcba"],
  };
  const frame = primitives.find((p) => p.type === "shape" && p.shape === "round")!;
  expect(frame).toMatchObject({ radius: 12, stroke: "nodeStroke" });
  expect(resolveStrokeWidth(frame, theme)).toBe(3);
  expect(resolveColor(frame.stroke, "", theme)).toBe("#345678");
  expect(primitives.some((p) => resolveColor(p.fill, "", theme) === "#223344")).toBe(true);
  expect(primitives.some((p) => resolveColor(p.fill, "", theme) === "#fedcba")).toBe(true);
  const label = primitives.find((p) => p.type === "text")!;
  expect(label).toMatchObject({ fontSize: 24, literal: true });
  if (label.type !== "text") throw new Error("Missing fallback identifier");
  expect(label.height).toBe(
    estimateText(label.text, { fontSize: 24, literal: true, maxWidth: label.width }).height,
  );
  const authored: Primitive[] = [];
  renderUsecaseActor(
    { ...node, style: { strokeWidth: 5, stroke: "#abcdef" } },
    rect,
    authored,
    undefined,
    { strokeWidth: 3 },
  );
  expect(authored.find((p) => p.type === "shape" && p.shape === "round")).toMatchObject({
    strokeWidth: 5,
    stroke: "#abcdef",
  });
});
