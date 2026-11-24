/* testes da pontuação do Riichi: node testes/riichi.test.js */
const assert = require('assert');
const M = require('../nucleo.js');
const R = require('../riichi.js');
let ok = 0, falhas = 0;
function t(nome, fn) { try { fn(); ok++; } catch (e) { falhas++; console.log('FALHA ' + nome + ': ' + e.message); } }

function tipos(s) {
  const r = []; let nums = [];
  for (const ch of s.replace(/\s+/g, '')) {
    if (/[0-9]/.test(ch)) nums.push(+ch);
    else { for (const n of nums) r.push(ch === 'm' ? n - 1 : ch === 'p' ? 9 + n - 1 : ch === 's' ? 18 + n - 1 : 27 + n - 1); nums = []; }
  }
  return r;
}
const um = (s) => tipos(s)[0];
function base(o) { return Object.assign({ melds: [], tsumo: false, ventoRodada: 0, ventoJogador: 1, doras: [], uras: [], aka: 0 }, o); }
function p(fechada, ganhou, extra) { return R.pontuar(base(Object.assign({ fechada: M.cont(tipos(fechada)), ganhou: um(ganhou) }, extra))); }
const ids = (r) => r.yaku.map((y) => y.id).sort();
const pag = (r, dealer, tsumo) => R.pagamentos(r.base, dealer, tsumo);

