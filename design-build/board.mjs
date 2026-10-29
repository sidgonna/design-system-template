#!/usr/bin/env node
// Generates the design board: design-build/preview/index.html (the page people review), plus board.json and board.md
// (the same content for AI agents and exports). It replaces the old preview page and the Phase 3 studies page.
// Zero dependencies. Deterministic: the output depends only on the design files, tokens, inventory, ui-inventory docs,
// {asset_root}/logo/logo.json, {asset_root}/fonts/fonts.css (whether it exists), design-build/review.json and whether
// the DESIGN.md, Tailwind and Figma outputs match the tokens (the sync badge), so lint.mjs (rule board-stale) can tell when it is out of date.
//
// Usage (from the app root, prefix design-system/; from the template root, as written):
//   node design-build/board.mjs                         write preview/index.html, preview/board.json, preview/board.md
//   node design-build/board.mjs --check                 exit 1 if any of them (or preview/chrome.css) is stale or logo.json is invalid
//   node design-build/board.mjs --png [--view specimen|guidelines|coverage] [--theme light] [--width 1280]
//                                                       a PNG of one board view → design-build/exports/ (needs Playwright)
//   node design-build/board.mjs --review "§4=accept" --review "§5=edit:warmer heading font"
//                                                       record Phase 5 verdicts in design-build/review.json, then rebuild
//   node design-build/board.mjs --overview-only --direction A --direction B
//                                                       Phase 3: one overview card per direction (studies/directions/<ID>.json)
//                                                       → studies/index.html and studies/directions/<ID>.resolved.json
//   node design-build/board.mjs --serve [--port 4173]   the live board: serve the design-system folder, watch the design files,
//                                                       tokens, inventory, ui-inventory, assets, components, state.yaml and
//                                                       review.json, rebuild tokens.css, the DESIGN.md / Tailwind / Figma
//                                                       exports and the board (+ the studies page) on
//                                                       save and reload open tabs (lib/live.mjs). --watch is the default with
//                                                       --serve; --no-watch serves files as they are; --poll forces polling
//                                                       (network drives, containers); a busy port tries the next one.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadContext, pairingResults, readJson } from './lib/context.mjs';
import { placeholders, unfilled, INTAKE_MARKER } from './lib/markdown.mjs';
import { loadTokens, flatten, varName } from './lib/tokens.mjs';
import { toHex } from './lib/color.mjs';
import { generate as generateTokens } from './tokens-css.mjs';
import { startLive } from './lib/live.mjs';
import { buildChromeCss, schemeOf, CHROME_CSS } from './lib/chrome.mjs';
import { exportSync, outputFiles } from './lib/designmd.mjs';
import { screensOf, docPath, screenPath, slug, COMPONENT_HEADINGS, END } from './lib/ui-inventory.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const OUT = { html: 'design-build/preview/index.html', json: 'design-build/preview/board.json', md: 'design-build/preview/board.md', css: CHROME_CSS };
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
export const wrapCode = (html) => html.replace(/(<code\b(?![^>]*data-token)[^>]*>)([^<]*)(<\/code>)/g, (m, a, t, b) => a + t.replace(/([./])(?=[A-Za-z_{-])/g, '$1<wbr>') + b);
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
    // a yaml key reads as words ("competitors to differ from"); the raw key stays in the title and in board.md
    const plain = /^[a-z][\w-]*$/.test(key);
    const label = plain ? key.replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase()) : null;
    rows.push(`<div class="fact d${depth}${val ? '' : ' group'}">${plain ? `<dt title="${esc(key)}">${esc(label)}</dt>` : `<dt>${inline(key, src)}</dt>`}<dd>${val ? inline(val, src) : ''}</dd></div>`);
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
// deep: a core § tile also holds its numbered sub-sections (### 4.1 …) unless those are tiles of their own (§14.n)
const sectionOf = (f, id, deep = false) => (f ? f.analysis.lines.filter((L) => !L.frontMatter && (L.section === id || (deep && typeof L.section === 'string' && L.section.startsWith(id + '.')))) : []);
const countPh = (lines) => lines.reduce((s, L) => s + unfilled(L.text), 0);   // {{…}} plus front matter # TODO(intake) markers, as the lint counts
const markerHint = (text) => text.slice(text.search(INTAKE_MARKER)).replace(/^#\s*TODO\(intake\):?\s*/, '') || 'decide in §16 Phase 1';
const hintsOf = (lines, src) => lines.flatMap((L) => [...placeholders(L.text).map((p) => ({ line: L.n, hint: safeHint(p.text, src) })), ...(L.text.match(INTAKE_MARKER) || []).map(() => ({ line: L.n, hint: safeHint(`${L.text.trim().split(/[:\s]/)[0]}: ${markerHint(L.text)}`, src) }))]);
function headingOf(f, id) {
  const L = sectionOf(f, id).find((x) => /^#{2,4}\s/.test(x.text));
  return L ? L.text.replace(/^#{2,4}\s+§?/, '').replace(/^(?:M\d+|\d+)(?:\.\d+)*\s*/, '').trim() : '';
}
function feelOf(lines) {
  const L = lines.find((x) => /^\*\*FEEL:\*\*/.test(x.text.trim()));
  return L ? L.text.trim().replace(/^\*\*FEEL:\*\*\s*/, '') : null;
}

/** design.md parts → on (always_load or enabled: true), off (enabled: false, chosen) or unset (still a {{placeholder}} or a # TODO(intake) default). */
export function moduleStates(ctx) {
  const parts = ctx.index?.fm?.parts || {};
  const out = {};
  for (const [k, p] of Object.entries(parts)) {
    if (!p || typeof p !== 'object' || !p.file) continue;
    const rel = String(p.file).startsWith('design/') ? String(p.file) : `design/${p.file}`;
    // `enabled: false   # TODO(intake)` is the unfilled default: not chosen yet, not switched off
    const line = (ctx.index?.analysis?.lines || []).find((L) => L.frontMatter && new RegExp(`^\\s*${k}\\s*:`).test(L.text));
    const pending = !!line && new RegExp(INTAKE_MARKER.source).test(line.text);
    out[rel] = { key: k, state: p.always_load === true || p.enabled === true ? 'on' : p.enabled === false && !pending ? 'off' : 'unset' };
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
    const f = F(rel), lines = sectionOf(f, id, extra.deep === true), feel = feelOf(lines);
    const mod = rel === 'design/core.md' ? 'on' : mods[rel]?.state ?? 'unset';
    return T({ zone, id: tileId(id), review: id, file: rel, sections: [id], title: `${id} ${headingOf(f, id)}`.trim(), feel, placeholders: countPh(lines), hints: hintsOf(lines, rel), status: f ? status(lines, feel) : 'empty', module: mod, counted: mod === 'on', lines, ...extra });
  };

  const idx = F(ctx.config.index), core = F('design/core.md');
  const introLines = [ctx.config.index, 'design/core.md'].flatMap((rel) => F(rel)?.analysis.lines.filter((L) => L.frontMatter || L.section === null) || []);
  const brandRaw = String(idx?.fm?.brand_name ?? '{{BRAND_NAME}}');
  const feelLine = (idx?.analysis.lines.find((L) => /One-line feel:/.test(L.text))?.text || '').replace(/^>?\s*\*\*One-line feel:\*\*\s*/, '');
  T({ zone: 0, id: 'overview', review: 'overview', file: ctx.config.index, sections: ['front matter', 'intro'], title: 'Brand at a glance', feel: null, placeholders: countPh(introLines), hints: hintsOf(introLines, ctx.config.index), status: status(introLines, feelLine), module: 'on', counted: true, lines: [], kind: 'overview', wide: true, duo: true });
  for (const n of [1, 2, 3, 6, 7, 8]) sec(1, 'design/core.md', `§${n}`, { duo: n === 3, deep: true });
  for (const n of [4, 5, 9, 10, 11, 12, 13]) sec(2, 'design/core.md', `§${n}`, { duo: n === 4 || n === 5, deep: true });
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
  return { ctx, mods, tiles, coverage, modules, review, logo, brandRaw, feelLine, pairings: pairingResults(ctx), hex, specimen: loadSpecimen(root) };
}

/** Optional design-build/specimen.json. Missing or unreadable means the starter specimen strings. */
function loadSpecimen(root) {
  const abs = path.join(root, 'design-build/specimen.json');
  if (!fs.existsSync(abs)) return null;
  try {
    const j = JSON.parse(fs.readFileSync(abs, 'utf8'));
    return j && typeof j === 'object' ? j : null;
  } catch { return null; }
}
const specStr = (s, group, key, fallback) => {
  const v = s && s[group] && s[group][key];
  return typeof v === 'string' && v ? v : fallback;
};

// ---------- HTML ----------
export const ICON = {
  check: '<path d="M5 12l5 5L19 7"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>', close: '<path d="M6 6l12 12M18 6L6 18"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>', home: '<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6"/>', menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20h4"/>', heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>', download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  link: '<path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/>',
};
export const svgIcon = (k, cls = '') => `<svg class="icon${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICON[k]}</svg>`;
const STATUS = { filled: ['done', 'Filled'], partial: ['warn', 'Partly filled'], empty: ['none', 'Not filled'], planned: ['info', 'Planned'] };
export const ZONES = [
  [0, 'Overview', 'The brand at a glance.'],
  [1, 'Brand identity', 'Who the brand is, and how it looks and sounds.'],
  [2, 'Foundations', 'Colour, type, space, motion, accessibility, languages and tokens.'],
  [3, 'Product', 'The product rules and the component docs.'],
  [4, 'Screens', 'Every screen and the components it uses.'],
  [5, 'Application modules', 'Marketing and content, motion and video, print.'],
  [6, 'Governance', 'Versioning, the rules for agents, the build workflow and the review.'],
];
// The board's three views (?board=<id>, kept per browser); the first is the default.
export const VIEWS = [['specimen', 'Specimen'], ['guidelines', 'Guidelines'], ['coverage', 'Coverage']];
const VERDICT_LABEL = { accept: 'Accepted', edit: 'Edit requested', reject: 'Rejected' };
const FILE_LABEL = { 'design.md': 'Rules', 'design/core.md': 'Core', 'design/digital-product.md': 'Product', 'design/marketing-content.md': 'Marketing', 'design/motion-video.md': 'Motion video', 'design/print.md': 'Print', 'design-build/review.json': 'Review', 'design-build/inventory.json': 'Inventory' };
const status = (tone, label) => `<span class="status" data-tone="${tone}"><span class="status-dot" aria-hidden="true"></span>${label}</span>`;
/** "§4 Color system" → ["§4", "Color system"]: the number goes in the kicker, the words are the title. */
const splitTitle = (title) => { const m = String(title).match(/^(§[\w.]+)\s+(.*)$/); return m ? [m[1], m[2]] : [null, String(title)]; };

function statusBadge(t) {
  if (t.module === 'off') return status('none', 'Switched off');
  const [tone, label] = STATUS[t.status] || STATUS.partial;
  const n = t.placeholders && t.status !== 'planned' ? ` · ${t.placeholders} to fill` : '';
  return status(tone, label + n) + (t.module === 'unset' ? status('info', 'Not chosen') : '');
}

function reviewBar(t) {
  const v = t.verdict;
  return `<p class="verdict" data-verdict-text${v ? '' : ' hidden'}>${v ? `${esc(VERDICT_LABEL[v.verdict] || v.verdict)}${v.note ? `: ${esc(v.note)}` : ''}${v.date ? ` (${esc(v.date)})` : ''}` : ''}</p>
<div class="review" role="group" aria-label="Review: ${esc(t.title)}"><button type="button" class="tool" data-verdict="accept" aria-pressed="${v?.verdict === 'accept'}">Accept</button><button type="button" class="tool" data-verdict="edit" aria-pressed="${v?.verdict === 'edit'}">Edit</button><button type="button" class="tool" data-verdict="reject" aria-pressed="${v?.verdict === 'reject'}">Reject</button><label class="review-note"><span class="sr-only">Note on ${esc(t.title)}</span><input type="text" class="note" placeholder="Note (optional)" value="${esc(v?.note || '')}"></label></div>`;
}

const GROUP_LABEL = { actions: 'Actions', inputs: 'Inputs', feedback: 'Feedback', navigation: 'Navigation', 'data-display': 'Data display', layout: 'Layout' };
function tileHtml(t, body, M) {
  const [num, words] = splitTitle(t.title);
  const kicker = t.kind === 'component' ? `Component · ${GROUP_LABEL[t.comp.group] || 'Layout'} · ${t.comp.status === 'existing' ? 'shipped' : t.comp.status}` : t.kind === 'screen' ? 'Screen' : [FILE_LABEL[t.file] || t.file.replace(/^design\//, ''), num].filter(Boolean).join(' · ');
  const key = M.mods[t.file]?.key || 'module';
  const groupAttr = t.kind === 'component' && t.comp.group ? `data-group="${esc(t.comp.group)}"` : '';
  const attrs = [`class="tile${t.wide ? ' wide' : ''}"`, `id="tile-${t.id}"`, `data-tile="${t.id}"`, groupAttr, `data-status="${t.status}"`, `data-module-state="${t.module}"`, `data-review-id="${esc(t.review)}"`, t.verdict ? `data-verdict="${esc(t.verdict.verdict)}"` : '', `aria-labelledby="tile-${t.id}-h"`].filter(Boolean).join(' ');
  const modNote = t.module === 'off' ? `<p class="module-note">Switched off in design.md (<code>parts.${esc(key)}.enabled: false</code>). The tile stays so nothing is lost; coverage leaves it out.</p>`
    : t.module === 'unset' ? `<p class="module-note">Module not chosen yet: set <code>parts.${esc(key)}.enabled</code> in design.md (Phase 1). Until then coverage leaves it out.</p>` : '';
  return `<article ${attrs}>
<header class="tile-head"><p class="kicker">${esc(kicker)}</p><div class="tile-meta">${statusBadge(t)}<a class="anchor" href="#tile-${t.id}" aria-label="Link to ${esc(t.title)}">${svgIcon('link', 'sm')}</a></div><h3 id="tile-${t.id}-h">${esc(words)}</h3></header>
${typeof t.feel === 'string' ? `<p class="feel">${inline(t.feel, t.file)}</p>\n` : ''}${modNote}<div class="tile-body">
${body}
</div>
${reviewBar(t)}
</article>`;
}

const specimen = {
  icons: () => `<div class="icon-grid">${['check', 'info', 'close', 'arrow'].map((k) => `<div class="icon-cell"><div class="icon-sizes">${svgIcon(k, 'sm')}${svgIcon(k, 'md')}${svgIcon(k)}</div>${k[0].toUpperCase() + k.slice(1)}</div>`).join('')}</div>`,
  // the playable demo lives on the Specimen view (#play-motion); the guideline tile repeats the tracks without ids
  motion: () => `<div class="motion-demo brand"><button type="button" data-component="button" data-variant="secondary" data-play aria-pressed="false">Play motion</button>
<div class="tracks">${['fast', 'base', 'slow'].map((d) => `<div class="motion-track"><span class="track-label">${d[0].toUpperCase() + d.slice(1)}</span><div class="mover${d === 'base' ? '' : ' ' + d}"></div></div>`).join('')}</div></div>
<p class="note-text">Play moves the squares at the fast, base and slow durations. With reduced motion nothing moves: the squares jump, and the card and badge only fade, for at most <code>motion.duration.fast</code> (core §10).</p>`,
  // Without design-build/specimen.json the strings below are the starter copy, byte for byte.
  components: (M) => {
    const S = M?.specimen;
    const b = (k, d) => esc(specStr(S, 'guidelinesButtons', k, specStr(S, 'buttons', k, d)));
    const inp = S?.guidelinesInput || {};
    const cards = S?.guidelinesCards || {};
    const badges = Array.isArray(S?.badges) && S.badges.length ? S.badges : [
      { variant: 'neutral', label: 'Draft' }, { variant: 'success', label: 'Paid' }, { variant: 'warning', label: 'Due soon' }, { variant: 'error', label: 'Overdue' }, { variant: 'info', label: 'New' },
    ];
    const emailLabel = inp.label || 'Email address';
    const emailType = inp.label ? 'tel' : 'email';
    const emailAuto = inp.label ? 'tel' : 'email';
    return `<div id="components" class="components brand">
<h4>Button</h4>
<div class="row">
<button type="button" data-component="button" data-variant="primary">${b('primary', 'Save changes')}</button>
<button type="button" data-component="button" data-variant="secondary">${b('secondary', 'Preview')}</button>
<button type="button" data-component="button" data-variant="ghost">${b('ghost', 'Cancel')}</button>
<button type="button" data-component="button" data-variant="danger">${b('danger', 'Delete')}</button>
<button type="button" data-component="button" data-variant="primary" disabled>${b('disabled', 'Disabled')}</button>
<button type="button" data-component="button" data-variant="primary" id="demo-loading" aria-busy="true" aria-disabled="true"><span data-part="spinner" aria-hidden="true"></span><span data-part="label">${b('loading', 'Saving…')}</span></button>
</div>
<h4>Input</h4>
<div class="grid-2">
<div data-component="input" data-variant="default">
<label for="email">${esc(emailLabel)} <span data-part="required">(required)</span></label>
<input id="email" type="${emailType}" autocomplete="${emailAuto}" required aria-describedby="email-hint">
<p data-part="hint" id="email-hint">${esc(inp.hint || 'We only use this for receipts.')}</p>
</div>
<div data-component="input" data-variant="error" id="demo-phone">
<label for="phone">${esc(inp.errorLabel || 'Phone number')}</label>
<input id="phone" type="tel" autocomplete="tel" inputmode="numeric" aria-invalid="true" aria-describedby="phone-hint phone-error" value="${esc(inp.errorValue || '98765')}">
<p data-part="hint" id="phone-hint">${esc(inp.errorHint || 'Enter all 10 digits.')}</p>
<p data-part="error" id="phone-error">${esc(inp.error || 'That number has 5 digits; it needs 10.')}</p>
</div>
</div>
<h4>Card</h4>
<div class="grid-3">
<article data-component="card" data-variant="flat" data-enter><h5>${esc(cards.flatTitle || 'Flat card')}</h5><p>${cards.flatBody ? esc(cards.flatBody) : 'A hairline border only. It has <code>data-enter</code>, so it plays the entrance.'}</p></article>
<article data-component="card" data-variant="raised"><h5>${esc(cards.raisedTitle || 'Raised card')}</h5><p>${cards.raisedBody ? esc(cards.raisedBody) : 'Uses <code>shadow.2</code> to lift off the page.'}</p></article>
<article data-component="card" data-variant="raised" data-interactive><h5><a href="#components">${esc(cards.interactiveTitle || 'Interactive card')}</a></h5><p>${cards.interactiveBody ? esc(cards.interactiveBody) : 'Hover it or tab to its link: it lifts to <code>shadow.3</code>.'}</p></article>
</div>
<h4>Badge</h4>
<div class="row" id="demo-badges">
${badges.map((x) => `<span data-component="badge" data-variant="${esc(x.variant)}">${esc(x.label)}</span>`).join('\n')}
</div>
</div>`;
  },
  scripts: (M) => {
    const te = M?.specimen?.scripts?.te || 'తెలుగు నమూనా వాక్యం: అందరికీ స్వాగతం.';
    const hi = M?.specimen?.scripts?.hi || 'हिंदी नमूना वाक्य: आप सभी का स्वागत है।';
    return `<div class="type-row brand"><span class="label">Telugu</span><p class="sample lang-te" lang="te">${esc(te)}</p></div>
<div class="type-row brand"><span class="label">Hindi</span><p class="sample lang-hi" lang="hi">${esc(hi)}</p></div>`;
  },
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
    case '§4': return `<h4>Reference ramps <span class="h-note">palette.*, 50–950 from the §13 seeds (design-build/ramps.mjs)</span></h4><div class="ramps" id="ramps"></div>
<h4>System roles</h4><div class="grid-swatch" id="swatches"></div><h4>Roles</h4>${R({ skipYaml: ['pairings'] })}<h4>Contrast pairings</h4>
<div class="table-scroll" role="region" aria-label="Contrast pairings" tabindex="0"><table><caption class="note-text">WCAG 2 ratios per theme (the gate) and APCA Lc (advisory, core.md §4.5), computed from the tokens for the default brand; lint.mjs checks every theme, sub-brand and state layer.</caption><thead><tr><th scope="col">Sample</th><th scope="col">Foreground</th><th scope="col">Background</th><th scope="col">Needs</th>${themesOf(M).map((t) => `<th scope="col">${esc(themeLabel(t))}</th>`).join('')}<th scope="col">APCA Lc</th></tr></thead><tbody id="pairings"></tbody></table></div>`;
    case '§5': return `<div id="type-scale"${M.specimen?.typeSample ? ` data-sample="${esc(M.specimen.typeSample)}"` : ''}></div>${specimen.scripts(M)}<h4>Rules</h4>${R()}`;
    case '§8': return specimen.icons() + R();
    case '§9': return `<div id="space-scale"></div>${R()}`;
    case '§10': return specimen.motion() + R();
    case '§12': return specimen.scripts(M) + R();
    case '§13': {
      const groups = {};
      for (const p of M.ctx.flat.keys()) { const g = p.split('.').slice(0, 2).join('.'); groups[g] = (groups[g] || 0) + 1; }
      return `<p>Raw values live only in <code>${esc(M.ctx.tokensRel)}</code> and the §13 yaml block, never in the board's markup: the table below reads them from <code>tokens.js</code> when the page loads.</p>
<ul class="token-groups">${Object.entries(groups).map(([g, n]) => `<li><code>${esc(g)}</code> <span class="count">${n}</span></li>`).join('')}</ul>
<details class="token-details"><summary>All ${M.ctx.flat.size} tokens, ${esc(themesOf(M).map(themeLabel).join(', ').toLowerCase())}</summary><div class="table-scroll" role="region" aria-label="All tokens" tabindex="0"><table><thead><tr><th scope="col">Token</th><th scope="col">CSS variable</th>${themesOf(M).map((t) => `<th scope="col">${esc(themeLabel(t))}</th>`).join('')}</tr></thead><tbody id="token-table"></tbody></table></div></details>`;
    }
    case '§M1.1': return R() + specimen.components(M);
    case '§M1.3': return `${R()}<h4>Breakpoints from the tokens</h4><ul class="bp-list" id="breakpoints"></ul>`;
    case '§M1.4': return `${R()}<div class="grid-shapes" id="shapes"></div>`;
    case '§M1.6': return `${R()}<figure class="chart"><ol id="chart" aria-label="Sample values, series 1 to 8"></ol><figcaption>Sample data (illustrative values, not real figures). S1 to S8 are series 1 to 8 (<code>color.data.1</code> to <code>.8</code>); each bar's height is its value out of 100.</figcaption></figure>`;
    case '§M2.1': return formatFrames(t.lines) + R();
    default: return R() || '<p class="ph block">No content in this section yet.</p>';
  }
}

function patternSource(name) {
  const p = path.join(HERE, '../components/patterns', `${name}.html`);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8').trim() : '';
}
function catalogHtml() {
  const file = path.join(HERE, '../components/catalog.html');
  let html = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  for (const name of ['form', 'empty', 'settings', 'table']) html = html.replace(`<!-- pattern:${name} -->`, patternSource(name));
  return html;
}

// Specimen view: the brand at a glance on a fixed bento (12 columns, 152px rows; placement in preview.css).
// Every cell is chrome around a brand sample: the sample sits in .brand and is the only place the brand fonts and
// colours apply. Hex values are never written here: preview.js reads them from the computed colours (data-hex).
const family = (M, p) => M.ctx.flat.get(p)?.families?.[0] || null;
const cellHead = (id, title, aside = '') => `<header class="cell-head"><h3 id="tile-spec-${id}-h">${esc(title)}</h3>${aside}</header>`;
const cellAttrs = (id, span, shows, extra = '') => `class="tile cell" id="tile-spec-${id}" data-span="${span}" data-shows="${esc(shows)}" data-duo aria-labelledby="tile-spec-${id}-h"${extra}`;
const brandName = (M) => (placeholders(M.brandRaw).length ? null : stripPh(M.brandRaw));
function specimenView(M) {
  const C = (id, title, role, fill, on, ramp) => `<article ${cellAttrs(id, 's', `${fill} ${on}${ramp ? ' palette.' + ramp : ''}`, ` data-swatch style="--fill: var(${varName(fill)}); --on-fill: var(${varName(on)})"`)}>
${cellHead(id, title, `<button type="button" class="hex copy" data-hex data-copy aria-label="Copy the ${esc(title.toLowerCase())} hex value" data-copy-what="${esc(title.toLowerCase())}"></button>`)}
<p class="cell-note">${esc(role)}</p>
${ramp ? `<div class="ramp" data-ramp="${ramp}" role="img" aria-label="${esc(title)} ramp, 50 to 950"></div>` : ''}
</article>`;
  const F = (id, title, fam, token, sample, cls = '') => `<article ${cellAttrs(id, 's', token)}>
${cellHead(id, title, `<span class="cell-aside">${esc(fam || 'Not set')}</span>`)}
<p class="aa brand${cls}" style="font-family: var(${varName(token)})" aria-hidden="true">${sample}</p>
<code data-token title="${esc(token)}">${esc(token)}</code>
</article>`;
  const logo = M.logo.variants.find((v) => v.name === 'primary') || M.logo.variants[0];
  const name = brandName(M), feel = placeholders(M.feelLine || '{{x}}').length ? null : M.feelLine;
  const c = M.coverage, pct = Math.floor(c.placeholders.completion * 100), goal = Math.round(c.placeholders.phase4_min * 100);
  const next = M.tiles.filter((t) => t.counted && t.placeholders && t.kind !== 'review').sort((a, b) => a.zone - b.zone)[0];
  const cells = [
    `<article ${cellAttrs('brand', 's', 'color.brand.primary')}>
${cellHead('brand', 'Brand', M.logo.placeholder ? '<span class="cell-aside">Placeholder logo</span>' : '')}
<div class="brand-id">${logo?.svg ? `<span class="brand-logo" style="color: var(${varName(logo.colorPath || 'color.brand.primary')})">${inlineSvg(logo.svg)}</span>` : ''}<p class="brand-name brand">${name ? esc(name) : 'Untitled brand'}</p></div>
<p class="cell-note">${feel ? inline(feel, M.ctx.config.index) : 'Name and one-line feel: <code>brand_name</code> in design.md.'}</p>
</article>`,
    C('primary', 'Primary', 'Main actions, links and focus', 'color.brand.primary', 'color.on.primary', 'primary'),
    C('secondary', 'Secondary', 'Supporting actions and fills', 'color.brand.secondary', 'color.on.secondary', 'secondary'),
    C('accent', 'Accent', 'Highlights, used sparingly', 'color.accent', 'color.on.accent', 'accent'),
    C('neutral', 'Neutral', 'Text, surfaces and borders', 'color.surface.inverse', 'color.text.inverse', 'neutral'),
    F('heading', 'Headline', family(M, 'font.family.heading'), 'font.family.heading', 'Aa', ' aa-heading'),
    F('body', 'Body', family(M, 'font.family.body'), 'font.family.body', 'Aa'),
    F('mono', 'Mono', family(M, 'font.family.mono'), 'font.family.mono', '{ }'),
    `<article ${cellAttrs('scripts', 's', 'font.family.te font.family.hi')}>
${cellHead('scripts', 'Indic scripts', '<span class="cell-aside">Telugu · Hindi</span>')}
<div class="scripts brand"><p class="aa lang-te" lang="te">అఆ</p><p class="aa lang-hi" lang="hi">अआ</p></div>
<p class="cell-note"><span lang="te" class="lang-te brand">${esc(M.specimen?.scriptNote?.te || 'తెలుగు స్వాగతం')}</span> · <span lang="hi" class="lang-hi brand">${esc(M.specimen?.scriptNote?.hi || 'हिंदी स्वागत')}</span></p>
</article>`,
    `<article ${cellAttrs('buttons', 'm', 'component.button color.brand.primary')}>
${cellHead('buttons', 'Buttons', '<span class="cell-aside">5 states</span>')}
<div class="brand stack">
<div class="row"><button type="button" data-component="button" data-variant="primary">${esc(specStr(M.specimen, 'buttons', 'primary', 'Get started'))}</button><button type="button" data-component="button" data-variant="secondary">${esc(specStr(M.specimen, 'buttons', 'secondary', 'Preview'))}</button></div>
<div class="row"><button type="button" data-component="button" data-variant="ghost">${esc(specStr(M.specimen, 'buttons', 'ghost', 'Cancel'))}</button><button type="button" data-component="button" data-variant="danger">${esc(specStr(M.specimen, 'buttons', 'danger', 'Delete'))}</button></div>
<div class="row"><button type="button" data-component="button" data-variant="primary" aria-busy="true" aria-disabled="true"><span data-part="spinner" aria-hidden="true"></span><span data-part="label">${esc(specStr(M.specimen, 'buttons', 'loading', 'Saving…'))}</span></button><button type="button" data-component="button" data-variant="primary" disabled>${esc(specStr(M.specimen, 'buttons', 'disabled', 'Disabled'))}</button></div>
</div>
</article>`,
    `<article ${cellAttrs('input', 'm', 'component.input')}>
${cellHead('input', 'Input', '<span class="cell-aside">Default · Error</span>')}
<div class="brand stack">
<div data-component="input" data-variant="default"><label for="spec-email">${esc(M.specimen?.input?.label || 'Email')}</label><input id="spec-email" type="${M.specimen?.input?.label ? 'tel' : 'email'}" autocomplete="${M.specimen?.input?.label ? 'tel' : 'email'}" aria-describedby="spec-email-hint"${M.specimen?.input ? '' : ' value="hello@example.com"'}><p data-part="hint" id="spec-email-hint">${esc(M.specimen?.input?.hint || 'For receipts only.')}</p></div>
<div data-component="input" data-variant="error"><label for="spec-phone">${esc(M.specimen?.input?.errorLabel || 'Phone')}</label><input id="spec-phone" type="tel" autocomplete="tel" inputmode="numeric" aria-invalid="true" aria-describedby="spec-phone-error" value="${esc(M.specimen?.input?.errorValue || '98765')}"><p data-part="error" id="spec-phone-error">${esc(M.specimen?.input?.error || 'It needs 10 digits.')}</p></div>
</div>
</article>`,
    `<article ${cellAttrs('badges', 's', 'component.badge')}>
${cellHead('badges', 'Badges')}
<div class="brand row wrap">${(Array.isArray(M.specimen?.badges) && M.specimen.badges.length ? M.specimen.badges : [{ variant: 'neutral', label: 'Draft' }, { variant: 'success', label: 'Paid' }, { variant: 'warning', label: 'Due soon' }, { variant: 'error', label: 'Overdue' }, { variant: 'info', label: 'New' }]).map((x) => `<span data-component="badge" data-variant="${esc(x.variant)}">${esc(x.label)}</span>`).join('')}</div>
</article>`,
    `<article ${cellAttrs('completion', 'm', 'completion')}>
${cellHead('completion', 'Completion', `<span class="cell-aside">Phase 4 needs ${goal}%</span>`)}
<div class="completion">
<div class="ring-wrap" role="img" aria-label="${pct}% of template placeholders filled; Phase 4 needs ${goal}%"><svg class="ring" viewBox="0 0 36 36" aria-hidden="true" focusable="false"><circle class="ring-track" cx="18" cy="18" r="15.9155" pathLength="100"/><circle class="ring-value" cx="18" cy="18" r="15.9155" pathLength="100" stroke-dasharray="${pct} 100" transform="rotate(-90 18 18)"/><circle class="ring-goal" cx="18" cy="18" r="15.9155" pathLength="100" stroke-dasharray="1 99" stroke-dashoffset="${-(goal - 0.5)}" transform="rotate(-90 18 18)"/></svg><p class="ring-text" aria-hidden="true">${pct}%</p></div>
<dl class="facts"><div><dt>Placeholders left</dt><dd>${c.placeholders.remaining} of ${c.placeholders.initial}</dd></div><div><dt>Tiles filled</dt><dd>${c.tiles.filled} of ${c.tiles.total}</dd></div><div><dt>Components documented</dt><dd>${c.components.documented} of ${c.components.existing}</dd></div></dl>
</div>
${next ? `<a class="next" href="#tile-${next.id}">Next: ${esc(splitTitle(next.title)[1])} · ${next.placeholders} to fill ${svgIcon('arrow', 'sm')}</a>` : '<p class="cell-note">Every counted placeholder is filled.</p>'}
</article>`,
    `<article ${cellAttrs('type', 'l3', 'type font.size font.weight font.line-height')}>
${cellHead('type', 'Type scale', `<span class="cell-aside">${esc([family(M, 'font.family.heading'), family(M, 'font.family.body')].filter(Boolean).join(' · ') || 'Not set')}</span>`)}
<ol class="type-scale" data-type-scale${M.specimen?.typeSample ? ` data-sample="${esc(M.specimen.typeSample)}" data-overline="${esc(M.specimen.overline || 'PIER 2')}" data-display="${esc(M.specimen.display || 'On time.')}"` : ''}></ol>
</article>`,
    `<article ${cellAttrs('motion', 'm', 'motion')}>
${cellHead('motion', 'Motion', '<span class="cell-aside">Fast · Base · Slow</span>')}
<div class="motion-demo"><button type="button" class="tool" id="play-motion" aria-pressed="false">${svgIcon('arrow', 'sm')}Play</button>
<div class="tracks" id="motion-tracks">${['fast', 'base', 'slow'].map((d) => `<div class="motion-track"><span class="track-label">${d[0].toUpperCase() + d.slice(1)}</span><div class="mover${d === 'base' ? '' : ' ' + d}"></div></div>`).join('')}</div></div>
<p class="cell-note">Reduced motion jumps instead (core §10).</p>
</article>`,
    `<article ${cellAttrs('cards', 'm', 'component.card shadow')}>
${cellHead('cards', 'Cards', '<span class="cell-aside">Flat · Interactive</span>')}
<div class="brand stack">
<article data-component="card" data-variant="flat" data-enter><h4>${esc(M.specimen?.cards?.flatTitle || 'Flat card')}</h4><p>${esc(M.specimen?.cards?.flatBody || 'A hairline border; plays the entrance.')}</p></article>
<article data-component="card" data-variant="raised" data-interactive><h4><a href="#tile-spec-cards">${esc(M.specimen?.cards?.interactiveTitle || 'Interactive card')}</a></h4><p>${esc(M.specimen?.cards?.interactiveBody || 'Lifts on hover and focus.')}</p></article>
</div>
</article>`,
    `<article ${cellAttrs('space', 's', 'space')}>
${cellHead('space', 'Spacing', '<span class="cell-aside">Base 4</span>')}
<ol class="space-scale" data-space-scale aria-label="Spacing scale"></ol>
</article>`,
    `<article ${cellAttrs('shape', 's', 'radius shadow')}>
${cellHead('shape', 'Radius and elevation')}
<ol class="shape-scale" aria-label="Radius and shadow levels">${[['sm', '1'], ['md', '2'], ['lg', '3']].map(([r, s]) => `<li><span class="shape" style="border-radius: var(--radius-${r}); box-shadow: var(--shadow-${s})"></span><span class="cell-note">${r.toUpperCase()} · ${s}</span></li>`).join('')}</ol>
</article>`,
    `<article ${cellAttrs('contrast', 'l2', 'color.text color.surface color.on')}>
${cellHead('contrast', 'Contrast', '<span class="cell-aside" data-contrast-summary></span>')}
<ul class="pairs" data-spec-pairs></ul>
</article>`,
    `<article ${cellAttrs('icons', 's', 'icon')}>
${cellHead('icons', 'Icons', '<span class="cell-aside">16 · 20 · 24</span>')}
<div class="brand icon-row">${['check', 'search', 'bell', 'heart', 'home', 'user'].map((k) => svgIcon(k)).join('')}</div>
</article>`,
    `<article ${cellAttrs('data', 's', 'color.data')}>
${cellHead('data', 'Data colours', '<span class="cell-aside">8 series</span>')}
<div class="bars" role="img" aria-label="The eight data colours as bars">${[8, 5, 7, 4, 6, 3, 5, 2].map((h, i) => `<span style="background: var(--color-data-${i + 1}); --h: ${h}"></span>`).join('')}</div>
</article>`,
    `<article ${cellAttrs('layout', 'w', 'breakpoint viewport')}>
${cellHead('layout', 'Breakpoints')}
<ol class="ruler" data-ruler aria-label="Breakpoints"></ol>
</article>`,
  ];
  return `<section class="view" id="view-specimen" data-board-panel="specimen" data-mini aria-labelledby="view-specimen-h">
<header class="view-head"><div><h2 class="view-title" id="view-specimen-h">${name ? esc(name) : 'Untitled brand'}</h2><p class="view-sub">${name ? 'Specimen: the brand tokens on real components.' : 'Specimen of the template defaults. Name the brand in design.md and this page becomes it.'}</p></div>
<p class="view-meta">${status(pct >= goal ? 'done' : 'warn', `${pct}% filled`)}</p></header>
<div class="bento" id="bento">
${cells.join('\n')}
</div>
${catalogHtml()}
</section>`;
}

function overviewBody(M) {
  const src = M.ctx.config.index;
  const sw = [['color.brand.primary', 'Primary'], ['color.brand.secondary', 'Secondary'], ['color.accent', 'Accent'], ['color.surface.default', 'Surface'], ['color.surface.raised', 'Raised'], ['color.surface.inverse', 'Inverse']];
  const logo = M.logo.variants.find((v) => v.name === 'primary') || M.logo.variants[0];
  return `<div class="ov">
<div class="ov-id brand">${logo?.svg ? `<div class="ov-logo" style="color: var(${varName(logo.colorPath || 'color.brand.primary')})">${inlineSvg(logo.svg)}</div>` : ''}
<p class="ov-name">${inline(M.brandRaw, src)}</p>
<p class="ov-feel">${inline(M.feelLine || '{{one-line feel}}', src)}</p></div>
<ul class="chips" aria-label="Palette">${sw.map(([p, l]) => `<li class="chip" data-swatch style="--fill: var(${varName(p)})"><span class="chip-fill"></span><span class="chip-text"><span class="chip-name">${l}</span><span class="hex" data-hex></span></span></li>`).join('')}</ul>
</div>`;
}

const zoneTiles = (M, z) => M.tiles.filter((t) => t.zone === z && t.kind !== 'review');
function coverageTile(M) {
  const c = M.coverage, pct = Math.floor(c.placeholders.completion * 100), goal = Math.round(c.placeholders.phase4_min * 100);
  const mods = M.modules.map((m) => `<li><span class="mod-name">${esc(FILE_LABEL[m.file] || m.file)}</span>${m.state === 'on' ? status('done', 'On') : m.state === 'off' ? status('none', 'Switched off') : status('info', 'Not chosen')}</li>`).join('');
  return `<article class="tile cov-tile" id="tile-coverage" data-tile="coverage" data-status="${pct >= 100 ? 'filled' : 'partial'}" aria-labelledby="tile-coverage-h">
<header class="tile-head"><p class="kicker">Checked by lint.mjs</p><div class="tile-meta"><a class="anchor" href="#tile-coverage" aria-label="Link to Coverage">${svgIcon('link', 'sm')}</a></div><h3 id="tile-coverage-h">Status and coverage</h3></header>
<div class="tile-body"><div class="cov">
<div class="ring-wrap" role="img" aria-label="${pct}% of template placeholders filled; Phase 4 needs ${goal}%"><svg class="ring" viewBox="0 0 36 36" aria-hidden="true" focusable="false"><circle class="ring-track" cx="18" cy="18" r="15.9155" pathLength="100"/><circle class="ring-value" cx="18" cy="18" r="15.9155" pathLength="100" stroke-dasharray="${pct} 100" transform="rotate(-90 18 18)"/><circle class="ring-goal" cx="18" cy="18" r="15.9155" pathLength="100" stroke-dasharray="1 99" stroke-dashoffset="${-(goal - 0.5)}" transform="rotate(-90 18 18)"/></svg><p class="ring-text" aria-hidden="true">${pct}%</p></div>
<dl class="facts"><div><dt>Template placeholders filled</dt><dd>${c.placeholders.initial - c.placeholders.remaining} of ${c.placeholders.initial}</dd></div><div><dt>Phase 4 needs</dt><dd>${goal}% (the tick on the ring)</dd></div><div><dt>Counted tiles</dt><dd>${c.tiles.filled} filled · ${c.tiles.partial} partly · ${c.tiles.empty} not filled</dd></div><div><dt>Shipped components documented</dt><dd>${c.components.documented} of ${c.components.existing} · ${c.components.planned} planned</dd></div></dl>
</div>
<div class="cov-mods"><h4>Modules</h4><ul class="mod-list">${mods}</ul></div></div>
</article>`;
}

function coverageView(M) {
  const zones = ZONES.slice(1).map(([z, name]) => {
    const ts = zoneTiles(M, z), f = ts.filter((t) => t.status === 'filled').length;
    const left = ts.reduce((n, t) => n + (t.counted ? t.placeholders : 0), 0);
    return `<section class="zone-card" aria-labelledby="cov-zone-${z}-h"><header class="cell-head"><h3 id="cov-zone-${z}-h">${esc(name)}</h3><span class="cell-aside">${f} of ${ts.length} filled</span></header>
<div class="meter" role="img" aria-label="${f} of ${ts.length} tiles filled"><span style="--v: ${ts.length ? f / ts.length : 1}"></span></div>
<ul class="tile-list">${ts.map((t) => { const [tone] = t.module === 'off' ? ['none'] : STATUS[t.status] || STATUS.partial; return `<li><a href="#tile-${t.id}"><span class="status-dot" data-tone="${tone}" aria-hidden="true"></span><span class="tl-name">${esc(splitTitle(t.title)[1])}</span><span class="tl-left">${t.module === 'off' ? 'Off' : t.placeholders ? `${t.placeholders} to fill` : 'Done'}</span></a></li>`; }).join('')}</ul>
<p class="cell-note">${left ? `${left} placeholders left` : ts.some((t) => t.placeholders) ? 'Not counted until its module is chosen' : 'Nothing left to fill'}</p></section>`;
  }).join('\n');
  return `<section class="view" id="view-coverage" data-board-panel="coverage" data-mini aria-labelledby="view-coverage-h">
<header class="view-head"><div><h2 class="view-title" id="view-coverage-h">Coverage</h2><p class="view-sub">What is filled, per zone and module. The same numbers as <code>node design-build/lint.mjs</code>.</p></div></header>
<div class="cov-grid">
${coverageTile(M)}
<div class="cov-zones">
${zones}
</div>
</div>
</section>`;
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
<link rel="stylesheet" href="${rel.preview}chrome.css">
<link rel="stylesheet" href="${rel.components}base.css">
<link rel="stylesheet" href="${rel.components}components.css">
<link rel="stylesheet" href="${rel.preview}preview.css">
<script src="${rel.preview}tokens.js"></script>
<script>
  // Before first paint: the saved or requested theme (?theme=<one of design.md themes>), sub-brand (?brand=<id>),
  // layout (?view=canvas), board view (?board=specimen|guidelines|coverage, or the view a #tile- link lives in)
  // and motion setting.
  (function () {
    var q = new URLSearchParams(location.search), r = document.documentElement, D = window.DESIGN_TOKENS || {};
    function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    var t = q.get('theme') || get('preview-theme'), b = q.get('brand') || get('preview-brand');
    if ((D.themes || ['light', 'dark']).indexOf(t) >= 0) r.setAttribute('data-theme', t);
    if (b && (D.brands || []).some(function (x) { return x.id === b; })) r.setAttribute('data-brand', b);
    if ((q.get('view') || get('board-view')) === 'canvas') r.setAttribute('data-view', 'canvas');
    if (get('board-motion') === 'reduce') r.setAttribute('data-motion', 'reduce');
    var h = location.hash, v = q.get('board') || get('board-tab');
    if (/^#(tile-spec-|view-specimen)/.test(h)) v = 'specimen';
    else if (/^#(tile-coverage|view-coverage)/.test(h)) v = 'coverage';
    else if (/^#(tile-|zone-|view-guidelines)/.test(h)) v = 'guidelines';
    r.setAttribute('data-board-view', ['specimen', 'guidelines', 'coverage'].indexOf(v) >= 0 ? v : 'specimen');
  })();
</script>
<script src="${rel.preview}preview.js" defer></script>
</head>`;

const seg = (label, items, extra = '') => `<div class="seg" role="group" aria-label="${esc(label)}"${extra}>${items}</div>`;
const syncBadge = (sync) => (sync ? `<span class="status sync-badge" data-sync="${sync.ok ? 'ok' : 'stale'}" data-tone="${sync.ok ? 'done' : 'warn'}" role="status" title="${esc(sync.ok ? 'DESIGN.md, Tailwind and Figma outputs match the tokens' : `Stale: ${sync.stale.join(', ')}`)}"><span class="status-dot" aria-hidden="true"></span>${sync.ok ? 'Outputs synced' : 'Outputs stale'}</span>` : '');
const toolbar = (label, { canvas = true, review = true, themes = ['light', 'dark'], brands = [], sub = 'Board', sync = null } = {}) => `<a class="skip-link" href="#main">Skip to content</a>
<header class="board-bar" id="board-bar">
<div class="bar-id"><span class="bar-mark" aria-hidden="true"></span><h1 data-key>${esc(label)}</h1><span class="bar-sub">${esc(sub)}</span>${syncBadge(sync)}</div>
<button type="button" class="tool icon-only bar-more" id="bar-more" aria-expanded="false" aria-controls="bar-tools" aria-label="Board settings">${svgIcon('more', 'md')}</button>
<div class="bar-tools" id="bar-tools">
${seg('Color theme', themes.map((t) => `<button type="button" class="tool" data-theme-choice="${esc(t)}" aria-pressed="false">${esc(themeLabel(t))}</button>`).join('') + (themes.length > 1 ? '<button type="button" class="tool" data-theme-choice="system" aria-pressed="true">System</button>' : ''))}
${brands.length ? seg('Brand', `<button type="button" class="tool" data-brand-choice="" aria-pressed="true">Main</button>${brands.map((b) => `<button type="button" class="tool" data-brand-choice="${esc(b.id)}" aria-pressed="false">${esc(stripPh(b.name || b.id))}</button>`).join('')}`) : ''}
${canvas ? seg('Layout', '<button type="button" class="tool" data-view-choice="page" aria-pressed="true">Page</button><button type="button" class="tool" data-view-choice="canvas" aria-pressed="false">Canvas</button>', ' data-view-switch') : ''}
${canvas ? '<div class="seg zoom-tools" role="group" aria-label="Zoom"><button type="button" class="tool" data-zoom="out" aria-label="Zoom out">−</button><output class="zoom-level" id="zoom-level">100%</output><button type="button" class="tool" data-zoom="in" aria-label="Zoom in">+</button><button type="button" class="tool" data-zoom="fit">Fit</button></div>' : ''}
${canvas && themes.length > 1 ? '<button type="button" class="tool plain" id="toggle-duo" aria-pressed="false">Compare</button>' : ''}
<div class="pop"><button type="button" class="tool plain" id="motion-menu" aria-expanded="false" aria-controls="motion-pop">Motion</button><div class="pop-panel" id="motion-pop" role="group" aria-label="Motion" hidden><button type="button" class="tool plain" id="replay-motion">Replay motion</button><button type="button" class="tool plain" id="toggle-reduce" aria-pressed="false">Reduce motion</button></div></div>
${canvas ? `<div class="pop"><button type="button" class="tool plain" id="export-menu" aria-expanded="false" aria-controls="export-pop">${svgIcon('download', 'sm')}Export</button><div class="pop-panel" id="export-pop" role="group" aria-label="Export PNG" hidden><button type="button" class="tool plain" id="export-png">PNG of this view</button><p class="pop-note" id="export-note">Needs the live board (<code>node design-build/board.mjs --serve</code>) or run <code>node design-build/board.mjs --png --view specimen</code>.</p></div></div>` : ''}
${review ? '<button type="button" class="tool strong" id="toggle-review" aria-pressed="false">Review</button>' : ''}
</div>
</header>`;

const viewTabs = () => `<nav class="view-tabs" aria-label="Board views" data-key><ul>${VIEWS.map(([id, label]) => `<li><a href="?board=${id}" data-board-choice="${id}">${label}</a></li>`).join('')}</ul></nav>`;

/** The board page and its AI companions, from the current files. */
export function build(root, opts = {}) {
  const M = model(root);
  const sync = exportSync(root, opts.pendingExports, opts.generatedExports);
  const tile = (t) => tileHtml(t, bodyFor(t, M), M);
  const tilesWrap = (list) => `<div class="tiles">\n${list.map(tile).join('\n')}\n</div>`;
  const GROUPS = [['actions', 'Actions'], ['inputs', 'Inputs'], ['feedback', 'Feedback'], ['navigation', 'Navigation'], ['data-display', 'Data display'], ['layout', 'Layout']];
  const zones = ZONES.map(([z, name, desc]) => {
    const all = M.tiles.filter((t) => t.zone === z);
    let inner;
    if (z === 3) {
      const rest = all.filter((t) => t.kind !== 'component');
      const comps = all.filter((t) => t.kind === 'component');
      const known = new Set(GROUPS.map(([id]) => id));
      const groups = GROUPS.map(([id, label]) => {
        const mine = comps.filter((t) => (t.comp.group || 'layout') === id);
        if (!mine.length) return '';
        return `<section class="comp-group" id="group-${id}" data-group="${id}" aria-labelledby="group-${id}-h">
<h3 class="group-title" id="group-${id}-h">${esc(label)}</h3>
${tilesWrap(mine)}
</section>`;
      }).join('\n');
      const extra = comps.filter((t) => !known.has(t.comp.group || 'layout'));
      inner = `${tilesWrap(rest)}\n${groups}${extra.length ? `\n${tilesWrap(extra)}` : ''}`;
    } else if (z === 4) {
      const screens = all.filter((t) => t.kind === 'screen');
      const preview = screens.filter((t) => t.screen?.id === 'preview');
      const patterns = screens.filter((t) => t.screen?.id !== 'preview');
      const other = all.filter((t) => t.kind !== 'screen');
      inner = `${tilesWrap([...other, ...preview])}
<section class="comp-group" id="group-patterns" data-group="patterns" aria-labelledby="group-patterns-h">
<h3 class="group-title" id="group-patterns-h">Patterns</h3>
${tilesWrap(patterns)}
</section>`;
    } else inner = tilesWrap(all);
    const feel14 = z === 6 ? feelOf(sectionOf(M.ctx.core, '§14')) : null;
    return `<section class="zone" id="zone-${z}" data-zone="${z}" data-mini aria-labelledby="zone-${z}-h">
<header class="zone-head"><h2 id="zone-${z}-h">${esc(name)}</h2><p class="zone-desc">${esc(desc)}</p>${feel14 ? `<p class="feel">${inline(feel14, 'design/core.md')}</p>` : ''}</header>
${inner}
</section>`;
  }).join('\n');
  const html = `${head('Design system board', 'Every part of the design system as a tile, built from the design files, tokens and UI inventory by design-build/board.mjs.', { preview: '', components: '../../components/', fonts: fontsHref(root, M.ctx) })}
<body data-page="board">
${toolbar('Design system', { themes: themesOf(M), brands: M.ctx.brands.filter((b) => b.loaded), sync })}
${viewTabs()}
<main id="main" tabindex="-1">
<section class="duo" id="duo" aria-label="${esc(themesOf(M).map(themeLabel).join(', '))} compared" hidden>${themesOf(M).map((t) => `<div class="duo-pane" data-mode="${esc(t)}" data-chrome="${schemeOf(t)}"><h2 class="duo-title">${esc(themeLabel(t))}</h2><div class="duo-body bento"></div></div>`).join('')}</section>
<div class="canvas-shell">
<div class="board-viewport" id="board-viewport" role="region" aria-label="Board. In canvas layout: arrow keys scroll, plus and minus zoom, 0 resets, F fits" tabindex="0">
<div class="board" id="board">
${specimenView(M)}
<section class="view" id="view-guidelines" data-board-panel="guidelines" aria-labelledby="view-guidelines-h">
<header class="view-head"><div><h2 class="view-title" id="view-guidelines-h">Guidelines</h2><p class="view-sub">Every section of the design files as a card, in seven zones.</p></div>
<nav class="zone-nav" aria-label="Zones"><ul>${ZONES.map(([z, name]) => `<li><a href="#zone-${z}">${esc(name)}</a></li>`).join('')}</ul></nav></header>
${zones}
</section>
${coverageView(M)}
</div>
</div>
<div class="minimap" id="minimap" aria-hidden="true"><div class="minimap-board"></div><div class="minimap-view"></div></div>
<button type="button" class="tool minimap-toggle" id="minimap-toggle" aria-pressed="false" aria-label="Hide the minimap">${svgIcon('minus', 'sm')}</button>
</div>
</main>
<footer class="site-footer"><p title="Sources: design.md, design/, ${esc(M.ctx.tokensRel)}, design-build/inventory.json, ui-inventory/, ${esc(M.logo.rel)}. Agents read preview/board.json and preview/board.md.">Built from the design files by <code>board.mjs</code>. Edit the sources, not this page.</p></footer>
<script type="module" src="../../components/boot.js"></script>
<!-- For agents: the same board as data in preview/board.json and preview/board.md. Rebuild with node design-build/board.mjs. -->
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
    exports: { status: sync.ok ? 'synced' : 'stale', files: sync.files, stale: sync.stale },
  };
  return { html: wrapCode(html), json: JSON.stringify(json, null, 1) + '\n', md: companionMd(M, json), css: buildChromeCss(root, M.ctx.themes), model: M };
}

const cell = (s) => String(s).replace(/\|/g, '/').replace(/\n/g, ' ');
const hexPair = (h) => (h ? [...new Set(Object.entries(h).filter(([m]) => m !== 'base').map(([, x]) => x))].join(' / ') || h.base : '');
/** design.md themes (first = default) and a button label for each: high-contrast → High contrast. */
const themesOf = (M) => M.ctx.themes;
const themeLabel = (t) => String(t).replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
function companionMd(M, json) {
  const c = M.coverage, L = [];
  const state = (m) => (m === 'on' ? 'on' : m === 'off' ? 'switched off' : 'not chosen');
  L.push('# Design board (for agents)', '', 'Generated by `node design-build/board.mjs` together with `preview/index.html` and `preview/board.json`. Do not edit: change the design files and re-run it. Hex values below are stamped from the tokens for exports; the design files keep token refs.', '');
  L.push(`- Brand: ${json.brand_name}`);
  if (json.exports) L.push(`- Outputs: ${json.exports.status}${json.exports.stale.length ? ` (${json.exports.stale.join(', ')})` : ''}`);
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
  const TH = themesOf(M);
  L.push('', '## Colors', '', `| Token | ${TH.map(themeLabel).join(' | ')} |`, `|---|${TH.map(() => '---|').join('')}`);
  for (const [p, h] of Object.entries(json.colors)) L.push(`| \`${p}\` | ${TH.map((t) => h[t] ?? h.base).join(' | ')} |`);
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
    return `<div class="dir-pane" data-direction="${esc(d.id)}" data-mode="${mode}" data-chrome="${mode}">
<h3 class="pane-label">${mode === 'light' ? 'Light' : 'Dark'}</h3>
<ul class="dir-prop" aria-label="Palette in proportion">${[['color.surface.default', 'Surface', 6], ['color.brand.primary', 'Brand', 3], ['color.accent', 'Accent', 1]].map(([t, l, w]) => `<li class="prop-chip" style="flex-grow: ${w}"><span class="chip-fill" style="background: var(${varName(t)})"></span><span class="chip-name">${l}</span></li>`).join('')}</ul>
<div class="dir-type brand"><p class="dir-display">Display line</p><p class="dir-h1">Heading one</p><p>Body copy at reading size, with a <a href="#dir-${esc(d.id)}">link</a>.</p><p class="lang-te" lang="te">తెలుగు నమూనా</p><p class="lang-hi" lang="hi">हिंदी नमूना</p></div>
<div class="table-scroll" role="region" aria-label="Direction ${esc(d.id)} ${mode} contrast" tabindex="0"><table class="dir-pairs"><thead><tr><th scope="col">Pair</th><th scope="col">Ratio</th></tr></thead><tbody data-pairs></tbody></table></div>
<div class="icon-grid dense brand">${Object.keys(ICON).filter((k) => k !== 'link').map((k) => `<span class="icon-cell">${svgIcon(k, 'md')}<span class="sr-only">${k}</span></span>`).join('')}</div>
<div class="dir-motion"><button type="button" class="tool" data-play aria-pressed="false">Play motion</button><div class="motion-track"><div class="mover fast"></div></div><div class="motion-track"><div class="mover"></div></div><div class="motion-track"><div class="mover slow"></div></div></div>
<div class="dir-mock brand">
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
${toolbar('Visual studies', { canvas: false, review: false, themes: ctx.themes, brands: ctx.brands.filter((b) => b.loaded), sub: 'Pick a direction' })}
<nav class="zone-nav" aria-label="Directions" data-key><ul>${dirs.map((d) => `<li><a href="#dir-${esc(d.id)}">Direction ${esc(d.id)}</a></li>`).join('')}</ul></nav>
<main id="main" tabindex="-1" class="studies">
<p class="load-note" id="studies-note">Each direction is shown in light and dark with its own tokens, read from <code>directions/&lt;ID&gt;.resolved.json</code> over http. Serve the folder with <code>node design-build/board.mjs --serve --watch</code>.</p>
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

/** Everything the live board regenerates, built in memory: [[rel, content]] plus any problems (nothing is written here). */
export function liveRebuild(root) {
  const t = generateTokens(root);
  if (t.ctx.loaded.problems.length) return { problems: t.ctx.loaded.problems.map((p) => ({ file: t.ctx.tokensRel, line: p.line, message: `${p.message} → fix: ${p.fix}` })), outputs: [] };
  let generatedExports;
  try { generatedExports = outputFiles(root); }
  catch (e) { return { problems: [{ file: 'design-build/designmd.mjs', line: 1, message: `${e.message} → fix: node design-build/designmd.mjs` }], outputs: [] }; }
  const pendingExports = Object.fromEntries(generatedExports);
  const b = build(root, { pendingExports, generatedExports });
  const outputs = [['design-build/preview/tokens.css', t.css], ['design-build/preview/tokens.js', t.js], ['design-build/preview/tokens.mjs', t.mjs], ...Object.entries(OUT).map(([k, rel]) => [rel, b[k]]), ...generatedExports];
  const problems = b.model.logo.problems.map((p) => ({ file: b.model.logo.rel, line: 1, message: p }));
  const studies = path.join(root, 'design-build/studies/index.html');
  if (fs.existsSync(studies)) {
    const ids = [...new Set([...fs.readFileSync(studies, 'utf8').matchAll(/<section class="direction" id="dir-[^"]+" data-direction="([^"]+)"/g)].map((m) => m[1]))];
    if (ids.length) {
      const s = buildStudies(root, ids);
      if (s.problems.length) problems.push(...s.problems.map((p) => ({ file: 'design-build/studies/directions', line: 1, message: String(p) })));
      else outputs.push(...s.resolved, ['design-build/studies/index.html', s.html]);
    }
  }
  // resolved values too, so a role that aliases a changed ramp step counts as changed
  const tokens = new Map([...t.ctx.loaded.tokens].map(([k, v]) => { const f = t.ctx.flat.get(k); return [k, JSON.stringify([v.value, v.modes, f ? [f.css, f.color, f.px] : null])]; }));
  return { outputs, html: b.html, tokens, problems };
}

async function serve(root, { port, watch, poll, pre }) {
  let live;
  try { live = await startLive(root, { port, watch, poll, rebuild: liveRebuild, log: (m) => console.log(m) }); }
  catch (e) { console.error(`could not start the server: ${e.message}`); process.exit(1); }
  const board = `${live.url}design-build/preview/`;
  console.log(`\n  Design board:  ${board}\n  Studies page:  ${live.url}design-build/studies/\n`);
  console.log(watch ? `  Live: watching the design files (${live.watchMode}); saves rebuild and reload open tabs. Ctrl+C stops.\n` : `  Static: --no-watch, files are served as they are (rebuild with: node ${pre}design-build/board.mjs). Ctrl+C stops.\n`);
  let stopping = false;
  const stop = () => { if (stopping) return; stopping = true; live.close().then(() => process.exit(0)); setTimeout(() => process.exit(0), 1500).unref(); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(HERE, '..');
  const argv = process.argv.slice(2);
  const all = (flag) => argv.flatMap((a, i) => (a === flag && argv[i + 1] !== undefined ? [argv[i + 1]] : []));
  const relRoot = path.relative(process.cwd(), root).split(path.sep).join('/');
  const pre = relRoot ? `${relRoot}/` : '';
  if (argv.includes('--serve') || argv.includes('--watch')) {
    const p = all('--port')[0];
    serve(root, { port: p === undefined ? 4173 : Number(p), watch: !argv.includes('--no-watch'), poll: argv.includes('--poll'), pre });
  }
  else if (argv.includes('--png')) {
    const view = all('--view')[0] || 'specimen', theme = all('--theme')[0], width = Number(all('--width')[0] || 1280);
    if (!VIEWS.some(([v]) => v === view)) { console.error(`--view must be one of ${VIEWS.map(([v]) => v).join(', ')}`); process.exit(2); }
    const themes = loadContext(root).themes, th = theme || themes[0];
    if (!themes.includes(th)) { console.error(`--theme must be one of ${themes.join(', ')} (design.md themes)`); process.exit(2); }
    const { exportPng, closeExport } = await import('./lib/export.mjs');
    const out = `design-build/exports/board-${view}-${th}-${width}.png`;
    try {
      const url = new URL(pathToFileURL(path.join(root, OUT.html)).href); url.searchParams.set('board', view);
      const png = await exportPng({ url: url.href, theme: th, width });
      fs.mkdirSync(path.join(root, 'design-build/exports'), { recursive: true });
      fs.writeFileSync(path.join(root, out), png);
      console.log(`wrote ${pre}${out}`);
    } catch (e) { console.error(`PNG export needs Playwright: npm --prefix ${pre}design-build ci && npx --prefix ${pre}design-build playwright install chromium (${e.message.split('\n')[0]})`); process.exitCode = 1; }
    finally { await closeExport(); }
  }
  else if (argv.includes('--overview-only')) {
    const ids = all('--direction').flatMap((x) => x.split(',')).map((x) => x.trim()).filter(Boolean);
    if (!ids.length) { console.error('--overview-only needs --direction <ID>, once per direction (e.g. --direction A --direction B)'); process.exit(2); }
    const s = buildStudies(root, ids);
    if (s.problems.length) { for (const p of s.problems) console.error(p); process.exit(1); }
    for (const [rel, c] of s.resolved) fs.writeFileSync(path.join(root, rel), c);
    fs.writeFileSync(path.join(root, 'design-build/studies/index.html'), s.html);
    console.log(`wrote ${pre}design-build/studies/index.html and ${s.resolved.length} resolved direction file(s); view it with: node ${pre}design-build/board.mjs --serve --watch`);
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
      if (stale.length) console.error(`out of date: ${stale.map((f) => pre + f).join(', ')}; the board follows the design files and the DESIGN.md, Tailwind and Figma outputs; fix: node ${pre}design-build/designmd.mjs && node ${pre}design-build/board.mjs`);
      if (stale.length || lp.length) process.exit(1);
      console.log('board is up to date (preview/index.html, board.json, board.md, chrome.css)');
    } else {
      for (const [k, rel] of Object.entries(OUT)) fs.writeFileSync(path.join(root, rel), b[k]);
      for (const p of lp) console.error(`warning: ${p}`);
      const c = b.model.coverage;
      console.log(`wrote ${pre}${OUT.html}, board.json, board.md and chrome.css: ${b.model.tiles.length + 1} tiles, ${Math.floor(c.placeholders.completion * 100)}% filled (${c.placeholders.remaining} placeholders left)`);
    }
  }
}
