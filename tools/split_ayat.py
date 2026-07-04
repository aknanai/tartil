#!/usr/bin/env python3
"""split_ayat.py — split a *full-surah* recitation MP3 into one file per ayah.

Whole-surah recordings (e.g. the Warsh voices on mp3quran) can't be looped or
hidden per-ayah in the Al-Baqarah app because there's no per-ayah file. This
tool cuts one long recitation into `{SS}{AAA}.mp3` clips (the EveryAyah naming,
e.g. `112001.mp3`) that drop straight into `js/reciters.js`.

Approach — why not just trust Whisper's transcript?
    Whisper (even `medium`) mis-transcribes Qur'anic Arabic and its segment
    boundaries don't fall on ayah ends. But its *word-level timestamps* are
    usable, and we already have the ground-truth ayah text. So we:
      1. load + normalise the known reference ayah words,
      2. transcribe the audio with faster-whisper (word timestamps),
      3. globally align (Needleman-Wunsch) the recognised words to the
         reference words — giving most reference words a real timestamp,
      4. place each ayah boundary at the gap between ayāt,
      5. optionally snap the cut to the quietest moment nearby (reciters pause
         between ayāt), and
      6. cut with ffmpeg and write a report flagging suspicious durations.

Usage:
    python tools/split_ayat.py --audio kawthar.mp3 --surah 108 --out out/kawthar
    python tools/split_ayat.py --audio baqarah_warsh.mp3 --surah 2 --riwayah warsh \
           --out out/qazabri --model medium --device cuda
    python tools/split_ayat.py --self-test     # no audio/model needed

See README → "Splitting full-surah audio into ayāt".
"""
import argparse
import json
import os
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

# Windows consoles default to cp1252 and choke on Arabic / transliteration glyphs.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except Exception:
        pass

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
REF_CACHE = HERE / ".ref_cache"

