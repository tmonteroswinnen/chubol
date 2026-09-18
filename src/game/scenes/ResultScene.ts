import Phaser from 'phaser';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH, SCENERY, WAITING_SPOTS } from '../config/court';
import type { MatchConfig, MatchResult } from '../domain/match';
import { soundBoard } from '../render/audio';
import { courtProjection } from '../render/context';
import { CourtView, DEPTHS } from '../render/courtView';
import { PALETTE } from '../render/palette';
import { body, heading, makeButton, panel, UI_FONT, type Button } from '../render/ui';
import type { GameSceneData } from './MenuScene';

export interface ResultSceneData {
  readonly result: MatchResult | null;
  readonly config: MatchConfig;
}

export class ResultScene extends Phaser.Scene {
  private view!: CourtView;
  private sceneData!: ResultSceneData;
  private buttons: Button[] = [];
  private timer = 0;
  private halo: Phaser.GameObjects.Ellipse | null = null;

  constructor() {
    super('Result');
  }

  init(data: ResultSceneData): void {
    this.sceneData = data;
  }

  create(): void {
    this.view = new CourtView(this, courtProjection());
    this.view.setMarkersVisible(false);

    WAITING_SPOTS.forEach((spot, index) => {
      this.view.setFriend(index, { x: spot.x, y: spot.y, pose: 'cheer', backView: false, visible: true });
    });
    this.view.setBall(0, 0, 0, false);

    // The celebration highlights the blender and the fruit without moving the
    // camera or inventing another scene.
    this.halo = this.flashTrophy();
    const trophyAt = courtProjection().project(SCENERY.trophyTable.x, SCENERY.trophyTable.y, 1.2);
    this.add
      .text(trophyAt.x, trophyAt.y - 30, 'EL TROFEO', {
        fontFamily: UI_FONT,
        fontSize: '20px',
        color: PALETTE.hudAccent,
        stroke: '#1a1208',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.effects);

    this.buildPanel();
    soundBoard.fanfare();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  /** A pulse over the blender and the fruit painted into the plate. */
  private flashTrophy(): Phaser.GameObjects.Ellipse {
    const at = courtProjection().project(SCENERY.trophyTable.x, SCENERY.trophyTable.y - 0.2, 0.6);
    const halo = this.add
      .ellipse(at.x, at.y, at.scale * 1.9, at.scale * 1.5, 0xf5a81c, 0.3)
      .setDepth(DEPTHS.effects - 1);
    this.tweens.add({ targets: halo, alpha: 0.05, duration: 640, yoyo: true, repeat: -1 });
    return halo;
  }

  private teardown(): void {
    for (const button of this.buttons) button.destroy();
    this.buttons = [];
    if (this.halo !== null) {
      this.tweens.killTweensOf(this.halo);
      this.halo.destroy();
      this.halo = null;
    }
  }

  private buildPanel(): void {
    const result = this.sceneData.result;
    const winners = result?.winners ?? [];
    const title =
      winners.length === 0
        ? 'PARTIDO TERMINADO'
        : winners.length === 1
          ? `GANA ${winners[0]!.name.toUpperCase()}`
          : `EMPATE: ${winners.map((w) => w.name.toUpperCase()).join(' y ')}`;

    const background = panel(this, 0, 0, 640, 430);
    const titleText = heading(this, 0, -170, title, 34);

    const rows = (result?.standings ?? [])
      .map(
        (s, i) =>
          `${i + 1}. ${s.name.padEnd(10)} ${String(s.score).padStart(3)} pts  (${s.makes}/${s.attempts})\n` +
          `   ${s.members.join(' y ')}\n   vueltas completas: ${s.laps}`,
      )
      .join('\n\n');
    const table = body(this, -280, -132, rows || 'Sin intentos registrados.', 20);

    // A tie has no confirmed resolution yet, so the game says so instead of
    // inventing one silently.
    const note = body(
      this,
      -280,
      26,
      result?.shared === true ? 'Empataron. Falta definir cómo se desempata de verdad.' : '',
      18,
    );

    const rematch = makeButton(
      this,
      0,
      86,
      'REVANCHA',
      () => {
        const payload: GameSceneData = { mode: 'challenge', teams: this.sceneData.config.teams };
        this.scene.start('Game', payload);
      },
      { accent: true },
    );
    const home = makeButton(this, 0, 160, 'VOLVER AL INICIO', () => this.scene.start('Menu'));
    this.buttons = [rematch, home];

    this.add
      .container(LOGICAL_WIDTH / 2 - 280, LOGICAL_HEIGHT / 2 - 40, [
        background,
        titleText,
        table,
        note,
        rematch.container,
        home.container,
      ])
      .setDepth(DEPTHS.hud + 20);
  }

  override update(_time: number, delta: number): void {
    this.timer += delta;
    this.view.update(delta);
  }
}
