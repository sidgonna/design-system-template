# Data table

<!-- ui-inventory:generated — from design-build/inventory.json by `node design-system/design-build/ui-inventory.mjs`; edit the JSON, not this block -->
| | |
|---|---|
| Screen | Data table (`table`) |
| Route | `components/patterns/table.html` |
| Purpose | A data table page: a search field, a search action, and a captioned table with status badges. |
| Source | `components/patterns/table.html` |

| Component | Variants used | States used | Status |
|---|---|---|---|
| [Input](../components/input.md) | `default` | `default`, `focus` | existing |
| [Button](../components/button.md) | `secondary` | `default`, `hover`, `focus` | existing |
| [Table](../components/table.md) | `default` | `default` | existing |
| [Badge](../components/badge.md) | `success`, `warning` | `default` | existing |
<!-- /ui-inventory:generated -->

## Layout
- **Order:** a search field, Search, then the captioned table.
- **Reflow:** the table scrolls inside its region. The page itself does not grow sideways.

## Notes
- **Status:** badges say On time and Due soon. Color repeats the word.
- **Find:** the search field is a normal Input. It does not filter the sample rows on the board.
