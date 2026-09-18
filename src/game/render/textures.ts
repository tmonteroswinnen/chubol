/**
 * Builds and registers the textures the game draws on top of the supplied plate.
 *
 * The background, the foreground wall and the front of the hoop are real
 * artwork, loaded as files (see BootScene). What is generated here is only what
 * the artwork does not yet contain: the four adults and the game ball, which are
 * PLACEHOLDERS and are badged as such in every scene.
 *
 * Note on scale: an earlier version drew sprites at several whole-pixel sizes to
 * keep a chunky pixel grid intact. The supplied plate turned out to be a
 * high-resolution illustration rather than a low-resolution pixel grid, so
 * sprites are now authored once at a canonical size and scaled smoothly to
 * match the depth, which is what sits correctly inside this artwork.
 */

import Phaser from 'phaser';
import { BALL } from '../config/court';
import { POSES, paintAdult, type PoseName } from './characters';
import type { CharacterKey } from './palette';
import { createSurface, registerTexture, type PixelSurface } from './pixelCanvas';
import { buildBall, buildSpotMarker } from './objects';

export const CHARACTER_KEYS: readonly CharacterKey[] = ['a', 'b', 'c', 'd'];

/** Canonical drawn height of an adult, in logical pixels. Scaled down per depth. */
export const CHARACTER_CANONICAL_HEIGHT = 300;
/** Canonical drawn diameter of the ball, in logical pixels. */
export const BALL_CANONICAL_DIAMETER = 44;
export const BALL_SPINS = 6;

export const ADULT_HEIGHT_METRES = 1.75;

const MARGIN = 26;
const CELL_WIDTH = Math.round(CHARACTER_CANONICAL_HEIGHT * 0.85) + MARGIN * 2;
const CELL_HEIGHT = CHARACTER_CANONICAL_HEIGHT + MARGIN * 2;

export const CHARACTER_ORIGIN_X = 0.5;
export const CHARACTER_ORIGIN_Y = (CELL_HEIGHT - MARGIN) / CELL_HEIGHT;

export const TEXTURE_KEYS = {
  plate: 'court-plate',
  plateForeground: 'court-foreground',
  hoopFront: 'hoop-front',
  spotMarker: 'spot-marker',
} as const;

export const characterTextureKey = (character: CharacterKey, back = false): string =>
  `friend-${character}${back ? '-back' : ''}`;

export const ballTextureKey = (spinIndex: number): string => `ball-${spinIndex}`;

/** Scale to apply to a character sprite so it stands `logicalHeight` tall. */
export const characterScale = (logicalHeight: number): number => logicalHeight / CHARACTER_CANONICAL_HEIGHT;

function buildCharacterAtlas(character: CharacterKey, backView: boolean): PixelSurface {
  const surface = createSurface(CELL_WIDTH * POSES.length, CELL_HEIGHT);
  POSES.forEach((pose: PoseName, col) => {
    const cx = col * CELL_WIDTH + CELL_WIDTH / 2;
    const groundY = CELL_HEIGHT - MARGIN;
    paintAdult(surface.ctx, cx, groundY, CHARACTER_CANONICAL_HEIGHT, { character, facingLeft: true, backView }, pose);
  });
  return surface;
}

function registerCharacterAtlas(scene: Phaser.Scene, key: string, surface: PixelSurface): void {
  registerTexture(scene, key, surface, Phaser.Textures.FilterMode.LINEAR);
  const texture = scene.textures.get(key);
  POSES.forEach((pose, col) => {
    texture.add(pose, 0, col * CELL_WIDTH, 0, CELL_WIDTH, CELL_HEIGHT);
  });
}

/** Builds every generated texture. Safe to call again: existing keys are replaced. */
export function buildAllTextures(scene: Phaser.Scene): void {
  for (const character of CHARACTER_KEYS) {
    registerCharacterAtlas(scene, characterTextureKey(character), buildCharacterAtlas(character, false));
  }
  // Only the friend in the foreground is shown from behind in the reference frame.
  registerCharacterAtlas(scene, characterTextureKey('d', true), buildCharacterAtlas('d', true));

  for (let spin = 0; spin < BALL_SPINS; spin += 1) {
    const frame = buildBall(BALL_CANONICAL_DIAMETER, (spin / BALL_SPINS) * Math.PI);
    registerTexture(scene, ballTextureKey(spin), frame.surface, Phaser.Textures.FilterMode.LINEAR);
  }

  const marker = buildSpotMarker(120);
  registerTexture(scene, TEXTURE_KEYS.spotMarker, marker.surface, Phaser.Textures.FilterMode.LINEAR);
}

export const ballDiameterMetres = BALL.radius * 2;
