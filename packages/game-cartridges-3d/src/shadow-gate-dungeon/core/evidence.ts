/**
 * Evidence and results of a Shadow Gate Dungeon delve (section 6 of
 * docs/game-shadow-gate-dungeon-3d.md): one `sentence` item per room the student touched,
 * `attempts` = wrong crystals + 1, `solved` = cleared. Shadow bumps never count.
 * `score` = 10 per word crystal taken + 50 per cleared room.
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
import type { ShadowGateState } from './types.js';

export const SHADOW_GATE_GAME_ID = 'shadow-gate-dungeon';

/** What the evidence needs from the story; a plain `SentenceInput` run passes these by hand. */
export type EvidenceStory = { id: string; level: StoryGameEvidence['level'] };

/** Score per word crystal taken and per cleared room. */
export const SCORE = { word: 10, room: 50 } as const;

/** One evidence item per room the student started or cleared, in delve order. */
export function evidenceItemsOf(state: ShadowGateState): StoryGameEvidenceItem[] {
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
  state: ShadowGateState,
  story: EvidenceStory,
  seed: number,
  durationMs: number,
): StoryGameEvidence {
  const items = evidenceItemsOf(state);
  return {
    schemaVersion: 1,
    kind: 'story-game',
    gameId: SHADOW_GATE_GAME_ID,
    storyId: story.id,
    level: story.level,
    seed,
    durationMs: Math.max(0, Math.round(durationMs)),
    items,
    practice: practiceOf(items),
  };
}

/** The game's own score: word crystals taken and cleared rooms. */
export function scoreOf(state: ShadowGateState): number {
  return state.collected * SCORE.word + state.roomsCleared * SCORE.room;
}

/** Everything `complete()` takes: the evidence, the five-field results, and the outcome. */
export function resultsOf(
  state: ShadowGateState,
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
