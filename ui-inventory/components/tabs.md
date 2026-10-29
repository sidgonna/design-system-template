# Tabs

<!-- ui-inventory:generated — from design-build/inventory.json by `node design-system/design-build/ui-inventory.mjs`; edit the JSON, not this block -->
| | |
|---|---|
| Status | existing |
| React import | `import { Tabs } from '…/design-system/components/react'` |
| HTML/CSS API | `<div data-component="tabs" data-variant="default" role="tablist">` + `components/components.css` |
| Props | `label`, `tabs`, `value` |
| Variants | `default` |
| Used on | [Design board](../screens/preview.md) (`default`; `default`, `focus`, `active`) |
<!-- /ui-inventory:generated -->

## Purpose
Tabs switch panels in the same page, such as Today and Tomorrow. Use Nav when the choice goes to another page.

## Anatomy
1. **Root**: `<div data-component="tabs" data-variant="default">`.
2. **Tablist** with `aria-label`.
3. **Tabs**: buttons with `role="tab"`, `aria-selected`, `aria-controls`, and roving `tabindex`.
4. **Panels**: `role="tabpanel"`, labelled by the tab. Unselected panels are `hidden`.

## Variants
- **default**: the only variant. The selected tab has a `{color.brand.primary}` edge.

## States
| State | What changes |
|---|---|
| default | Unselected tabs are transparent, with `{color.text.primary}` labels. |
| hover | n/a. Hover does not move the tab. |
| focus | A `{color.focus}` outline on the focused tab. |
| active | The selected tab sets `aria-selected` and a `{color.brand.primary}` border. Arrow keys move it. |
| disabled | n/a. Omit a tab instead of disabling it. |
| loading | n/a. Panel content can include a Button that is loading. |
| error | n/a. Put an error inside the visible panel. |

## Tokens
`{component.tabs.bg}`, `{component.tabs.fg}`, `{component.tabs.border}`, `{component.tabs.selected}`, `{component.tabs.focus}`, `{size.target.min}`, `{space.2}`, `{space.3}`, `{border-width.thick}`.

## Motion
No indicator slide. Selection changes the border color immediately. prefers-reduced-motion has nothing to reduce.

## Accessibility
The tab pattern from the APG: arrow keys, Home and End, and a roving tabindex. `mount` in `components/index.js` adds the keys on the board. The React wrapper does the same and sets `data-wired`. Only the selected panel is shown. Each tab is at least `{size.target.min}`.

## Responsive
The tablist wraps. Tabs do not shrink below `{size.target.min}` and do not force a horizontal page scroll.

## Do and don't
- **Do** keep every panel's content in the page, and hide the rest.
- **Don't** use tabs for a form's steps if the user must finish them in order.
- **Don't** put `data-component="button"` on a tab.

## References
- **https://www.w3.org/WAI/ARIA/apg/patterns/tabs/**
- Ours is buttons in a tablist, not a tab library, styled with `{component.tabs.*}`.

## Usage
```jsx
import { Tabs } from '../design-system/components/react';

<Tabs label="Day" tabs={[{ id: 'today', label: 'Today', panel: 'Three items today.' }, { id: 'next', label: 'Tomorrow', panel: 'Two items tomorrow.' }]} />
```
