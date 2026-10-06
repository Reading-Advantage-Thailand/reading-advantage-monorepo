/** The Rune Forge Chamber rules of sections 3 and 4 of docs/game-rune-forge-chamber-3d.md. */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema, toGameResults } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createRng, STEP_MS } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  ORBIT,
  RUNE_FORGE_CHAMBER_EVENT_TYPES,
  TUNING,
  WAVE_RUNES,
  createRuneForgeChamber,
  evidenceOf,
  forgeOf,
  isRight,
  normalWord,
  orbitPoint,
  resultsOf,
  rightRuneOf,
  scoreOf,
  sentencesOf,
  waveWordsOf,
} from '../../src/rune-forge-chamber/core/index.js';
import { LONG_STORY, STORY, create, forgeSentence, ofType, pick, strikeRight, tickN } from './helpers.js';

describe('content', () => {
  it('builds up to 5 blades from sentences of 3 to 8 words, each once, in a seeded order', () => {
    const blades = forgeOf(STORY, createRng(3), TUNING.maxBlades);
    expect(blades.length).toBeGreaterThan(0);
    expect(blades.length).toBeLessThanOrEqual(TUNING.maxBlades);
    expect(new Set(blades.map((b) => b.id)).size).toBe(blades.length);
    for (const b of blades) {
      expect(b.words.length).toBeGreaterThanOrEqual(3);
      expect(b.words.length).toBeLessThanOrEqual(8);
      expect(b.refusals).toBe(0);
      expect(b.started || b.forged).toBe(false);
    }
    expect(forgeOf(STORY, createRng(3), 5).map((b) => b.id)).toEqual(blades.map((b) => b.id));
    expect(forgeOf(STORY, createRng(4), 5).map((b) => b.id)).not.toEqual(blades.map((b) => b.id));
  });

  it('accepts the APK SentenceInput too, and skips one-word sentences', () => {
    const sentences = sentencesOf([
      { term: 'The cat sat', translation: 'แมวนั่ง' },
      { term: 'Hello', translation: 'x' },
      { term: '  Birds can fly  ', translation: '' },
    ]);
    expect(sentences).toEqual([
      { id: 's-1', text: 'The cat sat', words: ['The', 'cat', 'sat'], translation: 'แมวนั่ง' },
      { id: 's-3', text: 'Birds can fly', words: ['Birds', 'can', 'fly'] },
    ]);
  });

  it('a wave holds the answer and up to three other distinct words of the sentence', () => {
    const words = ['The', 'brave', 'little', 'mouse', 'ran', 'home'];
    for (let next = 0; next < words.length; next++) {
      const wave = waveWordsOf(words, next, createRng(next + 1));
      expect(wave).toHaveLength(WAVE_RUNES);
      expect(wave).toContain(words[next]);
      expect(new Set(wave).size).toBe(WAVE_RUNES);
      expect(wave.every((w) => words.includes(w))).toBe(true);
    }
    expect(waveWordsOf(words, 2, createRng(5))).toEqual(waveWordsOf(words, 2, createRng(5)));
  });

  it('a short or repeating sentence gets fewer runes; a repeated word is one rune', () => {
    expect(waveWordsOf(['go', 'now'], 0, createRng(1))).toHaveLength(2);
    expect(waveWordsOf(['the', 'big', 'The', 'big'], 0, createRng(1))).toHaveLength(2);
    expect(normalWord('Pip,')).toBe('pip');
  });
});

describe('the orbit', () => {
  it('turns at the legacy speed, as a pure function of the game time', () => {
    const sim = create(7);
    sim.tick();
    const rune = sim.state.runes[0]!;
    expect({ x: rune.x, z: rune.z }).toEqual(orbitPoint(rune.baseAngle, sim.state.rotation));
    tickN(sim, 29);
    expect(sim.state.rotation).toBeCloseTo(ORBIT.speed * (30 * STEP_MS) / 1000, 6);
    for (const r of sim.state.runes) {
      expect(Math.hypot((r.x - ORBIT.cx) / ORBIT.rx, (r.z - ORBIT.cz) / ORBIT.rz)).toBeCloseTo(1, 6);
    }
  });
});

