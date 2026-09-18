import { describe, expect, it } from 'vitest';
import { SHOT_SPOTS, type ShotSpot } from '../src/game/config/court';
import { SHOT } from '../src/game/config/gameplay';
import { CPU_DEFAULTS, CpuPlayer, type CpuView } from '../src/game/domain/cpu';
import { createShotProfile, launchFromProfile, simulateToOutcome } from '../src/game/sim/ball';

function view(overrides: Partial<CpuView> = {}): CpuView {
  return {
    phase: 'positioning',
    shooterX: 4,
    shooterY: 0,
    ballX: 4,
    ballY: 0,
    owed: SHOT_SPOTS,
    onMark: null,
    charge: 0,
    window: null,
    ...overrides,
  };
}

describe('the pair played by the machine', () => {
  it('walks to the nearest mark it still owes', () => {
    const cpu = new CpuPlayer();
    const command = cpu.decide(view({ shooterX: 3.4, shooterY: 0 }), 16);
    expect(command.kind).toBe('walk');
    const five = SHOT_SPOTS.find((s) => s.points === 5)!;
    if (command.kind !== 'walk') throw new Error('expected a walk');
    expect(Math.hypot(command.x - five.x, command.y - five.y)).toBeLessThan(0.01);
  });

  it('never walks to a mark it has already shot this lap', () => {
    const cpu = new CpuPlayer();
    const eight = SHOT_SPOTS.find((s) => s.points === 8)!;
    const command = cpu.decide(view({ shooterX: 3.4, shooterY: 0, owed: [eight] }), 16);
    if (command.kind !== 'walk') throw new Error('expected a walk');
    expect(Math.hypot(command.x - eight.x, command.y - eight.y)).toBeLessThan(0.01);
  });

  it('goes to fetch the ball, like a person has to', () => {
    const cpu = new CpuPlayer();
    const command = cpu.decide(view({ phase: 'retrieving', ballX: 6.2, ballY: -1.4 }), 16);
    expect(command).toEqual({ kind: 'walk', x: 6.2, y: -1.4 });
  });

  it('takes a beat before starting a shot instead of firing instantly', () => {
    const cpu = new CpuPlayer();
    const standing = view({ onMark: SHOT_SPOTS[3]! });
    expect(cpu.decide(standing, 100).kind).toBe('wait');
    expect(cpu.decide(standing, 100).kind).toBe('wait');
    expect(cpu.decide(standing, CPU_DEFAULTS.reactionMs).kind).toBe('press');
  });

  it('holds the charge and lets go once, somewhere near the band', () => {
    const cpu = new CpuPlayer();
    const window = { low: 0.66, high: 0.78 };
    expect(cpu.decide(view({ phase: 'charging', charge: 0.1, window }), 16).kind).toBe('wait');
    expect(cpu.decide(view({ phase: 'charging', charge: 0.95, window }), 16).kind).toBe('release');
  });

  it('does nothing while the ball is in the air', () => {
    const cpu = new CpuPlayer();
    expect(cpu.decide(view({ phase: 'flight' }), 16).kind).toBe('wait');
  });

  /** Replays the machine's release decision through the real physics. */
  function hitRate(spot: ShotSpot, skill: number, attempts = 60): number {
    const profile = createShotProfile(spot.x, spot.y, spot.points)!;
    let made = 0;
    for (let i = 0; i < attempts; i += 1) {
      const cpu = new CpuPlayer({ ...CPU_DEFAULTS, skill, seed: 1000 + i });
      // Walk the bar up at the rate the real bar moves, so the machine's timing
      // granularity is the same as in a real frame.
      let charge = 0;
      let released = 0;
      for (let step = 0; step < 400; step += 1) {
        charge = Math.min(1, (step * 16) / SHOT.chargeHalfPeriodMs);
        const command = cpu.decide({ ...view({ phase: 'charging', charge }), window: profile.window }, 16);
        if (command.kind === 'release') {
          released = charge;
          break;
        }
      }
      if (simulateToOutcome(launchFromProfile(profile, released)!) === 'made') made += 1;
    }
    return made / attempts;
  }

  it('is beatable: it misses a fair share of the hard marks', () => {
    const eight = SHOT_SPOTS.find((s) => s.points === 8)!;
    const rate = hitRate(eight, CPU_DEFAULTS.skill);
    expect(rate).toBeGreaterThan(0.15);
    expect(rate).toBeLessThan(0.75);
  });

  it('finds the easy marks easier than the hard ones, like a person does', () => {
    const two = SHOT_SPOTS.find((s) => s.points === 2)!;
    const eight = SHOT_SPOTS.find((s) => s.points === 8)!;
    expect(hitRate(two, CPU_DEFAULTS.skill)).toBeGreaterThan(hitRate(eight, CPU_DEFAULTS.skill));
  });

  it('gets better when it is made more skilful', () => {
    const seven = SHOT_SPOTS.find((s) => s.points === 7)!;
    expect(hitRate(seven, 0.95)).toBeGreaterThan(hitRate(seven, 0.4));
  });

  it('plays the same match twice when given the same seed', () => {
    const releases = (seed: number) => {
      const cpu = new CpuPlayer({ ...CPU_DEFAULTS, seed });
      const window = { low: 0.66, high: 0.78 };
      const out: number[] = [];
      for (let shot = 0; shot < 5; shot += 1) {
        for (let step = 0; step < 400; step += 1) {
          const charge = Math.min(1, (step * 16) / SHOT.chargeHalfPeriodMs);
          if (cpu.decide({ ...view({ phase: 'charging', charge }), window }, 16).kind === 'release') {
            out.push(charge);
            break;
          }
        }
        cpu.decide(view({ phase: 'flight' }), 16);
      }
      return out;
    };
    expect(releases(7)).toEqual(releases(7));
    expect(releases(7)).not.toEqual(releases(8));
  });
});
