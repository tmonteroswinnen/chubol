/** Captures every panel of the interface at phone size, to check the layout. */
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync } from 'node:fs';

const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
mkdirSync('screenshots/ui', { recursive: true });

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});
const ctx = await browser.newContext({
  viewport: { width: 740, height: 360 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto('http://localhost:4173/', { waitUntil: 'load' });
await page.waitForFunction(() => Boolean(window.__chubol?.game?.scene?.isActive('Menu')), null, { timeout: 30000 });
await page.waitForTimeout(500);
await page.screenshot({ path: 'screenshots/ui/1-menu.png' });

await page.evaluate(() => window.__chubol.game.scene.getScene('Menu').showRules());
await page.waitForTimeout(400);
await page.screenshot({ path: 'screenshots/ui/2-reglas.png' });

await page.evaluate(() => {
  const s = window.__chubol.game.scene.getScene('Menu');
  s.closeOverlay();
  s.showPairPicker();
});
await page.waitForTimeout(400);
await page.screenshot({ path: 'screenshots/ui/3-elegir-pareja.png' });

// Straight into a match: the turn card comes up first.
await page.evaluate(() => {
  const m = window.__chubol.game.scene;
  for (const s of m.getScenes(true)) if (s.scene.key !== 'Game') m.stop(s.scene.key);
  m.start('Game', {
    mode: 'challenge',
    humanTeam: 0,
    teams: [
      { name: 'Bocha y Farico', members: ['Bocha', 'Farico'] },
      { name: 'Agus y Facu', members: ['Agus', 'Facu'] },
    ],
  });
});
await page.waitForFunction(() => window.__chubol.game.scene.isActive('Game'), null, { timeout: 30000 });
await page.waitForTimeout(500);
await page.screenshot({ path: 'screenshots/ui/4-te-toca.png' });

await page.waitForFunction(
  () => window.__chubol.game.scene.getScene('Game').phase === 'positioning',
  null,
  { timeout: 20000 },
);
await page.evaluate(() => window.__chubol.game.scene.getScene('Game').togglePause());
await page.waitForTimeout(400);
await page.screenshot({ path: 'screenshots/ui/5-pausa.png' });

// And the final screen.
await page.evaluate(() => {
  const m = window.__chubol.game.scene;
  for (const s of m.getScenes(true)) m.stop(s.scene.key);
  m.start('Result', {
    humanTeam: 0,
    config: {
      teams: [
        { name: 'Bocha y Farico', members: ['Bocha', 'Farico'] },
        { name: 'Agus y Facu', members: ['Agus', 'Facu'] },
      ],
      turnMs: 60000,
      tiebreakMs: 30000,
      tiebreak: 'extra',
      maxTiebreakRounds: 3,
    },
    result: {
      shared: false,
      winners: [{ teamIndex: 0, name: 'Bocha y Farico', members: ['Bocha', 'Farico'], score: 34, attempts: 12, makes: 7, laps: 1 }],
      standings: [
        { teamIndex: 0, name: 'Bocha y Farico', members: ['Bocha', 'Farico'], score: 34, attempts: 12, makes: 7, laps: 1 },
        { teamIndex: 1, name: 'Agus y Facu', members: ['Agus', 'Facu'], score: 27, attempts: 13, makes: 6, laps: 1 },
      ],
    },
  });
});
await page.waitForFunction(() => window.__chubol.game.scene.isActive('Result'), null, { timeout: 20000 });
await page.waitForTimeout(700);
await page.screenshot({ path: 'screenshots/ui/6-resultado.png' });

console.log('capturas listas');
await browser.close();
