import Phaser from 'phaser';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../config/court';
import { missingAssets, referenceStatus } from '../assets/manifest';
import { courtProjection } from '../render/context';
import { CourtView, DEPTHS } from '../render/courtView';
import { PALETTE } from '../render/palette';
import { body, heading, makeButton, panel, UI_FONT, type Button } from '../render/ui';
import { REFERENCE_BALL, REFERENCE_POSES } from './referencePose';

const REFERENCE_PATH = 'references/chubol-nba-jam.png';

/**
 * Comparison scene.
 *
 * It reproduces the reference frame deterministically — same camera, same
 * positions, HUD hidden — so the rendered scene can be put next to
 * `references/chubol-nba-jam.png`.
 *
 * When that file is not in the checkout, the scene says so. It never shows the
 * reference image and calls it the game, and it never claims a fidelity that has
 * not been measured.
 */
export class CompareScene extends Phaser.Scene {
  private view!: CourtView;
  private buttons: Button[] = [];
  private chrome: Phaser.GameObjects.GameObject[] = [];
  private referenceImage: Phaser.GameObjects.Image | null = null;
  private cleanCapture = false;

  constructor() {
    super('Compare');
  }

  preload(): void {
    // Probed in BootScene; only load it if it is really there.
    if (referenceStatus('reference.plate') === 'available') this.load.image('reference-plate', REFERENCE_PATH);
  }

  create(): void {
    this.view = new CourtView(this, courtProjection());
    this.view.setMarkersVisible(false);
    this.applyReferenceFrame();
    this.buildChrome();

    this.input.keyboard?.on('keydown-H', () => this.setCleanCapture(!this.cleanCapture));
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Menu'));
    // Hiding the interface hides the way out with it, so a tap brings it back.
    // Otherwise pressing H on a phone would be a one-way door.
    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (this.cleanCapture) this.setCleanCapture(false);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  private teardown(): void {
    this.input.keyboard?.removeAllListeners();
    for (const button of this.buttons) button.destroy();
    this.buttons = [];
  }

  /** Deterministic starting frame: the positions described for the reference. */
  private applyReferenceFrame(): void {
    REFERENCE_POSES.forEach((pose, index) => {
      this.view.setFriend(index, {
        x: pose.x,
        y: pose.y,
        pose: index === 2 ? 'hold' : 'idle0',
        backView: pose.backView,
        visible: true,
      });
    });
    this.view.setBall(REFERENCE_BALL.x, REFERENCE_BALL.y, REFERENCE_BALL.z);
    this.view.update(0);
  }

  private buildChrome(): void {
    const missing = missingAssets();
    const referenceMissing = referenceStatus('reference.plate') !== 'available';

    const strip = this.add.rectangle(LOGICAL_WIDTH / 2, 30, LOGICAL_WIDTH, 60, 0x121a10, 0.86).setDepth(DEPTHS.hud);
    const title = this.add
      .text(24, 30, 'ESCENA DE COMPARACIÓN — 1536 × 1024, cuadro determinista', {
        fontFamily: UI_FONT,
        fontSize: '20px',
        color: PALETTE.hudAccent,
      })
      .setOrigin(0, 0.5)
      .setDepth(DEPTHS.hud);

    const hint = this.add
      .text(LOGICAL_WIDTH - 24, 30, 'H: ocultar interfaz   ·   ESC: volver', {
        fontFamily: UI_FONT,
        fontSize: '18px',
        color: PALETTE.hudText,
      })
      .setOrigin(1, 0.5)
      .setDepth(DEPTHS.hud);

    // A way out that does not need a keyboard. Before this, opening the
    // comparison on a phone meant killing the app: the only way back was ESC.
    const back = makeButton(this, 96, LOGICAL_HEIGHT - 80, 'VOLVER', () => this.scene.start('Menu'), {
      width: 150,
      height: 72,
      fontSize: 22,
    });
    back.container.setDepth(DEPTHS.hud + 40);
    this.buttons.push(back);

    this.chrome = [strip, title, hint, back.container];

    if (referenceMissing) {
      const background = panel(this, 0, 0, 900, 300);
      const heading1 = heading(this, 0, -110, 'FALTA LA REFERENCIA', 30);
      const text = body(
        this,
        -410,
        -60,
        [
          `No existe ${REFERENCE_PATH} en el repositorio, así que no hay con qué comparar.`,
          '',
          'Esta escena reproduce el encuadre y las posiciones descritas, pero el arte es',
          `provisional generado por código. Faltan ${missing.length} recursos del manifiesto.`,
          'La fidelidad visual a la ilustración sigue PENDIENTE y no está medida.',
        ].join('\n'),
        20,
      );
      const close = makeButton(this, 0, 104, 'ENTENDIDO', () => panelContainer.setVisible(false), {
        width: 240,
        height: 50,
      });
      this.buttons.push(close);
      const panelContainer = this.add
        .container(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, [background, heading1, text, close.container])
        .setDepth(DEPTHS.hud + 30);
      this.chrome.push(panelContainer);
    } else {
      this.referenceImage = this.add
        .image(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, 'reference-plate')
        .setDepth(DEPTHS.hud + 10)
        .setAlpha(0.5);
      const label = this.add
        .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT - 30, 'VISOR DE REFERENCIA SUPERPUESTO — no es la escena reconstruida', {
          fontFamily: UI_FONT,
          fontSize: '18px',
          color: PALETTE.hudAccent,
        })
        .setOrigin(0.5)
        .setDepth(DEPTHS.hud + 11);
      this.chrome.push(label);
    }
  }

  /** Hides every interface element so the capture shows only the scene. */
  private setCleanCapture(clean: boolean): void {
    this.cleanCapture = clean;
    for (const object of this.chrome) {
      (object as unknown as { setVisible: (v: boolean) => void }).setVisible(!clean);
    }
    this.referenceImage?.setVisible(!clean);
  }

  override update(): void {
    // Frozen frame: nothing animates, so two captures are identical.
    this.view.update(0);
  }
}
