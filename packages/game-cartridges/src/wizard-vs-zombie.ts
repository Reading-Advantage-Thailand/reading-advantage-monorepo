import {
  gameResultsSchema,
  vocabularyInputSchema,
  type GameResults,
  type VocabularyItem,
} from "@reading-advantage/game-contracts";
import {
  advanceBody,
  createBoundedFrameScheduler,
  createCompletionLatch,
  createDeterministicSpawner,
  createInputActionNormalizer,
  createResultAccountant,
  finalizeResult,
  intersects,
  preloadAssetBindings,
  resolveAssetBinding,
  validateNonEmptyContent,
  type APKInputController,
  type CartridgeGameConfigContext,
  type GameTerminalOutcome,
  type GameplayBounds,
  type GameplayVector,
  type InputActionId,
  type RuntimeEdition,
} from "@reading-advantage/advantage-play-kit";
import type { StandardExperienceCartridge } from "@reading-advantage/advantage-play-kit/presentation";

import { createCartridgeStandardExperience } from "./standard-experience.js";

/** Stable public identifier for the Wizard vs Zombie cartridge. */
export const WIZARD_VS_ZOMBIE_ID = "wizard-vs-zombie" as const;

/** Base canvas dimensions for the night graveyard. */
export const WIZARD_VS_ZOMBIE_CANVAS = Object.freeze({ width: 960, height: 540 });

/** Backward-compatible arena width export. */
export const GAME_WIDTH = WIZARD_VS_ZOMBIE_CANVAS.width;

/** Backward-compatible arena height export. */
export const GAME_HEIGHT = WIZARD_VS_ZOMBIE_CANVAS.height;

/** Wizard starting and maximum health. */
export const INITIAL_HP = 100;

/** Maximum number of charged shockwaves. */
export const MAX_SHOCKWAVE_CHARGES = 3;

/** Bounded damage-immunity duration after one zombie collision. */
export const INVULNERABILITY_DURATION = 500;

/** Wizard collision radius in base arena pixels. */
export const WIZARD_RADIUS = 20;

/** Wizard movement speed in arena pixels per second. */
export const WIZARD_MOVE_SPEED = 240;

/** Soul-crystal collision radius in base arena pixels. */
export const ORB_RADIUS = 25;

/** Zombie collision radius in base arena pixels. */
export const ZOMBIE_RADIUS = 15;

