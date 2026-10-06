import { useMemo, useState } from "react";
import { Button, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { Skia, useFonts } from "react-native-skia";
import { Diagram, createSkiaTextMeasurer, renderToPng } from "@osuki-dev/skia-diagrams/react";
import { layoutDiagram, parseDiagram, lightTheme, darkTheme } from "@osuki-dev/skia-diagrams";
import { extremeFixtures } from "./extreme-fixtures.ts";
import { qaFontAssets } from "./fonts.ts";

/** Production Diagram, with a small host viewport and legal full-size sources.
 * The metadata calculation is diagnostic only; it does not mount another Picture. */
export function NativeInlineQa({ onClose }: { onClose: () => void }) {
  const fonts = useFonts(qaFontAssets);
  const window = useWindowDimensions();
  const [name, setName] = useState<keyof typeof extremeFixtures>("ExtremeTall");
  const [dark, setDark] = useState(false),
    [report, setReport] = useState("PNG limit not checked");
  const [requestedWidth, setRequestedWidth] = useState(360);
  const theme = useMemo(
    () => ({ ...(dark ? darkTheme : lightTheme), fontFamily: "QA,QACJK" }),
    [dark],
  );
  const source = extremeFixtures[name];
  const scene = useMemo(
    () =>
      fonts
        ? layoutDiagram(
            parseDiagram(source),
            createSkiaTextMeasurer(Skia, theme, fonts),
            theme.layout,
          )
        : undefined,
    [fonts, source, theme],
  );
  const width = Math.min(requestedWidth, window.width - 32);
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Button testID="inline-close" title="Close inline QA" onPress={onClose} />
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {Object.keys(extremeFixtures).map((value) => (
          <Button
            key={value}
            testID={`inline-${value}`}
            title={value}
            onPress={() => {
              setName(value as keyof typeof extremeFixtures);
              setReport("PNG limit not checked");
            }}
          />
        ))}
      </View>
      <Button
        title={dark ? "Inline light theme" : "Inline dark theme"}
        onPress={() => setDark(!dark)}
      />
      <View style={{ flexDirection: "row" }}>
        {[320, 360, 390].map((value) => (
          <Button
            key={value}
            testID={`inline-width-${value}`}
            title={`${value}pt`}
            onPress={() => setRequestedWidth(value)}
          />
        ))}
      </View>
      <Text style={{ color: theme.nodeText }} testID="inline-metadata">
        {name}:{" "}
        {scene
          ? `${scene.bounds.width.toFixed(1)} × ${scene.bounds.height.toFixed(1)} scene pt; DPR ${window.scale}; width ${width}`
          : "Fonts loading"}
      </Text>
      <Button
        testID="inline-check-png"
        title="Check extreme PNG limit"
        onPress={() => {
          if (!scene || !fonts) return;
          try {
            const data = renderToPng(Skia, scene, theme, 2, fonts);
            setReport(`PNG exported ${data.length} bytes`);
          } catch (error) {
            setReport(error instanceof Error ? error.message : String(error));
          }
        }}
      />
      <Text testID="inline-export-report" style={{ color: theme.nodeText }}>
        {report}
      </Text>
      <ScrollView
        testID="inline-host-scroll"
        nestedScrollEnabled
        contentContainerStyle={{ padding: 16, gap: 16 }}
      >
        <Text style={{ color: theme.nodeText }}>
          HOST BEFORE — drag within the diagram to scroll its full logical extent.
        </Text>
        {fonts && (
          <Diagram
            source={source}
            theme={theme}
            fontProvider={fonts}
            maxWidth={width}
            maxHeight={280}
            testID="extreme-inline"
            onPress={() => setReport("Inline press received")}
            onLongPress={() => setReport("Inline long press received")}
          />
        )}
        <Text testID="inline-host-after" style={{ color: theme.nodeText }}>
          HOST AFTER — enclosing vertical scroll remains available.
        </Text>
        <View style={{ height: 500 }} />
        <Text style={{ color: theme.nodeText }}>HOST END</Text>
      </ScrollView>
    </View>
  );
}
