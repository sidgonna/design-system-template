// DTCG (Design Tokens Community Group, format 2025.10) loader for tokens/tokens.json. Zero dependencies.
// Modes (themes: light, dark, high-contrast…) follow the Terrazzo convention: "$extensions": { "mode": { "light": <value>, "dark": <value> } }.
import fs from 'node:fs';
import { parseDtcgColor, toHex } from './color.mjs';

export const DTCG_TYPES = new Set([
  'color', 'dimension', 'fontFamily', 'fontWeight', 'duration', 'cubicBezier', 'number',
  'strokeStyle', 'border', 'transition', 'shadow', 'gradient', 'typography',
]);
const ALIAS = /^\{([^{}]+)\}$/;

/** Find the 1-based line of a token path inside the JSON text (sequential key search). */
export function makeLineFinder(text) {
  const rows = text.split('\n');
  return (path) => {
    let from = 0;
    for (const seg of path) {
      const needle = `"${seg}"`;
      let found = -1;
      for (let i = from; i < rows.length; i++) if (rows[i].includes(needle)) { found = i; break; }
      if (found < 0) return from + 1;
      from = found;
    }
    return from + 1;
  };
}

/**
 * Load and validate a DTCG tokens file.
 * Returns { tokens: Map(path -> token), modes: string[], problems: [{line, path, message, fix}] }
 * token = { path, type, value, modes: {mode: value}, line, description, extensions }
 */
export function loadTokens(file) {
  const problems = [];
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return { tokens: new Map(), modes: [], problems: [{ line: 1, path: '', message: `tokens file not found: ${file}`, fix: 'create it (KICKSTART step 2 / §16 Phase 4) or fix tokens_file in design.md' }], text: '' }; }
  let json;
  try { json = JSON.parse(text); } catch (e) {
    return { tokens: new Map(), modes: [], problems: [{ line: 1, path: '', message: `invalid JSON: ${e.message}`, fix: 'fix the JSON syntax' }], text };
  }
  const lineOf = makeLineFinder(text);
  const tokens = new Map();
  const modes = new Set();

  function walk(node, path, inheritedType) {
    if (Array.isArray(node) || node === null || typeof node !== 'object') {
      problems.push({ line: lineOf(path), path: path.join('.'), message: `"${path.join('.')}" is a raw ${Array.isArray(node) ? 'array' : 'value'}, not a DTCG token or group`, fix: `wrap it as { "$value": ${JSON.stringify(node)} } with a "$type", or make it a group of named tokens` });
      return;
    }
    const type = node.$type ?? inheritedType;
    if ('$value' in node) {
      if (!type) problems.push({ line: lineOf(path), path: path.join('.'), message: `token ${path.join('.')} has no $type (own or inherited)`, fix: 'add "$type" to the token or its group' });
      else if (!DTCG_TYPES.has(type)) problems.push({ line: lineOf(path), path: path.join('.'), message: `unknown $type "${type}"`, fix: `use one of ${[...DTCG_TYPES].join(', ')}` });
      const mode = node.$extensions?.mode;
      if (mode) Object.keys(mode).forEach((m) => modes.add(m));
      tokens.set(path.join('.'), { path: path.join('.'), segs: path, type, value: node.$value, modes: mode || {}, line: lineOf(path), description: node.$description, extensions: node.$extensions || {} });
      return;
    }
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith('$')) continue;
      if (/[{}.]/.test(k)) problems.push({ line: lineOf([...path, k]), path: [...path, k].join('.'), message: `name "${k}" contains { } or .`, fix: 'rename it; DTCG names may not contain {, } or .' });
      walk(v, [...path, k], type);
    }
  }
  walk(json, [], undefined);

  // aliases must resolve, with no cycles
  for (const t of tokens.values()) {
    for (const [label, v] of [['$value', t.value], ...Object.entries(t.modes).map(([m, v]) => [`mode.${m}`, v])]) {
      for (const ref of collectAliases(v)) {
        if (!tokens.has(ref)) problems.push({ line: t.line, path: t.path, message: `${t.path} ${label} aliases {${ref}}, which does not exist`, fix: 'point it at an existing token path' });
      }
    }
  }
  for (const t of tokens.values()) {
    try { resolveValue(tokens, t.path); } catch (e) { problems.push({ line: t.line, path: t.path, message: e.message, fix: 'break the alias cycle' }); }
  }
  return { tokens, modes: [...modes], problems, text, json };
}

export function collectAliases(v, out = []) {
  if (typeof v === 'string') { const m = v.match(ALIAS); if (m) out.push(m[1]); }
  else if (Array.isArray(v)) v.forEach((x) => collectAliases(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => collectAliases(x, out));
  return out;
}

/** Resolve a token's value for a mode (falls back to $value), following aliases. */
export function resolveValue(tokens, path, mode, seen = new Set()) {
  if (seen.has(path)) throw new Error(`alias cycle: ${[...seen, path].join(' -> ')}`);
  seen.add(path);
  const t = tokens.get(path);
  if (!t) return undefined;
  const raw = mode && t.modes[mode] !== undefined ? t.modes[mode] : t.value;
  return deepResolve(tokens, raw, mode, seen);
}

function deepResolve(tokens, v, mode, seen) {
  if (typeof v === 'string') {
    const m = v.match(ALIAS);
    return m ? resolveValue(tokens, m[1], mode, new Set(seen)) : v;
  }
  if (Array.isArray(v)) return v.map((x) => deepResolve(tokens, x, mode, seen));
  if (v && typeof v === 'object' && !('colorSpace' in v) && !('unit' in v)) {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepResolve(tokens, x, mode, seen)]));
  }
  return v;
}

