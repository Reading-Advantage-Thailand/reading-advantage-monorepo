import {
  sentenceInputSchema,
  type GameResults,
  type SentenceInput,
} from "@reading-advantage/game-contracts";

import { advanceScrollTargets, moveLane } from "../../families/traversal";
import { createSeededRandom, seededShuffle } from "../../internal/random";
import { createGameResults } from "../../internal/results";

const WAVE_START = 100;
const COLLISION_LINE = 450;
const WAVE_SPEED = 95;
const INITIAL_LIVES = 3;

/** One gate or obstacle occupying a perspective lane. */
export interface GriffinLaneTarget {
  /** Stable sentence, token, attempt, and lane identity. */
  readonly id: string;
  /** Zero-based lane. */
  readonly lane: number;
  /** Correct gate, decoy gate, or damaging obstacle. */
  readonly kind: "correct" | "decoy" | "obstacle";
  /** Gate label; obstacles have no educational label. */
  readonly word?: string;
  /** Shared forward position for perspective projection. */
  readonly position: number;
}

/** Pure forward-wave, ordered-sentence, and survival state. */
export interface GriffinRidersState {
  /** Stable host-supplied sentence array. */
  readonly sentences: SentenceInput;
  /** Active sentence index. */
  readonly sentenceIndex: number;
  /** Active sentence words. */
  readonly words: readonly string[];
  /** Translation shown as the meaning prompt. */
  readonly translation: string;
  /** Next required word index. */
  readonly targetIndex: number;
  /** Current three-lane incoming wave. */
  readonly targets: readonly GriffinLaneTarget[];
  /** Player's zero-based lane. */
  readonly playerLane: number;
  /** Remaining collision lives. */
  readonly lives: number;
  /** Consecutive correct gate collisions. */
  readonly combo: number;
  /** Non-authoritative display score. */
  readonly score: number;
  /** Correct ordered gates. */
  readonly correctAnswers: number;
  /** All wave collisions. */
  readonly totalAttempts: number;
  /** Accumulated active time. */
  readonly elapsedMs: number;
  /** Reproducible session seed. */
  readonly seed: number;
  /** Whether the run ended through victory or depleted lives. */
  readonly complete: boolean;
  /** Whether all supplied sentence gates were cleared. */
  readonly victory?: boolean;
  /** Most recent collision type. */
  readonly lastOutcome?: GriffinLaneTarget["kind"];
  /** Exact five-field result after completion. */
  readonly results?: GameResults;
}

function tokenize(term: string): string[] {
  return term.trim().split(/\s+/u).filter(Boolean);
}

function createWave(
  sentences: SentenceInput,
  sentenceIndex: number,
  targetIndex: number,
  attempt: number,
  seed: number,
): GriffinLaneTarget[] {
  const words = tokenize(sentences[sentenceIndex]!.term);
  const random = createSeededRandom(
    seed + sentenceIndex * 10_007 + targetIndex * 997 + attempt * 41,
  );
  const decoys = words.filter((_, index) => index !== targetIndex);
  const decoy = decoys[Math.floor(random() * decoys.length)] ?? "◇";
  const shuffled = seededShuffle(
    [
      { kind: "correct" as const, word: words[targetIndex] },
      { kind: "decoy" as const, word: decoy },
      { kind: "obstacle" as const },
    ],
    random,
  );
  return shuffled.map((target, lane) => ({
    ...target,
    id: `griffin:${sentenceIndex}:${targetIndex}:${attempt}:${lane}`,
    lane,
    position: WAVE_START,
  }));
}

function finish(state: GriffinRidersState, victory: boolean): GriffinRidersState {
  return {
    ...state,
    complete: true,
    victory,
    results: createGameResults(state.score, state.correctAnswers, state.totalAttempts),
  };
}

/**
 * Creates deterministic perspective-gate state from strict sentences.
 * @param input Untrusted sentence pairs supplied by the host.
 * @param seed Reproducible wave seed.
 * @returns Initial Griffin Riders Escape state.
 * @throws When content, tokens, translations, or seed are invalid.
 */
