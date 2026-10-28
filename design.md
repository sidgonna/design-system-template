---
# ============================================================
# DESIGN.MD — Root index of the {{BRAND_NAME}} design system
# This file declares the system and points to every part.
# Values and rules live in /design/*.md, never here.
# ============================================================
doc_type: design-system-index
owns: [§0, §15, §16]
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
In a project, this whole template sits in one folder named `design-system/` at the project (app) root, with no `.git` of its own (README → Quick start). Paths in this system, such as `design-build/state.yaml`, are inside that folder. Commands are run from the project root, e.g. `node design-system/design-build/lint.mjs`; when the template is itself the repository root (developing the template), drop the `design-system/` prefix.
```
KICKSTART.md               ← paste-in prompt to start a build in any harness
BOTTLENECKS.md             ← where AI agents stumble, the fixes, and which are implemented (rules live here in design.md and design/)
design.md                  ← you are here: index, rules of the system, build workflow, checklist
design-build/              ← working files during a §16 build (state, research, studies, preview), inventory.json and the checks
components/                ← the shipped components: components.css (data-component API), index.js (vanilla helpers), react/ (wrappers)
ui-inventory/              ← per-screen component use and one doc per component (README.md explains; facts come from inventory.json)
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
| `{token.path}` | A value defined once in **§13** (core.md). Never write a raw hex, rgb, hsl, oklch, px or ms value anywhere else; `design-build/lint.mjs` flags it, in the design files and in the app's code, and names the token to use. |
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
  - Start research from the §16.2 seed sources; search the open web only for what seeds can't answer.
  - Before delivering, run §15 and report any failed item.
  - Paths in these rules are inside the `design-system/` folder; run commands from the project root as `node design-system/design-build/…` (§16.1).
  - After ANY edit to a design file, tokens or UI code, run `node design-system/design-build/lint.mjs` and fix what it reports before the next edit. It checks the design files and the app's code (src/, app/, pages/, components/, styles/, top-level and public HTML, or `code_dirs` in `design-build/project.json`). Every message gives file:line, the bad value and the fix.
  - Components - reuse, then extend, then create. Look a component or prop up in `design-build/inventory.json` (and the code it points to) and its doc in `ui-inventory/components/` before using it. Never use a component or prop that is not listed. If nothing fits, extend an existing one; create a new one only when the user agrees, then add it to inventory.json. If unsure, ask.
  - No new component without a doc and a reference search. Before building or mapping a component, search each §16.2 components seed for it separately (21st.dev, Refero Styles, The Component Gallery, shadcn/ui and Radix, React Aria, Kokonut UI, WAI-ARIA APG), then fill `ui-inventory/components/<name>.md` from `ui-inventory/templates/component.md`. That includes purpose, anatomy, variants, states, tokens, motion, accessibility, responsive, do and don't, references with how ours differs, and usage. Every screen you build or change gets an entry in inventory.json → `screens` listing the components, variants and states it uses. Run `node design-system/design-build/ui-inventory.mjs`; lint rule `ui-inventory` fails otherwise.
  - Registries such as 21st.dev are for patterns, never code. Do not paste or lightly edit their source (licenses vary, many have none, and their Tailwind and dependencies break the token-only set). Rebuild on tokens and record the URL, the pattern and how ours differs in the component doc (and `design-build/references/21st-dev.md`).
  - Before proposing any change, re-read `design-build/state.yaml` → `decisions` and `locked_sections`. Never reopen a rejected option or touch a locked section unless the user asks.
  - Done means checked. Never call work "done", "finished" or "ready" until `design-build/state.yaml` → `checks` shows lint, render and a11y all `pass` with `commit` equal to the current `git rev-parse --short HEAD`. Commit the work first, then run `node design-system/design-build/lint.mjs --record` and `node design-system/design-build/render.mjs --record` (for an app in Phase 6: `render.mjs --url <dev-server URL> --record`); the state.yaml change they make doesn't need its own commit. Paste the summary lines, not a claim.
  - Never game the checks. Without the user's explicit approval, do not edit `design-build/lint.config.json`, `design-build/lint-baseline.json`, `design-build/inventory.json` ignore lists, `design-build/terrazzo.config.mjs`, the installed git pre-commit hook, `.github/workflows/`, `design-build/ci/`, `design-build/hooks/`, `design-build/install-hooks.mjs` or the check scripts; do not run `lint.mjs --baseline`; do not update or delete screenshots to make a comparison pass; do not add `justified` reasons to `avoid_defaults` that the user did not give; do not use `--no-verify`. Fix the design instead. If a check is wrong, say so and ask.
  - `design-build/project.json` (the app's code folders, excludes and dev-server URL) is a project setting, not a check, so it is NOT protected the same way. Write it in KICKSTART Step 2 after the user approves the folders, and you may ADD a code folder or set `app_url` later. Removing a folder from `code_dirs`, or adding to `exclude`, so that app code stops being linted needs the user's explicit approval, like editing the checks.
```

### 0.6 Rules for editing the system
- Edit a topic only in its owning file. If you catch yourself writing a value in two places, move it to §13.
- Adding a module: create `design/<name>.md` with the same front matter shape as the others, add it to `parts:` and §0.3, and bump the minor version (§14.1).
- Every file starts with front matter listing `owns`, `depends_on` and, for modules, `may_narrow`. Keep those lists honest; they are how agents check for overlap.

