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
  type CompletionDelivery,
  type InputActionId,
  type RuntimeEdition,
} from "@reading-advantage/advantage-play-kit";
import type { StandardExperienceCartridge } from "@reading-advantage/advantage-play-kit/presentation";

import { createCartridgeStandardExperience } from "./standard-experience.js";

/** Stable public identifier for the Rune Forge Chamber cartridge. */
export const RUNE_FORGE_CHAMBER_ID = "rune-forge-chamber" as const;

/** Phaser canvas size used by Rune Forge Chamber before host scaling. */
export const RUNE_FORGE_CHAMBER_CANVAS = Object.freeze({ width: 960, height: 540 });

/** Keyboard bindings accepted by the orbiting-rune controller. */
export const RUNE_FORGE_CHAMBER_KEYBOARD_BINDINGS: Readonly<Record<string, InputActionId>> = Object.freeze({
  ArrowLeft: "move-left",
  KeyA: "move-left",
  ArrowRight: "move-right",
  KeyD: "move-right",
  ArrowUp: "move-up",
  KeyW: "move-up",
  ArrowDown: "move-down",
  KeyS: "move-down",
  Enter: "confirm",
  Space: "confirm",
});

/** Semantic actions accepted by the Rune Forge Chamber controller. */
export const RUNE_FORGE_CHAMBER_AVAILABLE_ACTIONS: readonly [
  "move-left",
  "move-right",
  "move-up",
  "move-down",
  "confirm",
] = Object.freeze(["move-left", "move-right", "move-up", "move-down", "confirm"]);

/** Maximum forge health for one Rune Forge Chamber session. */
export const RUNE_FORGE_CHAMBER_MAX_HEALTH = 100;

/** Timer duration for each sentence forge, in milliseconds. */
export const RUNE_FORGE_CHAMBER_SENTENCE_TIMER_MS = 12_000;

/** Health damage caused by selecting a wrong rune. */
export const RUNE_FORGE_CHAMBER_WRONG_RUNE_DAMAGE = 15;

/** Orbit rotation speed, in radians per millisecond. */
export const RUNE_FORGE_CHAMBER_ROTATION_SPEED = 0.0005;

/** Default radius of a rune orbit in the reference canvas. */
export const RUNE_FORGE_CHAMBER_ORBIT_RADIUS = 200;

/** One ordered word represented by a selectable orbiting rune. */
export interface RuneForgeChamberRune {
  /** Stable identity used by keyboard and pointer selection. */
  readonly id: string;
  /** Word shown inside the rune. */
  readonly word: string;
  /** Alias for the visible rune label. */
  readonly label: string;
  /** Zero-based sentence order of the word. */
  readonly orderIndex: number;
  /** Current absolute orbit angle in radians. */
  readonly angle: number;
  /** Reference orbit radius before responsive projection. */
  readonly orbitRadius: number;
  /** Whether the rune has already been forged. */
  readonly selected: boolean;
}

/** Scene-space point and hit radius for one orbiting rune. */
export interface RuneForgeChamberRunePoint {
  /** Stable rune identity. */
  readonly id: string;
  /** Scene-space horizontal coordinate. */
  readonly x: number;
  /** Scene-space vertical coordinate. */
  readonly y: number;
  /** Responsive visual and hit radius. */
  readonly radius: number;
}

/** Active or terminal phase in a Rune Forge Chamber session. */
export type RuneForgeChamberPhase = "playing" | "victory" | "defeat";

/** Result of selecting one rune or advancing one game tick. */
export interface RuneForgeChamberActionResult {
  /** Whether the input identified an active rune or terminal transition. */
  readonly accepted: boolean;
  /** Whether the selected rune was the next ordered word. */
  readonly correct: boolean;
  /** Whether ordered learning progress advanced. */
  readonly progressed: boolean;
  /** Whether the current sentence finished. */
  readonly sentenceCompleted: boolean;
  /** Whether the whole session reached a terminal phase. */
  readonly terminal: boolean;
  /** Alias for terminal retained by the cartridge result contract. */
  readonly completed: boolean;
  /** First terminal result, when this action caused one. */
  readonly result?: GameResults;
  /** State after processing the action. */
  readonly snapshot: RuneForgeChamberSnapshot;
}

/** Immutable state exposed by the transport-independent Rune Forge rules. */
export interface RuneForgeChamberSnapshot {
  /** Current session phase. */
  readonly phase: RuneForgeChamberPhase;
  /** Zero-based sentence currently being forged, or the sentence count at victory. */
  readonly sentenceIndex: number;
  /** Zero-based next word in the current sentence. */
  readonly wordIndex: number;
  /** Flattened zero-based next word across all sentences. */
  readonly targetIndex: number;
  /** Total number of words in all sentences. */
  readonly targetCount: number;
  /** Number of input sentences. */
  readonly sentenceCount: number;
  /** Current translation prompt. */
  readonly prompt: string;
  /** Current ordered source word answer. */
  readonly answer: string;
  /** Semantic action used to confirm the selected rune. */
  readonly correctAction: "confirm";
  /** Semantic actions accepted by the shared host controller contract. */
  readonly availableActions: readonly InputActionId[];
  /** Current source sentence. */
  readonly sentence: string;
  /** Current sentence words. */
  readonly words: readonly string[];
  /** Orbiting word runes for the current sentence. */
  readonly runes: readonly RuneForgeChamberRune[];
  /** Compatibility alias for the orbiting circles. */
  readonly circles: readonly RuneForgeChamberRune[];
  /** Stable identity of the next required rune. */
  readonly nextRuneId?: string;
  /** Stable identity selected by the keyboard cursor. */
  readonly cursorRuneId?: string;
  /** Source words already forged in the current sentence. */
  readonly collectedWords: readonly string[];
  /** Current forge health. */
  readonly health: number;
  /** Alias for the current forge health. */
  readonly forgeHealth: number;
  /** Maximum forge health. */
  readonly maxHealth: number;
  /** Current forge health as the shared lives resource. */
  readonly lives: number;
  /** Maximum forge health as the shared lives resource. */
  readonly maxLives: number;
  /** Remaining sentence timer as the shared energy resource. */
  readonly energy: number;
  /** Maximum sentence timer as the shared energy resource. */
  readonly maxEnergy: number;
  /** Remaining sentence timer in milliseconds. */
  readonly timer: number;
  /** Timer value at the start of the current sentence. */
  readonly maxTimer: number;
  /** Current cumulative orbit rotation in radians. */
  readonly rotation: number;
  /** Result of the most recent accepted learning consequence. */
  readonly lastOutcome?: "correct" | "incorrect";
  /** Number of correctly forged words. */
  readonly correctAnswers: number;
  /** Number of rune selections accepted as attempts. */
  readonly totalAttempts: number;
  /** Current game score. */
  readonly score: number;
  /** Whether scene cleanup permanently sealed the session. */
  readonly destroyed: boolean;
  /** Deterministic host seed used for rune placement and orbit order. */
  readonly seed: number;
}

