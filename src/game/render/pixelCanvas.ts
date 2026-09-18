import Phaser from 'phaser';

/**
 * The supplied plate is 1536 x 1024, the same size as the logical canvas, and it
 * is a high-resolution illustration rather than a low-resolution pixel grid. So
 * generated art is authored at that same density: one art pixel is one logical
 * pixel.
 */
export const ART_SCALE = 1;

export interface PixelSurface {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly width: number;
  readonly height: number;
}

/**
 * `readBack` marks a surface whose pixels are read again with getImageData, so
 * the browser picks a software backing store instead of warning about it.
 */
export function createSurface(width: number, height: number, readBack = false): PixelSurface {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d', readBack ? { willReadFrequently: true } : undefined);
  if (ctx === null) throw new Error('2D canvas context is unavailable');
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx, width: canvas.width, height: canvas.height };
}

/**
 * Registers a surface as a texture with nearest-neighbour filtering, replacing
 * any texture already under that key so a scene restart cannot leak textures.
 */
export function registerTexture(
  scene: Phaser.Scene,
  key: string,
  surface: PixelSurface,
  filter: Phaser.Textures.FilterMode = Phaser.Textures.FilterMode.LINEAR,
): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const texture = scene.textures.addCanvas(key, surface.canvas);
  texture?.setFilter(filter);
}

/** Fills an axis-aligned rectangle on whole pixels. */
export function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, colour: string): void {
  ctx.fillStyle = colour;
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}

/** Fills a polygon, snapping every vertex to the pixel grid. */
export function polygon(ctx: CanvasRenderingContext2D, points: readonly (readonly [number, number])[], colour: string): void {
  if (points.length < 3) return;
  ctx.fillStyle = colour;
  ctx.beginPath();
  const [first, ...rest] = points;
  ctx.moveTo(Math.round(first![0]), Math.round(first![1]));
  for (const [x, y] of rest) ctx.lineTo(Math.round(x), Math.round(y));
  ctx.closePath();
  ctx.fill();
}

export function strokePolyline(
  ctx: CanvasRenderingContext2D,
  points: readonly (readonly [number, number])[],
  colour: string,
  width = 1,
  close = false,
): void {
  if (points.length < 2) return;
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.lineJoin = 'miter';
  ctx.beginPath();
  const [first, ...rest] = points;
  ctx.moveTo(first![0], first![1]);
  for (const [x, y] of rest) ctx.lineTo(x, y);
  if (close) ctx.closePath();
  ctx.stroke();
}

export function ellipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  colour: string,
): void {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Deterministic value noise. Textures must be identical on every run so the
 * comparison capture is reproducible.
 */
export function noise2(x: number, y: number, seed = 0): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
}
