import { expect, test } from "bun:test";
import CanvasKitInit from "canvaskit-wasm/bin/full/canvaskit.js";
import { JsiSkApi } from "react-native-skia/lib/module/skia/web/JsiSkia.js";
import { drawScene } from "../src/render/skia.ts";
import {
  cylinderGeometry,
  intersectShape,
  markerGeometry,
  shapePoints,
} from "../src/render/geometry.ts";
import { layoutDiagram, parseDiagram, renderToSvg, lightTheme } from "../src/index.ts";
import type { Scene, Shape } from "../src/types.ts";

test("sloped silhouettes intersect the ray on an actual polygon edge, not its bounding box", () => {
  const rect = { x: 10, y: 20, width: 100, height: 80 };
  for (const shape of [
    "trapezoid",
    "reverse-trapezoid",
    "parallelogram",
    "reverse-parallelogram",
  ] as Shape[]) {
    for (const toward of [
      { x: 200, y: 60 },
      { x: -100, y: 60 },
      { x: 180, y: -70 },
      { x: -60, y: 170 },
    ]) {
      const p = intersectShape(shape, rect, toward),
        points = shapePoints(shape, rect);
      const cx = 60,
        cy = 60;
      expect((p.x - cx) * (toward.y - cy) - (p.y - cy) * (toward.x - cx)).toBeCloseTo(0, 8);
      expect(
        points.some((a, i) => {
          const b = points[(i + 1) % points.length];
          return (
            Math.abs((p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x)) < 1e-7 &&
            p.x >= Math.min(a.x, b.x) - 1e-7 &&
            p.x <= Math.max(a.x, b.x) + 1e-7 &&
            p.y >= Math.min(a.y, b.y) - 1e-7 &&
            p.y <= Math.max(a.y, b.y) + 1e-7
          );
        }),
      ).toBe(true);
    }
    expect(intersectShape(shape, rect, { x: 200, y: 60 })).toEqual({ x: 100, y: 60 });
    expect(intersectShape(shape, rect, { x: -100, y: 60 })).toEqual({ x: 20, y: 60 });
  }
});

test("sequence open chevrons, class hollow triangles and crosses have distinct SVG geometry", () => {
  const asyncScene = layoutDiagram(parseDiagram("sequenceDiagram\nA-)B: async"));
  const message = asyncScene.primitives.find((p) => p.type === "path" && p.end === "open");
  expect(message).toBeDefined();
  const svg = renderToSvg(asyncScene);
  expect(svg).not.toContain("<polygon");
  expect(svg).toContain('fill="none"');
  const inheritance = layoutDiagram(parseDiagram("classDiagram\nAnimal <|-- Dog"));
  expect(
    inheritance.primitives.some(
      (p) => p.type === "path" && (p.start === "hollow-triangle" || p.end === "hollow-triangle"),
    ),
  ).toBe(true);
  expect(renderToSvg(inheritance)).toMatch(/<polygon[^>]+fill="none"/);
  const cross = markerGeometry("cross", { x: 40, y: 20 }, { x: 0, y: 20 });
  expect(cross.paths).toEqual([
    [
      { x: 32, y: 15 },
      { x: 40, y: 25 },
    ],
    [
      { x: 32, y: 25 },
      { x: 40, y: 15 },
    ],
  ]);
  const scene: Scene = {
    kind: "sequence",
    bounds: { x: 0, y: 0, width: 50, height: 40 },
    accessibilityLabel: "cross",
    primitives: [
      {
        type: "path",
        points: [
          { x: 0, y: 20 },
          { x: 40, y: 20 },
        ],
        end: "cross",
      },
    ],
  };
  const crossSvg = renderToSvg(scene, { ...lightTheme, arrowSize: 10 });
  expect(crossSvg).toContain('points="32,15 40,25"');
  expect(crossSvg).toContain('points="32,25 40,15"');
  expect(crossSvg).not.toContain("<polygon");
});

test("actual Skia paths and SVG cylinder have curved top/bottom, with no horizontal body cap", async () => {
  const kit = await CanvasKitInit({
    locateFile: (file) => `${import.meta.dir}/../node_modules/canvaskit-wasm/bin/full/${file}`,
  });
  const api = JsiSkApi(kit),
    surface = api.Surface.MakeOffscreen(120, 100);
  if (!surface) throw new Error("Missing test surface");
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
    kind: "flowchart",
    bounds: { x: 0, y: 0, width: 120, height: 100 },
    accessibilityLabel: "cylinder",
    primitives: [{ type: "shape", shape: "cylinder", x: 10, y: 20, width: 100, height: 60 }],
  };
  try {
    drawScene(api, spy, scene, lightTheme);
    expect(paths.length).toBe(3);
    expect(paths[0]).toMatch(/[Cc]/);
    expect(paths[0]).toMatch(/[Zz]/);
    expect(paths[0].match(/[Cc]/g)?.length).toBe(4);
    expect(paths[2].match(/[Cc]/g)?.length).toBe(2);
    expect(paths[2]).not.toMatch(/[Zz]/);
    const svg = renderToSvg(scene);
    expect(svg.match(/<path/g)?.length).toBe(2);
    expect(svg).toContain("M10 28");
    expect(svg).toContain("L110 72");
    expect(svg).not.toContain("<ellipse");
    expect(svg).not.toContain('<rect x="10"');
    const geometry = cylinderGeometry({ x: 10, y: 20, width: 100, height: 60 });
    expect(geometry.bottom[0].end).toEqual({ x: 60, y: 80 });
    expect(geometry.top[0].end).toEqual({ x: 60, y: 20 });
    // Inspect actual marker paths: open chevron must have no close, cross two moves.
    for (const marker of ["open", "hollow-triangle", "cross"] as const) {
      paths.length = 0;
      drawScene(
        api,
        spy,
        {
          ...scene,
          primitives: [
            {
              type: "path",
              points: [
                { x: 0, y: 20 },
                { x: 40, y: 20 },
              ],
              end: marker,
            },
          ],
        },
        lightTheme,
      );
      expect(paths.length).toBe(marker === "cross" ? 3 : 2);
      expect(/[Zz]/.test(paths[1])).toBe(marker === "hollow-triangle");
      if (marker === "cross")
        expect(paths.slice(1).every((p) => (p.match(/[Ll]/g)?.length ?? 0) === 1)).toBe(true);
    }
  } finally {
    surface.dispose();
  }
});
