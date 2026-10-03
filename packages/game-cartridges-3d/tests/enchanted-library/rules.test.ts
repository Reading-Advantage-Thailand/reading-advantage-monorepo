/** The Enchanted Library rules of docs/game-enchanted-library-3d.md. */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema, toGameResults } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createRng, distance } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  DECOYS,
  HALL,
  HERO_START,
  LIBRARY_EVENT_TYPES,
  SCORE,
  TOUCH,
  TUNING,
  createEnchantedLibrary,
  decoysOf,
  evidenceOf,
  resultsOf,
  scoreOf,
  targetBookOf,
  visitOf,
  wordsOf,
} from '../../src/enchanted-library/core/index.js';
import { STORY, SMALL_STORY, clearRound, create, ofType, stepsOf, tickN, touch, wrongBook } from './helpers.js';

describe('content', () => {
  it('builds a visit of up to 8 rounds from the vocabulary, in a seeded order', () => {
    const visit = visitOf(STORY, createRng(3), TUNING.maxRounds);
    expect(visit).toHaveLength(8);
    expect(new Set(visit.map((r) => r.id)).size).toBe(8);
    visit.forEach((round, i) => {
      const word = STORY.vocabulary.find((v) => v.id === round.id)!;
      expect(round.term).toBe(word.term);
      expect(round.translation).toBe(word.translation);
      expect(round.roundId).toBe(`round-${i + 1}`);
      expect(round).toMatchObject({ wrong: 0, started: false, cleared: false });
    });
    expect(visitOf(STORY, createRng(3), 8).map((r) => r.id)).toEqual(visit.map((r) => r.id));
    expect(visitOf(STORY, createRng(4), 8).map((r) => r.id)).not.toEqual(visit.map((r) => r.id));
    expect(visitOf(SMALL_STORY, createRng(1), 8)).toHaveLength(SMALL_STORY.vocabulary.length);
  });

  it('decoys are other words of the input, at most 3, and never the right word', () => {
    const word = STORY.vocabulary[0]!;
    const decoys = decoysOf(STORY, word.id, createRng(2));
    expect(decoys).toHaveLength(DECOYS);
    expect(decoys).not.toContain(word.term);
    expect(new Set(decoys).size).toBe(DECOYS);
  });

  it('accepts the APK VocabularyInput; empty, blank, and repeated words are skipped; no words is a finished visit', () => {
    const input = [
      { term: 'cat', translation: 'แมว' },
      { term: 'Cat', translation: 'แมว' },
      { term: '', translation: 'x' },
      { term: 'dog', translation: 'สุนัข' },
    ];
    expect(wordsOf(input).map((w) => w.id)).toEqual(['v-1', 'v-4']);
    const sim = createEnchantedLibrary(input, { seed: 1, helper: false });
    expect(sim.state.roundCount).toBe(2);
    expect(sim.state.books).toHaveLength(2);
    expect(createEnchantedLibrary([], { seed: 1, helper: false }).state.phase).toBe('complete');
  });
});

