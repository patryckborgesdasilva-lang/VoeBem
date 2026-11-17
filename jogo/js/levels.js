/* Parcelei e Fui — fases.
   Cada fase é montada da esquerda para a direita com um construtor:
     b.flat(largura, itens, {ice})  chão na altura atual
     b.gap(largura, itens)          buraco
     b.up(n)                        muda a altura do chão (em tiles)
   Itens usam posição relativa ao início do trecho (dx) e altura acima do chão (up):
     ['c', dx, up, n]            n moedas em linha
     ['a', dx, up, n]            n moedas em arco
     ['p', dx, up, w]            plataforma vazada (sobe por baixo)
     ['b', dx, up, w]            blocos sólidos
     ['q', dx, up, 'c'|'k'|'f']  mala-surpresa: moeda, cartão ou comida
     ['s', dx, n]                espinhos
     ['e', tipo, dx, up]         inimigo
     ['m', dx, alt, w, 'x'|'y', alcance, vel]  plataforma móvel
     ['k', dx]                   check-in (ponto de retorno)
     ['t', dx, up]               carimbo de passaporte (3 por fase)
     ['d', tipo, dx]             decoração
     ['g', dx]                   Dona Cartão (fim da fase)
     ['S', dx, id]               botão no chão (ligado a cancela/elevador de mesmo id)
     ['D', dx, h, id]            cancela de h tiles que abre com o botão
     ['L', dx, w, sobe, id]      elevador de w tiles que sobe 'sobe' tiles com o botão
     ['H', dx, up, texto]        dica que aparece no modo de 2 jogadores
   Trechos cooperativos prontos: b.coopGate(id) e b.coopLift(id).
   Limites do pulo: sobe até 3 tiles, atravessa até 4 tiles de buraco. */
