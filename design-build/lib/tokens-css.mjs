// Build preview/tokens.css (CSS custom properties for every theme and sub-brand), preview/tokens.js
// (window.DESIGN_TOKENS for the board) and preview/tokens.mjs (ES module for app code) from tokens/tokens.json.
//
// Tiers stay visible in the CSS: a token whose value is one alias is written as var(--target), so
// --component-button-primary-bg: var(--color-brand-primary) and --color-brand-primary: var(--palette-primary-700).
// A theme then only re-points the system roles, and a sub-brand only re-seeds the palette (core.md §13).
import { flatten, varName, toCss, resolveValue, toPx, TYPE_PROPS } from './tokens.mjs';

export const TYPE_EXT = 'org.design-system.type';
/** Light or dark UA colour scheme for a theme name (dark, brand-dark… are dark; light, high-contrast… are light). */
export const schemeOf = (theme) => (/(^|-)dark($|-)/.test(theme) ? 'dark' : 'light');
// Themes with an OS-level media query; any other theme name applies only with data-theme="<name>".
// light is listed so a dark-first system (themes[0] === dark) still follows prefers-color-scheme: light.
// A light-first system never emits it: light is the default, so it is not in themes.slice(1).
const MEDIA = { light: '(prefers-color-scheme: light)', dark: '(prefers-color-scheme: dark)', 'high-contrast': '(prefers-contrast: more)' };

const isAlias = (v) => typeof v === 'string' && /^\{[^{}]+\}$/.test(v);
const ref = (v) => `var(${varName(v.slice(1, -1))})`;
const r4 = (n) => Math.round(n * 10000) / 10000;

/** CSS for a token in a mode: one alias becomes var(--target); anything else is the resolved value. */
function cssOf(flat, t, mode) {
  const raw = mode && t.modes[mode] !== undefined ? t.modes[mode] : t.value;
  if (isAlias(raw)) return ref(raw);
  const css = flat.get(t.path)?.css || {};
  return css[mode] ?? css.base;
}

/** ["kern", "liga"] → '"kern" 1, "liga" 1' (OpenType feature tags that a type role switches on). */
export const featureCss = (tags) => (Array.isArray(tags) ? tags.map((t) => `"${t}" 1`).join(', ') : String(tags));

/** clamp(min, a + b·vw, max) between two viewport widths (all from tokens), for fluid display sizes. */
export function fluidSize(loaded, minRef, maxRef, vMinRef, vMaxRef) {
  const px = (r) => toPx(resolveValue(loaded.tokens, String(r).replace(/^\{|\}$/g, '')) ?? r);
  const lo = px(minRef), hi = px(maxRef), v0 = px(vMinRef), v1 = px(vMaxRef);
  if ([lo, hi, v0, v1].some((x) => x === null || Number.isNaN(x)) || v1 <= v0) return null;
  const slope = (hi - lo) / (v1 - v0), icpt = lo - slope * v0;
  return `clamp(${r4(lo / 16)}rem, ${r4(icpt / 16)}rem + ${r4(slope * 100)}vw, ${r4(hi / 16)}rem)`;
}

/** Declarations for a typography token: the font shorthand plus one var per property, and :lang() overrides. */
function typeDecls(loaded, t) {
  const v = t.value && typeof t.value === 'object' ? t.value : {};
  const ext = t.extensions?.[TYPE_EXT] || {};
  const base = varName(t.path);
  const field = (k, val) => (val === undefined ? null : isAlias(val) ? ref(val) : toCss(TYPE_PROPS[k][1], val));
  const props = (vals) => {
    const out = [];
    for (const [k, [prop]] of Object.entries(TYPE_PROPS)) {
      let css = field(k, vals[k]);
      if (k === 'fontSize' && vals.__fluid) css = vals.__fluid;
      if (css !== null) out.push([`${base}-${prop}`, css]);
    }
    if (vals.__features?.length) out.push([`${base}-font-feature-settings`, featureCss(vals.__features)]);
    const has = (p) => out.some(([n]) => n === `${base}-${p}`);
    if (has('font-size') && has('font-family')) out.push([base, `${has('font-weight') ? `var(${base}-font-weight) ` : ''}var(${base}-font-size)${has('line-height') ? `/var(${base}-line-height)` : ''} var(${base}-font-family)`]);
    return out;
  };
  const f = ext.fluid;
  const fluid = f ? fluidSize(loaded, f.min, v.fontSize, f.minViewport ?? '{viewport.mobile}', f.maxViewport ?? '{viewport.desktop}') : null;
  const root = props({ ...v, __fluid: fluid, __features: ext.fontFeatures });
  const langs = Object.entries(ext.scripts || {}).map(([lang, o]) => [lang, props({ ...v, ...o, __fluid: fluid, __features: o.fontFeatures ?? ext.fontFeatures })]);
  return { root, langs };
}

/**
 * opts.themes: theme names, first = default (design.md front matter `themes:`); opts.brands: [{ id, loaded }].
 */
