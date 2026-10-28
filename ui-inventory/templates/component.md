# {{NAME}}

<!-- Component doc template (design.md §0.5, §16 Phase 2 and Phase 6 step 4). Copy it to
     ui-inventory/components/<name>.md, or let `node design-system/design-build/ui-inventory.mjs` create it.
     Fill every section BEFORE building or mapping the component. The generated block (status, import, props,
     variants, screens) comes from design-build/inventory.json: change the JSON, never the block.
     Reference tokens as {token.path} or var(--token); never write raw colors. lint rule ui-inventory checks this file. -->

## Purpose
{{What job it does, in one or two sentences, and when to reach for something else instead.}}

## Anatomy
{{Its parts, outermost first: root element, label, icon, helper text… and their data-part names.}}

## Variants
{{One line per variant listed in inventory.json: what it is for and what changes (tokens).}}

## States
{{What changes in each state, in tokens: default, hover, focus, active, disabled, loading, error. Say "n/a: why" when one does not apply.}}

| State | What changes |
|---|---|
| default | {{…}} |
| hover | {{…}} |
| focus | {{…}} |
| active | {{…}} |
| disabled | {{…}} |
| loading | {{…}} |
| error | {{…}} |

## Tokens
{{Every token it uses, grouped: color, space, radius, border, shadow, type, motion.}}

## Motion
{{Each movement, its trigger, keyframes or property, duration and easing tokens, and what happens under prefers-reduced-motion (core.md §10).}}

## Accessibility
{{Role and element, keyboard, labels and descriptions, ARIA states, focus, target size, and the core.md §4 contrast pairings it relies on (fg on bg, in light and dark).}}

## Responsive
{{How it behaves at the mobile, tablet and desktop check widths (digital-product.md §M1.3): width, wrapping, touch targets.}}

## Do and don't
- **Do** {{…}}
- **Don't** {{…}}

## References
<!-- The per-component reference search (design.md §16 Phase 2): search each §16.2 components seed for this component
     on its own (21st.dev, Refero Styles, The Component Gallery, shadcn/ui + Radix, Kokonut UI, React Aria,
     WAI-ARIA APG…). One line each: URL · the pattern borrowed · how ours differs. Patterns only, never pasted
     code (design-build/references/21st-dev.md). -->
- {{URL}} · {{pattern}} · {{how ours differs}}

## Usage
{{Import path and a snippet for React and for plain HTML.}}
