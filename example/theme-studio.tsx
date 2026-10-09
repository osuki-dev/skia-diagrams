import { MotionPressable as Pressable } from "./motion.tsx";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
  processColor,
} from "react-native";
import Animated from "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Clipboard from "expo-clipboard";
import { pageEntrance } from "./motion.tsx";
import { useFonts } from "react-native-skia";
import { Diagram, DiagramProvider, DiagramViewer } from "@osuki-dev/skia-diagrams/react";
import {
  darkTheme,
  lightTheme,
  resolveDiagramTheme,
  type DiagramTheme,
  type DiagramLayoutStyles,
} from "@osuki-dev/skia-diagrams";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { qaFontAssets } from "./fonts.ts";
import { designFixtures, approvedExampleTheme } from "./design-fixtures.ts";
import { DemoButton as Button, DemoTheme } from "./demo-button.tsx";
import { ThemeModeToggle } from "./theme-mode-toggle.tsx";

type NumberField = readonly [key: string, label: string, initial: number, step?: number];
const typeFields: Record<keyof DiagramLayoutStyles, readonly NumberField[]> = {
  flowchart: [
    ["minNodeWidth", "Minimum node width", 49],
    ["minNodeHeight", "Minimum node height", 42],
  ],
  sequence: [
    ["participantWidth", "Participant width", 104],
    ["laneGap", "Lane spacing", 144],
    ["rowGap", "Message spacing", 24],
    ["activationWidth", "Activation width", 8],
  ],
  class: [
    ["cellPaddingX", "Cell horizontal padding", 14],
    ["cellPaddingY", "Cell vertical padding", 9],
  ],
  state: [
    ["nodePaddingX", "Node horizontal padding", 16],
    ["nodePaddingY", "Node vertical padding", 12],
    ["terminalSize", "Terminal size", 18],
  ],
  er: [
    ["cellPaddingX", "Cell horizontal padding", 14],
    ["cellPaddingY", "Cell vertical padding", 9],
    ["rowGap", "Row spacing", 0],
  ],
  gantt: [
    ["plotWidth", "Plot width", 360],
    ["labelWidth", "Label width", 104],
    ["barHeight", "Bar height", 22],
    ["rowGap", "Row spacing", 16],
  ],
  pie: [
    ["diameter", "Diameter", 180],
    ["legendGap", "Legend spacing", 24],
    ["legendRowGap", "Legend row spacing", 12],
  ],
  gitgraph: [
    ["commitRadius", "Commit radius", 6],
    ["columnGap", "Commit spacing", 72],
    ["laneGap", "Branch spacing", 68],
  ],
  mindmap: [
    ["nodePaddingX", "Node horizontal padding", 16],
    ["nodePaddingY", "Node vertical padding", 11],
    ["radialGap", "Radial spacing", 120],
    ["branchGap", "Branch spacing", 16],
  ],
  timeline: [
    ["cardWidth", "Card width", 144],
    ["eventGap", "Event spacing", 24],
    ["periodScale", "Period text scale", 1.15, 0.05],
  ],
  journey: [
    ["cardWidth", "Card width", 144],
    ["cardGap", "Card spacing", 24],
    ["scoreRadius", "Score radius", 15],
    ["actorGap", "Actor spacing", 34],
  ],
  quadrant: [
    ["plotSize", "Plot size", 280],
    ["labelGap", "Label spacing", 12],
    ["pointRadius", "Point radius", 4.5, 0.5],
  ],
  xychart: [
    ["plotWidth", "Plot width", 320],
    ["plotHeight", "Plot height", 220],
    ["barGap", "Bar gap ratio", 0.3, 0.05],
    ["pointRadius", "Point radius", 3.5, 0.5],
  ],
};
const colors = [
  ["background", "Background"],
  ["nodeFill", "Node fill"],
  ["nodeText", "Node text"],
  ["accent", "Accent"],
  ["nodeStroke", "Node border"],
  ["edgeStroke", "Connections"],
  ["edgeText", "Connection labels"],
  ["edgeTextBackground", "Label background"],
  ["clusterFill", "Group fill"],
  ["clusterStroke", "Group border"],
  ["clusterText", "Group text"],
  ["noteFill", "Note fill"],
  ["noteText", "Note text"],
  ["headerFill", "Header fill"],
  ["headerText", "Header text"],
  ["mutedText", "Secondary text"],
  ["gridStroke", "Grid"],
] as const;
const names = Object.keys(designFixtures);
const kindFor = (name: string) =>
  (name === "XY" ? "xychart" : name.toLowerCase()) as keyof DiagramLayoutStyles;

