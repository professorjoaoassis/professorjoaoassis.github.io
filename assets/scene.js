/* The beach: ASCII sea, a fishing dwarf and everything around him. */
(() => {
  const T = (en, pt) => (window.SITE && window.SITE.lang === 'pt') ? pt : en;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const snd = window.SFX || new Proxy({}, { get: () => () => {} });

  /* ---------- noise ---------- */
  function hash(x, y) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  const sm = t => t * t * (3 - 2 * t);
  function vn(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), u = sm(x - xi), v = sm(y - yi);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  const fbm = (x, y) => vn(x, y) * .55 + vn(x * 2.1 + 7, y * 2.1) * .3 + vn(x * 4.3, y * 4.3 + 3) * .15;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  /* ---------- colour ramps (pre-built so every cell can blend smoothly) ---------- */
  function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function ramp(stops, n) {
    const out = [];
    for (let s = 0; s < n; s++) {
      const p = s / (n - 1) * (stops.length - 1), i = Math.min(Math.floor(p), stops.length - 2), f = p - i;
      const a = hex(stops[i]), b = hex(stops[i + 1]);
      out.push(`rgb(${Math.round(a[0] + (b[0] - a[0]) * f)},${Math.round(a[1] + (b[1] - a[1]) * f)},${Math.round(a[2] + (b[2] - a[2]) * f)})`);
    }
    return out;
  }
  const N = 32;
  const WATER = ramp(['#dfe6f2', '#8fb2f0', '#4f80dc', '#2c58b4', '#1b3a82'], N);   // foam edge -> deep
  const WET   = ramp(['#c4c7cf', '#8b8e96', '#7d7458', '#a8912f'], N);              // fresh wet -> dry sand
  const SAND  = ramp(['#6e5e1b', '#9a8426', '#c4a838', '#d8bf55'], N);
  const ROCK  = ramp(['#26282d', '#3b3e44', '#5c5f66'], N);
  const HILITE = '#b9d0fa', MAGMA = '#ff6a2b', SPARK = '#f2d33b';
  const pick = (r, v) => r[clamp((v * (N - 1)) | 0, 0, N - 1)];

  /* ---------- canvas ---------- */
  const cv = document.getElementById('sea');
  const ctx = cv.getContext('2d', { alpha: false });
  let cols, rows, cw, ch, W, Hh, H, mat, grain, wet, wmask, edge, font;
  const mist = [];

  function setup() {
    const r = cv.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 3);
    W = r.width; Hh = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(Hh * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cw = W < 600 ? 8 : 10; ch = Math.round(cw * 1.6);
    cols = Math.ceil(W / cw); rows = Math.ceil(Hh / ch);
    const n = cols * rows;
    H = new Float32Array(n); mat = new Float32Array(n); grain = new Float32Array(n); wet = new Float32Array(n); wmask = new Uint8Array(n);
    edge = new Int16Array(rows);
    const eb = W < 600 ? .88 : .8;
    edge.fill(cols + 4);   // no border any more: the land runs to the right edge
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      H[k] = fbm(i * .055, j * .1) * .6 + (i / cols) * .62 + (1 - j / rows) * .42 - .3;
      mat[k] = fbm(i * .045 + 50, j * .09 + 50);
      grain[k] = hash(i * 3, j);
    }
    font = `500 ${Math.round(ch * .82)}px "Geist Mono", ui-monospace, monospace`;
    ctx.font = font; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    setupDwarf();
  }

  // smooth tide: slow breathing + a surge every 7.5 s that rises fast and drains slowly
  function tide(t) {
    const ph = (t % 7.5) / 7.5;
    const surge = ph < .16 ? sm(ph / .16) : Math.exp(-(ph - .16) * 3.6);
    return { L: .36 + .045 * Math.sin(t * .4) + .17 * surge, rising: ph > .02 && ph < .16 };
  }

  const SAND_G = ['"', "'", ',', '`', ';', '.', "'"];
  const ROCK_G = ['.', ':', '·', "'", '.', '·'];
  const GRASS_G = ['"', ',', "'", '"', '`', ';'];
  const FOREST = ramp(['#22432a', '#2f5e36', '#417a44', '#62a052'], N);
  const GREEN = ramp(['#2e5a2a', '#43803a', '#5fa548', '#9bd66a'], N);

  let wasRising = false;
  function frame(t, dt) {
    const { L, rising } = tide(t);
    if (rising && !wasRising && dt > 0) snd.wave();
    wasRising = rising;
    ctx.fillStyle = '#08090b';
    ctx.fillRect(0, 0, W, Hh);
    ctx.font = font;
    const dryK = Math.pow(.35, dt);          // wet sand dries over ~2 s, continuously
    for (let j = 0; j < rows; j++) {
      const ex = edge[j], cy = j * ch + ch / 2;
      for (let i = 0; i < cols; i++) {
        const k = j * cols + i, cx = i * cw + cw / 2;
        const lj = L + .04 * Math.sin(i * .2 - t * 1.6) + .018 * Math.sin(j * .45 + t * 2.1);
        const d = lj - H[k];
        let g, c;
        wmask[k] = d > .03 ? 1 : 0;
        if (d > 0) {
          wet[k] = 1;
          const depth = clamp(d / .38, 0, 1);
          const ph = Math.sin(i * .34 - t * 2.4 + j * .85);
          if (depth < .08) { g = vn(i * .6 + t * 1.5, j * .6) > .5 ? '▒' : '░'; }
          else g = ph > .35 ? '≈' : ph > -.45 ? '~' : '-';
          c = (depth > .12 && vn(i * .14 - t * .7, j * .38 + t * .2) > .7) ? HILITE : pick(WATER, depth);
        } else {
          wet[k] *= dryK;
          const w = wet[k];
          const veg = H[k] + Math.max(0, i / cols - .55) * 1.3;          // plants thicken toward the right edge
          if (mat[k] > .52 && veg < 1) { g = ROCK_G[(grain[k] * ROCK_G.length) | 0]; c = pick(ROCK, grain[k] * .9 + w * .3); }
          else if (veg > .74 || (veg > .69 && grain[k] < .3)) {
            const h = veg + (vn(i * .09, j * .15 + 20) - .5) * .14;     // ragged borders between plant zones
            const wind = vn(i * .12 - t * .9, j * .3 + t * .2);         // a slow gust rolling through the plants
            const gr = grain[k];
            if (h > 1.08) {                // thicket: low coastal trees
              g = gr < .55 ? '♣' : gr < .85 ? '♠' : '"';
              c = pick(FOREST, clamp(.25 + gr * .35 + wind * .45, 0, 1));
            } else if (h > .9) {           // restinga shrubs, with a few red pitanga berries
              if (gr < .035) { g = '•'; c = '#e0503f'; }
              else { g = gr < .45 ? '♣' : GRASS_G[(gr * GRASS_G.length) | 0]; c = pick(GREEN, clamp(.2 + gr * .3 + wind * .5, 0, 1)); }
            } else {                       // dune grass with creeping beach morning glory
              if (gr < .045) { g = '*'; c = gr < .022 ? '#c37be6' : '#e6a3f0'; }
              else if (gr < .2) { g = '~'; c = pick(GREEN, clamp(.25 + wind * .4, 0, 1)); }
              else { g = GRASS_G[(gr * GRASS_G.length) | 0]; c = pick(GREEN, clamp(.12 + gr * .35 + wind * .55, 0, 1)); }
            }
          }
          else {
            g = w > .45 ? '░' : SAND_G[(grain[k] * SAND_G.length) | 0];
            c = w > .02 ? pick(WET, 1 - w) : pick(SAND, .25 + grain[k] * .75);
          }
        }
        ctx.fillStyle = c; ctx.fillText(g, cx, cy);
      }
    }
    // mist: spawns where the surge hits the shore, drifts off-grid and fades out with real transparency
    if (rising && !reduce) {
      for (let n = 0; n < 3 && mist.length < 70; n++) {
        const i = (Math.random() * cols * .78) | 0, j = (Math.random() * rows) | 0, k = j * cols + i;
        const d = L - H[k];
        if (d > -.015 && d < .045) mist.push({ x: i * cw, y: j * ch, vx: 8 + Math.random() * 10, vy: -(6 + Math.random() * 8), life: 1, sz: 1 + Math.random() });
      }
    }
    ctx.fillStyle = '#dfe2e8';
    for (let m = mist.length - 1; m >= 0; m--) {
      const p = mist[m];
      p.life -= dt / 1.8; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.life <= 0) { mist.splice(m, 1); continue; }
      const a = Math.sin(p.life * Math.PI) * .55;           // eases in and out
      ctx.globalAlpha = a;
      ctx.fillText('▒', p.x, p.y);
      ctx.globalAlpha = a * .5;
      ctx.fillText('░', p.x - cw * p.sz, p.y); ctx.fillText('░', p.x + cw * p.sz, p.y);
      ctx.fillText('░', p.x, p.y - ch * .8);
    }
    ctx.globalAlpha = 1;
    dwarfStep(t, dt);
  }

  /* ---------- sprites ---------- */
  const SPR = [
    "....hhhh....",
    "...hghhhh...",
    "..HHHHHHHH..",
    "...sesssss..",
    "..nssssss...",
    "..bbbbbbbb..",
    ".bbbBbbbbbt.",
    ".bbbbbbbbtt.",
    "..bbBbbbttt.",
    "...bbbbtttt.",
    "..llklllll..",
    "..tttttttt..",
    "..pppp.ppp..",
    "..pp...pp...",
    ".ooo...ooo.."
  ];
  const SPR_R = SPR.slice(); SPR_R[3] = "..sssssses.."; SPR_R[4] = "...ssssssn..";   // looking right
  const PAL = { h:'#8f97a1', g:'#d4d9e0', H:'#5a6069', s:'#e8b088', e:'#14161a', n:'#cf8a60', b:'#e8813a', B:'#b4561c',
                t:'#3f7d4c', T:'#2b5a36', l:'#5a3a1e', k:'#f2d33b', p:'#4b3b2b', o:'#2a221e' };
  const PAL_SHUT = Object.assign({}, PAL, { e: PAL.s });
  const BOULDER = [
    "......mmmhhhh...........",
    "....hhmgggggghhhh.......",
    "..hhggggggggggggghhh....",
    ".hgggggcgggggggggggd....",
    "hggggggggggggggggggdd...",
    "hgggmgggggggggggggggddd.",
    "hggggggggggcggggggggddd.",
    "ggggggggggggcgggggggddd.",
    "gggggggggggggggggggdddd.",
    "gggggcggggggggggggddddd.",
    "gggggggggggggggggggdddd.",
    ".ggggggggggggggggggddd..",
    "..gggggggggggggggggdd..."
  ];
  const BOULDER_PAL = { h:'#b3b8bf', g:'#7f848c', d:'#53575e', m:'#4a8a3a', c:'#5f646c' };
  const BOULDER_WET = { h:'#7f8a98', g:'#5a6370', d:'#3a414b', m:'#3a6e31', c:'#454c56' };
  const RW = BOULDER[0].length, RH = BOULDER.length;
  let rockLevel = 0, sprayT = 0, lapT = 0;
  // smaller stones that sit around the boulder (dx in pixels from its left edge, dy from its base; negative dy = further back)
  const CLUSTER = [
    { dx: -3, dy: -3, spr: ["..hh..", ".hggd.", "hgmgdd", ".ggdd."] },
    { dx: 25, dy: -2, spr: [".hhg..", "hgggd.", "ggcddd", ".gddd."] },
    { dx: 29, dy: 0,  spr: [".hg.", "hggd", ".gd."] },
    { dx: -9, dy: 2,  spr: ["...hhhg...", ".hhggggd..", "hgggcgggd.", "hggmgggddd", "gggggggddd", ".ggggggdd."] },
    { dx: -13, dy: 1, spr: [".hg.", "hggd", ".gd."] },
    { dx: 18, dy: 2,  spr: ["..hhg....", ".hgggdd..", "hggggcdd.", "gmgggdddd", ".gggdddd."] },
    { dx: 7, dy: 3,   spr: [".hhg.", "hgggd", ".gdd."] },
    { dx: 13, dy: 4,  spr: ["hg", "gd"] }
  ];
  function makeRock(spr, x, bottom) { const w = spr[0].length; return { spr, x, bottom, w, h: spr.length, sub: new Float32Array(w), wet: new Float32Array(w), front: false }; }
  const BASKET = ["rrrrrrrr", "vwvwvwvw", "wvwvwvwv", "vwvwvwvw", ".wvwvwv."];
  const BASKET_PAL = { r:'#4a3017', w:'#a0703a', v:'#7a5227' };
  const LANTERN = [".k.", "kfk", "kfk", ".k.", ".p.", ".p.", ".p."];
  const BOB_PX = ["rr", "ww"], BOB_PAL = { r:'#e5483a', w:'#f4f4f4' };
  const MOON = ["..mmm..", ".mm....", "mm.....", "mm.....", "mm.....", ".mm....", "..mmm.."];
  const GULL = {
    stand: [".ww....", "yewwgg.", "..wwwgk", "..wwwg.", "...y.y."],
    up:    ["g.....g", ".g...g.", "..gwg..", "...y..."],
    down:  ["..gwg..", ".g...g.", "g.....g", "......."],
    pal:   { w:'#eef0f2', g:'#9aa1aa', k:'#1a1a1a', y:'#f2b33b', e:'#14161a' }
  };

  // every catch is an English word
  const WORDS = {
    fish:     { w:'fish', ipa:'/fɪʃ/', pt:'peixe', weight:30, peek:'#7fa6ee', px:["..ssss.t", "sesssstt", "..ssss.t"], pal:{ s:'#c9d6e6', e:'#14161a', t:'#7fa6ee' } },
    shell:    { w:'shell', ipa:'/ʃɛl/', pt:'concha', weight:12, peek:'#f2c6c2', px:[".pp.", "pqpq", "qpqp"], pal:{ p:'#f2c6c2', q:'#d9938c' } },
    crab:     { w:'crab', ipa:'/kræb/', pt:'caranguejo', weight:10, peek:'#e5483a', px:["c.....c", ".c.e.c.", ".ccccc.", "c.c.c.c"], pal:{ c:'#e5483a', e:'#14161a' } },
    starfish: { w:'starfish', ipa:'/ˈstɑːrfɪʃ/', pt:'estrela-do-mar', weight:9, peek:'#ff8a4c', px:["..o..", "ooooo", ".ooo.", "o...o"], pal:{ o:'#ff8a4c' } },
    boot:     { w:'boot', ipa:'/buːt/', pt:'bota', weight:9, peek:'#7a5532', say:'a boot?!', px:["oo..", "oo..", "oooo"], pal:{ o:'#7a5532' } },
    bottle:   { w:'bottle', ipa:'/ˈbɑːtəl/', pt:'garrafa', weight:8, peek:'#4f9a6a', px:[".k.", ".g.", "ggg", "gwg", "ggg"], pal:{ k:'#a0703a', g:'#4f9a6a', w:'#e9e6dc' } },
    coin:     { w:'coin', ipa:'/kɔɪn/', pt:'moeda', weight:8, peek:'#f2d33b', px:[".yy.", "yzzy", "yzzy", ".yy."], pal:{ y:'#f2d33b', z:'#c49a1a' } },
    key:      { w:'key', ipa:'/kiː/', pt:'chave', weight:6, peek:'#f2d33b', px:["yy....", "y.yyyy", "yy..y."], pal:{ y:'#f2d33b' } },
    anchor:   { w:'anchor', ipa:'/ˈæŋkər/', pt:'âncora', weight:4, peek:'#9aa1aa', px:["..m..", ".mmm.", "..m..", "m.m.m", ".mmm."], pal:{ m:'#9aa1aa' } },
    seaweed:  { w:'seaweed', ipa:'/ˈsiːwiːd/', pt:'alga marinha', weight:9, peek:'#4a8a3a', px:["g.g.", "gg.g", ".ggg", "g.gg", ".gg."], pal:{ g:'#4a8a3a' } },
    gem:      { w:'gem', ipa:'/dʒɛm/', pt:'pedra preciosa', weight:4, peek:'#4fd1c5', px:[".g.", "ggg", ".g."], pal:{ g:'#4fd1c5' } },
    chest:    { w:'treasure chest', ipa:'/ˈtrɛʒər tʃɛst/', pt:'baú do tesouro', weight:0, peek:'#f2d33b', big:true,
                px:["bbbbbbbb", "bkkkkkkb", "byyyyyyb", "bbbyybbb", "bkkkkkkb", "bbbbbbbb"], pal:{ b:'#7a4a22', k:'#4a2c12', y:'#f2d33b' } }
  };
  function pickWord() {
    const keys = Object.keys(WORDS).filter(k => WORDS[k].weight > 0);
    let r = Math.random() * keys.reduce((s, k) => s + WORDS[k].weight, 0);
    for (const k of keys) { r -= WORDS[k].weight; if (r <= 0) return k; }
    return 'fish';
  }

  const IDLE = -.8, RAISE = -.35, BACK = .95, FWD = -1.4, ROD = 24;
  const dw = { P: 3, rx: 0, rockTop: 0, fx: 0, fy: 0, ox: 0, oy: 0, a: IDLE, av: 0, bend: 0, state: 'idle', st: 0,
    bob: { x: 0, y: 0 }, target: { x: 0, y: 0 }, targets: [], from: null, near: null,
    hang: { x: 0, y: 0, vx: 0, vy: 0 }, item: null, itemPos: null, caught: [],
    nextNibble: 3, nibble: 0, nextTwitch: 5, nextRipple: 1.5, blinkAt: 2, blink: 0, clicked: false, trail: 0, basketBounce: 0,
    sleep: false, startle: 0, lastAct: 0, zT: 0, hooked: false, bigTry: false, big: false, thrash: 0 };
  const ripples = [], drops = [], pops = [], zs = [];
  const hit = document.getElementById('dwarfBtn'), basketBtn = document.getElementById('basketBtn');
  let pointer = { x: -9999, y: -9999, at: -99 };
  const nowT = () => (performance.now() - t0) / 1000;

  // the collection is kept in this browser
  let bag = {};
  try { bag = JSON.parse(localStorage.getItem('joao-catch') || '{}') || {}; } catch (e) { bag = {}; }
  function saveBag() { try { localStorage.setItem('joao-catch', JSON.stringify(bag)); } catch (e) {} }

  /* ---------- sky: follows the clock in Cuiabá ---------- */
  const sky = { mode: 'auto', n: 0, warm: 0, goal: { n: 0, warm: 0 }, clock: 0 };
  try { const m = localStorage.getItem('joao-sky'); if (m === 'day' || m === 'night' || m === 'auto') sky.mode = m; } catch (e) {}
  function cuiabaHour() {
    try {
      const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Cuiaba', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
      return (+p.find(x => x.type === 'hour').value % 24) + (+p.find(x => x.type === 'minute').value) / 60;
    } catch (e) { const d = new Date(); return d.getHours() + d.getMinutes() / 60; }
  }
  function skyTarget() {
    if (sky.mode === 'day') return { n: 0, warm: 0 };
    if (sky.mode === 'night') return { n: 1, warm: 0 };
    const h = cuiabaHour();
    const n = h >= 19 || h < 5 ? 1 : h >= 17 ? (h - 17) / 2 : h < 7 ? 1 - (h - 5) / 2 : 0;
    const warm = Math.max(0, 1 - Math.abs(h - 18) / 1.2, 1 - Math.abs(h - 6) / 1.2) * .8;
    return { n: clamp(n, 0, 1), warm: clamp(warm, 0, 1) };
  }
  const mix = (a, b, p) => `rgb(${Math.round(a[0] + (b[0] - a[0]) * p)},${Math.round(a[1] + (b[1] - a[1]) * p)},${Math.round(a[2] + (b[2] - a[2]) * p)})`;
  let moon = { x: 0, y: 0 }, nightStars = [], flies = [];

  /* ---------- placement ---------- */
  function setupDwarf() {
    const P = W < 600 ? 2 : W >= 1200 ? 4 : 3; dw.P = P;
    let best = null, bestScore = -1e9;
    const scan = (lo, hi, deep) => {
      for (let j = Math.floor(rows * .3); j <= Math.floor(rows * .62); j++) {
        for (let i = Math.floor(cols * .2); i < edge[j] - 10; i++) {
          const h = H[j * cols + i];
          if (h < lo || h > hi) continue;
          const tg = [];
          for (let di = 7; di <= 17; di++) for (let dj = -2; dj <= 3; dj++) {
            const ii = i - di, jj = j + dj;
            if (ii < 1 || jj < 0 || jj >= rows) continue;
            if (H[jj * cols + ii] < deep) tg.push({ x: ii * cw + cw / 2, y: jj * ch + ch * .55 });
          }
          if (tg.length < 4) continue;
          const score = tg.length - Math.abs(i / cols - .42) * 60 - Math.abs(j / rows - .45) * 30;
          if (score > bestScore) { bestScore = score; best = { i, j, tg }; }
        }
      }
    };
    scan(.48, .62, .2);                 // right at the tide line, so surges climb the boulder and drain away
    if (!best) scan(.42, .66, .26);
    if (!best) scan(.3, .7, .26);
    if (!best) { const i = Math.floor(cols * .45), j = Math.floor(rows * .45); best = { i, j, tg: [{ x: (i - 10) * cw, y: (j + 1) * ch }] }; }
    const gx = Math.round(best.i * cw + cw / 2), gy = Math.round(best.j * ch + ch);
    dw.rx = gx - 10 * P; dw.rockTop = gy + 3 * P - RH * P;      // the base sits below the sand line
    dw.ox = dw.rx + 3 * P; dw.oy = dw.rockTop + 3 * P - 15 * P;
    const rb = dw.rockTop + RH * P;
    dw.boulder = makeRock(BOULDER, dw.rx, rb);
    dw.cluster = CLUSTER.map(c => { const r = makeRock(c.spr, dw.rx + c.dx * P, rb + c.dy * P); r.front = c.dy > 0; return r; });
    Object.assign(pool, { cx: dw.rx + 8 * P, cy: rb + 8 * P, level: 0, fish: null, sub: false });
    crab.s = 'none';
    dw.fx = dw.ox + 6 * P; dw.fy = dw.oy + 15 * P;
    dw.targets = best.tg;
    dw.target = best.tg[(best.tg.length / 2) | 0];
    dw.bob = { x: dw.target.x, y: dw.target.y };
    dw.state = 'idle'; dw.st = 0; dw.a = IDLE; dw.av = 0; dw.item = null; dw.hooked = false; dw.bigTry = false; dw.big = false;
    const tip = rodTip(pivot(0), IDLE, 0);
    Object.assign(dw.hang, { x: tip.x, y: tip.y + 7 * P, vx: 0, vy: 0 });
    setupDecor(best.i, best.j);
    const bottom = dw.rockTop + RH * P;
    Object.assign(hit.style, { left: (dw.ox - P) + 'px', top: (dw.oy - 8 * P) + 'px', width: (12 * P) + 'px', height: (bottom - dw.oy + 8 * P) + 'px' });
    const bp = basketPos();
    Object.assign(basketBtn.style, { left: (bp.x - P) + 'px', top: (bp.y - 4 * P) + 'px', width: (10 * P) + 'px', height: (10 * P) + 'px' });
    // night sky bits
    const ex = edge[Math.min(2, rows - 1)];
    moon = { x: Math.round(W * .11 - 3.5 * P), y: Math.round(Math.max(14, Hh * .05)) };   // above the open water, so it has something to shine on
    nightStars = [];
    for (let j = 0; j < rows; j++) for (let i = edge[j] + 1; i < cols; i++) if (hash(i, j + 555) < .05) nightStars.push({ x: i * cw + cw / 2, y: j * ch + ch / 2, s: hash(i, j) });
  }

  function breathAt(t) { return Math.sin(t * (dw.sleep ? 1.1 : 2.1)) > .15 ? 1 : 0; }
  function headAt(t) { return Math.sin(t * (dw.sleep ? 1.1 : 2.1) - .7) > .15 ? 1 : 0; }
  function handLocal(t) {
    if (dw.state === 'reel') return { x: 1.5 + Math.cos(t * 18) * .9, y: 8.5 + Math.sin(t * 18) * .9 };
    if (dw.state === 'windup') return { x: 2.5, y: 7.5 };
    return { x: 1.5, y: 8.5 };
  }
  function lean() { return dw.state === 'stash' ? 1 : (dw.state === 'throw' || dw.state === 'yank') ? -1 : 0; }
  function hop() { return dw.startle > 0 ? -Math.round(Math.sin((1 - dw.startle / .4) * Math.PI) * 2) : 0; }
  function pivot(t) {
    const h = handLocal(t), P = dw.P;
    return { x: dw.ox + (Math.floor(h.x) + .5 + lean()) * P, y: dw.oy + (Math.floor(h.y) + .5 + breathAt(t) + hop()) * P };
  }
  function rodGeom(p, a, bend) {
    const L = ROD * dw.P, dx = Math.sin(a), dy = -Math.cos(a), px = Math.cos(a), py = Math.sin(a);
    const shorten = 1 - .14 * bend * bend;
    return {
      tip: { x: p.x + dx * L * shorten + px * bend * L * .34, y: p.y + dy * L * shorten + py * bend * L * .34 },
      c: { x: p.x + dx * L * .58 + px * bend * L * .1, y: p.y + dy * L * .58 + py * bend * L * .1 }
    };
  }
  function rodTip(p, a, bend) { return rodGeom(p, a, bend).tip; }
  const lerp = (a, b, p) => ({ x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p });
  const arc = (a, b, p, h) => ({ x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p - h * 4 * p * (1 - p) });
  function ripple(x, y, max, dur, alpha, base) { ripples.push({ x, y, max, dur, alpha, t: 0, base: base || 0 }); }
  function splash(x, y, n) {
    for (let i = 0; i < n; i++) drops.push({ x, y, vx: (Math.random() - .5) * 110, vy: -(50 + Math.random() * 90), life: .5 + Math.random() * .3 });
    ripple(x, y, 9 * dw.P, .9, .7); ripple(x, y, 5 * dw.P, .6, .5);
    snd.splash(n);
  }
  function setState(s) { const prev = dw.state; dw.state = s; dw.st = 0; snd.state(s, prev, dw.big || dw.bigTry); }
  function basketPos() { return { x: dw.rx + 14 * dw.P, y: dw.rockTop + 4 * dw.P - BASKET.length * dw.P }; }
  function basketMouth() { const b = basketPos(); return { x: b.x + 4 * dw.P, y: b.y }; }
  function pop(text, x, y, big) { pops.push({ x, y, text, life: big ? 1.8 : 1.3, big: !!big }); }
  function headPos() { return { x: dw.ox + 6 * dw.P, y: dw.oy + 3 * dw.P }; }

  /* ---------- interaction ---------- */
  function markActive() { dw.lastAct = nowT(); }
  function wake() { dw.sleep = false; dw.startle = .4; markActive(); snd.wake(); }
  function addToBag(key) {
    const first = !bag[key];
    bag[key] = (bag[key] || 0) + 1; saveBag();
    dw.caught.push(key);
    if (!panelWrap.hidden) renderPanel();
    return first;
  }
  function startFishing() {
    if (dw.state !== 'idle') return;
    dw.clicked = true;
    if (reduce) { addToBag(pickWord()); frame(1.15, 0); return; }
    if (dw.hooked) { dw.big = true; dw.hooked = false; }
    else if (Math.random() < .12) dw.bigTry = true;
    dw.from = { x: dw.bob.x, y: dw.bob.y };
    dw.near = lerp(dw.target, { x: dw.rx - 2 * dw.P, y: dw.rockTop + 8 * dw.P }, .5);
    setState('reel');
  }
  hit.addEventListener('click', () => {
    markActive(); scareGull();
    if (dw.sleep) { wake(); if (reduce) frame(1.15, 0); return; }
    startFishing();
  });
  const heroEl = cv.parentElement;
  heroEl.addEventListener('pointermove', e => {
    const r = cv.getBoundingClientRect();
    pointer = { x: e.clientX - r.left, y: e.clientY - r.top, at: nowT() };
    const hp = headPos(), d = Math.hypot(pointer.x - hp.x, pointer.y - hp.y);
    if (d < 280) markActive();
    if (dw.sleep && d < 140) wake();
  });
  heroEl.addEventListener('pointerleave', () => { pointer.at = -99; });

  /* ---------- rare events: only one at a time ---------- */
  const director = { active: null, last: null, wait: 12 + Math.random() * 8 };
  const EVENT_WEIGHTS = { gull: 2, thief: 2, crab: 3, bottle: 2, drizzle: 1 };
  function endEvent() { director.active = null; director.wait = 22 + Math.random() * 25; }
  function directorUpdate(dt) {
    if (reduce || director.active) return;
    director.wait -= dt;
    if (director.wait > 0) return;
    if (dw.state !== 'idle') { director.wait = 1.5; return; }
    const keys = Object.keys(EVENT_WEIGHTS).filter(k => k !== director.last);
    let r = Math.random() * keys.reduce((s, k) => s + EVENT_WEIGHTS[k], 0), pick = keys[0];
    for (const k of keys) { r -= EVENT_WEIGHTS[k]; if (r <= 0) { pick = k; break; } }
    let ok = true;
    if (pick === 'gull' || pick === 'thief') ok = gullArrive(pick === 'thief');
    else if (pick === 'crab') ok = crabStart();
    else if (pick === 'bottle') ok = bottleStart();
    else if (pick === 'drizzle') ok = rainStart();
    if (ok) { director.active = pick; director.last = pick; } else director.wait = 3;
  }

  /* ---------- seagull (visitor, or thief) ---------- */
  const gull = { s: 'away', t: 0, x: -99, y: -99, from: null, stay: 0, thief: false, carry: null };
  function gullPerch() {
    if (gull.thief && dw.cluster && dw.cluster[1]) { const r = dw.cluster[1]; return { x: r.x - dw.P, y: r.bottom - r.h * dw.P - 5 * dw.P }; }
    const b = basketPos(); return { x: b.x + dw.P, y: b.y - 5 * dw.P };
  }
  function gullArrive(thief) {
    if (W < 400) return false;
    Object.assign(gull, { s: 'in', t: 0, thief, carry: null, from: { x: W + 20, y: 10 + Math.random() * 30 } });
    setTimeout(() => snd.gull(false), 900);
    return true;
  }
  function gullLeave() { gull.from = { x: gull.x, y: gull.y }; gull.s = 'leave'; gull.t = 0; }
  function scareGull() { if (!gull.thief && (gull.s === 'perch' || gull.s === 'in')) { gullLeave(); snd.gull(false); } }
  function gullUpdate(dt) {
    gull.t += dt;
    if (gull.s === 'in') {
      const p = Math.min(gull.t / 2.6, 1), e = 1 - (1 - p) * (1 - p), to = gullPerch();
      const c = { x: (gull.from.x + to.x) / 2, y: Math.min(gull.from.y, to.y) - 40 }, iu = 1 - e;
      gull.x = iu * iu * gull.from.x + 2 * iu * e * c.x + e * e * to.x;
      gull.y = iu * iu * gull.from.y + 2 * iu * e * c.y + e * e * to.y;
      if (p >= 1) { gull.s = 'perch'; gull.t = 0; gull.stay = gull.thief ? 28 : 7 + Math.random() * 6; }
    } else if (gull.s === 'perch') {
      const to = gullPerch(); gull.x = to.x; gull.y = to.y;
      // the thief waits for a catch to be in the air, then dives for it
      if (gull.thief && dw.state === 'catch' && dw.item && dw.itemPos) { gull.s = 'swoop'; gull.t = 0; gull.from = { x: gull.x, y: gull.y }; snd.gull(true); }
      else if (gull.t > gull.stay) gullLeave();
    } else if (gull.s === 'swoop') {
      const p = Math.min(gull.t / .3, 1);
      if (!dw.item || !dw.itemPos) { gullLeave(); return; }
      const to = { x: dw.itemPos.x - 3 * dw.P, y: dw.itemPos.y - 4 * dw.P };
      const a = arc(gull.from, to, sm(p), -6 * dw.P);
      gull.x = a.x; gull.y = a.y;
      if (p >= 1) {
        gull.carry = dw.item; dw.item = null; dw.itemPos = null;
        const hp = headPos(); pop('hey!', hp.x, hp.y - 9 * dw.P, true);
        dw.startle = .4;
        gullLeave();
      }
    } else if (gull.s === 'leave') {
      const p = Math.min(gull.t / 2.2, 1), to = { x: -60, y: -40 };
      const c = { x: (gull.from.x + to.x) / 2, y: gull.from.y - 60 }, iu = 1 - p;
      gull.x = iu * iu * gull.from.x + 2 * iu * p * c.x + p * p * to.x;
      gull.y = iu * iu * gull.from.y + 2 * iu * p * c.y + p * p * to.y;
      if (p >= 1) { gull.s = 'away'; gull.carry = null; gull.thief = false; endEvent(); }
    }
  }
  function gullDraw(t) {
    if (gull.s === 'away') return;
    const P = dw.P, px = [];
    if (gull.s === 'perch') {
      const peck = !gull.thief && Math.sin(t * 1.7) > .85 ? 1 : 0;
      // the thief keeps its eye on the dwarf
      const face = gull.thief ? 1 : (Math.sin(gull.t * .6) > .7 ? -1 : 1);
      collect(px, GULL.stand, GULL.pal, 0, 0, P, r => r <= 1 ? peck : 0);
      ctx.save(); ctx.translate(Math.round(gull.x + (face < 0 ? 7 * P : 0)), Math.round(gull.y)); ctx.scale(face, 1);
      paint(px, P); ctx.restore();
    } else {
      if (gull.carry) { const it = WORDS[gull.carry], ip = []; collect(ip, it.px, it.pal, Math.round(gull.x + 2 * P), Math.round(gull.y + 3 * P), P); paint(ip, P); }
      const fr = Math.sin(t * (gull.s === 'swoop' ? 30 : 16)) > 0 ? GULL.up : GULL.down;
      collect(px, fr, GULL.pal, Math.round(gull.x), Math.round(gull.y), P);
      paint(px, P);
    }
  }

  /* ---------- crab: peeks out at low tide, runs from waves ---------- */
  const CRAB_A = ["c.....c", ".c.e.c.", ".ccccc.", "c.c.c.c"];
  const CRAB_B = ["c.....c", ".c.e.c.", ".ccccc.", ".c.c.c."];
  const CRAB_UP = ["cc...cc", ".c.e.c.", ".ccccc.", "c.c.c.c"];
  const CRAB_PAL = { c: '#e5483a', e: '#14161a' };
  const crab = { s: 'none', t: 0, x: 0, y: 0, home: null, out: null, pause: 0 };
  function crabStart() {
    if (!dw.cluster || tide(nowT()).rising) return false;
    // hides behind the stone on the land side and walks out onto the sand
    const r = dw.cluster[1], P = dw.P;
    crab.home = { x: r.x + P, y: r.bottom - 4 * P };
    crab.out = { x: r.x + r.w * P + 7 * P, y: r.bottom - 3 * P };
    Object.assign(crab, { s: 'out', t: 0, x: crab.home.x, y: crab.home.y, pause: 2.5 + Math.random() * 2 });
    snd.skitter(1.6);
    return true;
  }
  function crabUpdate(dt, t) {
    if (crab.s === 'none') return;
    crab.t += dt;
    const wave = tide(t).rising;
    if (crab.s === 'out') {
      const p = Math.min(crab.t / 1.8, 1), q = lerp(crab.home, crab.out, sm(p));
      crab.x = q.x; crab.y = q.y;
      if (wave) { crab.s = 'back'; crab.t = 0; crab.from = { x: crab.x, y: crab.y }; snd.skitter(.4); }
      else if (p >= 1) { crab.s = 'pause'; crab.t = 0; }
    } else if (crab.s === 'pause') {
      if (wave || crab.t > crab.pause) { crab.s = 'back'; crab.t = 0; crab.from = { x: crab.x, y: crab.y }; snd.skitter(.4); }
    } else if (crab.s === 'back') {
      const p = Math.min(crab.t / .45, 1), q = lerp(crab.from, crab.home, sm(p));
      crab.x = q.x; crab.y = q.y;
      if (p >= 1) { crab.s = 'none'; endEvent(); }
    }
  }
  function crabDraw(t) {
    if (crab.s === 'none') return;
    const walking = crab.s !== 'pause';
    const fr = crab.s === 'pause' ? (Math.sin(t * 5) > .6 ? CRAB_UP : CRAB_A) : (Math.sin(t * (crab.s === 'back' ? 40 : 22)) > 0 ? CRAB_A : CRAB_B);
    const px = []; collect(px, fr, CRAB_PAL, Math.round(crab.x), Math.round(crab.y + (walking ? 0 : 0)), dw.P); paint(px, dw.P);
  }

  /* ---------- tide pool between the rocks ---------- */
  const pool = { cx: 0, cy: 0, w: 13, h: 4, level: 0, sub: false, fish: null };
  function poolUpdate(dt, t) {
    const i = clamp(Math.floor(pool.cx / cw), 0, cols - 1), j = clamp(Math.floor(pool.cy / ch), 0, rows - 1);
    const submerged = !!wmask[j * cols + i];
    if (submerged) { pool.level = 1; if (pool.fish) pool.fish = null; }
    else {
      if (pool.sub && Math.random() < .3) pool.fish = { ph: Math.random() * 6 };   // the wave left someone behind
      pool.level = Math.max(0, pool.level - dt * .055);
      if (pool.fish && pool.level < .12) { splash(pool.cx, pool.cy, 4); pool.fish = null; }
    }
    pool.sub = submerged;
  }
  function poolDraw(t) {
    if (pool.sub) return;
    const P = dw.P, hw = pool.w / 2, hh = pool.h / 2, ox = Math.round(pool.cx - hw * P), oy = Math.round(pool.cy - hh * P);
    const rowsN = pool.h + 2, filled = pool.level * (pool.h - .3);
    for (let r = -1; r <= pool.h; r++) for (let c = -1; c <= pool.w; c++) {
      const nx = (c + .5 - hw) / (hw + 1), ny = (r + .5 - hh) / (hh + 1), d = nx * nx + ny * ny;
      if (d > 1) continue;
      const rim = d > .55;
      let col;
      if (rim) col = (r + c) % 3 ? '#4a4f57' : '#5d636c';
      else if (pool.h - r - .5 < filled) {
        const sh = vn(c * .7 + t * 1.2, r * .9 + t * .4);
        col = sh > .72 ? '#8fb2f0' : sh > .45 ? '#3f6cc8' : '#2c58b4';
      } else col = '#3a3d44';
      ctx.fillStyle = col; ctx.fillRect(ox + c * P, oy + r * P, P, P);
    }
    if (pool.fish && pool.level > .12) {
      const fx = Math.round(pool.cx + Math.sin(t * 1.3 + pool.fish.ph) * (hw - 3) * P), fy = Math.round(pool.cy);
      const dir = Math.cos(t * 1.3 + pool.fish.ph) > 0 ? 1 : -1;
      ctx.fillStyle = '#c9d6e6'; ctx.fillRect(fx, fy, 2 * P, P);
      ctx.fillStyle = '#7fa6ee'; ctx.fillRect(fx + (dir > 0 ? -P : 2 * P), fy, P, P);
    }
  }

  /* ---------- foam bubbles that linger and pop ---------- */
  const bubbles = [];
  function bubblesDraw(dt) {
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      b.life -= dt; b.x += b.vx * dt;
      if (b.life <= 0) { bubbles.splice(i, 1); continue; }
      const a = Math.min(1, b.life / .4) * .8;
      ctx.globalAlpha = a; ctx.fillStyle = '#e6edf7';
      const s = Math.max(1, Math.round(dw.P / 2));
      if (b.life < .12) ctx.fillRect(Math.round(b.x) - s, Math.round(b.y), s * 3, 1);   // pop
      else ctx.fillRect(Math.round(b.x), Math.round(b.y), s, s);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- message in a bottle ---------- */
  const NOTES = [
    { en: "Hi! If you found this bottle, you're a real explorer. Keep exploring, and keep learning.", pt: "Oi! Se você achou esta garrafa, você é um explorador de verdade. Continue explorando e aprendendo." },
    { en: "Secret word: lighthouse /ˈlaɪtˌhaʊs/.", pt: "Palavra secreta: lighthouse, que quer dizer farol." },
    { en: "Tip: click the basket to see every word the dwarf has caught.", pt: "Dica: clique no cesto para ver todas as palavras que o anão pescou." },
    { en: "Mistakes are just practice in disguise.", pt: "Erros são só treino disfarçado." }
  ];
  const BOTTLE_PX = [".gggg..", "gwgggkk", ".gggg.."], BOTTLE_PAL = { g: '#4f9a6a', w: '#e9e6dc', k: '#a0703a' };
  const bottle = { s: 'none', t: 0, x: 0, y: 0, from: null, to: null };
  const bottleBtn = document.getElementById('bottleBtn');
  function bottleStart() {
    // find a strip of beach the tide reaches, not too close to the dwarf
    const di = dw.fx / cw, dj = dw.fy / ch;
    let best = null, bestD = 1e9;
    for (let j = Math.floor(rows * .35); j < rows - 2; j++) for (let i = 2; i < edge[j] - 4; i++) {
      const h = H[j * cols + i];
      if (h < .42 || h > .55) continue;
      const d = Math.hypot(i - di, (j - dj) * 1.6);
      if (d < 9 || d > 40) continue;
      if (d < bestD) { bestD = d; best = { i, j }; }
    }
    if (!best) return false;
    const to = { x: best.i * cw, y: best.j * ch + ch * .4 };
    Object.assign(bottle, { s: 'drift', t: 0, to, from: { x: -30, y: to.y + 8 }, x: -30, y: to.y + 8 });
    bottleBtn.hidden = false;
    return true;
  }
  function bottleUpdate(dt, t) {
    if (bottle.s === 'none') return;
    bottle.t += dt;
    if (bottle.s === 'drift') {
      const p = Math.min(bottle.t / 9, 1), e = 1 - Math.pow(1 - p, 2);
      bottle.x = bottle.from.x + (bottle.to.x - bottle.from.x) * e;
      bottle.y = bottle.from.y + (bottle.to.y - bottle.from.y) * e + Math.sin(t * 2.4) * 2;
      if (p >= 1) { bottle.s = 'ashore'; bottle.t = 0; ripple(bottle.x + 3 * dw.P, bottle.y + dw.P, 5 * dw.P, .8, .4); snd.glint(); }
    } else if (bottle.s === 'ashore') {
      bottle.x = bottle.to.x; bottle.y = bottle.to.y;
      if (bottle.t > 45) { bottle.s = 'away'; bottle.t = 0; bottle.from = { x: bottle.x, y: bottle.y }; }
    } else if (bottle.s === 'away') {
      const p = Math.min(bottle.t / 3, 1);
      bottle.x = bottle.from.x - p * 60; bottle.y = bottle.from.y + Math.sin(t * 2.4) * 2;
      if (p >= 1) bottleDone();
    }
    const P = dw.P;
    Object.assign(bottleBtn.style, { left: Math.round(bottle.x - 3 * P) + 'px', top: Math.round(bottle.y - 4 * P) + 'px', width: (13 * P) + 'px', height: (10 * P) + 'px' });
  }
  function bottleDone() { bottle.s = 'none'; bottleBtn.hidden = true; endEvent(); }
  function bottleDraw(t) {
    if (bottle.s === 'none') return;
    const P = dw.P, px = [];
    collect(px, BOTTLE_PX, BOTTLE_PAL, Math.round(bottle.x), Math.round(bottle.y), P); paint(px, P);
    // a glint every so often, so people notice it
    const g = (t * .7) % 1;
    if (g < .12) { ctx.globalAlpha = 1 - g / .12; ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(bottle.x + 2 * P), Math.round(bottle.y - 2 * P), P, P); ctx.fillRect(Math.round(bottle.x + P), Math.round(bottle.y - P * 1.5), 3 * P, P / 2 | 1); ctx.globalAlpha = 1; }
  }
  const noteWrap = document.getElementById('noteWrap');
  let noteIdx = 0;
  try { noteIdx = +(localStorage.getItem('joao-note') || 0) || 0; } catch (e) {}
  bottleBtn.addEventListener('click', () => {
    if (bottle.s === 'none') return;
    markActive();
    const n = NOTES[noteIdx % NOTES.length];
    noteIdx++; try { localStorage.setItem('joao-note', String(noteIdx)); } catch (e) {}
    document.getElementById('noteEn').textContent = n.en;
    document.getElementById('notePt').textContent = n.pt;
    noteWrap.hidden = false; document.getElementById('noteClose').focus(); snd.paper();
    bottleDone();
  });
  function closeNote() { noteWrap.hidden = true; }
  document.getElementById('noteClose').addEventListener('click', closeNote);
  noteWrap.addEventListener('click', e => { if (e.target === noteWrap) closeNote(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !noteWrap.hidden) closeNote(); });

  /* ---------- light drizzle ---------- */
  const rain = { on: false, t: 0, dur: 0, k: 0, drops: [] };
  function rainStart() {
    Object.assign(rain, { on: true, t: 0, dur: 25 + Math.random() * 15 });
    pop('rain /reɪn/ · chuva', W * .5, 34, false);
    return true;
  }
  function rainUpdate(dt) {
    if (rain.on) {
      rain.t += dt;
      rain.k = rain.t < 3 ? rain.t / 3 : rain.t > rain.dur - 3 ? Math.max(0, (rain.dur - rain.t) / 3) : 1;
      if (rain.t >= rain.dur) { rain.on = false; rain.k = 0; rain.drops.length = 0; endEvent(); }
    }
    if (rain.k <= 0) return;
    const want = Math.round(90 * rain.k * Math.min(1.5, W / 1280));
    while (rain.drops.length < want) rain.drops.push({ x: Math.random() * W * 1.1, y: Math.random() * Hh, v: 260 + Math.random() * 120 });
    if (rain.drops.length > want) rain.drops.length = want;
    for (const d of rain.drops) {
      d.y += d.v * dt; d.x -= d.v * .12 * dt;
      if (d.y > Hh) { d.y = -10; d.x = Math.random() * W * 1.1; }
    }
    // rings where drops hit the water
    if (Math.random() < rain.k * .7) {
      const i = (Math.random() * cols) | 0, j = (Math.random() * rows) | 0;
      if (wmask[j * cols + i]) ripple(i * cw + cw / 2, j * ch + ch / 2, 3 * dw.P, .6, .35);
    }
  }
  function rainDraw() {
    if (rain.k <= 0) return;
    ctx.strokeStyle = '#b8cdee'; ctx.lineWidth = 1; ctx.globalAlpha = .32 * rain.k;
    ctx.beginPath();
    for (const d of rain.drops) { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + 1.2, d.y - 9); }
    ctx.stroke(); ctx.globalAlpha = 1;
  }

  /* ---------- the dwarf's behaviour ---------- */
  function dwarfUpdate(t, dt) {
    const P = dw.P;
    dw.st += dt;
    let tgt = IDLE + Math.sin(t * 1.3) * .025, K = 28, Dm = 6, forced = null;
    switch (dw.state) {
      case 'idle':
        if (dw.hooked) {
          // something big is on the line and fighting
          forced = -.5 - .18 * Math.sin(t * 13);
          dw.thrash -= dt;
          if (dw.thrash <= 0) { ripple(dw.bob.x, dw.bob.y, 7 * P, .6, .6); for (let i = 0; i < 3; i++) drops.push({ x: dw.bob.x, y: dw.bob.y, vx: (Math.random() - .5) * 70, vy: -(30 + Math.random() * 50), life: .4 }); dw.thrash = .28; snd.strain(); }
          break;
        }
        if (!dw.sleep && !reduce && t - dw.lastAct > 25) dw.sleep = true;
        if (dw.sleep) {
          tgt = IDLE - .3; K = 10;
          dw.zT -= dt;
          if (dw.zT <= 0) { const hp = headPos(); zs.push({ x: hp.x + 3 * P, y: hp.y - 3 * P, life: 2.6, ph: Math.random() * 6 }); dw.zT = 1.3; if (zs.length % 2) snd.snore(); }
          break;
        }
        dw.nextNibble -= dt; dw.nextTwitch -= dt; dw.nextRipple -= dt;
        if (dw.nibble > 0) dw.nibble -= dt;
        if (dw.nextNibble <= 0) { dw.nibble = .45; dw.av -= .5; snd.nibble(); ripple(dw.bob.x, dw.bob.y, 6 * P, .8, .55); dw.nextNibble = 4 + Math.random() * 6; }
        if (dw.nextTwitch <= 0) { dw.av += .45; dw.nextTwitch = 5 + Math.random() * 6; }
        if (dw.nextRipple <= 0) { ripple(dw.bob.x, dw.bob.y, 5 * P, 1.4, .25); dw.nextRipple = 2.2 + Math.random() * 1.5; }
        break;
      case 'reel': {
        const dur = dw.big ? 1.9 : 1.2, p = Math.min(dw.st / dur, 1);
        tgt = RAISE; K = 40;
        forced = dw.big ? -1.05 - .2 * Math.sin(dw.st * 25) : -.7 - .16 * Math.sin(dw.st * 21) * Math.sin(dw.st * 7);
        const b = lerp(dw.from, dw.near, sm(p));
        dw.bob = { x: b.x, y: b.y + Math.sin(dw.st * 20) * P * (dw.big ? 1.2 : .5) };
        dw.trail -= dt;
        if (dw.trail <= 0) { ripple(dw.bob.x, dw.bob.y, (dw.big ? 7 : 4) * P, .6, .45); dw.trail = dw.big ? .09 : .13; }
        if (dw.bigTry && p >= .5) {
          // too heavy: the line is dragged back out
          dw.bigTry = false; dw.hooked = true;
          dw.from = { x: dw.bob.x, y: dw.bob.y };
          const hp = headPos(); pop('too heavy!', hp.x, hp.y - 9 * P);
          setState('yank');
          break;
        }
        if (p >= 1) {
          dw.item = dw.big ? 'chest' : pickWord();
          dw.from = { x: dw.bob.x, y: dw.bob.y }; dw.itemPos = { ...dw.from };
          splash(dw.bob.x, dw.bob.y, dw.big ? 18 : 8);
          setState('catch');
        }
        break;
      }
      case 'yank': {
        const p = Math.min(dw.st / .45, 1);
        tgt = IDLE - .2; K = 60;
        forced = -1.0 * (1 - p * .5);
        dw.bob = arc(dw.from, dw.target, sm(p), 6 * P);
        if (p >= 1) { dw.bob = { ...dw.target }; splash(dw.target.x, dw.target.y, 14); setState('idle'); }
        break;
      }
      case 'catch': {
        if (!dw.item) { setState('windup'); break; }      // a gull got it
        const p = Math.min(dw.st / .45, 1);
        tgt = -.15; K = 50;
        forced = (dw.big ? -.9 : -.6) * (1 - sm(p));
        const hand = pivot(t);
        dw.itemPos = arc(dw.from, { x: hand.x - 2 * P, y: hand.y - 2 * P }, sm(p), 16 * P);
        if (p >= 1) { dw.from = { ...dw.itemPos }; setState('stash'); }
        break;
      }
      case 'stash': {
        if (!dw.item) { setState('windup'); break; }
        const p = Math.min(dw.st / .5, 1);
        tgt = -.3; K = 40;
        dw.itemPos = arc(dw.from, basketMouth(), sm(p), 10 * P);
        if (p >= 1) {
          const key = dw.item, w = WORDS[key], first = addToBag(key), bm = basketMouth();
          pop((first ? 'new! ' : '') + (w.say || w.w + (w.big ? '!!' : '!')), bm.x, bm.y - 4 * P, w.big);
          snd.got(first, w.big);
          dw.item = null; dw.big = false; dw.basketBounce = .25;
          setState('windup');
        }
        break;
      }
      case 'windup':
        tgt = BACK; K = 38; Dm = 9;
        forced = -.25 * sm(Math.min(dw.st / .5, 1));
        if (dw.st > .5) setState('throw');
        break;
      case 'throw':
        tgt = FWD; K = 300; Dm = 10;
        forced = 1.05 * sm(Math.min(dw.st / .07, 1));
        if (dw.st > .15) {
          dw.from = { x: dw.hang.x, y: dw.hang.y };
          dw.target = dw.targets[(Math.random() * dw.targets.length) | 0];
          setState('fly');
        }
        break;
      case 'fly': {
        const p = Math.min(dw.st / .8, 1);
        tgt = IDLE; K = 70; Dm = 6;
        forced = 1.05 * Math.exp(-dw.st * 4.5) * Math.cos(dw.st * 22);
        dw.bob = arc(dw.from, dw.target, p, 28 * P);
        if (p >= 1) { dw.bob = { ...dw.target }; splash(dw.target.x, dw.target.y, 12); dw.nextRipple = 1.5; markActive(); setState('idle'); }
        break;
      }
    }
    dw.av += ((tgt - dw.a) * K - dw.av * Dm) * dt;
    dw.a += dw.av * dt;
    const goal = forced !== null ? forced : clamp(-dw.av * .07, -.6, .6);
    dw.bend += (goal - dw.bend) * Math.min(1, dt * 28);
    const tip = rodTip(pivot(t), dw.a, dw.bend);
    const hx = tip.x, hy = tip.y + 7 * P, h = dw.hang;
    h.vx += ((hx - h.x) * 90 - h.vx * 8) * dt; h.vy += ((hy - h.y) * 90 - h.vy * 8) * dt;
    h.x += h.vx * dt; h.y += h.vy * dt;
    dw.blinkAt -= dt; if (dw.blink > 0) dw.blink -= dt;
    if (dw.blinkAt <= 0) { dw.blink = .13; dw.blinkAt = 2.5 + Math.random() * 3.5; }
    if (dw.basketBounce > 0) dw.basketBounce -= dt;
    if (dw.startle > 0) dw.startle -= dt;
  }

  /* ---------- drawing helpers ---------- */
  function collect(out, rowsA, pal, ox, oy, P, rowOff, colOff) {
    for (let r = 0; r < rowsA.length; r++) {
      const row = rowsA[r], dy = rowOff ? rowOff(r) : 0, dx = colOff ? colOff(r) : 0;
      for (let c = 0; c < row.length; c++) {
        const k = row[c]; if (k === '.' || k === ' ') continue;
        out.push(Math.round(ox + (c + dx) * P), Math.round(oy + (r + dy) * P), pal[k]);
      }
    }
  }
  function paint(px, P) {
    ctx.fillStyle = '#08090b';
    for (let n = 0; n < px.length; n += 3) { ctx.fillRect(px[n] - P, px[n + 1], P * 3, P); ctx.fillRect(px[n], px[n + 1] - P, P, P * 3); }
    for (let n = 0; n < px.length; n += 3) { ctx.fillStyle = px[n + 2]; ctx.fillRect(px[n], px[n + 1], P, P); }
  }
  function drawLine(a, b, sag) {
    ctx.strokeStyle = 'rgba(226,232,242,.55)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + sag, b.x, b.y);
    ctx.stroke();
  }
  function lookDir(t) {
    if (dw.state === 'stash') return 'right';
    if (dw.state !== 'idle' || dw.sleep || dw.hooked) return 'left';
    if (t - pointer.at > 3) return 'left';
    const hp = headPos();
    if (Math.hypot(pointer.x - hp.x, pointer.y - hp.y) > 280) return 'left';
    return pointer.x > hp.x + 2 * dw.P ? 'right' : 'left';
  }

  function dwarfDraw(t) {
    const P = dw.P, br = breathAt(t), hd = headAt(t) + (dw.sleep ? 1 : 0), ln = lean(), hp0 = hop();
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i], p = r.t / r.dur;
      if (p >= 1) { ripples.splice(i, 1); continue; }
      const rad = r.max * (1 - (1 - p) * (1 - p));
      ctx.strokeStyle = `rgba(223,230,242,${(1 - p) * r.alpha})`; ctx.lineWidth = 1;
      const rx = r.base + rad;
      ctx.beginPath(); ctx.ellipse(r.x, r.y, Math.max(rx, .5), Math.max(r.base ? rx * .16 + P : rad * .35, .5), 0, 0, Math.PI * 2); ctx.stroke();
    }
    drawBoulder(t);
    // basket, with the latest catches peeking out
    const bb = dw.basketBounce > 0 ? -1 : 0;
    const bpos = basketPos(), bx = bpos.x, by = bpos.y + bb * P;
    const bpx = [];
    dw.caught.slice(-3).forEach((it, n) => { bpx.push(bx + (1 + n * 2) * P, by - P, WORDS[it].peek); bpx.push(bx + (2 + n * 2) * P, by - P, WORDS[it].peek); });
    collect(bpx, BASKET, BASKET_PAL, bx, by, P);
    paint(bpx, P);
    // body: legs planted, torso breathes, head follows a beat later
    const body = [];
    const rowsA = lookDir(t) === 'right' ? SPR_R : SPR;
    const shut = dw.blink > 0 || dw.sleep;
    collect(body, rowsA, shut ? PAL_SHUT : PAL, dw.ox, dw.oy + hp0 * P, P,
      r => r <= 4 ? hd : r <= 11 ? br : 0,
      r => r <= 11 ? ln : 0);
    const hl = handLocal(t), hx = Math.floor(hl.x), hy = Math.floor(hl.y), sx = 3, sy = 7;
    for (let s = 0; s < 3; s++) {
      const ax = Math.round(sx + (hx - sx) * s / 3), ay = Math.round(sy + (hy - sy) * s / 3);
      body.push(Math.round(dw.ox + (ax + ln) * P), Math.round(dw.oy + (ay + br + hp0) * P), PAL.T);
    }
    body.push(Math.round(dw.ox + (hx + ln) * P), Math.round(dw.oy + (hy + br + hp0) * P), PAL.s);
    paint(body, P);
    // rod
    const pv = pivot(t), g = rodGeom(pv, dw.a, dw.bend);
    const L = ROD * P, steps = Math.ceil(L / P * 1.4);
    for (let s = 0; s <= steps; s++) {
      const u = s / steps, iu = 1 - u;
      const x = iu * iu * pv.x + 2 * iu * u * g.c.x + u * u * g.tip.x;
      const y = iu * iu * pv.y + 2 * iu * u * g.c.y + u * u * g.tip.y;
      ctx.fillStyle = u < .7 ? '#7a4f26' : '#c4955a';
      ctx.fillRect(Math.round((x - dw.ox) / P) * P + dw.ox - P / 2, Math.round((y - dw.oy) / P) * P + dw.oy - P / 2, P, P);
    }
    // line + float / catch
    const st = dw.state;
    let end, sag;
    if (st === 'idle' || st === 'reel' || st === 'fly' || st === 'yank') {
      let dip = 0;
      if (st === 'idle' && dw.hooked) dip = Math.sin(t * 17) * 1.5 * P;
      else if (st === 'idle') dip = Math.sin(t * 2.6) * .6 * P + (dw.nibble > 0 ? Math.sin((1 - dw.nibble / .45) * Math.PI) * 2.5 * P : 0);
      end = { x: dw.bob.x + (dw.hooked && st === 'idle' ? Math.sin(t * 23) * P : 0), y: dw.bob.y + dip };
      sag = st === 'idle' ? (dw.hooked ? P : 6 * P) : st === 'fly' ? 3 * P : P;
    } else if (st === 'catch') { end = dw.itemPos; sag = 0; }
    else { end = { x: dw.hang.x, y: dw.hang.y }; sag = P; }
    drawLine(g.tip, end, sag);
    if (st !== 'catch') { const b = []; collect(b, BOB_PX, BOB_PAL, end.x - P, end.y - 2 * P, P); paint(b, P); }
    if (dw.item && dw.itemPos) {
      const it = WORDS[dw.item], w = it.px[0].length;
      const wig = Math.sin(t * 40) > 0 ? 1 : 0;
      const ip = []; collect(ip, it.px, it.pal, dw.itemPos.x - w * P / 2 + wig * P, dw.itemPos.y - P, P); paint(ip, P);
    }
    // splash droplets
    ctx.fillStyle = '#dfe6f2';
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      if (d.life <= 0) { drops.splice(i, 1); continue; }
      ctx.globalAlpha = clamp(d.life * 2, 0, 1);
      ctx.fillRect(Math.round(d.x), Math.round(d.y), P, P);
    }
    ctx.globalAlpha = 1;
  }

  // every stone reads the water level per column, so the tide climbs and drains around it
  function rockWater(r, t, L, dtc) {
    const P = dw.P; let avg = 0;
    const j = clamp(Math.floor((r.bottom - 1) / ch), 0, rows - 1), cap = Math.min(4, r.h * .7);
    for (let c = 0; c < r.w; c++) {
      const i = clamp(Math.floor((r.x + (c + .5) * P) / cw), 0, cols - 1);
      const lj = L + .04 * Math.sin(i * .2 - t * 1.6) + .018 * Math.sin(j * .45 + t * 2.1);
      const goal = clamp((lj - H[j * cols + i]) * 20, 0, cap);
      r.sub[c] += (goal - r.sub[c]) * Math.min(1, dtc * 10 || 1);
      r.wet[c] = Math.max(r.sub[c] + 1.4, r.wet[c] - dtc * .45);   // wet band slowly dries
      avg += r.sub[c];
    }
    return avg / r.w;
  }
  function rockPaint(r, t, avg) {
    const P = dw.P, top = r.bottom - r.h * P, half = r.w * P / 2;
    if (avg < .6) {
      ctx.fillStyle = `rgba(0,0,0,${.3 * (1 - avg / .6)})`;
      ctx.beginPath(); ctx.ellipse(r.x + half, r.bottom - P, half + P, Math.max(1.2 * P, r.h * .18 * P), 0, 0, Math.PI * 2); ctx.fill();
    }
    const above = [], under = [];
    for (let row = 0; row < r.h; row++) {
      const line = r.spr[row];
      for (let c = 0; c < r.w; c++) {
        const k = line[c]; if (k === '.') continue;
        const x = r.x + c * P, y = top + row * P, fromBottom = r.h - row - .5;
        if (fromBottom < r.sub[c]) under.push(x, y);
        else above.push(x, y, (fromBottom < r.wet[c] ? BOULDER_WET : BOULDER_PAL)[k]);
      }
    }
    ctx.fillStyle = 'rgba(70,110,180,.28)';
    for (let n = 0; n < under.length; n += 2) ctx.fillRect(under[n], under[n + 1], P, P);
    paint(above, P);
    if (avg > .1) {
      const spill = r.w > 8 ? 3 : 1;
      for (let c = -spill; c < r.w + spill; c++) {
        const cc = clamp(c, 0, r.w - 1), sub = r.sub[cc];
        if (sub < .1) continue;
        const outside = c < 0 || c >= r.w;
        const n = vn((r.x / P + c) * .55 + t * 3.2, t * 1.3 + r.bottom * .01);
        if (n < (outside ? .55 : .42)) continue;
        ctx.globalAlpha = outside ? .5 : .85;
        ctx.fillStyle = n > .62 ? '#eef3fa' : '#b9c9e2';
        ctx.fillRect(r.x + c * P, Math.round((r.bottom - sub * P) / P) * P - (n > .7 ? P : 0), P, P);
        if (bubbles.length < 60 && Math.random() < .004) bubbles.push({ x: r.x + c * P + Math.random() * P, y: r.bottom - sub * P + Math.random() * 2 * P, vx: (Math.random() - .5) * 6, life: 1.2 + Math.random() * 1.8 });
      }
      ctx.globalAlpha = 1;
    }
  }
  function drawBoulder(t) {
    const P = dw.P, { L } = tide(t), dtc = Math.min(.05, t - (drawBoulder.last || t));
    drawBoulder.last = t;
    // the other rock groups along the beach
    for (const r of shore) {
      const a = rockWater(r, t, L, dtc);
      rockPaint(r, t, a);
      if (r.w >= 10 && a > .15) { r.lap = (r.lap || 0) - dtc; if (r.lap <= 0) { ripple(r.x + r.w * P / 2, r.bottom - a * P, 7 * P, 1.3, .35, r.w * P / 2); r.lap = 1 + Math.random() * .8; } }
    }
    const bo = dw.boulder, levels = new Map();
    for (const r of dw.cluster) levels.set(r, rockWater(r, t, L, dtc));
    const avg = rockWater(bo, t, L, dtc);
    const rising = avg - rockLevel; rockLevel = avg;
    const cx = bo.x + bo.w * P / 2, halfW = bo.w * P / 2;
    if (avg > .15) {
      lapT -= dtc;
      if (lapT <= 0) { ripple(cx, bo.bottom - avg * P, 10 * P, 1.3, .45, halfW + P); lapT = .9 + Math.random() * .6; }
      if (rising > .02) {
        sprayT -= dtc;
        if (sprayT <= 0) {
          for (let n = 0; n < 4; n++) drops.push({ x: bo.x + Math.random() * 4 * P, y: bo.bottom - avg * P, vx: -20 + Math.random() * 50, vy: -(70 + Math.random() * 90), life: .45 + Math.random() * .3 });
          sprayT = .07;
        }
      }
    }
    crabDraw(t);
    for (const r of dw.cluster) if (!r.front) rockPaint(r, t, levels.get(r));
    rockPaint(bo, t, avg);
    for (const r of dw.cluster) if (r.front) rockPaint(r, t, levels.get(r));
    bubblesDraw(dtc);
  }

  // drawn after the night tint, so these stay bright
  function lightsDraw(t) {
    const P = dw.P, n = sky.n;
    if (n > .02) {
      // moon + extra stars in the dark beyond the edge
      ctx.globalAlpha = n;
      const mg = ctx.createRadialGradient(moon.x + 3.5 * P, moon.y + 3.5 * P, 0, moon.x + 3.5 * P, moon.y + 3.5 * P, 16 * P);
      mg.addColorStop(0, 'rgba(241,236,216,.18)'); mg.addColorStop(1, 'rgba(241,236,216,0)');
      ctx.fillStyle = mg; ctx.fillRect(moon.x - 13 * P, moon.y - 13 * P, 33 * P, 33 * P);
      const mp = []; collect(mp, MOON, { m: '#f1ecd8' }, moon.x, moon.y, P);
      for (let k = 0; k < mp.length; k += 3) { ctx.fillStyle = mp[k + 2]; ctx.fillRect(mp[k], mp[k + 1], P, P); }
      for (const s of nightStars) {
        ctx.globalAlpha = n * (.25 + .6 * (.5 + .5 * Math.sin(t * (1 + s.s * 3) + s.s * 40)));
        ctx.fillStyle = '#e9e6dc'; ctx.fillRect(Math.round(s.x), Math.round(s.y), 1.5, 1.5);
      }
      // moonlight on the water: a broken, shimmering path that widens toward the bottom-left
      ctx.font = font;
      const mc = (moon.x + 3.5 * P) / cw, j0 = Math.floor((moon.y + 9 * P) / ch);
      for (let j = j0; j < rows; j++) {
        const f = (j - j0) / Math.max(1, rows - j0);
        const hw = 2 + f * 7, c0 = mc - f * 3 + Math.sin(j * .35 + t * .6) * .8;
        for (let i = Math.floor(c0 - hw); i <= Math.ceil(c0 + hw); i++) {
          if (i < 0 || i >= cols || !wmask[j * cols + i]) continue;
          const fall = 1 - Math.abs(i - c0) / hw; if (fall <= 0) continue;
          const sh = vn(i * .8 + 3, j * 1.4 - t * 2.2);
          const x = i * cw, y = j * ch;
          ctx.globalAlpha = n * Math.pow(fall, .7) * .1;                 // soft silver sheen under the glints
          ctx.fillStyle = '#c9d6f0'; ctx.fillRect(x, y, cw, ch);
          if (sh < .34) continue;
          ctx.globalAlpha = n * Math.pow(fall, .6) * (.55 + .45 * f) * Math.min(1, (sh - .34) * 3.5);
          ctx.fillStyle = sh > .66 ? '#fffbe8' : '#dfe3d2';
          ctx.fillText(sh > .6 ? '≈' : sh > .45 ? '~' : '-', x + cw / 2, y + ch / 2);
        }
      }
      // fireflies over the grass
      for (const f of flies) {
        const x = f.x + Math.sin(t * .7 + f.ph) * 14, y = f.y + Math.cos(t * .9 + f.ph * 1.3) * 8;
        const a = n * Math.max(0, Math.sin(t * 1.6 + f.ph));
        ctx.globalAlpha = a * .35; ctx.fillStyle = '#d8f27a'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = a; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
      }
      ctx.globalAlpha = 1;
    }
    // lantern: always there, lit at night
    const lx = dw.rx + P, ly = dw.rockTop + 4 * P - LANTERN.length * P;
    const flick = .85 + .15 * Math.sin(t * 9) * Math.sin(t * 5.3);
    const lit = n > .25;
    const lp = []; collect(lp, LANTERN, { k: '#2f3136', f: lit ? '#ffd36b' : '#6d6448', p: '#5a3a1e' }, lx, ly, P); paint(lp, P);
    if (n > .02) {
      const cx = lx + 1.5 * P, cy = ly + 2 * P, R = 26 * P * flick;
      ctx.globalCompositeOperation = 'lighter';
      const gl = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      gl.addColorStop(0, `rgba(255,190,90,${.32 * n * flick})`); gl.addColorStop(.5, `rgba(255,150,60,${.1 * n})`); gl.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = gl; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  function overlayDraw(t) {
    const P = dw.P, hp = headPos();
    // hints over his head
    const marks = dw.hooked && dw.state === 'idle' ? 2 : (!dw.clicked || dw.startle > 0) ? 1 : 0;
    if (marks) {
      const bobY = Math.sin(t * (marks === 2 ? 8 : 3)) > 0 ? 0 : 1;
      const ex = [];
      for (let m = 0; m < marks; m++) ['k', 'k', 'k', '.', 'k'].forEach((c, r) => { if (c === 'k') ex.push(hp.x + m * 2 * P, dw.oy - 7 * P + (bobY + r) * P, marks === 2 ? '#ff6a2b' : '#f2d33b'); });
      paint(ex, P);
    }
    // z z z
    for (let i = zs.length - 1; i >= 0; i--) {
      const z = zs[i];
      if (z.life <= 0) { zs.splice(i, 1); continue; }
      const age = 1 - z.life / 2.6;
      ctx.globalAlpha = Math.sin(Math.min(1, age) * Math.PI) * .9;
      ctx.font = `600 ${Math.round(9 + age * 7)}px "Geist", system-ui, sans-serif`;
      ctx.fillStyle = '#c9d6e6';
      ctx.fillText('z', z.x + age * 14 + Math.sin(age * 6 + z.ph) * 4, z.y - age * 26);
    }
    // English words popping up
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i];
      if (p.life <= 0) { pops.splice(i, 1); continue; }
      ctx.globalAlpha = clamp(p.life / .5, 0, 1);
      ctx.font = `600 ${p.big ? 15 : 12}px "Geist", system-ui, sans-serif`;
      ctx.fillStyle = '#08090b'; ctx.fillText(p.text, p.x + 1, p.y + 1);
      ctx.fillStyle = p.big ? '#ff9a5c' : '#f2d33b'; ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
    ctx.font = font;
  }

  /* ---------- beach decor: pixel rocks, swaying reeds, jumping fish ---------- */
  const ROCKS = [
    ["..hhh.", ".hgggd", "hggggd", "ggggdd"],
    [".hg.", "hggd", "ggdd"],
    ["..hhg..", ".hgggdd", "gggdddd"],
    [".hh..", "hggd.", "gggdd", "ggddd"]
  ];
  const ROCK_PAL = { h:'#b3b8bf', g:'#7f848c', d:'#53575e' };
  const JUMPER = { px: ["..ssss.t", "sesssstt", "..ssss.t"], pal: { s:'#a9c4e8', e:'#14161a', t:'#5a8ae6' } };
  let rocks = [], reeds = [], jumps = [], nextJump = 1.5, shore = [], palms = [];
  const SHORE = {
    big: [
      [".....hhhhg......", "...hhggggggdd...", ".hhgggcggggggd..", "hggggggggmgggdd.", "hgggggggggggdddd", "gggggcgggggddddd", "ggggggggggdddddd", ".gggggggggdddd.."],
      ["....hhhg.....", "..hhggggdd...", ".hggmgggggd..", "hgggggcggddd.", "ggggggggggddd", "gggggggggdddd", ".ggggggdddd.."]
    ],
    med: [
      ["...hhhg...", ".hhggggd..", "hgggcgggd.", "hggmgggddd", "gggggggddd", ".ggggggdd."],
      ["..hhg....", ".hgggdd..", "hggggcdd.", "gmgggdddd", ".gggdddd."]
    ],
    small: [["..hh..", ".hggd.", "hgmgdd", ".ggdd."], [".hhg.", "hgggd", "ggddd"], [".hhg..", "hgggd.", "ggcddd", ".gddd."]],
    peb: [[".hg.", "hggd", ".gd."], ["hg", "gd"], [".hh.", "hggd"]]
  };

  function setupDecor(di, dj) {
    rocks = []; reeds = []; jumps = []; flies = [];
    let s = 11;
    const rnd = () => hash(s++, 4242);
    const far = (i, j, list, gap) => list.every(o => Math.abs(o.i - i) + Math.abs(o.j - j) * 1.5 > gap);
    const nearDwarf = (i, j) => Math.abs(i - di) < 11 && Math.abs(j - dj) < 7;
    for (let tries = 0; tries < 900 && rocks.length < 8; tries++) {
      const j = (rnd() * (rows - 3) + 2) | 0, i = (rnd() * (edge[j] - 4) + 1) | 0, h = H[j * cols + i];
      if (h < .46 || h > .82 || nearDwarf(i, j) || !far(i, j, rocks, 9)) continue;
      rocks.push({ i, j, x: i * cw, y: j * ch + ch, spr: ROCKS[(rnd() * ROCKS.length) | 0] });
    }
    for (let tries = 0; tries < 900 && reeds.length < 4; tries++) {
      const j = (rnd() * (rows - 3) + 2) | 0, i = (rnd() * (edge[j] - 4) + 1) | 0, h = H[j * cols + i];
      if (h < .6 || h > .74 || nearDwarf(i, j) || !far(i, j, reeds, 12) || !far(i, j, rocks, 4)) continue;
      const stems = [], n = 3 + ((rnd() * 3) | 0);
      for (let k = 0; k < n; k++) stems.push({ dx: k * 2 + ((rnd() * 2) | 0) - n, hgt: 5 + ((rnd() * 4) | 0), cat: rnd() < .6, ph: rnd() * 6 });
      reeds.push({ i, j, x: i * cw + cw / 2, y: j * ch + ch, stems });
    }
    for (let tries = 0; tries < 600 && flies.length < 10; tries++) {
      const j = (rnd() * rows) | 0, i = (rnd() * edge[j]) | 0;
      if (H[j * cols + i] > .74) flies.push({ x: i * cw, y: j * ch, ph: rnd() * 20 });
    }
    // rock groups along the tide line: one big stone with smaller ones huddled around it, plus a few loners
    shore = [];
    const P = dw.P, pickOf = a => a[(rnd() * a.length) | 0];
    const freeSpot = (x, y) => !(x < 240 && y > Hh - 64) && !(x > W - 210 && y > Hh - 64);
    const groups = [], nGroups = W < 600 ? 2 : W < 1000 ? 3 : 4;
    for (let tries = 0; tries < 2000 && groups.length < nGroups; tries++) {
      const j = (rnd() * (rows - 4) + 2) | 0, i = (rnd() * (edge[j] - 8) + 4) | 0, h = H[j * cols + i];
      if (h < .37 || h > .49) continue;              // where the water usually ends
      if (Math.abs(i - di) < 17 && Math.abs(j - dj) < 9) continue;
      const x = i * cw, y = j * ch + ch;
      if (!freeSpot(x, y)) continue;
      if (!groups.every(g => Math.hypot(g.i - i, (g.j - j) * 1.6) > 22)) continue;
      groups.push({ i, j, x, y });
    }
    for (const g of groups) {
      const main = rnd() < .65 ? pickOf(SHORE.big) : pickOf(SHORE.med);
      const mw = main[0].length * P;
      shore.push(makeRock(main, Math.round(g.x - mw / 2), g.y + 2 * P));
      const n = 2 + ((rnd() * 4) | 0);
      for (let k = 0; k < n; k++) {
        const r = rnd(), spr = r < .2 ? pickOf(SHORE.med) : r < .6 ? pickOf(SHORE.small) : pickOf(SHORE.peb);
        const side = rnd() < .5 ? -1 : 1;
        const dx = side * (mw / 2 + (rnd() * .7 - .2) * mw * .6) - spr[0].length * P / 2;
        const dy = Math.round((rnd() - .35) * 6) * P;
        shore.push(makeRock(spr, Math.round(g.x + dx), g.y + 2 * P + dy));
      }
    }
    for (let tries = 0, loners = 0; tries < 900 && loners < (W < 600 ? 2 : 5); tries++) {
      const j = (rnd() * (rows - 3) + 2) | 0, i = (rnd() * (edge[j] - 6) + 3) | 0, h = H[j * cols + i];
      if (h < .33 || h > .55) continue;
      if (Math.abs(i - di) < 15 && Math.abs(j - dj) < 8) continue;
      if (!groups.every(g => Math.hypot(g.i - i, (g.j - j) * 1.6) > 9)) continue;
      const x = i * cw, y = j * ch + ch;
      if (!freeSpot(x, y)) continue;
      const spr = rnd() < .5 ? pickOf(SHORE.small) : pickOf(SHORE.peb);
      shore.push(makeRock(spr, x, y + P));
      loners++;
    }
    shore.sort((a, b) => a.bottom - b.bottom);   // further back first
    // coconut palms where the sand meets the scrub
    palms = [];
    for (let tries = 0; tries < 1200 && palms.length < (W < 600 ? 2 : 4); tries++) {
      const j = (rnd() * (rows - 3) + 3) | 0, i = (rnd() * cols * .5 + cols * .45) | 0;
      if (i >= cols - 2) continue;
      const h = H[j * cols + i], x = i * cw + cw / 2, y = j * ch + ch;
      if (h < .8 || h > .97 || mat[j * cols + i] > .52) continue;
      if (Math.abs(i - di) < 14 && Math.abs(j - dj) < 9) continue;
      if (!freeSpot(x, y) || y < 26 * P) continue;
      if (!palms.every(o => Math.hypot(o.i - i, (o.j - j) * 1.6) > 14)) continue;
      palms.push({ i, j, x, y, lean: rnd() < .5 ? -1 : 1, hgt: 12 + ((rnd() * 6) | 0), ph: rnd() * 6 });
    }
    palms.sort((a, b) => a.y - b.y);
  }

  function decorDraw(t, dt) {
    const P = dw.P;
    for (const r of rocks) { const px = []; collect(px, r.spr, ROCK_PAL, r.x, r.y - r.spr.length * P, P); paint(px, P); }
    for (const rd of reeds) {
      const px = [];
      for (const s of rd.stems) {
        const sway = Math.sin(t * 1.4 + s.ph + rd.x * .01);
        for (let y = 0; y < s.hgt; y++) {
          const bendX = Math.round(sway * (y / s.hgt) * 1.4);
          const col = y < 2 ? '#2f5a2a' : y < s.hgt - 1 ? '#4f8a3a' : '#7cbf55';
          px.push(Math.round(rd.x + (s.dx + bendX) * P), Math.round(rd.y - (y + 1) * P), col);
        }
        if (s.cat) {
          const bx = Math.round(sway * 1.4);
          px.push(Math.round(rd.x + (s.dx + bx) * P), Math.round(rd.y - (s.hgt + 1) * P), '#6b4423');
          px.push(Math.round(rd.x + (s.dx + bx) * P), Math.round(rd.y - (s.hgt + 2) * P), '#6b4423');
        }
      }
      paint(px, P);
    }
    // palms: curved ringed trunk, fronds that droop and sway at the tips
    const FRONDS = [[-1, -.2, 7], [1, -.2, 7], [-.9, .35, 6], [.9, .35, 6], [-.45, -.8, 5], [.45, -.8, 5], [0, .6, 4]];
    for (const pm of palms) {
      ctx.fillStyle = 'rgba(0,0,0,.3)';
      ctx.beginPath(); ctx.ellipse(pm.x + pm.lean * 5 * P, pm.y, 7 * P, 1.4 * P, 0, 0, Math.PI * 2); ctx.fill();
      const px = [];
      for (let y = 0; y < pm.hgt; y++) {
        const u = y / pm.hgt, x = Math.round(pm.lean * u * u * 4), ring = y % 3 === 0;
        px.push(pm.x + x * P, pm.y - (y + 1) * P, ring ? '#6b4a2c' : '#8a6238');
        px.push(pm.x + (x + 1) * P, pm.y - (y + 1) * P, ring ? '#5a3d24' : '#7a5530');
      }
      const tx = pm.x + Math.round(pm.lean * 4) * P, ty = pm.y - (pm.hgt + 1) * P;
      const sway = Math.sin(t * 1.1 + pm.ph) + .4 * Math.sin(t * 2.3 + pm.ph * 2);
      for (const [dx, dy, L] of FRONDS) {
        for (let st = 1; st <= L; st++) {
          const u = st / L;
          const x = dx * st + sway * u * u * 1.6, y = dy * st + u * u * 3;
          px.push(Math.round(tx + x * P), Math.round(ty + y * P), st > L - 2 ? '#7cbf55' : st > 2 ? '#4f9a44' : '#3a7a36');
        }
      }
      px.push(tx - P, ty + P, '#5a3d24', tx + P, ty + P, '#4a3220', tx, ty + 2 * P, '#5a3d24');
      paint(px, P);
    }
    if (!reduce) {
      nextJump -= dt;
      if (nextJump <= 0) {
        const { L } = tide(t);
        for (let tries = 0; tries < 40; tries++) {
          const j = (Math.random() * rows) | 0, i = (Math.random() * edge[j] * .8) | 0;
          if (L - H[j * cols + i] > .2 && Math.abs(i - (dw.fx / cw)) > 6) {
            const dir = Math.random() < .5 ? -1 : 1, x = i * cw + cw / 2, y = j * ch + ch * .6;
            snd.jump(); jumps.push({ x0: x, y0: y, x1: x + dir * (10 + Math.random() * 8) * P, h: (12 + Math.random() * 8) * P, dir, t: 0, dur: .9 + Math.random() * .3 });
            splash(x, y, 5);
            break;
          }
        }
        nextJump = 2 + Math.random() * 3.5;
      }
    }
    for (let n = jumps.length - 1; n >= 0; n--) {
      const f = jumps[n];
      f.t += dt;
      const p = f.t / f.dur;
      if (p >= 1) { splash(f.x1, f.y0, 7); jumps.splice(n, 1); continue; }
      const x = f.x0 + (f.x1 - f.x0) * p, y = f.y0 - f.h * 4 * p * (1 - p);
      const slope = -f.h * 4 * (1 - 2 * p) / Math.abs(f.x1 - f.x0);
      ctx.save();
      ctx.translate(Math.round(x), Math.round(y));
      ctx.scale(-f.dir, 1);
      ctx.rotate(-Math.atan(slope));
      const px = []; collect(px, JUMPER.px, JUMPER.pal, -4 * P, -1.5 * P, P);
      if (Math.sin(t * 35) > 0) px.push(3 * P, -2.5 * P, JUMPER.pal.t);
      paint(px, P);
      ctx.restore();
    }
  }

  function tint() {
    ctx.globalCompositeOperation = 'multiply';
    if (sky.n > .01) { ctx.fillStyle = mix([255, 255, 255], [96, 112, 170], sky.n); ctx.fillRect(0, 0, W, Hh); }
    if (sky.warm > .01) { ctx.fillStyle = mix([255, 255, 255], [255, 196, 150], sky.warm); ctx.fillRect(0, 0, W, Hh); }
    if (rain.k > .01) { ctx.fillStyle = mix([255, 255, 255], [200, 208, 224], rain.k); ctx.fillRect(0, 0, W, Hh); }
    ctx.globalCompositeOperation = 'source-over';
  }

  function dwarfStep(t, dt) {
    sky.clock -= dt;
    if (sky.clock <= 0 || dt === 0) { sky.goal = skyTarget(); sky.clock = 1; }
    if (dt === 0) { sky.n = sky.goal.n; sky.warm = sky.goal.warm; }
    else { const k = Math.min(1, dt * 1.6); sky.n += (sky.goal.n - sky.n) * k; sky.warm += (sky.goal.warm - sky.warm) * k; }
    directorUpdate(dt);
    snd.rain(rain.k); snd.night(sky.n);
    decorDraw(t, dt);
    if (!reduce) { gullUpdate(dt); crabUpdate(dt, t); bottleUpdate(dt, t); rainUpdate(dt); }
    bottleDraw(t);
    dwarfUpdate(t, dt);
    for (const r of ripples) r.t += dt;
    for (const d of drops) { d.vy += 320 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.life -= dt; }
    for (const p of pops) { p.y -= 18 * dt; p.life -= dt; }
    for (const z of zs) z.life -= dt;
    dwarfDraw(t);
    gullDraw(t);
    tint();
    lightsDraw(t);
    rainDraw();
    overlayDraw(t);
  }

  /* ---------- the catch panel ---------- */
  const panelWrap = document.getElementById('catchWrap'), listEl = document.getElementById('catchList'), subEl = document.getElementById('catchSub');
  const canSpeak = 'speechSynthesis' in window;
  function speak(text) {
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = .85; speechSynthesis.speak(u); } catch (e) {}
  }
  function swatch(cvs, key) {
    const it = WORDS[key], w = it.px[0].length, h = it.px.length, s = 3, dpr = Math.min(devicePixelRatio || 1, 3);
    cvs.width = 30 * dpr; cvs.height = 24 * dpr;
    const c = cvs.getContext('2d'); c.scale(dpr, dpr);
    const ox = Math.round((30 - w * s) / 2), oy = Math.round((24 - h * s) / 2);
    it.px.forEach((row, r) => { for (let k = 0; k < row.length; k++) { if (row[k] === '.') continue; c.fillStyle = it.pal[row[k]]; c.fillRect(ox + k * s, oy + r * s, s, s); } });
  }
  function renderPanel() {
    const keys = Object.keys(WORDS), found = keys.filter(k => bag[k]).length;
    subEl.textContent = T(`${found} of ${keys.length} words found`, `${found} de ${keys.length} palavras encontradas`);
    listEl.innerHTML = keys.map(k => {
      const w = WORDS[k];
      if (!bag[k]) return `<li class="locked"><span class="sw"></span><span class="wd"><b>? ? ?</b><span>${w.big ? T('something very heavy…', 'algo bem pesado…') : T('still in the sea', 'ainda no mar')}</span></span></li>`;
      return `<li><canvas class="sw" data-k="${k}" aria-hidden="true"></canvas><span class="wd"><b>${w.w}</b> <i>${w.ipa}</i><span>${w.pt}</span></span><span class="ct">×${bag[k]}</span>${canSpeak ? `<button type="button" class="say" data-say="${w.w}" aria-label="${T('Listen to ', 'Ouvir ')}${w.w}">${T('listen', 'ouvir')}</button>` : ''}</li>`;
    }).join('');
    listEl.querySelectorAll('canvas.sw').forEach(c => swatch(c, c.dataset.k));
  }
  document.addEventListener('langchange', () => { if (!panelWrap.hidden) renderPanel(); });
  listEl.addEventListener('click', e => { const b = e.target.closest('.say'); if (b) speak(b.dataset.say); });
  function openPanel() { renderPanel(); panelWrap.hidden = false; document.getElementById('catchClose').focus(); }
  function closePanel() { panelWrap.hidden = true; basketBtn.focus(); }
  basketBtn.addEventListener('click', () => { markActive(); snd.ui(); openPanel(); });
  document.getElementById('catchClose').addEventListener('click', closePanel);
  panelWrap.addEventListener('click', e => { if (e.target === panelWrap) closePanel(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !panelWrap.hidden) closePanel(); });

  /* ---------- day / night switch ---------- */
  const skyBtns = document.querySelectorAll('.sky-t button');
  function syncSky() { skyBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sky === sky.mode))); }
  skyBtns.forEach(b => b.addEventListener('click', () => {
    sky.mode = b.dataset.sky; sky.clock = 0; syncSky();
    try { localStorage.setItem('joao-sky', sky.mode); } catch (e) {}
    if (reduce) frame(1.15, 0);
  }));
  syncSky();

  let t0 = performance.now(), prev = t0, visible = true;
  function loop(now) {
    const dt = Math.min((now - prev) / 1000, .05); prev = now;
    if (visible) frame((now - t0) / 1000, dt);
    requestAnimationFrame(loop);
  }
  new IntersectionObserver(e => { visible = e[0].isIntersecting; snd.visible(visible); }).observe(cv);
  function start() {
    setup();
    if (reduce) { frame(1.15, 0); return; }
    requestAnimationFrame(loop);
  }
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { setup(); if (reduce) frame(1.15, 0); }, 150); });
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(start);

  /* ---------- boot loader ---------- */
  const boot = document.getElementById('boot'), list = document.getElementById('bootLines');
  const bar = document.getElementById('bootBar'), pct = document.getElementById('bootPct'), msg = document.getElementById('bootMsg');
  const steps = [
    ['generating the world', 'gerando o mundo', 'ok'],
    ['carving the rivers', 'cavando os rios', 'ok'],
    ['filling the sea', 'enchendo o mar', 'ok'],
    ['sorting the worksheets', 'organizando as atividades', 'ok'],
    ['teaching dwarves English', 'ensinando inglês aos anões', 'hot']
  ];
  let timers = [];
  function finish() {
    timers.forEach(clearTimeout); timers = [];
    boot.classList.add('out');
    setTimeout(() => { boot.hidden = true; }, 620);
  }
  function setP(p) { bar.style.transform = `scaleX(${p})`; pct.textContent = Math.round(p * 100) + '%'; }
  function runBoot() {
    if (reduce) return;
    timers.forEach(clearTimeout); timers = [];
    list.innerHTML = ''; setP(0); msg.textContent = 'loading';
    boot.hidden = false; boot.classList.remove('out');
    steps.forEach((s, n) => {
      timers.push(setTimeout(() => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${T(s[0], s[1])}</span><span class="${s[2]}">${s[2] === 'hot' ? 'almost there' : 'ok'}</span>`;
        list.appendChild(li);
        requestAnimationFrame(() => li.classList.add('on'));
        setP((n + 1) / steps.length);
      }, 250 + n * 320));
    });
    const end = 250 + steps.length * 320;
    timers.push(setTimeout(() => { msg.textContent = 'ready!'; }, end));
    timers.push(setTimeout(finish, end + 550));
  }
  boot.addEventListener('click', finish);
  addEventListener('keydown', () => { if (!boot.hidden) finish(); });
  document.getElementById('replay').addEventListener('click', runBoot);
  let seen = false;
  try { seen = sessionStorage.getItem('joao-boot') === '1'; sessionStorage.setItem('joao-boot', '1'); } catch (e) {}
  if (!seen) runBoot();
})();
