/**
 * Procedural development sprites for the four friends, the spectator and the dog.
 *
 * These are PLACEHOLDERS. They keep the silhouette, build, clothing and pixel
 * density the reference calls for so the game can be played and reviewed, but
 * they are not the hand-drawn arcade artwork. Faces, shading volume and the
 * digitised-sprite look of the reference are not reproduced here.
 * See docs/ASSET_REQUESTS.md for what has to replace them.
 */

import { CHARACTERS, DOG, KID, PALETTE, type CharacterKey } from './palette';
import { createSurface, rect, type PixelSurface } from './pixelCanvas';

export type PoseName = 'idle0' | 'idle1' | 'walk0' | 'walk1' | 'walk2' | 'walk3' | 'hold' | 'wind' | 'release' | 'follow' | 'cheer';

export const POSES: readonly PoseName[] = [
  'idle0', 'idle1', 'walk0', 'walk1', 'walk2', 'walk3', 'hold', 'wind', 'release', 'follow', 'cheer',
];

export const WALK_CYCLE: readonly PoseName[] = ['walk0', 'walk1', 'walk2', 'walk3'];
export const IDLE_CYCLE: readonly PoseName[] = ['idle0', 'idle1'];

interface Pose {
  /** Vertical bob of the whole body, in body units (fraction of height). */
  readonly bob: number;
  /** Knee bend, 0 = straight. */
  readonly crouch: number;
  /** Forward/back offset of each foot, in body units. */
  readonly footFront: number;
  readonly footBack: number;
  /** Shoulder-to-hand offsets for each arm: [dx, dy] in body units. */
  readonly armNear: readonly [number, number];
  readonly armFar: readonly [number, number];
  readonly lean: number;
}

const POSE_TABLE: Readonly<Record<PoseName, Pose>> = {
  idle0: { bob: 0, crouch: 0.01, footFront: 0.02, footBack: -0.02, armNear: [0.05, 0.2], armFar: [-0.05, 0.2], lean: 0 },
  idle1: { bob: 0.008, crouch: 0.02, footFront: 0.02, footBack: -0.02, armNear: [0.05, 0.19], armFar: [-0.05, 0.19], lean: 0 },
  walk0: { bob: 0.012, crouch: 0.02, footFront: 0.09, footBack: -0.09, armNear: [-0.06, 0.17], armFar: [0.07, 0.17], lean: 0.012 },
  walk1: { bob: 0, crouch: 0.005, footFront: 0.02, footBack: -0.02, armNear: [0.0, 0.2], armFar: [0.0, 0.2], lean: 0.008 },
  walk2: { bob: 0.012, crouch: 0.02, footFront: -0.09, footBack: 0.09, armNear: [0.07, 0.17], armFar: [-0.06, 0.17], lean: 0.012 },
  walk3: { bob: 0, crouch: 0.005, footFront: -0.02, footBack: 0.02, armNear: [0.0, 0.2], armFar: [0.0, 0.2], lean: 0.008 },
  hold: { bob: 0, crouch: 0.02, footFront: 0.04, footBack: -0.04, armNear: [0.1, 0.16], armFar: [0.02, 0.16], lean: 0.004 },
  wind: { bob: -0.006, crouch: 0.055, footFront: 0.045, footBack: -0.045, armNear: [0.09, 0.03], armFar: [0.03, 0.03], lean: 0.02 },
  release: { bob: 0.01, crouch: 0.0, footFront: 0.03, footBack: -0.03, armNear: [0.07, -0.16], armFar: [0.02, -0.14], lean: -0.01 },
  follow: { bob: 0.004, crouch: 0.005, footFront: 0.03, footBack: -0.03, armNear: [0.1, -0.12], armFar: [0.04, -0.1], lean: -0.006 },
  cheer: { bob: 0.014, crouch: 0.0, footFront: 0.06, footBack: -0.06, armNear: [0.22, -0.24], armFar: [-0.22, -0.24], lean: 0 },
};

