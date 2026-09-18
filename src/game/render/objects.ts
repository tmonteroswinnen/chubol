/**
 * Procedural development art for the ball, the hoop and the props.
 * Placeholders, like the characters — see docs/ASSET_REQUESTS.md.
 */

import { BACKGROUND, COURT, HOOP, LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../config/court';
import type { CourtProjection } from '../sim/projection';
import { PALETTE, TROPHY } from './palette';
import { ART_SCALE, createSurface, ellipse, noise2, polygon, rect, strokePolyline, type PixelSurface } from './pixelCanvas';
import { drawText, measureText } from './pixelFont';
import type { SpriteFrame } from './characters';

const PLATE_W = LOGICAL_WIDTH / ART_SCALE;
const PLATE_H = LOGICAL_HEIGHT / ART_SCALE;

type Point = readonly [number, number];

function projector(projection: CourtProjection) {
  return (x: number, y: number, z = 0): Point => {
    const p = projection.project(x, y, z);
    return [p.x / ART_SCALE, p.y / ART_SCALE];
  };
}

/** Ball sprite at a given diameter in art pixels, with volume shading and seams. */
export function buildBall(diameter: number, spin = 0): SpriteFrame {
  const size = Math.max(4, Math.round(diameter));
  const surface = createSurface(size + 2, size + 2);
  const ctx = surface.ctx;
  const r = size / 2;
  const cx = r + 1;
  const cy = r + 1;
  ellipse(ctx, cx, cy, r, r, PALETTE.ballDark);
  ellipse(ctx, cx, cy, r - 1, r - 1, PALETTE.ballOrange);
  // Lit side.
  ellipse(ctx, cx - r * 0.25, cy - r * 0.28, r * 0.55, r * 0.5, '#f09a4a');
  // Seams.
  ctx.strokeStyle = PALETTE.ballLine;
  ctx.lineWidth = Math.max(1, size / 16);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(spin);
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.lineTo(r, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.42, r, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  return { surface, pivotX: cx, pivotY: cy };
}

/** Soft contact shadow, drawn separately so it can follow the ball height. */
export function buildShadow(width: number): SpriteFrame {
  const w = Math.max(4, Math.round(width));
  const h = Math.max(2, Math.round(width * 0.42));
  const surface = createSurface(w + 2, h + 2);
  ellipse(surface.ctx, w / 2 + 1, h / 2 + 1, w / 2, h / 2, PALETTE.shadow);
  return { surface, pivotX: w / 2 + 1, pivotY: h / 2 + 1 };
}

export interface HoopLayers {
  /** Post, backboard and the far half of the ring: drawn behind the ball. */
  readonly back: PixelSurface;
  /** Near half of the ring and the chain net: drawn in front of the ball. */
  readonly front: PixelSurface;
}

/**
 * The hoop is split so a ball dropping through the ring is occluded correctly:
 * it passes behind the near rim and the chains, and in front of the board.
 */
export function buildHoop(projection: CourtProjection): HoopLayers {
  const back = createSurface(PLATE_W, PLATE_H);
  const front = createSurface(PLATE_W, PLATE_H);
  const p = projector(projection);
  const b = back.ctx;
  const f = front.ctx;

  const boardX = HOOP.boardX;
  const halfW = HOOP.boardHalfWidth;

  // Rough wooden post, home-made.
  const postW = 0.13;
  for (const side of [-1, 1] as const) {
    const y = side * (halfW * 0.62);
    polygon(
      b,
      [
        p(boardX - postW, y - postW, 0),
        p(boardX + postW, y - postW, 0),
        p(boardX + postW, y - postW, HOOP.boardTopZ - 0.15),
        p(boardX - postW, y - postW, HOOP.boardTopZ - 0.15),
      ],
      side === -1 ? PALETTE.woodMid : PALETTE.woodDark,
    );
  }
  // Diagonal brace.
  strokePolyline(
    b,
    [p(boardX - 0.1, -halfW * 0.62, 0.4), p(boardX - 0.1, halfW * 0.62, 2.1)],
    PALETTE.woodDark,
    3,
  );

  // Backboard: rustic, weathered planks. Never glass or acrylic.
  const planks = 5;
  for (let i = 0; i < planks; i += 1) {
    const z0 = HOOP.boardBottomZ + ((HOOP.boardTopZ - HOOP.boardBottomZ) * i) / planks;
    const z1 = HOOP.boardBottomZ + ((HOOP.boardTopZ - HOOP.boardBottomZ) * (i + 1)) / planks;
    const tone = noise2(i * 3.7, 1, 91);
    const colour = tone > 0.66 ? PALETTE.woodLight : tone > 0.33 ? PALETTE.woodMid : PALETTE.woodDark;
    polygon(b, [p(boardX, -halfW, z1), p(boardX, halfW, z1), p(boardX, halfW, z0), p(boardX, -halfW, z0)], colour);
    strokePolyline(b, [p(boardX, -halfW, z0), p(boardX, halfW, z0)], PALETTE.woodLine, 1);
    // Grain.
    for (let g = 0; g < 7; g += 1) {
      const gy = -halfW + halfW * 2 * noise2(i * 5.1, g, 97);
      const gz = z0 + (z1 - z0) * 0.5;
      strokePolyline(b, [p(boardX, gy, gz), p(boardX, gy + 0.22, gz)], PALETTE.woodLine, 1);
    }
  }
  // Simple white target square.
  strokePolyline(
    b,
    [
      p(boardX, -0.3, HOOP.rimHeight + 0.06),
      p(boardX, 0.3, HOOP.rimHeight + 0.06),
      p(boardX, 0.3, HOOP.rimHeight + 0.52),
      p(boardX, -0.3, HOOP.rimHeight + 0.52),
    ],
    PALETTE.lineWhite,
    1.6,
    true,
  );
  strokePolyline(b, [p(boardX, -halfW, HOOP.boardTopZ), p(boardX, halfW, HOOP.boardTopZ)], PALETTE.woodLine, 1.6);

  // Ring, split at the widest points into a far half and a near half.
  const ringPoint = (deg: number): Point => {
    const rad = (deg * Math.PI) / 180;
    return p(HOOP.groundX + Math.cos(rad) * HOOP.rimRadius, HOOP.groundY + Math.sin(rad) * HOOP.rimRadius, HOOP.rimHeight);
  };
  const farHalf: Point[] = [];
  const nearHalf: Point[] = [];
  for (let a = 0; a <= 180; a += 6) farHalf.push(ringPoint(a));
  for (let a = 180; a <= 360; a += 6) nearHalf.push(ringPoint(a));
  strokePolyline(b, farHalf, PALETTE.rimMetalDark, 3);
  strokePolyline(b, farHalf, PALETTE.rimMetal, 2);
  // Arm joining the ring to the board.
  strokePolyline(b, [p(boardX, 0, HOOP.rimHeight), p(-HOOP.rimRadius * 0.6, 0, HOOP.rimHeight)], PALETTE.rimMetalDark, 3);

  // Chain net, hanging from the ring. Links are readable, not a solid cone.
  const netDepth = 0.42;
  for (let a = 0; a < 360; a += 30) {
    const rad = (a * Math.PI) / 180;
    const topX = HOOP.groundX + Math.cos(rad) * HOOP.rimRadius;
    const topY = HOOP.groundY + Math.sin(rad) * HOOP.rimRadius;
    const botX = HOOP.groundX + Math.cos(rad) * HOOP.rimRadius * 0.5;
    const botY = HOOP.groundY + Math.sin(rad) * HOOP.rimRadius * 0.5;
    const target = a > 180 ? f : b;
    for (let link = 0; link < 5; link += 1) {
      const t0 = link / 5;
      const t1 = (link + 1) / 5;
      const pa = p(topX + (botX - topX) * t0, topY + (botY - topY) * t0, HOOP.rimHeight - netDepth * t0);
      const pb = p(topX + (botX - topX) * t1, topY + (botY - topY) * t1, HOOP.rimHeight - netDepth * t1);
      strokePolyline(target, [pa, pb], link % 2 === 0 ? PALETTE.chain : PALETTE.chainDark, 1.4);
    }
  }
  // Horizontal chain rings.
  for (const t of [0.35, 0.7]) {
    const ring: Point[] = [];
    for (let a = 0; a <= 360; a += 12) {
      const rad = (a * Math.PI) / 180;
      const r = HOOP.rimRadius * (1 - 0.5 * t);
      ring.push(p(Math.cos(rad) * r, Math.sin(rad) * r, HOOP.rimHeight - netDepth * t));
    }
    strokePolyline(b, ring.slice(0, ring.length / 2 + 1), PALETTE.chainDark, 1.2);
    strokePolyline(f, ring.slice(ring.length / 2), PALETTE.chain, 1.2);
  }

  strokePolyline(f, nearHalf, PALETTE.rimMetalDark, 3);
  strokePolyline(f, nearHalf, PALETTE.rimMetal, 2);

  return { back, front };
}

/** Wooden table with the blender and the fruit: the trophy. */
export function buildTrophy(projection: CourtProjection, x: number, y: number): SpriteFrame {
  const at = projection.project(x, y, 0);
  const scale = at.scale / ART_SCALE;
  const width = Math.round(scale * 1.9);
  const height = Math.round(scale * 1.7);
  const surface = createSurface(width, height);
  const ctx = surface.ctx;
  const cx = width / 2;
  const groundY = height - 2;
  const u = (m: number) => m * scale;

  const topY = groundY - u(0.78);
  const tableW = u(1.5);
  // Legs.
  rect(ctx, cx - tableW / 2 + 2, topY, u(0.09), groundY - topY, PALETTE.woodDark);
  rect(ctx, cx + tableW / 2 - u(0.09) - 2, topY, u(0.09), groundY - topY, PALETTE.woodDark);
  // Top.
  rect(ctx, cx - tableW / 2, topY - u(0.08), tableW, u(0.09), PALETTE.woodLight);
  rect(ctx, cx - tableW / 2, topY - u(0.01), tableW, u(0.03), PALETTE.woodMid);

  // Blender: red and cream base, transparent jar, lid.
  const bx = cx - u(0.32);
  const baseH = u(0.26);
  const baseW = u(0.3);
  const baseTop = topY - u(0.08) - baseH;
  rect(ctx, bx - baseW / 2, baseTop, baseW, baseH, TROPHY.blenderBase);
  rect(ctx, bx - baseW / 2, baseTop, Math.max(1, baseW * 0.28), baseH, TROPHY.blenderBaseDark);
  rect(ctx, bx - baseW / 2, baseTop + baseH * 0.55, baseW, baseH * 0.2, TROPHY.blenderCream);
  rect(ctx, bx + baseW * 0.18, baseTop + baseH * 0.22, Math.max(1, u(0.04)), Math.max(1, u(0.04)), TROPHY.blenderCream);
  const jarH = u(0.46);
  const jarW = u(0.24);
  rect(ctx, bx - jarW / 2, baseTop - jarH, jarW, jarH, TROPHY.jar);
  strokePolyline(
    ctx,
    [
      [bx - jarW / 2, baseTop - jarH],
      [bx - jarW / 2, baseTop],
      [bx + jarW / 2, baseTop],
      [bx + jarW / 2, baseTop - jarH],
    ],
    TROPHY.jarEdge,
    1,
  );
  rect(ctx, bx - jarW / 2 - 1, baseTop - jarH - u(0.06), jarW + 2, u(0.07), TROPHY.blenderBase);

  // Fruit beside it: bananas, oranges and apples.
  const fy = topY - u(0.08);
  ellipse(ctx, cx + u(0.28), fy - u(0.09), u(0.11), u(0.09), TROPHY.orange);
  ellipse(ctx, cx + u(0.26), fy - u(0.11), u(0.05), u(0.04), '#ffae4d');
  ellipse(ctx, cx + u(0.5), fy - u(0.08), u(0.09), u(0.08), TROPHY.apple);
  rect(ctx, cx + u(0.5), fy - u(0.17), 1, u(0.05), PALETTE.woodDark);
  ctx.fillStyle = TROPHY.banana;
  ctx.beginPath();
  ctx.ellipse(cx + u(0.38), fy - u(0.03), u(0.2), u(0.06), -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = TROPHY.bananaDark;
  ctx.fillRect(Math.round(cx + u(0.2)), Math.round(fy - u(0.04)), Math.round(u(0.06)), 1);

  return { surface, pivotX: cx, pivotY: groundY };
}

/** Wooden crate on the right with CHUBOL SIEMPRE burned into it. */
export function buildCrate(projection: CourtProjection, x: number, y: number): SpriteFrame {
  const at = projection.project(x, y, 0);
  const scale = at.scale / ART_SCALE;
  const w = Math.round(scale * 0.95);
  const h = Math.round(scale * 0.8);
  const surface = createSurface(w, h);
  const ctx = surface.ctx;
  const groundY = h - 1;
  const boxH = scale * 0.5;
  rect(ctx, 2, groundY - boxH, w - 4, boxH, PALETTE.woodMid);
  rect(ctx, 2, groundY - boxH, w - 4, Math.max(1, boxH * 0.16), PALETTE.woodLight);
  for (let i = 1; i < 4; i += 1) {
    rect(ctx, 2, groundY - boxH + (boxH * i) / 4, w - 4, 1, PALETTE.woodLine);
  }
  const style = { pixel: Math.max(1, Math.round(scale * 0.045)), fill: PALETTE.woodLine } as const;
  const label = '8';
  drawText(ctx, label, w / 2 - measureText(label, style) / 2, groundY - boxH * 0.62, style);
  return { surface, pivotX: w / 2, pivotY: groundY };
}

/** Watering can and the decorative football. The football is scenery, not a second ball. */
export function buildSmallProps(projection: CourtProjection, x: number, y: number, kind: 'can' | 'football'): SpriteFrame {
  const at = projection.project(x, y, 0);
  const scale = at.scale / ART_SCALE;
  const w = Math.max(6, Math.round(scale * 0.8));
  const h = Math.max(6, Math.round(scale * 0.6));
  const surface = createSurface(w, h);
  const ctx = surface.ctx;
  const groundY = h - 1;
  if (kind === 'can') {
    const bodyH = scale * 0.3;
    rect(ctx, w * 0.25, groundY - bodyH, w * 0.4, bodyH, '#7f9aa8');
    rect(ctx, w * 0.25, groundY - bodyH, w * 0.12, bodyH, '#5f7b88');
    strokePolyline(ctx, [[w * 0.65, groundY - bodyH * 0.8], [w * 0.92, groundY - bodyH * 0.15]], '#7f9aa8', 2);
    strokePolyline(ctx, [[w * 0.3, groundY - bodyH], [w * 0.45, groundY - bodyH * 1.5], [w * 0.6, groundY - bodyH]], '#5f7b88', 1.5);
  } else {
    const r = scale * 0.16;
    ellipse(ctx, w / 2, groundY - r, r, r, '#f0efe6');
    ellipse(ctx, w / 2, groundY - r * 1.2, r * 0.42, r * 0.38, '#2a2a30');
    ellipse(ctx, w / 2 - r * 0.6, groundY - r * 0.6, r * 0.24, r * 0.22, '#2a2a30');
  }
  return { surface, pivotX: w / 2, pivotY: groundY };
}

/** The CHUBOL logo: chunky arcade lettering, orange and yellow with a dark outline. */
export function buildLogo(): SpriteFrame {
  const pixel = 9;
  const style = {
    pixel,
    fill: PALETTE.titleFill,
    highlight: PALETTE.titleHigh,
    outline: PALETTE.titleOutline,
    outlineWidth: 1,
  } as const;
  const text = 'CHUBOL';
  const width = measureText(text, style) + pixel * 4;
  const height = pixel * 7 + pixel * 4;
  const surface = createSurface(width, height);
  drawText(surface.ctx, text, pixel * 2, pixel * 2, style);
  return { surface, pivotX: width / 2, pivotY: height / 2 };
}

/** Marker painted under the active shooting spot. */
export function buildSpotMarker(projection: CourtProjection, spotX: number, spotY: number, radius: number): SpriteFrame {
  const at = projection.project(spotX, spotY, 0);
  const scale = at.scale / ART_SCALE;
  const w = Math.max(8, Math.round(radius * 2 * scale * 1.3));
  const h = Math.max(6, Math.round(radius * 2 * scale * 0.9));
  const surface = createSurface(w + 2, h + 2);
  const ctx = surface.ctx;
  ctx.strokeStyle = PALETTE.hudAccent;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.ellipse(w / 2 + 1, h / 2 + 1, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.stroke();
  return { surface, pivotX: w / 2 + 1, pivotY: h / 2 + 1 };
}

/** Bounds of the walkable area, for a subtle guide in practice mode. */
export function buildCourtOutline(projection: CourtProjection): PixelSurface {
  const surface = createSurface(PLATE_W, PLATE_H);
  const p = projector(projection);
  strokePolyline(
    surface.ctx,
    [
      p(COURT.minX, COURT.minY),
      p(COURT.maxX, COURT.minY),
      p(COURT.maxX, BACKGROUND.cypressY - 1.4),
      p(COURT.minX, BACKGROUND.cypressY - 1.4),
    ],
    'rgba(255,255,255,0.12)',
    1,
    true,
  );
  return surface;
}
