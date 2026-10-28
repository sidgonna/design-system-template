---
# ============================================================
# DESIGN.MD — Root index of the {{BRAND_NAME}} design system
# This file declares the system and points to every part.
# Values and rules live in /design/*.md, never here.
# ============================================================
doc_type: design-system-index
template_version: 2.0.0
brand_name: "{{BRAND_NAME}}"
system_version: "{{0.1.0}}"
last_updated: "{{YYYY-MM-DD}}"
owner: "{{OWNER_NAME_OR_TEAM}}"
primary_languages: ["{{en}}", "{{te}}", "{{hi}}"]
asset_root: "{{assets}}"
tokens_file: "{{tokens/tokens.json}}"
parts:
  core:                { file: "design/core.md",              always_load: true }
  digital_product:     { file: "design/digital-product.md",   enabled: {{true|false}} }
  marketing_content:   { file: "design/marketing-content.md", enabled: {{true|false}} }
  motion_video:        { file: "design/motion-video.md",      enabled: {{true|false}} }
  print_physical:      { file: "design/print.md",             enabled: {{true|false}} }
---

# {{BRAND_NAME}} Design System

> **One-line feel:** {{e.g. "Calm confidence — like a friend who already sorted it out for you."}}
> New here? Read **§0** below, then **§1 Brand foundation** in [core.md](design/core.md). That's enough to feel the brand.

---

## Folder layout
```
KICKSTART.md               ← paste-in prompt to start a build in any harness
design.md                  ← you are here: index, rules of the system, build workflow, checklist
design-build/              ← working files during a §16 build (state, research, studies, preview)
design/
  core.md                  ← §1–§14, always used
  digital-product.md       ← §M1, apps and websites
  marketing-content.md     ← §M2, social, ads, WhatsApp, decks, campaigns
  motion-video.md          ← §M3, video, titles, captions, sound
  print.md                 ← §M4, print, packaging, merch
{asset_root}/
  logo/  icons/  imagery/  motion/  moodboard/  templates/  fonts/
{tokens_file}              ← machine copy of §13 tokens
```
File names are fixed. New modules follow the same pattern: `design/<kebab-case-discipline>.md`, registered in `parts:` above and in the map below.

---

## §0 How to use this system

### 0.1 Who this is for
- **Humans:** read §1 in core.md to *feel* the brand, then open only the file you need from the map in §0.3.
- **AI agents and LLMs:** parse this file's front matter, load `core.md` plus every part with `enabled: true`, and skip the rest. Treat prose as intent and fenced `yaml` spec blocks as rules. If they disagree, the spec block wins and the conflict is logged (§0.4).

### 0.2 Reading conventions (apply to every file)
| Convention | Meaning |
|---|---|
| `{{PLACEHOLDER}}` | Fill per brand or project. Unfilled means not ready. |
| `{token.path}` | A value defined once in **§13** (core.md). Never write a raw hex, px or ms value anywhere else. |
| `MUST` / `MUST NOT` | Hard rule. Breaking it is a defect. |
| `SHOULD` / `AVOID` | Strong default. Breaking it needs a written reason. |
| `FEEL:` | The human sense the rule protects. Read it before bending a rule. |
| `→ §N` | Cross-reference. Look up §N's file in the map below. |
| `NARROWS §N:` | A module tightening a core rule for its medium. Never a contradiction. |

### 0.3 Section map and ownership (prevents contradictions)
Every topic has **exactly one owning section in exactly one file**. Others may reference it with `→ §N` but MUST NOT restate or redefine it.

| § | Topic it owns | File |
|---|---|---|
| §1 | Brand foundation: purpose, audience, positioning, personality (strategy layer) | [core.md](design/core.md) |
| §2 | Visual direction and mood | core.md |
| §3 | Logo system | core.md |
| §4 | Color roles and pairings | core.md |
| §5 | Typography and scripts | core.md |
| §6 | Voice, tone and copy | core.md |
| §7 | Imagery and illustration | core.md |
| §8 | Iconography, with icon spec blocks | core.md |
| §9 | Layout, grid and spacing | core.md |
| §10 | Motion principles, with motion spec blocks | core.md |
| §11 | Accessibility and inclusion | core.md |
| §12 | Localization and multilingual | core.md |
| §13 | Design tokens, all raw values | core.md |
| §14 | Governance: versions, approvals, files, open conflicts, changelog | core.md |
| §M1 | Components, states, breakpoints, radius, elevation, data visualization, SEO structure | [digital-product.md](design/digital-product.md) |
| §M2 | Social, ad, WhatsApp and deck formats; campaigns; content pillars; calendar | [marketing-content.md](design/marketing-content.md) |
| §M3 | Video, transitions, titles, captions, sound, export | [motion-video.md](design/motion-video.md) |
| §M4 | Print, packaging, merch | [print.md](design/print.md) |
| §15 | Pre-delivery checklist | this file |
| §16 | Build workflow for coding harnesses | this file |

