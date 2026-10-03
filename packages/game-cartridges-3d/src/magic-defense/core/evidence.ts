/**
 * Evidence and results of an Magic Defense run: one `word` item per story word (every word is
 * hit before the victory); `attempts` = spells chosen while the word was the prompt;
 * `correctFirstTry` = the first spell was the right word; `score` = coins.
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
import type { MagicDefenseState } from './types.js';

export const MAGIC_DEFENSE_GAME_ID = 'magic-defense';

/** What the evidence needs from the story; a plain `VocabularyInput` run passes these by hand. */
export type EvidenceStory = { id: string; level: StoryGameEvidence['level'] };

/** One evidence item per word with at least one spell, in target order. */
export function evidenceItemsOf(state: MagicDefenseState): StoryGameEvidenceItem[] {
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

export function evidenceOf(state: MagicDefenseState, story: EvidenceStory, seed: number, durationMs: number): StoryGameEvidence {
  const items = evidenceItemsOf(state);
  return {
    schemaVersion: 1,
    kind: 'story-game',
    gameId: MAGIC_DEFENSE_GAME_ID,
    storyId: story.id,
    level: story.level,
    seed,
    durationMs: Math.max(0, Math.round(durationMs)),
    items,
    practice: practiceOf(items),
  };
}

/** The game's own score: the coins of the run. */
export const scoreOf = (state: MagicDefenseState): number => state.coins;

/** Everything `complete()` takes: the evidence, the five-field results, and the outcome. */
export function resultsOf(
  state: MagicDefenseState,
  story: EvidenceStory,
  seed: number,
  durationMs: number,
): { evidence: StoryGameEvidence; results: GameResults; outcome: StoryGameOutcome } {
  const evidence = evidenceOf(state, story, seed, durationMs);
  return { evidence, results: toGameResults(evidence, scoreOf(state)), outcome: toOutcome(state.phase === 'victory') };
}
