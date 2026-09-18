/**
 * Procedural stand-in sprites for the four friends.
 *
 * These are PLACEHOLDERS, and the game says so on screen. They exist so the game
 * can be played and the rules checked while the real sprites are produced. They
 * keep what the brief is strict about — slim build, never muscular; the right
 * clothing for each friend; feet planted on the ground; facing the hoop — but
 * they are not the drawn arcade figures of `references/chubol-nba-jam.png` and do
 * not try to be. See docs/ASSET_REQUESTS.md.
 *
 * Proportions are fractions of the figure's total height, so one routine draws
 * the same person at any size.
 */

import { CHARACTERS, PALETTE, type CharacterKey } from './palette';
import { createSurface } from './pixelCanvas';
import type { SpriteFrame } from './objects';

export type PoseName =
  | 'idle0' | 'idle1'
  | 'walk0' | 'walk1' | 'walk2' | 'walk3'
  | 'hold' | 'wind' | 'release' | 'follow' | 'cheer';

export const POSES: readonly PoseName[] = [
  'idle0', 'idle1', 'walk0', 'walk1', 'walk2', 'walk3', 'hold', 'wind', 'release', 'follow', 'cheer',
];

export const WALK_CYCLE: readonly PoseName[] = ['walk0', 'walk1', 'walk2', 'walk3'];
export const IDLE_CYCLE: readonly PoseName[] = ['idle0', 'idle1'];

interface Pose {
  /** Vertical bob of the whole body, as a fraction of height. */
  readonly bob: number;
  /** How much the knees bend. */
  readonly crouch: number;
  /** Forward and back offset of each foot. */
  readonly footFront: number;
  readonly footBack: number;
  /** Hand position relative to the shoulder, as [dx, dy]. */
  readonly handNear: readonly [number, number];
  readonly handFar: readonly [number, number];
  readonly lean: number;
}

const POSE_TABLE: Readonly<Record<PoseName, Pose>> = {
  idle0: { bob: 0, crouch: 0.012, footFront: 0.03, footBack: -0.03, handNear: [0.035, 0.30], handFar: [-0.035, 0.30], lean: 0 },
  idle1: { bob: 0.006, crouch: 0.024, footFront: 0.03, footBack: -0.03, handNear: [0.035, 0.29], handFar: [-0.035, 0.29], lean: 0 },
  walk0: { bob: 0.010, crouch: 0.022, footFront: 0.10, footBack: -0.10, handNear: [-0.06, 0.26], handFar: [0.07, 0.26], lean: 0.010 },
  walk1: { bob: 0, crouch: 0.006, footFront: 0.02, footBack: -0.02, handNear: [0.0, 0.29], handFar: [0.0, 0.29], lean: 0.006 },
  walk2: { bob: 0.010, crouch: 0.022, footFront: -0.10, footBack: 0.10, handNear: [0.07, 0.26], handFar: [-0.06, 0.26], lean: 0.010 },
  walk3: { bob: 0, crouch: 0.006, footFront: -0.02, footBack: 0.02, handNear: [0.0, 0.29], handFar: [0.0, 0.29], lean: 0.006 },
  hold: { bob: 0, crouch: 0.020, footFront: 0.05, footBack: -0.05, handNear: [0.11, 0.22], handFar: [0.03, 0.23], lean: 0.004 },
  wind: { bob: -0.008, crouch: 0.055, footFront: 0.055, footBack: -0.055, handNear: [0.10, 0.07], handFar: [0.035, 0.09], lean: 0.018 },
  release: { bob: 0.012, crouch: 0.0, footFront: 0.035, footBack: -0.035, handNear: [0.09, -0.20], handFar: [0.035, -0.17], lean: -0.010 },
  follow: { bob: 0.006, crouch: 0.006, footFront: 0.035, footBack: -0.035, handNear: [0.12, -0.15], handFar: [0.055, -0.12], lean: -0.006 },
  cheer: { bob: 0.014, crouch: 0.0, footFront: 0.07, footBack: -0.07, handNear: [0.19, -0.22], handFar: [-0.19, -0.22], lean: 0 },
};

/** Fractions of total height. A slim adult, never a bodybuilder. */
const BODY = {
  headHeight: 0.125,
  headWidth: 0.088,
  neck: 0.022,
  shoulderY: 0.165,
  hipY: 0.50,
  kneeY: 0.745,
  shoulderHalfWidth: 0.098,
  waistHalfWidth: 0.075,
  armWidth: 0.040,
  legWidth: 0.055,
  footHeight: 0.028,
  footLength: 0.085,
} as const;

