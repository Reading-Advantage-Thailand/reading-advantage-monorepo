/** The Hero vs. Zombie rules of sections 2, 3, and 6 of docs/game-hero-vs-zombie-3d.md. */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema, toGameResults } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { STEP_MS, createRng, distance } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  GRAVES,
  HERO_VS_ZOMBIE_EVENT_TYPES,
  TUNING,
  YARD,
  correctOrbOf,
  createHeroVsZombie,
  decoysFor,
  evidenceOf,
  isWalking,
  nightWordsOf,
  orbsFor,
  resultsOf,
  zombieCountFor,
  type HeroVsZombieEvent,
  type HeroVsZombieSimulation,
} from '../../src/hero-vs-zombie/core/index.js';
import { manifest } from '../../src/hero-vs-zombie/manifest.js';
import { SHORT_STORY, STORY, create, ofType, parkZombies, playNight, stepsOf, takeRight, takeWrong, tickN, touch } from './helpers.js';

const isGrave = (p: { x: number; z: number }): boolean => GRAVES.some((g) => g.x === p.x && g.z === p.z);

/** Puts a walking zombie on the hero and ticks once. */
const bump = (sim: HeroVsZombieSimulation, index = 0): HeroVsZombieEvent[] => {
  const z = sim.state.zombies[index]!;
  z.rising = false;
  z.riseMs = 0;
  z.attackMs = 0;
  z.downMs = 0;
  z.x = sim.state.hero.x + 0.3;
  z.z = sim.state.hero.z;
  return sim.tick();
};

describe('content', () => {
  it('builds a night of up to 10 words, every story word once, in a seeded order', () => {
    const words = nightWordsOf(STORY, createRng(3), TUNING.maxWords);
    expect(STORY.vocabulary.length).toBeGreaterThan(TUNING.maxWords);
    expect(words).toHaveLength(TUNING.maxWords);
    expect(new Set(words.map((w) => w.id)).size).toBe(TUNING.maxWords);
    for (const word of words) {
      const source = STORY.vocabulary.find((v) => v.id === word.id)!;
      expect(word).toEqual({ id: source.id, term: source.term, translation: source.translation, attempts: 0, solved: false, returned: false });
    }
    expect(nightWordsOf(STORY, createRng(3), 10).map((w) => w.id)).toEqual(words.map((w) => w.id));
    expect(nightWordsOf(STORY, createRng(4), 10).map((w) => w.id)).not.toEqual(words.map((w) => w.id));
    expect(nightWordsOf(SHORT_STORY, createRng(1), 10)).toHaveLength(SHORT_STORY.vocabulary.length);
  });

  it('the manifest validates', () => {
    expect(manifest).toMatchObject({
      id: 'hero-vs-zombie',
      title: 'Hero vs. Zombie',
      inputMode: 'story',
      simulation: 'realtime',
      orientation: 'any',
      levels: ['Pre-A1', 'A0', 'A0+', 'A1'],
      needs: { vocabulary: 4 },
      packs: ['heroes', 'folk', 'outdoor-props', 'flight-land', 'sunken-vault', 'potion-shop'],
      briefingKey: 'heroVsZombie.briefing',
    });
  });
});

