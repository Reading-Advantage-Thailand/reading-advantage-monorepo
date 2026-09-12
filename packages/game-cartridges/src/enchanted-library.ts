import {
  gameResultsSchema,
  vocabularyInputSchema,
  type GameResults,
  type VocabularyItem,
} from "@reading-advantage/game-contracts";
import {
  createActorSpriteLayer,
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

/** Stable public identifier for the Enchanted Library cartridge. */
export const ENCHANTED_LIBRARY_ID = "enchanted-library" as const;

/** Phaser canvas size used before the host applies responsive scaling. */
export const ENCHANTED_LIBRARY_CANVAS = Object.freeze({ width: 960, height: 540 });

/** Logical library width used by deterministic collision coordinates. */
export const GAME_WIDTH = 800;

/** Logical library height used by deterministic collision coordinates. */
export const GAME_HEIGHT = 600;

/** Player collision radius in logical pixels. */
export const PLAYER_RADIUS = 20;

/** Book collision radius in logical pixels. */
export const BOOK_RADIUS = 25;

/** Spirit collision radius in logical pixels. */
export const SPIRIT_RADIUS = 15;

/** Mana available when a session starts. */
export const INITIAL_MANA = 50;

/** Mana awarded for one correct book. */
export const MANA_GAIN_CORRECT = 10;

/** Mana lost when the player collects a wrong book. */
export const MANA_LOSS_INCORRECT = 5;

/** Mana lost when an unshielded spirit reaches the player. */
export const MANA_LOSS_SPIRIT_HIT = 10;

/** Maximum number of shield charges held by the player. */
export const MAX_SHIELD_CHARGES = 3;

/** Shield lifetime after one charge is activated. */
export const SHIELD_DURATION_MS = 2_000;

/** Session countdown duration. */
export const ENCHANTED_LIBRARY_DURATION_MS = 180_000;

/** Delay between deterministic spirit spawns. */
export const SPIRIT_SPAWN_RATE_MS = 3_000;

/** Player movement speed in logical pixels per second. */
export const PLAYER_SPEED = 180;

/** Spirit movement speed in logical pixels per second. */
export const SPIRIT_SPEED = 75;

/** Compatibility alias for the legacy shield duration constant. */
export const SHIELD_DURATION = SHIELD_DURATION_MS;

/** Compatibility alias for the legacy game duration constant. */
export const GAME_DURATION_MS = ENCHANTED_LIBRARY_DURATION_MS;

/** Keyboard bindings for four-way movement and shield activation. */
export const ENCHANTED_LIBRARY_KEYBOARD_BINDINGS: Readonly<Record<string, InputActionId>> = Object.freeze({
  ArrowUp: "move-up",
  KeyW: "move-up",
  ArrowLeft: "move-left",
  KeyA: "move-left",
  ArrowDown: "move-down",
  KeyS: "move-down",
  ArrowRight: "move-right",
  KeyD: "move-right",
  Space: "confirm",
  Enter: "confirm",
});

/** Semantic actions accepted by the Enchanted Library controller. */
export const ENCHANTED_LIBRARY_ACTIONS: readonly InputActionId[] = Object.freeze([
  "move-up",
  "move-down",
  "move-left",
  "move-right",
  "confirm",
]);

/** One logical coordinate in the library. */
export interface EnchantedLibraryPoint {
  /** Horizontal logical coordinate. */
  readonly x: number;
  /** Vertical logical coordinate. */
  readonly y: number;
}

/** One four-way movement action accepted by the controller. */
export type EnchantedLibraryDirection =
  | "move-up"
  | "move-down"
  | "move-left"
  | "move-right";

/** One input frame supplied to the transport-independent rules. */
export interface EnchantedLibraryInput {
  /** Optional movement vector for continuous pointer steering. */
  readonly steer?: Readonly<EnchantedLibraryPoint>;
  /** Whether the player moves upward during this frame. */
  readonly up?: boolean;
  /** Whether the player moves downward during this frame. */
  readonly down?: boolean;
  /** Whether the player moves left during this frame. */
  readonly left?: boolean;
  /** Whether the player moves right during this frame. */
  readonly right?: boolean;
  /** Whether one shield charge should activate during this frame. */
  readonly cast?: boolean;
}

/** Deterministic setup for one Enchanted Library session. */
export interface EnchantedLibraryControllerOptions {
  /** Seed used for book placement and spirit hazard order. */
  readonly seed?: number;
}

/** The player entity exposed by an Enchanted Library snapshot. */
export interface EnchantedLibraryPlayer extends EnchantedLibraryPoint {
  /** Stable player identity. */
  readonly id: "player";
  /** Collision radius. */
  readonly radius: number;
  /** Current movement speed. */
  readonly speed: number;
  /** Available shield charges. */
  readonly shieldCharges: number;
  /** Maximum shield charges. */
  readonly maxShieldCharges: number;
}

/** A positioned English book in the current library round. */
export interface EnchantedLibraryBook extends EnchantedLibraryPoint {
  /** Stable identity for the current deterministic layout. */
  readonly id: string;
  /** Collision radius. */
  readonly radius: number;
  /** Source-language term represented by the book. */
  readonly term: string;
  /** Thai translation associated with the English book. */
  readonly translation: string;
  /** Whether this book matches the active target term. */
  readonly isCorrect: boolean;
}

/** A moving spirit hazard in the library. */
export interface EnchantedLibrarySpirit extends EnchantedLibraryPoint {
  /** Stable identity for the spirit. */
  readonly id: string;
  /** Collision radius. */
  readonly radius: number;
  /** Horizontal velocity in logical pixels per second. */
  readonly velocityX: number;
  /** Vertical velocity in logical pixels per second. */
  readonly velocityY: number;
  /** Current scalar speed. */
  readonly speed: number;
  /** Whether the spirit has bounced from the active shield. */
  readonly bounced: boolean;
  /** Whether this spirit already drained mana during its current contact. */
  readonly hasHitPlayer: boolean;
}

/** Active or terminal phase in an Enchanted Library session. */
export type EnchantedLibraryPhase = "playing" | "victory" | "defeat";

/** Feedback event produced by one movement, shield, or timed update. */
export type EnchantedLibraryEvent =
  | "none"
  | "book-correct"
  | "book-wrong"
  | "shield-activated"
  | "shield-unavailable"
  | "spirit-hit"
  | "shield-blocked"
  | "timer-expired"
  | "mana-depleted";

/** Immutable state exposed by the library controller. */
export interface EnchantedLibrarySnapshot {
  /** Current session phase. */
  readonly phase: EnchantedLibraryPhase;
  /** Alias of phase retained for game-state consumers. */
  readonly status: EnchantedLibraryPhase;
  /** Recognizable legacy mechanic represented by this session. */
  readonly mechanic: string;
  /** Number of correct book collections completed. */
  readonly targetIndex: number;
  /** Number of required collections, one per input item. */
  readonly targetCount: number;
  /** Current source-language target term. */
  readonly targetTerm: string;
  /** Alias of targetTerm used by the HUD. */
  readonly targetWord: string;
  /** Current Thai prompt. */
  readonly prompt: string;
  /** Current English answer. */
  readonly answer: string;
  /** Semantic movement action toward the active book. */
  readonly correctAction: InputActionId;
  /** Semantic actions accepted by the controller. */
  readonly availableActions: readonly InputActionId[];
  /** Player position and shield resources. */
  readonly player: EnchantedLibraryPlayer;
  /** Books displayed in the current deterministic layout. */
  readonly books: readonly EnchantedLibraryBook[];
  /** Moving spirits currently in the arena. */
  readonly spirits: readonly EnchantedLibrarySpirit[];
  /** Correct collections per source-language term. */
  readonly vocabularyProgress: ReadonlyMap<string, number>;
  /** Current mana, bounded at zero. */
  readonly mana: number;
  /** Mana represented as the shared controller life field. */
  readonly lives: number;
  /** Mana represented as the shared controller energy field. */
  readonly energy: number;
  /** Whether the shield currently blocks spirit damage. */
  readonly shieldActive: boolean;
  /** Remaining shield lifetime in milliseconds. */
  readonly shieldTimer: number;
  /** Elapsed session time in milliseconds. */
  readonly gameTime: number;
  /** Remaining session time in milliseconds. */
  readonly timeRemaining: number;
  /** Time until the next spirit can spawn. */
  readonly spiritSpawnTimer: number;
  /** Deterministic book-layout sequence number. */
  readonly layoutIndex: number;
  /** Deterministic spirit identity sequence number. */
  readonly spiritCount: number;
  /** Number of correct book collections. */
  readonly correctAnswers: number;
  /** Number of collected books, including wrong books. */
  readonly totalAttempts: number;
  /** Current display score, which follows mana. */
  readonly score: number;
  /** Most recent gameplay outcome. */
  readonly lastOutcome?: "correct" | "incorrect" | "spirit-hit" | "shielded";
  /** Deterministic session seed. */
  readonly seed: number;
  /** First terminal result, when the session has ended. */
  readonly result?: GameResults;
  /** Whether the scene lifecycle has destroyed this session. */
  readonly destroyed: boolean;
}

/** Result returned after one controller operation. */
export interface EnchantedLibraryActionResult {
  /** Whether the operation changed the active session. */
  readonly accepted: boolean;
  /** Whether a collected book matched the target. */
  readonly correct: boolean;
  /** Whether one vocabulary collection advanced. */
  readonly progressed: boolean;
  /** Whether this operation reached a terminal phase. */
  readonly terminal: boolean;
  /** Compatibility alias for terminal. */
  readonly completed: boolean;
  /** Event that explains the operation outcome. */
  readonly event: EnchantedLibraryEvent;
  /** Strict result emitted on the first terminal operation. */
  readonly result?: GameResults;
  /** State after the operation. */
  readonly snapshot: EnchantedLibrarySnapshot;
}

/** Transport-independent Enchanted Library rules and lifecycle controls. */
export interface EnchantedLibraryController {
  /** Returns the current immutable session state. */
  snapshot(): EnchantedLibrarySnapshot;
  /** Moves the player one deterministic step and resolves collisions. */
  move(direction: EnchantedLibraryDirection): EnchantedLibraryActionResult;
  /** Advances time, movement, spirits, collisions, and terminal rules. */
  tick(deltaMs: number, input?: EnchantedLibraryInput): EnchantedLibraryActionResult;
  /** Activates one shield charge when the player has a charge available. */
  activateShield(): EnchantedLibraryActionResult;
  /** Maps a semantic keyboard action to movement or shield activation. */
  choose(action: InputActionId): EnchantedLibraryActionResult;
  /** Applies one immediate spirit-style mana hazard for deterministic host tests. */
  applyHazard(): EnchantedLibraryActionResult;
  /** Captures all gameplay state for a responsive transition. */
  capture(): EnchantedLibrarySnapshot;
  /** Restores validated gameplay state captured before a responsive transition. */
  restore(snapshot: EnchantedLibrarySnapshot): void;
  /** Seals the session and releases future result delivery. */
  destroy(): void;
}

/** Fixed book anchors that keep each layout reproducible across hosts. */
const BOOK_ANCHORS: readonly EnchantedLibraryPoint[] = Object.freeze([
  Object.freeze({ x: 140, y: 160 }),
  Object.freeze({ x: 660, y: 160 }),
  Object.freeze({ x: 140, y: 440 }),
  Object.freeze({ x: 660, y: 440 }),
  Object.freeze({ x: 400, y: 120 }),
  Object.freeze({ x: 680, y: 300 }),
  Object.freeze({ x: 400, y: 480 }),
  Object.freeze({ x: 120, y: 300 }),
]);

/** One shelf rectangle reserved along a room boundary. */
export interface EnchantedLibraryShelfPlacement extends EnchantedLibraryPoint {
  /** Rendered shelf width. */
  readonly width: number;
  /** Rendered shelf height. */
  readonly height: number;
  /** Semantic shelf binding used by the scene. */
  readonly binding: "prop:0" | "prop:1";
}

/**
 * Places shelves in the side margins outside every possible book card.
 * @param width Current scene width.
 * @param height Current scene height.
 * @returns Six shelf rectangles along the left and right room boundaries.
 */
export function calculateEnchantedLibraryShelfPlacements(
  width: number,
  height: number,
): readonly EnchantedLibraryShelfPlacement[] {
  const shelfWidth = Math.min(32, Math.max(14, width * 0.035));
  const shelfHeight = shelfWidth * 2;
  return Object.freeze([0.32, 0.52, 0.72].flatMap((verticalRatio) => [
    Object.freeze({ x: shelfWidth / 2 + 4, y: height * verticalRatio, width: shelfWidth, height: shelfHeight, binding: "prop:0" as const }),
    Object.freeze({ x: width - shelfWidth / 2 - 4, y: height * verticalRatio, width: shelfWidth, height: shelfHeight, binding: "prop:1" as const }),
  ]));
}

const EMPTY_INPUT: EnchantedLibraryInput = Object.freeze({
  steer: Object.freeze({ x: 0, y: 0 }),
  up: false,
  down: false,
  left: false,
  right: false,
  cast: false,
});

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function assertDelta(deltaMs: number): void {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new Error("Enchanted Library delta must be a nonnegative finite number");
  }
}

