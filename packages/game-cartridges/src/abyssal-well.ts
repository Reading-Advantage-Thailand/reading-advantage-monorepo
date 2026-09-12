import {
  gameResultsSchema,
  sentenceInputSchema,
  type GameResults,
} from "@reading-advantage/game-contracts";
import {
  createActorSpriteLayer,
  createBoundedFrameScheduler,
  calculateXp,
  createCompletionLatch,
  createInputActionNormalizer,
  createLanguageTargetProgression,
  preloadAssetBindings,
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

/** Stable public identifier for The Abyssal Well cartridge. */
export const ABYSSAL_WELL_ID = "abyssal-well" as const;

/** Procedural canvas size used before host scaling. */
export const ABYSSAL_WELL_CANVAS: Readonly<{ width: number; height: number }> = Object.freeze({ width: 960, height: 540 });

/** Number of radial lanes in the well. */
export const ABYSSAL_WELL_LANES = 8 as const;

/** Gameplay tuning values retained from the legacy Abyssal Well design. */
export const ABYSSAL_WELL_CONFIG = Object.freeze({
  gameWidth: 390,
  gameHeight: 700,
  lanes: ABYSSAL_WELL_LANES,
  rimRadius: 120,
  wellDepth: 5,
  player: Object.freeze({ fireRate: 300, projectileSpeed: 400, radius: 18 }),
  enemy: Object.freeze({ baseSpeed: 50, spawnInterval: 2_000, radius: 20, wordOrbRadius: 25 }),
  creatureSpeeds: Object.freeze({
    "goblin-scout": 50,
    "cave-spider": 70,
    "shadow-demon": 90,
  }),
  difficulties: Object.freeze({
    easy: Object.freeze({ name: "Shallow Well", wordCount: 4 }),
    medium: Object.freeze({ name: "Deep Chasm", wordCount: 5 }),
    hard: Object.freeze({ name: "Abyss", wordCount: 6 }),
  }),
  lives: 3,
});

/** Keyboard bindings for radial movement and firing. */
export const ABYSSAL_WELL_KEYBOARD_BINDINGS: Readonly<Record<string, InputActionId>> = Object.freeze({
  ArrowLeft: "move-left",
  KeyA: "move-left",
  ArrowRight: "move-right",
  KeyD: "move-right",
  Space: "confirm",
  Enter: "confirm",
});

/** Supported Abyssal Well difficulty labels. */
export type AbyssalWellDifficulty = "easy" | "medium" | "hard";

/** Supported procedural enemy forms. */
export type CreatureType = "goblin-scout" | "cave-spider" | "shadow-demon";

/** Active and terminal phases in a radial shooter session. */
export type AbyssalWellPhase = "start" | "playing" | "victory" | "defeat";

/** Outcome of the latest projectile collision. */
export type AbyssalWellOutcome = "correct" | "incorrect";

/** Player state at the well rim. */
export interface AbyssalWellPlayer {
  /** Current radial lane. */
  readonly lane: number;
  /** Remaining rim lives. */
  readonly lives: number;
  /** Game time of the latest projectile launch. */
  readonly lastFireTime: number;
}

/** A deterministic word enemy climbing one radial lane. */
export interface AbyssalWellEnemy {
  /** Stable session-local enemy identity. */
  readonly id: string;
  /** Radial lane occupied by the enemy. */
  readonly lane: number;
  /** Progress from the well center to the rim. */
  readonly depth: number;
  /** Word printed on the enemy orb. */
  readonly word: string;
  /** Flattened sentence-word index, or -1 for a tutorial-only decoy. */
  readonly wordIndex: number;
  /** Procedural enemy form. */
  readonly type: CreatureType;
}

/** A projectile travelling from the rim toward the well center. */
export interface AbyssalWellProjectile {
  /** Stable session-local projectile identity. */
  readonly id: string;
  /** Radial lane occupied by the projectile. */
  readonly lane: number;
  /** Progress from the rim toward the well center. */
  readonly depth: number;
}

/** Mutable-rule state returned as immutable snapshots by the cartridge. */
export interface AbyssalWellState {
  /** Current session phase. */
  readonly phase: AbyssalWellPhase;
  /** Compatibility alias for the current session phase. */
  readonly status: AbyssalWellPhase;
  /** Player position and lives. */
  readonly player: AbyssalWellPlayer;
  /** Active climbing word enemies. */
  readonly enemies: readonly AbyssalWellEnemy[];
  /** Active fired projectiles. */
  readonly projectiles: readonly AbyssalWellProjectile[];
  /** Current sentence prompt. */
  readonly sentence: Readonly<{ term: string; translation: string }>;
  /** Full finite sentence set. */
  readonly sentences: readonly Readonly<{ term: string; translation: string }>[];
  /** Current sentence translation prompt. */
  readonly prompt: string;
  /** Current ordered word answer. */
  readonly answer: string;
  /** Flattened ordered words across the sentence set. */
  readonly words: readonly string[];
  /** Index of the next required word. */
  readonly targetIndex: number;
  /** Number of ordered sentence words in the finite session. */
  readonly targetCount: number;
  /** Semantic action that fires at the current target lane. */
  readonly correctAction: InputActionId;
  /** Semantic actions accepted by the controller. */
  readonly availableActions: readonly InputActionId[];
  /** Remaining ordered-word energy. */
  readonly energy: number;
  /** Remaining rim lives. */
  readonly lives: number;
  /** Current learning score. */
  readonly score: number;
  /** Shared result-accounting correct-answer alias. */
  readonly correctAnswers: number;
  /** Current result-accounting accuracy. */
  readonly accuracy: number;
  /** Number of correct projectile collisions. */
  readonly correctWords: number;
  /** Number of projectile-enemy collisions. */
  readonly totalAttempts: number;
  /** Current game clock in milliseconds. */
  readonly gameTime: number;
  /** Selected enemy speed profile. */
  readonly difficulty: AbyssalWellDifficulty;
  /** Selected procedural enemy form. */
  readonly creatureType: CreatureType;
  /** Latest collision outcome, when one exists. */
  readonly lastOutcome?: AbyssalWellOutcome;
  /** First terminal result, when the session has finished. */
  readonly result?: GameResults;
  /** Deterministic seed used for default spawning. */
  readonly seed: number;
  /** Number of enemies spawned in this session. */
  readonly spawnSerial: number;
  /** Game time at which the last enemy spawned. */
  readonly lastSpawnTime: number;
  /** Next entity sequence number. */
  readonly nextEntityId: number;
  /** Whether lifecycle cleanup has sealed this state. */
  readonly destroyed: boolean;
}

/** Optional deterministic setup for a state or controller. */
export interface AbyssalWellConfig {
  /** Optional deterministic random source used to derive a seed. */
  readonly rng?: () => number;
  /** Optional fixed seed for deterministic default spawning. */
  readonly seed?: number;
  /** Enemy speed profile. */
  readonly difficulty?: AbyssalWellDifficulty;
  /** Procedural enemy form. */
  readonly creatureType?: CreatureType;
  /** Enables the deterministic decoy used by safe tutorial demonstrations. */
  readonly tutorialOnly?: boolean;
}

/** Result returned after one controller action. */
export interface AbyssalWellActionResult {
  /** Whether the action changed the active session. */
  readonly accepted: boolean;
  /** Whether the latest action produced a correct collision. */
  readonly correct: boolean;
  /** Whether the ordered target advanced. */
  readonly progressed: boolean;
  /** Whether the action produced a terminal phase. */
  readonly terminal: boolean;
  /** Compatibility alias for terminal. */
  readonly completed: boolean;
  /** Result emitted by the first terminal action. */
  readonly result?: GameResults;
  /** State after the action. */
  readonly snapshot: AbyssalWellState;
}

/** Controller for radial movement, firing, simulation, and cleanup. */
export interface AbyssalWellController {
  /** Returns the current immutable session state. */
  snapshot(): AbyssalWellState;
  /** Starts a session that was created in the start phase. */
  start(): AbyssalWellState;
  /** Rotates the player one or more lanes. */
  rotate(direction: number): AbyssalWellState;
  /** Applies one semantic movement or firing action. */
  choose(action: InputActionId): AbyssalWellActionResult;
  /** Fires one projectile in the active lane when ready. */
  fire(): AbyssalWellActionResult;
  /** Spawns one deterministic enemy when a free word exists. */
  spawn(rng?: () => number): AbyssalWellState;
  /** Spawns one deterministic decoy for the one-word tutorial demonstration. */
  spawnTutorialDecoy(): AbyssalWellState;
  /** Advances movement, collisions, rim hazards, and terminal checks. */
  advance(deltaMs: number): AbyssalWellState;
  /** Applies one direct rim hazard. */
  applyHazard(): AbyssalWellActionResult;
  /** Captures state before responsive recomposition. */
  capture(): AbyssalWellState;
  /** Restores validated state after responsive recomposition. */
  restore(snapshot: AbyssalWellState): void;
  /** Seals the session and prevents later delivery. */
  destroy(): void;
}

/** Minimal Phaser graphics surface used by the procedural scene. */
interface PhaserGraphicsLike {
  clear(): this;
  fillStyle(color: number, alpha?: number): this;
  fillRect(x: number, y: number, width: number, height: number): this;
  fillCircle(x: number, y: number, radius: number): this;
  fillRoundedRect(x: number, y: number, width: number, height: number, radius?: number): this;
  lineStyle(lineWidth: number, color: number, alpha?: number): this;
  strokeRoundedRect(x: number, y: number, width: number, height: number, radius?: number): this;
  lineBetween(x1: number, y1: number, x2: number, y2: number): this;
  setDepth?(depth: number): this;
  destroy(): void;
}

/** Minimal Phaser text surface used by the procedural scene. */
interface PhaserTextLike {
  setPosition(x: number, y: number): this;
  setText(value: string): this;
  setOrigin?(x: number, y?: number): this;
  setDepth?(depth: number): this;
  destroy(): void;
}

/** Minimal Phaser canvas surface needed for pointer conversion. */
interface PhaserCanvasLike {
  getBoundingClientRect?(): {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
  };
}

/** Minimal Phaser scene surface used by the procedural scene. */
interface PhaserSceneLike {
  add?: {
    graphics(): PhaserGraphicsLike;
    text(x: number, y: number, value: string, style?: Readonly<Record<string, unknown>>): PhaserTextLike;
    image?(x: number, y: number, key: string, frame?: number): ActorSpriteLike;
    sprite?(x: number, y: number, key: string, frame?: number): ActorSpriteLike;
    tileSprite?(x: number, y: number, width: number, height: number, key: string): ActorSpriteLike;
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

/** Display objects owned by one active scene. */
interface SceneResources {
  readonly art: ActorSpriteLayer;
  readonly graphics: PhaserGraphicsLike;
  readonly enemyOverlay: PhaserGraphicsLike;
  readonly title: PhaserTextLike;
  readonly prompt: PhaserTextLike;
  readonly progress: PhaserTextLike;
  readonly feedback: PhaserTextLike;
  readonly instructions: PhaserTextLike;
  readonly controlLeft: PhaserTextLike;
  readonly controlFire: PhaserTextLike;
  readonly controlRight: PhaserTextLike;
  readonly enemyLabels: Map<string, PhaserTextLike>;
}

/** Context passed from the cartridge to its procedural scene. */
interface AbyssalWellSceneContext {
  readonly edition: RuntimeEdition;
  readonly controller: AbyssalWellController;
  readonly inputController: APKInputController;
  readonly composition: CartridgeGameConfigContext["composition"];
  readonly diagnostic: CartridgeGameConfigContext["diagnostic"];
  readonly sessionMode: NonNullable<CartridgeGameConfigContext["sessionMode"]>;
}

const MAX_DELTA_MS = 50;
const MAX_ACTIVE_ENEMIES = 4;
const COLLISION_DEPTH = 0.12;
const PROJECTILE_DEPTH_SPEED = ABYSSAL_WELL_CONFIG.player.projectileSpeed / 200_000;
const DIFFICULTY_SPEED_MULTIPLIER: Readonly<Record<AbyssalWellDifficulty, number>> = Object.freeze({
  easy: 0.7,
  medium: 1,
  hard: 1.3,
});
const ABYSSAL_WELL_ACTIONS: readonly InputActionId[] = Object.freeze([
  "move-left",
  "move-right",
  "confirm",
]);
type AbyssalWellTerminalOutcome = Exclude<GameTerminalOutcome, "complete">;
type AbyssalWellCompletionDelivery = (
  result: GameResults,
  outcome: AbyssalWellTerminalOutcome,
) => void | Promise<void>;

function clampRandom(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(0.999_999, value));
}

function normalizeSeed(value: number): number {
  if (!Number.isFinite(value)) throw new Error("Abyssal Well seed must be finite");
  return Math.abs(Math.trunc(value)) % 1_000_000;
}

function tokenize(sentence: string): readonly string[] {
  return Object.freeze(sentence.trim().split(/\s+/u).filter(Boolean));
}

function freezeState(state: AbyssalWellState): AbyssalWellState {
  const targetCount = state.words.length;
  const sentence = currentSentence(state.sentences, state.words, state.targetIndex);
  return Object.freeze({
    ...state,
    status: state.phase,
    sentence: Object.freeze({ ...sentence }),
    prompt: sentence.translation,
    answer: state.words[state.targetIndex] ?? "",
    targetCount,
    correctAction: "confirm" as const,
    availableActions: ABYSSAL_WELL_ACTIONS,
    energy: Math.max(0, targetCount - state.targetIndex),
    lives: state.player.lives,
    score: state.correctWords * 100,
    correctAnswers: state.correctWords,
    accuracy: state.totalAttempts === 0 ? 0 : state.correctWords / state.totalAttempts,
    lastOutcome: state.lastOutcome,
    result: state.result,
    player: Object.freeze({ ...state.player }),
    enemies: Object.freeze(state.enemies.map((enemy) => Object.freeze({ ...enemy }))),
    projectiles: Object.freeze(state.projectiles.map((projectile) => Object.freeze({ ...projectile }))),
    sentences: Object.freeze(state.sentences.map((sentence) => Object.freeze({ ...sentence }))),
    words: Object.freeze([...state.words]),
  });
}

function currentSentence(
  sentences: readonly Readonly<{ term: string; translation: string }>[],
  words: readonly string[],
  targetIndex: number,
): Readonly<{ term: string; translation: string }> {
  let wordCount = 0;
  for (const sentence of sentences) {
    const sentenceWords = tokenize(sentence.term);
    if (targetIndex < wordCount + sentenceWords.length || targetIndex >= words.length) return sentence;
    wordCount += sentenceWords.length;
  }
  return sentences[sentences.length - 1]!;
}

function createInitialSeed(config: AbyssalWellConfig): number {
  if (config.seed !== undefined) return normalizeSeed(config.seed);
  return normalizeSeed(Math.floor(clampRandom(config.rng?.() ?? 0.5) * 1_000_000));
}

function withState(state: AbyssalWellState, changes: Partial<AbyssalWellState>): AbyssalWellState {
  return freezeState({ ...state, ...changes });
}

function enemyDepthSpeed(state: AbyssalWellState): number {
  const creatureSpeed = ABYSSAL_WELL_CONFIG.creatureSpeeds[state.creatureType];
  return (creatureSpeed / 350_000) * DIFFICULTY_SPEED_MULTIPLIER[state.difficulty];
}

function nextDefaultLane(state: AbyssalWellState): number {
  return (state.seed + state.spawnSerial * 3) % ABYSSAL_WELL_LANES;
}

function availableWordIndexes(state: AbyssalWellState): readonly number[] {
  const occupied = new Set(state.enemies.map((enemy) => enemy.wordIndex));
  return Object.freeze(state.words
    .map((_word, index) => index)
    .filter((index) => index >= state.targetIndex && !occupied.has(index)));
}

function spawnTutorialDecoy(state: AbyssalWellState): AbyssalWellState {
  if (state.phase !== "playing" || state.destroyed || state.words.length !== 1 || state.enemies.length > 0) return state;
  const enemy: AbyssalWellEnemy = {
    id: `enemy-${state.nextEntityId}`,
    lane: nextDefaultLane(state),
    depth: 0,
    word: state.words[0]!,
    wordIndex: -1,
    type: state.creatureType,
  };
  return withState(state, {
    enemies: [enemy],
    spawnSerial: state.spawnSerial + 1,
    lastSpawnTime: state.gameTime,
    nextEntityId: state.nextEntityId + 1,
  });
}

function actionResult(
  snapshot: AbyssalWellState,
  values: Omit<AbyssalWellActionResult, "snapshot">,
): AbyssalWellActionResult {
  return Object.freeze({ ...values, snapshot });
}

function resultFor(state: AbyssalWellState): GameResults {
  const accuracy = state.totalAttempts === 0 ? 0 : state.correctWords / state.totalAttempts;
  return gameResultsSchema.parse({
    correctAnswers: state.correctWords,
    totalAttempts: state.totalAttempts,
    accuracy,
    score: state.score,
    xp: calculateXp(
      { correctAnswers: state.correctWords, totalAttempts: state.totalAttempts, accuracy },
      { xpPerCorrect: 20, xpPerAccuracyPoint: 10 },
    ),
  });
}

function normalizeDelta(deltaMs: number): number {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new Error("Abyssal Well delta must be nonnegative");
  return Math.min(MAX_DELTA_MS, deltaMs);
}

function resolveCollisions(state: AbyssalWellState, previousState = state): AbyssalWellState {
  const projectiles = [...state.projectiles];
  const enemies = [...state.enemies];
  let targetIndex = state.targetIndex;
  let correctWords = state.correctWords;
  let totalAttempts = state.totalAttempts;
  let score = state.score;
  let lastOutcome = state.lastOutcome;
  const progression = createLanguageTargetProgression(state.words.map((_word, index) => `word:${index}`));
  for (let index = 0; index < state.targetIndex; index += 1) progression.match(`word:${index}`);

  for (let projectileIndex = projectiles.length - 1; projectileIndex >= 0; projectileIndex -= 1) {
    const projectile = projectiles[projectileIndex]!;
    const previousProjectile = previousState.projectiles.find((candidate) => candidate.id === projectile.id) ?? projectile;
    const enemyIndex = enemies.findIndex((enemy) =>
      enemy.lane === projectile.lane && (
        Math.abs(enemy.depth - projectile.depth) <= COLLISION_DEPTH
        || (() => {
          const previousEnemy = previousState.enemies.find((candidate) => candidate.id === enemy.id) ?? enemy;
          const startGap = previousProjectile.depth - previousEnemy.depth;
          const endGap = projectile.depth - enemy.depth;
          return startGap * endGap <= 0;
        })()
      ),
    );
    if (enemyIndex < 0) continue;

    const enemy = enemies[enemyIndex]!;
    projectiles.splice(projectileIndex, 1);
    enemies.splice(enemyIndex, 1);
    const correct = enemy.word === state.words[targetIndex];
    totalAttempts += 1;
    lastOutcome = correct ? "correct" : "incorrect";
    if (correct) {
      const match = progression.match(`word:${targetIndex}`);
      if (!match.matched) throw new Error("Abyssal Well progression rejected the current enemy");
      targetIndex = progression.currentIndex;
      correctWords += 1;
      score += 100;
    }
  }

  return withState(state, {
    enemies,
    projectiles: projectiles.filter((projectile) => projectile.depth >= 0),
    targetIndex,
    correctWords,
    totalAttempts,
    score,
    lastOutcome,
    sentence: currentSentence(state.sentences, state.words, targetIndex),
  });
}

function resolveRimHazards(state: AbyssalWellState): AbyssalWellState {
  const breached = state.enemies.filter((enemy) => enemy.depth >= 1);
  if (breached.length === 0) return state;
  const lives = Math.max(0, state.player.lives - breached.length);
  return withState(state, {
    enemies: state.enemies.filter((enemy) => enemy.depth < 1),
    player: { ...state.player, lives },
    phase: lives === 0 ? "defeat" : state.phase,
  });
}

function resolveTerminalPhase(state: AbyssalWellState): AbyssalWellState {
  if (state.phase !== "playing") return state;
  if (state.player.lives === 0) return withState(state, { phase: "defeat" });
  if (state.targetIndex >= state.words.length) return withState(state, { phase: "victory" });
  return state;
}

/**
 * Creates the initial finite sentence state for The Abyssal Well.
 * @param input Strict sentence content for one session.
 * @param config Optional deterministic setup and visual difficulty.
 * @returns A validated start-phase radial shooter state.
 * @throws When input is empty, malformed, or contains no words.
 */
export function createAbyssalWellState(input: unknown, config: AbyssalWellConfig = {}): AbyssalWellState {
  const parsed = sentenceInputSchema.parse(input);
  const content = validateNonEmptyContent(parsed, "sentence");
  const sentences = content.items.map((item) => Object.freeze({ term: item.term, translation: item.translation }));
  const words = sentences.flatMap((sentence) => tokenize(sentence.term));
  if (words.length === 0) throw new Error("Abyssal Well requires at least one sentence word");
  const difficulty = config.difficulty === "easy" || config.difficulty === "hard" ? config.difficulty : "medium";
  const creatureType = config.creatureType === "goblin-scout" || config.creatureType === "shadow-demon"
    ? config.creatureType
    : "cave-spider";
  const seed = createInitialSeed(config);
  const player = Object.freeze({ lane: 0, lives: ABYSSAL_WELL_CONFIG.lives, lastFireTime: -ABYSSAL_WELL_CONFIG.player.fireRate });
  return freezeState({
    phase: "start",
    status: "start",
    player,
    enemies: [],
    projectiles: [],
    sentence: sentences[0]!,
    sentences,
    prompt: sentences[0]!.translation,
    answer: words[0]!,
    words: Object.freeze(words),
    targetIndex: 0,
    targetCount: words.length,
    correctAction: "confirm",
    availableActions: ABYSSAL_WELL_ACTIONS,
    energy: words.length,
    lives: ABYSSAL_WELL_CONFIG.lives,
    score: 0,
    correctAnswers: 0,
    accuracy: 0,
    correctWords: 0,
    totalAttempts: 0,
    gameTime: 0,
    difficulty,
    creatureType,
    seed,
    spawnSerial: 0,
    lastSpawnTime: 0,
    nextEntityId: 1,
    destroyed: false,
  });
}

/**
 * Starts a state and resets its simulation clock.
 * @param state State to start.
 * @returns A playing state, or the unchanged terminal state.
 */
export function startGame(state: AbyssalWellState): AbyssalWellState {
  if (state.phase === "victory" || state.phase === "defeat" || state.destroyed) return state;
  return withState(state, { phase: "playing", gameTime: 0, lastSpawnTime: 0 });
}

/**
 * Moves the player around the eight-lane rim.
 * @param state State whose player should rotate.
 * @param direction Signed lane count; negative values rotate left.
 * @returns State with the normalized active lane.
 */
export function rotatePlayer(state: AbyssalWellState, direction: number): AbyssalWellState {
  if (!Number.isFinite(direction) || !Number.isInteger(direction)) throw new Error("Abyssal Well rotation must be an integer");
  if (state.phase === "victory" || state.phase === "defeat" || state.destroyed) return state;
  const lane = ((state.player.lane + direction) % ABYSSAL_WELL_LANES + ABYSSAL_WELL_LANES) % ABYSSAL_WELL_LANES;
  return withState(state, { player: { ...state.player, lane } });
}

/**
 * Fires one projectile in the active lane when the cooldown has elapsed.
 * @param state Playing state to update.
 * @returns State with a new projectile, or the unchanged state when blocked.
 */
export function fireProjectile(state: AbyssalWellState): AbyssalWellState {
  if (state.phase !== "playing" || state.destroyed) return state;
  if (state.gameTime - state.player.lastFireTime < ABYSSAL_WELL_CONFIG.player.fireRate) return state;
  const projectile: AbyssalWellProjectile = {
    id: `projectile-${state.nextEntityId}`,
    lane: state.player.lane,
    depth: 1,
  };
  return withState(state, {
    player: { ...state.player, lastFireTime: state.gameTime },
    projectiles: [...state.projectiles, projectile],
    nextEntityId: state.nextEntityId + 1,
  });
}

/**
 * Spawns one deterministic word enemy in a free future-word slot.
 * @param state Playing state to update.
 * @param rng Optional source for selecting a word and lane.
 * @returns State with one enemy, or the unchanged state when no slot exists.
 */
export function spawnEnemy(state: AbyssalWellState, rng?: () => number): AbyssalWellState {
  if (state.phase !== "playing" || state.destroyed || state.enemies.length >= MAX_ACTIVE_ENEMIES) return state;
  const available = availableWordIndexes(state);
  if (available.length === 0) return state;
  const randomWord = rng ? Math.floor(clampRandom(rng()) * available.length) : 0;
  const wordIndex = available[Math.min(available.length - 1, randomWord)]!;
  let lane = rng === undefined
    ? nextDefaultLane(state)
    : Math.floor(clampRandom(rng()) * ABYSSAL_WELL_LANES);
  const occupiedLanes = new Set(state.enemies.map((enemy) => enemy.lane));
  if (occupiedLanes.size >= ABYSSAL_WELL_LANES) return state;
  for (let offset = 0; offset < ABYSSAL_WELL_LANES && occupiedLanes.has(lane); offset += 1) {
    lane = (lane + 1) % ABYSSAL_WELL_LANES;
  }
  const enemy: AbyssalWellEnemy = {
    id: `enemy-${state.nextEntityId}`,
    lane,
    depth: 0,
    word: state.words[wordIndex]!,
    wordIndex,
    type: state.creatureType,
  };
  return withState(state, {
    enemies: [...state.enemies, enemy],
    spawnSerial: state.spawnSerial + 1,
    lastSpawnTime: state.gameTime,
    nextEntityId: state.nextEntityId + 1,
  });
}

/**
 * Advances projectiles and enemies, resolves collisions, spawns due enemies, and checks terminals.
 * @param state Playing state to simulate.
 * @param deltaMs Elapsed time in milliseconds.
 * @returns The next immutable simulation state.
 * @throws When deltaMs is negative or not finite.
 */
export function advanceAbyssalWellTime(state: AbyssalWellState, deltaMs: number): AbyssalWellState {
  if (state.phase !== "playing" || state.destroyed) return state;
  const delta = normalizeDelta(deltaMs);
  let next = withState(state, {
    gameTime: state.gameTime + delta,
    projectiles: state.projectiles.map((projectile) => ({
      ...projectile,
      depth: projectile.depth - PROJECTILE_DEPTH_SPEED * delta,
    })),
    enemies: state.enemies.map((enemy) => ({
      ...enemy,
      depth: enemy.depth + enemyDepthSpeed(state) * delta,
    })),
  });
  next = resolveCollisions(next, state);
  next = resolveRimHazards(next);
  next = resolveTerminalPhase(next);
  if (next.phase !== "playing") return next;
  if (next.gameTime - next.lastSpawnTime >= ABYSSAL_WELL_CONFIG.enemy.spawnInterval) {
    next = spawnEnemy(next);
  }
  return resolveTerminalPhase(next);
}

/**
 * Applies a direct rim breach without creating an enemy.
 * @param state Playing state to update.
 * @param amount Number of lives to remove.
 * @returns State with bounded lives and a defeat phase at zero.
 */
export function applyAbyssalWellHazard(state: AbyssalWellState, amount = 1): AbyssalWellState {
  if (state.phase !== "playing" || state.destroyed) return state;
  if (!Number.isInteger(amount) || amount < 1) throw new Error("Abyssal Well hazard amount must be positive");
  const lives = Math.max(0, state.player.lives - amount);
  return withState(state, { player: { ...state.player, lives }, phase: lives === 0 ? "defeat" : state.phase });
}

/**
 * Returns a procedural position for one radial lane and depth.
 * @param lane Radial lane index, normalized modulo eight.
 * @param depth Progress from well center to rim.
 * @param width Scene width.
 * @param height Scene height.
 * @returns Scene-space coordinates for the lane point.
 */
export function getLanePosition(
  lane: number,
  depth: number,
  width = ABYSSAL_WELL_CANVAS.width,
  height = ABYSSAL_WELL_CANVAS.height,
): Readonly<{ x: number; y: number }> {
  const normalizedLane = ((lane % ABYSSAL_WELL_LANES) + ABYSSAL_WELL_LANES) % ABYSSAL_WELL_LANES;
  const normalizedDepth = Math.max(0, Math.min(1, depth));
  const centerX = width / 2;
  const centerY = height * 0.56;
  const radius = Math.min(width, height) * (0.04 + normalizedDepth * 0.38);
  const angle = normalizedLane / ABYSSAL_WELL_LANES * Math.PI * 2 - Math.PI / 2;
  return Object.freeze({
    x: centerX + Math.cos(angle) * radius,
    y: centerY + Math.sin(angle) * radius,
  });
}

/** One bounded English card position for a climbing enemy. */
export interface AbyssalWellLabelLayout {
  /** Enemy identity shown by the card. */
  readonly id: string;
  /** Card center horizontal coordinate. */
  readonly x: number;
  /** Card center vertical coordinate. */
  readonly y: number;
  /** Card width. */
  readonly width: number;
  /** Card height. */
  readonly height: number;
  /** Logical font size. */
  readonly fontSize: number;
  /** Moving enemy horizontal coordinate connected to the card. */
  readonly actorX: number;
  /** Moving enemy vertical coordinate connected to the card. */
  readonly actorY: number;
}

/**
 * Places up to four complete English cards without overlap.
 * @param enemies Active climbing enemies.
 * @param width Logical scene width.
 * @param height Logical scene height.
 * @param renderedWidth Displayed canvas width.
 * @returns Stable card layouts keyed by enemy identity.
 */
export function getAbyssalWellLabelLayouts(
  enemies: readonly AbyssalWellEnemy[],
  width: number,
  height: number,
  renderedWidth = width,
): readonly AbyssalWellLabelLayout[] {
  const scale = renderedWidth > 0 ? renderedWidth / width : 1;
  const cardWidth = scale < 0.75 ? Math.min(width * 0.4, Math.ceil(132 / scale)) : Math.min(150, width * 0.42);
  const cardHeight = scale < 0.75 ? Math.ceil(44 / scale) : 48;
  const fontSize = scale < 0.75 ? Math.ceil(16 / scale) : 16;
  return Object.freeze(enemies.slice(0, MAX_ACTIVE_ENEMIES).map((enemy, index) => {
    const actor = getLanePosition(enemy.lane, enemy.depth, width, height);
    return Object.freeze({
      id: enemy.id,
      x: width * (index % 2 === 0 ? 0.24 : 0.76),
      y: height * (index < 2 ? 0.31 : 0.72),
      width: cardWidth,
      height: cardHeight,
      fontSize,
      actorX: actor.x,
      actorY: actor.y,
    });
  }));
}

/**
 * Maps a pointer or touch coordinate to a radial control zone.
 * @param pointerX Scene-space horizontal coordinate.
 * @param _pointerY Scene-space vertical coordinate.
 * @param sceneWidth Current scene width.
 * @param _sceneHeight Current scene height.
 * @returns A left rotation, right rotation, or fire action.
 */
export function chooseAbyssalWellActionFromPointer(
  pointerX: number,
  _pointerY: number,
  sceneWidth: number,
  _sceneHeight: number,
): InputActionId {
  if (pointerX < sceneWidth / 3) return "move-left";
  if (pointerX >= sceneWidth * 2 / 3) return "move-right";
  return "confirm";
}

/**
 * Returns a creature speed for a selected enemy form.
 * @param creatureType Enemy form to inspect.
 * @returns The configured legacy speed value.
 */
export function getCreatureSpeed(creatureType: CreatureType): number {
  return ABYSSAL_WELL_CONFIG.creatureSpeeds[creatureType] ?? ABYSSAL_WELL_CONFIG.creatureSpeeds["cave-spider"];
}

/**
 * Returns the display configuration for one difficulty label.
 * @param difficulty Difficulty label to inspect.
 * @returns The configured difficulty display data.
 */
export function getDifficultyConfig(difficulty: AbyssalWellDifficulty): Readonly<{ name: string; wordCount: number }> {
  return ABYSSAL_WELL_CONFIG.difficulties[difficulty] ?? ABYSSAL_WELL_CONFIG.difficulties.medium;
}

/**
 * Calculates bounded display XP from completed words, accuracy, survival, and speed.
 * @param params Performance counters and session timing.
 * @returns A nonnegative XP value capped at ten.
 */
export function calculateXP(params: {
  readonly correctWords: number;
  readonly totalAttempts: number;
  readonly lives: number;
  readonly initialLives: number;
  readonly gameTime: number;
}): number {
  if (params.totalAttempts === 0) return 0;
  const accuracy = params.correctWords / params.totalAttempts;
  let bonus = 0;
  if (accuracy === 1) bonus += 2;
  if (params.lives / params.initialLives >= 0.5) bonus += 1;
  if (params.gameTime < 30_000) bonus += 1;
  return Math.min(10, Math.max(0, Math.floor(params.correctWords + bonus)));
}

function validateRestoredState(state: AbyssalWellState, expected: AbyssalWellState, tutorialOnly: boolean): void {
  if (state === null || typeof state !== "object") throw new Error("Abyssal Well state must be an object");
  if (!(state.phase === "start" || state.phase === "playing" || state.phase === "victory" || state.phase === "defeat")) {
    throw new Error("Abyssal Well state phase is invalid");
  }
  if (state.status !== state.phase || state.seed !== expected.seed
    || state.difficulty !== expected.difficulty || state.creatureType !== expected.creatureType) {
    throw new Error("Abyssal Well state identity is invalid");
  }
  if (!Array.isArray(state.sentences) || state.sentences.length !== expected.sentences.length
    || state.sentences.some((sentence, index) => sentence.term !== expected.sentences[index]?.term
      || sentence.translation !== expected.sentences[index]?.translation)) {
    throw new Error("Abyssal Well state sentences are invalid");
  }
  if (!Array.isArray(state.words) || state.words.length !== expected.words.length
    || state.words.some((word, index) => word !== expected.words[index])) {
    throw new Error("Abyssal Well state words are invalid");
  }
  if (!Number.isInteger(state.targetCount) || state.targetCount !== expected.words.length
    || state.targetIndex < 0 || state.targetIndex > expected.words.length) {
    throw new Error("Abyssal Well state target progress is invalid");
  }
  const expectedSentence = currentSentence(expected.sentences, expected.words, state.targetIndex);
  if (state.sentence.term !== expectedSentence.term || state.sentence.translation !== expectedSentence.translation
    || state.prompt !== expectedSentence.translation || state.answer !== (state.words[state.targetIndex] ?? "")
    || state.correctAction !== "confirm"
    || state.availableActions.length !== ABYSSAL_WELL_ACTIONS.length
    || state.availableActions.some((action, index) => action !== ABYSSAL_WELL_ACTIONS[index])) {
    throw new Error("Abyssal Well state target contract is invalid");
  }
  if (state.energy !== Math.max(0, state.targetCount - state.targetIndex)
    || state.lives !== state.player.lives
    || !Number.isInteger(state.score) || state.score !== state.correctWords * 100
    || state.correctAnswers !== state.correctWords
    || !Number.isFinite(state.accuracy) || state.accuracy < 0 || state.accuracy > 1
    || state.accuracy !== (state.totalAttempts === 0 ? 0 : state.correctWords / state.totalAttempts)) {
    throw new Error("Abyssal Well state score resources are invalid");
  }
  if (!Number.isInteger(state.correctWords) || state.correctWords < 0
    || state.correctWords !== state.targetIndex || !Number.isInteger(state.totalAttempts)
    || state.totalAttempts < state.correctWords || state.totalAttempts < 0) {
    throw new Error("Abyssal Well state counters are invalid");
  }
  if (!Number.isInteger(state.player.lane) || state.player.lane < 0 || state.player.lane >= ABYSSAL_WELL_LANES
    || !Number.isInteger(state.player.lives) || state.player.lives < 0 || state.player.lives > ABYSSAL_WELL_CONFIG.lives
    || !Number.isFinite(state.player.lastFireTime) || state.player.lastFireTime > state.gameTime) {
    throw new Error("Abyssal Well state lives are invalid");
  }
  if (!Number.isFinite(state.gameTime) || state.gameTime < 0
    || !Number.isInteger(state.spawnSerial) || state.spawnSerial < 0
    || !Number.isFinite(state.lastSpawnTime)
    || state.lastSpawnTime < 0 || state.lastSpawnTime > state.gameTime
    || !Number.isInteger(state.nextEntityId) || state.nextEntityId < 1) {
    throw new Error("Abyssal Well state timing is invalid");
  }
  if (!Array.isArray(state.enemies) || !Array.isArray(state.projectiles)) {
    throw new Error("Abyssal Well state actors are invalid");
  }
  const ids = new Set<string>();
  const enemyWordIndexes = new Set<number>();
  for (const enemy of state.enemies) {
    if (ids.has(enemy.id) || typeof enemy.id !== "string" || enemy.id.length === 0) {
      throw new Error("Abyssal Well enemy identities are invalid");
    }
    ids.add(enemy.id);
    const isTutorialDecoy = enemy.wordIndex === -1;
    const validWord = isTutorialDecoy
      ? tutorialOnly && enemy.word === state.words[0]
      : Number.isInteger(enemy.wordIndex) && enemy.wordIndex >= 0
        && enemy.wordIndex < state.targetCount && enemy.word === state.words[enemy.wordIndex]
        && (enemy.wordIndex >= state.targetIndex || enemy.word === state.answer);
    if (!Number.isInteger(enemy.lane) || enemy.lane < 0 || enemy.lane >= ABYSSAL_WELL_LANES
      || !Number.isFinite(enemy.depth) || enemy.depth < 0 || enemy.depth >= 1
      || !validWord || enemy.type !== state.creatureType || enemyWordIndexes.has(enemy.wordIndex)) {
      throw new Error("Abyssal Well enemy state is inconsistent");
    }
    enemyWordIndexes.add(enemy.wordIndex);
  }
  const enemyLanes = new Set(state.enemies.map((enemy) => enemy.lane));
  if (enemyLanes.size !== state.enemies.length) throw new Error("Abyssal Well enemy lanes are inconsistent");
  for (const projectile of state.projectiles) {
    if (ids.has(projectile.id) || typeof projectile.id !== "string" || projectile.id.length === 0
      || !Number.isInteger(projectile.lane) || projectile.lane < 0 || projectile.lane >= ABYSSAL_WELL_LANES
      || !Number.isFinite(projectile.depth) || projectile.depth < 0 || projectile.depth > 1) {
      throw new Error("Abyssal Well projectile state is inconsistent");
    }
    ids.add(projectile.id);
  }
  if (state.phase === "playing" && (state.targetIndex === state.words.length || state.player.lives === 0)) {
    throw new Error("Abyssal Well playing state is terminal");
  }
  if (state.phase === "victory" && state.targetIndex !== state.words.length) {
    throw new Error("Abyssal Well victory state is unfinished");
  }
  if (state.phase === "defeat" && state.player.lives !== 0) {
    throw new Error("Abyssal Well defeat state has remaining lives");
  }
  if (state.result !== undefined) {
    const result = gameResultsSchema.parse(state.result);
    if (result.correctAnswers !== state.correctWords || result.totalAttempts !== state.totalAttempts
      || result.score !== state.score) {
      throw new Error("Abyssal Well state result is inconsistent");
    }
  }
}

/**
 * Creates the transport-independent radial shooter controller.
 * @param input Strict sentence content for the finite session.
 * @param deliver Callback for the first terminal result.
 * @param config Optional deterministic setup and difficulty.
 * @returns A controller that owns movement, collisions, results, and cleanup.
 * @throws When input or configuration is invalid.
 */
export function createAbyssalWellController(
  input: unknown,
  deliver: AbyssalWellCompletionDelivery,
  config: AbyssalWellConfig = {},
): AbyssalWellController {
  let state = startGame(createAbyssalWellState(input, config));
  const tutorialOnly = config.tutorialOnly === true;
  let terminalOutcome: AbyssalWellTerminalOutcome | undefined;
  const completion = createCompletionLatch<GameResults>((result) => {
    if (terminalOutcome === undefined) throw new Error("Abyssal Well terminal outcome is missing");
    return deliver(result, terminalOutcome);
  });
  let delivered = false;

  const syncAccounting = (): void => {
    if (state.score !== state.correctWords * 100) throw new Error("Abyssal Well result accounting is inconsistent");
  };

  const finishIfTerminal = (): GameResults | undefined => {
    if (delivered || (state.phase !== "victory" && state.phase !== "defeat")) return undefined;
    syncAccounting();
    delivered = true;
    terminalOutcome = state.phase;
    const result = resultFor(state);
    state = withState(state, { result });
    completion.complete(result);
    return result;
  };

  const actionResultAfterResolution = (
    before: AbyssalWellState,
    accepted: boolean,
  ): AbyssalWellActionResult => {
    const result = finishIfTerminal();
    return actionResult(snapshot(), {
      accepted,
      correct: state.correctWords > before.correctWords,
      progressed: state.targetIndex > before.targetIndex,
      terminal: result !== undefined,
      completed: result !== undefined,
      ...(result === undefined ? {} : { result }),
    });
  };

  const resolveImmediateFire = (before: AbyssalWellState): void => {
    state = resolveCollisions(state, before);
    state = resolveRimHazards(state);
    state = resolveTerminalPhase(state);
  };

  const snapshot = (): AbyssalWellState => state;

  return Object.freeze({
    snapshot,
    start(): AbyssalWellState {
      state = startGame(state);
      return snapshot();
    },
    rotate(direction: number): AbyssalWellState {
      state = rotatePlayer(state, direction);
      return snapshot();
    },
    choose(action: InputActionId): AbyssalWellActionResult {
      const before = state;
      if (state.destroyed || state.phase === "victory" || state.phase === "defeat"
        || !ABYSSAL_WELL_ACTIONS.includes(action)) {
        return actionResult(snapshot(), {
          accepted: false,
          correct: false,
          progressed: false,
          terminal: false,
          completed: false,
        });
      }
      if (action === "move-left") state = rotatePlayer(state, -1);
      if (action === "move-right") state = rotatePlayer(state, 1);
      if (action === "confirm") {
        state = fireProjectile(state);
        if (state !== before) resolveImmediateFire(before);
      }
      return actionResultAfterResolution(before, state !== before);
    },
    fire(): AbyssalWellActionResult {
      const before = state;
      state = fireProjectile(state);
      if (state !== before) resolveImmediateFire(before);
      return actionResultAfterResolution(before, state !== before);
    },
    spawn(rng?: () => number): AbyssalWellState {
      state = spawnEnemy(state, rng);
      return snapshot();
    },
    spawnTutorialDecoy(): AbyssalWellState {
      if (!tutorialOnly) return snapshot();
      state = spawnTutorialDecoy(state);
      return snapshot();
    },
    advance(deltaMs: number): AbyssalWellState {
      state = advanceAbyssalWellTime(state, deltaMs);
      syncAccounting();
      finishIfTerminal();
      return snapshot();
    },
    applyHazard(): AbyssalWellActionResult {
      const before = state;
      state = applyAbyssalWellHazard(state);
      syncAccounting();
      const result = finishIfTerminal();
      return actionResult(snapshot(), {
        accepted: state !== before,
        correct: false,
        progressed: false,
        terminal: result !== undefined,
        completed: result !== undefined,
        ...(result === undefined ? {} : { result }),
      });
    },
    capture: snapshot,
    restore(nextState: AbyssalWellState): void {
      if (state.destroyed) return;
      validateRestoredState(nextState, state, tutorialOnly);
      if (nextState.phase !== "playing" && nextState.phase !== "start" && nextState.result === undefined) {
        throw new Error("Abyssal Well terminal state requires a result");
      }
      if (nextState.phase === "playing" && nextState.result !== undefined) {
        throw new Error("Abyssal Well active state cannot contain a result");
      }
      state = freezeState({ ...nextState });
      syncAccounting();
      if (state.phase !== "playing" || state.destroyed) {
        delivered = true;
        completion.sealWithoutDelivery();
      }
    },
    destroy(): void {
      if (state.destroyed) return;
      state = withState(state, { destroyed: true });
      completion.sealWithoutDelivery();
    },
  });
}

function createScene(context: AbyssalWellSceneContext): Readonly<Record<string, unknown>> {
  let resources: SceneResources | undefined;
  let previousKeys = new Set<string>();
  let heldMoveMs = 0;
  let animationMs = 0;
  let cleaned = false;
  const normalize = createInputActionNormalizer({
    keyboard: ABYSSAL_WELL_KEYBOARD_BINDINGS,
    pointerTap: { action: "confirm" },
  });
  const frameScheduler = createBoundedFrameScheduler((deltaMs) => {
    animationMs = (animationMs + deltaMs) % 2_000;
    if (context.sessionMode === "playing") context.controller.advance(deltaMs);
    else if (context.sessionMode === "tutorial" && context.controller.snapshot().projectiles.length > 0) {
      context.controller.advance(deltaMs);
    }
  });

  const dimensions = (scene: PhaserSceneLike): { width: number; height: number } => ({
    width: scene.scale?.width ?? ABYSSAL_WELL_CANVAS.width,
    height: scene.scale?.height ?? ABYSSAL_WELL_CANVAS.height,
  });

  const pointerInScene = (scene: PhaserSceneLike, x: number, y: number, width: number, height: number) => {
    const rect = scene.game?.canvas?.getBoundingClientRect?.();
    if (!rect || rect.width <= 0 || rect.height <= 0) return { x, y };
    return { x: (x - rect.left) * width / rect.width, y: (y - rect.top) * height / rect.height };
  };

  const applyAction = (action: InputActionId): void => {
    const before = context.controller.snapshot();
    const result = context.controller.choose(action);
    const after = result.snapshot;
    if (result.accepted || before.totalAttempts !== after.totalAttempts) {
      context.diagnostic({
        level: "info",
        code: result.terminal ? "ABYSSAL_WELL_TERMINAL" : "ABYSSAL_WELL_ACTION",
        message: "The Abyssal Well processed a player action.",
        details: {
          cartridgeId: ABYSSAL_WELL_ID,
          phase: after.phase,
          lane: after.player.lane,
          accepted: result.accepted,
        },
      });
    }
  };

  const syncEnemyLabels = (scene: PhaserSceneLike, state: AbyssalWellState): void => {
    if (!resources || !scene.add) return;
    const activeIds = new Set(state.enemies.map((enemy) => enemy.id));
    for (const [id, label] of resources.enemyLabels) {
      if (!activeIds.has(id)) {
        label.destroy();
        resources.enemyLabels.delete(id);
      }
    }
    const { width, height } = dimensions(scene);
    const rect = scene.game?.canvas?.getBoundingClientRect?.();
    const layouts = new Map(getAbyssalWellLabelLayouts(state.enemies, width, height, rect?.width ?? width)
      .map((layout) => [layout.id, layout]));
    for (const enemy of state.enemies) {
      const layout = layouts.get(enemy.id);
      if (!layout) continue;
      const label = resources.enemyLabels.get(enemy.id) ?? scene.add.text(0, 0, "", {
        fontFamily: "Arial",
        color: "#f8fbff",
        fontSize: `${layout.fontSize}px`,
        align: "center",
        wordWrap: { width: layout.width - 16, useAdvancedWrap: true },
      });
      label.setOrigin?.(0.5, 0.5);
      label.setDepth?.(8);
      resources.enemyLabels.set(enemy.id, label);
      label.setText(enemy.word).setPosition(layout.x, layout.y);
    }
  };

  const updateView = (scene: PhaserSceneLike): void => {
    if (!resources) return;
    const view = resources;
    const art = view.art;
    const { width, height } = dimensions(scene);
    const state = context.controller.snapshot();
    const center = getLanePosition(0, 0, width, height);
    const pulse = Math.sin(animationMs / 2_000 * Math.PI * 2) * 3;
    const rect = scene.game?.canvas?.getBoundingClientRect?.();
    const renderedScale = rect && rect.width > 0 ? rect.width / width : 1;
    const labelLayouts = new Map(getAbyssalWellLabelLayouts(state.enemies, width, height, rect?.width ?? width)
      .map((layout) => [layout.id, layout]));
    syncEnemyLabels(scene, state);
    view.graphics.clear();
    view.enemyOverlay.clear();
    if (!art.ground("world:ground", width, height)) view.graphics.fillStyle(0x080b1a, 1).fillRect(0, 0, width, height);
    view.graphics.fillStyle(0x17143b, 0.95).fillCircle(center.x, center.y, Math.min(width, height) * 0.43);
    for (let ring = 4; ring >= 1; ring -= 1) {
      view.graphics.fillStyle(ring % 2 === 0 ? 0x24205a : 0x1c1948, 0.92)
        .fillCircle(center.x, center.y, Math.min(width, height) * (0.08 + ring * 0.085));
    }
    art.place("well-mouth", "world:well-mouth", {
      x: center.x,
      y: center.y,
      width: renderedScale < 0.75 ? Math.ceil(38 / renderedScale) : Math.min(76, width * 0.14),
      depth: 3,
      alpha: 0.96,
    });
    for (let lane = 0; lane < ABYSSAL_WELL_LANES; lane += 1) {
      const point = getLanePosition(lane, 0.82, width, height);
      view.graphics.fillStyle(lane === state.player.lane ? 0x2dd4bf : 0x52608a, lane === state.player.lane ? 0.32 : 0.16)
        .fillCircle(point.x, point.y, 10);
    }
    for (const projectile of state.projectiles) {
      const point = getLanePosition(projectile.lane, projectile.depth, width, height);
      view.graphics.fillStyle(0x67e8f9, 0.96).fillCircle(point.x, point.y, 7);
    }
    state.enemies.forEach((enemy, index) => {
      const point = getLanePosition(enemy.lane, enemy.depth, width, height);
      const radius = 13 + enemy.depth * 10;
      const enemyVisibleWidth = renderedScale < 0.75 ? Math.ceil(22 / renderedScale) : Math.max(20, radius * 1.1);
      const enemySourceWidth = enemyVisibleWidth * 2;
      const enemyScale = enemySourceWidth / 48;
      view.enemyOverlay.fillStyle(0x312e68, 0.96).fillCircle(point.x, point.y, radius + 7);
      const drawn = art.place(`enemy:${index}`, "enemy:idle", {
        x: point.x - 3 * enemyScale,
        y: point.y - 13.5 * enemyScale,
        width: enemySourceWidth,
        depth: 7,
        alpha: 0.94,
      });
      if (!drawn) {
        view.graphics.fillStyle(0x8b5cf6, 0.96).fillCircle(point.x, point.y, radius);
        view.graphics.lineStyle(3, 0xc4b5fd, 0.9).strokeRoundedRect(point.x - radius, point.y - radius, radius * 2, radius * 2, radius);
      }
      const labelLayout = labelLayouts.get(enemy.id);
      if (labelLayout) {
        view.enemyOverlay.lineStyle(2, 0xc4b5fd, 0.8)
          .lineBetween(labelLayout.actorX, labelLayout.actorY, labelLayout.x, labelLayout.y);
        view.enemyOverlay.fillStyle(0x413a83, 0.98).fillRoundedRect(
          labelLayout.x - labelLayout.width / 2,
          labelLayout.y - labelLayout.height / 2,
          labelLayout.width,
          labelLayout.height,
          10,
        );
      }
    });
    const player = getLanePosition(state.player.lane, 1, width, height);
    const playerVisibleWidth = renderedScale < 0.75 ? Math.ceil(24 / renderedScale) : 24;
    const playerSourceWidth = playerVisibleWidth * 2;
    const playerScale = playerSourceWidth / 24;
    if (!art.place("player", "player:idle", {
      x: player.x - playerScale,
      y: player.y + pulse - 1.5 * playerScale,
      width: playerSourceWidth,
      depth: 8,
    })) {
      view.graphics.fillStyle(0x22d3ee, 1).fillCircle(player.x, player.y + pulse, 18);
    }
    art.sweep();
    view.graphics.lineStyle(3, 0xa5f3fc, 1).strokeRoundedRect(player.x - 22, player.y - 22 + pulse, 44, 44, 22);
    const controlHeight = Math.min(64, height * 0.1);
    for (let index = 0; index < 3; index += 1) {
      view.graphics.fillStyle(0x24375d, 0.94).fillRoundedRect(
        width * index / 3 + 8,
        height - controlHeight - 8,
        width / 3 - 16,
        controlHeight,
        10,
      );
    }
    view.title.setText("").setPosition(28, 18);
    view.prompt.setText(state.sentence.translation).setPosition(24, 18);
    view.progress
      .setText(`${state.targetIndex}/${state.words.length}  •  ${state.player.lives}`)
      .setPosition(24, 68);
    view.feedback.setText("").setPosition(28, height - 70);
    view.instructions.setText("").setPosition(28, height - 36);
    view.controlLeft.setText("◀").setPosition(width / 6, height - controlHeight / 2 - 8);
    view.controlFire.setText("●").setPosition(width / 2, height - controlHeight / 2 - 8);
    view.controlRight.setText("▶").setPosition(width * 5 / 6, height - controlHeight / 2 - 8);
  };

  const cleanup = (): void => {
    if (cleaned) return;
    cleaned = true;
    context.inputController.cancelActiveGesture();
    frameScheduler.cancel();
    context.controller.destroy();
    if (!resources) return;
    resources.graphics.destroy();
    resources.enemyOverlay.destroy();
    resources.title.destroy();
    resources.prompt.destroy();
    resources.progress.destroy();
    resources.feedback.destroy();
    resources.instructions.destroy();
    resources.controlLeft.destroy();
    resources.controlFire.destroy();
    resources.controlRight.destroy();
    for (const label of resources.enemyLabels.values()) label.destroy();
    resources.enemyLabels.clear();
    resources = undefined;
    previousKeys = new Set<string>();
  };


  const artKeys = ["world:ground", "world:well-mouth", "player:idle", "enemy:idle"] as const;

  const preload = function (this: PhaserSceneLike): void {
    if (!this.load) return;
    preloadAssetBindings(
      this.load,
      context.edition,
      artKeys.filter((key) => context.edition.bindings[key]),
    );
  };

  const create = function (this: PhaserSceneLike): void {
    if (resources) return;
    if (!this.add) throw new Error("The Abyssal Well requires Phaser display services");
    const { width } = dimensions(this);
    const rect = this.game?.canvas?.getBoundingClientRect?.();
    const scale = rect && rect.width > 0 ? rect.width / width : 1;
    const promptSize = scale < 0.75 ? Math.ceil(20 / scale) : width < 500 ? 20 : 26;
    const hudSize = scale < 0.75 ? Math.ceil(16 / scale) : 16;
    const controlSize = scale < 0.75 ? Math.ceil(18 / scale) : 18;
    const textStyle = { fontFamily: "Arial", color: "#f8fbff", fontSize: "20px" };
    const enemyOverlay = this.add.graphics();
    enemyOverlay.setDepth?.(6);
    resources = {
      graphics: this.add.graphics(),
      enemyOverlay,
      art: createActorSpriteLayer(this, context.edition),
      title: this.add.text(28, 18, "", { ...textStyle, fontSize: "29px", fontStyle: "bold" }),
      prompt: this.add.text(24, 18, "", { ...textStyle, fontSize: `${promptSize}px`, wordWrap: { width: width - 48, useAdvancedWrap: true } }),
      progress: this.add.text(24, 68, "", { ...textStyle, fontSize: `${hudSize}px`, color: "#b7d9ff" }),
      feedback: this.add.text(28, 0, "", { ...textStyle, fontSize: "17px", color: "#fde68a" }),
      instructions: this.add.text(28, 0, "", { ...textStyle, fontSize: `${controlSize}px`, color: "#cbd5e1" }),
      controlLeft: this.add.text(0, 0, "◀", { ...textStyle, fontSize: `${controlSize}px`, color: "#cbd5e1" }),
      controlFire: this.add.text(0, 0, "●", { ...textStyle, fontSize: `${controlSize}px`, color: "#cbd5e1" }),
      controlRight: this.add.text(0, 0, "▶", { ...textStyle, fontSize: `${controlSize}px`, color: "#cbd5e1" }),
      enemyLabels: new Map(),
    };
    resources.controlLeft.setOrigin?.(0.5, 0.5);
    resources.controlFire.setOrigin?.(0.5, 0.5);
    resources.controlRight.setOrigin?.(0.5, 0.5);
    this.events?.once("shutdown", cleanup);
    this.events?.once("destroy", cleanup);
    context.diagnostic({
      level: "debug",
      code: "ABYSSAL_WELL_READY",
      message: "The Abyssal Well radial shooter is ready.",
      details: { cartridgeId: ABYSSAL_WELL_ID, lanes: ABYSSAL_WELL_LANES },
    });
    updateView(this);
  };

  const update = function (this: PhaserSceneLike, _time = 0, delta = 0): void {
    if (!resources || cleaned) return;
    if (context.sessionMode === "playing") {
      const input = context.inputController.snapshot();
      const pressed = input.pressed ?? input.keys.filter((key) => !previousKeys.has(key));
      previousKeys = new Set(input.keys);
      for (const code of pressed) {
        const action = normalize({ modality: "keyboard", code })[0]?.action;
        if (action) applyAction(action);
      }
      const heldAction = input.keys.map((code) => normalize({ modality: "keyboard", code })[0]?.action)
        .find((action): action is InputActionId => action === "move-left" || action === "move-right");
      if (heldAction && !pressed.some((code) => normalize({ modality: "keyboard", code })[0]?.action === heldAction)) {
        heldMoveMs += Math.min(50, Math.max(0, delta));
        if (heldMoveMs >= 150) {
          heldMoveMs -= 150;
          applyAction(heldAction);
        }
      } else if (!heldAction) {
        heldMoveMs = 0;
      }
      if (input.pointer.released && !input.pointer.cancelled) {
        const { width, height } = dimensions(this);
        const pointer = pointerInScene(this, input.pointer.x, input.pointer.y, width, height);
        applyAction(chooseAbyssalWellActionFromPointer(pointer.x, pointer.y, width, height));
      }
    }
    frameScheduler.tick(delta);
    updateView(this);
  };

  return {
    key: ABYSSAL_WELL_ID,
    preload,
    create,
    update,
    extend: {
      apkCaptureResponsiveState: () => context.controller.capture(),
      apkRestoreResponsiveState: (state: unknown) => {
        if (typeof state !== "object" || state === null) throw new Error("Abyssal Well responsive state is invalid");
        context.controller.restore(state as AbyssalWellState);
      },
      apkRecompose: (nextComposition: AbyssalWellSceneContext["composition"]) => {
        void nextComposition;
      },
    },
  };
}

/**
 * Creates the runtime-compatible procedural Abyssal Well cartridge.
 * @returns A sentence-mode cartridge with a bespoke radial shooter scene.
 */
export function createAbyssalWellCartridge(): StandardExperienceCartridge {
  let activeController: AbyssalWellController | undefined;
  /**
   * Rotates onto one enemy lane and fires without finishing the collision in this call.
   * @param controller Active Abyssal Well controller.
   * @param enemy Enemy the demonstration should shoot.
   * @returns Nothing; later tutorial frames complete the projectile travel.
   */
  const startTutorialShot = (controller: AbyssalWellController, enemy: AbyssalWellEnemy): void => {
    controller.rotate(enemy.lane - controller.snapshot().player.lane);
    controller.choose("confirm");
  };
  const standardExperience = createCartridgeStandardExperience({
    id: ABYSSAL_WELL_ID,
    title: "The Abyssal Well",
    description: "Rotate around a dark well and shoot ordered word enemies before they reach the rim.",
    inputMode: "sentence",
    objective: "Defend the rim by shooting each sentence word in order.",
    mechanicInstruction: "Rotate left or right, then fire in the active radial lane.",
    keyboardKeys: ["A", "Left Arrow", "D", "Right Arrow", "Space"],
    executeTutorialAction: (actionId) => {
      const controller = activeController;
      if (!controller) return;
      if (actionId === "action:select-correct") {
        controller.spawn(() => 0);
        const target = controller.snapshot().enemies.find((enemy) => enemy.wordIndex === controller.snapshot().targetIndex);
        if (target) startTutorialShot(controller, target);
        return;
      }
      const state = controller.snapshot();
      if (state.words.length === 1) controller.spawnTutorialDecoy();
      else controller.spawn(() => 0.99);
      const distractor = controller.snapshot().enemies.find((enemy) => enemy.wordIndex !== state.targetIndex)
        ?? controller.snapshot().enemies[0];
      if (distractor) startTutorialShot(controller, distractor);
    },
  });

  return {
    manifest: {
      id: ABYSSAL_WELL_ID,
      title: "The Abyssal Well",
      description: "Rotate around a dark well and shoot ordered word enemies before they reach the rim.",
      runtimeApiVersion: "1.0.0",
      inputMode: "sentence",
      requiredAssetBindings: ["abyssal-well/rim-and-enemies"],
      capabilities: [
        "capability:bounded-frame-delta",
        "capability:input-action-normalization",
        "capability:language-target-progression",
        "capability:nonempty-content-precondition",
        "capability:projectile-collision",
        "capability:radial-lane-rotation",
        "capability:result-accounting",
        "capability:single-completion-emission",
        "capability:touch-control-zones",
        "capability:wrong-enemy-removal",
      ],
    },
    standardExperience,
    createGameConfig(context: CartridgeGameConfigContext): Readonly<Record<string, unknown>> {
      const input = sentenceInputSchema.parse(context.input);
      const sessionMode = context.sessionMode ?? "playing";
      const controller = createAbyssalWellController(
        input,
        sessionMode === "playing" ? (result, outcome) => context.complete(result, outcome) : () => undefined,
        { seed: context.seed ?? 0, tutorialOnly: sessionMode !== "playing" },
      );
      activeController = controller;
      return {
        width: ABYSSAL_WELL_CANVAS.width,
        height: ABYSSAL_WELL_CANVAS.height,
        render: { antialias: false, pixelArt: true },
        scene: createScene({
          controller,
          edition: context.edition,
          inputController: context.inputController,
          composition: context.composition,
          diagnostic: context.diagnostic,
          sessionMode,
        }),
      };
    },
  };
}
