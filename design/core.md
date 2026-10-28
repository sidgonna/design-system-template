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
  min_size: { digital: "{size.logo.min.digital}", print: "{size.logo.min.print}" }
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
| Surface | `{color.surface.default}` / `.raised` / `.inverse` | | |
| Text | `{color.text.primary}` / `.secondary` / `.inverse` | | |
| Success / Warning / Error / Info | `{color.semantic.*}` | status only | decoration |
| Data series | `{color.data.1..8}` | charts → §M1.6 | brand decoration |

- **Proportion:** {{e.g. 60% surface, 30% brand, 10% accent}}
- **Approved pairings** (text on background) MUST pass §11 contrast; list them: {{…}}
- Dark mode: {{supported / not supported}}; mappings live in §13.

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
  scale: [display, h1, h2, h3, body-lg, body, caption, overline]   # sizes in §13
  max_line_length: "{{60–75 characters}}"
  weights_allowed: [{{400, 600, 700}}]
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
  illustration_style: "{{flat, 2px stroke, brand palette only}}"
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
  grid: "{{24px with 2px padding}}"
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
  min_text_size: { screen: "{{16px body}}", social: "{{readable at phone arm's length}}", video_captions: "{{→ §M3}}" }
  touch_target: "{{44×44px}}"
  focus: "visible ring {color.focus}, never removed"
  color_alone: "never the only signal; pair with icon or text"
  motion: "respect reduced-motion; no flashing >3/sec"
  alt_text: "required on every meaningful image"
  captions: "required on all video with speech"
  inclusion: ["{{diverse representation}}", "{{plain language}}"]
```

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

All raw values live here and in `tokens_file`. Format: {{W3C Design Tokens JSON | Style Dictionary | CSS variables}}.

```yaml
tokens:
  color:
    brand: { primary: "{{#______}}", secondary: "{{#______}}" }
    accent: "{{#______}}"
    surface: { default: "{{#______}}", raised: "{{#______}}", inverse: "{{#______}}" }
    text: { primary: "{{#______}}", secondary: "{{#______}}", inverse: "{{#______}}" }
    semantic: { success: "{{#______}}", warning: "{{#______}}", error: "{{#______}}", info: "{{#______}}" }
    data: ["{{#______}}", "…"]
    focus: "{{#______}}"
  font:
    family: { heading: "{{…}}", body: "{{…}}", mono: "{{…}}", te: "{{…}}", hi: "{{…}}" }
    size: { display: "{{…}}", h1: "{{…}}", h2: "{{…}}", h3: "{{…}}", body_lg: "{{…}}", body: "{{…}}", caption: "{{…}}" }
    line_height: { tight: "{{1.15}}", base: "{{1.5}}" }
  space: { base: "{{4px}}", 1: "{{4px}}", 2: "{{8px}}", 3: "{{12px}}", 4: "{{16px}}", 6: "{{24px}}", 8: "{{32px}}", 12: "{{48px}}" }
  radius: { none: "0", sm: "{{4px}}", md: "{{8px}}", lg: "{{16px}}", full: "9999px" }   # used by §M1
  shadow: { 1: "{{…}}", 2: "{{…}}", 3: "{{…}}" }                                      # used by §M1
  icon: { stroke: "{{1.5px}}", size: { sm: "{{16px}}", md: "{{20px}}", lg: "{{24px}}" } }
  motion:
    duration: { instant: "{{100ms}}", fast: "{{150ms}}", base: "{{250ms}}", slow: "{{400ms}}" }
    ease: { standard: "{{cubic-bezier(.2,0,0,1)}}", enter: "{{cubic-bezier(0,0,0,1)}}", exit: "{{cubic-bezier(.3,0,1,1)}}" }
  size: { logo: { min: { digital: "{{24px}}", print: "{{10mm}}" } } }
  breakpoint: { sm: "{{640px}}", md: "{{768px}}", lg: "{{1024px}}", xl: "{{1280px}}" } # used by §M1
```

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
