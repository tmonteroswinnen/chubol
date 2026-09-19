import { describe, expect, it } from 'vitest';
import { SHOT_SPOTS, type SpotId } from '../src/game/config/court';
import { Match, defaultMatchConfig, defaultTeams, type MatchConfig } from '../src/game/domain/match';
import { spotById } from '../src/game/domain/spots';

function config(overrides: Partial<MatchConfig> = {}): MatchConfig {
  return { ...defaultMatchConfig(defaultTeams()), ...overrides };
}

/** Takes one attempt from a mark. */
function shoot(match: Match, spot: SpotId, made: boolean): void {
  const s = spotById(spot);
  const pending = match.beginShot(s.id, s.points);
  match.resolveShot(pending.shotId, made);
}

/** Shoots every mark once, in order, reporting the points that should be scored. */
function fullLap(match: Match, made: boolean): number {
  let expected = 0;
  for (const spot of SHOT_SPOTS) {
    shoot(match, spot.id, made);
    if (made) expected += spot.points;
  }
  return expected;
}

describe('CHUBOL match: pairs, one minute each', () => {
  it('is played by two pairs of two', () => {
    const match = new Match(config());
    expect(match.config.teams).toHaveLength(2);
    for (const team of match.config.teams) expect(team.members).toHaveLength(2);
  });

  it('gives the pair a minute by default', () => {
    const match = new Match(config());
    match.startTurn();
    expect(match.timeLeft).toBe(60_000);
  });

  it('counts the clock down while the pair plays', () => {
    const match = new Match(config());
    match.startTurn();
    match.tick(1500);
    expect(match.timeLeft).toBe(58_500);
  });

  it('does not run the clock before the turn starts or after it ends', () => {
    const match = new Match(config());
    match.tick(5000);
    expect(match.timeLeft).toBe(0);
    match.startTurn();
    match.endTurn();
    const left = match.timeLeft;
    match.tick(5000);
    expect(match.timeLeft).toBe(left);
  });

  it('scores the value of the mark and zero for a miss', () => {
    const match = new Match(config());
    match.startTurn();
    shoot(match, 'p8', true);
    shoot(match, 'p2', false);
    expect(match.scoreOf(0)).toBe(8);
  });

  it('adds up to 35 when a pair makes one from each mark', () => {
    const match = new Match(config());
    match.startTurn();
    const expected = fullLap(match, true);
    expect(expected).toBe(35);
    expect(match.scoreOf(0)).toBe(35);
  });

  it('refuses to repeat a mark until every mark has been shot', () => {
    const match = new Match(config());
    match.startTurn();
    shoot(match, 'p5', true);
    expect(match.canShootFrom('p5')).toBe(false);
    expect(() => shoot(match, 'p5', true)).toThrow();
    expect(match.canShootFrom('p8')).toBe(true);
  });

  it('opens every mark again once the lap is complete, except the one just shot', () => {
    const match = new Match(config());
    match.startTurn();
    fullLap(match, false);
    expect(match.lapsCompletedThisTurn).toBe(1);

    // Without this you leave the 8 for last, the lap resets under your feet and
    // you shoot it again without moving, which is the opposite of the rule that
    // every mark has to be shot.
    const last = SHOT_SPOTS[SHOT_SPOTS.length - 1]!;
    expect(match.blockedSpot).toBe(last.id);
    expect(match.canShootFrom(last.id)).toBe(false);
    for (const spot of SHOT_SPOTS.filter((s) => s.id !== last.id)) {
      expect(match.canShootFrom(spot.id), spot.id).toBe(true);
    }

    // One shot anywhere else and it opens up again.
    shoot(match, SHOT_SPOTS[0]!.id, false);
    expect(match.canShootFrom(last.id)).toBe(true);
  });

  it('lets the next pair use the mark the previous one just shot', () => {
    const match = new Match(config());
    match.startTurn();
    shoot(match, 'p5', true);
    match.endTurn();
    match.startTurn();
    expect(match.blockedSpot).toBe(null);
    expect(match.canShootFrom('p5')).toBe(true);
  });

  it('lets the match say which pair shoots first', () => {
    // Against the machine the person goes first: picking the second pair used to
    // mean the first minute of your first game was spent watching.
    const match = new Match(config({ startingTeam: 1 }));
    match.startTurn();
    expect(match.currentTeamIndex).toBe(1);
    match.endTurn();
    match.startTurn();
    expect(match.currentTeamIndex).toBe(0);
  });

  it('refuses to end a turn with a shot still in the air', () => {
    const match = new Match(config());
    match.startTurn();
    match.beginShot('p8', 8);
    expect(() => match.endTurn()).toThrow();
  });

  it('refuses to start a turn that is already being played', () => {
    const match = new Match(config());
    match.startTurn();
    expect(() => match.startTurn()).toThrow();
  });

  it('keeps the clock sane when handed a delta that is not a number', () => {
    const match = new Match(config());
    match.startTurn();
    match.tick(Number.NaN);
    expect(match.timeLeft).toBe(60_000);
  });

  it('counts laps really closed, not attempts divided by seven', () => {
    // Seven attempts by the same pair, spread over two turns, never covering the
    // seven marks. Dividing attempts by seven called that one lap; it is none.
    const match = new Match(config());
    match.startTurn();
    for (const id of ['p2', 'p3', 'p4', 'p5', 'p6', 'p7'] as const) shoot(match, id, false);
    match.endTurn();
    match.startTurn();
    match.endTurn();
    match.startTurn();
    shoot(match, 'p2', false);
    const standing = match.standings().find((s) => s.teamIndex === 0);
    expect(standing?.attempts).toBe(7);
    expect(standing?.laps).toBe(0);
  });

  it('reports which marks are still owed in the lap', () => {
    const match = new Match(config());
    match.startTurn();
    shoot(match, 'p2', true);
    shoot(match, 'p7', false);
    expect(match.lapRemaining).toEqual(['p3', 'p4', 'p5', 'p6', 'p8']);
  });

  it('alternates the two members of the pair on the ball', () => {
    const match = new Match(config());
    match.startTurn();
    expect(match.currentMemberIndex).toBe(0);
    shoot(match, 'p2', true);
    expect(match.currentMemberIndex).toBe(1);
    shoot(match, 'p3', true);
    expect(match.currentMemberIndex).toBe(0);
  });

  it('counts an attempt at most once', () => {
    const match = new Match(config());
    match.startTurn();
    const pending = match.beginShot('p5', 5);
    match.resolveShot(pending.shotId, true);
    expect(() => match.resolveShot(pending.shotId, true)).toThrow();
    expect(match.scoreOf(0)).toBe(5);
  });

  it('refuses a second attempt while one is in the air', () => {
    const match = new Match(config());
    match.startTurn();
    match.beginShot('p2', 2);
    expect(() => match.beginShot('p3', 3)).toThrow();
  });

  it('keeps the value locked to the mark the ball left from', () => {
    const match = new Match(config());
    match.startTurn();
    const pending = match.beginShot('p6', 6);
    match.resolveShot(pending.shotId, true);
    expect(match.attempts[0]?.points).toBe(6);
    expect(match.scoreOf(0)).toBe(6);
  });

  it('will not let a shot start once the minute is over', () => {
    const match = new Match(config());
    match.startTurn();
    match.tick(60_000);
    expect(match.timeUp).toBe(true);
    expect(match.canShootFrom('p2')).toBe(false);
  });

  it('lets a shot already in the air finish after the buzzer', () => {
    const match = new Match(config());
    match.startTurn();
    const pending = match.beginShot('p8', 8);
    match.tick(60_000);
    expect(match.timeUp).toBe(false); // still waiting for the ball
    match.resolveShot(pending.shotId, true);
    expect(match.timeUp).toBe(true);
    expect(match.scoreOf(0)).toBe(8);
  });

  it('hands the minute to the other pair', () => {
    const match = new Match(config());
    match.startTurn();
    expect(match.currentTeamIndex).toBe(0);
    match.endTurn();
    expect(match.finished).toBe(false);
    match.startTurn();
    expect(match.currentTeamIndex).toBe(1);
    expect(match.timeLeft).toBe(60_000);
  });

  it('gives the win to the pair with more points', () => {
    const match = new Match(config());
    match.startTurn();
    shoot(match, 'p8', true);
    match.endTurn();
    match.startTurn();
    shoot(match, 'p2', true);
    match.endTurn();
    expect(match.finished).toBe(true);
    const result = match.result();
    expect(result?.winners).toHaveLength(1);
    expect(result?.winners[0]?.name).toBe('Bocha y Farico');
    expect(result?.shared).toBe(false);
  });

  it('plays an equal extra turn each when the pairs finish level', () => {
    const match = new Match(config());
    match.startTurn();
    shoot(match, 'p5', true);
    match.endTurn();
    match.startTurn();
    shoot(match, 'p5', true);
    match.endTurn();
    expect(match.finished).toBe(false);
    expect(match.round).toBe(1);

    match.startTurn();
    expect(match.timeLeft).toBe(30_000);
    shoot(match, 'p8', true);
    match.endTurn();
    match.startTurn();
    shoot(match, 'p2', false);
    match.endTurn();
    expect(match.finished).toBe(true);
    expect(match.result()?.winners[0]?.name).toBe('Bocha y Farico');
  });

  it('can be configured to leave a tie shared instead of playing on', () => {
    const match = new Match(config({ tiebreak: 'shared' }));
    match.startTurn();
    shoot(match, 'p5', true);
    match.endTurn();
    match.startTurn();
    shoot(match, 'p5', true);
    match.endTurn();
    expect(match.finished).toBe(true);
    expect(match.result()?.shared).toBe(true);
    expect(match.result()?.winners).toHaveLength(2);
  });

  it('starts a rematch with a clean scoreboard', () => {
    const first = new Match(config());
    first.startTurn();
    shoot(first, 'p8', true);
    const rematch = new Match(first.config);
    expect(rematch.scoreOf(0)).toBe(0);
    expect(rematch.attempts).toHaveLength(0);
    expect(rematch.finished).toBe(false);
  });

  it('refuses a setup that is not two pairs', () => {
    expect(() => new Match(config({ turnMs: 0 }))).toThrow();
  });
});

describe('the match always has a way out', () => {
  it('stops playing extra rounds when the pairs keep ending level', () => {
    const match = new Match({ ...defaultMatchConfig(defaultTeams()), maxTiebreakRounds: 2 });
    // Nobody ever scores: without a cap this would hand out turns forever.
    for (let guard = 0; guard < 50 && !match.finished; guard += 1) {
      match.startTurn();
      match.tick(match.timeLeft);
      match.endTurn();
    }
    expect(match.finished).toBe(true);
    expect(match.round).toBeLessThanOrEqual(2);
    expect(match.result()?.shared).toBe(true);
  });

  it('never leaves a turn hanging when no shot is ever taken', () => {
    const match = new Match(defaultMatchConfig(defaultTeams()));
    match.startTurn();
    match.tick(60_000);
    expect(match.timeUp).toBe(true);
    match.endTurn();
    expect(match.phase).toBe('betweenTurns');
  });
});
