import {
  gameResultsSchema,
  vocabularyInputSchema,
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

/** Stable public identifier for the Alchemist's Synthesis cartridge. */
export const ALCHEMISTS_SYNTHESIS_ID = "alchemists-synthesis" as const;

/** Legacy compatibility value; active sessions use one target per input item. */
export const ALCHEMISTS_SYNTHESIS_ROUND_LIMIT = 7;

/** Total gameplay time before the alchemy session expires. */
export const ALCHEMISTS_SYNTHESIS_TIME_LIMIT_MS = 60_000;

/** Keyboard bindings for moving the cursor and confirming an alchemy choice. */
export const ALCHEMISTS_SYNTHESIS_KEYBOARD_BINDINGS: Readonly<Record<string, InputActionId>> = Object.freeze({
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

const ALCHEMISTS_SYNTHESIS_ACTIONS = Object.freeze([
  "move-left",
  "move-right",
  "move-up",
  "move-down",
  "confirm",
] as const);

/** One deterministic term option shown for the active translation prompt. */
export interface AlchemistsSynthesisOption {
  /** Stable option identity within one round. */
  readonly id: string;
  /** Source-language term displayed on the option. */
  readonly term: string;
}

/** Deterministic setup used to reproduce one Alchemist's Synthesis session. */
export interface AlchemistsSynthesisOptions {
  /** Seed used to derive each round's option order. */
  readonly seed?: number;
}

/** Active or terminal state of an Alchemist's Synthesis session. */
export type AlchemistsSynthesisPhase = "playing" | "victory" | "defeat";

/** Result of the latest accepted answer. */
export type AlchemistsSynthesisOutcome = "correct" | "incorrect";

/** Immutable state exposed by the alchemy controller and responsive runtime. */
export interface AlchemistsSynthesisSnapshot {
  /** Current session phase. */
  readonly phase: AlchemistsSynthesisPhase;
  /** Zero-based round currently shown, or the round count after final play. */
  readonly roundIndex: number;
  /** One-based display round. */
  readonly round: number;
  /** Frozen number of rounds available in this session. */
  readonly roundCount: number;
  /** Alias for the frozen round count used by the catalog contract. */
  readonly maxRounds: number;
  /** Alias for the current zero-based round. */
  readonly targetIndex: number;
  /** Alias for the frozen round count. */
  readonly targetCount: number;
  /** Translation shown as the learning prompt. */
  readonly prompt: string;
  /** Deterministically ordered source-language term options. */
  readonly options: readonly AlchemistsSynthesisOption[];
  /** Stable identity of the correct term option. */
  readonly correctOptionId: string;
  /** Stable choice identity accepted by the shared choose contract. */
  readonly correctAction: string;
  /** Correct source-language term, retained for result and tutorial adapters. */
  readonly answer: string;
  /** Cursor index within the visible options. */
  readonly selectedIndex: number;
  /** Stable identity of the selected option. */
  readonly selectedOptionId: string;
  /** Semantic keyboard actions accepted by the scene. */
  readonly availableActions: readonly InputActionId[];
  /** Current game score. */
  readonly score: number;
  /** Remaining lives exposed by the shared cartridge snapshot. */
  readonly lives: number;
  /** Current energy exposed by the shared cartridge snapshot. */
  readonly energy: number;
  /** Number of correct rounds. */
  readonly correctAnswers: number;
  /** Number of answered rounds. */
  readonly totalAttempts: number;
  /** Outcome of the latest answered round. */
  readonly lastOutcome: AlchemistsSynthesisOutcome | undefined;
  /** Elapsed gameplay time. */
  readonly gameTime: number;
  /** Alias for elapsed gameplay time. */
  readonly timeElapsedMs: number;
  /** Remaining gameplay time. */
  readonly timeRemainingMs: number;
  /** Whether the timer caused defeat. */
  readonly timerExpired: boolean;
  /** Whether cleanup sealed the session. */
  readonly destroyed: boolean;
}

/** Result returned after selecting, moving, or confirming an option. */
export interface AlchemistsSynthesisActionResult {
  /** Whether the input changed the active session. */
  readonly accepted: boolean;
  /** Whether an answered option matched the prompt. */
  readonly correct: boolean;
  /** Whether the input advanced to another round. */
  readonly progressed: boolean;
  /** Whether this input produced a terminal result. */
  readonly terminal: boolean;
  /** Alias for terminal retained by cartridge hosts. */
  readonly completed: boolean;
  /** First strict result produced by this input, when terminal. */
  readonly result?: GameResults;
  /** State after the input. */
  readonly snapshot: AlchemistsSynthesisSnapshot;
}

/** Result returned after advancing the gameplay timer. */
export interface AlchemistsSynthesisTimerResult {
  /** Whether time advanced or expired the session. */
  readonly accepted: boolean;
  /** Whether this timer update produced a terminal result. */
  readonly terminal: boolean;
  /** First strict result produced by this timer update, when terminal. */
  readonly result?: GameResults;
  /** State after the timer update. */
  readonly snapshot: AlchemistsSynthesisSnapshot;
}

/** Transport-independent alchemy rules and lifecycle controls. */
export interface AlchemistsSynthesisController {
  /** Returns the immutable active state. */
  snapshot(): AlchemistsSynthesisSnapshot;
  /** Selects an option by identity or visible term and answers the round. */
  selectOption(optionId: string): AlchemistsSynthesisActionResult;
  /** Applies a semantic keyboard action or selects an option identity. */
  choose(choice: string): AlchemistsSynthesisActionResult;
  /** Moves the keyboard cursor without answering the round. */
  moveCursor(action: InputActionId): AlchemistsSynthesisActionResult;
  /** Confirms the currently selected option. */
  confirm(): AlchemistsSynthesisActionResult;
  /** Advances gameplay time and defeats the session when the timer expires. */
  advanceTime(deltaMs: number): AlchemistsSynthesisTimerResult;
  /** Alias for advancing gameplay time from a frame loop or test. */
  tick(deltaMs: number): AlchemistsSynthesisTimerResult;
  /** Keeps the shared cartridge controller surface without adding a non-legacy hazard. */
  applyHazard(): AlchemistsSynthesisActionResult;
  /** Captures state for responsive recomposition. */
  capture(): AlchemistsSynthesisSnapshot;
  /** Restores validated state captured before responsive recomposition. */
  restore(snapshot: AlchemistsSynthesisSnapshot): void;
  /** Seals the session and releases future result delivery. */
  destroy(): void;
}

interface AlchemistsSynthesisRound {
  readonly prompt: string;
  readonly correctTerm: string;
  readonly options: readonly AlchemistsSynthesisOption[];
  readonly correctOptionId: string;
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
  setFontSize?(value: number): this;
  setOrigin?(x: number, y?: number): this;
  setWordWrapWidth?(width: number, useAdvancedWrap?: boolean): this;
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

interface AlchemistsSynthesisSceneContext {
  readonly edition: RuntimeEdition;
  readonly controller: AlchemistsSynthesisController;
  readonly inputController: APKInputController;
  readonly composition: CartridgeGameConfigContext["composition"];
  readonly sessionMode: NonNullable<CartridgeGameConfigContext["sessionMode"]>;
  readonly diagnostic: CartridgeGameConfigContext["diagnostic"];
}

interface SceneResources {
  readonly art: ActorSpriteLayer;
  readonly graphics: PhaserGraphicsLike;
  readonly title: PhaserTextLike;
  readonly prompt: PhaserTextLike;
  readonly progress: PhaserTextLike;
  readonly feedback: PhaserTextLike;
  readonly instructions: PhaserTextLike;
  readonly choices: readonly PhaserTextLike[];
}

interface OptionRect {
  readonly optionId: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function dimensions(scene: PhaserSceneLike): { width: number; height: number } {
  return {
    width: scene.scale?.width ?? 960,
    height: scene.scale?.height ?? 540,
  };
}

function normalizeSeed(seed: number | undefined): number {
  if (seed === undefined) return 0;
  if (!Number.isFinite(seed)) throw new Error("Alchemist's Synthesis seed must be finite");
  return Math.abs(Math.trunc(seed)) % 2_147_483_647;
}

function seededRandom(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = (state * 48_271) % 2_147_483_647;
    return (state - 1) / 2_147_483_646;
  };
}

function shuffle<T>(items: readonly T[], seed: number): T[] {
  const shuffled = [...items];
  const random = seededRandom(seed);
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!];
  }
  return shuffled;
}

function buildRounds(input: unknown, seed: number): readonly AlchemistsSynthesisRound[] {
  const parsed = vocabularyInputSchema.parse(input);
  const content = validateNonEmptyContent(parsed, "vocabulary");
  const roundItems = content.items;

  return Object.freeze(roundItems.map((item, roundIndex) => {
    const roundSeed = (seed + (roundIndex + 1) * 1_000_003) % 2_147_483_647;
    const candidates = [...new Set(content.items.map((candidate) => candidate.term))]
      .filter((term) => term !== item.term);
    const orderedTerms = shuffle(
      [item.term, ...shuffle(candidates, roundSeed).slice(0, 3)],
      (roundSeed + 7_919) % 2_147_483_647,
    );
    const options = Object.freeze(orderedTerms.map((term, optionIndex) => Object.freeze({
      id: `round:${roundIndex}:option:${optionIndex}`,
      term,
    })));
    const correctOption = options.find((option) => option.term === item.term);
    if (!correctOption) throw new Error("Alchemist's Synthesis could not create a correct option");

    return Object.freeze({
      prompt: item.translation,
      correctTerm: item.term,
      options,
      correctOptionId: correctOption.id,
    });
  }));
}

function createActionResult(
  snapshot: AlchemistsSynthesisSnapshot,
  values: Omit<AlchemistsSynthesisActionResult, "snapshot">,
): AlchemistsSynthesisActionResult {
  return Object.freeze({ ...values, snapshot });
}

function createTimerResult(
  snapshot: AlchemistsSynthesisSnapshot,
  values: Omit<AlchemistsSynthesisTimerResult, "snapshot">,
): AlchemistsSynthesisTimerResult {
  return Object.freeze({ ...values, snapshot });
}

function assertDelta(deltaMs: number): void {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new Error("Alchemist's Synthesis time delta must be nonnegative and finite");
  }
}

function optionRects(
  options: readonly AlchemistsSynthesisOption[],
  width: number,
  height: number,
): readonly OptionRect[] {
  if (options.length === 0) return Object.freeze([]);
  const columns = Math.min(2, options.length);
  const gap = Math.min(18, width * 0.04);
  const horizontalPadding = Math.min(64, width * 0.08);
  const optionWidth = (width - horizontalPadding * 2 - gap * (columns - 1)) / columns;
  const optionHeight = Math.min(86, Math.max(58, height * 0.12));
  const top = height * 0.52;

  return Object.freeze(options.map((option, index) => Object.freeze({
    optionId: option.id,
    x: horizontalPadding + (index % columns) * (optionWidth + gap),
    y: top + Math.floor(index / columns) * (optionHeight + gap),
    width: optionWidth,
    height: optionHeight,
  })));
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
    x: (clientX - rect.left) * (width / rect.width),
    y: (clientY - rect.top) * (height / rect.height),
  };
}

