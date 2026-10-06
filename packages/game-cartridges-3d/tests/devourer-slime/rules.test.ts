/** The Devourer Slime rules of sections 2, 3, and 6 of docs/game-devourer-slime-3d.md. */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema, toGameResults } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { STEP_MS, createRng, distance } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  CLEARING,
  DEVOURER_SLIME_EVENT_TYPES,
  GUARD_KINDS,
  ROUND_WORDS,
  SLIME_START,
  SPAWN_POINTS,
  TUNING,
  createDevourerSlime,
  evidenceOf,
  guardCountFor,
  nextBubbleOf,
  radiusOf,
  resultsOf,
  roundSentencesOf,
  scoreOf,
  sentencesOf,
  shiftOf,
} from '../../src/devourer-slime/core/index.js';
import { manifest } from '../../src/devourer-slime/manifest.js';
import { nextSteer } from '../../src/devourer-slime/qc/bot.js';
import { LONG_STORY, STORY, bubbleAt, create, eat, eatAll, ofType, parkGuards, stepsOf, tickN, wakeGuard } from './helpers.js';

describe('content', () => {
  it('builds a shift of up to 5 sentences of 3 to 7 words, in a seeded order', () => {
    const shift = shiftOf(STORY, createRng(3), TUNING.maxSentences);
    expect(shift).toHaveLength(5);
    expect(new Set(shift.map((s) => s.id)).size).toBe(5);
    for (const s of shift) {
      const sentence = STORY.sentences.find((x) => x.id === s.id)!;
      expect(s.words).toEqual(sentence.words);
      expect(s.text).toBe(sentence.text);
      expect(s.paragraph).toBe(sentence.paragraph);
      expect(s.words.length).toBeGreaterThanOrEqual(ROUND_WORDS.min);
      expect(s.words.length).toBeLessThanOrEqual(ROUND_WORDS.max);
      expect(s).toMatchObject({ wrong: 0, started: false, complete: false });
    }
    expect(shiftOf(STORY, createRng(3), 5).map((s) => s.id)).toEqual(shift.map((s) => s.id));
    expect(shiftOf(STORY, createRng(4), 5).map((s) => s.id)).not.toEqual(shift.map((s) => s.id));
  });

  it('leaves out sentences longer than 7 words and uses fewer when the story has fewer', () => {
    const fit = roundSentencesOf(LONG_STORY);
    expect(fit.length).toBeLessThan(LONG_STORY.sentences.length);
    expect(fit.every((s) => s.words.length <= 7)).toBe(true);
    expect(shiftOf(LONG_STORY, createRng(1), TUNING.maxSentences)).toHaveLength(Math.min(5, fit.length));
  });

  it('accepts the APK SentenceInput, and falls back to every sentence when none fits', () => {
    const input = [
      { term: 'The cat sleeps.', translation: 'x' },
      { term: 'Hi', translation: '' },
      { term: 'The dog runs fast.', translation: '' },
    ];
    expect(sentencesOf(input)).toEqual([
      { id: 's-1', text: 'The cat sleeps.', words: ['The', 'cat', 'sleeps.'], translation: 'x' },
      { id: 's-3', text: 'The dog runs fast.', words: ['The', 'dog', 'runs', 'fast.'] },
    ]);
    const sim = createDevourerSlime(input, { seed: 1, helper: false });
    expect(sim.state.sentences).toBe(2);
    expect(sim.state.shift.map((s) => s.id).sort()).toEqual(['s-1', 's-3']);
    const tiny = createDevourerSlime([{ term: 'Go now', translation: '' }], { seed: 1, helper: false });
    expect(tiny.state.sentences).toBe(1);
    expect(tiny.state.bubbles).toHaveLength(2);
    expect(createDevourerSlime([], { seed: 1, helper: false }).state.phase).toBe('complete');
  });

  it('the manifest is a story cartridge for A0 to A1 with the folk and outdoor-props packs', () => {
    expect(manifest).toMatchObject({
      id: 'devourer-slime',
      inputMode: 'practice',
      simulation: 'realtime',
      orientation: 'any',
      levels: ['Pre-A1', 'A0', 'A0+', 'A1'],
      needs: { sentences: 3 },
      packs: ['folk', 'outdoor-props'],
      briefingKey: 'devourerSlime.briefing',
    });
  });
});

