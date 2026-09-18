/**
 * Builds the app icons from the artwork itself, so the icon on the home screen
 * is the actual hoop rather than something invented.
 *
 * Run: node scripts/makeIcons.mjs
 */

import { mkdirSync } from 'node:fs';
import { readPng, writePng } from './png.mjs';

const PLATE = 'public/assets/backgrounds/chubol-court-clean-v1.png';
const OUT_DIR = 'public/assets/ui';
mkdirSync(OUT_DIR, { recursive: true });

const plate = readPng(PLATE);

/** Square region of the plate holding the board, the rim and the net. */
const SOURCE = { x: 118, y: 96, size: 292 };

/** Box-filtered downsample: averaging beats nearest when shrinking this far. */
function sample(size, inset, background) {
  const out = Buffer.alloc(size * size * 4);
  const drawn = Math.round(size * (1 - inset * 2));
  const offset = Math.round((size - drawn) / 2);

  if (background !== null) {
    for (let i = 0; i < size * size; i += 1) {
      out[i * 4] = background[0];
      out[i * 4 + 1] = background[1];
      out[i * 4 + 2] = background[2];
      out[i * 4 + 3] = 255;
    }
  }

  const step = SOURCE.size / drawn;
  for (let y = 0; y < drawn; y += 1) {
    for (let x = 0; x < drawn; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      const x0 = SOURCE.x + x * step;
      const y0 = SOURCE.y + y * step;
      for (let sy = 0; sy < step; sy += 1) {
        for (let sx = 0; sx < step; sx += 1) {
          const p = plate.at(x0 + sx, y0 + sy);
          if (p === null) continue;
          r += p.r; g += p.g; b += p.b; n += 1;
        }
      }
      if (n === 0) continue;
      const i = ((y + offset) * size + (x + offset)) * 4;
      out[i] = Math.round(r / n);
      out[i + 1] = Math.round(g / n);
      out[i + 2] = Math.round(b / n);
      out[i + 3] = 255;
    }
  }
  return out;
}

for (const size of [192, 512]) {
  writePng(`${OUT_DIR}/icon-${size}.png`, size, size, sample(size, 0, null));
  console.log(`icon-${size}.png`);
}
// Maskable icons get cropped to a circle by the launcher, so the hoop is inset.
writePng(`${OUT_DIR}/icon-maskable-512.png`, 512, 512, sample(512, 0.14, [20, 16, 13]));
console.log('icon-maskable-512.png');
