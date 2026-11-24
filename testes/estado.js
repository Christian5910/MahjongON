const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [,, json, w, h, out, clicar, tema] = process.argv;
  const st = fs.readFileSync(json, 'utf8');
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: +w, height: +h }, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const erros = [];
  p.on('pageerror', e => erros.push('PAGEERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/404|vibrate/.test(m.text())) erros.push('CONSOLE ' + m.text()); });
  await p.addInitScript(([s, t]) => { try { localStorage.setItem('mahjongon.visto', 'true'); localStorage.setItem('mahjongon.jogo', s); localStorage.setItem('mahjongon.prefs', JSON.stringify({ vel: 'lento' })); if (t) localStorage.setItem('mahjongon.cfg', JSON.stringify({ tema: t })); } catch (e) {} }, [st, tema || '']);
  await p.goto('http://localhost:8123/index.html');
  await p.waitForTimeout(700);
  await p.click('#tela-btn');
  await p.waitForTimeout(500);
  if (clicar) { for (const sel of clicar.split('|')) { await p.click(sel); await p.waitForTimeout(250); } }
  const ov = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  await p.screenshot({ path: out, fullPage: !process.env.VP });
  console.log('overflowX', ov.sw > ov.cw ? 'SIM ' + ov.sw + '>' + ov.cw : 'não', erros.join('\n') || 'sem erros');
  await b.close();
})();
