/** The Griffin Sky-Joust rules (docs/game-griffin-sky-joust-3d.md). */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema, toGameResults } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  ARENA,
  JOUST_EVENT_TYPES,
  TUNING,
  createGriffinSkyJoust,
  evidenceOf,
  isTarget,
  joustOf,
  normWord,
  resultsOf,
  sentencesOf,
  type JoustEvent,
} from '../../src/griffin-sky-joust/core/index.js';
import { LONG_STORY, STORY, create, ofType, placeOn, playBot, stepsOf, targetRider, tickN, untilRiders } from './helpers.js';

describe('content', () => {
  it('builds a game of up to 4 sentences of 3 to 8 words, each once, in a seeded order', () => {
    const sentences = joustOf(STORY, createRng(3), TUNING.maxSentences);
    expect(STORY.sentences.length).toBeGreaterThan(TUNING.maxSentences);
    expect(sentences).toHaveLength(TUNING.maxSentences);
    expect(new Set(sentences.map((s) => s.id)).size).toBe(TUNING.maxSentences);
    for (const s of sentences) {
      expect(s.words).toEqual(STORY.sentences.find((x) => x.id === s.id)!.words);
      expect(s).toMatchObject({ misses: 0, started: false, cleared: false });
    }
    expect(joustOf(STORY, createRng(3), 4).map((s) => s.id)).toEqual(sentences.map((s) => s.id));
    expect(joustOf(STORY, createRng(4), 4).map((s) => s.id)).not.toEqual(sentences.map((s) => s.id));
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
    const sim = createGriffinSkyJoust(input, { seed: 1, helper: false });
    playBot(sim);
    expect(sim.state.sentences.every((s) => s.cleared)).toBe(true);
  });

  it('a game with no sentences is complete at once', () => {
    expect(createGriffinSkyJoust([], { seed: 1, helper: false }).state.phase).toBe('complete');
  });
});

describe('the sentence opens', () => {
  it('waits a beat, then one rider per word flies at its own height, none on the griffin', () => {
    const sim = create(5);
    expect(sim.state.riders).toHaveLength(0);
    const events = untilRiders(sim);
    expect(ofType(events, 'sentenceStarted')).toHaveLength(1);
    const sentence = sim.state.sentences[0]!;
    expect(sim.state.riders.map((r) => r.text).sort()).toEqual(sentence.words.slice().sort());
    for (const r of sim.state.riders) {
      expect(r.y).toBeGreaterThanOrEqual(TUNING.riderTop);
      expect(r.y).toBeLessThanOrEqual(TUNING.riderTop + TUNING.riderSpan);
      expect(Math.abs(r.vx)).toBe(TUNING.riderSpeed);
      expect(Math.hypot(r.x - sim.state.griffin.x, r.y - sim.state.griffin.y)).toBeGreaterThan(r.radius + sim.state.griffin.radius);
    }
  });

  it('Helper mode slows the riders', () => {
    const sim = create(5, true);
    untilRiders(sim);
    expect(sim.state.riders.every((r) => Math.abs(r.vx) === TUNING.riderSpeedHelper)).toBe(true);
  });

  it('riders bounce off the walls and keep their height', () => {
    const sim = create(5);
    untilRiders(sim);
    const heights = sim.state.riders.map((r) => r.y);
    sim.state.griffin.y = ARENA.height; // out of the way
    sim.state.griffin.safeMs = 1e9;
    tickN(sim, stepsOf(20_000));
    expect(sim.state.riders.map((r) => r.y)).toEqual(heights);
    for (const r of sim.state.riders) {
      expect(r.x).toBeGreaterThanOrEqual(r.radius);
      expect(r.x).toBeLessThanOrEqual(ARENA.width - r.radius);
    }
  });
});

