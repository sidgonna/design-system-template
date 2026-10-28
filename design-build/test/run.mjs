#!/usr/bin/env node
// Self-test for the design checks. Zero dependencies: `node design-build/test/run.mjs`.
//   1. The template as shipped passes lint (exit 0, no errors).
//   2. Every file in fixtures/good lints clean; every file in fixtures/bad raises exactly the rule counts in its
//      first-line `expect: rule=n, rule=n` comment and no other error rule.
//   3. Mutation tests: copy the repo to a temp dir, break one thing, and check the matching rule fires
//      (contrast, unresolved doc token, raw doc value, ownership, tokens-sync/format/css-stale, seed cap,
//      kickstart sync, completion, justified avoid_defaults, --baseline, CLI exit codes and --json).
//   3a. Board tests: board.mjs --check, every tile present, coverage = lint, board-stale, switched-off modules, --review
//      writes review.json (never state.yaml), a bad logo token ref, and the Phase 3 --overview-only studies page.
//   3b. App-root tests: the template copied into <tmp app>/design-system/ (no .git): lint auto-detects and fails app
//      code, project.json, --baseline, Phase 6 tokens-import, nested .git, the git pre-commit hook and the agent hook.
//   4. If Playwright is installed (or --render is passed): render.mjs fails fixtures/bad/layout.html for each
//      expected reason, fails blank pages, script errors and an unreachable --url, and passes the Phase 3 studies page. Skipped with a notice otherwise (CI always installs it).
// Exit 0 when all pass, 1 otherwise.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
  // The expect comment is one of the first 3 lines; match it per line, so code after it (a JSX `>`) can't hide it.
  const first = fs.readFileSync(path.join(FIX, 'bad', f), 'utf8').split('\n').slice(0, 3).join('\n');
  const m = first.match(/\bexpect:\s*([^*>\n]+?)\s*(?:\*\/|-->|$)/m);
  if (!m) { // render-only fixtures use expect-render; anything else is a fixture that silently tests nothing
    if (!/\bexpect-render:/.test(first)) test(`fixture bad/${f}: has an expect: line`, () => assert(false, 'add `expect: rule=n` (or `expect-render:`) to one of its first 3 lines'));
    continue;
  }
  const want = Object.fromEntries(m[1].split(',').map((s) => s.trim().split('=')).map(([r, n]) => [r, Number(n)]));
  test(`fixture bad/${f}: ${m[1]}`, () => {
    const res = lint({ root: ROOT, src: [path.join(FIX, 'bad', f)] });
    const got = countBy(errorsOf(res).filter((x) => x.file.includes('fixtures/bad/')));
    assert(JSON.stringify(Object.entries(got).sort()) === JSON.stringify(Object.entries(want).sort()), `want ${JSON.stringify(want)}, got ${JSON.stringify(got)}\n${show(errorsOf(res))}`);
    for (const e of errorsOf(res)) assert(/:\d+$/.test(`${e.file}:${e.line}`) && e.fix && e.message, `finding without file:line, message and fix: ${JSON.stringify(e)}`);
  });
}

