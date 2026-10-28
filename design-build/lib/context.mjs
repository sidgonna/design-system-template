// Loads everything the checks need from a repo root: config, design files, tokens, §4 pairings, state.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { analyze, yamlBlock } from './markdown.mjs';
import { parseYaml } from './yaml.mjs';
import { loadTokens, flatten } from './tokens.mjs';
import { contrastRatio } from './color.mjs';

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
  return { root, config, files, index, core, tokensRel, loaded, flat, pairings, inventory, inventoryRel, state };
}

const refPath = (s) => String(s).replace(/^\{|\}$/g, '');

/** Contrast for every §4 pairing in every mode. */
export function pairingResults(ctx) {
  const modes = ctx.loaded.modes.length ? ctx.loaded.modes : ['base'];
  const out = [];
  for (const p of ctx.pairings) {
    const fg = refPath(p.fg), bg = refPath(p.bg);
    const target = ctx.config.contrast[p.size] ?? ctx.config.contrast.normal;
    const res = { fg, bg, size: p.size || 'normal', target, line: p.line, modes: {} };
    for (const m of modes) {
      const f = ctx.flat.get(fg)?.color, b = ctx.flat.get(bg)?.color;
      const fc = f?.[m] ?? f?.base, bc = b?.[m] ?? b?.base;
      if (!fc || !bc) { res.modes[m] = null; continue; }
      const ratio = contrastRatio(fc, bc);
      res.modes[m] = { ratio: Math.round(ratio * 100) / 100, pass: ratio >= target, fg: fc, bg: bc };
    }
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
