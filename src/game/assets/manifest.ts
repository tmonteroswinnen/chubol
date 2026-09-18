/**
 * Asset manifest.
 *
 * Every entry names a file, what it is for, its size, its pivot and where it
 * comes from.
 *
 * The court plate was supplied and is what the game draws. What is still missing
 * is the four adults and the game ball as separate sprites; until those exist the
 * game draws procedural stand-ins and says so on screen.
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

/**
 * What the game still needs. The court plate itself was supplied and is in use;
 * these are the pieces it does not contain.
 */
export const ASSET_MANIFEST: readonly AssetEntry[] = [
  entry('character.a', 'assets/characters/friend-a.png', 'Musculosa gris, shorts violetas — 11 poses', 'variable', 'feet'),
  entry('character.b', 'assets/characters/friend-b.png', 'Musculosa blanca con sol, shorts azules — 11 poses', 'variable', 'feet'),
  entry('character.c', 'assets/characters/friend-c.png', 'Musculosa roja, shorts negros, vincha — 11 poses', 'variable', 'feet'),
  entry('character.d', 'assets/characters/friend-d.png', 'Musculosa negra, shorts verdes — 11 poses', 'variable', 'feet'),
  entry('character.d.back', 'assets/characters/friend-d-back.png', 'El mismo, de espaldas', 'variable', 'feet'),
  entry('ball', 'assets/props/ball.png', 'Pelota de juego, con rotación y sombra propia', 'variable', 'centre'),
  entry('audio.chain', 'assets/audio/chain.wav', 'Cadena metálica corta al embocar', 'variable', 'n/a'),
  entry('audio.board', 'assets/audio/board.wav', 'Golpe de madera', 'variable', 'n/a'),
];

/** Artwork that was supplied, or cut from it, and is what the game draws. */
export const SUPPLIED_ART: readonly AssetEntry[] = [
  { key: 'plate', path: 'assets/backgrounds/chubol-court-clean-v1.png', use: 'La cancha entera salvo los cuatro adultos y la pelota de juego', size: [1536, 1024], pivot: 'top-left of frame', provenance: 'entregada por el autor', status: 'missing' },
  { key: 'plate.foreground', path: 'assets/backgrounds/court-foreground.png', use: 'Pared del frente y arbustos, recortados de la lámina para tapar los pies', size: [1536, 1024], pivot: 'top-left of frame', provenance: 'recortada de la lámina por scripts/cutLayers.mjs', status: 'missing' },
  { key: 'hoop.front', path: 'assets/props/hoop-front.png', use: 'Mitad cercana del aro y la red de cadenas, recortadas de la lámina', size: [1536, 1024], pivot: 'top-left of frame', provenance: 'recortada de la lámina por scripts/cutLayers.mjs', status: 'missing' },
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
  const all = [...ASSET_MANIFEST, ...REFERENCE_FILES, ...SUPPLIED_ART];
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
