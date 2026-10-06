import { startTransition, Suspense, useEffect, useRef, useState } from "react";
import { Button, Text, View } from "react-native";
import { Canvas, Picture, type SkTypefaceFontProvider, type SkPicture } from "react-native-skia";
import { File, Paths } from "expo-file-system";
import { lightTheme } from "@osuki-dev/skia-diagrams";
import { useDiagram } from "@osuki-dev/skia-diagrams/react";
import { requestSceneAsync } from "../src/layout/request.ts";
const originalSource = "flowchart LR\nA[Original] --> B[Ready]";
const replacementSource = "flowchart LR\nA[Interrupted] --> B[Never committed]";
const never = new Promise<void>(() => {});
const theme = { ...lightTheme, fontFamily: "QA,QACJK" };
function ProbeDiagram({ source, fonts }: { source: string; fonts: SkTypefaceFontProvider }) {
  const result = useDiagram(source, theme, undefined, fonts);
  const initialPicture = useRef<SkPicture | undefined>(undefined);
  useEffect(() => {
    if (result.status === "ready") {
      if (initialPicture.current)
        console.log(
          "DIAGRAM_INTERRUPTION_COMMITTED_PICTURE",
          result.picture === initialPicture.current,
        );
      else initialPicture.current = result.picture;
    }
  }, [result]);
  if (source === replacementSource) {
    // Deliberate test instrumentation confirms React entered the suspended render.
    console.log("DIAGRAM_INTERRUPTED_RENDER_ENTERED");
    throw never;
  }
  return result.status === "ready" ? (
    <Canvas style={{ width: result.bounds.width, height: result.bounds.height }}>
      <Picture picture={result.picture} />
    </Canvas>
  ) : (
    <Text>{result.status}</Text>
  );
}
export function NativeInterruptionProbe({ fonts }: { fonts: SkTypefaceFontProvider }) {
  const [source, setSource] = useState(originalSource);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cancellationTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingCancel = useRef<(() => void) | undefined>(undefined);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (cancellationTimer.current) clearTimeout(cancellationTimer.current);
      pendingCancel.current?.();
    },
    [],
  );
  return (
    <View>
      <Button
        title="Interrupt suspended diagram render"
        onPress={() => {
          startTransition(() => setSource(replacementSource));
          timer.current = setTimeout(() => {
            setSource(originalSource);
            console.log("DIAGRAM_INTERRUPTED_RENDER_RECOVERED");
          }, 300);
        }}
      />
      <Button
        title="Cancel pending request with late callback"
        onPress={() => {
          pendingCancel.current?.();
          if (cancellationTimer.current) clearTimeout(cancellationTimer.current);
          const events: string[] = [];
          const cancel = requestSceneAsync(
            async () => {
              events.push("prepare");
              return "stale";
            },
            (work) => {
              cancellationTimer.current = setTimeout(() => {
                events.push("late callback");
                work();
                const evidence = {
                  events,
                  passed: !events.includes("prepare") && !events.includes("commit"),
                  boundary: "production requestSceneAsync with deliberately late native timer",
                };
                new File(Paths.cache, "qa-cancellation.json").write(JSON.stringify(evidence));
                console.log("DIAGRAM_CANCEL_PROBE", JSON.stringify(evidence));
              }, 300);
              return {
                cancel: () => {
                  events.push("cancel");
                },
              };
            },
            () => {
              events.push("commit");
            },
            () => {
              events.push("error");
            },
          );
          pendingCancel.current = cancel;
          cancel();
        }}
      />
      <Suspense fallback={<Text>Suspended replacement</Text>}>
        <ProbeDiagram source={source} fonts={fonts} />
      </Suspense>
    </View>
  );
}
