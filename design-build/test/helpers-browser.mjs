// Self-test helper: loads components/index.js in Chromium (served from the design-system root) and checks the
// markup and a11y wiring the vanilla helpers produce. Exit 0 pass, 1 fail. Used by test/run.mjs.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const server = http.createServer((req, res) => {
  const p = new URL(req.url, 'http://x').pathname;
  if (p === '/') { res.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><html lang="en"><title>t</title><link rel="stylesheet" href="/design-build/preview/tokens.css"><link rel="stylesheet" href="/components/components.css"><main id="m"></main>'); return; }
  const f = path.join(ROOT, decodeURIComponent(p));
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/css' }).end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch();
let failures = [];
try {
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  failures = await page.evaluate(async () => {
    const ds = await import('/components/index.js');
    const f = [], ok = (c, m) => { if (!c) f.push(m); };
    const m = document.getElementById('m');
    let clicks = 0;
    const b = ds.createButton({ label: 'Save', variant: 'secondary', onClick: () => clicks++ });
    m.append(b);
    ok(b.dataset.component === 'button' && b.dataset.variant === 'secondary' && b.type === 'button', 'button attrs');
    b.click(); ok(clicks === 1, 'button click');
    ds.setButtonLoading(b, true);
    ok(b.getAttribute('aria-busy') === 'true' && b.getAttribute('aria-disabled') === 'true' && !b.disabled, 'loading keeps focus');
    ok(!!b.querySelector('[data-part="spinner"][aria-hidden="true"]') && b.textContent.includes('Save'), 'spinner + label');
    b.click(); ok(clicks === 1, 'loading button swallowed the click');
    ds.setButtonLoading(b, false);
    ok(!b.hasAttribute('aria-busy') && !b.querySelector('[data-part="spinner"]'), 'loading off');
    const i = ds.createInput({ label: 'Email', hint: 'Work address', type: 'email', required: true });
    m.append(i);
    const input = i.querySelector('input'), label = i.querySelector('label');
    ok(label.htmlFor === input.id && input.required, 'label for/id');
    ds.setInputError(i, 'Enter a valid email');
    const err = i.querySelector('[data-part="error"]');
    ok(i.dataset.variant === 'error' && input.getAttribute('aria-invalid') === 'true' && err && input.getAttribute('aria-describedby').split(' ').includes(err.id), 'error wiring');
    ds.setInputError(i, null);
    ok(i.dataset.variant === 'default' && !input.hasAttribute('aria-invalid') && !i.querySelector('[data-part="error"]') && !/error/.test(input.getAttribute('aria-describedby') || ''), 'error cleared');
    const c = ds.createCard({ variant: 'raised', interactive: true, children: [ds.createBadge({ label: 'New', variant: 'info' })] });
    m.append(c);
    ok(c.dataset.component === 'card' && c.dataset.variant === 'raised' && c.hasAttribute('data-interactive'), 'card attrs');
    ok(c.querySelector('[data-component="badge"][data-variant="info"]')?.textContent === 'New', 'badge');
    ok(!c.getAnimations().some((a) => a.animationName === 'ds-enter'), 'no entrance without enter (opt-in)');
    const ce = ds.createCard({ enter: true, children: 'x' });
    m.append(ce);
    ok(ce.hasAttribute('data-enter') && ds.replay(ce) === ce && ce.getAnimations().some((a) => a.animationName === 'ds-enter'), 'replay restarts the entrance');
    ok(ds.createBadge({ label: 'Saved', variant: 'success', live: true }).getAttribute('role') === 'status', 'live badge is a status');
    const lb = ds.createButton({ label: 'Save', variant: 'primary', loading: true, loadingLabel: 'Saving' });
    ok(lb.querySelector('[data-part="visually-hidden"][role="status"]')?.textContent === 'Saving', 'loading button announces its label');
    ds.setButtonLoading(lb, false);
    ok(!lb.querySelector('[role="status"]') && !lb.hasAttribute('aria-busy'), 'loading cleared');
    let msg = ''; try { ds.setInputError(document.createElement('div'), 'x'); } catch (e) { msg = e.message; }
    ok(/setInputError: pass the <div data-component="input"> root/.test(msg), 'setInputError names the fix for a wrong root');
    let threw = false; try { ds.createBadge({ label: 'x', variant: 'brand' }); } catch { threw = true; }
    ok(threw, 'unknown variant should throw');
    ok(JSON.stringify(ds.variants.button) === JSON.stringify(['primary', 'secondary', 'ghost', 'danger']), 'variants export');
    const sel = ds.createSelect({ label: 'Pier', id: 'pier', options: ['Pier 2', 'Pier 4'] });
    m.append(sel);
    const select = sel.querySelector('select'), slabel = sel.querySelector('label');
    ok(slabel.htmlFor === select.id && select.id === 'pier' && select.options.length === 2, 'select label wiring');
    const cb = ds.createCheckbox({ label: 'SMS receipts', checked: true });
    m.append(cb);
    const cbin = cb.querySelector('input');
    ok(cbin.type === 'checkbox' && cbin.checked && cb.querySelector('label')?.contains(cbin), 'checkbox');
    const tabs = ds.createTabs({ label: 'Days', tabs: [{ id: 't-today', label: 'Today', panel: 'Today panel' }, { id: 't-next', label: 'Tomorrow', panel: 'Tomorrow panel' }] });
    m.append(tabs);
    const tabBtns = [...tabs.querySelectorAll('[role="tab"]')];
    ok(tabBtns.length === 2 && tabBtns[0].getAttribute('aria-selected') === 'true', 'tabs initial');
    tabBtns[0].focus();
    tabBtns[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    const panel = document.getElementById(tabBtns[1].getAttribute('aria-controls'));
    ok(tabBtns[1].getAttribute('aria-selected') === 'true' && panel && panel.hidden === false, 'tabs arrow');
    const dlg = ds.createDialog({ title: 'Window', id: 'd1', body: 'Face the water.' });
    m.append(dlg);
    const opener = dlg.querySelector('[data-dialog-open]');
    const dialog = dlg.querySelector('dialog');
    ok(dialog && !dialog.open, 'dialog starts closed');
    opener.click();
    ok(dialog.open, 'dialog opens');
    dlg.querySelector('[data-part="close"]').click();
    ok(!dialog.open, 'dialog closes');
    return f;
  });
  if (errors.length) failures.push(...errors.map((e) => `console: ${e}`));
} catch (e) { failures.push(String(e)); }
await browser.close(); server.close();
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('helpers ok');