---

## §16 Build workflow for coding harnesses
**FEEL:** "Show me, don't tell me — and don't keep me waiting."

This is the procedure an AI coding harness (Claude Code, Cursor, Codex or similar) follows to turn this empty template into a design system that is about 90% complete, then finish it with the user (Phases 1–5) and, for an app or website, apply it to the app's code (Phase 6). Follow the phases in order. Each phase ends at a **gate**, and the harness must not start the next phase until that gate passes.

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
Supported layout: the template in `design-system/` at the project root, with no nested `.git` (a nested repo becomes a git submodule pointer and its files are not committed). Copy it with `npx degit sidgonna/design-system-template design-system`, or `git clone --depth 1 https://github.com/sidgonna/design-system-template design-system && rm -rf design-system/.git`. The scripts find their own files from where they live and the project root from git (or the nearest `package.json` above `design-system/`); pass `--root <dir>` to override.
```
design-build/
  state.yaml            ← current phase, gate status, timers, sources used, decisions, check results
  brief.md              ← Phase 1 output
  inventory.json        ← components the project already has (KICKSTART Step 2); the lint rejects any other
  research-plan.md      ← Phase 2 plan
  research/notes.md     ← findings, one line per source with URL
  studies/index.html    ← Phase 3 visual studies
  preview/index.html    ← Phase 5 rendered design system (reads preview/tokens.css, generated from tokens_file)
  preview/tokens.css    ← generated CSS variables, light + dark; the app imports it in Phase 6
  preview/tokens.mjs    ← generated ES module (tokens, cssVar(), value()) for app code that needs a value in JS
  project.json          ← the app's code folders, excludes and dev-server URL (KICKSTART Step 2; see §0.5)
  screenshots/          ← render.mjs output: <page>-<width>-<theme>.png (gitignored)
  lint.mjs              ← static checks (Phase 4 lint block, §15); zero dependencies
  render.mjs            ← screenshots, layout checks and axe on a page or the app's dev-server URL (needs `npm --prefix design-system/design-build ci` and `npx --prefix design-system/design-build playwright install chromium`)
  lint.config.json      ← what the lint treats as token files, code and allowed exceptions (protected, §0.5)
  test/run.mjs          ← self-test for the checks and components, with good and bad fixtures
  install-hooks.mjs     ← installs the git pre-commit hook: `node design-system/design-build/install-hooks.mjs`
  hooks/                ← pre-commit.mjs (lint + render on commit) and optional editor hooks that run the lint after each edit
  ci/                   ← an optional GitHub Actions workflow for the app
```
`state.yaml` is updated at the end of every step, so a harness that restarts can resume where it left off. The full command list is in the README under **Quality checks**.

### 16.2 Seed sources (research starts here, not with a blank web search)
**FEEL:** "Start deep, not wide."

Phase 2 research **MUST** open with the seeds for each area before running any open web search. Seeds are primary, expert sources: specs, mature design systems and reference tools. Open search is only for what seeds can't answer, like competitors, the category, local market and culture, and the brand's own assets.
```yaml
seed_rules:
  - For each Phase 2a area, read at least 1 seed from the matching group below before searching the open web.
  - Seeds count toward the §16.0 source cap. Record each one in research/notes.md like any other source.
  - Prefer specs and official systems over blog posts, listicles and AI-generated summaries.
  - Treat mature design systems as patterns to learn from, never as values to copy. Our values come from §1 and the user's picks.
  - Color: generate candidate palettes with the palette_generators_for_agents tools (seed colors from §1 and the user), check every pairing for contrast, then show them in the Phase 3 studies. Link the matching human generator so the user can tweak a palette themselves.
  - Motion: build Phase 3 motion studies with a motion_libraries option that fits the project's stack, and use plain CSS when there's no stack yet.
  - Sites that need a login or block automated access (e.g. Mobbin, Behance): skip them, note that in research/notes.md, and don't stall.
  - Teams can add their own seeds here. Keep each group to 6 or fewer, so the list stays a starting point and not a library (the lint counts them).
  - DESIGN.md collections and extractors are for teardown only. Use them to read how a competitor or reference is built (Phase 2), never as a source of our values, and never paste an extracted DESIGN.md into this system.
```

