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
 * Every size here is chosen against the worst screen this is meant for, not
 * against a laptop. On a 740×360 phone the canvas scales by 0.3516, so a logical
 * pixel is about a third of a CSS one: 34 logical is the floor for anything that
 * has to be read, and 45 for anything read at a glance while something else is
 * happening. The first version of this HUD was built at desktop sizes and most
 * of it landed between 5 and 9 CSS pixels — present, and unreadable.
 *
 * The charge bar is vertical and sits directly above the shoot button, so on a
 * phone the thumb and the eye are in the same place.
 */
export class Hud {
  private readonly root: Phaser.GameObjects.Container;

  private readonly clockText: Phaser.GameObjects.Text;
  private readonly statusText: Phaser.GameObjects.Text;
  private readonly shooterText: Phaser.GameObjects.Text;
  private readonly lapTitle: Phaser.GameObjects.Text;
  private readonly lapTexts: Phaser.GameObjects.Text[] = [];
  private readonly lapStrikes: Phaser.GameObjects.Rectangle[] = [];
  private readonly scoreNames: Phaser.GameObjects.Text[] = [];
  private readonly scoreValues: Phaser.GameObjects.Text[] = [];
  private readonly hintText: Phaser.GameObjects.Text;

  private readonly barRoot: Phaser.GameObjects.Container;
  private readonly barBand: Phaser.GameObjects.Rectangle;
  private readonly barNeedle: Phaser.GameObjects.Rectangle;
  private readonly barLabel: Phaser.GameObjects.Text;
  /** Kept so the needle can tell you when you are inside the band. */
  private band = { low: 0, high: 0 };

  static readonly BAR_HEIGHT = 380;
  private static readonly BAR_WIDTH = 64;
  /** Centre of the right-hand controls. Pulled in from the very edge of the
   *  screen, which on Android belongs to the back gesture. */
  static readonly RIGHT_COLUMN = LOGICAL_WIDTH - 120;
  private static readonly BAR_BOTTOM = 640;

