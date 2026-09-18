import { CAMERA, FRAMING, FRAMING_ANCHORS, BACKGROUND, COURT, HOOP } from '../src/game/config/court';
import { CourtProjection } from '../src/game/sim/projection';

export function sweep(): void {
  const p = CourtProjection.fit(CAMERA, FRAMING_ANCHORS, FRAMING);
  const s = (l: string, x: number, y: number, z = 0) => {
    const q = p.project(x, y, z);
    console.log(`${l.padEnd(22)} -> (${q.x.toFixed(0).padStart(5)},${q.y.toFixed(0).padStart(5)}) ${q.scale.toFixed(1)} px/m`);
  };
  console.log(`horizon=${p.horizonY().toFixed(0)}`);
  s('grass far edge', 6, BACKGROUND.fenceY + 0.4);
  s('fence base', 6, BACKGROUND.fenceY);
  s('fence top', 6, BACKGROUND.fenceY, BACKGROUND.fenceHeight);
  s('road near', 6, BACKGROUND.roadNearY);
  s('road far', 6, BACKGROUND.roadFarY);
  s('cypress base', 6.2, BACKGROUND.cypressY);
  s('cypress top', 6.2, BACKGROUND.cypressY, BACKGROUND.cypressHeight);
  s('court back', 6, COURT.maxY);
  s('court front', 6, COURT.minY);
  s('board top', HOOP.boardX, 0, HOOP.boardTopZ);
  s('rim', 0, 0, HOOP.rimHeight);
  s('left edge grass', COURT.minX - 26, 0);
  s('right edge grass', COURT.maxX + 26, 0);
}
