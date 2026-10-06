import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { SkTypefaceFontProvider } from "react-native-skia";
import { mergeThemeOverrides, type DiagramTheme } from "../render/theme.ts";
import type { DiagramIconResolver, DiagramInteraction, TextMeasurer } from "../types.ts";
import type { NativeRenderAssets } from "../render/skia.ts";
import type { StyleProp, ViewStyle } from "react-native";

export interface DiagramExpandIconProps {
  color: string;
  size: number;
}

export interface DiagramConfiguration {
  theme?: Partial<DiagramTheme>;
  mode?: "light" | "dark";
  /** Host-owned and registered font aliases; the library ships no font assets. */
  fontProvider?: SkTypefaceFontProvider;
  measure?: TextMeasurer;
  resolveIcon?: DiagramIconResolver;
  /** Host owns decoded images and their lifetime. Replace the map when assets change. */
  assets?: NativeRenderAssets;
  /** System reduced-motion still takes precedence. */
  motion?: false | { duration?: number };
  /** Host handles modal presentation. Canvas taps never invoke expansion. */
  onExpand?: (source: string) => void;
  /** Replace the default magnifier; button interaction and accessibility remain built in. */
  renderExpandIcon?: (props: DiagramExpandIconProps) => ReactNode;
  /** Style the visible expand button without changing its native touch target. */
  expandButtonStyle?: StyleProp<ViewStyle>;
  /** Host owns navigation and callback execution for authored Mermaid click targets. */
  onInteraction?: (interaction: DiagramInteraction) => void;
  /** Normal-flow selected-data content below the canvas. */
  renderDataDetail?: (selection: DiagramInteraction, dismiss: () => void) => ReactNode;
}
const DiagramContext = createContext<DiagramConfiguration>({});
export const useDiagramConfiguration = () => useContext(DiagramContext);

/** Nested providers inherit configuration; local component props override it. */
export function DiagramProvider({
  children,
  ...configuration
}: DiagramConfiguration & { children: ReactNode }) {
  const parent = useDiagramConfiguration();
  const value = useMemo(
    () => ({
      ...parent,
      mode: configuration.mode ?? parent.mode,
      fontProvider: configuration.fontProvider ?? parent.fontProvider,
      measure: configuration.measure ?? parent.measure,
      resolveIcon: configuration.resolveIcon ?? parent.resolveIcon,
      assets: configuration.assets ?? parent.assets,
      motion: configuration.motion ?? parent.motion,
      onExpand: configuration.onExpand ?? parent.onExpand,
      renderExpandIcon: configuration.renderExpandIcon ?? parent.renderExpandIcon,
      expandButtonStyle: configuration.expandButtonStyle ?? parent.expandButtonStyle,
      onInteraction: configuration.onInteraction ?? parent.onInteraction,
      renderDataDetail: configuration.renderDataDetail ?? parent.renderDataDetail,
      theme: mergeThemeOverrides(parent.theme, configuration.theme),
    }),
    [
      parent,
      configuration.theme,
      configuration.mode,
      configuration.fontProvider,
      configuration.measure,
      configuration.resolveIcon,
      configuration.assets,
      configuration.motion,
      configuration.onExpand,
      configuration.renderExpandIcon,
      configuration.expandButtonStyle,
      configuration.onInteraction,
      configuration.renderDataDetail,
    ],
  );
  return <DiagramContext.Provider value={value}>{children}</DiagramContext.Provider>;
}
