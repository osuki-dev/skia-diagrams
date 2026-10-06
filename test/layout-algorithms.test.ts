import { expect, test } from "bun:test";
import { emptyIR } from "../src/parse/common.ts";
import { compoundLayout } from "../src/layout/graph.ts";
import { SceneCache } from "../src/layout/cache.ts";
import { estimateText } from "../src/layout/measure.ts";

test("compound hierarchy rejects disconnected cycles and excessive depth before Dagre", () => {
  const ir = emptyIR();
  ir.clusters = [
    { id: "a", label: "A", parent: "b" },
    { id: "b", label: "B", parent: "a" },
  ];
  expect(() => compoundLayout(ir, new Map(), estimateText, {})).toThrow("Cyclic");
  ir.clusters = Array.from({ length: 65 }, (_, index) => ({
    id: String(index),
    label: String(index),
    ...(index ? { parent: String(index - 1) } : {}),
  }));
  expect(() => compoundLayout(ir, new Map(), estimateText, {})).toThrow("64 levels");
  ir.clusters = [{ id: "a", label: "A", parent: "missing" }];
  expect(() => compoundLayout(ir, new Map(), estimateText, {})).toThrow("Unknown cluster");
});

test("concurrent native grammar requests share one preparation and release pending state", async () => {
  const cache = new SceneCache(0);
  const source = 'packet-beta\n0-7: "Header"';
  let measurements = 0;
  const measure: typeof estimateText = (...args) => {
    measurements++;
    return estimateText(...args);
  };
  const first = cache.prepareAsync("packet", source, measure, 14);
  const second = cache.prepareAsync("packet", source, measure, 14);
  expect(second).toBe(first);
  expect(await first).toEqual(await second);
  const count = measurements;
  expect(count).toBeGreaterThan(0);
  await cache.prepareAsync("packet", source, measure, 14);
  expect(measurements).toBe(count * 2);
  expect(cache.size).toBe(0);
});

test("invalid cache budgets cannot leave eviction in an unbounded loop", () => {
  for (const budget of [-1, NaN, Infinity, 0.5])
    expect(() => new SceneCache(budget)).toThrow(RangeError);
});

test("Dagre isolates prototype names while preserving semantic IDs, edge order and geometry", () => {
  const ir = emptyIR();
  ir.direction = "LR";
  ir.clusters = [{ id: "__proto__", label: "Group" }];
  ir.nodes = [
    { id: "constructor", label: "Constructor", shape: "rect", parent: "__proto__" },
    { id: "toString", label: "To string", shape: "rect", parent: "__proto__" },
    { id: "hasOwnProperty", label: "Own", shape: "rect" },
  ];
  ir.edges = [
    {
      id: "constructor",
      from: "constructor",
      to: "toString",
      label: "First",
      start: "none",
      end: "arrow",
    },
    {
      id: "__proto__",
      from: "toString",
      to: "hasOwnProperty",
      label: "Second",
      start: "none",
      end: "arrow",
    },
  ];
  const sizes = new Map(ir.nodes.map((node) => [node.id, { width: 80, height: 40 }]));
  const graph = compoundLayout(ir, sizes, estimateText, {});
  expect(new Set(graph.nodes())).toEqual(
    new Set(["__proto__", "constructor", "toString", "hasOwnProperty"]),
  );
  for (const node of ir.nodes) {
    expect(Number.isFinite(graph.node(node.id).x)).toBe(true);
    expect(Number.isFinite(graph.node(node.id).y)).toBe(true);
  }
  ir.edges.forEach((edge, index) => {
    const route = graph.edge({ v: edge.from, w: edge.to, name: String(index) });
    expect(route.points.length).toBeGreaterThanOrEqual(2);
    expect(
      route.points.every(
        (point: { x: number; y: number }) => Number.isFinite(point.x) && Number.isFinite(point.y),
      ),
    ).toBe(true);
  });
  expect(ir.nodes[0].id).toBe("constructor");
  expect(sizes.get("constructor")).toEqual({ width: 80, height: 40 });
});
