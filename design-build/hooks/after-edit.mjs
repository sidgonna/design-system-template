#!/usr/bin/env node
// Agent after-edit hook: lint the design system right after an agent edits a design file, and hand the
// findings back to the agent so it fixes them in the same turn. Zero dependencies.
//   Claude Code (.claude/settings.json, PostToolUse):  node design-build/hooks/after-edit.mjs --format claude
//     → on findings: summary on stderr, exit 2 (Claude Code shows stderr to the model)
//   Cursor (.cursor/hooks.json, postToolUse):           node design-build/hooks/after-edit.mjs --format cursor
//     → on findings: {"additional_context": "..."} on stdout, exit 0
// Reads the hook's JSON payload on stdin and only runs for design files (design docs, tokens, code that
// lint.mjs covers). Render + axe are too slow per edit: they run in the pre-commit hook and CI.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const format = process.argv.includes('--format') ? process.argv[process.argv.indexOf('--format') + 1] : 'claude';

let payload = {};
try { payload = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}
const ti = payload.tool_input || {};
const file = ti.file_path || ti.path || ti.target_file || payload.file_path || '';
const relFile = file ? path.relative(ROOT, path.resolve(payload.cwd || ROOT, file)).split(path.sep).join('/') : '';
const C = JSON.parse(fs.readFileSync(path.join(ROOT, 'design-build/lint.config.json'), 'utf8'));
const relevant = !relFile
  || relFile === 'tokens/tokens.json'
  || C.design_files.includes(relFile)
  || relFile === 'design-build/inventory.json'
  || (C.code_dirs.some((d) => relFile.startsWith(d + '/')) && C.code_extensions.includes(path.extname(relFile)));
if (!relevant || relFile.startsWith('..')) process.exit(0);

if (relFile === 'tokens/tokens.json') {
  const { generate } = await import(path.join(ROOT, 'design-build/tokens-css.mjs'));
  try { generate(ROOT); } catch (e) { /* lint reports tokens-format problems below */ }
}
const { lint } = await import(path.join(ROOT, 'design-build/lint.mjs'));
const res = lint({ root: ROOT });
const errors = res.findings.filter((f) => f.severity === 'error');
if (!errors.length) process.exit(0);
const mine = errors.filter((e) => e.file === relFile);
const list = (mine.length ? mine : errors).slice(0, 15);
const text = `design lint: ${errors.length} error(s)${mine.length ? `, ${mine.length} in ${relFile}` : ''}. Fix these before you continue (design.md §0.5; do not edit the checks or their config):\n` +
  list.map((e) => `- ${e.file}:${e.line} ${e.rule}: ${e.message}\n  fix: ${e.fix}`).join('\n') +
  (errors.length > list.length ? `\n…and ${errors.length - list.length} more: run node design-build/lint.mjs` : '');
if (format === 'cursor') { process.stdout.write(JSON.stringify({ additional_context: text }) + '\n'); process.exit(0); }
process.stderr.write(text + '\n');
process.exit(2);
