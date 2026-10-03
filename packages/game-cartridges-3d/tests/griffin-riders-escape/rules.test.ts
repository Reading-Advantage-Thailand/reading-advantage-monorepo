/** Rules of Griffin Riders Escape: waves, lanes, setbacks, rest, evidence, and no game over. */
import { describe, expect, it } from 'vitest';
import { LANES, TUNING, evidenceOf, laneX, nearestLane, normWord, rightLaneOf } from '../../src/griffin-riders-escape/core/index.js';
import { STORY, create, fly, ofType, runUntil, stepsOf, tickN, wrongLane } from './helpers.js';

describe('lanes', () => {
  it('lane centers are 3.6 m apart and the nearest lane rounds', () => {
    expect([0, 1, 2].map(laneX)).toEqual([-LANES.gap, 0, LANES.gap]);
    expect(nearestLane(-5)).toBe(0);
    expect(nearestLane(1.7)).toBe(1);
    expect(nearestLane(1.9)).toBe(2);
    expect(nearestLane(99)).toBe(2);
  });

  it('the griffin starts in the middle and changes lane at a speed, not at once', () => {
    const sim = create();
    expect(sim.state.griffin.lane).toBe(1);
    const ev = sim.dispatch({ type: 'lane', lane: 2 });
    expect(ev).toEqual([{ type: 'laneChanged', lane: 2 }]);
    sim.tick();
    expect(sim.state.griffin.x).toBeGreaterThan(0);
    expect(sim.state.griffin.x).toBeLessThan(laneX(2));
    tickN(sim, 30);
    expect(sim.state.griffin.x).toBe(laneX(2));
  });

  it('steer moves one lane and stops at the edge; bad lanes do nothing', () => {
    const sim = create();
    sim.dispatch({ type: 'steer', dir: -1 });
    expect(sim.state.griffin.lane).toBe(0);
    expect(sim.dispatch({ type: 'steer', dir: -1 })).toEqual([]);
    expect(sim.dispatch({ type: 'lane', lane: 7 })).toEqual([]);
    expect(sim.dispatch({ type: 'lane', lane: 0.5 })).toEqual([]);
  });
});

describe('waves', () => {
  it('the first wave is a row of three gates with the next word in a seeded lane and distinct decoys', () => {
    const sim = create(3);
    const first = sim.tick().find((e) => e.type === 'waveMade');
    expect(first?.type === 'waveMade' && first.kind).toBe('gates');
    const wave = sim.state.waves[0]!;
    expect(wave.gates).toHaveLength(3);
    const answer = sim.state.sentences[0]!.words[0]!;
    expect(wave.gates[wave.rightLane]!.text).toBe(answer);
    const keys = wave.gates.map((g) => normWord(g.text));
    expect(new Set(keys).size).toBe(3);
    expect(rightLaneOf(sim.state)).toBe(wave.rightLane);
  });

  it('a storm never fills every lane, and a storm comes with the gate row after it', () => {
    let storms = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const sim = create(seed);
      const events = fly(sim);
      for (const e of ofType(events, 'waveMade')) {
        if (e.kind !== 'storm') continue;
        storms += 1;
        expect(e.stormLanes.length).toBeGreaterThanOrEqual(1);
        expect(e.stormLanes.length).toBeLessThan(LANES.count);
      }
    }
    expect(storms).toBeGreaterThan(3);
  });

  it('Helper mode flies slower and fills one lane per storm', () => {
    const sim = create(5, true);
    expect(sim.state.speed).toBeLessThan(TUNING.speed);
    for (const e of ofType(fly(sim), 'waveMade')) if (e.kind === 'storm') expect(e.stormLanes).toHaveLength(1);
  });
});

