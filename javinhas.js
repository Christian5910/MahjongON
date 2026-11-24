/* ==========================================================================
   MahjongON! - javinhas.js (a tela e o jogo: mesa, mão, chamadas, riichi, robôs, resultado, salvamento)
   Regras: nucleo.js, riichi.js e partida.js. Robôs e dicas: bot.js. Sorte: sorteio.js. Textos: textos.js.
   Os cinco primeiros não mexem na tela e são testados no Node. Menu, sons, vibração e estatísticas do menu: on.js.

   Índice
   1. Dados, preferências e salvamento
   2. Peças e textos (desenho das peças, nomes, tabelas)
   3. Tamanho da mesa e desenho (rios, centro, mão, cartões)
   4. Painel de ação (descartar, riichi, kan, chamadas) e dica
   5. Andamento da partida (vez, robôs, fim da mão e da partida)
   6. Telas, nova partida e Como Jogar
   7. Início
   ========================================================================== */
(function () {
  'use strict';

  const M = window.Mj, R = window.Riichi, P = window.Partida, BT = window.Bot, SO = window.Sorteio, TX = window.MTXT || {};
  const $ = (s) => document.querySelector(s);

  /* ==========================================================================
     1. Dados, preferências e salvamento
     ========================================================================== */
  const LS = { prefs: 'mahjongon.prefs', jogo: 'mahjongon.jogo', stats: 'mahjongon.stats', visto: 'mahjongon.visto' };
  const sget = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const sset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem espaço ou bloqueado */ } };
  const sdel = (k) => { try { localStorage.removeItem(k); } catch (e) { /* ignora */ } };

  const VEL = { rapido: 160, normal: 650, lento: 1300 };
  const NOMES_ROBOS = ['Bia', 'Caio', 'Duda', 'Enzo', 'Fabi', 'Gabi', 'Hugo', 'Iris'];
  const NIVEIS = ['', 'Iniciante', 'Casual', 'Intermediário', 'Avançado', 'Expert'];
  const NIVEL_DESC = {
    0: 'Cada robô joga num nível diferente, de 2 a 5.',
    1: 'Joga quase ao acaso e quase nunca se defende.',
    2: 'Monta mãos simples e faz chamadas sem muito critério.',
    3: 'Escolhe bem os descartes, declara riichi e se defende um pouco.',
    4: 'Conta peças, lê o riichi dos outros e escolhe bem quando chamar.',
    5: 'O mais forte: defende com método e só ataca quando vale a pena.'
  };
  const VENTO_JP = ['東', '南', '西', '北'];
  const VENTO_PT = ['Leste', 'Sul', 'Oeste', 'Norte'];

  const prefs = Object.assign({ fim: 'hanchan', aka: true, nivel: 3, vel: 'normal', esperas: 'sim', auto: 'sim' }, sget(LS.prefs, {}));
  if (prefs.fim !== 'tonpuusen') prefs.fim = 'hanchan';
  prefs.aka = prefs.aka !== false;
  if (!(prefs.nivel >= 0 && prefs.nivel <= 5)) prefs.nivel = 3;
  if (!VEL[prefs.vel]) prefs.vel = 'normal';
  prefs.esperas = prefs.esperas === 'nao' ? 'nao' : 'sim';
  prefs.auto = prefs.auto === 'nao' ? 'nao' : 'sim';
  const gravarPrefs = () => sset(LS.prefs, prefs);

  let S = null;            // estado do jogo (Partida)
  let U = null;            // estado da tela
  const novoU = () => ({
    nomes: ['Você', 'Bia', 'Caio', 'Duda'], diario: [], logPos: 0, assistido: false, sel: null, riichi: false,
    dica: null, t: 0, contouMao: -1, contouFim: false, tela: null, duas: false, pausa: false
  });

  const el = {
    area: $('#game-area'), mesa: $('#mesa-box'), caixa: $('#mesa'), centro: $('#centro'), mao: $('#mao-fila'), melds: $('#mao-melds'),
    tela: $('#tela'), telaTitulo: $('#tela-titulo'), telaCorpo: $('#tela-corpo'), telaBtn: $('#tela-btn'), telaBtn2: $('#tela-btn2'),
    dica: $('#dica'), acao: $('#painel-acao'), msg: $('#message-area'), chips: $('#chips-jog'), diario: $('#diario'),
    restart: $('#restart-btn'), dicaBtn: $('#dica-btn')
  };

  function gravar() {
    if (!S || !U) return;
    if (S.fim && U.contouFim) { sdel(LS.jogo); return; }
    sset(LS.jogo, { S, U: { nomes: U.nomes, diario: U.diario.slice(-10), logPos: U.logPos, assistido: U.assistido, contouMao: U.contouMao, contouFim: U.contouFim } });
  }
  function validar(s) {
    try {
      if (!s || s.v !== 1 || !Array.isArray(s.pontos) || s.pontos.length !== 4 || !s.m || !Array.isArray(s.m.muro) || s.m.muro.length !== 136) return false;
      if (!Array.isArray(s.m.hands) || s.m.hands.length !== 4 || !s.cfg || !Array.isArray(s.cfg.humanos)) return false;
      return s.pontos.every((x) => Number.isFinite(x));
    } catch (e) { return false; }
  }
  function lerSalvo() {
    const L = sget(LS.jogo, null);
    if (!L || typeof L !== 'object' || !validar(L.S)) return null;
    const u = L.U && typeof L.U === 'object' ? L.U : {};
    const U2 = novoU();
    if (Array.isArray(u.nomes) && u.nomes.length === 4) U2.nomes = u.nomes.map((x) => String(x).slice(0, 12));
    U2.diario = Array.isArray(u.diario) ? u.diario.filter((x) => typeof x === 'string').slice(-10).map((x) => x.slice(0, 140)) : [];
    U2.logPos = Number.isInteger(u.logPos) && u.logPos >= 0 ? u.logPos : 0;
    U2.assistido = !!u.assistido;
    U2.contouMao = Number.isInteger(u.contouMao) ? u.contouMao : -1;
    U2.contouFim = !!u.contouFim;
    return { S: L.S, U: U2 };
  }

  /* --- estatísticas (só partidas sem a Dica) --- */
  const novasStats = () => ({ jogos: 0, pos: [0, 0, 0, 0], maos: 0, venc: 0, tsumo: 0, ron: 0, riichi: 0, yakuman: 0, maior: 0, maiorNome: '' });
  const lerStats = () => {
    const s = Object.assign(novasStats(), sget(LS.stats, {}));
    if (!Array.isArray(s.pos) || s.pos.length !== 4) s.pos = [0, 0, 0, 0];
    return s;
  };
  const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  function estatisticas() {
    const s = lerStats();
    const L = [
      { rotulo: 'Partidas completas', valor: s.jogos },
      { rotulo: 'Primeiros lugares', valor: s.pos[0] },
      { rotulo: 'Segundos lugares', valor: s.pos[1] },
      { rotulo: 'Terceiros lugares', valor: s.pos[2] },
      { rotulo: 'Quartos lugares', valor: s.pos[3] },
      { rotulo: 'Mãos jogadas', valor: s.maos },
      { rotulo: 'Mãos vencidas', valor: s.venc },
      { rotulo: 'Vitórias por tsumo', valor: s.tsumo },
      { rotulo: 'Vitórias por ron', valor: s.ron },
      { rotulo: 'Riichis declarados', valor: s.riichi },
      { rotulo: 'Yakuman', valor: s.yakuman }
    ];
    if (s.maior > 0) L.push({ rotulo: 'Maior mão', valor: s.maiorNome + ' (' + fmt(s.maior) + ')' });
    if (s.jogos > 0) L.push({ rotulo: 'Colocação média', valor: ((s.pos[0] + 2 * s.pos[1] + 3 * s.pos[2] + 4 * s.pos[3]) / s.jogos).toFixed(2).replace('.', ',') });
    return L;
  }
  const mudarStats = (fn) => { if (U && U.assistido) return; const s = lerStats(); fn(s); sset(LS.stats, s); };

  /* ==========================================================================
     2. Peças e textos
     ========================================================================== */
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const akaOn = () => !S || S.cfg.aka;
  const nomeId = (id) => M.nome(M.kindDe(id)) + (akaOn() && M.ehAka(id) ? ' vermelho' : '');
  const nomeK = (k) => M.nome(k);
  const sym = (id) => M.simbolo(id, akaOn());
  const SVG = (s) => '<svg viewBox="0 0 300 400" aria-hidden="true" focusable="false"><use href="pecas.svg#' + s + '"/></svg>';
  /* uma peça: tag span (ou button), classes extras, estilo opcional */
  function pc(id, cls, tag, extra) {
    tag = tag || 'span';
    const t = tag === 'button' ? ' type="button"' : '';
    return '<' + tag + t + ' class="pc ' + (cls || '') + '" data-id="' + id + '" aria-label="' + esc(nomeId(id)) + '"' + (extra || '') + '>' + SVG(sym(id)) + '</' + tag + '>';
  }
  const pcVerso = (cls) => '<span class="pc verso ' + (cls || '') + '" aria-hidden="true"></span>';
  const pcK = (k, cls) => '<span class="pc ' + (cls || '') + '" aria-label="' + esc(nomeK(k)) + '">' + SVG(M.simboloKind(k, false)) + '</span>';
  const kindsFila = (ids, cls) => ids.map((id) => pc(id, cls)).join('');

  /* notação "234m 55p 1z" -> fileira de peças. Ids falsos só para o desenho (cópia 1, nunca vermelha; 0 = vermelho) */
  function tiraHtml(txt) {
    const grupos = txt.trim().split(/\s+/).map((g) => {
      const r = []; let nums = '';
      for (const ch of g) {
        if (/\d/.test(ch)) { nums += ch; continue; }
        const nai = 'mpsz'.indexOf(ch);
        for (const d of nums) {
          let k; let aka = false;
          if (nai === 3) k = 26 + (+d);
          else { const n = +d === 0 ? 5 : +d; aka = +d === 0; k = nai * 9 + n - 1; }
          r.push('<span class="pc" aria-label="' + esc(nomeK(k)) + (aka ? ' vermelho' : '') + '">' + SVG(M.simboloKind(k, aka)) + '</span>');
        }
        nums = '';
      }
      return '<span class="grupo">' + r.join('') + '</span>';
    });
    return '<span class="tira">' + grupos.join('') + '</span>';
  }
  const comTiras = (html) => String(html || '').replace(/\[\[([^\]]+)\]\]/g, (_, t) => tiraHtml(t));

  function htmlYaku() {
    return (TX.YAKU || []).map((g) => {
      const lis = g.itens.map((y) => {
        const han = (v) => (v === '-' ? '' : v === 'Y' ? 'Yakuman' : v === 'YY' ? 'Yakuman duplo' : v + ' han');
        let h;
        if (y[0] === 'Y' || y[0] === 'YY') h = han(y[0]) + (y[1] === '-' ? ' (fechada)' : '');
        else if (y[1] === '-') h = y[0] + ' han (só fechada)';
        else if (y[1] === y[0]) h = y[0] + ' han (aberta igual)';
        else h = y[0] + ' han (aberta: ' + y[1] + ')';
        return '<li><div class="yk-cab"><b>' + y[2] + '</b><span class="jp" lang="ja">' + y[3] + '</span><span class="yk-han">' + h + '</span></div><p>' + y[4] + '</p>' + (y[5] ? '<div class="yk-ex">' + comTiras(y[5]) + '</div>' : '') + '</li>';
      }).join('');
      return '<h4>' + g.titulo + '</h4><ul class="yk-tab">' + lis + '</ul>';
    }).join('');
  }
  function htmlPontos() {
    const linhas = [[1, 30], [1, 40], [1, 50], [2, 30], [2, 40], [2, 50], [3, 30], [3, 40], [4, 30]];
    const lim = [['Mangan', 5, 0], ['Haneman', 6, 0], ['Baiman', 8, 0], ['Sanbaiman', 11, 0]];
    const calc = (b) => {
      const nr = R.pagamentos(b, false, false).ron, nt = R.pagamentos(b, false, true);
      const dr = R.pagamentos(b, true, false).ron, dt = R.pagamentos(b, true, true);
      return [fmt(nr), fmt(nt.outros) + ' / ' + fmt(nt.dealer), fmt(dr), fmt(dt.cada) + ' cada'];
    };
    let h = '<div class="tabela-rolar"><table class="tab-pts"><thead><tr><th rowspan="2">Mão</th><th colspan="2">Não dealer</th><th colspan="2">Dealer</th></tr><tr><th>Ron</th><th>Tsumo</th><th>Ron</th><th>Tsumo</th></tr></thead><tbody>';
    linhas.forEach(([han, fu]) => {
      const b = R.baseDe(han, fu).base;
      h += '<tr><td>' + han + ' han ' + fu + ' fu</td>' + calc(b).map((x) => '<td>' + x + '</td>').join('') + '</tr>';
    });
    lim.forEach(([n, han]) => { h += '<tr><td>' + n + '</td>' + calc(R.baseDe(han, 30).base).map((x) => '<td>' + x + '</td>').join('') + '</tr>'; });
    h += '<tr><td>Yakuman</td>' + calc(8000).map((x) => '<td>' + x + '</td>').join('') + '</tr>';
    return h + '</tbody></table></div><p class="tabela-nota aviso-modal">No tsumo de quem não é dealer, aparece primeiro o que cada um dos outros paga e depois o que o dealer paga.</p>';
  }

  /* ==========================================================================
     3. Tamanho da mesa e desenho
     ========================================================================== */
  let G = { rw: 20, hw: 30 };
  const ehLado = () => window.matchMedia('(orientation: landscape) and (min-width: 540px)').matches;
  const meuAssento = () => (S ? (S.cfg.humanos[0] || 0) : 0);
  const assentoDe = (pos) => (meuAssento() + pos) & 3;
  const nomeDe = (j) => U.nomes[j] || ('Jogador ' + (j + 1));

  function ajustar() {
    if (!S) return;
    const lado = ehLado();
    const areaW = el.area.clientWidth;
    const hh = (document.querySelector('header') || {}).offsetHeight || 60;
    const vh = window.innerHeight || 700;
    const gap = parseFloat(getComputedStyle(el.area).columnGap) || 10;
    const colW = lado ? Math.max(220, areaW - $('#modo-btn').offsetWidth - gap) : areaW;
    const mw = Math.floor(Math.min(colW, 720));
    const interno = mw - 22;
    let rw = Math.max(13, Math.min(Math.floor(interno / 12.6), 46));
    /* mão: uma fileira se couber com peças grandes, senão duas de sete */
    const base = mw - 18;
    const umaFila = base / 14.8 >= 25;
    const hw = umaFila ? Math.min(Math.floor(base / 14.8), 50) : Math.min(Math.floor((base - 18) / 7), 46);
    U.duas = !umaFila;
    if (lado) {
      const maxH = vh - hh - 22;
      const handH = (umaFila ? hw * 1.45 : hw * 2.9 + 8) + 34 + 6;
      while (rw > 13 && (rw * 16 + 24 + handH + 8) > maxH) rw--;
    }
    G = { rw, hw };
    el.mesa.style.setProperty('--mw', mw + 'px');
    el.mesa.style.setProperty('--rw', rw + 'px');
    el.mesa.style.setProperty('--hw', hw + 'px');
    el.mao.classList.toggle('duas', U.duas);
    if (!el.tela.hidden) { const card = el.tela.querySelector('.tela-card'); if (card) el.mesa.style.minHeight = Math.ceil(card.offsetHeight + 18) + 'px'; }
  }
  let rt = 0;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { ajustar(); pintar(); }, 120); });

  /* o rio de cada jogador, na posição certa em volta do centro */
  function desenharRio(pos) {
    const j = assentoDe(pos), m = S.m, rio = m.rios[j], n = rio.length;
    const cols = Math.max(3, Math.ceil(n / 6));
    const ult = m.ultimo && m.fase !== 'fim' ? m.ultimo : null;
    let h = '';
    for (let i = 0; i < n; i++) {
      const x = rio[i], lin = Math.floor(i / 6), c = i % 6;
      let gr, gc;
      if (pos === 0) { gr = lin + 1; gc = c + 1; }
      else if (pos === 2) { gr = Math.max(3, Math.ceil(n / 6)) - lin; gc = 6 - c; }
      else if (pos === 1) { gc = lin + 1; gr = 6 - c; }
      else { gc = cols - lin; gr = c + 1; }
      const cls = (x.riichi ? 'rii ' : '') + (x.tomada ? 'apagada ' : '') + (ult && ult.de === j && ult.id === x.id && i === n - 1 ? 'ultimo' : '');
      h += pc(x.id, cls, 'span', ' style="grid-row:' + gr + ';grid-column:' + gc + '"');
    }
    $('#rio-' + pos).innerHTML = h;
  }

  function vezAtual() {
    const m = S.m;
    return m && m.pend && m.pend.tipo === 'descarte' ? m.pend.j : -1;
  }

  function desenharCantos() {
    const v = vezAtual();
    for (let pos = 0; pos < 4; pos++) {
      const j = assentoDe(pos), c = $('#cn-' + pos);
      const w = VENTO_JP[(j - S.dealer + 4) & 3];
      c.className = 'canto canto-' + ['bl', 'br', 'tr', 'tl'][pos] + (v === j ? ' vez' : '') + (S.m.riichi[j] ? ' riichi' : '');
      c.innerHTML = '<b lang="ja">' + w + '</b><small class="cj-nome">' + esc(nomeDe(j)) + '</small><small>' + fmt(S.pontos[j]) + '</small>';
    }
  }

  function desenharCentro() {
    const m = S.m, ind = [];
    for (let i = 0; i < 5; i++) {
      if (i < m.nDora) ind.push(pc(m.muro[P.IND_DORA + 2 * i], ''));
      else ind.push(pcVerso(''));
    }
    $('#c-rod').textContent = VENTO_PT[S.vento & 3] + ' ' + ((S.rod & 3) + 1);
    $('#c-lin').textContent = 'Indicador de dora';
    $('#c-dora').innerHTML = ind.join('');
    $('#hud-v1').textContent = VENTO_PT[S.vento & 3] + ' ' + ((S.rod & 3) + 1);
    $('#hud-v2').textContent = String(P.restantes(m));
    $('#hud-v3').textContent = String(S.honba);
    $('#hud-v4').textContent = String(S.varetas);
  }

  function meldHtml(x, cls) {
    let h = '';
    x.ids.forEach((id, i) => {
      if (x.t === 'ankan' && (i === 0 || i === 3)) h += pcVerso(cls);
      else h += pc(id, (x.tomada === id && x.aberto ? 'tomada-de ' : '') + (cls || ''));
    });
    return '<span class="meld" role="group" aria-label="' + esc(x.t === 'chi' ? 'Chi' : x.t === 'pon' ? 'Pon' : 'Kan') + '">' + h + '</span>';
  }

  /* peças que podem ser descartadas agora e as que aceitam riichi */
  function opcoesMinhas() {
    if (!S || S.fim || !S.m || S.m.fase === 'fim') return null;
    const j = meuAssento();
    if (S.m.pend && S.m.pend.tipo === 'descarte' && S.m.pend.j === j) return P.opcoesDescarte(S, j);
    return null;
  }

  function desenharMao() {
    const m = S.m, j = meuAssento(), mao = m.hands[j], dra = m.comprada[j];
    const o = opcoesMinhas();
    const ordem = mao.filter((id) => id !== dra);
    if (dra !== null && mao.indexOf(dra) >= 0) ordem.push(dra);
    const permitidas = o ? (U.riichi ? o.riichi : o.descartes) : [];
    let h = '';
    ordem.forEach((id) => {
      let cls = '';
      if (id === dra) cls += 'nova ';
      if (o) {
        if (permitidas.indexOf(id) >= 0) cls += U.riichi ? 'opc ' : '';
        else cls += 'nao ';
      } else cls += 'passiva ';
      if (U.sel === id) cls += 'sel ';
      if (U.dica === id) cls += 'dica ';
      h += pc(id, cls, 'button');
    });
    el.mao.innerHTML = h;
    el.melds.innerHTML = m.melds[j].map((x) => meldHtml(x)).join('');
  }

  function desenharChips() {
    const v = vezAtual();
    let h = '';
    for (let k = 0; k < 4; k++) {
      const j = assentoDe(k), m = S.m;
      const w = (j - S.dealer + 4) & 3;
      const melds = m.melds[j].map((x) => meldHtml(x)).join('');
      h += '<div class="chip-j' + (v === j ? ' vez' : '') + (j === meuAssento() ? ' eu' : '') + '" role="listitem">' +
        '<div class="cj-topo"><b>' + esc(nomeDe(j)) + (j === meuAssento() ? '' : ' <small>' + (S.cfg.niveis ? 'nível ' + S.cfg.niveis[j] : '') + '</small>') + '</b><span>' + fmt(S.pontos[j]) + '</span></div>' +
        '<small>' + VENTO_PT[w] + (w === 0 ? ' (dealer)' : '') + (m.riichi[j] ? ' · riichi' + (m.riichi[j] === 2 ? ' duplo' : '') : '') + '</small>' +
        '<div class="cj-melds">' + melds + '</div></div>';
    }
    el.chips.innerHTML = h;
  }

  function desenharDiario() {
    el.diario.innerHTML = U.diario.length ? U.diario.slice(-8).map((t) => '<li>' + esc(t) + '</li>').join('') : '<li class="vazio">As jogadas aparecem aqui.</li>';
    el.diario.scrollTop = el.diario.scrollHeight;
  }
  function registrar(t) { U.diario.push(t); if (U.diario.length > 30) U.diario.shift(); }
  function dizer(t) { el.msg.textContent = t || ''; }

  function pintar() {
    if (!S) return;
    for (let p = 0; p < 4; p++) desenharRio(p);
    desenharCantos();
    desenharCentro();
    desenharMao();
    desenharChips();
    desenharDiario();
    desenharAcao();
    $('#modo-nome').textContent = 'Riichi ' + (S.cfg.fim === 'tonpuusen' ? 'Tonpuusen' : 'Hanchan');
    $('#modo-sub').textContent = (U.assistido ? 'Com dica, fora das estatísticas · ' : '') + 'Robôs: ' + (prefs.nivel === 0 ? 'variados' : 'nível ' + prefs.nivel) + (S.cfg.aka ? ' · com 5 vermelhos' : ' · sem 5 vermelhos');
    $('#ajuda-atual').textContent = 'Robôs ' + ({ rapido: 'rápidos', normal: 'normais', lento: 'lentos' })[prefs.vel] + (prefs.esperas === 'sim' ? '' : '');
    document.querySelectorAll('#op-vel .seg-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === prefs.vel)));
    document.querySelectorAll('#op-esperas .seg-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === prefs.esperas)));
    document.querySelectorAll('#op-auto .seg-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === prefs.auto)));
    el.dicaBtn.disabled = !(S.m && S.m.pend && S.m.pend.tipo && precisaDeMim());
  }
  const precisaDeMim = () => P.pendentes(S).some((x) => P.ehHumano(S, x.j));

  /* ==========================================================================
     4. Painel de ação e dica
     ========================================================================== */
  const botao = (cls, txt, fn, extra) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ' + cls; b.innerHTML = txt; b.addEventListener('click', fn); if (extra) extra(b); return b; };

  /* quantas peças de cada tipo ainda não apareceram (da sua visão) */
  function restam(k) { const v = BT.visivel(S, meuAssento()); return Math.max(0, 4 - v[k]); }

  function previa(id) {
    const j = meuAssento();
    const av = BT.avaliar(S, j).filter((x) => x.id === id)[0];
    if (!av) return '';
    if (av.shanten <= 0) {
      const tipos = av.tipos.slice().sort((a, b) => a - b);
      const rest = tipos.map((k) => restam(k)).reduce((a, b) => a + b, 0);
      const furi = tipos.some((k) => k === av.kind || S.m.rios[j].some((x) => M.kindDe(x.id) === k));
      return 'Pronta, espera ' + tipos.map((k) => nomeK(k)).join(', ') + ' (' + rest + (rest === 1 ? ' peça' : ' peças') + ' no jogo).' + (furi ? ' Cuidado: furiten, só vale por tsumo.' : '');
    }
    return 'Faltam ' + av.shanten + (av.shanten === 1 ? ' troca' : ' trocas') + ' para ficar pronta; ' + av.ukeire + ' peças ajudam.';
  }

  function textoValor(r) {
    if (r.yakuman) return r.limite;
    return r.han + ' han ' + r.fu + ' fu' + (r.limite ? ' (' + r.limite + ')' : '');
  }

  function desenharAcao() {
    el.acao.innerHTML = '';
    el.dica.className = '';
    if (U.dicaTxt) { el.dica.textContent = U.dicaTxt; el.dica.className = 'espera'; }
    else if (U.sel !== null && prefs.esperas === 'sim' && opcoesMinhas()) { el.dica.textContent = previa(U.sel); el.dica.className = 'espera'; }
    else el.dica.textContent = '';
    if (!S || U.tela || U.pausa) return;
    if (S.m.fase === 'fim') {
      el.acao.appendChild(botao('btn-primary', S.fim ? 'Ver o resultado final' : 'Ver o resultado da mão', () => mostrarResultadoMao()));
      return;
    }
    if (S.fim) return;
    const j = meuAssento(), m = S.m, p = m.pend;
    if (!p) return;
    if (p.tipo === 'descarte' && p.j === j) {
      const o = P.opcoesDescarte(S, j);
      const caixa = document.createElement('div'); caixa.className = 'botoes';
      if (o.tsumo) {
        caixa.appendChild(botao('btn-primary', 'Tsumo', () => agirHumano({ k: 'tsumo' })));
        el.dica.textContent = 'Você completou a mão: ' + o.tsumo.yaku.map((y) => y.nome).join(', ') + '. Vale ' + textoValor(o.tsumo) + '.';
        el.dica.className = 'espera';
      }
      if (o.riichi.length) {
        caixa.appendChild(botao('btn-secondary' + (U.riichi ? ' ligado' : ''), 'Riichi', () => { U.riichi = !U.riichi; U.sel = null; ON.som('toque'); pintar(); }, (b) => { b.setAttribute('aria-pressed', String(U.riichi)); }));
      }
      o.ankan.forEach((k) => caixa.appendChild(botao('btn-secondary', 'Kan ' + pcK(k, ''), () => agirHumano({ k: 'ankan', kind: k }))));
      const vistos = {};
      o.kakan.forEach((id) => { const k = M.kindDe(id); if (vistos[k]) return; vistos[k] = 1; caixa.appendChild(botao('btn-secondary', 'Kan ' + pcK(k, ''), () => agirHumano({ k: 'kakan', id: id }))); });
      if (o.kyuushu) caixa.appendChild(botao('btn-secondary', '9 pontas', () => agirHumano({ k: 'kyuushu' })));
      if (U.sel !== null) caixa.appendChild(botao('btn-primary', U.riichi ? 'Descartar e declarar riichi' : 'Descartar', () => descartarSel()));
      if (U.riichi && !U.sel) { const t = document.createElement('p'); t.className = 'aviso-furiten'; t.textContent = 'Toque na peça que deseja descartar para declarar riichi. As peças apagadas deixariam a mão sem espera.'; el.acao.appendChild(t); }
      if (m.riichi[j] && !o.tsumo && !o.ankan.length) { const t = document.createElement('p'); t.className = 'aviso-furiten'; t.textContent = 'Você está em riichi: só pode descartar a peça que comprou.'; el.acao.appendChild(t); }
      if (caixa.children.length) el.acao.appendChild(caixa);
      return;
    }
    if (p.tipo === 'reacao' && p.esperando.indexOf(j) >= 0 && !p.respostas[j]) {
      const o = P.opcoesReacao(S, j);
      const barra = document.createElement('div'); barra.className = 'barra';
      const orig = p.origem === 'descarte' ? 'descartou' : p.origem === 'kakan' ? 'acrescentou ao kan' : 'fez um kan fechado';
      const tit = document.createElement('div'); tit.className = 'barra-tit';
      tit.innerHTML = esc(nomeDe(p.de)) + ' ' + orig + ' ' + pc(p.peca, '', 'span', ' style="--w:26px"') + ' ' + esc(nomeId(p.peca));
      barra.appendChild(tit);
      const bs = document.createElement('div'); bs.className = 'botoes';
      if (o.ron) {
        bs.appendChild(botao('btn-ron', 'Ron', () => agirHumano({ k: 'ron' })));
        el.dica.textContent = 'Dá para vencer: ' + o.ron.yaku.map((y) => y.nome).join(', ') + '. Vale ' + textoValor(o.ron) + '.';
        el.dica.className = 'espera';
      }
      o.pon.forEach((par) => bs.appendChild(botao('btn-secondary', 'Pon <span class="mini-fila">' + kindsFila(par.concat([p.peca]).sort((a, b) => a - b)) + '</span>', () => agirHumano({ k: 'pon', ids: par }))));
      o.chi.forEach((par) => bs.appendChild(botao('btn-secondary', 'Chi <span class="mini-fila">' + kindsFila(par.concat([p.peca]).sort((a, b) => M.kindDe(a) - M.kindDe(b))) + '</span>', () => agirHumano({ k: 'chi', ids: par }))));
      if (o.kan) bs.appendChild(botao('btn-secondary', 'Kan', () => agirHumano({ k: 'kan' })));
      bs.appendChild(botao('btn-passar', 'Passar', () => passar(o)));
      barra.appendChild(bs);
      el.acao.appendChild(barra);
    }
  }

  function passar(o) {
    if (o.ron) {
      ON.confirmar({ titulo: 'Passar o ron?', texto: 'Você pode vencer com essa peça. Se passar, fica em furiten e não poderá dar ron por um tempo.', sim: 'Passar mesmo', nao: 'Voltar' }).then((ok) => { if (ok) agirHumano({ k: 'passar' }); });
      return;
    }
    agirHumano({ k: 'passar' });
  }

  function descartarSel() {
    if (U.sel === null) return;
    agirHumano({ k: 'descartar', id: U.sel, riichi: U.riichi });
  }

  el.mao.addEventListener('click', (ev) => {
    const b = ev.target.closest('.pc');
    if (!b || !S) return;
    const o = opcoesMinhas();
    if (!o || U.tela) return;
    const id = +b.dataset.id;
    const permitidas = U.riichi ? o.riichi : o.descartes;
    if (permitidas.indexOf(id) < 0) {
      ON.som('erro');
      dizer(S.m.riichi[meuAssento()] ? 'Em riichi, só dá para descartar a peça que você comprou.' : U.riichi ? 'Com essa peça a mão não fica pronta para o riichi.' : 'Essa peça não pode ser descartada agora.');
      return;
    }
    if (U.sel === id) { descartarSel(); return; }
    U.sel = id; U.dicaTxt = ''; U.dica = null;
    ON.som('toque'); dizer('');
    desenharMao(); desenharAcao();
  });

  el.dicaBtn.addEventListener('click', () => {
    if (!S || !precisaDeMim()) return;
    const d = BT.dica(S, meuAssento());
    if (!d) return;
    const primeira = !U.assistido;
    U.assistido = true;
    U.dicaTxt = d.texto;
    U.dica = d.id !== undefined ? d.id : null;
    if (primeira) dizer('Com a dica, esta partida deixa de contar nas estatísticas.');
    ON.som('acerto');
    pintar(); gravar();
  });

  /* ==========================================================================
     5. Andamento da partida
     ========================================================================== */
  function descreverLog() {
    const m = S.m;
    for (; U.logPos < m.log.length; U.logPos++) {
      const e = m.log[U.logPos], q = e.j !== undefined ? nomeDe(e.j) : '';
      switch (e.k) {
        case 'descarte': registrar(q + ' descartou ' + nomeId(e.id) + (e.tsumogiri ? ' (da compra)' : '')); break;
        case 'riichi': registrar(q + ' declarou riichi'); dizer(q + ' declarou riichi.'); ON.som('junta'); if (e.j === meuAssento()) mudarStats((s) => { s.riichi++; }); break;
        case 'pon': registrar(q + ' chamou pon de ' + nomeK(M.kindDe(e.id))); dizer(q + ': pon!'); ON.som('captura'); break;
        case 'chi': registrar(q + ' chamou chi de ' + nomeK(M.kindDe(e.id))); dizer(q + ': chi!'); ON.som('captura'); break;
        case 'kan': registrar(q + ' fez kan de ' + nomeK(M.kindDe(e.id))); dizer(q + ': kan!'); ON.som('captura'); break;
        case 'ankan': registrar(q + ' fez um kan fechado de ' + nomeK(e.kind)); dizer(q + ' fez um kan fechado.'); ON.som('captura'); break;
        case 'kakan': registrar(q + ' acrescentou ao pon e fez kan'); dizer(q + ' acrescentou a quarta peça (kan).'); ON.som('captura'); break;
        case 'tsumo': registrar(q + ' venceu por tsumo'); break;
        case 'ron': registrar(q + ' venceu por ron'); break;
        default: break;
      }
    }
  }

  function agirHumano(a) {
    if (!S || U.tela) return;
    const j = meuAssento();
    const r = P.agir(S, j, a);
    if (!r.ok) { ON.som('erro'); dizer('Não foi possível: ' + r.motivo + '.'); return; }
    U.sel = null; U.riichi = false; U.dica = null; U.dicaTxt = '';
    dizer('');
    if (a.k === 'descartar') ON.som('mover');
    descreverLog();
    pintar(); gravar();
    avancar();
  }

  function passoBot(bot) {
    if (!S || U.tela) return;
    const m = S.m;
    const o = bot.tipo === 'descarte' ? P.opcoesDescarte(S, bot.j) : P.opcoesReacao(S, bot.j);
    const a = BT.decidir(S, bot.j, bot.tipo, o);
    /* antes da jogada: o que eu esperava (para avisar de furiten ou falta de yaku) */
    const eu = meuAssento();
    let espera = null;
    if (bot.tipo === 'descarte' && a.k === 'descartar' && bot.j !== eu && m.hands[eu].length % 3 === 1) espera = P.esperasDe(S, eu, m.hands[eu]);
    const r = P.agir(S, bot.j, a);
    if (!r.ok) { /* nunca deveria acontecer; passa para não travar */ P.agir(S, bot.j, { k: 'passar' }); }
    if (espera && S.m.rios[bot.j].length) {
      const kd = M.kindDe(a.id);
      const pend = S.m.pend;
      const tenhoRon = pend && pend.tipo === 'reacao' && pend.esperando.indexOf(eu) >= 0 && P.opcoesReacao(S, eu).ron;
      if (espera.indexOf(kd) >= 0 && !tenhoRon) dizer('Você espera por ' + nomeK(kd) + ', mas não pode dar ron: ' + (P.emFuriten(S, eu, espera) ? 'furiten.' : 'a mão não teria yaku.'));
    }
    descreverLog();
    pintar(); gravar();
    avancar();
  }

  function avancar() {
    clearTimeout(U.t);
    if (!S || U.pausa) return;
    const m = S.m;
    if (m.fase === 'fim') { U.t = setTimeout(mostrarResultadoMao, prefs.vel === 'rapido' ? 250 : 700); return; }
    const pd = P.pendentes(S);
    if (!pd.length) return;
    const bot = pd.filter((x) => !P.ehHumano(S, x.j))[0];
    if (bot) {
      const delay = bot.tipo === 'descarte' ? VEL[prefs.vel] : Math.min(60, VEL[prefs.vel] / 4);
      U.t = setTimeout(() => passoBot(bot), delay);
      return;
    }
    /* é com você */
    const j = meuAssento();
    if (m.pend.tipo === 'descarte' && m.riichi[j] && prefs.auto === 'sim') {
      const o = P.opcoesDescarte(S, j);
      if (!o.tsumo && !o.ankan.length && o.descartes.length) {
        U.t = setTimeout(() => { if (S && !U.tela) agirHumano({ k: 'descartar', id: o.descartes[0] }); }, Math.max(350, VEL[prefs.vel] / 1.6));
        return;
      }
    }
    if (m.pend.tipo === 'descarte') ON.vibrar('leve');
    rolarParaMesa();
  }

  /* no retrato, leva a mesa (com a mão e o painel de ação) para dentro da tela quando é a sua vez */
  function rolarParaMesa() {
    if (ehLado() || U.tela) return;
    const header = document.querySelector('header');
    const hh = header ? header.offsetHeight : 60;
    const r = el.mesa.getBoundingClientRect();
    const painel = $('#entrada').offsetHeight;
    const alvo = r.top - hh - 6;
    const cabe = r.height + painel + hh < window.innerHeight;
    if (cabe ? (Math.abs(alvo) > 40) : (r.top > hh + 40 || r.top < -40)) {
      const reduz = document.documentElement.getAttribute('data-reduzir') === '1';
      window.scrollTo({ top: Math.max(0, window.scrollY + alvo), behavior: reduz ? 'auto' : 'smooth' });
    }
  }

  /* --- resultado da mão --- */
  const pontosTxt = (n) => (n > 0 ? '+' : '') + fmt(n);
  function linhaPontos(deltas, extraSaldo) {
    const eu = meuAssento();
    return '<div class="res">' + [0, 1, 2, 3].map((k) => {
      const j = assentoDe(k), d = deltas[j];
      return '<div class="res-lin' + (j === eu ? ' eu' : '') + (d > 0 ? ' pos' : d < 0 ? ' neg' : '') + '"><span>' + esc(nomeDe(j)) + '</span><b>' + (d ? pontosTxt(d) : '0') + '</b><small>' + fmt(S.pontos[j]) + ' pontos' + (extraSaldo ? '' : '') + '</small></div>';
    }).join('') + '</div>';
  }

  function maoVencedora(w) {
    const ids = w.mao.slice();
    const i = ids.indexOf(w.peca);
    if (i >= 0) ids.splice(i, 1);
    ids.sort((a, b) => a - b);
    let h = '<div class="res-mao">' + kindsFila(ids, '');
    h += '<span class="sep"></span>' + pc(w.peca, 'ganhou');
    h += w.melds.map((x) => '<span class="sep"></span>' + meldHtml(x)).join('');
    return h + '</div>';
  }

  function blocoVencedor(w, res) {
    const r = w.res;
    const quem = nomeDe(w.j) + ' venceu por ' + (res.tipo === 'tsumo' ? 'tsumo' : 'ron no descarte ' + (res.de === meuAssento() ? 'seu' : 'de ' + nomeDe(res.de)));
    let ys = r.yaku.map((y) => '<li><span>' + y.nome + '<small lang="ja">' + y.jp + '</small></span><b>' + (y.yakuman ? (y.mult > 1 ? 'Yakuman x' + y.mult : 'Yakuman') : y.han + ' han') + '</b></li>').join('');
    const tot = w.pagamentos.reduce((a, b) => a + b, 0);
    const doras = P.indicadores(S, P.IND_DORA);
    let ind = '<div class="res-dora"><span>Indicadores:</span>' + Array.from({ length: S.m.nDora }, (_, i) => pc(S.m.muro[P.IND_DORA + 2 * i], '')).join('') +
      (res.ura.length ? '<span>Ura:</span>' + res.ura.map((id) => pc(id, '')).join('') : '') + '</div>';
    void doras;
    return '<div class="res-bloco"><div class="res-quem">' + esc(quem) + '</div>' + maoVencedora(w) +
      '<ul class="yk">' + ys + '</ul>' +
      '<div class="res-tot">' + textoValor(r) + '<small>' + (r.yakuman ? 'mão máxima' : 'base ' + fmt(r.base)) + ' · recebeu ' + fmt(tot) + (w.pao ? ' (pao: ' + esc(nomeDe(w.pao.de)) + ' paga)' : '') + '</small></div>' + ind + '</div>';
  }

  const MOTIVOS = { kyuushu: 'Nove pontas e honras: mão cancelada', suufon: 'Quatro ventos iguais descartados: mão cancelada', suucha: 'Quatro riichis: mão cancelada', suukaikan: 'Quatro kans de jogadores diferentes: mão cancelada', sanchahou: 'Três rons no mesmo descarte: mão cancelada' };

  function mostrarResultadoMao() {
    if (!S || U.tela) return;
    const m = S.m, res = m.resultado;
    if (!res) return;
    const eu = meuAssento();
    let titulo, corpo = '', som = 'acerto';
    if (res.tipo === 'ron' || res.tipo === 'tsumo') {
      const euVenci = res.vencedores.some((w) => w.j === eu);
      titulo = euVenci ? 'Você venceu!' : (res.tipo === 'tsumo' ? nomeDe(res.vencedores[0].j) + ' venceu' : 'Mão vencida');
      if (!euVenci && res.tipo === 'ron' && res.de === eu) titulo = 'Você pagou o ron';
      corpo = res.vencedores.map((w) => blocoVencedor(w, res)).join('');
      som = euVenci ? 'vitoria' : 'derrota';
    } else if (res.tipo === 'empate') {
      titulo = res.motivo === 'nagashi' ? 'Nagashi mangan' : 'Muro esgotado';
      if (res.motivo === 'nagashi') corpo = '<p>Todos os descartes de ' + res.nagashi.map((j) => esc(nomeDe(j))).join(' e ') + ' foram pontas ou honras e nenhum foi chamado: vale um mangan.</p>';
      else {
        corpo = '<p>Em tenpai: ' + (res.tenpai.some((x) => x) ? res.tenpai.map((t, j) => (t ? esc(nomeDe(j)) : null)).filter(Boolean).join(', ') : 'ninguém') + '.</p>';
        corpo += res.tenpai.map((t, j) => (t && m.hands[j].length ? '<div class="res-mao">' + kindsFila(m.hands[j], '') + m.melds[j].map((x) => '<span class="sep"></span>' + meldHtml(x)).join('') + '</div>' : '')).join('');
      }
      som = 'toque';
    } else {
      titulo = 'Mão cancelada';
      corpo = '<p>' + (MOTIVOS[res.motivo] || 'Mão cancelada') + (res.motivo === 'kyuushu' ? ' (' + esc(nomeDe(res.quem)) + ')' : '') + '. Sem pontos; o dealer repete.</p>';
      som = 'toque';
    }
    corpo += linhaPontos(res.deltas);
    ON.som(som);
    if (som === 'vitoria') ON.vibrar('vitoria');
    /* estatísticas da mão (uma vez) */
    if (U.contouMao !== S.numMao) {
      U.contouMao = S.numMao;
      mudarStats((s) => {
        s.maos++;
        if (res.vencedores) {
          const w = res.vencedores.filter((x) => x.j === eu)[0];
          if (w) {
            s.venc++; if (res.tipo === 'tsumo') s.tsumo++; else s.ron++;
            if (w.res.yakuman) s.yakuman++;
            const tot = w.pagamentos.reduce((a, b) => a + b, 0);
            if (tot > s.maior) { s.maior = tot; s.maiorNome = textoValor(w.res); }
          }
        }
      });
    }
    gravar();
    const fim = !!S.fim;
    mostrarTela({
      titulo, corpo, opaca: false,
      btn: fim ? 'Ver o resultado final' : 'Próxima mão',
      fn: () => { fecharTela(); if (fim) mostrarFim(); else proximaMao(); },
      btn2: 'Ver a mesa', fn2: () => { fecharTela(); }
    });
  }

  function proximaMao() {
    P.proximaMao(S);
    U.sel = null; U.riichi = false; U.dica = null; U.dicaTxt = ''; U.logPos = 0;
    registrar('Nova mão: ' + VENTO_PT[S.vento & 3] + ' ' + ((S.rod & 3) + 1) + (S.honba ? ', honba ' + S.honba : ''));
    dizer('');
    pintar(); gravar();
    avancar();
  }

  function mostrarFim() {
    const eu = meuAssento(), rk = S.fim.ranking, fin = S.fim.final;
    const pos = rk.indexOf(eu);
    if (!U.contouFim) {
      U.contouFim = true;
      mudarStats((s) => { s.jogos++; s.pos[pos]++; });
    }
    gravar();
    const motivo = S.fim.motivo === 'falencia' ? 'Alguém ficou abaixo de zero.' : (S.cfg.fim === 'tonpuusen' ? 'Fim do Tonpuusen.' : 'Fim do Hanchan.');
    const corpo = '<p>' + motivo + '</p><div class="res">' + rk.map((j, i) =>
      '<div class="res-lin' + (j === eu ? ' eu' : '') + (fin[j] > 0 ? ' pos' : ' neg') + '"><span>' + (i + 1) + 'º ' + esc(nomeDe(j)) + '</span><b>' + (fin[j] > 0 ? '+' : '') + fin[j].toFixed(1).replace('.', ',') + '</b><small>' + fmt(S.pontos[j]) + ' pontos</small></div>').join('') + '</div>' +
      '<p class="tela-sub">A pontuação final desconta 30.000 de cada um e soma o uma (20, 10, menos 10, menos 20). O primeiro lugar fecha a conta.</p>' + (U.assistido ? '<p class="tela-sub">Esta partida usou a Dica e não entra nas estatísticas.</p>' : '');
    ON.som(pos === 0 ? 'vitoria' : pos === 3 ? 'derrota' : 'acerto');
    if (pos === 0) ON.vibrar('vitoria');
    mostrarTela({
      titulo: pos === 0 ? 'Você venceu a partida!' : 'Você ficou em ' + (pos + 1) + 'º lugar', corpo, opaca: false,
      btn: 'Nova partida', fn: () => { fecharTela(); novaPartida(opcoesAtuais()); },
      btn2: 'Ver a mesa', fn2: () => { fecharTela(); }
    });
  }

  /* ==========================================================================
     6. Telas, nova partida e Como Jogar
     ========================================================================== */
  function mostrarTela(o) {
    U.tela = true;
    el.telaTitulo.textContent = o.titulo || '';
    el.telaCorpo.innerHTML = o.corpo || '';
    el.tela.classList.toggle('opaca', !!o.opaca);
    $('#mesa').inert = !!o.opaca; $('#mao').inert = true;
    el.telaBtn.hidden = !o.btn;
    el.telaBtn.textContent = o.btn || '';
    el.telaBtn.onclick = o.fn || null;
    el.telaBtn2.hidden = !o.btn2;
    el.telaBtn2.textContent = o.btn2 || '';
    el.telaBtn2.onclick = o.fn2 || null;
    el.tela.hidden = false;
    el.mesa.style.minHeight = '';
    const card = el.tela.querySelector('.tela-card');
    if (card) el.mesa.style.minHeight = Math.ceil(card.offsetHeight + 18) + 'px';
    desenharAcao();
    try { el.tela.scrollIntoView({ block: 'nearest' }); } catch (e) { /* ignora */ }
    setTimeout(() => { try { el.telaBtn.focus({ preventScroll: true }); } catch (e) { /* ignora */ } }, 50);
  }
  /* "Ver a mesa" esconde o resultado; o botão "Ver o resultado" (painel de ação) traz de volta */
  function fecharTela() {
    el.tela.hidden = true;
    el.mesa.style.minHeight = '';
    $('#mesa').inert = false; $('#mao').inert = false;
    U.tela = false;
    desenharAcao();
  }

  /* --- nova partida --- */
  let esc2 = { fim: 'hanchan', aka: true, nivel: 3 };
  const segHtml = (itens, atual, chave) => itens.map((it) => '<button class="seg-btn" type="button" data-' + chave + '="' + it[0] + '" aria-pressed="' + (it[0] === atual) + '">' + it[1] + '</button>').join('');
  const MODOS = [['riichi', 'Riichi (Japonês)', 'O mahjong japonês de quatro jogadores contra três robôs: riichi, dora, chamadas e partida completa, com as regras das partidas online.']];
  function desenharEscolha() {
    $('#tiles-modo').innerHTML = MODOS.map((m) => '<button type="button" class="tile" data-modo="' + m[0] + '" aria-current="true"><span class="tile-mini"><span class="pc" style="--w:34px;margin:6px 11px">' + SVG('t-z7') + '</span></span><span class="tile-txt"><span class="tile-nome">' + m[1] + '</span><span class="tile-desc">' + m[2] + '</span></span></button>').join('');
    $('#opcoes-modo').innerHTML =
      '<h3 class="sec-tit" id="sec-fim">Duração</h3><div class="seg seg-wrap" id="op-fim" role="group" aria-labelledby="sec-fim">' + segHtml([['hanchan', 'Hanchan'], ['tonpuusen', 'Tonpuusen']], esc2.fim, 'fim') + '</div>' +
      '<p class="nivel-nome">' + (esc2.fim === 'hanchan' ? 'Hanchan: rodadas do Leste e do Sul (a partida padrão).' : 'Tonpuusen: só as rodadas do Leste, mais curto.') + '</p>' +
      '<h3 class="sec-tit" id="sec-aka">Peças vermelhas</h3><div class="seg seg-wrap" id="op-aka" role="group" aria-labelledby="sec-aka">' + segHtml([['sim', 'Com 5 vermelhos'], ['nao', 'Sem']], esc2.aka ? 'sim' : 'nao', 'aka') + '</div>' +
      '<p class="nivel-nome">Com os três 5 vermelhos (aka dora), cada um vale 1 han a mais.</p>' +
      '<h3 class="sec-tit" id="sec-niv">Nível dos robôs</h3><div class="seg seg-niveis" id="op-niveis" role="group" aria-labelledby="sec-niv">' + segHtml([1, 2, 3, 4, 5, 0].map((n) => [n, n === 0 ? 'Variados' : n + ' ' + NIVEIS[n]]), esc2.nivel, 'nv') + '</div>' +
      '<p class="nivel-nome">' + (NIVEL_DESC[esc2.nivel] || '') + '</p>';
  }
  const delegar = (sel, fn) => $(sel).addEventListener('click', (ev) => { const b = ev.target.closest('.seg-btn'); if (!b) return; fn(b); desenharEscolha(); ON.som('toque'); });
  $('#partida-corpo').addEventListener('click', (ev) => {
    const b = ev.target.closest('.seg-btn'); if (!b) return;
    if (b.dataset.fim) esc2.fim = b.dataset.fim;
    else if (b.dataset.aka) esc2.aka = b.dataset.aka === 'sim';
    else if (b.dataset.nv !== undefined) esc2.nivel = +b.dataset.nv;
    else return;
    desenharEscolha(); ON.som('toque');
  });
  void delegar;
  function abrirPartida() { esc2 = { fim: prefs.fim, aka: prefs.aka, nivel: prefs.nivel }; desenharEscolha(); }
  const opcoesAtuais = () => ({ fim: prefs.fim, aka: prefs.aka, nivel: prefs.nivel });
  const emAndamento = () => !!(S && !S.fim && S.numMao > 0 && (S.numMao > 1 || S.m.log.length > 12 || S.m.rios.some((r) => r.length)));
  const TXT_ABANDONA = { texto: 'A partida em andamento será abandonada.', sim: 'Sim, começar outra' };
  $('#partida-jogar').addEventListener('click', () => {
    const o = Object.assign({}, esc2);
    ON.novoJogo(emAndamento(), () => { ON.modal.fechar(); novaPartida(o); }, TXT_ABANDONA);
  });
  $('#modo-btn').addEventListener('click', abrirPartida);
  el.restart.addEventListener('click', () => { ON.novoJogo(emAndamento(), () => novaPartida(opcoesAtuais()), TXT_ABANDONA); });

  function novaPartida(o) {
    if (U) clearTimeout(U.t);
    prefs.fim = o.fim === 'tonpuusen' ? 'tonpuusen' : 'hanchan';
    prefs.aka = o.aka !== false;
    prefs.nivel = o.nivel >= 0 && o.nivel <= 5 ? o.nivel : 3;
    gravarPrefs();
    const sem = SO.novaSemente();
    S = P.criar({ fim: prefs.fim, aka: prefs.aka, semente: sem, humanos: [0] });
    const g = SO.criar(sem + '|elenco');
    const nomes = g.embaralhar(NOMES_ROBOS.slice()).slice(0, 3);
    const niv = g.embaralhar([2, 3, 4, 5]);
    S.cfg.niveis = [0, 1, 2, 3].map((j) => (j === 0 ? 0 : prefs.nivel > 0 ? prefs.nivel : niv[j - 1]));
    U = novoU();
    U.nomes = ['Você', nomes[0], nomes[1], nomes[2]];
    registrar('Partida nova: ' + (prefs.fim === 'tonpuusen' ? 'Tonpuusen' : 'Hanchan') + '. Você é o ' + VENTO_PT[(0 - S.dealer + 4) & 3] + '.');
    fecharTela();
    dizer('');
    ajustar();
    descreverLog();
    pintar(); gravar();
    avancar();
  }

  function restaurar() {
    const L = lerSalvo();
    if (!L) { sdel(LS.jogo); return false; }
    S = L.S; U = L.U;
    U.pausa = true;
    const fimJogo = !!S.fim, maoFim = S.m.fase === 'fim';
    ajustar();
    pintar();
    mostrarTela({
      titulo: 'Partida salva',
      corpo: '<p>Sua partida estava em andamento neste aparelho.</p><p class="tela-sub">Riichi ' + (S.cfg.fim === 'tonpuusen' ? 'Tonpuusen' : 'Hanchan') + ' · ' + VENTO_PT[S.vento & 3] + ' ' + ((S.rod & 3) + 1) + ' · ' + fmt(S.pontos[meuAssento()]) + ' pontos</p>',
      opaca: true, btn: 'Continuar',
      fn: () => { U.pausa = false; fecharTela(); if (fimJogo && U.contouFim) { mostrarFim(); return; } avancar(); void maoFim; }
    });
    return true;
  }

  /* --- Como Jogar --- */
  let abas = [];
  function mostrarAba(aba) {
    abas.forEach((a) => {
      const s = a === aba;
      a.setAttribute('aria-selected', String(s)); a.tabIndex = s ? 0 : -1;
      document.getElementById(a.getAttribute('aria-controls')).hidden = !s;
    });
    document.getElementById(aba.getAttribute('aria-controls')).scrollTop = 0;
  }
  function montarAjuda() {
    const f = (t) => comTiras(String(t || '').replace('{{yaku}}', htmlYaku()).replace('{{pontos}}', htmlPontos()));
    $('#painel-site').innerHTML = f(TX.site);
    $('#painel-regras').innerHTML = f(TX.regras);
    $('#painel-yaku').innerHTML = f(TX.yaku);
    $('#painel-dicas').innerHTML = f(TX.dicas);
    $('#yaku-corpo').innerHTML = htmlYaku() + '<h3>Valores de uma mão</h3>' + htmlPontos();
  }
  function ligarAbas() {
    abas = Array.from(document.querySelectorAll('.aba'));
    abas.forEach((a) => {
      a.addEventListener('click', () => mostrarAba(a));
      a.addEventListener('keydown', (ev) => {
        if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
        const novo = abas[(abas.indexOf(a) + (ev.key === 'ArrowRight' ? 1 : -1) + abas.length) % abas.length];
        mostrarAba(novo); novo.focus(); ev.preventDefault();
      });
    });
    $('#howto-btn').addEventListener('click', () => mostrarAba(abas[0]));
  }
  const acBtn = $('#ajuda-btn');
  acBtn.addEventListener('click', () => {
    const abre = acBtn.getAttribute('aria-expanded') !== 'true';
    acBtn.setAttribute('aria-expanded', String(abre));
    $('#acc-ajuda').classList.toggle('aberto', abre);
  });
  function ligarAjudas() {
    const lig = (sel, chave) => $(sel).addEventListener('click', (ev) => {
      const b = ev.target.closest('.seg-btn'); if (!b) return;
      prefs[chave] = b.dataset.v; gravarPrefs(); ON.som('toque');
      if (S) { pintar(); if (chave === 'vel' || chave === 'auto') avancar(); }
    });
    lig('#op-vel', 'vel'); lig('#op-esperas', 'esperas'); lig('#op-auto', 'auto');
  }

  document.addEventListener('visibilitychange', () => { if (document.hidden) gravar(); });
  window.addEventListener('pagehide', gravar);
  document.addEventListener('keydown', (ev) => {
    if (!S || ON.modal.aberto() || U.tela) return;
    const t = ev.target;
    if (t && t.closest && t.closest('input,textarea,select,[role="dialog"]')) return;
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const k = ev.key.toLowerCase();
    if (k === 'y') { ON.modal.abrir('yaku-modal'); ev.preventDefault(); }
    else if (k === 'escape' && U.sel !== null) { U.sel = null; desenharMao(); desenharAcao(); }
  });

  /* ==========================================================================
     7. Início
     ========================================================================== */
  ON.init({
    id: 'mahjongon',
    nome: 'MahjongON!',
    configuracoes: ['som', 'vibracao', 'escuro', 'reduzir'],
    estatisticas,
    zerarEstatisticas: () => { sdel(LS.stats); },
    pronto: () => {
      $('#modo-chevron').innerHTML = ON.icone('chevron', 16);
      $('#ajuda-chevron').innerHTML = ON.icone('chevron', 18);
      $('#modo-mini').innerHTML = '<span class="pc" style="--w:30px;margin:2px 8px">' + SVG('t-z7') + '</span>';
      montarAjuda();
      ligarAbas();
      ligarAjudas();
      U = novoU();
      S = null;
      if (!restaurar()) novaPartida(opcoesAtuais());
      ajustar();
      pintar();
      if (!ON.store.get(LS.visto, false)) {
        ON.store.set(LS.visto, true);
        setTimeout(() => ON.modal.abrir('howto-modal'), 400);
      }
    }
  });
})();
