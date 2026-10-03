/** The Alchemist's Synthesis rules of sections 3 and 4 of docs/game-alchemists-synthesis-3d.md. */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema, toGameResults } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createRng, STEP_MS } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  ALCHEMISTS_SYNTHESIS_EVENT_TYPES,
  INGREDIENT_KINDS,
  TUNING,
  correctJarOf,
  createAlchemistsSynthesis,
  decoysFor,
  evidenceOf,
  formulasOf,
  jarsFor,
  resultsOf,
  scoreOf,
  wordsOf,
} from '../../src/alchemists-synthesis/core/index.js';
import { SHORT_STORY, STORY, answer, create, ofType, pick, tickN } from './helpers.js';

describe('content', () => {
  it('builds up to 10 formulas, every word once, in a seeded order', () => {
    const words = formulasOf(STORY, createRng(3), TUNING.maxWords);
    expect(words).toHaveLength(TUNING.maxWords);
    expect(new Set(words.map((w) => w.id)).size).toBe(words.length);
    for (const w of words) {
      const source = STORY.vocabulary.find((v) => v.id === w.id)!;
      expect(w.term).toBe(source.term);
      expect(w.translation).toBe(source.translation);
      expect(w.attempts).toBe(0);
      expect(w.started || w.solved).toBe(false);
    }
    expect(formulasOf(STORY, createRng(3), 10).map((w) => w.id)).toEqual(words.map((w) => w.id));
    expect(formulasOf(STORY, createRng(4), 10).map((w) => w.id)).not.toEqual(words.map((w) => w.id));
  });

  it('uses fewer formulas when the story has fewer words', () => {
    expect(formulasOf(SHORT_STORY, createRng(1), TUNING.maxWords)).toHaveLength(SHORT_STORY.vocabulary.length);
  });

  it('accepts the APK VocabularyInput too, and skips words with no term or no meaning', () => {
    const words = wordsOf([
      { term: 'cat', translation: 'แมว' },
      { term: '  ', translation: 'x' },
      { term: 'dog', translation: '' },
      { term: 'bird', translation: 'นก' },
    ]);
    expect(words).toEqual([
      { id: 'w-1', term: 'cat', translation: 'แมว' },
      { id: 'w-4', term: 'bird', translation: 'นก' },
    ]);
  });

  it('jars: the right term and distinct decoy terms, the right one at a seeded place', () => {
    const words = wordsOf(STORY);
    const word = words[0]!;
    const jars = jarsFor(word, words, 4, createRng(5));
    expect(jars).toHaveLength(4);
    expect(jars.filter((j) => j.correct)).toHaveLength(1);
    expect(jars.find((j) => j.correct)!.term).toBe(word.term);
    expect(new Set(jars.map((j) => j.term.toLowerCase())).size).toBe(4);
    expect(jars.every((j) => INGREDIENT_KINDS.includes(j.kind))).toBe(true);
    expect(jarsFor(word, words, 4, createRng(5))).toEqual(jars);
    const places = new Set(Array.from({ length: 24 }, (_, s) => jarsFor(word, words, 4, createRng(s)).findIndex((j) => j.correct)));
    expect(places.size).toBeGreaterThan(1);
  });

  it('decoys skip a repeated term and the word itself', () => {
    const words = [
      { id: 'a', term: 'Cat', translation: '1' },
      { id: 'b', term: 'cat', translation: '2' },
      { id: 'c', term: 'dog', translation: '3' },
      { id: 'd', term: 'dog', translation: '4' },
    ];
    expect(decoysFor(words[0]!, words).map((d) => d.id)).toEqual(['c']);
  });

  it('fewer jars when the story has too few distinct terms', () => {
    const sim = createAlchemistsSynthesis([{ term: 'cat', translation: 'a' }, { term: 'dog', translation: 'b' }], { seed: 1, helper: false });
    expect(sim.state.jars).toHaveLength(2);
  });
});