describe('orbs', () => {
  const words = [
    { id: 'a', term: 'cat', translation: 'แมว' },
    { id: 'b', term: 'dog', translation: 'หมา' },
    { id: 'c', term: 'kitty', translation: 'แมว' }, // the same meaning as "cat"
    { id: 'd', term: 'Dog', translation: 'หมา' },
    { id: 'e', term: 'bird', translation: 'นก' },
    { id: 'f', term: 'fish', translation: 'Fish' },
    { id: 'g', term: 'fishes', translation: 'fish' }, // the same meaning as "fish", other case
  ];

  it("decoys are other words' meanings, distinct from the right one and from each other, case-insensitive", () => {
    expect(decoysFor(words[0]!, words)).toEqual([
      { wordId: 'b', text: 'หมา', correct: false },
      { wordId: 'e', text: 'นก', correct: false },
      { wordId: 'f', text: 'Fish', correct: false },
    ]);
    expect(decoysFor(words[6]!, words).map((d) => d.text)).toEqual(['แมว', 'หมา', 'นก']);
  });

  it('4 orbs, or 3 in Helper mode, with the right one at a seeded position', () => {
    const four = orbsFor(words[0]!, words, 4, createRng(1));
    expect(four).toHaveLength(4);
    expect(four.filter((o) => o.correct)).toEqual([{ wordId: 'a', text: 'แมว', correct: true }]);
    expect(new Set(four.map((o) => o.text.toLowerCase())).size).toBe(4);
    const three = orbsFor(words[0]!, words, 3, createRng(1));
    expect(three).toHaveLength(3);
    expect(three.filter((o) => o.correct)).toHaveLength(1);
    const positions = new Set(Array.from({ length: 30 }, (_, seed) => orbsFor(words[0]!, words, 4, createRng(seed)).findIndex((o) => o.correct)));
    expect(positions).toEqual(new Set([0, 1, 2, 3]));
    expect(orbsFor(words[0]!, words, 4, createRng(5))).toEqual(orbsFor(words[0]!, words, 4, createRng(5)));
    // Fewer orbs when the night has too few distinct meanings.
    const few = [words[0]!, words[2]!];
    expect(orbsFor(few[0]!, few, 4, createRng(1))).toEqual([{ wordId: 'a', text: 'แมว', correct: true }]);
  });

  it('every round has the mode\'s orb count, distinct texts, and orbs apart from each other, the hero, and the graves', () => {
    for (const helper of [false, true]) {
      const sim = create(11, helper);
      expect(sim.state.orbCount).toBe(helper ? TUNING.orbsHelper : TUNING.orbs);
      const events = playNight(sim);
      const rounds = ofType(events, 'roundStarted');
      expect(rounds.length).toBeGreaterThanOrEqual(4);
      for (const round of rounds) {
        expect(round.orbs).toHaveLength(helper ? 3 : 4);
        expect(new Set(round.orbs.map((o) => o.text.toLowerCase())).size).toBe(round.orbs.length);
        const word = sim.state.words.find((w) => w.id === round.itemId)!;
        expect(round.orbs.some((o) => o.text === word.translation)).toBe(true);
        expect(round.term).toBe(word.term);
        expect(new Set(round.orbs.map((o) => o.id)).size).toBe(round.orbs.length);
        for (const o of round.orbs) {
          expect(o.x).toBeGreaterThanOrEqual(YARD.minX + TUNING.spawnMargin);
          expect(o.x).toBeLessThanOrEqual(YARD.maxX - TUNING.spawnMargin);
          expect(o.z).toBeGreaterThanOrEqual(YARD.minZ + TUNING.spawnMargin);
          expect(o.z).toBeLessThanOrEqual(YARD.maxZ - TUNING.spawnMargin);
          for (const g of GRAVES) expect(distance(o, g)).toBeGreaterThanOrEqual(TUNING.orbKeepOutGrave);
        }
        for (const a of round.orbs) for (const b of round.orbs) if (a !== b) expect(distance(a, b)).toBeGreaterThanOrEqual(TUNING.orbSpacing);
      }
      // The first round's orbs keep 2.5 m from the hero at the start.
      const first = create(11, helper).state;
      for (const o of first.orbs) expect(distance(o, first.hero)).toBeGreaterThanOrEqual(TUNING.orbKeepOutHero);
    }
  });
});

