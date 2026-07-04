/* settings.js — reading, default reciter, loop defaults, theme, font, offline audio. */
(function (BA) {
  const { el, clear, clamp } = BA.util;
  const R = BA.reciters;
  const AUDIO_CACHE = 'ba9ara-audio-v1';

  (BA.views = BA.views || {}).settings = {
    mount(sec) {
      const { store, data, i18n } = BA;
      const t = i18n.t;
      store.setLast({ view: 'settings' });
      const s = store.settings;
      clear(sec);

      // reading
      const riSel = el('select', { onchange: () => { BA.app.onRiwayahChange(riSel.value); BA.views.settings.mount(sec); } });
      data.riwayahList().forEach(ri => { const o = el('option', { value: ri }, `${data.riwayahLabel(ri)} (${data.riwayat[ri].label_ar})`); if (ri === s.riwayah) o.selected = true; riSel.append(o); });

      // default reciter
      const recSel = el('select', { onchange: () => { store.setSetting('reciter', recSel.value); BA.app.reconfigure(); BA.views.settings.mount(sec); } });
      data.recitersFor(s.riwayah).forEach(r => { const o = el('option', { value: r.id }, r.name_en); if (r.id === s.reciter) o.selected = true; recSel.append(o); });
      if (!data.recitersFor(s.riwayah).some(r => r.id === s.reciter)) recSel.selectedIndex = 0;

      // spaced repetition
      const dailyNew = num(s.dailyNew, 0, 50, v => store.setSetting('dailyNew', v));

      // loop defaults
      const reps = num(s.repsPerAyah, 1, 20, v => store.setSetting('repsPerAyah', v));
      const rng = num(s.rangeReps, 1, 50, v => store.setSetting('rangeReps', v));
      const gap = el('input', { type: 'range', min: 0, max: 4000, step: 100, value: s.gapMs });
      const gapV = el('span', { class: 'muted' }, (s.gapMs / 1000).toFixed(1) + 's');
      gap.addEventListener('input', () => { gapV.textContent = (gap.value / 1000).toFixed(1) + 's'; store.setSetting('gapMs', +gap.value); });

      // playback speed
      const speedBtns = el('div', { class: 'seg' });
      const renderSpeed = () => { clear(speedBtns); [0.5, 0.75, 1, 1.25, 1.5].forEach(r => speedBtns.append(
        el('button', { class: 'seg-btn' + (Math.abs((s.speed || 1) - r) < 0.001 ? ' on' : ''), type: 'button',
          onclick: () => { s.speed = r; store.setSetting('speed', r); BA.audio.setRate(r); renderSpeed(); } }, r + '×'))); };
      renderSpeed();

      // theme + font
      const themeBtns = el('div', { class: 'row' },
        themeBtn('light', t('settings.themeLight')), themeBtn('dark', t('settings.themeDark')));
      const fontSel = el('select', { onchange: () => { store.setSetting('font', fontSel.value); applyFont(fontSel.value); } });
      [['scheherazade', t('settings.fontScheherazade')], ['amiri', t('settings.fontAmiri')]]
        .forEach(([v, l]) => { const o = el('option', { value: v }, l); if (v === (s.font || 'scheherazade')) o.selected = true; fontSel.append(o); });

      // offline
      const r = data.reciter(s.reciter);
      const dlInfo = el('div', { class: 'muted', style: 'font-size:.82rem;margin:.3rem 0' });
      const dlBar = el('div', { class: 'meter', style: 'margin:.4rem 0' }, el('i', {}));
      const dlBtn = el('button', { class: 'btn', onclick: () => downloadReciter(r, dlBtn, dlBar, dlInfo) }, t('settings.download'));
      const clrBtn = el('button', { class: 'btn ghost', onclick: clearAudio }, t('settings.clearAudio'));

      // app interface language (separate from the Qur'an-meaning language above)
      const langSel = el('select', { onchange: () => BA.app.setUiLang(langSel.value) });
      i18n.LANGS.forEach(([v, label]) => { const o = el('option', { value: v }, label); if (v === i18n.lang) o.selected = true; langSel.append(o); });

      sec.append(
        el('h1', { class: 'page-title' }, t('settings.title')),
        installCard(),
        el('div', { class: 'card' }, el('h3', {}, t('settings.appLangTitle')),
          el('div', { class: 'muted', style: 'font-size:.84rem;margin-bottom:.5rem' }, t('settings.appLangDesc')),
          field(t('settings.appLanguage'), langSel)),
        el('div', { class: 'card' }, el('h3', {}, t('settings.readingAudio')),
          field(t('settings.reading'), riSel),
          field(t('settings.defaultReciter'), recSel)),
        el('div', { class: 'card' }, el('h3', {}, t('settings.translationTitle')),
          el('div', { class: 'muted', style: 'font-size:.84rem;margin-bottom:.5rem' },
            t('settings.translationDesc')),
          field(t('common.language'), BA.app.makeLangSelect()),
          (s.lang !== 'off' && data.langMeta(s.lang))
            ? el('div', { class: 'muted', style: 'font-size:.8rem;margin-top:.4rem' }, t('settings.source', { src: data.langMeta(s.lang).source }))
            : el('span')),
        el('div', { class: 'card' }, el('h3', {}, t('settings.reviewTitle')),
          el('div', { class: 'muted', style: 'font-size:.84rem;margin-bottom:.5rem' },
            t('settings.reviewDesc')),
          field(t('settings.newPerDay'), dailyNew)),
        el('div', { class: 'card' }, el('h3', {}, t('settings.loopDefaults')),
          el('div', { class: 'grid2' }, field(t('listen.repeatEach'), reps), field(t('listen.loopRange'), rng),
            field(t('listen.gap'), el('div', { class: 'row' }, gap, gapV)), field(t('common.speed'), speedBtns))),
        el('div', { class: 'card' }, el('h3', {}, t('settings.appearance')),
          field(t('settings.theme'), themeBtns), field(t('settings.arabicFont'), fontSel)),
        el('div', { class: 'card' }, el('h3', {}, t('settings.offline')),
          el('div', { class: 'muted', style: 'font-size:.85rem' },
            r && R.canLoop(r) ? t('settings.offlinePerAyah', { name: r.name_en, count: data.count })
                              : t('settings.offlineFull', { name: r ? r.name_en : '' })),
          el('div', { class: 'muted', style: 'font-size:.8rem;margin-top:.3rem' }, t('settings.offlineSurahNote', { name: BA.app.surahName(data.currentSurah) })),
          dlInfo, dlBar, el('div', { class: 'row' }, dlBtn, clrBtn))
      );

      function themeBtn(tName, label) {
        return el('button', { class: 'btn ' + (document.documentElement.dataset.theme === tName ? '' : 'ghost') + ' sm',
          onclick: () => { BA.app.setTheme(tName); BA.views.settings.mount(sec); } }, label);
      }
    },
  };

  function installCard() {
    const t = BA.i18n.t;
    if (BA.app.isStandalone()) {
      return el('div', { class: 'card' }, el('h3', {}, t('settings.installedTitle')),
        el('div', { class: 'muted', style: 'font-size:.85rem' }, t('settings.installedDesc')));
    }
    const body = el('div', { class: 'muted', style: 'font-size:.85rem' });
    const card = el('div', { class: 'card' }, el('h3', {}, t('settings.installTitle')), body);
    if (BA.app.canInstall()) {
      body.append(t('settings.installCanDesc'),
        el('div', { class: 'row', style: 'margin-top:.55rem' },
          el('button', { class: 'btn', onclick: () => BA.app.promptInstall() }, t('settings.installBtn'))));
    } else if (BA.app.isIOS()) {
      body.append(el('div', { html: t('settings.installIOS') }));
    } else {
      body.append(el('div', { html: t('settings.installOther') }));
    }
    return card;
  }

  function applyFont(font) {
    document.documentElement.style.setProperty('--ar-font', font === 'amiri' ? "'Amiri Quran'" : "'Scheherazade New'");
  }

  async function downloadReciter(r, btn, bar, info) {
    const t = BA.i18n.t;
    if (!('caches' in window)) { BA.util.toast(t('settings.toastNeedHttps')); return; }
    if (!r) return;
    btn.disabled = true;
    const urls = R.canLoop(r) ? R.allAyahUrls(r, BA.data.currentSurah, BA.data.count) : [R.surahUrl(r, BA.data.currentSurah)];
    const cache = await caches.open(AUDIO_CACHE);
    let done = 0, failed = 0; const total = urls.length;
    const fill = bar.firstElementChild;
    const queue = urls.slice();
    async function worker() {
      while (queue.length) {
        const u = queue.shift();
        try { const resp = await fetch(u, { mode: 'cors' }); if (resp.ok) await cache.put(u, resp.clone()); else failed++; }
        catch (e) { failed++; }
        done++; fill.style.width = (done / total * 100).toFixed(1) + '%';
        info.textContent = t('settings.downloaded', { done, total, failed: failed ? t('settings.failedSuffix', { n: failed }) : '' });
      }
    }
    await Promise.all([worker(), worker(), worker(), worker()]); // small concurrency
    btn.disabled = false;
    BA.util.toast(failed ? t('settings.toastSavedSkipped', { n: failed }) : t('settings.toastSavedOffline'));
  }
  async function clearAudio() {
    if ('caches' in window) { await caches.delete(AUDIO_CACHE); BA.util.toast(BA.i18n.t('settings.toastAudioCleared')); }
  }

  function field(label, control) { return el('div', { class: 'field' }, el('label', {}, label), control); }
  function num(val, min, max, on) {
    const s = BA.util.stepper(val, min, max);
    s.input.addEventListener('change', () => on(clamp(+s.input.value || min, min, max)));
    return s.wrap;
  }
  BA.settings = { applyFont };
})(window.BA = window.BA || {});
