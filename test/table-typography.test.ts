import { afterAll, beforeAll, expect, test } from "bun:test";
import CanvasKitInit from "canvaskit-wasm/bin/full/canvaskit.js";
import { JsiSkApi } from "react-native-skia/lib/module/skia/web/JsiSkia.js";
import { typographyFixtures } from "../example/typography-fixtures.ts";
import { layoutDiagram, parseDiagram, lightTheme } from "../src/index.ts";
import { createSkiaTextMeasurer } from "../src/render/skia.ts";
import { loadQaFonts } from "./font-provider.ts";

let api: ReturnType<typeof JsiSkApi>, fonts: Awaited<ReturnType<typeof loadQaFonts>>;
beforeAll(async () => {
  const kit = await CanvasKitInit({
    locateFile: (file) => `${import.meta.dir}/../node_modules/canvaskit-wasm/bin/full/${file}`,
  });
  api = JsiSkApi(kit);
  fonts = await loadQaFonts(api);
});
afterAll(() => fonts.dispose());

for (const fontSize of [14, 24]) {
  test(`native table, state and sequence text retains measured padding at ${fontSize}px`, () => {
    const measure = createSkiaTextMeasurer(api, { fontFamily: "QA,QACJK" }, fonts.provider);
    for (const [kind, source] of Object.entries(typographyFixtures)) {
      const scene = layoutDiagram(parseDiagram(source), measure, {
        ...lightTheme.layout,
        fontSize,
      });
      for (const primitive of scene.primitives) {
        if (primitive.type !== "text") continue;
        const replay = (primitive.lineRuns ?? [[{ text: primitive.text }]])
          .map((line) => line.map((run) => run.text).join(""))
          .join("\n");
        const metrics = measure(replay, {
          fontSize: primitive.fontSize,
          fontWeight: primitive.fontWeight ?? 400,
          maxWidth: primitive.width + 1,
        });
        expect(metrics.height).toBeLessThanOrEqual(primitive.height + 0.75);
      }
      if (kind === "Class" || kind === "ER") {
        const tables = scene.primitives.filter((p) => p.type === "shape" && p.id);
        for (const table of tables) {
          if (table.type !== "shape") continue;
          expect(table.fill).toBe("transparent");
          const outlineIndex = scene.primitives.indexOf(table);
          const text = scene.primitives.filter(
            (p) =>
              p.type === "text" &&
              p.x >= table.x &&
              p.y >= table.y &&
              p.x < table.x + table.width &&
              p.y < table.y + table.height,
          );
          for (const cell of text) {
            if (cell.type !== "text") continue;
            expect(cell.x).toBeGreaterThanOrEqual(table.x + 8);
            expect(cell.y).toBeGreaterThanOrEqual(table.y + 8);
            expect(cell.x + cell.width).toBeLessThanOrEqual(table.x + table.width - 8 + 0.75);
            expect(cell.y + cell.height).toBeLessThanOrEqual(table.y + table.height - 8 + 0.75);
            expect(scene.primitives.indexOf(cell)).toBeLessThan(outlineIndex);
            for (const separator of scene.primitives) {
              if (
                separator.type !== "path" ||
                !["grid", "frame"].includes(separator.strokeRole ?? "")
              )
                continue;
              const [a, b] = separator.points;
              if (a.y !== b.y || a.x > table.x || b.x < table.x + table.width) continue;
              expect(a.y <= cell.y || a.y >= cell.y + cell.height).toBe(true);
            }
          }
        }
      }
      if (kind === "ER") {
        expect(
          scene.primitives.some(
            (p) => p.type === "text" && p.text.includes("Customer-facing name"),
          ),
        ).toBe(true);
        expect(
          scene.primitives.some((p) => p.type === "text" && p.text === "Customer account\nProfile"),
        ).toBe(true);
        const header = scene.primitives.find(
          (p) => p.type === "text" && p.text === "Customer account\nProfile",
        );
        if (header?.type !== "text") throw new Error("Missing multiline entity header");
        expect(
          scene.primitives.some(
            (p) =>
              p.type === "shape" &&
              p.fill === "paletteFill:1" &&
              p.y <= header.y &&
              p.y + p.height >= header.y + header.height,
          ),
        ).toBe(true);
      }
    }
  });
}

test("sequence activation begins at the receiving message and ends at its reply", () => {
  const measure = createSkiaTextMeasurer(api, { fontFamily: "QA,QACJK" }, fonts.provider);
  const scene = layoutDiagram(
    parseDiagram(
      "sequenceDiagram\nAlice->>Bob: Hello\nactivate Bob\nBob-->>Alice: Done\ndeactivate Bob",
    ),
    measure,
  );
  const messages = scene.primitives.filter((p) => p.type === "path" && p.end === "arrow");
  const activation = scene.primitives.find(
    (p) => p.type === "shape" && p.shape === "rect" && p.fill === "accent",
  );
  if (activation?.type !== "shape" || messages[0]?.type !== "path" || messages[1]?.type !== "path")
    throw new Error("Missing sequence activity");
  expect(activation.y).toBe(messages[0].points.at(-1)!.y);
  expect(activation.y + activation.height).toBe(messages[1].points[0].y);
  expect(messages[0].points.at(-1)!.x).toBe(activation.x);
  expect(messages[1].points[0].x).toBe(activation.x);
});
