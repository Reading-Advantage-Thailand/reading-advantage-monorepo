/** The Dragon Flight rules of sections 2, 3, and 6 of docs/game-dragon-flight-3d.md. */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema, toGameResults } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { STEP_MS, createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  DRAGON_FLIGHT_EVENT_TYPES,
  TUNING,
  correctGateOf,
  createDragonFlight,
  decoysFor,
  evidenceOf,
  flightWordsOf,
  gatesFor,
  resultsOf,
  wordsOf,
  type DragonFlightEvent,
} from '../../src/dragon-flight/core/index.js';
import { manifest } from '../../src/dragon-flight/manifest.js';
import { SHORT_STORY, STORY, chooseRight, chooseWrong, create, fly, ofType, runUntil, stepsOf, tickN, untilRound } from './helpers.js';

describe('content', () => {
  it('builds a flight of up to 10 words, every story word once, in a seeded order', () => {
    const words = flightWordsOf(STORY, createRng(3), TUNING.maxWords);
    expect(STORY.vocabulary.length).toBeGreaterThan(TUNING.maxWords);
    expect(words).toHaveLength(TUNING.maxWords);
    expect(new Set(words.map((w) => w.id)).size).toBe(TUNING.maxWords);
    for (const word of words) {
      const source = STORY.vocabulary.find((v) => v.id === word.id)!;
      expect(word).toEqual({
        id: source.id,
        term: source.term,
        translation: source.translation,
        position: STORY.vocabulary.indexOf(source),
        attempts: 0,
        solved: false,
        returned: false,
      });
    }
    expect(flightWordsOf(STORY, createRng(3), 10).map((w) => w.id)).toEqual(words.map((w) => w.id));
    expect(flightWordsOf(STORY, createRng(4), 10).map((w) => w.id)).not.toEqual(words.map((w) => w.id));
    expect(flightWordsOf(SHORT_STORY, createRng(1), 10)).toHaveLength(SHORT_STORY.vocabulary.length);
  });

  it('accepts the APK VocabularyInput with ids from the index', () => {
    const words = wordsOf([
      { term: 'cat', translation: 'แมว' },
      { term: ' ', translation: 'x' },
      { term: 'dog', translation: '' },
      { term: 'bird ', translation: ' นก' },
    ]);
    expect(words).toEqual([
      { id: 'w-1', term: 'cat', translation: 'แมว', position: 0 },
      { id: 'w-4', term: 'bird', translation: 'นก', position: 3 },
    ]);
    const sim = createDragonFlight(
      [
        { term: 'cat', translation: 'แมว' },
        { term: 'dog', translation: 'หมา' },
        { term: 'bird', translation: 'นก' },
        { term: 'fish', translation: 'ปลา' },
      ],
      { seed: 1, helper: false },
    );
    expect(sim.state.total).toBe(4);
    expect(sim.state.words.map((w) => w.id).sort()).toEqual(['w-1', 'w-2', 'w-3', 'w-4']);
    const events = fly(sim);
    expect(sim.state.phase).toBe('complete');
    expect(ofType(events, 'roundStarted').map((e) => e.itemId).sort()).toEqual(['w-1', 'w-2', 'w-3', 'w-4']);
    const evidence = evidenceOf(sim.state, { id: 'apk', level: 'A1' }, 1, sim.state.timeMs);
    expect(storyGameEvidenceSchema.parse(evidence)).toEqual(evidence);
    expect(evidence.items.map((i) => i.itemId).sort()).toEqual(['w-1', 'w-2', 'w-3', 'w-4']);
  });

  it('a flight with no words is complete before it starts', () => {
    const sim = createDragonFlight([], { seed: 1, helper: false });
    expect(sim.state.phase).toBe('complete');
    expect(sim.tick()).toEqual([]);
  });

  it('the manifest validates', () => {
    expect(manifest).toMatchObject({ id: 'dragon-flight', inputMode: 'practice', simulation: 'realtime', orientation: 'any', needs: { vocabulary: 4 } });
  });
});

