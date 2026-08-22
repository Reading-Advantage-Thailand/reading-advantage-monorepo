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
  createResultAccountant,
  finalizeResult,
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

/** Stable public identifier for the Dungeon Liberator cartridge. */
export const DUNGEON_LIBERATOR_ID = "dungeon-liberator" as const;

/** Fixed world dimensions used before responsive host scaling. */
export const DUNGEON_LIBERATOR_CANVAS = Object.freeze({ width: 960, height: 540 });

/** Duration of player protection after a monster consequence. */
export const INVULNERABILITY_DURATION = 1_000;

/** Keyboard bindings for four-way Dungeon Liberator movement. */
export const DUNGEON_LIBERATOR_KEYBOARD_BINDINGS: Readonly<Record<string, DungeonDirection>> = Object.freeze({
  ArrowLeft: "move-left",
  KeyA: "move-left",
  ArrowRight: "move-right",
  KeyD: "move-right",
  ArrowUp: "move-up",
  KeyW: "move-up",
  ArrowDown: "move-down",
  KeyS: "move-down",
});

/** Semantic movement actions owned by the dungeon scene. */
export type DungeonDirection = Extract<InputActionId, "move-left" | "move-right" | "move-up" | "move-down">;

/** A two-dimensional point in dungeon world coordinates. */
export interface DungeonPoint {
  /** Horizontal world coordinate. */
  readonly x: number;
  /** Vertical world coordinate. */
  readonly y: number;
}

/** One positioned sentence word that the player can rescue. */
export interface DungeonPrisoner extends DungeonPoint {
  /** Stable identity for this sentence word. */
  readonly id: string;
  /** Source-language word displayed by the scene. */
  readonly word: string;
  /** Translation prompt attached to the active sentence. */
  readonly translation: string;
  /** Sentence index containing this prisoner. */
  readonly sentenceIndex: number;
  /** Zero-based word order within its sentence. */
  readonly orderIndex: number;
  /** Collision radius. */
  readonly radius: number;
  /** Whether this prisoner is in the current rescue chain. */
  readonly collected: boolean;
  /** Whether an incorrect collision has sent this prisoner fleeing. */
  readonly fleeing: boolean;
  /** Remaining flee duration in milliseconds. */
  readonly fleeTimer: number;
}

/** One prisoner represented in the trailing rescue chain. */
export interface DungeonTrailSegment extends DungeonPoint {
  /** Stable trail identity. */
  readonly id: string;
  /** Rescued source-language word. */
  readonly word: string;
  /** Translation of the active sentence. */
  readonly translation: string;
  /** Word order in the active sentence. */
  readonly orderIndex: number;
}

/** One deterministic moving monster hazard. */
export interface DungeonMonster extends DungeonPoint {
  /** Stable hazard identity. */
  readonly id: string;
  /** Collision radius. */
  readonly radius: number;
  /** World units moved per second. */
  readonly speed: number;
  /** Horizontal movement direction. */
  readonly velocityX: number;
  /** Vertical movement direction. */
  readonly velocityY: number;
}

/** Player state used by the dungeon collision rules. */
export interface DungeonPlayer extends DungeonPoint {
  /** Stable player identity. */
  readonly id: "player";
  /** Collision radius. */
  readonly radius: number;
  /** World units moved per second. */
  readonly speed: number;
  /** Current remaining lives. */
  readonly lives: number;
  /** Initial life capacity. */
  readonly maxLives: number;
  /** Remaining player protection after a monster consequence, in milliseconds. */
  readonly invulnerabilityTime: number;
}

/** Exit portal position and collision radius. */
export interface DungeonPortal extends DungeonPoint {
  /** Stable portal identity. */
  readonly id: "portal";
  /** Collision radius. */
  readonly radius: number;
}

/** Active or terminal Dungeon Liberator phase. */
export type DungeonLiberatorPhase = "playing" | "victory" | "defeat";

/** Immutable state exposed by the Dungeon Liberator controller. */
export interface DungeonLiberatorSnapshot {
  /** Deterministic seed used for all session placements. */
  readonly seed: number;
  /** Current gameplay phase. */
  readonly phase: DungeonLiberatorPhase;
  /** Active sentence index, or sentence count after victory. */
  readonly sentenceIndex: number;
  /** Number of input sentences. */
  readonly sentenceCount: number;
  /** Next word index within the active sentence. */
  readonly wordIndex: number;
  /** Flattened next-word index across all sentences. */
  readonly targetIndex: number;
  /** Flattened number of words across all sentences. */
  readonly targetCount: number;
  /** Current sentence translation prompt. */
  readonly prompt: string;
  /** Current sentence source text. */
  readonly sentence: string;
  /** Current sentence source words. */
  readonly words: readonly string[];
  /** Next source-language word required by the rescue chain. */
  readonly answer: string;
  /** Movement action that points toward the next prisoner. */
  readonly correctAction: DungeonDirection;
  /** Movement actions accepted by the controller. */
  readonly availableActions: readonly DungeonDirection[];
  /** Current player position and resources. */
  readonly player: DungeonPlayer;
  /** Positioned prisoners for the active sentence. */
  readonly prisoners: readonly DungeonPrisoner[];
  /** Current ordered rescue chain. */
  readonly trail: readonly DungeonTrailSegment[];
  /** Active monsters. */
  readonly monsters: readonly DungeonMonster[];
  /** Exit portal. */
  readonly portal: DungeonPortal;
  /** Current remaining lives. */
  readonly lives: number;
  /** Shared resource alias for the current life capacity. */
  readonly energy: number;
  /** Number of correct prisoner collisions. */
  readonly correctAnswers: number;
  /** Number of prisoner collision attempts. */
  readonly totalAttempts: number;
  /** Current score. */
  readonly score: number;
  /** Most recent gameplay outcome. */
  readonly lastOutcome?: "correct" | "incorrect" | "hazard" | "portal";
  /** First terminal result, when the session has ended. */
  readonly result?: GameResults;
  /** Elapsed active gameplay time. */
  readonly gameTime: number;
  /** Whether scene cleanup has sealed the controller. */
  readonly destroyed: boolean;
}

/** Options that control deterministic Dungeon Liberator setup. */
export interface DungeonLiberatorControllerOptions {
  /** Deterministic placement seed. */
  readonly seed?: number;
  /** Optional deterministic source used to derive a placement seed. */
  readonly rng?: () => number;
  /** Starting and maximum lives. */
  readonly lives?: number;
  /** Number of deterministic monsters in the dungeon. */
  readonly monsterCount?: number;
  /** Enables the deterministic decoy used by safe tutorial demonstrations. */
  readonly tutorialOnly?: boolean;
}

/** Result returned after movement or a collision event. */
export interface DungeonLiberatorActionResult {
  /** Whether the action changed an active session. */
  readonly accepted: boolean;
  /** Whether the action rescued the required next word. */
  readonly correct: boolean;
  /** Whether the action advanced word or sentence progress. */
  readonly progressed: boolean;
  /** Whether the action completed the active sentence at the portal. */
  readonly sentenceCompleted: boolean;
  /** Whether the action reached victory or defeat. */
  readonly terminal: boolean;
  /** Compatibility alias for a terminal action. */
  readonly completed: boolean;
  /** First terminal result, when one exists. */
  readonly result?: GameResults;
  /** State after the action. */
  readonly snapshot: DungeonLiberatorSnapshot;
}

/** Transport-independent rules and lifecycle controls for the dungeon. */
export interface DungeonLiberatorController {
  /** Returns a frozen snapshot of the complete dungeon state. */
  snapshot(): DungeonLiberatorSnapshot;
  /** Applies one semantic movement action through the shared choice contract. */
  choose(action: InputActionId): DungeonLiberatorActionResult;
  /** Moves the player in one of four directions and resolves collisions. */
  move(direction: DungeonDirection, distance?: number): DungeonLiberatorActionResult;
  /** Moves the player to a world point for pointer or deterministic collision handling. */
  moveTo(point: DungeonPoint): DungeonLiberatorActionResult;
  /** Resolves a direct prisoner collision by stable prisoner identity. */
  collidePrisoner(prisonerId: string): DungeonLiberatorActionResult;
  /** Resolves a monster collision against the player. */
  collideMonster(monsterId?: string): DungeonLiberatorActionResult;
  /** Advances monster and flee simulation by a bounded frame delta. */
  tick(deltaMs: number): DungeonLiberatorSnapshot;
  /** Resolves the exit collision when the player is at the portal. */
  reachPortal(): DungeonLiberatorActionResult;
  /** Applies one hazard event through the active monster rules. */
  applyHazard(): DungeonLiberatorActionResult;
  /** Captures game state before responsive recomposition. */
  capture(): DungeonLiberatorSnapshot;
  /** Restores validated state captured before responsive recomposition. */
  restore(snapshot: DungeonLiberatorSnapshot): void;
  /** Demonstrates an accepted or incorrect learning action without host delivery. */
  demonstrate(correct: boolean): DungeonLiberatorActionResult;
  /** Seals the session and prevents later mutation or delivery. */
  destroy(): void;
}

