# Input

<!-- ui-inventory:generated — from design-build/inventory.json by `node design-system/design-build/ui-inventory.mjs`; edit the JSON, not this block -->
| | |
|---|---|
| Status | existing |
| React import | `import { Input } from '…/design-system/components/react'` |
| HTML/CSS API | `<div data-component="input" data-variant="default\|error"><label><input>` + `components/components.css` |
| Props | `label`, `hint`, `error`, `disabled`, `required`, `type`, `autoComplete`, `inputMode`, `readOnly`, `autoFocus`, `maxLength`, `minLength`, `pattern`, `min`, `max`, `step`, `form`, `spellCheck`, `enterKeyHint` |
| Variants | `default`, `error` |
| Used on | [Design board](../screens/preview.md) (`default`, `error`; `default`, `focus`, `error`)<br>[Form](../screens/form.md) (`default`; `default`, `focus`)<br>[Settings](../screens/settings.md) (`default`; `default`, `focus`)<br>[Data table](../screens/table.md) (`default`; `default`, `focus`) |
<!-- /ui-inventory:generated -->

## Purpose
A labelled single-line text field: name, email, search, numbers. It covers the label, an optional hint, and the inline error message. For long text, use the same API on a `<textarea>`. Choice inputs (select, checkbox, radio) are separate components and aren't built yet.

## Anatomy
1. **Root** `data-component="input"`, `data-variant="default|error"`: a vertical grid with gap `{space.1}`.
2. **Label**: a `<label for>`, always visible (never placeholder-only), `{font.weight.semibold}`. An optional `data-part="required"` adds " (required)" in `{color.text.secondary}`.
3. **Control**: an `<input>` or `<textarea>`.
4. **Hint** (`data-part="hint"`, optional): a caption in `{color.text.secondary}`, linked through `aria-describedby`.
5. **Error message** (`data-part="error"`, error variant only): a semibold caption in `{color.semantic.error}`, linked through `aria-describedby`. It comes after the hint.

## Variants
- **default**: a `{border-width.thin}` border in `{color.text.secondary}` on `{color.surface.default}`.
- **error**: a `{border-width.thick}` border in `{color.semantic.error}`, the error message, `aria-invalid="true"` on the control, and a short shake when the field enters the state.

## States
| State | What changes |
|---|---|
| default | Text in `{color.text.primary}` on `{color.surface.default}`, at least `{size.target.min}` tall, radius `{radius.sm}`. |
| hover | n/a. No hover style. A text field has nothing to preview on hover, and a hover tint would compete with focus. |
| focus | The border turns `{color.focus}`, plus a `{border-width.thick}` ring (box-shadow) in `{color.focus}`, on `:focus-visible`. It fades over `{motion.duration.fast}`. In the error variant, the error border stays and the focus ring is added. |
| active | n/a. Typing is the active state, and it looks the same as focus. |
| disabled | The native `disabled` attribute: `{color.surface.raised}` fill, `{color.text.secondary}` text, a not-allowed cursor. Disabled fields are skipped by the tab order and form submission, so use `readOnly` for values the user must still see and copy. |
| loading | n/a on the field. Show progress for async validation in the hint text. |
| error | The error variant. The message says what is wrong and how to fix it. The control gets `aria-invalid` and is described by the message. The shake plays once on entry, and replays when the message changes. |

## Tokens
- **Color:**
  - `{color.text.primary}`
  - `{color.text.secondary}`
  - `{color.surface.default}`
  - `{color.surface.raised}`
  - `{color.focus}`
  - `{color.semantic.error}`
- **Space and size:** `{space.1}`, `{space.2}`, `{space.3}`, `{space.12}` (the maximum width is 8 × space.12), `{size.target.min}`.
- **Shape:** `{radius.sm}`, `{border-width.thin}`, `{border-width.thick}`.
- **Type:** `{font.size.caption}` (hint and error), `{font.weight.semibold}`, `{font.weight.regular}`.
- **Motion:** `{motion.duration.fast}`, `{motion.duration.slow}`, `{motion.ease.standard}`.

## Motion
| Movement | Trigger | How | Tokens | Reduced motion |
|---|---|---|---|---|
| Focus ring | `:focus-visible` | border-color and box-shadow transition (color only, nothing moves) | `{motion.duration.fast}`, `{motion.ease.standard}` | Kept: it is a color change. |
| Error shake | entering the error variant, or a new message | `ds-shake`: translateX ±`{space.1}`, two cycles | `{motion.duration.slow}`, `{motion.ease.standard}` | None. The thick red border and the message carry the error. |

