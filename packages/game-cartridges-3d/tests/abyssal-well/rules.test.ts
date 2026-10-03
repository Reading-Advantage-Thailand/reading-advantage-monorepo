/** The Abyssal Well rules (design: docs/game-abyssal-well-3d.md). */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema, toGameResults } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  ABYSSAL_WELL_EVENT_TYPES,
  ARCHER_RADIUS,
  BOTTOM_RADIUS,
  CREATURES,
  DESCENT_WORDS,
  LANES,
  RIM_DEPTH,
  RIM_RADIUS,
  TUNING,
  angleDelta,
  createAbyssalWell,
  descentsOf,
  echoWordOf,
  enemyInLane,
  evidenceOf,
  lanePoint,
  nextEnemyOf,
  normalWord,
  resultsOf,
  scoreOf,
  sentencesOf,
} from '../../src/abyssal-well/core/index.js';
import { LONG_STORY, STORY, clearDescent, create, ofType, shootRight, shootWrong, types, wrongEnemy } from './helpers.js';

describe('content', () => {
  it('builds up to 4 descents from sentences of 3 to 8 words, in a seeded order', () => {
    const descents = descentsOf(STORY, createRng(3), TUNING.maxDescents);
    expect(descents).toHaveLength(4);
    expect(new Set(descents.map((d) => d.id)).size).toBe(4);
    descents.forEach((d, i) => {
      const sentence = STORY.sentences.find((s) => s.id === d.id)!;
      expect(d.words).toEqual(sentence.words);
      expect(d.descentId).toBe(`descent-${i + 1}`);
      expect(d.words.length).toBeGreaterThanOrEqual(DESCENT_WORDS.min);
      expect(d.words.length).toBeLessThanOrEqual(DESCENT_WORDS.max);
      expect(d).toMatchObject({ refusals: 0, started: false, cleared: false });
    });
    expect(descentsOf(STORY, createRng(3), 4).map((d) => d.id)).toEqual(descents.map((d) => d.id));
    expect(descentsOf(STORY, createRng(4), 4).map((d) => d.id)).not.toEqual(descents.map((d) => d.id));
  });

  it('accepts the APK SentenceInput, and an empty list is a finished run', () => {
    const input = [
      { term: 'The cat sleeps.', translation: 'x' },
      { term: 'Hi', translation: '' },
      { term: 'The dog runs fast.', translation: '' },
    ];
    expect(sentencesOf(input).map((s) => s.id)).toEqual(['s-1', 's-3']);
    expect(createAbyssalWell(input, { seed: 1, helper: false }).state.descentCount).toBe(2);
    const empty = createAbyssalWell([], { seed: 1, helper: false });
    expect(empty.state.phase).toBe('complete');
    expect(empty.dispatch({ type: 'start' })).toEqual([]);
  });

  it('the echo word is a word of another sentence that is not in this one', () => {
    for (const d of descentsOf(STORY, createRng(2), 4)) {
      const echo = echoWordOf(STORY, d.id, d.words, createRng(5))!;
      expect(echo).toBeTruthy();
      expect(d.words.map(normalWord)).not.toContain(normalWord(echo));
    }
    expect(echoWordOf([{ term: 'Only one sentence.', translation: '' }], 's-1', ['Only', 'one', 'sentence.'], createRng(1))).toBeNull();
  });

  it('keeps the geometry inside the archer circle', () => {
    expect(BOTTOM_RADIUS).toBeLessThan(RIM_RADIUS);
    expect(RIM_RADIUS).toBeLessThan(ARCHER_RADIUS);
    expect(lanePoint(0, 0)).toEqual({ x: 0, z: BOTTOM_RADIUS });
    expect(lanePoint(0, RIM_DEPTH).z).toBeCloseTo(RIM_RADIUS);
    expect(lanePoint(2, RIM_DEPTH).x).toBeCloseTo(RIM_RADIUS);
    expect(lanePoint(0, 99)).toEqual(lanePoint(0, RIM_DEPTH));
    expect(angleDelta(0, (7 / 8) * Math.PI * 2)).toBeCloseTo(-Math.PI / 4);
    expect(angleDelta(Math.PI * 2 * 3, Math.PI / 2)).toBeCloseTo(Math.PI / 2);
  });
});

