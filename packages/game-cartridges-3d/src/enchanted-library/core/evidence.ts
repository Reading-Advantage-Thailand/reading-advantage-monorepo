/**
 * Evidence and results of an Enchanted Library visit: one `word` item per round the student
 * touched, `attempts` = wrong books + 1, `solved` = the right book collected. Spirits and speed
 * never count. `score` = 100 per right book (as in the legacy game).
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
import type { LibraryState } from './types.js';

export const ENCHANTED_LIBRARY_GAME_ID = 'enchanted-library';

/** What the evidence needs from the story; a plain `VocabularyInput` run passes these by hand. */
export type EvidenceStory = { id: string; level: StoryGameEvidence['level'] };

/** Score per right book. */
export const SCORE = { book: 100 } as const;

/** One evidence item per round the student started or cleared, in visit order. */
export function evidenceItemsOf(state: LibraryState): StoryGameEvidenceItem[] {
  return state.rounds
    .filter((round) => round.started || round.cleared)
    .map((round) => ({
      itemId: round.id,
      itemKind: 'word' as const,
      label: round.term,
      attempts: round.wrong + 1,
      correctFirstTry: round.cleared && round.wrong === 0,
      solved: round.cleared,
    }));
}

export function evidenceOf(state: LibraryState, story: EvidenceStory, seed: number, durationMs: number): StoryGameEvidence {
  const items = evidenceItemsOf(state);
  return {
    schemaVersion: 1,
    kind: 'story-game',
    gameId: ENCHANTED_LIBRARY_GAME_ID,
    storyId: story.id,
    level: story.level,
    seed,
    durationMs: Math.max(0, Math.round(durationMs)),
    items,
    practice: practiceOf(items),
  };
}

export function scoreOf(state: LibraryState): number {
  return state.collected * SCORE.book;
}

/** Everything `complete()` takes: the evidence, the five-field results, and the outcome. */
export function resultsOf(
  state: LibraryState,
  story: EvidenceStory,
  seed: number,
  durationMs: number,
): { evidence: StoryGameEvidence; results: GameResults; outcome: StoryGameOutcome } {
  const evidence = evidenceOf(state, story, seed, durationMs);
  return { evidence, results: toGameResults(evidence, scoreOf(state)), outcome: toOutcome(state.phase === 'complete') };
}