// ---------- 3. mutations ----------
const COPY = ['design.md', 'design', 'tokens', 'design-build', 'components', 'ui-inventory', 'KICKSTART.md', 'README.md', 'assets'];
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
  const dir = sandbox(({ edit }) => {
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

// ---------- 3a. the design board (board.mjs: preview/index.html, board.json, board.md, review.json, studies) ----------
const BOARD = (dir) => path.join(dir, 'design-build/board.mjs');
const boardCli = (dir, ...a) => spawnSync(node, [BOARD(dir), ...a], { encoding: 'utf8', cwd: dir });
const boardJson = (dir) => JSON.parse(fs.readFileSync(path.join(dir, 'design-build/preview/board.json'), 'utf8'));
const boardTiles = (b) => b.zones.flatMap((z) => z.tiles);
const withSandbox = (mutate, fn) => { const dir = sandbox(mutate); try { fn(dir); } finally { fs.rmSync(dir, { recursive: true, force: true }); } };
const DIRECTION = { name: 'Test direction', breaks: 'no cold blue', signature: 'one warm accent', differs: 'warmer than the wall' };
test('board: the shipped board is up to date (board.mjs --check)', () => {
  const r = boardCli(ROOT, '--check');
  assert(r.status === 0, `exit ${r.status}\n${r.stdout}${r.stderr}`);
});
test('board: every core section, module part, component doc, screen and governance part has its tile', () => {
  const b = boardJson(ROOT);
  const ids = new Set(boardTiles(b).map((t) => t.id));
  const want = ['overview', ...Array.from({ length: 13 }, (_, i) => `s${i + 1}`), 's14-1', 's14-2', 's14-3', 's14-4', 's14-5', 's0', 's15', 's16',
    'm1', ...Array.from({ length: 7 }, (_, i) => `m1-${i + 1}`), 'm2', 'm3', 'm4', 'review',
    ...JSON.parse(fs.readFileSync(path.join(BUILD, 'inventory.json'), 'utf8')).components.map((c) => `comp-${String(c.name ?? c).toLowerCase()}`)];
  const missing = want.filter((id) => !ids.has(id));
  assert(!missing.length, `missing tiles: ${missing.join(', ')}`);
  const html = fs.readFileSync(path.join(BUILD, 'preview/index.html'), 'utf8');
  const noAnchor = [...ids].filter((id) => !html.includes(`id="tile-${id}"`));
  assert(!noAnchor.length, `tiles without an anchor in preview/index.html: ${noAnchor.join(', ')}`);
  assert(b.zones.length === 7, `want 7 zones, got ${b.zones.length}`);
});
test('board: the coverage ring counts the same unfilled placeholders as the lint', () => {
  const b = boardJson(ROOT), res = lint({ root: ROOT });
  const sum = boardTiles(b).filter((t) => t.counted_in_coverage).reduce((n, t) => n + t.placeholders, 0);
  assert(sum === res.remaining && b.coverage.placeholders.remaining === res.remaining && b.coverage.placeholders.counted_in_tiles === res.remaining, `tiles ${sum}, board ${b.coverage.placeholders.remaining}, lint ${res.remaining}`);
});
test('mutation: core.md edited without rebuilding the board → board-stale (warning before Phase 5, error from Phase 5)', () => withSandbox(({ edit }) => edit('design/core.md', (s) => s.replace('{{BRAND_NAME}}', 'Stale Co')), (dir) => {
  const early = lint({ root: dir }).findings.filter((f) => f.rule === 'board-stale');
  assert(early.length && early.every((f) => f.severity === 'warning'), `phase 0: ${show(early)}`);
  const late = lint({ root: dir, phase: 5 }).findings.filter((f) => f.rule === 'board-stale');
  assert(late.length && late.every((f) => f.severity === 'error') && /board\.mjs/.test(late[0].fix), `phase 5: ${show(late)}`);
  assert(boardCli(dir, '--check').status === 1, 'board.mjs --check should fail');
  assert(boardCli(dir).status === 0 && !lint({ root: dir, phase: 5 }).findings.some((f) => f.rule === 'board-stale'), 'rebuilding did not clear board-stale');
}));
test('board: a module with enabled: false is shown switched off (greyed out), not hidden', () => withSandbox(({ edit }) => edit('design.md', (s) => s.replace(/(digital_product:[^\n]*enabled: false \})[^\n]*# TODO\(intake\)[^\n]*/, '$1')), (dir) => {
  const r = boardCli(dir); assert(r.status === 0, r.stderr);
  const b = boardJson(dir);
  assert(b.modules.find((m) => m.key === 'digital_product')?.state === 'off', JSON.stringify(b.modules));
  const html = fs.readFileSync(path.join(dir, 'design-build/preview/index.html'), 'utf8');
  assert(/id="tile-m1-1"[^>]*data-module-state="off"|data-module-state="off"[^>]*id="tile-m1-1"/.test(html), 'M1.1 tile is not marked data-module-state="off"');
}));
test('board: --review writes design-build/review.json (not state.yaml) and the board shows the verdict', () => withSandbox(() => {}, (dir) => {
  const state = fs.readFileSync(path.join(dir, 'design-build/state.yaml'), 'utf8');
  let r = boardCli(dir, '--review', '§4=edit:warmer accent');
  assert(r.status === 0, `exit ${r.status}\n${r.stdout}${r.stderr}`);
  const rv = JSON.parse(fs.readFileSync(path.join(dir, 'design-build/review.json'), 'utf8'));
  assert(rv.verdicts['§4']?.verdict === 'edit' && rv.verdicts['§4'].note === 'warmer accent', JSON.stringify(rv));
  assert(fs.readFileSync(path.join(dir, 'design-build/state.yaml'), 'utf8') === state, 'state.yaml changed');
  const html = fs.readFileSync(path.join(dir, 'design-build/preview/index.html'), 'utf8');
  assert(/id="tile-s4"[^>]*data-verdict="edit"|data-verdict="edit"[^>]*id="tile-s4"/.test(html), 'the §4 tile does not carry data-verdict="edit"');
  assert(boardCli(dir, '--check').status === 0, 'board stale after --review');
  r = boardCli(dir, '--review', '§99=accept');
  assert(r.status === 1 && /accept\|edit\|reject/.test(r.stderr), `unknown tile accepted: ${r.status} ${r.stderr}`);
}));
test('board: a logo colour that is not a token fails board.mjs --check', () => withSandbox(({ edit }) => edit('assets/logo/logo.json', (s) => s.replace('"{color.brand.primary}"', '"{color.brand.nope}"')), (dir) => {
  const r = boardCli(dir, '--check');
  assert(r.status === 1 && /color\.brand\.nope/.test(r.stderr), `exit ${r.status}\n${r.stderr}`);
}));
test('board: --overview-only writes the Phase 3 studies page, lint-clean, and rejects a missing direction', () => withSandbox(({ dir }) => {
  fs.mkdirSync(path.join(dir, 'design-build/studies/directions'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'design-build/studies/directions/A.json'), JSON.stringify(DIRECTION));
}, (dir) => {
  let r = boardCli(dir, '--overview-only', '--direction', 'A');
  assert(r.status === 0, `exit ${r.status}\n${r.stdout}${r.stderr}`);
  for (const f of ['studies/index.html', 'studies/directions/A.resolved.json']) assert(fs.existsSync(path.join(dir, 'design-build', f)), `${f} not written`);
  const e = errorsOf(lint({ root: dir })); assert(!e.length, show(e));
  r = boardCli(dir, '--overview-only', '--direction', 'B');
  assert(r.status === 1 && /B\.json/.test(r.stderr), `missing direction: ${r.status} ${r.stderr}`);
}));

// the live board (board.mjs --serve, lib/live.mjs): driven through the real CLI by test/live-check.mjs in a sandbox
test('live board: a save rebuilds tokens.css and the board and sends an SSE reload naming the changed tiles; bad JSON/YAML keeps the last good board with file:line; the next save recovers; busy port, --poll, Ctrl+C', () => withSandbox(() => {}, (dir) => {
  const r = spawnSync(node, [path.join(HERE, 'live-check.mjs'), dir, 'server'], { encoding: 'utf8', cwd: dir, timeout: 60000 });
  assert(r.status === 0, `exit ${r.status}\n${r.stdout}${r.stderr}`);
}));
test('live board: the client snippet is only in served HTML, never in the committed preview/index.html', () => {
  const html = fs.readFileSync(path.join(BUILD, 'preview/index.html'), 'utf8');
  assert(!html.includes('__live') && !html.includes('__BOARD_LIVE'), 'preview/index.html contains the live snippet');
  const r = spawnSync(node, ['--input-type=module', '-e', `import { inject } from ${JSON.stringify(pathToFileURL(path.join(BUILD, 'lib/live.mjs')).href)}; process.stdout.write(inject('<html><body><p>x</p></body></html>', 7));`], { encoding: 'utf8' });
  assert(r.status === 0 && /<script src="\/__live\/client\.js" defer><\/script>\n<\/body>/.test(r.stdout) && r.stdout.includes('"7"'), `inject: ${r.stdout}${r.stderr}`);
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
// ---------- 3b. tiers, on-colours, themes, data colours (upgrade step 1) ----------
const tokenNode = (t, dotted) => dotted.split('.').reduce((o, k) => o?.[k], t);
/** Point a colour role at another alias in tokens_file (every mode that held the old one, or just `mode`). */
const setAlias = (json, dotted, alias, mode = null) => {
  const t = JSON.parse(json), n = tokenNode(t, dotted);
  if (!mode || mode === 'light') n.$value = alias;
  if (n.$extensions?.mode) for (const m of Object.keys(n.$extensions.mode)) if (!mode || m === mode) n.$extensions.mode[m] = alias;
  return JSON.stringify(t, null, 2);
};
/** The same change in the core.md §13 base block: `key: "{{ {old} }}"` → `key: "{new}"` on the line holding `group:`. */
const setCoreAlias = (s, group, key, alias) => {
  const lines = s.split('\n');
  const i = lines.findIndex((l) => new RegExp(`^ {4}${group}: \\{`).test(l));
  lines[i] = lines[i].replace(new RegExp(`(\\b${key}: )"[^"]*"`), `$1"${alias}"`);
  return lines.join('\n');
};
const both = (dotted, group, key, alias) => ({ edit }) => { edit('tokens/tokens.json', (s) => setAlias(s, dotted, alias, 'light')); edit('design/core.md', (s) => setCoreAlias(s, group, key, alias)); };
expectRule('on.primary pointed at a mid ramp step (low contrast on brand.primary)', 'on-pair', both('color.on.primary', 'on', 'primary', '{palette.primary.500}'));
expectRule('a fill loses its on-colour (color.on.error deleted)', 'on-pair', ({ edit }) => {
  edit('tokens/tokens.json', (s) => { const t = JSON.parse(s); delete t.color.on.error; return JSON.stringify(t, null, 2); });
  edit('design/core.md', (s) => s.replace(/, error: "\{\{ \{palette\.neutral\.(50|950)\} \}\}"(?=, info)/g, ''));
});
expectRule('a component token names a ramp step directly', 'token-tier', ({ edit }) => {
  edit('tokens/tokens.json', (s) => setAlias(s, 'component.button.primary.bg', '{palette.primary.700}'));
  edit('design/core.md', (s) => s.replace('primary: { bg: "{color.brand.primary}"', 'primary: { bg: "{palette.primary.700}"'));
});
expectRule('components.css uses a ramp step', 'token-tier', ({ edit }) => edit('components/components.css', (s) => s + '\n.x { color: var(--palette-primary-700); }\n'));
expectRule('design.md lists a theme the tokens do not have', 'themes', ({ edit }) => edit('design.md', (s) => s.replace(/^themes: \[light, dark\]/m, 'themes: [light, dark, high-contrast]')));
expectRule('two data series nearly the same colour', 'cvd', ({ edit }) => {
  edit('tokens/tokens.json', (s) => setColor(s, 'color.data.2', 'light', '#d37508'));
  edit('design/core.md', (s) => s.replace('2: "{{#2995d6}}"', '2: "{{#d37508}}"'));
});
expectRule('§13 type role disagrees with tokens_file', 'tokens-sync', ({ edit }) => edit('design/core.md', (s) => s.replace(/(\n {4}body: \{ fontFamily: "\{font\.family\.body\}", fontSize: "\{font\.size\.body\}", fontWeight: )"\{font\.weight\.regular\}"/, '$1"{font.weight.bold}"')));
expectRule('a ramp step hand-edited', 'tokens-sync', ({ edit }) => edit('tokens/tokens.json', (s) => { const t = s.replace(/("hex": )"#53968a"/, '$1"#66998c"'); assert(t !== s, 'ramp step not found'); return t; }));
expectRule('§13 alias differs from tokens_file', 'tokens-sync', ({ edit }) => edit('design/core.md', (s) => s.replace('focus: "{{ {palette.primary.700} }}"', 'focus: "{{ {palette.primary.600} }}"')));
test('front matter: every # TODO(intake) default is valid YAML and counts as unfilled', () => {
  const md = fs.readFileSync(path.join(ROOT, 'design.md'), 'utf8');
  const fm = md.match(/^---\n([\s\S]*?)\n---/)[1];
  assert(!/\{\{[^}]*\|[^}]*\}\}/.test(fm), 'a {{a|b}} choice placeholder is back in the front matter (invalid YAML)');
  let YAML = null; try { YAML = createRequire(path.join(BUILD, 'package.json'))('yaml'); } catch {}
  if (YAML) { const doc = YAML.parseDocument(fm, { strict: true, uniqueKeys: true }); assert(!doc.errors.length, doc.errors.map(String).join('\n')); assert(doc.toJS().parts.digital_product.enabled === false, 'enabled is not a boolean'); }
  const markers = (fm.match(/#\s*TODO\(intake\)/g) || []).length;
  const res = lint({ root: ROOT });
  const cfg = JSON.parse(fs.readFileSync(path.join(BUILD, 'lint.config.json'), 'utf8'));
  assert(markers >= 5 && res.phPerFile['design.md'] === cfg.template_placeholders['design.md'], `markers ${markers}, lint ${res.phPerFile['design.md']}, config ${cfg.template_placeholders['design.md']}`);
  const b = boardJson(ROOT);
  assert(b.modules.every((m) => m.state === 'unset'), `a # TODO(intake) default should read "not chosen": ${JSON.stringify(b.modules)}`);
});
const THEME_FIX = path.join(FIX, 'themes/make.mjs');
const { darkOnly, threeTheme } = await import(pathToFileURL(THEME_FIX).href);
const tz = path.join(BUILD, 'node_modules/.bin/tz');
for (const [kind, make, themes] of [['dark-only', darkOnly, ['dark']], ['three-theme', threeTheme, ['light', 'dark', 'high-contrast']]]) {
  test(`theme fixture ${kind}: lint, Terrazzo, tokens.css, board and ui-inventory all pass`, () => withSandbox(({ dir }) => {
    make(dir);
    for (const s of ['tokens-css.mjs', 'board.mjs']) { const r = spawnSync(node, [path.join(dir, 'design-build', s)], { cwd: dir, encoding: 'utf8' }); assert(r.status === 0, `${s}: ${r.stdout}${r.stderr}`); }
  }, (dir) => {
    const res = lint({ root: dir });
    const bad = res.findings.filter((f) => f.severity !== 'info');
    assert(!bad.length, show(bad));
    assert(JSON.stringify(res.ctx.themes) === JSON.stringify(themes), `themes ${res.ctx.themes}`);
    for (const [s, ...a] of [['tokens-css.mjs', '--check'], ['board.mjs', '--check'], ['ui-inventory.mjs', '--check']]) { const r = spawnSync(node, [path.join(dir, 'design-build', s), ...a], { cwd: dir, encoding: 'utf8' }); assert(r.status === 0, `${s} ${a}: ${r.stdout}${r.stderr}`); }
    const css = fs.readFileSync(path.join(dir, 'design-build/preview/tokens.css'), 'utf8');
    for (const th of themes) assert(css.includes(`:root[data-theme="${th}"]`), `tokens.css has no [data-theme="${th}"] block`);
    if (kind === 'dark-only') assert(!css.includes('prefers-color-scheme') && /color-scheme: dark/.test(css), 'dark-only tokens.css should be dark with no OS switch');
    if (kind === 'three-theme') assert(css.includes('(prefers-contrast: more)'), 'no prefers-contrast block');
    const b = fs.readFileSync(path.join(dir, 'design-build/preview/index.html'), 'utf8');
    for (const th of themes) assert(b.includes(`data-theme-choice="${th}"`) , `board toolbar has no ${th} button`);
    if (fs.existsSync(tz)) {
      fs.symlinkSync(path.join(BUILD, 'node_modules'), path.join(dir, 'design-build/node_modules'));
      const r = spawnSync(tz, ['check', path.join(dir, 'tokens/tokens.json'), '--config', path.join(dir, 'design-build/terrazzo.config.mjs')], { cwd: path.join(dir, 'design-build'), encoding: 'utf8' });
      assert(r.status === 0, `tz check: ${r.stdout}${r.stderr}`);
    }
  }));
}
if (fs.existsSync(tz)) test('Terrazzo: a colour role missing its dark mode fails tokens:check (required-modes covers color.on.*)', () => withSandbox(({ edit }) => edit('tokens/tokens.json', (s) => { const t = JSON.parse(s); delete t.color.on.primary.$extensions.mode.dark; return JSON.stringify(t, null, 2); }), (dir) => {
  fs.symlinkSync(path.join(BUILD, 'node_modules'), path.join(dir, 'design-build/node_modules'));
  const r = spawnSync(tz, ['check', path.join(dir, 'tokens/tokens.json'), '--config', path.join(dir, 'design-build/terrazzo.config.mjs')], { cwd: path.join(dir, 'design-build'), encoding: 'utf8' });
  assert(r.status !== 0 && /color\.on\.primary|required-modes|dark/i.test(r.stdout + r.stderr), `exit ${r.status}\n${r.stdout}${r.stderr}`);
}));
test('ramps.mjs: every palette step is what its seed makes (ramps --check)', () => {
  const r = spawnSync(node, [path.join(BUILD, 'ramps.mjs'), '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert(r.status === 0, r.stdout + r.stderr);
});
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
  test('render: the Phase 3 studies page (board.mjs --overview-only, two directions) passes render.mjs', () => {
    const dir = sandbox(({ dir: d }) => {
      fs.mkdirSync(path.join(d, 'design-build/studies/directions'), { recursive: true });
      for (const id of ['A', 'B']) fs.writeFileSync(path.join(d, `design-build/studies/directions/${id}.json`), JSON.stringify({ ...DIRECTION, name: `Direction ${id}` }));
    });
    try {
      fs.symlinkSync(path.join(BUILD, 'node_modules'), path.join(dir, 'design-build/node_modules'), 'dir');
      let r = spawnSync(node, [BOARD(dir), '--overview-only', '--direction', 'A', '--direction', 'B'], { encoding: 'utf8', cwd: dir });
      assert(r.status === 0, `board: ${r.status}\n${r.stderr}`);
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'design-render-'));
      r = spawnSync(node, [path.join(dir, 'design-build/render.mjs'), path.join(dir, 'design-build/studies/index.html'), '--widths', '390', '--themes', 'light', '--out', tmp, '--reports', tmp, '--json'], { encoding: 'utf8', cwd: dir });
      fs.rmSync(tmp, { recursive: true, force: true });
      assert(r.status === 0, `render exit ${r.status}\n${r.stdout.slice(0, 2000)}${r.stderr}`);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
  test('live board in a browser: reloads by itself within 2.5s keeping scroll, canvas view and zoom, shows the toast and outlines the changed tile; a bad save shows the banner over the last good board', () => withSandbox(() => {}, (dir) => {
    fs.symlinkSync(path.join(BUILD, 'node_modules'), path.join(dir, 'design-build/node_modules'), 'dir');
    const r = spawnSync(node, [path.join(dir, 'design-build/test/live-check.mjs'), dir, 'browser'], { encoding: 'utf8', cwd: dir, timeout: 90000 });
    assert(r.status === 0, `exit ${r.status}\n${r.stdout}${r.stderr}`);
  }));
  test('components/index.js: the vanilla helpers build accessible markup in a browser and reject unknown variants', () => {
    const r = spawnSync(node, [path.join(HERE, 'helpers-browser.mjs')], { encoding: 'utf8', cwd: BUILD });
    assert(r.status === 0, `exit ${r.status}\n${r.stdout}${r.stderr}`);
  });
  for (const [kind, make] of [['dark-only', darkOnly], ['three-theme', threeTheme]]) test(`render: the ${kind} fixture board passes render.mjs in every theme it lists`, () => withSandbox(({ dir }) => {
    make(dir);
    for (const s of ['tokens-css.mjs', 'board.mjs']) spawnSync(node, [path.join(dir, 'design-build', s)], { cwd: dir, encoding: 'utf8' });
    fs.symlinkSync(path.join(BUILD, 'node_modules'), path.join(dir, 'design-build/node_modules'));
  }, (dir) => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'design-render-'));
    try {
      const r = spawnSync(node, [path.join(dir, 'design-build/render.mjs'), '--widths', '390,1280', '--root', dir, '--out', tmp, '--reports', tmp, '--json'], { cwd: dir, encoding: 'utf8' });
      assert(r.status === 0, `exit ${r.status}\n${r.stdout.slice(0, 3000)}${r.stderr}`);
      const shots = fs.readdirSync(tmp).filter((f) => f.endsWith('.png'));
      const want = kind === 'dark-only' ? ['dark'] : ['light', 'dark', 'high-contrast'];
      for (const th of want) assert(shots.some((f) => f.endsWith(`-${th}.png`)), `no ${th} screenshot: ${shots}`);
      if (kind === 'dark-only') assert(!shots.some((f) => f.endsWith('-light.png')), `dark-only rendered light: ${shots}`);
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }));
} else results.push('  skip render fixture (Playwright not installed: npm --prefix design-build ci && npx --prefix design-build playwright install chromium)');

if (SSR.dir) fs.rmSync(SSR.dir, { recursive: true, force: true });
console.log(`design checks self-test\n${results.join('\n')}\n\n${failed ? 'FAIL' : 'PASS'} — ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