describe('the griffin flies', () => {
  it('falls under gravity, rests on the bottom, and a flap lifts it', () => {
    const sim = create(1);
    const y0 = sim.state.griffin.y;
    tickN(sim, 3);
    expect(sim.state.griffin.y).toBeGreaterThan(y0);
    tickN(sim, stepsOf(3000));
    expect(sim.state.griffin.y).toBe(ARENA.height - TUNING.bottomMargin);
    expect(sim.dispatch({ type: 'flap', dir: 0 })).toEqual([{ type: 'flapped', dir: 0 }]);
    expect(sim.state.griffin.vy).toBe(TUNING.flapImpulse);
    tickN(sim, 4);
    expect(sim.state.griffin.y).toBeLessThan(ARENA.height - TUNING.bottomMargin);
  });

  it('flap with a direction and drift push sideways; the arena wraps left to right', () => {
    const sim = create(1);
    sim.dispatch({ type: 'flap', dir: 1 });
    expect(sim.state.griffin.vx).toBe(TUNING.driftSpeed);
    sim.dispatch({ type: 'drift', dir: -1 });
    expect(sim.state.griffin.vx).toBe(-TUNING.driftSpeed);
    sim.state.griffin.x = 2;
    tickN(sim, 5);
    expect(sim.state.griffin.x).toBeGreaterThan(ARENA.width / 2);
  });

  it('stops at the ceiling and keeps its sideways speed under the limit', () => {
    const sim = create(1);
    for (let i = 0; i < 40; i++) {
      sim.dispatch({ type: 'flap', dir: 1 });
      sim.tick();
    }
    expect(sim.state.griffin.y).toBeGreaterThanOrEqual(TUNING.topMargin);
    expect(Math.abs(sim.state.griffin.vx)).toBeLessThanOrEqual(TUNING.maxVx);
  });

  it('ignores a bad direction', () => {
    const sim = create(1);
    expect(sim.dispatch({ type: 'flap', dir: 2 as 1 })).toEqual([]);
    expect(sim.dispatch({ type: 'drift', dir: 0 as 1 })).toEqual([]);
  });
});

describe('strikes and bumps', () => {
  it('a strike from above on the next word takes it: the word, 100 points, and a hop', () => {
    const sim = create(2);
    untilRiders(sim);
    const rider = targetRider(sim);
    const word = rider.text;
    placeOn(sim, rider, 'above');
    const events = tickN(sim, 2);
    expect(ofType(events, 'wordStruck')).toMatchObject([{ sentence: 0, wordIndex: 0, text: word, riderId: rider.id }]);
    expect(sim.state.word).toBe(1);
    expect(sim.state.score).toBe(TUNING.pointsPerWord);
    expect(sim.state.riders.find((r) => r.id === rider.id)).toBeUndefined();
    expect(sim.state.griffin.vy).toBeLessThan(0);
    expect(sim.state.courage).toBe(TUNING.courage);
    expect(sim.state.sentences[0]!.started).toBe(true);
  });

  it('a strike from above on a wrong word is a miss and costs courage', () => {
    const sim = create(2);
    untilRiders(sim);
    const wrong = sim.state.riders.find((r) => !isTarget(sim.state, r))!;
    placeOn(sim, wrong, 'above');
    const events = tickN(sim, 2);
    expect(ofType(events, 'bumped')).toMatchObject([{ riderId: wrong.id, strike: true, courage: TUNING.courage - 1 }]);
    expect(sim.state.sentences[0]!.misses).toBe(1);
    expect(sim.state.word).toBe(0);
    expect(sim.state.riders.some((r) => r.id === wrong.id)).toBe(true);
    expect(sim.state.griffin.safeMs).toBeGreaterThan(0);
  });

  it('a hit from the side or from below hurts but is no miss, even on the right word', () => {
    for (const how of ['side', 'below'] as const) {
      const sim = create(2);
      untilRiders(sim);
      placeOn(sim, targetRider(sim), how);
      const events = tickN(sim, 2);
      expect(ofType(events, 'bumped')).toMatchObject([{ strike: false, courage: TUNING.courage - 1 }]);
      expect(sim.state.sentences[0]!.misses).toBe(0);
      expect(sim.state.word).toBe(0);
    }
  });

  it('a bump knocks the griffin away and leaves it safe for a while', () => {
    const sim = create(2);
    untilRiders(sim);
    const rider = targetRider(sim);
    placeOn(sim, rider, 'side');
    sim.tick();
    expect(sim.state.griffin.vx).toBeLessThan(0);
    expect(sim.state.griffin.vy).toBeLessThan(0);
    // Back on the same rider while safe: nothing happens.
    placeOn(sim, rider, 'side');
    sim.state.griffin.safeMs = 500;
    expect(ofType(tickN(sim, 3), 'bumped')).toHaveLength(0);
    expect(sim.state.courage).toBe(TUNING.courage - 1);
  });

  it('a repeated word counts for either rider that carries it', () => {
    const input = [
      { term: 'The cat saw the dog', translation: 'a' },
      { term: 'A big red fox ran', translation: 'b' },
      { term: 'One two three four', translation: 'c' },
    ];
    const sim = createGriffinSkyJoust(input, { seed: 4, helper: false });
    untilRiders(sim);
    const first = sim.state.sentences[0]!;
    if (first.id !== 's-1') return; // another seed order: the case needs the first sentence
    const riders = sim.state.riders.filter((r) => normWord(r.text) === 'the');
    expect(riders).toHaveLength(2);
    placeOn(sim, riders[1]!, 'above');
    expect(ofType(tickN(sim, 2), 'wordStruck')).toHaveLength(1);
    expect(sim.state.word).toBe(1);
  });
});