function optionAtPointer(
  options: readonly AlchemistsSynthesisOption[],
  x: number,
  y: number,
  width: number,
  height: number,
): string | undefined {
  const hit = optionRects(options, width, height).find((rect) => (
    x >= rect.x
    && x <= rect.x + rect.width
    && y >= rect.y
    && y <= rect.y + rect.height
  ));
  return hit?.optionId;
}

/**
 * Creates the finite timed alchemy controller for one vocabulary session.
 * @param input Strict vocabulary content for the session.
 * @param deliver Callback for the first terminal result.
 * @param options Deterministic session setup, including the round seed.
 * @returns A controller for deterministic multiple-choice alchemy.
 * @throws When input is empty, blank, outside the vocabulary contract, or the seed is invalid.
 */
export function createAlchemistsSynthesisController(
  input: unknown,
  deliver: CompletionDelivery<GameResults>,
  options: AlchemistsSynthesisOptions | number = {},
): AlchemistsSynthesisController {
  const seed = normalizeSeed(typeof options === "number" ? options : options.seed);
  const rounds = buildRounds(input, seed);
  let accountant = createResultAccountant();
  const completion = createCompletionLatch(deliver);
  let terminalResultValue: GameResults | undefined;
  let phase: AlchemistsSynthesisPhase = "playing";
  let roundIndex = 0;
  let selectedIndex = 0;
  let gameTime = 0;
  let timerExpired = false;
  let lastOutcome: AlchemistsSynthesisOutcome | undefined;
  let destroyed = false;

  const currentRound = (): AlchemistsSynthesisRound => rounds[Math.min(roundIndex, rounds.length - 1)]!;
  const currentOptions = (): readonly AlchemistsSynthesisOption[] => currentRound().options;

  const snapshot = (): AlchemistsSynthesisSnapshot => {
    const round = currentRound();
    const currentOption = round.options[Math.min(selectedIndex, round.options.length - 1)]!;
    return Object.freeze({
      phase,
      roundIndex,
      round: Math.min(roundIndex + 1, rounds.length),
      roundCount: rounds.length,
      maxRounds: rounds.length,
      targetIndex: roundIndex,
      targetCount: rounds.length,
      prompt: round.prompt,
      options: round.options,
      correctOptionId: round.correctOptionId,
      correctAction: round.correctOptionId,
      answer: round.correctTerm,
      selectedIndex: Math.min(selectedIndex, round.options.length - 1),
      selectedOptionId: currentOption.id,
      availableActions: ALCHEMISTS_SYNTHESIS_ACTIONS,
      score: accountant.score,
      lives: 1,
      energy: 0,
      correctAnswers: accountant.correctAnswers,
      totalAttempts: accountant.totalAttempts,
      lastOutcome,
      gameTime,
      timeElapsedMs: gameTime,
      timeRemainingMs: Math.max(0, ALCHEMISTS_SYNTHESIS_TIME_LIMIT_MS - gameTime),
      timerExpired,
      destroyed,
    });
  };

  const result = (): GameResults => gameResultsSchema.parse(
    finalizeResult(accountant, { xpPerCorrect: 20, xpPerAccuracyPoint: 10 }),
  );

  const finish = (nextPhase: Exclude<AlchemistsSynthesisPhase, "playing">): GameResults => {
    if (terminalResultValue !== undefined) return terminalResultValue;
    phase = nextPhase;
    const terminalResult = result();
    terminalResultValue = terminalResult;
    completion.complete(terminalResult);
    return terminalResult;
  };

  const inactiveAction = (): AlchemistsSynthesisActionResult => createActionResult(snapshot(), {
    accepted: false,
    correct: false,
    progressed: false,
    terminal: phase !== "playing",
    completed: phase !== "playing",
    ...(terminalResultValue === undefined ? {} : { result: terminalResultValue }),
  });

  const selectOption = (optionId: string): AlchemistsSynthesisActionResult => {
    const before = snapshot();
    if (destroyed || phase !== "playing") return inactiveAction();
    const optionIndex = currentOptions().findIndex((option) => option.id === optionId || option.term === optionId);
    if (optionIndex < 0) return inactiveAction();

    selectedIndex = optionIndex;
    const correct = currentOptions()[optionIndex]!.id === before.correctOptionId;
    accountant.recordAttempt({ correct });
    lastOutcome = correct ? "correct" : "incorrect";
    if (!correct) {
      return createActionResult(snapshot(), {
        accepted: true,
        correct: false,
        progressed: false,
        terminal: false,
        completed: false,
      });
    }

    accountant.addScore(100);
    roundIndex += 1;
    selectedIndex = 0;

    if (roundIndex < rounds.length) {
      return createActionResult(snapshot(), {
        accepted: true,
        correct,
        progressed: true,
        terminal: false,
        completed: false,
      });
    }

    const terminalResult = finish("victory");
    return createActionResult(snapshot(), {
      accepted: true,
      correct,
      progressed: true,
      terminal: true,
      completed: true,
      result: terminalResult,
    });
  };

  const moveCursor = (action: InputActionId): AlchemistsSynthesisActionResult => {
    const before = snapshot();
    if (destroyed || phase !== "playing") return inactiveAction();
    if (!["move-left", "move-right", "move-up", "move-down"].includes(action)) return inactiveAction();
    const optionCount = currentOptions().length;
    if (action === "move-left") selectedIndex = (selectedIndex + optionCount - 1) % optionCount;
    if (action === "move-right") selectedIndex = (selectedIndex + 1) % optionCount;
    if (action === "move-up") selectedIndex = Math.max(0, selectedIndex - 2);
    if (action === "move-down") selectedIndex = Math.min(optionCount - 1, selectedIndex + 2);
    return createActionResult(snapshot(), {
      accepted: before.selectedIndex !== snapshot().selectedIndex,
      correct: false,
      progressed: false,
      terminal: false,
      completed: false,
    });
  };

  const choose = (choice: string): AlchemistsSynthesisActionResult => {
    if (choice === "confirm") return selectOption(snapshot().selectedOptionId);
    if (choice === "move-left" || choice === "move-right" || choice === "move-up" || choice === "move-down") {
      return moveCursor(choice);
    }
    return selectOption(choice);
  };

  const advanceTime = (deltaMs: number): AlchemistsSynthesisTimerResult => {
    assertDelta(deltaMs);
    if (destroyed || phase !== "playing" || deltaMs === 0) {
      return createTimerResult(snapshot(), { accepted: false, terminal: false });
    }
    gameTime += deltaMs;
    if (gameTime < ALCHEMISTS_SYNTHESIS_TIME_LIMIT_MS) {
      return createTimerResult(snapshot(), { accepted: true, terminal: false });
    }

    gameTime = Math.max(gameTime, ALCHEMISTS_SYNTHESIS_TIME_LIMIT_MS);
    timerExpired = true;
    const terminalResult = finish("defeat");
    return createTimerResult(snapshot(), { accepted: true, terminal: true, result: terminalResult });
  };

  const validateRestore = (state: AlchemistsSynthesisSnapshot): void => {
    if (state === null || typeof state !== "object") throw new Error("Alchemist's Synthesis state must be an object");
    if (!(state.phase === "playing" || state.phase === "victory" || state.phase === "defeat")) {
      throw new Error("Alchemist's Synthesis state phase is invalid");
    }
    if (state.roundCount !== rounds.length || state.targetCount !== rounds.length) {
      throw new Error("Alchemist's Synthesis state round count is invalid");
    }
    if (!Number.isInteger(state.roundIndex) || state.roundIndex < 0 || state.roundIndex > rounds.length) {
      throw new Error("Alchemist's Synthesis state round index is invalid");
    }
    if (state.targetIndex !== state.roundIndex || state.maxRounds !== rounds.length) {
      throw new Error("Alchemist's Synthesis state target aliases are invalid");
    }
    if (state.round !== Math.min(state.roundIndex + 1, rounds.length)) {
      throw new Error("Alchemist's Synthesis state display round is invalid");
    }
    if (
      !Number.isInteger(state.correctAnswers)
      || !Number.isInteger(state.totalAttempts)
      || state.correctAnswers !== state.roundIndex
      || state.totalAttempts < state.roundIndex
      || state.correctAnswers < 0
    ) {
      throw new Error("Alchemist's Synthesis state counters are invalid");
    }
    if (!Number.isInteger(state.score) || state.score !== state.correctAnswers * 100) {
      throw new Error("Alchemist's Synthesis state score is invalid");
    }
    const restoredRound = rounds[Math.min(state.roundIndex, rounds.length - 1)]!;
    if (
      state.prompt !== restoredRound.prompt
      || state.answer !== restoredRound.correctTerm
      || state.correctOptionId !== restoredRound.correctOptionId
      || state.correctAction !== restoredRound.correctOptionId
    ) {
      throw new Error("Alchemist's Synthesis state prompt is invalid");
    }
    if (!Array.isArray(state.options) || !Array.isArray(state.availableActions)) {
      throw new Error("Alchemist's Synthesis state choices are invalid");
    }
    if (!Number.isInteger(state.selectedIndex) || state.selectedIndex < 0 || state.selectedIndex >= state.options.length) {
      throw new Error("Alchemist's Synthesis state cursor is invalid");
    }
    if (state.options.length !== restoredRound.options.length || state.options.some((option, index) => {
      const current = restoredRound.options[index];
      return typeof option?.id !== "string"
        || typeof option?.term !== "string"
        || current?.id !== option.id
        || current.term !== option.term;
    })) {
      throw new Error("Alchemist's Synthesis state options are invalid");
    }
    if (
      state.availableActions.length !== ALCHEMISTS_SYNTHESIS_ACTIONS.length
      || state.availableActions.some((action, index) => action !== ALCHEMISTS_SYNTHESIS_ACTIONS[index])
    ) {
      throw new Error("Alchemist's Synthesis state actions are invalid");
    }
    if (state.selectedOptionId !== state.options[state.selectedIndex]!.id) {
      throw new Error("Alchemist's Synthesis state selection is invalid");
    }
    if (
      !Number.isFinite(state.gameTime)
      || state.gameTime < 0
      || state.gameTime !== state.timeElapsedMs
      || !Number.isFinite(state.timeRemainingMs)
    ) {
      throw new Error("Alchemist's Synthesis state timer is invalid");
    }
    if (state.timeRemainingMs !== Math.max(0, ALCHEMISTS_SYNTHESIS_TIME_LIMIT_MS - state.gameTime)) {
      throw new Error("Alchemist's Synthesis state time remaining is invalid");
    }
    if (typeof state.destroyed !== "boolean") throw new Error("Alchemist's Synthesis state destroyed flag is invalid");
    if (state.lives !== 1 || state.energy !== 0) throw new Error("Alchemist's Synthesis state resources are invalid");
    if (state.lastOutcome !== undefined && state.lastOutcome !== "correct" && state.lastOutcome !== "incorrect") {
      throw new Error("Alchemist's Synthesis state outcome is invalid");
    }
    if ((state.totalAttempts === 0) !== (state.lastOutcome === undefined)) {
      throw new Error("Alchemist's Synthesis state outcome history is invalid");
    }
    if (state.phase === "playing" && (state.roundIndex >= rounds.length || state.gameTime >= ALCHEMISTS_SYNTHESIS_TIME_LIMIT_MS)) {
      throw new Error("Alchemist's Synthesis playing state is terminal");
    }
    if (state.phase === "playing" && state.timerExpired) {
      throw new Error("Alchemist's Synthesis playing state has an expired timer");
    }
    if (state.phase === "victory" && state.roundIndex !== rounds.length) {
      throw new Error("Alchemist's Synthesis victory state has unfinished rounds");
    }
    if (state.phase === "victory" && (state.timerExpired || state.gameTime >= ALCHEMISTS_SYNTHESIS_TIME_LIMIT_MS)) {
      throw new Error("Alchemist's Synthesis victory state has an expired timer");
    }
    if (
      state.phase === "defeat"
      && (!state.timerExpired || state.gameTime < ALCHEMISTS_SYNTHESIS_TIME_LIMIT_MS || state.roundIndex >= rounds.length)
    ) {
      throw new Error("Alchemist's Synthesis defeat state is invalid");
    }
    if (state.timerExpired !== (state.phase === "defeat" && state.gameTime >= ALCHEMISTS_SYNTHESIS_TIME_LIMIT_MS)) {
      throw new Error("Alchemist's Synthesis timer state is invalid");
    }
  };

  const restore = (state: AlchemistsSynthesisSnapshot): void => {
    if (destroyed) return;
    validateRestore(state);
    accountant = createResultAccountant();
    for (let index = 0; index < state.totalAttempts; index += 1) {
      accountant.recordAttempt({ correct: index < state.correctAnswers });
    }
    accountant.addScore(state.score);
    phase = state.phase;
    roundIndex = state.roundIndex;
    selectedIndex = state.selectedIndex;
    gameTime = state.gameTime;
    timerExpired = state.timerExpired;
    lastOutcome = state.lastOutcome;
    destroyed = state.destroyed;
    if (state.phase !== "playing" || state.destroyed) completion.sealWithoutDelivery();
  };

  const applyHazard = (): AlchemistsSynthesisActionResult => {
    const before = snapshot();
    if (destroyed || phase !== "playing") return inactiveAction();
    return createActionResult(before, {
      accepted: false,
      correct: false,
      progressed: false,
      terminal: false,
      completed: false,
    });
  };

  return Object.freeze({
    snapshot,
    selectOption,
    choose,
    moveCursor,
    confirm: () => selectOption(snapshot().selectedOptionId),
    advanceTime,
    tick: advanceTime,
    applyHazard,
    capture: snapshot,
    restore,
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      completion.sealWithoutDelivery();
    },
  });
}

