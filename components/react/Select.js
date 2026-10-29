'use client';
// <Select> — native <select> over data-component="select". The ref goes to the <select>.
import { createElement as h, forwardRef, useId } from 'react';

export const Select = forwardRef(function Select({ label, hint, error, id, required = false, className, style, children, ...rest }, ref) {
  const auto = useId();
  const fid = id || `ds-select-${auto.replace(/[^\w-]/g, '')}`;
  const hintId = hint ? `${fid}-hint` : null;
  const errId = error ? `${fid}-error` : null;
  const describedBy = [rest['aria-describedby'], hintId, errId].filter(Boolean).join(' ') || undefined;
  return h('div', { 'data-component': 'select', 'data-variant': error ? 'error' : 'default', className, style },
    h('label', { htmlFor: fid }, label, required ? h('span', { 'data-part': 'required' }, ' (required)') : null),
    h('select', { ...rest, ref, id: fid, required, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': describedBy }, children),
    hint ? h('p', { 'data-part': 'hint', id: hintId }, hint) : null,
    error ? h('p', { 'data-part': 'error', id: errId }, error) : null);
});
