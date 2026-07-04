/* drill.js (view) — cumulative-repetition drill: repeat each new ayah, then chain
   it back to the range start, driving audio AND progressive text-hiding together.
   Pure step logic lives in js/drill.js (BA.drill); this is the UI + audio wiring. */
(function (BA) {
  const { el, clear, clamp } = BA.util;
  const t = (k, p) => BA.i18n.t(k, p);

  // audio.on is append-only, so register the step listeners ONCE at module load
  // and dispatch to whatever session is currently active (avoids per-mount leaks).
  let hooks = null;
  BA.audio.on('stepstart', (i, step) => { if (hooks && hooks.onStep) hooks.onStep(i, step); });
  BA.audio.on('rangedone', () => { if (hooks && hooks.onDone) hooks.onDone(); });

  const clone = o => JSON.parse(JSON.stringify(o));
  const repsToStr = v => Array.isArray(v) ? v.join(',') : String(v);
  function parseReps(str) {
    str = String(str).trim();
    if (str.indexOf(',') >= 0) { const a = str.split(',').map(x => clamp(parseInt(x, 10) || 1, 1, 50)).filter(Boolean); return a.length ? a : 5; }
    return clamp(parseInt(str, 10) || 1, 1, 50);
  }
  function labelOf(type, from, to, reps) {
    if (type === 'single') return t('drill.lblSingle', { n: from, reps });
    if (type === 'chain') return t('drill.lblChain', { from, to, reps });
    return t('drill.lblFinal', { from, to, reps });
  }

  (BA.views = BA.views || {}).drill = {
    mount(sec) {
      const { store, data, audio, reveal } = BA;
      store.setLast({ view: 'drill' });
      hooks = null;                         // drop any stale session hooks
      const ri = store.settings.riwayah;
      const surah = store.settings.surah;

      let def = clone(BA.drill.PRESETS[0]);
      let overrides = {};
      let from = clamp(store.last.rangeFrom || 1, 1, data.count);
      let to = clamp(store.last.rangeTo || Math.min(data.count, 10), from, data.count);
      let singleLevel = 0, chainLevel = 3;   // hiding: full while learning, hints while chaining
      let sessionSteps = [];

      // per-ayah reciter (whole-surah voices can't isolate an ayah)
      const perAyah = data.recitersFor(ri).filter(r => r.capability === 'per-ayah');
      let recId = (data.reciter(store.settings.reciter) || {}).capability === 'per-ayah'
        ? store.settings.reciter : (data.defaultReciter(ri) || {}).id;

      const compiled = () => BA.drill.applyOverrides(BA.drill.compile(def, { surah, from, to }), overrides);

      // ───────────────────────── setup + editor ─────────────────────────
      function renderSetup() {
        clear(sec);
        const resume = store.last.drill;

        const fromS = BA.util.stepper(from, 1, data.count); const toS = BA.util.stepper(to, 1, data.count);
        fromS.input.addEventListener('change', () => { from = clamp(+fromS.input.value || 1, 1, data.count); if (to < from) { to = from; toS.input.value = to; } renderEditor(); });
        toS.input.addEventListener('change', () => { to = clamp(+toS.input.value || from, from, data.count); renderEditor(); });

        const recSel = el('select', { onchange: () => recId = recSel.value });
        perAyah.forEach(r => { const o = el('option', { value: r.id }, r.name_en); if (r.id === recId) o.selected = true; recSel.append(o); });
        const perAyahNote = perAyah.length ? null : el('div', { class: 'muted', style: 'font-size:.82rem' }, t('drill.perAyahOnly'));

        // pattern select: presets + saved + custom
        const patSel = el('select', {});
        BA.drill.PRESETS.forEach(p => patSel.append(el('option', { value: 'preset:' + p.id }, p.name)));
        (store.settings.patterns || []).forEach(p => patSel.append(el('option', { value: 'user:' + p.id }, p.name)));
        patSel.append(el('option', { value: 'custom' }, t('drill.custom')));
        patSel.value = 'preset:' + (def.id || 'classic');
        patSel.addEventListener('change', () => {
          const v = patSel.value;
          if (v.startsWith('preset:')) { def = clone(BA.drill.PRESETS.find(p => p.id === v.slice(7))); overrides = {}; }
          else if (v.startsWith('user:')) { const u = (store.settings.patterns || []).find(p => p.id === v.slice(5)); if (u) { def = clone(u.def); overrides = clone(u.overrides || {}); } }
          seedCustom(); renderEditor();
        });

        // custom controls (seeded from def; editing switches to Custom)
        const newRepsI = el('input', { type: 'text', value: repsToStr(def.newReps), style: 'width:6em' });
        const chainRepsS = BA.util.stepper(def.chainReps || 3, 1, 50);
        const chainModeSel = el('select', {}, el('option', { value: 'full' }, t('drill.chainFull')), el('option', { value: 'window' }, t('drill.chainWindow')));
        chainModeSel.value = def.chainMode || 'full';
        const windowS = BA.util.stepper(def.windowSize || 3, 2, 20);
        const everyS = BA.util.stepper(def.chainEvery || 1, 1, 10);
        const finalS = BA.util.stepper(def.finalPass || 0, 0, 50);
        function seedCustom() {
          newRepsI.value = repsToStr(def.newReps); chainRepsS.input.value = def.chainReps || 3;
          chainModeSel.value = def.chainMode || 'full'; windowS.input.value = def.windowSize || 3;
          everyS.input.value = def.chainEvery || 1; finalS.input.value = def.finalPass || 0;
          patSel.value = 'preset:' + (def.id || 'classic');
        }
        const toCustom = () => {
          def = { id: null, name: t('drill.custom'), newReps: parseReps(newRepsI.value), chainReps: +chainRepsS.input.value,
            chainMode: chainModeSel.value, windowSize: +windowS.input.value, chainEvery: +everyS.input.value, finalPass: +finalS.input.value };
          overrides = {}; patSel.value = 'custom'; renderEditor();
        };
        [newRepsI, chainRepsS.input, chainModeSel, windowS.input, everyS.input, finalS.input].forEach(x => x.addEventListener('change', toCustom));

        // gap + speed (reuse global settings)
        const gap = el('input', { type: 'range', min: 0, max: 4000, step: 100, value: store.settings.gapMs });
        const gapV = el('span', { class: 'muted' }, (store.settings.gapMs / 1000).toFixed(1) + 's');
        gap.addEventListener('input', () => { gapV.textContent = (gap.value / 1000).toFixed(1) + 's'; store.setSetting('gapMs', +gap.value); });
        const speed = el('div', { class: 'seg' });
        const renderSpeed = () => { clear(speed); [0.5, 0.75, 1, 1.25, 1.5].forEach(r => speed.append(
          el('button', { class: 'seg-btn' + (Math.abs((store.settings.speed || 1) - r) < 0.001 ? ' on' : ''), type: 'button',
            onclick: () => { store.setSetting('speed', r); audio.setRate(r); renderSpeed(); } }, r + '×'))); };
        renderSpeed();

        const levelSel = (val, on) => { const s = el('select', { onchange: () => on(+s.value) }); for (let i = 0; i <= 4; i++) { const o = el('option', { value: i }, reveal.levelName(i)); if (i === val) o.selected = true; s.append(o); } return s; };

        const editorCard = el('div', { class: 'card' });
        function renderEditor() {
          from = clamp(from, 1, data.count); to = clamp(to, from, data.count);
          const steps = compiled();
          const sum = BA.drill.summarize(steps);
          clear(editorCard);
          editorCard.append(
            el('div', { class: 'row spread' }, el('h3', { style: 'margin:0' }, t('drill.editorTitle')),
              el('span', { class: 'muted', style: 'font-size:.82rem' }, t('drill.summary', { steps: sum.steps, plays: sum.totalPlays }))));
          steps.forEach(s => {
            const reps = (s.idx in overrides) ? overrides[s.idx] : s.reps;
            const st = BA.util.stepper(reps, 1, 50);
            st.input.addEventListener('change', () => { overrides[s.idx] = clamp(+st.input.value || 1, 1, 50); renderEditor(); });
            editorCard.append(el('div', { class: 'row spread', style: 'margin:.25rem 0' },
              el('span', { class: s.type === 'single' ? '' : 'muted' }, labelOf(s.type, s.from, s.to, reps)),
              el('div', { style: 'width:8.5em' }, st.wrap)));
          });
          editorCard.append(el('div', { class: 'row', style: 'margin-top:.6rem' },
            el('button', { class: 'btn ghost sm', onclick: () => { overrides = {}; renderEditor(); } }, t('drill.reset')),
            el('button', { class: 'btn ghost sm', onclick: savePattern }, t('drill.saveAs'))));
        }
        function savePattern() {
          const name = prompt(t('drill.savePrompt')); if (!name) return;
          const pats = store.settings.patterns || [];
          pats.push({ id: 'user-' + (pats.length + 1) + '-' + name.replace(/\W+/g, '').slice(0, 8), name, def: clone(def), overrides: clone(overrides) });
          store.setSetting('patterns', pats); BA.util.toast(t('drill.saved')); renderSetup();
        }

        const field = (label, ctrl) => el('div', { class: 'field' }, el('label', {}, label), ctrl);
        sec.append(
          resume ? resumeBanner(resume) : el('span'),
          el('div', { class: 'card' },
            el('h3', {}, t('drill.setupTitle')),
            el('div', { class: 'muted', style: 'font-size:.85rem;margin-bottom:.6rem' }, t('drill.intro')),
            el('div', { class: 'grid2' },
              field(t('listen.from'), fromS.wrap), field(t('listen.to'), toS.wrap),
              field(t('common.reciter'), recSel),
              field(t('drill.pattern'), patSel),
              field(t('drill.newReps') + ' — ' + t('drill.newRepsHint'), newRepsI),
              field(t('drill.chainReps'), chainRepsS.wrap),
              field(t('drill.chainMode'), chainModeSel), field(t('drill.windowSize'), windowS.wrap),
              field(t('drill.chainEvery'), everyS.wrap), field(t('drill.finalPass'), finalS.wrap),
              field(t('listen.gap'), el('div', { class: 'row' }, gap, gapV)), field(t('common.speed'), speed),
              field(t('drill.singleLevel'), levelSel(singleLevel, v => singleLevel = v)),
              field(t('drill.chainLevel'), levelSel(chainLevel, v => chainLevel = v))),
            perAyahNote || el('span'),
            el('div', { class: 'row', style: 'margin-top:.7rem' },
              el('button', { class: 'btn', onclick: () => start() }, t('drill.start')))),
          editorCard);
        renderEditor();
      }

      function resumeBanner(r) {
        return el('div', { class: 'card' },
          el('h3', {}, t('drill.resumeTitle')),
          el('div', { class: 'muted', style: 'font-size:.85rem;margin-bottom:.5rem' },
            t('drill.resumeBody', { name: r.name || t('drill.custom'), from: r.from, to: r.to, k: (r.stepIdx || 0) + 1 })),
          el('div', { class: 'row' },
            el('button', { class: 'btn', onclick: () => resumeDrill(r) }, t('drill.resume')),
            el('button', { class: 'btn ghost', onclick: () => { store.setLast({ drill: null }); renderSetup(); } }, t('drill.discard'))));
      }

      // ───────────────────────── session ─────────────────────────
      function start(fromStepIdx) {
        const rec = data.reciter(recId);
        if (!rec || rec.capability !== 'per-ayah') { BA.util.toast(t('drill.perAyahOnly')); return; }
        audio.configure({ reciterId: rec.id, riwayah: ri });
        audio.setRate(store.settings.speed || 1);
        store.setLast({ rangeFrom: from, rangeTo: to });
        let steps = compiled();
        const startAt = fromStepIdx || 0;
        sessionSteps = steps;
        const toPlay = startAt > 0 ? steps.slice(startAt) : steps;
        const okStart = audio.playSteps(toPlay.map(s => ({ surah, from: s.from, to: s.to, reps: s.reps, type: s.type })), { gapMs: store.settings.gapMs });
        if (!okStart) { BA.util.toast(t('drill.tooBig')); return; }
        renderSession(steps.length, startAt);
      }

      function renderSession(totalSteps, startAt) {
        clear(sec);
        const stepLabel = el('strong', { style: 'font-size:1.1rem' }, '');
        const stepPill = el('span', { class: 'pill' }, '');
        const bar = el('div', { class: 'meter', style: 'margin:.4rem 0 1rem' }, el('i', {}));
        const arEl = el('div', { class: 'ar', dataset: { riwayah: ri } });
        const card = el('div', { class: 'ayah-card' }, arEl);
        const trBox = el('div', { class: 'tr-box' });
        let curType = 'single';

        sec.append(el('div', { class: 'card' },
          el('div', { class: 'row spread' }, stepLabel, stepPill), bar, card, trBox,
          el('div', { class: 'row', style: 'margin-top:.8rem' },
            el('button', { class: 'icon-btn', title: t('drill.prevStep'), onclick: () => audio.prevStep() }, '⏮'),
            el('button', { class: 'icon-btn', title: t('drill.repeatStep'), onclick: () => audio.repeatStep() }, '🔁'),
            el('button', { class: 'icon-btn play', title: t('aria.playpause'), onclick: () => audio.toggle() }, '⏯'),
            el('button', { class: 'icon-btn', title: t('drill.skipStep'), onclick: () => audio.skipStep() }, '⏭'),
            el('button', { class: 'btn ghost sm', onclick: endSession }, t('drill.end')))));

        hooks = {
          onStep(i, step) {
            if (!step) return;
            curType = step.type;
            const shown = startAt + i;                 // absolute step index (we may have sliced)
            stepLabel.textContent = labelOf(step.type, step.from, step.to, step.reps);
            stepPill.textContent = t('drill.stepOf', { k: shown + 1, total: totalSteps });
            bar.firstElementChild.style.width = ((shown + 1) / totalSteps * 100).toFixed(1) + '%';
            persistResume(shown);
          },
          onDone() { renderDone(); },
        };
        BA.app.onAyah((n) => {
          clear(arEl);
          const lvl = curType === 'single' ? singleLevel : chainLevel;
          if (lvl === 0) arEl.append(document.createTextNode(data.text(n, ri) + ' '));
          else reveal.render(arEl, data.words(n, ri), lvl);
          arEl.append(el('span', { class: 'ayah-num' }, n));
          clear(trBox); const tr = BA.app.translationEl(n); if (tr) trBox.append(tr);
          card.classList.add('playing');
        });
      }

      function endSession() { audio.stop(); hooks = null; store.setLast({ drill: null }); renderSetup(); }

      function persistResume(stepIdx) {
        store.setLast({ drill: { surah, from, to, name: def.name || t('drill.custom'), def: clone(def), overrides: clone(overrides), stepIdx } });
      }
      function resumeDrill(r) {
        if (r.surah !== surah) { BA.util.toast(t('drill.perAyahOnly')); }
        from = clamp(r.from, 1, data.count); to = clamp(r.to, from, data.count);
        def = clone(r.def); overrides = clone(r.overrides || {});
        start(r.stepIdx || 0);
      }

      // ───────────────────────── completion + grading ─────────────────────────
      function renderDone() {
        hooks = null; audio.stop();
        clear(sec);
        const strip = el('div', {});
        for (let n = from; n <= to; n++) strip.append(gradeRow(n));
        sec.append(el('div', { class: 'card', style: 'text-align:center' },
          el('div', { style: 'font-size:2.2rem' }, '🎉'),
          el('h2', { style: 'margin:.3rem 0' }, t('drill.completeTitle'))),
          el('div', { class: 'card' },
            el('h3', {}, t('drill.gradeTitle')), strip),
          el('div', { class: 'row', style: 'justify-content:center;margin-top:.4rem' },
            el('button', { class: 'btn', onclick: () => { store.setLast({ drill: null }); renderSetup(); } }, t('drill.drillAgain')),
            el('button', { class: 'btn ghost', onclick: () => BA.nav.go('review') }, t('drill.goReview'))));
        store.setLast({ drill: null });
      }
      function gradeRow(n) {
        const label = el('span', { class: 'ar', dataset: { riwayah: ri }, style: 'font-size:1.2rem' }, `${data.text(n, ri).slice(0, 28)}… `, el('span', { class: 'ayah-num' }, n));
        const row = el('div', { class: 'row spread', style: 'margin:.3rem 0;flex-wrap:nowrap' });
        const btns = el('div', { class: 'row' },
          el('button', { class: 'btn ghost sm', onclick: () => mark('again') }, t('review.again')),
          el('button', { class: 'btn sm', onclick: () => mark('good') }, t('review.good')),
          el('button', { class: 'btn gold sm', onclick: () => mark('easy') }, t('review.easy')));
        function mark(g) { store.review(BA.util.ayahKey(surah, n), g); BA.app.refreshStreak(); clear(btns); btns.append(el('span', { class: 'pill' }, t('review.' + g))); }
        row.append(label, btns); return row;
      }

      renderSetup();
    },
  };
})(window.BA = window.BA || {});
