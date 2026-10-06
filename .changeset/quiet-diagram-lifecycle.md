---
"@osuki-dev/skia-diagrams": patch
---

Reduce native rendering overhead by removing unnecessary offscreen compositing layers and sharing deferred diagram preparation across instances. Add an `active` prop to suspend native recordings for offscreen diagrams while preserving their measured height, and cancel viewer animations and stale completion callbacks during teardown.

Allow hosts to localize the fullscreen viewer controls through `labels`.