export function buildCss(loaded, sourceLabel = 'tokens/tokens.json', opts = {}) {
  const themes = opts.themes?.length ? opts.themes : (loaded.modes.length ? loaded.modes : ['light']);
  const def = themes[0];
  const flat = flatten(loaded);
  const rootDecls = [], langBlocks = new Map();
  const declFor = (t, mode) => cssOf(flat, t, mode);
  for (const t of loaded.tokens.values()) {
    if (t.type === 'typography') {
      const { root, langs } = typeDecls(loaded, t);
      rootDecls.push(...root);
      for (const [lang, ds] of langs) langBlocks.set(lang, [...(langBlocks.get(lang) || []), ...ds]);
      continue;
    }
    rootDecls.push([varName(t.path), declFor(t, def)]);
  }
  // a theme block re-declares only what differs from the default theme (pure aliases follow through var())
  const themeDecls = (th) => [...loaded.tokens.values()].filter((t) => t.type !== 'typography' && declFor(t, th) !== declFor(t, def)).map((t) => [varName(t.path), declFor(t, th)]);
  const block = (sel, decls, indent = '') => `${indent}${sel} {\n${decls.map(([n, v]) => `${indent}  ${n}: ${v};`).join('\n')}\n${indent}}`;
  const schemes = [...new Set(themes.map(schemeOf))];
  const out = [`/* GENERATED from ${sourceLabel} by design-build/tokens-css.mjs. Do not edit: change the tokens and re-run. */`,
    `/* Themes: ${themes.join(', ')} (default ${def}; set <html data-theme="…"> to force one). Brands: ${(opts.brands || []).map((b) => b.id).join(', ') || 'none'} (<html data-brand="…">). */`];
  out.push(block(':root', [['color-scheme', schemeOf(def) === 'light' && schemes.includes('dark') ? 'light dark' : schemeOf(def)], ...rootDecls]));
  for (const th of themes.slice(1)) {
    const decls = themeDecls(th);
    if (MEDIA[th] && !(th === 'dark' && schemeOf(def) === 'dark')) out.push(`@media ${MEDIA[th]} {\n${block(':root:not([data-theme])', [['color-scheme', schemeOf(th)], ...decls], '  ')}\n}`);
  }
  for (const th of themes) out.push(block(`:root[data-theme="${th}"]`, [['color-scheme', schemeOf(th)], ...(th === def ? [] : themeDecls(th))]));
  for (const b of opts.brands || []) {
    const bflat = flatten(b.loaded);
    const decls = [...b.loaded.tokens.values()].filter((t) => t.type !== 'typography').map((t) => [varName(t.path), cssOf(bflat, t, def)]).filter(([n, v], i) => v !== rootDecls.find(([m]) => m === n)?.[1]);
    out.push(block(`:root[data-brand="${b.id}"]`, decls));
  }
  for (const [lang, ds] of langBlocks) out.push(block(`:lang(${lang})`, ds));
  return out.join('\n') + '\n';
}

const tokenTable = (loaded) => {
  const tokens = {};
  for (const [path, e] of flatten(loaded)) tokens[path] = { type: e.type, var: varName(path), css: e.css };
  return tokens;
};

export function buildJs(loaded, extra = {}, sourceLabel = 'tokens/tokens.json') {
  return `/* GENERATED from ${sourceLabel} by design-build/tokens-css.mjs. Do not edit. */\nwindow.DESIGN_TOKENS = ${JSON.stringify({ modes: loaded.modes, tokens: tokenTable(loaded), ...extra }, null, 1)};\n`;
}

export function buildMjs(loaded, sourceLabel = 'tokens/tokens.json', opts = {}) {
  const themes = opts.themes?.length ? opts.themes : (loaded.modes.length ? loaded.modes : ['light']);
  return `/* GENERATED from ${sourceLabel} by design-build/tokens-css.mjs. Do not edit. */
// ES module for app code. Prefer the CSS variables (import tokens.css once, then use var(--…) in styles);
// use this file only where a value is needed in JS, e.g. a chart color: cssVar('color.data.1').
export const modes = ${JSON.stringify(loaded.modes)};
/** The themes this system ships, first = default (design.md front matter). */
export const themes = ${JSON.stringify(themes)};
export const tokens = ${JSON.stringify(tokenTable(loaded), null, 1)};
/** var(--…) reference for a token path, e.g. cssVar('color.brand.primary') → 'var(--color-brand-primary)'. */
export function cssVar(path) {
  const t = tokens[path];
  if (!t) throw new Error(\`unknown design token "\${path}"\`);
  return \`var(\${t.var})\`;
}
/** Resolved value of a token in a theme (${themes.map((t) => `'${t}'`).join(' | ')} | 'base'). */
export function value(path, mode = ${JSON.stringify(themes[0])}) {
  const t = tokens[path];
  if (!t) throw new Error(\`unknown design token "\${path}"\`);
  return t.css[mode] ?? t.css[${JSON.stringify(themes[0])}] ?? t.css.base;
}
export default tokens;
`;
}
