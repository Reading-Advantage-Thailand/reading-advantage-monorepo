import type { VocabularyItem } from "@/store/useGameStore";

/** Difficulty names exposed by the Babel Architect start screen. */
export type BabelArchitectDifficulty = "easy" | "normal" | "hard";

/** Lifecycle states for a Babel Architect run. */
export type BabelArchitectPhase = "playing" | "victory" | "defeat";

/** Configuration values that tune timing, stability, and drop pressure. */
export interface BabelArchitectDifficultyConfig {
  /** Milliseconds available before the tower contract expires. */
  timeLimitMs: number;
  /** Visual fall speed used by the Phaser scene for active blocks. */
  dropSpeed: number;
  /** Number of wrong placements tolerated before defeat pressure is severe. */
  maxErrors: number;
  /** Stability removed by an incorrect placement. */
  errorStabilityCost: number;
  /** Stability recovered by a correct placement. */
  correctStabilityGain: number;
  /** Passive stability loss per second. */
  stabilityDecayPerSecond: number;
}

/** A selectable sentence word block. */
export interface BabelArchitectBlock {
  /** Stable block identifier for renderer event payloads. */
  id: string;
  /** Visible word printed on the block. */
  word: string;
  /** Zero-based order in the active sentence. */
  order: number;
  /** Horizontal lane used by the renderer. */
  lane: number;
  /** Vertical render offset used by the renderer. */
  y: number;
}

/** A block already placed into the tower. */
export interface BabelArchitectPlacedBlock extends BabelArchitectBlock {
  /** Whether the placement matched the expected word. */
  stable: boolean;
}

/** Last feedback event emitted by the pure rules engine. */
export type BabelArchitectFeedback =
  | { kind: "correct"; word: string }
  | { kind: "incorrect"; word: string; expectedWord: string }
  | { kind: "sentence-complete"; sentenceIndex: number }
  | { kind: "victory" }
  | { kind: "defeat" }
  | { kind: "timeout" };

/** Serializable game state consumed by the React shell and Phaser scene. */
export interface BabelArchitectState {
  /** Source sentence data for the current session. */
  sentences: VocabularyItem[];
  /** Active sentence index. */
  currentSentenceIndex: number;
  /** Current sentence translation shown to the learner. */
  targetTranslation: string;
  /** Selectable blocks for the active sentence. */
  blocks: BabelArchitectBlock[];
  /** Blocks placed into the visible tower. */
  placedBlocks: BabelArchitectPlacedBlock[];
  /** Next expected word index in the active sentence. */
  progressIndex: number;
  /** Current lifecycle state. */
  phase: BabelArchitectPhase;
  /** Selected difficulty. */
  difficulty: BabelArchitectDifficulty;
  /** Current tower stability from 0 to 100. */
  stability: number;
  /** Number of incorrect placements. */
  errors: number;
  /** Internal score used for summary and leaderboard display. */
  score: number;
  /** Correct placement count. */
  correctAnswers: number;
  /** Total placement attempts. */
  totalAttempts: number;
  /** Elapsed gameplay time in milliseconds. */
  elapsedMs: number;
  /** Start timestamp used to calculate duration. */
  startedAtMs: number;
  /** Latest rules-engine feedback event. */
  feedback: BabelArchitectFeedback | null;
}

/** Completion payload submitted to the shared server-authoritative route. */
export interface BabelArchitectCompletionInput {
  /** Canonical game id. */
  gameType: "babel-architect";
  /** Canonical shared difficulty; normal maps to medium. */
  difficulty: "easy" | "medium" | "hard";
  /** Final internal score. */
  score: number;
  /** Fractional accuracy from 0 to 1. */
  accuracy: number;
  /** Correct answer count. */
  correctAnswers: number;
  /** Total attempt count. */
  totalAttempts: number;
  /** Gameplay duration in milliseconds. */
  duration: number;
  /** Whether the run ended in victory. */
  victory: boolean;
  /** Fire-once idempotency key. */
  idempotencyKey: string;
  /** Client completion timestamp. */
  clientTimestamp: number;
  /** Auditable game-specific summary details. */
  metadata: Record<string, unknown>;
}

