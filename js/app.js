/* app.js — bootstrap + global wiring (theme, riwāyah, the persistent player, SW). */
(function (BA) {
  const { store, data, audio, nav, util, i18n } = BA;
  let curAyah = 1;
  let curSurah = 2;
  // surah name for chrome: Arabic script for RTL UI, transliteration otherwise
  const surahName = n => { const m = data.surahMeta(n); return m ? (i18n.isRTL() ? m.name_ar : m.name_en) : ''; };
  let highlighter = null;   // the active view's "an ayah started playing" hook
  let deferredPrompt = null; // captured Android/Chrome install prompt
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; });
  window.addEventListener('appinstalled', () => { deferredPrompt = null; util.toast && util.toast(i18n.t('app.appInstalled')); });

  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    document.getElementById('themeToggle').textContent = t === 'dark' ? '☀️' : '🌙';
    document.querySelector('meta[name=theme-color]').setAttribute('content', t === 'dark' ? '#14110d' : '#1F6B4C');
    store.setSetting('theme', t);
  }

  function refreshStreak() {
    document.getElementById('streakNum').textContent = store.streak.current || 0;
  }

  function fillRiwayahSelect() {
    const sel = document.getElementById('riwayahSelect');
    util.clear(sel);
    data.riwayahList().forEach(ri => {
      const short = data.riwayahLabel(ri).split(' ')[0];   // "Ḥafṣ" / "Warsh" — compact for the bar
      const o = util.el('option', { value: ri }, short);
      if (ri === store.settings.riwayah) o.selected = true;
      sel.append(o);
    });
  }

  function fillSurahSelect() {
    const sel = document.getElementById('surahSelect');
    if (!sel) return;
    util.clear(sel);
    const rtl = i18n.isRTL();
    data.surahList().forEach(m => {
      const o = util.el('option', { value: m.n }, `${m.n} · ${rtl ? m.name_ar : m.name_en}`);
      if (m.n === store.settings.surah) o.selected = true;
      sel.append(o);
    });
  }

  async function onSurahChange(n) {
    n = +n;
    audio.stop(); hide();
    await data.setCurrent(n);
    store.setSetting('surah', n);
    store.setLast({ surah: n, ayah: 1 });
    curSurah = n; curAyah = 1;
    nav.route();                         // re-mount current view for the new surah
  }

  function reconfigure() {
    const r = audio.configure({ reciterId: store.settings.reciter, riwayah: store.settings.riwayah });
    if (r && r.id !== store.settings.reciter) store.setSetting('reciter', r.id);
  }

  // ---- player ----
  const P = {};
  function initPlayer() {
    ['pPrev', 'pPlay', 'pNext', 'pStop', 'player', 'pTitle', 'pSub', 'playerProgress']
      .forEach(id => P[id] = document.getElementById(id));
    P.pPlay.addEventListener('click', () => audio.toggle());
    P.pStop.addEventListener('click', () => { audio.stop(); hide(); });
    P.pPrev.addEventListener('click', () => { if (curAyah > 1) audio.playSingle(curSurah, curAyah - 1, { reps: store.settings.repsPerAyah, gapMs: store.settings.gapMs }); });
    P.pNext.addEventListener('click', () => { const m = data.surahMeta(curSurah); const cnt = m ? m.ayah_count : data.count; if (curAyah < cnt) audio.playSingle(curSurah, curAyah + 1, { reps: store.settings.repsPerAyah, gapMs: store.settings.gapMs }); });

    audio.on('statechange', s => {
      P.pPlay.textContent = (s === 'playing' || s === 'gap' || s === 'loading') ? '⏸' : '▶';
      if (s !== 'stopped') show();
    });
    audio.on('loading', () => { show(); P.pSub.textContent = i18n.t('player.buffering'); });
    audio.on('ayahstart', (n, item) => {
      curAyah = n; if (item && item.surah != null) curSurah = item.surah;
      store.setLast({ surah: curSurah, ayah: n });
      const r = audio.getReciter(), sName = surahName(curSurah);
      P.pTitle.textContent = item && item.isFull ? sName : `${sName} · ${i18n.t('common.ayah', { n })}`;
      P.pSub.textContent = (r ? r.name_en : '') + (item && item.isFull ? '' : ` · ${data.riwayahLabel(audio.getRiwayah())}`);
      show();
      if (highlighter) { try { highlighter(n, item); } catch (e) {} }
    });
    audio.on('progress', frac => { P.playerProgress.firstElementChild.style.width = (frac * 100).toFixed(1) + '%'; });
    audio.on('rangedone', () => { P.playerProgress.firstElementChild.style.width = '0%'; });
  }
  function show() { P.player.hidden = false; }
  function hide() { P.player.hidden = true; }

  function onRiwayahChange(ri) {
    store.setSetting('riwayah', ri);
    audio.stop(); hide();
    reconfigure();
    nav.route(); // re-mount current view with new riwāyah
  }
  function setUiLang(l) {
    if (!i18n.has(l)) return;
    i18n.setLang(l);
    store.setSetting('uiLang', l);
    i18n.apply();             // html dir/lang + static chrome
    fillSurahSelect();        // surah names follow the UI script (Arabic vs transliteration)
    nav.buildSidebar();       // sidebar labels
    nav.route();              // re-mount current view in the new language
  }
  BA.app = {
    setTheme, refreshStreak, onRiwayahChange, reconfigure, setUiLang, onSurahChange,
    surahName: (n) => surahName(n),
    onAyah(fn) { highlighter = fn; },     // view registers a highlight hook (replaces previous)
    clearAyah() { highlighter = null; },
    get curAyah() { return curAyah; },
    get curSurah() { return curSurah; },
    // reusable translation-language <select>; changing it reloads & refreshes the view
    makeLangSelect() {
      const sel = util.el('select', { 'aria-label': i18n.t('common.translation') });
      data.LANGS.forEach(([v, label]) => {
        const o = util.el('option', { value: v }, v === 'off' ? i18n.t('lang.arabicOnly') : label);
        if (v === store.settings.lang) o.selected = true;
        sel.append(o);
      });
      sel.addEventListener('change', async () => {
        store.setSetting('lang', sel.value);
        if (sel.value !== 'off') { try { await data.loadTranslations(); } catch (e) { util.toast(i18n.t('app.couldNotLoadTranslation')); } }
        nav.route();
      });
      return sel;
    },
    // translation block for ayah n in the active language (or null when off/unavailable);
    // pass surah for cross-surah items (e.g. the Review queue), else current surah
    translationEl(n, surah) {
      const lang = store.settings.lang;
      if (!lang || lang === 'off') return null;
      const txt = data.translation(n, lang, surah);
      if (!txt) return null;
      const meta = data.langMeta(lang);
      return util.el('div', { class: 'translation', dir: meta ? meta.dir : 'ltr', lang }, txt);
    },
    canInstall() { return !!deferredPrompt; },
    async promptInstall() {
      if (!deferredPrompt) return false;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      return outcome === 'accepted';
    },
    isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream; },
    isStandalone() { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; },
  };

  async function boot() {
    setTheme(store.settings.theme || 'light');
    i18n.setLang(store.settings.uiLang || 'en');
    i18n.apply();
    audio.init(); initPlayer();

    const main = document.getElementById('main');
    try {
      await data.load();
    } catch (e) {
      main.innerHTML = '<div class="card">' + i18n.t('app.dataLoadError') + '</div>';
      console.error(e); return;
    }
    curSurah = store.settings.surah || 2;
    fillSurahSelect();
    fillRiwayahSelect();
    reconfigure();
    audio.setRate(store.settings.speed || 1);
    if (store.settings.lang && store.settings.lang !== 'off') { try { await data.loadTranslations(); } catch (e) {} }
    refreshStreak();
    if (BA.settings) BA.settings.applyFont(store.settings.font || 'scheherazade');
    nav.buildSidebar();

    // top-bar events
    document.getElementById('themeToggle').addEventListener('click',
      () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
    document.getElementById('riwayahSelect').addEventListener('change', e => onRiwayahChange(e.target.value));
    const surahSel = document.getElementById('surahSelect');
    if (surahSel) surahSel.addEventListener('change', e => onSurahChange(e.target.value));
    document.getElementById('menuToggle').addEventListener('click', () => nav.openMobile());
    document.getElementById('scrim').addEventListener('click', () => nav.closeMobile());

    // router
    window.addEventListener('hashchange', nav.route);
    if (!location.hash) location.hash = '#/' + (store.last.view || 'home');
    nav.route();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.BA = window.BA || {});
