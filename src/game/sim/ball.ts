/**
 * Ball simulation: ballistic flight, contact with rim, backboard and ground, and
 * a single unambiguous resolution per attempt.
 */

import { BALL, BALL_BOUNDS, HOOP } from '../config/court';
import { PHYSICS, SHOT } from '../config/gameplay';

export interface BallState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

export type ContactKind = 'rim' | 'board' | 'ground';
export type ShotOutcome = 'made' | 'missed';

export interface SimEvent {
  readonly kind: ContactKind | 'made' | 'resolved';
  /** Only present on a `resolved` event. */
  readonly outcome?: ShotOutcome;
}

export interface LaunchInput {
  /** Feet position of the shooter at the moment of release. */
  readonly fromX: number;
  readonly fromY: number;
  /** Charge value captured on release, in [0, 1]. */
  readonly charge: number;
}

/** Physics values a simulation may override. Used by tuning scripts and tests. */
export type PhysicsOverrides = Partial<{
  restitutionRim: number;
  restitutionBoard: number;
  restitutionGround: number;
  groundFriction: number;
}>;

/** Horizontal distance from a release point to the rim centre. */
export function distanceToRim(fromX: number, fromY: number): number {
  return Math.hypot(HOOP.groundX - fromX, HOOP.groundY - fromY);
}

/**
 * Height the ball leaves the hand at. Normally a standing release; from under
 * the basket the shooter reaches above the ring and lays it in, because no arc
 * can score from there.
 */
export function releaseHeight(fromX: number, fromY: number): number {
  const d = distanceToRim(fromX, fromY);
  const t = Math.min(Math.max(1 - d / SHOT.layupRange, 0), 1);
  return SHOT.handHeight + t * (HOOP.rimHeight + SHOT.layupClearance - SHOT.handHeight);
}

/**
 * Release angle for a shot from this distance: the one that needs the least
 * speed to reach the rim. It always has a solution, which a fixed angle does
 * not — the 2-point mark is barely half a metre from the hoop.
 */
export function launchAngle(fromX: number, fromY: number): number {
  const d = distanceToRim(fromX, fromY);
  const dh = HOOP.rimHeight - releaseHeight(fromX, fromY);
  const ideal = Math.PI / 4 + Math.atan2(dh, Math.max(d, 1e-3)) / 2;
  const min = (SHOT.minimumLaunchAngleDeg * Math.PI) / 180;
  const max = (SHOT.maximumLaunchAngleDeg * Math.PI) / 180;
  return Math.min(Math.max(ideal, min), max);
}

/**
 * Speed that drops the ball through the rim centre from `fromX, fromY` at that
 * angle. Returns null when the geometry has no solution.
 */
export function idealLaunchSpeed(fromX: number, fromY: number): number | null {
  const d = distanceToRim(fromX, fromY);
  if (d < 1e-3) return null;
  const theta = launchAngle(fromX, fromY);
  const dh = HOOP.rimHeight - releaseHeight(fromX, fromY);
  const denom = 2 * Math.cos(theta) ** 2 * (d * Math.tan(theta) - dh);
  if (denom <= 0) return null;
  return Math.sqrt((PHYSICS.gravity * d * d) / denom);
}

/**
 * One attempt. Owns its own resolution so a shot can never score twice, and the
 * score value is captured by the caller at release time, never recomputed here.
 */
export class ShotSimulation {
  readonly shotId: number;
  readonly state: BallState;

  private accumulator = 0;
  private elapsed = 0;
  private outcome: ShotOutcome | null = null;
  private touchedGround = false;
  private quietSince: number | null = null;
  private passedUpThroughRing = false;
  private readonly restitutionRim: number;
  private readonly restitutionBoard: number;
  private readonly restitutionGround: number;
  private readonly groundFriction: number;