# ─────────────────────────────────────────────────────────────────────────────
# Arabic normalisation — a faithful port of normalizeArabic() in js/util.js so
# the reference text and Whisper's output collapse to the same comparison keys.
# ─────────────────────────────────────────────────────────────────────────────
def normalize_arabic(s: str) -> str:
    out = []
    for ch in (s or ""):
        c = ord(ch)
        # combining marks, dagger alef, tatweel, Qur'anic annotation signs
        if (0x064B <= c <= 0x065F) or c == 0x0670 or c == 0x0640 or (0x06D6 <= c <= 0x06ED):
            continue
        out.append(ch)
    t = "".join(out)
    t = re.sub(r"[أإآٱاٰ]", "", t)          # drop every alef form (incl. dagger/wasla)
    t = t.replace("ى", "ي").replace("ئ", "ي").replace("ؤ", "و")
    t = t.replace("ة", "ه")
    t = re.sub(r"[ءۀ]", "", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def norm_word(w: str) -> str:
    return normalize_arabic(w)


# ─────────────────────────────────────────────────────────────────────────────
# Reference ayah text — works for ANY surah so the tool is testable on a tiny one.
#   default  → the app's own data/quran/NNN.json (exact text, both riwayāt, all 114)
#   fallback → api.alquran.cloud (Ḥafṣ / quran-uthmani), cached locally
#   --ref-json overrides everything (offline, or Warsh editions the API lacks)
# Returns: list[list[str]] — words[ayah_index][word_index]
# ─────────────────────────────────────────────────────────────────────────────
def _words_from_text(text: str) -> list:
    return [w for w in re.split(r"\s+", text.strip()) if w]


def ref_from_quran(surah: int, riwayah: str):
    """The app's own per-surah file data/quran/NNN.json — exact text, both riwayāt,
    for any surah. Returns None if the file isn't present (fall back to the API)."""
    p = REPO / "data" / "quran" / f"{surah:03d}.json"
    if not p.exists():
        return None
    data = json.loads(p.read_text(encoding="utf-8"))
    ayat = []
    for a in data["ayat"]:
        words = a["words"].get(riwayah) or _words_from_text(a["text"][riwayah])
        ayat.append(list(words))
    return ayat


def ref_from_ref_json(path: Path, riwayah: str) -> list:
    """Accept either the baqarah.json shape, or a simple {"ayat":[{"text":...}]} /
    {"ayat":["...","..."]} / ["...","..."] shape."""
    obj = json.loads(Path(path).read_text(encoding="utf-8"))
    if isinstance(obj, dict) and "ayat" in obj:
        ayat = obj["ayat"]
    elif isinstance(obj, list):
        ayat = obj
    else:
        raise ValueError("--ref-json: unrecognised JSON shape")
    out = []
    for a in ayat:
        if isinstance(a, str):
            out.append(_words_from_text(a))
        elif isinstance(a, dict):
            if "words" in a and isinstance(a["words"], dict):
                out.append(list(a["words"].get(riwayah) or _words_from_text(a["text"][riwayah])))
            elif "words" in a and isinstance(a["words"], list):
                out.append(list(a["words"]))
            else:
                txt = a["text"]
                txt = txt.get(riwayah) if isinstance(txt, dict) else txt
                out.append(_words_from_text(txt))
        else:
            raise ValueError("--ref-json: unrecognised ayah entry")
    return out


def ref_from_api(surah: int) -> list:
    REF_CACHE.mkdir(exist_ok=True)
    cache = REF_CACHE / f"surah_{surah:03d}_uthmani.json"
    if cache.exists():
        obj = json.loads(cache.read_text(encoding="utf-8"))
    else:
        url = f"https://api.alquran.cloud/v1/surah/{surah}/quran-uthmani"
        print(f"  fetching reference text: {url}")
        with urllib.request.urlopen(url, timeout=30) as r:
            obj = json.loads(r.read().decode("utf-8"))
        cache.write_text(json.dumps(obj, ensure_ascii=False), encoding="utf-8")
    ayat = obj["data"]["ayahs"]
    out = []
    for i, a in enumerate(ayat):
        txt = a["text"]
        # the API prefixes Al-Fātiḥah-style basmala on ayah 1 of most surahs;
        # strip a leading basmala so word counts line up with the audio.
        if i == 0:
            txt = re.sub(r"^\s*بِسْمِ\s+\S+\s+\S+\s+\S+\s*", "", txt) if "بِسْمِ" in txt[:40] else txt
        out.append(_words_from_text(txt))
    return out


def get_reference_ayat(surah: int, riwayah: str, ref_json: str = None) -> list:
    if ref_json:
        return ref_from_ref_json(Path(ref_json), riwayah)
    local = ref_from_quran(surah, riwayah)          # data/quran/NNN.json — any surah, both riwayāt
    if local is not None:
        return local
    return ref_from_api(surah)                        # Ḥafṣ only; use --ref-json for Warsh offline


# ─────────────────────────────────────────────────────────────────────────────
# Needleman-Wunsch global alignment of hypothesis words → reference words.
# Returns ref_time[i] = best timestamp (start, end) for reference word i, or None.
# ─────────────────────────────────────────────────────────────────────────────
def _word_sim(a: str, b: str) -> float:
    if a == b:
        return 1.0
    if not a or not b:
        return 0.0
    # cheap char-overlap (order-insensitive) — tolerant of Whisper spelling slips
    sa, sb = set(a), set(b)
    inter = len(sa & sb)
    denom = max(len(sa), len(sb))
    base = inter / denom if denom else 0.0
    if a[0] == b[0]:
        base = min(1.0, base + 0.15)
    return base


def align(ref_words: list, hyp_words: list, hyp_times: list,
          match=1.0, mismatch=-0.6, gap=-0.5, sim_threshold=0.5):
    """ref_words/hyp_words are normalised strings; hyp_times[j]=(start,end).
    Returns ref_time: list aligned to ref_words, each (start,end) or None."""
    n, m = len(ref_words), len(hyp_words)
    # score matrix + traceback (0=diag, 1=up/ref-gap, 2=left/hyp-gap)
    NEG = float("-inf")
    score = [[0.0] * (m + 1) for _ in range(n + 1)]
    tb = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        score[i][0] = i * gap
        tb[i][0] = 1
    for j in range(1, m + 1):
        score[0][j] = j * gap
        tb[0][j] = 2
    for i in range(1, n + 1):
        ri = ref_words[i - 1]
        for j in range(1, m + 1):
            s = _word_sim(ri, hyp_words[j - 1])
            sub = (match if s >= sim_threshold else mismatch) * (0.5 + 0.5 * s)
            diag = score[i - 1][j - 1] + sub
            up = score[i - 1][j] + gap
            left = score[i][j - 1] + gap
            best = diag
            d = 0
            if up > best:
                best, d = up, 1
            if left > best:
                best, d = left, 2
            score[i][j] = best
            tb[i][j] = d
    # traceback
    ref_time = [None] * n
    i, j = n, m
    while i > 0 or j > 0:
        d = tb[i][j]
        if i > 0 and j > 0 and d == 0:
            if _word_sim(ref_words[i - 1], hyp_words[j - 1]) >= sim_threshold:
                ref_time[i - 1] = hyp_times[j - 1]
            i, j = i - 1, j - 1
        elif i > 0 and (j == 0 or d == 1):
            i -= 1
        else:
            j -= 1
    return ref_time


# ─────────────────────────────────────────────────────────────────────────────
# Boundaries: from per-ayah word spans → cut points between ayāt.
# ─────────────────────────────────────────────────────────────────────────────
def ayah_spans(ref_ayat_words: list, ref_time: list):
    """Map flat ref_time back to per-ayah (first_start, last_end), interpolating
    missing word times. Returns list of [start, end] per ayah (seconds)."""
    # attach a flat index range per ayah
    spans = []
    idx = 0
    for words in ref_ayat_words:
        spans.append((idx, idx + len(words)))  # [lo, hi)
        idx += len(words)

    # gather matched (flat_index -> mid time) anchors for interpolation
    anchors = []  # (flat_idx, start, end)
    for k, t in enumerate(ref_time):
        if t is not None:
            anchors.append((k, t[0], t[1]))

    if not anchors:
        return None  # nothing aligned

    def interp_start(k):
        # nearest anchor at/after k for a start time
        for ai, s, e in anchors:
            if ai >= k:
                return s
        return anchors[-1][2]

    def interp_end(k):
        # nearest anchor at/before k for an end time
        last = None
        for ai, s, e in anchors:
            if ai <= k:
                last = e
            else:
                break
        return last if last is not None else anchors[0][1]

    out = []
    for (lo, hi) in spans:
        # first word start within [lo,hi); last word end
        start = None
        for k in range(lo, hi):
            if ref_time[k] is not None:
                start = ref_time[k][0]
                break
        if start is None:
            start = interp_start(lo)
        end = None
        for k in range(hi - 1, lo - 1, -1):
            if ref_time[k] is not None:
                end = ref_time[k][1]
                break
        if end is None:
            end = interp_end(hi - 1)
        out.append([start, end])
    return out


def boundaries_from_spans(spans: list, total_dur: float, keep_intro: bool = False,
                          lead_pad: float = 0.15):
    """Cut points: [start_of_ayah1, mid(end_k, start_{k+1}) ..., total].
    Full-surah recordings open with the basmala (not a numbered ayah outside
    Al-Fātiḥah), so by default ayah 1 starts at its first recited word, dropping
    the intro. --keep-intro starts at 0.0 instead. Clamp monotonic."""
    first = 0.0 if keep_intro else max(0.0, spans[0][0] - lead_pad)
    cuts = [first]
    for k in range(len(spans) - 1):
        end_k = spans[k][1]
        start_n = spans[k + 1][0]
        mid = (end_k + start_n) / 2.0 if start_n >= end_k else end_k
        cuts.append(mid)
    cuts.append(total_dur)
    # enforce strictly non-decreasing, then nudge any equal points apart later
    for k in range(1, len(cuts)):
        if cuts[k] < cuts[k - 1]:
            cuts[k] = cuts[k - 1]
    return cuts


# ─────────────────────────────────────────────────────────────────────────────
# Optional: snap a cut time to the quietest point in a window (librosa RMS).
# ─────────────────────────────────────────────────────────────────────────────
def build_silence_snapper(audio_path: str, window: float = 0.6):
    try:
        import librosa
        import numpy as np
    except Exception as e:
        print(f"  (snap disabled — librosa/numpy not available: {e})")
        return None
    y, sr = librosa.load(audio_path, sr=16000, mono=True)
    hop = 256
    rms = librosa.feature.rms(y=y, frame_length=1024, hop_length=hop)[0]
    times = librosa.frames_to_time(range(len(rms)), sr=sr, hop_length=hop)

    def snap(t: float) -> float:
        lo, hi = t - window, t + window
        idx = [i for i, tt in enumerate(times) if lo <= tt <= hi]
        if not idx:
            return t
        best = min(idx, key=lambda i: rms[i])
        return float(times[best])

    return snap


# ─────────────────────────────────────────────────────────────────────────────
# ffmpeg helpers
# ─────────────────────────────────────────────────────────────────────────────
def media_duration(path: str) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", path],
        capture_output=True, text=True)
    try:
        return float(out.stdout.strip())
    except ValueError:
        raise RuntimeError(f"ffprobe couldn't read duration of {path}:\n{out.stderr}")


