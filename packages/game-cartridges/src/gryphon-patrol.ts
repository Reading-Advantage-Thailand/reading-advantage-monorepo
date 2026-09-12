import {
  gameResultsSchema,
  sentenceInputSchema,
  type GameResults,
} from "@reading-advantage/game-contracts";
import {
  createActorSpriteLayer,
  createBoundedFrameScheduler,
  createCompletionLatch,
  createInputActionNormalizer,
  createLanguageTargetProgression,
  createResultAccountant,
  finalizeResult,
  preloadAssetBindings,
  resolveAssetBinding,
  validateNonEmptyContent,
  type ActorSpriteLayer,
  type ActorSpriteLike,
  type APKInputController,
  type CartridgeGameConfigContext,
  type GameTerminalOutcome,
  type InputActionId,
  type RuntimeEdition,
} from "@reading-advantage/advantage-play-kit";
import type { StandardExperienceCartridge } from "@reading-advantage/advantage-play-kit/presentation";

import { createCartridgeStandardExperience } from "./standard-experience.js";
import {
  createFlightParallax,
  destroyFlightParallax,
  preloadFlightParallax,
  tickFlightParallax,
  type FlightParallaxLayers,
} from "./flight-parallax.js";

/** Stable public identifier for the Gryphon Patrol cartridge. */
export const GRYPHON_PATROL_ID = "gryphon-patrol" as const;

/** Fixed Phaser composition used before the host applies responsive scaling. */
export const GRYPHON_PATROL_CANVAS = Object.freeze({ width: 960, height: 540 });

/** Horizontal world and vertical flight bounds for Gryphon Patrol. */
export const GRYPHON_PATROL_WORLD = Object.freeze({ width: 2_000, height: 540 });

/** Keyboard codes accepted by the four-way flight and fire controls. */
export const GRYPHON_PATROL_KEYBOARD_BINDINGS: Readonly<Record<string, InputActionId>> = Object.freeze({
  ArrowLeft: "move-left",
  KeyA: "move-left",
  ArrowRight: "move-right",
  KeyD: "move-right",
  ArrowUp: "move-up",
  KeyW: "move-up",
  ArrowDown: "move-down",
  KeyS: "move-down",
  Space: "confirm",
  Enter: "confirm",
});

/** Semantic actions accepted by the shared Gryphon Patrol controller. */
export const GRYPHON_PATROL_AVAILABLE_ACTIONS: readonly InputActionId[] = Object.freeze([
  "move-left",
  "move-right",
  "move-up",
  "move-down",
  "confirm",
]);

/** Completion callback shape used by the Gryphon Patrol host adapter. */
export type GryphonPatrolCompletionDelivery = (
  result: GameResults,
  outcome: Exclude<GameTerminalOutcome, "complete">,
) => void | Promise<void>;

/** Active or terminal phase in one Gryphon Patrol session. */
export type GryphonPatrolPhase = "playing" | "victory" | "defeat";

/** Semantic intent resolved from a pointer or touch release. */
export type GryphonPatrolPointerIntent = "move" | "fire";

/** Four-way vector accepted by the transport-independent movement rules. */
export interface GryphonPatrolMovement {
  /** Horizontal movement direction. */
  readonly dx: number;
  /** Vertical movement direction. */
  readonly dy: number;
}

/** Player state exposed by a Gryphon Patrol snapshot. */
export interface GryphonPatrolPlayer {
  /** Horizontal position in the wrapped world. */
  readonly x: number;
  /** Vertical position in the bounded flight area. */
  readonly y: number;
  /** Current horizontal velocity marker used for fire direction. */
  readonly vx: number;
  /** Current vertical velocity marker. */
  readonly vy: number;
  /** Collision diameter. */
  readonly size: number;
  /** Current health points. */
  readonly hp: number;
  /** Maximum health points. */
  readonly maxHp: number;
  /** Remaining collision invulnerability in milliseconds. */
  readonly invulnerableMs: number;
  /** Compatibility alias for the remaining invulnerability timer. */
  readonly invulnerableTime: number;
}

/** One deterministic word enemy in the patrol world. */
export interface GryphonPatrolEnemy {
  /** Stable enemy identity. */
  readonly id: string;
  /** Horizontal position in the wrapped world. */
  readonly x: number;
  /** Vertical position in the bounded flight area. */
  readonly y: number;
  /** Horizontal world velocity. */
  readonly vx: number;
  /** Vertical world velocity. */
  readonly vy: number;
  /** Collision diameter. */
  readonly size: number;
  /** Word carried by the enemy. */
  readonly word: string;
  /** Target identity when this enemy carries an ordered word. */
  readonly targetId?: string;
  /** Whether the enemy is the current ordered target. */
  readonly isTarget: boolean;
  /** Whether the enemy can still be hit. */
  readonly isActive: boolean;
}

/** One word orb dropped by a correct enemy. */
export interface GryphonPatrolOrb {
  /** Stable orb identity. */
  readonly id: string;
  /** Horizontal position in the wrapped world. */
  readonly x: number;
  /** Vertical position in the bounded flight area. */
  readonly y: number;
  /** Collision diameter. */
  readonly size: number;
  /** Word shown on the orb. */
  readonly word: string;
  /** Ordered target identity represented by the orb. */
  readonly targetId: string;
  /** Whether the player can still collect the orb. */
  readonly isActive: boolean;
}

/** One projectile fired by the gryphon. */
export interface GryphonPatrolProjectile {
  /** Stable projectile identity. */
  readonly id: string;
  /** Horizontal position in the wrapped world. */
  readonly x: number;
  /** Vertical position in the flight area. */
  readonly y: number;
  /** Horizontal velocity in world units per second. */
  readonly vx: number;
  /** Vertical velocity in world units per second. */
  readonly vy: number;
  /** Collision diameter. */
  readonly size: number;
  /** Projectile age in milliseconds. */
  readonly ageMs: number;
  /** Whether the projectile remains active. */
  readonly isActive: boolean;
}

/** Immutable state exposed by the Gryphon Patrol controller. */
export interface GryphonPatrolSnapshot {
  /** Deterministic host seed used for enemy, orb, and hazard placement. */
  readonly seed: number;
  /** Current gameplay phase. */
  readonly phase: GryphonPatrolPhase;
  /** Compatibility status for the legacy game surface. */
  readonly status: "playing" | "won" | "lost";
  /** Player state. */
  readonly player: GryphonPatrolPlayer;
  /** Deterministic enemies in stable order. */
  readonly enemies: readonly GryphonPatrolEnemy[];
  /** Dropped word orbs. */
  readonly orbs: readonly GryphonPatrolOrb[];
  /** Active fired projectiles. */
  readonly projectiles: readonly GryphonPatrolProjectile[];
  /** Current camera origin in the wrapped world. */
  readonly cameraX: number;
  /** Flattened source words used by the finite patrol. */
  readonly sentence: readonly string[];
  /** Current sentence translation prompt. */
  readonly prompt: string;
  /** Current ordered answer word. */
  readonly answer: string;
  /** Current ordered word. */
  readonly nextWord: string;
  /** Index of the word that needs an orb. */
  readonly targetIndex: number;
  /** Total number of ordered sentence words. */
  readonly targetCount: number;
  /** Semantic action that fires at the current target. */
  readonly correctAction: InputActionId;
  /** Semantic actions accepted by the shared controller. */
  readonly availableActions: readonly InputActionId[];
  /** Words collected in order. */
  readonly collectedWords: readonly string[];
  /** Number of correct enemy hits. */
  readonly correctAnswers: number;
  /** Number of enemy shots that reached an enemy. */
  readonly totalAttempts: number;
  /** Number of removed incorrect enemies. */
  readonly wrongAnswers: number;
  /** Current accuracy from accepted enemy shots. */
  readonly accuracy: number;
  /** Current score. */
  readonly score: number;
  /** Remaining health represented by the shared lives field. */
  readonly lives: number;
  /** Energy reserved for shared controller compatibility. */
  readonly energy: number;
  /** Display XP represented by collected ordered words. */
  readonly xp: number;
  /** First terminal result, when the session has ended. */
  readonly result?: GameResults;
  /** Next projectile sequence number. */
  readonly projectileSequence: number;
  /** Most recent enemy-hit outcome. */
  readonly lastOutcome?: "correct" | "incorrect";
  /** Whether the controller has been sealed. */
  readonly destroyed: boolean;
}