  constructor(scene: Phaser.Scene) {
    const left = MARGIN_WIDTH / 2;
    const wrap = MARGIN_WIDTH - 14;

    this.clockText = scene.add
      .text(left, 54, '', { fontFamily: UI_FONT, fontSize: '68px', color: PALETTE.hudAccent })
      .setOrigin(0.5);

    this.statusText = scene.add
      .text(left, 112, '', {
        fontFamily: UI_FONT,
        fontSize: '34px',
        color: PALETTE.hudAccent,
        align: 'center',
        lineSpacing: 4,
        wordWrap: { width: wrap },
      })
      .setOrigin(0.5, 0);

    this.shooterText = scene.add
      .text(left, 206, '', {
        fontFamily: UI_FONT,
        fontSize: '40px',
        color: PALETTE.hudText,
        align: 'center',
        wordWrap: { width: wrap },
      })
      .setOrigin(0.5, 0);

    this.lapTitle = scene.add
      .text(left, 282, '', { fontFamily: UI_FONT, fontSize: '34px', color: PALETTE.hudAccent, align: 'center' })
      .setOrigin(0.5);

    // Two columns rather than one. Seven numbers stacked in a single column at a
    // size anyone can read would run most of the way down the margin and leave
    // nowhere for the score, which matters more.
    SHOT_SPOTS.forEach((spot, index) => {
      const x = left + (index % 2 === 0 ? -44 : 44);
      const y = 336 + Math.floor(index / 2) * 58;
      this.lapTexts.push(
        scene.add
          .text(x, y, String(spot.points), { fontFamily: UI_FONT, fontSize: '46px', color: PALETTE.hudText })
          .setOrigin(0.5),
      );
      // A line through the number, so a mark already shot reads as crossed off
      // rather than as a number that failed to draw properly.
      this.lapStrikes.push(scene.add.rectangle(x, y, 50, 6, 0xf5a81c, 0.9).setVisible(false));
    });

    // The score, which is the whole point, gets the biggest type on the screen
    // after the clock: name small, number large.
    [0, 1].forEach((index) => {
      const top = 596 + index * 160;
      this.scoreNames.push(
        scene.add
          .text(left, top, '', {
            fontFamily: UI_FONT,
            fontSize: '34px',
            color: PALETTE.hudText,
            align: 'center',
            wordWrap: { width: wrap },
          })
          .setOrigin(0.5, 0),
      );
      this.scoreValues.push(
        scene.add
          .text(left, top + 86, '', { fontFamily: UI_FONT, fontSize: '62px', color: PALETTE.hudText })
          .setOrigin(0.5, 0),
      );
    });

    // One strip along the bottom of the artwork, over the bushes. Lifted clear
    // of the very edge, where a phone puts its home indicator.
    const strip = scene.add
      .rectangle(ART_X + ART_WIDTH / 2, ART_Y + ART_HEIGHT - 46, ART_WIDTH, 68, 0x0f1409, 0.72)
      .setOrigin(0.5);
    this.hintText = scene.add
      .text(ART_X + ART_WIDTH / 2, ART_Y + ART_HEIGHT - 46, '', {
        fontFamily: UI_FONT,
        fontSize: '34px',
        color: PALETTE.hudText,
      })
      .setOrigin(0.5);

    this.root = scene.add
      .container(0, 0, [
        this.clockText,
        this.statusText,
        this.shooterText,
        this.lapTitle,
        ...this.lapTexts,
        ...this.lapStrikes,
        ...this.scoreNames,
        ...this.scoreValues,
        strip,
        this.hintText,
      ])
      .setDepth(DEPTHS.hud);

    const barTop = Hud.BAR_BOTTOM - Hud.BAR_HEIGHT;
    const barBack = scene.add
      .rectangle(0, 0, Hud.BAR_WIDTH, Hud.BAR_HEIGHT, 0x10170d, 0.92)
      .setStrokeStyle(3, 0x6f6244);
    this.barBand = scene.add.rectangle(0, 0, Hud.BAR_WIDTH - 8, 10, 0x4fa83f, 0.95);
    // Thick enough to see out of the corner of an eye while looking at the
    // court, and wider than the bar so it reads as a needle and not as a fill.
    this.barNeedle = scene.add.rectangle(0, 0, Hud.BAR_WIDTH + 34, 14, 0xf3ead2, 1);
    this.barLabel = scene.add
      .text(0, -Hud.BAR_HEIGHT / 2 - 16, '', {
        fontFamily: UI_FONT,
        fontSize: '34px',
        color: PALETTE.hudText,
        align: 'center',
        wordWrap: { width: MARGIN_WIDTH + 40 },
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

  /**
   * Who has the ball and whether it is your turn. Two separate lines because
   * they answer two different questions and only one of them changes often.
   */
  setTurn(shooter: string, status: string, kind: 'you' | 'machine' | 'neutral'): void {
    this.shooterText.setText(shooter);
    this.statusText.setText(status);
    this.statusText.setColor(kind === 'machine' ? PALETTE.hudBad : PALETTE.hudAccent);
  }

  setScore(teams: readonly { readonly name: string; readonly score: number; readonly yours: boolean }[]): void {
    [0, 1].forEach((index) => {
      const team = teams[index];
      const name = this.scoreNames[index];
      const value = this.scoreValues[index];
      if (name === undefined || value === undefined) return;
      if (team === undefined) {
        name.setText('');
        value.setText('');
        return;
      }
      // Marked by colour and a caret, not by the word "(VOS)": at a size that
      // can be read in the margin the extra word pushes the name onto a third
      // line and shoves the number off the bottom.
      name.setText(team.yours ? `▸ ${team.name}` : team.name);
      name.setColor(team.yours ? PALETTE.hudAccent : PALETTE.hudText);
      value.setText(String(team.score));
      value.setColor(team.yours ? PALETTE.hudAccent : PALETTE.hudText);
    });
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
      const strike = this.lapStrikes[index];
      if (text === undefined || strike === undefined) return;
      const struck = done.has(spot.id);
      text.setColor(struck ? '#8c8a78' : PALETTE.hudText);
      text.setAlpha(struck ? 0.55 : 1);
      strike.setVisible(struck);
    });
  }

  /** Shows the charge bar with the scoring band the physics actually allows. */
  showBar(windowLow: number, windowHigh: number, label: string): void {
    const height = Hud.BAR_HEIGHT;
    this.band = { low: windowLow, high: windowHigh };
    const bandHeight = Math.max(8, (windowHigh - windowLow) * height);
    // The bar fills upwards, so a higher charge sits higher on the bar.
    const bandCentre = height / 2 - ((windowLow + windowHigh) / 2) * height;
    this.barBand.setSize(Hud.BAR_WIDTH - 8, bandHeight).setPosition(0, bandCentre);
    this.barLabel.setText(label);
    this.barRoot.setVisible(true);
  }

  setCharge(charge: number): void {
    const value = Math.min(1, Math.max(0, charge));
    this.barNeedle.setPosition(0, Hud.BAR_HEIGHT / 2 - value * Hud.BAR_HEIGHT);
    // Turning the needle green inside the band turns a problem of aim into one
    // of reaction. On the 8-point mark the band lasts 62 ms: you cannot watch a
    // thin white line cross a thin green one, but you can react to a colour.
    const inside = value >= this.band.low && value <= this.band.high;
    this.barNeedle.setFillStyle(inside ? 0x7ef06a : 0xf3ead2, 1);
    this.barNeedle.setSize(Hud.BAR_WIDTH + (inside ? 50 : 34), inside ? 18 : 14);
  }

  hideBar(): void {
    this.barRoot.setVisible(false);
  }

  destroy(): void {
    this.root.destroy(true);
    this.barRoot.destroy(true);
  }
}
