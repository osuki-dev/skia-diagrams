import { expect, test } from "bun:test";
import CanvasKitInit from "canvaskit-wasm/bin/full/canvaskit.js";
import { JsiSkApi } from "react-native-skia/lib/module/skia/web/JsiSkia.js";
import { officialCatalog } from "../example/official-fixtures.ts";
import { estimateText } from "../src/layout/measure.ts";
import { textRuns, runsForLines } from "../src/render/text.ts";
import { createSkiaTextMeasurer, renderToPng } from "../src/render/skia.ts";
import { renderToSvg } from "../src/render/svg.ts";
import { layoutDiagram, parseDiagram, lightTheme } from "../src/index.ts";
import { hitTestInteraction } from "../src/react/hit-test.ts";
import { loadQaFonts } from "./font-provider.ts";
import type { Scene, Primitive } from "../src/types.ts";

const pieSource = officialCatalog.types.find((type) => type.type === "pie")!.cases[1].source;
test("literal labels preserve all markers while markdown accepts both strong spellings", () => {
  const label = "__strong__ **bold** _italic_ *star*";
  expect(textRuns(label, true)).toEqual([{ text: label }]);
  expect(runsForLines(label, [label], true)).toEqual([[{ text: label }]]);
  expect(estimateText(label, { fontSize: 14, literal: true }).lines).toEqual([label]);
  expect(
    textRuns("__strong__ **bold**")
      .filter((run) => run.bold)
      .map((run) => run.text),
  ).toEqual(["strong", "bold"]);
  const scene: Scene = {
    kind: "usecase",
    bounds: { x: 0, y: 0, width: 400, height: 60 },
    accessibilityLabel: label,
    primitives: [
      {
        type: "text",
        literal: true,
        text: label,
        x: 0,
        y: 0,
        width: 400,
        height: 30,
        fontSize: 14,
      },
    ],
  };
  expect(renderToSvg(scene)).toContain(label);
  expect(renderToSvg(scene)).not.toContain('font-style="italic"');
});

test("official pie002 consumes donut, highlight, label position, values and outer stroke", () => {
  const scene = layoutDiagram(parseDiagram(pieSource));
  const sectors = scene.primitives.filter((p) => p.type === "sector");
  expect(sectors).toHaveLength(4);
  expect(sectors.every((p) => p.innerRadius === p.radius * 0.2)).toBe(true);
  expect(Math.max(...sectors.map((p) => p.radius))).toBeCloseTo(94.5, 5);
  expect(scene.primitives.some((p) => p.type === "text" && p.text === "Potassium [50.05]")).toBe(
    true,
  );
  expect(scene.primitives.some((p) => p.type === "path" && p.strokeWidth === 5)).toBe(true);
  const slice = sectors[0],
    label = scene.primitives.find((p) => p.type === "text" && p.text.endsWith("%"));
  if (!label || label.type !== "text") throw new Error("Missing percentage");
  expect(
    Math.hypot(label.x + label.width / 2 - slice.cx, label.y + label.height / 2 - slice.cy),
  ).toBeCloseTo(45, 5);
  expect(hitTestInteraction(scene, { x: slice.cx, y: slice.cy })).toBeUndefined();
  const a = slice.startAngle + slice.sweepAngle / 2;
  expect(
    hitTestInteraction(scene, {
      x: slice.cx + slice.radius * 0.7 * Math.cos(a),
      y: slice.cy + slice.radius * 0.7 * Math.sin(a),
    })?.label,
  ).toBe("Calcium");
  expect(renderToSvg(scene)).toMatch(/A18 18 0 0 0/);
});

