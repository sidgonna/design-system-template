'use client';
// Shared dev check for the wrappers: an unknown variant would silently render the default look, so say so once.
// Same variant lists as the vanilla helpers (../index.js), which throw instead.
import { variants } from '../index.js';

const warned = new Set();
export function checkVariant(kind, v) {
  if (v == null || variants[kind].includes(v) || warned.has(`${kind}:${v}`)) return;
  warned.add(`${kind}:${v}`);
  console.error(`<${kind[0].toUpperCase()}${kind.slice(1)}>: unknown variant "${v}" (use ${variants[kind].join(', ')}); it renders with the default look`);
}