/** Keyboard bindings accepted by the graveyard scene. */
export const WIZARD_VS_ZOMBIE_KEYBOARD_BINDINGS: Readonly<Record<string, InputActionId>> = Object.freeze({
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

/** Four semantic movement directions used by the wizard. */
export type WizardVsZombieDirection =
  | "move-left"
  | "move-right"
  | "move-up"
  | "move-down";

/** Active or terminal Wizard vs Zombie phase. */
export type WizardVsZombiePhase = "playing" | "victory" | "defeat";

/** A point in the fixed base arena coordinate system. */
export interface WizardVsZombiePoint {
  /** Horizontal arena coordinate. */
  readonly x: number;
  /** Vertical arena coordinate. */
  readonly y: number;
}

/** One soul crystal displayed in the graveyard. */
export interface WizardVsZombieOrb extends WizardVsZombiePoint {
  /** Stable identity for this round and position. */
  readonly id: string;
  /** Vocabulary term represented by the crystal. */
  readonly term: string;
  /** Compatibility alias for renderers that call the term a word. */
  readonly word: string;
  /** Translation displayed below the crystal. */
  readonly translation: string;
  /** Whether this crystal matches the active target term. */
  readonly isCorrect: boolean;
  /** Collision radius. */
  readonly radius: number;
}

/** One advancing zombie in the graveyard. */
export interface WizardVsZombieZombie extends WizardVsZombiePoint {
  /** Stable zombie identity. */
  readonly id: string;
  /** Movement speed in base pixels per second. */
  readonly speed: number;
  /** Health damage on contact. */
  readonly damage: number;
  /** Collision radius. */
  readonly radius: number;
}

/** Deterministic zombie seed accepted by controller tests and hosts. */
export interface WizardVsZombieZombieSeed extends WizardVsZombiePoint {
  /** Optional stable identity. */
  readonly id?: string;
  /** Optional movement speed. */
  readonly speed?: number;
  /** Optional collision damage. */
  readonly damage?: number;
  /** Optional collision radius. */
  readonly radius?: number;
}

/** Optional deterministic setup for one Wizard vs Zombie controller. */
export interface WizardVsZombieControllerOptions {
  /** Deterministic integer used for crystal layout and zombie gates. */
  readonly seed?: number;
  /** Deterministic source used to derive a seed when supplied. */
  readonly rng?: () => number;
  /** Zombies present before the first simulation step. */
  readonly initialZombies?: readonly WizardVsZombieZombieSeed[];
}

/** Immutable graveyard and learning state exposed by the controller. */
export interface WizardVsZombieSnapshot {
  /** Current gameplay phase. */
  readonly phase: WizardVsZombiePhase;
  /** Index of the current target, or the target count after victory. */
  readonly targetIndex: number;
  /** Number of vocabulary targets in the session. */
  readonly targetCount: number;
  /** Current source-language target term. */
  readonly prompt: string;
  /** Current target translation. */
  readonly answer: string;
  /** Shared catalog mechanic label for host diagnostics. */
  readonly mechanic: string;
  /** Semantic movement action that points toward the current correct crystal. */
  readonly correctAction: InputActionId;
  /** Semantic actions accepted by the controller. */
  readonly availableActions: readonly InputActionId[];
  /** Current wizard position and collision radius. */
  readonly wizard: Readonly<WizardVsZombiePoint & { readonly radius: number }>;
  /** Player-shaped alias exposing the legacy health field names. */
  readonly player: Readonly<WizardVsZombiePoint & {
    readonly radius: number;
    readonly hp: number;
    readonly maxHp: number;
    readonly shockwaveCharges: number;
    readonly invulnerabilityTime: number;
  }>;
  /** Current target term alias used by the legacy game state. */
  readonly targetWord: string;
  /** Current soul crystals. */
  readonly orbs: readonly WizardVsZombieOrb[];
  /** Current zombies. */
  readonly zombies: readonly WizardVsZombieZombie[];
  /** Current health. */
  readonly health: number;
  /** Maximum health. */
  readonly maxHealth: number;
  /** Current lives alias for shared catalog hosts. */
  readonly lives: number;
  /** Current energy alias for charged shockwaves. */
  readonly energy: number;
  /** Current shockwave charges. */
  readonly shockwaveCharges: number;
  /** Maximum shockwave charges. */
  readonly maxShockwaveCharges: number;
  /** Remaining damage-immunity time in milliseconds. */
  readonly invulnerabilityMs: number;
  /** Current game score. */
  readonly score: number;
  /** Number of correct crystal collisions. */
  readonly correctAnswers: number;
  /** Number of crystal-collision attempts. */
  readonly totalAttempts: number;
  /** Outcome of the latest crystal collision. */
  readonly lastOutcome: "correct" | "incorrect" | undefined;
  /** Elapsed simulation time in milliseconds. */
  readonly gameTimeMs: number;
  /** Elapsed simulation time alias used by the legacy game state. */
  readonly gameTime: number;
  /** Current deterministic crystal relocation revision. */
  readonly layoutRevision: number;
  /** Milliseconds accumulated toward the next zombie spawn. */
  readonly spawnTimerMs: number;
  /** Number of deterministic zombie gates already consumed. */
  readonly spawnCount: number;
  /** Whether the scene lifecycle destroyed this session. */
  readonly destroyed: boolean;
  /** One terminal result, when the session has ended. */
  readonly result: GameResults | undefined;
}

/** Result returned by one arena or learning operation. */
export interface WizardVsZombieActionResult {
  /** Whether the operation changed active game state. */
  readonly accepted: boolean;
  /** Whether the operation matched the active vocabulary target. */
  readonly correct: boolean;
  /** Whether the operation advanced the target. */
  readonly progressed: boolean;
  /** Whether the operation recorded a crystal attempt. */
  readonly attempted: boolean;
  /** Whether the operation reached victory or defeat. */
  readonly terminal: boolean;
  /** Alias retained for runtime result adapters. */
  readonly completed: boolean;
  /** First terminal result, when this operation reached a terminal phase. */
  readonly result?: GameResults;
  /** Snapshot after the operation. */
  readonly snapshot: WizardVsZombieSnapshot;
}

/** Transport-independent Wizard vs Zombie rules and lifecycle controls. */
export interface WizardVsZombieController {
  /** Returns the current immutable graveyard state. */
  snapshot(): WizardVsZombieSnapshot;
  /** Moves the wizard one bounded step and resolves collisions. */
  move(direction: WizardVsZombieDirection): WizardVsZombieActionResult;
  /** Slides the wizard by APK kinematic velocity for one bounded frame. */
  steer(velocity: GameplayVector, deltaMs: number): WizardVsZombieActionResult;
  /** Applies one normalized keyboard or controller action. */
  dispatch(action: InputActionId): WizardVsZombieActionResult;
  /** Alias for dispatch retained for cartridge controller callers. */
  choose(action: InputActionId): WizardVsZombieActionResult;
  /** Moves the wizard directly to a base-arena point and resolves collisions. */
  moveTo(position: WizardVsZombiePoint): WizardVsZombieActionResult;
  /** Moves the wizard to a bounded base-arena point without resolving collisions. */
  setWizardPosition(position: WizardVsZombiePoint): void;
  /** Resolves the wizard against its current crystal and zombie positions. */
  resolveCollisions(): WizardVsZombieActionResult;
  /** Collects one crystal by identity through the learning mechanic. */
  collectOrb(orbId: string): WizardVsZombieActionResult;
  /** Advances zombie hunt, spawning, immunity, and collisions. */
  advance(deltaMs: number): WizardVsZombieActionResult;
  /** Alias for advance used by scene and test adapters. */
  tick(deltaMs: number): WizardVsZombieActionResult;
  /** Casts one charged shockwave against nearby zombies. */
  castShockwave(): WizardVsZombieActionResult;
  /** Applies one direct ten-point hazard for deterministic terminal testing. */
  applyHazard(): WizardVsZombieActionResult;
  /** Adds one deterministic zombie to the active graveyard. */
  addZombie(zombie: WizardVsZombieZombieSeed): void;
  /** Captures all gameplay state for a responsive transition. */
  capture(): WizardVsZombieSnapshot;
  /** Restores a validated responsive snapshot. */
  restore(snapshot: WizardVsZombieSnapshot): void;
  /** Seals the session and prevents later mutation or result delivery. */
  destroy(): void;
}

interface PhaserGraphicsLike {
  clear(): this;
  fillStyle(color: number, alpha?: number): this;
  fillRect(x: number, y: number, width: number, height: number): this;
  fillCircle(x: number, y: number, radius: number): this;
  fillRoundedRect(x: number, y: number, width: number, height: number, radius?: number): this;
  lineStyle(lineWidth: number, color: number, alpha?: number): this;
  strokeRoundedRect(x: number, y: number, width: number, height: number, radius?: number): this;
  setDepth?(depth: number): this;
  destroy(): void;
}

interface PhaserTextLike {
  setPosition(x: number, y: number): this;
  setText(value: string): this;
  setDepth?(depth: number): this;
  destroy(): void;
}

interface PhaserImageLike {
  setOrigin?(x: number, y: number): this;
  setDisplaySize?(width: number, height: number): this;
  setDepth?(depth: number): this;
  setPosition?(x: number, y: number): this;
  setVisible?(visible: boolean): this;
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
  load?: {
    image?(key: string, url: string): unknown;
    spritesheet?(key: string, url: string, config: { frameWidth: number; frameHeight: number }): unknown;
  };
  add?: {
    graphics(): PhaserGraphicsLike;
    text(x: number, y: number, value: string, style?: Readonly<Record<string, unknown>>): PhaserTextLike;
    image?(x: number, y: number, key: string, frame?: number): PhaserImageLike;
    sprite?(x: number, y: number, key: string, frame?: number): PhaserImageLike;
    tileSprite?(x: number, y: number, width: number, height: number, key: string): PhaserImageLike;
  };
  events?: { once(event: string, listener: () => void): void };
  game?: { readonly canvas?: PhaserCanvasLike };
  scale?: { readonly width?: number; readonly height?: number };
}

interface SceneResources {
  readonly night: PhaserGraphicsLike;
  readonly graphics: PhaserGraphicsLike;
  readonly title: PhaserTextLike;
  readonly prompt: PhaserTextLike;
  readonly progress: PhaserTextLike;
  readonly health: PhaserTextLike;
  readonly feedback: PhaserTextLike;
  readonly instructions: PhaserTextLike;
  readonly orbLabels: readonly PhaserTextLike[];
  ground?: PhaserImageLike;
  readonly worldSprites: PhaserImageLike[];
  playerSprite?: PhaserImageLike;
  readonly orbSprites: Map<string, PhaserImageLike>;
  readonly zombieSprites: Map<string, PhaserImageLike>;
  worldWidth: number;
  worldHeight: number;
}

interface WizardVsZombieSceneContext {
  readonly controller: WizardVsZombieController;
  readonly inputController: APKInputController;
  readonly composition: CartridgeGameConfigContext["composition"];
  readonly diagnostic: CartridgeGameConfigContext["diagnostic"];
  readonly sessionMode: NonNullable<CartridgeGameConfigContext["sessionMode"]>;
  readonly edition: RuntimeEdition;
}

interface ResolvedArenaTexture {
  readonly textureKey: string;
  readonly frame?: number;
}

const SOUL_POSITIONS: readonly WizardVsZombiePoint[] = Object.freeze([
  Object.freeze({ x: 180, y: 180 }),
  Object.freeze({ x: 780, y: 180 }),
  Object.freeze({ x: 180, y: 420 }),
  Object.freeze({ x: 780, y: 420 }),
]);

const ARENA_ART_KEYS = Object.freeze([
  "world:ground",
  "prop:grave",
  "prop:crypt",
  "prop:orb",
  "player:idle",
  "enemy:idle",
]);

/** One drawn graveyard feature with a solid footprint. */
export interface GraveyardFeature {
  /** Stable feature identity. */
  readonly id: string;
  /** Catalog prop binding used to draw this feature. */
  readonly prop: "crypt" | "grave";
  /** Foot position x. */
  readonly x: number;
  /** Foot position y. */
  readonly y: number;
  /** Drawn width. */
  readonly width: number;
  /** Drawn height. */
  readonly height: number;
  /** Solid collision box in arena space. */
  readonly solid: GameplayBounds;
}

/** Complete sprites only: crypt towers and gravestones. No atlas crops. No fences. */
export const GRAVEYARD_FEATURES: readonly GraveyardFeature[] = Object.freeze([
  Object.freeze({
    id: "crypt-north",
    prop: "crypt",
    x: 480,
    y: 148,
    width: 150,
    height: 196,
    solid: Object.freeze({ x: 420, y: 62, width: 120, height: 74 }),
  }),
  Object.freeze({
    id: "crypt-west",
    prop: "crypt",
    x: 78,
    y: 348,
    width: 124,
    height: 168,
    solid: Object.freeze({ x: 28, y: 248, width: 96, height: 88 }),
  }),
  Object.freeze({
    id: "crypt-east",
    prop: "crypt",
    x: 882,
    y: 348,
    width: 124,
    height: 168,
    solid: Object.freeze({ x: 836, y: 248, width: 96, height: 88 }),
  }),
  Object.freeze({
    id: "grave-nw",
    prop: "grave",
    x: 90,
    y: 72,
    width: 96,
    height: 124,
    solid: Object.freeze({ x: 54, y: 46, width: 72, height: 28 }),
  }),
  Object.freeze({
    id: "grave-ne",
    prop: "grave",
    x: 832,
    y: 116,
    width: 96,
    height: 124,
    solid: Object.freeze({ x: 796, y: 90, width: 72, height: 28 }),
  }),
  Object.freeze({
    id: "grave-mid-west",
    prop: "grave",
    x: 268,
    y: 338,
    width: 90,
    height: 116,
    solid: Object.freeze({ x: 232, y: 312, width: 72, height: 28 }),
  }),
  Object.freeze({
    id: "grave-mid-east",
    prop: "grave",
    x: 692,
    y: 338,
    width: 90,
    height: 116,
    solid: Object.freeze({ x: 656, y: 312, width: 72, height: 28 }),
  }),
  Object.freeze({
    id: "grave-sw",
    prop: "grave",
    x: 132,
    y: 508,
    width: 96,
    height: 124,
    solid: Object.freeze({ x: 96, y: 482, width: 72, height: 28 }),
  }),
  Object.freeze({
    id: "grave-south",
    prop: "grave",
    x: 480,
    y: 516,
    width: 96,
    height: 124,
    solid: Object.freeze({ x: 444, y: 490, width: 72, height: 28 }),
  }),
  Object.freeze({
    id: "grave-se",
    prop: "grave",
    x: 828,
    y: 508,
    width: 96,
    height: 124,
    solid: Object.freeze({ x: 792, y: 482, width: 72, height: 28 }),
  }),
]);

/** Solid footprints used by APK rectangle collision. */
export const GRAVEYARD_SOLIDS: readonly GameplayBounds[] = Object.freeze(
  GRAVEYARD_FEATURES.map((feature) => feature.solid),
);

const WIZARD_BOUNDS = Object.freeze({
  x: WIZARD_RADIUS,
  y: WIZARD_RADIUS,
  width: GAME_WIDTH - WIZARD_RADIUS * 2,
  height: GAME_HEIGHT - WIZARD_RADIUS * 2,
});

const HORDE_BOUNDS = Object.freeze({
  x: -80,
  y: -80,
  width: GAME_WIDTH + 160,
  height: GAME_HEIGHT + 160,
});

const WIZARD_MOVE_STEP = 48;
const ZOMBIE_SPAWN_INTERVAL = 1_000;
const ZOMBIE_DAMAGE = 10;
const DEFAULT_ZOMBIE_SPEED = 96;
const SHOCKWAVE_RADIUS = 250;
const SHOCKWAVE_PUSH_DISTANCE = 300;
const MAX_ZOMBIES = 50;
const WIZARD_VS_ZOMBIE_MECHANIC = "Collect the true soul and survive the horde.";
const WIZARD_VS_ZOMBIE_AVAILABLE_ACTIONS: readonly InputActionId[] = Object.freeze([
  "move-left",
  "move-right",
  "move-up",
  "move-down",
  "confirm",
]);

function finiteDelta(deltaMs: number): number {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) return 0;
  return Math.min(deltaMs, 1_000);
}

function distanceBetween(first: WizardVsZombiePoint, second: WizardVsZombiePoint): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function actionTowardPoint(
  origin: WizardVsZombiePoint,
  target: WizardVsZombiePoint | undefined,
): InputActionId {
  if (!target) return "confirm";
  const horizontal = target.x - origin.x;
  const vertical = target.y - origin.y;
  if (horizontal === 0 && vertical === 0) return "confirm";
  if (Math.abs(horizontal) >= Math.abs(vertical)) return horizontal > 0 ? "move-right" : "move-left";
  return vertical > 0 ? "move-down" : "move-up";
}

function normalizedSeed(options: WizardVsZombieControllerOptions | number): number {
  const sourceOptions = typeof options === "number" ? { seed: options } : options;
  const source = sourceOptions.rng ? sourceOptions.rng() : sourceOptions.seed ?? 20260818;
  if (!Number.isFinite(source)) return 0;
  return Math.abs(Math.trunc(source)) % SOUL_POSITIONS.length;
}

function buildZombie(seed: WizardVsZombieZombieSeed, index: number): WizardVsZombieZombie {
  return Object.freeze({
    id: seed.id ?? `zombie-${index}`,
    x: seed.x,
    y: seed.y,
    speed: Math.max(0, seed.speed ?? DEFAULT_ZOMBIE_SPEED),
    damage: Math.max(0, seed.damage ?? ZOMBIE_DAMAGE),
    radius: Math.max(1, seed.radius ?? ZOMBIE_RADIUS),
  });
}

function createActionResult(
  snapshot: WizardVsZombieSnapshot,
  values: Omit<WizardVsZombieActionResult, "snapshot">,
): WizardVsZombieActionResult {
  return Object.freeze({ ...values, snapshot });
}

function isPoint(value: unknown): value is WizardVsZombiePoint {
  if (typeof value !== "object" || value === null) return false;
  const point = value as Partial<WizardVsZombiePoint>;
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function velocityToward(
  origin: WizardVsZombiePoint,
  target: WizardVsZombiePoint,
  speed: number,
): GameplayVector {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const distance = Math.hypot(dx, dy);
  if (distance === 0 || speed === 0) return Object.freeze({ x: 0, y: 0 });
  return Object.freeze({ x: dx / distance * speed, y: dy / distance * speed });
}

function bodyRect(point: WizardVsZombiePoint, radius: number): GameplayBounds {
  return {
    x: point.x - radius,
    y: point.y - radius,
    width: radius * 2,
    height: radius * 2,
  };
}

/**
 * Returns whether a body rectangle hits a graveyard solid.
 * @param rect Candidate collision rectangle.
 * @returns True when the rectangle overlaps a crypt or grave footprint.
 */
export function hitsGraveyardSolid(rect: GameplayBounds): boolean {
  return GRAVEYARD_SOLIDS.some((solid) => intersects(rect, solid));
}

function slidePosition(
  position: WizardVsZombiePoint,
  velocity: GameplayVector,
  deltaMs: number,
  bounds: GameplayBounds,
  radius: number,
): WizardVsZombiePoint {
  const next = advanceBody({ position, velocity }, deltaMs, bounds).position;
  if (!hitsGraveyardSolid(bodyRect(next, radius))) return next;
  const alongX = advanceBody({ position, velocity: { x: velocity.x, y: 0 } }, deltaMs, bounds).position;
  if (!hitsGraveyardSolid(bodyRect(alongX, radius))) return { x: alongX.x, y: position.y };
  const alongY = advanceBody({ position, velocity: { x: 0, y: velocity.y } }, deltaMs, bounds).position;
  if (!hitsGraveyardSolid(bodyRect(alongY, radius))) return { x: position.x, y: alongY.y };
  return position;
}

/**
 * Creates the transport-independent Wizard vs Zombie survival controller.
 * @param input Vocabulary content for the session.
 * @param deliver Callback for the first terminal result.
 * @param options Optional deterministic setup or numeric seed.
 * @returns A controller for night-graveyard vocabulary survival.
 * @throws When the vocabulary input is invalid or empty.
 */
export function createWizardVsZombieController(
  input: unknown,
  deliver: (result: GameResults, outcome: GameTerminalOutcome) => void | Promise<void>,
  options: WizardVsZombieControllerOptions | number = {},
): WizardVsZombieController {
  const parsed = vocabularyInputSchema.parse(input);
  const content = validateNonEmptyContent(parsed, "vocabulary");
  const items: readonly VocabularyItem[] = content.items;
  const seed = normalizedSeed(options);
  let accountant = createResultAccountant();
  let terminalOutcome: GameTerminalOutcome = "complete";
  const completion = createCompletionLatch<GameResults>((result) => deliver(result, terminalOutcome));
  const spawner = createDeterministicSpawner({ intervalMs: ZOMBIE_SPAWN_INTERVAL, maxPerTick: 2 });
  let phase: WizardVsZombiePhase = "playing";
  let targetIndex = 0;
  let layoutRevision = 0;
  let wizard = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };
  let orbs: readonly WizardVsZombieOrb[] = [];
  const setup = typeof options === "number" ? {} : options;
  let zombies: readonly WizardVsZombieZombie[] = (setup.initialZombies ?? []).map(buildZombie);
  let health = INITIAL_HP;
  let shockwaveCharges = 0;
  let invulnerabilityMs = 0;
  let gameTimeMs = 0;
  let spawnTimerMs = 0;
  let spawnCount = zombies.length;
  let lastOutcome: "correct" | "incorrect" | undefined;
  let result: GameResults | undefined;
  let destroyed = false;

  const currentItem = (): VocabularyItem => items[Math.min(targetIndex, items.length - 1)]!;

  const buildOrbs = (): readonly WizardVsZombieOrb[] => {
    const correctSlot = (seed + targetIndex) % SOUL_POSITIONS.length;
    return Object.freeze(SOUL_POSITIONS.map((_unused, slot) => {
      const position = SOUL_POSITIONS[(slot + layoutRevision) % SOUL_POSITIONS.length]!;
      const item = slot === correctSlot
        ? currentItem()
        : items[(targetIndex + slot + 1) % items.length]!;
      return Object.freeze({
        id: `orb:${targetIndex}:${layoutRevision}:${slot}`,
        x: position.x,
        y: position.y,
        radius: ORB_RADIUS,
        term: item.term,
        word: item.term,
        translation: item.translation,
        isCorrect: slot === correctSlot,
      });
    }));
  };

  orbs = buildOrbs();

  const snapshot = (): WizardVsZombieSnapshot => Object.freeze({
    phase,
    targetIndex,
    targetCount: items.length,
    prompt: currentItem().term,
    answer: currentItem().translation,
    mechanic: WIZARD_VS_ZOMBIE_MECHANIC,
    correctAction: actionTowardPoint(wizard, orbs.find((orb) => orb.isCorrect)),
    availableActions: WIZARD_VS_ZOMBIE_AVAILABLE_ACTIONS,
    wizard: Object.freeze({ ...wizard, radius: WIZARD_RADIUS }),
    player: Object.freeze({
      ...wizard,
      radius: WIZARD_RADIUS,
      hp: health,
      maxHp: INITIAL_HP,
      shockwaveCharges,
      invulnerabilityTime: invulnerabilityMs,
    }),
    targetWord: currentItem().term,
    orbs,
    zombies,
    health,
    maxHealth: INITIAL_HP,
    lives: health,
    energy: shockwaveCharges,
    shockwaveCharges,
    maxShockwaveCharges: MAX_SHOCKWAVE_CHARGES,
    invulnerabilityMs,
    score: accountant.score,
    correctAnswers: accountant.correctAnswers,
    totalAttempts: accountant.totalAttempts,
    lastOutcome,
    gameTimeMs,
    gameTime: gameTimeMs,
    layoutRevision,
    spawnTimerMs,
    spawnCount,
    destroyed,
    result,
  });

  const terminalResult = (): GameResults => gameResultsSchema.parse(
    finalizeResult(accountant, { xpPerCorrect: 20, xpPerAccuracyPoint: 10 }),
  );

  const finish = (nextPhase: Exclude<WizardVsZombiePhase, "playing">): GameResults => {
    phase = nextPhase;
    terminalOutcome = nextPhase;
    orbs = Object.freeze([]);
    result = terminalResult();
    completion.complete(result);
    return result;
  };

  const inactive = (): WizardVsZombieActionResult => createActionResult(snapshot(), {
    accepted: false,
    correct: false,
    progressed: false,
    attempted: false,
    terminal: false,
    completed: false,
  });

  const damageWizard = (amount: number, respectInvulnerability: boolean): WizardVsZombieActionResult => {
    if (destroyed || phase !== "playing") return inactive();
    if (respectInvulnerability && invulnerabilityMs > 0) {
      return createActionResult(snapshot(), {
        accepted: false,
        correct: false,
        progressed: false,
        attempted: false,
        terminal: false,
        completed: false,
      });
    }
    health = Math.max(0, health - Math.max(0, amount));
    if (respectInvulnerability) invulnerabilityMs = INVULNERABILITY_DURATION;
    if (health === 0) {
      const nextResult = finish("defeat");
      return createActionResult(snapshot(), {
        accepted: true,
        correct: false,
        progressed: false,
        attempted: false,
        terminal: true,
        completed: true,
        result: nextResult,
      });
    }
    return createActionResult(snapshot(), {
      accepted: true,
      correct: false,
      progressed: false,
      attempted: false,
      terminal: false,
      completed: false,
    });
  };

  const collectOrb = (orbId: string): WizardVsZombieActionResult => {
    if (destroyed || phase !== "playing") return inactive();
    const orb = orbs.find((candidate) => candidate.id === orbId);
    if (!orb) return inactive();
    const correct = orb.isCorrect;
    accountant.recordAttempt({ correct });
    lastOutcome = correct ? "correct" : "incorrect";
    if (!correct) {
      accountant.addScore(-Math.min(accountant.score, 5));
      layoutRevision += 1;
      orbs = buildOrbs();
      return createActionResult(snapshot(), {
        accepted: true,
        correct: false,
        progressed: false,
        attempted: true,
        terminal: false,
        completed: false,
      });
    }

    accountant.addScore(100);
    health = Math.min(INITIAL_HP, health + 10);
    shockwaveCharges = Math.min(MAX_SHOCKWAVE_CHARGES, shockwaveCharges + 1);
    targetIndex += 1;
    layoutRevision = 0;
    if (targetIndex >= items.length) {
      const nextResult = finish("victory");
      return createActionResult(snapshot(), {
        accepted: true,
        correct: true,
        progressed: true,
        attempted: true,
        terminal: true,
        completed: true,
        result: nextResult,
      });
    }
    orbs = buildOrbs();
    return createActionResult(snapshot(), {
      accepted: true,
      correct: true,
      progressed: true,
      attempted: true,
      terminal: false,
      completed: false,
    });
  };

  const resolveOrbCollision = (): WizardVsZombieActionResult | undefined => {
    const orb = orbs.find((candidate) => distanceBetween(wizard, candidate) <= WIZARD_RADIUS + candidate.radius);
    return orb ? collectOrb(orb.id) : undefined;
  };

  const resolveZombieCollision = (): WizardVsZombieActionResult | undefined => {
    const zombie = zombies.find((candidate) => distanceBetween(wizard, candidate) <= WIZARD_RADIUS + candidate.radius);
    return zombie ? damageWizard(zombie.damage, true) : undefined;
  };

  const resolveCollisions = (): WizardVsZombieActionResult => {
    if (destroyed || phase !== "playing") return inactive();
    const orbResult = resolveOrbCollision();
    if (orbResult) {
      if (orbResult.terminal) return orbResult;
      const zombieResult = resolveZombieCollision();
      if (zombieResult) return zombieResult;
      return orbResult;
    }
    return resolveZombieCollision() ?? createActionResult(snapshot(), {
      accepted: false,
      correct: false,
      progressed: false,
      attempted: false,
      terminal: false,
      completed: false,
    });
  };

  const placeWizard = (x: number, y: number): void => {
    const next = slidePosition(
      wizard,
      { x: 0, y: 0 },
      0,
      WIZARD_BOUNDS,
      WIZARD_RADIUS,
    );
    const candidate = {
      x: Math.min(WIZARD_BOUNDS.x + WIZARD_BOUNDS.width, Math.max(WIZARD_BOUNDS.x, x)),
      y: Math.min(WIZARD_BOUNDS.y + WIZARD_BOUNDS.height, Math.max(WIZARD_BOUNDS.y, y)),
    };
    wizard = hitsGraveyardSolid(bodyRect(candidate, WIZARD_RADIUS)) ? next : candidate;
  };

  const move = (direction: WizardVsZombieDirection): WizardVsZombieActionResult => {
    if (destroyed || phase !== "playing") return inactive();
    const velocity = {
      x: direction === "move-left" ? -WIZARD_MOVE_SPEED : direction === "move-right" ? WIZARD_MOVE_SPEED : 0,
      y: direction === "move-up" ? -WIZARD_MOVE_SPEED : direction === "move-down" ? WIZARD_MOVE_SPEED : 0,
    };
    return steer(velocity, (WIZARD_MOVE_STEP / WIZARD_MOVE_SPEED) * 1_000);
  };

  const steer = (velocity: GameplayVector, deltaMs: number): WizardVsZombieActionResult => {
    if (destroyed || phase !== "playing") return inactive();
    const elapsed = finiteDelta(deltaMs);
    wizard = slidePosition(wizard, velocity, elapsed, WIZARD_BOUNDS, WIZARD_RADIUS);
    const collision = resolveCollisions();
    if (collision.accepted || collision.attempted) return collision;
    return createActionResult(snapshot(), {
      accepted: true,
      correct: false,
      progressed: false,
      attempted: false,
      terminal: false,
      completed: false,
    });
  };

  const setWizardPosition = (position: WizardVsZombiePoint): void => {
    if (destroyed) return;
    placeWizard(position.x, position.y);
  };

  const moveTo = (position: WizardVsZombiePoint): WizardVsZombieActionResult => {
    if (destroyed || phase !== "playing") return inactive();
    setWizardPosition(position);
    const collision = resolveCollisions();
    if (collision.accepted || collision.attempted) return collision;
    return createActionResult(snapshot(), {
      accepted: true,
      correct: false,
      progressed: false,
      attempted: false,
      terminal: false,
      completed: false,
    });
  };

  const spawnZombie = (): void => {
    if (zombies.length >= MAX_ZOMBIES) return;
    const gate = spawnCount % 4;
    const gates: readonly WizardVsZombiePoint[] = [
      { x: GAME_WIDTH / 2, y: -40 },
      { x: GAME_WIDTH + 40, y: GAME_HEIGHT / 2 },
      { x: GAME_WIDTH / 2, y: GAME_HEIGHT + 40 },
      { x: -40, y: GAME_HEIGHT / 2 },
    ];
    const point = gates[(gate + seed) % gates.length]!;
    const zombie = buildZombie({
      id: `zombie-${spawnCount}`,
      x: point.x,
      y: point.y,
      speed: DEFAULT_ZOMBIE_SPEED,
      damage: ZOMBIE_DAMAGE,
    }, spawnCount);
    zombies = Object.freeze([...zombies, zombie]);
    spawnCount += 1;
  };

  const advance = (deltaMs: number): WizardVsZombieActionResult => {
    if (destroyed || phase !== "playing") return inactive();
    const elapsed = finiteDelta(deltaMs);
    const wasInvulnerable = invulnerabilityMs > 0;
    gameTimeMs += elapsed;
    invulnerabilityMs = Math.max(0, invulnerabilityMs - elapsed);
    const due = spawner.advance(elapsed);
    spawnTimerMs = spawner.elapsedMs;
    for (let index = 0; index < due; index += 1) spawnZombie();
    zombies = Object.freeze(zombies.map((zombie) => {
      const next = slidePosition(
        zombie,
        velocityToward(zombie, wizard, zombie.speed),
        elapsed,
        HORDE_BOUNDS,
        zombie.radius,
      );
      return buildZombie({
        id: zombie.id,
        x: next.x,
        y: next.y,
        speed: zombie.speed,
        damage: zombie.damage,
        radius: zombie.radius,
      }, 0);
    }));
    if (wasInvulnerable) {
      return resolveOrbCollision() ?? createActionResult(snapshot(), {
        accepted: false,
        correct: false,
        progressed: false,
        attempted: false,
        terminal: false,
        completed: false,
      });
    }
    return resolveCollisions();
  };

  const castShockwave = (): WizardVsZombieActionResult => {
    if (destroyed || phase !== "playing" || shockwaveCharges === 0) return inactive();
    shockwaveCharges -= 1;
    const survivors: WizardVsZombieZombie[] = [];
    for (const zombie of zombies) {
      const dx = zombie.x - wizard.x;
      const dy = zombie.y - wizard.y;
      const distance = Math.hypot(dx, dy);
      if (distance < SHOCKWAVE_RADIUS) {
        const angle = distance === 0 ? 0 : Math.atan2(dy, dx);
        survivors.push(buildZombie({
          ...zombie,
          x: zombie.x + Math.cos(angle) * SHOCKWAVE_PUSH_DISTANCE,
          y: zombie.y + Math.sin(angle) * SHOCKWAVE_PUSH_DISTANCE,
        }, 0));
      } else {
        survivors.push(zombie);
      }
    }
    zombies = Object.freeze(survivors);
    return createActionResult(snapshot(), {
      accepted: true,
      correct: false,
      progressed: false,
      attempted: false,
      terminal: false,
      completed: false,
    });
  };

  const applyHazard = (): WizardVsZombieActionResult => damageWizard(ZOMBIE_DAMAGE, false);

  const addZombie = (zombie: WizardVsZombieZombieSeed): void => {
    if (destroyed || phase !== "playing" || zombies.length >= MAX_ZOMBIES) return;
    zombies = Object.freeze([...zombies, buildZombie(zombie, spawnCount)]);
    spawnCount += 1;
  };

  const dispatch = (action: InputActionId): WizardVsZombieActionResult => {
    if (action === "confirm") return castShockwave();
    if (action === "move-left" || action === "move-right" || action === "move-up" || action === "move-down") {
      return move(action);
    }
    return inactive();
  };

  const restore = (state: WizardVsZombieSnapshot): void => {
    if (destroyed) return;
    if (typeof state !== "object" || state === null) throw new Error("Wizard vs Zombie state is invalid");
    if (typeof state.destroyed !== "boolean") throw new Error("Wizard vs Zombie destroyed state is invalid");
    if (!(["playing", "victory", "defeat"] as const).includes(state.phase)) {
      throw new Error("Wizard vs Zombie state phase is invalid");
    }
    if (state.targetCount !== items.length || !Number.isInteger(state.targetIndex) || state.targetIndex < 0 || state.targetIndex > items.length) {
      throw new Error("Wizard vs Zombie state target progress is invalid");
    }
    if (state.mechanic !== WIZARD_VS_ZOMBIE_MECHANIC) {
      throw new Error("Wizard vs Zombie state mechanic is invalid");
    }
    if (!Array.isArray(state.orbs) || !Array.isArray(state.zombies)) {
      throw new Error("Wizard vs Zombie entities are invalid");
    }
    const orbIds = new Set<string>();
    if (!state.orbs.every((orb) => {
      if (typeof orb.id !== "string" || orbIds.has(orb.id)) return false;
      orbIds.add(orb.id);
      return typeof orb.term === "string"
        && orb.word === orb.term
        && typeof orb.translation === "string"
        && typeof orb.isCorrect === "boolean"
        && Number.isFinite(orb.x)
        && Number.isFinite(orb.y)
        && Number.isFinite(orb.radius)
        && orb.radius > 0;
    })) {
      throw new Error("Wizard vs Zombie orb state is invalid");
    }
    const zombieIds = new Set<string>();
    if (state.zombies.length > MAX_ZOMBIES || !state.zombies.every((zombie) => {
      if (typeof zombie.id !== "string" || zombieIds.has(zombie.id)) return false;
      zombieIds.add(zombie.id);
      return Number.isFinite(zombie.x)
        && Number.isFinite(zombie.y)
        && Number.isFinite(zombie.speed)
        && zombie.speed >= 0
        && Number.isFinite(zombie.damage)
        && zombie.damage >= 0
        && Number.isFinite(zombie.radius)
        && zombie.radius > 0;
    })) {
      throw new Error("Wizard vs Zombie zombie state is invalid");
    }
    if (!isPoint(state.wizard) || state.wizard.radius !== WIZARD_RADIUS) {
      throw new Error("Wizard vs Zombie wizard position is invalid");
    }
    if (state.wizard.x < WIZARD_RADIUS || state.wizard.x > GAME_WIDTH - WIZARD_RADIUS || state.wizard.y < WIZARD_RADIUS || state.wizard.y > GAME_HEIGHT - WIZARD_RADIUS) {
      throw new Error("Wizard vs Zombie wizard bounds are invalid");
    }
    if (!isPoint(state.player) || state.player.radius !== WIZARD_RADIUS || state.player.x !== state.wizard.x || state.player.y !== state.wizard.y) {
      throw new Error("Wizard vs Zombie player position is invalid");
    }
    if (!Number.isInteger(state.health) || state.health < 0 || state.health > INITIAL_HP) {
      throw new Error("Wizard vs Zombie health is invalid");
    }
    if (state.maxHealth !== INITIAL_HP || state.lives !== state.health || state.player.hp !== state.health || state.player.maxHp !== INITIAL_HP) {
      throw new Error("Wizard vs Zombie health aliases are invalid");
    }
    if (!Number.isInteger(state.shockwaveCharges) || state.shockwaveCharges < 0 || state.shockwaveCharges > MAX_SHOCKWAVE_CHARGES) {
      throw new Error("Wizard vs Zombie charges are invalid");
    }
    if (state.energy !== state.shockwaveCharges || state.player.shockwaveCharges !== state.shockwaveCharges) {
      throw new Error("Wizard vs Zombie energy aliases are invalid");
    }
    if (!Number.isInteger(state.correctAnswers) || !Number.isInteger(state.totalAttempts) || state.correctAnswers < 0 || state.correctAnswers > state.totalAttempts || state.correctAnswers !== state.targetIndex) {
      throw new Error("Wizard vs Zombie result counters are invalid");
    }
    if (!Number.isInteger(state.score) || state.score < 0 || state.score > state.correctAnswers * 100) throw new Error("Wizard vs Zombie score is invalid");
    if (!Number.isInteger(state.layoutRevision) || state.layoutRevision < 0) {
      throw new Error("Wizard vs Zombie orb layout is invalid");
    }
    if (!Number.isFinite(state.spawnTimerMs) || state.spawnTimerMs < 0 || !Number.isInteger(state.spawnCount) || state.spawnCount < 0) {
      throw new Error("Wizard vs Zombie spawn state is invalid");
    }
    if (!Number.isFinite(state.invulnerabilityMs) || state.invulnerabilityMs < 0 || state.invulnerabilityMs > INVULNERABILITY_DURATION) {
      throw new Error("Wizard vs Zombie immunity state is invalid");
    }
    if (!Number.isFinite(state.gameTimeMs) || state.gameTimeMs < 0) {
      throw new Error("Wizard vs Zombie clock is invalid");
    }
    if (state.gameTime !== state.gameTimeMs || state.player.invulnerabilityTime !== state.invulnerabilityMs) {
      throw new Error("Wizard vs Zombie clock aliases are invalid");
    }
    const target = items[Math.min(state.targetIndex, items.length - 1)]!;
    if (state.prompt !== target.term || state.answer !== target.translation || state.targetWord !== target.term) {
      throw new Error("Wizard vs Zombie target content is invalid");
    }
    if (!Array.isArray(state.availableActions)
      || state.availableActions.length !== WIZARD_VS_ZOMBIE_AVAILABLE_ACTIONS.length
      || state.availableActions.some((action, index) => action !== WIZARD_VS_ZOMBIE_AVAILABLE_ACTIONS[index])) {
      throw new Error("Wizard vs Zombie available actions are invalid");
    }
    const correctOrb = state.orbs.find((orb) => orb.isCorrect);
    if (state.correctAction !== actionTowardPoint(state.wizard, correctOrb)) {
      throw new Error("Wizard vs Zombie correct action is invalid");
    }
    if (state.phase === "playing" && (state.targetIndex === items.length || state.health === 0 || state.result !== undefined || state.orbs.length !== 4 || state.orbs.filter((orb) => orb.isCorrect).length !== 1)) {
      throw new Error("Wizard vs Zombie playing state is terminal");
    }
    if (state.phase === "victory" && (state.targetIndex !== items.length || state.orbs.length !== 0)) {
      throw new Error("Wizard vs Zombie victory state is unfinished");
    }
    if (state.phase === "defeat" && (state.health !== 0 || state.orbs.length !== 0)) {
      throw new Error("Wizard vs Zombie defeat state is inconsistent");
    }
    if (state.lastOutcome !== undefined && state.lastOutcome !== "correct" && state.lastOutcome !== "incorrect") {
      throw new Error("Wizard vs Zombie outcome is invalid");
    }
    if (state.totalAttempts === 0 && state.lastOutcome !== undefined) {
      throw new Error("Wizard vs Zombie outcome is inconsistent");
    }
    if (state.phase !== "playing" && state.result === undefined) {
      throw new Error("Wizard vs Zombie terminal result is missing");
    }
    const restoredAccountant = createResultAccountant();
    for (let index = 0; index < state.totalAttempts; index += 1) {
      restoredAccountant.recordAttempt({ correct: index < state.correctAnswers });
    }
    restoredAccountant.addScore(state.score);
    if (state.result !== undefined) {
      const restoredResult = gameResultsSchema.parse(state.result);
      const expectedResult = gameResultsSchema.parse(
        finalizeResult(restoredAccountant, { xpPerCorrect: 20, xpPerAccuracyPoint: 10 }),
      );
      if (restoredResult.accuracy !== expectedResult.accuracy
        || restoredResult.xp !== expectedResult.xp
        || restoredResult.score !== expectedResult.score
        || restoredResult.correctAnswers !== expectedResult.correctAnswers
        || restoredResult.totalAttempts !== expectedResult.totalAttempts) {
        throw new Error("Wizard vs Zombie terminal result is inconsistent");
      }
    }
    wizard = { x: state.wizard.x, y: state.wizard.y };
    health = state.health;
    shockwaveCharges = state.shockwaveCharges;
    invulnerabilityMs = state.invulnerabilityMs;
    gameTimeMs = state.gameTimeMs;
    layoutRevision = state.layoutRevision;
    spawnTimerMs = state.spawnTimerMs;
    zombies = Object.freeze(state.zombies.map((zombie) => buildZombie(zombie, 0)));
    spawnCount = state.spawnCount;
    orbs = Object.freeze(state.orbs.map((orb) => Object.freeze({ ...orb })));
    targetIndex = state.targetIndex;
    phase = state.phase;
    lastOutcome = state.lastOutcome;
    result = state.result;
    accountant = restoredAccountant;
    destroyed = state.destroyed;
    spawner.reset();
    if (phase !== "playing" || destroyed) completion.sealWithoutDelivery();
  };

  return Object.freeze({
    snapshot,
    move,
    steer,
    dispatch,
    choose: dispatch,
    moveTo,
    setWizardPosition,
    resolveCollisions,
    collectOrb,
    advance,
    tick: advance,
    castShockwave,
    applyHazard,
    addZombie,
    capture: snapshot,
    restore,
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      completion.sealWithoutDelivery();
    },
  });
}

