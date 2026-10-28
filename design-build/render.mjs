#!/usr/bin/env node
// render.mjs — screenshot + layout + accessibility harness for this design system.
//
// Usage (from the app root): node design-system/design-build/render.mjs [target ...] [--url <url>] [--app]
//          [--widths 390,768,1280 (default: tokens viewport.*)] [--themes light,dark] [--root <dir>]
//          [--out <dir>] [--reports <dir>] [--json] [--record] [--quiet] [--no-best-practice]
//   target       URL (http/https/file) or file path. Default: the design system's preview page.
//                File paths are served from the project root by a built-in static server, so relative links work.
//                An app that needs a build step (Vite, Next, …) must be rendered from its dev server instead:
//   --url <url>  render this URL, e.g. start `npm run dev` and pass --url http://localhost:5173/ (repeatable)
//   --app        render design-build/project.json → app_url
//   --root <dir> the project (app) root (default: git top level, else the nearest package.json above design-system/)
//   --record     write the results to design-build/state.yaml → checks.render and checks.a11y
//
// For each target × width × theme (prefers-color-scheme emulated, reduced motion on, animations disabled,
// fonts awaited) it saves design-build/screenshots/<page>-<width>-<theme>.png and checks:
//   overflow        the page scrolls sideways (fail)
//   off-viewport    a key element ([data-key], h1, main) or a control sits outside the viewport (fail)
//   overlap         two interactive elements overlap (fail)
//   tap-target      a target is smaller than 24×24 CSS px without the WCAG 2.5.8 spacing exception (fail;
//                   undersized but spaced, or inline in a sentence → warning)
//   focus-visible   Tab reaches a control that shows no outline or box-shadow when focused (fail)
//   reduced-motion  something still animates movement with reduced motion on (warning)
//   page-error      an uncaught exception on the page (fail)
//   load-error      the page, a script or a stylesheet failed to load, or a module script was refused (fail)
//   blank-page      the body has no visible text or media, e.g. the app never mounted (fail)
//   axe             axe-core with wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa: serious/critical → fail,
//                   moderate/minor → warning. The best-practice tag runs separately as warnings.
// Writes design-build/render-report.json and design-build/a11y-report.json (or into --reports <dir>).
// Exit: 0 pass · 1 fail · 2 harness error (e.g. Playwright not installed).
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gitHead, recordCheck } from './lib/context.mjs';
import { findProject, fixHint, projectConfig } from './lib/project.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DS = path.resolve(HERE, '..');
const rootArg = process.argv.indexOf('--root');
const WHERE = findProject(DS, rootArg > 0 ? process.argv[rootArg + 1] : null);
const ROOT = WHERE.project; // the static server serves the project root, which contains the design system
const hint = (s) => fixHint(WHERE, s);
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// Default widths come from tokens_file → viewport.* (§M1.3), falling back to 390/768/1280.
function tokenWidths() {
  try {
    const vp = JSON.parse(fs.readFileSync(path.join(DS, 'tokens/tokens.json'), 'utf8')).viewport || {};
    const w = ['mobile', 'tablet', 'desktop'].map((k) => vp[k]?.$value).filter((v) => v && v.unit === 'px' && v.value > 0).map((v) => v.value);
    return w.length ? w : null;
  } catch { return null; }
}

