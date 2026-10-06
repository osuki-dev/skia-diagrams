import { expect, test } from "bun:test";
import CanvasKitInit from "canvaskit-wasm/bin/full/canvaskit.js";
import { JsiSkApi } from "react-native-skia/lib/module/skia/web/JsiSkia.js";
import { cjkCases, cjkFixtures } from "../example/cjk-fixtures.ts";
import { loadQaFonts } from "./font-provider.ts";
import { layoutDiagram, parseDiagram, lightTheme, darkTheme, renderToSvg } from "../src/index.ts";
import { createSkiaTextMeasurer, renderToPng } from "../src/render/skia.ts";
import { extremeFixtures } from "../example/extreme-fixtures.ts";

test("truncated large labels do not reflow the ellipsis into a thirteenth painted line", async () => {
  const kit = await CanvasKitInit({
    locateFile: (f) => `${import.meta.dir}/../node_modules/canvaskit-wasm/bin/full/${f}`,
  });
  const api = JsiSkApi(kit),
    fonts = await loadQaFonts(api),
    theme = { ...lightTheme, fontFamily: "QA,QACJK" };
  try {
    const scene = layoutDiagram(
      parseDiagram(extremeFixtures.ExtremeLabels),
      createSkiaTextMeasurer(api, theme, fonts.provider),
      { ...theme.layout, fontSize: theme.fontSize, radius: theme.radius },
    );
    for (const label of scene.primitives)
      if (label.type === "text") {
        const lines = label.lineRuns?.map((line) => line.map((run) => run.text).join("")) ?? [];
        expect(lines).toHaveLength(12);
        expect(lines.at(-1)).toEndWith("…");
        const builder = api.ParagraphBuilder.Make(
          { textStyle: { fontSize: label.fontSize, fontFamilies: theme.fontFamily.split(",") } },
          fonts.provider,
        );
        builder.addText(lines.join("\n"));
        const paragraph = builder.build();
        builder.dispose();
        try {
          paragraph.layout(label.width + 1);
          expect(paragraph.getLineMetrics()).toHaveLength(lines.length);
          expect(paragraph.getHeight()).toBeLessThanOrEqual(label.height + 0.001);
        } finally {
          paragraph.dispose();
        }
      }
  } finally {
    fonts.dispose();
  }
});

test("regional CJK QA fonts cover their actual fixtures and Paragraph wraps/ellipsis stay inside padded shapes", async () => {
  const kit = await CanvasKitInit({
    locateFile: (f) => `${import.meta.dir}/../node_modules/canvaskit-wasm/bin/full/${f}`,
  });
  const api = JsiSkApi(kit),
    fonts = await loadQaFonts(api);
  try {
    expect(
      fonts.faces
        .get("QACJK")
        ?.getGlyphIDs("ひカ한")
        .every((glyph) => glyph === 0),
    ).toBe(true);
    for (const [name, sample] of Object.entries(cjkCases)) {
      const aliases = sample.family.split(",");
      for (const character of new Set(sample.label + " ABC 123，。！？１２３…")) {
        if (/\s/.test(character)) continue;
        expect(
          aliases.some((alias) =>
            fonts.faces
              .get(alias)
              ?.getGlyphIDs(character)
              .some((id) => id !== 0),
          ),
        ).toBe(true);
      }
      for (const base of [lightTheme, darkTheme]) {
        const theme = {
          ...base,
          fontFamily: sample.family,
          layout: { maxLabelWidth: 160, maxLabelLines: 4 },
        };
        const measure = createSkiaTextMeasurer(api, theme, fonts.provider);
        const metrics = measure(sample.label + " ABC 123", { fontSize: 14, maxWidth: 160 });
        expect(metrics.lines.length).toBeGreaterThan(1);
        expect(metrics.width).toBeLessThanOrEqual(160.001);
        const scene = layoutDiagram(parseDiagram(cjkFixtures[name]), measure, {
          ...theme.layout,
          fontSize: theme.fontSize,
          radius: theme.radius,
        });
        const labels = scene.primitives.filter(
          (p) => p.type === "text" && p.text.includes(sample.label),
        );
        expect(labels).toHaveLength(2);
        for (const label of labels)
          if (label.type === "text") {
            expect(label.lineRuns?.length).toBe(4);
            expect(
              label.lineRuns
                ?.at(-1)
                ?.map((run) => run.text)
                .join(""),
            ).toEndWith("…");
            const node = scene.primitives.find(
              (p) =>
                p.type === "shape" &&
                !!p.id &&
                label.x >= p.x &&
                label.y >= p.y &&
                label.x + label.width <= p.x + p.width &&
                label.y + label.height <= p.y + p.height,
            );
            expect(node).toBeDefined();
          }
        const svg = renderToSvg(scene, theme);
        for (const label of labels)
          if (label.type === "text")
            for (const [index, baseline] of (label.lineBaselines ?? []).entries()) {
              expect(svg).toContain(`y="${label.y + baseline}"`);
              expect(index).toBeLessThan(4);
            }
        expect(svg).toContain(`font-family="${sample.family}"`);
        expect(svg).toContain("…");
        const png = renderToPng(api, scene, theme, 2, fonts.provider);
        expect(png.length).toBeGreaterThan(1000);
        if (process.env.RENDER_ARTIFACTS) {
          const stem = `${process.env.RENDER_ARTIFACTS}/${name}-${base === lightTheme ? "light" : "dark"}`;
          await Bun.write(`${stem}.png`, png);
          await Bun.write(`${stem}.svg`, svg);
        }
      }
    }
  } finally {
    fonts.dispose();
  }
});
