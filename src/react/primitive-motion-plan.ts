import type { DiagramKind, Primitive, Rect, Scene } from "../types.ts";
import type { DiagramMotionPolicy } from "./motion-policy.ts";
import { flowchartMotion } from "./motion-policies/flowchart.ts";
import { sequenceMotion } from "./motion-policies/sequence.ts";
import { classMotion } from "./motion-policies/class.ts";
import { stateMotion } from "./motion-policies/state.ts";
import { erMotion } from "./motion-policies/er.ts";
import { ganttMotion } from "./motion-policies/gantt.ts";
import { pieMotion } from "./motion-policies/pie.ts";
import { gitgraphMotion } from "./motion-policies/gitgraph.ts";
import { mindmapMotion } from "./motion-policies/mindmap.ts";
import { timelineMotion } from "./motion-policies/timeline.ts";
import { journeyMotion } from "./motion-policies/journey.ts";
import { quadrantMotion } from "./motion-policies/quadrant.ts";
import { xychartMotion } from "./motion-policies/xychart.ts";
import { swimlanesMotion } from "./motion-policies/swimlanes.ts";
import { requirementMotion } from "./motion-policies/requirement.ts";
import { usecaseMotion } from "./motion-policies/usecase.ts";
import { c4Motion } from "./motion-policies/c4.ts";
import { zenumlMotion } from "./motion-policies/zenuml.ts";
import { sankeyMotion } from "./motion-policies/sankey.ts";
import { blockMotion } from "./motion-policies/block.ts";
import { packetMotion } from "./motion-policies/packet.ts";
import { kanbanMotion } from "./motion-policies/kanban.ts";
import { architectureMotion } from "./motion-policies/architecture.ts";
import { radarMotion } from "./motion-policies/radar.ts";
import { eventmodelingMotion } from "./motion-policies/eventmodeling.ts";
import { treemapMotion } from "./motion-policies/treemap.ts";
import { vennMotion } from "./motion-policies/venn.ts";
import { ishikawaMotion } from "./motion-policies/ishikawa.ts";
import { wardleyMotion } from "./motion-policies/wardley.ts";
import { cynefinMotion } from "./motion-policies/cynefin.ts";
import { treeviewMotion } from "./motion-policies/treeview.ts";

export type PrimitiveMotion =
  | "trace"
  | "grow-x"
  | "grow-y"
  | "draw-x"
  | "draw-y"
  | "fade"
  | "lift"
  | "radial"
  | "scale";
export interface PrimitiveMotionLayer {
  primitives: Primitive[];
  mode: PrimitiveMotion;
  delay: number;
  /** Fraction of the shared timeline reserved for this semantic phase. */
  span?: number;
  /** Continuous sweeps avoid restarting an ease-out curve at each semantic phase. */
  easing?: "linear" | "ease-out";
  bounds: Rect;
  circle?: { cx: number; cy: number; radius: number; startAngle: number; sweepAngle: number };
  baseline?: number;
  center?: { x: number; y: number };
  regions?: Rect[];
}
export interface NumericMotion {
  delay?: number;
  span?: number;
  primitive: Extract<Primitive, { type: "text" }>;
  value: number;
  decimals: number;
  prefix: string;
  suffix: string;
}
export interface PrimitiveMotionPlan {
  staticPrimitives: Primitive[];
  layers: PrimitiveMotionLayer[];
  numbers: NumericMotion[];
}

const policies = {
  flowchart: flowchartMotion,
  sequence: sequenceMotion,
  class: classMotion,
  state: stateMotion,
  er: erMotion,
  gantt: ganttMotion,
  pie: pieMotion,
  gitgraph: gitgraphMotion,
  mindmap: mindmapMotion,
  timeline: timelineMotion,
  journey: journeyMotion,
  quadrant: quadrantMotion,
  xychart: xychartMotion,
  swimlanes: swimlanesMotion,
  requirement: requirementMotion,
  usecase: usecaseMotion,
  c4: c4Motion,
  zenuml: zenumlMotion,
  sankey: sankeyMotion,
  block: blockMotion,
  packet: packetMotion,
  kanban: kanbanMotion,
  architecture: architectureMotion,
  radar: radarMotion,
  eventmodeling: eventmodelingMotion,
  treemap: treemapMotion,
  venn: vennMotion,
  ishikawa: ishikawaMotion,
  wardley: wardleyMotion,
  cynefin: cynefinMotion,
  treeview: treeviewMotion,
} satisfies Record<DiagramKind, DiagramMotionPolicy>;

/** Per-type policies prepare bounded disjoint records once, never on the animation thread. */
export function createPrimitiveMotionPlan(scene: Scene): PrimitiveMotionPlan {
  return policies[scene.kind](scene);
}
