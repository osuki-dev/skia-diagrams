import { validateNativeScene } from "./validate-scene.ts";
import { modernShapeContours } from "./flow-shapes.ts";
import type {
  Skia,
  SkCanvas,
  SkPicture,
  SkTypefaceFontProvider,
  SkTextStyle,
  SkPaint,
  SkImage,
} from "react-native-skia";
/** Host-decoded images are borrowed; the renderer never fetches or disposes them. */
export interface NativeRenderAssets {
  images?: ReadonlyMap<string, SkImage>;
}
// Only the renderer's actual factories are required; native view/recorder APIs are not.
type SkiaApi = Pick<
  typeof Skia,
  | "ParagraphBuilder"
  | "Paint"
  | "Color"
  | "PathBuilder"
  | "PathEffect"
  | "XYWHRect"
  | "RRectXY"
  | "PictureRecorder"
  | "Surface"
  | "Shader"
>;
import type { Point, Primitive, Scene, TextMeasurer } from "../types.ts";
import {
  markerGeometry,
  markerShaft,
  circleMarkerCenter,
  cylinderGeometry,
  shapePoints,
  curveSegments,
  cubicMarkerShaft,
  erMarkerGeometry,
} from "./geometry.ts";
import { resolveColor, resolveStrokeWidth, type DiagramTheme } from "./theme.ts";
import { textRuns, type TextRun } from "./text.ts";
function pathFor(
  api: SkiaApi,
  draw: (builder: ReturnType<SkiaApi["PathBuilder"]["Make"]>) => void,
) {
  const builder = api.PathBuilder.Make();
  try {
    draw(builder);
    return builder.detach();
  } finally {
    builder.dispose();
  }
}
function paragraphFor(
  api: SkiaApi,
  text: string,
  style: SkTextStyle,
  fonts?: SkTypefaceFontProvider,
  runs?: TextRun[],
  foreground?: SkPaint,
  literal = false,
) {
  const builder = api.ParagraphBuilder.Make({ textStyle: style }, fonts);
  try {
    const resolvedRuns = literal ? textRuns(text, true) : (runs ?? textRuns(text));
    if (!foreground && resolvedRuns.every((run) => !run.bold && !run.italic)) {
      // Plain labels already have the base Paragraph style. Avoid per-run JSI
      // style construction/push/pop in the recording hot path.
      builder.addText(resolvedRuns.map((run) => run.text).join(""));
    } else
      for (const run of resolvedRuns) {
        // CanvasKit pushStyle constructs a fresh TextStyle; explicitly repeat the
        // base families/size/color instead of losing host fonts on emphasis runs.
        builder.pushStyle(
          {
            ...style,
            fontStyle: {
              weight: run.bold ? 700 : (style.fontStyle?.weight ?? 400),
              slant: run.italic ? 1 : 0,
            },
          },
          foreground,
        );
        builder.addText(run.text);
        builder.pop();
      }
    return builder.build();
  } finally {
    // Native Skia 3.0.3's ParagraphBuilder lacks dispose despite its TS type;
    // native lifetime is JSI GC-owned. CanvasKit exposes explicit disposal.
    builder.dispose?.();
  }
}
/** Dependency injection permits CanvasKit goldens to execute the production renderer. */
export function createSkiaTextMeasurer(
  api: SkiaApi,
  theme: Pick<DiagramTheme, "fontFamily">,
  fonts?: SkTypefaceFontProvider,
): TextMeasurer {
  const cache = new Map<string, ReturnType<TextMeasurer>>();
  return (text, style) => {
    // SkParagraph.getLongestLine can return a negative float sentinel for empty text.
    if (!text) return { width: 0, height: style.fontSize * 1.4, lines: [""] };
    const key = JSON.stringify([text, style]);
    const hit = cache.get(key);
    if (hit) return hit;
    const paragraph = paragraphFor(
      api,
      text,
      {
        fontSize: style.fontSize,
        fontStyle: { weight: style.fontWeight ?? 400 },
        fontFamilies: (style.fontFamily ?? theme.fontFamily).split(",").map((name) => name.trim()),
      },
      fonts,
      undefined,
      undefined,
      style.literal,
    );
    try {
      paragraph.layout(style.maxWidth ?? 10000);
      const plain = textRuns(text, style.literal)
        .map((run) => run.text)
        .join("");
      const metrics = paragraph.getLineMetrics();
      const result = {
        width: Math.max(0, paragraph.getLongestLine()),
        height: paragraph.getHeight(),
        lineBaselines: metrics.map((line) => line.baseline),
        lines: metrics.map((line) =>
          plain.slice(line.startIndex, line.endIndex).replace(/\n$/, ""),
        ),
      };
      if (cache.size > 2000) cache.clear();
      cache.set(key, result);
      return result;
    } finally {
      paragraph.dispose();
    }
  };
}
export function drawScene(
  api: SkiaApi,
  canvas: SkCanvas,
  scene: Scene,
  theme: DiagramTheme,
  fonts?: SkTypefaceFontProvider,
  drawBackground = true,
  assets?: NativeRenderAssets,
  markerOnly = false,
): void {
  validateNativeScene(scene, theme);
  drawValidatedScene(api, canvas, scene, theme, fonts, drawBackground, assets, markerOnly);
}
function drawValidatedScene(
  api: SkiaApi,
  canvas: SkCanvas,
  scene: Scene,
  theme: DiagramTheme,
  fonts?: SkTypefaceFontProvider,
  drawBackground = true,
  assets?: NativeRenderAssets,
  markerOnly = false,
): void {
  const paint = api.Paint();
  const colors = new Map<string, ReturnType<SkiaApi["Color"]>>();
  let opacity = 1;
  const color = (value: string) => {
    const key = opacity === 1 ? value : `${value}:${opacity}`;
    let result = colors.get(key);
    if (result === undefined) {
      result = api.Color(value);
      if (opacity !== 1) {
        result = new Float32Array(result);
        result[3] *= opacity;
      }
      colors.set(key, result);
    }
    return result;
  };
  const shaders: ReturnType<SkiaApi["Shader"]["MakeLinearGradient"]>[] = [];
  let activeGradient: import("../types.ts").Style["gradient"] = undefined;
  const effects = new Map<string, ReturnType<SkiaApi["PathEffect"]["MakeDash"]>>();
  const dashEffect = (dash?: number[]) => {
    if (!dash?.length) return null;
    // SVG repeats odd dash arrays; native Skia requires an even interval count.
    const intervals = dash.length % 2 ? [...dash, ...dash] : dash;
    const key = intervals.join(",");
    let effect = effects.get(key);
    if (!effect) {
      effect = api.PathEffect.MakeDash(intervals, 0);
      if (effect) effects.set(key, effect);
    }
    return effect;
  };
  const fontFamilies = theme.fontFamily.split(",").map((name) => name.trim());
  try {
    paint.setAntiAlias(true);
    paint.setStrokeJoin(1);
    paint.setStrokeCap(1);
    // Picture cull bounds are not a clip. clear() ignores the host matrix and
    // can erase sibling content when this recording is transformed/replayed.
    // Its background must transform with the diagram, like every other primitive.
    if (drawBackground) {
      paint.setStyle(0);
      paint.setColor(color(theme.background));
      canvas.drawRect(
        api.XYWHRect(scene.bounds.x, scene.bounds.y, scene.bounds.width, scene.bounds.height),
        paint,
      );
    }
    const fillPaint = (value: string) => {
      paint.setStyle(0);
      paint.setShader(null);
      paint.setColor(color(value));
      if (activeGradient && activeGradient.stops.length >= 2) {
        const stops = activeGradient.stops.slice().sort((a, b) => a.offset - b.offset);
        const shader = api.Shader.MakeLinearGradient(
          activeGradient.from,
          activeGradient.to,
          stops.map((stop) => api.Color(resolveColor(stop.color, theme.nodeFill, theme))),
          stops.map((stop) => Math.max(0, Math.min(1, stop.offset))),
          0,
        );
        shaders.push(shader);
        paint.setColor(color("#FFFFFF"));
        paint.setShader(shader);
      }
    };
    const polygon = (
      points: Point[],
      closed: boolean,
      fill: string | undefined,
      stroke: string,
      width: number,
      dash?: number[],
      smooth = false,
      curves?: import("./geometry.ts").CubicSegment[],
    ) => {
      if (!points.length) return;
      const path = pathFor(api, (builder) => {
        builder.moveTo(points[0].x, points[0].y);
        if (curves || smooth)
          for (const segment of curves ?? curveSegments(points))
            builder.cubicTo(
              segment.control1.x,
              segment.control1.y,
              segment.control2.x,
              segment.control2.y,
              segment.end.x,
              segment.end.y,
            );
        else for (const point of points.slice(1)) builder.lineTo(point.x, point.y);
        if (closed) builder.close();
      });
      try {
        paint.setPathEffect(null);
        if (fill && fill !== "none") {
          fillPaint(fill);
          canvas.drawPath(path, paint);
        }
        if (width > 0) {
          paint.setShader(null);
          paint.setStyle(1);
          paint.setColor(color(stroke));
          paint.setStrokeWidth(width);
          const effect = dashEffect(dash);
          paint.setPathEffect(effect);
          try {
            canvas.drawPath(path, paint);
          } finally {
            paint.setPathEffect(null);
          }
        }
      } finally {
        path.dispose();
      }
    };
    for (const p of scene.primitives) {
      activeGradient = p.gradient;
      paint.setShader(null);
      opacity =
        p.opacity === undefined || !Number.isFinite(p.opacity)
          ? 1
          : Math.max(0, Math.min(1, p.opacity));
      if (p.type === "image") {
        const image = assets?.images?.get(p.asset);
        if (!image) throw new Error(`Missing host image asset: ${p.asset}`);
        paint.setStyle(0);
        paint.setPathEffect(null);
        paint.setColor(color("#FFFFFF"));
        canvas.drawImageRect(
          image,
          api.XYWHRect(0, 0, image.width(), image.height()),
          api.XYWHRect(p.x, p.y, p.width, p.height),
          paint,
        );
        continue;
      }
      if (p.type === "sector") {
        const inner = Math.max(0, Math.min(p.radius, p.innerRadius ?? 0));
        const width = resolveStrokeWidth(p, theme);
        const full = Math.abs(p.sweepAngle) >= Math.PI * 2 - 1e-6;
        // The GPU path tessellator can quantize circular edges to four coverage
        // samples. A circle uses Skia's analytic oval coverage instead. Angular
        // clipping extends well beyond the circle, so it cannot roughen that arc.
        const wedge = full
          ? undefined
          : pathFor(api, (builder) => {
              const extent = p.radius * 4 + width * 2;
              const steps = Math.max(1, Math.ceil(Math.abs(p.sweepAngle) / (Math.PI / 4)));
              builder.moveTo(p.cx, p.cy);
              for (let i = 0; i <= steps; i++) {
                const angle = p.startAngle + (p.sweepAngle * i) / steps;
                builder.lineTo(p.cx + extent * Math.cos(angle), p.cy + extent * Math.sin(angle));
              }
              builder.close();
            });
        canvas.save();
        try {
          if (wedge) canvas.clipPath(wedge, 1, true);
          canvas.save();
          try {
            if (inner > 0)
              canvas.clipRRect(
                api.RRectXY(
                  api.XYWHRect(p.cx - inner, p.cy - inner, inner * 2, inner * 2),
                  inner,
                  inner,
                ),
                0,
                true,
              );
            fillPaint(resolveColor(p.fill, theme.nodeFill, theme));
            canvas.drawCircle(p.cx, p.cy, p.radius, paint);
          } finally {
            canvas.restore();
          }
          paint.setShader(null);
          paint.setStyle(1);
          paint.setColor(color(resolveColor(p.stroke, theme.nodeStroke, theme)));
          paint.setStrokeWidth(width);
          if (width > 0) {
            canvas.drawCircle(p.cx, p.cy, p.radius, paint);
            if (inner > 0) canvas.drawCircle(p.cx, p.cy, inner, paint);
          }
        } finally {
          canvas.restore();
          wedge?.dispose();
        }
        if (!full && width > 0)
          for (const angle of [p.startAngle, p.startAngle + p.sweepAngle])
            canvas.drawLine(
              p.cx + inner * Math.cos(angle),
              p.cy + inner * Math.sin(angle),
              p.cx + p.radius * Math.cos(angle),
              p.cy + p.radius * Math.sin(angle),
              paint,
            );
        continue;
      }
      if (p.type === "text") {
        if (p.textOutline && p.textOutline.width > 0) {
          const outlinePaint = api.Paint();
          try {
            outlinePaint.setAntiAlias(true);
            outlinePaint.setStyle(1);
            outlinePaint.setStrokeWidth(p.textOutline.width);
            outlinePaint.setStrokeJoin(1);
            outlinePaint.setColor(
              color(resolveColor(p.textOutline.color, theme.background, theme)),
            );
            const outlined = paragraphFor(
              api,
              p.text,
              {
                fontSize: p.fontSize,
                fontStyle: { weight: p.fontWeight ?? 400 },
                fontFamilies,
                color: color(resolveColor(p.color, theme.nodeText, theme)),
              },
              fonts,
              p.lineRuns?.flatMap((line, index) => [...(index ? [{ text: "\n" }] : []), ...line]),
              outlinePaint,
              p.literal,
            );
            try {
              outlined.layout(Math.max(1, p.width + 1));
              outlined.paint(canvas, p.x, p.y);
            } finally {
              outlined.dispose();
            }
          } finally {
            outlinePaint.dispose();
          }
        }
        const paragraph = paragraphFor(
          api,
          p.text,
          {
            fontSize: p.fontSize,
            fontStyle: { weight: p.fontWeight ?? 400 },
            fontFamilies: fontFamilies,
            color: color(resolveColor(p.color, theme.nodeText, theme)),
          },
          fonts,
          p.lineRuns?.flatMap((line, index) => [...(index ? [{ text: "\n" }] : []), ...line]),
          undefined,
          p.literal,
        );
        try {
          paragraph.layout(Math.max(1, p.width + 1));
          paragraph.paint(canvas, p.x, p.y);
        } finally {
          paragraph.dispose();
        }
        continue;
      }
      const fill = resolveColor(p.fill, p.type === "path" ? "none" : theme.nodeFill, theme),
        stroke = resolveColor(
          p.stroke,
          p.type === "path" ? theme.edgeStroke : theme.nodeStroke,
          theme,
        ),
        width = resolveStrokeWidth(p, theme);
      if (p.type === "path") {
        const authored =
          p.curves && p.points[0]
            ? cubicMarkerShaft(p.points[0], p.curves, p.start, p.end, theme.arrowSize ?? 10)
            : undefined;
        if (!markerOnly)
          polygon(
            authored
              ? [authored.start]
              : markerShaft(p.points, p.start, p.end, theme.arrowSize ?? 10),
            p.closed ?? false,
            fill,
            stroke,
            width,
            p.dash,
            p.smooth,
            authored?.curves,
          );
        const curves = p.curves ?? (p.smooth ? curveSegments(p.points) : []);
        activeGradient = undefined;
        for (const [marker, tip, previous] of [
          [p.start, p.points[0], curves[0]?.control1 ?? p.points[1]],
          [
            p.end,
            p.curves?.at(-1)?.end ?? p.points.at(-1),
            curves.at(-1)?.control2 ?? p.points.at(-2),
          ],
        ] as const) {
          if (!marker || marker === "none" || !tip || !previous) continue;
          const er = erMarkerGeometry(marker, tip, previous);
          if (er) {
            for (const line of er.lines) polygon(line, false, undefined, stroke, width);
            for (const center of er.circles) {
              paint.setStyle(0);
              paint.setColor(color(theme.edgeTextBackground));
              canvas.drawCircle(center.x, center.y, 4, paint);
              paint.setShader(null);
              paint.setStyle(1);
              paint.setColor(color(stroke));
              paint.setStrokeWidth(width);
              canvas.drawCircle(center.x, center.y, 4, paint);
            }
            continue;
          }
          if (marker === "circle") {
            const center = circleMarkerCenter(tip, previous);
            paint.setStyle(0);
            paint.setColor(color(stroke));
            canvas.drawCircle(center.x, center.y, 4, paint);
          } else {
            const geometry = markerGeometry(marker, tip, previous, theme.arrowSize ?? 10);
            for (const points of geometry.paths)
              polygon(points, geometry.closed, geometry.filled ? stroke : undefined, stroke, width);
          }
        }
        continue;
      }
      const modern = modernShapeContours(p.shape, p);
      if (modern !== undefined) {
        for (const contour of modern) {
          const path = pathFor(api, (builder) => {
            for (const command of contour.commands) {
              if (command.kind === "move") builder.moveTo(command.point.x, command.point.y);
              else if (command.kind === "line") builder.lineTo(command.point.x, command.point.y);
              else if (command.kind === "curve")
                builder.cubicTo(
                  command.control1.x,
                  command.control1.y,
                  command.control2.x,
                  command.control2.y,
                  command.point.x,
                  command.point.y,
                );
              else builder.close();
            }
          });
          try {
            paint.setPathEffect(null);
            if (contour.fill && (contour.ink || fill !== "none")) {
              fillPaint(contour.ink ? stroke : fill);
              canvas.drawPath(path, paint);
            }
            if (width > 0) {
              paint.setShader(null);
              paint.setStyle(1);
              paint.setColor(color(stroke));
              paint.setStrokeWidth(width);
              paint.setPathEffect(dashEffect(p.dash));
              canvas.drawPath(path, paint);
            }
          } finally {
            paint.setPathEffect(null);
            path.dispose();
          }
        }
        continue;
      }
      const drawShape = (
        primitive: Extract<Primitive, { type: "shape" }>,
        inset = 0,
        strokeOnly = false,
      ) => {
        const rect = api.XYWHRect(
          primitive.x + inset,
          primitive.y + inset,
          Math.max(0, primitive.width - inset * 2),
          Math.max(0, primitive.height - inset * 2),
        );
        const path = pathFor(api, (builder) => {
          if (primitive.shape === "cylinder") {
            const geometry = cylinderGeometry(primitive);
            builder.moveTo(geometry.start.x, geometry.start.y);
            const curve = (segment: (typeof geometry.top)[number]) =>
              builder.cubicTo(
                segment.control1.x,
                segment.control1.y,
                segment.control2.x,
                segment.control2.y,
                segment.end.x,
                segment.end.y,
              );
            geometry.top.forEach(curve);
            builder.lineTo(geometry.side.x, geometry.side.y);
            geometry.bottom.forEach(curve);
            builder.close();
          } else if (["circle", "doublecircle"].includes(primitive.shape)) builder.addOval(rect);
          else if (["round", "stadium"].includes(primitive.shape)) {
            const radius =
              primitive.shape === "stadium"
                ? primitive.height / 2
                : Math.max(
                    0,
                    Math.min(
                      primitive.radius ?? theme.radius,
                      primitive.width / 2,
                      primitive.height / 2,
                    ),
                  );
            builder.addRRect(api.RRectXY(rect, radius, radius));
          } else builder.addRect(rect);
        });
        try {
          paint.setPathEffect(null);
          if (!strokeOnly && fill !== "none") {
            fillPaint(fill);
            canvas.drawPath(path, paint);
          }
          if (width > 0) {
            paint.setShader(null);
            paint.setStyle(1);
            paint.setColor(color(stroke));
            paint.setStrokeWidth(width);
            const effect = dashEffect(p.dash);
            paint.setPathEffect(effect);
            try {
              canvas.drawPath(path, paint);
            } finally {
              paint.setPathEffect(null);
            }
          }
        } finally {
          path.dispose();
        }
      };
      if (
        ["rect", "round", "stadium", "circle", "doublecircle", "subroutine", "cylinder"].includes(
          p.shape,
        )
      ) {
        drawShape(p);
        if (p.shape === "doublecircle") drawShape(p, 5, true);
        if (p.shape === "subroutine")
          for (const x of [p.x + 8, p.x + p.width - 8])
            polygon(
              [
                { x, y: p.y },
                { x, y: p.y + p.height },
              ],
              false,
              undefined,
              stroke,
              width,
            );
        if (p.shape === "cylinder" && width > 0) {
          const path = pathFor(api, (builder) => {
            const geometry = cylinderGeometry(p);
            builder.moveTo(geometry.start.x, geometry.start.y);
            for (const segment of geometry.rim)
              builder.cubicTo(
                segment.control1.x,
                segment.control1.y,
                segment.control2.x,
                segment.control2.y,
                segment.end.x,
                segment.end.y,
              );
          });
          try {
            canvas.drawPath(path, paint);
          } finally {
            path.dispose();
          }
        }
      } else polygon(shapePoints(p.shape, p), true, fill, stroke, width, p.dash);
    }
  } finally {
    paint.setPathEffect(null);
    paint.setShader(null);
    paint.dispose();
    for (const shader of shaders) shader.dispose();
    for (const effect of effects.values()) effect?.dispose();
  }
}
export function renderToPicture(
  api: SkiaApi,
  scene: Scene,
  theme: DiagramTheme,
  fonts?: SkTypefaceFontProvider,
  assets?: NativeRenderAssets,
  options?: { drawBackground?: boolean; markerOnly?: boolean },
): SkPicture {
  validateNativeScene(scene, theme);
  const recorder = api.PictureRecorder();
  try {
    const canvas = recorder.beginRecording(
      api.XYWHRect(scene.bounds.x, scene.bounds.y, scene.bounds.width, scene.bounds.height),
    );
    drawValidatedScene(
      api,
      canvas,
      scene,
      theme,
      fonts,
      options?.drawBackground !== false,
      assets,
      options?.markerOnly,
    );
    return recorder.finishRecordingAsPicture();
  } finally {
    recorder.dispose();
  }
}
export function renderToPng(
  api: SkiaApi,
  scene: Scene,
  theme: DiagramTheme,
  pixelRatio = 2,
  fonts?: SkTypefaceFontProvider,
  assets?: NativeRenderAssets,
): Uint8Array {
  validateNativeScene(scene, theme);
  if (!Number.isFinite(pixelRatio) || pixelRatio <= 0 || pixelRatio > 4)
    throw new Error("PNG pixel ratio must be in (0, 4]");
  const width = Math.ceil(scene.bounds.width * pixelRatio),
    height = Math.ceil(scene.bounds.height * pixelRatio);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
    throw new Error("PNG export dimensions must be finite and positive");
  // Area alone does not protect legal very long diagrams from exceeding native
  // texture limits. Reject explicitly; never silently downsample an export.
  if (width > 8192 || height > 8192)
    throw new Error("PNG export exceeds 8192 pixels per dimension");
  if (width * height > 16000000) throw new Error("PNG export exceeds 16 megapixels");
  const surface = api.Surface.MakeOffscreen(width, height);
  if (!surface) throw new Error("Could not create Skia export surface");
  try {
    const canvas = surface.getCanvas();
    // Export owns this new surface, so clear its complete rounded-up pixel extent
    // here, not inside a Picture that may later be composited by the host.
    canvas.clear(api.Color(theme.background));
    canvas.scale(pixelRatio, pixelRatio);
    canvas.translate(-scene.bounds.x, -scene.bounds.y);
    // Surface clear already supplied the background, including fractional-pixel
    // margins. Do not source-over a translucent host token a second time.
    drawValidatedScene(api, canvas, scene, theme, fonts, false, assets);
    surface.flush();
    const image = surface.makeImageSnapshot();
    try {
      return image.encodeToBytes();
    } finally {
      image.dispose();
    }
  } finally {
    surface.dispose();
  }
}
