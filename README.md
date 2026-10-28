# Design System Template

A universal, AI-readable design system template for any brand and any kind of design work: apps and websites, marketing and content, motion and video, and print. It's built so AI coding harnesses (Claude Code, Cursor, Codex and others) can parse it, and so the people reading it can feel the brand.

## Quick start
Run these from your project's root folder (the one with your `package.json` or `.git`). The template goes in a folder named `design-system/`, with no `.git` of its own:

```sh
# 1. Copy the template in (either line works)
npx degit sidgonna/design-system-template design-system
# git clone --depth 1 https://github.com/sidgonna/design-system-template design-system && rm -rf design-system/.git

# 2. Install the render + accessibility checks (the lint needs only Node 18+)
npm --prefix design-system/design-build ci
npx --prefix design-system/design-build playwright install chromium   # add --with-deps on a fresh Linux machine

# 3. Install the git pre-commit hook (needs a git repo: run `git init` first if there is none)
node design-system/design-build/install-hooks.mjs

# 4. Check that everything runs
node design-system/design-build/lint.mjs
```

On an existing app, step 4 usually fails with a list of hard-coded colors and sizes in your code. That is expected: KICKSTART Step 2 shows you the counts and asks whether to freeze them as a ceiling (`--baseline`), and §16 Phase 6 brings them down.

5. Keep `design-system/design-build/` out of your app's own linter (ESLint, oxlint, Biome): it holds Node tooling and test fixtures that are bad on purpose, so the app's lint (and a lint-staged pre-commit) fails on it otherwise. Keep `design-system/components/` linted. For example `"ignorePatterns": ["design-system/design-build/**"]` in `.oxlintrc.json`, or `globalIgnores(['dist', 'design-system/design-build'])` in `eslint.config.js`.

6. Open your coding harness in the project and paste the prompt below. The harness reads the system, works out your project type from the files, asks the intake questions and walks you through visual directions before it builds anything. For an app it then applies the system to your code (§16 Phase 6).

Developing the template itself? Clone it normally and drop the `design-system/` prefix from every command (`node design-build/lint.mjs`).

