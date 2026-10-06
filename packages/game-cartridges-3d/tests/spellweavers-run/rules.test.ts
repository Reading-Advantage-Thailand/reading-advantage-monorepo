/** The Spellweaver's Run rules (docs/game-spellweavers-run-3d.md). */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema, toGameResults } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  SPELLWEAVERS_EVENT_TYPES,
  TUNING,
  correctLaneOf,
  createSpellweaversRun,
  evidenceOf,
  normWord,
  orbsFor,
  resultsOf,
  runOf,
  sentencesOf,
  wordPoolOf,
  type SpellweaversEvent,
} from '../../src/spellweavers-run/core/index.js';
import { LONG_STORY, STORY, chooseRight, chooseWrong, create, ofType, run, runUntil, stepsOf, tickN, untilRound } from './helpers.js';

describe('content', () => {
  it('builds a run of up to 5 sentences of 3 to 8 words, each once, in a seeded order', () => {
    const sentences = runOf(STORY, createRng(3), TUNING.maxSentences);
    expect(STORY.sentences.length).toBeGreaterThan(TUNING.maxSentences);
    expect(sentences).toHaveLength(TUNING.maxSentences);
    expect(new Set(sentences.map((s) => s.id)).size).toBe(TUNING.maxSentences);
    for (const s of sentences) {
      const source = STORY.sentences.find((x) => x.id === s.id)!;
      expect(s.words).toEqual(source.words);
      expect(s).toMatchObject({ misses: 0, started: false, cleared: false });
    }
    expect(runOf(STORY, createRng(3), 5).map((s) => s.id)).toEqual(sentences.map((s) => s.id));
    expect(runOf(STORY, createRng(4), 5).map((s) => s.id)).not.toEqual(sentences.map((s) => s.id));
    expect(runOf(LONG_STORY, createRng(1), 5)).toHaveLength(5);
  });

  it('accepts the APK SentenceInput with ids from the index; one-word sentences are skipped', () => {
    const input = [
      { term: 'The cat sat', translation: 'แมวนั่ง' },
      { term: 'Hello', translation: 'สวัสดี' },
      { term: ' A dog ran fast ', translation: '' },
    ];
    expect(sentencesOf(input)).toEqual([
      { id: 's-1', text: 'The cat sat', words: ['The', 'cat', 'sat'], translation: 'แมวนั่ง' },
      { id: 's-3', text: 'A dog ran fast', words: ['A', 'dog', 'ran', 'fast'] },
    ]);
    const sim = createSpellweaversRun(input, { seed: 1, helper: false });
    run(sim);
    expect(sim.state.sentences.every((s) => s.cleared)).toBe(true);
  });

  it('orbs: distinct from the answer and each other, the right one at a seeded lane', () => {
    const pool = wordPoolOf(STORY);
    const seen = new Set<number>();
    for (let seed = 1; seed <= 30; seed++) {
      const { options, correctLane } = orbsFor('Pip', pool, 3, createRng(seed));
      expect(options).toHaveLength(3);
      expect(options[correctLane]!.text).toBe('Pip');
      expect(new Set(options.map((o) => normWord(o.text))).size).toBe(3);
      seen.add(correctLane);
    }
    expect(seen.size).toBe(3);
    expect(orbsFor('a', ['a', 'b'], 3, createRng(1)).options.map((o) => o.text).sort()).toEqual(['a', 'b']);
    expect(normWord('Brave.')).toBe(normWord('brave'));
  });
});

