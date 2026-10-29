# Button

<!-- ui-inventory:generated — from design-build/inventory.json by `node design-system/design-build/ui-inventory.mjs`; edit the JSON, not this block -->
| | |
|---|---|
| Status | existing |
| React import | `import { Button } from '…/design-system/components/react'` |
| HTML/CSS API | `<button data-component="button" data-variant="…">` + `components/components.css` |
| Props | `variant`, `loading`, `loadingLabel`, `disabled`, `type`, `form`, `autoFocus` |
| Variants | `primary`, `secondary`, `ghost`, `danger` |
| Used on | [Design board](../screens/preview.md) (`primary`, `secondary`, `ghost`, `danger`; `default`, `hover`, `focus`, `active`, `disabled`, `loading`)<br>[Form](../screens/form.md) (`primary`, `secondary`; `default`, `hover`, `focus`, `active`)<br>[Empty state](../screens/empty.md) (`primary`; `default`, `hover`, `focus`)<br>[Settings](../screens/settings.md) (`primary`; `default`, `hover`, `focus`)<br>[Data table](../screens/table.md) (`secondary`; `default`, `hover`, `focus`) |
<!-- /ui-inventory:generated -->

## Purpose
Starts an action on the current page: submit a form, save, open a dialog, delete. Use a link (`<a href>`) to go somewhere else instead. A link styled as a button is still a link, so keep the element honest. Use a single **primary** button per view, for the main action.

## Anatomy
1. **Root**: a native `<button type="button|submit">` with `data-component="button"` and `data-variant`.
2. **Spinner** (`data-part="spinner"`, optional): a circle shown only while loading. It is `aria-hidden`.
3. **Label** (`data-part="label"`): visible text. It stays the same while loading.

Its parts sit on one row: `inline-flex`, gap `{space.2}`.

## Variants
- **primary**: the main action. Its fill is `{color.brand.primary}` and its label is `{color.text.inverse}`.
- **secondary**: an action next to the primary. It has a `{color.surface.default}` fill, a `{color.brand.primary}` border and a brand label.
- **ghost**: a low-emphasis action, such as Cancel or tertiary toolbar actions. It has a transparent background and border (so it works on any surface) and an underlined brand label, so it still reads as clickable without a fill.
- **danger**: destructive actions, such as Delete or Remove. Its fill is `{color.semantic.error}` and its label is `{color.text.inverse}`. Confirm before the action runs.

A toggle button (APG) uses `aria-pressed`. Pressed buttons take the primary fill, whatever their variant.

## States
| State | What changes |
|---|---|
| default | The variant colors. Border `{border-width.thick}`, radius `{radius.md}`, at least `{size.target.min}` square. |
| hover | Lifts by `{border-width.thin}` (translateY) and gains `{shadow.1}`. Secondary and ghost also fill with `{color.surface.raised}`. The lift takes `{motion.duration.fast}` with `{motion.ease.standard}`. |
| focus | A `{border-width.thick}` outline in `{color.focus}`, offset by `{border-width.thick}`. It shows on `:focus-visible` only, so mouse clicks don't flash a ring. |
| active | Scales to 0.97 and drops the shadow. The transition takes `{motion.duration.instant}`, so the press feels immediate. |
| disabled | Uses the native `disabled` attribute: `{color.surface.raised}` fill, a `{color.text.secondary}` label and border, a not-allowed cursor, and no lift. Prefer keeping the button enabled and explaining in an error message why the action can't run yet. |
| loading | Sets `aria-busy="true"` and `aria-disabled="true"`, NOT `disabled`, so focus stays on the button and screen readers keep it in the tab order. The spinner appears before the label. The label doesn't change. A visually hidden `role="status"` inside the button says `loadingLabel` (default "Loading"), so screen readers hear that it is working. Clicks are ignored. Shows a progress cursor. |
| error | n/a on the button itself. The form or Input shows the error. Re-enable the button after a failed request so the user can retry. |

## Tokens
- **Color:**
  - `{color.brand.primary}`
  - `{color.text.inverse}`
  - `{color.surface.default}`
  - `{color.surface.raised}`
  - `{color.semantic.error}`
  - `{color.text.secondary}`
  - `{color.focus}`
- **Space and size:** `{space.2}`, `{space.4}` (padding and gap), `{size.target.min}`, `{icon.size.sm}` (spinner).
- **Shape:** `{radius.md}`, `{radius.full}` (spinner), `{border-width.thick}`, `{border-width.thin}`.
- **Elevation:** `{shadow.1}`. Dark values come from the core.md §13 dark mode.
- **Type:** `{font.weight.semibold}`, `{font.line-height.tight}`. The size is inherited.
- **Motion:**
  - `{motion.duration.instant}`
  - `{motion.duration.fast}`
  - `{motion.duration.slow}` (one spin is 2 × slow)
  - `{motion.ease.standard}`

## Motion
| Movement | Trigger | How | Tokens | Reduced motion |
|---|---|---|---|---|
| Hover lift | `:hover` | translateY by minus `{border-width.thin}`, plus `{shadow.1}` | `{motion.duration.fast}`, `{motion.ease.standard}` | No movement. The shadow and fill changes stay. |
| Press | `:active` | scale(0.97) | `{motion.duration.instant}` | No scale. |
| Spinner | loading | `ds-spin`, a linear rotation every 2 × `{motion.duration.slow}` | duration | It stops and shows a static quarter arc, so "busy" still reads (with `aria-busy`). |

