'use client';
// <Card> — surface container over the data-component="card" API in ../components.css.
// interactive: hover/focus-within lift. Put a real <a> or <button> inside; the card itself is not a control.
// enter: play the entrance animation (for a card that arrives after load, not every card in a list).
import { createElement as h, forwardRef } from 'react';
import { checkVariant } from './check.js';

export const Card = forwardRef(function Card({ variant = 'flat', interactive = false, enter = false, as = 'article', children, ...rest }, ref) {
  checkVariant('card', variant);
  return h(as, { ...rest, ref, 'data-component': 'card', 'data-variant': variant, 'data-interactive': interactive ? '' : undefined, 'data-enter': enter ? '' : undefined }, children);
});
