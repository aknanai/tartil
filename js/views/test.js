/* test.js — quizzes: fill-in-the-blank and recall-the-next-ayah. */
(function (BA) {
  const { el, clear, shuffle, clamp } = BA.util;
  (BA.views = BA.views || {}).test = {
    mount(sec) {
      const { store, data } = BA;
      store.setLast({ view: 'test' });
      const ri = store.settings.riwayah;
      let mode = 'blank', score = { right: 0, total: 0 };
      clear(sec);

      // pool of distractor words (≥3 letters) for fill-blank
      const pool = [];
      for (let n = 1; n <= data.count; n++) data.words(n, ri).forEach(w => { if (BA.util.bareLetters(w).length >= 3) pool.push(w); });

      const tabs = el('div', { class: 'row', style: 'margin-bottom:.4rem' },
        tab('Fill the blank', 'blank'), tab('Next ayah', 'next'));
      const scoreEl = el('span', { class: 'pill' }, '');
      const qbox = el('div', { class: 'card' });
      const nextBtn = el('button', { class: 'btn', onclick: question }, 'New question →');
      sec.append(
        el('div', { class: 'row spread' }, tabs, scoreEl),
        qbox,
        el('div', { class: 'row' }, nextBtn));

      function tab(label, id) {
        return el('button', { class: 'btn ' + (mode === id ? '' : 'ghost') + ' sm', onclick: () => { mode = id; render(); question(); } }, label);
      }
      function render() { clear(tabs); tabs.append(tab('Fill the blank', 'blank'), tab('Next ayah', 'next')); updateScore(); }
      function updateScore() { scoreEl.textContent = `Score ${score.right}/${score.total}`; }

      function ayahNode(n, blankIdx) {
        const words = data.words(n, ri);
        const wrap = el('div', { class: 'ar', dataset: { riwayah: ri }, style: 'line-height:2.4' });
        words.forEach((w, i) => {
          if (i === blankIdx) { wrap.append(el('span', { class: 'blank-input', id: 'blankSlot' }, '____'), document.createTextNode(' ')); }
          else wrap.append(document.createTextNode(w + ' '));
        });
        wrap.append(el('span', { class: 'ayah-num' }, n));
        return wrap;
      }

      function question() {
        clear(qbox);
        if (mode === 'blank') return qBlank();
        return qNext();
      }

      function qBlank() {
        const n = 1 + Math.floor(Math.random() * data.count);
        const words = data.words(n, ri);
        const cands = words.map((w, i) => i).filter(i => BA.util.bareLetters(words[i]).length >= 3);
        const bi = cands.length ? cands[Math.floor(Math.random() * cands.length)] : 0;
        const answer = words[bi];
        const opts = shuffle([answer, ...pickDistinct(pool, answer, 3)]);
        qbox.append(
          el('div', { class: 'muted', style: 'margin-bottom:.4rem' }, `Ayah ${n} — choose the missing word`),
          ayahNode(n, bi),
          el('div', { class: 'row', style: 'margin-top:.8rem;flex-wrap:wrap' },
            ...opts.map(o => el('button', { class: 'choice', onclick: ev => answerChoice(ev.target, o === answer, () => { document.getElementById('blankSlot').textContent = answer; }) }, o))));
      }

      function qNext() {
        const n = 1 + Math.floor(Math.random() * (data.count - 1));
        const correct = n + 1;
        const wrongs = pickDistinctNums(correct, n, 3);
        const opts = shuffle([correct, ...wrongs]);
        qbox.append(
          el('div', { class: 'muted', style: 'margin-bottom:.4rem' }, `This is ayah ${n}. Which ayah comes next?`),
          el('div', { class: 'ar', dataset: { riwayah: ri } }, data.text(n, ri) + ' ', el('span', { class: 'ayah-num' }, n)),
          el('div', { style: 'margin-top:.7rem' },
            ...opts.map(c => el('div', {
              class: 'order-item', style: 'cursor:pointer',
              onclick: ev => answerChoice(ev.currentTarget, c === correct)
            }, firstWords(c, ri)))));
      }

      function answerChoice(node, isRight, onReveal) {
        if (node.dataset.done) return;
        qbox.querySelectorAll('.choice,.order-item').forEach(b => b.dataset.done = '1');
        node.classList.add(isRight ? 'right' : 'wrong');
        score.total++; if (isRight) score.right++;
        if (onReveal) onReveal();
        if (!isRight) BA.util.toast('Not quite — try the next one');
        updateScore();
      }

      function firstWords(n, ri) {
        const ws = data.words(n, ri).slice(0, 4).join(' ');
        return ws + (data.words(n, ri).length > 4 ? ' …' : '');
      }
      function pickDistinct(arr, not, k) {
        const out = []; let guard = 0;
        while (out.length < k && guard++ < 200) { const w = arr[Math.floor(Math.random() * arr.length)]; if (w !== not && !out.includes(w)) out.push(w); }
        return out;
      }
      function pickDistinctNums(not, alsoNot, k) {
        const out = []; let guard = 0;
        while (out.length < k && guard++ < 200) { const x = 1 + Math.floor(Math.random() * data.count); if (x !== not && x !== alsoNot && !out.includes(x)) out.push(x); }
        return out;
      }

      render(); question();
    },
  };
})(window.BA = window.BA || {});