/** Result returned by one Gryphon Patrol action. */
export interface GryphonPatrolActionResult {
  /** Whether the requested action changed the session. */
  readonly accepted: boolean;
  /** Whether the requested enemy or orb matched the current word. */
  readonly correct: boolean;
  /** Whether ordered word progress advanced. */
  readonly progressed: boolean;
  /** Whether the action reached a terminal phase. */
  readonly terminal: boolean;
  /** Compatibility alias for terminal. */
  readonly completed: boolean;
  /** Result emitted by the action when it reaches a terminal phase. */
  readonly result?: GameResults;
  /** State after the action. */
  readonly snapshot: GryphonPatrolSnapshot;
}

/** Result returned when the gryphon fires a projectile. */
export interface GryphonPatrolFireResult {
  /** Whether the fire action was accepted. */
  readonly accepted: boolean;
  /** Created projectile identity when the action was accepted. */
  readonly projectileId?: string;
  /** State after firing. */
  readonly snapshot: GryphonPatrolSnapshot;
}

/** Transport-independent Gryphon Patrol rules and lifecycle controls. */
export interface GryphonPatrolController {
  /** Returns an immutable gameplay snapshot. */
  snapshot(sceneWidth?: number): GryphonPatrolSnapshot;
  /** Applies one shared semantic action. */
  choose(action: InputActionId): GryphonPatrolActionResult;
  /** Moves the gryphon by one semantic step or a bounded vector. */
  move(action: InputActionId | GryphonPatrolMovement): GryphonPatrolSnapshot;
  /** Places the gryphon at a world coordinate. */
  moveTo(x: number, y: number): GryphonPatrolSnapshot;
  /** Fires one projectile in the current facing direction. */
  fire(): GryphonPatrolFireResult;
  /** Alias for fire used by gameplay adapters. */
  shoot(): GryphonPatrolFireResult;
  /** Resolves one projectile collision against an enemy. */
  hitEnemy(enemyId: string): GryphonPatrolActionResult;
  /** Collects one active word orb. */
  collectOrb(orbId: string): GryphonPatrolActionResult;
  /** Advances projectiles, hazards, invulnerability, and orb contact. */
  tick(deltaMs: number): GryphonPatrolSnapshot;
  /** Applies one discrete enemy hazard event. */
  applyHazard(): GryphonPatrolActionResult;
  /** Captures state for responsive recomposition. */
  capture(): GryphonPatrolSnapshot;
  /** Restores validated state captured before responsive recomposition. */
  restore(snapshot: GryphonPatrolSnapshot): void;
  /** Seals the session and prevents later mutation or result delivery. */
  destroy(): void;
}

interface GryphonPatrolTarget {
  readonly id: string;
  readonly word: string;
  readonly prompt: string;
  readonly sentenceIndex: number;
  readonly wordIndex: number;
}

interface MutableEnemy extends GryphonPatrolEnemy {
  isTarget: boolean;
  isActive: boolean;
}

interface MutableOrb extends GryphonPatrolOrb {
  isActive: boolean;
}

interface MutableProjectile extends GryphonPatrolProjectile {
  isActive: boolean;
}

interface MutablePlayer extends GryphonPatrolPlayer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  invulnerableMs: number;
  invulnerableTime: number;
}

interface PhaserGraphicsLike {
  clear(): this;
  fillStyle(color: number, alpha?: number): this;
  fillRect(x: number, y: number, width: number, height: number): this;
  fillCircle(x: number, y: number, radius: number): this;
  fillRoundedRect(x: number, y: number, width: number, height: number, radius?: number): this;
  lineStyle(lineWidth: number, color: number, alpha?: number): this;
  strokeRoundedRect(x: number, y: number, width: number, height: number, radius?: number): this;
  destroy(): void;
}

interface PhaserTextLike {
  setPosition(x: number, y: number): this;
  setText(value: string): this;
  destroy(): void;
}

interface PhaserCanvasLike {
  getBoundingClientRect?(): {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
  };
}

interface PhaserSceneLike {
  add?: {
    graphics(): PhaserGraphicsLike;
    text(x: number, y: number, value: string, style?: Readonly<Record<string, unknown>>): PhaserTextLike;
    image?(x: number, y: number, key: string, frame?: number): ActorSpriteLike & PhaserImageLike;
    sprite?(x: number, y: number, key: string, frame?: number): ActorSpriteLike & PhaserImageLike;
    tileSprite?(x: number, y: number, width: number, height: number, key: string): ActorSpriteLike & PhaserImageLike;
  };
  load?: {
    image?(key: string, url: string): unknown;
    spritesheet?(key: string, url: string, config: { frameWidth: number; frameHeight: number }): unknown;
    audio?(key: string, urls: string | string[]): unknown;
  };
  events?: { once(event: string, listener: () => void): void };
  game?: { readonly canvas?: PhaserCanvasLike };
  scale?: { readonly width?: number; readonly height?: number };
}

interface PhaserImageLike {
  setOrigin?(x: number, y: number): this;
  setDisplaySize?(width: number, height: number): this;
  setDepth?(depth: number): this;
  setPosition?(x: number, y: number): this;
  setAlpha?(alpha: number): this;
  setTilePosition?(x: number, y: number): this;
  tilePositionY?: number;
  destroy(): void;
}

interface SceneResources {
  readonly art: ActorSpriteLayer;
  readonly graphics: PhaserGraphicsLike;
  readonly title: PhaserTextLike;
  readonly prompt: PhaserTextLike;
  readonly progress: PhaserTextLike;
  readonly feedback: PhaserTextLike;
  readonly instructions: PhaserTextLike;
  readonly enemies: readonly PhaserTextLike[];
  readonly orbs: readonly PhaserTextLike[];
  ground?: PhaserImageLike;
  groundWidth: number;
  groundHeight: number;
}

interface GryphonPatrolSceneContext {
  readonly edition: RuntimeEdition;
  readonly controller: GryphonPatrolController;
  readonly inputController: APKInputController;
  readonly composition: CartridgeGameConfigContext["composition"];
  readonly sessionMode: NonNullable<CartridgeGameConfigContext["sessionMode"]>;
  readonly diagnostic: CartridgeGameConfigContext["diagnostic"];
  readonly enemyCount: number;
  readonly targetCount: number;
}

const PLAYER_SIZE = 40;
const ENEMY_SIZE = 32;
const ORB_SIZE = 24;
const PROJECTILE_SIZE = 8;
const PLAYER_STEP = 42;
const PROJECTILE_SPEED = 500;
const PROJECTILE_LIFETIME_MS = 1_800;
const INVULNERABILITY_MS = 1_000;
const MAX_GAMEPLAY_DELTA_MS = 50;
const FIRE_ZONE_RATIO = 0.78;
const DEFAULT_ENEMY_COUNT = 10;
const ENEMY_HORIZONTAL_SPEED = 48;
const ENEMY_VERTICAL_SPEED = 24;
const MAX_PLAYER_HP = 3;

function wrapWorldX(value: number): number {
  return ((value % GRYPHON_PATROL_WORLD.width) + GRYPHON_PATROL_WORLD.width) % GRYPHON_PATROL_WORLD.width;
}

function clampWorldY(value: number): number {
  return Math.max(0, Math.min(GRYPHON_PATROL_WORLD.height, value));
}

function bounceWorldY(value: number, velocity: number, seconds: number): { y: number; vy: number } {
  if (velocity === 0) return { y: clampWorldY(value), vy: 0 };
  const height = GRYPHON_PATROL_WORLD.height;
  const cycle = height * 2;
  const speed = Math.abs(velocity);
  const startPhase = velocity > 0 ? value : cycle - value;
  const phase = ((startPhase + speed * seconds) % cycle + cycle) % cycle;
  return phase < height
    ? { y: phase, vy: speed }
    : { y: cycle - phase, vy: -speed };
}

