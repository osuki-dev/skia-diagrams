# Historical official regression corpus

`flowchart.md` and `sequenceDiagram.md` are frozen English Mermaid **11.4.1** documentation fetched on 2026-10-05:

- https://github.com/mermaid-js/mermaid/blob/mermaid%4011.4.1/packages/mermaid/src/docs/syntax/flowchart.md
- https://github.com/mermaid-js/mermaid/blob/mermaid%4011.4.1/packages/mermaid/src/docs/syntax/sequenceDiagram.md

The upstream MIT license is retained in `LICENSE`. `test/official.ts` extracts fenced sources from these files for historical regression tests; their selected cases do not define the current support boundary.

The current 31-category, 511-example catalog and its source/hash provenance live in [test/fixtures/official-mermaid](../../test/fixtures/official-mermaid/README.md).

The archived upstream pages retain their original relative links to other Mermaid documentation. Those pages are not copied here; follow the versioned upstream links above to browse the full documentation.
