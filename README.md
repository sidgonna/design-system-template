# Design System Template

A universal, AI-readable design system template for any brand and any kind of design work: apps and websites, marketing and content, motion and video, and print. It's built so AI coding harnesses (Claude Code, Cursor, Codex and others) can parse it, and so the people reading it can feel the brand.

## Quick start
1. Copy this repo into your project, either as a folder or with `git clone https://github.com/sidgonna/design-system-template.git design-system`.
2. Open your coding harness in the project.
3. Paste the prompt below. The harness reads the system, works out your project type from the files, asks the intake questions and walks you through visual directions before it builds anything.

## Kickstart prompt (copy and paste)
```text
You are the design lead for this project. A design system template has been added to this repo. Your job right now is to CLARIFY THE DESIGN WITH ME, not to build anything.

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
- Components: Component Gallery https://component.gallery/ · Radix https://www.radix-ui.com/primitives · shadcn/ui https://ui.shadcn.com/
- Accessibility: WCAG 2.2 https://www.w3.org/TR/WCAG22/ · ARIA Authoring Practices https://www.w3.org/WAI/ARIA/apg/ · WebAIM Contrast https://webaim.org/resources/contrastchecker/
- Color: Radix Colors https://www.radix-ui.com/colors · Leonardo https://leonardocolor.io/ · OKLCH https://oklch.com/
- Type: Google Fonts https://fonts.google.com/ · Noto (Indic) https://fonts.google.com/noto · Fontshare https://www.fontshare.com/ · Practical Typography https://practicaltypography.com/
- Icons: Lucide https://lucide.dev/ · Phosphor https://phosphoricons.com/ · Iconify https://icon-sets.iconify.design/
- Motion: Material 3 Motion https://m3.material.io/styles/motion/overview · Carbon Motion https://carbondesignsystem.com/elements/motion/overview/ · Easings https://easings.net/
- Data viz: Carbon Data Viz https://carbondesignsystem.com/data-visualization/getting-started/ · ColorBrewer https://colorbrewer2.org/
- Competitors and inspiration: Brandfetch https://brandfetch.com/ · Brand New https://www.underconsideration.com/brandnew/ · Wayback Machine https://web.archive.org/
- Ad and social formats: Meta Ads Guide https://www.facebook.com/business/ads-guide
Rules: seeds count toward the §16.0 source cap and get logged in design-build/research/notes.md. Learn patterns from mature systems, but never copy their values. Use open search only for competitors, the category, local market and culture, and the brand's own assets. Skip sites that need a login or block access, note it, and keep moving.

RULES FOR THIS WHOLE SESSION
- Do NOT write production code, components, styles, animations, video edits or layouts, or change any existing project file, until ALL of these are true:
  (a) I have confirmed the brief from Phase 1,
  (b) I have seen the Phase 3 visual studies page (real swatches, type specimens, icon samples and motion demos, not text descriptions) and picked a direction for each aspect,
  (c) the design system files are filled per Phase 4 and pass its lint.
  The only files you may create or change before then are inside `design-build/`, the module flags in design.md, and the template files you fill per §16.
- Follow §16 phase by phase and stop at every gate for my answer. Never pick a visual direction for me.
- Respect the §16.0 hard limits. When a research cap is hit, stop researching, log the gaps as ASSUMPTION in §14.4, and move to visuals. Never stall.
- Show, don't tell. Any color, font, icon or motion you propose must be visible in an HTML page or image I can open, and you should tell me the exact path to open.
- Follow §0 of design.md: every value lives once in §13 tokens, every topic has one owning file, and modules narrow core but never contradict it.
- Keep `design-build/state.yaml` updated after every step, including the inferred project type and its evidence, so we can resume in a new session.
- Talk to me in plain language, keep messages short, and ask one batch of questions at a time.

Begin with Step 1 now.
```

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
| `tokens/tokens.json` | A machine copy of the §13 tokens |
| `assets/` | Logo, icons, imagery, motion, moodboard, templates and fonts |
| `design-build/` | Working files during a build: state, research notes, studies and the preview |

## How it works
- **Every value lives once,** in §13 tokens. Everything else references tokens by name.
- **Every topic has one owner file,** so sections can't contradict each other. Modules can narrow core rules but never override them.
- **Modules are optional,** and they switch on through flags in `design.md`.
- **The §16 workflow** runs in five steps: intake, capped research, visual studies (you pick A, B or C), filling the template to about 90% with an automatic check, then reviewing and finishing it.