export interface SpriteFrame {
  readonly surface: PixelSurface;
  /** Pivot inside the surface: the point that sits on the ground, in art pixels. */
  readonly pivotX: number;
  readonly pivotY: number;
}

interface Skin {
  readonly tank: string;
  readonly tankShade: string;
  readonly shorts: string;
  readonly shortsShade: string;
  readonly hair: string;
}

/**
 * Draws one adult. `height` is the full standing height in art pixels; every
 * proportion derives from it, so the same routine produces every size tier at a
 * whole-pixel scale instead of resampling one bitmap.
 */
function drawAdult(
  ctx: CanvasRenderingContext2D,
  cx: number,
  groundY: number,
  height: number,
  skin: Skin,
  pose: Pose,
  facingLeft: boolean,
  backView: boolean,
  emblem: 'none' | 'sun',
): void {
  const u = (v: number) => v * height;
  const dir = facingLeft ? -1 : 1;
  const top = groundY - height + u(pose.bob);

  const headH = u(0.145);
  const headW = u(0.115);
  const neckY = top + headH;
  const hipY = top + u(0.5) + u(pose.crouch);
  const shoulderY = neckY + u(0.03);
  const torsoW = u(0.175);
  const limbW = Math.max(2, Math.round(u(0.045)));
  const lean = u(pose.lean) * dir;

  // Legs.
  const legTop = hipY;
  const legLen = groundY - legTop;
  for (const [offset, shade] of [
    [pose.footBack, true],
    [pose.footFront, false],
  ] as const) {
    const footX = cx + u(offset) * dir;
    const kneeX = cx + u(offset) * dir * 0.5;
    const kneeY = legTop + legLen * 0.52;
    rect(ctx, kneeX - limbW / 2, legTop, limbW, kneeY - legTop + 1, shade ? PALETTE.skinShade : PALETTE.skin);
    rect(ctx, footX - limbW / 2, kneeY, limbW, groundY - kneeY, shade ? PALETTE.skinShade : PALETTE.skin);
    // Shoe.
    rect(ctx, footX - limbW / 2 - 1, groundY - Math.max(2, u(0.028)), limbW + 3, Math.max(2, u(0.028)), '#e9e6dc');
    rect(ctx, footX - limbW / 2 - 1, groundY - 1, limbW + 3, 1, '#3c3c42');
  }

  // Shorts.
  const shortsTop = hipY - u(0.085);
  const shortsH = u(0.14);
  rect(ctx, cx - torsoW / 2 + lean * 0.4, shortsTop, torsoW, shortsH, skin.shorts);
  rect(ctx, cx - torsoW / 2 + lean * 0.4, shortsTop, Math.max(1, torsoW * 0.28), shortsH, skin.shortsShade);
  rect(ctx, cx - torsoW / 2 + lean * 0.4, shortsTop + shortsH - 1, torsoW, 1, skin.shortsShade);

  // Torso: slim build, never a bodybuilder silhouette.
  const torsoTop = shoulderY;
  const torsoH = shortsTop - torsoTop + 1;
  rect(ctx, cx - torsoW / 2 + lean, torsoTop, torsoW, torsoH, skin.tank);
  rect(ctx, cx - torsoW / 2 + lean, torsoTop, Math.max(1, torsoW * 0.3), torsoH, skin.tankShade);
  // Tank straps leave the shoulders bare.
  rect(ctx, cx - torsoW / 2 + lean, torsoTop, torsoW, Math.max(1, u(0.012)), skin.tankShade);
  if (emblem === 'sun' && !backView) {
    const sx = cx + lean;
    const sy = torsoTop + torsoH * 0.42;
    const r = Math.max(2, u(0.035));
    rect(ctx, sx - r / 2, sy - r / 2, r, r, '#ffcf3f');
    rect(ctx, sx - r, sy - 1, r * 2, 1, '#ffcf3f');
    rect(ctx, sx - 1, sy - r, 1, r * 2, '#ffcf3f');
  }

  // Arms.
  for (const [offset, shade] of [
    [pose.armFar, true],
    [pose.armNear, false],
  ] as const) {
    const shoulderX = cx + (shade ? -torsoW * 0.42 : torsoW * 0.42) + lean;
    const handX = shoulderX + u(offset[0]) * dir;
    const handY = shoulderY + u(offset[1]);
    const elbowX = (shoulderX + handX) / 2 + u(0.02) * dir;
    const elbowY = (shoulderY + handY) / 2 + u(0.02);
    drawLimb(ctx, shoulderX, shoulderY + 1, elbowX, elbowY, limbW + 1, PALETTE.hairDark);
    drawLimb(ctx, elbowX, elbowY, handX, handY, limbW + 1, PALETTE.hairDark);
    drawLimb(ctx, shoulderX, shoulderY + 1, elbowX, elbowY, limbW - 1, shade ? PALETTE.skinShade : PALETTE.skin);
    drawLimb(ctx, elbowX, elbowY, handX, handY, limbW - 1, shade ? PALETTE.skinShade : PALETTE.skin);
    // Hand.
    rect(ctx, handX - limbW / 2, handY - limbW / 2, limbW, limbW, shade ? PALETTE.skinShade : PALETTE.skin);
  }

  // Head.
  const headX = cx + lean * 1.4;
  rect(ctx, headX - headW / 2, top, headW, headH, PALETTE.skin);
  rect(ctx, headX - headW / 2, top, Math.max(1, headW * 0.3), headH, PALETTE.skinShade);
  rect(ctx, headX - headW / 2 - 1, top, headW + 2, Math.max(2, headH * 0.34), skin.hair);
  if (!backView) {
    const eyeY = top + headH * 0.5;
    rect(ctx, headX - headW * 0.26 * dir, eyeY, 1, 1, '#2a2118');
    rect(ctx, headX + headW * 0.14 * dir, eyeY, 1, 1, '#2a2118');
  } else {
    rect(ctx, headX - headW / 2 - 1, top, headW + 2, headH * 0.62, skin.hair);
  }
  // Neck.
  rect(ctx, headX - 1, top + headH - 1, 3, Math.max(1, u(0.02)), PALETTE.skinShade);
}

