/** Captures the game at phone viewports, to see what actually breaks. */
import { chromium, devices } from 'playwright-core';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => existsSync(p));

const outDir = resolve('screenshots/mobile');
mkdirSync(outDir, { recursive: true });

const VIEWPORTS = [
  ['iphone-14-landscape', 844, 390, 3],
  ['iphone-14-portrait', 390, 844, 3],
  ['pixel-7-landscape', 915, 412, 2.6],
  ['ipad-landscape', 1180, 820, 2],
];

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});

for (const [name, width, height, dpr] of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: dpr,
    isMobile: true,
    hasTouch: true,
    userAgent: devices['iPhone 13']?.userAgent,
  });
  const page = await context.newPage();
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()); });
  page.on('pageerror', (e) => problems.push(String(e.message)));

  await page.goto('http://localhost:4173/', { waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.__chubol?.game?.scene?.isActive('Menu')), null, { timeout: 30000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(outDir, `${name}-menu.png`) });

  await page.evaluate(() => {
    const m = window.__chubol.game.scene;
    for (const s of m.getScenes(true)) if (s.scene.key !== 'Game') m.stop(s.scene.key);
    m.start('Game', { mode: 'practice', teams: [
      { name: 'Pareja 1', members: ['A', 'B'] }, { name: 'Pareja 2', members: ['C', 'D'] }] });
  });
  await page.waitForFunction(() => Boolean(window.__chubol?.game?.scene?.isActive('Game')), null, { timeout: 30000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: resolve(outDir, `${name}-juego.png`) });

  // What the canvas actually ends up as, and how much of the screen it uses.
  const info = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    return {
      cssW: Math.round(r.width), cssH: Math.round(r.height),
      bufW: c.width, bufH: c.height,
      screenW: window.innerWidth, screenH: window.innerHeight,
      coverage: Math.round((r.width * r.height) / (window.innerWidth * window.innerHeight) * 100),
    };
  });
  console.log(`${name.padEnd(22)} viewport ${width}x${height}@${dpr}  canvas css ${info.cssW}x${info.cssH} buffer ${info.bufW}x${info.bufH}  cubre ${info.coverage}% de la pantalla` +
    (problems.length ? `  ERRORES: ${problems.length}` : ''));
  for (const p of [...new Set(problems)].slice(0, 3)) console.log('    ' + p);
  await context.close();
}

await browser.close();
