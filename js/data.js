/* data.js — loads bundled surah text + reciter registry; riwāyah-aware accessors. */
(function (BA) {
  let surah = null, recs = null, trans = null;

  // translation languages (labels stand alone; text loads lazily from translations.json)
  const LANGS = [
    ['off', 'Arabic only'],
    ['en', 'English'],
    ['ar', 'العربية — الميسّر'],
    ['fr', 'Français'],
    ['es', 'Español'],
    ['ur', 'اردو'],
  ];

  const Data = {
    LANGS,
    async load() {
      const [s, r] = await Promise.all([
        fetch('./data/baqarah.json').then(x => x.json()),
        fetch('./data/reciters.json').then(x => x.json()),
      ]);
      surah = s; recs = r;
      return Data;
    },
    get loaded() { return !!surah; },
    get count() { return surah.ayah_count; },
    get name() { return surah; },
    ayah(n) { return surah.ayat[n - 1]; },
    text(n, ri) { return surah.ayat[n - 1].text[ri]; },
    words(n, ri) { return surah.ayat[n - 1].words[ri]; },
    bismillah(ri) { return surah.bismillah[ri]; },

    // translations (separate file, loaded on demand; never alters the Qur'an text)
    async loadTranslations() {
      if (!trans) trans = await fetch('./data/translations.json').then(x => x.json());
      return trans;
    },
    translationsReady() { return !!trans; },
    translation(n, lang) { return (trans && trans.t[lang]) ? trans.t[lang][n - 1] : ''; },
    langMeta(lang) { return (trans && trans.languages[lang]) || null; },
    langLabel(lang) { const f = LANGS.find(l => l[0] === lang); return f ? f[1] : lang; },

    get riwayat() { return recs.riwayat; },              // {hafs:{label..}, warsh:{...}}
    riwayahList() { return Object.keys(recs.riwayat); },
    riwayahLabel(ri) { const r = recs.riwayat[ri]; return r ? r.label_en : ri; },

    reciters() { return recs.reciters; },
    reciter(id) { return recs.reciters.find(r => r.id === id); },
    recitersFor(ri) { return recs.reciters.filter(r => r.riwayah === ri); },
    // search by ayah number or by (diacritic-insensitive) Arabic text → [{n, text}]
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
