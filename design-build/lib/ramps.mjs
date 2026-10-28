// lib/ramps.mjs — the reference tier (core.md §13.1): an 11-step OKLCH ramp (50…950) from one seed colour.
// Deterministic and zero-dependency, so lint.mjs can recompute every ramp and fail when tokens.json drifts from it.
// The seed lands unchanged on the step whose lightness target is nearest; the other steps keep the seed's hue,
// take the target lightness (nudged toward the seed's offset, halving per step away), and scale chroma by 4L(1−L) (pale tints, deep shades), reduced until in sRGB gamut.
import { parseColor, srgbToOklch, oklchToSrgb, toDtcgColor, toHex } from './color.mjs';

export const STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
export const L_TARGET = [0.972, 0.937, 0.882, 0.81, 0.722, 0.634, 0.548, 0.466, 0.386, 0.303, 0.208];
export const RAMP_EXT = 'org.design-system.ramp';   // group $extensions key that stores { seed }

const taper = (L) => Math.max(0.02, 4 * L * (1 - L));

function inGamut(L, C, H) { return oklchToSrgb(L, C, H).inGamut; }

/** { step: {r,g,b} } for a seed colour string (any CSS colour lint understands). Throws on an unreadable seed. */
export function ramp(seed) {
  const s = parseColor(seed);
  if (!s) throw new Error(`seed "${seed}" is not a colour`);
  const { L: Ls, C: Cs, H } = srgbToOklch(s);
  let anchor = 0;
  L_TARGET.forEach((L, i) => { if (Math.abs(L - Ls) < Math.abs(L_TARGET[anchor] - Ls)) anchor = i; });
  const out = {};
  STEPS.forEach((step, i) => {
    if (i === anchor) { out[step] = { r: s.r, g: s.g, b: s.b }; return; }
    // neighbours shift part of the way toward the seed's offset (halving per step), so spacing stays even
    const L = L_TARGET[i] + (Ls - L_TARGET[anchor]) * 0.5 ** Math.abs(i - anchor);
    let C = (Cs * taper(L)) / taper(Ls);
    if (Cs < 0.0001) C = 0;
    // binary search the largest in-gamut chroma at or below the wanted one
    if (!inGamut(L, C, H)) {
      let lo = 0, hi = C;
      for (let k = 0; k < 24; k++) { const mid = (lo + hi) / 2; if (inGamut(L, mid, H)) lo = mid; else hi = mid; }
      C = lo;
    }
    const c = oklchToSrgb(L, C, H);
    out[step] = { r: c.r, g: c.g, b: c.b };
  });
  return { anchor: STEPS[anchor], steps: out };
}

/** The DTCG group for a ramp: { $type, $description, $extensions: { [RAMP_EXT]: { seed } }, 50: {$value}, … }. */
export function rampGroup(name, seed) {
  const { anchor, steps } = ramp(seed);
  const g = { $type: 'color', $description: `Reference ramp "${name}" generated from seed ${seed} (lands on ${anchor}) by design-build/ramps.mjs. Do not edit by hand: change the seed in core.md §13 ramps and re-run.`, $extensions: { [RAMP_EXT]: { seed } } };
  for (const step of STEPS) g[step] = { $value: toDtcgColor(steps[step]) };
  return g;
}

/** Hex of every step, for comparing a stored ramp with the one the seed makes. */
export const rampHex = (seed) => Object.fromEntries(Object.entries(ramp(seed).steps).map(([k, c]) => [k, toHex(c)]));

/** Problems with the ramps stored in a tokens JSON: a step that differs from what its seed makes, or a missing / extra step. */
export function checkRamps(json, file) {
  const out = [];
  for (const [name, g] of Object.entries(json?.palette || {})) {
    const seed = g?.$extensions?.[RAMP_EXT]?.seed;
    if (!seed) continue;
    let want;
    try { want = rampHex(seed); } catch (e) { out.push({ file, path: `palette.${name}`, message: `palette.${name}: ${e.message}` }); continue; }
    for (const st of STEPS) {
      const v = g[st]?.$value;
      const hex = v?.hex ?? (v?.components ? toHex({ r: v.components[0], g: v.components[1], b: v.components[2] }) : v);
      if (!g[st]) out.push({ file, path: `palette.${name}`, message: `palette.${name}.${st} is missing (seed ${seed})` });
      else if (String(hex).toLowerCase() !== want[st]) out.push({ file, path: `palette.${name}.${st}`, message: `palette.${name}.${st} is ${hex}, but seed ${seed} makes ${want[st]}` });
    }
    for (const k of Object.keys(g)) if (!k.startsWith('$') && !STEPS.includes(k)) out.push({ file, path: `palette.${name}.${k}`, message: `palette.${name}.${k} is not a ramp step (${STEPS.join(', ')})` });
  }
  return out;
}
