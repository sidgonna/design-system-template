// components/index.js — dependency-free ES module helpers for the shipped components (no framework needed).
// The styling API is plain HTML: data-component="button|input|card|badge" + data-variant (components.css).
// These helpers only build that markup with the a11y wiring done for you, and drive the stateful bits:
// button loading, input errors (with the shake replayed) and replaying an entrance animation.
// Docs: ui-inventory/components/*.md. Works in any browser that supports ES modules; no build step.

let uid = 0;
const nextId = (p) => `${p}-${++uid}`;
const VARIANTS = {
  button: ['primary', 'secondary', 'ghost', 'danger'],
  card: ['flat', 'raised'],
  badge: ['neutral', 'success', 'warning', 'error', 'info'],
};
function pick(kind, v, fallback) {
  if (v == null) return fallback;
  if (!VARIANTS[kind].includes(v)) throw new Error(`${kind}: unknown variant "${v}" (use ${VARIANTS[kind].join(', ')})`);
  return v;
}

/** <button data-component="button">. Options: { label, variant, type, disabled, loading, onClick } */
export function createButton({ label, variant, type = 'button', disabled = false, loading = false, onClick } = {}) {
  const b = document.createElement('button');
  b.type = type;
  b.dataset.component = 'button';
  b.dataset.variant = pick('button', variant, 'primary');
  const text = document.createElement('span');
  text.dataset.part = 'label';
  text.textContent = label ?? '';
  b.append(text);
  if (disabled) b.disabled = true;
  if (onClick) b.addEventListener('click', (e) => { if (b.getAttribute('aria-busy') === 'true') { e.preventDefault(); return; } onClick(e); });
  setButtonLoading(b, loading);
  return b;
}

/** Loading keeps the button focusable and its label visible (aria-busy + aria-disabled, not the disabled attribute). */
export function setButtonLoading(button, loading = true) {
  let sp = button.querySelector(':scope > [data-part="spinner"]');
  if (loading) {
    button.setAttribute('aria-busy', 'true');
    button.setAttribute('aria-disabled', 'true');
    if (!sp) { sp = document.createElement('span'); sp.dataset.part = 'spinner'; sp.setAttribute('aria-hidden', 'true'); button.prepend(sp); }
  } else {
    button.removeAttribute('aria-busy');
    if (!button.disabled) button.removeAttribute('aria-disabled');
    sp?.remove();
  }
  return button;
}

/**
 * <div data-component="input"> with a <label>, the field, an optional hint and an error message, wired with
 * for/id, aria-describedby and aria-invalid. Options: { label, hint, error, id, type, name, required, disabled,
 * value, autocomplete, inputmode }
 */
export function createInput({ label, hint, error, id, type = 'text', name, required = false, disabled = false, value, autocomplete, inputmode } = {}) {
  if (!label) throw new Error('createInput: a visible label is required (WCAG 1.3.1, 3.3.2)');
  const root = document.createElement('div');
  root.dataset.component = 'input';
  root.dataset.variant = 'default';
  const fid = id || nextId('ds-input');
  const l = document.createElement('label');
  l.htmlFor = fid;
  l.textContent = label;
  if (required) { const r = document.createElement('span'); r.dataset.part = 'required'; r.textContent = ' (required)'; l.append(r); }
  const input = document.createElement('input');
  Object.assign(input, { id: fid, type, required, disabled });
  if (name) input.name = name;
  if (value != null) input.value = value;
  if (autocomplete) input.autocomplete = autocomplete;
  if (inputmode) input.inputMode = inputmode;
  root.append(l, input);
  if (hint) {
    const h = document.createElement('p');
    h.dataset.part = 'hint'; h.id = `${fid}-hint`; h.textContent = hint;
    root.append(h);
  }
  describe(root);
  if (error) setInputError(root, error);
  return root;
}

function describe(root) {
  const input = root.querySelector('input, textarea, select');
  const ids = [...root.querySelectorAll('[data-part="hint"], [data-part="error"]')].map((e) => e.id).filter(Boolean);
  if (ids.length) input.setAttribute('aria-describedby', ids.join(' ')); else input.removeAttribute('aria-describedby');
}

/** Show (string) or clear (null) the error. Sets aria-invalid, links the message, and replays the shake. */
export function setInputError(root, message) {
  const input = root.querySelector('input, textarea, select');
  let err = root.querySelector('[data-part="error"]');
  if (message) {
    if (!err) { err = document.createElement('p'); err.dataset.part = 'error'; err.id = `${input.id}-error`; root.append(err); }
    err.textContent = message;
    input.setAttribute('aria-invalid', 'true');
    root.dataset.variant = 'error';
    replay(input);
  } else {
    err?.remove();
    input.removeAttribute('aria-invalid');
    root.dataset.variant = 'default';
  }
  describe(root);
  return root;
}

/** <article data-component="card">. Options: { variant, interactive, as, children: Node[] | string } */
export function createCard({ variant, interactive = false, as = 'article', children = [] } = {}) {
  const c = document.createElement(as);
  c.dataset.component = 'card';
  c.dataset.variant = pick('card', variant, 'flat');
  if (interactive) c.dataset.interactive = '';
  c.append(...(typeof children === 'string' ? [children] : children));
  return c;
}

/** <span data-component="badge">. The text is the status; color is never the only signal. */
export function createBadge({ label, variant } = {}) {
  const s = document.createElement('span');
  s.dataset.component = 'badge';
  s.dataset.variant = pick('badge', variant, 'neutral');
  s.textContent = label ?? '';
  return s;
}

/** Restart an element's CSS animation (card entrance, badge pop-in, input shake), even one that already
 *  finished. Under reduced motion components.css sets animation: none, so nothing plays. */
export function replay(el) {
  el.style.animationName = 'none';
  void getComputedStyle(el).animationName; // flush so the restart is seen as a new animation
  el.style.animationName = '';
  return el;
}

export const variants = VARIANTS;
