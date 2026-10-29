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
  select: ['default', 'error'],
  textarea: ['default', 'error'],
  checkbox: ['default'],
  radio: ['default'],
  switch: ['default'],
  alert: ['info', 'success', 'warning', 'error'],
  toast: ['success', 'warning', 'error', 'info'],
  dialog: ['default'],
  tooltip: ['default'],
  avatar: ['initials', 'icon'],
  table: ['default'],
  tabs: ['default'],
  nav: ['default'],
};
function pick(kind, v, fallback) {
  if (v == null) return fallback;
  if (!VARIANTS[kind].includes(v)) throw new Error(`${kind}: unknown variant "${v}" (use ${VARIANTS[kind].join(', ')})`);
  return v;
}

/** <button data-component="button">. Options: { label, variant, type, disabled, loading, loadingLabel, onClick } */
export function createButton({ label, variant, type = 'button', disabled = false, loading = false, loadingLabel, onClick } = {}) {
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
  setButtonLoading(b, loading, loadingLabel);
  return b;
}

/** Loading keeps the button focusable and its label visible (aria-busy + aria-disabled, not the disabled attribute).
 *  aria-busy alone is not announced, so a visually hidden role="status" says loadingLabel (default "Loading"). */
export function setButtonLoading(button, loading = true, loadingLabel = 'Loading') {
  if (!button?.matches?.('[data-component="button"]')) throw new Error('setButtonLoading: pass the <button data-component="button"> element (from createButton or your markup)');
  let sp = button.querySelector(':scope > [data-part="spinner"]');
  let st = button.querySelector(':scope > [data-part="visually-hidden"][role="status"]');
  if (loading) {
    button.setAttribute('aria-busy', 'true');
    button.setAttribute('aria-disabled', 'true');
    if (!sp) { sp = document.createElement('span'); sp.dataset.part = 'spinner'; sp.setAttribute('aria-hidden', 'true'); button.prepend(sp); }
    if (!st) { st = document.createElement('span'); st.dataset.part = 'visually-hidden'; st.setAttribute('role', 'status'); button.append(st); }
    st.textContent = loadingLabel ?? 'Loading';
  } else {
    button.removeAttribute('aria-busy');
    if (!button.disabled) button.removeAttribute('aria-disabled');
    sp?.remove();
    st?.remove();
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

function fieldOf(root, fn) {
  const input = root?.querySelector?.('input, textarea, select');
  if (!input) throw new Error(`${fn}: pass the <div data-component="input"> root that contains the <input>, <textarea> or <select> (got ${root?.tagName ? `<${root.tagName.toLowerCase()}>` : String(root)})`);
  if (!input.id) input.id = nextId('ds-input');   // the error message's id is built from it
  return input;
}

function describe(root) {
  const input = fieldOf(root, 'describe');
  const ids = [...root.querySelectorAll('[data-part="hint"], [data-part="error"]')].map((e) => e.id).filter(Boolean);
  if (ids.length) input.setAttribute('aria-describedby', ids.join(' ')); else input.removeAttribute('aria-describedby');
}

/** Show (string) or clear (null) the error. Sets aria-invalid, links the message, and replays the shake. */
export function setInputError(root, message) {
  const input = fieldOf(root, 'setInputError');
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

/** <article data-component="card">. Options: { variant, interactive, enter, as, children: Node[] | string }
 *  enter plays the entrance animation (data-enter): use it for a card added after load, not every card in a list. */
export function createCard({ variant, interactive = false, enter = false, as = 'article', children = [] } = {}) {
  const c = document.createElement(as);
  c.dataset.component = 'card';
  c.dataset.variant = pick('card', variant, 'flat');
  if (interactive) c.dataset.interactive = '';
  if (enter) c.dataset.enter = '';
  c.append(...(typeof children === 'string' ? [children] : children));
  return c;
}

/** <span data-component="badge">. The text is the status; color is never the only signal.
 *  live: a status that changes while the user is on the page gets role="status" (announced politely). */
export function createBadge({ label, variant, live = false } = {}) {
  const s = document.createElement('span');
  s.dataset.component = 'badge';
  s.dataset.variant = pick('badge', variant, 'neutral');
  if (live) s.setAttribute('role', 'status');
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

function labelFor(text, fid, required) {
  const l = document.createElement('label');
  l.htmlFor = fid;
  l.textContent = text;
  if (required) { const r = document.createElement('span'); r.dataset.part = 'required'; r.textContent = ' (required)'; l.append(r); }
  return l;
}
function hintOrError(root, fid, hint) {
  if (hint) {
    const h = document.createElement('p');
    h.dataset.part = 'hint'; h.id = `${fid}-hint`; h.textContent = hint;
    root.append(h);
  }
  describe(root);
}

/** <div data-component="select">. Options: { label, hint, error, id, name, required, disabled, value, options: string[] | {value,label,disabled}[] } */
export function createSelect({ label, hint, error, id, name, required = false, disabled = false, value, options = [] } = {}) {
  if (!label) throw new Error('createSelect: a visible label is required (WCAG 1.3.1, 3.3.2)');
  const root = document.createElement('div');
  root.dataset.component = 'select';
  root.dataset.variant = 'default';
  const fid = id || nextId('ds-select');
  const select = document.createElement('select');
  Object.assign(select, { id: fid, required, disabled });
  if (name) select.name = name;
  for (const opt of options) {
    const o = document.createElement('option');
    if (opt && typeof opt === 'object') { o.value = opt.value ?? ''; o.textContent = opt.label ?? opt.value ?? ''; if (opt.disabled) o.disabled = true; }
    else { o.value = String(opt); o.textContent = String(opt); }
    select.append(o);
  }
  if (value != null) select.value = value;
  root.append(labelFor(label, fid, required), select);
  hintOrError(root, fid, hint);
  if (error) setInputError(root, error);
  return root;
}

/** <div data-component="textarea">. Options match createInput, plus rows. */
export function createTextarea({ label, hint, error, id, name, required = false, disabled = false, value, rows = 4 } = {}) {
  if (!label) throw new Error('createTextarea: a visible label is required (WCAG 1.3.1, 3.3.2)');
  const root = document.createElement('div');
  root.dataset.component = 'textarea';
  root.dataset.variant = 'default';
  const fid = id || nextId('ds-textarea');
  const area = document.createElement('textarea');
  Object.assign(area, { id: fid, required, disabled, rows });
  if (name) area.name = name;
  if (value != null) area.value = value;
  root.append(labelFor(label, fid, required), area);
  hintOrError(root, fid, hint);
  if (error) setInputError(root, error);
  return root;
}

/** Native checkbox inside its label. Options: { label, checked, disabled, required, name, value } */
export function createCheckbox({ label, checked = false, disabled = false, required = false, name, value, variant } = {}) {
  if (!label) throw new Error('createCheckbox: a visible label is required (WCAG 1.3.1, 3.3.2)');
  const root = document.createElement('div');
  root.dataset.component = 'checkbox';
  root.dataset.variant = pick('checkbox', variant, 'default');
  const l = document.createElement('label');
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = !!checked;
  input.disabled = !!disabled;
  input.required = !!required;
  if (name) input.name = name;
  if (value != null) input.value = value;
  l.append(input, document.createTextNode(` ${label}`));
  root.append(l);
  return root;
}

/** Fieldset of native radios. Options: { legend, name, options: [{label, value, disabled?}], value } */
export function createRadio({ legend, name, options = [], value, disabled = false, variant } = {}) {
  if (!legend) throw new Error('createRadio: a visible legend is required (WCAG 1.3.1)');
  const root = document.createElement('fieldset');
  root.dataset.component = 'radio';
  root.dataset.variant = pick('radio', variant, 'default');
  if (disabled) root.disabled = true;
  const lg = document.createElement('legend');
  lg.textContent = legend;
  root.append(lg);
  const group = name || nextId('ds-radio');
  options.forEach((opt, i) => {
    const l = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = group;
    input.value = opt.value ?? String(i);
    if (opt.disabled) input.disabled = true;
    if (value != null ? input.value === String(value) : i === 0) input.checked = true;
    l.append(input, document.createTextNode(` ${opt.label ?? opt.value ?? ''}`));
    root.append(l);
  });
  return root;
}

/** <button role="switch">. Sets data-wired so mount does not toggle it a second time. */
export function createSwitch({ label, checked = false, disabled = false, variant, onClick } = {}) {
  if (!label) throw new Error('createSwitch: a visible label is required');
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.component = 'switch';
  b.dataset.variant = pick('switch', variant, 'default');
  b.dataset.wired = 'true';
  b.setAttribute('role', 'switch');
  b.setAttribute('aria-checked', checked ? 'true' : 'false');
  if (disabled) b.disabled = true;
  const track = document.createElement('span');
  track.dataset.part = 'track';
  track.setAttribute('aria-hidden', 'true');
  const thumb = document.createElement('span');
  thumb.dataset.part = 'thumb';
  track.append(thumb);
  const text = document.createElement('span');
  text.dataset.part = 'label';
  text.textContent = label;
  b.append(track, text);
  b.addEventListener('click', () => {
    if (b.disabled) return;
    const on = b.getAttribute('aria-checked') === 'true';
    b.setAttribute('aria-checked', on ? 'false' : 'true');
    if (onClick) onClick(b.getAttribute('aria-checked') === 'true');
  });
  return b;
}

/** Status message. Color is never the only signal: title is text. live adds role=alert for error and warning. */
export function createAlert({ title, body = '', variant, live = false } = {}) {
  const root = document.createElement('div');
  root.dataset.component = 'alert';
  root.dataset.variant = pick('alert', variant, 'info');
  if (live) root.setAttribute('role', root.dataset.variant === 'error' || root.dataset.variant === 'warning' ? 'alert' : 'status');
  const p = document.createElement('p');
  const strong = document.createElement('strong');
  strong.textContent = title || root.dataset.variant;
  p.append(strong, document.createTextNode(body ? ` ${body}` : ''));
  root.append(p);
  return root;
}

/** In-flow toast. data-float is opt-in for apps; the board leaves it off. */
export function createToast({ title, body = '', variant, float = false } = {}) {
  const root = document.createElement('div');
  root.dataset.component = 'toast';
  root.dataset.variant = pick('toast', variant, 'info');
  root.setAttribute('role', 'status');
  if (float) root.dataset.float = '';
  const p = document.createElement('p');
  const strong = document.createElement('strong');
  strong.textContent = title || root.dataset.variant;
  p.append(strong, document.createTextNode(body ? ` ${body}` : ''));
  const close = document.createElement('button');
  close.type = 'button';
  close.dataset.part = 'dismiss';
  close.textContent = 'Close';
  root.append(p, close);
  mount(root);
  return root;
}

/** Wrap: opener button plus a native <dialog>. Callers append the wrap, then the opener calls showModal. */
export function createDialog({ title = 'Dialog', body = '', id, openLabel = 'Open dialog', closeLabel = 'Close' } = {}) {
  const wrap = document.createElement('div');
  const did = id || nextId('ds-dialog');
  const opener = document.createElement('button');
  opener.type = 'button';
  opener.dataset.component = 'button';
  opener.dataset.variant = 'secondary';
  opener.dataset.dialogOpen = did;
  opener.setAttribute('aria-haspopup', 'dialog');
  opener.setAttribute('aria-controls', did);
  opener.textContent = openLabel;
  const dlg = document.createElement('dialog');
  dlg.id = did;
  dlg.dataset.component = 'dialog';
  dlg.dataset.variant = 'default';
  dlg.setAttribute('aria-labelledby', `${did}-title`);
  const h = document.createElement('h2');
  h.id = `${did}-title`;
  h.textContent = title;
  const p = document.createElement('p');
  p.textContent = body;
  const actions = document.createElement('div');
  actions.dataset.part = 'actions';
  const close = document.createElement('button');
  close.type = 'button';
  close.dataset.component = 'button';
  close.dataset.variant = 'secondary';
  close.dataset.part = 'close';
  close.textContent = closeLabel;
  actions.append(close);
  dlg.append(h, p, actions);
  wrap.append(opener, dlg);
  mount(wrap);
  return wrap;
}

/** Trigger plus a tooltip that stays hidden until hover or focus. */
export function createTooltip({ label = 'Details', tip = '', variant } = {}) {
  const host = document.createElement('span');
  host.dataset.part = 'tip-host';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.dataset.component = 'button';
  btn.dataset.variant = 'secondary';
  btn.textContent = label;
  const tipEl = document.createElement('span');
  tipEl.id = nextId('ds-tip');
  tipEl.dataset.component = 'tooltip';
  tipEl.dataset.variant = pick('tooltip', variant, 'default');
  tipEl.setAttribute('role', 'tooltip');
  tipEl.hidden = true;
  tipEl.textContent = tip;
  host.append(btn, tipEl);
  mount(host);
  return host;
}

const AVATAR_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="8" r="3"></circle><path d="M5 19c1.5-3 4-4.5 7-4.5S17.5 16 19 19"></path></svg>';

/** Initials or an icon. label is the accessible name. */
export function createAvatar({ label, initials = '', variant } = {}) {
  if (!label) throw new Error('createAvatar: an accessible name is required');
  const s = document.createElement('span');
  s.dataset.component = 'avatar';
  s.dataset.variant = pick('avatar', variant, 'initials');
  s.setAttribute('role', 'img');
  s.setAttribute('aria-label', label);
  if (s.dataset.variant === 'icon') s.innerHTML = AVATAR_ICON;
  else s.textContent = initials;
  return s;
}

/** Scrollable table. columns: string[], rows: (string | Node)[][]. */
export function createTable({ caption = 'Table', columns = [], rows = [] } = {}) {
  const root = document.createElement('div');
  root.dataset.component = 'table';
  root.dataset.variant = 'default';
  root.setAttribute('role', 'region');
  root.setAttribute('aria-label', caption);
  root.tabIndex = 0;
  const table = document.createElement('table');
  const cap = document.createElement('caption');
  cap.textContent = caption;
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  for (const col of columns) { const th = document.createElement('th'); th.scope = 'col'; th.textContent = col; hr.append(th); }
  thead.append(hr);
  const tbody = document.createElement('tbody');
  for (const row of rows) {
    const tr = document.createElement('tr');
    for (const cell of row) {
      const td = document.createElement('td');
      if (cell instanceof Node) td.append(cell); else td.textContent = cell ?? '';
      tr.append(td);
    }
    tbody.append(tr);
  }
  table.append(cap, thead, tbody);
  root.append(table);
  return root;
}

/** APG tabs. tabs: [{ id, label, panel }]. Arrow keys, Home and End move the tab. */
export function createTabs({ label = 'Tabs', tabs = [], variant } = {}) {
  const root = document.createElement('div');
  root.dataset.component = 'tabs';
  root.dataset.variant = pick('tabs', variant, 'default');
  const list = document.createElement('div');
  list.setAttribute('role', 'tablist');
  list.setAttribute('aria-label', label);
  const panels = [];
  tabs.forEach((t, i) => {
    const id = t.id || nextId('ds-tab');
    const b = document.createElement('button');
    b.type = 'button';
    b.id = `${id}-tab`;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-controls', `${id}-panel`);
    b.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    b.tabIndex = i === 0 ? 0 : -1;
    b.textContent = t.label ?? '';
    const panel = document.createElement('div');
    panel.id = `${id}-panel`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', b.id);
    if (i !== 0) panel.hidden = true;
    panel.textContent = t.panel ?? '';
    list.append(b);
    panels.push(panel);
  });
  root.append(list, ...panels);
  mount(root);
  return root;
}

/** Link list. items: [{ href, label, current }]. */
export function createNav({ label = 'Navigation', items = [], variant } = {}) {
  const nav = document.createElement('nav');
  nav.dataset.component = 'nav';
  nav.dataset.variant = pick('nav', variant, 'default');
  nav.setAttribute('aria-label', label);
  const ul = document.createElement('ul');
  for (const item of items) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    if (!item.href) throw new Error('createNav: every item needs an href');
    a.href = item.href;
    a.textContent = item.label ?? '';
    if (item.current) a.setAttribute('aria-current', 'page');
    li.append(a);
    ul.append(li);
  }
  nav.append(ul);
  return nav;
}

function eachMatch(root, sel, fn) {
  const list = root.querySelectorAll ? [...root.querySelectorAll(sel)] : [];
  if (root.nodeType === 1 && root.matches?.(sel)) list.unshift(root);
  list.forEach(fn);
}

/** Wire tabs, switches, dialogs, tooltips, toast dismiss and pattern forms. Idempotent (data-wired). */
export function mount(root = document) {
  eachMatch(root, '[data-component="tabs"]', (tabs) => {
    if (tabs.dataset.wired) return;
    tabs.dataset.wired = 'true';
    const list = tabs.querySelector('[role="tablist"]');
    if (!list) return;
    const btns = [...list.querySelectorAll('[role="tab"]')];
    const select = (tab) => {
      for (const t of btns) {
        const on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        const panelId = t.getAttribute('aria-controls');
        const panel = panelId ? tabs.querySelector(`#${CSS.escape(panelId)}`) : null;
        if (panel) panel.hidden = !on;
      }
    };
    list.addEventListener('keydown', (e) => {
      const i = btns.indexOf(document.activeElement);
      if (i < 0) return;
      let next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = btns[(i + 1) % btns.length];
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = btns[(i - 1 + btns.length) % btns.length];
      else if (e.key === 'Home') next = btns[0];
      else if (e.key === 'End') next = btns[btns.length - 1];
      if (!next) return;
      e.preventDefault();
      select(next);
      next.focus();
    });
    for (const t of btns) t.addEventListener('click', () => select(t));
  });

  eachMatch(root, '[data-component="switch"]', (sw) => {
    if (sw.dataset.wired) return;
    sw.dataset.wired = 'true';
    sw.addEventListener('click', () => {
      if (sw.disabled || sw.getAttribute('aria-disabled') === 'true') return;
      const on = sw.getAttribute('aria-checked') === 'true';
      sw.setAttribute('aria-checked', on ? 'false' : 'true');
    });
  });

  eachMatch(root, '[data-dialog-open]', (btn) => {
    if (btn.dataset.wired) return;
    btn.dataset.wired = 'true';
    btn.addEventListener('click', () => {
      const dlg = document.getElementById(btn.getAttribute('data-dialog-open'));
      if (!dlg || typeof dlg.showModal !== 'function' || dlg.open) return;
      dlg._dsOpener = btn;
      btn.focus();
      dlg.showModal();
    });
  });
  eachMatch(root, '[data-component="dialog"]', (dlg) => {
    if (dlg.dataset.wired) return;
    dlg.dataset.wired = 'true';
    dlg.querySelectorAll('[data-part="close"]').forEach((b) => b.addEventListener('click', () => dlg.close()));
    dlg.addEventListener('close', () => {
      const opener = dlg._dsOpener;
      if (opener) setTimeout(() => opener.focus(), 0);
    });
  });

  eachMatch(root, '[data-part="tip-host"]', (host) => {
    if (host.dataset.wired) return;
    host.dataset.wired = 'true';
    const tip = host.querySelector('[data-component="tooltip"]');
    const trigger = host.querySelector('button, a, input, select, textarea');
    if (!tip) return;
    let hold = false;
    const open = (v) => {
      if (v) { tip.hidden = false; tip.dataset.open = ''; if (trigger && tip.id) trigger.setAttribute('aria-describedby', tip.id); }
      else { tip.hidden = true; delete tip.dataset.open; if (trigger) trigger.removeAttribute('aria-describedby'); }
    };
    host.addEventListener('mouseenter', () => { if (!hold) open(true); });
    host.addEventListener('mouseleave', () => open(false));
    host.addEventListener('focusin', () => { if (!hold) open(true); });
    host.addEventListener('focusout', () => { hold = false; open(false); });
    host.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      hold = true;
      open(false);
      trigger?.focus();
    });
  });

  eachMatch(root, '[data-component="toast"] [data-part="dismiss"]', (b) => {
    if (b.dataset.wired) return;
    b.dataset.wired = 'true';
    b.addEventListener('click', () => { const toast = b.closest('[data-component="toast"]'); if (toast) toast.hidden = true; });
  });

  eachMatch(root, 'form[data-pattern], [data-pattern] form', (form) => {
    if (form.dataset.wired) return;
    form.dataset.wired = 'true';
    form.addEventListener('submit', (e) => e.preventDefault());
  });
}

export const variants = VARIANTS;
