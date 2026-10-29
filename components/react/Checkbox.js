'use client';
// <Checkbox> — native checkbox inside its label. data-component="checkbox".
import { createElement as h, forwardRef } from 'react';

export const Checkbox = forwardRef(function Checkbox({ label, ...rest }, ref) {
  return h('div', { 'data-component': 'checkbox', 'data-variant': 'default' },
    h('label', null, h('input', { ...rest, ref, type: 'checkbox' }), ` ${label ?? ''}`));
});
