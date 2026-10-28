// The live board: `node design-build/board.mjs --serve` (watching is on by default; --no-watch serves files as they are).
// Zero dependencies. Watches the design files, tokens, inventory, ui-inventory, assets, components, state.yaml,
// review.json and the check reports; on a change (debounced) it rebuilds tokens.css/js/mjs, the board and the
// studies page in memory, writes them only when every input is valid, and tells open tabs to reload over
// Server-Sent Events. A tiny client script is added to served HTML only, never to the files on disk, so
// `board.mjs --check` and lint rule board-stale see the same bytes as a plain `node design-build/board.mjs`.
// A bad save (malformed JSON or YAML, a broken token alias) keeps the last good board on disk and on screen and
// shows a banner with file:line; the next good save recovers.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { loadContext } from './context.mjs';
import { parseYaml } from './yaml.mjs';
import { analyze } from './markdown.mjs';

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };
const SKIP_DIRS = new Set(['node_modules', '.git', 'screenshots', '.terrazzo', 'fixtures', 'dist', 'build', '.next']);
// Files the generators write: never a trigger (or every write would loop).
const GENERATED = [/^design-build\/preview\/(index\.html|board\.json|board\.md|tokens\.(css|js|mjs))$/, /^design-build\/studies\/index\.html$/, /^design-build\/studies\/directions\/[^/]+\.resolved\.json$/];
export const DEBOUNCE_MS = 200;
export const LIVE_PATH = '/__live';

const toPosix = (p) => p.split(path.sep).join('/');

