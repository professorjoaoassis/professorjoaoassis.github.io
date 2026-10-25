/* Colégio São Benedito · grade picker and materials list */
(function () {
  const SB = window.SB, T = (en, pt) => window.SITE.t(en, pt);
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const parse = s => { if (!s) return null; const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const fmt = d => d.toLocaleDateString(window.SITE.lang === 'pt' ? 'pt-BR' : 'en-US', { day: 'numeric', month: 'short' });
  const daysFrom = d => Math.round((d - today) / 864e5);
  const forGrade = (m, g) => m.grade === 'all' || m.grade === g || (Array.isArray(m.grade) && m.grade.includes(g));
  const isNew = m => { const p = parse(m.posted); return p && daysFrom(p) > -7 && daysFrom(p) <= 0; };
  const ext = m => m.url ? 'LINK' : ((m.file || '').split('.').pop() || 'FILE').toUpperCase().slice(0, 4);
  const valid = id => SB.grades.some(g => g.id === id);

  const KINDS = [
    { id: 'project', en: 'Bimonthly project', pt: 'Trabalho bimestral', emptyEn: 'The bimonthly project will be posted here.', emptyPt: 'O trabalho bimestral vai ser publicado aqui.' },
    { id: 'guide', en: 'Study guides', pt: 'Guias de estudo', emptyEn: 'No study guides yet.', emptyPt: 'Ainda não há guias de estudo.' },
    { id: 'support', en: 'Support materials', pt: 'Materiais de apoio', emptyEn: 'No support materials yet.', emptyPt: 'Ainda não há materiais de apoio.' }
  ];
  const ICON_OPEN = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 3H3v10h10v-3M9 2h5v5M14 2 7.5 8.5"/></svg>';
  const ICON_DL = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M8 2v8m-3.5-3.5L8 10l3.5-3.5M3 13h10"/></svg>';

  let current = null;

  function dueInfo(m) {
    const d = parse(m.due); if (!d) return '';
    const n = daysFrom(d);
    let left, cls;
    if (n < 0) { left = T('Closed', 'Prazo encerrado'); cls = 'closed'; }
    else if (n === 0) { left = T('Due today', 'Entrega hoje'); cls = 'soon'; }
    else if (n === 1) { left = T('1 day left', 'Falta 1 dia'); cls = 'soon'; }
    else { left = T(`${n} days left`, `Faltam ${n} dias`); cls = n <= 3 ? 'soon' : 'ok'; }
    return `<p class="due ${cls}"><b>${T('Due', 'Entrega')} ${esc(fmt(d))}</b><span>${left}</span></p>`;
  }

  function item(m) {
    const href = m.url || m.file;
    const posted = parse(m.posted);
    const meta = [posted ? `${T('Posted', 'Publicado em')} ${fmt(posted)}` : '', ext(m)].filter(Boolean).join(' · ');
    const dl = m.url ? '' : `<a class="btn" href="${esc(href)}" download>${ICON_DL}${T('Download', 'Baixar')}</a>`;
    return `<article class="mat${m.kind === 'project' ? ' is-project' : ''}">
      <div class="ficon" aria-hidden="true"><span>${esc(ext(m))}</span></div>
      <div class="mbody">
        <h4>${esc(m.title)}${isNew(m) ? ` <em class="new">${T('new', 'novo')}</em>` : ''}</h4>
        ${m.desc ? `<p>${esc(m.desc)}</p>` : ''}
        <p class="meta">${esc(meta)}</p>
        ${m.kind === 'project' ? dueInfo(m) : ''}
      </div>
      <div class="mact"><a class="btn primary" href="${esc(href)}" target="_blank" rel="noopener">${ICON_OPEN}${T('Open', 'Abrir')}</a>${dl}</div>
    </article>`;
  }

  function renderPicker() {
    ['ef', 'em'].forEach(group => {
      $('g-' + group).innerHTML = SB.grades.filter(g => g.group === group).map(g => {
        const list = SB.materials.filter(m => forGrade(m, g.id));
        const fresh = list.some(isNew);
        return `<a class="grade${g.id === current ? ' on' : ''}" href="#${g.id}" aria-current="${g.id === current ? 'true' : 'false'}">
          <b>${esc(g.label)}</b><span>${list.length ? list.length + ' ' + T(list.length === 1 ? 'item' : 'items', list.length === 1 ? 'item' : 'itens') : '–'}</span>${fresh ? `<i class="dot" title="${T('New material', 'Material novo')}"></i>` : ''}
        </a>`;
      }).join('');
    });
  }

  function renderView() {
    const view = $('gradeView');
    if (!current) {
      view.innerHTML = `<div class="pick-first"><span aria-hidden="true">↑</span><p>${T('Pick your grade above to see your materials.', 'Escolha a sua série acima para ver os seus materiais.')}</p></div>`;
      return;
    }
    const g = SB.grades.find(x => x.id === current);
    const list = SB.materials.filter(m => forGrade(m, current))
      .sort((a, b) => (parse(b.posted) || 0) - (parse(a.posted) || 0));
    view.innerHTML = `
      <div class="gv-head">
        <div><p class="kicker">${esc(T(SB.term.en, SB.term.pt))}</p><h2>${esc(g.label)}</h2></div>
        <button type="button" class="btn" id="copyLink">${T('Copy link to this grade', 'Copiar link desta série')}</button>
      </div>
      ${KINDS.map(k => {
        const items = list.filter(m => m.kind === k.id);
        return `<section class="blk blk-${k.id}" aria-label="${esc(T(k.en, k.pt))}">
          <h3>${T(k.en, k.pt)}${items.length ? `<span>${items.length}</span>` : ''}</h3>
          ${items.length ? items.map(item).join('') : `<p class="empty">${T(k.emptyEn, k.emptyPt)}</p>`}
        </section>`;
      }).join('')}`;
    $('copyLink').addEventListener('click', copyLink);
  }

  function copyLink(e) {
    const btn = e.currentTarget, url = location.href.split('#')[0] + '#' + current;
    const done = () => { btn.textContent = T('Link copied!', 'Link copiado!'); setTimeout(() => { btn.textContent = T('Copy link to this grade', 'Copiar link desta série'); }, 1800); };
    const fallback = () => { window.prompt(T('Copy this link:', 'Copie este link:'), url); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, fallback);
    else fallback();
  }

  function fromHash() {
    const h = decodeURIComponent(location.hash.slice(1));
    if (valid(h)) { current = h; store.set('sb-grade', h); }
    else if (!current) { const s = store.get('sb-grade'); if (valid(s)) current = s; }
    render();
  }
  function render() {
    $('term').textContent = T(SB.term.en, SB.term.pt);
    renderPicker(); renderView();
  }
  addEventListener('hashchange', () => { fromHash(); const v = $('gradeView'); if (v && current) v.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); });
  document.addEventListener('langchange', render);
  fromHash();
})();