## Kickstart prompt (copy and paste)
```text
You are the design lead for this project. A design system template has been added to this repo. Your job right now is to CLARIFY THE DESIGN WITH ME, not to build anything.
Paths: the design system is the `design-system/` folder at the project root. Paths below such as `design-build/state.yaml` are inside that folder; run commands from the project root exactly as written. (If `design.md` is at the repository root, the template itself is the project: drop the `design-system/` prefix.)

STEP 1 — Read before you speak
1. Find the design system root: the file named `design.md` whose front matter has `doc_type: design-system-index`. Read it fully, especially §0 (conventions, ownership map, precedence, agent rules) and §16 (build workflow and its hard limits).
2. Skim `design/core.md` and the module files in `design/` so you know what each part owns. Do not fill anything in yet.
3. If `design-build/state.yaml` exists, a build is already in progress. Resume from the phase it records instead of starting over, and tell me where we are.

STEP 2 — Infer the project type yourself (do not ask me for it)
Scan everything in the project outside the design system folder and decide the project type from evidence. Examples of signals:
- Coding (app or website): package.json, requirements.txt, pyproject.toml, go.mod, Cargo.toml, src/, app/, pages/, components/, .html/.css/.tsx/.vue/.swift/.kt files, Tailwind or theme configs. → enable digital_product.
- Motion or video: .aep, .prproj, .drp, .fcpxml, .blend, .c4d, Remotion or Motion Canvas code, Lottie .json, .mp4/.mov footage, storyboards. → enable motion_video.
- Marketing or content: social post designs, ad creatives, .fig/.psd/.ai/.sketch files, decks (.pptx/.key), content calendars, copy docs. → enable marketing_content.
- Print or physical: print-ready PDFs, dielines, packaging files, CMYK assets. → enable print_physical.
- Existing brand material: logos, color files, fonts, brand guides, style or theme files.
A project can be several types at once. Set the `parts.*.enabled` flags in design.md from what you find, and note the evidence (file paths) for each.
If the project is empty, or has nothing that shows its type, say so plainly, leave every module flag undecided, and rely on the intake answers to set them.
For a coding project, also write `design-build/inventory.json`, the list of UI that already exists, so it is reused instead of rebuilt. Use the shape already in that file: the UI library in use (for example shadcn/ui, MUI, Radix or in-house), the theme and token files, a rough count of hard-coded colors and, for each existing component, its name, aliases, import path, props and variants with `status: existing`. Read the components from the code, never guess them. Keep the starter `planned` entries that match §M1.1; remove any the project won't use, from both files. Set `inventory` in `design-build/state.yaml` to that path. If there is no UI code, leave the components list empty.
For a coding project, also list the app's screens in `design-build/inventory.json` → `screens` (one entry per route: name, route, purpose, source files, and the components with the variants and states each uses), then run `node design-system/design-build/ui-inventory.mjs`, which writes `ui-inventory/screens/<id>.md` and a doc stub per component. Fill each component doc only after searching the §16.2 component seeds for that component on its own (§16 Phase 2c); 21st.dev and other registries are for patterns, never pasted code. The lint (rule `ui-inventory`) fails until every component on a listed screen has a complete doc.
For a coding project, also propose `design-build/project.json`: the app's code folders the lint will check (run `node design-system/design-build/lint.mjs` and read its "app code:" line; it auto-detects src/, app/, pages/, components/, styles/, top-level *.html/*.css and public/*.html), anything to exclude, and the dev-server URL (`app_url`, e.g. http://localhost:5173/). Write it only after I approve it. If the existing code already has hard-coded colors or sizes, tell me the lint counts and ask whether to freeze them as a ceiling with `node design-system/design-build/lint.mjs --baseline`; never run it without my yes. If `.git/hooks/pre-commit` does not mention design-system, tell me to run `node design-system/design-build/install-hooks.mjs`.

STEP 3 — Tell me what you found (5 lines max)
- The project type(s) you inferred and the files that told you, or that the project is empty.
- The modules you enabled.
- Any existing brand material you found.
- That you'll follow §16, starting with intake.

STEP 4 — §16 Phase 1 intake (ALWAYS ask the full set)
Ask me ALL the intake questions from §16 Phase 1 in ONE message: grouped, numbered, with a short example answer for each. Never skip one, whether the project is empty, full, or already has brand files.
- The questions about brand identity, what the product is, and the base details (name, audience, location and languages) must always be asked.
- Where the project files already suggest an answer, show it as a pre-filled suggestion for me to confirm or correct (for example: "Name: looks like 'Acme' from package.json — right?"), but still ask.
- If the project is empty, also ask what will be built here (app, website, video, social and ads, print or a mix) so you can set the module flags.
Then stop and wait for my reply.

SEED SOURCES — research starts deep, not wide
Before any open web search in §16 Phase 2, read the seeds for each area. §16.2 in design.md is the full, owning list; this is the short version. If they differ, §16.2 wins.
- Tokens: W3C Design Tokens Format https://tr.designtokens.org/format/ · Style Dictionary https://styledictionary.com/
- Reference systems: Material 3 https://m3.material.io/ · Apple HIG https://developer.apple.com/design/human-interface-guidelines · IBM Carbon https://carbondesignsystem.com/ · GOV.UK https://design-system.service.gov.uk/
- Components (search each seed once per component, §16 Phase 2c; add WAI-ARIA APG and Refero Styles): Component Gallery https://component.gallery/ · Radix https://www.radix-ui.com/primitives · shadcn/ui https://ui.shadcn.com/ · React Aria https://react-spectrum.adobe.com/react-aria/ · Kokonut UI https://kokonutui.com/ · 21st.dev https://21st.dev/ (patterns only)
- Accessibility: WCAG 2.2 https://www.w3.org/TR/WCAG22/ · ARIA Authoring Practices https://www.w3.org/WAI/ARIA/apg/ · WebAIM Contrast https://webaim.org/resources/contrastchecker/
- Color: Radix Colors https://www.radix-ui.com/colors · Leonardo https://leonardocolor.io/ · OKLCH https://oklch.com/
- Type: Google Fonts https://fonts.google.com/ · Noto (Indic) https://fonts.google.com/noto · Fontshare https://www.fontshare.com/ · Practical Typography https://practicaltypography.com/
- Icons: Lucide https://lucide.dev/ · Phosphor https://phosphoricons.com/ · Iconify https://icon-sets.iconify.design/
- Motion: Material 3 Motion https://m3.material.io/styles/motion/overview · Carbon Motion https://carbondesignsystem.com/elements/motion/overview/ · Easings https://easings.net/
- Palette libraries: Tailwind colors https://tailwindcss.com/docs/colors · Open Color https://yeun.github.io/open-color/ · Adobe Color Explore https://color.adobe.com/explore · Color Hunt https://colorhunt.co/
- Pick colors → full palette (for people): Coolors https://coolors.co/generate · Adobe Color wheel https://color.adobe.com/create/color-wheel · Huemint https://huemint.com/ · Realtime Colors https://www.realtimecolors.com/ · UI Colors https://uicolors.app/
- Pick colors → full palette (for agents): The Color API https://www.thecolorapi.com/docs · Leonardo https://github.com/adobe/leonardo · Material Color Utilities https://github.com/material-foundation/material-color-utilities · chroma.js https://gka.github.io/chroma.js/ · Culori https://culorijs.org/
- Motion libraries: Motion https://motion.dev/ · GSAP https://gsap.com/ · Anime.js https://animejs.com/ · Lottie https://airbnb.io/lottie/ · AutoAnimate https://auto-animate.formkit.com/
- Agent-ready references: DESIGN.md https://designmd.ai/ · 21st.dev (MCP) https://21st.dev/ · Refero Styles https://styles.refero.design/ · Minimal Gallery https://minimal.gallery/ · AppShot https://appshot.gallery/ · Motion Primitives https://motion-primitives.com/
- Page sections (web and landing): Landing.gallery https://landing.gallery/ · Navbar Gallery https://www.navbar.gallery/ · Supahero https://supahero.io/ · CTA.gallery https://www.cta.gallery/ · Footer.design https://www.footer.design/
- Open media (sound and images, check each license): Openverse API https://api.openverse.org/v1/
- Motion and video for agents: LottieFiles motion-design-skill https://github.com/LottieFiles/motion-design-skill · Prompt Motion https://prompt-motion.com/ · GSAP Skills https://github.com/greensock/gsap-skills · HyperFrames https://github.com/heygen-com/hyperframes · Remotion Skills https://github.com/remotion-dev/skills
- Agent design skills (review and taste): Impeccable https://github.com/pbakaus/impeccable · Vercel web-design-guidelines https://github.com/vercel-labs/agent-skills · Anthropic frontend-design https://github.com/anthropics/skills · Google stitch-skills https://github.com/google-labs-code/stitch-skills · UI/UX Pro Max https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- Motion building blocks: Motion Canvas https://motioncanvas.io/ · Rive https://rive.app/ · three.js https://threejs.org/ · Satori https://github.com/vercel/satori · Remotion https://www.remotion.dev/ (check license) · React Bits https://reactbits.dev/
- Animation tools for people: Jitter https://jitter.video/ · ProtoPie https://www.protopie.io/ · Lottielab https://www.lottielab.com/
- DESIGN.md collections (teardown only, never a source of our values): Devault https://devault.design/design-md · designmd.supply https://designmd.supply/ · Neuform https://neuform.ai/ · TypeUI https://typeui.sh/
- DESIGN.md extractors and builders (teardown only): DESIGNMD https://design-md.hyperbrowser.ai/ · DesignMD https://designmd.me/ · Open Design https://open-design.ai/ · Aura https://aura.build/
- AI design workflow (drafts, not sources): Skill Issue https://skill-issue.in/ · UX Pilot https://uxpilot.ai/ · v0 https://v0.app/ · Base44 https://base44.com/
- Web and motion references: Inspora https://inspora.design/ · Motionin https://motionin.design/ · Oversight Supply https://supply.madebyoversight.com/ (and /sections)
- Data viz: Carbon Data Viz https://carbondesignsystem.com/data-visualization/getting-started/ · ColorBrewer https://colorbrewer2.org/
- Competitors and inspiration: Brandfetch https://brandfetch.com/ · Brand New https://www.underconsideration.com/brandnew/ · Wayback Machine https://web.archive.org/
- Ad and social formats: Meta Ads Guide https://www.facebook.com/business/ads-guide
Generate palettes with the agent tools, check contrast, and show the results visually. Link the human tools so the user can tweak.
Rules: seeds count toward the §16.0 source cap and get logged in design-build/research/notes.md. Learn patterns from mature systems, but never copy their values. Use open search only for competitors, the category, local market and culture, and the brand's own assets. Skip sites that need a login or block access, note it, and keep moving.

RULES FOR THIS WHOLE SESSION
- Do NOT write production code, components, styles, animations, video edits or layouts, or change any existing project file, until ALL of these are true:
  (a) I have confirmed the brief from Phase 1,
  (b) I have seen the Phase 3 visual studies page (real swatches, type specimens, icon samples and motion demos, not text descriptions) and picked a direction for each aspect,
  (c) the design system files are filled per Phase 4 and pass its lint.
  The only files you may create or change before then are inside `design-system/design-build/`, the module flags in design.md, and the template files you fill per §16. Changing the app's own code happens in §16 Phase 6, after Phase 5 is accepted and I say yes.
- Follow §16 phase by phase and stop at every gate for my answer. Never pick a visual direction for me.
- Respect the §16.0 hard limits. When a research cap is hit, stop researching, log the gaps as ASSUMPTION in §14.4, and move to visuals. Never stall.
- Show, don't tell. Any color, font, icon or motion you propose must be visible in an HTML page or image I can open, and you should tell me the exact path to open.
- Follow §0 of design.md: every value lives once in §13 tokens, every topic has one owning file, and modules narrow core but never contradict it.
- After every edit to a design file, tokens or UI, run `node design-system/design-build/lint.mjs` and fix what it reports; it checks the design files and the app's code. Reuse a component from `design-build/inventory.json` before extending one, and extend before creating; ask me before creating one.
- Never say "done" until `design-build/state.yaml` shows lint, render and a11y passing on the current commit; for the app, render must run on the dev-server URL (`node design-system/design-build/render.mjs --url <dev-server URL> --record`). Never edit the lint config, baseline, hooks or checks, or update screenshots, to make a check pass without asking me.
- Keep `design-build/state.yaml` updated after every step, including the inferred project type and its evidence, so we can resume in a new session.
- Talk to me in plain language, keep messages short, and ask one batch of questions at a time.

Begin with Step 1 now.
```

