import { ExecutionOverlay } from "./execution-overlay.tsx";
import type { DiagramExecutionState } from "./execution-state.ts";
export type { DiagramExecutionState, DiagramExecutionStatus } from "./execution-state.ts";
import { canRetainRecording, isCurrentRecording } from "./recording-boundary.ts";
import { DataSelectionScene } from "./data-selection-scene.tsx";
import { nextDataSelection } from "./data-selection-state.ts";
import { initialDiagramCamera } from "./initial-camera.ts";
import { inlineLayoutWidth } from "./layout-viewport.ts";
import { useInlineZoom } from "./inline-zoom.ts";
import { MotionPicture } from "./motion-picture.tsx";
import { scheduleDiagramWork } from "./idle-scheduler.ts";
import { readDiagramThemeDirective } from "./theme-directive.ts";
import { useReducedDiagramMotion } from "./motion-preference.ts";
import { recordDiagramMotion, type RecordedMotion } from "./record-motion.ts";
import { hitTestInteraction, viewerPointToScene } from "./hit-test.ts";
import { useDiagramConfiguration, type DiagramConfiguration } from "./provider.tsx";
export {
  DiagramProvider,
  useDiagramConfiguration,
  type DiagramConfiguration,
  type DiagramExpandIconProps,
} from "./provider.tsx";
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Modal,
  SafeAreaView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  useWindowDimensions,
  type NativeScrollEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  Canvas,
  Group,
  Paint,
  Skia,
  type SkPicture,
  type SkTypefaceFontProvider,
} from "react-native-skia";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  withSequence,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
  cancelAnimation,
  ReduceMotion,
} from "react-native-reanimated";
import { clampViewerZoom, panLimit, inlineViewport } from "./viewport.ts";
import {
  renderToSvg,
  resolveDiagramTheme,
  mergeThemeOverrides,
  type DiagramInteraction,
  type DiagramError,
  type Scene,
  type TextMeasurer,
  type DiagramTheme,
} from "../index.ts";
import {
  createSkiaTextMeasurer,
  renderToPicture,
  renderToPng,
  type NativeRenderAssets,
} from "../render/skia.ts";
import { SceneCache } from "../layout/cache.ts";
import { requestSceneAsync } from "../layout/request.ts";
const sceneCache = new SceneCache();
const identities = new WeakMap<object, number>();
let nextIdentity = 1;
function identity(value?: object): number {
  if (!value) return 0;
  let id = identities.get(value);
  if (!id) {
    id = nextIdentity++;
    identities.set(value, id);
  }
  return id;
}
export {
  createSkiaTextMeasurer,
  renderToPicture,
  renderToPng,
  type NativeRenderAssets,
} from "../render/skia.ts";
type DiagramResult =
  | {
      status: "ready";
      recordingKey: string;
      layoutKey: string;
      replayToken?: string | number;
      motionSession: number;
      scene: Scene;
      picture: SkPicture;
      motion?: RecordedMotion;
      onMotionComplete?: () => void;
      onRenderError: (error: unknown) => void;
      bounds: Scene["bounds"];
      theme: DiagramTheme;
      fontProvider?: SkTypefaceFontProvider;
      assets?: NativeRenderAssets;
    }
  | { status: "error"; error: DiagramError }
  | { status: "unsupported"; type: string }
  | { status: "idle" };
