import { describe, expect, it } from 'vitest';
import { SHOT_SPOTS, WAITING_SPOTS, WALK_BOUNDS } from '../src/game/config/court';

/**
 * Distances on the court that nothing else enforces.
 *
 * They were all written by hand and one of them drifted: a waiting spot ended up
 * 0.22 m from the 8-point mark, and because it was nearer the camera it was drawn
 * right over whoever was shooting from there.
 */
describe('las distancias de la cancha', () => {
  const gap = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

  it('no deja a nadie esperando encima de una marca', () => {
    for (const spot of WAITING_SPOTS) {
      for (const mark of SHOT_SPOTS) {
        expect(
          gap(spot, mark),
          `la espera (${spot.x}, ${spot.y}) está sobre la marca de ${mark.points}`,
        ).toBeGreaterThan(1.5);
      }
    }
  });

  it('separa a los que esperan entre sí', () => {
    WAITING_SPOTS.forEach((a, i) => {
      WAITING_SPOTS.slice(i + 1).forEach((b) => {
        expect(gap(a, b), `las esperas (${a.x}, ${a.y}) y (${b.x}, ${b.y}) se pisan`).toBeGreaterThan(1.4);
      });
    });
  });

  it('separa las marcas entre sí, para que una no se confunda con la otra', () => {
    SHOT_SPOTS.forEach((a, i) => {
      SHOT_SPOTS.slice(i + 1).forEach((b) => {
        expect(gap(a, b), `las marcas de ${a.points} y ${b.points} están encimadas`).toBeGreaterThan(
          a.tolerance + b.tolerance,
        );
      });
    });
  });

  it('deja todas las marcas dentro de lo caminable', () => {
    for (const mark of SHOT_SPOTS) {
      expect(mark.x, `marca de ${mark.points}`).toBeGreaterThanOrEqual(WALK_BOUNDS.minX);
      expect(mark.x, `marca de ${mark.points}`).toBeLessThanOrEqual(WALK_BOUNDS.maxX);
      expect(mark.y, `marca de ${mark.points}`).toBeGreaterThanOrEqual(WALK_BOUNDS.minY);
      expect(mark.y, `marca de ${mark.points}`).toBeLessThanOrEqual(WALK_BOUNDS.maxY);
    }
  });
});
