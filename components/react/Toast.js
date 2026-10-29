'use client';
// <Toast> — in-flow status with a Close button. data-float is for apps, not the board.
import { createElement as h, forwardRef, useState } from 'react';
import { checkVariant } from './check.js';

export const Toast = forwardRef(function Toast({ variant = 'info', title, float = false, onDismiss, children, ...rest }, ref) {
  checkVariant('toast', variant);
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return h('div', { ...rest, ref, role: 'status', 'data-component': 'toast', 'data-variant': variant, 'data-float': float ? '' : undefined },
    h('p', null, title ? h('strong', null, title) : null, title && children ? ' ' : null, children),
    h('button', { type: 'button', 'data-part': 'dismiss', 'data-wired': 'true', onClick: () => { setOpen(false); onDismiss?.(); } }, 'Close'));
});
