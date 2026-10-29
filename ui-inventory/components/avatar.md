# Avatar

<!-- ui-inventory:generated — from design-build/inventory.json by `node design-system/design-build/ui-inventory.mjs`; edit the JSON, not this block -->
| | |
|---|---|
| Status | existing |
| React import | `import { Avatar } from '…/design-system/components/react'` |
| HTML/CSS API | `<span data-component="avatar" data-variant="initials\|icon" role="img">` + `components/components.css` |
| Props | `variant`, `label` |
| Variants | `initials`, `icon` |
| Used on | [Design board](../screens/preview.md) (`initials`, `icon`; `default`) |
<!-- /ui-inventory:generated -->

## Purpose
Avatar stands in for a person when there is no photo: initials, or a generic icon. The accessible name is the person's name, not the initials alone.

## Anatomy
1. **Root**: `<span data-component="avatar" role="img">` with `aria-label`.
2. **initials**: two letters as text.
3. **icon**: an svg, `aria-hidden`, sized with `{icon.size.md}` and `{icon.stroke}`.

## Variants
- **initials**: the letters, on `{color.container.primary}` with `{color.on-container.primary}`.
- **icon**: the same fill, with a person glyph instead of letters.

## States
| State | What changes |
|---|---|
| default | A `{size.target.min}` circle. Text and icon use the on-container color. |
| hover | n/a. It is not a control. |
| focus | n/a, unless you wrap it in a link. The avatar itself is not tabbed. |
| active | n/a. |
| disabled | n/a. |
| loading | n/a. There is no photo to load. |
| error | n/a. Missing photos use initials or the icon. Do not show a broken image. |

## Tokens
`{component.avatar.bg}`, `{component.avatar.fg}`, `{radius.full}`, `{size.target.min}`, `{icon.size.md}`, `{icon.stroke}`, `{font.weight.semibold}`, `{font.size.caption}`.

## Motion
None. prefers-reduced-motion does not apply.

## Accessibility
`role="img"` and `aria-label` with the full name. The svg is `aria-hidden` so the name is not "image". Initials are short enough to fit the circle. Contrast is `{color.on-container.primary}` on `{color.container.primary}`.

## Responsive
The circle stays `{size.target.min}` at every width. It does not shrink on a phone.

## Do and don't
- **Do** pass the person's name as the label.
- **Don't** use a photo asset. This set ships initials and an icon only.
- **Don't** use the initials as the only accessible name when they are ambiguous.

## References
- **https://component.gallery/components/avatar/**
- Ours has no image and no presence dot. Two variants, `{component.avatar.*}` only.

## Usage
```jsx
import { Avatar } from '../design-system/components/react';

<Avatar variant="initials" label="Ada Lovelace">AL</Avatar>
```
