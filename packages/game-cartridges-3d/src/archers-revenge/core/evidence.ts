/**
 * Evidence and results of an Archer's Revenge run: one `word` item per story word (every word is
 * hit before the victory); `attempts` = arrows shot while the word was the prompt;
 * `correctFirstTry` = the first arrow hit the right enemy; `score` = coins.
 */
import {
  practiceOf,
  toGameResults,
  toOutcome,
  type GameResults,
  type StoryGameEvidence,
  type StoryGameEvidenceItem,
  type StoryGameOutcome,
} from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { ArchersRevengeState } from './types.js';

export const ARCHERS_REVENGE_GAME_ID = 'archers-revenge';

/** What the evidence needs from the story; a plain `VocabularyInput` run passes these by hand. */
export type EvidenceStory = { id: string; level: StoryGameEvidence['level'] };

/** One evidence item per word with at least one arrow, in target order. */
export function evidenceItemsOf(state: ArchersRevengeState): StoryGameEvidenceItem[] {
  return state.targets
    .filter((word) => word.attempts > 0)
    .map((word) => ({
      itemId: word.id,
      itemKind: 'word',
      label: word.term,
      attempts: word.attempts,
      correctFirstTry: word.correctFirstTry,
      solved: word.solved,
    }));
}

export function evidenceOf(state: ArchersRevengeState, story: EvidenceStory, seed: number, durationMs: number): StoryGameEvidence {
  const items = evidenceItemsOf(state);
  return {
    schemaVersion: 1,
    kind: 'story-game',
    gameId: ARCHERS_REVENGE_GAME_ID,
    inputId: story.id,
    level: story.level,
    seed,
    durationMs: Math.max(0, Math.round(durationMs)),
    items,
    practice: practiceOf(items),
  };
}

/** The game's own score: the coins of the run. */
export const scoreOf = (state: ArchersRevengeState): number => state.coins;

/** Everything `complete()` takes: the evidence, the five-field results, and the outcome. */
export function resultsOf(
  state: ArchersRevengeState,
  story: EvidenceStory,
  seed: number,
  durationMs: number,
): { evidence: StoryGameEvidence; results: GameResults; outcome: StoryGameOutcome } {
  const evidence = evidenceOf(state, story, seed, durationMs);
  return { evidence, results: toGameResults(evidence, scoreOf(state)), outcome: toOutcome(state.phase === 'victory') };
}