def cut(path: str, start: float, end: float, dest: str, bitrate: str = "128k"):
    dur = max(0.05, end - start)
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{start:.3f}", "-t", f"{dur:.3f}",
         "-i", path, "-c:a", "libmp3lame", "-b:a", bitrate, dest],
        check=True)


# ─────────────────────────────────────────────────────────────────────────────
# Whisper transcription → normalised (word, start, end) stream
# ─────────────────────────────────────────────────────────────────────────────
def transcribe(audio: str, model_name: str, device: str, compute_type: str):
    from faster_whisper import WhisperModel
    if device == "auto":
        try:
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"
        except Exception:
            device = "cpu"
    if compute_type == "auto":
        compute_type = "float16" if device == "cuda" else "int8"
    print(f"  whisper: model={model_name} device={device} compute={compute_type}")
    model = WhisperModel(model_name, device=device, compute_type=compute_type)
    segments, _info = model.transcribe(
        audio, language="ar", word_timestamps=True, vad_filter=True,
        beam_size=5, condition_on_previous_text=False)
    words, times = [], []
    for seg in segments:
        if not seg.words:
            continue
        for w in seg.words:
            nw = norm_word(w.word)
            if nw:
                words.append(nw)
                times.append((float(w.start), float(w.end)))
    return words, times


