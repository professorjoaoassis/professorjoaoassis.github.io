/* The beach in 8 bits: every sound is synthesized here, the way an old console would (pulse, triangle and LFSR noise
   channels, volume and pitch moving in 1/60 s steps). Nothing is downloaded. Off until the visitor turns it on. */
(() => {
  const AC = window.AudioContext || window.webkitAudioContext;
  const KEY = 'joao-sound';
  const S = window.SFX = { on: false, ready: false };
  let pref = false;
  try { pref = localStorage.getItem(KEY) === '1'; } catch (e) {}
  if (!AC) { Object.assign(S, { toggle() {}, state() {}, splash() {}, wave() {}, nibble() {}, strain() {}, snore() {}, wake() {}, gull() {}, skitter() {}, glint() {}, paper() {}, jump() {}, got() {}, rain() {}, night() {}, ui() {}, visible() {} }); return; }

  let ac = null, master, sfxBus, ambBus, NL, NS, P25, P12, sched = 0;
  let visible = true, rainK = 0, nightK = 0, reelTimer = 0;
  const STEP = 1 / 60;
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ---------- the chip ---------- */
  function lfsr(seconds, short, hold) {
    const len = Math.floor(ac.sampleRate * seconds), b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0);
    let r = 1, v = 1;
    for (let i = 0; i < len; i++) {
      if (i % hold === 0) { const bit = (r ^ (r >> (short ? 6 : 1))) & 1; r = (r >> 1) | (bit << 14); v = (r & 1) ? .9 : -.9; }
      d[i] = v;
    }
    return b;
  }
  function pulse(duty) {
    const n = 48, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    return ac.createPeriodicWave(re, im);
  }
  function init() {
    ac = new AC();
    master = ac.createGain(); master.gain.value = 0;
    const soften = ac.createBiquadFilter(); soften.type = 'lowpass'; soften.frequency.value = 7000;
    master.connect(soften).connect(ac.destination);
    sfxBus = ac.createGain(); sfxBus.gain.value = .55; sfxBus.connect(master);
    ambBus = ac.createGain(); ambBus.gain.value = .8; ambBus.connect(master);
    NL = lfsr(2, false, 2); NS = lfsr(1, true, 1);
    P25 = pulse(.25); P12 = pulse(.125);
    startAmbience();
    S.ready = true;
  }

  // values move in 1/60 s steps; volume snaps to 16 levels, like a 4-bit envelope
  function steps(param, when, pts, levels) {
    const peak = Math.max(...pts.map(p => Math.abs(p[1]))) || 1;
    const q = v => levels ? Math.round(v / peak * 15) / 15 * peak : v;
    param.cancelScheduledValues(when);
    param.setValueAtTime(q(pts[0][1]), when);
    for (let n = 1; n < pts.length; n++) {
      const [t0, v0] = pts[n - 1], [t1, v1] = pts[n];
      for (let x = t0 + STEP; x < t1; x += STEP) param.setValueAtTime(q(v0 + (v1 - v0) * (x - t0) / (t1 - t0)), when + x);
      param.setValueAtTime(q(v1), when + t1);
    }
  }
  function tone(o, delay) {
    const when = ac.currentTime + (delay || 0) + .01;
    const osc = ac.createOscillator(), g = ac.createGain();
    if (o.wave === 'tri') osc.type = 'triangle';
    else if (o.wave === 'sq') osc.type = 'square';
    else osc.setPeriodicWave(o.wave === 'p12' ? P12 : P25);
    steps(osc.frequency, when, o.f);
    steps(g.gain, when, o.v, true);
    osc.connect(g).connect(o.bus || sfxBus);
    const end = o.v[o.v.length - 1][0];
    osc.start(when); osc.stop(when + end + .05);
  }
  function noise(o, delay) {
    const when = ac.currentTime + (delay || 0) + .01;
    const src = ac.createBufferSource(), g = ac.createGain();
    src.buffer = o.short ? NS : NL; src.loop = true;
    steps(src.playbackRate, when, o.rate);
    let node = src;
    if (o.lp || o.hp || o.bp) {
      const f = ac.createBiquadFilter();
      f.type = o.lp ? 'lowpass' : o.hp ? 'highpass' : 'bandpass';
      const fp = o.lp || o.hp || o.bp;
      if (Array.isArray(fp)) steps(f.frequency, when, fp); else f.frequency.value = fp;
      if (o.q) f.Q.value = o.q;
      node.connect(f); node = f;
    }
    steps(g.gain, when, o.v, true);
    node.connect(g).connect(o.bus || sfxBus);
    const end = o.v[o.v.length - 1][0];
    src.start(when, Math.random() * 1.5); src.stop(when + end + .05);
  }
  const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
  function arp(notes, len, wave, vol, delay) {
    notes.forEach((n, i) => { if (n == null) return; tone({ wave, f: [[0, NOTE(n)], [len, NOTE(n)]], v: [[0, vol], [len * .7, vol * .6], [len, 0]] }, (delay || 0) + i * len); });
  }

  /* ---------- the sea, the wind, the rain, the night ---------- */
  let windSrc, windF, windG, bedG, rainG;
  function loopNoise(rate, type, freq, gain, q) {
    const src = ac.createBufferSource(); src.buffer = NL; src.loop = true; src.playbackRate.value = rate;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
    const g = ac.createGain(); g.gain.value = gain;
    src.connect(f).connect(g).connect(ambBus); src.start();
    return { src, f, g };
  }
  function startAmbience() {
    bedG = loopNoise(.06, 'lowpass', 420, .05).g;                 // the far sea, always there
    const w = loopNoise(.3, 'bandpass', 500, .012, 5); windSrc = w.src; windF = w.f; windG = w.g;
    rainG = loopNoise(.9, 'highpass', 3500, 0).g;
  }
  function gust() {
    const t = ac.currentTime + .01, d = rnd(2.5, 5), top = rnd(700, 1300), lvl = rnd(.03, .055);
    steps(windF.frequency, t, [[0, 480], [d * .45, top], [d, 460]]);
    steps(windG.gain, t, [[0, .012], [d * .4, lvl], [d, .012]], true);
  }
  // the scene calls this when each surge starts rolling in
  S.wave = () => {
    if (!live()) return;
    const big = rnd(.8, 1.15);
    noise({ rate: [[0, .04], [1.1, .11], [1.6, .07], [5.6, .03]], lp: [[0, 380], [1.2, 1100], [5.6, 300]], v: [[0, 0], [1.1, .2 * big], [1.7, .15 * big], [5.6, 0]], bus: ambBus });
    noise({ rate: [[0, .5], [3.2, .35]], hp: 2600, v: [[0, 0], [1.05, 0], [1.3, .045 * big], [3.2, 0]], bus: ambBus });   // foam fizz
  };
  S.rain = k => { rainK = k; if (live()) rainG.gain.setTargetAtTime(.035 * k, ac.currentTime, .4); };
  S.night = k => { nightK = k; };
  function tickAmbience() {
    if (!live()) return;
    if (Math.random() < .018) gust();
    if (rainK > .05) for (let i = 0; i < 3; i++) if (Math.random() < rainK * .5) noise({ short: Math.random() < .5, rate: [[0, rnd(.6, 1.4)], [.03, rnd(.4, 1)]], hp: 1800, v: [[0, .05 * rainK], [.03, 0]], bus: ambBus }, Math.random() * .1);
    if (nightK > .6 && !rainK && Math.random() < .03) {             // crickets
      const f = rnd(3900, 4600), d = Math.random() * .2;
      for (let i = 0; i < 3; i++) tone({ wave: 'p12', f: [[0, f], [.03, f]], v: [[0, .025], [.03, 0]], bus: ambBus }, d + i * .07);
    }
  }

  /* ---------- the dwarf ---------- */
  function reel(on, big) {
    clearInterval(reelTimer); reelTimer = 0;
    if (!on || !live()) return;
    let n = 0;
    const tick = () => {                                            // ratchet: click-click-click
      n++;
      noise({ short: true, rate: [[0, n % 2 ? 1.6 : 1.25], [.02, 1]], hp: 1500, v: [[0, .07], [.025, 0]] });
      if (n % 4 === 0) tone({ wave: 'p12', f: [[0, big ? 160 : 220], [.04, big ? 140 : 200]], v: [[0, .025], [.04, 0]] });
    };
    tick(); reelTimer = setInterval(tick, big ? 70 : 55);
  }
  function creak(k) {                                                // the rod bending
    const f = rnd(95, 125);
    tone({ wave: 'p25', f: [[0, f], [.08, f * 1.25], [.16, f * .9], [.3, f * 1.35]], v: [[0, 0], [.04, .06 * k], [.26, .04 * k], [.3, 0]] });
  }
  function whoosh() {
    noise({ rate: [[0, .25], [.12, .9], [.3, .3]], bp: [[0, 700], [.12, 2800], [.3, 900]], q: 1.5, v: [[0, 0], [.08, .14], [.3, 0]] });
    tone({ wave: 'p12', f: [[0, 1400], [.25, 500]], v: [[0, .035], [.25, 0]] });
  }
  function zing() {                                                  // line running out through the air
    tone({ wave: 'p12', f: [[0, 1700], [.7, 900]], v: [[0, .025], [.5, .018], [.7, 0]] });
  }
  S.state = (s, prev, big) => {
    if (prev === 'reel' && s !== 'reel') reel(false);
    if (!live()) return;
    if (s === 'reel') { reel(true, big); creak(big ? 1 : .6); }
    else if (s === 'windup') creak(.8);
    else if (s === 'throw') whoosh();
    else if (s === 'fly') zing();
    else if (s === 'yank') {                                         // "too heavy!"
      tone({ wave: 'sq', f: [[0, 520], [.4, 130]], v: [[0, .07], [.4, 0]] });
      tone({ wave: 'tri', f: [[0, 98], [.35, 73]], v: [[0, .18], [.35, 0]] }, .05);
      creak(1.2);
    }
  };
  S.splash = n => {
    if (!live()) return;
    const k = Math.min(1.6, n / 10);
    noise({ rate: [[0, .9], [.35 * k, .2]], lp: [[0, 5000], [.35 * k, 900]], v: [[0, .12 * k], [.08, .09 * k], [.4 * k, 0]] });
    tone({ wave: 'sq', f: [[0, 260 / k], [.09, 620 / k]], v: [[0, .05], [.09, 0]] });   // bloop
  };
  S.nibble = () => { if (live()) tone({ wave: 'tri', f: [[0, 990], [.05, 740]], v: [[0, .12], [.06, 0]] }); };
  S.strain = () => { if (live() && Math.random() < .55) creak(.9); };
  S.snore = () => { if (live()) tone({ wave: 'tri', f: [[0, 120], [.5, 95]], v: [[0, 0], [.15, .07], [.5, 0]] }); };
  S.wake = () => { if (live()) tone({ wave: 'p25', f: [[0, 600], [.08, 1200]], v: [[0, .05], [.09, 0]] }); };
  S.got = (first, big) => {
    if (!live()) return;
    if (big) { arp([60, 64, 67, 72, null, 67, 72, 76, 79, 84], .085, 'p25', .07); arp([48, 55, 60], .28, 'tri', .16); }
    else if (first) { arp([72, 76, 79, 84], .065, 'p25', .06); tone({ wave: 'p12', f: [[0, NOTE(96)], [.15, NOTE(96)]], v: [[0, .03], [.15, 0]] }, .3); }
    else arp([76, 79, 84], .06, 'p25', .05);
  };
  S.jump = () => { if (live()) tone({ wave: 'tri', f: [[0, 330], [.12, 880]], v: [[0, .08], [.12, 0]] }); };

  /* ---------- visitors ---------- */
  S.gull = angry => {
    if (!live()) return;
    const cry = d => tone({ wave: 'p25', f: [[0, angry ? 1500 : 1250], [.05, angry ? 1700 : 1400], [.18, 820]], v: [[0, .045], [.12, .035], [.18, 0]] }, d);
    cry(0); cry(.24); if (angry) cry(.46);
  };
  S.skitter = dur => {
    if (!live()) return;
    for (let t = 0; t < dur; t += .06) noise({ short: true, rate: [[0, rnd(2, 3)], [.015, 2]], hp: 3000, v: [[0, .03], [.015, 0]] }, t);
  };
  S.glint = () => { if (live()) arp([88, 93], .09, 'tri', .07); };
  S.paper = () => {
    if (!live()) return;
    noise({ rate: [[0, .7], [.2, .5]], hp: 2000, v: [[0, .06], [.2, 0]] });
    arp([67, 72, 79], .08, 'p25', .045, .12);
  };
  S.ui = () => { if (live()) tone({ wave: 'p25', f: [[0, 880], [.04, 880]], v: [[0, .04], [.05, 0]] }); };

  /* ---------- switching on and off ---------- */
  function live() { return S.on && S.ready && visible && ac.state === 'running'; }
  function fadeTo(v) { const t = ac.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(v, t + .4); }
  function wakeAudio() {
    if (!S.on) return;
    if (!ac) init();
    ac.resume().then(() => { fadeTo(visible ? .5 : 0); });
    if (!sched) sched = setInterval(tickAmbience, 100);
  }
  function sleepAudio() {
    reel(false);
    if (!ac) return;
    fadeTo(0);
    clearInterval(sched); sched = 0;
    setTimeout(() => { if (!S.on || !visible) ac.suspend(); }, 450);
  }
  let inView = true, tabShown = !document.hidden;
  function setVisible() {
    const v = inView && tabShown;
    if (v === visible) return;
    visible = v;
    if (!S.on || !ac) return;
    if (v) wakeAudio(); else sleepAudio();
  }
  S.visible = v => { inView = v; setVisible(); };
  const btn = document.getElementById('sndBtn');
  function sync() { if (btn) btn.setAttribute('aria-pressed', String(S.on)); }
  S.toggle = () => {
    S.on = !S.on; sync();
    try { localStorage.setItem(KEY, S.on ? '1' : '0'); } catch (e) {}
    if (S.on) { wakeAudio(); setTimeout(() => { if (live()) { S.wave(); arp([72, 79], .07, 'p25', .05); } }, 120); }
    else sleepAudio();
  };
  if (btn) btn.addEventListener('click', S.toggle);
  // browsers only allow sound after the visitor touches the page, so a remembered "on" waits for that
  S.on = pref; sync();
  if (pref) {
    const first = () => { ['pointerdown', 'keydown', 'touchend'].forEach(e => removeEventListener(e, first, true)); wakeAudio(); };
    ['pointerdown', 'keydown', 'touchend'].forEach(e => addEventListener(e, first, true));
  }
  document.addEventListener('visibilitychange', () => { tabShown = !document.hidden; setVisible(); });
})();
