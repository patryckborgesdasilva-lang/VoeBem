/* Parcelei e Fui — modo "2 celulares".
   Um aparelho cria a partida (anfitrião) e roda o jogo; o outro entra pelo QR code (convidado),
   recebe o que acontece ~30 vezes por segundo e manda os próprios comandos.
   Para testar sem internet: ?peerhost=127.0.0.1:9000 (servidor local do pacote "peer"). */
(function () {
  'use strict';
  const PF = (window.PF = window.PF || {});
  const PREFIX = 'parceleiefui-dupla-';
  const blank = () => ({ l: false, r: false, j: false });
  const N = (PF.net = {
    role: null, code: null, peer: null, conn: null, error: null,
    me: 0, input: blank(), seen: 0,
    onchange: null, onmessage: null,
  });

  function peerConfig() {
    const h = new URLSearchParams(location.search).get('peerhost');
    if (!h) return { debug: 0 };
    const [host, port] = h.split(':');
    return { host, port: +port || 9000, path: '/', secure: false, debug: 0 };
  }
  const changed = () => { if (N.onchange) N.onchange(); };
  const supported = () => typeof window.Peer === 'function' && typeof window.RTCPeerConnection === 'function';
  const ERR = {
    network: 'Sem conexão com o serviço que liga os celulares. Confira a internet.',
    'server-error': 'O serviço que liga os celulares não respondeu. Tente de novo.',
    'socket-error': 'O serviço que liga os celulares caiu. Tente de novo.',
    'peer-unavailable': 'Partida não encontrada. Confira se o outro celular ainda está na tela do QR code e leia de novo.',
    'browser-incompatible': 'Este navegador não permite jogar em 2 celulares.',
  };
  function attach(c) {
    if (N.conn && N.conn !== c) { try { N.conn.close(); } catch (e) { /* já fechou */ } }
    N.conn = c; N.input = blank(); N.seen = Date.now();
    c.on('data', (d) => {
      if (!d || typeof d !== 'object') return;
      N.seen = Date.now();
      if (N.role === 'host' && d.t === 'in') { N.input = { l: !!d.l, r: !!d.r, j: !!d.j }; return; }
      if (N.onmessage) N.onmessage(d);
    });
    const drop = () => { if (N.conn === c) { N.conn = null; N.input = blank(); changed(); } };
    c.on('close', drop); c.on('error', drop);
    changed();
  }

  // anfitrião: abre a partida e espera o outro celular
  N.host = function () {
    if (N.role === 'host' && N.peer && !N.peer.destroyed) return;
    N.leave(); N.role = 'host'; N.error = null;
    if (!supported()) { N.error = ERR['browser-incompatible']; changed(); return; }
    const code = Math.random().toString(36).slice(2, 7).toUpperCase();
    const peer = (N.peer = new window.Peer(PREFIX + code, peerConfig()));
    peer.on('open', () => { N.code = code; changed(); });
    peer.on('connection', (c) => c.on('open', () => { attach(c); N.send({ t: 'hi', me: N.me }); }));
    peer.on('error', (e) => {
      if (e && e.type === 'unavailable-id') { peer.destroy(); N.peer = null; N.role = null; N.host(); return; }
      N.error = (e && ERR[e.type]) || 'Não deu pra criar a partida agora. Tente de novo.'; changed();
    });
    peer.on('disconnected', () => { if (!peer.destroyed) { try { peer.reconnect(); } catch (e) { /* tenta depois */ } } });
  };

  // convidado: entra na partida pelo código do QR
  N.join = function (code) {
    N.leave(); N.role = 'guest'; N.code = code; N.error = null;
    if (!supported()) { N.error = ERR['browser-incompatible']; changed(); return; }
    const peer = (N.peer = new window.Peer(peerConfig()));
    const link = () => {
      const c = peer.connect(PREFIX + code, { reliable: true });
      c.on('open', () => attach(c));
    };
    peer.on('open', link);
    peer.on('error', (e) => {
      N.error = (e && ERR[e.type]) || 'Não deu pra entrar na partida. Tente de novo.'; changed();
      setTimeout(() => { if (N.role === 'guest' && !N.connected() && peer.open) link(); }, 3000);
    });
    peer.on('disconnected', () => { if (!peer.destroyed) { try { peer.reconnect(); } catch (e) { /* tenta depois */ } } });
  };

  N.leave = function () {
    if (N.conn) { try { N.conn.close(); } catch (e) { /* já fechou */ } }
    if (N.peer) { try { N.peer.destroy(); } catch (e) { /* já fechou */ } }
    N.peer = null; N.conn = null; N.role = null; N.code = null; N.input = blank();
  };
  N.connected = () => !!(N.conn && N.conn.open);
  N.send = function (msg) { if (N.conn && N.conn.open) { try { N.conn.send(msg); } catch (e) { /* conexão caindo */ } } };
  // sem notícia do outro aparelho por 4 s = caiu
  N.tick = function () { if (N.conn && Date.now() - N.seen > 4000) { const c = N.conn; N.conn = null; N.input = blank(); try { c.close(); } catch (e) { /* já fechou */ } changed(); } };
  N.url = function () {
    const base = location.href.split('#')[0].split('?')[0].replace(/[^/]*$/, '');
    const ph = new URLSearchParams(location.search).get('peerhost');
    return base + '?entrar=' + N.code + (ph ? '&peerhost=' + encodeURIComponent(ph) : '');
  };
})();