```yaml
seeds:
  tokens_and_architecture:
    - { name: "W3C Design Tokens Format (DTCG)", url: "https://tr.designtokens.org/format/", use_for: "tokens.json structure, naming, aliasing" }
    - { name: "Style Dictionary", url: "https://styledictionary.com/", use_for: "turning tokens into CSS, iOS, Android and other outputs" }
    - { name: "Material 3 design tokens", url: "https://m3.material.io/foundations/design-tokens/overview", use_for: "reference/system/component token tiers" }
  design_systems_reference:
    - { name: "Material 3", url: "https://m3.material.io/", use_for: "full-system reference: color roles, type, motion" }
    - { name: "Apple Human Interface Guidelines", url: "https://developer.apple.com/design/human-interface-guidelines", use_for: "platform conventions, iOS/macOS" }
    - { name: "IBM Carbon", url: "https://carbondesignsystem.com/", use_for: "governance, motion, data viz, documentation style" }
    - { name: "Atlassian Design", url: "https://atlassian.design/", use_for: "foundations, content and voice guidance" }
    - { name: "Shopify Polaris", url: "https://polaris.shopify.com/", use_for: "content guidelines, merchant-facing patterns" }
    - { name: "GOV.UK Design System", url: "https://design-system.service.gov.uk/", use_for: "plain-language, accessibility-first patterns" }
  components:
    - { name: "The Component Gallery", url: "https://component.gallery/", use_for: "how 90+ systems name and build each component" }
    - { name: "Design Systems Repo", url: "https://designsystemsrepo.com/", use_for: "finding systems by industry" }
    - { name: "Radix Primitives", url: "https://www.radix-ui.com/primitives", use_for: "accessible component behavior" }
    - { name: "shadcn/ui", url: "https://ui.shadcn.com/", use_for: "token-driven component code patterns" }
    - { name: "React Aria", url: "https://react-spectrum.adobe.com/react-aria/", use_for: "interaction and state handling" }
    - { name: "Kokonut UI", url: "https://kokonutui.com/", use_for: "animated React and Tailwind components; a second look at motion-rich patterns (via @neropursue, 22 Oct 2026)" }
  accessibility:
    - { name: "WCAG 2.2", url: "https://www.w3.org/TR/WCAG22/", use_for: "§11 requirements, the source of truth" }
    - { name: "WAI-ARIA Authoring Practices", url: "https://www.w3.org/WAI/ARIA/apg/", use_for: "keyboard and screen-reader patterns per component" }
    - { name: "WebAIM Contrast Checker", url: "https://webaim.org/resources/contrastchecker/", use_for: "checking §4 pairings" }
    - { name: "Inclusive Components", url: "https://inclusive-components.design/", use_for: "deep dives on accessible components" }
  color:
    - { name: "Radix Colors", url: "https://www.radix-ui.com/colors", use_for: "accessible 12-step scales, light and dark" }
    - { name: "Adobe Leonardo", url: "https://leonardocolor.io/", use_for: "generating palettes by target contrast ratio" }
    - { name: "OKLCH picker", url: "https://oklch.com/", use_for: "perceptually even color scales" }
    - { name: "ColorBrewer", url: "https://colorbrewer2.org/", use_for: "data visualization palettes (§M1.6)" }
  typography:
    - { name: "Google Fonts", url: "https://fonts.google.com/", use_for: "open-license families" }
    - { name: "Google Noto", url: "https://fonts.google.com/noto", use_for: "Indic and other scripts for §12" }
    - { name: "Fontshare (Indian Type Foundry)", url: "https://www.fontshare.com/", use_for: "free quality families, Indian foundry" }
    - { name: "Butterick's Practical Typography", url: "https://practicaltypography.com/", use_for: "type rules: line length, spacing, hierarchy" }
    - { name: "Typescale", url: "https://typescale.com/", use_for: "building the §13 type scale" }
    - { name: "W3C Indic Layout Requirements", url: "https://www.w3.org/TR/ilreq/", use_for: "Indian script layout rules" }
  iconography:
    - { name: "Lucide", url: "https://lucide.dev/", use_for: "outline set drawn on a consistent 24 × 24 grid" }
    - { name: "Phosphor", url: "https://phosphoricons.com/", use_for: "6 weights including duotone" }
    - { name: "Material Symbols", url: "https://fonts.google.com/icons", use_for: "variable-weight icon font" }
    - { name: "Tabler Icons", url: "https://tabler.io/icons", use_for: "large outline and filled set" }
    - { name: "Iconify", url: "https://icon-sets.iconify.design/", use_for: "comparing 150+ sets side by side" }
  motion:
    - { name: "Material 3 Motion", url: "https://m3.material.io/styles/motion/overview", use_for: "easing and duration tokens, transition patterns" }
    - { name: "Carbon Motion", url: "https://carbondesignsystem.com/elements/motion/overview/", use_for: "productive vs expressive motion" }
    - { name: "Easings.net", url: "https://easings.net/", use_for: "seeing and comparing easing curves" }
    - { name: "MDN prefers-reduced-motion", url: "https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion", use_for: "reduced-motion fallback (§11)" }
    - { name: "LottieFiles", url: "https://lottiefiles.com/", use_for: "motion spec files and examples" }
    - { name: "Rive", url: "https://rive.app/", use_for: "interactive and state-machine motion" }
  color_palette_libraries:
    - { name: "Tailwind CSS colors", url: "https://tailwindcss.com/docs/colors", use_for: "well-tuned 11-step scales to benchmark against" }
    - { name: "Open Color", url: "https://yeun.github.io/open-color/", use_for: "open-source UI color scales" }
    - { name: "Adobe Color Explore", url: "https://color.adobe.com/explore", use_for: "curated palettes by mood and keyword" }
    - { name: "Color Hunt", url: "https://colorhunt.co/", use_for: "hand-picked 4-color palettes by theme" }
    - { name: "Coolors palettes", url: "https://coolors.co/palettes/trending", use_for: "large trending palette library (may block bots; human browsing)" }
  palette_generators_for_humans:   # pick a few colors, get a full palette
    - { name: "Coolors generator", url: "https://coolors.co/generate", use_for: "lock 1–3 colors, generate the rest" }
    - { name: "Adobe Color wheel", url: "https://color.adobe.com/create/color-wheel", use_for: "harmony rules from a base color, with a contrast checker" }
    - { name: "Huemint", url: "https://huemint.com/", use_for: "AI palettes for brand, website and gradients from locked colors" }
    - { name: "Realtime Colors", url: "https://www.realtimecolors.com/", use_for: "preview text, background, primary, secondary and accent on a live site" }
    - { name: "UI Colors", url: "https://uicolors.app/", use_for: "one hex in, full Tailwind-style 50–950 scale out" }
    - { name: "Khroma", url: "https://www.khroma.co/", use_for: "trains on colors you pick, suggests combos" }
  palette_generators_for_agents:   # programmatic: use these to build §13 color tokens
    - { name: "The Color API", url: "https://www.thecolorapi.com/docs", use_for: "free REST: /scheme?hex=…&mode=analogic|complement|triad|monochrome&count=N", verified: "GET returns JSON palette" }
    - { name: "Adobe Leonardo (npm @adobe/leonardo-contrast-colors)", url: "https://github.com/adobe/leonardo", use_for: "generate scales that hit target contrast ratios, light and dark themes" }
    - { name: "Material Color Utilities (npm @material/material-color-utilities)", url: "https://github.com/material-foundation/material-color-utilities", use_for: "one seed color → full Material 3 tonal palettes and color roles" }
    - { name: "chroma.js (npm chroma-js)", url: "https://gka.github.io/chroma.js/", use_for: "scales, interpolation, contrast, color-blind-safe checks" }
    - { name: "Culori (npm culori)", url: "https://culorijs.org/", use_for: "OKLCH/OKLab math for perceptually even scales" }
    - { name: "ColorAide (Python, pip coloraide)", url: "https://facelessuser.github.io/coloraide/", use_for: "same color math for Python harnesses" }
  motion_libraries:
    - { name: "Motion (formerly Framer Motion)", url: "https://motion.dev/", use_for: "React/JS UI animation, springs, layout transitions" }
    - { name: "GSAP", url: "https://gsap.com/", use_for: "timeline animation for web, scroll and marketing pages" }
    - { name: "Anime.js", url: "https://animejs.com/", use_for: "lightweight JS animation" }
    - { name: "Lottie (Airbnb)", url: "https://airbnb.io/lottie/", use_for: "playing After Effects animations in web and apps" }
    - { name: "AutoAnimate", url: "https://auto-animate.formkit.com/", use_for: "zero-config list and layout transitions" }
    - { name: "Animate.css", url: "https://animate.style/", use_for: "ready-made CSS keyframe animations for quick studies" }
  agent_ready_references:   # built for AI-assisted design work; added 2026-10-28 from @iamtanzil_'s list (x.com/iamtanzil_/status/2108066324907962575)
    - { name: "DESIGN.md (designmd.ai)", url: "https://designmd.ai/", use_for: "community design systems written as DESIGN.md files; compare structure and depth with ours" }
    - { name: "21st.dev", url: "https://21st.dev/", use_for: "component registry; patterns for §M1 components, never pasted code (§0.5; findings in design-build/references/21st-dev.md; source and MCP need an API key)" }
    - { name: "Refero Styles", url: "https://styles.refero.design/", use_for: "2,000+ real product styles with their typography and color, for §2, §4 and §5 references" }
    - { name: "Minimal Gallery", url: "https://minimal.gallery/", use_for: "curated high-craft sites for the competitor wall and moodboard" }
    - { name: "AppShot Gallery", url: "https://appshot.gallery/", use_for: "real mobile app screens, no login (an alternative to Mobbin)" }
    - { name: "Motion Primitives", url: "https://motion-primitives.com/", use_for: "ready animation and interaction components for Phase 3 motion studies" }
  page_section_galleries:   # landing and web section patterns for §M1 and §M2; added 2026-10-28 from @amananimates' list (x.com/amananimates/status/2110584646794887669)
    - { name: "Navbar Gallery", url: "https://www.navbar.gallery/", use_for: "navigation patterns, for the §M1 Navigation component" }
    - { name: "Supahero", url: "https://supahero.io/", use_for: "hero sections, the first screen where §1 personality shows most" }
    - { name: "CTA.gallery", url: "https://www.cta.gallery/", use_for: "call-to-action blocks, paired with the §6 label rules" }
    - { name: "Footer.design", url: "https://www.footer.design/", use_for: "footer patterns: sitemap, legal, language switch (§12)" }
    - { name: "Landing.gallery", url: "https://landing.gallery/", use_for: "whole landing pages, to see how sections flow together (via @neropursue, 22 Oct 2026)" }
  open_licensed_media:   # added 2026-10-28 from @ElliotPadfield's post (x.com/ElliotPadfield/status/2110764303087288788)
    - { name: "Openverse API", url: "https://api.openverse.org/v1/", use_for: "free, no-key search of openly licensed audio (SFX, ambience, music) and images: §M3 sound picks and moodboard or placeholder imagery. Read each result's license field: skip NC for commercial work and log CC BY credits in the sources notes" }
  motion_video_for_agents:   # §10 motion principles and §M3 video made in code; added 2026-10-28 from @Mnilax's and @RoundtableSpace's posts
    - { name: "LottieFiles motion-design-skill", url: "https://github.com/LottieFiles/motion-design-skill", use_for: "timing, easing, choreography and Disney's 12 principles written for agents; seed for §10 motion tokens and FEEL lines" }
    - { name: "Prompt Motion", url: "https://prompt-motion.com/", use_for: "226+ motion videos made with Claude Opus, each beside its prompt or skill; reference wall for Phase 3 motion studies" }
    - { name: "GSAP Skills (official)", url: "https://github.com/greensock/gsap-skills", use_for: "teaches agents correct GSAP timelines, scroll and plugin use" }
    - { name: "HyperFrames (HeyGen)", url: "https://github.com/heygen-com/hyperframes", use_for: "agent writes HTML, renders MP4 (Apache-2.0); §M3 video studies without After Effects" }
    - { name: "Remotion Skills (official)", url: "https://github.com/remotion-dev/skills", use_for: "Remotion best practices for coding agents; Remotion itself needs a paid company license for larger teams, so check before choosing it" }
  agent_design_skills:   # design rules and review checks agents can load; added 2026-10-28 from @Mnilax's design-team list (x.com/Mnilax/status/2110382356028686598)
    - { name: "Impeccable", url: "https://github.com/pbakaus/impeccable", use_for: "critique, audit and polish commands plus rules that catch AI-looking UI; feeds the Phase 4 lint and Phase 5 review" }
    - { name: "Vercel web-design-guidelines", url: "https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines", use_for: "audits UI against accessibility, performance and UX rules; cross-check §10 and §M1" }
    - { name: "Anthropic frontend-design", url: "https://github.com/anthropics/skills/tree/main/skills/frontend-design", use_for: "pushes agents toward a distinct visual point of view; pair with §1 personality" }
    - { name: "Google stitch-skills", url: "https://github.com/google-labs-code/stitch-skills", use_for: "Google's skills that keep a single DESIGN.md system in sync with generated screens" }
    - { name: "UI/UX Pro Max", url: "https://github.com/nextlevelbuilder/ui-ux-pro-max-skill", use_for: "searchable palettes and font pairings for agents; starting options for §4 and §5, never final picks" }
  motion_building_blocks:   # added 2026-10-28 from @beamnxw (11 Oct) and @jowettbrendan (10 Oct)
    - { name: "Motion Canvas", url: "https://motioncanvas.io/", use_for: "code-driven vector animation and explainer video (MIT); §M3 studies" }
    - { name: "Rive", url: "https://rive.app/", use_for: "interactive, state-driven animations that run in web and native apps; animated icons, onboarding, empty states" }
    - { name: "three.js", url: "https://threejs.org/", use_for: "3D and WebGL on the web; only when §1 calls for depth, with a static fallback" }
    - { name: "Satori (Vercel)", url: "https://github.com/vercel/satori", use_for: "HTML and CSS to SVG images; generate §M2 social cards and OG images from tokens" }
    - { name: "Remotion", url: "https://www.remotion.dev/", use_for: "React code to video for §M3; larger companies need a paid license, so check before choosing it" }
    - { name: "React Bits", url: "https://reactbits.dev/", use_for: "animated React components and text effects; pick one or two for motion studies, never a whole page of effects" }
  animation_tools_for_people:   # visual tools for the user or a designer, not for agents; added 2026-10-28 from @Abmankendrick (4 Oct)
    - { name: "Jitter", url: "https://jitter.video/", use_for: "quick UI and social motion in the browser; export video, GIF or Lottie" }
    - { name: "ProtoPie", url: "https://www.protopie.io/", use_for: "high-fidelity interactive prototypes to test §10 motion on real gestures" }
    - { name: "Lottielab", url: "https://www.lottielab.com/", use_for: "make and edit Lottie animations without After Effects" }
  design_md_collections:   # TEARDOWN ONLY (see seed_rules): libraries of DESIGN.md files; added 2026-10-28 from @Skirook (15 Oct)
    - { name: "Devault DESIGN.md", url: "https://devault.design/design-md", use_for: "collection of DESIGN.md files to compare with ours (blocks automated access)" }
    - { name: "designmd.supply", url: "https://designmd.supply/", use_for: "DESIGN.md files and design resources (blocks automated access)" }
    - { name: "Neuform", url: "https://neuform.ai/", use_for: "reusable DESIGN.md files for agent-ready design systems, plus landing templates" }
    - { name: "TypeUI", url: "https://typeui.sh/", use_for: "UI components and design files for AI coding, per the poster (blocks automated access, not reviewed)" }
  design_md_extractors_and_builders:   # TEARDOWN ONLY (see seed_rules): tools that write or use a DESIGN.md; added 2026-10-28 from @Skirook (15 Oct)
    - { name: "DESIGNMD (Hyperbrowser)", url: "https://design-md.hyperbrowser.ai/", use_for: "extract a DESIGN.md from any site in Google's format; fast competitor teardown for Phase 2" }
    - { name: "DesignMD", url: "https://designmd.me/", use_for: "paste a URL, get tokens, type and component styles as a DESIGN.md; same use as above" }
    - { name: "Open Design", url: "https://open-design.ai/", use_for: "open-source workspace where your agent builds prototypes, pages and slides" }
    - { name: "Aura", url: "https://aura.build/", use_for: "AI landing page builder with HTML and Figma export; quick Phase 3 drafts only" }
  ai_design_workflow:   # AI builders and skill directories; use for fast drafts, not as sources. Added 2026-10-28 from @neropursue (22 Oct)
    - { name: "Skill Issue", url: "https://skill-issue.in/", use_for: "curated library of SKILL.md files for coding agents, including design skills" }
    - { name: "UX Pilot", url: "https://uxpilot.ai/", use_for: "AI UI design and wireframes for quick layout options" }
    - { name: "v0", url: "https://v0.app/", use_for: "generate UI from a prompt; quick Phase 3 studies" }
    - { name: "Base44", url: "https://base44.com/", use_for: "AI app builder; only for a clickable prototype, never for design decisions" }
  web_and_motion_references:   # added 2026-10-28 from @neropursue (22 Oct) and @MaybeFlorent (12 Oct)
    - { name: "Inspora", url: "https://inspora.design/", use_for: "curated archive of recent visual design work for the moodboard" }
    - { name: "Motionin", url: "https://motionin.design/", use_for: "physics-based, cursor-responsive web sections; motion references for §10" }
    - { name: "Oversight Supply", url: "https://supply.madebyoversight.com/", use_for: "192+ curated website design references" }
    - { name: "Oversight Supply sections", url: "https://supply.madebyoversight.com/sections", use_for: "interactive website sections to study section-level motion" }
  data_visualization:
    - { name: "Carbon Data Visualization", url: "https://carbondesignsystem.com/data-visualization/getting-started/", use_for: "chart rules and color use" }
    - { name: "Datawrapper Academy", url: "https://academy.datawrapper.de/", use_for: "chart choice and labeling" }
  inspiration_and_competitors:
    - { name: "Brand New (UnderConsideration)", url: "https://www.underconsideration.com/brandnew/", use_for: "identity redesign critiques" }
    - { name: "Brandfetch", url: "https://brandfetch.com/", use_for: "competitor logos, colors and fonts" }
    - { name: "Wayback Machine", url: "https://web.archive.org/", use_for: "how competitors' sites changed over time" }
    - { name: "Land-book", url: "https://land-book.com/", use_for: "landing page patterns" }
    - { name: "Awwwards", url: "https://www.awwwards.com/", use_for: "high-craft web and motion references" }
    - { name: "Mobbin (login needed)", url: "https://mobbin.com/", use_for: "real app screens and flows" }
  marketing_formats:
    - { name: "Meta Ads Guide", url: "https://www.facebook.com/business/ads-guide", use_for: "official ad sizes and specs (§M2.1)" }
    - { name: "Sprout Social image size guide", url: "https://sproutsocial.com/insights/social-media-image-sizes-guide/", use_for: "current sizes across platforms" }
  print:
    - { name: "Pantone Connect", url: "https://www.pantone.com/connect", use_for: "spot color matches for §M4" }
```

