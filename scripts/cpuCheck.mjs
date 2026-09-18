/**
 * Watches the machine play a whole turn on its own: does it walk to the marks,
 * shoot from them, fetch the ball, and stay off the human's hands?
 */
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';

const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto('http://localhost:4173/', { waitUntil: 'load' });
await page.waitForFunction(() => Boolean(window.__chubol?.game?.scene?.isActive('Menu')), null, { timeout: 30000 });

// The human picks the second pair, so the machine's pair goes first and we can
// watch a full machine turn from the opening whistle.
await page.evaluate(() => {
  const m = window.__chubol.game.scene;
  for (const s of m.getScenes(true)) if (s.scene.key !== 'Game') m.stop(s.scene.key);
  m.start('Game', {
    mode: 'challenge',
    humanTeam: 1,
    teams: [
      { name: 'Bocha y Farico', members: ['Bocha', 'Farico'] },
      { name: 'Agus y Facu', members: ['Agus', 'Facu'] },
    ],
  });
});
await page.waitForFunction(() => Boolean(window.__chubol?.game?.scene?.isActive('Game')), null, { timeout: 30000 });

const probe = () =>
  page.evaluate(() => {
    const g = window.__chubol.game.scene.getScene('Game');
    return {
      phase: g.phase,
      team: g.match.currentTeamIndex,
      who: g.match.currentMemberName,
      x: Number(g.shooter.x.toFixed(2)),
      y: Number(g.shooter.y.toFixed(2)),
      scores: [g.match.scoreOf(0), g.match.scoreOf(1)],
      shots: g.match.attempts.length,
      left: Math.round(g.match.timeLeft / 1000),
    };
  });

const seen = [];
let last = '';
for (let i = 0; i < 130; i += 1) {
  const s = await probe();
  const key = `${s.phase}|${s.shots}|${s.team}`;
  if (key !== last) {
    last = key;
    seen.push(s);
  }
  if (s.team !== 0) break;
  await page.waitForTimeout(500);
}

console.log('fase        quien   posicion        tiros  puntos      reloj');
for (const s of seen) {
  console.log(
    `${s.phase.padEnd(11)} ${String(s.who).padEnd(7)} (${String(s.x).padStart(5)},${String(s.y).padStart(6)})  ${String(s.shots).padStart(4)}   ${s.scores[0]}-${s.scores[1]}   ${s.left}s`,
  );
}

const machineShots = await page.evaluate(() =>
  window.__chubol.game.scene.getScene('Game').match.attempts.filter((h) => h.teamIndex === 0),
);
console.log('');
console.log('tiros de la maquina:', machineShots.length);
console.log('marcas usadas:', [...new Set(machineShots.map((h) => h.points))].sort((a, b) => a - b).join(', '));
console.log('embocados:', machineShots.filter((h) => h.made).length);
console.log('puntos:', machineShots.filter((h) => h.made).reduce((a, h) => a + h.points, 0));

await page.screenshot({ path: 'screenshots/maquina-jugando.png' });
await browser.close();
