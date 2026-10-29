# Radio

<!-- ui-inventory:generated — from design-build/inventory.json by `node design-system/design-build/ui-inventory.mjs`; edit the JSON, not this block -->
| | |
|---|---|
| Status | existing |
| React import | `import { Radio } from '…/design-system/components/react'` |
| HTML/CSS API | `<fieldset data-component="radio" data-variant="default"><legend><input type="radio">` + `components/components.css` |
| Props | `legend`, `options`, `value`, `disabled` |
| Variants | `default` |
| Used on | [Design board](../screens/preview.md) (`default`; `default`, `focus`)<br>[Form](../screens/form.md) (`default`; `default`, `focus`)<br>[Settings](../screens/settings.md) (`default`; `default`, `focus`) |
<!-- /ui-inventory:generated -->

## Purpose
Radio is one choice in an exclusive group. The legend names the group. Use Checkbox when each box is independent.

## Anatomy
1. **Root**: `<fieldset data-component="radio" data-variant="default">`.
2. **Legend** naming the group.
3. One **label** per native radio. The shared `name` makes them a group.

## Variants
- **default**: the only variant. The selected radio is the checked state.

## States
| State | What changes |
|---|---|
| default | Unselected rings. Border `{color.border.strong}`. |
| hover | n/a. Hover does not move the ring. |
| focus | A `{color.focus}` outline on the focused radio. |
| active | n/a. Selection is the checked dot, not a press style. |
| disabled | The fieldset disabled attribute fades the group with `{state.disabled}`. |
| loading | n/a. The options are in the page. |
| error | n/a on the group. Say what is wrong in the form error or an Alert. |

## Tokens
`{component.radio.bg}`, `{component.radio.fg}`, `{component.radio.border}`, `{component.radio.checked}`, `{component.radio.mark}`, `{component.radio.focus}`, `{size.target.min}`, `{space.2}`, `{icon.size.sm}`, `{radius.full}`.

## Motion
No movement. Selecting a radio paints the dot. prefers-reduced-motion changes nothing because nothing moves.

## Accessibility
Native radios in a fieldset with a legend. Arrow keys move within the group because that is what the browser does. Each control is at least `{size.target.min}`. The dot shows which one is selected, not color alone.

## Responsive
Options stack in a column with `{space.2}` between them. Labels wrap. The group uses the full width of the form and does not overflow it.

## Do and don't
- **Do** give the group a legend, such as Seat.
- **Do** use two or more radios that share one name.
- **Don't** use radios for a long list. Use Select.

## References
- **https://www.w3.org/WAI/ARIA/apg/patterns/radio/**
- Ours keeps the native fieldset and radios. There is no custom radiogroup widget.

## Usage
```jsx
import { Radio } from '../design-system/components/react';

<Radio legend="Seat" name="seat" value="window" options={[{ label: 'Window', value: 'window' }, { label: 'Aisle', value: 'aisle' }]} />
```
