import CanvasKitInit from "canvaskit-wasm/bin/full/canvaskit.js";
import { JsiSkApi } from "react-native-skia/lib/module/skia/web/JsiSkia.js";
import { layoutDiagram, parseDiagram, lightTheme, renderToSvg } from "../src/index.ts";
import { createSkiaTextMeasurer, renderToPng } from "../src/render/skia.ts";
import { pixelDifference } from "../test/pixels.ts";
import { loadQaFonts } from "../test/font-provider.ts";

// One frozen host-font fixture, not a claim of native parity across all types.
const input = process.argv[2];
if (!input) throw new Error("Pass a validated native QA PNG path");
const kit = await CanvasKitInit({
  locateFile: (file) => `${import.meta.dir}/../node_modules/canvaskit-wasm/bin/full/${file}`,
});
const api = JsiSkApi(kit),
  fonts = await loadQaFonts(api),
  provider = fonts.provider;
try {
  const parameters = process.argv[3]
    ? ((await Bun.file(process.argv[3]).json()) as {
        source: string;
        theme: typeof lightTheme;
        pixelRatio: number;
      })
    : {
        theme: { ...lightTheme, fontFamily: "QA,QACJK" },
        source: 'flowchart LR\nA["中文<br/>流程图"]-->B["开始 **成功**"]',
        pixelRatio: 2,
      };
  const { theme, source, pixelRatio } = parameters;
  const scene = layoutDiagram(parseDiagram(source), createSkiaTextMeasurer(api, theme, provider), {
    ...theme.layout,
    fontSize: theme.fontSize,
    radius: theme.radius,
  });
  const expected = renderToPng(api, scene, theme, pixelRatio, provider);
  await Bun.write(`${input}.canvaskit-scene.json`, JSON.stringify(scene));
  await Bun.write(`${input}.canvaskit.svg`, renderToSvg(scene, theme));
  await Bun.write(`${input}.canvaskit.png`, expected);
  const native = kit.MakeImageFromEncoded(new Uint8Array(await Bun.file(input).arrayBuffer()));
  const reference = kit.MakeImageFromEncoded(expected);
  if (!native || !reference) {
    native?.delete();
    reference?.delete();
    throw new Error("Invalid PNG");
  }
  try {
    if (native.width() !== reference.width() || native.height() !== reference.height()) {
      const result = {
        fixture: theme.fontFamily,
        native: { width: native.width(), height: native.height() },
        canvaskit: { width: reference.width(), height: reference.height() },
        passed: false,
        reason: "Dimension mismatch; no pixel ratio asserted",
      };
      await Bun.write(`${input}.comparison.json`, JSON.stringify(result, null, 2) + "\n");
      throw new Error(JSON.stringify(result));
    }
    const info = {
      width: native.width(),
      height: native.height(),
      colorType: kit.ColorType.RGBA_8888,
      alphaType: kit.AlphaType.Unpremul,
      colorSpace: kit.ColorSpace.SRGB,
    };
    const a = native.readPixels(0, 0, info),
      b = reference.readPixels(0, 0, info);
    if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array))
      throw new Error("RGBA decode failed");
    const changedPixelRatio = pixelDifference(a, b);
    const result = {
      fixture: theme.fontFamily,
      width: info.width,
      height: info.height,
      changedPixelRatio,
      threshold: 0.005,
      passed: changedPixelRatio <= 0.005,
    };
    await Bun.write(`${input}.comparison.json`, JSON.stringify(result, null, 2) + "\n");
    console.log(JSON.stringify(result));
    if (!result.passed) process.exitCode = 1;
  } finally {
    native.delete();
    reference.delete();
  }
} finally {
  fonts.dispose();
}
