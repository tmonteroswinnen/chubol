/**
 * Cuts the layers the game needs out of the supplied court plate.
 *
 * The plate is a single flat image, but a 2.5D scene needs to draw some of it in
 * FRONT of the players and the ball:
 *
 *  - the low brick wall across the bottom, so feet are hidden behind it;
 *  - the near half of the rim and the chain net, so a ball dropping through the
 *    hoop passes behind them instead of over them.
 *
 * Nothing is repainted: both layers are pixels taken straight from the plate, so
 * they cannot drift from the artwork.
 *
 * Run: node scripts/cutLayers.mjs
 */

import { mkdirSync } from 'node:fs';
import { readPng, writePng } from './png.mjs';

/**
 * Crops a full-frame RGBA buffer down to the box that actually has pixels in it.
 *
 * Both layers are mostly empty — the hoop front is about 1300 opaque pixels in a
 * 1536 x 1024 frame — and a phone would otherwise carry six megabytes of texture
 * for each. The offset comes back so the game can draw the crop in the right
 * place.
 */
function cropToContent(pixels, width, height) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] === 0) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) throw new Error('layer is completely empty');
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    pixels.copy(out, y * w * 4, ((minY + y) * width + minX) * 4, ((minY + y) * width + minX + w) * 4);
  }
  return { pixels: out, x: minX, y: minY, width: w, height: h };
}

const PLATE = 'public/assets/backgrounds/chubol-court-clean-v1.png';
const OUT_DIR = 'public/assets/backgrounds';
const PROPS_DIR = 'public/assets/props';

const plate = readPng(PLATE);
const { width, height } = plate;

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(PROPS_DIR, { recursive: true });

/* ------------------------------------------------------------------ */
/* Foreground: the low brick wall and the bushes in front of it        */
/* ------------------------------------------------------------------ */

/**
 * Top edge of the front wall, measured on 4x crops at two places and fitted as a
 * straight line — it is a straight line in the world, so it is straight on
 * screen too.
 */
const WALL_AT_X_250 = 799.5;
const WALL_SLOPE = 0.0433;
const wallTopAt = (x) => WALL_AT_X_250 + WALL_SLOPE * (x - 250);

const foreground = Buffer.alloc(width * height * 4);
let foregroundPixels = 0;
for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const i = (y * width + x) * 4;
    if (y < wallTopAt(x)) continue; // above the wall: stays in the background
    foreground[i] = plate.pixels[i];
    foreground[i + 1] = plate.pixels[i + 1];
    foreground[i + 2] = plate.pixels[i + 2];
    foreground[i + 3] = 255;
    foregroundPixels += 1;
  }
}
const fg = cropToContent(foreground, width, height);
writePng(`${OUT_DIR}/court-foreground.png`, fg.width, fg.height, fg.pixels);
console.log(
  `court-foreground.png  ${foregroundPixels} opaque pixels, cropped to ${fg.width}x${fg.height} at (${fg.x}, ${fg.y})  ` +
    `${((fg.width * fg.height * 4) / 1048576).toFixed(2)} MB of texture`,
);

/* ------------------------------------------------------------------ */
/* Hoop front: the near half of the rim and the chain net              */
/* ------------------------------------------------------------------ */

// The ring drawn on the plate, measured on a 2x crop: an ellipse centred here
// with these semi-axes. Only its near half goes in front of the ball.
const RIM = { cx: 301, cy: 270, rx: 50, ry: 16 };
// The chain net hangs from the ring and narrows as it falls.
const NET = { top: 270, bottom: 366, topHalfWidth: 50, bottomHalfWidth: 27 };

const isRimMetal = (r, g, b) => r > 165 && r - g > 70 && r - b > 90;
const isChain = (r, g, b) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return min > 135 && max - min < 60;
};

const hoopFront = Buffer.alloc(width * height * 4);
let hoopPixels = 0;
for (let y = RIM.cy; y <= NET.bottom; y += 1) {
  // The net's silhouette, so nothing from the brick wall behind it is picked up.
  const t = (y - NET.top) / (NET.bottom - NET.top);
  const halfWidth = NET.topHalfWidth + (NET.bottomHalfWidth - NET.topHalfWidth) * Math.max(0, t);
  for (let x = Math.round(RIM.cx - halfWidth) - 4; x <= Math.round(RIM.cx + halfWidth) + 4; x += 1) {
    const i = (y * width + x) * 4;
    const r = plate.pixels[i];
    const g = plate.pixels[i + 1];
    const b = plate.pixels[i + 2];

    // On the ring itself, keep the metal; below it, keep the chains.
    const onRing = Math.abs(((x - RIM.cx) / RIM.rx) ** 2 + ((y - RIM.cy) / RIM.ry) ** 2 - 1) < 0.9 && y <= RIM.cy + RIM.ry + 3;
    const inNet = Math.abs(x - RIM.cx) <= halfWidth && y > RIM.cy;
    const keep = (onRing && isRimMetal(r, g, b)) || (inNet && isChain(r, g, b));
    if (!keep) continue;

    hoopFront[i] = r;
    hoopFront[i + 1] = g;
    hoopFront[i + 2] = b;
    hoopFront[i + 3] = 255;
    hoopPixels += 1;
  }
}
const hf = cropToContent(hoopFront, width, height);
writePng(`${PROPS_DIR}/hoop-front.png`, hf.width, hf.height, hf.pixels);
console.log(
  `hoop-front.png        ${hoopPixels} opaque pixels, cropped to ${hf.width}x${hf.height} at (${hf.x}, ${hf.y})  ` +
    `${((hf.width * hf.height * 4) / 1048576).toFixed(2)} MB of texture`,
);

console.log('');
console.log('--- paste into src/game/config/court.ts ---');
console.log(`export const LAYER_OFFSETS = {`);
console.log(`  foreground: { x: ${fg.x}, y: ${fg.y} },`);
console.log(`  hoopFront: { x: ${hf.x}, y: ${hf.y} },`);
console.log(`} as const;`);