/** One visible touch or pointer button in the dungeon D-pad. */
export interface DungeonDpadButton extends DungeonPoint {
  /** Direction emitted by this button. */
  readonly action: DungeonDirection;
  /** Button width. */
  readonly width: number;
  /** Button height. */
  readonly height: number;
}

/** Returns deterministic D-pad rectangles for the current canvas size. */
export function getDungeonLiberatorDpadButtons(
  width: number,
  height: number,
): readonly DungeonDpadButton[] {
  const size = Math.max(44, Math.min(62, width * 0.13));
  const gap = Math.max(6, size * 0.12);
  const centerX = Math.min(width - size * 1.5, Math.max(size * 1.5, width * 0.78));
  const centerY = Math.max(size + gap, height - size * 2 - gap);
  const button = (action: DungeonDirection, x: number, y: number): DungeonDpadButton => Object.freeze({
    action,
    x: clamp(x, 0, Math.max(0, width - size)),
    y: clamp(y, 0, Math.max(0, height - size)),
    width: size,
    height: size,
  });
  return Object.freeze([
    button("move-left", centerX - size - gap, centerY),
    button("move-right", centerX + gap, centerY),
    button("move-up", centerX, centerY - size - gap),
    button("move-down", centerX, centerY + size + gap),
  ]);
}

/** Maps a pointer coordinate to a D-pad direction when it hits a button. */
export function dungeonDirectionFromPointer(
  pointerX: number,
  pointerY: number,
  width: number,
  height: number,
): DungeonDirection | undefined {
  return getDungeonLiberatorDpadButtons(width, height).find((button) =>
    pointerX >= button.x
    && pointerX <= button.x + button.width
    && pointerY >= button.y
    && pointerY <= button.y + button.height,
  )?.action;
}

const PLAYER_RADIUS = 18;
const PRISONER_RADIUS = 17;
const MONSTER_RADIUS = 21;
const PORTAL_RADIUS = 32;
const MOVE_STEP = 24;
const PLAYER_SPEED = 220;
const FLEE_DURATION_MS = 750;
const DEFAULT_MONSTER_COUNT = 2;
const WORLD_MARGIN = 48;
const FLEE_OFFSET = 52;
const TRAIL_SPACING = 72;
const TRAIL_SEGMENT_RADIUS = 12;
const MAX_TICK_DELTA_MS = 50;
const TUTORIAL_DECOY_PREFIX = "tutorial-decoy:";
const DUNGEON_MOVEMENT_ACTIONS = Object.freeze([
  "move-left",
  "move-right",
  "move-up",
  "move-down",
] as const);

const SENTENCE_CAPABILITIES = Object.freeze([
  "capability:bounded-frame-delta",
  "capability:input-action-normalization",
  "capability:language-target-progression",
  "capability:nonempty-content-precondition",
  "capability:result-accounting",
  "capability:single-completion-emission",
  "capability:four-way-player-movement",
  "capability:positioned-prisoner-collision",
  "capability:ordered-rescue-trail",
  "capability:monster-collision-effects",
  "capability:portal-gated-sentence-transition",
] as const);

interface SentenceRecord {
  readonly term: string;
  readonly translation: string;
  readonly words: readonly string[];
}

function tutorialDecoyWord(sentences: readonly SentenceRecord[], sentenceIndex: number): string {
  const current = sentences[sentenceIndex]?.words[0];
  if (!current) return "";
  const nextSentence = sentences[(sentenceIndex + 1) % sentences.length];
  if (sentences.length > 1 && nextSentence?.words[0]) return nextSentence.words[0]!;
  return current;
}

interface MutablePlayer {
  id: "player";
  x: number;
  y: number;
  radius: number;
  speed: number;
  lives: number;
  maxLives: number;
  invulnerabilityTime: number;
}

interface MutablePrisoner {
  id: string;
  x: number;
  y: number;
  word: string;
  translation: string;
  sentenceIndex: number;
  orderIndex: number;
  radius: number;
  collected: boolean;
  fleeing: boolean;
  fleeTimer: number;
}

interface MutableTrailSegment {
  id: string;
  x: number;
  y: number;
  word: string;
  translation: string;
  orderIndex: number;
}

interface MutableMonster {
  id: string;
  x: number;
  y: number;
  radius: number;
  speed: number;
  velocityX: number;
  velocityY: number;
}

interface MutablePortal {
  id: "portal";
  x: number;
  y: number;
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
  readonly dpad: Readonly<Record<DungeonDirection, PhaserTextLike>>;
}

interface SceneContext {
  readonly edition: RuntimeEdition;
  readonly controller: DungeonLiberatorController;
  readonly inputController: APKInputController;
  readonly composition: CartridgeGameConfigContext["composition"];
  readonly diagnostic: CartridgeGameConfigContext["diagnostic"];
  readonly sessionMode: NonNullable<CartridgeGameConfigContext["sessionMode"]>;
}

type DungeonGameConfigContext = Omit<CartridgeGameConfigContext, "input"> & {
  readonly input: unknown;
};

function finiteSeed(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.abs(Math.floor(value)) % 2_147_483_647;
}

