/** The Potion Rush rules of sections 2 and 3 of docs/game-potion-rush-3d.md. */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema, toGameResults } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  CUSTOMER_KINDS,
  INGREDIENT_KINDS,
  POTION_RUSH_EVENT_TYPES,
  TUNING,
  createPotionRush,
  evidenceOf,
  nextWordOf,
  ordersOf,
  resultsOf,
  sentencesOf,
  targetFor,
  type PotionRushEvent,
} from '../../src/potion-rush/core/index.js';
import { nextDrop } from '../../src/potion-rush/qc/bot.js';
import { SHORT_STORY, STORY, brew, create, feed, ofType, runUntil, stepsOf, tickN } from './helpers.js';

describe('content', () => {
  it('builds a shift of up to 8 orders, every sentence once, in a seeded order', () => {
    const orders = ordersOf(STORY, createRng(3), TUNING.maxOrders);
    expect(orders).toHaveLength(8);
    expect(new Set(orders.map((o) => o.id)).size).toBe(8);
    for (const order of orders) {
      const sentence = STORY.sentences.find((s) => s.id === order.id)!;
      expect(order.words).toEqual(sentence.words);
      expect(order.text).toBe(sentence.text);
      expect(order.paragraph).toBe(sentence.paragraph);
      expect(CUSTOMER_KINDS).toContain(order.kind);
    }
    expect(ordersOf(STORY, createRng(3), 8).map((o) => o.id)).toEqual(orders.map((o) => o.id));
    expect(ordersOf(STORY, createRng(4), 8).map((o) => o.id)).not.toEqual(orders.map((o) => o.id));
  });

  it('uses fewer orders when the story has fewer sentences, and each customer kind once per 8', () => {
    const orders = ordersOf(SHORT_STORY, createRng(1), TUNING.maxOrders);
    expect(orders).toHaveLength(SHORT_STORY.sentences.length);
    const eight = ordersOf(STORY, createRng(1), 8);
    expect(new Set(eight.map((o) => o.kind)).size).toBe(8);
    expect(new Set(eight.map((o) => o.customerId)).size).toBe(8);
  });

  it('accepts the APK SentenceInput too', () => {
    const sentences = sentencesOf([
      { term: 'The cat sleeps.', translation: 'x' },
      { term: 'Hi', translation: '' },
      { term: 'The dog runs.', translation: '' },
    ]);
    expect(sentences).toEqual([
      { id: 's-1', text: 'The cat sleeps.', words: ['The', 'cat', 'sleeps.'], translation: 'x' },
      { id: 's-3', text: 'The dog runs.', words: ['The', 'dog', 'runs.'] },
    ]);
    const sim = createPotionRush(sentences.map((s) => ({ term: s.text, translation: '' })), { seed: 1, helper: false });
    expect(sim.state.total).toBe(2);
  });
});

describe('customers and the belt', () => {
  it('the first customer arrives on the first tick, at slot 0, and its words go to the pool', () => {
    const sim = create();
    const events = sim.tick();
    const arrived = ofType(events, 'customerArrived');
    expect(arrived).toHaveLength(1);
    expect(arrived[0]!.slot).toBe(0);
    const slot = sim.state.slots[0]!;
    expect(slot.customerId).toBe(arrived[0]!.customerId);
    expect(slot.orderId).toBe(arrived[0]!.sentenceId);
    expect(slot.patienceMs).toBe(TUNING.patienceMs);
    expect(slot.mood).toBe('happy');
    const order = sim.state.orders.find((o) => o.id === slot.orderId)!;
    expect(sim.state.pool).toEqual(order.words);
    expect(sim.state.queue).not.toContain(order.id);
  });

  it('spawns items at position 1 that ride toward 0 and leave, returning the word to the pool', () => {
    const sim = create();
    const { events, hit } = runUntil(sim, (now) => ofType(now, 'itemSpawned').length > 0);
    expect(hit).toBe(true);
    const spawned = ofType(events, 'itemSpawned')[0]!;
    expect(INGREDIENT_KINDS).toContain(spawned.kind);
    const item = sim.state.belt.find((i) => i.id === spawned.itemId)!;
    expect(item.position).toBe(1);
    expect(sim.state.pool).not.toContain(item.word);
    const before = item.position;
    sim.tick();
    expect(item.position).toBeLessThan(before);
    expect(item.position).toBeCloseTo(1 - sim.state.beltSpeed / 30, 6);
    const left = runUntil(sim, (now) => ofType(now, 'itemLeft').some((e) => e.itemId === spawned.itemId));
    expect(left.hit).toBe(true);
    expect(sim.state.belt.find((i) => i.id === spawned.itemId)).toBeUndefined();
    expect(sim.state.pool).toContain(item.word);
  });

  it('the belt speeds up 8% per served order, at most 40%, and Helper mode is 25% slower', () => {
    expect(create(1, false).state.beltSpeed).toBeCloseTo(TUNING.beltSpeed);
    expect(create(1, true).state.beltSpeed).toBeCloseTo(TUNING.beltSpeed * 0.75);
    const sim = create(5);
    sim.tick();
    brew(sim, 0);
    sim.dispatch({ type: 'serve', cauldron: 0 });
    expect(sim.state.beltSpeed).toBeCloseTo(TUNING.beltSpeed * 1.08);
    // The cap: 5 orders would be +40%, 8 orders stay at +40%.
    const played = create(11);
    while (played.state.phase === 'playing') {
      for (let c = nextDrop(played.state); c; c = nextDrop(played.state)) played.dispatch(c);
      played.tick();
    }
    expect(played.state.served).toBe(8);
    expect(played.state.beltSpeed).toBeCloseTo(TUNING.beltSpeed * 1.4);
  });
});

