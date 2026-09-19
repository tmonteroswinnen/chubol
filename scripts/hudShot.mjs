/**
 * Captures the match HUD at phone sizes and measures how big each piece of text
 * really lands in CSS pixels, which is the only number that decides whether it
 * can be read.
 */
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync } from 'node:fs';

const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
mkdirSync('screenshots/hud', { recursive: true });

const SIZES = [
  { name: 'iphone-13', width: 844, height: 390 },
  { name: 'chico', width: 740, height: 360 },
  { name: 'escritorio', width: 1280, height: 720 },
];

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});

for (const size of SIZES) {
  const phone = size.name !== 'escritorio';
  const ctx = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: phone ? 3 : 2,
    isMobile: phone,
    hasTouch: phone,
  });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4173/', { waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.__chubol?.game?.scene?.isActive('Menu')), null, { timeout: 30000 });
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
  await page.waitForFunction(() => Boolean(window.__chubol.game.scene.isActive('Game')), null, { timeout: 30000 });
  // Put it on a mark and start a charge, so the bar is on screen too.
  await page.evaluate(() => {
    const g = window.__chubol.game.scene.getScene('Game');
    g.shooter.x = 4.15;
    g.shooter.y = -2.31;
    g.walkTarget = null;
    g.match.resolveShot(g.match.beginShot('p2', 2).shotId, true);
    g.match.resolveShot(g.match.beginShot('p3', 3).shotId, false);
    g.startCharge();
    g.chargeElapsed = 60;
    g.refreshHud();
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `screenshots/hud/${size.name}.png` });

  const measured = await page.evaluate(() => {
    const game = window.__chubol.game;
    const factor = game.canvas.getBoundingClientRect().width / game.scale.width;
    const out = [];
    const walk = (list, sx) => {
      for (const o of list) {
        const scale = sx * (o.scaleX ?? 1);
        if (o.type === 'Text' && String(o.text).trim()) {
          out.push({
            texto: String(o.text).split('\n')[0].slice(0, 22),
            css: +(parseFloat(o.style.fontSize) * scale * factor).toFixed(1),
          });
        }
        if (o.list) walk(o.list, scale);
      }
    };
    for (const scene of game.scene.getScenes(true)) walk(scene.children.list, 1);
    return { factor: +factor.toFixed(4), out };
  });
  measured.out.sort((a, b) => a.css - b.css);
  console.log(`\n== ${size.name} (${size.width}x${size.height})  escala ${measured.factor}`);
  for (const m of measured.out) console.log(`  ${String(m.css).padStart(5)} px CSS  ${m.texto}`);
  const ilegibles = measured.out.filter((m) => m.css < 12);
  console.log(`  -> por debajo de 12 px CSS: ${ilegibles.length}`);
  await ctx.close();
}

await browser.close();
