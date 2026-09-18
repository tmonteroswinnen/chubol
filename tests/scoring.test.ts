import { describe, expect, it } from 'vitest';
import { ALL_SPOTS_TOTAL, SHOT_SPOTS } from '../src/game/config/court';
import { nearestSpot, spotAt, spotById } from '../src/game/domain/spots';

describe('shot spots', () => {
  it('has exactly the seven marks from the croquis', () => {
    expect(SHOT_SPOTS).toHaveLength(7);
    expect(SHOT_SPOTS.map((s) => s.points)).toEqual([2, 3, 4, 5, 6, 7, 8]);
  });

  it('adds up to 35 when each mark is made once', () => {
    expect(ALL_SPOTS_TOTAL).toBe(35);
  });

  it('never invents a 1-point mark', () => {
    expect(SHOT_SPOTS.some((s) => s.points === 1)).toBe(false);
  });

  it('keeps the 7-point mark even though a player hides it in the reference frame', () => {
    const seven = SHOT_SPOTS.find((s) => s.points === 7);
    expect(seven).toBeDefined();
    expect(spotById('p7').points).toBe(7);
  });

  it('places the 3 and 7 marks towards the cypresses and the 4 and 6 towards the front wall', () => {
    expect(spotById('p3').y).toBeGreaterThan(0);
    expect(spotById('p7').y).toBeGreaterThan(0);
    expect(spotById('p4').y).toBeLessThan(0);
    expect(spotById('p6').y).toBeLessThan(0);
  });

  it('recognises a player standing on a mark', () => {
    for (const spot of SHOT_SPOTS) {
      expect(spotAt(spot.x, spot.y)?.id).toBe(spot.id);
      expect(spotAt(spot.x + spot.tolerance * 0.8, spot.y)?.id).toBe(spot.id);
    }
  });

  it('gives no shot value away from the marks', () => {
    for (const spot of SHOT_SPOTS) {
      expect(spotAt(spot.x + spot.tolerance + 0.2, spot.y)?.id).not.toBe(spot.id);
    }
    // A point well outside every mark scores nothing at all.
    expect(spotAt(12.2, -4.2)).toBeNull();
  });

  it('does not partition the court by distance', () => {
    // Halfway between the 5 and the 8 marks there is simply no shot value.
    expect(spotAt(2.2, 1.4)).toBeNull();
  });

  it('reports the closest mark for guidance even when out of tolerance', () => {
    const near = nearestSpot(2.2, 1.4);
    expect(near.spot.id.startsWith('p')).toBe(true);
    expect(near.distance).toBeGreaterThan(0);
  });
});