describe('brewing', () => {
  it('the first word starts the brew and each next word must be the next word of the sentence', () => {
    const sim = create();
    sim.tick();
    const order = sim.state.orders.find((o) => o.id === sim.state.slots[0]!.orderId)!;
    const events = feed(sim, 0, order.words[0]!);
    expect(ofType(events, 'wordAccepted')).toMatchObject([{ cauldron: 0, word: order.words[0], index: 0, combo: 1 }]);
    expect(sim.state.cauldrons[0]).toMatchObject({ orderId: order.id, words: [order.words[0]], ready: false });
    expect(nextWordOf(sim.state, 0)).toBe(order.words[1]);
    // The accepted item left the belt.
    expect(sim.state.belt.find((i) => i.id === ofType(events, 'wordAccepted')[0]!.itemId)).toBeUndefined();
  });

  it('a wrong word bounces back to the belt, counts an attempt, and resets the combo', () => {
    const sim = create();
    sim.tick();
    const order = sim.state.orders.find((o) => o.id === sim.state.slots[0]!.orderId)!;
    feed(sim, 0, order.words[0]!);
    expect(sim.state.combo).toBe(1);
    const wrongWord = order.words[2]!; // not the next word
    expect(wrongWord.toLowerCase()).not.toBe(order.words[1]!.toLowerCase());
    const events = feed(sim, 0, wrongWord);
    const rejected = ofType(events, 'wordRejected');
    expect(rejected).toMatchObject([{ cauldron: 0, word: wrongWord }]);
    expect(ofType(events, 'wordAccepted')).toHaveLength(0);
    expect(sim.state.belt.some((i) => i.id === rejected[0]!.itemId)).toBe(true);
    expect(sim.state.cauldrons[0]!.words).toEqual([order.words[0]]);
    expect(order.wrong).toBe(1);
    expect(sim.state.combo).toBe(0);
  });

  it('words match case-insensitively', () => {
    const sim = createPotionRush([{ term: 'the cat sleeps.', translation: '' }], { seed: 2, helper: false });
    sim.tick();
    sim.state.belt.push({ id: 'manual', word: 'THE', kind: 'apple', position: 0.5 });
    const events = sim.dispatch({ type: 'drop', itemId: 'manual', cauldron: 0 });
    expect(ofType(events, 'wordAccepted')).toHaveLength(1);
    expect(sim.state.cauldrons[0]!.words).toEqual(['the']);
  });

  it('a drop into an empty cauldron or a ready potion is rejected without an attempt', () => {
    const sim = create();
    sim.tick(); // one customer at slot 0; slot 2 is empty
    runUntil(sim, () => sim.state.belt.length > 0);
    const item = sim.state.belt[0]!;
    expect(sim.dispatch({ type: 'drop', itemId: item.id, cauldron: 2 })).toMatchObject([{ type: 'wordRejected', cauldron: 2 }]);
    expect(sim.state.orders.every((o) => o.wrong === 0)).toBe(true);
    expect(sim.dispatch({ type: 'drop', itemId: 'nope', cauldron: 0 })).toEqual([]);
  });

  it('a complete potion is ready, and serving it pays the remaining patience in coins', () => {
    const sim = create(3);
    sim.tick();
    const slot = sim.state.slots[0]!;
    const order = sim.state.orders.find((o) => o.id === slot.orderId)!;
    const events = brew(sim, 0);
    expect(ofType(events, 'potionReady')).toEqual([{ type: 'potionReady', cauldron: 0 }]);
    expect(sim.state.cauldrons[0]!.ready).toBe(true);
    expect(sim.state.cauldrons[0]!.words).toEqual(order.words);
    // A ready potion holds the customer: patience stops.
    const held = slot.patienceMs;
    tickN(sim, 30);
    expect(slot.patienceMs).toBe(held);
    const expected = Math.floor(slot.patienceMs / 1000);
    const served = sim.dispatch({ type: 'serve', cauldron: 0 });
    expect(ofType(served, 'potionServed')).toEqual([
      { type: 'potionServed', cauldron: 0, customerId: slot.customerId, coins: expected, tip: TUNING.tipCoins, rush: false },
    ]);
    expect(sim.state.served).toBe(1);
    expect(sim.state.coins).toBe(expected + TUNING.tipCoins);
    expect(sim.state.tips).toBe(TUNING.tipCoins);
    expect(sim.state.slots[0]).toBeNull();
    expect(sim.state.cauldrons[0]).toEqual({ index: 0, orderId: null, words: [], ready: false });
    expect(order.served).toBe(true);
    // Serving an empty or unfinished cauldron does nothing.
    expect(sim.dispatch({ type: 'serve', cauldron: 0 })).toEqual([]);
    expect(sim.dispatch({ type: 'serve', cauldron: 1 })).toEqual([]);
  });

  it('a wrong word does not leave the attempt on a different order', () => {
    const sim = create(3);
    tickN(sim, stepsOf(TUNING.emptyShopArrivalMs) + 2); // two customers
    expect(sim.state.slots[1]).not.toBeNull();
    const order1 = sim.state.orders.find((o) => o.id === sim.state.slots[1]!.orderId)!;
    const order0 = sim.state.orders.find((o) => o.id === sim.state.slots[0]!.orderId)!;
    const wrong = order0.words.find((w) => w.toLowerCase() !== order1.words[0]!.toLowerCase())!;
    feed(sim, 1, wrong);
    expect(order1.wrong).toBe(1);
    expect(order0.wrong).toBe(0);
  });
});

