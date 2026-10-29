# Form

<!-- ui-inventory:generated — from design-build/inventory.json by `node design-system/design-build/ui-inventory.mjs`; edit the JSON, not this block -->
| | |
|---|---|
| Screen | Form (`form`) |
| Route | `components/patterns/form.html` |
| Purpose | A short form: name, note, plan, receipt choice and seat, with save and cancel. |
| Source | `components/patterns/form.html` |

| Component | Variants used | States used | Status |
|---|---|---|---|
| [Input](../components/input.md) | `default` | `default`, `focus` | existing |
| [Textarea](../components/textarea.md) | `error` | `error`, `focus` | existing |
| [Select](../components/select.md) | `default` | `default`, `focus` | existing |
| [Checkbox](../components/checkbox.md) | `default` | `default`, `focus` | existing |
| [Radio](../components/radio.md) | `default` | `default`, `focus` | existing |
| [Button](../components/button.md) | `primary`, `secondary` | `default`, `hover`, `focus`, `active` | existing |
<!-- /ui-inventory:generated -->

## Layout
- **Order:** name, note, plan, SMS receipts, seat, then Save and Cancel.
- **Reflow:** one column at the phone width. Fields use the full width of the form up to the prose measure. Actions wrap.

## Notes
- **Submit:** the form does not navigate. `mount` cancels the submit so the board stays put.
- **Error:** the note shows the error variant. The other fields stay in default.