/** Transport-independent Rune Forge Chamber rules and lifecycle controls. */
export interface RuneForgeChamberController {
  /** Returns the current immutable forge state. */
  snapshot(): RuneForgeChamberSnapshot;
  /** Selects one rune by stable identity. */
  selectRune(runeId: string): RuneForgeChamberActionResult;
  /** Applies one semantic host action or a stable rune identity. */
  choose(action: InputActionId | string): RuneForgeChamberActionResult;
  /** Moves the keyboard cursor around the unselected runes. */
  moveCursor(action: InputActionId): RuneForgeChamberSnapshot;
  /** Rotates the orbit and subtracts elapsed time. */
  tick(deltaMs: number): RuneForgeChamberSnapshot;
  /** Applies one health penalty from an external forge hazard. */
  applyHazard(): RuneForgeChamberActionResult;
  /** Runs the real incorrect-choice consequence for a guided demonstration. */
  demonstrateIncorrectChoice(): RuneForgeChamberActionResult;
  /** Captures angles, cursor, timer, and learning progress for responsive reflow. */
  capture(): RuneForgeChamberSnapshot;
  /** Restores a validated responsive snapshot. */
  restore(snapshot: RuneForgeChamberSnapshot): void;
  /** Seals the controller and prevents later input or result delivery. */
  destroy(): void;
}

/** Deterministic setup options for one Rune Forge Chamber session. */
export interface RuneForgeChamberControllerOptions {
  /** Host seed used for rune placement and orbit order. */
  readonly seed?: number;
  /** Optional deterministic source used to derive a host seed. */
  readonly rng?: () => number;
}

/** Minimal Phaser graphics surface used by the procedural scene. */
interface PhaserGraphicsLike {
  clear(): this;
  fillStyle(color: number, alpha?: number): this;
  fillRect(x: number, y: number, width: number, height: number): this;
  fillCircle(x: number, y: number, radius: number): this;
  strokeCircle(x: number, y: number, radius: number): this;
  fillRoundedRect(x: number, y: number, width: number, height: number, radius?: number): this;
  lineStyle(lineWidth: number, color: number, alpha?: number): this;
  strokeRoundedRect(x: number, y: number, width: number, height: number, radius?: number): this;
  destroy(): void;
}

/** Minimal Phaser text surface used by the procedural scene. */
interface PhaserTextLike {
  setPosition(x: number, y: number): this;
  setText(value: string): this;
  destroy(): void;
}

/** Minimal Phaser canvas surface needed for pointer coordinate conversion. */
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

/** Resources owned by one active Rune Forge Chamber scene. */
interface SceneResources {
  readonly art: ActorSpriteLayer;
  readonly graphics: PhaserGraphicsLike;
  readonly title: PhaserTextLike;
  readonly prompt: PhaserTextLike;
  readonly progress: PhaserTextLike;
  readonly feedback: PhaserTextLike;
  readonly instructions: PhaserTextLike;
}

/** Context captured by the Rune Forge Chamber scene closure. */
interface RuneForgeChamberSceneContext {
  readonly edition: RuntimeEdition;
  readonly controller: RuneForgeChamberController;
  readonly inputController: APKInputController;
  readonly composition: CartridgeGameConfigContext["composition"];
  readonly diagnostic: CartridgeGameConfigContext["diagnostic"];
  readonly sessionMode: NonNullable<CartridgeGameConfigContext["sessionMode"]>;
  readonly totalSentences: number;
}

interface SentenceRound {
  readonly term: string;
  readonly translation: string;
  readonly words: readonly string[];
}

const TAU = Math.PI * 2;

function tokenizeSentence(sentence: string): readonly string[] {
  return Object.freeze(sentence.trim().split(/\s+/u).filter(Boolean));
}

function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) throw new Error("Rune Forge Chamber seed must be finite");
  return Math.abs(Math.trunc(seed)) % 2_147_483_647;
}

function hashUnit(seed: number, sentenceIndex: number, wordIndex: number, salt: number): number {
  let value = (seed >>> 0)
    ^ Math.imul(sentenceIndex + 1, 0x45d9f3b)
    ^ Math.imul(wordIndex + 1, 0x119de1f3)
    ^ Math.imul(salt + 1, 0x3449b2f7);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 13), 0x45d9f3b);
  return ((value ^ (value >>> 16)) >>> 0) / 4_294_967_296;
}

