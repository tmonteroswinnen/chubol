import Phaser from 'phaser';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH, SCENERY } from '../config/court';
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

/**
 * Where the four of them stand for the photo: spread across the front of the
 * court, clear of the result panel and of the boy, the dog and the trophy table
 * painted into the plate.
 */
const CELEBRATION_SPOTS = [
  // Not right against the front wall: it cuts the shoes and the shadow off.
  { x: 0.9, y: -1.9 },
  { x: 2.4, y: -2.15 },
  { x: 5.9, y: -2.15 },
  { x: 7.4, y: -1.9 },
] as const;

export class ResultScene extends Phaser.Scene {
  private view!: CourtView;
  private sceneData!: ResultSceneData;
  private buttons: Button[] = [];
  private timer = 0;
  private halo: Phaser.GameObjects.Ellipse | null = null;
  private readonly happy: boolean[] = [];

  constructor() {
    super('Result');
  }

  init(data: ResultSceneData): void {
    this.sceneData = data;
    // The scene object is reused, so anything kept in a field survives into the
    // next match: after a rematch the pair that won the PREVIOUS one celebrated.
    this.happy.length = 0;
    this.timer = 0;
  }

  create(): void {
    this.view = new CourtView(this, courtProjection());
    this.view.setMarkersVisible(false);

    // Lined up across the front of the court, not on the waiting spots: those
    // are close enough together that four sets of raised arms overlap into one
    // shape, and half of them ended up behind the result panel.
    const winning = new Set((this.sceneData.result?.winners ?? []).map((w) => w.teamIndex));
    const shared = this.sceneData.result?.shared === true;
    CELEBRATION_SPOTS.forEach((spot, index) => {
      const theirTeam = Math.floor(index / 2);
      this.happy.push(shared || winning.size === 0 || winning.has(theirTeam));
      this.view.setFriend(index, {
        x: spot.x,
        y: spot.y,
        pose: this.happy[index] === true ? 'cheer' : 'idle0',
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
      .container(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 - 70, [
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
    // Offset per friend, so they do not all throw their arms up on the same
    // frame like a row of puppets on one string.
    this.happy.forEach((happy, index) => {
      if (!happy) return;
      const beat = Math.floor((this.timer + index * 170) / 320) % 2 === 0;
      this.view.setFriend(index, { pose: beat ? 'cheer' : 'idle1' });
    });
    this.view.update(delta);
  }
}