/**
 * Returns whether the edition supplies graveyard art.
 * @param edition Audience edition supplied by the host.
 * @returns True when ground art is bound.
 */
function usesArenaArt(edition: RuntimeEdition | undefined): boolean {
  return Boolean(edition?.bindings?.["world:ground"]);
}

/**
 * Resolves one named graveyard texture when the edition binds that role.
 * @param edition Audience edition supplied by the host.
 * @param key Semantic binding key.
 * @returns Texture key and optional frame, or undefined when the role is unbound.
 */
function arenaTexture(edition: RuntimeEdition, key: string): ResolvedArenaTexture | undefined {
  if (!edition.bindings?.[key]) return undefined;
  const resolved = resolveAssetBinding(edition, key);
  return { textureKey: resolved.textureKey, frame: resolved.binding.frame };
}

/**
 * Places one image or sprite in the graveyard.
 * @param scene Active Phaser scene.
 * @param x Horizontal display position.
 * @param y Vertical display position.
 * @param texture Resolved pack texture.
 * @param displayWidth Drawn width.
 * @param displayHeight Drawn height.
 * @param depth Draw order.
 * @param originX Horizontal origin.
 * @param originY Vertical origin.
 * @returns The created image, when Phaser display services exist.
 */
function placeImage(
  scene: PhaserSceneLike,
  x: number,
  y: number,
  texture: ResolvedArenaTexture,
  displayWidth: number,
  displayHeight: number,
  depth: number,
  originX = 0.5,
  originY = 1,
): PhaserImageLike | undefined {
  const image = scene.add?.sprite?.(x, y, texture.textureKey, texture.frame ?? 0)
    ?? scene.add?.image?.(x, y, texture.textureKey, texture.frame ?? 0);
  image?.setOrigin?.(originX, originY);
  image?.setDisplaySize?.(displayWidth, displayHeight);
  image?.setDepth?.(depth);
  return image;
}