describe('the round', () => {
  it('starts with the right book and 3 decoys inside the hall, apart and away from the hero, and roundStarted on the first tick', () => {
    const sim = create(3);
    const round = sim.state.rounds[0]!;
    expect(sim.state.books).toHaveLength(1 + DECOYS);
    const right = targetBookOf(sim.state)!;
    expect(right.term).toBe(round.term);
    expect(sim.state.books.filter((b) => b.correct)).toHaveLength(1);
    expect(sim.state.books.filter((b) => b.term === round.term)).toHaveLength(1);
    for (const b of sim.state.books) {
      expect(b.x).toBeGreaterThanOrEqual(HALL.minX);
      expect(b.x).toBeLessThanOrEqual(HALL.maxX);
      expect(b.z).toBeGreaterThanOrEqual(HALL.minZ);
      expect(b.z).toBeLessThanOrEqual(HALL.maxZ);
      expect(distance(b, HERO_START)).toBeGreaterThanOrEqual(TUNING.bookKeepOut - 1e-9);
      expect(b.spent).toBe(false);
    }
    expect(sim.state).toMatchObject({ round: 0, roundCount: 8, phase: 'playing', courage: TUNING.courage });
    const started = ofType(sim.tick(), 'roundStarted');
    expect(started).toHaveLength(1);
    expect(started[0]).toMatchObject({ roundId: 'round-1', itemId: round.id, term: round.term, translation: round.translation });
    expect(started[0]!.books.map((b) => b.id)).toEqual(sim.state.books.map((b) => b.id));
  });

  it('the hero steers, walks to a point, and walks to a book, and stays in the hall', () => {
    const sim = create(3);
    sim.dispatch({ type: 'steer', x: 1, z: 0 });
    const x0 = sim.state.hero.x;
    tickN(sim, 15);
    expect(sim.state.hero.x).toBeGreaterThan(x0 + 1);
    expect(sim.state.hero.facing).toBeCloseTo(90, 0);
    sim.dispatch({ type: 'steer', x: 0, z: 0 });
    const stopped = sim.state.hero.x;
    tickN(sim, 5);
    expect(sim.state.hero.x).toBe(stopped);
    sim.dispatch({ type: 'goto', x: -3, z: 1 });
    tickN(sim, stepsOf(4000));
    expect(sim.state.hero).toMatchObject({ goal: null });
    expect(sim.state.hero.x).toBeCloseTo(-3, 5);
    expect(sim.state.hero.z).toBeCloseTo(1, 5);
    sim.dispatch({ type: 'steer', x: 1, z: 1 });
    tickN(sim, stepsOf(8000));
    expect(sim.state.hero.x).toBeLessThanOrEqual(HALL.maxX - TUNING.heroRadius + 1e-9);
    expect(sim.state.hero.z).toBeLessThanOrEqual(HALL.maxZ - TUNING.heroRadius + 1e-9);
    expect(sim.dispatch({ type: 'goto', bookId: 'nope' })).toEqual([]);
    sim.dispatch({ type: 'goto', bookId: sim.state.books[0]!.id });
    expect(sim.state.hero.goal).toMatchObject({ x: expect.any(Number), z: expect.any(Number) });
    expect(sim.state.hero.steerX).toBe(0);
  });

  it('the right book clears the round, gives a shield charge back, and the next round starts at once', () => {
    const sim = create(3);
    sim.tick();
    const first = sim.state.rounds[0]!;
    sim.state.hero.charges = 1;
    const events = clearRound(sim);
    expect(ofType(events, 'bookCollected')).toEqual([{ type: 'bookCollected', id: expect.any(String), itemId: first.id }]);
    expect(ofType(events, 'roundCleared')).toEqual([{ type: 'roundCleared', roundId: 'round-1', itemId: first.id }]);
    expect(ofType(events, 'roundStarted')).toHaveLength(1);
    expect(sim.state).toMatchObject({ round: 1, roundsCleared: 1, collected: 1 });
    expect(sim.state.hero.charges).toBe(2);
    expect(first).toMatchObject({ cleared: true, wrong: 0, started: true });
  });

  it('a wrong book is a reading attempt, costs one courage, and is spent', () => {
    const sim = create(3);
    sim.tick();
    const wrong = wrongBook(sim);
    const events = touch(sim, wrong);
    expect(ofType(events, 'bookWrong')).toEqual([{ type: 'bookWrong', id: wrong.id }]);
    expect(ofType(events, 'courageChanged')).toEqual([{ type: 'courageChanged', courage: TUNING.courage - 1 }]);
    expect(sim.state.courage).toBe(TUNING.courage - 1);
    expect(sim.state.rounds[0]).toMatchObject({ wrong: 1, started: true, cleared: false });
    expect(wrong.spent).toBe(true);
    // A spent book takes no second touch.
    expect(ofType(touch(sim, wrong), 'bookWrong')).toHaveLength(0);
    expect(sim.state.round).toBe(0);
  });

  it('the books of the next round are not the books of this round', () => {
    const sim = create(5);
    sim.tick();
    const before = sim.state.books.map((b) => `${b.term}@${b.x.toFixed(2)},${b.z.toFixed(2)}`);
    clearRound(sim);
    expect(sim.state.books.map((b) => `${b.term}@${b.x.toFixed(2)},${b.z.toFixed(2)}`)).not.toEqual(before);
  });
});

