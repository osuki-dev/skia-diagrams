import { expect, test } from "bun:test";
import CanvasKitInit from "canvaskit-wasm/bin/full/canvaskit.js";
import { JsiSkApi } from "react-native-skia/lib/module/skia/web/JsiSkia.js";
import { renderToPicture, renderToPng } from "../src/render/skia.ts";
import { lightTheme } from "../src/index.ts";
import type { Scene } from "../src/types.ts";

test("PNG extreme-aspect and invalid dimensions are rejected before allocating a native surface", async () => {
  const kit = await CanvasKitInit({
    locateFile: (f) => `${import.meta.dir}/../node_modules/canvaskit-wasm/bin/full/${f}`,
  });
  const real = JsiSkApi(kit);
  let allocations = 0;
  const api = {
    ...real,
    Surface: {
      ...real.Surface,
      MakeOffscreen: () => {
        allocations++;
        throw new Error("attempted native surface allocation");
      },
    },
  };
  const scene: Scene = {
    kind: "flowchart",
    bounds: { x: 0, y: 0, width: 8193, height: 10 },
    primitives: [],
    accessibilityLabel: "extreme export",
  };
  for (const bounds of [
    { width: 8193, height: 10 },
    { width: 10, height: 8193 },
    { width: 4096.1, height: 10 },
  ]) {
    expect(() =>
      renderToPng(
        api,
        { ...scene, bounds: { x: 0, y: 0, ...bounds } },
        lightTheme,
        bounds.width === 4096.1 ? 2 : 1,
      ),
    ).toThrow("PNG export exceeds 8192 pixels per dimension");
  }
  for (const width of [0, -1, NaN, Infinity])
    expect(() =>
      renderToPng(api, { ...scene, bounds: { ...scene.bounds, width } }, lightTheme, 1),
    ).toThrow(RangeError);
  expect(() =>
    renderToPng(
      api,
      { ...scene, bounds: { ...scene.bounds, width: 5000, height: 5000 } },
      lightTheme,
      1,
    ),
  ).toThrow("PNG export exceeds 16 megapixels");
  expect(allocations).toBe(0);
  expect(() =>
    renderToPng(api, { ...scene, bounds: { ...scene.bounds, width: 8192 } }, lightTheme, 1),
  ).toThrow("attempted native surface allocation");
  expect(allocations).toBe(1);
});

test("transformed Pictures do not clear outside their recorded diagram bounds", async () => {
  const kit = await CanvasKitInit({
      locateFile: (f) => `${import.meta.dir}/../node_modules/canvaskit-wasm/bin/full/${f}`,
    }),
    api = JsiSkApi(kit);
  const scene: Scene = {
    kind: "flowchart",
    bounds: { x: 0, y: 0, width: 100, height: 100 },
    primitives: [],
    accessibilityLabel: "bounded background",
  };
  const picture = renderToPicture(api, scene, { ...lightTheme, background: "#ffffff" }),
    surface = api.Surface.MakeOffscreen(200, 200);
  if (!surface) {
    picture.dispose();
    throw new Error("Missing surface");
  }
  try {
    const canvas = surface.getCanvas();
    canvas.clear(api.Color("#ff00ff"));
    canvas.translate(50, 50);
    canvas.scale(0.5, 0.5);
    canvas.drawPicture(picture);
    surface.flush();
    const image = surface.makeImageSnapshot();
    try {
      const bytes = image.encodeToBytes(),
        decoded = kit.MakeImageFromEncoded(bytes);
      if (!decoded) throw new Error("Invalid PNG");
      try {
        const pixels = decoded.readPixels(0, 0, {
          width: 200,
          height: 200,
          colorType: kit.ColorType.RGBA_8888,
          alphaType: kit.AlphaType.Unpremul,
          colorSpace: kit.ColorSpace.SRGB,
        });
        if (!(pixels instanceof Uint8Array)) throw new Error("Missing RGBA");
        const at = (x: number, y: number) =>
          Array.from(pixels.slice((y * 200 + x) * 4, (y * 200 + x) * 4 + 4));
        expect(at(10, 10)).toEqual([255, 0, 255, 255]);
        expect(at(150, 150)).toEqual([255, 0, 255, 255]);
        expect(at(75, 75)).toEqual([255, 255, 255, 255]);
      } finally {
        decoded.delete();
      }
    } finally {
      image.dispose();
    }
  } finally {
    surface.dispose();
    picture.dispose();
  }
});

test("PNG export applies a translucent host background exactly once", async () => {
  const kit = await CanvasKitInit({
      locateFile: (f) => `${import.meta.dir}/../node_modules/canvaskit-wasm/bin/full/${f}`,
    }),
    api = JsiSkApi(kit);
  const scene: Scene = {
    kind: "flowchart",
    bounds: { x: 0, y: 0, width: 10, height: 10 },
    primitives: [],
    accessibilityLabel: "translucent background",
  };
  const png = renderToPng(api, scene, { ...lightTheme, background: "rgba(255, 0, 0, 0.5)" });
  const image = kit.MakeImageFromEncoded(png);
  if (!image) throw new Error("Invalid PNG");
  try {
    const pixels = image.readPixels(0, 0, {
      width: 10,
      height: 10,
      colorType: kit.ColorType.RGBA_8888,
      alphaType: kit.AlphaType.Unpremul,
      colorSpace: kit.ColorSpace.SRGB,
    });
    if (!(pixels instanceof Uint8Array)) throw new Error("Missing RGBA");
    expect(Array.from(pixels.slice(220, 224))).toEqual([255, 0, 0, 128]);
  } finally {
    image.delete();
  }
});
