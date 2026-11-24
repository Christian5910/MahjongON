/* procura partidas (por semente) em que o humano (assento 0) cai numa situação e grava o estado em JSON.
   node testes/montar.js chi|pon|ron|riichi|tsumo|kan|ankan|riichi-ativo  -> imprime o JSON do "mahjongon.jogo" */
'use strict';
const P = require('../partida.js'), Bot = require('../bot.js');
const quer = process.argv[2];
function bate(S) {
  const m = S.m, pd = P.pendentes(S).filter(x => x.j === 0)[0];
  if (!pd) return false;
  if (pd.tipo === 'reacao') {
    const o = P.opcoesReacao(S, 0);
    if (quer === 'chi') return o.chi.length >= 2 && o.pon.length === 0;
    if (quer === 'pon') return o.pon.length >= 1 && o.chi.length >= 1;
    if (quer === 'ron') return !!o.ron;
    if (quer === 'kan') return o.kan;
  } else {
    const o = P.opcoesDescarte(S, 0);
    if (quer === 'riichi') return o.riichi.length > 0 && m.rios[0].length > 3;
    if (quer === 'tsumo') return !!o.tsumo;
    if (quer === 'ankan') return o.ankan.length > 0;
    if (quer === 'riichi-ativo') return m.riichi[0] && !o.tsumo;
    if (quer === 'kyuushu') return o.kyuushu;
  }
  return false;
}
for (let i = 0; i < 4000; i++) {
  const S = P.criar({ semente: 'ui' + i, determ: true, humanos: [0], aka: true });
  S.cfg.niveis = [0, 3, 3, 3];
  let ok = false;
  for (let g = 0; g < 400 && !ok; g++) {
    const r = P.rodar(S, (S2, j, tipo, o) => Bot.decidir(S2, j, tipo, o), 5000);
    if (r === 'fim') break;
    if (bate(S)) { ok = true; break; }
    const pd = P.pendentes(S).filter(x => x.j === 0)[0];
    const o = pd.tipo === 'descarte' ? P.opcoesDescarte(S, 0) : P.opcoesReacao(S, 0);
    const a = Bot.decidir(S, 0, pd.tipo, o, 4);
    P.agir(S, 0, a);
  }
  if (ok) {
    const U = { nomes: ['Você', 'Bia', 'Caio', 'Duda'], diario: ['Partida de teste'], logPos: S.m.log.length, assistido: false, contouMao: -1, contouFim: false };
    process.stdout.write(JSON.stringify({ S, U }));
    process.exit(0);
  }
}
console.error('não achei'); process.exit(1);
