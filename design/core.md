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

---

## §4 Color system
**FEEL:** {{…}}

Colors are defined by **role**. Raw values live only in §13.

| Role | Token | Use for | Never use for |
|---|---|---|---|
| Brand primary | `{color.brand.primary}` | {{…}} | {{…}} |
| Brand secondary | `{color.brand.secondary}` | | |
| Accent | `{color.accent}` | {{max ~10% of any surface}} | |
| Surface | `{color.surface.default}` / `.raised` / `.inverse` | backgrounds, cards, panels | text, icons |
| Text | `{color.text.primary}` / `.secondary` / `.inverse` | text, icons | backgrounds, fills |
| Focus | `{color.focus}` | focus rings and outlines | backgrounds, text |
| Success / Warning / Error / Info | `{color.semantic.*}` | status only | decoration |
| Data series | `{color.data.1..8}` | charts → §M1.6 | brand decoration |

The lint reads the **Never use for** column. The words *backgrounds/fills*, *text/icons* and *borders/outlines* are machine-checked (rule `role-slot`): for example `background: var(--color-text-primary)` fails. Other words, like *decoration*, are checked in review.

- **Proportion:** {{e.g. 60% surface, 30% brand, 10% accent}}
- **Approved pairings** (foreground on background) MUST pass §11 contrast **in every mode** (light and dark). The lint computes each ratio from `tokens_file` and fails below 4.5:1 for `normal` text and 3:1 for `large` text (at least 18pt, or 14pt bold) and `ui` (icons, borders, focus rings). Use only these pairings; add a row here before using a new one.
```yaml
pairings:
  - { fg: "{color.text.primary}", bg: "{color.surface.default}", size: normal }
  - { fg: "{color.text.secondary}", bg: "{color.surface.default}", size: normal }
  - { fg: "{color.text.primary}", bg: "{color.surface.raised}", size: normal }
  - { fg: "{color.text.secondary}", bg: "{color.surface.raised}", size: normal }
  - { fg: "{color.text.inverse}", bg: "{color.surface.inverse}", size: normal }
  - { fg: "{color.text.inverse}", bg: "{color.brand.primary}", size: normal }    # primary button label
  - { fg: "{color.text.inverse}", bg: "{color.semantic.error}", size: normal }  # danger button label
  - { fg: "{color.brand.primary}", bg: "{color.surface.default}", size: normal } # links, secondary button
  - { fg: "{color.brand.secondary}", bg: "{color.surface.default}", size: large }
  - { fg: "{color.accent}", bg: "{color.surface.default}", size: ui }
  - { fg: "{color.semantic.success}", bg: "{color.surface.default}", size: normal }
  - { fg: "{color.semantic.warning}", bg: "{color.surface.default}", size: normal }
  - { fg: "{color.semantic.error}", bg: "{color.surface.default}", size: normal }
  - { fg: "{color.semantic.info}", bg: "{color.surface.default}", size: normal }
  - { fg: "{color.focus}", bg: "{color.surface.default}", size: ui }
  - { fg: "{color.focus}", bg: "{color.surface.raised}", size: ui }
```
- Dark mode: {{supported / not supported}}; values live in §13 `modes.dark`.

---

## §5 Typography
**FEEL:** {{…}}

```yaml
type:
  families:
    heading: "{font.family.heading}"
    body: "{font.family.body}"
    mono: "{font.family.mono}"
    regional: { te: "{font.family.te}", hi: "{font.family.hi}" }   # → §12
  scale: ["{font.size.display}", "{font.size.h1}", "{font.size.h2}", "{font.size.h3}", "{font.size.body-lg}", "{font.size.body}", "{font.size.caption}", "{font.size.overline}"]   # values in §13
  max_line_length: "{{60–75 characters}}"
  weights_allowed: ["{font.weight.regular}", "{font.weight.semibold}", "{font.weight.bold}"]
```
- Hierarchy rules: {{e.g. one display line per screen or poster}}
- MUST NOT use more than {{2}} families in one piece.

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
  reduced_motion: "replace movement with opacity fade ≤ {motion.duration.fast}"   # → §11
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
| `motion` | render.mjs runs with reduced motion | flashing, auto-play |
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
    te: { font: "{font.family.te}", line_height_adjust: "{{+10%}}" }
    hi: { font: "{font.family.hi}", line_height_adjust: "{{+10%}}" }
  mixed_script_rules: "{{English brand name stays Latin inside regional copy}}"
  cultural_notes: ["{{colors/symbols to avoid by region}}", "{{festival calendar → §M2}}"]
  reviewer: "{{native speaker sign-off required}}"
