/* nav.js — VIEWS array is the single source of truth for the sidebar + hash router. */
(function (BA) {
  // title/group are i18n keys resolved at render time (nav.<id>, group.<group>)
  const VIEWS = [
    { id: 'home',     ic: '🏠', group: 'start' },
    { id: 'review',   ic: '🎯', group: 'memorize' },
    { id: 'listen',   ic: '🔁', group: 'memorize' },
    { id: 'memorize', ic: '🙈', group: 'memorize' },
    { id: 'drill',    ic: '🏗️', group: 'memorize' },
    { id: 'test',     ic: '✅', group: 'memorize' },
    { id: 'progress', ic: '📊', group: 'you' },
    { id: 'settings', ic: '⚙️', group: 'you' },
  ];
  const t = (k) => (BA.i18n ? BA.i18n.t(k) : k);

  function buildSidebar() {
    const side = document.getElementById('sidebar');
    side.innerHTML = '';
    const groups = [];
    VIEWS.forEach(v => {
      let g = groups.find(x => x.name === v.group);
      if (!g) { g = { name: v.group, items: [] }; groups.push(g); }
      g.items.push(v);
    });
    groups.forEach(g => {
      const wrap = document.createElement('div');
      wrap.className = 'nav-group';
      wrap.innerHTML = `<div class="nav-group-title">${t('group.' + g.name)}</div>`;
      g.items.forEach(v => {
        const a = document.createElement('a');
        a.className = 'nav-link';
        a.href = `#/${v.id}`;
        a.dataset.view = v.id;
        a.innerHTML = `<span class="ic">${v.ic}</span><span>${t('nav.' + v.id)}</span>`;
        wrap.appendChild(a);
      });
      side.appendChild(wrap);
    });
  }

  function currentId() {
    const m = (location.hash || '').match(/^#\/(\w+)/);
    const id = m && m[1];
    return VIEWS.some(v => v.id === id) ? id : 'home';
  }

  function route() {
    const id = currentId();
    document.querySelectorAll('#main .view').forEach(sec => {
      const on = sec.dataset.view === id;
      sec.classList.toggle('active', on);
    });
    document.querySelectorAll('.nav-link').forEach(a => {
      a.classList.toggle('active', a.dataset.view === id);
    });
    if (BA.app && BA.app.clearAyah) BA.app.clearAyah();   // drop previous view's highlight hook
    const view = BA.views && BA.views[id];
    const sec = document.querySelector(`#main .view[data-view="${id}"]`);
    if (view && sec) {
      try { view.mount(sec); }
      catch (e) { console.error('view mount failed:', id, e); sec.innerHTML = '<div class="card">' + t('nav.mountError') + '</div>'; }
    }
    closeMobile();
    window.scrollTo(0, 0);
  }

  function go(id) { location.hash = `#/${id}`; }

  function openMobile() { document.getElementById('sidebar').classList.add('open'); document.getElementById('scrim').classList.add('show'); }
  function closeMobile() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('scrim').classList.remove('show'); }

  BA.nav = { VIEWS, buildSidebar, route, go, currentId, openMobile, closeMobile };
})(window.BA = window.BA || {});