/**
 * Destroys persistent dirt and gravestone sprites.
 * @param resources Live scene resource bag.
 * @returns Nothing. Clears world sprite ownership.
 */
function destroyWorldLayer(resources: SceneResources): void {
  resources.ground?.destroy();
  resources.ground = undefined;
  for (const sprite of resources.worldSprites) sprite.destroy();
  resources.worldSprites.length = 0;
  resources.worldWidth = 0;
  resources.worldHeight = 0;
}

/**
 * Builds tiled graveyard dirt and gravestones once per canvas size.
 * @param scene Active Phaser scene.
 * @param resources Live scene resource bag.
 * @param edition Audience edition supplied by the host.
 * @param width Current scene width.
 * @param height Current scene height.
 * @returns Nothing. Creates world sprites when missing.
 */
function ensureWorldLayer(
  scene: PhaserSceneLike,
  resources: SceneResources,
  edition: RuntimeEdition,
  width: number,
  height: number,
): void {
  if (resources.worldWidth === width && resources.worldHeight === height && resources.ground) return;
  destroyWorldLayer(resources);
  resources.worldWidth = width;
  resources.worldHeight = height;
  const ground = arenaTexture(edition, "world:ground");
  if (ground) {
    if (scene.add?.tileSprite) {
      const tiled = scene.add.tileSprite(0, 0, width, height, ground.textureKey);
      tiled.setOrigin?.(0, 0);
      tiled.setDepth?.(-25);
      resources.ground = tiled;
    } else {
      const image = placeImage(scene, width / 2, height / 2, ground, width, height, -25, 0.5, 0.5);
      if (image) resources.ground = image;
    }
  }
  for (const feature of GRAVEYARD_FEATURES) {
    const texture = arenaTexture(edition, `prop:${feature.prop}`);
    if (!texture) continue;
    const image = placeImage(
      scene,
      feature.x * width / GAME_WIDTH,
      feature.y * height / GAME_HEIGHT,
      texture,
      feature.width * width / GAME_WIDTH,
      feature.height * height / GAME_HEIGHT,
      -6,
    );
    if (image) resources.worldSprites.push(image);
  }
}

