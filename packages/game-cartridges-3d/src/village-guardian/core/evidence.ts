/**
 * Evidence and results of a Village Guardian watch (section 6 of
 * docs/game-village-guardian-3d.md): one `sentence` item per village the student touched,
 * `attempts` = refusals + 1, `solved` = cleared. Scares by threats never count.
 * `score` = 10 per rescued villager + 50 per cleared village.
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
import type { VillageGuardianState } from './types.js';

export const VILLAGE_GUARDIAN_GAME_ID = 'village-guardian';

/** What the evidence needs from the story; a plain `SentenceInput` run passes these by hand. */
export type EvidenceStory = { id: string; level: StoryGameEvidence['level'] };

/** Score per rescued villager and per cleared village. */
export const SCORE = { rescued: 10, village: 50 } as const;

/** One evidence item per village the student started or cleared, in watch order. */
export function evidenceItemsOf(state: VillageGuardianState): StoryGameEvidenceItem[] {
  return state.shift
    .filter((village) => village.started || village.cleared)
    .map((village) => {
      const item: StoryGameEvidenceItem = {
        itemId: village.id,
        itemKind: 'sentence',
        label: village.text,
        attempts: village.refusals + 1,
        correctFirstTry: village.cleared && village.refusals === 0,
        solved: village.cleared,
      };
      if (village.paragraph !== undefined) item.paragraph = village.paragraph;
      return item;
    });
}

export function evidenceOf(
  state: VillageGuardianState,
  story: EvidenceStory,
  seed: number,
  durationMs: number,
): StoryGameEvidence {
  const items = evidenceItemsOf(state);
  return {
    schemaVersion: 1,
    kind: 'story-game',
    gameId: VILLAGE_GUARDIAN_GAME_ID,
    inputId: story.id,
    level: story.level,
    seed,
    durationMs: Math.max(0, Math.round(durationMs)),
    items,
    practice: practiceOf(items),
  };
}

/** The game's own score: rescued villagers and cleared villages. */
export function scoreOf(state: VillageGuardianState): number {
  return state.rescued * SCORE.rescued + state.villagesCleared * SCORE.village;
}

/** Everything `complete()` takes: the evidence, the five-field results, and the outcome. */
export function resultsOf(
  state: VillageGuardianState,
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
