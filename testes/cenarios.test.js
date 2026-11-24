/* Situações específicas do motor do Riichi: node testes/cenarios.test.js */
'use strict';
const assert = require('assert');
const M = require('../nucleo.js');
const P = require('../partida.js');
let ok = 0, falhas = 0;
function t(nome, fn) { try { fn(); ok++; } catch (e) { falhas++; console.log('FALHA ' + nome + ': ' + (e.stack || e.message).split('\n').slice(0, 4).join(' | ')); } }

function tipos(s) {
  const r = []; let nums = [];
  for (const ch of s.replace(/\s+/g, '')) {
    if (/[0-9]/.test(ch)) nums.push(+ch);
    else { for (const n of nums) r.push(ch === 'm' ? n - 1 : ch === 'p' ? 9 + n - 1 : ch === 's' ? 18 + n - 1 : 27 + n - 1); nums = []; }
  }
  return r;
}
const K = (s) => tipos(s)[0];

/* enchimentos sem yaku e sem tenpai (13 peças cada) */
const J = [
  '1m4m7m2p5p8p3s6s9s2z3z4z9p',
  '2m5m8m3p6p1s4s7s2z3z4z9p6z',
  '3m6m9m1p4p7p2s5s8s2z3z4z5z',
  '1m4m7m2p5p8p3s6s9s2z5z6z7z',
  '1m4m7m2p8p9p3s6s9s2z3z4z5z'
];
const TANKI5P = '234m456m345s678s5p';   /* tenpai tanki em 5p, tanyao, sem 5p nas sequências */

/* monta a mão: maos (texto por jogador), melds [[j,tipo,kind,aberto]], compras (textos), dora/ura/rinshan */
function cenario(o) {
  const S = P.criar({ semente: 'c' + (o.semente || 1), determ: true, humanos: [], aka: false });
  S.dealer0 = o.dealer0 || 0; S.rod = o.rod || 0; S.dealer = (S.dealer0 + S.rod) & 3; S.vento = Math.floor(S.rod / 4);
  S.pontos = (o.pontos || [25000, 25000, 25000, 25000]).slice(); S.varetas = o.varetas || 0; S.honba = o.honba || 0;
  const usados = new Set();
  function pegar(k) { for (let c = 0; c < 4; c++) { const id = k * 4 + c; if (!usados.has(id)) { usados.add(id); return id; } } throw new Error('sem peça do tipo ' + k); }
  const maos = [0, 1, 2, 3].map(j => tipos((o.maos && o.maos[j]) || '').map(pegar));
  const melds = [[], [], [], []];
  (o.melds || []).forEach(([j, tp, kind, aberto]) => {
    const ks = tp === 'chi' ? [kind, kind + 1, kind + 2] : new Array(tp === 'pon' ? 3 : 4).fill(kind);
    melds[j].push({ t: tp, k: kind, ids: ks.map(pegar), aberto: aberto !== false, de: (j + 1) & 3 });
  });
  const comp = tipos((o.compras || []).join('')).length ? (o.compras || []).map(s => tipos(s).map(pegar)) : [];
  const dead = new Array(14).fill(-1);
  tipos(o.rinshan || '').forEach((k, i) => { dead[i] = pegar(k); });
  function tentar(lista) { for (const x of lista) { try { return pegar(K(x)); } catch (e) { /* tenta o próximo */ } } throw new Error('sem indicador'); }
  if (o.dora) tipos(o.dora).forEach((k, i) => { dead[4 + 2 * i] = pegar(k); }); else dead[4] = tentar(['6z', '9m', '9s']);
  if (o.ura) tipos(o.ura).forEach((k, i) => { dead[5 + 2 * i] = pegar(k); }); else dead[5] = tentar(['6z', '9m', '9s']);
  const resto = []; for (let id = 0; id < 136; id++) if (!usados.has(id)) resto.push(id);
  let q = 0;
  for (let i = 0; i < 14; i++) if (dead[i] < 0) dead[i] = resto[q++];
  const muro = new Array(122).fill(-1);
  for (let i = 0; i < 122; i++) muro[i] = resto[q++];
  const m = S.m;
  const rest = o.restantes === undefined ? 70 : o.restantes;
  const ini = 122 - rest;
  const flat = []; comp.forEach(a => a.forEach(id => flat.push(id)));
  flat.forEach((id, i) => { muro[ini + i] = id; });
  m.muro = muro.concat(dead);
  assert.strictEqual(m.muro.length, 136);
  m.iv = ini; m.kans = 0; m.nDora = 1; m.doraPend = 0;
  m.hands = maos.map(a => a.slice().sort((x, y) => x - y));
  m.melds = melds; m.rios = [[], [], [], []];
  m.riichi = [0, 0, 0, 0]; m.ippatsu = [false, false, false, false]; m.comprada = [null, null, null, null];
  m.furitenTemp = [false, false, false, false]; m.furitenRiichi = [false, false, false, false];
  m.semChamadas = true; m.proibidos = []; m.pao = [null, null, null, null]; m.log = []; m.resultado = null; m.riichiPend = -1; m.kakanPend = null;
  m.pend = null; m.fase = 'descarte'; m.rinshan = false;
  S.fim = null;
  P._compra(S, S.dealer, false);
  return S;
}
function ag(S, j, a) { const r = P.agir(S, j, a); assert.ok(r.ok, JSON.stringify(a) + ' -> ' + r.motivo); return r; }
function idDe(S, j, kind) { const x = S.m.hands[j].filter(id => M.kindDe(id) === kind); assert.ok(x.length, 'jogador ' + j + ' sem ' + kind); return x[x.length - 1]; }
function soma(S) { return S.pontos.reduce((a, b) => a + b, 0) + S.varetas * 1000; }
function tsumogiri(S, j) { ag(S, j, { k: 'descartar', id: S.m.comprada[j] }); }

