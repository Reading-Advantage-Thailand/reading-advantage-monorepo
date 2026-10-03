/**
 * Evidence and results of a Storm Castle Tower climb (section 6 of
 * docs/game-storm-castle-tower-3d.md): one `sentence` item per tower the student touched,
 * `attempts` = wrong windows + 1, `solved` = cleared. Hazard hits and speed never count.
 * `score` = 100 per right window (as in the legacy game).
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
import type { StormCastleTowerState } from './types.js';

export const STORM_CASTLE_TOWER_GAME_ID = 'storm-castle-tower';

/** What the evidence needs from the story; a plain `SentenceInput` run passes these by hand. */
export type EvidenceStory = { id: string; level: StoryGameEvidence['level'] };

/** Score per right window. */
export const SCORE = { word: 100 } as const;

/** One evidence item per tower the student started or cleared, in climb order. */
export function evidenceItemsOf(state: StormCastleTowerState): StoryGameEvidenceItem[] {
  return state.shift
    .filter((tower) => tower.started || tower.cleared)
    .map((tower) => {
      const item: StoryGameEvidenceItem = {
        itemId: tower.id,
        itemKind: 'sentence',
        label: tower.text,
        attempts: tower.refusals + 1,
        correctFirstTry: tower.cleared && tower.refusals === 0,
        solved: tower.cleared,
      };
      if (tower.paragraph !== undefined) item.paragraph = tower.paragraph;
      return item;
    });
}

export function evidenceOf(state: StormCastleTowerState, story: EvidenceStory, seed: number, durationMs: number): StoryGameEvidence {
  const items = evidenceItemsOf(state);
  return {
    schemaVersion: 1,
    kind: 'story-game',
    gameId: STORM_CASTLE_TOWER_GAME_ID,
    storyId: story.id,
    level: story.level,
    seed,
    durationMs: Math.max(0, Math.round(durationMs)),
    items,
    practice: practiceOf(items),
  };
}

/** The game's own score: right windows opened. */
export function scoreOf(state: StormCastleTowerState): number {
  return state.collected * SCORE.word;
}

/** Everything `complete()` takes: the evidence, the five-field results, and the outcome. */
export function resultsOf(
  state: StormCastleTowerState,
  story: EvidenceStory,
  seed: number,
  durationMs: number,
): { evidence: StoryGameEvidence; results: GameResults; outcome: StoryGameOutcome } {
  const evidence = evidenceOf(state, story, seed, durationMs);
  return { evidence, results: toGameResults(evidence, scoreOf(state)), outcome: toOutcome(state.phase === 'complete') };
}