describe('rounds', () => {
  it('the first tick opens round 1 for the first word, with 3 orbs (2 in Helper mode)', () => {
    const sim = create(5);
    const events = sim.tick();
    const started = ofType(events, 'roundStarted');
    expect(started).toHaveLength(1);
    const first = sim.state.sentences[0]!;
    expect(started[0]).toMatchObject({ sentence: 0, wordIndex: 0, retry: false });
    expect(started[0]!.options).toHaveLength(3);
    expect(sim.state.round!.options[sim.state.round!.correctLane]!.text).toBe(first.words[0]);
    expect(create(5, true).tick().find((e) => e.type === 'roundStarted')).toMatchObject({ options: expect.any(Array) });
    const helper = create(5, true);
    helper.tick();
    expect(helper.state.round!.options).toHaveLength(2);
  });

  it('the wizard waits before the orbs with no choice, for as long as it takes', () => {
    const sim = create(2);
    const { events } = runUntil(sim, (now) => now.some((e) => e.type === 'waiting'));
    expect(ofType(events, 'waiting')).toHaveLength(1);
    const at = sim.state.distance;
    const more = tickN(sim, stepsOf(120_000));
    expect(more.some((e) => e.type === 'waiting')).toBe(false);
    expect(sim.state.distance).toBe(at);
    expect(sim.state.speed).toBe(0);
    expect(sim.state.phase).toBe('running');
    expect(sim.state.round!.chosen).toBeNull();
    expect(at).toBeCloseTo(sim.state.round!.orbsAt - TUNING.hoverBefore, 5);
  });

  it('a right lane collects the word, boosts the run, and moves to the next word', () => {
    const sim = create(3);
    untilRound(sim);
    const first = sim.state.round!;
    const word = sim.state.sentences[0]!.words[0]!;
    const ev = chooseRight(sim);
    expect(ofType(ev, 'laneChosen')[0]).toMatchObject({ correct: true, correctLane: first.correctLane });
    expect(ofType(ev, 'wordCollected')[0]).toMatchObject({ sentence: 0, wordIndex: 0, text: word });
    expect(sim.state.word).toBe(1);
    expect(sim.state.score).toBe(TUNING.wordScore);
    expect(sim.state.speed).toBe(TUNING.boostSpeed);
    const next = runUntil(sim, (now) => now.some((e) => e.type === 'roundStarted'));
    expect(ofType(next.events, 'roundStarted')[0]).toMatchObject({ sentence: 0, wordIndex: 1 });
    expect(ofType(next.events, 'roundStarted')[0]!.orbsAt).toBe(first.orbsAt + TUNING.orbSpacing);
  });

  it('a wrong lane costs courage, rests, and brings the same word back with new orbs', () => {
    const sim = create(4);
    untilRound(sim);
    const at = sim.state.round!.orbsAt;
    const ev = chooseWrong(sim);
    expect(ofType(ev, 'laneChosen')[0]!.correct).toBe(false);
    expect(ofType(ev, 'courageLost')[0]).toEqual({ type: 'courageLost', courage: TUNING.courage - 1 });
    expect(sim.state.sentences[0]!.misses).toBe(1);
    expect(sim.state.word).toBe(0);
    expect(sim.state.score).toBe(0);
    expect(sim.state.restMs).toBe(TUNING.restMs);
    // No choice while the wizard rests.
    expect(chooseRight(sim)).toEqual([]);
    const back = runUntil(sim, (now) => now.some((e) => e.type === 'roundStarted'));
    expect(ofType(back.events, 'roundStarted')[0]).toMatchObject({ sentence: 0, wordIndex: 0, retry: true, orbsAt: at });
    expect(sim.state.round!.chosen).toBeNull();
    const word = sim.state.sentences[0]!.words[0]!;
    expect(sim.state.round!.options[correctLaneOf(sim.state)!]!.text).toBe(word);
    // The word right after a miss scores the lower amount.
    chooseRight(sim);
    expect(sim.state.score).toBe(TUNING.retryWordScore);
  });

  it('at 0 courage the wizard rests longer and gets all its courage back; there is no game over', () => {
    const sim = create(6);
    for (let i = 0; i < TUNING.courage; i++) {
      untilRound(sim);
      chooseWrong(sim);
    }
    expect(sim.state.courage).toBe(0);
    expect(sim.state.restMs).toBe(TUNING.restEmptyMs);
    const back = runUntil(sim, (now) => now.some((e) => e.type === 'roundStarted'));
    expect(ofType(back.events, 'rested')).toEqual([{ type: 'rested', courage: TUNING.courage }]);
    expect(sim.state.courage).toBe(TUNING.courage);
    expect(sim.state.phase).toBe('running');
    run(sim);
    expect(sim.state.phase).toBe('complete');
  });

  it('the last word of a sentence casts the spell and the next sentence starts with word 1', () => {
    const sim = create(8);
    const events = run(sim);
    const casts = ofType(events, 'sentenceCast');
    expect(casts).toHaveLength(sim.state.sentences.length);
    expect(casts.map((c) => c.id)).toEqual(sim.state.sentences.map((s) => s.id));
    const starts = ofType(events, 'roundStarted').filter((e) => e.wordIndex === 0 && !e.retry);
    expect(starts.map((e) => e.sentence)).toEqual(sim.state.sentences.map((_, i) => i));
    const collected = ofType(events, 'wordCollected');
    expect(collected.map((c) => c.text)).toEqual(sim.state.sentences.flatMap((s) => s.words));
  });
});

