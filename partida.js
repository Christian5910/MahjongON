/* ==========================================================================
   partida.js - motor da partida de Riichi (sem DOM, 100% serializável em JSON)

   Quatro assentos (0 a 3). O estado S guarda tudo: pontos, rodada, honba, varetas e a mão em
   andamento (S.m). Quem precisa agir está em S.m.pend:
     {tipo:'descarte', j}                      o jogador j tem 14 peças e precisa jogar
     {tipo:'reacao', esperando:[...], respostas:{}, ...}   jogadores que podem pedir a peça descartada

   Funções:
     criar(cfg)               nova partida   (cfg: fim 'hanchan'|'tonpuusen', aka, semente, determ, humanos)
     opcoesDescarte(S, j)     o que j pode fazer no próprio turno
     opcoesReacao(S, j)       o que j pode fazer diante de um descarte (ron, pon, chi, kan)
     agir(S, j, acao)         aplica uma ação; devolve {ok:true} ou {ok:false, motivo}
     rodar(S, decidir)        deixa os robôs jogarem até a vez de uma pessoa (ou o fim da mão)
     proximaMao(S)            passa para a mão seguinte; false se a partida acabou
   Ações: {k:'descartar', id, riichi} {k:'tsumo'} {k:'ankan', kind} {k:'kakan', id} {k:'kyuushu'}
          {k:'passar'} {k:'ron'} {k:'pon', ids} {k:'chi', ids} {k:'kan'}

   Regras (as do Tenhou): 25000 de início e 30000 de retorno, aka-dora (um 5 vermelho por naipe),
   kuitan, kuikae proibido, riichi com 1000 e furiten (permanente, de riichi e temporário),
   ippatsu, kan com dora de kan, chankan (kakan, e ankan só para kokushi), rinshan, haitei e houtei,
   pao (daisangen e daisuushii), nagashi mangan, quatro tipos de empate forçado (kyuushu kyuuhai,
   suufon renda, suucha riichi, suukaikan) e triplo ron como empate, honba de 300, pagamento de
   tenpai de 3000, falência (abaixo de 0), prorrogação para o vento seguinte se ninguém chegou a
   30000 e fim antecipado na última mão (agari-yame e tenpai-yame).
   ========================================================================== */