describe('patience, moods, and tables', () => {
  it('moods change at half and a quarter of the patience', () => {
    const sim = create();
    sim.tick();
    const slot = sim.state.slots[0]!;
    const half = runUntil(sim, (now) => ofType(now, 'moodChanged').some((e) => e.slot === 0 && e.mood === 'waiting'));
    expect(half.hit).toBe(true);
    expect(slot.patienceMs / slot.maxPatienceMs).toBeCloseTo(0.5, 2);
    const quarter = runUntil(sim, (now) => ofType(now, 'moodChanged').some((e) => e.slot === 0 && e.mood === 'grumpy'));
    expect(quarter.hit).toBe(true);
    expect(slot.patienceMs / slot.maxPatienceMs).toBeCloseTo(0.25, 2);
    expect(slot.mood).toBe('grumpy');
  });

  it('no tip for a customer served while not happy', () => {
    const sim = create(3);
    sim.tick();
    runUntil(sim, (now) => ofType(now, 'moodChanged').some((e) => e.slot === 0));
    const slot = sim.state.slots[0]!;
    brew(sim, 0);
    const rush = sim.state.rush;
    const served = ofType(sim.dispatch({ type: 'serve', cauldron: 0 }), 'potionServed')[0]!;
    expect(served.tip).toBe(0);
    expect(served.coins).toBe(Math.floor(slot.patienceMs / 1000) * (rush ? TUNING.rushMultiplier : 1));
    expect(sim.state.tips).toBe(0);
  });

  it('a customer out of patience sits down; the cauldron empties; the customer returns with the same order', () => {
    const sim = create(3);
    sim.tick();
    const slot = { ...sim.state.slots[0]! };
    const order = sim.state.orders.find((o) => o.id === slot.orderId)!;
    feed(sim, 0, order.words[0]!);
    const sat = runUntil(sim, (now) => ofType(now, 'customerSatDown').length > 0, stepsOf(TUNING.patienceMs) + 5);
    expect(sat.hit).toBe(true);
    expect(ofType(sat.events, 'customerSatDown')[0]).toEqual({ type: 'customerSatDown', slot: 0, customerId: slot.customerId });
    expect(sim.state.slots[0]).toBeNull();
    expect(sim.state.cauldrons[0]!.words).toEqual([]);
    expect(sim.state.seated).toMatchObject([{ customerId: slot.customerId, orderId: slot.orderId }]);
    // The pool holds only words the customers at the counter still need.
    const needed = new Set(sim.state.slots.flatMap((s) => (s ? sim.state.orders.find((o) => o.id === s.orderId)!.words : [])));
    expect(sim.state.pool.every((w) => needed.has(w))).toBe(true);
    expect(order.served).toBe(false);
    const back = runUntil(
      sim,
      (now) => ofType(now, 'customerReturned').some((e) => e.customerId === slot.customerId),
      stepsOf(TUNING.patienceMs * 3),
    );
    expect(back.hit).toBe(true);
    const returned = ofType(back.events, 'customerReturned').find((e) => e.customerId === slot.customerId)!;
    expect(returned.sentenceId).toBe(slot.orderId);
    expect(returned.kind).toBe(slot.kind);
    const again = sim.state.slots[returned.slot]!;
    expect(again).toMatchObject({ customerId: slot.customerId, orderId: slot.orderId, returned: true });
    expect(again.patienceMs).toBeGreaterThanOrEqual(TUNING.patienceFloorMs);
    expect(sim.state.seated.some((s) => s.customerId === slot.customerId)).toBe(false);
  });

  it('patience shrinks per served order and never goes below 45 s', () => {
    const sim = create(9);
    let lowest = Infinity;
    const seen: number[] = [];
    while (sim.state.phase === 'playing') {
      for (let c = nextDrop(sim.state); c; c = nextDrop(sim.state)) sim.dispatch(c);
      for (const e of sim.tick()) {
        if (e.type === 'customerArrived' || e.type === 'customerReturned') {
          const p = sim.state.slots[e.slot]!.maxPatienceMs;
          seen.push(p);
          lowest = Math.min(lowest, p);
        }
      }
    }
    expect(seen[0]).toBe(TUNING.patienceMs);
    expect(lowest).toBe(TUNING.patienceFloorMs);
    expect(seen.every((p) => p >= TUNING.patienceFloorMs)).toBe(true);
  });
});

