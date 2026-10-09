import { expect, test } from "bun:test";
import CanvasKitInit from "canvaskit-wasm/bin/full/canvaskit.js";
import { JsiSkApi } from "react-native-skia/lib/module/skia/web/JsiSkia.js";
import catalog from "./fixtures/official-mermaid/catalog.json" with { type: "json" };
import { loadQaFonts } from "./font-provider.ts";
import { parseDiagramAsync } from "../src/parse/index.ts";
import { layoutDiagram } from "../src/layout/index.ts";
import { createSkiaTextMeasurer } from "../src/render/skia.ts";
import { lightTheme } from "../src/render/theme.ts";
import { sankeyMotion } from "../src/react/motion-policies/sankey.ts";
import { ishikawaMotion } from "../src/react/motion-policies/ishikawa.ts";
import { kanbanMotion } from "../src/react/motion-policies/kanban.ts";
import { treeviewMotion } from "../src/react/motion-policies/treeview.ts";

test("native narrow layouts retain readable full labels without horizontal overflow", async () => {
  const kit = await CanvasKitInit({
    locateFile: (f: string) => `${import.meta.dir}/../node_modules/canvaskit-wasm/bin/full/${f}`,
  });
  const api = JsiSkApi(kit),
    fonts = await loadQaFonts(api);
  try {
    for (const kind of ["sankey", "ishikawa", "kanban", "treeview"] as const) {
      const examples = catalog.types.find(
        (t) => t.type === (kind === "treeview" ? "treeView" : kind),
      )!.cases;
      // Dense flow, populated board, recursive causes and nested/icon trees are
      // distinct failures; official syntax coverage already runs every fixture.
      const cases = {
        sankey: ["sankey/001"],
        ishikawa: ["ishikawa/001"],
        kanban: ["kanban/003"],
        treeview: ["treeView/007", "treeView/013"],
      }[kind];
      for (const example of examples.filter((example) => cases.includes(example.id))) {
        const parsed = await parseDiagramAsync(example.source);
        expect(parsed.kind).toBe(kind);
        for (const [viewportWidth, fontSize] of [
          [320, 24],
          [375, 14],
        ] as const) {
          const theme = { ...lightTheme, fontSize, fontFamily: "QA,QACJK" },
            measure = createSkiaTextMeasurer(api, theme, fonts.provider);
          const scene = layoutDiagram(parsed, measure, {
            viewportWidth,
            fontSize,
          });
          const policy = {
            sankey: sankeyMotion,
            ishikawa: ishikawaMotion,
            kanban: kanbanMotion,
            treeview: treeviewMotion,
          }[kind];
          const motion = policy(scene);
          expect(motion.layers.length).toBeLessThanOrEqual(12);
          const owned = [
            ...motion.staticPrimitives,
            ...motion.numbers.map((n) => n.primitive),
            ...motion.layers.flatMap((l) => l.primitives),
          ];
          expect(owned.length).toBe(scene.primitives.length);
          expect(new Set(owned).size).toBe(scene.primitives.length);
          if (kind !== "treeview")
            expect(scene.bounds.width).toBeLessThanOrEqual(viewportWidth + 1);
          else {
            expect(Number.isFinite(scene.bounds.width)).toBe(true);
            expect(scene.bounds.width).toBeGreaterThan(0);
            const rows = scene.interactions!.filter((row) => row.id.startsWith("treeview:"));
            for (const row of rows) {
              expect(row.x).toBeGreaterThanOrEqual(0);
              expect(row.x + row.width).toBeLessThanOrEqual(scene.bounds.width);
            }
          }
          const labels = scene.primitives.filter((p) => p.type === "text");
          for (const p of labels) {
            const replay = measure(p.text, {
              literal: p.literal,
              fontSize: p.fontSize,
              fontWeight: p.fontWeight,
              maxWidth: p.width,
            });
            expect(
              replay.height,
              `${kind}/${example.id} ${viewportWidth} ${fontSize} ${p.text} width=${p.width}`,
            ).toBeLessThanOrEqual(p.height + 1);
            expect(p.x).toBeGreaterThanOrEqual(scene.bounds.x - 1);
            expect(p.x + p.width).toBeLessThanOrEqual(scene.bounds.x + scene.bounds.width + 1);
          }
          const overlaps: string[] = [];
          for (let i = 0; i < labels.length; i++)
            for (const b of labels.slice(i + 1)) {
              const a = labels[i];
              if (
                a.x < b.x + b.width - 0.5 &&
                b.x < a.x + a.width - 0.5 &&
                a.y < b.y + b.height - 0.5 &&
                b.y < a.y + a.height - 0.5
              )
                overlaps.push(`${a.text} / ${b.text}`);
            }
          expect(overlaps, `${kind}/${example.id}: overlapping labels`).toEqual([]);
          if (kind === "sankey" && "ir" in parsed) {
            const legend = scene.interactions!.filter((i) => i.id.startsWith("sankey-legend-"));
            expect(legend.length).toBe(parsed.ir.nodes.length);
            expect(legend.map((i) => i.label)).toEqual(parsed.ir.nodes.map((n) => n.id));
          }
        }
      }
    }
  } finally {
    fonts.dispose();
  }
});
