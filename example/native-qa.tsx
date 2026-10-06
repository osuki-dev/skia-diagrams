import { StrictMode, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Button, ScrollView, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { fixtures } from "./fixtures.ts";
import {
  Canvas,
  Group,
  Picture,
  Skia,
  useFonts,
  type SkTypefaceFontProvider,
  type SkPicture,
} from "react-native-skia";
import { File, Paths } from "expo-file-system";
import { startPictureAudit } from "./native-picture-audit.ts";
import { NativeInterruptionProbe } from "./native-interruption-probe.tsx";
import { qaFontAssets } from "./fonts.ts";
import { detailedFixtures } from "./fixture-cases.ts";
import { cjkCases, cjkFixtures } from "./cjk-fixtures.ts";
import {
  layoutDiagram,
  parseDiagram,
  lightTheme,
  darkTheme,
  renderToSvg,
} from "@osuki-dev/skia-diagrams";
import {
  createSkiaTextMeasurer,
  renderToPicture,
  renderToPng,
  useDiagram,
} from "@osuki-dev/skia-diagrams/react";
const source = 'flowchart LR\nA["中文<br/>流程图"]-->B["开始 **成功**"]';
const theme = { ...lightTheme, fontFamily: "QA,QACJK" };
const queuedSource = `flowchart TD\n${Array.from({ length: 150 }, (_, i) => `N${i}-->N${i + 1}`).join("\n")}`;
function InPlaceProbe({
  fontsA,
  fontsB,
  onPicture,
}: {
  fontsA: SkTypefaceFontProvider;
  fontsB: SkTypefaceFontProvider;
  onPicture: (picture: SkPicture) => void;
}) {
  const [second, setSecond] = useState(false),
    [diagramSource, setSource] = useState(source),
    [report, setReport] = useState("In-place probe idle");
  const result = useDiagram(diagramSource, theme, undefined, second ? fontsB : fontsA);
  const previous = useRef<Extract<ReturnType<typeof useDiagram>, { status: "ready" }>>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    if (result.status !== "ready") return;
    onPicture(result.picture);
    if (diagramSource === queuedSource) {
      const retained = result.picture === previous.current?.picture;
      setReport(
        retained
          ? "Deferred request: old Picture retained=true"
          : "Deferred request: replacement committed",
      );
      console.log("DIAGRAM_RETENTION_PROBE", retained);
    } else if (previous.current && result.fontProvider !== previous.current.fontProvider) {
      const changed = result.picture !== previous.current.picture;
      setReport(`In-place provider replacement: Picture changed=${changed}`);
      console.log("DIAGRAM_PROVIDER_PROBE", changed);
    }
    if (diagramSource !== queuedSource) previous.current = result;
  }, [result, diagramSource, onPicture]);
  return (
    <View>
      <Button title="Replace provider in place" onPress={() => setSecond(!second)} />
      <Button
        title="Run deferred source replacement"
        onPress={() => {
          setSource(queuedSource);
          timer.current = setTimeout(() => {
            setSource(source);
          }, 1000);
        }}
      />
      <Text testID="in-place-report">{report}</Text>
      {result.status === "ready" && (
        <Canvas style={{ width: 300, height: 160 }}>
          <Group
            transform={[{ scale: Math.min(300 / result.bounds.width, 160 / result.bounds.height) }]}
          >
            <Picture picture={result.picture} />
          </Group>
        </Canvas>
      )}
    </View>
  );
}
function StressMount({
  fonts,
  onReady,
  onPicture,
}: {
  fonts: SkTypefaceFontProvider;
  onReady: (status: string) => void;
  onPicture: (picture: SkPicture) => void;
}) {
  const result = useDiagram(source, theme, undefined, fonts);
  useEffect(() => {
    console.log("DIAGRAM_QA_EFFECT_SETUP", __DEV__);
    return () => console.log("DIAGRAM_QA_EFFECT_CLEANUP", __DEV__);
  }, []);
  useEffect(() => {
    if (result.status === "ready") {
      onPicture(result.picture);
      const handle = setTimeout(() => onReady("ready"), 250);
      return () => clearTimeout(handle);
    }
    if (result.status === "error") onReady(result.error.message);
  }, [result, onReady, onPicture]);
  return (
    <View>
      <Text testID="native-font-status">{result.status}</Text>
      {result.status === "ready" && (
        <Canvas style={{ width: result.bounds.width, height: result.bounds.height }}>
          <Picture picture={result.picture} />
        </Canvas>
      )}
    </View>
  );
}
export function NativeQa({ onClose }: { onClose: () => void }) {
  const audit = useRef<ReturnType<typeof startPictureAudit> | undefined>(undefined);
  const observePicture = (picture: SkPicture) => audit.current?.observe(picture);
  useEffect(
    () => () => {
      if (audit.current) {
        audit.current.stop();
        // Child hook cleanups happen after this parent cleanup.
        const current = audit.current;
        setTimeout(() => {
          const evidence = current.snapshot();
          new File(Paths.cache, "qa-picture-audit-final.json").write(JSON.stringify(evidence));
          console.log("DIAGRAM_PICTURE_AUDIT_FINAL", JSON.stringify(evidence));
        }, 0);
      }
    },
    [],
  );
  const fontsA = useFonts(qaFontAssets),
    fontsB = useFonts(qaFontAssets);
  const [report, setReport] = useState("Fonts loading"),
    [cycle, setCycle] = useState(0),
    [running, setRunning] = useState(false),
    [reduced, setReduced] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => subscription.remove();
  }, []);
  const onReady = (status: string) => {
    if (!running) return;
    if (status !== "ready") {
      setReport(`Stress failed: ${status}`);
      setRunning(false);
      return;
    }
    if (cycle >= 29) {
      setReport("30 native mounts/provider replacements completed");
      setRunning(false);
    } else setCycle(cycle + 1);
  };
  const benchmark = () => {
    if (!fontsA) return;
    try {
      const cases = [20, 100, 300].map((count) => ({
        name: `flowchart-${count}`,
        source: `flowchart TD\n${Array.from({ length: count - 1 }, (_, i) => `N${i}-->N${i + 1}`).join("\n")}`,
      }));
      cases.push({
        name: "sequence-50",
        source:
          "sequenceDiagram\n" +
          Array.from({ length: 50 }, (_, i) => `A->>B: message ${i}`).join("\n"),
      });
      const results = cases.map((item) => {
        const parseStart = performance.now(),
          parsed = parseDiagram(item.source),
          parseMs = performance.now() - parseStart;
        const start = performance.now(),
          scene = layoutDiagram(parsed, createSkiaTextMeasurer(Skia, theme, fontsA), {
            ...theme.layout,
            fontSize: theme.fontSize,
            radius: theme.radius,
          });
        const layoutMs = performance.now() - start,
          times: number[] = [];
        for (let i = 0; i < 35; i++) {
          const before = performance.now(),
            picture = renderToPicture(Skia, scene, theme, fontsA);
          if (i >= 20) times.push(performance.now() - before);
          picture.dispose();
        }
        return { name: item.name, parseMs, layoutMs, pictureMs: times.sort((a, b) => a - b)[7] };
      });
      const scene = layoutDiagram(
          parseDiagram(source),
          createSkiaTextMeasurer(Skia, theme, fontsA),
          { ...theme.layout, fontSize: theme.fontSize, radius: theme.radius },
        ),
        png = renderToPng(Skia, scene, theme, 2, fontsA),
        svg = renderToSvg(scene, theme);
      const pngFile = new File(Paths.cache, "qa-export.png"),
        svgFile = new File(Paths.cache, "qa-export.svg");
      pngFile.write(png);
      svgFile.write(svg);
      // Keep the normal GPU export unchanged while isolating raster backend,
      // geometry, and text. These files are diagnostic evidence, not goldens.
      new File(Paths.cache, "qa-scene.json").write(JSON.stringify(scene));
      new File(Paths.cache, "qa-input.json").write(
        JSON.stringify({ source, theme, pixelRatio: 2 }),
      );
      const rasterApi = new Proxy(Skia, {
        get(target, key) {
          if (key === "Surface")
            return {
              MakeOffscreen: (width: number, height: number) => Skia.Surface.Make(width, height),
            };
          const value: unknown = Reflect.get(target, key);
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
      new File(Paths.cache, "qa-raster.png").write(renderToPng(rasterApi, scene, theme, 2, fontsA));
      for (const [name, textOnly] of [
        ["text", true],
        ["geometry", false],
      ] as const) {
        const layer = {
          ...scene,
          primitives: scene.primitives.filter((p) => (p.type === "text") === textOnly),
        };
        new File(Paths.cache, `qa-${name}.png`).write(renderToPng(Skia, layer, theme, 2, fontsA));
        new File(Paths.cache, `qa-${name}-raster.png`).write(
          renderToPng(rasterApi, layer, theme, 2, fontsA),
        );
      }
      const metrics = scene.primitives
        .filter((p) => p.type === "text")
        .map((p) => {
          const builder = Skia.ParagraphBuilder.Make(
            { textStyle: { fontSize: p.fontSize, fontFamilies: ["QA", "QACJK"] } },
            fontsA,
          );
          builder.addText(p.text);
          const paragraph = builder.build();
          try {
            paragraph.layout(p.width + 1);
            return {
              text: p.text,
              height: paragraph.getHeight(),
              lines: paragraph.getLineMetrics(),
            };
          } finally {
            paragraph.dispose();
            builder.dispose?.();
          }
        });
      new File(Paths.cache, "qa-paragraphs.json").write(JSON.stringify(metrics));
      const bytes = pngFile.bytesSync(),
        data = Skia.Data.fromBytes(bytes);
      try {
        const image = Skia.Image.MakeImageFromEncoded(data);
        if (!image) throw new Error("Native PNG decode failed");
        const dimensions = {
          width: image.width(),
          height: image.height(),
          expectedWidth: Math.ceil(scene.bounds.width * 2),
          expectedHeight: Math.ceil(scene.bounds.height * 2),
        };
        image.dispose();
        if (
          dimensions.width !== dimensions.expectedWidth ||
          dimensions.height !== dimensions.expectedHeight ||
          svgFile.textSync() !== svg ||
          bytes.length !== png.length ||
          !bytes.every((byte, index) => byte === png[index])
        )
          throw new Error("Export round-trip mismatch");
        const evidence = {
          runtime: __DEV__ ? "development" : "release",
          results,
          exports: { ...dimensions, pngBytes: bytes.length, svgBytes: svg.length },
          note: "Native timings; process memory/FPS and allocated Picture memory are separate checks.",
        };
        const json = JSON.stringify(evidence);
        new File(Paths.cache, "qa-results.json").write(json);
        setReport(json);
        console.log("DIAGRAM_NATIVE_QA", json);
      } finally {
        data.dispose();
      }
    } catch (error) {
      console.error("DIAGRAM_NATIVE_QA_FAILURE", error);
      setReport(String(error));
    }
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Button title="Close native QA" onPress={onClose} />
      <Text>
        Native QA{" "}
        {__DEV__ ? "development StrictMode" : "release (StrictMode effects do not replay)"}
      </Text>
      {fontsA && <NativeInterruptionProbe fonts={fontsA} />}
      <Text testID="native-reduced-motion">Reduced motion: {String(reduced)}</Text>
      <Button title="Run native benchmark and exports" disabled={!fontsA} onPress={benchmark} />
      <Button
        title="Export regional CJK parity fixtures"
        disabled={!fontsA}
        onPress={() => {
          if (!fontsA) return;
          try {
            for (const [name, sample] of Object.entries(cjkCases))
              for (const [mode, base] of [
                ["light", lightTheme],
                ["dark", darkTheme],
              ] as const) {
                const theme = {
                  ...base,
                  fontFamily: sample.family,
                  layout: { maxLabelWidth: 160, maxLabelLines: 4 },
                };
                const source = cjkFixtures[name];
                const scene = layoutDiagram(
                  parseDiagram(source),
                  createSkiaTextMeasurer(Skia, theme, fontsA),
                  { ...theme.layout, fontSize: theme.fontSize, radius: theme.radius },
                );
                const stem = `qa-${name}-${mode}`;
                new File(Paths.cache, `${stem}.png`).write(
                  renderToPng(Skia, scene, theme, 2, fontsA),
                );
                new File(Paths.cache, `${stem}.svg`).write(renderToSvg(scene, theme));
                new File(Paths.cache, `${stem}-scene.json`).write(JSON.stringify(scene));
                new File(Paths.cache, `${stem}-input.json`).write(
                  JSON.stringify({ source, theme, pixelRatio: 2 }),
                );
              }
            setReport("Exported five regional/mixed CJK fixtures in light and dark at 2x");
          } catch (error) {
            setReport(String(error));
          }
        }}
      />
      <Button
        title="Export all thirteen detailed scenes"
        disabled={!fontsA}
        onPress={() => {
          if (!fontsA) return;
          try {
            const evidence = Object.entries(detailedFixtures).map(([name, source]) => {
              const scene = layoutDiagram(
                parseDiagram(source),
                createSkiaTextMeasurer(Skia, theme, fontsA),
                { ...theme.layout, fontSize: theme.fontSize, radius: theme.radius },
              );
              const png = renderToPng(Skia, scene, theme, 2, fontsA),
                svg = renderToSvg(scene, theme);
              new File(Paths.cache, `qa-type-${name}.png`).write(png);
              new File(Paths.cache, `qa-type-${name}.svg`).write(svg);
              const data = Skia.Data.fromBytes(png);
              try {
                const image = Skia.Image.MakeImageFromEncoded(data);
                if (!image) throw new Error(`PNG decode ${name}`);
                try {
                  return {
                    name,
                    kind: scene.kind,
                    width: image.width(),
                    height: image.height(),
                    pngBytes: png.length,
                    svgBytes: svg.length,
                  };
                } finally {
                  image.dispose();
                }
              } finally {
                data.dispose();
              }
            });
            new File(Paths.cache, "qa-all-types.json").write(JSON.stringify(evidence));
            setReport(`Exported ${evidence.length} detailed native scenes`);
          } catch (error) {
            setReport(String(error));
          }
        }}
      />
      <Button
        title="Start native Picture wrapper audit"
        onPress={() => {
          audit.current?.stop();
          audit.current = startPictureAudit();
          setReport("Native wrapper audit started; counts are not native allocated bytes");
        }}
      />
      <Button
        title="Save native Picture wrapper audit"
        onPress={() => {
          if (audit.current) {
            const evidence = audit.current.snapshot();
            new File(Paths.cache, "qa-picture-audit.json").write(JSON.stringify(evidence));
            setReport(JSON.stringify(evidence));
            console.log("DIAGRAM_PICTURE_AUDIT", JSON.stringify(evidence));
          }
        }}
      />
      <Button
        title="Verify copied Flowchart contents"
        onPress={() => {
          void Clipboard.getStringAsync().then((text) => {
            const evidence = {
              check: "host Flowchart clipboard",
              passed: text === fixtures.Flowchart,
              actual: text,
              expected: fixtures.Flowchart,
            };
            new File(Paths.cache, "qa-clipboard.json").write(JSON.stringify(evidence));
            setReport(JSON.stringify(evidence));
          });
        }}
      />
      <Button
        title="Run 30 mount/provider cycles"
        disabled={!fontsA || !fontsB || running}
        onPress={() => {
          setCycle(0);
          setRunning(true);
          setReport("Running native stress");
        }}
      />
      <Text testID="native-qa-report" selectable>
        {report}
      </Text>
      <Text testID="native-cycle">Cycle: {cycle}</Text>
      {fontsA && fontsB && (
        <InPlaceProbe fontsA={fontsA} fontsB={fontsB} onPicture={observePicture} />
      )}
      {fontsA && fontsB && (
        <StrictMode>
          <StressMount
            key={cycle}
            fonts={cycle % 2 ? fontsB : fontsA}
            onReady={onReady}
            onPicture={observePicture}
          />
        </StrictMode>
      )}
    </ScrollView>
  );
}
