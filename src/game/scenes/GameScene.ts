import Phaser from 'phaser';
import {
  ART_HEIGHT,
  ART_WIDTH,
  ART_X,
  ART_Y,
  BALL,
  HOOP,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  SHOT_SPOTS,
  WAITING_SPOTS,
  WALK_BOUNDS,
  type ShotSpot,
} from '../config/court';
import { MOVEMENT, SHOT } from '../config/gameplay';
import { Match, defaultMatchConfig, type TeamConfig } from '../domain/match';
import { CPU_DEFAULTS, CpuPlayer, type CpuView } from '../domain/cpu';
import { PracticeSession } from '../domain/practice';
import { nearestSpot, spotAt } from '../domain/spots';
import { ShotSimulation, createShotProfile, launchFromProfile, warmShotProfiles, type ShotProfile } from '../sim/ball';
import { soundBoard } from '../render/audio';
import { courtProjection } from '../render/context';
import { CHARGE_CYCLE } from '../render/characters';
import { CourtView, DEPTHS } from '../render/courtView';
import { PALETTE } from '../render/palette';
import { Hud } from '../render/hud';
import { CHARACTER_KEYS } from '../render/textures';
import {
  heading,
  makeButton,
  makeHoldButton,
  makeIconButton,
  overlayScrim,
  panel,
  type Button,
  type HoldButton,
} from '../render/ui';
import type { GameSceneData } from './MenuScene';

/**
 * positioning — the shooter has the ball and can walk to a mark.
 * charging    — the charge bar is sweeping.
 * flight      — the ball is in the air.
 * retrieving  — the ball is on the grass and has to be fetched. The clock runs:
 *               this is the "ir a buscarla rápido para no perder tiempo" part.
 * turnBreak   — the minute is over, waiting to hand the ball to the other pair.
 */
type Phase = 'turnIntro' | 'positioning' | 'charging' | 'flight' | 'retrieving' | 'turnBreak' | 'over';

/** How long the "your turn" card stays up before the minute starts. */
const INTRO_MS = 2200;

/** How close the shooter has to get to pick the ball up again, in metres. */
const PICKUP_RADIUS = 0.75;

/** A tap this close to a mark walks to the mark itself rather than beside it. */
const TAP_SNAP_RADIUS = 1.3;

/** How close is close enough when walking to a tapped point, in metres. */
const ARRIVAL_RADIUS = 0.06;

const NEWLINE = String.fromCharCode(10);

export class GameScene extends Phaser.Scene {
  private sceneData!: GameSceneData;
  private view!: CourtView;
  private hud!: Hud;

  private match: Match | null = null;
  private practice: PracticeSession | null = null;

  private phase: Phase = 'positioning';
  private shooter = { x: 5, y: 0 };
  private friendIndex = 0;
  /** Name of the friend holding the ball, fixed for the whole shot cycle. */
  private activeName = 'Vos';
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
  private introFor = 0;
  private introCard: Phaser.GameObjects.Container | null = null;
  /** How many full rounds of the seven marks free practice has cleared. */
  private practiceRounds = 0;

  /** Where a tap told the shooter to walk to, if anywhere. */
  private walkTarget: { x: number; y: number } | null = null;
  /** Which way the shooter faces: -1 left, 1 right. */
  private facing = -1;
  /** The pair played by the machine, and which pair the person is playing. */
  private cpu: CpuPlayer | null = null;
  private humanTeam: number | null = null;
  private shootButton: HoldButton | null = null;
  private pauseButton: Button | null = null;

