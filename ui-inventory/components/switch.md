# Switch

<!-- ui-inventory:generated — from design-build/inventory.json by `node design-system/design-build/ui-inventory.mjs`; edit the JSON, not this block -->
| | |
|---|---|
| Status | existing |
| React import | `import { Switch } from '…/design-system/components/react'` |
| HTML/CSS API | `<button data-component="switch" data-variant="default" role="switch">` + `components/components.css` |
| Props | `label`, `checked`, `defaultChecked`, `disabled` |
| Variants | `default` |
| Used on | [Design board](../screens/preview.md) (`default`; `default`, `focus`, `disabled`)<br>[Settings](../screens/settings.md) (`default`; `default`, `focus`) |
<!-- /ui-inventory:generated -->

## Purpose
Switch is a setting that takes effect as soon as it changes, such as Email receipts. Use Checkbox in a form that saves later. It is not a Button: it uses `role="switch"`.

## Anatomy
1. **Root**: `<button type="button" data-component="switch" data-variant="default" role="switch">` with `aria-checked`.
2. **Track** (`data-part="track"`) and **thumb** (`data-part="thumb"`), hidden from the name.
3. **Label** (`data-part="label"`) is the accessible name.

## Variants
- **default**: the only variant. On and off are `aria-checked`, not variants.

## States
| State | What changes |
|---|---|
| default | Off. Track uses `{color.surface.raised}`. Thumb uses `{color.text.primary}`. |
| hover | A `{state.hover}` mix of the label color over the track. Nothing moves. |
| focus | A `{color.focus}` outline on `:focus-visible`. |
| active | A `{state.pressed}` mix on press. The thumb does not travel with a transform. |
| disabled | The disabled attribute and `{state.disabled}` opacity. |
| loading | n/a. The setting is local until the form saves. |
| error | n/a. Explain a failed save in an Alert or Toast. |

## Tokens
`{component.switch.bg}`, `{component.switch.fg}`, `{component.switch.border}`, `{component.switch.on}`, `{component.switch.thumb}`, `{component.switch.focus}`, `{state.hover}`, `{state.pressed}`, `{state.disabled}`, `{size.target.min}`, `{icon.size.sm}`, `{icon.size.lg}`, `{motion.duration.fast}`.

## Motion
Color fades only, for `{motion.duration.fast}`. The thumb jumps to the end of the track when checked. It does not animate position. prefers-reduced-motion keeps the color fade, which is within `{motion.duration.fast}`, and still does not move the thumb.

## Accessibility
A button with `role="switch"` and `aria-checked`. Space and Enter toggle it. The visible label is the name. Do not add `data-component="button"`. `createSwitch` sets `data-wired` so `mount` does not toggle twice. Target size is at least `{size.target.min}`.

## Responsive
The control is inline and wraps with surrounding text. The track stays on one line inside the button. The label may wrap.

## Do and don't
- **Do** use it for a setting that applies immediately, and keep the label stable.
- **Don't** use it as a primary action. Use Button.
- **Don't** change the label between on and off.

## References
- **https://www.w3.org/WAI/ARIA/apg/patterns/switch/**
- Ours is one button, not a checkbox styled as a switch, and it uses `{component.switch.*}` only.

## Usage
```jsx
import { Switch } from '../design-system/components/react';

<Switch label="Email receipts" checked={on} onClick={() => setOn(!on)} />
```
