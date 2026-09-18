/**
 * Builds the scene plate: the fixed background of the court, and the separate
 * foreground strip that must occlude feet and ball.
 *
 * Everything is drawn through the projection, so the painted lines, the grass
 * grain, the brick courses and the fence all follow the same camera as the
 * gameplay entities. When the real artwork arrives, only the textures change:
 * the calibration stays.
 */

import { BACKGROUND, COURT, LOGICAL_HEIGHT, LOGICAL_WIDTH, SHOT_SPOTS, WALLS } from '../config/court';
import type { CourtProjection } from '../sim/projection';
import { PALETTE } from './palette';
import { ART_SCALE, createSurface, noise2, polygon, rect, strokePolyline, type PixelSurface } from './pixelCanvas';
import { drawText, measureText } from './pixelFont';

export const PLATE_WIDTH = LOGICAL_WIDTH / ART_SCALE;
export const PLATE_HEIGHT = LOGICAL_HEIGHT / ART_SCALE;

/** How far past the court the ground is painted, so no sky shows at the sides. */
const GROUND_MARGIN_X = 26;

export interface ScenePlate {
  readonly background: PixelSurface;
  readonly foreground: PixelSurface;
}

type Point = readonly [number, number];
type Project = (x: number, y: number, z?: number) => Point;

function projector(projection: CourtProjection): Project {
  return (x: number, y: number, z = 0): Point => {
    const p = projection.project(x, y, z);
    return [p.x / ART_SCALE, p.y / ART_SCALE];
  };
}

function quad(ctx: CanvasRenderingContext2D, a: Point, b: Point, c: Point, d: Point, colour: string): void {
  polygon(ctx, [a, b, c, d], colour);
}

/** A ground strip spanning the full painted width, between two depths. */
function groundBand(ctx: CanvasRenderingContext2D, p: Project, nearY: number, farY: number, colour: string): void {
  const left = COURT.minX - GROUND_MARGIN_X;
  const right = COURT.maxX + GROUND_MARGIN_X;
  quad(ctx, p(left, farY), p(right, farY), p(right, nearY), p(left, nearY), colour);
}

function drawSky(ctx: CanvasRenderingContext2D): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, PLATE_HEIGHT * 0.5);
  gradient.addColorStop(0, PALETTE.skyHigh);
  gradient.addColorStop(1, PALETTE.skyLow);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, PLATE_WIDTH, PLATE_HEIGHT);
}

/**
 * Nothing is modelled past the road, so a band of distant vegetation closes the
 * composition where the artwork shows sky meeting the road. Documented in
 * docs/VISUAL_SPEC.md as an illustration convention, not a rendered horizon.
 */
function drawDistantBand(ctx: CanvasRenderingContext2D, p: Project): void {
  // The far edge of the road is not horizontal on screen, so the band follows
  // the projected edge column by column instead of a single screen height.
  const left = COURT.minX - GROUND_MARGIN_X;
  const right = COURT.maxX + GROUND_MARGIN_X;
  const a = p(left, BACKGROUND.roadFarY);
  const b = p(right, BACKGROUND.roadFarY);
  const span = b[0] - a[0];
  for (let x = 0; x < PLATE_WIDTH; x += 1) {
    const t = span === 0 ? 0 : (x - a[0]) / span;
    const edge = a[1] + (b[1] - a[1]) * t;
    const lump = noise2(x * 0.05, 0, 3) * 5 + noise2(x * 0.014, 1, 7) * 7;
    const top = edge - 7 - lump;
    rect(ctx, x, top, 1, edge - top + 4, PALETTE.hedgeDark);
    if (noise2(x * 0.11, 2, 19) > 0.68) rect(ctx, x, top, 1, 2, PALETTE.hedge);
  }
}

function drawRoad(ctx: CanvasRenderingContext2D, p: Project): void {
  groundBand(ctx, p, BACKGROUND.roadNearY, BACKGROUND.roadFarY, PALETTE.roadMid);

  const left = COURT.minX - GROUND_MARGIN_X;
  const right = COURT.maxX + GROUND_MARGIN_X;
  const depth = BACKGROUND.roadNearY - BACKGROUND.roadFarY;
  // Wheel ruts, straight and parallel to the long side of the court.
  for (const [t, colour] of [
    [0.36, PALETTE.roadLight],
    [0.64, PALETTE.roadLight],
  ] as const) {
    const y = BACKGROUND.roadFarY + depth * t;
    strokePolyline(ctx, [p(left, y), p(right, y)], colour, 1);
  }
  for (let i = 0; i < 900; i += 1) {
    const fx = left + (right - left) * noise2(i, 11, 2);
    const fy = BACKGROUND.roadFarY + depth * noise2(i, 27, 5);
    const [sx, sy] = p(fx, fy);
    rect(ctx, sx, sy, 1, 1, noise2(i, 5, 9) > 0.5 ? PALETTE.roadLight : PALETTE.roadDark);
  }
  strokePolyline(ctx, [p(left, BACKGROUND.roadNearY), p(right, BACKGROUND.roadNearY)], PALETTE.roadEdge, 1.5);
}