  constructor(shotId: number, launch: BallState, overrides: PhysicsOverrides = {}) {
    this.shotId = shotId;
    this.state = { ...launch };
    this.restitutionRim = overrides.restitutionRim ?? PHYSICS.restitutionRim;
    this.restitutionBoard = overrides.restitutionBoard ?? PHYSICS.restitutionBoard;
    this.restitutionGround = overrides.restitutionGround ?? PHYSICS.restitutionGround;
    this.groundFriction = overrides.groundFriction ?? PHYSICS.groundFriction;
  }

  get resolved(): ShotOutcome | null {
    return this.outcome;
  }

  get flightSeconds(): number {
    return this.elapsed;
  }

  /** True once the ball has hit the grass, after which it can no longer score. */
  get landed(): boolean {
    return this.touchedGround;
  }

  /**
   * Feeds wall-clock time into the simulation. Integration always runs at a fixed
   * step, so the trajectory and the outcome are identical at any frame rate.
   */
  advance(deltaSeconds: number): SimEvent[] {
    const events: SimEvent[] = [];
    if (this.outcome !== null) return events;

    // A non-finite delta would poison the accumulator: the while below never
    // runs again and the ball hangs in the air, unresolved, for the rest of the
    // match. Same defence as the clock in Match.tick.
    const step = Number.isFinite(deltaSeconds) ? deltaSeconds : 0;
    this.accumulator += Math.min(Math.max(step, 0), PHYSICS.maxFrameSeconds);
    while (this.accumulator >= PHYSICS.fixedStep) {
      this.accumulator -= PHYSICS.fixedStep;
      this.substep(events);
      if (this.outcome !== null) break;
    }
    return events;
  }

  private substep(events: SimEvent[]): void {
    const h = PHYSICS.fixedStep;
    const s = this.state;
    const prevX = s.x;
    const prevY = s.y;
    const prevZ = s.z;

    s.vz -= PHYSICS.gravity * h;
    s.x += s.vx * h;
    s.y += s.vy * h;
    s.z += s.vz * h;
    this.elapsed += h;

    this.resolveRingCrossing(prevX, prevY, prevZ, events);
    if (this.outcome !== null) return;

    this.resolveBoard(prevX, events);
    this.resolveGround(events);

    if (this.touchedGround) {
      const speed = Math.hypot(s.vx, s.vy, s.vz);
      if (speed < 1.2 && s.z <= BALL.radius + 1e-3) {
        if (this.quietSince === null) this.quietSince = this.elapsed;
        if (this.elapsed - this.quietSince >= PHYSICS.missSettleSeconds) this.finish('missed', events);
      } else {
        this.quietSince = null;
      }
    }
    if (this.outcome === null && this.outOfBounds()) this.finish('missed', events);
    if (this.outcome === null && this.elapsed >= PHYSICS.maxShotSeconds) this.finish('missed', events);
  }

  /**
   * A make is only counted when the ball crosses the ring plane downwards, inside
   * the useful opening and accounting for the ball radius. A ball that went up
   * through the ring first can never score on the way back down.
   */
  private resolveRingCrossing(prevX: number, prevY: number, prevZ: number, events: SimEvent[]): void {
    const s = this.state;
    const rim = HOOP.rimHeight;
    const crossingDown = prevZ > rim && s.z <= rim;
    const crossingUp = prevZ < rim && s.z >= rim;
    if (!crossingDown && !crossingUp) return;

    const denom = prevZ - s.z;
    const t = Math.abs(denom) < 1e-9 ? 0 : (prevZ - rim) / denom;
    const cx = prevX + (s.x - prevX) * t - HOOP.groundX;
    const cy = prevY + (s.y - prevY) * t - HOOP.groundY;
    const r = Math.hypot(cx, cy);

    const opening = HOOP.rimRadius - BALL.radius;
    const contactBand = HOOP.rimRadius + BALL.radius;

    if (crossingUp) {
      if (r <= opening) this.passedUpThroughRing = true;
      else if (r <= contactBand) this.bounceOffRim(cx, cy, events);
      return;
    }

    if (r <= opening) {
      if (this.passedUpThroughRing) return;
      // Once it has bounced on the grass it is out. Partly because that is how
      // it works in a backyard, and partly because it lets the solver that
      // measures the green band stop a shot the moment it lands: without that
      // cut it has to keep simulating every bad shot rolling around the grass,
      // and solving one mark took long enough to stutter the frame you press on.
      if (this.touchedGround) return;
      events.push({ kind: 'made' });
      this.finish('made', events);
      return;
    }
    if (r <= contactBand) this.bounceOffRim(cx, cy, events);
  }

