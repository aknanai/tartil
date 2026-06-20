# Al-Baqarah · Hifz  🕌

A calm, **offline-friendly** web app for memorizing **Surah Al-Baqarah** (286 ayāt), with
both **Ḥafṣ ʿan ʿĀṣim** and **Warsh ʿan Nāfiʿ** readings — text *and* audio.

> Built to be hosted free on **GitHub Pages**. No backend, no build step — just static files.

## Features
- **🔁 Listen & Loop** — per-ayah recitation with *repeat each ayah*, *loop a range* (e.g. 1–5),
  and an adjustable gap between repeats. Listen-and-repeat is the backbone of ḥifẓ.
- **🙈 Memorize** — hide the words progressively (last word → half → first letters → blank),
  tap any hidden word to *peek*, and mark each ayah *learning / solid / mastered*.
- **✅ Test** — fill-in-the-blank and recall-the-next-ayah quizzes.
- **📊 Progress** — a 286-cell heatmap, % memorized, daily streak, and export/import backup.
- **Two readings** — switch **Ḥafṣ ↔ Warsh** at the top; the Arabic text **and** the audio
  change together (Warsh differs from Ḥafṣ in the actual rasm, not just pronunciation).
- **Serene Mushaf** theme with **light/dark** mode, and an **offline download** so a reciter’s
  audio works with no signal (mosque / commute).
- Progress is saved **only on your device** (localStorage). Back it up from the Progress tab.

## Run locally
A service worker + `fetch()` need HTTP (not `file://`):
```bash
python3 -m http.server 8000      # then open http://localhost:8000
```

## Deploy to GitHub Pages
1. Push this folder to a repo (e.g. `aknanai/ba9ara`) on the `main` branch.
2. Repo → **Settings → Pages → Source = Deploy from a branch → `main` / `(root)`**.
3. Live at `https://<user>.github.io/ba9ara/`. All paths are relative, so the project sub-path
   works as-is. `.nojekyll` is included so `assets/` and `js/` are served verbatim.
4. (Optional) add a `CNAME` file for a custom domain.

## Reciters
| Reading | Per-ayah (loopable) | Whole-surah |
|---|---|---|
| Ḥafṣ | Al-Ḥuṣarī (Muʿallim), Al-Minshāwī, Al-ʿAfāsy | — |
| Warsh | Ibrāhīm al-Dōsarī, Yāsīn al-Jazāʾirī, ʿAbd al-Bāsiṭ | ʿUmar al-Qazābrī, Al-ʿAyyūn al-Kūshī, Al-Ḥuṣarī |

## Data & credits
- **Ḥafṣ text** — [Tanzil Project](https://tanzil.net) (Uthmani). *Verbatim redistribution with
  attribution; text unmodified.*
- **Warsh text** — QPC Warsh rasm ([aziz011133/quran_warsh](https://github.com/aziz011133/quran_warsh)),
  **remapped from the Madani verse count (285) to the standard Kufan count (286)** so it lines up
  with the audio. See `tools/build_data.py` for the verified alignment (the only structural
  differences in al-Baqarah are: `الٓمٓ` joined to v1, one split at v200/201, and Āyat al-Kursī
  counted as two verses — all reconciled and asserted at build time).
- **Per-ayah audio** — [EveryAyah](https://everyayah.com). **Full-surah Warsh** — [mp3quran.net](https://mp3quran.net).
- **Fonts** — Scheherazade New (SIL) & Amiri Quran — both **OFL**.

## Rebuild the data
```bash
python3 tools/build_data.py            # uses cached sources in tools/
python3 tools/build_data.py --fetch    # re-download Ḥafṣ + Warsh sources first
```
Reciters are curated in `data/reciters.json` (verified against the mp3quran v3 API).

## Project layout
```
index.html · sw.js · manifest.webmanifest · .nojekyll
assets/   style.css · nav.js · icon.svg · fonts/
js/       util store data reciters audio-engine reveal app  +  views/
data/     baqarah.json (both readings) · reciters.json · credits.json
tools/    build_data.py
```

Code is MIT (see `LICENSE`). The Qur’an text and fonts keep their own licenses noted above.
May Allah make it a means of benefit. 🤲
