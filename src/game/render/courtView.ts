/**
 * The world view: plate, hoop, props, characters and ball, composed under one
 * fixed camera with depth sorting and foreground occlusion.
 *
 * It holds no rules and no input. Scenes drive it.
 */

import Phaser from 'phaser';
import { BALL, LOGICAL_WIDTH, PROPS, SHOT_SPOTS } from '../config/court';
import type { CourtProjection } from '../sim/projection';
import { ART_SCALE } from './pixelCanvas';
import { IDLE_CYCLE, WALK_CYCLE, type PoseName } from './characters';
import {
  ADULT_HEIGHT_METRES,
  BALL_SPINS,
  BALL_TIERS,
  CHARACTER_KEYS,
  CHARACTER_ORIGIN_X,
  CHARACTER_ORIGIN_Y,
  CHARACTER_TIERS,
  TEXTURE_KEYS,
  ballTextureKey,
  characterFrameName,
  characterTextureKey,
  pickTier,
  type BuiltTextures,
} from './textures';
import { PALETTE } from './palette';

export const DEPTHS = {
  plate: 0,
  hoopBack: 10,
  marker: 20,
  shadow: 30,
  hoopFront: 900,
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

  private readonly friends: Phaser.GameObjects.Image[] = [];
  private readonly friendShadows: Phaser.GameObjects.Ellipse[] = [];
  private readonly friendState: FriendState[] = [];
  private readonly markers: Phaser.GameObjects.Image[] = [];
  private kid!: Phaser.GameObjects.Image;
  private dog!: Phaser.GameObjects.Image;
  private ball!: Phaser.GameObjects.Image;
  private ballShadow!: Phaser.GameObjects.Ellipse;
  private logo!: Phaser.GameObjects.Image;
  private ambientTimer = 0;
  private kidCheering = false;

  constructor(scene: Phaser.Scene, projection: CourtProjection, built: BuiltTextures) {
    this.scene = scene;
    this.projection = projection;

    scene.add.image(0, 0, TEXTURE_KEYS.plateBackground).setOrigin(0, 0).setScale(ART_SCALE).setDepth(DEPTHS.plate);
    scene.add.image(0, 0, TEXTURE_KEYS.hoopBack).setOrigin(0, 0).setScale(ART_SCALE).setDepth(DEPTHS.hoopBack);

    this.createMarkers();
    this.createProps(built);
    this.createFriends();
    this.createBall();

    scene.add.image(0, 0, TEXTURE_KEYS.hoopFront).setOrigin(0, 0).setScale(ART_SCALE).setDepth(DEPTHS.hoopFront);
    scene.add.image(0, 0, TEXTURE_KEYS.plateForeground).setOrigin(0, 0).setScale(ART_SCALE).setDepth(DEPTHS.foreground);

    this.logo = scene.add
      .image(LOGICAL_WIDTH / 2, 84, TEXTURE_KEYS.logo)
      .setScale(ART_SCALE)
      .setDepth(DEPTHS.effects);
  }

  private createMarkers(): void {
    for (const spot of SHOT_SPOTS) {
      const at = this.projection.project(spot.x, spot.y, 0);
      const marker = this.scene.add
        .image(at.x, at.y, TEXTURE_KEYS.spotMarker)
        .setScale(ART_SCALE * (at.scale / this.projection.project(5, 0, 0).scale))
        .setDepth(DEPTHS.marker)
        .setAlpha(0.32);
      this.markers.push(marker);
    }
  }

  private place(image: Phaser.GameObjects.Image, x: number, y: number, origin: { originX: number; originY: number }): void {
    const at = this.projection.project(x, y, 0);
    image.setOrigin(origin.originX, origin.originY).setScale(ART_SCALE).setPosition(at.x, at.y).setDepth(depthFor(at.depth));
  }

  private createProps(built: BuiltTextures): void {
    const add = (key: string, x: number, y: number, origin: { originX: number; originY: number }) => {
      const image = this.scene.add.image(0, 0, key);
      this.place(image, x, y, origin);
      return image;
    };
    add(TEXTURE_KEYS.trophy, PROPS.trophyTable.x, PROPS.trophyTable.y, built.trophyOrigin);
    add(TEXTURE_KEYS.crate, PROPS.crate.x, PROPS.crate.y, built.crateOrigin);
    add(TEXTURE_KEYS.wateringCan, PROPS.wateringCan.x, PROPS.wateringCan.y, built.canOrigin);
    add(TEXTURE_KEYS.football, PROPS.footballDecor.x, PROPS.footballDecor.y, built.footballOrigin);

    this.kid = this.scene.add.image(0, 0, TEXTURE_KEYS.kid, 'idle0');
    this.place(this.kid, PROPS.kid.x, PROPS.kid.y, built.kidOrigin);
    this.dog = this.scene.add.image(0, 0, TEXTURE_KEYS.dog, 'idle0');
    this.place(this.dog, PROPS.dog.x, PROPS.dog.y, built.dogOrigin);
  }

  private createFriends(): void {
    CHARACTER_KEYS.forEach((key) => {
      const image = this.scene.add
        .image(0, 0, characterTextureKey(key), characterFrameName('idle0', 0))
        .setOrigin(CHARACTER_ORIGIN_X, CHARACTER_ORIGIN_Y)
        .setScale(ART_SCALE);
      const shadow = this.scene.add.ellipse(0, 0, 10, 5, 0x18280f, 0.34).setDepth(DEPTHS.shadow);
      this.friends.push(image);
      this.friendShadows.push(shadow);
      this.friendState.push({ x: 4, y: 0, pose: 'idle0', backView: false, visible: true });
    });
  }

  private createBall(): void {
    this.ballShadow = this.scene.add.ellipse(0, 0, 10, 5, 0x18280f, 0.34).setDepth(DEPTHS.shadow);
    this.ball = this.scene.add.image(0, 0, ballTextureKey(2, 0)).setDepth(depthFor(20));
  }

  setLogoVisible(visible: boolean): void {
    this.logo.setVisible(visible);
  }

  setMarkersVisible(visible: boolean): void {
    for (const marker of this.markers) marker.setVisible(visible);
  }

  highlightSpot(index: number | null): void {
    this.markers.forEach((marker, i) => marker.setAlpha(i === index ? 0.85 : 0.32));
  }

  setFriend(index: number, state: Partial<FriendState>): void {
    const current = this.friendState[index];
    if (current === undefined) return;
    Object.assign(current, state);
  }

  friendAt(index: number): FriendState | undefined {
    return this.friendState[index];
  }

  setBall(x: number, y: number, z: number, visible = true): void {
    this.ball.setVisible(visible);
    this.ballShadow.setVisible(visible);
    if (!visible) return;

    const at = this.projection.project(x, y, z);
    const ground = this.projection.project(x, y, 0);
    const tier = pickTier(BALL_TIERS, ground.scale * BALL.radius * 2);
    const spin = Math.floor((this.ambientTimer / 60) % BALL_SPINS);
    this.ball.setTexture(ballTextureKey(tier, spin));
    this.ball.setScale(ART_SCALE).setPosition(at.x, at.y).setDepth(depthFor(ground.depth) + 5);

    const lift = Math.max(0, z);
    const shrink = 1 / (1 + lift * 0.28);
    const width = ground.scale * BALL.radius * 2.1 * shrink;
    this.ballShadow
      .setPosition(ground.x, ground.y)
      .setSize(width, width * 0.42)
      .setAlpha(0.34 * shrink);
  }

  /** Advances ambient animation and refreshes every character sprite. */
  update(deltaMs: number): void {
    this.ambientTimer += deltaMs;

    this.friends.forEach((image, index) => {
      const state = this.friendState[index];
      if (state === undefined) return;
      image.setVisible(state.visible);
      this.friendShadows[index]?.setVisible(state.visible);
      if (!state.visible) return;

      const at = this.projection.project(state.x, state.y, 0);
      const tier = pickTier(CHARACTER_TIERS, at.scale * ADULT_HEIGHT_METRES);
      const key = characterTextureKey(CHARACTER_KEYS[index]!, state.backView);
      if (image.texture.key !== key) image.setTexture(key, characterFrameName(state.pose, tier));
      else image.setFrame(characterFrameName(state.pose, tier));
      image.setPosition(at.x, at.y).setDepth(depthFor(at.depth));

      const shadowWidth = at.scale * 0.62;
      this.friendShadows[index]
        ?.setPosition(at.x, at.y)
        .setSize(shadowWidth, shadowWidth * 0.34)
        .setDepth(depthFor(at.depth) - 1);
    });

    // The ambient loop must not overwrite the spectator's reaction.
    const blink = Math.floor(this.ambientTimer / 900) % 2 === 0 ? 'idle0' : 'idle1';
    this.kid.setFrame(this.kidCheering ? 'cheer' : blink);
    this.dog.setFrame(Math.floor(this.ambientTimer / 420) % 2 === 0 ? 'idle0' : 'idle1');
  }

  cheer(on: boolean): void {
    this.kidCheering = on;
    this.kid.setFrame(on ? 'cheer' : 'idle0');
  }

  /** Brief flash over the trophy table for the celebration. */
  flashTrophy(): Phaser.GameObjects.Ellipse {
    const at = this.projection.project(PROPS.trophyTable.x, PROPS.trophyTable.y - 0.2, 0.8);
    const halo = this.scene.add
      .ellipse(at.x, at.y, at.scale * 2.2, at.scale * 1.8, 0xf5a81c, 0.32)
      .setDepth(DEPTHS.effects - 1);
    this.scene.tweens.add({ targets: halo, alpha: 0.05, duration: 620, yoyo: true, repeat: -1 });
    return halo;
  }

  /** Floating score text at a world position. */
  popScore(x: number, y: number, label: string, good: boolean): void {
    const at = this.projection.project(x, y, 2.4);
    const text = this.scene.add
      .text(at.x, at.y, label, {
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '40px',
        color: good ? PALETTE.hudGood : PALETTE.hudBad,
        stroke: '#1a1208',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.effects);
    this.scene.tweens.add({
      targets: text,
      y: at.y - 58,
      alpha: 0,
      duration: 900,
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
