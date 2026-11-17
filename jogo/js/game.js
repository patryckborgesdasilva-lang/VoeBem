/* Parcelei e Fui — motor do jogo: entrada, física, co-op, câmera, telas e HUD. */
(function () {
  'use strict';
  const PF = window.PF, TS = PF.TS, HT = 17, VH = 270, LH = HT * TS, OY = VH - LH;
  const T = { G: 1, B: 2, P: 3, S: 4, QC: 5, QK: 6, QF: 7, QU: 8, ICE: 9 };
  const GRAV = 1350, JUMP = 400, WALK = 130, STEP = 1 / 60;
  const FONT = "'Pixelify Sans','Trebuchet MS',sans-serif";
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const fmt = (n) => Math.round(n).toLocaleString('pt-BR');

  const cv = $('cv'), ctx = cv.getContext('2d');
  const world = document.createElement('canvas'), wx = world.getContext('2d');
  let VW = 480, scale = 2;


  const ENEMY = {
    boleto: { ai: 'walk', w: 12, h: 15, speed: 26 },
    fatura: { ai: 'walk', w: 12, h: 15, speed: 40 },
    siri: { ai: 'walk', w: 14, h: 9, speed: 46 },
    quati: { ai: 'walk', w: 16, h: 11, speed: 56 },
    ourico: { ai: 'still', w: 12, h: 9, spiky: true },
    pombo: { ai: 'fly', w: 14, h: 10, speed: 1.5, range: 40 },
    gaivota: { ai: 'fly', w: 14, h: 10, speed: 1.8, range: 48 },
    tucano: { ai: 'fly', w: 14, h: 10, speed: 2.0, range: 44 },
    drone: { ai: 'fly', w: 14, h: 9, speed: 2.3, range: 52 },
    neve: { ai: 'hop', w: 10, h: 15, speed: 38, jump: 270, wait: 1.1 },
    bola: { ai: 'hop', w: 10, h: 10, speed: 50, jump: 330, wait: 0.25 },
    caixa: { ai: 'hop', w: 13, h: 12, speed: 44, jump: 290, wait: 0.8 },
  };

  /* ---------------- progresso salvo ---------------- */
  const SAVE_KEY = 'parceleiefui.v2';
  const save = { mode: 2, solo: 0, muted: false, prog: [] };
  function loadSave() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY) || localStorage.getItem('parceleiefui.v1') || 'null');
      if (s) { save.mode = s.mode === 1 ? 1 : 2; save.solo = s.solo === 1 ? 1 : 0; save.muted = !!s.muted; save.prog = Array.isArray(s.prog) ? s.prog : []; }
    } catch (e) { /* sem armazenamento: joga sem salvar */ }
  }
  function store() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignora */ } }
  function prog(i) { return save.prog[i] || (save.prog[i] = { done: false, best: 0, stamps: [false, false, false] }); }
  function unlocked(i) { return i === 0 || prog(i - 1).done; }
  function pname(c) { return PF.HEROES[c].name; }

  /* ---------------- estado ---------------- */
  const G = { state: 'title', mode: 2, L: null, li: 0, sel: 0, players: [], cam: 0, t: 0, coins: 0, kills: 0, lives: 5, time: 0, got: [false, false, false], check: null, parts: [], pops: [], picks: [], enemies: [], pads: [], bot: null, wonT: 0, bg: null, ts: null, static: null, menuBg: 'sp' };
  PF.G = G;

  /* ---------------- entrada ---------------- */
  const keys = {};
  const touch = [{ l: false, r: false, j: false }, { l: false, r: false, j: false }];
  let isTouch = false;
  try { isTouch = window.matchMedia('(pointer: coarse)').matches; } catch (e) { /* ignora */ }
  let padPrev = false;

  addEventListener('keydown', (e) => {
    PF.audio.unlock();
    if (e.target && e.target.tagName === 'INPUT') { if (e.key === 'Enter') e.target.blur(); return; }
    if (e.code === 'KeyM') toggleMute();
    if (G.state === 'play') {
      keys[e.code] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (e.code === 'Escape' || e.code === 'KeyP') pause();
    } else if (G.state === 'pause' && (e.code === 'Escape' || e.code === 'KeyP')) resume();
    else if (G.state === 'map' && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) { e.preventDefault(); moveSel(e.code === 'ArrowUp' || e.code === 'ArrowLeft' ? -1 : 1); }
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; if (G.state === 'play') pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play') pause(); });
  addEventListener('pointerdown', () => PF.audio.unlock());
  addEventListener('touchstart', () => { if (!isTouch) { isTouch = true; if (G.state === 'play') buildTouch(); } }, { passive: true });

  function readPads() {
    const out = [];
    try {
      const l = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const g of l) {
        if (!g || !g.connected) continue;
        const ax = g.axes[0] || 0, b = (i) => !!(g.buttons[i] && g.buttons[i].pressed);
        out.push({ l: ax < -0.35 || b(14), r: ax > 0.35 || b(15), j: b(0) || b(1) || b(2) || b(3), start: b(9), a: b(0) });
      }
    } catch (e) { /* gamepad indisponível neste contexto */ }
    return out;
  }
  function getInput(i) {
    if (G.bot && G.bot[i]) return G.bot[i];
    const k = keys, t = touch[i], P = G.pads;
    let l, r, j, g = null;
    if (G.mode === 1) {
      l = k.KeyA || k.ArrowLeft; r = k.KeyD || k.ArrowRight; j = k.KeyW || k.ArrowUp || k.Space;
      for (const q of P) { l = l || q.l; r = r || q.r; j = j || q.j; }
    } else if (i === 0) { l = k.KeyA; r = k.KeyD; j = k.KeyW || k.Space; g = P.length > 1 ? P[0] : null; }
    else { l = k.ArrowLeft; r = k.ArrowRight; j = k.ArrowUp || k.ShiftRight || k.Numpad0; g = P.length > 1 ? P[1] : P[0]; }
    if (g) { l = l || g.l; r = r || g.r; j = j || g.j; }
    return { l: !!(l || t.l), r: !!(r || t.r), j: !!(j || t.j) };
  }

  function buildTouch() {
    const el = $('touch');
    touch.forEach((t) => { t.l = t.r = t.j = false; });
    if (!isTouch) { el.hidden = true; return; }
    const b = (p, a, lab, sym, cls) => '<button type="button" class="tb ' + (cls || '') + '" data-p="' + p + '" data-a="' + a + '" aria-label="' + lab + '">' + sym + '</button>';
    if (G.mode === 1) {
      el.innerHTML = '<div class="pad" data-p="0">' + b(0, 'l', 'Esquerda', '◀') + b(0, 'r', 'Direita', '▶') + '</div><div class="pad jump" data-p="0">' + b(0, 'j', 'Pular', '▲') + '</div>';
    } else {
      el.innerHTML = [0, 1].map((p) => '<div class="pad" data-p="' + p + '">' + b(p, 'j', 'Pular', '▲', 'wide') + b(p, 'l', 'Esquerda', '◀') + b(p, 'r', 'Direita', '▶') + '</div>').join('');
    }
    el.hidden = false;
  }
  (function touchEvents() {
    const el = $('touch');
    const set = (e, v) => {
      const b = e.target.closest ? e.target.closest('.tb') : null;
      if (!b) return;
      e.preventDefault();
      touch[+b.dataset.p][b.dataset.a] = v;
      b.classList.toggle('on', v);
      if (v) { try { b.setPointerCapture(e.pointerId); } catch (err) { /* ignora */ } PF.audio.unlock(); }
    };
    el.addEventListener('pointerdown', (e) => set(e, true));
    el.addEventListener('pointerup', (e) => set(e, false));
    el.addEventListener('pointercancel', (e) => set(e, false));
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  })();

  /* ---------------- tela e escala ---------------- */
  function resize() {
    const app = $('app'), W = app.clientWidth, Hh = app.clientHeight;
    if (!W || !Hh) return;
    const asp = W / Hh, wide = asp >= 320 / VH;
    let cw, ch;
    if (wide) { ch = Hh; VW = Math.min(640, Math.round(VH * asp)); cw = Math.min(W, (ch * VW) / VH); }
    else { VW = 320; cw = W; ch = (W * VH) / VW; }
    const left = (W - cw) / 2, top = wide ? 0 : Math.max(0, (Hh - ch) * 0.2);
    cv.style.width = cw + 'px'; cv.style.height = ch + 'px'; cv.style.left = left + 'px'; cv.style.top = top + 'px';
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    cv.height = Math.max(VH, Math.round(ch * dpr)); scale = cv.height / VH; cv.width = Math.round(VW * scale);
    world.width = VW; world.height = VH;
    const hud = $('hud');
    hud.style.left = left + 'px'; hud.style.top = top + 'px'; hud.style.width = cw + 'px';
  }
  addEventListener('resize', resize);

  /* ---------------- telas (DOM) ---------------- */
  const SCREENS = ['title', 'map', 'pause', 'clear', 'over', 'ending'];
  function screen(id) {
    SCREENS.forEach((s) => { $(s).hidden = s !== id; });
    if (id) { const b = $(id).querySelector('.go'); if (b) setTimeout(() => b.focus({ preventScroll: true }), 30); }
    else if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  function setHud(on) { $('hud').hidden = !on; $('touch').hidden = !on || !isTouch; }
  function toggleMute() {
    save.muted = !save.muted; PF.audio.setMuted(save.muted); store();
    $('btnMute').setAttribute('aria-pressed', String(save.muted));
  }

  /* título: editor dos passageiros */
  function drawPreview(c) {
    const cv2 = document.querySelector('.pax[data-c="' + c + '"] canvas'), x = cv2.getContext('2d'), s = PF.heroFrames(c, 'py').idle;
    x.imageSmoothingEnabled = false; x.clearRect(0, 0, cv2.width, cv2.height);
    x.drawImage(s.c, 0, 0, s.c.width, s.c.height, 0, 0, cv2.width, cv2.height);
  }
  function drawMascots() {
    const S = PF.sprites();
    document.querySelectorAll('canvas[data-mascot]').forEach((c) => {
      const s = c.dataset.mascot === 'din' ? S.check[1] : S.goal[0], x = c.getContext('2d');
      x.imageSmoothingEnabled = false; x.clearRect(0, 0, c.width, c.height);
      const k = Math.floor(Math.min(c.width / s.c.width, c.height / s.c.height));
      x.drawImage(s.c, Math.round((c.width - s.c.width * k) / 2), c.height - s.c.height * k, s.c.width * k, s.c.height * k);
    });
  }
  const KEYS2 = ['<kbd>A</kbd> <kbd>D</kbd> andar · <kbd>W</kbd> pular', '<kbd>←</kbd> <kbd>→</kbd> andar · <kbd>↑</kbd> pular'];
  const KEYS1 = '<kbd>A</kbd> <kbd>D</kbd> ou <kbd>←</kbd> <kbd>→</kbd> andar · <kbd>W</kbd> <kbd>↑</kbd> <kbd>Espaço</kbd> pular';
  const BIO = ['Camisa preta, barba e óculos escuros quando tem sol', 'Coque, brinco dourado e um look colorido em cada destino'];
  function buildTitle() {
    $('paxes').innerHTML = [0, 1].map((c) =>
      '<button type="button" class="pax" data-c="' + c + '"><canvas width="64" height="96" aria-hidden="true"></canvas><span class="pax-txt">' +
      '<span class="pax-lab">Passageiro ' + (c + 1) + '</span><span class="pax-name">' + PF.HEROES[c].name + '</span>' +
      '<span class="pax-bio">' + BIO[c] + '</span><span class="keys"></span></span></button>').join('');
    [0, 1].forEach(drawPreview);
    drawMascots();
    const refresh = () => {
      const m = save.mode;
      $('mode1').setAttribute('aria-pressed', String(m === 1)); $('mode2').setAttribute('aria-pressed', String(m === 2));
      document.querySelectorAll('.pax').forEach((el) => {
        const c = +el.dataset.c, playing = m === 2 || save.solo === c;
        el.classList.toggle('off', !playing);
        el.setAttribute('aria-pressed', String(playing));
        el.disabled = m === 2;
        el.querySelector('.pax-lab').textContent = m === 2 ? 'Passageiro ' + (c + 1) : playing ? 'Vai jogar' : 'Toque pra escolher';
        el.querySelector('.keys').innerHTML = m === 2 ? KEYS2[c] : playing ? KEYS1 : '';
      });
      $('modeHint').textContent = m === 2 ? 'Os dois jogam juntos na mesma tela.' : 'Escolha quem vai viajar.';
    };
    $('paxes').addEventListener('click', (e) => {
      const b = e.target.closest('.pax'); if (!b || save.mode !== 1) return;
      save.solo = +b.dataset.c; store(); refresh(); PF.audio.sfx('select');
    });
    const setMode = (m) => { G.mode = save.mode = m; store(); refresh(); };
    $('mode1').onclick = () => setMode(1); $('mode2').onclick = () => setMode(2);
    setMode(save.mode);
    $('btnStart').onclick = () => { PF.audio.sfx('select'); goMap(); };
    $('btnBack').onclick = () => goTitle();
    $('btnResume').onclick = resume;
    $('btnRetryP').onclick = () => startLevel(G.li);
    $('btnRetry').onclick = () => startLevel(G.li);
    $('btnMapP').onclick = () => goMap(G.li);
    $('btnMapO').onclick = () => goMap(G.li);
    $('btnNext').onclick = () => { if (G.li === PF.LEVEL_COUNT - 1) showEnding(); else goMap(G.li + 1); };
    $('btnEnd').onclick = () => goMap(G.li);
    $('btnPause').onclick = () => { if (G.state === 'play') pause(); };
    $('btnMute').onclick = toggleMute;
    $('btnMute').setAttribute('aria-pressed', String(save.muted));
  }

  /* roteiro: mapa + lista de destinos */
  const GEO = [[-14, -39], [-18, -39.5], [-22, -41], [-23, -43.5], [-24.3, -46.8], [-25.8, -48.6], [-28.6, -48.9], [-31.5, -51.5], [-34, -53.6], [-34.9, -56.2], [-34.3, -58.4], [-36.4, -56.8], [-38.2, -57.7], [-39, -62], [-41, -63.2], [-42.6, -64.5], [-45, -66.5], [-47.2, -66], [-50.2, -69], [-52.4, -68.6], [-54.8, -66.5], [-55.2, -69.5], [-53.5, -72.5], [-50, -75.2], [-46.5, -75.4], [-42, -74], [-37, -73.6], [-33, -71.7], [-27, -71], [-20, -70.2], [-18.3, -70.4], [-16.5, -72.8], [-14, -76.3]];
  const prj = (la, lo) => [Math.round((lo + 78) * 10), Math.round((-la - 14) * 10)];
  const NODES = [
    { la: -23.55, lo: -46.63, lx: 12, ly: 2, an: 'start' },
    { la: -27.0, lo: -48.63, lx: 12, ly: 8, an: 'start' },
    { la: -41.13, lo: -71.3, lx: 13, ly: 5, an: 'start' },
    { la: -34.6, lo: -58.4, lx: 13, ly: 8, an: 'start' },
    { la: -26.4, lo: -53.5, lx: -11, ly: 15, an: 'end' },
    { la: -24.3, lo: -55.7, lx: -12, ly: -2, an: 'end' },
  ];
  function buildMap() {
    const P = NODES.map((n) => prj(n.la, n.lo));
    let h = '<rect width="460" height="430" fill="var(--sea)"/>';
    [20, 30, 40, 50].forEach((la) => { const y = (la - 14) * 10; h += '<line x1="0" x2="460" y1="' + y + '" y2="' + y + '" stroke="#a9c6e2" stroke-dasharray="2 5"/><text class="sm" x="452" y="' + (y - 4) + '" text-anchor="end">' + la + '°S</text>'; });
    h += '<polygon points="' + GEO.map(([la, lo]) => prj(la, lo).join(',')).join(' ') + '" fill="var(--land)" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round"/>';
    for (let i = 0; i < P.length - 1; i++) {
      const d = prog(i).done;
      h += '<line x1="' + P[i][0] + '" y1="' + P[i][1] + '" x2="' + P[i + 1][0] + '" y2="' + P[i + 1][1] + '" stroke="' + (d ? 'var(--coral)' : 'var(--muted)') + '" stroke-width="2.5" stroke-linecap="round"' + (d ? '' : ' stroke-dasharray="1 7"') + '/>';
    }
    P.forEach((p, i) => {
      const n = NODES[i], d = prog(i).done, open = unlocked(i);
      if (i === G.sel) h += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="14" fill="none" stroke="var(--coral)" stroke-width="2.5" stroke-dasharray="4 4"/>';
      h += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="8" fill="' + (d ? 'var(--coral)' : open ? 'var(--sun)' : '#fff') + '" stroke="var(--ink)" stroke-width="2"/>';
      h += '<text x="' + (p[0] + n.lx) + '" y="' + (p[1] + n.ly) + '" text-anchor="' + n.an + '">' + (i + 1) + ' ' + PF.THEMES[i].name + '</text>';
    });
    h += '<text class="sm" x="330" y="330">OCEANO ATLÂNTICO</text><text class="sm" x="6" y="420">OCEANO PACÍFICO</text>';
    $('mapSvg').innerHTML = h;
  }
  function buildDests() {
    const ol = $('dests'); ol.innerHTML = '';
    let total = 0, st = 0;
    PF.THEMES.forEach((th, i) => {
      const p = prog(i), open = unlocked(i), n = p.stamps.filter(Boolean).length;
      total += p.best; st += n;
      const li = document.createElement('li'), b = document.createElement('button');
      b.type = 'button'; b.className = 'dest' + (p.done ? ' done' : ''); b.disabled = !open; b.dataset.i = i;
      b.innerHTML = '<span class="n">' + (i + 1) + '</span><span class="city"></span><span class="st" role="img" aria-label="' + n + ' de 3 carimbos">' + p.stamps.map((s) => '<i class="' + (s ? 'on' : '') + '"></i>').join('') + '</span><span class="sub"></span>';
      b.querySelector('.city').textContent = th.name;
      b.querySelector('.sub').textContent = !open ? 'Bloqueado: quite a parcela anterior' : p.done ? 'Quitada · ' + fmt(p.best) + ' inscritos' : 'Parcela ' + (i + 1) + '/6 em aberto';
      b.addEventListener('click', () => startLevel(i));
      const pick = () => { if (G.sel !== i) { G.sel = i; G.menuBg = th.id; buildMap(); } };
      b.addEventListener('focus', pick); b.addEventListener('mouseenter', pick);
      li.appendChild(b); ol.appendChild(li);
    });
    $('mapTotals').innerHTML = '<b>' + fmt(total) + '</b> inscritos · <b>' + st + '/18</b> carimbos no passaporte';
  }
  function moveSel(d) {
    const bs = Array.from(document.querySelectorAll('.dest:not(:disabled)'));
    if (!bs.length) return;
    let k = bs.findIndex((b) => +b.dataset.i === G.sel);
    k = clamp((k < 0 ? 0 : k) + d, 0, bs.length - 1);
    bs[k].focus(); PF.audio.sfx('select');
  }
  function goTitle() { G.state = 'title'; G.L = null; setHud(false); screen('title'); G.menuBg = 'sp'; PF.audio.music('menu'); }
  function goMap(sel) {
    G.state = 'map'; G.L = null; setHud(false); $('banner').hidden = true;
    let s = sel == null ? 0 : sel;
    if (sel == null) for (let i = 0; i < PF.LEVEL_COUNT; i++) if (unlocked(i)) s = i;
    while (s > 0 && !unlocked(s)) s--;
    G.sel = s; G.menuBg = PF.THEMES[s].id;
    buildMap(); buildDests(); screen('map');
    setTimeout(() => { const b = document.querySelector('.dest[data-i="' + s + '"]'); if (b) b.focus({ preventScroll: true }); }, 30);
    PF.audio.music('menu');
  }
  function showEnding() {
    G.state = 'ending'; G.L = null; setHud(false);
    let total = 0, st = 0;
    for (let i = 0; i < PF.LEVEL_COUNT; i++) { total += prog(i).best; st += prog(i).stamps.filter(Boolean).length; }
    const who = G.mode === 2 ? 'Patryck e Mari' : pname(save.solo);
    $('endText').textContent = who + (G.mode === 2 ? ' rodaram' : ' rodou') + ' de São Paulo ao Paraguai, pagaram todas as parcelas e ainda voltaram com vídeo pra postar. ' + (st === 18 ? 'Passaporte completo, todos os carimbos!' : 'Ainda faltam carimbos no passaporte: dá pra voltar e buscar.');
    $('endTally').innerHTML = '<div><dt>Destinos</dt><dd>6 de 6</dd></div><div><dt>Carimbos</dt><dd>' + st + ' de 18</dd></div><div class="sum"><dt>Inscritos no canal</dt><dd>' + fmt(total) + '</dd></div>';
    screen('ending'); PF.audio.music('menu');
  }
  function showBanner() {
    const th = G.L.theme, el = $('banner');
    el.innerHTML = '<p class="eyebrow">Parcela ' + (G.li + 1) + '/6</p><h2></h2><p></p>';
    el.querySelector('h2').textContent = th.name; el.lastElementChild.textContent = th.sub;
    el.hidden = true; void el.offsetWidth; el.hidden = false;
    el.onanimationend = () => { el.hidden = true; };
  }

  /* ---------------- fase ---------------- */
  function newPlayer(i, c) {
    return { i, x: 0, y: 0, w: 10, h: 22, vx: 0, vy: 0, face: 1, onGround: false, gt: 0, coy: 0, jbuf: 0, pj: false, hp: 3, inv: 0, star: 0, stun: 0, dead: false, deadT: 0, out: false, chute: false, mover: null, anim: 0, pb: 0, wall: false, c, frames: PF.heroFrames(c, G.L.theme.id), name: pname(c), color: PF.HEROES[c].color };
  }
  function mkEnemy(d) {
    const def = ENEMY[d.type], fly = def.ai === 'fly';
    const e = Object.assign({ type: d.type, vx: 0, vy: 0, dir: -1, face: -1, t: (d.x * 0.013) % 6, timer: def.wait || 0, active: false, dead: false, gone: false, deadT: 0, flip: false, onGround: false, wall: false }, def);
    e.x = d.x - def.w / 2; e.y = d.by - def.h - (fly ? 3 : 0); e.hx = e.x; e.hy = e.y;
    return e;
  }
  function buildStatic() {
    const L = G.L, ts = (G.ts = PF.tileset(L.theme.id));
    const c = document.createElement('canvas'); c.width = L.W * TS; c.height = LH;
    const x = c.getContext('2d');
    for (const d of L.decor) { const s = PF.decor(d.kind); x.drawImage(s, Math.round(d.x - s.width / 2), d.y - s.height); }
    const at = (tx, ty) => (tx < 0 || tx >= L.W || ty < 0 || ty >= HT ? 0 : L.tiles[ty * L.W + tx]);
    const gr = (t) => t === T.G || t === T.ICE;
    for (let ty = 0; ty < HT; ty++) for (let tx = 0; tx < L.W; tx++) {
      const t = at(tx, ty), X = tx * TS, Y = ty * TS;
      if (gr(t)) {
        x.drawImage(t === T.ICE ? ts.ice : gr(at(tx, ty - 1)) ? ts.fill : ts.top, X, Y);
        x.fillStyle = 'rgba(15,12,35,0.22)';
        if (tx > 0 && !gr(at(tx - 1, ty))) x.fillRect(X, Y, 2, TS);
        if (tx < L.W - 1 && !gr(at(tx + 1, ty))) x.fillRect(X + TS - 2, Y, 2, TS);
      } else if (t === T.B) x.drawImage(ts.block, X, Y);
      else if (t === T.P) x.drawImage(ts.plat, X, Y);
      else if (t === T.S) x.drawImage(ts.spike, X, Y);
    }
    G.static = c;
  }
  function startLevel(i) {
    G.li = i; G.L = PF.buildLevel(i); G.bg = PF.background(G.L.theme.id); buildStatic();
    G.L.movers.forEach((m) => { m.x = m.x0; m.y = m.y0; m.py = m.y0; m.dx = m.dy = 0; m.t = 0; });
    G.mode = save.mode;
    G.players = G.mode === 2 ? [newPlayer(0, 0), newPlayer(1, 1)] : [newPlayer(0, save.solo)];
    G.coins = 0; G.kills = 0; G.lives = 5; G.time = 0; G.wonT = 0; G.got = [false, false, false];
    G.parts = []; G.pops = []; G.picks = [];
    G.enemies = G.L.enemies.map(mkEnemy);
    G.check = { x: 44, y: (HT - 3) * TS };
    G.players.forEach((p, k) => { p.x = G.check.x - 5 + k * 24; p.y = G.check.y - p.h; });
    snapCam();
    for (const k in keys) keys[k] = false;
    G.state = 'play'; acc = 0;
    screen(null); setHud(true); buildTouch(); showBanner(); hudC = {};
    PF.audio.music(G.L.theme.tune);
  }
  PF.startLevel = startLevel;
  function pause() { if (G.state !== 'play') return; G.state = 'pause'; screen('pause'); }
  function resume() { if (G.state !== 'pause') return; for (const k in keys) keys[k] = false; G.state = 'play'; screen(null); }
  function gameOver() { G.state = 'over'; PF.audio.music(null); PF.audio.sfx('over'); screen('over'); }
  function win() {
    if (G.state !== 'play') return;
    G.state = 'won'; G.wonT = 0; G.cardShown = false;
    PF.audio.music(null); PF.audio.sfx('win');
    const st = G.got.filter(Boolean).length, tb = Math.max(0, Math.round(240 - G.time)) * 5;
    const total = G.coins * 10 + G.kills * 50 + st * 500 + tb + 1000;
    const p = prog(G.li);
    p.done = true; p.best = Math.max(p.best, total); G.got.forEach((g, k) => { if (g) p.stamps[k] = true; });
    store();
    const mm = Math.floor(G.time / 60), ss = String(Math.floor(G.time % 60)).padStart(2, '0');
    $('clearEyebrow').textContent = 'Parcela ' + (G.li + 1) + '/6 quitada · ' + G.L.theme.name;
    $('tally').innerHTML =
      '<div><dt>Moedas (' + G.coins + ' × 10)</dt><dd>' + fmt(G.coins * 10) + '</dd></div>' +
      '<div><dt>Perrengues vencidos (' + G.kills + ' × 50)</dt><dd>' + fmt(G.kills * 50) + '</dd></div>' +
      '<div><dt>Carimbos (' + st + ' × 500)</dt><dd>' + fmt(st * 500) + '</dd></div>' +
      '<div><dt>Bônus de tempo (' + mm + ':' + ss + ')</dt><dd>' + fmt(tb) + '</dd></div>' +
      '<div><dt>Vídeo no ar</dt><dd>1.000</dd></div>' +
      '<div class="sum"><dt>Novos inscritos</dt><dd>+' + fmt(total) + '</dd></div>';
    $('btnNext').textContent = G.li === PF.LEVEL_COUNT - 1 ? 'Ver o final ▶' : 'Próximo destino ▶';
    for (let k = 0; k < 24; k++) part(G.L.goal.x, G.L.goal.y - 30, (Math.random() - 0.5) * 220, -80 - Math.random() * 200, 1.4, ['#ffc93c', '#ff5a5f', '#19b5a5', '#ffffff'][k % 4], 2, 500);
  }

  /* ---------------- colisão com o cenário ---------------- */
  function tile(tx, ty) {
    const L = G.L;
    if (tx < 0 || tx >= L.W) return T.G;
    if (ty < 0 || ty >= HT) return 0;
    return L.tiles[ty * L.W + tx];
  }
  const isSolid = (t) => t === T.G || t === T.B || t === T.ICE || (t >= T.QC && t <= T.QU);
  function moveX(e, dx) {
    e.wall = false;
    if (!dx) return;
    e.x += dx;
    const y0 = Math.floor(e.y / TS), y1 = Math.floor((e.y + e.h - 0.01) / TS);
    if (dx > 0) {
      const tx = Math.floor((e.x + e.w - 0.01) / TS);
      for (let ty = y0; ty <= y1; ty++) if (isSolid(tile(tx, ty))) { e.x = tx * TS - e.w; e.wall = true; if (e.vx > 0) e.vx = 0; break; }
    } else {
      const tx = Math.floor(e.x / TS);
      for (let ty = y0; ty <= y1; ty++) if (isSolid(tile(tx, ty))) { e.x = (tx + 1) * TS; e.wall = true; if (e.vx < 0) e.vx = 0; break; }
    }
  }
  function moveY(e, dy, isP) {
    const pb = e.y + e.h;
    e.y += dy; e.onGround = false;
    if (isP) e.mover = null;
    const x0 = Math.floor(e.x / TS), x1 = Math.floor((e.x + e.w - 0.01) / TS);
    if (dy >= 0) {
      const ty = Math.floor((e.y + e.h - 0.01) / TS);
      for (let tx = x0; tx <= x1; tx++) {
        const t = tile(tx, ty);
        if (isSolid(t) || (t === T.P && pb <= ty * TS + 0.01)) { e.y = ty * TS - e.h; e.vy = 0; e.onGround = true; break; }
      }
      if (e.onGround) e.gt = tile(Math.floor((e.x + e.w / 2) / TS), ty);
      else if (isP) {
        for (const m of G.L.movers) {
          if (e.x + e.w > m.x && e.x < m.x + m.w && pb <= Math.max(m.y, m.py) + 3 && e.y + e.h >= m.y) { e.y = m.y - e.h; e.vy = 0; e.onGround = true; e.mover = m; e.gt = 0; break; }
        }
      }
    } else {
      const ty = Math.floor(e.y / TS);
      let hit = false, best = -1, bo = 0;
      for (let tx = x0; tx <= x1; tx++) {
        const t = tile(tx, ty);
        if (!isSolid(t)) continue;
        hit = true;
        if (isP && t >= T.QC && t <= T.QF) { const o = Math.min(e.x + e.w, (tx + 1) * TS) - Math.max(e.x, tx * TS); if (o > bo) { bo = o; best = tx; } }
      }
      if (hit) { e.y = (ty + 1) * TS; e.vy = 0; if (best >= 0) bumpBox(best, ty); }
    }
  }

  /* ---------------- efeitos ---------------- */
  function part(x, y, vx, vy, life, col, sz, g) { if (G.parts.length < 260) G.parts.push({ x, y, vx, vy, life, max: life, col, sz: sz || 2, g: g == null ? 300 : g }); }
  function pop(text, x, y, col) { G.pops.push({ text, x, y, t: 0, col: col || '#ffffff' }); }
  function sparkle(x, y, col, n) { for (let k = 0; k < (n || 6); k++) part(x, y, (Math.random() - 0.5) * 120, -Math.random() * 120, 0.4 + Math.random() * 0.3, col, 2, 200); }
  const sfx = (n) => PF.audio.sfx(n);

  function addCoin(x, y) {
    G.coins++; sfx('coin'); sparkle(x, y, '#ffe38a', 4);
    if (G.coins % 50 === 0) { G.lives++; sfx('life'); pop('LIMITE +1!', x, y - 10, '#7df0c8'); }
  }
  function bumpBox(tx, ty) {
    const L = G.L, b = L.boxes.find((q) => q.tx === tx && q.ty === ty);
    if (!b || b.used) return;
    b.used = true; b.bump = 0.2; L.tiles[ty * L.W + tx] = T.QU; sfx('box');
    const cx = tx * TS + 8, top = ty * TS;
    if (b.kind === 'c') { addCoin(cx, top - 8); G.parts.push({ x: cx, y: top - 6, vx: 0, vy: -190, life: 0.45, max: 0.45, coin: true, g: 500, sz: 0 }); }
    else G.picks.push({ kind: b.kind === 'k' ? 'card' : 'food', x: cx, y: top + 6, ty: top - 9, t: 0, got: false });
  }

  /* ---------------- jogadores ---------------- */
  const alive = (p) => !p.dead && !p.out;
  function kill(p) {
    if (p.dead || p.out) return;
    p.dead = true; p.deadT = 0; p.vy = -290; p.vx = 0; p.hp = 0; p.mover = null; p.chute = false; p.star = 0;
    sfx('die');
  }
  function hurt(p, fromX) {
    if (p.inv > 0 || p.star > 0 || !alive(p) || G.god) return;
    p.hp--;
    if (p.hp <= 0) { kill(p); return; }
    p.inv = 1.6; p.stun = 0.25; p.vy = -230; p.vx = (p.x + p.w / 2 < fromX ? -1 : 1) * 150; p.onGround = false; p.mover = null;
    sfx('hurt');
  }
  function place(p, other) {
    p.dead = false; p.out = false; p.hp = 3; p.inv = 2.6; p.vx = 0; p.vy = 0; p.star = 0; p.stun = 0; p.mover = null; p.onGround = false;
    if (other) { p.x = other.x; p.y = Math.max(-12, other.y - 112); p.chute = true; }
    else { p.x = G.check.x - 5; p.y = G.check.y - p.h; p.chute = false; snapCam(); }
  }
  function respawn(p) {
    const other = G.players.find((q) => q !== p && alive(q));
    if (G.lives <= 0) { if (other) { p.out = true; pop('SEM LIMITE!', other.x, other.y - 16, '#ff9a9a'); } else gameOver(); return; }
    G.lives--;
    place(p, other);
  }
  function updatePlayer(p, dt) {
    const L = G.L;
    if (p.out) return;
    if (p.dead) { p.deadT += dt; p.vy += GRAV * dt; p.y += p.vy * dt; if (p.deadT > 1.5) respawn(p); return; }
    const inp = G.state === 'play' ? getInput(p.i) : { l: false, r: false, j: p.onGround && (G.wonT + p.i * 0.3) % 0.8 < 0.1 };
    const jp = inp.j && !p.pj; p.pj = inp.j;
    if (p.inv > 0) p.inv -= dt;
    if (p.star > 0) { p.star -= dt; if (Math.random() < 0.5) part(p.x + Math.random() * p.w, p.y + Math.random() * p.h, 0, -30, 0.4, '#ffe38a', 2, 0); }
    const ice = p.onGround && p.gt === T.ICE, maxV = p.star > 0 ? 156 : WALK;
    const dir = p.stun > 0 ? 0 : (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
    if (p.stun > 0) p.stun -= dt;
    if (dir) {
      p.face = dir;
      p.vx += dir * (p.onGround ? (ice ? 300 : 1100) : 700) * dt;
      if (p.vx * dir > maxV) p.vx = dir * maxV;
    } else {
      const f = p.onGround ? (ice ? 120 : 1400) : 250, s = Math.sign(p.vx);
      p.vx -= s * f * dt; if (Math.sign(p.vx) !== s) p.vx = 0;
    }
    if (jp) { p.jbuf = 0.12; if (p.chute) p.chute = false; } else p.jbuf -= dt;
    if (p.onGround) p.coy = 0.09; else p.coy -= dt;
    if (p.jbuf > 0 && p.coy > 0) { p.vy = -JUMP; p.jbuf = 0; p.coy = 0; p.onGround = false; p.mover = null; sfx('jump'); }
    p.vy += (p.vy < 0 && !inp.j ? GRAV * 2.4 : GRAV) * dt;
    if (p.vy > 560) p.vy = 560;
    if (p.chute && p.vy > 55) p.vy = 55;
    let carry = 0;
    if (p.mover) { carry = p.mover.dx; p.y = p.mover.y - p.h; }
    moveX(p, p.vx * dt + carry);
    const minX = Math.max(0, G.cam), maxX = Math.min(L.W * TS, G.cam + VW) - p.w;
    if (p.x < minX) { p.x = minX; if (p.vx < 0) p.vx = 0; }
    if (p.x > maxX) { p.x = maxX; if (p.vx > 0) p.vx = 0; }
    p.pb = p.y + p.h;
    const wasG = p.onGround;
    moveY(p, p.vy * dt, true);
    if (p.onGround) { p.chute = false; if (!wasG) { part(p.x + 2, p.y + p.h, -30, -20, 0.25, 'rgba(255,255,255,0.7)', 2, 0); part(p.x + p.w - 2, p.y + p.h, 30, -20, 0.25, 'rgba(255,255,255,0.7)', 2, 0); } }
    if (p.y > LH + 30) { for (let k = 0; k < 8; k++) part(p.x + 5, LH - 16, (Math.random() - 0.5) * 100, -120 - Math.random() * 120, 0.6, L.theme.pitHi, 2, 500); kill(p); p.deadT = 0.6; }
    p.anim += Math.abs(p.vx) * dt;
  }
  function interplay() {
    if (G.players.length < 2) return;
    const [a, b] = G.players;
    if (!alive(a) || !alive(b)) return;
    const hop = (u, d) => {
      if (u.vy > 60 && u.pb <= d.y + 6 && u.x + u.w > d.x + 1 && u.x < d.x + d.w - 1 && u.y + u.h >= d.y && u.y + u.h < d.y + 12) {
        const held = getInput(u.i).j;
        u.y = d.y - u.h; u.vy = held ? -480 : -250; u.onGround = false;
        sfx('boing'); if (held) pop('PEZINHO!', u.x + 5, u.y - 6, u.color);
        return true;
      }
      return false;
    };
    if (!hop(a, b)) hop(b, a);
  }
  function hit(p, x, y, hw, hh) { return Math.abs(p.x + p.w / 2 - x) < hw + p.w / 2 && Math.abs(p.y + p.h / 2 - y) < hh + p.h / 2; }
  function collide() {
    const L = G.L, S = PF.sprites();
    for (const p of G.players) {
      if (!alive(p)) continue;
      for (const c of L.coins) if (!c.got && hit(p, c.x, c.y, 5, 5)) { c.got = true; addCoin(c.x, c.y); }
      for (const s of L.stamps) if (!s.got && hit(p, s.x, s.y, 7, 7)) { s.got = true; G.got[s.idx] = true; sfx('stamp'); sparkle(s.x, s.y, '#ff8a8a', 12); pop('CARIMBO!', s.x, s.y - 12, '#ffb3b3'); }
      for (const k of G.picks) if (!k.got && k.t > 0.25 && hit(p, k.x, k.y, 7, 6)) {
        k.got = true;
        if (k.kind === 'card') { G.players.forEach((q) => { if (alive(q)) q.star = 9; }); sfx('power'); pop('SEM JUROS!', k.x, k.y - 12, '#ffe38a'); }
        else {
          const tgt = p.hp < 3 ? p : G.players.find((q) => alive(q) && q.hp < 3);
          if (tgt) tgt.hp++;
          sfx('food'); pop(L.theme.foodName + (tgt ? '! +1 ♥' : '!'), k.x, k.y - 12, '#ffd0d0');
        }
        sparkle(k.x, k.y, '#ffffff', 8);
      }
      for (const c of L.checks) if (!c.on && Math.abs(p.x + 5 - c.x) < 14 && p.y + p.h > c.y - 44 && p.y < c.y) {
        c.on = true; G.check = { x: c.x, y: c.y }; sfx('check'); pop('CHECK-IN!', c.x, c.y - 40, '#ffe38a'); sparkle(c.x, c.y - 28, '#ffe38a', 10);
        G.players.forEach((q) => { if (q.out) place(q, p); });
      }
      if (Math.abs(p.x + 5 - L.goal.x) < 14 && p.y + p.h > L.goal.y - 44 && p.y < L.goal.y) { win(); return; }
      const tx0 = Math.floor((p.x + 2) / TS), tx1 = Math.floor((p.x + p.w - 2.01) / TS), ty = Math.floor((p.y + p.h - 1) / TS);
      for (let tx = tx0; tx <= tx1; tx++) if (tx >= 0 && tx < L.W && tile(tx, ty) === T.S && p.y + p.h > ty * TS + 7) { hurt(p, tx * TS + 8); break; }
      for (const e of G.enemies) {
        if (e.dead || e.gone || !e.active) continue;
        if (p.x + p.w <= e.x || p.x >= e.x + e.w || p.y + p.h <= e.y || p.y >= e.y + e.h) continue;
        if (p.star > 0) { e.dead = true; e.flip = true; e.vy = -220; e.vx = p.face * 80; G.kills++; sfx('stomp'); pop('+50', e.x + e.w / 2, e.y - 4); }
        else if (!e.spiky && p.vy > 0 && p.pb <= e.y + e.h * 0.65) {
          e.dead = true; G.kills++; sfx('stomp'); pop('+50', e.x + e.w / 2, e.y - 4);
          for (let k = 0; k < 5; k++) part(e.x + e.w / 2, e.y + e.h, (Math.random() - 0.5) * 140, -40 - Math.random() * 60, 0.35, '#ffffff', 2, 200);
          p.vy = getInput(p.i).j ? -JUMP * 0.96 : -270; p.y = e.y - p.h;
        } else hurt(p, e.x + e.w / 2);
        if (!alive(p)) break;
      }
    }
  }

  /* ---------------- inimigos ---------------- */
  function nearest(e) { let best = null, bd = 1e9; for (const p of G.players) if (alive(p)) { const d = Math.abs(p.x - e.x); if (d < bd) { bd = d; best = p; } } return best; }
  function updateEnemy(e, dt) {
    if (e.gone) return;
    if (e.dead) {
      e.deadT += dt;
      if (e.flip) { e.vy += GRAV * dt; e.y += e.vy * dt; e.x += e.vx * dt; }
      if (e.deadT > (e.flip ? 1.5 : 0.35)) e.gone = true;
      return;
    }
    if (!e.active) { if (e.x < G.cam + VW + 24) e.active = true; else return; }
    if (e.x < G.cam - VW) return;
    e.t += dt;
    if (e.ai === 'walk') {
      e.vy += GRAV * dt;
      moveX(e, e.dir * e.speed * dt); if (e.wall) e.dir = -e.dir;
      moveY(e, e.vy * dt);
      if (e.onGround) {
        const fx = e.dir > 0 ? e.x + e.w + 1 : e.x - 1, t = tile(Math.floor(fx / TS), Math.floor((e.y + e.h + 2) / TS));
        if (!(isSolid(t) || t === T.P)) e.dir = -e.dir;
      }
      e.face = e.dir;
    } else if (e.ai === 'fly') {
      const px = e.x;
      e.x = e.hx + Math.sin(e.t * e.speed) * e.range; e.y = e.hy + Math.sin(e.t * e.speed * 2.3) * 8;
      e.face = e.x >= px ? 1 : -1;
    } else if (e.ai === 'hop') {
      e.vy += GRAV * dt;
      if (e.onGround) {
        e.vx = 0; e.timer -= dt;
        if (e.timer <= 0) { const p = nearest(e), d = p ? Math.sign(p.x - e.x) || -1 : -1; e.face = d; e.vx = d * e.speed; e.vy = -e.jump; e.timer = e.wait; }
      }
      const vx = e.vx; moveX(e, vx * dt); if (!e.wall) e.vx = vx;
      moveY(e, e.vy * dt);
    } else { e.vy += GRAV * dt; moveY(e, e.vy * dt); }
    if (e.y > LH + 40) e.gone = true;
  }

  /* ---------------- câmera e passo de simulação ---------------- */
  function camTarget() {
    let s = 0, n = 0, f = 0;
    for (const p of G.players) if (alive(p)) { s += p.x + p.w / 2; f += p.face; n++; }
    if (!n) return G.cam;
    return clamp(s / n - VW / 2 + (G.players.length === 1 ? f * 22 : 0), 0, Math.max(0, G.L.W * TS - VW));
  }
  function snapCam() { G.cam = camTarget(); }
  function step(dt) {
    const L = G.L;
    G.t += dt;
    if (G.state === 'play') G.time += dt; else G.wonT += dt;
    for (const m of L.movers) {
      m.t += dt;
      const k = 0.5 - 0.5 * Math.cos(m.t * m.speed), nx = m.axis === 'x' ? m.x0 + m.range * k : m.x0, ny = m.axis === 'y' ? m.y0 - m.range * k : m.y0;
      m.dx = nx - m.x; m.dy = ny - m.y; m.py = m.y; m.x = nx; m.y = ny;
    }
    for (const p of G.players) updatePlayer(p, dt);
    if (G.state === 'play') { interplay(); for (const e of G.enemies) updateEnemy(e, dt); }
    if (G.state === 'play') collide();
    G.cam += (camTarget() - G.cam) * Math.min(1, dt * 5);
    for (const b of L.boxes) if (b.bump > 0) b.bump -= dt;
    for (const k of G.picks) { k.t += dt; if (k.y > k.ty) k.y = Math.max(k.ty, k.y - 50 * dt); }
    for (let i = G.parts.length - 1; i >= 0; i--) { const q = G.parts[i]; q.life -= dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.life <= 0) G.parts.splice(i, 1); }
    for (let i = G.pops.length - 1; i >= 0; i--) { const q = G.pops[i]; q.t += dt; q.y -= 22 * dt; if (q.t > 1.1) G.pops.splice(i, 1); }
    if (G.state === 'won' && G.wonT > 1.5 && !G.cardShown) { G.cardShown = true; screen('clear'); }
  }
  PF.step = step;

  /* ---------------- desenho ---------------- */
  function drawWorld() {
    const L = G.L, t = G.t, cam = Math.round(G.cam), S = PF.sprites(), th = L.theme, c = G.ts.c;
    G.bg.draw(wx, cam, t, VW);
    const tx0 = Math.max(0, Math.floor(cam / TS)), tx1 = Math.min(L.W - 1, Math.floor((cam + VW) / TS));
    for (let tx = tx0; tx <= tx1; tx++) {
      if (L.cols[tx].h) continue;
      const X = tx * TS - cam, Y = LH - 22 + OY + Math.round(Math.sin(t * 2 + tx * 0.9));
      wx.fillStyle = th.pit; wx.fillRect(X, Y, TS, VH - Y);
      wx.fillStyle = th.pitHi; wx.fillRect(X + (((t * 6 + tx * 5) % 12) | 0), Y, 5, 1); wx.fillRect(X + (((t * 4 + tx * 11) % 13) | 0), Y + 7, 3, 1);
    }
    wx.drawImage(G.static, cam, 0, VW, LH, 0, OY, VW, LH);
    for (const m of L.movers) {
      const X = Math.round(m.x - cam), Y = Math.round(m.y + OY);
      if (X > VW || X + m.w < 0) continue;
      if (th.mover === 'cable') { wx.fillStyle = 'rgba(27,36,64,0.5)'; wx.fillRect(X + 3, 0, 1, Y); wx.fillRect(X + m.w - 4, 0, 1, Y); }
      if (th.mover === 'log') {
        wx.fillStyle = '#6e4a2c'; wx.fillRect(X, Y, m.w, 8); wx.fillStyle = '#9a6b42'; wx.fillRect(X, Y, m.w, 3);
        wx.fillStyle = '#573820'; for (let k = 5; k < m.w - 4; k += 9) wx.fillRect(X + k, Y + 4, 4, 1);
        wx.fillStyle = '#dcbb8c'; wx.fillRect(X, Y + 1, 2, 6); wx.fillRect(X + m.w - 2, Y + 1, 2, 6);
      } else {
        wx.fillStyle = c.platLo; wx.fillRect(X, Y, m.w, 7); wx.fillStyle = c.plat; wx.fillRect(X, Y, m.w, 5);
        wx.fillStyle = 'rgba(255,255,255,0.45)'; wx.fillRect(X, Y, m.w, 1);
        wx.fillStyle = c.platLo; wx.fillRect(X + 2, Y + 2, 1, 1); wx.fillRect(X + m.w - 3, Y + 2, 1, 1);
      }
      wx.fillStyle = 'rgba(30,24,48,0.9)'; wx.fillRect(X, Y + (th.mover === 'log' ? 8 : 7), m.w, 1);
    }
    for (const b of L.boxes) {
      const X = b.tx * TS - cam; if (X > VW || X < -TS) continue;
      PF.spr(wx, b.used ? S.boxUsed : S.box, X, b.ty * TS + OY - (b.bump > 0 ? Math.sin((b.bump / 0.2) * Math.PI) * 5 : 0));
    }
    for (const q of L.coins) { if (q.got) continue; const X = q.x - cam; if (X < -8 || X > VW + 8) continue; PF.spr(wx, S.coin[Math.floor(t * 8 + q.x * 0.03) % 4], X - 5, q.y - 5 + OY); }
    const owned = prog(G.li).stamps;
    for (const s of L.stamps) { if (s.got) continue; wx.globalAlpha = owned[s.idx] ? 0.45 : 1; PF.spr(wx, S.stamp, s.x - 7 - cam, s.y - 7 + OY + Math.sin(t * 3 + s.idx) * 2); wx.globalAlpha = 1; }
    for (const k of G.picks) { if (k.got) continue; const s = k.kind === 'card' ? S.card : S.food[th.food]; PF.spr(wx, s, k.x - s.w / 2 - cam, k.y - s.h / 2 + OY + (k.y <= k.ty ? Math.sin(t * 4) * 1.5 : 0)); }
    for (const q of L.checks) { const s = S.check[q.on ? 1 + (Math.floor(t * 3) % 2) : 0]; PF.spr(wx, s, q.x - (s.w >> 1) - cam, q.y - s.h + OY); }
    { const s = S.goal[Math.floor(t * 2) % 2]; PF.spr(wx, s, L.goal.x - (s.w >> 1) - cam, L.goal.y - s.h + OY, true); }
    for (const e of G.enemies) {
      if (e.gone || !e.active) continue;
      const s = S.enemy[e.type][Math.floor(e.t * 7) % 2], X = Math.round(e.x + (e.w - s.w) / 2 - cam), Y = Math.round(e.y + e.h - s.h + OY);
      if (X > VW + 8 || X < -30) continue;
      if (e.dead && e.flip) { wx.save(); wx.translate(X + s.w / 2, Y + s.h / 2); wx.scale(1, -1); wx.drawImage(s.c, -s.w / 2 - 1, -s.h / 2 - 1); wx.restore(); }
      else if (e.dead) wx.drawImage(s.c, X - 1, Math.round(Y + s.h * 0.62), s.w + 2, Math.round((s.h + 2) * 0.38));
      else PF.spr(wx, s, X, Y, e.face > 0);
    }
    for (const p of G.players) {
      if (p.out || (p.dead && p.deadT > 1.45)) continue;
      if (!p.dead && p.inv > 0 && Math.floor(t * 14) % 2) continue;
      const f = p.frames, s = p.dead || !p.onGround ? f.jump : Math.abs(p.vx) > 12 ? (Math.floor(p.anim / 9) % 2 ? f.run1 : f.run0) : f.idle;
      const X = Math.round(p.x - 3 - cam), Y = Math.round(p.y - 2 + OY);
      if (p.star > 0 && (p.star > 2 || Math.floor(t * 10) % 2)) { wx.fillStyle = 'rgba(255,221,110,0.55)'; wx.beginPath(); wx.arc(X + 8, Y + 12, 15 + Math.sin(t * 16) * 2, 0, 7); wx.fill(); }
      if (p.chute) { wx.fillStyle = '#f6f8fc'; wx.fillRect(X - 1, Y - 6, 1, 8); wx.fillRect(X + 16, Y - 6, 1, 8); PF.spr(wx, S.chute, X - 3, Y - 16); }
      PF.spr(wx, s, X, Y, p.face < 0);
    }
    for (const q of G.parts) {
      if (q.coin) { PF.spr(wx, S.coin[Math.floor(t * 16) % 4], q.x - 5 - cam, q.y - 5 + OY); continue; }
      wx.globalAlpha = Math.min(1, (q.life / q.max) * 1.6); wx.fillStyle = q.col; wx.fillRect((q.x - cam) | 0, (q.y + OY) | 0, q.sz, q.sz);
    }
    wx.globalAlpha = 1;
    PF.weather(wx, th.weather, t, cam, VW);
  }
  function label(s, x, y, size, col, alpha) {
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.font = '700 ' + Math.round(size * scale) + 'px ' + FONT;
    ctx.lineWidth = Math.max(2, scale * 1.7); ctx.strokeStyle = '#1b2440';
    ctx.strokeText(s, x * scale, y * scale); ctx.fillStyle = col; ctx.fillText(s, x * scale, y * scale);
    ctx.globalAlpha = 1;
  }
  function overlay() {
    const cam = Math.round(G.cam), L = G.L;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
    const lp = G.players.filter(alive), close = lp.length === 2 && Math.abs(lp[0].x - lp[1].x) < 36 && Math.abs(lp[0].y - lp[1].y) < 24;
    lp.forEach((p, k) => label(p.name, p.x + 5 - cam, p.y - 5 + OY - (p.chute ? 16 : 0) - (close && k === 1 ? 9 : 0), 7, p.color));
    const gx = L.goal.x - cam;
    if (gx > -40 && gx < VW + 40 && G.state !== 'won') label('GRAVE O VÍDEO!', gx, L.goal.y - 44 + OY + Math.sin(G.t * 4) * 2, 8, '#ffffff');
    for (const q of G.pops) label(q.text, q.x - cam, q.y + OY, 7.5, q.col, clamp((1.1 - q.t) * 3, 0, 1));
  }
  function draw() {
    wx.imageSmoothingEnabled = false;
    const inLevel = G.L && (G.state === 'play' || G.state === 'pause' || G.state === 'won' || G.state === 'over');
    if (inLevel) drawWorld();
    else PF.background(G.menuBg).draw(wx, G.t * 16, G.t, VW);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(world, 0, 0, cv.width, cv.height);
    if (inLevel) overlay();
  }

  /* ---------------- HUD ---------------- */
  let hudC = {};
  function setTxt(id, v) { if (hudC[id] !== v) { hudC[id] = v; $(id).textContent = v; } }
  function updateHud() {
    if ($('hud').hidden || !G.L) return;
    [0, 1].forEach((i) => {
      const p = G.players[i], el = $('pt' + i), key = p ? p.name + '|' + p.hp + '|' + p.out + '|' + p.dead : 'none';
      if (hudC['pt' + i] === key) return;
      hudC['pt' + i] = key;
      el.hidden = !p; if (!p) return;
      const hp = Math.max(0, p.hp);
      el.firstElementChild.textContent = p.name; el.firstElementChild.style.color = p.color;
      el.lastElementChild.innerHTML = '♥'.repeat(hp) + '<i>' + '♥'.repeat(3 - hp) + '</i>';
      el.classList.toggle('out', p.out || p.dead);
    });
    setTxt('hCoins', String(G.coins));
    setTxt('hStamps', G.got.filter(Boolean).length + '/3');
    setTxt('hLives', '×' + G.lives);
  }

  /* ---------------- laço principal ---------------- */
  let last = 0, acc = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    const now = ts / 1000, dt = Math.min(0.1, now - last || 0); last = now;
    G.pads = readPads();
    const pa = G.pads.some((g) => g.start || g.a);
    if (pa && !padPrev) {
      PF.audio.unlock();
      if (G.state === 'play') { if (G.pads.some((g) => g.start)) pause(); }
      else if (G.state === 'pause') resume();
      else if (G.state === 'map') { const b = document.activeElement && document.activeElement.classList.contains('dest') ? document.activeElement : document.querySelector('.dest[data-i="' + G.sel + '"]'); if (b) b.click(); }
      else if (G.state !== 'won' || G.cardShown) { const b = document.querySelector('.screen:not([hidden]) .go'); if (b) b.click(); }
    }
    padPrev = pa;
    if (G.state === 'map') { const d = G.pads.some((g) => g.r) ? 1 : G.pads.some((g) => g.l) ? -1 : 0; if (d && !G.padMove) moveSel(d); G.padMove = d; }
    if (G.L && (G.state === 'play' || G.state === 'won')) {
      acc += dt; let n = 0;
      while (acc >= STEP && n < 5) { step(STEP); acc -= STEP; n++; if (!G.L || (G.state !== 'play' && G.state !== 'won')) break; }
      if (n === 5) acc = 0;
    } else G.t += dt;
    draw(); updateHud();
  }

  function boot(data) {
    loadSave();
    G.mode = save.mode; PF.audio.setMuted(save.muted);
    buildTitle(); resize();
    if (data && data.screen === 'map') goMap(); else goTitle();
    requestAnimationFrame(frame);
  }
  const hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) hot.snapshot(() => ({ screen: G.state === 'title' ? 'title' : 'map' }));
  if (hot && hot.ready) hot.ready(boot); else boot((hot && hot.data) || {});
})();
