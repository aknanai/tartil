/* listen.js — pick a range, choose a reciter, set repeats/gap, loop. */
(function (BA) {
  const { el, clear, clamp } = BA.util;
  (BA.views = BA.views || {}).listen = {
    mount(sec) {
      const { store, data, audio, i18n } = BA;
      const t = i18n.t;
      store.setLast({ view: 'listen' });
      const ri = store.settings.riwayah;
      const surah = store.settings.surah;
      const s = store.settings;
      clear(sec);

      // --- reciter <select> filtered to current riwāyah ---
      const recSel = el('select', { onchange: () => { store.setSetting('reciter', recSel.value); BA.app.reconfigure(); syncCaps(); } });
      data.recitersFor(ri).forEach(r => {
        const o = el('option', { value: r.id }, r.name_en + (r.capability === 'full-surah' ? t('listen.wholeSurahSuffix') : ''));
        if (r.id === s.reciter) o.selected = true;
        recSel.append(o);
      });
      if (!data.recitersFor(ri).some(r => r.id === s.reciter)) recSel.selectedIndex = 0;

      const fromI = numField(t('listen.from'), clamp(store.last.rangeFrom || 1, 1, data.count), 1, data.count);
      const toI = numField(t('listen.to'), clamp(store.last.rangeTo || 5, 1, data.count), 1, data.count);
      const repsI = numField(t('listen.repeatEach'), s.repsPerAyah, 1, 20);
      const rangeI = numField(t('listen.loopRange'), s.rangeReps, 1, 50);
      const gap = el('input', { type: 'range', min: 0, max: 4000, step: 100, value: s.gapMs });
      const gapVal = el('span', { class: 'muted' }, (s.gapMs / 1000).toFixed(1) + 's');
      gap.addEventListener('input', () => gapVal.textContent = (gap.value / 1000).toFixed(1) + 's');

      // playback speed (applies to looping and full-surah playback alike)
      const speedBtns = el('div', { class: 'seg' });
      function renderSpeed() {
        clear(speedBtns);
        [0.5, 0.75, 1, 1.25, 1.5].forEach(r => speedBtns.append(
          el('button', { class: 'seg-btn' + (Math.abs((s.speed || 1) - r) < 0.001 ? ' on' : ''), type: 'button',
            onclick: () => { s.speed = r; store.setSetting('speed', r); audio.setRate(r); renderSpeed(); } }, r + '×')));
      }
      renderSpeed();

      const capNote = el('div', { class: 'muted', style: 'font-size:.82rem' });
      const playBtn = el('button', { class: 'btn', onclick: play }, t('listen.play'));

      const controls = el('div', { class: 'card' },
        el('h3', {}, t('listen.title')),
        el('div', { class: 'grid2' },
          field(t('common.reciter'), recSel),
          fromI.wrap, toI.wrap, repsI.wrap, rangeI.wrap,
          field(t('listen.gap'), el('div', { class: 'row' }, gap, gapVal)),
          field(t('common.speed'), speedBtns),
          field(t('common.translation'), BA.app.makeLangSelect())),
        el('div', { class: 'row', style: 'margin-top:.6rem' }, playBtn,
          el('button', { class: 'btn ghost', onclick: () => { audio.stop(); } }, t('common.stop'))),
        capNote);

      const list = el('div', {});
      const cards = {};
      sec.append(controls, list);

      function renderList() {
        clear(list); for (const k in cards) delete cards[k];
        const from = clamp(+fromI.input.value || 1, 1, data.count);
        const to = clamp(+toI.input.value || from, from, data.count);
        for (let n = from; n <= to; n++) {
          const card = el('div', { class: 'ayah-card' },
            el('div', { class: 'ar', dataset: { riwayah: ri } },
              document.createTextNode(data.text(n, ri) + ' '),
              el('span', { class: 'ayah-num' }, n)));
          const tr = BA.app.translationEl(n); if (tr) card.append(tr);
          cards[n] = card; list.append(card);
        }
      }
      function syncCaps() {
        const r = data.reciter(recSel.value);
        const full = r && r.capability === 'full-surah';
        [repsI.input, rangeI.input, gap].forEach(x => x.disabled = full);
        capNote.textContent = full ? t('listen.capNote', { name: r.name_en }) : '';
      }

      function play() {
        const from = clamp(+fromI.input.value || 1, 1, data.count);
        const to = clamp(+toI.input.value || from, from, data.count);
        store.setSetting('reciter', recSel.value);
        store.setSetting('repsPerAyah', clamp(+repsI.input.value || 1, 1, 20));
        store.setSetting('rangeReps', clamp(+rangeI.input.value || 1, 1, 50));
        store.setSetting('gapMs', +gap.value);
        store.setLast({ rangeFrom: from, rangeTo: to });
        BA.app.reconfigure();
        renderList();
        audio.playRange({ surah, from, to, repsPerAyah: +repsI.input.value, rangeReps: +rangeI.input.value, gapMs: +gap.value });
      }

      BA.app.onAyah((n) => {
        Object.values(cards).forEach(c => c.classList.remove('playing'));
        if (cards[n]) { cards[n].classList.add('playing'); cards[n].scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      });

      fromI.input.addEventListener('change', renderList);
      toI.input.addEventListener('change', renderList);
      syncCaps(); renderList();
    },
  };

  function field(label, control) {
    return el('div', { class: 'field' }, el('label', {}, label), control);
  }
  function numField(label, val, min = 1, max = 286) {   // 286 = longest surah; callers pass data.count
    const s = BA.util.stepper(val, min, max);
    return { input: s.input, wrap: field(label, s.wrap) };
  }
})(window.BA = window.BA || {});