describe('gates', () => {
  const words = [
    { id: 'a', position: 0, term: 'cat', translation: 'แมว' },
    { id: 'b', position: 1, term: 'dog', translation: 'หมา' },
    { id: 'c', position: 2, term: 'kitty', translation: 'แมว' }, // the same meaning as "cat"
    { id: 'd', position: 3, term: 'Dog', translation: 'หมา' },
    { id: 'e', position: 4, term: 'bird', translation: 'นก' },
    { id: 'f', position: 5, term: 'fish', translation: 'Fish' },
    { id: 'g', position: 6, term: 'fishes', translation: 'fish' }, // the same meaning as "fish", other case
  ];

  it('decoys are other words\' meanings, distinct from the right one and from each other, case-insensitive', () => {
    expect(decoysFor(words[0]!, words)).toEqual([
      { id: 'b', text: 'หมา', position: 1 },
      { id: 'e', text: 'นก', position: 4 },
      { id: 'f', text: 'Fish', position: 5 },
    ]);
    expect(decoysFor(words[6]!, words).map((d) => d.text)).toEqual(['แมว', 'หมา', 'นก']);
  });

  it('3 gates, or 2 in Helper mode, with the right one at a seeded position', () => {
    const three = gatesFor(words[0]!, words, 3, createRng(1));
    expect(three.options).toHaveLength(3);
    expect(three.options[three.correctGate]).toEqual({ id: 'a', text: 'แมว', position: 0 });
    const texts = three.options.map((o) => o.text.toLowerCase());
    expect(new Set(texts).size).toBe(3);
    const two = gatesFor(words[0]!, words, 2, createRng(1));
    expect(two.options).toHaveLength(2);
    expect(two.options[two.correctGate]).toEqual({ id: 'a', text: 'แมว', position: 0 });
    const positions = new Set(Array.from({ length: 30 }, (_, seed) => gatesFor(words[0]!, words, 3, createRng(seed)).correctGate));
    expect(positions).toEqual(new Set([0, 1, 2]));
    expect(gatesFor(words[0]!, words, 3, createRng(5))).toEqual(gatesFor(words[0]!, words, 3, createRng(5)));
  });

  it('fewer gates when the flight has too few distinct meanings', () => {
    const few = [words[0]!, words[2]!];
    expect(gatesFor(few[0]!, few, 3, createRng(1)).options).toEqual([{ id: 'a', text: 'แมว', position: 0 }]);
  });

  it('every round of a flight has the mode\'s gate count and distinct texts', () => {
    for (const helper of [false, true]) {
      const sim = create(11, helper);
      const events = fly(sim);
      const rounds = ofType(events, 'roundStarted');
      expect(rounds.length).toBeGreaterThanOrEqual(4);
      for (const round of rounds) {
        expect(round.options).toHaveLength(helper ? 2 : 3);
        expect(new Set(round.options.map((o) => o.text.toLowerCase())).size).toBe(round.options.length);
        const word = sim.state.words.find((w) => w.id === round.itemId)!;
        expect(round.options.some((o) => o.id === word.id && o.text === word.translation)).toBe(true);
        expect(round.term).toBe(word.term);
      }
    }
    expect(create(1, true).state.gates).toBe(TUNING.gatesHelper);
    expect(create(1, false).state.gates).toBe(TUNING.gates);
  });
});

