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
 * A rectangular button.
 *
 * It highlights on hover and marks the accented one with a coloured border, so
 * what is selected never depends on colour alone. It is driven by pointer and
 * touch only: there is no keyboard focus ring, and the comment here used to
 * claim there was.
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
  // From 0 to the size, NOT from -size/2. Phaser adds the display origin to the
  // local point before testing the hit area, so a rectangle written around zero
  // ends up covering the area half a button up and to the left of the button:
  // the bottom and the right of what you can see do nothing, and a patch of
  // court beside it presses the button instead. See makeHoldButton.
  container.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);

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
  // Same origin correction as the buttons: written around zero it only swallowed
  // taps in the top-left quarter of the screen, so a finger went straight through
  // an open panel and pressed whatever was behind it.
  scrim.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
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
 * stand-in would understate how much of it is the real thing. It belongs on the
 * menu and not over the match: at a size anyone can actually read it covers a
 * good part of the court, and during a minute against the clock nobody is going
 * to stop and read a disclaimer anyway.
 */
export function developmentArtBadge(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container {
  const text = scene.add
    .text(0, 0, 'JUGADORES Y PELOTA: DIBUJO PROVISORIO', {
      fontFamily: UI_FONT,
      fontSize: '26px',
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
 * Three things here exist because of how a phone actually gets held, and each
 * one was a bug before it was a comment:
 *
 * - Only the finger that pressed can let go. The release also has to be caught
 *   at the scene, because a thumb very often slides off the button before
 *   lifting and the button itself would never hear about it — but without
 *   checking which pointer it is, any other finger touching anywhere on the
 *   screen fires the shot.
 * - `POINTER_UP_OUTSIDE` has to be caught too. Phaser emits one or the other,
 *   never both, so a finger lifted past the edge of the canvas would leave the
 *   charge running with no way to shoot.
 * - A thumb already resting on the button when it lights up counts as a press.
 *   Otherwise you hold the button, walk onto the mark, and nothing happens.
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
    .text(0, 0, label, { fontFamily: UI_FONT, fontSize: '34px', color: PALETTE.hudText, align: 'center', lineSpacing: 4 })
    .setOrigin(0.5);

  const container = scene.add.container(x, y, [ring, inner, text]);
  container.setSize(diameter, diameter);
  /*
   * A square hit area, not a circle: a slightly generous target is the right
   * call for a thumb.
   *
   * It goes from 0 to the diameter, not from -radius to +radius. Phaser adds the
   * display origin to the local point before testing, so the obvious spelling
   * lands the area half a button up and to the left: the bottom and the right of
   * the circle you can see do nothing at all, and the grass beside it fires the
   * shot. The exact centre still works, which is why every automated tap passed
   * while a thumb on the button did nothing — that is the bug that was reported.
   */
  container.setInteractive(new Phaser.Geom.Rectangle(0, 0, diameter, diameter), Phaser.Geom.Rectangle.Contains);

  let enabled = true;
  let held = false;
  /** The pointer holding the button, so no other finger can let go for it. */
  let heldBy: number | null = null;
  /** A finger resting on the button while it was off, to honour when it lights up. */
  let waiting: Phaser.Input.Pointer | null = null;

  const paint = () => {
    ring.setStrokeStyle(5, enabled ? 0xf5a81c : 0x6f6244);
    inner.setFillStyle(held && enabled ? 0x4a6236 : 0x2c3a22, enabled ? 0.9 : 0.45);
    text.setColor(enabled ? PALETTE.hudText : '#7e7a6c');
    container.setScale(held && enabled ? 0.94 : 1);
  };
  paint();

  const press = (pointer?: Phaser.Input.Pointer) => {
    if (!enabled) {
      // Remember it: the button may light up while this finger is still down.
      waiting = pointer ?? null;
      return;
    }
    if (held) return;
    held = true;
    heldBy = pointer?.id ?? null;
    waiting = null;
    paint();
    onPress();
  };

  const release = (pointer?: Phaser.Input.Pointer) => {
    if (waiting !== null && (pointer === undefined || pointer.id === waiting.id)) waiting = null;
    if (!held) return;
    // A different finger lifting somewhere else is not this button being let go.
    if (heldBy !== null && pointer !== undefined && pointer.id !== heldBy) return;
    held = false;
    heldBy = null;
    paint();
    onRelease();
  };

  container.on('pointerdown', press);
  container.on('pointerup', release);
  scene.input.on(Phaser.Input.Events.POINTER_UP, release);
  scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, release);

  return {
    container,
    setEnabled(value: boolean) {
      if (enabled === value) return;
      enabled = value;
      if (!value) {
        release();
        waiting = null;
      }
      paint();
      // The thumb that was already pressing gets what it asked for.
      if (value && waiting !== null && waiting.isDown) {
        const pointer = waiting;
        waiting = null;
        press(pointer);
      }
    },
    setLabel(value: string) {
      text.setText(value);
    },
    isHeld() {
      return held;
    },
    destroy() {
      scene.input.off(Phaser.Input.Events.POINTER_UP, release);
      scene.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, release);
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
  container.setInteractive(new Phaser.Geom.Rectangle(0, 0, size, size), Phaser.Geom.Rectangle.Contains);
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
