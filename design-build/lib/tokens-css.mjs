// Build preview/tokens.css (CSS custom properties, light + dark), preview/tokens.js (window.DESIGN_TOKENS for the
// preview page) and preview/tokens.mjs (ES module for app code) from tokens/tokens.json.
import { flatten, varName } from './tokens.mjs';

export function buildCss(loaded, sourceLabel = 'tokens/tokens.json') {
  const flat = flatten(loaded);
  const base = [], dark = [];
  for (const [path, e] of flat) {
    base.push(`  ${varName(path)}: ${e.css.light ?? e.css.base};`);
    if (e.css.dark !== undefined && e.css.dark !== (e.css.light ?? e.css.base)) dark.push(`  ${varName(path)}: ${e.css.dark};`);
  }
  return `/* GENERATED from ${sourceLabel} by design-build/tokens-css.mjs. Do not edit: change the tokens and re-run. */
:root {
  color-scheme: light dark;
${base.join('\n')}
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${dark.map((l) => '  ' + l).join('\n')}
  }
}
:root[data-theme="dark"] {
${dark.join('\n')}
}
:root[data-theme="light"] { color-scheme: light; }
:root[data-theme="dark"] { color-scheme: dark; }
`;
}

export function buildJs(loaded, extra = {}, sourceLabel = 'tokens/tokens.json') {
  const flat = flatten(loaded);
  const tokens = {};
  for (const [path, e] of flat) tokens[path] = { type: e.type, var: varName(path), css: e.css };
  return `/* GENERATED from ${sourceLabel} by design-build/tokens-css.mjs. Do not edit. */\nwindow.DESIGN_TOKENS = ${JSON.stringify({ modes: loaded.modes, tokens, ...extra }, null, 1)};\n`;
}

export function buildMjs(loaded, sourceLabel = 'tokens/tokens.json') {
  const flat = flatten(loaded);
  const tokens = {};
  for (const [path, e] of flat) tokens[path] = { type: e.type, var: varName(path), css: e.css };
  return `/* GENERATED from ${sourceLabel} by design-build/tokens-css.mjs. Do not edit. */
// ES module for app code. Prefer the CSS variables (import tokens.css once, then use var(--…) in styles);
// use this file only where a value is needed in JS, e.g. a chart color: cssVar('color.data.1').
export const modes = ${JSON.stringify(loaded.modes)};
export const tokens = ${JSON.stringify(tokens, null, 1)};
/** var(--…) reference for a token path, e.g. cssVar('color.brand.primary') → 'var(--color-brand-primary)'. */
export function cssVar(path) {
  const t = tokens[path];
  if (!t) throw new Error(\`unknown design token "\${path}"\`);
  return \`var(\${t.var})\`;
}
/** Resolved value of a token in a mode ('light' | 'dark' | 'base'). */
export function value(path, mode = 'light') {
  const t = tokens[path];
  if (!t) throw new Error(\`unknown design token "\${path}"\`);
  return t.css[mode] ?? t.css.light ?? t.css.base;
}
export default tokens;
`;
}
