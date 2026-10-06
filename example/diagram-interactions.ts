import { useCallback, useMemo, useReducer } from "react";
import { Alert, Linking } from "react-native";
import type { DiagramInteraction } from "@osuki-dev/skia-diagrams";
import {
  initialRequestExecution,
  requestExecutionReducer,
  requestExecutionVisual,
} from "./request-execution.ts";

/** Example hosts own navigation; the renderer only emits semantic interactions. */
export function handleExampleLink(interaction: DiagramInteraction): boolean {
  if (interaction.kind !== "link") return false;
  Alert.alert(interaction.label, interaction.target, [
    { text: "Cancel", style: "cancel" },
    {
      text: "Open link",
      onPress: () => {
        void Linking.openURL(interaction.target).catch(() =>
          Alert.alert("Unable to open link", interaction.target),
        );
      },
    },
  ]);
  return true;
}

/** A local request review demonstrates an authored callback without network side effects. */
export function useRequestReviewInteraction() {
  const [request, dispatch] = useReducer(requestExecutionReducer, initialRequestExecution);
  const execution = useMemo(() => requestExecutionVisual(request), [request]);
  const stateExecution = useMemo(() => requestExecutionVisual(request, "state"), [request]);
  const handleInteraction = useCallback(
    (interaction: DiagramInteraction) => {
      if (handleExampleLink(interaction) || interaction.kind !== "callback") return;
      const retryBudget = request.retryBudget;
      dispatch({ type: "review" });
      Alert.alert(
        "Request review",
        `Request: req-2048\nNode: ${interaction.label}\nRetry budget: ${retryBudget}`,
        [
          { text: "Close", style: "cancel" },
          ...(retryBudget > 0
            ? [
                {
                  text: "Retry request",
                  onPress: () => dispatch({ type: "retry" }),
                },
              ]
            : []),
        ],
      );
    },
    [request.retryBudget],
  );
  return {
    handleInteraction,
    request,
    execution,
    stateExecution,
    dispatch,
  };
}
