# Native diagram architecture

The library converts Mermaid source into a semantic `DiagramIR`, then a serializable
`Scene`, then a native Skia `Picture`. Parsing and layout have no DOM, WebView, font
assets or native resource ownership. SVG export consumes the same scene geometry.
Official documentation fixtures are compatibility evidence for particular examples;
their passing count alone does not establish complete Mermaid syntax compatibility.

## Boundaries and extension points

- `src/parse/index.ts` dispatches synchronous grammars; `parseDiagramAsync` loads the
  official Langium parser only for supported types requiring it. Each adapter projects
  semantic nodes, edges and events and retains type-specific data for its layout.
- `src/layout/index.ts` delegates specialized native layouts before handling the
  original diagram families. Type-specific modules own their configuration and
  geometry. A new diagram needs a parser adapter, a layout implementation and semantic
  and visual tests; it does not need a new React rendering component.
- `Scene` contains measured geometry and theme token references. The Skia and SVG
  renderers resolve color tokens during recording or export. Parsing is separate from
  theme editing, and painting is separate from placement.
- `DiagramProvider` supplies inherited theme overrides, mode, host font provider,
  text measurer, motion and expansion callback. Local component values take precedence.
  Font bytes belong only to the example application, never to the published library.
  Host icon resolution supplies optional assets without embedding an icon font.

These are concrete dispatch, adapter and pipeline boundaries, rather than a plugin
framework with additional abstract classes. Keep extensions local to their semantic
family and introduce a shared helper only when geometry or behavior is actually shared.

## Layout algorithms

Compound flowcharts use Dagre's layered directed graph layout. Each cluster is solved
as an atomic box at its parent level, preserving its local rank direction and title
band. Semantic IDs are prefixed inside Dagre/graphlib and translated at the access
boundary, so legal names such as `__proto__` cannot corrupt object-backed indexes. Maps index immediate children and cluster identity. Ancestor lookups are memoized
per level instead of walking the parent chain again for every edge. The hierarchy is
validated before layout, including disconnected parent cycles and unknown parents;
cluster depth is bounded at 64 to protect recursive layout and flattening. Layered
placement is heuristic, and its cost is not linear in graph size. Each compound level
still examines the edge set, so hierarchy depth also affects cost.

Sankey uses Kahn's topological traversal for depth assignment and explicit cycle
rejection. Incoming and outgoing totals determine each node's flow capacity. One common
vertical scale conserves ribbon thickness relative to link weight. Source/target
alignment changes column placement; fixed 25-sample Bézier ribbons bound the rendering
work per link. This is a native layered flow layout, not an implementation of D3's
iterative crossing minimization.

Treemap tiling uses greedy squarified rows, minimizing each row's worst rectangle aspect
ratio relative to the golden-ratio target used by D3, while preserving supplied sibling order. After optional sibling sorting, one
level's tiling is linear in the number of children. Area follows weight, zero weights
have zero area, and the final row consumes the remaining rectangle to control rounding
drift. Hierarchy titles and insets belong to the caller rather than the tiling helper.

Narrow GitGraph uses vertical chronology with distinct branch lanes and measured
label/tag/message rows. Mindmap retains radial placement when it fits; otherwise
a preorder reading tree reserves each node's full measured height and icon space.
Both adapt geometry to the available width without deleting source data or
shrinking the selected font. Mindmap adjacency construction is linear in graph
size, and its hierarchy is validated before recursive radial placement.

TreeView represents an ordered filesystem listing, not a balanced node-link tree. A
stack tracks preceding indentation levels and renders connecting trunks in one pass.
For XY line plots, Liang–Barsky segment clipping preserves the interpolated intersection
with each plot boundary in linear time in the number of points.

Venn has an explicit bounded search budget and bounded set/region counts. Intersections
that cannot be represented by its circle layout produce an error rather than silently
inventing an intersection. Fixed search limits make its visual approximation predictable;
they do not guarantee a solution for every arbitrary set specification.

## Cache, cancellation and native ownership

`SceneCache` is an LRU of serializable scene results, bounded by entry count and primitive
count. Full source participates in valid-source keys alongside geometry configuration
and font/measurer identity. Default font measurement allows color-only edits to reuse
placement; a custom measurer uses the complete theme key because its dependencies cannot
be inferred. Cache keys must identify all geometry-affecting inputs.

Concurrent async requests for one key share their pending preparation. A canceled React
request cannot commit over a newer request; cancellation suppresses commit and does not
pretend to stop already running parser computation. The cache retains no Skia resource.
Each hook owns its recorded Pictures and disposes superseded or unmounted resources.

Each of the 31 diagram families owns an entrance policy. Source IDs and event ordinals
partition primitives into bounded semantic Pictures: axes and frames, growing bars,
chronological messages, table rows, dependency branches and data regions.
Numeric text uses explicit value metadata. UI-thread clipping, transforms and counters
do not parse, measure or record the scene on every frame. Once entrance motion completes,
the hook releases its temporary Pictures/fonts and replays the original full Picture.
Pan and zoom transform that recording. Live reduced-motion settings skip transitions.
Host-controlled execution state is separate from entrance motion. Semantic node and
edge IDs select local highlights; changing state does not parse or lay out the graph.
Expansion uses an explicit button outside the canvas; diagram taps remain available
for semantic interaction, with selected details placed below the canvas.

## Limits and verification

The public parser rejects sources over 200,000 JavaScript string code units. Original
families limit nodes/clusters to 300 and edges/events to 600; specialized adapters also
have family-specific bounds. Do not assume that the source-size limit alone protects a
recursive AST traversal. Apply depth and entry budgets before recursive geometry, and
return an actionable error for cyclic or nonfinite data.

Keep the existing parsing/layout and Picture benchmark baselines unchanged. Measure
algorithm changes against representative branching, nested and dense inputs. Verify
semantic counts and labels, finite bounds, edge endpoints, clipped geometry and native
images independently. Official reference images should use the exact fixture source and
record the upstream renderer version; visual differences are findings to fix, not a
reason to regenerate acceptance baselines silently.