/** Grass from the front of the frame all the way back to the fence line. */
function drawGrass(ctx: CanvasRenderingContext2D, p: Project): void {
  const nearY = COURT.minY - 4.5;
  const farY = BACKGROUND.roadNearY;
  groundBand(ctx, p, nearY, farY, PALETTE.grassBase);

  const left = COURT.minX - GROUND_MARGIN_X;
  const right = COURT.maxX + GROUND_MARGIN_X;

  // Worn ground where the game is actually played.
  const worn = [{ x: 1.7, y: 0, r: 2.3 }, ...SHOT_SPOTS.map((s) => ({ x: s.x, y: s.y, r: 0.9 }))];

  // Grain follows the ground plane, so it foreshortens with the camera instead
  // of reading as a flat screen-space pattern.
  const step = 0.17;
  for (let wx = left; wx < right; wx += step) {
    for (let wy = nearY; wy < farY; wy += step) {
      const n = noise2(wx * 5.7, wy * 5.7, 31);
      const streak = noise2(wx * 1.3, wy * 9.1, 37);
      const wear = worn.reduce((acc, w) => {
        const d = Math.hypot(wx - w.x, wy - w.y);
        return Math.max(acc, d > w.r ? 0 : 1 - d / w.r);
      }, 0);

      let colour: string | null = null;
      if (wear > 0.5 && n < 0.35 + wear * 0.45) {
        colour = n > 0.28 ? PALETTE.grassWorn : PALETTE.grassWornDark;
      } else if (n > 0.86 || streak > 0.93) colour = PALETTE.grassLight;
      else if (n < 0.14 || streak < 0.06) colour = PALETTE.grassDark;
      if (colour === null) continue;

      quad(ctx, p(wx, wy + step), p(wx + step, wy + step), p(wx + step, wy), p(wx, wy), colour);
    }
  }
}

/** Wire farm fence: wooden posts and thin wires, visible between the trees. */
function drawFence(ctx: CanvasRenderingContext2D, p: Project): void {
  const left = COURT.minX - GROUND_MARGIN_X;
  const right = COURT.maxX + GROUND_MARGIN_X;
  const y = BACKGROUND.fenceY;
  // Thin wires, not rails: one art pixel each, with gaps you can see the road through.
  for (const h of [0.4, 0.78, 1.12, BACKGROUND.fenceHeight]) {
    strokePolyline(ctx, [p(left, y, h), p(right, y, h)], PALETTE.fenceWire, 0.7);
  }
  for (let x = left; x <= right; x += 2.2) {
    const [bx, by] = p(x, y, 0);
    const [, ty] = p(x, y, BACKGROUND.fenceHeight + 0.14);
    const width = Math.max(2, Math.round((by - ty) * 0.09));
    rect(ctx, bx - width / 2, ty, width, by - ty, PALETTE.fencePostDark);
    rect(ctx, bx - width / 2, ty, Math.max(1, width - 1), by - ty, PALETTE.fencePost);
  }
}

/** Low hedge along the fence line, behind the cypresses. */
function drawBackHedge(ctx: CanvasRenderingContext2D, p: Project): void {
  const left = COURT.minX - GROUND_MARGIN_X;
  const right = COURT.maxX + GROUND_MARGIN_X;
  for (let x = left; x <= right; x += 0.3) {
    if (BACKGROUND.cypressXs.some((cx) => Math.abs(cx - x) < 1.0)) continue;
    const height = 0.45 + noise2(x * 2.3, 4, 13) * 0.5;
    const [bx, by] = p(x, BACKGROUND.cypressY + 0.5, 0);
    const [, ty] = p(x, BACKGROUND.cypressY + 0.5, height);
    const tone = noise2(x * 4.1, 9, 2);
    rect(ctx, bx - 5, ty, 11, by - ty + 2, tone > 0.55 ? PALETTE.hedge : PALETTE.hedgeDark);
    if (tone > 0.8) rect(ctx, bx - 3, ty, 6, 2, PALETTE.cypressLight);
  }
}

/**
 * Three wide, leafy cypresses. Tall columns that taper to a point, with a ragged
 * silhouette, rather than a stack of even ovals.
 */