/**
 * Moves or creates one keyed sprite and drops sprites that no longer have an item.
 * @param scene Active Phaser scene.
 * @param sprites Live sprite map keyed by gameplay identity.
 * @param items Current items to show.
 * @param texture Pack texture for the role.
 * @param size Drawn size.
 * @param depth Draw order.
 * @returns Nothing. Mutates the sprite map.
 */
function syncKeyedSprites(
  scene: PhaserSceneLike,
  sprites: Map<string, PhaserImageLike>,
  items: readonly { readonly id: string; readonly x: number; readonly y: number }[],
  texture: ResolvedArenaTexture | undefined,
  size: number,
  depth: number,
): void {
  if (!texture) return;
  const seen = new Set<string>();
  for (const item of items) {
    seen.add(item.id);
    const current = sprites.get(item.id);
    const sprite = current ?? placeImage(scene, item.x, item.y, texture, size, size, depth);
    sprite?.setPosition?.(item.x, item.y);
    sprite?.setDisplaySize?.(size, size);
    sprite?.setVisible?.(true);
    if (sprite) sprites.set(item.id, sprite);
  }
  for (const [id, sprite] of sprites) {
    if (seen.has(id)) continue;
    sprite.destroy();
    sprites.delete(id);
  }
}

function heldVelocity(held: ReadonlySet<string>, normalize: (descriptor: {
  readonly modality: "keyboard";
  readonly code: string;
}) => readonly { readonly action: InputActionId }[]): GameplayVector {
  let axisX = 0;
  let axisY = 0;
  const seen = new Set<InputActionId>();
  for (const code of held) {
    const action = normalize({ modality: "keyboard", code })[0]?.action;
    if (!action || seen.has(action)) continue;
    seen.add(action);
    if (action === "move-left") axisX -= 1;
    if (action === "move-right") axisX += 1;
    if (action === "move-up") axisY -= 1;
    if (action === "move-down") axisY += 1;
  }
  if (axisX === 0 && axisY === 0) return Object.freeze({ x: 0, y: 0 });
  const length = Math.hypot(axisX, axisY);
  return Object.freeze({
    x: axisX / length * WIZARD_MOVE_SPEED,
    y: axisY / length * WIZARD_MOVE_SPEED,
  });
}

