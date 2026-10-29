'use client';
// <Tabs> — APG tablist. Arrow keys, Home and End. data-wired so mount() does not bind twice.
import { createElement as h, useId, useState } from 'react';

export function Tabs({ label = 'Tabs', tabs = [], value }) {
  const auto = useId().replace(/[^\w-]/g, '');
  const [own, setOwn] = useState(0);
  const selected = value != null ? tabs.findIndex((t) => t.id === value) : own;
  const index = selected >= 0 ? selected : 0;
  const onKey = (e) => {
    const last = tabs.length - 1;
    let next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % tabs.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    if (next == null) return;
    e.preventDefault();
    if (value == null) setOwn(next);
    const id = `${auto}-tab-${next}`;
    document.getElementById(id)?.focus();
  };
  return h('div', { 'data-component': 'tabs', 'data-variant': 'default', 'data-wired': 'true' },
    h('div', { role: 'tablist', 'aria-label': label, onKeyDown: onKey },
      tabs.map((t, i) => h('button', {
        type: 'button',
        key: t.id ?? i,
        id: `${auto}-tab-${i}`,
        role: 'tab',
        'aria-selected': i === index ? 'true' : 'false',
        'aria-controls': `${auto}-panel-${i}`,
        tabIndex: i === index ? 0 : -1,
        onClick: () => { if (value == null) setOwn(i); },
      }, t.label))),
    tabs.map((t, i) => h('div', {
      key: `p-${t.id ?? i}`,
      id: `${auto}-panel-${i}`,
      role: 'tabpanel',
      hidden: i === index ? undefined : true,
      'aria-labelledby': `${auto}-tab-${i}`,
    }, t.panel)));
}