describe('a wave', () => {
  it('starts with the first word; sentenceStarted and waveStarted come with the first tick', () => {
    const sim = create(7);
    expect(sim.state.phase).toBe('playing');
    expect(sim.state.next).toBe(0);
    expect(sim.state.runes.length).toBeGreaterThanOrEqual(2);
    expect(sim.state.aimId).toBe('r1');
    expect(rightRuneOf(sim.state)!.word).toBe(sim.state.forge[0]!.words[0]);
    const events = sim.tick();
    expect(ofType(events, 'sentenceStarted')).toEqual([
      { type: 'sentenceStarted', bladeId: 'blade-1', sentenceId: sim.state.forge[0]!.id, words: sim.state.forge[0]!.words },
    ]);
    const [wave] = ofType(events, 'waveStarted');
    expect(wave).toMatchObject({ sentence: 0, next: 0 });
    expect(wave!.runes.map((r) => r.id)).toEqual(sim.state.runes.map((r) => r.id));
    expect(ofType(sim.tick(), 'waveStarted')).toHaveLength(0);
  });

  it('a wrong rune dims for 1.5 s, counts an attempt, and changes nothing else', () => {
    const sim = create(7);
    sim.tick();
    const wrong = sim.state.runes.find((r) => !isRight(sim.state, r))!;
    const events = sim.dispatch({ type: 'choose', runeId: wrong.id });
    expect(events).toEqual([{ type: 'runeFizzled', runeId: wrong.id, word: wrong.word }]);
    expect(wrong.dimMs).toBe(TUNING.dimMs);
    expect(sim.state.forge[0]).toMatchObject({ refusals: 1, started: true, forged: false });
    expect(sim.state.next).toBe(0);
    expect(sim.state.strike).toBeNull();
    expect(sim.dispatch({ type: 'choose', runeId: wrong.id })).toEqual([]);
    expect(sim.state.forge[0]!.refusals).toBe(1);
    tickN(sim, Math.ceil(TUNING.dimMs / STEP_MS) + 1);
    expect(wrong.dimMs).toBe(0);
    expect(sim.dispatch({ type: 'choose', runeId: wrong.id })).toHaveLength(1);
    expect(sim.state.forge[0]!.refusals).toBe(2);
  });

  it('the right rune strikes, locks the anvil, and the next wave comes after the strike', () => {
    const sim = create(7);
    sim.tick();
    const right = rightRuneOf(sim.state)!;
    const word = right.word;
    expect(sim.dispatch({ type: 'choose', runeId: right.id })).toEqual([{ type: 'runeStruck', runeId: right.id, word, index: 0, first: true }]);
    expect(sim.state.strike).toEqual({ runeId: right.id, ms: TUNING.strikeMs });
    expect(sim.state.next).toBe(1);
    expect(sim.state.wordsForged).toBe(1);
    // Nothing else is taken while the strike runs.
    expect(sim.dispatch({ type: 'choose', runeId: sim.state.runes.find((r) => r.id !== right.id)!.id })).toEqual([]);
    expect(sim.dispatch({ type: 'choose', runeId: right.id })).toEqual([]);
    const events = tickN(sim, Math.ceil(TUNING.strikeMs / STEP_MS) + 1);
    expect(ofType(events, 'waveStarted')).toHaveLength(1);
    expect(sim.state.strike).toBeNull();
    expect(rightRuneOf(sim.state)!.word).toBe(sim.state.forge[0]!.words[1]);
  });

  it('a right rune after a wrong one for the same word is not first try, but the next word is', () => {
    const sim = create(7);
    sim.tick();
    pick(sim, sim.state.runes.find((r) => !isRight(sim.state, r))!.id);
    const [struck] = ofType(strikeRight(sim), 'runeStruck');
    expect(struck!.first).toBe(false);
    sim.dispatch({ type: 'aim', dir: 1 });
    const [second] = ofType(strikeRight(sim), 'runeStruck');
    expect(second!.first).toBe(true);
  });

  it('a repeated word is the same word: either rune of it is right', () => {
    const sim = createRuneForgeChamber([{ term: 'the big the', translation: 'x' }], { seed: 1, helper: false });
    expect(sim.state.forge[0]!.words).toEqual(['the', 'big', 'the']);
    // The wave of word 0 holds "the" once: the repeated word is not a decoy.
    expect(sim.state.runes.map((r) => r.word).sort()).toEqual(['big', 'the']);
  });

  it('the cursor moves between runes and wraps; Space-style choose takes the rune under it', () => {
    const sim = create(7);
    sim.tick();
    const n = sim.state.runes.length;
    expect(sim.dispatch({ type: 'aim', dir: 1 })).toEqual([{ type: 'aimed', runeId: 'r2' }]);
    expect(sim.dispatch({ type: 'aim', dir: -1 })).toEqual([{ type: 'aimed', runeId: 'r1' }]);
    expect(sim.dispatch({ type: 'aim', dir: -1 })).toEqual([{ type: 'aimed', runeId: `r${n}` }]);
    const events = sim.dispatch({ type: 'choose' });
    expect(events).toHaveLength(1);
    expect(events[0]!.type === 'runeStruck' || events[0]!.type === 'runeFizzled').toBe(true);
  });

  it('an unknown rune does nothing', () => {
    expect(create(7).dispatch({ type: 'choose', runeId: 'nope' })).toEqual([]);
  });
});

