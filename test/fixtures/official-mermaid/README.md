# Official Mermaid fixtures

`catalog.json` contains 31 official diagram categories and all 511 fenced examples
from the English Mermaid documentation, pinned to Mermaid 12.1.0 / upstream commit
`97b345154f2cd71f23a2aadb14af6dad46f63173`.

Every case records the canonical documentation name, section title, unchanged
source, SHA-256, documentation URL and source URL. `type/NNN` IDs follow source
order within each document. CJK cases are marked rather than translated.

Run `bun scripts/sync-official-fixtures.ts` to regenerate both this archive and
`example/official-fixtures.ts`. Updates are atomic at catalog level: failed downloads
leave the previous catalog intact. The example generated module is the runtime
copy; tests verify equality with the independent archive and verify every source hash.

Keep these separate from `example/design-fixtures.ts` (approved visual specimens)
and parser/geometry/error fixtures. Do not simplify official syntax to manufacture
compatibility. `bun test test` verifies parser and native-scene semantics.
After official reference captures have been generated,
`bun scripts/compare-official.ts --all --skia-only` regenerates actual Skia images for
the paired comparison report (see [reference setup](../../../README.md#examples-and-references)); archived example coverage does not establish arbitrary full grammar support.
Upstream Mermaid examples are MIT-licensed: https://github.com/mermaid-js/mermaid/blob/97b345154f2cd71f23a2aadb14af6dad46f63173/LICENSE
