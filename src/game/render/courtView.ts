/**
 * The world view: the supplied plate, the players and the ball, composed under
 * the calibrated camera with depth sorting and foreground occlusion.
 *
 * Almost everything visible is the artwork itself. Only the four adults and the
 * game ball are drawn by the game, because the artwork does not contain them as
 * separate sprites yet. The boy, the dog, the trophy table, the crate, the
 * watering can, the decorative football and the CHUBOL logo are painted into the
 * plate and are NOT drawn again on top of it.
 *
 * It holds no rules and no input. Scenes drive it.
 */

import Phaser from 'phaser';
import { ART_X, ART_Y, BALL, LAYER_OFFSETS, SHOT_SPOTS } from '../config/court';
import type { CourtProjection } from '../sim/projection';
import { IDLE_CYCLE, WALK_CYCLE, type PoseName } from './characters';
import {
  ADULT_HEIGHT_METRES,
  BALL_CANONICAL_DIAMETER,
  BALL_SPINS,
  CHARACTER_KEYS,
  CHARACTER_ORIGIN_X,
  CHARACTER_ORIGIN_Y,
  TEXTURE_KEYS,
  ballTextureKey,
  characterScale,
  characterTextureKey,
} from './textures';
import { PALETTE } from './palette';
import { UI_FONT } from './ui';

export const DEPTHS = {
  plate: 0,
  marker: 20,
  shadow: 30,
  /** The near half of the rim and the chain net: the ball passes behind them. */
  hoopFront: 900,
  /** The low brick wall at the front: it hides the feet of anyone behind it. */
  foreground: 1000,
  effects: 1200,
  hud: 2000,
} as const;

/** Draw order for an entity at a given camera depth: nearer draws on top. */
export const depthFor = (cameraDepth: number): number => 100 + (60 - cameraDepth) * 10;

export interface FriendState {
  x: number;
  y: number;
  pose: PoseName;
  backView: boolean;
  visible: boolean;
}

export class CourtView {
  readonly scene: Phaser.Scene;
  readonly projection: CourtProjection;
  /**
   * Everything in the world lives in this container, positioned at the top-left
   * of the artwork. So the rest of the class can work in artwork coordinates —
   * which is what the projection produces — and the margins stay free for the
   * interface.
   */
  private readonly root: Phaser.GameObjects.Container;

  private readonly friends: Phaser.GameObjects.Image[] = [];
  private readonly friendShadows: Phaser.GameObjects.Ellipse[] = [];
  private readonly friendState: FriendState[] = [];
  private readonly markers: Phaser.GameObjects.Image[] = [];
  private ball!: Phaser.GameObjects.Image;
  private ballShadow!: Phaser.GameObjects.Ellipse;
  /** Points at whoever has the ball, so it is never a guess. */
  private caret!: Phaser.GameObjects.Triangle;
  private caretName!: Phaser.GameObjects.Text;
  private activeFriend: number | null = null;
  private ambientTimer = 0;

  constructor(scene: Phaser.Scene, projection: CourtProjection) {
    this.scene = scene;
    this.projection = projection;
    this.root = scene.add.container(ART_X, ART_Y);

    this.add(scene.add.image(0, 0, TEXTURE_KEYS.plate).setOrigin(0, 0).setDepth(DEPTHS.plate));

    this.createMarkers();
    this.createFriends();
    this.createBall();
    this.createCaret();

    // Both layers were cropped to their content, so they are drawn at the offset
    // they were cut from.
    this.add(
      scene.add
        .image(LAYER_OFFSETS.hoopFront.x, LAYER_OFFSETS.hoopFront.y, TEXTURE_KEYS.hoopFront)
        .setOrigin(0, 0)
        .setDepth(DEPTHS.hoopFront),
    );
    this.add(
      scene.add
        .image(LAYER_OFFSETS.foreground.x, LAYER_OFFSETS.foreground.y, TEXTURE_KEYS.plateForeground)
        .setOrigin(0, 0)
        .setDepth(DEPTHS.foreground),
    );
  }

