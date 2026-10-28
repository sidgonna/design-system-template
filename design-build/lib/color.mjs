// Color math for the design checks. Zero dependencies (Node >= 18).
// sRGB parsing, OKLCH/OKLab <-> sRGB, WCAG 2.x relative luminance and contrast,
// alpha compositing and an OKLab distance for "nearest token" suggestions.

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

const NAMED = { black: '#000000', white: '#ffffff', transparent: '#00000000' };

function num(token, scale = 1) {
  const t = String(token).trim();
  if (t === 'none') return 0;
  if (t.endsWith('%')) return (parseFloat(t) / 100) * scale;
  return parseFloat(t);
}

function hueDeg(token) {
  const t = String(token).trim();
  if (t === 'none') return 0;
  const v = parseFloat(t);
  if (t.endsWith('rad')) return (v * 180) / Math.PI;
  if (t.endsWith('turn')) return v * 360;
  if (t.endsWith('grad')) return v * 0.9;
  return v;
}

/** Split CSS color function args: "a b c / d" or "a, b, c, d". */
function splitArgs(body) {
  let alpha;
  let main = body;
  const slash = body.indexOf('/');
  if (slash >= 0) { main = body.slice(0, slash); alpha = body.slice(slash + 1).trim(); }
  const parts = main.split(/[\s,]+/).filter(Boolean);
  if (alpha === undefined && parts.length === 4) alpha = parts.pop();
  return { parts, alpha };
}

export function parseHex(hex) {
  let h = hex.replace('#', '').trim();
  if (!/^([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(h)) return null;
  if (h.length <= 4) h = [...h].map((c) => c + c).join('');
  const n = (i) => parseInt(h.slice(i, i + 2), 16) / 255;
  return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) : 1 };
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: f(0), g: f(8), b: f(4) };
}

export function oklabToSrgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  const inGamut = [lr, lg, lb].every((v) => v >= -1e-4 && v <= 1 + 1e-4);
  return { r: clamp01(toGamma(clamp01(lr))), g: clamp01(toGamma(clamp01(lg))), b: clamp01(toGamma(clamp01(lb))), inGamut };
}

export function oklchToSrgb(L, C, H) {
  const hr = (H * Math.PI) / 180;
  return oklabToSrgb(L, C * Math.cos(hr), C * Math.sin(hr));
}

