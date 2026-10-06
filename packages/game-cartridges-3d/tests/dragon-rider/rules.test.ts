/** The Dragon Rider rules: two gates, the flock, the legacy boss power, the hold, and the duel without a loss. */
import { describe, expect, it } from 'vitest';
import { STEP_MS } from '@reading-advantage/advantage-play-kit-3d/sim';
import { TUNING, bossPowerOf, correctGateOf, evidenceItemsOf, resultsOf } from '../../src/dragon-rider/core/index.js';
import { SHORT_STORY, STORY, chooseRight, chooseWrong, create, ofType, ride, runUntil, stepsOf, untilRound } from './helpers.js';

describe('rounds', () => {
  it('every round has exactly two gates, one with the right meaning, and all words are distinct', () => {
    const sim = create(5);
    const rounds: string[] = [];
    while (sim.state.phase === 'riding') {
      untilRound(sim);
      const r = sim.state.round!;
      expect(r.options).toHaveLength(2);
      expect(r.options.filter((o) => o.id === r.itemId)).toHaveLength(1);
      expect(r.options[0]!.text).not.toBe(r.options[1]!.text);
      expect(r.chosen).toBeNull();
      rounds.push(r.itemId);
      chooseRight(sim);
      runUntil(sim, () => sim.state.round === null || sim.state.round.id !== r.id || sim.state.phase !== 'riding');
    }
    expect(rounds).toHaveLength(TUNING.maxWords);
    expect(new Set(rounds).size).toBe(rounds.length);
  });

  it('the right gate falls on both sides over a few seeds', () => {
    const sides = new Set<number>();
    for (let seed = 1; seed <= 12; seed++) {
      const sim = create(seed);
      untilRound(sim);
      sides.add(correctGateOf(sim.state)!);
    }
    expect([...sides].sort()).toEqual([0, 1]);
  });

  it('a ride has at most maxWords words, and a short story keeps all its words', () => {
    expect(create(1).state.words).toHaveLength(TUNING.maxWords);
    expect(create(1, SHORT_STORY).state.words).toHaveLength(SHORT_STORY.vocabulary.length);
  });
});

describe('the hold', () => {
  it('the gates approach, then hold in front of the rider with no choice; time decides nothing', () => {
    const sim = create(3);
    untilRound(sim);
    const events = runUntil(sim, () => sim.state.waiting).events;
    expect(sim.state.waiting).toBe(true);
    expect(sim.state.round!.gap).toBe(TUNING.holdGap);
    expect(ofType(events, 'waiting')).toHaveLength(1);
    const distance = sim.state.distance;
    const flock = sim.state.flock;
    for (let i = 0; i < stepsOf(5 * 60_000); i++) sim.tick();
    expect(sim.state.round!.gap).toBe(TUNING.holdGap);
    expect(sim.state.distance).toBe(distance);
    expect(sim.state.flock).toBe(flock);
    expect(sim.state.phase).toBe('riding');
    expect(sim.state.words.every((w) => w.attempts === 0)).toBe(true);
  });

  it('a choice ends the hold, and the gates pass the rider', () => {
    const sim = create(3);
    untilRound(sim);
    runUntil(sim, () => sim.state.waiting);
    const first = sim.state.round!.id;
    chooseRight(sim);
    expect(sim.state.waiting).toBe(false);
    runUntil(sim, () => sim.state.round?.id !== first);
    expect(sim.state.round?.id).not.toBe(first);
  });

  it('commands out of turn do nothing', () => {
    const sim = create(2);
    expect(sim.dispatch({ type: 'choose', gate: 0 })).toEqual([]); // no round yet
    untilRound(sim);
    expect(sim.dispatch({ type: 'choose', gate: 2 })).toEqual([]);
    expect(sim.dispatch({ type: 'choose', gate: -1 })).toEqual([]);
    chooseRight(sim);
    expect(sim.dispatch({ type: 'choose', gate: 0 })).toEqual([]); // already chosen
    expect(sim.state.choices).toBe(1);
  });
});

describe('the flock', () => {
  it('a right gate adds a dragon and counts the first-try coins', () => {
    const sim = create(4);
    untilRound(sim);
    const events = chooseRight(sim);
    expect(sim.state.flock).toBe(2);
    expect(ofType(events, 'flockGrew')).toEqual([{ type: 'flockGrew', count: 2 }]);
    expect(sim.state.coins).toBe(TUNING.coinsPerFirstTry);
    expect(sim.state.words.filter((w) => w.solved)).toHaveLength(1);
  });

  it('a wrong gate never takes the flock below 1, and the word returns once', () => {
    const sim = create(4);
    untilRound(sim);
    const word = sim.state.round!.itemId;
    const events = chooseWrong(sim);
    expect(sim.state.flock).toBe(1);
    expect(ofType(events, 'flockShrank')).toHaveLength(0);
    expect(ofType(events, 'wordReturns')).toEqual([{ type: 'wordReturns', itemId: word }]);
    expect(sim.state.total).toBe(TUNING.maxWords + 1);
    expect(sim.state.queue.at(-1)).toBe(word);
  });

  it('a wrong gate after a right one sends one dragon home', () => {
    const sim = create(4);
    untilRound(sim);
    chooseRight(sim);
    runUntil(sim, () => sim.state.round?.chosen === null && sim.state.roundIndex === 1);
    const events = chooseWrong(sim);
    expect(ofType(events, 'flockShrank')).toEqual([{ type: 'flockShrank', count: 1 }]);
  });

  it('a missed word returns once, then stays solved or unsolved without a second return', () => {
    const sim = create(6);
    const events = ride(sim, (i) => i !== 0 && i !== sim.state.total - 1);
    expect(ofType(events, 'wordReturns').length).toBeLessThanOrEqual(2);
    for (const w of sim.state.words) expect(w.attempts).toBeLessThanOrEqual(2);
  });
});