/* ------------------------------------------------------------------ */
t('tenhou: dealer completa na primeira compra', () => {
  const S = cenario({ maos: ['123m456m789m234s1p', J[1], J[2], J[3]], compras: ['1p'] });
  const o = P.opcoesDescarte(S, 0);
  assert.ok(o.tsumo, 'devia poder tsumo');
  assert.ok(o.tsumo.yaku.some(y => y.id === 'tenhou'));
  ag(S, 0, { k: 'tsumo' });
  assert.strictEqual(S.m.resultado.tipo, 'tsumo');
  assert.strictEqual(S.pontos[0], 25000 + 48000);
  assert.strictEqual(soma(S), 100000);
  assert.ok(S.m.resultado.renchan);
  assert.strictEqual(S.proxHonba, 1);
});

t('ron simples (tanyao, sem riichi): 1300 pagos pelo dealer', () => {
  const S = cenario({ maos: [J[0], TANKI5P, J[2], J[3]], compras: ['5p'], dora: '9s', ura: '4s' });
  tsumogiri(S, 0);
  const o = P.opcoesReacao(S, 1);
  assert.ok(o.ron, 'devia poder dar ron');
  assert.ok(o.ron.yaku.some(y => y.id === 'tanyao'));
  ag(S, 1, { k: 'ron' });
  assert.strictEqual(S.pontos[1], 26300);
  assert.strictEqual(S.pontos[0], 23700);
  assert.ok(!S.m.resultado.renchan, 'dealer não ganhou nem estava em tenpai: gira');
  assert.strictEqual(S.proxHonba, 0);
});

