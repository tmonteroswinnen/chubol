/** Physics and shot-feel parameters. All editable; none of them are historical facts. */

export const PHYSICS = {
  gravity: 9.81,
  /** Fixed integration step, in seconds. Decouples the simulation from the frame rate. */
  fixedStep: 1 / 240,
  /** Safety cap on how much wall-clock time a single frame may feed the simulation. */
  maxFrameSeconds: 0.25,
  restitutionRim: 0.48,
  restitutionBoard: 0.58,
  restitutionGround: 0.6,
  groundFriction: 0.82,
  /** Simulated seconds of quiet after the first bounce before a miss is declared. */
  missSettleSeconds: 0.85,
  /** Hard ceiling on a single attempt, in simulated seconds. */
  maxShotSeconds: 6,
} as const;

export const SHOT = {
  /** Release height above the player's feet, in metres. */
  handHeight: 2.05,
  /** Fixed release angle above the horizontal, in degrees. */
  launchAngleDeg: 55,
  /** Charge bar sweeps 0 -> 1 -> 0 on this half-period, in milliseconds. */
  chargeHalfPeriodMs: 950,
  /** Charge value that releases exactly the ideal speed. */
  sweetSpot: 0.72,
  /** Aim is assisted onto the rim centre in this first version. */
  aimTargetX: 0.0,
  aimTargetY: 0.0,

  /**
   * How wide the scoring band is drawn on the charge bar, as a fraction of the
   * bar, for the 2-point mark and for the 8-point mark.
   *
   * The physical tolerance of a swish is roughly +/-1% of launch speed up close
   * and +/-0.4% from the 8-point mark, which is far too fine to hit on a timing
   * bar. So the bar is not a fixed speed scale: for each attempt the charge ->
   * speed mapping is stretched so that the real make interval lands on exactly
   * this fraction of the bar. The green band is therefore always the true make
   * interval — release inside it and the ball goes in.
   *
   * CONFIRMED: difficulty rises with the number on the mark, so the band is
   * keyed to the value of the mark and not to its distance. The 3 and the 4 sit
   * at the same distance from the hoop, and so do the 6 and the 7, but the
   * higher number is always the harder shot.
   */
  bandWidthLowest: 0.17,
  bandWidthHighest: 0.065,
  bandLowestPoints: 2,
  bandHighestPoints: 8,
} as const;

export const RULES_DEFAULTS = {
  /** CONFIRMED: a pair gets one minute. */
  turnSeconds: 60,
  /** PROVISIONAL: nothing was confirmed about ties. */
  tiebreakSeconds: 30,
  tiebreak: 'extraTurn' as const,
  /**
   * Extra rounds played before the game stops insisting. Two pairs that keep
   * ending level would otherwise loop forever, and since the real tiebreak was
   * never defined the honest end is to say so rather than invent a winner.
   */
  maxTiebreakRounds: 3,
  /** CONFIRMED: two pairs, two players each. */
  teams: 2,
  membersPerTeam: 2,
} as const;

export const MOVEMENT = {
  /** Walking speed of the active player, in metres per second. */
  speed: 4.2,
} as const;
