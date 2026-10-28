// Markdown helpers for the design files: front matter, section ids per line, fenced yaml blocks, tables. Zero dependencies.
import { parseYaml } from './yaml.mjs';

/** Split a markdown file into { frontMatter: {text, startLine, endLine}, lines: [{n, text, section, fence}] } */
export function analyze(text) {
  const rows = text.split('\n');
  let fm = null;
  let i = 0;
  if (rows[0] === '---') {
    const end = rows.indexOf('---', 1);
    if (end > 0) { fm = { text: rows.slice(1, end).join('\n'), startLine: 2, endLine: end + 1 }; i = end + 1; }
  }
  const lines = [];
  let section = null;
  let fence = null; // { lang, start }
  const blocks = [];
  for (let k = 0; k < rows.length; k++) {
    const t = rows[k];
    const n = k + 1;
    if (k < i) { lines.push({ n, text: t, section: null, fence: null, frontMatter: true }); continue; }
    const f = t.match(/^\s*```(\w*)/);
    if (f) {
      if (!fence) { fence = { lang: f[1] || '', start: n, body: [] }; lines.push({ n, text: t, section, fence: 'open' }); continue; }
      blocks.push({ ...fence, section, end: n, text: fence.body.join('\n'), startLine: fence.start + 1 });
      fence = null; lines.push({ n, text: t, section, fence: 'close' }); continue;
    }
    if (fence) { fence.body.push(t); lines.push({ n, text: t, section, fence: fence.lang || 'plain' }); continue; }
    const h = t.match(/^(#{2,4})\s+§?((?:M\d+|\d+)(?:\.\d+)*)\b/);
    if (h) section = `§${h[2]}`;
    lines.push({ n, text: t, section, fence: null });
  }
  return { frontMatter: fm, lines, blocks };
}

/** True if `section` is `parent` or inside it (§13 contains §13.2). */
export const inSection = (section, parent) => !!section && (section === parent || section.startsWith(parent + '.'));

/** Parse the first fenced yaml block whose top-level key is `key`. Returns { value, lines, block } or null. */
export function yamlBlock(analysis, key) {
  for (const b of analysis.blocks) {
    if (b.lang !== 'yaml') continue;
    const first = b.text.split('\n').find((l) => l.trim() && !l.trim().startsWith('#'));
    if (!first || !first.startsWith(`${key}:`)) continue;
    // parse only this key's sub-tree (other top-level keys may use YAML we don't support)
    const rows = b.text.split('\n');
    let end = rows.length;
    for (let r = 1; r < rows.length; r++) if (/^[A-Za-z_][\w-]*:/.test(rows[r])) { end = r; break; }
    const parsed = parseYaml(rows.slice(0, end).join('\n'), b.startLine);
    return { value: parsed.value[key], lines: parsed.lines, block: b, all: b };
  }
  return null;
}

/** All top-level keys of a yaml block whose first key is `key` (e.g. tokens + modes). */
export function yamlBlockKeys(analysis, key, keys) {
  for (const b of analysis.blocks) {
    if (b.lang !== 'yaml') continue;
    const first = b.text.split('\n').find((l) => l.trim() && !l.trim().startsWith('#'));
    if (!first || !first.startsWith(`${key}:`)) continue;
    const rows = b.text.split('\n');
    const out = {};
    let r = 0;
    while (r < rows.length) {
      const m = rows[r].match(/^([A-Za-z_][\w-]*):/);
      if (!m) { r++; continue; }
      let e = r + 1;
      while (e < rows.length && !/^[A-Za-z_][\w-]*:/.test(rows[e])) e++;
      if (keys.includes(m[1])) {
        const parsed = parseYaml(rows.slice(r, e).join('\n'), b.startLine + r);
        out[m[1]] = { value: parsed.value[m[1]], lines: parsed.lines };
      }
      r = e;
    }
    return out;
  }
  return null;
}

/** Parse a markdown table that starts with a header row containing `firstHeader`. Returns rows of { cells, n }. */
export function table(analysis, firstHeader) {
  const L = analysis.lines;
  for (let k = 0; k < L.length; k++) {
    const t = L[k].text.trim();
    if (L[k].fence || !t.startsWith('|')) continue;
    const head = splitRow(t);
    if (head[0] !== firstHeader) continue;
    const out = { header: head, rows: [] };
    for (let j = k + 2; j < L.length && L[j].text.trim().startsWith('|'); j++) out.rows.push({ cells: splitRow(L[j].text.trim()), n: L[j].n });
    return out;
  }
  return null;
}
const splitRow = (t) => t.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

/** Find outermost {{ … }} placeholder spans in a string: [{start, end, text}] */
export function placeholders(s) {
  const out = [];
  let depth = 0, start = -1;
  for (let i = 0; i < s.length - 1; i++) {
    if (s[i] === '{' && s[i + 1] === '{') { if (depth === 0) start = i; depth++; i++; continue; }
    if (s[i] === '}' && s[i + 1] === '}' && depth > 0) { depth--; i++; if (depth === 0) out.push({ start, end: i + 1, text: s.slice(start + 2, i - 1) }); }
  }
  return out;
}

/** Strip one level of {{ }} from a value: "{{#fff}}" -> "#fff" */
export const unwrap = (v) => (typeof v === 'string' && /^\{\{[\s\S]*\}\}$/.test(v.trim()) ? v.trim().slice(2, -2).trim() : v);
