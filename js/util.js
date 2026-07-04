/* util.js — tiny helpers shared everywhere. */
(function (BA) {
  const U = {
    pad2: n => String(n).padStart(2, '0'),
    pad3: n => String(n).padStart(3, '0'),
    clamp: (n, lo, hi) => Math.max(lo, Math.min(hi, n)),
    todayStr() { const d = new Date(); return `${d.getFullYear()}-${U.pad2(d.getMonth() + 1)}-${U.pad2(d.getDate())}`; },
    daysBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); },
    shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
    el(tag, attrs, ...kids) {
      const e = document.createElement(tag);
      if (attrs) for (const k in attrs) {
        if (k === 'class') e.className = attrs[k];
        else if (k === 'html') e.innerHTML = attrs[k];
        else if (k.startsWith('on') && typeof attrs[k] === 'function') e.addEventListener(k.slice(2), attrs[k]);
        else if (k === 'dataset') Object.assign(e.dataset, attrs[k]);
        else if (attrs[k] != null && attrs[k] !== false) e.setAttribute(k, attrs[k]);
      }
      kids.flat().forEach(k => k != null && e.append(k.nodeType ? k : document.createTextNode(k)));
      return e;
    },
    clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; },
    // touch-friendly number input flanked by − / + buttons. Returns {input, wrap}.
    stepper(value, min, max, step = 1) {
      const input = U.el('input', { type: 'number', min, max, step, value, inputmode: 'numeric' });
      const bump = d => {
        const v = U.clamp((parseInt(input.value, 10) || min) + d, min, max);
        input.value = v; input.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const btn = (sym, d) => U.el('button', { class: 'step-btn', type: 'button', 'aria-label': d < 0 ? 'decrease' : 'increase', onclick: () => bump(d) }, sym);
      input.addEventListener('change', () => {           // clamp manual typing too
        const v = U.clamp(parseInt(input.value, 10) || min, min, max);
        if (String(v) !== input.value) input.value = v;
      });
      const wrap = U.el('div', { class: 'stepper-row' }, btn('−', -step), input, btn('+', step));
      return { input, wrap };
    },
    toast(msg, ms = 1900) {
      const t = document.getElementById('toast');
      t.textContent = msg; t.hidden = false;
      clearTimeout(U._tt); U._tt = setTimeout(() => (t.hidden = true), ms);
    },
    // progress keys are "surah:ayah" strings (e.g. "2:255"); helpers so nothing
    // hand-builds them (existing "2:x" localStorage entries stay valid verbatim).
    ayahKey(s, n) { return s + ':' + n; },
    parseKey(k) { const i = k.indexOf(':'); return { s: +k.slice(0, i), n: +k.slice(i + 1) }; },
    // strip combining marks for first-letter hints / comparisons
    bareLetters(word) {
      let out = '';
      for (const ch of word) { const c = ch.codePointAt(0); if (c >= 0x0621 && c <= 0x064A) out += ch; }
      return out;
    },
    // fold Arabic for forgiving, diacritic-insensitive search.
    // Uthmani spelling marks long ā as a dagger alef (كتٰب) and uses alef-wasla etc.,
    // so we drop ALL marks AND all alef forms (incl. dagger alef) on both query+text —
    // this makes كتاب / كتٰب / الكتاب all collapse to the same key (high recall for jumping).
    normalizeArabic(s) {
      let out = '';
      for (const ch of (s || '')) {
        const c = ch.codePointAt(0);
        if ((c >= 0x064B && c <= 0x065F) || c === 0x0670 || c === 0x0640 || (c >= 0x06D6 && c <= 0x06ED)) continue; // marks/tatweel
        out += ch;
      }
      return out
        .replace(/[أإآٱاٰ]/g, '')   // remove every alef form
        .replace(/ى/g, 'ي').replace(/ئ/g, 'ي').replace(/ؤ/g, 'و')
        .replace(/ة/g, 'ه').replace(/[ءۀ]/g, '').replace(/\s+/g, ' ').trim();
    },
  };
  BA.util = U;
})(window.BA = window.BA || {});
