// <Card> — surface container over the data-component="card" API in ../components.css.
// interactive: hover/focus-within lift. Put a real <a> or <button> inside; the card itself is not a control.
import { createElement as h, forwardRef } from 'react';

export const Card = forwardRef(function Card({ variant = 'flat', interactive = false, as = 'article', children, ...rest }, ref) {
  return h(as, { ...rest, ref, 'data-component': 'card', 'data-variant': variant, 'data-interactive': interactive ? '' : undefined }, children);
});
