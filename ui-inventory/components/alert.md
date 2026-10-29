# Alert

<!-- ui-inventory:generated — from design-build/inventory.json by `node design-system/design-build/ui-inventory.mjs`; edit the JSON, not this block -->
| | |
|---|---|
| Status | existing |
| React import | `import { Alert } from '…/design-system/components/react'` |
| HTML/CSS API | `<div data-component="alert" data-variant="info\|success\|warning\|error">` + `components/components.css` |
| Props | `variant`, `title`, `live` |
| Variants | `info`, `success`, `warning`, `error` |
| Used on | [Design board](../screens/preview.md) (`info`, `success`, `warning`, `error`; `default`) |
<!-- /ui-inventory:generated -->

## Purpose
Alert is a message that stays in the page: info, success, warning or error. The word names the status. Use Toast for a message the user can dismiss. Use Input's error for a single field.

## Anatomy
1. **Root**: `<div data-component="alert">` and a `data-variant`.
2. **Text**: a paragraph. A strong word (Info, Success, Warning, Error) carries the status.
3. A thick starting border in the status color. The fill stays `{color.surface.default}`.

## Variants
- **info**: starting border `{color.semantic.info}`.
- **success**: starting border `{color.semantic.success}`.
- **warning**: starting border `{color.semantic.warning}`.
- **error**: starting border `{color.semantic.error}`.

## States
| State | What changes |
|---|---|
| default | Text `{color.text.primary}` on `{color.surface.default}`, plus the variant border. |
| hover | n/a. The message is not a control. |
| focus | n/a, unless a link inside it is focused. The alert itself is not tabbed. |
| active | n/a. It is not pressed. |
| disabled | n/a. Hide it or leave it. Do not fade a message the user must read. |
| loading | n/a. It is the result, not the wait. The Button shows loading. |
| error | The error variant. The word Error is in the text, not only the border. |

## Tokens
`{component.alert.bg}`, `{component.alert.fg}`, `{component.alert.border}`, `{component.alert.info}`, `{component.alert.success}`, `{component.alert.warning}`, `{component.alert.error}`, `{space.3}`, `{space.4}`, `{radius.md}`, `{border-width.thick}`.

## Motion
No entrance animation. The message is present when the page paints. prefers-reduced-motion has no movement to remove.

## Accessibility
Static alerts do not use `role="alert"`, so a page of examples stays quiet. Pass `live` on the React wrapper when the message appears after load: error and warning use `role="alert"`, otherwise `role="status"`. Color is never the only signal.

## Responsive
The alert is a row that wraps. It uses the width of its container, up to the pattern measure, and does not overflow the page.

## Do and don't
- **Do** start with a word that names the status.
- **Don't** use color as the only difference between info and error.
- **Don't** use `role="alert"` on a message that was already on the page.

## References
- **https://www.w3.org/WAI/ARIA/apg/patterns/alert/**
- Ours is a static note unless `live` is set, styled only with `{component.alert.*}`.

## Usage
```jsx
import { Alert } from '../design-system/components/react';

<Alert variant="error" title="Error." live>That item was removed.</Alert>
```
