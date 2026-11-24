/* ==========================================================================
   riichi.js - pontuação do Mahjong Japonês (Riichi): yaku, fu, han e pagamentos (sem DOM)

   pontuar(e) recebe:
     fechada   contagem (34) das peças da mão fechada, JÁ com a peça da vitória
     melds     [{t:'chi'|'pon'|'kan'|'ankan'|'kakan', k:tipo base (chi: a menor), aberto:bool}]
     ganhou    tipo da peça que fechou a mão
     tsumo     true = vitória por compra própria
     ventoRodada, ventoJogador   0 Leste, 1 Sul, 2 Oeste, 3 Norte
     riichi, duploRiichi, ippatsu, rinshan, chankan, haitei, houtei, tenhou, chiihou   flags
     doras, uras   tipos que valem dora / ura-dora (já convertidos a partir dos indicadores)
     aka           quantidade de quintos vermelhos na mão e nos melds
     kuitan        true (padrão): tanyao vale com mão aberta
   Devolve {ok:false, motivo} ou {ok:true, yakuman, han, fu, yaku:[{id,nome,jp,han}], dora, ura, aka, limite, base}
   Regras seguidas: as do Tenhou (ariari, kuitan, kazoe-yakuman, yakuman duplo para
   suuankou tanki, kokushi de 13 espera, chuuren de 9 espera e daisuushii), sem kiriage mangan.
   ========================================================================== */
