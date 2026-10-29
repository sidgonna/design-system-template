# Empty state

<!-- ui-inventory:generated — from design-build/inventory.json by `node design-system/design-build/ui-inventory.mjs`; edit the JSON, not this block -->
| | |
|---|---|
| Screen | Empty state (`empty`) |
| Route | `components/patterns/empty.html` |
| Purpose | What a list shows when no rows match: a card, a sentence, and one action. |
| Source | `components/patterns/empty.html` |

| Component | Variants used | States used | Status |
|---|---|---|---|
| [Card](../components/card.md) | `flat` | `default` | existing |
| [Button](../components/button.md) | `primary` | `default`, `hover`, `focus` | existing |
<!-- /ui-inventory:generated -->

## Layout
- **Order:** a flat card, a heading, one sentence, then one primary button.
- **Reflow:** the card uses the container width. The button stays at least the minimum target size.

## Notes
- **When:** render this instead of an empty table when a filter matches nothing.
- **Action:** Clear filters is the way back to rows.
