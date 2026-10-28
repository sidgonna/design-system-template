// design-build/lib/jsx.mjs — find JSX opening tags of PascalCase components without a parser (zero dependencies).
// TypeScript generics (useState<User>(), Array<Item>, <T,>(x: T) => …) look like tags to a plain regex; a real JSX
// tag follows an operator, a bracket or a keyword such as `return`, never an identifier, `.`, `)` or `]`.
const JSX_AFTER_WORD = new Set(['return', 'yield', 'await', 'default', 'case', 'else', 'in', 'of', 'do', 'void', 'typeof']);

export function jsxOpenTags(text) {
  const out = [];
  const re = /<([A-Z]\w*(?:\.[A-Z]\w*)*)/g;
  let m;
  while ((m = re.exec(text))) {
    let j = m.index - 1;
    while (j >= 0 && /\s/.test(text[j])) j--;
    const prev = j >= 0 ? text[j] : '';
    if (/[\w$]/.test(prev)) {
      let k = j; while (k >= 0 && /[\w$]/.test(text[k])) k--;
      if (!JSX_AFTER_WORD.has(text.slice(k + 1, j + 1))) continue; // useState<User>, Promise<T>
    } else if (/[.)\]]/.test(prev)) continue; // fn()<T>, obj.method<T>
    const after = text.slice(re.lastIndex);
    if (/^\s*(,|extends\b)/.test(after)) continue; // generic type parameter <T,> / <T extends …>
    if (!/^[\s/>]/.test(after)) continue; // <Foo-bar or <Foo= … not a JSX tag
    // scan the attributes up to the closing > at brace depth 0, outside strings
    let i = re.lastIndex, depth = 0, q = null, attrs = '';
    for (; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === q) q = null; if (depth === 0) attrs += c; continue; }
      if (c === '"' || c === "'" || (c === '`' && depth > 0)) { q = c; if (depth === 0) attrs += c; continue; }
      if (c === '{') { if (depth === 0) attrs += '{'; depth++; continue; }
      if (c === '}') { depth--; if (depth === 0) attrs += '}'; continue; }
      if (c === '>' && depth === 0) break;
      if (depth === 0) attrs += c;
    }
    attrs = attrs.replace(/\/\s*$/, '');
    const bare = attrs.replace(/"[^"]*"|'[^']*'/g, '""');
    const props = [...bare.matchAll(/(?:^|[\s}"'])([a-zA-Z_][\w:.-]*)/g)].map((p) => p[1]);
    out.push({ tag: m[1], index: m.index, attrs, props });
  }
  return out;
}
