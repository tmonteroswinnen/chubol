/**
 * Procedural stand-in sprites for the four friends.
 *
 * These are PLACEHOLDERS, and the game says so on the menu. They exist so the
 * game can be played and the rules checked while the real sprites are produced.
 * They keep what the brief is strict about — slim build, never muscular; the
 * right clothing for each friend; feet planted on the ground; facing the hoop —
 * but they are not the drawn arcade figures of `references/chubol-nba-jam.png`
 * and do not try to be. See docs/ASSET_REQUESTS.md.
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
  | 'hold' | 'wind1' | 'wind2' | 'wind' | 'release' | 'follow' | 'cheer';

export const POSES: readonly PoseName[] = [
  'idle0', 'idle1', 'walk0', 'walk1', 'walk2', 'walk3',
  'hold', 'wind1', 'wind2', 'wind', 'release', 'follow', 'cheer',
];

export const WALK_CYCLE: readonly PoseName[] = ['walk0', 'walk1', 'walk2', 'walk3'];
export const IDLE_CYCLE: readonly PoseName[] = ['idle0', 'idle1'];
/** The four steps of winding up, from holding the ball to fully loaded. */
export const CHARGE_CYCLE: readonly PoseName[] = ['hold', 'wind1', 'wind2', 'wind'];

interface Pose {
  /** Vertical bob of the whole body, as a fraction of height. Lifts the feet too. */
  readonly bob: number;
  /** How much the knees bend. Sinks the hips more than the shoulders. */
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
  walk0: { bob: 0.012, crouch: 0.022, footFront: 0.10, footBack: -0.10, handNear: [-0.06, 0.26], handFar: [0.07, 0.26], lean: 0.010 },
  walk1: { bob: 0, crouch: 0.006, footFront: 0.02, footBack: -0.02, handNear: [0.0, 0.29], handFar: [0.0, 0.29], lean: 0.006 },
  walk2: { bob: 0.012, crouch: 0.022, footFront: -0.10, footBack: 0.10, handNear: [0.07, 0.26], handFar: [-0.06, 0.26], lean: 0.010 },
  walk3: { bob: 0, crouch: 0.006, footFront: -0.02, footBack: 0.02, handNear: [0.0, 0.29], handFar: [0.0, 0.29], lean: 0.006 },
  hold: { bob: 0, crouch: 0.020, footFront: 0.05, footBack: -0.05, handNear: [0.11, 0.22], handFar: [0.03, 0.23], lean: 0.004 },
  // Three steps between holding and fully wound up, so the charge reads as one
  // movement instead of the body snapping between two frames four times a second.
  wind1: { bob: -0.003, crouch: 0.045, footFront: 0.054, footBack: -0.054, handNear: [0.11, 0.17], handFar: [0.035, 0.18], lean: 0.009 },
  wind2: { bob: -0.006, crouch: 0.070, footFront: 0.055, footBack: -0.055, handNear: [0.105, 0.12], handFar: [0.035, 0.14], lean: 0.014 },
  wind: { bob: -0.008, crouch: 0.092, footFront: 0.055, footBack: -0.055, handNear: [0.10, 0.07], handFar: [0.035, 0.09], lean: 0.018 },
  // The balancing arm goes to the OPPOSITE side of the shooting arm, which is
  // what a person does and what stops the far hand being drawn over the face.
  release: { bob: 0.012, crouch: 0.0, footFront: 0.035, footBack: -0.035, handNear: [0.14, -0.26], handFar: [-0.11, 0.03], lean: -0.010 },
  follow: { bob: 0.006, crouch: 0.006, footFront: 0.035, footBack: -0.035, handNear: [0.13, -0.17], handFar: [-0.10, 0.11], lean: -0.006 },
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
  sockTop: 0.075,
} as const;

interface Skin {
  readonly tank: string;
  readonly tankShade: string;
  readonly shorts: string;
  readonly shortsShade: string;
  readonly hair: string;
}

const OUTLINE = 'rgba(28, 20, 12, 0.85)';

/**
 * Where the ball sits when this pose is holding it, as [across, up] fractions
 * of the figure's height measured from the point between the feet.
 *
 * It used to be a fixed offset in world metres, which put the ball two thirds of
 * a metre from the body and on the side away from the hands.
 */
export function ballAnchorFor(pose: PoseName): readonly [number, number] {
  const p = POSE_TABLE[pose];
  const across = BODY.shoulderHalfWidth * 0.82 + p.lean + p.handNear[0];
  const up = 1 - BODY.shoulderY - p.handNear[1] + p.bob;
  return [across, up];
}

/**
 * A limb that tapers from one end to the other, with a soft joint.
 *
 * Round line caps made every elbow and knee a ball wider than the limb itself,
 * which is most of why the friends read as wooden mannequins.
 */