# ─────────────────────────────────────────────────────────────────────────────
# Report
# ─────────────────────────────────────────────────────────────────────────────
def write_report(out_dir: Path, surah: int, cuts: list, snapped: list,
                 ref_time: list, ref_ayat_words: list, audio: str, total: float):
    import statistics
    durs = [snapped[k + 1] - snapped[k] for k in range(len(snapped) - 1)]
    median = statistics.median(durs) if durs else 0.0
    matched = sum(1 for t in ref_time if t is not None)
    total_words = len(ref_time)
    ayat = []
    flags = 0
    for k, d in enumerate(durs):
        flag = None
        if median:
            if d < 0.35 * median or d < 0.4:
                flag = "short"
            elif d > 2.6 * median:
                flag = "long"
        if flag:
            flags += 1
        ayat.append({
            "ayah": k + 1,
            "file": f"{surah:03d}{k+1:03d}.mp3",
            "start": round(snapped[k], 3),
            "end": round(snapped[k + 1], 3),
            "duration": round(d, 3),
            "flag": flag,
        })
    report = {
        "audio": os.path.basename(audio),
        "surah": surah,
        "ayah_count": len(durs),
        "total_duration": round(total, 3),
        "intro_trimmed_seconds": round(snapped[0], 3),  # leading basmala, if dropped
        "coverage": round(sum(durs) / total, 4) if total else 0,
        "median_ayah_seconds": round(median, 3),
        "words_aligned": matched,
        "words_total": total_words,
        "align_rate": round(matched / total_words, 4) if total_words else 0,
        "flagged": flags,
        "ayat": ayat,
    }
    (out_dir / "report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return report


# ─────────────────────────────────────────────────────────────────────────────
# Main split pipeline
# ─────────────────────────────────────────────────────────────────────────────
def run(args):
    ref_ayat = get_reference_ayat(args.surah, args.riwayah, args.ref_json)
    print(f"reference: surah {args.surah} — {len(ref_ayat)} ayāt, "
          f"{sum(len(a) for a in ref_ayat)} words ({args.riwayah})")

    ref_ayat_norm = [[norm_word(w) for w in a] for a in ref_ayat]
    ref_flat = [w for a in ref_ayat_norm for w in a]

    total = media_duration(args.audio)
    print(f"audio: {args.audio} — {total:.1f}s")

    print("transcribing…")
    hyp_words, hyp_times = transcribe(
        args.audio, args.model, args.device, args.compute_type)
    print(f"  whisper produced {len(hyp_words)} words")

    print("aligning to reference…")
    ref_time = align(ref_flat, hyp_words, hyp_times)
    matched = sum(1 for t in ref_time if t is not None)
    print(f"  aligned {matched}/{len(ref_flat)} reference words "
          f"({matched/max(1,len(ref_flat)):.0%})")

    spans = ayah_spans(ref_ayat_norm, ref_time)
    if spans is None:
        print("ERROR: no words could be aligned — wrong surah/riwayah or audio?",
              file=sys.stderr)
        return 2
    cuts = boundaries_from_spans(spans, total, keep_intro=args.keep_intro)

    snapped = list(cuts)
    if not args.no_snap:
        print("snapping cuts to silences…")
        snapper = build_silence_snapper(args.audio)
        if snapper:
            lo = 0 if not args.keep_intro else 1   # snap the intro-trim cut too
            for k in range(lo, len(snapped) - 1):  # last cut (=total) stays fixed
                if k == 0:
                    continue
                snapped[k] = snapper(cuts[k])
            if not args.keep_intro:
                snapped[0] = max(0.0, snapper(cuts[0]))
            for k in range(1, len(snapped)):       # keep monotonic
                if snapped[k] < snapped[k - 1]:
                    snapped[k] = snapped[k - 1]

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"cutting {len(snapped)-1} files → {out_dir}")
    for k in range(len(snapped) - 1):
        dest = out_dir / f"{args.surah:03d}{k+1:03d}.mp3"
        if not args.dry_run:
            cut(args.audio, snapped[k], snapped[k + 1], str(dest), args.bitrate)

    report = write_report(out_dir, args.surah, cuts, snapped, ref_time,
                          ref_ayat_norm, args.audio, total)
    print(f"\nreport: {out_dir/'report.json'}")
    intro = report["intro_trimmed_seconds"]
    intro_note = f"  intro trimmed: {intro:.1f}s" if intro > 0.2 else ""
    print(f"  ayāt: {report['ayah_count']}  align: {report['align_rate']:.0%}  "
          f"flagged: {report['flagged']}{intro_note}")
    if report["flagged"]:
        print("  ⚠ review these (duration outliers):")
        for a in report["ayat"]:
            if a["flag"]:
                print(f"    ayah {a['ayah']:>3}  {a['duration']:>6.2f}s  [{a['flag']}]  {a['file']}")
    if report["ayah_count"] != len(ref_ayat):
        print(f"  ⚠ expected {len(ref_ayat)} ayāt, produced {report['ayah_count']}")
    return 0


