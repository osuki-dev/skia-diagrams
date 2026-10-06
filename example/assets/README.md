# Golden font

`NotoSans-Regular.ttf` is a frozen test asset downloaded from
`https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf`.
The accompanying upstream `LICENSE` contains the SIL Open Font License 1.1.
All font assets live only in this example directory, with their licenses.
The example and CanvasKit QA tools share these files; no duplicate test fonts
are stored elsewhere. The published library excludes the entire example and
never imports or registers these assets.
It does not establish CJK coverage.

`NotoSansCJKsc-Subset.otf` is a test-only subset of
`https://github.com/notofonts/noto-cjk/raw/main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Regular.otf`
(also SIL OFL 1.1). It contains ASCII and the explicit test characters
`中文流程图开始结束参与者条件成功失败你好`.
It was produced with temporary-cache `uvx --from fonttools pyftsubset`, not a
global installation. Golden Paragraph tests register it as `NotoCJK` after
NotoSans, verify nonzero Chinese glyph IDs, and render explicit CJK/line-break
cases. This establishes fixed-font CanvasKit coverage only, not native font parity.

# Regional CJK QA additions

The `NotoSansCJK{sc,tc,jp,kr}-QA.otf` files are licensed test/demo-only subsets,
about 37 KB per region, registered under `QAZH`, `QATC`, `QAJP`, `QAKR` after Latin
`QA`. They cover exactly the regional/mixed samples in `../cjk-fixtures.ts`, not
arbitrary CJK input or system-font fallback. The package's runtime code never
imports/registers these fonts. `LICENSE-CJK` contains the upstream SIL OFL 1.1.
They retain © 2014–2021 Adobe in their name tables. Sources are
`https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/OTF/` plus
`SimplifiedChinese/NotoSansCJKsc-Regular.otf`,
`TraditionalChinese/NotoSansCJKtc-Regular.otf`,
`Japanese/NotoSansCJKjp-Regular.otf`, and `Korean/NotoSansCJKkr-Regular.otf`.
Frozen subset SHA-256 provenance:

- sc-QA: `f0ec3b9e8595b1d0deba6eb86c7efc8078491b19f73b142a6b823bf07cdb14ea`
- tc-QA: `5b6232bd19e5e24da258cfcbc71ac255eaa48edc10e2beb3e1b35f3f75908089`
- jp-QA: `770822d013d51fc1b08e487eb5ff9b04f5838c382e4575532f8fc43da698bc76`
- kr-QA: `f22a108690847e18931edb0b6f78a35065ee3a01b1af90cede31d3013f116f64`

Do not substitute these region-specific aliases with the old Chinese-only
`QACJK` subset when inspecting Japanese or Korean glyphs.
