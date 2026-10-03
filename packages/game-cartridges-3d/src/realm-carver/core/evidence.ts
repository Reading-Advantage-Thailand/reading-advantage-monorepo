/**
 * Evidence and results of a Realm Carver campaign (section 6 of docs/game-realm-carver-3d.md):
 * one `sentence` item per realm the student touched, `attempts` = misses + 1, `solved` = cleared.
 * Setbacks by monsters never count. `score` = 10 per carved word + 50 per cleared realm.
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
import type { RealmCarverState } from './types.js';

export const REALM_CARVER_GAME_ID = 'realm-carver';

/** What the evidence needs from the story; a plain `SentenceInput` run passes these by hand. */
export type EvidenceStory = { id: string; level: StoryGameEvidence['level'] };

/** Score per carved word and per cleared realm. */
export const SCORE = { word: 10, realm: 50 } as const;

/** One evidence item per realm the student started or cleared, in campaign order. */
export function evidenceItemsOf(state: RealmCarverState): StoryGameEvidenceItem[] {
  return state.shift
    .filter((realm) => realm.started || realm.cleared)
    .map((realm) => {
      const item: StoryGameEvidenceItem = {
        itemId: realm.id,
        itemKind: 'sentence',
        label: realm.text,
        attempts: realm.misses + 1,
        correctFirstTry: realm.cleared && realm.misses === 0,
        solved: realm.cleared,
      };
      if (realm.paragraph !== undefined) item.paragraph = realm.paragraph;
      return item;
    });
}

export function evidenceOf(state: RealmCarverState, story: EvidenceStory, seed: number, durationMs: number): StoryGameEvidence {
  const items = evidenceItemsOf(state);
  return {
    schemaVersion: 1,
    kind: 'story-game',
    gameId: REALM_CARVER_GAME_ID,
    storyId: story.id,
    level: story.level,
    seed,
    durationMs: Math.max(0, Math.round(durationMs)),
    items,
    practice: practiceOf(items),
  };
}

/** The game's own score: carved words and cleared realms. */
export function scoreOf(state: RealmCarverState): number {
  return state.carved * SCORE.word + state.realmsCleared * SCORE.realm;
}

/** Everything `complete()` takes: the evidence, the five-field results, and the outcome. */
export function resultsOf(
  state: RealmCarverState,
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
