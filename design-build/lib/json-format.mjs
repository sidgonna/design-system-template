// Readable JSON for tokens files: an object or array that fits on one line (≤ 120 columns with its
// indent and key) is written inline, `{ "value": 4, "unit": "px" }`; anything longer is expanded.
const WIDTH = 120;
const inline = (v) => {
  if (Array.isArray(v)) return `[${v.map(inline).join(', ')}]`;
  if (v && typeof v === 'object') { const e = Object.entries(v); return e.length ? `{ ${e.map(([k, x]) => `${JSON.stringify(k)}: ${inline(x)}`).join(', ')} }` : '{}'; }
  return JSON.stringify(v);
};
function fmt(v, indent, lead) {
  if (!v || typeof v !== 'object') return JSON.stringify(v);
  const one = inline(v);
  if (indent.length + lead + one.length <= WIDTH) return one;
  const pad = indent + '  ';
  if (Array.isArray(v)) return `[\n${v.map((x) => pad + fmt(x, pad, 0)).join(',\n')}\n${indent}]`;
  return `{\n${Object.entries(v).map(([k, x]) => { const key = `${JSON.stringify(k)}: `; return pad + key + fmt(x, pad, key.length + 1); }).join(',\n')}\n${indent}}`;
}
/** JSON text with a trailing newline. */
export const formatJson = (value) => fmt(value, '', 0) + '\n';