describe('the clearing', () => {
  it('starts with the slime at size 1 in the middle, a bubble per word, and sentenceStarted on the first tick', () => {
    const sim = create(3);
    const sentence = sim.state.shift[0]!;
    expect(sim.state.slime).toMatchObject({ x: 0, z: 0, size: 1, bumpedMs: 0 });
    expect(sim.state.bubbles.map((b) => b.word)).toEqual(sentence.words);
    expect(sim.state.bubbles.map((b) => b.index)).toEqual(sentence.words.map((_, i) => i));
    for (const b of sim.state.bubbles) {
      expect(b).toMatchObject({ eaten: false, spatMs: 0 });
      expect(distance(b, CLEARING)).toBeLessThanOrEqual(CLEARING.r);
      expect(distance(b, SLIME_START)).toBeGreaterThanOrEqual(TUNING.bubbleKeepOutSlime);
      for (const o of sim.state.bubbles) if (o !== b) expect(distance(b, o)).toBeGreaterThanOrEqual(TUNING.bubbleSpacing);
    }
    expect(sim.state).toMatchObject({ next: 0, sentence: 0, sentences: 5, coins: 0, phase: 'playing' });
    const events = sim.tick();
    const started = ofType(events, 'sentenceStarted');
    expect(started).toHaveLength(1);
    expect(started[0]).toMatchObject({ sentenceId: sentence.id, words: sentence.words });
    expect(started[0]!.bubbles.map((b) => b.id)).toEqual(sim.state.bubbles.map((b) => b.id));
    expect(ofType(sim.tick(), 'sentenceStarted')).toHaveLength(0);
  });

  it('guards: 2 in Helper mode, 3 otherwise, size 1.35, 1.3 m/s, away from the slime; they bounce off the edge', { timeout: 60_000 }, () => {
    expect(guardCountFor(true)).toBe(2);
    expect(guardCountFor(false)).toBe(3);
    expect(create(1, true).state.guards).toHaveLength(2);
    const sim = create(1);
    expect(sim.state.guards).toHaveLength(3);
    for (const g of sim.state.guards) {
      expect(GUARD_KINDS).toContain(g.kind);
      expect(g).toMatchObject({ size: TUNING.guardSize });
      expect(Math.hypot(g.vx, g.vz)).toBeCloseTo(TUNING.guardSpeed);
      expect(distance(g, SLIME_START)).toBeGreaterThanOrEqual(TUNING.guardKeepOutSlime);
    }
    let bounced = 0;
    let last = sim.state.guards.map((g) => [g.vx, g.vz]);
    sim.state.slime.x = 0; // the slime stays put; guards may bump it, that is fine here
    for (let i = 0; i < stepsOf(60_000); i++) {
      sim.tick();
      sim.state.guards.forEach((g, j) => {
        expect(distance(g, CLEARING)).toBeLessThanOrEqual(CLEARING.r - radiusOf(g.size) + 1e-9);
        expect(Math.hypot(g.vx, g.vz)).toBeCloseTo(TUNING.guardSpeed);
        if (g.vx !== last[j]![0] || g.vz !== last[j]![1]) bounced += 1;
      });
      last = sim.state.guards.map((g) => [g.vx, g.vz]);
    }
    expect(bounced).toBeGreaterThan(3);
  });
});

