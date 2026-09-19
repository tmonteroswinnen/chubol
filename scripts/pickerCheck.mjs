/** Menu -> pair picker -> match: who plays, and is the human locked out? */
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

const labels = () =>
  page.evaluate(() => {
    const menu = window.__chubol.game.scene.getScene('Menu');
    const out = [];
    // Text lives inside button containers, so its own x/y is local: carry the
    // parent offsets down or every label reads as sitting at the origin.
    const walk = (list, ox, oy) => {
      for (const o of list) {
        if (o.type === 'Text' && o.text.trim()) out.push({ text: o.text, x: Math.round(ox + o.x), y: Math.round(oy + o.y) });
        if (o.list) walk(o.list, ox + (o.x ?? 0), oy + (o.y ?? 0));
      }
    };
    walk(menu.children.list, 0, 0);
    return out;
  });

console.log('MENU:', (await labels()).map((l) => l.text.split('\n')[0]).join(' | '));
await page.screenshot({ path: 'screenshots/menu.png' });

// Tap the first menu entry: playing against the machine.
const jugar = (await labels()).find((l) => l.text.includes('MÁQUINA'));
const box = await page.$eval('canvas', (c) => {
  const r = c.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
const toScreen = (x, y) => ({ x: box.x + (x / 1920) * box.w, y: box.y + (y / 1024) * box.h });
let p = toScreen(jugar.x, jugar.y);
await page.mouse.click(p.x, p.y);
await page.waitForTimeout(400);

const picker = await labels();
console.log('SELECTOR:', picker.map((l) => l.text.split('\n')[0]).join(' | '));
await page.screenshot({ path: 'screenshots/selector-pareja.png' });

// Choose "Agus y Facu": the machine should then be Bocha y Farico, and go first.
const agus = picker.find((l) => l.text.toUpperCase().includes('AGUS'));
p = toScreen(agus.x, agus.y);
await page.mouse.click(p.x, p.y);
await page.waitForFunction(() => Boolean(window.__chubol?.game?.scene?.isActive('Game')), null, { timeout: 30000 });
await page.waitForTimeout(1200);

const setup = await page.evaluate(() => {
  const g = window.__chubol.game.scene.getScene('Game');
  return {
    humanTeam: g.humanTeam,
    hasCpu: g.cpu !== null,
    turnOf: g.match.currentTeam.name,
    machinePlaying: g.match.currentTeamIndex !== g.humanTeam,
  };
});
console.log('PARTIDO:', JSON.stringify(setup));

// While the machine plays, try to interfere. Wait until it is walking to fetch
// the ball: that phase can never be confused with a charge of its own, so if a
// charge appears it can only have come from the keyboard or the button.
await page.waitForFunction(() => window.__chubol.game.scene.getScene('Game').phase === 'retrieving', null, {
  timeout: 30000,
});
const read = () =>
  page.evaluate(() => {
    const g = window.__chubol.game.scene.getScene('Game');
    return {
      phase: g.phase,
      target: g.walkTarget ? { x: +g.walkTarget.x.toFixed(2), y: +g.walkTarget.y.toFixed(2) } : null,
      shooter: { x: +g.shooter.x.toFixed(2), y: +g.shooter.y.toFixed(2) },
    };
  });

const before = await read();

// A tap on the far corner of the court.
const tapped = toScreen(192 + 1400, 900);
await page.mouse.click(tapped.x, tapped.y);
await page.waitForTimeout(80);
const afterTap = await read();

// The space bar.
await page.keyboard.down('Space');
await page.waitForTimeout(150);
const afterSpace = await read();
await page.keyboard.up('Space');

// And the TIRAR button itself.
const btn = await page.evaluate(() => {
  const c = window.__chubol.game.scene.getScene('Game').shootButton.container;
  return { x: c.x, y: c.y };
});
const b = toScreen(btn.x, btn.y);
await page.mouse.move(b.x, b.y);
await page.mouse.down();
await page.waitForTimeout(150);
const afterButton = await read();
await page.mouse.up();

console.log('antes del toque :', JSON.stringify(before));
console.log('tras tocar cancha:', JSON.stringify(afterTap));
console.log('tras ESPACIO    :', JSON.stringify(afterSpace));
console.log('tras TIRAR      :', JSON.stringify(afterButton));
// Not "the phase never changed": the machine keeps playing while we poke at it,
// so the phase moves on its own. What must never happen is a charge, which only
// a person can start, or the walk target jumping to where the finger landed.
const charged = [afterTap, afterSpace, afterButton].some((s) => s.phase === 'charging');
const wentToTheTap =
  afterTap.target !== null && Math.hypot(afterTap.target.x - 7.6, afterTap.target.y - 3.05) < 0.5;
const interfered = charged || wentToTheTap;
console.log(
  interfered
    ? `FALLA: el humano pudo interferir (carga=${charged} caminata=${wentToTheTap})`
    : 'OK: el humano no puede interferir',
);

await page.screenshot({ path: 'screenshots/maquina-turno.png' });
await browser.close();
