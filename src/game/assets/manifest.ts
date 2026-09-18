/**
 * Asset manifest.
 *
 * Every entry names a file the finished game expects, what it is for, its size,
 * its pivot and where it comes from. Nothing here has been produced yet: this
 * session has no image generation or image editing tool, and the three reference
 * images are not in the checkout either, so every entry is `missing` and the game
 * runs on the procedural development art instead.
 *
 * The loader probes each path before asking Phaser to load it, so a missing file
 * is a known state rather than a failed request in the console.
 */

import { AVAILABLE_FILES } from 'virtual:chubol-assets';

export type AssetStatus = 'missing' | 'available';

export interface AssetEntry {
  readonly key: string;
  readonly path: string;
  readonly use: string;
  /** Expected size in logical pixels of the 1536 x 1024 frame. */
  readonly size: readonly [number, number] | 'variable';
  readonly pivot: string;
  readonly provenance: string;
  status: AssetStatus;
}

function entry(
  key: string,
  path: string,
  use: string,
  size: readonly [number, number] | 'variable',
  pivot: string,
): AssetEntry {
  return { key, path, use, size, pivot, provenance: 'to be produced — see docs/ASSET_REQUESTS.md', status: 'missing' };
}

export const ASSET_MANIFEST: readonly AssetEntry[] = [
  entry('plate.background', 'assets/backgrounds/court-clean.png', 'Clean court plate: no players, no game ball, no baked shadows', [1536, 1024], 'top-left of frame'),
  entry('plate.foreground', 'assets/backgrounds/court-foreground.png', 'Front wall and bushes that occlude feet and ball', [1536, 1024], 'top-left of frame'),
  entry('hoop.back', 'assets/props/hoop-back.png', 'Post, wooden board and far half of the ring', [1536, 1024], 'top-left of frame'),
  entry('hoop.front', 'assets/props/hoop-front.png', 'Near half of the ring and the chain net', [1536, 1024], 'top-left of frame'),
  entry('logo', 'assets/ui/chubol-logo.png', 'CHUBOL arcade logo, orange and yellow with dark outline', 'variable', 'centre'),
  entry('ball', 'assets/props/ball.png', 'Game ball, shaded, with rotation frames', 'variable', 'centre'),
  entry('character.a', 'assets/characters/friend-a.png', 'Grey tank, purple shorts: idle, walk, hold, wind, release, follow, react', 'variable', 'feet'),
  entry('character.b', 'assets/characters/friend-b.png', 'White tank with yellow sun, blue shorts', 'variable', 'feet'),
  entry('character.c', 'assets/characters/friend-c.png', 'Red tank, black shorts, red headband', 'variable', 'feet'),
  entry('character.d', 'assets/characters/friend-d.png', 'Black tank, green shorts, seen from behind in the foreground', 'variable', 'feet'),
  entry('kid', 'assets/characters/kid-river.png', '13-year-old spectator in a full River Plate kit', 'variable', 'feet'),
  entry('dog', 'assets/characters/dog.png', 'Short-haired mixed-breed dog, erect ears, long dark muzzle', 'variable', 'feet'),
  entry('trophy', 'assets/props/trophy-table.png', 'Wooden table with the blender and the fruit', 'variable', 'feet'),
  entry('audio.chain', 'assets/audio/chain.wav', 'Short metallic chain rattle on a make', 'variable', 'n/a'),
  entry('audio.board', 'assets/audio/board.wav', 'Wooden board knock', 'variable', 'n/a'),
];

/**
 * The three reference images the brief points at. They are inputs, not assets to
 * produce, but the game probes them so the comparison scene can say plainly
 * whether there is anything to compare against.
 */
export const REFERENCE_FILES: readonly AssetEntry[] = [
  { key: 'reference.plate', path: 'references/chubol-nba-jam.png', use: 'Reference artwork: composition, camera, characters, palette, pixel density', size: [1536, 1024], pivot: 'n/a', provenance: 'provided by the author of the brief', status: 'missing' },
  { key: 'reference.croquis', path: 'references/chubol-croquis.jpg', use: 'Original sketch of the court: shot positions and values', size: 'variable', pivot: 'n/a', provenance: 'provided by the author of the brief', status: 'missing' },
  { key: 'reference.dog', path: 'references/chubol-perro.png', use: 'Photo of the dog: features to preserve', size: 'variable', pivot: 'n/a', provenance: 'provided by the author of the brief', status: 'missing' },
];

/**
 * Marks which files exist in this checkout.
 *
 * The list is produced at build time by the chubol-assets plugin, so a file that
 * has not been made yet is a known state rather than a failed request. With no
 * artwork produced, probing over the network would fill the console with
 * expected 404s and hide the errors that matter.
 */
export function resolveAssets(): readonly AssetEntry[] {
  const available = new Set(AVAILABLE_FILES);
  const all = [...ASSET_MANIFEST, ...REFERENCE_FILES];
  for (const asset of all) asset.status = available.has(asset.path) ? 'available' : 'missing';
  return all;
}

export function referenceStatus(key: string): AssetStatus {
  return REFERENCE_FILES.find((r) => r.key === key)?.status ?? 'missing';
}

export function missingAssets(): readonly AssetEntry[] {
  return ASSET_MANIFEST.filter((a) => a.status === 'missing');
}

/** True while any artwork is still the procedural stand-in. */
export function usingDevelopmentArt(): boolean {
  return missingAssets().length > 0;
}
