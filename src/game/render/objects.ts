/**
 * The few things the supplied artwork does not contain: the game ball and the
 * marker drawn under the active shooting spot.
 *
 * The ball is a PLACEHOLDER — see docs/ASSET_REQUESTS.md. Everything else in the
 * scene (court, hoop, walls, trees, road, boy, dog, trophy table, logo) is the
 * real artwork and is not drawn here.
 */

import { PALETTE } from './palette';
import { createSurface, ellipse, type PixelSurface } from './pixelCanvas';

export interface SpriteFrame {
  readonly surface: PixelSurface;
  readonly pivotX: number;
  readonly pivotY: number;
}

/** Ball sprite at a given diameter, with volume shading and seams. */
export function buildBall(diameter: number, spin = 0): SpriteFrame {
  const size = Math.max(6, Math.round(diameter));
  const surface = createSurface(size + 4, size + 4);
  const ctx = surface.ctx;
  const r = size / 2;
  const cx = r + 2;
  const cy = r + 2;

  ellipse(ctx, cx, cy, r, r, PALETTE.ballLine);
  ellipse(ctx, cx, cy, r - 1.5, r - 1.5, PALETTE.ballDark);
  ellipse(ctx, cx - r * 0.12, cy - r * 0.14, r - 2.5, r - 2.5, PALETTE.ballOrange);
  ellipse(ctx, cx - r * 0.3, cy - r * 0.32, r * 0.5, r * 0.44, '#f2a058');

  ctx.strokeStyle = PALETTE.ballLine;
  ctx.lineWidth = Math.max(1, size / 18);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(spin);
  ctx.beginPath();
  ctx.moveTo(-r + 1.5, 0);
  ctx.lineTo(r - 1.5, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.42, r - 1.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  return { surface, pivotX: cx, pivotY: cy };
}

/** Dashed ring drawn under a shooting mark. */
export function buildSpotMarker(diameter: number): SpriteFrame {
  const w = Math.max(16, Math.round(diameter));
  const h = Math.max(10, Math.round(diameter * 0.52));
  const surface = createSurface(w + 6, h + 6);
  const ctx = surface.ctx;
  ctx.strokeStyle = PALETTE.hudAccent;
  ctx.lineWidth = 3;
  ctx.setLineDash([9, 7]);
  ctx.beginPath();
  ctx.ellipse(w / 2 + 3, h / 2 + 3, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.stroke();
  return { surface, pivotX: w / 2 + 3, pivotY: h / 2 + 3 };
}
