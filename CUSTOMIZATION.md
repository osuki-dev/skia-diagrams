# Host configuration

`DiagramProvider` shares configuration across native `Diagram` and `DiagramViewer` components. Nested providers inherit their parent configuration; local props override the corresponding provider fields. Theme overrides merge shared layout fields, each typed per-kind object and line weights. Callers retain ownership of fonts, decoded images and icon primitives.

| Configuration | Public override |
| --- | --- |
| Colors | Background, node/edge/cluster fill and text, strokes, edge-label background, accent, note colors, headers, muted text and grid |
| Category colors | `palette`, `paletteFill` for soft surfaces, `paletteText` for text on categories |
| Typography | `fontFamily`, `fontFamilyMono`, `fontSize`, host `fontProvider`, or injected `measure` |
| Lines and markers | `strokeWidth`, role ratios in `lineWeights`, `radius`, `arrowSize`; explicit source widths remain absolute; `controlBorderWidth` sets native control borders (platform hairline by default) |
| Shared layout | Padding, node/rank spacing, maximum label width/lines, node and edge-label insets, title/header scales |
| Per-kind layout | Typed `layout.typeStyles` for flowchart, sequence, class, state, ER, Gantt, pie, GitGraph, mindmap, timeline, journey, quadrant and XY |
| Native assets | `resolveIcon(name, bounds)` returns vector primitives; `assets.images` maps source identifiers to host-decoded Skia images |
| Motion | Provider `motion: false` or `{ duration }`; component `replayToken` restarts entrance animation; system reduced-motion takes precedence |
| Process state | Component `execution` maps authored node/edge IDs to `idle`, `active`, `completed` or `error`; the host controls transitions |
| Interactions | `onInteraction` receives authored links/callbacks and data selections; `renderDataDetail` replaces selected-data detail content |
| Viewer | `onExpand(source)` controls presentation; `renderExpandIcon({ color, size })` replaces the magnifier and `expandButtonStyle` customizes its visible button |
| Visibility | `Diagram` and `DiagramViewer` accept `active={false}` to cancel pending preparation and release native recordings while offscreen; inline diagrams retain their measured height |
| Viewer localization | `DiagramViewer` accepts `labels={{ close, fit, actualSize, copy }}` for host translations |

The remaining eighteen categories share the common theme and layout options. Their supported source configuration remains available through Mermaid front matter. There is no general typed host `typeStyles` object for those eighteen categories yet. A custom color token cannot change an explicitly authored literal color; edit that source style when changing its appearance.

For the approved chart presentation, `typeStyles.gantt` also accepts `table`, `taskHeader`, `showSections` and `headerHeight`; `typeStyles.pie` accepts `labelColor`, `outerStrokeWidth`, `donutHole`, `highlightScale` and `textPosition`. Explicit host values override the corresponding source configuration; omitted values preserve it. The example uses a full circle with no outer rim or enlarged slice; `typeStyles.xychart.legendMarker` selects `circle` or `line` swatches.

```tsx
import { Diagram, DiagramProvider } from '@osuki-dev/skia-diagrams/react';

<DiagramProvider
  mode="light"
  fontProvider={hostFonts}
  assets={{ images: hostImages }}
  resolveIcon={resolveHostIcon}
  theme={{
    fontFamily: 'HostSans,HostCJK',
    fontFamilyMono: 'HostMono',
    accent: '#FF5A4A',
    palette: ['#FF5A4A', '#3E63FF', '#1F906B'],
    paletteFill: ['#FFD8D1', '#DDE7FF', '#D9F1E4'],
    paletteText: ['#111827', '#111827', '#111827'],
    layout: { padding: 24, typeStyles: { sequence: { laneGap: 96 } } },
  }}
  onInteraction={handleDiagramInteraction}
  onExpand={openDiagramViewer}
>
  <Diagram source={source} maxWidth={containerWidth} />
</DiagramProvider>;
```

Register aliases matching `fontFamily` on the supplied font provider. Replace the provider or asset-map identity when those registrations or decoded images change, so cached measurements/recordings invalidate. The renderer borrows supplied images and never fetches or disposes them. Fonts exist only in the example; the npm package contains none.

Entrance animation follows each diagram's semantics: event order for Timeline, call and reply order for Sequence, dependencies for Flowchart, time direction for Gantt, and data geometry for charts. Pie selection gently offsets the chosen slice and dims the other slices, while its legend and hit coordinates remain fixed. Tapping the same data item again or dismissing the detail reverses the transition; tapping a different item switches selection. It does not simulate process execution. Pass actual process state through `execution` to highlight active nodes and connections; omitted or `idle` IDs retain their authored appearance. `revision` can identify a new state transition without changing the diagram source.

Use authored edge IDs when available. Flowchart edges without an authored ID use `encodeURIComponent(from) + '->' + encodeURIComponent(to) + '#' + parallelOrdinal`, with the ordinal starting at zero. Changing `replayToken` replays entrance motion without invalidating layout.

Inline diagrams keep natural geometry at 100% scale by default, with horizontal scrolling and pinch zoom. Ordinary content uses its natural height and scrolls with the page. Explicit `maxHeight` enables an internal vertical scroller; content above 1200 points defaults to a 420-point preview with a full-view action. `maxWidth` bounds the viewport rather than squeezing the diagram. Pie alone uses the available width to arrange its 180-point default circle and complete legend. Use `fitToViewport` only when an overview is wanted; `minScale` controls the initial scale floor.

Source theme variables are resolved before host overrides. Setting only a host font preserves the source palette; setting a host `palette` replaces it. Gantt frames and task bars use the shared `radius`, while milestones keep their diamond shape.

`parseDiagramAsync` is the unified entry for all 31 official categories. The synchronous API remains useful for the native synchronous grammars; the categories using official asynchronous AST grammars require the async entry. Coverage of the 511 pinned examples does not imply every arbitrary Mermaid program is supported.

## Default visual style

The first approved thirteen-type design is the reference: warm paper, ink and coral, with blue, green and amber category accents and soft tinted surfaces. Light and dark themes share geometry. Labels default to 14 points; host Paragraph metrics determine wrapping. Native Skia and SVG consume the same Scene. Authored gradients and semantic marker silhouettes remain available without browser rendering.

Shared host dimensions are normalized once before layout dispatch. Non-finite values fall back to defaults; font size is bounded to 6–72 points, corner radius to 0–80, shared dimensions to 2400 and label lines to 1–200. Individual layouts apply narrower limits where their geometry requires them. Explicit per-kind options remain optional.
