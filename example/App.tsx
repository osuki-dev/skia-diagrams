import { useRequestReviewInteraction } from "./diagram-interactions.ts";
import { approvedExampleTheme } from "./design-fixtures.ts";
import { RequestControls } from "./request-controls.tsx";
import { requestStateFixture } from "./request-execution.ts";
import { OfficialExamples } from "./official-examples.tsx";
import { useCallback, useEffect, useReducer, useState } from "react";
import {
  Alert,
  BackHandler,
  Modal,
  Platform,
  StatusBar,
  SafeAreaView,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Diagram, DiagramViewer } from "@osuki-dev/skia-diagrams/react";
import {
  findMermaidFences,
  lightTheme,
  resolveDiagramTheme,
  type DiagramTheme,
  type Scene,
} from "@osuki-dev/skia-diagrams";
import * as Clipboard from "expo-clipboard";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { fixtures } from "./fixtures.ts";
import { readThemeOverrides } from "./theme-editor.ts";
import { NativeQa } from "./native-qa.tsx";
import { NativePanControl } from "./native-pan-control.tsx";
import { NativeInlineQa } from "./native-inline-qa.tsx";
import { useFonts } from "react-native-skia";
import { qaFontAssets } from "./fonts.ts";
import {
  detailedFixtures,
  exampleFixtures,
  exampleNames,
  subsetDescriptions,
} from "./fixture-cases.ts";
import { cjkCases } from "./cjk-fixtures.ts";
import { DemoButton as Button, DemoTheme } from "./demo-button.tsx";
import { GalleryHome } from "./gallery-home.tsx";
import { ThemeStudio } from "./theme-studio.tsx";
import {
  detailBackEnabled,
  detailIndexForType,
  galleryNavigation,
  subscribeDetailBack,
} from "./gallery-navigation.ts";

export default function App() {
  const [route, navigate] = useReducer(galleryNavigation, { screen: "home" });
  const [dark, setDark] = useState(false);
  const [themeOverrides, setThemeOverrides] = useState<Partial<DiagramTheme>>({});
  const [official, setOfficial] = useState(false);
  const [studio, setStudio] = useState<string | undefined>();
  const theme = resolveDiagramTheme(approvedExampleTheme(themeOverrides), dark ? "dark" : "light");
  if (official)
    return <OfficialExamples theme={theme} dark={dark} onClose={() => setOfficial(false)} />;
  if (studio !== undefined)
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeStudio
          dark={dark}
          onModeChange={setDark}
          overrides={themeOverrides}
          onChange={setThemeOverrides}
          initialType={studio}
          onClose={() => setStudio(undefined)}
        />
      </GestureHandlerRootView>
    );
  if (route.screen === "detail")
    return (
      <DiagramDetail
        key={route.type}
        initialSelected={detailIndexForType(route.type)}
        dark={dark}
        onThemeChange={setDark}
        onHome={() => navigate({ type: "home" })}
        themeOverrides={themeOverrides}
        onEditTheme={(type) => setStudio(type)}
      />
    );
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView
        style={{
          flex: 1,
          paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
          paddingBottom: Platform.OS === "android" ? 32 : 0,
          backgroundColor: theme.background,
        }}
      >
        <DemoTheme.Provider value={theme}>
          <GalleryHome
            theme={theme}
            dark={dark}
            onThemeChange={setDark}
            onOpen={(type) => navigate({ type: "open", diagram: type })}
            onEditTheme={() => setStudio("Flowchart")}
            onOfficialExamples={() => setOfficial(true)}
          />
        </DemoTheme.Provider>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

