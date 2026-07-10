import type { GameResults, SentenceInput } from "@reading-advantage/game-contracts";

import { createSeededRandom, seededShuffle } from "../../internal/random";
import { createGameResults } from "../../internal/results";

const WORLD_WIDTH = 1_600;
const WORLD_HEIGHT = 900;

/** One deterministic sentence-token target in a target-action arena. */
export interface TargetActionTarget {
  /** Stable sentence-index and token-index identity. */
  id: string;
  /** Visible token carried by the target. */
  text: string;
  /** Token index that determines the required hit order. */
  tokenIndex: number;
  /** Horizontal world position. */
  x: number;
  /** Vertical world position. */
  y: number;
  /** Whether this target may still receive a hit. */
  active: boolean;
}

/** Deterministic educational state shared by target-action cartridges. */
export interface TargetActionState {
  /** Stable sentence pair array supplied by the host. */
  sentences: SentenceInput;
  /** Active sentence index, or input length after completion. */
  sentenceIndex: number;
  /** Ordered tokens for the active sentence. */
  expectedTokens: readonly string[];
  /** Index of the next required token. */
  expectedTokenIndex: number;
  /** Live and resolved arena targets for the active sentence. */
  targets: readonly TargetActionTarget[];
  /** Reproducible host seed retained across sentence transitions. */
  seed: number;
  /** Non-negative client display score. */
  score: number;
  /** Number of correct target hits. */
  correctAnswers: number;
  /** Number of correct and wrong live-target hits. */
  totalAttempts: number;
  /** Whether every supplied sentence has been completed. */
  complete: boolean;
  /** Frozen five-field result emitted after completion. */
  results?: GameResults;
}

function tokenize(term: string): string[] {
  return term.trim().split(/\s+/u).filter(Boolean);
}

function normalizeVisibleToken(token: string): string {
  return token.normalize("NFKC").toLocaleLowerCase();
}

/**
 * Tests whether an active target visibly matches the next required token.
 * @param state Current target-action state.
 * @param target Candidate target to compare with the expected word.
 * @returns Whether selecting the target is an unambiguous correct answer.
 */
export function isExpectedTarget(
  state: TargetActionState,
  target: TargetActionTarget,
): boolean {
  const expected = state.expectedTokens[state.expectedTokenIndex];
  return target.active && expected !== undefined &&
    normalizeVisibleToken(target.text) === normalizeVisibleToken(expected);
}

function createTargets(
  tokens: readonly string[],
  sentenceIndex: number,
  seed: number,
): TargetActionTarget[] {
  const columns = Math.max(2, Math.ceil(Math.sqrt(tokens.length)));
  const rows = Math.ceil(tokens.length / columns);
  const horizontalGap = 1_180 / Math.max(1, columns - 1);
  const verticalGap = 560 / Math.max(1, rows - 1);
  const positions = tokens.map((_, index) => ({
    x: Math.round(210 + (index % columns) * horizontalGap),
    y: Math.round(170 + Math.floor(index / columns) * verticalGap),
  }));
  const shuffledPositions = seededShuffle(
    positions,
    createSeededRandom(seed + sentenceIndex * 997),
  );

  return tokens.map((text, tokenIndex) => ({
    id: `${sentenceIndex}-${tokenIndex}`,
    text,
    tokenIndex,
    x: Math.min(WORLD_WIDTH - 120, shuffledPositions[tokenIndex]!.x),
    y: Math.min(WORLD_HEIGHT - 120, shuffledPositions[tokenIndex]!.y),
    active: true,
  }));
}

/**
 * Creates deterministic target-action learning state from a strict sentence array.
 * @param input Sentence pairs supplied by the host.
 * @param seed Reproducible session seed.
 * @returns Initial target-action state with stable token identities and positions.
 * @throws When the input is empty or any term or translation is blank.
 */
export function createTargetActionState(
  input: SentenceInput,
  seed: number,
): TargetActionState {
  if (input.length === 0) {
    throw new Error("Target Action requires at least one sentence");
  }
  if (input.some(({ translation }) => !translation.trim())) {
    throw new Error("Target Action requires non-empty translations");
  }
  const tokenizedSentences = input.map(({ term }) => tokenize(term));
  if (tokenizedSentences.some((tokens) => tokens.length === 0)) {
    throw new Error("Target Action requires every sentence to contain words");
  }
  const expectedTokens = tokenizedSentences[0]!;

  return {
    sentences: input,
    sentenceIndex: 0,
    expectedTokens,
    expectedTokenIndex: 0,
    targets: createTargets(expectedTokens, 0, seed),
    seed,
    score: 0,
    correctAnswers: 0,
    totalAttempts: 0,
    complete: false,
  };
}

/**
 * Applies one projectile collision to target-action learning state.
 * @param state Current deterministic target-action state.
 * @param targetId Stable target identity carried by the collided crystal.
 * @returns The original state for an ignored hit or a new progressed state.
 */
export function resolveTargetHit(
  state: TargetActionState,
  targetId: string,
): TargetActionState {
  if (state.complete) return state;
  const target = state.targets.find((candidate) => candidate.id === targetId);
  if (!target?.active) return state;

  const totalAttempts = state.totalAttempts + 1;
  const correct = isExpectedTarget(state, target);
  if (!correct) {
    return {
      ...state,
      score: Math.max(0, state.score - 25),
      totalAttempts,
    };
  }

  const correctAnswers = state.correctAnswers + 1;
  const score = state.score + 100;
  const targets = state.targets.map((candidate) =>
    candidate.id === targetId ? { ...candidate, active: false } : candidate,
  );
  const expectedTokenIndex = state.expectedTokenIndex + 1;
  if (expectedTokenIndex < state.expectedTokens.length) {
    return {
      ...state,
      targets,
      expectedTokenIndex,
      score,
      correctAnswers,
      totalAttempts,
    };
  }

  const sentenceIndex = state.sentenceIndex + 1;
  if (sentenceIndex >= state.sentences.length) {
    return {
      ...state,
      sentenceIndex,
      expectedTokenIndex,
      targets,
      score,
      correctAnswers,
      totalAttempts,
      complete: true,
      results: createGameResults(score, correctAnswers, totalAttempts),
    };
  }

  const expectedTokens = tokenize(state.sentences[sentenceIndex]!.term);
  return {
    ...state,
    sentenceIndex,
    expectedTokens,
    expectedTokenIndex: 0,
    targets: createTargets(expectedTokens, sentenceIndex, state.seed),
    score,
    correctAnswers,
    totalAttempts,
  };
}