describe('a round', () => {
  it('starts with the first formula and four jars; roundStarted comes with the first tick', () => {
    const sim = create(7);
    expect(sim.state.phase).toBe('playing');
    expect(sim.state.rounds).toBe(10);
    expect(sim.state.jars).toHaveLength(4);
    expect(sim.state.aimId).toBe('j1');
    const [first] = ofType(sim.tick(), 'roundStarted');
    expect(first).toMatchObject({ round: 0, wordId: sim.state.words[0]!.id, translation: sim.state.words[0]!.translation });
    expect(first!.jars.map((j) => j.id)).toEqual(['j1', 'j2', 'j3', 'j4']);
    expect(ofType(sim.tick(), 'roundStarted')).toHaveLength(0);
  });

  it('a wrong jar dims for 1.5 s, counts an attempt, and changes nothing else', () => {
    const sim = create(7);
    sim.tick();
    const wrong = sim.state.jars.find((j) => !j.correct)!;
    const events = sim.dispatch({ type: 'choose', jarId: wrong.id });
    expect(events).toEqual([{ type: 'jarFizzled', jarId: wrong.id, wordId: sim.state.words[0]!.id }]);
    expect(wrong.dimMs).toBe(TUNING.dimMs);
    expect(sim.state.words[0]).toMatchObject({ attempts: 1, started: true, solved: false });
    expect(sim.state.round).toBe(0);
    expect(sim.state.pour).toBeNull();
    // A dim jar cannot be chosen again until it brightens.
    expect(sim.dispatch({ type: 'choose', jarId: wrong.id })).toEqual([]);
    expect(sim.state.words[0]!.attempts).toBe(1);
    tickN(sim, Math.ceil(TUNING.dimMs / STEP_MS) + 1);
    expect(wrong.dimMs).toBe(0);
    expect(sim.dispatch({ type: 'choose', jarId: wrong.id })).toHaveLength(1);
    expect(sim.state.words[0]!.attempts).toBe(2);
  });

  it('the right jar pours, locks the bench, and brews the elixir after the pour', () => {
    const sim = create(7);
    sim.tick();
    const right = correctJarOf(sim.state)!;
    const poured = sim.dispatch({ type: 'choose', jarId: right.id });
    expect(poured).toEqual([{ type: 'jarPoured', jarId: right.id, wordId: sim.state.words[0]!.id, first: true }]);
    expect(sim.state.pour).toEqual({ jarId: right.id, ms: TUNING.pourMs });
    expect(sim.state.words[0]).toMatchObject({ attempts: 1, started: true, solved: true });
    // Nothing else is taken while the pour runs.
    expect(sim.dispatch({ type: 'choose', jarId: sim.state.jars.find((j) => !j.correct)!.id })).toEqual([]);
    expect(sim.dispatch({ type: 'choose', jarId: right.id })).toEqual([]);
    const events = tickN(sim, Math.ceil(TUNING.pourMs / STEP_MS) + 1);
    expect(ofType(events, 'elixirBrewed')).toEqual([{ type: 'elixirBrewed', round: 0, wordId: sim.state.words[0]!.id, brewed: 1 }]);
    expect(ofType(events, 'roundStarted')).toHaveLength(1);
    expect(sim.state.round).toBe(1);
    expect(sim.state.pour).toBeNull();
    expect(sim.state.brewed).toBe(1);
  });

  it('a right jar after a wrong one is not first try', () => {
    const sim = create(7);
    sim.tick();
    pick(sim, sim.state.jars.find((j) => !j.correct)!.id);
    const [poured] = ofType(answer(sim), 'jarPoured');
    expect(poured!.first).toBe(false);
    expect(sim.state.words[0]).toMatchObject({ attempts: 2, solved: true });
  });

  it('the cursor moves between jars and wraps; Space-style choose takes the jar under it', () => {
    const sim = create(7);
    sim.tick();
    expect(sim.dispatch({ type: 'aim', dir: 1 })).toEqual([{ type: 'aimed', jarId: 'j2' }]);
    expect(sim.dispatch({ type: 'aim', dir: -1 })).toEqual([{ type: 'aimed', jarId: 'j1' }]);
    expect(sim.dispatch({ type: 'aim', dir: -1 })).toEqual([{ type: 'aimed', jarId: 'j4' }]);
    const events = sim.dispatch({ type: 'choose' });
    expect(events).toHaveLength(1);
    expect(events[0]!.type === 'jarPoured' || events[0]!.type === 'jarFizzled').toBe(true);
    expect(sim.state.words[0]!.attempts).toBe(1);
  });

  it('an unknown jar does nothing', () => {
    const sim = create(7);
    expect(sim.dispatch({ type: 'choose', jarId: 'nope' })).toEqual([]);
  });
});