(function (raiz, fabrica) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = fabrica(require('./nucleo.js'), require('./riichi.js'), require('./sorteio.js'));
  else raiz.Partida = fabrica(raiz.Mj, raiz.Riichi, raiz.Sorteio);
})(typeof self !== 'undefined' ? self : this, function (M, R, Sorteio) {
  'use strict';

  var FIM_VIVA = 122;           /* peças 0..121 do muro: compra; 122..135: muro morto */
  var IND_DORA = 126, IND_URA = 127;

  function prox(j) { return (j + 1) & 3; }
  function ida(S) { return S.cfg.fim === 'tonpuusen' ? 0 : 1; }  /* último vento "normal" */
  function restantes(m) { return (FIM_VIVA - m.kans) - m.iv; }
  function ordenar(ids) { ids.sort(function (a, b) { return a - b; }); return ids; }
  function kindsDe(ids) { return ids.map(M.kindDe); }
  function log(m, o) { m.log.push(o); }

  /* ---------------------------------------------------------------- criação */
  function criar(cfg) {
    cfg = cfg || {};
    var semente = cfg.semente || Sorteio.novaSemente();
    var g = Sorteio.criar(semente);
    var S = {
      v: 1, semente: semente, rng: null,
      cfg: { fim: cfg.fim === 'tonpuusen' ? 'tonpuusen' : 'hanchan', aka: cfg.aka !== false, determ: !!cfg.determ, humanos: cfg.humanos || [0] },
      pontos: [25000, 25000, 25000, 25000],
      dealer0: g.inteiro(4), rod: 0, dealer: 0, vento: 0, honba: 0, varetas: 0, numMao: 0,
      m: null, fim: null
    };
    S.dealer = S.dealer0;
    S.rng = g.estado();
    iniciarMao(S);
    return S;
  }

  function iniciarMao(S) {
    var g = Sorteio.criar(S.rng);
    if (!S.cfg.determ) g.misturar(Sorteio.entropia());
    var muro = [], i;
    for (i = 0; i < 136; i++) muro.push(i);
    g.embaralhar(muro);
    S.rng = g.estado();
    S.vento = Math.floor(S.rod / 4);
    S.dealer = (S.dealer0 + S.rod) & 3;
    S.numMao++;
    var m = {
      muro: muro, iv: 52, kans: 0, nDora: 1, doraPend: 0,
      hands: [], melds: [[], [], [], []], rios: [[], [], [], []],
      riichi: [0, 0, 0, 0], ippatsu: [false, false, false, false],
      furitenTemp: [false, false, false, false], furitenRiichi: [false, false, false, false],
      riichiPend: -1, riichiDuplo: false,
      semChamadas: true, comprada: [null, null, null, null], proibidos: [],
      pao: [null, null, null, null], rinshan: false, vez: S.dealer,
      fase: 'descarte', pend: null, resultado: null, log: [], kakanPend: null
    };
    for (i = 0; i < 4; i++) m.hands.push(ordenar(muro.slice(i * 13, i * 13 + 13)));
    S.m = m;
    compra(S, S.dealer, false);
  }

  /* ---------------------------------------------------------------- compra */
  function compra(S, j, rinshan) {
    var m = S.m, id;
    if (rinshan) {
      id = m.muro[FIM_VIVA + m.kans - 1];   /* kans já foi incrementado */
    } else {
      if (restantes(m) <= 0) return fimExaustivo(S);
      id = m.muro[m.iv++];
    }
    m.hands[j].push(id);
    m.comprada[j] = id;
    m.rinshan = !!rinshan;
    m.vez = j;
    m.fase = 'descarte';
    m.pend = { tipo: 'descarte', j: j };
    log(m, { k: 'compra', j: j });
  }

  /* ---------------------------------------------------------------- consultas */
  function abertoDe(m, j) { return m.melds[j].some(function (x) { return x.aberto; }); }
  function vistaMelds(m, j) {
    var v = M.vazio();
    m.melds[j].forEach(function (x) { x.ids.forEach(function (id) { var k = M.kindDe(id); if (k < 34) v[k]++; }); });
    return v;
  }
  /* esperas de uma mão fechada com 3n+1 peças */
  function esperasDe(S, j, ids) {
    var m = S.m, c = M.contIds(ids), sem = m.melds[j].length === 0;
    return M.esperas(c, { setePares: sem, orfaos: sem }, vistaMelds(m, j));
  }
  function indicadores(S, base) {
    var m = S.m, r = [];
    for (var i = 0; i < m.nDora; i++) r.push(M.proximoDora(M.kindDe(m.muro[base + 2 * i])));
    return r;
  }
  function contarAka(S, ids) {
    if (!S.cfg.aka) return 0;
    var n = 0; ids.forEach(function (id) { if (M.ehAka(id)) n++; }); return n;
  }
  function entrada(S, j, tsumo, idGanhou, f) {
    var m = S.m, ids = m.hands[j].slice(), todos;
    if (!tsumo) ids.push(idGanhou);
    todos = ids.slice();
    m.melds[j].forEach(function (x) { todos = todos.concat(x.ids); });
    return {
      fechada: M.contIds(ids),
      melds: m.melds[j].map(function (x) { return { t: x.t, k: x.k, aberto: x.aberto }; }),
      ganhou: M.kindDe(idGanhou), tsumo: tsumo,
      ventoRodada: S.vento, ventoJogador: (j - S.dealer + 4) & 3,
      riichi: m.riichi[j] === 1, duploRiichi: m.riichi[j] === 2, ippatsu: m.ippatsu[j],
      rinshan: !!f.rinshan, chankan: !!f.chankan, haitei: !!f.haitei, houtei: !!f.houtei,
      tenhou: !!f.tenhou, chiihou: !!f.chiihou,
      doras: indicadores(S, IND_DORA), uras: indicadores(S, IND_URA),
      aka: contarAka(S, todos), kuitan: true
    };
  }

  function emFuriten(S, j, esp) {
    var m = S.m;
    if (m.furitenRiichi[j] || m.furitenTemp[j]) return true;
    for (var i = 0; i < m.rios[j].length; i++) if (esp.indexOf(M.kindDe(m.rios[j][i].id)) >= 0) return true;
    return false;
  }
  function podeRon(S, j, id, f) {
    var m = S.m, esp = esperasDe(S, j, m.hands[j]);
    if (esp.indexOf(M.kindDe(id)) < 0) return null;
    if (emFuriten(S, j, esp)) return null;
    var res = R.pontuar(entrada(S, j, false, id, f));
    return res.ok ? res : null;
  }
  function tenpaiDe(S, j) {
    return esperasDe(S, j, S.m.hands[j]).length > 0;
  }

  /* o 4º kan por um mesmo jogador? */
  function kansDe(m, j) { return m.melds[j].filter(function (x) { return x.t === 'kan' || x.t === 'ankan' || x.t === 'kakan'; }).length; }

  /* pode declarar ankan estando em riichi? (esperas inalteradas e a trinca nunca vira sequência) */
  function ankanEmRiichi(S, j, kind) {
    var m = S.m, mao13 = m.hands[j].filter(function (id) { return id !== m.comprada[j]; });
    if (M.kindDe(m.comprada[j]) !== kind) return false;
    var c13 = M.contIds(mao13);
    if (c13[kind] !== 3) return false;
    var esp = esperasDe(S, j, mao13);
    if (!esp.length) return false;
    var sem = m.melds[j].length === 0;
    for (var i = 0; i < esp.length; i++) {
      var c = c13.slice(); c[esp[i]]++;
      if (sem && (M.seteParesOk(c) || M.orfaosOk(c))) return false;
      var formas = M.decompor(c.slice());
      var algum = false;
      for (var f = 0; f < formas.length; f++) {
        var tem = formas[f].grupos.some(function (g) { return g.t === 't' && g.k === kind; });
        if (!tem) return false;
        algum = true;
      }
      if (!algum) return false;
    }
    /* as esperas depois do kan têm de ser as mesmas */
    var c10 = c13.slice(); c10[kind] = 0;
    var fake = M.esperas(c10, { setePares: false, orfaos: false }, (function () { var v = vistaMelds(m, j); v[kind] += 4; return v; })());
    if (fake.length !== esp.length) return false;
    for (i = 0; i < esp.length; i++) if (fake.indexOf(esp[i]) < 0) return false;
    return true;
  }

  function flagsTsumo(S, j) {
    var m = S.m;
    var primeira = m.semChamadas && m.rios[j].length === 0;
    return {
      rinshan: m.rinshan, haitei: restantes(m) === 0 && !m.rinshan,
      tenhou: primeira && j === S.dealer, chiihou: primeira && j !== S.dealer
    };
  }

  /* ---------------------------------------------------------------- opções */
  function opcoesDescarte(S, j) {
    var m = S.m, o = { descartes: [], riichi: [], tsumo: null, ankan: [], kakan: [], kyuushu: false };
    if (m.fase !== 'descarte' || !m.pend || m.pend.j !== j) return o;
    var mao = m.hands[j], dra = m.comprada[j];
    if (m.riichi[j]) o.descartes = dra !== null ? [dra] : [];
    else o.descartes = mao.filter(function (id) { return m.proibidos.indexOf(M.kindDe(id)) < 0; });
    if (dra === null) return o;   /* depois de chi ou pon só se descarta */

    var rt = R.pontuar(entrada(S, j, true, dra, flagsTsumo(S, j)));
    if (rt.ok) o.tsumo = rt;

    var c = M.contIds(mao), r = restantes(m), k;
    var podeKan = r > 0 && m.kans < 4;
    if (podeKan) {
      for (k = 0; k < 34; k++) {
        if (c[k] !== 4) continue;
        if (m.riichi[j] && !ankanEmRiichi(S, j, k)) continue;
        o.ankan.push(k);
      }
      if (!m.riichi[j]) {
        m.melds[j].forEach(function (x) {
          if (x.t !== 'pon') return;
          mao.forEach(function (id) { if (M.kindDe(id) === x.k) o.kakan.push(id); });
        });
      }
    }
    if (!m.riichi[j] && S.pontos[j] >= 1000 && r >= 4 && m.melds[j].every(function (x) { return x.t === 'ankan'; })) {
      var vistos = {};
      mao.forEach(function (id) {
        var chave = M.kindDe(id) + (M.ehAka(id) ? 'a' : '');
        if (vistos[chave] !== undefined) { if (vistos[chave]) o.riichi.push(id); return; }
        var resto = mao.filter(function (x) { return x !== id; });
        var ok = esperasDe(S, j, resto).length > 0;
        vistos[chave] = ok;
        if (ok) o.riichi.push(id);
      });
    }
    /* kyuushu kyuuhai */
    if (m.semChamadas && m.rios[j].length === 0 && !m.rinshan && !m.riichi[j] && m.melds[j].length === 0) {
      var n = 0; M.ORFAOS.forEach(function (kk) { if (c[kk] > 0) n++; });
      if (n >= 9) o.kyuushu = true;
    }
    return o;
  }

  function opcoesChi(S, j, id) {
    var m = S.m, kd = M.kindDe(id), c = M.contIds(m.hands[j]), res = [];
    M.opcoesChi(c, kd).forEach(function (par) {
      var A = m.hands[j].filter(function (x) { return M.kindDe(x) === par[0]; });
      var B = m.hands[j].filter(function (x) { return M.kindDe(x) === par[1]; });
      var vistos = {};
      A.forEach(function (a) { B.forEach(function (b) {
        var chave = (M.ehAka(a) ? 1 : 0) + ',' + (M.ehAka(b) ? 1 : 0);
        if (vistos[chave]) return; vistos[chave] = 1;
        res.push([a, b]);
      }); });
    });
    return res;
  }
  function proibidosApos(kd, tipo, ks) {
    var p = [kd];
    if (tipo === 'chi') {
      var ordem = ks.concat([kd]).sort(function (a, b) { return a - b; });
      if (kd === ordem[0] && M.num(ordem[2]) < 9 && ordem[2] < 27) p.push(ordem[2] + 1);
      if (kd === ordem[2] && M.num(ordem[0]) > 1) p.push(ordem[0] - 1);
    }
    return p;
  }
  function restaDescarteLivre(m, j, tirar, proib) {
    return m.hands[j].some(function (x) { return tirar.indexOf(x) < 0 && proib.indexOf(M.kindDe(x)) < 0; });
  }

  function opcoesReacao(S, j) {
    var m = S.m, p = m.pend, o = { ron: null, pon: [], chi: [], kan: false };
    if (!p || p.tipo !== 'reacao' || j === p.de) return o;
    if (p.origem === 'ankan') {
      var rr = podeRon(S, j, p.peca, { chankan: true });
      if (rr && rr.yaku.some(function (y) { return y.id === 'kokushi'; })) o.ron = rr;
      return o;
    }
    var f = p.origem === 'kakan' ? { chankan: true } : { houtei: restantes(m) === 0 };
    o.ron = podeRon(S, j, p.peca, f);
    if (p.origem !== 'descarte') return o;
    if (restantes(m) <= 0 || m.riichi[j]) return o;
    var kd = M.kindDe(p.peca), c = M.contIds(m.hands[j]), mao = m.hands[j];
    if (c[kd] >= 2) {
      var ids = mao.filter(function (x) { return M.kindDe(x) === kd; });
      var vistos = {};
      for (var a = 0; a < ids.length; a++) for (var b = a + 1; b < ids.length; b++) {
        var chave = (M.ehAka(ids[a]) ? 1 : 0) + ',' + (M.ehAka(ids[b]) ? 1 : 0);
        if (vistos[chave]) continue; vistos[chave] = 1;
        if (restaDescarteLivre(m, j, [ids[a], ids[b]], [kd])) o.pon.push([ids[a], ids[b]]);
      }
      if (c[kd] >= 3 && m.kans < 4) o.kan = true;
    }
    if (j === prox(p.de)) {
      opcoesChi(S, j, p.peca).forEach(function (par) {
        var prb = proibidosApos(kd, 'chi', kindsDe(par));
        if (restaDescarteLivre(m, j, par, prb)) o.chi.push(par);
      });
    }
    return o;
  }
  function temOpcao(o) { return !!(o.ron || o.pon.length || o.chi.length || o.kan); }

  /* ---------------------------------------------------------------- ações */
  function agir(S, j, a) {
    var m = S.m;
    if (S.fim) return { ok: false, motivo: 'a partida acabou' };
    if (!m || m.fase === 'fim') return { ok: false, motivo: 'a mão acabou' };
    if (!m.pend) return { ok: false, motivo: 'nada a fazer' };
    if (m.pend.tipo === 'descarte') {
      if (m.pend.j !== j) return { ok: false, motivo: 'não é a sua vez' };
      return agirDescarte(S, j, a);
    }
    return agirReacao(S, j, a);
  }

  function agirDescarte(S, j, a) {
    var m = S.m, o = opcoesDescarte(S, j);
    switch (a.k) {
      case 'descartar': {
        if (o.descartes.indexOf(a.id) < 0) return { ok: false, motivo: 'peça não pode ser descartada' };
        if (a.riichi && o.riichi.indexOf(a.id) < 0) return { ok: false, motivo: 'riichi não permitido com essa peça' };
        return descartar(S, j, a.id, !!a.riichi);
      }
      case 'tsumo': {
        if (!o.tsumo) return { ok: false, motivo: 'a mão não pode vencer' };
        return vitoria(S, [{ j: j, res: o.tsumo }], -1, true);
      }
      case 'kyuushu': {
        if (!o.kyuushu) return { ok: false, motivo: 'não permitido' };
        return fecharMao(S, { tipo: 'abortada', motivo: 'kyuushu', deltas: [0, 0, 0, 0], quem: j });
      }
      case 'ankan': {
        if (o.ankan.indexOf(a.kind) < 0) return { ok: false, motivo: 'kan fechado não permitido' };
        return ankan(S, j, a.kind);
      }
      case 'kakan': {
        if (o.kakan.indexOf(a.id) < 0) return { ok: false, motivo: 'kan aberto não permitido' };
        return kakan(S, j, a.id);
      }
    }
    return { ok: false, motivo: 'ação desconhecida' };
  }

  function descartar(S, j, id, declarando) {
    var m = S.m, mao = m.hands[j], idx = mao.indexOf(id);
    var tsumogiri = id === m.comprada[j];
    mao.splice(idx, 1);
    ordenar(mao);
    m.comprada[j] = null;
    m.proibidos = [];
    m.furitenTemp[j] = false;
    if (m.riichi[j] && !declarando) m.ippatsu[j] = false;
    if (m.riichi[j] === 0 && !declarando) m.ippatsu[j] = false;
    var entradaRio = { id: id, riichi: !!declarando, tsumogiri: tsumogiri, tomada: false };
    m.rios[j].push(entradaRio);
    if (declarando) { m.riichiPend = j; m.riichiDuplo = m.semChamadas && m.rios[j].length === 1; log(m, { k: 'riichi', j: j }); }
    log(m, { k: 'descarte', j: j, id: id, tsumogiri: tsumogiri });
    m.nDora += m.doraPend; m.doraPend = 0;
    m.rinshan = false;
    m.ultimo = { id: id, de: j };
    return abrirReacao(S, { origem: 'descarte', peca: id, de: j });
  }

  function abrirReacao(S, base) {
    var m = S.m;
    m.pend = { tipo: 'reacao', origem: base.origem, peca: base.peca, de: base.de, esperando: [], respostas: {}, opcoes: {} };
    for (var i = 1; i < 4; i++) {
      var j = (base.de + i) & 3, o = opcoesReacao(S, j);
      if (temOpcao(o)) { m.pend.esperando.push(j); }
    }
    m.fase = 'reacao';
    if (!m.pend.esperando.length) return resolverReacao(S);
    return { ok: true };
  }

  function agirReacao(S, j, a) {
    var m = S.m, p = m.pend;
    if (p.esperando.indexOf(j) < 0) return { ok: false, motivo: 'você não pode agir agora' };
    if (p.respostas[j]) return { ok: false, motivo: 'já respondeu' };
    var o = opcoesReacao(S, j), r = { k: a.k };
    switch (a.k) {
      case 'passar': break;
      case 'ron': if (!o.ron) return { ok: false, motivo: 'não pode dar ron' }; break;
      case 'kan': if (!o.kan) return { ok: false, motivo: 'não pode fazer kan' }; break;
      case 'pon': {
        var ok = o.pon.some(function (par) { return a.ids && par.length === a.ids.length && par.every(function (x) { return a.ids.indexOf(x) >= 0; }); });
        if (!ok) return { ok: false, motivo: 'pon inválido' };
        r.ids = a.ids.slice(); break;
      }
      case 'chi': {
        var ok2 = o.chi.some(function (par) { return a.ids && par.every(function (x) { return a.ids.indexOf(x) >= 0; }); });
        if (!ok2) return { ok: false, motivo: 'chi inválido' };
        r.ids = a.ids.slice(); break;
      }
      default: return { ok: false, motivo: 'ação desconhecida' };
    }
    p.respostas[j] = r;
    if (Object.keys(p.respostas).length < p.esperando.length) return { ok: true };
    return resolverReacao(S);
  }

  function marcarFuritenPorPassar(S, p) {
    var m = S.m;
    p.esperando.forEach(function (j) {
      var r = p.respostas[j];
      if (r && r.k === 'passar') {
        var o = opcoesReacao(S, j);
        if (o.ron) { if (m.riichi[j]) m.furitenRiichi[j] = true; else m.furitenTemp[j] = true; }
      }
    });
  }

  function resolverReacao(S) {
    var m = S.m, p = m.pend, i, j;
    /* 1. ron */
    var rons = [];
    for (i = 1; i < 4; i++) { j = (p.de + i) & 3; if (p.respostas[j] && p.respostas[j].k === 'ron') rons.push(j); }
    /* robôs/pessoas que passaram diante de um ron ficam em furiten */
    marcarFuritenPorPassar(S, p);
    if (rons.length) {
      if (rons.length === 3) return fecharMao(S, { tipo: 'abortada', motivo: 'sanchahou', deltas: [0, 0, 0, 0] });
      var f = p.origem === 'kakan' || p.origem === 'ankan' ? { chankan: true } : { houtei: restantes(m) === 0 };
      var vs = rons.map(function (w) { return { j: w, res: R.pontuar(entrada(S, w, false, p.peca, f)) }; });
      if (p.origem === 'kakan') { /* a peça adicionada ainda não entrou no meld */ }
      return vitoria(S, vs, p.de, false);
    }
    if (p.origem === 'kakan' || p.origem === 'ankan') return concluirKan(S, p);

    /* 2. riichi só vale se o descarte passou sem ron */
    estabelecerRiichi(S);

    /* 3. chamadas: kan/pon antes de chi */
    var quemKan = -1, quemPon = -1, quemChi = -1;
    for (i = 1; i < 4; i++) {
      j = (p.de + i) & 3; var r = p.respostas[j];
      if (!r) continue;
      if (r.k === 'kan') quemKan = j; else if (r.k === 'pon') quemPon = j; else if (r.k === 'chi') quemChi = j;
    }
    if (quemKan >= 0) return chamar(S, quemKan, 'kan', null);
    if (quemPon >= 0) return chamar(S, quemPon, 'pon', p.respostas[quemPon].ids);
    if (quemChi >= 0) return chamar(S, quemChi, 'chi', p.respostas[quemChi].ids);

    /* 4. nada: empates forçados e próximo jogador */
    return depoisDoDescarte(S);
  }

  function estabelecerRiichi(S) {
    var m = S.m, j = m.riichiPend;
    if (j < 0) return;
    S.pontos[j] -= 1000; S.varetas++;
    m.riichi[j] = m.riichiDuplo ? 2 : 1;
    m.ippatsu[j] = true;
    m.riichiPend = -1; m.riichiDuplo = false;
  }

  function depoisDoDescarte(S) {
    var m = S.m, i;
    /* suufon renda */
    if (m.semChamadas && m.rios.every(function (r) { return r.length === 1; })) {
      var k0 = M.kindDe(m.rios[0][0].id);
      if (M.ehVento(k0) && m.rios.every(function (r) { return M.kindDe(r[0].id) === k0; })) return fecharMao(S, { tipo: 'abortada', motivo: 'suufon', deltas: [0, 0, 0, 0] });
    }
    /* suucha riichi */
    if (m.riichi.every(function (x) { return x > 0; })) return fecharMao(S, { tipo: 'abortada', motivo: 'suucha', deltas: [0, 0, 0, 0] });
    /* suukaikan */
    if (m.kans === 4 && ![0, 1, 2, 3].some(function (x) { return kansDe(m, x) === 4; })) return fecharMao(S, { tipo: 'abortada', motivo: 'suukaikan', deltas: [0, 0, 0, 0] });
    var de = m.pend.de;
    return compra(S, prox(de), false), { ok: true };
  }

  /* ---------------------------------------------------------------- chamadas */
  function tirar(mao, ids) { ids.forEach(function (x) { var i = mao.indexOf(x); if (i >= 0) mao.splice(i, 1); }); }

  function chamar(S, j, tipo, ids) {
    var m = S.m, p = m.pend, id = p.peca, kd = M.kindDe(id), de = p.de;
    var rio = m.rios[de], ult = rio[rio.length - 1]; ult.tomada = true;
    m.semChamadas = false;
    for (var i = 0; i < 4; i++) m.ippatsu[i] = false;
    var mao = m.hands[j], meld;
    if (tipo === 'kan') {
      var tres = mao.filter(function (x) { return M.kindDe(x) === kd; }).slice(0, 3);
      tirar(mao, tres);
      meld = { t: 'kan', k: kd, ids: ordenar(tres.concat([id])), aberto: true, de: de, tomada: id };
      m.melds[j].push(meld);
      verPao(S, j, kd, de);
      m.kans++; m.doraPend++;
      m.pend = null; m.vez = j;
      log(m, { k: 'kan', j: j, de: de, id: id });
      compra(S, j, true);
      return { ok: true };
    }
    tirar(mao, ids);
    if (tipo === 'pon') {
      meld = { t: 'pon', k: kd, ids: ordenar(ids.concat([id])), aberto: true, de: de, tomada: id };
      m.proibidos = [kd];
      m.melds[j].push(meld);
      verPao(S, j, kd, de);
      meld = null;
    } else {
      var ks = kindsDe(ids).concat([kd]).sort(function (a, b) { return a - b; });
      meld = { t: 'chi', k: ks[0], ids: ids.concat([id]), aberto: true, de: de, tomada: id };
      m.proibidos = proibidosApos(kd, 'chi', kindsDe(ids));
    }
    if (meld) m.melds[j].push(meld);
    m.vez = j; m.fase = 'descarte'; m.pend = { tipo: 'descarte', j: j };
    m.comprada[j] = null; m.rinshan = false;
    log(m, { k: tipo, j: j, de: de, id: id });
    return { ok: true };
  }

  function verPao(S, j, kd, de) {
    var m = S.m, ms = m.melds[j].filter(function (x) { return x.t !== 'chi'; }), ks = ms.map(function (x) { return x.k; });
    if (kd >= 31 && [31, 32, 33].every(function (d) { return ks.indexOf(d) >= 0; })) m.pao[j] = { tipo: 'daisangen', de: de };
    if (kd >= 27 && kd <= 30 && [27, 28, 29, 30].every(function (d) { return ks.indexOf(d) >= 0; })) m.pao[j] = { tipo: 'daisuushii', de: de };
  }

  function ankan(S, j, kind) {
    var m = S.m, mao = m.hands[j];
    var quatro = mao.filter(function (x) { return M.kindDe(x) === kind; });
    /* chankan de kokushi: só vale se alguém realmente pode dar ron */
    m.kakanPend = { j: j, tipo: 'ankan', kind: kind, ids: quatro.slice() };
    m.pend = { tipo: 'reacao', origem: 'ankan', peca: quatro[0], de: j, esperando: [], respostas: {} };
    var temRon = false;
    for (var i = 1; i < 4; i++) if (opcoesReacao(S, (j + i) & 3).ron) temRon = true;
    if (temRon) return abrirReacao(S, { origem: 'ankan', peca: quatro[0], de: j });
    return concluirKanDireto(S);
  }
  function kakan(S, j, id) {
    var m = S.m;
    m.kakanPend = { j: j, tipo: 'kakan', id: id, kind: M.kindDe(id) };
    return abrirReacao(S, { origem: 'kakan', peca: id, de: j });
  }
  function concluirKan(S, p) { /* todos passaram diante do chankan */
    return concluirKanDireto(S);
  }
  function concluirKanDireto(S) {
    var m = S.m, kp = m.kakanPend, j = kp.j, mao = m.hands[j];
    m.kakanPend = null;
    m.semChamadas = false;
    for (var i = 0; i < 4; i++) m.ippatsu[i] = false;
    if (kp.tipo === 'ankan') {
      tirar(mao, kp.ids);
      m.melds[j].push({ t: 'ankan', k: kp.kind, ids: ordenar(kp.ids), aberto: false, de: -1 });
      m.kans++; m.nDora++;                 /* ankan abre o dora na hora */
      log(m, { k: 'ankan', j: j, kind: kp.kind });
    } else {
      tirar(mao, [kp.id]);
      var meld = m.melds[j].filter(function (x) { return x.t === 'pon' && x.k === kp.kind; })[0];
      meld.t = 'kakan'; meld.ids = ordenar(meld.ids.concat([kp.id]));
      m.kans++; m.doraPend++;
      log(m, { k: 'kakan', j: j, id: kp.id });
    }
    m.comprada[j] = null;
    ordenar(mao);
    m.pend = null;
    compra(S, j, true);
    return { ok: true };
  }

  /* ---------------------------------------------------------------- fim de mão */
  function ganhoDe(res) { return res; }

  function vitoria(S, vs, de, tsumo) {
    var m = S.m, deltas = [0, 0, 0, 0], honba = S.honba, i;
    var cabeca = vs[0].j;   /* já em ordem de proximidade a partir de quem descartou */
    if (!tsumo) {
      var ord = vs.slice().sort(function (a, b) { return ((a.j - de + 4) & 3) - ((b.j - de + 4) & 3); });
      vs = ord; cabeca = ord[0].j;
    }
    vs.forEach(function (w) {
      var res = w.res, dealerW = w.j === S.dealer, honbaW = (w.j === cabeca) ? honba : 0;
      var pao = m.pao[w.j], paoYaku = null;
      if (pao) paoYaku = res.yaku.filter(function (y) { return y.id === pao.tipo; })[0] || null;
      w.pagamentos = [0, 0, 0, 0];
      var base = res.base, pagos = w.pagamentos;
      var baseNormal = base, baseWao = 0;
      if (paoYaku) { baseWao = 8000 * paoYaku.mult; baseNormal = base - baseWao; }
      function pagarTsumo(b, extraHonba) {
        if (b <= 0) return;
        var pg = R.pagamentos(b, dealerW, true);
        for (i = 0; i < 4; i++) {
          if (i === w.j) continue;
          var q = dealerW ? pg.cada : (i === S.dealer ? pg.dealer : pg.outros);
          pagos[i] += q;
        }
      }
      if (tsumo) {
        pagarTsumo(baseNormal);
        if (paoYaku) {
          var pgp = R.pagamentos(baseWao, dealerW, true), totalPao = 0;
          for (i = 0; i < 4; i++) { if (i === w.j) continue; totalPao += dealerW ? pgp.cada : (i === S.dealer ? pgp.dealer : pgp.outros); }
          pagos[pao.de] += totalPao;
        }
        if (honbaW) {
          if (paoYaku && baseNormal <= 0) pagos[pao.de] += 300 * honbaW;
          else for (i = 0; i < 4; i++) if (i !== w.j) pagos[i] += 100 * honbaW;
        }
      } else {
        var rn = baseNormal > 0 ? R.pagamentos(baseNormal, dealerW, false).ron : 0;
        pagos[de] += rn;
        if (paoYaku) {
          var rp = R.pagamentos(baseWao, dealerW, false).ron;
          if (pao.de === de) pagos[de] += rp; else { pagos[de] += rp / 2; pagos[pao.de] += rp / 2; }
        }
        pagos[de] += 300 * honbaW;
      }
      for (i = 0; i < 4; i++) { deltas[i] -= pagos[i]; deltas[w.j] += pagos[i]; }
    });
    /* varetas do centro para a cabeça */
    var ganhoVaretas = S.varetas * 1000;
    deltas[cabeca] += ganhoVaretas; S.varetas = 0;
    var res = {
      tipo: tsumo ? 'tsumo' : 'ron', de: de, deltas: deltas, honba: honba, varetas: ganhoVaretas / 1000, cabeca: cabeca,
      vencedores: vs.map(function (w) { return { j: w.j, res: w.res, pagamentos: w.pagamentos, pao: m.pao[w.j], peca: tsumo ? m.comprada[w.j] : m.pend.peca, mao: m.hands[w.j].slice(), melds: m.melds[w.j].map(function (x) { return { t: x.t, k: x.k, ids: x.ids.slice(), aberto: x.aberto }; }) }; }),
      ura: vs.some(function (w) { return m.riichi[w.j] > 0; }) ? ids_ura(S) : []
    };
    log(m, { k: tsumo ? 'tsumo' : 'ron', j: cabeca });
    return fecharMao(S, res);
  }
  function ids_ura(S) {
    var r = [];
    for (var i = 0; i < S.m.nDora; i++) r.push(S.m.muro[IND_URA + 2 * i]);
    return r;
  }

  function nagashi(S, j) {
    var rio = S.m.rios[j];
    if (!rio.length) return false;
    return rio.every(function (x) { return !x.tomada && M.ehPonta(M.kindDe(x.id)); });
  }

  function fimExaustivo(S) {
    var m = S.m, i, deltas = [0, 0, 0, 0], tenpai = [], nT = 0;
    for (i = 0; i < 4; i++) { var t = tenpaiDe(S, i); tenpai.push(t); if (t) nT++; }
    var naga = [];
    for (i = 0; i < 4; i++) if (nagashi(S, i)) naga.push(i);
    m.pend = null;
    if (naga.length) {
      naga.forEach(function (w) {
        for (var q = 0; q < 4; q++) {
          if (q === w) continue;
          var v = (w === S.dealer) ? 4000 : (q === S.dealer ? 4000 : 2000);
          deltas[q] -= v; deltas[w] += v;
        }
      });
      return fecharMao(S, { tipo: 'empate', motivo: 'nagashi', deltas: deltas, tenpai: tenpai, nagashi: naga });
    }
    if (nT > 0 && nT < 4) {
      for (i = 0; i < 4; i++) deltas[i] = tenpai[i] ? 3000 / nT : -3000 / (4 - nT);
    }
    return fecharMao(S, { tipo: 'empate', motivo: 'exaustao', deltas: deltas, tenpai: tenpai });
  }

  function fecharMao(S, res) {
    var m = S.m, i;
    m.pend = null; m.fase = 'fim';
    estabelecerRiichiSeNaoRon(S, res);
    for (i = 0; i < 4; i++) S.pontos[i] += res.deltas[i];
    var dealerGanhou = (res.tipo === 'ron' || res.tipo === 'tsumo') && res.vencedores.some(function (w) { return w.j === S.dealer; });
    var renchan, honbaNovo;
    if (res.tipo === 'ron' || res.tipo === 'tsumo') { renchan = dealerGanhou; honbaNovo = dealerGanhou ? S.honba + 1 : 0; }
    else if (res.tipo === 'empate') { renchan = !!res.tenpai[S.dealer]; honbaNovo = S.honba + 1; }
    else { renchan = true; honbaNovo = S.honba + 1; }
    res.renchan = renchan; res.honbaNovo = honbaNovo;
    m.resultado = res;
    S.proxHonba = honbaNovo;
    log(m, { k: 'fim' });

    /* fim da partida? */
    var L = ida(S), motivo = null;
    var melhor = ranking(S)[0];
    var topo = S.pontos[melhor];
    if (S.pontos.some(function (p) { return p < 0; })) motivo = 'falencia';
    else {
      var ultimaMao = (S.vento === L && (S.rod & 3) === 3) || S.vento > L;
      if (renchan) {
        if (ultimaMao && res.tipo !== 'abortada' && topo >= 30000 && melhor === S.dealer) motivo = 'ultima';
        else if (S.vento > L && topo >= 30000) motivo = 'ultima';
      } else {
        var rodNovo = S.rod + 1, ventoNovo = Math.floor(rodNovo / 4);
        if (S.vento > L && topo >= 30000) motivo = 'ultima';
        else if (ventoNovo > L && (S.rod & 3) === 3) {
          if (topo >= 30000 || ventoNovo > L + 1) motivo = 'ultima';
        }
      }
    }
    if (motivo) S.fim = { motivo: motivo, ranking: ranking(S), final: pontuacaoFinal(S) };
    return { ok: true, fim: true };
  }
  function estabelecerRiichiSeNaoRon(S, res) {
    /* riichi declarado no descarte que levou ron não vale; em empate forçado/exaustão o riichi já foi pago */
    var m = S.m;
    if (m.riichiPend >= 0) {
      if (res.tipo === 'abortada' && res.motivo !== 'sanchahou') estabelecerRiichi(S);
      else { m.riichiPend = -1; m.riichiDuplo = false; }
    }
  }

  function ranking(S) {
    var idx = [0, 1, 2, 3];
    idx.sort(function (a, b) {
      if (S.pontos[b] !== S.pontos[a]) return S.pontos[b] - S.pontos[a];
      return ((a - S.dealer0 + 4) & 3) - ((b - S.dealer0 + 4) & 3);
    });
    return idx;
  }
  /* pontuação final com uma e oka: (pontos - 30000)/1000, uma 10-20, oka 20 para o primeiro; soma zero */
  function pontuacaoFinal(S) {
    var r = ranking(S), uma = [20, 10, -10, -20], fin = [0, 0, 0, 0], i, soma = 0;
    for (i = 0; i < 4; i++) {
      var p = r[i], v = Math.round((S.pontos[p] - 30000) / 100) / 10 + uma[i];
      fin[p] = v; if (i > 0) soma += v;
    }
    fin[r[0]] = Math.round((-soma) * 10) / 10;
    return fin;
  }

  function proximaMao(S) {
    if (S.fim || !S.m || S.m.fase !== 'fim') return false;
    var res = S.m.resultado;
    if (!res.renchan) { S.rod++; }
    S.honba = res.honbaNovo;
    iniciarMao(S);
    return true;
  }

  /* ---------------------------------------------------------------- piloto automático */
  /* quem precisa agir agora: [{j, tipo}] */
  function pendentes(S) {
    var m = S.m;
    if (S.fim || !m || m.fase === 'fim' || !m.pend) return [];
    if (m.pend.tipo === 'descarte') return [{ j: m.pend.j, tipo: 'descarte' }];
    return m.pend.esperando.filter(function (j) { return !m.pend.respostas[j]; }).map(function (j) { return { j: j, tipo: 'reacao' }; });
  }
  function ehHumano(S, j) { return S.cfg.humanos.indexOf(j) >= 0; }

  /* decidir(S, j, tipo, opcoes) -> ação. Roda os robôs até uma pessoa precisar agir ou a mão acabar */
  function rodar(S, decidir, limite) {
    var n = 0; limite = limite || 5000;
    while (n++ < limite) {
      var pd = pendentes(S);
      if (!pd.length) return 'fim';
      var bot = null;
      for (var i = 0; i < pd.length; i++) if (!ehHumano(S, pd[i].j)) { bot = pd[i]; break; }
      if (!bot) return 'humano';
      var o = bot.tipo === 'descarte' ? opcoesDescarte(S, bot.j) : opcoesReacao(S, bot.j);
      var a = decidir(S, bot.j, bot.tipo, o);
      var r = agir(S, bot.j, a);
      if (!r.ok) throw new Error('robô fez jogada inválida: ' + r.motivo + ' ' + JSON.stringify(a));
    }
    throw new Error('rodar: laço sem fim');
  }

  return {
    criar: criar, iniciarMao: iniciarMao, proximaMao: proximaMao,
    opcoesDescarte: opcoesDescarte, opcoesReacao: opcoesReacao, agir: agir, rodar: rodar, pendentes: pendentes,
    esperasDe: esperasDe, tenpaiDe: tenpaiDe, restantes: restantes, ranking: ranking, pontuacaoFinal: pontuacaoFinal,
    entrada: entrada, indicadores: indicadores, nagashi: nagashi, ehHumano: ehHumano, emFuriten: emFuriten,
    FIM_VIVA: FIM_VIVA, IND_DORA: IND_DORA, IND_URA: IND_URA,
    _compra: compra, _fecharMao: fecharMao
  };
});