### 0.4 Precedence when two rules collide
Apply the first rule that decides it:
1. **§11 Accessibility** beats everything.
2. **§13 Tokens** beat any value written anywhere else.
3. **§1 Brand foundation** beats stylistic preference.
4. The **owning section** (§0.3) beats any section that references it.
5. A **module** may narrow a core rule for its medium but MUST NOT contradict it. Core beats module.
6. Still unclear: stop, log it in **§14.4 Open conflicts** (core.md), and ask the owner.

### 0.5 Instructions for AI agents
```yaml
agent_rules:
  - Read this file's front matter; load core.md always, and only modules with enabled: true.
  - Never load a disabled module or apply its rules.
  - Resolve every {token.path} from §13 / tokens_file before generating output. Never invent a token; propose it in §14.4.
  - When a rule references → §N, follow the map in §0.3 to the owning file instead of guessing.
  - Assets: logos {asset_root}/logo, icons {asset_root}/icons, motion specs {asset_root}/motion, templates {asset_root}/templates.
  - When explaining a decision, quote the FEEL line of each section you used.
  - To build a new system from this template, follow §16 phase by phase and respect its hard limits.
  - Before delivering, run §15 and report any failed item.
```

### 0.6 Rules for editing the system
- Edit a topic only in its owning file. If you catch yourself writing a value in two places, move it to §13.
- Adding a module: create `design/<name>.md` with the same front matter shape as the others, add it to `parts:` and §0.3, and bump the minor version (§14.1).
- Every file starts with front matter listing `owns`, `depends_on` and, for modules, `may_narrow`. Keep those lists honest; they are how agents check for overlap.

---

## §16 Build workflow for coding harnesses
**FEEL:** "Show me, don't tell me — and don't keep me waiting."

This is the procedure an AI coding harness (Claude Code, Cursor, Codex or similar) follows to turn this empty template into a design system that is about 90% complete, then finish it with the user. Follow the phases in order. Each phase ends at a **gate**, and the harness must not start the next phase until that gate passes.

### 16.0 Hard limits (read first, never break)
```yaml
limits:
  research_timebox: "{{20}} minutes wall-clock for the whole of Phase 2 execution"
  research_source_cap: "{{25}} sources total; {{5}} competitors max; {{3}} sources per design aspect max"
  first_visual_deadline: "a visual studies page MUST exist before {{30}} minutes from Phase 2 start"
  intake_rounds: "1 round of questions + at most 1 follow-up round"
  review_rounds_before_check_in: 3
  on_limit_hit: "stop researching immediately, use what you have, log gaps as ASSUMPTION in §14.4, move to Phase 3"
```
- Hitting a cap is never a failure. Stalling past it is.
- Never describe a color, font, icon or motion only in words when you could show it. Text-only research output is a defect.

### 16.1 Working folder
```
design-build/
  state.yaml            ← current phase, gate status, timers, sources used
  brief.md              ← Phase 1 output
  research-plan.md      ← Phase 2 plan
  research/notes.md     ← findings, one line per source with URL
  studies/index.html    ← Phase 3 visual studies (plus PNG screenshots)
  preview/index.html    ← Phase 5 rendered design system
```
`state.yaml` is updated at the end of every step, so a harness that restarts can resume where it left off.

### Phase 1 · Intake
Ask in **one** message, grouped and numbered, with examples so answers are quick. **Always ask every question**, even when the project is empty or already has brand files. Where files suggest an answer, show it as a pre-filled suggestion to confirm, never as a skipped question. Infer the project type from the project's files first (see `KICKSTART.md`); question 2 confirms it, or decides it when the project is empty.
1. **The business:** name, what the product or app is, who it's for, and where (city, region, languages).
2. **The job:** what this design system will be used for (app, website, social and ads, video, print). This sets the `parts.*.enabled` flags.
3. **Personality:** three words it should feel like, and three it must never feel like.
4. **What exists:** logo, colors, fonts or past work to keep, change or drop (ask for files or links).
5. **References:** 2–5 brands they admire (any category) and 2–5 direct competitors.
6. **Constraints:** budget for paid fonts or icon sets, accessibility needs, deadlines, must-use platforms.

**Output:** `brief.md`, plus a draft §1 Brand foundation in `design/core.md` and the module flags in this file's front matter.
**Gate:** play the brief back in five lines or fewer. The user confirms or corrects it, with one follow-up round at most.

