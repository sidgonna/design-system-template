// DESIGN.md (Google's format, version alpha), Tailwind v4 @theme, Tailwind v3 theme.extend, and Figma
// (Tokens Studio DTCG sets + a variables collection). Generated from tokens_file. Zero dependencies.
//
// The Google schema is one theme of colors, typography, rounded, spacing and components. It cannot hold
// modes, ramps or motion. Export writes that projection in the front matter, and writes tokens_file back
// unchanged inside a ```json tokens fence. Import returns that fence byte for byte. A DESIGN.md that has
// no fence converts through the Google schema only, and that schema round-trips.
//
//   node design-build/designmd.mjs                 write design-build/exports/*
//   node design-build/designmd.mjs --check         exit 1 if any output is stale, or the DESIGN.md has lint errors
//   node design-build/designmd.mjs lint [file]     Google-compatible lint (0 errors required; warnings do not fail)
//   node design-build/designmd.mjs import <file> --out <tokens.json>
import fs from 'node:fs';
import path from 'node:path';
import { loadContext } from './context.mjs';
import { parseYaml } from './yaml.mjs';
import { parseColor, parseDtcgColor, toHex, contrastRatio } from './color.mjs';
import { resolveValue, toCss } from './tokens.mjs';
import { formatJson } from './json-format.mjs';
import { TYPE_EXT } from './tokens-css.mjs';

export const OUTPUT_RELS = [
  'design-build/exports/DESIGN.md',
  'design-build/exports/tailwind.theme.css',
  'design-build/exports/tailwind.config.cjs',
  'design-build/exports/figma.tokens-studio.json',
  'design-build/exports/figma.variables.json',
];

const FENCE_LANG = '```json tokens\n';
const DIM = /^-?(?:\d+|\d*\.\d+)(px|em|rem)$/;
const REF = /^\{([^{}]+)\}$/;
const SECTIONS = [
  { id: 'overview', names: ['overview', 'brand & style'] },
  { id: 'colors', names: ['colors'] },
  { id: 'typography', names: ['typography'] },
  { id: 'layout', names: ['layout', 'layout & spacing'] },
  { id: 'elevation', names: ['elevation & depth', 'elevation'] },
  { id: 'shapes', names: ['shapes'] },
  { id: 'components', names: ['components'] },
  { id: 'dos', names: ["do's and don'ts", 'dos and donts'] },
];
const OMIT_OK = new Set(['colors', 'typography', 'spacing', 'rounded', 'components', 'overview', 'layout', 'elevation', 'shapes', 'dos']);
const SCHEMA_KEYS = ['version', 'name', 'description', 'omitted', 'colors', 'typography', 'rounded', 'spacing', 'components'];
const TYPE_FIELDS = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'fontFeature', 'fontVariation'];
// Google role → token path. A path that this system does not have is skipped.
const COLOR_ALIAS = [
  ['primary', 'color.brand.primary'],
  ['secondary', 'color.brand.secondary'],
  ['tertiary', 'color.accent'],
  ['neutral', 'color.text.secondary'],
  ['surface', 'color.surface.default'],
  ['on-surface', 'color.text.primary'],
  ['on-primary', 'color.on.primary'],
  ['on-secondary', 'color.on.secondary'],
  ['on-tertiary', 'color.on.accent'],
  ['error', 'color.semantic.error'],
  ['on-error', 'color.on.error'],
  ['success', 'color.semantic.success'],
  ['on-success', 'color.on.success'],
  ['warning', 'color.semantic.warning'],
  ['on-warning', 'color.on.warning'],
  ['info', 'color.semantic.info'],
  ['on-info', 'color.on.info'],
  ['border', 'color.border.default'],
  ['focus', 'color.focus'],
];