describe('the forge', () => {
  it('forges every sentence: complete, one event, no game over, state frozen after', () => {
    const sim = create(7);
    const events = [...sim.tick()];
    while (sim.state.phase === 'playing') events.push(...forgeSentence(sim));
    const total = sim.state.forge.reduce((n, b) => n + b.words.length, 0);
    expect(ofType(events, 'forgeComplete')).toEqual([{ type: 'forgeComplete', sentences: sim.state.sentences }]);
    expect(ofType(events, 'sentenceForged')).toHaveLength(sim.state.sentences);
    expect(ofType(events, 'sentenceStarted')).toHaveLength(sim.state.sentences);
    expect(ofType(events, 'runeStruck')).toHaveLength(total);
    expect(sim.state.wordsForged).toBe(total);
    expect(sim.state.aimId).toBeNull();
    expect(sim.dispatch({ type: 'choose', runeId: 'r1' })).toEqual([]);
    expect(sim.tick()).toEqual([]);
  });

  it('wrong runes never end it: many wrong picks on one word, then it still finishes', () => {
    const sim = create(2);
    sim.tick();
    for (let i = 0; i < 12; i++) {
      const wrong = sim.state.runes.find((r) => !isRight(sim.state, r) && r.dimMs <= 0);
      if (wrong) sim.dispatch({ type: 'choose', runeId: wrong.id });
      tickN(sim, Math.ceil(TUNING.dimMs / STEP_MS) + 1);
    }
    expect(sim.state.phase).toBe('playing');
    while (sim.state.phase === 'playing') forgeSentence(sim);
    expect(sim.state.phase).toBe('complete');
  });

  it('time alone decides nothing: a long wait changes no counters (the old 12 s timer is gone)', () => {
    const sim = create(7);
    tickN(sim, 30 * 600);
    expect(sim.state.phase).toBe('playing');
    expect(sim.state.next).toBe(0);
    expect(sim.state.forge.every((b) => b.refusals === 0 && !b.started)).toBe(true);
  });

  it('a story with no sentences is over before it starts', () => {
    const sim = createRuneForgeChamber([], { seed: 1, helper: false });
    expect(sim.state.phase).toBe('complete');
    expect(sim.state.sentences).toBe(0);
    expect(sim.tick()).toEqual([]);
  });

  it('the event list names every event type the core emits', () => {
    const sim = create(3);
    const seen = new Set<string>();
    const note = (events: { type: string }[]) => events.forEach((e) => seen.add(e.type));
    note(sim.tick());
    note(sim.dispatch({ type: 'aim', dir: 1 }));
    note(sim.dispatch({ type: 'choose', runeId: sim.state.runes.find((r) => !isRight(sim.state, r))!.id }));
    while (sim.state.phase === 'playing') note(forgeSentence(sim));
    expect([...seen].sort()).toEqual([...RUNE_FORGE_CHAMBER_EVENT_TYPES].sort());
  });
});

describe('evidence and results', () => {
  it('one sentence item per blade touched: attempts, first try, solved; practice lists the misses', () => {
    const sim = create(7, false, LONG_STORY);
    sim.tick();
    // Blade 1: one wrong rune, then forged. Blade 2: forged clean. Blade 3: one wrong rune, not finished.
    pick(sim, sim.state.runes.find((r) => !isRight(sim.state, r))!.id);
    forgeSentence(sim);
    forgeSentence(sim);
    pick(sim, sim.state.runes.find((r) => !isRight(sim.state, r))!.id);
    const evidence = evidenceOf(sim.state, LONG_STORY, 7, 1234.4);
    const [b1, b2, b3] = sim.state.forge;
    expect(storyGameEvidenceSchema.safeParse(evidence).success).toBe(true);
    expect(evidence.gameId).toBe('rune-forge-chamber');
    expect(evidence.durationMs).toBe(1234);
    expect(evidence.items.map(({ itemId, itemKind, attempts, correctFirstTry, solved }) => ({ itemId, itemKind, attempts, correctFirstTry, solved }))).toEqual([
      { itemId: b1!.id, itemKind: 'sentence', attempts: 2, correctFirstTry: false, solved: true },
      { itemId: b2!.id, itemKind: 'sentence', attempts: 1, correctFirstTry: true, solved: true },
      { itemId: b3!.id, itemKind: 'sentence', attempts: 2, correctFirstTry: false, solved: false },
    ]);
    expect(evidence.practice).toEqual([b1!.text, b3!.text]);
  });

  it('score is 100 per forged word, whatever the speed', () => {
    const fast = create(7);
    fast.tick();
    strikeRight(fast);
    strikeRight(fast);
    const slow = create(7);
    tickN(slow, 30 * 120);
    strikeRight(slow);
    strikeRight(slow);
    expect(scoreOf(fast.state)).toBe(200);
    expect(scoreOf(slow.state)).toBe(200);
    expect(evidenceOf(fast.state, STORY, 7, 1000).items).toEqual(evidenceOf(slow.state, STORY, 7, 99_000).items);
  });

  it('resultsOf gives five-field results and a victory outcome when complete', () => {
    const sim = create(7);
    sim.tick();
    while (sim.state.phase === 'playing') forgeSentence(sim);
    const { evidence, results, outcome } = resultsOf(sim.state, STORY, 7, 5000);
    expect(outcome).toBe('victory');
    expect(results).toEqual(toGameResults(evidence, scoreOf(sim.state)));
    expect(resultsOf(create(7).state, STORY, 7, 0).outcome).not.toBe('victory');
  });
});
