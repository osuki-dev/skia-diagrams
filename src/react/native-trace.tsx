import { DashPathEffect, LinearGradient, Path, Skia } from "react-native-skia";
import { useDerivedValue, type SharedValue } from "react-native-reanimated";
import type { DiagramTheme } from "../render/theme.ts";
import {
  recordNativeTracesWithApi,
  type NativeTraceRecord,
  type TracePrimitive,
} from "./native-trace-core.ts";
export type { NativeTraceRecord } from "./native-trace-core.ts";

export function recordNativeTraces(primitives: readonly TracePrimitive[], theme: DiagramTheme) {
  return recordNativeTracesWithApi(Skia, primitives, theme);
}

/** Native Skia trims the shaft on the UI thread; marker Pictures have separate timing. */
export function NativeTraces({
  traces,
  progress,
}: {
  traces: readonly NativeTraceRecord[];
  progress: SharedValue<number>;
}) {
  const end = useDerivedValue(() => {
    const value = Math.max(0, Math.min(1, progress.get()));
    return 1 - (1 - value) ** 3;
  });
  return (
    <>
      {traces.map((trace, index) => (
        <Path
          key={index}
          path={trace.path}
          style="stroke"
          color={trace.gradient ? "#FFFFFF" : trace.color}
          strokeWidth={trace.width}
          opacity={trace.opacity}
          strokeCap="round"
          strokeJoin="round"
          start={0}
          end={end}
        >
          {trace.dash && <DashPathEffect intervals={trace.dash} phase={0} />}
          {trace.gradient && (
            <LinearGradient
              start={trace.gradient.from}
              end={trace.gradient.to}
              colors={trace.gradient.colors}
              positions={trace.gradient.positions}
            />
          )}
        </Path>
      ))}
    </>
  );
}
