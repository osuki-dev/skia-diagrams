import { expect, test } from "bun:test";
import CanvasKitInit from "canvaskit-wasm/bin/full/canvaskit.js";
import { JsiSkApi } from "react-native-skia/lib/module/skia/web/JsiSkia.js";
import catalog from "./fixtures/official-mermaid/catalog.json" with { type: "json" };
import { loadQaFonts } from "./font-provider.ts";
import { parseExtendedUml } from "../src/parse/extended-uml.ts";
import { layoutExtendedUml } from "../src/layout/extended-uml.ts";
import { c4Motion } from "../src/react/motion-policies/c4.ts";
import { usecaseMotion } from "../src/react/motion-policies/usecase.ts";
import { createSkiaTextMeasurer } from "../src/render/skia.ts";
import { lightTheme } from "../src/render/theme.ts";

test("C4 boundaries and Use Case notes and tables preserve native text and semantic motion", async () => {
  const kit = await CanvasKitInit({
    locateFile: (file: string) =>
      `${import.meta.dir}/../node_modules/canvaskit-wasm/bin/full/${file}`,
  });
  const api = JsiSkApi(kit),
    fonts = await loadQaFonts(api);
  try {
    for (const type of catalog.types.filter(
      (entry) => entry.type === "c4" || entry.type === "usecase",
    ))
      for (const fixture of type.cases.filter((fixture) =>
        [
          "c4/001",
          "c4/005",
          "c4/006",
          "usecase/005",
          "usecase/007",
          "usecase/016",
          "usecase/017",
          "usecase/023",
        ].includes(fixture.id),
      ))
        for (const fontSize of [14, 24]) {
          const theme = { ...lightTheme, fontSize, fontFamily: "QA,QACJK" };
          const measure = createSkiaTextMeasurer(api, theme, fonts.provider);
          const parsed = parseExtendedUml(fixture.source)!;
          if (!("ir" in parsed))
            throw new Error(`Unexpected ${parsed.kind} fixture: ${fixture.id}`);
          const scene = layoutExtendedUml(parsed, measure, { fontSize })!;
          const plan = (type.type === "c4" ? c4Motion : usecaseMotion)(scene);
          const owned = [
            ...plan.staticPrimitives,
            ...plan.layers.flatMap((layer) => layer.primitives),
            ...plan.numbers.map((entry) => entry.primitive),
          ];
          expect(owned.length).toBe(scene.primitives.length);
          expect(new Set(owned).size).toBe(scene.primitives.length);
          expect(plan.layers.length).toBeLessThanOrEqual(12);
          for (const node of parsed.ir.nodes)
            expect(
              scene.primitives.some(
                (primitive) =>
                  primitive.semantic?.kind === "node" && primitive.semantic.id === node.id,
              ),
              `${fixture.id}: missing semantic node ${node.id}`,
            ).toBe(true);
          for (const layer of plan.layers) {
            expect(layer.bounds.width).toBeGreaterThan(0);
            expect(layer.bounds.height).toBeGreaterThan(0);
            for (const primitive of layer.primitives) {
              if (primitive.type === "path") {
                for (const point of primitive.points) {
                  expect(point.x).toBeGreaterThanOrEqual(layer.bounds.x);
                  expect(point.y).toBeGreaterThanOrEqual(layer.bounds.y);
                  expect(point.x).toBeLessThanOrEqual(layer.bounds.x + layer.bounds.width);
                  expect(point.y).toBeLessThanOrEqual(layer.bounds.y + layer.bounds.height);
                }
              } else {
                expect(primitive.x).toBeGreaterThanOrEqual(layer.bounds.x);
                expect(primitive.y).toBeGreaterThanOrEqual(layer.bounds.y);
                expect(primitive.x + primitive.width).toBeLessThanOrEqual(
                  layer.bounds.x + layer.bounds.width,
                );
                expect(primitive.y + primitive.height).toBeLessThanOrEqual(
                  layer.bounds.y + layer.bounds.height,
                );
              }
            }
          }
          for (const primitive of scene.primitives) {
            const semantic = primitive.semantic;
            if (
              semantic?.kind === "frame" ||
              (type.type === "usecase" && semantic?.role === "actor")
            )
              expect(plan.staticPrimitives.includes(primitive)).toBe(true);
            if (semantic?.kind === "edge" && primitive.type === "path")
              expect(
                plan.layers.some(
                  (layer) => layer.mode === "trace" && layer.primitives.includes(primitive),
                ),
              ).toBe(true);
            if (primitive.type === "text") {
              const metrics = measure(primitive.text, {
                fontSize: primitive.fontSize,
                fontWeight: primitive.fontWeight,
                maxWidth: primitive.width,
                literal: primitive.literal,
              });
              expect(metrics.height, `${fixture.id}: ${primitive.text}`).toBeLessThanOrEqual(
                primitive.height + 0.5,
              );
              expect(primitive.x).toBeGreaterThanOrEqual(scene.bounds.x);
              expect(primitive.y).toBeGreaterThanOrEqual(scene.bounds.y);
              expect(primitive.x + primitive.width).toBeLessThanOrEqual(
                scene.bounds.x + scene.bounds.width,
              );
              expect(primitive.y + primitive.height).toBeLessThanOrEqual(
                scene.bounds.y + scene.bounds.height,
              );
            }
          }
        }
  } finally {
    fonts.dispose();
  }
}, 60000);