describe('rounds', () => {
  it('the first round and the first zombies are set up at creation; their events come with the first tick', () => {
    const sim = create();
    expect(sim.state.round).toMatchObject({ id: 'r1', itemId: sim.state.words[0]!.id, term: sim.state.words[0]!.term });
    expect(sim.state.orbs).toHaveLength(4);
    expect(sim.state.zombies).toHaveLength(TUNING.zombies);
    expect(sim.state.zombies.every((z) => z.rising && z.riseMs === TUNING.riseMs && isGrave(z))).toBe(true);
    expect(sim.state.zombies.every((z) => distance(z, sim.state.hero) >= TUNING.graveKeepOutHero)).toBe(true);
    expect(sim.state).toMatchObject({ phase: 'night', roundIndex: 0, total: sim.state.words.length, rounds: 0, charges: TUNING.chargesAtStart, coins: 0 });
    expect(sim.state.hero).toEqual({ x: 0, z: 0, facing: 180, bumpedMs: 0, pushX: 0, pushZ: 0 });
    const events = sim.tick();
    expect(ofType(events, 'zombieRose').map((e) => e.zombieId)).toEqual(['z1', 'z2', 'z3']);
    for (const e of ofType(events, 'zombieRose')) expect(isGrave(e)).toBe(true);
    const started = ofType(events, 'roundStarted');
    expect(started).toHaveLength(1);
    expect(started[0]).toEqual({
      type: 'roundStarted',
      roundId: 'r1',
      itemId: sim.state.round!.itemId,
      term: sim.state.round!.term,
      orbs: sim.state.orbs.map(({ id, text, x, z }) => ({ id, text, x, z })),
    });
    expect(events.at(-1)!.type).toBe('roundStarted');
    // Zombies walk after the rise.
    tickN(sim, stepsOf(TUNING.riseMs));
    expect(sim.state.zombies.every(isWalking)).toBe(true);
  });

  it('the right orb charges the Blast, pays 10 coins on the first try, and starts the next round', () => {
    const sim = create();
    sim.tick();
    const orb = correctOrbOf(sim.state)!;
    const word = sim.state.words[0]!;
    const events = takeRight(sim);
    expect(ofType(events, 'orbTaken')).toEqual([
      { type: 'orbTaken', id: orb.id, correct: true, roundId: 'r1', itemId: word.id, firstTry: true, charges: 2, coins: TUNING.coinsFirstTry },
    ]);
    expect(word).toMatchObject({ attempts: 1, solved: true, returned: false });
    expect(sim.state).toMatchObject({ charges: 2, coins: TUNING.coinsFirstTry, rounds: 1, roundIndex: 1 });
    const next = ofType(events, 'roundStarted');
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ roundId: 'r2', itemId: sim.state.words[1]!.id });
    expect(sim.state.round!.id).toBe('r2');
    expect(sim.state.orbs.every((o) => o.id.startsWith('r2-'))).toBe(true);
    // The new orbs keep away from the hero, who stands where the old orb was.
    for (const o of sim.state.orbs) expect(distance(o, sim.state.hero)).toBeGreaterThanOrEqual(TUNING.orbKeepOutHero);
    // Charges stop at 3.
    takeRight(sim);
    takeRight(sim);
    expect(sim.state.charges).toBe(TUNING.chargesMax);
    takeRight(sim);
    expect(sim.state.charges).toBe(TUNING.chargesMax);
  });

  it('a wrong orb reshuffles the orbs, counts an attempt, and the word returns once at the end', () => {
    const sim = create();
    sim.tick();
    const word = sim.state.words[0]!;
    const ids = sim.state.orbs.map((o) => o.id);
    const before = sim.state.orbs.map((o) => ({ id: o.id, text: o.text, x: o.x, z: o.z }));
    const wrong = sim.state.orbs.find((o) => !o.correct)!;
    const events = takeWrong(sim);
    expect(events.map((e) => e.type)).toEqual(['orbWrong', 'wordReturns', 'orbsMoved']);
    expect(events[0]).toEqual({ type: 'orbWrong', id: wrong.id, roundId: 'r1', itemId: word.id });
    expect(events[1]).toEqual({ type: 'wordReturns', itemId: word.id });
    expect(events[2]).toEqual({ type: 'orbsMoved', orbs: sim.state.orbs.map(({ id, x, z }) => ({ id, x, z })) });
    // The same orbs and texts, new spots, away from the hero; the round goes on.
    expect(sim.state.orbs.map((o) => o.id)).toEqual(ids);
    expect(sim.state.orbs.map((o) => o.text)).toEqual(before.map((o) => o.text));
    expect(sim.state.orbs.some((o, i) => o.x !== before[i]!.x || o.z !== before[i]!.z)).toBe(true);
    for (const o of sim.state.orbs) expect(distance(o, sim.state.hero)).toBeGreaterThanOrEqual(TUNING.orbKeepOutHero);
    expect(sim.state.round!.id).toBe('r1');
    expect(sim.state).toMatchObject({ charges: TUNING.chargesAtStart, coins: 0, rounds: 0, roundIndex: 0 });
    expect(sim.state.total).toBe(sim.state.words.length + 1);
    expect(sim.state.queue.at(-1)).toBe(word.id);
    expect(word).toMatchObject({ attempts: 1, solved: false, returned: true });
    // A second wrong orb: another attempt, no second return.
    const second = takeWrong(sim);
    expect(second.map((e) => e.type)).toEqual(['orbWrong', 'orbsMoved']);
    expect(word.attempts).toBe(2);
    expect(sim.state.total).toBe(sim.state.words.length + 1);
    // The right orb after misses pays 5 coins.
    const right = takeRight(sim);
    expect(ofType(right, 'orbTaken')[0]).toMatchObject({ firstTry: false, coins: TUNING.coinsLater, charges: 2 });
    expect(word).toMatchObject({ attempts: 3, solved: true });
    // The word comes back as the last round.
    const n = sim.state.words.length;
    const all = playNight(sim);
    const rounds = ofType(all, 'roundStarted');
    expect(rounds.at(-1)).toMatchObject({ roundId: `r${n + 1}`, itemId: word.id });
    expect(ofType(all, 'wordReturns')).toHaveLength(0);
    expect(word.attempts).toBe(4);
    expect(sim.state).toMatchObject({ phase: 'complete', total: n + 1, rounds: n + 1 });
  });

  it('the horde grows by one every 3 rounds, from 3 (Helper 2), at most 5', () => {
    expect([0, 1, 2, 3, 5, 6, 8, 9, 12].map((r) => zombieCountFor(r, false))).toEqual([3, 3, 3, 4, 4, 5, 5, 5, 5]);
    expect([0, 2, 3, 6, 9, 12].map((r) => zombieCountFor(r, true))).toEqual([2, 2, 3, 4, 5, 5]);
    const sim = create(3, true);
    sim.tick();
    expect(sim.state.zombies).toHaveLength(2);
    const events: HeroVsZombieEvent[] = [];
    for (let i = 0; i < 3; i++) events.push(...takeRight(sim));
    expect(sim.state.roundIndex).toBe(3);
    expect(sim.state.zombies).toHaveLength(3);
    const rose = ofType(events, 'zombieRose');
    expect(rose).toHaveLength(1);
    expect(rose[0]).toMatchObject({ zombieId: 'z3' });
    expect(isGrave(rose[0]!)).toBe(true);
    expect(sim.state.zombies[2]).toMatchObject({ id: 'z3', rising: true, riseMs: TUNING.riseMs });
  });
});

