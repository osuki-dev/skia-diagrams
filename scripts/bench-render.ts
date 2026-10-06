import CanvasKitInit from "canvaskit-wasm/bin/full/canvaskit.js";
import { JsiSkApi } from "react-native-skia/lib/module/skia/web/JsiSkia.js";
import { readFileSync, writeFileSync } from "node:fs";
import { parseDiagram, layoutDiagram, lightTheme } from "../src/index.ts";
import { createSkiaTextMeasurer, renderToPicture } from "../src/render/skia.ts";
const kit = await CanvasKitInit({
  locateFile: (file) => `${import.meta.dir}/../node_modules/canvaskit-wasm/bin/full/${file}`,
});
const api = JsiSkApi(kit),
  provider = api.TypefaceFontProvider.Make();
const data = api.Data.fromBytes(
  new Uint8Array(readFileSync(`${import.meta.dir}/../example/assets/NotoSans-Regular.ttf`)),
);
const font = api.Typeface.MakeFreeTypeFaceFromData(data);
if (!font) throw new Error("Benchmark font unavailable");
provider.registerFont(font, "NotoSans");
const theme = { ...lightTheme, fontFamily: "NotoSans" };
const cases = [20, 100, 300].map((count) => ({
  name: `flowchart-${count}`,
  source: `flowchart TD\n${Array.from({ length: count - 1 }, (_, i) => `N${i}-->N${i + 1}`).join("\n")}`,
}));
cases.push({
  name: "sequence-50",
  source:
    "sequenceDiagram\n" + Array.from({ length: 50 }, (_, i) => `A->>B: message ${i}`).join("\n"),
});
const results: { name: string; pictureMs: number; serializedBytes: number | null }[] = [];
for (const item of cases) {
  const scene = layoutDiagram(
    parseDiagram(item.source),
    createSkiaTextMeasurer(api, theme, provider),
  );
  const times: number[] = [];
  let serializedBytes: number | null = null;
  // The first case also warms the shared WASM/JS renderer, unlike later cases.
  // Use twenty warmups consistently so its median does not measure startup JIT.
  for (let i = 0; i < 35; i++) {
    const start = performance.now(),
      picture = renderToPicture(api, scene, theme, provider),
      end = performance.now();
    if (i === 34) serializedBytes = picture.serialize()?.length ?? null;
    picture.dispose();
    if (i >= 20) times.push(end - start);
  }
  const result = { name: item.name, pictureMs: times.sort((a, b) => a - b)[7], serializedBytes };
  results.push(result);
  console.log(JSON.stringify(result));
}
provider.dispose();
font.dispose();
data.dispose();
const baselinePath = `${import.meta.dir}/../test/render-benchmark-baseline.json`;
if (process.argv.includes("--update"))
  writeFileSync(
    baselinePath,
    JSON.stringify(
      {
        environment:
          "CanvasKit 0.41.0; unscoped Skia 3.0.3 production renderer; frozen NotoSans; local Linux median after warmup; serialization is not native allocated memory",
        results,
      },
      null,
      2,
    ) + "\n",
  );
if (process.argv.includes("--check")) {
  const baseline = JSON.parse(readFileSync(baselinePath, "utf8")) as { results: typeof results };
  for (const result of results) {
    const previous = baseline.results.find((r) => r.name === result.name);
    if (!previous || result.pictureMs > previous.pictureMs * 1.3)
      throw new Error(`Picture recording regression >30%: ${result.name}`);
  }
  console.log(
    "CanvasKit Picture recording regression gate passed (+30%); native device acceptance remains separate",
  );
}