### Phase 1 · Intake
Ask in **one** message, grouped and numbered, with examples so answers are quick. **Always ask every question**, even when the project is empty or already has brand files. Where files suggest an answer, show it as a pre-filled suggestion to confirm, never as a skipped question. Infer the project type from the project's files first (see `KICKSTART.md`); question 2 confirms it, or decides it when the project is empty.
1. **The business:** name, what the product or app is, who it's for, and where (city, region, languages).
2. **The job:** what this design system will be used for (app, website, social and ads, video, print). This sets the `parts.*.enabled` flags.
3. **Personality:** three words it should feel like, and three it must never feel like.
4. **What exists:** logo, colors, fonts or past work to keep, change or drop (ask for files or links), and any component library or UI kit already in use (for example shadcn/ui, MUI, Radix, a Figma kit or in-house components), so we reuse it instead of rebuilding.
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

**Gate 2a:** show the plan and stop for the user's answer, like every gate. Proceed when the user approves or edits it.

**2b. Execute** within §16.0 limits, **starting each area from its §16.2 seeds**, then searching the open web only for the gaps. Log each source as one line in `research/notes.md` with its URL and the takeaway. The timer starts at the first fetch. When a cap is hit, stop and go to Phase 3.

**2c. Per-component research** (apps and websites, digital-product.md §M1): for each component in `design-build/inventory.json` that the app will use, search the §16.2 `components` seeds and 21st.dev / Refero Styles **one component at a time** (not one search for "UI components"). Record the result in `ui-inventory/components/<name>.md` → References: one line per seed with the URL, the pattern taken and how ours will differ. Seeds with nothing relevant get a line saying so. This is part of the research cap, at up to 3 sources per component.

