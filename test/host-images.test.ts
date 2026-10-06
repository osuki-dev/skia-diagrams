import { expect, test } from "bun:test";
import CanvasKitInit from "canvaskit-wasm/bin/full/canvaskit.js";
import { JsiSkApi } from "react-native-skia/lib/module/skia/web/JsiSkia.js";
import { renderToPicture, renderToPng } from "../src/render/skia.ts";
import { renderToSvg } from "../src/render/svg.ts";
import { lightTheme } from "../src/render/theme.ts";
import type { Scene } from "../src/types.ts";

const scene: Scene = {
  kind: "flowchart",
  bounds: { x: 10, y: 20, width: 40, height: 30 },
  accessibilityLabel: "Host image",
  primitives: [{ type: "image", asset: "host-logo", x: 20, y: 25, width: 20, height: 10 }],
};

test("native Picture and PNG borrow host images without disposing or fetching them", async () => {
  const kit = await CanvasKitInit({
    locateFile: (file) => `${import.meta.dir}/../node_modules/canvaskit-wasm/bin/full/${file}`,
  });
  const api = JsiSkApi(kit),
    surface = api.Surface.MakeOffscreen(4, 2);
  if (!surface) throw new Error("Missing host image test surface");
  surface.getCanvas().clear(api.Color("#FF0000"));
  surface.flush();
  const image = surface.makeImageSnapshot();
  surface.dispose();
  let disposed = 0;
  const borrowed = new Proxy(image, {
    get(target, key) {
      if (key === "dispose")
        return () => {
          disposed++;
          target.dispose();
        };
      const value: unknown = Reflect.get(target, key);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  const assets = { images: new Map([["host-logo", borrowed]]) };
  try {
    const picture = renderToPicture(api, scene, lightTheme, undefined, assets);
    picture.dispose();
    const png = renderToPng(api, scene, lightTheme, 1, undefined, assets),
      output = kit.MakeImageFromEncoded(png);
    if (!output) throw new Error("Invalid host image export");
    try {
      const pixels = output.readPixels(0, 0, {
        width: 40,
        height: 30,
        colorType: kit.ColorType.RGBA_8888,
        alphaType: kit.AlphaType.Unpremul,
        colorSpace: kit.ColorSpace.SRGB,
      });
      if (!(pixels instanceof Uint8Array)) throw new Error("Missing image pixels");
      const offset = (8 * 40 + 15) * 4;
      expect(Array.from(pixels.slice(offset, offset + 4))).toEqual([255, 0, 0, 255]);
      expect(disposed).toBe(0);
      expect(image.width()).toBe(4);
    } finally {
      output.delete();
    }
    expect(() => renderToPicture(api, scene, lightTheme)).toThrow(
      "Missing host image asset: host-logo",
    );
    expect(() => renderToPng(api, scene, lightTheme)).toThrow(
      "Missing host image asset: host-logo",
    );
    expect(disposed).toBe(0);
  } finally {
    image.dispose();
  }
});

test("SVG images retain scene bounds and safely escape the host asset URL", () => {
  const svg = renderToSvg({
    ...scene,
    primitives: [
      {
        type: "image",
        asset: 'https://example.com/logo?a=1&b="2"',
        x: 20,
        y: 25,
        width: 20,
        height: 10,
        opacity: 0.5,
      },
    ],
  });
  expect(svg).toContain('viewBox="10 20 40 30"');
  expect(svg).toContain('href="https://example.com/logo?a=1&amp;b=&quot;2&quot;"');
  expect(svg).toContain(
    'x="20" y="25" width="20" height="10" preserveAspectRatio="none" opacity="0.5"',
  );
});
