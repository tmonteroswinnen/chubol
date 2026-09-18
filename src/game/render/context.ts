import { CALIBRATION, CAMERA } from '../config/court';
import { CourtProjection } from '../sim/projection';

let cached: CourtProjection | null = null;

/**
 * The one projection used by the whole game.
 *
 * It is NOT solved from a framing rectangle any more: the focal length and the
 * principal point come from the calibration against the supplied plate, so the
 * game's world sits exactly inside the artwork. It does not depend on the size
 * of the browser window, so a resize cannot move a mark or change a result.
 */
export function courtProjection(): CourtProjection {
  cached ??= CourtProjection.explicit(CAMERA, CALIBRATION.focal, CALIBRATION.principalX, CALIBRATION.principalY);
  return cached;
}
