import { Pressable, type PressableProps, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence,
} from "react-native-reanimated";

export const pageEntrance = FadeInDown.duration(240).reduceMotion(ReduceMotion.System);
export const sectionEntrance = FadeIn.duration(180).reduceMotion(ReduceMotion.System);
const timing = {
  duration: 180,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
};

/** Animate the content while preserving the native hit target and accessibility node. */
export function MotionPressable({
  children,
  onPressIn,
  onPressOut,
  contentStyle,
  ...props
}: PressableProps & { contentStyle?: ViewStyle }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      {...props}
      onPressIn={(event) => {
        scale.value = withTiming(0.95, { ...timing, duration: 70 });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = withSequence(
          ReduceMotion.System,
          withTiming(0.95, { ...timing, duration: 70 }),
          withTiming(1, { ...timing, duration: 240 }),
        );
        onPressOut?.(event);
      }}
    >
      {(state) => (
        <Animated.View
          style={[{ alignSelf: "stretch", alignItems: "center" }, contentStyle, animatedStyle]}
        >
          {typeof children === "function" ? children(state) : children}
        </Animated.View>
      )}
    </Pressable>
  );
}
