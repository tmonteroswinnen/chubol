import Phaser from 'phaser';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../config/court';
import { RULES_DEFAULTS } from '../config/gameplay';
import { defaultTeams, type TeamConfig } from '../domain/match';
import { missingAssets, usingDevelopmentArt } from '../assets/manifest';
import { courtProjection } from '../render/context';
import { CourtView, DEPTHS } from '../render/courtView';
import { soundBoard } from '../render/audio';
import { PALETTE } from '../render/palette';
import {
  body,
  developmentArtBadge,
  heading,
  isTouchDevice,
  makeButton,
  overlayScrim,
  panel,
  UI_FONT,
  type Button,
} from '../render/ui';
import { REFERENCE_BALL, REFERENCE_POSES } from './referencePose';

export type GameMode = 'practice' | 'challenge';

export interface GameSceneData {
  readonly mode: GameMode;
  readonly teams: readonly [TeamConfig, TeamConfig];
  /**
   * Which pair the person is playing. The other one is played by the machine.
   * `null` means both pairs are human, taking turns on the same device.
   */
  readonly humanTeam?: number | null;
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
      developmentArtBadge(this, LOGICAL_WIDTH / 2, LOGICAL_HEIGHT - 24).setDepth(DEPTHS.hud);
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
    // Six buttons 74 apart, plus room above and below. It used to be a fixed
    // 400 tall and the last two buttons hung out the bottom of the panel.
    const entries = 6;
    const panelHeight = 74 * entries + 96;
    panel(this, x, top + panelHeight / 2 - 54, 560, panelHeight).setDepth(DEPTHS.hud).setAlpha(0.95);

    const start = (mode: GameMode, humanTeam: number | null = null) => () => {
      soundBoard.unlock();
      this.scene.start('Game', { mode, teams: defaultTeams(), humanTeam } satisfies GameSceneData);
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

    make(24, 'JUGAR CONTRA LA MÁQUINA', () => this.showPairPicker(), true);
    make(98, 'LOS DOS EN ESTE APARATO', start('challenge', null));
    make(172, 'PRÁCTICA LIBRE', start('practice'));
    make(246, 'REGLAS', () => this.showRules());
    make(320, 'COMPARACIÓN VISUAL', () => this.scene.start('Compare'));

    const soundButton = make(394, '', () => {
      soundBoard.unlock();
      soundBoard.toggleMuted();
      this.refreshSoundLabel();
    });
    this.soundLabelText = soundButton.container.list.find(
      (o): o is Phaser.GameObjects.Text => o instanceof Phaser.GameObjects.Text,
    ) ?? null;
    this.refreshSoundLabel();

    const controls = isTouchDevice(this)
      ? 'Tocá una marca para ir   ·   Mantené TIRAR y soltá en la franja verde   ·   Pausa arriba a la derecha'
      : 'Mover: WASD o flechas   ·   Tirar: mantener ESPACIO y soltar   ·   Pausa: ESC';
    const controlsText = this.add
      .text(x, LOGICAL_HEIGHT - 84, controls, { fontFamily: UI_FONT, fontSize: '19px', color: PALETTE.hudText })
      .setOrigin(0.5)
      .setDepth(DEPTHS.hud + 1);
    this.add
      .rectangle(x, LOGICAL_HEIGHT - 84, controlsText.width + 40, 40, 0x0f1409, 0.72)
      .setOrigin(0.5)
      .setDepth(DEPTHS.hud);
  }

  private refreshSoundLabel(): void {
    this.soundLabelText?.setText(soundBoard.muted ? 'SONIDO: APAGADO' : 'SONIDO: ENCENDIDO');
  }

  /** Pick which pair you are. The other one is played by the machine. */
  private showPairPicker(): void {
    this.closeOverlay();
    const teams = defaultTeams();
    const width = 900;
    const height = 430;
    const background = panel(this, 0, 0, width, height);
    const title = heading(this, 0, -height / 2 + 46, '¿QUÉ PAREJA SOS?');
    const subtitle = this.add
      .text(0, -height / 2 + 92, 'La otra la juega la máquina', {
        fontFamily: UI_FONT,
        fontSize: '21px',
        color: PALETTE.hudText,
      })
      .setOrigin(0.5);

    const picks = teams.map((team, index) =>
      makeButton(
        this,
        0,
        -34 + index * 88,
        team.name.toUpperCase(),
        () => {
          soundBoard.unlock();
          this.scene.start('Game', {
            mode: 'challenge',
            teams,
            humanTeam: index,
          } satisfies GameSceneData);
        },
        { width: 560, height: 72, accent: index === 0 },
      ),
    );
    const back = makeButton(this, 0, height / 2 - 52, 'VOLVER', () => this.closeOverlay(), { width: 220, height: 50 });

    this.overlay = this.add
      .container(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, [
        overlayScrim(this, LOGICAL_WIDTH, LOGICAL_HEIGHT),
        background,
        title,
        subtitle,
        ...picks.map((b) => b.container),
        back.container,
      ])
      .setDepth(DEPTHS.hud + 20);
    this.buttons.push(...picks, back);
  }

  private showRules(): void {
    this.closeOverlay();
    const width = 1340;
    const height = 908;
    const background = panel(this, 0, 0, width, height);
    const title = heading(this, 0, -height / 2 + 52, 'REGLAS DE CHUBOL', 40);

    // One column, not two. At a size anyone can read on a phone, two columns of
    // this text ran straight into each other; and the long version lives in
    // docs/RULES.md, which is where it belongs.
    const rules = body(
      this,
      -width / 2 + 56,
      -height / 2 + 110,
      [
        'CONFIRMADO',
        '· De a dos: pareja contra pareja, un aro, sin tapones.',
        `· ${RULES_DEFAULTS.turnSeconds} segundos por pareja. Gana la que hizo más puntos.`,
        '· Hay que tirar de las siete marcas antes de repetir una.',
        '· Dentro del minuto se turnan los dos de la pareja.',
        '· Los rebotes no valen: hay que ir a buscar la pelota',
        '  rápido, porque el reloj no para.',
        '· La licuadora y las frutas son el trofeo.',
        '',
        'LAS MARCAS: 2 · 3 · 4 · 5 · 6 · 7 · 8',
        'Cuanto más alto el número, menos tiempo tenés para soltar:',
        'de 161 ms en la de 2 a 62 ms en la de 8.',
        'Si soltás dentro del verde entra; afuera, no.',
        '',
        'FALTA DEFINIR (no lo dijiste todavía)',
        '· Qué pasa si las dos parejas empatan. Por ahora juegan',
        `  rondas extra de ${RULES_DEFAULTS.tiebreakSeconds} s y después queda compartido.`,
      ].join(String.fromCharCode(10)),
      30,
    );

    const close = makeButton(this, 0, height / 2 - 62, 'VOLVER', () => this.closeOverlay(), {
      width: 300,
      height: 72,
      fontSize: 30,
    });

    this.overlay = this.add
      .container(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, [
        overlayScrim(this, LOGICAL_WIDTH, LOGICAL_HEIGHT),
        background,
        title,
        rules,
        close.container,
      ])
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
