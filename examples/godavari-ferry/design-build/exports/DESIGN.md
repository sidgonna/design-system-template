---
version: alpha
name: Godavari Ferry
description: "A paper ticket you can read in full sun, on a moving boat."
colors:
  primary: "#386275"
  secondary: "#933f3b"
  tertiary: "#754900"
  neutral: "#5c534c"
  surface: "#ffffff"
  on-surface: "#1b1612"
  on-primary: "#f7f5f4"
  on-secondary: "#f7f5f4"
  on-tertiary: "#f7f5f4"
  error: "#b91c1c"
  on-error: "#f7f5f4"
  success: "#00692e"
  on-success: "#f7f5f4"
  warning: "#904000"
  on-warning: "#f7f5f4"
  info: "#1d4ed8"
  on-info: "#f7f5f4"
  border: "#aba39c"
  focus: "#386275"
  container-primary: "#e2ecf1"
  container-secondary: "#fce4e1"
  container-accent: "#f5e7d8"
  container-success: "#dbf1df"
  container-warning: "#ffe4d6"
  container-error: "#ffe3df"
  container-info: "#e0ebff"
  on-container-primary: "#163a4a"
  on-container-secondary: "#5a1616"
  on-container-accent: "#412700"
  on-container-success: "#003915"
  on-container-warning: "#4e1f00"
  on-container-error: "#630004"
  on-container-info: "#01178b"
  surface-sunken: "#ece9e7"
  surface-raised: "#f7f5f4"
  surface-overlay: "#ffffff"
  surface-inverse: "#1b1612"
  text-inverse: "#f7f5f4"
  border-subtle: "#dbd7d3"
  border-strong: "#766c65"
  data-1: "#d37107"
  data-2: "#2995d6"
  data-3: "#0f7c4d"
  data-4: "#a18b61"
  data-5: "#0a568e"
  data-6: "#bf4d07"
  data-7: "#c269b3"
  data-8: "#7f7f7f"
typography:
  display:
    fontFamily: Fraunces
    fontSize: 3rem
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.5px"
    fontFeature: "kern, liga"
  h1:
    fontFamily: Fraunces
    fontSize: 2.25rem
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.5px"
    fontFeature: "kern, liga"
  h2:
    fontFamily: Fraunces
    fontSize: 1.75rem
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: 0px
    fontFeature: "kern, liga"
  h3:
    fontFamily: Fraunces
    fontSize: 1.375rem
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: 0px
    fontFeature: "kern, liga"
  body-lg:
    fontFamily: Atkinson Hyperlegible
    fontSize: 1.125rem
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0px
    fontFeature: "kern, liga"
  body:
    fontFamily: Atkinson Hyperlegible
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0px
    fontFeature: "kern, liga"
  caption:
    fontFamily: Atkinson Hyperlegible
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0px
    fontFeature: "kern, tnum"
  overline:
    fontFamily: Atkinson Hyperlegible
    fontSize: 0.75rem
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: 0.5px
    fontFeature: "kern, liga"
  label:
    fontFamily: Atkinson Hyperlegible
    fontSize: 0.875rem
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: 0px
    fontFeature: "kern, tnum"
rounded:
  none: 0px
  sm: 4px
  md: 8px
  lg: 16px
  full: 9999px
spacing:
  1: 4px
  2: 8px
  3: 12px
  4: 16px
  6: 24px
  8: 32px
  12: 48px
  base: 4px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: "{spacing.2}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "{spacing.2}"
  button-ghost:
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "{spacing.2}"
  button-danger:
    backgroundColor: "{colors.error}"
    textColor: "{colors.on-error}"
    rounded: "{rounded.md}"
    padding: "{spacing.2}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.sm}"
    padding: "{spacing.2}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.6}"
  badge:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.sm}"
    padding: "{spacing.1}"
  badge-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.on-success}"
    rounded: "{rounded.sm}"
    padding: "{spacing.1}"
  badge-warning:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.on-warning}"
    rounded: "{rounded.sm}"
    padding: "{spacing.1}"
  badge-error:
    backgroundColor: "{colors.error}"
    textColor: "{colors.on-error}"
    rounded: "{rounded.sm}"
    padding: "{spacing.1}"
  badge-info:
    backgroundColor: "{colors.info}"
    textColor: "{colors.on-info}"
    rounded: "{rounded.sm}"
    padding: "{spacing.1}"
---

# Godavari Ferry

## Overview

Godavari Ferry is recorded here for agents. The YAML front matter is the Google DESIGN.md projection of the light theme. dark is in the token file, the Tailwind files and the Figma files.

A paper ticket you can read in full sun, on a moving boat.

Every value lives in the token file. This document is generated from it. Do not edit it by hand.

## Colors

The default theme is light.

- `{colors.primary}` is the light value of `color.brand.primary`.
- `{colors.secondary}` is the light value of `color.brand.secondary`.
- `{colors.tertiary}` is the light value of `color.accent`.
- `{colors.neutral}` is the light value of `color.text.secondary`.
- `{colors.surface}` is the light value of `color.surface.default`.
- `{colors.on-surface}` is the light value of `color.text.primary`.
- `{colors.on-primary}` is the light value of `color.on.primary`.
- `{colors.on-secondary}` is the light value of `color.on.secondary`.
- `{colors.on-tertiary}` is the light value of `color.on.accent`.
- `{colors.error}` is the light value of `color.semantic.error`.
- `{colors.on-error}` is the light value of `color.on.error`.
- `{colors.success}` is the light value of `color.semantic.success`.
- `{colors.on-success}` is the light value of `color.on.success`.
- `{colors.warning}` is the light value of `color.semantic.warning`.
- `{colors.on-warning}` is the light value of `color.on.warning`.
- `{colors.info}` is the light value of `color.semantic.info`.
- `{colors.on-info}` is the light value of `color.on.info`.
- `{colors.border}` is the light value of `color.border.default`.
- `{colors.focus}` is the light value of `color.focus`.
- `{colors.container-primary}` is the light value of `color.container.primary`.
- `{colors.container-secondary}` is the light value of `color.container.secondary`.
- `{colors.container-accent}` is the light value of `color.container.accent`.
- `{colors.container-success}` is the light value of `color.container.success`.
- `{colors.container-warning}` is the light value of `color.container.warning`.
- `{colors.container-error}` is the light value of `color.container.error`.
- `{colors.container-info}` is the light value of `color.container.info`.
- `{colors.on-container-primary}` is the light value of `color.on-container.primary`.
- `{colors.on-container-secondary}` is the light value of `color.on-container.secondary`.
- `{colors.on-container-accent}` is the light value of `color.on-container.accent`.
- `{colors.on-container-success}` is the light value of `color.on-container.success`.
- `{colors.on-container-warning}` is the light value of `color.on-container.warning`.
- `{colors.on-container-error}` is the light value of `color.on-container.error`.
- `{colors.on-container-info}` is the light value of `color.on-container.info`.
- `{colors.surface-sunken}` is the light value of `color.surface.sunken`.
- `{colors.surface-raised}` is the light value of `color.surface.raised`.
- `{colors.surface-overlay}` is the light value of `color.surface.overlay`.
- `{colors.surface-inverse}` is the light value of `color.surface.inverse`.
- `{colors.text-inverse}` is the light value of `color.text.inverse`.
- `{colors.border-subtle}` is the light value of `color.border.subtle`.
- `{colors.border-strong}` is the light value of `color.border.strong`.
- `{colors.data-1}` is the light value of `color.data.1`.
- `{colors.data-2}` is the light value of `color.data.2`.
- `{colors.data-3}` is the light value of `color.data.3`.
- `{colors.data-4}` is the light value of `color.data.4`.
- `{colors.data-5}` is the light value of `color.data.5`.
- `{colors.data-6}` is the light value of `color.data.6`.
- `{colors.data-7}` is the light value of `color.data.7`.
- `{colors.data-8}` is the light value of `color.data.8`.

