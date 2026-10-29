---
doc_type: design-system-part
file: design/core.md
part_of: ../design.md
title: "{{BRAND_NAME}} Core (§1–§14)"
owns: [§1, §2, §3, §4, §5, §6, §7, §8, §9, §10, §11, §12, §13, §14]
depends_on: [none]
---

# {{BRAND_NAME}} Core (§1–§14)

> Index: [../design.md](../design.md). Read **§0** there first for conventions, ownership and precedence.
> Tokens like `{color.brand.primary}` resolve from **§13** in [core.md](core.md#13-design-tokens-single-source-of-truth).
> Every project uses this file. Modules only narrow it.

## §1 Brand foundation
**FEEL:** {{How someone should feel in the first three seconds of meeting the brand.}}

```yaml
brand:
  purpose: "{{Why the brand exists, one sentence}}"
  promise: "{{What the customer can always count on}}"
  audience:
    primary: "{{Who, where, what they care about}}"
    secondary: "{{…}}"
  positioning: "{{For [audience] who [need], {{BRAND_NAME}} is the [category] that [difference].}}"
  personality: ["{{trait 1}}", "{{trait 2}}", "{{trait 3}}"]   # max 5
  is_not: ["{{anti-trait 1}}", "{{anti-trait 2}}"]              # as important as personality
  competitors_to_differ_from: ["{{…}}"]
```

**Personality sliders** (pick a point 1–5):
| Axis | 1 | 5 | Value |
|---|---|---|---|
| Playful ↔ Serious | playful | serious | {{3}} |
| Minimal ↔ Rich | minimal | rich | {{2}} |
| Classic ↔ Modern | classic | modern | {{4}} |
| Quiet ↔ Loud | quiet | loud | {{2}} |
| Local ↔ Global | local | global | {{2}} |

Every later section MUST be checkable against these sliders.

---

## §2 Visual direction and mood
**FEEL:** {{e.g. "Morning light, clean table, nothing in the way."}}

- **Mood words:** {{3–5 words}}
- **Reference board:** `{asset_root}/moodboard/` — {{list 5–10 references and what each one is for}}
- **We look like:** {{…}}
- **We never look like:** {{…}}
- **Signature move** (the one thing people remember): {{e.g. a single accent stripe, a hand-drawn underline}}

**Avoid the defaults.** These are the fingerprints of AI-generated and template UI. Each one is banned unless `justified` names a reason that traces to §1 (a personality slider, `is_not`, or the audience). The lint (`design-build/lint.mjs`, rule `avoid-default`) checks the ones marked `checked: lint`; the rest are checked in the Phase 5 review. A justification is a design decision: record it in `design-build/state.yaml` → `decisions` too.
```yaml
avoid_defaults:
  - { id: sole-default-font, checked: lint, what: "Inter, Roboto, Arial, Helvetica or the system UI stack as the only family for headings or body", justified: "" }
  - { id: purple-blue-gradient, checked: lint, what: "purple-to-blue or violet-to-indigo gradients, on backgrounds, buttons or text", justified: "" }
  - { id: pill-buttons, checked: lint, what: "fully rounded ({radius.full}) buttons and CTAs by default", justified: "" }
  - { id: mono-eyebrow, checked: lint, what: "small uppercase monospace labels above headings", justified: "" }
  - { id: emoji-icons, checked: lint, what: "emoji used as icons or bullets in UI (icons come from §8)", justified: "" }
  - { id: glassmorphism, checked: lint, what: "frosted-glass panels (backdrop-filter blur)", justified: "" }
  - { id: colored-italic-heading, checked: lint, what: "one colored or italic word inside a headline", justified: "" }
  - { id: three-card-row, checked: review, what: "hero, then three identical icon cards, then a CTA band", justified: "" }
  - { id: centered-everything, checked: review, what: "every section centered with the same width and spacing", justified: "" }
rule: "Don't just swap to the next default (Inter → Geist, purple → teal gradient, pill → stadium). Each replacement must come from §1 and the user's Phase 3 pick."
```

---

## §3 Logo system
**FEEL:** {{…}}

```yaml
logo:
  files: "{asset_root}/logo/"
  variants:
    primary: "{{logo-primary.svg}}"
    wordmark: "{{logo-wordmark.svg}}"
    mark_only: "{{logo-mark.svg}}"
    mono_dark: "{{logo-mono-dark.svg}}"
    mono_light: "{{logo-mono-light.svg}}"
    regional: "{{logo-te.svg}}"        # → §12
  clear_space: "{{1x height of the mark}}"
  min_size: { digital: "{size.logo.min.digital}", print_mm: "{size.logo.min.print-mm}" }   # print in millimetres
  allowed_backgrounds: ["{color.surface.default}", "{color.brand.primary}"]
```
- MUST NOT stretch, recolor outside §4, add effects, or place on busy imagery without a scrim.
- Do and don't examples: `{asset_root}/logo/usage/`.
- Manifest: `{asset_root}/logo/logo.json` lists each variant's file and its colours as token refs, with backgrounds from `allowed_backgrounds` (schema: `design-build/schemas/logo.schema.json`); `design-build/board.mjs` reads it for the board and stamps the hex values into `board.json`.

---

## §4 Color system
**FEEL:** {{…}}

Colors are defined by **role**. Raw values live only in §13, in three tiers (§13.1): reference ramps `{palette.*}`, the system roles below (aliases of ramp steps, per theme), and component tokens `{component.*}` (aliases of roles). Pages and app code use roles or component tokens, never `{palette.*}` (lint rule `token-tier`).

### 4.1 Roles
| Role | Token | Use for | Never use for |
|---|---|---|---|
| Brand primary | `{color.brand.primary}` | {{…}} | {{…}} |
| Brand secondary | `{color.brand.secondary}` | | |
| Accent | `{color.accent}` | {{max ~10% of any surface}} | |
| On-colour | `{color.on.*}` | text and icons on the matching fill: `on.primary` on `brand.primary`, `on.accent` on `accent`, `on.error` on `semantic.error`… | backgrounds, fills |
| Container | `{color.container.*}` | quiet tinted fills: banners, chips, selected rows | text, icons |
| On-container | `{color.on-container.*}` | text and icons on the matching container | backgrounds, fills |
| Surface | `{color.surface.sunken}` / `.default` / `.raised` / `.overlay` / `.inverse` | wells and inputs groups / the page / cards and panels / menus, dialogs, popovers / inverted bands | text, icons |
| Text | `{color.text.primary}` / `.secondary` / `.inverse` | text, icons | backgrounds, fills |
| Border | `{color.border.subtle}` / `.default` / `.strong` | dividers and card edges / control outlines / input borders and other edges that must reach 3:1 | text, backgrounds |
| Focus | `{color.focus}` | focus rings and outlines | backgrounds, text |
| Success / Warning / Error / Info | `{color.semantic.*}` | status only | decoration |
| Data series | `{color.data.1..8}` | charts → §M1.6 | brand decoration |

The lint reads the **Never use for** column. The words *backgrounds/fills*, *text/icons* and *borders/outlines* are machine-checked (rule `role-slot`): for example `background: var(--color-text-primary)` fails. Other words, like *decoration*, are checked in review.

- **Proportion:** {{e.g. 60% surface, 30% brand, 10% accent}}
- **Every fill has its on-colour.** `brand.primary`, `brand.secondary`, `accent` and each `semantic.*` has a `color.on.<name>`, and each `container.<name>` a `color.on-container.<name>`. The lint (`on-pair`) fails a fill without one, and checks each pair (and each component token pair, `component.<c>.<variant>.fg` on `.bg`) at 4.5:1 at rest and under every state layer (§4.3), in every theme and sub-brand.

### 4.2 Approved pairings
Foreground on background, MUST pass §11 contrast **in every theme** (design.md `themes:`) and every sub-brand (§13.5). The lint computes each ratio from `tokens_file` and fails below 4.5:1 for `normal` text and 3:1 for `large` text (at least 18pt, or 14pt bold) and `ui` (icons, borders, focus rings). Use only these pairings; add a row here before using a new one.
```yaml
pairings:
  - { fg: "{color.text.primary}", bg: "{color.surface.default}", size: normal }
  - { fg: "{color.text.secondary}", bg: "{color.surface.default}", size: normal }
  - { fg: "{color.text.primary}", bg: "{color.surface.raised}", size: normal }
  - { fg: "{color.text.secondary}", bg: "{color.surface.raised}", size: normal }
  - { fg: "{color.text.inverse}", bg: "{color.surface.inverse}", size: normal }
  - { fg: "{color.text.primary}", bg: "{color.surface.sunken}", size: normal }
  - { fg: "{color.text.primary}", bg: "{color.surface.overlay}", size: normal }   # menus, dialogs
  - { fg: "{color.border.strong}", bg: "{color.surface.default}", size: ui }     # input borders and control edges (WCAG 1.4.11)
  - { fg: "{color.on.primary}", bg: "{color.brand.primary}", size: normal }       # primary button label
  - { fg: "{color.on.error}", bg: "{color.semantic.error}", size: normal }       # danger button label
  - { fg: "{color.brand.primary}", bg: "{color.surface.default}", size: normal } # links, secondary button
  - { fg: "{color.brand.primary}", bg: "{color.surface.raised}", size: normal }  # secondary/ghost button hover
  - { fg: "{color.brand.secondary}", bg: "{color.surface.default}", size: large }
  - { fg: "{color.accent}", bg: "{color.surface.default}", size: ui }
  - { fg: "{color.semantic.success}", bg: "{color.surface.default}", size: normal }
  - { fg: "{color.semantic.warning}", bg: "{color.surface.default}", size: normal }
  - { fg: "{color.semantic.error}", bg: "{color.surface.default}", size: normal }
  - { fg: "{color.semantic.info}", bg: "{color.surface.default}", size: normal }
  - { fg: "{color.focus}", bg: "{color.surface.default}", size: ui }
  - { fg: "{color.focus}", bg: "{color.surface.raised}", size: ui }
  - { fg: "{color.data.1}", bg: "{color.surface.raised}", size: ui }    # chart series on the chart panel: non-text 3:1 (surface.default is higher in both modes)
  - { fg: "{color.data.2}", bg: "{color.surface.raised}", size: ui }
  - { fg: "{color.data.3}", bg: "{color.surface.raised}", size: ui }
  - { fg: "{color.data.4}", bg: "{color.surface.raised}", size: ui }
  - { fg: "{color.data.5}", bg: "{color.surface.raised}", size: ui }
  - { fg: "{color.data.6}", bg: "{color.surface.raised}", size: ui }
  - { fg: "{color.data.7}", bg: "{color.surface.raised}", size: ui }
  - { fg: "{color.data.8}", bg: "{color.surface.raised}", size: ui }
```

### 4.3 State layers
Interactive states are a layer of the content colour over the fill, at the `{state.*}` opacity, never a new colour: `background: color-mix(in oklab, var(--component-button-primary-bg), var(--component-button-primary-fg) calc(var(--state-hover) * 100%))`. Hover uses `{state.hover}`, pressed `{state.pressed}`, selected `{state.selected}`, a dragged item `{state.dragged}` plus `{shadow.3}`, and focus adds the `{color.focus}` ring (the `{state.focus}` layer is for focus on a surface that has no ring). Disabled sets `opacity: {state.disabled}` on the whole control (WCAG exempts disabled controls from contrast; the lint skips them). The lint mixes each layer into each fill and re-checks its on-colour (`on-pair`).

### 4.4 Themes
- **Which themes:** design.md front matter `themes:` (first = the default). One theme is fine; then §13 has no `modes:` block. Any of `light`, `dark`, `high-contrast`, or a named variant (e.g. `dim`, `brand-night`).
- **How they switch:** the first theme is the default and applies with no attribute. If `light` or `dark` is also listed and is not the default, it follows `prefers-color-scheme`. `high-contrast` follows `prefers-contrast: more`. Any theme applies with `<html data-theme="name">`, which wins over the media query. A theme named `dark` or `*-dark` sets `color-scheme: dark`.
- **Where the values live:** §13 `modes.<theme>` and `$extensions.mode` in `tokens_file`. The lint (`themes`) fails when the front matter and the token modes disagree; every pairing, on-colour and data-series check runs per theme.

### 4.5 Contrast and colour vision
- **Gate: WCAG 2** ratios above (4.5 / 3 / 3). **APCA** Lc is printed next to each pairing (lint info, board pairing table) as advice for the WCAG 3 draft: aim for |Lc| ≥ 75 for body text, ≥ 60 for large text and ≥ 45 for UI, but nothing fails on it.
- **Colour vision:** the `color.data.*` series must stay distinguishable from each other under protanopia, deuteranopia and tritanopia (lint `cvd`: minimum OKLab ΔE in `lint.config.json` `cvd.min_delta_e`, every theme). Colour is never the only signal anyway (§11 `color_alone`).

## §5 Typography
**FEEL:** {{…}}

```yaml
type:
  families:
    heading: "{font.family.heading}"
    body: "{font.family.body}"
    mono: "{font.family.mono}"
    regional: { te: "{font.family.te}", hi: "{font.family.hi}" }   # → §12
  roles: ["{type.display}", "{type.h1}", "{type.h2}", "{type.h3}", "{type.body-lg}", "{type.body}", "{type.caption}", "{type.overline}", "{type.label}"]   # composite tokens, values in §13
  fluid: "{type.display} and {type.h1} grow from their fluid size at {viewport.mobile} to their fontSize at {viewport.desktop} (CSS clamp)"
  scale: ["{font.size.display}", "{font.size.h1}", "{font.size.h2}", "{font.size.h3}", "{font.size.body-lg}", "{font.size.body}", "{font.size.caption}", "{font.size.overline}"]   # values in §13
  max_line_length: "{{60–75 characters}}"
  weights_allowed: ["{font.weight.regular}", "{font.weight.semibold}", "{font.weight.bold}"]
```
- **Type roles, not loose sizes.** Each `{type.*}` role is one DTCG typography token (family, size, weight, line height, letter spacing, plus OpenType features) and becomes `--type-<role>` for the CSS `font` shorthand, with `--type-<role>-font-size` and the other parts beside it: `h1 { font: var(--type-h1); letter-spacing: var(--type-h1-letter-spacing); }`. Inside `:lang(te)` and `:lang(hi)` each role switches to the §12 family and `{font.line-height.script}`. The roles map one to one onto the Google DESIGN.md typography schema.
- Hierarchy rules: {{e.g. one display line per screen or poster}}
- MUST NOT use more than {{2}} families in one piece.
- Loading and fallback: the starter ships five SIL OFL families as `.woff2` in `assets/fonts/` (Source Serif 4, Atkinson Hyperlegible, JetBrains Mono, Noto Sans Telugu, Noto Sans Devanagari), declared in `assets/fonts/fonts.css`. The board links that file. An app imports it once, before `tokens.css`. Each stack still keeps a system family second (Georgia, Verdana, ui-monospace, or a system Indic face) so a glyph outside the shipped subset does not go blank. To add a family, put its licensed `.woff2` next to those files and add an `@font-face` with `font-display: swap` (`assets/fonts/README.md`).

---

## §6 Voice, tone and copy
**FEEL:** {{e.g. "Sounds like a smart friend, never like a bank."}}

- **Voice** (constant): {{3 traits matching §1 personality}}
- **Tone** (shifts by moment):
| Moment | Tone | Example |
|---|---|---|
| Welcome | {{warm}} | {{…}} |
| Error | {{calm, helpful}} | {{…}} |
| Sale / promo | {{…}} | |
| Bad news | {{…}} | |
- **Word list:** we say {{…}} / we never say {{…}}
- **Labels:** buttons are {{verb-first, ≤3 words}}; headlines {{sentence case}}.
- **Numbers, dates, currency:** {{₹ before number, DD Mon YYYY}}
- Regional-language copy → §12.

---

## §7 Imagery and illustration
**FEEL:** {{…}}

```yaml
imagery:
  photo_style: "{{natural light, real people, Indian contexts}}"
  illustration_style: "{{flat, {icon.stroke} stroke, brand palette only}}"
  aspect_ratios: ["{{1:1}}", "{{4:5}}", "{{9:16}}", "{{16:9}}"]
  treatments: ["{{overlay {color.surface.inverse} at 40% for text}}"]
  ai_generated: "{{allowed with review / not allowed}}"
  library: "{asset_root}/imagery/"
```
- MUST NOT: {{stock clichés, fake smiles, off-palette filters}}.
- Alt text rules → §11.

---

## §8 Iconography
**FEEL:** {{e.g. "Light, friendly, never shouting."}}

```yaml
icons:
  library: "{{custom | Lucide | Phosphor | Material Symbols}}"
  source: "{asset_root}/icons/"          # one SVG per icon, kebab-case names
  style: "{{outline}}"                    # outline | filled | duotone
  stroke: "{icon.stroke}"
  sizes: ["{icon.size.sm}", "{icon.size.md}", "{icon.size.lg}"]
  grid: "{{drawn on {icon.size.lg} with {icon.padding} padding}}"
  corner_style: "{{rounded joins}}"
  color: "inherit text color; accent only for active state"
  filled_variant_means: "{{selected / active}}"
```
**Icon spec block** (one per custom icon, kept in `{asset_root}/icons/_index.md` or inline):
```yaml
- name: "{{parcel-track}}"
  file: "icons/parcel-track.svg"
  meaning: "{{Track an order}}"
  used_in: ["{{nav}}", "{{order card}}"]
  never_means: "{{shipping cost}}"
```
- MUST NOT mix styles in one view. Icon plus label beats icon alone; icon-only needs an accessible name → §11.

---

## §9 Layout, grid and spacing
**FEEL:** {{e.g. "Room to breathe."}}

```yaml
layout:
  base_unit: "{space.base}"               # usually 4 or 8
  spacing_scale: "{space.1..12}"
  grids:
    screen: "{{12 col, gutter {space.6}}}"   # detail → §M1.3
    social_square: "{{6 col, margin {space.8}}}" # → §M2
    slide_16x9: "{{12 col, safe area 5%}}"
    print_a4: "{{→ §M4}}"
  containers: { narrow: "{container.narrow}", prose: "{container.prose}", default: "{container.default}", wide: "{container.wide}" }   # max content widths
  density: "{{default}}"     # compact | default | comfortable: {density.*} multiplies spacing inside components (data-density on a region)
  layers: "{z-index.*}, in that order; never a raw z-index"
  composition_rules:
    - "{{One focal point per frame}}"
    - "{{Align to grid; optical adjustments only for logos and icons}}"
    - "{{Whitespace is a brand element, not leftover space}}"
```

---

## §10 Motion principles
**FEEL:** {{e.g. "Quick, sure, gentle landing."}}

```yaml
motion:
  personality: "{{snappy | smooth | playful | calm}}"
  durations: { instant: "{motion.duration.instant}", fast: "{motion.duration.fast}", base: "{motion.duration.base}", slow: "{motion.duration.slow}" }
  easing: { enter: "{motion.ease.enter}", exit: "{motion.ease.exit}", standard: "{motion.ease.standard}" }
  what_moves: ["{{state changes}}", "{{entrances}}", "{{feedback}}"]
  what_never_moves: ["{{body text}}", "{{logo, except in M3 intro}}"]
  reduced_motion: "nothing moves (no transform, position or size change, no shake, no spin); only opacity and colour fades (including border and shadow colour) of at most {motion.duration.fast} remain"   # → §11; checked by design-build/motion.mjs
  specs_folder: "{asset_root}/motion/"
```
**Motion spec block** (one per named animation; Lottie, Rive or video files live in `specs_folder`):
```yaml
- name: "{{card-enter}}"
  trigger: "{{appears on screen}}"
  properties: ["opacity 0→1", "translateY {space.4}→0"]
  duration: "{motion.duration.base}"
  easing: "{motion.ease.enter}"
  file: "{{motion/card-enter.json}}"
  feel: "{{arrives, doesn't bounce}}"
```
Video-level motion (transitions, titles, sound) → §M3.

---

## §11 Accessibility and inclusion
**FEEL:** "Everyone gets the full experience."

```yaml
a11y:
  standard: "{{WCAG 2.2 AA}}"
  contrast: { body_text: "4.5:1", large_text: "3:1", ui_and_icons: "3:1" }
  min_text_size: { screen: "{{body at {font.size.body} or larger}}", social: "{{readable at phone arm's length}}", video_captions: "{{→ §M3}}" }
  structure: { skip_link: required, landmarks: [header, nav, main, footer], form_labels: "visible and programmatically linked", headings: "one H1, no skipped levels" }
  touch_target: "{size.target.min} square for primary controls; never below the WCAG 2.5.8 floor of 24 by 24 CSS pixels (checked by render.mjs)"
  focus: "visible ring {color.focus}, never removed"
  color_alone: "never the only signal; pair with icon or text"
  motion: "respect reduced-motion; no flashing >3/sec"
  alt_text: "required on every meaningful image"
  captions: "required on all video with speech"
  inclusion: ["{{diverse representation}}", "{{plain language}}"]
```

**How each rule is checked.** `design-build/render.mjs` runs axe-core with the tags `wcag2a`, `wcag2aa`, `wcag21aa` and `wcag22aa` on every page, at every viewport, in light and dark; a serious or critical violation fails the build. It also runs axe's `best-practice` rules and reports them as warnings. `design-build/lint.mjs` checks the token pairings.

| Rule above | Automated check (axe rule ID or script) | Still needs a person |
|---|---|---|
| `contrast` | lint `contrast` (§4 pairings, both modes); axe `color-contrast` | text on images and gradients |
| `min_text_size` | none (review) | yes |
| `touch_target` | axe `target-size` (WCAG 2.5.8); render.mjs `tap-target` (under 24 CSS pixels, or overlapping) | the larger `{size.target.min}` goal |
| `focus` | none in axe: render.mjs tabs through and checks a visible focus style | focus order makes sense |
| `color_alone` | axe `link-in-text-block` | everything else |
| `motion` | `design-build/motion.mjs`: with motion allowed every component motion must play; with reduced motion it fails on any movement or a fade longer than `{motion.duration.fast}`. render.mjs screenshots with reduced motion on and warns on movement | flashing, auto-play |
| `alt_text` | axe `image-alt`, `input-image-alt`, `svg-img-alt`, `role-img-alt`, `area-alt`, `object-alt` | whether the alt text is *useful* |
| `captions` | axe `video-caption` (best practice, needs review) | yes |
| `structure` | axe `html-has-lang`, `document-title`, `label`, `button-name`, `link-name`, `aria-*`, `list`, `listitem`, `meta-viewport`, `bypass`; best-practice warnings `landmark-one-main`, `region`, `heading-order`, `page-has-heading-one` | reading order |
| `inclusion` | none | yes |

> **Automated is not conformance.** axe and these scripts find roughly a third to a half of WCAG issues. A clean run means "no detectable failures", not "WCAG 2.2 AA conformant". Before claiming conformance, do a keyboard-only pass, a screen-reader pass (VoiceOver or NVDA), and a 200% zoom / 320 CSS pixel reflow check, and record them in `design-build/state.yaml` → `checks.a11y.manual`.

---

## §12 Localization and multilingual
**FEEL:** {{e.g. "Feels made here, not translated."}}

```yaml
localization:
  languages: "{{see primary_languages in ../design.md}}"
  approach: "{{transcreate headlines, translate UI}}"
  text_expansion_buffer: "{{30–40%}}"
  scripts:
    te: { font: "{font.family.te}", line_height: "{font.line-height.script}" }   # every {type.*} role switches inside :lang(te) (§5)
    hi: { font: "{font.family.hi}", line_height: "{font.line-height.script}" }
  mixed_script_rules: "{{English brand name stays Latin inside regional copy}}"
  cultural_notes: ["{{colors/symbols to avoid by region}}", "{{festival calendar → §M2}}"]
  reviewer: "{{native speaker sign-off required}}"
```

---

## §13 Design tokens (single source of truth)
**FEEL:** "Change it once, it changes everywhere."

All raw values live here and in `tokens_file`. Format: `tokens_file` is **W3C Design Tokens (DTCG 2025.10) JSON**: every token is `{ "$value", "$type" }`, aliases are `"{group.token}"`, and the values of the second and later themes sit in `"$extensions": { "mode": { "light": …, "dark": … } }` (one key per theme in design.md `themes:`). CSS variables (`--color-text-primary`) are generated from it (`design-build/tokens-css.mjs`); Style Dictionary v4+ or Terrazzo can build other outputs.

### 13.1 Three tiers
| Tier | Tokens | Holds | Who uses it |
|---|---|---|---|
| Reference | `{palette.*}` | raw values: one 11-step OKLCH ramp (50 … 950) per seed in `ramps:` below, plus `palette.white` and `palette.black` | only the system tier |
| System | `{color.*}` roles and every other group below | what a value is **for**; colour roles alias the ramps, per theme | pages, app code, component tokens |
| Component | `{component.*}` | one token per component part (`component.button.primary.bg`) aliasing a system role | `components/` and app components |

- **Ramps are generated, never hand-edited.** Change a seed under `ramps:`, then run `node design-build/ramps.mjs`: it rewrites `palette.<name>.50…950` in `tokens_file` (and in each sub-brand file, §13.5) and regenerates tokens.css. The seed lands unchanged on the step nearest its lightness; the other steps keep its hue. The lint's `tokens-sync` fails when a stored step differs from what its seed makes.
- **No skipping tiers.** A component token, or any linted code (`components/` and the app code; the board folder `design-build/preview/` is exempt because it shows the ramps), that names `{palette.*}` (or `var(--palette-…)`) fails the lint (`token-tier`): point it at a role, so a theme or a sub-brand changes it in one place.

### 13.2 Groups and owners
Every group has one owning section, and the lint maps a raw value in code to the group that should replace it (rule `raw-value`).

| Group | Type | Owner | Raw value it replaces |
|---|---|---|---|
| `palette.*` | color | §13.1 (seeds) | none: only `color.*` may alias it |
| `color.*` | color | §4 | hex, rgb(), hsl(), oklch() |
| `font.*`, `type.*` | fontFamily, dimension, fontWeight, number, typography | §5, §12 | font-size, line-height, letter-spacing in px |
| `space.*`, `density.*`, `container.*` | dimension, number | §9 | padding, margin, gap, max-width in px |
| `radius.*`, `border-width.*`, `border-style.*` | dimension, strokeStyle | §M1.4 | border-radius, border-width in px |
| `shadow.*`, `blur.*` | shadow, dimension | §M1.4 | box-shadow, filter: blur() in px |
| `state.*`, `opacity.*` | number | §4.3 | opacity, fill-opacity, stroke-opacity other than 0 and 1 |
| `z-index.*` | number | §9 | z-index other than 0, 1, -1 and auto |
| `icon.*` | dimension | §8 | icon sizes and stroke in px |
| `motion.*` | duration, cubicBezier | §10 | durations in ms, cubic-bezier() |
| `size.*`, `breakpoint.*`, `viewport.*` | dimension, number | §3, §11, §M1.3 | targets, logo minimums, media-query widths |
| `component.*` | color | §M1.4 | none: aliases only |

### 13.3 The values
The values below are **STARTER** values, there only so the lint, preview and contrast checks run on day one. They are not a recommendation: replace every one in §16 Phase 4 from the user's Phase 3 picks, in this block **and** in `tokens_file` (the lint's `tokens_sync` check fails when the two disagree). Colour roles are aliases (`"{{ {palette.neutral.950} }}"` means "fill in a ramp step"); change the seeds under `ramps:` to change the colours themselves.