describe('zombies', () => {
  it('chase the hero at 1.1 m/s (Helper 0.9), keep apart, and stay inside the yard', () => {
    for (const helper of [false, true]) {
      const sim = create(2, helper);
      tickN(sim, stepsOf(TUNING.riseMs) + 1);
      const z = sim.state.zombies[0]!;
      const before = distance(z, sim.state.hero);
      tickN(sim, 30);
      const after = distance(z, sim.state.hero);
      expect(before - after).toBeCloseTo(helper ? TUNING.zombieSpeedHelper : TUNING.zombieSpeed, 1);
    }
    const sim = create(2);
    tickN(sim, stepsOf(12_000));
    const walkers = sim.state.zombies.filter(isWalking);
    for (const a of walkers) {
      expect(a.x).toBeGreaterThanOrEqual(YARD.minX + TUNING.zombieRadius - 1e-9);
      expect(a.x).toBeLessThanOrEqual(YARD.maxX - TUNING.zombieRadius + 1e-9);
      for (const b of walkers) if (a !== b) expect(distance(a, b)).toBeGreaterThanOrEqual(2 * TUNING.zombieRadius - 0.05);
    }
  });

  it('a zombie on the hero pushes the hero back for 0.8 s; no damage, no attempt, no end', () => {
    const sim = create();
    sim.tick();
    parkZombies(sim);
    const word = sim.state.words[0]!;
    const events = bump(sim);
    expect(events).toEqual([{ type: 'heroBumped', zombieId: 'z1' }]);
    const hero = sim.state.hero;
    expect(hero.bumpedMs).toBe(TUNING.bumpedMs); // set after the hero moved this step
    expect(hero.pushX).toBeCloseTo(-1);
    expect(hero.pushZ).toBeCloseTo(0);
    expect(sim.state.zombies[0]!.attackMs).toBe(TUNING.zombieAttackMs);
    expect(sim.state.bumps).toBe(1);
    // Pushed away at 2 m/s while the steer is ignored, then control comes back.
    sim.dispatch({ type: 'steer', x: 1, z: 0 });
    const x0 = hero.x;
    tickN(sim, stepsOf(TUNING.bumpedMs) - 1);
    expect(hero.x).toBeLessThan(x0);
    expect(hero.bumpedMs).toBeCloseTo(STEP_MS);
    sim.tick();
    expect(hero.bumpedMs).toBe(0);
    expect(distance(hero, { x: 0, z: 0 })).toBeCloseTo(TUNING.bumpSpeed * (TUNING.bumpedMs / 1000), 1);
    // The zombie took its step of the bump tick, then stood still through its attack.
    expect(sim.state.zombies[0]!.x).toBeCloseTo(0.3 - TUNING.zombieSpeed * (STEP_MS / 1000), 5);
    // Not a reading error: no attempt, no evidence, and the night goes on.
    expect(word.attempts).toBe(0);
    expect(evidenceOf(sim.state, STORY, 7, 0).items).toEqual([]);
    expect(sim.state.phase).toBe('night');
    expect(sim.state.round!.id).toBe('r1');
  });

  it('a hero pushed onto an orb touches nothing until stepping off and back', () => {
    const sim = create();
    sim.tick();
    parkZombies(sim);
    const orb = sim.state.orbs.find((o) => !o.correct)!;
    const z = sim.state.zombies[0]!;
    // The zombie stands just beyond the orb, so the bump pushes the hero into it.
    sim.state.hero.x = orb.x + 0.9;
    sim.state.hero.z = orb.z;
    z.x = sim.state.hero.x + 0.3;
    z.z = orb.z;
    const events = tickN(sim, stepsOf(TUNING.bumpedMs) + 2);
    expect(ofType(events, 'heroBumped')).toHaveLength(1);
    expect(ofType(events, 'orbWrong')).toHaveLength(0);
    expect(ofType(events, 'orbsMoved')).toHaveLength(0);
    expect(distance(sim.state.hero, orb)).toBeLessThan(TUNING.heroRadius + TUNING.orbRadius);
    expect(sim.state.words[0]!.attempts).toBe(0);
    // Off and back: the touch counts.
    sim.state.hero.x = orb.x + 3;
    parkZombies(sim);
    sim.tick();
    expect(ofType(touch(sim, orb.id), 'orbWrong')).toHaveLength(1);
  });

  it('no event ever says game over: a night of bumps alone stays a night', () => {
    const sim = create(4);
    const events = tickN(sim, stepsOf(3 * 60_000));
    for (const e of events) expect(HERO_VS_ZOMBIE_EVENT_TYPES).toContain(e.type);
    expect(events.some((e) => /over|lost|defeat|fail|damage/i.test(e.type))).toBe(false);
    expect(ofType(events, 'heroBumped').length).toBeGreaterThan(0);
    expect(sim.state).toMatchObject({ phase: 'night', coins: 0, rounds: 0 });
    expect(sim.state.round!.id).toBe('r1');
    expect(sim.state.words.every((w) => w.attempts === 0)).toBe(true);
  });
});

