# Example-owned artwork

The library does not include these assets. Native consumers supply their own `resolveIcon` and decoded image resources.

- `fa_user` and `fa_fa-book`: actual Font Awesome Free 7.3.1 SVG artwork, copyright Fonticons, Inc., licensed under [CC BY 4.0](https://fontawesome.com/license/free). The PNGs are rasterizations of the same SVG paths. No icon fonts are used.
- `mdi_skull-outline`: Material Design Icons artwork from `@iconify-json/mdi` 1.2.3, maintained by Pictogrammers under [Apache 2.0](https://github.com/Templarian/MaterialDesign/blob/master/LICENSE).
- `mermaid-favicon`: Mermaid's official favicon, retained for the official image syntax example.

`icon-provenance.json` records the upstream source, version and SVG/PNG SHA-256 for each icon. `icon-definitions.ts` gives SVG data URIs for portable export; the example supplies the matching decoded PNGs to native Skia.
