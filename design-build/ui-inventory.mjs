#!/usr/bin/env node
// ui-inventory.mjs — sync ui-inventory/ with design-build/inventory.json (the single source of structured facts).
// Usage (from the app root): node design-system/design-build/ui-inventory.mjs [--check]
//   Rewrites ui-inventory/index.md and the generated block at the top of every screen and component doc.
//   A screen or component that has no doc yet gets one from ui-inventory/templates/, to be filled in by hand
//   (design.md §16 Phase 6 step 4: a screen entry and a component doc come before building or mapping).
//   --check   change nothing; exit 1 if anything is missing or out of date (lint rule ui-inventory does the same)
import fs from 'node:fs';
import path from 'node:path';
import { DS_ROOT } from './lib/project.mjs';
import { expected, withBlock, blockOf, UI_DIR } from './lib/ui-inventory.mjs';

const check = process.argv.includes('--check');
const root = DS_ROOT;
let inv;
try { inv = JSON.parse(fs.readFileSync(path.join(root, 'design-build/inventory.json'), 'utf8')); } catch (e) { console.error(`ui-inventory: design-build/inventory.json: ${e.message}`); process.exit(2); }
const exp = expected(root, inv);
const changes = [];
const write = (rel, text) => { changes.push(rel); if (!check) { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text); } };
const read = (rel) => (fs.existsSync(path.join(root, rel)) ? fs.readFileSync(path.join(root, rel), 'utf8') : null);

if (read(exp.index.rel) !== exp.index.text) write(exp.index.rel, exp.index.text);
for (const b of exp.blocks) {
  let text = read(b.rel);
  if (text === null) {
    const tpl = read(`${UI_DIR}/templates/${b.kind}.md`) || `# ${b.name}\n`;
    text = tpl.replace(/\{\{NAME\}\}/g, b.kind === 'component' ? b.name : (inv.screens[b.name]?.name || b.name));
    console.log(`created ${b.rel} from the ${b.kind} template: fill in every section before building the ${b.kind}`);
  }
  if (blockOf(text) !== b.block) write(b.rel, withBlock(text, b.block));
}
if (check) {
  if (changes.length) { console.log(`ui-inventory: out of date: ${changes.join(', ')}\nfix: node design-system/design-build/ui-inventory.mjs`); process.exit(1); }
  console.log('ui-inventory: up to date');
} else console.log(changes.length ? `ui-inventory: updated ${changes.join(', ')}` : 'ui-inventory: up to date');
