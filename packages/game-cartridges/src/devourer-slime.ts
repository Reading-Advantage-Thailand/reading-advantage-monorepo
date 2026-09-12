import {
  gameResultsSchema,
  sentenceInputSchema,
  type GameResults,
} from "@reading-advantage/game-contracts";
import {
  createActorSpriteLayer,
  calculateXp,
  createBoundedFrameScheduler,
  createCompletionLatch,
  createInputActionNormalizer,
  createResultAccountant,
  finalizeResult,
  preloadAssetBindings,
  validateNonEmptyContent,
  type ActorSpriteLayer,
  type ActorSpriteLike,
  type APKInputController,
  type CartridgeGameConfigContext,
  type CompletionDelivery,
  type InputActionId,
  type RuntimeEdition,
} from "@reading-advantage/advantage-play-kit";
import type { StandardExperienceCartridge } from "@reading-advantage/advantage-play-kit/presentation";

import { createCartridgeStandardExperience } from "./standard-experience.js";

/** Stable public identifier for the Devourer Slime cartridge. */
export const DEVOURER_SLIME_ID = "devourer-slime" as const;

/** Phaser canvas size used by Devourer Slime before host scaling. */
export const DEVOURER_SLIME_CANVAS = Object.freeze({ width: 960, height: 540 });

/** Playable square world owned by the slime movement controller. */
export const DEVOURER_SLIME_WORLD = Object.freeze({ width: 800, height: 800 });

/** Starting slime radius in world units. */
export const INITIAL_SLIME_RADIUS = 25;

/** Word-orb collision radius in world units. */
export const ORB_RADIUS = 20;

/** Maximum English word orbs shown in one arena wave. */
export const MAX_VISIBLE_SLIME_ORBS = 4;

/** Knight collision radius in world units. */
export const KNIGHT_RADIUS = 35;

/** Starting and maximum life count. */
export const MAX_LIVES = 3;

/** Default session seed used when the host does not provide one. */
export const DEFAULT_DEVOURER_SLIME_SEED = 0x9e3779b9;

/** World units moved per millisecond by the slime. */
export const SLIME_MOVEMENT_SPEED = 0.2;

/** Bonus score for eating a smaller knight. */
export const KNIGHT_EAT_BONUS = 500;

/** Keyboard bindings for four-way slime movement. */
export const DEVOURER_SLIME_KEYBOARD_BINDINGS: Readonly<Record<string, InputActionId>> = Object.freeze({
  ArrowLeft: "move-left",
  KeyA: "move-left",
  ArrowRight: "move-right",
  KeyD: "move-right",
  ArrowUp: "move-up",
  KeyW: "move-up",
  ArrowDown: "move-down",
  KeyS: "move-down",
  Space: "confirm",
});

/** Semantic actions accepted by the Devourer Slime controller. */
export const DEVOURER_SLIME_AVAILABLE_ACTIONS: readonly InputActionId[] = Object.freeze([
  "move-left",
  "move-right",
  "move-up",
  "move-down",
  "confirm",
]);

/** One point in the slime world. */
export interface DevourerSlimePoint {
  /** Horizontal world coordinate. */
  readonly x: number;
  /** Vertical world coordinate. */
  readonly y: number;
}

/** One direction accepted by the slime movement controller. */
export type DevourerSlimeDirection = Extract<
  InputActionId,
  "move-left" | "move-right" | "move-up" | "move-down"
>;

/** Active or terminal Devourer Slime phase. */
export type DevourerSlimePhase = "playing" | "victory" | "defeat";

/** Feedback event produced by one slime interaction. */
export type DevourerSlimeEvent =
  | "correct"
  | "incorrect"
  | "hit"
  | "eat-enemy"
  | "victory"
  | "defeat";

/** One positioned sentence-word orb. */
export interface DevourerSlimeOrb {
  /** Stable identity that remains unique when words repeat. */
  readonly id: string;
  /** Word rendered inside the orb. */
  readonly word: string;
  /** Zero-based word position in the current sentence. */
  readonly index: number;
  /** Zero-based sentence position in the launch content. */
  readonly sentenceIndex: number;
  /** World position of the orb. */
  readonly pos: DevourerSlimePoint;
  /** Collision radius of the orb. */
  readonly radius: number;
  /** Whether the orb was already eaten. */
  readonly isEaten: boolean;
  /** Whether the orb is active in the current bounded wave. */
  readonly isVisible: boolean;
}

/** One moving or occupying knight hazard. */
export interface DevourerSlimeKnight {
  /** Stable knight identity. */
  readonly id: string;
  /** World position of the knight. */
  readonly pos: DevourerSlimePoint;
  /** World velocity in units per millisecond. */
  readonly velocity: DevourerSlimePoint;
  /** Collision radius of the knight. */
  readonly radius: number;
}

/** Immutable state exposed by the Devourer Slime controller. */
export interface DevourerSlimeSnapshot {
  /** Deterministic session seed. */
  readonly seed: number;
  /** Current deterministic pseudo-random generator state. */
  readonly randomState: number;
  /** Current session phase. */
  readonly phase: DevourerSlimePhase;
  /** Compatibility alias for the current session phase. */
  readonly status: DevourerSlimePhase;
  /** Recognizable legacy mechanic represented by this session. */
  readonly mechanic: "ordered-word-slime-growth";
  /** Flattened index of the next required word. */
  readonly targetIndex: number;
  /** Total number of sentence words in the session. */
  readonly targetCount: number;
  /** Current sentence index. */
  readonly currentSentenceIndex: number;
  /** Alias for the current sentence index. */
  readonly sentenceIndex: number;
  /** Index of the next required word. */
  readonly targetWordIndex: number;
  /** Alias for the next required word index. */
  readonly wordIndex: number;
  /** Current sentence translation prompt. */
  readonly prompt: string;
  /** Current sentence source text. */
  readonly sentence: string;
  /** Current source-language word required by the session. */
  readonly answer: string;
  /** Alias for the current source-language word. */
  readonly targetWord: string;
  /** Semantic action toward the current word orb. */
  readonly correctAction: InputActionId;
  /** Semantic actions accepted by the controller. */
  readonly availableActions: readonly InputActionId[];
  /** World dimensions. */
  readonly world: typeof DEVOURER_SLIME_WORLD;
  /** Current slime actor. */
  readonly slime: {
    readonly pos: DevourerSlimePoint;
    readonly radius: number;
    readonly scale: number;
  };
  /** Orbs for the current sentence. */
  readonly orbs: readonly DevourerSlimeOrb[];
  /** Moving knight hazards. */
  readonly knights: readonly DevourerSlimeKnight[];
  /** Compatibility alias for knight hazards. */
  readonly enemies: readonly DevourerSlimeKnight[];
  /** Number of knights eaten across the finite session. */
  readonly knightsEaten: number;
  /** Current score. */
  readonly score: number;
  /** Current lives. */
  readonly lives: number;
  /** Maximum lives. */
  readonly maxLives: number;
  /** Shared resource alias for the current life capacity. */
  readonly energy: number;
  /** Number of correct orb attempts. */
  readonly correctAnswers: number;
  /** Number of orb attempts. */
  readonly totalAttempts: number;
  /** Elapsed gameplay time in milliseconds. */
  readonly gameTime: number;
  /** Remaining collision invulnerability in milliseconds. */
  readonly invulnerabilityMs: number;
  /** Most recent gameplay event. */
  readonly lastEvent?: DevourerSlimeEvent;
  /** Most recent gameplay outcome. */
  readonly lastOutcome?: DevourerSlimeEvent;
  /** First terminal result, when the session has ended. */
  readonly result?: GameResults;
  /** Whether cleanup has permanently sealed the controller. */
  readonly destroyed: boolean;
}

/** Result returned after one orb or hazard action. */
export interface DevourerSlimeActionResult {
  /** Whether the action was accepted. */
  readonly accepted: boolean;
  /** Whether an orb action matched the required word. */
  readonly correct: boolean;
  /** Whether the learning target advanced. */
  readonly progressed: boolean;
  /** Whether the action reached victory or defeat. */
  readonly terminal: boolean;
  /** Alias for terminal retained for host compatibility. */
  readonly completed: boolean;
  /** First result emitted by this action, when terminal. */
  readonly result?: GameResults;
  /** State after the action. */
  readonly snapshot: DevourerSlimeSnapshot;
}

/** Result returned after one simulation frame. */
export interface DevourerSlimeTickResult {
  /** State after moving knights and resolving one collision. */
  readonly snapshot: DevourerSlimeSnapshot;
  /** Event produced by this frame, when one occurred. */
  readonly event?: DevourerSlimeEvent;
}

