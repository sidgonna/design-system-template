#!/usr/bin/env node
// Self-test for the design checks. Zero dependencies: `node design-build/test/run.mjs`.
//   1. The template as shipped passes lint (exit 0, no errors).
//   2. Every file in fixtures/good lints clean; every file in fixtures/bad raises exactly the rule counts in its
//      first-line `expect: rule=n, rule=n` comment and no other error rule.
//   3. Mutation tests: copy the repo to a temp dir, break one thing, and check the matching rule fires
//      (contrast, unresolved doc token, raw doc value, ownership, tokens-sync/format/css-stale, seed cap,
//      kickstart sync, completion, justified avoid_defaults, --baseline, CLI exit codes and --json).
//   3b. App-root tests: the template copied into <tmp app>/design-system/ (no .git): lint auto-detects and fails app
//      code, project.json, --baseline, Phase 6 tokens-import, nested .git, the git pre-commit hook and the agent hook.
//   4. If Playwright is installed (or --render is passed): render.mjs fails fixtures/bad/layout.html for each
//      expected reason, and fails blank pages, script errors and an unreachable --url. Skipped with a notice otherwise (CI always installs it).
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
const COPY = ['design.md', 'design', 'tokens', 'design-build', 'components', 'ui-inventory', 'KICKSTART.md', 'README.md'];
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