const normHead = (h) => String(h).trim().toLowerCase().replace(/[’']/g, "'");
const sectionId = (heading) => SECTIONS.find((s) => s.names.includes(normHead(heading)))?.id || null;
const round5 = (n) => Math.round(n * 1e5) / 1e5;
const cssDim = (v) => (v && typeof v === 'object' && 'unit' in v ? `${v.value}${v.unit}` : String(v));

export function brandLabel(fm) {
  const raw = String(fm?.brand_name ?? '').replace(/\{\{|\}\}/g, '').trim();
  if (!raw || raw === 'BRAND_NAME') return 'Design system';
  return raw;
}

function feelOf(text) {
  const m = String(text || '').match(/\*\*One-line feel:\*\*\s*(.+)/);
  if (!m) return '';
  const s = m[1].replace(/\*+/g, '').trim();
  if (/[{}]/.test(s) || s.includes('TODO' + '(intake)')) return '';
  return s;
}

function colorCss(flat, tokenPath, mode) {
  const entry = flat.get(tokenPath);
  if (!entry) return null;
  const css = entry.css[mode] || entry.css.base;
  return css || null;
}

function yamlKey(k) {
  const s = String(k);
  if (s === '' || /[:#{}[\],&*!|>'"%@`]|^\s|\s$|^[-?]/.test(s) || /^(true|false|null|~)$/i.test(s)) return JSON.stringify(s);
  return s;
}
function yamlScalar(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (v === null || v === undefined) return 'null';
  const s = String(v);
  if (s === '' || /[:#{}[\],&*!|>'"%@`]|^\s|\s$|^[-?]/.test(s) || /^(true|false|null|~)$/i.test(s) || /^-?\d+(\.\d+)?$/.test(s)) return JSON.stringify(s);
  return s;
}
function emitYaml(value, indent) {
  const lines = [];
  for (const [k, v] of Object.entries(value)) {
    const key = yamlKey(k);
    if (Array.isArray(v)) {
      lines.push(`${indent}${key}:`);
      for (const item of v) {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          const entries = Object.entries(item);
          if (!entries.length) { lines.push(`${indent}- {}`); continue; }
          lines.push(`${indent}- ${yamlKey(entries[0][0])}: ${yamlScalar(entries[0][1])}`);
          for (const [ik, iv] of entries.slice(1)) lines.push(`${indent}  ${yamlKey(ik)}: ${yamlScalar(iv)}`);
        } else lines.push(`${indent}- ${yamlScalar(item)}`);
      }
    } else if (v && typeof v === 'object') {
      lines.push(`${indent}${key}:`);
      lines.push(emitYaml(v, indent + '  '));
    } else lines.push(`${indent}${key}: ${yamlScalar(v)}`);
  }
  return lines.filter((l) => l !== '').join('\n');
}

/** Canonical DESIGN.md text. `tokensText`, when set, is embedded unchanged in a json fence. */
export function designMdFromParts({ meta, tokens, sections, tokensText = null }) {
  const fm = {};
  if (meta.version) fm.version = meta.version;
  fm.name = meta.name || 'Design system';
  if (meta.description) fm.description = meta.description;
  if (meta.omitted?.length) fm.omitted = meta.omitted;
  for (const key of ['colors', 'typography', 'rounded', 'spacing', 'components']) {
    if (tokens[key] && Object.keys(tokens[key]).length) fm[key] = tokens[key];
  }
  const yaml = emitYaml(fm, '');
  const body = (sections || []).filter((s) => sectionId(s.heading) || normHead(s.heading) !== 'token file').map((s) => `## ${s.heading}\n\n${String(s.body).trim()}\n`).join('\n');
  let fence = '';
  if (tokensText != null) {
    const text = tokensText.endsWith('\n') ? tokensText : `${tokensText}\n`;
    fence = `## Token file\n\nThis section is not a Google DESIGN.md section. Import reads the fence and writes it back unchanged.\n\n${FENCE_LANG}${text}\`\`\`\n`;
  }
  return `---\n${yaml}\n---\n\n# ${fm.name}\n\n${body}${fence ? `\n${fence}` : ''}`;
}

function topLevelKeys(yaml) {
  const keys = [];
  for (const raw of yaml.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim() || /^\s/.test(line) || line.trim().startsWith('#')) continue;
    const m = line.match(/^(?:"([^"]+)"|'([^']+)'|([^:#\s][^:]*?))\s*:/);
    if (m) keys.push(m[1] ?? m[2] ?? m[3]);
  }
  return keys;
}

function splitFront(text) {
  if (!text.startsWith('---')) return { front: '', body: text, closed: true };
  const rest = text.replace(/^---[^\n]*\n/, '');
  const end = rest.search(/\n---\s*(?:\n|$)/);
  if (end < 0) return { front: rest, body: '', closed: false };
  return { front: rest.slice(0, end), body: rest.slice(end).replace(/^\n---\s*\n?/, ''), closed: true };
}

function extractFence(body) {
  const at = body.indexOf(FENCE_LANG);
  if (at < 0) return { body, tokensText: null };
  const from = at + FENCE_LANG.length;
  const close = body.indexOf('\n```', from);
  if (close < 0) return { body, tokensText: null, brokenFence: true };
  const tokensText = body.slice(from, close + 1);
  const stripped = `${body.slice(0, at)}${body.slice(close + 4)}`;
  return { body: stripped, tokensText };
}

/**
 * Parse a DESIGN.md. Structural problems are findings with severity error.
 * Token groups keep the author's values (strings, numbers, typography objects).
 */
export function parseDesignMd(text) {
  const findings = [];
  const add = (rule, severity, message, path = '', line = 1) => findings.push({ rule, severity, path, message, line });
  const { front, body: rawBody, closed } = splitFront(String(text));
  if (!closed) add('invalid-yaml', 'error', 'front matter has no closing ---', '', 1);
  const { body: noFence, tokensText, brokenFence } = extractFence(rawBody);
  if (brokenFence) add('invalid-yaml', 'error', 'the json tokens fence is not closed', 'token-file', 1);

  const blocks = [];
  if (front.trim()) blocks.push({ yaml: front, line: 2 });
  const fenceRe = /```ya?ml\n([\s\S]*?)\n```/g;
  let m;
  while ((m = fenceRe.exec(noFence))) blocks.push({ yaml: m[1], line: noFence.slice(0, m.index).split('\n').length });
  const merged = {};
  const lines = {};
  for (const block of blocks) {
    const seen = new Set();
    for (const key of topLevelKeys(block.yaml)) {
      if (seen.has(key) || key in merged) add('duplicate-key', 'error', `top-level key "${key}" is defined more than once`, key, block.line);
      seen.add(key);
    }
    let parsed;
    try { parsed = parseYaml(block.yaml, block.line); }
    catch (e) { add('invalid-yaml', 'error', e.message, '', block.line); continue; }
    for (const [k, v] of Object.entries(parsed.value || {})) {
      if (!(k in merged)) { merged[k] = v; lines[k] = parsed.lines.get(k) || block.line; }
    }
  }
  const meta = {
    version: merged.version != null ? String(merged.version) : '',
    name: merged.name != null ? String(merged.name) : '',
    description: merged.description != null ? String(merged.description) : '',
    omitted: normalizeOmitted(merged.omitted),
  };
  const tokens = {
    colors: plainMap(merged.colors),
    typography: typographyMap(merged.typography),
    rounded: plainMap(merged.rounded),
    spacing: plainMap(merged.spacing),
    components: componentMap(merged.components),
  };
  const extra = {};
  for (const [k, v] of Object.entries(merged)) if (!SCHEMA_KEYS.includes(k)) extra[k] = v;

  const sections = [];
  const chunks = noFence.split(/^## /m);
  for (const chunk of chunks.slice(1)) {
    const nl = chunk.indexOf('\n');
    const heading = (nl < 0 ? chunk : chunk.slice(0, nl)).trim();
    let body = nl < 0 ? '' : chunk.slice(nl + 1);
    body = body.replace(/```ya?ml\n[\s\S]*?\n```/g, '').trim();
    const id = sectionId(heading);
    if (sections.some((s) => (id ? sectionId(s.heading) === id : normHead(s.heading) === normHead(heading)))) add('duplicate-section', 'error', `section "${heading}" appears twice`, id || heading, 1);
    sections.push({ heading, body });
  }
  return { meta, tokens, extra, sections, tokensText, findings, lines };
}

function plainMap(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const out = {};
  for (const [k, x] of Object.entries(v)) if (x === null || ['string', 'number', 'boolean'].includes(typeof x)) out[k] = typeof x === 'boolean' ? String(x) : x;
  return out;
}
function typographyMap(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const out = {};
  for (const [k, x] of Object.entries(v)) {
    if (!x || typeof x !== 'object' || Array.isArray(x)) continue;
    const o = {};
    for (const f of TYPE_FIELDS) if (x[f] !== undefined && x[f] !== null) o[f] = x[f];
    out[k] = o;
  }
  return out;
}
function componentMap(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const out = {};
  for (const [k, x] of Object.entries(v)) {
    if (!x || typeof x !== 'object' || Array.isArray(x)) continue;
    const o = {};
    for (const [pk, pv] of Object.entries(x)) if (pv !== undefined && pv !== null && typeof pv !== 'object') o[pk] = pv;
    out[k] = o;
  }
  return out;
}
function normalizeOmitted(v) {
  if (!Array.isArray(v)) return [];
  return v.map((item) => {
    if (typeof item === 'string') return { section: item, reason: '' };
    if (item && typeof item === 'object' && item.section) return { section: String(item.section), reason: item.reason ? String(item.reason) : '' };
    return null;
  }).filter(Boolean);
}

function lookup(tokens, ref) {
  const parts = ref.split('.');
  let node = tokens;
  for (const p of parts) {
    if (!node || typeof node !== 'object') return undefined;
    node = node[p];
  }
  return node;
}
function isTypeObj(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v) && TYPE_FIELDS.some((f) => f in v);
}
function resolveRef(tokens, value, seen = new Set()) {
  if (typeof value !== 'string') return { ok: true, value };
  const m = value.match(REF);
  if (!m) return { ok: true, value };
  if (seen.has(m[1])) return { ok: false, error: 'circular', ref: m[1] };
  seen.add(m[1]);
  const node = lookup(tokens, m[1]);
  if (node === undefined) return { ok: false, error: 'missing', ref: m[1] };
  if (isTypeObj(node)) return { ok: true, value: node, ref: m[1] };
  if (node && typeof node === 'object') return { ok: false, error: 'group', ref: m[1] };
  return resolveRef(tokens, node, seen);
}
function isColorString(s) {
  return typeof s === 'string' && (parseColor(s) || /^color-mix\(/i.test(s.trim()));
}
function isDim(v) { return typeof v === 'string' && DIM.test(v.trim()); }
function asWeight(v) {
  const n = typeof v === 'number' ? v : (typeof v === 'string' && /^\d+(\.\d+)?$/.test(v) ? Number(v) : NaN);
  return n >= 1 && n <= 1000 ? n : null;
}
function pxOf(v) {
  if (typeof v === 'number') return v;
  const m = String(v).trim().match(/^(-?(?:\d+|\d*\.\d+))(px|rem|em)$/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return m[2] === 'px' ? n : n * 16;
}

function walkRefs(tokens, value, where, allowComposite, findings, line) {
  const add = (message) => findings.push({ rule: 'broken-ref', severity: 'error', path: where, message, line });
  if (typeof value === 'string' && REF.test(value)) {
    const r = resolveRef(tokens, value);
    if (!r.ok && r.error === 'missing') add(`{${r.ref}} does not resolve to a token`);
    else if (!r.ok && r.error === 'circular') add(`{${r.ref}} is a circular reference`);
    else if (!r.ok && r.error === 'group') add(`{${r.ref}} points at a group; reference a value`);
    else if (r.ok && isTypeObj(r.value) && !allowComposite) add(`{${value.slice(1, -1)}} points at a typography token; only components may do that`);
  }
}

/** Google's lint rules, plus structural errors found while parsing. Warnings and info do not fail the command. */
export function lintDesignMd(text) {
  const parsed = typeof text === 'string' ? parseDesignMd(text) : text;
  const findings = [...parsed.findings];
  const { tokens, meta, extra, sections } = parsed;
  const line = parsed.lines || {};
  const add = (rule, severity, message, path = '', ln = 1) => findings.push({ rule, severity, path, message, line: ln });
  const prose = sections.map((s) => s.body).join('\n');

  for (const [name, value] of Object.entries(tokens.colors)) {
    walkRefs(tokens, value, `colors.${name}`, false, findings, line.colors || 1);
    const r = resolveRef(tokens, value);
    if (r.ok && typeof r.value === 'string' && !isColorString(r.value)) add('invalid-value', 'error', `"${r.value}" is not a CSS color`, `colors.${name}`, line.colors || 1);
  }
  for (const [name, t] of Object.entries(tokens.typography)) {
    for (const [field, value] of Object.entries(t)) {
      const where = `typography.${name}.${field}`;
      walkRefs(tokens, value, where, false, findings, line.typography || 1);
      const r = resolveRef(tokens, value);
      if (!r.ok || typeof r.value === 'object') continue;
      if ((field === 'fontSize' || field === 'letterSpacing') && !isDim(r.value)) add('invalid-value', 'error', `"${r.value}" is not a dimension (px, em or rem)`, where, line.typography || 1);
      if (field === 'lineHeight' && !(isDim(r.value) || (typeof r.value === 'number' && r.value > 0))) add('invalid-value', 'error', `"${r.value}" is not a line height (a number or a dimension)`, where, line.typography || 1);
      if (field === 'fontWeight' && asWeight(r.value) === null) add('invalid-value', 'error', `"${r.value}" is not a font weight`, where, line.typography || 1);
      if ((field === 'fontFamily' || field === 'fontFeature' || field === 'fontVariation') && typeof r.value !== 'string') add('invalid-value', 'error', `${field} must be a string`, where, line.typography || 1);
    }
  }
  for (const [name, value] of Object.entries(tokens.rounded)) {
    walkRefs(tokens, value, `rounded.${name}`, false, findings, line.rounded || 1);
    const r = resolveRef(tokens, value);
    if (r.ok && typeof r.value !== 'object' && !isDim(r.value)) add('invalid-value', 'error', `"${r.value}" is not a dimension (px, em or rem)`, `rounded.${name}`, line.rounded || 1);
  }
  for (const [name, value] of Object.entries(tokens.spacing)) {
    walkRefs(tokens, value, `spacing.${name}`, false, findings, line.spacing || 1);
    const r = resolveRef(tokens, value);
    if (r.ok && typeof r.value !== 'object' && !(isDim(r.value) || typeof r.value === 'number')) add('invalid-value', 'error', `"${r.value}" is not a dimension or a number`, `spacing.${name}`, line.spacing || 1);
  }
  for (const [name, props] of Object.entries(tokens.components)) {
    for (const [prop, value] of Object.entries(props)) walkRefs(tokens, value, `components.${name}.${prop}`, true, findings, line.components || 1);
  }

  for (const [key, value] of Object.entries(extra)) {
    const near = SCHEMA_KEYS.find((k) => k !== key && levenshtein(k, key) > 0 && levenshtein(k, key) <= 2);
    if (near) add('unknown-key', 'warning', `unknown key "${key}" looks like "${near}"`, key, 1);
    else if (tokenLike(value)) add('token-like-ignored', 'warning', `"${key}" holds token-like values and is not a schema key, so exporters will ignore it`, key, 1);
  }

  const omitted = new Set(meta.omitted.map((o) => o.section));
  const has = (key) => tokens[key] && Object.keys(tokens[key]).length > 0;
  const anyTokens = ['colors', 'typography', 'rounded', 'spacing', 'components'].some(has);
  if (has('colors') && !Object.prototype.hasOwnProperty.call(tokens.colors, 'primary') && !omitted.has('colors')) add('missing-primary', 'warning', "no 'primary' color defined. The agent will auto-generate key colors, reducing your control over the palette.", 'colors', line.colors || 1);
  if (has('colors') && !has('typography') && !omitted.has('typography')) add('missing-typography', 'warning', 'colors are defined but no typography tokens exist. The agent will use default fonts.', 'typography', 1);
  if (anyTokens && !has('spacing') && !omitted.has('spacing')) add('missing-sections', 'info', "no 'spacing' section defined. Layout spacing will fall back to agent defaults.", 'spacing', 1);
  if (anyTokens && !has('rounded') && !omitted.has('rounded')) add('missing-sections', 'info', "no 'rounded' section defined. Corner radius will fall back to agent defaults.", 'rounded', 1);
  for (const o of meta.omitted) {
    if (!OMIT_OK.has(o.section)) { add('unknown-omission', 'warning', `"${o.section}" is not a section the format can omit`, `omitted.${o.section}`, line.omitted || 1); continue; }
    const present = (o.section === 'spacing' && has('spacing')) || (o.section === 'rounded' && has('rounded')) || (o.section === 'colors' && has('colors')) || (o.section === 'typography' && has('typography')) || (o.section === 'components' && has('components')) || sections.some((s) => sectionId(s.heading) === o.section || normHead(s.heading) === o.section);
    if (present) add('redundant-omission', 'warning', `"${o.section}" is listed as omitted but it is present`, `omitted.${o.section}`, line.omitted || 1);
    else add('declared-omission', 'info', `"${o.section}" is omitted${o.reason ? `: ${o.reason}` : ''}`, `omitted.${o.section}`, line.omitted || 1);
  }

  let last = -1;
  for (const s of sections) {
    const id = sectionId(s.heading);
    if (!id) continue;
    const idx = SECTIONS.findIndex((x) => x.id === id);
    if (idx < last) add('section-order', 'warning', `"${s.heading}" is out of the canonical section order`, id, 1);
    last = Math.max(last, idx);
  }

  const used = new Set();
  const mark = (name) => { if (!used.has(name)) { used.add(name); const v = tokens.colors[name]; if (typeof v === 'string') { const ref = v.match(REF); if (ref && ref[1].startsWith('colors.')) mark(ref[1].slice(7)); } } };
  for (const props of Object.values(tokens.components)) for (const value of Object.values(props)) {
    const ref = typeof value === 'string' && value.match(REF);
    if (ref && ref[1].startsWith('colors.')) mark(ref[1].slice(7));
  }
  for (const hit of prose.matchAll(/\{colors\.([A-Za-z0-9_-]+)\}/g)) mark(hit[1]);
  for (const name of Object.keys(tokens.colors)) if (!used.has(name)) add('orphaned-tokens', 'warning', `color "${name}" is not referenced by a component or the prose`, `colors.${name}`, line.colors || 1);

  for (const [name, props] of Object.entries(tokens.components)) {
    if (props.backgroundColor === undefined || props.textColor === undefined) continue;
    const bg = colorOf(tokens, props.backgroundColor);
    const fg = colorOf(tokens, props.textColor);
    if (!bg || !fg) continue;
    const size = props.fontSize !== undefined ? pxOf(resolveRef(tokens, props.fontSize).value) : null;
    const weight = props.fontWeight !== undefined ? asWeight(resolveRef(tokens, props.fontWeight).value) : null;
    const large = (size !== null && size >= 24) || (size !== null && size >= 18.66 && weight !== null && weight >= 700);
    const target = large ? 3 : 4.5;
    const ratio = contrastRatio(fg, bg);
    if (ratio + 1e-9 < target) {
      const shown = Math.round(ratio * 100) / 100;
      add('contrast-ratio', 'warning', `textColor (${cssOf(fg)}) on backgroundColor (${cssOf(bg)}) has contrast ratio ${shown}:1 — below WCAG AA (${target}:1).`, `components.${name}`, line.components || 1);
    }
  }

  const nType = Object.keys(tokens.typography).length;
  const parts = [`${Object.keys(tokens.colors).length} color${Object.keys(tokens.colors).length === 1 ? '' : 's'}`, `${nType} typography scale${nType === 1 ? '' : 's'}`];
  add('token-summary', 'info', `Design system defines ${parts.join(', ')}.`, '', 1);
  return { ...parsed, findings };
}

function colorOf(tokens, value) {
  const r = resolveRef(tokens, value);
  if (!r.ok || typeof r.value !== 'string') return null;
  return parseColor(r.value);
}
function cssOf(c) { return toHex(c); }
function tokenLike(v) {
  if (typeof v === 'string') return /^#(?:[0-9a-f]{3,8})$/i.test(v.trim()) || DIM.test(v.trim()) || /^fontFamily$/i.test(v);
  if (Array.isArray(v)) return v.some(tokenLike);
  if (v && typeof v === 'object') return Object.values(v).some(tokenLike);
  return false;
}
function levenshtein(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

const GROUP_TO_DTCG = { colors: 'color', typography: 'typography', rounded: 'radius', spacing: 'space', components: 'component' };
const DTCG_TO_GROUP = Object.fromEntries(Object.entries(GROUP_TO_DTCG).map(([a, b]) => [b, a]));

function rewriteRef(value, map) {
  const m = typeof value === 'string' ? value.match(REF) : null;
  if (!m) return value;
  const [head, ...rest] = m[1].split('.');
  const next = map[head] || head;
  return `{${[next, ...rest].join('.')}}`;
}

/** Google token tree → a DTCG document that export reads back to the same tree. */
export function googleToDtcg(parsed) {
  const tokens = parsed.tokens || parsed;
  const doc = {};
  const put = (group, name, node) => { (doc[group] ||= {})[name] = node; };
  for (const [name, value] of Object.entries(tokens.colors || {})) put('color', name, { $type: 'color', $value: rewriteRef(value, GROUP_TO_DTCG) });
  for (const [name, t] of Object.entries(tokens.typography || {})) {
    const value = {};
    for (const [k, v] of Object.entries(t)) value[k] = rewriteRef(v, GROUP_TO_DTCG);
    put('typography', name, { $type: 'typography', $value: value });
  }
  for (const [name, value] of Object.entries(tokens.rounded || {})) put('radius', name, { $type: 'dimension', $value: rewriteRef(value, GROUP_TO_DTCG) });
  for (const [name, value] of Object.entries(tokens.spacing || {})) put('space', name, { $type: typeof value === 'number' ? 'number' : 'dimension', $value: rewriteRef(value, GROUP_TO_DTCG) });
  for (const [name, props] of Object.entries(tokens.components || {})) {
    const node = {};
    for (const [k, v] of Object.entries(props)) node[k] = { $value: rewriteRef(v, GROUP_TO_DTCG) };
    put('component', name, node);
  }
  return doc;
}

/** Inverse of googleToDtcg. */
export function dtcgToGoogle(doc) {
  const tokens = { colors: {}, typography: {}, rounded: {}, spacing: {}, components: {} };
  const color = doc.color || {};
  for (const [name, node] of Object.entries(color)) if (node && typeof node === 'object' && '$value' in node) tokens.colors[name] = rewriteRef(node.$value, DTCG_TO_GROUP);
  for (const [name, node] of Object.entries(doc.typography || {})) {
    if (!node?.$value || typeof node.$value !== 'object') continue;
    const o = {};
    for (const f of TYPE_FIELDS) if (node.$value[f] !== undefined) o[f] = rewriteRef(node.$value[f], DTCG_TO_GROUP);
    tokens.typography[name] = o;
  }
  for (const [name, node] of Object.entries(doc.radius || {})) if (node && '$value' in node) tokens.rounded[name] = rewriteRef(node.$value, DTCG_TO_GROUP);
  for (const [name, node] of Object.entries(doc.space || {})) if (node && '$value' in node) tokens.spacing[name] = rewriteRef(node.$value, DTCG_TO_GROUP);
  for (const [name, node] of Object.entries(doc.component || {})) {
    if (!node || typeof node !== 'object') continue;
    const o = {};
    for (const [k, v] of Object.entries(node)) if (v && typeof v === 'object' && '$value' in v) o[k] = rewriteRef(v.$value, DTCG_TO_GROUP);
    tokens.components[name] = o;
  }
  return tokens;
}

/**
 * Import a DESIGN.md. A json tokens fence is returned unchanged (the lossless path).
 * Without one, the Google schema becomes a DTCG document.
 */
export function importDesignMd(text) {
  const parsed = parseDesignMd(text);
  if (parsed.tokensText != null) return { kind: 'tokens-file', text: parsed.tokensText, parsed };
  return { kind: 'google', text: formatJson(googleToDtcg(parsed)), parsed };
}

function systemTokens(ctx) {
  const mode = ctx.themes[0];
  const colors = {};
  const sources = [];
  const usedPaths = new Set();
  for (const [name, tokenPath] of COLOR_ALIAS) {
    const css = colorCss(ctx.flat, tokenPath, mode);
    if (!css) continue;
    colors[name] = css;
    sources.push([name, tokenPath]);
    usedPaths.add(tokenPath);
  }
  for (const t of ctx.loaded.tokens.values()) {
    if (t.type !== 'color' || t.segs[0] !== 'color' || usedPaths.has(t.path)) continue;
    const name = t.segs.slice(1).join('-');
    if (!name || colors[name]) continue;
    const css = colorCss(ctx.flat, t.path, mode);
    if (css) { colors[name] = css; sources.push([name, t.path]); }
  }
  const typography = {};
  for (const t of ctx.loaded.tokens.values()) {
    if (t.type !== 'typography' || t.segs[0] !== 'type' || t.segs.length !== 2) continue;
    const v = resolveValue(ctx.loaded.tokens, t.path, mode);
    if (!v || typeof v !== 'object') continue;
    const families = Array.isArray(v.fontFamily) ? v.fontFamily : String(v.fontFamily || '').split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
    const o = {};
    if (families[0]) o.fontFamily = families[0];
    if (v.fontSize) o.fontSize = cssDim(v.fontSize);
    if (v.fontWeight !== undefined) o.fontWeight = v.fontWeight;
    if (typeof v.lineHeight === 'number') o.lineHeight = v.lineHeight;
    else if (v.lineHeight) o.lineHeight = cssDim(v.lineHeight);
    if (v.letterSpacing) o.letterSpacing = cssDim(v.letterSpacing);
    const features = t.extensions?.[TYPE_EXT]?.fontFeatures;
    if (Array.isArray(features) && features.length) o.fontFeature = features.join(', ');
    typography[t.segs[1]] = o;
  }
  const rounded = {};
  const spacing = {};
  for (const t of ctx.loaded.tokens.values()) {
    if (t.type === 'dimension' && t.segs[0] === 'radius' && t.segs.length === 2) rounded[t.segs[1]] = cssDim(resolveValue(ctx.loaded.tokens, t.path, mode));
    if ((t.type === 'dimension' || t.type === 'number') && t.segs[0] === 'space' && t.segs.length === 2) {
      const v = resolveValue(ctx.loaded.tokens, t.path, mode);
      spacing[t.segs[1]] = t.type === 'number' ? v : cssDim(v);
    }
  }
  const need = (name) => Object.prototype.hasOwnProperty.call(colors, name);
  const comp = (bg, fg, radius, pad) => {
    const o = {};
    if (bg && need(bg)) o.backgroundColor = `{colors.${bg}}`;
    if (fg && need(fg)) o.textColor = `{colors.${fg}}`;
    if (radius && rounded[radius] !== undefined) o.rounded = `{rounded.${radius}}`;
    if (pad && spacing[pad] !== undefined) o.padding = `{spacing.${pad}}`;
    return o;
  };
  const components = {
    'button-primary': comp('primary', 'on-primary', 'md', '2'),
    'button-secondary': comp('surface', 'primary', 'md', '2'),
    'button-ghost': comp(null, 'primary', 'md', '2'),
    'button-danger': comp('error', 'on-error', 'md', '2'),
    input: comp('surface', 'on-surface', 'sm', '2'),
    card: comp('surface', 'on-surface', 'lg', '6'),
    badge: comp('surface', 'on-surface', 'sm', '1'),
    'badge-success': comp('success', 'on-success', 'sm', '1'),
    'badge-warning': comp('warning', 'on-warning', 'sm', '1'),
    'badge-error': comp('error', 'on-error', 'sm', '1'),
    'badge-info': comp('info', 'on-info', 'sm', '1'),
  };
  return { colors, typography, rounded, spacing, components, sources };
}

function systemSections(ctx, model) {
  const mode = ctx.themes[0];
  const name = brandLabel(ctx.index?.fm);
  const feel = feelOf(ctx.index?.text);
  const others = ctx.themes.filter((t) => t !== mode);
  const colorLines = model.sources.map(([alias, tokenPath]) => `- \`{colors.${alias}}\` is the ${mode} value of \`${tokenPath}\`.`).join('\n');
  const typeLines = Object.keys(model.typography).map((role) => `- \`${role}\` is the \`${role}\` type role.`).join('\n');
  const spaceLines = Object.entries(model.spacing).map(([k, v]) => `- \`${k}\` is ${v}.`).join('\n');
  const radiusLines = Object.entries(model.rounded).map(([k, v]) => `- \`${k}\` is ${v}.`).join('\n');
  return [
    { heading: 'Overview', body: `${name} is recorded here for agents. The YAML front matter is the Google DESIGN.md projection of the ${mode} theme.${others.length ? ` ${others.join(' and ')} ${others.length === 1 ? 'is' : 'are'} in the token file, the Tailwind files and the Figma files.` : ''}\n\n${feel || 'The one-line feel is still open. It is written in design.md when the brand has one.'}\n\nEvery value lives in the token file. This document is generated from it. Do not edit it by hand.` },
    { heading: 'Colors', body: `The default theme is ${mode}.\n\n${colorLines}` },
    { heading: 'Typography', body: `Each role is one typography token. The family in the YAML is the first family in the stack. The fallback stack, the script overrides and the OpenType features stay in the token file.\n\n${typeLines}` },
    { heading: 'Layout', body: `Spacing follows the space tokens.\n\n${spaceLines}\n\nBreakpoints, viewport widths and container widths stay in the token file.` },
    { heading: 'Elevation & Depth', body: `Depth uses the shadow tokens. shadow.1 is the resting card, shadow.2 the raised card and shadow.3 the overlay. A dark theme uses a heavier shadow. The values stay in the token file.` },
    { heading: 'Shapes', body: `Corners use the radius tokens.\n\n${radiusLines}` },
    { heading: 'Components', body: `Button, Input, Card and Badge take their fills and text from the color tokens above. Padding and corner radius reference spacing and rounded. The button's inline padding is spacing.4; the block padding is spacing.2.` },
    { heading: "Do's and Don'ts", body: `- Do take every value from the token file. The YAML above is a projection of the ${mode} theme, not a second source.\n- Do keep text on a fill at the contrast the token pairings already meet.\n- Don't name a palette step from component code. Components use the role tokens.\n- Don't edit this file by hand. Change the tokens and run the export again.` },
  ];
}

export function buildSystemDesignMd(ctx, tokensText) {
  const model = systemTokens(ctx);
  const meta = { version: 'alpha', name: brandLabel(ctx.index?.fm), description: feelOf(ctx.index?.text) || `${brandLabel(ctx.index?.fm)} tokens, generated from ${ctx.tokensRel}.` };
  return designMdFromParts({ meta, tokens: model, sections: systemSections(ctx, model), tokensText });
}

function cssValue(ctx, token, mode) {
  return toCss(token.type, resolveValue(ctx.loaded.tokens, token.path, mode));
}
function themeVar(token) {
  const [g, ...rest] = token.segs;
  const tail = rest.join('-');
  if (token.type === 'color') {
    if (g === 'palette') return [`--color-palette-${tail}`, 'theme'];
    if (g === 'color') return [`--color-${tail}`, 'theme'];
  }
  if (g === 'font' && rest[0] === 'family') return [`--font-${rest.slice(1).join('-')}`, 'theme'];
  if (g === 'type' && rest.length === 1) return [null, 'type'];
  if (g === 'space') return [`--spacing-${tail}`, 'theme'];
  if (g === 'radius') return [`--radius-${tail}`, 'theme'];
  if (g === 'shadow') return [`--shadow-${tail}`, 'theme'];
  if (g === 'blur') return [`--blur-${tail}`, 'theme'];
  if (g === 'breakpoint') return [`--breakpoint-${tail}`, 'theme'];
  if (g === 'container') return [`--container-${tail}`, 'theme'];
  if (g === 'motion' && rest[0] === 'ease') return [`--ease-${rest.slice(1).join('-')}`, 'theme'];
  if (g === 'font') return [null, 'skip'];
  return [`--ds-${token.segs.join('-')}`, 'root'];
}

export function buildTailwindV4(ctx) {
  const mode = ctx.themes[0];
  const theme = [];
  const root = [];
  const extras = new Map();
  const decl = (bucket, name, value) => { if (value !== '' && value != null) bucket.push(`  ${name}: ${value};`); };
  for (const t of ctx.loaded.tokens.values()) {
    const [name, kind] = themeVar(t);
    if (kind === 'skip' || !name) {
      if (kind === 'type') {
        const v = resolveValue(ctx.loaded.tokens, t.path, mode);
        if (!v || typeof v !== 'object') continue;
        const role = t.segs[1];
        decl(theme, `--text-${role}`, cssDim(v.fontSize));
        if (v.lineHeight !== undefined) decl(theme, `--leading-${role}`, typeof v.lineHeight === 'number' ? String(v.lineHeight) : cssDim(v.lineHeight));
        if (v.letterSpacing) decl(theme, `--tracking-${role}`, cssDim(v.letterSpacing));
        if (v.fontWeight !== undefined) decl(theme, `--font-weight-${role}`, String(v.fontWeight));
        const fam = toCss('fontFamily', v.fontFamily);
        if (fam) decl(theme, `--font-${role}`, fam);
        extras.set(role, t.path);
      }
      continue;
    }
    decl(name.startsWith('--ds-') ? root : theme, name, cssValue(ctx, t, mode));
  }
  for (const [alias, tokenPath] of COLOR_ALIAS) {
    const css = colorCss(ctx.flat, tokenPath, mode);
    const varName = `--color-${alias}`;
    if (css && !theme.some((l) => l.startsWith(`  ${varName}:`))) decl(theme, varName, css);
  }
  const lines = [
    '/* Generated from tokens by design-build/designmd.mjs. Do not edit.',
    `   Tailwind v4 theme. Default theme: ${mode} (the first theme in design.md).`,
    '   Other themes override the same variables under [data-theme].',
    '   --color-primary and the other short names match design-build/exports/DESIGN.md.',
    '   App code uses the role tokens. Palette steps are the ramp those roles alias. */',
    '@theme {',
    ...theme,
    '}',
  ];
  if (root.length) lines.push(':root {', ...root, '}');
  for (const themeName of ctx.themes) {
    if (themeName === mode) continue;
    const over = [];
    const push = (name, value, base) => { if (value !== '' && value != null && value !== base) over.push(`  ${name}: ${value};`); };
    for (const t of ctx.loaded.tokens.values()) {
      const [name, kind] = themeVar(t);
      if (kind === 'type') {
        const base = resolveValue(ctx.loaded.tokens, t.path, mode);
        const v = resolveValue(ctx.loaded.tokens, t.path, themeName);
        if (!v || typeof v !== 'object' || !base) continue;
        const role = t.segs[1];
        push(`--text-${role}`, cssDim(v.fontSize), cssDim(base.fontSize));
        continue;
      }
      if (!name) continue;
      push(name, cssValue(ctx, t, themeName), cssValue(ctx, t, mode));
    }
    for (const [alias, tokenPath] of COLOR_ALIAS) {
      const a = colorCss(ctx.flat, tokenPath, themeName);
      const b = colorCss(ctx.flat, tokenPath, mode);
      if (a && a !== b) push(`--color-${alias}`, a, b);
    }
    if (over.length) lines.push(`[data-theme="${themeName}"] {`, ...over, '}');
  }
  return `${lines.join('\n')}\n`;
}

function setPath(obj, segs, value) {
  let cur = obj;
  for (let i = 0; i < segs.length - 1; i++) {
    const k = segs[i];
    if (cur[k] === undefined) cur[k] = {};
    else if (typeof cur[k] !== 'object') return;
    cur = cur[k];
  }
  const last = segs[segs.length - 1];
  if (cur[last] && typeof cur[last] === 'object') return;
  cur[last] = value;
  if (last === 'default' && (typeof value === 'string' || typeof value === 'number')) cur.DEFAULT = value;
}

export function buildTailwindV3(ctx) {
  const mode = ctx.themes[0];
  const extend = { colors: {}, fontFamily: {}, fontSize: {}, spacing: {}, borderRadius: {}, boxShadow: {}, blur: {}, screens: {}, maxWidth: {}, transitionTimingFunction: {}, transitionDuration: {}, zIndex: {}, opacity: {} };
  const dark = { colors: {}, boxShadow: {} };
  const darkName = ctx.themes.find((t) => t !== mode && /(^|-)dark($|-)/.test(t)) || ctx.themes.find((t) => t !== mode) || null;
  for (const t of ctx.loaded.tokens.values()) {
    const v = cssValue(ctx, t, mode);
    if (v === '' || v == null) continue;
    const [g, ...rest] = t.segs;
    if (t.type === 'color' && (g === 'color' || g === 'palette')) setPath(extend.colors, g === 'palette' ? t.segs : rest, v);
    else if (g === 'font' && rest[0] === 'family') extend.fontFamily[rest.slice(1).join('-')] = (Array.isArray(t.value) ? t.value : [v]);
    else if (g === 'type' && rest.length === 1) {
      const tv = resolveValue(ctx.loaded.tokens, t.path, mode);
      if (tv && typeof tv === 'object') {
        const extra = {};
        if (tv.lineHeight !== undefined) extra.lineHeight = typeof tv.lineHeight === 'number' ? String(tv.lineHeight) : cssDim(tv.lineHeight);
        if (tv.letterSpacing) extra.letterSpacing = cssDim(tv.letterSpacing);
        if (tv.fontWeight !== undefined) extra.fontWeight = String(tv.fontWeight);
        extend.fontSize[rest[0]] = [cssDim(tv.fontSize), extra];
      }
    } else if (g === 'space') extend.spacing[rest.join('-')] = v;
    else if (g === 'radius') extend.borderRadius[rest.join('-')] = v;
    else if (g === 'shadow') extend.boxShadow[rest.join('-')] = v;
    else if (g === 'blur') extend.blur[rest.join('-')] = v;
    else if (g === 'breakpoint') extend.screens[rest.join('-')] = v;
    else if (g === 'container') extend.maxWidth[rest.join('-')] = v;
    else if (g === 'motion' && rest[0] === 'ease') extend.transitionTimingFunction[rest.slice(1).join('-')] = v;
    else if (g === 'motion' && rest[0] === 'duration') extend.transitionDuration[rest.slice(1).join('-')] = v;
    else if (g === 'z-index') extend.zIndex[rest.join('-')] = String(resolveValue(ctx.loaded.tokens, t.path, mode));
    else if (g === 'opacity') extend.opacity[rest.join('-')] = String(resolveValue(ctx.loaded.tokens, t.path, mode));
    if (darkName && t.type === 'color' && (g === 'color' || g === 'palette')) {
      const dv = cssValue(ctx, t, darkName);
      if (dv && dv !== v) setPath(dark.colors, g === 'palette' ? t.segs : rest, dv);
    }
    if (darkName && g === 'shadow') {
      const dv = cssValue(ctx, t, darkName);
      if (dv && dv !== v) dark.boxShadow[rest.join('-')] = dv;
    }
  }
  for (const [alias, tokenPath] of COLOR_ALIAS) {
    const css = colorCss(ctx.flat, tokenPath, mode);
    if (!css) continue;
    if (extend.colors[alias] === undefined) extend.colors[alias] = css;
    else if (typeof extend.colors[alias] === 'object' && extend.colors[alias].DEFAULT === undefined) extend.colors[alias].DEFAULT = css;
    if (darkName) {
      const dv = colorCss(ctx.flat, tokenPath, darkName);
      if (dv && dv !== css && dark.colors[alias] === undefined) dark.colors[alias] = dv;
    }
  }
  for (const key of Object.keys(extend)) if (extend[key] && typeof extend[key] === 'object' && !Object.keys(extend[key]).length) delete extend[key];
  const config = { theme: { extend } };
  if (darkName) config.darkMode = ['selector', `[data-theme="${darkName}"]`];
  if (darkName && (Object.keys(dark.colors).length || Object.keys(dark.boxShadow).length)) config.darkTheme = dark;
  return `/* Generated from tokens by design-build/designmd.mjs. Do not edit.\n   Tailwind v3 theme.extend for the ${mode} theme. darkTheme holds values that differ in ${darkName || 'no other theme'}.\n   Copy this file to the app root as tailwind.config.cjs (this folder lives under a type:module package). */\nmodule.exports = ${JSON.stringify(config, null, 2)};\n`;
}

function studioNode(node, mode, inherited, onlyMode) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return undefined;
  const type = node.$type || inherited;
  if ('$value' in node) {
    const has = mode && node.$extensions?.mode && node.$extensions.mode[mode] !== undefined;
    if (onlyMode && !has) return undefined;
    const value = has ? node.$extensions.mode[mode] : node.$value;
    if (onlyMode && JSON.stringify(value) === JSON.stringify(node.$value)) return undefined;
    const out = {};
    if (type) out.$type = type;
    out.$value = value;
    if (node.$description && !onlyMode) out.$description = node.$description;
    return out;
  }
  const out = {};
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith('$')) continue;
    const child = studioNode(v, mode, type, onlyMode);
    if (child && (typeof child !== 'object' || '$value' in child || Object.keys(child).length)) out[k] = child;
  }
  return Object.keys(out).length ? out : undefined;
}

export function buildTokensStudio(ctx) {
  const json = ctx.loaded.json;
  const doc = { global: studioNode(json, null, undefined, false) || {} };
  for (const theme of ctx.themes) doc[theme] = studioNode(json, theme, undefined, true) || {};
  doc.$metadata = { tokenSetOrder: ['global', ...ctx.themes] };
  doc.$themes = ctx.themes.map((theme) => ({ id: theme, name: theme, selectedTokenSets: { global: 'source', [theme]: 'enabled' } }));
  return formatJson(doc);
}

function figmaType(type) {
  if (type === 'color') return 'COLOR';
  if (type === 'dimension' || type === 'number' || type === 'fontWeight' || type === 'duration') return 'FLOAT';
  return 'STRING';
}
function figmaNumber(type, raw) {
  if (typeof raw === 'number') return type === 'duration' ? raw : raw;
  if (raw && typeof raw === 'object' && 'unit' in raw) {
    if (raw.unit === 'rem' || raw.unit === 'em') return raw.value * 16;
    if (raw.unit === 's') return raw.value * 1000;
    return raw.value;
  }
  return null;
}
function figmaValue(type, raw) {
  if (typeof raw === 'string') {
    const m = raw.match(REF);
    if (m) return { alias: m[1].replaceAll('.', '/') };
  }
  if (type === 'color') {
    const c = parseDtcgColor(raw);
    if (!c) return toCss(type, raw);
    return { r: round5(c.r), g: round5(c.g), b: round5(c.b), a: round5(c.a ?? 1) };
  }
  if (figmaType(type) === 'FLOAT') {
    const n = figmaNumber(type, raw);
    if (n !== null) return n;
  }
  return toCss(type, raw);
}

export function buildFigmaVariables(ctx) {
  const variables = [];
  for (const t of ctx.loaded.tokens.values()) {
    const valuesByMode = {};
    for (const theme of ctx.themes) {
      const raw = t.modes[theme] !== undefined ? t.modes[theme] : t.value;
      valuesByMode[theme] = figmaValue(t.type, raw);
    }
    const item = { name: t.segs.join('/'), type: figmaType(t.type), valuesByMode };
    if (t.description) item.description = t.description;
    variables.push(item);
  }
  variables.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return formatJson({
    $comment: `Figma variables generated from ${ctx.tokensRel} by design-build/designmd.mjs. Do not edit. COLOR channels are sRGB 0–1. FLOAT dimensions are px (rem × 16) and durations are ms. An alias points at another variable name. Modes are the themes in design.md.`,
    collections: [{ name: 'Tokens', modes: ctx.themes, variables }],
  });
}

export function outputFiles(root) {
  const ctx = loadContext(root);
  const tokensText = fs.readFileSync(path.join(root, ctx.tokensRel), 'utf8');
  const files = new Map([
    [OUTPUT_RELS[0], buildSystemDesignMd(ctx, tokensText)],
    [OUTPUT_RELS[1], buildTailwindV4(ctx)],
    [OUTPUT_RELS[2], buildTailwindV3(ctx)],
    [OUTPUT_RELS[3], buildTokensStudio(ctx)],
    [OUTPUT_RELS[4], buildFigmaVariables(ctx)],
  ]);
  return OUTPUT_RELS.map((rel) => [rel, files.get(rel)]);
}

export function writeOutputs(root) {
  const files = outputFiles(root);
  for (const [rel, text] of files) {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, text);
  }
  return files;
}

function readOut(root, rel) {
  const abs = path.join(root, rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
}

/** Compare generated outputs to disk, or to `pending` when the live rebuild is about to write them. */
export function exportSync(root, pending, generated = null) {
  const files = generated || outputFiles(root);
  const stale = [];
  for (const [rel, content] of files) {
    const have = pending && Object.prototype.hasOwnProperty.call(pending, rel) ? pending[rel] : readOut(root, rel);
    if (have !== content) stale.push(rel);
  }
  return { ok: stale.length === 0, stale, files: files.map(([rel]) => rel), generated: files };
}

export function designMdErrors(text) {
  return lintDesignMd(text).findings.filter((f) => f.severity === 'error');
}
