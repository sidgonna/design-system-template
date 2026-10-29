'use client';
// <Dialog> — native <dialog>. Closed until open. Escape and the close button call onClose.
import { createElement as h, forwardRef, useEffect, useId, useImperativeHandle, useRef } from 'react';

export const Dialog = forwardRef(function Dialog({ open = false, title, onClose, children, ...rest }, ref) {
  const own = useRef(null);
  useImperativeHandle(ref, () => own.current, []);
  const auto = useId().replace(/[^\w-]/g, '');
  const titleId = `ds-dialog-${auto}-title`;
  useEffect(() => {
    const el = own.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);
  const dlg = {
    ...rest,
    'data-component': 'dialog',
    'data-variant': 'default',
    'data-wired': 'true',
    'aria-labelledby': titleId,
    onCancel: (e) => { onClose?.(); rest.onCancel?.(e); },
    onClose: () => { onClose?.(); },
  };
  dlg.ref = own;
  return h('dialog', dlg,
    h('h2', { id: titleId }, title),
    children,
    h('div', { 'data-part': 'actions' }, h('button', { type: 'button', 'data-component': 'button', 'data-variant': 'secondary', 'data-part': 'close', onClick: () => onClose?.() }, 'Close')));
});
