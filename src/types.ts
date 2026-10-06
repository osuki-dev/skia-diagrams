export type DiagramKind =
  | "flowchart"
  | "sequence"
  | "class"
  | "state"
  | "er"
  | "gantt"
  | "pie"
  | "gitgraph"
  | "mindmap"
  | "timeline"
  | "journey"
  | "quadrant"
  | "xychart"
  | "swimlanes"
  | "requirement"
  | "usecase"
  | "c4"
  | "zenuml"
  | "sankey"
  | "block"
  | "packet"
  | "kanban"
  | "architecture"
  | "radar"
  | "eventmodeling"
  | "treemap"
  | "venn"
  | "ishikawa"
  | "wardley"
  | "cynefin"
  | "treeview";
export type Shape =
  | "rect"
  | "round"
  | "stadium"
  | "subroutine"
  | "cylinder"
  | "circle"
  | "doublecircle"
  | "flag"
  | "diamond"
  | "hexagon"
  | "parallelogram"
  | "reverse-parallelogram"
  | "trapezoid"
  | "reverse-trapezoid"
  | "text"
  | "notch-rect"
  | "lin-rect"
  | "sm-circ"
  | "fr-circ"
  | "fork"
  | "hourglass"
  | "brace"
  | "brace-r"
  | "braces"
  | "bolt"
  | "doc"
  | "delay"
  | "h-cyl"
  | "lin-cyl"
  | "curv-trap"
  | "div-rect"
  | "tri"
  | "win-pane"
  | "f-circ"
  | "notch-pent"
  | "flip-tri"
  | "sl-rect"
  | "docs"
  | "st-rect"
  | "bow-rect"
  | "cross-circ"
  | "tag-doc"
  | "tag-rect"
  | "paper-tape"
  | "lin-doc";
export type Marker =
  | "none"
  | "arrow"
  | "open"
  | "hollow-triangle"
  | "circle"
  | "cross"
  | "diamond"
  | "hollow-diamond"
  | "crow"
  | "er-one"
  | "er-zero-one"
  | "er-one-many"
  | "er-zero-many";
export interface DiagramError {
  kind: "syntax" | "limit" | "layout";
  line: number;
  column: number;
  message: string;
}
export interface Node {
  sequence?: { type?: string; links?: { label: string; url: string }[] };
  metadata?: Record<string, unknown>;
  interaction?: { kind: "link" | "callback"; target: string; tooltip?: string };
  annotation?: string;
  classes?: string[];
  id: string;
  label: string;
  shape: Shape;
  parent?: string;
  style?: Style;
  role?: "start" | "end" | "fork" | "join";
  attributes?: { type: string; name: string; key: string; comment: string }[];
}
export interface Style {
  textOutline?: { color: string; width: number };
  gradient?: { from: Point; to: Point; stops: { offset: number; color: string }[] };
  opacity?: number;
  fontWeight?: number;
  fontStyle?: "normal" | "italic";
  fill?: string;
  stroke?: string;
  color?: string;
  strokeWidth?: number;
  dash?: number[];
  /** Relative weight role; an explicit strokeWidth still wins. */
  strokeRole?: "node" | "edge" | "frame" | "grid" | "series";
}
export interface Edge {
  id?: string;
  metadata?: Record<string, unknown>;
  from: string;
  to: string;
  label: string;
  start: Marker;
  end: Marker;
  dashed?: boolean;
  thick?: boolean;
  style?: Style;
  minLength?: number;
}
export interface Cluster {
  role?: "parallel-region";
  id: string;
  label: string;
  parent?: string;
  direction?: string;
  style?: Style;
}
export interface Event {
  type: string;
  label: string;
  from?: string;
  to?: string;
  value?: number;
  values?: number[];
  depth?: number;
  start?: number;
  end?: number;
  flags?: string[];
  section?: string;
  actors?: string[];
}
export interface DiagramIR {
  /** Complete, serializable semantic data for type-specific native layouts. */
  data?: Record<string, unknown>;
  horizontal?: boolean;
  nodes: Node[];
  edges: Edge[];
  clusters: Cluster[];
  events: Event[];
  direction: string;
  title?: string;
  description?: string;
  theme?: "light" | "dark";
  variables?: Record<string, string>;
  axis?: {
    labels: string[];
    min: number;
    max: number;
    xMin?: number;
    xMax?: number;
    xTitle?: string;
    yTitle?: string;
    explicitY?: boolean;
  };
  gantt?: { dateFormat: string; axisFormat: string };
}
export type ParsedDiagram =
  | { kind: DiagramKind; ir: DiagramIR }
  | { kind: "error"; error: DiagramError }
  | { kind: "unsupported"; type: string };
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Point {
  x: number;
  y: number;
}
export interface DiagramPrimitiveSemantic {
  kind: "node" | "edge" | "frame";
  id: string;
  from?: string;
  to?: string;
  part?: "body" | "label" | "icon";
  role?: string;
  group?: string;
  row?: number;
}
export type Primitive = (
  | ({ type: "image"; asset: string } & Rect & Style)
  | ({
      type: "sector";
      cx: number;
      cy: number;
      radius: number;
      innerRadius?: number;
      startAngle: number;
      sweepAngle: number;
    } & Rect &
      Style)
  | ({
      type: "shape";
      shape: Shape;
      label?: string;
      id?: string;
      radius?: number;
      /** Authored chart axis and zero coordinate; animation never infers a baseline. */
      motion?: { axis: "x" | "y"; baseline: number };
    } & Rect &
      Style)
  | ({
      type: "text";
      literal?: boolean;
      text: string;
      fontSize: number;
      fontWeight?: number;
      /** Numeric semantics supplied by layout; arbitrary labels are never interpreted as values. */
      motion?: { value: number; decimals?: number; prefix?: string; suffix?: string };
      lineRuns?: { text: string; bold?: boolean; italic?: boolean }[][];
      /** Host/Paragraph-measured baselines, relative to this text's top. */
      lineBaselines?: number[];
    } & Rect &
      Style)
  | {
      type: "path";
      /** Authored series progression axis, independent of its screen aspect ratio. */
      motion?: { axis: "x" | "y" };
      /** Authored cubic segments; points[0] is the path start. */
      curves?: { control1: Point; control2: Point; end: Point }[];
      gradient?: Style["gradient"];
      opacity?: number;
      points: Point[];
      start?: Marker;
      end?: Marker;
      stroke?: string;
      strokeWidth?: number;
      strokeRole?: Style["strokeRole"];
      dash?: number[];
      closed?: boolean;
      smooth?: boolean;
      fill?: string;
    }
) & { semantic?: DiagramPrimitiveSemantic };
export interface Scene {
  interactions?: DiagramInteraction[];
  kind: DiagramKind;
  bounds: Rect;
  primitives: Primitive[];
  accessibilityLabel: string;
}
/** Logical scene coordinates keep host interactions independent of viewport scale. */
export interface DiagramInteraction extends Rect {
  id: string;
  label: string;
  kind: "link" | "callback" | "data";
  target: string;
  tooltip?: string;
  value?: number;
  hit?:
    | {
        type: "sector";
        cx: number;
        cy: number;
        radius: number;
        innerRadius?: number;
        startAngle: number;
        sweepAngle: number;
      }
    | { type: "circle"; cx: number; cy: number; radius: number }
    | { type: "polygon"; points: Point[] }
    | { type: "venn"; circles: { cx: number; cy: number; radius: number; included: boolean }[] };
}
export interface TextStyle {
  literal?: boolean;
  fontSize: number;
  fontWeight?: number;
  fontFamily?: string;
  maxWidth?: number;
}
export type TextMeasurer = (
  text: string,
  style: TextStyle,
) => { width: number; height: number; lines: string[]; lineBaselines?: number[] };
export interface LayoutOptions {
  /** Available inline viewport in scene points; full viewers may omit this. */
  viewportWidth?: number;
  /** Native vector icons supplied by the host; no icon font or browser is required. */
  resolveIcon?: DiagramIconResolver;
  /** Intrinsic host-image dimensions, used by authored aspect-ratio constraints. */
  resolveImageSize?: (asset: string) => { width: number; height: number } | undefined;
  fontSize?: number;
  /** Must match the renderer's radius for rounded node contact. */
  radius?: number;
  nodeSeparation?: number;
  rankSeparation?: number;
  padding?: number;
  maxLabelWidth?: number;
  maxLabelLines?: number;
  /** Flowchart label insets and edge-pill reserve, in scene points. */
  nodePaddingX?: number;
  nodePaddingY?: number;
  edgeLabelPaddingX?: number;
  edgeLabelPaddingY?: number;
  /** Measured typographic hierarchy; body fontSize stays authoritative. */
  titleScale?: number;
  headerScale?: number;
  typeStyles?: DiagramLayoutStyles;
}
export type DiagramIconResolver = (name: string, bounds: Rect) => readonly Primitive[] | undefined;