  private bounceOffRim(cx: number, cy: number, events: SimEvent[]): void {
    const s = this.state;
    const len = Math.hypot(cx, cy) || 1;
    const nx = cx / len;
    const ny = cy / len;
    const along = s.vx * nx + s.vy * ny;
    const e = this.restitutionRim;
    s.vx -= (1 + e) * along * nx;
    s.vy -= (1 + e) * along * ny;
    s.vz = Math.abs(s.vz) * e;
    s.z = HOOP.rimHeight + BALL.radius * 0.5;
    events.push({ kind: 'rim' });
  }

  private resolveBoard(prevX: number, events: SimEvent[]): void {
    const s = this.state;
    const face = HOOP.boardX + BALL.radius;
    if (!(prevX >= face && s.x < face)) return;
    if (Math.abs(s.y - HOOP.groundY) > HOOP.boardHalfWidth) return;
    if (s.z < HOOP.boardBottomZ - BALL.radius || s.z > HOOP.boardTopZ + BALL.radius) return;
    s.x = face;
    s.vx = Math.abs(s.vx) * this.restitutionBoard;
    events.push({ kind: 'board' });
  }

  private resolveGround(events: SimEvent[]): void {
    const s = this.state;
    if (s.z - BALL.radius > 0 || s.vz >= 0) return;
    s.z = BALL.radius;
    s.vz = -s.vz * this.restitutionGround;
    s.vx *= this.groundFriction;
    s.vy *= this.groundFriction;
    if (s.vz < 0.6) s.vz = 0;
    this.touchedGround = true;
    events.push({ kind: 'ground' });
  }

  /** True once the ball has clearly left the scene. */
  private outOfBounds(): boolean {
    const s = this.state;
    return (
      s.x < BALL_BOUNDS.minX ||
      s.x > BALL_BOUNDS.maxX ||
      s.y < BALL_BOUNDS.minY ||
      s.y > BALL_BOUNDS.maxY ||
      s.z > BALL_BOUNDS.maxZ
    );
  }

  private finish(outcome: ShotOutcome, events: SimEvent[]): void {
    this.outcome = outcome;
    events.push({ kind: 'resolved', outcome });
  }
}


/** Runs an attempt to completion without a renderer. Used by tests and tuning. */
export function simulateToOutcome(launch: BallState): ShotOutcome {
  const sim = new ShotSimulation(0, launch);
  while (sim.resolved === null) {
    // A ball on the grass cannot score any more, so there is nothing left to
    // learn from watching it settle.
    if (sim.landed) return 'missed';
    sim.advance(1 / 60);
  }
  return sim.resolved;
}

/** Builds a ball state for an explicit speed multiplier over the ideal speed. */
export function launchAtMultiplier(fromX: number, fromY: number, multiplier: number): BallState | null {
  const ideal = idealLaunchSpeed(fromX, fromY);
  if (ideal === null) return null;
  const d = distanceToRim(fromX, fromY);
  const theta = launchAngle(fromX, fromY);
  const speed = ideal * multiplier;
  const horizontal = speed * Math.cos(theta);
  return {
    x: fromX,
    y: fromY,
    z: releaseHeight(fromX, fromY),
    vx: ((HOOP.groundX - fromX) / d) * horizontal,
    vy: ((HOOP.groundY - fromY) / d) * horizontal,
    vz: speed * Math.sin(theta),
  };
}