function createScene(context: AlchemistsSynthesisSceneContext): Readonly<Record<string, unknown>> {
  let resources: SceneResources | undefined;
  let previousKeys = new Set<string>();
  let animationMs = 0;
  let cleaned = false;
  const normalize = createInputActionNormalizer({
    keyboard: ALCHEMISTS_SYNTHESIS_KEYBOARD_BINDINGS,
    pointerTap: { action: "confirm" },
  });
  const frameScheduler = createBoundedFrameScheduler((deltaMs) => {
    animationMs = (animationMs + deltaMs) % 2000;
    if (context.sessionMode === "playing") context.controller.advanceTime(deltaMs);
  });

  const reportOutcome = (
    before: AlchemistsSynthesisSnapshot,
    outcome: AlchemistsSynthesisActionResult,
  ): void => {
    if (outcome.accepted && before.totalAttempts !== outcome.snapshot.totalAttempts) {
      context.diagnostic({
        level: "info",
        code: outcome.terminal ? "ALCHEMISTS_SYNTHESIS_TERMINAL" : "ALCHEMISTS_SYNTHESIS_ROUND",
        message: "Alchemist's Synthesis processed a term selection.",
        details: {
          cartridgeId: ALCHEMISTS_SYNTHESIS_ID,
          correct: outcome.correct,
          phase: outcome.snapshot.phase,
        },
      });
    }
  };

  const chooseFromPointer = (scene: PhaserSceneLike, clientX: number, clientY: number): void => {
    const { width, height } = dimensions(scene);
    const point = pointerInScene(scene, clientX, clientY, width, height);
    const optionId = optionAtPointer(context.controller.snapshot().options, point.x, point.y, width, height);
    if (!optionId) return;
    const before = context.controller.snapshot();
    reportOutcome(before, context.controller.selectOption(optionId));
  };

  const applyKeyboardAction = (action: InputActionId): void => {
    const before = context.controller.snapshot();
    reportOutcome(before, context.controller.choose(action));
  };

  const updateView = (scene: PhaserSceneLike): void => {
    if (!resources) return;
    const activeResources = resources;
    const { width, height } = dimensions(scene);
    const state = context.controller.snapshot();
    const rects = optionRects(state.options, width, height);
    const pulse = Math.sin(animationMs / 2000 * Math.PI * 2) * 3;
    const displayWidth = scene.game?.canvas?.getBoundingClientRect?.().width ?? width;
    const displayScale = Math.max(0.1, displayWidth / width);
    const displayFontSize = (pixels: number): number => Math.ceil(pixels / displayScale);
    const displayPosition = (pixels: number): number => Math.ceil(pixels / displayScale);

    activeResources.graphics.clear();
    activeResources.graphics.fillStyle(0x100b1f, 1).fillRect(0, 0, width, height);
    activeResources.graphics.fillStyle(0x2d1648, 0.96)
      .fillRoundedRect(width * 0.05, height * 0.08, width * 0.9, height * 0.86, 24);
    activeResources.graphics.fillStyle(0x7c3aed, 0.9).fillCircle(width / 2, height * 0.36 + pulse, Math.min(width, height) * 0.08);
    activeResources.graphics.fillStyle(0xf0b35b, 0.8).fillCircle(width / 2, height * 0.36 + pulse, Math.min(width, height) * 0.045);
    // The alchemist stands beside the cauldron, and the cauldron position follows the layout.
    activeResources.art.place("player", "player:idle", {
      x: width / 2 - Math.min(width, height) * 0.17,
      y: height * 0.36 + pulse,
      width: Math.min(width, height) * 0.14,
      depth: 8,
    });
    // prop-tower is 32x80 (1:2.5) — preserve aspect; depth 2 above the 0.96-alpha panel, below actors.
    const propTowerWidth = 36;
    activeResources.art.place("prop:0", "prop:0", {
      x: width * 0.85,
      y: height * 0.52,
      width: propTowerWidth,
      height: propTowerWidth * (80 / 32),
      originY: 1,
      depth: 2,
    });
    activeResources.art.sweep();
    rects.forEach((rect, index) => {
      const selected = index === state.selectedIndex;
      activeResources.graphics.fillStyle(selected ? 0x6d28d9 : 0x3b2660, selected ? 0.95 : 0.9)
        .fillRoundedRect(rect.x, rect.y, rect.width, rect.height, 14);
      activeResources.graphics.lineStyle(3, selected ? 0xf0b35b : 0x8b5cf6, 0.9)
        .strokeRoundedRect(rect.x, rect.y, rect.width, rect.height, 14);
      const choice = activeResources.choices[index];
      choice?.setFontSize?.(displayFontSize(16));
      choice?.setWordWrapWidth?.(Math.max(1, rect.width - 24), true);
      choice?.setOrigin?.(0.5, 0.5);
      choice?.setText(state.options[index]!.term).setPosition(rect.x + rect.width / 2, rect.y + rect.height / 2);
    });
    for (let index = rects.length; index < activeResources.choices.length; index += 1) {
      activeResources.choices[index]?.setText("");
    }
    activeResources.title.setText("").setPosition(24, 18);
    activeResources.prompt.setFontSize?.(displayFontSize(26));
    activeResources.prompt.setWordWrapWidth?.(Math.max(1, width - 32), true);
    activeResources.prompt.setOrigin?.(0.5, 0);
    activeResources.prompt.setText(state.prompt).setPosition(width / 2, displayPosition(20));
    activeResources.progress.setFontSize?.(displayFontSize(15));
    activeResources.progress
      .setText(`${state.round}/${state.roundCount}  ★ ${state.score}  ${Math.ceil(state.timeRemainingMs / 1000)}s`)
      .setPosition(24, displayPosition(58));
    activeResources.feedback.setText("").setPosition(24, height * 0.89);
    activeResources.instructions.setText("").setPosition(24, height * 0.94);
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
    for (const choice of activeResources.choices) choice.destroy();
    previousKeys = new Set<string>();
  };


  const artKeys = ["player:idle", "enemy:idle", "prop:0"] as const;

  const preload = function (this: PhaserSceneLike): void {
    if (!this.load) return;
    preloadAssetBindings(
      this.load,
      context.edition,
      artKeys.filter((key) => context.edition?.bindings?.[key]),
    );
  };

  const create = function (this: PhaserSceneLike): void {
    if (!this.add) throw new Error("Alchemist's Synthesis requires Phaser display services");
    const style = { fontFamily: "Arial", color: "#ffffff", fontSize: "18px" };
    resources = {
      graphics: this.add.graphics(),
      art: createActorSpriteLayer(this, context.edition),
      title: this.add.text(0, 0, "", { ...style, fontSize: "28px", fontStyle: "bold" }),
      prompt: this.add.text(0, 0, "", { ...style, fontSize: "24px", wordWrap: { width: 860 } }),
      progress: this.add.text(0, 0, "", { ...style, fontSize: "16px", color: "#ddd6fe" }),
      feedback: this.add.text(0, 0, "", { ...style, fontSize: "17px", color: "#fde68a" }),
      instructions: this.add.text(0, 0, "", { ...style, fontSize: "14px", color: "#cbd5e1" }),
      choices: [0, 1, 2, 3].map(() => this.add!.text(0, 0, "", { ...style, fontSize: "19px" })),
    };
    this.events?.once("shutdown", cleanup);
    this.events?.once("destroy", cleanup);
    updateView(this);
  };

  const update = function (this: PhaserSceneLike, _time = 0, delta = 0): void {
    if (!resources) return;
    if (context.sessionMode === "playing") {
      frameScheduler.tick(delta);
      const input = context.inputController.snapshot();
      const pressed = input.pressed ?? input.keys.filter((key) => !previousKeys.has(key));
      previousKeys = new Set(input.keys);
      for (const code of pressed) {
        const action = normalize({ modality: "keyboard", code })[0]?.action;
        if (action) applyKeyboardAction(action);
      }
      if (input.pointer.released && !input.pointer.cancelled) {
        const pointerAction = normalize({ modality: "pointer", phase: "up", x: input.pointer.x, y: input.pointer.y })[0]?.action;
        if (pointerAction === "confirm") chooseFromPointer(this, input.pointer.x, input.pointer.y);
      }
    }
    updateView(this);
  };

  return {
    key: ALCHEMISTS_SYNTHESIS_ID,
    preload,
    create,
    update,
    extend: {
      apkCaptureResponsiveState: (): AlchemistsSynthesisSnapshot => context.controller.capture(),
      apkRestoreResponsiveState: (state: unknown): void => {
        if (typeof state !== "object" || state === null) throw new Error("Alchemist's Synthesis responsive state is invalid");
        context.controller.restore(state as AlchemistsSynthesisSnapshot);
      },
      apkRecompose: (nextComposition: AlchemistsSynthesisSceneContext["composition"]): void => {
        void nextComposition;
      },
    },
  };
}

