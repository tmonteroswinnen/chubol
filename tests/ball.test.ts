import { describe, expect, it } from 'vitest';
import { ALL_SPOTS_TOTAL, BALL, BALL_BOUNDS, HOOP, SHOT_SPOTS, WALK_BOUNDS } from '../src/game/config/court';
import { SHOT } from '../src/game/config/gameplay';
import {
  ShotSimulation,
  createShotProfile,
  launchAtMultiplier,
  launchFromProfile,
  releaseHeight,
  simulateToOutcome,
  type BallState,
} from '../src/game/sim/ball';

function perfectShotFrom(x: number, y: number, points: number): BallState {
  const profile = createShotProfile(x, y, points);
  expect(profile).not.toBeNull();
  const launch = launchFromProfile(profile!, SHOT.sweetSpot);
  expect(launch).not.toBeNull();
  return launch!;
}

describe('ball flight and scoring', () => {
  it('scores from all seven marks with a well executed release, totalling 35', () => {
    let total = 0;
    for (const spot of SHOT_SPOTS) {
      const outcome = simulateToOutcome(perfectShotFrom(spot.x, spot.y, spot.points));
      expect(outcome, `spot worth ${spot.points}`).toBe('made');
      total += spot.points;
    }
    expect(total).toBe(ALL_SPOTS_TOTAL);
    expect(total).toBe(35);
  });

  it('keeps the promise of the charge bar: releasing inside the band always scores', () => {
    for (const spot of SHOT_SPOTS) {
      const profile = createShotProfile(spot.x, spot.y, spot.points)!;
      const at = (c: number) => simulateToOutcome(launchFromProfile(profile, c)!);
      const steps = 12;
      for (let i = 0; i <= steps; i += 1) {
        const c = profile.window.low + ((profile.window.high - profile.window.low) * i) / steps;
        expect(at(c), `spot ${spot.points} at charge ${c.toFixed(3)}`).toBe('made');
      }
    }
  });

  it('misses as soon as the release falls outside the band', () => {
    // The 2-point mark is excluded on purpose: it is painted under the hoop and
    // is played as a lay-up, which is forgiving by nature. See the next test.
    for (const spot of SHOT_SPOTS.filter((s) => s.points > 2)) {
      const profile = createShotProfile(spot.x, spot.y, spot.points)!;
      const at = (c: number) => simulateToOutcome(launchFromProfile(profile, c)!);
      expect(at(profile.window.low - 0.008), `spot ${spot.points} under`).toBe('missed');
      expect(at(profile.window.high + 0.008), `spot ${spot.points} over`).toBe('missed');
    }
  });

  it('the green band is the whole truth: nothing outside it goes in, anywhere you can stand', () => {
    // The strongest promise the game makes, and the one that was only half true
    // twice over. A badly overpowered shot banks in off the wooden board, and
    // because the bar stretches the make interval across a fixed slice of itself,
    // those bank shots landed back on the bar outside the painted band.
    //
    // The first fix checked only the exact centre of each mark, and that was not
    // enough: with the keys you stand anywhere inside the mark's tolerance, the
    // geometry changes, and on the 4-point mark a few centimetres off centre
    // holding to the very top was four guaranteed points. So this walks the bar
    // whole, from several places inside each mark.
    for (const spot of SHOT_SPOTS) {
      const offsets: readonly (readonly [number, number])[] = [
        [0, 0],
        [spot.tolerance * 0.75, 0],
        [-spot.tolerance * 0.75, 0],
        [0, spot.tolerance * 0.75],
        [0, -spot.tolerance * 0.75],
        [spot.tolerance * 0.5, spot.tolerance * 0.5],
        [-spot.tolerance * 0.5, -spot.tolerance * 0.5],
      ];
      for (const [dx, dy] of offsets) {
        const x = Math.min(Math.max(spot.x + dx, WALK_BOUNDS.minX), WALK_BOUNDS.maxX);
        const y = Math.min(Math.max(spot.y + dy, WALK_BOUNDS.minY), WALK_BOUNDS.maxY);
        const profile = createShotProfile(x, y, spot.points);
        if (profile === null) continue;
        for (let charge = 0; charge <= 1 + 1e-9; charge += 0.002) {
          const made = simulateToOutcome(launchFromProfile(profile, charge)!) === 'made';
          // Only the edges themselves may disagree, by one step: the band is
          // solved by bisection and lands within a thousandth.
          const inside = charge >= profile.window.low - 0.003 && charge <= profile.window.high + 0.003;
          if (made) {
            expect(
              inside,
              `marca ${spot.points} en (${x.toFixed(2)}, ${y.toFixed(2)}): entra en ${charge.toFixed(3)}, fuera de la franja`,
            ).toBe(true);
          }
        }
      }
    }
  }, 600000);

  it('plays the mark under the hoop as a lay-up, and gives it the widest band', () => {
    // The artwork paints the 2 about 0.36 m from the ring's axis. No arc can
    // score from there — the ball would pass up through the ring — so the
    // shooter reaches above the rim and drops it in. It is the easiest shot and
    // it is worth the least, but easiest means the most time to let go, not free:
    // the physical tolerance of the lay-up is enormous and the bar is stretched
    // to match it, so outside the band it misses like any other mark.
    const two = SHOT_SPOTS.find((s) => s.points === 2)!;
    expect(Math.hypot(two.x - HOOP.groundX, two.y - HOOP.groundY)).toBeLessThan(0.6);
    expect(releaseHeight(two.x, two.y)).toBeGreaterThan(HOOP.rimHeight);

    const profile = createShotProfile(two.x, two.y, two.points)!;
    for (const charge of [0.66, 0.72, 0.78]) {
      expect(simulateToOutcome(launchFromProfile(profile, charge)!), `carga ${charge}`).toBe('made');
    }
    const widths = SHOT_SPOTS.map((spot) => {
      const p = createShotProfile(spot.x, spot.y, spot.points)!;
      return { points: spot.points, width: p.window.high - p.window.low };
    });
    const widest = widths.reduce((a, b) => (b.width > a.width ? b : a));
    expect(widest.points).toBe(2);
  });

  it('releases from shoulder height for every mark that is not a lay-up', () => {
    for (const spot of SHOT_SPOTS.filter((s) => s.points > 2)) {
      expect(releaseHeight(spot.x, spot.y), `spot ${spot.points}`).toBeLessThan(HOOP.rimHeight);
    }
  });

  it('makes the long marks demand more precision than the short ones', () => {
    const near = createShotProfile(2.2, 0, 2)!;
    const far = createShotProfile(10, 0, 8)!;
    const width = (p: typeof near) => p.window.high - p.window.low;
    expect(width(far)).toBeLessThan(width(near));
  });

  it('resolves identically at 30, 60 and 144 frames per second', () => {
    for (const spot of SHOT_SPOTS) {
      const outcomes = [1 / 30, 1 / 60, 1 / 144].map((dt) => {
        const sim = new ShotSimulation(1, perfectShotFrom(spot.x, spot.y, spot.points));
        let guard = 0;
        while (sim.resolved === null && guard < 100000) {
          sim.advance(dt);
          guard += 1;
        }
        return sim.resolved;
      });
      expect(new Set(outcomes).size, `spot ${spot.points}`).toBe(1);
      expect(outcomes[0]).toBe('made');
    }
  });

  it('survives a stalled frame without tunnelling through the rim', () => {
    const sim = new ShotSimulation(1, perfectShotFrom(3.59, -0.01, 5));
    // One huge delta, as after a tab switch, then normal frames.
    sim.advance(2.5);
    let guard = 0;
    while (sim.resolved === null && guard < 10000) {
      sim.advance(1 / 60);
      guard += 1;
    }
    expect(sim.resolved).toBe('made');
  });

  it('does not resolve twice', () => {
    const sim = new ShotSimulation(7, perfectShotFrom(3.59, -0.01, 5));
    const resolutions: string[] = [];
    let guard = 0;
    while (guard < 10000) {
      for (const event of sim.advance(1 / 60)) {
        if (event.kind === 'resolved') resolutions.push(event.outcome!);
      }
      if (sim.resolved !== null && guard > 400) break;
      guard += 1;
    }
    expect(resolutions).toEqual(['made']);
  });

  it('does not score a ball pushed up through the ring from underneath', () => {
    const fromBelow: BallState = {
      x: HOOP.groundX,
      y: HOOP.groundY,
      z: HOOP.rimHeight - 0.5,
      vx: 0,
      vy: 0,
      vz: 7,
    };
    expect(simulateToOutcome(fromBelow)).toBe('missed');
  });

  it('does not score a ball that only passes near the ring', () => {
    const past: BallState = {
      x: HOOP.groundX + HOOP.rimRadius + BALL.radius + 0.25,
      y: HOOP.groundY,
      z: HOOP.rimHeight + 1.5,
      vx: 0,
      vy: 0,
      vz: 0,
    };
    expect(simulateToOutcome(past)).toBe('missed');
  });

  it('misses when the release is badly under- or over-powered', () => {
    expect(simulateToOutcome(launchAtMultiplier(5.19, 2.96, 0.8)!)).toBe('missed');
    expect(simulateToOutcome(launchAtMultiplier(5.19, 2.96, 1.3)!)).toBe('missed');
  });

  it('never lets a ball that hits the backboard pass through it', () => {
    // A flat, fast shot arrives at board height and must bounce off its face.
    const flat: BallState = {
      x: 3.0,
      y: 0,
      z: (HOOP.boardBottomZ + HOOP.boardTopZ) / 2,
      vx: -14,
      vy: 0,
      vz: 0,
    };
    const sim = new ShotSimulation(1, flat);
    let minX = Infinity;
    let hitBoard = false;
    let guard = 0;
    while (sim.resolved === null && guard < 20000) {
      for (const event of sim.advance(1 / 240)) if (event.kind === 'board') hitBoard = true;
      minX = Math.min(minX, sim.state.x);
      guard += 1;
    }
    expect(hitBoard).toBe(true);
    expect(minX).toBeGreaterThanOrEqual(HOOP.boardX);
  });

  it('resolves instead of letting the ball sail out of the scene', () => {
    // Sails over the board and away; the attempt must still close.
    const sim = new ShotSimulation(1, launchAtMultiplier(5.19, 2.96, 1.35)!);
    let guard = 0;
    while (sim.resolved === null && guard < 20000) {
      sim.advance(1 / 240);
      guard += 1;
    }
    expect(sim.resolved).toBe('missed');
    expect(sim.state.x).toBeGreaterThan(BALL_BOUNDS.minX - 1);
  });

  it('never sinks the ball below the grass', () => {
    const sim = new ShotSimulation(1, launchAtMultiplier(6, -2, 1.25)!);
    let minZ = Infinity;
    let guard = 0;
    while (sim.resolved === null && guard < 10000) {
      sim.advance(1 / 120);
      minZ = Math.min(minZ, sim.state.z);
      guard += 1;
    }
    expect(minZ).toBeGreaterThanOrEqual(BALL.radius - 1e-6);
  });

  it('always reaches a resolution', () => {
    for (const multiplier of [0.5, 0.9, 1, 1.1, 1.6, 2.2]) {
      const launch = launchAtMultiplier(5.19, 2.96, multiplier)!;
      const sim = new ShotSimulation(1, launch);
      let guard = 0;
      while (sim.resolved === null && guard < 20000) {
        sim.advance(1 / 60);
        guard += 1;
      }
      expect(sim.resolved, `multiplier ${multiplier}`).not.toBeNull();
    }
  });
});
