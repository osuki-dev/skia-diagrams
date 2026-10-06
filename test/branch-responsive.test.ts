import { expect, test } from "bun:test";
import { parseDiagram } from "../src/parse/index.ts";
import { layoutDiagram } from "../src/layout/index.ts";
import { gitgraphMotion } from "../src/react/motion-policies/gitgraph.ts";
import { mindmapMotion } from "../src/react/motion-policies/mindmap.ts";
const git =
  'gitGraph\ncommit id:"Initial product release" tag:"release-2026.10"\nbranch "feature/authentication"\ncommit id:"Add authenticated sessions"\ncommit id:"Check user permissions" tag:"release-candidate"\ncheckout main\nmerge "feature/authentication" id:"Merge reviewed authentication"\nbranch "empty/future-roadmap"';
const mind =
  "mindmap\n  root((Product roadmap))\n    Research and discovery\n      Interview existing customers\n      Validate the proposed solution\n    Release planning\n      Prepare the launch checklist\n      Confirm operational readiness";
for (const [width, fontSize] of [
  [320, 24],
  [375, 14],
] as const) {
  test(`Git and Mindmap preserve measured content at ${width}/${fontSize}`, () => {
    for (const source of [
      git,
      mind,
      mind.replace(
        "root((Product roadmap))",
        "root((Product roadmap))\n    ::icon(native:product)",
      ),
    ]) {
      const parsed = parseDiagram(source),
        scene = layoutDiagram(parsed, undefined, {
          viewportWidth: width,
          fontSize,
          resolveIcon: (_name, rect) => [
            { type: "shape", shape: "rect", ...rect, fill: "palette:1" },
          ],
        });
      expect(scene.bounds.width).toBeLessThanOrEqual(width);
      const texts = scene.primitives.filter((p) => p.type === "text");
      for (const text of texts) {
        expect(text.x).toBeGreaterThanOrEqual(scene.bounds.x);
        expect(text.x + text.width).toBeLessThanOrEqual(scene.bounds.x + width);
      }
      const overlaps: string[] = [];
      for (let i = 0; i < texts.length; i++)
        for (const b of texts.slice(i + 1)) {
          const a = texts[i];
          if (
            a.x < b.x + b.width - 1e-6 &&
            b.x < a.x + a.width - 1e-6 &&
            a.y < b.y + b.height - 1e-6 &&
            b.y < a.y + a.height - 1e-6
          )
            overlaps.push(`${a.text} / ${b.text}`);
        }
      expect(overlaps).toEqual([]);
      if (parsed.kind !== "error" && parsed.kind !== "unsupported")
        for (const node of parsed.ir.nodes) {
          const label = texts.find(
            (text) =>
              text.semantic?.id === node.id &&
              text.semantic.part === "label" &&
              (scene.kind !== "gitgraph" || text.semantic.role === "commit"),
          );
          expect(label?.text.replace(/\s/g, "")).toBe(node.label.replace(/\s/g, ""));
        }
      const plan = (scene.kind === "gitgraph" ? gitgraphMotion : mindmapMotion)(scene);
      const owned = [
        ...plan.staticPrimitives,
        ...plan.numbers.map((number) => number.primitive),
        ...plan.layers.flatMap((layer) => layer.primitives),
      ];
      expect(new Set(owned).size).toBe(scene.primitives.length);
      expect(owned).toHaveLength(scene.primitives.length);
      expect(plan.layers.some((layer) => layer.mode === "trace")).toBe(true);
      if (scene.kind === "gitgraph")
        for (const p of scene.primitives) {
          if (p.semantic?.kind !== "node" || p.type !== "text") continue;
          const body = scene.primitives.find(
            (q) =>
              q.semantic?.id === p.semantic!.id &&
              q.type === "shape" &&
              q.semantic.part === "body" &&
              q.semantic.role === "commit",
          );
          expect(plan.layers.find((layer) => layer.primitives.includes(p))?.delay).toBe(
            plan.layers.find((layer) => body && layer.primitives.includes(body))?.delay,
          );
        }
    }
  });
}
