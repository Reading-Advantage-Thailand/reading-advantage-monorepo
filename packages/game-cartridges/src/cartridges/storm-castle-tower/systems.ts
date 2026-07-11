import {
  sentenceInputSchema,
  type GameResults,
  type SentenceInput,
} from "@reading-advantage/game-contracts";

import { advanceScrollTargets, moveGridPosition, resolveOrderedTarget } from "../../families/traversal";
import { createSeededRandom } from "../../internal/random";
import { createGameResults } from "../../internal/results";

const COLUMNS = 4;
const MAXIMUM_ROW = 40;
const HAZARD_INTERVAL_MS = 2_000;
const HAZARD_SPEED = -1.5;

/** One ordered word window placed on the tower grid. */
export interface StormWindow {
  /** Stable sentence-and-token identity. */
  readonly id: string;
  /** Visible ordered word. */
  readonly word: string;
  /** Required token index. */
  readonly wordIndex: number;
  /** Horizontal tower column. */
  readonly column: number;
  /** Vertical tower row. */
  readonly row: number;
  /** Whether the window remains collectible. */
  readonly state: "open" | "collected" | "closed";
}

/** One deterministic falling tower hazard. */
export interface StormHazard {
  /** Stable hazard ordinal. */
  readonly id: string;
  /** Oil or rock presentation variant. */
  readonly kind: "oil" | "rock";
  /** Horizontal tower column. */
  readonly column: number;
  /** Continuous vertical grid position. */
  readonly position: number;
}

/** Pure vertical traversal, ordered-window, and hazard state. */
export interface StormCastleState {
  /** Stable host-supplied sentence array. */
  readonly sentences: SentenceInput;
  /** Active sentence index. */
  readonly sentenceIndex: number;
  /** Active sentence words. */
  readonly words: readonly string[];
  /** Meaning prompt for the active sentence. */
  readonly translation: string;
  /** Ordered tower windows for the active sentence. */
  readonly windows: readonly StormWindow[];
  /** Next required window index. */
  readonly targetIndex: number;
  /** Current player grid coordinate. */
  readonly player: { readonly column: number; readonly row: number };
  /** Active falling hazards. */
  readonly hazards: readonly StormHazard[];
  /** Time retained toward the next hazard spawn. */
  readonly hazardTimerMs: number;
  /** Number of hazards spawned. */
  readonly hazardCount: number;
  /** Remaining lives. */
  readonly lives: number;
  /** Non-authoritative display score. */
  readonly score: number;
  /** Correct ordered windows. */
  readonly correctAnswers: number;
  /** Collected windows, including wrong ones. */
  readonly totalAttempts: number;
  /** Accumulated active time. */
  readonly elapsedMs: number;
  /** Reproducible session seed. */
  readonly seed: number;
  /** Whether the climb ended. */
  readonly complete: boolean;
  /** Whether all sentences were completed. */
  readonly victory?: boolean;
  /** Most recent educational or hazard outcome. */
  readonly lastOutcome?: "correct" | "incorrect" | "hazard";
  /** Exact five-field result after completion. */
  readonly results?: GameResults;
}

function tokenize(term: string): string[] {
  return term.trim().split(/\s+/u).filter(Boolean);
}

function createWindows(
  words: readonly string[],
  sentenceIndex: number,
  seed: number,
): StormWindow[] {
  const random = createSeededRandom(seed + sentenceIndex * 10_007);
  return words.map((word, wordIndex) => ({
    id: `window:${sentenceIndex}:${wordIndex}`,
    word,
    wordIndex,
    column: Math.floor(random() * COLUMNS),
    row: 2 + wordIndex * 3,
    state: "open",
  }));
}

function finish(state: StormCastleState, victory: boolean): StormCastleState {
  return {
    ...state,
    complete: true,
    victory,
    results: createGameResults(state.score, state.correctAnswers, state.totalAttempts),
  };
}

/**
 * Creates deterministic tower windows and player state.
 * @param input Untrusted sentence pairs supplied by the host.
 * @param seed Reproducible window and hazard seed.
 * @returns Initial Storm Castle Tower state.
 * @throws When content, tokens, translations, or seed are invalid.
 */
export function createStormCastleState(
  input: SentenceInput | unknown,
  seed: number,
): StormCastleState {
  const sentences = sentenceInputSchema.parse(input);
  if (sentences.length === 0) throw new Error("Storm Castle requires a sentence");
  if (sentences.some(({ term }) => tokenize(term).length === 0)) {
    throw new Error("Storm Castle requires sentence words");
  }
  if (sentences.some(({ translation }) => !translation.trim())) {
    throw new Error("Storm Castle requires non-empty translations");
  }
  if (!Number.isInteger(seed)) throw new Error("Storm Castle seed must be an integer");
  const words = tokenize(sentences[0]!.term);
  return {
    sentences,
    sentenceIndex: 0,
    words,
    translation: sentences[0]!.translation,
    windows: createWindows(words, 0, seed),
    targetIndex: 0,
    player: { column: 1, row: 0 },
    hazards: [],
    hazardTimerMs: 0,
    hazardCount: 0,
    lives: 3,
    score: 0,
    correctAnswers: 0,
    totalAttempts: 0,
    elapsedMs: 0,
    seed,
    complete: false,
  };
}