describe('the synthesis', () => {
  it('answers every formula right: complete, one event, no game over, state frozen after', () => {
    const sim = create(7);
    const events = [...sim.tick()];
    while (sim.state.phase === 'playing') events.push(...answer(sim));
    expect(ofType(events, 'synthesisComplete')).toEqual([{ type: 'synthesisComplete', rounds: 10 }]);
    expect(ofType(events, 'elixirBrewed')).toHaveLength(10);
    expect(ofType(events, 'roundStarted')).toHaveLength(10);
    expect(sim.state.brewed).toBe(10);
    expect(sim.state.aimId).toBeNull();
    expect(sim.dispatch({ type: 'choose', jarId: 'j1' })).toEqual([]);
    expect(sim.tick()).toEqual([]);
  });

  it('wrong answers never end it: ten wrong picks on one formula, then it still finishes', () => {
    const sim = create(2);
    sim.tick();
    for (let i = 0; i < 10; i++) {
      const wrong = sim.state.jars.filter((j) => !j.correct && j.dimMs <= 0)[0];
      if (wrong) sim.dispatch({ type: 'choose', jarId: wrong.id });
      tickN(sim, Math.ceil(TUNING.dimMs / STEP_MS) + 1);
    }
    expect(sim.state.phase).toBe('playing');
    while (sim.state.phase === 'playing') answer(sim);
    expect(sim.state.phase).toBe('complete');
  });

  it('time alone decides nothing: a long wait changes no counters', () => {
    const sim = create(7);
    tickN(sim, 30 * 600);
    expect(sim.state.phase).toBe('playing');
    expect(sim.state.round).toBe(0);
    expect(sim.state.words.every((w) => w.attempts === 0)).toBe(true);
  });

  it('a story with no words is over before it starts', () => {
    const sim = createAlchemistsSynthesis([], { seed: 1, helper: false });
    expect(sim.state.phase).toBe('complete');
    expect(sim.state.rounds).toBe(0);
    expect(sim.tick()).toEqual([]);
  });

  it('the event list names every event type the core emits', () => {
    const sim = create(3);
    const seen = new Set<string>();
    const note = (events: { type: string }[]) => events.forEach((e) => seen.add(e.type));
    note(sim.tick());
    note(sim.dispatch({ type: 'aim', dir: 1 }));
    note(sim.dispatch({ type: 'choose', jarId: sim.state.jars.find((j) => !j.correct)!.id }));
    while (sim.state.phase === 'playing') note(answer(sim));
    expect([...seen].sort()).toEqual([...ALCHEMISTS_SYNTHESIS_EVENT_TYPES].sort());
  });
});

describe('evidence and results', () => {
  it('one word item per formula touched: attempts, first try, solved; practice lists the misses', () => {
    const sim = create(7);
    sim.tick();
    // Formula 1: wrong twice, then right. Formula 2: right at once. Formula 3: one wrong pick, not finished.
    const wrongs = sim.state.jars.filter((j) => !j.correct);
    pick(sim, wrongs[0]!.id);
    pick(sim, wrongs[1]!.id);
    answer(sim);
    answer(sim);
    pick(sim, sim.state.jars.find((j) => !j.correct)!.id);
    const evidence = evidenceOf(sim.state, STORY, 7, 1234.4);
    expect(storyGameEvidenceSchema.safeParse(evidence).success).toBe(true);
    expect(evidence.gameId).toBe('alchemists-synthesis');
    expect(evidence.durationMs).toBe(1234);
    expect(evidence.items).toEqual([
      { itemId: sim.state.words[0]!.id, itemKind: 'word', label: sim.state.words[0]!.term, attempts: 3, correctFirstTry: false, solved: true },
      { itemId: sim.state.words[1]!.id, itemKind: 'word', label: sim.state.words[1]!.term, attempts: 1, correctFirstTry: true, solved: true },
      { itemId: sim.state.words[2]!.id, itemKind: 'word', label: sim.state.words[2]!.term, attempts: 1, correctFirstTry: false, solved: false },
    ]);
    expect(evidence.practice).toEqual([sim.state.words[0]!.term, sim.state.words[2]!.term]);
  });

  it('score is 100 per right jar, whatever the speed', () => {
    const fast = create(7);
    fast.tick();
    answer(fast);
    answer(fast);
    const slow = create(7);
    tickN(slow, 30 * 120);
    answer(slow);
    answer(slow);
    expect(scoreOf(fast.state)).toBe(200);
    expect(scoreOf(slow.state)).toBe(200);
    expect(evidenceOf(fast.state, STORY, 7, 1000).items).toEqual(evidenceOf(slow.state, STORY, 7, 99_000).items);
  });

  it('resultsOf gives five-field results and a victory outcome when complete', () => {
    const sim = create(7);
    sim.tick();
    while (sim.state.phase === 'playing') answer(sim);
    const { evidence, results, outcome } = resultsOf(sim.state, STORY, 7, 5000);
    expect(outcome).toBe('victory');
    expect(results).toEqual(toGameResults(evidence, 1000));
    expect(resultsOf(create(7).state, STORY, 7, 0).outcome).not.toBe('victory');
  });
});
