// lib/ui-inventory.mjs — the UI inventory: per-screen component use and per-component docs (ui-inventory/).
// design-build/inventory.json is the only source of structured facts (components, variants, props, import paths,
// screens and the components/variants/states each uses). The markdown under ui-inventory/ holds the prose
// (purpose, anatomy, states, tokens, motion, a11y, references…) plus a generated block that mirrors the JSON,
// so the two can't drift: `node design-system/design-build/ui-inventory.mjs` rewrites the blocks and index.md,
// and lint rule ui-inventory fails when they are stale.
import fs from 'node:fs';
import path from 'node:path';

export const UI_DIR = 'ui-inventory';
export const STATES = ['default', 'hover', 'focus', 'active', 'disabled', 'loading', 'empty', 'error', 'success'];   // digital-product.md §M1.2
export const DOC_STATES = ['default', 'hover', 'focus', 'active', 'disabled', 'loading', 'error'];
export const COMPONENT_HEADINGS = ['Purpose', 'Anatomy', 'Variants', 'States', 'Tokens', 'Motion', 'Accessibility', 'Responsive', 'Do and don\'t', 'References', 'Usage'];
export const BEGIN = '<!-- ui-inventory:generated — from design-build/inventory.json by `node design-system/design-build/ui-inventory.mjs`; edit the JSON, not this block -->';
export const END = '<!-- /ui-inventory:generated -->';

export const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const docPath = (c) => c.doc || `${UI_DIR}/components/${slug(c.name)}.md`;
export const screenPath = (id) => `${UI_DIR}/screens/${slug(id)}.md`;
export const screensOf = (inv) => Object.entries(inv?.screens || {}).filter(([k]) => !k.startsWith('$'));
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const list = (a) => (a && a.length ? a.map((x) => `\`${x}\``).join(', ') : '—');

export function componentBlock(inv, c) {
  const used = screensOf(inv).flatMap(([id, s]) => (s.components || []).filter((u) => u.component === c.name).map((u) => `[${s.name || id}](../screens/${slug(id)}.md) (${list(u.variants)}; ${list(u.states)})`));
  return [
    BEGIN,
    `| | |`,
    `|---|---|`,
    `| Status | ${c.status} |`,
    `| React import | ${c.import ? `\`import { ${c.name} } from '…/${c.import}'\`` : '—'} |`,
    `| HTML/CSS API | ${c.html ? `\`${cell(c.html)}\` + \`components/components.css\`` : '—'} |`,
    `| Props | ${list(c.props)} |`,
    `| Variants | ${list(c.variants)} |`,
    `| Used on | ${used.length ? used.join('<br>') : 'no screen yet'} |`,
    END,
  ].join('\n');
}

export function screenBlock(inv, id, s) {
  const comps = (inv.components || []);
  const row = (u) => {
    const c = comps.find((x) => x.name === u.component);
    return `| [${u.component}](../components/${slug(u.component)}.md) | ${list(u.variants)} | ${list(u.states)} | ${c ? c.status : '**not in inventory**'} |`;
  };
  return [
    BEGIN,
    `| | |`,
    `|---|---|`,
    `| Screen | ${cell(s.name)} (\`${id}\`) |`,
    `| Route | \`${cell(s.route)}\` |`,
    `| Purpose | ${cell(s.purpose)} |`,
    `| Source | ${list(s.source)} |`,
    '',
    '| Component | Variants used | States used | Status |',
    '|---|---|---|---|',
    ...(s.components || []).map(row),
    END,
  ].join('\n');
}

export function indexMd(inv) {
  const comps = (inv.components || []);
  return [
    '# UI inventory',
    '',
    `Generated from \`design-build/inventory.json\` by \`node design-system/design-build/ui-inventory.mjs\`. Do not edit; edit the JSON and the docs, then run it. How it works: [README.md](README.md).`,
    '',
    '## Screens',
    '',
    '| Screen | Route | Purpose | Components |',
    '|---|---|---|---|',
    ...screensOf(inv).map(([id, s]) => `| [${cell(s.name)}](screens/${slug(id)}.md) | \`${cell(s.route)}\` | ${cell(s.purpose)} | ${(s.components || []).map((u) => u.component).join(', ')} |`),
    '',
    '## Components',
    '',
    '| Component | Status | Variants | Doc | Screens |',
    '|---|---|---|---|---|',
    ...comps.map((c) => {
      const on = screensOf(inv).filter(([, s]) => (s.components || []).some((u) => u.component === c.name)).map(([id, s]) => s.name || id);
      const hasDoc = c.doc || on.length;
      const none = c.status === 'planned' ? 'needs a doc before it is built' : 'app-only (no doc needed until it is on a screen)';
      return `| ${c.name} | ${c.status} | ${list(c.variants)} | ${hasDoc ? `[${slug(c.name)}.md](components/${slug(c.name)}.md)` : none} | ${on.join(', ') || '—'} |`;
    }),
    '',
  ].join('\n');
}

// Replace the generated block in a doc's text, or insert it under the first H1.
export function withBlock(text, block) {
  const a = text.indexOf(BEGIN.slice(0, 30)), b = text.indexOf(END);
  if (a >= 0 && b > a) return text.slice(0, a) + block + text.slice(b + END.length);
  const m = text.match(/^# .*\n/m);
  if (m) { const i = m.index + m[0].length; return `${text.slice(0, i)}\n${block}\n${text.slice(i)}`; }
  return `${block}\n\n${text}`;
}
export const blockOf = (text) => { const a = text.indexOf(BEGIN.slice(0, 30)), b = text.indexOf(END); return a >= 0 && b > a ? text.slice(a, b + END.length) : null; };

// Files the generator owns: { rel: expected full text } for index.md, and { rel: block } for docs.
export function expected(root, inv) {
  const out = { index: { rel: `${UI_DIR}/index.md`, text: indexMd(inv) }, blocks: [] };
  const comps = inv.components || [];
  // A doc is required for every component used on a listed screen, and kept fresh for any entry that names one
  // (`doc`). App-only wrappers such as the root <App> need an inventory entry, not a design-system doc.
  const needDoc = new Set([...comps.filter((c) => c.doc).map((c) => c.name), ...screensOf(inv).flatMap(([, s]) => (s.components || []).map((u) => u.component))]);
  for (const c of comps) if (needDoc.has(c.name)) out.blocks.push({ rel: docPath(c), block: componentBlock(inv, c), kind: 'component', name: c.name });
  for (const [id, s] of screensOf(inv)) out.blocks.push({ rel: screenPath(id), block: screenBlock(inv, id, s), kind: 'screen', name: id });
  return out;
}

// Resolve a screen source file: project root first, then the design-system folder.
export function resolveSource(project, root, rel) {
  for (const base of [project, root]) { const f = path.resolve(base, rel); if (fs.existsSync(f)) return f; }
  return null;
}
