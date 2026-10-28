# Where AI coding agents stumble on design-system work

> **Status: mostly implemented (28 Oct 2026).** These are known ways AI coding agents (Claude Code, Cursor, Codex, v0, Lovable and similar) go wrong on design-system and UI work, based on reports from Oct 2025 to Oct 2026. Each one has fix options for this template. 24 of the 27 options are implemented in their owning files, 1 is partial (8b) and 2 are not yet (6c, 7c). The table below says where each one lives. Since the 28 Oct 2026 readiness review, the checks also run from an app root with the template in `design-system/`, lint the app's own code, and §16 Phase 6 applies the system to the app; that path has been dry-run end to end on a fresh Vite `react-ts` app (hooks installed, the app's own oxlint, a first commit with TypeScript generics and `<App>`, build, dev server with `render --url` and `motion --url`) and with `next build` on a fresh Next.js App Router app rendering the components from a Server Component page, both on 28 Oct 2026 after the fixes that made them pass. An earlier dry run (before 28 Oct) only got as far as the build: the pre-commit lint misread TypeScript generics and `<App>`, and the wrappers broke `next build` without `'use client'`. It has not been tried on a large existing codebase. The template also ships a working component set (Button, Input, Card, Badge) with motion that is proven to play and to stop under reduced motion, plus a per-screen UI inventory with one doc per component (3d, 4d, 6d).
> The rules themselves live in [`design.md`](design.md), [`design/core.md`](design/core.md), the modules and [`KICKSTART.md`](KICKSTART.md). Where this file disagrees with them, **those files win**. The "Not yet" and "Partially" items are still proposals.

**Implementation status**