t('riichi duplo, ippatsu e ron: varetas, honba e pagamento', () => {
  const S = cenario({ maos: [J[0], TANKI5P, J[2], J[3]], compras: ['1z', '2p', '5p'], dora: '9s', ura: '4s', honba: 1 });
  tsumogiri(S, 0);
  assert.strictEqual(S.m.pend.j, 1);
  const o = P.opcoesDescarte(S, 1);
  const idR = o.riichi.find(id => M.kindDe(id) === K('2p'));
  assert.ok(idR !== undefined, 'riichi disponível descartando 2p');
  ag(S, 1, { k: 'descartar', id: idR, riichi: true });
  assert.strictEqual(S.pontos[1], 24000);
  assert.strictEqual(S.varetas, 1);
  assert.strictEqual(S.m.riichi[1], 2, 'riichi na primeira volta, sem chamadas: duplo');
  assert.ok(S.m.ippatsu[1]);
  tsumogiri(S, 2);                               /* 5p */
  const r = P.opcoesReacao(S, 1);
  assert.ok(r.ron);
  const ids = r.ron.yaku.map(y => y.id);
  assert.ok(ids.includes('dabururiichi') && ids.includes('ippatsu') && ids.includes('tanyao'));
  ag(S, 1, { k: 'ron' });
  /* 4 han 40 fu = mangan 8000 + honba 300 + vareta 1000 */
  assert.strictEqual(S.pontos[1], 24000 + 8000 + 300 + 1000);
  assert.strictEqual(S.pontos[2], 25000 - 8300);
  assert.strictEqual(S.varetas, 0);
  assert.strictEqual(soma(S), 100000);
});

t('riichi: depois de declarar só pode descartar a peça comprada', () => {
  const S = cenario({ maos: [J[0], TANKI5P, J[2], J[3]], compras: ['1z', '2p', '5s', '1p', '9p', '9s'] });
  tsumogiri(S, 0);
  const idR = P.opcoesDescarte(S, 1).riichi.find(id => M.kindDe(id) === K('2p'));
  ag(S, 1, { k: 'descartar', id: idR, riichi: true });
  tsumogiri(S, 2); tsumogiri(S, 3); tsumogiri(S, 0);
  const o = P.opcoesDescarte(S, 1);
  assert.strictEqual(o.descartes.length, 1);
  assert.strictEqual(o.descartes[0], S.m.comprada[1]);
  assert.strictEqual(o.riichi.length, 0);
  const r = P.agir(S, 1, { k: 'descartar', id: S.m.hands[1][0] });
  assert.ok(!r.ok);
});

t('furiten: descartar a própria espera impede o ron', () => {
  const S = cenario({ maos: [J[1], TANKI5P, J[2], J[4]], compras: ['1z', '5p', '9p', '9s', '5p'] });
  tsumogiri(S, 0);
  tsumogiri(S, 1);          /* compra 5p e joga: a espera 5p vai para o rio */
  tsumogiri(S, 2); tsumogiri(S, 3);
  /* o dealer compra 5p e descarta */
  const o = P.opcoesReacao(S, 1);
  assert.strictEqual(o.ron, null);
  /* o dealer descarta 5p */
  tsumogiri(S, 0);
  assert.strictEqual(P.opcoesReacao(S, 1).ron, null, 'furiten bloqueia o ron');
});

t('furiten temporário: passar por um ron bloqueia até o próprio descarte', () => {
  const S = cenario({ maos: [J[1], TANKI5P, J[2], J[4]], compras: ['5p', '9p', '9s', '8s', '1z', '1z'] });
  tsumogiri(S, 0);                                   /* dealer joga 5p: ron disponível para o 1 */
  assert.ok(P.opcoesReacao(S, 1).ron);
  ag(S, 1, { k: 'passar' });
  assert.ok(S.m.furitenTemp[1]);
  assert.strictEqual(S.m.pend.j, 1);
  tsumogiri(S, 1);                                   /* o descarte encerra o furiten temporário */
  assert.ok(!S.m.furitenTemp[1]);
});

