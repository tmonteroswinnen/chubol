import Phaser from 'phaser';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../config/court';
import { resolveAssets } from '../assets/manifest';
import { courtProjection } from '../render/context';
import { PALETTE } from '../render/palette';
import { buildAllTextures, type BuiltTextures } from '../render/textures';

export interface BootPayload {
  readonly built: BuiltTextures;
}

let builtTextures: BuiltTextures | null = null;

/** Textures are built once and shared by every scene. */
export function sharedTextures(): BuiltTextures {
  if (builtTextures === null) throw new Error('textures have not been built yet');
  return builtTextures;
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    const label = this.add
      .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, 'PREPARANDO LA CANCHA…', {
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '26px',
        color: PALETTE.hudAccent,
      })
      .setOrigin(0.5);

    // Give the browser one frame to paint the label before the synchronous
    // texture build blocks the main thread.
    this.time.delayedCall(30, () => {
      this.prepare(label);
    });
  }

  private prepare(label: Phaser.GameObjects.Text): void {
    resolveAssets();
    builtTextures = buildAllTextures(this, courtProjection());
    label.destroy();
    this.scene.start('Menu');
  }
}
