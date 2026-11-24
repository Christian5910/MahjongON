const { chromium } = require('playwright');
(async () => {
  const [,, w, h, out, js] = process.argv;
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const erros = [];
  p.on('pageerror', e => erros.push('PAGEERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') erros.push('CONSOLE ' + m.text()); });
  await p.addInitScript(() => { try { localStorage.setItem('mahjongon.visto', 'true'); } catch (e) {} });
  await p.goto('http://localhost:8123/index.html');
  await p.waitForTimeout(1500);
  if (js) { await p.evaluate(js); await p.waitForTimeout(600); }
  await p.screenshot({ path: out, fullPage: true });
  console.log(erros.join('\n') || 'sem erros');
  await b.close();
})();
