# Tartīl · تَرْتِيل  🕌

**Tartīl** (تَرْتِيل — “measured, beautiful recitation”, Qurʾan 73:4) is a calm,
**offline-friendly** web app for memorizing the **whole Qurʾan** — all **114 surahs
(6236 ayāt)** — in both **Ḥafṣ ʿan ʿĀṣim** and **Warsh ʿan Nāfiʿ** readings, text *and* audio.
(It began as an Al-Baqarah tool and now covers every surah; pick one from the **Surah** menu
in the top bar.)

> Built to be hosted free on **GitHub Pages**. No backend, no build step — just static files.
> Surah text loads lazily one surah at a time, so it stays fast and works offline.

## Features
- **🔁 Listen & Loop** — per-ayah recitation with *repeat each ayah*, *loop a range* (e.g. 1–5),
  and an adjustable gap between repeats. Listen-and-repeat is the backbone of ḥifẓ.
- **🙈 Memorize** — hide the words progressively (last word → half → first letters → blank),
  tap any hidden word to *peek*, and mark each ayah *learning / solid / mastered*.
- **🏗️ Drill** — a configurable *cumulative* drill: repeat each new ayah, then chain it back to
  the range start (10×x, 11×y, 10–11×z, 12×t, 10–12×z … ), driving audio **and** progressive
  text-hiding together. Presets, a per-step editor, saveable custom patterns, and it grades the
  range into spaced repetition when you finish.
- **🎯 Review** — a Leitner spaced-repetition queue (1 → 3 → 7 → 16 → 40 days) that surfaces
  exactly what’s due today, **across every surah you’ve touched**, plus a daily intake of new ayāt.
- **✅ Test** — fill-the-blank, type-the-word, listen-&-recall, and recite-&-self-grade quizzes.
- **📊 Progress** — a per-surah heatmap, % memorized, a whole-Qurʾan summary, daily streak, and
  export/import backup.
- **Two readings** — switch **Ḥafṣ ↔ Warsh** at the top; the Arabic text **and** the audio
  change together (Warsh differs from Ḥafṣ in the actual rasm, not just pronunciation).
- **Interface in 5 languages** — the app’s own buttons/menus translate to **English, Français,
  Español, اردو, العربية** (Settings → App language), with full **right-to-left** layout for
  Urdu & Arabic. This is separate from the per-ayah meaning translation; the Qur’an text is never
  touched. Strings live in `js/i18n.js`.
- **Serene Mushaf** theme with **light/dark** mode, and an **offline download** so a reciter’s
  audio works with no signal (mosque / commute).
- Progress is saved **only on your device** (localStorage). Back it up from the Progress tab.

## Run locally
A service worker + `fetch()` need HTTP (not `file://`):
```bash
python3 -m http.server 8000      # then open http://localhost:8000
```