/** Optional deterministic settings for a slime session. */
export interface DevourerSlimeConfig {
  /** Deterministic seed used when no custom random source is supplied. */
  readonly seed?: number;
  /** Random source used for stable orb and knight placement. */
  readonly rng?: () => number;
  /** Number of knights spawned for each sentence. */
  readonly knightCount?: number;
  /** Movement speed in world units per millisecond. */
  readonly movementSpeed?: number;
}

/** Transport-independent rules and lifecycle controls for Devourer Slime. */
export interface DevourerSlimeController {
  /** Returns an immutable snapshot of the current session. */
  snapshot(): DevourerSlimeSnapshot;
  /** Applies one normalized movement or confirmation action. */
  choose(action: InputActionId, deltaMs?: number): DevourerSlimeActionResult;
  /** Moves the slime and clamps it inside the world. */
  move(direction: DevourerSlimeDirection, deltaMs?: number): DevourerSlimeSnapshot;
  /** Moves the slime to a clamped world position. */
  moveTo(position: DevourerSlimePoint): DevourerSlimeSnapshot;
  /** Advances knights and resolves the first collision in the frame. */
  tick(deltaMs?: number): DevourerSlimeTickResult;
  /** Attempts to eat an orb only when the slime overlaps it. */
  collectOrb(orbId: string): DevourerSlimeActionResult;
  /** Applies one knight-sized hazard hit. */
  applyHazard(): DevourerSlimeActionResult;
  /** Demonstrates one orb action without requiring spatial overlap. */
  demonstrateOrb(correct: boolean): DevourerSlimeActionResult;
  /** Captures state before a responsive scene transition. */
  capture(): DevourerSlimeSnapshot;
  /** Restores validated state captured before a responsive scene transition. */
  restore(snapshot: DevourerSlimeSnapshot): void;
  /** Seals gameplay and prevents later mutation or result delivery. */
  destroy(): void;
}

interface MutablePoint {
  x: number;
  y: number;
}

interface MutableOrb {
  id: string;
  word: string;
  index: number;
  sentenceIndex: number;
  pos: MutablePoint;
  radius: number;
  isEaten: boolean;
}

interface MutableKnight {
  id: string;
  pos: MutablePoint;
  velocity: MutablePoint;
  radius: number;
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
    readonly top?: number;
    readonly width: number;
    readonly height?: number;
  };
}

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

interface SceneResources {
  readonly art: ActorSpriteLayer;
  readonly graphics: PhaserGraphicsLike;
  readonly title: PhaserTextLike;
  readonly prompt: PhaserTextLike;
  readonly progress: PhaserTextLike;
  readonly feedback: PhaserTextLike;
  readonly instructions: PhaserTextLike;
  readonly orbLabels: readonly PhaserTextLike[];
}

interface DevourerSlimeSceneContext {
  readonly edition: RuntimeEdition;
  readonly controller: DevourerSlimeController;
  readonly inputController: APKInputController;
  readonly composition: CartridgeGameConfigContext["composition"];
  readonly sessionMode: NonNullable<CartridgeGameConfigContext["sessionMode"]>;
  readonly maxWords: number;
  readonly diagnostic: CartridgeGameConfigContext["diagnostic"];
}

interface DevourerSlimeRandomSource {
  next(): number;
  state(): number;
  restore(state: number): void;
}

const DEFAULT_KNIGHT_COUNT = 4;
const POINTER_THRESHOLD = 12;
export const DEVOURER_SLIME_MAX_FRAME_DELTA_MS = 50;
const INVULNERABILITY_MS = 1_000;
const DIRECTIONS: readonly DevourerSlimeDirection[] = Object.freeze([
  "move-left",
  "move-right",
  "move-up",
  "move-down",
]);
const KEYBOARD_PRIORITY = Object.freeze([
  "ArrowUp",
  "KeyW",
  "ArrowDown",
  "KeyS",
  "ArrowLeft",
  "KeyA",
  "ArrowRight",
  "KeyD",
] as const);

function tokenize(sentence: string): readonly string[] {
  return Object.freeze(sentence.trim().split(/\s+/u).filter(Boolean));
}