t('chi: só do jogador da esquerda; kuikae proíbe a peça e a ponta oposta', () => {
  const S = cenario({ maos: [J[1], '5m6m1p4p7p2s5s8s9s1z2z3z6z', J[2], J[4]], compras: ['4m'] });
  assert.strictEqual(S.m.hands[1].length, 13);
  tsumogiri(S, 0);
  const o = P.opcoesReacao(S, 1);
  assert.strictEqual(o.chi.length, 1, 'chi 4-5-6 esperado');
  assert.strictEqual(P.opcoesReacao(S, 2).chi.length, 0, 'só o da esquerda pode chi');
  ag(S, 1, { k: 'chi', ids: o.chi[0] });
  assert.deepStrictEqual(S.m.proibidos.slice().sort((a, b) => a - b), [K('4m'), K('7m')]);
  const od = P.opcoesDescarte(S, 1);
  od.descartes.forEach(id => assert.ok(![K('4m'), K('7m')].includes(M.kindDe(id))));
  assert.strictEqual(od.tsumo, null);
  assert.strictEqual(od.riichi.length, 0);
  assert.ok(!S.m.semChamadas);
});

t('pon: não deixa descartar a peça pedida; vira dono da vez', () => {
  const S = cenario({ maos: [J[1], '8m8m1p4p7p2s5s8s9s1z2z3z6z', J[2], J[4]], compras: ['8m'] });
  tsumogiri(S, 0);
  const o = P.opcoesReacao(S, 1);
  assert.ok(o.pon.length >= 1);
  ag(S, 1, { k: 'pon', ids: o.pon[0] });
  assert.strictEqual(S.m.pend.j, 1);
  assert.deepStrictEqual(S.m.proibidos, [K('8m')]);
  assert.strictEqual(S.m.melds[1][0].t, 'pon');
  assert.strictEqual(S.m.rios[0][0].tomada, true);
});

t('kan aberto: rinshan, dora de kan só depois do descarte', () => {
  const S = cenario({ maos: [J[1], '1z1z1z2m5m8m3p6p9p4s7s2z3z', J[2], J[4]], compras: ['1z'], rinshan: '7p7s', dora: '1m', ura: '2m' });
  tsumogiri(S, 0);
  const o = P.opcoesReacao(S, 1);
  assert.ok(o.kan, 'daiminkan disponível');
  ag(S, 1, { k: 'kan' });
  assert.strictEqual(S.m.kans, 1);
  assert.strictEqual(S.m.nDora, 1, 'dora de kan ainda não revelado');
  assert.strictEqual(S.m.pend.j, 1);
  assert.strictEqual(M.kindDe(S.m.comprada[1]), K('7p'), 'rinshan vem do muro morto');
  assert.strictEqual(S.m.hands[1].length + 3 * S.m.melds[1].length, 14);
  ag(S, 1, { k: 'descartar', id: S.m.comprada[1] });
  assert.strictEqual(S.m.nDora, 2, 'dora de kan revelado depois do descarte');
});

t('ankan revela o dora na hora; o muro vivo encolhe', () => {
  const S = cenario({ maos: ['2m2m2m5m8m3p6p9p4s7s2z3z4z', J[0], J[2], J[4]], compras: ['2m'], rinshan: '9m', dora: '1m' });
  const o = P.opcoesDescarte(S, 0);
  assert.deepStrictEqual(o.ankan, [K('2m')]);
  const antes = P.restantes(S.m);
  ag(S, 0, { k: 'ankan', kind: K('2m') });
  assert.strictEqual(S.m.nDora, 2);
  assert.strictEqual(P.restantes(S.m), antes - 1);
  assert.strictEqual(S.m.melds[0][0].t, 'ankan');
  assert.strictEqual(S.m.melds[0][0].aberto, false);
  assert.strictEqual(M.kindDe(S.m.comprada[0]), K('9m'));
});