## Components: usage
The template ships four working components: **Button, Input, Card and Badge** (digital-product.md §M1.1). They use only token variables and have no runtime dependencies. Their motion runs on motion tokens; under `prefers-reduced-motion` nothing moves and only short opacity and color fades remain (core.md §10). Without `components/base.css` (or your own base styles) the page keeps the browser default font, Times New Roman. You can use them three ways:

```tsx
// React 18+. In the app entry (src/main.tsx, or app/layout.tsx in Next.js), once:
import '../design-system/design-build/preview/tokens.css';   // the tokens, first
import '../design-system/components/base.css';               // optional: body font, colors, headings from the tokens
// In any component file. The wrappers import components/components.css themselves, so don't import it again.
// They start with 'use client', so a Next.js Server Component page can render them.
import { Button, Input, Card, Badge } from '../design-system/components/react';   // typed (index.d.ts)

<Card variant="raised" interactive>
  <h3><a href="/plans/pro">Pro plan</a></h3>
  <Badge variant="success">Active</Badge>
  <Input label="Email" type="email" autoComplete="email" error={emailError} />
  <Button type="submit" loading={saving}>Save changes</Button>
</Card>
```

```html
<!-- Any stack: the same CSS through data attributes. Link tokens.css, then base.css (optional) and components.css -->
<button type="button" data-component="button" data-variant="secondary">Preview</button>
<span data-component="badge" data-variant="warning">Expiring</span>
<script type="module">
  import { createInput, setButtonLoading, setInputError, replay } from './design-system/components/index.js';
</script>
```

