/* data.js — loads bundled surah text + reciter registry; riwāyah-aware accessors. */
(function (BA) {
  let surah = null, recs = null;

  const Data = {
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

    get riwayat() { return recs.riwayat; },              // {hafs:{label..}, warsh:{...}}
    riwayahList() { return Object.keys(recs.riwayat); },
    riwayahLabel(ri) { const r = recs.riwayat[ri]; return r ? r.label_en : ri; },

    reciters() { return recs.reciters; },
    reciter(id) { return recs.reciters.find(r => r.id === id); },
    recitersFor(ri) { return recs.reciters.filter(r => r.riwayah === ri); },
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