describe('moving', () => {
  it('a steer moves the slime at 3 m/s whatever its size, holds until the next steer, and is clamped to the clearing', () => {
    const sim = create(1);
    parkGuards(sim);
    for (const b of sim.state.bubbles) b.eaten = true; // nothing to eat on the way
    expect(sim.dispatch({ type: 'steer', x: 1, z: 0 })).toEqual([]);
    sim.tick();
    expect(sim.state.slime.x).toBeCloseTo((TUNING.slimeSpeed * STEP_MS) / 1000);
    expect(sim.state.slime.facing).toBeCloseTo(90);
    sim.state.slime.size = 2;
    const x0 = sim.state.slime.x;
    sim.tick();
    expect(sim.state.slime.x - x0).toBeCloseTo((TUNING.slimeSpeed * STEP_MS) / 1000);
    sim.dispatch({ type: 'steer', x: 3, z: 4 });
    expect(Math.hypot(sim.state.steer.x, sim.state.steer.z)).toBeCloseTo(1);
    sim.dispatch({ type: 'steer', x: 1, z: 0 });
    tickN(sim, stepsOf(10_000));
    expect(sim.state.slime.x).toBeCloseTo(CLEARING.r - radiusOf(2));
    sim.dispatch({ type: 'steer', x: 0, z: 0 });
    const held = { ...sim.state.slime };
    sim.tick();
    expect(sim.state.slime).toMatchObject({ x: held.x, z: held.z, facing: held.facing });
  });
});

describe('eating words', () => {
  it('the bubble of the next word is eaten and the slime grows 8%', () => {
    const sim = create(3);
    parkGuards(sim);
    const first = bubbleAt(sim, 0);
    const events = eat(sim, first.id);
    expect(ofType(events, 'wordEaten')).toEqual([{ type: 'wordEaten', id: first.id, index: 0, size: 1.08 }]);
    expect(first.eaten).toBe(true);
    expect(sim.state.slime.size).toBeCloseTo(1.08);
    expect(sim.state.next).toBe(1);
    expect(sim.state.eaten).toBe(1);
    expect(sim.state.shift[0]!.started).toBe(true);
    expect(nextBubbleOf(sim.state)).toBe(bubbleAt(sim, 1));
    // An eaten bubble is gone: standing on its spot does nothing more.
    expect(ofType(eat(sim, first.id), 'wordEaten')).toHaveLength(0);
  });

  it('a wrong bubble is spat 1.5 m away, counts an attempt, shrinks the slime 3% (never below 1), and cannot be eaten for 0.8 s', () => {
    const sim = create(3);
    parkGuards(sim);
    eat(sim, bubbleAt(sim, 0).id);
    const size = sim.state.slime.size;
    const wrong = bubbleAt(sim, 2);
    const before = { x: wrong.x, z: wrong.z };
    const events = eat(sim, wrong.id);
    expect(ofType(events, 'wordSpat')).toEqual([{ type: 'wordSpat', id: wrong.id, size: size - TUNING.shrinkPerWrong }]);
    expect(ofType(events, 'wordEaten')).toHaveLength(0);
    expect(wrong.eaten).toBe(false);
    expect(wrong.spatMs).toBe(TUNING.spatMs);
    expect(distance(wrong, before)).toBeCloseTo(TUNING.spitDistance, 1);
    expect(distance(wrong, CLEARING)).toBeLessThanOrEqual(CLEARING.r);
    expect(sim.state.slime.size).toBeCloseTo(size - TUNING.shrinkPerWrong);
    expect(sim.state.shift[0]!.wrong).toBe(1);
    expect(sim.state.next).toBe(1);
    // Chasing it during the cooldown: nothing; after it: a second attempt.
    const chased = eat(sim, wrong.id);
    expect(chased).toEqual([]);
    sim.state.slime.x = SLIME_START.x;
    sim.state.slime.z = SLIME_START.z;
    tickN(sim, stepsOf(TUNING.spatMs));
    expect(wrong.spatMs).toBe(0);
    expect(ofType(eat(sim, wrong.id), 'wordSpat')).toHaveLength(1);
    expect(sim.state.shift[0]!.wrong).toBe(2);
    // The size floor.
    sim.state.slime.size = 1;
    tickN(sim, stepsOf(TUNING.spatMs));
    eat(sim, wrong.id);
    expect(sim.state.slime.size).toBe(1);
  });

  it('a wrong bubble does not undo the words eaten', () => {
    const sim = create(3);
    parkGuards(sim);
    eat(sim, bubbleAt(sim, 0).id);
    eat(sim, bubbleAt(sim, 2).id);
    expect(sim.state.next).toBe(1);
    expect(bubbleAt(sim, 0).eaten).toBe(true);
  });

  it('the last word completes the sentence and the next sentence starts at once', () => {
    const sim = create(3);
    sim.tick(); // the first sentenceStarted
    const sentence = sim.state.shift[0]!;
    const events = eatAll(sim);
    expect(ofType(events, 'wordEaten').map((e) => e.index)).toEqual(sentence.words.map((_, i) => i));
    expect(ofType(events, 'sentenceComplete')).toEqual([{ type: 'sentenceComplete', sentenceId: sentence.id }]);
    expect(sentence.complete).toBe(true);
    const started = ofType(events, 'sentenceStarted');
    expect(started).toHaveLength(1);
    expect(started[0]!.sentenceId).toBe(sim.state.shift[1]!.id);
    expect(sim.state).toMatchObject({ sentence: 1, next: 0 });
    expect(sim.state.bubbles.map((b) => b.word)).toEqual(sim.state.shift[1]!.words);
    expect(sim.state.bubbles.every((b) => !b.eaten && b.spatMs === 0)).toBe(true);
    // The slime keeps its size and place; the new bubbles keep away from it.
    expect(sim.state.slime.size).toBeCloseTo(1 + TUNING.growPerWord * sentence.words.length);
    for (const b of sim.state.bubbles) expect(distance(b, sim.state.slime)).toBeGreaterThanOrEqual(TUNING.bubbleKeepOutSlime);
    // The events of the step come in order: eaten, complete, powered, started.
    const last = events.slice(-4).map((e) => e.type);
    expect(last).toEqual(['wordEaten', 'sentenceComplete', 'powerStarted', 'sentenceStarted']);
  });
});

