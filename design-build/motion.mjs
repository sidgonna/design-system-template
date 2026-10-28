#!/usr/bin/env node
// motion.mjs — proves the component motion physically plays, and that reduced motion stops all movement.
//
// Usage (from the app root): node design-system/design-build/motion.mjs [page | --url <url>] [--json] [--strip <dir>]
//   page / --url   what to check. Default: the design system's preview (served from the project root).
//                  For an app, start its dev server and pass --url http://localhost:5173/
//   --strip <dir>  also save PNG frames (t = 0, 25, 50, 75, 100 %) of each animation, for review
//   --json         machine-readable result on stdout
//
// It finds the shipped components by their data-component attributes (components/components.css) and, in a
// browser with motion allowed, checks each motion that is on the page:
//   card-enter, badge-pop, input-shake, button-spinner   CSS animations: the paused animation is sampled at
//                                                         t0 and mid-way, and transform/opacity must differ
//   button-hover, button-press, card-hover, input-focus  CSS transitions started by real hover/press/focus;
//                                                         same sampling (input-focus is color/ring only)
//   play-motion    the preview's #play-motion demo: real-time transform at t0, mid and end must differ
// Then with prefers-reduced-motion: reduce it repeats the triggers and fails if any animation runs, any
// transform/size/position transition starts, or a hovered/pressed component has a transform.
// Animations are slowed 10× through the DevTools protocol so a transition is still running when it is sampled.
// Exit: 0 pass · 1 fail · 2 harness error (Playwright missing, page did not load, no components found).
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { findProject } from './lib/project.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DS = path.resolve(HERE, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const MOVING = /^(transform|translate|scale|rotate|all|left|top|right|bottom|inset(-.*)?|margin(-.*)?|(min-|max-)?(width|height|inline-size|block-size))$/;