export function createGriffinRidersState(
  input: SentenceInput | unknown,
  seed: number,
): GriffinRidersState {
  const sentences = sentenceInputSchema.parse(input);
  if (sentences.length === 0) throw new Error("Griffin Riders requires a sentence");
  if (sentences.some(({ term }) => tokenize(term).length === 0)) {
    throw new Error("Griffin Riders requires sentence words");
  }
  if (sentences.some(({ translation }) => !translation.trim())) {
    throw new Error("Griffin Riders requires non-empty translations");
  }
  if (!Number.isInteger(seed)) throw new Error("Griffin Riders seed must be an integer");
  const words = tokenize(sentences[0]!.term);
  return {
    sentences,
    sentenceIndex: 0,
    words,
    translation: sentences[0]!.translation,
    targetIndex: 0,
    targets: createWave(sentences, 0, 0, 0, seed),
    playerLane: 1,
    lives: INITIAL_LIVES,
    combo: 0,
    score: 0,
    correctAnswers: 0,
    totalAttempts: 0,
    elapsedMs: 0,
    seed,
    complete: false,
  };
}

/**
 * Moves the griffin one bounded lane left or right.
 * @param state Current Griffin Riders state.
 * @param direction Requested horizontal direction.
 * @returns Updated state, or terminal state unchanged.
 */
export function moveGriffinLane(
  state: GriffinRidersState,
  direction: "left" | "right",
): GriffinRidersState {
  if (state.complete) return state;
  return { ...state, playerLane: moveLane(state.playerLane, direction, 3) };
}

/**
 * Advances one perspective wave and resolves its collision plane crossing.
 * @param state Current Griffin Riders state.
 * @param deltaMs Non-negative frame time.
 * @returns Updated wave, ordered progress, lives, and optional result.
 */
export function advanceGriffinRiders(
  state: GriffinRidersState,
  deltaMs: number,
): GriffinRidersState {
  if (state.complete) return state;
  const advanced = advanceScrollTargets({
    targets: state.targets,
    deltaMs,
    speed: WAVE_SPEED,
    collisionLine: COLLISION_LINE,
  });
  const targets = state.targets.map((target, index) => ({
    ...target,
    position: advanced.targets[index]!.position,
  }));
  const elapsedMs = state.elapsedMs + deltaMs;
  if (advanced.crossedTargetIds.length === 0) return { ...state, targets, elapsedMs };

  const collided = targets.find(({ lane }) => lane === state.playerLane)!;
  const totalAttempts = state.totalAttempts + 1;
  if (collided.kind !== "correct") {
    const lives = state.lives - 1;
    const failed = {
      ...state,
      targets: createWave(
        state.sentences,
        state.sentenceIndex,
        state.targetIndex,
        totalAttempts,
        state.seed,
      ),
      lives,
      combo: 0,
      score: state.score - 20,
      totalAttempts,
      elapsedMs,
      lastOutcome: collided.kind,
    };
    return lives <= 0 ? finish(failed, false) : failed;
  }

  const combo = state.combo + 1;
  const score = state.score + 100 + state.combo * 25;
  const correctAnswers = state.correctAnswers + 1;
  const targetIndex = state.targetIndex + 1;
  if (targetIndex < state.words.length) {
    return {
      ...state,
      targetIndex,
      targets: createWave(
        state.sentences,
        state.sentenceIndex,
        targetIndex,
        totalAttempts,
        state.seed,
      ),
      combo,
      score,
      correctAnswers,
      totalAttempts,
      elapsedMs,
      lastOutcome: "correct",
    };
  }

  const sentenceIndex = state.sentenceIndex + 1;
  if (sentenceIndex >= state.sentences.length) {
    return finish({
      ...state,
      sentenceIndex,
      targetIndex,
      combo,
      score,
      correctAnswers,
      totalAttempts,
      elapsedMs,
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
    targets: createWave(state.sentences, sentenceIndex, 0, totalAttempts, state.seed),
    combo,
    score,
    correctAnswers,
    totalAttempts,
    elapsedMs,
    lastOutcome: "correct",
  };
}

/** Perspective collision line used by deterministic tests. */
export const GRIFFIN_COLLISION_LINE = COLLISION_LINE;
