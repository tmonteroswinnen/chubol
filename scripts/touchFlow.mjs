/**
 * Plays a full shot with nothing but a finger: tap a mark, walk, hold the shoot
 * button, release inside the band, then tap the ball to fetch it.
 *
 * Uses real touch events through CDP, not mouse events, so this proves the game
 * works with a finger and not merely with a pointer in a small window.
 */
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => existsSync(p));
const outDir = resolve('screenshots/mobile');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'] });
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
const problems = [];
page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()); });
page.on('pageerror', (e) => problems.push(String(e.message)));

const touch = (type, x, y) =>
  cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: type === 'touchEnd' ? [] : [{ x, y, radiusX: 12, radiusY: 12, force: 1 }],
  });
const tap = async (x, y) => { await touch('touchStart', x, y); await page.waitForTimeout(40); await touch('touchEnd', x, y); };

await page.goto('http://localhost:4173/', { waitUntil: 'load' });
await page.waitForFunction(() => Boolean(window.__chubol?.game?.scene?.isActive('Menu')), null, { timeout: 30000 });
await page.waitForTimeout(500);

/** Turns a point in game coordinates into a screen point to touch. */
const toScreen = (gx, gy) => page.evaluate(({ gx, gy }) => {
  const game = window.__chubol.game;
  const r = game.canvas.getBoundingClientRect();
  return { x: r.left + (gx / game.scale.width) * r.width, y: r.top + (gy / game.scale.height) * r.height };
}, { gx, gy });

// 1. Start practice by tapping the menu button, like a player would.
const menu = await page.evaluate(() => {
  const s = window.__chubol.game.scene.getScene('Menu');
  const c = s.children.list.find((o) => o.type === 'Container' && o.list?.some((k) => k.text === 'PRÁCTICA LIBRE'));
  return c ? { x: c.x, y: c.y } : null;
});
if (!menu) throw new Error('no encontre el boton de practica');
const menuAt = await toScreen(menu.x, menu.y);
await tap(menuAt.x, menuAt.y);
await page.waitForFunction(() => Boolean(window.__chubol?.game?.scene?.isActive('Game')), null, { timeout: 30000 });
await page.waitForTimeout(600);
console.log('1. empezar a jugar tocando el menu ......... OK');

const state = () => page.evaluate(() => {
  const g = window.__chubol.game.scene.getScene('Game');
  return { phase: g.phase, x: Number(g.shooter.x.toFixed(2)), y: Number(g.shooter.y.toFixed(2)) };
});
const artPoint = (wx, wy) => page.evaluate(({ wx, wy }) => {
  const g = window.__chubol.game.scene.getScene('Game');
  const at = g.view.projection.project(wx, wy, 0);
  return { x: at.x + 192, y: at.y };
}, { wx, wy });

// 2. Tap the 5 mark and walk there.
const five = await artPoint(3.59, -0.01);
const fiveAt = await toScreen(five.x, five.y);
await tap(fiveAt.x, fiveAt.y);
await page.waitForTimeout(1900);
const walked = await state();
const arrived = Math.hypot(walked.x - 3.59, walked.y + 0.01) < 0.15;
console.log(`2. tocar la marca de 5 y caminar ........... ${arrived ? 'OK' : 'FALLA'}  (quedo en ${walked.x}, ${walked.y})`);
await page.screenshot({ path: resolve(outDir, 'flujo-1-camino-a-la-marca.png') });

// 3. Hold the shoot button and release inside the green band.
const button = await toScreen(1824, 860);
await touch('touchStart', button.x, button.y);
await page.waitForTimeout(400);
const charging = await state();
await page.screenshot({ path: resolve(outDir, 'flujo-2-cargando.png') });
await page.waitForTimeout(284);
await touch('touchEnd', button.x, button.y);
await page.waitForTimeout(400);
const shot = await state();
console.log(`3. mantener TIRAR y soltar ................. ${charging.phase === 'charging' ? 'OK carga' : 'FALLA carga'}, ${shot.phase === 'flight' || shot.phase === 'retrieving' ? 'OK tira' : 'FALLA tiro'}`);
await page.screenshot({ path: resolve(outDir, 'flujo-3-tiro.png') });

// 4. Wait for the ball to settle, then tap it to go and fetch it.
await page.waitForFunction(() => window.__chubol.game.scene.getScene('Game').phase === 'retrieving', null, { timeout: 15000 });
await page.waitForTimeout(800);
await page.screenshot({ path: resolve(outDir, 'flujo-4-a-buscar-la-pelota.png') });
const rest = await page.evaluate(() => {
  const g = window.__chubol.game.scene.getScene('Game');
  return { x: g.ballRest.x, y: g.ballRest.y };
});
const ball = await artPoint(rest.x, rest.y);
const ballAt = await toScreen(ball.x, ball.y);
await tap(ballAt.x, ballAt.y);
await page.waitForTimeout(3200);
const fetched = await state();
console.log(`4. tocar la pelota y recuperarla ........... ${fetched.phase === 'positioning' ? 'OK' : `FALLA (${fetched.phase})`}`);
await page.screenshot({ path: resolve(outDir, 'flujo-5-recuperada.png') });

// 5. Pause with the corner button.
const pauseAt = await toScreen(1824, 64);
await tap(pauseAt.x, pauseAt.y);
await page.waitForTimeout(350);
const paused = await page.evaluate(() => window.__chubol.game.scene.getScene('Game').paused);
console.log(`5. pausa con el boton de la esquina ........ ${paused ? 'OK' : 'FALLA'}`);
await page.screenshot({ path: resolve(outDir, 'flujo-6-pausa.png') });

await browser.close();
console.log(problems.length ? `\nERRORES DE CONSOLA: ${[...new Set(problems)].join(' | ')}` : '\nsin errores de consola');
