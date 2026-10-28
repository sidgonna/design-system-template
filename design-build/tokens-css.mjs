#!/usr/bin/env node
// Generates design-build/preview/tokens.css and tokens.js from tokens_file (DTCG). Zero dependencies.
// Usage: node design-build/tokens-css.mjs [--check]   (--check exits 1 if the files are out of date)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContext, pairingResults } from './lib/context.mjs';
import { buildCss, buildJs } from './lib/tokens-css.mjs';

export function generate(root) {
  const ctx = loadContext(root);
  const pairings = pairingResults(ctx).map((p) => ({ fg: p.fg, bg: p.bg, size: p.size, target: p.target, ratio: Object.fromEntries(Object.entries(p.modes).map(([m, r]) => [m, r?.ratio ?? null])) }));
  return {
    ctx,
    css: buildCss(ctx.loaded, ctx.tokensRel),
    js: buildJs(ctx.loaded, { pairings }, ctx.tokensRel),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const { ctx, css, js } = generate(root);
  if (ctx.loaded.problems.length) {
    for (const p of ctx.loaded.problems) console.error(`${ctx.tokensRel}:${p.line} ${p.message} → fix: ${p.fix}`);
    process.exit(1);
  }
  const out = path.join(root, 'design-build/preview');
  const targets = [['tokens.css', css], ['tokens.js', js]];
  if (process.argv.includes('--check')) {
    const stale = targets.filter(([f, c]) => !fs.existsSync(path.join(out, f)) || fs.readFileSync(path.join(out, f), 'utf8') !== c);
    if (stale.length) { console.error(`out of date: ${stale.map(([f]) => 'design-build/preview/' + f).join(', ')} → fix: node design-build/tokens-css.mjs`); process.exit(1); }
    console.log('tokens.css and tokens.js are up to date');
  } else {
    fs.mkdirSync(out, { recursive: true });
    for (const [f, c] of targets) fs.writeFileSync(path.join(out, f), c);
    console.log(`wrote design-build/preview/tokens.css and tokens.js (${ctx.loaded.tokens.size} tokens, modes: ${ctx.loaded.modes.join(', ')})`);
  }
}
