import { describe, expect, it } from 'vitest';
import {
  CAMERA,
  COURT,
  FRAMING,
  FRAMING_ANCHORS,
  HOOP,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  SHOT_SPOTS,
} from '../src/game/config/court';
import { CourtProjection } from '../src/game/sim/projection';

const projection = CourtProjection.fit(CAMERA, FRAMING_ANCHORS, FRAMING);

describe('court projection', () => {
  it('fits the whole court inside the logical frame', () => {
    const corners = [
      [COURT.minX, COURT.minY],
      [COURT.maxX, COURT.minY],
      [COURT.minX, COURT.maxY],
      [COURT.maxX, COURT.maxY],
    ] as const;
    for (const [x, y] of corners) {
      const p = projection.project(x, y, 0);
      expect(p.x, `corner ${x},${y} x`).toBeGreaterThanOrEqual(0);
      expect(p.x, `corner ${x},${y} x`).toBeLessThanOrEqual(LOGICAL_WIDTH);
      expect(p.y, `corner ${x},${y} y`).toBeGreaterThanOrEqual(0);
      expect(p.y, `corner ${x},${y} y`).toBeLessThanOrEqual(LOGICAL_HEIGHT);
    }
  });

  it('keeps the hoop on the left and the play space extending to the right', () => {
    const hoop = projection.project(HOOP.groundX, HOOP.groundY, 0);
    const farEnd = projection.project(COURT.maxX, 0, 0);
    expect(hoop.x).toBeLessThan(LOGICAL_WIDTH / 3);
    expect(farEnd.x).toBeGreaterThan(hoop.x);
  });

  it('leaves room above the backboard for the logo band', () => {
    const boardTop = projection.project(HOOP.boardX, HOOP.groundY, HOOP.boardTopZ);
    expect(boardTop.y).toBeGreaterThan(150);
  });

  it('resolves height explicitly, not by sliding along the ground', () => {
    const feet = projection.project(5, 0, 0);
    const rim = projection.project(5, 0, HOOP.rimHeight);
    expect(rim.y).toBeLessThan(feet.y);
    // A ground homography alone would put both at the same place.
    expect(feet.y - rim.y).toBeGreaterThan(100);
  });

  it('scales with depth: the same person is bigger at the front of the court', () => {
    const front = projection.project(6, COURT.minY + 0.5, 0);
    const back = projection.project(6, COURT.maxY - 0.5, 0);
    expect(front.scale).toBeGreaterThan(back.scale);
  });

  it('round-trips every shot spot through the ground inverse', () => {
    for (const spot of SHOT_SPOTS) {
      const screen = projection.project(spot.x, spot.y, 0);
      const back = projection.groundFromScreen(screen.x, screen.y);
      expect(back, `spot ${spot.points}`).not.toBeNull();
      expect(Math.hypot(back!.x - spot.x, back!.y - spot.y)).toBeLessThan(1e-6);
    }
  });

  it('returns no ground point above the horizon', () => {
    expect(projection.groundFromScreen(LOGICAL_WIDTH / 2, projection.horizonY() - 10)).toBeNull();
  });

  it('does not move a shot spot when the browser window changes size', () => {
    // The logical canvas is fixed and the scale manager letterboxes the real
    // one, so world positions cannot depend on the window at all.
    const before = SHOT_SPOTS.map((s) => projection.project(s.x, s.y, 0));
    const rebuilt = CourtProjection.fit(CAMERA, FRAMING_ANCHORS, FRAMING);
    const after = SHOT_SPOTS.map((s) => rebuilt.project(s.x, s.y, 0));
    for (let i = 0; i < before.length; i += 1) {
      expect(after[i]!.x).toBeCloseTo(before[i]!.x, 10);
      expect(after[i]!.y).toBeCloseTo(before[i]!.y, 10);
    }
  });

  it('maps a pointer anywhere on the court back to a sensible world position', () => {
    for (const spot of SHOT_SPOTS) {
      const screen = projection.project(spot.x, spot.y, 0);
      const world = projection.groundFromScreen(screen.x + 12, screen.y + 8);
      expect(world).not.toBeNull();
      expect(Math.hypot(world!.x - spot.x, world!.y - spot.y)).toBeLessThan(1.2);
    }
  });

  it('refuses a framing anchor behind the camera', () => {
    expect(() =>
      CourtProjection.fit(CAMERA, [{ x: 0, y: -40, z: 0 }, { x: 1, y: -41, z: 0 }], FRAMING),
    ).toThrow();
  });
});