function drawCypresses(ctx: CanvasRenderingContext2D, projection: CourtProjection): void {
  for (const cx of BACKGROUND.cypressXs) {
    const base = projection.project(cx, BACKGROUND.cypressY, 0);
    const top = projection.project(cx, BACKGROUND.cypressY, BACKGROUND.cypressHeight);
    const bx = base.x / ART_SCALE;
    const by = base.y / ART_SCALE;
    const ty = top.y / ART_SCALE;
    const height = by - ty;
    const maxHalf = height * 0.155;

    rect(ctx, bx - 2, by - height * 0.1, 4, height * 0.1 + 2, PALETTE.woodDark);

    for (let row = 0; row <= height; row += 1) {
      const t = row / height;
      // Widest around a third of the way up, narrowing to a point at the top.
      const profile = Math.sin(Math.min(1, t * 0.94 + 0.06) * Math.PI) ** 0.42;
      const ragged = 0.82 + noise2(cx * 9.1, row * 0.7, 17) * 0.36;
      const half = Math.max(1, maxHalf * profile * ragged);
      const y = by - row;
      for (let dx = -half; dx <= half; dx += 1) {
        const tone = noise2(cx * 3.1 + dx * 0.9, row * 1.3, 23);
        const edge = Math.abs(dx) / half;
        const colour =
          edge > 0.78 || tone < 0.26 ? PALETTE.cypressDark : tone > 0.74 ? PALETTE.cypressLight : PALETTE.cypressMid;
        rect(ctx, bx + dx, y, 1, 1, colour);
      }
    }
  }
}

/** Painted lines: they sit on the grass and are worn, not fresh sports paint. */
function drawCourtLines(ctx: CanvasRenderingContext2D, p: Project): void {
  const paint = (points: Point[], width: number, close = false) => {
    strokePolyline(ctx, points, PALETTE.lineWhite, width, close);
  };
  const lineWidth = 1.7;

  paint([p(-0.35, -3.4), p(-0.35, 3.4)], lineWidth);
  paint(
    [
      p(-0.35, -COURT.keyHalfWidth),
      p(COURT.keyLength, -COURT.keyHalfWidth),
      p(COURT.keyLength, COURT.keyHalfWidth),
      p(-0.35, COURT.keyHalfWidth),
    ],
    lineWidth,
  );

  const arcPoints: Point[] = [];
  for (let a = -90; a <= 90; a += 4) {
    const rad = (a * Math.PI) / 180;
    arcPoints.push(p(COURT.keyLength + Math.cos(rad) * COURT.keyArcRadius, Math.sin(rad) * COURT.keyArcRadius));
  }
  paint(arcPoints, lineWidth);

  const outer: Point[] = [];
  for (let a = -44; a <= 44; a += 2) {
    const rad = (a * Math.PI) / 180;
    outer.push(p(Math.cos(rad) * COURT.outerArcRadius, Math.sin(rad) * COURT.outerArcRadius));
  }
  paint(outer, lineWidth);
  paint([outer[0]!, p(COURT.outerArcRadius * Math.cos((-44 * Math.PI) / 180) - 1.0, -5.0)], lineWidth);
  paint([outer[outer.length - 1]!, p(COURT.outerArcRadius * Math.cos((44 * Math.PI) / 180) - 1.0, 5.0)], lineWidth);
}

/** Knocks pixels out of the fresh paint so the lines look weathered. */
function weatherPaint(ctx: CanvasRenderingContext2D): void {
  const data = ctx.getImageData(0, 0, PLATE_WIDTH, PLATE_HEIGHT);
  const pixels = data.data;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i] !== 241 || pixels[i + 1] !== 241 || pixels[i + 2] !== 227) continue;
    const pixel = i / 4;
    const px = pixel % PLATE_WIDTH;
    const py = Math.floor(pixel / PLATE_WIDTH);
    const n = noise2(px * 1.7, py * 1.7, 41);
    if (n > 0.72) {
      pixels[i] = 0xcf;
      pixels[i + 1] = 0xd2;
      pixels[i + 2] = 0xbd;
    } else if (n > 0.64) {
      pixels[i + 3] = 130;
    }
  }
  ctx.putImageData(data, 0, 0);
}

/** The seven values painted on the grass. */
function drawSpotNumbers(ctx: CanvasRenderingContext2D, projection: CourtProjection): void {
  for (const spot of SHOT_SPOTS) {
    const at = projection.project(spot.x, spot.y, 0);
    const pixel = Math.max(1, Math.round((at.scale / ART_SCALE) * 0.055));
    const style = { pixel, fill: PALETTE.lineWhite, outline: PALETTE.grassWornDark, outlineWidth: 0.5 } as const;
    const label = String(spot.points);
    const width = measureText(label, style);
    drawText(ctx, label, at.x / ART_SCALE - width / 2, at.y / ART_SCALE - pixel * 9, style);
  }
}

