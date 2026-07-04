/* audio-engine.js — long-lived loop engine. Owns ONE <audio> + a prefetch element so
   it survives view navigation. Sequences per-ayah files with repeat counts, range
   loops and inter-rep gaps; falls back to a single whole-surah file for full-surah
   reciters. Surah-aware, and can also run an arbitrary list of drill "steps".
   Emits events the views/player subscribe to. */
(function (BA) {
  const R = BA.reciters;
  const MAX_PLAYLIST = 10000;                // guard: reject absurd drills

  const listeners = {};
  function on(evt, cb) { (listeners[evt] = listeners[evt] || []).push(cb); }
  function emit(evt, ...a) { (listeners[evt] || []).forEach(cb => { try { cb(...a); } catch (e) { console.error(e); } }); }

  let audio, prefetch;
  let reciter = null, riwayah = 'hafs';
  let playlist = [], idx = -1, gapMs = 800, state = 'stopped', gapTimer = null, retried = false;
  let rate = 1, lastStartedIdx = -1;
  let steps = [], lastStepStarted = -1;      // drill step tracking

  function setState(s) { state = s; emit('statechange', s); }

  function init() {
    audio = new Audio(); audio.preload = 'auto';
    prefetch = new Audio(); prefetch.preload = 'auto'; prefetch.muted = true;
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('timeupdate', () => {
      if (state !== 'playing' || !audio.duration) return;
      emit('progress', audio.currentTime / audio.duration, audio.currentTime, audio.duration);
    });
    // emit ayahstart/stepstart only when audio ACTUALLY begins (keeps counters in
    // lockstep with the sound instead of jumping ahead while the next file buffers)
    audio.addEventListener('playing', () => {
      setState('playing');
      if (idx !== lastStartedIdx) {
        lastStartedIdx = idx;
        const item = playlist[idx];
        if (item) {
          if (item.stepIdx != null && item.stepIdx !== lastStepStarted) {
            if (lastStepStarted !== -1) emit('stepdone', lastStepStarted);
            lastStepStarted = item.stepIdx;
            emit('stepstart', item.stepIdx, steps[item.stepIdx]);
          }
          emit('ayahstart', item.ayah, item);
        }
      }
    });
  }

  function configure({ reciterId, riwayah: ri }) {
    if (ri) riwayah = ri;
    if (reciterId) reciter = BA.data.reciter(reciterId);
    if (!reciter || reciter.riwayah !== riwayah) reciter = BA.data.defaultReciter(riwayah);
    return reciter;
  }

  function buildPerAyah(surah, from, to, repsPerAyah, rangeReps) {
    const list = [];
    for (let pass = 0; pass < Math.max(1, rangeReps); pass++)
      for (let a = from; a <= to; a++)
        for (let r = 0; r < Math.max(1, repsPerAyah); r++)
          list.push({ surah, ayah: a, url: R.ayahUrl(reciter, surah, a), rep: r, pass, isFull: false });
    return list;
  }

  function playRange(opts) {
    stop();
    const surah = opts.surah || BA.data.currentSurah;
    const from = Math.max(1, opts.from || 1);
    const to = Math.max(from, opts.to || from);
    gapMs = opts.gapMs != null ? opts.gapMs : gapMs;
    if (!R.canLoop(reciter)) {                 // full-surah reciter → single file
      playlist = [{ surah, ayah: from, url: R.surahUrl(reciter, surah), isFull: true, from, to }];
    } else {
      playlist = buildPerAyah(surah, from, to, opts.repsPerAyah, opts.rangeReps);
    }
    startFresh();
  }

  function playSingle(surah, ayah, opts = {}) {
    stop();
    gapMs = opts.gapMs != null ? opts.gapMs : gapMs;
    if (!R.canLoop(reciter)) { playlist = [{ surah, ayah, url: R.surahUrl(reciter, surah), isFull: true, from: ayah, to: ayah }]; }
    else { playlist = []; for (let r = 0; r < Math.max(1, opts.reps || 1); r++) playlist.push({ surah, ayah, url: R.ayahUrl(reciter, surah, ayah), rep: r, isFull: false }); }
    startFresh();
  }

  // drill: play an explicit list of steps [{surah, from, to, reps}] with the same
  // inter-rep gap between everything. Returns false (and emits 'error') if the reciter
  // can't do per-ayah or the materialized playlist would exceed the guard cap.
  function playSteps(stepList, opts = {}) {
    stop();
    gapMs = opts.gapMs != null ? opts.gapMs : gapMs;
    if (!R.canLoop(reciter)) { emit('error', 0, null); return false; }
    const total = stepList.reduce((sum, st) => sum + Math.max(1, st.reps) * (st.to - st.from + 1), 0);
    if (total > MAX_PLAYLIST) { emit('toobig', total); return false; }
    steps = stepList.slice();
    playlist = [];
    for (let si = 0; si < steps.length; si++) {
      const st = steps[si];
      for (let r = 0; r < Math.max(1, st.reps); r++)
        for (let a = st.from; a <= st.to; a++)
          playlist.push({ surah: st.surah, ayah: a, url: R.ayahUrl(reciter, st.surah, a), rep: r, stepIdx: si, isFull: false });
    }
    startFresh();
    return true;
  }

  function startFresh() { idx = -1; lastStartedIdx = -1; lastStepStarted = -1; advance(); }

  function loadCurrent() {
    const item = playlist[idx];
    if (!item) return finish();
    retried = false;
    setState('loading');           // counter advances on the 'playing' event, not here
    emit('loading', item.ayah, item);
    audio.src = item.url;
    audio.playbackRate = rate;
    const p = audio.play();
    if (p && p.catch) p.catch(() => {/* autoplay block: wait for user gesture */ setState('paused'); });
    // warm the next file
    const nxt = playlist[idx + 1];
    if (nxt && nxt.url && nxt.url !== item.url) { try { prefetch.src = nxt.url; } catch (e) {} }
  }

  function onEnded() {
    const item = playlist[idx];
    if (item) emit('ayahend', item.ayah, item);
    if (idx + 1 >= playlist.length) return finish();
    setState('gap');
    gapTimer = setTimeout(() => { if (state === 'gap') advance(); }, item && item.isFull ? 0 : gapMs);
  }

  function onError() {
    const item = playlist[idx];
    if (!retried) { retried = true; setTimeout(() => { try { audio.load(); audio.play(); } catch (e) {} }, 400); return; }
    if (item) emit('error', item.ayah, item);
    if (idx + 1 >= playlist.length) return finish();
    advance();
  }

  function advance() { idx++; loadCurrent(); }
  function finish() {
    if (lastStepStarted !== -1) { emit('stepdone', lastStepStarted); lastStepStarted = -1; }
    setState('stopped'); emit('rangedone');
  }

  // ---- drill step controls ----
  function firstIdxOfStep(si) { for (let i = 0; i < playlist.length; i++) if (playlist[i].stepIdx === si) return i; return -1; }
  function curStepIdx() { const it = playlist[idx]; return it && it.stepIdx != null ? it.stepIdx : -1; }
  function jumpToStep(si) {
    const t = firstIdxOfStep(si);
    if (t < 0) return finish();
    clearTimeout(gapTimer);
    idx = t - 1; lastStartedIdx = -1; lastStepStarted = -1;   // re-emit stepstart on entry
    advance();
  }
  function skipStep() { const c = curStepIdx(); if (c < 0) return; if (c + 1 >= steps.length) return finish(); jumpToStep(c + 1); }
  function prevStep() { const c = curStepIdx(); if (c < 0) return; jumpToStep(Math.max(0, c - 1)); }
  function repeatStep() { const c = curStepIdx(); if (c >= 0) jumpToStep(c); }

  function pause() { if (state === 'playing') { audio.pause(); setState('paused'); } else if (state === 'gap') { clearTimeout(gapTimer); setState('paused'); } }
  function resume() { if (state === 'paused') { if (audio.src && audio.currentTime < (audio.duration || 1e9)) audio.play(); else advance(); } }
  function toggle() { (state === 'playing' || state === 'gap') ? pause() : resume(); }
  function stop() { clearTimeout(gapTimer); if (audio) { audio.pause(); } playlist = []; steps = []; idx = -1; lastStartedIdx = -1; lastStepStarted = -1; setState('stopped'); }

  function setRate(r) { rate = r; if (audio) audio.playbackRate = r; }
  function getRate() { return rate; }
  function current() { return playlist[idx] || null; }
  function getState() { return state; }
  function getReciter() { return reciter; }
  function getRiwayah() { return riwayah; }

  BA.audio = { init, configure, playRange, playSingle, playSteps, pause, resume, toggle, stop,
               skipStep, prevStep, repeatStep,
               setRate, getRate, on, current, getState, getReciter, getRiwayah };
})(window.BA = window.BA || {});
