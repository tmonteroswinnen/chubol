import Phaser from 'phaser';
import { BALL, LOGICAL_HEIGHT, LOGICAL_WIDTH, SHOT_SPOTS, WALK_BOUNDS, type ShotSpot } from '../config/court';
import { MOVEMENT, SHOT } from '../config/gameplay';
import { Match, defaultMatchConfig, type TeamConfig } from '../domain/match';
import { PracticeSession } from '../domain/practice';
import { nearestSpot, spotAt } from '../domain/spots';
import { ShotSimulation, createShotProfile, launchFromProfile, type ShotProfile } from '../sim/ball';
import { soundBoard } from '../render/audio';
import { courtProjection } from '../render/context';
import { CourtView, DEPTHS } from '../render/courtView';
import { Hud } from '../render/hud';
import { CHARACTER_KEYS } from '../render/textures';
import { developmentArtBadge, heading, makeButton, panel, type Button } from '../render/ui';
import { usingDevelopmentArt } from '../assets/manifest';
import { sharedTextures } from './BootScene';
import { WAITING_SPOTS } from './referencePose';
import type { GameSceneData } from './MenuScene';

/**
 * positioning — the shooter has the ball and can walk to a mark.
 * charging    — the charge bar is sweeping.
 * flight      — the ball is in the air.
 * retrieving  — the ball is on the grass and has to be fetched. The clock runs:
 *               this is the "ir a buscarla rápido para no perder tiempo" part.
 * turnBreak   — the minute is over, waiting to hand the ball to the other pair.
 */
type Phase = 'positioning' | 'charging' | 'flight' | 'retrieving' | 'turnBreak' | 'over';

/** How close the shooter has to get to pick the ball up again, in metres. */
const PICKUP_RADIUS = 0.75;

export class GameScene extends Phaser.Scene {
  private sceneData!: GameSceneData;
  private view!: CourtView;
  private hud!: Hud;

  private match: Match | null = null;
  private practice: PracticeSession | null = null;

  private phase: Phase = 'positioning';
  private shooter = { x: 5, y: 0 };
  private friendIndex = 0;
  private timer = 0;
  private walking = false;

  private chargeElapsed = 0;
  private profile: ShotProfile | null = null;
  private lockedSpot: ShotSpot | null = null;
  private lockedPoints = 0;
  private shotId = 0;
  private simulation: ShotSimulation | null = null;
  private ballRest = { x: 0, y: 0, z: BALL.radius };
  private feedbackFor = 0;
  private breakFor = 0;

  private paused = false;
  private pauseOverlay: Phaser.GameObjects.Container | null = null;
  private pauseButtons: Button[] = [];
  private keys!: {
    up: Phaser.Input.Keyboard.Key[];
    down: Phaser.Input.Keyboard.Key[];
    left: Phaser.Input.Keyboard.Key[];
    right: Phaser.Input.Keyboard.Key[];
    shoot: Phaser.Input.Keyboard.Key;
  };

  constructor() {
    super('Game');
  }

  init(data: GameSceneData): void {
    this.sceneData = data;
    this.phase = 'positioning';
    this.timer = 0;
    this.paused = false;
    this.simulation = null;
    this.profile = null;
    this.lockedSpot = null;
    this.shotId = 0;
  }

