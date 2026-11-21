/* Parcelei e Fui — controles pelo celular (lado do computador).
   O PC abre uma "sala" no PeerJS e cada celular se conecta direto a ela por WebRTC.
   Para testar sem internet: index.html?peerhost=localhost:9000 (servidor local do pacote "peer"). */
(function () {
  'use strict';
  const PF = (window.PF = window.PF || {});
  const PREFIX = 'parceleiefui-';
  const blank = () => ({ l: false, r: false, j: false });
  const R = (PF.remote = {
    peer: null, room: null, error: null,
    conns: [null, null], input: [blank(), blank()], seen: [0, 0],
    onchange: null, onbutton: null,
  });

  function peerConfig() {
    const h = new URLSearchParams(location.search).get('peerhost');
    if (!h) return { debug: 0 };
    const [host, port] = h.split(':');
    return { host, port: +port || 9000, path: '/', secure: false, debug: 0 };
  }
  const changed = () => { if (R.onchange) R.onchange(); };
  const ERR = {
    'browser-incompatible': 'Este navegador não permite conexão direta com o celular.',
    network: 'Sem conexão com o serviço que liga os celulares. Confira a internet do computador.',
    'server-error': 'O serviço que liga os celulares não respondeu. Tente de novo em instantes.',
    'socket-error': 'O serviço que liga os celulares caiu. Tente de novo em instantes.',
    'ssl-unavailable': 'O jogo precisa estar num endereço https para ligar os celulares.',
  };

  R.open = function () {
    if (R.peer && !R.peer.destroyed) return;
    R.error = null;
    if (typeof window.Peer !== 'function' || typeof window.RTCPeerConnection !== 'function') {
      R.error = 'Este navegador não permite conexão direta com o celular. Use o Chrome, Edge, Firefox ou Safari atualizados, no site do jogo.';
      changed(); return;
    }
    const room = Math.random().toString(36).slice(2, 7).toUpperCase();
    let peer;
    try { peer = new window.Peer(PREFIX + room, peerConfig()); } catch (e) {
      R.error = 'Não deu pra abrir a sala dos controles neste navegador.'; changed(); return;
    }
    R.peer = peer;
    peer.on('open', () => { R.room = room; R.error = null; changed(); });
    peer.on('connection', (c) => {
      c.on('open', () => {
        const p = c.metadata && +c.metadata.p === 1 ? 1 : 0;
        const old = R.conns[p];
        R.conns[p] = c;
        if (old && old !== c) { try { old.close(); } catch (e) { /* já fechou */ } }
        R.input[p] = blank(); R.seen[p] = Date.now();
        changed();
      });
      c.on('data', (d) => {
        const p = R.conns.indexOf(c);
        if (p < 0 || !d || typeof d !== 'object') return;
        R.seen[p] = Date.now();
        if (d.t === 'in') {
          const prev = R.input[p], now = { l: !!d.l, r: !!d.r, j: !!d.j };
          R.input[p] = now;
          if (R.onbutton) {
            if (now.j && !prev.j) R.onbutton(p, 'a');
            if (now.l && !prev.l) R.onbutton(p, 'left');
            if (now.r && !prev.r) R.onbutton(p, 'right');
          }
        } else if (d.t === 'pause' && R.onbutton) R.onbutton(p, 'pause');
      });
      const drop = () => {
        const p = R.conns.indexOf(c);
        if (p < 0) return;
        R.conns[p] = null; R.input[p] = blank(); changed();
      };
      c.on('close', drop); c.on('error', drop);
    });
    peer.on('error', (e) => {
      if (e && e.type === 'unavailable-id') { peer.destroy(); R.peer = null; R.open(); return; }
      if (e && e.type === 'peer-unavailable') return;
      R.error = (e && ERR[e.type]) || 'Não deu pra ligar os celulares agora. Tente de novo.';
      changed();
    });
    peer.on('disconnected', () => { if (!peer.destroyed) { try { peer.reconnect(); } catch (e) { /* tenta depois */ } } });
  };

  R.connected = (p) => !!(R.conns[p] && R.conns[p].open);
  // o celular manda sinal a cada 0,4 s; 3 s em silêncio = celular fechado ou sem rede
  R.tick = function () {
    for (let p = 0; p < 2; p++) {
      const c = R.conns[p];
      if (c && Date.now() - R.seen[p] > 3000) { R.conns[p] = null; R.input[p] = blank(); try { c.close(); } catch (e) { /* já fechou */ } changed(); }
    }
  };
  R.any = () => R.connected(0) || R.connected(1);
  R.send = function (p, msg) {
    const c = R.conns[p];
    if (c && c.open) { try { c.send(msg); } catch (e) { /* conexão caindo */ } }
  };
  R.url = function (p) {
    const base = location.href.split('#')[0].split('?')[0].replace(/[^/]*$/, '');
    const ph = new URLSearchParams(location.search).get('peerhost');
    return base + 'controle.html?sala=' + R.room + '&p=' + p + (ph ? '&peerhost=' + encodeURIComponent(ph) : '');
  };
  R.qrSvg = function (text) {
    if (typeof window.qrcode !== 'function') return '';
    const q = window.qrcode(0, 'M');
    q.addData(text); q.make();
    return q.createSvgTag({ cellSize: 4, margin: 3, scalable: true });
  };
})();