describe('the Blast', () => {
  it('knocks down only the zombies within 4.5 m, uses a charge, and pays 3 coins each', () => {
    const sim = create();
    tickN(sim, stepsOf(TUNING.riseMs) + 1);
    const [a, b, c] = sim.state.zombies as [typeof sim.state.zombies[0], typeof sim.state.zombies[0], typeof sim.state.zombies[0]];
    const hero = sim.state.hero;
    a.x = hero.x + 1;
    a.z = hero.z;
    b.x = hero.x;
    b.z = hero.z + TUNING.blastRadius - 0.1;
    c.x = hero.x + TUNING.blastRadius + 0.1;
    c.z = hero.z;
    expect(sim.state.charges).toBe(1);
    const events = sim.dispatch({ type: 'blast' });
    expect(events).toEqual([{ type: 'blast', charges: 0, knocked: ['z1', 'z2'], coins: 2 * TUNING.coinsPerKnocked }]);
    expect(a.downMs).toBe(TUNING.knockedDownMs);
    expect(b.downMs).toBe(TUNING.knockedDownMs);
    expect(c.downMs).toBe(0);
    expect(isWalking(c)).toBe(true);
    expect(sim.state).toMatchObject({ charges: 0, coins: 2 * TUNING.coinsPerKnocked, knocked: 2 });
    // A down zombie cannot bump and stays where it fell.
    const spot = { x: a.x, z: a.z };
    a.x = hero.x + 0.3;
    a.z = hero.z;
    expect(sim.tick()).toEqual([]);
    expect(hero.bumpedMs).toBe(0);
    expect(a.x).toBe(hero.x + 0.3);
    a.x = spot.x;
  });

  it('with no charge the Blast is ignored', () => {
    const sim = create();
    sim.tick();
    sim.state.charges = 0;
    const z = sim.state.zombies[0]!;
    z.rising = false;
    z.riseMs = 0;
    z.x = sim.state.hero.x + 1;
    z.z = sim.state.hero.z;
    expect(sim.dispatch({ type: 'blast' })).toEqual([]);
    expect(z.downMs).toBe(0);
    expect(sim.state).toMatchObject({ charges: 0, coins: 0, knocked: 0 });
    // A Blast with no zombie in range still uses the charge.
    sim.state.charges = 1;
    z.x = YARD.maxX - 0.5;
    z.z = YARD.maxZ - 0.5;
    expect(sim.dispatch({ type: 'blast' })).toEqual([{ type: 'blast', charges: 0, knocked: [], coins: 0 }]);
  });

  it('a knocked zombie rises again after 3 s at a grave away from the hero, and a second Blast cannot knock it down while down', () => {
    const sim = create(5);
    tickN(sim, stepsOf(TUNING.riseMs) + 1);
    const z = sim.state.zombies[0]!;
    z.x = sim.state.hero.x + 1;
    z.z = sim.state.hero.z;
    sim.dispatch({ type: 'blast' });
    sim.state.charges = 1;
    expect(sim.dispatch({ type: 'blast' })).toEqual([{ type: 'blast', charges: 0, knocked: [], coins: TUNING.coinsPerKnocked }]);
    const early = tickN(sim, stepsOf(TUNING.knockedDownMs) - 1);
    expect(ofType(early, 'zombieRose')).toHaveLength(0);
    expect(z.downMs).toBeGreaterThan(0);
    expect(z).toMatchObject({ x: sim.state.hero.x + 1, z: sim.state.hero.z });
    const rose = ofType(sim.tick(), 'zombieRose');
    expect(rose).toEqual([{ type: 'zombieRose', zombieId: 'z1', x: z.x, z: z.z }]);
    expect(isGrave(z)).toBe(true);
    expect(z.graveId.startsWith('g-')).toBe(true);
    expect(distance(z, sim.state.hero)).toBeGreaterThanOrEqual(TUNING.graveKeepOutHero);
    expect(z).toMatchObject({ downMs: 0, rising: true, riseMs: TUNING.riseMs });
    tickN(sim, stepsOf(TUNING.riseMs));
    expect(isWalking(z)).toBe(true);
  });
});