describe('spirits, the shield, and courage', () => {
  it('a spirit comes after 4 s, the next after 6 s, up to 3 (2 with the helper)', () => {
    const sim = create(3);
    tickN(sim, stepsOf(TUNING.firstSpawnMs) - 2);
    expect(sim.state.spirits).toHaveLength(0);
    tickN(sim, 4);
    expect(sim.state.spirits).toHaveLength(1);
    sim.state.hero.hurtMs = 1e9;
    sim.state.courage = 99;
    tickN(sim, stepsOf(TUNING.spawnMs * 5));
    expect(sim.state.spirits).toHaveLength(TUNING.maxSpirits);
    const helper = create(3, true);
    helper.state.hero.hurtMs = 1e9;
    tickN(helper, stepsOf(40_000));
    expect(helper.state.spirits).toHaveLength(TUNING.helperSpirits);
  });

  it('spirits stay in the hall', () => {
    const sim = create(3);
    sim.state.hero.hurtMs = 1e9;
    for (let k = 0; k < 600; k++) {
      sim.tick();
      for (const s of sim.state.spirits) {
        expect(s.x).toBeGreaterThanOrEqual(HALL.minX - 1e-6);
        expect(s.x).toBeLessThanOrEqual(HALL.maxX + 1e-6);
        expect(s.z).toBeGreaterThanOrEqual(HALL.minZ - 1e-6);
        expect(s.z).toBeLessThanOrEqual(HALL.maxZ + 1e-6);
      }
    }
  });

  it('a spirit that touches the hero costs one courage, knocks the hero back, and gives 1.5 s of protection', () => {
    const sim = create(3);
    sim.tick();
    const h = sim.state.hero;
    sim.state.spirits.push({ id: 'sp', x: h.x + 0.5, z: h.z, vx: -1, vz: 0, calmMs: 0 });
    const events = sim.tick();
    expect(ofType(events, 'heroHit')).toEqual([{ type: 'heroHit', spiritId: 'sp' }]);
    expect(sim.state.courage).toBe(TUNING.courage - 1);
    expect(sim.state.hits).toBe(1);
    expect(h.hurtMs).toBeGreaterThan(0);
    expect(h.controlMs).toBeGreaterThan(0);
    const x = h.x;
    tickN(sim, 3);
    expect(h.x).toBeLessThan(x);
    // Still protected: the same spirit does not hit twice.
    sim.state.spirits[0]!.x = h.x;
    sim.state.spirits[0]!.z = h.z;
    expect(ofType(sim.tick(), 'heroHit')).toHaveLength(0);
    expect(sim.state.courage).toBe(TUNING.courage - 1);
  });

  it('the shield uses a charge, turns spirits away, and ends after 1.8 s', () => {
    const sim = create(3);
    sim.tick();
    expect(sim.state.hero.charges).toBe(TUNING.maxCharges);
    expect(sim.dispatch({ type: 'shield' })).toEqual([{ type: 'shieldUp', charges: TUNING.maxCharges - 1 }]);
    expect(sim.dispatch({ type: 'shield' })).toEqual([]);
    const h = sim.state.hero;
    sim.state.spirits.push({ id: 'sp', x: h.x + 0.6, z: h.z, vx: -1, vz: 0, calmMs: 0 });
    const events = sim.tick();
    expect(ofType(events, 'shieldBlocked')).toEqual([{ type: 'shieldBlocked', spiritId: 'sp' }]);
    expect(ofType(events, 'heroHit')).toHaveLength(0);
    expect(sim.state.courage).toBe(TUNING.courage);
    expect(sim.state.spirits[0]!.vx).toBeGreaterThan(0);
    const down = tickN(sim, stepsOf(TUNING.shieldMs) + 2);
    expect(ofType(down, 'shieldDown')).toHaveLength(1);
    expect(h.shieldMs).toBe(0);
    // No charges, no shield.
    h.charges = 0;
    expect(sim.dispatch({ type: 'shield' })).toEqual([]);
  });

  it('when courage runs out the team rests: back to the middle, full courage, no spirits, no game over', () => {
    const sim = create(3);
    sim.tick();
    for (let k = 0; k < TUNING.courage - 1; k++) {
      const wrong = sim.state.books.find((b) => !b.correct && !b.spent);
      if (wrong) touch(sim, wrong);
    }
    sim.state.spirits.push({ id: 'sp', x: sim.state.hero.x + 0.5, z: sim.state.hero.z, vx: 0, vz: 0, calmMs: 0 });
    sim.state.hero.hurtMs = 0;
    sim.state.courage = 1;
    const events = sim.tick();
    expect(ofType(events, 'teamRested')).toEqual([{ type: 'teamRested', courage: TUNING.courage }]);
    expect(sim.state).toMatchObject({ phase: 'playing', courage: TUNING.courage, rests: 1, spirits: [] });
    expect(sim.state.hero).toMatchObject({ x: HERO_START.x, z: HERO_START.z, charges: TUNING.maxCharges });
    expect(sim.state.hero.controlMs).toBeGreaterThan(0);
    expect(LIBRARY_EVENT_TYPES).not.toContain('gameOver');
    expect(sim.state.round).toBe(0);
  });
});

