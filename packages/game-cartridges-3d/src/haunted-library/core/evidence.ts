/**
 * Evidence and results of a Haunted Library visit: one `sentence` item per room the student
 * touched, `attempts` = wrong doors + 1, `solved` = cleared. Ghosts and bats never count.
 * `score` = 100 per door opened in order (as in the legacy game).
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
import type { LibraryState } from './types.js';

export const HAUNTED_LIBRARY_GAME_ID = 'haunted-library';

/** What the evidence needs from the story; a plain `SentenceInput` run passes these by hand. */
export type EvidenceStory = { id: string; level: StoryGameEvidence['level'] };

/** Score per door opened in order. */
export const SCORE = { door: 100 } as const;

/** One evidence item per room the student started or cleared, in visit order. */
export function evidenceItemsOf(state: LibraryState): StoryGameEvidenceItem[] {
  return state.shift
    .filter((room) => room.started || room.cleared)
    .map((room) => {
      const item: StoryGameEvidenceItem = {
        itemId: room.id,
        itemKind: 'sentence',
        label: room.text,
        attempts: room.refusals + 1,
        correctFirstTry: room.cleared && room.refusals === 0,
        solved: room.cleared,
      };
      if (room.paragraph !== undefined) item.paragraph = room.paragraph;
      return item;
    });
}

export function evidenceOf(state: LibraryState, story: EvidenceStory, seed: number, durationMs: number): StoryGameEvidence {
  const items = evidenceItemsOf(state);
  return {
    schemaVersion: 1,
    kind: 'story-game',
    gameId: HAUNTED_LIBRARY_GAME_ID,
    inputId: story.id,
    level: story.level,
    seed,
    durationMs: Math.max(0, Math.round(durationMs)),
    items,
    practice: practiceOf(items),
  };
}

export function scoreOf(state: LibraryState): number {
  return state.opened * SCORE.door;
}

/** Everything `complete()` takes: the evidence, the five-field results, and the outcome. */
export function resultsOf(
  state: LibraryState,
  story: EvidenceStory,
  seed: number,
  durationMs: number,
): { evidence: StoryGameEvidence; results: GameResults; outcome: StoryGameOutcome } {
  const evidence = evidenceOf(state, story, seed, durationMs);
  return { evidence, results: toGameResults(evidence, scoreOf(state)), outcome: toOutcome(state.phase === 'complete') };
}
