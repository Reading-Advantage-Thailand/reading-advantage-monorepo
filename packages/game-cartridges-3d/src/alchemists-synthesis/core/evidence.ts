/**
 * Evidence and results of an Alchemist's Synthesis (section 5 of docs/game-alchemists-synthesis-3d.md):
 * one `word` item per formula the student chose a jar for, `attempts` = jars chosen,
 * `correctFirstTry` = the first jar was right, `solved` = the right jar was poured. Speed never
 * counts. `score` = 100 per right jar (the legacy number, the game's own score and not an XP rule).
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
import type { AlchemistsSynthesisState } from './types.js';

export const ALCHEMISTS_SYNTHESIS_GAME_ID = 'alchemists-synthesis';

/** What the evidence needs from the story; a plain `VocabularyInput` run passes these by hand. */
export type EvidenceStory = { id: string; level: StoryGameEvidence['level'] };

/** Score per right jar. */
export const SCORE = { jar: 100 } as const;

/** One evidence item per formula the student started or solved, in synthesis order. */
export function evidenceItemsOf(state: AlchemistsSynthesisState): StoryGameEvidenceItem[] {
  return state.words
    .filter((word) => word.started || word.solved)
    .map((word) => ({
      itemId: word.id,
      itemKind: 'word' as const,
      label: word.term,
      attempts: Math.max(1, word.attempts),
      correctFirstTry: word.solved && word.attempts === 1,
      solved: word.solved,
    }));
}

export function evidenceOf(
  state: AlchemistsSynthesisState,
  story: EvidenceStory,
  seed: number,
  durationMs: number,
): StoryGameEvidence {
  const items = evidenceItemsOf(state);
  return {
    schemaVersion: 1,
    kind: 'story-game',
    gameId: ALCHEMISTS_SYNTHESIS_GAME_ID,
    inputId: story.id,
    level: story.level,
    seed,
    durationMs: Math.max(0, Math.round(durationMs)),
    items,
    practice: practiceOf(items),
  };
}

/** The game's own score: 100 per right jar. */
export function scoreOf(state: AlchemistsSynthesisState): number {
  return state.correct * SCORE.jar;
}

/** Everything `complete()` takes: the evidence, the five-field results, and the outcome. */
export function resultsOf(
  state: AlchemistsSynthesisState,
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