test("actual Skia pie PNGs at 10/14/18/24px preserve the open center and literal Paragraph metrics", async () => {
  const kit = await CanvasKitInit({
    locateFile: (file) => `${import.meta.dir}/../node_modules/canvaskit-wasm/bin/full/${file}`,
  });
  const api = JsiSkApi(kit),
    fonts = await loadQaFonts(api);
  try {
    for (const size of [10, 14, 18, 24]) {
      const theme = { ...lightTheme, fontSize: size, fontFamily: "QA" },
        measure = createSkiaTextMeasurer(api, theme, fonts.provider);
      expect(measure("__strong__", { fontSize: size, literal: true }).lines).toEqual([
        "__strong__",
      ]);
      expect(measure("__strong__", { fontSize: size }).lines).toEqual(["strong"]);
      const scene = layoutDiagram(parseDiagram(pieSource), measure, { fontSize: size });
      const sectors = scene.primitives.filter((p) => p.type === "sector"),
        slice = sectors[0];
      const percentages = scene.primitives.filter(
        (p): p is Extract<Primitive, { type: "text" }> => p.type === "text" && p.text.endsWith("%"),
      );
      expect(percentages).toHaveLength(4);
      expect(percentages.some((p) => p.type === "text" && p.text === "5%")).toBe(true);
      for (let i = 0; i < percentages.length; i++)
        for (let j = i + 1; j < percentages.length; j++) {
          const a = percentages[i],
            b = percentages[j];
          expect(
            a.x + a.width <= b.x ||
              b.x + b.width <= a.x ||
              a.y + a.height <= b.y ||
              b.y + b.height <= a.y,
          ).toBe(true);
        }
      const outline = scene.primitives.filter(
        (p): p is Extract<Primitive, { type: "path" }> => p.type === "path" && p.strokeWidth === 5,
      );
      expect(outline).toHaveLength(1);
      expect(
        Math.max(
          ...outline
            .flatMap((p) => [...p.points, ...(p.curves?.map((curve) => curve.end) ?? [])])
            .map((p) => Math.hypot(p.x - slice.cx, p.y - slice.cy)),
        ),
      ).toBeCloseTo(92.5, 5);
      expect(scene.primitives.indexOf(outline[0])).toBeLessThan(
        scene.primitives.findIndex((p) => p.type === "sector"),
      );
      const png = renderToPng(api, scene, theme, 1, fonts.provider),
        decoded = kit.MakeImageFromEncoded(png);
      if (!decoded) throw new Error("Pie PNG unavailable");
      try {
        const pixels = decoded.readPixels(0, 0, {
          width: decoded.width(),
          height: decoded.height(),
          colorType: kit.ColorType.RGBA_8888,
          alphaType: kit.AlphaType.Unpremul,
          colorSpace: kit.ColorSpace.SRGB,
        });
        if (!(pixels instanceof Uint8Array)) throw new Error("Missing PNG RGBA");
        const px = Math.round(slice.cx - scene.bounds.x),
          py = Math.round(slice.cy - scene.bounds.y),
          offset = (py * decoded.width() + px) * 4;
        expect(Array.from(pixels.slice(offset, offset + 4))).toEqual([247, 243, 236, 255]);
      } finally {
        decoded.delete();
      }
      if (process.env.DIAGRAM_CAPTURE_CONFIG === "1")
        await Bun.write(`design/theme-studio/implemented/pie-official-002-font-${size}.png`, png);
    }
  } finally {
    fonts.dispose();
  }
});

test("pie percentage color can follow the approved design without changing legend colors", () => {
  const scene = layoutDiagram(parseDiagram(pieSource), estimateText, {
    typeStyles: { pie: { labelColor: "#FFFFFF" } },
  });
  const labels = scene.primitives.filter(
    (p) => p.type === "text" && p.semantic?.role === "percentage" && p.color === "#FFFFFF",
  );
  expect(labels.length).toBeGreaterThan(0);
  expect(labels.every((p) => p.type === "text" && p.color === "#FFFFFF")).toBe(true);
  // Small outside labels retain readable theme ink on the light background.
  expect(
    scene.primitives.some(
      (p) => p.type === "text" && p.semantic?.role === "percentage" && p.color === "nodeText",
    ),
  ).toBe(true);
  expect(
    scene.primitives.some(
      (p) => p.type === "text" && p.text.includes("Calcium") && p.color !== "#FFFFFF",
    ),
  ).toBe(true);
});