function hashUnit(seed: number, sentenceIndex: number, wordIndex: number, salt: number): number {
  let value = (finiteSeed(seed) + sentenceIndex * 48_271 + wordIndex * 12_289 + salt * 7_919) % 2_147_483_647;
  value = (value * 48_271) % 2_147_483_647;
  return value / 2_147_483_647;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function distance(left: DungeonPoint, right: DungeonPoint): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function freezePoint<T extends DungeonPoint>(point: T): T {
  return Object.freeze({ ...point });
}

function activeWords(items: readonly { readonly term: string; readonly translation: string }[]): readonly SentenceRecord[] {
  return Object.freeze(items.map((item) => Object.freeze({
    term: item.term.trim(),
    translation: item.translation,
    words: Object.freeze(item.term.trim().split(/\s+/u)),
  })));
}

function totalWords(sentences: readonly SentenceRecord[]): number {
  return sentences.reduce((total, sentence) => total + sentence.words.length, 0);
}

function completedWords(sentences: readonly SentenceRecord[], sentenceIndex: number): number {
  return sentences.slice(0, sentenceIndex).reduce((total, sentence) => total + sentence.words.length, 0);
}

function initialPrisonerPoint(seed: number, sentenceIndex: number, wordIndex: number, count: number): DungeonPoint {
  const columns = Math.max(2, Math.ceil(Math.sqrt(count)));
  const rows = Math.ceil(count / columns);
  const cellWidth = 650 / columns;
  const cellHeight = 285 / Math.max(1, rows);
  const column = wordIndex % columns;
  const row = Math.floor(wordIndex / columns);
  const jitterX = (hashUnit(seed, sentenceIndex, wordIndex, 1) - 0.5) * Math.min(42, cellWidth * 0.28);
  const jitterY = (hashUnit(seed, sentenceIndex, wordIndex, 2) - 0.5) * Math.min(34, cellHeight * 0.24);
  return freezePoint({
    x: clamp(155 + cellWidth * (column + 0.5) + jitterX, 100, DUNGEON_LIBERATOR_CANVAS.width - 150),
    y: clamp(125 + cellHeight * (row + 0.5) + jitterY, 100, DUNGEON_LIBERATOR_CANVAS.height - 125),
  });
}

function initialMonsters(seed: number, count: number): readonly MutableMonster[] {
  return Object.freeze(Array.from({ length: count }, (_, index) => {
    const horizontal = index % 2 === 0;
    return {
      id: `monster:${index}`,
      x: horizontal ? 470 + hashUnit(seed, 7, index, 3) * 110 : 630 + hashUnit(seed, 8, index, 3) * 100,
      y: horizontal ? 115 + hashUnit(seed, 9, index, 4) * 52 : 365 + hashUnit(seed, 10, index, 4) * 52,
      radius: MONSTER_RADIUS,
      speed: 72 + hashUnit(seed, 11, index, 5) * 25,
      velocityX: horizontal ? (index % 4 === 0 ? 1 : -1) : (index % 3 === 0 ? -1 : 1),
      velocityY: horizontal ? (index % 3 === 0 ? 1 : -1) : (index % 2 === 0 ? 1 : -1),
    };
  }));
}

function copyPrisoner(prisoner: DungeonPrisoner): MutablePrisoner {
  return { ...prisoner };
}

function copyMonster(monster: DungeonMonster): MutableMonster {
  return { ...monster };
}

function isDirection(value: string): value is DungeonDirection {
  return value === "move-left" || value === "move-right" || value === "move-up" || value === "move-down";
}

function directionToPoint(player: DungeonPoint, target: DungeonPoint): DungeonDirection {
  const horizontal = target.x - player.x;
  const vertical = target.y - player.y;
  if (Math.abs(horizontal) >= Math.abs(vertical) && horizontal !== 0) {
    return horizontal > 0 ? "move-right" : "move-left";
  }
  return vertical >= 0 ? "move-down" : "move-up";
}

function actionResult(
  snapshot: DungeonLiberatorSnapshot,
  values: Omit<DungeonLiberatorActionResult, "snapshot">,
): DungeonLiberatorActionResult {
  return Object.freeze({ ...values, snapshot });
}

/**
 * Creates transport-independent Dungeon Liberator rules for sentence content.
 * @param input Strict sentence content supplied by the host or a test.
 * @param deliver Callback that receives the first victory or defeat result.
 * @param options Deterministic placement and bounded-resource options.
 * @returns A controller for four-way rescue gameplay.
 * @throws When sentence content or controller options are invalid.
 */
export function createDungeonLiberatorController(
  input: unknown,
  deliver: (result: GameResults, outcome: GameTerminalOutcome) => void | Promise<void>,
  options: DungeonLiberatorControllerOptions = {},
): DungeonLiberatorController {
  const parsedInput = sentenceInputSchema.parse(input);
  const content = validateNonEmptyContent(parsedInput, "sentence");
  const sentences = activeWords(content.items);
  const targetCount = totalWords(sentences);
  const seedFromRng = options.rng?.();
  const seed = finiteSeed(options.seed ?? (seedFromRng === undefined ? 0 : seedFromRng * 1_000_000));
  const maxLives = options.lives ?? 3;
  const monsterCount = options.monsterCount ?? DEFAULT_MONSTER_COUNT;
  const tutorialOnly = options.tutorialOnly === true;
  if (!Number.isInteger(maxLives) || maxLives <= 0) throw new Error("Dungeon Liberator lives must be a positive integer");
  if (!Number.isInteger(monsterCount) || monsterCount < 0) throw new Error("Dungeon Liberator monster count must be a nonnegative integer");

  let phase: DungeonLiberatorPhase = "playing";
  let sentenceIndex = 0;
  let wordIndex = 0;
  let player: MutablePlayer = {
    id: "player",
    x: 88,
    y: DUNGEON_LIBERATOR_CANVAS.height / 2,
    radius: PLAYER_RADIUS,
    speed: PLAYER_SPEED,
    lives: maxLives,
    maxLives,
    invulnerabilityTime: 0,
  };
  let prisoners: MutablePrisoner[] = [];
  let tutorialDecoy: MutablePrisoner | undefined;
  let trail: MutableTrailSegment[] = [];
  let monsters: MutableMonster[] = initialMonsters(seed, monsterCount).map(copyMonster);
  const portal: MutablePortal = {
    id: "portal",
    x: DUNGEON_LIBERATOR_CANVAS.width - 78,
    y: DUNGEON_LIBERATOR_CANVAS.height / 2,
    radius: PORTAL_RADIUS,
  };
  let lastOutcome: DungeonLiberatorSnapshot["lastOutcome"];
  let terminalResultValue: GameResults | undefined;
  let gameTime = 0;
  let destroyed = false;
  let accountant = createResultAccountant();
  let terminalOutcome: GameTerminalOutcome = "complete";
  const completion = createCompletionLatch<GameResults>((result) => deliver(result, terminalOutcome));

  const buildPrisoners = (nextSentenceIndex: number): MutablePrisoner[] => {
    const sentence = sentences[nextSentenceIndex];
    if (!sentence) return [];
    return sentence.words.map((word, index) => {
      const point = initialPrisonerPoint(seed, nextSentenceIndex, index, sentence.words.length);
      return {
        id: `prisoner:${nextSentenceIndex}:${index}`,
        x: point.x,
        y: point.y,
        word,
        translation: sentence.translation,
        sentenceIndex: nextSentenceIndex,
        orderIndex: index,
        radius: PRISONER_RADIUS,
        collected: false,
        fleeing: false,
        fleeTimer: 0,
      };
    });
  };

  prisoners = buildPrisoners(sentenceIndex);

  const snapshot = (): DungeonLiberatorSnapshot => {
    const displayIndex = Math.min(sentenceIndex, sentences.length - 1);
    const sentence = sentences[displayIndex]!;
    const target = phase === "victory"
      ? undefined
      : prisoners.find((prisoner) => prisoner.orderIndex === wordIndex && !prisoner.collected && !prisoner.fleeing);
    const answer = target?.word ?? (phase === "victory" ? "" : sentence.words[Math.min(wordIndex, sentence.words.length - 1)]!);
    return Object.freeze({
      seed,
      phase,
      sentenceIndex,
      sentenceCount: sentences.length,
      wordIndex,
      targetIndex: completedWords(sentences, sentenceIndex) + wordIndex,
      targetCount,
      prompt: sentence.translation,
      sentence: sentence.term,
      words: sentence.words,
      answer,
      correctAction: target ? directionToPoint(player, target) : "move-right",
      availableActions: DUNGEON_MOVEMENT_ACTIONS,
      player: freezePoint({ ...player }),
      prisoners: Object.freeze(prisoners.map((prisoner) => Object.freeze({ ...prisoner }))),
      trail: Object.freeze(trail.map((segment) => Object.freeze({ ...segment }))),
      monsters: Object.freeze(monsters.map((monster) => Object.freeze({ ...monster }))),
      portal: freezePoint({ ...portal }),
      lives: player.lives,
      energy: player.lives,
      correctAnswers: accountant.correctAnswers,
      totalAttempts: accountant.totalAttempts,
      score: accountant.score,
      ...(lastOutcome === undefined ? {} : { lastOutcome }),
      result: terminalResultValue,
      gameTime,
      destroyed,
    });
  };

  const resultForCounters = (): GameResults => gameResultsSchema.parse(
    finalizeResult(accountant, { xpPerCorrect: 20, xpPerAccuracyPoint: 10 }),
  );

  const terminalResult = (nextPhase: "victory" | "defeat"): GameResults => {
    phase = nextPhase;
    terminalOutcome = nextPhase;
    const result = resultForCounters();
    terminalResultValue = result;
    completion.complete(result);
    return result;
  };

  const emptyAction = (): DungeonLiberatorActionResult => actionResult(snapshot(), {
    accepted: false,
    correct: false,
    progressed: false,
    sentenceCompleted: false,
    terminal: false,
    completed: false,
  });

  const updateTrail = (): void => {
    let target: DungeonPoint = player;
    trail = trail.map((segment) => {
      const deltaX = target.x - segment.x;
      const deltaY = target.y - segment.y;
      const segmentDistance = Math.hypot(deltaX, deltaY);
      const next = segmentDistance > TRAIL_SPACING
        ? {
          ...segment,
          x: segment.x + deltaX * ((segmentDistance - TRAIL_SPACING) / segmentDistance),
          y: segment.y + deltaY * ((segmentDistance - TRAIL_SPACING) / segmentDistance),
        }
        : segment;
      target = next;
      return next;
    });
  };

  const resetChain = (fleeingId?: string): void => {
    trail = [];
    wordIndex = 0;
    const activeTutorialDecoy = tutorialDecoy;
    let fleeingTutorialDecoy: MutablePrisoner | undefined;
    if (tutorialOnly && activeTutorialDecoy !== undefined && activeTutorialDecoy.id === fleeingId) {
      fleeingTutorialDecoy = {
        ...activeTutorialDecoy,
        x: clamp(activeTutorialDecoy.x + FLEE_OFFSET, 100, DUNGEON_LIBERATOR_CANVAS.width - 150),
        fleeing: true,
        fleeTimer: FLEE_DURATION_MS,
      };
    }
    tutorialDecoy = fleeingTutorialDecoy;
    prisoners = [
      ...buildPrisoners(sentenceIndex).map((prisoner) => {
        if (prisoner.id !== fleeingId) return prisoner;
        return {
          ...prisoner,
          x: clamp(prisoner.x + FLEE_OFFSET, 100, DUNGEON_LIBERATOR_CANVAS.width - 150),
          fleeing: true,
          fleeTimer: FLEE_DURATION_MS,
        };
      }),
      ...(fleeingTutorialDecoy ? [fleeingTutorialDecoy] : []),
    ];
  };

  const createTutorialDecoy = (): MutablePrisoner | undefined => {
    const sentence = sentences[sentenceIndex];
    if (!tutorialOnly || !sentence || sentence.words.length !== 1) return undefined;
    const point = initialPrisonerPoint(seed, sentenceIndex, sentence.words.length, sentence.words.length + 1);
    return {
      id: `${TUTORIAL_DECOY_PREFIX}${sentenceIndex}`,
      x: point.x,
      y: point.y,
      word: tutorialDecoyWord(sentences, sentenceIndex),
      translation: sentence.translation,
      sentenceIndex,
      orderIndex: -1,
      radius: PRISONER_RADIUS,
      collected: false,
      fleeing: false,
      fleeTimer: 0,
    };
  };

  const spawnTutorialDecoy = (): MutablePrisoner | undefined => {
    const decoy = createTutorialDecoy();
    if (!decoy) return undefined;
    tutorialDecoy = decoy;
    prisoners = [...prisoners.filter((prisoner) => prisoner.id !== decoy.id), decoy];
    return decoy;
  };

  const restoreTrailFrom = (segmentIndex: number): void => {
    const removed = trail.slice(segmentIndex);
    const removedIds = new Set(removed.map((segment) => segment.id.replace(/^trail:/u, "")));
    trail = trail.slice(0, segmentIndex);
    wordIndex = trail.length;
    prisoners = prisoners.map((prisoner) => {
      if (!removedIds.has(prisoner.id)) return prisoner;
      const point = initialPrisonerPoint(seed, sentenceIndex, prisoner.orderIndex, sentences[sentenceIndex]!.words.length);
      return {
        ...prisoner,
        x: point.x,
        y: point.y,
        collected: false,
        fleeing: false,
        fleeTimer: 0,
      };
    });
  };

  const resolvePortal = (): DungeonLiberatorActionResult => {
    const before = snapshot();
    if (destroyed || phase !== "playing") return emptyAction();
    if (distance(player, portal) > player.radius + portal.radius || trail.length !== sentences[sentenceIndex]!.words.length) {
      return actionResult(before, {
        accepted: true,
        correct: false,
        progressed: false,
        sentenceCompleted: false,
        terminal: false,
        completed: false,
      });
    }

    lastOutcome = "portal";
    const finalSentence = sentenceIndex === sentences.length - 1;
    if (finalSentence) {
      const result = terminalResult("victory");
      sentenceIndex = sentences.length;
      wordIndex = 0;
      return actionResult(snapshot(), {
        accepted: true,
        correct: true,
        progressed: true,
        sentenceCompleted: true,
      terminal: true,
      completed: true,
      result,
    });
    }

    sentenceIndex += 1;
    wordIndex = 0;
    trail = [];
    tutorialDecoy = undefined;
    prisoners = buildPrisoners(sentenceIndex);
    player = { ...player, x: 88, y: DUNGEON_LIBERATOR_CANVAS.height / 2 };
    return actionResult(snapshot(), {
      accepted: true,
      correct: true,
      progressed: true,
      sentenceCompleted: true,
      terminal: false,
      completed: false,
    });
  };

  const resolvePrisoner = (prisonerId: string): DungeonLiberatorActionResult => {
    if (destroyed || phase !== "playing") return emptyAction();
    const prisoner = prisoners.find((candidate) => candidate.id === prisonerId);
    if (!prisoner || prisoner.collected || prisoner.fleeing) return emptyAction();

    const correct = prisoner.orderIndex === wordIndex;
    accountant.recordAttempt({ correct });
    if (!correct) {
      lastOutcome = "incorrect";
      resetChain(prisoner.id);
      return actionResult(snapshot(), {
        accepted: true,
        correct: false,
        progressed: false,
        sentenceCompleted: false,
        terminal: false,
        completed: false,
      });
    }

    prisoner.collected = true;
    wordIndex += 1;
    lastOutcome = "correct";
    accountant.addScore(100);
    trail = [...trail, {
      id: `trail:${prisoner.id}`,
      x: player.x,
      y: player.y,
      word: prisoner.word,
      translation: prisoner.translation,
      orderIndex: prisoner.orderIndex,
    }];
    return actionResult(snapshot(), {
      accepted: true,
      correct: true,
      progressed: true,
      sentenceCompleted: false,
      terminal: false,
      completed: false,
    });
  };

  const resolvePrisonerCollision = (): DungeonLiberatorActionResult | undefined => {
    const collided = prisoners
      .filter((prisoner) => !prisoner.collected && !prisoner.fleeing)
      .filter((prisoner) => distance(player, prisoner) <= player.radius + prisoner.radius)
      .sort((left, right) => left.orderIndex - right.orderIndex)[0];
    return collided ? resolvePrisoner(collided.id) : undefined;
  };

  const resolveMonster = (
    monsterId?: string,
    collisionSource: "player" | "trail" = "player",
  ): DungeonLiberatorActionResult => {
    if (destroyed || phase !== "playing") return emptyAction();
    if (collisionSource === "player" && player.invulnerabilityTime > 0) return emptyAction();
    const monster = monsterId === undefined
      ? monsters.find((candidate) => distance(player, candidate) <= player.radius + candidate.radius)
      : monsters.find((candidate) => candidate.id === monsterId);
    if (!monster) return emptyAction();

    lastOutcome = "hazard";
    if (collisionSource === "trail") {
      const trailIndex = trail.findIndex((segment) => distance(monster, segment) <= monster.radius + TRAIL_SEGMENT_RADIUS);
      if (trailIndex >= 0) restoreTrailFrom(trailIndex);
      else player = { ...player, lives: Math.max(0, player.lives - 1) };
      player = { ...player, invulnerabilityTime: INVULNERABILITY_DURATION };
    } else if (trail.length > 0) {
      resetChain();
      player = { ...player, invulnerabilityTime: INVULNERABILITY_DURATION };
    } else {
      player = {
        ...player,
        lives: Math.max(0, player.lives - 1),
        invulnerabilityTime: INVULNERABILITY_DURATION,
      };
    }
    if (player.lives === 0) {
      const result = terminalResult("defeat");
      return actionResult(snapshot(), {
        accepted: true,
        correct: false,
        progressed: false,
        sentenceCompleted: false,
        terminal: true,
        completed: true,
        result,
      });
    }
    return actionResult(snapshot(), {
      accepted: true,
      correct: false,
      progressed: false,
      sentenceCompleted: false,
      terminal: false,
      completed: false,
    });
  };

  const resolveAllCollisions = (): DungeonLiberatorActionResult | undefined => {
    const prisonerResult = resolvePrisonerCollision();
    if (prisonerResult) return prisonerResult;
    const trailMonster = monsters.find((candidate) => trail.some((segment) =>
      distance(candidate, segment) <= candidate.radius + TRAIL_SEGMENT_RADIUS,
    ));
    if (trailMonster) return resolveMonster(trailMonster.id, "trail");
    const monster = monsters.find((candidate) => distance(player, candidate) <= player.radius + candidate.radius);
    if (monster) return resolveMonster(monster.id);
    if (distance(player, portal) <= player.radius + portal.radius) return resolvePortal();
    return undefined;
  };

  const validateRestoredState = (state: DungeonLiberatorSnapshot): void => {
    if (!state || typeof state !== "object") throw new Error("Dungeon Liberator responsive state is invalid");
    if (!(state.phase === "playing" || state.phase === "victory" || state.phase === "defeat")) {
      throw new Error("Dungeon Liberator responsive state phase is invalid");
    }
    if (state.seed !== seed || state.sentenceCount !== sentences.length || state.targetCount !== targetCount) {
      throw new Error("Dungeon Liberator responsive state identity is invalid");
    }
    if (completion.hasCompleted && state.phase === "playing") {
      throw new Error("Dungeon Liberator cannot restore active state after completion");
    }
    const activeSentenceIndex = state.phase === "victory" ? sentences.length - 1 : state.sentenceIndex;
    if (!Number.isInteger(activeSentenceIndex) || activeSentenceIndex < 0 || activeSentenceIndex >= sentences.length) {
      throw new Error("Dungeon Liberator responsive state sentence index is invalid");
    }
    if (state.phase === "victory" && state.sentenceIndex !== sentences.length) {
      throw new Error("Dungeon Liberator victory state is incomplete");
    }
    if (state.phase !== "victory" && state.sentenceIndex !== activeSentenceIndex) {
      throw new Error("Dungeon Liberator responsive state sentence index is invalid");
    }
    const sentence = sentences[activeSentenceIndex]!;
    const expectedWords = sentence.words;
    if (state.prompt !== sentence.translation || state.sentence !== sentence.term || state.words.join(" ") !== expectedWords.join(" ")) {
      throw new Error("Dungeon Liberator responsive state sentence is invalid");
    }
    if (!Number.isInteger(state.wordIndex) || state.wordIndex < 0 || state.wordIndex > expectedWords.length) {
      throw new Error("Dungeon Liberator responsive state word index is invalid");
    }
    const expectedTargetIndex = state.phase === "victory"
      ? targetCount
      : completedWords(sentences, activeSentenceIndex) + state.wordIndex;
    if (state.targetIndex !== expectedTargetIndex) throw new Error("Dungeon Liberator responsive state target index is invalid");
    if (state.phase === "playing" && activeSentenceIndex === sentences.length - 1 && state.targetIndex === targetCount) {
      throw new Error("Dungeon Liberator responsive playing state is terminal");
    }
    if (state.phase === "victory" && state.wordIndex !== 0) throw new Error("Dungeon Liberator victory word index is invalid");
    const expectedAnswer = expectedWords[Math.min(state.wordIndex, expectedWords.length - 1)]!;
    if (state.answer !== (state.phase === "victory" ? "" : expectedAnswer)) {
      throw new Error("Dungeon Liberator responsive answer is inconsistent");
    }
    if (!Number.isInteger(state.lives) || state.lives < 0 || state.lives > maxLives || state.energy !== state.lives) {
      throw new Error("Dungeon Liberator responsive state resources are invalid");
    }
    if (state.phase === "playing" && state.lives === 0) throw new Error("Dungeon Liberator playing state has no lives");
    if (state.phase === "defeat" && state.lives !== 0) throw new Error("Dungeon Liberator defeat state must have zero lives");
    if (!Number.isInteger(state.correctAnswers) || !Number.isInteger(state.totalAttempts)
      || state.correctAnswers < 0 || state.correctAnswers > state.totalAttempts
      || state.totalAttempts < 0 || state.score !== state.correctAnswers * 100) {
      throw new Error("Dungeon Liberator responsive result counters are invalid");
    }
    if (!Number.isFinite(state.gameTime) || state.gameTime < 0 || typeof state.destroyed !== "boolean") {
      throw new Error("Dungeon Liberator responsive lifecycle state is invalid");
    }
    if (!state.player || state.player.id !== "player" || state.player.lives !== state.lives || state.player.radius !== PLAYER_RADIUS
      || state.player.speed !== PLAYER_SPEED || state.player.maxLives !== maxLives
      || !Number.isFinite(state.player.invulnerabilityTime)
      || state.player.invulnerabilityTime < 0 || state.player.invulnerabilityTime > INVULNERABILITY_DURATION
      || !Number.isFinite(state.player.x) || !Number.isFinite(state.player.y)
      || state.player.x < WORLD_MARGIN || state.player.x > DUNGEON_LIBERATOR_CANVAS.width - WORLD_MARGIN
      || state.player.y < WORLD_MARGIN || state.player.y > DUNGEON_LIBERATOR_CANVAS.height - WORLD_MARGIN) {
      throw new Error("Dungeon Liberator responsive player state is invalid");
    }
    if (state.portal.id !== "portal" || state.portal.x !== portal.x || state.portal.y !== portal.y || state.portal.radius !== portal.radius) {
      throw new Error("Dungeon Liberator responsive portal state is invalid");
    }
    if (!Array.isArray(state.prisoners)) {
      throw new Error("Dungeon Liberator responsive prisoner entities are invalid");
    }
    const actualPrisoners = state.prisoners.filter((prisoner) => !prisoner.id.startsWith(TUTORIAL_DECOY_PREFIX));
    const tutorialDecoys = state.prisoners.filter((prisoner) => prisoner.id.startsWith(TUTORIAL_DECOY_PREFIX));
    if (actualPrisoners.length !== expectedWords.length || tutorialDecoys.length > 1
      || (tutorialDecoys.length > 0 && !tutorialOnly)) {
      throw new Error("Dungeon Liberator responsive prisoner entities are invalid");
    }
    const decoy = tutorialDecoys[0];
    if (decoy && (decoy.id !== `${TUTORIAL_DECOY_PREFIX}${activeSentenceIndex}`
      || decoy.word !== tutorialDecoyWord(sentences, activeSentenceIndex) || decoy.translation !== sentence.translation
      || decoy.sentenceIndex !== activeSentenceIndex || decoy.orderIndex !== -1 || decoy.collected
      || !decoy.fleeing || !Number.isFinite(decoy.x) || !Number.isFinite(decoy.y)
      || decoy.x < PRISONER_RADIUS || decoy.x > DUNGEON_LIBERATOR_CANVAS.width - PRISONER_RADIUS
      || decoy.y < PRISONER_RADIUS || decoy.y > DUNGEON_LIBERATOR_CANVAS.height - PRISONER_RADIUS
      || decoy.radius !== PRISONER_RADIUS || !Number.isFinite(decoy.fleeTimer) || decoy.fleeTimer <= 0)) {
      throw new Error("Dungeon Liberator responsive tutorial decoy is inconsistent");
    }
    const expectedCollectedCount = state.phase === "victory" ? expectedWords.length : state.wordIndex;
    for (let index = 0; index < actualPrisoners.length; index += 1) {
      const prisoner = actualPrisoners[index]!;
      if (prisoner.id !== `prisoner:${activeSentenceIndex}:${index}`
        || prisoner.sentenceIndex !== activeSentenceIndex || prisoner.orderIndex !== index
        || prisoner.word !== expectedWords[index] || prisoner.translation !== sentence.translation
         || prisoner.radius !== PRISONER_RADIUS || prisoner.collected !== (index < expectedCollectedCount)
        || !Number.isFinite(prisoner.x) || !Number.isFinite(prisoner.y)
        || prisoner.x < PRISONER_RADIUS || prisoner.x > DUNGEON_LIBERATOR_CANVAS.width - PRISONER_RADIUS
        || prisoner.y < PRISONER_RADIUS || prisoner.y > DUNGEON_LIBERATOR_CANVAS.height - PRISONER_RADIUS
        || !Number.isFinite(prisoner.fleeTimer) || prisoner.fleeTimer < 0
        || (prisoner.fleeing && prisoner.fleeTimer <= 0)) {
        throw new Error("Dungeon Liberator responsive prisoner entity is inconsistent");
      }
    }
    const expectedTarget = state.phase === "victory"
      ? undefined
      : actualPrisoners.find((prisoner) => prisoner.orderIndex === state.wordIndex && !prisoner.collected && !prisoner.fleeing);
    const expectedCorrectAction = expectedTarget ? directionToPoint(state.player, expectedTarget) : "move-right";
    if (state.correctAction !== expectedCorrectAction) {
      throw new Error("Dungeon Liberator responsive correct action is inconsistent");
    }
    if (!Array.isArray(state.trail) || state.trail.length !== expectedCollectedCount) {
      throw new Error("Dungeon Liberator responsive trail is inconsistent");
    }
    for (let index = 0; index < state.trail.length; index += 1) {
      const segment = state.trail[index]!;
      const prisoner = state.prisoners[index]!;
      if (segment.id !== `trail:${prisoner.id}` || segment.word !== prisoner.word
        || segment.translation !== prisoner.translation || segment.orderIndex !== index
        || !Number.isFinite(segment.x) || !Number.isFinite(segment.y)) {
        throw new Error("Dungeon Liberator responsive trail entity is inconsistent");
      }
    }
    if (!Array.isArray(state.monsters) || state.monsters.length !== monsterCount) {
      throw new Error("Dungeon Liberator responsive monster entities are invalid");
    }
    for (let index = 0; index < state.monsters.length; index += 1) {
      const monster = state.monsters[index]!;
      if (monster.id !== `monster:${index}` || monster.radius !== MONSTER_RADIUS || monster.speed < 0
        || !Number.isFinite(monster.x) || !Number.isFinite(monster.y)
        || monster.x < WORLD_MARGIN || monster.x > DUNGEON_LIBERATOR_CANVAS.width - WORLD_MARGIN
        || monster.y < WORLD_MARGIN || monster.y > DUNGEON_LIBERATOR_CANVAS.height - WORLD_MARGIN
        || !Number.isFinite(monster.velocityX) || !Number.isFinite(monster.velocityY)) {
        throw new Error("Dungeon Liberator responsive monster entity is inconsistent");
      }
    }
    if (!DUNGEON_MOVEMENT_ACTIONS.includes(state.correctAction)
      || state.availableActions.join(",") !== DUNGEON_MOVEMENT_ACTIONS.join(",")) {
      throw new Error("Dungeon Liberator responsive action contract is invalid");
    }
    if (state.result !== undefined) gameResultsSchema.parse(state.result);
    if (state.phase === "playing" && state.result !== undefined) {
      throw new Error("Dungeon Liberator active state has a terminal result");
    }
    if ((state.phase === "victory" || state.phase === "defeat") && state.result === undefined) {
      throw new Error("Dungeon Liberator terminal state has no result");
    }
  };

  const restore = (state: DungeonLiberatorSnapshot): void => {
    if (destroyed) return;
    validateRestoredState(state);

    phase = state.phase;
    sentenceIndex = state.sentenceIndex;
    wordIndex = state.wordIndex;
    player = { ...state.player };
    prisoners = state.prisoners.map(copyPrisoner);
    tutorialDecoy = prisoners.find((prisoner) => prisoner.id.startsWith(TUTORIAL_DECOY_PREFIX));
    trail = state.trail.map((segment) => ({ ...segment }));
    monsters = state.monsters.map(copyMonster);
    gameTime = state.gameTime;
    lastOutcome = state.lastOutcome;
    terminalResultValue = state.result;
    destroyed = state.destroyed;
    accountant = createResultAccountant();
    for (let index = 0; index < state.totalAttempts; index += 1) accountant.recordAttempt({ correct: index < state.correctAnswers });
    accountant.addScore(state.score);
    if (destroyed || phase !== "playing") completion.sealWithoutDelivery();
  };

  const move = (direction: DungeonDirection, distanceToMove = MOVE_STEP): DungeonLiberatorActionResult => {
    if (destroyed || phase !== "playing" || !isDirection(direction) || !Number.isFinite(distanceToMove) || distanceToMove < 0) return emptyAction();
    const horizontal = direction === "move-left" ? -1 : direction === "move-right" ? 1 : 0;
    const vertical = direction === "move-up" ? -1 : direction === "move-down" ? 1 : 0;
    player = {
      ...player,
      x: clamp(player.x + horizontal * distanceToMove, WORLD_MARGIN, DUNGEON_LIBERATOR_CANVAS.width - WORLD_MARGIN),
      y: clamp(player.y + vertical * distanceToMove, WORLD_MARGIN, DUNGEON_LIBERATOR_CANVAS.height - WORLD_MARGIN),
    };
    updateTrail();
    return resolveAllCollisions() ?? actionResult(snapshot(), {
      accepted: true,
      correct: false,
      progressed: false,
      sentenceCompleted: false,
      terminal: false,
      completed: false,
    });
  };

  const moveTo = (point: DungeonPoint): DungeonLiberatorActionResult => {
    if (destroyed || phase !== "playing" || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return emptyAction();
    player = {
      ...player,
      x: clamp(point.x, WORLD_MARGIN, DUNGEON_LIBERATOR_CANVAS.width - WORLD_MARGIN),
      y: clamp(point.y, WORLD_MARGIN, DUNGEON_LIBERATOR_CANVAS.height - WORLD_MARGIN),
    };
    updateTrail();
    return resolveAllCollisions() ?? actionResult(snapshot(), {
      accepted: true,
      correct: false,
      progressed: false,
      sentenceCompleted: false,
      terminal: false,
      completed: false,
    });
  };

  const demonstrate = (correct: boolean): DungeonLiberatorActionResult => {
    if (destroyed || phase !== "playing") return emptyAction();
    if (correct && tutorialDecoy) {
      prisoners = prisoners.filter((prisoner) => prisoner.id !== tutorialDecoy?.id);
      tutorialDecoy = undefined;
    }
    const state = snapshot();
    const candidate = correct
      ? state.prisoners.find((prisoner) => prisoner.orderIndex === state.wordIndex && !prisoner.fleeing)
      : state.prisoners.find((prisoner) => prisoner.orderIndex !== state.wordIndex && !prisoner.fleeing);
    if (candidate) return resolvePrisoner(candidate.id);
    if (!correct) {
      const decoy = spawnTutorialDecoy();
      if (decoy) return resolvePrisoner(decoy.id);
    }
    return emptyAction();
  };

  return Object.freeze({
    snapshot,
    choose(action: InputActionId): DungeonLiberatorActionResult {
      return typeof action === "string" && isDirection(action) ? move(action) : emptyAction();
    },
    move,
    moveTo,
    collidePrisoner(prisonerId: string): DungeonLiberatorActionResult {
      if (destroyed || phase !== "playing") return emptyAction();
      return resolvePrisoner(prisonerId);
    },
    collideMonster(monsterId?: string): DungeonLiberatorActionResult {
      return resolveMonster(monsterId);
    },
    tick(deltaMs: number): DungeonLiberatorSnapshot {
      if (destroyed || phase !== "playing") return snapshot();
      if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new Error("Dungeon Liberator tick requires a nonnegative finite delta");
      const boundedDeltaMs = Math.min(deltaMs, MAX_TICK_DELTA_MS);
      gameTime += boundedDeltaMs;
      player = {
        ...player,
        invulnerabilityTime: Math.max(0, player.invulnerabilityTime - boundedDeltaMs),
      };
      prisoners = prisoners.map((prisoner) => {
        if (!prisoner.fleeing) return prisoner;
        const nextTimer = prisoner.fleeTimer - boundedDeltaMs;
        if (nextTimer > 0) return { ...prisoner, fleeTimer: nextTimer, x: clamp(prisoner.x + FLEE_OFFSET * boundedDeltaMs / FLEE_DURATION_MS, 100, DUNGEON_LIBERATOR_CANVAS.width - 150) };
        if (prisoner.id.startsWith(TUTORIAL_DECOY_PREFIX)) {
          tutorialDecoy = undefined;
          return undefined;
        }
        const point = initialPrisonerPoint(seed, sentenceIndex, prisoner.orderIndex, sentences[sentenceIndex]!.words.length);
        return { ...prisoner, x: clamp(point.x + FLEE_OFFSET, 100, DUNGEON_LIBERATOR_CANVAS.width - 150), y: point.y, fleeing: false, fleeTimer: 0 };
      }).filter((prisoner): prisoner is MutablePrisoner => prisoner !== undefined);
      monsters = monsters.map((monster) => {
        let x = monster.x + monster.velocityX * monster.speed * boundedDeltaMs / 1_000;
        let y = monster.y + monster.velocityY * monster.speed * boundedDeltaMs / 1_000;
        let velocityX = monster.velocityX;
        let velocityY = monster.velocityY;
        if (x < WORLD_MARGIN || x > DUNGEON_LIBERATOR_CANVAS.width - WORLD_MARGIN) {
          x = clamp(x, WORLD_MARGIN, DUNGEON_LIBERATOR_CANVAS.width - WORLD_MARGIN);
          velocityX *= -1;
        }
        if (y < WORLD_MARGIN || y > DUNGEON_LIBERATOR_CANVAS.height - WORLD_MARGIN) {
          y = clamp(y, WORLD_MARGIN, DUNGEON_LIBERATOR_CANVAS.height - WORLD_MARGIN);
          velocityY *= -1;
        }
        return { ...monster, x, y, velocityX, velocityY };
      });
      resolveAllCollisions();
      return snapshot();
    },
    reachPortal(): DungeonLiberatorActionResult {
      return resolvePortal();
    },
    applyHazard(): DungeonLiberatorActionResult {
      return resolveMonster(monsters[0]?.id);
    },
    capture: snapshot,
    restore,
    demonstrate,
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      completion.sealWithoutDelivery();
    },
  });
}

function dimensions(scene: PhaserSceneLike): { readonly width: number; readonly height: number } {
  return {
    width: scene.scale?.width ?? DUNGEON_LIBERATOR_CANVAS.width,
    height: scene.scale?.height ?? DUNGEON_LIBERATOR_CANVAS.height,
  };
}

function pointerInScene(
  scene: PhaserSceneLike,
  clientX: number,
  clientY: number,
  width: number,
  height: number,
): DungeonPoint {
  const rect = scene.game?.canvas?.getBoundingClientRect?.();
  if (!rect || rect.width <= 0) return { x: clientX, y: clientY };
  const top = rect.top ?? 0;
  const localY = rect.height && rect.height > 0
    ? (clientY - top) * height / rect.height
    : clientY - top;
  return {
    x: (clientX - rect.left) * width / rect.width,
    y: localY,
  };
}

function createScene(context: SceneContext): Readonly<Record<string, unknown>> {
  let resources: SceneResources | undefined;
  let composition = context.composition;
  let previousKeys = new Set<string>();
  let wordLabels: PhaserTextLike[] = [];
  let wordSignature = "";
  let animationMs = 0;
  let cleaned = false;
  const normalize = createInputActionNormalizer({
    keyboard: DUNGEON_LIBERATOR_KEYBOARD_BINDINGS,
    pointerTap: { action: "confirm" },
  });
  const frameScheduler = createBoundedFrameScheduler((deltaMs) => {
    animationMs = (animationMs + deltaMs) % 2_000;
  });

  const syncWordLabels = (scene: PhaserSceneLike, state: DungeonLiberatorSnapshot): void => {
    if (!scene.add || !resources) return;
    const signature = state.prisoners.map((prisoner) => `${prisoner.id}:${prisoner.word}:${prisoner.collected}:${prisoner.fleeing}`).join("|");
    if (signature === wordSignature) return;
    for (const label of wordLabels) label.destroy();
    wordSignature = signature;
     wordLabels = state.prisoners.map((prisoner) => scene.add!.text(0, 0, prisoner.collected ? "" : prisoner.word, {
      fontFamily: "Arial",
      fontSize: "17px",
      color: "#fff7ed",
      align: "center",
    }));
  };

  const updateView = (scene: PhaserSceneLike): void => {
    if (!resources) return;
    const art = resources.art;
    const { width, height } = dimensions(scene);
    const state = context.controller.snapshot();
    syncWordLabels(scene, state);
    const scaleX = width / DUNGEON_LIBERATOR_CANVAS.width;
    const scaleY = height / DUNGEON_LIBERATOR_CANVAS.height;
    const toScene = (point: DungeonPoint): DungeonPoint => ({ x: point.x * scaleX, y: point.y * scaleY });
    const playerPoint = toScene(state.player);
    const portalPoint = toScene(state.portal);
    const pulse = Math.sin(animationMs / 2_000 * Math.PI * 2) * 3;
    const graphics = resources.graphics;

    graphics.clear();
    if (!art.ground("world:ground", width, height)) graphics.fillStyle(0x0b1020, 1).fillRect(0, 0, width, height);
    graphics.fillStyle(0x1d2638, 0.96).fillRoundedRect(width * 0.04, height * 0.13, width * 0.92, height * 0.68, 22);
    graphics.lineStyle(3, 0x7c4a28, 0.9).strokeRoundedRect(width * 0.04, height * 0.13, width * 0.92, height * 0.68, 22);
    graphics.fillStyle(0xf59e0b, 0.24).fillCircle(width * 0.12, height * 0.22, Math.max(18, width * 0.035));
    graphics.fillStyle(0xf59e0b, 0.24).fillCircle(width * 0.88, height * 0.22, Math.max(18, width * 0.035));
    graphics.fillStyle(0x22d3ee, 0.25).fillCircle(portalPoint.x, portalPoint.y, state.portal.radius * scaleX + pulse);
    graphics.lineStyle(4, 0x67e8f9, 0.95).strokeRoundedRect(
      portalPoint.x - state.portal.radius * scaleX,
      portalPoint.y - state.portal.radius * scaleY,
      state.portal.radius * 2 * scaleX,
      state.portal.radius * 2 * scaleY,
      16,
    );
    for (const segment of state.trail) {
      const point = toScene(segment);
      graphics.fillStyle(0xfbbf24, 0.82).fillCircle(point.x, point.y, 11 * Math.min(scaleX, scaleY));
    }
    for (const prisoner of state.prisoners) {
      if (prisoner.collected) continue;
      const point = toScene(prisoner);
      graphics.fillStyle(prisoner.fleeing ? 0x64748b : 0xf97316, prisoner.fleeing ? 0.45 : 0.95)
        .fillCircle(point.x, point.y, prisoner.radius * Math.min(scaleX, scaleY));
      const label = wordLabels[state.prisoners.indexOf(prisoner)];
      label?.setPosition(point.x - 40, point.y + 24);
    }
    const artScale = Math.min(scaleX, scaleY);
    state.monsters.forEach((monster, index) => {
      const point = toScene(monster);
      const drawn = art.place(`monster:${index}`, "enemy:idle", {
        x: point.x,
        y: point.y,
        width: monster.radius * 2.6 * artScale,
        depth: 7,
      });
      if (drawn) return;
      graphics.fillStyle(0xef4444, 0.9).fillCircle(point.x, point.y, monster.radius * artScale);
      graphics.fillStyle(0xfee2e2, 0.85).fillCircle(point.x - 6, point.y - 4, 4);
      graphics.fillStyle(0xfee2e2, 0.85).fillCircle(point.x + 6, point.y - 4, 4);
    });
    if (!art.place("player", "player:idle", {
      x: playerPoint.x,
      y: playerPoint.y,
      width: state.player.radius * 2.8 * artScale,
      depth: 8,
    })) {
      graphics.fillStyle(0x38bdf8, 1).fillCircle(playerPoint.x, playerPoint.y, state.player.radius * artScale);
      graphics.fillStyle(0xe0f2fe, 0.9).fillCircle(playerPoint.x, playerPoint.y - 8, 7 * artScale);
    }
    art.sweep();

    resources.title.setText("DUNGEON LIBERATOR").setPosition(28, 18);
    resources.prompt.setText(`Rescue in order: ${state.prompt}`).setPosition(28, 57);
    resources.progress.setText(
      `${composition?.profile === "compact" ? "Compact dungeon" : "Torchlit dungeon"}  •  Sentence ${Math.min(state.sentenceIndex + 1, state.sentenceCount)} of ${state.sentenceCount}  •  Word ${Math.min(state.wordIndex + 1, state.words.length)} of ${state.words.length}  •  Lives ${state.lives}`,
    ).setPosition(28, 94);
    resources.feedback.setText(
      state.phase === "victory"
        ? "Every prisoner reached the final exit!"
        : state.phase === "defeat"
          ? "The dungeon claimed the rescue party."
          : state.lastOutcome === "incorrect"
            ? "That prisoner fled. Rebuild the chain from the first word."
            : state.lastOutcome === "hazard"
              ? "A monster broke the rescue chain."
              : "Reach the glowing exit with the full rescue chain.",
    ).setPosition(28, height - 116);
    resources.instructions.setText("Keyboard: WASD / arrows  •  Tap the D-pad to move").setPosition(28, height - 88);
    const labels: Readonly<Record<DungeonDirection, string>> = {
      "move-left": "◀",
      "move-right": "▶",
      "move-up": "▲",
      "move-down": "▼",
    };
    for (const button of getDungeonLiberatorDpadButtons(width, height)) {
      const label = resources.dpad[button.action];
      label.setText(labels[button.action]).setPosition(button.x + button.width * 0.36, button.y + button.height * 0.2);
      graphics.fillStyle(0x334155, 0.9).fillRoundedRect(button.x, button.y, button.width, button.height, 12);
      graphics.lineStyle(2, 0x94a3b8, 0.85).strokeRoundedRect(button.x, button.y, button.width, button.height, 12);
    }
  };

  const applyMove = (direction: DungeonDirection, distanceToMove: number): void => {
    const result = distanceToMove === MOVE_STEP
      ? context.controller.choose(direction)
      : context.controller.move(direction, distanceToMove);
    if (!result.accepted || (!result.progressed && !result.terminal)) return;
    context.diagnostic({
      level: "info",
      code: result.terminal ? "DUNGEON_LIBERATOR_TERMINAL" : "DUNGEON_LIBERATOR_RESCUE",
      message: result.terminal ? "Dungeon Liberator reached a terminal state." : "Dungeon Liberator rescued a sentence word.",
      details: { phase: result.snapshot.phase, sentenceIndex: result.snapshot.sentenceIndex, wordIndex: result.snapshot.wordIndex },
    });
  };

  const cleanup = (): void => {
    if (cleaned) return;
    cleaned = true;
    frameScheduler.cancel();
    context.inputController.cancelActiveGesture();
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
    for (const label of wordLabels) label.destroy();
    for (const label of Object.values(activeResources.dpad)) label.destroy();
    wordLabels = [];
    previousKeys = new Set<string>();
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
    if (!this.add) throw new Error("Dungeon Liberator requires Phaser display services");
    const textWidth = Math.max(220, (context.composition?.safeRect?.width ?? DUNGEON_LIBERATOR_CANVAS.width) - 56);
    const style = { fontFamily: "Arial", color: "#f8fbff", fontSize: "18px", wordWrap: { width: textWidth } };
    resources = {
      graphics: this.add.graphics(),
      art: createActorSpriteLayer(this, context.edition),
      title: this.add.text(28, 18, "", { ...style, fontSize: "29px", fontStyle: "bold" }),
      prompt: this.add.text(28, 57, "", { ...style, fontSize: "23px", wordWrap: { width: 860 } }),
      progress: this.add.text(28, 94, "", { ...style, fontSize: "16px", color: "#bae6fd" }),
      feedback: this.add.text(28, 0, "", { ...style, fontSize: "16px", color: "#fde68a" }),
      instructions: this.add.text(28, 0, "", { ...style, fontSize: "15px", color: "#cbd5e1" }),
      dpad: {
        "move-left": this.add.text(0, 0, "", { ...style, fontSize: "26px" }),
        "move-right": this.add.text(0, 0, "", { ...style, fontSize: "26px" }),
        "move-up": this.add.text(0, 0, "", { ...style, fontSize: "26px" }),
        "move-down": this.add.text(0, 0, "", { ...style, fontSize: "26px" }),
      },
    };
    this.events?.once("shutdown", cleanup);
    this.events?.once("destroy", cleanup);
    updateView(this);
  };

  const update = function (this: PhaserSceneLike, _time = 0, delta = 0): void {
    if (!resources || cleaned) return;
    frameScheduler.tick(delta);
    const frameDelta = frameScheduler.lastDeltaMs;
    if (context.sessionMode === "playing") {
      context.controller.tick(frameDelta);
      const input = context.inputController.snapshot();
      const pressed = input.pressed ?? input.keys.filter((key) => !previousKeys.has(key));
      previousKeys = new Set(input.keys);
      const pressedActions = new Set<DungeonDirection>();
      for (const code of pressed) {
        const action = normalize({ modality: "keyboard", code })[0]?.action;
        if (action && isDirection(action)) pressedActions.add(action);
      }
      const heldActions = new Set<DungeonDirection>();
      for (const code of input.keys) {
        const action = normalize({ modality: "keyboard", code })[0]?.action;
        if (action && isDirection(action)) heldActions.add(action);
      }
      const pressedAction = [...pressedActions][0];
      const heldOnlyAction = [...heldActions].find((action) => !pressedActions.has(action));
      let movementApplied = false;
      const action = pressedAction ?? heldOnlyAction;
      if (action) {
        applyMove(action, pressedAction ? MOVE_STEP : PLAYER_SPEED * frameDelta / 1_000);
        movementApplied = true;
      }
      if (!movementApplied && input.pointer.released && !input.pointer.cancelled) {
        const pointer = pointerInScene(this, input.pointer.x, input.pointer.y, dimensions(this).width, dimensions(this).height);
        const pointerAction = normalize({ modality: "pointer", phase: "up", x: pointer.x, y: pointer.y })[0]?.action;
        if (pointerAction === "confirm") {
          const { width, height } = dimensions(this);
          const direction = dungeonDirectionFromPointer(pointer.x, pointer.y, width, height);
          if (direction) applyMove(direction, MOVE_STEP);
        }
      }
    }
    updateView(this);
  };

  return {
    key: DUNGEON_LIBERATOR_ID,
    preload,
    create,
    update,
    extend: {
      apkCaptureResponsiveState: () => context.controller.capture(),
      apkRestoreResponsiveState: (state: unknown) => {
        if (typeof state !== "object" || state === null) throw new Error("Dungeon Liberator responsive state is invalid");
        context.controller.restore(state as DungeonLiberatorSnapshot);
      },
      apkRecompose: (nextComposition: SceneContext["composition"]) => {
        composition = nextComposition;
      },
    },
  };
}

/**
 * Creates the runtime-compatible Dungeon Liberator cartridge.
 * @returns A sentence-mode cartridge with bespoke rescue rules and scene rendering.
 */
export function createDungeonLiberatorCartridge(): StandardExperienceCartridge {
  let activeController: DungeonLiberatorController | undefined;
  const standardExperience = createCartridgeStandardExperience({
    id: DUNGEON_LIBERATOR_ID,
    title: "Dungeon Liberator",
    description: "Move through a torchlit dungeon and rescue sentence prisoners in order.",
    inputMode: "sentence",
    objective: "Rescue every prisoner in sentence order, then escort the full chain to the exit.",
    mechanicInstruction: "Use four-way movement to collide with the next word prisoner and lead the chain to the portal.",
    keyboardKeys: ["W / Up", "A / Left", "S / Down", "D / Right"],
    executeTutorialAction: (actionId) => {
      const controller = activeController;
      if (!controller) return;
      controller.demonstrate(actionId === "action:select-correct");
    },
  });

  return {
    manifest: {
      id: DUNGEON_LIBERATOR_ID,
      title: "Dungeon Liberator",
      description: "Move through a torchlit dungeon and rescue sentence prisoners in order.",
      runtimeApiVersion: "1.0.0",
      inputMode: "sentence",
      requiredAssetBindings: ["dungeon-liberator/prisoner-rescue"],
      capabilities: [...SENTENCE_CAPABILITIES],
    },
    standardExperience,
    createGameConfig(context: DungeonGameConfigContext): Readonly<Record<string, unknown>> {
      const input = sentenceInputSchema.parse(context.input);
      const sessionMode = context.sessionMode ?? "playing";
      const controller = createDungeonLiberatorController(
        input,
        sessionMode === "playing" ? (result, outcome) => context.complete(result, outcome) : () => undefined,
        { seed: context.seed, tutorialOnly: sessionMode !== "playing" },
      );
      activeController = controller;
      context.diagnostic({
        level: "debug",
        code: "DUNGEON_LIBERATOR_READY",
        message: "Dungeon Liberator rescue positions are ready.",
        details: { cartridgeId: DUNGEON_LIBERATOR_ID, editionId: context.edition.id, sentenceCount: input.length },
      });
      return {
        width: DUNGEON_LIBERATOR_CANVAS.width,
        height: DUNGEON_LIBERATOR_CANVAS.height,
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
