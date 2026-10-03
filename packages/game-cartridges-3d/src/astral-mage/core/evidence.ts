/**
 * Evidence and results of an Astral Mage casting (section 6 of docs/game-astral-mage-3d.md):
 * one `sentence` item per ritual the student touched, `attempts` = fizzled bolts + 1,
 * `solved` = cleared. Speed never counts. `score` = 10 per struck word + 50 per cleared ritual.
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
import type { AstralMageState } from './types.js';

export const ASTRAL_MAGE_GAME_ID = 'astral-mage';

/** What the evidence needs from the story; a plain `SentenceInput` run passes these by hand. */
export type EvidenceStory = { id: string; level: StoryGameEvidence['level'] };

/** Score per struck word and per cleared ritual. */
export const SCORE = { struck: 10, ritual: 50 } as const;

/** One evidence item per ritual the student started or cleared, in casting order. */
export function evidenceItemsOf(state: AstralMageState): StoryGameEvidenceItem[] {
  return state.casting
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

export function evidenceOf(state: AstralMageState, story: EvidenceStory, seed: number, durationMs: number): StoryGameEvidence {
  const items = evidenceItemsOf(state);
  return {
    schemaVersion: 1,
    kind: 'story-game',
    gameId: ASTRAL_MAGE_GAME_ID,
    storyId: story.id,
    level: story.level,
    seed,
    durationMs: Math.max(0, Math.round(durationMs)),
    items,
    practice: practiceOf(items),
  };
}

/** The game's own score: struck words and cleared rituals. */
export function scoreOf(state: AstralMageState): number {
  return state.struck * SCORE.struck + state.ritualsCleared * SCORE.ritual;
}

/** Everything `complete()` takes: the evidence, the five-field results, and the outcome. */
export function resultsOf(
  state: AstralMageState,
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
