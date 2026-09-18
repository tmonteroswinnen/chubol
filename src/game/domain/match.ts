/**
 * CHUBOL match rules.
 *
 * CONFIRMED by the owner of the court:
 *  - It is played in pairs.
 *  - A pair gets one minute to score as much as it can.
 *  - Every mark has to be shot; no spot may be left unshot.
 *  - Then the other pair takes its minute.
 *  - Whoever scored more wins.
 *  - There is no rebound rule: you simply have to go and fetch the ball fast so
 *    you do not lose time. That is why the clock keeps running while the shooter
 *    walks back to it (see GameScene).
 *
 * STILL OPEN: what happens on a tie. The tiebreak below is a placeholder, marked
 * as such in the interface, and is configuration rather than a claim.
 *
 * INTERPRETED, because it was not specified: inside the minute the two members of
 * the pair take turns shooting, and a mark cannot be repeated until all seven
 * have been shot in the current lap — that is how "no puede quedar un lugar por
 * tirar" is enforced against the clock.
 */

import { SHOT_SPOTS, type SpotId } from '../config/court';
import { RULES_DEFAULTS } from '../config/gameplay';

export interface TeamConfig {
  readonly name: string;
  /** The two members of the pair. */
  readonly members: readonly [string, string];
}

export type TiebreakRule = 'extraTurn' | 'shared';

export interface MatchConfig {
  readonly teams: readonly [TeamConfig, TeamConfig];
  /** Length of one pair's turn, in milliseconds. */
  readonly turnMs: number;
  /** Length of a tiebreak turn, in milliseconds. */
  readonly tiebreakMs: number;
  /** PROVISIONAL: nothing was confirmed about ties. */
  readonly tiebreak: TiebreakRule;
  /** Extra rounds to play before accepting a shared result. */
  readonly maxTiebreakRounds: number;
}

export interface Attempt {
  readonly shotId: number;
  readonly teamIndex: number;
  readonly memberIndex: number;
  readonly spotId: SpotId;
  /** Value of the mark at the moment the ball left the hand. */
  readonly points: number;
  readonly made: boolean;
  readonly scored: number;
  /** 0 for the main round, then 1, 2, ... for each tiebreak round. */
  readonly round: number;
}

export interface PendingShot {
  readonly shotId: number;
  readonly teamIndex: number;
  readonly memberIndex: number;
  readonly spotId: SpotId;
  readonly points: number;
}

export interface TeamStanding {
  readonly teamIndex: number;
  readonly name: string;
  readonly members: readonly string[];
  readonly score: number;
  readonly attempts: number;
  readonly makes: number;
  /** Laps of all seven marks completed. */
  readonly laps: number;
}

export interface MatchResult {
  readonly winners: readonly TeamStanding[];
  readonly standings: readonly TeamStanding[];
  /** True when the match ended level and no tiebreak rule has been confirmed. */
  readonly shared: boolean;
}

export type MatchPhase = 'idle' | 'turn' | 'betweenTurns' | 'finished';

/**
 * The two pairs, named by the owner of the court. Not invented: these are the
 * names he gave. The order matches the four friends in the artwork, so pair one
 * is the grey and the white-with-a-sun tanks and pair two is the red and the
 * black.
 */
export function defaultTeams(): [TeamConfig, TeamConfig] {
  return [
    { name: 'Bocha y Farico', members: ['Bocha', 'Farico'] },
    { name: 'Agus y Facu', members: ['Agus', 'Facu'] },
  ];
}

export function defaultMatchConfig(teams: readonly [TeamConfig, TeamConfig] = defaultTeams()): MatchConfig {
  return {
    teams,
    turnMs: RULES_DEFAULTS.turnSeconds * 1000,
    tiebreakMs: RULES_DEFAULTS.tiebreakSeconds * 1000,
    tiebreak: RULES_DEFAULTS.tiebreak,
    maxTiebreakRounds: RULES_DEFAULTS.maxTiebreakRounds,
  };
}

export class Match {
  readonly config: MatchConfig;

  private readonly log: Attempt[] = [];
  private readonly scores: [number, number] = [0, 0];
  private phaseValue: MatchPhase = 'idle';
  private roundValue = 0;
  private teamIndex = 0;
  private memberIndex = 0;
  /** Which teams still have a turn to play in this round. */
  private queue: number[] = [0, 1];
  private timeLeftMs = 0;
  private lapAttempted = new Set<SpotId>();
  private lapsThisTurn = 0;
  private nextShotId = 1;
  private pending: PendingShot | null = null;

  constructor(config: MatchConfig) {
    if (config.teams.length !== 2) throw new Error('CHUBOL is played by two pairs');
    if (config.turnMs <= 0) throw new Error('a turn must last longer than zero');
    this.config = config;
  }

  get phase(): MatchPhase {
    return this.phaseValue;
  }

  get round(): number {
    return this.roundValue;
  }

  get finished(): boolean {
    return this.phaseValue === 'finished';
  }

  get currentTeamIndex(): number {
    return this.teamIndex;
  }

  get currentTeam(): TeamConfig {
    return this.config.teams[this.teamIndex]!;
  }

  /** Which member of the pair is on the ball. They alternate after each attempt. */
  get currentMemberIndex(): number {
    return this.memberIndex;
  }

  get currentMemberName(): string {
    return this.currentTeam.members[this.memberIndex] ?? this.currentTeam.members[0];
  }

  get timeLeft(): number {
    return this.timeLeftMs;
  }