t('kakan com chankan: o ron vale e o yaku é chankan', () => {
  const S = cenario({
    maos: [J[1], '2m4m456p789p123s55s', '4m5m6m1p2p3p4s5s6s2z3z', J[4]],
    melds: [[2, 'pon', K('3m'), true]],
    compras: ['1z', '9p', '3m']
  });
  /* o jogador 2 tem 10 peças na mão + pon de 3m. dealer j0 descarta, j1 compra e descarta, j2 compra 3m */
  tsumogiri(S, 0);
  ag(S, 1, { k: 'descartar', id: S.m.comprada[1] });
  assert.strictEqual(S.m.pend.j, 2);
  const o = P.opcoesDescarte(S, 2);
  assert.strictEqual(o.kakan.length, 1);
  ag(S, 2, { k: 'kakan', id: o.kakan[0] });
  assert.strictEqual(S.m.pend.tipo, 'reacao');
  const r = P.opcoesReacao(S, 1);
  assert.ok(r.ron, 'jogador 1 espera 3m (kanchan)');
  assert.ok(r.ron.yaku.some(y => y.id === 'chankan'));
  ag(S, 1, { k: 'ron' });
  assert.strictEqual(S.m.resultado.tipo, 'ron');
  assert.strictEqual(S.m.resultado.de, 2);
});

t('kakan sem ron: completa, compra rinshan e revela o dora depois do descarte', () => {
  const S = cenario({
    maos: [J[1], J[0], '4m5m6m1p2p3p4s5s6s2z3z', J[4]],
    melds: [[2, 'pon', K('3m'), true]],
    compras: ['1z', '9p', '3m'], rinshan: '8p'
  });
  tsumogiri(S, 0); tsumogiri(S, 1);
  const o = P.opcoesDescarte(S, 2);
  ag(S, 2, { k: 'kakan', id: o.kakan[0] });
  assert.strictEqual(S.m.melds[2][0].t, 'kakan');
  assert.strictEqual(S.m.melds[2][0].ids.length, 4);
  assert.strictEqual(S.m.kans, 1);
  assert.strictEqual(S.m.nDora, 1);
  assert.strictEqual(S.m.pend.j, 2);
  assert.strictEqual(M.kindDe(S.m.comprada[2]), K('8p'));
});

t('chankan de ankan só para kokushi', () => {
  /* jogador 1 espera 7z em kokushi; jogador 2 faz ankan de 7z */
  const S = cenario({
    maos: [J[0], '1m9m1p9p1s9s1z2z3z4z5z6z6z', '7z7z7z2m5m8m3p6p9p4s7s2z', J[4]],
    compras: ['1z', '9s', '7z']
  });
  /* confere a espera: kokushi com par de 6z, falta 7z */
  assert.deepStrictEqual(P.esperasDe(S, 1, S.m.hands[1]), [K('7z')]);
  tsumogiri(S, 0);
  ag(S, 1, { k: 'descartar', id: S.m.comprada[1] });
  const o = P.opcoesDescarte(S, 2);
  assert.deepStrictEqual(o.ankan, [K('7z')]);
  ag(S, 2, { k: 'ankan', kind: K('7z') });
  assert.strictEqual(S.m.pend.tipo, 'reacao');
  assert.ok(P.opcoesReacao(S, 1).ron);
  ag(S, 1, { k: 'ron' });
  assert.ok(S.m.resultado.vencedores[0].res.yakuman >= 1);
});

t('ankan comum não pode ser roubado por mão sem kokushi', () => {
  const S = cenario({
    maos: [J[0], '2m3m4m5p6p7p3s3s5s6s7s8s8s', '7z7z7z2m5m8m3p6p9p4s7s2z', J[4]],
    compras: ['1z', '9s', '7z']
  });
  tsumogiri(S, 0);
  ag(S, 1, { k: 'descartar', id: S.m.comprada[1] });
  ag(S, 2, { k: 'ankan', kind: K('7z') });
  assert.strictEqual(S.m.pend.tipo, 'descarte', 'sem chankan: o jogador 2 segue jogando');
  assert.strictEqual(S.m.pend.j, 2);
});

