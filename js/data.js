/* data.js — whole-Qur'an data layer. Loads a small surah index up front, then
   lazily fetches + caches one surah file at a time (data/quran/NNN.json), with a
   "current surah" pointer so the existing view accessors keep their signatures.
   Translations are one whole-Qur'an file per language, loaded on demand. */
(function (BA) {
  let index = null, recs = null;
  const surahCache = new Map();     // surah number → surah object
  let cur = null, curN = 2;         // current surah object + number
  const trans = {};                 // lang → { language:{...}, t:{ "s":[...] } }

  // translation languages (labels stand alone; text loads lazily per language)
  const LANGS = [
    ['off', 'Arabic only'],
    ['en', 'English'],
    ['ar', 'العربية — الميسّر'],
    ['fr', 'Français'],
    ['es', 'Español'],
    ['ur', 'اردو'],
  ];

  const pad3 = BA.util.pad3;

  const Data = {
    LANGS,
    async load() {
      const [idx, r] = await Promise.all([
        fetch('./data/quran/index.json').then(x => x.json()),
        fetch('./data/reciters.json').then(x => x.json()),
      ]);
      index = idx; recs = r;
      await this.setCurrent((BA.store.settings.surah) || 2);
      return Data;
    },
    get loaded() { return !!cur; },

    // ---- surahs (lazy + cached) ----
    async loadSurah(n) {
      if (surahCache.has(n)) return surahCache.get(n);
      const s = await fetch(`./data/quran/${pad3(n)}.json`).then(x => x.json());
      surahCache.set(n, s);
      return s;
    },
    async setCurrent(n) { const s = await this.loadSurah(n); cur = s; curN = n; return s; },
    surahLoaded(n) { return surahCache.has(n); },
    get currentSurah() { return curN; },
    surahMeta(n) { return index.surahs.find(s => s.n === (n == null ? curN : n)) || null; },
    surahList() { return index.surahs; },
    get totalAyat() { return index.total_ayat; },

    // ---- current-surah accessors (unchanged signatures) ----
    get count() { return cur.ayah_count; },
    get name() { return cur; },
    ayah(n) { return cur.ayat[n - 1]; },
    text(n, ri) { return cur.ayat[n - 1].text[ri]; },
    words(n, ri) { return cur.ayat[n - 1].words[ri]; },

    // ---- explicit-surah reads (cross-surah review; surah must be loadSurah'd) ----
    ayahIn(s, n) { const su = surahCache.get(s); return su ? su.ayat[n - 1] : null; },
    textIn(s, n, ri) { const su = surahCache.get(s); return su ? su.ayat[n - 1].text[ri] : ''; },
    wordsIn(s, n, ri) { const su = surahCache.get(s); return su ? su.ayat[n - 1].words[ri] : []; },

    // basmala banner: empty where it isn't a prefixed line (surah 1 counts it as
    // ayah 1; surah 9 has none) so views can render it unconditionally.
    bismillah(ri) { const m = this.surahMeta(); return (m && m.basmalah_prefixed === false) ? '' : index.bismillah[ri]; },

    // ---- translations (one file per language, keyed by surah number string) ----
    async loadTranslations(lang) {
      const l = lang || BA.store.settings.lang;
      if (!l || l === 'off') return null;
      if (!trans[l]) trans[l] = await fetch(`./data/translations/${l}.json`).then(x => x.json());
      return trans[l];
    },
    translationsReady(lang) { const l = lang || BA.store.settings.lang; return !!trans[l]; },
    translation(n, lang, surah) { const tr = trans[lang], s = surah == null ? curN : surah; return (tr && tr.t[s]) ? tr.t[s][n - 1] : ''; },
    langMeta(lang) { return (trans[lang] && trans[lang].language) || null; },
    langLabel(lang) { const f = LANGS.find(l => l[0] === lang); return f ? f[1] : lang; },

    // ---- reciters / riwāyāt ----
    get riwayat() { return recs.riwayat; },
    riwayahList() { return Object.keys(recs.riwayat); },
    riwayahLabel(ri) { const r = recs.riwayat[ri]; return r ? r.label_en : ri; },

    reciters() { return recs.reciters; },
    reciter(id) { return recs.reciters.find(r => r.id === id); },
    recitersFor(ri) { return recs.reciters.filter(r => r.riwayah === ri); },

    // search the CURRENT surah by ayah number or (diacritic-insensitive) Arabic → [{n, text}]
    search(query, ri, limit = 25) {
      const q = (query || '').trim();
      if (!q) return [];
      if (/^\d+$/.test(q)) {
        const n = parseInt(q, 10);
        return (n >= 1 && n <= this.count) ? [{ n, text: this.text(n, ri), byNumber: true }] : [];
      }
      const nq = BA.util.normalizeArabic(q);
      if (nq.length < 2) return [];
      const out = [];
      for (let n = 1; n <= this.count; n++) {
        if (BA.util.normalizeArabic(this.text(n, ri)).includes(nq)) {
          out.push({ n, text: this.text(n, ri) });
          if (out.length >= limit) break;
        }
      }
      return out;
    },

    // pick a sensible reciter for a riwāyah (prefer teaching, else first per-ayah, else first)
    defaultReciter(ri) {
      const list = this.recitersFor(ri);
      return (list.find(r => r.teaching && r.capability === 'per-ayah')
           || list.find(r => r.capability === 'per-ayah')
           || list[0]);
    },
  };
  BA.data = Data;
})(window.BA = window.BA || {});