/** Fonts and the selected diagram exist only after navigating off the static home. */
function DiagramDetail({
  initialSelected,
  dark,
  onThemeChange,
  onHome,
  themeOverrides,
  onEditTheme,
}: {
  initialSelected: number;
  dark: boolean;
  onThemeChange: (dark: boolean) => void;
  onHome: () => void;
  themeOverrides: Partial<DiagramTheme>;
  onEditTheme: (type: string) => void;
}) {
  const { handleInteraction, request, dispatch, execution, stateExecution } =
    useRequestReviewInteraction();
  const [nativeQa, setNativeQa] = useState(false);
  const [panControl, setPanControl] = useState(false);
  const [inlineQa, setInlineQa] = useState(false);
  const [settings, setSettings] = useState(false);
  const fonts = useFonts(qaFontAssets);
  const [selected, setSelected] = useState(initialSelected),
    [detailed, setDetailed] = useState(false),
    [chooser, setChooser] = useState(false);
  const [stateExecutionDemo, setStateExecutionDemo] = useState(false);
  const name = exampleNames[selected];
  const selectedSource =
    name === "State" && stateExecutionDemo
      ? requestStateFixture
      : ((detailed ? detailedFixtures[name] : undefined) ?? exampleFixtures[name]);
  const hasExecutionDemo =
    (name === "Flowchart" && detailed) || (name === "State" && stateExecutionDemo);
  const [renderStatus, setRenderStatus] = useState("Preparing native renderer…");
  useEffect(() => setRenderStatus("Preparing native renderer…"), [selectedSource]);
  const onReady = useCallback(
    (scene: Scene) =>
      setRenderStatus(
        `Ready · ${scene.primitives.length} primitives · ${Math.round(scene.bounds.width)} × ${Math.round(scene.bounds.height)} pt`,
      ),
    [],
  );
  const onRenderError = useCallback(
    (error: { message: string }) => setRenderStatus(`Render failed · ${error.message}`),
    [],
  );
  const cjk = cjkCases[name as keyof typeof cjkCases];
  const [accent, setAccent] = useState(lightTheme.accent),
    [size, setSize] = useState(14),
    [radius, setRadius] = useState(lightTheme.radius),
    [stroke, setStroke] = useState(lightTheme.strokeWidth),
    [viewer, setViewer] = useState<string | undefined>(),
    [streamClosed, setStreamClosed] = useState(false);
  const [tokenJson, setTokenJson] = useState(
    '{"lineWeights":{"node":0.8,"edge":1.1},"layout":{"typeStyles":{"gantt":{"barHeight":22},"pie":{"diameter":220}}}}',
  );
  const [tokens, setTokens] = useState<Partial<DiagramTheme>>({});
  const handleSystemBack = detailBackEnabled(
    Platform.OS,
    viewer !== undefined || chooser,
    nativeQa || panControl || inlineQa,
  );
  useEffect(() => {
    if (!handleSystemBack) return;
    return subscribeDetailBack(BackHandler, onHome);
  }, [handleSystemBack, onHome]);
  const theme = resolveDiagramTheme(
    approvedExampleTheme(
      {
        fontFamily: cjk?.family ?? "QA,QACJK",
        ...(cjk ? { layout: { maxLabelWidth: 160, maxLabelLines: 4 } } : {}),
        accent: /^#[\da-f]{6}$/i.test(accent) ? accent : lightTheme.accent,
        fontSize: size,
        radius,
        strokeWidth: stroke,
      },
      tokens,
      themeOverrides,
    ),
    dark ? "dark" : "light",
  );
  const copy = (source: string) => {
    void Clipboard.setStringAsync(source);
  };
  const exportDiagram = async (kind: "png" | "svg", data: Uint8Array | string) => {
    const file = new File(Paths.cache, `diagram.${kind}`);
    file.write(data);
    if (await Sharing.isAvailableAsync())
      await Sharing.shareAsync(file.uri, {
        mimeType: kind === "png" ? "image/png" : "image/svg+xml",
      });
    else Alert.alert("Export saved", file.uri);
  };
  const streaming = `\`\`\`mermaid\n${fixtures.Flowchart}${streamClosed ? "\n```" : ""}`;
  const fence = findMermaidFences(streaming)[0];
  if (inlineQa)
    return (
      <GestureHandlerRootView
        style={{ flex: 1, paddingTop: StatusBar.currentHeight, paddingBottom: 32 }}
      >
        <NativeInlineQa onClose={() => setInlineQa(false)} />
      </GestureHandlerRootView>
    );
  if (panControl)
    return (
      <GestureHandlerRootView style={{ flex: 1, paddingTop: StatusBar.currentHeight }}>
        <NativePanControl onClose={() => setPanControl(false)} />
      </GestureHandlerRootView>
    );
  if (nativeQa)
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView
          style={{ flex: 1, paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 }}
        >
          <NativeQa onClose={() => setNativeQa(false)} />
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  return (
    <DemoTheme.Provider value={theme}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView
          style={{
            flex: 1,
            paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
            // Demo-only gesture-navigation gutter. Real hosts supply their own
            // safe-area insets; the standalone renderer has no UI-provider dependency.
            paddingBottom: Platform.OS === "android" ? 32 : 0,
            backgroundColor: theme.background,
          }}
        >
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, paddingHorizontal: 12 }}>
            <Button
              testID="gallery-back-home"
              title="All diagrams"
              accessibilityLabel="Back to diagram collection"
              onPress={onHome}
            />
            <Button testID="choose-type" title={`Type: ${name}`} onPress={() => setChooser(true)} />
            <Button
              testID="next-type"
              title="Next type"
              onPress={() => setSelected((selected + 1) % exampleNames.length)}
            />
            <Button
              testID="toggle-detail"
              title={detailed ? "Basic case" : "Detailed case"}
              disabled={!detailedFixtures[name]}
              onPress={() => setDetailed(!detailed)}
            />
            {name === "State" && (
              <Button
                testID="state-execution-demo"
                title={stateExecutionDemo ? "Syntax example" : "Execution demo"}
                onPress={() => setStateExecutionDemo(!stateExecutionDemo)}
              />
            )}
          </View>
          {chooser && (
            <Modal visible onRequestClose={() => setChooser(false)}>
              <SafeAreaView
                style={{
                  paddingTop: StatusBar.currentHeight,
                  flex: 1,
                  backgroundColor: theme.background,
                }}
              >
                <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
                  <Button title="Close type chooser" onPress={() => setChooser(false)} />
                  {exampleNames.map((type, index) => (
                    <Button
                      key={type}
                      testID={`select-${type}`}
                      title={type}
                      onPress={() => {
                        setSelected(index);
                        setChooser(false);
                      }}
                    />
                  ))}
                </ScrollView>
              </SafeAreaView>
            </Modal>
          )}
          <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
            <Text style={{ fontSize: 24, color: theme.nodeText }}>Skia Diagrams Gallery</Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ color: theme.nodeText }}>Dark theme</Text>
              <Switch
                testID="theme-mode"
                accessibilityLabel="Dark theme"
                value={dark}
                onValueChange={onThemeChange}
              />
            </View>
            <Button
              testID="open-theme-studio"
              title="Customize theme"
              onPress={() => onEditTheme(name)}
            />
            <Button
              testID="theme-settings"
              title={settings ? "Hide advanced settings" : "Advanced settings"}
              onPress={() => setSettings(!settings)}
            />
            {settings && (
              <>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <Button title="Open native QA" onPress={() => setNativeQa(true)} />
                  <Button title="Open pan control" onPress={() => setPanControl(true)} />
                  <Button
                    testID="open-inline-qa"
                    title="Open inline QA"
                    onPress={() => setInlineQa(true)}
                  />
                </View>
                <TextInput
                  accessibilityLabel="Accent hex color"
                  value={accent}
                  onChangeText={setAccent}
                  style={{
                    borderWidth: 1,
                    borderColor: theme.nodeStroke,
                    color: theme.nodeText,
                    padding: 8,
                  }}
                />
                <Button
                  title={`Font size: ${size}`}
                  onPress={() => setSize(size === 14 ? 20 : 14)}
                />
                <Button
                  title={`Radius: ${radius}`}
                  onPress={() => setRadius(radius === lightTheme.radius ? 18 : lightTheme.radius)}
                />
                <Button
                  title={`Stroke: ${stroke}`}
                  onPress={() =>
                    setStroke(stroke === lightTheme.strokeWidth ? 3 : lightTheme.strokeWidth)
                  }
                />
                <Text style={{ color: theme.nodeText }}>
                  All color, font, size, stroke, radius and palette tokens (JSON)
                </Text>
                <TextInput
                  accessibilityLabel="Diagram theme tokens JSON"
                  multiline
                  value={tokenJson}
                  onChangeText={setTokenJson}
                  style={{
                    color: theme.nodeText,
                    borderColor: theme.nodeStroke,
                    borderWidth: 1,
                    padding: 8,
                  }}
                />
                <Button
                  title="Apply theme tokens"
                  onPress={() => {
                    try {
                      setTokens(readThemeOverrides(tokenJson));
                    } catch (error) {
                      Alert.alert("Invalid theme", String(error));
                    }
                  }}
                />
                <Button title="Reset theme tokens" onPress={() => setTokens({})} />
                <Button
                  testID="stream-toggle"
                  title={streamClosed ? "Reopen streaming fence" : "Close streaming fence"}
                  onPress={() => setStreamClosed(!streamClosed)}
                />
                {!fence.closed && (
                  <Text testID="streaming-source" selectable style={{ color: theme.nodeText }}>
                    {streaming}
                  </Text>
                )}
              </>
            )}
            {hasExecutionDemo && (
              <RequestControls request={request} dispatch={dispatch} theme={theme} />
            )}
            {/* Mount only the selected example, not thirteen retained GPU textures. */}
            {[[name, selectedSource]].map(([name, source]) => (
              <View key={name} testID={`fixture-${name}`} style={{ gap: 8 }}>
                <Text style={{ color: theme.nodeText, fontSize: 18 }}>{name}</Text>
                <Text style={{ color: theme.edgeText }}>
                  {subsetDescriptions[name] ??
                    (cjk
                      ? "Frozen regional CJK font, mixed Latin/fullwidth punctuation, multiline wrap and ellipsis. Host fonts remain configurable."
                      : "Classic shape boundaries and routing/marker detail checks.")}
                </Text>
                <Text
                  testID="gallery-render-status"
                  accessibilityLiveRegion="polite"
                  style={{ color: theme.mutedText, fontSize: 12 }}
                >
                  {name === "Unsupported" ? "Unsupported diagram type" : renderStatus}
                </Text>
                {fonts && !viewer ? (
                  <Diagram
                    source={fence.closed ? fence.source : source}
                    testID={fence.closed ? "streaming-diagram" : `diagram-${name}`}
                    theme={theme}
                    fontProvider={fonts}
                    onExpand={() => setViewer(fence.closed ? fence.source : source)}
                    onInteraction={handleInteraction}
                    execution={
                      hasExecutionDemo ? (name === "State" ? stateExecution : execution) : undefined
                    }
                    onReady={onReady}
                    onError={onRenderError}
                    onLongPress={() => copy(fence.closed ? fence.source : source)}
                    fallback={(value, error) => (
                      <View testID="gallery-fallback">
                        <Text style={{ color: theme.nodeText }}>
                          {error?.message ?? "Unsupported diagram type"}
                        </Text>
                        <Text
                          selectable
                          numberOfLines={8}
                          style={{ fontFamily: theme.fontFamilyMono, color: theme.nodeText }}
                        >
                          {value}
                        </Text>
                        <Button title="Copy source" onPress={() => copy(value)} />
                      </View>
                    )}
                  />
                ) : !fonts ? (
                  <Text>Fonts loading</Text>
                ) : null}
                <Button title="Copy selected source" onPress={() => copy(source)} />
                <Text
                  selectable
                  style={{ fontFamily: theme.fontFamilyMono, color: theme.edgeText }}
                >
                  {source}
                </Text>
              </View>
            ))}
          </ScrollView>
          {viewer !== undefined && (
            <Modal visible onRequestClose={() => setViewer(undefined)}>
              <GestureHandlerRootView
                style={{
                  flex: 1,
                  paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
                  paddingBottom: Platform.OS === "android" ? 32 : 0,
                  backgroundColor: theme.background,
                }}
              >
                <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
                  {(viewer === detailedFixtures.Flowchart || viewer === requestStateFixture) && (
                    <RequestControls request={request} dispatch={dispatch} theme={theme} />
                  )}
                  <DiagramViewer
                    source={viewer ?? ""}
                    theme={theme}
                    fontProvider={fonts ?? undefined}
                    onClose={() => setViewer(undefined)}
                    onInteraction={handleInteraction}
                    execution={
                      viewer === detailedFixtures.Flowchart || viewer === requestStateFixture
                        ? viewer === requestStateFixture
                          ? stateExecution
                          : execution
                        : undefined
                    }
                    onCopySource={() => copy(viewer ?? "")}
                    onExport={(kind, data) => {
                      void exportDiagram(kind, data).catch((error) =>
                        Alert.alert("Export failed", String(error)),
                      );
                    }}
                  />
                </SafeAreaView>
              </GestureHandlerRootView>
            </Modal>
          )}
        </SafeAreaView>
      </GestureHandlerRootView>
    </DemoTheme.Provider>
  );
}
