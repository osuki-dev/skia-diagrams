# @osuki-dev/skia-diagrams

## 0.1.1

### Patch Changes

- [#5](https://github.com/osuki-dev/skia-diagrams/pull/5) [`4c2d96f`](https://github.com/osuki-dev/skia-diagrams/commit/4c2d96fc38c5a73f44f6c48224f535f085978627) Thanks [@ryuhzk](https://github.com/ryuhzk)! - Reduce native rendering overhead by removing unnecessary offscreen compositing layers and sharing deferred diagram preparation across instances. Add an `active` prop to suspend native recordings for offscreen diagrams while preserving their measured height, and cancel viewer animations and stale completion callbacks during teardown.
  
  Allow hosts to localize the fullscreen viewer controls through `labels`.

## 0.1.0

### Minor Changes

- [`62c822e`](https://github.com/osuki-dev/skia-diagrams/commit/62c822e59c5ca34bbb8a3bcb2794f7e7bb8d9bd8) Thanks [@ryuhzk](https://github.com/ryuhzk)! - Initial release with native Skia rendering, Mermaid syntax, configurable themes and fonts, diagram-specific animations, and inline pan, zoom, and selection interactions.