describe('rounds and the flight', () => {
  it('the first tick starts round 1 with its gates one spacing ahead; the state matches the event', () => {
    const sim = create();
    expect(sim.state.round).toBeNull();
    expect(sim.state.distance).toBe(0);
    expect(sim.state.speed).toBe(TUNING.cruiseSpeed);
    const events = sim.tick();
    const started = ofType(events, 'roundStarted');
    expect(started).toHaveLength(1);
    const round = sim.state.round!;
    expect(started[0]).toEqual({
      type: 'roundStarted',
      roundId: round.id,
      itemId: round.itemId,
      term: round.term,
      translation: round.translation,
      position: round.position,
      options: round.options,
      gatesAt: TUNING.gateSpacing,
    });
    expect(round).toMatchObject({ id: 'r1', chosen: null, correctGate: null, gatesAt: TUNING.gateSpacing });
    expect(round.itemId).toBe(sim.state.words[0]!.id);
    expect(sim.state.roundIndex).toBe(0);
    expect(sim.state.total).toBe(sim.state.words.length);
    expect(sim.state.distance).toBeCloseTo((TUNING.cruiseSpeed * STEP_MS) / 1000, 9);
  });

  it('a right gate grows the flock, boosts the speed for 1.2 s, pays 5 coins, and the round ends past the gates', () => {
    const sim = create();
    sim.tick();
    const round = sim.state.round!;
    const right = correctGateOf(sim.state)!;
    const events = chooseRight(sim);
    expect(events).toEqual([
      { type: 'gateChosen', roundId: 'r1', gate: right, correct: true, correctGate: right },
      { type: 'flockGrew', count: 2 },
    ]);
    expect(round).toMatchObject({ chosen: right, correctGate: right });
    expect(sim.state.flock).toBe(2);
    expect(sim.state.coins).toBe(TUNING.coinsPerFirstTry);
    expect(sim.state.speed).toBe(TUNING.boostSpeed);
    const word = sim.state.words.find((w) => w.id === round.itemId)!;
    expect(word).toMatchObject({ attempts: 1, solved: true, returned: false });
    // The boost lasts 1.2 s, then the cruise speed comes back.
    tickN(sim, stepsOf(TUNING.boostMs) - 1);
    expect(sim.state.speed).toBe(TUNING.boostSpeed);
    tickN(sim, 2);
    expect(sim.state.speed).toBe(TUNING.cruiseSpeed);
    // The round ends when the distance passes the gates; round 2 has its gates one spacing on.
    const next = runUntil(sim, (now) => ofType(now, 'roundStarted').length > 0);
    expect(next.hit).toBe(true);
    expect(sim.state.distance).toBeGreaterThanOrEqual(TUNING.gateSpacing);
    expect(sim.state.round).toMatchObject({ id: 'r2', gatesAt: 2 * TUNING.gateSpacing, chosen: null });
    expect(sim.state.roundIndex).toBe(1);
    expect(sim.state.round!.itemId).toBe(sim.state.words[1]!.id);
  });

  it('a wrong gate shrinks the flock, never below 1, and the word returns once at the end of the queue', () => {
    const sim = create();
    sim.tick();
    const word = sim.state.words[0]!;
    const right = correctGateOf(sim.state)!;
    // Flock 1: a wrong gate cannot shrink it, but the word comes back.
    const first = chooseWrong(sim);
    const gate = sim.state.round!.chosen!;
    expect(gate).not.toBe(right);
    expect(first).toEqual([
      { type: 'gateChosen', roundId: 'r1', gate, correct: false, correctGate: right },
      { type: 'wordReturns', itemId: word.id },
    ]);
    expect(sim.state.flock).toBe(1);
    expect(sim.state.speed).toBe(TUNING.cruiseSpeed);
    expect(sim.state.coins).toBe(0);
    expect(sim.state.queue.at(-1)).toBe(word.id);
    expect(sim.state.total).toBe(sim.state.words.length + 1);
    expect(word).toMatchObject({ attempts: 1, solved: false, returned: true });
    // Flock 2: a wrong gate sends one dragon home.
    untilRound(sim);
    chooseRight(sim);
    expect(sim.state.flock).toBe(2);
    untilRound(sim);
    const second = chooseWrong(sim);
    expect(ofType(second, 'flockShrank')).toEqual([{ type: 'flockShrank', count: 1 }]);
    expect(sim.state.flock).toBe(1);
    // Both missed words come back after the first pass, in the order they were missed; a second
    // miss of the first word does not bring it back again.
    const n = sim.state.words.length;
    const missedToo = sim.state.words[2]!.id;
    expect(sim.state.queue.slice(-2)).toEqual([word.id, missedToo]);
    const events = fly(sim, (i) => i !== n);
    const rounds = ofType(events, 'roundStarted');
    expect(rounds.at(-2)).toMatchObject({ roundId: `r${n + 1}`, itemId: word.id });
    expect(rounds.at(-1)).toMatchObject({ roundId: `r${n + 2}`, itemId: missedToo });
    expect(ofType(events, 'wordReturns')).toHaveLength(0);
    expect(word).toMatchObject({ attempts: 2, solved: false, returned: true });
    expect(sim.state.total).toBe(n + 2);
    expect(sim.state.phase).toBe('complete');
  });

  it('a second choice, an unknown gate, or a choice without a round does nothing', () => {
    const sim = create();
    expect(sim.dispatch({ type: 'choose', gate: 0 })).toEqual([]);
    sim.tick();
    expect(sim.dispatch({ type: 'choose', gate: 3 })).toEqual([]);
    expect(sim.dispatch({ type: 'choose', gate: -1 })).toEqual([]);
    expect(sim.dispatch({ type: 'choose', gate: 1.5 })).toEqual([]);
    expect(sim.state.round!.chosen).toBeNull();
    chooseRight(sim);
    expect(sim.dispatch({ type: 'choose', gate: 0 })).toEqual([]);
    expect(sim.state.flock).toBe(2);
    expect(sim.state.words[0]!.attempts).toBe(1);
  });

  it('with no choice the dragon hovers 8 m before the gates and never passes them', () => {
    const sim = create();
    sim.tick();
    const hoverAt = TUNING.gateSpacing - TUNING.hoverBefore;
    const reached = runUntil(sim, (now) => ofType(now, 'waiting').length > 0, stepsOf(20_000));
    expect(reached.hit).toBe(true);
    expect(ofType(reached.events, 'waiting')).toEqual([{ type: 'waiting', roundId: 'r1' }]);
    expect(sim.state.waiting).toBe(true);
    expect(sim.state.distance).toBe(hoverAt);
    expect(sim.state.speed).toBe(0);
    // Time passes: still the same round, the same place, and no second waiting event.
    const later = tickN(sim, stepsOf(30_000));
    expect(later).toEqual([]);
    expect(sim.state.distance).toBe(hoverAt);
    expect(sim.state.round!.id).toBe('r1');
    expect(sim.state.roundIndex).toBe(0);
    // A choice ends the hover: the dragon flies through the gates and round 2 starts.
    chooseRight(sim);
    expect(sim.state.waiting).toBe(false);
    expect(sim.state.speed).toBe(TUNING.boostSpeed);
    const next = runUntil(sim, (now) => ofType(now, 'roundStarted').length > 0);
    expect(next.hit).toBe(true);
    expect(next.steps).toBeLessThan(stepsOf(2000));
    expect(sim.state.round!.id).toBe('r2');
  });

  it('a choice before the hover point never hovers', () => {
    const sim = create();
    sim.tick();
    chooseRight(sim);
    const events = runUntil(sim, (now) => ofType(now, 'roundStarted').length > 0);
    expect(ofType(events.events, 'waiting')).toHaveLength(0);
    expect(sim.state.waiting).toBe(false);
  });
});

