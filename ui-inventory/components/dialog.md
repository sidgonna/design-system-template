# Dialog

<!-- ui-inventory:generated — from design-build/inventory.json by `node design-system/design-build/ui-inventory.mjs`; edit the JSON, not this block -->
| | |
|---|---|
| Status | existing |
| React import | `import { Dialog } from '…/design-system/components/react'` |
| HTML/CSS API | `<dialog data-component="dialog" data-variant="default">` + `components/components.css` |
| Props | `open`, `title`, `onClose` |
| Variants | `default` |
| Used on | [Design board](../screens/preview.md) (`default`; `default`, `focus`) |
<!-- /ui-inventory:generated -->

## Purpose
Dialog asks for a decision that should interrupt the page, such as confirming a save. It is also the Modal and the Sheet: one native dialog, not three widgets. Use Alert when the message can stay in the page.

## Anatomy
1. **Opener**: a button with `data-dialog-open` pointing at the dialog id, plus `aria-haspopup="dialog"`.
2. **Root**: `<dialog data-component="dialog" data-variant="default">`, labelled by a heading.
3. **Actions** (`data-part="actions"`): Close, and any other buttons. `data-part="close"` calls `close()`.

## Variants
- **default**: the only variant. `{color.text.primary}` on `{color.surface.overlay}`, scrim from `{color.surface.inverse}` at `{opacity.scrim}`.

## States
| State | What changes |
|---|---|
| default | Closed. The user agent hides it, so it is not in the page layout. |
| hover | n/a on the dialog. Buttons inside use Button hover. |
| focus | Native `showModal` moves focus inside. Buttons show their `{color.focus}` ring. |
| active | n/a on the shell. The pressed button uses the Button active color. |
| disabled | n/a. Do not open it until the action is allowed. |
| loading | n/a on the shell. A Button inside may be loading. |
| error | n/a on the shell. Put an Alert inside if the action failed. |

## Tokens
`{component.dialog.bg}`, `{component.dialog.fg}`, `{component.dialog.border}`, `{component.dialog.scrim}`, `{opacity.scrim}`, `{z-index.modal}`, `{z-index.overlay}`, `{container.narrow}`, `{space.6}`, `{radius.lg}`, `{motion.duration.fast}`.

## Motion
When open, the dialog fades in with `ds-fade` for `{motion.duration.fast}`. prefers-reduced-motion removes that fade. The scrim does not move. Closed dialogs are not displayed, so they do not animate on load.

## Accessibility
Native dialog. `showModal` traps focus and Escape closes it. `aria-labelledby` points at the heading. Focus returns to the opener on close. The stylesheet does not set `display`, so a closed dialog stays out of the accessibility tree.

## Responsive
Width is `min(100%, {container.narrow})`, so on a phone it sits inside the viewport with `{space.6}` padding. Actions wrap.

## Do and don't
- **Do** label it and return focus to the opener.
- **Don't** set `display` on the dialog. That would show it while it is closed.
- **Don't** build a second modal widget. Sheet and Modal are aliases of Dialog.

## References
- **https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/**
- Ours is the native element and `{component.dialog.*}`. There is no focus-trap script beyond `showModal`.

## Usage
```jsx
import { Dialog } from '../design-system/components/react';

<Dialog open={open} title="Save settings" onClose={() => setOpen(false)}>
  <p>Keep these choices for the next visit.</p>
</Dialog>
```
