/**
 * Evidence and results of a Castle Defense run: one `sentence` item per sentence the student
 * touched (every sentence is built before the victory); `attempts` = wrong words + 1;
 * `correctFirstTry` = the sentence was built with no wrong word; `score` = coins.
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
import type { CastleDefenseState } from './types.js';

export const CASTLE_DEFENSE_GAME_ID = 'castle-defense';

/** What the evidence needs from the story; a plain `SentenceInput` run passes these by hand. */
export type EvidenceStory = { id: string; level: StoryGameEvidence['level'] };

/** One evidence item per sentence the student started or cleared, in wave order. */
export function evidenceItemsOf(state: CastleDefenseState): StoryGameEvidenceItem[] {
  return state.shift
    .filter((s) => s.started || s.cleared)
    .map((s) => {
      const item: StoryGameEvidenceItem = {
        itemId: s.id,
        itemKind: 'sentence',
        label: s.text,
        attempts: s.wrongs + 1,
        correctFirstTry: s.cleared && s.wrongs === 0,
        solved: s.cleared,
      };
      if (s.paragraph !== undefined) item.paragraph = s.paragraph;
      return item;
    });
}

export function evidenceOf(state: CastleDefenseState, story: EvidenceStory, seed: number, durationMs: number): StoryGameEvidence {
  const items = evidenceItemsOf(state);
  return {
    schemaVersion: 1,
    kind: 'story-game',
    gameId: CASTLE_DEFENSE_GAME_ID,
    storyId: story.id,
    level: story.level,
    seed,
    durationMs: Math.max(0, Math.round(durationMs)),
    items,
    practice: practiceOf(items),
  };
}

/** The game's own score: the coins of the run. Speed never counts. */
export const scoreOf = (state: CastleDefenseState): number => state.coins;

/** Everything `complete()` takes: the evidence, the five-field results, and the outcome. */
export function resultsOf(
  state: CastleDefenseState,
  story: EvidenceStory,
  seed: number,
  durationMs: number,
): { evidence: StoryGameEvidence; results: GameResults; outcome: StoryGameOutcome } {
  const evidence = evidenceOf(state, story, seed, durationMs);
  return { evidence, results: toGameResults(evidence, scoreOf(state)), outcome: toOutcome(state.phase === 'victory') };
}
