# Card

<!-- ui-inventory:generated — from design-build/inventory.json by `node design-system/design-build/ui-inventory.mjs`; edit the JSON, not this block -->
| | |
|---|---|
| Status | existing |
| React import | `import { Card } from '…/design-system/components/react'` |
| HTML/CSS API | `<article data-component="card" data-variant="…" [data-interactive]>` + `components/components.css` |
| Props | `variant`, `interactive` |
| Variants | `flat`, `raised` |
| Used on | [Design system preview](../screens/preview.md) (`flat`, `raised`; `default`, `hover`, `focus`) |
<!-- /ui-inventory:generated -->

## Purpose
A surface that groups content about one thing: a project, a plan, an article, a metric. Use a plain section with a heading for a page region that isn't "one entity". Use a Table or a list when the user needs to compare many items row by row.

## Anatomy
1. **Root** `data-component="card"`, `data-variant="flat|raised"`, optionally `data-interactive`: an `<article>` by default (`as` changes the element), with padding `{space.6}` and radius `{radius.lg}`.
2. **Heading**: an `h2` or `h3` in the card, sized `{font.size.h3}`. Use the level the page outline needs.
3. **Body**: any content. The first and last children lose their outer margins.
4. **Action** (optional): one real `<a href>` or `<button>` inside. In an interactive card, that link is the card's single target.

## Variants
- **flat**: `{color.surface.default}` with a `{border-width.thin}` border in `{color.surface.raised}`. The default, for cards in a grid on a plain page.
- **raised**: flat plus `{shadow.2}`, for a card that floats above the page (a highlighted plan, a summary). Dark mode uses the darker §13 dark shadows.

`interactive` (a boolean attribute, not a variant) adds the hover and focus-within lift for cards that lead somewhere.

## States
| State | What changes |
|---|---|
| default | The variant surface. The entrance animation plays once when the card is inserted. |
| hover | Interactive only: lifts by `{space.1}`, gains `{shadow.3}`, and the border turns `{color.text.secondary}`, over `{motion.duration.fast}`. |
| focus | Interactive only: the same lift on `:focus-within` when the inner link has focus. The link shows its own focus ring. |
| active | n/a on the card. The inner link or button handles the press. |
| disabled | n/a. A card isn't a control. Hide or remove an unavailable item's action instead. |
| loading | n/a in the component. Render the card with skeleton text, or put a loading Button in it. |
| error | n/a. Put the error message (Badge or text) inside the card. |

## Tokens
- **Color:** `{color.surface.default}`, `{color.surface.raised}`, `{color.text.primary}`, `{color.text.secondary}`, `{color.brand.primary}` (inner links).
- **Space and size:** `{space.6}`, `{space.4}` (entrance distance), `{space.1}` (lift).
- **Shape:** `{radius.lg}`, `{border-width.thin}`.
- **Elevation:** `{shadow.2}` (raised), `{shadow.3}` (hover).
- **Type:** `{font.size.h3}`.
- **Motion:**
  - `{motion.duration.base}`
  - `{motion.duration.fast}`
  - `{motion.ease.enter}`
  - `{motion.ease.standard}`

## Motion
| Movement | Trigger | How | Tokens | Reduced motion |
|---|---|---|---|---|
| Entrance | inserted into the DOM | `ds-enter`: opacity 0 → 1 and translateY `{space.4}` → 0. `animation-fill-mode: backwards`, so the end state doesn't block the hover transform. | `{motion.duration.base}`, `{motion.ease.enter}` | None. The card appears at once. |
| Hover lift | `:hover` or `:focus-within` (interactive) | translateY minus `{space.1}`, plus `{shadow.3}` | `{motion.duration.fast}`, `{motion.ease.standard}` | No movement. The shadow and border change stays. |

Replay the entrance with `replay(el)` from `components/index.js`, for example after filtering.

## Accessibility
- **Element:** `<article>` for self-contained items. Use `as="section"` or `as="li"` (inside a `<ul>`) for lists of cards, so screen readers announce the count.
- **Structure:** start with a heading, so the card shows up in heading navigation.
- **Interactive cards** (pattern from Inclusive Components): the card isn't focusable and isn't a link. Put one `<a>` on the heading text. To make the whole card clickable, stretch that link with a pseudo-element in your app. Don't wrap the whole card in `<a>`, because screen readers would read everything as one link name. Don't nest other links inside a stretched link.
- **Focus:** `:focus-within` lifts the card, and the link keeps its own `{color.focus}` ring.
- **Contrast pairings** (core.md §4):
  - `{color.text.primary}` on `{color.surface.default}`
  - `{color.text.secondary}` on `{color.surface.default}`
  - `{color.brand.primary}` on `{color.surface.default}` (links)

The border isn't the only boundary: it's decorative, so the 3:1 ui rule doesn't apply. Content and spacing define the card.

## Responsive
The card fills its grid cell. The layout owns the columns: one column on mobile, two on tablet, three or four on desktop (digital-product.md §M1.3). On mobile, keep `{space.6}` padding and don't fix heights. Let text wrap, so translated content never clips. Touch devices get no hover lift, and that's fine: the link is the target.

## Do and don't
- **Do:**
  - Use one card per entity.
  - Put the heading first.
  - Give each card one clear action.
  - Use flat in dense grids and raised to emphasize one card.
- **Don't:**
  - Nest cards in cards.
  - Wrap the whole card in a link or a button.
  - Use the card as a generic page section.
  - Mix raised and flat cards randomly in one grid.

## References
Searched separately for this component (design.md §16.2 components seeds):
- **https://21st.dev/community/components/sean0205/card** (ReUI, MIT)
  - Borrowed: a header, body rows and a footer link as the default composition.
  - Ours: no CardHeader/CardContent subcomponents (plain children), and a token border instead of Tailwind classes.
- **https://21st.dev/community/components/preetsuthar17/card** (HextaUI)
  - Borrowed: elevation as a variant.
  - Ours: two variants (flat, raised) instead of a cva matrix, with shadows from `{shadow.2}` and `{shadow.3}`.
- **https://ui.shadcn.com/docs/components/card**
  - Borrowed: the anatomy vocabulary (title, description, action, content, footer), used in this doc.
  - Ours: doesn't ship a component per part.
- **https://component.gallery/components/card/**
  - Borrowed: the definition "a container for content representing a single entity" (77 examples, also called Tile).
  - Ours: Purpose follows it.
- **https://inclusive-components.design/cards/**
  - Borrowed: one real link on the heading, never a link-wrapped card.
  - Ours: follows it, plus the `:focus-within` lift.
- **https://kokonutui.com/docs/components/card** (Kokonut UI, cards CD-01–17, such as the Metric Card)
  - Borrowed: the hover lift with a deeper shadow on interactive cards.
  - Ours: a `{space.1}` lift on motion tokens, with no gradient or 3D tilt, and it's switched off under reduced motion.
- **https://styles.refero.design/**
  - Borrowed: real-product card density and radius cues only.

Patterns only, never pasted code: see `design-build/references/21st-dev.md`.

## Usage
```jsx
import { Card } from '../design-system/components/react';

<Card>
  <h3>Starter</h3>
  <p>For one project.</p>
</Card>
<Card variant="raised" interactive>
  <h3><a href="/projects/42">Website redesign</a></h3>
  <p>Due Friday</p>
</Card>
```

```html
<article data-component="card" data-variant="raised" data-interactive>
  <h3><a href="/projects/42">Website redesign</a></h3>
  <p>Due Friday</p>
</article>
```