t('ankan em riichi: só se as esperas não mudam', () => {
  const S = cenario({ maos: ['3m3m3m4m4p5p6p7p8p9p1s2s3s', J[1], J[0], J[4]], compras: ['3m'] });
  S.m.riichi[0] = 1;
  assert.deepStrictEqual(P.opcoesDescarte(S, 0).ankan, [], '3334m: o kan muda as esperas');
  const S2 = cenario({ maos: ['234m555p678s99p11s', J[2], J[2], J[2]], compras: ['5p'] });
  S2.m.riichi[0] = 1;
  assert.strictEqual(S2.m.hands[0].length, 14);
  assert.deepStrictEqual(P.opcoesDescarte(S2, 0).ankan, [K('5p')], '555p fechada: o kan mantém as esperas');
});


/* junk sem 1z e sem dragões: para suufon e pao */
const S0 = '1m4m7m2p5p8p3s6s9s2z3z4z9p';
const S1 = '2m5m8m3p6p1s4s7s2z3z4z9p5z'.replace('5z', '8p');
const S2 = '3m6m9m1p4p7p2s5s8s2z3z4z9m';
const S3 = '1m4m7m2p5p8p3s6s9s2z3z4z9s';

t('suufon renda: quatro Leste iguais na primeira volta', () => {
  const S = cenario({ maos: [S0, S1, S2, S3], compras: ['1z', '1z', '1z', '1z'] });
  for (let j = 0; j < 4; j++) tsumogiri(S, j);
  assert.ok(S.m.resultado, 'devia ter acabado');
  assert.strictEqual(S.m.resultado.tipo, 'abortada');
  assert.strictEqual(S.m.resultado.motivo, 'suufon');
  assert.ok(S.m.resultado.renchan);
  assert.strictEqual(S.proxHonba, 1);
});

t('kyuushu kyuuhai', () => {
  const S = cenario({ maos: ['1m9m1p9p1s9s1z2z3z4z5z2m3m', S1, S2, S3], compras: ['6z'] });
  const o = P.opcoesDescarte(S, 0);
  assert.ok(o.kyuushu);
  ag(S, 0, { k: 'kyuushu' });
  assert.strictEqual(S.m.resultado.motivo, 'kyuushu');
  assert.ok(S.m.resultado.renchan);
});

t('exaustão: tenpai paga 3000 e o dealer em tenpai repete', () => {
  const S = cenario({ maos: [TANKI5P, S1, S2, S3], compras: ['6m'], restantes: 1 });
  assert.strictEqual(P.restantes(S.m), 0, 'última peça já comprada');
  tsumogiri(S, 0);
  const r = S.m.resultado;
  assert.ok(r && r.tipo === 'empate' && r.motivo === 'exaustao', JSON.stringify(r && r.motivo));
  assert.deepStrictEqual(S.pontos, [28000, 24000, 24000, 24000]);
  assert.ok(r.renchan);
  assert.strictEqual(S.proxHonba, 1);
});

t('exaustão: dealer sem tenpai passa a vez e a honba sobe', () => {
  const S = cenario({ maos: [S0, TANKI5P, S2, S3], compras: ['6m'], restantes: 1 });
  tsumogiri(S, 0);
  const r = S.m.resultado;
  assert.strictEqual(r.motivo, 'exaustao');
  assert.ok(!r.renchan);
  assert.strictEqual(S.pontos[1], 28000);
  assert.strictEqual(S.proxHonba, 1);
  assert.ok(P.proximaMao(S));
  assert.strictEqual(S.dealer, 1);
  assert.strictEqual(S.honba, 1);
});