/** Difficulty presets for Babel Architect. */
export const BABEL_ARCHITECT_DIFFICULTY: Record<BabelArchitectDifficulty, BabelArchitectDifficultyConfig> = {
  easy: {
    timeLimitMs: 150_000,
    dropSpeed: 72,
    maxErrors: 6,
    errorStabilityCost: 10,
    correctStabilityGain: 8,
    stabilityDecayPerSecond: 0.2,
  },
  normal: {
    timeLimitMs: 120_000,
    dropSpeed: 108,
    maxErrors: 4,
    errorStabilityCost: 15,
    correctStabilityGain: 6,
    stabilityDecayPerSecond: 0.35,
  },
  hard: {
    timeLimitMs: 90_000,
    dropSpeed: 146,
    maxErrors: 3,
    errorStabilityCost: 22,
    correctStabilityGain: 5,
    stabilityDecayPerSecond: 0.55,
  },
};

const MAX_STABILITY = 100;
const MIN_STABILITY = 0;

/**
 * Creates the initial serializable Babel Architect game state.
 * @param sentences Sentence data available to the session.
 * @param options Difficulty and optional timestamp controls.
 * @returns A new playable state for the first sentence.
 */
export function createBabelArchitectState(
  sentences: VocabularyItem[],
  options: { difficulty?: BabelArchitectDifficulty; nowMs?: number } = {},
): BabelArchitectState {
  const playableSentences = sentences.filter((sentence) => sentence.term.trim().length > 0);
  const difficulty = options.difficulty ?? "normal";
  const startedAtMs = options.nowMs ?? Date.now();
  const firstSentence = playableSentences[0] ?? { term: "Build the tower", translation: "สร้างหอคอย" };

  return {
    sentences: playableSentences.length > 0 ? playableSentences : [firstSentence],
    currentSentenceIndex: 0,
    targetTranslation: firstSentence.translation,
    blocks: createBlocksForSentence(firstSentence.term, 0),
    placedBlocks: [],
    progressIndex: 0,
    phase: "playing",
    difficulty,
    stability: MAX_STABILITY,
    errors: 0,
    score: 0,
    correctAnswers: 0,
    totalAttempts: 0,
    elapsedMs: 0,
    startedAtMs,
    feedback: null,
  };
}

/**
 * Returns the next expected word for the active sentence.
 * @param state Current game state.
 * @returns The next word, or null when the active sentence is complete.
 */
export function getExpectedWord(state: BabelArchitectState): string | null {
  return state.blocks[state.progressIndex]?.word ?? null;
}

/**
 * Applies a block placement intent to the pure game state.
 * @param state Current game state.
 * @param blockId Identifier emitted by the renderer for the selected block.
 * @param options Optional timestamp for deterministic tests.
 * @returns The next state after scoring, stability, and progression rules run.
 */
export function placeBabelArchitectBlock(
  state: BabelArchitectState,
  blockId: string,
  options: { nowMs?: number } = {},
): BabelArchitectState {
  if (state.phase !== "playing") return state;

  const block = state.blocks.find((candidate) => candidate.id === blockId);
  if (!block) return state;

  const expected = getExpectedWord(state);
  const config = BABEL_ARCHITECT_DIFFICULTY[state.difficulty];
  const isCorrect = block.word === expected && block.order === state.progressIndex;
  const totalAttempts = state.totalAttempts + 1;

  if (!isCorrect) {
    const stability = clamp(state.stability - config.errorStabilityCost, MIN_STABILITY, MAX_STABILITY);
    const phase: BabelArchitectPhase = stability <= 0 || state.errors + 1 >= config.maxErrors ? "defeat" : "playing";
    return {
      ...state,
      placedBlocks: [...state.placedBlocks, { ...block, stable: false }],
      totalAttempts,
      errors: state.errors + 1,
      stability,
      phase,
      feedback: phase === "defeat"
        ? { kind: "defeat" }
        : { kind: "incorrect", word: block.word, expectedWord: expected ?? "" },
    };
  }

  const progressIndex = state.progressIndex + 1;
  const correctAnswers = state.correctAnswers + 1;
  const score = state.score + 100 + Math.round(state.stability);
  const placedBlocks = [...state.placedBlocks, { ...block, stable: true }];
  const stability = clamp(state.stability + config.correctStabilityGain, MIN_STABILITY, MAX_STABILITY);
  const nextState: BabelArchitectState = {
    ...state,
    progressIndex,
    correctAnswers,
    totalAttempts,
    score,
    stability,
    placedBlocks,
    feedback: { kind: "correct", word: block.word },
  };

  if (progressIndex < state.blocks.length) return nextState;
  return advanceSentence(nextState, options.nowMs);
}

/**
 * Advances passive timing and stability pressure.
 * @param state Current game state.
 * @param deltaMs Milliseconds since the previous frame.
 * @returns The next state after time-based rules run.
 */