function createRoundRunes(
  sentenceIndex: number,
  words: readonly string[],
  seed: number,
): readonly RuneForgeChamberRune[] {
  const orbitSlots = words.map((_word, index) => index);
  for (let index = orbitSlots.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(hashUnit(seed, sentenceIndex, index, 11) * (index + 1));
    [orbitSlots[index], orbitSlots[swapIndex]] = [orbitSlots[swapIndex]!, orbitSlots[index]!];
  }
  return Object.freeze(words.map((word, orderIndex) => {
    const orbitIndex = orbitSlots[orderIndex]!;
    const jitter = (hashUnit(seed, sentenceIndex, orderIndex, 17) - 0.5)
      * Math.min(0.32, (TAU / words.length) * 0.18);
    return Object.freeze({
      id: `rune:${sentenceIndex}:${orderIndex}`,
      word,
      label: word,
      orderIndex,
      angle: -Math.PI / 2 + (TAU * orbitIndex) / words.length + jitter,
      orbitRadius: RUNE_FORGE_CHAMBER_ORBIT_RADIUS,
      selected: false,
    });
  }));
}

function freezeWords(words: readonly string[]): readonly string[] {
  return Object.freeze([...words]);
}

function isFiniteNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function createActionResult(
  snapshot: RuneForgeChamberSnapshot,
  values: Omit<RuneForgeChamberActionResult, "snapshot">,
): RuneForgeChamberActionResult {
  return Object.freeze({ ...values, snapshot });
}

/**
 * Creates deterministic rules for ordered sentence-word forging.
 * @param input Strict sentence content supplied by the host or test.
 * @param deliver Callback that receives the first terminal result.
 * @param options Deterministic seed and optional seed source for rune placement.
 * @returns A controller for orbiting-rune selection, timing, health, and cleanup.
 * @throws When sentence content is invalid, empty, or contains no words.
 */
