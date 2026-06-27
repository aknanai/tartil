/* progress.js — heatmap of all 286 ayāt, stats, and backup (export/import). */
(function (BA) {
  const { el, clear } = BA.util;
  (BA.views = BA.views || {}).progress = {
    mount(sec) {
      const { store, data, nav, i18n } = BA;
      const t = i18n.t;
      store.setLast({ view: 'progress' });
      clear(sec);
      const pct = store.percent(), c = store.counts();

      const heat = el('div', { class: 'heat', role: 'list' });
      for (let n = 1; n <= data.count; n++) {
        const st = store.status('2:' + n);
        heat.append(el('button', {
          type: 'button', role: 'listitem', dataset: { s: st },
          title: `${t('common.ayah', { n })} · ${t('statusWord.' + st)}`,
          'aria-label': `${t('common.ayah', { n })}, ${t('statusWord.' + st)}`,
          onclick: () => { store.setLast({ ayah: n }); nav.go('memorize'); },
        }));
      }

      const fileIn = el('input', { type: 'file', accept: 'application/json', style: 'display:none',
        onchange: e => importFile(e.target.files[0]) });

      sec.append(
        el('h1', { class: 'page-title' }, t('progress.title')),
        el('div', { class: 'grid2' },
          mini(`${pct}%`, t('progress.memorized'), el('div', { class: 'meter' }, el('i', { style: `width:${pct}%` }))),
          mini(`🔥 ${store.streak.current || 0}`, t('progress.streakLabel', { n: store.streak.best || 0 })),
          mini(`${c.mastered}`, t('progress.mastered')),
          mini(`${c.solid}`, t('progress.solid'))),

        store.dueCount()
          ? el('div', { class: 'card' },
              el('div', { class: 'row spread' },
                el('div', {}, el('strong', {}, t('progress.dueForReview', { n: store.dueCount() })),
                  el('div', { class: 'muted', style: 'font-size:.85rem' }, t('progress.dueSub'))),
                el('button', { class: 'btn', onclick: () => nav.go('review') }, t('progress.start'))))
          : el('span'),

        el('div', { class: 'card' },
          el('div', { class: 'row spread' }, el('h3', { style: 'margin:0' }, t('progress.allAyat')),
            el('span', { class: 'muted', style: 'font-size:.8rem' }, t('progress.tapCell'))),
          heat,
          el('div', { class: 'legend' },
            leg('var(--border)', t('progress.legendNew')), leg('#e7c98a', t('progress.legendLearning')),
            leg('#7bbf97', t('progress.legendSolid')), leg('var(--emerald)', t('progress.legendMastered')))),

        el('div', { class: 'card' },
          el('h3', {}, t('progress.backupTitle')),
          el('div', { class: 'muted', style: 'font-size:.85rem;margin-bottom:.6rem' },
            t('progress.backupDesc')),
          el('div', { class: 'row' },
            el('button', { class: 'btn', onclick: exportFile }, t('progress.export')),
            el('button', { class: 'btn ghost', onclick: () => fileIn.click() }, t('progress.import')),
            el('button', { class: 'btn ghost', onclick: reset }, t('progress.reset')),
            fileIn))
      );

      function exportFile() {
        const blob = new Blob([store.exportJSON()], { type: 'application/json' });
        const a = el('a', { href: URL.createObjectURL(blob), download: 'baqarah-hifz-backup.json' });
        document.body.append(a); a.click(); a.remove();
        BA.util.toast(t('progress.toastDownloaded'));
      }
      function importFile(file) {
        if (!file) return;
        const rd = new FileReader();
        rd.onload = () => { try { store.importJSON(rd.result); BA.util.toast(t('progress.toastRestored')); BA.app.refreshStreak(); BA.views.progress.mount(sec); } catch (e) { BA.util.toast(t('progress.toastInvalid')); } };
        rd.readAsText(file);
      }
      function reset() {
        if (confirm(t('progress.confirmReset'))) {
          store.resetProgress(); BA.app.refreshStreak(); BA.views.progress.mount(sec); BA.util.toast(t('progress.toastReset'));
        }
      }
    },
  };
  function mini(big, label, extra) {
    return el('div', { class: 'card', style: 'margin:0' }, el('div', { class: 'big-num' }, big),
      el('div', { class: 'muted', style: 'margin:.2rem 0 .4rem' }, label), extra || '');
  }
  function leg(color, label) { return el('span', {}, el('b', { style: `background:${color}` }), label); }
})(window.BA = window.BA || {});
