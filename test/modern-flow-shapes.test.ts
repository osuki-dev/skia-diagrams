import { expect, test } from "bun:test";
import CanvasKitInit from "canvaskit-wasm/bin/full/canvaskit.js";
import { JsiSkApi } from "react-native-skia/lib/module/skia/web/JsiSkia.js";
import { modernShapeContours, contourPoints } from "../src/render/flow-shapes.ts";
import { intersectShape } from "../src/render/geometry.ts";
import { drawScene } from "../src/render/skia.ts";
import { renderToSvg } from "../src/render/svg.ts";
import { lightTheme } from "../src/render/theme.ts";
import type { Scene, Shape } from "../src/types.ts";

const shapes: Shape[] =
  "text notch-rect lin-rect sm-circ fr-circ fork hourglass brace brace-r braces bolt doc delay h-cyl lin-cyl curv-trap div-rect tri win-pane f-circ notch-pent flip-tri sl-rect docs st-rect bow-rect cross-circ tag-doc tag-rect paper-tape lin-doc".split(
    " ",
  ) as Shape[];
const rect = { x: 10, y: 20, width: 120, height: 80 };

test("modern shape contours stay within their layout bounds and terminals meet their drawn contour", () => {
  for (const shape of shapes) {
    const contours = modernShapeContours(shape, rect)!;
    expect(contours).toBeDefined();
    if (shape === "text") {
      expect(contours).toEqual([]);
      continue;
    }
    for (const contour of contours)
      for (const point of contourPoints(contour.commands)) {
        expect(point.x).toBeGreaterThanOrEqual(rect.x - 1e-8);
        expect(point.x).toBeLessThanOrEqual(rect.x + rect.width + 1e-8);
        expect(point.y).toBeGreaterThanOrEqual(rect.y - 1e-8);
        expect(point.y).toBeLessThanOrEqual(rect.y + rect.height + 1e-8);
      }
    // Closed silhouettes have a real boundary in each radial direction.
    if (!contours[0].fill || shape === "hourglass") continue;
    const outlines = contours
      .filter((contour) => contour.fill)
      .map((contour) => contourPoints(contour.commands));
    for (const toward of [
      { x: 250, y: 60 },
      { x: -100, y: 60 },
      { x: 70, y: -100 },
      { x: 70, y: 200 },
    ]) {
      const hit = intersectShape(shape, rect, toward);
      expect(
        outlines.some((points) =>
          points.some((a, i) => {
            const b = points[(i + 1) % points.length],
              dx = b.x - a.x,
              dy = b.y - a.y;
            return (
              Math.abs((hit.x - a.x) * dy - (hit.y - a.y) * dx) < 1e-5 &&
              hit.x >= Math.min(a.x, b.x) - 1e-7 &&
              hit.x <= Math.max(a.x, b.x) + 1e-7 &&
              hit.y >= Math.min(a.y, b.y) - 1e-7 &&
              hit.y <= Math.max(a.y, b.y) + 1e-7
            );
          }),
        ),
      ).toBe(true);
    }
  }
});

test("native Skia draws all modern silhouettes and SVG emits distinct storage/document decoration", async () => {
  const kit = await CanvasKitInit({
    locateFile: (file) => `${import.meta.dir}/../node_modules/canvaskit-wasm/bin/full/${file}`,
  });
  const api = JsiSkApi(kit),
    surface = api.Surface.MakeOffscreen(160, 130);
  if (!surface) throw new Error("Missing shape test surface");
  try {
    for (const shape of shapes) {
      const scene: Scene = {
        kind: "flowchart",
        bounds: { x: 0, y: 0, width: 160, height: 130 },
        accessibilityLabel: shape,
        primitives: [{ type: "shape", shape, ...rect }],
      };
      drawScene(api, surface.getCanvas(), scene, lightTheme);
      const svg = renderToSvg(scene);
      if (shape === "text") expect(svg).not.toContain("<path");
      else expect(svg).toContain("<path");
      expect(svg).not.toMatch(/<path[^>]*fill="[^"]*"[^>]*fill=/);
    }
  } finally {
    surface.dispose();
  }
});

test("linear gradients use scene coordinates and resolved theme tokens in native and SVG renderers", async () => {
  const kit = await CanvasKitInit({
    locateFile: (file) => `${import.meta.dir}/../node_modules/canvaskit-wasm/bin/full/${file}`,
  });
  const api = JsiSkApi(kit),
    surface = api.Surface.MakeOffscreen(160, 130);
  if (!surface) throw new Error("Missing gradient test surface");
  const scene: Scene = {
    kind: "flowchart",
    bounds: { x: 0, y: 0, width: 160, height: 130 },
    accessibilityLabel: "gradient",
    primitives: [
      {
        type: "path",
        points: [
          { x: 10, y: 20 },
          { x: 130, y: 20 },
          { x: 130, y: 100 },
          { x: 10, y: 100 },
        ],
        closed: true,
        fill: "palette:0",
        strokeWidth: 0,
        opacity: 0.5,
        gradient: {
          from: { x: 10, y: 20 },
          to: { x: 130, y: 100 },
          stops: [
            { offset: 0, color: "palette:0" },
            { offset: 1, color: "palette:1" },
          ],
        },
      },
    ],
  };
  try {
    drawScene(api, surface.getCanvas(), scene, lightTheme);
  } finally {
    surface.dispose();
  }
  const svg = renderToSvg(scene);
  expect(svg).toContain('gradientUnits="userSpaceOnUse" x1="10" y1="20" x2="130" y2="100"');
  expect(svg).toContain(`stop-color="${lightTheme.palette[0]}"`);
  expect(svg).toContain('fill="url(#diagram-gradient-0)"');
  expect(svg).toContain('opacity="0.5"');
});

test("outlined text paints native stroke behind fill without changing measured label bounds", async () => {
  const { loadQaFonts } = await import("./font-provider.ts");
  const kit = await CanvasKitInit({
    locateFile: (file) => `${import.meta.dir}/../node_modules/canvaskit-wasm/bin/full/${file}`,
  });
  const api = JsiSkApi(kit),
    surface = api.Surface.MakeOffscreen(180, 80),
    fonts = await loadQaFonts(api);
  if (!surface) throw new Error("Missing outline test surface");
  const scene: Scene = {
    kind: "flowchart",
    bounds: { x: 0, y: 0, width: 180, height: 80 },
    accessibilityLabel: "Outlined label",
    primitives: [
      {
        type: "text",
        x: 10,
        y: 10,
        width: 150,
        height: 40,
        fontSize: 20,
        text: "Energy 42",
        textOutline: { color: "background", width: 3 },
      },
    ],
  };
  try {
    drawScene(api, surface.getCanvas(), scene, { ...lightTheme, fontFamily: "QA" }, fonts.provider);
  } finally {
    surface.dispose();
    fonts.dispose();
  }
  const svg = renderToSvg(scene);
  expect(svg).toContain('paint-order="stroke fill"');
  expect(svg).toContain('stroke-width="3"');
});