function serve(root) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let f = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
      if (!f.startsWith(root)) { res.writeHead(403).end(); return; }
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
      if (!fs.existsSync(f)) { res.writeHead(404).end('not found'); return; }
      res.writeHead(200, { 'content-type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
      fs.createReadStream(f).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

// ---- in-page helpers (serialized into the page) ----
const PAGE_HELPERS = `
window.__motion = {
  pick(sel) { return document.querySelector(sel); },
  // Pause the matching animation on el, read transform/opacity at fractions of one iteration, then let it finish.
  sample(sel, kind, name, fractions) {
    const el = document.querySelector(sel);
    if (!el) return null;
    const all = el.getAnimations();
    const a = all.find((x) => kind === 'animation' ? (x.animationName === name) : (x.transitionProperty && new RegExp(name).test(x.transitionProperty)));
    if (!a) return { found: false, running: all.map((x) => x.animationName || x.transitionProperty) };
    const timing = a.effect.getComputedTiming();
    const dur = timing.duration;
    a.pause();
    const frames = fractions.map((f) => { a.currentTime = (timing.delay || 0) + f * dur; const cs = getComputedStyle(el); return { f, transform: cs.transform, opacity: cs.opacity, boxShadow: cs.boxShadow, borderColor: cs.borderColor }; });
    return { found: true, type: a.constructor.name, property: a.animationName || a.transitionProperty, durationMs: dur, iterations: timing.iterations, frames, anim: true };
  },
  // Finish a still-running entrance animation (slowed 10x) so it does not mask the transition being tested.
  settle(sel) { const el = document.querySelector(sel); for (const a of el?.getAnimations() || []) if (a.animationName && a.effect.getComputedTiming().iterations !== Infinity) a.finish(); },
  resume(sel) { const el = document.querySelector(sel); for (const a of el?.getAnimations() || []) { if (a.playState === 'paused') { if (a.effect.getComputedTiming().iterations === Infinity) a.play(); else a.finish(); } } },
  seek(sel, kind, name, f) {
    const el = document.querySelector(sel);
    const a = el?.getAnimations().find((x) => kind === 'animation' ? x.animationName === name : new RegExp(name).test(x.transitionProperty || ''));
    if (!a) return false; const t = a.effect.getComputedTiming(); a.pause(); a.currentTime = (t.delay || 0) + f * t.duration; return true;
  },
  // Re-enter a state so its CSS animation is created again (e.g. the input error shake, which has no fill).
  reenter(sel, attr, from, to) { const el = document.querySelector(sel); el.setAttribute(attr, from); getComputedStyle(el).animationName; el.setAttribute(attr, to); return true; },
  // Restart a CSS animation that already finished (fill: backwards, so it is gone from getAnimations()).
  replay(sel) { const el = document.querySelector(sel); if (!el) return false; el.style.animationName = 'none'; getComputedStyle(el).animationName; el.style.animationName = ''; getComputedStyle(el).animationName; return true; },
  moving() {
    const re = ${MOVING};
    return document.getAnimations().filter((a) => a.playState !== 'finished').map((a) => {
      const el = a.effect && a.effect.target; const id = el ? (el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.dataset && el.dataset.component ? '[data-component=' + el.dataset.component + ']' : '')) : '?';
      if (a.animationName) return { el: id, what: 'animation ' + a.animationName, durationMs: a.effect.getComputedTiming().duration };
      if (a.transitionProperty && re.test(a.transitionProperty.trim())) return { el: id, what: 'transition ' + a.transitionProperty, durationMs: a.effect.getComputedTiming().duration };
      return null;
    }).filter(Boolean);
  },
};`;

const differs = (frames, keys) => frames.some((fr) => keys.some((k) => fr[k] !== frames[0][k]));
const SEL = {
  card: '[data-component="card"]',
  cardInteractive: '[data-component="card"][data-interactive]',
  badge: '[data-component="badge"]',
  inputError: '[data-component="input"][data-variant="error"]',
  inputAny: '[data-component="input"] input:not([disabled])',
  button: '[data-component="button"]:not([disabled]):not([aria-disabled="true"]):not([aria-pressed]):not(#play-motion)',
  spinner: '[data-component="button"] [data-part="spinner"]',
  play: '#play-motion',
};

export async function motionCheck({ target, strip = null } = {}) {
  let chromium;
  try { ({ chromium } = await import('@playwright/test')); } catch { const e = new Error('Playwright is not installed: run npm --prefix design-build ci && npx --prefix design-build playwright install chromium'); e.code = 2; throw e; }
  const where = findProject(DS, null);
  let server = null, url = target;
  if (!url || !/^https?:\/\//.test(url)) {
    server = await serve(where.project);
    const file = path.resolve(target || path.join(HERE, 'preview/index.html'));
    url = `http://127.0.0.1:${server.address().port}/${path.relative(where.project, file).split(path.sep).join('/')}`;
  }
  const browser = await chromium.launch();
  const results = { url, motion: [], reduced: [], consoleErrors: [], pass: true };
  const check = (list, name, ok, detail) => { list.push({ name, ok, ...detail }); if (!ok) results.pass = false; };
  try {
    // ---------------- motion allowed ----------------
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'no-preference' });
      const page = await ctx.newPage();
      page.on('console', (m) => { if (m.type() === 'error') results.consoleErrors.push(m.text()); });
      page.on('pageerror', (e) => results.consoleErrors.push(e.message));
      await page.addInitScript(PAGE_HELPERS);
      const resp = await page.goto(url, { waitUntil: 'load' });
      if (!resp || !resp.ok()) { const e = new Error(`could not load ${url} (${resp ? resp.status() : 'no response'})`); e.code = 2; throw e; }
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Animation.enable');
      await cdp.send('Animation.setPlaybackRate', { playbackRate: 0.1 });
      const has = async (s) => (await page.locator(s).count()) > 0;
      const counts = {}; for (const k of ['card', 'badge', 'inputAny', 'button']) counts[k] = await page.locator(SEL[k]).count();
      if (!Object.values(counts).some(Boolean)) { const e = new Error(`no shipped components (data-component="button|input|card|badge") found on ${url}`); e.code = 2; throw e; }
      results.components = counts;
      const F = [0, 0.25, 0.5, 0.75, 1];
      const snap = async (name, sel, kind, prop) => {
        if (!strip) return;
        fs.mkdirSync(strip, { recursive: true });
        for (const f of F) { if (await page.evaluate(([s, k, n, f]) => __motion.seek(s, k, n, f), [sel, kind, prop, f])) await page.locator(sel).first().screenshot({ path: path.join(strip, `${name}-${String(f * 100).padStart(3, '0')}.png`), animations: 'allow' }); }
      };
      const anim = async (name, sel, keyframes, keys, replay = true) => {
        if (!(await has(sel))) return check(results.motion, name, true, { skipped: `no ${sel} on the page` });
        await page.locator(sel).first().scrollIntoViewIfNeeded();
        if (replay) await page.evaluate((s) => __motion.replay(s), sel);
        await snap(name, sel, 'animation', keyframes);
        if (replay) await page.evaluate((s) => __motion.replay(s), sel);
        const r = await page.evaluate(([s, n, f]) => __motion.sample(s, 'animation', n, f), [sel, keyframes, [0, 0.2, 0.5]]);
        await page.evaluate((s) => __motion.resume(s), sel);
        check(results.motion, name, !!r?.found && differs(r.frames, keys), r || {});
      };
      const trans = async (name, sel, act, prop, keys, release) => {
        if (!(await has(sel))) return check(results.motion, name, true, { skipped: `no ${sel} on the page` });
        await page.locator(sel).first().scrollIntoViewIfNeeded();
        await page.mouse.move(0, 0); await page.waitForTimeout(50);
        await page.evaluate((s) => __motion.settle(s), sel);
        await act(page.locator(sel).first());
        const r = await page.evaluate(([s, p, f]) => __motion.sample(s, 'transition', p, f), [sel, prop, [0, 0.5, 1]]);
        await page.evaluate((s) => __motion.resume(s), sel);
        if (release) await release();
        check(results.motion, name, !!r?.found && differs(r.frames, keys), r || {});
      };
      await anim('card-enter', SEL.card, 'ds-enter', ['transform', 'opacity']);
      await anim('badge-pop', SEL.badge, 'ds-pop', ['transform', 'opacity']);
      if (await has(SEL.inputError)) {
        await page.locator(SEL.inputError).first().scrollIntoViewIfNeeded();
        await page.evaluate((s) => __motion.reenter(s, 'data-variant', 'default', 'error'), SEL.inputError);
        await snap('input-shake', `${SEL.inputError} input`, 'animation', 'ds-shake');
        await page.evaluate((s) => __motion.reenter(s, 'data-variant', 'default', 'error'), SEL.inputError);
        const r = await page.evaluate(([s, f]) => __motion.sample(s, 'animation', 'ds-shake', f), [`${SEL.inputError} input`, [0, 0.1, 0.3]]);
        await page.evaluate((s) => __motion.resume(s), `${SEL.inputError} input`);
        check(results.motion, 'input-shake', !!r?.found && differs(r.frames, ['transform']), r || {});
      } else check(results.motion, 'input-shake', true, { skipped: 'no input in the error state on the page' });
      await anim('button-spinner', SEL.spinner, 'ds-spin', ['transform'], false);
      await trans('button-hover', SEL.button, (l) => l.hover(), 'transform', ['transform']);
      await trans('button-press', SEL.button, async (l) => { await l.hover(); await page.waitForTimeout(2000); await page.mouse.down(); }, 'transform', ['transform'], () => page.mouse.up());
      await trans('card-hover', SEL.cardInteractive, (l) => l.hover(), 'transform', ['transform']);
      await trans('input-focus', SEL.inputAny, (l) => l.focus(), 'box-shadow|border-color', ['boxShadow', 'borderColor']);
      if (await has(SEL.play)) {
        await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 });
        await page.locator(SEL.play).scrollIntoViewIfNeeded();
        const r = await page.evaluate(async (sel) => {
          const mover = document.querySelector('.mover:not(.fast):not(.slow)') || document.querySelector('.mover');
          const read = () => getComputedStyle(mover).transform;
          const t0 = read();
          document.querySelector(sel).click();
          const wait = (ms) => new Promise((r) => setTimeout(r, ms));
          await wait(90); const mid = read();
          await wait(900); const end = read();
          document.querySelector(sel).click(); await wait(900);
          return { frames: [{ t: 0, transform: t0 }, { t: 90, transform: mid }, { t: 990, transform: end }] };
        }, SEL.play);
        const [a, b, c] = r.frames.map((x) => x.transform);
        check(results.motion, 'play-motion', a !== b && b !== c && a !== c, r);
      } else check(results.motion, 'play-motion', true, { skipped: 'no #play-motion demo on the page' });
      await ctx.close();
    }
    // ---------------- reduced motion ----------------
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      page.on('pageerror', (e) => results.consoleErrors.push(e.message));
      await page.addInitScript(PAGE_HELPERS);
      await page.goto(url, { waitUntil: 'load' });
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Animation.enable');
      await cdp.send('Animation.setPlaybackRate', { playbackRate: 0.1 });
      const has = async (s) => (await page.locator(s).count()) > 0;
      const idle = async (name, act, transformSel) => {
        await page.mouse.move(0, 0); await page.waitForTimeout(30);
        await act();
        const moving = await page.evaluate(() => __motion.moving());
        const transform = transformSel ? await page.locator(transformSel).first().evaluate((e) => getComputedStyle(e).transform) : null;
        check(results.reduced, name, moving.length === 0 && (!transformSel || transform === 'none'), { moving, transform });
      };
      await idle('on-load (card-enter, badge-pop, spinner)', async () => {}, null);
      if (await has(SEL.inputError)) await idle('input-shake', () => page.evaluate((s) => __motion.reenter(s, 'data-variant', 'default', 'error'), SEL.inputError), `${SEL.inputError} input`);
      if (await has(SEL.button)) await idle('button-hover', () => page.locator(SEL.button).first().hover(), SEL.button);
      if (await has(SEL.button)) { await idle('button-press', async () => { await page.locator(SEL.button).first().hover(); await page.mouse.down(); }, SEL.button); await page.mouse.up(); }
      if (await has(SEL.cardInteractive)) await idle('card-hover', () => page.locator(SEL.cardInteractive).first().hover(), SEL.cardInteractive);
      if (await has(SEL.inputAny)) await idle('input-focus (color only is allowed)', () => page.locator(SEL.inputAny).first().focus(), null);
      // the demo still changes state under reduce — it jumps there with no transition, so nothing is "moving"
      if (await has(SEL.play)) await idle('play-motion (jumps, no transition)', () => page.locator(SEL.play).click(), null);
      await ctx.close();
    }
  } finally {
    await browser.close();
    server?.close();
  }
  if (results.consoleErrors.length) results.pass = false;
  return results;
}

