import Phaser from 'phaser';
import { PALETTE } from './palette';

export const UI_FONT = 'Consolas, "Courier New", monospace';

export interface ButtonOptions {
  readonly width?: number;
  readonly height?: number;
  readonly fontSize?: number;
  readonly accent?: boolean;
}

export interface Button {
  readonly container: Phaser.GameObjects.Container;
  setEnabled(enabled: boolean): void;
  destroy(): void;
}

/**
 * A button that works with pointer and keyboard, shows a visible focus ring and
 * never relies on colour alone to say what is selected.
 */
export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onActivate: () => void,
  options: ButtonOptions = {},
): Button {
  const width = options.width ?? 340;
  const height = options.height ?? 62;
  const fontSize = options.fontSize ?? 24;

  const background = scene.add.rectangle(0, 0, width, height, 0x1b2416, 0.88).setStrokeStyle(3, 0x6f6244);
  const text = scene.add
    .text(0, 0, label, { fontFamily: UI_FONT, fontSize: `${fontSize}px`, color: PALETTE.hudText })
    .setOrigin(0.5);
  const focusRing = scene.add
    .rectangle(0, 0, width + 10, height + 10)
    .setStrokeStyle(3, 0xf5a81c)
    .setVisible(false);

  const container = scene.add.container(x, y, [focusRing, background, text]);
  container.setSize(width, height);
  container.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);

  let enabled = true;

  const refresh = (hover: boolean): void => {
    background.setFillStyle(hover && enabled ? 0x2c3a22 : 0x1b2416, enabled ? 0.9 : 0.4);
    background.setStrokeStyle(3, options.accent === true ? 0xf5a81c : 0x6f6244);
    text.setColor(enabled ? PALETTE.hudText : '#7e7a6c');
    focusRing.setVisible(hover && enabled);
  };
  refresh(false);

  container.on('pointerover', () => refresh(true));
  container.on('pointerout', () => refresh(false));
  container.on('pointerdown', () => {
    if (enabled) onActivate();
  });

  return {
    container,
    setEnabled(value: boolean) {
      enabled = value;
      container.setAlpha(value ? 1 : 0.6);
      refresh(false);
    },
    destroy() {
      container.destroy(true);
    },
  };
}

export function panel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
): Phaser.GameObjects.Rectangle {
  return scene.add.rectangle(x, y, width, height, 0x121a10, 0.86).setStrokeStyle(3, 0x6f6244);
}

export function heading(scene: Phaser.Scene, x: number, y: number, label: string, size = 30): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, label, { fontFamily: UI_FONT, fontSize: `${size}px`, color: PALETTE.hudAccent })
    .setOrigin(0.5);
}

export function body(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  size = 20,
  align: 'left' | 'center' = 'left',
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, label, {
      fontFamily: UI_FONT,
      fontSize: `${size}px`,
      color: PALETTE.hudText,
      align,
      lineSpacing: 6,
    })
    .setOrigin(align === 'center' ? 0.5 : 0, 0);
}

/**
 * Badge shown whenever the scene is running on the procedural stand-in art, so
 * development art is never mistaken for the finished look.
 */
export function developmentArtBadge(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container {
  const text = scene.add
    .text(0, 0, 'ARTE PROVISIONAL — MODO DESARROLLO', {
      fontFamily: UI_FONT,
      fontSize: '16px',
      color: '#12180e',
    })
    .setOrigin(0.5);
  const background = scene.add
    .rectangle(0, 0, text.width + 24, text.height + 12, 0xf5a81c, 0.92)
    .setStrokeStyle(2, 0x3a2a08);
  return scene.add.container(x, y, [background, text]);
}