describe('the boss', () => {
  it('after the last gates the boss appears, one fireball per dragon follows, and the flight is complete', () => {
    const sim = create(5, false, SHORT_STORY);
    const n = SHORT_STORY.vocabulary.length;
    const all = fly(sim);
    const rounds = ofType(all, 'roundStarted');
    expect(rounds).toHaveLength(n);
    expect(rounds.map((r) => r.roundId)).toEqual(rounds.map((_, i) => `r${i + 1}`));
    expect(rounds.map((r) => r.gatesAt)).toEqual(rounds.map((_, i) => (i + 1) * TUNING.gateSpacing));
    const flock = n + 1;
    expect(ofType(all, 'bossAppeared')).toEqual([{ type: 'bossAppeared', flock }]);
    expect(ofType(all, 'fireball').map((e) => e.index)).toEqual(Array.from({ length: flock }, (_, i) => i));
    const coins = TUNING.coinsPerDragon * flock + TUNING.coinsPerFirstTry * n;
    expect(ofType(all, 'flightComplete')).toEqual([{ type: 'flightComplete', flock, coins }]);
    expect(all.at(-1)!.type).toBe('flightComplete');
    expect(sim.state).toMatchObject({ phase: 'complete', flock, coins, round: null, roundIndex: n - 1, total: n, fireballs: flock });
    expect(sim.state.bossAt).toBe(n * TUNING.gateSpacing + TUNING.bossDistance);
    expect(sim.state.distance).toBe(sim.state.bossAt);
    expect(sim.state.speed).toBe(0);
    expect(sim.state.words.every((w) => w.solved && w.attempts === 1)).toBe(true);
    // Nothing happens after.
    expect(sim.tick()).toEqual([]);
    expect(sim.dispatch({ type: 'choose', gate: 0 })).toEqual([]);
  });

  it('fireballs are spaced in time, and the boss falls after the last one', () => {
    let bossAt = -1;
    let reachedAt = -1;
    const fired: number[] = [];
    let completeAt = -1;
    const step = create(5, true, SHORT_STORY);
    let steps = 0;
    while (step.state.phase !== 'complete' && steps < stepsOf(5 * 60_000)) {
      if (step.state.round && step.state.round.chosen === null) chooseRight(step);
      for (const e of step.tick()) {
        if (e.type === 'bossAppeared') bossAt = step.state.timeMs;
        if (e.type === 'fireball') fired.push(step.state.timeMs);
        if (e.type === 'flightComplete') completeAt = step.state.timeMs;
      }
      if (reachedAt === -1 && step.state.phase === 'boss' && step.state.distance === step.state.bossAt) reachedAt = step.state.timeMs;
      steps += 1;
    }
    expect(bossAt).toBeGreaterThan(0);
    expect(reachedAt).toBeGreaterThan(bossAt);
    expect(fired).toHaveLength(step.state.flock);
    expect(fired[0]! - reachedAt).toBeGreaterThanOrEqual(TUNING.fireballFirstMs - STEP_MS);
    for (let i = 1; i < fired.length; i++) {
      expect(fired[i]! - fired[i - 1]!).toBeGreaterThanOrEqual(TUNING.fireballEveryMs - STEP_MS);
      expect(fired[i]! - fired[i - 1]!).toBeLessThanOrEqual(TUNING.fireballEveryMs + STEP_MS);
    }
    expect(completeAt - fired.at(-1)!).toBeGreaterThanOrEqual(TUNING.bossFallMs - STEP_MS);
    expect(step.state.phase).toBe('complete');
  });

  it('the boss always falls: a flight of wrong gates ends with one fireball and no loss', () => {
    const sim = create(8, false, SHORT_STORY);
    const n = SHORT_STORY.vocabulary.length;
    const all = fly(sim, () => false);
    expect(ofType(all, 'roundStarted')).toHaveLength(2 * n);
    expect(ofType(all, 'wordReturns')).toHaveLength(n);
    expect(ofType(all, 'flockShrank')).toHaveLength(0);
    expect(sim.state.flock).toBe(1);
    expect(ofType(all, 'bossAppeared')).toEqual([{ type: 'bossAppeared', flock: 1 }]);
    expect(ofType(all, 'fireball')).toEqual([{ type: 'fireball', index: 0 }]);
    expect(ofType(all, 'flightComplete')).toEqual([{ type: 'flightComplete', flock: 1, coins: TUNING.coinsPerDragon }]);
    expect(sim.state.phase).toBe('complete');
    expect(sim.state.total).toBe(2 * n);
    expect(sim.state.words.every((w) => !w.solved && w.attempts === 2 && w.returned)).toBe(true);
  });

  it('a mixed flight: total = words + misses, and the flock counts the net right gates', () => {
    const sim = create(2);
    const n = sim.state.words.length;
    const all = fly(sim, (i) => i % 3 !== 1);
    const misses = ofType(all, 'gateChosen').filter((e) => !e.correct).length;
    const returns = ofType(all, 'wordReturns').length;
    expect(returns).toBeGreaterThan(0);
    expect(returns).toBeLessThanOrEqual(misses);
    expect(sim.state.total).toBe(n + returns);
    expect(ofType(all, 'roundStarted')).toHaveLength(n + returns);
    expect(sim.state.flock).toBeGreaterThanOrEqual(1);
    expect(ofType(all, 'fireball')).toHaveLength(sim.state.flock);
    const firstTry = sim.state.words.filter((w) => w.solved && w.attempts === 1).length;
    expect(sim.state.coins).toBe(TUNING.coinsPerDragon * sim.state.flock + TUNING.coinsPerFirstTry * firstTry);
  });

  it('no event ever says game over, even with no play at all', () => {
    const sim = create(4);
    const events = tickN(sim, stepsOf(6 * 60_000));
    for (const e of events) expect(DRAGON_FLIGHT_EVENT_TYPES).toContain(e.type);
    expect(events.some((e) => /over|lost|defeat|fail/i.test(e.type))).toBe(false);
    expect(sim.state.phase).toBe('flying');
    expect(sim.state.flock).toBe(1);
    expect(sim.state.coins).toBe(0);
    expect(ofType(events, 'waiting')).toHaveLength(1);
  });
});

