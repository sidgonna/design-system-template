#!/usr/bin/env node
// design-build/lint.mjs — static checks for this design system (design.md §16 Phase 4 lint block, §15).
// Zero dependencies: Node >= 18 built-ins only. Every finding prints file:line, the bad value and the exact fix.
//
// Usage (from the app root): node design-system/design-build/lint.mjs [--json] [--baseline] [--src <dir>]... [--root <dir>] [--phase <n>] [--record] [--quiet]
//   Lints the design docs, tokens, the design system's own preview/studies AND the app's code: src/, app/, pages/,
//   components/, styles/, top-level *.html/*.css and public/*.html (or design-build/project.json → code_dirs).
//   --json       machine-readable result on stdout
//   --baseline   write design-build/lint-baseline.json with today's counts per rule (needs the user's approval, §0.5);
//                later runs fail when a rule's count rises above its baseline, so counts can only go down
//   --src <dir>  also lint this code directory or file (repeatable)
//   --root <dir> the project (app) root. Default: git top level, else the nearest package.json above design-system/
//   --phase <n>  treat the build as being in phase n (default: design-build/state.yaml → phase)
//   --record     write the result to design-build/state.yaml → checks.lint
// Exit codes: 0 pass, 1 fail, 2 internal error.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContext, pairingResults, gitHead, recordCheck, readJson } from './lib/context.mjs';
import { inSection, yamlBlock, yamlBlockKeys, table, placeholders, unwrap, analyze } from './lib/markdown.mjs';
import { parseColor, parseDtcgColor, toHex, deltaE, srgbToOklch, suggestPassingColor } from './lib/color.mjs';
import { varName, toPx, collectAliases } from './lib/tokens.mjs';
import { generate } from './tokens-css.mjs';
import { STATES, DOC_STATES, COMPONENT_HEADINGS, UI_DIR, expected as uiExpected, blockOf, docPath, screenPath, screensOf, resolveSource } from './lib/ui-inventory.mjs';
import { DS_ROOT, findProject, fixHint, appCodeTargets, projectConfig, APP_EXCLUDE } from './lib/project.mjs';

const RULES = {
  'raw-value': 'raw hex/rgb/hsl/oklch/px/ms value outside the token-owning sections and files',
  'unresolved-token': '{token.path} or var(--token) that does not exist in tokens_file',
  'role-slot': 'token used in a slot its §4 "Never use for" column forbids',
  contrast: '§4 pairing below the §11 contrast minimum in a mode',
  'avoid-default': 'unjustified AI-look default from core.md §2 avoid_defaults',
  'unknown-component': 'component, variant or prop not in design-build/inventory.json',
  'ui-inventory': 'a screen or component without a complete ui-inventory doc, a doc out of sync with inventory.json, or a doc token that does not exist',
  'ownership-overlap': 'a § owned by two files, or defined outside its owner',
  completion: 'filled placeholders below the Phase 4 minimum (phase >= 4 only)',
  'tokens-format': 'tokens_file is not valid DTCG, or a themed color lacks a mode',
  'tokens-sync': 'core.md §13 and tokens_file disagree',
  'tokens-css-stale': 'generated preview/tokens.css, tokens.js or tokens.mjs out of date',
  'seed-cap': 'a §16.2 seed group has more entries than allowed',
  'kickstart-sync': 'README kickstart block differs from KICKSTART.md',
  'tokens-import': 'Phase 6+: no app code file imports the generated tokens.css',
  layout: 'the design system is not where the scripts expect it (warning)',
  'checklist-15': '§15 items that need a person (info only)',
};

// ---------- args ----------
function parseArgs(argv) {
  const a = { json: false, baseline: false, src: [], root: null, phase: null, record: false, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--json') a.json = true;
    else if (k === '--baseline') a.baseline = true;
    else if (k === '--record') a.record = true;
    else if (k === '--quiet') a.quiet = true;
    else if (k === '--src') a.src.push(argv[++i]);
    else if (k === '--root') a.root = argv[++i];
    else if (k === '--phase') a.phase = Number(argv[++i]);
    else if (k === '--help' || k === '-h') { a.help = true; }
    else throw new Error(`unknown option ${k} (see --help)`);
  }
  return a;
}

