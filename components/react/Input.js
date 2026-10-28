// <Input> — labelled text field over the data-component="input" API in ../components.css.
// Wires <label for>, aria-describedby (hint + error) and aria-invalid. The ref goes to the <input>.
import { createElement as h, forwardRef, useCallback, useEffect, useId, useRef } from 'react';

export const Input = forwardRef(function Input({ label, hint, error, id, required = false, className, style, ...rest }, ref) {
  const auto = useId();
  const fid = id || `ds-input-${auto.replace(/[^\w-]/g, '')}`;
  const hintId = hint ? `${fid}-hint` : null;
  const errId = error ? `${fid}-error` : null;
  const describedBy = [rest['aria-describedby'], hintId, errId].filter(Boolean).join(' ') || undefined;
  const local = useRef(null);
  const setRef = useCallback((node) => {
    local.current = node;
    if (typeof ref === 'function') ref(node); else if (ref) ref.current = node;
  }, [ref]);
  // Replay the error shake when the message changes while already in the error state (CSS plays it on entry).
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const el = local.current;
    if (!error || !el) return;
    el.style.animationName = 'none';
    void getComputedStyle(el).animationName; // flush, so the shake starts again
    el.style.animationName = '';
  }, [error]);
  return h('div', { 'data-component': 'input', 'data-variant': error ? 'error' : 'default', className, style },
    h('label', { htmlFor: fid }, label, required ? h('span', { 'data-part': 'required' }, ' (required)') : null),
    h('input', { ...rest, ref: setRef, id: fid, required, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': describedBy }),
    hint ? h('p', { 'data-part': 'hint', id: hintId }, hint) : null,
    error ? h('p', { 'data-part': 'error', id: errId }, error) : null);
});
