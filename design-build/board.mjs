#!/usr/bin/env node
// Generates the design board: design-build/preview/index.html (the page people review), plus board.json and board.md
// (the same content for AI agents and exports). It replaces the old preview page and the Phase 3 studies page.
// Zero dependencies. Deterministic: the output depends only on the design files, tokens, inventory, ui-inventory docs,
// {asset_root}/logo/logo.json, {asset_root}/fonts/fonts.css (whether it exists) and design-build/review.json, so lint.mjs (rule board-stale) can tell when it is out of date.
//
// Usage (from the app root, prefix design-system/; from the template root, as written):
//   node design-build/board.mjs                         write preview/index.html, preview/board.json, preview/board.md
//   node design-build/board.mjs --check                 exit 1 if any of them is stale or logo.json is invalid
//   node design-build/board.mjs --review "§4=accept" --review "§5=edit:warmer heading font"
//                                                       record Phase 5 verdicts in design-build/review.json, then rebuild
//   node design-build/board.mjs --overview-only --direction A --direction B
//                                                       Phase 3: one overview card per direction (studies/directions/<ID>.json)
//                                                       → studies/index.html and studies/directions/<ID>.resolved.json
//   node design-build/board.mjs --serve [--port 4173]   serve the design-system folder (the studies page needs http)
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { loadContext, pairingResults, readJson } from './lib/context.mjs';
import { placeholders } from './lib/markdown.mjs';
import { loadTokens, flatten, varName } from './lib/tokens.mjs';
import { toHex } from './lib/color.mjs';
import { screensOf, docPath, screenPath, slug, COMPONENT_HEADINGS, END } from './lib/ui-inventory.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const OUT = { html: 'design-build/preview/index.html', json: 'design-build/preview/board.json', md: 'design-build/preview/board.md' };
export const REVIEW_FILE = 'design-build/review.json';
export const VERDICTS = ['accept', 'edit', 'reject'];