function createScene(context: WizardVsZombieSceneContext): Readonly<Record<string, unknown>> {
  let resources: SceneResources | undefined;
  let composition = context.composition;
  let cleaned = false;
  const arenaArt = usesArenaArt(context.edition);
  const normalize = createInputActionNormalizer({
    keyboard: WIZARD_VS_ZOMBIE_KEYBOARD_BINDINGS,
    pointerTap: { action: "confirm" },
    pointerDrag: {
      leftAction: "move-left",
      rightAction: "move-right",
      upAction: "move-up",
      downAction: "move-down",
      threshold: 24,
    },
  });
  const frameScheduler = createBoundedFrameScheduler(() => undefined);

  const dimensions = (scene: PhaserSceneLike): { width: number; height: number } => ({
    width: scene.scale?.width ?? GAME_WIDTH,
    height: scene.scale?.height ?? GAME_HEIGHT,
  });

  const scaledPoint = (point: WizardVsZombiePoint, width: number, height: number): WizardVsZombiePoint => ({
    x: point.x * width / GAME_WIDTH,
    y: point.y * height / GAME_HEIGHT,
  });

  const directionToPoint = (
    player: WizardVsZombiePoint,
    point: WizardVsZombiePoint,
  ): WizardVsZombieDirection | undefined => {
    const horizontal = point.x - player.x;
    const vertical = point.y - player.y;
    if (horizontal === 0 && vertical === 0) return undefined;
    if (Math.abs(horizontal) >= Math.abs(vertical)) return horizontal > 0 ? "move-right" : "move-left";
    return vertical > 0 ? "move-down" : "move-up";
  };

  const pointerInScene = (
    scene: PhaserSceneLike,
    clientX: number,
    clientY: number,
    width: number,
    height: number,
  ): WizardVsZombiePoint => {
    const rect = scene.game?.canvas?.getBoundingClientRect?.();
    if (!rect || rect.width <= 0 || rect.height <= 0) return { x: clientX, y: clientY };
    return {
      x: (clientX - rect.left) * width / rect.width,
      y: (clientY - rect.top) * height / rect.height,
    };
  };

  const updateView = (scene: PhaserSceneLike): void => {
    if (!resources) return;
    const { width, height } = dimensions(scene);
    const state = context.controller.snapshot();
    const scale = Math.min(width / GAME_WIDTH, height / GAME_HEIGHT);
    const wizard = scaledPoint(state.wizard, width, height);
    resources.night.clear();
    resources.graphics.clear();
    if (arenaArt) {
      ensureWorldLayer(scene, resources, context.edition, width, height);
      resources.night.fillStyle(0x070204, 0.58).fillRect(0, 0, width, height);
      resources.night.fillStyle(0x000000, 0.28).fillRect(0, 0, width, height * 0.22);
      resources.night.fillStyle(0x000000, 0.34).fillRect(0, height * 0.82, width, height * 0.18);
      const orbTexture = arenaTexture(context.edition, "prop:orb");
      const enemyTexture = arenaTexture(context.edition, "enemy:idle");
      const playerTexture = arenaTexture(context.edition, "player:idle");
      syncKeyedSprites(
        scene,
        resources.orbSprites,
        state.orbs.map((orb) => {
          const point = scaledPoint(orb, width, height);
          return { id: orb.id, x: point.x, y: point.y };
        }),
        orbTexture,
        Math.max(52, ORB_RADIUS * 2.2 * scale),
        5,
      );
      syncKeyedSprites(
        scene,
        resources.zombieSprites,
        state.zombies.map((zombie) => {
          const point = scaledPoint(zombie, width, height);
          return { id: zombie.id, x: point.x, y: point.y };
        }),
        enemyTexture,
        Math.max(84, ZOMBIE_RADIUS * 5.4 * scale),
        6,
      );
      if (playerTexture) {
        const size = Math.max(88, WIZARD_RADIUS * 4.4 * scale);
        const sprite = resources.playerSprite
          ?? placeImage(scene, wizard.x, wizard.y, playerTexture, size, size, 7);
        sprite?.setPosition?.(wizard.x, wizard.y);
        sprite?.setDisplaySize?.(size, size);
        sprite?.setVisible?.(true);
        resources.playerSprite = sprite;
      }
    } else {
      resources.graphics.fillStyle(0x070204, 1).fillRect(0, 0, width, height);
      resources.graphics.fillStyle(0x1a0b0d, 0.96).fillRect(width * 0.04, height * 0.18, width * 0.92, height * 0.72);
      for (const zombie of state.zombies) {
        const point = scaledPoint(zombie, width, height);
        resources.graphics.fillStyle(0x7f1d1d, 0.95).fillCircle(point.x, point.y, zombie.radius * scale);
      }
      resources.graphics.fillStyle(0xd6d3d1, 1).fillCircle(wizard.x, wizard.y, WIZARD_RADIUS * scale);
      for (const [index, orb] of state.orbs.entries()) {
        const point = scaledPoint(orb, width, height);
        const pulse = Math.sin(state.gameTimeMs / 260 + index) * 3;
        resources.graphics.fillStyle(0x67e8f9, 0.9).fillCircle(point.x, point.y + pulse, ORB_RADIUS * scale);
      }
    }
    for (const [index, orb] of state.orbs.entries()) {
      const point = scaledPoint(orb, width, height);
      resources.orbLabels[index]?.setText(orb.translation).setPosition(point.x - 50 * scale, point.y + (ORB_RADIUS + 10) * scale);
    }
    resources.title.setText("WIZARD VS ZOMBIE").setPosition(28, 18);
    resources.prompt.setText(`The living word: ${state.prompt}`).setPosition(28, 58);
    resources.progress.setText(
      `${composition?.profile === "compact" ? "Compact arena" : "Night arena"}  •  Horde ${state.zombies.length}  •  Souls ${Math.min(state.targetIndex + 1, state.targetCount)}/${state.targetCount}  •  Score ${state.score}`,
    ).setPosition(28, 98);
    resources.health.setText(
      `Health ${state.health}/${state.maxHealth}  •  Shockwave ${state.shockwaveCharges}/${state.maxShockwaveCharges}`,
    ).setPosition(28, 128);
    resources.feedback.setText(
      state.phase === "victory"
        ? "The last soul is yours. Dawn breaks."
        : state.phase === "defeat"
          ? "The horde takes the graveyard."
          : state.lastOutcome === "incorrect"
            ? "That soul was false. The dead close in."
            : "Take the true soul. Hold the line. Cast when they reach you.",
    ).setPosition(28, height - 66);
    resources.instructions.setText(
      "Hold WASD or arrows to move  •  Space casts a shockwave  •  Swipe or tap to step",
    ).setPosition(28, height - 34);
  };

  const report = (result: WizardVsZombieActionResult): void => {
    if (!result.attempted && !result.terminal) return;
    context.diagnostic({
      level: "info",
      code: result.terminal ? "WIZARD_VS_ZOMBIE_TERMINAL" : "WIZARD_VS_ZOMBIE_ORB",
      message: result.terminal ? "Wizard vs Zombie reached a terminal state." : "Wizard vs Zombie resolved a soul.",
      details: {
        correct: result.correct,
        targetIndex: result.snapshot.targetIndex,
        totalAttempts: result.snapshot.totalAttempts,
      },
    });
  };

  const cleanup = (): void => {
    if (cleaned) return;
    cleaned = true;
    frameScheduler.cancel();
    context.inputController.cancelActiveGesture();
    context.controller.destroy();
    const active = resources;
    resources = undefined;
    if (!active) return;
    destroyWorldLayer(active);
    active.playerSprite?.destroy();
    for (const sprite of active.orbSprites.values()) sprite.destroy();
    active.orbSprites.clear();
    for (const sprite of active.zombieSprites.values()) sprite.destroy();
    active.zombieSprites.clear();
    active.night.destroy();
    active.graphics.destroy();
    active.title.destroy();
    active.prompt.destroy();
    active.progress.destroy();
    active.health.destroy();
    active.feedback.destroy();
    active.instructions.destroy();
    for (const label of active.orbLabels) label.destroy();
  };

  const preload = function (this: PhaserSceneLike): void {
    if (!this.load || !arenaArt) return;
    const keys = ARENA_ART_KEYS.filter((key) => Boolean(context.edition.bindings?.[key]));
    if (keys.length === 0) return;
    preloadAssetBindings(this.load, context.edition, keys);
  };

  const create = function (this: PhaserSceneLike): void {
    if (!this.add) throw new Error("Wizard vs Zombie requires Phaser display services");
    const textWidth = Math.max(220, (context.composition?.safeRect?.width ?? GAME_WIDTH) - 56);
    const style = {
      fontFamily: "Arial",
      color: "#fecaca",
      fontSize: "19px",
      wordWrap: { width: textWidth },
      stroke: "#140507",
      strokeThickness: 5,
    };
    const night = this.add.graphics();
    night.setDepth?.(1);
    const graphics = this.add.graphics();
    graphics.setDepth?.(2);
    const title = this.add.text(28, 18, "WIZARD VS ZOMBIE", { ...style, fontSize: "30px", fontStyle: "bold", color: "#fee2e2" });
    const prompt = this.add.text(28, 58, "", { ...style, fontSize: "22px" });
    const progress = this.add.text(28, 98, "", { ...style, fontSize: "16px", color: "#fca5a5" });
    const health = this.add.text(28, 128, "", { ...style, fontSize: "16px", color: "#86efac" });
    const feedback = this.add.text(28, 0, "", { ...style, fontSize: "17px", color: "#fde68a" });
    const instructions = this.add.text(28, 0, "", { ...style, fontSize: "15px", color: "#d6d3d1" });
    const orbLabels = SOUL_POSITIONS.map(() => this.add!.text(0, 0, "", { ...style, fontSize: "16px", color: "#e2e8f0" }));
    for (const text of [title, prompt, progress, health, feedback, instructions, ...orbLabels]) {
      text.setDepth?.(20);
    }
    resources = {
      night,
      graphics,
      title,
      prompt,
      progress,
      health,
      feedback,
      instructions,
      orbLabels,
      worldSprites: [],
      orbSprites: new Map(),
      zombieSprites: new Map(),
      worldWidth: 0,
      worldHeight: 0,
    };
    this.events?.once("shutdown", cleanup);
    this.events?.once("destroy", cleanup);
    updateView(this);
  };

  const update = function (this: PhaserSceneLike, _time = 0, delta = 0): void {
    if (!resources || cleaned) return;
    frameScheduler.tick(delta);
    const deltaMs = frameScheduler.lastDeltaMs;
    if (context.sessionMode === "playing") {
      const input = context.inputController.snapshot();
      const attemptsBeforeInput = context.controller.snapshot().totalAttempts;
      const held = new Set([...(input.pressed ?? []), ...input.keys]);
      const velocity = heldVelocity(held, normalize);
      if (velocity.x !== 0 || velocity.y !== 0) {
        report(context.controller.steer(velocity, deltaMs));
      }
      for (const code of input.pressed ?? []) {
        const action = normalize({ modality: "keyboard", code })[0]?.action;
        if (action === "confirm") report(context.controller.castShockwave());
      }
      if (input.pointer.released && !input.pointer.cancelled) {
        const drag = normalize({
          modality: "pointer",
          phase: "drag",
          x: input.pointer.x,
          y: input.pointer.y,
          deltaX: input.pointer.x - input.pointer.startX,
          deltaY: input.pointer.y - input.pointer.startY,
        })[0]?.action;
        if (drag && drag !== "confirm") {
          report(context.controller.move(drag as WizardVsZombieDirection));
        } else {
          const tap = normalize({ modality: "pointer", phase: "up", x: input.pointer.x, y: input.pointer.y })[0]?.action;
          if (tap === "confirm") {
            const { width, height } = dimensions(this);
            const point = pointerInScene(this, input.pointer.x, input.pointer.y, width, height);
            if (point.x >= width * 0.86 && point.y <= height * 0.16) {
              report(context.controller.castShockwave());
            } else {
              const state = context.controller.snapshot();
              const direction = directionToPoint(state.wizard, {
                x: point.x * GAME_WIDTH / width,
                y: point.y * GAME_HEIGHT / height,
              });
              if (direction) report(context.controller.move(direction));
            }
          }
        }
      }
      if (context.controller.snapshot().totalAttempts === attemptsBeforeInput) {
        report(context.controller.advance(deltaMs));
      }
    }
    updateView(this);
  };

  return {
    key: WIZARD_VS_ZOMBIE_ID,
    preload,
    create,
    update,
    extend: {
      apkCaptureResponsiveState: () => context.controller.capture(),
      apkRestoreResponsiveState: (state: unknown) => {
        if (typeof state !== "object" || state === null) throw new Error("Wizard vs Zombie responsive state is invalid");
        context.controller.restore(state as WizardVsZombieSnapshot);
      },
      apkRecompose: (nextComposition: WizardVsZombieSceneContext["composition"]) => {
        composition = nextComposition;
      },
    },
  };
}

