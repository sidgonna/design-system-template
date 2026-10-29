# Changelog

Product releases of this template. A brand's `system_version` in its own `design.md` is separate. `template_version` in that front matter is the document schema (2.0.0), not this product version. The unfilled starter stays on its placeholder system version. These notes do not publish a git tag or a GitHub release.

## 1.0.0 — 2026-10-29

First release of the checked template: a filled example you can copy, a second example with the opposite theme order, and the files an agent needs before it edits.

### Added

- Token tiers, OKLCH ramps from seeds, on-colour pairs, state layers, a themes list, sub-brand ramps, composite type roles, and colour-vision checks on the chart series.
- A neutral board chrome with its own tokens and shipped font files. Specimens carry the brand. The chrome does not.
- Godavari Ferry (`examples/godavari-ferry`), a light-first example built through the intake: night water, red oxide, antique brass, Fraunces and Atkinson Hyperlegible. Optional specimen copy.
- Exports in `design-build/exports/`: Google DESIGN.md (alpha, with the token file in a fence), Tailwind v4 and v3, Tokens Studio and Figma variables. The board badge reads Outputs synced.
- Grouped components (actions, inputs, feedback, navigation, data display, layout) and four patterns. React wrappers start with `'use client'`.
- Sodium Yard (`examples/sodium-yard`), a dark-first example: sodium, cold steel and filament on a blue-grey yard, Bricolage Grotesque and Public Sans. The night theme is the default and the morning sheet follows `prefers-color-scheme: light`.
- [seeds.yaml](seeds.yaml) for those two quick starts. Research URLs stay in design.md §16.2.
- [RULES.md](RULES.md), the short card for coding agents. design.md §0 and §16 win if they disagree.
- [design-build/references/competitors.md](design-build/references/competitors.md), a comparison with Stitch and similar tools, with screenshots stored in this repo.

### Not in this release

- CI jobs that upload screenshots. Those wait until after 1 November 2026. No workflow file was added for them.
- A git tag or a published GitHub release. Version 1.0.0 is this document.
- Marketing and motion for either example. Both stay switched off.
- A high-contrast theme for either example.

Godavari Ferry and Sodium Yard stay at system version 0.9.0. Neither has passed a Phase 5 review with the owner.
