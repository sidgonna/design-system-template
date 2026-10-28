# Kickstart prompt
Paste everything inside the block below into your coding harness (Claude Code, Cursor, Codex…) after dropping this folder into any project: code, motion or video, marketing, print, or an empty folder.

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
