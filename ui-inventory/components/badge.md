# Badge

<!-- ui-inventory:generated — from design-build/inventory.json by `node design-system/design-build/ui-inventory.mjs`; edit the JSON, not this block -->
| | |
|---|---|
| Status | existing |
| React import | `import { Badge } from '…/design-system/components/react'` |
| HTML/CSS API | `<span data-component="badge" data-variant="…">` + `components/components.css` |
| Props | `variant`, `live` |
| Variants | `neutral`, `success`, `warning`, `error`, `info` |
| Used on | [Design board](../screens/preview.md) (`neutral`, `success`, `warning`, `error`, `info`; `default`) |
<!-- /ui-inventory:generated -->

## Purpose
A short, non-interactive status label next to the thing it describes, such as "Active", "Overdue" or "Beta". It's read, not clicked. Use a Button for a removable or clickable chip. Use a Toast or inline message for anything longer than two or three words.

## Anatomy
1. **Root** `data-component="badge"`, `data-variant`: an inline `<span>` with padding `{space.1}` `{space.2}`, radius `{radius.sm}`, and a `{border-width.thin}` border in `currentColor`.
2. **Dot** (`::before`): a `{space.2}` circle in `currentColor`. It's decorative.
3. **Text**: `{font.size.caption}`, `{font.weight.semibold}`. The text carries the meaning.

## Variants
- **neutral**: `{color.text.primary}` on `{color.surface.default}`, for counts, categories and "Draft".
- **success**: `{color.semantic.success}`, for done, active and paid.
- **warning**: `{color.semantic.warning}`, for needs attention, expiring and pending.
- **error**: `{color.semantic.error}`, for failed, overdue and blocked.
- **info**: `{color.semantic.info}`, for new, beta and informational.

Each color applies to the text, dot and border, always on `{color.surface.default}`. The pairings stay within the tested §4 list in light and dark.

## States
| State | What changes |
|---|---|
| default | The variant color. It pops in once when inserted. |
| hover | n/a. It isn't interactive, so it has no hover style (a hover style would suggest it can be clicked). |
| focus | n/a. It isn't focusable. To explain a badge, put the explanation in visible text or the surrounding label, not a tooltip on the badge. |
| active | n/a. |
| disabled | n/a. Use neutral with text such as "Inactive", not a grayed-out badge. |
| loading | n/a. Use neutral "Pending…" text, or a loading Button elsewhere. |
| error | The **error** variant is the error state. Its text names the problem ("Failed", "Overdue"). |

## Tokens
- **Color:**
  - `{color.text.primary}`
  - `{color.surface.default}`
  - `{color.semantic.success}`
  - `{color.semantic.warning}`
  - `{color.semantic.error}`
  - `{color.semantic.info}`
- **Space:** `{space.1}`, `{space.2}`.
- **Shape:** `{radius.sm}`, `{radius.full}` (dot), `{border-width.thin}`.
- **Type:** `{font.size.caption}`, `{font.weight.semibold}`, `{font.line-height.tight}`.
- **Motion:** `{motion.duration.fast}`, `{motion.ease.enter}`.

## Motion
| Movement | Trigger | How | Tokens | Reduced motion |
|---|---|---|---|---|
| Pop-in | inserted into the DOM | `ds-pop`: opacity 0 → 1 and scale 0.8 → 1, with fill `backwards` | `{motion.duration.fast}`, `{motion.ease.enter}` | No scale: an opacity fade (`ds-fade`) of `{motion.duration.fast}`. |

When a status changes in place (for example, Pending to Paid), call `replay(el)` from `components/index.js` so the change is noticed. Announce it too, if it matters (see Accessibility).

## Accessibility
- **Meaning:** the text carries it. The color and dot only reinforce it (WCAG 1.4.1), so "Overdue" stays readable in grayscale.
- **Role:** none by default, because it's plain text in a `<span>`. Don't add `role="status"` to every badge. For one badge whose status changes while the user is on the page and matters (Saving → Saved, Online → Offline), set `live` (React) or `createBadge({ live: true })`: it gets `role="status"`, so the new text is announced politely. Otherwise announce it once through a live region, such as a Toast.
- **Hidden context:** for counts, add hidden text, such as `<Badge>3<span data-part="visually-hidden"> unread</span></Badge>`.
- **Contrast pairings** (core.md §4, normal text, checked in light and dark):
  - `{color.text.primary}` on `{color.surface.default}`
  - `{color.semantic.success}` on `{color.surface.default}`
  - `{color.semantic.warning}` on `{color.surface.default}`
  - `{color.semantic.error}` on `{color.surface.default}`
  - `{color.semantic.info}` on `{color.surface.default}`

  A tinted badge fill would need new pairings first.

## Responsive
The badge stays inline and never wraps within itself (two or three words). In tight rows on mobile, it moves below the title instead of truncating it. Badges don't scale with the viewport. They follow the body caption size.

## Do and don't
- **Do:**
  - Use one or two words in sentence case.
  - Map each status to one variant across the whole product.
  - Put the badge after the thing it describes.
- **Don't:**
  - Make badges clickable.
  - Use color without text.
  - Stack more than two badges on one item.
  - Invent new colors outside the five variants.

## References
Searched separately for this component (the per-component seeds, design.md §16 Phase 2c):
- **https://21st.dev/community/components/serafimcloud/status-badge** (MIT, "inspired by Tremor": https://blocks.tremor.so)
  - Borrowed: the status pill pattern, with a leading indicator and a label.
  - Ours: a CSS `::before` dot instead of an icon dependency, and colors from the semantic tokens.
- **https://21st.dev/community/components/sean0205/badge-variants** (license unclear: pattern only)
  - Borrowed: a set of variants named by intent.
  - Ours: the five intents, mapped to `{color.semantic.success}` and the other semantic tokens.
- **https://21st.dev/community/components/edwinvakayil/status-dot** (no license: pattern only)
  - Borrowed: a status dot.
  - Ours: a static dot. It doesn't pulse, because constant motion distracts (core.md §10).
- **https://ui.shadcn.com/docs/components/badge**
  - Borrowed: the variant set (default, secondary, destructive, outline).
  - Ours: outlined only, on `{color.surface.default}`, so every color pairing is a tested §4 pairing.
- **https://component.gallery/components/badge/**
  - Borrowed: 123 examples, also called Tag, Label or Chip. They agree that badges are short and non-interactive.
  - Ours: follows that.
- **https://design-system.service.gov.uk/components/tag/**
  - Borrowed: tags show status, aren't links, and use one or two words.
  - Ours: follows that.
- **https://kokonutui.com/docs/components/particle-button** and **https://styles.refero.design/**
  - Kokonut UI has no badge component, so nothing is borrowed. Refero contributes styling cues only (outlined versus filled tags in real products).

Patterns only, never pasted code: see `design-build/references/21st-dev.md`.

## Usage
```jsx
import { Badge } from '../design-system/components/react';

<Badge variant="success">Paid</Badge>
<Badge variant="warning">Expiring</Badge>
<Badge variant="error">Overdue</Badge>
<Badge>Draft</Badge>
```

```html
<span data-component="badge" data-variant="success">Paid</span>
```
