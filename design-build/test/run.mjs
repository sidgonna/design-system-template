#!/usr/bin/env node
// Self-test for the design checks. Zero dependencies: `node design-build/test/run.mjs`.
//   1. The template as shipped passes lint (exit 0, no errors).
//   2. Every file in fixtures/good lints clean; every file in fixtures/bad raises exactly the rule counts in its
//      first-line `expect: rule=n, rule=n` comment and no other error rule.
//   3. Mutation tests: copy the repo to a temp dir, break one thing, and check the matching rule fires
//      (contrast, unresolved doc token, raw doc value, ownership, tokens-sync/format/css-stale, seed cap,
//      kickstart sync, completion, justified avoid_defaults, --baseline, CLI exit codes and --json).
//   4. If Playwright is installed (or --render is passed): render.mjs fails fixtures/bad/layout.html for each
//      expected reason. Skipped with a notice otherwise (CI always installs it).
// Exit 0 when all pass, 1 otherwise.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BUILD = path.resolve(HERE, '..');
const ROOT = path.resolve(BUILD, '..');
const FIX = path.join(HERE, 'fixtures');
const { lint } = await import(path.join(BUILD, 'lint.mjs'));
const args = new Set(process.argv.slice(2));

let passed = 0, failed = 0;
const results = [];
function test(name, fn) {
  try { fn(); passed++; results.push(`  ok   ${name}`); }
  catch (e) { failed++; results.push(`  FAIL ${name}\n       ${String(e.message).split('\n').join('\n       ')}`); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const errorsOf = (res) => res.findings.filter((f) => f.severity === 'error');
const countBy = (fs_) => fs_.reduce((m, f) => ((m[f.rule] = (m[f.rule] || 0) + 1), m), {});
const show = (fs_) => fs_.map((f) => `${f.file}:${f.line} ${f.rule} ${f.message}`).join('\n') || '(none)';

// ---------- 1. template ----------
test('template as shipped: lint passes with 0 errors and 0 warnings', () => {
  const res = lint({ root: ROOT });
  const bad = res.findings.filter((f) => f.severity !== 'info');
  assert(bad.length === 0, `expected none, got:\n${show(bad)}`);
  assert(res.ctx.pairings.length > 0, 'no §4 pairings were checked');
});

// ---------- 2. fixtures ----------
for (const f of fs.readdirSync(path.join(FIX, 'good'))) test(`fixture good/${f}: no errors`, () => {
  const res = lint({ root: ROOT, src: [path.join(FIX, 'good', f)] });
  const e = errorsOf(res); assert(e.length === 0, show(e));
});
for (const f of fs.readdirSync(path.join(FIX, 'bad'))) {
  const first = fs.readFileSync(path.join(FIX, 'bad', f), 'utf8').split('\n').slice(0, 3).join(' ');
  const m = first.match(/\bexpect:\s*([^*>]+?)\s*(?:\*\/|-->|$)/);
  if (!m) continue; // render-only fixtures use expect-render
  const want = Object.fromEntries(m[1].split(',').map((s) => s.trim().split('=')).map(([r, n]) => [r, Number(n)]));
  test(`fixture bad/${f}: ${m[1]}`, () => {
    const res = lint({ root: ROOT, src: [path.join(FIX, 'bad', f)] });
    const got = countBy(errorsOf(res).filter((x) => x.file.includes('fixtures/bad/')));
    assert(JSON.stringify(Object.entries(got).sort()) === JSON.stringify(Object.entries(want).sort()), `want ${JSON.stringify(want)}, got ${JSON.stringify(got)}\n${show(errorsOf(res))}`);
    for (const e of errorsOf(res)) assert(/:\d+$/.test(`${e.file}:${e.line}`) && e.fix && e.message, `finding without file:line, message and fix: ${JSON.stringify(e)}`);
  });
}

// ---------- 3. mutations ----------
const COPY = ['design.md', 'design', 'tokens', 'design-build', 'KICKSTART.md', 'README.md'];
const SKIP = new Set(['node_modules', 'screenshots', '.terrazzo', 'fixtures']);
function copyDir(src, dst) {
  const st = fs.statSync(src);
  if (st.isFile()) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst); return; }
  for (const e of fs.readdirSync(src)) if (!SKIP.has(e)) copyDir(path.join(src, e), path.join(dst, e));
}
function sandbox(mutate) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'design-lint-'));
  for (const c of COPY) if (fs.existsSync(path.join(ROOT, c))) copyDir(path.join(ROOT, c), path.join(dir, c));
  fs.rmSync(path.join(dir, 'design-build/lint-baseline.json'), { force: true });
  const edit = (file, fn) => { const p = path.join(dir, file); fs.writeFileSync(p, fn(fs.readFileSync(p, 'utf8'))); };
  mutate({ dir, edit });
  return dir;
}
function expectRule(name, rule, mutate, opts = {}) {
  test(`mutation: ${name} → ${rule}`, () => {
    const dir = sandbox(mutate);
    try {
      const res = lint({ root: dir, ...opts });
      const hits = errorsOf(res).filter((f) => f.rule === rule);
      assert(hits.length > 0, `expected a ${rule} error, got:\n${show(errorsOf(res))}`);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
}
const setColor = (json, dotted, mode, hex) => {
  const t = JSON.parse(json);
  const node = dotted.split('.').reduce((o, k) => o[k], t);
  const comp = [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) / 255 * 1e4) / 1e4);
  const v = { colorSpace: 'srgb', components: comp, hex };
  node.$extensions.mode[mode] = v; if (mode === 'light') node.$value = v;
  return JSON.stringify(t, null, 2);
};

expectRule('text.secondary made faint in light mode', 'contrast', ({ edit }) => edit('tokens/tokens.json', (s) => setColor(s, 'color.text.secondary', 'light', '#c8c4be')));
expectRule('brand.primary made faint in dark mode', 'contrast', ({ edit }) => edit('tokens/tokens.json', (s) => setColor(s, 'color.brand.primary', 'dark', '#0b3d36')));
expectRule('tokens.json edited without core §13', 'tokens-sync', ({ edit }) => edit('tokens/tokens.json', (s) => setColor(s, 'color.accent', 'light', '#b93a0a')));
expectRule('tokens.json edited without regenerating tokens.css', 'tokens-css-stale', ({ edit }) => edit('tokens/tokens.json', (s) => setColor(s, 'color.accent', 'light', '#b93a0a')));
expectRule('dimension in mm', 'tokens-format', ({ edit }) => edit('tokens/tokens.json', (s) => s.replace('"1": { "$value": { "value": 4, "unit": "px" } }', '"1": { "$value": { "value": 4, "unit": "mm" } }')));
expectRule('themed color missing its dark mode', 'tokens-format', ({ edit }) => edit('tokens/tokens.json', (s) => { const t = JSON.parse(s); delete t.color.accent.$extensions.mode.dark; return JSON.stringify(t, null, 2); }));
expectRule('unknown token in a doc', 'unresolved-token', ({ edit }) => edit('design/core.md', (s) => s.replace(/\n## §6/, '\nUse `{color.brand.tertiary}` for links.\n\n## §6')));
expectRule('raw hex in a doc outside §13', 'raw-value', ({ edit }) => edit('design/core.md', (s) => s.replace(/\n## §6/, '\nHeadings are #1a1a1a.\n\n## §6')));
expectRule('a module redefines a core section', 'ownership-overlap', ({ edit }) => edit('design/digital-product.md', (s) => s + '\n## §4 Color\n\nOverride.\n'));
expectRule('README kickstart block drifts', 'kickstart-sync', ({ edit }) => edit('README.md', (s) => s.replace(/(```text\n[^\n]*\n)/, '$1EXTRA LINE\n')));
expectRule('a seed group over the cap', 'seed-cap', ({ edit }) => edit('design.md', (s) => s.replace(/(\n  components:\n)/, '$1' + Array.from({ length: 7 }, (_, i) => `    - { name: "Extra ${i}", url: "https://example.com/${i}", use_for: "test" }\n`).join(''))));
expectRule('phase 4 with the template still unfilled', 'completion', () => {}, { phase: 4 });
expectRule('§M1.1 names a component not in inventory.json', 'unknown-component', ({ edit }) => edit('design-build/inventory.json', (s) => { const j = JSON.parse(s); j.components = j.components.filter((c) => c.name !== 'Toast'); return JSON.stringify(j, null, 2); }));

test('mutation: a justified avoid_defaults entry turns its error into info', () => {
  const dir = sandbox(({ dir, edit }) => {
    edit('design/core.md', (s) => { const t = s.replace(/(id: sole-default-font,[^\n]*?justified: )""/, '$1"Brand guidelines mandate Inter (user, 2026-10-28)"'); if (t === s) throw new Error('could not set justified'); return t; });
    fs.mkdirSync(path.join(dir, 'design-build/studies'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'design-build/studies/a.css'), '.x { font-family: Inter, sans-serif; }\n');
  });
  try {
    const res = lint({ root: dir });
    const e = errorsOf(res).filter((f) => f.rule === 'avoid-default');
    assert(e.length === 0, `still an error after justification:\n${show(e)}`);
    assert(res.findings.some((f) => f.rule === 'avoid-default' && f.severity === 'info'), 'justified fingerprint was not reported as info');
    const before = sandbox(({ dir: d }) => { fs.mkdirSync(path.join(d, 'design-build/studies'), { recursive: true }); fs.writeFileSync(path.join(d, 'design-build/studies/a.css'), '.x { font-family: Inter, sans-serif; }\n'); });
    try { assert(errorsOf(lint({ root: before })).some((f) => f.rule === 'avoid-default'), 'unjustified Inter was not flagged'); } finally { fs.rmSync(before, { recursive: true, force: true }); }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

const node = process.execPath, LINT = (dir) => path.join(dir, 'design-build/lint.mjs');
test('CLI: --baseline freezes counts; a rising count fails, the same count passes, a drop prints the reminder', () => {
  const dir = sandbox(({ dir: d }) => { fs.mkdirSync(path.join(d, 'design-build/studies'), { recursive: true }); fs.writeFileSync(path.join(d, 'design-build/studies/a.css'), '.x { color: #ff0000; }\n'); });
  try {
    let r = spawnSync(node, [LINT(dir), '--quiet'], { encoding: 'utf8' });
    assert(r.status === 1, `expected exit 1 before baseline, got ${r.status}`);
    r = spawnSync(node, [LINT(dir), '--baseline'], { encoding: 'utf8' });
    assert(r.status === 0 && fs.existsSync(path.join(dir, 'design-build/lint-baseline.json')), `baseline not written: ${r.stdout}${r.stderr}`);
    r = spawnSync(node, [LINT(dir), '--quiet'], { encoding: 'utf8' });
    assert(r.status === 0 && /baselined/.test(r.stdout), `expected pass with baselined error, got ${r.status}\n${r.stdout}`);
    fs.appendFileSync(path.join(dir, 'design-build/studies/a.css'), '.y { color: #00ff00; }\n');
    r = spawnSync(node, [LINT(dir), '--quiet'], { encoding: 'utf8' });
    assert(r.status === 1 && /raw-value/.test(r.stdout), `expected fail when raw-value rose, got ${r.status}\n${r.stdout}`);
    fs.writeFileSync(path.join(dir, 'design-build/studies/a.css'), '.x { color: var(--color-text-primary); }\n');
    r = spawnSync(node, [LINT(dir), '--quiet'], { encoding: 'utf8' });
    assert(r.status === 0 && /counts dropped \(raw-value 1→0\)/.test(r.stdout), `expected the lower-the-baseline reminder, got ${r.status}\n${r.stdout}`);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('CLI: --json is valid JSON, exit 0 on the template; --src on a bad fixture exits 1', () => {
  let r = spawnSync(node, [path.join(BUILD, 'lint.mjs'), '--json'], { encoding: 'utf8' });
  assert(r.status === 0, `exit ${r.status}`);
  const j = JSON.parse(r.stdout); assert(j.ok === true && j.summary && Array.isArray(j.errors), 'unexpected JSON shape');
  r = spawnSync(node, [path.join(BUILD, 'lint.mjs'), '--quiet', '--src', path.join(FIX, 'bad/raw-values.css')], { encoding: 'utf8' });
  assert(r.status === 1, `expected exit 1, got ${r.status}`);
  assert(/raw-values\.css:3 .*#ff0000[\s\S]*→ fix:/.test(r.stdout), `message lacks file:line, value or fix:\n${r.stdout}`);
});
test('CLI: --record writes checks.lint to state.yaml with the commit', () => {
  const dir = sandbox(() => {});
  try {
    const r = spawnSync(node, [LINT(dir), '--quiet', '--record'], { encoding: 'utf8' });
    assert(r.status === 0, r.stdout + r.stderr);
    assert(/^  lint: \{ status: pass, commit: /m.test(fs.readFileSync(path.join(dir, 'design-build/state.yaml'), 'utf8')), 'checks.lint not recorded');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('agent hook: after-edit.mjs is silent on a clean edit, exit 2 (claude) / additional_context (cursor) on a bad one', () => {
  const dir = sandbox(() => {});
  try {
    const hook = path.join(dir, 'design-build/hooks/after-edit.mjs');
    const run = (fmt, file) => spawnSync(node, [hook, '--format', fmt], { input: JSON.stringify({ tool_name: 'Write', tool_input: { file_path: file } }), encoding: 'utf8' });
    let r = run('claude', 'design-build/preview/preview.css');
    assert(r.status === 0 && !r.stderr, `clean edit: exit ${r.status} ${r.stderr}`);
    fs.appendFileSync(path.join(dir, 'design-build/preview/preview.css'), '.zz { color: #123456; }\n');
    r = run('claude', path.join(dir, 'design-build/preview/preview.css'));
    assert(r.status === 2 && /preview\.css:\d+ raw-value/.test(r.stderr), `claude: exit ${r.status} ${r.stderr}`);
    r = run('cursor', 'design-build/preview/preview.css');
    assert(r.status === 0 && /raw-value/.test(JSON.parse(r.stdout).additional_context), `cursor: ${r.stdout}`);
    r = run('claude', 'notes.txt');
    assert(r.status === 0, 'non-design file should be ignored');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// ---------- 4. render ----------
let hasPlaywright = false;
try { createRequire(path.join(BUILD, 'package.json')).resolve('@playwright/test'); hasPlaywright = true; } catch {}
if (hasPlaywright || args.has('--render')) {
  test('render: fixtures/bad/layout.html fails for overflow, overlap, tap-target, focus-visible and axe', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'design-render-'));
    try {
      const r = spawnSync(node, [path.join(BUILD, 'render.mjs'), path.join(FIX, 'bad/layout.html'), '--widths', '390', '--themes', 'light', '--out', tmp, '--reports', tmp, '--json'], { encoding: 'utf8' });
      assert(r.status !== 2, `render harness error:\n${r.stderr}`);
      assert(r.status === 1, `expected exit 1, got ${r.status}`);
      const j = JSON.parse(r.stdout);
      const checks = new Set(j.failures.map((f) => f.check));
      for (const c of ['overflow', 'overlap', 'tap-target', 'focus-visible', 'axe:image-alt', 'axe:color-contrast']) assert(checks.has(c), `missing ${c}; got ${[...checks].join(', ')}`);
      assert(fs.existsSync(path.join(tmp, 'fixtures-bad-layout-390-light.png')) || fs.readdirSync(tmp).some((f) => f.endsWith('.png')), 'no screenshot written');
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  });
} else results.push('  skip render fixture (Playwright not installed: npm --prefix design-build ci && npx --prefix design-build playwright install chromium)');

console.log(`design checks self-test\n${results.join('\n')}\n\n${failed ? 'FAIL' : 'PASS'} — ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
