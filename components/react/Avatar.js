'use client';
// <Avatar> — initials or an icon, with an accessible name. No photo asset.
import { createElement as h, forwardRef } from 'react';
import { checkVariant } from './check.js';

export const Avatar = forwardRef(function Avatar({ variant = 'initials', label, children, ...rest }, ref) {
  checkVariant('avatar', variant);
  return h('span', { ...rest, ref, role: 'img', 'aria-label': label, 'data-component': 'avatar', 'data-variant': variant }, children);
});