describe('gates', () => {
  it('the right gate collects the word, scores, and brings the next word', () => {
    const sim = create(2);
    sim.tick();
    sim.dispatch({ type: 'lane', lane: sim.state.waves[0]!.rightLane });
    const { events } = runUntil(sim, (now) => now.some((e) => e.type === 'wordCollected'));
    const pass = ofType(events, 'gatePassed')[0]!;
    expect(pass.correct).toBe(true);
    expect(sim.state.word).toBe(1);
    expect(sim.state.score).toBe(TUNING.wordScore);
    expect(sim.state.courage).toBe(TUNING.courage);
    expect(sim.state.sentences[0]!.started).toBe(true);
  });

  it('a wrong gate costs courage, rests the riders, and repeats the same word with new gates', () => {
    const sim = create(2);
    sim.tick();
    const first = sim.state.waves[0]!;
    sim.dispatch({ type: 'lane', lane: wrongLane(first.rightLane) });
    const { events } = runUntil(sim, (now) => now.some((e) => e.type === 'courageLost'));
    expect(ofType(events, 'gatePassed')[0]!.correct).toBe(false);
    expect(sim.state.courage).toBe(TUNING.courage - 1);
    expect(sim.state.restMs).toBe(TUNING.restMs);
    expect(sim.state.speed).toBe(0);
    expect(sim.state.word).toBe(0);
    expect(sim.state.sentences[0]!.misses).toBe(1);
    const distance = sim.state.distance;
    tickN(sim, 5);
    expect(sim.state.distance).toBe(distance);
    const after = runUntil(sim, (now) => now.some((e) => e.type === 'waveMade')).events.find((e) => e.type === 'waveMade')!;
    expect(after.type === 'waveMade' && after.kind === 'gates' && after.retry && after.wordIndex === 0).toBe(true);
    expect(sim.state.speed).toBeGreaterThan(0);
  });

  it('the retry word scores less', () => {
    const sim = create(2);
    fly(sim, { wrongOn: (n) => n === 1 });
    const s = sim.state;
    const words = s.sentences.reduce((n, x) => n + x.words.length, 0);
    expect(s.score).toBe((words - 1) * TUNING.wordScore + TUNING.retryWordScore + s.sentences.length * TUNING.sentenceScore);
  });
});

describe('storms', () => {
  it('flying into a storm costs courage and rests; the word is not lost', () => {
    let hit = false;
    for (let seed = 1; seed <= 20 && !hit; seed++) {
      const sim = create(seed);
      const events = fly(sim, { noDodge: true });
      const bumps = ofType(events, 'stormHit');
      if (bumps.length === 0) continue;
      hit = true;
      expect(sim.state.bumps).toBe(bumps.length);
      expect(ofType(events, 'courageLost').filter((e) => e.cause === 'storm')).toHaveLength(bumps.length);
      expect(sim.state.phase).toBe('complete');
      expect(sim.state.sentences.every((s) => s.cleared && s.misses === 0)).toBe(true);
    }
    expect(hit).toBe(true);
  });

  it('dodging a storm in a free lane costs nothing', () => {
    const events = fly(create(4));
    expect(ofType(events, 'stormHit')).toHaveLength(0);
    expect(ofType(events, 'courageLost')).toHaveLength(0);
  });
});

describe('courage and rest', () => {
  it('at 0 courage the rest is longer, all courage returns, and the escape goes on', () => {
    const sim = create(6);
    const events = fly(sim, { wrongOn: (n) => n <= 3 });
    expect(ofType(events, 'courageLost')).toHaveLength(3);
    const rested = ofType(events, 'rested');
    expect(rested).toHaveLength(1);
    expect(rested[0]!.courage).toBe(TUNING.courage);
    expect(sim.state.courage).toBe(TUNING.courage);
    expect(sim.state.phase).toBe('complete');
  });

  it('there is no game over: every pick wrong for many rounds still ends well once the student reads', () => {
    const sim = create(8);
    const events = fly(sim, { wrongOn: (n) => n < 12, noDodge: true });
    expect(ofType(events, 'courageLost').length).toBeGreaterThan(6);
    expect(ofType(events, 'escapeComplete')).toHaveLength(1);
    expect(sim.state.sentences.every((s) => s.cleared)).toBe(true);
  });
});

describe('evidence', () => {
  it('one item per sentence, attempts = wrong gates + 1, storms and speed never count', () => {
    const sim = create(2);
    fly(sim, { wrongOn: (n) => n === 1 || n === 2, noDodge: true });
    const evidence = evidenceOf(sim.state, STORY, 2, 1);
    expect(evidence.items).toHaveLength(sim.state.sentences.length);
    expect(evidence.items.map((i) => i.itemId)).toEqual(sim.state.sentences.map((s) => s.id));
    const missed = evidence.items.filter((i) => !i.correctFirstTry);
    expect(missed.map((i) => i.attempts - 1).reduce((a, b) => a + b, 0)).toBe(sim.state.sentences.reduce((n, s) => n + s.misses, 0));
    expect(evidence.items.every((i) => i.solved)).toBe(true);
  });

  it('a sentence the griffin never reached has no evidence item', () => {
    const sim = create(2);
    tickN(sim, stepsOf(1000));
    expect(evidenceOf(sim.state, STORY, 2, 1).items).toHaveLength(0);
  });
});
