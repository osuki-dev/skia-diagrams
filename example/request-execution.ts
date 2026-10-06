export type RequestStage = "idle" | "executing" | "retry" | "backoff" | "review" | "completed";

export interface RequestExecution {
  stage: RequestStage;
  retryBudget: number;
  attempt: number;
  retryOrigin?: "retry" | "review";
}

export type RequestAction =
  | { type: "start" }
  | { type: "fail" }
  | { type: "retry" }
  | { type: "resume" }
  | { type: "succeed" }
  | { type: "review" }
  | { type: "reset" };

export const initialRequestExecution: RequestExecution = {
  stage: "idle",
  retryBudget: 3,
  attempt: 0,
};

/** A separate host-driven State example; the fork/join syntax fixture stays unchanged. */
export const requestStateFixture = `stateDiagram-v2
direction TB
state "Run worker" as Execute
state "Retry decision" as Retry
state "Schedule backoff" as Backoff
state "Manual review" as Review
state "Commit result" as Commit
[*] --> Execute
Execute --> Retry : failed
Execute --> Commit : succeeded
Retry --> Backoff : retry
Backoff --> Execute : resume
Retry --> Review : exhausted
Review --> Backoff : approve
Commit --> [*]`;

/** The example host owns workflow decisions; animation only reflects accepted transitions. */
export function requestExecutionReducer(
  state: RequestExecution,
  action: RequestAction,
): RequestExecution {
  switch (action.type) {
    case "start":
      return state.stage === "idle" ? { ...state, stage: "executing", attempt: 1 } : state;
    case "fail":
      return state.stage === "executing"
        ? { ...state, stage: state.retryBudget > 0 ? "retry" : "review" }
        : state;
    case "retry":
      return (state.stage === "retry" || state.stage === "review") && state.retryBudget > 0
        ? {
            ...state,
            stage: "backoff",
            retryBudget: state.retryBudget - 1,
            retryOrigin: state.stage,
          }
        : state;
    case "resume":
      return state.stage === "backoff"
        ? { ...state, stage: "executing", attempt: state.attempt + 1 }
        : state;
    case "succeed":
      return state.stage === "executing" ? { ...state, stage: "completed" } : state;
    case "review":
      return state.stage === "completed" ? state : { ...state, stage: "review" };
    case "reset":
      return initialRequestExecution;
  }
}

export const requestStageLabels: Record<RequestStage, string> = {
  idle: "Ready to run",
  executing: "Worker running",
  retry: "Worker failed · Retry decision",
  backoff: "Retry queued · Backoff scheduled",
  review: "Manual review required",
  completed: "Completed",
};

type ExecutionStatus = "idle" | "active" | "completed" | "error";
export function requestExecutionVisual(
  request: RequestExecution,
  kind: "flowchart" | "state" = "flowchart",
): {
  nodes: Record<string, ExecutionStatus>;
  edges: Record<string, ExecutionStatus>;
  revision: string;
} {
  const nodes: Record<string, ExecutionStatus> = {};
  const edges: Record<string, ExecutionStatus> = {};
  switch (request.stage) {
    case "idle":
      break;
    case "executing":
      nodes.Execute = "active";
      edges[request.attempt > 1 ? "worker-resume" : "worker-start"] = "active";
      break;
    case "retry":
      nodes.Execute = "error";
      nodes.Retry = "active";
      edges["worker-result"] = "completed";
      edges["worker-failure"] = "active";
      break;
    case "backoff":
      nodes.Execute = "error";
      nodes.Retry = "completed";
      nodes.Backoff = "active";
      edges[request.retryOrigin === "review" ? "review-retry" : "retry-scheduled"] = "active";
      break;
    case "review":
      nodes.Execute = "error";
      nodes.Retry = "completed";
      nodes.Review = "active";
      edges["manual-review"] = "active";
      break;
    case "completed":
      nodes.Execute = "completed";
      nodes.Complete = "completed";
      nodes.Commit = "completed";
      edges["worker-result"] = "completed";
      edges["worker-success"] = "completed";
      break;
  }
  if (kind === "state") {
    delete nodes.Complete;
    const stateEdges: Record<string, ExecutionStatus> = {};
    const ids: Record<string, string> = {
      "worker-start": "start-0->Execute#0",
      "worker-resume": "Backoff->Execute#0",
      "worker-failure": "Execute->Retry#0",
      "worker-success": "Execute->Commit#0",
      "retry-scheduled": "Retry->Backoff#0",
      "review-retry": "Review->Backoff#0",
      "manual-review": "Retry->Review#0",
    };
    for (const [id, status] of Object.entries(edges)) if (ids[id]) stateEdges[ids[id]] = status;
    return {
      nodes,
      edges: stateEdges,
      revision: `${request.stage}:${request.attempt}:${request.retryBudget}`,
    };
  }
  return { nodes, edges, revision: `${request.stage}:${request.attempt}:${request.retryBudget}` };
}