  create(): void {
    this.view = new CourtView(this, courtProjection(), sharedTextures());
    this.view.setLogoVisible(false);
    this.hud = new Hud(this);

    if (this.sceneData.mode === 'challenge') {
      const base = defaultMatchConfig(this.sceneData.teams);
      this.match = new Match({
        ...base,
        turnMs: this.sceneData.turnMs ?? base.turnMs,
        tiebreakMs: this.sceneData.tiebreakMs ?? base.tiebreakMs,
      });
      this.practice = null;
      this.match.startTurn();
    } else {
      this.practice = new PracticeSession();
      this.match = null;
    }

    this.beginShotCycle(true);
    this.bindInput();

    if (usingDevelopmentArt()) {
      developmentArtBadge(this, LOGICAL_WIDTH - 210, 26).setDepth(DEPTHS.hud);
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  private teardown(): void {
    this.input.keyboard?.removeAllListeners();
    this.input.removeAllListeners();
    this.closePause();
    this.hud.destroy();
    this.simulation = null;
  }

  private bindInput(): void {
    const keyboard = this.input.keyboard;
    if (keyboard === undefined || keyboard === null) return;
    const key = (code: number) => keyboard.addKey(code, true, false);
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      up: [key(K.W), key(K.UP)],
      down: [key(K.S), key(K.DOWN)],
      left: [key(K.A), key(K.LEFT)],
      right: [key(K.D), key(K.RIGHT)],
      shoot: key(K.SPACE),
    };
    // Space must not scroll the page while playing.
    keyboard.addCapture([K.SPACE, K.UP, K.DOWN, K.LEFT, K.RIGHT]);

    keyboard.on('keydown-ESC', () => this.togglePause());
    keyboard.on('keydown-M', () => {
      soundBoard.unlock();
      soundBoard.toggleMuted();
    });
    this.keys.shoot.on('down', () => this.startCharge());
    this.keys.shoot.on('up', () => this.release());

    this.input.on('pointerdown', () => {
      soundBoard.unlock();
      this.startCharge();
    });
    this.input.on('pointerup', () => this.release());
  }

  /** The friend on the ball: pairs are friends A+B and C+D. */
  private activeFriendIndex(): number {
    if (this.match === null) return 0;
    return (this.match.currentTeamIndex * 2 + this.match.currentMemberIndex) % CHARACTER_KEYS.length;
  }

  private placeWaitingFriends(): void {
    CHARACTER_KEYS.forEach((_, index) => {
      if (index === this.friendIndex) return;
      const spot = WAITING_SPOTS[index] ?? WAITING_SPOTS[0]!;
      // The others wait out of the way. They never defend and never block.
      this.view.setFriend(index, { x: spot.x, y: spot.y, pose: 'idle0', backView: false, visible: true });
    });
  }

  /** Hands the ball to the shooter, at a mark they are still owed. */
  private beginShotCycle(firstOfTurn: boolean): void {
    this.phase = 'positioning';
    this.profile = null;
    this.lockedSpot = null;
    this.simulation = null;
    this.hud.hideBar();

    this.friendIndex = this.activeFriendIndex();
    if (firstOfTurn) {
      const start = SHOT_SPOTS[0]!;
      this.shooter.x = start.x;
      this.shooter.y = start.y;
    }
    this.placeWaitingFriends();
    this.view.setFriend(this.friendIndex, { x: this.shooter.x, y: this.shooter.y, pose: 'hold', visible: true });
    this.refreshHud();
  }

  private refreshHud(): void {
    if (this.match !== null) {
      const team = this.match.currentTeam;
      const extra = this.match.round > 0 ? ` · DESEMPATE ${this.match.round}` : '';
      this.hud.setTurn(`${team.name.toUpperCase()}${extra} — ${this.match.currentMemberName}`);
      this.hud.setScore(
        this.match.config.teams.map((t, i) => `${t.name}: ${this.match!.scoreOf(i)}`).join('   ·   '),
      );
      this.hud.setClock(this.match.timeLeft);
      this.hud.setLapMarks(this.match.lapDone, 'YA TIRARON:');
    } else if (this.practice !== null) {
      this.hud.setTurn(`PRÁCTICA — ACIERTOS ${this.practice.makes}/${this.practice.attempts.length}`);
      this.hud.setScore(`PUNTOS: ${this.practice.total}   MARCAS: ${this.practice.spotsCleared.size}/7`);
      this.hud.setClock(null);
      this.hud.setLapMarks(this.practice.spotsCleared, 'EMBOCADAS:');
    }
  }

  private currentSpot(): ShotSpot | null {
    return spotAt(this.shooter.x, this.shooter.y);
  }

  private canShootHere(spot: ShotSpot): boolean {
    if (this.match === null) return true;
    return this.match.canShootFrom(spot.id);
  }

  private startCharge(): void {
    if (this.paused || this.phase !== 'positioning') return;
    const spot = this.currentSpot();
    if (spot === null || !this.canShootHere(spot)) return;
    const profile = createShotProfile(this.shooter.x, this.shooter.y, spot.points);
    if (profile === null) return;

    this.profile = profile;
    this.lockedSpot = spot;
    this.chargeElapsed = 0;
    this.phase = 'charging';
    this.hud.showBar(profile.window.low, profile.window.high, `MARCA DE ${spot.points} · SOLTÁ EN LA FRANJA`);
    this.view.setFriend(this.friendIndex, { pose: 'wind' });
  }

  private chargeValue(): number {
    const period = SHOT.chargeHalfPeriodMs * 2;
    const t = this.chargeElapsed % period;
    return t < SHOT.chargeHalfPeriodMs ? t / SHOT.chargeHalfPeriodMs : 2 - t / SHOT.chargeHalfPeriodMs;
  }

  private release(): void {
    if (this.paused || this.phase !== 'charging') return;
    const profile = this.profile;
    const spot = this.lockedSpot;
    if (profile === null || spot === null) return;

    const launch = launchFromProfile(profile, this.chargeValue());
    if (launch === null) return;

    // The value is captured here, at release, and never recomputed afterwards.
    this.lockedPoints = spot.points;
    this.shotId =
      this.match !== null
        ? this.match.beginShot(spot.id, spot.points).shotId
        : this.practice!.beginShot(spot.id, spot.points);

    this.simulation = new ShotSimulation(this.shotId, launch);
    this.phase = 'flight';
    this.hud.hideBar();
    this.view.setFriend(this.friendIndex, { pose: 'release' });
  }

  private resolve(made: boolean): void {
    if (this.match !== null) this.match.resolveShot(this.shotId, made);
    else this.practice?.resolveShot(this.shotId, made);

    if (made) {
      soundBoard.chain();
      soundBoard.score(this.lockedPoints);
      this.view.popScore(this.shooter.x, this.shooter.y, `+${this.lockedPoints}`, true);
      this.view.setFriend(this.friendIndex, { pose: 'cheer' });
      this.view.cheer(true);
    } else {
      soundBoard.miss();
      this.view.popScore(this.shooter.x, this.shooter.y, 'AFUERA', false);
      this.view.setFriend(this.friendIndex, { pose: 'follow' });
    }

    const state = this.simulation?.state;
    // Where the ball came to rest, pulled back inside reach so it can be fetched.
    this.ballRest = {
      x: Phaser.Math.Clamp(state?.x ?? 3, WALK_BOUNDS.minX, WALK_BOUNDS.maxX),
      y: Phaser.Math.Clamp(state?.y ?? 0, WALK_BOUNDS.minY, WALK_BOUNDS.maxY),
      z: BALL.radius,
    };
    this.feedbackFor = 520;
    this.phase = 'retrieving';
    this.refreshHud();
  }

  /** Ends the pair's minute and hands over, or finishes the match. */
  private endTurn(): void {
    const match = this.match;
    if (match === null) return;
    match.endTurn();
    this.view.cheer(false);

    if (match.finished) {
      this.phase = 'over';
      this.scene.start('Result', { result: match.result(), config: match.config });
      return;
    }
    this.phase = 'turnBreak';
    this.breakFor = 1800;
    soundBoard.board();
    this.hud.setHint('SE TERMINÓ EL MINUTO — CAMBIO DE PAREJA');
  }

  private movePlayer(deltaMs: number): void {
    let dx = 0;
    let dy = 0;
    const down = (keys: Phaser.Input.Keyboard.Key[]) => keys.some((k) => k.isDown);
    if (down(this.keys.left)) dx -= 1;
    if (down(this.keys.right)) dx += 1;
    // Screen "up" moves away from the camera, towards the cypresses.
    if (down(this.keys.up)) dy += 1;
    if (down(this.keys.down)) dy -= 1;

    this.walking = dx !== 0 || dy !== 0;
    if (!this.walking) return;

    const length = Math.hypot(dx, dy) || 1;
    const step = (MOVEMENT.speed * deltaMs) / 1000;
    this.shooter.x = Phaser.Math.Clamp(this.shooter.x + (dx / length) * step, WALK_BOUNDS.minX, WALK_BOUNDS.maxX);
    this.shooter.y = Phaser.Math.Clamp(this.shooter.y + (dy / length) * step, WALK_BOUNDS.minY, WALK_BOUNDS.maxY);
  }

  private updateHints(): void {
    const spot = this.currentSpot();
    const index = spot === null ? null : SHOT_SPOTS.findIndex((s) => s.id === spot.id);
    this.view.highlightSpot(index);

    if (spot === null) {
      const near = nearestSpot(this.shooter.x, this.shooter.y);
      this.hud.setHint(`Andá a una marca que falte (la de ${near.spot.points} está a ${near.distance.toFixed(1)} m)`);
      return;
    }
    if (!this.canShootHere(spot)) {
      this.hud.setHint(`La marca de ${spot.points} ya la tiraron en esta vuelta — faltan las otras`);
      return;
    }
    this.hud.setHint(`MARCA DE ${spot.points} — mantené ESPACIO y soltá en la franja`);
  }

  private togglePause(): void {
    if (this.phase === 'over') return;
    if (this.paused) this.closePause();
    else this.openPause();
  }

  private openPause(): void {
    this.paused = true;
    const background = panel(this, 0, 0, 560, 400);
    const title = heading(this, 0, -150, 'PAUSA');
    const resume = makeButton(this, 0, -60, 'SEGUIR JUGANDO', () => this.closePause(), { accent: true });
    const sound = makeButton(this, 0, 14, 'SONIDO ON/OFF', () => {
      soundBoard.unlock();
      soundBoard.toggleMuted();
    });
    const restart = makeButton(this, 0, 88, 'REINICIAR', () => {
      this.closePause();
      this.scene.restart(this.sceneData);
    });
    const quit = makeButton(this, 0, 162, 'VOLVER AL INICIO', () => {
      this.closePause();
      this.scene.start('Menu');
    });
    this.pauseButtons = [resume, sound, restart, quit];
    this.pauseOverlay = this.add
      .container(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, [
        background,
        title,
        ...this.pauseButtons.map((b) => b.container),
      ])
      .setDepth(DEPTHS.hud + 40);
  }

  private closePause(): void {
    this.paused = false;
    this.pauseOverlay?.destroy(true);
    this.pauseOverlay = null;
    this.pauseButtons = [];
  }

  override update(_time: number, delta: number): void {
    // Pause suspends the clock, the physics and gameplay input without losing state.
    if (this.paused) {
      this.view.update(0);
      return;
    }

    this.timer += delta;

    // The minute runs through walking, charging and flight alike.
    if (this.match !== null && this.phase !== 'turnBreak' && this.phase !== 'over') {
      this.match.tick(delta);
      this.hud.setClock(this.match.timeLeft);
    }

    switch (this.phase) {
      case 'positioning':
        this.updatePositioning(delta);
        break;
      case 'charging':
        this.updateCharging(delta);
        break;
      case 'flight':
        this.updateFlight(delta);
        break;
      case 'retrieving':
        this.updateRetrieving(delta);
        break;
      case 'turnBreak':
        this.breakFor -= delta;
        if (this.breakFor <= 0) {
          this.match?.startTurn();
          this.hud.setHint('');
          this.view.cheer(false);
          this.beginShotCycle(true);
        }
        break;
      default:
        break;
    }

    if (this.match !== null && this.match.timeUp && this.phase !== 'turnBreak' && this.phase !== 'over') {
      this.endTurn();
    }

    this.view.update(delta);
  }

  private updatePositioning(delta: number): void {
    this.movePlayer(delta);
    this.updateHints();
    const pose = this.walking ? CourtView.walkFrame(this.timer) : 'hold';
    this.view.setFriend(this.friendIndex, { x: this.shooter.x, y: this.shooter.y, pose });
    this.view.setBall(this.shooter.x - 0.32, this.shooter.y - 0.05, 1.05);
    if (this.walking && Math.floor(this.timer / 220) !== Math.floor((this.timer - delta) / 220)) soundBoard.step();
  }

  private updateCharging(delta: number): void {
    this.chargeElapsed += delta;
    const charge = this.chargeValue();
    this.hud.setCharge(charge);
    this.view.setFriend(this.friendIndex, { pose: charge > 0.45 ? 'wind' : 'hold' });
    this.view.setBall(this.shooter.x - 0.28, this.shooter.y - 0.05, 1.35 + charge * 0.35);
  }

  private updateFlight(delta: number): void {
    const simulation = this.simulation;
    if (simulation === null) return;
    for (const event of simulation.advance(delta / 1000)) {
      if (event.kind === 'rim') soundBoard.rim();
      if (event.kind === 'board') soundBoard.board();
      if (event.kind === 'ground') soundBoard.bounce();
      if (event.kind === 'resolved') this.resolve(event.outcome === 'made');
    }
    if (this.phase === 'flight') {
      const state = simulation.state;
      this.view.setBall(state.x, state.y, Math.max(BALL.radius, state.z));
    }
  }

  /**
   * The ball is on the grass. The shooter has to walk over and pick it up, and
   * the clock is running the whole time.
   */
  private updateRetrieving(delta: number): void {
    this.view.setBall(this.ballRest.x, this.ballRest.y, this.ballRest.z);
    this.view.highlightSpot(null);

    if (this.feedbackFor > 0) {
      this.feedbackFor -= delta;
      this.view.setFriend(this.friendIndex, { x: this.shooter.x, y: this.shooter.y });
      return;
    }

    this.view.cheer(false);
    this.movePlayer(delta);
    const pose = this.walking ? CourtView.walkFrame(this.timer) : 'idle0';
    this.view.setFriend(this.friendIndex, { x: this.shooter.x, y: this.shooter.y, pose });

    const distance = Math.hypot(this.shooter.x - this.ballRest.x, this.shooter.y - this.ballRest.y);
    this.hud.setHint(`Andá a buscar la pelota — ${distance.toFixed(1)} m (el reloj corre)`);

    if (distance <= PICKUP_RADIUS) {
      soundBoard.bounce();
      this.beginShotCycle(false);
    }
  }
}

/** Convenience for building a default pair setup from four names. */
export function teamsFromNames(names: readonly string[]): [TeamConfig, TeamConfig] {
  const safe = (i: number, fallback: string) => names[i] ?? fallback;
  return [
    { name: 'Pareja 1', members: [safe(0, 'Jugador 1'), safe(1, 'Jugador 2')] },
    { name: 'Pareja 2', members: [safe(2, 'Jugador 3'), safe(3, 'Jugador 4')] },
  ];
}
