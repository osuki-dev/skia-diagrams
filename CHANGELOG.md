# @osuki-dev/skia-diagrams

## 0.1.4

### Patch Changes

- [#12](https://github.com/osuki-dev/skia-diagrams/pull/12) [`a5f4f64`](https://github.com/osuki-dev/skia-diagrams/commit/a5f4f64424afd6752782ead658dd4ff9b4b8459b) Thanks [@ryuhzk](https://github.com/ryuhzk)! - Preserve natural diagram geometry in fit previews instead of reflowing wide charts into narrow layouts. Add a compact floating viewer toolbar with idle fade, tap-to-toggle visibility, screen-reader support, and configurable export labels. Support initially hidden inline expand controls without shifting content, and prevent overlapping exports with visible completion feedback.

## 0.1.3

### Patch Changes

- [#10](https://github.com/osuki-dev/skia-diagrams/pull/10) [`db3d95a`](https://github.com/osuki-dev/skia-diagrams/commit/db3d95acd44d3dba265d86d7e97458a1cb7e7182) Thanks [@ryuhzk](https://github.com/ryuhzk)! - Keep Wardley component labels clear of arrow endpoints, measure axis and stage labels, and bound relation captions. Correct reverse-arrow detection without treating angle brackets inside quoted labels as arrow markers.
  
  Reserve measured C4 boundary headers and relation-caption spacing, and separate ZenUML fragment headings from their conditions.

## 0.1.2

### Patch Changes

- [#8](https://github.com/osuki-dev/skia-diagrams/pull/8) [`ba2bfcf`](https://github.com/osuki-dev/skia-diagrams/commit/ba2bfcf5ce4f9de1d556eab8d58a3d89886b92d5) Thanks [@ryuhzk](https://github.com/ryuhzk)! - Improve Git graph connection and commit timing, use continuous pie reveals, and reduce per-frame clipping allocations. Correct Gantt marker reveals, pie outlines around highlighted slices, and short trailing title lines.
  
  Keep inline horizontal dragging and inertia on the UI thread, give diagonal gestures back to the enclosing page, and hide horizontal scroll indicators. Restore picture compositing for reliable visibility during entrance animations.

## 0.1.1

### Patch Changes

- [#5](https://github.com/osuki-dev/skia-diagrams/pull/5) [`4c2d96f`](https://github.com/osuki-dev/skia-diagrams/commit/4c2d96fc38c5a73f44f6c48224f535f085978627) Thanks [@ryuhzk](https://github.com/ryuhzk)! - Reduce native rendering overhead by removing unnecessary offscreen compositing layers and sharing deferred diagram preparation across instances. Add an `active` prop to suspend native recordings for offscreen diagrams while preserving their measured height, and cancel viewer animations and stale completion callbacks during teardown.
  
  Allow hosts to localize the fullscreen viewer controls through `labels`.

## 0.1.0

### Minor Changes

- [`62c822e`](https://github.com/osuki-dev/skia-diagrams/commit/62c822e59c5ca34bbb8a3bcb2794f7e7bb8d9bd8) Thanks [@ryuhzk](https://github.com/ryuhzk)! - Initial release with native Skia rendering, Mermaid syntax, configurable themes and fonts, diagram-specific animations, and inline pan, zoom, and selection interactions.