export function srgbToOklab({ r, g, b }) {
  const lr = toLinear(r), lg = toLinear(g), lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

export function srgbToOklch(rgb) {
  const { L, a, b } = srgbToOklab(rgb);
  const C = Math.sqrt(a * a + b * b);
  let H = (Math.atan2(b, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { L, C, H };
}

/** Parse a CSS color string (hex, rgb[a], hsl[a], oklch, oklab, a few names). Returns {r,g,b,a} in 0..1 or null. */
export function parseColor(input) {
  if (input == null) return null;
  const s = String(input).trim().toLowerCase();
  if (s.startsWith('#')) return parseHex(s);
  if (NAMED[s]) return parseHex(NAMED[s]);
  const m = s.match(/^(rgba?|hsla?|oklch|oklab)\((.*)\)$/);
  if (!m) return null;
  const { parts, alpha } = splitArgs(m[2]);
  if (parts.length < 3) return null;
  const a = alpha === undefined ? 1 : clamp01(num(alpha, 1));
  let rgb;
  if (m[1].startsWith('rgb')) {
    rgb = { r: num(parts[0], 255) / 255, g: num(parts[1], 255) / 255, b: num(parts[2], 255) / 255 };
  } else if (m[1].startsWith('hsl')) {
    rgb = hslToRgb(hueDeg(parts[0]), num(parts[1], 100) / 100, num(parts[2], 100) / 100);
  } else if (m[1] === 'oklch') {
    rgb = oklchToSrgb(num(parts[0], 1), num(parts[1], 0.4), hueDeg(parts[2]));
  } else {
    rgb = oklabToSrgb(num(parts[0], 1), num(parts[1], 0.4), num(parts[2], 0.4));
  }
  if ([rgb.r, rgb.g, rgb.b].some((v) => Number.isNaN(v))) return null;
  return { r: clamp01(rgb.r), g: clamp01(rgb.g), b: clamp01(rgb.b), a };
}

/** A DTCG 2025.10 color value: string, or { colorSpace, components, alpha?, hex? }. */
export function parseDtcgColor(v) {
  if (typeof v === 'string') return parseColor(v);
  if (!v || typeof v !== 'object') return null;
  const alpha = typeof v.alpha === 'number' ? v.alpha : 1;
  const c = Array.isArray(v.components) ? v.components.map((x) => (x === 'none' ? 0 : Number(x))) : null;
  const space = String(v.colorSpace || '').toLowerCase();
  let rgb = null;
  if (c && c.length === 3) {
    if (space === 'srgb') rgb = { r: c[0], g: c[1], b: c[2] };
    else if (space === 'srgb-linear') rgb = { r: toGamma(c[0]), g: toGamma(c[1]), b: toGamma(c[2]) };
    else if (space === 'oklch') rgb = oklchToSrgb(c[0], c[1], c[2]);
    else if (space === 'oklab') rgb = oklabToSrgb(c[0], c[1], c[2]);
    else if (space === 'hsl') rgb = hslToRgb(c[0], c[1] / 100, c[2] / 100);
  }
  if (!rgb && typeof v.hex === 'string') rgb = parseHex(v.hex);
  if (!rgb) return null;
  return { r: clamp01(rgb.r), g: clamp01(rgb.g), b: clamp01(rgb.b), a: alpha };
}

const hex2 = (v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0');
export function toHex({ r, g, b, a = 1 }) {
  return `#${hex2(r)}${hex2(g)}${hex2(b)}${a < 1 ? hex2(a) : ''}`;
}

/** DTCG object form for an sRGB color (what tokens.json stores). */
export function toDtcgColor(c) {
  const round = (v) => Math.round(v * 10000) / 10000;
  const out = { colorSpace: 'srgb', components: [round(c.r), round(c.g), round(c.b)] };
  if (c.a !== undefined && c.a < 1) out.alpha = round(c.a);
  out.hex = toHex({ ...c, a: 1 });
  return out;
}

export function luminance({ r, g, b }) {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** Composite fg (with alpha) over an opaque bg. */
export function composite(fg, bg) {
  const a = fg.a ?? 1;
  return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 };
}

/** WCAG 2.x contrast ratio. Translucent colors are composited (bg over white, fg over bg). */
export function contrastRatio(fg, bg) {
  const solidBg = (bg.a ?? 1) < 1 ? composite(bg, { r: 1, g: 1, b: 1 }) : bg;
  const solidFg = (fg.a ?? 1) < 1 ? composite(fg, solidBg) : fg;
  const l1 = luminance(solidFg), l2 = luminance(solidBg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** Perceptual distance (OKLab Euclidean x 100; ~2 is just noticeable). */
export function deltaE(c1, c2) {
  const a = srgbToOklab(c1), b = srgbToOklab(c2);
  return Math.hypot(a.L - b.L, a.a - b.a, a.b - b.b) * 100;
}

/**
 * Smallest OKLCH lightness change to `fg` (hue and chroma kept) that reaches `target` contrast on `bg`.
 * Returns { color, ratio, L } or null if no lightness works.
 */
export function suggestPassingColor(fg, bg, target) {
  const { L, C, H } = srgbToOklch(fg);
  let best = null;
  for (const dir of [-1, 1]) {
    for (let step = 1; step <= 100; step++) {
      const nl = L + dir * step * 0.01;
      if (nl < 0 || nl > 1) break;
      const cand = oklchToSrgb(nl, C, H);
      const col = { r: cand.r, g: cand.g, b: cand.b, a: 1 };
      const ratio = contrastRatio(col, bg);
      if (ratio >= target + 0.05) {
        if (!best || step < best.step) best = { color: col, ratio, L: nl, step };
        break;
      }
    }
  }
  return best;
}
