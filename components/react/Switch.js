'use client';
// <Switch> — button role="switch". data-wired so a later mount() does not toggle twice.
import { createElement as h, forwardRef, useState } from 'react';

export const Switch = forwardRef(function Switch({ label, checked, defaultChecked = false, disabled = false, onClick, ...rest }, ref) {
  const [own, setOwn] = useState(!!defaultChecked);
  const on = checked != null ? !!checked : own;
  return h('button', {
    ...rest,
    ref,
    type: 'button',
    disabled,
    'data-component': 'switch',
    'data-variant': 'default',
    'data-wired': 'true',
    role: 'switch',
    'aria-checked': on ? 'true' : 'false',
    onClick: (e) => { if (checked == null) setOwn(!on); onClick?.(e); },
  },
  h('span', { 'data-part': 'track', 'aria-hidden': 'true' }, h('span', { 'data-part': 'thumb' })),
  h('span', { 'data-part': 'label' }, label));
});