The React `<Input>` replays the shake when `error` changes. The HTML helper `setInputError(root, message)` does the same.

## Accessibility
- **Label:** a real `<label for>` tied to the input's id. The React wrapper generates the id with `useId`. Placeholders are hints only, never the label.
- **Descriptions:** the hint and error ids go into `aria-describedby`, so screen readers read them after the label. `aria-invalid="true"` marks the error.
- **Required fields:** the native `required` attribute, plus visible "(required)" text.
- **Autofill and keyboards:** pass `autoComplete` (for example `email`) and `inputMode` (for example `numeric`) so autofill and mobile keyboards work (WCAG 1.3.5).
- **Errors and keyboard:** don't move focus on every keystroke error. On submit, move focus to the first invalid field or an error summary. The control is a native input, so it needs no extra keyboard handling.
- **Contrast pairings** (core.md §4):
  - `{color.text.primary}` on `{color.surface.default}` (value)
  - `{color.text.secondary}` on `{color.surface.default}` (hint, border)
  - `{color.semantic.error}` on `{color.surface.default}` (error message and border)
  - `{color.focus}` on `{color.surface.default}` (ring)
  - `{color.text.secondary}` on `{color.surface.raised}` (disabled)

## Responsive
The field fills its container up to 8 × `{space.12}`, so lines stay readable on desktop. On mobile it goes full width. Body text is at least 16px, so iOS doesn't zoom on focus. The label sits above the control at every width, never beside it, so long labels and translations wrap cleanly.

## Do and don't
- **Do:**
  - Keep the label visible and short.
  - Put format help in the hint.
  - Write errors as a fix, such as "Enter an email address like name@example.com".
  - Validate on blur or submit.
- **Don't:**
  - Use the placeholder as the label.
  - Show an error before the user has had a chance to type.
  - Rely on red alone: the message text and the thicker border carry the error too.

## References
Searched separately for this component (the per-component seeds, design.md §16 Phase 2c):
- **https://21st.dev/community/components/tigerabrodi/input-with-feedback** (MIT)
  - Borrowed: helper text under the field that is replaced by a red border and an error message, plus a disabled look.
  - Ours: keeps the hint and adds the error after it. Both are wired with `aria-describedby` and `aria-invalid`. Plain CSS on tokens, no Tailwind.
- **https://21st.dev/community/components/shugar/input** (Geist style, license unclear: pattern only)
  - Borrowed: a quiet single border that strengthens on focus.
  - Ours: focus is a `{color.focus}` ring in addition to the border, so it passes the 3:1 ui contrast.
- **https://ui.shadcn.com/docs/components/field** and **https://ui.shadcn.com/docs/components/input**
  - Borrowed: Field composition (label, control, description, error).
  - Ours: one `data-component="input"` root holds all four, and the React wrapper takes `label`, `hint` and `error` props instead of six subcomponents.
- **https://www.radix-ui.com/primitives/docs/components/label**
  - Borrowed: the rule that the label is always associated with the control.
  - Ours: a native `<label for>`, with no Radix dependency.
- **https://react-spectrum.adobe.com/react-aria/TextField.html**
  - Borrowed: label, description and errorMessage as first-class props, plus the disabled and read-only distinction.
  - Ours: the same prop model, rendered as plain elements.
- **https://component.gallery/components/text-input/**
  - Borrowed: the 72 examples agree on a visible label above the field and an error below it.
  - Ours: follows that.
- **https://design-system.service.gov.uk/components/error-message/**
  - Borrowed: error text that says how to fix the problem, and a thicker red border.
  - Ours: the same, plus the shake (switched off under reduced motion).
- **https://kokonutui.com/docs/components/particle-button** and **https://styles.refero.design/**
  - Neither has a text-input pattern worth borrowing (Kokonut UI focuses on buttons and cards). Refero is used only for field density cues.

Patterns only, never pasted code: see `design-build/references/21st-dev.md`.

## Usage
```jsx
import { Input } from '../design-system/components/react';

<Input label="Email" type="email" autoComplete="email" hint="We only use it for receipts." required />
<Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={emailError} />
<Input label="Account ID" value="AC-1042" readOnly />
<Input label="Promo code" disabled />
```

```html
<div data-component="input" data-variant="default">
  <label for="email">Email</label>
  <input id="email" type="email" autocomplete="email" aria-describedby="email-hint">
  <p data-part="hint" id="email-hint">We only use it for receipts.</p>
</div>
<!-- setInputError(root, 'Enter an email address like name@example.com') from design-system/components/index.js -->
```
