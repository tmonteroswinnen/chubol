/**
 * Where the four friends stand in `references/chubol-nba-jam.png`.
 *
 * Measured, not guessed: each figure's feet were read off the reference and
 * inverse-projected onto the ground with the calibrated camera, so the
 * comparison scene puts them back where the artwork has them. This is the
 * starting frame only; during play they move.
 *
 * The drawn heights (236, 233, 267 and 296 px) agree with a 1.75 m person under
 * this calibration to within about 5%, which is what fixes the scale of the
 * whole world. See the note at the top of src/game/config/court.ts.
 */

export interface ReferencePose {
  /** Which friend, matching CHARACTER_KEYS order: a, b, c, d. */
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly backView: boolean;
  readonly description: string;
}

export const REFERENCE_POSES: readonly ReferencePose[] = [
  { label: 'A', x: 2.0, y: -1.08, backView: false, description: 'Musculosa gris, shorts violetas — dentro de la llave' },
  { label: 'B', x: 4.51, y: 0.51, backView: false, description: 'Musculosa blanca con sol, shorts azules — zona posterior central' },
  { label: 'C', x: 5.38, y: -1.32, backView: false, description: 'Musculosa roja, shorts negros, vincha — con la pelota' },
  { label: 'D', x: 5.75, y: -2.58, backView: true, description: 'Musculosa negra, shorts verdes — primer plano derecho, de espaldas' },
];

/** Where the ball is in the reference frame: in the hands of the friend in red. */
export const REFERENCE_BALL = { x: 5.07, y: -1.36, z: 1.2 } as const;
