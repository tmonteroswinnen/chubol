/**
 * Serves the built site from a subfolder and checks it still works.
 *
 * GitHub Pages puts a project site at /<repo>/ rather than at the root, and a
 * game whose paths are absolute simply shows a black screen there. It also
 * checks that the service worker registers under that scope, because that is
 * what makes it installable and playable with no connection.
 */
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const ROOT = resolve('dist');
const PREFIX = '/chubol/';
const PORT = 4188;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.wav': 'audio/wav',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
};

const server = createServer((req, res) => {
  const url = (req.url ?? '/').split('?')[0];
  if (!url.startsWith(PREFIX)) {
    res.statusCode = 404;
    res.end('fuera del prefijo');
    return;
  }
  let rel = url.slice(PREFIX.length);
  if (rel === '' || rel.endsWith('/')) rel += 'index.html';
  const file = join(ROOT, normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!existsSync(file) || !statSync(file).isFile()) {
    res.statusCode = 404;
    res.end('no existe');
    return;
  }
  res.setHeader('Content-Type', TYPES[extname(file)] ?? 'application/octet-stream');
  // A host that varies on Origin is the common case, and it is what broke the
  // offline cache once already.
  res.setHeader('Vary', 'Origin');
  createReadStream(file).pipe(res);
});
await new Promise((done) => server.listen(PORT, done));

const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const problems = [];
page.on('pageerror', (e) => problems.push(String(e.message)));
page.on('requestfailed', (r) => problems.push(`no cargó ${r.url()}`));
page.on('response', (r) => {
  if (r.status() >= 400) problems.push(`HTTP ${r.status()} en ${r.url()}`);
});

let failures = 0;
const check = (name, ok, detail) => {
  console.log(`${ok ? 'OK  ' : 'FALLA'}  ${name}${detail ? '   ' + detail : ''}`);
  if (!ok) failures += 1;
};

const base = `http://localhost:${PORT}${PREFIX}`;
await page.goto(base, { waitUntil: 'load' });
await page.waitForFunction(() => Boolean(window.__chubol?.game?.scene?.isActive('Menu')), null, { timeout: 30000 });
check('el juego arranca servido desde una subcarpeta', true, base);

// The artwork has to be there, not just the code.
const art = await page.evaluate(() => {
  const t = window.__chubol.game.textures;
  return ['court-plate', 'court-foreground', 'hoop-front'].map((k) => ({ k, ok: t.exists(k) }));
});
check('carga la lámina y sus capas', art.every((a) => a.ok), art.map((a) => `${a.k}:${a.ok ? 'sí' : 'NO'}`).join(' '));

// And a real match has to run.
await page.evaluate(() => {
  const m = window.__chubol.game.scene;
  for (const s of m.getScenes(true)) if (s.scene.key !== 'Game') m.stop(s.scene.key);
  m.start('Game', { mode: 'practice' });
});
await page.waitForFunction(() => window.__chubol.game.scene.isActive('Game'), null, { timeout: 30000 });
await page.waitForTimeout(800);
check('se puede entrar a jugar', true);

// In the published build the reference images are not there, so the comparison
// screen takes its other branch. It still has to be possible to get out of it.
await page.evaluate(() => {
  const m = window.__chubol.game.scene;
  for (const s of m.getScenes(true)) m.stop(s.scene.key);
  m.start('Compare');
});
await page.waitForFunction(() => window.__chubol.game.scene.isActive('Compare'), null, { timeout: 20000 });
await page.waitForTimeout(500);
const salida = await page.evaluate(() => {
  const s = window.__chubol.game.scene.getScene('Compare');
  const found = [];
  const walk = (list) => {
    for (const o of list) {
      if (o.type === 'Text' && String(o.text).includes('VOLVER')) found.push(true);
      if (o.list) walk(o.list);
    }
  };
  walk(s.children.list);
  return found.length > 0;
});
check('la comparación visual tiene salida sin referencias', salida);
await page.evaluate(() => {
  const m = window.__chubol.game.scene;
  for (const s of m.getScenes(true)) m.stop(s.scene.key);
  m.start('Menu');
});
await page.waitForFunction(() => window.__chubol.game.scene.isActive('Menu'), null, { timeout: 20000 });

// The service worker is what makes it installable and playable offline.
const sw = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? { scope: reg.scope, active: Boolean(reg.active || reg.installing || reg.waiting) } : null;
});
check('registra el service worker bajo la subcarpeta', sw !== null && sw.scope.endsWith(PREFIX), JSON.stringify(sw));

// Now with no connection at all.
await page.waitForTimeout(2500);
await page.context().setOffline(true);
await page.reload({ waitUntil: 'load' });
const offline = await page
  .waitForFunction(() => Boolean(window.__chubol?.game?.scene?.isActive('Menu')), null, { timeout: 20000 })
  .then(() => true)
  .catch(() => false);
check('arranca sin conexión', offline);
await page.context().setOffline(false);

console.log('');
const real = problems.filter((p) => !p.includes('favicon'));
console.log(real.length === 0 ? 'sin errores de red ni de consola' : `problemas: ${real.slice(0, 6).join(' | ')}`);
console.log(failures === 0 && real.length === 0 ? 'TODO BIEN' : `${failures} fallas`);
await browser.close();
server.close();
process.exit(failures === 0 && real.length === 0 ? 0 : 1);