describe('rush and the shift', () => {
  it('rush starts when 3 customers wait, doubles the coins, and ends when one is served', () => {
    const sim = create(3);
    const rush = runUntil(sim, (now) => ofType(now, 'rushStarted').length > 0, stepsOf(60_000));
    expect(rush.hit).toBe(true);
    expect(sim.state.rush).toBe(true);
    expect(sim.state.slots.every((s) => s !== null)).toBe(true);
    const slot = sim.state.slots[0]!;
    brew(sim, 0);
    const base = Math.floor(slot.patienceMs / 1000);
    const events = sim.dispatch({ type: 'serve', cauldron: 0 });
    expect(ofType(events, 'potionServed')[0]).toMatchObject({ coins: base * TUNING.rushMultiplier, rush: true });
    expect(ofType(events, 'rushEnded')).toHaveLength(1);
    expect(sim.state.rush).toBe(false);
  });

  it('the shift ends when every order is served; nothing happens after', () => {
    const sim = create(21, false, SHORT_STORY);
    const all: PotionRushEvent[] = [];
    let steps = 0;
    while (sim.state.phase === 'playing' && steps < stepsOf(10 * 60_000)) {
      for (let c = nextDrop(sim.state); c; c = nextDrop(sim.state)) all.push(...sim.dispatch(c));
      all.push(...sim.tick());
      steps += 1;
    }
    expect(sim.state.phase).toBe('complete');
    expect(sim.state.served).toBe(SHORT_STORY.sentences.length);
    expect(sim.state.total).toBe(SHORT_STORY.sentences.length);
    const complete = ofType(all, 'shiftComplete');
    expect(complete).toEqual([{ type: 'shiftComplete', served: sim.state.served, coins: sim.state.coins }]);
    expect(all.at(-1)!.type).toBe('shiftComplete');
    expect(sim.state.orders.every((o) => o.served)).toBe(true);
    expect(sim.tick()).toEqual([]);
    expect(sim.dispatch({ type: 'serve', cauldron: 0 })).toEqual([]);
    expect(nextDrop(sim.state)).toBeNull();
  });

  it('no event ever says game over, even with no play at all', () => {
    const sim = create(4);
    const events = tickN(sim, stepsOf(6 * 60_000));
    for (const e of events) expect(POTION_RUSH_EVENT_TYPES).toContain(e.type);
    expect(events.some((e) => /over|lost|defeat|fail/i.test(e.type))).toBe(false);
    expect(sim.state.phase).toBe('playing');
    expect(sim.state.coins).toBe(0);
    // Every customer sat down at least once and came back.
    expect(ofType(events, 'customerSatDown').length).toBeGreaterThan(0);
    expect(ofType(events, 'customerReturned').length).toBeGreaterThan(0);
  });
});

