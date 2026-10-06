/** The Gryphon Patrol rules (docs/game-gryphon-patrol-3d.md). */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema, toGameResults } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  PATROL_EVENT_TYPES,
  SKY,
  TUNING,
  createGryphonPatrol,
  enemiesFor,
  enemyAt,
  evidenceOf,
  normWord,
  patrolOf,
  resultsOf,
  rightEnemyOf,
  sentencesOf,
  wordPoolOf,
  type PatrolEvent,
} from '../../src/gryphon-patrol/core/index.js';
import { LONG_STORY, STORY, create, ofType, run, runUntil, shootRight, shootWrong, stepsOf, tickN, untilRound } from './helpers.js';

describe('content', () => {
  it('builds a patrol of up to 4 sentences of 3 to 8 words, each once, in a seeded order', () => {
    const sentences = patrolOf(STORY, createRng(3), TUNING.maxSentences);
    expect(STORY.sentences.length).toBeGreaterThan(TUNING.maxSentences);
    expect(sentences).toHaveLength(TUNING.maxSentences);
    expect(new Set(sentences.map((s) => s.id)).size).toBe(TUNING.maxSentences);
    for (const s of sentences) {
      const source = STORY.sentences.find((x) => x.id === s.id)!;
      expect(s.words).toEqual(source.words);
      expect(s).toMatchObject({ misses: 0, started: false, cleared: false });
    }
    expect(patrolOf(STORY, createRng(3), 4).map((s) => s.id)).toEqual(sentences.map((s) => s.id));
    expect(patrolOf(STORY, createRng(4), 4).map((s) => s.id)).not.toEqual(sentences.map((s) => s.id));
    expect(patrolOf(LONG_STORY, createRng(1), 4)).toHaveLength(4);
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
    const sim = createGryphonPatrol(input, { seed: 1, helper: false });
    run(sim);
    expect(sim.state.sentences.every((s) => s.cleared)).toBe(true);
  });

  it('bats: distinct words, the right one in a seeded slot, each in its own slot of the sky', () => {
    const pool = wordPoolOf(STORY);
    const slots = new Set<number>();
    for (let seed = 1; seed <= 40; seed++) {
      const bats = enemiesFor('Pip', pool, 4, createRng(seed));
      expect(bats).toHaveLength(4);
      const right = bats.filter((b) => b.right);
      expect(right).toHaveLength(1);
      expect(right[0]!.text).toBe('Pip');
      slots.add(bats.indexOf(right[0]!));
      expect(new Set(bats.map((b) => normWord(b.text))).size).toBe(4);
      const slot = SKY.width / 4;
      bats.forEach((b, i) => {
        for (const seconds of [0, 1, 5, 17.3, 60, 300]) {
          const at = enemyAt(b, seconds);
          expect(at.x).toBeGreaterThanOrEqual(slot * i);
          expect(at.x).toBeLessThanOrEqual(slot * (i + 1));
          expect(at.y).toBeGreaterThanOrEqual(SKY.minY);
          expect(at.y).toBeLessThanOrEqual(SKY.maxY);
        }
      });
    }
    expect(slots.size).toBe(4);
    expect(enemiesFor('a', ['a', 'b'], 4, createRng(1)).map((b) => b.text).sort()).toEqual(['a', 'b']);
    expect(normWord('Brave.')).toBe(normWord('brave'));
  });

  it('a bat moves as a pure function of time', () => {
    const [bat] = enemiesFor('Pip', wordPoolOf(STORY), 4, createRng(2));
    expect(enemyAt(bat!, 3.5)).toEqual(enemyAt({ ...bat! }, 3.5));
    expect(enemyAt(bat!, 0)).toEqual({ x: bat!.x, y: bat!.y });
  });
});