/** Creates the Wizard vs Zombie standard APK cartridge. */
export function createWizardVsZombieCartridge(): StandardExperienceCartridge {
  let activeController: WizardVsZombieController | undefined;
  const standardExperience = createCartridgeStandardExperience({
    id: WIZARD_VS_ZOMBIE_ID,
    title: "Wizard vs Zombie",
    description: "Survive the graveyard. Collect the true soul. Hold the horde back.",
    inputMode: "vocabulary",
    objective: "Collect every true soul before the horde reaches you.",
    mechanicInstruction: "Hold the arrows to move. Touch the matching soul. Cast a shockwave when the dead close in.",
    keyboardKeys: ["W", "A", "S", "D", "Arrow keys", "Space"],
    executeTutorialAction: (actionId) => {
      const controller = activeController;
      if (!controller) return;
      const orb = actionId === "action:select-correct"
        ? controller.snapshot().orbs.find((candidate) => candidate.isCorrect)
        : controller.snapshot().orbs.find((candidate) => !candidate.isCorrect);
      if (orb) controller.collectOrb(orb.id);
    },
  });

  return {
    manifest: {
      id: WIZARD_VS_ZOMBIE_ID,
      title: "Wizard vs Zombie",
      description: "Survive the graveyard. Collect the true soul. Hold the horde back.",
      runtimeApiVersion: "1.0.0",
      inputMode: "vocabulary",
      requiredAssetBindings: ["legacy-catalog/wizard-vs-zombie/zombie-orbs"],
      capabilities: [
        "capability:bounded-frame-delta",
        "capability:input-action-normalization",
        "capability:nonempty-content-precondition",
        "capability:result-accounting",
        "capability:single-completion-emission",
        "capability:orb-lane-collection",
        "capability:shockwave-energy-charge",
        "capability:zombie-hazard-pressure",
      ],
    },
    standardExperience,
    createGameConfig(context: CartridgeGameConfigContext): Readonly<Record<string, unknown>> {
      const input = vocabularyInputSchema.parse(context.input);
      const sessionMode = context.sessionMode ?? "playing";
      const controller = createWizardVsZombieController(
        input,
        sessionMode === "playing" ? (result, outcome) => context.complete(result, outcome) : () => undefined,
        { seed: context.seed },
      );
      activeController = controller;
      context.diagnostic({
        level: "debug",
        code: "WIZARD_VS_ZOMBIE_READY",
        message: "Wizard vs Zombie graveyard is ready.",
        details: { cartridgeId: WIZARD_VS_ZOMBIE_ID, editionId: context.edition.id, targetCount: input.length },
      });
      return {
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        render: { antialias: false, pixelArt: true },
        scene: createScene({
          controller,
          inputController: context.inputController,
          composition: context.composition,
          diagnostic: context.diagnostic,
          sessionMode,
          edition: context.edition,
        }),
      };
    },
  };
}
