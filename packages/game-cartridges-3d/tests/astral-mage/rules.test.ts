/** The Astral Mage rules of sections 2, 3, and 6 of docs/game-astral-mage-3d.md. */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema, toGameResults } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createRng, distance } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  ASTRAL_MAGE_EVENT_TYPES,
  FLOOR,
  MAGE_START,
  RITUAL_WORDS,
  SCORE,
  TUNING,
  castingOf,
  createAstralMage,
  echoWordOf,
  evidenceOf,
  liveCrystalsOf,
  nextCrystalOf,
  normalWord,
  resultsOf,
  ritualSentencesOf,
  scoreOf,
  sentencesOf,
} from '../../src/astral-mage/core/index.js';
import { manifest } from '../../src/astral-mage/manifest.js';
import { LONG_STORY, STORY, castAll, create, ofType, settle, shoot, stepsOf, tickN } from './helpers.js';

/** The crystal of a word that is not the next one (a wrong crystal). */
const wrongCrystal = (sim: ReturnType<typeof create>) => {
  const next = nextCrystalOf(sim.state)!;
  return sim.state.crystals.find((c) => !c.struck && c.dimMs <= 0 && c.id !== next.id && normalWord(c.word) !== normalWord(next.word))!;
};

describe('content', () => {
  it('builds a casting of up to 5 rituals from sentences of 3 to 8 words, in a seeded order', () => {
    const casting = castingOf(STORY, createRng(3), TUNING.maxRituals);
    expect(casting).toHaveLength(5);
    expect(new Set(casting.map((r) => r.id)).size).toBe(5);
    casting.forEach((ritual, i) => {
      const sentence = STORY.sentences.find((s) => s.id === ritual.id)!;
      expect(ritual.words).toEqual(sentence.words);
      expect(ritual.text).toBe(sentence.text);
      expect(ritual.ritualId).toBe(`ritual-${i + 1}`);
      expect(ritual.words.length).toBeGreaterThanOrEqual(RITUAL_WORDS.min);
      expect(ritual.words.length).toBeLessThanOrEqual(RITUAL_WORDS.max);
      expect(ritual).toMatchObject({ refusals: 0, started: false, cleared: false });
    });
    expect(castingOf(STORY, createRng(3), 5).map((r) => r.id)).toEqual(casting.map((r) => r.id));
    expect(castingOf(STORY, createRng(4), 5).map((r) => r.id)).not.toEqual(casting.map((r) => r.id));
  });

  it('leaves out long sentences and uses fewer rituals when the story has fewer', () => {
    const fit = ritualSentencesOf(LONG_STORY);
    expect(fit.every((s) => s.words.length <= RITUAL_WORDS.max)).toBe(true);
    expect(castingOf(LONG_STORY, createRng(1), TUNING.maxRituals)).toHaveLength(Math.min(5, fit.length));
  });

  it('accepts the APK SentenceInput, and an empty list is a finished casting', () => {
    const input = [
      { term: 'The cat sleeps.', translation: 'x' },
      { term: 'Hi', translation: '' },
      { term: 'The dog runs fast.', translation: '' },
    ];
    expect(sentencesOf(input).map((s) => s.id)).toEqual(['s-1', 's-3']);
    const sim = createAstralMage(input, { seed: 1, helper: false });
    expect(sim.state.rituals).toBe(2);
    expect(createAstralMage([], { seed: 1, helper: false }).state.phase).toBe('complete');
  });

  it('the echo word is a word of another sentence that is not in this one', () => {
    for (const ritual of castingOf(STORY, createRng(2), 5)) {
      const echo = echoWordOf(STORY, ritual.id, ritual.words, createRng(5))!;
      expect(echo).toBeTruthy();
      expect(ritual.words.map(normalWord)).not.toContain(normalWord(echo));
    }
    expect(echoWordOf([{ term: 'Only one sentence.', translation: '' }], 's-1', ['Only', 'one', 'sentence.'], createRng(1))).toBeNull();
  });

  it('the manifest is a story cartridge for A0 to A1 in both renderers', () => {
    expect(manifest).toMatchObject({
      id: 'astral-mage',
      inputMode: 'story',
      simulation: 'realtime',
      levels: ['Pre-A1', 'A0', 'A0+', 'A1'],
      needs: { sentences: 3 },
      briefingKey: 'astralMage.briefing',
    });
    expect(manifest.renderers).toEqual(['three', 'phaser']);
  });
});