function drawLimb(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  width: number,
  colour: string,
): void {
  const steps = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0)));
  const w = Math.max(1, Math.round(width));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    rect(ctx, x0 + (x1 - x0) * t - w / 2, y0 + (y1 - y0) * t - w / 2, w, w, colour);
  }
}

/** Transparent padding around every character cell, in art pixels. */
export const CHARACTER_MARGIN = 14;
const MARGIN = CHARACTER_MARGIN;

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

/** Paints one adult into an existing context, at the given cell anchor. */
export function paintAdult(
  ctx: CanvasRenderingContext2D,
  cx: number,
  groundY: number,
  height: number,
  options: AdultOptions,
  pose: PoseName,
): void {
  const skin = CHARACTERS[options.character];
  const emblem = options.character === 'b' ? 'sun' : 'none';
  drawAdult(ctx, cx, groundY, height, skin, POSE_TABLE[pose], options.facingLeft, options.backView, emblem);
  if (options.character === 'c') {
    // Red headband.
    const top = groundY - height + POSE_TABLE[pose].bob * height;
    const headW = height * 0.115;
    rect(ctx, cx - headW / 2 - 1, top + height * 0.042, headW + 2, Math.max(1, height * 0.024), '#cc3b2f');
  }
}

export function buildAdultFrame(options: AdultOptions, pose: PoseName, height: number): SpriteFrame {
  return frameFor(height, (ctx, cx, groundY) => {
    paintAdult(ctx, cx, groundY, height, options, pose);
  });
}

/** The 13-year-old spectator, in a full River Plate kit. Shorter, teenage build. */
export function buildKidFrame(pose: KidPose, height: number): SpriteFrame {
  return frameFor(height, (ctx, cx, groundY) => paintKid(ctx, cx, groundY, height, pose));
}