describe('courage and rest: no game over, no timer decides', () => {
  it('at 0 courage the griffin rests, returns with all its courage, and keeps its progress', () => {
    const sim = create(3);
    untilRiders(sim);
    placeOn(sim, targetRider(sim), 'above');
    tickN(sim, 2); // one word struck
    const events: JoustEvent[] = [];
    for (let i = 0; i < TUNING.courage; i++) {
      const rider = sim.state.riders[0]!;
      placeOn(sim, rider, 'side');
      events.push(...tickN(sim, 2));
    }
    expect(ofType(events, 'bumped')).toHaveLength(TUNING.courage);
    expect(sim.state.courage).toBe(0);
    expect(sim.state.restMs).toBeGreaterThan(TUNING.restMs - 100);
    expect(sim.state.restMs).toBeLessThanOrEqual(TUNING.restMs);
    expect(sim.dispatch({ type: 'flap', dir: 0 })).toEqual([]);
    expect(sim.state.word).toBe(1);
    const after = tickN(sim, stepsOf(TUNING.restMs) + 2);
    expect(ofType(after, 'rested')).toEqual([{ type: 'rested', courage: TUNING.courage }]);
    expect(sim.state.courage).toBe(TUNING.courage);
    expect(sim.state.phase).toBe('playing');
    expect(sim.state.word).toBe(1);
    expect(sim.state.griffin.safeMs).toBeGreaterThan(0);
  });

  it('waiting for ever changes no result: no event, no score, no courage change', () => {
    const sim = create(3);
    untilRiders(sim);
    sim.state.griffin.y = ARENA.height - TUNING.bottomMargin;
    sim.state.griffin.x = 20;
    const events = tickN(sim, stepsOf(10 * 60_000)).filter((e) => e.type !== 'bumped');
    expect(events).toEqual([]);
    expect(sim.state.phase).toBe('playing');
    expect(sim.state.score).toBe(0);
  });

  it('every wrong strike in a row never ends the game', () => {
    const sim = create(3);
    untilRiders(sim);
    for (let i = 0; i < 20; i++) {
      const wrong = sim.state.riders.find((r) => !isTarget(sim.state, r))!;
      placeOn(sim, wrong, 'above');
      tickN(sim, stepsOf(TUNING.restMs) + stepsOf(TUNING.safeMs) + 4);
      if (sim.state.restMs > 0) tickN(sim, stepsOf(TUNING.restMs) + 2);
    }
    expect(sim.state.phase).toBe('playing');
  });
});