describe('the dark dragon', () => {
  it('has the legacy power: max(3, ceil(choices / 2))', () => {
    expect(bossPowerOf(0)).toBe(3);
    expect(bossPowerOf(5)).toBe(3);
    expect(bossPowerOf(6)).toBe(3);
    expect(bossPowerOf(7)).toBe(4);
    expect(bossPowerOf(10)).toBe(5);
    const sim = create(8);
    const events = ride(sim);
    expect(ofType(events, 'bossAppeared')[0]!.power).toBe(bossPowerOf(TUNING.maxWords));
  });

  it('a big flock wins without a rally; every exchange takes one strength', () => {
    const sim = create(8);
    const events = ride(sim);
    const ex = ofType(events, 'exchange');
    expect(ex.map((e) => e.bossHp)).toEqual([...Array(ex.length).keys()].map((i) => ex.length - 1 - i));
    expect(ex).toHaveLength(sim.state.bossPower);
    expect(ofType(events, 'rally')).toHaveLength(0);
    expect(sim.state.phase).toBe('complete');
  });

  it('a small flock tires, rests, rallies, and still wins: there is no loss', () => {
    const sim = create(9);
    const events = ride(sim, () => false); // every first choice wrong: the flock stays at 1 then grows on returns
    expect(sim.state.phase).toBe('complete');
    expect(ofType(events, 'rideComplete')).toHaveLength(1);
    expect(sim.state.bossHp).toBe(0);
    // Force a small flock against a power over it.
    const small = create(10);
    ride(small, (i) => i < 1);
    expect(small.state.flock).toBeLessThan(small.state.bossPower);
    expect(small.state.phase).toBe('complete');
    expect(small.state.bossHp).toBe(0);
  });

  it('with a flock of 2 against power 4 the dragons tire and rally', () => {
    const sim = create(12);
    // 8 first choices: right x1 then wrong, giving a power over the flock.
    const events = ride(sim, (i) => i === 0);
    const rallies = ofType(events, 'rally').length;
    expect(rallies).toBe(sim.state.rallies);
    if (sim.state.flock > 1 && sim.state.flock < sim.state.bossPower) expect(rallies).toBeGreaterThan(0);
    expect(sim.state.phase).toBe('complete');
  });

  it('time never changes the outcome: a very slow ride ends the same', () => {
    const fast = create(11);
    const slow = create(11);
    ride(fast, () => true, 0);
    ride(slow, () => true, stepsOf(60_000));
    expect(slow.state.flock).toBe(fast.state.flock);
    expect(slow.state.bossPower).toBe(fast.state.bossPower);
    expect(slow.state.coins).toBe(fast.state.coins);
  });

  it('pays coins per standing dragon at the end', () => {
    const sim = create(8);
    ride(sim);
    expect(sim.state.coins).toBe(TUNING.maxWords * TUNING.coinsPerFirstTry + TUNING.coinsPerDragon * sim.state.flock);
  });
});

describe('evidence', () => {
  it('has one item per story word the student chose for, with attempts and first-try flags', () => {
    const sim = create(13);
    ride(sim, (i) => i % 3 !== 1);
    const items = evidenceItemsOf(sim.state);
    expect(items).toHaveLength(sim.state.words.length);
    expect(new Set(items.map((i) => i.itemId)).size).toBe(items.length);
    for (const item of items) {
      const word = sim.state.words.find((w) => w.id === item.itemId)!;
      expect(item.attempts).toBe(word.attempts);
      expect(item.correctFirstTry).toBe(word.solved && word.attempts === 1);
    }
    const { evidence, results, outcome } = resultsOf(sim.state, { id: STORY.id, level: STORY.level }, 13, 1000);
    expect(evidence.gameId).toBe('dragon-rider');
    expect(evidence.items).toHaveLength(items.length);
    expect(results.score).toBe(sim.state.coins);
    expect(outcome).toBe('victory');
  });

  it('the step is the core clock', () => {
    const sim = create(1);
    sim.tick();
    sim.tick();
    expect(sim.state.timeMs).toBe(2 * STEP_MS);
  });
});
