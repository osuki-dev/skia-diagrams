import { expect, test } from "bun:test";
import { officialCatalog } from "../example/official-fixtures.ts";
import { parseOfficialAst } from "../src/parse/official-ast.ts";
import { layoutOfficial } from "../src/layout/official-ast.ts";
import { radarMotion } from "../src/react/motion-policies/radar.ts";
import { wardleyMotion } from "../src/react/motion-policies/wardley.ts";
import { cynefinMotion } from "../src/react/motion-policies/cynefin.ts";
import type { DiagramMotionPolicy } from "../src/react/motion-policy.ts";
const policies: Record<string, DiagramMotionPolicy> = {
  radar: radarMotion,
  wardley: wardleyMotion,
  cynefin: cynefinMotion,
};
for (const [type, ids] of Object.entries({
  radar: ["001", "002"],
  wardley: ["001", "019"],
  cynefin: ["001", "002"],
})) {
  for (const id of ids)
    for (const [width, fontSize] of [
      [320, 24],
      [430, 10],
      [375, 14],
    ])
      test(`${type}/${id} fits ${width}px at ${fontSize}px with semantic motion`, async () => {
        const fixture = officialCatalog.types
          .find((g) => g.type === type)!
          .cases.find((c) => c.id === `${type}/${id}`)!;
        const parsed = await parseOfficialAst(fixture.source);
        if (!parsed || parsed.kind === "error" || parsed.kind === "unsupported")
          throw new Error("Official fixture did not parse");
        const scene = layoutOfficial(parsed!, undefined, { viewportWidth: width, fontSize })!;
        expect(scene.bounds.width).toBeLessThanOrEqual(width + 0.1);
        for (const p of scene.primitives)
          if (p.type === "text") {
            expect(p.x).toBeGreaterThanOrEqual(0);
            expect(p.x + p.width).toBeLessThanOrEqual(width + 0.1);
            expect(p.fontSize).toBeGreaterThanOrEqual(fontSize * 0.7);
          }
        const plan = policies[type]!(scene);
        const ownership = [
          ...plan.staticPrimitives,
          ...plan.layers.flatMap((l) => l.primitives),
          ...plan.numbers.map((n) => n.primitive),
        ];
        expect(ownership.length).toBe(scene.primitives.length);
        expect(new Set(ownership).size).toBe(scene.primitives.length);
        expect(plan.layers.length).toBeLessThanOrEqual(12);
        if (type === "radar") {
          const series = plan.layers.filter((l) =>
            l.primitives.some((p) => p.semantic?.role === "series"),
          );
          const curveCount = (parsed!.ir.data as { curves: unknown[] }).curves.length;
          expect(series).toHaveLength(curveCount);
          expect(series.every((l) => l.mode === "scale" && l.center)).toBe(true);
          expect(
            plan.staticPrimitives.some((p) => p.type === "path" && p.stroke === "gridStroke"),
          ).toBe(true);
          const labels = scene.interactions!.filter((i) => i.id.startsWith("radar:curve:"));
          expect(labels).toHaveLength(curveCount);
          expect(labels.every((i) => i.x + i.width <= width)).toBe(true);
        } else if (type === "cynefin") {
          expect(
            plan.layers.filter((l) => l.primitives.some((p) => p.semantic?.part === "body")),
          ).toHaveLength(5);
          expect(
            plan.layers.filter((l) => l.primitives.some((p) => p.semantic?.part === "label")),
          ).toHaveLength(5);
        } else {
          expect(
            plan.staticPrimitives.some((p) => p.type === "path" && p.stroke === "gridStroke"),
          ).toBe(true);
          expect(
            plan.layers.some(
              (l) =>
                l.mode === "trace" && l.primitives.some((p) => p.semantic?.role === "dependency"),
            ),
          ).toBe(true);
        }
      });
}
