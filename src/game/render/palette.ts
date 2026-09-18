/**
 * Colour palette for the development art.
 *
 * These values follow the written description of the reference plate (warm
 * daylight, grass greens, cypress greens, brick red, blue sky, orange/yellow
 * title). They are NOT sampled from `references/chubol-nba-jam.png`, because that
 * file is not in the checkout. Once it is, this palette should be replaced with
 * colours picked from the artwork itself. See docs/ASSET_REQUESTS.md.
 */

export const PALETTE = {
  skyHigh: '#5fb0e0',
  skyLow: '#b9e2f2',

  roadLight: '#b5a186',
  roadMid: '#a4907a',
  roadDark: '#8e7b66',
  roadEdge: '#7b6a58',

  fencePost: '#6b5232',
  fencePostDark: '#4d3a22',
  fenceWire: '#d2d2c4',

  cypressDark: '#1b3f27',
  cypressMid: '#2c6336',
  cypressLight: '#438046',
  hedge: '#356b32',
  hedgeDark: '#244c24',

  grassBase: '#4c8b3d',
  grassDark: '#3e7533',
  grassLight: '#5da046',
  grassWorn: '#8a8146',
  grassWornDark: '#736b39',

  lineWhite: '#f1f1e3',
  lineWorn: '#cfd2bd',

  brick: '#9c4a33',
  brickDark: '#7a3826',
  brickLight: '#b25a40',
  mortar: '#cbb69c',

  woodLight: '#b98a4e',
  woodMid: '#96682f',
  woodDark: '#6f4a22',
  woodLine: '#54371a',

  rimMetal: '#e0742a',
  rimMetalDark: '#a94e18',
  chain: '#cdd1d9',
  chainDark: '#8f949e',

  poleMetal: '#8e8e96',
  poleDark: '#5f5f67',

  skin: '#f0c69c',
  skinShade: '#d39f73',
  hairDark: '#3a2a1c',
  hairMid: '#5c4128',

  ballOrange: '#e07a2c',
  ballDark: '#a8511a',
  ballLine: '#3a2110',

  shadow: 'rgba(24, 40, 18, 0.34)',

  titleFill: '#f5a81c',
  titleHigh: '#ffd75e',
  titleOutline: '#361b06',

  hudPanel: 'rgba(18, 26, 16, 0.78)',
  hudText: '#f3ead2',
  hudAccent: '#f5a81c',
  hudGood: '#7ddc6a',
  hudBad: '#e5604a',
} as const;

export const CHARACTERS = {
  a: { tank: '#b8bcc4', tankShade: '#8f939b', shorts: '#7a4bb8', shortsShade: '#5c3690', hair: '#3a2a1c' },
  b: { tank: '#f2f2ea', tankShade: '#cbcbc0', shorts: '#2f5fc4', shortsShade: '#22459a', hair: '#5c4128' },
  c: { tank: '#cc3b2f', tankShade: '#9c2a20', shorts: '#232329', shortsShade: '#141418', hair: '#2f2118' },
  d: { tank: '#26262c', tankShade: '#151519', shorts: '#3f9c52', shortsShade: '#2c7a3c', hair: '#43301f' },
} as const;

export type CharacterKey = keyof typeof CHARACTERS;

export const KID = {
  shirt: '#f2f2ea',
  shirtShade: '#cdcdc2',
  band: '#d62b2b',
  shorts: '#232329',
  socks: '#f2f2ea',
  sockTrim: '#d62b2b',
  boots: '#1a1a1e',
  hair: '#32241a',
} as const;

export const DOG = {
  coat: '#3c2c22',
  coatDark: '#241a14',
  brindle: '#5c4230',
  chest: '#e6ddcb',
  paw: '#efe7d8',
  muzzle: '#1d1510',
  eye: '#2a1c12',
} as const;

export const TROPHY = {
  blenderBase: '#c0392b',
  blenderBaseDark: '#8f281d',
  blenderCream: '#efe3c8',
  jar: 'rgba(214, 238, 246, 0.72)',
  jarEdge: '#9fc4d0',
  banana: '#f2d040',
  bananaDark: '#c9a91f',
  orange: '#ef8a1c',
  orangeDark: '#c26a10',
  apple: '#cc3b2f',
  appleDark: '#9a2a20',
} as const;
