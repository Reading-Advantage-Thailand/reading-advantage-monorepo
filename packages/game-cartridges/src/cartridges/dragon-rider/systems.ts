import {
  gameResultsSchema,
  vocabularyInputSchema,
  type GameResults,
  type VocabularyInput,
} from "@reading-advantage/game-contracts";

import { createGateWave, type GateWaveTarget } from "../../families/traversal";
import { createSeededRandom, seededShuffle } from "../../internal/random";
import { createGameResults } from "../../internal/results";

/** One deterministic Dragon Rider vocabulary gate decision. */
export interface DragonRiderRound {
  /** Stable round ordinal. */
  readonly index: number;
  /** Vocabulary term displayed as the prompt. */
  readonly term: string;
  /** Two lane gates containing one answer and one decoy. */
  readonly gates: readonly GateWaveTarget[];
  /** Source vocabulary used to resolve visible gate translations. */
  readonly vocabulary: VocabularyInput;
}

/** Pure learning and boss state for the Dragon Rider cartridge. */
export interface DragonRiderState {
  /** Seeded gate rounds frozen for this session. */
  readonly rounds: readonly DragonRiderRound[];
  /** Active round index, equal to round count in the boss phase. */
  readonly roundIndex: number;
  /** Number of allied dragons, never lower than one. */
  readonly dragonCount: number;
  /** Dragon threshold required to defeat the boss. */
  readonly bossPower: number;
  /** Non-authoritative display score. */
  readonly score: number;
  /** Correct gate choices. */
  readonly correctAnswers: number;
  /** All resolved gate choices. */
  readonly totalAttempts: number;
  /** Accumulated active session time. */
  readonly elapsedMs: number;
  /** Current traversal, boss, or terminal phase. */
  readonly phase: "running" | "boss" | "complete";
  /** Whether the assembled flight defeated the boss after resolution. */
  readonly victory?: boolean;
  /** Frozen five-field result emitted after boss resolution. */
  readonly results?: GameResults;
  /** Most recent answer outcome for presentation feedback. */
  readonly lastAnswerCorrect?: boolean;
}

function createRounds(input: VocabularyInput, seed: number): DragonRiderRound[] {
  const random = createSeededRandom(seed);
  const orderedIndices = seededShuffle(
    input.map((_, index) => index),
    random,
  );
  return orderedIndices.map((correctIndex, index) => {
    const decoyIndices = seededShuffle(
      orderedIndices.filter(
        (candidate) => input[candidate]!.translation.trim().toLocaleLowerCase() !==
          input[correctIndex]!.translation.trim().toLocaleLowerCase(),
      ),
      random,
    );
    return {
      index,
      term: input[correctIndex]!.term,
      gates: createGateWave({
        correctIndex,
        decoyIndices,
        laneCount: 2,
        waveIndex: index,
        seed: Math.floor(random() * 2_147_483_647),
      }),
      vocabulary: input,
    };
  });
}

/**
 * Creates deterministic Dragon Rider rounds and boss state.
 * @param input Untrusted vocabulary pairs supplied by the host.
 * @param seed Reproducible session seed.
 * @returns Initial immutable Dragon Rider state.
 * @throws When content is empty, blank, or lacks two distinct translations.
 */
export function createDragonRiderState(
  input: VocabularyInput | unknown,
  seed: number,
): DragonRiderState {
  const vocabulary = vocabularyInputSchema.parse(input);
  if (vocabulary.length < 2) {
    throw new Error("Dragon Rider requires at least two vocabulary items");
  }
  if (vocabulary.some(({ term, translation }) => !term.trim() || !translation.trim())) {
    throw new Error("Dragon Rider requires non-empty terms and translations");
  }
  const distinctTranslations = new Set(
    vocabulary.map(({ translation }) => translation.trim().toLocaleLowerCase()),
  );
  if (distinctTranslations.size < 2) {
    throw new Error("Dragon Rider requires two distinct translations");
  }
  if (!Number.isInteger(seed)) throw new Error("Dragon Rider seed must be an integer");
  const rounds = createRounds(vocabulary, seed);
  return {
    rounds,
    roundIndex: 0,
    dragonCount: 1,
    bossPower: Math.max(3, Math.ceil(rounds.length * 0.75)),
    score: 0,
    correctAnswers: 0,
    totalAttempts: 0,
    elapsedMs: 0,
    phase: "running",
  };
}

/**
 * Advances display time without changing educational progress.
 * @param state Current Dragon Rider state.
 * @param deltaMs Non-negative elapsed frame time.
 * @returns A new state with accumulated elapsed time, or the terminal state unchanged.
 * @throws When elapsed time is invalid.
 */
export function advanceDragonRiderTime(
  state: DragonRiderState,
  deltaMs: number,
): DragonRiderState {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new Error("Dragon Rider delta must be finite and non-negative");
  }
  if (state.phase === "complete") return state;
  return { ...state, elapsedMs: state.elapsedMs + deltaMs };
}

/**
 * Resolves one lane gate and advances to the next round or boss.
 * @param state Active Dragon Rider state.
 * @param lane Selected zero-based lane.
 * @returns Updated immutable learning and army state.
 */
export function chooseDragonRiderGate(
  state: DragonRiderState,
  lane: number,
): DragonRiderState {
  if (state.phase !== "running") return state;
  const round = state.rounds[state.roundIndex];
  const gate = round?.gates.find((candidate) => candidate.lane === lane);
  if (!gate) return state;
  const correct = gate.correct;
  const roundIndex = state.roundIndex + 1;
  return {
    ...state,
    roundIndex,
    dragonCount: correct ? state.dragonCount + 1 : Math.max(1, state.dragonCount - 1),
    score: state.score + (correct ? 100 : -20),
    correctAnswers: state.correctAnswers + (correct ? 1 : 0),
    totalAttempts: state.totalAttempts + 1,
    phase: roundIndex >= state.rounds.length ? "boss" : "running",
    lastAnswerCorrect: correct,
  };
}

/**
 * Evaluates the final dragon flight and freezes the exact result ABI.
 * @param state Dragon Rider state in the boss phase.
 * @returns Completed state with victory evidence and validated results.
 */
export function resolveDragonRiderBoss(state: DragonRiderState): DragonRiderState {
  if (state.phase !== "boss") return state;
  const results = createGameResults(
    state.score,
    state.correctAnswers,
    state.totalAttempts,
  );
  return {
    ...state,
    phase: "complete",
    victory: state.dragonCount >= state.bossPower,
    results: gameResultsSchema.parse(results),
  };
}

/**
 * Returns the visible translation carried by one gate.
 * @param round Active deterministic Dragon Rider round.
 * @param lane Zero-based gate lane.
 * @returns Visible translation, or an empty string for an unknown lane.
 */
export function getDragonRiderGateLabel(
  round: DragonRiderRound,
  lane: number,
): string {
  const gate = round.gates.find((candidate) => candidate.lane === lane);
  return gate === undefined ? "" : round.vocabulary[gate.contentIndex]!.translation;
}
