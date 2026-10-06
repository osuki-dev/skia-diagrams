import { expect, test } from "bun:test";
import CanvasKitInit from "canvaskit-wasm/bin/full/canvaskit.js";
import { JsiSkApi } from "react-native-skia/lib/module/skia/web/JsiSkia.js";
import { detailedFixtures } from "../example/fixture-cases.ts";
import { designFixtures } from "../example/design-fixtures.ts";
import { styleEdgeFixtures } from "../example/style-edge-fixtures.ts";
import { cjkCases } from "../example/cjk-fixtures.ts";
import { readThemeOverrides } from "../example/theme-editor.ts";
import {
  layoutDiagram,
  parseDiagram,
  lightTheme,
  darkTheme,
  renderToSvg,
  type DiagramKind,
  type LayoutOptions,
} from "../src/index.ts";
import { createSkiaTextMeasurer } from "../src/render/skia.ts";
import { resolveStrokeWidth, resolveColor } from "../src/render/theme.ts";
import { loadQaFonts } from "./font-provider.ts";

test("approved specimens cover every supported kind and model table structure stays legible", () => {
  const kinds = new Set(
    Object.values(designFixtures).map((source) => layoutDiagram(parseDiagram(source)).kind),
  );
  expect(kinds.size).toBe(13);
  const er = layoutDiagram(parseDiagram(designFixtures.ER));
  expect(
    er.primitives
      .filter((p) => p.type === "text" && (p.text === "PK" || p.text === "FK"))
      .every((p) => p.type === "text" && p.fontWeight === 600 && p.color === "nodeText"),
  ).toBe(true);
  expect(
    er.primitives.filter(
      (p) => p.type === "path" && p.stroke === "gridStroke" && p.strokeRole === "grid",
    ),
  ).toHaveLength(11);
  const sequence = layoutDiagram(parseDiagram(designFixtures.Sequence));
  expect(
    sequence.primitives.filter(
      (p) =>
        p.type === "shape" &&
        ["headerFill", "paletteFill:1", "paletteFill:2"].includes(p.fill ?? ""),
    ),
  ).toHaveLength(3);
});

test("all thirteen redesigned types use distinct neutral/data/connection roles", () => {
  const kinds = new Set<DiagramKind>();
  for (const [name, source] of Object.entries(detailedFixtures)) {
    const scene = layoutDiagram(parseDiagram(source));
    kinds.add(scene.kind);
    expect(scene.primitives.some((p) => p.type === "text" && p.fontSize >= 14)).toBe(true);
    expect(scene.primitives.some((p) => p.type !== "text" && p.strokeRole)).toBe(true);
    expect(renderToSvg(scene)).not.toMatch(/<filter|linearGradient|radialGradient|Times/i);
    if (["Timeline", "Journey", "Mindmap"].includes(name))
      expect(
        scene.primitives.some(
          (p) => p.type === "shape" && p.fill?.startsWith("palette:") && p.shape !== "circle",
        ),
      ).toBe(false);
    if (["Class", "ER"].includes(name)) {
      expect(scene.primitives.some((p) => p.type === "shape" && p.id && p.shape === "round")).toBe(
        true,
      );
      expect(scene.primitives.some((p) => p.type === "text" && p.fontWeight === 600)).toBe(true);
    }
    if (name === "Pie") {
      const slices = scene.primitives.filter((p) => p.type === "sector");
      const legend = scene.primitives.find((p) => p.type === "shape" && p.shape === "round");
      expect(slices).toHaveLength(3);
      if (!legend || legend.type !== "shape") throw new Error("Missing pie legend");
      expect(legend.x).toBeGreaterThan(
        Math.max(...slices.map((p) => (p.type === "sector" ? p.x + p.width : 0))),
      );
    }
  }
  expect(kinds.size).toBe(13);
});

