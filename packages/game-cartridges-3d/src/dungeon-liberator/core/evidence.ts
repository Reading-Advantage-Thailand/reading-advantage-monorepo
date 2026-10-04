/**
 * Evidence and results of a Dungeon Liberator shift (section 6 of
 * docs/game-dungeon-liberator-3d.md): one `sentence` item per room the student touched,
 * `attempts` = refusals + 1, `solved` = cleared. Scatters by skeletons never count.
 * `score` = 10 per freed villager + 50 per cleared room.
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
import type { DungeonLiberatorState } from './types.js';

export const DUNGEON_LIBERATOR_GAME_ID = 'dungeon-liberator';

/** What the evidence needs from the story; a plain `SentenceInput` run passes these by hand. */
export type EvidenceStory = { id: string; level: StoryGameEvidence['level'] };

/** Score per freed villager and per cleared room. */
export const SCORE = { freed: 10, room: 50 } as const;

/** One evidence item per room the student started or cleared, in shift order. */
export function evidenceItemsOf(state: DungeonLiberatorState): StoryGameEvidenceItem[] {
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

export function evidenceOf(
  state: DungeonLiberatorState,
  story: EvidenceStory,
  seed: number,
  durationMs: number,
): StoryGameEvidence {
  const items = evidenceItemsOf(state);
  return {
    schemaVersion: 1,
    kind: 'story-game',
    gameId: DUNGEON_LIBERATOR_GAME_ID,
    inputId: story.id,
    level: story.level,
    seed,
    durationMs: Math.max(0, Math.round(durationMs)),
    items,
    practice: practiceOf(items),
  };
}

/** The game's own score: freed villagers and cleared rooms. */
export function scoreOf(state: DungeonLiberatorState): number {
  return state.freed * SCORE.freed + state.roomsCleared * SCORE.room;
}

/** Everything `complete()` takes: the evidence, the five-field results, and the outcome. */
export function resultsOf(
  state: DungeonLiberatorState,
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
