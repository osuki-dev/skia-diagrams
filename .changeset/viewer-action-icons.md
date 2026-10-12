---
"@osuki-dev/skia-diagrams": minor
---

Add a provider-level `renderViewerIcon` hook with per-viewer overrides for close,
fit, copy-source, and export-success graphics. Hosts can use their own icon family
without changing toolbar actions, accessibility, or numeric and format labels.
Custom graphics are decorative; the toolbar retains touch handling and accessible
button labels.
