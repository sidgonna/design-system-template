# Settings

<!-- ui-inventory:generated — from design-build/inventory.json by `node design-system/design-build/ui-inventory.mjs`; edit the JSON, not this block -->
| | |
|---|---|
| Screen | Settings (`settings`) |
| Route | `components/patterns/settings.html` |
| Purpose | A settings page: section links, an email field, a switch, a seat choice and save. |
| Source | `components/patterns/settings.html` |

| Component | Variants used | States used | Status |
|---|---|---|---|
| [Nav](../components/nav.md) | `default` | `default`, `focus`, `active` | existing |
| [Input](../components/input.md) | `default` | `default`, `focus` | existing |
| [Switch](../components/switch.md) | `default` | `default`, `focus` | existing |
| [Radio](../components/radio.md) | `default` | `default`, `focus` | existing |
| [Button](../components/button.md) | `primary` | `default`, `hover`, `focus` | existing |
<!-- /ui-inventory:generated -->

## Layout
- **Order:** section links, the email field, the receipts switch, the seat radios, then Save.
- **Reflow:** the nav wraps. The form stays one column on a phone.

## Notes
- **Current section:** Account is `aria-current="page"`. Alerts is the other link.
- **Save:** the button submits the form, and `mount` cancels the navigation on the board.
