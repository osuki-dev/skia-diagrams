import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Group,
  Paint,
  Picture,
  Skia,
  type SkPicture,
  type SkTypefaceFontProvider,
} from "react-native-skia";
import {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import type { Primitive, Scene } from "../types.ts";
import type { DiagramTheme } from "../render/theme.ts";
import { renderToPicture, type NativeRenderAssets } from "../render/skia.ts";
import {
  executionPrimitives,
  type DiagramExecutionState,
  type DiagramExecutionStatus,
} from "./execution-state.ts";
import { useDiagramConfiguration } from "./provider.tsx";
import { useReducedDiagramMotion } from "./motion-preference.ts";
import { NativeTraces, recordNativeTraces } from "./native-trace.tsx";

export interface ExecutionOverlayProps {
  scene: Scene;
  execution: DiagramExecutionState;
  theme: DiagramTheme;
  fontProvider?: SkTypefaceFontProvider;
  assets?: NativeRenderAssets;
  onError?: (error: unknown) => void;
}
type Recording = {
  labelsPicture?: SkPicture;
  markersPicture?: SkPicture;
  activePicture?: SkPicture;
  settledPicture?: SkPicture;
  traces: ReturnType<typeof recordNativeTraces>["traces"];
  active: boolean;
  id: number;
  request: Omit<ExecutionOverlayProps, "execution"> &
    Pick<DiagramExecutionState, "nodes" | "edges" | "revision">;
  resources: { dispose(): void }[];
};

/** Local state overlays reuse measured geometry. Only a state/font/theme change
 * records these small Pictures; pulse and path progress remain on the UI thread. */
export function ExecutionOverlay({
  scene,
  execution,
  theme,
  fontProvider,
  assets,
  onError,
}: ExecutionOverlayProps) {
  const [recording, setRecording] = useState<Recording>();
  const generation = useRef(0);
  const pool = useRef(new Set<Recording>()),
    pending = useRef<Recording | undefined>(undefined);
  useLayoutEffect(() => {
    const resources: { dispose(): void }[] = [];
    const labels: Primitive[] = [],
      activeNodes: Primitive[] = [],
      settledNodes: Primitive[] = [];
    const activePaths: Extract<Primitive, { type: "path" }>[] = [],
      settledPaths: Extract<Primitive, { type: "path" }>[] = [];
    const nodeStroke = theme.strokeWidth * (theme.lineWeights?.node ?? 1) * 1.8;
    const edgeStroke = theme.strokeWidth * (theme.lineWeights?.edge ?? 1) * 1.8;
    const color = (status: DiagramExecutionStatus) =>
      status === "completed"
        ? (theme.palette?.[2] ?? theme.accent)
        : status === "error"
          ? (theme.palette?.[0] ?? theme.accent)
          : theme.accent;
    for (const { primitive: p, status } of executionPrimitives(scene, execution)) {
      if (p.type === "text") labels.push({ ...p, color: color(status) });
      else if (p.semantic?.kind === "edge" && p.type === "path") {
        const path = {
          ...p,
          stroke: color(status),
          gradient: undefined,
          strokeWidth: Math.max(edgeStroke, p.strokeWidth ?? 0),
          ...(status === "error" ? { dash: [4, 3] } : {}),
        };
        (status === "active" ? activePaths : settledPaths).push(path);
      } else if ((p.type === "shape" || p.type === "image") && p.semantic?.part === "body") {
        const focus: Primitive = {
          ...p,
          type: "shape",
          shape: p.type === "image" ? "rect" : p.shape,
          x: p.x - 3,
          y: p.y - 3,
          width: p.width + 6,
          height: p.height + 6,
          fill: "transparent",
          stroke: color(status),
          strokeWidth: Math.max(nodeStroke, p.strokeWidth ?? 0),
          ...(status === "error" ? { dash: [4, 3] } : {}),
        };
        (status === "active" ? activeNodes : settledNodes).push(focus);
      } else if (p.type === "path" && p.semantic?.kind === "node" && p.semantic.part === "body") {
        const focus: Primitive = {
          ...p,
          fill: "transparent",
          stroke: color(status),
          strokeWidth: Math.max(nodeStroke, p.strokeWidth ?? 0),
          ...(status === "error" ? { dash: [4, 3] } : {}),
        };
        (status === "active" ? activeNodes : settledNodes).push(focus);
      }
    }
    try {
      const picture = (primitives: Primitive[], markerOnly = false): SkPicture | undefined => {
        if (!primitives.length) return;
        const result = renderToPicture(
          Skia,
          { ...scene, primitives },
          theme,
          fontProvider,
          assets,
          { drawBackground: false, markerOnly },
        );
        resources.push(result);
        return result;
      };
      const markersPicture = picture(
        activePaths.filter(
          (path) => (path.start && path.start !== "none") || (path.end && path.end !== "none"),
        ),
        true,
      );
      const labelsPicture = picture(labels),
        activePicture = picture(activeNodes),
        settledPicture = picture([...settledNodes, ...settledPaths]);
      const traces = recordNativeTraces(activePaths, theme);
      resources.push(...traces.resources);
      const next: Recording = {
        id: ++generation.current,
        request: {
          scene,
          nodes: execution.nodes,
          edges: execution.edges,
          revision: execution.revision,
          theme,
          fontProvider,
          assets,
        },
        labelsPicture,
        markersPicture,
        activePicture,
        settledPicture,
        traces: traces.traces,
        active: activeNodes.length > 0 || activePaths.length > 0,
        resources,
      };
      pool.current.add(next);
      pending.current = next;
      setRecording(next);
    } catch (error) {
      for (const resource of resources) resource.dispose();
      pending.current = undefined;
      setRecording(undefined);
      onError?.(error);
    }
  }, [
    scene,
    execution.nodes,
    execution.edges,
    execution.revision,
    theme,
    fontProvider,
    assets,
    onError,
  ]);
  useEffect(() => {
    if (pending.current === recording) pending.current = undefined;
    for (const previous of pool.current)
      if (previous !== recording && previous !== pending.current) {
        for (const resource of previous.resources) resource.dispose();
        pool.current.delete(previous);
      }
  }, [recording]);
  useEffect(
    () => () => {
      for (const previous of pool.current)
        for (const resource of previous.resources) resource.dispose();
      pool.current.clear();
      pending.current = undefined;
    },
    [],
  );
  if (
    !recording ||
    recording.request.scene !== scene ||
    recording.request.nodes !== execution.nodes ||
    recording.request.edges !== execution.edges ||
    recording.request.revision !== execution.revision ||
    recording.request.theme !== theme ||
    recording.request.fontProvider !== fontProvider ||
    recording.request.assets !== assets
  )
    return null;
  return <AnimatedExecution key={recording.id} recording={recording} />;
}
function AnimatedExecution({ recording }: { recording: Recording }) {
  const { motion } = useDiagramConfiguration();
  const reduced = useReducedDiagramMotion();
  const progress = useSharedValue(motion === false || reduced ? 1 : 0),
    pulse = useSharedValue(1);
  const markersOpacity = useDerivedValue(() => (progress.get() >= 1 ? 1 : 0));
  useLayoutEffect(() => {
    const enabled = motion !== false && !reduced && recording?.active;
    const requestedDuration = motion === false ? 0 : (motion?.duration ?? 650);
    const duration = Number.isFinite(requestedDuration)
      ? Math.max(0, Math.min(2000, requestedDuration))
      : 650;
    cancelAnimation(progress);
    cancelAnimation(pulse);
    if (!enabled || !duration) {
      progress.set(1);
      pulse.set(1);
      return;
    }
    progress.set(0);
    pulse.set(1);
    progress.set(
      withTiming(1, {
        duration,
        easing: Easing.inOut(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      }),
    );
    pulse.set(
      withSequence(
        withRepeat(
          withSequence(
            withTiming(0.45, { duration: duration * 0.4, reduceMotion: ReduceMotion.System }),
            withTiming(1, { duration: duration * 0.4, reduceMotion: ReduceMotion.System }),
          ),
          2,
          false,
        ),
        withTiming(1, { duration: 0 }),
      ),
    );
    return () => {
      cancelAnimation(progress);
      cancelAnimation(pulse);
    };
  }, [recording, motion, reduced, progress, pulse]);
  return (
    <Group>
      {recording.settledPicture ? <Picture picture={recording.settledPicture} /> : null}
      <NativeTraces traces={recording.traces} progress={progress} />
      {recording.markersPicture ? (
        <Group layer={<Paint opacity={markersOpacity} />}>
          <Picture picture={recording.markersPicture} />
        </Group>
      ) : null}
      {recording.activePicture ? (
        <Group layer={<Paint opacity={pulse} />}>
          <Picture picture={recording.activePicture} />
        </Group>
      ) : null}
      {recording.labelsPicture ? <Picture picture={recording.labelsPicture} /> : null}
    </Group>
  );
}
