import { afterAll, beforeAll, expect, test } from "bun:test";
import CanvasKitInit from "canvaskit-wasm/bin/full/canvaskit.js";
import { JsiSkApi } from "react-native-skia/lib/module/skia/web/JsiSkia.js";
import { typographyFixtures } from "../example/typography-fixtures.ts";
import { layoutDiagram, parseDiagram, lightTheme } from "../src/index.ts";
import { createSkiaTextMeasurer, renderToPng } from "../src/render/skia.ts";
import { classMotion } from "../src/react/motion-policies/class.ts";
import { erMotion } from "../src/react/motion-policies/er.ts";
import { requirementMotion } from "../src/react/motion-policies/requirement.ts";
import { loadQaFonts } from "./font-provider.ts";
import catalog from "./fixtures/official-mermaid/catalog.json" with { type: "json" };

let api: ReturnType<typeof JsiSkApi>, fonts: Awaited<ReturnType<typeof loadQaFonts>>;
beforeAll(async () => {
  const kit = await CanvasKitInit({
    locateFile: (file) => `${import.meta.dir}/../node_modules/canvaskit-wasm/bin/full/${file}`,
  });
  api = JsiSkApi(kit);
  fonts = await loadQaFonts(api);
});
afterAll(() => fonts.dispose());
const sources = {
  Class: typographyFixtures.Class,
  ER: typographyFixtures.ER,
  Requirement: catalog.types.find((type) => type.type === "requirementDiagram")!.cases[0].source,
};
for (const [viewportWidth, fontSize] of [
  [320, 24],
  [375, 14],
] as const) {
  test(`table content stays complete at ${viewportWidth}px / ${fontSize}px`, async () => {
    const theme = { ...lightTheme, fontSize, fontFamily: "QA,QACJK" };
    const measure = createSkiaTextMeasurer(api, theme, fonts.provider);
    for (const [name, source] of Object.entries(sources)) {
      const scene = layoutDiagram(parseDiagram(source), measure, {
        viewportWidth,
        fontSize,
      });
      expect(scene.bounds.width).toBeLessThanOrEqual(viewportWidth);
      for (const primitive of scene.primitives) {
        if (primitive.type !== "text") continue;
        expect(primitive.text).not.toContain("…");
        expect(primitive.x).toBeGreaterThanOrEqual(scene.bounds.x);
        expect(primitive.x + primitive.width).toBeLessThanOrEqual(
          scene.bounds.x + scene.bounds.width + 1,
        );
        const metrics = measure(primitive.text, {
          fontSize: primitive.fontSize,
          fontWeight: primitive.fontWeight ?? 400,
          maxWidth: primitive.width + 1,
        });
        expect(metrics.height).toBeLessThanOrEqual(primitive.height + 1);
      }
      const plan = (name === "Class" ? classMotion : name === "ER" ? erMotion : requirementMotion)(
        scene,
      );
      const ownership = [
        ...plan.staticPrimitives,
        ...plan.layers.flatMap((layer) => layer.primitives),
        ...plan.numbers.map((item) => item.primitive),
      ];
      expect(ownership.length).toBe(scene.primitives.length);
      expect(new Set(ownership).size).toBe(scene.primitives.length);
      expect(plan.layers.some((layer) => layer.mode === "trace")).toBe(true);
      expect(plan.layers.filter((layer) => layer.mode !== "trace").length).toBeGreaterThan(1);
      if (name === "ER" && fontSize >= 18) {
        for (const primitive of scene.primitives) {
          if (
            primitive.type !== "text" ||
            ![
              "identifier",
              "display_name",
              "created_at",
              "account_identifier",
              "varchar",
              "datetime",
            ].includes(primitive.text)
          )
            continue;
          const rendered = primitive.lineRuns?.map((line) => line.map((run) => run.text).join(""));
          expect(rendered).toEqual([primitive.text]);
        }
      }
      if (process.env.SKIA_TABLE_PROOF_OUTPUT)
        await Bun.write(
          `${process.env.SKIA_TABLE_PROOF_OUTPUT}/${name}-${viewportWidth}-${fontSize}.png`,
          renderToPng(api, scene, theme, 1, fonts.provider),
        );
    }
  });
}