describe('the run', () => {
  it('every sentence once, then a portal and the end; the score is words + sentences', () => {
    const sim = create(9);
    const events = run(sim);
    const words = sim.state.sentences.reduce((n, s) => n + s.words.length, 0);
    expect(sim.state.phase).toBe('complete');
    expect(sim.state.collected).toBe(words);
    expect(sim.state.score).toBe(words * TUNING.wordScore + sim.state.sentences.length * TUNING.sentenceScore);
    expect(ofType(events, 'portalAppeared')).toHaveLength(1);
    expect(ofType(events, 'runComplete')).toEqual([{ type: 'runComplete', score: sim.state.score }]);
    expect(events.at(-1)!.type).toBe('runComplete');
    expect(ofType(events, 'courageLost')).toHaveLength(0);
    expect(sim.tick()).toEqual([]);
    expect(sim.dispatch({ type: 'choose', lane: 0 })).toEqual([]);
  });

  it('ignores a lane outside the row, and a second choice for the same round', () => {
    const sim = create(1);
    untilRound(sim);
    expect(sim.dispatch({ type: 'choose', lane: 3 })).toEqual([]);
    expect(sim.dispatch({ type: 'choose', lane: -1 })).toEqual([]);
    expect(sim.dispatch({ type: 'choose', lane: 0.5 })).toEqual([]);
    chooseRight(sim);
    expect(sim.dispatch({ type: 'choose', lane: 0 })).toEqual([]);
  });

  it('a slow reader and a fast reader get the same result: speed never changes the score or the evidence', () => {
    const slow = create(11);
    const fast = create(11);
    run(slow, () => true, stepsOf(20_000));
    run(fast, () => true, 0);
    expect(slow.state.score).toBe(fast.state.score);
    expect(evidenceOf(slow.state, STORY, 11, 1).items).toEqual(evidenceOf(fast.state, STORY, 11, 1).items);
  });

  it('every event type the core emits is listed, and a mixed run emits only listed types', () => {
    const sim = create(12);
    const events = run(sim, (n) => n > 3, stepsOf(5000));
    expect(events.every((e) => SPELLWEAVERS_EVENT_TYPES.includes(e.type))).toBe(true);
    const seen = new Set(events.map((e) => e.type));
    for (const type of SPELLWEAVERS_EVENT_TYPES) expect(seen.has(type), type).toBe(true);
  });
});

describe('evidence', () => {
  it('one sentence item per sentence the student chose for, valid against the schema', () => {
    const sim = create(13);
    const events: SpellweaversEvent[] = run(sim, (n) => n !== 2 && n !== 3);
    const evidence = evidenceOf(sim.state, STORY, 13, 12_345);
    expect(storyGameEvidenceSchema.safeParse(evidence).success).toBe(true);
    expect(evidence.items).toHaveLength(sim.state.sentences.length);
    expect(evidence.items.map((i) => i.itemId)).toEqual(sim.state.sentences.map((s) => s.id));
    expect(evidence.items.every((i) => i.itemKind === 'sentence' && i.solved)).toBe(true);
    const missed = ofType(events, 'courageLost').length;
    expect(evidence.items.reduce((n, i) => n + i.attempts - 1, 0)).toBe(missed);
    expect(evidence.items.filter((i) => i.correctFirstTry).length).toBe(sim.state.sentences.filter((s) => s.misses === 0).length);
    const { results, outcome } = resultsOf(sim.state, STORY, 13, 12_345);
    expect(outcome).toBe('victory');
    expect(results).toEqual(toGameResults(evidence, sim.state.score));
  });

  it('a sentence never started has no item; paragraphs travel into the item', () => {
    const sim = create(14);
    untilRound(sim);
    expect(evidenceOf(sim.state, STORY, 14, 0).items).toEqual([]);
    chooseWrong(sim);
    const items = evidenceOf(sim.state, STORY, 14, 0).items;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ itemId: sim.state.sentences[0]!.id, attempts: 2, correctFirstTry: false, solved: false });
    const source = STORY.sentences.find((s) => s.id === sim.state.sentences[0]!.id)!;
    if (source.paragraph !== undefined) expect(items[0]!.paragraph).toBe(source.paragraph);
  });
});
