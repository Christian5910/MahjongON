/* joga uma partida inteira pela tela (cliques de verdade) e confere que nada quebra */
const { chromium } = require('playwright');
(async () => {
  const [,, w, h, fim] = process.argv;
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: +(w||390), height: +(h||800) }, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const erros = [];
  p.on('pageerror', e => erros.push('PAGEERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/404|vibrate/.test(m.text())) erros.push('CONSOLE ' + m.text()); });
  await p.addInitScript((f) => { try { localStorage.setItem('mahjongon.visto', 'true'); localStorage.setItem('mahjongon.prefs', JSON.stringify({ fim: f, aka: true, nivel: 3, vel: 'rapido', esperas: 'sim', auto: 'sim' })); } catch (e) {} }, fim || 'tonpuusen');
  await p.goto('http://localhost:8123/index.html');
  await p.waitForTimeout(800);
  const t0 = Date.now(); const fotos = {}; let passos = 0, maos = 0, fimFeito = false;
  while (Date.now() - t0 < 240000 && !fimFeito) {
    passos++;
    if (!fotos.barra && await p.$('.barra')) { fotos.barra = 1; await p.screenshot({ path: '/tmp/claude-0/shots/barra.png', fullPage: true }); }
    if (!fotos.rio && await p.evaluate(() => document.querySelectorAll('#rio-0 .pc').length >= 11)) { fotos.rio = 1; await p.screenshot({ path: '/tmp/claude-0/shots/rio.png', fullPage: true }); }
    if (!fotos.res && await p.evaluate(() => !document.querySelector('#tela').hidden && /venceu|Vencida|Vencida|pagou/.test(document.querySelector('#tela-titulo').textContent))) { fotos.res = 1; await p.waitForTimeout(700); await p.screenshot({ path: '/tmp/claude-0/shots/res.png', fullPage: true }); }
    const r = await p.evaluate(() => {
      const q = (s) => document.querySelector(s);
      const tela = q('#tela');
      if (!tela.hidden) {
        const t = q('#tela-titulo').textContent, b = q('#tela-btn');
        const eFim = /Nova partida/.test(b.textContent);
        b.click();
        return { tela: t, fim: eFim };
      }
      const ron = [...document.querySelectorAll('#painel-acao .btn')].find(x => /^Ron|^Tsumo/.test(x.textContent.trim()));
      if (ron) { ron.click(); return { clique: ron.textContent.trim() }; }
      const rii = [...document.querySelectorAll('#painel-acao .btn')].find(x => /^Riichi/.test(x.textContent.trim()));
      const pass = [...document.querySelectorAll('#painel-acao .btn-passar')][0];
      if (pass) { pass.click(); return { clique: 'passar' }; }
      const verRes = [...document.querySelectorAll('#painel-acao .btn')].find(x => /Ver o resultado/.test(x.textContent));
      if (verRes) { verRes.click(); return { clique: 'ver' }; }
      const tiles = [...document.querySelectorAll('#mao-fila .pc')].filter(x => !x.classList.contains('nao') && !x.classList.contains('passiva'));
      if (tiles.length) {
        if (rii && Math.random() < 0.7 && !document.querySelector('#painel-acao .btn.ligado')) { rii.click(); return { clique: 'riichi' }; }
        const alvo = tiles[tiles.length - 1];
        const sel = tiles.find(x => x.classList.contains('sel'));
        (sel || alvo).click();
        if (!sel) return { clique: 'sel' };
        return { clique: 'descartar' };
      }
      return { espera: 1 };
    });
    if (r.tela) { if (/Você venceu a partida|lugar/.test(r.tela) && r.fim) { fimFeito = true; } else maos++; }
    await p.waitForTimeout(r.espera ? 120 : 30);
  }
  const st = await p.evaluate(() => localStorage.getItem('mahjongon.stats'));
  console.log('passos', passos, 'mãos', maos, 'fim', fimFeito, 'stats', st);
  await p.screenshot({ path: '/tmp/claude-0/shots/jogo-fim.png', fullPage: true });
  console.log(erros.join('\n') || 'sem erros');
  await b.close();
})();