/**
 * Creates the standard APK cartridge for Alchemist's Synthesis.
 * @returns A vocabulary-mode cartridge with a timed procedural scene.
 */
export function createAlchemistsSynthesisCartridge(): StandardExperienceCartridge {
  let activeController: AlchemistsSynthesisController | undefined;
  const standardExperience = createCartridgeStandardExperience({
    id: ALCHEMISTS_SYNTHESIS_ID,
    title: "Alchemist's Synthesis",
    description: "Select the term that matches each translation before the cauldron cools.",
    inputMode: "vocabulary",
    objective: "Synthesize each translation by selecting its matching source-language term.",
    mechanicInstruction: "Move the cursor or tap a term that matches the translation prompt.",
    keyboardKeys: ["A / D", "Arrow keys", "Enter", "Space"],
    executeTutorialAction: (actionId) => {
      const controller = activeController;
      if (!controller) return;
      const state = controller.snapshot();
      const optionId = actionId === "action:select-correct"
        ? state.correctOptionId
        : state.options.find((option) => option.id !== state.correctOptionId)?.id;
      if (optionId) controller.selectOption(optionId);
    },
  });

  return {
    manifest: {
      id: ALCHEMISTS_SYNTHESIS_ID,
      title: "Alchemist's Synthesis",
      description: "Select the term that matches each translation before the cauldron cools.",
      runtimeApiVersion: "1.0.0",
      inputMode: "vocabulary",
      requiredAssetBindings: ["alchemists-synthesis/alchemy-vessel"],
      capabilities: [
        "capability:bounded-frame-delta",
        "capability:input-action-normalization",
        "capability:nonempty-content-precondition",
        "capability:result-accounting",
        "capability:single-completion-emission",
        "capability:timed-multiple-choice",
      ],
    },
    standardExperience,
    createGameConfig(context: CartridgeGameConfigContext): Readonly<Record<string, unknown>> {
      const input = vocabularyInputSchema.parse(context.input);
      const sessionMode = context.sessionMode ?? "playing";
      const controller = createAlchemistsSynthesisController(
        input,
        sessionMode === "playing"
          ? (result) => context.complete(result, controller.snapshot().phase === "victory" ? "victory" : "defeat")
          : () => undefined,
        { seed: context.seed },
      );
      activeController = controller;
      context.diagnostic({
        level: "debug",
        code: "ALCHEMISTS_SYNTHESIS_READY",
        message: "Alchemist's Synthesis deterministic term options are ready.",
        details: {
          cartridgeId: ALCHEMISTS_SYNTHESIS_ID,
          editionId: context.edition.id,
          roundCount: controller.snapshot().roundCount,
        },
      });
      return {
        width: 960,
        height: 540,
        render: { antialias: true, pixelArt: false },
        scene: createScene({
          controller,
          edition: context.edition,
          inputController: context.inputController,
          composition: context.composition,
          sessionMode,
          diagnostic: context.diagnostic,
        }),
      };
    },
  };
}
