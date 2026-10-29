# Rules for coding agents

Short card. If this file disagrees with [design.md](design.md) §0 or §16, **those sections win**. Values live in [design/core.md](design/core.md) §13 and `tokens/tokens.json`.

## Tokens

- Three tiers. `palette.*` ramps come from the §13 `ramps:` seeds (`node design-build/ramps.mjs`). System roles alias a ramp step. `component.*` aliases a role. Components and app code never name `palette.*`.
- No raw hex, rgb, hsl, oklch, px, ms, opacity or z-index outside §13 and the token file. Chrome CSS uses `--chrome-*` tokens, never a raw value.
- The first theme in `design.md` `themes:` is the default. A later `light` or `dark` follows `prefers-color-scheme`. `data-theme` wins over the media query.
- Do not invent a token. Propose it in core.md §14.4.

## Brand and chrome

- Board chrome stays neutral. Only a specimen carries a brand.
- Ship real font files (woff2 plus the OFL) and import `assets/fonts/fonts.css` before `tokens.css`. Do not use Inter, Roboto, Arial, Helvetica, Geist or system-ui as the first family. Do not use the chrome faces (Hanken Grotesk, IBM Plex) as the brand.
- Indic copy stays in `.lang-te` / `.lang-hi` and in SVG. Do not put Telugu or Hindi in chrome prose.

## Components

- Reuse `design-build/inventory.json`, then extend, then create. A new component needs the user's yes, a doc in `ui-inventory/components/`, and a per-component seed search (design.md §16 Phase 2c).
- Registries (21st.dev, shadcn/ui, Radix) are patterns, not values and not code to paste.
- React wrappers start with `'use client'`. Import `tokens.css`, then `components/base.css`. The wrappers import `components.css`.

## Checks

- After a design, token or UI edit, run `node design-build/lint.mjs` and fix what it reports.
- Do not loosen a check. Protected files (`lint.mjs`, `lint.config.json`, `render.mjs`, baselines, hooks, check scripts) may only be extended, and each extension is a `design-build/state.yaml` decision. Do not add a CI screenshot job. That waits until after 1 Nov 2026. Do not edit `.github/`.
- Do not call work done until lint, render and a11y are recorded on the current commit. This template's own release notes do not publish a git tag.

## Builds

- A new brand follows §16. The intake marker on an undecided module flag means not chosen yet. Delete it when the flag is set. Do not leave doubled-brace placeholders in a filled file.
- Research URLs live only in design.md §16.2. A seed group stays at or under 6. [seeds.yaml](seeds.yaml) is brand presets (feel, themes, ramp seeds, fonts, path). Do not copy §16.2 into it.
- The starter board is `node design-build/board.mjs`. An example is `node examples/use.mjs <brand>` (`--check`, `--serve`). Rebuilding an example does not touch the starter board.
- The README kickstart fence and `KICKSTART.md` stay byte-identical.
- Root `design-build/state.yaml` stays phase 0. An example keeps its own state file. `template_version` is the document schema. `system_version` is that brand. The product release is [CHANGELOG.md](CHANGELOG.md).
- Do not commit or push unless the user asks.
