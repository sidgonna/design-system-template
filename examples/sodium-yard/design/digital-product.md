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
**FEEL:** The night desk is the product. Everything else stays out of the way.

### M1.1 Components
Every row must match a `name` in `design-build/inventory.json`, and every variant must be one it lists (the lint checks both, rule `unknown-component`). The shipped set lives in `components/` (README → Components: usage), grouped as actions, inputs, feedback, navigation, data display and layout. Each component has a doc in `ui-inventory/components/`. Reuse an existing component first.

| Component | Variants | Tokens used | Notes |
|---|---|---|---|
| Button | primary, secondary, ghost, danger | `{component.button.primary.bg}`, `{component.button.danger.bg}`, `{radius.md}`, `{shadow.1}` | One primary per view: Send the van. Loading keeps focus. |
| Input | default, error | `{component.input.fg}`, `{component.input.error}`, `{radius.sm}` | Lamp ID, with the error under the field. |
| Textarea | default, error | `{component.textarea.fg}`, `{component.textarea.error}` | A note for the next crew, more than one line. |
| Select | default, error | `{component.select.fg}`, `{component.select.border}` | Pick a ward. Native select, visible label. |
| Checkbox | default | `{component.checkbox.checked}`, `{component.checkbox.fg}` | Lamp head replaced, or the terms. |
| Radio | default | `{component.radio.checked}`, `{component.radio.fg}` | Lamp or pole, one choice, with a legend. |
| Switch | default | `{component.switch.on}`, `{component.switch.thumb}` | Handover by SMS. `aria-checked` states the value. |
| Alert | info, success, warning, error | `{component.alert.fg}`, `{component.alert.error}` | Lit, flicker, dead. The word carries the status. |
| Toast | success, warning, error, info | `{component.toast.fg}`, `{component.toast.bg}` | Saved, or the log failed. Dismiss returns focus. |
| Dialog / Modal / Sheet | default | `{component.dialog.bg}`, `{component.dialog.scrim}` | Mark this lamp dead? Native dialog, Escape keeps the log. |
| Tooltip | default | `{component.tooltip.fg}`, `{component.tooltip.bg}` | Short hint on the lamp ID. Hover and keyboard focus. |
| Badge / Tag | neutral, success, warning, error, info | `{component.badge.success}`, `{component.badge.error}` | On time, Delayed, Cancelled. Text, not color alone. |
| Avatar | initials, icon | `{component.avatar.bg}`, `{component.avatar.fg}` | The clerk's initials beside the counter. |
| Table | default | `{component.table.header.bg}`, `{component.table.border}` | The night's lamps. Caption, headers, scroll on a phone. |
| Tabs | default | `{component.tabs.selected}`, `{component.tabs.fg}` | Tonight and Handover. Arrow keys move the tab. |
| Nav / Navigation | default | `{component.nav.fg}`, `{component.nav.active}` | Desk, Vans, Handover. One link is the current page. |
| Card | flat, raised | `{component.card.bg}`, `{shadow.2}`, `{radius.lg}` | One pole per card. |
### M1.2 States
`default · hover · focus · active · disabled · loading · empty · error · success` — each component lists what changes per state, using tokens only. Focus → §11.
### M1.3 Breakpoints and responsive rules
Uses `{breakpoint.*}`. At phone width the next van is one column. At tablet the night list sits beside the lamp ID. At desktop the desk and the handover column share the page. Type does not shrink below `{type.body}`.
- Every layout MUST work at the three check widths `{viewport.mobile}`, `{viewport.tablet}` and `{viewport.desktop}`, in light and dark: no horizontal scroll, no key element off-screen, no overlapping controls. `design-build/render.mjs` screenshots and checks each one.
- The two scales do different jobs. `{breakpoint.*}` (sm 640, md 768, lg 1024, xl 1280 px) are where the layout changes; `{viewport.*}` (390, 768, 1280 px) are the device widths the checks use, so mobile is a phone below `sm`, tablet sits on `md` and desktop on `xl`. Check any extra width the layout changes at with `render.mjs --widths`.
- CSS variables do not work inside `@media` or `@container`, so write the breakpoint's px number there (for `md`, `min-width` with the value of `{breakpoint.md}` in px). The lint accepts a media-query width only when it equals a `{breakpoint.*}` or `{viewport.*}` token. Use `var(--breakpoint-md)` only in JS (`matchMedia`) or in `max-inline-size` for content widths.
### M1.4 Radius and elevation
Which components use which `{radius.*}` and `{shadow.*}`; depth meaning: buttons use `{radius.md}`, inputs and badges use `{radius.sm}`, cards use `{radius.lg}`. A higher shadow means the layer is temporary (a menu, not the desk).
### M1.5 Interaction patterns
Logging a lamp asks for the ward, the pole and the van, in that order. Validate on blur and again on submit. Marking a lamp dead names the pole and the time and asks once.
### M1.6 Data visualization
Series colors `{color.data.*}`, axis/grid style, label rules, chart types allowed, never use 3D or pie with more than 4 slices.
NARROWS §4.5: series are assigned in order `{color.data.1}`, `{color.data.2}`, …; the set stays distinguishable under protanopia, deuteranopia and tritanopia (lint `cvd`), and every series also gets a direct label, marker shape or dash pattern so colour is never the only signal (§11).
- The starter series colors have light and dark values, and each one is at least 3:1 against `{color.surface.default}` and `{color.surface.raised}` in both modes (non-text contrast; the pairings in core.md §4 check it). They are for marks (bars, lines, dots), never for text: label every series and value with text in `{color.text.primary}` or `{color.text.secondary}`, so the chart reads without color.
### M1.7 SEO and content structure
One H1 per page, heading order, meta title/description patterns, image alt and file naming → §11, §14.3.