Color transitions use `{motion.duration.fast}` in every mode. `design-build/motion.mjs` checks that every movement plays and that nothing moves under `prefers-reduced-motion: reduce` (only colour fades of at most `{motion.duration.fast}`, core.md §10).

## Accessibility
- **Element:** a native `<button>`, never a `div` or an `<a href="#">`. Enter and Space activate it for free. Default `type="button"`, so it doesn't submit a form by accident.
- **Name:** the visible label. An icon-only button needs `aria-label`. Don't change the label while toggling `aria-pressed` (WAI-ARIA APG).
- **Loading:** `aria-busy="true"` plus `aria-disabled="true"`, so it keeps focus. `aria-busy` alone is not announced, so the button adds a visually hidden `role="status"` with `loadingLabel` (React prop, or the third argument of `setButtonLoading`). Announce completion in a live region elsewhere, such as a Toast or status text.
- **Focus:** a visible `{color.focus}` ring at 3:1 or better on `{color.surface.default}` and `{color.surface.raised}` (core.md §4, size ui).
- **Target:** at least `{size.target.min}` in both dimensions (WCAG 2.5.8).
- **Contrast pairings** (core.md §4), checked by lint in light and dark:
  - `{color.text.inverse}` on `{color.brand.primary}` (primary)
  - `{color.text.inverse}` on `{color.semantic.error}` (danger)
  - `{color.brand.primary}` on `{color.surface.default}` (secondary and ghost)
  - `{color.brand.primary}` on `{color.surface.raised}` (secondary and ghost hover)
  - `{color.text.secondary}` on `{color.surface.raised}` (disabled)

## Responsive
The button sizes to its label, with a minimum of `{size.target.min}`.

- **Mobile (digital-product.md §M1.3):** stack form actions full-width with `inline-size: 100%` from the layout, not the component. Put the primary action last in the DOM, where the thumb reaches it.
- **Long labels:** they wrap, and the button never truncates them.
- **Touch:** the hover lift doesn't apply on touch. The press scale gives the feedback.

## Do and don't
- **Do:**
  - Write the label as a verb: "Save changes", not "OK".
  - Use one primary button per view.
  - Use danger only for destructive actions, and confirm them.
- **Do** keep a loading button the same width and label, so the layout doesn't jump.
- **Don't:**
  - Disable the submit button to show that a form is invalid. Let the user press it and show the errors.
  - Use a button to navigate. Use a link instead.
  - Put two primary buttons side by side.

## References
Searched separately for this component (the per-component seeds, design.md §16 Phase 2c):
- **https://21st.dev/community/components/sean0205/button-1/loading** (ReUI, MIT)
  - Borrowed: the loading pattern, with a spinner before the label and the button kept in place.
  - Theirs swaps the label to "Submitting…"; ours keeps it unchanged, per the APG. It uses `aria-busy` + `aria-disabled` and plain CSS on token variables, with no Radix, lucide or cva.
- **https://21st.dev/community/components/shadcn/button** (MIT)
  - Borrowed: the variant set (default, secondary, ghost, destructive → primary, secondary, ghost, danger) and the forwarded ref.
  - Ours: no Tailwind classes and no `asChild`. Variants are `data-variant` attributes, so the same CSS works without React.
- **https://ui.shadcn.com/docs/components/button**
  - Borrowed: the cursor note. Tailwind v4 defaults buttons to `cursor: default`.
  - Ours: sets `cursor: pointer`, with not-allowed for disabled and progress for loading.
- **https://component.gallery/components/button/**
  - Borrowed: 118 real design-system examples.
  - Ours: follows their consensus (a real `<button>` with an explicit `type`, and no div or `href="#"` buttons).
- **https://www.w3.org/WAI/ARIA/apg/patterns/button/**
  - Borrowed: Enter and Space activation, and a toggle that uses `aria-pressed` with an unchanged label.
  - Ours: implemented natively by `<button>`.
- **https://kokonutui.com/docs/components/particle-button** (Kokonut UI, BT-01)
  - Borrowed: the idea that an async status button shows progress inside the button.
  - Ours: has no particle burst or success check. Success is announced outside the button, which keeps motion subtle (core.md §10).
- **https://styles.refero.design/**
  - Borrowed: real-product button styling cues only (corner radius and weight across shipped products). It has no per-component pages, so nothing is copied.

Patterns only, never pasted code: see `design-build/references/21st-dev.md`.

## Usage
```jsx
import { Button } from '../design-system/components/react';   // path from src/ to the design-system/ folder

<Button onClick={save}>Save changes</Button>
<Button variant="secondary">Preview</Button>
<Button variant="ghost">Cancel</Button>
<Button variant="danger" onClick={confirmDelete}>Delete project</Button>
<Button type="submit" loading={saving}>Save changes</Button>
```

```html
<link rel="stylesheet" href="design-system/design-build/preview/tokens.css">
<link rel="stylesheet" href="design-system/components/components.css">
<button type="button" data-component="button" data-variant="primary">Save changes</button>
<!-- loading: setButtonLoading(el, true) from design-system/components/index.js adds the spinner and aria-busy -->
```