function FieldLabel({
  label,
  token,
  theme,
}: {
  label: string;
  token: string;
  theme: DiagramTheme;
}) {
  return (
    <View style={{ flex: 1, gap: 3 }}>
      <Text style={{ color: theme.nodeText, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: theme.mutedText, fontSize: 11 }}>{token}</Text>
    </View>
  );
}
function ColorField({
  label,
  token,
  value,
  theme,
  onChange,
}: {
  label: string;
  token: string;
  value: string;
  theme: DiagramTheme;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const input = useRef<TextInput>(null);
  useEffect(() => setDraft(value), [value]);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52 }}>
      <FieldLabel label={label} token={token} theme={theme} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={"Edit " + label.toLowerCase() + " color"}
        onPress={() => input.current?.focus()}
        style={{
          width: 30,
          height: 30,
          borderRadius: 7,
          backgroundColor: value,
          borderWidth: 1,
          borderColor: theme.gridStroke,
        }}
      />
      <TextInput
        ref={input}
        accessibilityLabel={label + " color"}
        testID={"token-" + token}
        value={draft}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={() => input.current?.blur()}
        onChangeText={(text) => {
          setDraft(text);
          if (text.trim() && processColor(text.trim()) != null) onChange(text.trim());
        }}
        onBlur={() => setDraft(value)}
        style={{
          color: theme.nodeText,
          borderColor: theme.gridStroke,
          borderWidth: 1,
          backgroundColor: theme.nodeFill,
          borderRadius: 7,
          width: 120,
          minHeight: 44,
          paddingHorizontal: 10,
          fontSize: 12,
        }}
      />
    </View>
  );
}
function NumberControl({
  field: [key, label, initial, step = 1],
  value,
  theme,
  onChange,
}: {
  field: NumberField;
  value?: number;
  theme: DiagramTheme;
  onChange: (value: number) => void;
}) {
  const number = Math.round((value ?? initial) * 100) / 100;
  const adjust = (direction: number) =>
    onChange(Math.max(0, Math.round((number + direction * step) * 100) / 100));
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        minHeight: 60,
        borderBottomWidth: 1,
        borderColor: theme.gridStroke,
      }}
    >
      <FieldLabel label={label} token={key} theme={theme} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={"Decrease " + label}
        onPress={() => adjust(-1)}
        style={{
          width: 44,
          height: 44,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.headerFill,
          borderRadius: 7,
        }}
      >
        <Text style={{ color: theme.nodeText, fontSize: 20 }}>−</Text>
      </Pressable>
      <TextInput
        key={String(number)}
        accessibilityLabel={label}
        testID={"token-" + key}
        defaultValue={String(number)}
        keyboardType="decimal-pad"
        onEndEditing={(event) => {
          const text = event.nativeEvent.text.trim(),
            next = Number(text);
          if (text && Number.isFinite(next) && next >= 0) onChange(next);
        }}
        style={{
          width: 48,
          minHeight: 44,
          color: theme.nodeText,
          textAlign: "center",
          fontSize: 14,
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={"Increase " + label}
        onPress={() => adjust(1)}
        style={{
          width: 44,
          height: 44,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.headerFill,
          borderRadius: 7,
        }}
      >
        <Text style={{ color: theme.nodeText, fontSize: 20 }}>+</Text>
      </Pressable>
    </View>
  );
}

