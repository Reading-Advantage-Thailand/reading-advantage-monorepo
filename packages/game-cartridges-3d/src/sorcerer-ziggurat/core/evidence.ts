/**
 * Evidence and results of a Sorcerer's Ziggurat climb: one `sentence` item per ritual the
 * student touched, `attempts` = crumbled cubes + 1, `solved` = cleared. Speed never counts.
 * `score` = 100 per tier climbed (as in the legacy game).
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
import type { ZigguratState } from './types.js';

export const SORCERER_ZIGGURAT_GAME_ID = 'sorcerer-ziggurat';

/** What the evidence needs from the story; a plain `SentenceInput` run passes these by hand. */
export type EvidenceStory = { id: string; level: StoryGameEvidence['level'] };

/** Score per tier climbed. */
export const SCORE = { step: 100 } as const;

/** One evidence item per ritual the student started or cleared, in climb order. */
export function evidenceItemsOf(state: ZigguratState): StoryGameEvidenceItem[] {
  return state.climb
    .filter((ritual) => ritual.started || ritual.cleared)
    .map((ritual) => {
      const item: StoryGameEvidenceItem = {
        itemId: ritual.id,
        itemKind: 'sentence',
        label: ritual.text,
        attempts: ritual.refusals + 1,
        correctFirstTry: ritual.cleared && ritual.refusals === 0,
        solved: ritual.cleared,
      };
      if (ritual.paragraph !== undefined) item.paragraph = ritual.paragraph;
      return item;
    });
}

export function evidenceOf(state: ZigguratState, story: EvidenceStory, seed: number, durationMs: number): StoryGameEvidence {
  const items = evidenceItemsOf(state);
  return {
    schemaVersion: 1,
    kind: 'story-game',
    gameId: SORCERER_ZIGGURAT_GAME_ID,
    storyId: story.id,
    level: story.level,
    seed,
    durationMs: Math.max(0, Math.round(durationMs)),
    items,
    practice: practiceOf(items),
  };
}

export function scoreOf(state: ZigguratState): number {
  return state.steps * SCORE.step;
}

/** Everything `complete()` takes: the evidence, the five-field results, and the outcome. */
export function resultsOf(
  state: ZigguratState,
  story: EvidenceStory,
  seed: number,
  durationMs: number,
): { evidence: StoryGameEvidence; results: GameResults; outcome: StoryGameOutcome } {
  const evidence = evidenceOf(state, story, seed, durationMs);
  return { evidence, results: toGameResults(evidence, scoreOf(state)), outcome: toOutcome(state.phase === 'complete') };
}