export type KidPose = 'idle0' | 'idle1' | 'cheer';
export const KID_POSES: readonly KidPose[] = ['idle0', 'idle1', 'cheer'];

export function paintKid(
  ctx: CanvasRenderingContext2D,
  cx: number,
  groundY: number,
  height: number,
  pose: KidPose,
): void {
  {
    const p = POSE_TABLE[pose];
    const u = (v: number) => v * height;
    const top = groundY - height + u(p.bob);
    const headH = u(0.17);
    const headW = u(0.13);
    const shoulderY = top + headH + u(0.028);
    const hipY = top + u(0.52);
    const torsoW = u(0.185);
    const limbW = Math.max(2, Math.round(u(0.05)));

    // Legs with long white socks and boots.
    for (const [offset, shade] of [[p.footBack, true], [p.footFront, false]] as const) {
      const footX = cx + u(offset);
      const kneeY = hipY + (groundY - hipY) * 0.5;
      rect(ctx, footX - limbW / 2, hipY, limbW, kneeY - hipY, shade ? PALETTE.skinShade : PALETTE.skin);
      rect(ctx, footX - limbW / 2, kneeY, limbW, groundY - kneeY - u(0.05), KID.socks);
      rect(ctx, footX - limbW / 2, kneeY + 1, limbW, 1, KID.sockTrim);
      rect(ctx, footX - limbW / 2 - 1, groundY - u(0.05), limbW + 3, u(0.05), KID.boots);
    }

    // Black shorts.
    rect(ctx, cx - torsoW / 2, hipY - u(0.09), torsoW, u(0.13), KID.shorts);

    // White shirt with the red diagonal band and a small crest.
    const torsoTop = shoulderY;
    const torsoH = hipY - u(0.09) - torsoTop + 1;
    rect(ctx, cx - torsoW / 2, torsoTop, torsoW, torsoH, KID.shirt);
    rect(ctx, cx - torsoW / 2, torsoTop, Math.max(1, torsoW * 0.26), torsoH, KID.shirtShade);
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx - torsoW / 2, torsoTop, torsoW, torsoH);
    ctx.clip();
    ctx.fillStyle = KID.band;
    ctx.beginPath();
    ctx.moveTo(cx - torsoW / 2 - 1, torsoTop + torsoH * 0.18);
    ctx.lineTo(cx - torsoW / 2 - 1 + torsoW * 0.44, torsoTop + torsoH * 0.18);
    ctx.lineTo(cx + torsoW / 2 + 1, torsoTop + torsoH);
    ctx.lineTo(cx + torsoW / 2 + 1 - torsoW * 0.44, torsoTop + torsoH);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    rect(ctx, cx + torsoW * 0.16, torsoTop + torsoH * 0.2, Math.max(2, u(0.03)), Math.max(2, u(0.035)), '#d9b53c');

    // Arms.
    for (const [offset, shade] of [[p.armFar, true], [p.armNear, false]] as const) {
      const shoulderX = cx + (shade ? -torsoW * 0.44 : torsoW * 0.44);
      const handX = shoulderX + u(offset[0]);
      const handY = shoulderY + u(offset[1]);
      drawLimb(ctx, shoulderX, shoulderY, handX, handY, limbW - 1, shade ? PALETTE.skinShade : PALETTE.skin);
    }

    // Head.
    rect(ctx, cx - headW / 2, top, headW, headH, PALETTE.skin);
    rect(ctx, cx - headW / 2, top, Math.max(1, headW * 0.3), headH, PALETTE.skinShade);
    rect(ctx, cx - headW / 2 - 1, top, headW + 2, Math.max(2, headH * 0.36), KID.hair);
    rect(ctx, cx - headW * 0.26, top + headH * 0.52, 1, 1, '#2a2118');
    rect(ctx, cx + headW * 0.16, top + headH * 0.52, 1, 1, '#2a2118');
  }
}