# ─────────────────────────────────────────────────────────────────────────────
# Self-test — proves normalise + alignment + boundary math without model/audio.
# ─────────────────────────────────────────────────────────────────────────────
def self_test():
    ok = True

    def check(name, cond):
        nonlocal ok
        print(f"  [{'PASS' if cond else 'FAIL'}] {name}")
        ok = ok and cond

    # normalisation parity with util.js intent
    check("normalize strips harakāt", normalize_arabic("ٱلْكِتَٰبُ") == normalize_arabic("الكتاب"))
    check("normalize folds alef forms", normalize_arabic("إنا") == normalize_arabic("انا"))
    check("normalize ة→ه", normalize_arabic("صلاة") == normalize_arabic("صلاه"))

    # synthetic: 3 ayāt, word every 1s with a 0.5s gap between ayāt.
    ref_ayat = [["إنا", "أعطيناك", "الكوثر"],
                ["فصل", "لربك", "وانحر"],
                ["إن", "شانئك", "هو", "الأبتر"]]
    ref_norm = [[norm_word(w) for w in a] for a in ref_ayat]
    ref_flat = [w for a in ref_norm for w in a]

    # hypothesis: same words (one swapped to a near-miss), timed.
    hyp_src = ["إنا", "اعطيناك", "الكوثر", "فصل", "لربك", "وانحر",
               "ان", "شانيك", "هو", "الابتر"]
    hyp = [norm_word(w) for w in hyp_src]
    times, t = [], 0.0
    gaps_after = {2, 5}  # extra 0.5s gap after ayah-final words (idx 2 and 5)
    for i in range(len(hyp)):
        times.append((t, t + 0.6))
        t += 1.0 + (0.5 if i in gaps_after else 0.0)
    total = t

    ref_time = align(ref_flat, hyp, times)
    matched = sum(1 for x in ref_time if x is not None)
    check(f"alignment matched all {len(ref_flat)} words", matched == len(ref_flat))

    spans = ayah_spans(ref_norm, ref_time)
    cuts = boundaries_from_spans(spans, total)
    check("produced 3 ayāt (4 cut points)", len(cuts) == 4)
    check("cuts strictly increasing", all(cuts[i] < cuts[i + 1] for i in range(len(cuts) - 1)))
    # boundary after ayah 1 should land in the gap around t≈3.05 (end 2.6, next start 3.5)
    b1 = cuts[1]
    check(f"ayah1/ayah2 boundary in the pause (got {b1:.2f}s)", 2.6 <= b1 <= 3.5)
    b2 = cuts[2]
    check(f"ayah2/ayah3 boundary in the pause (got {b2:.2f}s)", 6.1 <= b2 <= 7.0)

    # alignment robust to extra/dropped hyp words
    hyp2 = ["إنا", "اه", "اعطيناك", "الكوثر", "فصل", "لربك", "وانحر",
            "ان", "شانيك", "هو", "الابتر"]
    hyp2n = [norm_word(w) for w in hyp2]
    t2 = [(i * 1.0, i * 1.0 + 0.6) for i in range(len(hyp2n))]
    rt2 = align(ref_flat, hyp2n, t2)
    check("robust to a spurious hyp word", sum(1 for x in rt2 if x is not None) >= len(ref_flat) - 1)

    print(f"\nself-test: {'ALL PASS ✓' if ok else 'FAILURES ✗'}")
    return 0 if ok else 1


