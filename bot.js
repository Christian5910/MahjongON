/* ==========================================================================
   bot.js - robôs e dicas do Riichi (sem DOM)

   Os robôs só usam o que um jogador de verdade enxerga: a própria mão, os descartes, as chamadas e
   os indicadores de dora. Nunca olham a mão dos outros nem o muro.

   Níveis: 1 Iniciante, 2 Fácil, 3 Médio, 4 Difícil, 5 Mestre.
     1  descarta quase ao acaso e chama às vezes
     2  joga pela menor distância para o tenpai (shanten), sem defesa
     3  escolhe também pelas peças que ainda podem vir e se defende de riichi com peças já descartadas
     4  soma suji e honras seguras na defesa, só chama com yaku e escolhe esperas melhores
     5  pesa o perigo contra o valor da própria mão, a posição no placar e a última mão

   Bot.decidir(S, j, tipo, opcoes, nivel) devolve uma ação para Partida.agir.
   Bot.avaliar(S, j) lista os descartes com shanten, peças que melhoram e perigo (usado nas dicas).
   Bot.dica(S, j) sugere a jogada para o jogador j e explica em português.
   ========================================================================== */
(function (raiz, fabrica) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = fabrica(require('./nucleo.js'), require('./partida.js'), require('./sorteio.js'));
  else raiz.Bot = fabrica(raiz.Mj, raiz.Partida, raiz.Sorteio);
})(typeof self !== 'undefined' ? self : this, function (M, P, Sorteio) {
  'use strict';

  /* ---------------------------------------------------------------- informação visível */
  function visivel(S, j) {
    var m = S.m, v = M.vazio(), i;
    function soma(id) { var k = M.kindDe(id); if (k < 34) v[k]++; }
    m.hands[j].forEach(soma);
    for (i = 0; i < 4; i++) {
      m.melds[i].forEach(function (x) { x.ids.forEach(function (id) { if (i !== j || true) soma(id); }); });
      m.rios[i].forEach(function (x) { if (!x.tomada) soma(x.id); });
    }
    for (i = 0; i < m.nDora; i++) soma(m.muro[P.IND_DORA + 2 * i]);
    return v;
  }
  function rng(S, j, extra) {
    return Sorteio.criar(S.semente + ':' + S.numMao + ':' + S.m.log.length + ':' + j + ':' + (extra || ''));
  }
  function temAbertos(m, j) { return m.melds[j].some(function (x) { return x.aberto; }); }
  function opShanten(m, j) { var s = m.melds[j].length === 0; return { setePares: s, orfaos: s }; }

  /* ---------------------------------------------------------------- perigo */
  /* tipos que j viu serem descartados por r (todo o rio de r, mais o que saiu depois do riichi dele) */
  function seguras(S, r) {
    var m = S.m, seg = {}, i;
    m.rios[r].forEach(function (x) { seg[M.kindDe(x.id)] = 1; });
    /* peças jogadas por outros depois do riichi de r também não dão ron (se r estava em tenpai e passou) */
    return seg;
  }
  var BASE_PERIGO = [0.06, 0.07, 0.085, 0.10, 0.11, 0.10, 0.085, 0.07, 0.06];   /* por número 1..9, sem informação */
  function perigoContra(S, j, k, r, vis) {
    var m = S.m, seg = seguras(S, r);
    if (seg[k]) return 0.001;
    var n = M.num(k), nai = M.naipe(k);
    if (k >= 27) {
      var restam = 4 - vis[k];
      if (restam <= 0) return 0.002;
      var yaku = (k >= 31) || k === 27 + S.vento || k === 27 + ((r - S.dealer + 4) & 3);
      var base = yaku ? 0.07 : 0.04;
      return base * (restam / 4) + 0.003;
    }
    var base0 = BASE_PERIGO[n - 1];
    var suji = false, off = nai * 9;
    if (n >= 4 && seg[k - 3]) suji = true;
    if (n <= 6 && seg[k + 3]) suji = true;
    /* suji só vale por inteiro nas pontas internas (1, 9 se 4/6; 2..8 exigem os dois lados em 4-5-6) */
    if (n >= 4 && n <= 6) { suji = !!(seg[k - 3] && seg[k + 3]); if (!suji && (seg[k - 3] || seg[k + 3])) base0 *= 0.55; else if (suji) base0 *= 0.25; }
    else if (suji) base0 *= 0.3;
    /* kabe: quatro peças vizinhas visíveis tornam impossível a espera */
    if (n <= 8 && vis[k + 1] >= 4) base0 *= 0.7;
    if (n >= 2 && vis[k - 1] >= 4) base0 *= 0.7;
    if (vis[k] >= 3) base0 *= 0.7;
    return base0;
  }
  function riichiAdversarios(S, j) {
    var m = S.m, r = [];
    for (var i = 0; i < 4; i++) if (i !== j && m.riichi[i]) r.push(i);
    return r;
  }
  /* quem parece ameaçar: riichi, ou muitas chamadas com dora */
  function ameacas(S, j) {
    var m = S.m, r = riichiAdversarios(S, j);
    for (var i = 0; i < 4; i++) {
      if (i === j || m.riichi[i]) continue;
      var n = m.melds[i].length;
      if (n >= 3) r.push(i);
    }
    return r;
  }
  function perigoTotal(S, j, k, vis, ameacasList) {
    var p = 0;
    ameacasList.forEach(function (r) { var q = perigoContra(S, j, k, r, vis); p = p + q - p * q; });
    return p;
  }

  /* ---------------------------------------------------------------- avaliação dos descartes */
  function ukeireDe(c13, s, vis, op, abertos) {
    var total = 0, tipos = [], k;
    for (k = 0; k < 34; k++) {
      var rest = 4 - vis[k]; if (rest <= 0) continue;
      c13[k]++;
      var s2 = M.shanten(c13, abertos, op);
      c13[k]--;
      if (s2 < s) { total += rest; tipos.push(k); }
    }
    return { total: total, tipos: tipos };
  }

  function avaliar(S, j) {
    var m = S.m, mao = m.hands[j], vis = visivel(S, j), op = opShanten(m, j), ab = m.melds[j].length;
    var c = M.contIds(mao), vistos = {}, res = [], amea = ameacas(S, j);
    mao.forEach(function (id) {
      var k = M.kindDe(id), chave = k + (M.ehAka(id) ? 'a' : '');
      if (vistos[chave] !== undefined) { res.push(Object.assign({}, vistos[chave], { id: id })); return; }
      c[k]--;
      var s = M.shanten(c, ab, op);
      var u = ukeireDe(c, s, vis, op, ab);
      c[k]++;
      var item = { id: id, kind: k, shanten: s, ukeire: u.total, tipos: u.tipos, perigo: perigoTotal(S, j, k, vis, amea), aka: M.ehAka(id) };
      vistos[chave] = item;
      res.push(item);
    });
    return res;
  }

  /* quão valiosa é a mão (para decidir entre atacar e se defender): dora, yaku prováveis */
  function valorEstimado(S, j) {
    var m = S.m, dor = P.indicadores(S, P.IND_DORA), n = 0;
    function conta(id) { var k = M.kindDe(id); if (k < 34 && dor.indexOf(k) >= 0) n++; if (S.cfg.aka && M.ehAka(id)) n++; }
    m.hands[j].forEach(conta);
    m.melds[j].forEach(function (x) { x.ids.forEach(conta); });
    var c = M.contIds(m.hands[j]), han = n;
    if (m.riichi[j]) han += 1;
    [31, 32, 33, 27 + S.vento, 27 + ((j - S.dealer + 4) & 3)].forEach(function (k) { if (c[k] >= 3) han += 1; });
    m.melds[j].forEach(function (x) { if (x.t !== 'chi' && (x.k >= 31 || x.k === 27 + S.vento || x.k === 27 + ((j - S.dealer + 4) & 3))) han += 1; });
    return han;
  }
  function temYakuPossivel(S, j) {
    var m = S.m, ids = m.hands[j].slice();
    m.melds[j].forEach(function (x) { ids = ids.concat(x.ids); });
    var ks = ids.map(M.kindDe);
    if (!temAbertos(m, j)) return true;
    var c = M.contIds(m.hands[j]);
    if ([31, 32, 33, 27 + S.vento, 27 + ((j - S.dealer + 4) & 3)].some(function (k) { return m.melds[j].some(function (x) { return x.t !== 'chi' && x.k === k; }) || c[k] >= 2; })) return true;
    if (ks.every(function (k) { return k < 27 && !M.ehPonta(k); })) return true;                 /* tanyao */
    var nai = {}, hon = false; ks.forEach(function (k) { if (k < 27) nai[M.naipe(k)] = 1; else hon = true; });
    if (Object.keys(nai).length <= 1) return true;                                                   /* honitsu/chinitsu */
    if (m.melds[j].every(function (x) { return x.t !== 'chi'; }) && m.melds[j].length >= 2) return true; /* toitoi */
    return false;
  }

  /* ---------------------------------------------------------------- decisão no próprio turno */
  function escolherDescarte(S, j, o, nivel) {
    var m = S.m, g = rng(S, j, 'd');
    var cand = o.descartes;
    if (nivel <= 1) {
      /* nível 1: 65% escolhe ao acaso, 35% joga pela menor distância */
      if (g.real() < 0.65) return cand[g.inteiro(cand.length)];
    }
    var av = avaliar(S, j).filter(function (x) { return cand.indexOf(x.id) >= 0; });
    if (!av.length) return cand[0];
    var amea = ameacas(S, j);
    var melhorS = Math.min.apply(null, av.map(function (x) { return x.shanten; }));
    function porEficiencia() {
      var pool = av.filter(function (x) { return x.shanten === melhorS; });
      if (nivel === 2) return pool[g.inteiro(pool.length)].id;
      /* ordena por peças que melhoram; empate: joga a que menos serve (honra/ponta antes, sem dora/aka) */
      var dor = P.indicadores(S, P.IND_DORA);
      pool.sort(function (a, b) {
        if (b.ukeire !== a.ukeire) return b.ukeire - a.ukeire;
        return valorPeca(a, dor, S, j) - valorPeca(b, dor, S, j);
      });
      return pool[0].id;
    }
    if (nivel >= 3 && amea.length) {
      var han = valorEstimado(S, j);
      var distante = melhorS >= (nivel === 3 ? 2 : nivel === 4 ? 2 : 3);
      var empurrar = melhorS <= 0 || (melhorS === 1 && han >= (nivel === 5 ? 2 : 3)) || m.riichi[j];
      if (nivel === 5) {
        /* posição: último colocado e na última mão tende a arriscar */
        var rk = P.ranking(S), ultimo = rk[3] === j, oorasu = S.vento >= (S.cfg.fim === 'tonpuusen' ? 0 : 1) && (S.rod & 3) === 3;
        if (ultimo && oorasu && melhorS <= 1) empurrar = true;
        if (melhorS === 1 && han >= 1 && S.pontos[j] < 20000) empurrar = true;
      }
      if (!m.riichi[j] && !empurrar && (distante || melhorS >= 1)) {
        /* defesa: menor perigo; empate pela eficiência */
        var seg = av.slice().sort(function (a, b) {
          if (Math.abs(a.perigo - b.perigo) > 0.004) return a.perigo - b.perigo;
          if (a.shanten !== b.shanten) return a.shanten - b.shanten;
          return b.ukeire - a.ukeire;
        });
        /* nível 3 só enxerga o que já foi descartado */
        if (nivel === 3) {
          var s3 = av.filter(function (x) { return x.perigo <= 0.0011; });
          if (s3.length) { s3.sort(function (a, b) { return a.shanten - b.shanten || b.ukeire - a.ukeire; }); return s3[0].id; }
          return porEficiencia();
        }
        return seg[0].id;
      }
      /* atacando mesmo assim: evita a peça mais perigosa quando existe equivalente */
      if (nivel >= 4) {
        var pool = av.filter(function (x) { return x.shanten === melhorS; });
        pool.sort(function (a, b) { var da = a.perigo * (nivel === 5 ? 1.0 : 0.6), db = b.perigo * (nivel === 5 ? 1.0 : 0.6); return (b.ukeire * (1 - db * 4)) - (a.ukeire * (1 - da * 4)); });
        return pool[0].id;
      }
    }
    return porEficiencia();
  }
  function valorPeca(x, dor, S, j) {
    var k = x.kind, v = 0;
    if (x.aka) v += 5;
    if (dor.indexOf(k) >= 0) v += 4;
    if (k < 27) { var n = M.num(k); v += (n >= 3 && n <= 7) ? 2 : (n === 2 || n === 8) ? 1 : 0; }
    else {
      var yaku = k >= 31 || k === 27 + S.vento || k === 27 + ((j - S.dealer + 4) & 3);
      v += yaku ? 1.5 : 0;
    }
    return v;
  }

  function decidirRiichi(S, j, o, idDescarte, nivel) {
    var g = rng(S, j, 'r');
    if (o.riichi.indexOf(idDescarte) < 0) {
      /* a peça escolhida não mantém tenpai: nenhum riichi. Se existe outra peça equivalente, deixa */
      return false;
    }
    if (nivel <= 1) return g.real() < 0.6;
    if (nivel === 2) return true;
    var m = S.m, mao = m.hands[j].filter(function (x) { return x !== idDescarte; });
    var esp = P.esperasDe(S, j, mao), vis = visivel(S, j), vivas = 0;
    esp.forEach(function (k) { vivas += Math.max(0, 4 - vis[k]); });
    if (nivel === 3) return vivas >= 1;
    /* 4 e 5: não declara espera quase morta nem quando já tem valor alto e espera boa (dama) */
    if (vivas <= 1 && S.pontos[j] < 40000) return false;
    var han = valorEstimado(S, j);
    var riicomp = riichiAdversarios(S, j);
    if (nivel === 5 && han >= 3 && vivas >= 4 && !riicomp.length && temYakuPossivel(S, j)) return false;       /* dama */
    if (nivel >= 4 && riicomp.length && vivas <= 2 && han < 2) return false;
    return true;
  }

  function decidirDescarte(S, j, o, nivel) {
    var m = S.m, g = rng(S, j, 'x');
    if (o.tsumo) return { k: 'tsumo' };
    if (o.kyuushu) {
      var n = 0, c = M.contIds(m.hands[j]); M.ORFAOS.forEach(function (kk) { if (c[kk] > 0) n++; });
      if (nivel >= 3 ? n >= 10 : g.real() < 0.3) return { k: 'kyuushu' };
    }
    var amea = ameacas(S, j);
    /* kan fechado: seguro quando ninguém ameaça; nível 1 ao acaso */
    if (o.ankan.length) {
      var quero = nivel <= 1 ? g.real() < 0.4 : (!amea.length || m.riichi[j]) && nivel >= 2;
      if (quero) return { k: 'ankan', kind: o.ankan[0] };
    }
    if (o.kakan.length && !amea.length && nivel >= 2 && g.real() < 0.8) return { k: 'kakan', id: o.kakan[0] };
    var id = escolherDescarte(S, j, o, nivel);
    if (o.riichi.length) {
      var alvo = id;
      if (o.riichi.indexOf(id) < 0) {
        /* a peça escolhida não deixa tenpai; usa uma que deixa se também for boa (mesmo shanten) */
        var alt = o.riichi.filter(function (x) { return true; });
        if (alt.length && nivel >= 2) alvo = alt[0];
      }
      if (decidirRiichi(S, j, o, alvo, nivel)) return { k: 'descartar', id: alvo, riichi: true };
    }
    return { k: 'descartar', id: id };
  }

  /* ---------------------------------------------------------------- reações */
  function simulaChamada(S, j, tipo, ids, pecaKind) {
    /* shanten da mão depois de chamar (e descartar a melhor peça) comparado ao de antes */
    var m = S.m, op = { setePares: false, orfaos: false }, c = M.contIds(m.hands[j]);
    ids.forEach(function (id) { c[M.kindDe(id)]--; });
    var ab = m.melds[j].length + 1;
    var melhor = 99;
    for (var k = 0; k < 34; k++) {
      if (!c[k]) continue;
      c[k]--; var s = M.shanten(c, ab, op); c[k]++;
      if (s < melhor) melhor = s;
    }
    return melhor;
  }
  function reagir(S, j, o, nivel) {
    var m = S.m, p = m.pend, g = rng(S, j, 'c');
    if (o.ron) return { k: 'ron' };
    var kd = M.kindDe(p.peca), c = M.contIds(m.hands[j]);
    var op = opShanten(m, j), ab = m.melds[j].length;
    var antes = M.shanten(c, ab, op);
    var amea = ameacas(S, j);
    var yakuhai = kd >= 31 || kd === 27 + S.vento || kd === 27 + ((j - S.dealer + 4) & 3);
    if (nivel <= 1) {
      if (o.pon.length && g.real() < 0.2) return { k: 'pon', ids: o.pon[0] };
      if (o.chi.length && g.real() < 0.15) return { k: 'chi', ids: o.chi[0] };
      return { k: 'passar' };
    }
    if (m.riichi[j]) return { k: 'passar' };
    /* kan aberto: só com pon de yakuhai já feito, raro */
    var melhor = null, melhorS = antes;
    function considera(tipo, ids) {
      var s = simulaChamada(S, j, tipo, ids, kd);
      var ok = nivel === 2 ? (s < antes && (yakuhai || temAbertos(m, j))) : s < antes || (s === antes && yakuhai && tipo === 'pon');
      if (!ok) return;
      /* sem yaku possível depois da chamada, não chama (níveis 3+) */
      if (nivel >= 3) {
        var fake = JSON.parse(JSON.stringify(m.melds[j]));
        var ids2 = m.hands[j].filter(function (x) { return ids.indexOf(x) < 0; });
        var kinds = ids2.map(M.kindDe).concat(ids.map(M.kindDe), [kd]);
        m.melds[j].forEach(function (x) { x.ids.forEach(function (id) { kinds.push(M.kindDe(id)); }); });
        var yaku = yakuhai || temAbertos(m, j) && temYakuPossivel(S, j);
        if (!yaku) {
          var simples = kinds.every(function (k) { return k < 27 && !M.ehPonta(k); });
          var nai = {}; kinds.forEach(function (k) { if (k < 27) nai[M.naipe(k)] = 1; });
          var hon = kinds.some(function (k) { return k >= 27; });
          yaku = simples || Object.keys(nai).length <= 1 || (m.melds[j].some(function (x) { return x.t !== 'chi'; }) && tipo === 'pon');
        }
        if (!yaku) return;
        if (nivel >= 4 && amea.length && s > 0) return;       /* não abre a mão sob ameaça sem estar perto */
      }
      if (s < melhorS || (s === melhorS && !melhor)) { melhorS = s; melhor = { k: tipo, ids: ids }; }
    }
    o.pon.forEach(function (ids) { considera('pon', ids); });
    o.chi.forEach(function (ids) { considera('chi', ids); });
    if (melhor && nivel === 2 && g.real() > 0.5) melhor = null;
    if (!melhor && o.kan && nivel >= 4 && yakuhai && !amea.length && g.real() < 0.5) return { k: 'kan' };
    return melhor || { k: 'passar' };
  }

  function decidir(S, j, tipo, opcoes, nivel) {
    nivel = nivel || (S.cfg.niveis && S.cfg.niveis[j]) || 3;
    return tipo === 'descarte' ? decidirDescarte(S, j, opcoes, nivel) : reagir(S, j, opcoes, nivel);
  }

  /* ---------------------------------------------------------------- dicas */
  function nomeK(k) { return M.nome(k); }
  function dica(S, j) {
    var m = S.m;
    if (!m.pend) return null;
    if (m.pend.tipo === 'descarte' && m.pend.j === j) {
      var o = P.opcoesDescarte(S, j);
      if (o.tsumo) return { acao: { k: 'tsumo' }, texto: 'Você completou a mão. Toque em Tsumo para vencer.' };
      var a = decidir(S, j, 'descarte', o, 5);
      var av = avaliar(S, j), x = av.filter(function (q) { return a.id !== undefined && q.id === a.id; })[0];
      var t;
      if (a.k === 'ankan') t = 'Kan fechado: a peça fica em sua mão e você ganha uma compra extra.';
      else if (a.k === 'kakan') t = 'Kan aberto: soma a quarta peça ao seu pon.';
      else if (a.k === 'kyuushu') t = 'Mão muito ruim: nove pontas ou mais permitem recomeçar a mão.';
      else {
        var amea = ameacas(S, j);
        t = 'Descarte ' + nomeK(x.kind) + '. ';
        if (x.shanten <= 0) t += 'Sua mão fica pronta (tenpai)' + (x.tipos.length ? ', esperando ' + x.tipos.slice(0, 5).map(nomeK).join(', ') + '.' : '.');
        else t += 'Fica a ' + x.shanten + ' troca' + (x.shanten > 1 ? 's' : '') + ' de ficar pronta, com ' + x.ukeire + ' peças que ajudam.';
        if (amea.length && x.perigo < 0.01) t += ' Também é uma peça segura contra o riichi.';
        if (a.riichi) t += ' Vale declarar riichi.';
      }
      return { acao: a, id: a.id, texto: t };
    }
    if (m.pend.tipo === 'reacao' && m.pend.esperando.indexOf(j) >= 0) {
      var or = P.opcoesReacao(S, j), ar = reagir(S, j, or, 5);
      var txt = { ron: 'Dá para vencer com essa peça. Toque em Ron.', pon: 'Vale chamar pon: aproxima sua mão e mantém yaku.', chi: 'Vale chamar chi: aproxima sua mão e mantém yaku.', kan: 'Vale o kan.', passar: 'Melhor passar: a chamada não ajuda ou tira o valor da mão.' };
      return { acao: ar, texto: txt[ar.k] };
    }
    return null;
  }

  return { decidir: decidir, avaliar: avaliar, dica: dica, visivel: visivel, perigoContra: perigoContra, valorEstimado: valorEstimado };
});
