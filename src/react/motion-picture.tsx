import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { Group, Paint, Picture, Skia, Text, type SkPicture } from "react-native-skia";
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
import { diagramMotionDuration } from "./motion-duration.ts";
import { NativeTraces } from "./native-trace.tsx";
import { useDiagramConfiguration } from "./provider.tsx";
import type { RecordedMotion } from "./record-motion.ts";
import { useReducedDiagramMotion } from "./motion-preference.ts";

function MotionLayer({
  layer,
  progress,
}: {
  layer: RecordedMotion["layers"][number];
  progress: SharedValue<number>;
}) {
  const { mode, delay, span, bounds, baseline, center, easing } = layer;
  const local = useDerivedValue(() =>
    Math.max(0, Math.min(1, (progress.get() - delay) / (span ?? 1 - delay))),
  );
  const opacity = useDerivedValue(() => {
    const value = local.get();
    return mode === "fade" || mode === "lift" ? 1 - (1 - value) ** 3 : value > 0 ? 1 : 0;
  });
  const transform = useDerivedValue(() => {
    const value = 1 - (1 - local.get()) ** 3;
    const b = bounds;
    if (mode === "lift") return [{ translateY: (1 - value) * 12 }];
    const cx = center?.x ?? b.x + b.width / 2;
    const cy = center?.y ?? b.y + b.height / 2;
    if (mode === "scale")
      return [
        { translateX: cx },
        { translateY: cy },
        { scale: value },
        { translateX: -cx },
        { translateY: -cy },
      ];
    if (mode === "grow-x" && baseline !== undefined)
      return [{ translateX: baseline }, { scaleX: value }, { translateX: -baseline }];
    if (mode === "grow-y" && baseline !== undefined)
      return [{ translateY: baseline }, { scaleY: value }, { translateY: -baseline }];
    return [];
  });
  const markerOpacity = useDerivedValue(() => (local.get() >= 1 ? 1 : 0));
  const clipping = mode === "radial" || mode === "draw-x" || mode === "draw-y";
  // Native paths inherit paint opacity; recorded Pictures need group compositing.
  return (
    <Group
      transform={transform}
      opacity={layer.picture ? undefined : opacity}
      layer={layer.picture ? <Paint opacity={opacity} /> : undefined}
    >
      {layer.traces && <NativeTraces traces={layer.traces} progress={local} easing={easing} />}
      {layer.picture &&
        (clipping ? (
          <ClippedPicture layer={layer} progress={local} />
        ) : (
          <Picture picture={layer.picture} />
        ))}
      {layer.markerPicture && (
        <Group layer={<Paint opacity={markerOpacity} />}>
          <Picture picture={layer.markerPicture} />
        </Group>
      )}
    </Group>
  );
}
function ClippedPicture({
  layer,
  progress,
}: {
  layer: RecordedMotion["layers"][number];
  progress: SharedValue<number>;
}) {
  const { mode, bounds: b, circle, regions, easing } = layer;
  const clip = useDerivedValue(() => {
    const value = progress.get();
    const eased = easing === "linear" ? value : 1 - (1 - value) ** 3;
    // Axis reveals need only a rect; avoid allocating native paths every frame.
    if ((mode === "draw-x" || mode === "draw-y") && (!regions || regions.length === 1)) {
      const rect = regions?.[0] ?? b;
      return {
        ...rect,
        width: rect.width * (mode === "draw-x" ? eased : 1),
        height: rect.height * (mode === "draw-y" ? eased : 1),
      };
    }
    if (value >= 1) return b;
    const builder = Skia.PathBuilder.Make();
    if (mode === "radial" && circle && value < 1) {
      const c = circle;
      builder
        .moveTo(c.cx, c.cy)
        .lineTo(c.cx + Math.cos(c.startAngle) * c.radius, c.cy + Math.sin(c.startAngle) * c.radius);
      builder
        .arcToOval(
          {
            x: c.cx - c.radius - 1,
            y: c.cy - c.radius - 1,
            width: c.radius * 2 + 2,
            height: c.radius * 2 + 2,
          },
          (c.startAngle * 180) / Math.PI,
          ((c.sweepAngle * 180) / Math.PI) * eased,
          false,
        )
        .close();
    } else if (regions) {
      for (const region of regions)
        builder.addRect({
          ...region,
          width: region.width * (mode === "draw-x" ? eased : 1),
          height: region.height * (mode === "draw-y" ? eased : 1),
        });
    } else builder.addRect(b);
    const path = builder.detach();
    builder.dispose();
    return path;
  });
  return (
    <Group clip={clip}>
      <Picture picture={layer.picture!} />
    </Group>
  );
}

