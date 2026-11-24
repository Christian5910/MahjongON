/* Testes do motor: partidas inteiras simuladas, com invariantes conferidos a cada jogada */
'use strict';
const assert = require('assert');
const M = require('../nucleo.js');
const P = require('../partida.js');
const Sorteio = require('../sorteio.js');

function botSimples(g, opts) {
  opts = opts || {};
  return function (S, j, tipo, o) {
    if (tipo === 'descarte') {
      if (o.tsumo) return { k: 'tsumo' };
      if (o.kyuushu && g.real() < 0.5) return { k: 'kyuushu' };
      if (o.ankan.length && g.real() < (opts.kan || 0.5)) return { k: 'ankan', kind: o.ankan[0] };
      if (o.kakan.length && g.real() < (opts.kan || 0.5)) return { k: 'kakan', id: o.kakan[0] };
      const mao = S.m.hands[j];
      let melhor = [], ms = 99;
      const cand = o.descartes;
      cand.forEach(id => {
        const resto = mao.filter(x => x !== id);
        const c = M.contIds(resto);
        const s = M.shanten(c, S.m.melds[j].length, { setePares: S.m.melds[j].length === 0, orfaos: S.m.melds[j].length === 0 });
        if (s < ms) { ms = s; melhor = [id]; } else if (s === ms) melhor.push(id);
      });
      const id = melhor[g.inteiro(melhor.length)];
      if (o.riichi.indexOf(id) >= 0) return { k: 'descartar', id, riichi: true };
      if (o.riichi.length && g.real() < 0.9) return { k: 'descartar', id: o.riichi[g.inteiro(o.riichi.length)], riichi: true };
      return { k: 'descartar', id };
    }
    if (o.ron) return { k: 'ron' };
    const q = opts.chama === undefined ? 0.3 : opts.chama;
    if (o.kan && g.real() < q) return { k: 'kan' };
    if (o.pon.length && g.real() < q) return { k: 'pon', ids: o.pon[g.inteiro(o.pon.length)] };
    if (o.chi.length && g.real() < q) return { k: 'chi', ids: o.chi[g.inteiro(o.chi.length)] };
    return { k: 'passar' };
  };
}

function conferir(S) {
  const m = S.m;
  const soma = S.pontos.reduce((a, b) => a + b, 0) + S.varetas * 1000;
  assert.strictEqual(soma, 100000, 'pontos+varetas deve somar 100000, deu ' + soma);
  const emJogo = [];
  m.hands.forEach(h => h.forEach(id => emJogo.push(id)));
  m.melds.forEach(ms => ms.forEach(x => x.ids.forEach(id => emJogo.push(id))));
  m.rios.forEach(r => r.forEach(x => { if (!x.tomada) emJogo.push(x.id); }));
  if (m.kakanPend && m.kakanPend.tipo === 'kakan') { /* a peça continua na mão até concluir */ }
  const unicos = new Set(emJogo);
  assert.strictEqual(unicos.size, emJogo.length, 'peça repetida');
  const esperado = m.iv + m.kans;   /* compradas do muro vivo + rinshan */
  assert.strictEqual(emJogo.length, 52 + (m.iv - 52) + m.kans, 'peças em jogo != compradas');
  m.hands.forEach((h, j) => {
    const n = h.length + 3 * m.melds[j].length;
    assert.ok(n === 13 || n === 14, 'mão com ' + n + ' peças (j=' + j + ')');
  });
}

function jogarPartida(semente, cfg) {
  const g = Sorteio.criar('bot' + semente);
  const S = P.criar(Object.assign({ semente: 'p' + semente, determ: true, humanos: [] }, cfg || {}));
  const bot = botSimples(g, cfg && cfg.botOpts);
  let maos = 0, vitorias = 0, empates = 0, abortos = 0, kans = 0, riichis = 0, chamadas = 0;
  const motivos = {};
  for (let guarda = 0; guarda < 200; guarda++) {
    let passos = 0;
    while (true) {
      const pd = P.pendentes(S);
      if (!pd.length) break;
      const x = pd[0];
      const o = x.tipo === 'descarte' ? P.opcoesDescarte(S, x.j) : P.opcoesReacao(S, x.j);
      const a = bot(S, x.j, x.tipo, o);
      const r = P.agir(S, x.j, a);
      assert.ok(r.ok, 'ação recusada: ' + r.motivo + ' ' + JSON.stringify(a));
      conferir(S);
      if (++passos > 3000) throw new Error('mão sem fim');
    }
    const res = S.m.resultado;
    assert.ok(res, 'mão acabou sem resultado');
    maos++;
    if (res.tipo === 'ron' || res.tipo === 'tsumo') vitorias++; else if (res.tipo === 'empate') empates++; else abortos++;
    motivos[res.motivo || res.tipo] = (motivos[res.motivo || res.tipo] || 0) + 1;
    S.m.melds.forEach(ms => ms.forEach(x => { if (x.t === 'kan' || x.t === 'ankan' || x.t === 'kakan') kans++; else chamadas++; }));
    S.m.riichi.forEach(x => { if (x) riichis++; });
    const soma = S.pontos.reduce((a, b) => a + b, 0) + S.varetas * 1000;
    assert.strictEqual(soma, 100000);
    if (S.fim) break;
    assert.ok(P.proximaMao(S));
  }
  assert.ok(S.fim, 'a partida deveria ter terminado');
  const sf = S.fim.final.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sf) < 0.05, 'pontuação final deve somar zero: ' + sf);
  return { S, maos, vitorias, empates, abortos, kans, riichis, chamadas, motivos };
}

let tot = { maos: 0, vitorias: 0, empates: 0, abortos: 0, kans: 0, riichis: 0, chamadas: 0 }, motivos = {}, fins = {};
const N = +(process.argv[2] || 40);
for (let i = 0; i < N; i++) {
  const r = jogarPartida(i, i % 5 === 0 ? { fim: 'tonpuusen' } : {});
  Object.keys(tot).forEach(k => tot[k] += r[k]);
  Object.keys(r.motivos).forEach(k => motivos[k] = (motivos[k] || 0) + r.motivos[k]);
  fins[r.S.fim.motivo] = (fins[r.S.fim.motivo] || 0) + 1;
}
console.log('partidas', N, JSON.stringify(tot));
console.log('motivos das mãos', JSON.stringify(motivos));
console.log('fins', JSON.stringify(fins));
console.log('OK');
