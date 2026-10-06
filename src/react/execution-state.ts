import type { Primitive, Scene } from "../types.ts";

export type DiagramExecutionStatus = "idle" | "active" | "completed" | "error";
/** The host supplies actual process state; the renderer never advances it. */
export interface DiagramExecutionState {
  nodes?: Readonly<Record<string, DiagramExecutionStatus>>;
  edges?: Readonly<Record<string, DiagramExecutionStatus>>;
  revision?: string | number;
}
export interface ExecutionPrimitive {
  primitive: Primitive;
  status: Exclude<DiagramExecutionStatus, "idle">;
}
/** Match semantic source IDs, excluding inherited object properties and unknown
 * statuses. An omitted or idle item remains exactly as authored. */
export function executionPrimitives(
  scene: Scene,
  execution: DiagramExecutionState,
): ExecutionPrimitive[] {
  const result: ExecutionPrimitive[] = [];
  for (const primitive of scene.primitives) {
    const semantic = primitive.semantic;
    if (!semantic || semantic.kind === "frame") continue;
    const record = semantic.kind === "edge" ? execution.edges : execution.nodes;
    if (!record || !Object.hasOwn(record, semantic.id)) continue;
    const status = record[semantic.id];
    if (status === "active" || status === "completed" || status === "error")
      result.push({ primitive, status });
  }
  return result;
}
