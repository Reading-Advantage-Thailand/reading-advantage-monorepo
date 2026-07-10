import {
  sentenceInputSchema,
  type GameResults,
  type SentenceInput,
} from "@reading-advantage/game-contracts";

import {
  createIsometricStepGraph,
  getAdjacentStepNodes,
  isAdjacentStep,
  type IsometricStepGraph,
  type StepGraphNode,
  type StepGraphToken,
} from "../../families/isometric-step-graph";
import { createGameResults } from "../../internal/results";

/** Outcome of the most recent legal Ziggurat selection. */
export type ZigguratStepOutcome = "correct" | "incorrect";

/** Pure sentence-sequencing state consumed by the Phaser Ziggurat scene. */
export interface ZigguratState {
  /** Stable sentence array supplied by the host. */
  sentences: SentenceInput;
  /** Active sentence index. */
  sentenceIndex: number;
  /** Index of the next required word in the active sentence. */
  expectedTokenIndex: number;
  /** Translation displayed as the current meaning prompt. */
  activeTranslation: string;
  /** Deterministic graph for the active ritual tier. */
  graph: IsometricStepGraph;
  /** Cube currently occupied by the player. */
  currentNodeId: string;
  /** Correct cubes lit during the active ritual. */
  litNodeIds: readonly string[];
  /** Seed retained for deterministic sentence transitions. */
  seed: number;
  /** Current non-authoritative display score. */
  score: number;
  /** Number of correct adjacent selections. */
  correctAnswers: number;
  /** Number of all legal adjacent selections. */
  totalAttempts: number;
  /** Number of completed sentence rituals. */
  completedRituals: number;
  /** Most recent legal selection result. */
  lastOutcome?: ZigguratStepOutcome;
  /** Most recent legal target node. */
  lastSelectedNodeId?: string;
  /** Whether all sentence rituals are complete. */
  complete: boolean;
  /** Frozen five-field result available after completion. */
  results?: GameResults;
}

function tokenizeSentence(term: string, sentenceIndex: number): StepGraphToken[] {
  return term
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .map((text, tokenIndex) => ({ id: `${sentenceIndex}:${tokenIndex}`, text }));
}

function createSentenceGraph(
  sentences: SentenceInput,
  sentenceIndex: number,
  seed: number,
): IsometricStepGraph {
  return createIsometricStepGraph(
    tokenizeSentence(sentences[sentenceIndex]!.term, sentenceIndex),
    seed + sentenceIndex,
  );
}

/**
 * Creates validated deterministic state for all Ziggurat ritual tiers.
 * @param input Untrusted strict sentence pair array.
 * @param seed Reproducible graph seed.
 * @returns Initial pure Ziggurat state.
 * @throws When the array is empty or any sentence pair contains blank content.
 */
export function createZigguratState(
  input: SentenceInput | unknown,
  seed: number,
): ZigguratState {
  const sentences = sentenceInputSchema.parse(input);
  if (sentences.length === 0) {
    throw new Error("Sorcerer's Ziggurat requires at least one sentence");
  }
  if (sentences.some(({ term }) => tokenizeSentence(term, 0).length === 0)) {
    throw new Error("Sorcerer's Ziggurat requires every sentence to contain words");
  }
  if (sentences.some(({ translation }) => !translation.trim())) {
    throw new Error("Sorcerer's Ziggurat requires non-empty translations");
  }
  const graph = createSentenceGraph(sentences, 0, seed);
  return {
    sentences,
    sentenceIndex: 0,
    expectedTokenIndex: 0,
    activeTranslation: sentences[0]!.translation,
    graph,
    currentNodeId: graph.originNodeId,
    litNodeIds: [],
    seed,
    score: 0,
    correctAnswers: 0,
    totalAttempts: 0,
    completedRituals: 0,
    complete: false,
  };
}

/**
 * Finds the one correct cube adjacent to the current player position.
 * @param state Active Ziggurat state.
 * @returns The reachable cube that advances the ordered sentence.
 * @throws When state is complete or its graph violates the reachability invariant.
 */
export function getCorrectAdjacentNode(state: ZigguratState): StepGraphNode {
  const correct = getAdjacentStepNodes(state.graph, state.currentNodeId).find(
    (node) => node.correct,
  );
  if (!correct) {
    throw new Error("Ziggurat graph has no reachable correct step");
  }
  return correct;
}

/**
 * Applies one legal adjacent cube selection to immutable Ziggurat state.
 * @param state Current Ziggurat state.
 * @param targetNodeId Selected cube identity.
 * @returns Updated state, or the original object for completed/illegal selections.
 */
export function attemptZigguratStep(
  state: ZigguratState,
  targetNodeId: string,
): ZigguratState {
  if (
    state.complete ||
    !isAdjacentStep(state.graph, state.currentNodeId, targetNodeId)
  ) {
    return state;
  }
  const target = state.graph.nodes[targetNodeId]!;
  const totalAttempts = state.totalAttempts + 1;
  if (!target.correct) {
    return {
      ...state,
      score: state.score - 25,
      totalAttempts,
      lastOutcome: "incorrect",
      lastSelectedNodeId: target.id,
    };
  }

  const correctAnswers = state.correctAnswers + 1;
  const score = state.score + 100;
  const expectedTokenIndex = state.expectedTokenIndex + 1;
  const sentenceComplete = expectedTokenIndex >= state.graph.levels.length;
  if (!sentenceComplete) {
    return {
      ...state,
      expectedTokenIndex,
      currentNodeId: target.id,
      litNodeIds: [...state.litNodeIds, target.id],
      score,
      correctAnswers,
      totalAttempts,
      lastOutcome: "correct",
      lastSelectedNodeId: target.id,
    };
  }

  const completedRituals = state.completedRituals + 1;
  const sentenceIndex = state.sentenceIndex + 1;
  const complete = sentenceIndex >= state.sentences.length;
  if (complete) {
    return {
      ...state,
      sentenceIndex,
      expectedTokenIndex,
      currentNodeId: target.id,
      litNodeIds: [...state.litNodeIds, target.id],
      score,
      correctAnswers,
      totalAttempts,
      completedRituals,
      lastOutcome: "correct",
      lastSelectedNodeId: target.id,
      complete: true,
      results: createGameResults(score, correctAnswers, totalAttempts),
    };
  }

  const graph = createSentenceGraph(state.sentences, sentenceIndex, state.seed);
  return {
    ...state,
    sentenceIndex,
    expectedTokenIndex: 0,
    activeTranslation: state.sentences[sentenceIndex]!.translation,
    graph,
    currentNodeId: graph.originNodeId,
    litNodeIds: [],
    score,
    correctAnswers,
    totalAttempts,
    completedRituals,
    lastOutcome: "correct",
    lastSelectedNodeId: target.id,
  };
}
