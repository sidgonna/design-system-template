#!/usr/bin/env node
// Generates design-build/preview/tokens.css, tokens.js and tokens.mjs from tokens_file (DTCG). Zero dependencies.
//   tokens.css  CSS variables for every theme (prefers-color-scheme / prefers-contrast and [data-theme]) and
//               sub-brand ([data-brand]); the app imports this once
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
  const pick = (k) => (modes) => Object.fromEntries(Object.entries(modes).map(([m, r]) => [m, r?.[k] ?? null]));
  const pairings = pairingResults(ctx).map((p) => ({ fg: p.fg, bg: p.bg, size: p.size, target: p.target, ratio: pick('ratio')(p.modes), apca: pick('lc')(p.modes) }));
  const opts = { themes: ctx.themes, brands: ctx.brands.filter((b) => b.loaded) };
  const brands = ctx.brands.map((b) => ({ id: b.id, name: b.name }));
  return {
    ctx,
    css: buildCss(ctx.loaded, ctx.tokensRel, opts),
    js: buildJs(ctx.loaded, { themes: ctx.themes, brands, pairings }, ctx.tokensRel),
    mjs: buildMjs(ctx.loaded, ctx.tokensRel, opts),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const { ctx, css, js, mjs } = generate(root);
  const pre = dsPrefix(findProject(root));
  const problems = [...ctx.loaded.problems.map((p) => ({ ...p, rel: ctx.tokensRel })), ...ctx.brands.flatMap((b) => (b.own?.problems || []).map((p) => ({ ...p, rel: b.rel })))];
  if (problems.length) {
    for (const p of problems) console.error(`${pre}${p.rel}:${p.line} ${p.message} → fix: ${p.fix}`);
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
    console.log(`wrote ${pre}design-build/preview/tokens.css, tokens.js and tokens.mjs (${ctx.loaded.tokens.size} tokens, ${ctx.loaded.modes.length ? `modes: ${ctx.loaded.modes.join(', ')}` : `one theme: ${ctx.themes[0]}`})`);
  }
}