/** True when a token's value in `mode` differs from its base: its own mode value, or an alias chain that reaches one. */
export function dependsOnMode(tokens, path, mode, seen = new Set()) {
  if (seen.has(path)) return false;
  seen.add(path);
  const t = tokens.get(path);
  if (!t) return false;
  if (t.modes[mode] !== undefined) return true;
  return collectAliases(t.value).some((ref) => dependsOnMode(tokens, ref, mode, seen));
}

/** The alias target when a token's value (in a mode, else $value) is exactly one "{path}" reference. */
export function aliasOf(t, mode) {
  const raw = mode && t.modes[mode] !== undefined ? t.modes[mode] : t.value;
  const m = typeof raw === 'string' ? raw.match(ALIAS) : null;
  return m ? m[1] : null;
}

const quoteFamily = (f) => (/^[a-z-]+$/i.test(f) && !/\s/.test(f) ? f : `"${f}"`);
const dim = (v) => (v && typeof v === 'object' && 'unit' in v ? `${v.value}${v.value === 0 ? '' : v.unit}` : String(v));

/** Turn a resolved DTCG value into CSS text. */
export function toCss(type, v) {
  if (v === undefined || v === null) return '';
  switch (type) {
    case 'color': { const c = parseDtcgColor(v); return c ? toHex(c) : String(v); }
    case 'dimension':
    case 'duration': return dim(v);
    case 'cubicBezier': return Array.isArray(v) ? `cubic-bezier(${v.join(', ')})` : String(v);
    case 'fontFamily': return Array.isArray(v) ? v.map(quoteFamily).join(', ') : quoteFamily(String(v));
    case 'shadow': {
      const list = Array.isArray(v) ? v : [v];
      return list.map((s) => `${s.inset ? 'inset ' : ''}${dim(s.offsetX)} ${dim(s.offsetY)} ${dim(s.blur)} ${dim(s.spread ?? 0)} ${toCss('color', s.color)}`).join(', ');
    }
    case 'strokeStyle': return typeof v === 'string' ? v : 'solid';
    case 'typography': {
      // The CSS `font` shorthand (weight size/line-height family); letter-spacing and features are separate vars.
      if (!v || typeof v !== 'object') return String(v);
      return [v.fontWeight, `${toCss('dimension', v.fontSize)}${v.lineHeight !== undefined ? `/${v.lineHeight}` : ''}`, toCss('fontFamily', v.fontFamily)].filter((x) => x !== undefined && x !== '').join(' ');
    }
    default: return typeof v === 'object' ? JSON.stringify(v) : String(v);
  }
}

/** The CSS sub-properties of a typography token (each becomes --type-<role>-<prop>). */
export const TYPE_PROPS = { fontFamily: ['font-family', 'fontFamily'], fontSize: ['font-size', 'dimension'], fontWeight: ['font-weight', 'fontWeight'], lineHeight: ['line-height', 'number'], letterSpacing: ['letter-spacing', 'dimension'] };

/** CSS custom property name for a token path: color.text.primary -> --color-text-primary */
export const varName = (path) => `--${path.replace(/[._]/g, '-')}`;

/** Flat view used by the lint and preview: path -> { type, css: {base, <mode>...}, color: {base, <mode>} } */
export function flatten(loaded) {
  const out = new Map();
  for (const t of loaded.tokens.values()) {
    const entry = { type: t.type, line: t.line, css: {}, color: {}, px: null };
    for (const m of [undefined, ...loaded.modes]) {
      const key = m || 'base';
      // a mode entry when the token, or anything its aliases reach, has a value for that mode
      if (m && !dependsOnMode(loaded.tokens, t.path, m)) continue;
      const v = resolveValue(loaded.tokens, t.path, m);
      entry.css[key] = toCss(t.type, v);
      if (t.type === 'color') entry.color[key] = parseDtcgColor(v);
    }
    const base = resolveValue(loaded.tokens, t.path);
    if (t.type === 'dimension') entry.px = toPx(base);
    if (t.type === 'duration') entry.ms = base && typeof base === 'object' ? (base.unit === 's' ? base.value * 1000 : base.value) : parseFloat(base);
    if (t.type === 'fontFamily') entry.families = Array.isArray(base) ? base : String(base).split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
    out.set(t.path, entry);
  }
  return out;
}

export function toPx(v) {
  if (v && typeof v === 'object' && 'unit' in v) return v.unit === 'rem' ? v.value * 16 : v.value;
  const m = String(v).match(/^(-?[\d.]+)(px|rem)?$/);
  if (!m) return null;
  return m[2] === 'rem' ? parseFloat(m[1]) * 16 : parseFloat(m[1]);
}