def main():
    p = argparse.ArgumentParser(description="Split a full-surah recitation into per-ayah MP3s.")
    p.add_argument("--audio", help="full-surah recitation file (mp3/wav/…)")
    p.add_argument("--surah", type=int, help="surah number (1–114)")
    p.add_argument("--out", help="output directory for {SS}{AAA}.mp3 files")
    p.add_argument("--riwayah", default="hafs", choices=["hafs", "warsh"],
                   help="reading (default hafs; affects local/baqarah & ref-json text)")
    p.add_argument("--ref-json", help="reference text JSON override (offline/Warsh)")
    p.add_argument("--model", default="medium", help="faster-whisper model (default medium)")
    p.add_argument("--device", default="auto", choices=["auto", "cuda", "cpu"])
    p.add_argument("--compute-type", default="auto",
                   help="faster-whisper compute type (auto→float16 on cuda, int8 on cpu)")
    p.add_argument("--bitrate", default="128k", help="output mp3 bitrate (default 128k)")
    p.add_argument("--keep-intro", action="store_true",
                   help="start ayah 1 at 0.0 (keep the opening basmala) instead of trimming it")
    p.add_argument("--no-snap", action="store_true", help="don't snap cuts to silences")
    p.add_argument("--dry-run", action="store_true", help="compute cuts + report but write no audio")
    p.add_argument("--self-test", action="store_true", help="run built-in logic tests and exit")
    args = p.parse_args()

    if args.self_test:
        return self_test()
    missing = [f for f in ("audio", "surah", "out") if not getattr(args, f)]
    if missing:
        p.error("required (unless --self-test): " + ", ".join("--" + m for m in missing))
    if not Path(args.audio).exists():
        p.error(f"audio not found: {args.audio}")
    return run(args)


if __name__ == "__main__":
    sys.exit(main())
