// <Input> — labelled text field over the data-component="input" API in ../components.css.
// Wires <label for>, aria-describedby (hint + error) and aria-invalid. The ref goes to the <input>.
import { createElement as h, forwardRef, useEffect, useId } from 'react';

export const Input = forwardRef(function Input({ label, hint, error, id, required = false, className, style, ...rest }, ref) {
  const auto = useId();
  const fid = id || `ds-input-${auto.replace(/[^\w-]/g, '')}`;
  const hintId = hint ? `${fid}-hint` : null;
  const errId = error ? `${fid}-error` : null;
  const describedBy = [rest['aria-describedby'], hintId, errId].filter(Boolean).join(' ') || undefined;
  // Restart the error shake whenever the message changes, so a second failed submit shakes again
  // (on first entry this restarts the CSS animation at 0, which looks the same).
  useEffect(() => {
    const el = document.getElementById(fid);
    if (!error || !el) return;
    el.style.animationName = 'none';
    void getComputedStyle(el).animationName; // flush, so the shake starts again
    el.style.animationName = '';
  }, [error, fid]);
  const inputProps = { ...rest, id: fid, required, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': describedBy };
  // Set after the literal: oxlint's react(refs) misreads `{ ref }` inside createElement() in a component
  // that calls hooks as reading ref.current during render (JSX `ref={ref}` is not flagged).
  inputProps.ref = ref;
  return h('div', { 'data-component': 'input', 'data-variant': error ? 'error' : 'default', className, style },
    h('label', { htmlFor: fid }, label, required ? h('span', { 'data-part': 'required' }, ' (required)') : null),
    h('input', inputProps),
    hint ? h('p', { 'data-part': 'hint', id: hintId }, hint) : null,
    error ? h('p', { 'data-part': 'error', id: errId }, error) : null);
});