(function () {
  'use strict';
  const PF = (window.PF = window.PF || {});
  const TS = PF.TS, H = 17;

  const LEVELS = [
    /* 1 — São Paulo */
    (b) => b
      .flat(16, [['d', 'sign', 2], ['d', 'lamp', 7], ['c', 10, 0, 4]])
      .flat(12, [['q', 4, 3, 'c'], ['e', 'boleto', 9], ['d', 'tree', 1]])
      .coopGate('a')
      .up(1).flat(5, [['c', 1, 0, 3]])
      .up(1).flat(6, [['e', 'boleto', 4], ['d', 'lamp', 2]])
      .up(-2).flat(10, [['p', 3, 2, 4], ['c', 3, 3, 4], ['d', 'tree', 8]])
      .gap(2, [['a', 0, 1, 2]])
      .flat(14, [['q', 3, 3, 'c'], ['q', 4, 3, 'f'], ['q', 5, 3, 'c'], ['e', 'boleto', 10], ['d', 'lamp', 12]])
      .gap(3, [['a', 0, 1, 3]])
      .flat(8, [['s', 4, 1], ['c', 3, 2, 3]])
      .up(2).flat(7, [['e', 'pombo', 3, 3], ['c', 2, 0, 3]])
      .up(1).flat(4, [['t', 2, 2]])
      .up(-3).flat(12, [['k', 2], ['d', 'tree', 6], ['e', 'boleto', 9]])
      .coopLift('b')
      .gap(3)
      .flat(4, [['c', 1, 0, 2]])
      .gap(3)
      .flat(12, [['p', 2, 2, 3], ['p', 6, 5, 3], ['t', 7, 6], ['q', 10, 3, 'k'], ['e', 'boleto', 8]])
      .flat(10, [['e', 'boleto', 3], ['e', 'boleto', 6], ['e', 'pombo', 8, 3], ['d', 'lamp', 1]])
      .up(1).flat(5).up(1).flat(5, [['c', 1, 0, 3]]).up(1).flat(5, [['e', 'pombo', 2, 3]])
      .up(-3).gap(4, [['a', 0, 2, 4]])
      .flat(16, [['q', 5, 3, 'c'], ['e', 'boleto', 9], ['e', 'boleto', 12], ['d', 'lamp', 3], ['d', 'tree', 14]])
      .gap(2, [['t', 0, 3]])
      .flat(22, [['d', 'tree', 3], ['d', 'lamp', 8], ['g', 13], ['d', 'tree', 18]]),

    /* 2 — Balneário Camboriú */
    (b) => b
      .flat(14, [['d', 'sign', 2], ['d', 'palm', 6], ['c', 9, 0, 4], ['d', 'umbrella', 11]])
      .flat(10, [['e', 'siri', 6], ['q', 3, 3, 'c'], ['q', 4, 3, 'c']])
      .coopGate('a')
      .gap(3, [['a', 0, 1, 3]])
      .flat(9, [['e', 'ourico', 5], ['c', 4, 2, 3], ['d', 'palm', 1]])
      .up(1).flat(6, [['e', 'siri', 3]])
      .up(1).flat(5, [['c', 1, 0, 3], ['d', 'umbrella', 3]])
      .gap(7, [['m', 1, 0, 3, 'x', 3, 1.2], ['a', 2, 2, 3]])
      .flat(10, [['e', 'gaivota', 4, 3], ['q', 6, 3, 'f'], ['d', 'palm', 8]])
      .up(-2).flat(8, [['e', 'siri', 3], ['e', 'siri', 6]])
      .gap(2).flat(3, [['c', 1, 0, 1]]).gap(2).flat(3, [['c', 1, 0, 1]]).gap(3)
      .flat(12, [['k', 2], ['d', 'palm', 5], ['p', 7, 2, 3], ['t', 8, 3]])
      .coopLift('b')
      .up(2).flat(6, [['e', 'ourico', 3]])
      .gap(8, [['m', 1, 0, 3, 'x', 4, 1.4], ['a', 3, 2, 3]])
      .flat(6, [['e', 'gaivota', 3, 3], ['c', 1, 0, 4]])
      .gap(6, [['m', 1, 0, 2, 'y', 3, 1], ['t', 2, 5]])
      .flat(8, [['q', 3, 3, 'k'], ['e', 'siri', 5]])
      .up(-2).flat(14, [['e', 'siri', 3], ['e', 'ourico', 7], ['e', 'siri', 10], ['d', 'umbrella', 12]])
      .gap(3, [['a', 0, 1, 3]])
      .flat(5, [['p', 1, 2, 3], ['c', 1, 3, 3]])
      .gap(9, [['m', 1, 0, 3, 'x', 5, 1.5], ['e', 'gaivota', 4, 3]])
      .flat(6, [['c', 1, 0, 3]])
      .up(1).flat(5).up(1).flat(5, [['e', 'siri', 3]])
      .gap(3, [['t', 1, 3]])
      .flat(22, [['d', 'palm', 3], ['d', 'umbrella', 7], ['g', 14], ['d', 'palm', 18]]),

    /* 3 — Bariloche */
    (b) => b
      .flat(14, [['d', 'sign', 2], ['d', 'pine', 6], ['c', 9, 0, 4], ['d', 'pine', 12]])
      .flat(10, [['e', 'boleto', 6], ['q', 3, 3, 'c']])
      .coopGate('a')
      .up(1).flat(8, [['c', 2, 0, 4]], { ice: 1 })
      .up(1).flat(6, [['e', 'neve', 3]])
      .gap(3, [['a', 0, 1, 3]])
      .flat(12, [['e', 'boleto', 5], ['d', 'pine', 9], ['q', 7, 3, 'f']], { ice: 1 })
      .up(2).flat(5, [['c', 1, 0, 3]])
      .up(2).flat(5, [['t', 2, 2], ['d', 'pine', 3]])
      .up(-3).gap(4)
      .flat(8, [['e', 'neve', 4]], { ice: 1 })
      .gap(6, [['m', 1, 0, 3, 'x', 2, 1.2]])
      .flat(10, [['k', 2], ['d', 'dog', 5], ['d', 'pine', 8]])
      .coopLift('b')
      .up(-3).flat(12, [['e', 'boleto', 4], ['e', 'boleto', 8], ['p', 5, 2, 3], ['c', 5, 3, 3]], { ice: 1 })
      .gap(2).flat(3, null, { ice: 1 }).gap(2).flat(3, [['c', 1, 0, 1]], { ice: 1 }).gap(2)
      .flat(8, [['q', 3, 3, 'k'], ['e', 'neve', 6]])
      .gap(5, [['m', 1, 0, 2, 'y', 4, 1.1], ['t', 2, 6]])
      .up(3).flat(8, [['e', 'neve', 4], ['c', 1, 0, 3]])
      .up(1).flat(6, null, { ice: 1 })
      .gap(3, [['a', 0, 1, 3]])
      .flat(10, [['e', 'boleto', 4], ['e', 'neve', 7]], { ice: 1 })
      .up(-2).gap(4)
      .flat(6, [['s', 3, 1]])
      .gap(8, [['m', 1, 0, 3, 'x', 4, 1.5], ['t', 4, 3]])
      .flat(8, [['e', 'neve', 4]], { ice: 1 })
      .up(1).flat(5).up(1).flat(5, [['c', 1, 0, 3]])
      .up(-2).flat(22, [['d', 'pine', 2], ['d', 'pine', 6], ['g', 13], ['d', 'pine', 18]]),

    /* 4 — Buenos Aires */
    (b) => b
      .flat(14, [['d', 'sign', 2], ['d', 'lamp', 6], ['c', 9, 0, 4], ['d', 'jac', 11]])
      .flat(12, [['e', 'boleto', 5], ['p', 6, 2, 4], ['c', 6, 3, 4], ['e', 'pombo', 9, 5]])
      .coopGate('a')
      .up(2).flat(6, [['e', 'bola', 3]])
      .gap(3, [['a', 0, 1, 3]])
      .flat(10, [['p', 1, 2, 3], ['p', 5, 5, 3], ['t', 6, 6], ['q', 8, 3, 'c'], ['d', 'lamp', 9]])
      .up(-2).flat(10, [['e', 'boleto', 3], ['e', 'boleto', 7], ['d', 'jac', 5]])
      .gap(4, [['a', 0, 2, 4]])
      .flat(6, [['s', 2, 2], ['c', 2, 2, 2]])
      .up(1).flat(5).up(1).flat(5, [['e', 'bola', 2]]).up(1).flat(6, [['q', 3, 3, 'f'], ['e', 'pombo', 3, 5]])
      .gap(7, [['p', 1, -1, 2], ['p', 4, 0, 2], ['c', 1, 0, 2], ['c', 4, 1, 2]])
      .flat(10, [['k', 2], ['d', 'jac', 6]])
      .coopLift('b')
      .up(-3).flat(12, [['e', 'bola', 4], ['e', 'boleto', 8], ['p', 2, 2, 3], ['p', 7, 2, 3], ['c', 2, 3, 3], ['c', 7, 3, 3]])
      .gap(6, [['m', 1, 0, 3, 'x', 2, 1.3]])
      .flat(8, [['q', 2, 3, 'k'], ['e', 'boleto', 5]])
      .up(2).flat(8, [['e', 'bola', 3], ['e', 'pombo', 5, 1]])
      .gap(3).flat(3, [['c', 1, 0, 1]]).gap(3).flat(3, [['c', 1, 0, 1]]).gap(3)
      .flat(9, [['p', 2, 2, 3], ['p', 6, 5, 2], ['t', 6, 6], ['e', 'boleto', 5]])
      .up(-2).gap(4, [['a', 0, 2, 4]])
      .flat(12, [['e', 'boleto', 3], ['e', 'bola', 6], ['e', 'boleto', 9], ['d', 'lamp', 11]])
      .gap(8, [['m', 1, 0, 2, 'y', 3, 1], ['m', 5, 2, 2, 'x', 1, 1], ['t', 6, 5]])
      .flat(8, [['e', 'pombo', 4, 3], ['c', 2, 0, 4]])
      .up(1).flat(5).up(1).flat(5, [['e', 'bola', 3]])
      .gap(3, [['a', 0, 1, 3]])
      .flat(22, [['d', 'jac', 3], ['d', 'lamp', 8], ['g', 14], ['d', 'jac', 18]]),

    /* 5 — Foz do Iguaçu */
    (b) => b
      .flat(14, [['d', 'sign', 2], ['d', 'jtree', 6], ['c', 9, 0, 4], ['d', 'palm', 12]])
      .flat(10, [['e', 'quati', 6], ['q', 3, 3, 'c'], ['q', 4, 3, 'c']])
      .coopGate('a')
      .gap(3, [['a', 0, 1, 3]])
      .flat(6, [['e', 'quati', 3]])
      .gap(8, [['p', 1, -1, 6], ['c', 2, 0, 4], ['e', 'tucano', 4, 3]])
      .up(1).flat(8, [['e', 'quati', 4], ['d', 'jtree', 6]])
      .up(2).flat(5, [['c', 1, 0, 3]])
      .gap(7, [['m', 1, 0, 3, 'x', 3, 1.3], ['a', 2, 2, 3]])
      .flat(5, [['q', 2, 3, 'f']])
      .gap(7, [['m', 1, 0, 3, 'x', 3, 1.6], ['t', 3, 3]])
      .flat(10, [['k', 2], ['d', 'palm', 6], ['e', 'quati', 8]])
      .coopLift('b')
      .up(-3).flat(10, [['e', 'quati', 3], ['e', 'quati', 7], ['p', 3, 2, 4], ['c', 3, 3, 4]])
      .gap(2).flat(2).gap(2).flat(2, [['c', 0, 0, 2]]).gap(2).flat(2).gap(3)
      .flat(8, [['q', 3, 3, 'k'], ['e', 'tucano', 5, 3]])
      .up(2).flat(6, [['e', 'quati', 3]])
      .up(2).flat(6, [['p', 1, 2, 3], ['t', 2, 3], ['e', 'tucano', 4, 5]])
      .gap(10, [['m', 1, 0, 2, 'x', 2, 1.2], ['m', 6, 0, 2, 'x', 2, 1.5], ['a', 3, 2, 4]])
      .flat(6, [['c', 1, 0, 4]])
      .up(-2).gap(4)
      .flat(10, [['e', 'quati', 3], ['e', 'quati', 6], ['s', 8, 1]])
      .gap(6, [['m', 1, 0, 2, 'y', 3, 1.2], ['t', 2, 5]])
      .up(2).flat(6, [['e', 'tucano', 3, 3]])
      .up(-2).gap(4, [['a', 0, 2, 4]])
      .flat(8, [['e', 'quati', 4]])
      .gap(8, [['m', 1, 0, 3, 'x', 4, 1.7]])
      .flat(22, [['d', 'jtree', 3], ['d', 'palm', 8], ['g', 14], ['d', 'jtree', 18]]),

    /* 6 — Paraguai */
    (b) => b
      .flat(14, [['d', 'sign', 2], ['d', 'lamp', 6], ['c', 9, 0, 4], ['d', 'stall', 11]])
      .flat(12, [['e', 'fatura', 4], ['e', 'fatura', 8], ['p', 5, 2, 4], ['c', 5, 3, 4], ['e', 'drone', 9, 5]])
      .coopGate('a')
      .up(2).flat(6, [['e', 'caixa', 3]])
      .gap(3, [['a', 0, 1, 3]])
      .flat(8, [['s', 3, 2], ['q', 6, 3, 'c'], ['e', 'drone', 4, 3]])
      .up(2).flat(5, [['e', 'fatura', 3]])
      .gap(7, [['p', 1, 0, 2], ['p', 4, 1, 2], ['t', 5, 5]])
      .flat(8, [['e', 'caixa', 4], ['d', 'lamp', 6]])
      .up(-4).flat(12, [['e', 'fatura', 3], ['e', 'fatura', 6], ['e', 'fatura', 9], ['q', 5, 3, 'f'], ['d', 'stall', 10]])
      .gap(6, [['m', 1, 0, 3, 'x', 2, 1.5], ['e', 'drone', 3, 3]])
      .flat(10, [['k', 2], ['d', 'stall', 6]])
      .coopLift('b')
      .up(1).flat(4).up(1).flat(4, [['e', 'caixa', 2]]).up(1).flat(4).up(1).flat(4, [['c', 1, 0, 2]])
      .gap(9, [['m', 1, 0, 2, 'x', 2, 1.4], ['m', 6, 0, 2, 'y', 3, 1.2], ['t', 7, 5]])
      .flat(6, [['q', 2, 3, 'k'], ['e', 'fatura', 4]])
      .up(-4).gap(3)
      .flat(14, [['e', 'fatura', 2], ['e', 'caixa', 5], ['e', 'fatura', 8], ['e', 'caixa', 11], ['e', 'drone', 7, 4]])
      .gap(2).flat(2).gap(3).flat(2, [['c', 0, 0, 2]]).gap(3).flat(2).gap(2)
      .flat(8, [['p', 1, 2, 3], ['p', 5, 5, 2], ['t', 5, 6], ['s', 5, 2]])
      .up(2).flat(6, [['e', 'drone', 3, 1], ['c', 1, 0, 4]])
      .gap(10, [['m', 1, 0, 2, 'x', 2, 1.6], ['m', 6, 0, 2, 'x', 2, 1.3], ['a', 3, 2, 4]])
      .flat(6, [['e', 'fatura', 3]])
      .up(2).flat(5, [['e', 'caixa', 2]])
      .up(-2).gap(4, [['a', 0, 2, 4]])
      .flat(10, [['s', 3, 2], ['e', 'fatura', 7], ['e', 'drone', 5, 3]])
      .gap(6, [['m', 1, 0, 2, 'y', 3, 1.4]])
      .up(2).flat(6, [['c', 1, 0, 4]])
      .up(-2).flat(24, [['d', 'lamp', 3], ['d', 'stall', 8], ['g', 15], ['d', 'lamp', 20]]),
  ];

  PF.LEVEL_COUNT = LEVELS.length;

  PF.buildLevel = function (i) {
    const cols = [], raw = [];
    let h = 3, x = 0;
    const add = (its) => (its || []).forEach((it) => raw.push({ k: it[0], x, h, a: it.slice(1) }));
    const b = {
      up(n) { h += n; return b; },
      flat(w, its, o) { for (let k = 0; k < w; k++) cols.push({ h, ice: !!(o && o.ice) }); add(its); x += w; return b; },
      gap(w, its) { for (let k = 0; k < w; k++) cols.push({ h: 0 }); add(its); x += w; return b; },
      // um segura o botão, o outro passa pela cancela e segura o botão do outro lado
      coopGate(id) { return b.flat(16, [['S', 3, id], ['D', 8, 4, id], ['S', 12, id], ['H', 3, 3, 'SEGURA O BOTÃO!'], ['c', 13, 2, 2]]); },
      // paredão: um sobe no pezinho do outro e lá em cima aperta o botão do elevador
      coopLift(id) { return b.flat(7, [['L', 5, 2, 5, id], ['H', 3, 5, 'PEZINHO!']]).up(5).flat(8, [['S', 2, id], ['H', 2, 3, 'SEGURA AQUI!'], ['c', 5, 0, 3]]).up(-5); },
    };
    LEVELS[i](b);
    const W = cols.length, tiles = new Uint8Array(W * H);
    cols.forEach((c, cx) => {
      for (let r = H - c.h; r < H; r++) tiles[r * W + cx] = 1;
      if (c.h && c.ice) tiles[(H - c.h) * W + cx] = 9;
    });
    const row = (hh, up) => H - hh - 1 - up;
    const set = (tx, ty, v) => { if (tx >= 0 && tx < W && ty >= 0 && ty < H && !tiles[ty * W + tx]) tiles[ty * W + tx] = v; };
    const L = { i, W, H, cols, tiles, theme: PF.THEMES[i], coins: [], stamps: [], enemies: [], movers: [], boxes: [], decor: [], checks: [], goal: null, switches: [], gates: [], hints: [] };
    for (const it of raw) {
      const a = it.a, X = it.x, hh = it.h;
      switch (it.k) {
        case 'c': for (let n = 0; n < (a[2] || 1); n++) L.coins.push({ x: (X + a[0] + n) * TS + 8, y: row(hh, a[1]) * TS + 8 }); break;
        case 'a': for (let n = 0; n < a[2]; n++) L.coins.push({ x: (X + a[0] + n) * TS + 8, y: row(hh, a[1]) * TS + 8 - Math.round(Math.sin((Math.PI * (n + 0.5)) / a[2]) * 18) }); break;
        case 'p': for (let n = 0; n < a[2]; n++) set(X + a[0] + n, row(hh, a[1]), 3); break;
        case 'b': for (let n = 0; n < a[2]; n++) set(X + a[0] + n, row(hh, a[1]), 2); break;
        case 's': for (let n = 0; n < a[1]; n++) set(X + a[0] + n, row(hh, 0), 4); break;
        case 'q': { const tx = X + a[0], ty = row(hh, a[1]); set(tx, ty, a[2] === 'k' ? 6 : a[2] === 'f' ? 7 : 5); L.boxes.push({ tx, ty, kind: a[2] || 'c', used: false, bump: 0 }); break; }
        case 'e': L.enemies.push({ type: a[0], x: (X + a[1]) * TS + 8, by: (row(hh, a[2] || 0) + 1) * TS }); break;
        case 'm': L.movers.push({ x0: (X + a[0]) * TS, y0: (H - hh - a[1]) * TS, w: a[2] * TS, axis: a[3], range: a[4] * TS, speed: a[5] }); break;
        case 'k': L.checks.push({ x: (X + a[0]) * TS + 8, y: (H - hh) * TS, on: false }); break;
        case 't': L.stamps.push({ x: (X + a[0]) * TS + 8, y: row(hh, a[1]) * TS + 8, idx: L.stamps.length, got: false }); break;
        case 'd': L.decor.push({ kind: a[0], x: (X + a[1]) * TS + 8, y: (H - hh) * TS }); break;
        case 'g': L.goal = { x: (X + a[0]) * TS + 8, y: (H - hh) * TS }; break;
        case 'S': L.switches.push({ id: a[1], x: (X + a[0]) * TS, y: (H - hh) * TS, w: TS, pressed: false }); break;
        case 'D': { const tx = X + a[0], ty1 = H - hh - 1, ty0 = ty1 - a[1] + 1; for (let r = ty0; r <= ty1; r++) tiles[r * W + tx] = 10; L.gates.push({ id: a[2], tx, ty0, ty1, open: 0, timer: 0 }); break; }
        case 'L': L.movers.push({ kind: 'lift', id: a[3], x0: (X + a[0]) * TS, y0: (H - hh) * TS - 4, w: a[1] * TS, range: a[2] * TS - 4, k: 0 }); break;
        case 'H': L.hints.push({ x: (X + a[0]) * TS + 8, y: (H - hh - a[1]) * TS, text: a[2] }); break;
      }
    }
    if (L.stamps.length !== 3 || !L.goal) console.warn('Fase ' + (i + 1) + ': carimbos=' + L.stamps.length + ' goal=' + !!L.goal);
    return L;
  };
})();