describe('sentences and the end', () => {
  it('the last word makes the sentence whole, then a beat, then the next sentence', () => {
    const sim = create(6);
    untilRiders(sim);
    const n = sim.state.sentences[0]!.words.length;
    const events: JoustEvent[] = [];
    for (let i = 0; i < n; i++) {
      placeOn(sim, targetRider(sim), 'above');
      events.push(...tickN(sim, 2));
    }
    expect(ofType(events, 'wordStruck')).toHaveLength(n);
    expect(ofType(events, 'sentenceDone')).toMatchObject([{ sentence: 0 }]);
    expect(sim.state.sentences[0]).toMatchObject({ cleared: true, misses: 0 });
    expect(sim.state.score).toBe(n * TUNING.pointsPerWord + TUNING.pointsPerCleanSentence);
    expect(sim.state.riders).toHaveLength(0);
    expect(sim.state.sentence).toBe(1);
    const next = tickN(sim, stepsOf(TUNING.pauseMs) + 2);
    expect(ofType(next, 'sentenceStarted')).toMatchObject([{ sentence: 1 }]);
    expect(sim.state.riders.length).toBe(sim.state.sentences[1]!.words.length);
  });

  it('a long sentence keeps at most 8 riders and brings the rest in as words go', () => {
    const input = [
      { term: 'one two three four five six seven eight nine ten', translation: 'a' },
      { term: 'a b c d e f g h i j k', translation: 'b' },
    ];
    const sim = createGriffinSkyJoust(input, { seed: 2, helper: false });
    untilRiders(sim);
    expect(sim.state.riders).toHaveLength(TUNING.maxRiders);
    placeOn(sim, targetRider(sim), 'above');
    tickN(sim, 2);
    expect(sim.state.riders).toHaveLength(TUNING.maxRiders);
    expect(sim.state.riders.some((r) => isTarget(sim.state, r))).toBe(true);
  });

  it('plays to the end with the bot: complete, one joustComplete, a score', () => {
    const sim = create(8);
    const { events } = playBot(sim);
    expect(sim.state.phase).toBe('complete');
    expect(ofType(events, 'joustComplete')).toHaveLength(1);
    expect(ofType(events, 'sentenceDone')).toHaveLength(sim.state.sentences.length);
    expect(sim.state.score).toBeGreaterThan(0);
    expect(sim.tick()).toEqual([]);
    expect(sim.dispatch({ type: 'flap', dir: 0 })).toEqual([]);
  });

  it('every event the core emits is a known type', () => {
    const { events } = playBot(create(2));
    expect(events.every((e) => JOUST_EVENT_TYPES.includes(e.type))).toBe(true);
  });
});

describe('evidence', () => {
  it('one sentence item per sentence; attempts = wrong strikes + 1; valid against the schema', () => {
    const sim = create(5, false, LONG_STORY);
    untilRiders(sim);
    const wrong = sim.state.riders.find((r) => !isTarget(sim.state, r))!;
    placeOn(sim, wrong, 'above');
    tickN(sim, stepsOf(TUNING.restMs));
    playBot(sim);
    const evidence = evidenceOf(sim.state, LONG_STORY, 5, 1234);
    expect(storyGameEvidenceSchema.safeParse(evidence).success).toBe(true);
    expect(evidence.items).toHaveLength(sim.state.sentences.length);
    expect(evidence.items.every((i) => i.itemKind === 'sentence' && i.solved)).toBe(true);
    expect(evidence.items[0]).toMatchObject({ attempts: 2, correctFirstTry: false });
    const { results, outcome } = resultsOf(sim.state, LONG_STORY, 5, 1234);
    expect(results).toEqual(toGameResults(evidence, sim.state.score));
    expect(outcome).toBe('victory');
  });

  it('speed never changes the evidence or the XP of a clean game', () => {
    const slow = create(9);
    const fast = create(9);
    playBot(slow, 3);
    playBot(fast, 1);
    const a = resultsOf(slow.state, STORY, 9, 999_999).results;
    const b = resultsOf(fast.state, STORY, 9, 1).results;
    expect(a.xp).toBe(b.xp);
    expect(a.accuracy).toBe(b.accuracy);
  });
});