  private paused = false;
  private pauseOverlay: Phaser.GameObjects.Container | null = null;
  private pauseButtons: Button[] = [];
  /**
   * Starts empty rather than undefined. `bindInput` returns early when there is
   * no keyboard plugin, and a non-null assertion here meant that on any device
   * without one the first frame would throw instead of simply being played with
   * a finger.
   */
  private keys: {
    up: Phaser.Input.Keyboard.Key[];
    down: Phaser.Input.Keyboard.Key[];
    left: Phaser.Input.Keyboard.Key[];
    right: Phaser.Input.Keyboard.Key[];
    shoot: Phaser.Input.Keyboard.Key | null;
  } = { up: [], down: [], left: [], right: [], shoot: null };

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
    this.walkTarget = null;
    this.shotId = 0;
    // Everything below used to survive into the next scene: going from a match
    // against the machine to free practice left `cpu` and `humanTeam` alive,
    // and RESTART kept the old countdown and locked points. Harmless today only
    // because every reader also checks `match`.
    this.cpu = null;
    this.humanTeam = null;
    this.match = null;
    this.practice = null;
    this.chargeElapsed = 0;
    this.lockedPoints = 0;
    this.feedbackFor = 0;
    this.breakFor = 0;
    this.introFor = 0;
    this.practiceRounds = 0;
    this.walking = false;
  }

  create(): void {
    this.view = new CourtView(this, courtProjection());
    this.hud = new Hud(this);
    // Solve the seven marks now. Each one costs tens of milliseconds of
    // simulation and is otherwise paid at the instant the button goes down.
    warmShotProfiles(SHOT_SPOTS);

    if (this.sceneData.mode === 'challenge') {
      const base = defaultMatchConfig(this.sceneData.teams);
      this.humanTeam = this.sceneData.humanTeam ?? null;
      this.match = new Match({
        ...base,
        turnMs: this.sceneData.turnMs ?? base.turnMs,
        tiebreakMs: this.sceneData.tiebreakMs ?? base.tiebreakMs,
        // Against the machine you shoot first. Picking the second pair used to
        // mean your first minute of CHUBOL was spent watching.
        startingTeam: this.humanTeam ?? 0,
      });
      this.practice = null;
      // A fresh seed per match: the settings stay fixed so the rival is always
      // the same calibre, but it must not play the identical turn every time.
      this.cpu =
        this.humanTeam === null
          ? null
          : new CpuPlayer({ ...CPU_DEFAULTS, seed: Math.floor(Math.random() * 0x7fffffff) });
      this.match.startTurn();
    } else {
      this.practice = new PracticeSession();
      this.match = null;
    }

    this.beginShotCycle(true);
    this.bindInput();
    this.buildTouchControls();
    if (this.match !== null) this.startTurnIntro();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  private teardown(): void {
    this.input.keyboard?.removeAllListeners();
    this.input.removeAllListeners();
    this.closePause();
    this.introCard?.destroy(true);
    this.introCard = null;
    this.shootButton?.destroy();
    this.shootButton = null;
    this.pauseButton?.destroy();
    this.pauseButton = null;
    this.hud.destroy();
    this.simulation = null;
  }

  /**
   * Touch controls. There are only seven places to shoot from, so this needs no
   * virtual joystick: you tap a mark to walk to it, hold the button to charge and
   * let go to shoot. The keyboard keeps working alongside it.
   */
  private buildTouchControls(): void {
    this.shootButton = makeHoldButton(
      this,
      Hud.RIGHT_COLUMN,
      800,
      180,
      'TIRAR',
      () => this.startCharge(),
      () => this.release(),
    );
    this.shootButton.container.setDepth(DEPTHS.hud + 5);

    // 116 logical is about 41 CSS pixels on the smallest phone this targets,
    // which is the floor for something a thumb has to hit.
    this.pauseButton = makeIconButton(this, Hud.RIGHT_COLUMN, 74, 116, 'II', () => this.togglePause());
    this.pauseButton.container.setDepth(DEPTHS.hud + 5);

    // A tap on the artwork itself walks. The buttons live in the margins, so
    // they can never be confused with a tap on the court.
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      soundBoard.unlock();
      this.onTapCourt(pointer.x, pointer.y);
    });
  }

  /**
   * Lets the machine play its pair. It issues the same commands a person does —
   * walk, hold, let go — so it has no advantage: same speed, same clock, same
   * rule that every mark must be shot before any is repeated.
   */
  private updateCpu(deltaMs: number): void {
    const cpu = this.cpu;
    const match = this.match;
    if (cpu === null || match === null) return;

    const owed = SHOT_SPOTS.filter((spot) => match.canShootFrom(spot.id));
    const spot = this.currentSpot();
    const view: CpuView = {
      phase: this.phase,
      shooterX: this.shooter.x,
      shooterY: this.shooter.y,
      ballX: this.ballRest.x,
      ballY: this.ballRest.y,
      owed,
      onMark: spot !== null && this.canShootHere(spot) ? spot : null,
      charge: this.chargeValue(),
      window: this.profile?.window ?? null,
    };

    const command = cpu.decide(view, deltaMs);
    switch (command.kind) {
      case 'walk':
        this.walkTarget = { x: command.x, y: command.y };
        break;
      case 'press':
        this.startCharge('machine');
        break;
      case 'release':
        this.release('machine');
        break;
      default:
        break;
    }
  }

  /** Sends the shooter walking to a tapped point on the court. */
  private onTapCourt(screenX: number, screenY: number): void {
    if (this.paused) return;
    // While the machine plays, the court does not answer to a finger.
    if (this.cpuIsPlaying()) return;
    if (this.phase !== 'positioning' && this.phase !== 'retrieving') return;

    const artX = screenX - ART_X;
    const artY = screenY - ART_Y;
    if (artX < 0 || artY < 0 || artX > ART_WIDTH || artY > ART_HEIGHT) return;

    const world = courtProjection().groundFromScreen(artX, artY);
    if (world === null) return;

    // While fetching, a tap anywhere near the ball means "go and get it".
    if (this.phase === 'retrieving' && Math.hypot(world.x - this.ballRest.x, world.y - this.ballRest.y) < 1.6) {
      this.walkTarget = { x: this.ballRest.x, y: this.ballRest.y };
      return;
    }

    // Otherwise, a tap near a mark walks onto the mark, not next to it.
    const near = nearestSpot(world.x, world.y);
    this.walkTarget =
      near.distance <= TAP_SNAP_RADIUS
        ? { x: near.spot.x, y: near.spot.y }
        : {
            x: Phaser.Math.Clamp(world.x, WALK_BOUNDS.minX, WALK_BOUNDS.maxX),
            y: Phaser.Math.Clamp(world.y, WALK_BOUNDS.minY, WALK_BOUNDS.maxY),
          };
  }

  /** Keeps the shoot button showing whether a shot is available right now. */
  private refreshShootButton(): void {
    const button = this.shootButton;
    if (button === null) return;
    if (this.cpuIsPlaying()) {
      button.setEnabled(false);
      button.setLabel(['JUEGA LA', 'MÁQUINA'].join(NEWLINE));
      return;
    }
    if (this.phase === 'charging') {
      button.setEnabled(true);
      button.setLabel('SOLTÁ');
      return;
    }
    if (this.phase !== 'positioning') {
      button.setEnabled(false);
      if (this.phase === 'retrieving') button.setLabel(['BUSCÁ LA', 'PELOTA'].join(NEWLINE));
      else if (this.phase === 'turnIntro') button.setLabel(['YA', 'EMPIEZA'].join(NEWLINE));
      else if (this.phase === 'turnBreak' || this.phase === 'over') button.setLabel(['NO ES', 'TU TURNO'].join(NEWLINE));
      else button.setLabel('TIRAR');
      return;
    }
    const spot = this.currentSpot();
    const ready = spot !== null && this.canShootHere(spot);
    button.setEnabled(ready);
    button.setLabel(ready ? ['TIRAR', String(spot!.points)].join('\n') : ['ANDÁ A', 'UNA MARCA'].join('\n'));
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
    this.keys.shoot?.on('down', () => {
      if (!this.cpuIsPlaying()) this.startCharge();
    });
    this.keys.shoot?.on('up', () => {
      if (!this.cpuIsPlaying()) this.release();
    });
  }

  /** True while the pair currently playing is the one the machine plays. */
  private cpuIsPlaying(): boolean {
    return this.cpu !== null && this.match !== null && this.match.currentTeamIndex !== this.humanTeam;
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
    this.walkTarget = null;
    this.hud.hideBar();

    this.friendIndex = this.activeFriendIndex();
    this.activeName = this.match !== null ? this.match.currentMemberName : 'Vos';
    if (firstOfTurn) {
      const start = SHOT_SPOTS[0]!;
      this.shooter.x = start.x;
      this.shooter.y = start.y;
    }
    this.placeWaitingFriends();
    this.view.setFriend(this.friendIndex, {
      x: this.shooter.x,
      y: this.shooter.y,
      pose: 'hold',
      visible: true,
      facing: this.facing,
    });
    this.view.setActiveFriend(this.friendIndex, this.shooterName());
    // The sprite has to be laid out before the ball can be hung off its hand,
    // and nothing else moves during the "your turn" card.
    this.view.update(0);
    this.view.setBallInHand(this.friendIndex);
    this.cpu?.reset();
    this.refreshHud();
  }

  /**
   * Who has the ball right now, for the caret and the interface.
   *
   * Deliberately not read live off the match: the moment a shot resolves the
   * match hands the ball to the other one of the pair, but on court it is still
   * the one who shot who runs after the ball. Reading it live made the caret over
   * the player and the name in the interface disagree for the whole retrieval.
   * It is fixed for the length of a shot cycle, alongside `friendIndex`.
   */
  private shooterName(): string {
    return this.activeName;
  }

  private refreshHud(): void {
    const match = this.match;
    if (match !== null) {
      const machine = this.cpuIsPlaying();
      const tiebreak = match.round > 0 ? `DESEMPATE ${match.round}${NEWLINE}` : '';
      // Against the machine the useful word is who is playing; between two
      // people it is which pair, because both of them are "you".
      const status =
        this.humanTeam === null
          ? `${tiebreak}JUEGAN${NEWLINE}${match.currentTeam.name.toUpperCase()}`
          : `${tiebreak}${machine ? 'JUEGA LA MÁQUINA' : 'TIRÁS VOS'}`;
      this.hud.setTurn(this.activeName, status, machine ? 'machine' : 'you');
      this.hud.setScore(
        match.config.teams.map((team, index) => ({
          name: team.name.toUpperCase(),
          score: match.scoreOf(index),
          yours: index === this.humanTeam,
        })),
      );
      this.hud.setClock(match.timeLeft);
      this.hud.setLapMarks(match.lapDone, 'FALTAN');
    } else if (this.practice !== null) {
      this.hud.setTurn('PRÁCTICA', `${this.practice.makes} DE ${this.practice.attempts.length}`, 'neutral');
      this.hud.setScore([
        { name: 'PUNTOS', score: this.practice.total, yours: true },
        { name: 'MARCAS', score: this.practice.spotsCleared.size, yours: false },
      ]);
      this.hud.setClock(null);
      this.hud.setLapMarks(this.practice.spotsCleared, 'HECHAS');
    }
  }

  private currentSpot(): ShotSpot | null {
    return spotAt(this.shooter.x, this.shooter.y);
  }

  private canShootHere(spot: ShotSpot): boolean {
    if (this.match === null) return true;
    return this.match.canShootFrom(spot.id);
  }

  /**
   * @param by who is asking. The machine drives the game through exactly the
   * same two calls a person does, so the check that keeps a person from shooting
   * on top of the machine's minute has to know which of the two is calling —
   * otherwise it locks the machine out of its own turn.
   */
  private startCharge(by: 'human' | 'machine' = 'human'): void {
    if (this.paused || this.phase !== 'positioning') return;
    // The button is disabled during the machine's minute, but a finger already
    // resting on it when the turn changes hands would otherwise get through.
    if (by === 'human' && this.cpuIsPlaying()) return;
    const spot = this.currentSpot();
    if (spot === null || !this.canShootHere(spot)) return;
    const profile = createShotProfile(this.shooter.x, this.shooter.y, spot.points);
    if (profile === null) {
      // Only reachable standing on the ring's exact axis, where no arc exists.
      // Saying it is cheap; a button that does nothing is not.
      this.hud.setHint('DESDE ACÁ NO SALE — CORRETE UN PASO');
      return;
    }

    this.profile = profile;
    this.lockedSpot = spot;
    this.chargeElapsed = 0;
    this.phase = 'charging';
    this.hud.showBar(profile.window.low, profile.window.high, `MARCA DE ${spot.points}`);
    this.view.setFriend(this.friendIndex, { pose: 'wind' });
  }

  private chargeValue(): number {
    const period = SHOT.chargeHalfPeriodMs * 2;
    const t = this.chargeElapsed % period;
    return t < SHOT.chargeHalfPeriodMs ? t / SHOT.chargeHalfPeriodMs : 2 - t / SHOT.chargeHalfPeriodMs;
  }

  /**
   * Drops a charge in progress without shooting. Pausing mid-charge used to eat
   * the release — the phase stayed 'charging' and the bar went on sweeping by
   * itself after unpausing, with the button already let go.
   */
  private cancelCharge(): void {
    if (this.phase !== 'charging') return;
    this.phase = 'positioning';
    this.profile = null;
    this.lockedSpot = null;
    this.chargeElapsed = 0;
    this.hud.hideBar();
    this.view.setFriend(this.friendIndex, { pose: 'hold' });
  }

  private release(by: 'human' | 'machine' = 'human'): void {
    if (this.paused || this.phase !== 'charging') return;
    if (by === 'human' && this.cpuIsPlaying()) return;
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
    this.view.setTrail(true);
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
    this.view.setTrail(false);

    // Free practice had no ending at all: you could make all seven and nothing
    // happened. Now it says so, and then lets you go round again.
    if (this.practice !== null && this.practice.clearedAll) {
      this.practiceRounds += 1;
      this.practice.reset();
      soundBoard.fanfare();
      this.flashBanner(['LAS SIETE MARCAS', this.practiceRounds === 1 ? 'OTRA VUELTA' : `VUELTA ${this.practiceRounds + 1}`]);
    }

    // A made shot resolves the instant the ball crosses the ring, two metres up.
    // Cutting straight to the grass threw the ball across the screen in one
    // frame, at the exact moment the shot is supposed to feel good.
    if (made && state !== undefined) {
      this.view.shakeHoop(1);
      this.view.dropBallTo(state.x, state.y, state.z, this.ballRest.x, this.ballRest.y, () => {
        // Nothing to do: updateRetrieving takes the ball back from here.
      });
    }
    this.refreshHud();
  }

  /**
   * Announces whose minute is about to start, and holds the clock while it does.
   *
   * Before this the minute simply began: the pairs changed over in silence and
   * the first thing you knew about your turn was that you had already lost two
   * seconds of it.
   */
  private startTurnIntro(): void {
    const match = this.match;
    if (match === null) {
      this.phase = 'positioning';
      return;
    }
    const machine = this.cpuIsPlaying();
    const lines = [
      match.round > 0 ? `DESEMPATE ${match.round}` : '',
      match.currentTeam.name.toUpperCase(),
      machine ? 'JUEGA LA MÁQUINA' : this.humanTeam === null ? 'PASENSÉ EL APARATO' : 'TE TOCA',
    ].filter((line) => line !== '');

    const background = panel(this, 0, 0, 900, 300);
    const title = heading(this, 0, -48, lines.slice(0, -1).join(' · '), 40);
    const who = heading(this, 0, 34, lines[lines.length - 1]!, 52);
    who.setColor(machine ? PALETTE.hudBad : PALETTE.hudGood);
    this.introCard = this.add
      .container(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 - 90, [background, title, who])
      .setDepth(DEPTHS.hud + 30);

    this.introFor = INTRO_MS;
    this.phase = 'turnIntro';
    this.hud.setHint('');
    this.refreshHud();
  }

  /** A card in the middle of the screen that says something and gets out of the way. */
  private flashBanner(lines: readonly string[]): void {
    const background = panel(this, 0, 0, 760, 200);
    const title = heading(this, 0, -32, lines[0] ?? '', 44);
    const subtitle = heading(this, 0, 36, lines[1] ?? '', 34);
    subtitle.setColor(PALETTE.hudGood);
    const card = this.add
      .container(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 - 120, [background, title, subtitle])
      .setDepth(DEPTHS.hud + 30);
    this.tweens.add({
      targets: card,
      alpha: 0,
      delay: 1400,
      duration: 500,
      onComplete: () => card.destroy(true),
    });
  }

  private endTurnIntro(): void {
    this.introCard?.destroy(true);
    this.introCard = null;
    this.phase = 'positioning';
    soundBoard.bounce();
  }

  /** Ends the pair's minute and hands over, or finishes the match. */
  private endTurn(): void {
    const match = this.match;
    if (match === null) return;
    match.endTurn();

    if (match.finished) {
      this.phase = 'over';
      this.scene.start('Result', { result: match.result(), config: match.config, humanTeam: this.humanTeam });
      return;
    }
    const lost = this.phase === 'charging';
    this.cancelCharge();
    this.phase = 'turnBreak';
    this.breakFor = 1800;
    soundBoard.board();
    this.hud.setHint(
      lost ? 'SONÓ LA CHICHARRA CON EL TIRO CARGADO — NO CUENTA' : 'SE TERMINÓ EL MINUTO — CAMBIO DE PAREJA',
    );
  }

  /**
   * Moves the shooter. Two ways in, both always available: the keys steer
   * directly, and a tap on the court sets a point to walk to. Touching the keys
   * cancels a tapped destination, so the two never fight each other.
   */
  /**
   * Turns the shooter to face a direction, with a dead zone.
   *
   * Without one the friend spins on the spot every time they wobble across the
   * line, and the line that matters — the hoop's axis at x = 0.94 — runs right
   * between the 2-point mark and everything else.
   */
  private faceTowards(dx: number): void {
    if (Math.abs(dx) < 0.35) return;
    this.facing = dx > 0 ? 1 : -1;
  }

  private movePlayer(deltaMs: number): void {
    const step = (MOVEMENT.speed * deltaMs) / 1000;

    let dx = 0;
    let dy = 0;
    const down = (keys: Phaser.Input.Keyboard.Key[]) => keys.some((k) => k.isDown);
    if (down(this.keys.left)) dx -= 1;
    if (down(this.keys.right)) dx += 1;
    // Screen "up" moves away from the camera, towards the cypresses.
    if (down(this.keys.up)) dy += 1;
    if (down(this.keys.down)) dy -= 1;

    if ((dx !== 0 || dy !== 0) && !this.cpuIsPlaying()) {
      this.walkTarget = null;
      this.walking = true;
      this.faceTowards(dx);
      const length = Math.hypot(dx, dy);
      this.shooter.x = Phaser.Math.Clamp(this.shooter.x + (dx / length) * step, WALK_BOUNDS.minX, WALK_BOUNDS.maxX);
      this.shooter.y = Phaser.Math.Clamp(this.shooter.y + (dy / length) * step, WALK_BOUNDS.minY, WALK_BOUNDS.maxY);
      return;
    }

    const target = this.walkTarget;
    if (target === null) {
      this.walking = false;
      return;
    }

    const toX = target.x - this.shooter.x;
    const toY = target.y - this.shooter.y;
    const distance = Math.hypot(toX, toY);
    if (distance <= Math.max(ARRIVAL_RADIUS, step)) {
      this.shooter.x = target.x;
      this.shooter.y = target.y;
      this.walkTarget = null;
      this.walking = false;
      return;
    }
    this.walking = true;
    this.faceTowards(toX);
    this.shooter.x = Phaser.Math.Clamp(this.shooter.x + (toX / distance) * step, WALK_BOUNDS.minX, WALK_BOUNDS.maxX);
    this.shooter.y = Phaser.Math.Clamp(this.shooter.y + (toY / distance) * step, WALK_BOUNDS.minY, WALK_BOUNDS.maxY);
  }

  private updateHints(): void {
    if (this.cpuIsPlaying()) {
      this.view.highlightSpot(null);
      this.hud.setHint(`Juega ${this.match?.currentTeam.name ?? 'la otra pareja'} — mirá y esperá tu minuto`);
      return;
    }
    const spot = this.currentSpot();
    const index = spot === null ? null : SHOT_SPOTS.findIndex((s) => s.id === spot.id);
    this.view.highlightSpot(index, spot === null || this.canShootHere(spot));

    if (spot === null) {
      const near = nearestSpot(this.shooter.x, this.shooter.y);
      this.hud.setHint(`Tocá una marca para ir (la de ${near.spot.points} está a ${near.distance.toFixed(1)} m)`);
      return;
    }
    if (!this.canShootHere(spot)) {
      this.hud.setHint(`La marca de ${spot.points} ya la tiraron en esta vuelta — faltan las otras`);
      return;
    }
    this.hud.setHint(`MARCA DE ${spot.points} — mantené TIRAR y soltá en la franja verde`);
  }

  private togglePause(): void {
    if (this.phase === 'over') return;
    if (this.paused) this.closePause();
    else this.openPause();
  }

  private openPause(): void {
    this.paused = true;
    // A charge cannot survive a pause: the release that arrives while paused is
    // dropped, and the bar would go on sweeping by itself afterwards.
    this.cancelCharge();
    const background = panel(this, 0, 0, 620, 470);
    const title = heading(this, 0, -178, 'PAUSA', 44);
    // 96 apart and 76 tall: on the smallest phone that is 34 CSS pixels of gap
    // between REINICIAR and the button above it, which used to be 10.
    const item = { width: 470, height: 76, fontSize: 30 };
    const resume = makeButton(this, 0, -76, 'SEGUIR JUGANDO', () => this.closePause(), { ...item, accent: true });
    const sound = makeButton(this, 0, 20, 'SONIDO ON/OFF', () => {
      soundBoard.unlock();
      soundBoard.toggleMuted();
    }, item);
    const restart = makeButton(this, 0, 116, 'REINICIAR', () => {
      this.closePause();
      this.scene.restart(this.sceneData);
    }, item);
    const quit = makeButton(this, 0, 212, 'VOLVER AL INICIO', () => {
      this.closePause();
      this.scene.start('Menu');
    }, item);
    this.pauseButtons = [resume, sound, restart, quit];
    this.pauseOverlay = this.add
      .container(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, [
        // Dims the court and swallows taps, so the game behind the panel is
        // plainly stopped and cannot be poked through it.
        overlayScrim(this, LOGICAL_WIDTH, LOGICAL_HEIGHT),
        background,
        title,
        ...this.pauseButtons.map((b) => b.container),
      ])
      .setDepth(DEPTHS.hud + 40);
    this.shootButton?.setEnabled(false);
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
    if (this.match !== null && this.phase !== 'turnBreak' && this.phase !== 'turnIntro' && this.phase !== 'over') {
      this.match.tick(delta);
      this.hud.setClock(this.match.timeLeft);
    }

    if (this.cpuIsPlaying() && this.phase !== 'turnIntro') this.updateCpu(delta);

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
      case 'turnIntro':
        this.introFor -= delta;
        if (this.introFor <= 0) this.endTurnIntro();
        break;
      case 'turnBreak':
        this.breakFor -= delta;
        if (this.breakFor <= 0) {
          this.match?.startTurn();
          this.hud.setHint('');
          this.beginShotCycle(true);
          this.startTurnIntro();
        }
        break;
      default:
        break;
    }

    if (this.match !== null && this.match.timeUp && this.phase !== 'turnBreak' && this.phase !== 'over') {
      this.endTurn();
    }

    this.refreshShootButton();
    this.view.update(delta);
  }

  private updatePositioning(delta: number): void {
    this.movePlayer(delta);
    this.updateHints();
    // Standing still, they look at the hoop; walking, they look where they go.
    if (!this.walking) this.faceTowards(HOOP.groundX - this.shooter.x);
    const pose = this.walking ? CourtView.walkFrame(this.timer) : 'hold';
    this.view.setFriend(this.friendIndex, { x: this.shooter.x, y: this.shooter.y, pose, facing: this.facing });
    this.view.setBallInHand(this.friendIndex);
    if (this.walking && Math.floor(this.timer / 220) !== Math.floor((this.timer - delta) / 220)) {
      soundBoard.step();
      this.view.puff(this.shooter.x, this.shooter.y);
    }
  }

  private updateCharging(delta: number): void {
    this.chargeElapsed += delta;
    // You shoot at the hoop, so you look at it.
    this.faceTowards(HOOP.groundX - this.shooter.x);
    const charge = this.chargeValue();
    this.hud.setCharge(charge);
    // Four steps of winding up instead of two. The charge sweeps up and back
    // down about twice a second, so a single threshold made the body snap
    // between two frames four times a cycle.
    const step = Math.min(CHARGE_CYCLE.length - 1, Math.floor(charge * CHARGE_CYCLE.length));
    this.view.setFriend(this.friendIndex, { pose: CHARGE_CYCLE[step]!, facing: this.facing });
    this.view.setBallInHand(this.friendIndex);
  }

  private updateFlight(delta: number): void {
    const simulation = this.simulation;
    if (simulation === null) return;
    for (const event of simulation.advance(delta / 1000)) {
      if (event.kind === 'rim') {
        soundBoard.rim();
        this.view.shakeHoop(0.5);
      }
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

    // The celebration holds the pose, not the player. Freezing the shooter for
    // half a second after every shot ate about a tenth of the minute with the
    // clock running, which is a lot of a game whose whole rule is "go get it
    // fast so you do not lose time".
    const celebrating = this.feedbackFor > 0;
    if (celebrating) this.feedbackFor -= delta;

    this.movePlayer(delta);
    const pose = celebrating ? undefined : this.walking ? CourtView.walkFrame(this.timer) : 'idle0';
    this.view.setFriend(
      this.friendIndex,
      pose === undefined
        ? { x: this.shooter.x, y: this.shooter.y }
        : { x: this.shooter.x, y: this.shooter.y, pose },
    );

    const distance = Math.hypot(this.shooter.x - this.ballRest.x, this.shooter.y - this.ballRest.y);
    this.hud.setHint(`Tocá la pelota para ir a buscarla — ${distance.toFixed(1)} m (el reloj corre)`);

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
