/**
 * Evidence and results of a Griffin Sky-Joust: one `sentence` item per sentence the student
 * struck a rider of, `attempts` = wrong strikes + 1, `correctFirstTry` = whole with no wrong
 * strike, `solved` = whole. `score` = the game's own points. Courage never counts in the evidence.
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
import type { JoustState } from './types.js';

export const GRIFFIN_SKY_JOUST_GAME_ID = 'griffin-sky-joust';

/** What the evidence needs from the story; a plain `SentenceInput` run passes these by hand. */
export type EvidenceStory = { id: string; level: StoryGameEvidence['level'] };

/** One evidence item per sentence the student struck a rider of, in game order. */
export function evidenceItemsOf(state: JoustState): StoryGameEvidenceItem[] {
  return state.sentences
    .filter((sentence) => sentence.started || sentence.cleared)
    .map((sentence) => {
      const item: StoryGameEvidenceItem = {
        itemId: sentence.id,
        itemKind: 'sentence',
        label: sentence.text,
        attempts: sentence.misses + 1,
        correctFirstTry: sentence.cleared && sentence.misses === 0,
        solved: sentence.cleared,
      };
      if (sentence.paragraph !== undefined) item.paragraph = sentence.paragraph;
      return item;
    });
}

export function evidenceOf(state: JoustState, story: EvidenceStory, seed: number, durationMs: number): StoryGameEvidence {
  const items = evidenceItemsOf(state);
  return {
    schemaVersion: 1,
    kind: 'story-game',
    gameId: GRIFFIN_SKY_JOUST_GAME_ID,
    inputId: story.id,
    level: story.level,
    seed,
    durationMs: Math.max(0, Math.round(durationMs)),
    items,
    practice: practiceOf(items),
  };
}

/** The game's own score. */
export function scoreOf(state: JoustState): number {
  return state.score;
}

/** Everything `complete()` takes: the evidence, the five-field results, and the outcome. */
export function resultsOf(
  state: JoustState,
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
