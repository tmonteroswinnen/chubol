/**
 * Practice session: one player, no clock, no invented win condition. It exists to
 * check that the court, the physics and the seven values behave.
 */

import { SHOT_SPOTS, type SpotId } from '../config/court';

export interface PracticeAttempt {
  readonly shotId: number;
  readonly spotId: SpotId;
  readonly points: number;
  readonly made: boolean;
}

export class PracticeSession {
  private readonly log: PracticeAttempt[] = [];
  private nextShotId = 1;
  private pending: { shotId: number; spotId: SpotId; points: number } | null = null;

  get total(): number {
    return this.log.reduce((acc, a) => acc + (a.made ? a.points : 0), 0);
  }

  get attempts(): readonly PracticeAttempt[] {
    return this.log;
  }

  get makes(): number {
    return this.log.filter((a) => a.made).length;
  }

  /** Spots that have been made at least once, for the "one from each" tally. */
  get spotsCleared(): ReadonlySet<SpotId> {
    return new Set(this.log.filter((a) => a.made).map((a) => a.spotId));
  }

  get clearedAll(): boolean {
    return SHOT_SPOTS.every((spot) => this.spotsCleared.has(spot.id));
  }

  beginShot(spotId: SpotId, points: number): number {
    if (this.pending !== null) throw new Error('an attempt is already in flight');
    const shotId = this.nextShotId;
    this.nextShotId += 1;
    this.pending = { shotId, spotId, points };
    return shotId;
  }

  resolveShot(shotId: number, made: boolean): PracticeAttempt {
    const shot = this.pending;
    if (shot === null) throw new Error('there is no attempt to resolve');
    if (shot.shotId !== shotId) throw new Error(`attempt ${shotId} is not the one in flight`);
    this.pending = null;
    const attempt: PracticeAttempt = { shotId, spotId: shot.spotId, points: shot.points, made };
    this.log.push(attempt);
    return attempt;
  }

  cancelShot(): void {
    this.pending = null;
  }

  reset(): void {
    this.log.length = 0;
    this.pending = null;
    this.nextShotId = 1;
  }
}
