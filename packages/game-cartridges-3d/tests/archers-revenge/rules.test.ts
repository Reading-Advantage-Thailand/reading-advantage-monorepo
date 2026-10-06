/** The Archer's Revenge rules: waves, lanes, shields, courage, and the evidence. */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  ARCHERS_REVENGE_EVENT_TYPES,
  TUNING,
  createArchersRevenge,
  evidenceOf,
  formationOf,
  resultsOf,
  roundOf,
  targetsOf,
  waveSizes,
  wordsOf,
} from '../../src/archers-revenge/core/index.js';
import { SHORT_STORY, STORY, create, ofType, playToEnd, rightLane, shootRight, shootWrong, types, wrongLane } from './helpers.js';

const SEEDS = Array.from({ length: 30 }, (_, i) => i + 1);

describe('content', () => {
  it('targets every story word once, in a seeded order, in evenly sized waves', () => {
    const targets = targetsOf(STORY, createRng(3), TUNING.wordsPerWave);
    expect(targets).toHaveLength(STORY.vocabulary.length);
    expect(new Set(targets.map((t) => t.id)).size).toBe(STORY.vocabulary.length);
    for (const t of targets) {
      const w = STORY.vocabulary.find((v) => v.id === t.id)!;
      expect([t.term, t.translation]).toEqual([w.term, w.translation]);
      expect(t).toMatchObject({ attempts: 0, correctFirstTry: false, solved: false });
    }
    expect(targetsOf(STORY, createRng(3), 5).map((t) => t.id)).toEqual(targets.map((t) => t.id));
    expect(targetsOf(STORY, createRng(4), 5).map((t) => t.id)).not.toEqual(targets.map((t) => t.id));
  });

  it('waveSizes spreads the words evenly', () => {
    expect(waveSizes(11, 5)).toEqual([4, 4, 3]);
    expect(waveSizes(10, 5)).toEqual([5, 5]);
    expect(waveSizes(6, 5)).toEqual([3, 3]);
    expect(waveSizes(4, 5)).toEqual([4]);
    expect(waveSizes(0, 5)).toEqual([]);
  });

  it('accepts the APK VocabularyInput too', () => {
    const input = [{ term: 'cat', translation: 'แมว' }, { term: '', translation: 'x' }, { term: 'dog', translation: 'หมา' }, { term: 'fish', translation: 'ปลา' }];
    expect(wordsOf(input).map((w) => w.id)).toEqual(['w-1', 'w-3', 'w-4']);
    const sim = createArchersRevenge(input, { seed: 1, helper: false });
    expect(sim.state.targetCount).toBe(3);
    playToEnd(sim);
    expect(sim.state.phase).toBe('victory');
  });

  it('a formation alternates the monster kinds, and ids are unique per wave and lane', () => {
    const a = formationOf(1, 3);
    expect(a.map((e) => e.kind)).toEqual(['mimic', 'skeleton', 'mimic']);
    expect(formationOf(2, 3).map((e) => e.kind)).toEqual(['skeleton', 'mimic', 'skeleton']);
    expect(new Set([...a, ...formationOf(2, 3)].map((e) => e.id)).size).toBe(6);
  });

  it('a round carries the right word once and distinct other words', () => {
    const targets = targetsOf(STORY, createRng(2), 5);
    const enemies = formationOf(1, 3);
    const rng = createRng(9);
    for (const t of targets) {
      const round = roundOf(targets, t.id, enemies, rng);
      expect(round.prompt).toBe(t.translation);
      expect(round.lanes).toHaveLength(3);
      expect(round.lanes.filter((l) => l.wordId === t.id)).toHaveLength(1);
      expect(new Set(round.lanes.map((l) => l.term.toLowerCase())).size).toBe(3);
      expect(round.lanes.every((l) => !l.blocked)).toBe(true);
    }
  });
});

