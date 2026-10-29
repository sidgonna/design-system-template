# Toast

<!-- ui-inventory:generated — from design-build/inventory.json by `node design-system/design-build/ui-inventory.mjs`; edit the JSON, not this block -->
| | |
|---|---|
| Status | existing |
| React import | `import { Toast } from '…/design-system/components/react'` |
| HTML/CSS API | `<div data-component="toast" data-variant="success\|warning\|error\|info">` + `components/components.css` |
| Props | `variant`, `title`, `float`, `onDismiss` |
| Variants | `success`, `warning`, `error`, `info` |
| Used on | [Design board](../screens/preview.md) (`success`, `warning`, `error`, `info`; `default`, `success`, `error`) |
<!-- /ui-inventory:generated -->

## Purpose
Toast is a short status the user can dismiss: saved, a warning, an error, or a note. On the board it sits in the page. Apps may set `data-float` to pin one to the corner.

## Anatomy
1. **Root**: `<div data-component="toast" role="status">` and a variant.
2. **Text** with a strong status word.
3. **Close** (`data-part="dismiss"`), at least `{size.target.min}`, labelled Close.

## Variants
- **success**: starting border `{color.semantic.success}`.
- **warning**: starting border `{color.semantic.warning}`.
- **error**: starting border `{color.semantic.error}`.
- **info**: starting border `{color.semantic.info}`.

## States
| State | What changes |
|---|---|
| default | Text `{color.text.primary}` on `{color.surface.raised}`, shadow `{shadow.2}`. |
| hover | n/a on the toast body. The Close button uses its own focus ring. |
| focus | Close shows a `{color.focus}` outline. |
| active | n/a. Close is a button press without a scale. |
| disabled | n/a. Dismiss it instead of disabling it. |
| loading | n/a. Show the toast when the work finishes. The Button shows the wait. |
| error | The error variant. The word Error is in the text. |

## Tokens
`{component.toast.bg}`, `{component.toast.fg}`, `{component.toast.border}`, `{component.toast.success}`, `{component.toast.warning}`, `{component.toast.error}`, `{component.toast.info}`, `{shadow.2}`, `{z-index.toast}`, `{space.2}`, `{space.4}`, `{size.target.min}`, `{color.focus}`.

## Motion
No entrance. `data-float` only sets position and `{z-index.toast}`. prefers-reduced-motion has nothing moving. Dismiss hides the toast.

## Accessibility
`role="status"` so a new toast is polite, not an interruption. Close is a real button named Close, at least `{size.target.min}`. Focus returns to the page when it hides. The status word is text.

## Responsive
In flow, the toast uses the container width. Floated, it is at most the field measure and inset by `{space.4}`, so it stays on a phone.

## Do and don't
- **Do** keep the copy to one sentence and offer Close.
- **Don't** float a stack of toasts on the design board. Leave `data-float` off there.
- **Don't** use a toast for a field error. Use the field's error.

## References
- **https://www.w3.org/WAI/ARIA/apg/patterns/alert/** covers the live message. A toast is that pattern plus dismiss.
- Ours stays in flow unless `data-float` is set, and it uses `{component.toast.*}`.

## Usage
```jsx
import { Toast } from '../design-system/components/react';

<Toast variant="success" title="Success.">Saved.</Toast>
```