interface Skin {
  readonly tank: string;
  readonly tankShade: string;
  readonly shorts: string;
  readonly shortsShade: string;
  readonly hair: string;
}

const OUTLINE = 'rgba(28, 20, 12, 0.85)';

/** A limb with a darker edge, so the figure reads against the grass. */
function limb(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, x1: number, y1: number,
  width: number, colour: string,
): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = width + 2.5;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

function shape(
  ctx: CanvasRenderingContext2D,
  points: readonly (readonly [number, number])[],
  fill: string,
): void {
  ctx.beginPath();
  ctx.moveTo(points[0]![0], points[0]![1]);
  for (const [x, y] of points.slice(1)) ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawAdult(
  ctx: CanvasRenderingContext2D,
  cx: number,
  groundY: number,
  height: number,
  skin: Skin,
  pose: Pose,
  backView: boolean,
  emblem: 'none' | 'sun',
  headband: boolean,
): void {
  const u = (v: number) => v * height;
  const top = groundY - height + u(pose.bob);
  const lean = u(pose.lean);

  const headBottom = top + u(BODY.headHeight);
  const shoulderY = top + u(BODY.shoulderY);
  const hipY = top + u(BODY.hipY) + u(pose.crouch);
  const shoulderHalf = u(BODY.shoulderHalfWidth);
  const waistHalf = u(BODY.waistHalfWidth);
  const armW = Math.max(2, u(BODY.armWidth));
  const legW = Math.max(3, u(BODY.legWidth));
  const shortsTop = hipY - u(0.085);
  const shortsBottom = hipY + u(0.115);

  // Legs. The back leg is shaded so the figure reads in depth.
  for (const [offset, back] of [[pose.footBack, true], [pose.footFront, false]] as const) {
    const footX = cx + u(offset);
    const hipX = cx + (back ? -waistHalf * 0.45 : waistHalf * 0.45) + lean * 0.4;
    const kneeY = top + u(BODY.kneeY) + u(pose.crouch) * 0.5;
    const kneeX = (hipX + footX) / 2;
    const tone = back ? PALETTE.skinShade : PALETTE.skin;
    limb(ctx, hipX, hipY, kneeX, kneeY, legW, tone);
    limb(ctx, kneeX, kneeY, footX, groundY - u(BODY.footHeight), legW * 0.85, tone);
    // Shoe, flat on the ground, so the feet never float.
    shape(
      ctx,
      [
        [footX - legW * 0.7, groundY - u(BODY.footHeight)],
        [footX + u(BODY.footLength) * 0.6, groundY - u(BODY.footHeight) * 0.75],
        [footX + u(BODY.footLength) * 0.6, groundY],
        [footX - legW * 0.7, groundY],
      ],
      back ? '#d6d3c9' : '#efece2',
    );
  }

  // Shorts.
  shape(
    ctx,
    [
      [cx - waistHalf * 1.05 + lean * 0.5, shortsTop],
      [cx + waistHalf * 1.05 + lean * 0.5, shortsTop],
      [cx + waistHalf * 1.18, shortsBottom],
      [cx - waistHalf * 1.18, shortsBottom],
    ],
    skin.shorts,
  );
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - waistHalf * 1.18, shortsTop, waistHalf * 0.55, shortsBottom - shortsTop);
  ctx.clip();
  ctx.fillStyle = skin.shortsShade;
  ctx.fillRect(cx - waistHalf * 1.2, shortsTop, waistHalf * 0.6, shortsBottom - shortsTop);
  ctx.restore();

  // Torso: narrow shoulders and a straight waist. Slim, not muscular.
  const torso: readonly (readonly [number, number])[] = [
    [cx - shoulderHalf + lean, shoulderY],
    [cx + shoulderHalf + lean, shoulderY],
    [cx + waistHalf + lean * 0.6, shortsTop + u(0.012)],
    [cx - waistHalf + lean * 0.6, shortsTop + u(0.012)],
  ];
  shape(ctx, torso, skin.tank);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(torso[0]![0], torso[0]![1]);
  for (const [x, y] of torso.slice(1)) ctx.lineTo(x, y);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = skin.tankShade;
  ctx.fillRect(cx - shoulderHalf + lean, shoulderY, shoulderHalf * 0.8, shortsTop - shoulderY);
  if (emblem === 'sun' && !backView) {
    const sx = cx + lean;
    const sy = shoulderY + (shortsTop - shoulderY) * 0.45;
    const r = u(0.026);
    ctx.fillStyle = '#ffce3c';
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffce3c';
    ctx.lineWidth = Math.max(1, r * 0.4);
    for (let a = 0; a < 8; a += 1) {
      const angle = (a / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(angle) * r * 1.4, sy + Math.sin(angle) * r * 1.4);
      ctx.lineTo(sx + Math.cos(angle) * r * 1.95, sy + Math.sin(angle) * r * 1.95);
      ctx.stroke();
    }
  }
  ctx.restore();

  const drawArm = (hand: readonly [number, number], back: boolean) => {
    const shoulderX = cx + (back ? -shoulderHalf * 0.82 : shoulderHalf * 0.82) + lean;
    const handX = shoulderX + u(hand[0]);
    const handY = shoulderY + u(hand[1]);
    const elbowX = (shoulderX + handX) / 2 + u(0.022);
    const elbowY = (shoulderY + handY) / 2 + u(0.018);
    const tone = back ? PALETTE.skinShade : PALETTE.skin;
    limb(ctx, shoulderX, shoulderY + u(0.012), elbowX, elbowY, armW, tone);
    limb(ctx, elbowX, elbowY, handX, handY, armW * 0.9, tone);
    ctx.fillStyle = tone;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(handX, handY, armW * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };
  drawArm(pose.handFar, true);

  // Neck and head.
  const headX = cx + lean * 1.25;
  const headHalf = u(BODY.headWidth) / 2;
  limb(ctx, headX, headBottom - u(0.006), cx + lean, shoulderY + u(0.012), u(BODY.neck) * 1.7, PALETTE.skinShade);
  shape(
    ctx,
    [
      [headX - headHalf, top + u(0.022)],
      [headX + headHalf, top + u(0.022)],
      [headX + headHalf * 0.86, headBottom],
      [headX - headHalf * 0.86, headBottom],
    ],
    PALETTE.skin,
  );
  ctx.save();
  ctx.beginPath();
  ctx.rect(headX - headHalf, top + u(0.022), headHalf * 0.62, u(BODY.headHeight));
  ctx.clip();
  ctx.fillStyle = PALETTE.skinShade;
  ctx.fillRect(headX - headHalf, top, headHalf, u(BODY.headHeight) * 2);
  ctx.restore();

  ctx.fillStyle = skin.hair;
  ctx.beginPath();
  ctx.ellipse(headX, top + u(0.044), headHalf * 1.12, u(0.034), 0, Math.PI, 0);
  ctx.fill();
  if (backView) {
    ctx.fillRect(headX - headHalf * 1.05, top + u(0.032), headHalf * 2.1, u(BODY.headHeight) * 0.68);
  } else {
    const eyeY = top + u(0.076);
    ctx.fillStyle = '#2a2018';
    const eye = Math.max(1, u(0.010));
    ctx.fillRect(headX - headHalf * 0.55, eyeY, eye, eye * 1.2);
    ctx.fillRect(headX + headHalf * 0.2, eyeY, eye, eye * 1.2);
  }
  if (headband) {
    ctx.fillStyle = '#cc3b2f';
    ctx.fillRect(headX - headHalf * 1.12, top + u(0.054), headHalf * 2.24, Math.max(2, u(0.018)));
  }

  drawArm(pose.handNear, false);
}

const MARGIN = 26;

function frameFor(height: number, draw: (ctx: CanvasRenderingContext2D, cx: number, groundY: number) => void): SpriteFrame {
  const width = Math.round(height * 0.85) + MARGIN * 2;
  const surfaceHeight = Math.round(height) + MARGIN * 2;
  const surface = createSurface(width, surfaceHeight);
  const cx = width / 2;
  const groundY = surfaceHeight - MARGIN;
  draw(surface.ctx, cx, groundY);
  return { surface, pivotX: cx, pivotY: groundY };
}

export interface AdultOptions {
  readonly character: CharacterKey;
  readonly facingLeft: boolean;
  readonly backView: boolean;
}

/** Paints one adult into an existing context, standing on `groundY`. */
export function paintAdult(
  ctx: CanvasRenderingContext2D,
  cx: number,
  groundY: number,
  height: number,
  options: AdultOptions,
  pose: PoseName,
): void {
  drawAdult(
    ctx,
    cx,
    groundY,
    height,
    CHARACTERS[options.character],
    POSE_TABLE[pose],
    options.backView,
    options.character === 'b' ? 'sun' : 'none',
    options.character === 'c',
  );
}

export function buildAdultFrame(options: AdultOptions, pose: PoseName, height: number): SpriteFrame {
  return frameFor(height, (ctx, cx, groundY) => paintAdult(ctx, cx, groundY, height, options, pose));
}
