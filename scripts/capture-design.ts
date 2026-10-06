import CanvasKitInit from "canvaskit-wasm/bin/full/canvaskit.js";
import { JsiSkApi } from "react-native-skia/lib/module/skia/web/JsiSkia.js";
import { layoutDiagram, parseDiagram, lightTheme, darkTheme, renderToSvg } from "../src/index.ts";
import { createSkiaTextMeasurer, drawScene, renderToPng } from "../src/render/skia.ts";
import { designFixtures, designChartStyles } from "../example/design-fixtures.ts";
import { loadQaFonts } from "../test/font-provider.ts";

const output = process.argv[2] ?? "design/theme-studio/implemented";
const kit = await CanvasKitInit({
  locateFile: (file) => `${import.meta.dir}/../node_modules/canvaskit-wasm/bin/full/${file}`,
});
const api = JsiSkApi(kit),
  fonts = await loadQaFonts(api);
try {
  for (const [mode, base] of [
    ["light", lightTheme],
    ["dark", darkTheme],
  ] as const) {
    const theme = {
      ...base,
      fontFamily: "QA,QACJK",
      layout: { ...base.layout, typeStyles: { ...designChartStyles, ...base.layout?.typeStyles } },
    };
    const measure = createSkiaTextMeasurer(api, theme, fonts.provider);
    const surface = api.Surface.MakeOffscreen(2160, 1700);
    if (!surface) throw new Error("Design board surface unavailable");
    try {
      const canvas = surface.getCanvas();
      canvas.clear(api.Color(theme.background));
      const label = (text: string, x: number, y: number, size: number, muted = false) => {
        const builder = api.ParagraphBuilder.Make(
          {
            textStyle: {
              fontFamilies: ["QA"],
              fontSize: size,
              color: api.Color(muted ? theme.mutedText! : theme.nodeText),
              fontStyle: { weight: muted ? 400 : 600 },
            },
          },
          fonts.provider,
        );
        const paragraph = (() => {
          try {
            builder.addText(text);
            return builder.build();
          } finally {
            builder.dispose?.();
          }
        })();
        try {
          paragraph.layout(2040);
          paragraph.paint(canvas, x, y);
        } finally {
          paragraph.dispose();
        }
      };
      label("Skia Diagrams", 40, 26, 40);
      label("13 types · One theme system · " + mode, 400, 42, 22, true);
      for (const [index, [name, source]] of Object.entries(designFixtures).entries()) {
        const scene = layoutDiagram(parseDiagram(source), measure, {
          ...theme.layout,
          fontSize: theme.fontSize,
          radius: theme.radius,
        });
        await Bun.write(
          `${output}/${mode}/${name}.png`,
          renderToPng(api, scene, theme, 2, fonts.provider),
        );
        await Bun.write(`${output}/${mode}/${name}.svg`, renderToSvg(scene, theme));
        const x = 40 + (index % 4) * 530,
          y = 104 + Math.floor(index / 4) * 394;
        drawScene(
          api,
          canvas,
          {
            kind: scene.kind,
            accessibilityLabel: "",
            bounds: { x, y, width: 514, height: 378 },
            primitives: [
              {
                type: "shape",
                shape: "round",
                x,
                y,
                width: 514,
                height: 378,
                fill: "nodeFill",
                stroke: "gridStroke",
                strokeRole: "frame",
                radius: 12,
              },
            ],
          },
          theme,
          fonts.provider,
        );
        label(String(index + 1).padStart(2, "0") + "  " + name, x + 12, y + 8, 23);
        const scale = Math.min(1.5, 498 / scene.bounds.width, 324 / scene.bounds.height);
        canvas.save();
        canvas.translate(
          x + 12 + (498 - scene.bounds.width * scale) / 2,
          y + 50 + (324 - scene.bounds.height * scale) / 2,
        );
        canvas.scale(scale, scale);
        canvas.translate(-scene.bounds.x, -scene.bounds.y);
        drawScene(api, canvas, scene, { ...theme, background: theme.nodeFill }, fonts.provider);
        canvas.restore();
        if (mode === "light" && process.argv.includes("--thumbnails")) {
          // Gallery previews retain three physical pixels per logical point.
          const thumbnail = api.Surface.MakeOffscreen(720, 432);
          if (!thumbnail) throw new Error("Thumbnail surface unavailable");
          try {
            const target = thumbnail.getCanvas(),
              fit = Math.min(224 / scene.bounds.width, 128 / scene.bounds.height);
            target.clear(api.Color(theme.background));
            target.scale(3, 3);
            target.translate(
              (240 - scene.bounds.width * fit) / 2,
              (144 - scene.bounds.height * fit) / 2,
            );
            target.scale(fit, fit);
            target.translate(-scene.bounds.x, -scene.bounds.y);
            drawScene(api, target, scene, theme, fonts.provider);
            thumbnail.flush();
            const image = thumbnail.makeImageSnapshot();
            try {
              await Bun.write(
                `${import.meta.dir}/../example/assets/gallery/${name}.png`,
                image.encodeToBytes(),
              );
            } finally {
              image.dispose();
            }
          } finally {
            thumbnail.dispose();
          }
        }
      }
      label("Theme tokens", 582, 1340, 26);
      label("background / nodeFill / nodeText / accent / palette", 582, 1390, 21, true);
      label("fontSize 14  /  strokeWidth 1.25  /  radius 8  /  arrowSize 11", 582, 1432, 21, true);
      label("layout.padding 20  /  layout.typeStyles", 582, 1474, 21, true);
      const paint = api.Paint();
      try {
        for (const [index, color] of theme.palette.entries()) {
          paint.setColor(api.Color(color));
          canvas.drawCircle(602 + index * 62, 1540, 20, paint);
        }
      } finally {
        paint.dispose();
      }
      surface.flush();
      const image = surface.makeImageSnapshot();
      try {
        await Bun.write(`${output}/all-types-${mode}.png`, image.encodeToBytes());
      } finally {
        image.dispose();
      }
    } finally {
      surface.dispose();
    }
  }
} finally {
  fonts.dispose();
}
console.log(`Saved real Skia previews to ${output}`);
