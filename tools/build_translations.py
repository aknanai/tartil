#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_translations.py — produce the whole-Qur'an translation files (D7).

Emits one file per language:  data/translations/{en,ar,fr,es,ur}.json
Schema (D7):
    { "language": {"name": ..., "source": ..., "dir": ...},
      "t": {"1": [7 strings], "2": [286 strings], ..., "114": [...]} }   # keyed by surah no.

Sources — the SAME Tanzil translation editions the current data/translations.json was
built from (verified: en.sahih surah-2 output == current file, 286/286 exact):
    en  en.sahih        Saheeh International
    ar  ar.muyassar     Tafsīr al-Muyassar (explanatory, NOT the Qur'an text)
    fr  fr.hamidullah   Muhammad Hamidullah
    es  es.cortes       Julio Cortés
    ur  ur.jalandhry    Fateh Muhammad Jalandhry

Sources cached next to this script; pass --fetch to re-download.

Assertion: surah-2 arrays equal the current data/translations.json arrays
(whitespace-normalized) — a regression guard so nothing silently drifts.
"""
import json, os, sys, socket, urllib.request, argparse, time

sys.stdout.reconfigure(encoding="utf-8")   # cp1252 console; we print Arabic/Urdu

# force IPv4 (tanzil.net's IPv6 route hangs in some environments)
_orig_getaddrinfo = socket.getaddrinfo
socket.getaddrinfo = lambda h, *a, **k: [r for r in _orig_getaddrinfo(h, *a, **k)
                                         if r[0] == socket.AF_INET]

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
KUFAN_TOTAL = 6236

# lang -> (tanzil edition slug, {name, source, dir})  — metadata verbatim from the
# current data/translations.json so the app's language picker is unchanged.
EDITIONS = {
    "en": ("en.sahih",
           {"name": "English", "source": "Saheeh International", "dir": "ltr"}),
    "ar": ("ar.muyassar",
           {"name": "العربية — الميسّر",
            "source": "Tafsīr al-Muyassar (explanatory, NOT the Qur'an text)", "dir": "rtl"}),
    "fr": ("fr.hamidullah",
           {"name": "Français", "source": "Muhammad Hamidullah", "dir": "ltr"}),
    "es": ("es.cortes",
           {"name": "Español", "source": "Julio Cortés", "dir": "ltr"}),
    "ur": ("ur.jalandhry",
           {"name": "اردو", "source": "Fateh Muhammad Jalandhry", "dir": "rtl"}),
}
TANZIL_TRANS = "https://tanzil.net/trans/{slug}"


def fetch(slug, force):
    cache = os.path.join(HERE, f"_src_trans_{slug}.txt")
    if force or not os.path.exists(cache):
        url = TANZIL_TRANS.format(slug=slug)
        print(f"  downloading {url}")
        last = None
        for attempt in range(3):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "ba9ara-build/1.0"})
                data = urllib.request.urlopen(req, timeout=180).read()
                open(cache, "wb").write(data)
                break
            except Exception as e:
                last = e
                print(f"    attempt {attempt+1} failed: {e!r}; retrying...")
                time.sleep(3)
        else:
            raise SystemExit(f"FETCH FAILED after retries: {slug}\n  {last!r}")
    return open(cache, encoding="utf-8").read()


def parse(raw):
    """Tanzil pipe format 'surah|ayah|text' -> {surah: {ayah: text}}."""
    d = {}
    for line in raw.splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '|' not in line:
            continue
        s, a, t = line.split('|', 2)
        d.setdefault(int(s), {})[int(a)] = t.strip()
    return d


def nz(x):
    return ' '.join(x.split())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fetch", action="store_true", help="re-download sources")
    args = ap.parse_args()

    # expected per-surah ayah counts from the built index (or the Kufan table)
    idx_path = os.path.join(ROOT, "data", "quran", "index.json")
    if os.path.exists(idx_path):
        idx = json.load(open(idx_path, encoding="utf-8"))
        counts = {su["n"]: su["ayah_count"] for su in idx["surahs"]}
    else:
        raise SystemExit("data/quran/index.json missing — run build_data.py first")

    cur = json.load(open(os.path.join(ROOT, "data", "translations.json"), encoding="utf-8"))
    outdir = os.path.join(ROOT, "data", "translations")
    os.makedirs(outdir, exist_ok=True)

    print("=" * 68)
    total_kb = 0
    for lang, (slug, meta) in EDITIONS.items():
        raw = fetch(slug, args.fetch)
        d = parse(raw)
        # count assertion per surah
        got_total = sum(len(d.get(s, {})) for s in range(1, 115))
        assert got_total == KUFAN_TOTAL, f"{slug}: {got_total} ayat, expected {KUFAN_TOTAL}"
        t = {}
        for s in range(1, 115):
            need = counts[s]
            assert len(d[s]) == need and max(d[s]) == need, \
                f"{slug} surah {s}: {len(d[s])} ayat, expected {need}"
            t[str(s)] = [d[s][a] for a in range(1, need + 1)]

        # regression: surah-2 array == current translations.json (whitespace-normalized)
        cur_arr = cur["t"][lang]
        new_arr = t["2"]
        assert len(cur_arr) == len(new_arr) == 286
        mism = [i + 1 for i in range(286) if nz(cur_arr[i]) != nz(new_arr[i])]
        status = "PASS" if not mism else f"FAIL at ayat {mism[:8]}"
        exact = sum(1 for i in range(286) if cur_arr[i] == new_arr[i])

        out = {"language": meta, "t": t}
        path = os.path.join(outdir, f"{lang}.json")
        json.dump(out, open(path, "w", encoding="utf-8"),
                  ensure_ascii=False, separators=(",", ":"))
        kb = os.path.getsize(path) // 1024
        total_kb += kb
        print(f"  {lang} ({slug}): 114 surahs, {KUFAN_TOTAL} ayat, {kb} KB  |  "
              f"surah-2 regression {status} (exact {exact}/286)")
        assert not mism, f"{lang}: surah-2 regression FAILED at {mism[:8]}"

    print("=" * 68)
    print(f"  data/translations/ total: {total_kb} KB across {len(EDITIONS)} files")


if __name__ == "__main__":
    main()
