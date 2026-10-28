// Loads everything the checks need from a repo root: config, design files, tokens, §4 pairings, state.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { analyze, yamlBlock } from './markdown.mjs';
import { parseYaml } from './yaml.mjs';
import { loadTokens, flatten } from './tokens.mjs';
import { contrastRatio, apcaContrast } from './color.mjs';

export function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

export function loadContext(root) {
  const configPath = path.join(root, 'design-build/lint.config.json');
  const config = readJson(configPath, null);
  if (!config) throw new Error(`cannot read ${configPath}`);
  const files = new Map();
  for (const rel of config.design_files) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) continue;
    const text = fs.readFileSync(abs, 'utf8');
    const analysis = analyze(text);
    let fm = {};
    try { fm = analysis.frontMatter ? parseYaml(analysis.frontMatter.text, analysis.frontMatter.startLine).value || {} : {}; } catch { fm = {}; }
    files.set(rel, { rel, abs, text, analysis, fm });
  }
  const index = files.get(config.index);
  const tf = String(index?.fm?.tokens_file ?? 'tokens/tokens.json').replace(/^\{\{|\}\}$/g, '');
  const tokensRel = tf;
  const loaded = loadTokens(path.join(root, tokensRel));
  const flat = flatten(loaded);
  // themes: design.md front matter `themes:` (first = default); without it, the token modes or one light theme
  const fmThemes = Array.isArray(index?.fm?.themes) ? index.fm.themes.map((t) => String(t).replace(/^\{\{|\}\}$/g, '').trim()).filter(Boolean) : null;
  const themes = fmThemes?.length ? fmThemes : (loaded.modes.length ? loaded.modes : ['light']);
  // sub-brands: front matter `brands: [{ id, name }]`; each re-seeds the palette in tokens/brands/<id>.json (core.md §13.5)
  const brandsDir = path.join(path.dirname(path.join(root, tokensRel)), 'brands');
  const brands = (Array.isArray(index?.fm?.brands) ? index.fm.brands : []).map((b) => (typeof b === 'string' ? { id: b } : b || {})).filter((b) => b.id).map((b) => {
    const rel = path.relative(root, path.join(brandsDir, `${b.id}.json`)).split(path.sep).join('/');
    const own = fs.existsSync(path.join(root, rel)) ? loadTokens(path.join(root, rel)) : null;
    const merged = own ? { ...loaded, tokens: new Map([...loaded.tokens, ...own.tokens]) } : null;
    return { id: String(b.id), name: String(b.name ?? b.id), rel, own, loaded: merged, flat: merged ? flatten(merged) : null };
  });
  const core = files.get('design/core.md');
  const pairings = [];
  if (core) {
    const pb = yamlBlock(core.analysis, 'pairings');
    (pb?.value || []).forEach((p, i) => pairings.push({ ...p, line: pb.lines.get(`pairings.${i}`) ?? pb.block.startLine }));
  }
  const inventoryRel = 'design-build/inventory.json';
  const inventory = readJson(path.join(root, inventoryRel), null);
  let state = {};
  try { state = parseYaml(fs.readFileSync(path.join(root, 'design-build/state.yaml'), 'utf8')).value || {}; } catch { state = {}; }
  return { root, config, files, index, core, tokensRel, loaded, flat, themes, brands, pairings, inventory, inventoryRel, state };
}

const refPath = (s) => String(s).replace(/^\{|\}$/g, '');

/** Colour of a flattened token in a theme (its own value for that mode, else its base). */
export const colorIn = (flat, p, m) => { const c = flat.get(p)?.color; return c?.[m] ?? c?.base ?? null; };

/** WCAG 2 ratio (the gate) and APCA Lc (advisory) for fg on bg. */
export function measure(fc, bc, target) {
  const ratio = contrastRatio(fc, bc);
  return { ratio: Math.round(ratio * 100) / 100, pass: ratio >= target, lc: Math.round(apcaContrast(fc, bc) * 10) / 10, fg: fc, bg: bc };
}

/** Contrast for every §4 pairing in every theme, and in every sub-brand × theme (p.brands[id][theme]). */
export function pairingResults(ctx) {
  const modes = ctx.loaded.modes.length ? ctx.loaded.modes : ['base'];
  const out = [];
  const run = (flat, fg, bg, target) => Object.fromEntries(modes.map((m) => {
    const fc = colorIn(flat, fg, m), bc = colorIn(flat, bg, m);
    return [m, fc && bc ? measure(fc, bc, target) : null];
  }));
  for (const p of ctx.pairings) {
    const fg = refPath(p.fg), bg = refPath(p.bg);
    const target = ctx.config.contrast[p.size] ?? ctx.config.contrast.normal;
    const res = { fg, bg, size: p.size || 'normal', target, line: p.line, modes: run(ctx.flat, fg, bg, target), brands: {} };
    for (const b of ctx.brands || []) if (b.flat) res.brands[b.id] = run(b.flat, fg, bg, target);
    out.push(res);
  }
  return out;
}

export function gitHead(root) {
  try { return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return null; }
}

/** Update one line under `checks:` in state.yaml (keeps the rest of the file and its comments). */
export function recordCheck(root, name, fields) {
  const file = path.join(root, 'design-build/state.yaml');
  if (!fs.existsSync(file)) return false;
  let text = fs.readFileSync(file, 'utf8');
  const fmt = (v) => (v === null || v === undefined ? 'null' : typeof v === 'number' || typeof v === 'boolean' ? String(v) : /^[\w.:+-]+$/.test(String(v)) ? String(v) : JSON.stringify(String(v)));
  const line = `  ${name}: { ${Object.entries(fields).map(([k, v]) => `${k}: ${fmt(v)}`).join(', ')} }`;
  if (!/^checks:/m.test(text)) text = text.replace(/\s*$/, '\n') + 'checks:\n';
  const re = new RegExp(`^  ${name}:.*$`, 'm');
  if (re.test(text)) text = text.replace(re, line);
  else text = text.replace(/^checks:.*$/m, (m) => `${m}\n${line}`);
  fs.writeFileSync(file, text);
  return true;
}
