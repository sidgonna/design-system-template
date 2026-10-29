'use client';
// <Radio> — fieldset, legend and native radios. data-component="radio".
import { createElement as h, forwardRef, useId } from 'react';

export const Radio = forwardRef(function Radio({ legend, name, options = [], value, disabled = false, ...rest }, ref) {
  const auto = useId().replace(/[^\w-]/g, '');
  const group = name || `ds-radio-${auto}`;
  return h('fieldset', { ...rest, ref, 'data-component': 'radio', 'data-variant': 'default', disabled: disabled || undefined },
    h('legend', null, legend),
    options.map((opt, i) => h('label', { key: opt.value ?? i },
      h('input', { type: 'radio', name: group, value: opt.value, defaultChecked: value != null ? String(value) === String(opt.value) : i === 0, disabled: opt.disabled || undefined }),
      ` ${opt.label ?? ''}`)));
});
