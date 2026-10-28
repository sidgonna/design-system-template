#!/usr/bin/env node
// Drives the live board (board.mjs --serve) in a sandbox copy for test/run.mjs: node test/live-check.mjs <dir> [server|browser]
// server:  the real CLI on a random port; a save rebuilds tokens.css + the board and sends an SSE reload naming the
//          changed tiles; served HTML carries the client snippet and the file on disk does not; bad JSON keeps the
//          last good board and sends a problem with file:line; the next good save recovers; a busy port tries the
//          next one; --poll works; Ctrl+C (SIGINT) exits 0.
// browser: Playwright: the page reloads by itself, keeps its scroll, shows the toast and outlines the changed
//          tile; a broken file shows the banner over the last good board; fixing it removes the banner.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import { spawn } from 'node:child_process';

const dir = path.resolve(process.argv[2] || '.');
const mode = process.argv[3] || 'server';
const BOARD = path.join(dir, 'design-build/board.mjs');
const HTML = path.join(dir, 'design-build/preview/index.html');
const fail = (m) => { console.error(m); process.exitCode = 1; throw new Error(m); };
const ok = (c, m) => { if (!c) fail(m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const edit = (rel, fn) => { const p = path.join(dir, rel); fs.writeFileSync(p, fn(fs.readFileSync(p, 'utf8'))); };
const get = (url) => new Promise((res, rej) => http.get(url, (r) => { let b = ''; r.on('data', (c) => (b += c)); r.on('end', () => res({ status: r.statusCode, headers: r.headers, body: b })); }).on('error', rej));

function start(...args) {
  const child = spawn(process.execPath, [BOARD, '--serve', ...args], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  child.stdout.on('data', (c) => (out += c)); child.stderr.on('data', (c) => (out += c));
  const ready = new Promise((resolve, reject) => {
    const t = setInterval(() => { const m = out.match(/Design board:\s+(http:\/\/localhost:(\d+)\/)\S*/); if (m) { clearInterval(t); resolve({ url: m[1], port: Number(m[2]) }); } }, 25);
    child.on('exit', (c) => { clearInterval(t); reject(new Error(`server exited ${c}:\n${out}`)); });
    setTimeout(() => { clearInterval(t); reject(new Error(`server did not start:\n${out}`)); }, 8000);
  });
  return { child, ready, log: () => out };
}
function events(url) {
  const list = [];
  const waiters = [];
  const req = http.get(`${url}__live/events`, (r) => {
    let buf = '';
    r.on('data', (c) => {
      buf += c;
      let i; while ((i = buf.indexOf('\n\n')) >= 0) {
        const raw = buf.slice(0, i); buf = buf.slice(i + 2);
        const ev = raw.match(/^event: (.+)$/m), data = raw.match(/^data: (.+)$/m);
        if (ev && data) { const e = { event: ev[1], data: JSON.parse(data[1]) }; list.push(e); waiters.forEach((w) => w()); }
      }
    });
  });
  const wait = (pred, ms = 4000) => new Promise((resolve, reject) => {
    const from = list.length;
    const check = () => { const hit = list.slice(from).find(pred); if (hit) { resolve(hit); return true; } return false; };
    if (check()) return;
    const w = () => check() && clearTimeout(t);
    waiters.push(w);
    const t = setTimeout(() => reject(new Error(`no matching event within ${ms}ms; got ${JSON.stringify(list.slice(from))}`)), ms);
  });
  return { list, wait, close: () => req.destroy() };
}
const stop = (s) => new Promise((resolve) => { const t = setTimeout(() => { s.child.kill('SIGKILL'); resolve(null); }, 4000); s.child.on('exit', (c) => { clearTimeout(t); resolve(c); }); s.child.kill('SIGINT'); });
const recolor = (s) => s.replaceAll('#0b5d52', '#0b5d60').replaceAll('0.3216]', '0.3765]');

let current = null;
async function server() {
  const s = current = start('--port', '0');
  const { url } = await s.ready;
  const ev = events(url);
  await ev.wait((e) => e.event === 'hello');
  const page = await get(`${url}design-build/preview/`);
  ok(page.status === 200 && page.body.includes('/__live/client.js') && page.body.includes('window.__BOARD_LIVE'), 'served board has no live snippet');
  ok(page.headers['cache-control'] === 'no-store', 'served board is cacheable');
  ok(!fs.readFileSync(HTML, 'utf8').includes('__live'), 'the committed preview/index.html contains the live snippet');
  ok((await get(`${url}__live/client.js`)).body.includes('EventSource'), 'no client script');

  // a token colour: tokens.css and the board are rebuilt, a reload names the colour tile
  const JSONF = path.join(dir, 'design-build/preview/board.json');
  const before = fs.readFileSync(JSONF, 'utf8');
  edit('tokens/tokens.json', recolor);
  let r = await ev.wait((e) => e.event === 'reload');
  ok(fs.readFileSync(path.join(dir, 'design-build/preview/tokens.css'), 'utf8').includes('#0b5d60'), 'tokens.css was not regenerated');
  ok(fs.readFileSync(JSONF, 'utf8') !== before, 'the board was not regenerated');
  ok(r.data.changed.some((t) => t.id === 's4') && r.data.files.includes('tokens/tokens.json'), `reload does not name the §4 colour tile: ${JSON.stringify(r.data)}`);

  // a §1 value in core.md
  const core = fs.readFileSync(path.join(dir, 'design/core.md'), 'utf8');
  edit('design/core.md', (t) => t.replace('purpose: "{{Why the brand exists, one sentence}}"', 'purpose: "Make every design review a two-minute read"'));
  r = await ev.wait((e) => e.event === 'reload');
  ok(r.data.files.includes('design/core.md') && r.data.changed.some((t) => t.id === 's1'), `§1 edit not reported: ${JSON.stringify(r.data)}`);
  ok(fs.readFileSync(HTML, 'utf8').includes('two-minute read'), 'the §1 value is not on the board');

  // broken YAML in a design file: a problem at design/core.md:<line>, then recovery
  edit('design/core.md', (t) => t.replace('  promise: "', '   promise: "'));
  let p = await ev.wait((e) => e.event === 'problem' && e.data.problems.length > 0);
  const yLine = core.split('\n').findIndex((l) => l.startsWith('  promise: "')) + 1;
  ok(p.data.problems.some((x) => x.file === 'design/core.md' && x.line === yLine), `expected design/core.md:${yLine}, got ${JSON.stringify(p.data.problems)}`);
  edit('design/core.md', (t) => t.replace('   promise: "', '  promise: "'));
  await ev.wait((e) => e.event === 'reload');

  // bad JSON: a problem with file:line, the last good board stays on disk
  const good = fs.readFileSync(HTML, 'utf8');
  const inv = fs.readFileSync(path.join(dir, 'design-build/inventory.json'), 'utf8');
  fs.writeFileSync(path.join(dir, 'design-build/inventory.json'), inv.replace('"screens": {', '"screens": {,'));
  p = await ev.wait((e) => e.event === 'problem' && e.data.problems.length > 0);
  const hit = p.data.problems.find((x) => x.file === 'design-build/inventory.json');
  const want = inv.slice(0, inv.indexOf('"screens": {')).split('\n').length;
  ok(hit && hit.line === want, `expected design-build/inventory.json:${want}, got ${JSON.stringify(p.data.problems)}`);
  ok(fs.readFileSync(HTML, 'utf8') === good, 'a bad save overwrote the last good board');
  ok((await get(`${url}design-build/preview/`)).status === 200, 'the board is not served after a bad save');
  const ev2 = events(url);
  const hello = await ev2.wait((e) => e.event === 'hello');
  ok(hello.data.problems.length > 0, 'a tab opened during the problem is not told about it');
  ev2.close();

  // recovery
  fs.writeFileSync(path.join(dir, 'design-build/inventory.json'), inv.replace('"name": "Design board"', '"name": "Design board (live)"'));
  r = await ev.wait((e) => e.event === 'reload');
  ok(fs.readFileSync(HTML, 'utf8').includes('Design board (live)'), 'did not recover after the fix');
  ev.close();
  ok(await stop(s) === 0, `Ctrl+C did not exit 0:\n${s.log()}`);

  // a busy port tries the next one; --poll also rebuilds
  const busy = net.createServer().listen(0, '127.0.0.1');
  await new Promise((res) => busy.on('listening', res));
  const port = busy.address().port;
  const s2 = start('--port', String(port), '--poll');
  let got;
  try { got = await s2.ready; } catch (e) { busy.close(); throw e; }
  ok(got.port !== port && /in use, trying/.test(s2.log()), `busy port not skipped: ${s2.log()}`);
  ok(/polling/.test(s2.log()), '--poll not used');
  const ev3 = events(got.url);
  await ev3.wait((e) => e.event === 'hello');
  edit('tokens/tokens.json', (t) => t.replaceAll('#0b5d60', '#0b5d52').replaceAll('0.3765]', '0.3216]'));
  await ev3.wait((e) => e.event === 'reload', 5000);
  ev3.close(); busy.close();
  ok(await stop(s2) === 0, 'Ctrl+C did not exit 0 (poll)');
  console.log('live server ok');
}

async function browser() {
  const { chromium } = await import('playwright');
  const s = current = start('--port', '0');
  const { url } = await s.ready;
  const b = await chromium.launch();
  try {
    const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`${url}design-build/preview/`);
    await page.waitForFunction(() => document.documentElement.getAttribute('data-live') === 'on');
    await page.evaluate(() => window.scrollTo(0, 1600));
    await sleep(100);
    const y0 = await page.evaluate(() => window.scrollY);
    const nav = page.waitForEvent('load', { timeout: 5000 });
    const t0 = Date.now();
    edit('tokens/tokens.json', recolor);
    await nav;
    await page.waitForSelector('#live-toast:not([hidden])', { timeout: 3000 });
    const ms = Date.now() - t0;
    const st = await page.evaluate(() => ({ y: window.scrollY, toast: document.getElementById('live-toast').textContent, changed: document.querySelectorAll('.tile.live-changed').length }));
    ok(ms < 2500, `reload took ${ms}ms`);
    ok(Math.abs(st.y - y0) < 4, `scroll not kept: ${y0} → ${st.y}`);
    ok(/^Updated: /.test(st.toast) && st.changed > 0, `no toast or highlight: ${JSON.stringify(st)}`);
    const inv = fs.readFileSync(path.join(dir, 'design-build/inventory.json'), 'utf8');
    fs.writeFileSync(path.join(dir, 'design-build/inventory.json'), inv.replace('"screens": {', '"screens": {,'));
    await page.waitForSelector('#live-banner:not([hidden])', { timeout: 3000 });
    const banner = await page.textContent('#live-banner');
    ok(/design-build\/inventory\.json:\d+/.test(banner), `banner has no file:line: ${banner}`);
    ok(await page.locator('#tile-coverage').count() === 1, 'the last good board is gone');
    const nav2 = page.waitForEvent('load', { timeout: 5000 });
    fs.writeFileSync(path.join(dir, 'design-build/inventory.json'), inv);
    await nav2;
    await sleep(300);
    ok(await page.locator('#live-banner:not([hidden])').count() === 0, 'banner still shown after the fix');
    // canvas view: view, zoom and pan survive a reload
    await page.click('[data-view-choice="canvas"]');
    await page.evaluate(() => { window.boardCanvas.setZoom(0.5); const vp = document.getElementById('board-viewport'); vp.scrollLeft = 300; vp.scrollTop = 400; });
    const c0 = await page.evaluate(() => { const vp = document.getElementById('board-viewport'); return { z: window.boardCanvas.getZoom(), l: vp.scrollLeft, t: vp.scrollTop }; });
    const nav3 = page.waitForEvent('load', { timeout: 5000 });
    edit('design-build/inventory.json', (t) => t.replace('"name": "Design board"', '"name": "Design board (canvas)"'));
    await nav3;
    await page.waitForSelector('#live-toast:not([hidden])', { timeout: 3000 });
    const c1 = await page.evaluate(() => { const vp = document.getElementById('board-viewport'); return { view: document.documentElement.getAttribute('data-view'), z: window.boardCanvas.getZoom(), l: vp.scrollLeft, t: vp.scrollTop }; });
    ok(c1.view === 'canvas' && c1.z === c0.z && Math.abs(c1.l - c0.l) < 4 && Math.abs(c1.t - c0.t) < 4, `canvas state not kept: ${JSON.stringify(c0)} → ${JSON.stringify(c1)}`);
    console.log(`live browser ok (reload in ${ms}ms)`);
  } finally { await b.close(); await stop(s); }
}

(mode === 'browser' ? browser() : server()).catch((e) => { console.error(`${e.message}${current ? `\n--- server log ---\n${current.log()}` : ''}`); process.exit(1); }).then(() => process.exit(process.exitCode || 0));
