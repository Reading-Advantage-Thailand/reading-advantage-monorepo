/**
 * Evidence and results of a Dragon Flight (section 6 of docs/game-dragon-flight-3d.md): one
 * `word` item per story word the student chose a gate for, `attempts` = choices for that word,
 * `correctFirstTry`, `solved`; `score` = coins. The flock size changes the coins only, never the
 * evidence.
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
import type { DragonFlightState } from './types.js';

export const DRAGON_FLIGHT_GAME_ID = 'dragon-flight';

/** What the evidence needs from the story; a plain `VocabularyInput` run passes these by hand. */
export type EvidenceStory = { id: string; level: StoryGameEvidence['level'] };

/** One evidence item per word the student chose a gate for, in flight order. */
export function evidenceItemsOf(state: DragonFlightState): StoryGameEvidenceItem[] {
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

export function evidenceOf(
  state: DragonFlightState,
  story: EvidenceStory,
  seed: number,
  durationMs: number,
): StoryGameEvidence {
  const items = evidenceItemsOf(state);
  return {
    schemaVersion: 1,
    kind: 'story-game',
    gameId: DRAGON_FLIGHT_GAME_ID,
    storyId: story.id,
    level: story.level,
    seed,
    durationMs: Math.max(0, Math.round(durationMs)),
    items,
    practice: practiceOf(items),
  };
}

/** The game's own score: the coins of the flight. */
export function scoreOf(state: DragonFlightState): number {
  return state.coins;
}

/** Everything `complete()` takes: the evidence, the five-field results, and the outcome. */
export function resultsOf(
  state: DragonFlightState,
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