| Component | Variants | Main props / attributes |
|---|---|---|
| Button | primary, secondary, ghost, danger | `variant`, `loading` (keeps focus: `aria-busy` + `aria-disabled`; announces `loadingLabel`, default "Loading"), `disabled`, `type` |
| Input | default, error | `label`, `hint`, `error` (sets the variant, `aria-invalid` and `aria-describedby`, and shakes), plus the native input attributes (`required`, `disabled`, `readOnly`, `maxLength`, `autoComplete`, `inputMode`…) |
| Card | flat, raised | `variant`, `interactive` (hover and focus-within lift), `enter` (plays the entrance), `as` |
| Badge | neutral, success, warning, error, info | `variant`, `live` (`role="status"` for a status that changes on the page) |

An unknown `variant` logs a console error in the React wrappers (and throws in the vanilla helpers) instead of silently rendering the default look.

Each component has a full doc in [`ui-inventory/components/`](ui-inventory/components/): anatomy, every state, tokens, motion, accessibility, responsive behavior, do and don't, and references. `design-build/inventory.json` lists them with their import path, so agents reuse them instead of inventing new ones (§0.5).

## UI inventory
[`ui-inventory/`](ui-inventory/README.md) records what each screen of your app is made of and how each component works. `design-build/inventory.json` stays the single source of structured facts:

- **Components:** status, import, props and variants.
- **`screens`:** each screen's route, purpose, source files, and the components, variants and states it uses.