// ---------- helpers ----------
const rel = (ctx, abs) => path.relative(ctx.root, abs).split(path.sep).join('/');
const ref = (p) => `{${p}}`;
function levenshtein(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function didYouMean(name, candidates, n = 3) {
  return [...candidates].map((c) => [c, levenshtein(name, c)]).sort((x, y) => x[1] - y[1]).slice(0, n).filter(([, d]) => d <= Math.max(3, name.length / 2)).map(([c]) => c);
}
const stripUrls = (s) => s.replace(/https?:\/\/[^\s)"'`>]+/g, (m) => ' '.repeat(m.length));

const RAW = [
  { kind: 'color-fn', re: /\b(rgba?|hsla?|oklch|oklab|lab|lch|hwb|color)\([^()]*\)/gi },
  { kind: 'hex', re: /(?<![\w&#/-])#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![\w-])/g },
  { kind: 'px', re: /(?<![\w.#-])-?(?:\d+\.?\d*|\.\d+)px\b/g },
  { kind: 'ms', re: /(?<![\w.#-])(?:\d+\.?\d*|\.\d+)ms\b/g },
];

function findRaw(line) {
  const s = stripUrls(line);
  const hits = [];
  for (const { kind, re } of RAW) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(s))) {
      if (kind === 'px' && /^-?0+(\.0+)?px$/.test(m[0])) continue; // 0px is not a design value
      if (kind === 'color-fn' && /^color\(/i.test(m[0]) && !/srgb|p3|rec2020|xyz|display/i.test(m[0])) continue;
      if (kind === 'color-fn' && /var\(/.test(m[0])) continue;
      hits.push({ kind, value: m[0], index: m.index });
    }
  }
  // drop hex/px found inside a color function already reported
  return hits.filter((h) => !(h.kind !== 'color-fn' && hits.some((o) => o.kind === 'color-fn' && h.index > o.index && h.index < o.index + o.value.length)));
}

// token lookup tables for suggestions
function tokenIndex(ctx) {
  const colors = [], dims = [], durs = [];
  for (const [p, e] of ctx.flat) {
    if (e.type === 'color') for (const [m, c] of Object.entries(e.color)) if (c && m !== 'base') colors.push({ path: p, mode: m, c, hex: toHex(c) });
    if (e.type === 'color' && !Object.keys(e.color).some((m) => m !== 'base') && e.color.base) colors.push({ path: p, mode: 'base', c: e.color.base, hex: toHex(e.color.base) });
    if (e.type === 'dimension' && e.px !== null) dims.push({ path: p, px: e.px });
    if (e.type === 'duration') durs.push({ path: p, ms: e.ms });
  }
  return { colors, dims, durs };
}

// Which slot (background / foreground / border) a raw value sits in, from the CSS property or utility class before it.
const SLOT_OF = { background: /^(background|background-color|background-image|bg|fill-bg)$/, foreground: /^(color|fill|stroke|-webkit-text-fill-color|text-decoration-color|caret-color|text|placeholder)$/, border: /^(border(-[a-z]+)*|outline(-color)?|ring|divide|column-rule-color)$/ };
function slotAt(line, index) {
  const before = line.slice(0, index);
  const tw = before.match(/\b(bg|text|fill|stroke|border|outline|ring|divide|placeholder)-\[$/);
  const prop = tw ? tw[1] : (before.match(/["']?([a-zA-Z-]+)["']?\s*:\s*[^;:{}]*$/)?.[1] || '').replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
  return Object.entries(SLOT_OF).find(([, re]) => re.test(prop))?.[0] || null;
}
// Token groups that never fit a slot: text colors are not backgrounds, surfaces are not text.
const WRONG_GROUP = { background: ['text'], foreground: ['surface'], border: [] };
const fitsSlot = (p, slot) => !slot || !WRONG_GROUP[slot].includes(p.split('.')[1]);

function suggestFor(ctx, idx, hit, inCode, slot = null) {
  const use = (paths) => paths.map((p) => (inCode ? `var(${varName(p)})` : ref(p))).join(' or ');
  if (hit.kind === 'hex' || hit.kind === 'color-fn') {
    const c = parseColor(hit.value);
    const role = slot ? ` for a ${slot}` : '';
    if (!c) return `replace it with a color token from §13, e.g. ${use([slot === 'background' ? 'color.surface.default' : 'color.text.primary'])}`;
    const all = [...new Set(idx.colors.filter((t) => t.hex.toLowerCase() === toHex(c).toLowerCase()).map((t) => t.path))];
    const exact = all.filter((p) => fitsSlot(p, slot));
    if (exact.length === 1) return `use ${use(exact)} (same value)`;
    if (exact.length > 1) return `use ${use(exact)} (all have this value; pick the one whose §4 role matches this use)`;
    const near = [...new Map(idx.colors.filter((t) => fitsSlot(t.path, slot)).map((t) => [t.path, { path: t.path, d: deltaE(c, t.c) }])).values()].sort((a, b) => a.d - b.d).slice(0, 3);
    const wrong = all.length ? `${use(all)} has this value but is not a ${slot} role; ` : 'no token has this value; ';
    return `${wrong}use the closest token${role}: ${near.map((n) => `${use([n.path])} (ΔE ${n.d.toFixed(1)})`).join(', ')}, or add a token to §13 and tokens_file`;
  }
  if (hit.kind === 'px') {
    const px = parseFloat(hit.value);
    const exact = idx.dims.filter((d) => Math.abs(d.px - Math.abs(px)) < 0.01).map((d) => d.path);
    const neg = px < 0 ? (inCode ? ' inside calc(-1 * …)' : ' (negated)') : '';
    if (exact.length) return `use ${use(exact.slice(0, 4))}${neg}${exact.length > 1 ? ' (pick by meaning: space, radius, size…)' : ''}`;
    const near = [...idx.dims].sort((a, b) => Math.abs(a.px - Math.abs(px)) - Math.abs(b.px - Math.abs(px))).slice(0, 3);
    return `no token is ${Math.abs(px)}px; use the nearest: ${near.map((n) => `${use([n.path])} (${n.px}px)`).join(', ')}, or add a token to §13`;
  }
  if (hit.kind === 'ms') {
    const ms = parseFloat(hit.value);
    const near = [...idx.durs].sort((a, b) => Math.abs(a.ms - ms) - Math.abs(b.ms - ms)).slice(0, 2);
    return near.length && near[0].ms === ms ? `use ${use([near[0].path])}` : `use the nearest duration token: ${near.map((n) => `${use([n.path])} (${n.ms}ms)`).join(', ')}`;
  }
  return 'move the value into §13 and reference the token';
}

// ---------- token references ----------
const LITERAL_REFS = new Set(['token.path', 'group.token', 'token', 'alias']);
const REF_RE = /(?<!\{)\{([a-z][a-z0-9-]*(?:\.(?:[a-z0-9-]+|\*|\d+\.\.\d+))+)\}(?!\})/gi;
function refExists(ctx, p) {
  if (ctx.flat.has(p)) return true;
  if (p.endsWith('.*')) { const pre = p.slice(0, -1); return [...ctx.flat.keys()].some((k) => k.startsWith(pre)); }
  const r = p.match(/^(.*)\.(\d+)\.\.(\d+)$/);
  if (r) return ctx.flat.has(`${r[1]}.${r[2]}`) && ctx.flat.has(`${r[1]}.${r[3]}`); // a range names a scale's ends: {space.1..12}
  return false;
}
function missingRange(ctx, p) {
  const r = p.match(/^(.*)\.(\d+)\.\.(\d+)$/);
  if (!r) return null;
  const miss = [];
  for (const i of [r[2], r[3]]) if (!ctx.flat.has(`${r[1]}.${i}`)) miss.push(`${r[1]}.${i}`);
  return miss;
}

// ---------- code files ----------
const lintable = (f, exts) => exts.includes(path.extname(f).toLowerCase()) && !/\.d\.ts$|\.min\.(js|css)$/.test(f);
function walkFiles(dir, exts, exclude, excludeAbs = [], out = []) {
  let ents;
  if (excludeAbs.some((x) => dir === x || dir.startsWith(x + path.sep))) return out;
  try { if (fs.statSync(dir).isFile()) { if (lintable(dir, exts)) out.push(dir); return out; } } catch { return out; }
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    if (exclude.includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkFiles(p, exts, exclude, excludeAbs, out);
    else if (lintable(e.name, exts)) out.push(p);
  }
  return out;
}

/** CSS-ish declarations in a file: { prop, value, line, selector } (handles <style>, style="", .css). */
function declarations(text) {
  const out = [];
  const lineAt = (i) => text.slice(0, i).split('\n').length;
  // style="..." attributes
  for (const m of text.matchAll(/\bstyle\s*=\s*(["'])([\s\S]*?)\1/g)) {
    const tagStart = text.lastIndexOf('<', m.index);
    const tag = text.slice(tagStart, text.indexOf('>', m.index) + 1);
    for (const d of m[2].split(';')) { const k = d.indexOf(':'); if (k > 0) out.push({ prop: d.slice(0, k).trim().toLowerCase(), value: d.slice(k + 1).trim(), line: lineAt(m.index), selector: tag.slice(0, 80), inline: true }); }
  }
  // rule blocks (in .css or <style>): selector { decls }
  const cssText = text.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(cssText))) {
    const selector = m[1].split(/[;>]\s*\n|\n\s*\n/).pop().trim();
    if (!selector || /^\s*(@media|@supports)/.test(selector) && !m[2].includes(':')) continue;
    let off = m.index + m[1].length + 1;
    for (const d of m[2].split(';')) {
      const k = d.indexOf(':');
      if (k > 0 && /^[\sa-z-]+$/i.test(d.slice(0, k))) out.push({ prop: d.slice(0, k).trim().toLowerCase(), value: d.slice(k + 1).trim(), line: lineAt(off + d.search(/\S/)), selector });
      off += d.length + 1;
    }
  }
  return out;
}

const SLOT_PROPS = {
  background: ['background', 'background-color', 'background-image'],
  foreground: ['color', 'fill', 'stroke', '-webkit-text-fill-color', 'text-decoration-color', 'caret-color', 'column-rule-color'],
  border: ['border', 'border-color', 'border-top', 'border-right', 'border-bottom', 'border-left', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'outline', 'outline-color', 'border-block', 'border-inline', 'border-block-color', 'border-inline-color'],
};
const TW_SLOT = { bg: 'background', text: 'foreground', fill: 'foreground', stroke: 'foreground', border: 'border', outline: 'border', ring: 'border', from: 'background', via: 'background', to: 'background' };

// ---------- main ----------
export function lint(opts = {}) {
  // root = the design-system folder (where design.md lives); project = the app it serves (see lib/project.mjs).
  const root = path.resolve(opts.root || DS_ROOT);
  const where = findProject(root, opts.project || null);
  const ctx = loadContext(root);
  const C = ctx.config;
  const findings = [];
  const add = (rule, severity, file, line, message, fix, extra = {}) => findings.push({ rule, severity, file, line, message, fix, ...extra });
  const idx = tokenIndex(ctx);
  const phase = opts.phase ?? (typeof ctx.state.phase === 'number' ? ctx.state.phase : ctx.state.phase === 'done' ? 7 : 0);
  for (const w of where.warnings) add('layout', 'warning', 'design.md', 1, w, 'use the supported layout: the template in design-system/ at the app root, committed in the app\'s own repo (README Quick start)');
  const isAllowed = (rule, file, section) => C.allow.some((a) => a.rule === rule && a.file === file && (!a.section || inSection(section, a.section)));
  const isTokenSection = (file, section) => C.token_sections.some((t) => t.file === file && inSection(section, t.section));

  // ---- tokens-format ----
  for (const p of ctx.loaded.problems) add('tokens-format', 'error', ctx.tokensRel, p.line, p.message, p.fix);
  for (const t of ctx.loaded.tokens.values()) {
    const vals = [t.value, ...Object.values(t.modes)];
    for (const v of vals) {
      if (typeof v === 'string' && /^\{.*\}$/.test(v)) continue;
      if (t.type === 'dimension' && !(v && typeof v === 'object' && ['px', 'rem'].includes(v.unit) && typeof v.value === 'number'))
        add('tokens-format', 'error', ctx.tokensRel, t.line, `${t.path}: dimension ${JSON.stringify(v)} is not { "value": <number>, "unit": "px" | "rem" }`, `write it as { "value": ${parseFloat(v?.value ?? v) || 0}, "unit": "px" } (DTCG 2025.10 allows only px and rem; use $type "number" for other units)`);
      if (t.type === 'duration' && !(v && typeof v === 'object' && ['ms', 's'].includes(v.unit) && typeof v.value === 'number'))
        add('tokens-format', 'error', ctx.tokensRel, t.line, `${t.path}: duration ${JSON.stringify(v)} is not { "value": <number>, "unit": "ms" | "s" }`, `write it as { "value": ${parseFloat(v?.value ?? v) || 0}, "unit": "ms" }`);
      if (t.type === 'color' && typeof v === 'string')
        add('tokens-format', 'warning', ctx.tokensRel, t.line, `${t.path}: color "${v}" is a string; DTCG 2025.10 colors are objects`, `write { "colorSpace": "srgb", "components": [r, g, b], "hex": "${v}" } (Terrazzo deprecates string colors)`);
      if (t.type === 'color' && !parseDtcgColor(v)) add('tokens-format', 'error', ctx.tokensRel, t.line, `${t.path}: ${JSON.stringify(v)} is not a color`, 'use { "colorSpace": "srgb", "components": [r, g, b] } with components 0–1');
      if (t.type === 'cubicBezier' && !(Array.isArray(v) && v.length === 4 && v.every((n) => typeof n === 'number')))
        add('tokens-format', 'error', ctx.tokensRel, t.line, `${t.path}: cubicBezier ${JSON.stringify(v)} is not 4 numbers`, 'write [x1, y1, x2, y2], e.g. [0.2, 0, 0, 1]');
    }
  }
  const themed = [...ctx.loaded.tokens.values()].filter((t) => t.type === 'color' && Object.keys(t.modes).length);
  for (const t of themed) for (const m of ctx.loaded.modes) if (t.modes[m] === undefined)
    add('tokens-format', 'error', ctx.tokensRel, t.line, `${t.path} has $extensions.mode values but no "${m}"`, `add "${m}": { "colorSpace": "srgb", … } under $extensions.mode, and the same value to §13 modes.${m}`);

  // ---- design files: raw values, references, placeholders ----
  let totalPh = 0;
  const phPerFile = {};
  for (const f of ctx.files.values()) {
    let count = 0;
    for (const L of f.analysis.lines) {
      if (L.frontMatter) { count += placeholders(L.text).length; continue; }
      count += placeholders(L.text).length;
      // raw values
      if (!isTokenSection(f.rel, L.section)) {
        for (const h of findRaw(L.text)) {
          if (isAllowed('raw-value', f.rel, L.section)) continue;
          add('raw-value', 'error', f.rel, L.n, `raw ${h.kind === 'color-fn' ? 'color' : h.kind} value "${h.value}" in ${L.section || 'the intro'} (raw values belong only in core.md §13 and tokens_file)`, suggestFor(ctx, idx, h, false), { value: h.value });
        }
      }
      // token refs
      for (const m of L.text.matchAll(REF_RE)) {
        const p = m[1];
        if (LITERAL_REFS.has(p) || refExists(ctx, p)) continue;
        if (/^[a-z_]+$/.test(p)) continue;
        const miss = missingRange(ctx, p);
        const dym = didYouMean(p, ctx.flat.keys());
        add('unresolved-token', 'error', f.rel, L.n, `{${p}} does not resolve in ${ctx.tokensRel}${miss ? ` (missing ${miss.join(', ')})` : ''}`, dym.length ? `did you mean ${dym.map(ref).join(', ')}? Otherwise add the token to §13 and ${ctx.tokensRel}` : `add the token to §13 and ${ctx.tokensRel}, or log it in §14.4 as proposed`, { value: `{${p}}` });
      }
    }
    phPerFile[f.rel] = count;
    totalPh += count;
  }

  // ---- ownership-overlap ----
  const owners = new Map(); // § -> [file]
  for (const f of ctx.files.values()) for (const s of (Array.isArray(f.fm.owns) ? f.fm.owns : [])) {
    const k = String(s); owners.set(k, [...(owners.get(k) || []), f.rel]);
  }
  for (const [s, fs_] of owners) if (fs_.length > 1) add('ownership-overlap', 'error', fs_[1], 1, `${s} is owned by ${fs_.join(' and ')}`, `keep ${s} in one file's front matter "owns" (see design.md §0.3) and reference it elsewhere with → ${s}`);
  const mapTable = ctx.index && table(ctx.index.analysis, '§');
  if (mapTable) for (const r of mapTable.rows) {
    const sec = r.cells[0];
    const fileCell = r.cells[2];
    const file = fileCell === 'this file' ? ctx.config.index : (fileCell.match(/\(([^)]+)\)/)?.[1] ?? `design/${fileCell}`);
    const o = owners.get(sec) || [];
    if (o.length && !o.includes(file)) add('ownership-overlap', 'error', ctx.config.index, r.n, `§0.3 says ${sec} is owned by ${file}, but front matter says ${o.join(', ')}`, `make design.md §0.3 and the "owns" front matter agree`);
    if (!o.length) add('ownership-overlap', 'error', ctx.config.index, r.n, `${sec} is in the §0.3 map but no file's front matter "owns" it`, `add ${sec} to "owns" in ${file}`);
  }
  for (const f of ctx.files.values()) {
    const owns = (f.fm.owns || []).map(String);
    for (const L of f.analysis.lines) {
      const h = L.text.match(/^##\s+§?((?:M\d+|\d+))\b/);
      if (h && !L.fence && !owns.includes(`§${h[1]}`) && owners.has(`§${h[1]}`)) add('ownership-overlap', 'error', f.rel, L.n, `heading defines §${h[1]}, which ${owners.get(`§${h[1]}`).join(', ')} owns`, `move this content to ${owners.get(`§${h[1]}`)[0]} and leave "→ §${h[1]}" here`);
    }
  }

  // ---- tokens-sync: core.md §13 yaml vs tokens_file ----
  if (ctx.core) {
    const blk = yamlBlockKeys(ctx.core.analysis, 'tokens', ['tokens', 'modes']);
    if (!blk?.tokens) add('tokens-sync', 'error', 'design/core.md', 1, '§13 has no ```yaml block starting with "tokens:"', 'restore the §13 tokens block');
    else {
      const seen = new Set();
      const compare = (yv, mode, p, line) => {
        const t = ctx.loaded.tokens.get(p);
        seen.add(p);
        if (!t) { add('tokens-sync', 'error', 'design/core.md', line, `§13 defines ${p}, but ${ctx.tokensRel} has no such token`, `add "${p.split('.').pop()}" under ${p.split('.').slice(0, -1).join('.')} in ${ctx.tokensRel}, or remove it from §13`); return; }
        const v = String(unwrap(yv) ?? '');
        if (/^TBD|…|\.\.\./.test(v) || v === '') return; // not filled yet
        const e = ctx.flat.get(p);
        const raw = mode ? t.modes[mode] : (t.modes.light ?? t.value);
        if (typeof raw === 'string' && /^\{/.test(raw)) { if (v !== raw) add('tokens-sync', 'error', 'design/core.md', line, `${p}: §13 says "${v}", ${ctx.tokensRel} aliases "${raw}"`, 'make them the same alias'); return; }
        const css = mode ? e.css[mode] : (e.css.light ?? e.css.base);
        if (!sameValue(e.type, v, css)) add('tokens-sync', 'error', 'design/core.md', line, `${p}${mode ? ` (${mode})` : ''}: §13 says "${v}", ${ctx.tokensRel} has "${css}"`, `change one so both say the same value (§13 is the source; then run node design-build/tokens-css.mjs)`, { value: v });
      };
      const walk = (node, pre, mode, lines, lp) => {
        if (node && typeof node === 'object' && !Array.isArray(node)) { for (const [k, v] of Object.entries(node)) walk(v, pre ? `${pre}.${k}` : k, mode, lines, lp ? `${lp}.${k}` : k); return; }
        compare(node, mode, pre, lines.get(lp));
      };
      walk(blk.tokens.value, '', null, blk.tokens.lines, 'tokens');
      for (const t of ctx.loaded.tokens.values()) if (!seen.has(t.path)) add('tokens-sync', 'error', ctx.tokensRel, t.line, `${t.path} is in ${ctx.tokensRel} but not in core.md §13`, `add it to the §13 tokens block, or delete it from ${ctx.tokensRel}`);
      const dark = blk.modes?.value || {};
      for (const [m, tree] of Object.entries(dark)) {
        const seenM = new Set();
        const w2 = (node, pre, lp) => {
          if (node && typeof node === 'object' && !Array.isArray(node)) { for (const [k, v] of Object.entries(node)) w2(v, pre ? `${pre}.${k}` : k, `${lp}.${k}`); return; }
          seenM.add(pre); compare(node, m, pre, blk.modes.lines.get(lp));
        };
        w2(tree, '', `modes.${m}`);
        for (const t of themed) if (t.modes[m] !== undefined && !seenM.has(t.path) && JSON.stringify(t.modes[m]) !== JSON.stringify(t.modes.light ?? t.value))
          add('tokens-sync', 'error', ctx.tokensRel, t.line, `${t.path} has a different ${m} value in ${ctx.tokensRel} but §13 modes.${m} doesn't list it`, `add ${t.path.split('.').pop()}: "${ctx.flat.get(t.path).css[m]}" under §13 modes.${m}`);
      }
    }
  }

  // ---- tokens-css-stale ----
  try {
    const gen = generate(root);
    for (const [f, c] of [['design-build/preview/tokens.css', gen.css], ['design-build/preview/tokens.js', gen.js], ['design-build/preview/tokens.mjs', gen.mjs]]) {
      const abs = path.join(root, f);
      if (!fs.existsSync(abs)) add('tokens-css-stale', 'error', f, 1, `${f} is missing`, 'run: node design-build/tokens-css.mjs');
      else if (fs.readFileSync(abs, 'utf8') !== c) add('tokens-css-stale', 'error', f, 1, `${f} is out of date with ${ctx.tokensRel}`, 'run: node design-build/tokens-css.mjs (never hand-edit generated files)');
    }
  } catch (e) { add('tokens-css-stale', 'error', 'design-build/tokens-css.mjs', 1, `could not generate tokens.css: ${e.message}`, 'fix tokens_file first'); }

  // ---- contrast ----
  const pr = pairingResults(ctx);
  if (!pr.length && ctx.core) add('contrast', 'error', 'design/core.md', 1, '§4 has no pairings yaml block', 'restore the §4 "pairings:" block');
  for (const p of pr) {
    for (const t of [p.fg, p.bg]) if (!ctx.flat.has(t)) add('contrast', 'error', 'design/core.md', p.line, `pairing uses {${t}}, which is not a token`, `use an existing color token${didYouMean(t, ctx.flat.keys()).length ? `, e.g. ${didYouMean(t, ctx.flat.keys()).map(ref).join(', ')}` : ''}`);
    for (const [m, r] of Object.entries(p.modes)) {
      if (!r || r.pass) continue;
      const s = suggestPassingColor(r.fg, r.bg, p.target);
      const o = s && srgbToOklch(s.color);
      add('contrast', 'error', 'design/core.md', p.line, `{${p.fg}} on {${p.bg}} is ${r.ratio.toFixed(2)}:1 in ${m} mode; ${p.size} needs ${p.target}:1 (WCAG 1.4.3 / 1.4.11)`,
        s ? `change ${p.fg}${m === 'base' ? '' : ` (${m})`} from ${toHex(r.fg)} to ${toHex(s.color)} = oklch(${o.L.toFixed(3)} ${o.C.toFixed(3)} ${o.H.toFixed(1)}) → ${s.ratio.toFixed(2)}:1, in both §13 and ${ctx.tokensRel}` : `change the background {${p.bg}}; no lightness of the foreground reaches ${p.target}:1`, { value: `${r.ratio.toFixed(2)}:1`, mode: m });
    }
  }

  // ---- seed-cap ----
  if (ctx.index) {
    const sb = yamlBlock(ctx.index.analysis, 'seeds');
    if (sb?.value) for (const [g, list] of Object.entries(sb.value)) if (Array.isArray(list) && list.length > C.seed_group_max)
      add('seed-cap', 'error', ctx.config.index, sb.lines.get(`seeds.${g}`), `seed group "${g}" has ${list.length} entries (max ${C.seed_group_max}, §16.2 seed_rules)`, `drop the weakest ${list.length - C.seed_group_max} or split the group by purpose`);
  }

  // ---- kickstart-sync ----
  if (C.kickstart_sync) {
    const block = (f) => { try { return fs.readFileSync(path.join(root, f), 'utf8').match(/```text\n[\s\S]*?\n```/)?.[0] ?? null; } catch { return null; } };
    const a = block(C.kickstart_sync.source), b = block(C.kickstart_sync.copy);
    if (a && b && a !== b) {
      const al = a.split('\n'), bl = b.split('\n');
      const i = al.findIndex((l, k) => l !== bl[k]);
      const start = fs.readFileSync(path.join(root, C.kickstart_sync.copy), 'utf8').split('\n').indexOf('```text') + 1;
      add('kickstart-sync', 'error', C.kickstart_sync.copy, start + i, `the kickstart block differs from ${C.kickstart_sync.source} (first difference: "${(bl[i] ?? '').slice(0, 60)}")`, `copy the \`\`\`text block from ${C.kickstart_sync.source} into ${C.kickstart_sync.copy} unchanged`);
    }
  }

  // ---- code files ----
  const pcfg = projectConfig(root);
  const app = appCodeTargets(where, pcfg);
  const excludeNames = [...new Set([...C.exclude_dirs, ...APP_EXCLUDE])];
  const ownFiles = C.code_dirs.flatMap((d) => walkFiles(path.join(root, d), C.code_extensions, C.exclude_dirs));
  const appFiles = app.targets.flatMap((d) => walkFiles(d, C.code_extensions, excludeNames, app.exclude));
  const srcFiles = (opts.src || []).flatMap((d) => walkFiles(path.resolve(d), C.code_extensions, C.exclude_dirs));
  const generated = new Set(C.generated_files.map((f) => path.join(root, f)));
  const codeFiles = [...new Set([...ownFiles, ...appFiles, ...srcFiles])].filter((f) => !generated.has(f));
  const bpPx = new Map(idx.dims.filter((d) => /^(breakpoint|viewport)\./.test(d.path)).map((d) => [d.px, d.path]));
  const varNames = new Map([...ctx.flat.keys()].map((p) => [varName(p), p]));

  // role slots from §4 table
  const neverSlots = new Map(); // token path -> Set(slot)
  const roleTable = ctx.core && table(ctx.core.analysis, 'Role');
  if (roleTable) {
    const words = C.role_slot_words;
    for (const r of roleTable.rows) {
      const toks = []; let last = null;
      for (const m of r.cells[1].matchAll(/\{([^}]+)\}|`\.([a-z0-9-]+)`|\/\s*\.([a-z0-9-]+)/g)) {
        if (m[1]) { last = m[1]; toks.push(m[1]); } else if (last) toks.push(last.replace(/\.[^.]+$/, '.' + (m[2] || m[3])));
      }
      const never = (r.cells[3] || '').toLowerCase().split(/[,;/]|\band\b/).map((s) => s.trim());
      const slots = new Set(Object.entries(words).filter(([, ws]) => never.some((n) => ws.includes(n))).map(([s]) => s));
      if (!slots.size) continue;
      for (const t of toks) {
        const expanded = t.endsWith('.*') ? [...ctx.flat.keys()].filter((k) => k.startsWith(t.slice(0, -1))) : t.match(/\.\d+\.\.\d+$/) ? (() => { const [, b, a, z] = t.match(/^(.*)\.(\d+)\.\.(\d+)$/); return Array.from({ length: z - a + 1 }, (_, i) => `${b}.${+a + i}`); })() : [t];
        for (const e of expanded) neverSlots.set(e, new Set([...(neverSlots.get(e) || []), ...slots]));
      }
    }
  }
  const slotOfProp = (prop) => Object.entries(SLOT_PROPS).find(([, ps]) => ps.includes(prop))?.[0];
  const roleMsg = (p, slot) => {
    const okay = [...neverSlots.keys()].filter((k) => !neverSlots.get(k).has(slot) && k.split('.')[1] !== p.split('.')[1]);
    const alt = slot === 'background' ? ['color.surface.default', 'color.surface.raised', 'color.surface.inverse'] : slot === 'foreground' ? ['color.text.primary', 'color.text.secondary', 'color.text.inverse'] : ['color.focus', 'color.text.secondary'];
    return alt.filter((a) => ctx.flat.has(a) && !(neverSlots.get(a)?.has(slot))).concat(okay).slice(0, 3);
  };

  // avoid_defaults
  const avoid = ctx.core ? yamlBlock(ctx.core.analysis, 'avoid_defaults') : null;
  const avoidList = (avoid?.value || []).map((a, i) => ({ ...a, line: avoid.lines.get(`avoid_defaults.${i}`) }));
  const active = new Map(avoidList.filter((a) => a.checked === 'lint' && !String(a.justified ?? '').trim()).map((a) => [a.id, a]));
  const justifiedSkip = avoidList.filter((a) => String(a.justified ?? '').trim());
  const fp = (id, file, line, message, fix, value) => { if (active.has(id)) add('avoid-default', 'error', file, line, `${id}: ${message}`, `${fix}. Or, if §1 truly calls for it, the user writes the reason in core.md §2 avoid_defaults → ${id}.justified (line ${active.get(id).line}). Don't just swap to the next default.`, { value }); };
  const defaultFonts = new Set(C.default_fonts);
  const firstFamily = (v) => String(v).split(',')[0].trim().replace(/^["']|["']$/g, '').toLowerCase();
  for (const k of ['font.family.heading', 'font.family.body']) {
    const e = ctx.flat.get(k);
    if (e?.families && defaultFonts.has(String(e.families[0]).toLowerCase())) fp('sole-default-font', ctx.tokensRel, e.line, `${k} leads with "${e.families[0]}", a default AI/template font`, 'pick a family that expresses the §1 personality (see §16.2 typography seeds) and update §13 and tokens_file', e.families[0]);
  }
  const colorOf = (s) => {
    const v = s.match(/var\((--[\w-]+)/);
    if (v && varNames.has(v[1])) return ctx.flat.get(varNames.get(v[1])).color.light ?? ctx.flat.get(varNames.get(v[1])).color.base;
    return parseColor(s.trim().split(/\s+(?=[\d.]+%)/)[0]);
  };
  const isPurpleBlue = (stops) => {
    const ch = stops.map((s) => srgbToOklch(s)).filter((o) => o.C >= 0.08);
    return ch.length >= 2 && ch.every((o) => o.H >= 235 && o.H <= 335) && ch.some((o) => o.H >= 285);
  };
  const gradientStops = (val) => {
    const m = val.match(/(?:linear|radial|conic)-gradient\(([\s\S]*)\)/);
    if (!m) return null;
    const parts = []; let depth = 0, cur = '';
    for (const c of m[1]) { if (c === '(') depth++; if (c === ')') depth--; if (c === ',' && depth === 0) { parts.push(cur); cur = ''; } else cur += c; }
    parts.push(cur);
    return parts.map(colorOf).filter(Boolean);
  };

  const inv = ctx.inventory;
  const comps = new Map();
  if (inv) for (const c of inv.components || []) for (const n of [c.name, ...(c.aliases || [])]) comps.set(n.toLowerCase().replace(/[-_\s]/g, ''), c);
  const ignTags = new Set(inv?.ignore?.tags || []);
  const ignProps = new Set(inv?.ignore?.props || []);
  const normName = (n) => n.toLowerCase().replace(/[-_\s]/g, '');
  if (!inv) add('unknown-component', 'error', ctx.inventoryRel, 1, `${ctx.inventoryRel} is missing or not valid JSON`, 'write it in KICKSTART Step 2 (see design.md §16.1)');

  // §M1.1 components vs inventory
  const m1 = ctx.files.get('design/digital-product.md');
  const compTable = m1 && table(m1.analysis, 'Component');
  if (inv && compTable) for (const r of compTable.rows) {
    for (const name of r.cells[0].split('/').map((s) => s.trim()).filter(Boolean)) {
      if (/^\{\{/.test(name)) continue;
      const c = comps.get(normName(name));
      if (!c) { add('unknown-component', 'error', 'design/digital-product.md', r.n, `§M1.1 lists "${name}", which is not in ${ctx.inventoryRel}`, `reuse an existing component${didYouMean(name, (inv.components || []).map((x) => x.name)).length ? ` (did you mean ${didYouMean(name, inv.components.map((x) => x.name)).join(', ')}?)` : ''}; if the user agreed to a new one, add it to inventory.json with status "planned"`, { value: name }); continue; }
      const vars = (r.cells[1] || '').replace(/\{\{.*?\}\}/g, '').split(',').map((s) => s.trim()).filter(Boolean);
      for (const v of vars) if (!(c.variants || []).includes(v)) add('unknown-component', 'error', 'design/digital-product.md', r.n, `§M1.1 gives ${c.name} the variant "${v}", which inventory.json doesn't list`, `use one of: ${(c.variants || []).join(', ') || '(none listed)'}; or extend ${c.name} in inventory.json with the user's agreement`, { value: v });
    }
  }

  let fileCount = 0;
  for (const abs of codeFiles) {
    fileCount++;
    const text = fs.readFileSync(abs, 'utf8');
    const f = rel(ctx, abs);
    const lines = text.split('\n');
    const ext = path.extname(abs).toLowerCase();
    const isMarkup = ['.html', '.htm', '.jsx', '.tsx', '.vue', '.svelte', '.astro'].includes(ext);
    const localVars = new Set([...text.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
    // raw values + var() refs, line by line
    lines.forEach((ln, i) => {
      const n = i + 1;
      const noComment = ln.replace(/\/\*.*?\*\/|<!--.*?-->/g, (c) => ' '.repeat(c.length)).replace(/(^|\s)\/\/.*$/, '');
      const mq = noComment.match(/@(?:media|container)\b[^{]*/);
      const mqEnd = mq ? mq.index + mq[0].length : -1;
      for (const h of findRaw(noComment)) {
        if (isAllowed('raw-value', f, null)) continue;
        if (mq && h.index >= mq.index && h.index < mqEnd && h.kind === 'px') {
          // CSS variables can't be used in media queries, so a px value there is fine when it IS a breakpoint token.
          if (bpPx.has(Math.abs(parseFloat(h.value)))) continue;
          add('raw-value', 'error', f, n, `media/container query width "${h.value}" is not a breakpoint token`, `use a breakpoint from §M1.3: ${[...bpPx].sort((a, b) => a - b).map((v) => `${v}px (${bpPx.get(v)})`).join(', ') || '(none defined)'}; CSS variables can't go in a media query, so write the token's px value. Or add the breakpoint to §13 and tokens_file`, { value: h.value });
          continue;
        }
        add('raw-value', 'error', f, n, `raw ${h.kind === 'color-fn' ? 'color' : h.kind} value "${h.value}"`, suggestFor(ctx, idx, h, true, slotAt(noComment, h.index)), { value: h.value });
      }
      for (const m of noComment.matchAll(/var\(\s*(--[\w-]+)/g)) {
        if (varNames.has(m[1]) || localVars.has(m[1])) continue;
        const dym = didYouMean(m[1], [...varNames.keys(), ...localVars]);
        add('unresolved-token', 'error', f, n, `var(${m[1]}) is not a token or a variable defined in this file`, dym.length ? `did you mean ${dym.map((d) => `var(${d})`).join(', ')}?` : `use a token variable from preview/tokens.css (generated from ${ctx.tokensRel})`, { value: `var(${m[1]})` });
      }
      // Tailwind-style utility classes on role tokens
      for (const cm of noComment.matchAll(/\bclass(?:Name)?\s*=\s*["'`{]([^"'`}]*)/g)) for (const cls of cm[1].split(/\s+/)) {
        const tw = cls.match(/^(?:[\w-]+:)*(bg|text|fill|stroke|border|outline|ring|from|via|to)-([a-z][a-z0-9-]*)$/);
        if (!tw) continue;
        const p = varNames.get(`--color-${tw[2]}`);
        const slot = TW_SLOT[tw[1]];
        if (p && neverSlots.get(p)?.has(slot)) add('role-slot', 'error', f, n, `"${cls}" uses {${p}} as a ${slot}; §4 says never use it for ${[...neverSlots.get(p)].join(', ')}`, `use ${roleMsg(p, slot).map((a) => `${tw[1]}-${varName(a).slice(8)}`).join(' or ')} instead`, { value: cls });
      }
      // emoji used as icons
      if (isMarkup && /\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F/u.test(noComment.replace(/<[^>]*>/g, ' '))) {
        const e = noComment.match(/\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F/u)[0];
        fp('emoji-icons', f, n, `emoji "${e}" in UI markup`, 'use an icon from the §8 set (inline SVG or the icon component) with an aria-label or visually hidden text', e);
      }
      if (/\bbackdrop-blur\b/.test(noComment)) fp('glassmorphism', f, n, 'backdrop-blur utility (frosted glass)', `use a solid {color.surface.raised} with {shadow.2} for depth`, 'backdrop-blur');
      for (const cm of noComment.matchAll(/<(button|a)\b[^>]*class(?:Name)?=["'][^"']*\brounded-full\b/g)) fp('pill-buttons', f, n, `rounded-full on <${cm[1]}>`, 'use rounded-[var(--radius-md)] (a radius token chosen in §M1.4)', 'rounded-full');
      const hm = noComment.match(/<h([1-3])\b[^>]*>[^<]*<(em|i|span)\b[^>]*(style="[^"]*\bcolor\s*:|class="[^"]*\btext-(?!left|right|center|justify|balance|pretty|wrap|nowrap)\w)/);
      if (hm) fp('colored-italic-heading', f, n, `colored <${hm[2]}> inside <h${hm[1]}>`, 'set the whole heading in one color from §4; use weight or size from §5 for emphasis', `<h${hm[1]}><${hm[2]}>`);
    });

    // declarations: role slots, fingerprints
    const decls = declarations(text);
    const bySelector = new Map();
    for (const d of decls) {
      const key = `${d.selector}@${d.inline ? d.line : ''}`;
      bySelector.set(key, [...(bySelector.get(key) || []), d]);
      const slot = slotOfProp(d.prop);
      if (slot) for (const m of d.value.matchAll(/var\(\s*(--[\w-]+)/g)) {
        const p = varNames.get(m[1]);
        if (p && neverSlots.get(p)?.has(slot)) add('role-slot', 'error', f, d.line, `${d.prop}: var(${m[1]}) uses {${p}} as a ${slot}; §4 "Never use for" says ${[...neverSlots.get(p)].join(', ')}`, `use ${roleMsg(p, slot).map((a) => `var(${varName(a)})`).join(' or ')} for ${d.prop}`, { value: `${d.prop}: var(${m[1]})` });
      }
      const stops = /gradient\(/.test(d.value) ? gradientStops(d.value) : null;
      if (stops && isPurpleBlue(stops)) fp('purple-blue-gradient', f, d.line, `purple-to-blue gradient in ${d.prop}`, 'use a flat surface color from §4, or a gradient built only from brand tokens that §2 asks for', d.value.slice(0, 60));
      if (d.prop === 'backdrop-filter' || d.prop === '-webkit-backdrop-filter') if (/blur\(/.test(d.value)) fp('glassmorphism', f, d.line, `${d.prop}: ${d.value}`, 'use a solid {color.surface.raised} with {shadow.2} for depth', d.value);
    }
    for (const [key, ds] of bySelector) {
      const sel = key.split('@')[0];
      const get = (p) => ds.find((d) => d.prop === p);
      const radius = get('border-radius');
      if (radius && /button|btn|cta/i.test(sel)) {
        const big = /var\(--radius-full\)/.test(radius.value) || (toPx(radius.value.trim()) ?? 0) >= 999 || /^50%$/.test(radius.value.trim());
        if (big) fp('pill-buttons', f, radius.line, `fully rounded buttons (${sel} { border-radius: ${radius.value} })`, 'use var(--radius-sm) or var(--radius-md), as chosen in §M1.4', radius.value);
      }
      const tt = get('text-transform'), ff = get('font-family');
      if (tt && /uppercase/.test(tt.value) && ff && (/mono/i.test(ff.value))) fp('mono-eyebrow', f, tt.line, `uppercase monospace label (${sel})`, 'set labels in the body family from §5 at {font.size.caption}, sentence case', sel);
      const col = get('color');
      if (col && /h[1-3][^,{]*\s(em|i|span)\b/.test(sel)) fp('colored-italic-heading', f, col.line, `colored word in a heading (${sel})`, 'set the whole heading in one §4 color; use weight from §5 for emphasis', sel);
      if (ff) {
        const fam = firstFamily(ff.value);
        if (!/var\(/.test(ff.value) && defaultFonts.has(fam)) fp('sole-default-font', f, ff.line, `font-family leads with "${fam}"`, 'use var(--font-family-body) or var(--font-family-heading)', fam);
      }
    }

    // components: data-component in HTML, PascalCase in JSX/Vue/Svelte
    if (inv) {
      for (const m of text.matchAll(/<([a-zA-Z][\w.-]*)\b([^>]*?)\bdata-component\s*=\s*["']([^"']+)["']([^>]*)>/g)) {
        const n = text.slice(0, m.index).split('\n').length;
        const c = comps.get(normName(m[3]));
        if (!c) { add('unknown-component', 'error', f, n, `data-component="${m[3]}" is not in ${ctx.inventoryRel}`, `reuse one of: ${didYouMean(m[3], (inv.components || []).map((x) => x.name)).join(', ') || (inv.components || []).map((x) => x.name).join(', ')}; a new component needs the user's agreement and an inventory.json entry`, { value: m[3] }); continue; }
        const v = (m[2] + m[4]).match(/\bdata-variant\s*=\s*["']([^"']+)["']/);
        if (v && !(c.variants || []).includes(v[1])) add('unknown-component', 'error', f, n, `${c.name} has no variant "${v[1]}"`, `use one of: ${(c.variants || []).join(', ')}`, { value: v[1] });
      }
      if (['.jsx', '.tsx', '.vue', '.svelte', '.astro'].includes(ext)) {
        const importFrom = new Map();
        for (const m of text.matchAll(/import\s+(?:type\s+)?(?:(\w+)\s*,?\s*)?(?:\{([^}]+)\})?\s*from\s*["']([^"']+)["']/g)) for (const n of [m[1], ...(m[2] || '').split(',').map((s) => s.trim().split(/\s+as\s+/).pop())].filter(Boolean)) importFrom.set(n, m[3]);
        const imported = new Set(importFrom.keys());
        // Components imported from a package (react-router, a UI kit…) are not this project's components, unless
        // that package is the inventory's "library". Local imports (./, ../, @/, ~/) and unimported tags are checked.
        const fromPackage = (tag) => { const s = importFrom.get(tag.split('.')[0]); return !!s && !/^(\.|@\/|~\/|#)/.test(s) && !(inv.library && (s === inv.library || s.startsWith(inv.library + '/'))); };
        for (const m of text.matchAll(/<([A-Z][\w]*(?:\.[A-Z]\w*)?)\b([^>]*?)\/?>/g)) {
          const tag = m[1];
          if (ignTags.has(tag) || fromPackage(tag)) continue;
          const n = text.slice(0, m.index).split('\n').length;
          const c = comps.get(normName(tag)) || comps.get(normName(tag.split('.').pop()));
          if (!c) { add('unknown-component', 'error', f, n, `<${tag}> is not in ${ctx.inventoryRel}${imported.has(tag) ? '' : ' (and is not imported)'}`, `reuse ${didYouMean(tag, (inv.components || []).map((x) => x.name)).join(' or ') || 'an existing component'}; if it really exists, add it to inventory.json with its import path (KICKSTART Step 2)`, { value: tag }); continue; }
          for (const pm of m[2].matchAll(/([a-zA-Z][\w-]*)\s*=/g)) {
            const prop = pm[1];
            if (ignProps.has(prop) || /^(on[A-Z]|aria-|data-)/.test(prop) || (c.props || []).includes(prop)) continue;
            add('unknown-component', 'error', f, n, `<${tag}> has no prop "${prop}" in inventory.json`, `use one of: ${(c.props || []).join(', ') || '(none)'}; look it up in ${c.import || 'the component source'} before adding it`, { value: prop });
          }
          const vm = m[2].match(/\bvariant\s*=\s*["']([^"']+)["']/);
          if (vm && !(c.variants || []).includes(vm[1])) add('unknown-component', 'error', f, n, `<${tag} variant="${vm[1]}"> is not a listed variant`, `use one of: ${(c.variants || []).join(', ')}`, { value: vm[1] });
        }
      }
    }
  }
  // ---- ui-inventory (per-screen component use + one doc per component; design.md §0.5, §16 Phase 2/6) ----
  if (inv) {
    const UI = (m, fix, file = ctx.inventoryRel, line = 1, extra = {}) => add('ui-inventory', 'error', file, line, m, fix, extra);
    const byName = (n) => comps.get(normName(n || ''));
    const regen = 'run node design-system/design-build/ui-inventory.mjs';
    const readRel = (rel) => { const f = path.join(root, rel); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null; };
    if (inv.screens !== undefined && (typeof inv.screens !== 'object' || Array.isArray(inv.screens))) UI('inventory.json "screens" must be an object keyed by screen id', 'write "screens": { "<id>": { "name", "route", "purpose", "source", "components": [...] } } (ui-inventory/templates/screen.md)');
    // screens
    for (const [id, s] of screensOf(inv)) {
      for (const k of ['name', 'route', 'purpose']) if (!s[k] || typeof s[k] !== 'string') UI(`screen "${id}" has no ${k}`, `add "${k}" to screens.${id} in inventory.json`);
      if (!Array.isArray(s.components) || !s.components.length) { UI(`screen "${id}" lists no components`, `list every inventory component the screen renders with its variants and states (screens.${id}.components)`); continue; }
      const listed = new Set();
      for (const u of s.components) {
        const c = byName(u.component);
        if (!c) { UI(`screen "${id}" uses "${u.component}", which is not in ${ctx.inventoryRel}`, `reuse ${didYouMean(u.component || '', (inv.components || []).map((x) => x.name)).join(' or ') || 'an existing component'}; a new one needs the user's agreement, a doc and a reference search first (§0.5)`, ctx.inventoryRel, 1, { value: u.component }); continue; }
        if (u.component !== c.name) UI(`screen "${id}" names "${u.component}"; use the inventory name "${c.name}"`, `write "component": "${c.name}"`);
        listed.add(c.name);
        for (const v of u.variants || []) if (!(c.variants || []).includes(v)) UI(`screen "${id}" uses ${c.name} variant "${v}", which inventory.json doesn't list`, `use one of: ${(c.variants || []).join(', ') || '(none)'}`, ctx.inventoryRel, 1, { value: v });
        for (const st of u.states || []) if (!STATES.includes(st)) UI(`screen "${id}" gives ${c.name} the state "${st}", which is not a §M1.2 state`, `use: ${STATES.join(', ')}`, ctx.inventoryRel, 1, { value: st });
      }
      // the screen's source files must render exactly the listed components
      for (const rel of s.source || []) {
        const abs = resolveSource(where.project, root, rel);
        if (!abs) { UI(`screen "${id}" source "${rel}" does not exist`, 'give the path relative to the project root (or the design-system folder)'); continue; }
        const text = fs.readFileSync(abs, 'utf8');
        const found = new Set();
        for (const m of text.matchAll(/\bdata-component\s*=\s*["']([^"']+)["']/g)) { const c = byName(m[1]); if (c) found.add(c.name); }
        for (const m of text.matchAll(/<([A-Z]\w*)\b/g)) { const c = byName(m[1]); if (c && !ignTags.has(m[1])) found.add(c.name); }
        const fr = path.relative(where.project, abs).split(path.sep).join('/');
        for (const n of found) if (!listed.has(n)) UI(`${fr} renders ${n}, but screen "${id}" doesn't list it`, `add { "component": "${n}", "variants": [...], "states": [...] } to screens.${id}.components`, ctx.inventoryRel, 1, { value: n });
        if ((s.source || []).length === 1) for (const n of listed) if (!found.has(n)) UI(`screen "${id}" lists ${n}, but ${fr} doesn't render it`, `remove it from screens.${id}.components, or add the source file that renders it to screens.${id}.source`, ctx.inventoryRel, 1, { value: n });
      }
    }
    // docs: one per existing component and per component on a screen; generated blocks in sync
    const exp = uiExpected(root, inv);
    if (readRel(exp.index.rel) !== exp.index.text) UI(`${exp.index.rel} is missing or out of date`, regen, exp.index.rel);
    for (const b of exp.blocks) {
      const text = readRel(b.rel);
      if (text === null) { UI(`${b.kind} "${b.name}" has no doc (${b.rel})`, `${regen} to create it from ${UI_DIR}/templates/${b.kind}.md, then fill it in${b.kind === 'component' ? ' after the per-component reference search (§16 Phase 2)' : ''}`, b.rel); continue; }
      if (blockOf(text) !== b.block) UI(`${b.rel}: the generated block is missing or out of date with inventory.json`, regen, b.rel);
      if (b.kind !== 'component') continue;
      const c = byName(b.name);
      const secs = new Map(); let cur = null;
      text.split('\n').forEach((l, i) => { const h = l.match(/^##\s+(.+?)\s*$/); if (h) { cur = h[1].replace(/’/g, "'"); secs.set(cur, { line: i + 1, body: [] }); } else if (cur) secs.get(cur).body.push(l); });
      const body = (h) => (secs.get(h)?.body || []).join('\n');
      for (const h of COMPONENT_HEADINGS) {
        if (!secs.has(h)) { UI(`${b.rel} has no "## ${h}" section`, `add it (see ${UI_DIR}/templates/component.md)`, b.rel); continue; }
        const t = body(h).replace(/<!--[\s\S]*?-->/g, '').trim();
        if (t.length < 20 || /\{\{/.test(t)) UI(`${b.rel} "## ${h}" is empty or still a template placeholder`, 'fill it in', b.rel, secs.get(h).line);
      }
      if (secs.has('Variants')) for (const v of c?.variants || []) if (!new RegExp(`\\b${v}\\b`).test(body('Variants'))) UI(`${b.rel} "## Variants" doesn't describe the variant "${v}"`, `describe ${v} (inventory.json lists it)`, b.rel, secs.get('Variants').line, { value: v });
      if (secs.has('States')) for (const st of DOC_STATES) if (!new RegExp(`\\b${st}\\b`, 'i').test(body('States'))) UI(`${b.rel} "## States" doesn't cover "${st}"`, `say what changes in ${st}, or why it doesn't apply`, b.rel, secs.get('States').line, { value: st });
      if (secs.has('References') && !/https?:\/\//.test(body('References'))) UI(`${b.rel} "## References" has no URL`, 'link the §16.2 seed pages you searched for this component and say how ours differs', b.rel, secs.get('References').line);
      if (secs.has('Usage') && !/```/.test(body('Usage'))) UI(`${b.rel} "## Usage" has no code snippet`, 'add the import path and a snippet', b.rel, secs.get('Usage').line);
    }
    // docs reference only tokens that exist, and no raw colors
    const uiRoot = path.join(root, UI_DIR);
    const docs = fs.existsSync(uiRoot) ? walkFiles(uiRoot, ['.md'], ['templates']) : [];
    for (const abs of docs) {
      const f = rel(ctx, abs);
      fs.readFileSync(abs, 'utf8').split('\n').forEach((ln, i) => {
        for (const m of ln.matchAll(REF_RE)) {
          const p = m[1];
          if (LITERAL_REFS.has(p) || refExists(ctx, p) || /^[a-z_]+$/.test(p)) continue;
          const dym = didYouMean(p, ctx.flat.keys());
          UI(`{${p}} is not a token in ${ctx.tokensRel}`, dym.length ? `did you mean ${dym.map(ref).join(', ')}?` : 'reference an existing token (design-build/preview/tokens.css lists them)', f, i + 1, { value: `{${p}}` });
        }
        for (const m of ln.matchAll(/var\(\s*(--[\w-]+)/g)) if (!varNames.has(m[1])) { const dym = didYouMean(m[1], [...varNames.keys()]); UI(`var(${m[1]}) is not a token variable`, dym.length ? `did you mean ${dym.map((d) => `var(${d})`).join(', ')}?` : 'use a variable from design-build/preview/tokens.css', f, i + 1, { value: `var(${m[1]})` }); }
        for (const h of findRaw(ln)) if (h.kind === 'hex' || h.kind === 'color-fn') UI(`raw color "${h.value}" in a component doc`, 'name the token instead ({color.…})', f, i + 1, { value: h.value });
      });
    }
  }

  for (const j of justifiedSkip) add('avoid-default', 'info', 'design/core.md', j.line, `${j.id} is allowed: "${j.justified}"`, 'none (justified in §2)');

  // ---- tokens-import (Phase 6: the app must load the generated tokens) ----
  if (phase >= 6 && appFiles.length && !appFiles.some((a) => /tokens\.css['"]|tokens\.css\)|tokens\.mjs['"]/.test(fs.readFileSync(a, 'utf8'))))
    add('tokens-import', 'error', path.relative(root, app.targets[0] || where.project) || '.', 1, `no app file imports the generated tokens (${app.how})`, `import the generated tokens once in the app entry, e.g. in ${path.relative(where.project, app.targets[0] || where.project).split(path.sep).join('/') || '.'}/main.tsx: import '${(path.relative(app.targets[0] || where.project, path.join(root, 'design-build/preview/tokens.css')).split(path.sep).join('/')).replace(/^(?!\.)/, './')}' (design.md §16 Phase 6 step 1)`);

  // ---- completion ----
  const tp = C.template_placeholders;
  const enabledFiles = [...ctx.files.values()].filter((f) => {
    if (f.rel === C.index || f.rel === 'design/core.md') return true;
    const part = Object.values(ctx.index?.fm?.parts || {}).find((p) => p && p.file === f.rel);
    return part && part.enabled === true;
  });
  const remaining = enabledFiles.reduce((s, f) => s + (phPerFile[f.rel] || 0), 0);
  const initial = tp ? enabledFiles.reduce((s, f) => s + (tp[f.rel] || 0), 0) : remaining;
  const completion = initial ? Math.max(0, Math.min(1, 1 - remaining / initial)) : 1;
  const minC = parseMin(ctx) ?? C.completion_min;
  if (phase >= 4 && completion < minC) add('completion', 'error', C.index, 1, `completion is ${(completion * 100).toFixed(1)}% (${remaining} of ${initial} placeholders unfilled in enabled files); Phase 4 needs ${(minC * 100).toFixed(0)}%`, 'fill the remaining {{…}} from the brief and Phase 3 picks, or mark true unknowns {{TBD: reason}} and list them for the user');

  // ---- checklist-15 (info) ----
  const manual = [];
  if (ctx.index) for (const L of ctx.index.analysis.lines) if (inSection(L.section, '§15') && /^- \[ \]/.test(L.text) && !/\*\(auto/.test(L.text)) manual.push({ line: L.n, item: L.text.replace(/^- \[ \]\s*/, '') });
  for (const m of manual) add('checklist-15', 'info', C.index, m.line, `needs a person: ${m.item.replace(/\*\(.*?\)\*/g, '').trim()}`, 'check it by hand before delivery');

  // Report every path relative to the project root and every command so it runs from there.
  const toProject = (f) => path.relative(where.project, path.resolve(root, f)).split(path.sep).join('/') || '.';
  for (const x of findings) { x.file = toProject(x.file); x.message = fixHint(where, x.message); x.fix = fixHint(where, x.fix); }
  return { ctx, where, app, findings, completion, remaining, initial, phase, fileCount, appFileCount: appFiles.length, codeFiles: codeFiles.map((a) => path.relative(where.project, a).split(path.sep).join('/')), phPerFile };
}

function parseMin(ctx) {
  const b = ctx.index && yamlBlock(ctx.index.analysis, 'lint');
  const m = String(b?.value?.completion ?? '').match(/>=\s*([\d.]+)/);
  return m ? Number(m[1]) : null;
}

function sameValue(type, a, b) {
  const norm = (s) => String(s).toLowerCase().replace(/\b0px\b/g, '0').replace(/["']/g, '').replace(/\s*,\s*/g, ',').replace(/\s+/g, ' ').trim();
  if (type === 'color') { const x = parseColor(a), y = parseColor(b); return !!x && !!y && toHex(x) === toHex(y); }
  if (type === 'dimension') return toPx(a) !== null && toPx(a) === toPx(b);
  if (type === 'duration') return parseFloat(a) === parseFloat(b);
  if (type === 'number' || type === 'fontWeight') return Number(a) === Number(b);
  if (type === 'shadow') return norm(a).replace(/#([0-9a-f]{6})ff\b/g, '#$1') === norm(b);
  return norm(a) === norm(b);
}

// ---------- output ----------
export function format(res, baseline, opts) {
  const errors = res.findings.filter((f) => f.severity === 'error');
  const warnings = res.findings.filter((f) => f.severity === 'warning');
  const counts = {};
  for (const r of Object.keys(RULES)) counts[r] = errors.filter((e) => e.rule === r).length;
  let failing = errors;
  const rose = [], fell = [];
  if (baseline) {
    for (const [r, c] of Object.entries(counts)) {
      const b = baseline.counts?.[r] ?? 0;
      if (c > b) rose.push(r); else if (c < b) fell.push(`${r} ${b}→${c}`);
    }
    failing = errors.filter((e) => rose.includes(e.rule));
  }
  const ok = failing.length === 0;
  return { ok, phase: res.phase, summary: { errors: errors.length, failing: failing.length, warnings: warnings.length, info: res.findings.length - errors.length - warnings.length, counts, baseline: baseline ? baseline.counts : null, rules_over_baseline: rose, rules_under_baseline: fell, completion: Number(res.completion.toFixed(4)), placeholders_remaining: res.remaining, code_files: res.fileCount, app_code_files: res.appFileCount, project_root: res.where.project, app_code: res.app.how, pairings_checked: res.ctx.pairings.length, modes: res.ctx.loaded.modes, tokens: res.ctx.loaded.tokens.size }, errors, warnings, info: res.findings.filter((f) => f.severity === 'info') };
}

function main() {
  let opts;
  try { opts = parseArgs(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(2); }
  if (opts.help) { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 17).map((l) => l.replace(/^\/\/ ?/, '')).join('\n')); return; }
  const root = DS_ROOT;
  const baselineFile = path.join(root, 'design-build/lint-baseline.json');
  const res = lint({ ...opts, root, project: opts.root });
  const relP = (f) => path.relative(res.where.project, f).split(path.sep).join('/');
  if (opts.baseline) {
    const out = format(res, null, opts);
    fs.writeFileSync(baselineFile, JSON.stringify({ $comment: 'Written by lint.mjs --baseline. PROTECTED (design.md §0.5): only regenerate with the user\'s approval. Runs fail when a rule\'s error count rises above these.', created: new Date().toISOString(), commit: gitHead(root), counts: out.summary.counts }, null, 2) + '\n');
    console.log(`wrote ${relP(baselineFile)} (${out.summary.errors} existing errors baselined: ${Object.entries(out.summary.counts).filter(([, c]) => c).map(([r, c]) => `${r} ${c}`).join(', ') || 'none'}). From now on a rule's count may only go down.`);
    return;
  }
  const baseline = readJson(baselineFile, null);
  const out = format(res, baseline, opts);
  if (opts.record) recordCheck(root, 'lint', { status: out.ok ? 'pass' : 'fail', commit: gitHead(root), at: new Date().toISOString(), errors: out.summary.errors, warnings: out.summary.warnings });
  if (opts.json) { process.stdout.write(JSON.stringify(out, null, 2) + '\n'); process.exit(out.ok ? 0 : 1); }
  const show = (f, tag) => `${f.file}:${f.line}  ${tag} ${f.rule}  ${f.message}\n    → fix: ${f.fix}`;
  const failingSet = new Set(baseline ? out.summary.rules_over_baseline : Object.keys(RULES));
  for (const e of out.errors) console.log(show(e, failingSet.has(e.rule) ? 'error' : 'baselined'));
  for (const w of out.warnings) console.log(show(w, 'warning'));
  if (!opts.quiet) for (const i of out.info) console.log(`${i.file}:${i.line}  info ${i.rule}  ${i.message}`);
  const s = out.summary;
  console.log(`\napp code: ${res.app.how} · project root: ${res.where.project} (${res.where.how})`);
  console.log(`design lint: ${out.ok ? 'PASS' : 'FAIL'} — ${s.errors} error(s)${baseline ? ` (${s.failing} over baseline in: ${s.rules_over_baseline.join(', ') || 'none'})` : ''}, ${s.warnings} warning(s), ${s.info} info · ${s.tokens} tokens, ${s.modes.join('/')} modes, ${s.pairings_checked} pairings, ${s.code_files} code files (${s.app_code_files} app) · completion ${(s.completion * 100).toFixed(1)}% (phase ${out.phase}${out.phase < 4 ? ', enforced from phase 4' : ''})`);
  if (baseline && s.rules_under_baseline.length) console.log(`baseline: counts dropped (${s.rules_under_baseline.join(', ')}). Ask the user to lower the ceiling with \`${fixHint(res.where, 'node design-build/lint.mjs --baseline')}\` so the gain is locked in.`);
  process.exit(out.ok ? 0 : 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (e) { console.error(`lint.mjs internal error: ${e.stack || e.message}`); process.exit(2); }
}
