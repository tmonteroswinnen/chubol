/** Crops a region of an image and scales it up, so positions can be read precisely. */
import { readPng, writePng } from './png.mjs';

const [src, out, xs, ys, ws, hs, zs] = process.argv.slice(2);
const x0 = Number(xs), y0 = Number(ys), w = Number(ws), h = Number(hs), z = Number(zs ?? 1);
const img = readPng(src);
const outW = w * z, outH = h * z;
const buf = Buffer.alloc(outW * outH * 4);
for (let y = 0; y < outH; y += 1) {
  for (let x = 0; x < outW; x += 1) {
    const p = img.at(x0 + Math.floor(x / z), y0 + Math.floor(y / z)) ?? { r: 255, g: 0, b: 255, a: 255 };
    const i = (y * outW + x) * 4;
    buf[i] = p.r; buf[i + 1] = p.g; buf[i + 2] = p.b; buf[i + 3] = p.a;
  }
}
// Grid every 50 source pixels so coordinates can be read off the crop.
for (let gx = Math.ceil(x0 / 50) * 50; gx < x0 + w; gx += 50) {
  const sx = (gx - x0) * z;
  for (let y = 0; y < outH; y += 1) { const i = (y * outW + sx) * 4; buf[i] = 255; buf[i+1] = 0; buf[i+2] = 255; }
}
for (let gy = Math.ceil(y0 / 50) * 50; gy < y0 + h; gy += 50) {
  const sy = (gy - y0) * z;
  for (let x = 0; x < outW; x += 1) { const i = (sy * outW + x) * 4; buf[i] = 255; buf[i+1] = 0; buf[i+2] = 255; }
}
writePng(out, outW, outH, buf);
console.log(`${out}  region (${x0},${y0}) ${w}x${h} at ${z}x  magenta grid every 50 source px`);
