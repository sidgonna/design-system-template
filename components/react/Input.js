'use client';
// <Input> — labelled text field over the data-component="input" API in ../components.css.
// Wires <label for>, aria-describedby (hint + error) and aria-invalid. The ref goes to the <input>.
import { createElement as h, forwardRef, useEffect, useId, useImperativeHandle, useRef } from 'react';

export const Input = forwardRef(function Input({ label, hint, error, id, required = false, className, style, ...rest }, ref) {
  const auto = useId();
  const fid = id || `ds-input-${auto.replace(/[^\w-]/g, '')}`;
  const hintId = hint ? `${fid}-hint` : null;
  const errId = error ? `${fid}-error` : null;
  const describedBy = [rest['aria-describedby'], hintId, errId].filter(Boolean).join(' ') || undefined;
  // Restart the error shake when a text message changes, so a second failed submit with a new message shakes again.
  // A non-text error (a JSX element is a new object on every render) only shakes when it first appears, so a
  // re-render never replays it. The input is found through our own ref, so this works in shadow DOM and iframes.
  const own = useRef(null);
  useImperativeHandle(ref, () => own.current, []);
  const shakeKey = typeof error === 'string' || typeof error === 'number' ? String(error) : Boolean(error);
  useEffect(() => {
    const el = own.current;
    if (!shakeKey || !el) return;
    el.style.animationName = 'none';
    void getComputedStyle(el).animationName; // flush, so the shake starts again
    el.style.animationName = '';
  }, [shakeKey]);
  const inputProps = { ...rest, id: fid, required, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': describedBy };
  // The caller's ref gets the <input> through useImperativeHandle (set before the caller's effects run). Our own
  // ref object is assigned after the literal: oxlint's react(refs) misreads a `ref` key inside createElement()
  // or a callback ref as reading ref.current during render (JSX `ref={ref}` is not flagged).
  inputProps.ref = own;
  return h('div', { 'data-component': 'input', 'data-variant': error ? 'error' : 'default', className, style },
    h('label', { htmlFor: fid }, label, required ? h('span', { 'data-part': 'required' }, ' (required)') : null),
    h('input', inputProps),
    hint ? h('p', { 'data-part': 'hint', id: hintId }, hint) : null,
    error ? h('p', { 'data-part': 'error', id: errId }, error) : null);
});
