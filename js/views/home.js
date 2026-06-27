/* home.js — landing: resume, progress glance, quick start, credits. */
(function (BA) {
  const { el, clear } = BA.util;
  (BA.views = BA.views || {}).home = {
    mount(sec) {
      const { store, data, nav, i18n } = BA;
      const t = i18n.t;
      store.setLast({ view: 'home' });
      clear(sec);
      const pct = store.percent(), c = store.counts(), last = store.last.ayah || 1;
      const due = store.dueCount(), newRem = store.newRemaining();

      sec.append(
        el('h1', { class: 'page-title' }, t('home.title') + ' ',
          el('span', { class: 'pill' }, t('home.ayatPill'))),

        el('div', { class: 'card' },
          el('div', { class: 'row spread' },
            el('div', {},
              el('div', { class: 'muted' }, t('home.todaysReview')),
              el('div', { html: `<strong style="font-size:1.2rem">${t('home.dueCount', { n: due })}</strong>${newRem ? t('home.newSuffix', { n: newRem }) : ''}` })),
            el('button', { class: 'btn', onclick: () => nav.go('review') },
              (due || newRem) ? t('home.startReview') : t('home.caughtUp')))),

        el('div', { class: 'card' },
          el('div', { class: 'bismillah' }, data.bismillah(store.settings.riwayah)),
          el('div', { class: 'row spread' },
            el('div', {},
              el('div', { class: 'muted' }, t('home.continueLabel')),
              el('div', { html: `<strong style="font-size:1.2rem">${t('common.ayah', { n: last })}</strong>` })),
            el('div', { class: 'row' },
              el('button', { class: 'btn', onclick: () => { store.setLast({ ayah: last }); nav.go('memorize'); } }, t('home.continue')),
              el('button', { class: 'btn ghost', onclick: () => nav.go('listen') }, t('home.listen'))))),

        el('div', { class: 'grid2' },
          stat(`${pct}%`, t('home.memorized'), el('div', { class: 'meter' }, el('i', { style: `width:${pct}%` }))),
          stat(`🔥 ${store.streak.current || 0}`, t('home.streakLabel', { n: store.streak.best || 0 })),
          stat(`${c.mastered}`, t('home.mastered')),
          stat(`${c.learning + c.solid}`, t('home.inProgress'))),

        el('div', { class: 'card' },
          el('h3', {}, t('home.howTitle')),
          el('ul', { class: 'muted', style: 'margin:.2rem 0;padding-inline-start:1.1rem;line-height:1.9' },
            el('li', { html: t('home.how1') }),
            el('li', { html: t('home.how2') }),
            el('li', { html: t('home.how3') }),
            el('li', { html: t('home.how4') }))),

        el('div', { class: 'card' },
          el('h3', {}, t('home.creditsTitle')),
          el('div', { class: 'muted', style: 'font-size:.85rem;line-height:1.8' },
            el('div', { html: t('home.credits1') }),
            el('div', { html: t('home.credits2') }),
            el('div', { class: 'muted', style: 'margin-top:.4rem' }, t('home.credits3'))))
      );
    },
  };
  function stat(big, label, extra) {
    return el('div', { class: 'card', style: 'margin:0' },
      el('div', { class: 'big-num' }, big),
      el('div', { class: 'muted', style: 'margin:.2rem 0 .4rem' }, label), extra || '');
  }
})(window.BA = window.BA || {});
