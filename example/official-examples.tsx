import { handleExampleLink } from "./diagram-interactions.ts";
import { useCallback, useEffect, useState } from "react";
import {
  BackHandler,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "react-native-skia";
import { Diagram, DiagramProvider, DiagramViewer } from "@osuki-dev/skia-diagrams/react";
import {
  parseDiagramAsync,
  type ParsedDiagram,
  type DiagramTheme,
  type Scene,
} from "@osuki-dev/skia-diagrams";
import { resolveExampleIcon, useExampleDiagramAssets } from "./diagram-assets.ts";
import { officialCatalog } from "./official-fixtures.ts";
import { qaFontAssets } from "./fonts.ts";
import { DemoButton as Button, DemoTheme } from "./demo-button.tsx";

type OfficialType = (typeof officialCatalog.types)[number];
type OfficialCase = OfficialType["cases"][number];
/** Source is preserved verbatim. A failed case shows its actual error, never a mock diagram. */
export function OfficialExamples({
  theme,
  dark,
  onClose,
}: {
  theme: DiagramTheme;
  dark: boolean;
  onClose: () => void;
}) {
  const fonts = useFonts(qaFontAssets);
  const assets = useExampleDiagramAssets();
  const [type, setType] = useState<OfficialType>();
  const [selected, setSelected] = useState<OfficialCase>();
  const [viewer, setViewer] = useState(false);
  const [status, setStatus] = useState("Preparing native renderer…");
  const onReady = useCallback(
    (scene: Scene) =>
      setStatus(
        `Ready · ${scene.primitives.length} primitives · ${Math.round(scene.bounds.width)} × ${Math.round(scene.bounds.height)} pt`,
      ),
    [],
  );
  const choose = (example: OfficialCase) => {
    setStatus("Preparing native renderer…");
    setSelected(example);
  };
  const goBack = useCallback(() => {
    if (selected) setSelected(undefined);
    else if (type) setType(undefined);
    else onClose();
  }, [selected, type, onClose]);
  useEffect(() => {
    if (Platform.OS !== "android" || viewer) return;
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      goBack();
      return true;
    });
    return () => listener.remove();
  }, [goBack, viewer]);
  const [supported, setSupported] = useState<ParsedDiagram>();
  useEffect(() => {
    let active = true;
    setSupported(undefined);
    if (selected)
      void parseDiagramAsync(selected.source).then((result) => {
        if (active) setSupported(result);
      });
    return () => {
      active = false;
    };
  }, [selected]);
  const hasDiagram = supported && supported.kind !== "error" && supported.kind !== "unsupported";
  return (
    <DemoTheme.Provider value={theme}>
      <DiagramProvider
        theme={{ ...theme, fontFamily: "QA,QACJK" }}
        mode={dark ? "dark" : "light"}
        fontProvider={fonts ?? undefined}
        assets={assets}
        resolveIcon={resolveExampleIcon}
        onInteraction={(interaction) => {
          if (handleExampleLink(interaction)) return;

          setStatus(
            `${interaction.kind === "data" ? "Selected" : "Callback"} · ${interaction.label} · ${interaction.target}`,
          );
        }}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaView
            style={{
              flex: 1,
              paddingTop: StatusBar.currentHeight,
              backgroundColor: theme.background,
            }}
          >
            <View
              style={{
                width: "100%",
                padding: 12,
                flexDirection: "row",
                gap: 12,
                alignItems: "center",
              }}
            >
              <Button title="Back" testID="official-back" onPress={goBack} />
              <Text
                style={{
                  color: theme.nodeText,
                  fontSize: 18,
                  fontWeight: "600",
                  flex: 1,
                  flexShrink: 1,
                  minWidth: 0,
                }}
              >
                {selected ? type?.name : "Official Mermaid examples"}
              </Text>
            </View>
            <ScrollView
              key={selected?.id ?? type?.type ?? "catalog"}
              contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
            >
              <Text style={{ color: theme.mutedText, fontSize: 12 }}>
                Mermaid {officialCatalog.version} · Official source, unchanged
              </Text>
              {!type &&
                officialCatalog.types.map((entry) => (
                  <Button
                    key={entry.type}
                    title={`${entry.name} · ${entry.cases.length} examples`}
                    testID={`official-type-${entry.type}`}
                    onPress={() => setType(entry)}
                  />
                ))}
              {type &&
                !selected &&
                type.cases.map((example) => (
                  <Button
                    key={example.id}
                    title={`${example.id.split("/")[1]} · ${example.title}${example.cjk ? " · CJK" : ""}`}
                    testID={`official-case-${example.id.replace("/", "-")}`}
                    onPress={() => choose(example)}
                  />
                ))}
              {selected && (
                <>
                  <Text style={{ color: theme.nodeText, fontSize: 16, fontWeight: "600" }}>
                    {selected.title}
                  </Text>
                  {hasDiagram ? (
                    <Text
                      testID="official-render-status"
                      style={{ color: theme.mutedText, fontSize: 12 }}
                    >
                      {status}
                    </Text>
                  ) : (
                    <Text accessibilityRole="alert" style={{ color: theme.accent }}>
                      {supported?.kind === "error"
                        ? `Syntax gap · ${supported.error.message}`
                        : supported?.kind === "unsupported"
                          ? `Not implemented · ${supported.type}`
                          : "Preparing official syntax…"}
                    </Text>
                  )}
                  {fonts && !viewer && (
                    <Diagram
                      source={selected.source}
                      testID="official-diagram"
                      onReady={onReady}
                      onError={(error) => setStatus(`Render failed · ${error.message}`)}
                      onExpand={hasDiagram ? () => setViewer(true) : undefined}
                    />
                  )}
                  <Text
                    selectable
                    style={{
                      color: theme.nodeText,
                      fontFamily: theme.fontFamilyMono,
                      fontSize: 12,
                      lineHeight: 18,
                    }}
                  >
                    {selected.source}
                  </Text>
                </>
              )}
            </ScrollView>
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
                  {viewer && selected && (
                    <DiagramViewer source={selected.source} onClose={() => setViewer(false)} />
                  )}
                </SafeAreaView>
              </GestureHandlerRootView>
            </Modal>
          </SafeAreaView>
        </GestureHandlerRootView>
      </DiagramProvider>
    </DemoTheme.Provider>
  );
}
