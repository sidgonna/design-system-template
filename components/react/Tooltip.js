'use client';
// <Tooltip> — hidden until hover or focus. Escape dismisses it. children is the trigger.
import { createElement as h, useId, useState } from 'react';

export function Tooltip({ tip, children }) {
  const [open, setOpen] = useState(false);
  const id = `ds-tip-${useId().replace(/[^\w-]/g, '')}`;
  return h('span', {
    'data-part': 'tip-host',
    'data-wired': 'true',
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false),
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false),
    onKeyDown: (e) => { if (e.key === 'Escape') setOpen(false); },
  },
  children,
  h('span', { id, role: 'tooltip', hidden: !open, 'data-component': 'tooltip', 'data-variant': 'default', 'data-open': open ? '' : undefined }, tip));
}
