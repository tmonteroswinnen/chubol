/**
 * Positions of the four friends in the reference frame.
 *
 * These reproduce the layout described for `references/chubol-nba-jam.png` so the
 * comparison scene can be set up deterministically. They are the starting frame
 * only: during play the friends move.
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
  { label: 'A', x: 2.6, y: -0.6, backView: false, description: 'Musculosa gris, shorts violetas — izquierda, dentro de la llave' },
  { label: 'B', x: 6.4, y: 2.6, backView: false, description: 'Musculosa blanca con sol, shorts azules — zona posterior central' },
  { label: 'C', x: 8.6, y: 0.2, backView: false, description: 'Musculosa roja, shorts negros, vincha — centro-derecha, con la pelota' },
  { label: 'D', x: 10.2, y: -3.8, backView: true, description: 'Musculosa negra, shorts verdes — primer plano derecho, de espaldas' },
];

/** Where the friends wait while someone else is shooting. */
export const WAITING_SPOTS: readonly { readonly x: number; readonly y: number }[] = [
  { x: 9.4, y: 3.6 },
  { x: 10.8, y: 1.8 },
  { x: 11.6, y: -1.4 },
  { x: 10.4, y: -3.6 },
];
