import type { ReactNode } from "react";
import { View } from "react-native";
import type { DiagramConfiguration, DiagramViewerIconProps } from "./provider.tsx";

/** The toolbar button owns touch handling and its accessible name. */
export function ViewerIcon({
  renderIcon,
  children,
  ...icon
}: DiagramViewerIconProps & {
  renderIcon?: DiagramConfiguration["renderViewerIcon"];
  children: ReactNode;
}) {
  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {renderIcon?.(icon) ?? children}
    </View>
  );
}
