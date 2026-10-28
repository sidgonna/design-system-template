# UI inventory

What each screen of the app is made of, and how each component works. Read it before building or changing UI.

- **`../design-build/inventory.json` is the single source of truth** for structured facts: every component (status, import path, props, variants) and every screen (`screens.<id>`: name, route, purpose, source files, and the components, variants and states it uses).
- **`components/<name>.md`**: one doc per component. Purpose, anatomy, variants, states, tokens, motion, accessibility, responsive behavior, do and don't, references (with how ours differs) and usage.
- **`screens/<id>.md`**: one per screen, with layout notes.
- **`index.md`**: generated overview of both.
- **`templates/`**: blank screen and component docs.

The table at the top of each doc is generated from inventory.json, between `ui-inventory:generated` markers. Don't edit it. Change the JSON, then run:

```bash
node design-system/design-build/ui-inventory.mjs          # rewrite index.md and the generated blocks; create missing docs from templates/
node design-system/design-build/ui-inventory.mjs --check  # change nothing; exit 1 if out of date
```

`lint.mjs` (rule `ui-inventory`) fails when:

- a screen lacks a name, route, purpose or components;
- a screen uses a component, variant or state that is not in the inventory (states come from digital-product.md §M1.2);
- a screen's `source` file renders an inventory component that the screen doesn't list, or (with one source file) doesn't render one that it lists;
- a component on a screen, or one whose inventory entry names a `doc`, has no doc (an app-only wrapper such as the root `<App>` needs an inventory entry but no doc until a screen lists it);
- a doc is missing a section, still has `{{…}}`, or skips a variant or one of the states (default, hover, focus, active, disabled, loading, error);
- a doc has no reference URL or no usage snippet;
- a generated block or `index.md` is stale;
- a doc names a token that doesn't exist, or uses a raw color.

**New screen:** add it to `screens` in inventory.json, run the script, and fill in `screens/<id>.md`.

**New component:** a new component needs four things first (design.md §0.5):

1. the user's agreement;
2. an inventory entry with status `planned`;
3. a reference search of the §16.2 component seeds, one at a time;
4. a filled doc.

Only then build it.