/** Low brick wall behind the hoop, at the left of the frame. */
function drawLeftWall(ctx: CanvasRenderingContext2D, p: Project): void {
  const x = WALLS.leftX;
  const h = WALLS.leftHeight;
  const from = COURT.minY - 1.5;
  const to = COURT.maxY + 1.2;
  quad(ctx, p(x, from, h), p(x, to, h), p(x, to, 0), p(x, from, 0), PALETTE.mortar);
  const brickY = 0.23;
  const brickZ = 0.075;
  let row = 0;
  for (let z = 0; z + brickZ <= h + 1e-6; z += brickZ) {
    const offset = row % 2 === 0 ? 0 : brickY / 2;
    for (let y = from + offset; y + brickY <= to; y += brickY) {
      const tone = noise2(y * 5.3, z * 40, 51);
      const colour = tone > 0.72 ? PALETTE.brickLight : tone < 0.28 ? PALETTE.brickDark : PALETTE.brick;
      quad(
        ctx,
        p(x, y + 0.02, z + brickZ - 0.012),
        p(x, y + brickY - 0.02, z + brickZ - 0.012),
        p(x, y + brickY - 0.02, z + 0.012),
        p(x, y + 0.02, z + 0.012),
        colour,
      );
    }
    row += 1;
  }
  strokePolyline(ctx, [p(x, from, h), p(x, to, h)], PALETTE.mortar, 1.6);
}

/** Foreground: the low brick wall at the front plus the bushes outside it. */
function drawFrontWall(ctx: CanvasRenderingContext2D, p: Project): void {
  const y = WALLS.frontY;
  const h = WALLS.frontHeight;
  const left = COURT.minX - GROUND_MARGIN_X;
  const right = COURT.maxX + GROUND_MARGIN_X;

  quad(ctx, p(left, y, h), p(right, y, h), p(right, y, 0), p(left, y, 0), PALETTE.mortar);
  const brickX = 0.23;
  const brickZ = 0.078;
  let row = 0;
  for (let z = 0; z + brickZ <= h + 1e-6; z += brickZ) {
    const offset = row % 2 === 0 ? 0 : brickX / 2;
    for (let x = left + offset; x + brickX <= right; x += brickX) {
      const tone = noise2(x * 5.7, z * 41, 71);
      const colour = tone > 0.72 ? PALETTE.brickLight : tone < 0.28 ? PALETTE.brickDark : PALETTE.brick;
      quad(
        ctx,
        p(x + 0.02, y, z + brickZ - 0.012),
        p(x + brickX - 0.02, y, z + brickZ - 0.012),
        p(x + brickX - 0.02, y, z + 0.012),
        p(x + 0.02, y, z + 0.012),
        colour,
      );
    }
    row += 1;
  }
  strokePolyline(ctx, [p(left, y, h), p(right, y, h)], PALETTE.mortar, 2.2);

  // Bushes growing outside the wall, in front of it, closing the bottom edge.
  const bushY = y - 1.9;
  for (let x = left; x <= right; x += 0.22) {
    const height = 0.42 + noise2(x * 2.1, 3, 61) * 0.34;
    const [bx, by] = p(x, bushY, 0);
    const [, ty] = p(x, bushY, height);
    const tone = noise2(x * 4.3, 7, 67);
    const half = 9;
    for (let dx = -half; dx <= half; dx += 1) {
      const dome = Math.cos((dx / half) * Math.PI * 0.5) ** 0.6;
      const topY = ty + (by - ty) * (1 - dome);
      const t2 = noise2(x * 3.7 + dx, 5, 73);
      const colour = t2 > 0.74 ? PALETTE.hedge : t2 < 0.3 ? PALETTE.hedgeDark : tone > 0.5 ? PALETTE.hedge : PALETTE.hedgeDark;
      rect(ctx, bx + dx, topY, 1, PLATE_HEIGHT - topY, colour);
      if (t2 > 0.9) rect(ctx, bx + dx, topY, 1, 2, PALETTE.cypressLight);
    }
  }
}

export function buildScenePlate(projection: CourtProjection): ScenePlate {
  const background = createSurface(PLATE_WIDTH, PLATE_HEIGHT, true);
  const foreground = createSurface(PLATE_WIDTH, PLATE_HEIGHT);
  const p = projector(projection);

  const bg = background.ctx;
  drawSky(bg);
  drawDistantBand(bg, p);
  drawRoad(bg, p);
  drawGrass(bg, p);
  drawFence(bg, p);
  drawBackHedge(bg, p);
  drawCypresses(bg, projection);
  drawCourtLines(bg, p);
  weatherPaint(bg);
  drawSpotNumbers(bg, projection);
  drawLeftWall(bg, p);

  drawFrontWall(foreground.ctx, p);

  return { background, foreground };
}
