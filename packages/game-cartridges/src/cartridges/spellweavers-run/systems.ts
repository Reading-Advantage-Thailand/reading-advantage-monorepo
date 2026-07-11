import {
  sentenceInputSchema,
  type GameResults,
  type SentenceInput,
} from "@reading-advantage/game-contracts";

import { advanceScrollTargets } from "../../families/traversal";
import { createSeededRandom } from "../../internal/random";
import { createGameResults } from "../../internal/results";

const ORB_START = 120;
const COLLECTION_START = 380;
const COLLECTION_LINE = 450;
const ORB_SPEED = 110;
const INITIAL_MANA = 100;

/** One deterministic ordered word orb in the three-lane run. */
export interface SpellweaverOrb {
  /** Stable sentence-and-token identity. */
  readonly id: string;
  /** Visible word carried by the orb. */
  readonly word: string;
  /** Ordered token index. */
  readonly wordIndex: number;
  /** Zero-based collection lane. */
  readonly lane: number;
  /** Vertical world position. */
  readonly position: number;
}

/** Pure sentence-order, mana, combo, and scrolling state. */
export interface SpellweaversRunState {
  /** Stable host-supplied sentence array. */
  readonly sentences: SentenceInput;
  /** Active sentence index. */
  readonly sentenceIndex: number;
  /** Tokens in the active sentence. */
  readonly words: readonly string[];
  /** Translation displayed as the meaning prompt. */
  readonly translation: string;
  /** Index of the next required word. */
  readonly targetIndex: number;
  /** Current word orb approaching the collection zone. */
  readonly orb: SpellweaverOrb;
  /** Reproducible session seed. */
  readonly seed: number;
  /** Current mana from zero through one hundred. */
  readonly mana: number;
  /** Consecutive correct collections. */
  readonly combo: number;
  /** Non-authoritative display score. */
  readonly score: number;
  /** Correct word collections. */
  readonly correctAnswers: number;
  /** Resolved lane choices and missed orbs. */
  readonly totalAttempts: number;
  /** Accumulated active time. */
  readonly elapsedMs: number;
  /** Whether the learning loop has ended. */
  readonly complete: boolean;
  /** Whether all supplied sentences were completed. */
  readonly victory?: boolean;
  /** Most recent resolved outcome. */
  readonly lastOutcome?: "correct" | "incorrect" | "missed";
  /** Exact five-field result after completion or mana depletion. */
  readonly results?: GameResults;
}

function tokenize(term: string): string[] {
  return term.trim().split(/\s+/u).filter(Boolean);
}

function createOrb(
  sentences: SentenceInput,
  sentenceIndex: number,
  targetIndex: number,
  seed: number,
  attempt: number,
): SpellweaverOrb {
  const words = tokenize(sentences[sentenceIndex]!.term);
  const random = createSeededRandom(
    seed + sentenceIndex * 10_007 + targetIndex * 997 + attempt * 37,
  );
  return {
    id: `orb:${sentenceIndex}:${targetIndex}:${attempt}`,
    word: words[targetIndex]!,
    wordIndex: targetIndex,
    lane: Math.floor(random() * 3),
    position: ORB_START,
  };
}

function finish(
  state: SpellweaversRunState,
  victory: boolean,
): SpellweaversRunState {
  return {
    ...state,
    complete: true,
    victory,
    results: createGameResults(
      state.score,
      state.correctAnswers,
      state.totalAttempts,
    ),
  };
}

/**
 * Creates deterministic three-lane ordered sentence state.
 * @param input Untrusted sentence pairs supplied by the host.
 * @param seed Reproducible session seed.
 * @returns Initial Spellweavers Run state.
 * @throws When input, tokens, translations, or seed are invalid.
 */
export function createSpellweaversRunState(
  input: SentenceInput | unknown,
  seed: number,
): SpellweaversRunState {
  const sentences = sentenceInputSchema.parse(input);
  if (sentences.length === 0) throw new Error("Spellweavers Run requires a sentence");
  if (sentences.some(({ term }) => tokenize(term).length === 0)) {
    throw new Error("Spellweavers Run requires sentence words");
  }
  if (sentences.some(({ translation }) => !translation.trim())) {
    throw new Error("Spellweavers Run requires non-empty translations");
  }
  if (!Number.isInteger(seed)) throw new Error("Spellweavers Run seed must be an integer");
  const words = tokenize(sentences[0]!.term);
  return {
    sentences,
    sentenceIndex: 0,
    words,
    translation: sentences[0]!.translation,
    targetIndex: 0,
    orb: createOrb(sentences, 0, 0, seed, 0),
    seed,
    mana: INITIAL_MANA,
    combo: 0,
    score: 0,
    correctAnswers: 0,
    totalAttempts: 0,
    elapsedMs: 0,
    complete: false,
  };
}

