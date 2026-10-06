/**
 * Evidence and results of a Rune Forge Chamber (section 5 of docs/game-rune-forge-chamber-3d.md):
 * one `sentence` item per blade the student chose a rune for, `attempts` = wrong runes + 1,
 * `solved` = the sentence is forged. Speed never counts. `score` = 100 per forged word (the legacy
 * number, the game's own score and not an XP rule).
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
import type { RuneForgeChamberState } from './types.js';

export const RUNE_FORGE_CHAMBER_GAME_ID = 'rune-forge-chamber';

/** What the evidence needs from the story; a plain `SentenceInput` run passes these by hand. */
export type EvidenceStory = { id: string; level: StoryGameEvidence['level'] };

/** Score per forged word. */
export const SCORE = { word: 100 } as const;

/** One evidence item per blade the student started or forged, in forge order. */
export function evidenceItemsOf(state: RuneForgeChamberState): StoryGameEvidenceItem[] {
  return state.forge
    .filter((blade) => blade.started || blade.forged)
    .map((blade) => {
      const item: StoryGameEvidenceItem = {
        itemId: blade.id,
        itemKind: 'sentence',
        label: blade.text,
        attempts: blade.refusals + 1,
        correctFirstTry: blade.forged && blade.refusals === 0,
        solved: blade.forged,
      };
      if (blade.paragraph !== undefined) item.paragraph = blade.paragraph;
      return item;
    });
}

export function evidenceOf(state: RuneForgeChamberState, story: EvidenceStory, seed: number, durationMs: number): StoryGameEvidence {
  const items = evidenceItemsOf(state);
  return {
    schemaVersion: 1,
    kind: 'story-game',
    gameId: RUNE_FORGE_CHAMBER_GAME_ID,
    inputId: story.id,
    level: story.level,
    seed,
    durationMs: Math.max(0, Math.round(durationMs)),
    items,
    practice: practiceOf(items),
  };
}

/** The game's own score: 100 per forged word. */
export function scoreOf(state: RuneForgeChamberState): number {
  return state.wordsForged * SCORE.word;
}

/** Everything `complete()` takes: the evidence, the five-field results, and the outcome. */
export function resultsOf(
  state: RuneForgeChamberState,
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