describe('guards', () => {
  it('a bigger guard bumps the slime back for 0.8 s and costs 5% size; not a reading error', () => {
    const sim = create(3);
    parkGuards(sim);
    eat(sim, bubbleAt(sim, 0).id);
    const size = sim.state.slime.size;
    const wrong = sim.state.shift[0]!.wrong;
    const s = sim.state.slime;
    const g = wakeGuard(sim, 0);
    expect(g.size).toBeGreaterThan(s.size);
    const events = sim.tick();
    expect(ofType(events, 'slimeBumped')).toEqual([{ type: 'slimeBumped', guardId: g.id, size: size - TUNING.shrinkPerBump }]);
    expect(s.bumpedMs).toBe(TUNING.bumpedMs);
    expect(s.size).toBeCloseTo(size - TUNING.shrinkPerBump);
    expect(g.vx).toBeGreaterThan(0); // the guard walks away
    expect(sim.state.shift[0]!.wrong).toBe(wrong);
    // No control while bumped: the slime slides away from the guard, the steer is ignored.
    const x0 = s.x;
    sim.dispatch({ type: 'steer', x: 1, z: 0 });
    tickN(sim, stepsOf(TUNING.bumpedMs) - 1);
    expect(s.x).toBeLessThan(x0);
    expect(s.bumpedMs).toBeGreaterThan(0);
    sim.tick();
    expect(s.bumpedMs).toBe(0);
    const x1 = s.x;
    sim.tick();
    expect(s.x).toBeGreaterThan(x1);
    // A slime at size 1 does not shrink below 1.
    s.size = 1;
    s.x = g.x;
    s.z = g.z;
    sim.tick();
    expect(s.size).toBe(1);
  });

  it('a powered slime swallows a guard for coins; the guard is back at once at a spawn point far from the slime', () => {
    const sim = create(3);
    parkGuards(sim);
    const s = sim.state.slime;
    s.poweredMs = TUNING.powerMs;
    const g = wakeGuard(sim, 0, 0, 0);
    const events = sim.tick();
    expect(ofType(events, 'guardEaten')).toEqual([{ type: 'guardEaten', guardId: g.id, size: s.size, coins: TUNING.guardCoins }]);
    expect(ofType(events, 'slimeBumped')).toHaveLength(0);
    expect(sim.state.coins).toBe(TUNING.guardCoins);
    expect(sim.state.guardsEaten).toBe(1);
    expect(s.bumpedMs).toBe(0);
    // The guard came back in the same step, at one of the farthest spawn points, and moves.
    expect(ofType(events, 'guardReturned')).toEqual([{ type: 'guardReturned', guardId: g.id, kind: g.kind, x: g.x, z: g.z }]);
    expect(events.findIndex((e) => e.type === 'guardReturned')).toBeGreaterThan(events.findIndex((e) => e.type === 'guardEaten'));
    const farthest = [...SPAWN_POINTS].sort((a, b) => distance(b, s) - distance(a, s)).slice(0, TUNING.spawnFarthest);
    expect(farthest.some((p) => p.x === g.x && p.z === g.z)).toBe(true);
    expect(distance(g, s)).toBeGreaterThan(TUNING.spawnRing - 1);
    expect(Math.hypot(g.vx, g.vz)).toBeCloseTo(TUNING.guardSpeed);
  });

  it('a slime that is not powered is bumped by a guard, even at a big size', () => {
    const sim = create(3);
    parkGuards(sim);
    const s = sim.state.slime;
    s.size = TUNING.guardSize + 0.5;
    wakeGuard(sim, 0, 0, 0);
    const events = sim.tick();
    expect(ofType(events, 'guardEaten')).toHaveLength(0);
    expect(ofType(events, 'slimeBumped')).toHaveLength(1);
  });

  it('a finished sentence powers the slime for a countdown, then it is back to its start size', () => {
    const sim = create(3);
    parkGuards(sim);
    // Eating most of a sentence does not power the slime, however big it grows.
    const first = sim.state.shift[0]!.words.length;
    for (let i = 0; i < first - 1; i++) {
      const events = eat(sim, nextBubbleOf(sim.state)!.id);
      expect(ofType(events, 'powerStarted')).toHaveLength(0);
    }
    expect(sim.state.slime.poweredMs).toBe(0);
    // The last word of the sentence starts the power in the same step, before the next sentence.
    const events = eat(sim, nextBubbleOf(sim.state)!.id);
    const types = events.map((e) => e.type);
    expect(ofType(events, 'powerStarted')).toEqual([{ type: 'powerStarted', durationMs: TUNING.powerMs, size: sim.state.slime.size }]);
    expect(types.indexOf('sentenceComplete')).toBeLessThan(types.indexOf('powerStarted'));
    expect(types.indexOf('powerStarted')).toBeLessThan(types.indexOf('sentenceStarted'));
    expect(sim.state.slime.poweredMs).toBe(TUNING.powerMs);
    // The countdown runs on game steps; eating on does not restart it.
    tickN(sim, 10);
    expect(sim.state.slime.poweredMs).toBeCloseTo(TUNING.powerMs - 10 * STEP_MS, 3);
    // At zero the slime is back to its start size, and the end is announced once.
    const ended = [];
    while (sim.state.slime.poweredMs > 0 && sim.state.phase === 'playing') ended.push(...ofType(sim.tick(), 'powerEnded'));
    expect(ended).toEqual([{ type: 'powerEnded', size: TUNING.minSize }]);
    expect(sim.state.slime.size).toBe(TUNING.minSize);
    // A guard now bumps the slime again, until the next sentence is finished.
    wakeGuard(sim, 0, 0, 0);
    expect(ofType(sim.tick(), 'slimeBumped')).toHaveLength(1);
  });

  it('the last sentence ends the shift without a power-up', () => {
    const sim = create(21);
    parkGuards(sim);
    const all = [];
    while (sim.state.phase === 'playing') all.push(...eatAll(sim));
    expect(ofType(all, 'powerStarted')).toHaveLength(sim.state.sentences - 1);
  });
});

