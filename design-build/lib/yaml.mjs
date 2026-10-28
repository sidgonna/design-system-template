// A small YAML-subset parser for the spec blocks in design.md and design/*.md. Zero dependencies.
// Supports: block maps, block sequences ("- x", "- key: v"), flow maps/sequences ({a: 1}, [a, b]),
// single/double-quoted and plain scalars, comments. Every leaf records its 1-based source line.
// Not supported (not used by the template): anchors, tags, multi-line plain scalars, block scalars (| >).

function stripComment(line) {
  let q = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '\\' && q === '"') { i++; continue; } if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") q = ch;
    else if (ch === '#' && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
  }
  return line;
}

function scalar(raw) {
  const t = raw.trim();
  if (t === '' || t === '~' || t === 'null') return null;
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  return t;
}

class Flow {
  constructor(text, line, lines, path) { this.s = text; this.i = 0; this.line = line; this.lines = lines; this.path = path; }
  ws() { while (this.i < this.s.length && /\s/.test(this.s[this.i])) this.i++; }
  value(path) {
    this.ws();
    const ch = this.s[this.i];
    if (ch === '{') return this.map(path);
    if (ch === '[') return this.seq(path);
    const v = this.str();
    this.lines.set(path, this.line);
    return v;
  }
  str(stops = ',}]') {
    this.ws();
    const ch = this.s[this.i];
    if (ch === '"' || ch === "'") {
      let out = '';
      this.i++;
      while (this.i < this.s.length && this.s[this.i] !== ch) {
        if (this.s[this.i] === '\\' && ch === '"') { this.i++; const e = this.s[this.i]; out += e === 'n' ? '\n' : e; }
        else out += this.s[this.i];
        this.i++;
      }
      this.i++;
      return out;
    }
    let out = '';
    let depth = 0;
    while (this.i < this.s.length) {
      const c = this.s[this.i];
      if (depth === 0 && stops.includes(c)) break;
      if (c === '{' || c === '[') depth++;
      if (c === '}' || c === ']') depth--;
      out += c;
      this.i++;
    }
    return scalar(out);
  }
  map(path) {
    const out = {};
    this.i++;
    for (;;) {
      this.ws();
      if (this.s[this.i] === '}') { this.i++; return out; }
      if (this.i >= this.s.length) throw new Error(`unclosed { on line ${this.line}`);
      const key = String(this.str(':,}'));
      this.ws();
      if (this.s[this.i] === ':') this.i++;
      const p = path ? `${path}.${key}` : key;
      out[key] = this.value(p);
      this.ws();
      if (this.s[this.i] === ',') this.i++;
    }
  }
  seq(path) {
    const out = [];
    this.i++;
    for (;;) {
      this.ws();
      if (this.s[this.i] === ']') { this.i++; return out; }
      if (this.i >= this.s.length) throw new Error(`unclosed [ on line ${this.line}`);
      out.push(this.value(`${path}.${out.length}`));
      this.ws();
      if (this.s[this.i] === ',') this.i++;
    }
  }
}

function balanced(text) {
  let d = 0, q = null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === q) q = null; continue; }
    if (c === '"' || c === "'") q = c;
    else if (c === '{' || c === '[') d++;
    else if (c === '}' || c === ']') d--;
  }
  return d <= 0;
}

function splitKey(text) {
  // "key: rest" -> [key, rest]; respects quoted keys. Returns null when not a mapping line.
  const t = text;
  let key, rest;
  if (t[0] === '"' || t[0] === "'") {
    const end = t.indexOf(t[0], 1);
    if (end < 0) return null;
    key = t.slice(1, end);
    const after = t.slice(end + 1);
    if (!/^\s*:(\s|$)/.test(after)) return null;
    rest = after.replace(/^\s*:/, '');
  } else {
    const m = t.match(/^([^\s:{}[\],"'][^:{}[\],]*?)\s*:(\s+|$)(.*)$/);
    if (!m) return null;
    key = m[1].trim();
    rest = m[3];
  }
  return [key, rest.trim()];
}

/**
 * Parse a YAML block. `startLine` is the 1-based line number of the block's first line in its file.
 * Returns { value, lines } where lines maps "a.b.0.c" paths to source lines.
 */
export function parseYaml(text, startLine = 1) {
  const rows = [];
  text.split('\n').forEach((raw, idx) => {
    const noC = stripComment(raw).replace(/\s+$/, '');
    if (!noC.trim()) return;
    rows.push({ indent: noC.match(/^ */)[0].length, text: noC.trim(), line: startLine + idx });
  });
  // join multi-line flow collections
  for (let i = 0; i < rows.length; i++) {
    while (!balanced(rows[i].text) && i + 1 < rows.length) {
      rows[i].text += ' ' + rows[i + 1].text;
      rows.splice(i + 1, 1);
    }
  }
  const lines = new Map();
  let pos = 0;

  function flow(text, line, path) { return new Flow(text, line, lines, path).value(path); }

  function block(indent, path) {
    if (pos >= rows.length) return null;
    if (rows[pos].text.startsWith('- ') || rows[pos].text === '-') return seq(rows[pos].indent, path);
    return map(rows[pos].indent, path);
  }

  function seq(indent, path) {
    const out = [];
    while (pos < rows.length && rows[pos].indent === indent && (rows[pos].text.startsWith('- ') || rows[pos].text === '-')) {
      const row = rows[pos];
      const rest = row.text.slice(1).trim();
      const p = `${path ? path + '.' : ''}${out.length}`;
      lines.set(p, row.line);
      if (!rest) { pos++; out.push(block(indent + 2, p)); continue; }
      const kv = rest[0] === '{' || rest[0] === '[' ? null : splitKey(rest);
      if (kv) {
        // "- key: v" starts an inline mapping; following keys sit at indent + 2
        rows[pos] = { indent: indent + 2, text: rest, line: row.line };
        out.push(map(indent + 2, p));
      } else {
        pos++;
        out.push(flow(rest, row.line, p));
      }
    }
    return out;
  }

  function map(indent, path) {
    const out = {};
    while (pos < rows.length && rows[pos].indent === indent && !rows[pos].text.startsWith('- ')) {
      const row = rows[pos];
      const kv = splitKey(row.text);
      if (!kv) throw new Error(`line ${row.line}: expected "key: value", got "${row.text}"`);
      const [key, rest] = kv;
      const p = path ? `${path}.${key}` : key;
      lines.set(p, row.line);
      pos++;
      if (rest === '') {
        out[key] = pos < rows.length && rows[pos].indent > indent ? block(rows[pos].indent, p) : null;
        // sequences may sit at the same indent as their key
        if (out[key] === null && pos < rows.length && rows[pos].indent === indent && rows[pos].text.startsWith('- ')) out[key] = seq(indent, p);
      } else {
        out[key] = flow(rest, row.line, p);
      }
    }
    return out;
  }

  const value = rows.length ? block(rows[0].indent, '') : null;
  if (pos < rows.length) throw new Error(`line ${rows[pos].line}: unexpected indentation`);
  return { value, lines };
}

/** Walk leaves: cb(path, value). */
export function walkLeaves(v, cb, path = '') {
  if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) walkLeaves(x, cb, path ? `${path}.${k}` : k);
  } else cb(path, v);
}
