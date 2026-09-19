/**
 * Two things that cannot be checked from a unit test and that both went wrong.
 *
 * 1. Where the buttons actually respond. Phaser adds the display origin to the
 *    local point before testing the hit area, so the obvious way of writing a
 *    centred rectangle lands the sensitive area half a button up and to the
 *    left: the bottom and the right of the circle you can see do nothing, and
 *    the grass beside it fires the shot. The exact centre still works, which is
 *    why every automated tap passed while a thumb on the button did not.
 *
 * 2. The buzzer landing on the frame the machine lets go of its shot. The clock
 *    is ticked at the top of the frame and the turn was only closed at the
 *    bottom, so in between the machine could call beginShot with the minute
 *    already at zero — which throws out of the animation callback and stops the
 *    game loop from ever being scheduled again.
 */
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';

const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const problems = [];
page.on('pageerror', (e) => problems.push(String(e.message)));
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(m.text());
});

let failures = 0;
const check = (name, ok, detail) => {
  console.log(`${ok ? 'OK  ' : 'FALLA'}  ${name}${detail ? '   ' + detail : ''}`);
  if (!ok) failures += 1;
};

await page.goto('http://localhost:4173/', { waitUntil: 'load' });
await page.waitForFunction(() => Boolean(window.__chubol?.game?.scene?.isActive('Menu')), null, { timeout: 30000 });

// ---- 1. the hit area of the shoot button ----
await page.evaluate(() => {
  const m = window.__chubol.game.scene;
  for (const s of m.getScenes(true)) if (s.scene.key !== 'Game') m.stop(s.scene.key);
  m.start('Game', { mode: 'practice' });
});
await page.waitForFunction(() => window.__chubol.game.scene.isActive('Game'), null, { timeout: 30000 });
await page.waitForTimeout(700);

const geom = await page.evaluate(() => {
  const g = window.__chubol.game.scene.getScene('Game');
  const c = g.shootButton.container;
  const game = window.__chubol.game;
  const r = game.canvas.getBoundingClientRect();
  return {
    centre: { x: c.x, y: c.y },
    radius: c.width / 2,
    left: r.left,
    top: r.top,
    sx: r.width / game.scale.width,
    sy: r.height / game.scale.height,
  };
});

const stand = () =>
  page.evaluate(() => {
    const g = window.__chubol.game.scene.getScene('Game');
    g.shooter.x = 4.15;
    g.shooter.y = -2.31;
    g.walkTarget = null;
    g.phase = 'positioning';
    g.refreshShootButton();
  });

const press = async (gx, gy) => {
  await stand();
  await page.mouse.move(geom.left + gx * geom.sx, geom.top + gy * geom.sy);
  await page.mouse.down();
  await page.waitForTimeout(30);
  const fired = await page.evaluate(() => {
    const g = window.__chubol.game.scene.getScene('Game');
    const charging = g.phase === 'charging';
    // Drop the charge before lifting the button, so the probe never actually
    // takes a shot and the next probe starts from a clean state.
    g.cancelCharge();
    return charging;
  });
  await page.mouse.up();
  await page.waitForTimeout(20);
  return fired;
};

// Inside the drawn circle it must fire; well outside it must not.
const inside = [
  [0, 0],
  [geom.radius * 0.6, 0],
  [-geom.radius * 0.6, 0],
  [0, geom.radius * 0.6],
  [0, -geom.radius * 0.6],
];
const outside = [
  [geom.radius * 2.2, 0],
  [-geom.radius * 2.2, 0],
  [0, geom.radius * 2.2],
  [0, -geom.radius * 2.2],
];
let insideOk = 0;
for (const [dx, dy] of inside) if (await press(geom.centre.x + dx, geom.centre.y + dy)) insideOk += 1;
let outsideOk = 0;
for (const [dx, dy] of outside) if (!(await press(geom.centre.x + dx, geom.centre.y + dy))) outsideOk += 1;

check('el botón responde en todo el dibujo', insideOk === inside.length, `${insideOk} de ${inside.length}`);
check('y no responde lejos del dibujo', outsideOk === outside.length, `${outsideOk} de ${outside.length}`);

// ---- 2. the buzzer on the frame the machine shoots ----
await page.evaluate(() => {
  const m = window.__chubol.game.scene;
  for (const s of m.getScenes(true)) m.stop(s.scene.key);
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
await page.waitForFunction(() => window.__chubol.game.scene.getScene('Game').phase === 'positioning', null, {
  timeout: 30000,
});
// Skip the person's minute and wait for the machine to be mid-charge.
await page.evaluate(() => window.__chubol.game.scene.getScene('Game').match.tick(59_500));
await page.waitForFunction(
  () => {
    const g = window.__chubol.game.scene.getScene('Game');
    return g.match.currentTeamIndex !== g.humanTeam && g.phase === 'charging';
  },
  null,
  { timeout: 30000 },
);
// Drop the clock to zero while the machine is holding the shot.
await page.evaluate(() => window.__chubol.game.scene.getScene('Game').match.tick(999_999));

// The loop has to keep running.
const framesBefore = await page.evaluate(() => window.__chubol.game.loop.frame);
await page.waitForTimeout(1200);
const framesAfter = await page.evaluate(() => window.__chubol.game.loop.frame);
check(
  'la chicharra sobre el tiro de la máquina no cuelga el juego',
  framesAfter - framesBefore > 20,
  `${framesAfter - framesBefore} cuadros en 1,2 s`,
);

console.log('');
console.log(problems.length === 0 ? 'sin errores de consola' : `errores de consola: ${problems.join(' | ')}`);
console.log(failures === 0 ? 'TODO BIEN' : `${failures} fallas`);
await browser.close();
process.exit(failures === 0 && problems.length === 0 ? 0 : 1);
