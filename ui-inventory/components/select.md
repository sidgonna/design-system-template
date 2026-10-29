# Select

<!-- ui-inventory:generated — from design-build/inventory.json by `node design-system/design-build/ui-inventory.mjs`; edit the JSON, not this block -->
| | |
|---|---|
| Status | existing |
| React import | `import { Select } from '…/design-system/components/react'` |
| HTML/CSS API | `<div data-component="select" data-variant="default\|error"><label><select>` + `components/components.css` |
| Props | `label`, `hint`, `error`, `disabled`, `required`, `autoFocus` |
| Variants | `default`, `error` |
| Used on | [Design board](../screens/preview.md) (`default`, `error`; `default`, `focus`, `error`, `disabled`)<br>[Form](../screens/form.md) (`default`; `default`, `focus`) |
<!-- /ui-inventory:generated -->

## Purpose
Select asks for one choice from a short list. Use it when the options are known. Use Radio when there are only two or three and they should all be visible.

## Anatomy
1. **Root**: `<div data-component="select">` with `data-variant` of default or error.
2. **Label**: a `<label for>` naming the `<select>`.
3. **Control**: a native `<select>` and its `<option>` elements.
4. **Hint** (`data-part="hint"`) and **error** (`data-part="error"`), linked with `aria-describedby`.

## Variants
- **default**: resting field. Fill `{color.surface.default}`, text `{color.text.primary}`, border `{color.border.strong}`.
- **error**: `aria-invalid`, a `{color.semantic.error}` border, and the error text under the field. The field shakes once.

## States
| State | What changes |
|---|---|
| default | The default variant colors, at least `{size.target.min}` tall. |
| hover | n/a. The native menu supplies its own hover. The field does not lift. |
| focus | A `{color.focus}` ring and border, on `:focus-visible`. |
| active | n/a. Opening the menu is the native control, not a separate active style. |
| disabled | The disabled attribute sets `{state.disabled}` opacity and a not-allowed cursor. |
| loading | n/a. Options are in the page. There is no spinner. |
| error | The error variant. The message says how to fix it. Color is not the only signal. |

## Tokens
- **Color:** `{component.select.bg}`, `{component.select.fg}`, `{component.select.border}`, `{component.select.hint}`, `{component.select.error}`, `{component.select.focus}`.
- **Space:** `{space.1}`, `{space.2}`, `{space.3}`, `{space.12}`.
- **Shape:** `{radius.sm}`, `{border-width.thin}`, `{border-width.thick}`.
- **Type:** `{font.weight.semibold}`, `{font.size.caption}`.
- **Motion:** `{motion.duration.fast}`, `{motion.duration.slow}`, `{motion.ease.standard}`.

## Motion
Focus changes border and shadow only, over `{motion.duration.fast}`. Entering error plays `ds-shake` for `{motion.duration.slow}`. Under prefers-reduced-motion the shake is removed and the error border and message remain.

## Accessibility
A native select, so the keyboard opens the platform menu. The label is always visible. The hint and error share `aria-describedby`. Error sets `aria-invalid`. The focus ring uses `{color.focus}` on `{color.surface.default}`. The target is at least `{size.target.min}`.

## Responsive
The field is `min(100%, a measure from {space.12})`, so it shrinks on a narrow page and never forces the page to scroll sideways. The menu is the platform menu.

## Do and don't
- **Do** keep the label visible and list real options.
- **Do** put the error in text, not in the border alone.
- **Don't** use a placeholder option as the only label.
- **Don't** build a custom listbox when a native select is enough.

## References
- **https://developer.mozilla.org/en-US/docs/Web/HTML/Element/select** and **https://www.w3.org/WAI/ARIA/apg/patterns/combobox/** are the pattern, not the code.
- Ours uses a native select, `data-component="select"`, and `{component.select.*}` tokens. No popup library.

## Usage
```jsx
import { Select } from '../design-system/components/react';

<Select label="Plan" error={planError}>
  <option value="">Choose</option>
  <option>Basic</option>
  <option>Plus</option>
</Select>
```