### Phase 3 · Visual studies (show, don't tell)
Build `studies/index.html`, a single self-contained page. **Screenshots are required:** run `node design-system/design-build/render.mjs design-system/design-build/studies/index.html` and show the user the PNGs it writes to `design-build/screenshots/` (390, 768 and 1280 wide, light and dark). A study the user has not seen as an image or live page doesn't count. Offer **2–3 directions** per aspect, labeled A, B and C:
- **Competitor wall:** screenshots or logo and color strips of the competitors, with a one-line gap note.
- **Color:** swatches in real proportion (for example 60/30/10), text-on-background pairings with live contrast ratios, a light and dark preview, and data colors.
- **Typography:** specimens at the real scale (display down to caption), a headline plus paragraph in each language from §12, and the font license noted.
- **Icons:** the same 12 core icons drawn in each candidate style and stroke, at sm, md and lg sizes.
- **Motion:** live CSS or Lottie demos of 3 interactions (enter, feedback, page change) at each candidate timing and easing, plus a reduced-motion version.
- **Imagery:** a moodboard grid for each direction.
- **Mini mockup:** one app screen and one social post per direction, so each choice is seen in context.
- **Label every direction** with one line: `breaks: <which core §2 avoid_defaults it avoids> · signature: <its §2 signature move> · differs from competitors by: <what>`. A direction that can't fill this line is a default, not a direction.