## Typography

Each role is one typography token. The family in the YAML is the first family in the stack. The fallback stack, the script overrides and the OpenType features stay in the token file.

- `display` is the `display` type role.
- `h1` is the `h1` type role.
- `h2` is the `h2` type role.
- `h3` is the `h3` type role.
- `body-lg` is the `body-lg` type role.
- `body` is the `body` type role.
- `caption` is the `caption` type role.
- `overline` is the `overline` type role.
- `label` is the `label` type role.

## Layout

Spacing follows the space tokens.

- `1` is 4px.
- `2` is 8px.
- `3` is 12px.
- `4` is 16px.
- `6` is 24px.
- `8` is 32px.
- `12` is 48px.
- `base` is 4px.

Breakpoints, viewport widths and container widths stay in the token file.

## Elevation & Depth

Depth uses the shadow tokens. shadow.1 is the resting card, shadow.2 the raised card and shadow.3 the overlay. A dark theme uses a heavier shadow. The values stay in the token file.

## Shapes

Corners use the radius tokens.

- `none` is 0px.
- `sm` is 4px.
- `md` is 8px.
- `lg` is 16px.
- `full` is 9999px.

## Components

Button, Input, Card and Badge take their fills and text from the color tokens above. Padding and corner radius reference spacing and rounded. The button's inline padding is spacing.4; the block padding is spacing.2.

## Do's and Don'ts

- Do take every value from the token file. The YAML above is a projection of the light theme, not a second source.
- Do keep text on a fill at the contrast the token pairings already meet.
- Don't name a palette step from component code. Components use the role tokens.
- Don't edit this file by hand. Change the tokens and run the export again.

## Token file

This section is not a Google DESIGN.md section. Import reads the fence and writes it back unchanged.

