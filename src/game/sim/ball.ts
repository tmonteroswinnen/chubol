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
  return Math.hypot(SHOT.aimTargetX - fromX, SHOT.aimTargetY - fromY);
}

/**
 * Speed that drops the ball through the rim centre from `fromX, fromY` at the
 * configured launch angle. Returns null when the geometry has no solution.
 */
export function idealLaunchSpeed(fromX: number, fromY: number): number | null {
  const d = distanceToRim(fromX, fromY);
  if (d < 1e-3) return null;
  const theta = (SHOT.launchAngleDeg * Math.PI) / 180;
  const dh = HOOP.rimHeight - SHOT.handHeight;
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

  /**
   * Feeds wall-clock time into the simulation. Integration always runs at a fixed
   * step, so the trajectory and the outcome are identical at any frame rate.
   */
  advance(deltaSeconds: number): SimEvent[] {
    const events: SimEvent[] = [];
    if (this.outcome !== null) return events;

    this.accumulator += Math.min(Math.max(deltaSeconds, 0), PHYSICS.maxFrameSeconds);
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
  while (sim.resolved === null) sim.advance(1 / 60);
  return sim.resolved;
}

/** Builds a ball state for an explicit speed multiplier over the ideal speed. */
export function launchAtMultiplier(fromX: number, fromY: number, multiplier: number): BallState | null {
  const ideal = idealLaunchSpeed(fromX, fromY);
  if (ideal === null) return null;
  const d = distanceToRim(fromX, fromY);
  const theta = (SHOT.launchAngleDeg * Math.PI) / 180;
  const speed = ideal * multiplier;
  const horizontal = speed * Math.cos(theta);
  return {
    x: fromX,
    y: fromY,
    z: SHOT.handHeight,
    vx: ((SHOT.aimTargetX - fromX) / d) * horizontal,
    vy: ((SHOT.aimTargetY - fromY) / d) * horizontal,
    vz: speed * Math.sin(theta),
  };
}

export interface Interval {
  readonly low: number;
  readonly high: number;
}

const SCAN_STEP = 0.002;
const SCAN_LIMIT = 0.09;
const REFINE_ITERATIONS = 14;

/**
 * The contiguous band of launch-speed multipliers around the ideal speed that
 * drops the ball straight through the ring.
 *
 * Over- and under-powered shots can also fall in after banking off the board,
 * but those form separate islands with misses in between, so the search walks
 * outwards in small steps and stops at the first miss instead of bisecting
 * across a gap and landing inside an island.
 */
export function solveMakeInterval(fromX: number, fromY: number): Interval | null {
  const makes = (multiplier: number): boolean => {
    const launch = launchAtMultiplier(fromX, fromY, multiplier);
    return launch !== null && simulateToOutcome(launch) === 'made';
  };
  if (!makes(1)) return null;

  const edge = (direction: 1 | -1): number => {
    let good = 1;
    let bad = 1 + direction * SCAN_LIMIT;
    for (let offset = SCAN_STEP; offset <= SCAN_LIMIT; offset += SCAN_STEP) {
      const probe = 1 + direction * offset;
      if (makes(probe)) good = probe;
      else { bad = probe; break; }
    }
    for (let i = 0; i < REFINE_ITERATIONS; i += 1) {
      const mid = (good + bad) / 2;
      if (makes(mid)) good = mid;
      else bad = mid;
    }
    return good;
  };

  return { low: edge(-1), high: edge(1) };
}

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
export function createShotProfile(fromX: number, fromY: number, points: number): ShotProfile | null {
  const ideal = idealLaunchSpeed(fromX, fromY);
  if (ideal === null) return null;
  const interval = solveMakeInterval(fromX, fromY);
  if (interval === null) return null;

  const distance = distanceToRim(fromX, fromY);
  const halfBand = designedBandWidth(points) / 2;
  const sweet = SHOT.sweetSpot;
  // Charge is stretched independently on each side, because the physical
  // tolerance is not symmetric around the ideal speed.
  const slopeLow = (1 - interval.low) / halfBand;
  const slopeHigh = (interval.high - 1) / halfBand;

  return {
    fromX,
    fromY,
    distance,
    idealSpeed: ideal,
    window: { low: sweet - halfBand, high: sweet + halfBand },
    multiplierFor: (charge: number): number =>
      charge < sweet ? 1 - (sweet - charge) * slopeLow : 1 + (charge - sweet) * slopeHigh,
  };
}

/** Builds the initial ball state for an attempt released at `charge`. */
export function launchFromProfile(profile: ShotProfile, charge: number): BallState | null {
  return launchAtMultiplier(profile.fromX, profile.fromY, profile.multiplierFor(charge));
}