function normalizeSeed(seed: number | undefined): number {
  if (seed === undefined) return 0;
  if (!Number.isFinite(seed)) throw new Error("Enchanted Library seed must be finite");
  return Math.abs(Math.trunc(seed)) % 2_147_483_647;
}

function distanceBetween(first: EnchantedLibraryPoint, second: EnchantedLibraryPoint): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function targetItem(items: readonly VocabularyItem[], targetIndex: number): VocabularyItem {
  return items[Math.min(targetIndex, items.length - 1)]!;
}

function directionActionFor(
  player: EnchantedLibraryPoint,
  book: EnchantedLibraryPoint,
): InputActionId {
  const horizontalDistance = Math.abs(book.x - player.x);
  const verticalDistance = Math.abs(book.y - player.y);
  if (horizontalDistance >= verticalDistance) return book.x >= player.x ? "move-right" : "move-left";
  return book.y >= player.y ? "move-down" : "move-up";
}

function directionVector(direction: EnchantedLibraryDirection): EnchantedLibraryPoint {
  if (direction === "move-left") return { x: -1, y: 0 };
  if (direction === "move-right") return { x: 1, y: 0 };
  if (direction === "move-up") return { x: 0, y: -1 };
  return { x: 0, y: 1 };
}

function nextDirectionToward(
  player: EnchantedLibraryPoint,
  book: EnchantedLibraryPoint,
  horizontalFirst: boolean,
): EnchantedLibraryDirection {
  const horizontalDistance = Math.abs(book.x - player.x);
  const verticalDistance = Math.abs(book.y - player.y);
  const horizontal: EnchantedLibraryDirection = book.x >= player.x ? "move-right" : "move-left";
  const vertical: EnchantedLibraryDirection = book.y >= player.y ? "move-down" : "move-up";
  const reach = PLAYER_RADIUS + BOOK_RADIUS;
  if (horizontalFirst) {
    if (horizontalDistance > reach) return horizontal;
    if (verticalDistance > reach) return vertical;
  } else {
    if (verticalDistance > reach) return vertical;
    if (horizontalDistance > reach) return horizontal;
  }
  return directionActionFor(player, book) as EnchantedLibraryDirection;
}

/**
 * Plans the moves that reach the selected book and restores the starting state.
 * @param controller The active library controller.
 * @param correct True to reach the correct book, false to reach an incorrect book.
 * @returns The ordered moves, or an empty list when no route reaches the book.
 */
function planRouteToSelectedBook(
  controller: EnchantedLibraryController,
  correct: boolean,
): readonly EnchantedLibraryDirection[] {
  const initial = controller.capture();
  const target = initial.books.find((book) => book.isCorrect === correct);
  if (!target) return [];

  for (const horizontalFirst of [true, false]) {
    controller.restore(initial);
    const route: EnchantedLibraryDirection[] = [];
    for (let attempt = 0; attempt < 150; attempt += 1) {
      const state = controller.snapshot();
      const book = state.books.find((candidate) => candidate.id === target.id);
      if (!book) break;

      const direction = nextDirectionToward(state.player, book, horizontalFirst);
      route.push(direction);
      const result = controller.move(direction);
      if (result.event === "book-correct" || result.event === "book-wrong" || result.terminal) {
        if (result.correct === correct) {
          controller.restore(initial);
          return Object.freeze(route);
        }
        break;
      }
    }
  }
  controller.restore(initial);
  return [];
}

