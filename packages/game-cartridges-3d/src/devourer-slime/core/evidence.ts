/**
 * Evidence and results of a Devourer Slime shift (section 6 of docs/game-devourer-slime-3d.md):
 * one `sentence` item per sentence the student touched, `attempts` = wrong words + 1, `solved` =
 * complete. Bumps by guards never count. `score` = coins (from eaten guards).
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
import type { DevourerSlimeState } from './types.js';

export const DEVOURER_SLIME_GAME_ID = 'devourer-slime';

/** What the evidence needs from the story; a plain `SentenceInput` run passes these by hand. */
export type EvidenceStory = { id: string; level: StoryGameEvidence['level'] };

/** One evidence item per sentence the student started or completed, in shift order. */
export function evidenceItemsOf(state: DevourerSlimeState): StoryGameEvidenceItem[] {
  return state.shift
    .filter((s) => s.started || s.complete)
    .map((s) => {
      const item: StoryGameEvidenceItem = {
        itemId: s.id,
        itemKind: 'sentence',
        label: s.text,
        attempts: s.wrong + 1,
        correctFirstTry: s.complete && s.wrong === 0,
        solved: s.complete,
      };
      if (s.paragraph !== undefined) item.paragraph = s.paragraph;
      return item;
    });
}

export function evidenceOf(
  state: DevourerSlimeState,
  story: EvidenceStory,
  seed: number,
  durationMs: number,
): StoryGameEvidence {
  const items = evidenceItemsOf(state);
  return {
    schemaVersion: 1,
    kind: 'story-game',
    gameId: DEVOURER_SLIME_GAME_ID,
    storyId: story.id,
    level: story.level,
    seed,
    durationMs: Math.max(0, Math.round(durationMs)),
    items,
    practice: practiceOf(items),
  };
}

/** The game's own score: the coins of the shift (eaten guards). */
export function scoreOf(state: DevourerSlimeState): number {
  return state.coins;
}

/** Everything `complete()` takes: the evidence, the five-field results, and the outcome. */
export function resultsOf(
  state: DevourerSlimeState,
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
