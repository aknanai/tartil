/* reveal.js — progressive hiding for memorization.
   Levels: 0 full · 1 hide last word · 2 hide 2nd half · 3 first-letter hints · 4 blank.
   Tokens are tap-to-peek (reveal one briefly). */
(function (BA) {
  const { el, clear, bareLetters } = BA.util;
  const LEVELS = ['Full', 'Hide last', 'Hide half', 'First letters', 'Blank'];

  function modeFor(level, i, n) {
    if (level >= 4) return 'blank';
    if (level === 3) return 'hint';
    if (level === 2 && i >= Math.ceil(n / 2)) return 'blank';
    if (level === 1 && i >= n - 1) return 'blank';
    return 'show';
  }

  function paint(span, full, mode) {
    span.dataset.mode = mode;
    span.classList.remove('hidden', 'hint', 'peek');
    if (mode === 'show') { span.textContent = full; }
    else if (mode === 'hint') {
      const f = bareLetters(full)[0] || '•';
      span.textContent = f + ' ·'; span.classList.add('hint');
    } else { span.textContent = full; span.classList.add('hidden'); } // kept for width, CSS hides ink
  }

  function peek(span) {
    const mode = span.dataset.mode;
    if (mode === 'show') return;
    span.classList.add('peek'); span.classList.remove('hidden', 'hint');
    span.textContent = span.dataset.full;
    clearTimeout(span._pk);
    span._pk = setTimeout(() => paint(span, span.dataset.full, mode), 1500);
  }

  function render(container, words, level) {
    clear(container);
    const n = words.length;
    words.forEach((w, i) => {
      const span = el('span', { class: 'tok' });
      span.dataset.full = w;
      paint(span, w, modeFor(level, i, n));
      span.addEventListener('click', () => peek(span));
      container.append(span, document.createTextNode(' '));
    });
  }

  BA.reveal = { render, LEVELS };
})(window.BA = window.BA || {});
