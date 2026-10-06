import { expect, test } from "bun:test";
import CanvasKitInit from "canvaskit-wasm/bin/full/canvaskit.js";
import { JsiSkApi } from "react-native-skia/lib/module/skia/web/JsiSkia.js";
import catalog from "./fixtures/official-mermaid/catalog.json" with { type: "json" };
import { loadQaFonts } from "./font-provider.ts";
import { parseDiagramAsync, layoutDiagram, lightTheme } from "../src/index.ts";
import { createSkiaTextMeasurer } from "../src/render/skia.ts";
import { sequenceMotion } from "../src/react/motion-policies/sequence.ts";
import { zenumlMotion } from "../src/react/motion-policies/zenuml.ts";

test("sequence lifecycle, nested frames and ZenUML control flow retain native text", async () => {
  const kit = await CanvasKitInit({
    locateFile: (file: string) =>
      `${import.meta.dir}/../node_modules/canvaskit-wasm/bin/full/${file}`,
  });
  const api = JsiSkApi(kit),
    fonts = await loadQaFonts(api);
  try {
    for (const type of catalog.types.filter((type) =>
      ["sequenceDiagram", "zenuml"].includes(type.type),
    ))
      for (const fixture of type.cases.filter((fixture) =>
        [
          "sequenceDiagram/016",
          "sequenceDiagram/017",
          "sequenceDiagram/024",
          "sequenceDiagram/033",
          "sequenceDiagram/038",
          "zenuml/008",
          "zenuml/012",
          "zenuml/016",
        ].includes(fixture.id),
      ))
        for (const fontSize of [14, 24]) {
          const theme = { ...lightTheme, fontSize, fontFamily: "QA,QACJK" };
          const measure = createSkiaTextMeasurer(api, theme, fonts.provider);
          const scene = layoutDiagram(await parseDiagramAsync(fixture.source), measure, {
            fontSize,
          });
          const plan = (scene.kind === "sequence" ? sequenceMotion : zenumlMotion)(scene);
          const owned = [
            ...plan.staticPrimitives,
            ...plan.layers.flatMap((layer) => layer.primitives),
            ...plan.numbers.map((number) => number.primitive),
          ];
          expect(new Set(owned).size, fixture.id).toBe(scene.primitives.length);
          expect(owned.length, fixture.id).toBe(scene.primitives.length);
          expect(plan.layers.length).toBeLessThanOrEqual(12);
          const createdHeaders = scene.primitives.filter(
            (primitive) =>
              primitive.type === "shape" &&
              primitive.semantic?.role === "participant" &&
              (primitive.semantic.row ?? -1) >= 0,
          );
          for (const label of scene.primitives)
            if (label.type === "text" && label.semantic?.role === "message")
              for (const header of createdHeaders)
                if (header.type === "shape" && label.semantic.row === header.semantic?.row) {
                  const overlapX =
                    Math.min(label.x + label.width, header.x + header.width) -
                    Math.max(label.x, header.x);
                  const overlapY =
                    Math.min(label.y + label.height, header.y + header.height) -
                    Math.max(label.y, header.y);
                  expect(
                    overlapX <= 0.5 || overlapY <= 0.5,
                    `${fixture.id}: created participant intersects ${label.text}`,
                  ).toBe(true);
                }
          for (const primitive of scene.primitives) {
            if (primitive.semantic?.role === "message" && primitive.type === "path")
              expect(
                plan.layers.some(
                  (layer) => layer.mode === "trace" && layer.primitives.includes(primitive),
                ),
                fixture.id,
              ).toBe(true);
            if (primitive.semantic?.role === "lifeline")
              expect(plan.staticPrimitives.includes(primitive), fixture.id).toBe(true);
          }
          for (const primitive of scene.primitives)
            if (primitive.type === "text") {
              const metrics = measure(primitive.text, {
                fontSize: primitive.fontSize,
                fontWeight: primitive.fontWeight,
                maxWidth: primitive.width + 1,
              });
              expect(
                metrics.height,
                `${fixture.id} font ${fontSize}: ${primitive.text}`,
              ).toBeLessThanOrEqual(primitive.height + 0.5);
              expect(primitive.x + primitive.width).toBeLessThanOrEqual(
                scene.bounds.x + scene.bounds.width + 0.5,
              );
              expect(primitive.y + primitive.height).toBeLessThanOrEqual(
                scene.bounds.y + scene.bounds.height + 0.5,
              );
            }
        }
  } finally {
    fonts.dispose();
  }
});

test("sequence trace preserves reply direction and activation and note phases", async () => {
  const scene = layoutDiagram(
    await parseDiagramAsync(
      "sequenceDiagram\nparticipant Client\nparticipant API\nClient->>+API: Request\nNote over API: Validate request\nAPI-->>-Client: Response",
    ),
  );
  const plan = sequenceMotion(scene);
  const messagePaths = scene.primitives.filter(
    (primitive) => primitive.type === "path" && primitive.semantic?.role === "message",
  );
  expect(messagePaths).toHaveLength(2);
  if (messagePaths[1].type !== "path") throw new Error("Expected reply path");
  expect(messagePaths[1].points[0].x).toBeGreaterThan(messagePaths[1].points.at(-1)!.x);
  const traces = plan.layers.filter((layer) => layer.mode === "trace");
  expect(traces).toHaveLength(2);
  expect(traces[1].delay).toBeGreaterThan(traces[0].delay);
  const note = plan.layers.find((layer) =>
    layer.primitives.some((primitive) => primitive.semantic?.role === "note"),
  )!;
  expect(note.delay).toBeGreaterThan(traces[0].delay + traces[0].span!);
  const activation = plan.layers.find((layer) =>
    layer.primitives.some((primitive) => primitive.semantic?.role === "activation"),
  )!;
  expect(activation.delay).toBeGreaterThanOrEqual(traces[0].delay + traces[0].span!);
  expect(
    plan.staticPrimitives.filter((primitive) => primitive.semantic?.role === "lifeline"),
  ).toHaveLength(2);
});
