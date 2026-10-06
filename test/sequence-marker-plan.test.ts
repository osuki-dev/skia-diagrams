import { expect, test } from "bun:test";
import type { Primitive } from "../src/types.ts";
import { parseDiagram, layoutDiagram } from "../src/index.ts";
import { createPrimitiveMotionPlan } from "../src/react/primitive-motion-plan.ts";

test("sequence endpoint markers belong to traced messages and destruction waits for arrival", () => {
  const scene = layoutDiagram(
    parseDiagram(
      "sequenceDiagram\nparticipant Alice\nparticipant John\nAlice->>John: Hello\nJohn-->>Alice: Great\ndestroy John\nAlice-xJohn: Finished",
    ),
  );
  const plan = createPrimitiveMotionPlan(scene);
  const marked = scene.primitives.filter(
    (primitive) => primitive.type === "path" && primitive.end && primitive.end !== "none",
  );
  expect(marked).toHaveLength(3);
  for (const primitive of marked) {
    expect(plan.staticPrimitives.includes(primitive)).toBe(false);
    expect(
      plan.layers.some((layer) => layer.mode === "trace" && layer.primitives.includes(primitive)),
    ).toBe(true);
  }
  const cross = scene.primitives.filter((primitive) => primitive.semantic?.role === "destruction");
  expect(cross).toHaveLength(2);
  const crossLayer = plan.layers.find((layer) => layer.primitives.includes(cross[0]))!;
  const closingMessage = marked[2];
  const messageLayer = plan.layers.find((layer) => layer.primitives.includes(closingMessage))!;
  expect(crossLayer.mode).toBe("fade");
  expect(crossLayer.delay).toBeGreaterThanOrEqual(messageLayer.delay + messageLayer.span!);
});

test("ZenUML nested sync arrows contact activation faces and numbering leaves measured clearance", async () => {
  const [
    { default: CanvasKitInit },
    { JsiSkApi },
    { loadQaFonts },
    { officialCatalog },
    { createSkiaTextMeasurer },
  ] = await Promise.all([
    import("canvaskit-wasm/bin/full/canvaskit.js"),
    import("react-native-skia/lib/module/skia/web/JsiSkia.js"),
    import("./font-provider.ts"),
    import("../example/official-fixtures.ts"),
    import("../src/render/skia.ts"),
  ]);
  const { parseDiagramAsync, lightTheme } = await import("../src/index.ts");
  const kit = await CanvasKitInit({
    locateFile: (file: string) =>
      `${import.meta.dir}/../node_modules/canvaskit-wasm/bin/full/${file}`,
  });
  const api = JsiSkApi(kit),
    fonts = await loadQaFonts(api);
  const fixture = officialCatalog.types
    .find((type) => type.type === "zenuml")!
    .cases.find((fixture) => fixture.id === "zenuml/005")!;
  try {
    for (const fontSize of [14, 24]) {
      const theme = { ...lightTheme, fontSize, fontFamily: "QA,QACJK" };
      const scene = layoutDiagram(
        await parseDiagramAsync(fixture.source),
        createSkiaTextMeasurer(api, theme, fonts.provider),
        { fontSize },
      );
      const activations = scene.primitives.filter(
        (primitive) => primitive.type === "shape" && primitive.semantic?.role === "activation",
      );
      const messages = scene.primitives.filter(
        (primitive) => primitive.type === "path" && primitive.semantic?.role === "message",
      );
      for (const message of messages)
        if (message.type === "path") {
          const activation = activations.find(
            (activation) =>
              activation.semantic?.row === message.semantic?.row &&
              activation.semantic?.group === message.semantic?.to,
          )!;
          if (activation.type !== "shape") throw new Error("Missing native activation");
          expect(message.points.at(-1)!.x).toBeCloseTo(activation.x, 5);
        }
      const scope = activations.find((activation) => activation.semantic?.row === 1)!;
      if (scope.type !== "shape") throw new Error("Missing scope activation");
      const nested = messages.find((message) => message.semantic?.row === 2)!;
      if (nested.type !== "path") throw new Error("Missing nested call");
      expect(nested.points[0].x).toBeCloseTo(scope.x + scope.width, 5);
      const label = scene.primitives.find(
        (primitive) => primitive.type === "text" && primitive.text === "nestedSyncMessage()",
      )!;
      const number = scene.primitives.find(
        (primitive) => primitive.type === "text" && primitive.text === "2.1",
      )!;
      if (label.type !== "text" || number.type !== "text")
        throw new Error("Missing measured call labels");
      expect(label.x).toBeGreaterThanOrEqual(scope.x + scope.width + 8);
      expect(number.x + number.width).toBeLessThanOrEqual(scope.x - 8);
      expect(label.fontSize).toBe(fontSize);
      const selfScene = layoutDiagram(
        parseDiagram(
          "sequenceDiagram\nautonumber\nparticipant A\nactivate A\nA->>+A: First nested call\nA->>+A: Second nested call\nA-->>-A: First return\nA-->>-A: Second return\ndeactivate A",
        ),
        createSkiaTextMeasurer(api, theme, fonts.provider),
        { fontSize },
      );
      const secondSelf = selfScene.primitives.find(
        (primitive) =>
          primitive.type === "path" &&
          primitive.semantic?.role === "message" &&
          primitive.semantic.row === 1,
      )!;
      const firstSelf = selfScene.primitives.find(
        (primitive): primitive is Extract<Primitive, { type: "path" }> =>
          primitive.type === "path" &&
          primitive.semantic?.role === "message" &&
          primitive.semantic.row === 0,
      );
      if (!firstSelf) throw new Error("Missing first self call");
      const priorSelfActivation = selfScene.primitives.find(
        (primitive) =>
          primitive.type === "shape" &&
          primitive.semantic?.role === "activation" &&
          primitive.semantic.row === 0 &&
          primitive.y === firstSelf.points.at(-1)!.y,
      )!;
      const nextSelfActivation = selfScene.primitives.find(
        (primitive) =>
          primitive.type === "shape" &&
          primitive.semantic?.role === "activation" &&
          primitive.semantic.row === 1,
      )!;
      if (
        secondSelf.type !== "path" ||
        priorSelfActivation.type !== "shape" ||
        nextSelfActivation.type !== "shape"
      )
        throw new Error("Missing nested self activations");
      expect(secondSelf.points[0].x).toBeCloseTo(
        priorSelfActivation.x + priorSelfActivation.width,
        5,
      );
      expect(secondSelf.points.at(-1)!.x).toBeCloseTo(
        nextSelfActivation.x + nextSelfActivation.width,
        5,
      );
      expect(secondSelf.points.at(-1)!.y).toBeCloseTo(nextSelfActivation.y, 5);
      const selfLabel = selfScene.primitives.find(
        (primitive) => primitive.type === "text" && primitive.text.includes("Second nested call"),
      )!;
      if (selfLabel.type !== "text") throw new Error("Missing numbered self label");
      expect(selfLabel.x).toBeGreaterThanOrEqual(
        priorSelfActivation.x + priorSelfActivation.width + 8,
      );
    }
  } finally {
    fonts.dispose();
  }
});