// ui-inventory: docs and screens stay in step with inventory.json and the tokens
const editInv = (fn) => (s) => { const j = JSON.parse(s); fn(j); return JSON.stringify(j, null, 2); };
expectRule('a component doc is deleted', 'ui-inventory', ({ dir }) => fs.rmSync(path.join(dir, 'ui-inventory/components/badge.md')));
expectRule('a component doc loses a required section', 'ui-inventory', ({ edit }) => edit('ui-inventory/components/card.md', (s) => s.replace(/\n## Motion\n/, '\n## Movement\n')));
expectRule('a component doc names a token that does not exist', 'ui-inventory', ({ edit }) => edit('ui-inventory/components/button.md', (s) => s + '\nThe focus ring uses `{color.focus.halo}`.\n'));
expectRule('a component doc hard-codes a color', 'ui-inventory', ({ edit }) => edit('ui-inventory/components/input.md', (s) => s + '\nThe error border is #c0392b.\n'));
expectRule('a component doc names an unknown CSS variable', 'ui-inventory', ({ edit }) => edit('ui-inventory/components/badge.md', (s) => s + '\nPadding is `var(--space-badge-x)`.\n'));
expectRule('a variant is added to inventory.json but not to its doc', 'ui-inventory', ({ edit }) => edit('design-build/inventory.json', editInv((j) => j.components.find((c) => c.name === 'Badge').variants.push('brand'))));
expectRule('a screen lists a component that is not in inventory.json', 'ui-inventory', ({ edit }) => edit('design-build/inventory.json', editInv((j) => j.screens.preview.components.push({ component: 'Avatar', variants: ['default'], states: ['default'] }))));
expectRule('a screen lists a state outside §M1.2', 'ui-inventory', ({ edit }) => edit('design-build/inventory.json', editInv((j) => j.screens.preview.components.find((c) => c.component === 'Button').states.push('pressed-ish'))));
expectRule('a screen lists a variant the component does not have', 'ui-inventory', ({ edit }) => edit('design-build/inventory.json', editInv((j) => j.screens.preview.components.find((c) => c.component === 'Card').variants.push('glass'))));
expectRule('a screen source renders a component the screen does not list', 'ui-inventory', ({ edit }) => edit('design-build/inventory.json', editInv((j) => { j.screens.preview.components = j.screens.preview.components.filter((c) => c.component !== 'Badge'); })));
expectRule('a screen has no route or purpose', 'ui-inventory', ({ edit }) => edit('design-build/inventory.json', editInv((j) => { delete j.screens.preview.purpose; })));
expectRule('a generated block is edited by hand', 'ui-inventory', ({ edit }) => edit('ui-inventory/components/button.md', (s) => s.replace(/(<!-- ui-inventory:generated[^\n]*\n)/, '$1Hand edit.\n')));
expectRule('ui-inventory/index.md is stale', 'ui-inventory', ({ edit }) => edit('ui-inventory/index.md', (s) => s + '\nstale\n'));
test('ui-inventory.mjs: --check passes on the template; a new screen gets its page and missing docs from the templates, the lint asks for them to be filled, and an app-only component needs none', () => {
  const ui = (dir, ...a) => spawnSync(process.execPath, [path.join(dir, 'design-build/ui-inventory.mjs'), ...a], { encoding: 'utf8' });
  let r = ui(ROOT, '--check');
  assert(r.status === 0, `template --check: exit ${r.status}\n${r.stdout}${r.stderr}`);
  const dir = sandbox(({ dir: d, edit }) => {
    edit('design-build/inventory.json', editInv((j) => {
      j.components.find((c) => c.name === 'Toast').status = 'existing';
      j.components.push({ name: 'App', aliases: [], status: 'existing', import: 'src/App.tsx', props: [], variants: [] }); // app-only: no doc needed
      j.screens.settings = { name: 'Settings', route: '/settings', purpose: 'Change account details.', source: [], components: [{ component: 'Button', variants: ['primary'], states: ['default', 'loading'] }, { component: 'Toast', variants: [], states: ['default'] }] };
    }));
  });
  try {
    r = ui(dir, '--check');
    assert(r.status === 1, `--check should fail before generating, got ${r.status}\n${r.stdout}${r.stderr}`);
    r = ui(dir);
    assert(r.status === 0, `generate: exit ${r.status}\n${r.stdout}${r.stderr}`);
    assert(fs.existsSync(path.join(dir, 'ui-inventory/screens/settings.md')), 'screen page not created');
    assert(fs.existsSync(path.join(dir, 'ui-inventory/components/toast.md')), 'missing component doc not created');
    assert(/\/settings/.test(fs.readFileSync(path.join(dir, 'ui-inventory/index.md'), 'utf8')), 'index.md does not list the new screen');
    const e = errorsOf(lint({ root: dir })).filter((f) => f.rule === 'ui-inventory');
    assert(e.some((f) => /toast\.md/.test(f.file)), `an unfilled template doc should fail:\n${show(e)}`);
    assert(!e.some((f) => /index\.md|button\.md|app\.md/.test(f.file)), `generated files should be fresh and the app-only <App> needs no doc:\n${show(e)}`);
    assert(!fs.existsSync(path.join(dir, 'ui-inventory/components/app.md')), 'a doc was created for the app-only <App>');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// shipped React wrappers, rendered to HTML (server-side; no browser needed)
const SSR = await (async () => {
  try {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'design-ssr-'));
    copyDir(path.join(ROOT, 'components'), path.join(dir, 'components'));
    fs.symlinkSync(path.join(BUILD, 'node_modules'), path.join(dir, 'node_modules'), 'dir');
    const { createElement: h } = await import(createRequire(path.join(BUILD, 'package.json')).resolve('react'));
    const { renderToStaticMarkup } = await import(createRequire(path.join(BUILD, 'package.json')).resolve('react-dom/server'));
    const lib = {}; for (const n of ['Button', 'Input', 'Card', 'Badge']) Object.assign(lib, await import(path.join(dir, `components/react/${n}.js`))); // index.js also imports the CSS, which needs a bundler
    return { h, html: renderToStaticMarkup, lib, dir };
  } catch (e) { return { err: e }; }
})();
if (SSR.lib) {
  const { h, html, lib } = SSR;
  test('React: <Button> renders the data-component API; loading keeps focus (aria-busy, no disabled) and shows the spinner', () => {
    const a = html(h(lib.Button, { variant: 'secondary' }, 'Save'));
    assert(/<button type="button" data-component="button" data-variant="secondary"><span data-part="label">Save<\/span><\/button>/.test(a), a);
    const b = html(h(lib.Button, { loading: true }, 'Saving'));
    assert(/aria-busy="true"/.test(b) && /aria-disabled="true"/.test(b) && !/ disabled=""/.test(b) && /data-part="spinner" aria-hidden="true"/.test(b), b);
  });
  test('React: <Input> links label, hint and error (for/id, aria-describedby, aria-invalid)', () => {
    const a = html(h(lib.Input, { id: 'email', label: 'Email', hint: 'Work address', error: 'Enter a valid email', required: true }));
    assert(/data-component="input" data-variant="error"/.test(a), a);
    assert(/<label for="email">Email<span data-part="required"> \(required\)<\/span><\/label>/.test(a), a);
    assert(/id="email"[^>]*required=""[^>]*aria-invalid="true" aria-describedby="email-hint email-error"/.test(a), a);
    assert(/<p data-part="error" id="email-error">Enter a valid email<\/p>/.test(a), a);
    const b = html(h(lib.Input, { label: 'Name' }));
    assert(/data-variant="default"/.test(b) && !/aria-invalid/.test(b) && /<label for="(ds-input-[\w-]+)">Name<\/label><input[^>]*id="\1"/.test(b), b);
  });
  test('React: <Card> and <Badge> render their variants; interactive cards are marked', () => {
    const c = html(h(lib.Card, { variant: 'raised', interactive: true, as: 'section' }, 'x'));
    assert(/^<section data-component="card" data-variant="raised" data-interactive="">x<\/section>$/.test(c), c);
    assert(html(h(lib.Card, null, 'y')) === '<article data-component="card" data-variant="flat">y</article>', 'default Card');
    assert(html(h(lib.Badge, { variant: 'success' }, 'Live')) === '<span data-component="badge" data-variant="success">Live</span>', 'Badge');
  });
  test('components: every variant in inventory.json has CSS in components.css, and the type declarations name them (Input takes its variant from the error prop)', () => {
    const inv = JSON.parse(fs.readFileSync(path.join(BUILD, 'inventory.json'), 'utf8'));
    const css = fs.readFileSync(path.join(ROOT, 'components/components.css'), 'utf8');
    const dts = fs.readFileSync(path.join(ROOT, 'components/react/index.d.ts'), 'utf8');
    for (const c of inv.components.filter((x) => x.status === 'existing')) {
      const k = c.name.toLowerCase();
      for (const v of c.variants) {
        const base = { button: 'primary', input: 'default', card: 'flat', badge: 'neutral' }[k]; // the default variant is the base rule
        if (v !== base) assert(css.includes(`[data-component="${k}"][data-variant="${v}"]`), `components.css has no rule for ${k}/${v}`);
        if (k !== 'input') assert(dts.includes(`'${v}'`), `index.d.ts does not name ${c.name} variant '${v}'`);
      }
    }
    assert(!/#[0-9a-f]{3,8}\b|\d+px|\d+ms/i.test(css.replace(/\/\*[\s\S]*?\*\//g, '')), 'components.css has a literal color, px or ms value outside comments');
  });
} else results.push(`  skip React wrapper tests (react not installed in design-build: ${SSR.err?.message?.split('\n')[0]})`);

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

// ---------- 3b. installed in an app: <app>/design-system/ ----------
const git = (cwd, ...a) => spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { cwd, encoding: 'utf8' });
function appSandbox({ files = {}, gitInit = true } = {}) {
  const app = fs.mkdtempSync(path.join(os.tmpdir(), 'design-app-'));
  for (const c of COPY) if (fs.existsSync(path.join(ROOT, c))) copyDir(path.join(ROOT, c), path.join(app, 'design-system', c));
  fs.rmSync(path.join(app, 'design-system/design-build/lint-baseline.json'), { force: true });
  const all = { 'package.json': '{ "name": "app", "private": true }\n', 'src/App.css': '.app { color: var(--color-text-primary); padding: var(--space-4, 1rem); }\n', 'src/App.tsx': "import './App.css';\nexport default function App() { return <main className=\"app\">Hi</main>; }\n", ...files };
  for (const [f, body] of Object.entries(all)) { fs.mkdirSync(path.dirname(path.join(app, f)), { recursive: true }); fs.writeFileSync(path.join(app, f), body); }
  if (gitInit) git(app, 'init', '-q');
  return app;
}
const lintCli = (cwd, ...a) => spawnSync(node, ['design-system/design-build/lint.mjs', ...a], { cwd, encoding: 'utf8' });
const withApp = (opts, fn) => { const app = appSandbox(opts); try { fn(app); } finally { fs.rmSync(app, { recursive: true, force: true }); } };

test('app root: lint run from the app finds the project, auto-detects src/ and passes on clean app code', () => withApp({}, (app) => {
  const r = lintCli(app);
  assert(r.status === 0, `exit ${r.status}\n${r.stdout}${r.stderr}`);
  assert(/app code: .*src/.test(r.stdout) && r.stdout.includes(`project root: ${fs.realpathSync(app)}`), `summary line wrong:\n${r.stdout}`);
  assert(/\(2 app\)/.test(r.stdout), `expected 2 app files:\n${r.stdout}`);
}));
test('app root: a hard-coded color in src/ fails the lint with the app path and a token fix', () => withApp({ files: { 'src/Button.css': '.btn { color: #ff0000; }\n' } }, (app) => {
  const r = lintCli(app, '--json');
  assert(r.status === 1, `expected exit 1, got ${r.status}\n${r.stdout}`);
  const e = JSON.parse(r.stdout).errors.filter((f) => f.file === 'src/Button.css');
  assert(e.length === 1 && e[0].rule === 'raw-value' && /var\(--/.test(e[0].fix), `want one raw-value on src/Button.css with a var(--…) fix, got:\n${r.stdout}`);
}));
test('app root: node_modules, dist and the design-system folder are not linted as app code; other dirs only via project.json', () => withApp({ files: { 'dist/x.css': '.a { color: #ff0000; }\n', 'src/node_modules/y.css': '.a { color: #ff0000; }\n', 'web/z.css': '.a { color: #ff0000; }\n' } }, (app) => {
  let r = lintCli(app);
  assert(r.status === 0, `dist/, node_modules or web/ was linted:\n${r.stdout}`);
  fs.writeFileSync(path.join(app, 'design-system/design-build/project.json'), JSON.stringify({ code_dirs: ['src', 'web'], exclude: [] }));
  r = lintCli(app, '--json');
  assert(r.status === 1 && JSON.parse(r.stdout).errors.some((f) => f.file === 'web/z.css'), `project.json code_dirs not used:\n${r.stdout}`);
}));
test('app root: hints print commands runnable from the app root (design-system/ prefix)', () => withApp({}, (app) => {
  fs.appendFileSync(path.join(app, 'design-system/design-build/preview/tokens.css'), '/* stale */\n');
  const r = lintCli(app, '--json');
  const e = JSON.parse(r.stdout).errors.find((f) => f.rule === 'tokens-css-stale');
  assert(e && e.fix.includes('node design-system/design-build/tokens-css.mjs'), `stale hint: ${JSON.stringify(e)}`);
}));
test('app root: --baseline freezes app counts; a new hard-coded color then fails', () => withApp({ files: { 'src/Old.css': '.a { color: #ff0000; }\n' } }, (app) => {
  let r = lintCli(app, '--baseline');
  assert(r.status === 0 && fs.existsSync(path.join(app, 'design-system/design-build/lint-baseline.json')), `baseline: ${r.status}\n${r.stdout}${r.stderr}`);
  assert(lintCli(app).status === 0, 'same counts should pass');
  fs.appendFileSync(path.join(app, 'src/Old.css'), '.b { background: #00ff00; }\n');
  assert(lintCli(app).status === 1, 'a rising count should fail');
}));
test('app root: Phase 6 requires the app to import the generated tokens', () => withApp({}, (app) => {
  let r = lintCli(app, '--phase', '6', '--json');
  const e = JSON.parse(r.stdout).errors.find((f) => f.rule === 'tokens-import');
  assert(e && /import '\.\.\/design-system\/design-build\/preview\/tokens\.css'/.test(e.fix), `tokens-import missing or bad hint: ${JSON.stringify(e)}`);
  fs.writeFileSync(path.join(app, 'src/main.tsx'), "import '../design-system/design-build/preview/tokens.css';\nimport App from './App';\n");
  r = lintCli(app, '--phase', '6', '--json');
  assert(!JSON.parse(r.stdout).errors.some((f) => f.rule === 'tokens-import'), 'tokens-import still fires after the import');
}));
test('app root: a nested design-system/.git is detected and explained', () => withApp({}, (app) => {
  git(path.join(app, 'design-system'), 'init', '-q');
  const r = lintCli(app);
  assert(/has its own \.git/.test(r.stdout + r.stderr) && /rm -rf design-system\/\.git/.test(r.stdout + r.stderr), `no nested .git warning:\n${r.stdout}${r.stderr}`);
  const r2 = lintCli(app, '--root', '.', '--json');
  assert(JSON.parse(r2.stdout).summary.app_code_files === 2, `--root override did not find the app:\n${r2.stdout}`);
}));
test('pre-commit hook: installs from the app root, blocks a hard-coded color, passes a clean commit, fails loudly without the scripts', () => withApp({}, (app) => {
  let r = spawnSync(node, ['design-system/design-build/install-hooks.mjs'], { cwd: app, encoding: 'utf8' });
  assert(r.status === 0 && fs.existsSync(path.join(app, '.git/hooks/pre-commit')), `install: ${r.status}\n${r.stdout}${r.stderr}`);
  git(app, 'add', '-A');
  r = git(app, 'commit', '-qm', 'clean');
  assert(r.status === 0, `clean commit blocked:\n${r.stdout}${r.stderr}`);
  fs.writeFileSync(path.join(app, 'src/Bad.css'), '.bad { color: #ff0000; }\n');
  git(app, 'add', 'src/Bad.css');
  r = git(app, 'commit', '-qm', 'bad');
  assert(r.status !== 0 && /errors on lines this commit adds[^]*src\/Bad\.css:1 +raw-value/.test(r.stdout + r.stderr), `bad commit not blocked (exit ${r.status}):\n${r.stdout}${r.stderr}`);
  git(app, 'reset', '-q', 'src/Bad.css'); fs.rmSync(path.join(app, 'src/Bad.css'));
  fs.rmSync(path.join(app, 'design-system/design-build/hooks/pre-commit.mjs'));
  fs.writeFileSync(path.join(app, 'src/Ok.css'), '.ok { color: var(--color-text-primary); }\n');
  git(app, 'add', 'src/Ok.css');
  r = git(app, 'commit', '-qm', 'no scripts');
  assert(r.status !== 0 && /pre-commit/.test(r.stdout + r.stderr), `missing hook script did not fail loudly (exit ${r.status}):\n${r.stdout}${r.stderr}`);
}));
test('pre-commit hook: installer leaves a foreign hook alone and says what to add', () => withApp({}, (app) => {
  fs.mkdirSync(path.join(app, '.git/hooks'), { recursive: true });
  fs.writeFileSync(path.join(app, '.git/hooks/pre-commit'), '#!/bin/sh\necho mine\n', { mode: 0o755 });
  const r = spawnSync(node, ['design-system/design-build/install-hooks.mjs'], { cwd: app, encoding: 'utf8' });
  assert(r.status === 1 && /hooks\/pre-commit\.mjs/.test(r.stdout + r.stderr), `got ${r.status}\n${r.stdout}${r.stderr}`);
  assert(fs.readFileSync(path.join(app, '.git/hooks/pre-commit'), 'utf8').includes('echo mine'), 'foreign hook overwritten');
}));
test('agent hook: after-edit.mjs run from the app root flags a hard-coded color in app code', () => withApp({}, (app) => {
  fs.writeFileSync(path.join(app, 'src/Edit.css'), '.e { color: #ff0000; }\n');
  const r = spawnSync(node, ['design-system/design-build/hooks/after-edit.mjs', '--format', 'claude'], { cwd: app, input: JSON.stringify({ tool_input: { file_path: path.join(app, 'src/Edit.css') } }), encoding: 'utf8' });
  assert(r.status === 2 && /src\/Edit\.css:1 raw-value/.test(r.stderr), `exit ${r.status}\n${r.stderr}${r.stdout}`);
}));
const tokensMjs = await import(path.join(BUILD, 'preview/tokens.mjs'));
test('tokens-css.mjs writes tokens.mjs and it resolves CSS variables', () => {
  const mod = tokensMjs;
  assert(mod.cssVar('color.brand.primary') === 'var(--color-brand-primary)', 'cssVar wrong');
  assert(mod.tokens['color.brand.primary'] && mod.modes.includes('dark'), 'tokens/modes missing');
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
  const renderOne = (file) => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'design-render-'));
    try {
      const r = spawnSync(node, [path.join(BUILD, 'render.mjs'), path.join(FIX, file), '--widths', '390', '--themes', 'light', '--out', tmp, '--reports', tmp, '--json'], { encoding: 'utf8' });
      assert(r.status === 1, `expected exit 1, got ${r.status}\n${r.stdout}${r.stderr}`);
      return new Set(JSON.parse(r.stdout).failures.map((f) => f.check));
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  };
  test('render: a blank page (app never mounted) fails blank-page', () => { const c = renderOne('bad/blank.html'); assert(c.has('blank-page'), [...c].join(', ')); });
  test('render: a script that throws fails page-error', () => { const c = renderOne('bad/script-error.html'); assert(c.has('page-error') && c.has('blank-page'), [...c].join(', ')); });
  test('render: --url with nothing listening is a harness error that says to start the dev server', () => {
    const r = spawnSync(node, [path.join(BUILD, 'render.mjs'), '--url', 'http://127.0.0.1:59999/', '--widths', '390', '--themes', 'light', '--out', os.tmpdir(), '--reports', fs.mkdtempSync(path.join(os.tmpdir(), 'design-render-'))], { encoding: 'utf8' });
    assert(r.status !== 0 && /dev server/.test(r.stdout + r.stderr), `exit ${r.status}\n${r.stdout}${r.stderr}`);
  });
  test('motion: on the preview every component motion plays and reduced motion stops all of it', () => {
    const r = spawnSync(node, [path.join(BUILD, 'motion.mjs'), '--json'], { encoding: 'utf8' });
    assert(r.status === 0, `exit ${r.status}\n${r.stdout}${r.stderr}`);
    const j = JSON.parse(r.stdout);
    const played = new Set(j.motion.filter((m) => m.ok && !m.skipped).map((m) => m.name));
    for (const id of ['button-hover', 'button-press', 'button-spinner', 'input-focus', 'input-shake', 'card-enter', 'card-hover', 'badge-pop', 'play-motion']) assert(played.has(id), `${id} did not play: ${JSON.stringify(j.motion)}`);
    assert(j.reduced.length > 0 && j.reduced.every((m) => m.ok), `reduced: ${JSON.stringify(j.reduced)}`);
    assert(j.consoleErrors.length === 0, `console errors: ${j.consoleErrors.join('; ')}`);
  });
  test('motion: removing the reduced-motion block from components.css fails the reduced-motion check', () => {
    const dir = sandbox(({ edit }) => edit('components/components.css', (s) => { const t = s.replace(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}\n/, ''); if (t === s) throw new Error('reduced-motion block not found'); return t; }));
    try {
      fs.symlinkSync(path.join(BUILD, 'node_modules'), path.join(dir, 'design-build/node_modules'), 'dir');
      const r = spawnSync(node, [path.join(dir, 'design-build/motion.mjs'), '--json'], { encoding: 'utf8' });
      assert(r.status === 1, `expected exit 1, got ${r.status}\n${r.stdout}${r.stderr}`);
      const j = JSON.parse(r.stdout);
      assert(j.reduced.some((m) => !m.ok), `no reduced-motion failure: ${JSON.stringify(j.reduced)}`);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
  test('components/index.js: the vanilla helpers build accessible markup in a browser and reject unknown variants', () => {
    const r = spawnSync(node, [path.join(HERE, 'helpers-browser.mjs')], { encoding: 'utf8', cwd: BUILD });
    assert(r.status === 0, `exit ${r.status}\n${r.stdout}${r.stderr}`);
  });
} else results.push('  skip render fixture (Playwright not installed: npm --prefix design-build ci && npx --prefix design-build playwright install chromium)');

if (SSR.dir) fs.rmSync(SSR.dir, { recursive: true, force: true });
console.log(`design checks self-test\n${results.join('\n')}\n\n${failed ? 'FAIL' : 'PASS'} — ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
