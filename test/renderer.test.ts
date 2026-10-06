import { expect, test } from "bun:test";
import CanvasKitInit from "canvaskit-wasm/bin/full/canvaskit.js";
import { JsiSkApi } from "react-native-skia/lib/module/skia/web/JsiSkia.js";
import {
  drawScene,
  renderToPng,
  renderToPicture,
  createSkiaTextMeasurer,
} from "../src/render/skia.ts";
import { layoutDiagram, parseDiagram, lightTheme, darkTheme } from "../src/index.ts";
import { fixtures } from "../example/fixtures.ts";
import { pixelDifference } from "./pixels.ts";
import { officialExamples } from "./official.ts";
import { advancedFixtures } from "./advanced-fixtures.ts";
import { detailedFixtures } from "../example/fixture-cases.ts";
import { flowchartDetailFixtures } from "./flowchart-fixtures.ts";

test("recording shares repeated dash/color factories and releases effects after success and failure", async () => {
  const kit = await CanvasKitInit({
    locateFile: (file) => `${import.meta.dir}/../node_modules/canvaskit-wasm/bin/full/${file}`,
  });
  const base = JsiSkApi(kit);
  let colors = 0,
    dashes = 0,
    disposed = 0;
  const api = {
    ...base,
    Color: (...args: Parameters<typeof base.Color>) => {
      colors++;
      if (args[0] === "fail-color") throw new Error("Injected color failure");
      return base.Color(...args);
    },
    PathEffect: {
      ...base.PathEffect,
      MakeDash: (...args: Parameters<typeof base.PathEffect.MakeDash>) => {
        dashes++;
        const effect = base.PathEffect.MakeDash(...args);
        if (!effect) return effect;
        return new Proxy(effect, {
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
      },
    },
  };
  const scene = layoutDiagram(parseDiagram("flowchart LR\nA-->B"));
  scene.primitives = [0, 1, 2].map((i) => ({
    type: "path",
    points: [
      { x: 10, y: 10 + i * 10 },
      { x: 50, y: 10 + i * 10 },
    ],
    stroke: "#3E63FF",
    dash: [4, 5],
  }));
  renderToPicture(api, scene, lightTheme).dispose();
  expect(colors).toBe(2);
  expect(dashes).toBe(1);
  expect(disposed).toBe(1);
  scene.primitives.push({
    type: "path",
    points: [
      { x: 10, y: 50 },
      { x: 50, y: 50 },
    ],
    stroke: "fail-color",
  });
  expect(() => renderToPicture(api, scene, lightTheme)).toThrow("Injected color failure");
  expect(dashes).toBe(2);
  expect(disposed).toBe(2);
});

test("invalid dash and hidden primitive geometry fail before native drawing allocation", async () => {
  const kit = await CanvasKitInit({
    locateFile: (file) => `${import.meta.dir}/../node_modules/canvaskit-wasm/bin/full/${file}`,
  });
  const base = JsiSkApi(kit);
  let allocations = 0;
  const unexpectedAllocation = () => {
    allocations++;
    throw new Error("Native allocation occurred before validation");
  };
  const api = {
    ...base,
    Paint: unexpectedAllocation,
    PictureRecorder: unexpectedAllocation,
    Surface: { ...base.Surface, MakeOffscreen: unexpectedAllocation },
  };
  const surface = base.Surface.MakeOffscreen(1, 1)!;
  try {
    const scenes = ["0 0", `${"9".repeat(400)} 1`, `${"9".repeat(100)} 1`].map((dash) =>
      layoutDiagram(parseDiagram(`flowchart LR\nA --> B\nlinkStyle 0 stroke-dasharray:${dash}`)),
    );
    const geometry = layoutDiagram(parseDiagram("flowchart LR\nA --> B"));
    geometry.primitives = [
      {
        type: "path",
        points: [{ x: 0, y: 0 }],
        curves: [{ control1: { x: NaN, y: 1 }, control2: { x: 2, y: 2 }, end: { x: 3, y: 3 } }],
      },
    ];
    scenes.push(geometry);
    for (const scene of scenes) {
      expect(Object.values(scene.bounds).every(Number.isFinite)).toBe(true);
      expect(() => renderToPicture(api, scene, lightTheme)).toThrow(RangeError);
      expect(() => renderToPng(api, scene, lightTheme, 1)).toThrow(RangeError);
      expect(() => drawScene(api, surface.getCanvas(), scene, lightTheme)).toThrow(RangeError);
    }
    expect(allocations).toBe(0);
  } finally {
    surface.dispose();
  }
});

test("production renderer records paths and exports valid PNGs for all type geometries", async () => {
  const kit = await CanvasKitInit({
    locateFile: (file: string) =>
      `${import.meta.dir}/../node_modules/canvaskit-wasm/bin/full/${file}`,
  });
  const api = JsiSkApi(kit);
  for (const source of Object.values(fixtures).slice(0, 13)) {
    const scene = layoutDiagram(parseDiagram(source));
    // Geometry goldens intentionally exclude text: native/system font goldens remain a separate gate.
    scene.primitives = scene.primitives.filter((p) => p.type !== "text");
    const picture = renderToPicture(api, scene, lightTheme);
    picture.dispose();
    const png = renderToPng(api, scene, lightTheme, 1);
    expect(Array.from(png.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  }
});
test("production Paragraph renderer passes 0.5% pixel goldens for all types, official subsets and CJK", async () => {
  const kit = await CanvasKitInit({
    locateFile: (file: string) =>
      `${import.meta.dir}/../node_modules/canvaskit-wasm/bin/full/${file}`,
  });
  const base = JsiSkApi(kit);
  const provider = base.TypefaceFontProvider.Make();
  const data = base.Data.fromBytes(
    new Uint8Array(
      await Bun.file(`${import.meta.dir}/../example/assets/NotoSans-Regular.ttf`).arrayBuffer(),
    ),
  );
  const font = base.Typeface.MakeFreeTypeFaceFromData(data);
  if (!font) throw new Error("Could not load frozen golden font");
  provider.registerFont(font, "NotoSans");
  const cjkData = base.Data.fromBytes(
    new Uint8Array(
      await Bun.file(`${import.meta.dir}/../example/assets/NotoSansCJKsc-Subset.otf`).arrayBuffer(),
    ),
  );
  const cjkFont = base.Typeface.MakeFreeTypeFaceFromData(cjkData);
  if (!cjkFont) throw new Error("Could not load frozen CJK subset");
  expect(cjkFont.getGlyphIDs("中文").every((glyph) => glyph !== 0)).toBe(true);
  provider.registerFont(cjkFont, "NotoCJK");
  const api = base;
  const theme = {
    ...lightTheme,
    fontFamily: "NotoSans,NotoCJK",
    background: "#ffffff",
  };
  const cases = [
    ...Object.entries(fixtures).slice(0, 13),
    ...officialExamples().map(({ name, source }) => [name, source] as const),
    ...Object.entries(advancedFixtures),
    ...Object.entries(detailedFixtures).map(
      ([name, source]) => [`detailed-${name}`, source] as const,
    ),
    ...Object.entries(flowchartDetailFixtures).flatMap(([name, source]) => [
      [`detail-light-${name}`, source] as const,
      [`detail-dark-${name}`, source] as const,
    ]),
    ["cjk-wrapping", 'flowchart LR\nA["中文<br/>流程图"]-->B["开始 **成功**"]'] as const,
  ];
  for (const [name, source] of cases) {
    const caseTheme = name.startsWith("detail-dark-")
      ? { ...darkTheme, fontFamily: theme.fontFamily, background: "#0f172a" }
      : theme;
    const measure = createSkiaTextMeasurer(api, caseTheme, provider);
    expect(measure("", { fontSize: theme.fontSize }).width).toBe(0);
    const scene = layoutDiagram(parseDiagram(source), measure);
    const picture = renderToPicture(api, scene, caseTheme, provider);
    picture.dispose();
    const png = renderToPng(api, scene, caseTheme, 1, provider);
    if (process.env.RENDER_ARTIFACTS)
      await Bun.write(`${process.env.RENDER_ARTIFACTS}/${name}.png`, png);
    const goldenPath = `${import.meta.dir}/golden/${name}.png`;
    if (process.env.UPDATE_GOLDENS === "1") await Bun.write(goldenPath, png);
    const expectedBytes = new Uint8Array(await Bun.file(goldenPath).arrayBuffer());
    const actualImage = kit.MakeImageFromEncoded(png),
      expectedImage = kit.MakeImageFromEncoded(expectedBytes);
    if (!actualImage || !expectedImage) throw new Error(`Could not decode golden ${name}`);
    try {
      expect(actualImage.width()).toBe(expectedImage.width());
      expect(actualImage.height()).toBe(expectedImage.height());
      const info = {
        width: actualImage.width(),
        height: actualImage.height(),
        colorType: kit.ColorType.RGBA_8888,
        alphaType: kit.AlphaType.Unpremul,
        colorSpace: kit.ColorSpace.SRGB,
      };
      const actualPixels = actualImage.readPixels(0, 0, info),
        expectedPixels = expectedImage.readPixels(0, 0, info);
      if (!(actualPixels instanceof Uint8Array) || !(expectedPixels instanceof Uint8Array))
        throw new Error("Expected RGBA pixels");
      expect(pixelDifference(actualPixels, expectedPixels), name).toBeLessThanOrEqual(0.005);
    } finally {
      actualImage.delete();
      expectedImage.delete();
    }
  }
  provider.dispose();
  font.dispose();
  data.dispose();
  cjkFont.dispose();
  cjkData.dispose();
});
test("pixel threshold accepts 0.5% and rejects larger image changes", () => {
  const baseline = new Uint8Array(4000),
    actual = new Uint8Array(baseline);
  actual.fill(255, 0, 20);
  expect(pixelDifference(actual, baseline)).toBe(0.005);
  actual[20] = 255;
  expect(pixelDifference(actual, baseline)).toBeGreaterThan(0.005);
});
test("recording and offscreen export release their owned resources on renderer failure", async () => {
  const kit = await CanvasKitInit({
    locateFile: (file) => `${import.meta.dir}/../node_modules/canvaskit-wasm/bin/full/${file}`,
  });
  const base = JsiSkApi(kit);
  const disposed: string[] = [];
  function watch<T extends { dispose(): void }>(resource: T, label: string): T {
    return new Proxy(resource, {
      get(target, key) {
        if (key === "dispose")
          return () => {
            disposed.push(label);
            target.dispose();
          };
        const value: unknown = Reflect.get(target, key);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  }
  const api = {
    ...base,
    Color: (color: Parameters<typeof base.Color>[0]) => {
      if (color === "throw-test") throw new Error("Injected color failure");
      return base.Color(color);
    },
    Paint: () => watch(base.Paint(), "paint"),
    PictureRecorder: () => watch(base.PictureRecorder(), "recorder"),
    Surface: {
      ...base.Surface,
      MakeOffscreen: (width: number, height: number) => {
        const surface = base.Surface.MakeOffscreen(width, height);
        return surface ? watch(surface, "surface") : null;
      },
    },
  };
  const scene = layoutDiagram(parseDiagram("flowchart TD\nA-->B"));
  expect(() => renderToPicture(api, scene, { ...lightTheme, background: "throw-test" })).toThrow(
    "Injected color failure",
  );
  expect(disposed).toEqual(["paint", "recorder"]);
  disposed.length = 0;
  expect(() => renderToPng(api, scene, { ...lightTheme, background: "throw-test" }, 1)).toThrow(
    "Injected color failure",
  );
  // The export's surface clear fails before drawScene allocates a Paint.
  expect(disposed).toEqual(["surface"]);
  expect(() => renderToPng(api, scene, lightTheme, 0)).toThrow("pixel ratio");
});
test("native 3.0.3-shaped ParagraphBuilder without dispose still measures and records", async () => {
  const kit = await CanvasKitInit({
    locateFile: (file) => `${import.meta.dir}/../node_modules/canvaskit-wasm/bin/full/${file}`,
  });
  const base = JsiSkApi(kit),
    builders: ReturnType<typeof base.ParagraphBuilder.Make>[] = [];
  const provider = base.TypefaceFontProvider.Make();
  const data = base.Data.fromBytes(
    new Uint8Array(
      await Bun.file(`${import.meta.dir}/../example/assets/NotoSans-Regular.ttf`).arrayBuffer(),
    ),
  );
  const font = base.Typeface.MakeFreeTypeFaceFromData(data);
  if (!font) throw new Error("Missing test font");
  provider.registerFont(font, "NotoSans");
  const theme = { ...lightTheme, fontFamily: "NotoSans" };
  const api = {
    ...base,
    ParagraphBuilder: {
      Make: (...args: Parameters<typeof base.ParagraphBuilder.Make>) => {
        const builder = base.ParagraphBuilder.Make(...args);
        builders.push(builder);
        return new Proxy(builder, {
          get(target, key) {
            if (key === "dispose") return undefined;
            const value: unknown = Reflect.get(target, key);
            return typeof value === "function" ? value.bind(target) : value;
          },
        });
      },
    },
  };
  try {
    const measure = createSkiaTextMeasurer(api, theme, provider);
    expect(measure("native builder", { fontSize: 14 }).height).toBeGreaterThan(0);
    const output = layoutDiagram(parseDiagram("flowchart LR\nA-->B"), measure);
    const picture = renderToPicture(api, output, theme, provider);
    picture.dispose();
  } finally {
    for (const builder of builders) builder.dispose();
    provider.dispose();
    font.dispose();
    data.dispose();
  }
});