/** Optional per-type geometry, in scene points. No renderer or UI dependency. */
export interface DiagramLayoutStyles {
  flowchart?: { minNodeWidth?: number; minNodeHeight?: number };
  sequence?: {
    participantWidth?: number;
    laneGap?: number;
    rowGap?: number;
    activationWidth?: number;
  };
  class?: { cellPaddingX?: number; cellPaddingY?: number };
  state?: { nodePaddingX?: number; nodePaddingY?: number; terminalSize?: number };
  er?: { cellPaddingX?: number; cellPaddingY?: number; rowGap?: number };
  gantt?: {
    plotWidth?: number;
    labelWidth?: number;
    barHeight?: number;
    rowGap?: number;
    /** Framed task/date grid; dates continue to use the authored axisFormat. */
    table?: boolean;
    taskHeader?: string;
    showSections?: boolean;
    headerHeight?: number;
  };
  pie?: {
    /** Host presentation overrides take precedence over authored source configuration. */
    outerStrokeWidth?: number;
    donutHole?: number;
    highlightScale?: number;
    textPosition?: number;
    /** Percentage labels only; does not alter other diagrams or legend text. */
    labelColor?: string;
    diameter?: number;
    legendGap?: number;
    legendRowGap?: number;
    legendPosition?: "right" | "bottom";
  };
  gitgraph?: { commitRadius?: number; columnGap?: number; laneGap?: number };
  mindmap?: {
    nodePaddingX?: number;
    nodePaddingY?: number;
    radialGap?: number;
    branchGap?: number;
  };
  timeline?: { cardWidth?: number; eventGap?: number; periodScale?: number; markerRadius?: number };
  journey?: { cardWidth?: number; cardGap?: number; scoreRadius?: number; actorGap?: number };
  quadrant?: { plotSize?: number; labelGap?: number; pointRadius?: number };
  xychart?: {
    plotWidth?: number;
    plotHeight?: number;
    barGap?: number;
    pointRadius?: number;
    legendPosition?: "right" | "bottom";
    seriesLabels?: string[];
    seriesPalette?: number[];
    legendMarker?: "circle" | "line";
  };
}