## Deploy to GitHub Pages
1. Push this folder to a repo (e.g. `aknanai/tartil`) on the `main` branch.
2. Repo → **Settings → Pages → Source = Deploy from a branch → `main` / `(root)`**.
3. Live at `https://<user>.github.io/tartil/` (this app: **https://aknanai.github.io/tartil/**).
   All paths are relative, so the project sub-path
   works as-is. `.nojekyll` is included so `assets/` and `js/` are served verbatim.
4. (Optional) add a `CNAME` file for a custom domain.

## Reciters
The per-ayah reciters (EveryAyah) cover **all 114 surahs**, so every ayah of every surah is
loopable/drillable. The whole-surah Warsh recordings play a surah end-to-end (no per-ayah loop).
| Reading | Per-ayah (loopable) | Whole-surah |
|---|---|---|
| Ḥafṣ | Al-Ḥuṣarī (Muʿallim), Al-Minshāwī, Al-ʿAfāsy, Sudais, Shuraym, … | — |
| Warsh | Ibrāhīm al-Dōsarī, Yāsīn al-Jazāʾirī, ʿAbd al-Bāsiṭ | ʿUmar al-Qazābrī, Al-ʿAyyūn al-Kūshī, Al-Ḥuṣarī |

## Data & credits
- **Ḥafṣ text** — [Tanzil Project](https://tanzil.net) (Uthmani, whole Qurʾan). *Verbatim
  redistribution with attribution; text unmodified.*
- **Warsh text** — QPC Warsh rasm ([aziz011133/quran_warsh](https://github.com/aziz011133/quran_warsh)),
  **remapped from the Madani verse count to the standard Kufan numbering** so it lines up with the
  audio. `tools/build_data.py` does this per surah with a greedy rasm-overlap aligner and writes
  `tools/warsh_align_report.json` (per-surah splits/merges + overlap); it hard-fails on any weak
  alignment and asserts Baqarah’s known ops bit-for-bit. **The Arabic text is never modified.**
- **Translations** — Saheeh Intl (en), Tafsīr al-Muyassar (ar), Hamidullah (fr), Cortés (es),
  Jalandhry (ur), all from Tanzil — one whole-Qurʾan file per language, loaded on demand.
- **Per-ayah audio** — [EveryAyah](https://everyayah.com). **Full-surah Warsh** — [mp3quran.net](https://mp3quran.net).
- **Fonts** — Scheherazade New (SIL) & Amiri Quran — both **OFL**.

## Rebuild the data
```bash
python3 tools/build_data.py                 # all 114 surahs → data/quran/{001..114}.json + index.json
python3 tools/build_data.py --surah 2       # rebuild a single surah
python3 tools/build_data.py --fetch         # re-download Ḥafṣ + Warsh sources first
python3 tools/build_translations.py         # data/translations/{en,ar,fr,es,ur}.json
```
Review `tools/warsh_align_report.json` after a full build (surahs with structural ops, min
overlap, and a soft-review list of low-confidence ayāt). Reciters are curated in
`data/reciters.json` (verified against the mp3quran v3 API).

## Splitting full-surah audio into ayāt
Some beautiful Warsh reciters are only published as a *single whole-surah file*, so
the app can't loop or hide them per ayah. `tools/split_ayat.py` cuts one long
recitation into per-ayah clips named `{SS}{AAA}.mp3` (the EveryAyah scheme, e.g.
`002001.mp3`) so they drop straight into a `reciters.json` entry.

It doesn't trust Whisper's transcript (it mis-reads Qur'anic Arabic); instead it
takes Whisper's **word timestamps**, aligns them to the **known ayah text** with a
Needleman–Wunsch pass, places each cut in the pause between ayāt, and snaps it to
the quietest nearby moment. A `report.json` flags any suspicious durations to check.

```bash
pip install -r tools/requirements-split.txt        # + a system ffmpeg on PATH

# on a GPU box, with the medium model:
python tools/split_ayat.py \
    --audio qazabri_baqarah.mp3 --surah 2 --riwayah warsh \
    --out out/qazabri --model medium --device cuda

python tools/split_ayat.py --self-test             # logic check, no model/audio
```

Reference text comes from the app’s own `data/quran/{NNN}.json` (any surah, both readings);
if a surah file is absent it falls back to `api.alquran.cloud` (Ḥafṣ). Pass `--ref-json FILE`
for a Warsh edition the API lacks. After splitting, host the folder and add a `per-ayah` reciter
pointing at it (see the app tie-in note in `tools/split_ayat.py`).

## Project layout
```
index.html · sw.js · manifest.webmanifest · .nojekyll
assets/   style.css · nav.js · icon.svg · fonts/
js/       util i18n store data reciters audio-engine reveal drill app  +  views/
          views/ home review listen memorize drill test progress settings
data/     quran/index.json + quran/{001..114}.json · translations/{en,ar,fr,es,ur}.json
          reciters.json · credits.json
tools/    build_data.py · build_translations.py · split_ayat.py · warsh_align_report.json
```

Code is MIT (see `LICENSE`). The Qur’an text and fonts keep their own licenses noted above.
May Allah make it a means of benefit. 🤲