describe('the shift', () => {
  it('ends after the last sentence with shiftComplete; nothing happens after', () => {
    const sim = create(21);
    const all = [];
    while (sim.state.phase === 'playing') all.push(...eatAll(sim));
    expect(ofType(all, 'sentenceComplete')).toHaveLength(5);
    expect(ofType(all, 'sentenceStarted')).toHaveLength(5);
    expect(ofType(all, 'shiftComplete')).toEqual([{ type: 'shiftComplete', sentences: 5, size: sim.state.slime.size }]);
    expect(all.at(-1)!.type).toBe('shiftComplete');
    expect(sim.state.shift.every((s) => s.complete)).toBe(true);
    expect(sim.state.eaten).toBe(sim.state.shift.reduce((n, s) => n + s.words.length, 0));
    expect(sim.tick()).toEqual([]);
    expect(sim.dispatch({ type: 'steer', x: 1, z: 0 })).toEqual([]);
    expect(nextSteer(sim.state)).toBeNull();
  });

  it('no lives, no defeat: 6 minutes of bumps end nothing', { timeout: 60_000 }, () => {
    const sim = create(4);
    for (const b of sim.state.bubbles) b.eaten = true; // the slime only chases guards
    const events = [];
    for (let step = 0; step < stepsOf(6 * 60_000); step++) {
      if (step % 10 === 0) {
        const g = sim.state.guards[step % sim.state.guards.length]!;
        sim.dispatch({ type: 'steer', x: g.x - sim.state.slime.x, z: g.z - sim.state.slime.z });
      }
      events.push(...sim.tick());
    }
    for (const e of events) expect(DEVOURER_SLIME_EVENT_TYPES).toContain(e.type);
    expect(events.some((e) => /over|lost|defeat|fail|life|lives/i.test(e.type))).toBe(false);
    expect(ofType(events, 'slimeBumped').length).toBeGreaterThan(0);
    expect(sim.state.phase).toBe('playing');
    expect(sim.state.slime.size).toBe(1);
    expect(sim.state.shift.every((s) => s.wrong === 0)).toBe(true);
    expect(Object.keys(sim.state)).not.toContain('lives');
  });

  it('the slime, the bubbles, and the guards stay in the clearing under random steering (property)', { timeout: 60_000 }, () => {
    for (let seed = 1; seed <= 6; seed++) {
      const sim = create(seed, seed % 2 === 0);
      const chaos = createRng(seed * 31);
      for (let step = 0; step < 900 && sim.state.phase === 'playing'; step++) {
        if (chaos.next() < 0.1) sim.dispatch({ type: 'steer', x: chaos.next() * 2 - 1, z: chaos.next() * 2 - 1 });
        const events = sim.tick();
        for (const e of events) expect(DEVOURER_SLIME_EVENT_TYPES).toContain(e.type);
        expect(distance(sim.state.slime, CLEARING)).toBeLessThanOrEqual(CLEARING.r + 1e-9);
        for (const b of sim.state.bubbles) expect(distance(b, CLEARING)).toBeLessThanOrEqual(CLEARING.r + 1e-9);
        for (const g of sim.state.guards) expect(distance(g, CLEARING)).toBeLessThanOrEqual(CLEARING.r + 1e-9);
        expect(sim.state.slime.size).toBeGreaterThanOrEqual(1);
        expect(sim.state.bubbles.filter((b) => b.eaten).map((b) => b.index).sort()).toEqual(
          Array.from({ length: sim.state.next }, (_, i) => i),
        );
      }
    }
  });
});

