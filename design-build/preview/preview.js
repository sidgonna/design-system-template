// Builds the token sections of the preview from window.DESIGN_TOKENS (tokens.js). Styles come only from var(--token).
(function () {
  var D = window.DESIGN_TOKENS;
  if (!D) {
    // tokens.js is missing or failed: say so on the page instead of rendering empty sections.
    var main = document.getElementById('main'), msg = document.createElement('p');
    msg.className = 'load-error'; msg.setAttribute('role', 'alert');
    msg.textContent = 'tokens.js did not load, so the token sections are empty. Regenerate it with: node design-build/tokens-css.mjs (from the app root: node design-system/design-build/tokens-css.mjs), then reload.';
    if (main) main.prepend(msg);
    D = { tokens: {}, pairings: [] };
  }
  var T = D.tokens;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function v(path) { return T[path] ? 'var(' + T[path].var + ')' : ''; }
  function val(path, mode) { var t = T[path]; return t ? (t.css[mode] || t.css.base) : ''; }
  function keys(prefix) { return Object.keys(T).filter(function (k) { return k.indexOf(prefix) === 0; }); }

  // Theme toggle
  var root = document.documentElement;
  function setTheme(choice) {
    if (choice === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', choice);
    try { localStorage.setItem('preview-theme', choice); } catch { /* storage blocked: theme still applies for this page */ }
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
    // Text pairings show text; "ui" pairings (3:1, non-text: borders, focus rings, chart marks) show a mark, because
    // text in a 3:1 color would be a real text-contrast failure on this page.
    var tr = el('tr'), td = el('td'), s;
    if (p.size === 'ui') {
      s = el('span', 'pair-sample');
      s.setAttribute('role', 'img'); s.setAttribute('aria-label', 'mark in ' + p.fg + ' on ' + p.bg);
      var mark = el('span', 'pair-mark'); mark.style.setProperty('background', v(p.fg)); s.appendChild(mark);
    } else {
      s = el('span', 'pair-sample', 'Aa');
      s.style.setProperty('color', v(p.fg));
    }
    s.style.setProperty('background', v(p.bg));
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
  var sample = [64, 41, 78, 52, 35, 80, 46, 59];   // illustrative values out of 100, labeled on the page
  keys('color.data.').forEach(function (k, i) {
    var n = k.split('.').pop(), value = sample[i % sample.length];
    var li = el('li'), plot = el('div', 'plot'), bar = el('div', 'bar');
    plot.appendChild(el('span', 'value', String(value)));
    bar.style.setProperty('background', v(k));
    bar.style.setProperty('block-size', value + '%');
    bar.setAttribute('aria-hidden', 'true');
    plot.appendChild(bar); li.appendChild(plot);
    li.appendChild(el('span', 'series', 'S' + n));
    ch.appendChild(li);
  });

  // Motion demo
  var play = document.getElementById('play-motion');
  if (play) play.addEventListener('click', function () {
    play.setAttribute('aria-pressed', String(play.getAttribute('aria-pressed') !== 'true'));
    document.querySelectorAll('.motion-track').forEach(function (t) { t.classList.toggle('moved'); });
    // Replay the components' CSS animations (card entrance, badge pop-in, input shake). Under reduced motion
    // components.css allows only the short opacity fade on the card and badge (core §10), so that is all that replays.
    document.querySelectorAll('#components [data-component="card"], #components [data-component="badge"], #components [data-variant="error"] input').forEach(function (n) {
      n.style.animationName = 'none'; void getComputedStyle(n).animationName; n.style.animationName = '';
    });
  });
})();