describe('dawn and the end', () => {
  it('after the last word: dawn, no orbs, no bumps; then nightComplete after 2.5 s', () => {
    const sim = create(5, false, SHORT_STORY);
    const n = SHORT_STORY.vocabulary.length;
    const events: HeroVsZombieEvent[] = sim.tick();
    for (let i = 0; i < n; i++) events.push(...takeRight(sim));
    const last = events.slice(-2).map((e) => e.type);
    expect(last).toEqual(['orbTaken', 'dawn']);
    expect(sim.state).toMatchObject({ phase: 'dawn', round: null, orbs: [], rounds: n, total: n, roundIndex: n - 1, dawnMs: TUNING.dawnMs });
    expect(ofType(events, 'roundStarted')).toHaveLength(n);
    expect(ofType(events, 'roundStarted').map((r) => r.roundId)).toEqual(Array.from({ length: n }, (_, i) => `r${i + 1}`));
    // Zombies stop and cannot bump; the Blast is ignored; the hero can still walk.
    const z = sim.state.zombies[0]!;
    z.rising = false;
    z.x = sim.state.hero.x + 0.3;
    z.z = sim.state.hero.z;
    expect(sim.dispatch({ type: 'blast' })).toEqual([]);
    sim.dispatch({ type: 'steer', x: 0, z: -1 });
    const z0 = sim.state.hero.z;
    const dawn = tickN(sim, stepsOf(TUNING.dawnMs) - 1);
    expect(dawn).toEqual([]);
    expect(sim.state.hero.z).toBeLessThan(z0);
    expect(z.x).toBe(sim.state.hero.x + 0.3 - 0); // parked where it stood
    expect(sim.state.phase).toBe('dawn');
    const done = sim.tick();
    expect(done).toEqual([{ type: 'nightComplete', rounds: n, coins: sim.state.coins }]);
    expect(sim.state).toMatchObject({ phase: 'complete', dawnMs: 0, coins: n * TUNING.coinsFirstTry });
    // Nothing happens after.
    expect(sim.tick()).toEqual([]);
    expect(sim.dispatch({ type: 'blast' })).toEqual([]);
    expect(sim.dispatch({ type: 'steer', x: 1, z: 0 })).toEqual([]);
  });

  it('a night of wrong first tries still ends: every word returns once (even when found later in its round), then dawn', () => {
    const sim = create(8, false, SHORT_STORY);
    const n = SHORT_STORY.vocabulary.length;
    const all = playNight(sim, (i, attempts) => i >= n || attempts > 0);
    expect(ofType(all, 'roundStarted')).toHaveLength(2 * n);
    expect(ofType(all, 'wordReturns')).toHaveLength(n);
    expect(ofType(all, 'orbWrong')).toHaveLength(n);
    expect(ofType(all, 'orbTaken').every((e) => !e.firstTry)).toBe(true);
    expect(ofType(all, 'dawn')).toHaveLength(1);
    expect(ofType(all, 'nightComplete')).toEqual([{ type: 'nightComplete', rounds: 2 * n, coins: 2 * n * TUNING.coinsLater }]);
    expect(sim.state.words.every((w) => w.solved && w.attempts === 3 && w.returned)).toBe(true);
    expect(sim.state.total).toBe(2 * n);
    const { evidence, outcome } = resultsOf(sim.state, SHORT_STORY, 8, sim.state.timeMs);
    expect(outcome).toBe('victory');
    expect(evidence.items.every((i) => i.solved && !i.correctFirstTry && i.attempts === 3)).toBe(true);
    expect(evidence.practice).toHaveLength(n);
  });
});

