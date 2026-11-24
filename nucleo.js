/* ==========================================================================
   nucleo.js - peças e contas de mão do Mahjong (sem DOM; serve a todas as variantes)

   Tipos ("kinds"): 0-8 Caracteres (man), 9-17 Pontos (pin), 18-26 Bambus (sou),
   27-30 Ventos (Leste, Sul, Oeste, Norte), 31-33 Dragões (Branco, Verde, Vermelho),
   34-37 Flores (Ameixa, Orquídea, Crisântemo, Bambu), 38-41 Estações (Primavera, Verão, Outono, Inverno).
   Peça física (id): tipo*4 + cópia; flores e estações: 136 a 143 (uma de cada, 8 peças).
   O "aka" (5 vermelho) é a cópia 0 dos três 5.
   ========================================================================== */
(function (raiz, fabrica) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.Mj = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SIGLA = ['m', 'p', 's'];
  var NOMES_NAIPE = ['Caracteres', 'Pontos', 'Bambus'];
  var NOMES_HONRA = ['Leste', 'Sul', 'Oeste', 'Norte', 'Dragão Branco', 'Dragão Verde', 'Dragão Vermelho'];
  var NOMES_FLOR = ['Ameixa', 'Orquídea', 'Crisântemo', 'Bambu', 'Primavera', 'Verão', 'Outono', 'Inverno'];
  var VENTOS = ['Leste', 'Sul', 'Oeste', 'Norte'];

  function kindDe(id) { return id >= 136 ? 34 + (id - 136) : id >> 2; }
  function ehAka(id) { return id < 136 && (id & 3) === 0 && (id >> 2 === 4 || id >> 2 === 13 || id >> 2 === 22); }
  function naipe(k) { return k < 9 ? 0 : k < 18 ? 1 : k < 27 ? 2 : k < 34 ? 3 : 4; }
  function num(k) { return k < 27 ? (k % 9) + 1 : 0; }
  function ehHonra(k) { return k >= 27 && k < 34; }
  function ehVento(k) { return k >= 27 && k < 31; }
  function ehDragao(k) { return k >= 31 && k < 34; }
  function ehFlor(k) { return k >= 34; }
  function ehTerminal(k) { return k < 27 && (k % 9 === 0 || k % 9 === 8); }
  function ehPonta(k) { return ehHonra(k) || ehTerminal(k); }
  function ehVerde(k) { return k === 19 || k === 20 || k === 21 || k === 23 || k === 25 || k === 32; }

  /* id do símbolo no sprite pecas.svg */
  function simboloKind(k, aka) {
    if (k < 27) return 't-' + SIGLA[naipe(k)] + (aka ? 0 : num(k));
    if (k < 34) return 't-z' + (k - 26);
    return 't-f' + (k - 33);
  }
  function simbolo(id, usarAka) { return simboloKind(kindDe(id), usarAka && ehAka(id)); }
  function nome(k) {
    if (k < 27) return num(k) + ' de ' + NOMES_NAIPE[naipe(k)];
    if (k < 34) return NOMES_HONRA[k - 27];
    return NOMES_FLOR[k - 34];
  }
  function curto(k) { return k >= 34 ? NOMES_FLOR[k - 34] : k >= 27 ? NOMES_HONRA[k - 27] : num(k) + SIGLA[naipe(k)]; }

  function vazio() { var c = []; for (var i = 0; i < 34; i++) c.push(0); return c; }
  function cont(kinds) { var c = vazio(); for (var i = 0; i < kinds.length; i++) if (kinds[i] < 34) c[kinds[i]]++; return c; }
  function contIds(ids) { var c = vazio(); for (var i = 0; i < ids.length; i++) { var k = kindDe(ids[i]); if (k < 34) c[k]++; } return c; }
  function soma(c) { var s = 0; for (var i = 0; i < 34; i++) s += c[i]; return s; }
  function copia(c) { return c.slice(); }

  /* indicador de dora -> tipo que vira dora */
  function proximoDora(k) {
    if (k < 27) return (k % 9 === 8) ? k - 8 : k + 1;
    if (k < 31) return k === 30 ? 27 : k + 1;
    return k === 33 ? 31 : k + 1;
  }

  /* ---------- decomposição em grupos ---------- */
  /* grupos: {t:'s'|'t', k}  's' = sequência começando em k, 't' = trinca de k */
  function gruposDe(c, ini, atual, saida, limiteSeq) {
    var i = ini;
    while (i < 34 && c[i] === 0) i++;
    if (i >= 34) { saida.push(atual.slice()); return; }
    if (c[i] >= 3) {
      c[i] -= 3; atual.push({ t: 't', k: i });
      gruposDe(c, i, atual, saida, limiteSeq);
      atual.pop(); c[i] += 3;
    }
    if (!limiteSeq && i < 27 && i % 9 <= 6 && c[i + 1] > 0 && c[i + 2] > 0) {
      c[i]--; c[i + 1]--; c[i + 2]--; atual.push({ t: 's', k: i });
      gruposDe(c, i, atual, saida, limiteSeq);
      atual.pop(); c[i]++; c[i + 1]++; c[i + 2]++;
    }
  }

  /* todas as formas "n grupos + par" de uma mão concentrada (contagem c). Cada forma: {par:k, grupos:[...]} */
  function decompor(c) {
    var formas = [], vistos = {};
    for (var p = 0; p < 34; p++) {
      if (c[p] < 2) continue;
      c[p] -= 2;
      var saida = [];
      gruposDe(c, 0, [], saida, false);
      c[p] += 2;
      for (var s = 0; s < saida.length; s++) {
        var g = saida[s].slice().sort(function (a, b) { return a.k - b.k || (a.t < b.t ? -1 : 1); });
        var chave = p + ':' + g.map(function (x) { return x.t + x.k; }).join(',');
        if (vistos[chave]) continue; vistos[chave] = 1;
        formas.push({ par: p, grupos: g });
      }
    }
    return formas;
  }

  function seteParesOk(c) {
    var n = 0;
    for (var i = 0; i < 34; i++) { if (c[i] === 2) n++; else if (c[i] !== 0) return false; }
    return n === 7;
  }
  var ORFAOS = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];
  function treze_orfaosOk(c) {
    var par = false;
    for (var i = 0; i < 34; i++) {
      var o = ORFAOS.indexOf(i) >= 0;
      if (!o && c[i] > 0) return false;
      if (o) { if (c[i] === 0) return false; if (c[i] === 2) par = true; else if (c[i] !== 1) return false; }
    }
    return par;
  }

  /* a mão (c, 3n+2 peças somando meld abertos fora) é "completa"? opcoes.setePares, opcoes.orfaos (só mão fechada) */
  function completa(c, op) {
    op = op || {};
    var tot = soma(c);
    if (tot % 3 !== 2) return false;
    if (op.setePares && tot === 14 && seteParesOk(c)) return true;
    if (op.orfaos && tot === 14 && treze_orfaosOk(c)) return true;
    return padraoOk(c);
  }
  function padraoOk(c) {
    for (var p = 0; p < 34; p++) {
      if (c[p] < 2) continue;
      c[p] -= 2;
      var ok = soltasOk(c, 0);
      c[p] += 2;
      if (ok) return true;
    }
    return false;
  }
  function soltasOk(c, i) {
    while (i < 34 && c[i] === 0) i++;
    if (i >= 34) return true;
    if (c[i] >= 3) { c[i] -= 3; var a = soltasOk(c, i); c[i] += 3; if (a) return true; }
    if (i < 27 && i % 9 <= 6 && c[i + 1] > 0 && c[i + 2] > 0) {
      c[i]--; c[i + 1]--; c[i + 2]--;
      var b = soltasOk(c, i);
      c[i]++; c[i + 1]++; c[i + 2]++;
      if (b) return true;
    }
    return false;
  }

  /* ---------- shanten ---------- */
  function shantenPadrao(c, abertos) {
    var melhor = 8;
    function rec(i, m, t, par) {
      while (i < 34 && c[i] === 0) i++;
      if (i >= 34) {
        var mm = m + abertos, tt = t;
        if (mm + tt > 4) tt = 4 - mm;
        var s = 8 - 2 * mm - tt - (par ? 1 : 0);
        if (s < melhor) melhor = s;
        return;
      }
      if (c[i] >= 3) { c[i] -= 3; rec(i, m + 1, t, par); c[i] += 3; }
      if (i < 27 && i % 9 <= 6 && c[i + 1] > 0 && c[i + 2] > 0) {
        c[i]--; c[i + 1]--; c[i + 2]--; rec(i, m + 1, t, par); c[i]++; c[i + 1]++; c[i + 2]++;
      }
      if (!par && c[i] >= 2) { c[i] -= 2; rec(i, m, t, true); c[i] += 2; }
      if (c[i] >= 2) { c[i] -= 2; rec(i, m, t + 1, par); c[i] += 2; }
      if (i < 27 && i % 9 <= 7 && c[i + 1] > 0) { c[i]--; c[i + 1]--; rec(i, m, t + 1, par); c[i]++; c[i + 1]++; }
      if (i < 27 && i % 9 <= 6 && c[i + 2] > 0) { c[i]--; c[i + 2]--; rec(i, m, t + 1, par); c[i]++; c[i + 2]++; }
      c[i]--; rec(i, m, t, par); c[i]++;
    }
    rec(0, 0, 0, false);
    return melhor;
  }
  function shantenSetePares(c) {
    var pares = 0, tipos = 0;
    for (var i = 0; i < 34; i++) { if (c[i] > 0) tipos++; if (c[i] >= 2) pares++; }
    return 6 - pares + Math.max(0, 7 - tipos);
  }
  function shantenOrfaos(c) {
    var tipos = 0, par = 0;
    for (var j = 0; j < ORFAOS.length; j++) { var n = c[ORFAOS[j]]; if (n > 0) tipos++; if (n >= 2) par = 1; }
    return 13 - tipos - par;
  }
  /* shanten da mão (qualquer quantidade 3n+1 ou 3n+2). op: {setePares, orfaos} só valem com mão fechada */
  function shanten(c, abertos, op) {
    op = op || {};
    var s = shantenPadrao(c.slice(), abertos || 0);
    if (!abertos && op.setePares) s = Math.min(s, shantenSetePares(c));
    if (!abertos && op.orfaos) s = Math.min(s, shantenOrfaos(c));
    return s;
  }

  /* tipos que completam uma mão de 3n+1 peças. vista: contagem de peças já visíveis (opcional) para ignorar o que não existe mais */
  function esperas(c, op, vista) {
    var r = [];
    for (var k = 0; k < 34; k++) {
      if (c[k] >= 4) continue;
      if (vista && c[k] + (vista[k] || 0) >= 4) continue;
      c[k]++;
      var ok = completa(c, op);
      c[k]--;
      if (ok) r.push(k);
    }
    return r;
  }

  /* opções de chi com a peça k (de quem joga à esquerda): pares de tipos que a mão tem */
  function opcoesChi(c, k) {
    var r = [];
    if (k >= 27) return r;
    var n = k % 9;
    if (n >= 2 && c[k - 2] > 0 && c[k - 1] > 0) r.push([k - 2, k - 1]);
    if (n >= 1 && n <= 7 && c[k - 1] > 0 && c[k + 1] > 0) r.push([k - 1, k + 1]);
    if (n <= 6 && c[k + 1] > 0 && c[k + 2] > 0) r.push([k + 1, k + 2]);
    return r;
  }

  return {
    NOMES_HONRA: NOMES_HONRA, NOMES_FLOR: NOMES_FLOR, VENTOS: VENTOS, ORFAOS: ORFAOS,
    kindDe: kindDe, ehAka: ehAka, naipe: naipe, num: num, ehHonra: ehHonra, ehVento: ehVento, ehDragao: ehDragao, ehFlor: ehFlor,
    ehTerminal: ehTerminal, ehPonta: ehPonta, ehVerde: ehVerde,
    simbolo: simbolo, simboloKind: simboloKind, nome: nome, curto: curto,
    vazio: vazio, cont: cont, contIds: contIds, soma: soma, copia: copia, proximoDora: proximoDora,
    decompor: decompor, completa: completa, seteParesOk: seteParesOk, orfaosOk: treze_orfaosOk, padraoOk: padraoOk,
    shanten: shanten, shantenPadrao: shantenPadrao, shantenSetePares: shantenSetePares, shantenOrfaos: shantenOrfaos,
    esperas: esperas, opcoesChi: opcoesChi
  };
});