describe('rounds', () => {
  it('the first tick opens round 1 for the first word, with 4 bats (3 in Helper mode)', () => {
    const sim = create(5);
    const events = sim.tick();
    const started = ofType(events, 'roundStarted');
    expect(started).toHaveLength(1);
    const first = sim.state.sentences[0]!;
    expect(started[0]).toMatchObject({ sentence: 0, wordIndex: 0, retry: false });
    expect(started[0]!.enemies).toHaveLength(4);
    expect(sim.state.round!.answer).toBe(first.words[0]);
    expect(rightEnemyOf(sim.state)!.text).toBe(first.words[0]);
    const helper = create(5, true);
    helper.tick();
    expect(helper.state.round!.enemies).toHaveLength(3);
  });

  it('the bats circle and wait for as long as it takes: no timer decides anything', () => {
    const sim = create(2);
    untilRound(sim);
    const round = sim.state.round!;
    const more = tickN(sim, stepsOf(300_000));
    expect(more).toEqual([]);
    expect(sim.state.round!.id).toBe(round.id);
    expect(sim.state.round!.stage).toBe('aim');
    expect(sim.state.courage).toBe(TUNING.courage);
    expect(sim.state.phase).toBe('patrol');
    expect(sim.state.sentences[0]!.started).toBe(false);
    for (const bat of sim.state.round!.enemies) expect(bat.alive).toBe(true);
  });

  it('a right shot flies, hits, drops an orb, and the gryphon takes the word; the next word follows', () => {
    const sim = create(3);
    untilRound(sim);
    const word = sim.state.sentences[0]!.words[0]!;
    const fired = shootRight(sim);
    expect(ofType(fired, 'shotFired')).toHaveLength(1);
    expect(sim.state.shot).not.toBeNull();
    expect(sim.state.round!.stage).toBe('shot');
    const hit = runUntil(sim, (now) => now.some((e) => e.type === 'enemyHit'));
    expect(ofType(hit.events, 'enemyHit')[0]).toMatchObject({ correct: true });
    expect(ofType(hit.events, 'orbDropped')[0]).toMatchObject({ text: word });
    expect(sim.state.shot).toBeNull();
    expect(sim.state.orb).toMatchObject({ text: word, retry: false });
    expect(sim.state.score).toBe(0);
    const got = runUntil(sim, (now) => now.some((e) => e.type === 'wordCollected'));
    expect(ofType(got.events, 'wordCollected')[0]).toMatchObject({ sentence: 0, wordIndex: 0, text: word });
    expect(sim.state.orb).toBeNull();
    expect(sim.state.word).toBe(1);
    expect(sim.state.score).toBe(TUNING.wordScore);
    const next = runUntil(sim, (now) => now.some((e) => e.type === 'roundStarted'));
    expect(ofType(next.events, 'roundStarted')[0]).toMatchObject({ sentence: 0, wordIndex: 1, retry: false });
  });

  it('a wrong shot costs courage, scatters the bats, rests, and brings the same word back with new bats', () => {
    const sim = create(4);
    untilRound(sim);
    const roundId = sim.state.round!.id;
    shootWrong(sim);
    const hit = runUntil(sim, (now) => now.some((e) => e.type === 'courageLost'));
    expect(ofType(hit.events, 'enemyHit')[0]).toMatchObject({ correct: false });
    expect(ofType(hit.events, 'orbDropped')).toHaveLength(0);
    expect(ofType(hit.events, 'courageLost')[0]).toEqual({ type: 'courageLost', courage: TUNING.courage - 1 });
    expect(sim.state.sentences[0]!.misses).toBe(1);
    expect(sim.state.word).toBe(0);
    expect(sim.state.restMs).toBeGreaterThan(0);
    expect(sim.state.round!.enemies.every((e) => !e.alive)).toBe(true);
    // No shot while the gryphon rests.
    expect(sim.dispatch({ type: 'shoot', enemy: 'e1' })).toEqual([]);
    const back = runUntil(sim, (now) => now.some((e) => e.type === 'roundStarted'));
    expect(ofType(back.events, 'roundStarted')[0]).toMatchObject({ sentence: 0, wordIndex: 0, retry: true });
    expect(sim.state.round!.id).not.toBe(roundId);
    expect(rightEnemyOf(sim.state)!.text).toBe(sim.state.sentences[0]!.words[0]);
    // The word right after a miss scores the lower amount.
    shootRight(sim);
    runUntil(sim, (now) => now.some((e) => e.type === 'wordCollected'));
    expect(sim.state.score).toBe(TUNING.retryWordScore);
  });

  it('at 0 courage the gryphon rests longer and gets all its courage back; there is no game over', () => {
    const sim = create(6);
    for (let i = 0; i < TUNING.courage; i++) {
      untilRound(sim);
      shootWrong(sim);
      runUntil(sim, (now) => now.some((e) => e.type === 'courageLost'));
    }
    expect(sim.state.courage).toBe(0);
    expect(sim.state.restMs).toBe(TUNING.restEmptyMs);
    const back = runUntil(sim, (now) => now.some((e) => e.type === 'roundStarted'));
    expect(ofType(back.events, 'rested')).toEqual([{ type: 'rested', courage: TUNING.courage }]);
    expect(sim.state.courage).toBe(TUNING.courage);
    expect(sim.state.phase).toBe('patrol');
    run(sim);
    expect(sim.state.phase).toBe('complete');
  });

  it('the last word of a sentence finishes it and the next sentence starts with word 1', () => {
    const sim = create(8);
    const events = run(sim);
    const casts = ofType(events, 'sentenceCast');
    expect(casts).toHaveLength(sim.state.sentences.length);
    expect(casts.map((c) => c.id)).toEqual(sim.state.sentences.map((s) => s.id));
    const starts = ofType(events, 'roundStarted').filter((e) => e.wordIndex === 0 && !e.retry);
    expect(starts.map((e) => e.sentence)).toEqual(sim.state.sentences.map((_, i) => i));
    expect(ofType(events, 'wordCollected').map((c) => c.text)).toEqual(sim.state.sentences.flatMap((s) => s.words));
  });
});

