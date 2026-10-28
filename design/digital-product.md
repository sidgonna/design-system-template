---
doc_type: design-system-part
file: design/digital-product.md
part_of: ../design.md
title: "Module M1 · Digital product and web"
owns: [§M1]
depends_on: [§4, §5, §8, §9, §10, §11, §13]
enabled_by: parts.digital_product.enabled   # in ../design.md front matter
may_narrow: [§9, §10]   # never contradict
---

# Module M1 · Digital product and web

> Index: [../design.md](../design.md). Read **§0** there first for conventions, ownership and precedence.
> Tokens like `{color.brand.primary}` resolve from **§13** in [core.md](core.md#13-design-tokens-single-source-of-truth).
> Load only if enabled in the index. Each rule here may NARROW a core rule for this medium, written as `NARROWS §N: …`, but MUST NOT contradict it.

## §M1 Digital product and web
**FEEL:** {{…}}

### M1.1 Components
Every row must match a `name` in `design-build/inventory.json`, and every variant must be one it lists (the lint checks both, rule `unknown-component`). Button, Input, Card and Badge ship ready to use in `components/` (README → Components: usage); each component has a doc in `ui-inventory/components/`, written before it is built (§0.5). Reuse an existing component first, extend it second, and add a new one only with the user's agreement (§0.5).

| Component | Variants | Tokens used | Notes |
|---|---|---|---|
| Button | primary, secondary, ghost, danger | `{color.brand.primary}`, `{color.text.inverse}`, `{color.semantic.error}`, `{radius.md}`, `{shadow.1}`, `{motion.duration.fast}` | label rules → §6; `loading` keeps focus and label (`aria-busy`); shipped: `components/`, doc `ui-inventory/components/button.md` |
| Input | default, error | `{color.text.secondary}`, `{color.focus}`, `{color.semantic.error}`, `{radius.sm}`, `{motion.duration.slow}` | visible label, hint and error wired with `aria-describedby`; error shakes once (not under reduced motion); doc `ui-inventory/components/input.md` |
| Card | flat, raised | `{shadow.2}`, `{shadow.3}`, `{radius.lg}`, `{space.6}`, `{motion.ease.enter}` | one entity per card; `interactive` lifts on hover and focus-within, with one real link inside; doc `ui-inventory/components/card.md` |
| Modal / Sheet | | | |
| Navigation | | | |
| Table | | | |
| Badge / Tag | neutral, success, warning, error, info | `{color.semantic.success}`, `{color.semantic.warning}`, `{color.semantic.error}`, `{color.semantic.info}`, `{radius.sm}` | text carries the meaning, color only reinforces it; pops in on insert; doc `ui-inventory/components/badge.md` |
| Toast | | | |
### M1.2 States
`default · hover · focus · active · disabled · loading · empty · error · success` — each component lists what changes per state, using tokens only. Focus → §11.
### M1.3 Breakpoints and responsive rules
Uses `{breakpoint.*}`. {{How grid, type and spacing adapt per breakpoint.}}
- Every layout MUST work at the three check widths `{viewport.mobile}`, `{viewport.tablet}` and `{viewport.desktop}`, in light and dark: no horizontal scroll, no key element off-screen, no overlapping controls. `design-build/render.mjs` screenshots and checks each one.
- The two scales do different jobs. `{breakpoint.*}` (sm 640, md 768, lg 1024, xl 1280 px) are where the layout changes; `{viewport.*}` (390, 768, 1280 px) are the device widths the checks use, so mobile is a phone below `sm`, tablet sits on `md` and desktop on `xl`. Check any extra width the layout changes at with `render.mjs --widths`.
- CSS variables do not work inside `@media` or `@container`, so write the breakpoint's px number there (for `md`, `min-width` with the value of `{breakpoint.md}` in px). The lint accepts a media-query width only when it equals a `{breakpoint.*}` or `{viewport.*}` token. Use `var(--breakpoint-md)` only in JS (`matchMedia`) or in `max-inline-size` for content widths.
### M1.4 Radius and elevation
Which components use which `{radius.*}` and `{shadow.*}`; depth meaning: {{higher = more temporary}}.
### M1.5 Interaction patterns
{{Forms, validation timing, confirmations, navigation patterns.}}
### M1.6 Data visualization
Series colors `{color.data.*}`, axis/grid style, label rules, chart types allowed, never use 3D or pie with more than {{5}} slices.
- The starter series colors have light and dark values, and each one is at least 3:1 against `{color.surface.default}` and `{color.surface.raised}` in both modes (non-text contrast; the pairings in core.md §4 check it). They are for marks (bars, lines, dots), never for text: label every series and value with text in `{color.text.primary}` or `{color.text.secondary}`, so the chart reads without color.
### M1.7 SEO and content structure
One H1 per page, heading order, meta title/description patterns, image alt and file naming → §11, §14.3.