  get attempts(): readonly Attempt[] {
    return this.log;
  }

  get pendingShot(): PendingShot | null {
    return this.pending;
  }

  /** Marks already shot in the current lap. */
  get lapDone(): ReadonlySet<SpotId> {
    return this.lapAttempted;
  }

  get lapsCompletedThisTurn(): number {
    return this.lapsThisTurn;
  }

  /** Marks still owed before the lap is complete. */
  get lapRemaining(): readonly SpotId[] {
    return SHOT_SPOTS.filter((s) => !this.lapAttempted.has(s.id)).map((s) => s.id);
  }

  scoreOf(teamIndex: number): number {
    return this.scores[teamIndex] ?? 0;
  }

  /** Starts the next pair's turn. */
  startTurn(): void {
    if (this.phaseValue === 'finished') throw new Error('the match is already finished');
    const next = this.queue.shift();
    if (next === undefined) throw new Error('no turn is pending');
    this.teamIndex = next;
    this.memberIndex = 0;
    this.timeLeftMs = this.roundValue === 0 ? this.config.turnMs : this.config.tiebreakMs;
    this.lapAttempted = new Set();
    this.lapsThisTurn = 0;
    this.pending = null;
    this.phaseValue = 'turn';
  }

  /**
   * Advances the clock. The minute is wall time: it runs while the pair walks,
   * charges, shoots and goes to fetch the ball. A shot already in the air when
   * the minute runs out still counts, which is why `timeUp` waits for it.
   */
  tick(deltaMs: number): void {
    if (this.phaseValue !== 'turn') return;
    this.timeLeftMs = Math.max(0, this.timeLeftMs - Math.max(0, deltaMs));
  }

  get timeUp(): boolean {
    return this.phaseValue === 'turn' && this.timeLeftMs <= 0 && this.pending === null;
  }

  /**
   * Whether the pair may shoot from this mark right now. A mark already shot in
   * the current lap is refused until the other six have been shot too.
   */
  canShootFrom(spotId: SpotId): boolean {
    if (this.phaseValue !== 'turn') return false;
    if (this.pending !== null) return false;
    if (this.timeLeftMs <= 0) return false;
    return !this.lapAttempted.has(spotId);
  }

  beginShot(spotId: SpotId, points: number): PendingShot {
    if (!this.canShootFrom(spotId)) throw new Error(`the ${spotId} mark cannot be shot right now`);
    const shot: PendingShot = {
      shotId: this.nextShotId,
      teamIndex: this.teamIndex,
      memberIndex: this.memberIndex,
      spotId,
      points,
    };
    this.nextShotId += 1;
    this.pending = shot;
    return shot;
  }

  resolveShot(shotId: number, made: boolean): Attempt {
    const shot = this.pending;
    if (shot === null) throw new Error('there is no attempt to resolve');
    if (shot.shotId !== shotId) throw new Error(`attempt ${shotId} is not the one in flight`);

    const attempt: Attempt = {
      shotId,
      teamIndex: shot.teamIndex,
      memberIndex: shot.memberIndex,
      spotId: shot.spotId,
      points: shot.points,
      made,
      scored: made ? shot.points : 0,
      round: this.roundValue,
    };
    this.pending = null;
    this.log.push(attempt);
    this.scores[shot.teamIndex] = (this.scores[shot.teamIndex] ?? 0) + attempt.scored;

    this.lapAttempted.add(shot.spotId);
    if (this.lapAttempted.size === SHOT_SPOTS.length) {
      this.lapsThisTurn += 1;
      this.lapAttempted = new Set();
    }
    // The two members of the pair alternate on the ball.
    this.memberIndex = (this.memberIndex + 1) % this.currentTeam.members.length;
    return attempt;
  }

  cancelShot(): void {
    this.pending = null;
  }

  /** Closes the current turn and moves on, or ends the match. */
  endTurn(): void {
    if (this.phaseValue !== 'turn') return;
    this.pending = null;
    if (this.queue.length > 0) {
      this.phaseValue = 'betweenTurns';
      return;
    }
    const level = this.scores[0] === this.scores[1];
    if (!level) {
      this.phaseValue = 'finished';
      return;
    }
    if (this.config.tiebreak === 'shared' || this.roundValue >= this.config.maxTiebreakRounds) {
      // Two pairs that keep ending level would loop forever. The real rule was
      // never defined, so the match stops and the result says it is shared.
      this.phaseValue = 'finished';
      return;
    }
    // PROVISIONAL: an equal extra turn each, until someone is ahead.
    this.roundValue += 1;
    this.queue = [0, 1];
    this.phaseValue = 'betweenTurns';
  }

  standings(): TeamStanding[] {
    const rows = this.config.teams.map((team, teamIndex) => {
      const played = this.log.filter((a) => a.teamIndex === teamIndex);
      const laps = Math.floor(played.length / SHOT_SPOTS.length);
      return {
        teamIndex,
        name: team.name,
        members: [...team.members],
        score: this.scores[teamIndex] ?? 0,
        attempts: played.length,
        makes: played.filter((a) => a.made).length,
        laps,
      };
    });
    return rows.sort((a, b) => b.score - a.score || a.teamIndex - b.teamIndex);
  }

  result(): MatchResult | null {
    if (this.phaseValue !== 'finished') return null;
    const standings = this.standings();
    const top = standings[0];
    if (top === undefined) return null;
    const winners = standings.filter((s) => s.score === top.score);
    return { winners, standings, shared: winners.length > 1 };
  }
}
