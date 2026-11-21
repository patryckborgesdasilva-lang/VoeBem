/* Parcelei e Fui — som: efeitos e trilhas chiptune geradas com Web Audio (sem arquivos). */
(function () {
  'use strict';
  const PF = (window.PF = window.PF || {});
  const A = { ctx: null, master: null, mg: null, muted: false, timer: null, tune: null, id: null, step: 0, next: 0, nbuf: null };

  function ensure() {
    if (!A.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      try { A.ctx = new C(); } catch (e) { return null; }
      A.master = A.ctx.createGain(); A.master.gain.value = A.muted ? 0 : 0.5; A.master.connect(A.ctx.destination);
      A.mg = A.ctx.createGain(); A.mg.gain.value = 0.5; A.mg.connect(A.master);
      const len = A.ctx.sampleRate * 0.25, buf = A.ctx.createBuffer(1, len, A.ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      A.nbuf = buf;
    }
    if (A.ctx.state === 'suspended') A.ctx.resume().catch(() => {});
    return A.ctx;
  }
  function tone(f, t, dur, type, vol, slide, dest) {
    const c = A.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || A.master); o.start(t); o.stop(t + dur + 0.03);
  }
  function noise(t, dur, vol, dest) {
    const c = A.ctx, s = c.createBufferSource(), g = c.createGain();
    s.buffer = A.nbuf; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(g); g.connect(dest || A.master); s.start(t); s.stop(t + dur + 0.02);
  }
  const seq = (t, notes, gap, dur, type, vol) => notes.forEach((f, i) => tone(f, t + i * gap, dur, type || 'square', vol || 0.12));
  const SFX = {
    jump: (t) => tone(330, t, 0.16, 'square', 0.1, 640),
    coin: (t) => { tone(988, t, 0.07, 'square', 0.1); tone(1319, t + 0.07, 0.2, 'square', 0.1); },
    stomp: (t) => { tone(240, t, 0.12, 'square', 0.15, 70); noise(t, 0.08, 0.12); },
    hurt: (t) => tone(320, t, 0.28, 'sawtooth', 0.15, 80),
    die: (t) => seq(t, [440, 370, 311, 262, 196], 0.11, 0.16, 'square', 0.13),
    box: (t) => tone(196, t, 0.08, 'square', 0.13, 140),
    power: (t) => seq(t, [523, 659, 784, 1047, 1319, 1568], 0.055, 0.12),
    food: (t) => seq(t, [659, 784, 988], 0.07, 0.14),
    stamp: (t) => seq(t, [784, 988, 1175, 1568], 0.07, 0.18),
    check: (t) => seq(t, [523, 784, 1047], 0.09, 0.16),
    boing: (t) => tone(190, t, 0.22, 'triangle', 0.22, 560),
    life: (t) => seq(t, [659, 784, 1319, 1047, 1568], 0.08, 0.16),
    win: (t) => seq(t, [523, 659, 784, 1047, 784, 1047, 1319, 1568], 0.11, 0.22, 'square', 0.13),
    over: (t) => seq(t, [392, 330, 262, 220, 165], 0.2, 0.3, 'triangle', 0.2),
    select: (t) => tone(700, t, 0.06, 'square', 0.08),
  };

  /* Trilhas: progressão de acordes + arpejo. Dígitos = nota do acorde (0 tônica, 1 terça, 2 quinta, 3 oitava…). */
  const MAJ = [0, 2, 4, 5, 7, 9, 11], MIN = [0, 2, 3, 5, 7, 8, 10], MIX = [0, 2, 4, 5, 7, 9, 10];
  const TUNES = {
    menu: { bpm: 104, root: 60, scale: MAJ, prog: [0, 5, 3, 4], bass: '0...2...0...2.2.', lead: '0.1.2.1.3.2.1.2.4.3.2.1.2...1...', hat: '..x...x...x...x.', wave: 'triangle' },
    sp: { bpm: 132, root: 62, scale: MAJ, prog: [0, 3, 4, 0, 5, 3, 4, 4], bass: '0..0..2.0..0..2.', lead: '0.21.2.32.1.2.3.3.21.0.12.1.0...', hat: 'x.xxx.xxx.xxx.xx' },
    bc: { bpm: 124, root: 65, scale: MAJ, prog: [0, 4, 5, 3], bass: '0...2...0.2.2...', lead: '0..1..2.3..2..1.2..3..4.3..2..1.', hat: 'x...x.x.x...x.x.' },
    bar: { bpm: 96, root: 67, scale: MAJ, prog: [0, 3, 0, 4, 5, 3, 4, 0], bass: '0.....2.....0...', lead: '3...2...1...2...3...4...3...1...', hat: '....x.......x...', wave: 'triangle' },
    ba: { bpm: 116, root: 57, scale: MIN, prog: [0, 3, 4, 0, 5, 3, 4, 4], bass: '0..0.2..0..0.2..', lead: '2.1.0...2.3.2.1.3.2.1...0.1.2...', hat: 'x..x.x..x..x.x..' },
    foz: { bpm: 138, root: 64, scale: MIX, prog: [0, 6, 3, 0], bass: '0.0.2.0.0.0.2.3.', lead: '0.1.2.3.2.1.2...3.4.3.2.1.2.1...', hat: 'x.x.x.xxx.x.x.xx' },
    py: { bpm: 120, root: 60, scale: MAJ, prog: [0, 0, 4, 4, 3, 3, 4, 0], bass: '0...2...0...2...', lead: '2.3.2.1.0.1.2...3.2.1.2.3.4.3...', hat: '..x...x...x...xx' },
  };
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function chordNote(tn, deg, k) { const d = deg + [0, 2, 4, 7, 9, 11][k] || deg; return tn.root + tn.scale[d % 7] + 12 * Math.floor(d / 7); }
  function play(step, t) {
    const tn = A.tune, sd = 60 / tn.bpm / 4, i = step % 16, deg = tn.prog[Math.floor(step / 16) % tn.prog.length];
    const b = tn.bass[i];
    if (b !== '.') tone(mtof(chordNote(tn, deg, +b) - 24), t, sd * 2.2, 'triangle', 0.3, null, A.mg);
    const l = tn.lead[step % tn.lead.length];
    if (l !== '.') tone(mtof(chordNote(tn, deg, +l)), t, sd * 1.7, tn.wave || 'square', tn.wave ? 0.16 : 0.06, null, A.mg);
    if (tn.hat[i] === 'x') noise(t, 0.03, 0.035, A.mg);
  }
  function sched() {
    if (!A.ctx || !A.tune) return;
    const sd = 60 / A.tune.bpm / 4;
    if (A.next < A.ctx.currentTime - 0.5) A.next = A.ctx.currentTime + 0.05;
    while (A.next < A.ctx.currentTime + 0.25) { play(A.step, A.next); A.next += sd; A.step++; }
  }

  PF.audio = {
    unlock() { ensure(); if (A.id && !A.timer) PF.audio.music(A.id, true); },
    sfx(name) { if (A.muted || !A.ctx) return; const f = SFX[name]; if (f) { try { f(A.ctx.currentTime + 0.005); } catch (e) {} } },
    music(id, force) {
      if (id === A.id && A.timer && !force) return;
      if (A.timer) { clearInterval(A.timer); A.timer = null; }
      A.id = id; A.tune = id ? TUNES[id] : null;
      if (!A.tune || !A.ctx) return;
      A.step = 0; A.next = A.ctx.currentTime + 0.08;
      A.timer = setInterval(sched, 60);
    },
    setMuted(m) { A.muted = m; if (A.master) A.master.gain.value = m ? 0 : 0.5; },
    get muted() { return A.muted; },
  };
})();
