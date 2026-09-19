/**
 * The shoot button with more than one finger on the glass.
 *
 * This is the case the old touch test never covered — it sent one touch point,
 * in practice mode — and it is exactly how a phone gets held: two thumbs on the
 * screen at once. Every step here failed before `activePointers` and the pointer
 * ownership check in makeHoldButton.
 */
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});
const ctx = await browser.newContext({
  viewport: { width: 844, height: 390 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
const problems = [];
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(m.text());
});
page.on('pageerror', (e) => problems.push(String(e.message)));

/**
 * Holds a set of named fingers down and replays them on every event.
 *
 * The two event types do NOT take the same list, which is easy to get backwards
 * and makes a multi-touch test quietly lift the wrong finger:
 *   touchStart → every point that is down afterwards, including the new one.
 *   touchEnd   → only the points being lifted.
 * Ids have to be numbers.
 */
const fingers = new Map();
let nextId = 1;
const ids = new Map();
const idOf = (name) => {
  if (!ids.has(name)) ids.set(name, nextId++);
  return ids.get(name);
};
const send = (type, points) =>
  cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: points.map((p) => ({ id: p.id, x: p.x, y: p.y, radiusX: 14, radiusY: 14, force: 1 })),
  });
const down = async (name, x, y) => {
  const point = { id: idOf(name), x, y };
  await send('touchStart', [...fingers.values(), point]);
  fingers.set(name, point);
  await page.waitForTimeout(60);
};
const up = async (name) => {
  const point = fingers.get(name);
  if (point === undefined) return;
  fingers.delete(name);
  await send('touchEnd', [point]);
  await page.waitForTimeout(60);
};

await page.goto('http://localhost:4173/', { waitUntil: 'load' });
await page.waitForFunction(() => Boolean(window.__chubol?.game?.scene?.isActive('Menu')), null, { timeout: 30000 });
await page.waitForTimeout(400);

/** A point in game coordinates turned into a point on the screen to touch. */
const toScreen = (gx, gy) =>
  page.evaluate(
    ({ gx, gy }) => {
      const game = window.__chubol.game;
      const r = game.canvas.getBoundingClientRect();
      return { x: r.left + (gx / game.scale.width) * r.width, y: r.top + (gy / game.scale.height) * r.height };
    },
    { gx, gy },
  );

// Straight into a match against the machine, with the person shooting first.
await page.evaluate(() => {
  const m = window.__chubol.game.scene;
  for (const s of m.getScenes(true)) if (s.scene.key !== 'Game') m.stop(s.scene.key);
  m.start('Game', {
    mode: 'challenge',
    humanTeam: 0,
    turnMs: 600000,
    teams: [
      { name: 'Bocha y Farico', members: ['Bocha', 'Farico'] },
      { name: 'Agus y Facu', members: ['Agus', 'Facu'] },
    ],
  });
});
await page.waitForFunction(() => Boolean(window.__chubol?.game?.scene?.isActive('Game')), null, { timeout: 30000 });
await page.waitForTimeout(700);

const phase = () => page.evaluate(() => window.__chubol.game.scene.getScene('Game').phase);
const pointers = () => page.evaluate(() => window.__chubol.game.input.pointers.length);
const button = async () => {
  const at = await page.evaluate(() => {
    const c = window.__chubol.game.scene.getScene('Game').shootButton.container;
    return { x: c.x, y: c.y };
  });
  return toScreen(at.x, at.y);
};
const standOnMark = (points) =>
  page.evaluate((p) => {
    const g = window.__chubol.game.scene.getScene('Game');
    const marks = {
      2: [0.62, 0.16],
      3: [0.37, 2.66],
      4: [0.31, -1.99],
      5: [3.59, -0.01],
      6: [4.15, -2.31],
      8: [7.45, -0.49],
    };
    const m = marks[p];
    g.shooter.x = m[0];
    g.shooter.y = m[1];
    g.walkTarget = null;
    g.phase = 'positioning';
  }, points);

let failures = 0;
const check = (name, ok, detail) => {
  console.log(`${ok ? 'OK  ' : 'FALLA'}  ${name}${detail ? '   ' + detail : ''}`);
  if (!ok) failures += 1;
};

console.log(`punteros que sigue Phaser: ${await pointers()} (mouse + táctiles)`);

// 1. The real case: a thumb already resting on the screen, then press TIRAR.
await standOnMark(5);
await page.waitForTimeout(120);
await down('apoyado', 30, 200); // left thumb, on the dead band outside the canvas
const at = await button();
await down('tirar', at.x, at.y);
const conDosDedos = await phase();
check('con un dedo apoyado, TIRAR carga', conDosDedos === 'charging', `fase=${conDosDedos}`);

// 2. A third finger touching and lifting must NOT let go of the shot.
await down('intruso', 420, 340);
await up('intruso');
const sigueCargando = await phase();
check('otro dedo que se levanta NO tira', sigueCargando === 'charging', `fase=${sigueCargando}`);

// 3. The finger that pressed lets go, and the shot goes.
await up('tirar');
const trasSoltar = await phase();
check('soltar el dedo que apretó sí tira', trasSoltar === 'flight', `fase=${trasSoltar}`);
await up('apoyado');

// 4. Holding the button before arriving at a mark: it has to arm on arrival.
await page.waitForFunction(() => window.__chubol.game.scene.getScene('Game').phase !== 'flight', null, {
  timeout: 20000,
});
await page.evaluate(() => {
  const g = window.__chubol.game.scene.getScene('Game');
  g.phase = 'positioning';
  g.shooter.x = 2.2;
  g.shooter.y = 1.2;
  g.walkTarget = null;
});
await page.waitForTimeout(150);
const at2 = await button();
await down('tirar', at2.x, at2.y);
const antesDeLlegar = await phase();
await standOnMark(6);
await page.waitForTimeout(250);
const alLlegar = await phase();
check(
  'apretar antes de llegar y armar al pisar la marca',
  antesDeLlegar === 'positioning' && alLlegar === 'charging',
  `antes=${antesDeLlegar} al llegar=${alLlegar}`,
);
await up('tirar');

// 5. Lifting past the edge of the canvas must not leave the charge running.
await page.waitForFunction(() => window.__chubol.game.scene.getScene('Game').phase !== 'flight', null, {
  timeout: 20000,
});
await standOnMark(4);
await page.waitForTimeout(150);
const at3 = await button();
await down('tirar', at3.x, at3.y);
await page.waitForTimeout(100);
// Drag it well off the button and lift it there: Phaser emits pointerupoutside
// instead of pointerup, and nothing was listening for that.
const fuera = { id: idOf('tirar'), x: 838, y: 386 };
await send('touchMove', [fuera]);
await page.waitForTimeout(60);
fingers.delete('tirar');
await send('touchEnd', [fuera]);
await page.waitForTimeout(250);
const trasSalirse = await phase();
check('levantar el dedo fuera del canvas no deja la barra colgada', trasSalirse !== 'charging', `fase=${trasSalirse}`);

console.log('');
console.log(problems.length === 0 ? 'sin errores de consola' : `errores de consola: ${problems.join(' | ')}`);
console.log(failures === 0 ? 'TODO BIEN' : `${failures} fallas`);
await browser.close();
process.exit(failures === 0 && problems.length === 0 ? 0 : 1);
