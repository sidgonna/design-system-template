// Theme fixtures: turn a copy of the template into a dark-only or a three-theme (light, dark, high-contrast)
// design system, editing design.md themes:, the core.md §13 block and tokens_file together, so every check
// (lint, Terrazzo, tokens.css, board, render) must pass on them without special cases.
//   node design-build/test/fixtures/themes/make.mjs <copy-dir> dark-only|three-theme
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatJson } from '../../../lib/json-format.mjs';

const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');
const write = (dir, rel, s) => fs.writeFileSync(path.join(dir, rel), s);
const setThemes = (dir, list) => write(dir, 'design.md', read(dir, 'design.md').replace(/^themes: \[[^\]]*\]/m, `themes: [${list.join(', ')}]`));

/** Line index → key path for the YAML lines between [from, to) of the §13 block, with indent stripped by `drop`. */
function paths(lines, from, to, drop) {
  const out = new Map(), stack = [];
  for (let i = from; i < to; i++) {
    const m = lines[i].match(/^(\s*)([A-Za-z0-9_-]+):(.*)$/);
    if (!m) continue;
    const depth = (m[1].length - drop) / 2;
    if (!Number.isInteger(depth) || depth < 0) continue;
    stack.length = depth; stack[depth] = m[2];
    out.set(i, { path: stack.slice(0, depth + 1).join('.'), rest: m[3], indent: m[1].length });
  }
  return out;
}
function coreBlock(s) {
  const lines = s.split('\n');
  const start = lines.findIndex((l, i) => l === 'tokens:' && lines[i - 1] === '```yaml');
  const modes = lines.findIndex((l, i) => i > start && l.startsWith('modes:'));
  const end = lines.findIndex((l, i) => i > modes && (l === '```' || /^ramps:/.test(l)));   // the modes block ends at ramps: (or the fence)
  return { lines, start, modes, end };
}

/** Dark only: §13's base values become the dark ones, the modes block goes, tokens keep one "dark" mode. */
export function darkOnly(dir) {
  setThemes(dir, ['dark']);
  const core = read(dir, 'design/core.md');
  const { lines, start, modes, end } = coreBlock(core);
  const darkStart = lines.findIndex((l, i) => i > modes && /^ {2}dark:/.test(l));
  const base = paths(lines, start + 1, modes, 2), dark = paths(lines, darkStart + 1, end, 4);
  const byPath = new Map([...base].map(([i, e]) => [e.path, i]));
  for (const [, e] of dark) {
    if (!e.rest.trim()) continue;
    const i = byPath.get(e.path);
    if (i === undefined) throw new Error(`dark-only: §13 has no base line for ${e.path}`);
    lines[i] = `${' '.repeat(base.get(i).indent)}${e.path.split('.').pop()}:${e.rest}`;
  }
  lines.splice(modes, end - modes, '');   // a one-theme system has no modes: (core.md §13.4)
  write(dir, 'design/core.md', lines.join('\n'));
  const t = JSON.parse(read(dir, 'tokens/tokens.json'));
  (function walk(n) {
    if (!n || typeof n !== 'object') return;
    const m = n.$extensions?.mode;
    if (m && m.dark !== undefined) { n.$value = m.dark; delete n.$extensions.mode; if (!Object.keys(n.$extensions).length) delete n.$extensions; }
    for (const [k, v] of Object.entries(n)) if (!k.startsWith('$')) walk(v);
  })(t);
  write(dir, 'tokens/tokens.json', formatJson(t));
}

// high contrast: black on white, every border and secondary text at full strength
const HC = {
  'color.text.secondary': '{palette.neutral.950}',
  'color.border.subtle': '{palette.neutral.950}', 'color.border.default': '{palette.neutral.950}', 'color.border.strong': '{palette.neutral.950}',
  'color.surface.sunken': '{palette.white}', 'color.surface.raised': '{palette.white}',
  'color.brand.primary': '{palette.primary.800}', 'color.focus': '{palette.primary.900}',
};
/** Three themes: light, dark and high-contrast (a light scheme with stronger text and borders). */
export function threeTheme(dir) {
  setThemes(dir, ['light', 'dark', 'high-contrast']);
  const core = read(dir, 'design/core.md');
  const { lines, end } = coreBlock(core);
  const nest = {};
  for (const [p, v] of Object.entries(HC)) { const k = p.split('.'); let o = nest; for (const s of k.slice(0, -1)) o = o[s] ??= {}; o[k.at(-1)] = v; }
  const yaml = [];
  (function emit(o, ind) { for (const [k, v] of Object.entries(o)) { if (typeof v === 'object') { if (Object.values(v).every((x) => typeof x === 'string')) yaml.push(`${' '.repeat(ind)}${k}: { ${Object.entries(v).map(([a, b]) => `${a}: "${b}"`).join(', ')} }`); else { yaml.push(`${' '.repeat(ind)}${k}:`); emit(v, ind + 2); } } else yaml.push(`${' '.repeat(ind)}${k}: "${v}"`); } })(nest, 4);
  let at = end; while (at > 0 && !lines[at - 1].trim()) at--;
  lines.splice(at, 0, '  high-contrast:   # a light scheme for prefers-contrast: more', ...yaml);
  write(dir, 'design/core.md', lines.join('\n'));
  const t = JSON.parse(read(dir, 'tokens/tokens.json'));
  (function walk(n, pre) {
    if (!n || typeof n !== 'object') return;
    const m = n.$extensions?.mode;
    if (m && m.light !== undefined) m['high-contrast'] = HC[pre] ?? m.light;
    for (const [k, v] of Object.entries(n)) if (!k.startsWith('$')) walk(v, pre ? `${pre}.${k}` : k);
  })(t, '');
  write(dir, 'tokens/tokens.json', formatJson(t));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [dir, kind] = process.argv.slice(2);
  const fn = { 'dark-only': darkOnly, 'three-theme': threeTheme }[kind];
  if (!dir || !fn) { console.error('usage: make.mjs <dir> dark-only|three-theme'); process.exit(2); }
  fn(path.resolve(dir));
}