function horizontalDistance(left: number, right: number): number {
  const direct = Math.abs(left - right);
  return Math.min(direct, GRYPHON_PATROL_WORLD.width - direct);
}

function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) throw new Error("Gryphon Patrol seed must be finite");
  return Math.trunc(seed) >>> 0;
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function boundedRandom(rng: () => number): number {
  const value = rng();
  return Number.isFinite(value) ? Math.max(0, Math.min(0.999_999, value)) : 0.5;
}

function collides(
  left: Readonly<{ x: number; y: number; size: number }>,
  right: Readonly<{ x: number; y: number; size: number }>,
): boolean {
  return Math.hypot(horizontalDistance(left.x, right.x), left.y - right.y)
    <= (left.size + right.size) / 2;
}

function projectileHitsEnemy(
  projectile: MutableProjectile,
  moved: MutableProjectile,
  enemy: MutableEnemy,
  seconds: number,
): boolean {
  if (collides(moved, enemy) || collides(projectile, enemy)) return true;
  for (let step = 1; step < 4; step += 1) {
    const fraction = step / 4;
    if (collides({
      x: wrapWorldX(projectile.x + projectile.vx * seconds * fraction),
      y: projectile.y + projectile.vy * seconds * fraction,
      size: projectile.size,
    }, enemy)) return true;
  }
  return false;
}

function enemyHitsPlayer(
  enemy: MutableEnemy,
  moved: MutableEnemy,
  player: MutablePlayer,
  seconds: number,
): boolean {
  if (collides(enemy, player) || collides(moved, player)) return true;
  for (let step = 1; step < 4; step += 1) {
    const fraction = step / 4;
    const position = bounceWorldY(enemy.y, enemy.vy, seconds * fraction);
    if (collides({
      x: wrapWorldX(enemy.x + enemy.vx * seconds * fraction),
      y: position.y,
      size: enemy.size,
    }, player)) return true;
  }
  return false;
}

function freezeEnemy(enemy: MutableEnemy): GryphonPatrolEnemy {
  return Object.freeze({ ...enemy });
}

function freezeOrb(orb: MutableOrb): GryphonPatrolOrb {
  return Object.freeze({ ...orb });
}

function freezeProjectile(projectile: MutableProjectile): GryphonPatrolProjectile {
  return Object.freeze({ ...projectile });
}

function buildTargets(input: unknown): readonly GryphonPatrolTarget[] {
  const parsed = sentenceInputSchema.parse(input);
  const content = validateNonEmptyContent(parsed, "sentence");
  const targets = content.items.flatMap((item, sentenceIndex) =>
    item.term.trim().split(/\s+/u).filter(Boolean).map((word, wordIndex) => ({
      id: `word:${sentenceIndex}:${wordIndex}`,
      word,
      prompt: item.translation,
      sentenceIndex,
      wordIndex,
    })),
  );
  if (targets.length === 0) throw new Error("Gryphon Patrol requires at least one sentence word");
  return Object.freeze(targets.map((target) => Object.freeze(target)));
}

function deterministicPosition(rng: () => number): { x: number; y: number } {
  return {
    x: 420 + boundedRandom(rng) * (GRYPHON_PATROL_WORLD.width - 560),
    y: 70 + boundedRandom(rng) * 400,
  };
}

function deterministicVelocity(rng: () => number): { vx: number; vy: number } {
  return {
    vx: (boundedRandom(rng) < 0.5 ? -1 : 1)
      * (ENEMY_HORIZONTAL_SPEED + Math.floor(boundedRandom(rng) * 3) * 8),
    vy: (boundedRandom(rng) < 0.5 ? -1 : 1)
      * (ENEMY_VERTICAL_SPEED + Math.floor(boundedRandom(rng) * 2) * 6),
  };
}

function buildEnemies(targets: readonly GryphonPatrolTarget[], rng: () => number): MutableEnemy[] {
  const targetEnemies = targets.map((target, index) => {
    const position = deterministicPosition(rng);
    const velocity = deterministicVelocity(rng);
    return {
      id: `enemy:${target.id}`,
      x: position.x,
      y: position.y,
      ...velocity,
      size: ENEMY_SIZE,
      word: target.word,
      targetId: target.id,
      isTarget: index === 0,
      isActive: true,
    } satisfies MutableEnemy;
  });
  const decoys = Array.from({ length: Math.max(2, DEFAULT_ENEMY_COUNT - targets.length) }, (_, index) => {
    const position = deterministicPosition(rng);
    const velocity = deterministicVelocity(rng);
    const sourceWord = targets[(index + 1) % targets.length]!.word;
    return {
      id: `enemy:decoy:${index}`,
      x: position.x,
      y: position.y,
      ...velocity,
      size: ENEMY_SIZE,
      word: sourceWord,
      isTarget: false,
      isActive: true,
    } satisfies MutableEnemy;
  });
  return [...targetEnemies, ...decoys];
}

function actionResult(
  snapshot: GryphonPatrolSnapshot,
  values: Omit<GryphonPatrolActionResult, "snapshot">,
): GryphonPatrolActionResult {
  return Object.freeze({ ...values, snapshot });
}

function dimensions(scene: PhaserSceneLike): { width: number; height: number } {
  return {
    width: scene.scale?.width ?? GRYPHON_PATROL_CANVAS.width,
    height: scene.scale?.height ?? GRYPHON_PATROL_CANVAS.height,
  };
}

function cameraOriginForSceneWidth(playerX: number, sceneWidth: number): number {
  if (!Number.isFinite(sceneWidth) || sceneWidth <= 0) {
    throw new Error("Gryphon Patrol scene width must be positive and finite");
  }
  return wrapWorldX(playerX - sceneWidth / 2);
}

function pointerInScene(
  scene: PhaserSceneLike,
  clientX: number,
  clientY: number,
  width: number,
  height: number,
): { x: number; y: number } {
  const rect = scene.game?.canvas?.getBoundingClientRect?.();
  if (!rect || rect.width <= 0 || rect.height <= 0) return { x: clientX, y: clientY };
  return {
    x: (clientX - rect.left) * width / rect.width,
    y: (clientY - rect.top) * height / rect.height,
  };
}

/**
 * Resolves a pointer or touch release into movement or the visible fire button.
 * @param pointerX Scene-space horizontal release coordinate.
 * @param pointerY Scene-space vertical release coordinate.
 * @param sceneWidth Current scene width.
 * @param sceneHeight Current scene height.
 * @returns The semantic pointer intent for the release.
 */
export function chooseGryphonPatrolPointerIntent(
  pointerX: number,
  pointerY: number,
  sceneWidth: number,
  sceneHeight: number,
): GryphonPatrolPointerIntent {
  return pointerX >= sceneWidth * FIRE_ZONE_RATIO && pointerY >= sceneHeight * FIRE_ZONE_RATIO
    ? "fire"
    : "move";
}

/**
 * Creates transport-independent Gryphon Patrol rules for one sentence array.
 * @param input Untrusted sentence content supplied by a host or test.
 * @param deliver Callback that receives the first terminal result.
 * @param seed Deterministic host seed for moving actor placement.
 * @returns A controller for deterministic aerial word collection.
 * @throws When sentence content is invalid, blank, or empty.
 */
