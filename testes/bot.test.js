/* robôs: partidas completas sem jogadas inválidas e com níveis diferentes na mesma mesa */
'use strict';
const assert = require('assert');
const P = require('../partida.js');
const Bot = require('../bot.js');
const N = +(process.argv[2] || 12);
const placar = {};
let t0 = Date.now(), maos = 0, vit = 0;
for (let i = 0; i < N; i++) {
  const niveis = [[1, 2, 3, 4], [5, 4, 3, 2], [5, 1, 5, 1], [3, 3, 3, 3], [2, 5, 4, 1]][i % 5];
  const S = P.criar({ semente: 'bt' + i, determ: true, humanos: [] });
  S.cfg.niveis = niveis;
  for (let g = 0; g < 200; g++) {
    P.rodar(S, (S2, j, tipo, o) => Bot.decidir(S2, j, tipo, o), 5000);
    const r = S.m.resultado; assert.ok(r); maos++;
    if (r.tipo === 'ron' || r.tipo === 'tsumo') vit++;
    assert.strictEqual(S.pontos.reduce((a, b) => a + b, 0) + S.varetas * 1000, 100000);
    if (S.fim) break;
    P.proximaMao(S);
  }
  assert.ok(S.fim);
  const rk = S.fim.ranking;
  niveis.forEach((nv, j) => { const p = rk.indexOf(j) + 1; (placar[nv] = placar[nv] || []).push(p); });
}
Object.keys(placar).sort().forEach(n => console.log('nível', n, 'colocação média', (placar[n].reduce((a, b) => a + b, 0) / placar[n].length).toFixed(2), 'em', placar[n].length, 'jogos'));
console.log('mãos', maos, 'com vitória', vit, 'tempo', ((Date.now() - t0) / 1000).toFixed(1) + 's');
console.log('OK');