  /** Puts a display object into the world container, in artwork coordinates. */
  private add<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.root.add(object);
    return object;
  }

  private createMarkers(): void {
    for (const spot of SHOT_SPOTS) {
      const at = this.projection.project(spot.x, spot.y, 0);
      const marker = this.add(this.scene.add
        .image(at.x, at.y, TEXTURE_KEYS.spotMarker))
        .setScale((at.scale * spot.tolerance * 2) / 120)
        .setDepth(DEPTHS.marker)
        .setAlpha(0.3);
      this.markers.push(marker);
    }
  }

  private createFriends(): void {
    CHARACTER_KEYS.forEach((key) => {
      const image = this.add(this.scene.add
        .image(0, 0, characterTextureKey(key), 'idle0')
        .setOrigin(CHARACTER_ORIGIN_X, CHARACTER_ORIGIN_Y));
      const shadow = this.add(this.scene.add.ellipse(0, 0, 10, 5, 0x142810, 0.34).setDepth(DEPTHS.shadow));
      this.friends.push(image);
      this.friendShadows.push(shadow);
      this.friendState.push({ x: 4, y: 0, pose: 'idle0', backView: false, visible: true });
    });
  }

  /** A caret and a name over the player who currently has the ball. */
  private createCaret(): void {
    this.caret = this.add(
      this.scene.add
        .triangle(0, 0, 0, 0, 30, 0, 15, 26, 0xf5a81c)
        .setDepth(DEPTHS.effects)
        .setVisible(false),
    );
    this.caretName = this.add(
      this.scene.add
        .text(0, 0, '', {
          fontFamily: UI_FONT,
          fontSize: '34px',
          color: PALETTE.hudText,
          stroke: '#141008',
          strokeThickness: 6,
        })
        .setOrigin(0.5, 1)
        .setDepth(DEPTHS.effects)
        .setVisible(false),
    );
  }

  /** Marks which friend has the ball, by index, and names them. */
  setActiveFriend(index: number | null, name = ''): void {
    this.activeFriend = index;
    this.caretName.setText(name);
  }

  private createBall(): void {
    this.ballShadow = this.add(this.scene.add.ellipse(0, 0, 10, 5, 0x142810, 0.36).setDepth(DEPTHS.shadow));
    this.ball = this.add(this.scene.add.image(0, 0, ballTextureKey(0)).setDepth(depthFor(20)));
  }

  setMarkersVisible(visible: boolean): void {
    for (const marker of this.markers) marker.setVisible(visible);
  }

  highlightSpot(index: number | null): void {
    this.markers.forEach((marker, i) => marker.setAlpha(i === index ? 0.9 : 0.3));
  }

  setFriend(index: number, state: Partial<FriendState>): void {
    const current = this.friendState[index];
    if (current === undefined) return;
    Object.assign(current, state);
  }

  setBall(x: number, y: number, z: number, visible = true): void {
    this.ball.setVisible(visible);
    this.ballShadow.setVisible(visible);
    if (!visible) return;

    const at = this.projection.project(x, y, z);
    const ground = this.projection.project(x, y, 0);
    const spin = Math.floor((this.ambientTimer / 55) % BALL_SPINS);
    this.ball
      .setTexture(ballTextureKey(spin))
      .setScale((ground.scale * BALL.radius * 2) / BALL_CANONICAL_DIAMETER)
      .setPosition(at.x, at.y)
      .setDepth(depthFor(ground.depth) + 5);

    const lift = Math.max(0, z);
    const shrink = 1 / (1 + lift * 0.3);
    const width = ground.scale * BALL.radius * 2.1 * shrink;
    this.ballShadow
      .setPosition(ground.x, ground.y)
      .setSize(width, width * 0.42)
      .setAlpha(0.36 * shrink);
  }

  /** Advances ambient animation and refreshes every character sprite. */
  update(deltaMs: number): void {
    this.ambientTimer += deltaMs;

    const active = this.activeFriend;
    if (active === null) {
      this.caret.setVisible(false);
      this.caretName.setVisible(false);
    }

    this.friends.forEach((image, index) => {
      const state = this.friendState[index];
      if (state === undefined) return;
      image.setVisible(state.visible);
      this.friendShadows[index]?.setVisible(state.visible);
      if (!state.visible) return;

      const at = this.projection.project(state.x, state.y, 0);
      const key = characterTextureKey(CHARACTER_KEYS[index]!, state.backView);
      if (image.texture.key !== key) image.setTexture(key, state.pose);
      else image.setFrame(state.pose);
      image
        .setPosition(at.x, at.y)
        .setScale(characterScale(at.scale * ADULT_HEIGHT_METRES))
        .setDepth(depthFor(at.depth));

      const shadowWidth = at.scale * 0.55;
      this.friendShadows[index]
        ?.setPosition(at.x, at.y)
        .setSize(shadowWidth, shadowWidth * 0.32)
        .setDepth(depthFor(at.depth) - 1);

      if (index === active) {
        const head = this.projection.project(state.x, state.y, ADULT_HEIGHT_METRES);
        const bob = Math.sin(this.ambientTimer / 260) * 5;
        this.caret.setPosition(at.x - 15, head.y - 54 + bob).setVisible(true);
        this.caretName.setPosition(at.x, head.y - 58 + bob).setVisible(this.caretName.text !== '');
      }
    });
  }

  /** Floating score text at a world position. */
  popScore(x: number, y: number, label: string, good: boolean): void {
    const at = this.projection.project(x, y, 2.2);
    const text = this.add(this.scene.add
      .text(at.x, at.y, label, {
        fontFamily: UI_FONT,
        fontSize: '44px',
        color: good ? PALETTE.hudGood : PALETTE.hudBad,
        stroke: '#161008',
        strokeThickness: 7,
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.effects));
    this.scene.tweens.add({
      targets: text,
      y: at.y - 62,
      alpha: 0,
      duration: 950,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  static walkFrame(timerMs: number): PoseName {
    return WALK_CYCLE[Math.floor(timerMs / 110) % WALK_CYCLE.length]!;
  }

  static idleFrame(timerMs: number): PoseName {
    return IDLE_CYCLE[Math.floor(timerMs / 620) % IDLE_CYCLE.length]!;
  }
}
