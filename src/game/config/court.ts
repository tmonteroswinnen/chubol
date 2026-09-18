/**
 * Court geometry, camera framing and shot spots.
 *
 * Every number here is an EDITABLE calibration value, not a historical measurement.
 * The two dimensions given by the owner of the court are the wall heights
 * (~0.30 m left wall, ~0.50 m front wall). Court length, width and rim height were
 * never provided, so they are proportions chosen to match the reference artwork and
 * must be recalibrated once `references/chubol-nba-jam.png` is available.
 */

import type { CameraSetup, FramingRect, Vec3 } from '../sim/projection';

/** Logical canvas size. Fixed, and equal to the 3:2 reference plate (1536 x 1024). */
export const LOGICAL_WIDTH = 1536;
export const LOGICAL_HEIGHT = 1024;

export const COURT = {
  /** Playable ground rectangle, in metres. */
  minX: -0.8,
  maxX: 14.0,
  minY: -5.2,
  maxY: 5.2,

  /** Painted key (lane): from the baseline to the free-throw line. */
  keyLength: 5.0,
  keyHalfWidth: 1.9,
  /** Radius of the rounded end of the key (free-throw circle). */
  keyArcRadius: 1.9,
  /** Outer arc, centred on the hoop ground point. */
  outerArcRadius: 7.0,
} as const;

export const HOOP = {
  /** Ground point directly below the centre of the rim. */
  groundX: 0,
  groundY: 0,
  rimHeight: 3.05,
  rimRadius: 0.225,
  /** Backboard plane, perpendicular to +x, behind the rim. */
  boardX: -0.375,
  boardHalfWidth: 0.9,
  boardBottomZ: 3.0,
  boardTopZ: 4.05,
} as const;

export const BALL = {
  radius: 0.12,
} as const;

/**
 * Box the ball may occupy. A shot that leaves it has clearly gone, so the attempt
 * resolves instead of letting the ball sail off past the scene.
 */
export const BALL_BOUNDS = {
  minX: -4.0,
  maxX: 20.0,
  minY: -9.0,
  maxY: 9.0,
  maxZ: 14.0,
} as const;

export const WALLS = {
  /** Low brick wall behind the hoop (left of frame). */
  leftX: -0.8,
  leftHeight: 0.3,
  /** Low brick wall in the foreground. */
  frontY: -5.2,
  frontHeight: 0.5,
} as const;

export const BACKGROUND = {
  /** Wire farm fence between the cypresses and the road. */
  fenceY: 7.6,
  fenceHeight: 1.35,
  /** Straight dirt road, parallel to the long side of the court. */
  roadNearY: 9.2,
  roadFarY: 12.6,
  /** Cypress trunk line, in front of the fence. */
  cypressY: 6.6,
  cypressXs: [1.2, 6.2, 11.4] as const,
  cypressHeight: 5.2,
  /**
   * Nothing is modelled past the road: the sky is painted from the top of the
   * frame down to the far edge of the road. The true geometric horizon of this
   * camera sits above the frame, so this band is an illustration convention that
   * matches the reference plate rather than a rendering of distant ground.
   */
  skyBottomPadding: 0.6,
} as const;

/**
 * Fixed elevated three-quarter camera. It never orbits and never rotates.
 *
 * The camera sits off to the right of the hoop, not square to the court: that
 * obliquity is what makes the wooden backboard read as a board instead of a
 * sliver seen edge on, and it is what "three-quarter view" means here.
 */
export const CAMERA: CameraSetup = {
  position: { x: 8.5, y: -18.5, z: 10.0 },
  target: { x: 6.9, y: 0.6, z: 1.2 },
};

/**
 * Rectangle of the logical canvas the court ground must fill. Everything beyond
 * the court (fence, cypresses, road, sky) composes above it, and the CHUBOL logo
 * sits in the band above that.
 */
export const FRAMING: FramingRect = {
  left: 34,
  top: 430,
  right: LOGICAL_WIDTH - 34,
  bottom: LOGICAL_HEIGHT - 20,
};

/** Points used to solve the focal length and principal point. */
export const FRAMING_ANCHORS: readonly Vec3[] = [
  { x: COURT.minX - 0.4, y: COURT.minY - 0.3, z: 0 },
  { x: COURT.maxX + 0.7, y: COURT.minY - 0.3, z: 0 },
  { x: COURT.minX - 0.4, y: COURT.maxY + 0.3, z: 0 },
  { x: COURT.maxX + 0.7, y: COURT.maxY + 0.3, z: 0 },
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

const ARC = COURT.outerArcRadius;
const ARC_END_DEG = 42;
const arcX = ARC * Math.cos((ARC_END_DEG * Math.PI) / 180);
const arcY = ARC * Math.sin((ARC_END_DEG * Math.PI) / 180);

/**
 * The seven scoring spots from the croquis. There is no 1-point mark: the
 * measurement ticks on the croquis are not shot values. Nothing outside these
 * spots scores, and distance is never interpolated into a score.
 */
export const SHOT_SPOTS: readonly ShotSpot[] = [
  { id: 'p2', points: 2, x: 2.2, y: 0.0, tolerance: 0.95, description: 'Dentro de la llave, cerca del aro' },
  { id: 'p3', points: 3, x: 1.9, y: 3.1, tolerance: 0.95, description: 'Cerca del aro, hacia los cipreses' },
  { id: 'p4', points: 4, x: 1.9, y: -3.1, tolerance: 0.95, description: 'Cerca del aro, hacia la pared del frente' },
  { id: 'p5', points: 5, x: COURT.keyLength, y: 0.0, tolerance: 0.95, description: 'Extremo redondeado de la llave (tiro libre)' },
  { id: 'p6', points: 6, x: arcX, y: -arcY, tolerance: 0.95, description: 'Extremo del arco exterior, lado pared del frente' },
  { id: 'p7', points: 7, x: arcX, y: arcY, tolerance: 0.95, description: 'Extremo del arco exterior, lado cipreses' },
  { id: 'p8', points: 8, x: 10.0, y: 0.0, tolerance: 1.05, description: 'Fuera del arco exterior, hacia la derecha' },
];

export const SPOT_BY_ID: ReadonlyMap<SpotId, ShotSpot> = new Map(SHOT_SPOTS.map((s) => [s.id, s]));

/** Sum of every spot value. A practice run hitting each spot once scores this. */
export const ALL_SPOTS_TOTAL = SHOT_SPOTS.reduce((acc, s) => acc + s.points, 0);

/** Where props and non-players stand. They must never block a shot. */
export const PROPS = {
  kid: { x: 12.9, y: 3.3 },
  dog: { x: 13.7, y: 2.9 },
  trophyTable: { x: 14.7, y: -1.2 },
  wateringCan: { x: -0.2, y: -4.6 },
  footballDecor: { x: 3.4, y: -4.8 },
  crate: { x: 13.4, y: -4.4 },
} as const;

/** Bounds the active player may walk inside (keeps them off walls, table and road). */
export const WALK_BOUNDS = {
  minX: 0.4,
  maxX: 12.6,
  minY: -4.5,
  maxY: 4.6,
} as const;
