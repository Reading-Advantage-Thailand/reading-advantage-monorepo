/**
 * Evidence and results of a Griffin Riders Escape: one `sentence` item per sentence the griffin
 * flew gates for, `attempts` = wrong gates + 1, `correctFirstTry` = collected with no wrong gate,
 * `solved` = collected. `score` = the escape's own points. Courage and storms never count in the
 * evidence, and neither does speed.
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
import type { EscapeState } from './types.js';

export const GRIFFIN_RIDERS_ESCAPE_GAME_ID = 'griffin-riders-escape';

/** What the evidence needs from the story; a plain `SentenceInput` escape passes these by hand. */
export type EvidenceStory = { id: string; level: StoryGameEvidence['level'] };

/** One evidence item per sentence the student started or cleared, in escape order. */
export function evidenceItemsOf(state: EscapeState): StoryGameEvidenceItem[] {
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

export function evidenceOf(state: EscapeState, story: EvidenceStory, seed: number, durationMs: number): StoryGameEvidence {
  const items = evidenceItemsOf(state);
  return {
    schemaVersion: 1,
    kind: 'story-game',
    gameId: GRIFFIN_RIDERS_ESCAPE_GAME_ID,
    storyId: story.id,
    level: story.level,
    seed,
    durationMs: Math.max(0, Math.round(durationMs)),
    items,
    practice: practiceOf(items),
  };
}

/** The game's own score. */
export function scoreOf(state: EscapeState): number {
  return state.score;
}

/** Everything `complete()` takes: the evidence, the five-field results, and the outcome. */
export function resultsOf(
  state: EscapeState,
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
