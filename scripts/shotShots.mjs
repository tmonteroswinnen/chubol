/**
 * Plays one real shot and captures the moments that matter: holding the ball,
 * winding up, the ball in the air, and the instant after it goes in.
 */
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync } from 'node:fs';

const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
mkdirSync('screenshots/tiro', { recursive: true });

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto('http://localhost:4173/', { waitUntil: 'load' });
await page.waitForFunction(() => Boolean(window.__chubol?.game?.scene?.isActive('Menu')), null, { timeout: 30000 });

await page.evaluate(() => {
  const m = window.__chubol.game.scene;
  for (const s of m.getScenes(true)) if (s.scene.key !== 'Game') m.stop(s.scene.key);
  m.start('Game', { mode: 'practice' });
});
await page.waitForFunction(() => Boolean(window.__chubol.game.scene.isActive('Game')), null, { timeout: 30000 });
await page.waitForTimeout(600);

const go = (mark) =>
  page.evaluate((m) => {
    const g = window.__chubol.game.scene.getScene('Game');
    g.walkTarget = { x: m[0], y: m[1] };
  }, mark);

const state = () => page.evaluate(() => {
  const g = window.__chubol.game.scene.getScene('Game');
  return { phase: g.phase, x: +g.shooter.x.toFixed(2), y: +g.shooter.y.toFixed(2) };
});

// Walk out to the 6 so the friend is seen at a normal distance, and catch the
// walk itself.
await go([4.15, -2.31]);
await page.waitForTimeout(700);
await page.screenshot({ path: 'screenshots/tiro/1-caminando.png' });
await page.waitForFunction(
  () => {
    const g = window.__chubol.game.scene.getScene('Game');
    return g.walkTarget === null;
  },
  null,
  { timeout: 20000 },
);
await page.waitForTimeout(300);
await page.screenshot({ path: 'screenshots/tiro/2-con-la-pelota.png' });

// Charge and let go inside the band.
await page.evaluate(() => {
  const g = window.__chubol.game.scene.getScene('Game');
  g.startCharge();
});
await page.waitForTimeout(500);
await page.screenshot({ path: 'screenshots/tiro/3-cargando.png' });
await page.evaluate(() => {
  const g = window.__chubol.game.scene.getScene('Game');
  // Land squarely inside the band, so the shot goes in and we see the net.
  const centre = (g.profile.window.low + g.profile.window.high) / 2;
  g.chargeElapsed = centre * 950;
  g.release();
});
await page.waitForTimeout(260);
await page.screenshot({ path: 'screenshots/tiro/4-en-el-aire.png' });
await page.waitForFunction(
  () => window.__chubol.game.scene.getScene('Game').phase === 'retrieving',
  null,
  { timeout: 20000 },
);
await page.screenshot({ path: 'screenshots/tiro/5-entro.png' });
await page.waitForTimeout(420);
await page.screenshot({ path: 'screenshots/tiro/6-cayendo.png' });

console.log('estado final', JSON.stringify(await state()));
await browser.close();
