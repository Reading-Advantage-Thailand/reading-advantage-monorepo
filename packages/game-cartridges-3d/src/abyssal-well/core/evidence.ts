/**
 * Evidence and results of an Abyssal Well run: one `sentence` item per descent the student
 * touched, `attempts` = arrows that bounced + 1, `solved` = cleared. Speed never counts.
 * `score` = 10 per word hit + 50 per cleared descent.
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
import { TUNING } from './sim.js';
import type { AbyssalWellState } from './types.js';

export const ABYSSAL_WELL_GAME_ID = 'abyssal-well';

/** What the evidence needs from the story; a plain `SentenceInput` run passes these by hand. */
export type EvidenceStory = { id: string; level: StoryGameEvidence['level'] };

/** One evidence item per descent the student started or cleared, in run order. */
export function evidenceItemsOf(state: AbyssalWellState): StoryGameEvidenceItem[] {
  return state.descents
    .filter((d) => d.started || d.cleared)
    .map((d) => {
      const item: StoryGameEvidenceItem = {
        itemId: d.id,
        itemKind: 'sentence',
        label: d.text,
        attempts: d.refusals + 1,
        correctFirstTry: d.cleared && d.refusals === 0,
        solved: d.cleared,
      };
      if (d.paragraph !== undefined) item.paragraph = d.paragraph;
      return item;
    });
}

export function evidenceOf(state: AbyssalWellState, story: EvidenceStory, seed: number, durationMs: number): StoryGameEvidence {
  const items = evidenceItemsOf(state);
  return {
    schemaVersion: 1,
    kind: 'story-game',
    gameId: ABYSSAL_WELL_GAME_ID,
    storyId: story.id,
    level: story.level,
    seed,
    durationMs: Math.max(0, Math.round(durationMs)),
    items,
    practice: practiceOf(items),
  };
}

/** The game's own score: words hit and descents cleared. */
export const scoreOf = (state: AbyssalWellState): number => state.struck * TUNING.wordScore + state.descentsCleared * TUNING.descentScore;

/** Everything `complete()` takes: the evidence, the five-field results, and the outcome. */
export function resultsOf(
  state: AbyssalWellState,
  story: EvidenceStory,
  seed: number,
  durationMs: number,
): { evidence: StoryGameEvidence; results: GameResults; outcome: StoryGameOutcome } {
  const evidence = evidenceOf(state, story, seed, durationMs);
  return { evidence, results: toGameResults(evidence, scoreOf(state)), outcome: toOutcome(state.phase === 'complete') };
}