function parseArgs(argv) {
  const a = { targets: [], widths: tokenWidths() || [390, 768, 1280], themes: ['light', 'dark'], out: path.join(HERE, 'screenshots'), reports: HERE, json: false, record: false, quiet: false, bestPractice: true };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--widths') a.widths = argv[++i].split(',').map(Number);
    else if (k === '--themes') a.themes = argv[++i].split(',');
    else if (k === '--out') a.out = path.resolve(argv[++i]);
    else if (k === '--reports') a.reports = path.resolve(argv[++i]);
    else if (k === '--json') a.json = true;
    else if (k === '--record') a.record = true;
    else if (k === '--quiet') a.quiet = true;
    else if (k === '--no-best-practice') a.bestPractice = false;
    else if (k === '--url') { const u = argv[++i]; if (!/^https?:\/\//.test(u || '')) { console.error(`render: --url needs an http(s) URL, got "${u}"`); process.exit(2); } a.targets.push(u); }
    else if (k === '--app') { const u = projectConfig(DS).app_url; if (!u) { console.error(hint('render: --app needs "app_url" in design-build/project.json (e.g. "http://localhost:5173/"). Or pass --url <your dev-server URL>.')); process.exit(2); } a.targets.push(u); }
    else if (k === '--root') i++;
    else if (k === '--help' || k === '-h') { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 32).map((l) => l.replace(/^\/\/ ?/, '')).join('\n')); process.exit(0); }
    else if (k.startsWith('--')) { console.error(`render: unknown flag ${k}`); process.exit(2); }
    else a.targets.push(k);
  }
  if (!a.targets.length) a.targets.push(path.join(HERE, 'preview/index.html'));
  return a;
}

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };
function serve(root) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let f = path.join(root, p);
      if (!f.startsWith(root)) { res.writeHead(403).end(); return; }
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
      if (!fs.existsSync(f)) { res.writeHead(404).end('not found'); return; }
      res.writeHead(200, { 'content-type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
      fs.createReadStream(f).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function pageName(target) {
  try {
    const u = new URL(target);
    if (u.protocol === 'file:') return pageName(fileURLToPath(u));
    return (u.hostname + u.pathname).replace(/\/index\.html?$/, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'page';
  } catch {
    const rel = path.relative(ROOT, path.resolve(target)).replace(/\.[a-z]+$/i, '');
    const dsParts = new Set(['design-build', ...path.relative(ROOT, DS).split(path.sep).filter(Boolean)]);
    const parts = rel.split(path.sep).filter((p) => p && p !== '..' && !dsParts.has(p));
    if (parts.length > 1 && parts[parts.length - 1] === 'index') parts.pop();
    return parts.join('-').replace(/[^a-z0-9-]+/gi, '-').toLowerCase() || 'page';
  }
}

// Runs inside the page. Returns layout findings for one viewport.
function layoutProbe() {
  const vw = document.documentElement.clientWidth;
  const out = { overflow: null, offViewport: [], overlap: [], tapTargets: [], scrollWidth: document.documentElement.scrollWidth, viewport: vw };
  const sel = (el) => {
    if (el.id) return `#${el.id}`;
    let s = el.tagName.toLowerCase();
    if (el.dataset && el.dataset.component) s += `[data-component="${el.dataset.component}"]`;
    if (el.dataset && el.dataset.variant) s += `[data-variant="${el.dataset.variant}"]`;
    if (el.classList.length) s += '.' + [...el.classList].slice(0, 2).join('.');
    const txt = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
    return txt ? `${s} "${txt}"` : s;
  };
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const clippedByScroller = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') return true;
    }
    return false;
  };
  const offscreenByDesign = (el) => { const r = el.getBoundingClientRect(); return r.bottom <= 0 && el.matches('.skip-link, [class*="skip"]'); };

  if (out.scrollWidth > vw + 1) {
    const culprits = [];
    for (const el of document.body.querySelectorAll('*')) {
      if (!visible(el) || clippedByScroller(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 || r.left < -1) culprits.push({ el: sel(el), left: Math.round(r.left), right: Math.round(r.right) });
      if (culprits.length >= 8) break;
    }
    out.overflow = { scrollWidth: out.scrollWidth, viewport: vw, culprits };
  }

  const keys = new Set([...document.querySelectorAll('[data-key], h1, main')]);
  const interactive = [...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=link], [role=checkbox], [role=tab], [role=menuitem], [tabindex]:not([tabindex="-1"])')]
    .filter((el) => visible(el) && !offscreenByDesign(el));
  for (const el of keys) {
    if (!visible(el)) { out.offViewport.push({ el: sel(el), key: true, reason: 'not visible' }); continue; }
    const r = el.getBoundingClientRect();
    if (r.left < -1 || r.right > vw + 1) out.offViewport.push({ el: sel(el), key: true, left: Math.round(r.left), right: Math.round(r.right) });
  }
  for (const el of interactive) {
    if (keys.has(el) || clippedByScroller(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.left < -1 || r.right > vw + 1) out.offViewport.push({ el: sel(el), key: false, left: Math.round(r.left), right: Math.round(r.right) });
  }

  const rects = interactive.map((el) => ({ el, r: el.getBoundingClientRect() }));
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
    const a = rects[i], b = rects[j];
    if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
    const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
    const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
    if (w > 1 && h > 1) out.overlap.push({ a: sel(a.el), b: sel(b.el), area: Math.round(w * h) });
  }

  // WCAG 2.5.8 Target Size (Minimum): 24×24, or a 24px circle centred on the target that touches no other target.
  const MIN = 24;
  const inlineInText = (el) => {
    if (getComputedStyle(el).display !== 'inline') return false;
    const p = el.parentElement; if (!p) return false;
    const own = (p.textContent || '').replace(/\s+/g, ' ').trim().length, mine = (el.textContent || '').replace(/\s+/g, ' ').trim().length;
    return own > mine + 1;
  };
  for (const { el, r } of rects) {
    if (r.width >= MIN - 0.5 && r.height >= MIN - 0.5) continue;
    if (inlineInText(el)) { out.tapTargets.push({ el: sel(el), w: Math.round(r.width), h: Math.round(r.height), level: 'warning', reason: 'inline in a sentence (WCAG 2.5.8 exception)' }); continue; }
    const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
    const hits = rects.filter((o) => o.el !== el && !o.el.contains(el) && !el.contains(o.el)).some(({ r: o }) => {
      const nx = Math.max(o.left, Math.min(cx, o.right)), ny = Math.max(o.top, Math.min(cy, o.bottom));
      return Math.hypot(nx - cx, ny - cy) < MIN / 2;
    });
    out.tapTargets.push({ el: sel(el), w: Math.round(r.width), h: Math.round(r.height), level: hits ? 'error' : 'warning', reason: hits ? 'under 24×24 and too close to another target' : 'under 24×24 but spaced (WCAG 2.5.8 spacing exception)' });
  }
  return out;
}

// Runs inside the page: is there anything to look at? (An app whose script failed renders an empty <div id="root">.)
function contentProbe() {
  const b = document.body;
  if (!b) return { blank: true, text: 0, media: 0 };
  const text = (b.innerText || '').trim().length;
  const media = [...b.querySelectorAll('img, svg, canvas, video, iframe, input, button, select, textarea, object, embed')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).length;
  return { blank: text === 0 && media === 0, text, media };
}

function motionProbe() {
  const moving = /transform|translate|scale|rotate|all|left|top|right|bottom|inset|margin|width|height/;
  const found = [];
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    const anim = cs.animationName !== 'none' && cs.animationName && parseFloat(cs.animationDuration) > 0.01;
    const durs = cs.transitionDuration.split(',').map(parseFloat), props = cs.transitionProperty.split(',').map((s) => s.trim());
    const tr = props.some((p, i) => moving.test(p) && (durs[i % durs.length] || 0) > 0.01);
    if (anim || tr) found.push({ el: el.id ? `#${el.id}` : el.tagName.toLowerCase() + (el.classList.length ? '.' + [...el.classList].join('.') : ''), animation: anim ? cs.animationName : null, transition: tr ? cs.transitionProperty : null });
    if (found.length >= 10) break;
  }
  return found;
}

async function focusWalk(page, limit = 80) {
  const missing = [], seen = new Set();
  let stops = 0;
  await page.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); window.scrollTo(0, 0); });
  for (let i = 0; i < limit; i++) {
    await page.keyboard.press('Tab');
    const f = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return null;
      const cs = getComputedStyle(el);
      const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
      const ring = cs.boxShadow && cs.boxShadow !== 'none';
      const key = el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}:${(el.getAttribute('aria-label') || el.textContent || el.getAttribute('href') || '').trim().slice(0, 30)}`;
      return { key, visibleFocus: outline || ring };
    });
    if (!f) break;
    if (seen.has(f.key)) break;
    seen.add(f.key); stops++;
    if (!f.visibleFocus) missing.push(f.key);
  }
  return { stops, missing };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  let chromium, AxeBuilder;
  try {
    ({ chromium } = await import('@playwright/test'));
    AxeBuilder = (await import('@axe-core/playwright')).default;
  } catch (e) {
    console.error(hint('render: Playwright or axe is not installed. Run:\n  npm --prefix design-build ci && npx --prefix design-build playwright install chromium   (add --with-deps on a fresh Linux box)\n') + e.message);
    process.exit(2);
  }
  fs.mkdirSync(opts.out, { recursive: true });
  const server = await serve(ROOT);
  const base = `http://127.0.0.1:${server.address().port}`;
  const resolveTarget = (t) => {
    if (/^https?:\/\//.test(t)) return t;
    const f = t.startsWith('file:') ? fileURLToPath(t) : path.resolve(t);
    if (!fs.existsSync(f)) throw new Error(`target not found: ${t}`);
    const rel = path.relative(ROOT, f);
    return rel.startsWith('..') ? pathToFileURL(f).href : `${base}/${rel.split(path.sep).map(encodeURIComponent).join('/')}`;
  };

  let browser;
  try { browser = await chromium.launch(); }
  catch (e) { server.close(); console.error(hint('render: could not launch Chromium. Run: npx --prefix design-build playwright install chromium (add --with-deps on Linux)\n') + e.message.split('\n')[0]); process.exit(2); }

  const runs = [], a11yRuns = [];
  const failures = [], warnings = [];
  for (const target of opts.targets) {
    const url = resolveTarget(target), name = pageName(target);
    sizes: for (const width of opts.widths) for (const theme of opts.themes) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: 'reduce', deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      const consoleErrors = [], pageErrors = [], loadErrors = [];
      page.on('pageerror', (e) => pageErrors.push(String(e.message || e).split('\n')[0]));
      page.on('console', (m) => {
        if (m.type() !== 'error') return;
        const t = m.text();
        if (/Failed to load module script|Refused to execute script|Cross origin requests are only supported|blocked by CORS/i.test(t)) loadErrors.push(t.split('\n')[0].slice(0, 200));
        else consoleErrors.push(t);
      });
      const critical = new Set(['document', 'script', 'stylesheet']);
      page.on('requestfailed', (r) => { if (critical.has(r.resourceType())) loadErrors.push(`${r.resourceType()} ${r.url()} failed: ${r.failure()?.errorText || 'error'}`); });
      page.on('response', (r) => { const t = r.request().resourceType(); if (critical.has(t) && r.status() >= 400) loadErrors.push(`${t} ${r.url()} returned HTTP ${r.status()}`); });
      const id = `${name}-${width}-${theme}`;
      const run = { id, target, url, width, theme, screenshot: null, checks: {} };
      try {
        try { await page.goto(url, { waitUntil: 'load', timeout: 30000 }); }
        catch (e) {
          const refused = /ERR_CONNECTION_REFUSED|ECONNREFUSED|ERR_NAME_NOT_RESOLVED/.test(e.message);
          throw new Error(refused ? `nothing is listening at ${url}. Start the app's dev server first (e.g. npm run dev) and pass the URL it prints: --url <url>` : e.message.split('\n')[0]);
        }
        if (/^https?:/.test(url)) await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        await page.evaluate(() => document.fonts && document.fonts.ready);
        const content = await page.evaluate(contentProbe);
        const motion = await page.evaluate(motionProbe);
        await page.addStyleTag({ content: '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;transition-delay:0s!important;scroll-behavior:auto!important;caret-color:transparent!important}' });
        await page.evaluate(() => document.fonts && document.fonts.ready);
        const layout = await page.evaluate(layoutProbe);
        const shot = path.join(opts.out, `${id}.png`);
        await page.screenshot({ path: shot, fullPage: true, animations: 'disabled' });
        run.screenshot = path.relative(ROOT, shot).split(path.sep).join('/');
        const focus = await focusWalk(page);
        await page.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); window.scrollTo(0, 0); });

        const add = (list, check, msg, detail) => list.push({ id, check, message: msg, detail });
        if (layout.overflow) add(failures, 'overflow', `page is ${layout.overflow.scrollWidth}px wide in a ${layout.overflow.viewport}px viewport. Fix: let the widest element wrap or shrink (min(100%, …), flex-wrap), or put wide content (tables, code) in an overflow-x:auto container`, layout.overflow.culprits);
        for (const o of layout.offViewport) add(failures, 'off-viewport', `${o.el} is outside the viewport${o.reason ? ` (${o.reason})` : ` (left ${o.left}, right ${o.right})`}. Fix: keep it inside the layout at ${width}px`, o);
        for (const o of layout.overlap) add(failures, 'overlap', `${o.a} overlaps ${o.b} (${o.area}px²). Fix: add a gap or let them wrap`, o);
        for (const t of layout.tapTargets) add(t.level === 'error' ? failures : warnings, 'tap-target', `${t.el} is ${t.w}×${t.h}px: ${t.reason}. Fix: min-block-size and min-inline-size var(--size-target-min)`, t);
        for (const m of focus.missing) add(failures, 'focus-visible', `${m} shows no visible focus style. Fix: :focus-visible { outline: var(--border-width-thick) solid var(--color-focus) }`);
        for (const m of motion) add(warnings, 'reduced-motion', `${m.el} still moves with reduced motion on (${m.animation || m.transition}). Fix: wrap it in @media (prefers-reduced-motion: no-preference) or set transition: none under reduce`, m);
        for (const e of pageErrors) add(failures, 'page-error', `uncaught error on the page: ${e}. Fix: open the page in a browser, read the console and fix the exception`);
        for (const e of [...new Set(loadErrors)]) add(failures, 'load-error', `${e.replace(/\.+$/, '')}. Fix: ${/module script|MIME|\.(tsx?|jsx|vue|svelte)\b/i.test(e) ? 'this page needs a build step: start the dev server (npm run dev) and render its URL with --url' : 'make the file load (path, server, CORS)'}`);
        if (content.blank) add(failures, 'blank-page', `the page has no visible text or media${pageErrors.length || loadErrors.length ? ' (see the errors above)' : ''}. Fix: ${!/^https?:\/\//.test(target) ? 'if this is an app that needs a build step, start its dev server and render --url <dev-server URL>; otherwise check the page actually renders content' : 'the app rendered nothing at this URL: check the browser console, the route, and that the root component returns markup'}`);
        for (const e of consoleErrors) add(warnings, 'console', `console error: ${e}`);
        run.checks = { overflow: !layout.overflow, offViewport: layout.offViewport.length, overlap: layout.overlap.length, tapTargetErrors: layout.tapTargets.filter((t) => t.level === 'error').length, tapTargetWarnings: layout.tapTargets.filter((t) => t.level !== 'error').length, focusStops: focus.stops, focusMissing: focus.missing.length, reducedMotionWarnings: motion.length, consoleErrors: consoleErrors.length, pageErrors: pageErrors.length, loadErrors: loadErrors.length, blank: content.blank, textChars: content.text };

        const wcag = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
        const bp = opts.bestPractice ? await new AxeBuilder({ page }).withTags(['best-practice']).analyze() : { violations: [] };
        const slim = (v) => ({ rule: v.id, impact: v.impact, help: v.help, helpUrl: v.helpUrl, tags: v.tags.filter((t) => /^wcag|best/.test(t)), nodes: v.nodes.slice(0, 10).map((n) => ({ target: n.target.join(' '), summary: (n.failureSummary || '').split('\n').slice(0, 3).join(' ') })), count: v.nodes.length });
        const a = { id, url, width, theme, violations: wcag.violations.map(slim), bestPractice: bp.violations.map(slim), incomplete: wcag.incomplete.map((v) => ({ rule: v.id, help: v.help, count: v.nodes.length })), passes: wcag.passes.length };
        a11yRuns.push(a);
        for (const v of a.violations) add(['serious', 'critical'].includes(v.impact) ? failures : warnings, `axe:${v.rule}`, `${v.impact}: ${v.help} (${v.count} node${v.count === 1 ? '' : 's'}, first: ${v.nodes[0]?.target}). Fix: ${v.helpUrl}`, v.nodes);
        for (const v of a.bestPractice) add(warnings, `axe-bp:${v.rule}`, `best practice: ${v.help} (${v.count}, first: ${v.nodes[0]?.target})`);
      } catch (e) {
        failures.push({ id, check: 'harness', message: `could not render ${url}: ${e.message.split('\n')[0]}` });
        if (/nothing is listening/.test(e.message)) { runs.push(run); await ctx.close(); break sizes; }
      }
      runs.push(run);
      await ctx.close();
    }
  }
  await browser.close();
  server.close();

  const commit = gitHead(ROOT), at = new Date().toISOString();
  for (const w of WHERE.warnings) warnings.push({ id: '-', check: 'layout', message: w });
  const axeFail = failures.filter((f) => f.check.startsWith('axe:')).length;
  const layoutFail = failures.length - axeFail;
  const incomplete = a11yRuns.reduce((n, r) => n + r.incomplete.length, 0);
  const renderReport = { tool: 'design-build/render.mjs', commit, at, ok: layoutFail === 0, project_root: ROOT, targets: opts.targets, widths: opts.widths, themes: opts.themes, runs, failures: failures.filter((f) => !f.check.startsWith('axe:')), warnings: warnings.filter((w) => !w.check.startsWith('axe')) };
  const a11yReport = { tool: 'design-build/render.mjs (axe-core via @axe-core/playwright)', commit, at, ok: axeFail === 0, tags: WCAG_TAGS, failOn: ['serious', 'critical'], note: 'Automated checks find only part of WCAG. The manual checks in core §11 still need a person (checks.a11y.manual).', runs: a11yRuns };
  fs.mkdirSync(opts.reports, { recursive: true });
  fs.writeFileSync(path.join(opts.reports, 'render-report.json'), JSON.stringify(renderReport, null, 2) + '\n');
  fs.writeFileSync(path.join(opts.reports, 'a11y-report.json'), JSON.stringify(a11yReport, null, 2) + '\n');
  if (opts.record) {
    const target = opts.targets.length === 1 ? (/^https?:/.test(opts.targets[0]) ? opts.targets[0] : path.relative(ROOT, path.resolve(opts.targets[0])).split(path.sep).join('/')) : `${opts.targets.length} targets`;
    recordCheck(DS, 'render', { status: layoutFail ? 'fail' : 'pass', commit, at, failures: layoutFail, screenshots: runs.filter((r) => r.screenshot).length, target });
    recordCheck(DS, 'a11y', { status: axeFail ? 'fail' : 'pass', commit, at, serious_or_critical: axeFail, manual: `${incomplete} axe needs-review item(s); core §11 manual checks pending` });
  }
  const ok = failures.length === 0;
  if (opts.json) console.log(JSON.stringify({ ok, failures, warnings, screenshots: runs.map((r) => r.screenshot) }, null, 2));
  else {
    const byId = (list) => list.forEach((f) => console.log(`${f.id}  ${f.check}  ${f.message}`));
    if (failures.length) { console.log('FAILURES'); byId(failures); }
    if (warnings.length && !opts.quiet) { console.log('WARNINGS'); byId(warnings); }
    console.log(`\ndesign render: ${ok ? 'PASS' : 'FAIL'} — ${layoutFail} layout failure(s), ${axeFail} serious/critical axe issue(s), ${warnings.length} warning(s) · ${runs.filter((r) => r.screenshot).length} screenshots in ${path.relative(process.cwd(), opts.out) || '.'} · ${incomplete} axe needs-review item(s) · reports: ${path.relative(process.cwd(), path.join(opts.reports, 'render-report.json'))}, ${path.relative(process.cwd(), path.join(opts.reports, 'a11y-report.json'))}`);
  }
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error('render: ' + (e.stack || e)); process.exit(2); });
