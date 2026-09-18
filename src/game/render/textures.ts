/**
 * Builds and registers every texture the game uses.
 *
 * Character frames are packed into one atlas per character, with one row per
 * size tier. Sprites are never displayed at a fractional scale: a character that
 * stands further away uses a shorter tier that was drawn at that size, so the
 * pixel grid stays the same everywhere on screen.
 */

import Phaser from 'phaser';
import { BALL, PROPS } from '../config/court';
import type { CourtProjection } from '../sim/projection';
import {
  CHARACTER_MARGIN,
  DOG_POSES,
  KID_POSES,
  POSES,
  buildDogFrame,
  buildKidFrame,
  paintAdult,
  type DogPose,
  type KidPose,
  type PoseName,
} from './characters';
import type { CharacterKey } from './palette';
import { ART_SCALE, createSurface, registerTexture, type PixelSurface } from './pixelCanvas';
import {
  buildBall,
  buildCrate,
  buildHoop,
  buildLogo,
  buildSmallProps,
  buildSpotMarker,
  buildTrophy,
} from './objects';
import { buildScenePlate } from './plate';

export const CHARACTER_KEYS: readonly CharacterKey[] = ['a', 'b', 'c', 'd'];

/** Standing heights in art pixels the adults are drawn at. */
export const CHARACTER_TIERS: readonly number[] = [48, 51, 54, 57, 60, 63, 66, 69];
/** Ball diameters in art pixels. */
export const BALL_TIERS: readonly number[] = [7, 8, 9, 10, 11, 12];
export const BALL_SPINS = 4;

export const ADULT_HEIGHT_METRES = 1.75;
export const KID_HEIGHT_METRES = 1.55;
export const DOG_HEIGHT_METRES = 0.56;

const CELL_WIDTH = Math.round(Math.max(...CHARACTER_TIERS) * 0.85) + CHARACTER_MARGIN * 2;
const CELL_HEIGHT = Math.max(...CHARACTER_TIERS) + CHARACTER_MARGIN * 2;

export const CHARACTER_ORIGIN_X = 0.5;
export const CHARACTER_ORIGIN_Y = (CELL_HEIGHT - CHARACTER_MARGIN) / CELL_HEIGHT;

export const TEXTURE_KEYS = {
  plateBackground: 'plate-background',
  plateForeground: 'plate-foreground',
  hoopBack: 'hoop-back',
  hoopFront: 'hoop-front',
  logo: 'chubol-logo',
  trophy: 'trophy-table',
  crate: 'crate',
  wateringCan: 'watering-can',
  football: 'football-decor',
  spotMarker: 'spot-marker',
  kid: 'kid-river',
  dog: 'dog',
} as const;

export const characterTextureKey = (character: CharacterKey, back = false): string =>
  `friend-${character}${back ? '-back' : ''}`;

export const characterFrameName = (pose: PoseName, tierIndex: number): string => `${pose}_${tierIndex}`;

export const ballTextureKey = (tierIndex: number, spinIndex: number): string => `ball-${tierIndex}-${spinIndex}`;

/** Index of the size tier whose drawn height is closest to `logicalHeight`. */
export function pickTier(tiers: readonly number[], logicalHeight: number): number {
  const target = logicalHeight / ART_SCALE;
  let best = 0;
  let bestDelta = Infinity;
  tiers.forEach((tier, index) => {
    const delta = Math.abs(tier - target);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = index;
    }
  });
  return best;
}

/** Displayed height in logical pixels of the tier that was chosen. */
export const tierLogicalHeight = (tiers: readonly number[], index: number): number =>
  (tiers[index] ?? tiers[0]!) * ART_SCALE;

function buildCharacterAtlas(character: CharacterKey, backView: boolean): PixelSurface {
  const surface = createSurface(CELL_WIDTH * POSES.length, CELL_HEIGHT * CHARACTER_TIERS.length);
  CHARACTER_TIERS.forEach((height, row) => {
    POSES.forEach((pose, col) => {
      const cx = col * CELL_WIDTH + CELL_WIDTH / 2;
      const groundY = row * CELL_HEIGHT + CELL_HEIGHT - CHARACTER_MARGIN;
      paintAdult(surface.ctx, cx, groundY, height, { character, facingLeft: true, backView }, pose);
    });
  });
  return surface;
}

function registerCharacterAtlas(scene: Phaser.Scene, key: string, surface: PixelSurface): void {
  registerTexture(scene, key, surface);
  const texture = scene.textures.get(key);
  CHARACTER_TIERS.forEach((_, row) => {
    POSES.forEach((pose, col) => {
      texture.add(characterFrameName(pose, row), 0, col * CELL_WIDTH, row * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);
    });
  });
}

export interface SpriteOrigin {
  readonly originX: number;
  readonly originY: number;
}

export interface BuiltTextures {
  readonly kidOrigin: SpriteOrigin;
  readonly dogOrigin: SpriteOrigin;
  readonly trophyOrigin: SpriteOrigin;
  readonly crateOrigin: SpriteOrigin;
  readonly canOrigin: SpriteOrigin;
  readonly footballOrigin: SpriteOrigin;
  readonly logoSize: { readonly width: number; readonly height: number };
}

const originOf = (frame: { surface: PixelSurface; pivotX: number; pivotY: number }): SpriteOrigin => ({
  originX: frame.pivotX / frame.surface.width,
  originY: frame.pivotY / frame.surface.height,
});

