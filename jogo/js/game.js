/* Parcelei e Fui — motor do jogo: entrada, física, co-op, câmera, telas e HUD. */
(function () {
  'use strict';
  const PF = window.PF, TS = PF.TS, HT = 17, VH = 270, LH = HT * TS, OY = VH - LH;
  const T = { G: 1, B: 2, P: 3, S: 4, QC: 5, QK: 6, QF: 7, QU: 8, ICE: 9, GATE: 10 };
  const GRAV = 1350, JUMP = 400, WALK = 130, STEP = 1 / 60;
  const FONT = "'Press Start 2P','Courier New',monospace";
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
    if (e.code === 'KeyM') toggleMute();
    if (G.state === 'play') {
      keys[e.code] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (e.code === 'Escape' || e.code === 'KeyP') pause();
      return;
    }
    if (G.state === 'intro') { if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); beginPlay(); } return; }
    if (G.state === 'won' && !G.cardShown) return;
    if (G.state === 'pause' && (e.code === 'Escape' || e.code === 'KeyP')) { resume(); return; }
    if (['ArrowUp', 'ArrowLeft', 'KeyW', 'KeyA'].includes(e.code)) { e.preventDefault(); menuMove(-1); }
    else if (['ArrowDown', 'ArrowRight', 'KeyS', 'KeyD'].includes(e.code)) { e.preventDefault(); menuMove(1); }
    else if ((e.code === 'Enter' || e.code === 'Space') && !(document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('mi'))) { e.preventDefault(); menuPress(); }
    else if (e.code === 'Escape' && G.state === 'map') goTitle();
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
        const ay = g.axes[1] || 0;
        out.push({ l: ax < -0.35 || b(14), r: ax > 0.35 || b(15), u: ay < -0.5 || b(12), d: ay > 0.5 || b(13), j: b(0) || b(1) || b(2) || b(3), start: b(9), a: b(0) });
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
      for (const q of PF.remote.input) { l = l || q.l; r = r || q.r; j = j || q.j; }
    } else if (i === 0) { l = k.KeyA; r = k.KeyD; j = k.KeyW || k.Space; g = P.length > 1 ? P[0] : null; }
    else { l = k.ArrowLeft; r = k.ArrowRight; j = k.ArrowUp || k.ShiftRight || k.Numpad0; g = P.length > 1 ? P[1] : P[0]; }
    if (g) { l = l || g.l; r = r || g.r; j = j || g.j; }
    if (G.mode === 2) { const q = PF.remote.input[i]; l = l || q.l; r = r || q.r; j = j || q.j; }
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
  const SCREENS = ['title', 'map', 'intro', 'phones', 'pause', 'clear', 'over', 'ending'];
  function screen(id) {
    SCREENS.forEach((s) => { $(s).hidden = s !== id; });
    if (id) { const b = $(id).querySelector('.go'); if (b) setTimeout(() => b.focus({ preventScroll: true }), 30); }
    else if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  function curScreen() { return SCREENS.find((s) => !$(s).hidden); }
  function menuItems() { const s = curScreen(); return s ? Array.from($(s).querySelectorAll('.mi:not(:disabled)')) : []; }
  function menuMove(d) {
    const it = menuItems(); if (!it.length) return;
    let k = it.indexOf(document.activeElement);
    k = k < 0 ? 0 : (k + d + it.length) % it.length;
    it[k].focus(); PF.audio.sfx('select');
  }
  function menuPress() {
    const it = menuItems(), a = document.activeElement, b = it.includes(a) ? a : it[0];
    if (b) b.click();
  }
  function setHud(on) { $('hud').hidden = !on; $('touch').hidden = !on || !isTouch || G.state !== 'play'; }
  function toggleMute() {
    save.muted = !save.muted; PF.audio.setMuted(save.muted); store();
    $('btnMute').setAttribute('aria-pressed', String(save.muted));
  }

  /* título */
  function drawSprite(c, s, x0, y0) {
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    if (x0 == null) { x.clearRect(0, 0, c.width, c.height); x.drawImage(s.c, 0, 0, s.c.width, s.c.height, 0, 0, c.width, c.height); }
    else x.drawImage(s.c, x0, y0);
  }
  const KEYS2 = ['Teclas A D anda · W pula', 'Setas anda · seta pra cima pula'];
  const KEYS1 = 'A D ou setas anda · W, espaço ou seta pra cima pula';
  const BIO = ['O planejador da dupla: passagem, hospedagem e roteiro são com ele.', 'Escolhe os lugares, monta os looks e acha que é só passar o cartão.'];
  function showCast(b) {
    const m = +b.dataset.mode, so = +(b.dataset.solo || 0);
    document.querySelectorAll('.hero').forEach((h) => {
      const c = +h.dataset.c;
      h.classList.toggle('dim', m === 1 && c !== so);
      h.querySelector('.hero-keys').textContent = isTouch ? '' : m === 1 ? KEYS1 : KEYS2[c];
    });
  }
  function buildTitle() {
    $('cast').innerHTML = [0, 1].map((c) =>
      '<div class="box hero" data-c="' + c + '"><canvas width="18" height="26" aria-hidden="true"></canvas><div>' +
      '<p class="hero-name">' + PF.HEROES[c].name + '</p><p class="hero-bio">' + BIO[c] + '</p><p class="hero-keys"></p></div></div>').join('');
    document.querySelectorAll('.hero canvas').forEach((c, i) => drawSprite(c, PF.heroFrames(i, 'py').idle));
    document.querySelectorAll('#title .mi[data-mode]').forEach((b) => {
      b.addEventListener('focus', () => showCast(b));
      b.addEventListener('mouseenter', () => showCast(b));
      b.addEventListener('click', () => {
        save.mode = G.mode = +b.dataset.mode; save.solo = +(b.dataset.solo || 0); store();
        PF.audio.sfx('select'); goMap();
      });
    });
    $('press').textContent = isTouch ? 'Toque numa opção' : 'Aperte Enter';
    $('btnBack').onclick = () => goTitle();
    $('btnPhones').onclick = () => openPhones('title');
    $('btnPhonesP').onclick = () => openPhones('pause');
    $('btnPhonesBack').onclick = closePhones;
    PF.remote.onchange = remoteChanged;
    PF.remote.onbutton = remoteButton;
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

  /* controles no celular */
  let toastT = null;
  function toast(text) {
    const el = $('toast'); el.textContent = text; el.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 2600);
  }
  function openPhones(from) {
    G.phonesFrom = from; G.state = 'phones';
    PF.audio.unlock(); PF.remote.open();
    renderPhones(true); screen('phones');
  }
  function closePhones() {
    if (G.phonesFrom === 'pause' && G.L) { G.state = 'pause'; screen('pause'); }
    else goTitle();
  }
  let qrRoom = null;
  function renderPhones(force) {
    const R = PF.remote;
    document.querySelectorAll('#phones .qr').forEach((el) => {
      const p = +el.dataset.p, img = el.querySelector('.qr-img'), st = el.querySelector('.qr-st'), ok = R.connected(p);
      if (R.room && (force || qrRoom !== R.room)) img.innerHTML = R.qrSvg(R.url(p));
      else if (!R.room) img.textContent = R.error ? 'Sem código' : 'Gerando código…';
      st.textContent = ok ? 'Conectado!' : R.room ? 'Esperando o celular' : '';
      st.classList.toggle('ok', ok); el.classList.toggle('ok', ok);
    });
    qrRoom = R.room;
    $('phonesMsg').textContent = R.error ? R.error + ' Na prévia do claude.ai os controles pelo celular não funcionam: abra o jogo pelo site.' : 'O celular e o computador precisam de internet. No mesmo Wi-Fi a resposta fica mais rápida. Dá pra continuar usando o teclado junto.';
  }
  const lastConn = [false, false];
  function remoteChanged() {
    for (let p = 0; p < 2; p++) {
      const ok = PF.remote.connected(p);
      if (ok !== lastConn[p]) toast('Controle ' + (p ? 'da Mari' : 'do Patryck') + (ok ? ' conectado' : ' desconectado'));
      lastConn[p] = ok;
    }
    if (!$('phones').hidden) renderPhones(false);
  }
  function remoteButton(p, b) {
    if (b === 'pause') { if (G.state === 'play') pause(); else if (G.state === 'pause') resume(); return; }
    if (G.state === 'play' || G.state === 'phones') return;
    if (G.state === 'intro') { if (b === 'a') beginPlay(); return; }
    if (G.state === 'won' && !G.cardShown) return;
    if (b === 'a') menuPress(); else menuMove(b === 'left' ? -1 : 1);
  }
  let stT = 0;
  function remoteStatus(dt) {
    stT -= dt; if (stT > 0 || !PF.remote.peer) return;
    stT = 0.5; PF.remote.tick();
    for (let c = 0; c < 2; c++) {
      if (!PF.remote.connected(c)) continue;
      const pl = G.L && (G.state === 'play' || G.state === 'pause' || G.state === 'intro') ? (G.mode === 2 ? G.players[c] : G.players[0]) : null;
      PF.remote.send(c, { t: 'st', hp: pl ? Math.max(0, pl.hp) : null });
    }
  }
  function buzz(p) {
    if (G.mode === 2) PF.remote.send(p.i, { t: 'buzz' });
    else { PF.remote.send(0, { t: 'buzz' }); PF.remote.send(1, { t: 'buzz' }); }
  }

  /* roteiro: mapa + lista de destinos */
  const GEO = [[-14, -39], [-18, -39.5], [-22, -41], [-23, -43.5], [-24.3, -46.8], [-25.8, -48.6], [-28.6, -48.9], [-31.5, -51.5], [-34, -53.6], [-34.9, -56.2], [-34.3, -58.4], [-36.4, -56.8], [-38.2, -57.7], [-39, -62], [-41, -63.2], [-42.6, -64.5], [-45, -66.5], [-47.2, -66], [-50.2, -69], [-52.4, -68.6], [-54.8, -66.5], [-55.2, -69.5], [-53.5, -72.5], [-50, -75.2], [-46.5, -75.4], [-42, -74], [-37, -73.6], [-33, -71.7], [-27, -71], [-20, -70.2], [-18.3, -70.4], [-16.5, -72.8], [-14, -76.3]];
  const prj = (la, lo) => [Math.round((lo + 78) * 10), Math.round((-la - 14) * 10)];
  const NODES = [
    { la: -23.55, lo: -46.63, lx: 12, ly: 4, an: 'start', s: 'São Paulo' },
    { la: -27.0, lo: -48.63, lx: 12, ly: 9, an: 'start', s: 'B. Camboriú' },
    { la: -41.13, lo: -71.3, lx: 12, ly: 4, an: 'start', s: 'Bariloche' },
    { la: -34.6, lo: -58.4, lx: 12, ly: 9, an: 'start', s: 'Buenos Aires' },
    { la: -26.4, lo: -53.5, lx: -11, ly: 16, an: 'end', s: 'Foz do Iguaçu' },
    { la: -24.3, lo: -55.7, lx: -11, ly: -4, an: 'end', s: 'Paraguai' },
  ];
  function buildMap() {
    const P = NODES.map((n) => prj(n.la, n.lo));
    let h = '<rect width="460" height="430" fill="#1d4f86"/>';
    for (let y = 8; y < 430; y += 16) h += '<rect x="' + ((y * 7) % 60) + '" y="' + y + '" width="460" height="2" fill="#2a5f99" opacity=".5"/>';
    [20, 30, 40, 50].forEach((la) => { const y = (la - 14) * 10; h += '<text class="sm" x="452" y="' + (y - 4) + '" text-anchor="end">' + la + '°S</text>'; });
    h += '<polygon points="' + GEO.map(([la, lo]) => prj(la, lo).join(',')).join(' ') + '" fill="#3a6a34" stroke="#09160d" stroke-width="4" stroke-linejoin="miter"/>';
    for (let i = 0; i < P.length - 1; i++) {
      const d = prog(i).done;
      h += '<line x1="' + P[i][0] + '" y1="' + P[i][1] + '" x2="' + P[i + 1][0] + '" y2="' + P[i + 1][1] + '" stroke="' + (d ? '#ff650e' : '#ffffff') + '" stroke-width="4"' + (d ? '' : ' stroke-dasharray="4 6" opacity=".7"') + '/>';
    }
    P.forEach((p, i) => {
      const n = NODES[i], d = prog(i).done, open = unlocked(i);
      if (i === G.sel) h += '<rect x="' + (p[0] - 12) + '" y="' + (p[1] - 12) + '" width="24" height="24" fill="none" stroke="#ffd34d" stroke-width="3"><animate attributeName="opacity" values="1;0" dur=".8s" calcMode="discrete" repeatCount="indefinite"/></rect>';
      h += '<rect x="' + (p[0] - 7) + '" y="' + (p[1] - 7) + '" width="14" height="14" fill="' + (d ? '#ff650e' : open ? '#ffd34d' : '#4c6148') + '" stroke="#09160d" stroke-width="3"/>';
      h += '<text x="' + (p[0] + n.lx) + '" y="' + (p[1] + n.ly) + '" text-anchor="' + n.an + '">' + (i + 1) + ' ' + n.s + '</text>';
    });
    h += '<text class="sm" x="300" y="330">Oceano Atlântico</text><text class="sm" x="6" y="420">Oceano Pacífico</text>';
    $('mapSvg').innerHTML = h;
  }
  function buildDests() {
    const ol = $('dests'); ol.innerHTML = '';
    let total = 0, st = 0;
    PF.THEMES.forEach((th, i) => {
      const p = prog(i), open = unlocked(i), n = p.stamps.filter(Boolean).length;
      total += p.best; st += n;
      const li = document.createElement('li'), b = document.createElement('button');
      b.type = 'button'; b.className = 'mi dest' + (p.done ? ' done' : ''); b.disabled = !open; b.dataset.i = i;
      b.innerHTML = '<span class="city"></span><span class="st" role="img" aria-label="' + n + ' de 3 carimbos">' + p.stamps.map((s) => '<i class="' + (s ? 'on' : '') + '"></i>').join('') + '</span><span class="sub"></span>';
      b.querySelector('.city').textContent = (i + 1) + ' ' + th.name;
      b.querySelector('.sub').textContent = !open ? 'Trancado: quite a parcela anterior' : p.done ? 'Quitada · ' + fmt(p.best) + ' inscritos' : 'Parcela ' + (i + 1) + ' de 6 em aberto';
      b.addEventListener('click', () => startLevel(i));
      const pick = () => { if (G.sel !== i) { G.sel = i; G.menuBg = th.id; buildMap(); } };
      b.addEventListener('focus', pick); b.addEventListener('mouseenter', pick);
      li.appendChild(b); ol.appendChild(li);
    });
    $('mapTotals').textContent = 'Inscritos ' + String(total).padStart(6, '0') + ' · Carimbos ' + st + '/18';
  }
  function goTitle() {
    G.state = 'title'; G.L = null; setHud(false); screen('title'); G.menuBg = 'sp'; PF.audio.music('menu');
    const b = document.querySelector('#title .mi[data-mode="' + save.mode + '"]' + (save.mode === 1 ? '[data-solo="' + save.solo + '"]' : ''));
    if (b) setTimeout(() => b.focus({ preventScroll: true }), 40);
  }
  function goMap(sel) {
    G.state = 'map'; G.L = null; setHud(false);
    let s = sel == null ? 0 : sel;
    if (sel == null) for (let i = 0; i < PF.LEVEL_COUNT; i++) if (unlocked(i)) s = i;
    while (s > 0 && !unlocked(s)) s--;
    G.sel = s; G.menuBg = PF.THEMES[s].id;
    buildMap(); buildDests(); screen('map');
    setTimeout(() => { const b = document.querySelector('.dest[data-i="' + s + '"]'); if (b) b.focus({ preventScroll: true }); }, 40);
    PF.audio.music('menu');
  }
  function showEnding() {
    G.state = 'ending'; G.L = null; setHud(false);
    let total = 0, st = 0;
    for (let i = 0; i < PF.LEVEL_COUNT; i++) { total += prog(i).best; st += prog(i).stamps.filter(Boolean).length; }
    $('endText').textContent = (G.mode === 2 ? 'O Patryck reservou as passagens, a Mari escolheu os lugares e montou os looks, e os dois rodaram de São Paulo ao Paraguai pagando todas as parcelas. ' : save.solo === 0 ? 'O Patryck reservou tudo, fez o roteiro e rodou de São Paulo ao Paraguai pagando todas as parcelas. ' : 'A Mari escolheu cada lugar, montou cada look e rodou de São Paulo ao Paraguai. Bastou passar o cartão. ') + (st === 18 ? 'Passaporte completo, todos os carimbos!' : 'Ainda faltam carimbos no passaporte: dá pra voltar e buscar.');
    $('endTally').innerHTML = '<div><dt>Destinos</dt><dd>6/6</dd></div><div><dt>Carimbos</dt><dd>' + st + '/18</dd></div><div class="sum"><dt>Inscritos</dt><dd>' + fmt(total) + '</dd></div>';
    screen('ending'); PF.audio.music('menu');
  }
  function showIntro() {
    const th = G.L.theme;
    $('introWorld').textContent = 'Parcela ' + (G.li + 1) + ' de 6';
    $('introName').textContent = th.name;
    $('introSub').textContent = th.sub;
    $('introLives').textContent = '× ' + G.lives;
    const c = $('introCast'); c.getContext('2d').clearRect(0, 0, c.width, c.height);
    G.players.forEach((p, k) => drawSprite(c, p.frames.idle, G.players.length === 2 ? 1 + k * 20 : 11, 2));
    G.state = 'intro'; G.introT = 0; screen('intro'); setHud(true);
  }
  function beginPlay() {
    if (G.state !== 'intro') return;
    for (const k in keys) keys[k] = false;
    G.state = 'play'; acc = 0; screen(null); setHud(true); buildTouch(); PF.audio.music(G.L.theme.tune);
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
    hudC = {}; acc = 0; PF.audio.music(null);
    showIntro();
  }
  PF.startLevel = startLevel;
  function pause() { if (G.state !== 'play') return; G.state = 'pause'; screen('pause'); }
  function resume() { if (G.state !== 'pause') return; for (const k in keys) keys[k] = false; G.state = 'play'; screen(null); }
  function gameOver() { G.state = 'over'; PF.audio.music(null); PF.audio.sfx('over'); screen('over'); }
  function win() {
    if (G.state !== 'play') return;
    G.state = 'won'; G.wonT = 0; G.cardShown = false;
    PF.audio.music(null); PF.audio.sfx('win');
    const st = G.got.filter(Boolean).length, rem = Math.max(0, 300 - Math.floor(G.time)), tb = rem * 5;
    const total = G.coins * 10 + G.kills * 50 + st * 500 + tb + 1000;
    const p = prog(G.li);
    p.done = true; p.best = Math.max(p.best, total); G.got.forEach((g, k) => { if (g) p.stamps[k] = true; });
    store();
    $('clearEyebrow').textContent = 'Parcela ' + (G.li + 1) + ' de 6 quitada · ' + G.L.theme.name;
    $('tally').innerHTML =
      '<div><dt>Moedas ' + G.coins + '×10</dt><dd>' + fmt(G.coins * 10) + '</dd></div>' +
      '<div><dt>Perrengues ' + G.kills + '×50</dt><dd>' + fmt(G.kills * 50) + '</dd></div>' +
      '<div><dt>Carimbos ' + st + '×500</dt><dd>' + fmt(st * 500) + '</dd></div>' +
      '<div><dt>Tempo ' + rem + '×5</dt><dd>' + fmt(tb) + '</dd></div>' +
      '<div><dt>Vídeo no ar</dt><dd>1.000</dd></div>' +
      '<div class="sum"><dt>Novos inscritos</dt><dd>+' + fmt(total) + '</dd></div>';
    $('btnNext').textContent = G.li === PF.LEVEL_COUNT - 1 ? 'Ver o final' : 'Próximo destino';
    for (let k = 0; k < 24; k++) part(G.L.goal.x, G.L.goal.y - 30, (Math.random() - 0.5) * 220, -80 - Math.random() * 200, 1.4, ['#ffc93c', '#ff5a5f', '#19b5a5', '#ffffff'][k % 4], 2, 500);
  }

  /* ---------------- colisão com o cenário ---------------- */
  function tile(tx, ty) {
    const L = G.L;
    if (tx < 0 || tx >= L.W) return T.G;
    if (ty < 0 || ty >= HT) return 0;
    return L.tiles[ty * L.W + tx];
  }
  const isSolid = (t) => t === T.G || t === T.B || t === T.ICE || t === T.GATE || (t >= T.QC && t <= T.QU);
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
    buzz(p);
    p.dead = true; p.deadT = 0; p.vy = -290; p.vx = 0; p.hp = 0; p.mover = null; p.chute = false; p.star = 0;
    sfx('die');
  }
  function hurt(p, fromX) {
    if (p.inv > 0 || p.star > 0 || !alive(p) || G.god) return;
    p.hp--;
    if (p.hp <= 0) { kill(p); return; }
    buzz(p);
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
    moveX(p, p.vx * dt + carry); crateX(p);
    const minX = Math.max(0, G.cam), maxX = Math.min(L.W * TS, G.cam + VW) - p.w;
    if (p.x < minX) { p.x = minX; if (p.vx < 0) p.vx = 0; }
    if (p.x > maxX) { p.x = maxX; if (p.vx > 0) p.vx = 0; }
    p.pb = p.y + p.h;
    const wasG = p.onGround;
    moveY(p, p.vy * dt, true); crateY(p, p.pb);
    if (p.onGround) { p.chute = false; if (!wasG) { part(p.x + 2, p.y + p.h, -30, -20, 0.25, 'rgba(255,255,255,0.7)', 2, 0); part(p.x + p.w - 2, p.y + p.h, 30, -20, 0.25, 'rgba(255,255,255,0.7)', 2, 0); } }
    if (p.y > LH + 30) { for (let k = 0; k < 8; k++) part(p.x + 5, LH - 16, (Math.random() - 0.5) * 100, -120 - Math.random() * 120, 0.6, L.theme.pitHi, 2, 500); kill(p); p.deadT = 0.6; }
    p.anim += Math.abs(p.vx) * dt;
  }
  function interplay() {
    if (G.players.length < 2) return;
    const [a, b] = G.players;
    if (!alive(a) || !alive(b)) return;
    const hop = (u, d) => {
      if (u.vy > 40 && u.pb <= d.y + 8 && u.x + u.w > d.x - 4 && u.x < d.x + d.w + 4 && u.y + u.h >= d.y - 1 && u.y + u.h < d.y + 14) {
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
        if (k.kind === 'card') { G.players.forEach((q) => { if (alive(q)) q.star = 9; }); sfx('power'); pop(p.c === 1 ? 'É SÓ PASSAR O CARTÃO!' : 'SEM JUROS!', k.x, k.y - 12, '#ffe38a'); }
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
      moveX(e, e.dir * e.speed * dt); crateX(e); if (e.wall) e.dir = -e.dir;
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

  /* ---------------- trechos cooperativos ---------------- */
  function onSwitch(p, q) { return alive(p) && p.onGround && p.x + p.w > q.x + 2 && p.x < q.x + q.w - 2 && Math.abs(p.y + p.h - q.y) < 3; }
  function coopStep(dt) {
    const L = G.L;
    G.coop = G.players.filter((p) => !p.out).length >= 2;
    for (const q of L.switches) {
      const was = q.pressed;
      q.pressed = G.players.some((p) => onSwitch(p, q));
      if (q.pressed && !was) sfx('box');
    }
    for (const g of L.gates) {
      const bridge = g.kind === 'bridge';
      if (L.switches.some((q) => q.id === g.id && q.pressed)) g.timer = G.coop ? 0.15 : bridge ? 4 : 3.5;
      else g.timer -= dt;
      let inside;
      if (bridge) {
        const x0 = g.tx * TS, x1 = (g.tx1 + 1) * TS, top = g.ty0 * TS;
        inside = G.players.some((p) => alive(p) && p.onGround && p.x + p.w > x0 && p.x < x1 && Math.abs(p.y + p.h - top) < 2);
      } else {
        const x0 = g.tx * TS, y0 = g.ty0 * TS, y1 = (g.ty1 + 1) * TS;
        inside = G.players.some((p) => alive(p) && p.x + p.w > x0 && p.x < x0 + TS && p.y + p.h > y0 && p.y < y1);
      }
      const want = g.timer > 0 || (inside && g.open > 0.2) ? 1 : 0, before = g.open;
      g.open = clamp(g.open + (want ? (bridge ? 3 : 5) : -4) * dt, 0, 1);
      if (before === 0 && g.open > 0) sfx('select');
      if (bridge) { for (let tx = g.tx; tx <= g.tx1; tx++) L.tiles[g.ty0 * L.W + tx] = g.open >= 0.5 ? T.P : 0; }
      else { const solid = g.open < 0.5; for (let r = g.ty0; r <= g.ty1; r++) L.tiles[r * L.W + g.tx] = solid ? T.GATE : 0; }
    }
    // mala pesada: no modo cooperativo só anda com os dois empurrando
    for (const c of L.crates) {
      const n = [0, 0];
      for (const p of G.players) {
        if (!alive(p) || !p.onGround || G.state !== 'play') continue;
        const inp = getInput(p.i), d = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
        if (!d || !(p.y + p.h > c.y + 2 && p.y < c.y + c.h)) continue;
        if (d > 0 && Math.abs(p.x + p.w - c.x) < 2) n[1]++;
        if (d < 0 && Math.abs(p.x - (c.x + c.w)) < 2) n[0]++;
      }
      const need = G.coop ? 2 : 1;
      c.vx = n[1] >= need ? 42 : n[0] >= need ? -42 : 0;
      if ((n[0] || n[1]) && !c.vx && G.t - (c.hintT || 0) > 1.4) { c.hintT = G.t; pop('PESADA! CHAMA O OUTRO!', c.x + c.w / 2, c.y - 6, '#ffd34d'); }
      moveX(c, c.vx * dt);
      c.vy = Math.min(560, c.vy + GRAV * dt); moveY(c, c.vy * dt);
      if (c.vx && !c.wall && Math.random() < 0.35) part(c.x + (c.vx > 0 ? 2 : c.w - 2), c.y + c.h, -Math.sign(c.vx) * 40, -30, 0.3, 'rgba(255,255,255,0.7)', 2, 0);
    }
  }
  function crateX(e) {
    for (const c of G.L.crates) {
      if (e === c || e.y + e.h <= c.y + 0.5 || e.y >= c.y + c.h || e.x + e.w <= c.x || e.x >= c.x + c.w) continue;
      e.x = e.x + e.w / 2 < c.x + c.w / 2 ? c.x - e.w : c.x + c.w;
      e.vx = 0; e.wall = true;
    }
  }
  function crateY(e, pb) {
    for (const c of G.L.crates) {
      if (e.x + e.w <= c.x + 0.5 || e.x >= c.x + c.w - 0.5) continue;
      if (e.vy >= 0 && pb <= c.y + 0.5 && e.y + e.h > c.y) { e.y = c.y - e.h; e.vy = 0; e.onGround = true; e.gt = 0; }
      else if (e.vy < 0 && e.y < c.y + c.h && e.y + e.h > c.y + c.h) { e.y = c.y + c.h; e.vy = 0; }
    }
  }
  const LINK = { a: '#ff650e', b: '#93c06c', c: '#ffd34d', d: '#ff8fc7' };
  function drawCoop(cam, t) {
    const L = G.L;
    for (const g of L.gates) {
      if (g.kind === 'bridge') {
        const X0 = g.tx * TS - cam, len = (g.tx1 - g.tx + 1) * TS, Y = g.ty0 * TS + OY, show = Math.round(len * g.open), col = LINK[g.id] || '#ffd34d';
        if (X0 > VW || X0 + len < 0) continue;
        wx.fillStyle = '#3a3f52'; wx.fillRect(X0 - 2, Y - 10, 2, 12); wx.fillRect(X0 + len, Y - 10, 2, 12);
        for (let k = 0; k < show; k += 6) { wx.fillStyle = '#09160d'; wx.fillRect(X0 + k, Y, 6, 6); wx.fillStyle = (k / 6) % 2 ? '#b07e50' : '#9a6b42'; wx.fillRect(X0 + k, Y + 1, 5, 4); }
        if (show > 0) { wx.fillStyle = col; wx.fillRect(X0, Y - 8, show, 1); wx.fillStyle = 'rgba(9,22,13,0.6)'; for (let k = 0; k < show; k += 12) wx.fillRect(X0 + k, Y - 8, 1, 8); }
        continue;
      }
      const X = g.tx * TS - cam; if (X < -TS || X > VW) continue;
      const top = g.ty0 * TS + OY, bot = (g.ty1 + 1) * TS + OY, hgt = bot - top, vis = Math.round(hgt * (1 - g.open)), col = LINK[g.id] || '#ff650e';
      wx.fillStyle = '#3a3f52'; wx.fillRect(X + 1, top - 4, 14, 4); wx.fillRect(X + 1, bot - 3, 14, 3);
      for (let y = bot - vis; y < bot - 3; y += 4) { wx.fillStyle = ((y - top) >> 2) % 2 ? '#ffffff' : col; wx.fillRect(X + 4, y, 8, 4); }
      wx.fillStyle = '#09160d'; wx.fillRect(X + 3, bot - vis, 1, vis - 3); wx.fillRect(X + 12, bot - vis, 1, vis - 3);
      if (g.open < 0.5 && Math.floor(t * 2) % 2) { wx.fillStyle = '#ff2a2a'; wx.fillRect(X + 6, top - 3, 4, 2); }
      else if (g.open >= 0.5) { wx.fillStyle = '#4cff6a'; wx.fillRect(X + 6, top - 3, 4, 2); }
    }
    const S = PF.sprites();
    for (const c of L.crates) { const X = Math.round(c.x - 1 - cam), Y = Math.round(c.y + c.h - 32 + OY); if (X > VW || X < -34) continue; PF.spr(wx, S.bigBag, X, Y); }
    for (const q of L.switches) {
      const X = q.x - cam; if (X < -TS || X > VW) continue;
      const Y = q.y + OY, col = LINK[q.id] || '#ff650e', d = q.pressed ? 2 : 0;
      wx.fillStyle = '#09160d'; wx.fillRect(X + 1, Y - 3, 14, 3);
      wx.fillStyle = '#5a6078'; wx.fillRect(X + 2, Y - 2, 12, 2);
      wx.fillStyle = '#09160d'; wx.fillRect(X + 3, Y - 7 + d, 10, 5 - d);
      wx.fillStyle = q.pressed ? '#4cff6a' : col; wx.fillRect(X + 4, Y - 6 + d, 8, 3 - d);
      wx.fillStyle = 'rgba(255,255,255,0.7)'; wx.fillRect(X + 5, Y - 6 + d, 2, 1);
    }
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
    coopStep(dt);
    for (const m of L.movers) {
      m.t += dt;
      let nx, ny;
      if (m.kind === 'lift') {
        // no modo cooperativo o elevador sobe com o botão; sozinho, sobe quando alguém fica em cima
        const up = G.coop ? L.switches.some((q) => q.id === m.id && q.pressed) : G.players.some((q) => q.mover === m && alive(q));
        m.k = clamp(m.k + (up ? 0.9 : -0.7) * dt, 0, 1);
        nx = m.x0; ny = m.y0 - m.range * m.k;
      } else {
        const k = 0.5 - 0.5 * Math.cos(m.t * m.speed);
        nx = m.axis === 'x' ? m.x0 + m.range * k : m.x0; ny = m.axis === 'y' ? m.y0 - m.range * k : m.y0;
      }
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
      if (m.kind === 'lift') {
        const base = Math.round(m.y0 + OY + 4), col = LINK[m.id] || '#93c06c';
        wx.fillStyle = '#3a3f52'; wx.fillRect(X + 2, Y + 6, 2, base - Y - 6); wx.fillRect(X + m.w - 4, Y + 6, 2, base - Y - 6);
        wx.fillStyle = '#09160d'; wx.fillRect(X, Y, m.w, 7);
        for (let k = 0; k < m.w; k += 4) { wx.fillStyle = (k >> 2) % 2 ? '#09160d' : col; wx.fillRect(X + k, Y + 1, 4, 3); }
        wx.fillStyle = '#ffd34d'; wx.fillRect(X, Y + 4, m.w, 2);
        continue;
      }
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
    drawCoop(cam, t);
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
    ctx.font = Math.round(size * scale) + 'px ' + FONT;
    ctx.lineWidth = Math.max(3, scale * 2); ctx.strokeStyle = '#09160d';
    ctx.strokeText(s, x * scale, y * scale); ctx.fillStyle = col; ctx.fillText(s, x * scale, y * scale);
    ctx.globalAlpha = 1;
  }
  function overlay() {
    const cam = Math.round(G.cam), L = G.L;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'miter';
    const lp = G.players.filter(alive), close = lp.length === 2 && Math.abs(lp[0].x - lp[1].x) < 36 && Math.abs(lp[0].y - lp[1].y) < 24;
    lp.forEach((p, k) => label(p.name.toUpperCase(), p.x + 5 - cam, p.y - 5 + OY - (p.chute ? 16 : 0) - (close && k === 1 ? 8 : 0), 5, p.color));
    if (G.coop && G.state === 'play') for (const h of L.hints) {
      const hx = h.x - cam;
      if (hx < -60 || hx > VW + 60 || !G.players.some((p) => alive(p) && Math.abs(p.x - h.x) < 140)) continue;
      if (Math.floor(G.t * 2.5) % 3 < 2) label(h.text, hx, h.y + OY, 5, '#ffd34d');
    }
    const gx = L.goal.x - cam;
    if (gx > -40 && gx < VW + 40 && G.state !== 'won') label('GRAVE O VÍDEO!', gx, L.goal.y - 42 + OY + (Math.floor(G.t * 3) % 2) * 2, 6, '#ffffff');
    for (const q of G.pops) label(q.text.toUpperCase(), q.x - cam, q.y + OY, 5, q.col, clamp((1.1 - q.t) * 3, 0, 1));
  }
  function draw() {
    wx.imageSmoothingEnabled = false;
    const inLevel = G.L && (G.state === 'play' || G.state === 'pause' || G.state === 'won' || G.state === 'over' || G.state === 'intro' || G.state === 'phones');
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
      el.lastElementChild.innerHTML = '<i class="ht"></i>'.repeat(hp) + '<i class="ht off"></i>'.repeat(3 - hp);
      el.lastElementChild.setAttribute('aria-label', hp + ' de 3 corações');
      el.classList.toggle('out', p.out || p.dead);
    });
    const st = G.got.filter(Boolean).length;
    setTxt('hScore', String(G.coins * 10 + G.kills * 50 + st * 500).padStart(6, '0'));
    setTxt('hCoins', String(G.coins).padStart(2, '0'));
    setTxt('hStamps', st + '/3');
    setTxt('hWorld', (G.li + 1) + '/6');
    setTxt('hTime', String(Math.max(0, 300 - Math.floor(G.time))).padStart(3, '0'));
    setTxt('hLives', '×' + G.lives);
  }

  /* ---------------- laço principal ---------------- */
  let last = 0, acc = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    const now = ts / 1000, dt = Math.min(0.1, now - last || 0); last = now;
    G.pads = readPads();
    const P = G.pads, any = (k) => P.some((g) => g[k]);
    const pa = any('start') || any('a'), dir = any('u') || any('l') ? -1 : any('d') || any('r') ? 1 : 0;
    if (pa && !padPrev) {
      PF.audio.unlock();
      if (G.state === 'play') { if (any('start')) pause(); }
      else if (G.state === 'intro') beginPlay();
      else if (G.state !== 'won' || G.cardShown) menuPress();
    }
    padPrev = pa;
    if (G.state !== 'play' && G.state !== 'intro' && G.state !== 'won' && dir && dir !== G.padMove) menuMove(dir);
    G.padMove = dir;
    if (G.state === 'intro') { G.introT += dt; if (G.introT > 2.6) beginPlay(); }
    if (G.L && (G.state === 'play' || G.state === 'won')) {
      acc += dt; let n = 0;
      while (acc >= STEP && n < 5) { step(STEP); acc -= STEP; n++; if (!G.L || (G.state !== 'play' && G.state !== 'won')) break; }
      if (n === 5) acc = 0;
    } else G.t += dt;
    draw(); updateHud(); remoteStatus(dt);
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