describe('the ritual', () => {
  it('starts with a crystal per word and one echo crystal on the floor, and ritualStarted on the first tick', () => {
    const sim = create(3);
    const ritual = sim.state.casting[0]!;
    expect(sim.state.mage).toMatchObject({ x: MAGE_START.x, z: MAGE_START.z });
    const words = sim.state.crystals.filter((c) => c.kind === 'word').sort((a, b) => a.index - b.index);
    expect(words.map((c) => c.word)).toEqual(ritual.words);
    expect(sim.state.crystals.filter((c) => c.kind === 'echo')).toHaveLength(1);
    for (const c of sim.state.crystals) {
      expect(c).toMatchObject({ struck: false, dimMs: 0 });
      expect(c.ax).toBeGreaterThanOrEqual(FLOOR.minX);
      expect(c.ax).toBeLessThanOrEqual(FLOOR.maxX);
      expect(c.az).toBeGreaterThanOrEqual(FLOOR.minZ);
      expect(c.az).toBeLessThanOrEqual(FLOOR.maxZ);
    }
    expect(sim.state).toMatchObject({ next: 0, bolt: null, ritual: 0, rituals: 5, phase: 'playing' });
    expect(sim.state.aimId).not.toBeNull();
    const started = ofType(sim.tick(), 'ritualStarted');
    expect(started).toHaveLength(1);
    expect(started[0]).toMatchObject({ ritualId: 'ritual-1', sentenceId: ritual.id, words: ritual.words });
    expect(started[0]!.crystals.map((c) => c.id)).toEqual(sim.state.crystals.map((c) => c.id));
  });

  it('crystals drift on a loop around their anchors, and never leave their loop', () => {
    const sim = create(3);
    const before = sim.state.crystals.map((c) => ({ x: c.x, z: c.z }));
    tickN(sim, 45);
    const moved = sim.state.crystals.filter((c, i) => distance(c, before[i]!) > 0.05);
    expect(moved.length).toBe(sim.state.crystals.length);
    for (let k = 0; k < 300; k++) {
      sim.tick();
      for (const c of sim.state.crystals) expect(distance(c, { x: c.ax, z: c.az })).toBeLessThanOrEqual(TUNING.driftRadius * 1.5);
    }
  });

  it('a bolt at the next word flies, strikes, and fills the sentence', () => {
    const sim = create(3);
    sim.tick();
    const next = nextCrystalOf(sim.state)!;
    const cast = sim.dispatch({ type: 'cast', crystalId: next.id });
    expect(cast).toEqual([{ type: 'boltCast', boltId: 'b1', targetId: next.id }]);
    expect(sim.state.bolt).toMatchObject({ targetId: next.id });
    // Only one bolt at a time.
    expect(sim.dispatch({ type: 'cast', crystalId: wrongCrystal(sim).id })).toEqual([]);
    const events = settle(sim);
    expect(ofType(events, 'crystalStruck')).toEqual([{ type: 'crystalStruck', id: next.id, index: 0 }]);
    expect(sim.state).toMatchObject({ next: 1, bolt: null, struck: 1 });
    expect(sim.state.crystals.find((c) => c.id === next.id)!.struck).toBe(true);
    expect(sim.state.casting[0]).toMatchObject({ started: true, refusals: 0, cleared: false });
  });

  it('a bolt at another crystal fizzles: the crystal dims for 1.5 s, and that counts a reading attempt', () => {
    const sim = create(3);
    sim.tick();
    const wrong = wrongCrystal(sim);
    sim.dispatch({ type: 'cast', crystalId: wrong.id });
    const events = settle(sim);
    expect(ofType(events, 'crystalFizzled')).toEqual([{ type: 'crystalFizzled', id: wrong.id }]);
    expect(sim.state).toMatchObject({ next: 0, struck: 0 });
    expect(sim.state.casting[0]).toMatchObject({ refusals: 1, started: true });
    const dim = sim.state.crystals.find((c) => c.id === wrong.id)!;
    expect(dim.dimMs).toBeGreaterThan(0);
    // A dim crystal takes no bolt, and the dim ends.
    expect(sim.dispatch({ type: 'cast', crystalId: wrong.id })).toEqual([]);
    tickN(sim, stepsOf(TUNING.dimMs) + 2);
    expect(dim.dimMs).toBe(0);
    expect(sim.dispatch({ type: 'cast', crystalId: wrong.id })).toHaveLength(1);
  });

  it('the echo crystal is always wrong', () => {
    const sim = create(5);
    const echo = sim.state.crystals.find((c) => c.kind === 'echo')!;
    const events = shoot(sim, echo.id);
    expect(ofType(events, 'crystalFizzled')).toHaveLength(1);
    expect(sim.state.next).toBe(0);
  });

  it('a repeated word is the same word: either crystal of it may be struck', () => {
    const input = [
      { term: 'The cat and the dog', translation: '' },
      { term: 'A fish swims', translation: '' },
      { term: 'Birds can fly', translation: '' },
    ];
    // Find a seed whose first ritual is the repeated-word sentence.
    let sim2 = createAstralMage(input, { seed: 1, helper: false });
    for (let seed = 2; seed < 60 && sim2.state.casting[0]!.words.length !== 5; seed++) sim2 = createAstralMage(input, { seed, helper: false });
    expect(sim2.state.casting[0]!.words).toEqual(['The', 'cat', 'and', 'the', 'dog']);
    sim2.tick();
    // The first word is "The": the crystal of the second "the" (c4) takes the strike, and the two swap places in the order.
    const events = shoot(sim2, 'c4');
    expect(ofType(events, 'crystalStruck')).toEqual([{ type: 'crystalStruck', id: 'c4', index: 0 }]);
    expect(sim2.state.crystals.find((c) => c.id === 'c1')!.index).toBe(3);
    while (sim2.state.ritual === 0) shoot(sim2, nextCrystalOf(sim2.state)!.id);
    expect(sim2.state.casting[0]).toMatchObject({ cleared: true, refusals: 0 });
  });

  it('the whole sentence clears the ritual and the next ritual starts at once', () => {
    const sim = create(3);
    sim.tick();
    const first = sim.state.casting[0]!;
    const events = castAll(sim);
    expect(ofType(events, 'crystalStruck')).toHaveLength(first.words.length);
    expect(ofType(events, 'ritualCleared')).toEqual([{ type: 'ritualCleared', ritualId: 'ritual-1', sentenceId: first.id }]);
    expect(ofType(events, 'ritualStarted')).toHaveLength(1);
    expect(sim.state).toMatchObject({ ritual: 1, next: 0, ritualsCleared: 1 });
    expect(sim.state.crystals.map((c) => c.word).filter((w) => !first.words.includes(w)).length).toBeGreaterThanOrEqual(0);
    expect(first).toMatchObject({ cleared: true, refusals: 0 });
  });

  it('keyboard aim moves between live crystals, left to right, and cast uses the aimed crystal', () => {
    const sim = create(3);
    const order = liveCrystalsOf(sim.state).map((c) => c.id);
    expect(sim.state.aimId).toBe(order[0]);
    expect(sim.dispatch({ type: 'aim', dir: 1 })).toEqual([{ type: 'aimed', crystalId: order[1]! }]);
    expect(sim.dispatch({ type: 'aim', dir: -1 })).toEqual([{ type: 'aimed', crystalId: order[0]! }]);
    expect(sim.dispatch({ type: 'aim', dir: -1 })).toEqual([{ type: 'aimed', crystalId: order[order.length - 1]! }]);
    expect(sim.dispatch({ type: 'cast' })).toEqual([{ type: 'boltCast', boltId: 'b1', targetId: order[order.length - 1]! }]);
    expect(sim.dispatch({ type: 'cast', crystalId: 'nope' })).toEqual([]);
  });

  it('there is no game over: any number of wrong bolts costs only reading attempts', () => {
    const sim = create(3);
    sim.tick();
    for (let k = 0; k < 6; k++) {
      shoot(sim, wrongCrystal(sim).id);
      tickN(sim, stepsOf(TUNING.dimMs) + 2);
    }
    expect(sim.state.phase).toBe('playing');
    expect(sim.state.casting[0]!.refusals).toBe(6);
    expect(ASTRAL_MAGE_EVENT_TYPES).not.toContain('gameOver');
    castAll(sim);
    expect(sim.state.ritual).toBe(1);
  });
});

