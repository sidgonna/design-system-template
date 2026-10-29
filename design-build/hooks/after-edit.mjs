#!/usr/bin/env node
// Agent after-edit hook: lint right after an agent edits a design file or app code, and hand the findings
// back to the agent so it fixes them in the same turn. Zero dependencies. Paths below are for an app with the
// template in design-system/; in the template repo itself drop the "design-system/" prefix.
//   Claude Code (.claude/settings.json, PostToolUse):
//     node "$CLAUDE_PROJECT_DIR/design-system/design-build/hooks/after-edit.mjs" --format claude
//     → on findings: summary on stderr, exit 2 (Claude Code shows stderr to the model)
//   Cursor (.cursor/hooks.json, postToolUse):  node design-system/design-build/hooks/after-edit.mjs --format cursor
//     → on findings: {"additional_context": "..."} on stdout, exit 0
// Reads the hook's JSON payload on stdin and only runs for files lint.mjs covers: design docs, tokens,
// inventory, the design system's pages and the app's code (src/, app/, …; design-build/project.json).
// Render + axe are too slow per edit: they run in the pre-commit hook and CI.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findProject, fixHint, isAppCode } from '../lib/project.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..'); // the design system folder
const W = findProject(ROOT);
const format = process.argv.includes('--format') ? process.argv[process.argv.indexOf('--format') + 1] : 'claude';

let payload = {};
try { payload = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}
const ti = payload.tool_input || {};
const file = ti.file_path || ti.path || ti.target_file || payload.file_path || '';
const absFile = file ? path.resolve(payload.cwd || W.project, file) : '';
const relFile = absFile ? path.relative(ROOT, absFile).split(path.sep).join('/') : '';
const projRel = absFile ? path.relative(W.project, absFile).split(path.sep).join('/') : '';
const C = JSON.parse(fs.readFileSync(path.join(ROOT, 'design-build/lint.config.json'), 'utf8'));
const appCode = absFile && isAppCode(W, absFile, C.code_extensions);
const relevant = !relFile || appCode || (!relFile.startsWith('..') && (
  relFile === 'tokens/tokens.json'
  || C.design_files.includes(relFile)
  || relFile === 'design-build/inventory.json'
  || relFile === 'design-build/project.json'
  || (C.code_dirs.some((d) => relFile.startsWith(d + '/')) && C.code_extensions.includes(path.extname(relFile)))));
if (!relevant) process.exit(0);

if (relFile === 'tokens/tokens.json') {
  try {
    const { generate } = await import(path.join(ROOT, 'design-build/tokens-css.mjs'));
    const g = generate(ROOT);
    for (const [f, c] of [['tokens.css', g.css], ['tokens.js', g.js], ['tokens.mjs', g.mjs]]) fs.writeFileSync(path.join(ROOT, 'design-build/preview', f), c);
    const { writeOutputs } = await import(path.join(ROOT, 'design-build/lib/designmd.mjs'));
    writeOutputs(ROOT);
    const { build } = await import(path.join(ROOT, 'design-build/board.mjs'));
    const b = build(ROOT);
    const preview = path.join(ROOT, 'design-build/preview');
    fs.writeFileSync(path.join(preview, 'index.html'), b.html);
    fs.writeFileSync(path.join(preview, 'board.json'), b.json);
    fs.writeFileSync(path.join(preview, 'board.md'), b.md);
    fs.writeFileSync(path.join(preview, 'chrome.css'), b.css);
  } catch { /* lint reports tokens-format, exports-stale or board-stale below */ }
}
const { lint, format: formatLint } = await import(path.join(ROOT, 'design-build/lint.mjs'));
const res = lint({ root: ROOT });
let baseline = null;
try { baseline = JSON.parse(fs.readFileSync(path.join(ROOT, 'design-build/lint-baseline.json'), 'utf8')); } catch {}
const out = formatLint(res, baseline, {});
const all = res.findings.filter((f) => f.severity === 'error');
// With a user-approved baseline, report what this edit is responsible for: rules now over the baseline,
// plus errors in the edited file (so the agent fixes what it touches and counts keep going down).
const errors = baseline ? all.filter((e) => out.summary.rules_over_baseline.includes(e.rule) || e.file === projRel) : all;
if (!errors.length) process.exit(0);
const mine = errors.filter((e) => e.file === projRel);
const list = (mine.length ? mine : errors).slice(0, 15);
const text = `design lint: ${errors.length} error(s)${mine.length ? `, ${mine.length} in ${projRel}` : ''}. Fix these before you continue (design.md §0.5; do not edit the checks or their config):\n` +
  list.map((e) => `- ${e.file}:${e.line} ${e.rule}: ${e.message}\n  fix: ${e.fix}`).join('\n') +
  (errors.length > list.length ? `\n…and ${errors.length - list.length} more: run ${fixHint(W, 'node design-build/lint.mjs')}` : '');
if (format === 'cursor') { process.stdout.write(JSON.stringify({ additional_context: text }) + '\n'); process.exit(0); }
process.stderr.write(text + '\n');
process.exit(2);
