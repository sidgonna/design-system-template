#!/usr/bin/env node
// Generates the reference tier (core.md §13.1): one 11-step OKLCH ramp (50…950) per seed, written as DTCG
// `palette.<name>.<step>` tokens into tokens_file and into every sub-brand file (tokens/brands/<id>.json), then
// regenerates preview/tokens.css, tokens.js and tokens.mjs. Zero dependencies.
//   Seeds: core.md §13 `ramps:` (the source), else the seed stored in each palette group's $extensions.
//   A sub-brand's seeds live in its own file (palette.<name>.$extensions["org.design-system.ramp"].seed).
// Usage (any folder): node design-system/design-build/ramps.mjs [--check]   (--check exits 1 if a ramp is out of date)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContext } from './lib/context.mjs';
import { yamlBlockKeys, unwrap } from './lib/markdown.mjs';
import { rampGroup, RAMP_EXT, STEPS } from './lib/ramps.mjs';
import { findProject, dsPrefix } from './lib/project.mjs';
import { formatJson } from './lib/json-format.mjs';

/** Seeds from core.md §13 `ramps:` → { name: '#rrggbb' } (placeholders unwrapped; TBD/empty skipped). */
export function coreSeeds(ctx) {
  const blk = ctx.core && yamlBlockKeys(ctx.core.analysis, 'tokens', ['tokens', 'modes', 'ramps']);
  const out = {};
  for (const [k, v] of Object.entries(blk?.ramps?.value || {})) {
    const s = String(unwrap(v) ?? '').trim();
    if (s && !/^TBD|…/.test(s)) out[k] = s;
  }
  return { seeds: out, lines: blk?.ramps?.lines };
}

const seedsIn = (json) => Object.fromEntries(Object.entries(json.palette || {}).filter(([, g]) => g?.$extensions?.[RAMP_EXT]?.seed).map(([k, g]) => [k, g.$extensions[RAMP_EXT].seed]));

/** Rewrite json.palette so every seeded ramp matches its seed; keeps palette first and the other palette tokens. */
export function applyRamps(json, seeds) {
  const palette = { ...(json.palette || {}) };
  for (const [name, seed] of Object.entries(seeds)) palette[name] = rampGroup(name, seed);
  const { $description, palette: _, ...rest } = json;
  return { ...($description !== undefined ? { $description } : {}), palette, ...rest };
}

/** [{ rel, abs, text }] for tokens_file and each sub-brand file, after re-deriving their ramps. */
export function rampOutputs(root) {
  const ctx = loadContext(root);
  const out = [];
  const abs = path.join(root, ctx.tokensRel);
  const json = JSON.parse(fs.readFileSync(abs, 'utf8'));
  const { seeds } = coreSeeds(ctx);
  out.push({ rel: ctx.tokensRel, abs, text: formatJson(applyRamps(json, { ...seedsIn(json), ...seeds })) });
  for (const b of ctx.brands) {
    const babs = path.join(root, b.rel);
    if (!fs.existsSync(babs)) continue;
    const bj = JSON.parse(fs.readFileSync(babs, 'utf8'));
    out.push({ rel: b.rel, abs: babs, text: formatJson(applyRamps(bj, seedsIn(bj))) });
  }
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const pre = dsPrefix(findProject(root));
  let outs;
  try { outs = rampOutputs(root); } catch (e) { console.error(`ramps.mjs: ${e.message} → fix: give every §13 ramps seed a colour, e.g. primary: "#0b5d52"`); process.exit(1); }
  const stale = outs.filter((o) => fs.readFileSync(o.abs, 'utf8') !== o.text);
  if (process.argv.includes('--check')) {
    if (stale.length) { console.error(`out of date: ${stale.map((o) => pre + o.rel).join(', ')} → fix: node ${pre}design-build/ramps.mjs`); process.exit(1); }
    console.log(`ramps are up to date (${outs.length} file(s), ${STEPS.length} steps per ramp)`);
  } else {
    for (const o of stale) fs.writeFileSync(o.abs, o.text);
    const { generate } = await import('./tokens-css.mjs');
    const gen = generate(root);
    const dir = path.join(root, 'design-build/preview');
    for (const [f, c] of [['tokens.css', gen.css], ['tokens.js', gen.js], ['tokens.mjs', gen.mjs]]) fs.writeFileSync(path.join(dir, f), c);
    console.log(`${stale.length ? `wrote ${stale.map((o) => pre + o.rel).join(', ')}` : 'ramps already matched their seeds'}; regenerated ${pre}design-build/preview/tokens.css, tokens.js, tokens.mjs`);
  }
}
