/**
 * Captures real screenshots from the running game with the system Chrome.
 * Also fails loudly on any console error or uncaught exception.
 */
import { chromium } from 'playwright-core';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];

const executablePath = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!executablePath) {
  console.error('No system Chrome or Edge found.');
  process.exit(2);
}

const baseUrl = process.env.CHUBOL_URL ?? 'http://localhost:4173/';
const outDir = resolve(process.argv[2] ?? 'screenshots');
mkdirSync(outDir, { recursive: true });

const problems = [];

const browser = await chromium.launch({
  executablePath,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});
const page = await browser.newPage({ viewport: { width: 1536, height: 1024 }, deviceScaleFactor: 1 });

page.on('console', (message) => {
  const type = message.type();
  if (type === 'error' || type === 'warning') problems.push(`[${type}] ${message.text()}`);
});
page.on('pageerror', (error) => problems.push(`[pageerror] ${error.message}`));
page.on('requestfailed', (request) => problems.push(`[requestfailed] ${request.url()} ${request.failure()?.errorText ?? ''}`));
page.on('response', (response) => {
  if (response.status() >= 400) problems.push(`[http ${response.status()}] ${response.url()}`);
});

await page.goto(baseUrl, { waitUntil: 'load' });

const waitForScene = async (key) => {
  await page.waitForFunction(
    (k) => Boolean(window.__chubol?.game?.scene?.isActive(k)),
    key,
    { timeout: 30000 },
  );
  // Let the scene settle for a few frames.
  await page.waitForTimeout(700);
};

const startScene = async (key, data) => {
  // Starting a scene from outside does not stop the others, so stop them first.
  await page.evaluate(({ k, d }) => {
    const manager = window.__chubol.game.scene;
    for (const scene of manager.getScenes(true)) {
      const active = scene.scene.key;
      if (active !== k) manager.stop(active);
    }
    manager.start(k, d);
  }, { k: key, d: data ?? undefined });
  await waitForScene(key);
};

const shot = async (name) => {
  await page.screenshot({ path: resolve(outDir, `${name}.png`) });
  console.log(`captured ${name}.png`);
};

await waitForScene('Menu');
await shot('01-menu');

await startScene('Compare');
await page.keyboard.press('h');
await page.waitForTimeout(400);
await shot('02-comparacion-sin-hud');
await page.keyboard.press('h');
await page.waitForTimeout(300);
await shot('03-comparacion-con-aviso');

const TEAMS = [
  { name: 'Pareja 1', members: ['Jugador 1', 'Jugador 2'] },
  { name: 'Pareja 2', members: ['Jugador 3', 'Jugador 4'] },
];

await startScene('Game', { mode: 'practice', teams: TEAMS });
await shot('04-practica-posicion');

// Walk to the 5-point mark and charge a shot.
await page.keyboard.down('Space');
await page.waitForTimeout(500);
await shot('05-practica-barra-de-carga');
await page.waitForTimeout(184);
await page.keyboard.up('Space');
await page.waitForTimeout(600);
await shot('06-practica-pelota-en-vuelo');
await page.waitForTimeout(2200);
await shot('07-practica-resultado');

await page.waitForTimeout(1400);
await shot('07b-practica-buscar-la-pelota');

await startScene('Game', { mode: 'challenge', teams: TEAMS });
await shot('08-partido-reloj');

// Full flow on a shortened match: both pairs play their turn and the result
// screen has to come up by itself, with no further input.
console.log('running a short full match end to end...');
await startScene('Game', { mode: 'challenge', teams: TEAMS, turnMs: 4000, tiebreakMs: 3000 });
await page.keyboard.down('Space');
await page.waitForTimeout(684);
await page.keyboard.up('Space');
await page.waitForTimeout(2300);
await shot('10-partido-cambio-de-pareja');
await page.waitForFunction(() => Boolean(window.__chubol?.game?.scene?.isActive('Result')), null, { timeout: 40000 });
await page.waitForTimeout(700);
await shot('11-resultado-real-del-partido');
console.log('the short match reached the result screen on its own');

const standing = (i, name, members, score, attempts, makes, laps) => ({
  teamIndex: i, name, members, score, attempts, makes, laps,
});
const winner = standing(0, 'Pareja 1', ['Jugador 1', 'Jugador 2'], 29, 9, 5, 1);
const runnerUp = standing(1, 'Pareja 2', ['Jugador 3', 'Jugador 4'], 18, 8, 4, 1);
await startScene('Result', {
  result: { winners: [winner], standings: [winner, runnerUp], shared: false },
  config: { teams: TEAMS, turnMs: 60000, tiebreakMs: 30000, tiebreak: 'extraTurn' },
});
await shot('09-celebracion-trofeo');

const fps = await page.evaluate(() => {
  return new Promise((resolve) => {
    let frames = 0;
    const start = performance.now();
    const tick = () => {
      frames += 1;
      if (performance.now() - start < 2000) requestAnimationFrame(tick);
      else resolve(Math.round((frames * 1000) / (performance.now() - start)));
    };
    requestAnimationFrame(tick);
  });
});
console.log(`measured ${fps} fps over 2 s (headless SwiftShader, software rendering)`);

await browser.close();

if (problems.length > 0) {
  console.error('\nConsole problems:');
  for (const p of [...new Set(problems)]) console.error('  ' + p);
  process.exit(1);
}
console.log('\nNo console errors, warnings or failed requests.');
