// Build preview/tokens.css (CSS custom properties, light + dark) and preview/tokens.js from tokens/tokens.json.
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