async function main() {
  const argv = process.argv.slice(2);
  let target = null, json = false, strip = null;
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--url') target = argv[++i];
    else if (k === '--json') json = true;
    else if (k === '--strip') strip = path.resolve(argv[++i]);
    else if (k === '--root') i++;
    else if (k === '--help' || k === '-h') { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 22).map((l) => l.replace(/^\/\/ ?/, '')).join('\n')); return; }
    else if (k.startsWith('--')) { console.error(`motion: unknown flag ${k}`); process.exit(2); }
    else target = k;
  }
  let r;
  try { r = await motionCheck({ target, strip }); } catch (e) { console.error(`motion: ${e.message}`); process.exit(e.code === 2 ? 2 : 2); }
  if (json) { process.stdout.write(JSON.stringify(r, null, 2) + '\n'); process.exit(r.pass ? 0 : 1); }
  const fmt = (c) => {
    if (c.skipped) return `  skip ${c.name} (${c.skipped})`;
    const key = /box-shadow|border-color/.test(c.property || '') ? 'boxShadow' : 'transform';
    const fr = c.frames ? c.frames.map((f) => `${f.f ?? f.t}:${(f[key] || '').replace(/matrix\(([^)]*)\)/, (m, a) => `matrix(${a.split(',').map((n) => +(+n).toFixed(3)).join(',')})`)}${f.opacity && f.opacity !== '1' ? ` o${(+f.opacity).toFixed(2)}` : ''}`).join(' → ') : '';
    return `  ${c.ok ? 'ok  ' : 'FAIL'} ${c.name}${c.property ? ` [${c.type} ${c.property}, ${c.durationMs}ms${c.iterations === Infinity ? ' ∞' : ''}]` : ''}${fr ? `  ${fr}` : ''}${c.moving ? `  moving: ${c.moving.length ? c.moving.map((m) => `${m.el} ${m.what}`).join('; ') : 'none'}` : ''}${c.transform !== undefined && c.transform !== null ? `  transform: ${c.transform}` : ''}`;
  };
  console.log(`motion check: ${r.url}\nmotion allowed (animations slowed 10× and sampled paused):`);
  r.motion.forEach((c) => console.log(fmt(c)));
  console.log('prefers-reduced-motion: reduce:');
  r.reduced.forEach((c) => console.log(fmt(c)));
  if (r.consoleErrors.length) console.log(`console/page errors:\n  ${r.consoleErrors.join('\n  ')}`);
  if (strip) console.log(`frames: ${strip}`);
  const played = r.motion.filter((c) => !c.skipped);
  console.log(`\ndesign motion: ${r.pass ? 'PASS' : 'FAIL'} — ${played.filter((c) => c.ok).length}/${played.length} motions play, ${r.reduced.filter((c) => c.ok).length}/${r.reduced.length} reduced-motion checks still, ${r.consoleErrors.length} console error(s)`);
  process.exit(r.pass ? 0 : 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
