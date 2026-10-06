import type { Dispatch } from "react";
import { Text, View } from "react-native";
import type { DiagramTheme } from "@osuki-dev/skia-diagrams";
import { DemoButton as Button } from "./demo-button.tsx";
import type { RequestAction, RequestExecution } from "./request-execution.ts";
import { requestStageLabels } from "./request-execution.ts";

export function RequestControls({
  request,
  dispatch,
  theme,
}: {
  request: RequestExecution;
  dispatch: Dispatch<RequestAction>;
  theme: DiagramTheme;
}) {
  return (
    <View
      testID="request-review-status"
      style={{
        gap: 6,
        padding: 12,
        borderRadius: theme.radius,
        borderWidth: 1,
        borderColor: theme.gridStroke,
        backgroundColor: theme.nodeFill,
      }}
    >
      <Text accessibilityLiveRegion="polite" style={{ color: theme.nodeText, fontWeight: "600" }}>
        Request req-2048 · {requestStageLabels[request.stage]}
      </Text>
      <Text style={{ color: theme.mutedText }}>
        Attempt {request.attempt} · Retry budget: {request.retryBudget}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
        {request.stage === "idle" && (
          <Button
            testID="request-start"
            title="Run worker"
            onPress={() => dispatch({ type: "start" })}
          />
        )}
        {request.stage === "executing" && (
          <>
            <Button
              testID="request-fail"
              title="Fail worker"
              onPress={() => dispatch({ type: "fail" })}
            />
            <Button
              testID="request-succeed"
              title="Succeed"
              onPress={() => dispatch({ type: "succeed" })}
            />
          </>
        )}
        {(request.stage === "retry" || request.stage === "review") && request.retryBudget > 0 && (
          <Button
            testID="request-retry"
            title="Schedule retry"
            onPress={() => dispatch({ type: "retry" })}
          />
        )}
        {request.stage === "backoff" && (
          <Button
            testID="request-resume"
            title="Resume worker"
            onPress={() => dispatch({ type: "resume" })}
          />
        )}
        {request.stage !== "idle" && (
          <Button
            testID="request-reset"
            title="Reset request"
            onPress={() => dispatch({ type: "reset" })}
          />
        )}
      </View>
    </View>
  );
}
