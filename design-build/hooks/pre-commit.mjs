#!/usr/bin/env node
// Git pre-commit checks for the design system and the app it serves. Zero dependencies (render needs Playwright).
// Installed by: node design-system/design-build/install-hooks.mjs   (or node design-build/install-hooks.mjs in the template)
// PROTECTED (design.md §0.5): agents must not edit this hook, remove it, or bypass it with --no-verify.
//   1. tokens/tokens.json staged → regenerate preview/tokens.css, tokens.js, tokens.mjs, the DESIGN.md / Tailwind / Figma exports and the board, and stage them
//   2. lint.mjs on the design files AND the app code (src/, app/, …; see design-build/project.json); a baseline,
//      if the user approved one, is respected: a rule's count may only go down
//   3. something visual staged → render.mjs + axe: the design preview when design files changed, and the app's
//      dev server (project.json → app_url) when app code changed and the server is running
// Exit 1 blocks the commit.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { findProject, fixHint, projectConfig, isAppCode } from '../lib/project.mjs';

const DS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const W = findProject(DS);
const hint = (s) => fixHint(W, s);
const say = (s) => console.log(`design pre-commit: ${s}`);
const die = (s) => { console.error(`design pre-commit: ${s}`); process.exit(1); };
const node = (script, args = []) => spawnSync(process.execPath, [path.join(DS, 'design-build', script), ...args], { stdio: 'inherit', cwd: W.project }).status;

let top;
try { top = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: W.project, encoding: 'utf8' }).trim(); }
catch { die('not inside a git repository'); }
const staged = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'], { cwd: top, encoding: 'utf8' }).split('\0').filter(Boolean).map((f) => path.join(top, f));
const dsRel = (abs) => path.relative(DS, abs).split(path.sep).join('/');
const inDs = staged.filter((f) => !dsRel(f).startsWith('..')).map(dsRel);
for (const w of W.warnings) console.error(`design pre-commit: WARNING ${w}`);

// 1. generated token files follow tokens.json
if (inDs.includes('tokens/tokens.json')) {
  say('tokens.json changed → regenerating tokens.css / tokens.js / tokens.mjs, the DESIGN.md exports and the board');
  if (node('tokens-css.mjs') !== 0) die(hint('tokens.json does not build. Fix the errors above (node design-build/tokens-css.mjs), then commit again.'));
  if (node('designmd.mjs') !== 0) die(hint('tokens.json does not export. Fix the errors above (node design-build/designmd.mjs), then commit again.'));
  if (node('board.mjs') !== 0) die(hint('the board does not build. Fix the errors above (node design-build/board.mjs), then commit again.'));
  execFileSync('git', ['add', ...[
    'design-build/preview/tokens.css', 'design-build/preview/tokens.js', 'design-build/preview/tokens.mjs',
    'design-build/preview/index.html', 'design-build/preview/board.json', 'design-build/preview/board.md', 'design-build/preview/chrome.css',
    'design-build/exports/DESIGN.md', 'design-build/exports/tailwind.theme.css', 'design-build/exports/tailwind.config.cjs',
    'design-build/exports/figma.tokens-studio.json', 'design-build/exports/figma.variables.json',
  ].map((f) => path.join(DS, f))], { cwd: top });
}

// 2. lint: design files + app code
say('lint (design files + app code)');
if (node('lint.mjs', ['--quiet']) !== 0) {
  // With a baseline the list above includes old, frozen findings; repeat the ones in the files being committed.
  try {
    const j = JSON.parse(spawnSync(process.execPath, [path.join(DS, 'design-build/lint.mjs'), '--json'], { cwd: W.project, encoding: 'utf8', maxBuffer: 64 << 20 }).stdout);
    // lines this commit adds, per project-relative file (from git diff --cached -U0)
    const added = new Map(); let cur = null;
    for (const l of execFileSync('git', ['diff', '--cached', '-U0', '--no-color', '--diff-filter=ACMR'], { cwd: top, encoding: 'utf8', maxBuffer: 64 << 20 }).split('\n')) {
      if (l.startsWith('+++ ')) { cur = l === '+++ /dev/null' ? null : path.relative(W.project, path.join(top, l.slice(6))).split(path.sep).join('/'); if (cur) added.set(cur, new Set()); }
      else if (cur && l.startsWith('@@')) { const m = l.match(/\+(\d+)(?:,(\d+))?/); const n = m[2] === undefined ? 1 : Number(m[2]); for (let i = 0; i < n; i++) added.get(cur).add(Number(m[1]) + i); }
    }
    const here = j.errors.filter((e) => added.get(e.file)?.has(e.line));
    if (here.length) console.error(`\ndesign pre-commit: errors on lines this commit adds${j.summary.baseline ? ` (rules over the baseline: ${j.summary.rules_over_baseline.join(', ') || 'none'})` : ''}:\n${here.map((e) => `  ${e.file}:${e.line}  ${e.rule}  ${e.message}\n      → fix: ${e.fix}`).join('\n')}`);
  } catch {}
  die(hint('lint failed. Fix the findings above (each names the fix), then commit again. Re-run: node design-build/lint.mjs'));
}

// 3. render + axe when something visual changed
const C = JSON.parse(fs.readFileSync(path.join(DS, 'design-build/lint.config.json'), 'utf8'));
const designVisual = inDs.some((f) => /^(tokens\/|design-build\/(preview|studies|render\.mjs|lib\/)|design\/core\.md)/.test(f));
const appVisual = staged.some((f) => isAppCode(W, f, C.code_extensions));
if (!designVisual && !appVisual) process.exit(0);
const deps = ['@playwright/test', '@axe-core/playwright'].every((d) => fs.existsSync(path.join(DS, 'design-build/node_modules', d)));
if (!deps) {
  console.error(hint('design pre-commit: WARNING render + axe skipped: Playwright is not installed. Install once: npm --prefix design-build ci && npx --prefix design-build playwright install chromium'));
  process.exit(0);
}
const targets = [];
if (designVisual) targets.push(path.join(DS, 'design-build/preview/index.html'));
if (appVisual) {
  const url = projectConfig(DS).app_url;
  let up = false;
  if (url) { try { const r = await fetch(url, { signal: AbortSignal.timeout(3000) }); up = r.status < 500; } catch {} }
  if (up) targets.push('--url', url);
  else console.error(hint(`design pre-commit: WARNING app code changed but ${url ? `the dev server at ${url} is not running` : 'design-build/project.json has no app_url'}, so the app was not rendered. Start the dev server and run: node design-build/render.mjs --url <dev-server URL>`));
}
if (!targets.length) process.exit(0);
say('render + axe');
if (node('render.mjs', ['--quiet', ...targets]) !== 0) die(hint('render/axe failed. See design-build/render-report.json and design-build/a11y-report.json, fix, then commit again.'));
