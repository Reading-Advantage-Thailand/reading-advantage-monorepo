/**
 * Evidence and results of a Spellweaver's Run: one `sentence` item per sentence the student
 * chose an orb for, `attempts` = missed orbs + 1, `correctFirstTry` = cast with no missed orb,
 * `solved` = cast. `score` = the run's own points. Courage never counts in the evidence.
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
import type { SpellweaversState } from './types.js';

export const SPELLWEAVERS_RUN_GAME_ID = 'spellweavers-run';

/** What the evidence needs from the story; a plain `SentenceInput` run passes these by hand. */
export type EvidenceStory = { id: string; level: StoryGameEvidence['level'] };

/** One evidence item per sentence the student started or cast, in run order. */
export function evidenceItemsOf(state: SpellweaversState): StoryGameEvidenceItem[] {
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

export function evidenceOf(state: SpellweaversState, story: EvidenceStory, seed: number, durationMs: number): StoryGameEvidence {
  const items = evidenceItemsOf(state);
  return {
    schemaVersion: 1,
    kind: 'story-game',
    gameId: SPELLWEAVERS_RUN_GAME_ID,
    storyId: story.id,
    level: story.level,
    seed,
    durationMs: Math.max(0, Math.round(durationMs)),
    items,
    practice: practiceOf(items),
  };
}

/** The game's own score. */
export function scoreOf(state: SpellweaversState): number {
  return state.score;
}

/** Everything `complete()` takes: the evidence, the five-field results, and the outcome. */
export function resultsOf(
  state: SpellweaversState,
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
