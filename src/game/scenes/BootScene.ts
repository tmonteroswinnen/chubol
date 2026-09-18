import Phaser from 'phaser';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../config/court';
import { resolveAssets } from '../assets/manifest';
import { PALETTE } from '../render/palette';
import { buildAllTextures, TEXTURE_KEYS } from '../render/textures';
import { UI_FONT } from '../render/ui';

/**
 * Loads the supplied artwork and builds the few textures the game still has to
 * generate, then hands over to the menu.
 */
export class BootScene extends Phaser.Scene {
  private label: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('Boot');
  }

  preload(): void {
    this.label = this.add
      .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, 'CARGANDO LA CANCHA…', {
        fontFamily: UI_FONT,
        fontSize: '28px',
        color: PALETTE.hudAccent,
      })
      .setOrigin(0.5);

    const bar = this.add.rectangle(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 48, 0, 8, 0xf5a81c).setOrigin(0.5);
    this.load.on('progress', (value: number) => bar.setSize(420 * value, 8));

    this.load.image(TEXTURE_KEYS.plate, 'assets/backgrounds/chubol-court-clean-v1.png');
    this.load.image(TEXTURE_KEYS.plateForeground, 'assets/backgrounds/court-foreground.png');
    this.load.image(TEXTURE_KEYS.hoopFront, 'assets/props/hoop-front.png');
  }

  create(): void {
    resolveAssets();
    buildAllTextures(this);
    this.label?.destroy();
    this.scene.start('Menu');
  }
}
