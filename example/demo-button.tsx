import { MotionPressable as Pressable } from "./motion.tsx";
import { createContext, useContext } from "react";
import { Text, type ButtonProps, type AccessibilityState } from "react-native";
import { lightTheme, type DiagramTheme } from "@osuki-dev/skia-diagrams";

export const DemoTheme = createContext<DiagramTheme>(lightTheme);
/** Example-owned flat controls, not a UI package or production dependency. */
export function DemoButton({
  title,
  onPress,
  disabled,
  testID,
  accessibilityLabel,
  accessibilityState,
}: ButtonProps & { accessibilityState?: AccessibilityState }) {
  const theme = useContext(DemoTheme);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title.toUpperCase()}
      accessibilityState={{ ...accessibilityState, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        minWidth: 44,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: accessibilityState?.selected
          ? theme.accent
          : (theme.gridStroke ?? theme.clusterStroke),
        backgroundColor: accessibilityState?.selected
          ? theme.noteFill
          : pressed
            ? (theme.headerFill ?? theme.clusterFill)
            : theme.nodeFill,
        opacity: disabled ? 0.5 : 1,
        justifyContent: "center",
      })}
    >
      <Text style={{ color: theme.nodeText, fontSize: 14, fontWeight: "500" }}>{title}</Text>
    </Pressable>
  );
}
