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
Every row must match a `name` in `design-build/inventory.json`, and every variant must be one it lists (the lint checks both, rule `unknown-component`). Reuse an existing component first, extend it second, and add a new one only with the user's agreement (§0.5).

| Component | Variants | Tokens used | Notes |
|---|---|---|---|
| Button | primary, secondary, ghost, danger | `{color.brand.primary}`, `{radius.md}` | label rules → §6 |
| Input | {{…}} | | |
| Card | | `{shadow.1}`, `{radius.lg}` | |
| Modal / Sheet | | | |
| Navigation | | | |
| Table | | | |
| Badge / Tag | | | |
| Toast | | | |
### M1.2 States
`default · hover · focus · active · disabled · loading · empty · error · success` — each component lists what changes per state, using tokens only. Focus → §11.
### M1.3 Breakpoints and responsive rules
Uses `{breakpoint.*}`. {{How grid, type and spacing adapt per breakpoint.}}
- Every layout MUST work at the three check widths `{viewport.mobile}`, `{viewport.tablet}` and `{viewport.desktop}`, in light and dark: no horizontal scroll, no key element off-screen, no overlapping controls. `design-build/render.mjs` screenshots and checks each one.
### M1.4 Radius and elevation
Which components use which `{radius.*}` and `{shadow.*}`; depth meaning: {{higher = more temporary}}.
### M1.5 Interaction patterns
{{Forms, validation timing, confirmations, navigation patterns.}}
### M1.6 Data visualization
Series colors `{color.data.*}`, axis/grid style, label rules, chart types allowed, never use 3D or pie with more than {{5}} slices.
### M1.7 SEO and content structure
One H1 per page, heading order, meta title/description patterns, image alt and file naming → §11, §14.3.
