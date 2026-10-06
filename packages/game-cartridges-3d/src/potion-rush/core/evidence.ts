/**
 * Evidence and results of a Potion Rush shift (section 7 of docs/game-potion-rush-3d.md): one
 * `sentence` item per order the student touched, `attempts` = wrong words + 1, `solved` =
 * served; `score` = coins. Speed changes the coins only, never the evidence.
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
import type { PotionRushState } from './types.js';

export const POTION_RUSH_GAME_ID = 'potion-rush';

/** What the evidence needs from the story; a plain `SentenceInput` run passes these by hand. */
export type EvidenceStory = { id: string; level: StoryGameEvidence['level'] };

/** One evidence item per order the student started or served, in shift order. */
export function evidenceItemsOf(state: PotionRushState): StoryGameEvidenceItem[] {
  return state.orders
    .filter((order) => order.started || order.served)
    .map((order) => {
      const item: StoryGameEvidenceItem = {
        itemId: order.id,
        itemKind: 'sentence',
        label: order.text,
        attempts: order.wrong + 1,
        correctFirstTry: order.served && order.wrong === 0,
        solved: order.served,
      };
      if (order.paragraph !== undefined) item.paragraph = order.paragraph;
      return item;
    });
}

export function evidenceOf(
  state: PotionRushState,
  story: EvidenceStory,
  seed: number,
  durationMs: number,
): StoryGameEvidence {
  const items = evidenceItemsOf(state);
  return {
    schemaVersion: 1,
    kind: 'story-game',
    gameId: POTION_RUSH_GAME_ID,
    inputId: story.id,
    level: story.level,
    seed,
    durationMs: Math.max(0, Math.round(durationMs)),
    items,
    practice: practiceOf(items),
  };
}

/** The game's own score: the coins of the shift (tips included). */
export function scoreOf(state: PotionRushState): number {
  return state.coins;
}

/** Everything `complete()` takes: the evidence, the five-field results, and the outcome. */
export function resultsOf(
  state: PotionRushState,
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
