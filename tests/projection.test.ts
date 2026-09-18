import { describe, expect, it } from 'vitest';
import { ART_HEIGHT, ART_WIDTH, HOOP, SHOT_SPOTS, WALK_BOUNDS } from '../src/game/config/court';
import { courtProjection } from '../src/game/render/context';

const projection = courtProjection();

/**
 * Where each painted number sits on the supplied plate, measured on 6x crops.
 * These are the numbers the calibration was solved against, so this test is what
 * keeps the game aligned with the artwork: if someone nudges the camera, the
 * marks stop landing on their painted glyphs and this fails.
 */
const PAINTED_NUMBERS: ReadonlyArray<readonly [number, number, number]> = [
  [2, 285, 537],
  [3, 330, 406],
  [4, 131, 726],
  [5, 676, 555],
  [6, 808, 781],
  [7, 819, 400],
  [8, 1242, 600],
];

describe('court projection, calibrated to the supplied plate', () => {
  it('puts every shot spot on top of its painted number', () => {
    for (const [points, sx, sy] of PAINTED_NUMBERS) {
      const spot = SHOT_SPOTS.find((s) => s.points === points);
      expect(spot, `mark ${points}`).toBeDefined();
      const at = projection.project(spot!.x, spot!.y, 0);
      expect(Math.hypot(at.x - sx, at.y - sy), `mark ${points} is off its glyph`).toBeLessThan(4);
    }
  });

  it('puts the rim where the artwork draws it', () => {
    const rim = projection.project(HOOP.groundX, HOOP.groundY, HOOP.rimHeight);
    expect(Math.hypot(rim.x - 301, rim.y - 270)).toBeLessThan(4);
  });

  it('keeps the hoop on the left and the play space extending to the right', () => {
    const hoop = projection.project(HOOP.groundX, HOOP.groundY, 0);
    const farEnd = projection.project(WALK_BOUNDS.maxX, 0, 0);
    expect(hoop.x).toBeLessThan(ART_WIDTH / 3);
    expect(farEnd.x).toBeGreaterThan(hoop.x);
  });

  it('keeps the whole walkable area inside the artwork', () => {
    const corners = [
      [WALK_BOUNDS.minX, WALK_BOUNDS.minY],
      [WALK_BOUNDS.maxX, WALK_BOUNDS.minY],
      [WALK_BOUNDS.minX, WALK_BOUNDS.maxY],
      [WALK_BOUNDS.maxX, WALK_BOUNDS.maxY],
    ] as const;
    for (const [x, y] of corners) {
      const at = projection.project(x, y, 0);
      expect(at.x, `corner ${x},${y}`).toBeGreaterThanOrEqual(0);
      expect(at.x, `corner ${x},${y}`).toBeLessThanOrEqual(ART_WIDTH);
      expect(at.y, `corner ${x},${y}`).toBeGreaterThanOrEqual(0);
      expect(at.y, `corner ${x},${y}`).toBeLessThanOrEqual(ART_HEIGHT);
    }
  });

  it('resolves height explicitly, not by sliding along the ground', () => {
    const feet = projection.project(4, 0, 0);
    const rim = projection.project(4, 0, HOOP.rimHeight);
    expect(rim.y).toBeLessThan(feet.y);
    // A ground homography alone would put both at the same place.
    expect(feet.y - rim.y).toBeGreaterThan(150);
  });

  it('draws an adult at a size that matches the artwork', () => {
    // The four adults in the reference are drawn 215 to 305 px tall. Anything
    // far outside that means the scale calibration has drifted.
    for (const spot of SHOT_SPOTS) {
      const feet = projection.project(spot.x, spot.y, 0);
      const head = projection.project(spot.x, spot.y, 1.75);
      const drawn = feet.y - head.y;
      expect(drawn, `mark ${spot.points}`).toBeGreaterThan(150);
      expect(drawn, `mark ${spot.points}`).toBeLessThan(330);
    }
  });

  it('scales with depth: the same person is bigger at the front of the court', () => {
    const front = projection.project(4, WALK_BOUNDS.minY, 0);
    const back = projection.project(4, WALK_BOUNDS.maxY, 0);
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
    expect(projection.groundFromScreen(ART_WIDTH / 2, projection.horizonY() - 10)).toBeNull();
  });

  it('does not move a shot spot when the browser window changes size', () => {
    // The logical canvas is fixed and the scale manager letterboxes the real
    // one, so world positions cannot depend on the window at all.
    const again = courtProjection();
    for (const spot of SHOT_SPOTS) {
      const a = projection.project(spot.x, spot.y, 0);
      const b = again.project(spot.x, spot.y, 0);
      expect(b.x).toBeCloseTo(a.x, 10);
      expect(b.y).toBeCloseTo(a.y, 10);
    }
  });
});