/**
 * The dog: short-haired mixed breed with a shepherd look. Erect triangular ears,
 * long dark muzzle, dark brindle coat, cream chest and white front paw tips.
 * The coat is short and flat everywhere, including neck and tail.
 */
export type DogPose = 'idle0' | 'idle1';
export const DOG_POSES: readonly DogPose[] = ['idle0', 'idle1'];

export function buildDogFrame(pose: DogPose, height: number): SpriteFrame {
  const wag = pose === 'idle1' ? 1 : -1;
  const width = Math.round(height * 1.9) + MARGIN * 2;
  const surfaceHeight = Math.round(height) + MARGIN * 2;
  const surface = createSurface(width, surfaceHeight);
  const ctx = surface.ctx;
  const groundY = surfaceHeight - MARGIN;
  const cx = width / 2;
  const u = (v: number) => v * height;

  const bodyTop = groundY - u(0.62);
  const bodyH = u(0.34);
  const bodyLeft = cx - u(0.62);
  const bodyW = u(1.12);

  // Legs (short coat, no feathering).
  for (const lx of [bodyLeft + u(0.12), bodyLeft + u(0.3), bodyLeft + bodyW - u(0.3), bodyLeft + bodyW - u(0.14)]) {
    rect(ctx, lx, bodyTop + bodyH - 1, Math.max(2, u(0.1)), groundY - bodyTop - bodyH + 1, DOG.coat);
    rect(ctx, lx, groundY - Math.max(1, u(0.06)), Math.max(2, u(0.1)), Math.max(1, u(0.06)), DOG.paw);
  }

  // Body.
  rect(ctx, bodyLeft, bodyTop, bodyW, bodyH, DOG.coat);
  rect(ctx, bodyLeft, bodyTop, bodyW, Math.max(1, bodyH * 0.3), DOG.coatDark);
  rect(ctx, bodyLeft + bodyW * 0.42, bodyTop + bodyH * 0.35, bodyW * 0.22, bodyH * 0.55, DOG.brindle);
  // Cream chest.
  rect(ctx, bodyLeft + bodyW - u(0.26), bodyTop + bodyH * 0.45, u(0.2), bodyH * 0.6, DOG.chest);

  // Tail: short-coated, thin, wagging between frames.
  drawLimb(ctx, bodyLeft + 2, bodyTop + bodyH * 0.25, bodyLeft - u(0.24), bodyTop - u(0.06) * wag, Math.max(2, u(0.075)), DOG.coat);

  // Neck and head.
  const headX = bodyLeft + bodyW - u(0.06);
  const headY = bodyTop - u(0.2);
  const headW = u(0.3);
  const headH = u(0.26);
  drawLimb(ctx, bodyLeft + bodyW - u(0.16), bodyTop + u(0.06), headX, headY + headH * 0.7, Math.max(3, u(0.15)), DOG.coat);
  rect(ctx, headX - headW * 0.5, headY, headW, headH, DOG.coat);
  rect(ctx, headX - headW * 0.5, headY, headW, Math.max(1, headH * 0.34), DOG.coatDark);
  // Long dark muzzle.
  rect(ctx, headX + headW * 0.3, headY + headH * 0.42, u(0.22), headH * 0.46, DOG.muzzle);
  rect(ctx, headX + headW * 0.46, headY + headH * 0.46, u(0.06), Math.max(1, u(0.05)), '#0f0b08');
  // Erect triangular ears.
  for (const ex of [headX - headW * 0.42, headX - headW * 0.02]) {
    ctx.fillStyle = DOG.coatDark;
    ctx.beginPath();
    ctx.moveTo(Math.round(ex), Math.round(headY + 1));
    ctx.lineTo(Math.round(ex + u(0.11)), Math.round(headY + 1));
    ctx.lineTo(Math.round(ex + u(0.055)), Math.round(headY - u(0.16)));
    ctx.closePath();
    ctx.fill();
  }
  rect(ctx, headX + headW * 0.12, headY + headH * 0.42, 1, 1, DOG.eye);

  return { surface, pivotX: cx, pivotY: groundY };
}
