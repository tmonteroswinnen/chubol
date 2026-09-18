import Phaser from 'phaser';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH, SHOT_SPOTS, type SpotId } from '../config/court';
import { DEPTHS } from './courtView';
import { PALETTE } from './palette';
import { UI_FONT } from './ui';

/**
 * In-game interface.
 *
 * It stays out of the way of the artwork: a thin strip along the bottom, and a
 * charge bar that only appears while a shot is being prepared. No large corner
 * panels, no turbo meters.
 */
export class Hud {
  private readonly root: Phaser.GameObjects.Container;
  private readonly strip: Phaser.GameObjects.Rectangle;
  private readonly turnText: Phaser.GameObjects.Text;
  private readonly scoreText: Phaser.GameObjects.Text;
  private readonly hintText: Phaser.GameObjects.Text;
  private readonly clockText: Phaser.GameObjects.Text;
  private readonly lapText: Phaser.GameObjects.Text;

  private readonly barRoot: Phaser.GameObjects.Container;
  private readonly barBack: Phaser.GameObjects.Rectangle;
  private readonly barBand: Phaser.GameObjects.Rectangle;
  private readonly barNeedle: Phaser.GameObjects.Rectangle;
  private readonly barLabel: Phaser.GameObjects.Text;

  private static readonly BAR_WIDTH = 460;
  private static readonly BAR_HEIGHT = 26;

  constructor(scene: Phaser.Scene) {
    const stripHeight = 58;
    const stripY = LOGICAL_HEIGHT - stripHeight / 2;

    this.strip = scene.add.rectangle(LOGICAL_WIDTH / 2, stripY, LOGICAL_WIDTH, stripHeight, 0x121a10, 0.74);
    this.turnText = scene.add
      .text(28, stripY, '', { fontFamily: UI_FONT, fontSize: '22px', color: PALETTE.hudAccent })
      .setOrigin(0, 0.5);
    this.scoreText = scene.add
      .text(LOGICAL_WIDTH - 28, stripY, '', { fontFamily: UI_FONT, fontSize: '22px', color: PALETTE.hudText })
      .setOrigin(1, 0.5);
    this.hintText = scene.add
      .text(LOGICAL_WIDTH / 2, stripY, '', { fontFamily: UI_FONT, fontSize: '19px', color: PALETTE.hudText })
      .setOrigin(0.5);

    // Clock and lap tracker sit in a small panel at the top, clear of the hoop,
    // the dog and the trophy.
    this.clockText = scene.add
      .text(LOGICAL_WIDTH / 2, 34, '', {
        fontFamily: UI_FONT,
        fontSize: '34px',
        color: PALETTE.hudAccent,
        stroke: '#1a1208',
        strokeThickness: 6,
      })
      .setOrigin(0.5, 0.5);
    this.lapText = scene.add
      .text(LOGICAL_WIDTH / 2, 70, '', {
        fontFamily: UI_FONT,
        fontSize: '19px',
        color: PALETTE.hudText,
        stroke: '#1a1208',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0.5);

    this.root = scene.add
      .container(0, 0, [this.strip, this.turnText, this.scoreText, this.hintText, this.clockText, this.lapText])
      .setDepth(DEPTHS.hud);

    const barY = LOGICAL_HEIGHT - 116;
    this.barBack = scene.add.rectangle(0, 0, Hud.BAR_WIDTH, Hud.BAR_HEIGHT, 0x10170d, 0.9).setStrokeStyle(2, 0x6f6244);
    this.barBand = scene.add.rectangle(0, 0, 10, Hud.BAR_HEIGHT - 6, 0x4fa83f, 0.9);
    this.barNeedle = scene.add.rectangle(0, 0, 4, Hud.BAR_HEIGHT + 12, 0xf3ead2, 1);
    this.barLabel = scene.add
      .text(0, -Hud.BAR_HEIGHT - 14, '', {
        fontFamily: UI_FONT,
        fontSize: '18px',
        color: PALETTE.hudText,
        stroke: '#10170d',
        strokeThickness: 5,
      })
      .setOrigin(0.5, 1);
    this.barRoot = scene.add
      .container(LOGICAL_WIDTH / 2, barY, [this.barBack, this.barBand, this.barNeedle, this.barLabel])
      .setDepth(DEPTHS.hud)
      .setVisible(false);
  }

  setVisible(visible: boolean): void {
    this.root.setVisible(visible);
    if (!visible) this.barRoot.setVisible(false);
  }

  setTurn(label: string): void {
    this.turnText.setText(label);
  }

  setScore(label: string): void {
    this.scoreText.setText(label);
  }

  setHint(label: string): void {
    this.hintText.setText(label);
  }

  /** Remaining time of the pair's minute, or null in practice. */
  setClock(milliseconds: number | null): void {
    if (milliseconds === null) {
      this.clockText.setText('');
      return;
    }
    const seconds = Math.ceil(milliseconds / 1000);
    this.clockText.setText(`${String(Math.floor(seconds / 60))}:${String(seconds % 60).padStart(2, '0')}`);
    this.clockText.setColor(seconds <= 10 ? PALETTE.hudBad : PALETTE.hudAccent);
  }

  /**
   * Which of the seven marks have been shot in the current lap. Every mark has
   * to be shot before any can be repeated.
   */
  setLapMarks(done: ReadonlySet<SpotId>, caption: string): void {
    const label = SHOT_SPOTS.map((s) => (done.has(s.id) ? `[${s.points}]` : ` ${s.points} `)).join('');
    this.lapText.setText(`${caption}  ${label}`);
  }

  /** Shows the charge bar with the scoring band the physics actually allows. */
  showBar(windowLow: number, windowHigh: number, label: string): void {
    const width = Hud.BAR_WIDTH;
    const left = -width / 2;
    const bandWidth = Math.max(6, (windowHigh - windowLow) * width);
    const bandCentre = left + ((windowLow + windowHigh) / 2) * width;
    this.barBand.setSize(bandWidth, Hud.BAR_HEIGHT - 6).setPosition(bandCentre, 0);
    this.barLabel.setText(label);
    this.barRoot.setVisible(true);
  }

  setCharge(charge: number): void {
    const width = Hud.BAR_WIDTH;
    this.barNeedle.setPosition(-width / 2 + Math.min(1, Math.max(0, charge)) * width, 0);
  }

  hideBar(): void {
    this.barRoot.setVisible(false);
  }

  destroy(): void {
    this.root.destroy(true);
    this.barRoot.destroy(true);
  }
}
