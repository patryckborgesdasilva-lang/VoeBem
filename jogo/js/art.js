/* Parcelei e Fui — arte procedural: sprites, tiles, decoração e cenários.
   Tudo é desenhado em código (sem imagens externas). */
(function () {
  'use strict';
  const PF = (window.PF = window.PF || {});
  const TS = (PF.TS = 16);
  const VH = 270;
  const K = '#09160d';

  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, v + amt));
    return '#' + ((1 << 24) | (f(n >> 16) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).slice(1);
  }
  function rect(x) { return (X, Y, W, H, C) => { x.fillStyle = C; x.fillRect(Math.round(X), Math.round(Y), Math.round(W), Math.round(H)); }; }
  function disc(R, cx, cy, r, col) {
    for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy)); R(cx - w, cy + dy, 2 * w + 1, 1, col); }
  }
  function line(R, x0, y0, x1, y1, col, th) {
    th = th || 1;
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let i = 0; i <= n; i++) R(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, th, th, col);
  }

  /* contorno escuro de 1px em volta do sprite, para destacar do cenário */
  function outline(c) {
    const w = c.width, h = c.height, x = c.getContext('2d');
    const img = x.getImageData(0, 0, w, h), a = img.data, src = new Uint8ClampedArray(a);
    const on = (X, Y) => X >= 0 && Y >= 0 && X < w && Y < h && src[(Y * w + X) * 4 + 3] > 0;
    for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) {
      const i = (Y * w + X) * 4;
      if (src[i + 3]) continue;
      if (on(X - 1, Y) || on(X + 1, Y) || on(X, Y - 1) || on(X, Y + 1)) { a[i] = 9; a[i + 1] = 22; a[i + 2] = 13; a[i + 3] = 255; }
    }
    x.putImageData(img, 0, 0);
  }
  /* sprite = canvas com 1px de margem; desenhar em (x-1, y-1) */
  function sprite(w, h, draw, noOutline) {
    const c = mk(w + 2, h + 2), x = c.getContext('2d');
    x.translate(1, 1);
    draw(x, rect(x));
    if (!noOutline) outline(c);
    return { c, w, h };
  }
  PF.spr = function (ctx, s, x, y, flip) {
    x = Math.round(x); y = Math.round(y);
    if (flip) { ctx.save(); ctx.translate(x + s.w, y); ctx.scale(-1, 1); ctx.drawImage(s.c, -1, -1); ctx.restore(); }
    else ctx.drawImage(s.c, x - 1, y - 1);
  };

  /* ---------------- Patryck e Mari ---------------- */
  const GOLD = '#ffd34d';
  const MARI_LOOK = {
    sp: { top: '#ff4fa3', dot: '#ffd34d', pt: '#7b4fd6', shoe: '#ffffff', acc: '#ffd34d', bag: '#ff650e' },
    bc: { top: '#ffd34d', dot: '#ff650e', pt: '#19b5a5', shoe: '#ffffff', acc: '#19b5a5', bag: '#ff4fa3', short: 1 },
    bar: { top: '#e9483f', dot: '#ffd34d', pt: '#2e2a5a', shoe: '#6b3a1e', acc: '#ffd34d', bag: '#3a6a34', coat: 1 },
    ba: { top: '#19b5a5', dot: '#ffffff', pt: '#ff5a5f', shoe: '#ffd34d', acc: '#ff5a5f', bag: '#ffd34d', skirt: 1 },
    foz: { top: '#ff8a3d', dot: '#fff07a', pt: '#3fae49', shoe: '#ffffff', acc: '#3fae49', bag: '#7b4fd6' },
    py: { top: '#b892ee', dot: '#ffffff', pt: '#ffc93c', shoe: '#ff4fa3', acc: '#ff4fa3', bag: '#e9483f' },
  };
  function heroFrame(who, th, f) {
    return sprite(16, 24, (x, R) => {
      const y = f === 'run1' ? 1 : 0, mari = who === 1, cold = th === 'bar';
      const sk = mari ? '#a8714c' : '#e2ac84', skD = mari ? '#8a5838' : '#c48a62', hr = mari ? '#1c1412' : '#231813';
      const M = MARI_LOOK[th] || MARI_LOOK.sp;
      const top = mari ? M.top : '#2a2a31', topLo = shade(top, -28), pt = mari ? M.pt : '#35507e', shoe = mari ? M.shoe : '#f2f2f2';
      const low = mari && (M.short || M.skirt) ? sk : null;
      const longSleeve = cold;
      // pernas
      const L = (X, Y, W, H) => { for (let k = 0; k < H; k++) R(X, Y + k, W, 1, low && Y + k >= 20 ? low : pt); };
      if (f === 'idle') { L(5, 18, 3, 4); L(9, 18, 3, 4); R(4, 22, 4, 2, shoe); R(9, 22, 4, 2, shoe); }
      else if (f === 'run0') { L(3, 18, 3, 3); R(1, 20, 4, 2, shoe); L(10, 18, 3, 4); R(10, 22, 4, 2, shoe); }
      else if (f === 'run1') { L(6, 19, 4, 3); R(6, 22, 5, 2, shoe); }
      else { L(4, 18, 3, 2); R(3, 20, 4, 2, shoe); L(9, 18, 3, 3); R(10, 21, 4, 2, shoe); }
      if (!mari) { R(4, 23, 4, 1, '#b9bcc8'); }
      if (mari) { R(1, 3 + y, 4, 12, hr); R(2, 5 + y, 1, 8, '#3a2a24'); R(1, 13 + y, 3, 2, '#6b4430'); }
      // tronco
      R(4, 10 + y, 9, 8, top); R(4, 17 + y, 9, 1, topLo);
      if (mari && M.skirt) { R(3, 17 + y, 11, 3, pt); R(3, 19 + y, 11, 1, shade(pt, -30)); }
      if (mari && M.short) R(4, 17 + y, 9, 2, pt);
      if (mari) {
        [[6, 12], [10, 11], [5, 15], [9, 14], [11, 16]].forEach(([X, Y]) => R(X, Y + y, 1, 1, M.dot));
        if (M.coat) { R(8, 11 + y, 1, 7, topLo); R(7, 12 + y, 1, 1, GOLD); R(7, 15 + y, 1, 1, GOLD); R(4, 10 + y, 9, 1, '#f3e2c8'); }
        for (let k = 0; k < 7; k++) R(11 - k, 10 + k + y, 1, 1, '#2b2430');
        R(3, 15 + y, 4, 3, M.bag); R(3, 15 + y, 4, 1, shade(M.bag, 40)); R(5, 16 + y, 1, 1, GOLD);
      } else {
        R(4, 10 + y, 9, 1, '#3d3d47');
        if (cold) { R(4, 13 + y, 9, 1, '#3d3d47'); R(4, 15 + y, 9, 1, '#3d3d47'); R(5, 10 + y, 8, 2, '#ff650e'); R(6, 12 + y, 2, 3, '#ff650e'); R(6, 14 + y, 2, 1, '#c94a06'); }
        else { R(7, 10 + y, 1, 1, GOLD); R(8, 11 + y, 3, 1, GOLD); R(11, 10 + y, 1, 1, GOLD); }
      }
      // braço da frente
      const arm = longSleeve ? topLo : sk, cap = mari && !longSleeve ? top : topLo;
      if (f === 'jump') { R(13, 8, 2, 4, arm); R(13, 6, 2, 2, sk); R(12, 10, 2, 2, cap); }
      else if (f === 'run0') { R(11, 11, 4, 2, arm); R(14, 12, 2, 2, sk); R(11, 11, 2, 2, cap); }
      else if (f === 'run1') { R(9, 13, 2, 3, arm); R(9, 16, 2, 2, sk); R(9, 12, 2, 2, cap); }
      else { R(11, 11, 2, 5, arm); R(11, 16, 2, 2, sk); R(11, 11, 2, 2, cap); }
      // cabeça
      R(4, 2 + y, 10, 8, sk); R(5, 1 + y, 8, 1, sk); R(14, 6 + y, 1, 2, sk); R(6, 5 + y, 1, 2, skD);
      if (mari) {
        // cabelo liso puxado pra trás, risca de lado
        R(4, 0 + y, 9, 2, hr); R(3, 1 + y, 2, 5, hr); R(4, 2 + y, 3, 2, hr); R(5, 4 + y, 1, 1, hr); R(12, 1 + y, 1, 1, hr);
        R(8, 0 + y, 3, 1, '#4a3a34'); R(5, 1 + y, 2, 1, '#3a2c27');
        // brinco prateado de flor
        R(6, 7 + y, 2, 2, '#dfe4ec'); R(6, 7 + y, 1, 1, '#ffffff'); R(7, 8 + y, 1, 1, '#9aa3b5');
        // sobrancelha marcada, olhos, blush e batom
        R(8, 4 + y, 2, 1, hr); R(11, 4 + y, 3, 1, hr);
        R(9, 5 + y, 1, 2, K); R(12, 5 + y, 1, 2, K); R(13, 5 + y, 1, 1, K);
        R(12, 7 + y, 2, 1, '#d9786a'); R(10, 8 + y, 3, 1, '#a8424f');
      } else {
        const bd = '#2a1c16', hrH = '#4a3328';
        // cabelo cacheado e cheio em cima
        R(3, 1 + y, 11, 2, hr); R(4, 0 + y, 2, 1, hr); R(7, 0 + y, 2, 1, hr); R(10, 0 + y, 3, 1, hr);
        R(3, 3 + y, 2, 3, hr); R(5, 3 + y, 1, 1, hr); R(11, 3 + y, 2, 1, hr); R(13, 2 + y, 1, 1, hr);
        [[4, 0], [8, 0], [11, 0], [5, 1], [9, 1], [12, 1], [4, 2], [7, 2], [10, 2]].forEach(([X, Y]) => R(X, Y + y, 1, 1, hrH));
        if (th !== 'sp') {
          R(5, 4 + y, 9, 1, '#0b0b10'); R(8, 4 + y, 3, 2, '#0b0b10'); R(12, 4 + y, 2, 2, '#0b0b10'); R(9, 4 + y, 1, 1, '#5d7d9a'); R(12, 4 + y, 1, 1, '#5d7d9a');
        } else { R(8, 4 + y, 2, 1, hr); R(11, 4 + y, 3, 1, hr); R(9, 5 + y, 1, 1, K); R(12, 5 + y, 1, 1, K); }
        // barba fina no contorno do rosto, bigode e cavanhaque
        R(5, 5 + y, 1, 4, bd); R(6, 8 + y, 1, 2, bd); R(7, 9 + y, 7, 1, bd); R(10, 7 + y, 4, 1, bd); R(11, 8 + y, 2, 1, '#b0655a'); R(13, 8 + y, 1, 1, bd);
      }
    });
  }
  const heroCache = {};
  PF.heroFrames = function (who, th) {
    const k = who + th;
    if (heroCache[k]) return heroCache[k];
    const g = (f) => heroFrame(who, th, f);
    return (heroCache[k] = { idle: g('idle'), run0: g('run0'), run1: g('run1'), jump: g('jump') });
  };
  PF.HEROES = [{ name: 'Patryck', color: '#9fe07a' }, { name: 'Mari', color: '#ffad4d' }];

  /* ---------------- mascotes do canal ---------------- */
  const DK = '#0c3a1c';
  function dinherin(state) {
    // state 0 = dormindo (check-in apagado), 1 e 2 = acordado fazendo "paz e amor"
    return sprite(19, 23, (x, R) => {
      const on = state > 0, g1 = on ? '#93c06c' : '#b3bcab', g2 = on ? '#6fa257' : '#939b8e', g3 = on ? '#3a6a34' : '#707a6c';
      R(3, 1, 13, 15, g1); R(3, 1, 13, 1, g2); R(3, 15, 13, 1, g2); R(3, 1, 1, 15, g2); R(15, 1, 1, 15, g2);
      R(4, 2, 1, 1, g3); R(14, 2, 1, 1, g3); R(4, 14, 1, 1, g3); R(14, 14, 1, 1, g3);
      disc(R, 9, 12, 2, g3); R(9, 10, 1, 5, g1); R(8, 11, 2, 1, g1); R(9, 13, 2, 1, g1);
      if (on) { R(3, 4, 13, 1, DK); R(4, 4, 5, 3, DK); R(10, 4, 5, 3, DK); R(5, 5, 1, 1, '#5d8f55'); R(11, 5, 1, 1, '#5d8f55'); R(7, 8, 5, 1, DK); R(6, 7, 1, 1, DK); R(12, 7, 1, 1, DK); }
      else { R(5, 6, 3, 1, DK); R(11, 6, 3, 1, DK); R(8, 8, 3, 1, DK); }
      R(1, 8, 2, 1, DK); R(0, 9, 1, 2, DK); R(1, 11, 2, 1, DK);
      if (on) {
        const w = state === 2 ? 1 : 0;
        R(16, 8, 1, 1, DK); R(17, 4, 1, 5, DK); R(16, 3, 3, 2, DK); R(16 - w, 0, 1, 3, DK); R(18, 0, 1, 3, DK);
      } else { R(16, 9, 1, 4, DK); R(16, 13, 2, 1, DK); }
      R(6, 16, 1, 4, DK); R(5, 20, 3, 2, DK); R(12, 16, 1, 4, DK); R(12, 20, 3, 2, DK);
    });
  }
  function donaCartao(f) {
    return sprite(22, 30, (x, R) => {
      const o = '#f9a12a', s = '#ea7a0c', jk = '#3b4e2a', jkH = '#4f6638', blk = '#0b1a10';
      R(6, 0, 4, 3, blk); R(12, 0, 4, 3, blk); R(10, 1, 2, 2, blk); R(7, 1, 1, 1, '#24342a'); R(14, 1, 1, 1, '#24342a');
      R(5, 3, 12, 17, o); R(16, 3, 1, 17, '#e08a1a'); R(6, 5, 10, 2, s);
      R(4, 8, 14, 1, blk); R(5, 8, 5, 3, blk); R(12, 8, 5, 3, blk); R(10, 9, 2, 1, blk); R(6, 9, 1, 1, '#33473a'); R(13, 9, 1, 1, '#33473a');
      R(9, 13, 4, 1, blk); R(8, 12, 1, 1, blk); R(13, 12, 1, 1, blk); R(7, 12, 1, 1, '#ff8a6a');
      R(4, 14, 3, 8, jk); R(15, 14, 3, 8, jk); R(4, 14, 1, 8, jkH); R(6, 14, 1, 3, jkH); R(15, 14, 1, 3, jkH);
      R(8, 16, 2, 3, '#4a4a3a'); R(12, 18, 3, 1, blk); R(12, 19, 3, 1, blk);
      R(8, 20, 1, 6, blk); R(13, 20, 1, 6, blk); R(9, 22, 1, 1, blk); R(12, 22, 1, 1, blk);
      R(6, 26, 4, 2, blk); R(12, 26, 4, 2, blk); R(6, 28, 1, 1, blk); R(15, 28, 1, 1, blk);
      // braço levantado filmando
      R(18, 14, 1, 3, blk); R(19, 9, 1, 5, blk); R(17, 3, 5, 7, blk); R(18, 4, 3, 5, '#ffb08a'); R(18, 4, 1, 1, '#ffd2bd');
      if (f) { R(20, 4, 1, 1, '#ff2a2a'); }
      // café
      R(1, 16, 3, 1, blk); R(1, 17, 3, 4, o); R(1, 18, 3, 1, s); R(3, 18, 1, 3, blk);
    });
  }

  /* ---------------- inimigos (olham para a esquerda) ---------------- */
  function boleto(head, f) {
    return sprite(12, 15, (x, R) => {
      R(0, 0, 12, 12, '#fff6e0'); R(0, 0, 12, 2, head);
      R(1, 3, 3, 1, K); R(8, 3, 3, 1, K); R(2, 4, 2, 2, K); R(8, 4, 2, 2, K);
      R(4, 6, 4, 1, K);
      [1, 3, 4, 6, 8, 9, 10].forEach((i) => R(i, 8, 1, 3, K));
      R(f ? 2 : 3, 12, 2, f ? 3 : 2, K); R(f ? 8 : 7, 12, 2, f ? 2 : 3, K);
    });
  }
  const BIRD = [
    '......hhhh......',
    '.....hhhhhh.....',
    '..bbhehhhhhh....',
    '....hhhhhhhhhh..',
    '.....hBBBBhhhhhh',
    '.....hBBBBBhhhh.',
    '......hBBBhh....',
    '.......hhh......',
  ];
  function bird(pal, f, big) {
    return sprite(16, 12, (x, R) => {
      BIRD.forEach((row, y) => { for (let i = 0; i < row.length; i++) { const c = pal[row[i]]; if (c) R(i, y + 2, 1, 1, c); } });
      if (big) { R(0, 4, 5, 3, '#ff9f1c'); R(0, 5, 2, 2, '#d1401f'); }
      if (f) { R(8, 0, 6, 3, pal.w); R(9, 3, 4, 1, pal.w); } else { R(8, 6, 6, 2, pal.w); R(9, 8, 4, 2, pal.w); }
    });
  }
  function drone(f) {
    return sprite(16, 10, (x, R) => {
      R(1, 3, 14, 1, '#5a6078'); R(2, 2, 1, 2, '#5a6078'); R(13, 2, 1, 2, '#5a6078');
      if (f) { R(0, 1, 5, 1, '#dfe6f5'); R(11, 1, 5, 1, '#dfe6f5'); } else { R(1, 1, 3, 1, '#dfe6f5'); R(12, 1, 3, 1, '#dfe6f5'); }
      R(4, 4, 8, 4, '#3a3f52'); R(4, 4, 8, 1, '#6b7290');
      R(5, 6, 3, 2, '#e9483f'); R(6, 6, 1, 1, '#ffb3ad');
      R(4, 8, 1, 2, '#5a6078'); R(11, 8, 1, 2, '#5a6078');
    });
  }
  function siri(f) {
    return sprite(16, 10, (x, R) => {
      const r = '#e4572e', d = '#a8371a';
      R(3, 4, 10, 5, r); R(4, 3, 8, 1, r); R(3, 8, 10, 1, d);
      R(4, 0, 2, 3, '#fff'); R(4, 1, 1, 1, K); R(10, 0, 2, 3, '#fff'); R(10, 1, 1, 1, K);
      R(0, 3, 3, 2, r); R(0, 1, 1, 2, r); R(2, 1, 1, 2, r);
      R(13, 3, 3, 2, r); R(13, 1, 1, 2, r); R(15, 1, 1, 2, r);
      R(6, 6, 4, 1, d);
      const o = f ? 1 : 0;
      [3, 6, 9, 12].forEach((i) => R(i + (i < 8 ? -o : o), 9, 1, 1, d));
    });
  }
  const QUATI = [
    '...............tT.',
    '..............tT..',
    '..............Tt..',
    '...bbbb.......tT..',
    '..bbbbbbbbbbbbbb..',
    'nwbebbbbbbbbbbbb..',
    '.wwbbbbbbbbbbbbb..',
    '...bbbBBBBBBbbb...',
  ];
  function quati(f) {
    const pal = { b: '#9a5b34', B: '#c98f5e', t: '#9a5b34', T: '#3d2616', n: K, w: '#f3e6d0', e: K };
    return sprite(18, 12, (x, R) => {
      QUATI.forEach((row, y) => { for (let i = 0; i < row.length; i++) { const c = pal[row[i]]; if (c) R(i, y, 1, 1, c); } });
      const d = '#3d2616';
      if (f) { R(3, 8, 2, 3, pal.b); R(2, 11, 3, 1, d); R(12, 8, 2, 3, pal.b); R(12, 11, 3, 1, d); }
      else { R(5, 8, 2, 3, pal.b); R(4, 11, 3, 1, d); R(10, 8, 2, 3, pal.b); R(9, 11, 3, 1, d); }
    });
  }
  function ourico() {
    return sprite(14, 10, (x, R) => {
      const c = '#2b2440';
      R(2, 5, 10, 5, c); R(3, 4, 8, 1, c);
      R(0, 6, 2, 1, c); R(12, 6, 2, 1, c); R(1, 3, 1, 2, c); R(12, 3, 1, 2, c);
      R(3, 1, 1, 3, c); R(6, 0, 1, 4, c); R(7, 0, 1, 4, c); R(10, 1, 1, 3, c);
      R(4, 6, 2, 2, '#fff'); R(4, 7, 1, 1, K); R(8, 6, 2, 2, '#fff'); R(8, 7, 1, 1, K);
      R(3, 9, 8, 1, '#4a3f6b');
    });
  }
  function neve(f) {
    return sprite(12, 16, (x, R) => {
      const w = '#ffffff', s = '#d3e2f0';
      R(1, 8, 10, 8, w); R(2, 7, 8, 1, w); R(1, 14, 10, 2, s);
      R(3, 1, 6, 6, w); R(2, 2, 8, 4, w);
      R(4, 3, 1, 1, K); R(7, 3, 1, 1, K); R(0, 4, 4, 1, '#ff8a3d');
      R(2, 7, 8, 1, '#e9483f'); R(8, 8, 2, f ? 3 : 2, '#e9483f');
      R(5, 10, 1, 1, K); R(5, 12, 1, 1, K);
    });
  }
  function bola(f) {
    return sprite(10, 10, (x, R) => {
      [4, 8, 10, 10, 10, 10, 10, 10, 8, 4].forEach((w, y) => R((10 - w) / 2, y, w, 1, '#ffffff'));
      R(2, 8, 6, 1, '#d3dbe8');
      if (f) { R(4, 4, 2, 2, K); R(1, 2, 2, 1, K); R(7, 2, 2, 1, K); R(2, 7, 1, 2, K); R(7, 7, 1, 2, K); }
      else { R(3, 2, 2, 2, K); R(7, 4, 2, 2, K); R(2, 6, 2, 2, K); R(5, 8, 2, 1, K); R(5, 0, 2, 1, K); }
    });
  }
  function caixa(f) {
    return sprite(14, 13, (x, R) => {
      const c = '#c99a5b', d = '#8e6a37';
      R(0, 2, 14, 11, c); R(0, 12, 14, 1, d); R(6, 2, 2, 11, '#ead6aa');
      if (f) { R(0, 0, 6, 2, d); R(8, 0, 6, 2, d); } else { R(0, 1, 6, 1, d); R(8, 1, 6, 1, d); }
      R(1, 4, 3, 1, K); R(10, 4, 3, 1, K); R(2, 5, 2, 2, K); R(10, 5, 2, 2, K);
      R(2, 9, 10, 2, '#e9483f'); R(3, 9, 1, 2, '#fff'); R(6, 9, 2, 2, '#fff'); R(10, 9, 1, 2, '#fff');
    });
  }

  /* ---------------- itens ---------------- */
  function coin(wd) {
    return sprite(10, 10, (x, R) => {
      const rows = [4, 8, 10, 10, 10, 10, 10, 10, 8, 4];
      rows.forEach((w, y) => { const ww = Math.max(2, Math.round((w * wd) / 10)); R((10 - ww) / 2, y, ww, 1, '#ffc93c'); });
      if (wd >= 10) { R(2, 8, 6, 1, '#e89b1a'); R(4, 2, 1, 6, '#b86e0c'); R(5, 2, 2, 1, '#b86e0c'); R(7, 3, 1, 2, '#b86e0c'); R(5, 5, 2, 1, '#b86e0c'); R(2, 2, 1, 2, '#fff3b0'); }
      else if (wd >= 6) { R(4, 2, 2, 6, '#e89b1a'); }
    });
  }
  function stamp() {
    return sprite(14, 14, (x, R) => {
      for (let y = 0; y < 14; y++) for (let X = 0; X < 14; X++) {
        const d = Math.hypot(X - 6.5, y - 6.5);
        if (d < 7) R(X, y, 1, 1, d > 5.2 ? '#e9483f' : '#fff4d6');
      }
      const b = '#2e6fd0';
      R(6, 3, 2, 8, b); R(3, 6, 8, 2, b); R(5, 10, 4, 1, b); R(4, 5, 1, 1, b); R(9, 5, 1, 1, b);
    });
  }
  function card() {
    return sprite(12, 14, (x, R) => {
      const blk = '#0b1a10';
      R(2, 0, 3, 2, blk); R(7, 0, 3, 2, blk); R(5, 1, 2, 1, blk);
      R(1, 2, 10, 12, '#f9a12a'); R(10, 2, 1, 12, '#e08a1a'); R(2, 4, 8, 1, '#ea7a0c');
      R(1, 6, 10, 1, blk); R(2, 6, 3, 2, blk); R(7, 6, 3, 2, blk); R(5, 10, 2, 1, blk); R(4, 9, 1, 1, blk); R(7, 9, 1, 1, blk);
    });
  }
  const FOOD = {
    pastel: (x, R) => { const c = '#f0b24a', d = '#c47f1e'; R(1, 5, 10, 5, c); R(2, 3, 8, 2, c); R(3, 10, 6, 1, c); [1, 3, 5, 7, 9].forEach((i) => R(i, 9, 1, 1, d)); R(3, 4, 3, 1, '#ffd98a'); },
    picole: (x, R) => { R(3, 0, 6, 8, '#ff6b9d'); R(4, 1, 1, 4, '#ffb3cd'); R(7, 0, 2, 2, '#fff'); R(5, 8, 2, 4, '#e8cf9f'); },
    chocolate: (x, R) => { const c = '#6b3a1e'; R(1, 1, 10, 6, c); R(4, 1, 1, 6, '#8a5230'); R(7, 1, 1, 6, '#8a5230'); R(1, 4, 10, 1, '#8a5230'); R(1, 6, 10, 5, '#e9483f'); R(1, 8, 10, 1, '#ffc93c'); },
    alfajor: (x, R) => { const c = '#6b3a1e'; R(1, 2, 10, 3, c); R(2, 1, 8, 1, c); R(1, 5, 10, 2, '#f3e2b8'); R(1, 7, 10, 3, c); R(2, 10, 8, 1, c); R(3, 2, 3, 1, '#8a5230'); },
    coco: (x, R) => { disc(R, 6, 6, 5, '#3fae49'); R(4, 1, 5, 2, '#f3f0e0'); R(8, 0, 1, 3, '#ff5a5f'); R(3, 4, 2, 2, '#7ed67a'); },
    chipa: (x, R) => { for (let y = 0; y < 12; y++) for (let X = 0; X < 12; X++) { const d = Math.hypot(X - 5.5, y - 5.5); if (d < 6 && d > 2.2) R(X, y, 1, 1, d > 4.6 ? '#c98a2b' : '#f0c15e'); } },
  };
  function mala(used) {
    return sprite(16, 16, (x, R) => {
      const c = used ? '#8d8fa3' : '#e2582f', d = used ? '#6a6c80' : '#a8371a';
      R(5, 0, 6, 1, d); R(5, 0, 1, 3, d); R(10, 0, 1, 3, d);
      R(0, 3, 16, 13, c); R(0, 3, 16, 1, shade(c, 40)); R(0, 15, 16, 1, d);
      R(3, 3, 1, 13, d); R(12, 3, 1, 13, d);
      R(0, 3, 2, 2, d); R(14, 3, 2, 2, d); R(0, 14, 2, 2, d); R(14, 14, 2, 2, d);
      if (!used) { disc(R, 8, 9, 3, '#ffc93c'); R(7, 7, 2, 3, '#b86e0c'); R(7, 11, 2, 1, '#b86e0c'); }
      else { R(6, 8, 4, 1, d); }
    });
  }
  function chute() {
    return sprite(22, 11, (x, R) => {
      for (let y = 0; y < 11; y++) {
        const w = Math.floor(Math.sqrt(121 - (10 - y) * (10 - y)));
        for (let X = 11 - w; X < 11 + w; X++) R(X, y, 1, 1, Math.floor((X + 1) / 4) % 2 ? '#ff5a5f' : '#ffffff');
      }
    });
  }

  function bigBag() {
    return sprite(32, 32, (x, R) => {
      const dk = '#09160d', o = '#e86a2a';
      R(11, 0, 10, 2, dk); R(11, 0, 2, 5, dk); R(19, 0, 2, 5, dk);
      R(1, 4, 30, 26, o); R(1, 4, 30, 2, '#ff9a5a'); R(1, 28, 30, 2, '#a8451a');
      R(9, 6, 1, 22, '#c1531f'); R(22, 6, 1, 22, '#c1531f');
      R(1, 4, 3, 3, dk); R(28, 4, 3, 3, dk); R(1, 27, 3, 3, dk); R(28, 27, 3, 3, dk);
      R(1, 15, 30, 3, '#3a6a34'); R(1, 15, 30, 1, '#93c06c'); R(14, 14, 4, 5, '#ffd34d'); R(15, 15, 2, 3, '#b86e0c');
      R(4, 8, 5, 5, '#93c06c'); R(5, 9, 1, 3, dk); R(6, 9, 1, 1, dk); R(7, 10, 1, 1, dk);
      R(24, 20, 5, 4, '#ffffff'); R(24, 20, 5, 1, '#d52b1e'); R(24, 23, 5, 1, '#0038a8');
      R(4, 20, 5, 4, '#2e86de'); R(5, 21, 3, 1, '#ffffff'); R(6, 22, 1, 1, '#ffffff');
      R(24, 7, 4, 4, '#ffd34d'); R(25, 8, 2, 2, '#ff650e');
      R(4, 30, 4, 2, dk); R(24, 30, 4, 2, dk);
    });
  }
  let SPR = null;
  PF.sprites = function () {
    if (SPR) return SPR;
    const two = (fn) => [fn(0), fn(1)];
    const food = {};
    Object.keys(FOOD).forEach((k) => { food[k] = sprite(12, 12, FOOD[k]); });
    SPR = {
      enemy: {
        boleto: two((f) => boleto('#e9483f', f)),
        fatura: two((f) => boleto('#19a05a', f)),
        pombo: two((f) => bird({ h: '#8a8fa3', B: '#b9bdcc', b: '#f2a03d', e: K, w: '#6d7288' }, f)),
        gaivota: two((f) => bird({ h: '#f4f6fa', B: '#ffffff', b: '#f2a03d', e: K, w: '#aab3c5' }, f)),
        tucano: two((f) => bird({ h: '#22202e', B: '#fff3c4', b: '#ff9f1c', e: '#6fd3ff', w: '#3a3650' }, f, true)),
        drone: two(drone), siri: two(siri), quati: two(quati), ourico: [ourico(), ourico()],
        neve: two(neve), bola: two(bola), caixa: two(caixa),
      },
      coin: [coin(10), coin(6), coin(2), coin(6)],
      stamp: stamp(), card: card(), food,
      box: mala(false), boxUsed: mala(true),
      bigBag: bigBag(),
      check: [dinherin(0), dinherin(1), dinherin(2)], goal: [donaCartao(0), donaCartao(1)], chute: chute(),
    };
    return SPR;
  };

  /* ---------------- tiles por tema ---------------- */
  const TILE_C = {
    sp: { fill: '#4b4660', s1: '#3f3a52', s2: '#5a546f', top: '#c8c8d0', hi: '#eeeef2', lo: '#8e8e9c', block: '#b0563f', blockLo: '#7c3626', plat: '#f2b632', platLo: '#a87412', spike: '#d7dbe6', bs: 'brick' },
    bc: { fill: '#ddb877', s1: '#cfa762', s2: '#ecd198', top: '#f6e0a8', hi: '#fff3cf', lo: '#dcbd7c', block: '#c58a55', blockLo: '#8f5b30', plat: '#b97a45', platLo: '#7d4c25', spike: '#3a3352', bs: 'crate' },
    bar: { fill: '#6f7a8f', s1: '#5d687c', s2: '#8590a6', top: '#ffffff', hi: '#ffffff', lo: '#cfdfee', block: '#8b5a3c', blockLo: '#5e3a24', plat: '#9c6b45', platLo: '#6a4428', spike: '#cfefff', bs: 'crate' },
    ba: { fill: '#5f5868', s1: '#4f4958', s2: '#6f687a', top: '#9a94a3', hi: '#bdb7c6', lo: '#6f6978', block: '#e0a23a', blockLo: '#a56b1c', plat: '#2e86ab', platLo: '#1c5a75', spike: '#2b2b36', bs: 'brick' },
    foz: { fill: '#93402a', s1: '#7c3220', s2: '#ad553a', top: '#4fb04a', hi: '#86d96b', lo: '#2f7d35', block: '#8d927c', blockLo: '#5f6453', plat: '#a3764c', platLo: '#6e4a2a', spike: '#e2cfa4', bs: 'brick' },
    py: { fill: '#6b605b', s1: '#5a504c', s2: '#7d726c', top: '#cbc5ba', hi: '#f2c230', lo: '#9c968c', block: '#c99a5b', blockLo: '#8e6a37', plat: '#e9483f', platLo: '#a52b24', spike: '#d7dbe6', bs: 'crate' },
  };
  const tileCache = {};
  PF.tileset = function (id) {
    if (tileCache[id]) return tileCache[id];
    const c = TILE_C[id], r = rng(id.charCodeAt(0) * 131 + id.length);
    const tile = (draw) => { const cv = mk(16, 16); draw(rect(cv.getContext('2d'))); return cv; };
    const speck = (R, n, y0) => { for (let i = 0; i < n; i++) R((r() * 15) | 0, y0 + ((r() * (16 - y0)) | 0), 1 + (r() < 0.35 ? 1 : 0), 1, r() < 0.5 ? c.s1 : c.s2); };
    const fill = () => tile((R) => { R(0, 0, 16, 16, c.fill); speck(R, 9, 0); });
    const top = () => tile((R) => {
      R(0, 0, 16, 16, c.fill); speck(R, 6, 6);
      if (id === 'ba') {
        R(0, 0, 16, 9, c.lo);
        for (let y = 0; y < 2; y++) for (let X = -1; X < 4; X++) { const ox = X * 5 + (y ? 2 : 0), oy = y * 4 + 1; R(ox, oy, 4, 3, c.top); R(ox, oy, 4, 1, c.hi); }
        R(0, 0, 16, 1, c.hi);
        return;
      }
      R(0, 0, 16, 5, c.top); R(0, 0, 16, 1, c.hi); R(0, 5, 16, 1, c.lo);
      if (id === 'sp') { for (let X = 0; X < 16; X += 4) { R(X, 1, 2, 2, '#2b2b36'); R(X + 2, 3, 2, 2, '#f7f7fa'); } }
      else if (id === 'bc') { R(2, 2, 4, 1, c.lo); R(10, 3, 4, 1, c.lo); R(6, 6, 2, 1, c.top); }
      else if (id === 'bar') { R(2, 5, 2, 2, c.top); R(8, 5, 4, 1, c.top); R(13, 5, 1, 2, c.top); R(4, 2, 3, 1, c.lo); }
      else if (id === 'foz') { R(1, 5, 1, 2, c.lo); R(5, 5, 2, 1, c.lo); R(10, 5, 1, 3, c.lo); R(14, 5, 1, 1, c.lo); R(3, 0, 1, 1, c.hi); R(8, 1, 2, 1, c.hi); R(12, 0, 1, 1, c.hi); R(0, 0, 16, 1, c.top); R(2, 0, 2, 1, c.hi); R(9, 0, 3, 1, c.hi); }
      else if (id === 'py') { R(7, 1, 1, 4, c.lo); R(15, 1, 1, 4, c.lo); }
    });
    const ice = () => tile((R) => { R(0, 0, 16, 16, c.fill); speck(R, 5, 7); R(0, 0, 16, 7, '#b5e6f7'); R(0, 0, 16, 1, '#ffffff'); R(0, 6, 16, 1, '#7fc0dc'); R(3, 2, 4, 1, '#fff'); R(10, 4, 3, 1, '#fff'); R(12, 2, 1, 1, '#fff'); });
    const block = () => tile((R) => {
      R(0, 0, 16, 16, c.block); R(0, 0, 16, 1, shade(c.block, 35));
      if (c.bs === 'brick') { R(0, 7, 16, 1, c.blockLo); R(0, 15, 16, 1, c.blockLo); R(7, 0, 1, 7, c.blockLo); R(3, 8, 1, 7, c.blockLo); R(11, 8, 1, 7, c.blockLo); }
      else { R(0, 0, 1, 16, c.blockLo); R(15, 0, 1, 16, c.blockLo); R(0, 15, 16, 1, c.blockLo); R(1, 5, 14, 1, c.blockLo); R(1, 10, 14, 1, c.blockLo); R(2, 2, 1, 1, c.blockLo); R(13, 2, 1, 1, c.blockLo); R(2, 12, 1, 1, c.blockLo); R(13, 12, 1, 1, c.blockLo); }
    });
    const plat = () => tile((R) => {
      R(0, 0, 16, 5, c.plat); R(0, 0, 16, 1, shade(c.plat, 45)); R(0, 4, 16, 1, c.platLo);
      if (id === 'py') { for (let X = 0; X < 16; X += 8) { R(X, 1, 4, 3, '#fff6e0'); R(X, 5, 4, 2, c.plat); R(X + 4, 5, 4, 1, '#fff6e0'); } }
      else if (id === 'sp') { for (let X = 0; X < 16; X += 6) { R(X, 1, 3, 3, '#2b2b36'); } R(2, 5, 1, 3, c.platLo); R(13, 5, 1, 3, c.platLo); }
      else if (id === 'bar') { R(0, 0, 16, 2, '#ffffff'); R(3, 2, 2, 1, '#ffffff'); R(11, 2, 3, 1, '#ffffff'); R(7, 2, 1, 3, c.platLo); }
      else if (id === 'ba') { for (let X = 1; X < 16; X += 3) R(X, 5, 1, 4, c.platLo); R(0, 8, 16, 1, c.platLo); }
      else { R(5, 1, 1, 4, c.platLo); R(11, 1, 1, 4, c.platLo); R(2, 5, 1, 3, c.platLo); R(13, 5, 1, 3, c.platLo); }
    });
    const spike = () => tile((R) => {
      for (let i = 0; i < 3; i++) { const X = i * 5; R(X + 2, 8, 1, 2, c.spike); R(X + 1, 10, 3, 3, c.spike); R(X, 13, 5, 3, c.spike); R(X + 3, 11, 1, 5, shade(c.spike, -45)); R(X + 4, 13, 1, 3, shade(c.spike, -45)); }
    });
    return (tileCache[id] = { top: top(), fill: fill(), ice: ice(), block: block(), plat: plat(), spike: spike(), c });
  };

  /* ---------------- decoração de fase ---------------- */
  function canopyTree(g1, g2, trunk, petals) {
    const c = mk(30, 46), R = rect(c.getContext('2d'));
    R(13, 24, 4, 22, trunk); R(13, 24, 1, 22, shade(trunk, -25));
    disc(R, 15, 14, 12, g1); disc(R, 7, 19, 7, g1); disc(R, 23, 19, 7, g1);
    disc(R, 12, 10, 5, g2); disc(R, 21, 15, 4, g2); disc(R, 7, 18, 3, g2);
    if (petals) { R(4, 45, 2, 1, g2); R(20, 45, 3, 1, g2); R(26, 45, 1, 1, g2); }
    return c;
  }
  const DECOR = {
    sign() { const c = mk(20, 28), R = rect(c.getContext('2d')); R(9, 12, 2, 16, '#6b4a34'); R(0, 0, 20, 12, '#8a5a3c'); R(1, 1, 18, 10, '#e8cf9f'); const k = '#5a3a26'; R(4, 5, 9, 2, k); R(11, 3, 2, 6, k); R(13, 4, 2, 4, k); R(15, 5, 1, 2, k); return c; },
    lamp() { const c = mk(12, 46), R = rect(c.getContext('2d')); R(4, 4, 2, 42, '#3a3f52'); R(4, 3, 7, 2, '#3a3f52'); R(8, 5, 3, 2, '#ffe9a8'); R(3, 44, 4, 2, '#2b2f40'); return c; },
    tree() { return canopyTree('#3d9a56', '#63c276', '#6b4a34'); },
    jac() { return canopyTree('#8f63c9', '#b892ee', '#5c4436', true); },
    jtree() {
      const c = mk(40, 62), R = rect(c.getContext('2d'));
      R(18, 30, 5, 32, '#4a3323'); R(18, 30, 1, 32, '#33221a');
      disc(R, 20, 17, 16, '#1f6b33'); disc(R, 9, 24, 9, '#1f6b33'); disc(R, 31, 24, 9, '#1f6b33');
      disc(R, 16, 11, 6, '#3c9a48'); disc(R, 28, 19, 5, '#3c9a48'); disc(R, 9, 22, 4, '#3c9a48');
      R(8, 32, 1, 12, '#2a7d3a'); R(30, 32, 1, 16, '#2a7d3a'); R(25, 34, 1, 8, '#2a7d3a');
      return c;
    },
    palm() {
      const c = mk(36, 54), R = rect(c.getContext('2d'));
      for (let i = 0; i < 9; i++) { R(17 - Math.round(Math.sin(i / 3) * 2), 18 + i * 4, 3, 4, i % 2 ? '#9a6b42' : '#b07e50'); }
      for (let k = 0; k < 6; k++) {
        const a = Math.PI * (1.05 + k * 0.18) + (k > 2 ? 0.25 : 0);
        for (let t = 0; t < 16; t++) { const X = 18 + Math.cos(a) * t, Y = 17 + Math.sin(a) * t * 0.7 + t * t * 0.045; R(X, Y, 2, 2, t % 3 ? '#2f9d4f' : '#52c36a'); }
      }
      R(16, 17, 2, 2, '#6b4a34'); R(19, 18, 2, 2, '#6b4a34');
      return c;
    },
    umbrella() {
      const c = mk(30, 30), R = rect(c.getContext('2d'));
      R(14, 8, 2, 22, '#f3f0e6');
      for (let y = 0; y < 10; y++) { const w = Math.floor(Math.sqrt(196 - (9 - y) * (9 - y) * 1.9)); for (let X = 15 - w; X < 15 + w; X++) R(X, y, 1, 1, Math.floor((X + 3) / 5) % 2 ? '#ff5a5f' : '#fff6e0'); }
      return c;
    },
    pine() {
      const c = mk(26, 50), R = rect(c.getContext('2d'));
      R(11, 40, 4, 10, '#5c4436');
      [[2, 5], [14, 9], [26, 12]].forEach(([y0, hw], i) => {
        for (let y = 0; y < 16; y++) { const w = Math.round(1 + (hw * y) / 15); R(13 - w, y0 + y, w * 2, 1, i % 2 ? '#2b6a52' : '#235a45'); }
        R(13 - 2, y0, 4, 2, '#ffffff'); R(13 - hw, y0 + 15, 5, 1, '#ffffff'); R(13 + hw - 6, y0 + 14, 5, 1, '#ffffff');
      });
      return c;
    },
    dog() {
      const c = mk(24, 17), R = rect(c.getContext('2d')), w = '#fff8ee', b = '#a5603a';
      R(5, 6, 15, 7, w); R(9, 6, 7, 4, b); R(19, 4, 2, 4, b);
      R(0, 3, 8, 7, w); R(5, 2, 3, 5, b); R(0, 3, 2, 2, b); R(2, 5, 1, 1, K); R(0, 7, 2, 2, K);
      R(6, 13, 2, 4, w); R(16, 13, 2, 4, w); R(10, 13, 2, 3, w);
      R(4, 9, 3, 4, '#8a5230'); R(4, 10, 3, 1, '#ffc93c');
      return c;
    },
    stall() {
      const c = mk(32, 30), R = rect(c.getContext('2d'));
      R(2, 9, 2, 21, '#5c4436'); R(28, 9, 2, 21, '#5c4436');
      for (let X = 0; X < 32; X += 4) { R(X, 1, 4, 8, (X / 4) % 2 ? '#ffc93c' : '#e9483f'); R(X, 9, 4, 1 + ((X / 4) % 2), (X / 4) % 2 ? '#ffc93c' : '#e9483f'); }
      R(2, 20, 28, 10, '#8a5a3c'); R(2, 20, 28, 1, '#b07e50');
      R(5, 16, 4, 4, '#4f9dbf'); R(11, 14, 6, 6, '#f6f8fc'); R(12, 16, 4, 2, '#22223b'); R(20, 16, 5, 4, '#8ab17d');
      return c;
    },
  };
  const decorCache = {};
  PF.decor = function (kind) { return decorCache[kind] || (decorCache[kind] = (DECOR[kind] || DECOR.sign)()); };

  /* ---------------- cenários (parallax) ---------------- */
  function layer(w, draw) { const c = mk(w, VH), x = c.getContext('2d'); draw(rect(x), x); return c; }
  function cloud(R, x, y, s, col) { disc(R, x, y, 6 * s, col); disc(R, x + 8 * s, y + 2 * s, 5 * s, col); disc(R, x - 8 * s, y + 2 * s, 4 * s, col); R(x - 12 * s, y + 2 * s, 25 * s, 5 * s, col); }
  function hills(R, W, base, amp, per, col, ph) {
    for (let X = 0; X < W; X++) {
      const a = (X / W) * Math.PI * 2;
      const h = base - amp * (0.5 + 0.5 * Math.sin(a * per + ph)) - amp * 0.35 * Math.sin(a * (per * 2 + 1) + ph * 2);
      R(X, h, 1, VH - h, col);
    }
  }
  function skyline(R, W, r, o) {
    let X = o.x0 || 0;
    while (X < W) {
      const w = (o.minW + r() * (o.maxW - o.minW)) | 0, h = (o.minH + r() * (o.maxH - o.minH)) | 0;
      const col = o.cols[(r() * o.cols.length) | 0], top = o.base - h;
      R(X, top, w, VH - top, col);
      if (o.roof && r() < 0.45) R(X + 3, top - 4, w - 6, 4, shade(col, -30));
      if (o.ant && r() < 0.22) { R(X + (w >> 1), top - 16, 1, 16, col); R(X + (w >> 1), top - 17, 1, 1, '#ff5a5f'); }
      if (o.win) for (let wy = top + 4; wy < o.base - 5; wy += o.wy || 6) for (let wx = X + 2; wx < X + w - 3; wx += o.wx || 5) if (r() < o.winP) R(wx, wy, o.ww || 2, o.wh || 3, o.win);
      if (o.each) o.each(X, top, w, h, col);
      X += w + (o.gap ? (r() * o.gap) | 0 : 0);
    }
  }
  function peak(R, W, cx, top, base, hw, col, snow) {
    [-W, 0, W].forEach((off) => {
      for (let y = top; y < base; y++) {
        const k = (y - top) / (base - top), w = Math.round(hw * k), X = cx + off;
        R(X - w, y, w * 2 + 1, 1, col);
        if (snow && k < 0.34) R(X - w, y, w * 2 + 1, 1, snow);
        else if (snow && k < 0.46) { for (let s = -w; s < w; s += 7) R(X + s + ((y * 3) % 5), y, 3, 1, snow); }
        if (w > 3) R(X + Math.round(w * 0.35), y, Math.round(w * 0.65), 1, 'rgba(20,30,70,0.12)');
      }
    });
  }
  function blit(ctx, c, off, VW) {
    const w = c.width;
    let X = -((((off % w) + w) % w) | 0);
    while (X < VW) { ctx.drawImage(c, X, 0); X += w; }
  }

  const BG = {
    sp(r) {
      const far = layer(1024, (R) => {
        R(0, 236, 1024, 34, '#7586ad');
        skyline(R, 1024, r, { base: 236, minW: 16, maxW: 40, minH: 40, maxH: 118, cols: ['#8493b8', '#7a8ab1', '#8d9bbf'], win: '#aab8d6', winP: 0.22, ant: true });
        const c = '#6a7ba6';
        R(176, 98, 44, 172, c); R(182, 76, 32, 22, c); R(188, 60, 20, 16, c); R(194, 46, 8, 14, c); R(197, 26, 2, 20, c); R(197, 25, 2, 1, '#ff5a5f');
        for (let y = 104; y < 230; y += 7) for (let X = 180; X < 216; X += 5) R(X, y, 2, 3, '#93a3c8');
        const p = '#5f7099', k = '#9fb0d2';
        for (let i = 1; i <= 9; i++) { line(R, 733, 92 + i * 9, 716 - i * 12, 202, k); line(R, 757, 92 + i * 9, 774 + i * 12, 202, k); }
        line(R, 700, 270, 768, 84, p, 4); line(R, 790, 270, 722, 84, p, 4);
        R(596, 202, 300, 5, p);
      });
      const near = layer(768, (R, x) => {
        R(0, 246, 768, 24, '#39425f');
        skyline(R, 768, r, { base: 246, minW: 22, maxW: 46, minH: 28, maxH: 104, cols: ['#3d4767', '#465274', '#354060'], win: '#f7d977', winP: 0.17 });
        x.clearRect(286, 120, 172, 150);
        R(286, 246, 172, 24, '#39425f');
        R(301, 180, 140, 31, '#27304a');
        for (let X = 303; X < 440; X += 7) R(X, 182, 5, 27, '#3b4a70');
        R(301, 211, 140, 3, '#59627f');
        const red = '#d8433b';
        R(292, 170, 9, 76, red); R(441, 170, 9, 76, red); R(288, 164, 166, 9, red); R(288, 164, 166, 2, '#f06a5f');
        [[40, '#ff5a5f'], [150, '#19b5a5'], [520, '#ffc93c'], [660, '#b56bd6']].forEach(([X, col]) => { R(X, 236, 14, 8, col); R(X + 4, 232, 8, 4, col); });
      });
      return { far, near };
    },
    bc(r) {
      const far = layer(1024, (R) => {
        [[90, 40, 2], [330, 62, 1], [540, 34, 2], [780, 58, 1], [950, 30, 1]].forEach(([X, y, s]) => cloud(R, X, y, s, '#ffffff'));
        skyline(R, 1024, r, { x0: 270, base: 198, minW: 9, maxW: 18, minH: 46, maxH: 150, cols: ['#eef3f9', '#d6e0ec', '#c2d0e0', '#f7f1e6'], win: '#8fa9c8', winP: 0.75, wy: 5, wx: 3, ww: 2, wh: 2, gap: 4 });
        for (let X = 0; X < 300; X++) { const h = 198 - 66 * Math.pow(Math.sin((Math.PI * X) / 300), 0.8); R(X, h, 1, 198 - h, X % 7 < 3 ? '#3d9a66' : '#368c5c'); }
        line(R, 10, 192, 140, 132, '#2b2d42'); line(R, 140, 132, 292, 190, '#2b2d42');
        R(138, 124, 6, 10, '#f3f0e6'); R(60, 160, 2, 30, '#d6dbe6'); R(226, 158, 2, 34, '#d6dbe6');
        [[50, '#ff5a5f'], [100, '#ffc93c'], [190, '#19b5a5'], [250, '#ff5a5f']].forEach(([X, col]) => { const y = X < 140 ? 192 - ((X - 10) * 60) / 130 : 132 + ((X - 140) * 58) / 152; R(X, y, 1, 3, '#2b2d42'); R(X - 3, y + 3, 7, 6, col); R(X - 2, y + 4, 5, 2, '#dff3ff'); });
        const cx = 880, cy = 152, w = '#ffffff';
        for (let a = 0; a < 64; a++) { const an = (a / 64) * Math.PI * 2; R(cx + Math.cos(an) * 32, cy + Math.sin(an) * 32, 2, 2, w); }
        for (let a = 0; a < 12; a++) { const an = (a / 12) * Math.PI * 2; line(R, cx, cy, cx + Math.cos(an) * 31, cy + Math.sin(an) * 31, '#e4ecf5'); R(cx + Math.cos(an) * 32 - 2, cy + Math.sin(an) * 32 - 1, 5, 4, a % 2 ? '#ff5a5f' : '#2e86de'); }
        line(R, cx, cy, cx - 18, 198, w, 2); line(R, cx, cy, cx + 18, 198, w, 2);
        R(0, 196, 1024, 74, '#2596d6'); R(0, 196, 1024, 2, '#9ad9f7');
        for (let i = 0; i < 90; i++) R(r() * 1024, 200 + r() * 60, 6 + r() * 14, 1, r() < 0.5 ? '#5bb8ea' : '#1b84c2');
      });
      const near = layer(768, (R) => {
        hills(R, 768, 246, 9, 3, '#f3dca0', 0.5);
        for (let i = 0; i < 40; i++) R(r() * 768, 246 + r() * 22, 3, 1, '#e2c682');
        R(500, 226, 2, 20, '#f3f0e6'); R(518, 226, 2, 20, '#f3f0e6'); R(496, 210, 28, 16, '#ffffff'); R(494, 205, 32, 5, '#e9483f'); R(496, 217, 28, 3, '#e9483f'); R(506, 212, 6, 5, '#2b2d42');
        [[120, '#ff5a5f'], [260, '#2e86de'], [650, '#ffc93c']].forEach(([X, col]) => { R(X, 226, 1, 16, '#f3f0e6'); for (let y = 0; y < 6; y++) R(X - 3 - y * 2, 222 + y, 7 + y * 4, 1, y % 2 ? col : '#fff6e0'); });
      });
      return { far, near };
    },
    bar(r) {
      const far = layer(1024, (R) => {
        [[140, 46, 1], [470, 30, 2], [820, 52, 1]].forEach(([X, y, s]) => cloud(R, X, y, s, '#ffffff'));
        [[80, 92, 120], [300, 70, 150], [560, 100, 110], [760, 62, 160], [960, 96, 100]].forEach(([X, t, hw]) => peak(R, 1024, X, t, 212, hw, '#a9bdd6', '#ffffff'));
        [[190, 128, 110], [440, 118, 120], [660, 134, 100], [880, 122, 120]].forEach(([X, t, hw]) => peak(R, 1024, X, t, 212, hw, '#7f9bbd', '#eef6fc'));
        R(0, 200, 1024, 8, '#3b6a66');
        for (let X = 0; X < 1024; X += 5) R(X, 197 - ((X * 7) % 4), 3, 4, '#3b6a66');
        R(0, 207, 1024, 63, '#2f6c9a'); R(0, 207, 1024, 1, '#8fc4e6');
        for (let i = 0; i < 70; i++) R(r() * 1024, 211 + r() * 50, 8 + r() * 16, 1, r() < 0.5 ? '#5a97c2' : '#255a85');
      });
      const near = layer(768, (R) => {
        const pine = (X, base, h, col) => { for (let y = 0; y < h; y++) { const w = Math.round(1 + (y % 12) * 0.7 + y * 0.16); R(X - w, base - h + y, w * 2, 1, col); } R(X - 1, base - h, 3, 2, '#ffffff'); };
        for (let i = 0; i < 26; i++) pine(r() * 768, 248, 36 + r() * 30, r() < 0.5 ? '#1f5140' : '#2b6a52');
        hills(R, 768, 248, 7, 2, '#eef6fb', 1);
        const st = '#a39a8f';
        R(330, 212, 140, 34, st); for (let k = 0; k < 9; k++) R(338 + k * 15, 228, 8, 18, '#5d564e');
        for (let y = 214; y < 228; y += 5) for (let X = 334; X < 468; X += 9) R(X + (y % 2) * 4, y, 4, 2, '#8c8378');
        R(326, 204, 148, 8, '#3f5d4a'); R(326, 204, 148, 2, '#ffffff');
        R(388, 168, 24, 44, st); for (let y = 0; y < 18; y++) R(400 - Math.round(y * 0.8), 150 + y, Math.round(y * 1.6) + 1, 1, '#3f5d4a');
        disc(R, 400, 184, 5, '#ffffff'); R(400, 181, 1, 4, K); R(400, 184, 3, 1, K);
      });
      return { far, near };
    },
    ba(r) {
      const far = layer(1024, (R) => {
        disc(R, 840, 50, 13, '#ffd23f');
        for (let a = 0; a < 16; a++) { const an = (a / 16) * Math.PI * 2; line(R, 840 + Math.cos(an) * 16, 50 + Math.sin(an) * 16, 840 + Math.cos(an) * (a % 2 ? 22 : 26), 50 + Math.sin(an) * (a % 2 ? 22 : 26), '#ffd23f'); }
        R(835, 47, 2, 2, '#c98a12'); R(843, 47, 2, 2, '#c98a12'); R(837, 54, 6, 1, '#c98a12');
        [[120, 40, 1], [420, 56, 2], [650, 34, 1]].forEach(([X, y, s]) => cloud(R, X, y, s, '#ffffff'));
        skyline(R, 1024, r, { base: 238, minW: 26, maxW: 54, minH: 48, maxH: 108, cols: ['#cfc5b6', '#bdb2a2', '#d9d1c5'], win: '#8a8fa3', winP: 0.62, roof: true, wx: 6, wy: 8 });
        R(118, 150, 64, 120, '#c9bfb0'); for (let X = 122; X < 180; X += 8) R(X, 158, 3, 80, '#aaa091');
        disc(R, 150, 150, 17, '#8fb8a8'); R(133, 150, 35, 4, '#c9bfb0'); R(149, 120, 2, 14, '#8fb8a8');
        const o = '#f4f1ea';
        R(505, 82, 14, 188, o); R(514, 82, 5, 188, '#d6d2c8');
        for (let k = 0; k < 12; k++) R(512 - Math.round(k * 0.6), 70 + k, 1 + Math.round(k * 1.2), 1, o);
        R(509, 96, 2, 3, '#8a8fa3');
        line(R, 800, 238, 852, 150, o, 3); R(760, 232, 150, 3, o);
        for (let k = 1; k < 9; k++) line(R, 800 + k * 6, 238 - k * 10, 800 + k * 6 + 40 + k * 5, 232, '#e2ded4');
      });
      const near = layer(768, (R) => {
        R(0, 246, 768, 24, '#6a6272');
        const cols = ['#f5c542', '#e4572e', '#2e86ab', '#3bb273', '#f18f01', '#d1495b'];
        let X = 0, i = 0;
        while (X < 768) {
          const w = 34 + ((r() * 22) | 0), h = 46 + ((r() * 40) | 0), col = cols[i % cols.length], alt = cols[(i + 3) % cols.length], top = 246 - h;
          if (i % 4 === 3) {
            R(X + 14, 214, 4, 32, '#5c4436'); disc(R, X + 16, 204, 13, '#8f63c9'); disc(R, X + 7, 210, 7, '#8f63c9'); disc(R, X + 25, 210, 7, '#8f63c9'); disc(R, X + 13, 199, 5, '#b892ee');
            X += 34; i++; continue;
          }
          R(X, top, w, h, col);
          for (let c = X + 2; c < X + w; c += 3) R(c, top, 1, h, shade(col, -22));
          R(X, top, w, 2, shade(col, 35));
          const mid = top + Math.floor(h / 2);
          R(X, mid, w, 2, '#3a2f2a');
          for (let wx2 = X + 5; wx2 < X + w - 9; wx2 += 14) { R(wx2, top + 7, 8, 10, alt); R(wx2 + 1, top + 8, 6, 8, '#2b2d42'); R(wx2 + 4, top + 8, 1, 8, alt); }
          R(X + 5, 246 - 16, 8, 16, alt); R(X + 6, 246 - 15, 6, 15, '#3a2f2a');
          if (w > 44) { R(X + w - 16, mid + 6, 9, 9, alt); R(X + w - 15, mid + 7, 7, 7, '#2b2d42'); }
          X += w; i++;
        }
      });
      return { far, near };
    },
    foz(r) {
      const falls = [[40, 36], [130, 14], [200, 60], [330, 20], [420, 46], [560, 18], [620, 70], [770, 26], [850, 50], [960, 16]];
      const far = layer(1024, (R) => {
        [[200, 34, 1], [600, 48, 2], [900, 30, 1]].forEach(([X, y, s]) => cloud(R, X, y, s, '#ffffff'));
        for (let X = 0; X < 1024; X++) { const a = (X / 1024) * Math.PI * 2, t = 98 + 5 * Math.sin(a * 9) + 3 * Math.sin(a * 23 + 1); R(X, t, 1, 22, '#2f7d3b'); if (X % 5 < 2) R(X, t, 2, 2, '#58ad56'); }
        R(0, 116, 1024, 110, '#4d4a48');
        for (let i = 0; i < 150; i++) R(r() * 1024, 120 + r() * 100, 6 + r() * 20, 1, r() < 0.5 ? '#5f5b58' : '#3f3c3a');
        falls.forEach(([X, w]) => { R(X, 110, w, 116, '#eaf7fd'); for (let s = X + 2; s < X + w - 1; s += 4) R(s, 112, 1, 112, '#c4e4f2'); R(X - 1, 110, w + 2, 3, '#ffffff'); });
        R(0, 224, 1024, 46, '#4f9db8');
        for (let i = 0; i < 80; i++) R(r() * 1024, 226 + r() * 40, 5 + r() * 12, 1, r() < 0.6 ? '#bfe6f2' : '#3a86a0');
        falls.forEach(([X, w]) => { disc(R, X + (w >> 1), 226, Math.max(5, w >> 1), 'rgba(255,255,255,0.75)'); });
        const cols = ['rgba(233,72,63,0.5)', 'rgba(255,159,28,0.5)', 'rgba(255,201,60,0.5)', 'rgba(63,174,73,0.5)', 'rgba(46,134,222,0.5)', 'rgba(142,91,214,0.5)'];
        cols.forEach((col, k) => { const rad = 170 - k * 3; for (let a = 0; a < 400; a++) { const an = Math.PI + (a / 400) * Math.PI; R(512 + Math.cos(an) * rad, 236 + Math.sin(an) * rad, 2, 3, col); } });
      });
      const near = layer(768, (R) => {
        hills(R, 768, 242, 14, 3, '#1e5c2e', 0);
        for (let i = 0; i < 14; i++) { const X = r() * 768, h = 30 + r() * 40; R(X, 250 - h, 4, h, '#33241a'); disc(R, X + 2, 246 - h, 14 + ((r() * 8) | 0), '#226b33'); disc(R, X - 6, 250 - h, 7, '#2d7f3d'); }
        for (let X = 0; X < 768; X += 3) { const a = (X / 768) * Math.PI * 2, d = 10 + 7 * Math.sin(a * 5) + 4 * Math.sin(a * 13); R(X, 0, 3, d, '#1b5229'); }
        for (let i = 0; i < 22; i++) { const X = r() * 768, l = 14 + r() * 40; R(X, 8, 1, l, '#2a7d3a'); R(X - 1, 8 + l, 3, 2, '#3c9a48'); }
      });
      return { far, near, falls };
    },
    py(r) {
      const far = layer(1024, (R) => {
        disc(R, 700, 150, 22, '#ffe9a8'); disc(R, 700, 150, 17, '#fff6d6');
        [[160, 60, 1], [420, 40, 1], [880, 70, 1]].forEach(([X, y, s]) => cloud(R, X, y, s, '#ffd9b0'));
        hills(R, 1024, 206, 28, 2, '#a184b4', 1);
        hills(R, 1024, 220, 18, 3, '#806b9e', 3);
        R(0, 228, 1024, 42, '#d99b78'); R(0, 228, 1024, 1, '#ffd9b0');
        for (let i = 0; i < 70; i++) R(r() * 1024, 231 + r() * 36, 6 + r() * 16, 1, r() < 0.5 ? '#f2c79b' : '#b97b5c');
        const c = '#e3dcd0', d = '#b9b1a3';
        for (let X = 380; X <= 670; X++) { const k = (X - 525) / 145, y = 230 - (1 - k * k) * 54; R(X, y, 1, 5, d); if ((X - 380) % 22 === 0 && y > 178) R(X, 176, 2, y - 176, d); }
        [286, 330, 716, 760].forEach((X) => R(X, 174, 6, 60, d));
        R(240, 168, 580, 7, c); R(240, 174, 580, 2, d);
        for (let X = 240; X < 820; X += 4) R(X, 165, 1, 3, c);
      });
      const near = layer(768, (R) => {
        R(0, 246, 768, 24, '#5f5560');
        const cols = ['#d96c4f', '#e9c46a', '#4f9dbf', '#8ab17d', '#b56576', '#f2e8d5'];
        const signs = ['#e9483f', '#2e86de', '#ffc93c', '#19b5a5', '#8e5bd6', '#ff8a3d'];
        let X = 0, i = 0;
        const tops = [];
        while (X < 768) {
          const w = 44 + ((r() * 32) | 0), h = 60 + ((r() * 70) | 0), col = cols[i % cols.length], top = 246 - h;
          R(X, top, w, h, col); R(X, top, w, 3, shade(col, -40)); R(X + w - 3, top, 3, h, shade(col, -25));
          for (let y = top + 8; y < 222; y += 22) {
            for (let wx2 = X + 4; wx2 < X + w - 9; wx2 += 10) { R(wx2, y, 6, 7, '#2b2d42'); R(wx2, y, 6, 1, '#6b7290'); }
            if (r() < 0.75) { const sc = signs[(r() * signs.length) | 0], sw = Math.min(w - 8, 22 + ((r() * 16) | 0)); R(X + 4, y + 10, sw, 8, sc); R(X + 6, y + 12, sw - 8, 1, '#ffffff'); R(X + 6, y + 15, (sw - 8) * 0.6, 1, '#ffffff'); }
          }
          R(X + 2, 230, w - 6, 16, '#2b2d42'); for (let s = X + 2; s < X + w - 5; s += 4) R(s, 226, 4, 4, (s >> 2) % 2 ? '#e9483f' : '#fff6e0');
          if (r() < 0.5) { R(X + 8, top - 9, 10, 9, '#3f7fbf'); R(X + 8, top - 9, 10, 2, '#6aa5df'); R(X + 10, top - 1, 1, 1, K); }
          tops.push([X + (w >> 1), top]);
          X += w; i++;
        }
        for (let k = 0; k + 1 < tops.length; k++) { const [x0, y0] = tops[k], [x1, y1] = tops[k + 1]; for (let t = 0; t <= 20; t++) { const u = t / 20; R(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u + Math.sin(u * Math.PI) * 8 + 4, 2, 1, '#2b2d42'); } }
        R(380, 96, 2, 60, '#e6e6ee'); R(382, 96, 26, 6, '#d52b1e'); R(382, 102, 26, 6, '#ffffff'); R(382, 108, 26, 6, '#0038a8'); R(394, 104, 2, 2, '#ffc93c');
      });
      return { far, near };
    },
  };

  const WEATHER = {
    garoa: { n: 46, col: 'rgba(214,228,255,0.55)', vx: -40, vy: 260, w: 1, h: 5 },
    neve: { n: 56, col: 'rgba(255,255,255,0.9)', vx: -14, vy: 34, w: 2, h: 2, sway: 10 },
    nevoa: { n: 34, col: 'rgba(255,255,255,0.5)', vx: 22, vy: -16, w: 2, h: 2, sway: 6 },
    petalas: { n: 16, col: 'rgba(184,146,238,0.9)', vx: -18, vy: 26, w: 2, h: 2, sway: 12 },
  };
  PF.weather = function (ctx, kind, t, cam, VW) {
    const w = WEATHER[kind]; if (!w) return;
    ctx.fillStyle = w.col;
    const span = VW + 40;
    for (let k = 0; k < w.n; k++) {
      const a = Math.sin(k * 127.1) * 43758.5453, b = Math.sin(k * 311.7) * 24634.6345;
      const fa = a - Math.floor(a), fb = b - Math.floor(b), sp = 0.6 + fb * 0.8;
      let X = fa * span + t * w.vx * sp - cam * 0.3 + (w.sway ? Math.sin(t * 1.3 + k) * w.sway : 0);
      let Y = fb * VH + t * w.vy * sp;
      X = ((X % span) + span) % span - 20; Y = ((Y % VH) + VH) % VH;
      ctx.fillRect(X | 0, Y | 0, w.w, w.h);
    }
  };

  const bgCache = {};
  PF.background = function (id) {
    if (bgCache[id]) return bgCache[id];
    const th = PF.THEMES.find((t) => t.id === id);
    const L = BG[id](rng(id.charCodeAt(0) * 977 + id.charCodeAt(1)));
    const bg = {
      draw(ctx, cam, t, VW) {
        const g = ctx.createLinearGradient(0, 0, 0, VH);
        g.addColorStop(0, th.sky[0]); g.addColorStop(0.55, th.sky[1]); g.addColorStop(1, th.sky[2]);
        ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
        const fo = cam * 0.15;
        blit(ctx, L.far, fo, VW);
        if (L.falls) {
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          const w = L.far.width, base = -((((fo % w) + w) % w) | 0);
          for (let off = base; off < VW; off += w) L.falls.forEach(([fx, fw], i) => {
            if (off + fx > VW || off + fx + fw < 0) return;
            for (let k = 0; k < fw / 3; k++) { const h = Math.sin(i * 91.7 + k * 17.3) * 9999, f = h - Math.floor(h); ctx.fillRect(off + fx + ((f * fw) | 0), 112 + (((t * (70 + f * 60) + f * 112) % 108) | 0), 1, 7); }
          });
        }
        blit(ctx, L.near, cam * 0.4, VW);
      },
    };
    return (bgCache[id] = bg);
  };

  /* ---------------- destinos ---------------- */
  PF.THEMES = [
    { id: 'sp', name: 'São Paulo', sub: 'Garoa, Paulista e boleto pra pagar', sky: ['#6f83b0', '#c5b9cc', '#f5cfa8'], pit: '#56684f', pitHi: '#7d9072', weather: 'garoa', food: 'pastel', foodName: 'Pastel', mover: 'plain', tune: 'sp' },
    { id: 'bc', name: 'Balneário Camboriú', sub: 'Praia, bondinho e roda-gigante', sky: ['#2e9df0', '#8fd0fb', '#dff3ff'], pit: '#1e9bd7', pitHi: '#bfeaff', weather: null, food: 'picole', foodName: 'Picolé', mover: 'cable', tune: 'bc' },
    { id: 'bar', name: 'Bariloche', sub: 'Neve, gelo e chocolate', sky: ['#6fb0e0', '#c4e2f5', '#f1f8fd'], pit: '#3f7fb0', pitHi: '#d8f1ff', weather: 'neve', food: 'chocolate', foodName: 'Chocolate', mover: 'cable', tune: 'bar' },
    { id: 'ba', name: 'Buenos Aires', sub: 'Obelisco, Caminito e alfajor', sky: ['#5aa2e0', '#a9d3f3', '#f3f9fe'], pit: '#9a7b5b', pitHi: '#c9ab88', weather: 'petalas', food: 'alfajor', foodName: 'Alfajor', mover: 'plain', tune: 'ba' },
    { id: 'foz', name: 'Foz do Iguaçu', sub: 'Cataratas, quatis e muita água', sky: ['#3fa3e6', '#9fd8f7', '#e6f7ff'], pit: '#3d8fa8', pitHi: '#e6fbff', weather: 'nevoa', food: 'coco', foodName: 'Água de coco', mover: 'log', tune: 'foz' },
    { id: 'py', name: 'Paraguai', sub: 'Ponte da Amizade e compras em Ciudad del Este', sky: ['#4b6cc0', '#f0a070', '#ffd89a'], pit: '#7a8a66', pitHi: '#b9c79c', weather: null, food: 'chipa', foodName: 'Chipa', mover: 'plain', tune: 'py' },
  ];
})();