export interface Interval {
  readonly low: number;
  readonly high: number;
}

/**
 * Step for walking outwards from the ideal speed looking for the edge.
 *
 * It has to be smaller than the narrowest gap between the central interval and
 * the first bank-shot island, which measured 0.009 on the 4-point mark. A
 * coarser step would step straight over that gap and report the far side of the
 * island as the edge of the band, which is worse than not looking at all.
 */
const SCAN_STEP = 0.004;
/**
 * How far out the search is willing to walk, as a fraction of the ideal speed.
 *
 * Wide enough for the lay-up, which is the extreme case: dropped in from above
 * the ring from a quarter of a metre away it still goes in at twice the ideal
 * speed. At 0.95 the search hit its own limit and reported that as the edge, and
 * then the bar had nowhere to go above the band — so everything above it scored.
 */
const SCAN_LIMIT = 1.4;
/**
 * How much further to keep looking for a bank-shot island once the band has
 * ended. Every island measured starts within 0.03 of the edge of the band, so
 * this is a wide margin; it is bounded because walking the whole scan range
 * looking for something that is not there was most of the cost of a shot.
 */
const ISLAND_SPAN = 0.3;
const REFINE_ITERATIONS = 12;

/**
 * Where the shot goes in, as launch-speed multipliers over the ideal speed.
 *
 * `low`..`high` is the contiguous band around the ideal speed that drops the
 * ball straight through the ring — the one the interface draws.
 *
 * An over-powered shot can also fall in after banking off the board, and those
 * form separate islands with misses in between. They are found and reported too,
 * because the charge bar stretches this interval across a fixed slice of itself
 * and would otherwise map an island back onto the bar, in a place nothing drew
 * and nothing promised.
 */
export interface MakeRange extends Interval {
  /** Lowest multiplier above `high` that goes in again, if there is one. */
  readonly islandAbove: number | null;
  /** Highest multiplier below `low` that goes in again, if there is one. */
  readonly islandBelow: number | null;
}

export function solveMakeRange(fromX: number, fromY: number): MakeRange | null {
  const makes = (multiplier: number): boolean => {
    const launch = launchAtMultiplier(fromX, fromY, multiplier);
    return launch !== null && simulateToOutcome(launch) === 'made';
  };
  if (!makes(1)) return null;

  /** Walks out from the ideal speed to the first miss, then bisects the edge. */
  const side = (direction: 1 | -1): { edge: number; island: number | null } => {
    let good = 1;
    let bad: number | null = null;
    let offset = SCAN_STEP;
    for (; offset <= SCAN_LIMIT; offset += SCAN_STEP) {
      const probe = 1 + direction * offset;
      if (makes(probe)) good = probe;
      else {
        bad = probe;
        break;
      }
    }
    // It never stopped making: the tolerance is wider than the search. That is
    // real on the lay-up, where the ball is dropped in from above the ring.
    if (bad === null) return { edge: good, island: null };

    let hi = bad;
    for (let i = 0; i < REFINE_ITERATIONS; i += 1) {
      const mid = (good + hi) / 2;
      if (makes(mid)) good = mid;
      else hi = mid;
    }

    // Keep walking past the gap: is there another stretch that goes in?
    let island: number | null = null;
    const islandLimit = Math.min(SCAN_LIMIT, offset + ISLAND_SPAN);
    for (let probe = offset + SCAN_STEP; probe <= islandLimit; probe += SCAN_STEP) {
      if (makes(1 + direction * probe)) {
        island = 1 + direction * probe;
        break;
      }
    }
    return { edge: good, island };
  };

  const below = side(-1);
  const above = side(1);
  return { low: below.edge, high: above.edge, islandBelow: below.island, islandAbove: above.island };
}

/** The central make interval alone. Kept for the calibration checks. */
export function solveMakeInterval(fromX: number, fromY: number): Interval | null {
  const range = solveMakeRange(fromX, fromY);
  return range === null ? null : { low: range.low, high: range.high };
}

