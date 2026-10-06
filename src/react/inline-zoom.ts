import { useCallback } from "react";
import {
  GestureStateManager,
  usePinchGesture,
  useNativeGesture,
  useSimultaneousGestures,
} from "react-native-gesture-handler";
import { runOnJS, useSharedValue, type SharedValue } from "react-native-reanimated";

export interface InlineZoomOptions {
  width: number;
  height: number;
  /** Scene dimensions before baseScale is applied. */
  contentWidth: number;
  contentHeight: number;
  baseScale: number;
  scrollX: SharedValue<number>;
  scrollY: SharedValue<number>;
  minFactor?: number;
  maxFactor?: number;
  onCommit: (factor: number, x: number, y: number) => void;
  onActiveChange?: (active: boolean) => void;
}

function positive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/** Pinch updates stay on the UI thread; committing updates native scroll extents
 * once. Pinching is direct manipulation and needs no motion preference override. */
export function useInlineZoom(options: InlineZoomOptions) {
  const { scrollX, scrollY, onCommit, onActiveChange } = options;
  const width = positive(options.width, 1),
    height = positive(options.height, 1),
    contentWidth = positive(options.contentWidth, 1) * positive(options.baseScale, 1),
    contentHeight = positive(options.contentHeight, 1) * positive(options.baseScale, 1),
    minFactor = Math.min(1, positive(options.minFactor ?? 0.5, 0.5)),
    maxFactor = Math.max(1, minFactor, positive(options.maxFactor ?? 6, 6));
  const zoom = useSharedValue(1),
    pinching = useSharedValue(false),
    lastEndedTimestamp = useSharedValue(0),
    startZoom = useSharedValue(1),
    anchorX = useSharedValue(0),
    anchorY = useSharedValue(0),
    startDistance = useSharedValue(1),
    firstPointer = useSharedValue(-1),
    secondPointer = useSharedValue(-1);

  const reset = useCallback(() => {
    zoom.set(1);
    scrollX.set(0);
    scrollY.set(0);
    startZoom.set(1);
    anchorX.set(0);
    anchorY.set(0);
    const wasActive = pinching.get();
    pinching.set(false);
    if (wasActive) {
      lastEndedTimestamp.set(Date.now());
      onActiveChange?.(false);
    }
  }, [
    zoom,
    scrollX,
    scrollY,
    startZoom,
    anchorX,
    anchorY,
    pinching,
    lastEndedTimestamp,
    onActiveChange,
  ]);

  // Detector-owned native Pinch manages release/cancel after its event dispatch.
  // Early activation avoids scroll slop without resetting native views from raw
  // touch callbacks, which run before the native bounds check.
  const native = useNativeGesture();
  const pinch = usePinchGesture({
    manualActivation: true,
    shouldCancelWhenOutside: false,
    onTouchesDown: (event) => {
      "worklet";
      if (pinching.get() || event.allTouches.length < 2) return;
      const first = event.allTouches[0],
        second = event.allTouches[1];
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      if (!Number.isFinite(distance) || distance < 1) return;
      firstPointer.set(first.id);
      secondPointer.set(second.id);
      startDistance.set(distance);
      startZoom.set(zoom.get());
      const focalX = (first.x + second.x) / 2,
        focalY = (first.y + second.y) / 2;
      anchorX.set((scrollX.get() + focalX) / startZoom.get());
      anchorY.set((scrollY.get() + focalY) / startZoom.get());
      pinching.set(true);
      GestureStateManager.activate(event.handlerTag);
      if (onActiveChange) runOnJS(onActiveChange)(true);
    },
    onTouchesMove: (event) => {
      "worklet";
      if (!pinching.get()) return;
      const first = event.allTouches.find((touch) => touch.id === firstPointer.get()),
        second = event.allTouches.find((touch) => touch.id === secondPointer.get());
      if (!first || !second) return;
      const distance = Math.hypot(second.x - first.x, second.y - first.y),
        focalX = (first.x + second.x) / 2,
        focalY = (first.y + second.y) / 2;
      if (!Number.isFinite(distance) || !Number.isFinite(focalX) || !Number.isFinite(focalY))
        return;
      const factor = Math.max(
        minFactor,
        Math.min(maxFactor, (startZoom.get() * distance) / startDistance.get()),
      );
      zoom.set(factor);
      scrollX.set(
        Math.max(
          0,
          Math.min(Math.max(0, contentWidth * factor - width), anchorX.get() * factor - focalX),
        ),
      );
      scrollY.set(
        Math.max(
          0,
          Math.min(Math.max(0, contentHeight * factor - height), anchorY.get() * factor - focalY),
        ),
      );
    },
    onFinalize: () => {
      "worklet";
      // A failed one-finger sequence has no zoom commit or host callbacks.
      if (!pinching.get()) return;
      pinching.set(false);
      lastEndedTimestamp.set(Date.now());
      runOnJS(onCommit)(zoom.get(), scrollX.get(), scrollY.get());
      if (onActiveChange) runOnJS(onActiveChange)(false);
    },
  });
  const gesture = useSimultaneousGestures(native, pinch);

  return { gesture, zoom, pinching, lastEndedTimestamp, reset };
}