describe('evidence', () => {
  it('reports one word item per word chosen: attempts = choices, first try, solved', () => {
    const sim = create(3);
    sim.tick();
    const word0 = sim.state.words[0]!;
    chooseWrong(sim);
    untilRound(sim);
    const word1 = sim.state.words[1]!;
    chooseRight(sim);
    const evidence = evidenceOf(sim.state, STORY, 3, sim.state.timeMs);
    expect(storyGameEvidenceSchema.parse(evidence)).toEqual(evidence);
    expect(evidence).toMatchObject({ gameId: 'dragon-flight', inputId: STORY.id, level: STORY.level, seed: 3 });
    expect(evidence.items).toEqual([
      { itemId: word0.id, itemKind: 'word', label: word0.term, attempts: 1, correctFirstTry: false, solved: false },
      { itemId: word1.id, itemKind: 'word', label: word1.term, attempts: 1, correctFirstTry: true, solved: true },
    ]);
    expect(evidence.practice).toEqual([word0.term]);
    const results = toGameResults(evidence, sim.state.coins);
    expect(results).toMatchObject({ score: sim.state.coins, correctAnswers: 1, totalAttempts: 2 });
    const full = resultsOf(sim.state, STORY, 3, sim.state.timeMs);
    expect(full.results).toEqual(results);
    expect(full.outcome).toBe('complete');
    // The missed word solved on its return: 2 attempts, solved, not first try.
    fly(sim);
    const done = evidenceOf(sim.state, STORY, 3, 1234.6);
    expect(done.items.find((i) => i.itemId === word0.id)).toEqual({
      itemId: word0.id, itemKind: 'word', label: word0.term, attempts: 2, correctFirstTry: false, solved: true,
    });
    expect(done.durationMs).toBe(1235);
    expect(evidenceOf(create(3).state, STORY, 3, 0).items).toEqual([]);
  });

  it('a played flight is a victory with one solved item per word', () => {
    const sim = create(2);
    const n = sim.state.words.length;
    fly(sim);
    const { evidence, results, outcome } = resultsOf(sim.state, STORY, 2, sim.state.timeMs);
    expect(outcome).toBe('victory');
    expect(evidence.items).toHaveLength(n);
    expect(evidence.items.every((i) => i.solved && i.correctFirstTry)).toBe(true);
    expect(results).toMatchObject({ correctAnswers: n, totalAttempts: n, accuracy: 1, xp: n, score: sim.state.coins });
    expect(results.score).toBe(TUNING.coinsPerDragon * (n + 1) + TUNING.coinsPerFirstTry * n);
  });
});

