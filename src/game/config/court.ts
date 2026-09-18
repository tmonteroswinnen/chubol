/**
 * Court geometry and camera, CALIBRATED against the supplied artwork.
 *
 * Nothing here is invented. The camera and every dimension below were solved by
 * `scripts/fitCamera.mjs` from landmarks measured on
 * `public/assets/backgrounds/chubol-court-clean-v1.png` at 4x to 8x zoom: the
 * four corners of the painted key, where each arc crosses the axis of the key,
 * the rim, and the corners of the wooden backboard. The fit lands within
 * 5.5 pixels RMS on the ground plane, which is about 0.1 m.
 *
 * Two calibration decisions are judgement calls, and are stated as such:
 *
 *  1. SCALE. A ground plane alone cannot fix the scale of a scene — a near
 *     camera with a short lens and a far one with a long lens draw the same
 *     ground. The four adults in `references/chubol-nba-jam.png` were used as
 *     the ruler: taking them as 1.75 m tall, and they agree with each other to
 *     within 3% across the whole depth of the court. That makes the rim about
 *     2.18 m, i.e. a low homemade backyard hoop rather than a regulation one.
 *     The rim height was never given, and the artwork governs.
 *
 *  2. The brick walls come out taller in the artwork than the "about 30 cm" and
 *     "about 50 cm" of the written brief — roughly double. The artwork and the
 *     description disagree; the artwork is used, and the difference is recorded
 *     in docs/VISUAL_SPEC.md rather than quietly resolved.
 *
 * World axes, in metres:
 *   +x  along the court, away from the hoop
 *   +y  in depth, towards the cypresses
 *   +z  up
 */

import type { CameraSetup, FramingRect, Vec3 } from '../sim/projection';

/**
 * The artwork is 1536 x 1024 and must never be stretched or cropped. The logical
 * canvas is deliberately WIDER: a phone held sideways is far wider than 3:2, so
 * the artwork would otherwise sit between two dead black bars. Making the canvas
 * 1920 wide turns those bars into usable margins that carry the clock, the score
 * and the shoot button, which keeps the interface off the artwork entirely.
 *
 * The canvas size is still fixed, so the scale manager letterboxes it and a
 * resize can never move a shot mark.
 */
export const ART_WIDTH = 1536;
export const ART_HEIGHT = 1024;
export const LOGICAL_WIDTH = 1920;
export const LOGICAL_HEIGHT = 1024;
/** Where the artwork sits inside the canvas. */
export const ART_X = (LOGICAL_WIDTH - ART_WIDTH) / 2;
export const ART_Y = 0;
/** Width of each side margin, where the interface lives. */
export const MARGIN_WIDTH = ART_X;

/**
 * Where each cut layer sits inside the artwork. Both were cropped down to the
 * pixels they actually contain, which took them from six megabytes of texture
 * each to 1.38 MB and 0.03 MB — that matters on a phone. Regenerate with
 * `node scripts/cutLayers.mjs`, which prints these values.
 */
export const LAYER_OFFSETS = {
  foreground: { x: 0, y: 789 },
  hoopFront: { x: 247, y: 270 },
} as const;

/**
 * Solved camera. Do not hand-tune: re-run `node scripts/fitCamera.mjs` and paste
 * the result, or the game stops lining up with the artwork.
 */
export const CAMERA: CameraSetup = {
  position: { x: 2.984, y: -7.257, z: 4.318 },
  target: { x: 2.779, y: -0.434, z: 2.155 },
};

/** Solved focal length and principal point, in logical pixels. */
export const CALIBRATION = {
  focal: 1105.239,
  principalX: 565.717,
  principalY: 293.956,
  /** RMS reprojection error of the ground landmarks, for the record. */
  groundRmsPx: 5.46,
} as const;

export const COURT = {
  /** Grass the game uses, in metres. Beyond this is scenery. */
  minX: -0.9,
  maxX: 10.2,
  minY: -3.05,
  maxY: 3.1,

  /** Painted key: from the baseline to the free-throw line. */
  keyLength: 3.069,
  keyHalfWidth: 1.36,
  /** Radius of the rounded end of the key. */
  keyArcRadius: 1.078,
  /** Where the outer arc crosses the axis of the key. */
  outerArcReach: 5.54,
} as const;

export const HOOP = {
  /** Ground point directly below the centre of the rim: it overhangs the baseline. */
  groundX: 0.939,
  groundY: 0,
  rimHeight: 2.176,
  /**
   * Measured from the plate: the drawn ring is 95 px across where the scale is
   * 145 px/m. This court's hoop is generous, which is what the artwork shows.
   */
  rimRadius: 0.32,
  /** Backboard plane, perpendicular to +x, behind the rim. */
  boardX: 0.479,
  boardHalfWidth: 0.85,
  boardBottomZ: 1.99,
  boardTopZ: 3.07,
} as const;