export function createGryphonPatrolController(
  input: unknown,
  deliver: GryphonPatrolCompletionDelivery,
  seed = 0,
): GryphonPatrolController {
  const targets = buildTargets(input);
  const normalizedSeed = normalizeSeed(seed);
  const progression = createLanguageTargetProgression(targets.map((target) => target.id));
  let accountant = createResultAccountant();
  let terminalOutcome: Exclude<GameTerminalOutcome, "complete"> = "victory";
  let terminalResultValue: GameResults | undefined;
  const completion = createCompletionLatch<GameResults>((result) => deliver(result, terminalOutcome));
  let phase: GryphonPatrolPhase = "playing";
  let player: MutablePlayer = {
    x: 180,
    y: GRYPHON_PATROL_WORLD.height / 2,
    vx: 1,
    vy: 0,
    size: PLAYER_SIZE,
    hp: MAX_PLAYER_HP,
    maxHp: MAX_PLAYER_HP,
    invulnerableMs: 0,
    invulnerableTime: 0,
  };
  let enemies = buildEnemies(targets, seededRandom(normalizedSeed));
  const enemyBlueprints = new Map(enemies.map((enemy) => [enemy.id, {
    word: enemy.word,
    targetId: enemy.targetId,
    size: enemy.size,
    x: enemy.x,
    y: enemy.y,
    vx: enemy.vx,
    vy: enemy.vy,
  }]));
  let orbs: MutableOrb[] = [];
  let projectiles: MutableProjectile[] = [];
  let projectileSequence = 0;
  let collectedWords: string[] = [];
  let wrongAnswers = 0;
  let lastOutcome: "correct" | "incorrect" | undefined;
  let destroyed = false;

  const status = (): "playing" | "won" | "lost" => phase === "victory" ? "won" : phase === "defeat" ? "lost" : "playing";
  const currentTarget = (): GryphonPatrolTarget => targets[Math.min(progression.currentIndex, targets.length - 1)]!;
  const refreshTargetFlags = (): void => {
    const targetId = progression.currentTarget;
    enemies = enemies.map((enemy) => {
      const blueprint = enemyBlueprints.get(enemy.id);
      const revived = blueprint && !enemy.isActive && enemy.targetId === targetId
        ? { ...enemy, ...blueprint, isActive: true }
        : enemy;
      return { ...revived, isTarget: revived.isActive && revived.targetId === targetId };
    });
  };
  const snapshot = (sceneWidth = GRYPHON_PATROL_CANVAS.width): GryphonPatrolSnapshot => {
    const target = currentTarget();
    const counters = accountant.snapshot();
    return Object.freeze({
      seed: normalizedSeed,
      phase,
      status: status(),
      player: Object.freeze({ ...player }),
      enemies: Object.freeze(enemies.map(freezeEnemy)),
      orbs: Object.freeze(orbs.map(freezeOrb)),
      projectiles: Object.freeze(projectiles.map(freezeProjectile)),
      cameraX: cameraOriginForSceneWidth(player.x, sceneWidth),
      sentence: Object.freeze(targets.map((target) => target.word)),
      prompt: target.prompt,
      answer: target.word,
      nextWord: target.word,
      targetIndex: progression.currentIndex,
      targetCount: targets.length,
      correctAction: "confirm",
      availableActions: GRYPHON_PATROL_AVAILABLE_ACTIONS,
      collectedWords: Object.freeze([...collectedWords]),
      correctAnswers: counters.correctAnswers,
      totalAttempts: counters.totalAttempts,
      wrongAnswers,
      accuracy: counters.accuracy,
      score: counters.score,
      lives: player.hp,
      energy: 0,
      xp: collectedWords.length,
      ...(terminalResultValue === undefined ? {} : { result: terminalResultValue }),
      projectileSequence,
      ...(lastOutcome === undefined ? {} : { lastOutcome }),
      destroyed,
    });
  };
  const resultForCounters = (): GameResults => gameResultsSchema.parse(
    finalizeResult(accountant, { xpPerCorrect: 20, xpPerAccuracyPoint: 10 }),
  );
  const terminalResult = (nextPhase: Exclude<GryphonPatrolPhase, "playing">): GameResults => {
    phase = nextPhase;
    terminalOutcome = nextPhase;
    const result = resultForCounters();
    terminalResultValue = result;
    completion.complete(result);
    return result;
  };
  const inactiveResult = (before: GryphonPatrolSnapshot): GryphonPatrolActionResult => actionResult(before, {
    accepted: false,
    correct: false,
    progressed: false,
    terminal: false,
    completed: false,
  });
  const damagePlayer = (): GameResults | undefined => {
    if (player.invulnerableMs > 0 || phase !== "playing") return undefined;
    player = {
      ...player,
      hp: Math.max(0, player.hp - 1),
      invulnerableMs: INVULNERABILITY_MS,
      invulnerableTime: INVULNERABILITY_MS,
    };
    if (player.hp === 0) return terminalResult("defeat");
    return undefined;
  };
  const collectOrbInternal = (orbId: string): GryphonPatrolActionResult => {
    const before = snapshot();
    if (destroyed || phase !== "playing") return inactiveResult(before);
    const orb = orbs.find((candidate) => candidate.id === orbId && candidate.isActive);
    if (!orb) return inactiveResult(before);
    const target = currentTarget();
    if (orb.targetId !== target.id) return inactiveResult(before);

    orbs = orbs.map((candidate) => candidate.id === orb.id ? { ...candidate, isActive: false } : candidate);
    const match = progression.match(orb.targetId);
    if (!match.matched) return inactiveResult(before);
    accountant.addScore(100);
    collectedWords = [...collectedWords, orb.word];
    refreshTargetFlags();
    const completed = progression.isComplete;
    if (completed) {
      const result = terminalResult("victory");
      return actionResult(snapshot(), {
        accepted: true,
        correct: true,
        progressed: true,
        terminal: true,
        completed: true,
        result,
      });
    }
    return actionResult(snapshot(), {
      accepted: true,
      correct: true,
      progressed: true,
      terminal: false,
      completed: false,
    });
  };
  const hitEnemyInternal = (enemyId: string): GryphonPatrolActionResult => {
    const before = snapshot();
    if (destroyed || phase !== "playing") return inactiveResult(before);
    const enemy = enemies.find((candidate) => candidate.id === enemyId && candidate.isActive);
    if (!enemy) return inactiveResult(before);
    const target = currentTarget();
    const correct = enemy.targetId === target.id;
    enemies = enemies.map((candidate) => candidate.id === enemy.id
      ? { ...candidate, isActive: false, isTarget: false }
      : candidate);
    accountant.recordAttempt({ correct });
    lastOutcome = correct ? "correct" : "incorrect";
    if (!correct) {
      wrongAnswers += 1;
      return actionResult(snapshot(), {
        accepted: true,
        correct: false,
        progressed: false,
        terminal: false,
        completed: false,
      });
    }

    orbs = [...orbs, {
      id: `orb:${target.id}`,
      x: enemy.x,
      y: enemy.y,
      size: ORB_SIZE,
      word: target.word,
      targetId: target.id,
      isActive: true,
    }];
    return actionResult(snapshot(), {
      accepted: true,
      correct: true,
      progressed: false,
      terminal: false,
      completed: false,
    });
  };

  const controller: GryphonPatrolController = {
    snapshot,
    choose(action: InputActionId): GryphonPatrolActionResult {
      const before = snapshot();
      if (action === "confirm") {
        const fired = controller.fire();
        if (!fired.accepted) return inactiveResult(before);
        return actionResult(fired.snapshot, {
          accepted: true,
          correct: false,
          progressed: false,
          terminal: false,
          completed: false,
        });
      }
      if (action === "move-left" || action === "move-right" || action === "move-up" || action === "move-down") {
        const after = controller.move(action);
        return actionResult(after, {
          accepted: true,
          correct: false,
          progressed: false,
          terminal: false,
          completed: false,
        });
      }
      return inactiveResult(before);
    },
    move(input: InputActionId | GryphonPatrolMovement): GryphonPatrolSnapshot {
      if (destroyed || phase !== "playing") return snapshot();
      const vector = typeof input === "string"
        ? input === "move-left" ? { dx: -1, dy: 0 }
          : input === "move-right" ? { dx: 1, dy: 0 }
            : input === "move-up" ? { dx: 0, dy: -1 }
              : input === "move-down" ? { dx: 0, dy: 1 }
                : { dx: 0, dy: 0 }
        : input;
      if (!Number.isFinite(vector.dx) || !Number.isFinite(vector.dy)) {
        throw new Error("Gryphon Patrol movement requires finite vectors");
      }
      const dx = Math.max(-1, Math.min(1, vector.dx));
      const dy = Math.max(-1, Math.min(1, vector.dy));
      if (dx === 0 && dy === 0) return snapshot();
      player = {
        ...player,
        x: wrapWorldX(player.x + dx * PLAYER_STEP),
        y: clampWorldY(player.y + dy * PLAYER_STEP),
        vx: dx === 0 ? player.vx : dx,
        vy: dy,
      };
      return snapshot();
    },
    moveTo(x: number, y: number): GryphonPatrolSnapshot {
      if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error("Gryphon Patrol position requires finite values");
      if (destroyed || phase !== "playing") return snapshot();
      player = { ...player, x: wrapWorldX(x), y: clampWorldY(y) };
      return snapshot();
    },
    fire(): GryphonPatrolFireResult {
      const before = snapshot();
      if (destroyed || phase !== "playing") return Object.freeze({ accepted: false, snapshot: before });
      const direction = player.vx < 0 ? -1 : 1;
      const projectile: MutableProjectile = {
        id: `projectile:${projectileSequence++}`,
        x: wrapWorldX(player.x + direction * (player.size / 2 + PROJECTILE_SIZE)),
        y: player.y,
        vx: direction * PROJECTILE_SPEED,
        vy: 0,
        size: PROJECTILE_SIZE,
        ageMs: 0,
        isActive: true,
      };
      projectiles = [...projectiles, projectile];
      return Object.freeze({ accepted: true, projectileId: projectile.id, snapshot: snapshot() });
    },
    shoot(): GryphonPatrolFireResult {
      return this.fire();
    },
    hitEnemy(enemyId: string): GryphonPatrolActionResult {
      return hitEnemyInternal(enemyId);
    },
    collectOrb(orbId: string): GryphonPatrolActionResult {
      return collectOrbInternal(orbId);
    },
    tick(deltaMs: number): GryphonPatrolSnapshot {
      if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new Error("Gryphon Patrol delta must be a nonnegative finite number");
      if (destroyed || phase !== "playing") return snapshot();
      const boundedDeltaMs = Math.min(deltaMs, MAX_GAMEPLAY_DELTA_MS);
      const seconds = boundedDeltaMs / 1_000;
      player = {
        ...player,
        invulnerableMs: Math.max(0, player.invulnerableMs - boundedDeltaMs),
        invulnerableTime: Math.max(0, player.invulnerableTime - boundedDeltaMs),
      };
      const previousEnemies = enemies;
      enemies = enemies.map((enemy) => {
        if (!enemy.isActive) return enemy;
        const vertical = bounceWorldY(enemy.y, enemy.vy, seconds);
        return {
          ...enemy,
          x: wrapWorldX(enemy.x + enemy.vx * seconds),
          y: vertical.y,
          vy: vertical.vy,
        };
      });

      const nextProjectiles: MutableProjectile[] = [];
      for (const projectile of projectiles) {
        if (!projectile.isActive) continue;
        const moved: MutableProjectile = {
          ...projectile,
          x: wrapWorldX(projectile.x + projectile.vx * seconds),
          y: clampWorldY(projectile.y + projectile.vy * seconds),
          ageMs: projectile.ageMs + boundedDeltaMs,
        };
        const hit = enemies.find((enemy) => enemy.isActive && projectileHitsEnemy(projectile, moved, enemy, seconds));
        if (hit) {
          hitEnemyInternal(hit.id);
          continue;
        }
        if (moved.ageMs < PROJECTILE_LIFETIME_MS) nextProjectiles.push(moved);
      }
      projectiles = nextProjectiles;

      if (phase !== "playing") return snapshot();
      const hazard = enemies.find((enemy) => {
        if (!enemy.isActive) return false;
        const previous = previousEnemies.find((candidate) => candidate.id === enemy.id);
        return previous !== undefined && enemyHitsPlayer(previous, enemy, player, seconds);
      });
      if (hazard) damagePlayer();
      if (phase !== "playing") return snapshot();
      const collectible = orbs.find((orb) => orb.isActive && collides(player, orb));
      if (collectible) collectOrbInternal(collectible.id);
      return snapshot();
    },
    applyHazard(): GryphonPatrolActionResult {
      const before = snapshot();
      if (destroyed || phase !== "playing") return inactiveResult(before);
      player = { ...player, invulnerableMs: 0, invulnerableTime: 0 };
      const result = damagePlayer();
      if (result) {
        return actionResult(snapshot(), {
          accepted: true,
          correct: false,
          progressed: false,
          terminal: true,
          completed: true,
          result,
        });
      }
      return actionResult(snapshot(), {
        accepted: true,
        correct: false,
        progressed: false,
        terminal: false,
        completed: false,
      });
    },
    capture: snapshot,
    restore(state: GryphonPatrolSnapshot): void {
      if (destroyed) return;
      if (!state || typeof state !== "object") throw new Error("Gryphon Patrol responsive state must be an object");
      const expectedTarget = targets[Math.min(state.targetIndex, targets.length - 1)]!;
      const expectedStatus = state.phase === "victory" ? "won" : state.phase === "defeat" ? "lost" : "playing";
      if (state.seed !== normalizedSeed) throw new Error("Gryphon Patrol responsive state seed is inconsistent");
      if (state.phase !== "playing" && state.phase !== "victory" && state.phase !== "defeat") {
        throw new Error("Gryphon Patrol responsive state phase is invalid");
      }
      if (state.status !== expectedStatus) throw new Error("Gryphon Patrol responsive state status is inconsistent");
      if (!Number.isInteger(state.targetCount) || state.targetCount !== targets.length
        || state.sentence.length !== targets.length
        || state.sentence.some((word, index) => word !== targets[index]!.word)) {
        throw new Error("Gryphon Patrol responsive state target content is inconsistent");
      }
      if (!Number.isInteger(state.targetIndex) || state.targetIndex < 0 || state.targetIndex > targets.length) {
        throw new Error("Gryphon Patrol responsive state target index is invalid");
      }
      if (state.prompt !== expectedTarget.prompt || state.answer !== expectedTarget.word || state.nextWord !== expectedTarget.word) {
        throw new Error("Gryphon Patrol responsive state target is inconsistent");
      }
      if (state.correctAction !== "confirm"
        || state.availableActions.length !== GRYPHON_PATROL_AVAILABLE_ACTIONS.length
        || state.availableActions.some((action, index) => action !== GRYPHON_PATROL_AVAILABLE_ACTIONS[index])) {
        throw new Error("Gryphon Patrol responsive state actions are inconsistent");
      }
      if (!Array.isArray(state.collectedWords) || state.collectedWords.length !== state.targetIndex
        || state.collectedWords.some((word, index) => word !== targets[index]!.word)) {
        throw new Error("Gryphon Patrol responsive state collected words are inconsistent");
      }
      if (!Number.isInteger(state.totalAttempts) || state.totalAttempts < 0
        || !Number.isInteger(state.correctAnswers) || state.correctAnswers < 0
        || state.correctAnswers > state.totalAttempts
        || !Number.isInteger(state.wrongAnswers) || state.wrongAnswers < 0
        || state.totalAttempts !== state.correctAnswers + state.wrongAnswers
        || !Number.isInteger(state.score) || state.score < 0
        || !Number.isFinite(state.accuracy) || state.accuracy < 0 || state.accuracy > 1
        || state.accuracy !== (state.totalAttempts === 0 ? 0 : state.correctAnswers / state.totalAttempts)
        || state.xp !== state.collectedWords.length
        || state.lives !== state.player.hp
        || state.energy !== 0) {
        throw new Error("Gryphon Patrol responsive state counters are inconsistent");
      }
      if (!Number.isFinite(state.player.x) || state.player.x < 0 || state.player.x >= GRYPHON_PATROL_WORLD.width
        || !Number.isFinite(state.player.y) || state.player.y < 0 || state.player.y > GRYPHON_PATROL_WORLD.height
        || !Number.isFinite(state.player.vx) || !Number.isFinite(state.player.vy)
        || state.player.size !== PLAYER_SIZE || state.player.maxHp !== MAX_PLAYER_HP
        || !Number.isInteger(state.player.hp) || state.player.hp < 0 || state.player.hp > MAX_PLAYER_HP
        || !Number.isFinite(state.player.invulnerableMs) || state.player.invulnerableMs < 0
        || state.player.invulnerableMs > INVULNERABILITY_MS
        || state.player.invulnerableTime !== state.player.invulnerableMs) {
        throw new Error("Gryphon Patrol responsive state actor is inconsistent");
      }
      if (state.phase === "playing" && (state.targetIndex === targets.length || state.player.hp === 0)) {
        throw new Error("Gryphon Patrol responsive state has an invalid active terminal");
      }
      if (state.phase === "victory" && state.targetIndex !== targets.length) {
        throw new Error("Gryphon Patrol victory state has unfinished words");
      }
      if (state.phase === "defeat" && state.player.hp !== 0) {
        throw new Error("Gryphon Patrol defeat state must have zero health");
      }
      if (!Array.isArray(state.enemies) || state.enemies.length !== enemyBlueprints.size) {
        throw new Error("Gryphon Patrol responsive state enemies are inconsistent");
      }
      const seenEnemyIds = new Set<string>();
      for (const enemy of state.enemies) {
        const blueprint = enemyBlueprints.get(enemy.id);
        if (!blueprint || seenEnemyIds.has(enemy.id) || enemy.word !== blueprint.word
          || enemy.targetId !== blueprint.targetId || enemy.size !== blueprint.size
          || typeof enemy.isActive !== "boolean" || typeof enemy.isTarget !== "boolean"
          || !Number.isFinite(enemy.x) || enemy.x < 0 || enemy.x >= GRYPHON_PATROL_WORLD.width
          || !Number.isFinite(enemy.y) || enemy.y < 0 || enemy.y > GRYPHON_PATROL_WORLD.height
          || !Number.isFinite(enemy.vx) || !Number.isFinite(enemy.vy)) {
          throw new Error("Gryphon Patrol responsive state enemy actor is inconsistent");
        }
        seenEnemyIds.add(enemy.id);
        const expectedTarget = enemy.isActive && enemy.targetId === targets[state.targetIndex]?.id;
        if (enemy.isTarget !== expectedTarget) throw new Error("Gryphon Patrol responsive state target actor is inconsistent");
      }
      const activeTargetOrbId = state.targetIndex < targets.length ? `orb:${targets[state.targetIndex]!.id}` : undefined;
      const activeOrbs = state.orbs.filter((orb) => orb.isActive);
      if (!Array.isArray(state.orbs) || state.orbs.length !== state.correctAnswers || activeOrbs.length > 1) {
        throw new Error("Gryphon Patrol responsive state orb actors are inconsistent");
      }
      const seenOrbIds = new Set<string>();
      for (const orb of state.orbs) {
        const target = targets.find((candidate) => candidate.id === orb.targetId);
        if (!target || seenOrbIds.has(orb.id) || orb.id !== `orb:${target.id}` || orb.word !== target.word
          || typeof orb.isActive !== "boolean" || !Number.isFinite(orb.x) || orb.x < 0
          || orb.x >= GRYPHON_PATROL_WORLD.width || !Number.isFinite(orb.y) || orb.y < 0
          || orb.y > GRYPHON_PATROL_WORLD.height || orb.size !== ORB_SIZE
          || orb.isActive !== (orb.id === activeTargetOrbId)) {
          throw new Error("Gryphon Patrol responsive state orb actor is inconsistent");
        }
        seenOrbIds.add(orb.id);
      }
      const pendingOrb = activeOrbs.length === 1;
      if (state.correctAnswers !== state.targetIndex + (pendingOrb ? 1 : 0)
        || state.correctAnswers !== state.enemies.filter((enemy) => enemy.targetId !== undefined && !enemy.isActive).length
        || state.score !== (state.correctAnswers - (pendingOrb ? 1 : 0)) * 100) {
        throw new Error("Gryphon Patrol responsive state progress actors and counters disagree");
      }
      if (!Number.isInteger(state.projectileSequence) || state.projectileSequence < 0
        || !Array.isArray(state.projectiles)) {
        throw new Error("Gryphon Patrol responsive state projectile sequence is invalid");
      }
      const seenProjectileIds = new Set<string>();
      for (const projectile of state.projectiles) {
        const sequence = /^projectile:(\d+)$/u.exec(projectile.id)?.[1];
        if (sequence === undefined || seenProjectileIds.has(projectile.id) || !projectile.isActive
          || Number(sequence) >= state.projectileSequence || !Number.isFinite(projectile.x)
          || projectile.x < 0 || projectile.x >= GRYPHON_PATROL_WORLD.width || !Number.isFinite(projectile.y)
          || projectile.y < 0 || projectile.y > GRYPHON_PATROL_WORLD.height || projectile.size !== PROJECTILE_SIZE
          || !Number.isFinite(projectile.vx) || !Number.isFinite(projectile.vy)
          || !Number.isFinite(projectile.ageMs) || projectile.ageMs < 0 || projectile.ageMs >= PROJECTILE_LIFETIME_MS) {
          throw new Error("Gryphon Patrol responsive state projectile actor is inconsistent");
        }
        seenProjectileIds.add(projectile.id);
      }
      if (state.lastOutcome !== undefined && state.lastOutcome !== "correct" && state.lastOutcome !== "incorrect") {
        throw new Error("Gryphon Patrol responsive state outcome is invalid");
      }
      if (state.totalAttempts === 0 && state.lastOutcome !== undefined) {
        throw new Error("Gryphon Patrol responsive state outcome has no attempt");
      }
      if (typeof state.destroyed !== "boolean") throw new Error("Gryphon Patrol responsive state destroyed flag is invalid");
      const expectedTerminalResult = gameResultsSchema.parse((() => {
        const restoredAccountant = createResultAccountant();
        for (let index = 0; index < state.totalAttempts; index += 1) {
          restoredAccountant.recordAttempt({ correct: index < state.correctAnswers });
        }
        restoredAccountant.addScore(state.score);
        return finalizeResult(restoredAccountant, { xpPerCorrect: 20, xpPerAccuracyPoint: 10 });
      })());
      if (state.phase === "playing" && state.result !== undefined) {
        throw new Error("Gryphon Patrol active state has a terminal result");
      }
      if (state.phase !== "playing" && JSON.stringify(state.result) !== JSON.stringify(expectedTerminalResult)) {
        throw new Error("Gryphon Patrol terminal result is inconsistent");
      }
      progression.reset();
      for (const target of targets.slice(0, state.targetIndex)) progression.match(target.id);
      accountant = createResultAccountant();
      for (let index = 0; index < state.totalAttempts; index += 1) {
        accountant.recordAttempt({ correct: index < state.correctAnswers });
      }
      accountant.addScore(state.score);
      phase = state.phase;
      terminalResultValue = state.result;
      player = { ...state.player };
      enemies = state.enemies.map((enemy) => ({ ...enemy }));
      orbs = state.orbs.map((orb) => ({ ...orb }));
      projectiles = state.projectiles.map((projectile) => ({ ...projectile }));
      projectileSequence = state.projectileSequence;
      collectedWords = [...state.collectedWords];
      wrongAnswers = state.wrongAnswers;
      lastOutcome = state.lastOutcome;
      destroyed = state.destroyed;
      if (phase !== "playing" || destroyed) completion.sealWithoutDelivery();
    },
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      completion.sealWithoutDelivery();
    },
  };

  refreshTargetFlags();
  return Object.freeze(controller);
}

