/* review.js — the daily spaced-repetition session: walk the due queue, recall,
   reveal, grade (Again / Good / Easy). New ayāt are shown in full to learn; due
   ones are shown hidden (first-letter hints) so you recall before revealing. */
(function (BA) {
  const { el, clear } = BA.util;
  (BA.views = BA.views || {}).review = {
    mount(sec) {
      const { store, data, audio, reveal, i18n } = BA;
      const t = i18n.t;
      store.setLast({ view: 'review' });
      const ri = store.settings.riwayah;
      clear(sec);

      const queue = store.reviewQueue();
      const total = queue.length;
      let pos = 0;
      const tally = { good: 0, again: 0, easy: 0 };

      // whole-surah reciters can't isolate one ayah → loop with a per-ayah voice.
      const curRec = data.reciter(store.settings.reciter);
      const isFull = !!(curRec && curRec.capability === 'full-surah');
      const paRec = isFull ? data.defaultReciter(ri) : null;
      const loopRec = (isFull && paRec) ? paRec : (curRec || data.defaultReciter(ri));

      if (!total) return renderEmpty();

      const bar = el('div', { class: 'meter', style: 'margin:.2rem 0 1rem' }, el('i', {}));
      const leftPill = el('span', { class: 'pill' }, '');
      const heading = el('div', { class: 'row spread' },
        el('strong', {}, t('review.title')), leftPill);
      const badge = el('span', { class: 'pill' }, '');
      const surahChip = el('span', { class: 'pill' }, '');
      const arEl = el('div', { class: 'ar', dataset: { riwayah: ri } });
      const card = el('div', { class: 'ayah-card' }, arEl);
      const trBox = el('div', { class: 'tr-box' });
      const hint = el('div', { class: 'muted', style: 'font-size:.85rem;margin:.2rem 0 .8rem' }, '');

      const showBtn = el('button', { class: 'btn', onclick: revealAll }, t('review.showAnswer'));
      const loopBtn = el('button', { class: 'btn ghost', onclick: loop }, t('review.listen'));
      const preRow = el('div', { class: 'row', style: 'margin:.2rem 0 1rem' }, showBtn, loopBtn);

      const grades = el('div', { class: 'row', style: 'margin:.2rem 0 1rem', hidden: true },
        el('button', { class: 'btn ghost', onclick: () => grade('again') }, t('review.again')),
        el('button', { class: 'btn', onclick: () => grade('good') }, t('review.good')),
        el('button', { class: 'btn gold', onclick: () => grade('easy') }, t('review.easy')));

      sec.append(
        el('div', { class: 'card' }, heading, bar,
          el('div', { class: 'row', style: 'margin-bottom:.4rem' }, badge, surahChip),
          card, trBox, hint, preRow, grades));

      let revealed = false;
      // queue items are {s, n, isNew}; a due item may live in another surah, so we
      // load that surah on demand and read it via the explicit-surah accessors
      // rather than flipping the global current surah per card.
      async function renderItem() {
        const item = queue[pos];
        const s = item.s, n = item.n;
        if (!data.surahLoaded(s)) await data.loadSurah(s);
        revealed = item.isNew;                          // new ayāt start revealed (you're learning them)
        leftPill.textContent = `${pos + 1} / ${total}`;
        bar.firstElementChild.style.width = (pos / total * 100).toFixed(1) + '%';
        badge.textContent = item.isNew ? t('review.newBadge') : t('review.dueBadge');
        badge.style.background = item.isNew ? 'var(--gold-soft)' : 'var(--border)';
        badge.style.color = 'var(--text)';
        surahChip.textContent = BA.app.surahName(s);
        clear(arEl);
        if (revealed) arEl.append(document.createTextNode(data.textIn(s, n, ri) + ' '));
        else reveal.render(arEl, data.wordsIn(s, n, ri), 3);  // first-letter hints; tap a word to peek
        arEl.append(el('span', { class: 'ayah-num' }, n));
        clear(trBox);
        if (revealed) { const tr = BA.app.translationEl(n, s); if (tr) trBox.append(tr); }
        hint.textContent = item.isNew ? t('review.hintNew') : t('review.hintDue');
        showBtn.hidden = revealed;
        grades.hidden = !revealed;
        card.classList.remove('playing');
      }

      function revealAll() {
        const item = queue[pos], s = item.s, n = item.n;
        revealed = true;
        clear(arEl);
        arEl.append(document.createTextNode(data.textIn(s, n, ri) + ' '), el('span', { class: 'ayah-num' }, n));
        clear(trBox); const tr = BA.app.translationEl(n, s); if (tr) trBox.append(tr);
        showBtn.hidden = true; grades.hidden = false; hint.textContent = t('review.howWell');
      }

      function loop() {
        const item = queue[pos];
        audio.configure({ reciterId: loopRec.id, riwayah: ri });
        audio.playSingle(item.s, item.n, { reps: store.settings.repsPerAyah, gapMs: store.settings.gapMs });
        card.classList.add('playing');
      }

      function grade(g) {
        const item = queue[pos];
        store.review(BA.util.ayahKey(item.s, item.n), g);
        tally[g] = (tally[g] || 0) + 1;
        BA.app.refreshStreak();
        if (g === 'again') queue.push({ s: item.s, n: item.n, isNew: false });   // re-surface later this session
        pos++;
        if (pos >= queue.length) return renderDone();
        renderItem();
      }

      function renderDone() {
        audio.stop();
        clear(sec);
        const reviewed = tally.good + tally.easy + tally.again;
        const next = store.nextDueTime();
        sec.append(
          el('div', { class: 'card', style: 'text-align:center' },
            el('div', { style: 'font-size:2.2rem' }, '🎉'),
            el('h2', { style: 'margin:.3rem 0' }, t('review.completeTitle')),
            el('div', { class: 'muted' }, t('review.completeStats', { reviewed, recalled: tally.good + tally.easy, again: tally.again })),
            el('div', { class: 'muted', style: 'margin-top:.4rem' },
              next ? t('review.nextDue', { when: relDay(next) }) : t('review.nothingScheduled')),
            el('div', { class: 'row', style: 'justify-content:center;margin-top:1rem' },
              el('button', { class: 'btn', onclick: () => BA.nav.go('progress') }, t('review.progressBtn')),
              el('button', { class: 'btn ghost', onclick: () => BA.nav.go('listen') }, t('review.listen')))));
      }

      function renderEmpty() {
        const next = store.nextDueTime();
        const news = store.newAyat(store.settings.surah, 1).length > 0;
        sec.append(
          el('h1', { class: 'page-title' }, t('review.title')),
          el('div', { class: 'card', style: 'text-align:center' },
            el('div', { style: 'font-size:2.2rem' }, '✅'),
            el('h2', { style: 'margin:.3rem 0' }, t('review.caughtUpTitle')),
            el('div', { class: 'muted' },
              next ? t('review.caughtUpNext', { when: relDay(next) })
                   : (news ? t('review.caughtUpRaise') : t('review.caughtUpAll'))),
            el('div', { class: 'row', style: 'justify-content:center;margin-top:1rem' },
              el('button', { class: 'btn', onclick: () => BA.nav.go('memorize') }, t('review.memorizeBtn')),
              el('button', { class: 'btn ghost', onclick: () => BA.nav.go('listen') }, t('review.listen')))));
      }

      BA.app.onAyah((a) => { card && card.classList.toggle('playing', a === (queue[pos] && queue[pos].n)); });
      renderItem();
    },
  };

  // "today" / "tomorrow" / "in N days" for a due timestamp
  function relDay(ms) {
    const today = BA.util.todayStr();
    const d = new Date(ms); const that = `${d.getFullYear()}-${BA.util.pad2(d.getMonth() + 1)}-${BA.util.pad2(d.getDate())}`;
    const n = BA.util.daysBetween(today, that);
    return n <= 0 ? BA.i18n.t('review.today') : n === 1 ? BA.i18n.t('review.tomorrow') : BA.i18n.t('review.inDays', { n });
  }
})(window.BA = window.BA || {});