describe('the active word pool (property)', () => {
  /**
   * Every word an open order still needs is on the belt or in the pool (with multiplicity), and
   * the pool holds nothing no open order needs. Returns the first problem, or null.
   */
  const poolProblem = (sim: ReturnType<typeof create>): string | null => {
    const supply = new Map<string, number>();
    const add = (w: string) => supply.set(w.toLowerCase(), (supply.get(w.toLowerCase()) ?? 0) + 1);
    sim.state.pool.forEach(add);
    sim.state.belt.forEach((i) => add(i.word));
    const needed = new Set<string>();
    for (let i = 0; i < sim.state.slots.length; i++) {
      const slot = sim.state.slots[i];
      if (!slot) continue;
      const order = sim.state.orders.find((o) => o.id === slot.orderId)!;
      order.words.forEach((w) => needed.add(w.toLowerCase()));
      for (const w of order.words.slice(sim.state.cauldrons[i]!.words.length)) {
        const key = w.toLowerCase();
        const left = supply.get(key) ?? 0;
        if (left <= 0) return `word "${w}" of order ${order.id} is neither on the belt nor in the pool`;
        supply.set(key, left - 1);
      }
    }
    for (const w of sim.state.pool) if (!needed.has(w.toLowerCase())) return `pool holds "${w}", which no open order needs`;
    return null;
  };

  it('holds over many seeds and random drops, serves, and time', { timeout: 60_000 }, () => {
    let checks = 0;
    for (let seed = 1; seed <= 24; seed++) {
      const sim = create(seed, seed % 2 === 0, seed % 3 === 0 ? SHORT_STORY : STORY);
      const chaos = createRng(seed * 7919);
      for (let step = 0; step < 1500 && sim.state.phase === 'playing'; step++) {
        const roll = chaos.next();
        if (roll < 0.15 && sim.state.belt.length > 0) {
          sim.dispatch({ type: 'drop', itemId: chaos.pick(sim.state.belt).id, cauldron: chaos.int(TUNING.slots) });
        } else if (roll < 0.2) {
          sim.dispatch({ type: 'serve', cauldron: chaos.int(TUNING.slots) });
        } else if (roll < 0.3) {
          const c = nextDrop(sim.state);
          if (c) sim.dispatch(c);
        }
        const events = sim.tick();
        const badEvent = events.find((e) => !POTION_RUSH_EVENT_TYPES.includes(e.type));
        const problem = badEvent ? `unknown event ${badEvent.type}` : poolProblem(sim);
        if (problem) expect.fail(`seed ${seed} step ${step}: ${problem}`);
        checks += 1;
      }
    }
    expect(checks).toBeGreaterThan(10_000);
  });
});