(function (raiz, fabrica) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = fabrica(require('./nucleo.js'));
  else raiz.Riichi = fabrica(raiz.Mj);
})(typeof self !== 'undefined' ? self : this, function (M) {
  'use strict';

  var Y = {
    riichi: ['Riichi', '立直'], ippatsu: ['Ippatsu', '一発'], tsumo: ['Menzen Tsumo', '門前清自摸和'], tanyao: ['Tanyao', '断幺九'],
    pinfu: ['Pinfu', '平和'], iipeikou: ['Iipeikou', '一盃口'], haitei: ['Haitei Raoyue', '海底摸月'], houtei: ['Houtei Raoyui', '河底撈魚'],
    rinshan: ['Rinshan Kaihou', '嶺上開花'], chankan: ['Chankan', '搶槓'],
    dabururiichi: ['Double Riichi', 'ダブル立直'], chiitoi: ['Chiitoitsu', '七対子'], sanshoku: ['Sanshoku Doujun', '三色同順'], ittsu: ['Ittsu', '一気通貫'],
    chanta: ['Chanta', '混全帯幺九'], toitoi: ['Toitoi', '対々和'], sanankou: ['Sanankou', '三暗刻'], sanshokuK: ['Sanshoku Doukou', '三色同刻'],
    sankantsu: ['Sankantsu', '三槓子'], shousangen: ['Shousangen', '小三元'], honroutou: ['Honroutou', '混老頭'],
    honitsu: ['Honitsu', '混一色'], junchan: ['Junchan', '純全帯幺九'], ryanpeikou: ['Ryanpeikou', '二盃口'], chinitsu: ['Chinitsu', '清一色'],
    tenhou: ['Tenhou', '天和'], chiihou: ['Chiihou', '地和'], kokushi: ['Kokushi Musou', '国士無双'], suuankou: ['Suuankou', '四暗刻'],
    daisangen: ['Daisangen', '大三元'], shousuushii: ['Shousuushii', '小四喜'], daisuushii: ['Daisuushii', '大四喜'], tsuuiisou: ['Tsuuiisou', '字一色'],
    chinroutou: ['Chinroutou', '清老頭'], ryuuiisou: ['Ryuuiisou', '緑一色'], chuuren: ['Chuuren Poutou', '九蓮宝燈'], suukantsu: ['Suukantsu', '四槓子']
  };
  var YAKUHAI_NOME = { 27: 'Leste', 28: 'Sul', 29: 'Oeste', 30: 'Norte', 31: 'Dragão Branco', 32: 'Dragão Verde', 33: 'Dragão Vermelho' };
  var YAKUHAI_JP = { 27: '東', 28: '南', 29: '西', 30: '北', 31: '白', 32: '發', 33: '中' };

  function item(id, han, extra) {
    var base = Y[id] || ['', ''];
    var o = { id: id, nome: base[0], jp: base[1], han: han };
    if (extra) { o.nome += extra.nome || ''; o.jp = extra.jp || o.jp; }
    return o;
  }

  /* ---- limites e pagamentos ---- */
  function baseDe(han, fu, yakuman) {
    if (yakuman) return { base: 8000 * yakuman, limite: yakuman >= 2 ? (yakuman === 2 ? 'yakuman duplo' : 'yakuman x' + yakuman) : 'yakuman' };
    if (han >= 13) return { base: 8000, limite: 'kazoe yakuman' };
    if (han >= 11) return { base: 6000, limite: 'sanbaiman' };
    if (han >= 8) return { base: 4000, limite: 'baiman' };
    if (han >= 6) return { base: 3000, limite: 'haneman' };
    if (han >= 5) return { base: 2000, limite: 'mangan' };
    var b = fu * Math.pow(2, han + 2);
    if (b >= 2000) return { base: 2000, limite: 'mangan' };
    return { base: b, limite: '' };
  }
  function cima100(x) { return Math.ceil(x / 100) * 100; }
  /* pagamentos sem honba/riichi: ron -> {ron}; tsumo -> {dealer, outros} (cada um paga) */
  function pagamentos(base, ganhaDealer, tsumo) {
    if (!tsumo) return { ron: cima100(base * (ganhaDealer ? 6 : 4)) };
    if (ganhaDealer) return { cada: cima100(base * 2) };
    return { dealer: cima100(base * 2), outros: cima100(base) };
  }

  /* ---- peças de uma forma ---- */
  function ehYakuhaiPar(k, e) { return k >= 31 || k === 27 + e.ventoRodada || k === 27 + e.ventoJogador; }


  /* a peça vencedora w pode completar a mão de vários jeitos; cada jeito muda a espera (e os fu) */
  function interpretacoes(forma, w) {
    var r = [], vistos = {};
    if (forma.par === w) r.push({ idx: -1, espera: 'tanki' });
    forma.grupos.forEach(function (g, idx) {
      var chave = g.t + g.k;
      if (g.t === 't') {
        if (g.k !== w) return;
        if (vistos[chave + 'x']) return; vistos[chave + 'x'] = 1;
        r.push({ idx: idx, espera: 'shanpon' });
      } else {
        if (w < g.k || w > g.k + 2) return;
        var esp;
        if (w === g.k + 1) esp = 'kanchan';
        else if (w === g.k) esp = (M.num(g.k) === 7) ? 'penchan' : 'ryanmen';
        else esp = (M.num(g.k) === 1) ? 'penchan' : 'ryanmen';
        if (vistos[chave + esp]) return; vistos[chave + esp] = 1;
        r.push({ idx: idx, espera: esp });
      }
    });
    return r;
  }

  /* o melhor de dois resultados: yakuman, depois han, depois fu */
  function valor(r) { return r.yakuman ? 1e6 * r.yakuman : r.han * 1000 + r.fu; }
  function melhor(a, b) { if (!a) return b; if (!b) return a; return valor(b) > valor(a) ? b : a; }

  function ponta(g) { return g.t === 's' ? (M.num(g.k) === 1 || M.num(g.k) === 7) : M.ehPonta(g.k); }

  function avaliar(e, forma, ctx) {
    /* forma: {par, grupos:[{t:'s'|'t', k, aberto, kan, porRon}]}; ctx: {espera} */
    var G = forma.grupos, par = forma.par, tsumo = e.tsumo, i, j;
    var menzen = G.every(function (g) { return !g.aberto; });
    var seqs = G.filter(function (g) { return g.t === 's'; });
    var trips = G.filter(function (g) { return g.t === 't'; });
    var kans = G.filter(function (g) { return g.kan; });
    var fechadas = trips.filter(function (g) { return !g.aberto && !g.porRon; }).length;
    var res = { yakuman: 0, yaku: [], han: 0, fu: 0 };
    var espera = ctx.espera;

    /* todas as peças (tipos) da forma */
    var tipos = [par, par];
    G.forEach(function (g) { if (g.t === 's') tipos.push(g.k, g.k + 1, g.k + 2); else tipos.push(g.k, g.k, g.k); });
    var algumaHonra = tipos.some(M.ehHonra), todasHonra = tipos.every(M.ehHonra);
    var simples = tipos.every(function (k) { return !M.ehPonta(k); });
    var naipes = {}; tipos.forEach(function (k) { if (k < 27) naipes[M.naipe(k)] = 1; });
    var nNaipes = Object.keys(naipes).length;

    /* ---- yakuman ---- */
    function yk(id, mult) { var it = item(id, 0); it.yakuman = true; it.mult = mult || 1; if (mult === 2) it.nome += ' (duplo)'; res.yaku.push(it); res.yakuman += mult || 1; }
    var drag = trips.filter(function (g) { return M.ehDragao(g.k); }).length;
    var ventosT = trips.filter(function (g) { return M.ehVento(g.k); }).length;
    if (drag === 3) yk('daisangen');
    if (ventosT === 4) yk('daisuushii', 2);
    else if (ventosT === 3 && M.ehVento(par)) yk('shousuushii');
    if (todasHonra) yk('tsuuiisou');
    if (tipos.every(M.ehTerminal)) yk('chinroutou');
    if (tipos.every(M.ehVerde)) yk('ryuuiisou');
    if (menzen && fechadas === 4) yk('suuankou', espera === 'tanki' ? 2 : 1);
    if (kans.length === 4) yk('suukantsu');
    if (e.chuuren) yk('chuuren', e.chuuren);
    if (e.tenhou) yk('tenhou');
    if (e.chiihou) yk('chiihou');
    if (res.yakuman) return res;

    /* ---- yaku comuns ---- */
    var han = 0;
    function add(id, h, extra) { res.yaku.push(item(id, h, extra)); han += h; }
    if (e.duploRiichi) add('dabururiichi', 2); else if (e.riichi) add('riichi', 1);
    if (e.ippatsu) add('ippatsu', 1);
    if (menzen && tsumo) add('tsumo', 1);
    if (simples && (menzen || e.kuitan !== false)) add('tanyao', 1);
    if (e.haitei) add('haitei', 1);
    if (e.houtei) add('houtei', 1);
    if (e.rinshan) add('rinshan', 1);
    if (e.chankan) add('chankan', 1);

    /* yakuhai */
    trips.forEach(function (g) {
      if (M.ehDragao(g.k)) add('yakuhai' + g.k, 1, { nome: ': ' + YAKUHAI_NOME[g.k], jp: YAKUHAI_JP[g.k] });
      else if (M.ehVento(g.k)) {
        if (g.k === 27 + e.ventoRodada) add('vrodada' + g.k, 1, { nome: ' (vento da rodada): ' + YAKUHAI_NOME[g.k], jp: YAKUHAI_JP[g.k] });
        if (g.k === 27 + e.ventoJogador) add('vjogador' + g.k, 1, { nome: ' (vento do jogador): ' + YAKUHAI_NOME[g.k], jp: YAKUHAI_JP[g.k] });
      }
    });

    /* pinfu */
    var parYaku = ehYakuhaiPar(par, e);
    var pinfu = menzen && trips.length === 0 && !parYaku && espera === 'ryanmen';
    if (pinfu) add('pinfu', 1);

    /* sequências iguais */
    if (menzen) {
      var porK = {}; seqs.forEach(function (g) { porK[g.k] = (porK[g.k] || 0) + 1; });
      var pares = 0; Object.keys(porK).forEach(function (k) { pares += Math.floor(porK[k] / 2); });
      if (pares >= 2) add('ryanpeikou', 3); else if (pares === 1) add('iipeikou', 1);
    }
    /* sanshoku doujun e ittsu */
    var temSeq = function (k) { return seqs.some(function (g) { return g.k === k; }); };
    for (i = 0; i < 7; i++) if (temSeq(i) && temSeq(9 + i) && temSeq(18 + i)) { add('sanshoku', menzen ? 2 : 1); break; }
    for (i = 0; i < 3; i++) if (temSeq(9 * i) && temSeq(9 * i + 3) && temSeq(9 * i + 6)) { add('ittsu', menzen ? 2 : 1); break; }

    /* trincas */
    if (trips.length === 4) add('toitoi', 2);
    if (fechadas === 3) add('sanankou', 2);
    var temTrip = function (k) { return trips.some(function (g) { return g.k === k; }); };
    for (i = 0; i < 9; i++) if (temTrip(i) && temTrip(9 + i) && temTrip(18 + i)) { add('sanshokuK', 2); break; }
    if (kans.length === 3) add('sankantsu', 2);
    if (drag === 2 && M.ehDragao(par)) add('shousangen', 2);

    /* pontas */
    var todosPonta = tipos.every(M.ehPonta);
    if (todosPonta && seqs.length === 0) add('honroutou', 2);
    else if (G.every(ponta) && ponta({ t: 't', k: par }) && seqs.length > 0) {
      if (algumaHonra) add('chanta', menzen ? 2 : 1); else add('junchan', menzen ? 3 : 2);
    }
    /* cores */
    if (nNaipes === 1) { if (!algumaHonra) add('chinitsu', menzen ? 6 : 5); else add('honitsu', menzen ? 3 : 2); }

    /* ---- fu ---- */
    var fu = 20;
    if (!pinfu || !tsumo) { /* pinfu com tsumo fica em 20 */ }
    if (menzen && !tsumo) fu += 10;
    if (tsumo && !pinfu) fu += 2;
    G.forEach(function (g) {
      if (g.t !== 't') return;
      var aberta = g.aberto || g.porRon, pt = M.ehPonta(g.k), v = pt ? 4 : 2;
      if (!aberta) v *= 2;
      if (g.kan) v *= 4;
      fu += v;
    });
    if (M.ehDragao(par)) fu += 2;
    if (par === 27 + e.ventoRodada) fu += 2;
    if (par === 27 + e.ventoJogador) fu += 2;
    if (espera === 'kanchan' || espera === 'penchan' || espera === 'tanki') fu += 2;
    if (pinfu && tsumo) fu = 20;
    if (!menzen && fu === 20) fu = 30;      /* mão aberta só de sequências: 30 fu */
    fu = Math.ceil(fu / 10) * 10;
    res.han = han; res.fu = fu;
    return res;
  }

  function pontuar(e) {
    var c = e.fechada.slice(), melds = e.melds || [], w = e.ganhou, i;
    var fechadoTudo = melds.every(function (m) { return !m.aberto; });
    var totalAka = e.aka || 0;
    /* mão total (para chuuren e cores) */
    var res = null, ctx0, cc;

    /* kokushi */
    if (melds.length === 0 && M.soma(c) === 14 && M.orfaosOk(c)) {
      var c13 = c.slice(); c13[w]--;
      var treze = M.ORFAOS.every(function (k) { return c13[k] === 1; });
      var r = { yakuman: treze ? 2 : 1, han: 0, fu: 0, yaku: [item('kokushi', 0)] };
      r.yaku[0].yakuman = true; r.yaku[0].mult = treze ? 2 : 1; if (treze) r.yaku[0].nome += ' (13 esperas, duplo)';
      res = r;
    }
    /* chuuren poutou (mão fechada de um naipe: 1112345678999 + qualquer peça do naipe) */
    e.chuuren = 0;
    if (melds.length === 0 && M.soma(c) === 14) {
      var alvo = [3, 1, 1, 1, 1, 1, 1, 1, 3];
      for (var sn = 0; sn < 3; sn++) {
        var base = sn * 9, ok = true, j;
        for (j = 0; j < 27; j++) if ((j < base || j >= base + 9) && c[j] > 0) ok = false;
        for (j = 0; j < 9; j++) if (c[base + j] < alvo[j]) ok = false;
        if (!ok) continue;
        var c2 = c.slice(); c2[w]--;
        var exato = true;
        for (j = 0; j < 9; j++) if (c2[base + j] !== alvo[j]) exato = false;
        e.chuuren = exato ? 2 : 1;
      }
    }

    /* chiitoitsu */
    if (melds.length === 0 && M.soma(c) === 14 && M.seteParesOk(c)) {
      var todos = []; for (i = 0; i < 34; i++) if (c[i]) todos.push(i);
      var r7 = avaliarSete(e, c, todos);
      res = melhor(res, r7);
    }
    if (res && res.yaku[0] && res.yaku[0].id === 'kokushi' && (e.tenhou || e.chiihou)) {
      var ty = item(e.tenhou ? 'tenhou' : 'chiihou', 0); ty.yakuman = true; ty.mult = 1; res.yaku.push(ty); res.yakuman += 1;
    }
    /* padrão */
    var cm = c.slice();
    var formas = M.decompor(cm);
    for (var f = 0; f < formas.length; f++) {
      var fm = formas[f];
      var gruposAll = fm.grupos.map(function (g) { return { t: g.t, k: g.k, aberto: false, kan: false }; });
      melds.forEach(function (m) {
        if (m.t === 'chi') gruposAll.push({ t: 's', k: m.k, aberto: true, kan: false });
        else gruposAll.push({ t: 't', k: m.k, aberto: !!m.aberto, kan: m.t !== 'pon' });
      });
      var interp = interpretacoes({ par: fm.par, grupos: gruposAll.slice(0, fm.grupos.length) }, w);
      for (var ii = 0; ii < interp.length; ii++) {
        var it = interp[ii];
        var gcopia = gruposAll.map(function (g) { return { t: g.t, k: g.k, aberto: g.aberto, kan: g.kan }; });
        if (!e.tsumo && it.idx >= 0 && gcopia[it.idx].t === 't') gcopia[it.idx].porRon = true;  /* trinca fechada por ron conta como aberta (fu e trincas ocultas), mas a mão segue fechada */
        var r2 = avaliar(e, { par: fm.par, grupos: gcopia }, { espera: it.espera });
        r2.forma = { par: fm.par, grupos: gcopia, espera: it.espera };
        res = melhor(res, r2);
      }
    }
    if (!res) return { ok: false, motivo: 'a mão não está completa' };
    if (!res.yakuman && res.han === 0) return { ok: false, motivo: 'sem yaku' };
    /* dora */
    var doraN = 0, uraN = 0, tudo = [];
    for (i = 0; i < 34; i++) { var n = c[i]; if (n) tudo.push([i, n]); }
    melds.forEach(function (m) {
      if (m.t === 'chi') { tudo.push([m.k, 1], [m.k + 1, 1], [m.k + 2, 1]); }
      else tudo.push([m.k, m.t === 'pon' ? 3 : 4]);
    });
    tudo.forEach(function (p) {
      (e.doras || []).forEach(function (d) { if (d === p[0]) doraN += p[1]; });
      if (e.riichi || e.duploRiichi) (e.uras || []).forEach(function (d) { if (d === p[0]) uraN += p[1]; });
    });
    var out = { ok: true, yakuman: res.yakuman, han: res.han, fu: res.fu, yaku: res.yaku, dora: doraN, ura: uraN, aka: totalAka, forma: res.forma };
    if (!out.yakuman) {
      out.han += doraN + uraN + totalAka;
      if (doraN) out.yaku.push({ id: 'dora', nome: 'Dora', jp: 'ドラ', han: doraN });
      if (uraN) out.yaku.push({ id: 'ura', nome: 'Ura-dora', jp: '裏ドラ', han: uraN });
      if (totalAka) out.yaku.push({ id: 'aka', nome: 'Aka-dora', jp: '赤ドラ', han: totalAka });
    }
    var b = baseDe(out.han, out.fu, out.yakuman);
    out.base = b.base; out.limite = b.limite;
    return out;
  }

  function avaliarSete(e, c, kinds) {
    var tsumo = e.tsumo, h = 0, Y1 = [], res = { yakuman: 0, han: 0, fu: 25, yaku: Y1 };
    function add(id, han) { Y1.push(item(id, han)); h += han; }
    var nai = {}, algumHonra = false, tudoSimples = true, tudoPonta = true, tudoHonra = true;
    kinds.forEach(function (k) {
      nai[M.naipe(k)] = 1; if (M.ehHonra(k)) algumHonra = true; else tudoHonra = false;
      if (M.ehPonta(k)) tudoSimples = false; else tudoPonta = false;
    });
    if (tudoHonra) { var r = { yakuman: 1, han: 0, fu: 0, yaku: [item('tsuuiisou', 0)] }; r.yaku[0].yakuman = true; return r; }
    if (e.duploRiichi) add('dabururiichi', 2); else if (e.riichi) add('riichi', 1);
    if (e.ippatsu) add('ippatsu', 1);
    if (tsumo) add('tsumo', 1);
    if (tudoSimples && true) add('tanyao', 1);
    if (e.haitei) add('haitei', 1);
    if (e.houtei) add('houtei', 1);
    if (e.rinshan) add('rinshan', 1);
    if (e.chankan) add('chankan', 1);
    add('chiitoi', 2);
    if (tudoPonta) add('honroutou', 2);
    var naipes = Object.keys(nai).filter(function (n) { return +n < 3; }).length;
    if (naipes === 1) { if (!algumHonra) add('chinitsu', 6); else add('honitsu', 3); }
    res.han = h;
    if (e.tenhou || e.chiihou) {
      var yy = { yakuman: 1, han: 0, fu: 0, yaku: [item(e.tenhou ? 'tenhou' : 'chiihou', 0)] }; yy.yaku[0].yakuman = true; return yy;
    }
    return res;
  }

  return { pontuar: pontuar, baseDe: baseDe, pagamentos: pagamentos, cima100: cima100, YAKU: Y };
});