describe('the run', () => {
  it('start shows the first formation and the first prompt, once', () => {
    const sim = create(5);
    expect(types(sim.dispatch({ type: 'fire', lane: 0 }))).toEqual(['rejected']);
    const events = sim.dispatch({ type: 'start' });
    expect(types(events)).toEqual(['waveAppeared', 'roundShown']);
    expect(ofType(events, 'waveAppeared')[0]).toMatchObject({ wave: 1, waveCount: sim.state.waveCount });
    expect(ofType(events, 'waveAppeared')[0]!.enemies).toHaveLength(TUNING.lanes);
    expect(types(sim.dispatch({ type: 'start' }))).toEqual(['rejected']);
  });

  it('Helper mode has 2 lanes', () => {
    const sim = create(5, true);
    expect(sim.state.enemies).toHaveLength(TUNING.helperLanes);
    expect(sim.state.round!.lanes).toHaveLength(TUNING.helperLanes);
  });

  it('a right arrow scores coins that grow with the streak and shows the next prompt', () => {
    const sim = create(5);
    sim.dispatch({ type: 'start' });
    const first = sim.state.round!.wordId;
    const a = shootRight(sim);
    expect(types(a).slice(0, 2)).toEqual(['shot', 'scored']);
    expect(ofType(a, 'shot')[0]).toMatchObject({ correct: true, streak: 1 });
    expect(ofType(a, 'scored')[0]!.coins).toBe(TUNING.coins);
    expect(sim.state.targets.find((t) => t.id === first)).toMatchObject({ solved: true, attempts: 1, correctFirstTry: true });
    expect(sim.state.round!.wordId).not.toBe(first);
    expect(ofType(shootRight(sim), 'scored')[0]!.coins).toBe(TUNING.coins + TUNING.streakCoins);
    for (let i = 0; i < 4 && sim.state.phase === 'playing'; i++) shootRight(sim);
    expect(sim.state.bestStreak).toBeGreaterThan(2);
  });

  it('a wrong arrow bounces off, the enemy strikes, the lane shuts, and the same prompt stays', () => {
    const sim = create(5);
    sim.dispatch({ type: 'start' });
    const word = sim.state.round!.wordId;
    const lane = wrongLane(sim);
    const events = sim.dispatch({ type: 'fire', lane });
    expect(types(events)).toEqual(['shot', 'enemyStrike', 'roundShown']);
    expect(ofType(events, 'shot')[0]).toMatchObject({ correct: false, lane });
    expect(sim.state.courage).toBe(TUNING.maxCourage - 1);
    expect(sim.state.round!.wordId).toBe(word);
    expect(sim.state.round!.lanes.find((l) => l.lane === lane)!.blocked).toBe(true);
    expect(types(sim.dispatch({ type: 'fire', lane }))).toEqual(['rejected']);
    expect(sim.state.targets.find((t) => t.id === word)).toMatchObject({ attempts: 1, correctFirstTry: false, solved: false });
    expect(sim.state.streak).toBe(0);
    shootRight(sim);
    expect(sim.state.targets.find((t) => t.id === word)).toMatchObject({ attempts: 2, correctFirstTry: false, solved: true });
  });

  it('the right lane never shuts, so every prompt can be solved', () => {
    const sim = create(5);
    sim.dispatch({ type: 'start' });
    while (sim.state.round!.lanes.some((l) => l.wordId !== sim.state.round!.wordId && !l.blocked) && sim.state.courage > 0) shootWrong(sim);
    const round = sim.state.round!;
    expect(round.lanes.find((l) => l.wordId === round.wordId)!.blocked).toBe(false);
    expect(types(sim.dispatch({ type: 'fire', lane: rightLane(sim) }))).toContain('scored');
  });

  it('courage at 0 means a rest back to 3, never a game over', () => {
    const sim = create(5);
    sim.dispatch({ type: 'start' });
    let rested = false;
    for (let i = 0; i < 60 && sim.state.phase === 'playing'; i++) {
      const round = sim.state.round!;
      if (round.lanes.every((l) => l.wordId === round.wordId || l.blocked)) {
        shootRight(sim);
        continue;
      }
      const events = shootWrong(sim);
      if (ofType(events, 'rest').length) {
        rested = true;
        expect(ofType(events, 'rest')[0]!.courage).toBe(TUNING.restCourage);
        expect(sim.state.courage).toBe(TUNING.restCourage);
        expect(sim.state.phase).toBe('playing');
      }
    }
    expect(rested).toBe(true);
    expect(sim.state.courage).toBeGreaterThan(0);
  });

  it('the formation falls when the words of the wave are done, and the next wave marches in', () => {
    const sim = create(6);
    sim.dispatch({ type: 'start' });
    const size = sim.state.waveSize;
    expect(sim.state.waveCount).toBeGreaterThan(1);
    const firstIds = sim.state.enemies.map((e) => e.id);
    let last: ReturnType<typeof shootRight> = [];
    for (let i = 0; i < size; i++) last = shootRight(sim);
    expect(types(last)).toEqual(['shot', 'scored', 'waveCleared', 'waveAppeared', 'roundShown']);
    expect(ofType(last, 'waveCleared')[0]!.enemies.map((e) => e.id)).toEqual(firstIds);
    expect(sim.state.wave).toBe(2);
    expect(sim.state.waveDone).toBe(0);
    expect(sim.state.enemies.map((e) => e.id)).not.toEqual(firstIds);
  });

  it.each(SEEDS)('seed %i: every word is hit exactly once to win, with and without mistakes', (seed) => {
    const sim = create(seed, seed % 2 === 0, SHORT_STORY);
    sim.dispatch({ type: 'start' });
    let guard = 0;
    while (sim.state.phase === 'playing' && guard++ < 300) {
      const round = sim.state.round!;
      if (seed % 3 === 0 && round.lanes.some((l) => l.wordId !== round.wordId && !l.blocked)) shootWrong(sim);
      shootRight(sim);
    }
    expect(sim.state.phase).toBe('victory');
    expect(sim.state.round).toBeNull();
    expect(sim.state.targets.every((t) => t.solved)).toBe(true);
    expect(sim.state.courage).toBeGreaterThan(0);
  });

  it('commands after the victory do nothing', () => {
    const sim = create(2, false, SHORT_STORY);
    playToEnd(sim);
    expect(sim.dispatch({ type: 'fire', lane: 0 })).toEqual([]);
    expect(sim.dispatch({ type: 'start' })).toEqual([]);
  });

  it('only declared event types appear', () => {
    const events = playToEnd(create(4));
    expect(events.every((e) => ARCHERS_REVENGE_EVENT_TYPES.includes(e.type))).toBe(true);
  });

  it('an empty input is a won run', () => {
    const sim = createArchersRevenge([], { seed: 1, helper: false });
    expect(sim.state.phase).toBe('victory');
    expect(sim.dispatch({ type: 'start' })).toEqual([]);
  });
});

describe('evidence', () => {
  it('one item per word with the attempts and the first-try flag; the score is the coins', () => {
    const sim = create(8, false, SHORT_STORY);
    sim.dispatch({ type: 'start' });
    const wrongWord = sim.state.round!.wordId;
    shootWrong(sim);
    while (sim.state.phase === 'playing') shootRight(sim);
    const evidence = evidenceOf(sim.state, SHORT_STORY, 8, 12_345);
    expect(storyGameEvidenceSchema.parse(evidence)).toEqual(evidence);
    expect(evidence.items).toHaveLength(SHORT_STORY.vocabulary.length);
    const missed = evidence.items.find((i) => i.itemId === wrongWord)!;
    expect(missed).toMatchObject({ attempts: 2, correctFirstTry: false, solved: true });
    expect(evidence.items.filter((i) => i.correctFirstTry)).toHaveLength(SHORT_STORY.vocabulary.length - 1);
    const { results, outcome } = resultsOf(sim.state, SHORT_STORY, 8, 12_345);
    expect(results.score).toBe(sim.state.coins);
    expect(results.correctAnswers).toBe(SHORT_STORY.vocabulary.length);
    expect(outcome).toBe('victory');
  });
});
