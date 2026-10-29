# Tooltip

<!-- ui-inventory:generated — from design-build/inventory.json by `node design-system/design-build/ui-inventory.mjs`; edit the JSON, not this block -->
| | |
|---|---|
| Status | existing |
| React import | `import { Tooltip } from '…/design-system/components/react'` |
| HTML/CSS API | `<span data-component="tooltip" data-variant="default" role="tooltip" hidden>` + `components/components.css` |
| Props | `tip` |
| Variants | `default` |
| Used on | [Design board](../screens/preview.md) (`default`; `default`, `focus`) |
<!-- /ui-inventory:generated -->

## Purpose
Tooltip is a short hint on hover or keyboard focus. It is not for text the user must read to finish the task. Put that text in the page.

## Anatomy
1. **Host**: `data-part="tip-host"` around the trigger.
2. **Trigger**: a button or other focusable control.
3. **Tip**: `<span data-component="tooltip" data-variant="default" role="tooltip" hidden>` until `data-open`.

## Variants
- **default**: `{color.text.inverse}` on `{color.surface.inverse}`.

## States
| State | What changes |
|---|---|
| default | Hidden. `hidden` and no `data-open`, so it is not visible and not described. |
| hover | Pointer enter sets `data-open` and shows the tip. Leave hides it. |
| focus | Focus in the host shows the tip and sets `aria-describedby`. Blur hides it. |
| active | n/a. Escape dismisses it and leaves focus on the trigger. |
| disabled | n/a. Do not describe a control the user cannot use. |
| loading | n/a. |
| error | n/a. Do not put an error only in a tooltip. |

## Tokens
`{component.tooltip.bg}`, `{component.tooltip.fg}`, `{z-index.tooltip}`, `{space.1}`, `{space.2}`, `{space.3}`, `{radius.sm}`, `{font.size.caption}`.

## Motion
No animation. It appears and disappears. prefers-reduced-motion is unchanged because nothing moves. The tip uses `{z-index.tooltip}` so it paints above nearby content.

## Accessibility
`role="tooltip"`. It starts hidden, and `aria-describedby` is set only while it is open, so a hidden tip is not referenced. Escape closes it. The trigger still has its own name. Do not put essential instructions only in the tip.

## Responsive
The tip is at most a short measure and sits above the trigger. On a narrow page it stays within the host's inline start and does not widen the page.

## Do and don't
- **Do** keep it to a few words.
- **Don't** open it on page load.
- **Don't** override `[hidden]` with `display` except to keep it hidden.

## References
- **https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/**
- Ours is a span, not a library popup, shown from focus and hover, styled with `{component.tooltip.*}`.

## Usage
```jsx
import { Tooltip, Button } from '../design-system/components/react';

<Tooltip tip="Window seats face the water."><Button variant="secondary">Seat info</Button></Tooltip>
```
