/**
 * Class challenges (the `challenge` field of a manifest): Hero vs. Zombie, Dragon Flight, and Dragon
 * Rider run a challenge from its APK `VocabularyInput` and the server's seed. The same seed and
 * content give the same run and the same results, and the evidence names a valid input.
 */
import { describe, expect, it } from 'vitest';
import {
  challengeCapabilitySchema,
  storyGameEvidenceSchema,
  toGameResults,
  type GameResults,
  type StoryGameEvidence,
  type VocabularyInput,
} from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createDragonFlight, evidenceOf as dragonFlightEvidence, scoreOf as dragonFlightScore } from '../../src/dragon-flight/core/index.js';
import { manifest as dragonFlight } from '../../src/dragon-flight/manifest.js';
import { createDragonRider, evidenceOf as dragonRiderEvidence, scoreOf as dragonRiderScore } from '../../src/dragon-rider/core/index.js';
import { manifest as dragonRider } from '../../src/dragon-rider/manifest.js';
import { createHeroVsZombie, evidenceOf as heroVsZombieEvidence, scoreOf as heroVsZombieScore } from '../../src/hero-vs-zombie/core/index.js';
import { manifest as heroVsZombie } from '../../src/hero-vs-zombie/manifest.js';
import { APK_INPUT_ID, evidenceStoryOf } from '../../src/shared/challenge.js';
import { fly } from '../dragon-flight/helpers.js';
import { ride } from '../dragon-rider/helpers.js';
import { playNight } from '../hero-vs-zombie/helpers.js';

/** A class challenge's content: the APK vocabulary items of the challenge. */
const CONTENT: VocabularyInput = [
  { term: 'cat', translation: 'แมว' },
  { term: 'dog', translation: 'หมา' },
  { term: 'bird', translation: 'นก' },
  { term: 'fish', translation: 'ปลา' },
  { term: 'tree', translation: 'ต้นไม้' },
  { term: 'house', translation: 'บ้าน' },
];

interface Run {
  snapshot: unknown;
  evidence: StoryGameEvidence;
  results: GameResults;
}

/** One challenge run per game: the same picks every time (round 1 is answered wrong first). */
const RUNS: Record<string, (seed: number) => Run> = {
  'hero-vs-zombie': (seed) => {
    const sim = createHeroVsZombie(CONTENT, { seed, helper: false });
    playNight(sim, (round, attempts) => round !== 1 || attempts > 0);
    const evidence = heroVsZombieEvidence(sim.state, evidenceStoryOf(CONTENT, heroVsZombie.levels), seed, 0);
    return { snapshot: sim.snapshot(), evidence, results: toGameResults(evidence, heroVsZombieScore(sim.state)) };
  },
  'dragon-flight': (seed) => {
    const sim = createDragonFlight(CONTENT, { seed, helper: false });
    fly(sim, (round) => round !== 1);
    const evidence = dragonFlightEvidence(sim.state, evidenceStoryOf(CONTENT, dragonFlight.levels), seed, 0);
    return { snapshot: sim.snapshot(), evidence, results: toGameResults(evidence, dragonFlightScore(sim.state)) };
  },
  'dragon-rider': (seed) => {
    const sim = createDragonRider(CONTENT, { seed });
    ride(sim, (round) => round !== 1);
    const evidence = dragonRiderEvidence(sim.state, evidenceStoryOf(CONTENT, dragonRider.levels), seed, 0);
    return { snapshot: sim.snapshot(), evidence, results: toGameResults(evidence, dragonRiderScore(sim.state)) };
  },
};

describe('class challenge games', () => {
  it('Hero vs. Zombie, Dragon Flight, and Dragon Rider declare a vocabulary challenge in reading and answer audio', () => {
    for (const manifest of [heroVsZombie, dragonFlight, dragonRider]) {
      expect(manifest.challenge).toEqual({ version: '2026-10-06.1', inputMode: 'vocabulary', modalities: ['reading', 'read-to-select-audio'] });
    }
  });

  for (const [id, run] of Object.entries(RUNS)) {
    it(`${id}: the same seed and content give the same run and results; the evidence is valid`, () => {
      const a = run(4242);
      const b = run(4242);
      expect(b.snapshot).toEqual(a.snapshot);
      expect(b.results).toEqual(a.results);
      expect(a.results.totalAttempts).toBeGreaterThan(a.results.correctAnswers);
      expect(a.results.correctAnswers).toBeGreaterThan(0);
      expect(storyGameEvidenceSchema.parse(a.evidence)).toEqual(a.evidence);
      expect(a.evidence.inputId).toBe(APK_INPUT_ID);
      // A different seed gives a different run on the same content.
      expect(run(4243).snapshot).not.toEqual(a.snapshot);
    });
  }
});

describe('evidenceStoryOf', () => {
  it('a practice input names itself; an APK input gets the APK id and the first level', () => {
    expect(evidenceStoryOf({ id: 'saved', level: 'A1' }, ['Pre-A1', 'A1'])).toEqual({ id: 'saved', level: 'A1' });
    expect(evidenceStoryOf(CONTENT, ['Pre-A1', 'A1'])).toEqual({ id: APK_INPUT_ID, level: 'Pre-A1' });
    expect(() => evidenceStoryOf(CONTENT, [])).toThrow('lists no level');
  });
});

describe('challengeCapabilitySchema', () => {
  it('takes the monorepo capability shape and rejects other shapes', () => {
    const ok = { version: '2026-10-06.1', inputMode: 'vocabulary', modalities: ['reading', 'read-to-select-audio'] };
    expect(challengeCapabilitySchema.parse(ok)).toEqual(ok);
    expect(challengeCapabilitySchema.safeParse({ ...ok, modalities: [] }).success).toBe(false);
    expect(challengeCapabilitySchema.safeParse({ ...ok, modalities: ['reading', 'reading'] }).success).toBe(false);
    expect(challengeCapabilitySchema.safeParse({ ...ok, modalities: ['listening'] }).success).toBe(false);
    expect(challengeCapabilitySchema.safeParse({ ...ok, inputMode: 'story' }).success).toBe(false);
    expect(challengeCapabilitySchema.safeParse({ ...ok, extra: 1 }).success).toBe(false);
  });
});