function providerExpandIcon({ color, size }: { color: string; size: number }) {
  return <Text style={{ color, fontSize: size, fontWeight: "700" }}>+</Text>;
}
function componentExpandIcon({ color, size }: { color: string; size: number }) {
  return <Text style={{ color, fontSize: size }}>↗</Text>;
}

/** One live Canvas; type changes and settings reuse the same preview slot. */
export function ThemeStudio({
  dark,
  onModeChange,
  overrides,
  onChange,
  onClose,
  initialType = "Flowchart",
}: {
  dark: boolean;
  onModeChange: (dark: boolean) => void;
  overrides: Partial<DiagramTheme>;
  onChange: (theme: Partial<DiagramTheme>) => void;
  onClose: () => void;
  initialType?: string;
}) {
  const fonts = useFonts(qaFontAssets);
  const [selected, setSelected] = useState(
    initialType in designFixtures ? initialType : "Flowchart",
  );
  const [tab, setTab] = useState("Colors"),
    [more, setMore] = useState(false),
    [chooser, setChooser] = useState(false);
  const [viewer, setViewer] = useState(false);
  const [motionMode, setMotionMode] = useState<"normal" | "slow" | "off">("normal");
  const [replay, setReplay] = useState(0);
  const [iconMode, setIconMode] = useState<"default" | "provider" | "component">("default");
  const [paletteIndex, setPaletteIndex] = useState<number>();
  const [width, setWidth] = useState(320);
  const [moreLayout, setMoreLayout] = useState(false);
  const base = dark ? darkTheme : lightTheme;
  const theme = resolveDiagramTheme(approvedExampleTheme(overrides), dark ? "dark" : "light");
  const previewTheme = {
    ...theme,
    fontFamily:
      !overrides.fontFamily || theme.fontFamily === "sans-serif" ? "QA,QACJK" : theme.fontFamily,
  };
  const kind = kindFor(selected);
  const update = (key: keyof DiagramTheme, value: unknown) =>
    onChange({ ...overrides, [key]: value });
  const layout = (key: string, value: number) =>
    onChange({ ...overrides, layout: { ...theme.layout, [key]: value } });
  const typeLayout = (key: string, value: number) =>
    onChange({
      ...overrides,
      layout: {
        ...theme.layout,
        typeStyles: {
          ...theme.layout?.typeStyles,
          [kind]: { ...theme.layout?.typeStyles?.[kind], [key]: value },
        },
      },
    });
  useEffect(() => {
    if (Platform.OS !== "android" || chooser || viewer || paletteIndex !== undefined) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [onClose, chooser, viewer, paletteIndex]);
  const exportTokens = async () => {
    const file = new File(Paths.cache, "diagram-theme.json");
    file.write(JSON.stringify(theme, null, 2));
    if (await Sharing.isAvailableAsync())
      await Sharing.shareAsync(file.uri, { mimeType: "application/json" });
    else Alert.alert("Theme saved", file.uri);
  };
  const heading = (title: string) => (
    <Text
      style={{
        fontSize: 15,
        fontWeight: "600",
        color: theme.headerText,
        marginTop: 16,
        marginBottom: 6,
      }}
    >
      {title}
    </Text>
  );
  return (
    <DemoTheme.Provider value={theme}>
      <SafeAreaView
        testID="theme-studio"
        style={{
          flex: 1,
          paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
          backgroundColor: theme.nodeFill,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            minHeight: 60,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            testID="theme-studio-back"
            onPress={onClose}
            style={{ width: 44, height: 44, justifyContent: "center", alignItems: "center" }}
          >
            <Text style={{ color: theme.nodeText, fontSize: 28 }}>‹</Text>
          </Pressable>
          <Text style={{ color: theme.nodeText, fontSize: 18, fontWeight: "600", flex: 1 }}>
            Theme editor
          </Text>
          <View
            style={{
              flexDirection: "row",
              backgroundColor: theme.headerFill,
              borderRadius: 9,
              padding: 2,
            }}
          >
            {["Osuki", "Custom"].map((preset) => (
              <Pressable
                key={preset}
                accessibilityRole="button"
                accessibilityState={{
                  selected: preset === (Object.keys(overrides).length ? "Custom" : "Osuki"),
                }}
                onPress={() => {
                  if (preset === "Osuki") onChange({});
                  else if (!Object.keys(overrides).length) onChange({ accent: theme.accent });
                }}
                style={{
                  minHeight: 44,
                  paddingHorizontal: 10,
                  justifyContent: "center",
                  borderRadius: 8,
                  backgroundColor:
                    preset === (Object.keys(overrides).length ? "Custom" : "Osuki")
                      ? theme.accent
                      : "transparent",
                }}
              >
                <Text
                  style={{
                    color:
                      preset === (Object.keys(overrides).length ? "Custom" : "Osuki")
                        ? "#FFFFFF"
                        : theme.mutedText,
                    fontSize: 12,
                  }}
                >
                  {preset}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <Animated.View entering={pageEntrance} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            keyboardDismissMode="on-drag"
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: 6,
                marginBottom: 12,
              }}
            >
              <ThemeModeToggle
                dark={dark}
                theme={theme}
                onChange={onModeChange}
                testID="studio-mode"
              />
            </View>
            <View
              onLayout={(event) => setWidth(event.nativeEvent.layout.width - 16)}
              style={{
                padding: 8,
                backgroundColor: theme.background,
                borderRadius: 10,
                minHeight: 200,
              }}
            >
              {fonts && !viewer ? (
                <View style={{ width: "100%" }}>
                  <DiagramProvider
                    motion={
                      motionMode === "off"
                        ? false
                        : motionMode === "slow"
                          ? { duration: 2000 }
                          : undefined
                    }
                    renderExpandIcon={iconMode === "default" ? undefined : providerExpandIcon}
                    expandButtonStyle={iconMode === "default" ? undefined : { borderRadius: 13 }}
                  >
                    <Diagram
                      replayToken={replay}
                      source={designFixtures[selected]}
                      theme={previewTheme}
                      fontProvider={fonts}
                      maxWidth={width}
                      maxHeight={190}
                      fitToViewport
                      testID="theme-preview"
                      onExpand={() => setViewer(true)}
                      renderExpandIcon={iconMode === "component" ? componentExpandIcon : undefined}
                      expandButtonStyle={iconMode === "component" ? { borderRadius: 8 } : undefined}
                    />
                  </DiagramProvider>
                </View>
              ) : (
                <Text style={{ color: theme.nodeText }}>Loading preview…</Text>
              )}
              <Button
                title={selected + " · Switch type"}
                testID="studio-type"
                onPress={() => setChooser(true)}
              />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                <Button
                  testID="studio-replay"
                  title="Replay"
                  onPress={() => setReplay(replay + 1)}
                />
                <Button
                  testID="studio-motion"
                  title={`Motion: ${motionMode === "normal" ? "Auto" : motionMode === "slow" ? "Slow" : "Off"}`}
                  onPress={() =>
                    setMotionMode(
                      motionMode === "normal" ? "slow" : motionMode === "slow" ? "off" : "normal",
                    )
                  }
                />
                <Button
                  testID="studio-icon"
                  title={`Icon: ${iconMode === "default" ? "Native" : iconMode === "provider" ? "Provider" : "Local"}`}
                  onPress={() =>
                    setIconMode(
                      iconMode === "default"
                        ? "provider"
                        : iconMode === "provider"
                          ? "component"
                          : "default",
                    )
                  }
                />
              </View>
            </View>
            <View
              style={{
                flexDirection: "row",
                borderBottomWidth: 1,
                borderColor: theme.gridStroke,
                marginTop: 10,
              }}
            >
              {["Colors", "Typography", "Lines", "Layout"].map((label) => (
                <Pressable
                  key={label}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tab === label }}
                  testID={"studio-tab-" + label}
                  onPress={() => setTab(label)}
                  style={{
                    flex: 1,
                    minHeight: 48,
                    justifyContent: "center",
                    alignItems: "center",
                    borderBottomWidth: 2,
                    borderColor: tab === label ? theme.accent : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: tab === label ? theme.accent : theme.mutedText,
                      fontSize: 13,
                      fontWeight: tab === label ? "600" : "400",
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View key={tab}>
              {tab === "Colors" && (
                <>
                  {colors.slice(0, more ? colors.length : 4).map(([key, label]) => (
                    <ColorField
                      key={key}
                      label={label}
                      token={key}
                      value={theme[key] ?? base[key] ?? base.nodeText}
                      theme={theme}
                      onChange={(value) => update(key, value)}
                    />
                  ))}
                  {heading("Category palette")}
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 0, marginVertical: 8 }}
                  >
                    {theme.palette.map((color, index) => (
                      <Pressable
                        key={index}
                        testID={"palette-" + index}
                        accessibilityRole="button"
                        accessibilityLabel={"Edit category " + (index + 1)}
                        onPress={() => setPaletteIndex(index)}
                        style={{ minWidth: 44, minHeight: 44 }}
                        contentStyle={{ gap: 5 }}
                      >
                        <View
                          style={{
                            width: 30,
                            height: 30,
                            backgroundColor: color,
                            borderRadius: 15,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <View
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: 4,
                              backgroundColor: theme.paletteText?.[index] ?? theme.nodeText,
                            }}
                          />
                        </View>
                        <Text style={{ color: theme.mutedText, fontSize: 8 }}>
                          {color.toUpperCase()}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Button
                    title={more ? "Fewer colors" : "More colors & palette"}
                    onPress={() => setMore(!more)}
                  />
                  {more &&
                    theme.palette.map((color, index) => (
                      <View key={index}>
                        <ColorField
                          label={"Category " + (index + 1)}
                          token={"palette[" + index + "]"}
                          value={color}
                          theme={theme}
                          onChange={(value) =>
                            update(
                              "palette",
                              theme.palette.map((item, i) => (i === index ? value : item)),
                            )
                          }
                        />
                        <ColorField
                          label={"Category " + (index + 1) + " text"}
                          token={"paletteText[" + index + "]"}
                          value={theme.paletteText?.[index] ?? theme.nodeText}
                          theme={theme}
                          onChange={(value) =>
                            update(
                              "paletteText",
                              theme.palette.map((_, i) =>
                                i === index ? value : (theme.paletteText?.[i] ?? theme.nodeText),
                              ),
                            )
                          }
                        />
                      </View>
                    ))}
                </>
              )}
              {tab === "Typography" && (
                <>
                  {heading("Typography")}
                  {(["fontFamily", "fontFamilyMono"] as const).map((key) => (
                    <View key={key} style={{ gap: 8, paddingVertical: 10 }}>
                      <FieldLabel
                        label={key === "fontFamily" ? "Font family" : "Monospace family"}
                        token={key}
                        theme={theme}
                      />
                      <TextInput
                        key={theme[key]}
                        accessibilityLabel={key}
                        defaultValue={theme[key]}
                        autoCapitalize="none"
                        onEndEditing={(e) => {
                          if (e.nativeEvent.text.trim()) update(key, e.nativeEvent.text.trim());
                        }}
                        style={{
                          minHeight: 44,
                          padding: 10,
                          borderWidth: 1,
                          borderColor: theme.gridStroke,
                          borderRadius: 7,
                          color: theme.nodeText,
                        }}
                      />
                    </View>
                  ))}
                  <Text style={{ color: theme.mutedText, fontSize: 12 }}>
                    Preview fonts: QA. Hosts provide their own font families.
                  </Text>
                  <NumberControl
                    field={["fontSize", "Font size", 14]}
                    value={theme.fontSize}
                    theme={theme}
                    onChange={(value) => update("fontSize", Math.max(6, Math.min(72, value)))}
                  />
                  {(
                    [
                      ["titleScale", "Title scale", 1.3, 0.05],
                      ["headerScale", "Header scale", 1.08, 0.05],
                    ] as const
                  ).map((field) => (
                    <NumberControl
                      key={field[0]}
                      field={field}
                      value={theme.layout?.[field[0]]}
                      theme={theme}
                      onChange={(value) => layout(field[0], value)}
                    />
                  ))}
                </>
              )}
              {tab === "Lines" && (
                <>
                  {heading("Lines & corners")}
                  {(
                    [
                      ["strokeWidth", "Line width", 1.25, 0.25],
                      ["radius", "Corner radius", 8],
                      ["arrowSize", "Arrow size", 11],
                    ] as const
                  ).map((field) => (
                    <NumberControl
                      key={field[0]}
                      field={field}
                      value={theme[field[0]]}
                      theme={theme}
                      onChange={(value) => update(field[0], value)}
                    />
                  ))}
                  {heading("Line weight ratios")}
                  {(["node", "edge", "frame", "grid", "series"] as const).map((key) => (
                    <NumberControl
                      key={key}
                      field={[
                        key,
                        key.charAt(0).toUpperCase() + key.slice(1),
                        base.lineWeights?.[key] ?? 1,
                        0.1,
                      ]}
                      value={theme.lineWeights?.[key]}
                      theme={theme}
                      onChange={(value) =>
                        update("lineWeights", { ...theme.lineWeights, [key]: value })
                      }
                    />
                  ))}
                </>
              )}
              {tab === "Layout" && (
                <>
                  {heading("Shared layout")}
                  {(
                    [
                      ["padding", "Canvas padding", 20],
                      ["nodeSeparation", "Node spacing", theme.fontSize * 2.1],
                      ["rankSeparation", "Rank spacing", theme.fontSize * 3.2],
                      ["nodePaddingX", "Node horizontal padding", 16],
                      ["nodePaddingY", "Node vertical padding", 12],
                      ["edgeLabelPaddingX", "Label horizontal padding", 6],
                      ["edgeLabelPaddingY", "Label vertical padding", 3],
                      ["maxLabelWidth", "Maximum label width", 320],
                      ["maxLabelLines", "Maximum label lines", 12],
                    ] as const
                  )
                    .filter((_, index) => moreLayout || index < 3)
                    .map((field) => (
                      <NumberControl
                        key={field[0]}
                        field={field}
                        value={theme.layout?.[field[0]]}
                        theme={theme}
                        onChange={(value) => layout(field[0], value)}
                      />
                    ))}
                  <Button
                    title={moreLayout ? "Fewer shared settings" : "More shared settings"}
                    onPress={() => setMoreLayout(!moreLayout)}
                  />
                  {heading("Current type · " + selected)}
                  {typeFields[kind].map((field) => (
                    <NumberControl
                      key={field[0]}
                      field={field}
                      value={
                        (theme.layout?.typeStyles?.[kind] as Record<string, number> | undefined)?.[
                          field[0]
                        ]
                      }
                      theme={theme}
                      onChange={(value) => typeLayout(field[0], value)}
                    />
                  ))}
                  <Text style={{ color: theme.mutedText, marginTop: 16, fontSize: 12 }}>
                    Shared settings apply to all diagrams.
                  </Text>
                </>
              )}
            </View>
          </ScrollView>
        </Animated.View>
        <View
          style={{
            flexDirection: "row",
            gap: 10,
            padding: 16,
            paddingBottom: Platform.OS === "android" ? 32 : 16,
            borderTopWidth: 1,
            borderColor: theme.gridStroke,
          }}
        >
          <View style={{ flex: 1 }}>
            <Button title="Reset" testID="studio-reset" onPress={() => onChange({})} />
          </View>
          <Pressable
            accessibilityRole="button"
            testID="studio-export"
            onPress={() => {
              void exportTokens().catch((error) => Alert.alert("Export failed", String(error)));
            }}
            style={{
              flex: 1.5,
              minHeight: 48,
              borderRadius: 9,
              backgroundColor: theme.accent,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>Export JSON</Text>
          </Pressable>
        </View>
        <Modal visible={viewer} onRequestClose={() => setViewer(false)}>
          <GestureHandlerRootView
            style={{
              flex: 1,
              backgroundColor: theme.background,
              paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
              paddingBottom: Platform.OS === "android" ? 32 : 0,
            }}
          >
            <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
              {fonts && viewer && (
                <DiagramViewer
                  source={designFixtures[selected]}
                  theme={previewTheme}
                  fontProvider={fonts}
                  onClose={() => setViewer(false)}
                  onCopySource={() => {
                    void Clipboard.setStringAsync(designFixtures[selected])
                      .then(() => Alert.alert("Copied", "Diagram source copied to clipboard."))
                      .catch((error) => Alert.alert("Copy failed", String(error)));
                  }}
                  onExport={async (format, data) => {
                    const file = new File(Paths.cache, "diagram." + format);
                    file.write(data);
                    if (await Sharing.isAvailableAsync())
                      await Sharing.shareAsync(file.uri, {
                        mimeType: format === "png" ? "image/png" : "image/svg+xml",
                      });
                    else Alert.alert("Diagram saved", file.uri);
                  }}
                />
              )}
            </SafeAreaView>
          </GestureHandlerRootView>
        </Modal>
        <Modal
          visible={paletteIndex !== undefined}
          transparent
          onRequestClose={() => setPaletteIndex(undefined)}
        >
          <View
            style={{ flex: 1, backgroundColor: "rgba(5,11,18,0.35)", justifyContent: "flex-end" }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close palette editor"
              onPress={() => setPaletteIndex(undefined)}
              style={{ flex: 1 }}
            />
            {paletteIndex !== undefined && (
              <Animated.View
                entering={pageEntrance}
                style={{
                  backgroundColor: theme.nodeFill,
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  padding: 20,
                  paddingBottom: 40,
                }}
              >
                {heading("Category " + (paletteIndex + 1))}
                <ColorField
                  label="Fill"
                  token={"palette[" + paletteIndex + "]"}
                  value={theme.palette[paletteIndex]}
                  theme={theme}
                  onChange={(value) =>
                    update(
                      "palette",
                      theme.palette.map((color, i) => (i === paletteIndex ? value : color)),
                    )
                  }
                />
                <ColorField
                  label="Text"
                  token={"paletteText[" + paletteIndex + "]"}
                  value={theme.paletteText?.[paletteIndex] ?? theme.nodeText}
                  theme={theme}
                  onChange={(value) =>
                    update(
                      "paletteText",
                      theme.palette.map((_, i) =>
                        i === paletteIndex ? value : (theme.paletteText?.[i] ?? theme.nodeText),
                      ),
                    )
                  }
                />
                <ColorField
                  label="Soft surface"
                  token={"paletteFill[" + paletteIndex + "]"}
                  value={theme.paletteFill?.[paletteIndex] ?? theme.nodeFill}
                  theme={theme}
                  onChange={(value) =>
                    update(
                      "paletteFill",
                      theme.palette.map((_, i) =>
                        i === paletteIndex ? value : (theme.paletteFill?.[i] ?? theme.nodeFill),
                      ),
                    )
                  }
                />
                <Button
                  title="Done"
                  testID="palette-done"
                  onPress={() => setPaletteIndex(undefined)}
                />
              </Animated.View>
            )}
          </View>
        </Modal>
        <Modal visible={chooser} onRequestClose={() => setChooser(false)} animationType="none">
          <SafeAreaView
            style={{
              flex: 1,
              paddingTop: StatusBar.currentHeight,
              backgroundColor: theme.background,
            }}
          >
            <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
              <Button title="Close type chooser" onPress={() => setChooser(false)} />
              {names.map((name) => (
                <Button
                  key={name}
                  title={name}
                  testID={"studio-select-" + name}
                  onPress={() => {
                    setSelected(name);
                    setChooser(false);
                  }}
                />
              ))}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </DemoTheme.Provider>
  );
}
