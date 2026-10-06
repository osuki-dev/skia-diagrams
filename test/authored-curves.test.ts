import { expect, test } from "bun:test";
import CanvasKitInit from "canvaskit-wasm/bin/full/canvaskit.js";
import { JsiSkApi } from "react-native-skia/lib/module/skia/web/JsiSkia.js";
import { cubicMarkerShaft } from "../src/render/geometry.ts";
import { drawScene } from "../src/render/skia.ts";
import { renderToSvg } from "../src/render/svg.ts";
import { lightTheme } from "../src/render/theme.ts";
import type { Scene } from "../src/types.ts";

test("authored cubic controls are unchanged without markers and hollow terminals trim true cubics", () => {
  const start = { x: 0, y: 0 },
    curves = [
      { control1: { x: 10, y: 0 }, control2: { x: 20, y: 30 }, end: { x: 30, y: 30 } },
      { control1: { x: 40, y: 30 }, control2: { x: 50, y: 0 }, end: { x: 60, y: 0 } },
    ];
  expect(cubicMarkerShaft(start, curves)).toEqual({ start, curves });
  const trimmed = cubicMarkerShaft(start, curves, "hollow-triangle", "hollow-diamond", 10);
  expect(trimmed.start.x).toBeGreaterThan(0);
  expect(trimmed.curves.at(-1)!.end.x).toBeLessThan(60);
  expect(curves[0].control1).toEqual({ x: 10, y: 0 });
  const straight = cubicMarkerShaft(
    { x: 0, y: 0 },
    [{ control1: { x: 100 / 3, y: 0 }, control2: { x: 200 / 3, y: 0 }, end: { x: 100, y: 0 } }],
    "hollow-triangle",
    "hollow-diamond",
    10,
  );
  expect(straight.start.x).toBeCloseTo(10, 5);
  expect(straight.curves[0].end.x).toBeCloseTo(86, 5);
});

test("native Skia and SVG retain authored cubic path and use curve tangent for arrow", async () => {
  const kit = await CanvasKitInit({
    locateFile: (file) => `${import.meta.dir}/../node_modules/canvaskit-wasm/bin/full/${file}`,
  });
  const api = JsiSkApi(kit),
    surface = api.Surface.MakeOffscreen(120, 100);
  if (!surface) throw new Error("Missing curve test surface");
  const canvas = surface.getCanvas(),
    paths: string[] = [];
  const spy = new Proxy(canvas, {
    get(target, key) {
      if (key === "drawPath")
        return (...args: Parameters<typeof canvas.drawPath>) => {
          paths.push(args[0].toSVGString());
          target.drawPath(...args);
        };
      const value: unknown = Reflect.get(target, key);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  const scene: Scene = {
    kind: "mindmap",
    bounds: { x: 0, y: 0, width: 120, height: 100 },
    accessibilityLabel: "Authored curve",
    primitives: [
      {
        type: "path",
        points: [
          { x: 10, y: 20 },
          { x: 90, y: 80 },
        ],
        curves: [{ control1: { x: 20, y: 20 }, control2: { x: 90, y: 20 }, end: { x: 90, y: 80 } }],
        end: "arrow",
      },
    ],
  };
  try {
    drawScene(api, spy, scene, lightTheme);
  } finally {
    surface.dispose();
  }
  expect(paths[0]).toMatch(/C20[ ,]20[ ,]90[ ,]20[ ,]90[ ,]80/);
  const svg = renderToSvg(scene, { ...lightTheme, arrowSize: 10 });
  expect(svg).toContain('d="M10 20 C20 20 90 20 90 80"');
  // Vertical end tangent puts the arrow's wings above its terminal.
  expect(svg).toContain('points="95,70 90,80 85,70"');
});