describe('commands', () => {
  it('ignores a shot at an unknown bat, a second shot while one flies, and a shot at a bat that is gone', () => {
    const sim = create(1);
    untilRound(sim);
    expect(sim.dispatch({ type: 'shoot', enemy: 'nope' })).toEqual([]);
    const fired = shootRight(sim);
    expect(fired).toHaveLength(1);
    expect(sim.dispatch({ type: 'shoot', enemy: 'e1' })).toEqual([]);
    runUntil(sim, (now) => now.some((e) => e.type === 'enemyHit'));
    expect(sim.dispatch({ type: 'shoot', enemy: 'e1' })).toEqual([]);
  });

  it('moveTo flies the gryphon inside the sky, and is ignored while a shot or an orb is out', () => {
    const sim = create(1);
    untilRound(sim);
    sim.dispatch({ type: 'moveTo', x: 100, y: -50 });
    expect(sim.state.gryphon).toMatchObject({ toX: SKY.width - 1.2, toY: SKY.minY, facing: 1 });
    tickN(sim, stepsOf(5000));
    expect(sim.state.gryphon).toMatchObject({ x: SKY.width - 1.2, y: SKY.minY });
    sim.dispatch({ type: 'moveTo', x: -4, y: 100 });
    expect(sim.state.gryphon).toMatchObject({ toX: 1.2, toY: SKY.maxY, facing: -1 });
    sim.dispatch({ type: 'moveTo', x: Number.NaN, y: 3 });
    expect(sim.state.gryphon.toX).toBe(1.2);
    shootRight(sim);
    const to = { x: sim.state.gryphon.toX, y: sim.state.gryphon.toY };
    sim.dispatch({ type: 'moveTo', x: 8, y: 5 });
    expect({ x: sim.state.gryphon.toX, y: sim.state.gryphon.toY }).toEqual(to);
    runUntil(sim, (now) => now.some((e) => e.type === 'orbDropped'));
    const orb = { x: sim.state.gryphon.toX, y: sim.state.gryphon.toY };
    sim.dispatch({ type: 'moveTo', x: 8, y: 5 });
    expect({ x: sim.state.gryphon.toX, y: sim.state.gryphon.toY }).toEqual(orb);
  });

  it('a shot at a bat marks the sentence as started', () => {
    const sim = create(2);
    untilRound(sim);
    expect(sim.state.sentences[0]!.started).toBe(false);
    shootRight(sim);
    expect(sim.state.sentences[0]!.started).toBe(true);
  });
});

describe('the patrol', () => {
  it('every sentence once, then the closing flight and the end; the score is words + sentences', () => {
    const sim = create(9);
    const events = run(sim);
    const words = sim.state.sentences.reduce((n, s) => n + s.words.length, 0);
    expect(sim.state.phase).toBe('complete');
    expect(sim.state.collected).toBe(words);
    expect(sim.state.score).toBe(words * TUNING.wordScore + sim.state.sentences.length * TUNING.sentenceScore);
    expect(ofType(events, 'patrolComplete')).toEqual([{ type: 'patrolComplete', score: sim.state.score }]);
    expect(events.at(-1)!.type).toBe('patrolComplete');
    expect(ofType(events, 'courageLost')).toHaveLength(0);
    expect(sim.tick()).toEqual([]);
    expect(sim.dispatch({ type: 'shoot', enemy: 'e1' })).toEqual([]);
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
    // Wrong at rounds 1-3 (courage reaches 0 and refills), then right.
    const events = run(sim, (n) => n > 3, stepsOf(2000));
    expect(events.every((e) => PATROL_EVENT_TYPES.includes(e.type))).toBe(true);
    const seen = new Set(events.map((e) => e.type));
    for (const type of PATROL_EVENT_TYPES) expect(seen.has(type), type).toBe(true);
  });
});

describe('evidence', () => {
  it('one sentence item per sentence the student shot at, valid against the schema', () => {
    const sim = create(13);
    const events: PatrolEvent[] = run(sim, (n) => n !== 2 && n !== 3);
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

  it('a sentence never shot at has no item; paragraphs travel into the item', () => {
    const sim = create(14);
    untilRound(sim);
    expect(evidenceOf(sim.state, STORY, 14, 0).items).toEqual([]);
    shootWrong(sim);
    const items = evidenceOf(sim.state, STORY, 14, 0).items;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ itemId: sim.state.sentences[0]!.id, attempts: 1, correctFirstTry: false, solved: false });
    runUntil(sim, (now) => now.some((e) => e.type === 'courageLost'));
    const after = evidenceOf(sim.state, STORY, 14, 0).items;
    expect(after[0]).toMatchObject({ attempts: 2, correctFirstTry: false, solved: false });
    const source = STORY.sentences.find((s) => s.id === sim.state.sentences[0]!.id)!;
    if (source.paragraph !== undefined) expect(after[0]!.paragraph).toBe(source.paragraph);
  });
});