test("selectable native marker/boundary cases retain all important conventional terminals", () => {
  const paths = Object.values(styleEdgeFixtures).flatMap((source) =>
    layoutDiagram(parseDiagram(source)).primitives.filter((p) => p.type === "path"),
  );
  const markers = new Set(paths.flatMap((p) => (p.type === "path" ? [p.start, p.end] : [])));
  for (const marker of [
    "hollow-triangle",
    "hollow-diamond",
    "diamond",
    "arrow",
    "open",
    "cross",
    "er-one",
    "er-zero-one",
    "er-one-many",
    "er-zero-many",
  ] as const)
    expect(markers.has(marker)).toBe(true);
});

test("role widths and colors remain optional and explicit authored styles win", () => {
  expect(resolveStrokeWidth({ strokeRole: "edge" }, lightTheme)).toBe(1.5);
  expect(resolveStrokeWidth({ strokeRole: "node" }, lightTheme)).toBe(1.25);
  expect(resolveStrokeWidth({ strokeRole: "grid" }, lightTheme)).toBeLessThan(
    resolveStrokeWidth({ strokeRole: "edge" }, lightTheme),
  );
  expect(
    resolveStrokeWidth(
      { strokeRole: "node", strokeWidth: 3 },
      { ...lightTheme, lineWeights: { node: 0.2 } },
    ),
  ).toBe(3);
  const {
    lineWeights: _lineWeights,
    headerFill: _headerFill,
    headerText: _headerText,
    mutedText: _mutedText,
    gridStroke: _gridStroke,
    ...legacy
  } = lightTheme;
  expect(resolveStrokeWidth({ strokeRole: "node" }, legacy)).toBe(legacy.strokeWidth);
  expect(resolveColor("headerFill", "none", legacy)).toBe(legacy.clusterFill);
  expect(resolveColor("gridStroke", "none", legacy)).toBe(legacy.clusterStroke);
  const scene = layoutDiagram(
    parseDiagram(
      "flowchart LR\nA[Custom]-->B[Other]\nstyle A fill:#abcdef,stroke:#123456,color:#111111,stroke-width:4px\nlinkStyle 0 stroke:#334455,stroke-width:3px",
    ),
  );
  const node = scene.primitives.find((p) => p.type === "shape" && p.id === "A");
  expect(node).toMatchObject({ fill: "#abcdef", stroke: "#123456", strokeWidth: 4 });
  expect(renderToSvg(scene, { ...lightTheme, lineWeights: { node: 0.2, edge: 2 } })).toContain(
    'stroke="#123456" stroke-width="4"',
  );
  expect(renderToSvg(scene)).toContain('stroke="#334455" stroke-width="3"');
});

test("per-type geometry tokens change their own layout without changing other types", () => {
  const styles: NonNullable<LayoutOptions["typeStyles"]> = {
    flowchart: { minNodeWidth: 180 },
    sequence: { laneGap: 300 },
    class: { cellPaddingX: 30 },
    state: { nodePaddingX: 40 },
    er: { cellPaddingX: 30 },
    gantt: { plotWidth: 540 },
    pie: { diameter: 300 },
    gitgraph: { columnGap: 160 },
    mindmap: { radialGap: 240 },
    timeline: { cardWidth: 260 },
    journey: { cardWidth: 260 },
    quadrant: { plotSize: 420 },
    xychart: { plotWidth: 540 },
  };
  for (const source of Object.values(detailedFixtures)) {
    const before = layoutDiagram(parseDiagram(source));
    const after = layoutDiagram(parseDiagram(source), undefined, {
      typeStyles: { [before.kind]: styles[before.kind as keyof typeof styles] },
    });
    expect(after.bounds).not.toEqual(before.bounds);
    const unrelated = before.kind === "pie" ? "sequence" : "pie";
    expect(
      layoutDiagram(parseDiagram(source), undefined, {
        typeStyles: { [unrelated]: styles[unrelated] },
      }),
    ).toEqual(before);
  }
  expect(
    readThemeOverrides(
      '{"lineWeights":{"node":1,"series":1.9},"layout":{"titleScale":1.3,"typeStyles":{"pie":{"diameter":220},"er":{"cellPaddingX":14}}}}',
    ),
  ).toMatchObject({ layout: { typeStyles: { pie: { diameter: 220 } } } });
  for (const source of [
    '{"lineWeights":{"fake":2}}',
    '{"layout":{"typeStyles":{"pie":{"plotWidth":3}}}}',
    '{"layout":{"typeStyles":{"fake":{}}}}',
    '{"layout":{"typeStyles":{"pie":{"diameter":-1}}}}',
  ])
    expect(() => readThemeOverrides(source)).toThrow();
});

