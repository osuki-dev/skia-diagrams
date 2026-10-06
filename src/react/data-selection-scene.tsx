import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
  runOnJS,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import type { DiagramInteraction, Scene } from "../types.ts";
import { renderToPicture, type NativeRenderAssets } from "../render/skia.ts";
import type { DiagramTheme } from "../render/theme.ts";
import { pieSelection } from "./pie-selection.ts";
import { useDiagramConfiguration } from "./provider.tsx";
import { useReducedDiagramMotion } from "./motion-preference.ts";

interface SelectionRecording {
  session: number;
  scene: Scene;
  theme: DiagramTheme;
  fontProvider?: SkTypefaceFontProvider;
  assets?: NativeRenderAssets;
  row: number;
  fixed: SkPicture;
  other: SkPicture;
  selected: SkPicture;
  offset: { x: number; y: number };
  resources: SkPicture[];
  previous?: SelectionRecording;
  previousProgress?: number;
}
/** Native vector selection is shared by inline and expanded views. It preserves
 * the authored scene and its hit geometry, and records only when selection changes. */
export function DataSelectionScene({
  scene,
  theme,
  fontProvider,
  assets,
  selection,
  onTakeOver,
  children,
}: {
  scene: Scene;
  theme: DiagramTheme;
  fontProvider?: SkTypefaceFontProvider;
  assets?: NativeRenderAssets;
  selection?: DiagramInteraction;
  onTakeOver?: () => void;
  children: ReactNode;
}) {
  const [recording, setRecording] = useState<SelectionRecording>();
  const nextSession = useRef(0);
  const pool = useRef(new Set<SkPicture>());
  const pending = useRef(new Set<SkPicture>());
  const current = useRef<SelectionRecording | undefined>(undefined);
  const currentProgress = useRef<SharedValue<number> | undefined>(undefined);
  useLayoutEffect(() => {
    current.current = recording;
  }, [recording]);
  const partition = useMemo(
    () => (selection ? pieSelection(scene, selection) : undefined),
    [scene, selection],
  );
  const row = partition?.row;
  useLayoutEffect(() => {
    if (row === undefined || !selection) return;
    if (!partition) return;
    const resources: SkPicture[] = [];
    const allocated: SkPicture[] = [];
    try {
      const record = (primitives: Scene["primitives"], drawBackground: boolean) => {
        const picture = renderToPicture(
          Skia,
          { ...scene, primitives },
          theme,
          fontProvider,
          assets,
          { drawBackground },
        );
        resources.push(picture);
        allocated.push(picture);
        pool.current.add(picture);
        return picture;
      };
      const previous = current.current;
      const sameContext =
        previous?.scene === scene &&
        previous.theme === theme &&
        previous.fontProvider === fontProvider &&
        previous.assets === assets;
      const fixed = sameContext ? previous.fixed : record(partition.fixed, true);
      if (sameContext) resources.push(fixed);
      const next: SelectionRecording = {
        session: ++nextSession.current,
        scene,
        theme,
        fontProvider,
        assets,
        row,
        fixed,
        other: record(partition.other, false),
        selected: record(partition.selected, false),
        offset: partition.offset,
        resources,
        previous:
          sameContext && previous.row !== row ? { ...previous, previous: undefined } : undefined,
        previousProgress: currentProgress.current?.get() ?? 1,
      };
      pending.current = new Set(resources);
      setRecording(next);
    } catch {
      for (const picture of allocated) {
        pool.current.delete(picture);
        picture.dispose();
      }
      pending.current.clear();
      setRecording(undefined);
    }
  }, [scene, theme, fontProvider, assets, partition, row]);
  useLayoutEffect(() => {
    setRecording((current) => {
      if (
        current &&
        (current.scene !== scene ||
          current.theme !== theme ||
          current.fontProvider !== fontProvider ||
          current.assets !== assets)
      ) {
        pending.current.clear();
        return undefined;
      }
      return current;
    });
  }, [scene, theme, fontProvider, assets]);
  useEffect(() => {
    const current = new Set([
      ...(recording?.resources ?? []),
      ...(recording?.previous?.resources ?? []),
    ]);
    for (const picture of pool.current)
      if (!current.has(picture) && !pending.current.has(picture)) {
        pool.current.delete(picture);
        picture.dispose();
      }
  }, [recording]);
  useEffect(
    () => () => {
      for (const picture of pool.current) picture.dispose();
      pool.current.clear();
      pending.current.clear();
    },
    [],
  );
  const matches =
    recording?.scene === scene &&
    recording.theme === theme &&
    recording.fontProvider === fontProvider &&
    recording.assets === assets;
  useEffect(() => {
    if (matches && row !== undefined) onTakeOver?.();
  }, [matches, row, onTakeOver]);
  if (!recording || !matches) return <>{children}</>;
  return (
    <SelectedPie
      key={recording.session}
      recording={recording}
      active={row !== undefined}
      onProgress={(progress) => {
        currentProgress.current = progress;
      }}
      onTransitionRest={() =>
        setRecording((value) =>
          value?.session === recording.session ? { ...value, previous: undefined } : value,
        )
      }
      onRest={() => {
        pending.current.clear();
        setRecording((current) => (current?.session === recording.session ? undefined : current));
      }}
    />
  );
}
function SelectedPie({
  recording,
  active,
  onRest,
  onProgress,
  onTransitionRest,
}: {
  recording: SelectionRecording;
  active: boolean;
  onRest: () => void;
  onProgress: (progress: SharedValue<number>) => void;
  onTransitionRest: () => void;
}) {
  const { motion } = useDiagramConfiguration();
  const callbacks = useRef({ onRest, onTransitionRest });
  useLayoutEffect(() => {
    callbacks.current = { onRest, onTransitionRest };
  }, [onRest, onTransitionRest]);
  const finishDismissal = useCallback(() => callbacks.current.onRest(), []);
  const finishTransition = useCallback(() => callbacks.current.onTransitionRest(), []);
  const reduced = useReducedDiagramMotion();
  const progress = useSharedValue(motion === false || reduced ? (active ? 1 : 0) : 0);
  const swapping = recording.previous !== undefined;
  const swapProgress = useSharedValue(!swapping || motion === false || reduced ? 1 : 0);
  useLayoutEffect(() => {
    onProgress(progress);
  }, [progress, onProgress]);
  useEffect(() => {
    progress.set(
      withTiming(
        active ? 1 : 0,
        {
          duration: motion === false || reduced ? 0 : active ? 240 : 180,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        },
        (finished?: boolean) => {
          if (finished && !active) runOnJS(finishDismissal)();
        },
      ),
    );
    return () => cancelAnimation(progress);
  }, [active, motion, reduced, progress, finishDismissal]);
  useEffect(() => {
    if (!swapping) return;
    swapProgress.set(
      withTiming(
        1,
        {
          duration: motion === false || reduced ? 0 : 240,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        },
        (finished?: boolean) => {
          if (finished) runOnJS(finishTransition)();
        },
      ),
    );
    return () => cancelAnimation(swapProgress);
  }, [swapping, motion, reduced, swapProgress, finishTransition]);
  const opacity = useDerivedValue(() => 1 - progress.get() * 0.34);
  const { x: offsetX, y: offsetY } = recording.offset;
  const transform = useDerivedValue(() => [
    { translateX: offsetX * progress.get() },
    { translateY: offsetY * progress.get() },
  ]);
  const previous = recording.previous;
  const previousAmount = recording.previousProgress ?? 1;
  const previousX = previous?.offset.x ?? 0,
    previousY = previous?.offset.y ?? 0;
  const previousOpacity = useDerivedValue(() => 1 - swapProgress.get());
  const previousOtherOpacity = useDerivedValue(
    () => 1 - 0.34 * previousAmount * (1 - swapProgress.get()),
  );
  const previousTransform = useDerivedValue(() => [
    { translateX: previousX * previousAmount * (1 - swapProgress.get()) },
    { translateY: previousY * previousAmount * (1 - swapProgress.get()) },
  ]);
  const hasPrevious = previous !== undefined;
  const nextOpacity = useDerivedValue(() => (hasPrevious ? swapProgress.get() : 1));
  return (
    <>
      {previous && (
        <Group layer={<Paint opacity={previousOpacity} />}>
          <Picture picture={previous.fixed} />
          <Group layer={<Paint opacity={previousOtherOpacity} />}>
            <Picture picture={previous.other} />
          </Group>
          <Group transform={previousTransform}>
            <Picture picture={previous.selected} />
          </Group>
        </Group>
      )}
      <Group layer={<Paint opacity={nextOpacity} />}>
        <Picture picture={recording.fixed} />
        <Group layer={<Paint opacity={opacity} />}>
          <Picture picture={recording.other} />
        </Group>
      </Group>
      <Group transform={transform}>
        <Picture picture={recording.selected} />
      </Group>
    </>
  );
}
