import { expect, test } from "bun:test";
import {
  initialRequestExecution,
  requestExecutionReducer,
  requestExecutionVisual,
  requestStateFixture,
} from "../example/request-execution.ts";
import { approvedExampleTheme, designChartStyles } from "../example/design-fixtures.ts";
import { detailedFixtures } from "../example/fixture-cases.ts";
import { parseDiagram } from "../src/index.ts";

test("request execution consumes each retry once and routes exhausted failures to manual review", () => {
  let request = requestExecutionReducer(initialRequestExecution, { type: "start" });
  for (let remaining = 2; remaining >= 0; remaining--) {
    request = requestExecutionReducer(request, { type: "fail" });
    expect(request.stage).toBe("retry");
    request = requestExecutionReducer(request, { type: "retry" });
    expect(request.retryBudget).toBe(remaining);
    expect(request.stage).toBe("backoff");
    expect(requestExecutionReducer(request, { type: "retry" })).toBe(request);
    request = requestExecutionReducer(request, { type: "resume" });
  }
  expect(request.attempt).toBe(4);
  request = requestExecutionReducer(request, { type: "fail" });
  expect(request.stage).toBe("review");
  expect(requestExecutionReducer(request, { type: "retry" })).toBe(request);
});

test("request success is terminal until explicit reset", () => {
  const running = requestExecutionReducer(initialRequestExecution, { type: "start" });
  const completed = requestExecutionReducer(running, { type: "succeed" });
  expect(completed.stage).toBe("completed");
  expect(requestExecutionReducer(completed, { type: "fail" })).toBe(completed);
  expect(requestExecutionReducer(completed, { type: "review" })).toBe(completed);
  expect(requestExecutionReducer(completed, { type: "reset" })).toEqual(initialRequestExecution);
});

test("approved example chart defaults preserve sibling styles when hosts override a token", () => {
  const theme = approvedExampleTheme({
    layout: { typeStyles: { xychart: { legendPosition: "bottom" }, pie: { diameter: 180 } } },
  });
  expect(theme.layout?.typeStyles?.xychart?.legendPosition).toBe("bottom");
  expect(theme.layout?.typeStyles?.xychart?.legendMarker).toBe("circle");
  expect(theme.layout?.typeStyles?.gantt?.table).toBe(true);
  expect(theme.layout?.typeStyles?.pie).toEqual({ ...designChartStyles.pie, diameter: 180 });
});

test("execution overlays target authored IDs and leave unvisited parts unspecified", () => {
  const parsed = parseDiagram(detailedFixtures.Flowchart);
  if (parsed.kind !== "flowchart") throw new Error("Expected authored flowchart");
  const ir = parsed.ir;
  for (const stage of ["idle", "executing", "retry", "backoff", "review", "completed"] as const) {
    const visual = requestExecutionVisual({ stage, attempt: 2, retryBudget: 1 });
    for (const id of Object.keys(visual.nodes))
      expect(ir.nodes.some((node) => node.id === id)).toBe(true);
    for (const id of Object.keys(visual.edges))
      expect(ir.edges.some((edge) => edge.id === id)).toBe(true);
    expect(visual.nodes.Identity).toBeUndefined();
    expect(visual.nodes.Cached).toBeUndefined();
  }
  expect(requestExecutionVisual(initialRequestExecution).nodes).toEqual({});
  expect(requestExecutionVisual(initialRequestExecution).edges).toEqual({});
});

test("State lifecycle selectors use original semantic transitions including approved review retries", () => {
  const parsed = parseDiagram(requestStateFixture);
  if (parsed.kind !== "state") throw new Error("Expected authored state diagram");
  const edgeIds = new Set(parsed.ir.edges.map((edge) => `${edge.from}->${edge.to}#0`));
  let request = requestExecutionReducer(initialRequestExecution, { type: "start" });
  for (const action of [
    "fail",
    "retry",
    "resume",
    "review",
    "retry",
    "resume",
    "succeed",
  ] as const) {
    request = requestExecutionReducer(request, { type: action });
    const visual = requestExecutionVisual(request, "state");
    for (const id of Object.keys(visual.nodes))
      expect(parsed.ir.nodes.some((node) => node.id === id)).toBe(true);
    for (const id of Object.keys(visual.edges)) expect(edgeIds.has(id)).toBe(true);
    if (request.stage === "backoff" && request.retryOrigin === "review") {
      expect(visual.edges["Review->Backoff#0"]).toBe("active");
      expect(requestExecutionVisual(request).edges["review-retry"]).toBe("active");
    }
  }
});
