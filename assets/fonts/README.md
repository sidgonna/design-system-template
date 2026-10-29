# Fonts

The starter ships five SIL OFL 1.1 families as `.woff2` files in this folder, plus `fonts.css`. They are the first names in `font.family.*` (`tokens/tokens.json`, core.md §13). The board links `fonts.css`. An app imports it once, before `tokens.css`, or the named families fall through to the system face second in the stack.

| Token | First family | File | Second family, if a glyph is missing |
|---|---|---|---|
| `font.family.heading` | Source Serif 4 | `source-serif-4-latin-wght-normal.woff2` | Georgia |
| `font.family.body` | Atkinson Hyperlegible | `atkinson-hyperlegible-latin-400-normal.woff2`, `atkinson-hyperlegible-latin-700-normal.woff2` | Verdana |
| `font.family.mono` | JetBrains Mono | `jetbrains-mono-latin-wght-normal.woff2` | ui-monospace |
| `font.family.te` | Noto Sans Telugu | `noto-sans-telugu-telugu-wght-normal.woff2`, `noto-sans-telugu-latin-wght-normal.woff2` | a system Telugu face |
| `font.family.hi` | Noto Sans Devanagari | `noto-sans-devanagari-devanagari-wght-normal.woff2`, `noto-sans-devanagari-latin-wght-normal.woff2` | a system Devanagari face |

Latin subsets only, plus the Telugu and Devanagari blocks. `render.mjs` fails with `font-fallback` when a system font draws a glyph, so add another subset file and an `@font-face` before the copy needs those characters.

The licenses are the `OFL-*.txt` files here. The board chrome uses a different set (Hanken Grotesk, IBM Plex Mono, Board Symbols) in `design-build/chrome/fonts/`. Those faces are not a brand.

To add a family:

1. Confirm the license allows self-hosting. Put the `.woff2` in this folder.
2. Add an `@font-face` to `fonts.css` with `font-display: swap` and a `unicode-range` that matches the file. The `font-family` name must match the first name in the §13 stack.
3. Keep a metric-close system family second in that stack so a missing glyph does not go blank, and add `size-adjust` on the `@font-face` if the swap shifts the layout.

`assets/` is not linted. Do not copy `@font-face` blocks into app or component CSS. Import `fonts.css` instead.
