# Nav

<!-- ui-inventory:generated — from design-build/inventory.json by `node design-system/design-build/ui-inventory.mjs`; edit the JSON, not this block -->
| | |
|---|---|
| Status | existing |
| React import | `import { Nav } from '…/design-system/components/react'` |
| HTML/CSS API | `<nav data-component="nav" data-variant="default">` + `components/components.css` |
| Props | `label`, `items` |
| Variants | `default` |
| Used on | [Design board](../screens/preview.md) (`default`; `default`, `focus`, `active`)<br>[Settings](../screens/settings.md) (`default`; `default`, `focus`, `active`) |
<!-- /ui-inventory:generated -->

## Purpose
Nav is a short list of links in the product. One link is the current page. It is also called Navigation. Use Tabs when the panels stay on this page.

## Anatomy
1. **Root**: `<nav data-component="nav" data-variant="default">` with its own `aria-label`.
2. A **list** of links. The current one has `aria-current="page"`.
3. Each link is at least `{size.target.min}` tall.

## Variants
- **default**: the only variant. Current links use `{color.brand.primary}`. The others use `{color.text.primary}`.

## States
| State | What changes |
|---|---|
| default | Underlined links on `{color.surface.default}`, border `{color.border.subtle}`. |
| hover | The underline darkens with the text. The link does not move. |
| focus | A `{color.focus}` outline on `:focus-visible`. |
| active | The current page uses `aria-current="page"`, semibold type, and a `{color.brand.primary}` edge. |
| disabled | n/a. Omit a link that goes nowhere. Do not use an empty href. |
| loading | n/a. |
| error | n/a. |

## Tokens
`{component.nav.bg}`, `{component.nav.fg}`, `{component.nav.border}`, `{component.nav.active}`, `{component.nav.focus}`, `{size.target.min}`, `{space.2}`, `{space.3}`, `{radius.md}`, `{font.weight.semibold}`.

## Motion
None. prefers-reduced-motion does not apply.

## Accessibility
A navigation landmark with a unique label when the page has more than one. Links have visible text and real hrefs to ids or routes, never an empty hash. `aria-current="page"` marks the current item. Targets are at least `{size.target.min}`. Current color is `{color.brand.primary}` on `{color.surface.default}`, which is an allowed text pair, and the underline or edge is there too.

## Responsive
The list wraps. On a phone the links become a stack of full-height targets and the bar stays inside the viewport.

## Do and don't
- **Do** give each nav a distinct `aria-label`.
- **Do** point href at a real id or route.
- **Don't** use it for actions. Use Button.

## References
- **https://developer.mozilla.org/en-US/docs/Web/HTML/Element/nav** and **https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/** (the disclosure pattern is a different widget; we do not use it here).
- Ours is a flat list of links with `{component.nav.*}`.

## Usage
```jsx
import { Nav } from '../design-system/components/react';

<Nav label="Catalog" items={[{ href: '#catalog-actions', label: 'Actions', current: true }, { href: '#catalog-inputs', label: 'Inputs' }]} />
```
