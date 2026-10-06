import { expect, test } from "bun:test";
import CanvasKitInit from "canvaskit-wasm/bin/full/canvaskit.js";
import { JsiSkApi } from "react-native-skia/lib/module/skia/web/JsiSkia.js";
import {
  createNativeStrokePathWithApi,
  recordNativeTracesWithApi,
  type TracePrimitive,
} from "../src/react/native-trace-core.ts";
import { lightTheme } from "../src/render/theme.ts";
import { renderToPicture } from "../src/render/skia.ts";
const kit = await CanvasKitInit({
  locateFile: (file: string) =>
    `${import.meta.dir}/../node_modules/canvaskit-wasm/bin/full/${file}`,
});
const api = JsiSkApi(kit);
const elbow: TracePrimitive = {
  type: "path",
  points: [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
  ],
  stroke: "edgeStroke",
};

test("native trim follows route length around an elbow instead of revealing a rectangle", () => {
  const path = createNativeStrokePathWithApi(api, elbow, lightTheme);
  const half = api.Path.Trim(path, 0, 0.5, false)!,
    late = api.Path.Trim(path, 0, 0.75, false)!;
  try {
    expect(half.getLastPt()).toEqual({ x: 100, y: 0 });
    expect(late.getLastPt()).toEqual({ x: 100, y: 50 });
    expect(path.getLastPt()).toEqual({ x: 100, y: 100 });
    expect(path.countPoints()).toBe(3);
  } finally {
    half.dispose();
    late.dispose();
    path.dispose();
  }
});

test("trace cubic, smooth, closed and hollow-marker shafts equal the production recording", () => {
  const cases: TracePrimitive[] = [
    { ...elbow, start: "hollow-triangle", end: "hollow-diamond" },
    { ...elbow, smooth: true },
    { ...elbow, closed: true },
    {
      type: "path",
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 100 },
      ],
      curves: [{ control1: { x: 50, y: 0 }, control2: { x: 50, y: 100 }, end: { x: 100, y: 100 } }],
      start: "hollow-triangle",
      end: "hollow-triangle",
    },
  ];
  for (const primitive of cases) {
    const captured: string[] = [];
    const recordingApi = {
      ...api,
      PathBuilder: {
        ...api.PathBuilder,
        Make: () => {
          const builder = api.PathBuilder.Make();
          return new Proxy(builder, {
            get(target, key) {
              if (key === "detach")
                return () => {
                  const path = target.detach();
                  captured.push(path.toSVGString());
                  return path;
                };
              const value: unknown = Reflect.get(target, key);
              return typeof value === "function" ? value.bind(target) : value;
            },
          });
        },
      },
    };
    const picture = renderToPicture(
      recordingApi,
      {
        kind: "flowchart",
        accessibilityLabel: "Native trace geometry regression",
        bounds: { x: 0, y: 0, width: 120, height: 120 },
        primitives: [primitive],
      },
      lightTheme,
      undefined,
      undefined,
      { drawBackground: false },
    );
    const path = createNativeStrokePathWithApi(api, primitive, lightTheme);
    try {
      expect(path.toSVGString()).toBe(captured[0]!);
      expect(path.isEmpty()).toBe(false);
    } finally {
      path.dispose();
      picture.dispose();
    }
  }
});

test("trace paint preserves theme roles, dash repetition, opacity and sorted gradient stops", () => {
  const primitive: TracePrimitive = {
    ...elbow,
    stroke: "palette:1",
    strokeRole: "edge",
    opacity: 0.4,
    dash: [3, 2, 1],
    gradient: {
      from: { x: 0, y: 0 },
      to: { x: 100, y: 100 },
      stops: [
        { offset: 1, color: "palette:2" },
        { offset: 0, color: "palette:0" },
      ],
    },
  };
  const theme = { ...lightTheme, strokeWidth: 2, lineWeights: { edge: 1.5 } };
  const bundle = recordNativeTracesWithApi(api, [primitive], theme);
  try {
    expect(bundle.resources).toHaveLength(1);
    expect(bundle.traces[0]!.width).toBe(3);
    expect(bundle.traces[0]!.color).toBe(theme.palette[1]!);
    expect(bundle.traces[0]!.opacity).toBe(0.4);
    expect(bundle.traces[0]!.dash).toEqual([3, 2, 1, 3, 2, 1]);
    expect(bundle.traces[0]!.gradient?.positions).toEqual([0, 1]);
    expect(bundle.traces[0]!.gradient?.colors).toEqual([theme.palette[0]!, theme.palette[2]!]);
    expect(primitive.gradient!.stops[0]!.offset).toBe(1);
    expect(primitive.dash).toEqual([3, 2, 1]);
  } finally {
    bundle.resources.forEach((resource) => resource.dispose());
  }
});

test("invalid recording disposes both path builders and all previously allocated shafts", () => {
  let pathsDisposed = 0,
    buildersDisposed = 0;
  const trackedApi = {
    PathBuilder: {
      ...api.PathBuilder,
      Make: () => {
        const builder = api.PathBuilder.Make();
        return new Proxy(builder, {
          get(target, key) {
            if (key === "dispose")
              return () => {
                buildersDisposed++;
                target.dispose();
              };
            if (key === "detach")
              return () =>
                new Proxy(target.detach(), {
                  get(path, field) {
                    if (field === "dispose")
                      return () => {
                        pathsDisposed++;
                        path.dispose();
                      };
                    const value: unknown = Reflect.get(path, field);
                    return typeof value === "function" ? value.bind(path) : value;
                  },
                });
            const value: unknown = Reflect.get(target, key);
            return typeof value === "function" ? value.bind(target) : value;
          },
        });
      },
    },
  };
  expect(() =>
    recordNativeTracesWithApi(
      trackedApi,
      [elbow, { ...elbow, points: [{ x: NaN, y: 0 }] }],
      lightTheme,
    ),
  ).toThrow("finite nonempty");
  expect(pathsDisposed).toBe(1);
  expect(buildersDisposed).toBe(1);
  expect(() =>
    recordNativeTracesWithApi(api, [{ ...elbow, closed: true, fill: "accent" }], lightTheme),
  ).toThrow("Filled paths");
  expect(() => recordNativeTracesWithApi(api, [{ ...elbow, dash: [2, -1] }], lightTheme)).toThrow(
    "finite and nonnegative",
  );
});
