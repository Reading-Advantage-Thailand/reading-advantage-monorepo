/**
 * Evidence and results of a Rune Match run (section 6 of docs/game-rune-match-3d.md): one `word`
 * item per target word the student made a line for; `attempts` = line-making swaps while the
 * word was the target; `correctFirstTry` = the first line was the target's line; `score` = coins.
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
import type { RuneMatchState } from './types.js';

export const RUNE_MATCH_GAME_ID = 'rune-match';

/** What the evidence needs from the story; a plain `VocabularyInput` run passes these by hand. */
export type EvidenceStory = { id: string; level: StoryGameEvidence['level'] };

/** One evidence item per target word with at least one attempt, in target order. */
export function evidenceItemsOf(state: RuneMatchState): StoryGameEvidenceItem[] {
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

export function evidenceOf(
  state: RuneMatchState,
  story: EvidenceStory,
  seed: number,
  durationMs: number,
): StoryGameEvidence {
  const items = evidenceItemsOf(state);
  return {
    schemaVersion: 1,
    kind: 'story-game',
    gameId: RUNE_MATCH_GAME_ID,
    storyId: story.id,
    level: story.level,
    seed,
    durationMs: Math.max(0, Math.round(durationMs)),
    items,
    practice: practiceOf(items),
  };
}

/** The game's own score: the coins of the run. */
export function scoreOf(state: RuneMatchState): number {
  return state.coins;
}

/** Everything `complete()` takes: the evidence, the five-field results, and the outcome. */
export function resultsOf(
  state: RuneMatchState,
  story: EvidenceStory,
  seed: number,
  durationMs: number,
): { evidence: StoryGameEvidence; results: GameResults; outcome: StoryGameOutcome } {
  const evidence = evidenceOf(state, story, seed, durationMs);
  return {
    evidence,
    results: toGameResults(evidence, scoreOf(state)),
    outcome: toOutcome(state.phase === 'victory'),
  };
}
