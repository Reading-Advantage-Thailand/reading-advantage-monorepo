/**
 * Evidence and results of a Paladin's Twin Soul run: one `word` item per target word the student
 * struck a shade for; `attempts` = shades struck while the word was the target;
 * `correctFirstTry` = the first shade struck was the captor; `score` = points. Speed never counts.
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
import type { TwinSoulState } from './types.js';

export const TWIN_SOUL_GAME_ID = 'paladins-twin-soul';

/** What the evidence needs from the story; a plain `VocabularyInput` run passes these by hand. */
export type EvidenceStory = { id: string; level: StoryGameEvidence['level'] };

/** One evidence item per target word with at least one attempt, in target order. */
export function evidenceItemsOf(state: TwinSoulState): StoryGameEvidenceItem[] {
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

export function evidenceOf(state: TwinSoulState, story: EvidenceStory, seed: number, durationMs: number): StoryGameEvidence {
  const items = evidenceItemsOf(state);
  return {
    schemaVersion: 1,
    kind: 'story-game',
    gameId: TWIN_SOUL_GAME_ID,
    inputId: story.id,
    level: story.level,
    seed,
    durationMs: Math.max(0, Math.round(durationMs)),
    items,
    practice: practiceOf(items),
  };
}

/** The game's own score: the points of the run. */
export function scoreOf(state: TwinSoulState): number {
  return state.score;
}

/** Everything `complete()` takes: the evidence, the five-field results, and the outcome. */
export function resultsOf(
  state: TwinSoulState,
  story: EvidenceStory,
  seed: number,
  durationMs: number,
): { evidence: StoryGameEvidence; results: GameResults; outcome: StoryGameOutcome } {
  const evidence = evidenceOf(state, story, seed, durationMs);
  return { evidence, results: toGameResults(evidence, scoreOf(state)), outcome: toOutcome(state.phase === 'victory') };
}