function freezeBook(book: EnchantedLibraryBook): EnchantedLibraryBook {
  return Object.freeze({ ...book });
}

function freezeSpirit(spirit: EnchantedLibrarySpirit): EnchantedLibrarySpirit {
  return Object.freeze({ ...spirit });
}

function createBooks(
  items: readonly VocabularyItem[],
  targetIndex: number,
  layoutIndex: number,
  seed: number,
): readonly EnchantedLibraryBook[] {
  const target = targetItem(items, targetIndex);
  const decoyPool = items.filter((item) => item.term !== target.term);
  const decoys = Array.from(
    { length: Math.min(3, decoyPool.length) },
    (_value, index) => decoyPool[(seed + targetIndex + layoutIndex + index) % decoyPool.length]!,
  );
  const choices = [target, ...decoys];
  const correctSlot = 0;
  const remainingDecoys = choices.slice(1);
  return Object.freeze(Array.from({ length: choices.length }, (_value, index) => {
    const item = index === correctSlot ? target : remainingDecoys.shift()!;
    const anchor = BOOK_ANCHORS[(index + layoutIndex * 4 + seed) % BOOK_ANCHORS.length]!;
    return freezeBook({
      id: `book:${targetIndex}:${layoutIndex}:${index}`,
      x: anchor.x,
      y: anchor.y,
      radius: BOOK_RADIUS,
      term: item.term,
      translation: item.translation,
      isCorrect: index === correctSlot,
    });
  }));
}

function freezeSnapshot(snapshot: EnchantedLibrarySnapshot): EnchantedLibrarySnapshot {
  return Object.freeze({
    ...snapshot,
    player: Object.freeze({ ...snapshot.player }),
    books: Object.freeze(snapshot.books.map((book) => Object.freeze({ ...book }))),
    spirits: Object.freeze(snapshot.spirits.map((spirit) => Object.freeze({ ...spirit }))),
    vocabularyProgress: new Map(snapshot.vocabularyProgress),
  });
}

function makeResult(
  snapshot: EnchantedLibrarySnapshot,
  values: Omit<EnchantedLibraryActionResult, "snapshot">,
): EnchantedLibraryActionResult {
  return Object.freeze({ ...values, snapshot });
}

function createGameResult(
  accountant: ReturnType<typeof createResultAccountant>,
  mana: number,
  gameTime: number,
): GameResults {
  const accounted = finalizeResult(accountant, {
    xpPerCorrect: 1,
    xpPerAccuracyPoint: 0,
    xpCap: 10,
    zeroAttemptsXp: 0,
  });
  const accuracyBonus = accountant.totalAttempts > 0 && accountant.accuracy === 1 ? 2 : 0;
  const survivalBonus = mana / INITIAL_MANA >= 0.5 ? 1 : 0;
  const speedBonus = gameTime < 60_000 ? 1 : 0;
  return gameResultsSchema.parse({
    accuracy: accounted.accuracy,
    xp: Math.min(10, accounted.xp + accuracyBonus + survivalBonus + speedBonus),
    score: accounted.score,
    correctAnswers: accounted.correctAnswers,
    totalAttempts: accounted.totalAttempts,
  });
}

/**
 * Calculates the legacy Enchanted Library XP policy from a snapshot and counters.
 * @param snapshot State that supplies mana and elapsed time.
 * @param correctAnswers Number of correct book collections.
 * @param totalAttempts Number of collected books.
 * @returns The bounded Enchanted Library XP value.
 */
export function calculateEnchantedLibraryXP(
  snapshot: Pick<EnchantedLibrarySnapshot, "mana" | "gameTime">,
  correctAnswers: number,
  totalAttempts: number,
): number {
  if (totalAttempts === 0) return 0;
  const accuracy = correctAnswers / totalAttempts;
  const base = Math.max(0, Math.floor(correctAnswers));
  const accuracyBonus = accuracy === 1 ? 2 : 0;
  const survivalBonus = snapshot.mana / INITIAL_MANA >= 0.5 ? 1 : 0;
  const speedBonus = snapshot.gameTime < 60_000 ? 1 : 0;
  return Math.min(10, base + accuracyBonus + survivalBonus + speedBonus);
}

/**
 * Creates transport-independent Enchanted Library collection rules.
 * @param input Untrusted vocabulary content for the session.
 * @param deliver Callback that receives the first terminal result.
 * @param options Deterministic seed for book placement and spirit order.
 * @returns A controller for deterministic book collection and shield play.
 * @throws When input is invalid, empty, or contains duplicate terms.
 */