export function createRuneForgeChamberController(
  input: unknown,
  deliver: CompletionDelivery<GameResults>,
  options: RuneForgeChamberControllerOptions = {},
): RuneForgeChamberController {
  const parsedInput = sentenceInputSchema.parse(input);
  const content = validateNonEmptyContent(parsedInput, "sentence");
  const seedFromRng = options.rng?.();
  const seed = normalizeSeed(options.seed ?? (seedFromRng === undefined ? 0 : seedFromRng * 1_000_000));
  const rounds: readonly SentenceRound[] = Object.freeze(content.items.map((item) => {
    const words = tokenizeSentence(item.term);
    if (words.length === 0) throw new Error("Rune Forge Chamber requires sentence words");
    return Object.freeze({ term: item.term.trim(), translation: item.translation, words });
  }));
  const targetCount = rounds.reduce((total, round) => total + round.words.length, 0);
  if (targetCount === 0) throw new Error("Rune Forge Chamber requires sentence words");

  let accountant = createResultAccountant();
  const completion = createCompletionLatch(deliver);
  let phase: RuneForgeChamberPhase = "playing";
  let sentenceIndex = 0;
  let wordIndex = 0;
  let targetIndex = 0;
  let runes = createRoundRunes(0, rounds[0]!.words, seed);
  let cursorRuneId: string | undefined = runes[0]?.id;
  let health = RUNE_FORGE_CHAMBER_MAX_HEALTH;
  let timer = RUNE_FORGE_CHAMBER_SENTENCE_TIMER_MS;
  let rotation = 0;
  let lastOutcome: "correct" | "incorrect" | undefined;
  let destroyed = false;
  let terminalResultValue: GameResults | undefined;

  const currentRound = (): SentenceRound => rounds[Math.min(sentenceIndex, rounds.length - 1)]!;

  const snapshot = (): RuneForgeChamberSnapshot => {
    const round = currentRound();
    const nextRuneId = phase === "playing" ? runes[wordIndex]?.id : undefined;
    const answer = round.words[Math.min(wordIndex, round.words.length - 1)] ?? "";
    return Object.freeze({
      phase,
      sentenceIndex,
      wordIndex,
      targetIndex,
      targetCount,
      sentenceCount: rounds.length,
      prompt: round.translation,
      answer,
      correctAction: "confirm",
      availableActions: RUNE_FORGE_CHAMBER_AVAILABLE_ACTIONS,
      sentence: round.term,
      words: freezeWords(round.words),
      runes,
      circles: runes,
      ...(nextRuneId === undefined ? {} : { nextRuneId }),
      ...(cursorRuneId === undefined ? {} : { cursorRuneId }),
      collectedWords: Object.freeze(runes
        .filter((rune) => rune.selected)
        .sort((left, right) => left.orderIndex - right.orderIndex)
        .map((rune) => rune.word)),
      health,
      forgeHealth: health,
      maxHealth: RUNE_FORGE_CHAMBER_MAX_HEALTH,
      lives: health,
      maxLives: RUNE_FORGE_CHAMBER_MAX_HEALTH,
      energy: timer,
      maxEnergy: RUNE_FORGE_CHAMBER_SENTENCE_TIMER_MS,
      timer,
      maxTimer: RUNE_FORGE_CHAMBER_SENTENCE_TIMER_MS,
      rotation,
      lastOutcome,
      correctAnswers: accountant.correctAnswers,
      totalAttempts: accountant.totalAttempts,
      score: accountant.score,
      destroyed,
      seed,
    });
  };

  const resultForCounters = (): GameResults => gameResultsSchema.parse(
    finalizeResult(accountant, { xpPerCorrect: 20, xpPerAccuracyPoint: 10 }),
  );

  const enterDefeat = (): GameResults => {
    phase = "defeat";
    const result = resultForCounters();
    terminalResultValue = result;
    completion.complete(result);
    return result;
  };

  const enterVictory = (): GameResults => {
    phase = "victory";
    sentenceIndex = rounds.length;
    wordIndex = 0;
    cursorRuneId = undefined;
    const result = resultForCounters();
    terminalResultValue = result;
    completion.complete(result);
    return result;
  };

  const inactiveAction = (before: RuneForgeChamberSnapshot): RuneForgeChamberActionResult => createActionResult(before, {
    accepted: false,
    correct: false,
    progressed: false,
    sentenceCompleted: false,
    terminal: phase !== "playing",
    completed: phase !== "playing",
    ...(terminalResultValue === undefined ? {} : { result: terminalResultValue }),
  });

  const terminalAction = (
    correct: boolean,
    progressed: boolean,
    sentenceCompleted: boolean,
    result: GameResults,
  ): RuneForgeChamberActionResult => createActionResult(snapshot(), {
    accepted: true,
    correct,
    progressed,
    sentenceCompleted,
    terminal: true,
    completed: true,
    result,
  });

  const validateRestoredState = (state: RuneForgeChamberSnapshot): void => {
    if (state === null || typeof state !== "object") throw new Error("Rune Forge Chamber state must be an object");
    if (state.targetCount !== targetCount) throw new Error("Rune Forge Chamber target count is invalid");
    if (state.sentenceCount !== rounds.length) throw new Error("Rune Forge Chamber sentence count is invalid");
    if (state.seed !== seed) throw new Error("Rune Forge Chamber seed is invalid");
    if (!(state.phase === "playing" || state.phase === "victory" || state.phase === "defeat")) {
      throw new Error("Rune Forge Chamber phase is invalid");
    }
    if (!Number.isInteger(state.sentenceIndex) || state.sentenceIndex < 0 || state.sentenceIndex > rounds.length) {
      throw new Error("Rune Forge Chamber sentence index is invalid");
    }
    if (!Number.isInteger(state.wordIndex) || state.wordIndex < 0) {
      throw new Error("Rune Forge Chamber word index is invalid");
    }
    if (typeof state.destroyed !== "boolean") throw new Error("Rune Forge Chamber destroyed flag is invalid");
    if (state.phase !== "victory" && state.sentenceIndex >= rounds.length) {
      throw new Error("Rune Forge Chamber sentence index is invalid");
    }
    const expectedTargetIndex = state.phase === "victory"
      ? targetCount
      : rounds.slice(0, state.sentenceIndex).reduce((total, round) => total + round.words.length, 0) + state.wordIndex;
    if (state.targetIndex !== expectedTargetIndex) throw new Error("Rune Forge Chamber progress is invalid");
    if (state.phase !== "victory" && state.wordIndex > rounds[state.sentenceIndex]!.words.length) {
      throw new Error("Rune Forge Chamber word progress is invalid");
    }
    if (state.phase === "playing" && (state.sentenceIndex >= rounds.length || state.wordIndex >= rounds[state.sentenceIndex]!.words.length)) {
      throw new Error("Rune Forge Chamber playing state is terminal");
    }
    if (state.phase === "playing" && (state.health === 0 || state.timer === 0)) {
      throw new Error("Rune Forge Chamber playing state has no resources");
    }
    if (state.phase === "victory" && state.sentenceIndex !== rounds.length) {
      throw new Error("Rune Forge Chamber victory state is incomplete");
    }
    if (state.phase === "defeat" && state.health !== 0 && state.timer !== 0) {
      throw new Error("Rune Forge Chamber defeat state has resources remaining");
    }
    const expectedRound = rounds[Math.min(state.sentenceIndex, rounds.length - 1)]!;
    if (!Number.isInteger(state.health) || state.health < 0 || state.health > RUNE_FORGE_CHAMBER_MAX_HEALTH) {
      throw new Error("Rune Forge Chamber health is invalid");
    }
    if (!isFiniteNonNegative(state.timer) || state.timer > RUNE_FORGE_CHAMBER_SENTENCE_TIMER_MS) {
      throw new Error("Rune Forge Chamber timer is invalid");
    }
    if (!Number.isFinite(state.rotation)) throw new Error("Rune Forge Chamber rotation is invalid");
    if (!Number.isInteger(state.correctAnswers) || state.correctAnswers < 0 || state.correctAnswers > state.totalAttempts) {
      throw new Error("Rune Forge Chamber result counters are invalid");
    }
    if (!Number.isInteger(state.totalAttempts) || state.totalAttempts < 0 || !Number.isInteger(state.score) || state.score < 0) {
      throw new Error("Rune Forge Chamber attempt counters are invalid");
    }
    if (state.correctAnswers !== state.targetIndex || state.score !== state.correctAnswers * 100) {
      throw new Error("Rune Forge Chamber score progress is invalid");
    }
    if (state.forgeHealth !== state.health || state.maxHealth !== RUNE_FORGE_CHAMBER_MAX_HEALTH || state.maxTimer !== RUNE_FORGE_CHAMBER_SENTENCE_TIMER_MS) {
      throw new Error("Rune Forge Chamber resource aliases are invalid");
    }
    if (state.lives !== state.health || state.maxLives !== RUNE_FORGE_CHAMBER_MAX_HEALTH
      || state.energy !== state.timer || state.maxEnergy !== RUNE_FORGE_CHAMBER_SENTENCE_TIMER_MS) {
      throw new Error("Rune Forge Chamber shared resources are invalid");
    }
    if (state.answer !== expectedRound.words[Math.min(state.wordIndex, expectedRound.words.length - 1)]
      || state.correctAction !== "confirm"
      || state.availableActions.length !== RUNE_FORGE_CHAMBER_AVAILABLE_ACTIONS.length
      || state.availableActions.some((action, index) => action !== RUNE_FORGE_CHAMBER_AVAILABLE_ACTIONS[index])) {
      throw new Error("Rune Forge Chamber shared action contract is invalid");
    }
    if (state.lastOutcome !== undefined && state.lastOutcome !== "correct" && state.lastOutcome !== "incorrect") {
      throw new Error("Rune Forge Chamber outcome is invalid");
    }
    if (state.sentence !== expectedRound.term || state.prompt !== expectedRound.translation) {
      throw new Error("Rune Forge Chamber sentence content is invalid");
    }
    if (state.words.length !== expectedRound.words.length || state.words.some((word, index) => word !== expectedRound.words[index])) {
      throw new Error("Rune Forge Chamber word content is invalid");
    }
    if (state.runes.length !== expectedRound.words.length) throw new Error("Rune Forge Chamber rune count is invalid");
    if (state.circles.length !== state.runes.length) throw new Error("Rune Forge Chamber circle alias is invalid");
    if (state.circles.some((circle, index) => circle.id !== state.runes[index]?.id
      || circle.word !== state.runes[index]?.word
      || circle.selected !== state.runes[index]?.selected)) {
      throw new Error("Rune Forge Chamber circle alias content is invalid");
    }
    const expectedNextRuneId = state.phase === "playing"
      ? state.runes.find((rune) => rune.orderIndex === state.wordIndex)?.id
      : undefined;
    if (state.nextRuneId !== expectedNextRuneId) throw new Error("Rune Forge Chamber next rune is invalid");
    if (state.cursorRuneId !== undefined && !state.runes.some((rune) => rune.id === state.cursorRuneId)) {
      throw new Error("Rune Forge Chamber cursor rune is invalid");
    }
    state.runes.forEach((rune, index) => {
      if (rune.id !== `rune:${Math.min(state.sentenceIndex, rounds.length - 1)}:${index}` || rune.word !== expectedRound.words[index]) {
        throw new Error("Rune Forge Chamber rune identity is invalid");
      }
      if (rune.orderIndex !== index || rune.label !== rune.word || rune.orbitRadius !== RUNE_FORGE_CHAMBER_ORBIT_RADIUS) {
        throw new Error("Rune Forge Chamber rune metadata is invalid");
      }
      const expectedSelected = state.phase === "victory" || index < state.wordIndex;
      if (!Number.isFinite(rune.angle) || rune.selected !== expectedSelected) {
        throw new Error("Rune Forge Chamber rune progress is invalid");
      }
    });
    const expectedCollectedWords = expectedRound.words.slice(0, state.phase === "victory" ? expectedRound.words.length : state.wordIndex);
    if (state.collectedWords.length !== expectedCollectedWords.length
      || state.collectedWords.some((word, index) => word !== expectedCollectedWords[index])) {
      throw new Error("Rune Forge Chamber collected words are invalid");
    }
  };

  const restore = (state: RuneForgeChamberSnapshot): void => {
    if (destroyed) return;
    validateRestoredState(state);
    accountant = createResultAccountant();
    for (let index = 0; index < state.totalAttempts; index += 1) {
      accountant.recordAttempt({ correct: index < state.correctAnswers });
    }
    accountant.addScore(state.score);
    phase = state.phase;
    sentenceIndex = state.sentenceIndex;
    wordIndex = state.wordIndex;
    targetIndex = state.targetIndex;
    runes = Object.freeze(state.runes.map((rune) => Object.freeze({ ...rune })));
    cursorRuneId = state.cursorRuneId;
    health = state.health;
    timer = state.timer;
    rotation = state.rotation;
    lastOutcome = state.lastOutcome;
    destroyed = state.destroyed;
    if (phase !== "playing" || destroyed) completion.sealWithoutDelivery();
  };

  const selectRune = (runeId: string): RuneForgeChamberActionResult => {
    const before = snapshot();
    const rune = runes.find((candidate) => candidate.id === runeId);
    if (destroyed || phase !== "playing" || !rune || rune.selected) {
      return inactiveAction(before);
    }

    const correct = rune.id === before.nextRuneId;
    accountant.recordAttempt({ correct });
    lastOutcome = correct ? "correct" : "incorrect";
    if (!correct) {
      health = Math.max(0, health - RUNE_FORGE_CHAMBER_WRONG_RUNE_DAMAGE);
      if (health === 0) {
        return terminalAction(false, false, false, enterDefeat());
      }
      return createActionResult(snapshot(), {
        accepted: true,
        correct: false,
        progressed: false,
        sentenceCompleted: false,
        terminal: false,
        completed: false,
      });
    }

    accountant.addScore(100);
    runes = Object.freeze(runes.map((candidate) => candidate.id === rune.id
      ? Object.freeze({ ...candidate, selected: true })
      : candidate));
    targetIndex += 1;
    wordIndex += 1;
    const sentenceCompleted = wordIndex >= currentRound().words.length;
    if (sentenceCompleted) {
      sentenceIndex += 1;
      if (sentenceIndex >= rounds.length) {
        return terminalAction(true, true, true, enterVictory());
      }
      wordIndex = 0;
      runes = createRoundRunes(sentenceIndex, rounds[sentenceIndex]!.words, seed);
      cursorRuneId = runes[0]?.id;
      timer = RUNE_FORGE_CHAMBER_SENTENCE_TIMER_MS;
      rotation = 0;
    } else {
      cursorRuneId = runes.find((candidate) => !candidate.selected)?.id;
    }
    return createActionResult(snapshot(), {
      accepted: true,
      correct: true,
      progressed: true,
      sentenceCompleted,
      terminal: false,
      completed: false,
    });
  };

  const applyHazard = (): RuneForgeChamberActionResult => {
    const before = snapshot();
    if (destroyed || phase !== "playing") {
      return inactiveAction(before);
    }
    health = Math.max(0, health - RUNE_FORGE_CHAMBER_WRONG_RUNE_DAMAGE);
    lastOutcome = "incorrect";
    if (health === 0) return terminalAction(false, false, false, enterDefeat());
    return createActionResult(snapshot(), {
      accepted: true,
      correct: false,
      progressed: false,
      sentenceCompleted: false,
      terminal: false,
      completed: false,
    });
  };

  const demonstrateIncorrectChoice = (): RuneForgeChamberActionResult => {
    const before = snapshot();
    if (destroyed || phase !== "playing") {
      return inactiveAction(before);
    }
    accountant.recordAttempt({ correct: false });
    lastOutcome = "incorrect";
    health = Math.max(0, health - RUNE_FORGE_CHAMBER_WRONG_RUNE_DAMAGE);
    if (health === 0) return terminalAction(false, false, false, enterDefeat());
    return createActionResult(snapshot(), {
      accepted: true,
      correct: false,
      progressed: false,
      sentenceCompleted: false,
      terminal: false,
      completed: false,
    });
  };

  const tick = (deltaMs: number): RuneForgeChamberSnapshot => {
    if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new Error("Rune Forge Chamber tick requires a nonnegative delta");
    if (destroyed || phase !== "playing") return snapshot();
    const boundedDelta = Math.min(deltaMs, timer);
    timer = Math.max(0, timer - boundedDelta);
    rotation += boundedDelta * RUNE_FORGE_CHAMBER_ROTATION_SPEED;
    runes = Object.freeze(runes.map((rune) => Object.freeze({
      ...rune,
      angle: rune.angle + boundedDelta * RUNE_FORGE_CHAMBER_ROTATION_SPEED,
    })));
    if (timer === 0) enterDefeat();
    return snapshot();
  };

  const moveCursor = (action: InputActionId): RuneForgeChamberSnapshot => {
    if (destroyed || phase !== "playing") return snapshot();
    const selectable = runes.filter((rune) => !rune.selected);
    if (selectable.length === 0 || action === "confirm"
      || (action !== "move-left" && action !== "move-right" && action !== "move-up" && action !== "move-down")) {
      return snapshot();
    }
    const currentIndex = Math.max(0, selectable.findIndex((rune) => rune.id === cursorRuneId));
    const direction = action === "move-left" || action === "move-up" ? -1 : 1;
    cursorRuneId = selectable[(currentIndex + direction + selectable.length) % selectable.length]!.id;
    return snapshot();
  };

  const choose = (action: InputActionId | string): RuneForgeChamberActionResult => {
    const before = snapshot();
    if (action === "confirm") return selectRune(before.cursorRuneId ?? "");
    if (action === "move-left" || action === "move-right" || action === "move-up" || action === "move-down") {
      if (destroyed || phase !== "playing") {
        return inactiveAction(before);
      }
      const after = moveCursor(action);
      return createActionResult(after, {
        accepted: true,
        correct: false,
        progressed: false,
        sentenceCompleted: false,
        terminal: false,
        completed: false,
      });
    }
    return selectRune(action);
  };

  return Object.freeze({
    snapshot,
    selectRune,
    choose,
    moveCursor,
    tick,
    applyHazard,
    demonstrateIncorrectChoice,
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
 * Calculates responsive positions for a set of orbiting runes.
 * @param runes Orbiting runes with deterministic absolute angles.
 * @param sceneWidth Current scene width.
 * @param sceneHeight Current scene height.
 * @returns Immutable rune points on one responsive orbit.
 */
export function getRuneForgeChamberRunePoints(
  runes: readonly RuneForgeChamberRune[],
  sceneWidth: number,
  sceneHeight: number,
): readonly RuneForgeChamberRunePoint[] {
  if (runes.length === 0) return Object.freeze([]);
  const centerX = sceneWidth / 2;
  const centerY = sceneHeight * 0.52;
  const orbitRadius = Math.min(sceneWidth * 0.36, sceneHeight * 0.38, 220);
  const runeRadius = Math.max(28, Math.min(48, Math.min(sceneWidth, sceneHeight) * 0.085));
  return Object.freeze(runes.map((rune) => Object.freeze({
    id: rune.id,
    x: centerX + Math.cos(rune.angle) * orbitRadius * (rune.orbitRadius / RUNE_FORGE_CHAMBER_ORBIT_RADIUS),
    y: centerY + Math.sin(rune.angle) * orbitRadius * (rune.orbitRadius / RUNE_FORGE_CHAMBER_ORBIT_RADIUS),
    radius: runeRadius,
  })));
}

/**
 * Finds the nearest rune under a pointer release.
 * @param pointerX Scene-space pointer horizontal coordinate.
 * @param pointerY Scene-space pointer vertical coordinate.
 * @param runes Visible orbiting runes.
 * @param sceneWidth Current scene width.
 * @param sceneHeight Current scene height.
 * @returns The selected rune identity, or undefined outside the hit regions.
 */
export function chooseRuneForgeChamberRuneFromPointer(
  pointerX: number,
  pointerY: number,
  runes: readonly RuneForgeChamberRune[],
  sceneWidth: number,
  sceneHeight: number,
): string | undefined {
  const points = getRuneForgeChamberRunePoints(runes, sceneWidth, sceneHeight);
  let nearest: RuneForgeChamberRunePoint | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const point of points) {
    const distance = Math.hypot(pointerX - point.x, pointerY - point.y);
    if (distance < nearestDistance) {
      nearest = point;
      nearestDistance = distance;
    }
  }
  return nearest && nearestDistance <= Math.max(44, nearest.radius) ? nearest.id : undefined;
}

function createScene(context: RuneForgeChamberSceneContext): Readonly<Record<string, unknown>> {
  let resources: SceneResources | undefined;
  let runeLabels: PhaserTextLike[] = [];
  let runeSignature = "";
  let composition = context.composition;
  let animationMs = 0;
  let previousKeys = new Set<string>();
  let cleaned = false;
  const normalize = createInputActionNormalizer({
    keyboard: RUNE_FORGE_CHAMBER_KEYBOARD_BINDINGS,
    pointerTap: { action: "confirm" },
  });
  const frameScheduler = createBoundedFrameScheduler((deltaMs) => {
    animationMs = (animationMs + deltaMs) % 4000;
    if (context.sessionMode === "playing") context.controller.tick(deltaMs);
  });

  const dimensions = (scene: PhaserSceneLike): { width: number; height: number } => ({
    width: scene.scale?.width ?? RUNE_FORGE_CHAMBER_CANVAS.width,
    height: scene.scale?.height ?? RUNE_FORGE_CHAMBER_CANVAS.height,
  });

  const pointerInScene = (
    scene: PhaserSceneLike,
    pointerX: number,
    pointerY: number,
    width: number,
    height: number,
  ): Readonly<{ x: number; y: number }> => {
    const rect = scene.game?.canvas?.getBoundingClientRect?.();
    if (!rect || rect.width <= 0 || rect.height <= 0) return { x: pointerX, y: pointerY };
    return {
      x: (pointerX - rect.left) * (width / rect.width),
      y: (pointerY - rect.top) * (height / rect.height),
    };
  };

  const syncRuneLabels = (scene: PhaserSceneLike, state: RuneForgeChamberSnapshot): void => {
    if (!scene.add) return;
    const nextSignature = state.runes.map((rune) => `${rune.id}:${rune.word}`).join("|");
    if (nextSignature === runeSignature) return;
    for (const label of runeLabels) label.destroy();
    runeSignature = nextSignature;
    runeLabels = state.runes.map((rune) => scene.add!.text(0, 0, rune.word, {
      fontFamily: "Arial",
      color: "#f8fbff",
      fontSize: "18px",
      align: "center",
    }));
  };

  const updateView = (scene: PhaserSceneLike): void => {
    if (!resources || !scene.add) return;
    const { width, height } = dimensions(scene);
    const state = context.controller.snapshot();
    const points = getRuneForgeChamberRunePoints(state.runes, width, height);
    const pulse = Math.sin(animationMs / 4000 * TAU) * 3;
    syncRuneLabels(scene, state);

    resources.graphics.clear();
    if (!resources.art.ground("world:ground", width, height)) resources.graphics.fillStyle(0x0b1025, 1).fillRect(0, 0, width, height);
    resources.graphics.fillStyle(0x20204a, 0.96).fillRoundedRect(width * 0.06, height * 0.16, width * 0.88, height * 0.68, 28);
    resources.graphics.lineStyle(3, 0x8b7cff, 0.7).strokeCircle(width / 2, height * 0.52, Math.min(width * 0.36, height * 0.38, 220));
    resources.graphics.fillStyle(0x6d5dfc, 0.95).fillCircle(width / 2, height * 0.52, Math.min(68, width * 0.13));
    resources.graphics.fillStyle(0xf5e7a7, 0.9).fillCircle(width / 2, height * 0.52 + pulse, Math.min(36, width * 0.07));
    // The smith works at the forge, and the forge position follows the layout.
    resources.art.place("player", "player:idle", {
      x: width / 2,
      y: height * 0.52 + pulse,
      width: Math.min(56, width * 0.11),
      depth: 8,
    });
    resources.art.sweep();
    for (const [index, point] of points.entries()) {
      const rune = state.runes[index]!;
      const isCursor = rune.id === state.cursorRuneId;
      resources.graphics.fillStyle(rune.selected ? 0x34d399 : rune.id === state.nextRuneId ? 0xf59e0b : 0x7c6cff, rune.selected ? 0.46 : 0.9)
        .fillCircle(point.x, point.y, point.radius);
      resources.graphics.lineStyle(isCursor ? 5 : 2, isCursor ? 0xffffff : 0xd8d5ff, isCursor ? 1 : 0.72)
        .strokeCircle(point.x, point.y, point.radius + (isCursor ? 5 : 0));
      runeLabels[index]?.setPosition(point.x - point.radius, point.y - 10);
    }
    resources.title.setText("RUNE FORGE CHAMBER").setPosition(28, 20);
    resources.prompt.setText(`Forge the next word for: ${state.prompt}`).setPosition(28, 61);
    resources.progress.setText(
      `${composition?.profile === "compact" ? "Compact forge" : "Orbiting forge"}  •  Sentence ${Math.min(state.sentenceIndex + 1, context.totalSentences)} of ${context.totalSentences}  •  Word ${Math.min(state.wordIndex + 1, state.words.length)}  •  Health ${state.health}  •  Time ${Math.ceil(state.timer / 1000)}s`,
    ).setPosition(28, 99);
    resources.feedback.setText(
      state.phase === "victory"
        ? "Every sentence rune is forged!"
        : state.phase === "defeat"
          ? "The forge has gone dark."
          : state.lastOutcome === "incorrect"
            ? "That rune strains the forge. Try the current word again."
            : "Select the orbiting words in sentence order.",
    ).setPosition(28, height - 68);
    resources.instructions.setText("Keyboard: WASD / arrows move cursor • Enter / Space selects • Tap or click a rune")
      .setPosition(28, height - 36);
  };

  const selectFromInput = (runeId: string | undefined): void => {
    if (!runeId) return;
    const result = context.controller.selectRune(runeId);
    if (!result.accepted) return;
    context.diagnostic({
      level: "info",
      code: result.terminal ? "RUNE_FORGE_CHAMBER_TERMINAL" : "RUNE_FORGE_CHAMBER_SELECTION",
      message: result.terminal ? "Rune Forge Chamber reached a terminal state." : "Rune Forge Chamber processed a rune.",
      details: { correct: result.correct, sentenceIndex: result.snapshot.sentenceIndex, wordIndex: result.snapshot.wordIndex },
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
    for (const label of runeLabels) label.destroy();
    runeLabels = [];
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
    if (!this.add) throw new Error("Rune Forge Chamber requires Phaser display services");
    const style = { fontFamily: "Arial", color: "#f8fbff", fontSize: "19px" };
    resources = {
      graphics: this.add.graphics(),
      art: createActorSpriteLayer(this, context.edition),
      title: this.add.text(28, 20, "RUNE FORGE CHAMBER", { ...style, fontSize: "30px", fontStyle: "bold" }),
      prompt: this.add.text(28, 61, "", { ...style, fontSize: "24px", wordWrap: { width: 860 } }),
      progress: this.add.text(28, 99, "", { ...style, fontSize: "16px", color: "#c4c8ff" }),
      feedback: this.add.text(28, 0, "", { ...style, fontSize: "17px", color: "#f9d477" }),
      instructions: this.add.text(28, 0, "", { ...style, fontSize: "15px", color: "#cbd5e1" }),
    };
    this.events?.once("shutdown", cleanup);
    this.events?.once("destroy", cleanup);
    updateView(this);
  };

  const update = function (this: PhaserSceneLike, _time = 0, delta = 0): void {
    if (!resources || cleaned) return;
    frameScheduler.tick(delta);
    if (context.sessionMode === "playing") {
      const input = context.inputController.snapshot();
      const pressed = input.pressed ?? input.keys.filter((key) => !previousKeys.has(key));
      previousKeys = new Set(input.keys);
      for (const code of pressed) {
        const action = normalize({ modality: "keyboard", code })[0]?.action;
        if (!action) continue;
        context.controller.choose(action);
      }
      if (input.pointer.released && !input.pointer.cancelled) {
        const action = normalize({ modality: "pointer", phase: "up", x: input.pointer.x, y: input.pointer.y })[0]?.action;
        if (action === "confirm") {
          const { width, height } = dimensions(this);
          const pointer = pointerInScene(this, input.pointer.x, input.pointer.y, width, height);
          selectFromInput(chooseRuneForgeChamberRuneFromPointer(
            pointer.x,
            pointer.y,
            context.controller.snapshot().runes,
            width,
            height,
          ));
        }
      }
    }
    updateView(this);
  };

  return {
    key: RUNE_FORGE_CHAMBER_ID,
    preload,
    create,
    update,
    extend: {
      apkCaptureResponsiveState: (): RuneForgeChamberSnapshot => context.controller.capture(),
      apkRestoreResponsiveState: (state: unknown): void => {
        if (typeof state !== "object" || state === null) throw new Error("Rune Forge Chamber responsive state is invalid");
        context.controller.restore(state as RuneForgeChamberSnapshot);
      },
      apkRecompose: (nextComposition: RuneForgeChamberSceneContext["composition"]): void => {
        composition = nextComposition;
      },
    },
  };
}

/**
 * Creates the runtime-compatible Rune Forge Chamber cartridge.
 * @returns A sentence-mode cartridge with an orbiting-rune scene.
 */
export function createRuneForgeChamberCartridge(): StandardExperienceCartridge {
  let activeController: RuneForgeChamberController | undefined;
  const standardExperience = createCartridgeStandardExperience({
    id: RUNE_FORGE_CHAMBER_ID,
    title: "Rune Forge Chamber",
    description: "Forge ordered sentence words as orbiting runes inside a living chamber.",
    inputMode: "sentence",
    objective: "Forge every sentence by selecting each orbiting word in order.",
    mechanicInstruction: "Move the cursor or tap an orbiting rune to select the next sentence word.",
    keyboardKeys: ["WASD", "Arrow keys", "Enter", "Space"],
    executeTutorialAction: (actionId) => {
      const controller = activeController;
      if (!controller) return;
      const state = controller.snapshot();
      const runeId = actionId === "action:select-correct"
        ? state.nextRuneId
        : state.runes.find((rune) => rune.id !== state.nextRuneId)?.id;
      if (runeId) controller.selectRune(runeId);
      else if (actionId === "action:select-incorrect") controller.demonstrateIncorrectChoice();
    },
  });

  return {
    manifest: {
      id: RUNE_FORGE_CHAMBER_ID,
      title: "Rune Forge Chamber",
      description: "Forge ordered sentence words as orbiting runes inside a living chamber.",
      runtimeApiVersion: "1.0.0",
      inputMode: "sentence",
      requiredAssetBindings: ["rune-forge-chamber/orbiting-sigils"],
      capabilities: [
        "capability:bounded-frame-delta",
        "capability:input-action-normalization",
        "capability:language-target-progression",
        "capability:nonempty-content-precondition",
        "capability:result-accounting",
        "capability:single-completion-emission",
        "capability:orbiting-rune-selection",
      ],
    },
    standardExperience,
    createGameConfig(context: CartridgeGameConfigContext): Readonly<Record<string, unknown>> {
      const input = sentenceInputSchema.parse(context.input);
      const sessionMode = context.sessionMode ?? "playing";
      const controller = createRuneForgeChamberController(
        input,
        sessionMode === "playing"
          ? (result) => context.complete(result, controller.snapshot().phase === "victory" ? "victory" : "defeat")
          : () => undefined,
        { seed: context.seed },
      );
      activeController = controller;
      context.diagnostic({
        level: "debug",
        code: "RUNE_FORGE_CHAMBER_READY",
        message: "Rune Forge Chamber orbiting runes are ready.",
        details: { editionId: context.edition.id, sentenceCount: input.length },
      });
      return {
        width: RUNE_FORGE_CHAMBER_CANVAS.width,
        height: RUNE_FORGE_CHAMBER_CANVAS.height,
        render: { antialias: true, pixelArt: false },
        scene: createScene({
          controller,
          edition: context.edition,
          inputController: context.inputController,
          composition: context.composition,
          diagnostic: context.diagnostic,
          sessionMode,
          totalSentences: input.length,
        }),
      };
    },
  };
}