test("official pie legend fits 320/375/430-point viewports at 14/24px with complete values and clear gutters", async () => {
  const { darkTheme } = await import("../src/render/theme.ts");
  const kit = await CanvasKitInit({
    locateFile: (file) => `${import.meta.dir}/../node_modules/canvaskit-wasm/bin/full/${file}`,
  });
  const api = JsiSkApi(kit),
    fonts = await loadQaFonts(api);
  try {
    for (const [mode, base] of [
      ["light", lightTheme],
      ["dark", darkTheme],
    ] as const)
      for (const size of [14, 24])
        for (const width of [320, 375, 430]) {
          const theme = { ...base, fontSize: size, fontFamily: "QA" },
            measure = createSkiaTextMeasurer(api, theme, fonts.provider);
          const scene = layoutDiagram(parseDiagram(pieSource), measure, {
            fontSize: size,
            viewportWidth: width,
          });
          expect(scene.bounds.width).toBeLessThanOrEqual(width + 1e-5);
          const sectors = scene.primitives.filter((p) => p.type === "sector"),
            rim = scene.primitives.filter(
              (p): p is Extract<Primitive, { type: "path" }> =>
                p.type === "path" && p.strokeWidth === 5,
            );
          expect(rim).toHaveLength(1);
          expect(rim[0].closed).toBe(true);
          const legend = scene.primitives.filter(
            (p): p is Extract<Primitive, { type: "text" }> =>
              p.type === "text" && p.text.includes("["),
          );
          expect(legend).toHaveLength(4);
          const bottom = Math.max(...sectors.map((p) => p.cy + p.radius));
          for (const p of legend) {
            expect(p.y).toBeGreaterThan(bottom);
            expect(
              p.lineRuns
                ?.flat()
                .map((run) => run.text)
                .join("")
                .replaceAll(" ", ""),
            ).toBe(p.text.replaceAll(" ", ""));
            expect(p.text).not.toContain("…");
          }
          const labels = scene.primitives.filter(
            (p): p is Extract<Primitive, { type: "text" }> => p.type === "text",
          );
          for (let i = 0; i < labels.length; i++)
            for (let j = i + 1; j < labels.length; j++) {
              const a = labels[i],
                b = labels[j];
              expect(
                a.x + a.width <= b.x + 1e-5 ||
                  b.x + b.width <= a.x + 1e-5 ||
                  a.y + a.height <= b.y + 1e-5 ||
                  b.y + b.height <= a.y + 1e-5,
              ).toBe(true);
            }
          const leaders = scene.primitives.filter(
            (p): p is Extract<Primitive, { type: "path" }> =>
              p.type === "path" && p.strokeRole === "grid",
          );
          for (const leader of leaders) {
            expect(leader.points.length).toBeGreaterThanOrEqual(3);
            expect(leader.points.length).toBeLessThanOrEqual(4);
            const [, exit, elbow] = leader.points;
            expect(exit.y).toBeCloseTo(elbow.y, 5);
          }
          const png = renderToPng(api, scene, theme, 2, fonts.provider);
          expect(png.length).toBeGreaterThan(1000);
          if (process.env.DIAGRAM_CAPTURE_CONFIG === "1")
            await Bun.write(
              `design/theme-studio/implemented/pie-responsive-${mode}-${width}-${size}.png`,
              png,
            );
        }
  } finally {
    fonts.dispose();
  }
});

test("pie legend swatches honor host corner radius within their 10-point size", () => {
  for (const [radius, expected] of [
    [0, 0],
    [3, 3],
    [8, 5],
  ]) {
    const scene = layoutDiagram(parseDiagram(pieSource), estimateText, { radius });
    const swatches = scene.primitives.filter(
      (p) => p.type === "shape" && p.semantic?.role === "legend",
    );
    expect(swatches).toHaveLength(4);
    expect(swatches.every((p) => p.type === "shape" && p.radius === expected)).toBe(true);
  }
});

test("explicit Pie presentation overrides retain source syntax while matching the approved solid circle", () => {
  const ir = parseDiagram(pieSource);
  const scene = layoutDiagram(ir, estimateText, {
    typeStyles: {
      pie: { outerStrokeWidth: 0, donutHole: 0, highlightScale: 1, textPosition: 0.64 },
    },
  });
  const wedges = scene.primitives.filter(
    (p): p is Extract<Primitive, { type: "sector" }> => p.type === "sector",
  );
  expect(wedges).toHaveLength(4);
  expect(wedges.every((p) => p.radius === 90 && (p.innerRadius ?? 0) === 0)).toBe(true);
  expect(scene.primitives.some((p) => p.semantic?.role === "rim")).toBe(false);
  expect(
    scene.interactions?.every(
      (hit) => hit.hit?.type === "sector" && (hit.hit.innerRadius ?? 0) === 0,
    ),
  ).toBe(true);
  if (!("ir" in ir)) throw new Error("Expected supported Pie source");
  const config = ir.ir.data?.config as { pie: { donutHole: number } } | undefined;
  expect(config?.pie.donutHole).toBe(0.2);
  const explicitSize = layoutDiagram(ir, estimateText, {
    viewportWidth: 320,
    typeStyles: { pie: { diameter: 260, highlightScale: 1, legendPosition: "right" } },
  });
  expect(
    explicitSize.primitives.filter((p) => p.type === "sector").every((p) => p.radius === 130),
  ).toBe(true);
  expect(
    explicitSize.primitives.some(
      (p) => p.type === "shape" && p.semantic?.role === "legend" && p.x > 260,
    ),
  ).toBe(true);
  const outlined = layoutDiagram(ir, estimateText, {
    typeStyles: { pie: { outerStrokeWidth: 1 } },
  });
  expect(
    outlined.primitives.some(
      (p) => p.type === "path" && p.semantic?.role === "rim" && p.strokeWidth === 1,
    ),
  ).toBe(true);
});
