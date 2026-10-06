import {
  Skia,
  type SkFont,
  type SkPicture,
  type SkPath,
  type SkTypefaceFontProvider,
} from "react-native-skia";
import type { Scene } from "../types.ts";
import { renderToPicture, type NativeRenderAssets } from "../render/skia.ts";
import { tracePaths } from "./trace-motion-plan.ts";
import { recordNativeTraces } from "./native-trace.tsx";
import { motionBounds } from "./motion-policy.ts";
import { createNumericFallbacks, numericTiming } from "./numeric-motion-timing.ts";
import { textRuns } from "../render/text.ts";
import { resolveColor, type DiagramTheme } from "../render/theme.ts";
import {
  createPrimitiveMotionPlan,
  type NumericMotion,
  type PrimitiveMotionLayer,
} from "./primitive-motion-plan.ts";

export interface RecordedMotion {
  staticPicture: SkPicture;
  layers: (Omit<PrimitiveMotionLayer, "primitives"> & {
    picture?: SkPicture;
    markerPicture?: SkPicture;
    traces?: ReturnType<typeof recordNativeTraces>["traces"];
  })[];
  numbers: (NumericMotion & {
    font: SkFont;
    color: string;
    baseline: number;
    delay: number;
    span: number;
  })[];
  resources: (SkPicture | SkFont | SkPath)[];
}
/** Allocate once per recording. Every failure disposes the partial bundle. */
export function recordDiagramMotion(
  scene: Scene,
  theme: DiagramTheme,
  fonts?: SkTypefaceFontProvider,
  assets?: NativeRenderAssets,
): RecordedMotion {
  const plan = createPrimitiveMotionPlan(scene);
  const resources: RecordedMotion["resources"] = [];
  try {
    const numbers: RecordedMotion["numbers"] = [];
    const fallbacks = createNumericFallbacks();
    for (const number of plan.numbers) {
      const p = number.primitive;
      const { delay, span } = numericTiming(number);
      if (
        (p.fontWeight ?? 400) >= 500 ||
        p.fontStyle === "italic" ||
        p.textOutline ||
        (p.lineRuns?.length ?? 0) > 1 ||
        p.lineRuns?.some((line) => line.some((run) => run.bold || run.italic)) ||
        (!p.literal && textRuns(p.text).some((run) => run.bold || run.italic))
      ) {
        fallbacks.add(number, { delay, span });
        continue;
      }
      let typeface;
      try {
        typeface = fonts?.matchFamilyStyle(theme.fontFamily.split(",")[0].trim(), {
          weight: p.fontWeight ?? 400,
          width: 5,
          slant: 0,
        });
      } catch {
        /* Host may not register this family: retain the exact recorded label. */
      }
      if (!typeface) {
        fallbacks.add(number, { delay, span });
        continue;
      }
      const font = Skia.Font(typeface, p.fontSize);
      resources.push(font);
      numbers.push({
        ...number,
        delay,
        span,
        font,
        color: resolveColor(p.color, theme.nodeText, theme),
        baseline: p.y + (p.lineBaselines?.[0] ?? -font.getMetrics().ascent),
      });
    }
    for (const fallback of fallbacks.finish())
      plan.layers.push({
        mode: "fade",
        primitives: fallback.primitives,
        delay: fallback.delay,
        span: Math.min(fallback.span, 1 - fallback.delay),
        bounds: motionBounds(fallback.primitives, scene.bounds),
      });
    const staticPicture = renderToPicture(
      Skia,
      { ...scene, primitives: plan.staticPrimitives },
      theme,
      fonts,
      assets,
    );
    resources.push(staticPicture);
    let tracedPaths = 0;
    const layers: RecordedMotion["layers"] = plan.layers.map((layer) => {
      const { primitives: _primitives, ...descriptor } = layer;
      const paths = tracePaths(layer, tracedPaths);
      if (paths) {
        const recording = recordNativeTraces(paths, theme);
        resources.push(...recording.resources);
        tracedPaths += paths.length;
        let markerPicture: SkPicture | undefined;
        if (paths.some((p) => (p.start && p.start !== "none") || (p.end && p.end !== "none"))) {
          markerPicture = renderToPicture(
            Skia,
            { ...scene, primitives: paths },
            theme,
            fonts,
            assets,
            {
              drawBackground: false,
              markerOnly: true,
            },
          );
          resources.push(markerPicture);
        }
        return { ...descriptor, traces: recording.traces, markerPicture };
      }
      const primitives =
        layer.mode === "draw-x" || layer.mode === "draw-y"
          ? layer.primitives.map((p) =>
              p.type === "path" ? { ...p, start: undefined, end: undefined } : p,
            )
          : layer.primitives;
      const picture = renderToPicture(Skia, { ...scene, primitives }, theme, fonts, assets, {
        drawBackground: false,
      });
      resources.push(picture);
      // Filled/mixed/large layers retain every authored primitive with a bounded fade.
      return {
        ...descriptor,
        ...(layer.mode === "trace" ? { mode: "fade" as const } : {}),
        picture,
      };
    });
    return { staticPicture, layers, numbers, resources };
  } catch (error) {
    for (const resource of resources) resource.dispose();
    throw error;
  }
}
