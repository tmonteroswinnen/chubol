/**
 * The pair played by the machine.
 *
 * It plays the same game as a person: it walks to a mark that is still owed,
 * holds the shot, lets go, and then goes to fetch the ball while the clock runs.
 * It has no privileges — same walking speed, same clock, same rule that every
 * mark has to be shot before any can be repeated — so beating it means beating
 * the same constraints.
 *
 * The only thing skill changes is how accurately it lets go of the charge, which
 * is exactly what changes for a person too.
 */

import type { ShotSpot } from '../config/court';

export type CpuCommand =
  | { readonly kind: 'walk'; readonly x: number; readonly y: number }
  | { readonly kind: 'press' }
  | { readonly kind: 'release' }
  | { readonly kind: 'wait' };

export interface CpuView {
  readonly phase: 'positioning' | 'charging' | 'flight' | 'retrieving' | 'turnBreak' | 'over';
  readonly shooterX: number;
  readonly shooterY: number;
  readonly ballX: number;
  readonly ballY: number;
  /** Marks it may still shoot from this lap. */
  readonly owed: readonly ShotSpot[];
  /** The mark it is standing on, if it is on one it may use. */
  readonly onMark: ShotSpot | null;
  /** Current position of the charge bar, 0 to 1. */
  readonly charge: number;
  /** The slice of the bar that scores, once a shot is being charged. */
  readonly window: { readonly low: number; readonly high: number } | null;
}

/** Small deterministic generator, so a match can be replayed exactly. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface CpuSettings {
  /** 0 is hopeless, 1 releases perfectly every time. */
  readonly skill: number;
  /** Pause before starting a shot, in milliseconds, so it does not feel robotic. */
  readonly reactionMs: number;
  readonly seed: number;
}

/**
 * Measured against the real physics, this skill embocas roughly:
 * 2:100%  3:75%  4:78%  5:67%  6:57%  7:53%  8:45%
 * — a rival worth playing that can be beaten. Raise `skill` to make it harder.
 */
export const CPU_DEFAULTS: CpuSettings = { skill: 0.5, reactionMs: 420, seed: 20260918 };

export class CpuPlayer {
  private readonly settings: CpuSettings;
  private readonly random: () => number;
  /** Where in the bar it intends to let go of this particular shot. */
  private targetRelease: number | null = null;
  private waited = 0;

  constructor(settings: CpuSettings = CPU_DEFAULTS) {
    this.settings = settings;
    this.random = mulberry32(settings.seed);
  }

  /** Forgets anything held between shots. Call when a turn starts. */
  reset(): void {
    this.targetRelease = null;
    this.waited = 0;
  }

  decide(view: CpuView, deltaMs: number): CpuCommand {
    if (view.phase === 'flight' || view.phase === 'turnBreak' || view.phase === 'over') {
      this.targetRelease = null;
      return { kind: 'wait' };
    }

    if (view.phase === 'retrieving') {
      this.waited = 0;
      return { kind: 'walk', x: view.ballX, y: view.ballY };
    }

    if (view.phase === 'charging') {
      const window = view.window;
      if (window === null) return { kind: 'release' };
      if (this.targetRelease === null) this.targetRelease = this.pickRelease(window);
      // The bar sweeps up and then back down; let go on the way up, once it has
      // reached the intended point.
      return view.charge >= this.targetRelease ? { kind: 'release' } : { kind: 'wait' };
    }

    // Standing on a mark it can use: take a beat, then start the shot.
    if (view.onMark !== null) {
      this.waited += deltaMs;
      if (this.waited < this.settings.reactionMs) return { kind: 'wait' };
      this.waited = 0;
      this.targetRelease = null;
      return { kind: 'press' };
    }

    // Otherwise head for the nearest mark it still owes.
    const next = this.nearestOwed(view);
    if (next === null) return { kind: 'wait' };
    return { kind: 'walk', x: next.x, y: next.y };
  }

  private nearestOwed(view: CpuView): ShotSpot | null {
    let best: ShotSpot | null = null;
    let bestDistance = Infinity;
    for (const spot of view.owed) {
      const distance = Math.hypot(spot.x - view.shooterX, spot.y - view.shooterY);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = spot;
      }
    }
    return best;
  }

  /**
   * Aims for the middle of the scoring band and misses it by an amount that
   * depends on skill. Because the band narrows as the mark gets more valuable,
   * the same error makes the long marks harder, exactly as it does for a person.
   */
  private pickRelease(window: { low: number; high: number }): number {
    const centre = (window.low + window.high) / 2;
    // Scaled so that at the default skill the error is wider than the band on the
    // 8-point mark and much narrower than the band on the 2: the easy marks go in
    // nearly always and the long ones are a real coin-flip, which is roughly how
    // a person plays.
    const sigma = (1 - this.settings.skill) * 0.32;
    // Two uniforms averaged: a rough bell, bounded, and cheap.
    const error = (this.random() + this.random() - 1) * sigma;
    // It never waits past the top of the bar, which would mean never letting go.
    return Math.min(Math.max(centre + error, 0.02), 0.98);
  }
}
