'use client';
// <Button> — thin React wrapper over the data-component="button" API in ../components.css.
// Plain JS (no JSX, no build step) so it works in any React 18+ app; types in ./index.d.ts.
import { createElement as h, forwardRef } from 'react';
import { checkVariant } from './check.js';

export const Button = forwardRef(function Button({ variant = 'primary', loading = false, loadingLabel = 'Loading', disabled = false, type = 'button', onClick, children, ...rest }, ref) {
  checkVariant('button', variant);
  const busy = loading || undefined;
  return h('button', {
    ...rest,
    ref,
    type,
    disabled,
    'data-component': 'button',
    'data-variant': variant,
    // Loading keeps focus and the label (WAI-ARIA APG): aria-busy + aria-disabled instead of the disabled attribute.
    'aria-busy': busy,
    'aria-disabled': busy || rest['aria-disabled'],
    onClick: loading ? (e) => e.preventDefault() : onClick,
  },
  loading ? h('span', { 'data-part': 'spinner', 'aria-hidden': 'true' }) : null,
  h('span', { 'data-part': 'label' }, children),
  // aria-busy alone is not announced by screen readers: a polite status inside the button says it is working.
  loading ? h('span', { 'data-part': 'visually-hidden', role: 'status' }, loadingLabel) : null);
});
