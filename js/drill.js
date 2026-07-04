/* drill.js — pure cumulative-repetition drill logic. ZERO DOM / ZERO BA deps.
   Runs in the browser (attaches BA.drill) AND under `node --test` (module.exports).

   The user's canonical pattern, for range 10–20 with newReps x,y,t… and chainReps z:
     ayah 10 ×x · ayah 11 ×y · chain 10–11 ×z · ayah 12 ×t · chain 10–12 ×z · … → 20.
   First ayah gets a single step but NO chain (a chain of one is a duplicate).
   Chains always run from the range start (chainMode 'full') or the last k ayāt ('window').
   Deterministic; every rep clamped 1–50. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  (root.BA = root.BA || {}).drill = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const REP_MIN = 1, REP_MAX = 50;
  const clampRep = n => Math.max(REP_MIN, Math.min(REP_MAX, Math.round(n) || REP_MIN));

  // en-dash for ranges to match the label examples in the spec ('Chain 10–12 ×3').
  const DASH = '–';

  // reps for the i-th NEW ayah (0-based): number → same every time; array → cycled.
  function newRepsAt(newReps, i) {
    if (Array.isArray(newReps)) {
      if (newReps.length === 0) return REP_MIN;
      return clampRep(newReps[i % newReps.length]);
    }
    return clampRep(newReps);
  }

  // chain lower bound for the ayah just added at `cur`, given range start `from`.
  function chainStart(def, from, cur) {
    if (def.chainMode === 'window') {
      const k = Math.max(2, def.windowSize || 3);   // window of 1 = no chain, so floor at 2
      return Math.max(from, cur - k + 1);
    }
    return from;                                     // 'full' → always from range start
  }

  // compile(patternDef, {surah, from, to}) → Step[]
  function compile(def, range) {
    def = def || {};
    const surah = range.surah;
    let from = Math.min(range.from, range.to);
    let to = Math.max(range.from, range.to);
    const chainEvery = Math.max(1, def.chainEvery || 1);

    const steps = [];
    let idx = 0;
    const push = s => { s.idx = idx++; steps.push(s); };

    let newCount = 0;                                // how many new ayāt introduced so far
    for (let a = from; a <= to; a++) {
      const reps = newRepsAt(def.newReps, newCount);
      push({ type: 'single', surah, from: a, to: a, reps, label: 'Ayah ' + a + ' ×' + reps });
      newCount++;

      // chain step, unless this is the very first ayah (chain of one) or chainEvery gate.
      if (a > from && (newCount % chainEvery === 0)) {
        const cs = chainStart(def, from, a);
        if (cs < a) {                               // guard: still a real chain (>=2 ayāt)
          const creps = clampRep(def.chainReps);
          push({ type: 'chain', surah, from: cs, to: a, reps: creps,
                 label: 'Chain ' + cs + DASH + a + ' ×' + creps });
        }
      }
    }

    // finalPass: whole-range reps appended once at the end (only if range >1 ayah).
    const fp = def.finalPass || 0;
    if (fp > 0 && to > from) {
      const freps = clampRep(fp);
      push({ type: 'final', surah, from, to, reps: freps,
             label: 'Full range ' + from + DASH + to + ' ×' + freps });
    }

    return steps;
  }

  // summarize(steps) → {steps, totalPlays, perAyah}. perAyah is a plain object keyed by ayah number.
  function summarize(steps) {
    let totalPlays = 0;
    const perAyah = {};
    for (const s of steps) {
      const span = s.to - s.from + 1;
      totalPlays += span * s.reps;                  // every ayah in the step plays `reps` times
      for (let a = s.from; a <= s.to; a++) perAyah[a] = (perAyah[a] || 0) + s.reps;
    }
    return { steps: steps.length, totalPlays, perAyah };
  }

  // applyOverrides(steps, {idx: reps}) → Step[]. Returns a NEW array; relabels overridden steps.
  function applyOverrides(steps, overrides) {
    overrides = overrides || {};
    return steps.map(s => {
      if (!(s.idx in overrides)) return s;
      const reps = clampRep(overrides[s.idx]);
      const out = Object.assign({}, s, { reps });
      out.label = relabel(out);
      return out;
    });
  }

  function relabel(s) {
    if (s.type === 'single') return 'Ayah ' + s.from + ' ×' + s.reps;
    if (s.type === 'chain') return 'Chain ' + s.from + DASH + s.to + ' ×' + s.reps;
    return 'Full range ' + s.from + DASH + s.to + ' ×' + s.reps;
  }

  // Presets — each a full PatternDef with id + name.
  const PRESETS = [
    { id: 'classic', name: 'Classic cumulative',
      newReps: 5, chainReps: 3, chainMode: 'full', windowSize: 3, chainEvery: 1, finalPass: 2 },
    { id: 'light', name: 'Light',
      newReps: 3, chainReps: 2, chainMode: 'full', windowSize: 3, chainEvery: 1, finalPass: 0 },
    { id: 'deep', name: 'Deep',
      newReps: 7, chainReps: 5, chainMode: 'full', windowSize: 3, chainEvery: 1, finalPass: 3 },
    { id: 'window3', name: 'Rolling window (3)',
      newReps: 5, chainReps: 3, chainMode: 'window', windowSize: 3, chainEvery: 1, finalPass: 0 },
    { id: 'sabaq', name: 'Sabaq',
      newReps: [10, 7, 5], chainReps: 3, chainMode: 'full', windowSize: 3, chainEvery: 1, finalPass: 5 },
  ];

  return { compile, summarize, applyOverrides, PRESETS };
});
