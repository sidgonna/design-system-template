# Textarea

<!-- ui-inventory:generated — from design-build/inventory.json by `node design-system/design-build/ui-inventory.mjs`; edit the JSON, not this block -->
| | |
|---|---|
| Status | existing |
| React import | `import { Textarea } from '…/design-system/components/react'` |
| HTML/CSS API | `<div data-component="textarea" data-variant="default\|error"><label><textarea>` + `components/components.css` |
| Props | `label`, `hint`, `error`, `disabled`, `required`, `rows`, `autoFocus`, `readOnly`, `maxLength`, `minLength` |
| Variants | `default`, `error` |
| Used on | [Design board](../screens/preview.md) (`default`, `error`; `default`, `focus`, `error`)<br>[Form](../screens/form.md) (`error`; `error`, `focus`) |
<!-- /ui-inventory:generated -->

## Purpose
Textarea is the multi-line field. Use Input for one line. Use Textarea for a note, a message, or anything that needs more than one line.

## Anatomy
1. **Root**: `<div data-component="textarea">` with `data-variant` default or error.
2. **Label** for the `<textarea>`.
3. **Hint** and **error** parts, wired with `aria-describedby`.

## Variants
- **default**: resting field, same field rules as Input, with its own `{component.textarea.*}` tokens.
- **error**: thicker `{color.semantic.error}` border, `aria-invalid`, the message, and one shake.

## States
| State | What changes |
|---|---|
| default | Text `{color.text.primary}` on `{color.surface.default}`. The box is about three times `{size.target.min}` tall. |
| hover | n/a. Hover does not move or recolor the field. |
| focus | A `{color.focus}` ring on `:focus-visible`. |
| active | n/a. Typing is the native caret, not an active style. |
| disabled | `{state.disabled}` opacity and a not-allowed cursor. |
| loading | n/a. The field does not load remote text. |
| error | The error variant. The message stays after the shake. |

## Tokens
`{component.textarea.bg}`, `{component.textarea.fg}`, `{component.textarea.border}`, `{component.textarea.hint}`, `{component.textarea.error}`, `{component.textarea.focus}`, `{space.2}`, `{space.3}`, `{radius.sm}`, `{font.size.caption}`, `{motion.duration.fast}`, `{motion.duration.slow}`.

## Motion
The error shake is `ds-shake` for `{motion.duration.slow}`. Focus is color only, `{motion.duration.fast}`. prefers-reduced-motion sets the shake to none. The error text still appears.

## Accessibility
Native textarea, visible label, `aria-invalid` and `aria-describedby` when there is an error. Focus ring `{color.focus}`. Do not use the placeholder as the label.

## Responsive
Width is at most the field measure and at most 100% of the parent. The box grows with `rows`. It does not set a fixed page width.

## Do and don't
- **Do** use it for more than one line, with a real label.
- **Don't** use it for a single short value. Use Input.
- **Don't** clear the text when you show an error.

## References
- **https://developer.mozilla.org/en-US/docs/Web/HTML/Element/textarea**
- Ours is the same element, styled with `{component.textarea.*}` and the same hint and error parts as Input.

## Usage
```jsx
import { Textarea } from '../design-system/components/react';

<Textarea label="Note" rows={4} error={noteError} />
```