describe('taps: targetFor', () => {
  it('names the one cauldron that needs the word next, or null when none or two do', () => {
    const sim = createPotionRush(
      [
        { term: 'The cat sleeps.', translation: '' },
        { term: 'The dog runs.', translation: '' },
        { term: 'A bird sings.', translation: '' },
      ],
      { seed: 5, helper: false },
    );
    tickN(sim, stepsOf(TUNING.emptyShopArrivalMs) + 2); // two customers: both orders start with "The"
    expect(sim.state.slots.filter((s) => s !== null)).toHaveLength(2);
    sim.state.belt.push({ id: 'the', word: 'The', kind: 'bread', position: 0.5 });
    sim.state.belt.push({ id: 'moon', word: 'moon', kind: 'bread', position: 0.4 });
    const bothIdle = sim.state.slots.slice(0, 2).every((s) => s!.orderId.startsWith('s-'));
    expect(bothIdle).toBe(true);
    expect(targetFor(sim.state, 'the')).toBeNull(); // two cauldrons need "The"
    expect(targetFor(sim.state, 'moon')).toBeNull(); // no cauldron needs "moon"
    expect(targetFor(sim.state, 'nope')).toBeNull();
    sim.dispatch({ type: 'drop', itemId: 'the', cauldron: 0 });
    sim.state.belt.push({ id: 'the2', word: 'the', kind: 'bread', position: 0.5 });
    expect(targetFor(sim.state, 'the2')).toBe(1);
  });
});

describe('evidence', () => {
  it('reports one sentence item per order touched: attempts = wrong + 1, first try, solved, paragraph', () => {
    const sim = create(3);
    sim.tick();
    const order0 = sim.state.orders.find((o) => o.id === sim.state.slots[0]!.orderId)!;
    feed(sim, 0, order0.words[1]!); // wrong first
    brew(sim, 0);
    sim.dispatch({ type: 'serve', cauldron: 0 });
    tickN(sim, stepsOf(TUNING.emptyShopArrivalMs) + 2);
    const order1 = sim.state.orders.find((o) => o.id === sim.state.slots[1]!.orderId)!;
    brew(sim, 1);
    sim.dispatch({ type: 'serve', cauldron: 1 });
    const evidence = evidenceOf(sim.state, STORY, 3, sim.state.timeMs);
    expect(storyGameEvidenceSchema.parse(evidence)).toEqual(evidence);
    expect(evidence).toMatchObject({ gameId: 'potion-rush', storyId: STORY.id, level: STORY.level, seed: 3 });
    expect(evidence.items).toEqual([
      { itemId: order0.id, itemKind: 'sentence', label: order0.text, attempts: 2, correctFirstTry: false, solved: true, paragraph: order0.paragraph },
      { itemId: order1.id, itemKind: 'sentence', label: order1.text, attempts: 1, correctFirstTry: true, solved: true, paragraph: order1.paragraph },
    ]);
    expect(evidence.practice).toEqual([order0.text]);
    const results = toGameResults(evidence, sim.state.coins);
    expect(results).toMatchObject({ score: sim.state.coins, correctAnswers: 2, totalAttempts: 3 });
    const full = resultsOf(sim.state, STORY, 3, sim.state.timeMs);
    expect(full.results).toEqual(results);
    expect(full.outcome).toBe('complete');
  });

  it('an order with a wrong word and no serve is unsolved; untouched orders are left out', () => {
    const sim = create(3);
    sim.tick();
    const order0 = sim.state.orders.find((o) => o.id === sim.state.slots[0]!.orderId)!;
    feed(sim, 0, order0.words[2]!);
    const evidence = evidenceOf(sim.state, STORY, 3, 1234.6);
    expect(evidence.items).toEqual([
      { itemId: order0.id, itemKind: 'sentence', label: order0.text, attempts: 2, correctFirstTry: false, solved: false, paragraph: order0.paragraph },
    ]);
    expect(evidence.durationMs).toBe(1235);
    expect(evidenceOf(create(3).state, STORY, 3, 0).items).toEqual([]);
  });

  it('a played shift is a victory with 8 solved items', () => {
    const sim = create(2);
    while (sim.state.phase === 'playing') {
      for (let c = nextDrop(sim.state); c; c = nextDrop(sim.state)) sim.dispatch(c);
      sim.tick();
    }
    const { evidence, results, outcome } = resultsOf(sim.state, STORY, 2, sim.state.timeMs);
    expect(outcome).toBe('victory');
    expect(evidence.items).toHaveLength(8);
    expect(evidence.items.every((i) => i.solved && i.correctFirstTry)).toBe(true);
    expect(results).toMatchObject({ correctAnswers: 8, totalAttempts: 8, accuracy: 1, xp: 8, score: sim.state.coins });
    expect(results.score).toBeGreaterThan(0);
  });
});
