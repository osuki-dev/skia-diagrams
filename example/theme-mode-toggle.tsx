import { MotionPressable as Pressable } from "./motion.tsx";
import { Text, View } from "react-native";
import type { DiagramTheme } from "@osuki-dev/skia-diagrams";

export function ThemeModeToggle({
  dark,
  theme,
  onChange,
  testID,
}: {
  dark: boolean;
  theme: DiagramTheme;
  onChange: (dark: boolean) => void;
  testID: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        borderRadius: 24,
        padding: 2,
        backgroundColor: theme.headerFill,
      }}
    >
      {[false, true].map((mode) => (
        <Pressable
          key={String(mode)}
          accessibilityRole="switch"
          accessibilityLabel={mode ? "Dark theme" : "Light theme"}
          accessibilityState={{ checked: dark === mode }}
          testID={
            testID === "home-theme-mode"
              ? mode
                ? testID
                : "home-light-mode"
              : mode
                ? "studio-dark"
                : "studio-light"
          }
          onPress={() => onChange(testID === "home-theme-mode" && mode ? !dark : mode)}
          style={{
            minWidth: 44,
            minHeight: 44,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 22,
            backgroundColor: dark === mode ? (mode ? theme.accent : theme.nodeFill) : "transparent",
          }}
        >
          <Text
            style={{
              fontSize: 23,
              color: dark === mode ? (mode ? "#FFFFFF" : theme.accent) : theme.mutedText,
            }}
          >
            {mode ? "☾" : "☼"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
