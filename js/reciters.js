/* reciters.js — build audio URLs for a reciter (per-ayah EveryAyah, or full-surah mp3quran). */
(function (BA) {
  const { pad3 } = BA.util;

  const R = {
    canLoop(reciter) { return reciter && reciter.capability === 'per-ayah'; },

    // per-ayah file (EveryAyah). folder may contain a slash (e.g. "warsh/warsh_..._128kbps")
    ayahUrl(reciter, surah, ayah) {
      return `https://everyayah.com/data/${reciter.folder}/${pad3(surah)}${pad3(ayah)}.mp3`;
    },

    // whole-surah file (mp3quran): {server}002.mp3
    surahUrl(reciter, surah) {
      return `${reciter.server}${pad3(surah)}.mp3`;
    },

    // every per-ayah url for a surah (used by the offline downloader)
    allAyahUrls(reciter, surah, count) {
      const out = [];
      for (let a = 1; a <= count; a++) out.push(R.ayahUrl(reciter, surah, a));
      return out;
    },
  };
  BA.reciters = R;
})(window.BA = window.BA || {});
