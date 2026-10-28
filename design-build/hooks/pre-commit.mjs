#!/usr/bin/env node
// Git pre-commit checks for the design system and the app it serves. Zero dependencies (render needs Playwright).
// Installed by: node design-system/design-build/install-hooks.mjs   (or node design-build/install-hooks.mjs in the template)
// PROTECTED (design.md §0.5): agents must not edit this hook, remove it, or bypass it with --no-verify.
//   1. tokens/tokens.json staged → regenerate preview/tokens.css, tokens.js, tokens.mjs and stage them
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
  say('tokens.json changed → regenerating tokens.css / tokens.js / tokens.mjs');
  if (node('tokens-css.mjs') !== 0) die(hint('tokens.json does not build. Fix the errors above (node design-build/tokens-css.mjs), then commit again.'));
  execFileSync('git', ['add', ...['tokens.css', 'tokens.js', 'tokens.mjs'].map((f) => path.join(DS, 'design-build/preview', f))], { cwd: top });
}

// 2. lint: design files + app code
say('lint (design files + app code)');
if (node('lint.mjs', ['--quiet']) !== 0) die(hint('lint failed. Fix the findings above (each names the fix), then commit again. Re-run: node design-build/lint.mjs'));

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