The markdown holds the prose, and `node design-system/design-build/ui-inventory.mjs` keeps the generated tables in it in sync. The lint (rule `ui-inventory`) fails when a component on a listed screen has no complete doc, when a screen's source renders a component the screen doesn't list, or when a doc names a token that doesn't exist. A new component needs a doc and a per-component reference search first (§0.5, §16 Phase 2c). 21st.dev findings and the "patterns, never code" rule are in [`design-build/references/21st-dev.md`](design-build/references/21st-dev.md).

## What's inside
| Path | What it is |
|---|---|
| [`design.md`](design.md) | The index: conventions, which file owns each section, precedence rules, agent rules, the §16 build workflow and the §15 checklist |
| [`design/core.md`](design/core.md) | §1–§14, always used: brand foundation, visual direction, logo, color, type, voice, imagery, iconography, layout, motion, accessibility, localization, tokens and governance |
| [`design/digital-product.md`](design/digital-product.md) | §M1: components, states, breakpoints, data visualization and SEO |
| [`design/marketing-content.md`](design/marketing-content.md) | §M2: social, ad, WhatsApp and deck formats; campaigns; content pillars |
| [`design/motion-video.md`](design/motion-video.md) | §M3: video, titles, captions, sound and export |
| [`design/print.md`](design/print.md) | §M4: print, packaging and merch |
| [`KICKSTART.md`](KICKSTART.md) | The same kickstart prompt as above |
| [`BOTTLENECKS.md`](BOTTLENECKS.md) | Where AI agents stumble, the fix for each, and which fixes are implemented |
| `components/` | The shipped components: `components.css` (the `data-component` / `data-variant` API), `index.js` (vanilla helpers) and `react/` (typed React wrappers) |
| `ui-inventory/` | Per-screen component use, one doc per component, and blank templates |
| `tokens/tokens.json` | A machine copy of the §13 tokens, in W3C Design Tokens (DTCG) format with light and dark modes |
| `assets/` | Logo, icons, imagery, motion, moodboard, templates and fonts |
| `design-build/` | Working files during a build (state, inventory, research notes, studies, the preview) and the quality checks (`lint.mjs`, `render.mjs`, hooks) |

## How it works
- **Every value lives once,** in §13 tokens. Everything else references tokens by name.
- **Every topic has one owner file,** so sections can't contradict each other. Modules can narrow core rules but never override them.
- **Modules are optional,** and they switch on through flags in `design.md`.
- **The §16 workflow** runs in six steps: intake, capped research, visual studies (you pick A, B or C), filling the template to about 90% with an automatic check, reviewing and finishing it, then (for an app) applying it to the app's code until the checks pass on the running app.

## Quality checks
"Done" is something a script checks, not something an agent claims. Two scripts do the checking, and three gates run them. Commands are shown as run from your app's root; in the template repo itself drop the `design-system/` prefix.

