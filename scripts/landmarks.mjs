/**
 * Finds the painted court markings in the supplied plate by looking at pixels,
 * not by eye. The camera calibration depends on these positions, so they are
 * measured.
 *
 * The paint is a pale cream that is much lighter and much less saturated than the
 * grass around it, which makes it separable with a simple threshold.
 */

import { readPng } from './png.mjs';

const PLATE = process.argv[2] ?? 'public/assets/backgrounds/chubol-court-clean-v1.png';

const img = readPng(PLATE);
const { width, height, pixels } = img;

/** True for the pale paint of the lines and the numbers. */
function isPaint(i) {
  const r = pixels[i];
  const g = pixels[i + 1];
  const b = pixels[i + 2];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  // Bright, warm-neutral, and not the strong green of the grass.
  return max > 185 && min > 120 && max - min < 90 && g < r + 12 && b > 105;
}

const mask = new Uint8Array(width * height);
for (let p = 0; p < width * height; p += 1) if (isPaint(p * 4)) mask[p] = 1;

// Connected components, 8-connected, iterative flood fill.
const seen = new Uint8Array(width * height);
const components = [];
const stack = new Int32Array(width * height);

for (let start = 0; start < width * height; start += 1) {
  if (mask[start] === 0 || seen[start] === 1) continue;
  let top = 0;
  stack[top] = start;
  top += 1;
  seen[start] = 1;
  let area = 0;
  let sumX = 0;
  let sumY = 0;
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;

  while (top > 0) {
    top -= 1;
    const p = stack[top];
    const x = p % width;
    const y = (p - x) / width;
    area += 1;
    sumX += x;
    sumY += y;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;

    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const q = ny * width + nx;
        if (mask[q] === 0 || seen[q] === 1) continue;
        seen[q] = 1;
        stack[top] = q;
        top += 1;
      }
    }
  }
  if (area >= 60) {
    components.push({
      area,
      cx: sumX / area,
      cy: sumY / area,
      minX, maxX, minY, maxY,
      w: maxX - minX + 1,
      h: maxY - minY + 1,
    });
  }
}

components.sort((a, b) => b.area - a.area);

// The digits painted on the grass are compact and well filled; the lines and the
// arc are long and thin. Everything above the court (logo, clouds, the boy's
// shirt) is excluded by region rather than by shape.
const COURT_TOP = 330;
const glyphs = components
  .filter((c) => c.minY > COURT_TOP)
  .filter((c) => c.w >= 14 && c.w <= 60 && c.h >= 26 && c.h <= 60)
  .filter((c) => c.area / (c.w * c.h) >= 0.2)
  .sort((a, b) => a.cy - b.cy);

console.log('');
console.log('--- glyph candidates on the court ---');
console.log('area    centroid        bbox(x,y,w,h)        fill%');
for (const c of glyphs) {
  console.log(
    `${String(c.area).padStart(5)}  (${c.cx.toFixed(0).padStart(4)},${c.cy.toFixed(0).padStart(4)})  ` +
      `(${String(c.minX).padStart(4)},${String(c.minY).padStart(4)},${String(c.w).padStart(3)},${String(c.h).padStart(3)})  ` +
      `${((c.area / (c.w * c.h)) * 100).toFixed(0).padStart(4)}`,
  );
}

console.log(`paint pixels: ${mask.reduce((a, v) => a + v, 0)}  components >=60px: ${components.length}`);
console.log('');
console.log('idx   area    centroid        bbox(x,y,w,h)        fill%  shape');
components.slice(0, 40).forEach((c, i) => {
  const fill = ((c.area / (c.w * c.h)) * 100).toFixed(0);
  const shape = c.w > 140 || c.h > 140 ? 'LINE/ARC' : c.w < 70 && c.h < 70 ? 'glyph?' : 'blob';
  console.log(
    `${String(i).padStart(3)} ${String(c.area).padStart(7)}  ` +
      `(${c.cx.toFixed(0).padStart(4)},${c.cy.toFixed(0).padStart(4)})  ` +
      `(${String(c.minX).padStart(4)},${String(c.minY).padStart(4)},${String(c.w).padStart(4)},${String(c.h).padStart(4)})  ` +
      `${fill.padStart(4)}   ${shape}`,
  );
});