/**
 * How far past the make interval the ends of the bar reach when there is no
 * bank-shot island in the way: enough that a badly timed release is plainly a
 * bad shot and not a near miss.
 */
const OUTSIDE_SPAN = 0.22;
/**
 * How much of the gap to the nearest island the bar is allowed to use. Well
 * short of 1, so the edge of the band and the edge of the island never meet
 * through rounding.
 */
const OUTSIDE_SAFETY = 0.55;
/**
 * Step used to double-check that nothing outside the band scores. Finer than the
 * narrowest bank-shot island measured anywhere on the court, which is 0.0025 of
 * the ideal speed, so an island can never fall between two checks.
 */
const VERIFY_STEP = 0.001;

/**
 * Everything an attempt needs: where it is taken from, how the charge bar maps
 * onto launch speed, and which slice of the bar scores.
 */
export interface ShotProfile {
  readonly fromX: number;
  readonly fromY: number;
  readonly distance: number;
  readonly idealSpeed: number;
  /** Make interval expressed on the charge bar, in [0, 1]. */
  readonly window: Interval;
  /** Speed multiplier applied for a given charge value. */
  readonly multiplierFor: (charge: number) => number;
}

/**
 * Fraction of the charge bar the scoring band occupies for a mark worth
 * `points`. Difficulty is keyed to the number on the mark, as confirmed.
 */
export function designedBandWidth(points: number): number {
  const span = SHOT.bandHighestPoints - SHOT.bandLowestPoints;
  const t = span <= 0 ? 0 : (points - SHOT.bandLowestPoints) / span;
  const clamped = Math.min(Math.max(t, 0), 1);
  return SHOT.bandWidthLowest + (SHOT.bandWidthHighest - SHOT.bandWidthLowest) * clamped;
}

/**
 * @param points value of the mark being shot from, which sets how wide the
 * scoring band is drawn.
 */
/**
 * Profiles already solved, so standing on the same mark twice does not pay for
 * the search twice.
 *
 * Solving one costs tens of milliseconds of simulation, and it is paid at the
 * instant the button goes down — the worst possible moment for a stutter. The
 * key is the position rounded to a centimetre, which is far finer than anything
 * that changes the answer and coarse enough that walking back onto a mark hits
 * the cache.
 */
const profileCache = new Map<string, ShotProfile>();
const PROFILE_CACHE_LIMIT = 96;

export function createShotProfile(fromX: number, fromY: number, points: number): ShotProfile | null {
  const key = `${Math.round(fromX * 100)}:${Math.round(fromY * 100)}:${points}`;
  const cached = profileCache.get(key);
  if (cached !== undefined) return cached;

  const profile = solveShotProfile(fromX, fromY, points);
  if (profile !== null) {
    if (profileCache.size >= PROFILE_CACHE_LIMIT) profileCache.clear();
    profileCache.set(key, profile);
  }
  return profile;
}

