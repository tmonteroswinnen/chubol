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

  // Seams. Two of them are not enough: what makes a circle read as a basketball
  // is the pair of curved seams down the sides, and without them this looked
  // like a globe. They are clipped to the ball so they cannot spill over the
  // edge as they turn.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 1.5, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate(spin);
  ctx.strokeStyle = PALETTE.ballLine;
  ctx.lineWidth = Math.max(1, size / 22);
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.lineTo(r, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.42, r, 0, 0, Math.PI * 2);
  ctx.stroke();
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * r * 0.62, 0, r * 0.34, r * 1.02, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // A thin rim of bounced light along the lower right, which is where the sun in
  // the plate puts it.
  ctx.strokeStyle = 'rgba(255, 226, 180, 0.5)';
  ctx.lineWidth = Math.max(1, size / 26);
  ctx.beginPath();
  ctx.arc(cx, cy, r - 2.2, Math.PI * 0.08, Math.PI * 0.62);
  ctx.stroke();

  return { surface, pivotX: cx, pivotY: cy };
}

/**
 * Ring drawn under a shooting mark.
 *
 * Painted in the worn cream of the court lines rather than in the orange of the
 * interface, so it reads as chalk on the grass and not as a debug overlay. The
 * flattening is the one a circle on this ground really has under this camera.
 */
export function buildSpotMarker(diameter: number): SpriteFrame {
  const w = Math.max(16, Math.round(diameter));
  const h = Math.max(10, Math.round(diameter * 0.473));
  const surface = createSurface(w + 8, h + 8);
  const ctx = surface.ctx;
  const draw = (colour: string, width: number) => {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.ellipse(w / 2 + 4, h / 2 + 4, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  };
  // A dark halo under the chalk, or it disappears into the grass, which has
  // every shade of green in it.
  draw('rgba(24, 34, 16, 0.55)', 6);
  draw(PALETTE.lineWhite, 3);
  return { surface, pivotX: w / 2 + 4, pivotY: h / 2 + 4 };
}