describe('evidence', () => {
  it('reports one word item per word touched: attempts = orb touches, first try, solved', () => {
    const sim = create(3);
    sim.tick();
    const word0 = sim.state.words[0]!;
    takeWrong(sim);
    takeRight(sim);
    const word1 = sim.state.words[1]!;
    takeRight(sim);
    bump(sim);
    const evidence = evidenceOf(sim.state, STORY, 3, sim.state.timeMs);
    expect(storyGameEvidenceSchema.parse(evidence)).toEqual(evidence);
    expect(evidence).toMatchObject({ gameId: 'hero-vs-zombie', storyId: STORY.id, level: STORY.level, seed: 3 });
    expect(evidence.items).toEqual([
      { itemId: word0.id, itemKind: 'word', label: word0.term, attempts: 2, correctFirstTry: false, solved: true },
      { itemId: word1.id, itemKind: 'word', label: word1.term, attempts: 1, correctFirstTry: true, solved: true },
    ]);
    expect(evidence.practice).toEqual([word0.term]);
    const results = toGameResults(evidence, sim.state.coins);
    expect(results).toMatchObject({ score: TUNING.coinsLater + TUNING.coinsFirstTry, correctAnswers: 2, totalAttempts: 3 });
    const full = resultsOf(sim.state, STORY, 3, 1234.6);
    expect(full.results).toEqual(results);
    expect(full.outcome).toBe('complete');
    expect(full.evidence.durationMs).toBe(1235);
    expect(evidenceOf(create(3).state, STORY, 3, 0).items).toEqual([]);
  });

  it('a played night is a victory with one solved item per word, and coins count the Blasts', () => {
    const sim = create(2);
    const n = sim.state.words.length;
    tickN(sim, stepsOf(TUNING.riseMs) + 1);
    const z = sim.state.zombies[0]!;
    z.x = sim.state.hero.x + 1;
    z.z = sim.state.hero.z;
    sim.dispatch({ type: 'blast' });
    playNight(sim);
    const { evidence, results, outcome } = resultsOf(sim.state, STORY, 2, sim.state.timeMs);
    expect(outcome).toBe('victory');
    expect(evidence.items).toHaveLength(n);
    expect(evidence.items.every((i) => i.solved && i.correctFirstTry)).toBe(true);
    expect(results).toMatchObject({ correctAnswers: n, totalAttempts: n, accuracy: 1, xp: n, score: sim.state.coins });
    expect(results.score).toBe(n * TUNING.coinsFirstTry + TUNING.coinsPerKnocked);
  });
});

