/* reciters.js — build audio URLs for a reciter (per-ayah EveryAyah, or full-surah mp3quran). */
(function (BA) {
  const { pad3 } = BA.util;
  const SURAH = 2;

  const R = {
    canLoop(reciter) { return reciter && reciter.capability === 'per-ayah'; },

    // per-ayah file (EveryAyah). folder may contain a slash (e.g. "warsh/warsh_..._128kbps")
    ayahUrl(reciter, ayah) {
      return `https://everyayah.com/data/${reciter.folder}/${pad3(SURAH)}${pad3(ayah)}.mp3`;
    },

    // whole-surah file (mp3quran): {server}002.mp3
    surahUrl(reciter) {
      return `${reciter.server}${pad3(SURAH)}.mp3`;
    },

    // every per-ayah url for the whole surah (used by the offline downloader)
    allAyahUrls(reciter, count) {
      const out = [];
      for (let a = 1; a <= count; a++) out.push(R.ayahUrl(reciter, a));
      return out;
    },
  };
  BA.reciters = R;
})(window.BA = window.BA || {});
