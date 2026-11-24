const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 } });
  const p = await ctx.newPage();
  const er = []; p.on('pageerror', e => er.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('mahjongon.visto', 'true'); } catch (e) {} });
  await p.goto('http://localhost:8123/index.html');
  await p.evaluate(() => navigator.serviceWorker.ready);
  await p.waitForTimeout(2500);
  const chaves = await p.evaluate(async () => { const c = await caches.keys(); const k = await (await caches.open(c[0])).keys(); return [c[0], k.length]; });
  await ctx.setOffline(true);
  await p.reload(); await p.waitForTimeout(1500);
  const t = await p.evaluate(() => ({ rios: document.querySelectorAll('.pc').length, svg: !!document.querySelector('#mao-fila svg use'), titulo: document.title }));
  // a sprite precisa ter carregado: o <use> externo desenha algo
  const box = await p.evaluate(() => { const u = document.querySelector('#mao-fila .pc svg'); const r = u.getBoundingClientRect(); return [r.width, r.height]; });
  console.log('cache', chaves, 'offline', t, box, er.join('|') || 'sem erros');
  await b.close();
})();
