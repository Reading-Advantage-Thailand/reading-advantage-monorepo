/**
 * Evidence and results of a Hero vs. Zombie night (section 6 of docs/game-hero-vs-zombie-3d.md):
 * one `word` item per story word the student touched an orb for, `attempts` = orb touches for
 * that word, `correctFirstTry`, `solved`; `score` = coins. Zombie bumps are never a reading
 * error and do not appear in the evidence.
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
import type { HeroVsZombieState } from './types.js';

export const HERO_VS_ZOMBIE_GAME_ID = 'hero-vs-zombie';

/** What the evidence needs from the story; a plain `VocabularyInput` run passes these by hand. */
export type EvidenceStory = { id: string; level: StoryGameEvidence['level'] };

/** One evidence item per word the student touched an orb for, in night order. */
export function evidenceItemsOf(state: HeroVsZombieState): StoryGameEvidenceItem[] {
  return state.words
    .filter((word) => word.attempts > 0)
    .map((word) => ({
      itemId: word.id,
      itemKind: 'word' as const,
      label: word.term,
      attempts: word.attempts,
      correctFirstTry: word.solved && word.attempts === 1,
      solved: word.solved,
    }));
}

export function evidenceOf(
  state: HeroVsZombieState,
  story: EvidenceStory,
  seed: number,
  durationMs: number,
): StoryGameEvidence {
  const items = evidenceItemsOf(state);
  return {
    schemaVersion: 1,
    kind: 'story-game',
    gameId: HERO_VS_ZOMBIE_GAME_ID,
    inputId: story.id,
    level: story.level,
    seed,
    durationMs: Math.max(0, Math.round(durationMs)),
    items,
    practice: practiceOf(items),
  };
}

/** The game's own score: the coins of the night. */
export function scoreOf(state: HeroVsZombieState): number {
  return state.coins;
}

/** Everything `complete()` takes: the evidence, the five-field results, and the outcome. */
export function resultsOf(
  state: HeroVsZombieState,
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
