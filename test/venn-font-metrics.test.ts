import { expect, test } from "bun:test";
import CanvasKitInit from "canvaskit-wasm/bin/full/canvaskit.js";
import { JsiSkApi } from "react-native-skia/lib/module/skia/web/JsiSkia.js";
import catalog from "./fixtures/official-mermaid/catalog.json" with { type: "json" };
import { loadQaFonts } from "./font-provider.ts";
import { parseExtendedSets } from "../src/parse/extended-sets.ts";
import { layoutExtendedSets } from "../src/layout/extended-sets.ts";
import { createSkiaTextMeasurer, renderToPng } from "../src/render/skia.ts";
import { lightTheme } from "../src/render/theme.ts";

test("Venn region labels stay separate with actual large host typography", async () => {
  const kit = await CanvasKitInit({
    locateFile: (file: string) =>
      `${import.meta.dir}/../node_modules/canvaskit-wasm/bin/full/${file}`,
  });
  const api = JsiSkApi(kit),
    fonts = await loadQaFonts(api);
  const source = catalog.types.find((type) => type.type === "venn")!.cases[0].source;
  try {
    for (const fontSize of [10, 14, 18, 24]) {
      const theme = { ...lightTheme, fontSize, fontFamily: "QA,QACJK" };
      const measure = createSkiaTextMeasurer(api, theme, fonts.provider);
      const scene = layoutExtendedSets(parseExtendedSets(source)!, measure, { fontSize })!;
      expect(renderToPng(api, scene, theme, 1, fonts.provider).length).toBeGreaterThan(0);
      const labels = scene.primitives.filter((primitive) => primitive.type === "text");
      for (let i = 0; i < labels.length; i++)
        for (let j = i + 1; j < labels.length; j++) {
          const a = labels[i],
            b = labels[j];
          expect(
            a.x < b.x + b.width &&
              b.x < a.x + a.width &&
              a.y < b.y + b.height &&
              b.y < a.y + a.height,
          ).toBe(false);
        }
    }
  } finally {
    fonts.dispose();
  }
});