export function createEnchantedLibraryController(
  input: unknown,
  deliver: CompletionDelivery<GameResults>,
  options: EnchantedLibraryControllerOptions | number = {},
): EnchantedLibraryController {
  const parsed = vocabularyInputSchema.parse(input);
  const content = validateNonEmptyContent(parsed, "vocabulary");
  const items = Object.freeze(content.items.map((item) => Object.freeze({ ...item })));
  if (new Set(items.map((item) => item.term)).size !== items.length) {
    throw new Error("Enchanted Library vocabulary terms must be unique");
  }

  const configuredSeed = typeof options === "number" ? options : options.seed;
  const seed = normalizeSeed(configuredSeed);
  const targetCount = items.length;
  const vocabularyProgress = new Map<string, number>(items.map((item) => [item.term, 0]));
  const completion = createCompletionLatch(deliver);
  let accountant = createResultAccountant();
  let phase: EnchantedLibraryPhase = "playing";
  let targetIndex = 0;
  let layoutIndex = 0;
  let player: EnchantedLibraryPlayer = Object.freeze({
    id: "player",
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT / 2,
    radius: PLAYER_RADIUS,
    speed: PLAYER_SPEED,
    shieldCharges: MAX_SHIELD_CHARGES,
    maxShieldCharges: MAX_SHIELD_CHARGES,
  });
  let books = createBooks(items, targetIndex, layoutIndex, seed);
  let spirits: readonly EnchantedLibrarySpirit[] = Object.freeze([]);
  let mana = INITIAL_MANA;
  let shieldActive = false;
  let shieldTimer = 0;
  let gameTime = 0;
  let timeRemaining = ENCHANTED_LIBRARY_DURATION_MS;
  let spiritSpawnTimer = 0;
  let spiritCount = 0;
  let lastOutcome: EnchantedLibrarySnapshot["lastOutcome"];
  let terminalResultValue: GameResults | undefined;
  let destroyed = false;

  const snapshot = (): EnchantedLibrarySnapshot => {
    const target = targetItem(items, targetIndex);
    const correctBook = books.find((book) => book.isCorrect);
    return freezeSnapshot({
      phase,
      status: phase,
      mechanic: "book-collection-and-shield",
      targetIndex,
      targetCount,
      targetTerm: target.term,
      targetWord: target.term,
      prompt: target.translation,
      answer: target.term,
      correctAction: correctBook ? directionActionFor(player, correctBook) : "confirm",
      availableActions: ENCHANTED_LIBRARY_ACTIONS,
      player,
      books,
      spirits,
      vocabularyProgress: new Map(vocabularyProgress),
      mana,
      lives: mana,
      energy: mana,
      shieldActive,
      shieldTimer,
      gameTime,
      timeRemaining,
      spiritSpawnTimer,
      layoutIndex,
      spiritCount,
      correctAnswers: accountant.correctAnswers,
      totalAttempts: accountant.totalAttempts,
      score: accountant.score,
      ...(lastOutcome === undefined ? {} : { lastOutcome }),
      seed,
      ...(terminalResultValue === undefined ? {} : { result: terminalResultValue }),
      destroyed,
    });
  };

  const resultForCurrentState = (): GameResults => createGameResult(accountant, mana, gameTime);

  const enterDefeat = (): GameResults => {
    phase = "defeat";
    terminalResultValue = resultForCurrentState();
    completion.complete(terminalResultValue);
    return terminalResultValue;
  };

  const enterVictory = (): GameResults => {
    phase = "victory";
    terminalResultValue = resultForCurrentState();
    completion.complete(terminalResultValue);
    return terminalResultValue;
  };

  const inactiveResult = (event: EnchantedLibraryEvent = "none"): EnchantedLibraryActionResult => {
    const current = snapshot();
    return makeResult(current, {
      accepted: false,
      correct: false,
      progressed: false,
      terminal: false,
      completed: false,
      event,
    });
  };

  const terminalResult = (
    event: EnchantedLibraryEvent,
    correct: boolean,
    progressed: boolean,
    result: GameResults,
  ): EnchantedLibraryActionResult => makeResult(snapshot(), {
    accepted: true,
    correct,
    progressed,
    terminal: true,
    completed: true,
    event,
    result,
  });

  const resolveBookCollision = (): EnchantedLibraryActionResult | undefined => {
    const book = books.find((candidate) => distanceBetween(player, candidate) <= player.radius + candidate.radius);
    if (!book) return undefined;

    const correct = book.isCorrect;
    accountant.recordAttempt({ correct });
    lastOutcome = correct ? "correct" : "incorrect";
    layoutIndex += 1;
    if (correct) {
      mana += MANA_GAIN_CORRECT;
      accountant.addScore(100);
      const currentProgress = vocabularyProgress.get(targetItem(items, targetIndex).term) ?? 0;
      vocabularyProgress.set(targetItem(items, targetIndex).term, currentProgress + 1);
      targetIndex += 1;
      player = Object.freeze({
        ...player,
        shieldCharges: Math.min(player.maxShieldCharges, player.shieldCharges + 1),
      });
      if (targetIndex === targetCount) {
        const result = enterVictory();
        return terminalResult("book-correct", true, true, result);
      }
    } else {
      mana = Math.max(0, mana - MANA_LOSS_INCORRECT);
    }

    if (mana === 0) {
      const result = enterDefeat();
      return terminalResult(correct ? "book-correct" : "book-wrong", correct, correct, result);
    }

    books = createBooks(items, targetIndex, layoutIndex, seed);
    return makeResult(snapshot(), {
      accepted: true,
      correct,
      progressed: correct,
      terminal: false,
      completed: false,
      event: correct ? "book-correct" : "book-wrong",
    });
  };

  const movePlayer = (vector: EnchantedLibraryPoint, distance: number): void => {
    const length = Math.hypot(vector.x, vector.y) || 1;
    player = Object.freeze({
      ...player,
      x: clamp(player.x + vector.x / length * distance, player.radius, GAME_WIDTH - player.radius),
      y: clamp(player.y + vector.y / length * distance, player.radius, GAME_HEIGHT - player.radius),
    });
  };

  const spawnSpirit = (): void => {
    const wall = (seed + spiritCount) % 4;
    const target = player;
    const point: EnchantedLibraryPoint = wall === 0
      ? { x: SPIRIT_RADIUS, y: 80 }
      : wall === 1
        ? { x: GAME_WIDTH - SPIRIT_RADIUS, y: 180 }
        : wall === 2
          ? { x: 620, y: GAME_HEIGHT - SPIRIT_RADIUS }
          : { x: SPIRIT_RADIUS, y: 420 };
    const dx = target.x - point.x;
    const dy = target.y - point.y;
    const length = Math.hypot(dx, dy) || 1;
    spirits = Object.freeze([
      ...spirits,
      freezeSpirit({
        id: `spirit:${spiritCount}`,
        x: point.x,
        y: point.y,
        radius: SPIRIT_RADIUS,
        velocityX: dx / length * SPIRIT_SPEED,
        velocityY: dy / length * SPIRIT_SPEED,
        speed: SPIRIT_SPEED,
        bounced: false,
        hasHitPlayer: false,
      }),
    ]);
    spiritCount += 1;
    spiritSpawnTimer = SPIRIT_SPAWN_RATE_MS;
  };

  const updateSpirits = (deltaMs: number): EnchantedLibraryEvent => {
    if (spirits.length === 0) return "none";
    const scale = deltaMs / 1_000;
    spirits = Object.freeze(spirits
      .map((spirit) => freezeSpirit({
        ...spirit,
        x: spirit.x + spirit.velocityX * scale,
        y: spirit.y + spirit.velocityY * scale,
      }))
      .filter((spirit) => spirit.x >= -SPIRIT_RADIUS && spirit.x <= GAME_WIDTH + SPIRIT_RADIUS
        && spirit.y >= -SPIRIT_RADIUS && spirit.y <= GAME_HEIGHT + SPIRIT_RADIUS));

    let event: EnchantedLibraryEvent = "none";
    spirits = Object.freeze(spirits.map((spirit) => {
      if (distanceBetween(player, spirit) > player.radius + spirit.radius) return spirit;
      if (shieldActive) {
        const dx = player.x - spirit.x;
        const dy = player.y - spirit.y;
        const length = Math.hypot(dx, dy) || 1;
        const normalX = dx / length;
        const normalY = dy / length;
        const dot = spirit.velocityX * normalX + spirit.velocityY * normalY;
        event = "shield-blocked";
        lastOutcome = "shielded";
        return freezeSpirit({
          ...spirit,
          velocityX: spirit.velocityX - 2 * dot * normalX,
          velocityY: spirit.velocityY - 2 * dot * normalY,
          bounced: true,
        });
      }
      if (spirit.hasHitPlayer) return spirit;
      mana = Math.max(0, mana - MANA_LOSS_SPIRIT_HIT);
      event = "spirit-hit";
      lastOutcome = "spirit-hit";
      return freezeSpirit({ ...spirit, hasHitPlayer: true });
    }));
    return event;
  };

  const validateRestore = (state: EnchantedLibrarySnapshot): void => {
    if (state === null || typeof state !== "object") throw new Error("Enchanted Library state must be an object");
    if (!(state.phase === "playing" || state.phase === "victory" || state.phase === "defeat")) {
      throw new Error("Enchanted Library state phase is invalid");
    }
    if (state.phase !== state.status || state.mechanic !== "book-collection-and-shield") {
      throw new Error("Enchanted Library state common fields are invalid");
    }
    if (state.seed !== seed || state.targetCount !== targetCount || !Number.isInteger(state.targetIndex)
      || state.targetIndex < 0 || state.targetIndex > targetCount) {
      throw new Error("Enchanted Library state target progress is invalid");
    }
    const target = targetItem(items, state.targetIndex);
    if (state.targetTerm !== target.term || state.targetWord !== target.term
      || state.prompt !== target.translation || state.answer !== target.term) {
      throw new Error("Enchanted Library state target content is invalid");
    }
    if (!Array.isArray(state.availableActions)
      || state.availableActions.length !== ENCHANTED_LIBRARY_ACTIONS.length
      || state.availableActions.some((action, index) => action !== ENCHANTED_LIBRARY_ACTIONS[index])) {
      throw new Error("Enchanted Library state actions are invalid");
    }
    if (!ENCHANTED_LIBRARY_ACTIONS.includes(state.correctAction)) {
      throw new Error("Enchanted Library state correct action is invalid");
    }
    if (typeof state.player !== "object" || state.player === null
      || state.player.id !== "player" || state.player.radius !== PLAYER_RADIUS
      || state.player.speed !== PLAYER_SPEED || state.player.maxShieldCharges !== MAX_SHIELD_CHARGES
      || !Number.isFinite(state.player.x) || !Number.isFinite(state.player.y)
      || state.player.x < PLAYER_RADIUS || state.player.x > GAME_WIDTH - PLAYER_RADIUS
      || state.player.y < PLAYER_RADIUS || state.player.y > GAME_HEIGHT - PLAYER_RADIUS
      || !Number.isInteger(state.player.shieldCharges)
      || state.player.shieldCharges < 0 || state.player.shieldCharges > MAX_SHIELD_CHARGES) {
      throw new Error("Enchanted Library state player is invalid");
    }
    if (!Array.isArray(state.books) || state.books.length !== Math.min(4, items.length)) {
      throw new Error("Enchanted Library state books are invalid");
    }
    const bookIds = new Set<string>();
    const bookPositions = new Set<string>();
    let correctBookCount = 0;
    for (const book of state.books) {
      if (typeof book.id !== "string" || bookIds.has(book.id) || !Number.isFinite(book.x)
        || !Number.isFinite(book.y) || book.radius !== BOOK_RADIUS || typeof book.term !== "string"
        || typeof book.translation !== "string" || typeof book.isCorrect !== "boolean"
        || !items.some((item) => item.term === book.term && item.translation === book.translation)) {
        throw new Error("Enchanted Library state book is invalid");
      }
      const position = `${book.x}:${book.y}`;
      if (bookPositions.has(position)) throw new Error("Enchanted Library state book positions are invalid");
      bookIds.add(book.id);
      bookPositions.add(position);
      if (book.isCorrect) correctBookCount += 1;
    }
    if (correctBookCount !== 1) throw new Error("Enchanted Library state correct book is invalid");
    const currentCorrectBook = state.books.find((book) => book.isCorrect);
    if (state.phase === "playing" && (!currentCorrectBook
      || currentCorrectBook.term !== target.term || currentCorrectBook.translation !== target.translation
      || state.correctAction !== directionActionFor(state.player, currentCorrectBook))) {
      throw new Error("Enchanted Library state active book is invalid");
    }
    if (state.phase === "playing") {
      const expectedBooks = createBooks(items, state.targetIndex, state.layoutIndex, seed);
      if (state.books.some((book, index) => {
        const expected = expectedBooks[index];
        return expected === undefined
          || book.id !== expected.id
          || book.x !== expected.x
          || book.y !== expected.y
          || book.term !== expected.term
          || book.translation !== expected.translation
          || book.isCorrect !== expected.isCorrect;
      })) {
        throw new Error("Enchanted Library state book layout is invalid");
      }
    }
    if (!Array.isArray(state.spirits)) throw new Error("Enchanted Library state spirits are invalid");
    const spiritIds = new Set<string>();
    for (const spirit of state.spirits) {
      if (typeof spirit.id !== "string" || spiritIds.has(spirit.id) || !Number.isFinite(spirit.x)
        || !Number.isFinite(spirit.y) || spirit.x < -SPIRIT_RADIUS || spirit.x > GAME_WIDTH + SPIRIT_RADIUS
        || spirit.y < -SPIRIT_RADIUS || spirit.y > GAME_HEIGHT + SPIRIT_RADIUS || spirit.radius !== SPIRIT_RADIUS
        || !Number.isFinite(spirit.velocityX) || !Number.isFinite(spirit.velocityY)
        || spirit.speed < 0 || !Number.isFinite(spirit.speed)
        || typeof spirit.bounced !== "boolean" || typeof spirit.hasHitPlayer !== "boolean") {
        throw new Error("Enchanted Library state spirit is invalid");
      }
      spiritIds.add(spirit.id);
    }
    if (!Number.isInteger(state.mana) || state.mana < 0 || state.lives !== state.mana || state.energy !== state.mana) {
      throw new Error("Enchanted Library state mana is invalid");
    }
    if (!Number.isInteger(state.score) || state.score < 0 || state.score !== state.correctAnswers * 100) {
      throw new Error("Enchanted Library state score is invalid");
    }
    if (!Number.isFinite(state.shieldTimer) || state.shieldTimer < 0 || state.shieldTimer > SHIELD_DURATION_MS
      || typeof state.shieldActive !== "boolean" || state.shieldActive !== (state.shieldTimer > 0)) {
      throw new Error("Enchanted Library state shield is invalid");
    }
    if (!Number.isFinite(state.gameTime) || state.gameTime < 0
      || state.timeRemaining !== Math.max(0, ENCHANTED_LIBRARY_DURATION_MS - state.gameTime)
      || state.timeRemaining < 0 || state.timeRemaining > ENCHANTED_LIBRARY_DURATION_MS) {
      throw new Error("Enchanted Library state timer is invalid");
    }
    if (!Number.isFinite(state.spiritSpawnTimer) || state.spiritSpawnTimer < 0
      || state.spiritSpawnTimer > SPIRIT_SPAWN_RATE_MS) {
      throw new Error("Enchanted Library state spirit timer is invalid");
    }
    if (!Number.isInteger(state.layoutIndex) || state.layoutIndex < 0
      || !Number.isInteger(state.spiritCount) || state.spiritCount < 0) {
      throw new Error("Enchanted Library state layout index is invalid");
    }
    if (!(state.vocabularyProgress instanceof Map) || state.vocabularyProgress.size !== items.length) {
      throw new Error("Enchanted Library state vocabulary progress is invalid");
    }
    for (const item of items) {
      const progress = state.vocabularyProgress.get(item.term);
      const expectedProgress = items.indexOf(item) < state.targetIndex ? 1 : 0;
      if (typeof progress !== "number" || progress !== expectedProgress) {
        throw new Error("Enchanted Library state vocabulary progress is invalid");
      }
    }
    if (!Number.isInteger(state.correctAnswers) || state.correctAnswers !== state.targetIndex
      || state.correctAnswers < 0 || state.correctAnswers > state.totalAttempts
      || !Number.isInteger(state.totalAttempts) || state.totalAttempts < 0) {
      throw new Error("Enchanted Library state result counters are invalid");
    }
    if (state.lastOutcome !== undefined && !["correct", "incorrect", "spirit-hit", "shielded"].includes(state.lastOutcome)) {
      throw new Error("Enchanted Library state outcome is invalid");
    }
    if (typeof state.destroyed !== "boolean") throw new Error("Enchanted Library state destroyed flag is invalid");
    if (state.phase === "playing" && (state.targetIndex >= targetCount || state.mana === 0 || state.timeRemaining === 0)) {
      throw new Error("Enchanted Library playing state is terminal");
    }
    if (state.phase === "victory" && state.targetIndex !== targetCount) {
      throw new Error("Enchanted Library victory state is incomplete");
    }
    if (state.phase === "defeat" && state.mana > 0 && state.timeRemaining > 0) {
      throw new Error("Enchanted Library defeat state has no terminal cause");
    }
    if (state.phase === "playing" && state.result !== undefined) {
      throw new Error("Enchanted Library active state has a terminal result");
    }
    if (state.phase !== "playing") {
      if (state.result === undefined) throw new Error("Enchanted Library terminal result is missing");
      const restoredResult = gameResultsSchema.parse(state.result);
      const restoredAccountant = createResultAccountant();
      for (let index = 0; index < state.totalAttempts; index += 1) {
        restoredAccountant.recordAttempt({ correct: index < state.correctAnswers });
      }
      restoredAccountant.addScore(state.score);
      const expectedResult = createGameResult(restoredAccountant, state.mana, state.gameTime);
      if (restoredResult.score !== expectedResult.score
        || restoredResult.accuracy !== expectedResult.accuracy
        || restoredResult.correctAnswers !== expectedResult.correctAnswers
        || restoredResult.totalAttempts !== expectedResult.totalAttempts
        || restoredResult.xp !== expectedResult.xp) {
        throw new Error("Enchanted Library terminal result is inconsistent");
      }
    } else if (state.result !== undefined) {
      gameResultsSchema.parse(state.result);
    }
  };

  const restore = (state: EnchantedLibrarySnapshot): void => {
    if (destroyed) return;
    validateRestore(state);
    accountant = createResultAccountant();
    for (let index = 0; index < state.totalAttempts; index += 1) {
      accountant.recordAttempt({ correct: index < state.correctAnswers });
    }
    accountant.addScore(state.score);
    phase = state.phase;
    targetIndex = state.targetIndex;
    player = Object.freeze({ ...state.player });
    books = Object.freeze(state.books.map((book) => freezeBook({ ...book })));
    spirits = Object.freeze(state.spirits.map((spirit) => freezeSpirit({ ...spirit })));
    vocabularyProgress.clear();
    for (const item of items) vocabularyProgress.set(item.term, state.vocabularyProgress.get(item.term)!);
    mana = state.mana;
    shieldActive = state.shieldActive;
    shieldTimer = state.shieldTimer;
    gameTime = state.gameTime;
    timeRemaining = state.timeRemaining;
    spiritSpawnTimer = state.spiritSpawnTimer;
    layoutIndex = state.layoutIndex;
    spiritCount = state.spiritCount;
    lastOutcome = state.lastOutcome;
    terminalResultValue = state.result;
    destroyed = state.destroyed;
    if (destroyed || phase !== "playing") completion.sealWithoutDelivery();
  };

  const tick = (deltaMs: number, input: EnchantedLibraryInput = EMPTY_INPUT): EnchantedLibraryActionResult => {
    assertDelta(deltaMs);
    if (destroyed || phase !== "playing") return inactiveResult();

    gameTime += deltaMs;
    timeRemaining = Math.max(0, ENCHANTED_LIBRARY_DURATION_MS - gameTime);
    if (timeRemaining === 0) {
      const result = enterDefeat();
      return terminalResult("timer-expired", false, false, result);
    }

    let event: EnchantedLibraryEvent = "none";
    if (input.cast) {
      const shieldResult = ((): EnchantedLibraryActionResult => {
        if (shieldActive || player.shieldCharges <= 0) return inactiveResult("shield-unavailable");
        shieldActive = true;
        shieldTimer = SHIELD_DURATION_MS;
        player = Object.freeze({ ...player, shieldCharges: player.shieldCharges - 1 });
        return makeResult(snapshot(), {
          accepted: true,
          correct: false,
          progressed: false,
          terminal: false,
          completed: false,
          event: "shield-activated",
        });
      })();
      event = shieldResult.event;
    }

    if (shieldActive) {
      shieldTimer = Math.max(0, shieldTimer - deltaMs);
      if (shieldTimer === 0) shieldActive = false;
    }

    const vector = input.steer ?? {
      x: Number(Boolean(input.right)) - Number(Boolean(input.left)),
      y: Number(Boolean(input.down)) - Number(Boolean(input.up)),
    };
    if (vector.x !== 0 || vector.y !== 0) {
      const frameDistance = PLAYER_SPEED * deltaMs / 1_000;
      const movementDistance = input.steer
        ? Math.min(frameDistance, Math.hypot(vector.x, vector.y))
        : frameDistance;
      movePlayer(vector, movementDistance);
    }
    const bookResult = resolveBookCollision();
    if (bookResult) return bookResult;

    spiritSpawnTimer = Math.max(0, spiritSpawnTimer - deltaMs);
    const spiritEvent = updateSpirits(deltaMs);
    if (spiritEvent !== "none") event = spiritEvent;
    if (mana === 0) {
      const result = enterDefeat();
      return terminalResult(event === "none" ? "mana-depleted" : event, false, false, result);
    }
    if (spiritSpawnTimer === 0 && spirits.length === 0) spawnSpirit();
    return makeResult(snapshot(), {
      accepted: event !== "none" || vector.x !== 0 || vector.y !== 0 || deltaMs > 0,
      correct: false,
      progressed: false,
      terminal: false,
      completed: false,
      event,
    });
  };

  const move = (direction: EnchantedLibraryDirection): EnchantedLibraryActionResult => {
    if (destroyed || phase !== "playing") return inactiveResult();
    movePlayer(directionVector(direction), PLAYER_SPEED / 6);
    const bookResult = resolveBookCollision();
    return bookResult ?? makeResult(snapshot(), {
      accepted: true,
      correct: false,
      progressed: false,
      terminal: false,
      completed: false,
      event: "none",
    });
  };

  const activateShield = (): EnchantedLibraryActionResult => {
    if (destroyed || phase !== "playing") return inactiveResult();
    if (shieldActive || player.shieldCharges <= 0) return inactiveResult("shield-unavailable");
    shieldActive = true;
    shieldTimer = SHIELD_DURATION_MS;
    player = Object.freeze({ ...player, shieldCharges: player.shieldCharges - 1 });
    return makeResult(snapshot(), {
      accepted: true,
      correct: false,
      progressed: false,
      terminal: false,
      completed: false,
      event: "shield-activated",
    });
  };

  return Object.freeze({
    snapshot,
    move,
    tick,
    activateShield,
    choose(action: InputActionId): EnchantedLibraryActionResult {
      if (action === "confirm") return activateShield();
      if (action === "move-up" || action === "move-down" || action === "move-left" || action === "move-right") {
        return move(action);
      }
      return inactiveResult();
    },
    applyHazard(): EnchantedLibraryActionResult {
      if (destroyed || phase !== "playing") return inactiveResult();
      mana = Math.max(0, mana - MANA_LOSS_SPIRIT_HIT);
      lastOutcome = "spirit-hit";
      if (mana === 0) {
        const result = enterDefeat();
        return terminalResult("mana-depleted", false, false, result);
      }
      return makeResult(snapshot(), {
        accepted: true,
        correct: false,
        progressed: false,
        terminal: false,
        completed: false,
        event: "spirit-hit",
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

/** Minimal graphics surface used by the procedural library scene. */
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

/** Minimal text surface used by the procedural library scene. */
interface PhaserTextLike {
  setPosition(x: number, y: number): this;
  setText(value: string): this;
  setFontSize?(value: number): this;
  setOrigin?(x: number, y?: number): this;
  setWordWrapWidth?(width: number, useAdvancedWrap?: boolean): this;
  destroy(): void;
}

/** Minimal canvas surface needed for responsive pointer conversion. */
interface PhaserCanvasLike {
  getBoundingClientRect?(): {
    readonly left: number;
    readonly top?: number;
    readonly width: number;
    readonly height?: number;
  };
}

/** Minimal Phaser scene surface used by the library scene. */
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

/** Resources owned by one active library scene. */
interface EnchantedLibrarySceneResources {
  readonly art: ActorSpriteLayer;
  readonly graphics: PhaserGraphicsLike;
  readonly title: PhaserTextLike;
  readonly prompt: PhaserTextLike;
  readonly progress: PhaserTextLike;
  readonly feedback: PhaserTextLike;
  readonly instructions: PhaserTextLike;
  readonly target: PhaserTextLike;
  readonly shield: PhaserTextLike;
  readonly books: readonly PhaserTextLike[];
}

/** Context passed from the cartridge factory to the procedural scene. */
interface EnchantedLibrarySceneContext {
  readonly edition: RuntimeEdition;
  readonly controller: EnchantedLibraryController;
  readonly inputController: APKInputController;
  readonly composition: CartridgeGameConfigContext["composition"];
  readonly diagnostic: CartridgeGameConfigContext["diagnostic"];
  readonly sessionMode: NonNullable<CartridgeGameConfigContext["sessionMode"]>;
}

function sceneDimensions(scene: PhaserSceneLike): { width: number; height: number } {
  return {
    width: scene.scale?.width ?? ENCHANTED_LIBRARY_CANVAS.width,
    height: scene.scale?.height ?? ENCHANTED_LIBRARY_CANVAS.height,
  };
}

function pointerInScene(scene: PhaserSceneLike, clientX: number, clientY: number, width: number, height: number): EnchantedLibraryPoint {
  const rect = scene.game?.canvas?.getBoundingClientRect?.();
  if (!rect || rect.width <= 0 || !rect.height || rect.height <= 0) return { x: clientX, y: clientY };
  return {
    x: (clientX - rect.left) * width / rect.width,
    y: (clientY - (rect.top ?? 0)) * height / rect.height,
  };
}

function shieldButtonBounds(width: number, displayScale: number): { x: number; y: number; width: number; height: number } {
  const size = Math.ceil(48 / Math.max(0.1, displayScale));
  return { x: width - size - 18, y: 12, width: size, height: size };
}

function containsPoint(bounds: { x: number; y: number; width: number; height: number }, point: EnchantedLibraryPoint): boolean {
  return point.x >= bounds.x && point.x <= bounds.x + bounds.width
    && point.y >= bounds.y && point.y <= bounds.y + bounds.height;
}

function sceneFor(context: EnchantedLibrarySceneContext): Readonly<Record<string, unknown>> {
  let resources: EnchantedLibrarySceneResources | undefined;
  let previousKeys = new Set<string>();
  let cleaned = false;
  let pointerGestureTracked = false;
  let pointerSteeringGesture = false;
  let pointerStartedOnShield = false;
  const normalize = createInputActionNormalizer({
    keyboard: ENCHANTED_LIBRARY_KEYBOARD_BINDINGS,
    pointerTap: { action: "confirm" },
    pointerDrag: {
      leftAction: "move-left",
      rightAction: "move-right",
      upAction: "move-up",
      downAction: "move-down",
      threshold: 18,
    },
  });
  const frameScheduler = createBoundedFrameScheduler(() => undefined);

  const updateView = (scene: PhaserSceneLike): void => {
    if (!resources) return;
    const { width, height } = sceneDimensions(scene);
    const state = context.controller.snapshot();
    const scaleX = width / GAME_WIDTH;
    const scaleY = height / GAME_HEIGHT;
    const displayWidth = scene.game?.canvas?.getBoundingClientRect?.().width ?? width;
    const displayScale = Math.max(0.1, displayWidth / width);
    const displayFontSize = (pixels: number): number => Math.ceil(pixels / displayScale);
    const displayPosition = (pixels: number): number => Math.ceil(pixels / displayScale);
    const bookWidth = Math.min(172, width * 0.19);
    const bookHeight = Math.min(68, height * 0.14);
    resources.graphics.clear();
    resources.graphics.fillStyle(0x271b18, 1).fillRect(0, 0, width, height);
    resources.graphics.fillStyle(0x493126, 1).fillRoundedRect(width * 0.04, height * 0.17, width * 0.92, height * 0.72, 18);
    resources.graphics.lineStyle(4, 0x8c6846, 0.9).strokeRoundedRect(width * 0.04, height * 0.17, width * 0.92, height * 0.72, 18);
    resources.graphics.lineStyle(1, 0x76533b, 0.24);
    for (let plank = 1; plank < 7; plank += 1) {
      const plankY = height * (0.17 + plank * 0.09);
      resources.graphics.fillStyle(0x76533b, 0.12).fillRect(width * 0.045, plankY, width * 0.91, 1);
    }

    for (const [index, book] of state.books.entries()) {
      const x = book.x * scaleX;
      const y = book.y * scaleY;
      resources.graphics.fillStyle(0x5a3e82, 0.96)
        .fillRoundedRect(x - bookWidth / 2, y - bookHeight / 2, bookWidth, bookHeight, 12);
      resources.graphics.lineStyle(2, 0xd7c4ff, 0.9)
        .strokeRoundedRect(x - bookWidth / 2, y - bookHeight / 2, bookWidth, bookHeight, 12);
      resources.books[index]?.setFontSize?.(displayFontSize(16));
      resources.books[index]?.setWordWrapWidth?.(Math.max(1, bookWidth - 16), true);
      resources.books[index]?.setOrigin?.(0.5, 0.5);
      resources.books[index]?.setText(book.term).setPosition(x, y);
    }
    for (let index = state.books.length; index < resources.books.length; index += 1) {
      resources.books[index]?.setText("");
    }

    const art = resources.art;
    const artScale = Math.min(scaleX, scaleY);
    const playerX = state.player.x * scaleX;
    const playerY = state.player.y * scaleY;
    const playerRadius = Math.max(14, state.player.radius * artScale);
    if (!art.place("player", "player:idle", {
      x: playerX,
      y: playerY,
      width: playerRadius * 2.6,
      depth: 8,
    })) {
      resources.graphics.fillStyle(0xffd166, 1).fillCircle(playerX, playerY, playerRadius);
    }
    if (state.shieldActive) {
      resources.graphics.lineStyle(5, 0x42d4ff, 0.88)
        .strokeRoundedRect(playerX - 34, playerY - 34, 68, 68, 34);
    }

    for (const [index, shelf] of calculateEnchantedLibraryShelfPlacements(width, height).entries()) {
      art.place(`library:shelf:${index}`, shelf.binding, {
        x: shelf.x,
        y: shelf.y,
        width: shelf.width,
        height: shelf.height,
        depth: 2,
      });
    }
    state.spirits.forEach((spirit, index) => {
      const spiritRadius = Math.max(11, spirit.radius * artScale);
      if (art.place(`spirit:${index}`, "enemy:idle", {
        x: spirit.x * scaleX,
        y: spirit.y * scaleY,
        width: spiritRadius * 2.6,
        depth: 7,
      })) return;
      resources!.graphics.fillStyle(0xff6b9e, 0.9)
        .fillCircle(spirit.x * scaleX, spirit.y * scaleY, spiritRadius);
    });
    art.sweep();

    resources.title.setText("").setPosition(28, 18);
    resources.prompt.setFontSize?.(displayFontSize(26));
    const shieldBounds = shieldButtonBounds(width, displayScale);
    resources.prompt.setWordWrapWidth?.(Math.max(1, shieldBounds.x - 40), true);
    resources.prompt.setText(state.prompt).setPosition(28, displayPosition(20));
    resources.target.setText("").setPosition(28, 93);
    resources.progress.setFontSize?.(displayFontSize(15));
    resources.progress.setText(
      `${Math.min(state.targetIndex + 1, state.targetCount)}/${state.targetCount}  ♥ ${state.mana}  ◈ ${state.player.shieldCharges}/${state.player.maxShieldCharges}  ${Math.ceil(state.timeRemaining / 1000)}s`,
    ).setPosition(28, displayPosition(58));
    resources.graphics.fillStyle(0x172554, 0.92).fillRoundedRect(shieldBounds.x, shieldBounds.y, shieldBounds.width, shieldBounds.height, 12);
    resources.graphics.lineStyle(2, 0x69e2ff, 0.9).strokeRoundedRect(shieldBounds.x, shieldBounds.y, shieldBounds.width, shieldBounds.height, 12);
    resources.shield.setFontSize?.(displayFontSize(20));
    resources.shield.setText(`◈ ${state.player.shieldCharges}`).setPosition(shieldBounds.x + 10, shieldBounds.y + shieldBounds.height / 2 - 10);
    resources.feedback.setText("").setPosition(28, height - 64);
    resources.instructions.setText("").setPosition(28, height - 34);
  };

  const cleanup = (): void => {
    if (cleaned) return;
    cleaned = true;
    frameScheduler.cancel();
    context.inputController.cancelActiveGesture();
    context.controller.destroy();
    if (!resources) return;
    const active = resources;
    resources = undefined;
    active.graphics.destroy();
    active.title.destroy();
    active.prompt.destroy();
    active.progress.destroy();
    active.feedback.destroy();
    active.instructions.destroy();
    active.target.destroy();
    active.shield.destroy();
    for (const book of active.books) book.destroy();
    previousKeys = new Set<string>();
  };


  const artKeys = ["world:ground", "player:idle", "enemy:idle", "prop:0", "prop:1"] as const;

  const preload = function (this: PhaserSceneLike): void {
    if (!this.load) return;
    preloadAssetBindings(
      this.load,
      context.edition,
      artKeys.filter((key) => context.edition?.bindings?.[key]),
    );
  };

  const create = function (this: PhaserSceneLike): void {
    if (!this.add) throw new Error("Enchanted Library requires Phaser display services");
    const style = { fontFamily: "Arial", color: "#fff8ef", fontSize: "18px" };
    resources = {
      graphics: this.add.graphics(),
      art: createActorSpriteLayer(this, context.edition),
      title: this.add.text(28, 18, "", { ...style, fontSize: "29px", fontStyle: "bold" }),
      prompt: this.add.text(28, 58, "", { ...style, fontSize: "23px" }),
      target: this.add.text(28, 93, "", { ...style, fontSize: "18px", color: "#ffd166" }),
      progress: this.add.text(28, 125, "", { ...style, fontSize: "15px", color: "#d5c4ff" }),
      feedback: this.add.text(28, 0, "", { ...style, fontSize: "17px", color: "#ffd166" }),
      instructions: this.add.text(28, 0, "", { ...style, fontSize: "14px", color: "#c9bce8" }),
      shield: this.add.text(28, 0, "", { ...style, fontSize: "16px", color: "#69e2ff" }),
      books: [0, 1, 2, 3].map(() => this.add!.text(0, 0, "", { ...style, fontSize: "17px" })),
    };
    this.events?.once("shutdown", cleanup);
    this.events?.once("destroy", cleanup);
    updateView(this);
  };

  const update = function (this: PhaserSceneLike, _time = 0, delta = 0): void {
    if (!resources) return;
    frameScheduler.tick(delta);
    if (context.sessionMode === "playing") {
      const input = context.inputController.snapshot();
      const pressed = input.pressed ?? input.keys.filter((key) => !previousKeys.has(key));
      previousKeys = new Set(input.keys);
      const movement: {
        up: boolean;
        down: boolean;
        left: boolean;
        right: boolean;
        steer?: Readonly<EnchantedLibraryPoint>;
      } = { up: false, down: false, left: false, right: false };
      for (const code of [...new Set([...input.keys, ...pressed])]) {
        const action = normalize({ modality: "keyboard", code })[0]?.action;
        if (action === "move-up") movement.up = true;
        if (action === "move-down") movement.down = true;
        if (action === "move-left") movement.left = true;
        if (action === "move-right") movement.right = true;
      }

      let cast = pressed.some((code) => normalize({ modality: "keyboard", code })[0]?.action === "confirm");
      let pointerWasSteering = pointerSteeringGesture;
      const { width, height } = sceneDimensions(this);
      const renderedWidth = this.game?.canvas?.getBoundingClientRect?.().width ?? width;
      const shieldBounds = shieldButtonBounds(width, renderedWidth / width);
      const arenaBounds = { x: width * 0.04, y: height * 0.17, width: width * 0.92, height: height * 0.72 };
      if (input.pointer.cancelled) {
        pointerGestureTracked = false;
        pointerSteeringGesture = false;
        pointerStartedOnShield = false;
      } else if (input.pointer.down && !pointerGestureTracked) {
        const origin = pointerInScene(this, input.pointer.startX, input.pointer.startY, width, height);
        pointerGestureTracked = true;
        pointerStartedOnShield = containsPoint(shieldBounds, origin);
        pointerSteeringGesture = !pointerStartedOnShield
          && containsPoint(arenaBounds, origin);
        pointerWasSteering = pointerSteeringGesture;
      }
      const keyboardMoving = Boolean(movement.up || movement.down || movement.left || movement.right);
      if (!keyboardMoving && pointerSteeringGesture && input.pointer.down) {
        const point = pointerInScene(this, input.pointer.x, input.pointer.y, width, height);
        if (containsPoint(arenaBounds, point)) {
          const player = context.controller.snapshot().player;
          movement.steer = { x: point.x * GAME_WIDTH / width - player.x, y: point.y * GAME_HEIGHT / height - player.y };
        }
      }
      if (input.pointer.released && !input.pointer.cancelled) {
        const origin = pointerInScene(this, input.pointer.startX, input.pointer.startY, width, height);
        const point = pointerInScene(this, input.pointer.x, input.pointer.y, width, height);
        if (!pointerWasSteering
          && (pointerStartedOnShield || containsPoint(shieldBounds, origin))
          && containsPoint(shieldBounds, point)) cast = true;
      }
      if (!input.pointer.down) {
        pointerGestureTracked = false;
        pointerSteeringGesture = false;
        pointerStartedOnShield = false;
      }
      const result = context.controller.tick(delta, { ...movement, cast });
      if (result.event !== "none" || result.terminal) {
        context.diagnostic({
          level: "info",
          code: result.terminal ? "ENCHANTED_LIBRARY_TERMINAL" : "ENCHANTED_LIBRARY_EVENT",
          message: "Enchanted Library processed a collection or hazard event.",
          details: { event: result.event, phase: result.snapshot.phase, mana: result.snapshot.mana },
        });
      }
    }
    updateView(this);
  };

  return {
    key: ENCHANTED_LIBRARY_ID,
    preload,
    create,
    update,
    extend: {
      apkCaptureResponsiveState: () => Object.freeze({
        game: context.controller.capture(),
        player: Object.freeze({ ...context.controller.snapshot().player }),
      }),
      apkRestoreResponsiveState: (state: unknown) => {
        if (typeof state !== "object" || state === null) throw new Error("Enchanted Library responsive state is invalid");
        const candidate = state as { readonly game?: unknown };
        const game = candidate.game ?? state;
        if (typeof game !== "object" || game === null) throw new Error("Enchanted Library responsive game state is invalid");
        context.controller.restore(game as EnchantedLibrarySnapshot);
      },
      apkRecompose: (nextComposition: EnchantedLibrarySceneContext["composition"]) => {
        void nextComposition;
      },
    },
  };
}

/**
 * Creates the runtime-compatible Enchanted Library cartridge.
 * @returns A vocabulary cartridge with a bespoke collection scene.
 */
export function createEnchantedLibraryCartridge(): StandardExperienceCartridge {
  let activeController: EnchantedLibraryController | undefined;
  let tutorialRoute: readonly EnchantedLibraryDirection[] = [];
  let tutorialRouteApplied = 0;
  const standardExperience = createCartridgeStandardExperience({
    id: ENCHANTED_LIBRARY_ID,
    title: "Enchanted Library",
    description: "Collect English books, restore mana, and protect the stacks from spirits.",
    inputMode: "vocabulary",
    objective: "Collect the matching English word once for every Thai prompt before the library timer ends.",
    mechanicInstruction: "Hold the library and drag to steer toward the matching English word. Use the shield button, Space, or Enter to block spirits.",
    keyboardKeys: ["W", "A", "S", "D", "Arrow keys", "Space"],
    executeTutorialAction: (actionId) => {
      const controller = activeController;
      if (!controller) return;
      // Plan only. The runtime replays the route across the demonstration window
      // so the learner sees the player walk instead of jump.
      tutorialRoute = planRouteToSelectedBook(controller, actionId === "action:select-correct");
      tutorialRouteApplied = 0;
    },
    advanceTutorialAction: (_actionId, progress) => {
      const controller = activeController;
      if (!controller) return;
      const due = Math.min(tutorialRoute.length, Math.ceil(progress * tutorialRoute.length));
      while (tutorialRouteApplied < due) {
        const direction = tutorialRoute[tutorialRouteApplied];
        tutorialRouteApplied += 1;
        if (direction === undefined) return;
        controller.move(direction);
      }
    },
  });

  return {
    manifest: {
      id: ENCHANTED_LIBRARY_ID,
      title: "Enchanted Library",
      description: "Collect English books, restore mana, and protect the stacks from spirits.",
      runtimeApiVersion: "1.0.0",
      inputMode: "vocabulary",
      requiredAssetBindings: ["enchanted-library/arcane-shelves"],
      capabilities: [
        "capability:bounded-frame-delta",
        "capability:book-collision-collection",
        "capability:four-way-library-movement",
        "capability:input-action-normalization",
        "capability:language-target-progression",
        "capability:library-shield",
        "capability:nonempty-content-precondition",
        "capability:result-accounting",
        "capability:single-completion-emission",
        "capability:spirit-mana-hazard",
        "capability:time-and-frame-loop",
      ],
    },
    standardExperience,
    createGameConfig(context: CartridgeGameConfigContext): Readonly<Record<string, unknown>> {
      const input = vocabularyInputSchema.parse(context.input);
      const controller = createEnchantedLibraryController(
        input,
        context.sessionMode === "playing"
          ? (result) => context.complete(result, controller.snapshot().phase === "victory" ? "victory" : "defeat")
          : () => undefined,
        { seed: context.seed },
      );
      activeController = controller;
      context.diagnostic({
        level: "debug",
        code: "ENCHANTED_LIBRARY_READY",
        message: "Enchanted Library collection rules are ready.",
        details: { cartridgeId: ENCHANTED_LIBRARY_ID, editionId: context.edition.id, targetCount: input.length },
      });
      return {
        width: ENCHANTED_LIBRARY_CANVAS.width,
        height: ENCHANTED_LIBRARY_CANVAS.height,
        render: { antialias: true, pixelArt: false },
        scene: sceneFor({
          controller,
          edition: context.edition,
          inputController: context.inputController,
          composition: context.composition,
          diagnostic: context.diagnostic,
          sessionMode: context.sessionMode ?? "playing",
        }),
      };
    },
  };
}
