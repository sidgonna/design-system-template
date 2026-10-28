#!/usr/bin/env node
// Generates design-build/preview/tokens.css, tokens.js and tokens.mjs from tokens_file (DTCG). Zero dependencies.
//   tokens.css  CSS variables, light + dark (prefers-color-scheme and [data-theme]); the app imports this once
//   tokens.mjs  ES module (tokens, cssVar(), value()) for app code that needs a value in JS
//   tokens.js   window.DESIGN_TOKENS for the preview page
// Usage (any folder): node design-system/design-build/tokens-css.mjs [--check]   (--check exits 1 if out of date)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContext, pairingResults } from './lib/context.mjs';
import { buildCss, buildJs, buildMjs } from './lib/tokens-css.mjs';
import { findProject, dsPrefix } from './lib/project.mjs';

export function generate(root) {
  const ctx = loadContext(root);
  const pairings = pairingResults(ctx).map((p) => ({ fg: p.fg, bg: p.bg, size: p.size, target: p.target, ratio: Object.fromEntries(Object.entries(p.modes).map(([m, r]) => [m, r?.ratio ?? null])) }));
  return {
    ctx,
    css: buildCss(ctx.loaded, ctx.tokensRel),
    js: buildJs(ctx.loaded, { pairings }, ctx.tokensRel),
    mjs: buildMjs(ctx.loaded, ctx.tokensRel),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const { ctx, css, js, mjs } = generate(root);
  const pre = dsPrefix(findProject(root));
  if (ctx.loaded.problems.length) {
    for (const p of ctx.loaded.problems) console.error(`${pre}${ctx.tokensRel}:${p.line} ${p.message} → fix: ${p.fix}`);
    process.exit(1);
  }
  const out = path.join(root, 'design-build/preview');
  const targets = [['tokens.css', css], ['tokens.js', js], ['tokens.mjs', mjs]];
  if (process.argv.includes('--check')) {
    const stale = targets.filter(([f, c]) => !fs.existsSync(path.join(out, f)) || fs.readFileSync(path.join(out, f), 'utf8') !== c);
    if (stale.length) { console.error(`out of date: ${stale.map(([f]) => pre + 'design-build/preview/' + f).join(', ')} → fix: node ${pre}design-build/tokens-css.mjs`); process.exit(1); }
    console.log('tokens.css, tokens.js and tokens.mjs are up to date');
  } else {
    fs.mkdirSync(out, { recursive: true });
    for (const [f, c] of targets) fs.writeFileSync(path.join(out, f), c);
    console.log(`wrote ${pre}design-build/preview/tokens.css, tokens.js and tokens.mjs (${ctx.loaded.tokens.size} tokens, modes: ${ctx.loaded.modes.join(', ')})`);
  }
}