// ---------- text helpers (the page is code: lint.mjs checks it, so raw values never reach it as text) ----------
const RAW = [
  /\b(rgba?|hsla?|oklch|oklab|lab|lch|hwb|color)\([^()]*\)/gi,
  /(?<![\w&#/-])#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![\w-])/g,
  /(?<![\w.#-])-?(?:\d+\.?\d*|\.\d+)px\b/g,
  /(?<![\w.#-])(?:\d+\.?\d*|\.\d+)ms\b/g,
];
const hasRaw = (s) => RAW.some((re) => { re.lastIndex = 0; return re.test(s); });
const clean = (s, src) => RAW.reduce((t, re) => t.replace(re, () => `(value in ${src})`), String(s));
export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Long token names and paths in <code> wrap only after a dot or slash (never mid-word): a <wbr> goes after each one.
export const wrapCode = (html) => html.replace(/(<code\b[^>]*>)([^<]*)(<\/code>)/g, (m, a, t, b) => a + t.replace(/([./])(?=[A-Za-z_{-])/g, '$1<wbr>') + b);
const stripPh = (s) => String(s).replace(/\{\{|\}\}/g, '');
const TOKREF = /\{([a-z][\w-]*(?:\.[\w*.-]+)+)\}/gi;

/** The hint shown in a hatched "not filled" chip. Template examples with raw values point to their source instead. */
export function safeHint(text, src) {
  let h = stripPh(text).replace(/^["'\s]+|["'\s]+$/g, '').replace(TOKREF, '$1').trim();
  if (!h || /^[.…\s]+$/.test(h)) return 'to fill';
  if (hasRaw(h)) return `to fill (template example in ${src})`;
  if (h.length > 110) h = h.slice(0, 107).trimEnd() + '…';
  return h;
}

function fmt(s, src) {
  // `code` spans first, then links (text only, so no relative link can break), bold and token refs
  return String(s).split(/(`[^`]*`)/).map((part) => {
    if (/^`[^`]*`$/.test(part)) return `<code>${esc(clean(part.slice(1, -1).replace(TOKREF, '$1'), src))}</code>`;
    let t = esc(clean(part, src));
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    t = t.replace(TOKREF, '<code>$1</code>');
    return t;
  }).join('');
}
const chip = (text, src) => `<span class="ph"><span class="sr-only">Not filled: </span>${esc(safeHint(text, src))}</span>`;

/** Inline markdown with {{placeholders}} as hatched chips. */
export function inline(s, src) {
  s = String(s);
  let out = '', pos = 0;
  for (const p of placeholders(s)) { out += fmt(s.slice(pos, p.start), src) + chip(p.text, src); pos = p.end; }
  return out + fmt(s.slice(pos), src);
}

function stripYamlComment(line) {
  let q = null, depth = 0;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (line.startsWith('{{', i)) { depth++; i++; continue; }
    if (line.startsWith('}}', i) && depth) { depth--; i++; continue; }
    if (depth) continue;
    if (q) { if (c === q) q = null; continue; }
    if (c === '"' || c === "'") q = c;
    else if (c === '#' && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
  }
  return line;
}
const unquote = (v) => v.replace(/"([^"]*)"/g, '$1').replace(/'([^']*)'/g, '$1');

/** A yaml block as key/value rows (comments dropped, quotes removed, placeholders as chips). */
function renderYaml(text, src) {
  const rows = [];
  for (const raw of text.split('\n')) {
    const line = stripYamlComment(raw).replace(/\s+$/, '');
    if (!line.trim()) continue;
    const depth = Math.min(3, Math.floor(line.match(/^ */)[0].length / 2));
    let t = line.trim(), key = '', val = '';
    const item = t.startsWith('- ');
    if (item) t = t.slice(2).trim();
    const flow = !t.startsWith('{{') && t.match(/^\{\s*([\s\S]*)\}$/);
    if (flow) {
      const parts = flow[1].split(/,\s*(?=[\w-]+:\s)/).map((p) => p.trim());
      const [k0, ...rest] = parts;
      key = unquote(k0.replace(/^[\w-]+:\s*/, ''));
      val = rest.map((p) => unquote(p)).join(' · ');
    } else {
      const m = !t.startsWith('{{') && t.match(/^([\w.-]+):\s*(.*)$/);
      if (m) { key = m[1]; val = m[2]; } else { key = item ? '•' : ''; val = t; }
      if (/^\[[\s\S]*\]$/.test(val)) val = val.slice(1, -1);
      val = unquote(val);
    }
    rows.push(`<div class="fact d${depth}${val ? '' : ' group'}"><dt>${inline(key, src)}</dt><dd>${val ? inline(val, src) : ''}</dd></div>`);
  }
  return rows.length ? `<dl class="facts">${rows.join('')}</dl>` : '';
}

const splitRow = (t) => t.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
function renderTable(rows, src, label) {
  const head = splitRow(rows[0]);
  const body = rows.slice(2).map(splitRow);
  return `<div class="table-scroll" role="region" aria-label="${esc(label)}" tabindex="0"><table><thead><tr>${head.map((h) => `<th scope="col">${h ? inline(h, src) : '<span class="sr-only">Column</span>'}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${head.map((_, i) => `<td>${inline(r[i] ?? '', src)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

/** Render a section's markdown lines as compact HTML. skipYaml: first keys of yaml blocks a specimen replaces. */
function renderBlocks(lines, src, { skipYaml = [], skipTables = [], label = 'Table' } = {}) {
  const out = [];
  let i = 0, list = null, para = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(' '), src)}</p>`); para = []; } };
  const flushList = () => { if (list) { out.push(`<${list.tag}>${list.items.map((x) => `<li>${x}</li>`).join('')}</${list.tag}>`); list = null; } };
  while (i < lines.length) {
    const t = lines[i].text.trim();
    if (t.startsWith('```')) {
      flushPara(); flushList();
      const lang = (t.match(/^```(\w*)/) || [])[1] || '';
      const body = [];
      for (i++; i < lines.length && !lines[i].text.trim().startsWith('```'); i++) body.push(lines[i].text);
      i++;
      const first = (body.find((b) => b.trim() && !b.trim().startsWith('#')) || '').trim();
      const key = (first.match(/^-?\s*([\w-]+):/) || [])[1];
      if (lang === 'yaml' && !skipYaml.includes(key)) out.push(renderYaml(body.join('\n'), src));
      continue;
    }
    if (/^#{1,4}\s/.test(t) || t === '---' || /^\*\*FEEL:\*\*/.test(t) || !t) { flushPara(); if (!t || t === '---' || t.startsWith('#')) flushList(); i++; continue; }
    if (t.startsWith('|')) {
      flushPara(); flushList();
      const rows = [];
      while (i < lines.length && lines[i].text.trim().startsWith('|')) rows.push(lines[i++].text.trim());
      if (rows.length >= 2 && !skipTables.includes(splitRow(rows[0])[0])) out.push(renderTable(rows, src, label));
      continue;
    }
    const b = t.match(/^(?:[-*]|(\d+)\.)\s+(?:\[[ x]\]\s+)?(.*)$/);
    if (b) {
      flushPara();
      const tag = b[1] ? 'ol' : 'ul';
      if (!list || list.tag !== tag) { flushList(); list = { tag, items: [] }; }
      list.items.push(inline(b[2], src));
      i++; continue;
    }
    flushList();
    para.push(t.replace(/^>\s?/, ''));
    i++;
  }
  flushPara(); flushList();
  return out.join('\n');
}

// ---------- model ----------
const sectionOf = (f, id) => (f ? f.analysis.lines.filter((L) => !L.frontMatter && L.section === id) : []);
const countPh = (lines) => lines.reduce((s, L) => s + placeholders(L.text).length, 0);
const hintsOf = (lines, src) => lines.flatMap((L) => placeholders(L.text).map((p) => ({ line: L.n, hint: safeHint(p.text, src) })));
function headingOf(f, id) {
  const L = sectionOf(f, id).find((x) => /^#{2,4}\s/.test(x.text));
  return L ? L.text.replace(/^#{2,4}\s+§?/, '').replace(/^(?:M\d+|\d+)(?:\.\d+)*\s*/, '').trim() : '';
}
function feelOf(lines) {
  const L = lines.find((x) => /^\*\*FEEL:\*\*/.test(x.text.trim()));
  return L ? L.text.trim().replace(/^\*\*FEEL:\*\*\s*/, '') : null;
}

/** design.md parts → on (always_load or enabled: true), off (enabled: false) or unset (still a {{placeholder}}). */
export function moduleStates(ctx) {
  const parts = ctx.index?.fm?.parts || {};
  const out = {};
  for (const [k, p] of Object.entries(parts)) {
    if (!p || typeof p !== 'object' || !p.file) continue;
    const rel = String(p.file).startsWith('design/') ? String(p.file) : `design/${p.file}`;
    out[rel] = { key: k, state: p.always_load === true || p.enabled === true ? 'on' : p.enabled === false ? 'off' : 'unset' };
  }
  return out;
}

function loadReview(root) {
  const r = readJson(path.join(root, REVIEW_FILE), null);
  return r && r.verdicts && typeof r.verdicts === 'object' ? r : { verdicts: {} };
}

/** {asset_root}/logo/logo.json, checked against the rules in design-build/schemas/logo.schema.json (no schema library). */
export function logoModel(ctx, root) {
  const assetRoot = String(ctx.index?.fm?.asset_root ?? 'assets').replace(/^\{\{|\}\}$/g, '') || 'assets';
  const rel = `${assetRoot}/logo/logo.json`;
  const abs = path.join(root, rel);
  const problems = [];
  if (!fs.existsSync(abs)) return { rel, placeholder: null, variants: [], problems: [`${rel} is missing`] };
  let m;
  try { m = JSON.parse(fs.readFileSync(abs, 'utf8')); } catch (e) { return { rel, placeholder: null, variants: [], problems: [`${rel} is not valid JSON: ${e.message}`] }; }
  if (typeof m.placeholder !== 'boolean') problems.push('"placeholder" must be true or false');
  if (!m.variants || typeof m.variants !== 'object' || !Object.keys(m.variants).length) problems.push('"variants" must list at least one variant');
  for (const k of Object.keys(m)) if (!['$schema', '$comment', 'placeholder', 'variants'].includes(k)) problems.push(`unknown key "${k}"`);
  const variants = [];
  for (const [name, v] of Object.entries(m.variants || {})) {
    if (!/^[a-z][a-z0-9_]*$/.test(name)) problems.push(`variant name "${name}" must be snake_case`);
    if (!v || typeof v !== 'object') { problems.push(`variant ${name} must be an object`); continue; }
    for (const k of Object.keys(v)) if (!['file', 'use', 'color', 'background'].includes(k)) problems.push(`variant ${name}: unknown key "${k}"`);
    for (const k of ['file', 'use', 'color', 'background']) if (typeof v[k] !== 'string') problems.push(`variant ${name}: "${k}" is required`);
    const out = { name, file: v.file, use: v.use || '', color: v.color, background: v.background, svg: null, hex: {} };
    if (typeof v.file === 'string') {
      if (!/^[A-Za-z0-9._-]+\.svg$/.test(v.file)) problems.push(`variant ${name}: "file" must be an .svg file name in ${assetRoot}/logo/`);
      else if (!fs.existsSync(path.join(path.dirname(abs), v.file))) problems.push(`variant ${name}: ${assetRoot}/logo/${v.file} does not exist`);
      else out.svg = fs.readFileSync(path.join(path.dirname(abs), v.file), 'utf8');
    }
    for (const slot of ['color', 'background']) {
      const ref = v[slot];
      if (typeof ref !== 'string') continue;
      const p = /^\{color(\.[A-Za-z0-9_-]+)+\}$/.test(ref) ? ref.slice(1, -1) : null;
      if (!p) { problems.push(`variant ${name}: "${slot}" must be a colour token ref like {color.brand.primary}`); continue; }
      const t = ctx.flat.get(p);
      if (!t || t.type !== 'color') { problems.push(`variant ${name}: ${ref} is not a colour token in ${ctx.tokensRel}`); continue; }
      out[slot + 'Path'] = p;
      out.hex[slot] = Object.fromEntries(Object.entries(t.color).filter(([, c]) => c).map(([mode, c]) => [mode, toHex(c)]));
    }
    variants.push(out);
  }
  return { rel, placeholder: m.placeholder === true, variants, problems };
}

/** Everything the board shows (board.json is this without the source lines). */
export function model(root) {
  const ctx = loadContext(root);
  const F = (rel) => ctx.files.get(rel);
  const mods = moduleStates(ctx);
  const review = loadReview(root);
  const logo = logoModel(ctx, root);
  const tiles = [];
  const T = (o) => { tiles.push({ ...o, verdict: review.verdicts[o.review] || null }); return o; };
  const status = (lines, feel) => {
    if (!countPh(lines)) return 'filled';
    if (typeof feel === 'string') return placeholders(feel).length ? 'empty' : 'partial';
    const content = lines.filter((L) => L.text.trim() && !/^#{2,4}\s/.test(L.text) && L.text.trim() !== '---' && !L.fence);
    return content.every((L) => placeholders(L.text).length) ? 'empty' : 'partial';
  };
  const tileId = (id) => id.replace('§', '').toLowerCase().replace(/\./g, '-').replace(/^(\d)/, 's$1');
  const sec = (zone, rel, id, extra = {}) => {
    const f = F(rel), lines = sectionOf(f, id), feel = feelOf(lines);
    const mod = rel === 'design/core.md' ? 'on' : mods[rel]?.state ?? 'unset';
    return T({ zone, id: tileId(id), review: id, file: rel, sections: [id], title: `${id} ${headingOf(f, id)}`.trim(), feel, placeholders: countPh(lines), hints: hintsOf(lines, rel), status: f ? status(lines, feel) : 'empty', module: mod, counted: mod === 'on', lines, ...extra });
  };

  const idx = F(ctx.config.index), core = F('design/core.md');
  const introLines = [ctx.config.index, 'design/core.md'].flatMap((rel) => F(rel)?.analysis.lines.filter((L) => L.frontMatter || L.section === null) || []);
  const brandRaw = String(idx?.fm?.brand_name ?? '{{BRAND_NAME}}');
  const feelLine = (idx?.analysis.lines.find((L) => /One-line feel:/.test(L.text))?.text || '').replace(/^>?\s*\*\*One-line feel:\*\*\s*/, '');
  T({ zone: 0, id: 'overview', review: 'overview', file: ctx.config.index, sections: ['front matter', 'intro'], title: 'Brand at a glance', feel: null, placeholders: countPh(introLines), hints: hintsOf(introLines, ctx.config.index), status: status(introLines, feelLine), module: 'on', counted: true, lines: [], kind: 'overview', wide: true, duo: true });
  for (const n of [1, 2, 3, 6, 7, 8]) sec(1, 'design/core.md', `§${n}`, { duo: n === 3 });
  for (const n of [4, 5, 9, 10, 11, 12, 13]) sec(2, 'design/core.md', `§${n}`, { duo: n === 4 || n === 5 });
  const dp = 'design/digital-product.md';
  sec(3, dp, '§M1');
  for (let n = 1; n <= 7; n++) sec(3, dp, `§M1.${n}`, n === 1 ? { wide: true, duo: true } : {});
  const inv = ctx.inventory || { components: [], screens: {} };
  for (const c of inv.components || []) {
    const rel = docPath(c), abs = path.join(root, rel), has = c.status === 'existing' && fs.existsSync(abs);
    const text = has ? fs.readFileSync(abs, 'utf8') : '';
    const headings = [...text.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
    const missing = COMPONENT_HEADINGS.filter((h) => !headings.includes(h));
    const purpose = has ? (text.split(/^## Purpose\s*$/m)[1] || '').split(/^## /m)[0].trim().split(/\n\s*\n/)[0] : '';
    const ph = placeholders(text).length;
    const st = c.status !== 'existing' ? 'planned' : !has || missing.length || ph ? 'partial' : 'filled';
    T({ zone: 3, id: `comp-${slug(c.name)}`, review: `component:${slug(c.name)}`, file: has ? rel : ctx.inventoryRel, sections: [c.name], title: c.name, feel: null, placeholders: ph, hints: [], status: st, module: mods[dp]?.state ?? 'unset', counted: false, lines: [], kind: 'component', comp: c, missing, purpose });
  }
  for (const [id, s] of screensOf(inv)) {
    const rel = screenPath(id), abs = path.join(root, rel);
    const text = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
    const notes = text.includes(END) ? text.slice(text.indexOf(END) + END.length) : '';
    const ph = placeholders(notes).length;
    T({ zone: 4, id: `screen-${slug(id)}`, review: `screen:${slug(id)}`, file: rel, sections: [id], title: s.name || id, feel: null, placeholders: ph, hints: [], status: !text ? 'empty' : ph ? 'partial' : 'filled', module: mods[dp]?.state ?? 'unset', counted: false, lines: [], kind: 'screen', screen: { id, ...s }, notes, wide: true });
  }
  const mc = 'design/marketing-content.md';
  sec(5, mc, '§M2');
  for (let n = 1; n <= 4; n++) sec(5, mc, `§M2.${n}`);
  sec(5, 'design/motion-video.md', '§M3', { wide: true });
  sec(5, 'design/print.md', '§M4');
  for (let n = 1; n <= 5; n++) sec(6, 'design/core.md', `§14.${n}`);
  const idxLines = (id) => (idx ? idx.analysis.lines.filter((L) => !L.frontMatter && L.section && (L.section === id || L.section.startsWith(id + '.'))) : []);
  for (const [id, title] of [['§0', 'How to use this system'], ['§15', 'Pre-delivery checklist'], ['§16', 'Build workflow']]) {
    const lines = idxLines(id);
    const h = idx ? headingOf(idx, id) : '';
    T({ zone: 6, id: tileId(id), review: id, file: ctx.config.index, sections: [id], title: `${id} ${h || title}`, feel: null, placeholders: countPh(lines), hints: hintsOf(lines, ctx.config.index), status: status(lines, null), module: 'on', counted: true, lines, kind: 'index' });
  }
  T({ zone: 6, id: 'review', review: 'review', file: REVIEW_FILE, sections: ['Phase 5'], title: 'Phase 5 review', feel: null, placeholders: 0, hints: [], status: 'filled', module: 'on', counted: false, lines: [], kind: 'review' });

  // coverage: the same arithmetic as lint.mjs rule `completion`
  const counted = tiles.filter((t) => t.counted);
  const tp = ctx.config.template_placeholders || {};
  const enabled = [...ctx.files.values()].filter((f) => f.rel === ctx.config.index || f.rel === 'design/core.md' || mods[f.rel]?.state === 'on');
  const remaining = enabled.reduce((s, f) => s + countPh(f.analysis.lines), 0);
  const initial = ctx.config.template_placeholders ? enabled.reduce((s, f) => s + (tp[f.rel] || 0), 0) : remaining;
  const completion = initial ? Math.max(0, Math.min(1, 1 - remaining / initial)) : 1;
  const comps = tiles.filter((t) => t.kind === 'component');
  const coverage = {
    tiles: { total: counted.length, filled: counted.filter((t) => t.status === 'filled').length, partial: counted.filter((t) => t.status === 'partial').length, empty: counted.filter((t) => t.status === 'empty').length },
    placeholders: { remaining, initial, counted_in_tiles: counted.reduce((s, t) => s + t.placeholders, 0), completion: Math.round(completion * 1000) / 1000, phase4_min: ctx.config.completion_min ?? 0.9 },
    components: { existing: comps.filter((t) => t.comp.status === 'existing').length, documented: comps.filter((t) => t.status === 'filled').length, planned: comps.filter((t) => t.status === 'planned').length },
  };
  const modules = Object.entries(mods).filter(([rel]) => rel !== 'design/core.md').map(([rel, m]) => ({ file: rel, key: m.key, state: m.state }));
  const hex = {};
  for (const [p, e] of ctx.flat) if (e.type === 'color') hex[p] = Object.fromEntries(Object.entries(e.color).filter(([, c]) => c).map(([m, c]) => [m, toHex(c)]));
  return { ctx, mods, tiles, coverage, modules, review, logo, brandRaw, feelLine, pairings: pairingResults(ctx), hex };
}

// ---------- HTML ----------
export const ICON = {
  check: '<path d="M5 12l5 5L19 7"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>', close: '<path d="M6 6l12 12M18 6L6 18"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>', home: '<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6"/>', menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20h4"/>', heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  link: '<path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/>',
};
export const svgIcon = (k, cls = '') => `<svg class="icon${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICON[k]}</svg>`;
const STATUS = { filled: ['success', 'Filled'], partial: ['warning', 'Partly filled'], empty: ['neutral', 'Not filled'], planned: ['info', 'Planned'] };
export const ZONES = [
  [0, 'Overview', 'Brand at a glance and how complete the system is.'],
  [1, 'Brand identity', 'core.md §1, §2, §3, §6, §7 and §8: who the brand is, and how it looks and sounds.'],
  [2, 'Foundations', 'core.md §4, §5 and §9 to §13: color, type, space, motion, accessibility, languages and tokens.'],
  [3, 'Product (§M1)', 'digital-product.md and the component docs in ui-inventory/components/.'],
  [4, 'Screens', 'The UI inventory: every screen and the components it uses.'],
  [5, 'Application modules', 'marketing-content.md (§M2), motion-video.md (§M3) and print.md (§M4).'],
  [6, 'Governance', 'core.md §14, the design.md rules (§0, §15, §16) and the Phase 5 review.'],
];
const VERDICT_LABEL = { accept: 'Accepted', edit: 'Edit requested', reject: 'Rejected' };

function statusBadge(t) {
  if (t.module === 'off') return '<span data-component="badge" data-variant="neutral">Switched off</span>';
  const [v, label] = STATUS[t.status] || STATUS.partial;
  const n = t.placeholders && t.status !== 'planned' ? ` · ${t.placeholders} to fill` : '';
  return `<span data-component="badge" data-variant="${v}">${label}${n}</span>${t.module === 'unset' ? '<span data-component="badge" data-variant="info">Not chosen</span>' : ''}`;
}

function reviewBar(t) {
  const v = t.verdict;
  return `<p class="verdict" data-verdict-text${v ? '' : ' hidden'}>${v ? `${esc(VERDICT_LABEL[v.verdict] || v.verdict)}${v.note ? `: ${esc(v.note)}` : ''}${v.date ? ` (${esc(v.date)})` : ''}` : ''}</p>
<div class="review" role="group" aria-label="Review: ${esc(t.title)}"><button type="button" class="tool" data-verdict="accept" aria-pressed="${v?.verdict === 'accept'}">Accept</button><button type="button" class="tool" data-verdict="edit" aria-pressed="${v?.verdict === 'edit'}">Edit</button><button type="button" class="tool" data-verdict="reject" aria-pressed="${v?.verdict === 'reject'}">Reject</button><label class="review-note"><span class="sr-only">Note on ${esc(t.title)}</span><input type="text" class="note" placeholder="Note (optional)" value="${esc(v?.note || '')}"></label></div>`;
}

function tileHtml(t, body, M) {
  const kicker = t.kind === 'component' ? `ui-inventory · ${t.comp.status}` : t.kind === 'screen' ? 'ui-inventory · screen' : `${t.file.replace(/^design\//, '')} · ${t.sections.join(', ')}`;
  const key = M.mods[t.file]?.key || 'module';
  const attrs = [`class="tile${t.wide ? ' wide' : ''}"`, `id="tile-${t.id}"`, `data-tile="${t.id}"`, `data-status="${t.status}"`, `data-module-state="${t.module}"`, `data-review-id="${esc(t.review)}"`, t.verdict ? `data-verdict="${esc(t.verdict.verdict)}"` : '', t.duo ? 'data-duo' : '', `aria-labelledby="tile-${t.id}-h"`].filter(Boolean).join(' ');
  const modNote = t.module === 'off' ? `<p class="module-note">Switched off in design.md (<code>parts.${esc(key)}.enabled: false</code>). The tile stays so nothing is lost; the coverage ring leaves it out.</p>`
    : t.module === 'unset' ? `<p class="module-note">Module not chosen yet: set <code>parts.${esc(key)}.enabled</code> in design.md (Phase 1). Until then the coverage ring leaves it out.</p>` : '';
  return `<article ${attrs}>
<header class="tile-head"><div class="tile-title"><p class="kicker">${esc(kicker)}</p><h3 id="tile-${t.id}-h">${esc(t.title)}</h3></div><div class="tile-meta">${statusBadge(t)}<a class="anchor" href="#tile-${t.id}" aria-label="Link to ${esc(t.title)}">${svgIcon('link', 'sm')}</a></div></header>
${typeof t.feel === 'string' ? `<p class="feel"><strong>Feel:</strong> ${inline(t.feel, t.file)}</p>\n` : ''}${modNote}<div class="tile-body">
${body}
</div>
${reviewBar(t)}
</article>`;
}

const specimen = {
  icons: () => `<div class="icon-grid">${['check', 'info', 'close', 'arrow'].map((k) => `<div class="icon-cell"><div class="icon-sizes">${svgIcon(k, 'sm')}${svgIcon(k, 'md')}${svgIcon(k)}</div>${k[0].toUpperCase() + k.slice(1)}</div>`).join('')}</div>`,
  motion: () => `<div class="motion-demo">
<button type="button" data-component="button" data-variant="secondary" id="play-motion" aria-controls="motion-tracks" aria-pressed="false">Play motion</button>
<div id="motion-tracks" class="tracks">
<div class="motion-track"><span class="track-label">fast</span><div class="mover fast"></div></div>
<div class="motion-track"><span class="track-label">base</span><div class="mover"></div></div>
<div class="motion-track"><span class="track-label">slow</span><div class="mover slow"></div></div>
</div>
<p class="note-text">Play moves the squares at the fast, base and slow durations and replays the component motion (card entrance, badge pop-in, input error shake). With reduced motion nothing moves: the squares jump, and the card and badge only fade, for at most <code>motion.duration.fast</code> (core §10).</p>
</div>`,
  components: () => `<div id="components" class="components">
<h4>Button</h4>
<div class="row">
<button type="button" data-component="button" data-variant="primary">Save changes</button>
<button type="button" data-component="button" data-variant="secondary">Preview</button>
<button type="button" data-component="button" data-variant="ghost">Cancel</button>
<button type="button" data-component="button" data-variant="danger">Delete</button>
<button type="button" data-component="button" data-variant="primary" disabled>Disabled</button>
<button type="button" data-component="button" data-variant="primary" id="demo-loading" aria-busy="true" aria-disabled="true"><span data-part="spinner" aria-hidden="true"></span><span data-part="label">Saving…</span></button>
</div>
<h4>Input</h4>
<div class="grid-2">
<div data-component="input" data-variant="default">
<label for="email">Email address <span data-part="required">(required)</span></label>
<input id="email" type="email" autocomplete="email" required aria-describedby="email-hint">
<p data-part="hint" id="email-hint">We only use this for receipts.</p>
</div>
<div data-component="input" data-variant="error" id="demo-phone">
<label for="phone">Phone number</label>
<input id="phone" type="tel" autocomplete="tel" inputmode="numeric" aria-invalid="true" aria-describedby="phone-hint phone-error" value="98765">
<p data-part="hint" id="phone-hint">Enter all 10 digits.</p>
<p data-part="error" id="phone-error">That number has 5 digits; it needs 10.</p>
</div>
</div>
<h4>Card</h4>
<div class="grid-3">
<article data-component="card" data-variant="flat" data-enter><h5>Flat card</h5><p>A hairline border only. It has <code>data-enter</code>, so it plays the entrance.</p></article>
<article data-component="card" data-variant="raised"><h5>Raised card</h5><p>Uses <code>shadow.2</code> to lift off the page.</p></article>
<article data-component="card" data-variant="raised" data-interactive><h5><a href="#components">Interactive card</a></h5><p>Hover it or tab to its link: it lifts to <code>shadow.3</code>.</p></article>
</div>
<h4>Badge</h4>
<div class="row" id="demo-badges">
<span data-component="badge" data-variant="neutral">Draft</span>
<span data-component="badge" data-variant="success">Paid</span>
<span data-component="badge" data-variant="warning">Due soon</span>
<span data-component="badge" data-variant="error">Overdue</span>
<span data-component="badge" data-variant="info">New</span>
</div>
</div>`,
  scripts: () => `<div class="type-row"><span class="label">Telugu · font.family.te</span><p class="sample lang-te" lang="te">తెలుగు నమూనా వాక్యం: అందరికీ స్వాగతం.</p></div>
<div class="type-row"><span class="label">Hindi · font.family.hi</span><p class="sample lang-hi" lang="hi">हिंदी नमूना वाक्य: आप सभी का स्वागत है।</p></div>`,
};

function sliders(lines) {
  const rows = lines.filter((L) => L.text.trim().startsWith('|')).map((L) => splitRow(L.text.trim()));
  const start = rows.findIndex((r) => r[0] === 'Axis');
  if (start < 0) return '';
  return `<ul class="sliders">${rows.slice(start + 2).map((r) => {
    const ex = placeholders(r[3] || '').length > 0;
    const val = parseInt(stripPh(r[3] || ''), 10);
    const n = Number.isFinite(val) ? Math.max(1, Math.min(5, val)) : 3;
    const label = `${r[0]}: ${n} of 5, from ${r[1]} to ${r[2]}${ex ? ' (template example, not chosen yet)' : ''}`;
    return `<li><span class="slider-axis">${esc(r[1])}</span><span class="slider${ex ? ' is-example' : ''}" role="img" aria-label="${esc(label)}">${[1, 2, 3, 4, 5].map((k) => `<span class="dot${k === n ? ' on' : ''}"></span>`).join('')}</span><span class="slider-axis">${esc(r[2])}</span>${ex ? '<span class="ph small"><span class="sr-only">Not filled: </span>example</span>' : ''}</li>`;
  }).join('')}</ul>`;
}

export const inlineSvg = (svg) => String(svg).replace(/<\?xml[^>]*>\s*/, '').replace(/<title>[\s\S]*?<\/title>\s*/, '').replace(/<svg\b/, '<svg class="logo-svg" aria-hidden="true" focusable="false"').trim();

function logoGallery(M) {
  const L = M.logo;
  const problems = L.problems.length ? `<ul class="problems">${L.problems.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : '';
  if (!L.variants.length) return problems;
  const cells = L.variants.map((v) => `<figure class="logo-cell"><div class="logo-plate" style="background: var(${varName(v.backgroundPath || 'color.surface.default')}); color: var(${varName(v.colorPath || 'color.text.primary')})">${v.svg ? inlineSvg(v.svg) : '<span class="ph">file missing</span>'}</div><figcaption><strong>${esc(v.name.replace(/_/g, ' '))}</strong> · <code>${esc(v.file)}</code><br>${esc(v.use)}<br><code>${esc(v.colorPath || '?')}</code> on <code>${esc(v.backgroundPath || '?')}</code></figcaption></figure>`).join('');
  return `${L.placeholder ? `<p class="note-text"><span class="ph"><span class="sr-only">Not filled: </span>placeholder artwork</span> Replace the SVGs and set <code>placeholder</code> to false in <code>${esc(L.rel)}</code>.</p>` : ''}<div class="logo-grid">${cells}</div>${problems}`;
}

function formatFrames(lines) {
  const out = [];
  for (const L of lines) {
    const m = L.text.match(/name:\s*"([^"]+)"[^}]*?size:\s*"(\d+)×(\d+)"/);
    if (m) out.push(`<div class="frame-cell"><div class="frame" style="aspect-ratio: ${m[2]} / ${m[3]}" aria-hidden="true"></div><span>${esc(m[1])}<br><code>${m[2]}×${m[3]}</code></span></div>`);
  }
  return out.length ? `<div class="frames">${out.join('')}</div>` : '';
}

function bodyFor(t, M) {
  if (t.kind === 'overview') return overviewBody(M);
  if (t.kind === 'component') return componentBody(t);
  if (t.kind === 'screen') return screenBody(t);
  if (t.kind === 'review') return reviewBody(M);
  if (t.kind === 'index') return indexBody(t);
  const R = (opts) => renderBlocks(t.lines, t.file, { label: `${t.title} table`, ...opts });
  switch (t.review) {
    case '§1': return `${R({ skipTables: ['Axis'] })}<h4>Personality sliders</h4>${sliders(t.lines)}`;
    case '§3': return `${R()}<h4>Logo variants <span class="h-note">from ${esc(M.logo.rel)}</span></h4>${logoGallery(M)}`;
    case '§4': return `<div class="grid-swatch" id="swatches"></div><h4>Roles</h4>${R({ skipYaml: ['pairings'] })}<h4>Contrast pairings</h4>
<div class="table-scroll" role="region" aria-label="Contrast pairings" tabindex="0"><table><caption class="note-text">Computed from the tokens when the page loads; lint.mjs checks the same ratios in both modes.</caption><thead><tr><th scope="col">Sample</th><th scope="col">Foreground</th><th scope="col">Background</th><th scope="col">Needs</th><th scope="col">Light</th><th scope="col">Dark</th></tr></thead><tbody id="pairings"></tbody></table></div>`;
    case '§5': return `<div id="type-scale"></div>${specimen.scripts()}<h4>Rules</h4>${R()}`;
    case '§8': return specimen.icons() + R();
    case '§9': return `<div id="space-scale"></div>${R()}`;
    case '§10': return specimen.motion() + R();
    case '§12': return specimen.scripts() + R();
    case '§13': {
      const groups = {};
      for (const p of M.ctx.flat.keys()) { const g = p.split('.').slice(0, 2).join('.'); groups[g] = (groups[g] || 0) + 1; }
      return `<p>Raw values live only in <code>${esc(M.ctx.tokensRel)}</code> and the §13 yaml block, never in the board's markup: the table below reads them from <code>tokens.js</code> when the page loads.</p>
<ul class="token-groups">${Object.entries(groups).map(([g, n]) => `<li><code>${esc(g)}</code> <span class="count">${n}</span></li>`).join('')}</ul>
<details class="token-details"><summary>All ${M.ctx.flat.size} tokens, light and dark</summary><div class="table-scroll" role="region" aria-label="All tokens" tabindex="0"><table><thead><tr><th scope="col">Token</th><th scope="col">CSS variable</th><th scope="col">Light</th><th scope="col">Dark</th></tr></thead><tbody id="token-table"></tbody></table></div></details>`;
    }
    case '§M1.1': return R() + specimen.components();
    case '§M1.3': return `${R()}<h4>Breakpoints from the tokens</h4><ul class="bp-list" id="breakpoints"></ul>`;
    case '§M1.4': return `${R()}<div class="grid-shapes" id="shapes"></div>`;
    case '§M1.6': return `${R()}<figure class="chart"><ol id="chart" aria-label="Sample values, series 1 to 8"></ol><figcaption>Sample data (illustrative values, not real figures). S1 to S8 are series 1 to 8 (<code>color.data.1</code> to <code>.8</code>); each bar's height is its value out of 100.</figcaption></figure>`;
    case '§M2.1': return formatFrames(t.lines) + R();
    default: return R() || '<p class="ph block">No content in this section yet.</p>';
  }
}

function overviewBody(M) {
  const src = M.ctx.config.index;
  const sw = [['color.brand.primary', 'Brand primary'], ['color.brand.secondary', 'Brand secondary'], ['color.accent', 'Accent'], ['color.surface.default', 'Surface'], ['color.surface.raised', 'Raised'], ['color.surface.inverse', 'Inverse']];
  const logo = M.logo.variants.find((v) => v.name === 'primary') || M.logo.variants[0];
  return `<div class="ov">
<div class="ov-id">${logo?.svg ? `<div class="ov-logo" style="color: var(${varName(logo.colorPath || 'color.brand.primary')})">${inlineSvg(logo.svg)}</div>` : ''}
<p class="ov-name">${inline(M.brandRaw, src)}</p>
<p class="ov-feel">${inline(M.feelLine || '{{one-line feel}}', src)}</p></div>
<ul class="ov-palette" aria-label="Palette">${sw.map(([p, l]) => `<li class="ov-chip"><span class="chip-fill" style="background: var(${varName(p)})"></span><span class="chip-label">${l}<br><code class="tok" title="${p}">${p}</code></span></li>`).join('')}</ul>
<div class="ov-type"><p class="ov-aa" aria-hidden="true">Aa</p><div><p class="ov-heading">Heading in font.family.heading</p><p>Body text in <code>font.family.body</code>, the size people read most.</p><p class="lang-te" lang="te">తెలుగు స్వాగతం</p><p class="lang-hi" lang="hi">हिंदी स्वागत</p></div></div>
<div class="ov-ui"><div class="row"><button type="button" data-component="button" data-variant="primary">Get started</button><button type="button" data-component="button" data-variant="secondary">Learn more</button></div><div class="row"><span data-component="badge" data-variant="success">Ready</span><span data-component="badge" data-variant="info">New</span></div><div data-component="card" data-variant="raised" class="ov-card"><p><strong>Card</strong> on <code>surface.raised</code></p><div class="ov-icons">${['check', 'search', 'bell', 'heart'].map((k) => svgIcon(k, 'md')).join('')}</div></div></div>
</div>`;
}

function coverageTile(M) {
  const c = M.coverage, pct = Math.floor(c.placeholders.completion * 100), goal = Math.round(c.placeholders.phase4_min * 100);
  const mods = M.modules.map((m) => `<li><code>${esc(m.file.replace('design/', ''))}</code> <span data-component="badge" data-variant="${m.state === 'on' ? 'success' : m.state === 'off' ? 'neutral' : 'info'}">${m.state === 'on' ? 'On' : m.state === 'off' ? 'Switched off' : 'Not chosen'}</span></li>`).join('');
  const zoneRows = ZONES.slice(1).map(([z, name]) => { const ts = M.tiles.filter((t) => t.zone === z && t.kind !== 'review'); const f = ts.filter((t) => t.status === 'filled').length; return `<li><a href="#zone-${z}">${esc(name)}</a> <span class="count">${f} of ${ts.length} filled</span></li>`; }).join('');
  return `<article class="tile" id="tile-coverage" data-tile="coverage" data-status="${pct >= 100 ? 'filled' : 'partial'}" aria-labelledby="tile-coverage-h">
<header class="tile-head"><div class="tile-title"><p class="kicker">lint.mjs · completion</p><h3 id="tile-coverage-h">Status and coverage</h3></div><div class="tile-meta"><a class="anchor" href="#tile-coverage" aria-label="Link to Status and coverage">${svgIcon('link', 'sm')}</a></div></header>
<div class="tile-body"><div class="cov">
<div class="ring-wrap" role="img" aria-label="${pct}% of template placeholders filled; Phase 4 needs ${goal}%"><svg class="ring" viewBox="0 0 36 36" aria-hidden="true" focusable="false"><circle class="ring-track" cx="18" cy="18" r="15.9155" pathLength="100"/><circle class="ring-value" cx="18" cy="18" r="15.9155" pathLength="100" stroke-dasharray="${pct} 100" transform="rotate(-90 18 18)"/><circle class="ring-goal" cx="18" cy="18" r="15.9155" pathLength="100" stroke-dasharray="1 99" stroke-dashoffset="${-(goal - 0.5)}" transform="rotate(-90 18 18)"/></svg><p class="ring-text" aria-hidden="true"><strong>${pct}%</strong><span>filled</span></p></div>
<div class="cov-facts"><p><strong>${c.placeholders.initial - c.placeholders.remaining} of ${c.placeholders.initial}</strong> template placeholders filled in the enabled files (${c.placeholders.remaining} left). Phase 4 needs ${goal}%: the tick on the ring.</p>
<p><strong>${c.tiles.filled} of ${c.tiles.total}</strong> counted tiles filled, ${c.tiles.partial} partly filled, ${c.tiles.empty} not filled. Hatched chips like <span class="ph"><span class="sr-only">Not filled: </span>this one</span> are what is left.</p>
<p><strong>${c.components.documented} of ${c.components.existing}</strong> shipped components fully documented; ${c.components.planned} planned.</p></div>
</div>
<h4>Modules</h4><ul class="mod-list">${mods}</ul>
<h4>Zones</h4><ul class="zone-list">${zoneRows}</ul></div>
</article>`;
}

function componentBody(t) {
  const c = t.comp;
  const vars = (c.variants || []).map((v) => `<code>${esc(v)}</code>`).join(', ');
  if (c.status !== 'existing') return `<p class="ph block"><span class="sr-only">Not filled: </span>Planned: write <code>ui-inventory/components/${esc(slug(c.name))}.md</code> before building it (design.md §0.5).</p>${vars ? `<p>Variants agreed: ${vars}</p>` : ''}`;
  return `<p>${inline(t.purpose.replace(/\n/g, ' '), t.file)}</p>
<p>Variants: ${vars}. Doc: <code>${esc(t.file)}</code>.</p>
<ul class="checks" aria-label="Doc sections">${COMPONENT_HEADINGS.map((h) => { const miss = t.missing.includes(h); return `<li class="${miss ? 'no' : 'yes'}">${svgIcon(miss ? 'close' : 'check', 'sm')}<span>${esc(h)}${miss ? ' (missing)' : ''}</span></li>`; }).join('')}</ul>`;
}

function screenBody(t) {
  const s = t.screen;
  const list = (a) => (a || []).map((v) => `<code>${esc(v)}</code>`).join(', ');
  const rows = (s.components || []).map((u) => `<tr><td>${esc(u.component)}</td><td>${list(u.variants)}</td><td>${list(u.states)}</td></tr>`).join('');
  const notes = renderBlocks(t.notes.split('\n').map((text, k) => ({ text, n: k + 1 })), t.file, { label: `${t.title} notes` });
  return `<p>${esc(s.purpose || '')}</p><p>Route <code>${esc(s.route || '')}</code> · doc <code>${esc(t.file)}</code></p>
<div class="table-scroll" role="region" aria-label="${esc(t.title)}: components" tabindex="0"><table><thead><tr><th scope="col">Component</th><th scope="col">Variants</th><th scope="col">States</th></tr></thead><tbody>${rows}</tbody></table></div>${notes}`;
}

function reviewBody(M) {
  const v = Object.values(M.review.verdicts);
  const n = (k) => v.filter((x) => x.verdict === k).length;
  const reviewable = M.tiles.filter((t) => t.kind !== 'review').length;
  return `<p>Phase 5 verdicts live in <code>${REVIEW_FILE}</code>, not in <code>state.yaml</code>. An accepted tile is locked (design.md §0.5): change it only if the user reopens it.</p>
<p><strong>${n('accept')}</strong> accepted · <strong>${n('edit')}</strong> edits requested · <strong>${n('reject')}</strong> rejected · <strong>${Math.max(0, reviewable - v.length)}</strong> not reviewed.</p>
<ol><li>Turn on <strong>Review</strong> in the toolbar, then choose Accept, Edit or Reject on each tile (kept in this browser).</li><li>Download the verdicts and save the file as <code>${REVIEW_FILE}</code>, or record them with <code>node design-build/board.mjs --review "§4=accept"</code>.</li><li>Re-run <code>node design-build/board.mjs</code> so the board shows them.</li></ol>
<p><button type="button" class="tool" id="download-review">Download review.json</button></p>`;
}

function indexBody(t) {
  if (t.review === '§15') return renderBlocks(t.lines, t.file, { label: '§15 checklist' });
  const heads = t.lines.filter((L) => /^###\s/.test(L.text) && !L.fence).map((L) => L.text.replace(/^###\s+/, ''));
  const lead = t.review === '§16'
    ? '<p>Six phases, each with a gate to pass before the next. The board is the Phase 3 overview card for each direction (<code>--overview-only</code>) and the Phase 5 review page.</p>'
    : '<p>Who the system is for, reading conventions, the file map, section ownership and the rules for AI agents. Read it in <code>design.md</code>.</p>';
  const sub = heads.length ? `<ul class="heads">${heads.map((h) => `<li>${inline(h, t.file)}</li>`).join('')}</ul>` : '';
  return lead + sub + (t.hints.length ? `<p>Still to fill: ${t.hints.map((h) => chip(h.hint, t.file)).join(' ')}</p>` : '');
}

/** {asset_root}/fonts/fonts.css (assets/fonts/README.md), linked before tokens.css when the project adds one. */
const fontsHref = (root, ctx) => {
  const a = String(ctx.index?.fm?.asset_root ?? 'assets').replace(/^\{\{|\}\}$/g, '') || 'assets';
  return fs.existsSync(path.join(root, a, 'fonts/fonts.css')) ? `../../${a}/fonts/fonts.css` : null;
};
const head = (title, desc, rel) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${rel.fonts ? `<link rel="stylesheet" href="${esc(rel.fonts)}">\n` : ''}<link rel="stylesheet" href="${rel.preview}tokens.css">
<link rel="stylesheet" href="${rel.components}base.css">
<link rel="stylesheet" href="${rel.components}components.css">
<link rel="stylesheet" href="${rel.preview}preview.css">
<script src="${rel.preview}tokens.js"></script>
<script>
  // Before first paint: the saved or requested theme (?theme=light|dark), layout (?view=canvas) and motion setting.
  (function () {
    var q = new URLSearchParams(location.search), r = document.documentElement;
    function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    var t = q.get('theme') || get('preview-theme');
    if (t === 'light' || t === 'dark') r.setAttribute('data-theme', t);
    if ((q.get('view') || get('board-view')) === 'canvas') r.setAttribute('data-view', 'canvas');
    if (get('board-motion') === 'reduce') r.setAttribute('data-motion', 'reduce');
  })();
</script>
<script src="${rel.preview}preview.js" defer></script>
</head>`;

const toolbar = (label, { canvas = true, review = true } = {}) => `<a class="skip-link" href="#main">Skip to content</a>
<header class="board-bar">
<h1 data-key>${esc(label)}</h1>
<div class="bar-tools">
<div class="tool-group" role="group" aria-label="Color theme" data-key><button type="button" class="tool" data-theme-choice="light" aria-pressed="false">Light</button><button type="button" class="tool" data-theme-choice="dark" aria-pressed="false">Dark</button><button type="button" class="tool" data-theme-choice="system" aria-pressed="true">System</button>${canvas ? '<button type="button" class="tool" id="toggle-duo" aria-pressed="false">Side by side</button>' : ''}</div>
${canvas ? '<div class="tool-group view-switch" role="group" aria-label="Layout"><button type="button" class="tool" data-view-choice="page" aria-pressed="true">Page</button><button type="button" class="tool" data-view-choice="canvas" aria-pressed="false">Canvas</button></div>' : ''}
<div class="tool-group" role="group" aria-label="Motion"><button type="button" class="tool" id="replay-motion">Replay motion</button><button type="button" class="tool" id="toggle-reduce" aria-pressed="false">Reduce motion</button></div>
${review ? '<div class="tool-group" role="group" aria-label="Review"><button type="button" class="tool" id="toggle-review" aria-pressed="false">Review</button></div>' : ''}
${canvas ? '<div class="tool-group zoom-tools" role="group" aria-label="Zoom"><button type="button" class="tool" data-zoom="out" aria-label="Zoom out">−</button><output class="zoom-level" id="zoom-level">100%</output><button type="button" class="tool" data-zoom="in" aria-label="Zoom in">+</button><button type="button" class="tool" data-zoom="fit">Fit</button></div>' : ''}
</div>
</header>`;

/** The board page and its AI companions, from the current files. */
export function build(root) {
  const M = model(root);
  const zones = ZONES.map(([z, name, desc]) => {
    let inner = M.tiles.filter((t) => t.zone === z).map((t) => tileHtml(t, bodyFor(t, M), M)).join('\n');
    if (z === 0) inner += '\n' + coverageTile(M);
    const feel14 = z === 6 ? feelOf(sectionOf(M.ctx.core, '§14')) : null;
    return `<section class="zone" id="zone-${z}" data-zone="${z}" aria-labelledby="zone-${z}-h">
<header class="zone-head"><h2 id="zone-${z}-h"><span class="zone-n">${z}</span> ${esc(name)}</h2><p class="zone-desc">${esc(desc)}</p>${feel14 ? `<p class="feel"><strong>§14 feel:</strong> ${inline(feel14, 'design/core.md')}</p>` : ''}</header>
<div class="tiles">
${inner}
</div>
</section>`;
  }).join('\n');
  const html = `${head('Design system board', 'Every part of the design system as a tile, built from the design files, tokens and UI inventory by design-build/board.mjs.', { preview: '', components: '../../components/', fonts: fontsHref(root, M.ctx) })}
<body data-page="board">
${toolbar('Design system board')}
<nav class="zone-nav" aria-label="Board zones" data-key><ul>${ZONES.map(([z, name]) => `<li><a href="#zone-${z}">${z} · ${esc(name)}</a></li>`).join('')}</ul></nav>
<main id="main" tabindex="-1">
<section class="duo" id="duo" aria-label="Light and dark side by side" hidden><div class="duo-pane" data-mode="light"><h2 class="duo-title">Light</h2><div class="duo-body"></div></div><div class="duo-pane" data-mode="dark"><h2 class="duo-title">Dark</h2><div class="duo-body"></div></div></section>
<div class="canvas-shell">
<div class="board-viewport" id="board-viewport" role="region" aria-label="Board. In canvas layout: arrow keys scroll, plus and minus zoom, 0 resets, F fits" tabindex="0">
<div class="board" id="board">
${zones}
</div>
</div>
<div class="minimap" id="minimap" aria-hidden="true"><div class="minimap-board"></div><div class="minimap-view"></div></div>
</div>
</main>
<footer class="site-footer"><p>Generated by <code>node design-build/board.mjs</code> from the design files, <code>${esc(M.ctx.tokensRel)}</code>, <code>design-build/inventory.json</code>, <code>ui-inventory/</code> and <code>${esc(M.logo.rel)}</code>. Do not edit this page: change the sources and re-run it. The same content for agents: <code>preview/board.json</code> and <code>preview/board.md</code>.</p></footer>
</body>
</html>
`;
  const strip = (t) => ({ id: t.id, anchor: `#tile-${t.id}`, title: t.title, file: t.file, sections: t.sections, status: t.status, module: t.module, counted_in_coverage: t.counted, placeholders: t.placeholders, to_fill: t.hints, review: { id: t.review, ...(t.verdict || { verdict: null }) } });
  const json = {
    $comment: 'Generated by design-build/board.mjs together with preview/index.html; do not edit. Hex values are stamped from the tokens for exports; the design files keep token refs.',
    brand_name: stripPh(M.brandRaw),
    coverage: M.coverage,
    modules: M.modules,
    zones: ZONES.map(([z, name]) => ({ zone: z, name, tiles: M.tiles.filter((t) => t.zone === z).map(strip) })),
    logo: { manifest: M.logo.rel, placeholder: M.logo.placeholder, problems: M.logo.problems, variants: M.logo.variants.map((v) => ({ name: v.name, file: v.file, use: v.use, color: v.color, background: v.background, hex: v.hex })) },
    colors: M.hex,
    pairings: M.pairings.map((p) => ({ fg: p.fg, bg: p.bg, size: p.size, target: p.target, ratio: Object.fromEntries(Object.entries(p.modes).map(([m, r]) => [m, r?.ratio ?? null])) })),
    review_file: REVIEW_FILE,
  };
  return { html: wrapCode(html), json: JSON.stringify(json, null, 1) + '\n', md: companionMd(M, json), model: M };
}

const cell = (s) => String(s).replace(/\|/g, '/').replace(/\n/g, ' ');
const hexPair = (h) => (h ? `${h.light ?? h.base} / ${h.dark ?? h.base}` : '');
function companionMd(M, json) {
  const c = M.coverage, L = [];
  const state = (m) => (m === 'on' ? 'on' : m === 'off' ? 'switched off' : 'not chosen');
  L.push('# Design board (for agents)', '', 'Generated by `node design-build/board.mjs` together with `preview/index.html` and `preview/board.json`. Do not edit: change the design files and re-run it. Hex values below are stamped from the tokens for exports; the design files keep token refs.', '');
  L.push(`- Brand: ${json.brand_name}`);
  L.push(`- Completion: ${Math.floor(c.placeholders.completion * 100)}% (${c.placeholders.remaining} of ${c.placeholders.initial} template placeholders left in the enabled files; Phase 4 needs ${Math.round(c.placeholders.phase4_min * 100)}%)`);
  L.push(`- Counted tiles: ${c.tiles.filled} filled, ${c.tiles.partial} partly filled, ${c.tiles.empty} not filled, of ${c.tiles.total}`);
  L.push(`- Modules: ${M.modules.map((m) => `${m.file} ${state(m.state)}`).join('; ')}`);
  L.push(`- Review verdicts: \`${REVIEW_FILE}\` (accepted = locked, design.md §0.5)`, '');
  for (const z of json.zones) {
    L.push(`## ${z.zone} · ${z.name}`, '', '| Tile | Source | Status | To fill | Review |', '|---|---|---|---|---|');
    for (const t of z.tiles) {
      const fill = t.placeholders ? `${t.placeholders}${t.to_fill.length ? ': ' + t.to_fill.slice(0, 4).map((h) => `L${h.line} ${cell(h.hint)}`).join('; ') + (t.to_fill.length > 4 ? '; …' : '') : ''}` : '—';
      L.push(`| ${cell(t.title)} (\`${t.anchor}\`) | \`${t.file}\` | ${t.module === 'off' ? 'switched off' : t.status}${t.module === 'unset' ? ', module not chosen' : ''} | ${fill} | ${t.review.verdict ? t.review.verdict + (t.review.note ? ': ' + cell(t.review.note) : '') : '—'} |`);
    }
    L.push('');
  }
  L.push('## Logo', '', `Manifest: \`${json.logo.manifest}\`${json.logo.placeholder ? ' (placeholder artwork)' : ''}`, '', '| Variant | File | Color (light / dark) | Background (light / dark) |', '|---|---|---|---|');
  for (const v of json.logo.variants) L.push(`| ${v.name} | \`${v.file}\` | \`${v.color}\` ${hexPair(v.hex.color)} | \`${v.background}\` ${hexPair(v.hex.background)} |`);
  if (json.logo.problems.length) L.push('', `Problems: ${json.logo.problems.join('; ')}`);
  L.push('', '## Colors', '', '| Token | Light | Dark |', '|---|---|---|');
  for (const [p, h] of Object.entries(json.colors)) L.push(`| \`${p}\` | ${h.light ?? h.base} | ${h.dark ?? h.base} |`);
  L.push('');
  return L.join('\n');
}

// ---------- Phase 3: one overview card per direction ----------
export function buildStudies(root, ids) {
  const ctx = loadContext(root);
  const dir = path.join(root, 'design-build/studies/directions');
  const out = { html: '', resolved: [], problems: [] };
  const dirs = [];
  const src = 'the direction manifest';
  for (const id of ids) {
    if (!/^[A-Za-z0-9_-]+$/.test(id)) { out.problems.push(`direction id "${id}" must be letters, digits, - or _`); continue; }
    const m = readJson(path.join(dir, `${id}.json`), null);
    if (!m) { out.problems.push(`design-build/studies/directions/${id}.json is missing or not JSON (fields: design-build/schemas/direction.schema.json)`); continue; }
    const bad = ['name', 'breaks', 'signature', 'differs'].filter((k) => typeof m[k] !== 'string' || !m[k].trim());
    for (const k of bad) out.problems.push(`${id}.json: "${k}" is required`);
    for (const k of ['competitors', 'moodboard']) for (const im of m[k] || []) if (!im || typeof im.src !== 'string' || typeof im.alt !== 'string' || !im.alt.trim()) out.problems.push(`${id}.json: every ${k} entry needs "src" and a non-empty "alt"`);
    if (bad.length) continue;
    let loaded = ctx.loaded;
    if (m.tokens) {
      const tf = path.join(dir, m.tokens);
      if (!fs.existsSync(tf)) { out.problems.push(`${id}.json: tokens file ${m.tokens} does not exist`); continue; }
      loaded = loadTokens(tf);
      if (loaded.problems?.length) { out.problems.push(...loaded.problems.map((p) => `${m.tokens}:${p.line ?? 1} ${p.message}`)); continue; }
    }
    const flat = flatten(loaded);
    const vars = {};
    for (const [p, e] of flat) vars[varName(p)] = e.css;
    const pairs = pairingResults({ ...ctx, loaded, flat }).map((p) => ({ fg: p.fg, bg: p.bg, size: p.size, target: p.target, ratio: Object.fromEntries(Object.entries(p.modes).map(([k, r]) => [k, r?.ratio ?? null])) }));
    out.resolved.push([`design-build/studies/directions/${id}.resolved.json`, JSON.stringify({ $comment: 'Generated by design-build/board.mjs --overview-only; do not edit.', id, name: m.name, modes: loaded.modes, vars, pairings: pairs }, null, 1) + '\n']);
    dirs.push({ id, m });
  }
  const wall = (list, what) => (Array.isArray(list) && list.length ? `<div class="wall">${list.map((im) => `<img src="${esc(im.src)}" alt="${esc(im.alt)}" loading="lazy">`).join('')}</div>` : `<p class="ph block"><span class="sr-only">Not filled: </span>No ${what} yet: list them in the direction's manifest.</p>`);
  const pane = (d, mode) => {
    const p = `${d.id}-${mode}`;
    return `<div class="dir-pane" data-direction="${esc(d.id)}" data-mode="${mode}">
<h3 class="pane-label">${mode === 'light' ? 'Light' : 'Dark'}</h3>
<ul class="ov-palette dir-prop" aria-label="Palette in proportion">${[['color.surface.default', 'Surface', 6], ['color.brand.primary', 'Brand', 3], ['color.accent', 'Accent', 1]].map(([t, l, w]) => `<li class="ov-chip" style="flex-grow: ${w}"><span class="chip-fill" style="background: var(${varName(t)})"></span><span class="chip-label">${l}</span></li>`).join('')}</ul>
<div class="dir-type"><p class="dir-display">Display line</p><p class="dir-h1">Heading one</p><p>Body copy at reading size, with a <a href="#dir-${esc(d.id)}">link</a>.</p><p class="lang-te" lang="te">తెలుగు నమూనా</p><p class="lang-hi" lang="hi">हिंदी नमूना</p></div>
<div class="table-scroll" role="region" aria-label="Direction ${esc(d.id)} ${mode} contrast" tabindex="0"><table class="dir-pairs"><thead><tr><th scope="col">Pair</th><th scope="col">Ratio</th></tr></thead><tbody data-pairs></tbody></table></div>
<div class="icon-grid dense">${Object.keys(ICON).filter((k) => k !== 'link').map((k) => `<span class="icon-cell">${svgIcon(k, 'md')}<span class="sr-only">${k}</span></span>`).join('')}</div>
<div class="dir-motion"><button type="button" class="tool" data-play aria-pressed="false">Play motion</button><div class="motion-track"><div class="mover fast"></div></div><div class="motion-track"><div class="mover"></div></div><div class="motion-track"><div class="mover slow"></div></div></div>
<div class="dir-mock">
<article data-component="card" data-variant="raised"><h4>App screen</h4><div data-component="input" data-variant="default"><label for="${p}-name">Your name</label><input id="${p}-name" type="text" autocomplete="name"></div><div class="row"><button type="button" data-component="button" data-variant="primary">Continue</button><span data-component="badge" data-variant="success">Saved</span></div></article>
<div class="social" role="img" aria-label="Social post mockup"><span class="social-head">Headline for a post</span><span class="social-tag">Brand</span></div>
</div>
</div>`;
  };
  const sections = dirs.map((d) => `<section class="direction" id="dir-${esc(d.id)}" data-direction="${esc(d.id)}" aria-labelledby="dir-${esc(d.id)}-h">
<h2 id="dir-${esc(d.id)}-h">Direction ${esc(d.id)}: ${esc(clean(d.m.name, src))}</h2>
<p class="label-line"><strong>Breaks:</strong> ${esc(clean(d.m.breaks, src))} · <strong>Signature:</strong> ${esc(clean(d.m.signature, src))} · <strong>Differs:</strong> ${esc(clean(d.m.differs, src))}</p>
<div class="dir-panes">${pane(d, 'light')}${pane(d, 'dark')}</div>
<h3>Competitor wall</h3>${wall(d.m.competitors, 'competitor screenshots')}
<h3>Moodboard</h3>${wall(d.m.moodboard, 'moodboard images')}
</section>`).join('\n');
  out.html = `${head('Visual studies: Phase 3', 'Phase 3 directions side by side, one overview card each, generated by design-build/board.mjs --overview-only.', { preview: '../preview/', components: '../../components/', fonts: fontsHref(root, ctx) })}
<body data-page="studies" data-directions="${esc(dirs.map((d) => d.id).join(','))}">
${toolbar('Visual studies: pick a direction', { canvas: false, review: false })}
<nav class="zone-nav" aria-label="Directions" data-key><ul>${dirs.map((d) => `<li><a href="#dir-${esc(d.id)}">Direction ${esc(d.id)}</a></li>`).join('')}</ul></nav>
<main id="main" tabindex="-1" class="studies">
<p class="load-note" id="studies-note">Each direction is shown in light and dark with its own tokens, read from <code>directions/&lt;ID&gt;.resolved.json</code> over http. Serve the folder with <code>node design-build/board.mjs --serve</code>.</p>
${sections}
</main>
<footer class="site-footer"><p>Generated by <code>node design-build/board.mjs --overview-only</code>. Screenshot it while the server runs: <code>node design-build/render.mjs --url http://localhost:4173/design-build/studies/</code>.</p></footer>
</body>
</html>
`;
  out.html = wrapCode(out.html);
  return out;
}

// ---------- Phase 5 review ----------
export function normalizeReviewId(raw) {
  const s = String(raw).trim();
  if (/^(component|screen):[a-z0-9-]+$/.test(s) || s === 'overview') return s;
  const m = s.replace(/^tile-/, '').match(/^§?s?((?:m\d+|\d+)(?:[.-]\d+)*)$/i);
  return m ? '§' + m[1].toUpperCase().replace(/-/g, '.') : null;
}
export function applyReview(root, specs, date) {
  const file = path.join(root, REVIEW_FILE);
  const cur = readJson(file, null) || { $comment: 'Phase 5 verdicts per board tile (design.md §16 Phase 5), written by node design-build/board.mjs --review or the board\'s Download review.json. accept = locked (design.md §0.5).', verdicts: {} };
  cur.verdicts ||= {};
  const ids = new Set(model(root).tiles.filter((t) => t.kind !== 'review').map((t) => t.review));
  const problems = [];
  for (const spec of specs) {
    const m = String(spec).match(/^([^=]+)=(accept|edit|reject|clear)(?::([\s\S]*))?$/);
    const id = m && normalizeReviewId(m[1]);
    if (!m || !id || !ids.has(id)) { problems.push(`--review "${spec}": use <tile>=accept|edit|reject|clear[:note], e.g. "§4=accept" or "component:button=edit:bigger hit area"`); continue; }
    if (m[2] === 'clear') delete cur.verdicts[id];
    else cur.verdicts[id] = { verdict: m[2], note: (m[3] || '').trim(), date };
  }
  if (!problems.length) {
    cur.verdicts = Object.fromEntries(Object.entries(cur.verdicts).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
    fs.writeFileSync(file, JSON.stringify(cur, null, 2) + '\n');
  }
  return problems;
}

// ---------- CLI ----------
export function staleFiles(root, b = build(root)) {
  return Object.entries(OUT).filter(([k, rel]) => { const f = path.join(root, rel); return !fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== b[k]; }).map(([, rel]) => rel);
}

function serve(root, port) {
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' };
  http.createServer((req, res) => {
    let f = path.join(root, decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (f !== root && !f.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!fs.existsSync(f)) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  }).listen(port, '127.0.0.1', () => console.log(`serving the design-system folder at http://localhost:${port}/ (board: /design-build/preview/, studies: /design-build/studies/); Ctrl+C stops`));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(HERE, '..');
  const argv = process.argv.slice(2);
  const all = (flag) => argv.flatMap((a, i) => (a === flag && argv[i + 1] !== undefined ? [argv[i + 1]] : []));
  const relRoot = path.relative(process.cwd(), root).split(path.sep).join('/');
  const pre = relRoot ? `${relRoot}/` : '';
  if (argv.includes('--serve')) serve(root, Number(all('--port')[0] || 4173));
  else if (argv.includes('--overview-only')) {
    const ids = all('--direction').flatMap((x) => x.split(',')).map((x) => x.trim()).filter(Boolean);
    if (!ids.length) { console.error('--overview-only needs --direction <ID>, once per direction (e.g. --direction A --direction B)'); process.exit(2); }
    const s = buildStudies(root, ids);
    if (s.problems.length) { for (const p of s.problems) console.error(p); process.exit(1); }
    for (const [rel, c] of s.resolved) fs.writeFileSync(path.join(root, rel), c);
    fs.writeFileSync(path.join(root, 'design-build/studies/index.html'), s.html);
    console.log(`wrote ${pre}design-build/studies/index.html and ${s.resolved.length} resolved direction file(s); view it with: node ${pre}design-build/board.mjs --serve`);
  } else {
    const reviews = all('--review');
    if (reviews.length) {
      const d = new Date(), date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const problems = applyReview(root, reviews, date);
      if (problems.length) { for (const p of problems) console.error(p); process.exit(1); }
      console.log(`recorded ${reviews.length} verdict(s) in ${pre}${REVIEW_FILE}`);
    }
    const b = build(root);
    const lp = b.model.logo.problems.map((p) => `${pre}${b.model.logo.rel}: ${p}`);
    if (argv.includes('--check')) {
      const stale = staleFiles(root, b);
      for (const p of lp) console.error(p);
      if (stale.length) console.error(`out of date: ${stale.map((f) => pre + f).join(', ')}; fix: node ${pre}design-build/board.mjs`);
      if (stale.length || lp.length) process.exit(1);
      console.log('board is up to date (preview/index.html, board.json, board.md)');
    } else {
      for (const [k, rel] of Object.entries(OUT)) fs.writeFileSync(path.join(root, rel), b[k]);
      for (const p of lp) console.error(`warning: ${p}`);
      const c = b.model.coverage;
      console.log(`wrote ${pre}${OUT.html}, board.json and board.md: ${b.model.tiles.length + 1} tiles, ${Math.floor(c.placeholders.completion * 100)}% filled (${c.placeholders.remaining} placeholders left)`);
    }
  }
}