describe('the casting', () => {
  it('ends after the last ritual with castingComplete, and then ignores commands', () => {
    const sim = create(3);
    sim.tick();
    const events: ReturnType<typeof castAll> = [];
    while (sim.state.phase === 'playing') events.push(...castAll(sim));
    expect(ofType(events, 'castingComplete')).toEqual([{ type: 'castingComplete', rituals: 5 }]);
    expect(sim.state).toMatchObject({ phase: 'complete', ritualsCleared: 5, bolt: null, aimId: null });
    expect(sim.dispatch({ type: 'cast', crystalId: 'c1' })).toEqual([]);
    expect(sim.tick()).toEqual([]);
  });

  it('evidence has one sentence item per ritual, attempts = fizzles + 1, and the score is 10 per word + 50 per ritual', () => {
    const sim = create(3);
    sim.tick();
    shoot(sim, wrongCrystal(sim).id);
    tickN(sim, stepsOf(TUNING.dimMs) + 2);
    while (sim.state.phase === 'playing') castAll(sim);
    const evidence = evidenceOf(sim.state, STORY, 3, 1234);
    expect(storyGameEvidenceSchema.parse(evidence)).toEqual(evidence);
    expect(evidence.items).toHaveLength(5);
    expect(evidence.items.map((i) => i.itemId)).toEqual(sim.state.casting.map((r) => r.id));
    expect(evidence.items[0]).toMatchObject({ itemKind: 'sentence', attempts: 2, correctFirstTry: false, solved: true });
    expect(evidence.items[1]).toMatchObject({ attempts: 1, correctFirstTry: true, solved: true });
    expect(evidence.practice).toEqual([sim.state.casting[0]!.text]);
    const words = sim.state.casting.reduce((n, r) => n + r.words.length, 0);
    expect(scoreOf(sim.state)).toBe(words * SCORE.struck + 5 * SCORE.ritual);
    const { results, outcome } = resultsOf(sim.state, STORY, 3, 1234);
    expect(results).toEqual(toGameResults(evidence, scoreOf(sim.state)));
    expect(outcome).toBe('victory');
  });

  it('speed never gives score or xp: the same casting after more game time has the same results', () => {
    const quick = create(3);
    const slow = create(3);
    quick.tick();
    slow.tick();
    tickN(slow, stepsOf(60_000));
    while (quick.state.phase === 'playing') castAll(quick);
    while (slow.state.phase === 'playing') castAll(slow);
    expect(resultsOf(slow.state, STORY, 3, 999_999).results).toEqual(resultsOf(quick.state, STORY, 3, 1).results);
  });

  it('every tuning number is positive and the manifest budget allows the load', () => {
    for (const v of Object.values(TUNING)) expect(v).toBeGreaterThan(0);
    expect(manifest.budget.firstLoadBytes).toBeGreaterThan(0);
  });
});
