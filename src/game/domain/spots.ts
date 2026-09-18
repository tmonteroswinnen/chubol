import { SHOT_SPOTS, SPOT_BY_ID, type ShotSpot, type SpotId } from '../config/court';

export interface SpotProximity {
  readonly spot: ShotSpot;
  readonly distance: number;
}

/**
 * The scoring spot the player is standing on, or null when they are not on one.
 *
 * The seven marks are treated as positions with a tolerance radius, not as a
 * partition of the court: standing anywhere else means there is no shot value,
 * and nothing is interpolated from distance.
 */
export function spotAt(x: number, y: number): ShotSpot | null {
  let best: SpotProximity | null = null;
  for (const spot of SHOT_SPOTS) {
    const distance = Math.hypot(spot.x - x, spot.y - y);
    if (distance > spot.tolerance) continue;
    if (best === null || distance < best.distance) best = { spot, distance };
  }
  return best?.spot ?? null;
}

/** Closest spot regardless of tolerance, for guidance arrows and click-to-walk. */
export function nearestSpot(x: number, y: number): SpotProximity {
  let best: SpotProximity | null = null;
  for (const spot of SHOT_SPOTS) {
    const distance = Math.hypot(spot.x - x, spot.y - y);
    if (best === null || distance < best.distance) best = { spot, distance };
  }
  if (best === null) throw new Error('no shot spots are configured');
  return best;
}

export function spotById(id: SpotId): ShotSpot {
  const spot = SPOT_BY_ID.get(id);
  if (spot === undefined) throw new Error(`unknown shot spot: ${id}`);
  return spot;
}