### Phase 2 · Research plan, then capped research
**2a. Plan** (`research-plan.md`, one screen long):
| Area | Question to answer | Sources (max) | Feeds § |
|---|---|---|---|
| Market and competitors | How do the {{5}} competitors look and sound? Where is the gap? | 5 | §1, §2 |
| Audience | What do these users trust, expect and use daily? | 3 | §1, §6 |
| Category conventions | Which colors, styles and patterns are standard here? What should we break? | 3 | §2, §4 |
| Color | Which palettes fit the personality and pass contrast? | 3 | §4, §13 |
| Typography | Which families fit, including regional scripts? | 3 | §5, §12 |
| Iconography | Which library or style fits the personality? | 2 | §8 |
| Motion | What motion personality fits, and what do the references do? | 2 | §10, §M3 |
| Imagery | Which photo and illustration direction fits? | 2 | §7 |
| Localization | Which cultural, script and festival notes apply? | 2 | §12 |

**Gate 2a:** show the plan. Proceed if the user approves or doesn't object.

**2b. Execute** within §16.0 limits. Log each source as one line in `research/notes.md` with its URL and the takeaway. The timer starts at the first fetch. When a cap is hit, stop and go to Phase 3.

### Phase 3 · Visual studies (show, don't tell)
Build `studies/index.html`, a single self-contained page, and save a PNG of each panel for chat-only surfaces. Offer **2–3 directions** per aspect, labeled A, B and C:
- **Competitor wall:** screenshots or logo and color strips of the competitors, with a one-line gap note.
- **Color:** swatches in real proportion (for example 60/30/10), text-on-background pairings with live contrast ratios, a light and dark preview, and data colors.
- **Typography:** specimens at the real scale (display down to caption), a headline plus paragraph in each language from §12, and the font license noted.
- **Icons:** the same 12 core icons drawn in each candidate style and stroke, at sm, md and lg sizes.
- **Motion:** live CSS or Lottie demos of 3 interactions (enter, feedback, page change) at each candidate timing and easing, plus a reduced-motion version.
- **Imagery:** a moodboard grid for each direction.
- **Mini mockup:** one app screen and one social post per direction, so each choice is seen in context.

**Gate:** the user picks A, B or C (or mixes them) per aspect in **one** reply. If there's no reply, wait. Never pick for them.

### Phase 4 · Fill the template to about 90%
Order matters, because later sections reference earlier ones:
1. **§13 Tokens first**, from the chosen directions, also written to `tokens_file`.
2. **Core §1–§12** in order, referencing tokens only, with a `FEEL:` line written for each section.
3. **§8 and §10 spec blocks**: one block per core icon and per named animation, with the asset files placed in `{asset_root}/icons` and `{asset_root}/motion`.
4. **Enabled modules only**, each rule written as `NARROWS §N:` where it tightens core.
5. **§14:** version `0.9.0`, a changelog entry, and every guess logged as `ASSUMPTION` in §14.4.

Anything that truly needs the user stays as `{{TBD: reason}}`.

**Automated self-check (MUST pass before the gate):**
```yaml
lint:
  completion: "filled placeholders / total placeholders in enabled files >= 0.90"
  raw_values_outside_tokens: 0      # no hex, px or ms outside §13
  unresolved_tokens: 0              # every {token.path} exists in §13
  ownership_overlap: 0              # no topic defined in two files (§0.3)
  contrast_failures: 0              # every §4 pairing passes §11
  checklist_15: "all items pass or are listed as TBD"
```
**Gate:** the lint passes. Report the completion percentage and the TBD list.

### Phase 5 · Render, review and finish
Build `preview/index.html`, a styled site that reads its values from `tokens_file`, so what the user sees is the system itself and not a description of it:
- A cover with the brand name and its one-line feel
- One page per core section and per enabled module, each opening with its `FEEL:` line
- Live color, type, icon and motion demos, sample components, and one mockup per enabled format

Every section shows **Accept**, **Reject** and **Edit** options. (In a terminal-only harness, list the sections numbered and let the user reply with something like `3 edit: warmer accent`.)
- **Accept:** lock the section. Don't touch it again unless the user reopens it.
- **Edit:** change only the owning file (§0.3) and tokens, re-run the lint, re-render, and show the changed section side by side with the old one.
- **Reject:** go back to Phase 3 for that aspect only, with 2 fresh directions.

After {{3}} review rounds, check in with the user about whether to keep going or ship.
**Done when:** every enabled section is accepted, the lint passes with completion at 100% or the remaining TBDs are explicitly waived, the version is bumped to `1.0.0`, and the changelog is updated.

---

## §15 Pre-delivery checklist
Run before shipping any piece of work (humans and agents alike):
- [ ] No unfilled `{{PLACEHOLDER}}` in sections this work touches
- [ ] No raw values outside §13; every value is a `{token}`
- [ ] Matches §1 personality sliders and `is_not` list
- [ ] Passes §11 (contrast, text size, alt text, captions, reduced motion)
- [ ] Icons from §8 only, one style per view
- [ ] Motion uses §10 tokens; has a reduced-motion fallback
- [ ] Copy follows §6; regional versions reviewed per §12
- [ ] Only enabled modules used; their rules narrow core and never contradict it
- [ ] Every → §N reference points to the owning file in §0.3
- [ ] Any new conflict logged in §14.4