const invalidSourceResult: DiagramResult = {
  status: "error",
  error: { kind: "syntax", line: 1, column: 1, message: "Diagram source must be a string" },
};
/** A picture belongs to one hook/Canvas, never to a global cache across Graphite views. */
export function useDiagram(
  source: string,
  theme: DiagramTheme,
  measure?: TextMeasurer,
  fontProvider?: SkTypefaceFontProvider,
  assets?: NativeRenderAssets,
  options?: {
    animate?: boolean;
    viewportWidth?: number;
    enabled?: boolean;
    replayToken?: string | number;
  },
): DiagramResult {
  const configuration = useDiagramConfiguration();
  measure = measure ?? configuration.measure;
  fontProvider = fontProvider ?? configuration.fontProvider;
  assets = assets ?? configuration.assets;
  const resolveIcon = theme.layout?.resolveIcon ?? configuration.resolveIcon;
  const imageMap = assets?.images;
  const resolveImageSize = useMemo(
    () =>
      theme.layout?.resolveImageSize ??
      (imageMap
        ? (asset: string) => {
            const image = imageMap.get(asset);
            return image ? { width: image.width(), height: image.height() } : undefined;
          }
        : undefined),
    [theme.layout?.resolveImageSize, imageMap],
  );
  const fontKey = `${identity(measure)}:${identity(fontProvider)}:${identity(resolveIcon)}:${identity(resolveImageSize)}`;
  const viewportWidth = options?.viewportWidth;
  const layoutTheme = useMemo(
    () =>
      viewportWidth && Number.isFinite(viewportWidth)
        ? { ...theme, layout: { ...theme.layout, viewportWidth } }
        : theme,
    [theme, viewportWidth],
  );
  const animate = options?.animate === true && configuration.motion !== false;
  const sourceKey = typeof source === "string" ? source : "";
  const geometryRecordingKey = sceneCache.key(
    sourceKey,
    layoutTheme,
    `${fontKey}:${identity(assets?.images)}:motion:${animate}`,
  );
  // A host measurer can capture any theme property. Keep its full theme key;
  // the built-in Paragraph measurer depends only on font family and geometry.
  const key = `${geometryRecordingKey}:replay:${JSON.stringify(options?.replayToken)}`;
  const layoutKey = measure
    ? geometryRecordingKey
    : sceneCache.layoutKey(sourceKey, layoutTheme, fontKey);
  const fontFamily = theme.fontFamily;
  const textMeasurer = useMemo(
    () => measure ?? createSkiaTextMeasurer(Skia, { fontFamily }, fontProvider),
    [measure, fontFamily, fontProvider],
  );
  const [recording, setRecording] = useState<DiagramResult>({ status: "idle" });
  // Track effect recordings superseded before state commits, including StrictMode.
  // This resource pool belongs to one Canvas and is accessed only in effects.
  const pictures = useRef(new Set<RecordedMotion["resources"][number]>());
  const pendingPictures = useRef(new Set<RecordedMotion["resources"][number]>());
  const recordedKey = useRef<string | undefined>(undefined);
  const lastAnimatedScene = useRef<Scene | undefined>(undefined);
  const motionSession = useRef(0);
  const lastReplayToken = useRef<string | number | undefined>(undefined);
  const committedRecording = useRef<Extract<DiagramResult, { status: "ready" }> | undefined>(
    undefined,
  );
  const reportRenderError = useCallback((failedKey: string, error: unknown) => {
    if (recordedKey.current !== failedKey) return;
    pendingPictures.current.clear();
    setRecording((current) =>
      current.status === "ready" && current.recordingKey === failedKey
        ? {
            status: "error",
            error: {
              kind: "layout",
              line: 1,
              column: 1,
              message: error instanceof Error ? error.message : "Execution recording failed",
            },
          }
        : current,
    );
  }, []);
  useEffect(() => {
    if (typeof source !== "string") {
      recordedKey.current = undefined;
      pendingPictures.current.clear();
      setRecording(invalidSourceResult);
      return;
    }
    if (options?.enabled === false || recordedKey.current === key) return;
    return requestSceneAsync(
      () =>
        sceneCache.prepareAsync(layoutKey, source, textMeasurer, {
          ...layoutTheme.layout,
          resolveIcon,
          resolveImageSize,
          fontSize: theme.fontSize,
          radius: theme.radius,
        }),
      scheduleDiagramWork,
      (sceneResult) => {
        recordedKey.current = key;
        if (sceneResult.status !== "ready") {
          pendingPictures.current.clear();
          setRecording(sceneResult);
          return;
        }
        try {
          const picture = renderToPicture(Skia, sceneResult.scene, theme, fontProvider, assets);
          pictures.current.add(picture);
          const previous = committedRecording.current;
          const continuing =
            canRetainRecording(
              previous?.layoutKey,
              layoutKey,
              previous?.replayToken,
              options?.replayToken,
            ) && previous?.motion !== undefined;
          const motion =
            animate &&
            (continuing ||
              lastAnimatedScene.current !== sceneResult.scene ||
              lastReplayToken.current !== options?.replayToken)
              ? recordDiagramMotion(sceneResult.scene, theme, fontProvider, assets)
              : undefined;

          for (const resource of motion?.resources ?? []) pictures.current.add(resource);
          pendingPictures.current = new Set([picture, ...(motion?.resources ?? [])]);
          setRecording({
            status: "ready",
            recordingKey: key,
            layoutKey,
            replayToken: options?.replayToken,
            motionSession: continuing ? previous!.motionSession : ++motionSession.current,
            scene: sceneResult.scene,
            picture,
            motion,
            onMotionComplete: motion
              ? () => {
                  for (const resource of motion.resources) pendingPictures.current.delete(resource);
                  setRecording((current) =>
                    current.status === "ready" && current.motion === motion
                      ? { ...current, motion: undefined, onMotionComplete: undefined }
                      : current,
                  );
                }
              : undefined,
            onRenderError: (error) => reportRenderError(key, error),
            bounds: sceneResult.scene.bounds,
            theme,
            fontProvider,
            assets,
          });
        } catch (error) {
          pendingPictures.current.clear();
          setRecording({
            status: "error",
            error: {
              kind: "layout",
              line: 1,
              column: 1,
              message: error instanceof Error ? error.message : "Picture recording failed",
            },
          });
        }
      },
      (error) => {
        pendingPictures.current.clear();
        recordedKey.current = key;
        setRecording({
          status: "error",
          error: {
            kind: "layout",
            line: 1,
            column: 1,
            message: error instanceof Error ? error.message : "Diagram preparation failed",
          },
        });
      },
    );
  }, [
    key,
    options?.enabled,
    animate,
    layoutKey,
    layoutTheme,
    source,
    theme,
    textMeasurer,
    fontProvider,
    resolveIcon,
    resolveImageSize,
    assets,
    reportRenderError,
  ]);
  useEffect(() => {
    // After Canvas receives the committed result, also release recordings that
    // were superseded before React committed them (not only the previous state).
    if (recording.status === "ready" && recording.recordingKey === key) {
      committedRecording.current = recording;
      lastAnimatedScene.current = recording.scene;
      lastReplayToken.current = options?.replayToken;
    }
    const current = new Set(
      recording.status === "ready"
        ? [recording.picture, ...(recording.motion?.resources ?? [])]
        : [],
    );
    for (const picture of pictures.current)
      if (!current.has(picture) && !pendingPictures.current.has(picture)) {
        pictures.current.delete(picture);
        picture.dispose();
      }
  }, [recording]);
  useEffect(
    () => () => {
      for (const picture of pictures.current) picture.dispose();
      pictures.current.clear();
      pendingPictures.current.clear();
      recordedKey.current = undefined;
      lastAnimatedScene.current = undefined;
      committedRecording.current = undefined;
    },
    [],
  );
  const appearanceUpdate =
    recording.status === "ready" &&
    canRetainRecording(recording.layoutKey, layoutKey, recording.replayToken, options?.replayToken);
  if (typeof source !== "string") return invalidSourceResult;
  return options?.enabled !== false &&
    (appearanceUpdate ||
      isCurrentRecording(
        key,
        recordedKey.current,
        recording.status === "ready" ? recording.recordingKey : undefined,
      ))
    ? recording
    : { status: "idle" };
}
function DiagramExpandButton({
  onPress,
  theme,
  testID,
  renderIcon,
  buttonStyle,
}: {
  onPress: () => void;
  theme: DiagramTheme;
  testID?: string;
  renderIcon?: DiagramConfiguration["renderExpandIcon"];
  buttonStyle?: StyleProp<ViewStyle>;
}) {
  const { motion } = useDiagramConfiguration();
  const reduced = useReducedDiagramMotion();
  const motionMode = motion === false || reduced ? ReduceMotion.Always : ReduceMotion.System;
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel="Expand diagram"
      accessibilityHint="Opens zoom, source copy and export controls"
      onPress={onPress}
      onPressIn={() => scale.set(withTiming(0.92, { duration: 70, reduceMotion: motionMode }))}
      onPressOut={() =>
        scale.set(
          withSequence(
            motionMode,
            withTiming(0.92, { duration: 70, reduceMotion: motionMode }),
            withTiming(1, { duration: 240, reduceMotion: motionMode }),
          ),
        )
      }
      style={{
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View
        style={[
          {
            width: 26,
            height: 26,
            borderRadius: Math.min(8, theme.radius),
            borderWidth: theme.controlBorderWidth ?? StyleSheet.hairlineWidth,
            borderColor: theme.gridStroke,
            backgroundColor: theme.nodeFill,
            alignItems: "center",
            justifyContent: "center",
          },
          buttonStyle,
          style,
        ]}
      >
        {renderIcon ? (
          renderIcon({ color: theme.accent, size: 16 })
        ) : (
          <View style={{ width: 16, height: 16 }}>
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                borderWidth: 1.5,
                borderColor: theme.accent,
              }}
            />
            <View
              style={{
                position: "absolute",
                width: 7,
                height: 1.5,
                backgroundColor: theme.accent,
                left: 8,
                top: 11,
                transform: [{ rotate: "45deg" }],
              }}
            />
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

/** Details occupy normal layout below the canvas, so no diagram geometry is obscured. */
function DiagramDetail({
  selection,
  theme,
  onDismiss,
  testID,
}: {
  selection: DiagramInteraction;
  theme: DiagramTheme;
  onDismiss: () => void;
  testID?: string;
}) {
  const { motion } = useDiagramConfiguration();
  const reduced = useReducedDiagramMotion();
  const motionMode = motion === false || reduced ? ReduceMotion.Always : ReduceMotion.System;
  const reveal = useSharedValue(0);
  useEffect(() => {
    reveal.set(0);
    reveal.set(withTiming(1, { duration: 180, reduceMotion: motionMode }));
    return () => cancelAnimation(reveal);
  }, [selection, reveal, motionMode]);
  const style = useAnimatedStyle(() => ({
    opacity: reveal.get(),
    transform: [{ translateY: 4 * (1 - reveal.get()) }],
  }));
  return (
    <Animated.View
      testID={testID}
      style={[
        {
          marginTop: 8,
          paddingLeft: 12,
          paddingVertical: 6,
          flexDirection: "row",
          alignItems: "center",
          borderRadius: theme.radius,
          backgroundColor: theme.nodeFill,
          borderWidth: theme.controlBorderWidth ?? StyleSheet.hairlineWidth,
          borderColor: theme.gridStroke ?? theme.clusterStroke,
        },
        style,
      ]}
    >
      <View style={{ flex: 1, paddingVertical: 4 }} accessibilityLiveRegion="polite">
        <Text style={{ color: theme.nodeText, fontWeight: "600", fontSize: theme.fontSize }}>
          {selection.label}
          {selection.value === undefined ? "" : ` · ${selection.value}`}
        </Text>
        {selection.tooltip ? (
          <Text
            style={{
              color: theme.mutedText,
              fontSize: Math.max(12, theme.fontSize - 1),
              marginTop: 3,
            }}
          >
            {selection.tooltip}
          </Text>
        ) : null}
      </View>
      <Pressable
        testID={testID ? `${testID}-dismiss` : undefined}
        accessibilityRole="button"
        accessibilityLabel={`Dismiss ${selection.label} detail`}
        onPress={onDismiss}
        style={{ width: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ color: theme.mutedText, fontSize: 18 }}>×</Text>
      </Pressable>
    </Animated.View>
  );
}

export interface DiagramProps {
  source: string;
  theme?: Partial<DiagramTheme>;
  fontProvider?: SkTypefaceFontProvider;
  assets?: NativeRenderAssets;
  measure?: TextMeasurer;
  maxWidth?: number;
  execution?: DiagramExecutionState;
  /** Change this token to replay entrance motion without changing diagram geometry. */
  replayToken?: string | number;
  minScale?: number;
  /** Explicit viewport height enables internal vertical scrolling. Defaults to
   * natural page height; scenes taller than 1200pt use a 420pt expandable preview. */
  maxHeight?: number;
  /** Overview previews can fit both dimensions; normal inline labels retain minScale. */
  fitToViewport?: boolean;
  onPress?: () => void;
  onInteraction?: (interaction: DiagramInteraction) => void;
  /** Render selected data below the canvas; return null to suppress the default detail. */
  renderDataDetail?: (selection: DiagramInteraction, dismiss: () => void) => ReactNode;
  /** Explicit top-right expand control; tapping the diagram never invokes this action. */
  onExpand?: () => void;
  renderExpandIcon?: DiagramConfiguration["renderExpandIcon"];
  expandButtonStyle?: StyleProp<ViewStyle>;
  onLongPress?: () => void;
  onError?: (error: DiagramError) => void;
  onReady?: (scene: Scene) => void;
  fallback?: (source: string, error?: DiagramError) => ReactNode;
  accessibilityLabel?: string;
  testID?: string;
}
function DiagramInteractionTarget({
  interaction,
  scale,
  bounds,
  theme,
  onPress,
  testID,
}: {
  interaction: DiagramInteraction;
  scale: number;
  bounds: Scene["bounds"];
  theme: DiagramTheme;
  onPress: () => void;
  testID?: string;
}) {
  const { motion } = useDiagramConfiguration();
  const reduced = useReducedDiagramMotion();
  const motionMode = motion === false || reduced ? ReduceMotion.Always : ReduceMotion.System;
  const pulse = useSharedValue(0);
  const feedback = useAnimatedStyle(() => ({ opacity: pulse.get() }));
  return (
    <Pressable
      testID={testID}
      accessibilityRole={interaction.kind === "link" ? "link" : "button"}
      accessibilityLabel={interaction.label}
      accessibilityHint={interaction.tooltip}
      onPress={(event) => {
        event.stopPropagation();
        onPress();
      }}
      onPressIn={() => pulse.set(withTiming(0.18, { duration: 70, reduceMotion: motionMode }))}
      onPressOut={() =>
        pulse.set(
          withSequence(
            motionMode,
            withTiming(0.18, { duration: 70, reduceMotion: motionMode }),
            withTiming(0, { duration: 240, reduceMotion: motionMode }),
          ),
        )
      }
      style={{
        position: "absolute",
        left: (interaction.x - bounds.x) * scale,
        top: (interaction.y - bounds.y) * scale,
        width: interaction.width * scale,
        height: interaction.height * scale,
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[{ flex: 1, borderRadius: theme.radius, backgroundColor: theme.accent }, feedback]}
      />
    </Pressable>
  );
}
export function DiagramFallback({
  source,
  error,
  theme,
}: {
  source: string;
  error?: DiagramError;
  theme?: DiagramTheme;
}) {
  return (
    <View>
      <Text style={{ color: theme?.nodeText }}>{error?.message ?? "Mermaid"}</Text>
      <Text
        selectable
        style={{
          fontFamily: theme?.fontFamilyMono ?? "monospace",
          fontSize: theme?.fontSize,
          color: theme?.nodeText,
        }}
      >
        {typeof source === "string" ? source : ""}
      </Text>
    </View>
  );
}
function useResolvedTheme(overrides: Partial<DiagramTheme> | undefined, source: string) {
  const configuration = useDiagramConfiguration();
  const mergedOverrides = useMemo(
    () => mergeThemeOverrides(configuration.theme, overrides),
    [configuration.theme, overrides],
  );
  const systemMode = useColorScheme();
  const mode = configuration.mode ?? systemMode;
  // A partial host theme overrides individual tokens while inheriting the
  // remaining authored appearance, without running the diagram grammar.
  const directive = useMemo(() => readDiagramThemeDirective(source), [source]);
  return useMemo(
    () => resolveDiagramTheme(mergedOverrides, mode === "dark" ? "dark" : "light", directive),
    [mode, mergedOverrides, directive],
  );
}
export function Diagram(props: DiagramProps) {
  const configuration = useDiagramConfiguration();
  const onExpand =
    props.onExpand ??
    (configuration.onExpand ? () => configuration.onExpand!(props.source) : undefined);
  const onInteraction = props.onInteraction ?? configuration.onInteraction;
  const renderDataDetail = props.renderDataDetail ?? configuration.renderDataDetail;
  const theme = useResolvedTheme(props.theme, props.source);
  const [availableWidth, setAvailableWidth] = useState<number>();
  const [showFull, setShowFull] = useState(false);
  const contentWidth = availableWidth
    ? Math.min(availableWidth, props.maxWidth ?? availableWidth)
    : undefined;
  const layoutWidth = useMemo(
    () => inlineLayoutWidth(props.source, contentWidth, props.fitToViewport),
    [props.source, contentWidth, props.fitToViewport],
  );
  const result = useDiagram(props.source, theme, props.measure, props.fontProvider, props.assets, {
    animate: true,
    replayToken: props.replayToken,
    viewportWidth: layoutWidth,
    enabled: contentWidth !== undefined,
  });
  const window = useWindowDimensions();
  const scrollX = useSharedValue(0),
    scrollY = useSharedValue(0);
  const horizontal = useRef<ScrollView>(null),
    vertical = useRef<ScrollView>(null);
  const scene = result.status === "ready" ? result.scene : undefined;
  const [selection, setSelection] = useState<DiagramInteraction>();
  useEffect(() => setSelection(undefined), [scene]);
  useEffect(() => {
    if (scene) props.onReady?.(scene);
  }, [scene, props.onReady]);
  // Do not capture the Scene/primitives in a UI-thread scroll worklet.
  const bounds = scene?.bounds ?? { x: 0, y: 0, width: 1, height: 1 };
  const baseViewport = inlineViewport(
    bounds,
    contentWidth ?? 1,
    window,
    props.minScale,
    props.maxHeight,
    props.fitToViewport,
  );
  const [zoomCommit, setZoomCommit] = useState({ factor: 1, x: 0, y: 0 });
  const pageHeight = props.maxHeight === undefined && !props.fitToViewport;
  const collapsed = pageHeight && baseViewport.contentHeight * zoomCommit.factor > 1200;
  const viewport = {
    ...baseViewport,
    height: pageHeight
      ? collapsed
        ? 420
        : Math.max(1, baseViewport.contentHeight * zoomCommit.factor)
      : baseViewport.height,
  };
  const VerticalContainer = pageHeight ? Fragment : Animated.ScrollView;
  const commitZoom = useCallback(
    (factor: number, x: number, y: number) =>
      setZoomCommit({ factor, x, y: pageHeight && !collapsed ? 0 : y }),
    [pageHeight, collapsed],
  );
  const inlineZoom = useInlineZoom({
    width: viewport.width,
    height: viewport.height,
    contentWidth: bounds.width,
    contentHeight: bounds.height,
    baseScale: viewport.scale,
    scrollX,
    scrollY,
    onCommit: commitZoom,
  });
  const { zoom: relativeZoom, pinching: inlinePinching } = inlineZoom;
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      scrollY.set(zoomCommit.y);
      horizontal.current?.scrollTo({ x: zoomCommit.x, animated: false });
      vertical.current?.scrollTo({ y: zoomCommit.y, animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [zoomCommit, scrollY]);
  const zoomTransform = useDerivedValue(() => [{ scale: relativeZoom.get() }]);
  const onHorizontalScroll = useAnimatedScrollHandler({
    onScroll(event: NativeScrollEvent) {
      if (!inlinePinching.get()) scrollX.set(event.contentOffset.x);
    },
  });
  const onVerticalScroll = useAnimatedScrollHandler({
    onScroll(event: NativeScrollEvent) {
      if (!inlinePinching.get()) scrollY.set(event.contentOffset.y);
    },
  });
  const transform = useDerivedValue(() => [
    { translateX: -scrollX.get() },
    { translateY: -scrollY.get() },
  ]);
  const sceneTransform = [
    { translateX: -bounds.x * viewport.scale },
    { translateY: -bounds.y * viewport.scale },
    { scale: viewport.scale },
  ];
  const committedViewport = useRef<{ height: number } | undefined>(undefined);
  useLayoutEffect(() => {
    if (scene) committedViewport.current = { height: viewport.height };
  }, [scene, viewport.height]);
  const previousInlineGeometry = useRef<{ scene: Scene; scale: number } | undefined>(undefined);
  useLayoutEffect(() => {
    if (!scene) return;
    if (
      previousInlineGeometry.current?.scene === scene &&
      previousInlineGeometry.current.scale === viewport.scale
    )
      return;
    previousInlineGeometry.current = { scene, scale: viewport.scale };
    inlineZoom.reset();
    const camera = initialDiagramCamera(scene, viewport);
    setZoomCommit({ factor: 1, ...camera });
    scrollX.set(camera.x);
    scrollY.set(camera.y);
    horizontal.current?.scrollTo({ x: camera.x, animated: false });
    vertical.current?.scrollTo({ y: camera.y, animated: false });
  }, [scene, viewport.scale, viewport.width, viewport.height, scrollX, scrollY, inlineZoom.reset]);
  const error = result.status === "error" ? result.error : undefined;
  useEffect(() => {
    if (error) props.onError?.(error);
  }, [error, props.onError]);
  if (result.status === "error" || result.status === "unsupported")
    return (
      <>
        {props.fallback ? (
          props.fallback(props.source, error)
        ) : (
          <DiagramFallback source={props.source} error={error} theme={theme} />
        )}
      </>
    );
  const measureWidth = (event: import("react-native").LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (Number.isFinite(width) && width > 0)
      setAvailableWidth((previous) =>
        previous !== undefined && Math.abs(previous - width) < 0.5 ? previous : width,
      );
  };
  if (result.status !== "ready")
    return (
      <View
        onLayout={measureWidth}
        style={{
          width: "100%",
          maxWidth: props.maxWidth,
          backgroundColor: theme.background,
          height:
            (committedViewport.current?.height ?? Math.min(props.maxHeight ?? 240, window.height)) +
            (onExpand ? 44 : 0),
        }}
        accessibilityLabel="Preparing diagram"
        accessibilityState={{ busy: true }}
      />
    );
  return (
    <View
      testID={props.testID ? `${props.testID}-viewport` : undefined}
      accessibilityLabel=""
      accessibilityState={{ busy: false }}
      onLayout={measureWidth}
      style={{ width: "100%", maxWidth: props.maxWidth }}
    >
      {onExpand && (
        <View
          testID={props.testID ? `${props.testID}-toolbar` : undefined}
          style={{ height: 44, alignItems: "flex-end" }}
        >
          <DiagramExpandButton
            theme={theme}
            onPress={onExpand}
            renderIcon={props.renderExpandIcon ?? configuration.renderExpandIcon}
            buttonStyle={props.expandButtonStyle ?? configuration.expandButtonStyle}
            testID={props.testID ? `${props.testID}-expand` : undefined}
          />
        </View>
      )}
      <View
        testID={props.testID ? `${props.testID}-content` : undefined}
        style={{
          width: viewport.width,
          height: viewport.height,
          overflow: "hidden",
          backgroundColor: theme.background,
        }}
      >
        {/* Only this stationary, clipped viewport owns a native render target.
         * Transparent native scroll content preserves the full logical extent;
         * offsets translate Picture replay on the UI thread, not on each JS frame. */}
        <Canvas
          pointerEvents="none"
          testID={props.testID ? `${props.testID}-canvas` : undefined}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: viewport.width,
            height: viewport.height,
            backgroundColor: theme.background,
          }}
        >
          <Group clip={{ x: 0, y: 0, width: viewport.width, height: viewport.height }}>
            <Group layer={<Paint />}>
              <Group transform={transform}>
                <Group transform={zoomTransform}>
                  <Group transform={sceneTransform}>
                    <DataSelectionScene
                      scene={result.scene}
                      theme={result.theme}
                      fontProvider={result.fontProvider}
                      assets={result.assets}
                      selection={selection}
                      onTakeOver={result.onMotionComplete}
                    >
                      <MotionPicture
                        key={result.motionSession}
                        picture={result.picture}
                        motion={result.motion}
                        kind={result.scene.kind}
                        onComplete={result.onMotionComplete}
                      />
                    </DataSelectionScene>
                    {props.execution && (
                      <ExecutionOverlay
                        scene={result.scene}
                        execution={props.execution}
                        theme={theme}
                        fontProvider={result.fontProvider}
                        assets={result.assets}
                        onError={result.onRenderError}
                      />
                    )}
                  </Group>
                </Group>
              </Group>
            </Group>
          </Group>
        </Canvas>
        <VerticalContainer
          {...(!pageHeight
            ? {
                ref: vertical,
                disableScrollViewPanResponder: true,
                nestedScrollEnabled: true,
                onScroll: onVerticalScroll,
                scrollEventThrottle: 16,
                testID: props.testID ? `${props.testID}-vertical` : undefined,
                style: { width: viewport.width, height: viewport.height },
              }
            : {})}
        >
          <GestureDetector gesture={inlineZoom.gesture}>
            <Animated.ScrollView
              ref={horizontal}
              testID={props.testID ? `${props.testID}-horizontal` : undefined}
              horizontal
              style={{ width: viewport.width, height: viewport.height }}
              disableScrollViewPanResponder
              nestedScrollEnabled
              onScroll={onHorizontalScroll}
              scrollEventThrottle={16}
            >
              <Pressable
                testID={props.testID}
                accessibilityRole="image"
                accessibilityLabel={props.accessibilityLabel ?? result.scene.accessibilityLabel}
                onPress={(event) => {
                  if (
                    inlineZoom.pinching.get() ||
                    Date.now() - inlineZoom.lastEndedTimestamp.get() < 180
                  )
                    return;
                  const hit =
                    scene &&
                    hitTestInteraction(scene, {
                      x:
                        event.nativeEvent.locationX / (viewport.scale * inlineZoom.zoom.get()) +
                        bounds.x,
                      y:
                        event.nativeEvent.locationY / (viewport.scale * inlineZoom.zoom.get()) +
                        bounds.y,
                    });
                  if (hit?.kind === "data") {
                    setSelection((current) => nextDataSelection(current, hit));
                    onInteraction?.(hit);
                  } else props.onPress?.();
                }}
                accessibilityHint={
                  scene?.interactions?.some((item) => item.kind === "data")
                    ? "Select a data point to show details below the chart"
                    : undefined
                }
                accessibilityActions={scene?.interactions
                  ?.filter((item) => item.kind === "data")
                  .map((item) => ({
                    name: item.id,
                    label:
                      selection?.id === item.id
                        ? `Restore ${item.label}`
                        : `Show ${item.label} detail`,
                  }))}
                onAccessibilityAction={(event) => {
                  const item = scene?.interactions?.find(
                    (target) =>
                      target.kind === "data" && target.id === event.nativeEvent.actionName,
                  );
                  if (item) {
                    setSelection((current) => nextDataSelection(current, item));
                    onInteraction?.(item);
                  }
                }}
                onLongPress={
                  props.onLongPress
                    ? () => {
                        if (
                          !inlineZoom.pinching.get() &&
                          Date.now() - inlineZoom.lastEndedTimestamp.get() >= 180
                        )
                          props.onLongPress?.();
                      }
                    : undefined
                }
                style={{
                  width: Math.max(viewport.width, viewport.contentWidth * zoomCommit.factor),
                  height: viewport.contentHeight * zoomCommit.factor,
                }}
              >
                {onInteraction &&
                  scene?.interactions
                    ?.filter((interaction) => interaction.kind !== "data")
                    .map((interaction) => (
                      <DiagramInteractionTarget
                        key={interaction.id}
                        interaction={interaction}
                        scale={viewport.scale * zoomCommit.factor}
                        bounds={bounds}
                        theme={theme}
                        onPress={() => {
                          if (
                            !inlineZoom.pinching.get() &&
                            Date.now() - inlineZoom.lastEndedTimestamp.get() >= 180
                          )
                            onInteraction(interaction);
                        }}
                        testID={
                          props.testID ? `${props.testID}-target-${interaction.id}` : undefined
                        }
                      />
                    ))}
              </Pressable>
            </Animated.ScrollView>
          </GestureDetector>
        </VerticalContainer>
      </View>
      {collapsed && (
        <Pressable
          accessibilityRole="button"
          onPress={onExpand ?? (() => setShowFull(true))}
          style={{ paddingVertical: 12, alignItems: "center" }}
        >
          <Text style={{ color: theme.nodeText, fontSize: theme.fontSize }}>Show full diagram</Text>
        </Pressable>
      )}
      <Modal visible={showFull} onRequestClose={() => setShowFull(false)} animationType="fade">
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
          <DiagramViewer
            source={props.source}
            theme={props.theme}
            fontProvider={props.fontProvider}
            assets={props.assets}
            execution={props.execution}
            onInteraction={onInteraction}
            renderDataDetail={renderDataDetail}
            onClose={() => setShowFull(false)}
          />
        </SafeAreaView>
      </Modal>
      {selection &&
        (renderDataDetail ? (
          renderDataDetail(selection, () => setSelection(undefined))
        ) : (
          <DiagramDetail
            selection={selection}
            theme={theme}
            onDismiss={() => setSelection(undefined)}
            testID={props.testID ? `${props.testID}-detail` : undefined}
          />
        ))}
    </View>
  );
}
export interface DiagramViewerProps {
  execution?: DiagramExecutionState;
  /** Change this token to replay entrance motion without changing diagram geometry. */
  replayToken?: string | number;
  source: string;
  theme?: Partial<DiagramTheme>;
  fontProvider?: SkTypefaceFontProvider;
  assets?: NativeRenderAssets;
  onClose: () => void;
  onInteraction?: (interaction: DiagramInteraction) => void;
  /** Render selected data below the canvas; return null to suppress the default detail. */
  renderDataDetail?: (selection: DiagramInteraction, dismiss: () => void) => ReactNode;
  onCopySource?: () => void;
  onExport?: (kind: "png" | "svg", data: Uint8Array | string) => void | Promise<void>;
}
export function DiagramViewer(props: DiagramViewerProps) {
  const configuration = useDiagramConfiguration();
  const onInteraction = props.onInteraction ?? configuration.onInteraction;
  const renderDataDetail = props.renderDataDetail ?? configuration.renderDataDetail;
  const [selection, setSelection] = useState<DiagramInteraction>();
  const [exportError, setExportError] = useState<string>();
  const reduced = useReducedDiagramMotion();
  const motionMode =
    reduced || configuration.motion === false ? ReduceMotion.Always : ReduceMotion.System;
  const theme = useResolvedTheme(props.theme, props.source);
  const result = useDiagram(props.source, theme, undefined, props.fontProvider, props.assets, {
    animate: true,
    replayToken: props.replayToken,
  });
  const exportDiagram = async (kind: "png" | "svg") => {
    if (result.status !== "ready" || !props.onExport) return;
    try {
      const data =
        kind === "svg"
          ? renderToSvg(result.scene, result.theme)
          : renderToPng(Skia, result.scene, result.theme, 2, result.fontProvider, result.assets);
      await props.onExport(kind, data);
      setExportError(undefined);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Diagram export failed");
    }
  };
  const dimensions = useWindowDimensions();
  const [viewport, setViewport] = useState<{ width: number; height: number }>();
  const viewportRef = useRef<View>(null);
  const viewportWidth = viewport?.width ?? dimensions.width;
  const bounds =
    result.status === "ready" ? result.scene.bounds : { x: 0, y: 0, width: 1, height: 1 };
  const viewportHeight = Math.max(1, viewport?.height ?? dimensions.height - 100);
  const fit =
    result.status === "ready"
      ? Math.min(
          1,
          viewportWidth / result.scene.bounds.width,
          viewportHeight / result.scene.bounds.height,
        )
      : 1;
  const zoom = useSharedValue(1),
    savedZoom = useSharedValue(1),
    x = useSharedValue(0),
    y = useSharedValue(0),
    savedX = useSharedValue(0),
    savedY = useSharedValue(0);
  const scene = result.status === "ready" ? result.scene : undefined;
  useEffect(() => setSelection(undefined), [scene]);
  const selectAt = useCallback(
    (pointX: number, pointY: number) => {
      if (!scene) return;
      const scale = zoom.get();
      const hit = hitTestInteraction(
        scene,
        viewerPointToScene(
          { x: pointX, y: pointY },
          bounds,
          { width: viewportWidth, height: viewportHeight },
          scale,
          { x: x.get(), y: y.get() },
        ),
      );
      if (!hit) return;
      if (hit.kind === "data") setSelection((current) => nextDataSelection(current, hit));
      onInteraction?.(hit);
    },
    [scene, zoom, x, y, bounds, viewportWidth, viewportHeight, onInteraction],
  );
  const selectAtWindowPoint = useCallback(
    (absoluteX: number, absoluteY: number) => {
      // Gesture Handler's Canvas-local coordinates can include a native host
      // inset. Both absolute gesture coordinates and measureInWindow use the
      // window coordinate space, so derive the viewport point from that origin.
      viewportRef.current?.measureInWindow((left, top, width, height) => {
        const localX = absoluteX - left,
          localY = absoluteY - top;
        if (
          width > 0 &&
          height > 0 &&
          localX >= 0 &&
          localY >= 0 &&
          localX <= width &&
          localY <= height
        )
          selectAt(localX, localY);
      });
    },
    [selectAt],
  );
  const previousView = useRef<{ scene: Scene; fit: number } | undefined>(undefined);
  const [preparedView, setPreparedView] = useState<{
    scene: Scene;
    width: number;
    height: number;
  }>();
  useLayoutEffect(() => {
    if (!scene) return;
    const previous = previousView.current;
    previousView.current = { scene, fit };
    if (!previous || previous.scene !== scene) {
      zoom.set(fit);
      savedZoom.set(fit);
      x.set(0);
      y.set(0);
      savedX.set(0);
      savedY.set(0);
      setPreparedView({ scene, width: viewportWidth, height: viewportHeight });
      return;
    }
    // A detail caption or rotation changes the viewport, not the user's pan/zoom choice.
    const scale =
      Math.abs(zoom.get() - previous.fit) < 0.001 ? fit : clampViewerZoom(zoom.get(), fit);
    const offsetX = Math.max(
      -panLimit(bounds.width, viewportWidth, scale),
      Math.min(panLimit(bounds.width, viewportWidth, scale), x.get()),
    );
    const offsetY = Math.max(
      -panLimit(bounds.height, viewportHeight, scale),
      Math.min(panLimit(bounds.height, viewportHeight, scale), y.get()),
    );
    zoom.set(scale);
    savedZoom.set(scale);
    x.set(offsetX);
    y.set(offsetY);
    savedX.set(offsetX);
    savedY.set(offsetY);
    setPreparedView({ scene, width: viewportWidth, height: viewportHeight });
  }, [
    scene,
    fit,
    bounds.width,
    bounds.height,
    viewportWidth,
    viewportHeight,
    zoom,
    savedZoom,
    x,
    y,
    savedX,
    savedY,
  ]);
  const gesture = useMemo(
    () =>
      Gesture.Simultaneous(
        Gesture.Pinch()
          .onBegin(() => {
            savedZoom.set(zoom.get());
          })
          .onUpdate((e) => {
            zoom.set(clampViewerZoom(savedZoom.get() * e.scale, fit));
            const maxX = panLimit(bounds.width, viewportWidth, zoom.get()),
              maxY = panLimit(bounds.height, viewportHeight, zoom.get());
            x.set(Math.max(-maxX, Math.min(maxX, x.get())));
            y.set(Math.max(-maxY, Math.min(maxY, y.get())));
          })
          .onEnd(() => {
            savedZoom.set(zoom.get());
          }),
        Gesture.Pan()
          .maxPointers(1)
          .onBegin(() => {
            savedX.set(x.get());
            savedY.set(y.get());
          })
          .onUpdate((e) => {
            const maxX = panLimit(bounds.width, viewportWidth, zoom.get()) + 24;
            const maxY = panLimit(bounds.height, viewportHeight, zoom.get()) + 24;
            x.set(Math.max(-maxX, Math.min(maxX, savedX.get() + e.translationX)));
            y.set(Math.max(-maxY, Math.min(maxY, savedY.get() + e.translationY)));
          })
          .onEnd(() => {
            const maxX = panLimit(bounds.width, viewportWidth, zoom.get()),
              maxY = panLimit(bounds.height, viewportHeight, zoom.get());
            const targetX = Math.max(-maxX, Math.min(maxX, x.get())),
              targetY = Math.max(-maxY, Math.min(maxY, y.get()));
            x.set(withSpring(targetX, { reduceMotion: motionMode }));
            y.set(withSpring(targetY, { reduceMotion: motionMode }));
            savedX.set(targetX);
            savedY.set(targetY);
          }),
        Gesture.Exclusive(
          Gesture.Tap()
            .numberOfTaps(2)
            .onEnd(() => {
              zoom.set(Math.abs(zoom.get() - fit) < 0.001 ? 1 : fit);
              savedZoom.set(zoom.get());
              x.set(0);
              y.set(0);
              savedX.set(0);
              savedY.set(0);
            }),
          Gesture.Tap()
            .runOnJS(true)
            .onEnd((event, success) => {
              if (success) selectAtWindowPoint(event.absoluteX, event.absoluteY);
            }),
        ),
      ),
    [
      zoom,
      savedZoom,
      x,
      y,
      savedX,
      savedY,
      fit,
      bounds.width,
      bounds.height,
      viewportWidth,
      viewportHeight,
      motionMode,
      selectAtWindowPoint,
    ],
  );
  const controlStyle = {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 10,
    justifyContent: "center" as const,
    borderRadius: Math.min(12, theme.radius),
    borderWidth: theme.controlBorderWidth ?? StyleSheet.hairlineWidth,
    borderColor: theme.gridStroke ?? theme.clusterStroke,
    backgroundColor: theme.nodeFill,
  };
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, padding: 12 }}>
        <Pressable
          style={controlStyle}
          accessibilityRole="button"
          accessibilityLabel="Close diagram"
          testID="diagram-close"
          onPress={props.onClose}
        >
          <Text style={{ color: theme.nodeText, fontSize: 14, fontWeight: "500" }}>Close</Text>
        </Pressable>
        {result.status === "ready"
          ? [
              ["Fit", fit],
              ["100%", 1],
            ].map(([label, scale]) => (
              <Pressable
                key={label}
                testID={label === "Fit" ? "diagram-fit" : "diagram-actual-size"}
                accessibilityRole="button"
                accessibilityLabel={label === "Fit" ? "Fit diagram" : "Diagram actual size"}
                style={controlStyle}
                onPress={() => {
                  zoom.set(withTiming(Number(scale), { duration: 260, reduceMotion: motionMode }));
                  savedZoom.set(Number(scale));
                  x.set(withTiming(0, { duration: 260, reduceMotion: motionMode }));
                  y.set(withTiming(0, { duration: 260, reduceMotion: motionMode }));
                  savedX.set(0);
                  savedY.set(0);
                }}
              >
                <Text style={{ color: theme.nodeText, fontSize: 14, fontWeight: "500" }}>
                  {label}
                </Text>
              </Pressable>
            ))
          : null}
        {props.onCopySource ? (
          <Pressable
            style={controlStyle}
            accessibilityRole="button"
            accessibilityLabel="Copy source"
            onPress={props.onCopySource}
          >
            <Text style={{ color: theme.nodeText }}>Copy</Text>
          </Pressable>
        ) : null}
        {result.status === "ready" && props.onExport ? (
          <>
            <Pressable
              style={controlStyle}
              accessibilityRole="button"
              accessibilityLabel="Export SVG"
              onPress={() => {
                void exportDiagram("svg");
              }}
            >
              <Text style={{ color: theme.nodeText }}>SVG</Text>
            </Pressable>
            <Pressable
              style={controlStyle}
              accessibilityRole="button"
              accessibilityLabel="Export PNG"
              onPress={() => {
                void exportDiagram("png");
              }}
            >
              <Text style={{ color: theme.nodeText }}>PNG</Text>
            </Pressable>
          </>
        ) : null}
      </View>
      {exportError ? (
        <Text accessibilityRole="alert" style={{ color: theme.nodeText }}>
          {exportError}
        </Text>
      ) : null}
      {result.status === "ready" ? (
        <View
          ref={viewportRef}
          collapsable={false}
          testID="diagram-viewer-viewport"
          style={{ flex: 1 }}
          // Skia 3/Fabric explicitly rejects Canvas.onLayout. Measure the RN
          // container instead; its flex child Canvas fills exactly this area.
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            if (width > 0 && height > 0)
              setViewport((previous) =>
                previous?.width === width && previous.height === height
                  ? previous
                  : { width, height },
              );
          }}
        >
          {viewport &&
            preparedView &&
            preparedView.scene === scene &&
            preparedView.width === viewportWidth &&
            preparedView.height === viewportHeight && (
              <GestureDetector gesture={gesture}>
                <Canvas
                  testID="diagram-viewer-canvas"
                  accessibilityRole="image"
                  accessibilityLabel={scene?.accessibilityLabel}
                  accessibilityActions={scene?.interactions
                    ?.filter((item) => item.kind === "data")
                    .map((item) => ({
                      name: item.id,
                      label:
                        selection?.id === item.id
                          ? `Restore ${item.label}`
                          : `Show ${item.label} detail`,
                    }))}
                  onAccessibilityAction={(event) => {
                    const item = scene?.interactions?.find(
                      (target) =>
                        target.kind === "data" && target.id === event.nativeEvent.actionName,
                    );
                    if (item) {
                      setSelection((current) => nextDataSelection(current, item));
                      onInteraction?.(item);
                    }
                  }}
                  style={{ flex: 1, backgroundColor: theme.background }}
                >
                  <ViewerSceneTransform
                    key={`${identity(scene)}:${viewportWidth}:${viewportHeight}`}
                    bounds={bounds}
                    width={viewportWidth}
                    height={viewportHeight}
                    zoom={zoom}
                    x={x}
                    y={y}
                  >
                    <DataSelectionScene
                      scene={result.scene}
                      theme={result.theme}
                      fontProvider={result.fontProvider}
                      assets={result.assets}
                      selection={selection}
                      onTakeOver={result.onMotionComplete}
                    >
                      <MotionPicture
                        key={result.motionSession}
                        picture={result.picture}
                        motion={result.motion}
                        kind={result.scene.kind}
                        onComplete={result.onMotionComplete}
                      />
                    </DataSelectionScene>
                    {props.execution && (
                      <ExecutionOverlay
                        scene={result.scene}
                        execution={props.execution}
                        theme={theme}
                        fontProvider={result.fontProvider}
                        assets={result.assets}
                        onError={result.onRenderError}
                      />
                    )}
                  </ViewerSceneTransform>
                </Canvas>
              </GestureDetector>
            )}
        </View>
      ) : result.status === "error" ? (
        <DiagramFallback source={props.source} error={result.error} theme={theme} />
      ) : result.status === "unsupported" ? (
        <DiagramFallback source={props.source} theme={theme} />
      ) : null}
      {selection && (
        <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
          {renderDataDetail ? (
            renderDataDetail(selection, () => setSelection(undefined))
          ) : (
            <DiagramDetail
              selection={selection}
              theme={theme}
              onDismiss={() => setSelection(undefined)}
              testID="diagram-viewer-detail"
            />
          )}
        </View>
      )}
    </View>
  );
}

function ViewerSceneTransform({
  bounds,
  width,
  height,
  zoom,
  x,
  y,
  children,
}: {
  bounds: Scene["bounds"];
  width: number;
  height: number;
  zoom: import("react-native-reanimated").SharedValue<number>;
  x: import("react-native-reanimated").SharedValue<number>;
  y: import("react-native-reanimated").SharedValue<number>;
  children: ReactNode;
}) {
  // This node mounts only with measured geometry and initialized zoom; it never
  // inherits a derived transform created while the scene was still preparing.
  const transform = useDerivedValue(() => [
    { translateX: (width - bounds.width * zoom.get()) / 2 + x.get() - bounds.x * zoom.get() },
    { translateY: (height - bounds.height * zoom.get()) / 2 + y.get() - bounds.y * zoom.get() },
    { scale: zoom.get() },
  ]);
  return (
    <Group clip={{ x: 0, y: 0, width, height }}>
      <Group layer={<Paint />}>
        <Group transform={transform}>{children}</Group>
      </Group>
    </Group>
  );
}