```yaml
tokens:
  palette: { white: "#ffffff", black: "#000000" }   # palette.<ramp>.50…950 come from ramps: below (design-build/ramps.mjs)
  color:
    brand: { primary: "{{ {palette.primary.700} }}", secondary: "{{ {palette.secondary.700} }}" }
    accent: "{{ {palette.accent.700} }}"
    on: { primary: "{{ {palette.neutral.50} }}", secondary: "{{ {palette.neutral.50} }}", accent: "{{ {palette.neutral.50} }}", success: "{{ {palette.neutral.50} }}", warning: "{{ {palette.neutral.50} }}", error: "{{ {palette.neutral.50} }}", info: "{{ {palette.neutral.50} }}" }   # text and icons on each fill: on.primary on brand.primary, on.error on semantic.error…
    container: { primary: "{{ {palette.primary.100} }}", secondary: "{{ {palette.secondary.100} }}", accent: "{{ {palette.accent.100} }}", success: "{{ {palette.success.100} }}", warning: "{{ {palette.warning.100} }}", error: "{{ {palette.error.100} }}", info: "{{ {palette.info.100} }}" }
    on-container: { primary: "{{ {palette.primary.900} }}", secondary: "{{ {palette.secondary.900} }}", accent: "{{ {palette.accent.900} }}", success: "{{ {palette.success.900} }}", warning: "{{ {palette.warning.900} }}", error: "{{ {palette.error.900} }}", info: "{{ {palette.info.900} }}" }
    surface: { sunken: "{{ {palette.neutral.100} }}", default: "{{ {palette.white} }}", raised: "{{ {palette.neutral.50} }}", overlay: "{{ {palette.white} }}", inverse: "{{ {palette.neutral.950} }}" }
    text: { primary: "{{ {palette.neutral.950} }}", secondary: "{{ {palette.neutral.700} }}", inverse: "{{ {palette.neutral.50} }}" }
    border: { subtle: "{{ {palette.neutral.200} }}", default: "{{ {palette.neutral.400} }}", strong: "{{ {palette.neutral.600} }}" }   # strong: input borders and other UI edges that need 3:1
    semantic: { success: "{{ {palette.success.700} }}", warning: "{{ {palette.warning.700} }}", error: "{{ {palette.error.700} }}", info: "{{ {palette.info.700} }}" }
    data: { 1: "{{#d37107}}", 2: "{{#2995d6}}", 3: "{{#0f7c4d}}", 4: "{{#a18b61}}", 5: "{{#0a568e}}", 6: "{{#bf4d07}}", 7: "{{#c269b3}}", 8: "{{#7f7f7f}}" }   # raw on purpose: a colour-blind-safe series (Okabe–Ito hues, tuned) is not a brand ramp; ≥3:1 on both surfaces and distinct under protan/deutan/tritan (lint cvd) → §M1.6
    focus: "{{ {palette.primary.700} }}"
  font:
    family: { heading: "{{Source Serif 4, Georgia, serif}}", body: "{{Atkinson Hyperlegible, Verdana, sans-serif}}", mono: "{{JetBrains Mono, ui-monospace, monospace}}", te: "{{Noto Sans Telugu, sans-serif}}", hi: "{{Noto Sans Devanagari, sans-serif}}" }
    size: { display: "{{3rem}}", h1: "{{2.25rem}}", h2: "{{1.75rem}}", h3: "{{1.375rem}}", body-lg: "{{1.125rem}}", body: "{{1rem}}", caption: "{{0.875rem}}", overline: "{{0.75rem}}" }
    weight: { regular: "{{400}}", semibold: "{{600}}", bold: "{{700}}" }
    line-height: { tight: "{{1.15}}", base: "{{1.5}}", script: "{{1.7}}" }   # script: Telugu and Devanagari (§12)
    tracking: { tight: "{{-0.5px}}", normal: "0px", wide: "{{0.5px}}" }
  type:   # composite type roles (DTCG typography): use font: var(--type-body) in CSS. fluid: the size at viewport.mobile, growing to fontSize at viewport.desktop (clamp)
    scripts: { te: { fontFamily: "{font.family.te}", lineHeight: "{font.line-height.script}" }, hi: { fontFamily: "{font.family.hi}", lineHeight: "{font.line-height.script}" } }   # every role, inside :lang(te) / :lang(hi)
    display: { fontFamily: "{font.family.heading}", fontSize: "{font.size.display}", fontWeight: "{font.weight.bold}", lineHeight: "{font.line-height.tight}", letterSpacing: "{font.tracking.tight}", features: [kern, liga], fluid: "{font.size.h1}" }
    h1: { fontFamily: "{font.family.heading}", fontSize: "{font.size.h1}", fontWeight: "{font.weight.bold}", lineHeight: "{font.line-height.tight}", letterSpacing: "{font.tracking.tight}", features: [kern, liga], fluid: "{font.size.h2}" }
    h2: { fontFamily: "{font.family.heading}", fontSize: "{font.size.h2}", fontWeight: "{font.weight.semibold}", lineHeight: "{font.line-height.tight}", letterSpacing: "{font.tracking.normal}", features: [kern, liga] }
    h3: { fontFamily: "{font.family.heading}", fontSize: "{font.size.h3}", fontWeight: "{font.weight.semibold}", lineHeight: "{font.line-height.tight}", letterSpacing: "{font.tracking.normal}", features: [kern, liga] }
    body-lg: { fontFamily: "{font.family.body}", fontSize: "{font.size.body-lg}", fontWeight: "{font.weight.regular}", lineHeight: "{font.line-height.base}", letterSpacing: "{font.tracking.normal}", features: [kern, liga] }
    body: { fontFamily: "{font.family.body}", fontSize: "{font.size.body}", fontWeight: "{font.weight.regular}", lineHeight: "{font.line-height.base}", letterSpacing: "{font.tracking.normal}", features: [kern, liga] }
    caption: { fontFamily: "{font.family.body}", fontSize: "{font.size.caption}", fontWeight: "{font.weight.regular}", lineHeight: "{font.line-height.base}", letterSpacing: "{font.tracking.normal}", features: [kern, tnum] }
    overline: { fontFamily: "{font.family.body}", fontSize: "{font.size.overline}", fontWeight: "{font.weight.semibold}", lineHeight: "{font.line-height.base}", letterSpacing: "{font.tracking.wide}", features: [kern, liga] }
    label: { fontFamily: "{font.family.body}", fontSize: "{font.size.caption}", fontWeight: "{font.weight.semibold}", lineHeight: "{font.line-height.tight}", letterSpacing: "{font.tracking.normal}", features: [kern, tnum] }
  space: { base: "{space.1}", 1: "{{4px}}", 2: "{{8px}}", 3: "{{12px}}", 4: "{{16px}}", 6: "{{24px}}", 8: "{{32px}}", 12: "{{48px}}" }
  density: { compact: "0.75", default: "1", comfortable: "1.25" }   # multiplies space.* inside components (§9)
  container: { narrow: "{{480px}}", prose: "{{720px}}", default: "{{1120px}}", wide: "{{1280px}}" }   # max content widths (§9)
  radius: { none: "0px", sm: "{{4px}}", md: "{{8px}}", lg: "{{16px}}", full: "9999px" }   # used by §M1
  border-width: { thin: "{{1px}}", thick: "{{2px}}" }
  border-style: { solid: "solid", dashed: "dashed" }
  shadow: { 1: "{{0px 1px 2px 0px #1c1b1914}}", 2: "{{0px 4px 12px 0px #1c1b191f}}", 3: "{{0px 12px 32px 0px #1c1b1929}}" }   # used by §M1; raw on purpose: a translucent shadow is not a ramp step
  blur: { sm: "{{4px}}", md: "{{12px}}", lg: "{{24px}}" }
  state: { hover: "{{0.08}}", focus: "{{0.1}}", pressed: "{{0.12}}", selected: "{{0.16}}", dragged: "{{0.16}}", disabled: "{{0.38}}" }   # §4.3 state layers
  opacity: { scrim: "{{0.5}}", muted: "{{0.25}}", faint: "{{0.2}}" }
  z-index: { base: "0", raised: "10", dropdown: "1000", sticky: "1100", overlay: "1300", modal: "1400", toast: "1500", tooltip: "1600" }   # stacking order (§9)
  icon: { stroke: "{{1.5px}}", padding: "{{2px}}", size: { sm: "{{16px}}", md: "{{20px}}", lg: "{{24px}}" } }
  motion:
    duration: { instant: "{{100ms}}", fast: "{{150ms}}", base: "{{250ms}}", slow: "{{400ms}}" }
    ease: { standard: "{{cubic-bezier(0.2, 0, 0, 1)}}", enter: "{{cubic-bezier(0, 0, 0, 1)}}", exit: "{{cubic-bezier(0.3, 0, 1, 1)}}" }
  size:
    logo: { min: { digital: "{{24px}}", print-mm: "{{10}}" } }   # print-mm is millimetres: DTCG dimensions allow only px and rem
    target: { min: "{{44px}}" }                                   # §11 touch target
  breakpoint: { sm: "{{640px}}", md: "{{768px}}", lg: "{{1024px}}", xl: "{{1280px}}" }   # used by §M1
  viewport: { mobile: "390px", tablet: "768px", desktop: "1280px" }                     # screenshot and layout-check widths (§M1.3, render.mjs)
  component:   # tier 3: aliases of system roles, never {palette.*} (lint token-tier); components.css reads only these and state.*
    button:
      primary: { bg: "{color.brand.primary}", fg: "{color.on.primary}", border: "{color.brand.primary}" }
      secondary: { bg: "{color.surface.default}", fg: "{color.brand.primary}", border: "{color.brand.primary}" }
      ghost: { fg: "{color.brand.primary}" }
      danger: { bg: "{color.semantic.error}", fg: "{color.on.error}", border: "{color.semantic.error}" }
      focus: "{color.focus}"
    input: { bg: "{color.surface.default}", fg: "{color.text.primary}", border: "{color.border.strong}", hint: "{color.text.secondary}", error: "{color.semantic.error}", focus: "{color.focus}" }
    card: { bg: "{color.surface.default}", fg: "{color.text.primary}", border: "{color.border.subtle}", border-hover: "{color.border.strong}", link: "{color.brand.primary}" }
    badge: { bg: "{color.surface.default}", fg: "{color.text.primary}", success: "{color.semantic.success}", warning: "{color.semantic.warning}", error: "{color.semantic.error}", info: "{color.semantic.info}" }
    select: { bg: "{color.surface.default}", fg: "{color.text.primary}", border: "{color.border.strong}", hint: "{color.text.secondary}", error: "{color.semantic.error}", focus: "{color.focus}" }
    textarea: { bg: "{color.surface.default}", fg: "{color.text.primary}", border: "{color.border.strong}", hint: "{color.text.secondary}", error: "{color.semantic.error}", focus: "{color.focus}" }
    checkbox: { bg: "{color.surface.default}", fg: "{color.text.primary}", border: "{color.border.strong}", checked: "{color.brand.primary}", mark: "{color.on.primary}", focus: "{color.focus}" }
    radio: { bg: "{color.surface.default}", fg: "{color.text.primary}", border: "{color.border.strong}", checked: "{color.brand.primary}", mark: "{color.on.primary}", focus: "{color.focus}" }
    switch: { bg: "{color.surface.raised}", fg: "{color.text.primary}", border: "{color.border.strong}", on: "{color.brand.primary}", thumb: "{color.on.primary}", focus: "{color.focus}" }
    alert: { bg: "{color.surface.default}", fg: "{color.text.primary}", border: "{color.border.default}", success: "{color.semantic.success}", warning: "{color.semantic.warning}", error: "{color.semantic.error}", info: "{color.semantic.info}" }
    toast: { bg: "{color.surface.raised}", fg: "{color.text.primary}", border: "{color.border.subtle}", success: "{color.semantic.success}", warning: "{color.semantic.warning}", error: "{color.semantic.error}", info: "{color.semantic.info}" }
    dialog: { bg: "{color.surface.overlay}", fg: "{color.text.primary}", border: "{color.border.subtle}", scrim: "{color.surface.inverse}" }
    tooltip: { bg: "{color.surface.inverse}", fg: "{color.text.inverse}" }
    avatar: { bg: "{color.container.primary}", fg: "{color.on-container.primary}" }
    table: { bg: "{color.surface.default}", fg: "{color.text.primary}", border: "{color.border.subtle}", stripe: "{color.surface.sunken}", header: { bg: "{color.surface.raised}", fg: "{color.text.primary}" } }
    tabs: { bg: "{color.surface.default}", fg: "{color.text.primary}", border: "{color.border.subtle}", selected: "{color.brand.primary}", focus: "{color.focus}" }
    nav: { bg: "{color.surface.default}", fg: "{color.text.primary}", border: "{color.border.subtle}", active: "{color.brand.primary}", focus: "{color.focus}" }

modes:   # one key per theme after the first in design.md themes:, listing only what changes; the first theme = the values above
  dark:
    color:
      brand: { primary: "{{ {palette.primary.300} }}", secondary: "{{ {palette.secondary.300} }}" }
      accent: "{{ {palette.accent.300} }}"
      on: { primary: "{{ {palette.neutral.950} }}", secondary: "{{ {palette.neutral.950} }}", accent: "{{ {palette.neutral.950} }}", success: "{{ {palette.neutral.950} }}", warning: "{{ {palette.neutral.950} }}", error: "{{ {palette.neutral.950} }}", info: "{{ {palette.neutral.950} }}" }
      container: { primary: "{{ {palette.primary.900} }}", secondary: "{{ {palette.secondary.900} }}", accent: "{{ {palette.accent.900} }}", success: "{{ {palette.success.900} }}", warning: "{{ {palette.warning.900} }}", error: "{{ {palette.error.900} }}", info: "{{ {palette.info.900} }}" }
      on-container: { primary: "{{ {palette.primary.100} }}", secondary: "{{ {palette.secondary.100} }}", accent: "{{ {palette.accent.100} }}", success: "{{ {palette.success.100} }}", warning: "{{ {palette.warning.100} }}", error: "{{ {palette.error.100} }}", info: "{{ {palette.info.100} }}" }
      surface: { sunken: "{{ {palette.black} }}", default: "{{ {palette.neutral.950} }}", raised: "{{ {palette.neutral.900} }}", overlay: "{{ {palette.neutral.800} }}", inverse: "{{ {palette.neutral.50} }}" }
      text: { primary: "{{ {palette.neutral.50} }}", secondary: "{{ {palette.neutral.300} }}", inverse: "{{ {palette.neutral.950} }}" }
      border: { subtle: "{{ {palette.neutral.800} }}", default: "{{ {palette.neutral.600} }}", strong: "{{ {palette.neutral.400} }}" }
      semantic: { success: "{{ {palette.success.300} }}", warning: "{{ {palette.warning.300} }}", error: "{{ {palette.error.300} }}", info: "{{ {palette.info.300} }}" }
      focus: "{{ {palette.primary.300} }}"
      data: { 1: "{{#fcc035}}", 2: "{{#74ceff}}", 3: "{{#08b765}}", 4: "{{#fffa6a}}", 5: "{{#0c76e7}}", 6: "{{#bf571a}}", 7: "{{#c98cbc}}", 8: "{{#7f7f7f}}" }   # lighter for the dark surfaces, same order
    shadow: { 1: "{{0px 1px 2px 0px #00000066}}", 2: "{{0px 4px 12px 0px #00000080}}", 3: "{{0px 12px 32px 0px #00000099}}" }   # darker, more opaque: a light-mode shadow disappears on a dark surface

ramps:   # tier 1 seeds: design-build/ramps.mjs turns each into palette.<name>.50…950 (the seed lands on its nearest step)
  primary: "{{#0b5d52}}"
  secondary: "{{#8a4b14}}"
  accent: "{{#c2410c}}"
  neutral: "{{#57534e}}"   # surfaces, text and borders
  success: "{{#15803d}}"
  warning: "{{#b45309}}"
  error: "{{#b91c1c}}"
  info: "{{#1d4ed8}}"
```
- In `tokens_file`, dimensions are `{ "value": 4, "unit": "px" }`, durations `{ "value": 150, "unit": "ms" }`, colors `{ "colorSpace": "srgb", "components": [r, g, b], "hex": "#rrggbb" }` (add `"alpha"` for translucency), easing a 4-number array and font families an array. A `type.*` role is `$type: "typography"` with `fontFamily`, `fontSize`, `fontWeight`, `lineHeight` (a number) and `letterSpacing`; its `features`, `fluid` and `scripts` sit in `$extensions["org.design-system.type"]` (`fontFeatures`, `fluid.min`, `scripts`). These fields map one to one onto the Google DESIGN.md typography schema. Group `$type` is inherited by its tokens.
- Check it: `node design-build/lint.mjs` (sync, aliases, ramps, contrast, tiers) and, with the dev dependencies installed, `npm --prefix design-build run tokens:check` (Terrazzo DTCG validation). From an app root, prefix the paths with `design-system/` (design.md §0.5).
- Not every token is used by the shipped components and preview, and that's expected: they are the scale for your app. The ones nothing in `components/` uses yet are `color.brand.secondary`, `color.on.secondary`, `color.on.accent`, `type.display`, `type.body-lg`, `type.overline`, `icon.padding`, `motion.ease.exit`, `radius.none`, `space.base`, `density.*`, `container.default`, `container.wide`, `blur.*`, `border-style.dashed`, `state.dragged`, `z-index.base`, `z-index.raised`, `z-index.dropdown` and `z-index.sticky`, the `breakpoint.*` set (for `matchMedia` and content widths; @media needs the px number, digital-product.md §M1.3), `viewport.*` (read by `render.mjs` as its check widths) and `size.logo.min.*` (§3; `size.logo.min.print-mm` is a plain number in mm because DTCG dimensions allow only px and rem). The `color.data.*` series is used only by charts (§M1.6). Delete a token only after a search shows nothing in the app uses it, and update §13 and `tokens_file` together.

