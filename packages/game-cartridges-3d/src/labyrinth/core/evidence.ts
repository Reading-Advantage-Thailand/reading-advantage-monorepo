/**
 * Evidence and results of a Labyrinth shift (section 6 of docs/game-labyrinth-3d.md): one
 * `sentence` item per sentence the student started or built, `attempts` = wrong orbs + 1,
 * `correctFirstTry` = built with no wrong orb, `solved` = built. Bumps never count.
 * `score` = the coins: 10 per right word and 30 per caught goblin. Speed gives nothing.
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
import type { LabyrinthState } from './types.js';

export const LABYRINTH_GAME_ID = 'labyrinth';

/** What the evidence needs from the story; a plain `SentenceInput` run passes these by hand. */
export type EvidenceStory = { id: string; level: StoryGameEvidence['level'] };

/** Coins per right word and per caught goblin. */
export const COINS = { word: 10, goblin: 30 } as const;

/** One evidence item per sentence the student started or built, in shift order. */
export function evidenceItemsOf(state: LabyrinthState): StoryGameEvidenceItem[] {
  return state.shift
    .filter((s) => s.started || s.built)
    .map((s) => {
      const item: StoryGameEvidenceItem = {
        itemId: s.id,
        itemKind: 'sentence',
        label: s.text,
        attempts: s.wrong + 1,
        correctFirstTry: s.built && s.wrong === 0,
        solved: s.built,
      };
      if (s.paragraph !== undefined) item.paragraph = s.paragraph;
      return item;
    });
}

export function evidenceOf(state: LabyrinthState, story: EvidenceStory, seed: number, durationMs: number): StoryGameEvidence {
  const items = evidenceItemsOf(state);
  return {
    schemaVersion: 1,
    kind: 'story-game',
    gameId: LABYRINTH_GAME_ID,
    storyId: story.id,
    level: story.level,
    seed,
    durationMs: Math.max(0, Math.round(durationMs)),
    items,
    practice: practiceOf(items),
  };
}

/** The game's own score: the coins. */
export function scoreOf(state: LabyrinthState): number {
  return state.coins;
}

/** Everything `complete()` takes: the evidence, the five-field results, and the outcome. */
export function resultsOf(
  state: LabyrinthState,
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
