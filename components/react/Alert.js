'use client';
// <Alert> — status text plus a colored edge. live announces it (alert for error and warning).
import { createElement as h, forwardRef } from 'react';
import { checkVariant } from './check.js';

export const Alert = forwardRef(function Alert({ variant = 'info', title, live = false, children, ...rest }, ref) {
  checkVariant('alert', variant);
  const role = live ? (variant === 'error' || variant === 'warning' ? 'alert' : 'status') : rest.role;
  return h('div', { ...rest, ref, role, 'data-component': 'alert', 'data-variant': variant },
    h('p', null, title ? h('strong', null, title) : null, title && children ? ' ' : null, children));
});
