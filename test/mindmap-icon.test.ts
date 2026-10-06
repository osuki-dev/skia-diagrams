import { expect, test } from "bun:test";
import CanvasKitInit from "canvaskit-wasm/bin/full/canvaskit.js";
import { JsiSkApi } from "react-native-skia/lib/module/skia/web/JsiSkia.js";
import { officialCatalog } from "../example/official-fixtures.ts";
import { exampleIconUris } from "../example/assets/official/icon-definitions.ts";
import { layoutDiagram, parseDiagram, lightTheme } from "../src/index.ts";
import { createSkiaTextMeasurer, renderToPng } from "../src/render/skia.ts";
import { loadQaFonts } from "./font-provider.ts";
import { resolveExampleIcon } from "../example/icon-resolver.ts";

const source = officialCatalog.types.find((type) => type.type === "mindmap")!.cases[0].source;
const resolver = resolveExampleIcon;

test("official Mindmap001 resolves its book annotation into reserved node space and rejects missing hosts", () => {
  const parsed = parseDiagram(source);
  expect(() => layoutDiagram(parsed)).toThrow("Native icon resolver is required for fa fa-book");
  expect(() => layoutDiagram(parsed, undefined, { resolveIcon: () => undefined })).toThrow(
    "Native icon is not registered: fa fa-book",
  );
  const scene = layoutDiagram(parsed, undefined, { resolveIcon: resolver });
  const image = scene.primitives.find((p) => p.type === "image");
  if (image?.type !== "image") throw new Error("Missing resolved book image");
  expect(image.width).toBeGreaterThanOrEqual(24);
  expect(
    scene.primitives.some(
      (p) =>
        p.type === "shape" &&
        p.x <= image.x &&
        p.y <= image.y &&
        p.x + p.width >= image.x + image.width &&
        p.y + p.height >= image.y + image.height,
    ),
  ).toBe(true);
  const label = scene.primitives.find((p) => p.type === "text" && p.text === "Long history");
  if (label?.type !== "text") throw new Error("Missing icon label");
  expect(label.y).toBeGreaterThan(image.y + image.height);
});

test("actual upstream FontAwesome book artwork renders through example host assets without a font", async () => {
  const kit = await CanvasKitInit({
    locateFile: (file) => `${import.meta.dir}/../node_modules/canvaskit-wasm/bin/full/${file}`,
  });
  const api = JsiSkApi(kit),
    fonts = await loadQaFonts(api),
    data = api.Data.fromBytes(
      new Uint8Array(
        await Bun.file(
          `${import.meta.dir}/../example/assets/official/fa_fa-book.png`,
        ).arrayBuffer(),
      ),
    ),
    image = api.Image.MakeImageFromEncoded(data);
  if (!image) throw new Error("Missing upstream book PNG");
  try {
    const theme = { ...lightTheme, fontFamily: "QA" },
      measure = createSkiaTextMeasurer(api, theme, fonts.provider);
    const scene = layoutDiagram(parseDiagram(source), measure, { resolveIcon: resolver });
    const png = renderToPng(api, scene, theme, 1, fonts.provider, {
      images: new Map([[exampleIconUris["fa_fa-book"], image]]),
    });
    expect(png.length).toBeGreaterThan(1000);
    if (process.env.DIAGRAM_CAPTURE_CONFIG === "1")
      await Bun.write("design/theme-studio/implemented/mindmap-official-001-icon.png", png);
  } finally {
    image.dispose();
    data.dispose();
    fonts.dispose();
  }
});