describe('events (property)', () => {
  it('only known events; every body inside the yard; charges 0 to 3; the round word has an orb', { timeout: 60_000 }, () => {
    let checks = 0;
    for (let seed = 1; seed <= 16; seed++) {
      const sim = create(seed, seed % 2 === 0, seed % 3 === 0 ? SHORT_STORY : STORY);
      const chaos = createRng(seed * 7919);
      for (let step = 0; step < 3000 && sim.state.phase !== 'complete'; step++) {
        const roll = chaos.next();
        if (roll < 0.1) sim.dispatch({ type: 'steer', x: chaos.next() * 2 - 1, z: chaos.next() * 2 - 1 });
        else if (roll < 0.12) sim.dispatch({ type: 'blast' });
        else if (roll < 0.14 && sim.state.round) {
          const orb = sim.state.orbs[chaos.int(sim.state.orbs.length)]!;
          sim.state.hero.x = orb.x;
          sim.state.hero.z = orb.z;
        }
        const events: HeroVsZombieEvent[] = sim.tick();
        const bad = events.find((e) => !HERO_VS_ZOMBIE_EVENT_TYPES.includes(e.type));
        if (bad) expect.fail(`seed ${seed} step ${step}: unknown event ${bad.type}`);
        const s = sim.state;
        if (s.charges < 0 || s.charges > TUNING.chargesMax) expect.fail(`seed ${seed} step ${step}: charges ${s.charges}`);
        for (const b of [s.hero, ...s.zombies, ...s.orbs]) {
          if (b.x < YARD.minX - 1e-9 || b.x > YARD.maxX + 1e-9 || b.z < YARD.minZ - 1e-9 || b.z > YARD.maxZ + 1e-9) {
            expect.fail(`seed ${seed} step ${step}: a body left the yard`);
          }
        }
        if (s.phase === 'night' && (!s.round || s.orbs.filter((o) => o.correct).length !== 1)) {
          expect.fail(`seed ${seed} step ${step}: the round has no single right orb`);
        }
        if (s.phase !== 'night' && (s.round !== null || s.orbs.length > 0)) expect.fail(`seed ${seed} step ${step}: orbs after the night`);
        checks += 1;
      }
    }
    expect(checks).toBeGreaterThan(10_000);
  });
});