test("actual Paragraph replay respects redesigned measured text height in all thirteen types and regional titles", async () => {
  const kit = await CanvasKitInit({
      locateFile: (f) => `${import.meta.dir}/../node_modules/canvaskit-wasm/bin/full/${f}`,
    }),
    api = JsiSkApi(kit),
    fonts = await loadQaFonts(api);
  try {
    for (const base of [lightTheme, darkTheme])
      for (const source of Object.values(detailedFixtures)) {
        for (const sample of Object.values(cjkCases)) {
          const theme = { ...base, fontFamily: sample.family };
          const parsed = parseDiagram(source);
          if (parsed.kind === "error" || parsed.kind === "unsupported")
            throw new Error("Invalid redesign fixture");
          parsed.ir.title = sample.label;
          const scene = layoutDiagram(parsed, createSkiaTextMeasurer(api, theme, fonts.provider), {
            ...theme.layout,
            fontSize: theme.fontSize,
            radius: theme.radius,
          });
          for (const p of scene.primitives)
            if (p.type === "text") {
              const builder = api.ParagraphBuilder.Make(
                {
                  textStyle: {
                    fontSize: p.fontSize,
                    fontStyle: { weight: p.fontWeight ?? 400 },
                    fontFamilies: theme.fontFamily.split(","),
                  },
                },
                fonts.provider,
              );
              builder.addText(
                (p.lineRuns ?? [[{ text: p.text }]])
                  .map((line) => line.map((run) => run.text).join(""))
                  .join("\n"),
              );
              const paragraph = builder.build();
              builder.dispose();
              try {
                paragraph.layout(p.width + 1);
                expect(paragraph.getHeight()).toBeLessThanOrEqual(p.height + 0.01);
              } finally {
                paragraph.dispose();
              }
            }
        }
      }
  } finally {
    fonts.dispose();
  }
});

test("approved flowchart has the designed four stages and blue/green branch roles", () => {
  const scene = layoutDiagram(parseDiagram(designFixtures.Flowchart));
  expect(scene.primitives.filter((p) => p.type === "path")).toHaveLength(4);
  expect(scene.primitives.find((p) => p.type === "shape" && p.id === "B")).toMatchObject({
    fill: "paletteFill:1",
    stroke: "palette:1",
  });
  expect(scene.primitives.find((p) => p.type === "shape" && p.id === "D")).toMatchObject({
    fill: "paletteFill:2",
    stroke: "palette:2",
  });
});
test("vertical feedback keeps a separate orthogonal route and authored label color", () => {
  const scene = layoutDiagram(
    parseDiagram(
      "flowchart TD\nA([Start])-->B{Review}\nB-->|Yes|C([Done])\nB-->|No|A\nlinkStyle 2 stroke:accent",
    ),
  );
  const feedback = scene.primitives.find((p) => p.type === "path" && p.stroke === "accent");
  expect(feedback?.type === "path" && feedback.points.length).toBe(4);
  expect(feedback?.type === "path" && feedback.smooth).toBe(false);
  expect(
    scene.primitives.some((p) => p.type === "text" && p.text === "No" && p.color === "accent"),
  ).toBe(true);
});