```

---

## §13 Design tokens (single source of truth)
**FEEL:** "Change it once, it changes everywhere."

All raw values live here and in `tokens_file`. Format: `tokens_file` is **W3C Design Tokens (DTCG 2025.10) JSON**: every token is `{ "$value", "$type" }`, aliases are `"{group.token}"`, and light/dark values sit in `"$extensions": { "mode": { "light": …, "dark": … } }`. CSS variables (`--color-text-primary`) are generated from it (`design-build/tokens-css.mjs`); Style Dictionary v4+ or Terrazzo can build other outputs.

The values below are **STARTER** values, there only so the lint, preview and contrast checks run on day one. They are not a recommendation: replace every one in §16 Phase 4 from the user's Phase 3 picks, in this block **and** in `tokens_file` (the lint's `tokens_sync` check fails when the two disagree).

```yaml
tokens:
  color:
    brand: { primary: "{{#0b5d52}}", secondary: "{{#8a4b14}}" }
    accent: "{{#c2410c}}"
    surface: { default: "{{#ffffff}}", raised: "{{#f5f4f1}}", inverse: "{{#1c1b19}}" }
    text: { primary: "{{#1c1b19}}", secondary: "{{#57534e}}", inverse: "{{#fafaf9}}" }
    semantic: { success: "{{#15803d}}", warning: "{{#b45309}}", error: "{{#b91c1c}}", info: "{{#1d4ed8}}" }
    data: { 1: "{{#e69f00}}", 2: "{{#56b4e9}}", 3: "{{#009e73}}", 4: "{{#f0e442}}", 5: "{{#0072b2}}", 6: "{{#d55e00}}", 7: "{{#cc79a7}}", 8: "{{#7f7f7f}}" }   # color-blind-safe series → §M1.6
    focus: "{{#0b5d52}}"
  font:
    family: { heading: "{{Source Serif 4, Georgia, serif}}", body: "{{Atkinson Hyperlegible, Verdana, sans-serif}}", mono: "{{JetBrains Mono, ui-monospace, monospace}}", te: "{{Noto Sans Telugu, sans-serif}}", hi: "{{Noto Sans Devanagari, sans-serif}}" }
    size: { display: "{{3rem}}", h1: "{{2.25rem}}", h2: "{{1.75rem}}", h3: "{{1.375rem}}", body-lg: "{{1.125rem}}", body: "{{1rem}}", caption: "{{0.875rem}}", overline: "{{0.75rem}}" }
    weight: { regular: "{{400}}", semibold: "{{600}}", bold: "{{700}}" }
    line-height: { tight: "{{1.15}}", base: "{{1.5}}" }
  space: { base: "{space.1}", 1: "{{4px}}", 2: "{{8px}}", 3: "{{12px}}", 4: "{{16px}}", 6: "{{24px}}", 8: "{{32px}}", 12: "{{48px}}" }
  radius: { none: "0px", sm: "{{4px}}", md: "{{8px}}", lg: "{{16px}}", full: "9999px" }   # used by §M1
  border-width: { thin: "{{1px}}", thick: "{{2px}}" }
  shadow: { 1: "{{0px 1px 2px 0px #1c1b1914}}", 2: "{{0px 4px 12px 0px #1c1b191f}}", 3: "{{0px 12px 32px 0px #1c1b1929}}" }   # used by §M1
  icon: { stroke: "{{1.5px}}", padding: "{{2px}}", size: { sm: "{{16px}}", md: "{{20px}}", lg: "{{24px}}" } }
  motion:
    duration: { instant: "{{100ms}}", fast: "{{150ms}}", base: "{{250ms}}", slow: "{{400ms}}" }
    ease: { standard: "{{cubic-bezier(0.2, 0, 0, 1)}}", enter: "{{cubic-bezier(0, 0, 0, 1)}}", exit: "{{cubic-bezier(0.3, 0, 1, 1)}}" }
  size:
    logo: { min: { digital: "{{24px}}", print-mm: "{{10}}" } }   # print-mm is millimetres: DTCG dimensions allow only px and rem
    target: { min: "{{44px}}" }                                   # §11 touch target
  breakpoint: { sm: "{{640px}}", md: "{{768px}}", lg: "{{1024px}}", xl: "{{1280px}}" }   # used by §M1
  viewport: { mobile: "390px", tablet: "768px", desktop: "1280px" }                     # screenshot and layout-check widths (§M1.3, render.mjs)

modes:   # only the values that change; anything not listed is the same in every mode. light = the values above.
  dark:
    color:
      brand: { primary: "{{#5cc2b1}}", secondary: "{{#e0a46b}}" }
      accent: "{{#fb923c}}"
      surface: { default: "{{#161514}}", raised: "{{#22201e}}", inverse: "{{#f5f4f1}}" }
      text: { primary: "{{#f5f4f1}}", secondary: "{{#b8b2aa}}", inverse: "{{#1c1b19}}" }
      semantic: { success: "{{#4ade80}}", warning: "{{#fbbf24}}", error: "{{#f87171}}", info: "{{#93c5fd}}" }
      focus: "{{#5cc2b1}}"
```
- In `tokens_file`, dimensions are `{ "value": 4, "unit": "px" }`, durations `{ "value": 150, "unit": "ms" }`, colors `{ "colorSpace": "srgb", "components": [r, g, b], "hex": "#rrggbb" }` (add `"alpha"` for translucency), easing a 4-number array and font families an array. Group `$type` is inherited by its tokens.
- Check it: `node design-build/lint.mjs` (sync, aliases, contrast) and, with the dev dependencies installed, `npm --prefix design-build run tokens:check` (Terrazzo DTCG validation).

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
