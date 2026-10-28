# 21st.dev: reference notes for the shipped components

[21st.dev](https://21st.dev) is a community registry of React + Tailwind components (mostly shadcn/ui-style, often with Radix, lucide-react and class-variance-authority). We use it to **see patterns**, then build our own versions on our tokens (design.md §0.5, §16.2).

## Rules

- **Patterns, not code.** Never paste or lightly edit 21st.dev source into this repo or an app. Each component carries its author's license. Many are MIT, some name none, and "no license" means all rights reserved. Even MIT code would bring Tailwind classes and dependencies that break the zero-dependency, token-only component set.
- **Write down what you borrowed.** Note it here and in the component's `ui-inventory/components/<name>.md` → References: the URL, the pattern, and how ours differs.
- **Stay within our system.** Rebuild with token variables only (lint rule `raw-value`), `data-component` / `data-variant`, and motion tokens with a reduced-motion fallback (core.md §10). Use only the contrast pairings in core.md §4.
- **Access limits.** Install commands and source (`/r/<author>/<component>`) need an API key, and return 403 without one. The public component pages show a preview, the author and the dependencies. That is all we need for patterns.

## Findings (searched 2026-10-28, one search per component)

| Component | 21st.dev page | Author · license | Pattern borrowed | How ours differs |
|---|---|---|---|---|
| Button | https://21st.dev/community/components/sean0205/button-1/loading | ReUI (sean0205) · MIT | Loading state: spinner before the label, button stays in place | Label never changes (theirs swaps to "Submitting…"); `aria-busy` + `aria-disabled` instead of `disabled` so focus stays; CSS spinner on `{motion.duration.slow}`, still under reduced motion; no Radix, lucide or cva |
| Button | https://21st.dev/community/components/shadcn/button | shadcn · MIT | Variant set (default, secondary, ghost, destructive), forwarded ref | Variants are `data-variant` attributes styled by one CSS file, so the API works without React; no `asChild`; explicit `cursor: pointer` |
| Button | https://21st.dev/community/components/iamsatish4564/eclipse-button | iamsatish4564 · no license shown | Looked at only: animated busy button | Not used: decorative motion that goes beyond core.md §10 |
| Input | https://21st.dev/community/components/tigerabrodi/input-with-feedback | tigerabrodi · MIT | Helper text under the field; error = red border + message; disabled look | Hint stays and the error is added after it; both are linked with `aria-describedby`; `aria-invalid`; a thick `{color.semantic.error}` border; a shake on entry that is switched off under reduced motion |
| Input | https://21st.dev/community/components/shugar/input | shugar (Geist style) · no license shown | Quiet single border that strengthens on focus | Focus adds a `{color.focus}` ring at 3:1, not just a darker border |
| Input | https://21st.dev/community/components/anubra266/field-components | anubra266 (Ark UI) | Field = label + control + helper + error as one unit | One `data-component="input"` root and one React component with `label`, `hint` and `error` props, instead of subcomponents |
| Card | https://21st.dev/community/components/sean0205/card | ReUI (sean0205) · MIT | Header, rows and footer link as the default composition | Plain children instead of CardHeader/CardContent; a `{color.surface.raised}` hairline border; one real link inside an interactive card (Inclusive Components) |
| Card | https://21st.dev/community/components/preetsuthar17/card | HextaUI (preetsuthar17) | Elevation as a variant | Two variants (flat, raised) using `{shadow.2}`/`{shadow.3}` with dark-mode shadows; hover lift is a separate `interactive` flag |
| Badge | https://21st.dev/community/components/serafimcloud/status-badge | serafimcloud · MIT ("inspired by Tremor", https://blocks.tremor.so) | Status pill: leading indicator + label | A CSS `::before` dot, no icon dependency; five intents mapped to `{color.semantic.success}` and the other semantic tokens; outlined, so every pairing is a tested §4 pairing |
| Badge | https://21st.dev/community/components/sean0205/badge-variants | sean0205 · no license shown | Variants named by intent | Same idea, our names: neutral, success, warning, error, info |
| Badge | https://21st.dev/community/components/edwinvakayil/status-dot | edwinvakayil · no license | Status dot | Static dot: no infinite pulse (constant motion distracts; core.md §10) |

## Our additions, not taken from 21st.dev

- **Motion on our tokens:**
  - Card entrance (`ds-enter`)
  - Badge pop-in (`ds-pop`)
  - Input error shake (`ds-shake`)
  - Button hover lift and press scale
- **Fills:** all fill `backwards`, so the hover transforms still work.
- **Reduced motion:** every movement turns off under `prefers-reduced-motion: reduce`, while color feedback stays. `design-build/motion.mjs` proves both.
- **No React needed:** the HTML/CSS API and the vanilla helpers (`components/index.js`) work in any stack.

The other §16.2 component seeds (shadcn/ui, Radix, React Aria, The Component Gallery, Kokonut UI, Refero Styles, WAI-ARIA APG, GOV.UK) are cited per component in `ui-inventory/components/*.md`.
