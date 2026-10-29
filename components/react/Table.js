'use client';
// <Table> — caption, header row and a scroll region. children are the table body markup (thead and tbody).
import { createElement as h, forwardRef } from 'react';

export const Table = forwardRef(function Table({ caption, children, ...rest }, ref) {
  return h('div', { ...rest, ref, role: 'region', 'aria-label': typeof caption === 'string' ? caption : 'Table', tabIndex: 0, 'data-component': 'table', 'data-variant': 'default' },
    h('table', null, caption ? h('caption', null, caption) : null, children));
});
