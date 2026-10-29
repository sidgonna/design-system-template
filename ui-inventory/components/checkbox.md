# Checkbox

<!-- ui-inventory:generated — from design-build/inventory.json by `node design-system/design-build/ui-inventory.mjs`; edit the JSON, not this block -->
| | |
|---|---|
| Status | existing |
| React import | `import { Checkbox } from '…/design-system/components/react'` |
| HTML/CSS API | `<div data-component="checkbox" data-variant="default"><label><input type="checkbox">` + `components/components.css` |
| Props | `label`, `checked`, `disabled`, `required` |
| Variants | `default` |
| Used on | [Design board](../screens/preview.md) (`default`; `default`, `focus`, `disabled`)<br>[Form](../screens/form.md) (`default`; `default`, `focus`) |
<!-- /ui-inventory:generated -->

## Purpose
Checkbox is one independent choice, on or off. Use Radio when the choices are exclusive. Use Switch for a setting that takes effect immediately.

## Anatomy
1. **Root**: `<div data-component="checkbox" data-variant="default">`.
2. **Label** wrapping a native checkbox, so the hit target includes the words.
3. The box is `{size.target.min}` square. A check drawn in `{color.on.primary}` shows the on state.

## Variants
- **default**: the only variant. Checked and unchecked are states of this variant, not separate variants.

## States
| State | What changes |
|---|---|
| default | Unchecked box. Border `{color.border.strong}` on `{color.surface.default}`. |
| hover | n/a. The label does not lift. |
| focus | A `{color.focus}` outline on the box, `:focus-visible` only. |
| active | n/a. The check appears as soon as the box toggles. Nothing scales. |
| disabled | `{state.disabled}` opacity. The choice cannot be changed. |
| loading | n/a. The choice is local. |
| error | n/a on the box. Put the error on the form or in an Alert. |

## Tokens
`{component.checkbox.bg}`, `{component.checkbox.fg}`, `{component.checkbox.border}`, `{component.checkbox.checked}`, `{component.checkbox.mark}`, `{component.checkbox.focus}`, `{size.target.min}`, `{space.2}`, `{space.3}`, `{radius.sm}`, `{border-width.thick}`.

## Motion
No transform transition and no shake. The check is a static mark. prefers-reduced-motion has nothing to stop.

## Accessibility
Native checkbox inside the label, so click and Space toggle it and the name is the label text. The box is `{size.target.min}` in both axes. Checked is the native checked state, not color alone: the mark is also there.

## Responsive
The row wraps with the label text. The box stays `{size.target.min}` and does not shrink below that.

## Do and don't
- **Do** write the label as the choice itself, such as SMS receipts.
- **Don't** use a checkbox for two exclusive options. Use Radio.
- **Don't** rely on the fill color without the check mark.

## References
- **https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/**
- Ours is a native checkbox, not a div with a role. Styling is `{component.checkbox.*}` only.

## Usage
```jsx
import { Checkbox } from '../design-system/components/react';

<Checkbox label="SMS receipts" name="sms" />
```
