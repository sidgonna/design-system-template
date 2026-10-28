#!/usr/bin/env node
// Install the design pre-commit hook into the project's git repository. Run once per clone, from any folder:
//   node design-system/design-build/install-hooks.mjs      (app with the template in design-system/)
//   node design-build/install-hooks.mjs                    (the template repo itself)
// Writes <git hooks dir>/pre-commit (honours core.hooksPath), a small sh wrapper that runs
// design-build/hooks/pre-commit.mjs and fails loudly if that script or node is missing.
// An existing pre-commit hook that this script did not write is left alone; it prints the line to add instead.
// --root <dir>  the project root, if it is not the git top level / the nearest package.json above design-system/
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { findProject, dsPrefix } from './lib/project.mjs';

const MARKER = '# design-system pre-commit (installed by design-build/install-hooks.mjs)';
const DS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const i = process.argv.indexOf('--root');
const W = findProject(DS, i > 0 ? process.argv[i + 1] : null);
for (const w of W.warnings) console.error(`WARNING ${w}`);
let top, hooksDir;
try {
  top = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: W.project, encoding: 'utf8' }).trim();
  hooksDir = path.resolve(top, execFileSync('git', ['rev-parse', '--git-path', 'hooks'], { cwd: top, encoding: 'utf8' }).trim());
} catch { console.error(`install-hooks: ${W.project} is not a git repository. Run git init first.`); process.exit(1); }
const hookRel = path.relative(top, path.join(DS, 'design-build/hooks/pre-commit.mjs')).split(path.sep).join('/');
if (hookRel.startsWith('..')) { console.error(`install-hooks: the design system (${DS}) is outside the git repository at ${top}.`); process.exit(1); }
const body = `#!/bin/sh
${MARKER}
# PROTECTED (design.md §0.5): agents must not edit or remove this hook, or bypass it with --no-verify.
TOP=$(git rev-parse --show-toplevel) || exit 1
HOOK="$TOP/${hookRel}"
if ! command -v node >/dev/null 2>&1; then
  echo "design pre-commit: node is not installed, so the design checks cannot run. Install Node 18+." >&2
  exit 1
fi
if [ ! -f "$HOOK" ]; then
  echo "design pre-commit: $HOOK is missing, so the design checks cannot run." >&2
  echo "Restore the design system folder (${dsPrefix(W) || './'}), or remove this hook ($0) if the design system was removed on purpose." >&2
  exit 1
fi
exec node "$HOOK"
`;
const file = path.join(hooksDir, 'pre-commit');
if (fs.existsSync(file) && !fs.readFileSync(file, 'utf8').includes(MARKER)) {
  console.error(`install-hooks: ${file} already exists and was not written by this script, so it was left alone.\nAdd this line to it (before any exec/exit at the end):\n  node "$(git rev-parse --show-toplevel)/${hookRel}" || exit 1`);
  process.exit(1);
}
fs.mkdirSync(hooksDir, { recursive: true });
fs.writeFileSync(file, body, { mode: 0o755 });
fs.chmodSync(file, 0o755);
console.log(`installed ${path.relative(process.cwd(), file) || file} → runs ${hookRel} before every commit (lint on design files + app code; render + axe when visual files change).`);
