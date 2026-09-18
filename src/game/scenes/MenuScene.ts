import Phaser from 'phaser';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH, SHOT_SPOTS } from '../config/court';
import { RULES_DEFAULTS } from '../config/gameplay';
import { defaultTeams, type TeamConfig } from '../domain/match';
import { missingAssets, usingDevelopmentArt } from '../assets/manifest';
import { courtProjection } from '../render/context';
import { CourtView, DEPTHS } from '../render/courtView';
import { soundBoard } from '../render/audio';
import { PALETTE } from '../render/palette';
import { body, developmentArtBadge, heading, makeButton, panel, UI_FONT, type Button } from '../render/ui';
import { REFERENCE_BALL, REFERENCE_POSES } from './referencePose';

export type GameMode = 'practice' | 'challenge';

export interface GameSceneData {
  readonly mode: GameMode;
  readonly teams: readonly [TeamConfig, TeamConfig];
  /** Overrides the length of a pair's turn. Used for a short match and by tests. */
  readonly turnMs?: number;
  readonly tiebreakMs?: number;
}

export class MenuScene extends Phaser.Scene {
  private view!: CourtView;
  private buttons: Button[] = [];
  private overlay: Phaser.GameObjects.Container | null = null;
  private soundLabelText: Phaser.GameObjects.Text | null = null;
  private timer = 0;

  constructor() {
    super('Menu');
  }

  create(): void {
    this.view = new CourtView(this, courtProjection());
    this.view.setMarkersVisible(false);
    REFERENCE_POSES.forEach((pose, index) => {
      this.view.setFriend(index, { x: pose.x, y: pose.y, pose: 'idle0', backView: pose.backView, visible: true });
    });
    this.view.setBall(REFERENCE_BALL.x, REFERENCE_BALL.y, REFERENCE_BALL.z);

    this.buildMenu();

    if (usingDevelopmentArt()) {
      developmentArtBadge(this, LOGICAL_WIDTH / 2, LOGICAL_HEIGHT - 26).setDepth(DEPTHS.hud);
    }

    this.input.keyboard?.on('keydown-ESC', () => this.closeOverlay());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  private teardown(): void {
    this.input.keyboard?.removeAllListeners();
    for (const button of this.buttons) button.destroy();
    this.buttons = [];
    this.overlay?.destroy(true);
    this.overlay = null;
  }

  private buildMenu(): void {
    const x = LOGICAL_WIDTH / 2;
    const top = 280;

    panel(this, x, top + 130, 520, 400).setDepth(DEPTHS.hud).setAlpha(0.9);

    const start = (mode: GameMode) => () => {
      soundBoard.unlock();
      this.scene.start('Game', { mode, teams: defaultTeams() } satisfies GameSceneData);
    };

    const make = (dy: number, label: string, action: () => void, accent = false): Button => {
      const button = makeButton(this, x, top + dy, label, action, { accent });
      button.container.setDepth(DEPTHS.hud + 1);
      this.buttons.push(button);
      return button;
    };

    this.add
      .text(x, top - 36, `PARTIDO DE A DOS · ${RULES_DEFAULTS.turnSeconds} SEGUNDOS POR PAREJA`, {
        fontFamily: UI_FONT,
        fontSize: '21px',
        color: PALETTE.hudAccent,
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.hud + 1);

    make(24, 'JUGAR — PAREJA VS PAREJA', start('challenge'), true);
    make(98, 'PRÁCTICA LIBRE', start('practice'));
    make(172, 'REGLAS', () => this.showRules());
    make(246, 'COMPARACIÓN VISUAL', () => this.scene.start('Compare'));

    const soundButton = make(320, '', () => {
      soundBoard.unlock();
      soundBoard.toggleMuted();
      this.refreshSoundLabel();
    });
    this.soundLabelText = soundButton.container.list.find(
      (o): o is Phaser.GameObjects.Text => o instanceof Phaser.GameObjects.Text,
    ) ?? null;
    this.refreshSoundLabel();

    this.add
      .text(x, LOGICAL_HEIGHT - 76, 'Mover: WASD o flechas   ·   Tirar: mantener ESPACIO y soltar   ·   Pausa: ESC', {
        fontFamily: UI_FONT,
        fontSize: '18px',
        color: PALETTE.hudText,
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.hud);
  }

  private refreshSoundLabel(): void {
    this.soundLabelText?.setText(soundBoard.muted ? 'SONIDO: APAGADO' : 'SONIDO: ENCENDIDO');
  }

  private showRules(): void {
    this.closeOverlay();
    const width = 1120;
    const height = 620;
    const background = panel(this, 0, 0, width, height);
    const title = heading(this, 0, -height / 2 + 44, 'REGLAS DE CHUBOL');

    const confirmed = body(
      this,
      -width / 2 + 40,
      -height / 2 + 92,
      [
        'CONFIRMADO',
        '· Se juega de a dos: pareja contra pareja.',
        `· Cada pareja tiene ${RULES_DEFAULTS.turnSeconds} segundos para sumar lo más que pueda.`,
        '· Hay que tirar de TODOS los lugares: no puede quedar',
        '  una marca sin tirar.',
        '· Después va la otra pareja, su minuto.',
        '· Gana la pareja que hizo más puntos.',
        '· Un solo aro. No se pueden hacer tapones.',
        '· No hay regla de rebote: hay que ir a buscar la pelota',
        '  rápido para no perder tiempo.',
        '· La licuadora y las frutas son el trofeo.',
      ].join('\n'),
      20,
    );

    const values = body(
      this,
      width / 2 - 480,
      -height / 2 + 92,
      [
        'LAS SIETE MARCAS',
        ...SHOT_SPOTS.map((s) => `  ${s.points} — ${s.description}`),
        '',
        'Cuanto más alto el número, más difícil el tiro.',
        '',
        'PENDIENTE (todavía no lo definiste)',
        '· Qué pasa si las dos parejas empatan.',
        `  Por ahora: ronda extra de ${RULES_DEFAULTS.tiebreakSeconds} s cada una,`,
        '  repitiendo hasta que una quede arriba.',
      ].join('\n'),
      19,
    );

    const close = makeButton(this, 0, height / 2 - 52, 'VOLVER', () => this.closeOverlay(), { width: 220, height: 50 });

    this.overlay = this.add
      .container(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, [background, title, confirmed, values, close.container])
      .setDepth(DEPTHS.hud + 20);
    this.buttons.push(close);
  }

  private closeOverlay(): void {
    this.overlay?.destroy(true);
    this.overlay = null;
  }

  override update(_time: number, delta: number): void {
    this.timer += delta;
    REFERENCE_POSES.forEach((_pose, index) => {
      this.view.setFriend(index, { pose: index === 2 ? 'hold' : CourtView.idleFrame(this.timer + index * 240) });
    });
    this.view.update(delta);
  }
}

export const missingAssetCount = (): number => missingAssets().length;