**Gate:** the user picks A, B or C (or mixes them) per aspect in **one** reply. If there's no reply, wait. Never pick for them. Record each pick, with the date and the user's words, in `state.yaml` → `decisions`.

### Phase 4 · Fill the template to about 90%
Order matters, because later sections reference earlier ones:
1. **§13 Tokens first**, from the chosen directions, also written to `tokens_file`.
2. **Core §1–§12** in order, referencing tokens only, with a `FEEL:` line written for each section.
3. **§8 and §10 spec blocks**: one block per core icon and per named animation, with the asset files placed in `{asset_root}/icons` and `{asset_root}/motion`.
4. **Enabled modules only**, each rule written as `NARROWS §N:` where it tightens core.
5. **§14:** version `0.9.0`, a changelog entry, and every guess logged as `ASSUMPTION` in §14.4.

Anything that truly needs the user stays as `{{TBD: reason}}`.

**Automated self-check (MUST pass before the gate):** `node design-system/design-build/lint.mjs` implements this block. Each key maps to a lint rule id, shown in the comment.
```yaml
lint:
  completion: "filled placeholders / total placeholders in enabled files >= 0.90"   # completion (enforced from phase 4; run with --phase 4)
  raw_values_outside_tokens: 0      # raw-value: no hex, rgb, hsl, oklch, px or ms outside §13, tokens_file and generated files
  unresolved_tokens: 0              # unresolved-token: every {token.path} and var(--token) exists in tokens_file
  ownership_overlap: 0              # ownership-overlap: no § owned by two files (§0.3 and front matter)
  contrast_failures: 0              # contrast: every §4 pairing passes §11, in light and dark
  role_slot_misuse: 0               # role-slot: no token used in its §4 "Never use for" slot
  ai_default_fingerprints: 0        # avoid-default: no unjustified core.md §2 avoid_defaults
  unknown_components: 0             # unknown-component: every component is in design-build/inventory.json
  ui_inventory: 0                   # ui-inventory: every screen's components have a complete doc and an inventory entry; docs use real tokens
  checklist_15: "all items pass or are listed as TBD"   # checklist-15: automatable items run; the rest are listed for review
```
Also run `npm --prefix design-system/design-build run tokens:check` (Terrazzo DTCG validation) when the dev dependencies are installed.
**Gate:** the lint passes. Report the completion percentage and the TBD list.

