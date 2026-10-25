/* João · language switch, learning mode and the little wave banner. */
(function () {
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const SITE = window.SITE = {
    lang: store.get('joao-lang') === 'pt' ? 'pt' : 'en',
    learn: store.get('joao-learn') === '1',
    t(en, pt) { return this.lang === 'pt' ? pt : en; }
  };
  const original = new WeakMap();
  const langBtn = document.getElementById('langBtn'), learnBtn = document.getElementById('learnBtn');

  function apply() {
    const pt = SITE.lang === 'pt';
    document.documentElement.lang = pt ? 'pt-BR' : 'en';
    document.querySelectorAll('[data-pt]').forEach(el => {
      if (!original.has(el)) original.set(el, el.innerHTML);
      el.innerHTML = pt ? el.getAttribute('data-pt') : original.get(el);
    });
    [['data-pt-aria', 'aria-label'], ['data-pt-title', 'title']].forEach(([src, attr]) => {
      document.querySelectorAll('[' + src + ']').forEach(el => {
        const key = '__' + attr;
        if (el[key] === undefined) el[key] = el.getAttribute(attr);
        el.setAttribute(attr, pt ? el.getAttribute(src) : el[key]);
      });
    });
    const learning = !pt && SITE.learn;
    document.body.classList.toggle('learning', learning);
    document.querySelectorAll('.lw').forEach(s => { if (learning) s.tabIndex = 0; else s.removeAttribute('tabindex'); });
    if (langBtn) { langBtn.textContent = pt ? 'View in English' : 'Ver em português'; langBtn.lang = pt ? 'en' : 'pt-BR'; }
    if (learnBtn) { learnBtn.hidden = pt; learnBtn.setAttribute('aria-pressed', String(SITE.learn)); }
    document.documentElement.classList.remove('pt-wait');
    document.dispatchEvent(new CustomEvent('langchange'));
  }
  SITE.apply = apply;
  if (langBtn) langBtn.addEventListener('click', () => { SITE.lang = SITE.lang === 'pt' ? 'en' : 'pt'; store.set('joao-lang', SITE.lang); apply(); });
  if (learnBtn) learnBtn.addEventListener('click', () => { SITE.learn = !SITE.learn; store.set('joao-learn', SITE.learn ? '1' : '0'); apply(); });
  // on touch screens a second tap on the same word closes its bubble
  document.addEventListener('click', e => { const w = e.target.closest && e.target.closest('.lw'); if (!w && document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('lw')) document.activeElement.blur(); });
  apply();

  /* ---------- wave banner on inner pages ---------- */
  const wave = document.querySelector('.wave canvas');
  if (!wave) return;
  const ctx = wave.getContext('2d', { alpha: false });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ramp = ['#dfe6f2', '#8fb2f0', '#4f80dc', '#2c58b4', '#1b3a82'];
  const SAND = ['#6e5e1b', '#9a8426', '#c4a838'];
  let W, H, cols, rows, cw = 10, ch = 16, visible = true;
  function hash(x, y) { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  function size() {
    const r = wave.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 3);
    W = r.width; H = r.height; wave.width = Math.round(W * dpr); wave.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cw = W < 600 ? 8 : 10; ch = Math.round(cw * 1.6);
    cols = Math.ceil(W / cw); rows = Math.ceil(H / ch);
    ctx.font = `500 ${Math.round(ch * .82)}px "Geist Mono", ui-monospace, monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  }
  function draw(t) {
    ctx.fillStyle = '#08090b'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < cols; i++) {
      const shore = 1.3 + .9 * Math.sin(i * .11 - t * .8) + .45 * Math.sin(i * .29 + t * 1.25);
      for (let j = 0; j < rows; j++) {
        const x = i * cw + cw / 2, y = j * ch + ch / 2, d = j - shore;
        let g, c;
        if (d < -.6) { const n = hash(i, j); if (n > .55) continue; g = n < .2 ? '"' : n < .4 ? "'" : ','; c = SAND[(n * 7 | 0) % 3]; }
        else if (d < .4) { g = Math.sin(i * .9 + t * 3 + j) > 0 ? '▒' : '░'; c = ramp[0]; }
        else { const ph = Math.sin(i * .34 - t * 2.2 + j * .85); g = ph > .35 ? '≈' : ph > -.45 ? '~' : '-'; c = ramp[Math.min(4, 1 + Math.floor(d))]; }
        ctx.fillStyle = c; ctx.fillText(g, x, y);
      }
    }
  }
  size();
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { size(); if (reduce) draw(1); }, 150); });
  new IntersectionObserver(e => { visible = e[0].isIntersecting; }).observe(wave);
  const t0 = performance.now();
  if (reduce) draw(1);
  else (function loop(now) { if (visible) draw((now - t0) / 1000); requestAnimationFrame(loop); })(t0);
})();