function fileForBinding(
  edition: RuntimeEdition,
  key: string,
): { readonly width: number; readonly height: number; readonly grid?: { readonly frameWidth: number; readonly frameHeight: number } } | undefined {
  const binding = (edition as unknown as { bindings?: Record<string, { file: string }> })?.bindings?.[key];
  if (!binding) return undefined;
  return ((edition as unknown as { pack?: { files?: Record<string, { readonly width: number; readonly height: number; readonly grid?: { readonly frameWidth: number; readonly frameHeight: number } }> } })?.pack?.files as Record<string, { readonly width: number; readonly height: number; readonly grid?: { readonly frameWidth: number; readonly frameHeight: number } }> | undefined)?.[binding.file];
}

function destroyGround(resources: SceneResources): void {
  resources.ground?.destroy();
  resources.ground = undefined;
  resources.groundWidth = 0;
  resources.groundHeight = 0;
}

function ensureGround(
  scene: PhaserSceneLike,
  resources: SceneResources,
  edition: RuntimeEdition,
  width: number,
  height: number,
): void {
  if (resources.groundWidth === width && resources.groundHeight === height && resources.ground) return;
  destroyGround(resources);
  resources.groundWidth = width;
  resources.groundHeight = height;
  const binding = (edition as unknown as { bindings?: Record<string, unknown> })?.bindings?.["world:ground"];
  if (!binding) return;
  const resolved = resolveAssetBinding(edition, "world:ground");
  if (scene.add?.tileSprite) {
    const tiled = scene.add.tileSprite(0, 0, width, height, resolved.textureKey);
    tiled.setOrigin?.(0, 0);
    tiled.setDepth?.(-35);
    resources.ground = tiled as unknown as PhaserImageLike;
  } else {
    const file = fileForBinding(edition, "world:ground");
    const displayW = width;
    const displayH = file ? displayW * (file.height / file.width) : height;
    const image = scene.add?.image?.(width / 2, height / 2, resolved.textureKey);
    image?.setOrigin?.(0.5, 0.5);
    if (file) (image as unknown as PhaserImageLike)?.setDisplaySize?.(displayW, displayH);
    image?.setDepth?.(-35);
    if (image) resources.ground = image as unknown as PhaserImageLike;
  }
}