/**
 * Advances the active orb and resolves a missed collection-line crossing.
 * @param state Current Spellweavers Run state.
 * @param deltaMs Non-negative frame time.
 * @returns Updated scrolling state, with mana loss and respawn after a miss.
 */
export function advanceSpellweaversRun(
  state: SpellweaversRunState,
  deltaMs: number,
): SpellweaversRunState {
  if (state.complete) return state;
  const advanced = advanceScrollTargets({
    targets: [{ id: state.orb.id, position: state.orb.position }],
    deltaMs,
    speed: ORB_SPEED,
    collisionLine: COLLECTION_LINE,
  });
  const elapsedMs = state.elapsedMs + deltaMs;
  if (!advanced.crossedTargetIds.includes(state.orb.id)) {
    return {
      ...state,
      elapsedMs,
      orb: { ...state.orb, position: advanced.targets[0]!.position },
    };
  }
  const mana = Math.max(0, state.mana - 10);
  const totalAttempts = state.totalAttempts + 1;
  const missed = {
    ...state,
    mana,
    combo: 0,
    score: state.score - 10,
    totalAttempts,
    elapsedMs,
    lastOutcome: "missed" as const,
    orb: createOrb(
      state.sentences,
      state.sentenceIndex,
      state.targetIndex,
      state.seed,
      totalAttempts,
    ),
  };
  return mana === 0 ? finish(missed, false) : missed;
}

/**
 * Resolves a lane selection when the active orb is in the collection zone.
 * @param state Current Spellweavers Run state.
 * @param lane Selected zero-based lane.
 * @returns Updated ordered-word, mana, combo, and result state.
 */
export function collectSpellweaverLane(
  state: SpellweaversRunState,
  lane: number,
): SpellweaversRunState {
  if (state.complete || !Number.isInteger(lane) || lane < 0 || lane > 2) return state;
  if (state.orb.position < COLLECTION_START || state.orb.position > COLLECTION_LINE) {
    return state;
  }
  const correct = lane === state.orb.lane;
  const totalAttempts = state.totalAttempts + 1;
  if (!correct) {
    const mana = Math.max(0, state.mana - 25);
    const incorrect = {
      ...state,
      mana,
      combo: 0,
      score: state.score - 20,
      totalAttempts,
      lastOutcome: "incorrect" as const,
      orb: createOrb(
        state.sentences,
        state.sentenceIndex,
        state.targetIndex,
        state.seed,
        totalAttempts,
      ),
    };
    return mana === 0 ? finish(incorrect, false) : incorrect;
  }

  const combo = state.combo + 1;
  const score = state.score + 100 + state.combo * 25;
  const correctAnswers = state.correctAnswers + 1;
  const nextTargetIndex = state.targetIndex + 1;
  if (nextTargetIndex < state.words.length) {
    return {
      ...state,
      targetIndex: nextTargetIndex,
      combo,
      score,
      correctAnswers,
      totalAttempts,
      lastOutcome: "correct",
      orb: createOrb(
        state.sentences,
        state.sentenceIndex,
        nextTargetIndex,
        state.seed,
        totalAttempts,
      ),
    };
  }

  const sentenceIndex = state.sentenceIndex + 1;
  if (sentenceIndex >= state.sentences.length) {
    return finish({
      ...state,
      sentenceIndex,
      targetIndex: nextTargetIndex,
      combo,
      score,
      correctAnswers,
      totalAttempts,
      lastOutcome: "correct",
    }, true);
  }
  const words = tokenize(state.sentences[sentenceIndex]!.term);
  return {
    ...state,
    sentenceIndex,
    words,
    translation: state.sentences[sentenceIndex]!.translation,
    targetIndex: 0,
    combo,
    score,
    correctAnswers,
    totalAttempts,
    lastOutcome: "correct",
    orb: createOrb(state.sentences, sentenceIndex, 0, state.seed, totalAttempts),
  };
}

/** Collection-zone start used by deterministic tests and scene projection. */
export const SPELLWEAVER_COLLECTION_START = COLLECTION_START;
