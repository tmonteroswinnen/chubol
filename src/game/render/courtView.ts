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
import { ART_X, ART_Y, BALL, HOOP, LAYER_OFFSETS, SHOT_SPOTS } from '../config/court';
import type { CourtProjection } from '../sim/projection';
import { IDLE_CYCLE, WALK_CYCLE, ballAnchorFor, type PoseName } from './characters';
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
  /** Which way they face: -1 looking left, 1 looking right. */
  facing: number;
}

/** How flat a circle on the grass looks under this camera. */
const GROUND_FLATTEN = 0.473;

/** How many ghosts the ball leaves behind it in the air. */
const TRAIL_LENGTH = 9;

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
  private ballTrail: Phaser.GameObjects.Image[] = [];
  private trailIndex = 0;
  private trailOn = false;
  /** Spin follows how far the ball actually moved, so a still ball does not roll. */
  private ballSpin = 0;
  private ballLast: { x: number; y: number } | null = null;
  /** While a made ball is dropping through the net, nothing else may move it. */
  private ballFalling = false;
  private hoopFrontImage!: Phaser.GameObjects.Image;
  private hoopFrontY = 0;
  /** Where the hoop sits on screen, so the name tag can get out of its way. */
  private hoopScreen = { x: 0, y: 0 };
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
    this.hoopFrontImage = this.add(
      scene.add
        .image(LAYER_OFFSETS.hoopFront.x, LAYER_OFFSETS.hoopFront.y, TEXTURE_KEYS.hoopFront)
        .setOrigin(0, 0)
        .setDepth(DEPTHS.hoopFront),
    );
    this.hoopFrontY = this.hoopFrontImage.y;
    const rim = projection.project(HOOP.groundX, HOOP.groundY, HOOP.rimHeight);
    this.hoopScreen = { x: rim.x, y: rim.y };
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
      this.friendState.push({ x: 4, y: 0, pose: 'idle0', backView: false, visible: true, facing: -1 });
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
    // The trail goes in first so the ball itself always draws over its ghosts.
    for (let i = 0; i < TRAIL_LENGTH; i += 1) {
      this.ballTrail.push(
        this.add(this.scene.add.image(0, 0, ballTextureKey(0)).setVisible(false).setDepth(depthFor(20))),
      );
    }
    this.ball = this.add(this.scene.add.image(0, 0, ballTextureKey(0)).setDepth(depthFor(20)));
  }

  setMarkersVisible(visible: boolean): void {
    for (const marker of this.markers) marker.setVisible(visible);
  }

  /**
   * Lights the mark being stood on, and says whether it can be shot from.
   * Without the second half, a mark already used this lap looked exactly like a
   * fresh one and the shoot button looked broken.
   */
  highlightSpot(index: number | null, available = true): void {
    this.markers.forEach((marker, i) => {
      const active = i === index;
      marker.setAlpha(active ? (available ? 0.95 : 0.55) : 0.3);
      marker.setTint(active && !available ? 0x8d8778 : 0xffffff);
    });
  }

  setFriend(index: number, state: Partial<FriendState>): void {
    const current = this.friendState[index];
    if (current === undefined) return;
    Object.assign(current, state);
  }

  setBall(x: number, y: number, z: number, visible = true): void {
    if (this.ballFalling) return;
    this.placeBall(x, y, z, visible);
  }

  private placeBall(x: number, y: number, z: number, visible: boolean): void {
    this.ball.setVisible(visible);
    this.ballShadow.setVisible(visible);
    if (!visible) {
      this.ballLast = null;
      return;
    }

    const at = this.projection.project(x, y, z);
    const ground = this.projection.project(x, y, 0);

    // Spin follows distance travelled, not the wall clock. A ball sitting on the
    // grass waiting to be picked up used to keep rolling on the spot, and it
    // always turned the same way however it was moving.
    const last = this.ballLast;
    if (last !== null) {
      const dx = x - last.x;
      const travelled = Math.hypot(dx, y - last.y);
      this.ballSpin += Math.sign(dx || 1) * travelled * 2.2;
    }
    this.ballLast = { x, y };
    const spin = ((Math.round(this.ballSpin) % BALL_SPINS) + BALL_SPINS) % BALL_SPINS;

    // Scaled at the ball's own depth, not at the depth of the ground under it.
    // The camera looks down, so a ball up at the rim is noticeably nearer than
    // its own shadow — and the rim painted into the plate is right there to
    // compare it against.
    this.ball
      .setTexture(ballTextureKey(spin))
      .setScale((at.scale * BALL.radius * 2) / BALL_CANONICAL_DIAMETER)
      .setPosition(at.x, at.y)
      .setDepth(depthFor(ground.depth) + 5);

    const lift = Math.max(0, z);
    const shrink = 1 / (1 + lift * 0.3);
    const width = ground.scale * BALL.radius * 2.1 * shrink;
    this.ballShadow
      .setPosition(ground.x, ground.y)
      .setSize(width, width * GROUND_FLATTEN)
      .setAlpha(0.36 * shrink);

    if (this.trailOn) this.pushTrail();
  }

  /** Puts the ball in the hand of the friend holding it, wherever that hand is. */
  setBallInHand(index: number): void {
    if (this.ballFalling) return;
    const image = this.friends[index];
    const state = this.friendState[index];
    if (image === undefined || state === undefined) return;

    const [across, up] = ballAnchorFor(state.pose);
    const height = image.displayHeight;
    // The sprite is drawn facing left with the shooting arm on its right side,
    // so flipping it to face right puts that hand on the left. The ball has to
    // follow, or it floats behind the player's back.
    const side = state.facing >= 0 ? -1 : 1;
    this.ball
      .setVisible(true)
      .setScale((image.scaleX * BALL.radius * 2 * 300) / (ADULT_HEIGHT_METRES * BALL_CANONICAL_DIAMETER))
      .setPosition(image.x + side * across * height, image.y - up * height)
      .setDepth(image.depth + 6);
    this.ballShadow.setVisible(false);
    this.ballLast = null;
  }

  /** Starts and stops the streak the ball leaves while it is in the air. */
  setTrail(on: boolean): void {
    this.trailOn = on;
    if (!on) for (const ghost of this.ballTrail) ghost.setVisible(false);
  }

  private pushTrail(): void {
    const ghost = this.ballTrail[this.trailIndex];
    this.trailIndex = (this.trailIndex + 1) % this.ballTrail.length;
    if (ghost === undefined) return;
    ghost
      .setTexture(this.ball.texture.key)
      .setPosition(this.ball.x, this.ball.y)
      .setScale(this.ball.scaleX * 0.9)
      .setDepth(this.ball.depth - 1)
      .setAlpha(0.42)
      .setVisible(true);
    this.scene.tweens.killTweensOf(ghost);
    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      scale: this.ball.scaleX * 0.5,
      duration: 260,
      onComplete: () => ghost.setVisible(false),
    });
  }

  /**
   * Drops the ball from where it went in down to the grass.
   *
   * It used to cut from the ring to the ground in one frame — two metres in one
   * step, at the exact moment the shot is supposed to feel good.
   */
  dropBallTo(fromX: number, fromY: number, fromZ: number, toX: number, toY: number, onDone: () => void): void {
    this.ballFalling = true;
    this.setTrail(false);
    const at = { x: fromX, y: fromY, z: fromZ, t: 0 };
    this.scene.tweens.add({
      targets: at,
      t: 1,
      duration: 460,
      ease: 'Quad.easeIn',
      onUpdate: () => {
        this.ballFalling = false;
        this.placeBall(
          fromX + (toX - fromX) * at.t,
          fromY + (toY - fromY) * at.t,
          Math.max(BALL.radius, fromZ + (BALL.radius - fromZ) * at.t * at.t),
          true,
        );
        this.ballFalling = true;
      },
      onComplete: () => {
        this.ballFalling = false;
        this.placeBall(toX, toY, BALL.radius, true);
        onDone();
      },
    });
  }

  /** A short shove of the near half of the rim, when the ball goes through it. */
  shakeHoop(strength = 1): void {
    const image = this.hoopFrontImage;
    this.scene.tweens.killTweensOf(image);
    image.y = this.hoopFrontY;
    this.scene.tweens.add({
      targets: image,
      y: this.hoopFrontY + 4 * strength,
      duration: 70,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeOut',
      onComplete: () => {
        image.y = this.hoopFrontY;
      },
    });
  }

  /** A puff of dust under a foot. */
  puff(x: number, y: number): void {
    const at = this.projection.project(x, y, 0);
    const dust = this.add(
      this.scene.add
        .ellipse(at.x, at.y, at.scale * 0.22, at.scale * 0.22 * GROUND_FLATTEN, 0xc9bb92, 0.42)
        .setDepth(depthFor(at.depth) - 2),
    );
    this.scene.tweens.add({
      targets: dust,
      scaleX: 2.1,
      scaleY: 2.1,
      alpha: 0,
      duration: 420,
      ease: 'Cubic.easeOut',
      onComplete: () => dust.destroy(),
    });
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
      const head = this.projection.project(state.x, state.y, ADULT_HEIGHT_METRES);
      const key = characterTextureKey(CHARACTER_KEYS[index]!, state.backView);
      if (image.texture.key !== key) image.setTexture(key, state.pose);
      else image.setFrame(state.pose);
      // Height measured between the two ends, not taken from the scale of the
      // ground plane. The camera looks down, so the head is half a metre nearer
      // than the feet and its scale is bigger: using the floor's scale made a
      // friend on the 6-point mark 11% too tall.
      image
        .setPosition(at.x, at.y)
        .setScale(characterScale(at.y - head.y))
        .setFlipX(state.facing >= 0)
        .setDepth(depthFor(at.depth));

      const shadowWidth = at.scale * 0.55;
      this.friendShadows[index]
        ?.setPosition(at.x, at.y)
        .setSize(shadowWidth, shadowWidth * GROUND_FLATTEN)
        .setDepth(depthFor(at.depth) - 1);

      if (index === active) {
        const bob = Math.sin(this.ambientTimer / 260) * 5;
        // The 2-point mark is right under the basket and gets shot every lap, so
        // the name tag landed on top of the rim every single minute. When it
        // would, it steps aside instead of up.
        const overHoop =
          Math.abs(at.x - this.hoopScreen.x) < 110 && Math.abs(head.y - 56 - this.hoopScreen.y) < 96;
        const tagX = overHoop ? at.x + 96 : at.x;
        const tagY = overHoop ? at.y - (at.y - head.y) * 0.45 : head.y - 58 + bob;
        this.caret.setPosition(tagX - 15, tagY + 4).setVisible(!overHoop);
        this.caretName.setPosition(tagX, tagY).setVisible(this.caretName.text !== '');
      }
    });
  }

  /** Floating score text at a world position. */
  popScore(x: number, y: number, label: string, good: boolean): void {
    // Above the name tag, not through it: the tag sits just over the head and
    // the two used to overlap on every single shot.
    const at = this.projection.project(x, y, 2.95);
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
