import { expect, test } from "bun:test";
import {
  mergeThemeOverrides,
  resolveColor,
  resolveDiagramTheme,
  lightTheme,
} from "../src/render/theme.ts";

test("nested host overrides retain sibling geometry and do not mutate provider objects", () => {
  const parent = {
    accent: "#123456",
    layout: {
      padding: 28,
      typeStyles: { sequence: { laneGap: 180, rowGap: 32 }, pie: { diameter: 240 } },
    },
    lineWeights: { edge: 2, node: 1 },
  };
  const child = {
    layout: { typeStyles: { sequence: { rowGap: 48 } } },
    lineWeights: { node: 0.8 },
  };
  const before = JSON.stringify([parent, child]);
  const merged = mergeThemeOverrides(parent, child);
  expect(merged).toMatchObject({
    accent: "#123456",
    layout: {
      padding: 28,
      typeStyles: { sequence: { laneGap: 180, rowGap: 48 }, pie: { diameter: 240 } },
    },
    lineWeights: { edge: 2, node: 0.8 },
  });
  expect(JSON.stringify([parent, child])).toBe(before);
  expect(mergeThemeOverrides(parent)).toBe(parent);
});
test("soft category surfaces are independently overridable and fall back for older themes", () => {
  const theme = resolveDiagramTheme({ paletteFill: ["#abcdef"] });
  expect(resolveColor("paletteFill:3", "red", theme)).toBe("#abcdef");
  expect(resolveColor("paletteFill:1", "red", { ...lightTheme, paletteFill: undefined })).toBe(
    lightTheme.nodeFill,
  );
});

test("non-finite host geometry tokens fall back to the selected theme", () => {
  const theme = resolveDiagramTheme({
    fontSize: NaN,
    strokeWidth: Infinity,
    radius: -Infinity,
    arrowSize: NaN,
  });
  expect(theme.fontSize).toBe(lightTheme.fontSize);
  expect(theme.strokeWidth).toBe(lightTheme.strokeWidth);
  expect(theme.radius).toBe(lightTheme.radius);
  expect(theme.arrowSize).toBe(lightTheme.arrowSize);
});

test("authored XY palette inherits through partial host overrides and explicit host palette wins", async () => {
  const { readDiagramThemeDirective } = await import("../src/react/theme-directive.ts");
  const { officialCatalog } = await import("../example/official-fixtures.ts");
  const { parseDiagram, layoutDiagram, estimateText } = await import("../src/index.ts");
  const source = officialCatalog.types.find((type) => type.type === "xyChart")!.cases[2].source;
  const directive = readDiagramThemeDirective(source);
  const colors = ["#000000", "#0000FF", "#00FF00", "#FF0000"];
  expect(resolveDiagramTheme(undefined, "light", directive).palette).toEqual(colors);
  const partial = resolveDiagramTheme(
    { fontSize: 24, layout: { padding: 28 } },
    "light",
    directive,
  );
  expect(partial.palette).toEqual(colors);
  expect(partial.fontSize).toBe(24);
  expect(partial.layout?.padding).toBe(28);
  const provider = mergeThemeOverrides(
    { palette: ["#abcdef"], layout: { padding: 30 } },
    { radius: 12 },
  );
  expect(resolveDiagramTheme(provider, "light", directive).palette).toEqual(["#abcdef"]);
  const scene = layoutDiagram(parseDiagram(source), estimateText);
  const seriesColors = new Set(
    scene.primitives.flatMap((p) =>
      p.type === "shape"
        ? [p.fill]
        : p.type === "path" && p.strokeRole === "series"
          ? [p.stroke]
          : [],
    ),
  );
  for (let index = 0; index < 4; index++) expect(seriesColors.has(`palette:${index}`)).toBe(true);
});