describe('the descent', () => {
  it('stands the next three words and one echo enemy in distinct lanes, the next word highest', () => {
    const sim = createAbyssalWell(STORY, { seed: 3, helper: false });
    const d = sim.state.descents[0]!;
    expect(sim.state.enemies).toHaveLength(TUNING.window + 1);
    const words = sim.state.enemies.filter((e) => e.kind === 'word').sort((a, b) => a.index - b.index);
    expect(words.map((e) => e.word)).toEqual(d.words.slice(0, TUNING.window));
    expect(words.map((e) => e.depth)).toEqual([2, 1, 0]);
    expect(sim.state.enemies.filter((e) => e.kind === 'echo')).toHaveLength(1);
    expect(new Set(sim.state.enemies.map((e) => e.lane)).size).toBe(sim.state.enemies.length);
    for (const e of sim.state.enemies) {
      expect(e.lane).toBeGreaterThanOrEqual(0);
      expect(e.lane).toBeLessThan(LANES);
      expect(CREATURES).toContain(e.creature);
    }
    expect(sim.state).toMatchObject({ next: 0, descent: 0, descentCount: 4, lane: 0, courage: 5, started: false });
  });

  it('nothing happens before start, and start plays descentStarted once', () => {
    const sim = createAbyssalWell(STORY, { seed: 3, helper: false });
    expect(sim.dispatch({ type: 'fire', lane: nextEnemyOf(sim.state)!.lane })).toEqual([{ type: 'rejected', command: 'fire' }]);
    expect(sim.dispatch({ type: 'rotate', dir: 1 })).toEqual([{ type: 'rejected', command: 'rotate' }]);
    const started = ofType(sim.dispatch({ type: 'start' }), 'descentStarted');
    expect(started).toHaveLength(1);
    expect(started[0]).toMatchObject({ descentId: 'descent-1', sentenceId: sim.state.descents[0]!.id, words: sim.state.descents[0]!.words });
    expect(started[0]!.enemies.map((e) => e.id)).toEqual(sim.state.enemies.map((e) => e.id));
    expect(sim.dispatch({ type: 'start' })).toEqual([{ type: 'rejected', command: 'start' }]);
  });

  it('the archer turns around the rim, past lane 7 to lane 0, both ways', () => {
    const sim = create(3);
    expect(sim.dispatch({ type: 'rotate', dir: -1 })).toEqual([{ type: 'moved', lane: 7 }]);
    expect(sim.dispatch({ type: 'rotate', dir: 1 })).toEqual([{ type: 'moved', lane: 0 }]);
    expect(sim.dispatch({ type: 'rotate', dir: 1 })).toEqual([{ type: 'moved', lane: 1 }]);
    expect(sim.state.lane).toBe(1);
  });

  it('an arrow at the next word drops that enemy into the sentence; the others climb and the window fills', () => {
    // A sentence of more than three words, so a fourth word waits outside the window.
    const seed = Array.from({ length: 40 }, (_, i) => i + 1).find((s) => createAbyssalWell(STORY, { seed: s, helper: false }).state.descents[0]!.words.length > TUNING.window)!;
    const sim = create(seed);
    const next = nextEnemyOf(sim.state)!;
    const before = new Map(sim.state.enemies.map((e) => [e.id, e.depth]));
    const events = sim.dispatch({ type: 'fire', lane: next.lane });
    expect(types(events)).toEqual(next.lane === 0 ? ['fired', 'struck', 'climbed', 'spawned'] : ['moved', 'fired', 'struck', 'climbed', 'spawned']);
    expect(ofType(events, 'fired')).toEqual([{ type: 'fired', lane: next.lane, enemyId: next.id, correct: true }]);
    expect(ofType(events, 'struck')).toEqual([{ type: 'struck', enemyId: next.id, index: 0 }]);
    expect(sim.state).toMatchObject({ next: 1, struck: 1, shots: 1, lane: next.lane, courage: 5 });
    expect(sim.state.enemies.find((e) => e.id === next.id)).toBeUndefined();
    // Every enemy that is left climbed one step (at most to the rim); the new one starts at the bottom.
    for (const e of sim.state.enemies) {
      if (before.has(e.id)) expect(e.depth).toBe(Math.min(RIM_DEPTH, before.get(e.id)! + 1));
    }
    const spawned = ofType(events, 'spawned')[0]!.enemy;
    expect(spawned).toMatchObject({ kind: 'word', index: 3, depth: 0 });
    expect(spawned.word).toBe(sim.state.descents[0]!.words[3]);
    expect(sim.state.descents[0]).toMatchObject({ started: true, refusals: 0, cleared: false });
    expect(nextEnemyOf(sim.state)!.depth).toBe(2);
  });

  it('fire without a lane uses the lane of the archer, and an empty lane is rejected without a turn', () => {
    const sim = create(3);
    const empty = Array.from({ length: LANES }, (_, l) => l).find((l) => !enemyInLane(sim.state, l))!;
    expect(sim.dispatch({ type: 'fire', lane: empty })).toEqual([{ type: 'rejected', command: 'fire' }]);
    expect(sim.state).toMatchObject({ lane: 0, shots: 0 });
    expect(sim.dispatch({ type: 'fire', lane: 99 })).toEqual([{ type: 'rejected', command: 'fire' }]);
    const next = nextEnemyOf(sim.state)!;
    while (sim.state.lane !== next.lane) sim.dispatch({ type: 'rotate', dir: 1 });
    expect(ofType(sim.dispatch({ type: 'fire' }), 'struck')).toHaveLength(1);
  });

  it('an arrow at a wrong enemy bounces: it falls back to the bottom, courage drops, and it counts a reading attempt', () => {
    const sim = create(3);
    const wrong = wrongEnemy(sim);
    const events = sim.dispatch({ type: 'fire', lane: wrong.lane });
    expect(ofType(events, 'fired')).toEqual([{ type: 'fired', lane: wrong.lane, enemyId: wrong.id, correct: false }]);
    expect(ofType(events, 'repelled')).toEqual([{ type: 'repelled', enemyId: wrong.id }]);
    expect(ofType(events, 'courageLost')).toEqual([{ type: 'courageLost', courage: 4 }]);
    expect(types(events).slice(-1)).toEqual(['climbed']);
    expect(sim.state).toMatchObject({ next: 0, struck: 0, courage: 4, shots: 1 });
    expect(sim.state.descents[0]).toMatchObject({ refusals: 1, started: true });
    expect(sim.state.enemies.find((e) => e.id === wrong.id)).toMatchObject({ depth: 0, lane: wrong.lane });
    expect(sim.state.enemies).toHaveLength(TUNING.window + 1);
  });

  it('the echo enemy is always wrong', () => {
    const sim = create(5);
    const echo = sim.state.enemies.find((e) => e.kind === 'echo')!;
    const events = sim.dispatch({ type: 'fire', lane: echo.lane });
    expect(ofType(events, 'repelled')).toHaveLength(1);
    expect(sim.state.next).toBe(0);
  });

  it('climbing stops at the rim', () => {
    const sim = create(3);
    const next = nextEnemyOf(sim.state)!;
    const echo = sim.state.enemies.find((e) => e.kind === 'echo')!;
    // Shoot the second enemy again and again: the others climb, but never past the rim.
    for (let k = 0; k < 8; k++) {
      const target = sim.state.enemies.find((e) => e.id !== next.id && e.id !== echo.id)!;
      sim.dispatch({ type: 'fire', lane: target.lane });
    }
    expect(Math.max(...sim.state.enemies.map((e) => e.depth))).toBe(RIM_DEPTH);
    expect(sim.state.phase).toBe('playing');
  });

  it('a repeated word is the same word: either enemy of it may be shot, and the two swap places in the order', () => {
    const input = [
      { term: 'The big the cat', translation: '' },
      { term: 'A fish swims', translation: '' },
      { term: 'Birds can fly', translation: '' },
    ];
    let sim = createAbyssalWell(input, { seed: 1, helper: false });
    for (let seed = 2; seed < 80 && sim.state.descents[0]!.words.length !== 4; seed++) sim = createAbyssalWell(input, { seed, helper: false });
    expect(sim.state.descents[0]!.words).toEqual(['The', 'big', 'the', 'cat']);
    sim.dispatch({ type: 'start' });
    const first = sim.state.enemies.find((e) => e.index === 0)!;
    const third = sim.state.enemies.find((e) => e.index === 2)!;
    // The first word is "The": the enemy of the second "the" takes the strike.
    const events = sim.dispatch({ type: 'fire', lane: third.lane });
    expect(ofType(events, 'struck')).toEqual([{ type: 'struck', enemyId: third.id, index: 0 }]);
    expect(ofType(events, 'repelled')).toHaveLength(0);
    expect(sim.state.enemies.find((e) => e.id === first.id)!.index).toBe(2);
    clearDescent(sim);
    expect(sim.state.descents[0]).toMatchObject({ cleared: true, refusals: 0 });
  });

  it('there is no game over: wrong arrows cost courage, the team rests at 0, and the run goes on', () => {
    const sim = create(3);
    const events: ReturnType<typeof sim.dispatch> = [];
    for (let k = 0; k < 7; k++) events.push(...shootWrong(sim));
    expect(ofType(events, 'courageLost').map((e) => e.courage)).toEqual([4, 3, 2, 1, 0, 2, 1]);
    expect(ofType(events, 'rest')).toEqual([{ type: 'rest', courage: TUNING.restCourage }]);
    expect(sim.state.courage).toBe(1);
    expect(sim.state.phase).toBe('playing');
    expect(sim.state.descents[0]!.refusals).toBe(7);
    expect(ABYSSAL_WELL_EVENT_TYPES).not.toContain('gameOver');
    clearDescent(sim);
    expect(sim.state.descent).toBe(1);
  });

  it('the whole sentence clears the descent and the next descent starts at once', () => {
    const sim = create(3);
    const first = sim.state.descents[0]!;
    const events = clearDescent(sim);
    expect(ofType(events, 'struck')).toHaveLength(first.words.length);
    expect(ofType(events, 'descentCleared')).toEqual([{ type: 'descentCleared', descentId: 'descent-1', sentenceId: first.id }]);
    const started = ofType(events, 'descentStarted');
    expect(started).toHaveLength(1);
    expect(started[0]!.descentId).toBe('descent-2');
    expect(sim.state).toMatchObject({ descent: 1, next: 0, descentsCleared: 1 });
    expect(sim.state.enemies).toHaveLength(Math.min(TUNING.window, sim.state.descents[1]!.words.length) + 1);
    expect(first).toMatchObject({ cleared: true, refusals: 0 });
  });
});