export const BALL = {
  /**
   * Measured from the reference: the ball is 43 px across where the scale is
   * about 118 px/m. That makes it a big arcade ball, and its size relative to
   * the ring matches a real basketball almost exactly.
   */
  radius: 0.175,
} as const;

/**
 * Box the ball may occupy. A shot that leaves it has clearly gone, so the
 * attempt resolves instead of letting the ball sail off past the scene.
 */
export const BALL_BOUNDS = {
  minX: -3.0,
  maxX: 14.0,
  minY: -6.5,
  maxY: 6.5,
  maxZ: 10.0,
} as const;

export const WALLS = {
  /** Low brick wall behind the hoop, measured on the plate at z = 0.3. */
  leftX: -0.86,
  /** Low brick wall in the foreground, measured on the plate. */
  frontY: -3.0,
} as const;

/**
 * The whole background is the supplied plate, so nothing here is drawn: these
 * are the world positions of the things baked into it, used to keep players
 * away from them.
 */
export const SCENERY = {
  kid: { x: 7.98, y: 0.92 },
  dog: { x: 9.0, y: 1.12 },
  trophyTable: { x: 9.06, y: -0.25 },
  crate: { x: 6.77, y: -3.51 },
} as const;

/**
 * Framing is fixed by the calibration, not solved: the plate fills the canvas.
 * Kept so the projection API stays uniform.
 */
export const FRAMING: FramingRect = { left: 0, top: 0, right: LOGICAL_WIDTH, bottom: LOGICAL_HEIGHT };
export const FRAMING_ANCHORS: readonly Vec3[] = [
  { x: COURT.minX, y: COURT.minY, z: 0 },
  { x: COURT.maxX, y: COURT.maxY, z: 0 },
];

export type SpotId = 'p2' | 'p3' | 'p4' | 'p5' | 'p6' | 'p7' | 'p8';

export interface ShotSpot {
  readonly id: SpotId;
  /** Score awarded for a make taken from this spot. */
  readonly points: number;
  readonly x: number;
  readonly y: number;
  /** Radius, in metres, within which the active player may shoot from this spot. */
  readonly tolerance: number;
  readonly description: string;
}

/**
 * The seven marks, taken from where the numbers are actually painted on the
 * plate. Each glyph centre was measured on a 6x crop and inverse-projected onto
 * the ground, so these are the real places, not a reconstruction from the
 * written description.
 *
 * They are positions with a tolerance, never zones: standing anywhere else means
 * there is no shot value, and nothing is interpolated from distance.
 */
export const SHOT_SPOTS: readonly ShotSpot[] = [
  { id: 'p2', points: 2, x: 0.62, y: 0.16, tolerance: 0.7, description: 'Debajo del aro, dentro de la llave' },
  { id: 'p3', points: 3, x: 0.37, y: 2.66, tolerance: 0.7, description: 'Al costado del aro, hacia los cipreses' },
  { id: 'p4', points: 4, x: 0.31, y: -1.99, tolerance: 0.7, description: 'Al costado del aro, hacia la pared del frente' },
  { id: 'p5', points: 5, x: 3.59, y: -0.01, tolerance: 0.7, description: 'Extremo redondeado de la llave' },
  { id: 'p6', points: 6, x: 4.15, y: -2.31, tolerance: 0.7, description: 'Sobre el arco exterior, lado pared del frente' },
  { id: 'p7', points: 7, x: 5.19, y: 2.96, tolerance: 0.7, description: 'Sobre el arco exterior, lado cipreses' },
  { id: 'p8', points: 8, x: 7.45, y: -0.49, tolerance: 0.75, description: 'Lejos, fuera del arco exterior' },
];

export const SPOT_BY_ID: ReadonlyMap<SpotId, ShotSpot> = new Map(SHOT_SPOTS.map((s) => [s.id, s]));

/** Sum of every spot value. A practice run hitting each spot once scores this. */
export const ALL_SPOTS_TOTAL = SHOT_SPOTS.reduce((acc, s) => acc + s.points, 0);

/**
 * Where the shooter may walk. Bounded by the front wall, the left wall, the back
 * bushes and the spectators: the boy, the dog and the trophy table are painted
 * into the plate and must never be walked over.
 */
export const WALK_BOUNDS = {
  minX: 0.15,
  maxX: 7.6,
  minY: -2.7,
  maxY: 3.05,
} as const;

/** Where the three friends who are not shooting wait, clear of every mark. */
export const WAITING_SPOTS: readonly { readonly x: number; readonly y: number }[] = [
  { x: 6.3, y: 2.35 },
  { x: 6.9, y: 1.35 },
  { x: 6.4, y: -1.55 },
  { x: 5.8, y: 0.55 },
];