| Command | What it checks | Needs |
|---|---|---|
| `node design-system/design-build/lint.mjs` | Static checks on the design docs, `tokens/tokens.json`, the design system's preview and studies, **and your app's code**: `src/`, `app/`, `pages/`, `components/`, `styles/`, top-level `*.html`/`*.css` and `public/*.html` (css, scss, ts, tsx, js, jsx, vue, svelte, html; `node_modules`, `dist`, `build`, `.next` skipped), or the `code_dirs` in `design-build/project.json`:<br>• raw hex, rgb, hsl, oklch, px or ms values outside §13<br>• `{token}` and `var(--token)` references that don't resolve<br>• tokens used in a §4 "Never use for" slot<br>• WCAG contrast for every §4 pairing, in light and dark (4.5:1 normal, 3:1 large and UI)<br>• unjustified core §2 `avoid_defaults`<br>• components or variants missing from `design-build/inventory.json`<br>• screens and component docs in `ui-inventory/`: every component on a listed screen has a complete doc, the docs match inventory.json, and they use only real tokens<br>• DTCG format, generated CSS that is stale, section ownership, KICKSTART/README sync, and Phase 4 completion<br>Each finding gives `file:line`, the value and the fix. A hard-coded color in app code is an error. | Node 18+ only |
| `node design-system/design-build/render.mjs [page …] [--url <url> …]` | Captures each page (the preview by default) at 390, 768 and 1280 wide in light and dark, into `design-build/screenshots/`. For your app, start its dev server (`npm run dev`) and pass the URL it prints: `--url http://localhost:5173/`. It fails on any of these:<br>• an uncaught page error, a script or stylesheet that fails to load, or a blank page<br>• sideways scroll<br>• key elements off-screen<br>• overlapping controls<br>• tap targets under 24px<br>• no visible focus<br>• serious or critical axe issues (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`)<br>Results go to `render-report.json` and `a11y-report.json`. | `npm --prefix design-system/design-build ci` and `npx --prefix design-system/design-build playwright install chromium` (add `--with-deps` on a fresh Linux machine) |
| `node design-system/design-build/motion.mjs [page] [--url <url>]` | Proves that motion plays: card entrance, badge pop-in, input error shake and focus ring, button hover, press and spinner, and the preview's Play motion demo. It samples each animation's transform and opacity mid-flight, then checks under `prefers-reduced-motion: reduce` that nothing moves while color feedback stays. It also fails on console errors. `--strip <dir>` saves frame strips. | the same `npm ci` + Playwright |
| `node design-system/design-build/ui-inventory.mjs [--check]` | Regenerates `ui-inventory/index.md` and the tables in each screen and component doc from `inventory.json`, and creates missing docs from the templates. `--check` only reports. | Node 18+ |
| `npm --prefix design-system/design-build run tokens:check` | Validates `tokens/tokens.json` against the DTCG 2025.10 format with Terrazzo | the same `npm ci` |
| `node design-system/design-build/tokens-css.mjs` | Regenerates `preview/tokens.css` (CSS variables, light + dark), `tokens.mjs` (ES module for app code) and `tokens.js` from `tokens/tokens.json`; `--check` fails if they are stale | Node 18+ |
| `node design-system/design-build/test/run.mjs` | The checks' own self-test: good and bad fixtures, mutation tests for every rule, the CLI flags, running from an app root, the git and agent hooks, the UI inventory (missing, stale or unfilled docs, unknown tokens, variants and states), the React wrappers (server-rendered), and, when Playwright is installed, the render fixtures, the component helpers in a browser and the motion check (including a broken reduced-motion block that must fail) | Node 18+ |

Useful flags:
- `lint.mjs --json` for machine-readable output.
- `lint.mjs --src <dir|file>` to lint more code once; to change what is linted every time, edit `code_dirs` in `design-build/project.json` (adding is fine; removing a folder needs the owner's approval, design.md §0.5).
- `lint.mjs --baseline` for an existing app with hard-coded values. It freezes today's counts so a run fails only when a count rises; lower the ceiling as counts drop, down to 0 or an agreed target (§16 Phase 6). Run it only with the owner's approval.
- `lint.mjs --root <dir>` / `render.mjs --root <dir>` if the project root is not the git top level or the nearest `package.json` above `design-system/`.
- `render.mjs --app` renders `app_url` from `design-build/project.json`.
- `--record` on both scripts writes the result and commit to `design-build/state.yaml` → `checks`.
- `lint.mjs --phase 4` enforces completion before the state says Phase 4.

**Gates:**
- **CI.** For your app, copy `design-system/design-build/ci/app-design-checks.example.yml` to `.github/workflows/design-checks.yml`: it installs the app and the checks, lints, checks the tokens, starts the dev server and runs render + axe on it. The template's own `.github/workflows/design-checks.yml` checks the template (self-test, lint, tokens, render) and is not copied into apps.
- **Pre-commit.** `node design-system/design-build/install-hooks.mjs` installs it once per clone. It lints the design files and the app code (a hard-coded color blocks the commit), regenerates the token files when `tokens.json` changes, and runs render + axe when visual files change (the app on `app_url` if its dev server is running). If `design-system/` goes missing, the hook fails loudly instead of passing.
- **Agent hooks (optional).** `design-build/hooks/` has a Claude Code `PostToolUse` example and a Cursor `postToolUse` example. Each runs the lint after every agent edit and gives the findings back to the agent. See [`design-build/hooks/README.md`](design-build/hooks/README.md). They are not switched on by default.

**No gaming (design.md §0.5).** Agents must not do any of these without the owner's approval:
- edit the check scripts, `lint.config.json`, `lint-baseline.json`, the hooks or the workflows
- remove a folder from `code_dirs` or add an `exclude` in `design-build/project.json` to stop app code being linted
- run `--baseline`
- add a `justified` reason to `avoid_defaults` that the owner didn't give
- commit with `--no-verify`

If a check is wrong, the agent should say so and ask.

**Automated is not conformance.** These checks catch a share of WCAG issues, not all of them. Keyboard, screen-reader and 200% zoom passes are still manual (core §11).
