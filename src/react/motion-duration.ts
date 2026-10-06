import type { DiagramKind } from "../types.ts";

/** Time for the authored semantic phases to remain legible. Host durations take precedence. */
const durations = {
  flowchart: 1500,
  sequence: 1600,
  class: 1400,
  state: 1400,
  er: 1400,
  gantt: 1500,
  pie: 1400,
  gitgraph: 1500,
  mindmap: 1500,
  timeline: 1500,
  journey: 1500,
  quadrant: 1000,
  xychart: 1400,
  swimlanes: 1500,
  requirement: 1400,
  usecase: 1300,
  c4: 1400,
  zenuml: 1600,
  sankey: 1500,
  block: 1300,
  packet: 1300,
  kanban: 1300,
  architecture: 1500,
  radar: 1300,
  eventmodeling: 1500,
  treemap: 1400,
  venn: 1400,
  ishikawa: 1500,
  wardley: 1400,
  cynefin: 1200,
  treeview: 1500,
} satisfies Record<DiagramKind, number>;
export function diagramMotionDuration(kind: string, override?: number): number {
  return Number.isFinite(override)
    ? Math.max(0, Math.min(2000, override!))
    : (durations[kind as DiagramKind] ?? 1300);
}
