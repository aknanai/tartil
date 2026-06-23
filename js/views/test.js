/* test.js — quizzes: multiple-choice, typed recall, audio recall, and
   recite-&-self-grade (which feeds the spaced-repetition scheduler). */
(function (BA) {
  const { el, clear, shuffle, clamp } = BA.util;

  const MODES = [
    { id: 'blank',  label: 'Fill the blank' },
    { id: 'type',   label: 'Type the word' },
    { id: 'next',   label: 'Next ayah' },
    { id: 'audio',  label: 'Listen & recall' },
    { id: 'recite', label: 'Recite' },
  ];

  (BA.views = BA.views || {}).test = {
    mount(sec) {
      const { store, data, audio } = BA;
      store.setLast({ view: 'test' });
      const ri = store.settings.riwayah;
      let mode = 'blank', score = { right: 0, total: 0 };
      clear(sec);

      // per-ayah reciter for audio modes (whole-surah voices can't isolate an ayah)
      const curRec = data.reciter(store.settings.reciter);
      const loopRec = (curRec && curRec.capability === 'full-surah') ? data.defaultReciter(ri) : (curRec || data.defaultReciter(ri));
      function playAyah(n) { audio.configure({ reciterId: loopRec.id, riwayah: ri }); audio.playSingle(n, { reps: 1 }); }

      // pool of distractor words (≥3 letters) for fill-blank, tagged with their ayah
      const pool = [];
      for (let n = 1; n <= data.count; n++) data.words(n, ri).forEach(w => { if (BA.util.bareLetters(w).length >= 3) pool.push({ w, n }); });

      const tabs = el('div', { class: 'seg', style: 'margin-bottom:.4rem' });
      const scoreEl = el('span', { class: 'pill' }, '');
      const qbox = el('div', { class: 'card' });
      const nextBtn = el('button', { class: 'btn', onclick: question }, 'New question →');
      sec.append(
        el('div', { class: 'row spread' }, tabs, scoreEl),
        qbox,
        el('div', { class: 'row' }, nextBtn));

      function renderTabs() {
        clear(tabs);
        MODES.forEach(m => tabs.append(el('button', {
          class: 'seg-btn' + (mode === m.id ? ' on' : ''), type: 'button',
          onclick: () => { if (mode !== m.id) { mode = m.id; renderTabs(); question(); } },
        }, m.label)));
      }
      function updateScore() { scoreEl.textContent = `Score ${score.right}/${score.total}`; }
      function gotRight(ok) { score.total++; if (ok) score.right++; updateScore(); }

      function question() {
        audio.stop();
        clear(qbox);
        ({ blank: qBlank, type: qType, next: qNext, audio: qAudio, recite: qRecite }[mode] || qBlank)();
      }

      // ── shared helpers ──
      function ayahWithBlank(n, blankIdx, slot) {
        const words = data.words(n, ri);
        const wrap = el('div', { class: 'ar', dataset: { riwayah: ri }, style: 'line-height:2.4' });
        words.forEach((w, i) => {
          if (i === blankIdx) { wrap.append(slot, document.createTextNode(' ')); }
          else wrap.append(document.createTextNode(w + ' '));
        });
        wrap.append(el('span', { class: 'ayah-num' }, n));
        return wrap;
      }
      function blankCandidates(n) {
        const words = data.words(n, ri);
        const idx = words.map((w, i) => i).filter(i => BA.util.bareLetters(words[i]).length >= 3);
        return { words, bi: idx.length ? idx[Math.floor(Math.random() * idx.length)] : 0 };
      }

      // ── MODE: fill the blank (MCQ) ──
      function qBlank() {
        const n = 1 + Math.floor(Math.random() * data.count);
        const { words, bi } = blankCandidates(n);
        const answer = words[bi];
        const slot = el('span', { class: 'blank-input' }, '____');
        const opts = shuffle([answer, ...distractorWords(answer, n, 3)]);
        qbox.append(
          el('div', { class: 'muted', style: 'margin-bottom:.4rem' }, `Ayah ${n} — choose the missing word`),
          ayahWithBlank(n, bi, slot),
          el('div', { class: 'row', style: 'margin-top:.8rem;flex-wrap:wrap' },
            ...opts.map(o => el('button', { class: 'choice', onclick: ev => answerChoice(ev.target, o === answer, () => { slot.textContent = answer; }) }, o))));
      }

      // ── MODE: type the word ──
      function qType() {
        const n = 1 + Math.floor(Math.random() * data.count);
        const { words, bi } = blankCandidates(n);
        const answer = words[bi];
        const input = el('input', {
          type: 'text', class: 'blank-input', lang: 'ar', dir: 'rtl', autocomplete: 'off',
          spellcheck: 'false', inputmode: 'text', placeholder: '…',
          style: 'border-bottom:2px solid var(--accent);min-width:5em;width:6em;padding:.1rem .3rem',
        });
        const feedback = el('div', { class: 'muted', style: 'margin-top:.6rem' }, '');
        const submit = () => {
          if (input.disabled) return;
          const ok = BA.util.normalizeArabic(input.value) === BA.util.normalizeArabic(answer);
          input.disabled = true;
          input.style.borderBottomColor = ok ? 'var(--ok)' : 'var(--bad)';
          feedback.innerHTML = ok ? '✓ Correct' : `✗ Answer: <b class="ar" style="font-size:1.2rem" dir="rtl">${answer}</b>`;
          gotRight(ok);
        };
        input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
        qbox.append(
          el('div', { class: 'muted', style: 'margin-bottom:.4rem' }, `Ayah ${n} — type the missing word (ḥarakāt optional)`),
          ayahWithBlank(n, bi, input),
          el('div', { class: 'row', style: 'margin-top:.8rem' },
            el('button', { class: 'btn', onclick: submit }, 'Check'),
            el('button', { class: 'btn ghost', onclick: () => { input.value = answer; submit(); } }, 'Reveal'),
            el('button', { class: 'icon-btn', title: 'Hear the ayah', onclick: () => playAyah(n) }, '🔊')),
          feedback);
        setTimeout(() => input.focus(), 0);
      }

      // ── MODE: next ayah (MCQ) ──
      function qNext() {
        const n = 1 + Math.floor(Math.random() * (data.count - 1));
        const correct = n + 1;
        const opts = shuffle([correct, ...distractorNums(correct, n, 3)]);
        qbox.append(
          el('div', { class: 'muted', style: 'margin-bottom:.4rem' }, `This is ayah ${n}. Which ayah comes next?`),
          el('div', { class: 'ar', dataset: { riwayah: ri } }, data.text(n, ri) + ' ', el('span', { class: 'ayah-num' }, n)),
          el('div', { style: 'margin-top:.7rem' },
            ...opts.map(c => el('div', { class: 'order-item', style: 'cursor:pointer',
              onclick: ev => answerChoice(ev.currentTarget, c === correct) }, firstWords(c)))));
      }

      // ── MODE: listen & recall (audio cue → which ayah comes next) ──
      function qAudio() {
        if (!BA.reciters.canLoop(loopRec)) {
          qbox.append(el('div', { class: 'muted' }, 'Audio recall needs a per-ayah reciter — pick one in Settings.'));
          return;
        }
        const n = 1 + Math.floor(Math.random() * (data.count - 1));
        const correct = n + 1;
        const opts = shuffle([correct, ...distractorNums(correct, n, 3)]);
        const rev = el('div', { class: 'ar', dataset: { riwayah: ri }, hidden: true },
          data.text(n, ri) + ' ', el('span', { class: 'ayah-num' }, n));
        qbox.append(
          el('div', { class: 'muted', style: 'margin-bottom:.4rem' }, 'Listen, then choose which ayah comes next'),
          el('div', { class: 'row', style: 'margin:.4rem 0 .9rem' },
            el('button', { class: 'btn', onclick: () => playAyah(n) }, '🔊 Play the ayah'),
            el('button', { class: 'btn ghost', onclick: () => { rev.hidden = !rev.hidden; } }, '👁 Show its text')),
          rev,
          el('div', { style: 'margin-top:.7rem' },
            ...opts.map(c => el('div', { class: 'order-item', style: 'cursor:pointer',
              onclick: ev => answerChoice(ev.currentTarget, c === correct) }, firstWords(c)))));
        playAyah(n);
      }

      // ── MODE: recite & self-grade (feeds spaced repetition) ──
      function qRecite() {
        const n = 1 + Math.floor(Math.random() * data.count);
        const words = data.words(n, ri);
        const prompt = el('div', { class: 'ar', dataset: { riwayah: ri } },
          words[0] + ' …', el('span', { class: 'ayah-num' }, n));
        const full = el('div', { class: 'ar', dataset: { riwayah: ri }, hidden: true },
          data.text(n, ri) + ' ', el('span', { class: 'ayah-num' }, n));
        const grades = el('div', { class: 'row', style: 'margin-top:.8rem', hidden: true },
          el('button', { class: 'btn gold', onclick: () => selfGrade(n, true) }, '✓ Got it'),
          el('button', { class: 'btn ghost', onclick: () => selfGrade(n, false) }, '✗ Struggled'));
        const reveal = el('button', { class: 'btn', onclick: () => { full.hidden = false; grades.hidden = false; reveal.hidden = true; } }, '👁 Reveal answer');

        qbox.append(
          el('div', { class: 'muted', style: 'margin-bottom:.4rem' }, `Recite ayah ${n} from memory, then check yourself`),
          prompt, full,
          el('div', { class: 'row', style: 'margin-top:.6rem' },
            reveal, el('button', { class: 'icon-btn', title: 'Hear it', onclick: () => playAyah(n) }, '🔊')),
          recorderUI(),
          grades);
      }
      function selfGrade(n, ok) {
        store.review('2:' + n, ok ? 'good' : 'again');
        BA.app.refreshStreak();
        gotRight(ok);
        BA.util.toast(ok ? 'Saved — scheduled for review ✓' : 'No worries — back in the queue');
        question();
      }

      // optional: record yourself & play it back to compare (no upload, stays on device)
      function recorderUI() {
        const supported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
        if (!supported) return el('span');
        let rec = null, chunks = [], url = null;
        const player = el('audio', { controls: true, style: 'display:none;margin-top:.5rem;width:100%' });
        const btn = el('button', { class: 'btn ghost' }, '● Record yourself');
        btn.addEventListener('click', async () => {
          if (rec && rec.state === 'recording') { rec.stop(); return; }
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            rec = new MediaRecorder(stream); chunks = [];
            rec.ondataavailable = e => chunks.push(e.data);
            rec.onstop = () => {
              stream.getTracks().forEach(t => t.stop());
              if (url) URL.revokeObjectURL(url);
              url = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
              player.src = url; player.style.display = 'block';
              btn.textContent = '● Record yourself'; btn.classList.remove('gold');
            };
            rec.start(); btn.textContent = '■ Stop recording'; btn.classList.add('gold');
          } catch (e) { BA.util.toast('Microphone not available'); }
        });
        return el('div', { style: 'margin-top:.6rem' }, btn, player);
      }

      // ── answer handling + distractors ──
      function answerChoice(node, isRight, onReveal) {
        if (node.dataset.done) return;
        qbox.querySelectorAll('.choice,.order-item').forEach(b => b.dataset.done = '1');
        node.classList.add(isRight ? 'right' : 'wrong');
        gotRight(isRight);
        if (onReveal) onReveal();
        if (!isRight) BA.util.toast('Not quite — try the next one');
      }
      function firstWords(n) {
        const ws = data.words(n, ri);
        return ws.slice(0, 4).join(' ') + (ws.length > 4 ? ' …' : '');
      }
      // distractors: prefer words near the answer's length, pulled from OTHER ayāt
      function distractorWords(answer, fromN, k) {
        const aLen = BA.util.bareLetters(answer).length;
        const near = pool.filter(p => p.n !== fromN && p.w !== answer && Math.abs(BA.util.bareLetters(p.w).length - aLen) <= 1);
        const src = near.length >= k * 3 ? near : pool;
        const out = []; let guard = 0;
        while (out.length < k && guard++ < 400) { const p = src[Math.floor(Math.random() * src.length)]; if (p.w !== answer && !out.includes(p.w)) out.push(p.w); }
        return out;
      }
      // distractors: bias toward nearby ayāt so the choice tests real sequence sense
      function distractorNums(correct, alsoNot, k) {
        const out = []; let guard = 0;
        while (out.length < k && guard++ < 400) {
          const spread = guard < 200 ? 8 : data.count;                 // widen if the local pool is exhausted
          let x = clamp(correct + (Math.floor(Math.random() * (2 * spread + 1)) - spread), 1, data.count);
          if (x !== correct && x !== alsoNot && !out.includes(x)) out.push(x);
        }
        return out;
      }

      renderTabs(); question();
    },
  };
})(window.BA = window.BA || {});
