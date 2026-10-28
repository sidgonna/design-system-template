// Builds the token sections of the preview from window.DESIGN_TOKENS (tokens.js). Styles come only from var(--token).
(function () {
  var D = window.DESIGN_TOKENS || { tokens: {}, pairings: [] };
  var T = D.tokens;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function v(path) { return T[path] ? 'var(' + T[path].var + ')' : ''; }
  function val(path, mode) { var t = T[path]; return t ? (t.css[mode] || t.css.base) : ''; }
  function keys(prefix) { return Object.keys(T).filter(function (k) { return k.indexOf(prefix) === 0; }); }

  // Theme toggle
  var root = document.documentElement;
  function setTheme(choice) {
    if (choice === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', choice);
    try { localStorage.setItem('preview-theme', choice); } catch (e) {}
    document.querySelectorAll('[data-theme-choice]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-theme-choice') === choice)); });
  }
  var current = root.getAttribute('data-theme') || 'system';
  document.querySelectorAll('[data-theme-choice]').forEach(function (b) {
    b.setAttribute('aria-pressed', String(b.getAttribute('data-theme-choice') === current));
    b.addEventListener('click', function () { setTheme(b.getAttribute('data-theme-choice')); });
  });

  // Color swatches, each shown in its role
  var sw = document.getElementById('swatches');
  keys('color.').filter(function (k) { return k.indexOf('color.data.') !== 0; }).forEach(function (k) {
    var card = el('div', 'swatch'), chip = el('div', 'chip'), meta = el('div', 'meta');
    if (k.indexOf('color.text.') === 0) {
      chip.textContent = 'Aa';
      chip.style.setProperty('color', v(k));
      chip.style.setProperty('background', v(k === 'color.text.inverse' ? 'color.surface.inverse' : 'color.surface.default'));
    } else if (k === 'color.focus') {
      chip.appendChild(el('span', 'ring-sample'));
    } else {
      chip.style.setProperty('background', v(k));
    }
    meta.appendChild(el('strong', null, k));
    meta.appendChild(el('span', null, val(k, 'light') + ' / ' + val(k, 'dark')));
    card.appendChild(chip); card.appendChild(meta); sw.appendChild(card);
  });

  // Contrast pairings
  var tb = document.getElementById('pairings');
  (D.pairings || []).forEach(function (p) {
    var tr = el('tr'), td = el('td'), s = el('span', 'pair-sample', 'Aa');
    s.style.setProperty('color', v(p.fg)); s.style.setProperty('background', v(p.bg));
    td.appendChild(s); tr.appendChild(td);
    tr.appendChild(el('td', null, p.fg)); tr.appendChild(el('td', null, p.bg));
    tr.appendChild(el('td', null, p.target + ':1 (' + p.size + ')'));
    ['light', 'dark'].forEach(function (m) {
      var r = p.ratio[m], ok = r >= p.target;
      tr.appendChild(el('td', ok ? 'pass' : 'fail', r.toFixed(2) + ':1 ' + (ok ? 'pass' : 'FAIL')));
    });
    tb.appendChild(tr);
  });

  // Type scale
  var ts = document.getElementById('type-scale');
  keys('font.size.').forEach(function (k) {
    var row = el('div', 'type-row');
    row.appendChild(el('span', 'label', k + ' · ' + val(k, 'base')));
    var s = el('p', 'sample', 'The quick brown fox jumps over the lazy dog');
    s.style.setProperty('font-size', v(k));
    if (/display|h1|h2|h3/.test(k)) s.style.setProperty('font-family', v('font.family.heading'));
    row.appendChild(s); ts.appendChild(row);
  });

  // Space scale
  var ss = document.getElementById('space-scale');
  keys('space.').forEach(function (k) {
    var row = el('div', 'space-row'), bar = el('div', 'space-bar');
    bar.style.setProperty('inline-size', v(k));
    row.appendChild(bar); row.appendChild(el('code', null, k + ' · ' + val(k, 'base')));
    ss.appendChild(row);
  });

  // Radius and shadow
  var sh = document.getElementById('shapes');
  keys('radius.').concat(keys('shadow.')).forEach(function (k) {
    var b = el('div', 'shape', k);
    if (k.indexOf('radius.') === 0) b.style.setProperty('border-radius', v(k));
    else { b.style.setProperty('box-shadow', v(k)); b.style.setProperty('border-radius', v('radius.md')); }
    sh.appendChild(b);
  });

  // Data colors
  var ch = document.getElementById('chart');
  keys('color.data.').forEach(function (k, i) {
    var bar = el('div', 'bar');
    bar.style.setProperty('background', v(k));
    bar.style.setProperty('block-size', (30 + ((i * 37) % 70)) + '%');
    ch.appendChild(bar);
  });

  // Motion demo
  var play = document.getElementById('play-motion');
  if (play) play.addEventListener('click', function () {
    document.querySelectorAll('.motion-track').forEach(function (t) { t.classList.toggle('moved'); });
    // Replay the components' CSS animations (card entrance, badge pop-in, input shake). Under reduced motion
    // components.css sets animation: none, so there is nothing to replay and the page just stays put.
    document.querySelectorAll('#components [data-component="card"], #components [data-component="badge"], #components [data-variant="error"] input').forEach(function (n) {
      n.style.animationName = 'none'; void getComputedStyle(n).animationName; n.style.animationName = '';
    });
  });
})();