export function tickBabelArchitect(state: BabelArchitectState, deltaMs: number): BabelArchitectState {
  if (state.phase !== "playing") return state;
  const config = BABEL_ARCHITECT_DIFFICULTY[state.difficulty];
  const safeDelta = Math.max(0, Math.min(deltaMs, 250));
  const elapsedMs = state.elapsedMs + Math.max(0, deltaMs);
  const stability = clamp(
    state.stability - config.stabilityDecayPerSecond * (safeDelta / 1_000),
    MIN_STABILITY,
    MAX_STABILITY,
  );

  if (elapsedMs > config.timeLimitMs) {
    return { ...state, elapsedMs, stability, phase: "defeat", feedback: { kind: "timeout" } };
  }

  if (stability <= 0) {
    return { ...state, elapsedMs, stability, phase: "defeat", feedback: { kind: "defeat" } };
  }

  return { ...state, elapsedMs, stability };
}

/**
 * Converts a final state into the canonical shared completion input.
 * @param state Final or current state to summarize.
 * @param options Optional timestamp and idempotency override for tests.
 * @returns Payload suitable for `/api/v1/games/babel-architect/complete`.
 */
export function completeBabelArchitectRun(
  state: BabelArchitectState,
  options: { nowMs?: number; idempotencyKey?: string } = {},
): BabelArchitectCompletionInput {
  const nowMs = options.nowMs ?? Date.now();
  const totalAttempts = state.totalAttempts;
  const accuracy = totalAttempts > 0 ? state.correctAnswers / totalAttempts : 0;

  return {
    gameType: "babel-architect",
    difficulty: state.difficulty === "normal" ? "medium" : state.difficulty,
    score: state.score,
    accuracy,
    correctAnswers: state.correctAnswers,
    totalAttempts,
    duration: Math.max(0, nowMs - state.startedAtMs),
    victory: state.phase === "victory",
    idempotencyKey: options.idempotencyKey ?? createUuid(),
    clientTimestamp: nowMs,
    metadata: {
      sentenceCount: state.sentences.length,
      completedSentences: state.currentSentenceIndex + (state.phase === "victory" ? 1 : 0),
      stability: Math.round(state.stability),
      errors: state.errors,
    },
  };
}

/**
 * Estimates XP with the shared server formula for immediate end-screen display.
 * @param summary Canonical completion summary.
 * @returns Non-negative XP capped at 10.
 */
export function estimateBabelArchitectXP(summary: BabelArchitectCompletionInput): number {
  if (summary.totalAttempts === 0) return 0;
  let bonus = 0;
  if (summary.accuracy === 1) bonus += 2;
  if (summary.victory) bonus += 1;
  if (summary.duration < 60_000) bonus += 1;
  return Math.min(10, summary.correctAnswers + bonus);
}

/**
 * Creates ordered block data for a sentence string.
 * @param term Sentence text to split.
 * @param sentenceIndex Sentence index used to keep ids stable across rounds.
 * @returns Ordered block descriptors for the renderer.
 */
export function createBlocksForSentence(term: string, sentenceIndex: number): BabelArchitectBlock[] {
  return term
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word, order) => ({
      id: `sentence-${sentenceIndex}-block-${order}`,
      word,
      order,
      lane: order % 3,
      y: -80 - order * 54,
    }));
}

function advanceSentence(state: BabelArchitectState, nowMs?: number): BabelArchitectState {
  const nextSentenceIndex = state.currentSentenceIndex + 1;
  if (nextSentenceIndex >= state.sentences.length) {
    return { ...state, phase: "victory", feedback: { kind: "victory" } };
  }

  const nextSentence = state.sentences[nextSentenceIndex];
  return {
    ...state,
    currentSentenceIndex: nextSentenceIndex,
    targetTranslation: nextSentence.translation,
    blocks: createBlocksForSentence(nextSentence.term, nextSentenceIndex),
    placedBlocks: [],
    progressIndex: 0,
    stability: clamp(state.stability + 10, MIN_STABILITY, MAX_STABILITY),
    feedback: { kind: "sentence-complete", sentenceIndex: state.currentSentenceIndex },
    elapsedMs: nowMs ? Math.max(0, nowMs - state.startedAtMs) : state.elapsedMs,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createUuid(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && "randomUUID" in cryptoApi) {
    return cryptoApi.randomUUID();
  }
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    return (Number(char) ^ (random & (15 >> (Number(char) / 4)))).toString(16);
  });
}