function createScene(context: GryphonPatrolSceneContext): Readonly<Record<string, unknown>> {
  let resources: SceneResources | undefined;
  let composition = context.composition;
  let sceneWidth: number = GRYPHON_PATROL_CANVAS.width;
  let previousKeys = new Set<string>();
  let cleaned = false;
  let animationMs = 0;
  let parallax: FlightParallaxLayers = { sprites: [], scrollY: 0 };
  const normalize = createInputActionNormalizer({
    keyboard: GRYPHON_PATROL_KEYBOARD_BINDINGS,
    pointerTap: { action: "confirm" },
  });
  const frameScheduler = createBoundedFrameScheduler((deltaMs) => {
    animationMs = (animationMs + deltaMs) % 2_000;
  });
  const updateView = (scene: PhaserSceneLike): void => {
    if (!resources || !scene.add) return;
    const { width, height } = dimensions(scene);
    sceneWidth = width;
    const state = context.controller.snapshot(sceneWidth);
    const activeResources = resources;
    const worldToScreen = (worldX: number): number => {
      let relative = worldX - state.cameraX;
      while (relative < 0) relative += GRYPHON_PATROL_WORLD.width;
      while (relative > width) relative -= GRYPHON_PATROL_WORLD.width;
      return relative;
    };
    const pulse = Math.sin(animationMs / 2_000 * Math.PI * 2) * 3;
    activeResources.graphics.clear();
    // Contiguous tiled ground at depth -35 behind parallax; no dark tint hiding it.
    ensureGround(scene as unknown as Parameters<typeof ensureGround>[0], activeResources, context.edition, width, height);
    if (parallax.sprites.length === 0) {
      try {
        const next = createFlightParallax(scene as unknown as Parameters<typeof createFlightParallax>[0], context.edition, width, height);
        if (next.sprites.length > 0) parallax = next;
      } catch {
        // Tests use empty edition without parallax bindings.
      }
    }
    if (parallax.sprites.length === 0) {
      activeResources.graphics.fillStyle(0x6eb6e8, 0.9).fillRect(0, 0, width, height);
    }
    // Light sky ornament, not a full-screen opaque overlay.
    activeResources.graphics.fillStyle(0x8cd0f0, 0.35).fillCircle(width * 0.12, height * 0.18, 42);
    activeResources.graphics.fillStyle(0xa8ddf5, 0.28).fillCircle(width * 0.82, height * 0.22, 56);
    for (const projectile of state.projectiles) {
      activeResources.graphics.fillStyle(0xffe08a, 1).fillCircle(worldToScreen(projectile.x), projectile.y, 5);
    }
    state.enemies.forEach((enemy, enemyIndex) => {
      if (!enemy.isActive) return;
      const enemyX = worldToScreen(enemy.x);
      // Aspect-correct enemy: file 288x336 frame 48x48 square, displayH = displayW * 1, width 41.6 preserves mount without stretch.
      // Enemy-bat visible bbox 266x305 within 288x336 — width chosen by visible bbox.
      if (activeResources.art.place(`enemy:${enemyIndex}`, "enemy:idle", {
        x: enemyX,
        y: enemy.y,
        width: enemy.size * 1.3,
        depth: 7,
      })) return;
      activeResources.graphics.fillStyle(enemy.isTarget ? 0x6cf0a7 : 0xec6876, 0.95).fillCircle(enemyX, enemy.y, enemy.size / 2);
      activeResources.graphics.lineStyle(2, enemy.isTarget ? 0xfff3a6 : 0x531b39, 0.9)
        .strokeRoundedRect(enemyX - enemy.size / 2, enemy.y - enemy.size / 2, enemy.size, enemy.size, 8);
    });
    for (const orb of state.orbs) {
      if (!orb.isActive) continue;
      const orbX = worldToScreen(orb.x);
      activeResources.graphics.fillStyle(0xffffff, 0.88 + pulse / 30).fillCircle(orbX, orb.y, orb.size / 2);
    }
    const playerX = worldToScreen(state.player.x);
    // Aspect-correct player: dragon-rider-idle 96x96 visible 96x69, displayW 56 (size 40*1.4) height 56 via square file preserves without stretch.
    if (!activeResources.art.place("player", "player:idle", {
      x: playerX,
      y: state.player.y,
      width: state.player.size * 1.4,
      depth: 8,
      alpha: state.player.invulnerableMs > 0 ? 0.45 : 1,
    })) {
      activeResources.graphics.fillStyle(0xf1c40f, state.player.invulnerableMs > 0 ? 0.45 : 1)
        .fillCircle(playerX, state.player.y, state.player.size / 2);
      activeResources.graphics.fillStyle(0xfff5bc, 1).fillCircle(playerX + 14, state.player.y - 9, 7);
    }
    activeResources.art.sweep();
    activeResources.graphics.fillStyle(0xffcc66, 0.95).fillRoundedRect(width - 150, height - 82, 120, 54, 14);
    activeResources.graphics.lineStyle(2, 0xffffff, 0.8).strokeRoundedRect(width - 150, height - 82, 120, 54, 14);

    for (const [index, enemy] of state.enemies.entries()) {
      const label = activeResources.enemies[index];
      if (!label) continue;
      label.setText(enemy.isActive ? enemy.word : "").setPosition(worldToScreen(enemy.x) - 34, enemy.y - enemy.size - 22);
    }
    for (const [index, orb] of state.orbs.entries()) {
      const label = activeResources.orbs[index];
      if (!label) continue;
      label.setText(orb.isActive ? orb.word : "").setPosition(worldToScreen(orb.x) - 34, orb.y + 17);
    }
    activeResources.title.setText("GRYPHON PATROL").setPosition(24, 18);
    activeResources.prompt.setText(`Collect the next word: ${state.prompt}`).setPosition(24, 58);
    activeResources.progress.setText(
      `${composition?.profile === "compact" ? "Compact sky" : "Wide sky"}  •  Word ${Math.min(state.targetIndex + 1, state.targetCount)} of ${state.targetCount}  •  HP ${state.player.hp}`,
    ).setPosition(24, 94);
    activeResources.feedback.setText(
      state.phase === "victory"
        ? "Patrol complete!"
        : state.phase === "defeat"
          ? "The gryphon has fallen."
          : state.lastOutcome === "incorrect"
            ? "Wrong enemy cleared. Find the marked target."
            : "Shoot the marked enemy, then fly into its word orb.",
    ).setPosition(24, height - 64);
    activeResources.instructions.setText("WASD / arrows fly  •  Space fires  •  Tap sky to move  •  Tap FIRE to shoot")
      .setPosition(24, height - 34);
  };
  const processInput = (scene: PhaserSceneLike): void => {
    if (context.sessionMode !== "playing") return;
    const input = context.inputController.snapshot();
    const pressed = input.pressed ?? input.keys.filter((key) => !previousKeys.has(key));
    previousKeys = new Set(input.keys);
    const movement = new Set<InputActionId>();
    for (const code of input.keys) {
      const action = normalize({ modality: "keyboard", code })[0]?.action;
      if (action && action !== "confirm") movement.add(action);
    }
    for (const code of pressed) {
      const action = normalize({ modality: "keyboard", code })[0]?.action;
       if (action === "confirm") context.controller.choose(action);
       if (action && action !== "confirm") movement.add(action);
     }
    for (const action of movement) context.controller.choose(action);
    if (input.pointer.released && !input.pointer.cancelled) {
      const { width, height } = dimensions(scene);
      sceneWidth = width;
       const pointer = pointerInScene(scene, input.pointer.x, input.pointer.y, width, height);
       if (chooseGryphonPatrolPointerIntent(pointer.x, pointer.y, width, height) === "fire") {
         context.controller.choose("confirm");
       } else {
         const state = context.controller.snapshot(sceneWidth);
         context.controller.moveTo(state.cameraX + pointer.x, pointer.y);
       }
     }
   };
  const cleanup = (): void => {
    if (cleaned) return;
    cleaned = true;
    frameScheduler.cancel();
    context.controller.destroy();
    destroyFlightParallax(parallax);
    destroyGround(resources as unknown as SceneResources);
    previousKeys = new Set<string>();
    const activeResources = resources;
    resources = undefined;
    if (!activeResources) return;
    activeResources.graphics.destroy();
    activeResources.title.destroy();
    activeResources.prompt.destroy();
    activeResources.progress.destroy();
    activeResources.feedback.destroy();
    activeResources.instructions.destroy();
    for (const label of activeResources.enemies) label.destroy();
    for (const label of activeResources.orbs) label.destroy();
  };

  const artKeys = [
    "world:ground",
    "player:idle",
    "enemy:idle",
    "world:parallax-far",
    "world:parallax-mid",
    "world:parallax-near",
    "prop:gate",
  ] as const;

  const preload = function (this: PhaserSceneLike): void {
    if (!this.load) return;
    try { preloadFlightParallax(this as unknown as Parameters<typeof preloadFlightParallax>[0], context.edition); } catch { /* tests use empty edition */ }
    preloadAssetBindings(
      this.load,
      context.edition,
      artKeys.filter((key) => (context.edition as unknown as { bindings?: Record<string, unknown> })?.bindings?.[key]),
    );
  };

  const create = function (this: PhaserSceneLike): void {
    if (!this.add) throw new Error("Gryphon Patrol requires Phaser display services");
    const style = { fontFamily: "Arial", color: "#f4fbff", fontSize: "17px" };
    resources = {
      graphics: this.add.graphics(),
      art: createActorSpriteLayer(this, context.edition),
      title: this.add.text(0, 0, "", { ...style, fontSize: "30px", fontStyle: "bold" }),
      prompt: this.add.text(0, 0, "", { ...style, fontSize: "23px", wordWrap: { width: 860 } }),
      progress: this.add.text(0, 0, "", { ...style, fontSize: "16px", color: "#bde8ff" }),
      feedback: this.add.text(0, 0, "", { ...style, fontSize: "17px", color: "#ffe9a8" }),
      instructions: this.add.text(0, 0, "", { ...style, fontSize: "14px", color: "#c3d8ea" }),
      enemies: Array.from({ length: context.enemyCount }, () => this.add!.text(0, 0, "", { ...style, fontSize: "15px" })),
      orbs: Array.from({ length: context.targetCount }, () => this.add!.text(0, 0, "", { ...style, fontSize: "15px", color: "#fff7d1" })),
      groundWidth: 0,
      groundHeight: 0,
    };
    this.events?.once("shutdown", cleanup);
    this.events?.once("destroy", cleanup);
    updateView(this);
  };
  const update = function (this: PhaserSceneLike, _time = 0, delta = 0): void {
    if (!resources || cleaned) return;
    frameScheduler.tick(delta);
    tickFlightParallax(parallax as unknown as Parameters<typeof tickFlightParallax>[0], delta);
    processInput(this);
    if (context.sessionMode === "playing") context.controller.tick(delta);
    updateView(this);
  };
  return {
    key: GRYPHON_PATROL_ID,
    preload,
    create,
    update,
    extend: {
      apkCaptureResponsiveState: (): GryphonPatrolSnapshot => context.controller.snapshot(sceneWidth),
      apkRestoreResponsiveState: (state: unknown): void => {
        if (!state || typeof state !== "object") throw new Error("Gryphon Patrol responsive state is invalid");
        context.controller.restore(state as GryphonPatrolSnapshot);
      },
      apkRecompose: (nextComposition: GryphonPatrolSceneContext["composition"]): void => {
        composition = nextComposition;
      },
    },
  };
}

