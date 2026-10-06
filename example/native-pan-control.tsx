import { useMemo, useState } from "react";
import { Button, Text, View } from "react-native";
import { Canvas, Group, Rect } from "react-native-skia";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";

/** Identical bounded UI-thread gestures, with no parser, Picture or Paragraph.
 * This control isolates the emulator/native-view path from diagram content. */
export function NativePanControl({ onClose }: { onClose(): void }) {
  const [skia, setSkia] = useState(false);
  const x = useSharedValue(0),
    y = useSharedValue(0),
    startX = useSharedValue(0),
    startY = useSharedValue(0);
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .maxPointers(1)
        .onBegin(() => {
          startX.set(x.get());
          startY.set(y.get());
        })
        .onUpdate((e) => {
          x.set(Math.max(-60, Math.min(60, startX.get() + e.translationX)));
          y.set(Math.max(-60, Math.min(60, startY.get() + e.translationY)));
        }),
    [x, y, startX, startY],
  );
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }],
  }));
  const transform = useDerivedValue(() => [{ translateX: x.get() }, { translateY: y.get() }]);
  return (
    <View style={{ flex: 1 }}>
      <Button title="Close pan control" onPress={onClose} />
      <Button
        title={skia ? "Use plain native View" : "Use minimal Skia rect"}
        onPress={() => setSkia(!skia)}
      />
      <Text>
        {skia ? "Minimal Skia control" : "Plain native View control"}: no diagram recording or JS
        update callbacks
      </Text>
      <GestureDetector gesture={gesture}>
        {skia ? (
          <Canvas style={{ flex: 1 }}>
            <Group transform={transform}>
              <Rect x={80} y={240} width={200} height={100} color="#6366f1" />
            </Group>
          </Canvas>
        ) : (
          <View style={{ flex: 1 }}>
            <Animated.View
              style={[
                {
                  position: "absolute",
                  left: 80,
                  top: 240,
                  width: 200,
                  height: 100,
                  backgroundColor: "#6366f1",
                },
                style,
              ]}
            />
          </View>
        )}
      </GestureDetector>
    </View>
  );
}