/** Which files the live board watches, as root-relative posix paths or folder prefixes. */
export function watchSpec(root) {
  let assetRoot = 'assets', tokensRel = 'tokens/tokens.json', design = [];
  try { const ctx = loadContext(root); design = ctx.config?.design_files || []; tokensRel = ctx.tokensRel || tokensRel; assetRoot = String(ctx.index?.fm?.asset_root ?? 'assets').replace(/^\{\{|\}\}$/g, '').replace(/^\.\//, '').replace(/\/$/, '') || 'assets'; } catch { /* a bad file mid-edit: use the defaults */ }
  const files = ['design.md', ...design, tokensRel, 'design-build/inventory.json', 'design-build/state.yaml', 'design-build/review.json', 'design-build/project.json', 'design-build/lint.config.json',
    'design-build/render-report.json', 'design-build/a11y-report.json', 'design-build/motion-report.json', 'design-build/preview/preview.css', 'design-build/preview/preview.js'];
  const dirs = ['design', path.posix.dirname(tokensRel), 'ui-inventory', assetRoot, 'components', 'design-build/studies/directions'].filter((d) => d && d !== '.');
  return { files, dirs, tokensRel };
}

export function isWatched(rel, spec) {
  rel = toPosix(rel);
  if (GENERATED.some((re) => re.test(rel))) return false;
  if (rel.split('/').some((s) => SKIP_DIRS.has(s))) return false;
  if (spec.files.includes(rel)) return true;
  if (rel.startsWith(path.posix.dirname(spec.tokensRel) + '/') && rel.endsWith('.json')) return true;
  return spec.dirs.some((d) => rel.startsWith(d + '/'));
}

// ---------- validation: the board's parsers fall back silently, so check the inputs first and say file:line ----------
function lineCol(text, pos) {
  const before = text.slice(0, Math.max(0, Math.min(pos, text.length)));
  const lines = before.split('\n');
  return { line: lines.length, col: lines[lines.length - 1].length + 1 };
}
export function jsonProblem(rel, text) {
  try { JSON.parse(text); return null; } catch (e) {
    const m = String(e.message).match(/position (\d+)/) || [];
    const lc = m[1] !== undefined ? lineCol(text, Number(m[1])) : { line: text.split('\n').length, col: 1 };
    const lm = String(e.message).match(/line (\d+) column (\d+)/);
    if (lm) { lc.line = Number(lm[1]); lc.col = Number(lm[2]); }
    return { file: rel, line: lc.line, col: lc.col, message: `invalid JSON: ${String(e.message).replace(/\s*\(line \d+ column \d+\)/, '').replace(/\s*at position \d+/, '')}` };
  }
}
function yamlProblem(rel, text, startLine) {
  try { parseYaml(text, startLine); return null; } catch (e) {
    const m = String(e.message).match(/line (\d+)/);
    return { file: rel, line: m ? Number(m[1]) : startLine, message: `invalid YAML: ${String(e.message).replace(/^line \d+:\s*/, '')}` };
  }
}
/** Problems that would make the board silently wrong: unreadable JSON/YAML inputs and token errors. */
export function validate(root) {
  const out = [];
  const read = (rel) => { try { return fs.readFileSync(path.join(root, rel), 'utf8'); } catch { return null; } };
  const cfgText = read('design-build/lint.config.json');
  if (cfgText == null) return [{ file: 'design-build/lint.config.json', line: 1, message: 'missing' }];
  const cfgP = jsonProblem('design-build/lint.config.json', cfgText);
  if (cfgP) return [cfgP];
  const cfg = JSON.parse(cfgText);
  const spec = watchSpec(root);
  const json = new Set([spec.tokensRel, 'design-build/inventory.json', 'design-build/review.json', 'design-build/project.json']);
  for (const d of ['design-build/studies/directions']) {
    try { for (const f of fs.readdirSync(path.join(root, d))) if (f.endsWith('.json') && !f.endsWith('.resolved.json')) json.add(`${d}/${f}`); } catch { /* none */ }
  }
  const assetRoot = spec.dirs[3] || 'assets';
  json.add(`${assetRoot}/logo/logo.json`);
  for (const rel of json) { const t = read(rel); if (t != null) { const p = jsonProblem(rel, t); if (p) out.push(p); } }
  const st = read('design-build/state.yaml');
  if (st != null) { const p = yamlProblem('design-build/state.yaml', st, 1); if (p) out.push(p); }
  for (const rel of cfg.design_files || []) {
    const t = read(rel); if (t == null) continue;
    let a; try { a = analyze(t); } catch (e) { out.push({ file: rel, line: 1, message: String(e.message) }); continue; }
    if (a.frontMatter) { const p = yamlProblem(rel, a.frontMatter.text, a.frontMatter.startLine); if (p) out.push(p); }
    for (const blk of a.blocks || []) if (blk.lang === 'yaml') { const p = yamlProblem(rel, blk.text, blk.startLine); if (p) out.push(p); }
  }
  return out;
}
/** After a build throws, find the yaml block that caused it (the parsers report "line N" without the file). */
function locate(root, err) {
  const msg = String(err?.message || err);
  const lm = msg.match(/line (\d+)/);
  let cfg; try { cfg = JSON.parse(fs.readFileSync(path.join(root, 'design-build/lint.config.json'), 'utf8')); } catch { cfg = { design_files: [] }; }
  if (lm) {
    const n = Number(lm[1]);
    for (const rel of cfg.design_files || []) {
      let a; try { a = analyze(fs.readFileSync(path.join(root, rel), 'utf8')); } catch { continue; }
      for (const b of a.blocks || []) {
        if (b.lang !== 'yaml') continue;
        const end = b.startLine + b.text.split('\n').length;
        if (n >= b.startLine && n <= end) {
          // parse each top-level key on its own, as the board does
          const rows = b.text.split('\n');
          let s = 0;
          for (let r = 1; r <= rows.length; r++) if (r === rows.length || /^[A-Za-z_][\w-]*:/.test(rows[r])) {
            const p = yamlProblem(rel, rows.slice(s, r).join('\n'), b.startLine + s); if (p) return p; s = r;
          }
        }
      }
    }
  }
  const at = String(err?.stack || '').match(/\(?([^\s()]+\.m?js):(\d+):\d+\)?/);
  return { file: at ? toPosix(path.relative(root, at[1])) : 'design-build/board.mjs', line: at ? Number(at[2]) : 1, message: `could not build the board: ${msg}` };
}

// ---------- which tiles changed ----------
export function tileChunks(html) {
  const out = new Map();
  const re = /<article class="tile[^"]*" id="tile-([^"]+)"/g;
  const starts = [];
  let m; while ((m = re.exec(html))) starts.push([m.index, m[1]]);
  starts.forEach(([i, id], k) => { const end = k + 1 < starts.length ? starts[k + 1][0] : html.indexOf('</main>', i) > 0 ? html.indexOf('</main>', i) : html.length; out.set(id, html.slice(i, end)); });
  return out;
}
const titleOf = (chunk, id) => { const m = chunk.match(/<h3 id="tile-[^"]+-h">([\s\S]*?)<\/h3>/); return m ? m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim() : id; };
// Tiles whose specimens preview.js draws from tokens.js at load time (so their HTML does not change with a value).
const TOKEN_TARGETS = [['ramps', /^palette\./], ['swatches', /^color\.(?!data\.)/], ['pairings', /^color\./], ['type-scale', /^font\./], ['space-scale', /^space\./], ['shapes', /^(radius|shadow)\./], ['breakpoints', /^(breakpoint|viewport)\./], ['chart', /^color\.data\./], ['token-table', /./]];
/** Token paths whose value (any mode) differs between two { path → signature } maps. */
export function changedTokens(a, b) {
  if (!a || !b) return [];
  const out = [];
  for (const [k, v] of b) if (a.get(k) !== v) out.push(k);
  for (const k of a.keys()) if (!b.has(k)) out.push(k);
  return out;
}
/** Tiles that changed: their HTML differs, or they show a token whose value changed. In board order. */
export function changedTiles(oldHtml, newHtml, tokens = []) {
  const a = tileChunks(oldHtml || ''), b = tileChunks(newHtml);
  const out = [];
  for (const [id, c] of b) {
    let hit = a.get(id) !== c;
    if (!hit && tokens.length) {
      const text = c.replace(/<[^>]+>/g, '');
      hit = tokens.some((t) => text.includes(t) || text.includes(t.split('.').slice(0, -1).join('.') + '.*'))
        || TOKEN_TARGETS.some(([el, re]) => c.includes(` id="${el}"`) && tokens.some((t) => re.test(t)));
    }
    if (hit) out.push({ id, title: titleOf(c, id) });
  }
  return out;
}

// ---------- the browser side (served at /__live/client.js; styles are in preview.css: .live-toast, .live-banner, .live-changed) ----------
export const CLIENT = String.raw`(function () {
  'use strict';
  var KEY = 'board-live', cfg = window.__BOARD_LIVE || {}, root = document.documentElement;
  function $(id) { return document.getElementById(id); }
  function save(detail) {
    var vp = $('board-viewport'), z = window.boardCanvas && window.boardCanvas.getZoom ? window.boardCanvas.getZoom() : 1;
    var s = { path: location.pathname, x: window.scrollX, y: window.scrollY, vx: vp ? vp.scrollLeft : 0, vy: vp ? vp.scrollTop : 0, zoom: z, at: Date.now(), changed: detail && detail.changed || [], files: detail && detail.files || [], recovered: !!(detail && detail.recovered) };
    try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* storage blocked: reload without restoring */ }
  }
  function restore() {
    var s; try { s = JSON.parse(sessionStorage.getItem(KEY) || 'null'); sessionStorage.removeItem(KEY); } catch (e) { s = null; }
    if (!s || s.path !== location.pathname || Date.now() - s.at > 30000) return;
    if (window.boardCanvas && s.zoom && s.zoom !== 1) window.boardCanvas.setZoom(s.zoom);
    var vp = $('board-viewport');
    function put() { window.scrollTo(s.x, s.y); if (vp) { vp.scrollLeft = s.vx; vp.scrollTop = s.vy; } }
    put(); requestAnimationFrame(put);
    var names = [];
    (s.changed || []).forEach(function (t) {
      var tile = $('tile-' + t.id);
      if (tile) { tile.classList.add('live-changed'); setTimeout(function () { tile.classList.remove('live-changed'); }, 4000); }
      names.push(t.title);
    });
    var text = s.recovered && !names.length ? 'Fixed: the board is up to date again (' + ((s.files || []).slice(0, 2).join(', ') || 'the board') + ')'
      : names.length ? 'Updated: ' + names.slice(0, 3).join(', ') + (names.length > 3 ? ' and ' + (names.length - 3) + ' more' : '')
      : 'Updated: ' + ((s.files || []).slice(0, 2).join(', ') || 'the board');
    toast(text);
  }
  function toast(text) {
    var t = $('live-toast');
    if (!t) { t = document.createElement('div'); t.id = 'live-toast'; t.className = 'live-toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); }
    t.textContent = text; t.hidden = false;
    clearTimeout(toast.timer); toast.timer = setTimeout(function () { t.hidden = true; }, 6000);
  }
  function banner(problems) {
    var b = $('live-banner');
    if (!problems || !problems.length) { if (b) b.hidden = true; return; }
    if (!b) {
      b = document.createElement('div'); b.id = 'live-banner'; b.className = 'live-banner'; b.setAttribute('role', 'alert');
      var h = document.createElement('p'); h.className = 'live-banner-title'; b.appendChild(h);
      var ul = document.createElement('ul'); b.appendChild(ul);
      var close = document.createElement('button'); close.type = 'button'; close.className = 'tool'; close.textContent = 'Hide';
      close.addEventListener('click', function () { b.hidden = true; }); b.appendChild(close);
      document.body.appendChild(b);
    }
    b.querySelector('.live-banner-title').textContent = 'Not updated: fix this and save again. The board shows the last good version.';
    var list = b.querySelector('ul'); list.textContent = '';
    problems.slice(0, 6).forEach(function (p) {
      var li = document.createElement('li'), c = document.createElement('code');
      c.textContent = p.file + ':' + p.line + (p.col ? ':' + p.col : ''); li.appendChild(c);
      li.appendChild(document.createTextNode(' ' + p.message)); list.appendChild(li);
    });
    b.hidden = false;
    var t = $('live-toast'); if (t) t.hidden = true;
  }
  restore();
  if (!window.EventSource) return;
  var es = new EventSource('${LIVE_PATH}/events');
  es.addEventListener('hello', function (e) {
    var d = JSON.parse(e.data);
    if (cfg.build && d.build !== cfg.build) { save({ files: ['the board (rebuilt while this tab was away)'] }); location.reload(); return; }
    banner(d.problems);
  });
  es.addEventListener('reload', function (e) { var d = JSON.parse(e.data); save(d); location.reload(); });
  es.addEventListener('problem', function (e) { banner(JSON.parse(e.data).problems); });
  root.setAttribute('data-live', 'on');
})();
`;
export const snippet = (build) => `<script>window.__BOARD_LIVE = { build: ${JSON.stringify(String(build))} };</script><script src="${LIVE_PATH}/client.js" defer></script>`;
export const inject = (html, build) => (html.includes('</body>') ? html.replace(/<\/body>(?![\s\S]*<\/body>)/, `${snippet(build)}\n</body>`) : html + snippet(build));

// ---------- file watching: fs.watch per folder, polling as the fallback ----------
function walkDirs(abs, out) {
  let ents; try { ents = fs.readdirSync(abs, { withFileTypes: true }); } catch { return out; }
  out.push(abs);
  for (const e of ents) if (e.isDirectory() && !SKIP_DIRS.has(e.name)) walkDirs(path.join(abs, e.name), out);
  return out;
}
function snapshot(root, spec) {
  const m = new Map();
  const add = (abs) => { try { const s = fs.statSync(abs); if (s.isFile()) m.set(abs, `${s.mtimeMs}:${s.size}`); } catch { /* gone */ } };
  for (const f of spec.files) add(path.join(root, f));
  for (const d of [...spec.dirs, path.posix.dirname(spec.tokensRel)]) for (const dir of walkDirs(path.join(root, d), [])) {
    try { for (const e of fs.readdirSync(dir, { withFileTypes: true })) if (e.isFile()) add(path.join(dir, e.name)); } catch { /* gone */ }
  }
  return m;
}
export function watchFiles(root, onChange, { poll = false, interval = 400 } = {}) {
  let spec = watchSpec(root);
  const watchers = new Map();
  let timer = null;
  const emit = (rel) => { if (isWatched(rel, spec)) onChange(toPosix(rel)); };
  const dirsToWatch = () => {
    const set = new Set([root, path.join(root, 'design-build'), path.join(root, 'design-build/preview')]);
    for (const d of [...spec.dirs, path.posix.dirname(spec.tokensRel)]) for (const x of walkDirs(path.join(root, d), [])) set.add(x);
    // a watched folder that does not exist yet (e.g. studies/directions): watch its nearest parent so it is seen when created
    for (const d of spec.dirs) { let p = path.join(root, d); while (!fs.existsSync(p) && p !== root) p = path.dirname(p); set.add(p); }
    return set;
  };
  const sync = () => {
    const want = dirsToWatch();
    for (const [d, w] of watchers) if (!want.has(d)) { w.close(); watchers.delete(d); }
    for (const d of want) if (!watchers.has(d)) {
      try {
        const w = fs.watch(d, (ev, name) => {
          if (!name) return;
          const rel = path.relative(root, path.join(d, String(name)));
          if (ev === 'rename') { spec = watchSpec(root); try { sync(); } catch { /* fall through to the event */ } }
          emit(rel);
        });
        w.on('error', () => { w.close(); watchers.delete(d); });
        watchers.set(d, w);
      } catch (e) { throw e; }
    }
  };
  let mode = 'fs.watch';
  if (!poll) { try { sync(); } catch { for (const w of watchers.values()) w.close(); watchers.clear(); poll = true; } }
  if (poll) {
    mode = 'polling';
    let prev = snapshot(root, spec);
    timer = setInterval(() => {
      spec = watchSpec(root);
      const cur = snapshot(root, spec);
      for (const [f, v] of cur) if (prev.get(f) !== v) emit(path.relative(root, f));
      for (const f of prev.keys()) if (!cur.has(f)) emit(path.relative(root, f));
      prev = cur;
    }, interval);
  }
  return { mode, close() { for (const w of watchers.values()) w.close(); watchers.clear(); if (timer) clearInterval(timer); } };
}

// ---------- the server ----------
/**
 * Start the board server. opts: { port, watch, poll, rebuild(root) → { outputs: [[rel, content]], html, studiesHtml }, log }.
 * Resolves to { server, port, url, close(), rebuildNow(files) }.
 */
export function startLive(root, opts) {
  const { watch = true, poll = false, log = console.log, rebuild } = opts;
  const clients = new Set();
  let build = 0, problems = [], lastHtml = null, lastTokens = null, pending = new Set(), debounce = null, watcher = null;

  const send = (res, event, data) => { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); };
  const broadcast = (event, data) => { for (const c of clients) send(c, event, data); };

  function run(files) {
    const v = validate(root);
    if (v.length) { problems = v; broadcast('problem', { problems }); log(`board not updated: ${v.map((p) => `${p.file}:${p.line} ${p.message}`).join('; ')}`); return { ok: false, problems }; }
    let r;
    try { r = rebuild(root); } catch (e) { problems = [locate(root, e)]; broadcast('problem', { problems }); log(`board not updated: ${problems[0].file}:${problems[0].line} ${problems[0].message}`); return { ok: false, problems }; }
    if (r.problems?.length) { problems = r.problems; broadcast('problem', { problems }); log(`board not updated: ${problems.map((p) => `${p.file}:${p.line} ${p.message}`).join('; ')}`); return { ok: false, problems }; }
    let wrote = 0;
    for (const [rel, content] of r.outputs) {
      const abs = path.join(root, rel);
      if (!fs.existsSync(abs) || fs.readFileSync(abs, 'utf8') !== content) { fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, content); wrote++; }
    }
    const changed = lastHtml == null ? [] : changedTiles(lastHtml, r.html, changedTokens(lastTokens, r.tokens));
    lastHtml = r.html; lastTokens = r.tokens;
    const hadProblems = problems.length > 0;
    problems = [];
    const staticChange = [...files].some((f) => !/\.(md|json|yaml)$/.test(f) || f.startsWith('components/'));
    if (wrote || hadProblems || staticChange) {
      build++;
      broadcast('reload', { build: String(build), changed, files: [...files], recovered: hadProblems });
      if (files.size) log(`updated (${[...files].join(', ')})${changed.length ? ': ' + changed.map((t) => t.title).join(', ') : ''}`);
    } else broadcast('problem', { problems: [] });
    return { ok: true, wrote, changed };
  }

  function queue(rel) {
    pending.add(rel);
    clearTimeout(debounce);
    debounce = setTimeout(() => { const files = pending; pending = new Set(); run(files); }, DEBOUNCE_MS);
  }

  const first = watch ? run(new Set()) : { ok: true };
  if (!first.ok) log('serving the last good board until the problem above is fixed');

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === `${LIVE_PATH}/events`) {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
      res.write('retry: 1000\n\n');
      send(res, 'hello', { build: String(build), problems });
      clients.add(res);
      const ping = setInterval(() => res.write(': ping\n\n'), 15000);
      req.on('close', () => { clearInterval(ping); clients.delete(res); });
      return;
    }
    if (url.pathname === `${LIVE_PATH}/client.js`) { res.writeHead(200, { 'content-type': TYPES['.js'], 'cache-control': 'no-store' }); res.end(CLIENT); return; }
    let f = path.join(root, decodeURIComponent(url.pathname));
    if (f !== root && !f.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!fs.existsSync(f)) { res.writeHead(404, { 'content-type': 'text/plain' }).end('not found'); return; }
    const type = TYPES[path.extname(f)] || 'application/octet-stream';
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
    if (watch && path.extname(f) === '.html') { res.end(inject(fs.readFileSync(f, 'utf8'), build)); return; }
    fs.createReadStream(f).pipe(res);
  });

  return new Promise((resolve, reject) => {
    let port = opts.port ?? 4173, tries = 0;
    const listen = () => server.listen(port, '127.0.0.1');
    server.on('error', (e) => {
      if (e.code === 'EADDRINUSE' && port !== 0 && tries < 20) { log(`port ${port} is in use, trying ${port + 1}`); tries++; port++; setTimeout(listen, 50); }
      else reject(e);
    });
    server.on('listening', () => {
      const actual = server.address().port;
      if (watch) watcher = watchFiles(root, queue, { poll });
      const close = () => new Promise((done) => {
        clearTimeout(debounce); if (watcher) watcher.close();
        for (const c of clients) c.end();
        clients.clear();
        server.close(() => done());
        server.closeAllConnections?.();
      });
      resolve({ server, port: actual, url: `http://localhost:${actual}/`, watchMode: watcher?.mode || 'off', close, rebuildNow: (files = []) => run(new Set(files)) });
    });
    listen();
  });
}
