import Phaser from 'phaser';
import { PALETTE } from './palette';

export const UI_FONT = 'Consolas, "Courier New", monospace';

/**
 * Whether this is a touch device, so the game can explain itself in the terms
 * the player actually has. A laptop with a touchscreen reports both, and gets
 * the touch wording, which still works with a mouse.
 */
export const isTouchDevice = (scene: Phaser.Scene): boolean =>
  scene.sys.game.device.input.touch && !scene.sys.game.device.os.desktop;

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

/**
 * Full-screen dimmer that goes behind a panel.
 *
 * It does two things. It darkens the menu so the panel reads as being on top of
 * it rather than mixed into it, and — because Phaser only delivers a pointer to
 * the top-most interactive object — it swallows taps, so the menu buttons the
 * panel is covering cannot be pressed through it.
 */
export function overlayScrim(scene: Phaser.Scene, width: number, height: number): Phaser.GameObjects.Rectangle {
  const scrim = scene.add.rectangle(0, 0, width, height, 0x0a0d06, 0.78);
  scrim.setInteractive(
    new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
    Phaser.Geom.Rectangle.Contains,
  );
  return scrim;
}

export function panel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
): Phaser.GameObjects.Rectangle {
  return scene.add.rectangle(x, y, width, height, 0x121a10, 1).setStrokeStyle(3, 0x6f6244);
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
 * Badge shown while any piece of art is still a procedural stand-in.
 *
 * It names what is provisional instead of saying "development art", because the
 * court itself is the supplied illustration and calling the whole screen a
 * stand-in would understate how much of it is the real thing.
 */
export function developmentArtBadge(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container {
  const text = scene.add
    .text(0, 0, 'LA CANCHA ES LA LÁMINA · JUGADORES Y PELOTA, DIBUJADOS EN CÓDIGO', {
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

export interface HoldButton {
  readonly container: Phaser.GameObjects.Container;
  setEnabled(enabled: boolean): void;
  setLabel(label: string): void;
  isHeld(): boolean;
  destroy(): void;
}

/**
 * A round button that reports being pressed and released, for charging a shot.
 *
 * It has to release on `pointerupoutside` as well: on a phone a thumb very often
 * slides off the button before lifting, and losing that event would leave the
 * charge bar running forever with no way to shoot.
 */
export function makeHoldButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  diameter: number,
  label: string,
  onPress: () => void,
  onRelease: () => void,
): HoldButton {
  const radius = diameter / 2;
  const ring = scene.add.circle(0, 0, radius, 0x1b2416, 0.92).setStrokeStyle(5, 0xf5a81c);
  const inner = scene.add.circle(0, 0, radius - 12, 0x2c3a22, 0.9);
  const text = scene.add
    .text(0, 0, label, { fontFamily: UI_FONT, fontSize: '26px', color: PALETTE.hudText, align: 'center' })
    .setOrigin(0.5);

  const container = scene.add.container(x, y, [ring, inner, text]);
  container.setSize(diameter, diameter);
  // A square hit area, not a circle: it matches how the other buttons are wired,
  // and a slightly generous target is the right call for a thumb.
  container.setInteractive(
    new Phaser.Geom.Rectangle(-radius, -radius, diameter, diameter),
    Phaser.Geom.Rectangle.Contains,
  );

  let enabled = true;
  let held = false;

  const paint = () => {
    ring.setStrokeStyle(5, enabled ? 0xf5a81c : 0x6f6244);
    inner.setFillStyle(held && enabled ? 0x4a6236 : 0x2c3a22, enabled ? 0.9 : 0.45);
    text.setColor(enabled ? PALETTE.hudText : '#7e7a6c');
    container.setScale(held && enabled ? 0.94 : 1);
  };
  paint();

  const press = () => {
    if (!enabled || held) return;
    held = true;
    paint();
    onPress();
  };
  const release = () => {
    if (!held) return;
    held = false;
    paint();
    onRelease();
  };

  container.on('pointerdown', press);
  container.on('pointerup', release);
  container.on('pointerupoutside', release);
  // A finger dragged off the button still has to be able to let go of the shot.
  scene.input.on(Phaser.Input.Events.POINTER_UP, release);

  return {
    container,
    setEnabled(value: boolean) {
      if (enabled === value) return;
      enabled = value;
      if (!value) release();
      paint();
    },
    setLabel(value: string) {
      text.setText(value);
    },
    isHeld() {
      return held;
    },
    destroy() {
      scene.input.off(Phaser.Input.Events.POINTER_UP, release);
      container.destroy(true);
    },
  };
}

/** A small square button, for pause and other corner actions. */
export function makeIconButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number,
  label: string,
  onActivate: () => void,
): Button {
  const background = scene.add.rectangle(0, 0, size, size, 0x1b2416, 0.88).setStrokeStyle(3, 0x6f6244);
  const text = scene.add
    .text(0, 0, label, { fontFamily: UI_FONT, fontSize: `${Math.round(size * 0.4)}px`, color: PALETTE.hudText })
    .setOrigin(0.5);
  const container = scene.add.container(x, y, [background, text]);
  container.setSize(size, size);
  container.setInteractive(new Phaser.Geom.Rectangle(-size / 2, -size / 2, size, size), Phaser.Geom.Rectangle.Contains);
  container.on('pointerdown', onActivate);
  return {
    container,
    setEnabled(value: boolean) {
      container.setAlpha(value ? 1 : 0.5);
    },
    destroy() {
      container.destroy(true);
    },
  };
}