describe('the run', () => {
  it('ends after the last descent with wellComplete, and then ignores commands', () => {
    const sim = create(3);
    const events: ReturnType<typeof clearDescent> = [];
    while (sim.state.phase === 'playing') events.push(...clearDescent(sim));
    expect(ofType(events, 'wellComplete')).toEqual([{ type: 'wellComplete', descents: 4 }]);
    expect(sim.state).toMatchObject({ phase: 'complete', descentsCleared: 4, enemies: [] });
    expect(sim.dispatch({ type: 'fire', lane: 0 })).toEqual([]);
    expect(sim.dispatch({ type: 'rotate', dir: 1 })).toEqual([]);
    expect(sim.tick()).toEqual([]);
  });

  it('uses fewer descents when the story has fewer sentences of that size', () => {
    const sim = create(1, false, LONG_STORY);
    expect(sim.state.descentCount).toBe(Math.min(TUNING.maxDescents, sim.state.descents.length));
    while (sim.state.phase === 'playing') clearDescent(sim);
    expect(sim.state.descentsCleared).toBe(sim.state.descentCount);
  });

  it('evidence has one sentence item per descent, attempts = bounces + 1, and the score is 10 per word + 50 per descent', () => {
    const sim = create(3);
    shootWrong(sim);
    while (sim.state.phase === 'playing') clearDescent(sim);
    const evidence = evidenceOf(sim.state, STORY, 3, 1234);
    expect(storyGameEvidenceSchema.parse(evidence)).toEqual(evidence);
    expect(evidence.items).toHaveLength(4);
    expect(evidence.items.map((i) => i.itemId)).toEqual(sim.state.descents.map((d) => d.id));
    expect(evidence.items[0]).toMatchObject({ itemKind: 'sentence', attempts: 2, correctFirstTry: false, solved: true });
    expect(evidence.items[1]).toMatchObject({ attempts: 1, correctFirstTry: true, solved: true });
    expect(evidence.practice).toEqual([sim.state.descents[0]!.text]);
    const words = sim.state.descents.reduce((n, d) => n + d.words.length, 0);
    expect(scoreOf(sim.state)).toBe(words * TUNING.wordScore + 4 * TUNING.descentScore);
    const { results, outcome } = resultsOf(sim.state, STORY, 3, 1234);
    expect(results).toEqual(toGameResults(evidence, scoreOf(sim.state)));
    expect(outcome).toBe('victory');
  });

  it('a descent the student never touched has no evidence item', () => {
    const sim = create(3);
    expect(evidenceOf(sim.state, STORY, 3, 0).items).toEqual([]);
    shootRight(sim);
    expect(evidenceOf(sim.state, STORY, 3, 0).items).toHaveLength(1);
  });

  it('speed never gives score or xp: game time does not exist, and the same moves give the same results', () => {
    const quick = create(3);
    const slow = create(3);
    for (let k = 0; k < 500; k++) slow.tick();
    while (quick.state.phase === 'playing') clearDescent(quick);
    while (slow.state.phase === 'playing') clearDescent(slow);
    expect(resultsOf(slow.state, STORY, 3, 999_999).results).toEqual(resultsOf(quick.state, STORY, 3, 1).results);
  });

  it('every tuning number is positive', () => {
    for (const v of Object.values(TUNING)) expect(v).toBeGreaterThan(0);
  });
});