/** Builds every texture. Safe to call again: existing keys are replaced. */
export function buildAllTextures(scene: Phaser.Scene, projection: CourtProjection): BuiltTextures {
  const plate = buildScenePlate(projection);
  registerTexture(scene, TEXTURE_KEYS.plateBackground, plate.background);
  registerTexture(scene, TEXTURE_KEYS.plateForeground, plate.foreground);

  const hoop = buildHoop(projection);
  registerTexture(scene, TEXTURE_KEYS.hoopBack, hoop.back);
  registerTexture(scene, TEXTURE_KEYS.hoopFront, hoop.front);

  for (const character of CHARACTER_KEYS) {
    registerCharacterAtlas(scene, characterTextureKey(character), buildCharacterAtlas(character, false));
  }
  // Only the friend in the foreground is shown from behind in the reference frame.
  registerCharacterAtlas(scene, characterTextureKey('d', true), buildCharacterAtlas('d', true));

  const kidHeight = Math.round((projection.project(PROPS.kid.x, PROPS.kid.y, 0).scale * KID_HEIGHT_METRES) / ART_SCALE);
  const kidFrames = KID_POSES.map((pose: KidPose) => buildKidFrame(pose, kidHeight));
  const kidAtlasCellW = Math.max(...kidFrames.map((f) => f.surface.width));
  const kidAtlasCellH = Math.max(...kidFrames.map((f) => f.surface.height));
  const kidAtlas = createSurface(kidAtlasCellW * kidFrames.length, kidAtlasCellH);
  kidFrames.forEach((frame, index) => {
    kidAtlas.ctx.drawImage(frame.surface.canvas, index * kidAtlasCellW, 0);
  });
  registerTexture(scene, TEXTURE_KEYS.kid, kidAtlas);
  const kidTexture = scene.textures.get(TEXTURE_KEYS.kid);
  KID_POSES.forEach((pose, index) => {
    kidTexture.add(pose, 0, index * kidAtlasCellW, 0, kidAtlasCellW, kidAtlasCellH);
  });

  const dogHeight = Math.round((projection.project(PROPS.dog.x, PROPS.dog.y, 0).scale * DOG_HEIGHT_METRES) / ART_SCALE);
  const dogFrames = DOG_POSES.map((pose: DogPose) => buildDogFrame(pose, dogHeight));
  const dogCellW = Math.max(...dogFrames.map((f) => f.surface.width));
  const dogCellH = Math.max(...dogFrames.map((f) => f.surface.height));
  const dogAtlas = createSurface(dogCellW * dogFrames.length, dogCellH);
  dogFrames.forEach((frame, index) => {
    dogAtlas.ctx.drawImage(frame.surface.canvas, index * dogCellW, 0);
  });
  registerTexture(scene, TEXTURE_KEYS.dog, dogAtlas);
  const dogTexture = scene.textures.get(TEXTURE_KEYS.dog);
  DOG_POSES.forEach((pose, index) => {
    dogTexture.add(pose, 0, index * dogCellW, 0, dogCellW, dogCellH);
  });

  BALL_TIERS.forEach((diameter, tierIndex) => {
    for (let spin = 0; spin < BALL_SPINS; spin += 1) {
      const frame = buildBall(diameter, (spin / BALL_SPINS) * Math.PI);
      registerTexture(scene, ballTextureKey(tierIndex, spin), frame.surface);
    }
  });

  const trophy = buildTrophy(projection, PROPS.trophyTable.x, PROPS.trophyTable.y);
  registerTexture(scene, TEXTURE_KEYS.trophy, trophy.surface);
  const crate = buildCrate(projection, PROPS.crate.x, PROPS.crate.y);
  registerTexture(scene, TEXTURE_KEYS.crate, crate.surface);
  const can = buildSmallProps(projection, PROPS.wateringCan.x, PROPS.wateringCan.y, 'can');
  registerTexture(scene, TEXTURE_KEYS.wateringCan, can.surface);
  const football = buildSmallProps(projection, PROPS.footballDecor.x, PROPS.footballDecor.y, 'football');
  registerTexture(scene, TEXTURE_KEYS.football, football.surface);

  const marker = buildSpotMarker(projection, 5, 0, 0.95);
  registerTexture(scene, TEXTURE_KEYS.spotMarker, marker.surface);

  const logo = buildLogo();
  registerTexture(scene, TEXTURE_KEYS.logo, logo.surface);

  const firstKid = kidFrames[0]!;
  const firstDog = dogFrames[0]!;

  return {
    kidOrigin: { originX: firstKid.pivotX / kidAtlasCellW, originY: firstKid.pivotY / kidAtlasCellH },
    dogOrigin: { originX: firstDog.pivotX / dogCellW, originY: firstDog.pivotY / dogCellH },
    trophyOrigin: originOf(trophy),
    crateOrigin: originOf(crate),
    canOrigin: originOf(can),
    footballOrigin: originOf(football),
    logoSize: { width: logo.surface.width * ART_SCALE, height: logo.surface.height * ART_SCALE },
  };
}

/** Diameter in logical pixels of the ball tier picked for a given depth scale. */
export function ballLogicalDiameter(tierIndex: number): number {
  return (BALL_TIERS[tierIndex] ?? BALL_TIERS[0]!) * ART_SCALE;
}

export const ballDiameterMetres = BALL.radius * 2;