describe('events (property)', () => {
  it('only known events, the flock never below 1, the distance never past unchosen gates', { timeout: 60_000 }, () => {
    let checks = 0;
    for (let seed = 1; seed <= 24; seed++) {
      const sim = create(seed, seed % 2 === 0, seed % 3 === 0 ? SHORT_STORY : STORY);
      const chaos = createRng(seed * 7919);
      for (let step = 0; step < 3000 && sim.state.phase !== 'complete'; step++) {
        const roll = chaos.next();
        if (roll < 0.03) sim.dispatch({ type: 'choose', gate: chaos.int(4) - 1 });
        else if (roll < 0.05 && sim.state.round) chooseRight(sim);
        const events: DragonFlightEvent[] = sim.tick();
        const bad = events.find((e) => !DRAGON_FLIGHT_EVENT_TYPES.includes(e.type));
        if (bad) expect.fail(`seed ${seed} step ${step}: unknown event ${bad.type}`);
        if (sim.state.flock < 1) expect.fail(`seed ${seed} step ${step}: flock ${sim.state.flock}`);
        const round = sim.state.round;
        if (round && round.chosen === null && sim.state.distance > round.gatesAt - TUNING.hoverBefore) {
          expect.fail(`seed ${seed} step ${step}: passed unchosen gates`);
        }
        if (sim.state.waiting !== (round !== null && round.chosen === null && sim.state.distance === round.gatesAt - TUNING.hoverBefore)) {
          expect.fail(`seed ${seed} step ${step}: waiting flag is wrong`);
        }
        checks += 1;
      }
    }
    expect(checks).toBeGreaterThan(10_000);
  });
});