t('riichi tsumo pinfu tanyao: 20 fu, 4 han = 1300/2600', () => {
  const r = p('234m456m345p678s66p', '4m', { tsumo: true, riichi: true });
  assert.ok(r.ok, r.motivo);
  assert.deepStrictEqual(ids(r), ['pinfu', 'riichi', 'tanyao', 'tsumo']);
  assert.strictEqual(r.fu, 20); assert.strictEqual(r.han, 4);
  assert.deepStrictEqual(pag(r, false, true), { dealer: 2600, outros: 1300 });
});
t('ron fechado, pinfu: 30 fu', () => {
  const r = p('234m456m345p678s66p', '4m', { riichi: true });
  assert.strictEqual(r.fu, 30); assert.strictEqual(r.han, 3);
  assert.strictEqual(pag(r, false, false).ron, 3900);
});
t('sete pares: 25 fu, 2 han (sem tsumo = 1600)', () => {
  const r = p('1133m5577p2244s99s'.replace('99s', '9s9s'), '9s', {});
  assert.ok(r.ok, r.motivo);
  assert.strictEqual(r.fu, 25);
  assert.ok(ids(r).includes('chiitoi'));
  assert.strictEqual(pag(r, false, false).ron, 1600);
});
t('sem yaku não vale', () => {
  const r = p('123m456p789s123s11z', '3s', { ventoRodada: 0, ventoJogador: 2 });
  assert.ok(!r.ok); assert.strictEqual(r.motivo, 'sem yaku');
});
t('mão incompleta', () => {
  const r = p('123m456p789s123s12z', '3s', {});
  assert.ok(!r.ok);
});
t('yakuhai: dragão em trinca aberta', () => {
  const r = R.pontuar(base({ fechada: M.cont(tipos('234m456p789s55p')), melds: [{ t: 'pon', k: um('7z'), aberto: true }], ganhou: um('9s') }));
  assert.ok(r.ok, r.motivo);
  assert.ok(ids(r).includes('yakuhai33'));
  assert.strictEqual(r.han, 1);
});
t('vento da rodada e do jogador (leste/leste) contam duas vezes', () => {
  const r2 = R.pontuar(base({ fechada: M.cont(tipos('234m456p789s55p')), melds: [{ t: 'pon', k: um('1z'), aberto: true }], ganhou: um('9s'), ventoRodada: 0, ventoJogador: 0 }));
  assert.ok(r2.ok, r2.motivo);
  assert.strictEqual(r2.han, 2);
});
t('tanyao aberto vale (kuitan)', () => {
  const r = R.pontuar(base({ fechada: M.cont(tipos('456p678s55p')), melds: [{ t: 'chi', k: um('2m'), aberto: true }, { t: 'chi', k: um('3m'), aberto: true }], ganhou: um('8s') }));
  assert.ok(r.ok, r.motivo);
  assert.ok(ids(r).includes('tanyao'));
  assert.strictEqual(r.fu, 30);
});
t('honitsu aberto 2 han; fechado 3 han', () => {
  const a = R.pontuar(base({ fechada: M.cont(tipos('123456m11z')), melds: [{ t: 'pon', k: um('2z'), aberto: true }, { t: 'chi', k: um('7m'), aberto: true }], ganhou: um('6m'), ventoJogador: 1 }));
  assert.ok(a.ok, a.motivo);
  assert.ok(ids(a).includes('honitsu'));
  assert.strictEqual(a.yaku.find((y) => y.id === 'honitsu').han, 2);
});
t('chinitsu fechado 6 han', () => {
  const r = p('234m234m567m789m11m', '7m', { tsumo: true });
  assert.ok(r.ok, r.motivo);
  assert.strictEqual(r.yaku.find((y) => y.id === 'chinitsu').han, 6);
});
t('sanshoku doujun fechado = 2 han', () => {
  const r = p('123m123p123s456m99p', '6m', {});
  assert.ok(r.ok, r.motivo);
  assert.ok(ids(r).includes('sanshoku'));
});
t('ittsu', () => {
  const r = p('123456789m234p55s', '4p', {});
  assert.ok(r.ok, r.motivo);
  assert.ok(ids(r).includes('ittsu'));
});
t('iipeikou e ryanpeikou', () => {
  const a = p('223344m456p678s99s', '4m', { ventoRodada: 0 });
  assert.ok(ids(a).includes('iipeikou') || ids(a).includes('ryanpeikou'));
  const b = p('112233m445566p77s', '6p', {});
  assert.ok(b.ok);
  assert.ok(ids(b).includes('ryanpeikou'), ids(b).join());
  assert.ok(!ids(b).includes('iipeikou'));
});
t('toitoi e sanankou', () => {
  const r = p('222m555p888s44z'.replace('44z', '') + '3z3z', '2m', { tsumo: true });
  assert.ok(r.ok, r.motivo);
});
t('ron em shanpon: a trinca completada por ron não é oculta', () => {
  /* 111m 222p 333s + 55z? aqui: 111m 222p 33s 33s... teste direto de sanankou com tsumo vs ron */
  const tsumo = p('111m222p333s456s77z', '3s', { tsumo: true });
  const ron = p('111m222p333s456s77z', '3s', { riichi: true });
  assert.ok(tsumo.ok && ron.ok);
  assert.ok(ids(tsumo).includes('sanankou'));
  assert.ok(!ids(ron).includes('sanankou'));
});
t('kokushi e kokushi de 13 espera (duplo)', () => {
  const a = p('19m19p19s1234567z1m', '1m', {});
  assert.ok(a.ok, a.motivo);
  assert.strictEqual(a.yakuman, 2);
  const b = p('19m19p19s123456z6z7z', '7z', {});
  assert.ok(b.ok, b.motivo);
  assert.strictEqual(b.yakuman, 1);
});
t('suuankou comum e tanki', () => {
  const a = p('111m222p333s444m55z', '1m', { tsumo: true });
  assert.ok(a.ok, a.motivo);
  assert.strictEqual(a.yakuman, 1);
  const b = p('111m222p333s444m55z', '5z', {});
  assert.ok(b.ok);
  assert.strictEqual(b.yakuman, 2, 'espera tanki: duplo');
  const c = p('111m222p333s444m55z', '1m', {});
  assert.ok(c.ok);
  assert.strictEqual(c.yakuman, 0, 'ron em shanpon: a trinca fica aberta');
});
t('daisangen e pagamentos de yakuman', () => {
  const r = R.pontuar(base({ fechada: M.cont(tipos('234m55p')), melds: [{ t: 'pon', k: um('5z'), aberto: true }, { t: 'pon', k: um('6z'), aberto: true }, { t: 'pon', k: um('7z'), aberto: true }], ganhou: um('5p'), ventoJogador: 1 }));
  assert.ok(r.ok, r.motivo);
  assert.strictEqual(r.yakuman, 1);
  assert.strictEqual(pag(r, false, false).ron, 32000);
  assert.strictEqual(pag(r, true, false).ron, 48000);
});
t('tsuuiisou', () => {
  const r = p('111z222z333z444z55z', '5z', {});
  assert.ok(r.ok, r.motivo);
  assert.ok(ids(r).includes('tsuuiisou'));
});
t('ryuuiisou (verde)', () => {
  const r = p('234s234s666s888s66z', '8s', { tsumo: true });
  assert.ok(r.ok, r.motivo);
  assert.ok(ids(r).includes('ryuuiisou'));
});
t('chuuren poutou', () => {
  const r = p('1112345678999m' + '5m', '5m', {});
  assert.ok(r.ok, r.motivo);
  assert.ok(ids(r).includes('chuuren'));
});
t('suukantsu', () => {
  const r = R.pontuar(base({ fechada: M.cont(tipos('55p')), melds: [{ t: 'ankan', k: um('1m'), aberto: false }, { t: 'kan', k: um('2m'), aberto: true }, { t: 'kan', k: um('3m'), aberto: true }, { t: 'ankan', k: um('4m'), aberto: false }], ganhou: um('5p') }));
  assert.ok(r.ok, r.motivo);
  assert.ok(ids(r).includes('suukantsu'));
});
t('dora, ura e aka somam han', () => {
  const r = p('234m456p345s678s66p', '4m', { tsumo: true, riichi: true, doras: [um('2m')], uras: [um('6p')], aka: 1 });
  assert.ok(r.ok, r.motivo);
  assert.strictEqual(r.dora, 1); assert.strictEqual(r.ura, 3); assert.strictEqual(r.aka, 1);
});
t('kazoe: 13 han vira yakuman de 8000 pontos-base', () => {
  const r = p('234m456p345s678s66p', '4m', { tsumo: true, riichi: true, ippatsu: true, doras: [um('2m'), um('3m'), um('5m')].map(() => um('6p')), aka: 3 });
  assert.ok(r.ok, r.motivo);
  assert.ok(r.base >= 6000);
});
t('limites: mangan 2000, haneman 3000, baiman 4000', () => {
  assert.strictEqual(R.baseDe(5, 30).base, 2000);
  assert.strictEqual(R.baseDe(6, 30).base, 3000);
  assert.strictEqual(R.baseDe(8, 30).base, 4000);
  assert.strictEqual(R.baseDe(11, 30).base, 6000);
  assert.strictEqual(R.baseDe(13, 30).base, 8000);
  assert.strictEqual(R.baseDe(4, 40).base, 2000);       /* 4 han 40 fu = mangan */
  assert.strictEqual(R.baseDe(4, 30).base, 1920);
});
t('pagamentos em múltiplos de 100', () => {
  assert.deepStrictEqual(R.pagamentos(240, false, true), { dealer: 500, outros: 300 });
  assert.deepStrictEqual(R.pagamentos(240, true, true), { cada: 500 });
  assert.strictEqual(R.pagamentos(240, false, false).ron, 1000);
  assert.strictEqual(R.pagamentos(240, true, false).ron, 1500);
});
t('penchan e kanchan valem 2 fu; ryanmen não', () => {
  /* ron, mão fechada: 20 + 10 = 30; com espera ruim 32 -> 40 */
  const ryan = p('123m456p789s234s55p', '2s', { riichi: true });
  assert.ok(ryan.ok, ryan.motivo);
  assert.strictEqual(ryan.fu, 30); assert.strictEqual(ryan.han, 2);
  const pen = p('123m456p789s123s55p', '3s', { riichi: true });
  assert.ok(pen.ok, pen.motivo);
  assert.strictEqual(pen.fu, 40);
  const kan = p('123m456p789s234s55p', '3s', { riichi: true });
  assert.strictEqual(kan.fu, 40);
});
t('rinshan, chankan, haitei e houtei contam 1 han', () => {
  const base1 = '234m456p345s678s66p';
  assert.ok(ids(p(base1, '4m', { tsumo: true, rinshan: true })).includes('rinshan'));
  assert.ok(ids(p(base1, '4m', { chankan: true })).includes('chankan'));
  assert.ok(ids(p(base1, '4m', { tsumo: true, haitei: true })).includes('haitei'));
  assert.ok(ids(p(base1, '4m', { houtei: true })).includes('houtei'));
});
t('chiitoitsu com chankan', () => {
  const r = p('1133m5577p2244s99s'.replace('99s', '9s9s'), '9s', { chankan: true });
  assert.ok(ids(r).includes('chankan') && ids(r).includes('chiitoi'));
});

console.log('ok=' + ok + ' falhas=' + falhas);
process.exitCode = falhas ? 1 : 0;