### Phase 5 · Render, review and finish
Build `preview/index.html`, a styled site that reads its values from `tokens_file`, so what the user sees is the system itself and not a description of it:
- A cover with the brand name and its one-line feel
- One page per core section and per enabled module, each opening with its `FEEL:` line
- Live color, type, icon and motion demos, sample components, and one mockup per enabled format

Every section shows **Accept**, **Reject** and **Edit** options. (In a terminal-only harness, list the sections numbered and let the user reply with something like `3 edit: warmer accent`.)
- **Accept:** lock the section. Don't touch it again unless the user reopens it.
- **Edit:** change only the owning file (§0.3) and tokens, re-run the lint, re-render, and show the changed section side by side with the old one. Log the change in `state.yaml` → `decisions` and add the section to `locked_sections` once accepted.
- **Reject:** go back to Phase 3 for that aspect only, with 2 fresh directions.

After {{3}} review rounds, check in with the user about whether to keep going or ship.
**Render and accessibility gate (MUST pass before Phase 5 is done):** `node design-system/design-build/render.mjs` captures every page at 390, 768 and 1280 wide in light and dark, checks for horizontal overflow, key elements off-screen, overlapping controls and tap targets under 24 CSS pixels, and runs axe (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`). It also fails on a page error, a script or stylesheet that does not load, or a blank page. Any layout failure or serious/critical axe violation fails it. Fix the design, never the check (§0.5).

**Done when (the design system):** every enabled section is accepted; `state.yaml` → `checks` shows lint, render and a11y `pass` on the current commit; completion is 100% or the remaining TBDs are explicitly waived; the version is bumped to `1.0.0`; and the changelog is updated. Set `phase: 5` and `gate_passed: true`.
For a project with no app code (marketing, print, video only), the build is done here. For an app or website, ask the user whether to start Phase 6; nothing in the app is changed before they say yes.

### Phase 6 · Apply to the app
Starts only after the Phase 5 gate passes and the user says to apply the system to the app. Set `phase: 6`. Work in small commits; the pre-commit hook lints every one.
0. **List the screens.** For every screen (route) of the app, add an entry to `design-build/inventory.json` → `screens` with its name, route, purpose, source files and the components it uses (with variants and states). Then run `node design-system/design-build/ui-inventory.mjs` and add layout notes to `ui-inventory/screens/<id>.md`. The lint checks that each listed source file renders exactly those components.
1. **Import the tokens.** Import `design-system/design-build/preview/tokens.css` once at the app's entry (e.g. `import '../design-system/design-build/preview/tokens.css'` in `src/main.tsx`, or a `<link>` in the root layout). Where JS needs a value (charts, canvas), import from `design-system/design-build/preview/tokens.mjs` (`cssVar('color.data.1')`). Never copy values out of these files; they are regenerated from `tokens_file`. The lint's `tokens-import` rule fails from Phase 6 if no app file imports them.
2. **Wire the theme.** `tokens.css` switches on `prefers-color-scheme` and on `[data-theme="light"|"dark"]` on `<html>`. If the app has a theme toggle, set `data-theme` on `document.documentElement` and persist the choice; otherwise do nothing and the system setting applies. Remove the app's old theme variables once nothing uses them.
3. **Replace hard-coded values.** Work through `node design-system/design-build/lint.mjs` findings in the app's code, file by file; each one names the token to use (`var(--…)`). If the user approved a baseline, the counts may only go down: after each batch, ask the user to lower the ceiling (`lint.mjs --baseline`) so the gain is locked in, until it reaches 0 or the target the user agreed (record the target in `state.yaml` → `apply.target_errors`).
4. **Map or build components: doc first.** For each component on a screen, the doc `ui-inventory/components/<name>.md` must be filled (with the 2c reference search) **before** you build or map it (§0.5). Then use the shipped set where it fits: `import '../design-system/components/components.css'` once after `tokens.css`, and `import { Button, Input, Card, Badge } from '../design-system/components/react'` (or the `data-component` HTML API with `design-system/components/index.js` in non-React apps). Map an existing app component onto the system instead (tokens, states, variants), or build a planned one, and record its real `import` path (e.g. `src/components/Button.tsx`) with `status: existing`. Reuse, then extend, then create (§0.5); creating needs the user's yes.
5. **Check the real app.** Run the lint, then start the dev server and run `node design-system/design-build/render.mjs --url <dev-server URL>` for the main routes (repeat `--url` per route; set `app_url` in `project.json`), and `node design-system/design-build/motion.mjs --url <dev-server URL>`, which proves that each component's motion plays and stops under reduced motion. Render, axe and motion run on the app, not the preview. Fix the app until all pass; never the checks (§0.5).
6. **Record.** Commit, then run `lint.mjs --record` and `render.mjs --url <dev-server URL> --record`, so `state.yaml` → `checks` shows lint, render and a11y `pass` with the app commit.
7. **User acceptance.** Show the user the app's screenshots (390, 768 and 1280 wide, light and dark) and the summary lines. Record their answer in `state.yaml` → `apply.accepted_by` and `decisions`.

**Done when (the app):** the app imports `tokens.css` (and `tokens.mjs` where JS needs values); lint passes with 0 hard-coded value errors in app code, or at or below the agreed target with a baseline the user approved; render and axe pass on the dev-server URL for every listed route in light and dark; `state.yaml` → `checks` are `pass` on the current app commit; and the user accepted it. Then set `phase: done`.

---

## §15 Pre-delivery checklist
Run before shipping any piece of work (humans and agents alike):
Run `node design-system/design-build/lint.mjs` (static, on the design files and the app's code: placeholders, raw values, tokens, contrast, role slots, defaults, components) and `node design-system/design-build/render.mjs` (rendered: layout, tap targets, page errors, blank pages, axe; for an app add `--url <dev-server URL>`). Items marked *(auto)* are covered by those scripts; the rest need a person.
- [ ] No unfilled `{{PLACEHOLDER}}` in sections this work touches *(auto: lint `completion`)*
- [ ] No raw values outside §13; every value is a `{token}` *(auto: lint `raw-value`, `unresolved-token`)*
- [ ] Matches §1 personality sliders and `is_not` list; no unjustified §2 `avoid_defaults` *(partly auto: lint `avoid-default`)*
- [ ] Passes §11 (contrast, text size, alt text, captions, reduced motion) *(partly auto: lint `contrast`, render.mjs axe; see the §11 mapping)*
- [ ] Rendered at `{viewport.mobile}`, `{viewport.tablet}` and `{viewport.desktop}` in light and dark, and the screenshots were shown: no sideways scroll, nothing off-screen, no overlapping controls, no tap target under 24 CSS pixels *(auto: render.mjs; showing them is on you)*
- [ ] Uses only components in `design-build/inventory.json` *(auto: lint `unknown-component`)*
- [ ] Icons from §8 only, one style per view
- [ ] Motion uses §10 tokens; has a reduced-motion fallback
- [ ] Copy follows §6; regional versions reviewed per §12
- [ ] Only enabled modules used; their rules narrow core and never contradict it
- [ ] Every → §N reference points to the owning file in §0.3
- [ ] Any new conflict logged in §14.4
- [ ] App work (Phase 6): the app imports `tokens.css`; no hard-coded values in app code above the agreed target *(auto: lint `raw-value`, `tokens-import`)*; render and axe pass on the dev-server URL *(auto: `render.mjs --url`)*; the user accepted it