describe('evidence', () => {
  it('reports one sentence item per sentence touched: attempts = wrong + 1, first try, solved, paragraph', () => {
    const sim = create(3);
    parkGuards(sim);
    const s0 = sim.state.shift[0]!;
    eat(sim, bubbleAt(sim, 1).id); // wrong first
    tickN(sim, stepsOf(TUNING.spatMs));
    eatAll(sim);
    const s1 = sim.state.shift[1]!;
    eatAll(sim);
    const evidence = evidenceOf(sim.state, STORY, 3, sim.state.timeMs);
    expect(storyGameEvidenceSchema.parse(evidence)).toEqual(evidence);
    expect(evidence).toMatchObject({ gameId: 'devourer-slime', inputId: STORY.id, level: STORY.level, seed: 3 });
    expect(evidence.items).toEqual([
      { itemId: s0.id, itemKind: 'sentence', label: s0.text, attempts: 2, correctFirstTry: false, solved: true, paragraph: s0.paragraph },
      { itemId: s1.id, itemKind: 'sentence', label: s1.text, attempts: 1, correctFirstTry: true, solved: true, paragraph: s1.paragraph },
    ]);
    expect(evidence.practice).toEqual([s0.text]);
    const results = toGameResults(evidence, scoreOf(sim.state));
    expect(results).toMatchObject({ score: 0, correctAnswers: 2, totalAttempts: 3 });
    const full = resultsOf(sim.state, STORY, 3, sim.state.timeMs);
    expect(full.results).toEqual(results);
    expect(full.outcome).toBe('complete');
  });

  it('a sentence with a wrong word and no finish is unsolved; untouched sentences are left out; bumps never count', () => {
    const sim = create(3);
    parkGuards(sim);
    const s0 = sim.state.shift[0]!;
    eat(sim, bubbleAt(sim, 0).id);
    wakeGuard(sim, 0, 0, 0);
    expect(ofType(sim.tick(), 'slimeBumped')).toHaveLength(1);
    let evidence = evidenceOf(sim.state, STORY, 3, 1234.6);
    expect(evidence.items).toEqual([
      { itemId: s0.id, itemKind: 'sentence', label: s0.text, attempts: 1, correctFirstTry: false, solved: false, paragraph: s0.paragraph },
    ]);
    expect(evidence.durationMs).toBe(1235);
    parkGuards(sim);
    tickN(sim, stepsOf(TUNING.bumpedMs + 100));
    eat(sim, bubbleAt(sim, 2).id);
    evidence = evidenceOf(sim.state, STORY, 3, 0);
    expect(evidence.items[0]).toMatchObject({ attempts: 2, correctFirstTry: false, solved: false });
    expect(evidenceOf(create(3).state, STORY, 3, 0).items).toEqual([]);
  });

  it('a played shift is a victory with 5 solved items and coins for the eaten guards', () => {
    const sim = create(2);
    while (sim.state.phase === 'playing') {
      // Swallow a guard whenever the slime is powered (score), then eat the sentence.
      if (sim.state.slime.poweredMs > 0) {
        wakeGuard(sim, 0, 0, 0);
        expect(ofType(sim.tick(), 'guardEaten')).toHaveLength(1);
      }
      eatAll(sim);
    }
    const { evidence, results, outcome } = resultsOf(sim.state, STORY, 2, sim.state.timeMs);
    expect(outcome).toBe('victory');
    expect(evidence.items).toHaveLength(5);
    expect(evidence.items.every((i) => i.solved && i.correctFirstTry)).toBe(true);
    expect(results).toMatchObject({ correctAnswers: 5, totalAttempts: 5, accuracy: 1, score: sim.state.coins });
    expect(sim.state.guardsEaten).toBeGreaterThan(0);
    expect(results.score).toBe(sim.state.guardsEaten * TUNING.guardCoins);
  });
});