function finiteNonNegative(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be finite and nonnegative`);
  return value;
}

function normalizedRandom(rng: () => number): number {
  const value = rng();
  if (!Number.isFinite(value)) throw new Error("Devourer Slime random source must return finite numbers");
  return Math.max(0, Math.min(0.999999, value));
}

function distance(first: DevourerSlimePoint, second: DevourerSlimePoint): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function overlaps(
  first: DevourerSlimePoint,
  firstRadius: number,
  second: DevourerSlimePoint,
  secondRadius: number,
): boolean {
  return distance(first, second) < firstRadius + secondRadius;
}

function directionVector(direction: DevourerSlimeDirection): DevourerSlimePoint {
  switch (direction) {
    case "move-left": return { x: -1, y: 0 };
    case "move-right": return { x: 1, y: 0 };
    case "move-up": return { x: 0, y: -1 };
    case "move-down": return { x: 0, y: 1 };
  }
}

function clampPosition(position: DevourerSlimePoint, radius: number): MutablePoint {
  return {
    x: Math.max(radius, Math.min(DEVOURER_SLIME_WORLD.width - radius, position.x)),
    y: Math.max(radius, Math.min(DEVOURER_SLIME_WORLD.height - radius, position.y)),
  };
}

function randomPosition(rng: () => number, margin: number): MutablePoint {
  return {
    x: margin + normalizedRandom(rng) * (DEVOURER_SLIME_WORLD.width - margin * 2),
    y: margin + normalizedRandom(rng) * (DEVOURER_SLIME_WORLD.height - margin * 2),
  };
}

function copyPoint(point: DevourerSlimePoint): DevourerSlimePoint {
  return Object.freeze({ x: point.x, y: point.y });
}

function normalizeSeed(seed: number | undefined): number {
  if (seed === undefined) return DEFAULT_DEVOURER_SLIME_SEED;
  if (!Number.isFinite(seed)) throw new Error("Devourer Slime seed must be finite");
  return Math.abs(Math.trunc(seed)) >>> 0;
}

function createRandomSource(seed: number, customRandom?: () => number): DevourerSlimeRandomSource {
  if (customRandom) {
    const values: number[] = [];
    let position = 0;
    return {
      next(): number {
        const value = position < values.length
          ? values[position]!
          : normalizedRandom(customRandom);
        if (position === values.length) values.push(value);
        position += 1;
        return value;
      },
      state(): number {
        return position;
      },
      restore(state: number): void {
        if (!Number.isInteger(state) || state < 0 || state > values.length) {
          throw new Error("Devourer Slime random state is invalid");
        }
        position = state;
      },
    };
  }

  let state = seed || 1;
  return {
    next(): number {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      return state / 4_294_967_296;
    },
    state(): number {
      return state;
    },
    restore(nextState: number): void {
      if (!Number.isInteger(nextState) || nextState < 0 || nextState > 0xffffffff) {
        throw new Error("Devourer Slime random state is invalid");
      }
      state = nextState;
    },
  };
}

function directionToward(
  from: DevourerSlimePoint,
  target: DevourerSlimePoint | undefined,
): InputActionId {
  if (!target) return "confirm";
  const deltaX = target.x - from.x;
  const deltaY = target.y - from.y;
  if (Math.abs(deltaX) < POINTER_THRESHOLD && Math.abs(deltaY) < POINTER_THRESHOLD) return "confirm";
  if (Math.abs(deltaX) >= Math.abs(deltaY)) return deltaX < 0 ? "move-left" : "move-right";
  return deltaY < 0 ? "move-up" : "move-down";
}

/** Converts a pointer drag into one of the four slime movement actions. */
export function directionFromPointerDelta(
  deltaX: number,
  deltaY: number,
  threshold = POINTER_THRESHOLD,
): DevourerSlimeDirection | undefined {
  if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < threshold) return undefined;
  if (Math.abs(deltaX) >= Math.abs(deltaY)) return deltaX < 0 ? "move-left" : "move-right";
  return deltaY < 0 ? "move-up" : "move-down";
}

function createOrbSet(
  sentences: readonly { readonly term: string }[],
  sentenceIndex: number,
  rng: () => number,
): MutableOrb[] {
  return tokenize(sentences[sentenceIndex]!.term).map((word, index) => ({
    id: `orb:${sentenceIndex}:${index}`,
    word,
    index,
    sentenceIndex,
    pos: randomPosition(rng, ORB_RADIUS + 12),
    radius: ORB_RADIUS,
    isEaten: false,
  }));
}

function createKnightSet(
  slimePosition: DevourerSlimePoint,
  count: number,
  rng: () => number,
): MutableKnight[] {
  return Array.from({ length: count }, (_, index) => {
    let pos = randomPosition(rng, KNIGHT_RADIUS + 12);
    if (distance(pos, slimePosition) < INITIAL_SLIME_RADIUS + KNIGHT_RADIUS + 40) {
      pos = clampPosition({
        x: 90 + (index % 3) * 110,
        y: 90 + Math.floor(index / 3) * 110,
      }, KNIGHT_RADIUS);
    }
    return {
      id: `knight:${index}`,
      pos,
      velocity: {
        x: (normalizedRandom(rng) - 0.5) * 0.6,
        y: (normalizedRandom(rng) - 0.5) * 0.6,
      },
      radius: KNIGHT_RADIUS,
    };
  });
}

function createActionResult(
  snapshot: DevourerSlimeSnapshot,
  values: Omit<DevourerSlimeActionResult, "snapshot">,
): DevourerSlimeActionResult {
  return Object.freeze({ ...values, snapshot });
}

/**
 * Creates transport-independent Devourer Slime rules for one sentence session.
 * @param input Untrusted sentence content from a host or test.
 * @param deliver Callback that receives the first terminal result.
 * @param config Deterministic placement and movement settings.
 * @returns A controller for movement, ordered orb learning, growth, and collisions.
 * @throws When sentence content or configuration is invalid.
 */
export function createDevourerSlimeController(
  input: unknown,
  deliver: CompletionDelivery<GameResults>,
  config: DevourerSlimeConfig = {},
): DevourerSlimeController {
  const parsedInput = sentenceInputSchema.parse(input);
  const content = validateNonEmptyContent(parsedInput, "sentence");
  const sentences = content.items;
  const seed = normalizeSeed(config.seed);
  const random = createRandomSource(seed, config.seed === undefined ? config.rng : undefined);
  const movementSpeed = config.movementSpeed ?? SLIME_MOVEMENT_SPEED;
  const knightCount = config.knightCount ?? DEFAULT_KNIGHT_COUNT;
  finiteNonNegative(movementSpeed, "Devourer Slime movement speed");
  if (!Number.isInteger(knightCount) || knightCount < 0) {
    throw new Error("Devourer Slime knight count must be a nonnegative integer");
  }

  const completion = createCompletionLatch(deliver);
  const targetCount = sentences.reduce((count, sentence) => count + tokenize(sentence.term).length, 0);
  if (targetCount === 0) throw new Error("Devourer Slime requires at least one sentence word");
  let accountant = createResultAccountant();
  let phase: DevourerSlimePhase = "playing";
  let currentSentenceIndex = 0;
  let targetWordIndex = 0;
  let score = 0;
  let lives = MAX_LIVES;
  let gameTime = 0;
  let invulnerabilityMs = 0;
  let lastEvent: DevourerSlimeEvent | undefined;
  let terminalResultValue: GameResults | undefined;
  let destroyed = false;
  let slime: { pos: MutablePoint; radius: number } = {
    pos: { x: DEVOURER_SLIME_WORLD.width / 2, y: DEVOURER_SLIME_WORLD.height / 2 },
    radius: INITIAL_SLIME_RADIUS,
  };
  let orbs = createOrbSet(sentences, currentSentenceIndex, random.next);
  let knights = createKnightSet(slime.pos, knightCount, random.next);
  let knightsEaten = 0;

  const wordsFor = (sentenceIndex: number): readonly string[] => tokenize(sentences[sentenceIndex]!.term);

  const completedWordsBefore = (sentenceIndex: number): number => sentences
    .slice(0, sentenceIndex)
    .reduce((count, sentence) => count + tokenize(sentence.term).length, 0);

  const currentWords = (): readonly string[] => wordsFor(currentSentenceIndex);

  const currentAnswer = (): string => {
    const words = currentWords();
    return words[Math.min(targetWordIndex, words.length - 1)]!;
  };

  const visibleOrbIds = (): ReadonlySet<string> => {
    const remaining = orbs.filter((orb) => !orb.isEaten);
    const expected = remaining.find((orb) => orb.word === currentAnswer());
    const offset = remaining.length === 0 ? 0 : (seed + currentSentenceIndex * 31 + targetWordIndex * 17) % remaining.length;
    const rotated = [...remaining.slice(offset), ...remaining.slice(0, offset)];
    const selected = rotated.slice(0, MAX_VISIBLE_SLIME_ORBS);
    if (expected && !selected.some((orb) => orb.id === expected.id)) {
      selected[Math.max(0, selected.length - 1)] = expected;
    }
    const waveSalt = (seed ^ Math.imul(currentSentenceIndex + 1, 0x45d9f3b) ^ Math.imul(targetWordIndex + 1, 0x27d4eb2d)) >>> 0;
    selected.sort((left, right) => {
      const leftIndex = Number.parseInt(left.id.slice(left.id.lastIndexOf(":") + 1), 10);
      const rightIndex = Number.parseInt(right.id.slice(right.id.lastIndexOf(":") + 1), 10);
      const leftKey = Math.imul(leftIndex + 1, 0x9e3779b1) ^ waveSalt;
      const rightKey = Math.imul(rightIndex + 1, 0x9e3779b1) ^ waveSalt;
      return (leftKey >>> 0) - (rightKey >>> 0) || left.id.localeCompare(right.id);
    });
    const slotOffset = selected.length === 0 ? 0 : waveSalt % selected.length;
    const slotted = [...selected.slice(slotOffset), ...selected.slice(0, slotOffset)];
    return new Set(slotted.map((orb) => orb.id));
  };

  const arrangeVisibleOrbs = (): void => {
    const visible = visibleOrbIds();
    const positions = [
      { x: 150, y: 210 }, { x: 650, y: 210 },
      { x: 150, y: 590 }, { x: 650, y: 590 },
      { x: 150, y: 400 }, { x: 650, y: 400 },
      { x: 400, y: 210 }, { x: 400, y: 590 },
    ].filter((position) => distance(position, slime.pos) > slime.radius + ORB_RADIUS + 80);
    [...visible].forEach((id, index) => {
      const orb = orbs.find((candidate) => candidate.id === id);
      if (orb && positions[index]) orb.pos = { ...positions[index] };
    });
  };

  arrangeVisibleOrbs();

  const currentOrb = (): MutableOrb | undefined => {
    const answer = currentAnswer();
    return orbs.find((orb) => !orb.isEaten && orb.word === answer);
  };

  const snapshot = (): DevourerSlimeSnapshot => {
    const sentence = sentences[currentSentenceIndex]!;
    const answer = currentAnswer();
    const activeOrb = currentOrb();
    const visible = visibleOrbIds();
    const orbSnapshot = Object.freeze(orbs.map((orb) => Object.freeze({
      ...orb,
      isVisible: visible.has(orb.id),
      pos: copyPoint(orb.pos),
    })));
    const knightSnapshot = Object.freeze(knights.map((knight) => Object.freeze({
      ...knight,
      pos: copyPoint(knight.pos),
      velocity: copyPoint(knight.velocity),
    })));
    const playerSnapshot = Object.freeze({
      pos: copyPoint(slime.pos),
      radius: slime.radius,
      scale: slime.radius / INITIAL_SLIME_RADIUS,
    });
    return Object.freeze({
      seed,
      randomState: random.state(),
      phase,
      status: phase,
      mechanic: "ordered-word-slime-growth",
      targetIndex: Math.min(targetCount, completedWordsBefore(currentSentenceIndex) + targetWordIndex),
      targetCount,
      currentSentenceIndex,
      sentenceIndex: currentSentenceIndex,
      targetWordIndex,
      wordIndex: targetWordIndex,
      prompt: sentence.translation,
      sentence: sentence.term,
      answer,
      targetWord: answer,
      correctAction: phase === "playing" ? directionToward(slime.pos, activeOrb?.pos) : "confirm",
      availableActions: DEVOURER_SLIME_AVAILABLE_ACTIONS,
      world: DEVOURER_SLIME_WORLD,
      slime: playerSnapshot,
      orbs: orbSnapshot,
      knights: knightSnapshot,
      enemies: knightSnapshot,
      knightsEaten,
      score,
      lives,
      maxLives: MAX_LIVES,
      energy: lives,
      correctAnswers: accountant.correctAnswers,
      totalAttempts: accountant.totalAttempts,
      gameTime,
      invulnerabilityMs,
      ...(lastEvent ? { lastEvent } : {}),
      ...(lastEvent ? { lastOutcome: lastEvent } : {}),
      ...(terminalResultValue ? { result: terminalResultValue } : {}),
      destroyed,
    });
  };

  const result = (): GameResults => gameResultsSchema.parse(
    finalizeResult(accountant, { xpPerCorrect: 20, xpPerAccuracyPoint: 10 }),
  );

  const terminalResult = (event: "victory" | "defeat"): GameResults => {
    if (terminalResultValue) return terminalResultValue;
    phase = event;
    lastEvent = event;
    terminalResultValue = result();
    completion.complete(terminalResultValue);
    return terminalResultValue;
  };

  const relocate = (orb: MutableOrb): void => {
    const previous = orb.pos;
    const occupied = orbs.filter((candidate) => candidate.id !== orb.id && !candidate.isEaten && visibleOrbIds().has(candidate.id));
    let next = randomPosition(random.next, ORB_RADIUS + 12);
    for (let attempt = 0; attempt < 8 && (distance(next, slime.pos) < slime.radius + ORB_RADIUS + 80
      || occupied.some((candidate) => distance(next, candidate.pos) < ORB_RADIUS * 2 + 180)); attempt += 1) {
      next = randomPosition(random.next, ORB_RADIUS + 12);
    }
    if (distance(previous, next) < 1 || distance(next, slime.pos) < slime.radius + ORB_RADIUS + 80
      || occupied.some((candidate) => distance(next, candidate.pos) < ORB_RADIUS * 2 + 180)) {
      const fallback = [
        { x: 150, y: 210 }, { x: 650, y: 210 }, { x: 150, y: 590 }, { x: 650, y: 590 },
        { x: 150, y: 400 }, { x: 650, y: 400 }, { x: 400, y: 210 }, { x: 400, y: 590 },
      ].find((position) => distance(position, slime.pos) >= slime.radius + ORB_RADIUS + 80
        && occupied.every((candidate) => distance(position, candidate.pos) >= ORB_RADIUS * 2 + 180));
      next = fallback ?? clampPosition({ x: previous.x + 190, y: previous.y + 190 }, ORB_RADIUS + 12);
    }
    orb.pos = next;
  };

  const damage = (): GameResults | undefined => {
    lives = Math.max(0, lives - 1);
    slime.radius = Math.max(INITIAL_SLIME_RADIUS, slime.radius * 0.8);
    if (lives === 0) return terminalResult("defeat");
    lastEvent = "hit";
    return undefined;
  };

  const inactiveAction = (): DevourerSlimeActionResult => createActionResult(snapshot(), {
    accepted: false,
    correct: false,
    progressed: false,
    terminal: false,
    completed: false,
  });

  const resolveOrb = (orbId: string, ignoreDistance: boolean): DevourerSlimeActionResult => {
    const before = snapshot();
    if (destroyed || phase !== "playing") {
      return createActionResult(before, {
        accepted: false,
        correct: false,
        progressed: false,
        terminal: false,
        completed: false,
      });
    }
    const orb = orbs.find((candidate) => candidate.id === orbId && !candidate.isEaten);
    if (!orb || (!ignoreDistance && !overlaps(slime.pos, slime.radius, orb.pos, orb.radius))) {
      return createActionResult(before, {
        accepted: false,
        correct: false,
        progressed: false,
        terminal: false,
        completed: false,
      });
    }

    const correct = orb.word === currentAnswer();
    accountant.recordAttempt({ correct });
    if (!correct) {
      score = Math.max(0, score - 50);
      accountant.addScore(score - accountant.score);
      slime.radius = Math.max(INITIAL_SLIME_RADIUS, slime.radius - 3);
      lastEvent = "incorrect";
      relocate(orb);
      return createActionResult(snapshot(), {
        accepted: true,
        correct: false,
        progressed: false,
        terminal: false,
        completed: false,
      });
    }

    orb.isEaten = true;
    targetWordIndex += 1;
    arrangeVisibleOrbs();
    score += 100;
    accountant.addScore(100);
    slime.radius += 5;
    lastEvent = "correct";
    const sentenceComplete = targetWordIndex === wordsFor(currentSentenceIndex).length;
    if (!sentenceComplete) {
      return createActionResult(snapshot(), {
        accepted: true,
        correct: true,
        progressed: true,
        terminal: false,
        completed: false,
      });
    }

    if (currentSentenceIndex === sentences.length - 1) {
      const finalResult = terminalResult("victory");
      return createActionResult(snapshot(), {
        accepted: true,
        correct: true,
        progressed: true,
        terminal: true,
        completed: true,
        result: finalResult,
      });
    }

    currentSentenceIndex += 1;
    targetWordIndex = 0;
    orbs = createOrbSet(sentences, currentSentenceIndex, random.next);
    knights = createKnightSet(slime.pos, knightCount, random.next);
    arrangeVisibleOrbs();
    return createActionResult(snapshot(), {
      accepted: true,
      correct: true,
      progressed: true,
      terminal: false,
      completed: false,
    });
  };

  const resolveKnight = (knight: MutableKnight): DevourerSlimeEvent | undefined => {
    if (slime.radius > knight.radius) {
      knights = knights.filter((candidate) => candidate.id !== knight.id);
      knightsEaten += 1;
      score += KNIGHT_EAT_BONUS;
      accountant.addScore(KNIGHT_EAT_BONUS);
      lastEvent = "eat-enemy";
      return "eat-enemy";
    }

    if (invulnerabilityMs > 0) return undefined;

    const awayX = slime.pos.x - knight.pos.x;
    const awayY = slime.pos.y - knight.pos.y;
    const length = Math.hypot(awayX, awayY) || 1;
    slime.pos = clampPosition({
      x: slime.pos.x + (awayX / length) * 50,
      y: slime.pos.y + (awayY / length) * 50,
    }, slime.radius);
    const terminal = damage();
    if (!terminal) invulnerabilityMs = INVULNERABILITY_MS;
    return terminal ? "defeat" : "hit";
  };

  const moveSlime = (direction: DevourerSlimeDirection, deltaMs = 16.67): DevourerSlimeSnapshot => {
    if (destroyed || phase !== "playing") return snapshot();
    const delta = Math.min(
      DEVOURER_SLIME_MAX_FRAME_DELTA_MS,
      finiteNonNegative(deltaMs, "Devourer Slime frame delta"),
    );
    if (!DIRECTIONS.includes(direction)) throw new Error("Devourer Slime direction is invalid");
    const vector = directionVector(direction);
    slime.pos = clampPosition({
      x: slime.pos.x + vector.x * movementSpeed * delta,
      y: slime.pos.y + vector.y * movementSpeed * delta,
    }, slime.radius);
    return snapshot();
  };

  const resolveCurrentCollision = (): DevourerSlimeActionResult | undefined => {
    const visible = visibleOrbIds();
    const orb = orbs.find((candidate) => !candidate.isEaten && visible.has(candidate.id) && overlaps(
      slime.pos,
      slime.radius,
      candidate.pos,
      candidate.radius,
    ));
    if (orb) return resolveOrb(orb.id, false);
    const knight = knights.find((candidate) => overlaps(
      slime.pos,
      slime.radius,
      candidate.pos,
      candidate.radius,
    ));
    if (!knight) return undefined;
    const event = resolveKnight(knight);
    if (!event) return inactiveAction();
    const finalResult = phase === "playing" ? undefined : terminalResultValue;
    return createActionResult(snapshot(), {
      accepted: true,
      correct: false,
      progressed: false,
      terminal: finalResult !== undefined,
      completed: finalResult !== undefined,
      ...(finalResult ? { result: finalResult } : {}),
    });
  };

  const choose = (action: InputActionId, deltaMs = 16.67): DevourerSlimeActionResult => {
    if (destroyed || phase !== "playing") return inactiveAction();
    if (DIRECTIONS.includes(action as DevourerSlimeDirection)) {
      moveSlime(action as DevourerSlimeDirection, deltaMs);
      const collision = resolveCurrentCollision();
      if (collision) return collision;
      return createActionResult(snapshot(), {
        accepted: true,
        correct: false,
        progressed: false,
        terminal: false,
        completed: false,
      });
    }
    if (action === "confirm") {
      const target = currentOrb();
      return target ? resolveOrb(target.id, false) : inactiveAction();
    }
    return inactiveAction();
  };

  const validateRestoredState = (state: DevourerSlimeSnapshot): void => {
    if (state === null || typeof state !== "object") throw new Error("Devourer Slime responsive state is invalid");
    if (state.seed !== seed || state.status !== state.phase || state.mechanic !== "ordered-word-slime-growth") {
      throw new Error("Devourer Slime responsive identity is invalid");
    }
    if (state.phase !== "playing" && state.phase !== "victory" && state.phase !== "defeat") {
      throw new Error("Devourer Slime responsive phase is invalid");
    }
    if (!Number.isInteger(state.currentSentenceIndex) || state.currentSentenceIndex < 0 || state.currentSentenceIndex >= sentences.length
      || state.sentenceIndex !== state.currentSentenceIndex) {
      throw new Error("Devourer Slime responsive sentence index is invalid");
    }
    const restoredWords = wordsFor(state.currentSentenceIndex);
    const expectedTargetIndex = completedWordsBefore(state.currentSentenceIndex) + state.targetWordIndex;
    if (state.targetCount !== targetCount || !Number.isInteger(state.targetIndex)
      || state.targetIndex !== expectedTargetIndex || !Number.isInteger(state.targetWordIndex)
      || state.targetWordIndex < 0 || state.targetWordIndex > restoredWords.length
      || state.wordIndex !== state.targetWordIndex) {
      throw new Error("Devourer Slime responsive word index is invalid");
    }
    if (state.sentence !== sentences[state.currentSentenceIndex]!.term
      || state.prompt !== sentences[state.currentSentenceIndex]!.translation
      || state.answer !== restoredWords[Math.min(state.targetWordIndex, restoredWords.length - 1)]
      || state.targetWord !== state.answer) {
      throw new Error("Devourer Slime responsive target content is invalid");
    }
    if (!Array.isArray(state.availableActions)
      || state.availableActions.length !== DEVOURER_SLIME_AVAILABLE_ACTIONS.length
      || state.availableActions.some((action, index) => action !== DEVOURER_SLIME_AVAILABLE_ACTIONS[index])) {
      throw new Error("Devourer Slime responsive actions are invalid");
    }
    const candidateOrbs = Array.isArray(state.orbs) ? state.orbs : [];
    const expectedOrb = candidateOrbs.find((orb) => !orb.isEaten && orb.isVisible && orb.word === state.answer);
    const expectedCorrectAction = state.phase === "playing" && state.slime !== null && typeof state.slime === "object"
      ? directionToward(state.slime.pos, expectedOrb?.pos)
      : "confirm";
    if (state.correctAction !== expectedCorrectAction) throw new Error("Devourer Slime responsive correct action is invalid");
    if (!Number.isInteger(state.lives) || state.lives < 0 || state.lives > MAX_LIVES
      || state.energy !== state.lives || state.maxLives !== MAX_LIVES) {
      throw new Error("Devourer Slime responsive resources are invalid");
    }
    if (state.phase === "playing" && (state.targetIndex === targetCount || state.lives === 0)) {
      throw new Error("Devourer Slime responsive playing state is terminal");
    }
    if (state.phase === "victory" && (state.targetIndex !== targetCount
      || state.currentSentenceIndex !== sentences.length - 1
      || state.targetWordIndex !== restoredWords.length)) {
      throw new Error("Devourer Slime responsive victory state is incomplete");
    }
    if (state.phase === "defeat" && state.lives !== 0) {
      throw new Error("Devourer Slime responsive defeat state has lives remaining");
    }
    if (!Number.isInteger(state.correctAnswers) || state.correctAnswers !== state.targetIndex
      || !Number.isInteger(state.totalAttempts) || state.totalAttempts < 0
      || state.correctAnswers < 0 || state.correctAnswers > state.totalAttempts) {
      throw new Error("Devourer Slime responsive result counters are invalid");
    }
    if (!Number.isInteger(state.knightsEaten) || state.knightsEaten < 0
      || state.knightsEaten > knightCount * sentences.length) {
      throw new Error("Devourer Slime responsive knight counter is invalid");
    }
    if (!Number.isInteger(state.score) || state.score < 0) throw new Error("Devourer Slime responsive score is invalid");
    const incorrectAnswers = state.totalAttempts - state.correctAnswers;
    const bonusScore = state.knightsEaten * KNIGHT_EAT_BONUS;
    const maximumScore = state.correctAnswers * 100 + bonusScore;
    if (state.score > maximumScore || incorrectAnswers < 0) {
      throw new Error("Devourer Slime responsive score is inconsistent");
    }
    if (!Number.isFinite(state.gameTime) || state.gameTime < 0
      || !Number.isFinite(state.invulnerabilityMs) || state.invulnerabilityMs < 0
      || state.invulnerabilityMs > INVULNERABILITY_MS || typeof state.destroyed !== "boolean"
      || !Number.isInteger(state.randomState) || state.randomState < 0 || state.randomState > 0xffffffff) {
      throw new Error("Devourer Slime responsive lifecycle state is invalid");
    }
    if (state.lastEvent !== state.lastOutcome
      || (state.lastEvent !== undefined && !["correct", "incorrect", "hit", "eat-enemy", "victory", "defeat"].includes(state.lastEvent))) {
      throw new Error("Devourer Slime responsive outcome is invalid");
    }
    if ((state.phase === "playing" && (state.lastEvent === "victory" || state.lastEvent === "defeat"))
      || (state.phase === "victory" && state.lastEvent !== "victory")
      || (state.phase === "defeat" && state.lastEvent !== "defeat")) {
      throw new Error("Devourer Slime responsive phase outcome is inconsistent");
    }
    if (state.phase === "playing" && state.result !== undefined) {
      throw new Error("Devourer Slime active state has a terminal result");
    }
    if (state.phase !== "playing") {
      if (state.result === undefined) throw new Error("Devourer Slime terminal result is missing");
      const restoredResult = gameResultsSchema.parse(state.result);
      if (restoredResult.score !== state.score || restoredResult.correctAnswers !== state.correctAnswers
        || restoredResult.totalAttempts !== state.totalAttempts
        || restoredResult.accuracy !== (state.totalAttempts === 0 ? 0 : state.correctAnswers / state.totalAttempts)) {
        throw new Error("Devourer Slime terminal result is inconsistent");
      }
      const expectedXp = calculateXp({
        correctAnswers: state.correctAnswers,
        totalAttempts: state.totalAttempts,
        accuracy: state.totalAttempts === 0 ? 0 : state.correctAnswers / state.totalAttempts,
      }, { xpPerCorrect: 20, xpPerAccuracyPoint: 10 });
      if (restoredResult.xp !== expectedXp) throw new Error("Devourer Slime terminal XP is inconsistent");
    }
    if (!state.world || state.world.width !== DEVOURER_SLIME_WORLD.width || state.world.height !== DEVOURER_SLIME_WORLD.height) {
      throw new Error("Devourer Slime responsive world is invalid");
    }
    if (!state.slime || typeof state.slime !== "object" || !Number.isFinite(state.slime.radius)
      || state.slime.radius < INITIAL_SLIME_RADIUS || state.slime.radius > INITIAL_SLIME_RADIUS + targetCount * 5
      || state.slime.scale !== state.slime.radius / INITIAL_SLIME_RADIUS
      || !Number.isFinite(state.slime.pos.x) || !Number.isFinite(state.slime.pos.y)
      || state.slime.pos.x < state.slime.radius || state.slime.pos.x > DEVOURER_SLIME_WORLD.width - state.slime.radius
      || state.slime.pos.y < state.slime.radius || state.slime.pos.y > DEVOURER_SLIME_WORLD.height - state.slime.radius) {
      throw new Error("Devourer Slime responsive slime actor is invalid");
    }
    if (!Array.isArray(state.orbs) || state.orbs.length !== restoredWords.length
      || !Array.isArray(state.knights) || !Array.isArray(state.enemies)
      || state.enemies.length !== state.knights.length || state.knights.length > knightCount) {
      throw new Error("Devourer Slime responsive actors are invalid");
    }
    const currentSentenceKnightsEaten = knightCount - state.knights.length;
    const previousSentenceMaximum = state.currentSentenceIndex * knightCount;
    if (state.knightsEaten < currentSentenceKnightsEaten
      || state.knightsEaten > previousSentenceMaximum + currentSentenceKnightsEaten) {
      throw new Error("Devourer Slime responsive knight state is inconsistent");
    }
    const orbIds = new Set<string>();
    const expectedEaten = new Map<string, number>();
    for (const word of restoredWords.slice(0, state.targetWordIndex)) {
      expectedEaten.set(word, (expectedEaten.get(word) ?? 0) + 1);
    }
    const actualEaten = new Map<string, number>();
    const visibleCount = state.orbs.filter((orb) => orb.isVisible && !orb.isEaten).length;
    if (visibleCount > MAX_VISIBLE_SLIME_ORBS
      || (state.phase === "playing" && !state.orbs.some((orb) => orb.isVisible && !orb.isEaten && orb.word === state.answer))) {
      throw new Error("Devourer Slime responsive orb wave is invalid");
    }
    for (const [index, orb] of state.orbs.entries()) {
      if (!orb || orb.id !== `orb:${state.currentSentenceIndex}:${index}` || orbIds.has(orb.id)
        || orb.word !== restoredWords[index] || orb.index !== index || orb.sentenceIndex !== state.currentSentenceIndex
        || orb.radius !== ORB_RADIUS || typeof orb.isEaten !== "boolean" || typeof orb.isVisible !== "boolean"
        || !Number.isFinite(orb.pos.x) || !Number.isFinite(orb.pos.y)
        || orb.pos.x < orb.radius || orb.pos.x > DEVOURER_SLIME_WORLD.width - orb.radius
        || orb.pos.y < orb.radius || orb.pos.y > DEVOURER_SLIME_WORLD.height - orb.radius) {
        throw new Error("Devourer Slime responsive orb actor is invalid");
      }
      if (orb.isEaten) actualEaten.set(orb.word, (actualEaten.get(orb.word) ?? 0) + 1);
      orbIds.add(orb.id);
    }
    if (actualEaten.size !== expectedEaten.size
      || [...expectedEaten].some(([word, count]) => actualEaten.get(word) !== count)) {
      throw new Error("Devourer Slime responsive eaten words are invalid");
    }
    const knightIds = new Set<string>();
    for (const [index, knight] of state.knights.entries()) {
      if (!knight || !/^knight:\d+$/u.test(knight.id) || knightIds.has(knight.id)
        || knight.id !== `knight:${Number.parseInt(knight.id.slice("knight:".length), 10)}`
        || Number.parseInt(knight.id.slice("knight:".length), 10) >= knightCount
        || knight.radius !== KNIGHT_RADIUS || !Number.isFinite(knight.pos.x) || !Number.isFinite(knight.pos.y)
        || !Number.isFinite(knight.velocity.x) || !Number.isFinite(knight.velocity.y)
        || knight.pos.x < knight.radius || knight.pos.x > DEVOURER_SLIME_WORLD.width - knight.radius
        || knight.pos.y < knight.radius || knight.pos.y > DEVOURER_SLIME_WORLD.height - knight.radius
        || state.enemies[index]?.id !== knight.id
        || state.enemies[index]?.pos.x !== knight.pos.x || state.enemies[index]?.pos.y !== knight.pos.y
        || state.enemies[index]?.velocity.x !== knight.velocity.x || state.enemies[index]?.velocity.y !== knight.velocity.y
        || state.enemies[index]?.radius !== knight.radius) {
        throw new Error("Devourer Slime responsive knight actor is invalid");
      }
      knightIds.add(knight.id);
    }
  };

  const restore = (state: DevourerSlimeSnapshot): void => {
    if (destroyed) return;
    validateRestoredState(state);
    random.restore(state.randomState);
    let restoredCorrect = state.correctAnswers;
    let restoredAttempts = state.totalAttempts;
    let restoredScore = state.score;
    accountant = Object.freeze({
      get correctAnswers() { return restoredCorrect; },
      get totalAttempts() { return restoredAttempts; },
      get accuracy() { return restoredAttempts === 0 ? 0 : restoredCorrect / restoredAttempts; },
      get score() { return restoredScore; },
      recordAttempt({ correct }: { readonly correct: boolean }) { restoredAttempts += 1; if (correct) restoredCorrect += 1; },
      addScore(points: number) { restoredScore += points; },
      computeAccuracy() { return restoredAttempts === 0 ? 0 : restoredCorrect / restoredAttempts; },
      snapshot() { return Object.freeze({ correctAnswers: restoredCorrect, totalAttempts: restoredAttempts, accuracy: restoredAttempts === 0 ? 0 : restoredCorrect / restoredAttempts, score: restoredScore }); },
    });
    phase = state.phase;
    currentSentenceIndex = state.currentSentenceIndex;
    targetWordIndex = state.targetWordIndex;
    score = state.score;
    lives = state.lives;
    gameTime = state.gameTime;
    invulnerabilityMs = state.invulnerabilityMs;
    lastEvent = state.lastEvent;
    terminalResultValue = state.result;
    slime = {
      pos: { ...state.slime.pos },
      radius: state.slime.radius,
    };
    orbs = state.orbs.map(({ isVisible: _isVisible, ...orb }) => ({ ...orb, pos: { ...orb.pos } }));
    knights = state.knights.map((knight) => ({
      ...knight,
      pos: { ...knight.pos },
      velocity: { ...knight.velocity },
    }));
    knightsEaten = state.knightsEaten;
    destroyed = state.destroyed;
    if (destroyed || phase !== "playing") completion.sealWithoutDelivery();
  };

  return Object.freeze({
    snapshot,
    choose,
    move: moveSlime,
    moveTo(position: DevourerSlimePoint): DevourerSlimeSnapshot {
      if (destroyed || phase !== "playing") return snapshot();
      if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
        throw new Error("Devourer Slime position must be finite");
      }
      slime.pos = clampPosition(position, slime.radius);
      return snapshot();
    },
    tick(deltaMs = 16.67): DevourerSlimeTickResult {
      if (destroyed || phase !== "playing") return Object.freeze({ snapshot: snapshot() });
      const delta = Math.min(
        DEVOURER_SLIME_MAX_FRAME_DELTA_MS,
        finiteNonNegative(deltaMs, "Devourer Slime frame delta"),
      );
      gameTime += delta;
      invulnerabilityMs = Math.max(0, invulnerabilityMs - delta);
      lastEvent = undefined;
      knights = knights.map((knight) => {
        const next = {
          x: knight.pos.x + knight.velocity.x * delta,
          y: knight.pos.y + knight.velocity.y * delta,
        };
        const velocity = { ...knight.velocity };
        if (next.x < knight.radius || next.x > DEVOURER_SLIME_WORLD.width - knight.radius) velocity.x *= -1;
        if (next.y < knight.radius || next.y > DEVOURER_SLIME_WORLD.height - knight.radius) velocity.y *= -1;
        return {
          ...knight,
          pos: clampPosition(next, knight.radius),
          velocity,
        };
      });

      const orb = orbs.find((candidate) => !candidate.isEaten && overlaps(
        slime.pos,
        slime.radius,
        candidate.pos,
        candidate.radius,
      ));
      if (orb) {
        const action = resolveOrb(orb.id, false);
        return Object.freeze({ snapshot: action.snapshot, ...(action.snapshot.lastEvent ? { event: action.snapshot.lastEvent } : {}) });
      }

      const knight = knights.find((candidate) => overlaps(
        slime.pos,
        slime.radius,
        candidate.pos,
        candidate.radius,
      ));
      if (knight) {
        const event = resolveKnight(knight);
        return Object.freeze({ snapshot: snapshot(), event });
      }
      return Object.freeze({ snapshot: snapshot() });
    },
    collectOrb(orbId: string): DevourerSlimeActionResult {
      return resolveOrb(orbId, false);
    },
    applyHazard(): DevourerSlimeActionResult {
      const before = snapshot();
      if (destroyed || phase !== "playing") {
        return createActionResult(before, {
          accepted: false,
          correct: false,
          progressed: false,
          terminal: false,
          completed: false,
        });
      }
      const finalResult = damage();
      return createActionResult(snapshot(), {
        accepted: true,
        correct: false,
        progressed: false,
        terminal: finalResult !== undefined,
        completed: finalResult !== undefined,
        ...(finalResult ? { result: finalResult } : {}),
      });
    },
    demonstrateOrb(correct: boolean): DevourerSlimeActionResult {
      const target = orbs.find((orb) => !orb.isEaten && orb.index === targetWordIndex);
      const selected = correct
        ? target
        : orbs.find((orb) => !orb.isEaten && orb.index !== targetWordIndex);
      return selected ? resolveOrb(selected.id, true) : createActionResult(snapshot(), {
        accepted: false,
        correct: false,
        progressed: false,
        terminal: false,
        completed: false,
      });
    },
    capture: snapshot,
    restore,
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      completion.sealWithoutDelivery();
    },
  });
}

function dimensions(scene: PhaserSceneLike): { width: number; height: number } {
  return {
    width: scene.scale?.width ?? DEVOURER_SLIME_CANVAS.width,
    height: scene.scale?.height ?? DEVOURER_SLIME_CANVAS.height,
  };
}

function worldTransform(scene: PhaserSceneLike): {
  readonly scale: number;
  readonly offsetX: number;
  readonly offsetY: number;
} {
  const { width, height } = dimensions(scene);
  const scale = Math.min(width / DEVOURER_SLIME_WORLD.width, height / DEVOURER_SLIME_WORLD.height);
  return {
    scale,
    offsetX: (width - DEVOURER_SLIME_WORLD.width * scale) / 2,
    offsetY: (height - DEVOURER_SLIME_WORLD.height * scale) / 2,
  };
}

function pointerToWorld(scene: PhaserSceneLike, x: number, y: number): DevourerSlimePoint {
  const { width, height } = dimensions(scene);
  const rect = scene.game?.canvas?.getBoundingClientRect?.();
  const localX = rect && rect.width > 0 ? (x - rect.left) * (width / rect.width) : x;
  const localY = rect && (rect.height ?? height) > 0
    ? (y - (rect.top ?? 0)) * (height / (rect.height ?? height))
    : y;
  const transform = worldTransform(scene);
  return {
    x: (localX - transform.offsetX) / transform.scale,
    y: (localY - transform.offsetY) / transform.scale,
  };
}

function pointerAction(
  scene: PhaserSceneLike,
  pointer: {
    readonly startX: number;
    readonly startY: number;
    readonly x: number;
    readonly y: number;
    readonly down: boolean;
  },
  snapshot: DevourerSlimeSnapshot,
  normalize: ReturnType<typeof createInputActionNormalizer>,
): InputActionId | undefined {
  const deltaX = pointer.x - pointer.startX;
  const deltaY = pointer.y - pointer.startY;
  if (pointer.down) {
    return normalize({
      modality: "pointer",
      phase: "drag",
      x: pointer.x,
      y: pointer.y,
      deltaX,
      deltaY,
    })[0]?.action;
  }
  const dragAction = directionFromPointerDelta(deltaX, deltaY);
  if (dragAction) return dragAction;
  const pointerActionResult = normalize({
    modality: "pointer",
    phase: "up",
    x: pointer.x,
    y: pointer.y,
  })[0]?.action;
  if (pointerActionResult !== "confirm") return undefined;
  const point = pointerToWorld(scene, pointer.x, pointer.y);
  const activeOrb = snapshot.orbs.find((orb) => orb.index === snapshot.targetWordIndex && !orb.isEaten);
  if (activeOrb && overlaps(snapshot.slime.pos, snapshot.slime.radius, activeOrb.pos, activeOrb.radius)) {
    return "confirm";
  }
  return directionFromPointerDelta(
    point.x - snapshot.slime.pos.x,
    point.y - snapshot.slime.pos.y,
  );
}

function createScene(context: DevourerSlimeSceneContext): Readonly<Record<string, unknown>> {
  let resources: SceneResources | undefined;
  let composition = context.composition;
  let animationMs = 0;
  let cleaned = false;
  const previousKeys = new Set<string>();
  const normalize = createInputActionNormalizer({
    keyboard: DEVOURER_SLIME_KEYBOARD_BINDINGS,
    pointerTap: { action: "confirm" },
    pointerDrag: {
      leftAction: "move-left",
      rightAction: "move-right",
      upAction: "move-up",
      downAction: "move-down",
      threshold: POINTER_THRESHOLD,
    },
  });
  let collisionHandledByAction = false;
  const frameScheduler = createBoundedFrameScheduler((deltaMs) => {
    animationMs = (animationMs + deltaMs) % 2000;
  });

  const keyboardAction = (keys: readonly string[], pressed: readonly string[]): InputActionId | undefined => {
    const available = new Set([...keys, ...pressed]);
    for (const code of KEYBOARD_PRIORITY) {
      if (available.has(code)) return DEVOURER_SLIME_KEYBOARD_BINDINGS[code];
    }
    if (available.has("Space")) return "confirm";
    return undefined;
  };

  const updateView = (scene: PhaserSceneLike): void => {
    if (!resources || !scene.add) return;
    const state = context.controller.snapshot();
    const { width, height } = dimensions(scene);
    const transform = worldTransform(scene);
    const activeResources = resources;
    const pulse = Math.sin(animationMs / 2000 * Math.PI * 2) * 3;
    const toX = (value: number): number => transform.offsetX + value * transform.scale;
    const toY = (value: number): number => transform.offsetY + value * transform.scale;

    activeResources.graphics.clear();
    if (!activeResources.art.ground("world:ground", width, height)) activeResources.graphics.fillStyle(0x031c17, 1).fillRect(0, 0, width, height);
    activeResources.graphics.fillStyle(0x064e3b, 0.42).fillRect(
      transform.offsetX,
      transform.offsetY,
      DEVOURER_SLIME_WORLD.width * transform.scale,
      DEVOURER_SLIME_WORLD.height * transform.scale,
    );
    activeResources.graphics.lineStyle(3, 0x34d399, 0.8).strokeRoundedRect(
      transform.offsetX,
      transform.offsetY,
      DEVOURER_SLIME_WORLD.width * transform.scale,
      DEVOURER_SLIME_WORLD.height * transform.scale,
      18,
    );
    for (const orb of state.orbs) {
      if (orb.isEaten || !orb.isVisible) continue;
      const labelWidth = Math.min(width - 32, Math.max(112, orb.word.length * 22));
      activeResources.graphics.fillStyle(0x082f49, 0.94).fillRoundedRect(
        toX(orb.pos.x) - labelWidth / 2,
        toY(orb.pos.y) - 30,
        labelWidth,
        60,
        14,
      );
      activeResources.graphics.fillStyle(0xfbbf24, 0.95).fillCircle(
        toX(orb.pos.x),
        toY(orb.pos.y),
        orb.radius * transform.scale,
      );
    }
    state.knights.forEach((knight, index) => {
      if (activeResources.art.place(`knight:${index}`, "enemy:idle", {
        x: toX(knight.pos.x),
        y: toY(knight.pos.y),
        width: knight.radius * 6.5 * transform.scale,
        depth: 7,
      })) return;
      activeResources.graphics.fillStyle(0x94a3b8, 1).fillRoundedRect(
        toX(knight.pos.x) - knight.radius * transform.scale,
        toY(knight.pos.y) - knight.radius * transform.scale,
        knight.radius * 2 * transform.scale,
        knight.radius * 2 * transform.scale,
        8,
      );
      activeResources.graphics.fillStyle(0xef4444, 1).fillCircle(
        toX(knight.pos.x),
        toY(knight.pos.y - knight.radius * 0.3),
        Math.max(2, knight.radius * transform.scale * 0.1),
      );
    });
    if (!activeResources.art.place("player", "player:idle", {
      x: toX(state.slime.pos.x),
      y: toY(state.slime.pos.y) + pulse,
      width: state.slime.radius * 6.5 * transform.scale,
      depth: 8,
    })) {
      activeResources.graphics.fillStyle(state.lastEvent === "hit" || state.lastEvent === "incorrect" ? 0xef4444 : 0x4ade80, 0.85)
        .fillCircle(toX(state.slime.pos.x), toY(state.slime.pos.y) + pulse, state.slime.radius * transform.scale);
    }
    activeResources.art.sweep();
    activeResources.graphics.fillStyle(0xd9f99d, 0.95)
      .fillCircle(toX(state.slime.pos.x - state.slime.radius * 0.3), toY(state.slime.pos.y - state.slime.radius * 0.2) + pulse, Math.max(2, state.slime.radius * transform.scale * 0.12));
    activeResources.graphics.fillStyle(0xd9f99d, 0.95)
      .fillCircle(toX(state.slime.pos.x + state.slime.radius * 0.3), toY(state.slime.pos.y - state.slime.radius * 0.2) + pulse, Math.max(2, state.slime.radius * transform.scale * 0.12));

    activeResources.graphics.fillStyle(0x052e2b, 0.96).fillRect(0, 0, width, 112);
    activeResources.title.setText("");
    activeResources.prompt.setText(state.prompt).setPosition(24, 22);
    activeResources.progress.setText(
      `${tokenize(state.sentence).slice(0, state.targetWordIndex).join(" ")}  ${state.targetIndex}/${state.targetCount}  •  ${state.score}  •  ♥ ${state.lives}`,
    ).setPosition(24, 70);
    activeResources.feedback.setText(
      state.phase === "victory"
        ? "Every sentence is complete!"
        : state.phase === "defeat"
          ? "The knights overwhelmed the slime."
          : state.lastEvent === "incorrect"
            ? "×"
            : state.lastEvent === "eat-enemy"
              ? "+500"
              : "",
    ).setPosition(24, height - 65);
    activeResources.instructions.setText("");
    state.orbs.forEach((orb, index) => {
      const label = activeResources.orbLabels[index];
      if (!label) return;
      const labelOffset = Math.min(width - 32, Math.max(112, orb.word.length * 22)) / 2 - 14;
      label.setText(orb.isEaten || !orb.isVisible ? "" : orb.word).setPosition(toX(orb.pos.x) - labelOffset, toY(orb.pos.y) - 10);
    });
    for (let index = state.orbs.length; index < activeResources.orbLabels.length; index += 1) {
      activeResources.orbLabels[index]?.setText("");
    }
  };

  const reportAction = (): void => {
    const state = context.controller.snapshot();
    context.diagnostic({
      level: "info",
      code: state.phase === "victory" || state.phase === "defeat"
        ? "DEVOURER_SLIME_TERMINAL"
        : "DEVOURER_SLIME_ACTION",
      message: "Devourer Slime processed an interaction.",
      details: {
        cartridgeId: DEVOURER_SLIME_ID,
        phase: state.phase,
        targetWordIndex: state.targetWordIndex,
        totalAttempts: state.totalAttempts,
      },
    });
  };

  const applyAction = (action: InputActionId, deltaMs: number): DevourerSlimeActionResult => {
    const before = context.controller.snapshot();
    const result = context.controller.choose(action, deltaMs);
    const after = context.controller.snapshot();
    collisionHandledByAction = result.terminal || after.totalAttempts !== before.totalAttempts;
    if (after.totalAttempts !== before.totalAttempts || after.phase !== before.phase) reportAction();
    return result;
  };

  const cleanup = (): void => {
    if (cleaned) return;
    cleaned = true;
    frameScheduler.cancel();
    context.controller.destroy();
    if (!resources) return;
    const activeResources = resources;
    resources = undefined;
    activeResources.graphics.destroy();
    activeResources.title.destroy();
    activeResources.prompt.destroy();
    activeResources.progress.destroy();
    activeResources.feedback.destroy();
    activeResources.instructions.destroy();
    for (const label of activeResources.orbLabels) label.destroy();
    previousKeys.clear();
  };


  const artKeys = ["world:ground", "player:idle", "enemy:idle"] as const;

  const preload = function (this: PhaserSceneLike): void {
    if (!this.load) return;
    preloadAssetBindings(
      this.load,
      context.edition,
      artKeys.filter((key) => context.edition.bindings[key]),
    );
  };

  const create = function (this: PhaserSceneLike): void {
    if (cleaned) return;
    if (!this.add) throw new Error("Devourer Slime requires Phaser display services");
    const logicalWidth = dimensions(this).width;
    const displayWidth = this.game?.canvas?.getBoundingClientRect?.().width ?? logicalWidth;
    const renderedScale = Math.max(0.1, displayWidth / logicalWidth);
    const displayFont = (pixels: number, maximum = 48): string => `${Math.min(maximum, Math.ceil(pixels / renderedScale))}px`;
    const textStyle = { fontFamily: "Arial", color: "#f0fdf4", fontSize: displayFont(16) };
    resources = {
      graphics: this.add.graphics(),
      art: createActorSpriteLayer(this, context.edition),
      title: this.add.text(24, 18, "DEVOURER SLIME", { ...textStyle, fontSize: "29px", fontStyle: "bold" }),
      prompt: this.add.text(24, 54, "", { ...textStyle, fontSize: displayFont(20), fontStyle: "bold", wordWrap: { width: logicalWidth - 48, useAdvancedWrap: true } }),
      progress: this.add.text(24, 91, "", { ...textStyle, fontSize: displayFont(16), color: "#bbf7d0" }),
      feedback: this.add.text(24, 0, "", { ...textStyle, fontSize: "17px", color: "#fde68a" }),
      instructions: this.add.text(24, 0, "", { ...textStyle, fontSize: "15px", color: "#cbd5e1" }),
      orbLabels: Array.from({ length: context.maxWords }, () => this.add!.text(0, 0, "", { ...textStyle, fontSize: displayFont(16, 46), fontStyle: "bold" })),
    };
    this.events?.once("shutdown", cleanup);
    this.events?.once("destroy", cleanup);
    updateView(this);
  };

  const update = function (this: PhaserSceneLike, _time = 0, delta = 16.67): void {
    if (!resources || cleaned) return;
    frameScheduler.tick(delta);
    const frameDelta = frameScheduler.lastDeltaMs;
    if (context.sessionMode === "playing") {
      const input = context.inputController.snapshot();
      const action = keyboardAction(input.keys, input.pressed ?? []);
      if (action) {
        applyAction(action, frameDelta);
      } else if (input.pointer.down || (input.pointer.released && !input.pointer.cancelled)) {
        const pointerMovement = pointerAction(this, input.pointer, context.controller.snapshot(), normalize);
        if (pointerMovement) applyAction(pointerMovement, frameDelta);
      }
      if (!collisionHandledByAction) context.controller.tick(frameDelta);
      collisionHandledByAction = false;
    }
    updateView(this);
  };

  return {
    key: DEVOURER_SLIME_ID,
    preload,
    create,
    update,
    extend: {
      apkCaptureResponsiveState: () => context.controller.capture(),
      apkRestoreResponsiveState: (state: unknown) => {
        if (typeof state !== "object" || state === null) throw new Error("Devourer Slime responsive state is invalid");
        context.controller.restore(state as DevourerSlimeSnapshot);
      },
      apkRecompose: (nextComposition: DevourerSlimeSceneContext["composition"]) => {
        composition = nextComposition;
      },
    },
  };
}

/** Creates the standard Devourer Slime Phaser cartridge. */
export function createDevourerSlimeCartridge(): StandardExperienceCartridge {
  let activeController: DevourerSlimeController | undefined;
  const standardExperience = createCartridgeStandardExperience({
    id: DEVOURER_SLIME_ID,
    title: "Devourer Slime",
    description: "Eat ordered words, grow larger, and overpower the knights in your path.",
    inputMode: "sentence",
    objective: "Eat every sentence word in order before the knights drain your lives.",
    mechanicInstruction: "Move the slime through the world toward the next word orb.",
    keyboardKeys: ["W", "A", "S", "D", "Arrow keys"] as const,
    executeTutorialAction: (actionId) => {
      const controller = activeController;
      if (!controller) return;
      controller.demonstrateOrb(actionId === "action:select-correct");
    },
  });

  return {
    manifest: {
      id: DEVOURER_SLIME_ID,
      title: "Devourer Slime",
      description: "Eat ordered words, grow larger, and overpower the knights in your path.",
      runtimeApiVersion: "1.0.0",
      inputMode: "sentence",
      requiredAssetBindings: ["devourer-slime/player"],
      capabilities: [
        "capability:four-way-movement",
        "capability:ordered-word-orbs",
        "capability:slime-growth",
        "capability:knight-size-collisions",
        "capability:bounded-frame-delta",
        "capability:single-completion-emission",
      ],
    },
    standardExperience,
    createGameConfig(context: CartridgeGameConfigContext): Readonly<Record<string, unknown>> {
      const input = sentenceInputSchema.parse(context.input);
      const sessionMode = context.sessionMode ?? "playing";
      const controller = createDevourerSlimeController(
        input,
        sessionMode === "playing"
          ? (result) => context.complete(result, controller.snapshot().phase === "defeat" ? "defeat" : "victory")
          : () => undefined,
        { seed: context.seed },
      );
      activeController = controller;
      const maxWords = input.reduce((maximum, item) => Math.max(maximum, tokenize(item.term).length), 0);
      context.diagnostic({
        level: "debug",
        code: "DEVOURER_SLIME_READY",
        message: "Devourer Slime movement world is ready.",
        details: {
          cartridgeId: DEVOURER_SLIME_ID,
          editionId: context.edition.id,
          sentenceCount: input.length,
          seed: controller.snapshot().seed,
        },
      });
      return {
        width: DEVOURER_SLIME_CANVAS.width,
        height: DEVOURER_SLIME_CANVAS.height,
        render: { antialias: false, pixelArt: true },
        scene: createScene({
          controller,
          edition: context.edition,
          inputController: context.inputController,
          composition: context.composition,
          sessionMode,
          maxWords,
          diagnostic: context.diagnostic,
        }),
      };
    },
  };
}
