#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_data.py — produce data/baqarah.json (Surah 2, both riwayat, Kufan-numbered).

Hafs  text : Tanzil Uthmani (Kufan count, 286 ayat).            -> authoritative
Warsh text : aziz011133/quran_warsh  warshData_v2-1.json        -> authentic Warsh rasm
             (Madani count, 285 ayat; al-Baqarah joins  الٓمٓ  into v1,
              counts Ayat al-Kursi as two verses, etc.)

EveryAyah's Warsh AUDIO is sliced on the Kufan boundaries (002001..002286), so the
Warsh TEXT must be remapped from its native Madani numbering onto the Kufan numbering
to line up with the audio.  This script discovers that mapping with a greedy verse
aligner (match / split-one-warsh-into-two-kufan / merge-two-warsh-into-one-kufan)
scored on bare-rasm token overlap, then ASSERTS the result is exactly the three
structural points we verified by hand:

    SPLIT  W1   -> H1  (الٓمٓ)      + H2  (ذلك الكتاب ...)
    SPLIT  W199 -> H200            + H201
    MERGE  W253 + W254 -> H255     (Ayat al-Kursi)

If a source ever changes shape the asserts fail loudly instead of silently shipping
mis-aligned scripture.  Sources are cached next to this script; pass --fetch to
re-download them.
"""
import json, re, sys, os, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TANZIL_CACHE = os.path.join(HERE, "_src_tanzil_hafs.txt")
WARSH_CACHE  = os.path.join(HERE, "_src_warsh_aziz.json")
TANZIL_URL = ("https://tanzil.net/pub/download/index.php"
              "?marks=true&sajdah=true&alef=true&quranType=uthmani&outType=txt-2&agree=true")
WARSH_URL  = "https://raw.githubusercontent.com/aziz011133/quran_warsh/main/warshData_v2-1.json"

BASMALA_HAFS  = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"
BASMALA_WARSH = "بِسۡمِ اِ۬للَّهِ اِ۬لرَّحۡمَٰنِ اِ۬لرَّحِيمِ"

# ---- normalisation: reduce to bare rasm for ALIGNMENT ONLY (display keeps full text) ----
KEEP = set(range(0x0621, 0x064B))               # Arabic letters hamza..yaa
FOLD = {'أ':'ا','إ':'ا','آ':'ا','ٱ':'ا','ى':'ي','ئ':'ي','ؤ':'و','ء':'','ة':'ه'}
ORNAMENT = re.compile(r'[ﭐ-﷿ﹰ-﻿۞]')   # ayah-number ligatures, hizb sign

def fetch(url, cache, force):
    if force or not os.path.exists(cache):
        print(f"  downloading {url}")
        req = urllib.request.Request(url, headers={"User-Agent": "ba9ara-build/1.0"})
        data = urllib.request.urlopen(req, timeout=60).read()
        open(cache, "wb").write(data)
    return open(cache, encoding="utf-8").read()

def norm_words(t):
    out = []
    for ch in t:
        ch = FOLD.get(ch, ch)
        if ch == '': continue
        if ch == ' ': out.append(' ')
        elif ord(ch) in KEEP: out.append(ch)
    return [w for w in ''.join(out).split() if w]

def jac(a, b):
    A, B = set(a), set(b)
    return len(A & B) / len(A | B) if (A | B) else 1.0

def best_split(words, hafs_a, hafs_b):
    """split display tokens `words` into two parts best matching hafs_a / hafs_b."""
    Ha, Hb = set(norm_words(hafs_a)), set(norm_words(hafs_b))
    nwords = [' '.join(norm_words(w)) for w in words]   # bare-rasm form of each token
    best = (-1, len(words) // 2)
    for cut in range(1, len(words)):
        p1 = set(w for w in nwords[:cut] if w)
        p2 = set(w for w in nwords[cut:] if w)
        sc = jac(p1, Ha) + jac(p2, Hb)
        if sc > best[0]:
            best = (sc, cut)
    return best[1]

def main():
    force = "--fetch" in sys.argv
    raw_h = fetch(TANZIL_URL, TANZIL_CACHE, force)
    raw_w = fetch(WARSH_URL, WARSH_CACHE, force)

    # --- Hafs (Kufan) ---
    hafs = {}
    for line in raw_h.splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '|' not in line: continue
        s, a, t = line.split('|', 2)
        if s == '2': hafs[int(a)] = t.strip()
    # Tanzil prepends the 4-word basmala to 2:1 -> strip it (basmala kept separately).
    w1 = hafs[1].split()
    if w1 and norm_words(w1[0]) and norm_words(w1[0])[0] == "بسم":
        hafs[1] = ' '.join(w1[4:]).strip()
    assert len(hafs) == 286 and norm_words(hafs[1]) == ["الم"], (len(hafs), hafs[1])

    # --- Warsh (Madani) ---
    warr = json.loads(raw_w)
    warsh = {}
    for r in warr:
        if r.get("sura_no") == 2:
            warsh[r["aya_no"]] = ORNAMENT.sub('', r["aya_text"]).strip()
    assert len(warsh) == 285, len(warsh)

    Hn = {k: norm_words(v) for k, v in hafs.items()}
    Wn = {k: norm_words(v) for k, v in warsh.items()}

    # --- greedy verse aligner -> warsh text keyed by Kufan ayah number ---
    wk = {}                      # kufan ayah -> display warsh text
    structural = []
    i, j = 1, 1
    while i <= 286 and j <= 285:
        m  = jac(Hn[i], Wn[j])
        sp = jac(Hn[i] + (Hn[i+1] if i+1 <= 286 else []), Wn[j]) if i+1 <= 286 else -1
        mg = jac(Hn[i], Wn[j] + (Wn[j+1] if j+1 <= 285 else [])) if j+1 <= 285 else -1
        best = max(m, sp, mg)
        if best == m or (m >= 0.5 and m + 0.08 >= best):
            wk[i] = warsh[j]; i += 1; j += 1
        elif sp >= mg:                                   # one warsh -> two kufan
            words = warsh[j].split()
            cut = best_split(words, hafs[i], hafs[i+1])
            wk[i]   = ' '.join(words[:cut])
            wk[i+1] = ' '.join(words[cut:])
            structural.append(("SPLIT", i, j)); i += 2; j += 1
        else:                                            # two warsh -> one kufan
            wk[i] = warsh[j] + " " + warsh[j+1]
            structural.append(("MERGE", i, j)); i += 1; j += 2

    assert (i, j) == (287, 286), f"aligner did not consume all verses: {(i,j)}"
    assert structural == [("SPLIT", 1, 1), ("SPLIT", 200, 199), ("MERGE", 255, 253)], structural
    assert len(wk) == 286 and wk[1].replace('ـ','') and wk[255].count(' ') > 10
    # sanity: every kufan ayah's warsh text overlaps its hafs text
    weak = [k for k in range(1, 287) if jac(Hn[k], norm_words(wk[k])) < 0.40]
    assert not weak, f"weak overlap at {weak}"

    # --- assemble records ---
    # `words` = letter-bearing tokens only (drop standalone waqf marks like ۛ that
    # Tanzil space-separates) so fill-in-blank / first-letter hints get real words.
    def real_words(t):
        return [w for w in t.split() if any(0x0621 <= ord(c) <= 0x064A for c in w)]
    ayat = []
    diffs = 0
    for k in range(1, 287):
        ht, wt = hafs[k], wk[k]
        if norm_words(ht) != norm_words(wt): diffs += 1
        ayat.append({
            "n": k,
            "key": f"2:{k}",
            "text":  {"hafs": ht, "warsh": wt},
            "words": {"hafs": real_words(ht), "warsh": real_words(wt)},
            "sajda": False,
        })
    out = {
        "surah": 2,
        "name_ar": "البقرة",
        "name_en": "Al-Baqarah",
        "ayah_count": 286,
        "riwayat": ["hafs", "warsh"],
        "bismillah": {"hafs": BASMALA_HAFS, "warsh": BASMALA_WARSH},
        "ayat": ayat,
    }
    os.makedirs(os.path.join(ROOT, "data"), exist_ok=True)
    path = os.path.join(ROOT, "data", "baqarah.json")
    json.dump(out, open(path, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    kb = os.path.getsize(path) // 1024
    print(f"  structural ops : {structural}")
    print(f"  ayat with hafs/warsh rasm differences : {diffs}")
    print(f"  wrote data/baqarah.json ({kb} KB, 286 ayat x 2 riwayat)")

    credits = {
        "text": [
            {"riwayah": "hafs", "source": "Tanzil Project", "url": "https://tanzil.net",
             "license": "Verbatim redistribution permitted with attribution; do not modify the text."},
            {"riwayah": "warsh", "source": "aziz011133/quran_warsh (Warsh ʿan Nāfiʿ, QPC rasm)",
             "url": "https://github.com/aziz011133/quran_warsh",
             "note": "Remapped from Madani (285) to Kufan (286) numbering to align with per-ayah audio."},
        ],
        "audio": [
            {"source": "EveryAyah", "url": "https://everyayah.com",
             "use": "per-ayah recitations (Hafs + Warsh) for the repeat/loop engine"},
            {"source": "mp3quran.net", "url": "https://mp3quran.net",
             "use": "full-surah Warsh recitations (e.g. ʿUmar al-Qazābrī)"},
        ],
    }
    json.dump(credits, open(os.path.join(ROOT, "data", "credits.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)
    print("  wrote data/credits.json")

if __name__ == "__main__":
    main()
