# @osuki-dev/skia-diagrams

TypeScript Mermaid parsing and layout with native React Native Skia 3.0.3 rendering. The library uses no DOM or WebView and bundles no fonts. Native parsers and layouts cover 31 official documentation categories; the 511 pinned examples have paired official and Skia captures. This verifies those examples, not every possible Mermaid program or identical placement.

## Install

```sh
bun add @osuki-dev/skia-diagrams
```

Core parsing, layout and SVG export need no native UI packages. Native hosts additionally install the optional peers: React, React Native, unscoped `react-native-skia`, Reanimated and Gesture Handler 3.3 or newer. Use a native development build rather than Expo Go. Android requires API 26 or newer.

The three required runtime dependencies are `@dagrejs/dagre` for graph placement, `@mermaid-js/parser` for official asynchronous AST grammars, and `js-yaml` for shared Mermaid metadata parsing. Fonts, icons and decoded images belong to the host.

## Core usage

```ts
import {
  parseDiagramAsync, layoutDiagram, estimateText, renderToSvg, lightTheme,
} from '@osuki-dev/skia-diagrams';

const parsed = await parseDiagramAsync('flowchart LR\nA[Start] --> B[Done]');
if (parsed.kind !== 'error' && parsed.kind !== 'unsupported') {
  const scene = layoutDiagram(parsed, estimateText, {
    ...lightTheme.layout,
    fontSize: lightTheme.fontSize,
    radius: lightTheme.radius,
  });
  const svg = renderToSvg(scene, lightTheme);
}
```

`parseDiagramAsync` supports the complete category catalog. `parseDiagram` remains synchronous for its native grammar families. Unknown types return `unsupported`; invalid syntax returns an error with line, column and message. Native components turn parsing/layout failures into the supplied fallback.

`findMermaidFences(markdown)` returns source offsets and whether each fence is closed. Render only closed fences while streaming Markdown.

## Native usage

```tsx
import { Diagram, DiagramProvider, DiagramViewer } from '@osuki-dev/skia-diagrams/react';

<DiagramProvider
  fontProvider={hostFonts}
  theme={{ fontFamily: 'HostSans,HostCJK', accent: '#FF5A4A' }}
  onInteraction={handleDiagramInteraction}
  onExpand={openViewer}
>
  <Diagram source={source} maxWidth={containerWidth} />
</DiagramProvider>;

<DiagramViewer
  source={source}
  fontProvider={hostFonts}
  onClose={closeViewer}
  onCopySource={() => copySource(source)}
  onExport={(kind, bytesOrSvg) => shareFromHost(kind, bytesOrSvg)}
/>;
```

Wrap native surfaces in `GestureHandlerRootView`. The host handles clipboard, sharing, navigation and viewer presentation. Canvas taps select data or invoke authored interactions; the corner button explicitly expands the diagram. Entrance, selection and viewport motion respect system reduced motion.

Inline containers measure their parent's available width; `maxWidth` sets an optional ceiling. Diagrams retain their natural layout and default to 100% scale. Wide content scrolls horizontally, and inline pinch zoom works without opening the viewer. Ordinary diagrams use their content height and scroll with the page. An explicit `maxHeight` opts into internal vertical scrolling; diagrams taller than 1200 points use a 420-point preview with a complete-view action. Pie defaults to a 180-point diameter and places its legend below when needed to fit the available width. `fitToViewport` explicitly opts into an overview preview. The top-right magnifier opens the host's viewer, which provides Fit/100%, pinch and pan. PNG exports preserve the requested pixel ratio, reject exports above 16 megapixels or 8192 pixels per dimension, and do not silently shrink large diagrams. SVG export preserves the full scene extent.

See [customization](CUSTOMIZATION.md) for all theme tokens, provider fields, fonts and typed per-kind geometry, and [architecture](ARCHITECTURE.md) for parser/layout boundaries, algorithms and resource ownership.

## Develop and verify

```sh
bun install --frozen-lockfile
bun run typecheck
bun run typecheck:test
bun run lint
bun run format:check
bun test test
bun run bench:check
bun run bench:render:check
bun run build
npm pack --dry-run --json
```

Local TypeScript imports use explicit `.ts` or `.tsx` source extensions, including type imports and re-exports. Lint checks this convention; TypeScript rewrites extensions for emitted JavaScript. External package imports retain their published paths.

Tests check syntax, semantic geometry, cancellation, resources and native renderer output. Pixel goldens allow at most 0.5% changed pixels; the warmed layout/recording benchmarks retain their +30% regression limits. Those checks do not establish native device frame timing or memory use.

`npm pack --dry-run --json` shows the actual publish files and archive size. The archive includes source, compiled JavaScript/declarations and public documentation; it excludes example assets, fixtures, scripts, design artifacts and all fonts. Runtime dependencies and native host binaries are separate from this library's tarball size.

## Examples and references

The [example app](example/README.md) includes the approved thirteen-type visual gallery, theme editor, complex examples, regional CJK cases and a separate 31-category official catalog. QA fonts exist only in `example/assets`.

[Official fixture provenance](test/fixtures/official-mermaid/README.md) records unchanged sources and hashes. `bun scripts/sync-official-fixtures.ts` refreshes that pinned catalog. After generating official reference captures, `bun scripts/compare-official.ts --all --skia-only` regenerates Skia images under `design/theme-studio/official/comparison/` for comparison with the pinned official examples. Generated image artifacts are excluded from Git. Official browser rendering runs only as an offline reference tool. `scripts/generate-block-parser.ts` reproduces the vendored official Block grammar without a runtime generator dependency.

Reference regeneration requires Mermaid CLI (`mmdc`) on `PATH`, or an explicit `--cli <mmdc-path>`. Run `bun scripts/compare-official.ts --all` to create both reference and Skia captures. Optional `--puppeteer <puppeteer-json>` and `--config <mermaid-json>` supply browser and Mermaid settings. The report records the actual CLI and Mermaid versions; use the pinned fixture renderer version when comparing references. `--skia-only` requires the existing reference images and their manifest in the same output directory, and then needs no Mermaid CLI installation. These tools are for offline verification and are not runtime dependencies.