/**
 * Moves the climber one bounded tower-grid cell.
 * @param state Current Storm Castle state.
 * @param direction Requested cardinal direction.
 * @returns Updated state, or terminal state unchanged.
 */
export function moveStormPlayer(
  state: StormCastleState,
  direction: "up" | "down" | "left" | "right",
): StormCastleState {
  if (state.complete) return state;
  return {
    ...state,
    player: moveGridPosition(state.player, direction, {
      columns: COLUMNS,
      minimumRow: 0,
      maximumRow: MAXIMUM_ROW,
    }),
  };
}

/**
 * Collects an open window at the player's exact grid position.
 * @param state Current Storm Castle state.
 * @returns Updated ordered progress, lives, and optional terminal result.
 */
export function collectStormWindow(state: StormCastleState): StormCastleState {
  if (state.complete) return state;
  const selected = state.windows.find(
    (window) =>
      window.state === "open" &&
      window.column === state.player.column &&
      window.row === state.player.row,
  );
  if (!selected) return state;
  const resolution = resolveOrderedTarget({
    targetIndex: state.targetIndex,
    selectedIndex: selected.wordIndex,
    attempts: state.totalAttempts,
    correctAnswers: state.correctAnswers,
  });
  if (!resolution.correct) {
    const lives = state.lives - 1;
    const incorrect = {
      ...state,
      windows: state.windows.map((window) =>
        window.id === selected.id ? { ...window, state: "closed" as const } : window,
      ),
      lives,
      score: state.score - 20,
      totalAttempts: resolution.attempts,
      lastOutcome: "incorrect" as const,
    };
    return lives <= 0 ? finish(incorrect, false) : incorrect;
  }

  const score = state.score + 100;
  const windows = state.windows.map((window) => {
    if (window.id === selected.id) return { ...window, state: "collected" as const };
    if (window.wordIndex === resolution.nextTargetIndex && window.state === "closed") {
      return { ...window, state: "open" as const };
    }
    return window;
  });
  if (resolution.nextTargetIndex < state.words.length) {
    return {
      ...state,
      windows,
      targetIndex: resolution.nextTargetIndex,
      score,
      correctAnswers: resolution.correctAnswers,
      totalAttempts: resolution.attempts,
      lastOutcome: "correct",
    };
  }
  const sentenceIndex = state.sentenceIndex + 1;
  if (sentenceIndex >= state.sentences.length) {
    return finish({
      ...state,
      sentenceIndex,
      windows,
      targetIndex: resolution.nextTargetIndex,
      score,
      correctAnswers: resolution.correctAnswers,
      totalAttempts: resolution.attempts,
      lastOutcome: "correct",
    }, true);
  }
  const words = tokenize(state.sentences[sentenceIndex]!.term);
  return {
    ...state,
    sentenceIndex,
    words,
    translation: state.sentences[sentenceIndex]!.translation,
    windows: createWindows(words, sentenceIndex, state.seed),
    targetIndex: 0,
    player: { column: 1, row: 0 },
    score,
    correctAnswers: resolution.correctAnswers,
    totalAttempts: resolution.attempts,
    lastOutcome: "correct",
  };
}

/**
 * Advances falling hazards, spawns deterministic replacements, and resolves collisions.
 * @param state Current Storm Castle state.
 * @param deltaMs Non-negative frame time.
 * @returns Updated hazard, lives, elapsed time, and optional defeat state.
 */
export function advanceStormCastle(
  state: StormCastleState,
  deltaMs: number,
): StormCastleState {
  if (state.complete) return state;
  const advanced = advanceScrollTargets({
    targets: state.hazards,
    deltaMs,
    speed: HAZARD_SPEED,
    collisionLine: state.player.row,
  });
  const crossed = new Set(advanced.crossedTargetIds);
  let lives = state.lives;
  const hazards = state.hazards
    .map((hazard, index) => ({
      ...hazard,
      position: advanced.targets[index]!.position,
    }))
    .filter((hazard) => {
      const hit = crossed.has(hazard.id) && hazard.column === state.player.column;
      if (hit) lives -= 1;
      return !crossed.has(hazard.id) && hazard.position >= 0;
    });
  let hazardTimerMs = state.hazardTimerMs + deltaMs;
  let hazardCount = state.hazardCount;
  if (hazardTimerMs >= HAZARD_INTERVAL_MS) {
    hazardTimerMs %= HAZARD_INTERVAL_MS;
    const random = createSeededRandom(state.seed + hazardCount * 101);
    hazards.push({
      id: `hazard:${hazardCount}`,
      kind: random() < 0.5 ? "oil" : "rock",
      column: Math.floor(random() * COLUMNS),
      position: Math.min(MAXIMUM_ROW, state.player.row + 6),
    });
    hazardCount += 1;
  }
  const next = {
    ...state,
    hazards,
    hazardTimerMs,
    hazardCount,
    lives,
    elapsedMs: state.elapsedMs + deltaMs,
    ...(lives < state.lives ? { lastOutcome: "hazard" as const } : {}),
  };
  return lives <= 0 ? finish(next, false) : next;
}

/** Number of horizontal columns in the shared tower grid. */
export const STORM_CASTLE_COLUMNS = COLUMNS;