t('haitei: tsumo na última peça vale 1 han a mais', () => {
  const S = cenario({ maos: [TANKI5P, S1, S2, S3], compras: ['5p'], restantes: 1 });
  S.m.rios[0].push({ id: 0, riichi: false, tsumogiri: false, tomada: false });   /* não é a primeira compra: sem tenhou */
  const o = P.opcoesDescarte(S, 0);
  assert.ok(o.tsumo);
  assert.ok(o.tsumo.yaku.some(y => y.id === 'haitei'));
});

t('houtei: ron no último descarte', () => {
  const S = cenario({ maos: [S0, TANKI5P, S2, S3], compras: ['5p'], restantes: 1 });
  tsumogiri(S, 0);
  const o = P.opcoesReacao(S, 1);
  assert.ok(o.ron && o.ron.yaku.some(y => y.id === 'houtei'));
  assert.strictEqual(o.pon.length + o.chi.length, 0, 'sem chamadas na última peça');
  ag(S, 1, { k: 'ron' });
  assert.strictEqual(S.m.resultado.tipo, 'ron');
});

t('nagashi mangan: só pontas, nenhuma tomada', () => {
  const S = cenario({ maos: [S0, S1, S2, S3], compras: ['6m'], restantes: 1 });
  const m = S.m;
  m.rios[1] = [{ id: 0, riichi: false, tsumogiri: true, tomada: false }, { id: 4 * 8, riichi: false, tsumogiri: false, tomada: false }];
  tsumogiri(S, 0);
  const r = S.m.resultado;
  assert.strictEqual(r.motivo, 'nagashi');
  assert.deepStrictEqual(r.nagashi, [1]);
  /* não dealer: dealer paga 4000, os outros 2000 */
  assert.strictEqual(S.pontos[1], 25000 + 8000);
  assert.strictEqual(S.pontos[0], 25000 - 4000);
  assert.strictEqual(S.pontos[2], 25000 - 2000);
});

const RON8 = [
  '234m456m678p55m67s', '234p456p678m55m67s'.replace('55m', '55s'), J[4]
];
t('ron duplo: honba e varetas vão para quem está mais perto', () => {
  const A = '234m456m678p55p67s';        /* espera 5s/8s */
  const B = '234p456p678m55m67s';
  const S = cenario({ maos: [S2, A, B, S2], compras: ['8s'], honba: 2, varetas: 2, pontos: [24000, 24000, 24000, 24000] });
  tsumogiri(S, 0);
  assert.ok(P.opcoesReacao(S, 1).ron && P.opcoesReacao(S, 2).ron);
  ag(S, 1, { k: 'ron' }); ag(S, 2, { k: 'ron' });
  const r = S.m.resultado;
  assert.strictEqual(r.vencedores.length, 2);
  assert.strictEqual(r.cabeca, 1);
  /* cada um: tanyao + pinfu = 2 han 30 fu = 2000; a cabeça leva mais honba (600) e as 2 varetas */
  assert.strictEqual(S.pontos[1], 24000 + 2000 + 600 + 2000);
  assert.strictEqual(S.pontos[2], 24000 + 2000);
  assert.strictEqual(S.pontos[0], 24000 - 2000 - 2000 - 600);
  assert.strictEqual(S.varetas, 0);
});

t('ron triplo: empate forçado', () => {
  const A = '234m456m678p55p67s', B = '234p456p678m55m67s', C = '345m567p234s55s67s'.replace('67s', '67s');
  const S = cenario({ maos: [S2, A, B, '234m345p456s99p67s'], compras: ['8s'] });
  tsumogiri(S, 0);
  assert.ok(P.opcoesReacao(S, 3).ron, 'jogador 3 também espera 5s/8s');
  ag(S, 1, { k: 'ron' }); ag(S, 2, { k: 'ron' }); ag(S, 3, { k: 'ron' });
  assert.strictEqual(S.m.resultado.tipo, 'abortada');
  assert.strictEqual(S.m.resultado.motivo, 'sanchahou');
});

