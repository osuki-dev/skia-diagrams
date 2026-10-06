import { expect, test } from "bun:test";
import CanvasKitInit from "canvaskit-wasm/bin/full/canvaskit.js";
import { JsiSkApi } from "react-native-skia/lib/module/skia/web/JsiSkia.js";
import catalog from "./fixtures/official-mermaid/catalog.json" with { type: "json" };
import type { Primitive } from "../src/types.ts";
import { loadQaFonts } from "./font-provider.ts";
import { parseExtendedUml } from "../src/parse/extended-uml.ts";
import { layoutExtendedUml } from "../src/layout/extended-uml.ts";
import { createSkiaTextMeasurer, renderToPng } from "../src/render/skia.ts";
import { lightTheme } from "../src/render/theme.ts";
test("Use Case notes, literals and JSON tables remain clear with actual host font metrics", async () => {
  const kit = await CanvasKitInit({
    locateFile: (file: string) =>
      `${import.meta.dir}/../node_modules/canvaskit-wasm/bin/full/${file}`,
  });
  const api = JsiSkApi(kit),
    fonts = await loadQaFonts(api);
  try {
    for (const fontSize of [14, 24])
      for (const caseId of [
        "usecase/005",
        "usecase/007",
        "usecase/016",
        "usecase/017",
        "usecase/023",
      ]) {
        const fixture = catalog.types
          .find((type) => type.type === "usecase")!
          .cases.find((f) => f.id === caseId)!;
        const theme = {
            ...lightTheme,
            fontSize,
            fontFamily: "QA,QACJK",
            paletteFill: ["#abcdef", "#345678"],
            paletteText: ["#ffffff", "#fedcba"],
            strokeWidth: 3,
            radius: 12,
          },
          measure = createSkiaTextMeasurer(api, theme, fonts.provider),
          scene = layoutExtendedUml(parseExtendedUml(fixture.source)!, measure, {
            fontSize,
            radius: theme.radius,
          })!;
        expect(renderToPng(api, scene, theme, 1, fonts.provider).length).toBeGreaterThan(0);
        const labels = scene.primitives.filter((p) => p.type === "text");
        for (const label of labels) {
          const replay = measure(label.text, {
            fontSize: label.fontSize,
            fontWeight: label.fontWeight,
            maxWidth: label.width,
            literal: label.literal,
          });
          expect(replay.height, `${caseId} ${fontSize}: ${label.text}`).toBeLessThanOrEqual(
            label.height + 0.5,
          );
          expect(label.x).toBeGreaterThanOrEqual(scene.bounds.x);
          expect(label.y).toBeGreaterThanOrEqual(scene.bounds.y);
          expect(label.x + label.width).toBeLessThanOrEqual(scene.bounds.x + scene.bounds.width);
          expect(label.y + label.height).toBeLessThanOrEqual(scene.bounds.y + scene.bounds.height);
        }
        const notes = scene.primitives.filter(
            (p): p is Extract<Primitive, { type: "shape" }> =>
              p.type === "shape" && p.fill === "noteFill",
          ),
          nodes = scene.primitives.filter(
            (p): p is Extract<Primitive, { type: "shape" }> => p.type === "shape" && Boolean(p.id),
          );
        for (const note of notes)
          for (const node of nodes) {
            expect(
              note.x < node.x + node.width &&
                node.x < note.x + note.width &&
                note.y < node.y + node.height &&
                node.y < note.y + note.height,
              `${caseId} ${fontSize}: note overlaps node`,
            ).toBe(false);
          }
        if (caseId === "usecase/005") {
          const identifier = labels.find((label) => label.text === "not-registered:user")!;
          const actorLabel = labels.find((label) => label.text === "Missing icon fallback")!;
          expect(identifier.fontSize).toBe(fontSize);
          expect(identifier.literal).toBe(true);
          expect(identifier.y + identifier.height).toBeLessThanOrEqual(actorLabel.y);
          expect(
            scene.primitives.some(
              (primitive) => primitive.fill === "#087ebf" || primitive.fill === "#ffffff",
            ),
          ).toBe(false);
        }
        if (caseId === "usecase/007")
          expect(labels.find((label) => label.text === "**Literal markers**")?.literal).toBe(true);
        if (caseId === "usecase/023") {
          expect(labels.some((label) => label.text === "items[0].quantity" && label.literal)).toBe(
            true,
          );
          expect(
            scene.interactions?.some(
              (hit) => hit.target === "OrderData:items[0].quantity" && hit.value === 1,
            ),
          ).toBe(true);
        }
      }
  } finally {
    fonts.dispose();
  }
});
