'use client';
// <Nav> — a list of links. One item may set current (aria-current="page").
import { createElement as h, forwardRef } from 'react';

export const Nav = forwardRef(function Nav({ label = 'Navigation', items = [], ...rest }, ref) {
  return h('nav', { ...rest, ref, 'aria-label': label, 'data-component': 'nav', 'data-variant': 'default' },
    h('ul', null, items.map((item, i) => h('li', { key: item.href ?? i },
      h('a', { href: item.href, 'aria-current': item.current ? 'page' : undefined }, item.label)))));
});
