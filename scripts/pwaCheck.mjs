/** Checks the game really installs and really works with no connection. */
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));

const browser = await chromium.launch({ executablePath: CHROME,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
let page = await ctx.newPage();
await page.goto('http://localhost:4173/', { waitUntil: 'load' });

const manifest = await page.evaluate(async () => {
  const link = document.querySelector('link[rel=manifest]');
  const res = await fetch(link.href);
  return { status: res.status, body: await res.json() };
});
console.log('manifest:', manifest.status, '|', manifest.body.name, '|', manifest.body.display, '|',
  manifest.body.orientation, '|', manifest.body.icons.length, 'iconos');

// Wait until the worker is actually CONTROLLING the page, not merely registered:
// until then a reload still goes straight to the network.
await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 20000 });
const sw = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.ready;
  const keys = await caches.keys();
  const cache = await caches.open(keys[0]);
  const entries = await cache.keys();
  return { scope: reg.scope, active: Boolean(reg.active), caches: keys, cached: entries.length };
});
console.log('service worker: activo =', sw.active, '| cache =', sw.caches.join(','), '|', sw.cached, 'archivos guardados');

console.log('archivos en cache:');
console.log((await page.evaluate(async () => {
  const keys = await caches.keys();
  const cache = await caches.open(keys[0]);
  return (await cache.keys()).map((r) => r.url);
})).map((u) => '   ' + u).join(String.fromCharCode(10)));

page.on('requestfailed', (r) => console.log('   request fallida:', r.url().slice(0, 90), r.failure()?.errorText));
page.on('console', (m) => { if (m.type() === 'error') console.log('   consola:', m.text().slice(0, 140)); });

// Now cut the connection entirely and start the game again, the way someone
// would open the installed app with no signal.
await ctx.setOffline(true);
await page.waitForTimeout(500);
// Open the app again, the way relaunching an installed icon does, rather than
// reloading the existing tab.
const second = await ctx.newPage();
second.on('requestfailed', (r) => console.log('   request fallida:', r.url().slice(0, 90), r.failure()?.errorText));
second.on('console', (m) => { if (m.type() === 'error') console.log('   consola:', m.text().slice(0, 140)); });
await second.goto('http://localhost:4173/', { waitUntil: 'load' }).catch((e) => console.log('   goto:', e.message.slice(0, 80)));
const offline = await second
  .waitForFunction(() => Boolean(window.__chubol?.game?.scene?.isActive('Menu')), null, { timeout: 25000 })
  .then(() => true)
  .catch(() => false);
console.log(`sin conexion, abriendo de nuevo: el juego arranca = ${offline ? 'SI' : 'NO'}`);
console.log('   controlado por el worker:', await second.evaluate(() => navigator.serviceWorker.controller !== null));
console.log('   workers del contexto:', ctx.serviceWorkers().length);
if (offline) await second.screenshot({ path: 'screenshots/mobile/sin-conexion.png' });
page = second;

console.log('diagnostico offline:', await page.evaluate(async () => {
  const controlled = navigator.serviceWorker.controller !== null;
  let hit = null;
  try {
    const r = await caches.match(new URL('assets/index-Ccod3tLq.js', location.href).href);
    hit = r ? r.status + ' ' + r.type : 'sin coincidencia';
  } catch (e) { hit = 'error ' + e.message; }
  const probe = async (init) => {
    try {
      const r = await fetch('assets/index-Ccod3tLq.js', init);
      return r.status + ' ' + r.type;
    } catch (e) { return 'falla: ' + e.message; }
  };
  return {
    controlado: controlled,
    cacheMatch: hit,
    fetchNormal: await probe(undefined),
    fetchCors: await probe({ mode: 'cors', credentials: 'omit' }),
  };
}));

await browser.close();
