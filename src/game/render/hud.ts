import Phaser from 'phaser';
import {
  ART_HEIGHT,
  ART_WIDTH,
  ART_X,
  ART_Y,
  LOGICAL_WIDTH,
  MARGIN_WIDTH,
  SHOT_SPOTS,
  type SpotId,
} from '../config/court';
import { DEPTHS } from './courtView';
import { PALETTE } from './palette';
import { UI_FONT } from './ui';

/**
 * In-game interface.
 *
 * It lives in the margins beside the artwork, not on top of it. The canvas is
 * wider than the 3:2 plate precisely so those margins exist: on a phone held
 * sideways they would otherwise be dead black bars.
 *
 * The charge bar is vertical and sits directly above the shoot button, so on a
 * phone the thumb and the eye are in the same place.
 */
export class Hud {
  private readonly root: Phaser.GameObjects.Container;

  private readonly clockText: Phaser.GameObjects.Text;
  private readonly turnText: Phaser.GameObjects.Text;
  private readonly lapTitle: Phaser.GameObjects.Text;
  private readonly lapTexts: Phaser.GameObjects.Text[] = [];
  private readonly scoreText: Phaser.GameObjects.Text;
  private readonly hintText: Phaser.GameObjects.Text;

  private readonly barRoot: Phaser.GameObjects.Container;
  private readonly barBand: Phaser.GameObjects.Rectangle;
  private readonly barNeedle: Phaser.GameObjects.Rectangle;
  private readonly barLabel: Phaser.GameObjects.Text;

  static readonly BAR_HEIGHT = 400;
  private static readonly BAR_WIDTH = 46;
  /** Centre of the right margin. */
  static readonly RIGHT_COLUMN = LOGICAL_WIDTH - MARGIN_WIDTH / 2;
  private static readonly BAR_BOTTOM = 690;

  constructor(scene: Phaser.Scene) {
    const left = MARGIN_WIDTH / 2;

    this.clockText = scene.add
      .text(left, 52, '', { fontFamily: UI_FONT, fontSize: '52px', color: PALETTE.hudAccent })
      .setOrigin(0.5);
    this.turnText = scene.add
      .text(left, 96, '', {
        fontFamily: UI_FONT,
        fontSize: '19px',
        color: PALETTE.hudText,
        align: 'center',
        // Three short lines stacked in a narrow margin read as one blob without
        // space between them.
        lineSpacing: 7,
        wordWrap: { width: MARGIN_WIDTH - 18 },
      })
      .setOrigin(0.5, 0);

    this.lapTitle = scene.add
      .text(left, 206, '', { fontFamily: UI_FONT, fontSize: '16px', color: PALETTE.hudAccent, align: 'center' })
      .setOrigin(0.5);

    SHOT_SPOTS.forEach((spot, index) => {
      this.lapTexts.push(
        scene.add
          .text(left, 248 + index * 46, String(spot.points), {
            fontFamily: UI_FONT,
            fontSize: '30px',
            color: PALETTE.hudText,
          })
          .setOrigin(0.5),
      );
    });

    this.scoreText = scene.add
      .text(left, 600, '', {
        fontFamily: UI_FONT,
        fontSize: '20px',
        color: PALETTE.hudText,
        align: 'center',
        wordWrap: { width: MARGIN_WIDTH - 18 },
      })
      .setOrigin(0.5, 0);

    // One discreet strip along the very bottom of the artwork, over the bushes.
    const strip = scene.add
      .rectangle(ART_X + ART_WIDTH / 2, ART_Y + ART_HEIGHT - 26, ART_WIDTH, 52, 0x0f1409, 0.62)
      .setOrigin(0.5);
    this.hintText = scene.add
      .text(ART_X + ART_WIDTH / 2, ART_Y + ART_HEIGHT - 26, '', {
        fontFamily: UI_FONT,
        fontSize: '21px',
        color: PALETTE.hudText,
      })
      .setOrigin(0.5);

    this.root = scene.add
      .container(0, 0, [
        this.clockText,
        this.turnText,
        this.lapTitle,
        ...this.lapTexts,
        this.scoreText,
        strip,
        this.hintText,
      ])
      .setDepth(DEPTHS.hud);

    const barTop = Hud.BAR_BOTTOM - Hud.BAR_HEIGHT;
    const barBack = scene.add
      .rectangle(0, 0, Hud.BAR_WIDTH, Hud.BAR_HEIGHT, 0x10170d, 0.92)
      .setStrokeStyle(3, 0x6f6244);
    this.barBand = scene.add.rectangle(0, 0, Hud.BAR_WIDTH - 8, 10, 0x4fa83f, 0.95);
    this.barNeedle = scene.add.rectangle(0, 0, Hud.BAR_WIDTH + 20, 5, 0xf3ead2, 1);
    this.barLabel = scene.add
      .text(0, -Hud.BAR_HEIGHT / 2 - 14, '', {
        fontFamily: UI_FONT,
        fontSize: '18px',
        color: PALETTE.hudText,
        align: 'center',
        wordWrap: { width: MARGIN_WIDTH - 8 },
      })
      .setOrigin(0.5, 1);
    this.barRoot = scene.add
      .container(Hud.RIGHT_COLUMN, barTop + Hud.BAR_HEIGHT / 2, [barBack, this.barBand, this.barNeedle, this.barLabel])
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
   * Which of the seven marks are done. In a match every mark has to be shot
   * before any can be repeated, so this is what is still owed.
   */
  setLapMarks(done: ReadonlySet<SpotId>, caption: string): void {
    this.lapTitle.setText(caption);
    SHOT_SPOTS.forEach((spot, index) => {
      const text = this.lapTexts[index];
      if (text === undefined) return;
      const struck = done.has(spot.id);
      text.setColor(struck ? '#6f7c60' : PALETTE.hudText);
      text.setAlpha(struck ? 0.5 : 1);
    });
  }

  /** Shows the charge bar with the scoring band the physics actually allows. */
  showBar(windowLow: number, windowHigh: number, label: string): void {
    const height = Hud.BAR_HEIGHT;
    const bandHeight = Math.max(8, (windowHigh - windowLow) * height);
    // The bar fills upwards, so a higher charge sits higher on the bar.
    const bandCentre = height / 2 - ((windowLow + windowHigh) / 2) * height;
    this.barBand.setSize(Hud.BAR_WIDTH - 8, bandHeight).setPosition(0, bandCentre);
    this.barLabel.setText(label);
    this.barRoot.setVisible(true);
  }

  setCharge(charge: number): void {
    this.barNeedle.setPosition(0, Hud.BAR_HEIGHT / 2 - Math.min(1, Math.max(0, charge)) * Hud.BAR_HEIGHT);
  }

  hideBar(): void {
    this.barRoot.setVisible(false);
  }

  destroy(): void {
    this.root.destroy(true);
    this.barRoot.destroy(true);
  }
}