| # | Status | Where it lives now |
|---|---|---|
| 1a | Implemented | `design-build/lint.mjs` (+ `lib/`, `lint.config.json`). Every Phase 4 `lint` key in `design.md` maps to a rule id. It scans the design docs, the design system's pages and the app's code (auto-detected `src/`, `app/`, `pages/`, `components/`, `styles/`, top-level and `public/` HTML, or `design-build/project.json` → `code_dirs`). Runs from the app root (`node design-system/design-build/lint.mjs`). |
| 1b | Implemented | lint rule `role-slot`. It reads the §4 "Never use for" column and checks CSS properties and Tailwind classes. |
| 1c | Implemented | `lint.mjs --baseline` → `design-build/lint-baseline.json`. A run fails only when a rule's count rises, and prints a lower-the-ceiling reminder when a count drops. Offered in KICKSTART Step 2 for an existing app, only with the user's yes; §16 Phase 6 lowers it to 0 or an agreed target. |
| 2a | Implemented | `design/core.md` §2 `avoid_defaults`: 9 entries, 7 `checked: lint`, 2 `checked: review`. |
| 2b | Implemented | `design.md` Phase 3: each direction carries a `breaks: … · signature: … · differs from competitors by: …` line. |
| 2c | Implemented | lint rule `avoid-default`: sole default font, purple-blue gradient, pill buttons, mono eyebrow, emoji icons, glassmorphism, colored or italic heading word. A `justified` entry turns the error into info. |
| 3a | Implemented | `KICKSTART.md` Step 2 writes `design-build/inventory.json` (the README block is identical, checked by lint `kickstart-sync`); `state.yaml` → `inventory`. Not yet tried on a real React repo. |
| 3b | Implemented | `design.md` §0.5 (reuse, then extend, then create). |
| 3c | Implemented | `design.md` Phase 1 intake Q4. |
| 3d | Implemented | `components/`: Button, Input, Card and Badge (`components.css` on token variables, `index.js` helpers, typed React wrappers), listed in `inventory.json` as `existing` with their import path. |
| 4a | Implemented | `design-build/render.mjs`: axe `wcag2a/aa`, `wcag21a/aa`, `wcag22aa` in light and dark at every width. Serious or critical fails. Output in `a11y-report.json`. axe's "incomplete" results (nodes it can't decide, mostly contrast over layered backgrounds) are counted per page, not failed; the contrast of every token pairing is proven by the lint (4b) instead. |
| 4b | Implemented | lint rule `contrast`: every §4 pairing in light and dark, using its own OKLCH → sRGB math. |
| 4c | Implemented | `design/core.md` §11 `structure` key, plus the rule → check table. A missing skip link or label fails through axe; landmarks and heading order are best-practice warnings. |
| 4d | Implemented | `design-build/motion.mjs`: samples each component animation mid-flight, then emulates `prefers-reduced-motion: reduce` and fails if anything moves (the core.md §10 policy allows only opacity and color fades no longer than `motion.duration.fast`); §16 Phase 6 step 5 runs it on the app. |
| 5a | Implemented | `design-build/render.mjs`: `screenshots/<page>-<w>-<theme>.png`; checks overflow, off-viewport, overlap, tap targets (24px floor with the 2.5.8 spacing exception) and focus visibility. Also fails on page errors, scripts or stylesheets that fail to load, and blank pages; `--url` renders the app's dev server (§16 Phase 6). Output in `render-report.json`. |
| 5b | Implemented | `design.md` Phase 3 (screenshots required) and §15 render item. |
| 5c | Implemented | `design/digital-product.md` §M1.3, plus `{viewport.*}` tokens, which `render.mjs` reads as its default widths. |
| 6a | Implemented | `design.md` §0.5 (look it up in `inventory.json` before use). |
| 6b | Implemented | lint rule `unknown-component`: `data-component`/`data-variant` in HTML, JSX imports and tags, §M1.1 rows. |
| 6c | Not yet | No `tsc --noEmit` step in the checks. The shipped wrappers have types (`components/react/index.d.ts`), so an app's own `tsc -b` build catches invalid props. |
| 6d | Implemented | `ui-inventory/`: one doc per component and one entry per screen (facts in `inventory.json` → `screens`); the §0.5 doc-and-reference-search-before-build rule; §16 Phase 2c and Phase 6 step 0/4; lint rule `ui-inventory`. |
| 7a | Implemented | `design-build/state.yaml` → `decisions`, `locked_sections`; the §0.5 re-read rule; Phase 3 and 5 record picks there. |
| 7b | Implemented | §0.5 "after any edit, run lint", backed by the git pre-commit hook (`design-build/install-hooks.mjs` → `hooks/pre-commit.mjs`; lints app code and design files, renders on visual changes, fails loudly if the scripts are missing), CI (the template's `.github/workflows/design-checks.yml`; `design-build/ci/app-design-checks.example.yml` for apps) and the optional agent hooks in `design-build/hooks/`. |
| 7c | Not yet | No separate hard-rules card. §0.5 `agent_rules` is the nearest equivalent. |
| 8a | Implemented | `design.md` §16.2 `seed_rules` (teardown only, never §13 values); TEARDOWN ONLY labels in the seeds and KICKSTART; lint rule `seed-cap`. |
| 8b | Partially | Covered only by the 8a wording. There is no `research/competitors.json` value check in the lint yet. |
| 8c | Implemented | `design.md` Phase 3 direction line (`differs from competitors by: …`). |

How the checks are run, and the §0.5 anti-gaming rule, are in the README under **Quality checks**.

**How to read this**
- **Sources:** only pages that were actually opened. Vendor posts (people selling a fix) are marked *(vendor)*. Dates are publish dates.
- **Impact** (H/M/L) means how much the fix reduces the failure.
- **Effort** (S/M/L) means the work to add it to this template.
- **Where** means the place it lives:
  - the kickstart prompt (README + `KICKSTART.md`, kept identical)
  - the §16 Phase 1 intake
  - §16.2 seeds and `seed_rules`
  - §0.5 `agent_rules`
  - a Phase 3, 4 or 5 gate
  - a module

---

## 1. Hard-coded values and misused tokens
Agents type raw hex and px values even when a token already exists, and they invent colours that aren't in the system. When they do use tokens, they match on value rather than role, so a text token can end up as a background.

**Sources**
- [Kini Insight, 18 Aug 2026](https://www.kiniinsight.com/en/posts/2026-08-18-the-design-tokens-existed-the-code-just-did-not-use-them/):
  - 953 hard-coded colours, 349 of them values the tokens already defined.
  - A same-value codemod put a text-on-primary token into background slots.
  - A "must be zero" gate was impossible to pass, so the author switched to a ceiling.
- [BILL Engineering, David Cai, 17 Aug 2026](https://www.bill.com/engineering/how-we-made-our-design-system-bilingual): the ungrounded agent used `#1c1b1b` and `max-width: 560px` instead of tokens.
- [@blanplan, 15 May 2026](https://x.com/blanplan/status/2055205666042871999): one model "ignores design tokens 8 times out of 10".
- [@bytecrafter_1, 2 May 2026](https://x.com/bytecrafter_1/status/2050637781110816845): from Figma, Claude "rebuilds with hardcoded values".

**What the template already does**
- `design.md` §0.2: never write a raw hex, px or ms value outside §13.
- §0.5 `agent_rules`: resolve every `{token.path}`, never invent a token, and propose new ones in §14.4.
- `core.md` §4: the roles table has a "Never use for" column.
- §16 Phase 4 `lint`: `raw_values_outside_tokens: 0` and `unresolved_tokens: 0`.
- §15: "No raw values outside §13".
- **The gap:** the lint is a YAML description, and no script runs it. It only covers the design files, not project code, and nothing checks token roles.

**Fix options**

| # | Option | Where | Impact | Effort |
|---|---|---|---|---|
| 1a | **Real lint script `design-build/lint.mjs`.** A zero-dependency Node script that runs every Phase 4 `lint` key. For raw values it greps hex, `rgb()`, `px` and `ms` outside §13 and `tokens_file`, in design files and in project style files (`.css`, `.scss`, `.tsx`, `.vue`, Tailwind config). It also checks that every `{token.path}` exists and that every §4 pairing passes contrast. It prints `file:line` per failure and exits 1 on any failure. | Phase 4 gate, §15 | H: turns a request into a check. | M: one script with clear checks. |
| 1b | **Role-slot check** in `lint.mjs`. A `color.text.*` token (or any future `on-*` token) used in a `background`, `fill` or `border` property fails, and so does a `surface.*` token used as text colour. Uses the §4 roles table as its source. | Phase 4 gate; one line added to the §4 intro | M: catches the failure Kini Insight hit. | S: once 1a exists. |
| 1c | **Ceiling mode for existing code.** `lint.mjs --baseline` writes the current raw-value count to `design-build/lint-baseline.json`. Later runs fail only if the count rises, and print a reminder to lower the baseline when it drops. | Phase 4 gate (existing projects only) | M: makes the lint usable on real repos. | S: once 1a exists. |

**Pick: 1a.** Every other check in this file (1b, 1c, 2c, 6b, 8b) plugs into it, and right now the "MUST pass" lint is never run.

---

## 2. Generic "AI-looking" UI
With no direction, agents fall back to the most common look:
- Inter
- purple-to-blue gradients
- rows of three cards
- pill buttons

Newer giveaways are monospaced eyebrow labels and coloured italic words in headings. Saying "avoid looking generic" swaps one default for another. Naming the exact patterns works better.

**Sources**
- [Anthropic, "Improving frontend design through Skills", 12 Nov 2025](https://claude.com/blog/improving-frontend-design-through-skills): "distributional convergence", meaning models drift to the most common choices (Inter, purple gradients on white).
- [anthropics/skills #1808, @fcsouza, 23 Sep 2026](https://github.com/anthropics/skills/issues/1808): pill buttons on 10 of 21 pages with no direction given. Naming specific patterns worked; a vague "avoid generic" did not.
- [pbakaus/impeccable #112, @rs1052, 27 Apr 2026](https://github.com/pbakaus/impeccable/issues/112): new giveaways, monospaced eyebrows and coloured italic headings.
- [Rob Hallam, 18 Aug 2026](https://robhallam.beehiiv.com/p/your-site-looks-ai-made): "purple gradient, rounded cards, everywhere."

**What the template already does**
- `core.md` §1: `is_not` and the personality sliders.
- `core.md` §2: "We never look like".
- §16 Phase 3: offers 2–3 directions, and the user picks; the agent never picks.
- §16.2 `agent_design_skills`: seeds Impeccable and Anthropic frontend-design.
- §15: "Matches §1 … `is_not` list".
- **The gap:** no named list of defaults to avoid.

**Fix options**

| # | Option | Where | Impact | Effort |
|---|---|---|---|---|
| 2a | **Named `avoid_defaults` list** in `core.md` §2, prefilled. Each entry is allowed only with a written reason tied to §1. The list:<br>• Inter, Roboto or system-ui as the only family<br>• purple-to-blue gradient hero<br>• three-card feature rows<br>• pill buttons as the default<br>• monospaced eyebrow labels<br>• coloured italic words in headings<br>• emoji as icons<br>• glassmorphism cards | §2 (core.md), §15 | H: named bans work better than "be original". | S: a list plus one checklist line. |
| 2b | **Phase 3 gate line.** Each A, B or C direction states, in one line, which defaults it breaks and what its §2 signature move is. | Phase 3 gate | M: forces a real difference between directions. | S: wording only. |
| 2c | **Fingerprint check** in `lint.mjs`. Flags `font-family` set to Inter or Roboto only, `linear-gradient` with two violet or blue stops, `border-radius` ≥ 9999px on buttons, and uppercase monospaced labels over headings. Optionally, run Impeccable's detector if the user has it installed. | Phase 4 gate | M: a backstop. | M: pattern rules need tuning against false hits. |

**Pick: 2a.** It's the cheapest, it's backed by first-hand evidence, and it gives 2b and 2c something to check against.

---

## 3. Rebuilding components that already exist
The agent builds a new button or card instead of using the one in the repo, or uses the wrong one because the code name differs from the design name. Over a project the near-copies pile up and drift apart.

**Sources**
- [r/ClaudeCode, u/kr1sck, 28 Aug 2026](https://www.reddit.com/r/ClaudeCode/comments/1w0sjtt/claude_code_kept_recreating_ui_components_i/) *(vendor)*: "another version of something that already exists". Their fix is the order reuse, then extend, then create.
- [BILL Engineering, 17 Aug 2026](https://www.bill.com/engineering/how-we-made-our-design-system-bilingual): shipped plain radio buttons instead of the system's "radio tile" component (code name `in-container-selector`). The fix: stop and ask before writing custom code.
- [GliaKit, Dejan Veljanoski, updated 7 Oct 2026](https://www.gliakit.com/guides/cursor-claude-code-design-system) *(vendor)*: "a fresh button component that duplicates the three you already have."
- [anthropics/skills #1562, @priyanshi9692, 14 Aug 2026](https://github.com/anthropics/skills/issues/1562): the frontend-design skill assumes a blank canvas and clashes with established systems.

**What the template already does**
- KICKSTART Step 2 scans the project for its type and for "existing brand material".
- Intake question 4 asks for logo, colours, fonts and past work.
- `digital-product.md` §M1.1 lists components (Button, Input, Card…).
- **The gap:** nothing lists existing components, nothing records where they live in code, and there's no rule to reuse them.

**Fix options**

| # | Option | Where | Impact | Effort |
|---|---|---|---|---|
| 3a | **Component inventory in KICKSTART Step 2.** For coding projects, the agent writes `design-build/inventory.json` with:<br>• the UI library (shadcn, MUI or in-house)<br>• each existing component: name, aliases, import path, variants<br>• theme and token files<br>• counts of hard-coded colours<br>It also records the inventory path in `state.yaml` (`inventory: design-build/inventory.json`). | Kickstart prompt, `state.yaml` | H: the agent can't reuse what it hasn't listed. | S: one step and one file. |
| 3b | **Reuse rule in §0.5 `agent_rules`.** "Reuse an existing component, then extend it with a variant, and create a new one only for a genuinely new pattern. If nothing fits, stop and ask, saying what you searched for. Log any new component in §14.4." Also add a "Code source / import" column to the §M1.1 table. | §0.5 agent rules, §M1.1 module | H: pairs with 3a. | S: wording. |
| 3c | **Intake question 4 extension.** Add: "Is there a component library or design system in code we must keep (shadcn, MUI, in-house)? Where does it live?" | §16 Phase 1 intake | M: catches libraries the scan misses. | S: one line. |
| 3d | **Ship a small component set** on the tokens (Button, Input, Card, Badge), so there is something real to reuse from day one instead of a static preview. | `components/`, `inventory.json` | M: gives the reuse rule a default to point at. | M: CSS, helpers, wrappers, tests. |

**Pick: 3a with 3b.** They're cheap together: 3a lists what exists, and 3b makes reusing it the rule. Neither does much alone.

---

## 4. Accessibility and contrast failures
Contrast is the most common failure. Missing skip links, landmarks, input labels and reduced-motion support are also common. Two studies found that asking for accessibility in the prompt *lowered* compliance, so only automated checks help.

**Sources**
- [ShipperAG, 2 Oct 2026](https://shipperag.com/ai-built-apps-accessibility-study/): 59% of 206 Lovable apps failed colour contrast, against 35% of top sites.
- [designwithclaude audit of 123 AI-built frontends](https://www.designwithclaude.com/design-research/ai-generated-frontends) (undated): 95% had no skip link, 49% had unlabelled inputs, and about 1 in 3 ignored reduced motion.
- [ACM W4A '26, "Generated Inaccessible", 2 Jun 2026](https://dl.acm.org/doi/full/10.1145/3800424.3800430): the page blocks automated readers, so this is from the abstract. 26.8% compliance on contrast, and accessibility prompts reduced compliance.
- [pbakaus/impeccable #988, @rdfitted, 8 Oct 2026](https://github.com/pbakaus/impeccable/issues/988): a static scan mixed dark-mode and print CSS and reported false contrast failures. Check the rendered page instead.

**What the template already does**
- `design.md` §0.4: §11 beats everything.
- `core.md` §11: WCAG 2.2 AA, 4.5:1 and 3:1 contrast, a `{size.target.min}` touch target (44px placeholder; `render.mjs` enforces the 24px WCAG 2.5.8 floor), visible focus, reduced motion, alt text.
- §16 Phase 3: live contrast ratios and a light and dark preview.
- Phase 4 `contrast_failures: 0`.
- §15 checks contrast, alt text and reduced motion.
- **The gap:**
  - Contrast is checked only for listed §4 pairings, and only on paper.
  - Nothing checks the rendered page or both themes.
  - Skip links, landmarks and labels aren't in §11.

**Fix options**

| # | Option | Where | Impact | Effort |
|---|---|---|---|---|
| 4a | **axe-core gate** using `@axe-core/playwright` inside the render harness (5a). It runs on `studies/index.html`, `preview/index.html` and any built page, in light and dark. It fails on any serious or critical issue and writes `design-build/a11y-report.json`. | Phase 3 and Phase 5 gates, §15 | H: catches contrast, labels and landmarks on what users actually see. | M: needs 5a first. |
| 4b | **Contrast in both themes** in `lint.mjs`. Compute WCAG ratios for every §4 pairing using the light *and* dark values in §13, not only the light ones. | Phase 4 gate | M: covers dark mode cheaply. | S: once 1a exists. |
| 4c | **Structural rules in the §11 YAML**: `skip_link: required`, `landmarks: header/nav/main/footer`, `form_labels: visible and linked`, `headings: one H1, no skipped levels` (§M1.7 already says one H1), and `links_vs_buttons: links navigate, buttons act`. Plus one §11 note: "Writing 'be accessible' in a prompt is not a check." | `core.md` §11 | M: gives axe and reviewers named targets. | S: wording. |
| 4d | **Motion proof.** A script that checks animations really play and really stop under `prefers-reduced-motion` (about 1 in 3 AI-built frontends ignore it). | Phase 6 step 5, CI self-test | M: reduced motion is easy to claim and rarely tested. | M: Playwright. |

**Pick: 4a.** The evidence shows that rules in prose don't work and checks on the rendered page do. It needs the render harness (5a), so build that first.

---

## 5. Not checking the rendered result
The agent says "done" without seeing the page. Layouts that are fine at desktop width break on phones. When agents do take screenshots, they often miss obvious defects, so measured checks beat eyeballing.

**Sources**
- [@mildlycooked, 23 Oct 2026](https://x.com/mildlycooked/status/2113706070224826760): "done, looks great" about screens it had never seen. Fixed with screenshots at 390, 768 and 1280px.
- [@udayan_w, 24 Mar 2026](https://x.com/udayan_w/status/2036433887627468842): the agent screenshotted its output and "somehow not see a completely broken button".
- [UI Verify, Igor Luchenkov, 26 Jul 2026](https://uiverify.ai/blog/agent-css-breaks-on-mobile) *(vendor)*: a checkout button 167px off-screen at 390px wide while the test still passed.
- [@mihacacic, 21 May 2026](https://x.com/mihacacic/status/2057484922739200133) *(vendor)*: "code compiled, but the rendered page still had broken spacing".

**What the template already does**
- KICKSTART: "Show, don't tell".
- §16 Phase 3: `studies/index.html` plus PNG screenshots, with a mini mockup per direction.
- §16 Phase 5: `preview/index.html` reads from `tokens_file`.
- `core.md` §13 has `breakpoint` tokens.
- **The gap:** no required widths, no dark-mode render, no measured overflow check, and §M1.3 is a placeholder.

**Fix options**

| # | Option | Where | Impact | Effort |
|---|---|---|---|---|
| 5a | **Render harness `design-build/render.mjs`** using Playwright. It opens a given HTML page at **390, 768 and 1280px** in light and dark (6 shots) and saves `design-build/screenshots/<page>-<width>-<theme>.png`. It also *measures*: horizontal overflow (`scrollWidth > clientWidth`), elements outside the viewport, overlapping interactive elements, and tap targets under the §11 size. It exits 1 on failure and lists the PNG paths to show the user. | Phase 3 and Phase 5 gates, §15 | H: real screenshots plus measured checks. | M: one script and one dependency. |
| 5b | **Gate wording only**: "Before saying done, show screenshots at 390, 768 and 1280 in light and dark." | Phase 3 and 5 gates, §15 | M: helps, but the sources show agents still miss defects they can see. | S: wording. |
| 5c | **Fill §M1.3** with these three widths mapped to `{breakpoint.*}`, plus a rule: no horizontal scroll at any listed width. | §M1.3 module | L–M: gives 5a its targets. | S: wording. |

**Pick: 5a.** Measured checks catch the failures that screenshots alone miss, and the same harness then runs the axe gate (4a).

---

## 6. Invented component APIs and stale docs
The agent uses props that don't exist or components that were renamed. Docs pasted into the chat fade later in the session.

**Sources**
- [Severin Bucher, 18 Mar 2026](https://severinbucher.com/posts/teaching-your-ai-to-use-your-component-library/): `EuiButton` with a `size` prop that doesn't exist. Fixed by letting the agent read the real component source through MCP.
- [BILL Engineering, 17 Aug 2026](https://www.bill.com/engineering/how-we-made-our-design-system-bilingual): an outdated Data Table guide led agents to deprecated APIs. Fixed by giving docs a version stamp and making the agent refuse to write UI code it can't check.
- [@walebuilds_, 17 Sep 2026](https://x.com/walebuilds_/status/2100615748053794929): design-system docs need a "do not" list, starting with "Do not invent a new button."

**What the template already does**
- §0.5 `agent_rules`: "Never invent a token". That covers tokens only, not components or props.
- §16.2 `components` seeds: Radix, shadcn/ui and similar.
- **The gap:** nothing about checking that a component or prop exists.

**Fix options**

| # | Option | Where | Impact | Effort |
|---|---|---|---|---|
| 6a | **Look-up-before-use rule** in §0.5: "Before using a component or prop, confirm it in `design-build/inventory.json`, the library's source or types, or its official MCP or registry. Never guess a prop. If you can't confirm it, stop and ask." | §0.5 agent rules | M: cheap and pairs with 3a. | S: wording. |
| 6b | **Component-existence check** in `lint.mjs`. Every component named in §M1.1 and in the preview or mockup code must appear in `inventory.json` or be logged as new in §14.4. Unknown imports fail. | Phase 4 gate | M: a backstop for 6a. | M: needs simple parsing of imports and JSX. |
| 6c | **TypeScript check when present.** If the project has `tsconfig.json`, Phase 5 runs `tsc --noEmit` on generated UI. Invalid props fail the type check. | Phase 5 gate | M: free in TypeScript projects, useless elsewhere. | S |
| 6d | **Per-screen UI inventory and component docs.** Each screen lists its components, variants and states; each component has a doc (states, tokens, motion, a11y, references), written after a per-component reference search and before building. The lint fails when a doc is missing, stale or names a token that doesn't exist. | `ui-inventory/`, §0.5, §16 Phase 2c and 6 | M: docs that a check keeps current don't go stale. | M: generator + lint rule. |

**Pick: 6a.** It's nearly free once the inventory (3a) exists. Add 6b later inside the lint.

---

## 7. Drift in long sessions
Rules written as prose fade as the conversation grows. The agent forgets why a direction was rejected and suggests it again, and long style guides use up context.

**Sources**
- [@JalkarnaGautam, 12 Jun 2026](https://x.com/JalkarnaGautam/status/2065528517098643825): written rules don't stop "hardcoding #1a1a1a on turn 40".
- [@TheDailyViber, 22 Oct 2026](https://x.com/TheDailyViber/status/2113261607207743576): "forgets the reason you rejected a design, then proposes it again after the context window rolls over."
- [@Kizuno18, 9 Oct 2026](https://x.com/Kizuno18/status/2108669534630740035): a 500-line style guide "drifts, mixes token names, and burns context"; checks that run outside the agent's context work better.
- [@ahry369, 22 Jun 2026](https://x.com/ahry369/status/2069155020189171913): "Fifteen rounds of 'make it cleaner'" used up the context window.

**What the template already does**
- KICKSTART: keep `design-build/state.yaml` updated after every step so a session can resume.
- `state.yaml` has `choices: {}` for Phase 3 picks.
- §16 Phase 5: Accept locks a section.
- §16.0: `review_rounds_before_check_in: 3`.
- **The gap:** `state.yaml` records *what* was picked, not what was rejected or *why*.

**Fix options**

| # | Option | Where | Impact | Effort |
|---|---|---|---|---|
| 7a | **Decisions log in `state.yaml`**: `decisions: [{ date, aspect, picked, rejected: [..], why }]`, plus `locked_sections: [..]`. A §0.5 rule says: "Re-read `decisions` before proposing any visual change. Never re-propose a rejected option unless the user reopens it." | `state.yaml`, §0.5, kickstart rules | M: fixes the re-proposal problem directly. | S |
| 7b | **Rely on the lint, not prose.** After any edit to design or UI files, run `lint.mjs` and paste only the failures (`file:line`). | §0.5, Phase 4 and 5 gates | M: rules survive context loss. | S: once 1a exists. |
| 7c | **One-screen "hard rules" card** at the top of §0.5, with at most 10 lines, re-read at the start of every phase. | §0.5 | L–M: helps, but it's still prose. | S |

**Pick: 7a.** It's the only option that targets the documented failure (re-proposing rejected designs), and it costs almost nothing.

---

## 8. Copying reference sites (thin evidence)
A popular habit is "drop in Stripe's or Linear's DESIGN.md and build a page that looks like this", and agents copy what they're given. No first-hand report of an agent cloning a competitor's values turned up, so treat this as a risk the template invites, not a measured failure.

**Sources**
- [@RoundtableSpace, 22 Oct 2026](https://x.com/RoundtableSpace/status/2113106821091143750): "Want your AI to build a page that looks like Stripe, Apple or Linear? Give it their DESIGN.md."
- [@_vmlops, 7 Apr 2026](https://x.com/_vmlops/status/2041437643162951815): "drop one in your project root, tell your agent 'build me a page that looks like this'."
- [Rob Hallam, 18 Aug 2026](https://robhallam.beehiiv.com/p/your-site-looks-ai-made): "Agents copy. Agents copy. Agents copy."

**What the template already does**
- §16.2 `seed_rules`: "Treat mature design systems as patterns to learn from, never as values to copy."
- KICKSTART repeats this ("Learn patterns … but never copy their values").
- §1 has `competitors_to_differ_from`.
- **The risk:** the template now seeds `design_md_collections` and `design_md_extractors_and_builders`, which make copying values easy.

**Fix options**

| # | Option | Where | Impact | Effort |
|---|---|---|---|---|
| 8a | **Tighter seed rule and labels.** Add to `seed_rules`: "DESIGN.md collections and extractors are for competitor and reference teardown only. Never import their values into §13. Record in `research/notes.md` the *pattern* learned (for example 'dense tables, one accent'), not hex values or font names." Add a short note on both group headers saying they're for teardown only. | §16.2 seeds and `seed_rules`, kickstart seed list | M | S: wording. |
| 8b | **Competitor-value check** in `lint.mjs`. Phase 2 logs competitor colours and fonts in `design-build/research/competitors.json`, and the lint warns when a §13 value is identical or very close to one of them. | Phase 4 gate | M | M: needs a colour-distance threshold. |
| 8c | **Phase 3 competitor wall note.** The wall already exists; add a line per direction: "differs from competitors by: …". | Phase 3 gate | L | S |

**Pick: 8a.** The evidence is thin, so start with the cheap wording change. Add 8b once the lint exists.

---

## Summary

| # | Bottleneck | Pick | Impact | Effort | Where |
|---|---|---|---|---|---|
| 1 | Hard-coded values, token misuse | 1a `design-build/lint.mjs` | H | M | Phase 4 gate, §15 |
| 2 | Generic AI look | 2a `avoid_defaults` list | H | S | core.md §2, §15 |
| 3 | Rebuilding existing components | 3a + 3b inventory + reuse rule | H | S | Kickstart Step 2, §0.5, §M1.1 |
| 4 | Accessibility and contrast | 4a axe-core gate (light and dark) | H | M | Phase 3 and 5 gates, §15 |
| 5 | Not checking the render | 5a `design-build/render.mjs` (3 widths × 2 themes) | H | M | Phase 3 and 5 gates, §15 |
| 6 | Invented APIs, stale docs | 6a look-up-before-use rule | M | S | §0.5 |
| 7 | Long-session drift | 7a `decisions` log in `state.yaml` | M | S | `state.yaml`, §0.5, kickstart |
| 8 | Copying reference sites | 8a teardown-only seed rule | M | S | §16.2 `seed_rules`, kickstart seeds |

## Top 5 to implement first
1. **`design-build/lint.mjs`, a real Phase 4 lint.**
   - *Why first:* the template already says the lint MUST pass, but nothing runs it.
   - *Covers:* #1 directly, and later carries the role-slot check (1b), ceiling mode (1c), default fingerprints (2c), contrast in both themes (4b), component existence (6b) and competitor values (8b).
   - It also supports #7, since rules move out of prose and into a check.
2. **Component inventory and the reuse rule (3a + 3b).**
   - *Why:* high impact, small effort, and it's the template's biggest blind spot for existing codebases.
   - *Covers:* #3, and gives #6 (6a, 6b) its source of truth.
3. **`avoid_defaults` list in §2 (2a), with the Phase 3 "which defaults this breaks" line (2b).**
   - *Why:* a few lines of wording, and the sources show that naming specific patterns works.
   - *Covers:* #2.
4. **`design-build/render.mjs` render harness (5a).**
   - *Why:* the agent can't check what it never rendered, and measured overflow checks beat eyeballing screenshots.
   - *Covers:* #5, and it's the base for #4.
5. **axe-core gate in the render harness (4a), plus contrast in both themes (4b).**
   - *Why:* accessibility has the strongest numbers in the research, and prompts don't fix it.
   - *Covers:* #4, including dark mode.

Quick wins to add with step 2, since they're wording only: 6a (look-up-before-use), 7a (decisions log) and 8a (teardown-only seeds).

## Implementation order

| Step | What | Files that change | Done when |
|---|---|---|---|
| **A. Wording and rules** (no tooling) | 2a, 2b, 3b, 3c, 4c, 6a, 7a, 8a | `design/core.md` (§2, §11), `design.md` (§0.5, §16.2 `seed_rules`, Phase 1 Q4, Phase 3 gate, §15), `design/digital-product.md` (§M1.1 column, §M1.3), `design-build/state.yaml` (`decisions`, `locked_sections`, `inventory`) | Each new rule appears once, in its owning file (§0.3). No rule is restated elsewhere. |
| **B. Kickstart Step 2 inventory** (3a) | Step 2 writes `design-build/inventory.json` | `KICKSTART.md` and the README kickstart block (kept identical) | On a sample React repo, the kickstart run produces an inventory with import paths. The README and KICKSTART prompts still diff clean. |
| **C. Lint core** (1a) | `lint.mjs` implements the 6 existing Phase 4 keys | `design-build/lint.mjs` (new), Phase 4 text in `design.md` points to `node design-build/lint.mjs` | *(Changed when built: completion is enforced from Phase 4, so the unfilled template passes and reports placeholders as progress.)* On the unfilled template it reports placeholders. Adding a hex value to `core.md` §4 makes it fail at that line. Removing the hex value makes it pass. |
| **D. Lint extensions** (needs C) | 1b role-slot, 4b both-theme contrast, 1c `--baseline` ceiling, then 2c fingerprints, 6b component existence, 8b competitor values | `design-build/lint.mjs`, `design-build/lint-baseline.json` (created on first run), `design-build/research/competitors.json` (8b) | Each check has a small fixture that fails as expected. A rising count fails `--baseline`, and a falling count prints the "lower baseline" reminder. |
| **E. Render harness** (5a) | Playwright, 390/768/1280 × light/dark, overflow, off-screen, overlap and tap-target checks | `design-build/render.mjs` (new), a minimal `design-build/package.json` for the Playwright dependency, Phase 3 and 5 text in `design.md` | Running it on `studies/index.html` writes 6 PNGs. A page with a deliberately overflowing element exits 1. |
| **F. Accessibility gate** (4a, needs E) | `@axe-core/playwright` in `render.mjs`, both themes | `design-build/render.mjs`, `design-build/a11y-report.json` (output), §15 line | A page with an unlabelled input or a low-contrast pairing fails. A clean page passes. |
| **G. Wire it up** | Gates and checklist name the scripts; this file's implemented items move into their owning files and get removed here | `design.md` (Phase 3/4/5 gates, §15), README "How it works", this file | Running the kickstart on a fresh project runs lint and render at the right gates without extra prompting. Each implemented fix is marked "done" or removed here. |