function MotionNumber({
  number,
  progress,
}: {
  number: RecordedMotion["numbers"][number];
  progress: SharedValue<number>;
}) {
  const { prefix, suffix, value, decimals, delay, span } = number;
  const text = useDerivedValue(() => {
    const p = Math.max(0, Math.min(1, (progress.get() - delay) / (span ?? 1 - delay)));
    return prefix + (value * (1 - (1 - p) ** 3)).toFixed(decimals) + suffix;
  });
  const alpha = number.primitive.opacity ?? 1;
  const opacity = useDerivedValue(
    () => Math.max(0, Math.min(1, (progress.get() - delay) / Math.min(0.12, span))) * alpha,
  );
  return (
    <Text
      opacity={opacity}
      x={number.primitive.x}
      y={number.baseline}
      font={number.font}
      color={number.color}
      text={text}
    />
  );
}
export function MotionPicture({
  picture,
  motion,
  kind,
  onComplete,
}: {
  picture: SkPicture;
  motion?: RecordedMotion;
  kind: string;
  onComplete?: () => void;
}) {
  const configuration = useDiagramConfiguration();
  const reduced = useReducedDiagramMotion();
  const progress = useSharedValue(0);
  const completion = useRef(onComplete);
  useLayoutEffect(() => {
    completion.current = onComplete;
    return () => {
      completion.current = undefined;
    };
  }, [onComplete]);
  const reportComplete = useCallback(() => completion.current?.(), []);
  const animated = motion !== undefined;
  const duration =
    configuration.motion === false || reduced
      ? 0
      : diagramMotionDuration(kind, configuration.motion?.duration);
  useEffect(() => {
    if (!animated) {
      progress.set(1);
      return;
    }
    if (duration === 0) {
      progress.set(1);
      reportComplete();
      return () => cancelAnimation(progress);
    }
    progress.set(0);
    progress.set(
      withTiming(
        1,
        { duration, easing: Easing.linear, reduceMotion: ReduceMotion.System },
        (finished?: boolean) => {
          if (finished) runOnJS(reportComplete)();
        },
      ),
    );
    return () => cancelAnimation(progress);
  }, [animated, progress, duration, reportComplete]);
  const finalOpacity = useDerivedValue(() => (progress.get() >= 1 ? 1 : 0));
  const motionOpacity = useDerivedValue(() => (progress.get() >= 1 ? 0 : 1));
  if (!motion || duration === 0) return <Picture picture={picture} />;
  return (
    <>
      <Group layer={<Paint opacity={finalOpacity} />}>
        <Picture picture={picture} />
      </Group>
      <Group layer={<Paint opacity={motionOpacity} />}>
        <Scaffold picture={motion.staticPicture} progress={progress} />
        {motion.layers.map((layer, i) => (
          <MotionLayer key={i} layer={layer} progress={progress} />
        ))}
        {motion.numbers.map((number, i) => (
          <MotionNumber key={i} number={number} progress={progress} />
        ))}
      </Group>
    </>
  );
}

function Scaffold({ picture, progress }: { picture: SkPicture; progress: SharedValue<number> }) {
  const opacity = useDerivedValue(() => Math.min(1, progress.get() / 0.12));
  return (
    <Group layer={<Paint opacity={opacity} />}>
      <Picture picture={picture} />
    </Group>
  );
}
