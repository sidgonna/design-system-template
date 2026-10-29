# Table

<!-- ui-inventory:generated — from design-build/inventory.json by `node design-system/design-build/ui-inventory.mjs`; edit the JSON, not this block -->
| | |
|---|---|
| Status | existing |
| React import | `import { Table } from '…/design-system/components/react'` |
| HTML/CSS API | `<div data-component="table" data-variant="default"><table>` + `components/components.css` |
| Props | `caption` |
| Variants | `default` |
| Used on | [Design board](../screens/preview.md) (`default`; `default`)<br>[Data table](../screens/table.md) (`default`; `default`) |
<!-- /ui-inventory:generated -->

## Purpose
Table shows rows of the same kind of thing. It has a caption, column headers, and it scrolls inside itself on a narrow page.

## Anatomy
1. **Root**: `<div data-component="table" data-variant="default" role="region" tabindex="0">` with an accessible name.
2. **Caption** on the `<table>`.
3. **Header cells** with `scope="col"`.
4. **Body rows**. Even rows use the stripe fill.

## Variants
- **default**: the only variant. `{color.text.primary}` on `{color.surface.default}`. Header text on `{color.surface.raised}`.

## States
| State | What changes |
|---|---|
| default | Hairline `{color.border.subtle}` rules. Even rows use `{color.surface.sunken}`. |
| hover | n/a. Rows do not highlight on hover. |
| focus | The scroll region can take focus so a keyboard user can scroll it. `:focus-visible` uses the page focus ring. |
| active | n/a. It is not pressed. |
| disabled | n/a. |
| loading | n/a. Show an empty state or a Button loading state while rows are fetched. |
| error | n/a inside the table. Say what failed in an Alert above it. |

## Tokens
`{component.table.bg}`, `{component.table.fg}`, `{component.table.border}`, `{component.table.stripe}`, `{component.table.header.bg}`, `{component.table.header.fg}`, `{space.2}`, `{space.3}`, `{space.12}`, `{radius.md}`.

## Motion
None. Scrolling is the user's action. prefers-reduced-motion does not apply.

## Accessibility
A real table with a caption and `th scope="col"`. The wrapper is a named region and `tabindex="0"` so the scrollable area is in the tab order when the table is wider than the page. Text on the header and on the stripe meets the text contrast pairs.

## Responsive
The wrapper is `max-inline-size: 100%` and `overflow-x: auto`, with `min-inline-size: 0` so a grid parent can shrink. The table itself is at least eight times `{space.12}` wide, and scrolls inside the wrapper instead of widening the page.

## Do and don't
- **Do** write a caption and header cells.
- **Don't** use a table for layout.
- **Don't** let the table widen the page. The scroll stays on the wrapper.

## References
- **https://www.w3.org/WAI/ARIA/apg/patterns/table/**
- Ours is a native table plus a scroll region, styled with `{component.table.*}`.

## Usage
```jsx
import { Table } from '../design-system/components/react';

<Table caption="Sailings today">
  <thead><tr><th scope="col">Plan</th><th scope="col">Time</th></tr></thead>
  <tbody><tr><td>Basic</td><td>09:00</td></tr></tbody>
</Table>
```
