/**
 * Evidence and results of a Dragon Rider ride: one `word` item per story word the student chose
 * a gate for, `attempts` = choices for that word, `correctFirstTry`, `solved`; `score` = coins.
 * The flock size and the duel change the coins only, never the evidence.
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
import type { DragonRiderState } from './types.js';

export const DRAGON_RIDER_GAME_ID = 'dragon-rider';

export type EvidenceStory = { id: string; level: StoryGameEvidence['level'] };

/** One evidence item per word the student chose a gate for, in ride order. */
export function evidenceItemsOf(state: DragonRiderState): StoryGameEvidenceItem[] {
  return state.words
    .filter((word) => word.attempts > 0)
    .map((word) => ({
      itemId: word.id,
      itemKind: 'word' as const,
      label: word.term,
      attempts: word.attempts,
      correctFirstTry: word.solved && word.attempts === 1,
      solved: word.solved,
    }));
}

export function evidenceOf(state: DragonRiderState, story: EvidenceStory, seed: number, durationMs: number): StoryGameEvidence {
  const items = evidenceItemsOf(state);
  return {
    schemaVersion: 1,
    kind: 'story-game',
    gameId: DRAGON_RIDER_GAME_ID,
    storyId: story.id,
    level: story.level,
    seed,
    durationMs: Math.max(0, Math.round(durationMs)),
    items,
    practice: practiceOf(items),
  };
}

/** The game's own score: the coins of the ride. */
export function scoreOf(state: DragonRiderState): number {
  return state.coins;
}

export function resultsOf(
  state: DragonRiderState,
  story: EvidenceStory,
  seed: number,
  durationMs: number,
): { evidence: StoryGameEvidence; results: GameResults; outcome: StoryGameOutcome } {
  const evidence = evidenceOf(state, story, seed, durationMs);
  return {
    evidence,
    results: toGameResults(evidence, scoreOf(state)),
    outcome: toOutcome(state.phase === 'complete'),
  };
}