function limb(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, x1: number, y1: number,
  width: number, colour: string,
  taper = 0.82,
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const w0 = width / 2;
  const w1 = (width * taper) / 2;
  const quad: readonly (readonly [number, number])[] = [
    [x0 + nx * w0, y0 + ny * w0],
    [x1 + nx * w1, y1 + ny * w1],
    [x1 - nx * w1, y1 - ny * w1],
    [x0 - nx * w0, y0 - ny * w0],
  ];

  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(quad[0]![0], quad[0]![1]);
  for (const [x, y] of quad.slice(1)) ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.stroke();

  // The joint at the far end, no wider than the limb, so knees and elbows bend
  // instead of bulging.
  ctx.beginPath();
  ctx.arc(x1, y1, w1, 0, Math.PI * 2);
  ctx.fillStyle = colour;
  ctx.fill();
}

function shape(
  ctx: CanvasRenderingContext2D,
  points: readonly (readonly [number, number])[],
  fill: string | CanvasGradient,
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

/**
 * Light falling across the body, left to right.
 *
 * The shading used to be a rectangle clipped to the silhouette and filled flat,
 * which left a hard vertical seam down the middle of the torso, the shorts and
 * the face — the single thing that most made these read as cut-out cardboard.
 */
function acrossBody(
  ctx: CanvasRenderingContext2D,
  leftX: number,
  rightX: number,
  shade: string,
  light: string,
): CanvasGradient {
  const gradient = ctx.createLinearGradient(leftX, 0, rightX, 0);
  gradient.addColorStop(0, shade);
  gradient.addColorStop(0.55, light);
  gradient.addColorStop(1, light);
  return gradient;
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

  // The bob lifts the WHOLE figure, feet included. Applied to `top` alone it
  // pushed the head down and left the feet planted, squashing the body instead
  // of lifting it — so cheering made the friend shorter.
  ctx.save();
  ctx.translate(0, -u(pose.bob));

  const sink = u(pose.crouch);
  const top = groundY - height + sink * 0.35;
  const lean = u(pose.lean);

  const headBottom = top + u(BODY.headHeight);
  const shoulderY = top + u(BODY.shoulderY);
  // The hips drop more than the shoulders, which is what bending your knees
  // looks like. Both moving together just made the whole person shorter.
  const hipY = top + u(BODY.hipY) + sink * 0.65;
  const shoulderHalf = u(BODY.shoulderHalfWidth);
  const waistHalf = u(BODY.waistHalfWidth);
  const armW = Math.max(2, u(BODY.armWidth));
  const legW = Math.max(3, u(BODY.legWidth));
  const shortsTop = hipY - u(0.085);
  const shortsBottom = hipY + u(0.115);

  // Both legs are laid out first, so the shorts can follow the stride instead of
  // hanging off the hips like a skirt.
  const legs = ([[pose.footBack, true], [pose.footFront, false]] as const).map(([offset, back]) => ({
    back,
    footX: cx + u(offset),
    hipX: cx + (back ? -waistHalf * 0.45 : waistHalf * 0.45) + lean * 0.4,
    kneeY: top + u(BODY.kneeY) + sink * 0.5,
  }));

  for (const leg of legs) {
    const kneeX = (leg.hipX + leg.footX) / 2;
    const tone = leg.back ? PALETTE.skinShade : PALETTE.skin;
    const ankleY = groundY - u(BODY.footHeight);
    limb(ctx, leg.hipX, hipY, kneeX, leg.kneeY, legW, tone);
    limb(ctx, kneeX, leg.kneeY, leg.footX, ankleY, legW * 0.85, tone);
    // A sock between ankle and calf. Nothing makes a shape read as a leg faster.
    const sockTopY = ankleY - u(BODY.sockTop);
    limb(ctx, leg.footX, sockTopY, leg.footX, ankleY, legW * 0.8, leg.back ? '#d8d4c6' : '#f1eee2', 1);
    shape(
      ctx,
      [
        [leg.footX - legW * 0.7, ankleY],
        [leg.footX + u(BODY.footLength) * 0.6, ankleY + u(BODY.footHeight) * 0.25],
        [leg.footX + u(BODY.footLength) * 0.6, groundY],
        [leg.footX - legW * 0.7, groundY],
      ],
      leg.back ? '#c8543f' : '#e0644b',
    );
  }

  // Shorts. One outline around both legs with a notch cut between them, not two
  // separate quads: two outlines meeting in the middle drew a dark bow tie at
  // the crotch. The hems follow each leg, so they move with the stride instead
  // of hanging off the hips like a skirt.
  const shortsFill = acrossBody(ctx, cx - waistHalf * 1.25, cx + waistHalf * 1.25, skin.shortsShade, skin.shorts);
  const crotchY = shortsBottom - u(0.055);
  const hemOf = (leg: (typeof legs)[number]) => leg.hipX + (leg.footX - leg.hipX) * 0.22;
  const leftLeg = legs[0]!.hipX <= legs[1]!.hipX ? legs[0]! : legs[1]!;
  const rightLeg = leftLeg === legs[0]! ? legs[1]! : legs[0]!;
  const leftHem = hemOf(leftLeg);
  const rightHem = hemOf(rightLeg);
  shape(
    ctx,
    [
      [cx - waistHalf * 1.05 + lean * 0.5, shortsTop],
      [cx + waistHalf * 1.05 + lean * 0.5, shortsTop],
      [rightHem + waistHalf * 0.62, shortsBottom],
      [rightHem - waistHalf * 0.18, shortsBottom],
      [cx + lean * 0.2, crotchY],
      [leftHem + waistHalf * 0.18, shortsBottom],
      [leftHem - waistHalf * 0.62, shortsBottom],
    ],
    shortsFill,
  );

  // Torso: narrow shoulders and a straight waist. Slim, not muscular.
  const torso: readonly (readonly [number, number])[] = [
    [cx - shoulderHalf + lean, shoulderY],
    [cx + shoulderHalf + lean, shoulderY],
    [cx + waistHalf + lean * 0.6, shortsTop + u(0.012)],
    [cx - waistHalf + lean * 0.6, shortsTop + u(0.012)],
  ];
  shape(ctx, torso, acrossBody(ctx, cx - shoulderHalf + lean, cx + shoulderHalf + lean, skin.tankShade, skin.tank));
  if (emblem === 'sun' && !backView) {
    const sx = cx + lean;
    const sy = shoulderY + (shortsTop - shoulderY) * 0.45;
    const r = u(0.026);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(torso[0]![0], torso[0]![1]);
    for (const [x, y] of torso.slice(1)) ctx.lineTo(x, y);
    ctx.closePath();
    ctx.clip();
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
    ctx.restore();
  }

  const drawArm = (hand: readonly [number, number], back: boolean) => {
    const shoulderX = cx + (back ? -shoulderHalf * 0.82 : shoulderHalf * 0.82) + lean;
    const handX = shoulderX + u(hand[0]);
    const handY = shoulderY + u(hand[1]);
    // The elbow bows away from the body, so it has to follow the hand: a fixed
    // offset bent the arm the wrong way whenever the hand crossed over.
    const bow = Math.sign(handX - shoulderX || 1) * u(0.022);
    const elbowX = (shoulderX + handX) / 2 + bow;
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
  limb(ctx, headX, headBottom - u(0.006), cx + lean, shoulderY + u(0.012), u(BODY.neck) * 1.7, PALETTE.skinShade, 1);

  // A jaw rather than a box: narrower at the chin and rounded into it.
  const crown = top + u(0.022);
  const jawHalf = headHalf * 0.72;
  ctx.beginPath();
  ctx.moveTo(headX - headHalf, crown);
  ctx.lineTo(headX + headHalf, crown);
  ctx.lineTo(headX + headHalf * 0.94, headBottom - u(0.030));
  ctx.quadraticCurveTo(headX + jawHalf * 0.9, headBottom, headX, headBottom);
  ctx.quadraticCurveTo(headX - jawHalf * 0.9, headBottom, headX - headHalf * 0.94, headBottom - u(0.030));
  ctx.closePath();
  ctx.fillStyle = acrossBody(ctx, headX - headHalf, headX + headHalf, PALETTE.skinShade, PALETTE.skin);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Hair with some volume: a base cap plus a shifted fringe.
  ctx.fillStyle = skin.hair;
  ctx.beginPath();
  ctx.ellipse(headX, top + u(0.046), headHalf * 1.14, u(0.036), 0, Math.PI, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(headX + headHalf * 0.34, top + u(0.040), headHalf * 0.78, u(0.028), -0.22, Math.PI, 0);
  ctx.fill();
  if (backView) {
    ctx.fillRect(headX - headHalf * 1.05, top + u(0.032), headHalf * 2.1, u(BODY.headHeight) * 0.68);
  } else {
    const eyeY = top + u(0.078);
    ctx.fillStyle = '#2a2018';
    const eye = Math.max(1, u(0.010));
    ctx.fillRect(headX - headHalf * 0.55, eyeY, eye, eye * 1.2);
    ctx.fillRect(headX + headHalf * 0.2, eyeY, eye, eye * 1.2);
  }
  if (headband) {
    ctx.fillStyle = '#cc3b2f';
    ctx.fillRect(headX - headHalf * 1.12, top + u(0.056), headHalf * 2.24, Math.max(2, u(0.018)));
  }

  drawArm(pose.handNear, false);
  ctx.restore();
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
