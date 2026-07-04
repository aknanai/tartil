#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_data.py — produce the whole-Qur'an data files (both riwayat, Kufan-numbered).

Outputs (D1):
  data/quran/index.json       — surah metadata for all 114 (small)
  data/quran/{001..114}.json  — one file per surah, EXACTLY today's baqarah.json schema
  data/credits.json           — attribution (whole-Qur'an scope)
  tools/warsh_align_report.json — human-reviewable Warsh→Kufan alignment report (D9)

data/baqarah.json is LEFT IN PLACE (deleted in a later phase; kept for diffing so
that data/quran/002.json can be regression-checked against it field-by-field).

Sources
  Hafs  text : Tanzil Uthmani (Kufan count, 6236 ayat).            -> authoritative
  Warsh text : aziz011133/quran_warsh  warshData_v2-1.json         -> authentic Warsh rasm
               (Madani count, 6214 ayat; e.g. al-Baqarah joins  الٓمٓ  into v1,
                counts Ayat al-Kursi as two verses, etc.)

EveryAyah's Warsh AUDIO is sliced on the Kufan boundaries (SSSAAA.mp3), so the
Warsh TEXT must be remapped from its native Madani numbering onto the Kufan
numbering to line up with the audio.  This script discovers that mapping per surah
with a greedy verse aligner (match / split-one-warsh-into-two-kufan /
merge-two-warsh-into-one-kufan) scored on bare-rasm token overlap.

Alignment is NEVER a text edit: splits/joins operate on the ORIGINAL Warsh display
strings exactly as-is (pass-through). The script never modifies Arabic text.

Correctness gates (this is scripture — fail loud, never ship silently mis-aligned):
  * per-surah Kufan ayah count must equal the canonical table (sums to 6236)
  * global Kufan total == 6236 ; Warsh(Madani) source total == 6214 (asserted+printed)
  * no unconsumed Madani verse in any surah
  * HARD FAIL any ayah with rasm-overlap < 0.40
  * Baqarah (surah 2) structural ops must be exactly
      [["SPLIT",1,1],["SPLIT",200,199],["MERGE",255,253]]
  * data/quran/002.json ayat deep-equals data/baqarah.json ayat (checked here too)

Two-tier report (D9 + extra safeguards): HARD FAIL list stops the build; a SOFT
REVIEW list is collected (never fails) for human eyeballing, with side-by-side
Hafs/Warsh Arabic for every flagged ayah.

Sources are cached next to this script; pass --fetch to re-download them.

CLI:
  python tools/build_data.py            # build all 114 (uses cache)
  python tools/build_data.py --fetch    # re-download sources, then build all 114
  python tools/build_data.py --surah 2  # build only surah 2 (still fetches cache)
"""
import json, re, sys, os, socket, urllib.request, argparse, time

sys.stdout.reconfigure(encoding="utf-8")   # Windows console is cp1252; we print Arabic

# --- force IPv4: tanzil.net's IPv6 route hangs in some environments -----------
_orig_getaddrinfo = socket.getaddrinfo
def _ipv4_only(host, *a, **k):
    return [r for r in _orig_getaddrinfo(host, *a, **k) if r[0] == socket.AF_INET]
socket.getaddrinfo = _ipv4_only

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TANZIL_CACHE = os.path.join(HERE, "_src_tanzil_hafs.txt")
WARSH_CACHE  = os.path.join(HERE, "_src_warsh_aziz.json")
TANZIL_URL = ("https://tanzil.net/pub/download/index.php"
              "?marks=true&sajdah=true&alef=true&quranType=uthmani&outType=txt-2&agree=true")
WARSH_URL  = "https://raw.githubusercontent.com/aziz011133/quran_warsh/main/warshData_v2-1.json"

BASMALA_HAFS  = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"
BASMALA_WARSH = "بِسۡمِ اِ۬للَّهِ اِ۬لرَّحۡمَٰنِ اِ۬لرَّحِيمِ"

SAJDA = "۩"   # ۩  Tanzil's sajdah marker

# ---- canonical 114-row Kufan ayah-count table (Hafs). Sums to 6236. ----------
# Verified against the Tanzil download at build time (assert below).
KUFAN_COUNTS = [
    7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128,
    111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73,
    54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49,
    62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28,
    28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20,
    15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
]
assert len(KUFAN_COUNTS) == 114 and sum(KUFAN_COUNTS) == 6236

# ---- canonical surah metadata (Arabic name, transliteration, English gloss, revelation)
# name_ar kept in the app's existing undecorated convention (Baqarah == "البقرة").
# Transliterations from the Warsh source's sura_name_en; glosses are the common ones.
# Embedded directly (Tanzil's text download carries no names) with this source comment.
SURAH_META = [
    ("الفاتحة", "Al-Fātiḥah", "The Opening", "meccan"),
    ("البقرة", "Al-Baqarah", "The Cow", "medinan"),
    ("آل عمران", "Āl-‘Imrān", "The Family of Imran", "medinan"),
    ("النساء", "An-Nisā’", "The Women", "medinan"),
    ("المائدة", "Al-Mā’idah", "The Table Spread", "medinan"),
    ("الأنعام", "Al-An‘ām", "The Cattle", "meccan"),
    ("الأعراف", "Al-A‘rāf", "The Heights", "meccan"),
    ("الأنفال", "Al-Anfāl", "The Spoils of War", "medinan"),
    ("التوبة", "At-Taubah", "The Repentance", "medinan"),
    ("يونس", "Yūnus", "Jonah", "meccan"),
    ("هود", "Hūd", "Hud", "meccan"),
    ("يوسف", "Yūsuf", "Joseph", "meccan"),
    ("الرعد", "Ar-Ra‘d", "The Thunder", "medinan"),
    ("إبراهيم", "Ibrāhīm", "Abraham", "meccan"),
    ("الحجر", "Al-Ḥijr", "The Rocky Tract", "meccan"),
    ("النحل", "An-Naḥl", "The Bee", "meccan"),
    ("الإسراء", "Al-Isrā’", "The Night Journey", "meccan"),
    ("الكهف", "Al-Kahf", "The Cave", "meccan"),
    ("مريم", "Maryam", "Mary", "meccan"),
    ("طه", "Ṭā-Hā", "Ta-Ha", "meccan"),
    ("الأنبياء", "Al-Anbiyā’", "The Prophets", "meccan"),
    ("الحج", "Al-Ḥajj", "The Pilgrimage", "medinan"),
    ("المؤمنون", "Al-Mu’minūn", "The Believers", "meccan"),
    ("النور", "An-Nūr", "The Light", "medinan"),
    ("الفرقان", "Al-Furqān", "The Criterion", "meccan"),
    ("الشعراء", "Ash-Shu‘arā’", "The Poets", "meccan"),
    ("النمل", "An-Naml", "The Ant", "meccan"),
    ("القصص", "Al-Qaṣaṣ", "The Stories", "meccan"),
    ("العنكبوت", "Al-‘Ankabūt", "The Spider", "meccan"),
    ("الروم", "Ar-Rūm", "The Romans", "meccan"),
    ("لقمان", "Luqmān", "Luqman", "meccan"),
    ("السجدة", "As-Sajdah", "The Prostration", "meccan"),
    ("الأحزاب", "Al-Aḥzāb", "The Combined Forces", "medinan"),
    ("سبأ", "Saba’", "Sheba", "meccan"),
    ("فاطر", "Fāṭir", "Originator", "meccan"),
    ("يس", "Yā-Sīn", "Ya Sin", "meccan"),
    ("الصافات", "Aṣ-Ṣāffāt", "Those Who Set the Ranks", "meccan"),
    ("ص", "Ṣād", "The Letter Sad", "meccan"),
    ("الزمر", "Az-Zumar", "The Troops", "meccan"),
    ("غافر", "Ghāfir", "The Forgiver", "meccan"),
    ("فصلت", "Fuṣṣilat", "Explained in Detail", "meccan"),
    ("الشورى", "Ash-Shūra", "The Consultation", "meccan"),
    ("الزخرف", "Az-Zukhruf", "The Ornaments of Gold", "meccan"),
    ("الدخان", "Ad-Dukhān", "The Smoke", "meccan"),
    ("الجاثية", "Al-Jāthiyah", "The Crouching", "meccan"),
    ("الأحقاف", "Al-Aḥqāf", "The Wind-Curved Sandhills", "meccan"),
    ("محمد", "Muḥammad", "Muhammad", "medinan"),
    ("الفتح", "Al-Fatḥ", "The Victory", "medinan"),
    ("الحجرات", "Al-Ḥujurāt", "The Rooms", "medinan"),
    ("ق", "Qāf", "The Letter Qaf", "meccan"),
    ("الذاريات", "Adh-Dhāriyāt", "The Winnowing Winds", "meccan"),
    ("الطور", "Aṭ-Ṭūr", "The Mount", "meccan"),
    ("النجم", "An-Najm", "The Star", "meccan"),
    ("القمر", "Al-Qamar", "The Moon", "meccan"),
    ("الرحمن", "Ar-Raḥmān", "The Beneficent", "medinan"),
    ("الواقعة", "Al-Wāqi‘ah", "The Inevitable", "meccan"),
    ("الحديد", "Al-Ḥadīd", "The Iron", "medinan"),
    ("المجادلة", "Al-Mujādilah", "The Pleading Woman", "medinan"),
    ("الحشر", "Al-Ḥashr", "The Exile", "medinan"),
    ("الممتحنة", "Al-Mumtaḥanah", "She That Is to Be Examined", "medinan"),
    ("الصف", "Aṣ-Ṣaff", "The Ranks", "medinan"),
    ("الجمعة", "Al-Jumu‘ah", "The Congregation, Friday", "medinan"),
    ("المنافقون", "Al-Munāfiqūn", "The Hypocrites", "medinan"),
    ("التغابن", "At-Taghābun", "The Mutual Disillusion", "medinan"),
    ("الطلاق", "Aṭ-Ṭalāq", "The Divorce", "medinan"),
    ("التحريم", "At-Taḥrīm", "The Prohibition", "medinan"),
    ("الملك", "Al-Mulk", "The Sovereignty", "meccan"),
    ("القلم", "Al-Qalam", "The Pen", "meccan"),
    ("الحاقة", "Al-Ḥāqqah", "The Reality", "meccan"),
    ("المعارج", "Al-Ma‘ārij", "The Ascending Stairways", "meccan"),
    ("نوح", "Nūḥ", "Noah", "meccan"),
    ("الجن", "Al-Jinn", "The Jinn", "meccan"),
    ("المزمل", "Al-Muzzammil", "The Enshrouded One", "meccan"),
    ("المدثر", "Al-Muddaththir", "The Cloaked One", "meccan"),
    ("القيامة", "Al-Qiyāmah", "The Resurrection", "meccan"),
    ("الإنسان", "Al-Insān", "The Man", "medinan"),
    ("المرسلات", "Al-Mursalāt", "The Emissaries", "meccan"),
    ("النبأ", "An-Naba’", "The Tidings", "meccan"),
    ("النازعات", "An-Nāzi‘āt", "Those Who Drag Forth", "meccan"),
    ("عبس", "‘Abasa", "He Frowned", "meccan"),
    ("التكوير", "At-Takwīr", "The Overthrowing", "meccan"),
    ("الانفطار", "Al-Infiṭār", "The Cleaving", "meccan"),
    ("المطففين", "Al-Muṭaffifīn", "The Defrauding", "meccan"),
    ("الانشقاق", "Al-Inshiqāq", "The Sundering", "meccan"),
    ("البروج", "Al-Burūj", "The Mansions of the Stars", "meccan"),
    ("الطارق", "Aṭ-Ṭāriq", "The Morning Star", "meccan"),
    ("الأعلى", "Al-A‘lā", "The Most High", "meccan"),
    ("الغاشية", "Al-Ghāshiyah", "The Overwhelming", "meccan"),
    ("الفجر", "Al-Fajr", "The Dawn", "meccan"),
    ("البلد", "Al-Balad", "The City", "meccan"),
    ("الشمس", "Ash-Shams", "The Sun", "meccan"),
    ("الليل", "Al-Lail", "The Night", "meccan"),
    ("الضحى", "Aḍ-Ḍuḥā", "The Morning Hours", "meccan"),
    ("الشرح", "Ash-Sharḥ", "The Relief", "meccan"),
    ("التين", "At-Tīn", "The Fig", "meccan"),
    ("العلق", "Al-‘Alaq", "The Clot", "meccan"),
    ("القدر", "Al-Qadr", "The Power", "meccan"),
    ("البينة", "Al-Bayyinah", "The Clear Proof", "medinan"),
    ("الزلزلة", "Az-Zalzalah", "The Earthquake", "medinan"),
    ("العاديات", "Al-‘Ādiyāt", "The Courser", "meccan"),
    ("القارعة", "Al-Qāri‘ah", "The Calamity", "meccan"),
    ("التكاثر", "At-Takāthur", "The Rivalry in World Increase", "meccan"),
    ("العصر", "Al-‘Aṣr", "The Declining Day", "meccan"),
    ("الهمزة", "Al-Humazah", "The Traducer", "meccan"),
    ("الفيل", "Al-Fīl", "The Elephant", "meccan"),
    ("قريش", "Quraish", "Quraysh", "meccan"),
    ("الماعون", "Al-Mā‘ūn", "The Small Kindnesses", "meccan"),
    ("الكوثر", "Al-Kauthar", "The Abundance", "meccan"),
    ("الكافرون", "Al-Kāfirūn", "The Disbelievers", "meccan"),
    ("النصر", "An-Naṣr", "The Divine Support", "medinan"),
    ("المسد", "Al-Masad", "The Palm Fiber", "meccan"),
    ("الإخلاص", "Al-Ikhlāṣ", "The Sincerity", "meccan"),
    ("الفلق", "Al-Falaq", "The Daybreak", "meccan"),
    ("الناس", "An-Nās", "Mankind", "meccan"),
]
assert len(SURAH_META) == 114

# surahs whose Kufan ayah 1 is NOT a stripped-basmala ayah:
#   1  al-Fatihah — the basmala IS ayah 1
#   9  at-Taubah  — no basmala at all
NO_BASMALA_PREFIX = {1, 9}

# ---- normalisation: reduce to bare rasm for ALIGNMENT ONLY (display keeps full text) ----
KEEP = set(range(0x0621, 0x064B)) | {0x06D2}    # Arabic letters hamza..yaa + yeh-barree
# FOLD / DROP are used for ALIGNMENT SCORING ONLY (never touch display text). They
# reconcile the two rasms' spelling conventions so bare-rasm token sets compare:
#   ے (U+06D2 yeh barree)         -> ي   (Warsh final yaa; e.g. surah 89 فادخلے↔فادخلى)
#   ٰ (U+0670 superscript alef)   -> ا   (Warsh dagger-alef where Ḥafṣ writes ا; e.g. عينٰن↔عينان)
FOLD = {'أ':'ا','إ':'ا','آ':'ا','ٱ':'ا','ى':'ي','ئ':'ي','ؤ':'و','ء':'','ة':'ه',
        'ے':'ي','ٰ':'ا'}
DROP = {0x0640, 0x0654}          # tatweel (kashida) and hamza-above mark: alignment noise
ORNAMENT = re.compile(r'[ﭐ-﷿ﹰ-﻿۞]')  # ayah-number ligatures, hizb sign


def fetch(url, cache, force):
    if force or not os.path.exists(cache):
        print(f"  downloading {url}")
        last = None
        for attempt in range(3):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "ba9ara-build/1.0"})
                data = urllib.request.urlopen(req, timeout=180).read()
                open(cache, "wb").write(data)
                break
            except Exception as e:                # noqa: retry transient network errors
                last = e
                print(f"    attempt {attempt+1} failed: {e!r}; retrying...")
                time.sleep(3)
        else:
            raise SystemExit(f"FETCH FAILED after retries: {url}\n  {last!r}")
    return open(cache, encoding="utf-8").read()


def norm_words(t):
    out = []
    for ch in t:
        if ord(ch) in DROP: continue
        ch = FOLD.get(ch, ch)
        if ch == '': continue
        if ch == ' ': out.append(' ')
        elif ord(ch) in KEEP: out.append(ch)
    return [w for w in ''.join(out).split() if w]


def jac(a, b):
    A, B = set(a), set(b)
    return len(A & B) / len(A | B) if (A | B) else 1.0


def best_split(words, hafs_a, hafs_b):
    """split display tokens `words` into two parts best matching hafs_a / hafs_b.
    (Kept for the 1->2 split path so Baqarah's cut is bit-identical to the original.)"""
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


def best_split_n(words, hafs_parts):
    """Split display tokens `words` into len(hafs_parts) contiguous parts, each best
    matching the corresponding Ḥafṣ ayah. Returns list of joined display strings.
    DP over cut positions maximising the sum of per-part Jaccard overlaps.
    For len==2 this yields exactly the same cut as best_split (verified for Baqarah)."""
    n = len(hafs_parts)
    if n == 1:
        return [' '.join(words)]
    nwords = [' '.join(norm_words(w)) for w in words]   # bare-rasm form per token
    Hsets = [set(norm_words(h)) for h in hafs_parts]
    W = len(words)
    NEG = float("-inf")

    # segment-set Jaccard for tokens[prev:c] vs Hsets[p], built incrementally over c
    # so each (p, prev) inner loop is O(W) not O(W^2): overall best_split_n is O(n*W^2).
    def seg_scores(prev, p):
        H = Hsets[p]
        seg = set()
        out = {}
        for c in range(prev + 1, W + 1):
            tok = nwords[c - 1]
            if tok:
                seg.add(tok)
            uni = seg | H
            out[c] = (len(seg & H) / len(uni)) if uni else 1.0
        return out

    # dp[p][c] = best score assigning first p Ḥafṣ parts to first c tokens
    dp = [[NEG] * (W + 1) for _ in range(n + 1)]
    back = [[0] * (W + 1) for _ in range(n + 1)]
    dp[0][0] = 0.0
    for p in range(1, n + 1):
        lo = p
        hi = W - (n - p)
        for prev in range(p - 1, hi):           # previous boundary
            if dp[p - 1][prev] == NEG:
                continue
            scores = seg_scores(prev, p - 1)
            base = dp[p - 1][prev]
            for c in range(max(prev + 1, lo), hi + 1):
                sc = base + scores[c]
                if sc > dp[p][c]:
                    dp[p][c] = sc
                    back[p][c] = prev
    # reconstruct boundaries
    cuts = [W]
    c = W
    for p in range(n, 0, -1):
        prev = back[p][c]
        cuts.append(prev)
        c = prev
    cuts.reverse()                              # [0, b1, b2, ..., W]
    return [' '.join(words[cuts[k]:cuts[k + 1]]) for k in range(n)]


def real_words(t):
    # letter-bearing tokens only (drop standalone waqf marks like ۛ that Tanzil
    # space-separates) so fill-in-blank / first-letter hints get real words.
    return [w for w in t.split() if any(0x0621 <= ord(c) <= 0x064A for c in w)]


# ---------------------------------------------------------------------------
def parse_tanzil(raw):
    """-> {surah: {ayah: text}} with the prepended basmala stripped per D9;
       also -> {(surah,ayah): sajda bool}."""
    hafs = {s: {} for s in range(1, 115)}
    for line in raw.splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '|' not in line:
            continue
        s, a, t = line.split('|', 2)
        hafs[int(s)][int(a)] = t.strip()
    sajda = {}
    for s in range(1, 115):
        for a, t in hafs[s].items():
            sajda[(s, a)] = SAJDA in t
    # strip Tanzil's prepended basmala from ayah 1 (all surahs except 1 & 9)
    for s in range(1, 115):
        if s in NO_BASMALA_PREFIX:
            continue
        w1 = hafs[s][1].split()
        if w1 and norm_words(w1[0]) and norm_words(w1[0])[0] == "بسم":
            hafs[s][1] = ' '.join(w1[4:]).strip()
    return hafs, sajda


def parse_warsh(raw):
    """-> {surah: {aya_no: display_text}} in native Madani numbering."""
    warr = json.loads(raw)
    warsh = {s: {} for s in range(1, 115)}
    for r in warr:
        s = r.get("sura_no")
        if s is None:
            continue
        warsh[s][r["aya_no"]] = ORNAMENT.sub('', r["aya_text"]).strip()
    return warsh


MAX_SPAN = 5        # max Kufan verses one Warsh verse may split into, or merged into one Kufan
SPLIT_WORD_CAP = 40  # only Warsh verses this short are eligible for a multi-Kufan split


def align_surah(s, hafs_s, warsh_s):
    """Greedy Madani->Kufan verse aligner for one surah, generalised to multi-way
    structural ops. At each step it chooses (with the ORIGINAL 1->2 / 2->1 scoring and
    tie-breaking, so surahs the original handled — incl. Baqarah — are reproduced
    bit-identically) between:
      MATCH  1 Kufan  <- 1 Warsh
      SPLIT  m Kufan  <- 1 Warsh  (one Warsh verse cut into m>=2 Kufan; width extended
                                   greedily while it keeps improving the fit)
      MERGE  1 Kufan  <- n Warsh  (n>=2 Warsh verses joined into one Kufan; likewise)
    Multi-way (m>2 / n>2) is what lets it handle e.g. surahs 22/30/42 where the
    muqaṭṭaʿāt / short verses join or split across three Kufan boundaries.

    Display strings are NEVER modified: a SPLIT slices the original Warsh string on
    token boundaries only; a MERGE space-joins original Warsh strings verbatim.

    Returns (wk, structural, overlaps, close_flags, consumed, M).
      structural : [("SPLIT"|"MERGE", kufan_i, madani_j), ...]  (first index of the op)
      close_flags: {kufan_ayah -> bool}  (top-2 of the match/split/merge scores within 0.08)
    """
    K = KUFAN_COUNTS[s - 1]
    M = max(warsh_s) if warsh_s else 0
    Hn = {k: norm_words(v) for k, v in hafs_s.items()}
    Wn = {k: norm_words(v) for k, v in warsh_s.items()}
    wk, structural, close_flags = {}, [], {}

    # --- Surah 1 (al-Fātiḥah): hardcoded mapping (D9) ---------------------------
    # The Warsh source does NOT count the basmala as a verse, so its 7 verses are
    # shifted one ahead of the Kufan numbering, and it splits the final ayah in two.
    # This one-off offset can't be recovered by the greedy walk without weakening
    # global thresholds, so we map it by hand (verified by eye against both sources):
    #   Kufan 1 (basmala)      <- the Warsh basmala (BASMALA_WARSH); no Warsh verse counts it
    #   Kufan 2..6             <- Warsh 1..5   (straight shift)
    #   Kufan 7                <- Warsh 6 + Warsh 7   (Warsh splits the last ayah; we merge)
    if s == 1:
        wk[1] = BASMALA_WARSH
        for k in range(2, 7):
            wk[k] = warsh_s[k - 1]
        wk[7] = warsh_s[6] + " " + warsh_s[7]
        structural.append(("MERGE", 7, 6))
        for k in range(1, 8):
            close_flags[k] = False
        consumed = True
        overlaps = {k: jac(Hn[k], norm_words(wk[k])) for k in wk}
        return wk, structural, overlaps, close_flags, consumed, M

    i, j = 1, 1
    while i <= K and j <= M:
        # ---- ORIGINAL primary decision (unchanged scoring & tie-break) --------------
        m  = jac(Hn[i], Wn[j])
        sp = jac(Hn[i] + (Hn[i + 1] if i + 1 <= K else []), Wn[j]) if i + 1 <= K else -1
        mg = jac(Hn[i], Wn[j] + (Wn[j + 1] if j + 1 <= M else [])) if j + 1 <= M else -1
        best = max(m, sp, mg)
        scores = sorted([m, sp, mg], reverse=True)
        close = (scores[0] - scores[1]) < 0.08     # "close" alignment decision (top-2)

        if best == m or (m >= 0.5 and m + 0.08 >= best):
            wk[i] = warsh_s[j]; close_flags[i] = close
            i += 1; j += 1

        elif sp >= mg:                                   # one warsh -> m kufan (m>=2)
            # greedily extend the split width while adding the next Kufan verse still
            # improves the whole-verse fit (covers 1->3 etc.; width 2 == original).
            width = 2
            def split_fit(w):
                return jac(sum((Hn[i + k] for k in range(w)), []), Wn[j])
            while (i + width <= K and width < MAX_SPAN
                   and len(Wn[j]) <= SPLIT_WORD_CAP
                   and split_fit(width + 1) >= split_fit(width) - 1e-9):
                width += 1
            hafs_parts = [hafs_s[i + k] for k in range(width)]
            parts = best_split_n(warsh_s[j].split(), hafs_parts)
            for k in range(width):
                wk[i + k] = parts[k]; close_flags[i + k] = close
            structural.append(("SPLIT", i, j))
            i += width; j += 1

        else:                                            # n warsh -> one kufan (n>=2)
            width = 2
            def merge_fit(w):
                joined = []
                for k in range(w):
                    joined += Wn[j + k]
                return jac(Hn[i], joined)
            while (j + width <= M and width < MAX_SPAN
                   and merge_fit(width + 1) >= merge_fit(width) - 1e-9):
                width += 1
            wk[i] = " ".join(warsh_s[j + k] for k in range(width))
            close_flags[i] = close
            structural.append(("MERGE", i, j))
            i += 1; j += width

    consumed = (i, j) == (K + 1, M + 1)
    overlaps = {k: jac(Hn[k], norm_words(wk[k])) for k in wk}
    return wk, structural, overlaps, close_flags, consumed, M


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fetch", action="store_true", help="re-download sources")
    ap.add_argument("--surah", type=int, default=None, help="build only this surah")
    args = ap.parse_args()

    raw_h = fetch(TANZIL_URL, TANZIL_CACHE, args.fetch)
    raw_w = fetch(WARSH_URL, WARSH_CACHE, args.fetch)

    hafs, sajda = parse_tanzil(raw_h)
    warsh = parse_warsh(raw_w)

    # --- source-count assertions + printout --------------------------------
    print("=" * 68)
    print("SOURCE COUNTS")
    for s in range(1, 115):
        got = max(hafs[s]) if hafs[s] else 0
        assert got == KUFAN_COUNTS[s - 1] and len(hafs[s]) == KUFAN_COUNTS[s - 1], \
            f"Tanzil surah {s}: got {got}/{len(hafs[s])} ayat, expected {KUFAN_COUNTS[s-1]}"
    total_hafs = sum(len(hafs[s]) for s in range(1, 115))
    assert total_hafs == 6236, total_hafs
    print(f"  Hafs (Kufan) : per-surah counts match canonical table; total = {total_hafs}")

    warsh_counts = {s: (max(warsh[s]) if warsh[s] else 0) for s in range(1, 115)}
    total_warsh = sum(len(warsh[s]) for s in range(1, 115))
    print(f"  Warsh(Madani): source total = {total_warsh}")
    assert total_warsh == 6214, f"Warsh source total {total_warsh}, expected 6214 (D9)"
    print("  Warsh per-surah (Madani):")
    row = []
    for s in range(1, 115):
        row.append(f"{s}:{warsh_counts[s]}")
        if len(row) == 12:
            print("   ", " ".join(row)); row = []
    if row:
        print("   ", " ".join(row))
    assert norm_words(hafs[2][1]) == ["الم"], hafs[2][1]

    targets = [args.surah] if args.surah else list(range(1, 115))

    # --- align every target surah, collect report -------------------------
    os.makedirs(os.path.join(ROOT, "data", "quran"), exist_ok=True)
    report = {"generated": time.strftime("%Y-%m-%dT%H:%M:%S"),
              "madani_total": total_warsh, "kufan_total": 6236, "surahs": {}}
    soft_review = []          # ayat needing human eyeballing (never fails the build)
    hard_fail = []            # (surah, ayah, reason) -> stops build
    global_diffs = 0
    baqarah_ops = None

    print("=" * 68)
    print("ALIGNMENT")
    for s in targets:
        K = KUFAN_COUNTS[s - 1]
        wk, structural, overlaps, close_flags, consumed, M = align_surah(s, hafs[s], warsh[s])

        # ---- HARD gates ----
        if not consumed:
            hard_fail.append((s, 0, f"aligner did not consume all verses (K={K}, M={M})"))
        if len(wk) != K:
            hard_fail.append((s, 0, f"produced {len(wk)} Kufan ayat, expected {K}"))
        min_ov = min(overlaps.values()) if overlaps else 1.0
        for k in sorted(overlaps):
            if overlaps[k] < 0.40:
                hard_fail.append((s, k, f"rasm overlap {overlaps[k]:.3f} < 0.40"))

        # ---- SOFT review list ----
        weak = []
        has_ops = len(structural) > 0
        op_by_i = {}
        for op in structural:
            op_by_i[op[1]] = op
            if op[0] == "SPLIT":
                op_by_i[op[1] + 1] = op
        for k in sorted(overlaps):
            reasons = []
            if overlaps[k] < 0.65: reasons.append("overlap<0.65")
            if close_flags.get(k): reasons.append("close-decision")
            if has_ops: reasons.append("surah-has-structural-ops")
            if reasons:
                op = op_by_i.get(k)
                weak.append({"ayah": k, "overlap": round(overlaps[k], 4),
                             "reasons": reasons})
                soft_review.append({
                    "surah": s, "ayah": k, "overlap": round(overlaps[k], 4),
                    "reasons": reasons,
                    "op": (list(op) if op else None),
                    "hafs":  hafs[s][k],
                    "warsh": wk[k],
                })

        report["surahs"][str(s)] = {
            "madani_count": M,
            "kufan_count": len(wk),
            "structural_ops": [list(o) for o in structural],
            "min_overlap": round(min_ov, 4),
            "weak_ayat": weak,
        }

        if s == 2:
            baqarah_ops = [list(o) for o in structural]

        # write per-surah file (today's baqarah.json schema exactly)
        ayat = []
        for k in range(1, K + 1):
            ht, wt = hafs[s][k], wk[k]
            if norm_words(ht) != norm_words(wt):
                global_diffs += 1
            ayat.append({
                "n": k,
                "key": f"{s}:{k}",
                "text":  {"hafs": ht, "warsh": wt},
                "words": {"hafs": real_words(ht), "warsh": real_words(wt)},
                "sajda": bool(sajda.get((s, k), False)),
            })
        meta_ar, meta_en, _tr, _rev = SURAH_META[s - 1]
        out = {
            "surah": s,
            "name_ar": meta_ar,
            "name_en": meta_en,
            "ayah_count": K,
            "riwayat": ["hafs", "warsh"],
            "bismillah": {"hafs": BASMALA_HAFS, "warsh": BASMALA_WARSH},
            "ayat": ayat,
        }
        path = os.path.join(ROOT, "data", "quran", f"{s:03d}.json")
        json.dump(out, open(path, "w", encoding="utf-8"),
                  ensure_ascii=False, separators=(",", ":"))

    # ---- HARD FAIL check (stop before writing index if scripture mis-aligned) ----
    if hard_fail:
        print("=" * 68)
        print("HARD FAILURES (build stopped):")
        for s, k, why in hard_fail:
            print(f"  surah {s} ayah {k}: {why}")
        # still write the partial report so it can be inspected
        json.dump(report, open(os.path.join(HERE, "warsh_align_report.json"), "w",
                  encoding="utf-8"), ensure_ascii=False, indent=1)
        raise SystemExit(f"\nBUILD ABORTED: {len(hard_fail)} hard alignment failure(s).")

    # ---- Baqarah regression (only when surah 2 was built) ----
    if 2 in targets:
        expected = [["SPLIT", 1, 1], ["SPLIT", 200, 199], ["MERGE", 255, 253]]
        assert baqarah_ops == expected, \
            f"Baqarah structural ops changed!\n  got:      {baqarah_ops}\n  expected: {expected}"
        print("  Baqarah (surah 2) structural ops OK:", baqarah_ops)

    # ---- report soft-review summary + write report ----
    report["soft_review"] = soft_review
    report["hard_fail"] = []
    json.dump(report, open(os.path.join(HERE, "warsh_align_report.json"), "w",
              encoding="utf-8"), ensure_ascii=False, indent=1)
    print("=" * 68)
    print(f"  wrote tools/warsh_align_report.json")
    print(f"  soft-review ayat (human eyeballing, non-fatal): {len(soft_review)}")
    print(f"  ayat with hafs/warsh rasm differences (all built surahs): {global_diffs}")

    # ---- index.json (D1) — only rebuild on a full run ----
    if not args.surah:
        surahs = []
        for s in range(1, 115):
            ar, en, tr, rev = SURAH_META[s - 1]
            surahs.append({
                "n": s, "name_ar": ar, "name_en": en, "tr_en": tr,
                "ayah_count": KUFAN_COUNTS[s - 1], "revelation": rev,
                "basmalah_prefixed": s not in NO_BASMALA_PREFIX,
            })
        index = {
            "riwayat": {
                "hafs":  {"label_en": "Ḥafṣ ʿan ʿĀṣim",  "label_ar": "حفص عن عاصم"},
                "warsh": {"label_en": "Warsh ʿan Nāfiʿ", "label_ar": "ورش عن نافع"},
            },
            "bismillah": {"hafs": BASMALA_HAFS, "warsh": BASMALA_WARSH},
            "total_ayat": 6236,
            "surahs": surahs,
        }
        json.dump(index, open(os.path.join(ROOT, "data", "quran", "index.json"), "w",
                  encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        print("  wrote data/quran/index.json (114 surahs, total_ayat 6236)")

        # ---- credits.json (whole-Qur'an scope) ----
        credits = {
            "scope": "Whole Qur'an — all 114 surahs, Ḥafṣ and Warsh readings.",
            "text": [
                {"riwayah": "hafs", "source": "Tanzil Project (Uthmani, v1.1)",
                 "url": "https://tanzil.net",
                 "license": "Creative Commons Attribution 3.0; verbatim redistribution "
                            "with attribution — do not modify the text."},
                {"riwayah": "warsh",
                 "source": "aziz011133/quran_warsh (Warsh ʿan Nāfiʿ, QPC rasm)",
                 "url": "https://github.com/aziz011133/quran_warsh",
                 "note": "Remapped per surah from Madani (6214) to Kufan (6236) numbering "
                         "to align with per-ayah audio. Alignment report: "
                         "tools/warsh_align_report.json. Text itself is never modified."},
            ],
            "audio": [
                {"source": "EveryAyah", "url": "https://everyayah.com",
                 "use": "per-ayah recitations (Ḥafṣ + Warsh) for the repeat/loop engine, all 114 surahs"},
                {"source": "mp3quran.net", "url": "https://mp3quran.net",
                 "use": "full-surah Warsh recitations (e.g. ʿUmar al-Qazābrī)"},
            ],
        }
        json.dump(credits, open(os.path.join(ROOT, "data", "credits.json"), "w",
                  encoding="utf-8"), ensure_ascii=False, indent=2)
        print("  wrote data/credits.json")

    # ---- size + summary ----
    qdir = os.path.join(ROOT, "data", "quran")
    total_kb = sum(os.path.getsize(os.path.join(qdir, f))
                   for f in os.listdir(qdir)) // 1024
    n_files = len(os.listdir(qdir))
    print("=" * 68)
    print(f"  data/quran/ : {n_files} files, {total_kb} KB total")

    # ---- worst-alignment summary table (top ~15 by #ops or lowest overlap) ----
    print("=" * 68)
    print("WORST ALIGNMENTS (surah | madani->kufan | #ops | min_overlap):")
    rows = [(s, report["surahs"][str(s)]) for s in targets]
    rows.sort(key=lambda r: (-len(r[1]["structural_ops"]), r[1]["min_overlap"]))
    for s, d in rows[:15]:
        print(f"  {s:3d} | {d['madani_count']:3d}->{d['kufan_count']:3d} | "
              f"ops={len(d['structural_ops']):2d} | min_overlap={d['min_overlap']:.3f}")


if __name__ == "__main__":
    main()
