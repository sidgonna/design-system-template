'use client';
// <Badge> — status label over the data-component="badge" API in ../components.css.
// The text carries the meaning; the color and dot only reinforce it (WCAG 1.4.1).
import { createElement as h, forwardRef } from 'react';
import { checkVariant } from './check.js';

export const Badge = forwardRef(function Badge({ variant = 'neutral', live = false, children, ...rest }, ref) {
  checkVariant('badge', variant);
  // live: a status that changes while the user is on the page (Saved, Offline) is announced politely (role=status).
  return h('span', { role: live ? 'status' : undefined, ...rest, ref, 'data-component': 'badge', 'data-variant': variant }, children);
});