### 13.4 Themes
`themes:` in design.md front matter lists the themes, first = default (§4.4). Each later theme is a key under `modes:` above and in every themed token's `$extensions.mode`; the lint (`themes`) fails when the two lists differ. A one-theme system has no `modes:` and no `$extensions.mode` at all. A dark-only system lists `themes: [dark]` and writes its dark values as the base values. A dark-first system lists `themes: [dark, light]`, writes the night values as the base, and lists the day values under `modes.light`.

### 13.5 Sub-brands
A parent brand can carry sub-brands (`brands:` in design.md front matter, e.g. `[{ id: kids, name: "Kids" }]`). Each one is `tokens/brands/<id>.json` holding only `palette.<ramp>` groups with their own seed in `$extensions["org.design-system.ramp"].seed` (run `node design-build/ramps.mjs` to fill the steps). Roles, components and every other token stay shared, so a sub-brand changes colour and nothing else. tokens.css gets one `:root[data-brand="<id>"]` block, the board has a brand switch, and the lint checks every §4 pairing and on-colour in every theme of every sub-brand.

---

## §14 Governance and maintenance
**FEEL:** "Trustworthy because it's kept tidy."

### 14.1 Versioning
- Semantic versioning: major = visual identity change, minor = new token/component/module, patch = fixes.
### 14.2 Changes and approvals
- Who may edit: {{…}}. Who approves: {{…}}. Changes to §1, §3, §4 need {{owner}} sign-off.
### 14.3 Files and naming
```yaml
assets:
  root: "{asset_root}"
  folders: [logo, icons, imagery, motion, moodboard, templates, fonts]
  naming: "{{kebab-case, {brand}-{type}-{variant}-{size}.{ext}}}"
  storage: "{{Google Drive / Figma / repo path}}"
```
### 14.4 Open conflicts and proposals
| Date | Sections | Conflict or missing value | Proposed fix | Status |
|---|---|---|---|---|
| {{…}} | | | | |
### 14.5 Changelog
| Version | Date | Change |
|---|---|---|
| {{0.1.0}} | {{…}} | Initial |
