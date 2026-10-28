# Fonts

The template ships **no font files**. Every `font.family.*` stack in `tokens/tokens.json` (core.md §13) ends in system fallbacks, so text renders in Georgia / Verdana / the system monospace until you add the real files:

| Token | Starter stack | Renders as until fonts are added |
|---|---|---|
| `font.family.heading` | Source Serif 4, Georgia, serif | Georgia |
| `font.family.body` | Atkinson Hyperlegible, Verdana, sans-serif | Verdana |
| `font.family.mono` | JetBrains Mono, ui-monospace, monospace | the system monospace |
| `font.family.te` / `hi` | Noto Sans Telugu / Devanagari, sans-serif | the system Telugu / Devanagari font |

To load a web font:

1. Check its license allows self-hosting (all of the starter families are SIL OFL 1.1). Put the `.woff2` files here, e.g. `assets/fonts/source-serif-4-600.woff2`.
2. Add a `fonts.css` next to them and import it once, before `tokens.css`, in the app entry (and add a `<link>` to it in `design-build/preview/index.html`):

```css
/* assets/fonts/fonts.css — one block per file. font-display: swap shows the fallback first, then swaps. */
@font-face {
  font-family: "Source Serif 4";        /* must match the first name in font.family.heading */
  src: url("./source-serif-4-600.woff2") format("woff2");
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}
```

3. Keep a metric-close system family second in each §13 stack so the swap does not shift the layout, and add `size-adjust` to the `@font-face` if it still does.

`assets/` is not linted, so the numbers above are fine here; don't copy `@font-face` blocks into app or component CSS.