/**
 * Creates the runtime-compatible Gryphon Patrol cartridge.
 * @returns A sentence-mode cartridge with a bespoke aerial shooter scene.
 */
export function createGryphonPatrolCartridge(): StandardExperienceCartridge {
  let activeController: GryphonPatrolController | undefined;
  const standardExperience = createCartridgeStandardExperience({
    id: GRYPHON_PATROL_ID,
    title: "Gryphon Patrol",
    description: "Fly a gryphon through a wrapped sky, shoot word-marked enemies, and collect their orbs.",
    inputMode: "sentence",
    objective: "Collect every sentence word orb in order while protecting the gryphon.",
    mechanicInstruction: "Fly in four directions, fire at the marked enemy, and collect its dropped word orb.",
    keyboardKeys: ["W", "A", "S", "D", "Arrow keys", "Space"],
    executeTutorialAction: (actionId) => {
      const controller = activeController;
      if (!controller) return;
      const state = controller.snapshot();
      const enemy = actionId === "action:select-correct"
        ? state.enemies.find((candidate) => candidate.isTarget && candidate.isActive)
        : state.enemies.find((candidate) => !candidate.isTarget && candidate.isActive);
      if (!enemy) return;
      controller.moveTo(enemy.x - 220, enemy.y);
      controller.hitEnemy(enemy.id);
      if (actionId !== "action:select-correct") return;
      const orb = controller.snapshot().orbs.find((candidate) => candidate.isActive);
      if (orb) controller.collectOrb(orb.id);
    },
  });
  return {
    manifest: {
      id: GRYPHON_PATROL_ID,
      title: "Gryphon Patrol",
      description: "Fly a gryphon through a wrapped sky, shoot word-marked enemies, and collect their orbs.",
      runtimeApiVersion: "1.0.0",
      inputMode: "sentence",
      requiredAssetBindings: ["gryphon-patrol/player"],
      capabilities: [
        "capability:bounded-frame-delta",
        "capability:input-action-normalization",
        "capability:horizontal-world-wrap",
        "capability:language-target-progression",
        "capability:nonempty-content-precondition",
        "capability:projectile-collision",
        "capability:result-accounting",
        "capability:single-completion-emission",
      ],
    },
    standardExperience,
    createGameConfig(context: CartridgeGameConfigContext): Readonly<Record<string, unknown>> {
      const input = sentenceInputSchema.parse(context.input);
      const sessionMode = context.sessionMode ?? "playing";
      const controller = createGryphonPatrolController(
        input,
        sessionMode === "playing" ? (result, outcome) => context.complete(result, outcome) : () => undefined,
        context.seed ?? 0,
      );
      activeController = controller;
      context.diagnostic({
        level: "debug",
        code: "GRYPHON_PATROL_READY",
        message: "Gryphon Patrol deterministic word enemies are ready.",
        details: {
          cartridgeId: GRYPHON_PATROL_ID,
          editionId: context.edition.id,
          targetCount: controller.snapshot().targetCount,
          seed: controller.snapshot().seed,
        },
      });
      return {
        width: GRYPHON_PATROL_CANVAS.width,
        height: GRYPHON_PATROL_CANVAS.height,
        render: { antialias: true, pixelArt: false },
        scene: createScene({
          controller,
          edition: context.edition,
          inputController: context.inputController,
          composition: context.composition,
          sessionMode,
          diagnostic: context.diagnostic,
          enemyCount: controller.snapshot().enemies.length,
          targetCount: controller.snapshot().targetCount,
        }),
      };
    },
  };
}
