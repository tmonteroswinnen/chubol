import { CAMERA, FRAMING, FRAMING_ANCHORS } from '../config/court';
import { CourtProjection } from '../sim/projection';

let cached: CourtProjection | null = null;

/**
 * The one projection used by the whole game. It is solved from configuration
 * only, never from the size of the browser window, so a resize can never move a
 * shot spot or change a result.
 */
export function courtProjection(): CourtProjection {
  cached ??= CourtProjection.fit(CAMERA, FRAMING_ANCHORS, FRAMING);
  return cached;
}
