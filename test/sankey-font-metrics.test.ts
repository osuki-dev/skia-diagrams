import { expect, test } from "bun:test";
import CanvasKitInit from "canvaskit-wasm/bin/full/canvaskit.js";
import { JsiSkApi } from "react-native-skia/lib/module/skia/web/JsiSkia.js";
import catalog from "./fixtures/official-mermaid/catalog.json" with { type: "json" };
import { loadQaFonts } from "./font-provider.ts";
import { parseExtendedSankey } from "../src/parse/extended-sankey.ts";
import { layoutExtendedSankey } from "../src/layout/extended-sankey.ts";
import { createSkiaTextMeasurer, renderToPng } from "../src/render/skia.ts";
import { lightTheme } from "../src/render/theme.ts";

test("dense Sankey labels retain host Paragraph measurements at supported font sizes", async () => {
  const kit = await CanvasKitInit({
    locateFile: (file: string) =>
      `${import.meta.dir}/../node_modules/canvaskit-wasm/bin/full/${file}`,
  });
  const api = JsiSkApi(kit),
    fonts = await loadQaFonts(api);
  const source = catalog.types.find((type) => type.type === "sankey")!.cases[0].source;
  try {
    for (const fontSize of [14, 24]) {
      const theme = { ...lightTheme, fontSize, fontFamily: "QA,QACJK" };
      const measure = createSkiaTextMeasurer(api, theme, fonts.provider);
      const scene = layoutExtendedSankey(parseExtendedSankey(source)!, measure, { fontSize })!;
      expect(renderToPng(api, scene, theme, 1, fonts.provider).length).toBeGreaterThan(0);
      const labels = scene.primitives.filter((primitive) => primitive.type === "text");
      for (const label of labels) {
        const replay = measure(label.text, {
          literal: label.literal,
          fontSize: label.fontSize,
          maxWidth: label.width,
        });
        expect(replay.height).toBeLessThanOrEqual(label.height + 0.5);
        expect(label.x + label.width).toBeLessThanOrEqual(scene.bounds.width);
        expect(label.y + label.height).toBeLessThanOrEqual(scene.bounds.height);
      }
      const collisions: string[] = [];
      for (let i = 0; i < labels.length; i++)
        for (const b of labels.slice(i + 1)) {
          const a = labels[i];
          if (
            a.x < b.x + b.width &&
            b.x < a.x + a.width &&
            a.y < b.y + b.height &&
            b.y < a.y + a.height
          )
            collisions.push(`${a.text} / ${b.text}`);
        }
      expect(collisions).toEqual([]);
    }
  } finally {
    fonts.dispose();
  }
});
