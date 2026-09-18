import { describe, expect, it } from 'vitest';
import { ALL_SPOTS_TOTAL, BALL, BALL_BOUNDS, HOOP, SHOT_SPOTS } from '../src/game/config/court';
import { SHOT } from '../src/game/config/gameplay';
import {
  ShotSimulation,
  createShotProfile,
  launchAtMultiplier,
  launchFromProfile,
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
    for (const spot of SHOT_SPOTS) {
      const profile = createShotProfile(spot.x, spot.y, spot.points)!;
      const at = (c: number) => simulateToOutcome(launchFromProfile(profile, c)!);
      expect(at(profile.window.low - 0.004), `spot ${spot.points} under`).toBe('missed');
      expect(at(profile.window.high + 0.004), `spot ${spot.points} over`).toBe('missed');
    }
  });

  it('still lets a heavily overpowered shot bank in off the board, as a real one would', () => {
    // Not an accident of the scoring code: the ball hits the wooden board and
    // drops through. It is a separate island of makes, well outside the band.
    const profile = createShotProfile(2.2, 0, 2)!;
    expect(simulateToOutcome(launchFromProfile(profile, profile.window.high + 0.004)!)).toBe('missed');
    expect(simulateToOutcome(launchFromProfile(profile, profile.window.high + 0.02)!)).toBe('made');
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
    const sim = new ShotSimulation(1, perfectShotFrom(5, 0, 5));
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
    const sim = new ShotSimulation(7, perfectShotFrom(5, 0, 5));
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
    expect(simulateToOutcome(launchAtMultiplier(5, 0, 0.85)!)).toBe('missed');
    expect(simulateToOutcome(launchAtMultiplier(5, 0, 1.35)!)).toBe('missed');
  });

  it('never lets a ball that hits the backboard pass through it', () => {
    // A flat, fast shot arrives at board height and must bounce off its face.
    const flat: BallState = {
      x: 1.0,
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
    const sim = new ShotSimulation(1, launchAtMultiplier(5, 0, 1.18)!);
    let guard = 0;
    while (sim.resolved === null && guard < 20000) {
      sim.advance(1 / 240);
      guard += 1;
    }
    expect(sim.resolved).toBe('missed');
    expect(sim.state.x).toBeGreaterThan(BALL_BOUNDS.minX - 1);
  });

  it('never sinks the ball below the grass', () => {
    const sim = new ShotSimulation(1, launchAtMultiplier(8, 2, 1.25)!);
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
      const launch = launchAtMultiplier(6, -2, multiplier)!;
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
