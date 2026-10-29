'use client';
// <Textarea> — multi-line field over data-component="textarea". The ref goes to the <textarea>.
import { createElement as h, forwardRef, useEffect, useId, useImperativeHandle, useRef } from 'react';

export const Textarea = forwardRef(function Textarea({ label, hint, error, id, required = false, rows = 4, className, style, ...rest }, ref) {
  const auto = useId();
  const fid = id || `ds-textarea-${auto.replace(/[^\w-]/g, '')}`;
  const hintId = hint ? `${fid}-hint` : null;
  const errId = error ? `${fid}-error` : null;
  const describedBy = [rest['aria-describedby'], hintId, errId].filter(Boolean).join(' ') || undefined;
  const own = useRef(null);
  useImperativeHandle(ref, () => own.current, []);
  const shakeKey = typeof error === 'string' || typeof error === 'number' ? String(error) : Boolean(error);
  useEffect(() => {
    const el = own.current;
    if (!shakeKey || !el) return;
    el.style.animationName = 'none';
    void getComputedStyle(el).animationName;
    el.style.animationName = '';
  }, [shakeKey]);
  const areaProps = { ...rest, id: fid, required, rows, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': describedBy };
  areaProps.ref = own;
  return h('div', { 'data-component': 'textarea', 'data-variant': error ? 'error' : 'default', className, style },
    h('label', { htmlFor: fid }, label, required ? h('span', { 'data-part': 'required' }, ' (required)') : null),
    h('textarea', areaProps),
    hint ? h('p', { 'data-part': 'hint', id: hintId }, hint) : null,
    error ? h('p', { 'data-part': 'error', id: errId }, error) : null);
});