test("narrow cyclic table graphs preserve IDs, loops and readable cards", () => {
  const source =
    "classDiagram\nclass __proto__\nclass constructor\nclass Third\n__proto__ --> constructor : saves\nconstructor --> Third : returns\nThird --> __proto__ : repeats\nThird --> Third : retries";
  const parsed = parseDiagram(source);
  if (parsed.kind !== "class") throw new Error("Missing class graph");
  const scene = layoutDiagram(parsed, undefined, { viewportWidth: 375 });
  expect(
    scene.primitives
      .filter((p) => p.type === "shape" && p.id)
      .map((p) => p.type === "shape" && p.id),
  ).toContain("__proto__");
  expect(scene.primitives.filter((p) => p.type === "path" && p.end === "arrow")).toHaveLength(4);
  const cards = scene.primitives.filter((p) => p.type === "shape" && p.id);
  for (let index = 0; index < cards.length; index++)
    for (const other of cards.slice(index + 1)) {
      const card = cards[index];
      if (card.type !== "shape" || other.type !== "shape") continue;
      expect(card.y + card.height <= other.y || other.y + other.height <= card.y).toBe(true);
    }
  expect(scene.bounds.width).toBeLessThanOrEqual(375);
});

test("official Order ER has contained header-only fills and distinct relationship ports", async () => {
  const fixture = catalog.types
    .find((type) => type.type === "entityRelationshipDiagram")!
    .cases.find((fixture) => fixture.source.startsWith("---\ntitle: Order example\n---"))!;
  const theme = { ...lightTheme, fontFamily: "QA,QACJK" };
  const measure = createSkiaTextMeasurer(api, theme, fonts.provider);
  const scene = layoutDiagram(parseDiagram(fixture.source), measure, {
    viewportWidth: 375,
    fontSize: 14,
  });
  const frames = scene.primitives.filter((primitive) => primitive.type === "shape" && primitive.id);
  expect(frames).toHaveLength(4);
  for (const frame of frames) {
    if (frame.type !== "shape") continue;
    const fills = scene.primitives.filter(
      (primitive) =>
        primitive.type === "shape" &&
        primitive.semantic?.id === frame.id &&
        primitive.fill?.startsWith("paletteFill:"),
    );
    expect(fills).toHaveLength(1);
    const fill = fills[0];
    if (fill.type !== "shape") throw new Error("Missing entity header fill");
    expect(fill.y).toBeGreaterThanOrEqual(frame.y);
    expect(fill.y + fill.height).toBeLessThanOrEqual(frame.y + frame.height);
  }
  const relationships = scene.primitives.filter(
    (primitive) => primitive.type === "path" && primitive.semantic?.from === "CUSTOMER",
  );
  expect(relationships).toHaveLength(2);
  if (relationships[0].type !== "path" || relationships[1].type !== "path")
    throw new Error("Missing authored relationships");
  expect(Math.abs(relationships[0].points[0].y - relationships[1].points[0].y)).toBeGreaterThan(14);
  const captions = scene.primitives.filter(
    (primitive) => primitive.type === "text" && primitive.semantic?.from === "CUSTOMER",
  );
  expect(captions).toHaveLength(2);
  if (captions[0].type !== "text" || captions[1].type !== "text")
    throw new Error("Missing authored captions");
  expect(captions[0].y + captions[0].height).toBeLessThan(captions[1].y);
  const plan = erMotion(scene);
  expect(
    plan.layers
      .flatMap((layer) => layer.primitives)
      .some(
        (primitive) => primitive.type === "shape" && primitive.fill?.startsWith("paletteFill:"),
      ),
  ).toBe(false);
  if (process.env.SKIA_TABLE_PROOF_OUTPUT) {
    const phases = {
      start: plan.staticPrimitives,
      mid: [
        ...plan.staticPrimitives,
        ...plan.layers.filter((layer) => layer.delay < 0.3).flatMap((layer) => layer.primitives),
      ],
      final: scene.primitives,
    };
    for (const [phase, primitives] of Object.entries(phases))
      await Bun.write(
        `${process.env.SKIA_TABLE_PROOF_OUTPUT}/ER-order-375-14-${phase}.png`,
        renderToPng(api, { ...scene, primitives }, theme, 2, fonts.provider),
      );
  }
});
