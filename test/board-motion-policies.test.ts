import { expect, test } from "bun:test";
import { layoutDiagram, parseDiagramAsync } from "../src/index.ts";
import { officialCatalog } from "../example/official-fixtures.ts";
import { architectureMotion } from "../src/react/motion-policies/architecture.ts";
import { blockMotion } from "../src/react/motion-policies/block.ts";
import { swimlanesMotion } from "../src/react/motion-policies/swimlanes.ts";
import { boardFlowRanks } from "../src/react/motion-policies/board-order.ts";
import type { DiagramMotionPolicy } from "../src/react/motion-policy.ts";

const cases = officialCatalog.types.flatMap(
  (type) => type.cases as readonly { id: string; source: string }[],
);
for (const [id, policy] of [
  ["architecture/004", architectureMotion],
  ["block/027", blockMotion],
  ["swimlanes/013", swimlanesMotion],
] as [string, DiagramMotionPolicy][]) {
  test(`${id} motion keeps every glyph and relationship in exactly one semantic layer`, async () => {
    const scene = layoutDiagram(
      await parseDiagramAsync(cases.find((item) => item.id === id)!.source),
    );
    const plan = policy(scene),
      owned = [
        ...plan.staticPrimitives,
        ...plan.layers.flatMap((layer) => layer.primitives),
        ...plan.numbers.map((number) => number.primitive),
      ];
    expect(owned.length).toBe(scene.primitives.length);
    expect(new Set(owned).size).toBe(scene.primitives.length);
    expect(plan.layers.length).toBeLessThanOrEqual(12);
    expect(
      plan.layers
        .filter((layer) => layer.mode === "trace")
        .every((layer) => layer.primitives.every((p) => p.type === "path")),
    ).toBe(true);
    const nodePrimitives = scene.primitives.filter((p) => p.semantic?.kind === "node");
    expect(nodePrimitives.length).toBeGreaterThan(0);
    for (const p of nodePrimitives) {
      const layer = plan.layers.find((layer) => layer.primitives.includes(p));
      expect(layer).toBeDefined();
      const siblings = nodePrimitives.filter((other) => other.semantic!.id === p.semantic!.id);
      expect(siblings.every((other) => layer!.primitives.includes(other))).toBe(true);
    }
    if (id.startsWith("architecture")) {
      expect(plan.layers.some((layer) => layer.mode === "lift")).toBe(true);
      const groups = plan.layers.find((layer) =>
        layer.primitives.some((p) => p.semantic?.kind === "frame"),
      )!;
      const services = plan.layers.filter((layer) =>
        layer.primitives.some((p) => p.semantic?.kind === "node"),
      );
      expect(services.every((layer) => layer.delay > groups.delay)).toBe(true);
      expect(plan.layers.some((layer) => layer.mode === "trace")).toBe(true);
    } else if (id.startsWith("block")) {
      expect(
        plan.layers.every(
          (layer) => layer.mode === "scale" || layer.mode === "trace" || layer.mode === "fade",
        ),
      ).toBe(true);
      expect(plan.layers.some((layer) => layer.mode === "scale")).toBe(true);
    } else {
      const frames = scene.primitives.filter((p) => p.semantic?.kind === "frame");
      expect(frames.length).toBeGreaterThan(0);
      expect(frames.every((p) => plan.staticPrimitives.includes(p))).toBe(true);
      expect(
        plan.layers
          .filter((layer) => layer.mode === "draw-x")
          .every((layer) => layer.regions?.length),
      ).toBe(true);
      const ranks = boardFlowRanks(scene);
      const delay = (id: string) =>
        plan.layers.find((layer) =>
          layer.primitives.some((p) => p.semantic?.kind === "node" && p.semantic.id === id),
        )!.delay;
      for (const [a, rankA] of ranks)
        for (const [b, rankB] of ranks)
          if (rankA < rankB) expect(delay(a)).toBeLessThanOrEqual(delay(b));
    }
  });
}

test("wide Block targets receive shafts at their outer top boundary without traversing source text", async () => {
  const parsed = await parseDiagramAsync(cases.find((item) => item.id === "block/001")!.source);
  for (const fontSize of [10, 14, 18, 24]) {
    const scene = layoutDiagram(parsed, undefined, { fontSize });
    const c = scene.primitives.find((p) => p.type === "shape" && p.id === "C"),
      d = scene.primitives.find((p) => p.type === "shape" && p.id === "D");
    const edge = scene.primitives.find(
      (p) => p.type === "path" && p.semantic?.from === "C" && p.semantic?.to === "D",
    );
    if (c?.type !== "shape" || d?.type !== "shape" || edge?.type !== "path")
      throw new Error("Missing semantic geometry");
    expect(edge.points[0].y).toBe(c.y + c.height);
    expect(edge.points.at(-1)!.y).toBe(d.y);
    expect(edge.points[0].x).toBe(edge.points.at(-1)!.x);
    expect(edge.points.every((point) => point.y >= c.y + c.height && point.y <= d.y)).toBe(true);
  }
});

test("flow motion waits for the longest incoming branch and groups finite feedback cycles", () => {
  const ids = ["start", "a", "b", "c", "d", "merge", "finish"];
  const connections = [
    ["start", "a"],
    ["a", "merge"],
    ["start", "b"],
    ["b", "c"],
    ["c", "d"],
    ["d", "merge"],
    ["merge", "finish"],
  ];
  const scene: import("../src/types.ts").Scene = {
    kind: "swimlanes",
    bounds: { x: 0, y: 0, width: 100, height: 100 },
    accessibilityLabel: "Dependency ranks",
    primitives: [
      ...ids.map((id) => ({
        type: "shape" as const,
        shape: "rect" as const,
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        semantic: { kind: "node" as const, id },
      })),
      ...connections.map(([from, to], index) => ({
        type: "path" as const,
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ],
        semantic: { kind: "edge" as const, id: String(index), from, to },
      })),
    ],
  };
  const ranks = boardFlowRanks(scene);
  expect(ranks.get("merge")).toBe(4);
  expect(ranks.get("finish")).toBe(5);
  scene.primitives.push({
    type: "path",
    points: [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ],
    semantic: { kind: "edge", id: "feedback", from: "c", to: "b" },
  });
  const cyclic = boardFlowRanks(scene);
  expect(cyclic.get("b")).toBe(cyclic.get("c"));
  expect(cyclic.get("merge")).toBeGreaterThan(cyclic.get("d")!);
  expect(cyclic.get("finish")).toBeGreaterThan(cyclic.get("merge")!);
  expect([...cyclic.values()].every(Number.isFinite)).toBe(true);
});