t('pao: daisangen paga o jogador que deu o terceiro dragão', () => {
  /* j0 tem pons abertos de 5z e 6z e espera pon de 7z; dealer é j1 */
  const S = cenario({
    dealer0: 1,
    maos: ['7z7z44m55m9s', S1, S2, S3],
    melds: [[0, 'pon', K('5z'), true], [0, 'pon', K('6z'), true]],
    compras: ['7z', '2s', '4m']
  });
  /* S1 tem 14 peças no dealer: j1 comprou 7z. descarta 7z */
  tsumogiri(S, 1);
  const o = P.opcoesReacao(S, 0);
  assert.ok(o.pon.length >= 1);
  ag(S, 0, { k: 'pon', ids: o.pon[0] });
  assert.deepStrictEqual(S.m.pao[0] && S.m.pao[0].tipo, 'daisangen');
  assert.strictEqual(S.m.pao[0].de, 1);
  ag(S, 0, { k: 'descartar', id: idDe(S, 0, K('9s')) });
  ag(S, 3, { k: 'passar' });
  /* j1 compra e descarta; j2 compra 4m e descarta: j0 espera 4m/5m */
  tsumogiri(S, 1);
  tsumogiri(S, 2);
  const r = P.opcoesReacao(S, 0);
  assert.ok(r.ron, 'ron de daisangen');
  ag(S, 0, { k: 'ron' });
  const res = S.m.resultado;
  assert.strictEqual(res.vencedores[0].res.yakuman, 1);
  /* j0 não é dealer: 32000. O descartador (j2) paga 16000 e o pao (j1) outros 16000 */
  assert.strictEqual(S.pontos[0], 25000 + 32000);
  assert.strictEqual(S.pontos[2], 25000 - 16000);
  assert.strictEqual(S.pontos[1], 25000 - 16000);
  assert.strictEqual(soma(S), 100000);
});

t('fim: falência encerra a partida', () => {
  const S = cenario({ maos: [S0, TANKI5P, S2, S3], compras: ['5p'], pontos: [1000, 29000, 35000, 35000] });
  tsumogiri(S, 0);
  ag(S, 1, { k: 'ron' });
  assert.ok(S.pontos[0] < 0);
  assert.ok(S.fim && S.fim.motivo === 'falencia');
  assert.strictEqual(S.fim.ranking.length, 4);
  assert.ok(Math.abs(S.fim.final.reduce((a, b) => a + b, 0)) < 0.05);
  assert.ok(!P.proximaMao(S));
});

t('fim: última mão com o dealer vencendo na frente termina a partida (agari-yame)', () => {
  const S = cenario({ rod: 7, dealer0: 0, maos: [TANKI5P, S1, S2, S3], compras: ['5p'], pontos: [30000, 25000, 25000, 20000] });
  assert.strictEqual(S.dealer, 3, 'South 4: o dealer é o jogador 3');
});

t('fim: South 4, dealer ganha na frente com 30000+: termina', () => {
  const S = cenario({ rod: 7, dealer0: 0, maos: [S0, S1, S2, TANKI5P.replace('5p', '5p')], compras: ['x'.slice(0, 0)], pontos: [20000, 20000, 20000, 40000] });
  const dealer = S.dealer; assert.strictEqual(dealer, 3);
});

t('fim: South 4 sem ninguém com 30000: prorroga para o Oeste', () => {
  const S = cenario({ rod: 7, dealer0: 0, maos: [S0, S1, TANKI5P, S3], compras: ['5p'], pontos: [24000, 24000, 24000, 24000] });
  /* dealer = jogador 3 descarta 5p? o dealer comprou 5p e joga */
  tsumogiri(S, 3);
  /* jogador 0 vem depois: quem tem espera é o jogador 2? só confere o dealer */
  assert.ok(S.m.pend);
});

console.log("ok=" + ok + " falhas=" + falhas); process.exitCode = falhas ? 1 : 0;