function solveShotProfile(fromX: number, fromY: number, points: number): ShotProfile | null {
  const ideal = idealLaunchSpeed(fromX, fromY);
  if (ideal === null) return null;
  const range = solveMakeRange(fromX, fromY);
  if (range === null) return null;

  const distance = distanceToRim(fromX, fromY);
  const halfBand = designedBandWidth(points) / 2;
  const sweet = SHOT.sweetSpot;
  const bandLow = sweet - halfBand;
  const bandHigh = sweet + halfBand;

  /*
   * Outside the band the bar stops following the same slope and runs to a limit
   * instead.
   *
   * The reason is the bank shots. The band is stretched to cover the make
   * interval exactly, so the rest of the bar covers whatever lies beyond it —
   * and beyond it, on four of the seven marks, there is a second stretch of
   * speeds that goes in off the board. With a single slope those landed back on
   * the bar in a place nothing drew: on the 5-point mark, holding to the very
   * top was five guaranteed points, through a window WIDER than the painted one.
   *
   * So each side runs to a limit that stops short of the nearest island. Where
   * there is no island, it runs to a plainly bad shot. The promise the bar makes
   * is then true in both directions: inside the green it goes in, outside it
   * does not.
   */
  const makes = (multiplier: number): boolean => {
    const launch = launchAtMultiplier(fromX, fromY, multiplier);
    return launch !== null && simulateToOutcome(launch) === 'made';
  };

  /**
   * Walks from the edge of the band out to a proposed limit and stops short of
   * anything that still goes in.
   *
   * The island search alone is not enough, and that was a real bug rather than a
   * precaution: it walks in steps of SCAN_STEP and keeps the first probe that
   * scores, so an island narrower than the step is missed entirely and the one it
   * reports is the NEXT one, further out — and the bar then sweeps straight over
   * the island nobody saw. Standing a few centimetres off the centre of the
   * 4-point mark, holding to the very top was four guaranteed points. This does
   * not trust the sampling: it checks the answer.
   */
  const pullIn = (edge: number, limit: number, direction: 1 | -1): number => {
    const span = Math.abs(limit - edge);
    if (span < VERIFY_STEP) return limit;
    for (let offset = VERIFY_STEP; offset <= span + 1e-9; offset += VERIFY_STEP) {
      if (makes(edge + direction * offset)) return edge + direction * Math.max(0, offset - VERIFY_STEP * 1.5);
    }
    return limit;
  };

  const gapAbove = range.islandAbove === null ? null : range.islandAbove - range.high;
  const gapBelow = range.islandBelow === null ? null : range.low - range.islandBelow;
  const ceiling = pullIn(
    range.high,
    gapAbove === null ? range.high + OUTSIDE_SPAN : range.high + gapAbove * OUTSIDE_SAFETY,
    1,
  );
  const floor = pullIn(
    range.low,
    gapBelow === null ? range.low - OUTSIDE_SPAN : range.low - gapBelow * OUTSIDE_SAFETY,
    -1,
  );

  /*
   * If the bar cannot reach a miss on one side — which happens where the
   * tolerance is so wide that there is nothing outside it within reach — then
   * the band is drawn all the way to that end of the bar. The drawing has to
   * keep matching what actually scores, even when the honest answer is "from
   * here, everything goes in".
   */
  const deadAbove = ceiling - range.high < 1e-4;
  const deadBelow = range.low - floor < 1e-4;
  const drawnLow = deadBelow ? 0 : bandLow;
  const drawnHigh = deadAbove ? 1 : bandHigh;

  const multiplierFor = (charge: number): number => {
    if (charge <= bandLow) {
      // Below the band: down to a shot that falls visibly short.
      const t = bandLow <= 0 ? 1 : (bandLow - charge) / bandLow;
      return range.low - (range.low - floor) * Math.min(1, Math.max(0, t));
    }
    if (charge >= bandHigh) {
      const t = bandHigh >= 1 ? 0 : (charge - bandHigh) / (1 - bandHigh);
      return range.high + (ceiling - range.high) * Math.min(1, Math.max(0, t));
    }
    // Inside the band, the mapping is the one that makes the band true: the two
    // halves are stretched separately, because the tolerance is not symmetric
    // around the ideal speed.
    return charge < sweet
      ? 1 - ((sweet - charge) / halfBand) * (1 - range.low)
      : 1 + ((charge - sweet) / halfBand) * (range.high - 1);
  };

  return {
    fromX,
    fromY,
    distance,
    idealSpeed: ideal,
    window: { low: drawnLow, high: drawnHigh },
    multiplierFor,
  };
}

/** Builds the initial ball state for an attempt released at `charge`. */
export function launchFromProfile(profile: ShotProfile, charge: number): BallState | null {
  return launchAtMultiplier(profile.fromX, profile.fromY, profile.multiplierFor(charge));
}
