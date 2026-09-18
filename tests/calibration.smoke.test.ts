import { describe, it } from 'vitest';
import { SHOT_SPOTS } from '../src/game/config/court';
import { SHOT } from '../src/game/config/gameplay';
import { createShotProfile, launchFromProfile, simulateToOutcome, solveMakeInterval } from '../src/game/sim/ball';

describe('shot tuning report', () => {
  it('prints the charge band for every spot', () => {
    console.log('pts  dist   idealV  speedInterval        band(charge)      width  ms@bar  perfect');
    for (const s of SHOT_SPOTS) {
      const p = createShotProfile(s.x, s.y, s.points);
      const raw = solveMakeInterval(s.x, s.y);
      if (!p || !raw) {
        console.log(`${String(s.points).padStart(3)}  NO SOLUTION`);
        continue;
      }
      const launch = launchFromProfile(p, SHOT.sweetSpot);
      const outcome = launch ? simulateToOutcome(launch) : 'no-launch';
      const width = p.window.high - p.window.low;
      console.log(
        `${String(s.points).padStart(3)}  ${p.distance.toFixed(2).padStart(5)}  ${p.idealSpeed.toFixed(2).padStart(6)}  ` +
          `[${raw.low.toFixed(4)}..${raw.high.toFixed(4)}]  ` +
          `[${p.window.low.toFixed(3)}..${p.window.high.toFixed(3)}]  ${width.toFixed(3)}  ` +
          `${(width * SHOT.chargeHalfPeriodMs).toFixed(0).padStart(6)}  ${outcome}`,
      );
    }
  });

  it('confirms the band edges score and just outside them does not', () => {
    for (const s of SHOT_SPOTS) {
      const p = createShotProfile(s.x, s.y, s.points);
      if (!p) continue;
      const at = (c: number) => {
        const l = launchFromProfile(p, c);
        return l ? simulateToOutcome(l) : 'no-launch';
      };
      const pad = 0.004;
      console.log(
        `p${s.points}: inLow=${at(p.window.low + 0.001)} inHigh=${at(p.window.high - 0.001)} ` +
          `outLow=${at(p.window.low - pad)} outHigh=${at(p.window.high + pad)}`,
      );
    }
  });
});