```json tokens
{
  "$description": "Machine copy of §13 in design/core.md for the Godavari Ferry example (DTCG format 2025.10). Night-water, red-oxide and antique-brass ramps on warm stone. Heading is Fraunces with Source Serif 4 behind it. Chart series stay on the Okabe-Ito set so the hues stay apart under colour-vision deficiency.",
  "palette": {
    "$type": "color",
    "white": { "$value": { "colorSpace": "srgb", "components": [1, 1, 1], "hex": "#ffffff" } },
    "black": { "$value": { "colorSpace": "srgb", "components": [0, 0, 0], "hex": "#000000" } },
    "primary": {
      "50": { "$value": { "colorSpace": "srgb", "components": [0.9483, 0.9671, 0.9769], "hex": "#f2f7f9" } },
      "100": { "$value": { "colorSpace": "srgb", "components": [0.8852, 0.9258, 0.9469], "hex": "#e2ecf1" } },
      "200": { "$value": { "colorSpace": "srgb", "components": [0.7897, 0.8608, 0.8976], "hex": "#c9dbe5" } },
      "300": { "$value": { "colorSpace": "srgb", "components": [0.6715, 0.7756, 0.829], "hex": "#abc6d3" } },
      "400": { "$value": { "colorSpace": "srgb", "components": [0.5377, 0.672, 0.7398], "hex": "#89abbd" } },
      "500": { "$value": { "colorSpace": "srgb", "components": [0.416, 0.5696, 0.6458], "hex": "#6a91a5" } },
      "600": { "$value": { "colorSpace": "srgb", "components": [0.3097, 0.472, 0.5509], "hex": "#4f788c" } },
      "700": { "$value": { "colorSpace": "srgb", "components": [0.2208, 0.3828, 0.4596], "hex": "#386275" } },
      "800": { "$value": { "colorSpace": "srgb", "components": [0.1473, 0.3018, 0.373], "hex": "#264d5f" } },
      "900": { "$value": { "colorSpace": "srgb", "components": [0.0863, 0.2275, 0.2902], "hex": "#163a4a" } },
      "950": { "$value": { "colorSpace": "srgb", "components": [0.0154, 0.1179, 0.1625], "hex": "#041e29" } },
      "$type": "color",
      "$description": "Reference ramp \"primary\" generated from seed #163a4a (lands on 900) by design-build/ramps.mjs. Do not edit by hand: change the seed in core.md §13 ramps and re-run.",
      "$extensions": { "org.design-system.ramp": { "seed": "#163a4a" } }
    },
    "secondary": {
      "50": { "$value": { "colorSpace": "srgb", "components": [0.9968, 0.9522, 0.9471], "hex": "#fef3f2" } },
      "100": { "$value": { "colorSpace": "srgb", "components": [0.9884, 0.8934, 0.8827], "hex": "#fce4e1" } },
      "200": { "$value": { "colorSpace": "srgb", "components": [0.9662, 0.8036, 0.786], "hex": "#f6cdc8" } },
      "300": { "$value": { "colorSpace": "srgb", "components": [0.9231, 0.6909, 0.6672], "hex": "#ebb0aa" } },
      "400": { "$value": { "colorSpace": "srgb", "components": [0.8524, 0.5613, 0.5344], "hex": "#d98f88" } },
      "500": { "$value": { "colorSpace": "srgb", "components": [0.7661, 0.4417, 0.4155], "hex": "#c3716a" } },
      "600": { "$value": { "colorSpace": "srgb", "components": [0.6712, 0.336, 0.3134], "hex": "#ab5650" } },
      "700": { "$value": { "colorSpace": "srgb", "components": [0.576, 0.2478, 0.2304], "hex": "#933f3b" } },
      "800": { "$value": { "colorSpace": "srgb", "components": [0.4863, 0.1765, 0.1647], "hex": "#7c2d2a" } },
      "900": { "$value": { "colorSpace": "srgb", "components": [0.3524, 0.0874, 0.0846], "hex": "#5a1616" } },
      "950": { "$value": { "colorSpace": "srgb", "components": [0.2079, 0.0168, 0.021], "hex": "#350405" } },
      "$type": "color",
      "$description": "Reference ramp \"secondary\" generated from seed #7c2d2a (lands on 800) by design-build/ramps.mjs. Do not edit by hand: change the seed in core.md §13 ramps and re-run.",
      "$extensions": { "org.design-system.ramp": { "seed": "#7c2d2a" } }
    },
    "accent": {
      "50": { "$value": { "colorSpace": "srgb", "components": [0.983, 0.9586, 0.9313], "hex": "#fbf4ed" } },
      "100": { "$value": { "colorSpace": "srgb", "components": [0.9596, 0.9075, 0.8488], "hex": "#f5e7d8" } },
      "200": { "$value": { "colorSpace": "srgb", "components": [0.9184, 0.8281, 0.7252], "hex": "#ead3b9" } },
      "300": { "$value": { "colorSpace": "srgb", "components": [0.8561, 0.7252, 0.5736], "hex": "#dab992" } },
      "400": { "$value": { "colorSpace": "srgb", "components": [0.7676, 0.6015, 0.4026], "hex": "#c49967" } },
      "500": { "$value": { "colorSpace": "srgb", "components": [0.6636, 0.4778, 0.2413], "hex": "#a97a3e" } },
      "600": { "$value": { "colorSpace": "srgb", "components": [0.5412, 0.3529, 0.0706], "hex": "#8a5a12" } },
      "700": { "$value": { "colorSpace": "srgb", "components": [0.4592, 0.2876, 0], "hex": "#754900" } },
      "800": { "$value": { "colorSpace": "srgb", "components": [0.3604, 0.2216, 0], "hex": "#5c3900" } },
      "900": { "$value": { "colorSpace": "srgb", "components": [0.2558, 0.1517, 0], "hex": "#412700" } },
      "950": { "$value": { "colorSpace": "srgb", "components": [0.1408, 0.0746, 0], "hex": "#241300" } },
      "$type": "color",
      "$description": "Reference ramp \"accent\" generated from seed #8a5a12 (lands on 600) by design-build/ramps.mjs. Do not edit by hand: change the seed in core.md §13 ramps and re-run.",
      "$extensions": { "org.design-system.ramp": { "seed": "#8a5a12" } }
    },
    "neutral": {
      "50": { "$value": { "colorSpace": "srgb", "components": [0.9669, 0.9621, 0.9585], "hex": "#f7f5f4" } },
      "100": { "$value": { "colorSpace": "srgb", "components": [0.9256, 0.9153, 0.9075], "hex": "#ece9e7" } },
      "200": { "$value": { "colorSpace": "srgb", "components": [0.8605, 0.8427, 0.8291], "hex": "#dbd7d3" } },
      "300": { "$value": { "colorSpace": "srgb", "components": [0.7752, 0.7495, 0.7297], "hex": "#c6bfba" } },
      "400": { "$value": { "colorSpace": "srgb", "components": [0.6708, 0.6383, 0.6132], "hex": "#aba39c" } },
      "500": { "$value": { "colorSpace": "srgb", "components": [0.5661, 0.5297, 0.5017], "hex": "#908780" } },
      "600": { "$value": { "colorSpace": "srgb", "components": [0.4625, 0.4254, 0.3965], "hex": "#766c65" } },
      "700": { "$value": { "colorSpace": "srgb", "components": [0.3608, 0.3255, 0.298], "hex": "#5c534c" } },
      "800": { "$value": { "colorSpace": "srgb", "components": [0.2827, 0.2506, 0.2256], "hex": "#48403a" } },
      "900": { "$value": { "colorSpace": "srgb", "components": [0.1994, 0.1725, 0.1514], "hex": "#332c27" } },
      "950": { "$value": { "colorSpace": "srgb", "components": [0.1065, 0.0873, 0.0723], "hex": "#1b1612" } },
      "$type": "color",
      "$description": "Reference ramp \"neutral\" generated from seed #5c534c (lands on 700) by design-build/ramps.mjs. Do not edit by hand: change the seed in core.md §13 ramps and re-run.",
      "$extensions": { "org.design-system.ramp": { "seed": "#5c534c" } }
    },
    "success": {
      "50": { "$value": { "colorSpace": "srgb", "components": [0.9369, 0.9755, 0.9427], "hex": "#eff9f0" } },
      "100": { "$value": { "colorSpace": "srgb", "components": [0.86, 0.9435, 0.8733], "hex": "#dbf1df" } },
      "200": { "$value": { "colorSpace": "srgb", "components": [0.7434, 0.8905, 0.7687], "hex": "#bee3c4" } },
      "300": { "$value": { "colorSpace": "srgb", "components": [0.5976, 0.8163, 0.6399], "hex": "#98d0a3" } },
      "400": { "$value": { "colorSpace": "srgb", "components": [0.4289, 0.7189, 0.4944], "hex": "#6db77e" } },
      "500": { "$value": { "colorSpace": "srgb", "components": [0.2651, 0.6139, 0.3606], "hex": "#449d5c" } },
      "600": { "$value": { "colorSpace": "srgb", "components": [0.0824, 0.502, 0.2392], "hex": "#15803d" } },
      "700": { "$value": { "colorSpace": "srgb", "components": [0, 0.4124, 0.1789], "hex": "#00692e" } },
      "800": { "$value": { "colorSpace": "srgb", "components": [0, 0.3185, 0.1318], "hex": "#005122" } },
      "900": { "$value": { "colorSpace": "srgb", "components": [0, 0.2228, 0.0836], "hex": "#003915" } },
      "950": { "$value": { "colorSpace": "srgb", "components": [0, 0.1193, 0.0317], "hex": "#001e08" } },
      "$type": "color",
      "$description": "Reference ramp \"success\" generated from seed #15803d (lands on 600) by design-build/ramps.mjs. Do not edit by hand: change the seed in core.md §13 ramps and re-run.",
      "$extensions": { "org.design-system.ramp": { "seed": "#15803d" } }
    },
    "warning": {
      "50": { "$value": { "colorSpace": "srgb", "components": [1, 0.9533, 0.9296], "hex": "#fff3ed" } },
      "100": { "$value": { "colorSpace": "srgb", "components": [0.9989, 0.8945, 0.8409], "hex": "#ffe4d6" } },
      "200": { "$value": { "colorSpace": "srgb", "components": [0.984, 0.8047, 0.7113], "hex": "#fbcdb5" } },
      "300": { "$value": { "colorSpace": "srgb", "components": [0.948, 0.6908, 0.5543], "hex": "#f2b08d" } },
      "400": { "$value": { "colorSpace": "srgb", "components": [0.883, 0.5585, 0.3796], "hex": "#e18e61" } },
      "500": { "$value": { "colorSpace": "srgb", "components": [0.7998, 0.4352, 0.2185], "hex": "#cc6f38" } },
      "600": { "$value": { "colorSpace": "srgb", "components": [0.7059, 0.3255, 0.0353], "hex": "#b45309" } },
      "700": { "$value": { "colorSpace": "srgb", "components": [0.5666, 0.2497, 0], "hex": "#904000" } },
      "800": { "$value": { "colorSpace": "srgb", "components": [0.4345, 0.1847, 0], "hex": "#6f2f00" } },
      "900": { "$value": { "colorSpace": "srgb", "components": [0.3062, 0.1215, 0], "hex": "#4e1f00" } },
      "950": { "$value": { "colorSpace": "srgb", "components": [0.1712, 0.0545, 0], "hex": "#2c0e00" } },
      "$type": "color",
      "$description": "Reference ramp \"warning\" generated from seed #b45309 (lands on 600) by design-build/ramps.mjs. Do not edit by hand: change the seed in core.md §13 ramps and re-run.",
      "$extensions": { "org.design-system.ramp": { "seed": "#b45309" } }
    },
    "error": {
      "50": { "$value": { "colorSpace": "srgb", "components": [1, 0.9516, 0.9445], "hex": "#fff3f1" } },
      "100": { "$value": { "colorSpace": "srgb", "components": [1, 0.8903, 0.8744], "hex": "#ffe3df" } },
      "200": { "$value": { "colorSpace": "srgb", "components": [1, 0.7914, 0.7624], "hex": "#ffcac2" } },
      "300": { "$value": { "colorSpace": "srgb", "components": [1, 0.6552, 0.6114], "hex": "#ffa79c" } },
      "400": { "$value": { "colorSpace": "srgb", "components": [0.9689, 0.4917, 0.4419], "hex": "#f77d71" } },
      "500": { "$value": { "colorSpace": "srgb", "components": [0.8938, 0.3503, 0.3074], "hex": "#e4594e" } },
      "600": { "$value": { "colorSpace": "srgb", "components": [0.807, 0.2229, 0.1961], "hex": "#ce3932" } },
      "700": { "$value": { "colorSpace": "srgb", "components": [0.7255, 0.1098, 0.1098], "hex": "#b91c1c" } },
      "800": { "$value": { "colorSpace": "srgb", "components": [0.5554, 0, 0.0326], "hex": "#8e0008" } },
      "900": { "$value": { "colorSpace": "srgb", "components": [0.3863, 0, 0.0146], "hex": "#630004" } },
      "950": { "$value": { "colorSpace": "srgb", "components": [0.2184, 0, 0.0041], "hex": "#380001" } },
      "$type": "color",
      "$description": "Reference ramp \"error\" generated from seed #b91c1c (lands on 700) by design-build/ramps.mjs. Do not edit by hand: change the seed in core.md §13 ramps and re-run.",
      "$extensions": { "org.design-system.ramp": { "seed": "#b91c1c" } }
    },
    "info": {
      "50": { "$value": { "colorSpace": "srgb", "components": [0.9467, 0.9645, 1], "hex": "#f1f6ff" } },
      "100": { "$value": { "colorSpace": "srgb", "components": [0.88, 0.9201, 1], "hex": "#e0ebff" } },
      "200": { "$value": { "colorSpace": "srgb", "components": [0.7754, 0.8499, 1], "hex": "#c6d9ff" } },
      "300": { "$value": { "colorSpace": "srgb", "components": [0.6391, 0.7569, 1], "hex": "#a3c1ff" } },
      "400": { "$value": { "colorSpace": "srgb", "components": [0.4735, 0.6397, 1], "hex": "#79a3ff" } },
      "500": { "$value": { "colorSpace": "srgb", "components": [0.31, 0.5151, 1], "hex": "#4f83ff" } },
      "600": { "$value": { "colorSpace": "srgb", "components": [0.1925, 0.4004, 0.938], "hex": "#3166ef" } },
      "700": { "$value": { "colorSpace": "srgb", "components": [0.1137, 0.3059, 0.8471], "hex": "#1d4ed8" } },
      "800": { "$value": { "colorSpace": "srgb", "components": [0.0342, 0.191, 0.7054], "hex": "#0931b4" } },
      "900": { "$value": { "colorSpace": "srgb", "components": [0.0044, 0.0884, 0.5451], "hex": "#01178b" } },
      "950": { "$value": { "colorSpace": "srgb", "components": [0.0018, 0.002, 0.349], "hex": "#000159" } },
      "$type": "color",
      "$description": "Reference ramp \"info\" generated from seed #1d4ed8 (lands on 700) by design-build/ramps.mjs. Do not edit by hand: change the seed in core.md §13 ramps and re-run.",
      "$extensions": { "org.design-system.ramp": { "seed": "#1d4ed8" } }
    }
  },
  "color": {
    "$type": "color",
    "brand": {
      "primary": {
        "$value": "{palette.primary.700}",
        "$extensions": { "mode": { "light": "{palette.primary.700}", "dark": "{palette.primary.300}" } }
      },
      "secondary": {
        "$value": "{palette.secondary.700}",
        "$extensions": { "mode": { "light": "{palette.secondary.700}", "dark": "{palette.secondary.300}" } }
      }
    },
    "accent": {
      "$value": "{palette.accent.700}",
      "$extensions": { "mode": { "light": "{palette.accent.700}", "dark": "{palette.accent.300}" } }
    },
    "on": {
      "primary": {
        "$value": "{palette.neutral.50}",
        "$extensions": { "mode": { "light": "{palette.neutral.50}", "dark": "{palette.neutral.950}" } },
        "$description": "text and icons on {color.brand.primary}"
      },
      "secondary": {
        "$value": "{palette.neutral.50}",
        "$extensions": { "mode": { "light": "{palette.neutral.50}", "dark": "{palette.neutral.950}" } },
        "$description": "text and icons on {color.brand.secondary}"
      },
      "accent": {
        "$value": "{palette.neutral.50}",
        "$extensions": { "mode": { "light": "{palette.neutral.50}", "dark": "{palette.neutral.950}" } },
        "$description": "text and icons on {color.accent}"
      },
      "success": {
        "$value": "{palette.neutral.50}",
        "$extensions": { "mode": { "light": "{palette.neutral.50}", "dark": "{palette.neutral.950}" } },
        "$description": "text and icons on {color.semantic.success}"
      },
      "warning": {
        "$value": "{palette.neutral.50}",
        "$extensions": { "mode": { "light": "{palette.neutral.50}", "dark": "{palette.neutral.950}" } },
        "$description": "text and icons on {color.semantic.warning}"
      },
      "error": {
        "$value": "{palette.neutral.50}",
        "$extensions": { "mode": { "light": "{palette.neutral.50}", "dark": "{palette.neutral.950}" } },
        "$description": "text and icons on {color.semantic.error}"
      },
      "info": {
        "$value": "{palette.neutral.50}",
        "$extensions": { "mode": { "light": "{palette.neutral.50}", "dark": "{palette.neutral.950}" } },
        "$description": "text and icons on {color.semantic.info}"
      }
    },
    "container": {
      "primary": {
        "$value": "{palette.primary.100}",
        "$extensions": { "mode": { "light": "{palette.primary.100}", "dark": "{palette.primary.900}" } }
      },
      "secondary": {
        "$value": "{palette.secondary.100}",
        "$extensions": { "mode": { "light": "{palette.secondary.100}", "dark": "{palette.secondary.900}" } }
      },
      "accent": {
        "$value": "{palette.accent.100}",
        "$extensions": { "mode": { "light": "{palette.accent.100}", "dark": "{palette.accent.900}" } }
      },
      "success": {
        "$value": "{palette.success.100}",
        "$extensions": { "mode": { "light": "{palette.success.100}", "dark": "{palette.success.900}" } }
      },
      "warning": {
        "$value": "{palette.warning.100}",
        "$extensions": { "mode": { "light": "{palette.warning.100}", "dark": "{palette.warning.900}" } }
      },
      "error": {
        "$value": "{palette.error.100}",
        "$extensions": { "mode": { "light": "{palette.error.100}", "dark": "{palette.error.900}" } }
      },
      "info": {
        "$value": "{palette.info.100}",
        "$extensions": { "mode": { "light": "{palette.info.100}", "dark": "{palette.info.900}" } }
      }
    },
    "on-container": {
      "primary": {
        "$value": "{palette.primary.900}",
        "$extensions": { "mode": { "light": "{palette.primary.900}", "dark": "{palette.primary.100}" } }
      },
      "secondary": {
        "$value": "{palette.secondary.900}",
        "$extensions": { "mode": { "light": "{palette.secondary.900}", "dark": "{palette.secondary.100}" } }
      },
      "accent": {
        "$value": "{palette.accent.900}",
        "$extensions": { "mode": { "light": "{palette.accent.900}", "dark": "{palette.accent.100}" } }
      },
      "success": {
        "$value": "{palette.success.900}",
        "$extensions": { "mode": { "light": "{palette.success.900}", "dark": "{palette.success.100}" } }
      },
      "warning": {
        "$value": "{palette.warning.900}",
        "$extensions": { "mode": { "light": "{palette.warning.900}", "dark": "{palette.warning.100}" } }
      },
      "error": {
        "$value": "{palette.error.900}",
        "$extensions": { "mode": { "light": "{palette.error.900}", "dark": "{palette.error.100}" } }
      },
      "info": {
        "$value": "{palette.info.900}",
        "$extensions": { "mode": { "light": "{palette.info.900}", "dark": "{palette.info.100}" } }
      }
    },
    "surface": {
      "sunken": {
        "$value": "{palette.neutral.100}",
        "$extensions": { "mode": { "light": "{palette.neutral.100}", "dark": "{palette.black}" } }
      },
      "default": {
        "$value": "{palette.white}",
        "$extensions": { "mode": { "light": "{palette.white}", "dark": "{palette.neutral.950}" } }
      },
      "raised": {
        "$value": "{palette.neutral.50}",
        "$extensions": { "mode": { "light": "{palette.neutral.50}", "dark": "{palette.neutral.900}" } }
      },
      "overlay": {
        "$value": "{palette.white}",
        "$extensions": { "mode": { "light": "{palette.white}", "dark": "{palette.neutral.800}" } }
      },
      "inverse": {
        "$value": "{palette.neutral.950}",
        "$extensions": { "mode": { "light": "{palette.neutral.950}", "dark": "{palette.neutral.50}" } }
      }
    },
    "text": {
      "primary": {
        "$value": "{palette.neutral.950}",
        "$extensions": { "mode": { "light": "{palette.neutral.950}", "dark": "{palette.neutral.50}" } }
      },
      "secondary": {
        "$value": "{palette.neutral.700}",
        "$extensions": { "mode": { "light": "{palette.neutral.700}", "dark": "{palette.neutral.300}" } }
      },
      "inverse": {
        "$value": "{palette.neutral.50}",
        "$extensions": { "mode": { "light": "{palette.neutral.50}", "dark": "{palette.neutral.950}" } }
      }
    },
    "border": {
      "subtle": {
        "$value": "{palette.neutral.200}",
        "$extensions": { "mode": { "light": "{palette.neutral.200}", "dark": "{palette.neutral.800}" } }
      },
      "default": {
        "$value": "{palette.neutral.400}",
        "$extensions": { "mode": { "light": "{palette.neutral.400}", "dark": "{palette.neutral.600}" } }
      },
      "strong": {
        "$value": "{palette.neutral.600}",
        "$extensions": { "mode": { "light": "{palette.neutral.600}", "dark": "{palette.neutral.400}" } }
      }
    },
    "semantic": {
      "success": {
        "$value": "{palette.success.700}",
        "$extensions": { "mode": { "light": "{palette.success.700}", "dark": "{palette.success.300}" } }
      },
      "warning": {
        "$value": "{palette.warning.700}",
        "$extensions": { "mode": { "light": "{palette.warning.700}", "dark": "{palette.warning.300}" } }
      },
      "error": {
        "$value": "{palette.error.700}",
        "$extensions": { "mode": { "light": "{palette.error.700}", "dark": "{palette.error.300}" } }
      },
      "info": {
        "$value": "{palette.info.700}",
        "$extensions": { "mode": { "light": "{palette.info.700}", "dark": "{palette.info.300}" } }
      }
    },
    "data": {
      "1": {
        "$value": { "colorSpace": "srgb", "components": [0.8275, 0.4431, 0.0275], "hex": "#d37107" },
        "$extensions": {
          "mode": {
            "light": { "colorSpace": "srgb", "components": [0.8275, 0.4431, 0.0275], "hex": "#d37107" },
            "dark": { "colorSpace": "srgb", "components": [0.9882, 0.7529, 0.2078], "hex": "#fcc035" }
          }
        }
      },
      "2": {
        "$value": { "colorSpace": "srgb", "components": [0.1608, 0.5843, 0.8392], "hex": "#2995d6" },
        "$extensions": {
          "mode": {
            "light": { "colorSpace": "srgb", "components": [0.1608, 0.5843, 0.8392], "hex": "#2995d6" },
            "dark": { "colorSpace": "srgb", "components": [0.4549, 0.8078, 1], "hex": "#74ceff" }
          }
        }
      },
      "3": {
        "$value": { "colorSpace": "srgb", "components": [0.0588, 0.4863, 0.302], "hex": "#0f7c4d" },
        "$extensions": {
          "mode": {
            "light": { "colorSpace": "srgb", "components": [0.0588, 0.4863, 0.302], "hex": "#0f7c4d" },
            "dark": { "colorSpace": "srgb", "components": [0.0314, 0.7176, 0.3961], "hex": "#08b765" }
          }
        }
      },
      "4": {
        "$value": { "colorSpace": "srgb", "components": [0.6314, 0.5451, 0.3804], "hex": "#a18b61" },
        "$extensions": {
          "mode": {
            "light": { "colorSpace": "srgb", "components": [0.6314, 0.5451, 0.3804], "hex": "#a18b61" },
            "dark": { "colorSpace": "srgb", "components": [1, 0.9804, 0.4157], "hex": "#fffa6a" }
          }
        }
      },
      "5": {
        "$value": { "colorSpace": "srgb", "components": [0.0392, 0.3373, 0.5569], "hex": "#0a568e" },
        "$extensions": {
          "mode": {
            "light": { "colorSpace": "srgb", "components": [0.0392, 0.3373, 0.5569], "hex": "#0a568e" },
            "dark": { "colorSpace": "srgb", "components": [0.0471, 0.4627, 0.9059], "hex": "#0c76e7" }
          }
        }
      },
      "6": {
        "$value": { "colorSpace": "srgb", "components": [0.749, 0.302, 0.0275], "hex": "#bf4d07" },
        "$extensions": {
          "mode": {
            "light": { "colorSpace": "srgb", "components": [0.749, 0.302, 0.0275], "hex": "#bf4d07" },
            "dark": { "colorSpace": "srgb", "components": [0.749, 0.3412, 0.102], "hex": "#bf571a" }
          }
        }
      },
      "7": {
        "$value": { "colorSpace": "srgb", "components": [0.7608, 0.4118, 0.702], "hex": "#c269b3" },
        "$extensions": {
          "mode": {
            "light": { "colorSpace": "srgb", "components": [0.7608, 0.4118, 0.702], "hex": "#c269b3" },
            "dark": { "colorSpace": "srgb", "components": [0.7882, 0.549, 0.7373], "hex": "#c98cbc" }
          }
        }
      },
      "8": {
        "$value": { "colorSpace": "srgb", "components": [0.498, 0.498, 0.498], "hex": "#7f7f7f" },
        "$extensions": {
          "mode": {
            "light": { "colorSpace": "srgb", "components": [0.498, 0.498, 0.498], "hex": "#7f7f7f" },
            "dark": { "colorSpace": "srgb", "components": [0.498, 0.498, 0.498], "hex": "#7f7f7f" }
          }
        }
      },
      "$description": "Okabe–Ito color-blind-safe hues (§M1.6), adjusted per mode so every series is at least 3:1 against surface.default and surface.raised (non-text contrast, WCAG 1.4.11; pairings in core.md §4). Series colors are never text: label every series with text in text.primary."
    },
    "focus": {
      "$value": "{palette.primary.700}",
      "$extensions": { "mode": { "light": "{palette.primary.700}", "dark": "{palette.primary.300}" } }
    }
  },
  "font": {
    "family": {
      "$type": "fontFamily",
      "heading": { "$value": ["Fraunces", "Source Serif 4", "serif"] },
      "body": { "$value": ["Atkinson Hyperlegible", "Verdana", "sans-serif"] },
      "mono": { "$value": ["JetBrains Mono", "ui-monospace", "monospace"] },
      "te": { "$value": ["Noto Sans Telugu", "sans-serif"] },
      "hi": { "$value": ["Noto Sans Devanagari", "sans-serif"] }
    },
    "size": {
      "$type": "dimension",
      "display": { "$value": { "value": 3, "unit": "rem" } },
      "h1": { "$value": { "value": 2.25, "unit": "rem" } },
      "h2": { "$value": { "value": 1.75, "unit": "rem" } },
      "h3": { "$value": { "value": 1.375, "unit": "rem" } },
      "body-lg": { "$value": { "value": 1.125, "unit": "rem" } },
      "body": { "$value": { "value": 1, "unit": "rem" } },
      "caption": { "$value": { "value": 0.875, "unit": "rem" } },
      "overline": { "$value": { "value": 0.75, "unit": "rem" } }
    },
    "weight": {
      "$type": "fontWeight",
      "regular": { "$value": 400 },
      "semibold": { "$value": 600 },
      "bold": { "$value": 700 }
    },
    "line-height": {
      "$type": "number",
      "tight": { "$value": 1.15 },
      "base": { "$value": 1.5 },
      "script": { "$value": 1.7, "$description": "Telugu and Devanagari: taller stacks need more leading (§12)" }
    },
    "tracking": {
      "$type": "dimension",
      "tight": { "$value": { "value": -0.5, "unit": "px" } },
      "normal": { "$value": { "value": 0, "unit": "px" } },
      "wide": { "$value": { "value": 0.5, "unit": "px" } }
    }
  },
  "type": {
    "$type": "typography",
    "display": {
      "$value": {
        "fontFamily": "{font.family.heading}",
        "fontSize": "{font.size.display}",
        "fontWeight": "{font.weight.bold}",
        "lineHeight": "{font.line-height.tight}",
        "letterSpacing": "{font.tracking.tight}"
      },
      "$extensions": {
        "org.design-system.type": {
          "fontFeatures": ["kern", "liga"],
          "fluid": { "min": "{font.size.h1}" },
          "scripts": {
            "te": { "fontFamily": "{font.family.te}", "lineHeight": "{font.line-height.script}" },
            "hi": { "fontFamily": "{font.family.hi}", "lineHeight": "{font.line-height.script}" }
          }
        }
      }
    },
    "h1": {
      "$value": {
        "fontFamily": "{font.family.heading}",
        "fontSize": "{font.size.h1}",
        "fontWeight": "{font.weight.bold}",
        "lineHeight": "{font.line-height.tight}",
        "letterSpacing": "{font.tracking.tight}"
      },
      "$extensions": {
        "org.design-system.type": {
          "fontFeatures": ["kern", "liga"],
          "fluid": { "min": "{font.size.h2}" },
          "scripts": {
            "te": { "fontFamily": "{font.family.te}", "lineHeight": "{font.line-height.script}" },
            "hi": { "fontFamily": "{font.family.hi}", "lineHeight": "{font.line-height.script}" }
          }
        }
      }
    },
    "h2": {
      "$value": {
        "fontFamily": "{font.family.heading}",
        "fontSize": "{font.size.h2}",
        "fontWeight": "{font.weight.semibold}",
        "lineHeight": "{font.line-height.tight}",
        "letterSpacing": "{font.tracking.normal}"
      },
      "$extensions": {
        "org.design-system.type": {
          "fontFeatures": ["kern", "liga"],
          "scripts": {
            "te": { "fontFamily": "{font.family.te}", "lineHeight": "{font.line-height.script}" },
            "hi": { "fontFamily": "{font.family.hi}", "lineHeight": "{font.line-height.script}" }
          }
        }
      }
    },
    "h3": {
      "$value": {
        "fontFamily": "{font.family.heading}",
        "fontSize": "{font.size.h3}",
        "fontWeight": "{font.weight.semibold}",
        "lineHeight": "{font.line-height.tight}",
        "letterSpacing": "{font.tracking.normal}"
      },
      "$extensions": {
        "org.design-system.type": {
          "fontFeatures": ["kern", "liga"],
          "scripts": {
            "te": { "fontFamily": "{font.family.te}", "lineHeight": "{font.line-height.script}" },
            "hi": { "fontFamily": "{font.family.hi}", "lineHeight": "{font.line-height.script}" }
          }
        }
      }
    },
    "body-lg": {
      "$value": {
        "fontFamily": "{font.family.body}",
        "fontSize": "{font.size.body-lg}",
        "fontWeight": "{font.weight.regular}",
        "lineHeight": "{font.line-height.base}",
        "letterSpacing": "{font.tracking.normal}"
      },
      "$extensions": {
        "org.design-system.type": {
          "fontFeatures": ["kern", "liga"],
          "scripts": {
            "te": { "fontFamily": "{font.family.te}", "lineHeight": "{font.line-height.script}" },
            "hi": { "fontFamily": "{font.family.hi}", "lineHeight": "{font.line-height.script}" }
          }
        }
      }
    },
    "body": {
      "$value": {
        "fontFamily": "{font.family.body}",
        "fontSize": "{font.size.body}",
        "fontWeight": "{font.weight.regular}",
        "lineHeight": "{font.line-height.base}",
        "letterSpacing": "{font.tracking.normal}"
      },
      "$extensions": {
        "org.design-system.type": {
          "fontFeatures": ["kern", "liga"],
          "scripts": {
            "te": { "fontFamily": "{font.family.te}", "lineHeight": "{font.line-height.script}" },
            "hi": { "fontFamily": "{font.family.hi}", "lineHeight": "{font.line-height.script}" }
          }
        }
      }
    },
    "caption": {
      "$value": {
        "fontFamily": "{font.family.body}",
        "fontSize": "{font.size.caption}",
        "fontWeight": "{font.weight.regular}",
        "lineHeight": "{font.line-height.base}",
        "letterSpacing": "{font.tracking.normal}"
      },
      "$extensions": {
        "org.design-system.type": {
          "fontFeatures": ["kern", "tnum"],
          "scripts": {
            "te": { "fontFamily": "{font.family.te}", "lineHeight": "{font.line-height.script}" },
            "hi": { "fontFamily": "{font.family.hi}", "lineHeight": "{font.line-height.script}" }
          }
        }
      }
    },
    "overline": {
      "$value": {
        "fontFamily": "{font.family.body}",
        "fontSize": "{font.size.overline}",
        "fontWeight": "{font.weight.semibold}",
        "lineHeight": "{font.line-height.base}",
        "letterSpacing": "{font.tracking.wide}"
      },
      "$extensions": {
        "org.design-system.type": {
          "fontFeatures": ["kern", "liga"],
          "scripts": {
            "te": { "fontFamily": "{font.family.te}", "lineHeight": "{font.line-height.script}" },
            "hi": { "fontFamily": "{font.family.hi}", "lineHeight": "{font.line-height.script}" }
          }
        }
      }
    },
    "label": {
      "$value": {
        "fontFamily": "{font.family.body}",
        "fontSize": "{font.size.caption}",
        "fontWeight": "{font.weight.semibold}",
        "lineHeight": "{font.line-height.tight}",
        "letterSpacing": "{font.tracking.normal}"
      },
      "$extensions": {
        "org.design-system.type": {
          "fontFeatures": ["kern", "tnum"],
          "scripts": {
            "te": { "fontFamily": "{font.family.te}", "lineHeight": "{font.line-height.script}" },
            "hi": { "fontFamily": "{font.family.hi}", "lineHeight": "{font.line-height.script}" }
          }
        }
      }
    }
  },
  "space": {
    "1": { "$value": { "value": 4, "unit": "px" } },
    "2": { "$value": { "value": 8, "unit": "px" } },
    "3": { "$value": { "value": 12, "unit": "px" } },
    "4": { "$value": { "value": 16, "unit": "px" } },
    "6": { "$value": { "value": 24, "unit": "px" } },
    "8": { "$value": { "value": 32, "unit": "px" } },
    "12": { "$value": { "value": 48, "unit": "px" } },
    "$type": "dimension",
    "base": { "$value": "{space.1}" }
  },
  "radius": {
    "$type": "dimension",
    "none": { "$value": { "value": 0, "unit": "px" } },
    "sm": { "$value": { "value": 4, "unit": "px" } },
    "md": { "$value": { "value": 8, "unit": "px" } },
    "lg": { "$value": { "value": 16, "unit": "px" } },
    "full": { "$value": { "value": 9999, "unit": "px" } }
  },
  "border-width": {
    "$type": "dimension",
    "thin": { "$value": { "value": 1, "unit": "px" } },
    "thick": { "$value": { "value": 2, "unit": "px" } }
  },
  "border-style": { "$type": "strokeStyle", "solid": { "$value": "solid" }, "dashed": { "$value": "dashed" } },
  "shadow": {
    "1": {
      "$value": {
        "color": { "colorSpace": "srgb", "components": [0.1098, 0.1059, 0.098], "hex": "#1c1b19", "alpha": 0.08 },
        "offsetX": { "value": 0, "unit": "px" },
        "offsetY": { "value": 1, "unit": "px" },
        "blur": { "value": 2, "unit": "px" },
        "spread": { "value": 0, "unit": "px" }
      },
      "$extensions": {
        "mode": {
          "light": {
            "color": { "colorSpace": "srgb", "components": [0.1098, 0.1059, 0.098], "hex": "#1c1b19", "alpha": 0.08 },
            "offsetX": { "value": 0, "unit": "px" },
            "offsetY": { "value": 1, "unit": "px" },
            "blur": { "value": 2, "unit": "px" },
            "spread": { "value": 0, "unit": "px" }
          },
          "dark": {
            "color": { "colorSpace": "srgb", "components": [0, 0, 0], "hex": "#000000", "alpha": 0.4 },
            "offsetX": { "value": 0, "unit": "px" },
            "offsetY": { "value": 1, "unit": "px" },
            "blur": { "value": 2, "unit": "px" },
            "spread": { "value": 0, "unit": "px" }
          }
        }
      }
    },
    "2": {
      "$value": {
        "color": { "colorSpace": "srgb", "components": [0.1098, 0.1059, 0.098], "hex": "#1c1b19", "alpha": 0.12 },
        "offsetX": { "value": 0, "unit": "px" },
        "offsetY": { "value": 4, "unit": "px" },
        "blur": { "value": 12, "unit": "px" },
        "spread": { "value": 0, "unit": "px" }
      },
      "$extensions": {
        "mode": {
          "light": {
            "color": { "colorSpace": "srgb", "components": [0.1098, 0.1059, 0.098], "hex": "#1c1b19", "alpha": 0.12 },
            "offsetX": { "value": 0, "unit": "px" },
            "offsetY": { "value": 4, "unit": "px" },
            "blur": { "value": 12, "unit": "px" },
            "spread": { "value": 0, "unit": "px" }
          },
          "dark": {
            "color": { "colorSpace": "srgb", "components": [0, 0, 0], "hex": "#000000", "alpha": 0.5 },
            "offsetX": { "value": 0, "unit": "px" },
            "offsetY": { "value": 4, "unit": "px" },
            "blur": { "value": 12, "unit": "px" },
            "spread": { "value": 0, "unit": "px" }
          }
        }
      }
    },
    "3": {
      "$value": {
        "color": { "colorSpace": "srgb", "components": [0.1098, 0.1059, 0.098], "hex": "#1c1b19", "alpha": 0.16 },
        "offsetX": { "value": 0, "unit": "px" },
        "offsetY": { "value": 12, "unit": "px" },
        "blur": { "value": 32, "unit": "px" },
        "spread": { "value": 0, "unit": "px" }
      },
      "$extensions": {
        "mode": {
          "light": {
            "color": { "colorSpace": "srgb", "components": [0.1098, 0.1059, 0.098], "hex": "#1c1b19", "alpha": 0.16 },
            "offsetX": { "value": 0, "unit": "px" },
            "offsetY": { "value": 12, "unit": "px" },
            "blur": { "value": 32, "unit": "px" },
            "spread": { "value": 0, "unit": "px" }
          },
          "dark": {
            "color": { "colorSpace": "srgb", "components": [0, 0, 0], "hex": "#000000", "alpha": 0.6 },
            "offsetX": { "value": 0, "unit": "px" },
            "offsetY": { "value": 12, "unit": "px" },
            "blur": { "value": 32, "unit": "px" },
            "spread": { "value": 0, "unit": "px" }
          }
        }
      }
    },
    "$type": "shadow"
  },
  "state": {
    "$type": "number",
    "$description": "State layers (§4.3): how much of the on-colour is mixed into a fill, or the opacity of a disabled control",
    "hover": { "$value": 0.08 },
    "focus": { "$value": 0.1 },
    "pressed": { "$value": 0.12 },
    "selected": { "$value": 0.16 },
    "dragged": { "$value": 0.16 },
    "disabled": { "$value": 0.38 }
  },
  "opacity": { "$type": "number", "scrim": { "$value": 0.5 }, "muted": { "$value": 0.25 }, "faint": { "$value": 0.2 } },
  "z-index": {
    "$type": "number",
    "base": { "$value": 0 },
    "raised": { "$value": 10 },
    "dropdown": { "$value": 1000 },
    "sticky": { "$value": 1100 },
    "overlay": { "$value": 1300 },
    "modal": { "$value": 1400 },
    "toast": { "$value": 1500 },
    "tooltip": { "$value": 1600 }
  },
  "blur": {
    "$type": "dimension",
    "sm": { "$value": { "value": 4, "unit": "px" } },
    "md": { "$value": { "value": 12, "unit": "px" } },
    "lg": { "$value": { "value": 24, "unit": "px" } }
  },
  "icon": {
    "$type": "dimension",
    "stroke": { "$value": { "value": 1.5, "unit": "px" } },
    "padding": { "$value": { "value": 2, "unit": "px" } },
    "size": {
      "sm": { "$value": { "value": 16, "unit": "px" } },
      "md": { "$value": { "value": 20, "unit": "px" } },
      "lg": { "$value": { "value": 24, "unit": "px" } }
    }
  },
  "motion": {
    "duration": {
      "$type": "duration",
      "instant": { "$value": { "value": 100, "unit": "ms" } },
      "fast": { "$value": { "value": 150, "unit": "ms" } },
      "base": { "$value": { "value": 250, "unit": "ms" } },
      "slow": { "$value": { "value": 400, "unit": "ms" } }
    },
    "ease": {
      "$type": "cubicBezier",
      "standard": { "$value": [0.2, 0, 0, 1] },
      "enter": { "$value": [0, 0, 0, 1] },
      "exit": { "$value": [0.3, 0, 1, 1] }
    }
  },
  "size": {
    "logo": {
      "min": {
        "digital": { "$type": "dimension", "$value": { "value": 24, "unit": "px" } },
        "print-mm": {
          "$type": "number",
          "$value": 10,
          "$description": "Millimetres. DTCG dimensions allow only px and rem, so print sizes are plain numbers in mm."
        }
      }
    },
    "target": {
      "min": {
        "$type": "dimension",
        "$value": { "value": 44, "unit": "px" },
        "$description": "§11 touch target (WCAG 2.5.5 AAA size; 2.5.8 AA floor is 24px, checked by render.mjs)."
      }
    }
  },
  "container": {
    "$type": "dimension",
    "narrow": { "$value": { "value": 480, "unit": "px" } },
    "prose": { "$value": { "value": 720, "unit": "px" } },
    "default": { "$value": { "value": 1120, "unit": "px" } },
    "wide": { "$value": { "value": 1280, "unit": "px" } }
  },
  "density": {
    "$type": "number",
    "$description": "multiplier for space.* inside dense or roomy components (§9)",
    "compact": { "$value": 0.75 },
    "default": { "$value": 1 },
    "comfortable": { "$value": 1.25 }
  },
  "breakpoint": {
    "$type": "dimension",
    "sm": { "$value": { "value": 640, "unit": "px" } },
    "md": { "$value": { "value": 768, "unit": "px" } },
    "lg": { "$value": { "value": 1024, "unit": "px" } },
    "xl": { "$value": { "value": 1280, "unit": "px" } }
  },
  "viewport": {
    "$type": "dimension",
    "$description": "Screenshot and layout-check widths (§M1.3, render.mjs).",
    "mobile": { "$value": { "value": 390, "unit": "px" } },
    "tablet": { "$value": { "value": 768, "unit": "px" } },
    "desktop": { "$value": { "value": 1280, "unit": "px" } }
  },
  "component": {
    "$type": "color",
    "button": {
      "primary": {
        "bg": { "$value": "{color.brand.primary}" },
        "fg": { "$value": "{color.on.primary}" },
        "border": { "$value": "{color.brand.primary}" }
      },
      "secondary": {
        "bg": { "$value": "{color.surface.default}" },
        "fg": { "$value": "{color.brand.primary}" },
        "border": { "$value": "{color.brand.primary}" }
      },
      "ghost": { "fg": { "$value": "{color.brand.primary}" } },
      "danger": {
        "bg": { "$value": "{color.semantic.error}" },
        "fg": { "$value": "{color.on.error}" },
        "border": { "$value": "{color.semantic.error}" }
      },
      "focus": { "$value": "{color.focus}" }
    },
    "input": {
      "bg": { "$value": "{color.surface.default}" },
      "fg": { "$value": "{color.text.primary}" },
      "border": { "$value": "{color.border.strong}" },
      "hint": { "$value": "{color.text.secondary}" },
      "error": { "$value": "{color.semantic.error}" },
      "focus": { "$value": "{color.focus}" }
    },
    "card": {
      "bg": { "$value": "{color.surface.default}" },
      "fg": { "$value": "{color.text.primary}" },
      "border": { "$value": "{color.border.subtle}" },
      "border-hover": { "$value": "{color.border.strong}" },
      "link": { "$value": "{color.brand.primary}" }
    },
    "badge": {
      "bg": { "$value": "{color.surface.default}" },
      "fg": { "$value": "{color.text.primary}" },
      "success": { "$value": "{color.semantic.success}" },
      "warning": { "$value": "{color.semantic.warning}" },
      "error": { "$value": "{color.semantic.error}" },
      "info": { "$value": "{color.semantic.info}" }
    },
    "select": {
      "bg": { "$value": "{color.surface.default}" },
      "fg": { "$value": "{color.text.primary}" },
      "border": { "$value": "{color.border.strong}" },
      "hint": { "$value": "{color.text.secondary}" },
      "error": { "$value": "{color.semantic.error}" },
      "focus": { "$value": "{color.focus}" }
    },
    "textarea": {
      "bg": { "$value": "{color.surface.default}" },
      "fg": { "$value": "{color.text.primary}" },
      "border": { "$value": "{color.border.strong}" },
      "hint": { "$value": "{color.text.secondary}" },
      "error": { "$value": "{color.semantic.error}" },
      "focus": { "$value": "{color.focus}" }
    },
    "checkbox": {
      "bg": { "$value": "{color.surface.default}" },
      "fg": { "$value": "{color.text.primary}" },
      "border": { "$value": "{color.border.strong}" },
      "checked": { "$value": "{color.brand.primary}" },
      "mark": { "$value": "{color.on.primary}" },
      "focus": { "$value": "{color.focus}" }
    },
    "radio": {
      "bg": { "$value": "{color.surface.default}" },
      "fg": { "$value": "{color.text.primary}" },
      "border": { "$value": "{color.border.strong}" },
      "checked": { "$value": "{color.brand.primary}" },
      "mark": { "$value": "{color.on.primary}" },
      "focus": { "$value": "{color.focus}" }
    },
    "switch": {
      "bg": { "$value": "{color.surface.raised}" },
      "fg": { "$value": "{color.text.primary}" },
      "border": { "$value": "{color.border.strong}" },
      "on": { "$value": "{color.brand.primary}" },
      "thumb": { "$value": "{color.on.primary}" },
      "focus": { "$value": "{color.focus}" }
    },
    "alert": {
      "bg": { "$value": "{color.surface.default}" },
      "fg": { "$value": "{color.text.primary}" },
      "border": { "$value": "{color.border.default}" },
      "success": { "$value": "{color.semantic.success}" },
      "warning": { "$value": "{color.semantic.warning}" },
      "error": { "$value": "{color.semantic.error}" },
      "info": { "$value": "{color.semantic.info}" }
    },
    "toast": {
      "bg": { "$value": "{color.surface.raised}" },
      "fg": { "$value": "{color.text.primary}" },
      "border": { "$value": "{color.border.subtle}" },
      "success": { "$value": "{color.semantic.success}" },
      "warning": { "$value": "{color.semantic.warning}" },
      "error": { "$value": "{color.semantic.error}" },
      "info": { "$value": "{color.semantic.info}" }
    },
    "dialog": {
      "bg": { "$value": "{color.surface.overlay}" },
      "fg": { "$value": "{color.text.primary}" },
      "border": { "$value": "{color.border.subtle}" },
      "scrim": { "$value": "{color.surface.inverse}" }
    },
    "tooltip": { "bg": { "$value": "{color.surface.inverse}" }, "fg": { "$value": "{color.text.inverse}" } },
    "avatar": { "bg": { "$value": "{color.container.primary}" }, "fg": { "$value": "{color.on-container.primary}" } },
    "table": {
      "bg": { "$value": "{color.surface.default}" },
      "fg": { "$value": "{color.text.primary}" },
      "border": { "$value": "{color.border.subtle}" },
      "stripe": { "$value": "{color.surface.sunken}" },
      "header": { "bg": { "$value": "{color.surface.raised}" }, "fg": { "$value": "{color.text.primary}" } }
    },
    "tabs": {
      "bg": { "$value": "{color.surface.default}" },
      "fg": { "$value": "{color.text.primary}" },
      "border": { "$value": "{color.border.subtle}" },
      "selected": { "$value": "{color.brand.primary}" },
      "focus": { "$value": "{color.focus}" }
    },
    "nav": {
      "bg": { "$value": "{color.surface.default}" },
      "fg": { "$value": "{color.text.primary}" },
      "border": { "$value": "{color.border.subtle}" },
      "active": { "$value": "{color.brand.primary}" },
      "focus": { "$value": "{color.focus}" }
    }
  }
}
```
