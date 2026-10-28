// <Badge> — status label over the data-component="badge" API in ../components.css.
// The text carries the meaning; the color and dot only reinforce it (WCAG 1.4.1).
import { createElement as h, forwardRef } from 'react';

export const Badge = forwardRef(function Badge({ variant = 'neutral', children, ...rest }, ref) {
  return h('span', { ...rest, ref, 'data-component': 'badge', 'data-variant': variant }, children);
});
