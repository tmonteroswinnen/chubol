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
  /** Which pair the person was playing, so REVANCHA hands back the same match. */
  readonly humanTeam?: number | null;
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

    // Only the pair that won celebrates. Everyone cheering, losers included,
    // read as a bug rather than as a party.
    const winning = new Set((this.sceneData.result?.winners ?? []).map((w) => w.teamIndex));
    const shared = this.sceneData.result?.shared === true;
    WAITING_SPOTS.forEach((spot, index) => {
      const theirTeam = Math.floor(index / 2);
      const happy = shared || winning.size === 0 || winning.has(theirTeam);
      this.view.setFriend(index, {
        x: spot.x,
        y: spot.y,
        pose: happy ? 'cheer' : 'idle0',
        backView: false,
        visible: true,
      });
    });
    this.view.setBall(0, 0, 0, false);

    // The celebration highlights the blender and the fruit without moving the
    // camera or inventing another scene.
    this.halo = this.flashTrophy();
    const trophyAt = courtProjection().project(SCENERY.trophyTable.x, SCENERY.trophyTable.y, 1.2);
    this.add
      .text(trophyAt.x, trophyAt.y - 30, 'EL TROFEO', {
        fontFamily: UI_FONT,
        fontSize: '32px',
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

    const width = 900;
    const height = 620;
    const background = panel(this, 0, 0, width, height);
    const titleText = heading(this, 0, -height / 2 + 54, title, 44);

    // One block per pair instead of a table of columns: at a size that can be
    // read on a phone the columns ran into each other.
    const standings = result?.standings ?? [];
    const human = this.sceneData.humanTeam ?? null;
    const rows = standings.length === 0
      ? 'Sin intentos registrados.'
      : standings
          .map((s, i) => {
            const mine = s.teamIndex === human ? '  (VOS)' : '';
            return [
              `${i + 1}.  ${s.name.toUpperCase()}${mine}`,
              `    ${s.score} puntos   ${s.makes} de ${s.attempts}   ${s.laps} ${s.laps === 1 ? 'vuelta' : 'vueltas'}`,
            ].join(String.fromCharCode(10));
          })
          .join(String.fromCharCode(10) + String.fromCharCode(10));
    const table = body(this, -width / 2 + 48, -height / 2 + 118, rows, 32);

    // A tie has no confirmed resolution yet, so the game says so instead of
    // inventing one silently.
    const note = body(
      this,
      -width / 2 + 48,
      -height / 2 + 330,
      result?.shared === true ? ['Empataron y quedó compartido.', 'Falta definir cómo se desempata de verdad.'].join(String.fromCharCode(10)) : '',
      28,
    );

    const rematch = makeButton(
      this,
      0,
      height / 2 - 150,
      'REVANCHA',
      () => {
        // Carrying humanTeam is what keeps the machine in the rematch. Without
        // it the rematch quietly turned into two people on one device.
        const payload: GameSceneData = {
          mode: 'challenge',
          teams: this.sceneData.config.teams,
          humanTeam: this.sceneData.humanTeam ?? null,
        };
        this.scene.start('Game', payload);
      },
      { accent: true, width: 460, height: 78, fontSize: 32 },
    );
    const home = makeButton(this, 0, height / 2 - 56, 'VOLVER AL INICIO', () => this.scene.start('Menu'), {
      width: 460,
      height: 78,
      fontSize: 32,
    });
    this.buttons = [rematch, home];

    this.add
      .container(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, [
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