describe('the visit', () => {
  it('ends after the last round with visitComplete, and then ignores commands', () => {
    const sim = create(3);
    sim.tick();
    const events: ReturnType<typeof clearRound> = [];
    while (sim.state.phase === 'playing') events.push(...clearRound(sim));
    expect(ofType(events, 'visitComplete')).toEqual([{ type: 'visitComplete', rounds: 8 }]);
    expect(sim.state).toMatchObject({ phase: 'complete', roundsCleared: 8, spirits: [], books: [] });
    expect(sim.dispatch({ type: 'shield' })).toEqual([]);
    expect(sim.dispatch({ type: 'steer', x: 1, z: 0 })).toEqual([]);
    expect(sim.tick()).toEqual([]);
  });

  it('evidence has one word item per round, attempts = wrong books + 1, and the score is 100 per right book', () => {
    const sim = create(3);
    sim.tick();
    touch(sim, wrongBook(sim));
    while (sim.state.phase === 'playing') clearRound(sim);
    const evidence = evidenceOf(sim.state, STORY, 3, 1234);
    expect(storyGameEvidenceSchema.parse(evidence)).toEqual(evidence);
    expect(evidence.items).toHaveLength(8);
    expect(evidence.items.map((i) => i.itemId)).toEqual(sim.state.rounds.map((r) => r.id));
    expect(evidence.items[0]).toMatchObject({ itemKind: 'word', label: sim.state.rounds[0]!.term, attempts: 2, correctFirstTry: false, solved: true });
    expect(evidence.items[1]).toMatchObject({ attempts: 1, correctFirstTry: true, solved: true });
    expect(evidence.practice).toEqual([sim.state.rounds[0]!.term]);
    expect(scoreOf(sim.state)).toBe(8 * SCORE.book);
    const { results, outcome } = resultsOf(sim.state, STORY, 3, 1234);
    expect(results).toEqual(toGameResults(evidence, scoreOf(sim.state)));
    expect(outcome).toBe('victory');
  });

  it('a round the student never touched has no evidence item', () => {
    const sim = create(3);
    sim.tick();
    clearRound(sim);
    expect(evidenceOf(sim.state, STORY, 3, 0).items).toHaveLength(1);
  });

  it('speed and spirits never give score or xp: the same visit after more game time and hits has the same results', () => {
    const quick = create(3);
    const slow = create(3);
    quick.tick();
    slow.tick();
    slow.state.hero.hurtMs = 0;
    slow.state.spirits.push({ id: 'sp', x: slow.state.hero.x + 0.5, z: slow.state.hero.z, vx: 0, vz: 0, calmMs: 0 });
    tickN(slow, stepsOf(60_000));
    while (quick.state.phase === 'playing') clearRound(quick);
    while (slow.state.phase === 'playing') clearRound(slow);
    expect(resultsOf(slow.state, STORY, 3, 999_999).results).toEqual(resultsOf(quick.state, STORY, 3, 1).results);
  });

  it('every tuning number is positive, and the hero touches a book inside TOUCH', () => {
    for (const v of Object.values(TUNING)) expect(v).toBeGreaterThan(0);
    expect(TOUCH).toBeCloseTo(TUNING.heroRadius + TUNING.bookRadius);
  });
});
