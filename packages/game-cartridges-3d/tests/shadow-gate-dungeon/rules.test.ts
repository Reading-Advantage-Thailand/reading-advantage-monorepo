/** The Shadow Gate Dungeon rules of sections 2, 3, and 6 of docs/game-shadow-gate-dungeon-3d.md. */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema, toGameResults } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { STEP_MS, createRng, distance } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  GATE,
  HERO_START,
  ROOM,
  ROOM_WORDS,
  SHADOW_GATE_EVENT_TYPES,
  TUNING,
  bareWord,
  createShadowGate,
  distractorsOf,
  evidenceOf,
  resultsOf,
  roomSentencesOf,
  scoreOf,
  sentencesOf,
  shadowCountFor,
  shadowSpeedFor,
  shiftOf,
  wordKey,
} from '../../src/shadow-gate-dungeon/core/index.js';
import { nextSteer } from '../../src/shadow-gate-dungeon/qc/bot.js';
import { LONG_STORY, STORY, buildSentence, create, ofType, parkShadows, rightCrystal, stepsOf, tickN, touch, wrongCrystal } from './helpers.js';

function clearRoom(sim: ReturnType<typeof create>) {
  buildSentence(sim);
  sim.state.hero.x = GATE.x;
  sim.state.hero.z = GATE.z + 0.5;
  return sim.tick();
}

describe('content', () => {
  it('builds a delve of up to 5 rooms from sentences of 3 to 7 words, in a seeded order', () => {
    const delve = shiftOf(STORY, createRng(3), TUNING.maxRooms);
    expect(delve).toHaveLength(5);
    expect(new Set(delve.map((r) => r.id)).size).toBe(5);
    delve.forEach((room, i) => {
      const sentence = STORY.sentences.find((s) => s.id === room.id)!;
      expect(room.words).toEqual(sentence.words);
      expect(room.roomId).toBe(`room-${i + 1}`);
      expect(room.words.length).toBeGreaterThanOrEqual(ROOM_WORDS.min);
      expect(room.words.length).toBeLessThanOrEqual(ROOM_WORDS.max);
      expect(room).toMatchObject({ refusals: 0, started: false, cleared: false });
    });
    expect(shiftOf(STORY, createRng(3), 5).map((r) => r.id)).toEqual(delve.map((r) => r.id));
    expect(shiftOf(STORY, createRng(4), 5).map((r) => r.id)).not.toEqual(delve.map((r) => r.id));
  });

  it('leaves out long sentences and uses fewer rooms when the story has fewer', () => {
    const fit = roomSentencesOf(LONG_STORY);
    expect(fit.length).toBeLessThan(LONG_STORY.sentences.length);
    expect(fit.every((s) => s.words.length <= 7)).toBe(true);
    expect(shiftOf(LONG_STORY, createRng(1), TUNING.maxRooms)).toHaveLength(Math.min(5, fit.length));
  });

  it('accepts the APK SentenceInput', () => {
    const input = [
      { term: 'The cat sleeps.', translation: 'x' },
      { term: 'Hi', translation: '' },
      { term: 'The dog runs fast.', translation: '' },
    ];
    expect(sentencesOf(input).map((s) => s.id)).toEqual(['s-1', 's-3']);
    expect(createShadowGate(input, { seed: 1, helper: false }).state.rooms).toBe(2);
    expect(createShadowGate([], { seed: 1, helper: false }).state.phase).toBe('complete');
  });

  it('crystal words carry no punctuation, and distractors differ from the answer and from each other', () => {
    expect(bareWord('Pip,')).toBe('Pip');
    expect(bareWord('"brave."')).toBe('brave');
    expect(bareWord('...')).toBe('...');
    expect(wordKey('Brave.')).toBe(wordKey('brave'));
    const out = distractorsOf(['the', 'cat', 'the', 'dog'], ['dog', 'sun', 'moon'], 'the', createRng(2), 2);
    expect(out).toHaveLength(2);
    expect(out.map(wordKey)).not.toContain('the');
    expect(new Set(out.map(wordKey)).size).toBe(2);
    // The same-sentence words come first.
    expect(out.every((w) => ['cat', 'dog'].includes(w))).toBe(true);
    // Fewer words than asked: it returns what exists.
    expect(distractorsOf(['a'], [], 'a', createRng(1), 2)).toEqual([]);
  });
});

describe('the room', () => {
  it('starts with the hero at the start, one wave of crystals, and the first events on the first tick', () => {
    const sim = create(3);
    const room = sim.state.shift[0]!;
    expect(sim.state.hero).toMatchObject({ x: HERO_START.x, z: HERO_START.z, bumpedMs: 0 });
    expect(sim.state).toMatchObject({ next: 0, gateOpen: false, room: 0, rooms: 5, phase: 'playing' });
    expect(sim.state.crystals).toHaveLength(3);
    // One crystal holds the next word; the others hold other words.
    const keys = sim.state.crystals.map((c) => wordKey(c.word));
    expect(new Set(keys).size).toBe(3);
    expect(keys.filter((k) => k === wordKey(room.words[0]!))).toHaveLength(1);
    for (const c of sim.state.crystals) {
      expect(c.x).toBeGreaterThanOrEqual(ROOM.minX);
      expect(c.x).toBeLessThanOrEqual(ROOM.maxX);
      expect(distance(c, HERO_START)).toBeGreaterThanOrEqual(TUNING.crystalKeepOutHero);
      expect(distance(c, GATE)).toBeGreaterThanOrEqual(TUNING.crystalKeepOutGate);
      expect(c.word).toBe(bareWord(c.word));
      for (const o of sim.state.crystals) if (o !== c) expect(distance(c, o)).toBeGreaterThanOrEqual(TUNING.crystalSpacing / 2);
    }
    const events = sim.tick();
    expect(ofType(events, 'roomStarted')).toHaveLength(1);
    expect(ofType(events, 'roomStarted')[0]).toMatchObject({ roomId: 'room-1', sentenceId: room.id, words: room.words });
    const wave = ofType(events, 'wavePlaced');
    expect(wave).toHaveLength(1);
    expect(wave[0]!.cause).toBe('start');
    expect(wave[0]!.crystals.map((c) => c.id)).toEqual(sim.state.crystals.map((c) => c.id));
    expect(ofType(sim.tick(), 'roomStarted')).toHaveLength(0);
  });

  it('shadows: 1 first, +1 every second room, at most 3 (Helper mode fewer and slower); speed +10% per room', () => {
    expect([0, 1, 2, 3, 4].map((r) => shadowCountFor(r, false))).toEqual([1, 1, 2, 2, 3]);
    expect([0, 1, 2, 3, 4].map((r) => shadowCountFor(r, true))).toEqual([1, 1, 1, 2, 2]);
    expect(shadowSpeedFor(0, false)).toBeCloseTo(1.1);
    expect(shadowSpeedFor(1, false)).toBeCloseTo(1.21);
    expect(shadowSpeedFor(4, false)).toBeCloseTo(1.43);
    expect(shadowSpeedFor(0, true)).toBeCloseTo(0.8);
    const sim = create(1);
    expect(sim.state.shadows).toHaveLength(1);
    for (const s of sim.state.shadows) expect(distance(s, HERO_START)).toBeGreaterThanOrEqual(TUNING.shadowKeepOutHero);
  });

  it('a shadow follows the hero, slower than the hero, and stays in the room', () => {
    const sim = create(2);
    const s = sim.state.shadows[0]!;
    const before = distance(s, sim.state.hero);
    tickN(sim, stepsOf(1000));
    expect(distance(s, sim.state.hero)).toBeLessThan(before);
    expect(TUNING.shadowSpeed).toBeLessThan(TUNING.heroSpeed);
    tickN(sim, stepsOf(30_000));
    expect(s.x).toBeGreaterThanOrEqual(ROOM.minX);
    expect(s.x).toBeLessThanOrEqual(ROOM.maxX);
    expect(s.z).toBeGreaterThanOrEqual(ROOM.minZ);
    expect(s.z).toBeLessThanOrEqual(ROOM.maxZ);
  });
});

describe('walking', () => {
  it('a steer moves the hero at 3.2 m/s, holds until the next steer, and is clamped to length 1 and the room', () => {
    const sim = create(1);
    parkShadows(sim);
    expect(sim.dispatch({ type: 'steer', x: 0, z: -1 })).toEqual([]);
    sim.tick();
    expect(sim.state.hero.z).toBeCloseTo(HERO_START.z - (TUNING.heroSpeed * STEP_MS) / 1000);
    expect(sim.state.hero.facing).toBeCloseTo(180);
    sim.dispatch({ type: 'steer', x: 3, z: 4 });
    expect(Math.hypot(sim.state.steer.x, sim.state.steer.z)).toBeCloseTo(1);
    sim.dispatch({ type: 'steer', x: 1, z: 0 });
    sim.state.crystals = [];
    tickN(sim, stepsOf(10_000));
    expect(sim.state.hero.x).toBeCloseTo(ROOM.maxX - TUNING.heroRadius);
    sim.dispatch({ type: 'steer', x: Number.NaN, z: 0 });
    expect(sim.state.steer).toEqual({ x: 0, z: 0 });
  });
});

describe('word crystals', () => {
  it('the crystal with the next word joins the sentence and the next wave stands', () => {
    const sim = create(3);
    parkShadows(sim);
    sim.tick();
    const right = rightCrystal(sim);
    const events = touch(sim, right.id);
    expect(ofType(events, 'crystalTaken')).toEqual([{ type: 'crystalTaken', id: right.id, index: 0 }]);
    expect(sim.state.next).toBe(1);
    expect(sim.state.collected).toBe(1);
    expect(sim.state.shift[0]!.started).toBe(true);
    expect(sim.state.shift[0]!.refusals).toBe(0);
    const wave = ofType(events, 'wavePlaced');
    expect(wave).toHaveLength(1);
    expect(wave[0]!.cause).toBe('taken');
    expect(sim.state.crystals.map((c) => c.id)).not.toContain(right.id);
    const word = sim.state.shift[0]!.words[1]!;
    expect(sim.state.crystals.filter((c) => wordKey(c.word) === wordKey(word))).toHaveLength(1);
  });

  it('a wrong crystal counts an attempt and the crystals shuffle; the sentence keeps what it has', () => {
    const sim = create(3);
    parkShadows(sim);
    touch(sim, rightCrystal(sim).id);
    const wrong = wrongCrystal(sim);
    const ids = sim.state.crystals.map((c) => c.id);
    const events = touch(sim, wrong.id);
    expect(ofType(events, 'crystalRefused')).toEqual([{ type: 'crystalRefused', id: wrong.id }]);
    expect(ofType(events, 'wavePlaced')[0]!.cause).toBe('refused');
    expect(sim.state.shift[0]!.refusals).toBe(1);
    expect(sim.state.next).toBe(1);
    expect(sim.state.collected).toBe(1);
    expect(sim.state.crystals.map((c) => c.id)).not.toEqual(ids);
    expect(sim.state.crystals.map((c) => c.id).some((id) => ids.includes(id))).toBe(false);
  });

  it('a touch counts when the hero enters a crystal, not while it stays on one', () => {
    const sim = create(3);
    parkShadows(sim);
    const right = rightCrystal(sim);
    sim.state.hero.x = right.x;
    sim.state.hero.z = right.z;
    expect(ofType(sim.tick(), 'crystalTaken')).toHaveLength(1);
    // A fresh wave keeps off the hero, so the hero touches nothing by standing still.
    expect(ofType(tickN(sim, 30), 'crystalTaken')).toHaveLength(0);
    expect(ofType(tickN(sim, 30), 'crystalRefused')).toHaveLength(0);
  });

  it('the whole sentence opens the gate; the hero at the gate clears the room and the next one starts', () => {
    const sim = create(3);
    const room = sim.state.shift[0]!;
    const events = buildSentence(sim);
    expect(ofType(events, 'crystalTaken').map((e) => e.index)).toEqual(room.words.map((_, i) => i));
    expect(ofType(events, 'gateOpened')).toEqual([{ type: 'gateOpened', roomId: 'room-1' }]);
    expect(sim.state.gateOpen).toBe(true);
    expect(sim.state.crystals).toEqual([]);
    expect(ofType(sim.tick(), 'roomCleared')).toHaveLength(0);
    sim.state.hero.x = GATE.x;
    sim.state.hero.z = GATE.z + 0.5;
    const cleared = sim.tick();
    expect(ofType(cleared, 'roomCleared')).toEqual([{ type: 'roomCleared', roomId: 'room-1', sentenceId: room.id }]);
    expect(room.cleared).toBe(true);
    expect(sim.state).toMatchObject({ room: 1, next: 0, gateOpen: false, roomsCleared: 1 });
    expect(ofType(cleared, 'roomStarted')[0]).toMatchObject({ roomId: 'room-2' });
    expect(sim.state.hero).toMatchObject({ x: HERO_START.x, z: HERO_START.z });
    expect(sim.state.shadows).toHaveLength(1);
    expect(sim.state.crystals).toHaveLength(3);
  });

  it('a word that repeats in the sentence has one crystal that is right for both places', () => {
    const input = [
      { term: 'The cat and the dog', translation: '' },
      { term: 'A bird can sing', translation: '' },
      { term: 'We like red apples', translation: '' },
    ];
    for (let seed = 1; seed <= 12; seed++) {
      const sim = createShadowGate(input, { seed, helper: false });
      parkShadows(sim);
      const room = sim.state.shift[0]!;
      for (let i = 0; i < room.words.length; i++) {
        const keys = sim.state.crystals.map((c) => wordKey(c.word));
        expect(new Set(keys).size).toBe(keys.length);
        expect(keys.filter((k) => k === wordKey(room.words[sim.state.next]!))).toHaveLength(1);
        touch(sim, rightCrystal(sim).id);
      }
      expect(sim.state.gateOpen).toBe(true);
    }
  });
});

describe('shadows', () => {
  it('a shadow on the hero bumps it for 0.8 s, shuffles the crystals, and backs off; not a reading error', () => {
    const sim = create(3);
    parkShadows(sim);
    touch(sim, rightCrystal(sim).id);
    const refusals = sim.state.shift[0]!.refusals;
    const ids = sim.state.crystals.map((c) => c.id);
    const h = sim.state.hero;
    const s = sim.state.shadows[0]!;
    s.x = h.x + 0.4;
    s.z = h.z;
    s.restMs = 0;
    const events = sim.tick();
    expect(ofType(events, 'heroBumped')).toEqual([{ type: 'heroBumped', shadowId: s.id }]);
    expect(ofType(events, 'wavePlaced')[0]!.cause).toBe('bumped');
    expect(h.bumpedMs).toBeGreaterThan(0);
    expect(s.restMs).toBeGreaterThan(0);
    expect(sim.state.shadows.every((x) => x.restMs > 0)).toBe(true);
    expect(distance(s, h)).toBeGreaterThan(1);
    expect(sim.state.crystals.map((c) => c.id)).not.toEqual(ids);
    expect(sim.state.shift[0]!.refusals).toBe(refusals);
    expect(sim.state.next).toBe(1);
    // The pushed hero calls no crystal.
    const wrong = wrongCrystal(sim);
    sim.state.hero.x = wrong.x;
    sim.state.hero.z = wrong.z;
    expect(ofType(sim.tick(), 'crystalRefused')).toHaveLength(0);
  });

  it('with the gate open the shadows keep off: no bump', () => {
    const sim = create(3);
    buildSentence(sim);
    const s = sim.state.shadows[0]!;
    s.x = sim.state.hero.x;
    s.z = sim.state.hero.z;
    s.restMs = 0;
    expect(ofType(sim.tick(), 'heroBumped')).toHaveLength(0);
    const at = { x: s.x, z: s.z };
    tickN(sim, 10);
    expect(distance(s, at)).toBeLessThan(1e-9);
  });
});

describe('the end and the evidence', () => {
  it('there is no game over: the delve ends only when every room is cleared', () => {
    expect(SHADOW_GATE_EVENT_TYPES).not.toContain('gameOver');
    const sim = create(5);
    tickN(sim, stepsOf(60_000));
    expect(sim.state.phase).toBe('playing');
  });

  it('a cleared delve gives one sentence item per room, with attempts = wrong crystals + 1', () => {
    const sim = create(4);
    parkShadows(sim);
    touch(sim, wrongCrystal(sim).id);
    sim.state.hero.x = HERO_START.x;
    sim.state.hero.z = HERO_START.z;
    const events = [...clearRoom(sim)];
    while (sim.state.phase === 'playing') events.push(...clearRoom(sim));
    expect(ofType(events, 'delveComplete')).toEqual([{ type: 'delveComplete', rooms: 5 }]);
    const ev = evidenceOf(sim.state, STORY, 4, 12_000);
    expect(storyGameEvidenceSchema.safeParse(ev).success).toBe(true);
    expect(ev.gameId).toBe('shadow-gate-dungeon');
    expect(ev.items).toHaveLength(5);
    expect(ev.items.map((i) => i.itemId)).toEqual(sim.state.shift.map((r) => r.id));
    expect(ev.items[0]).toMatchObject({ attempts: 2, correctFirstTry: false, solved: true });
    expect(ev.items.slice(1).every((i) => i.attempts === 1 && i.correctFirstTry && i.solved)).toBe(true);
    const total = sim.state.shift.reduce((n, r) => n + r.words.length, 0);
    expect(scoreOf(sim.state)).toBe(total * 10 + 5 * 50);
    const { results, outcome } = resultsOf(sim.state, STORY, 4, 12_000);
    expect(results).toEqual(toGameResults(ev, scoreOf(sim.state)));
    expect(outcome).toBe('victory');
  });

  it('time never changes the evidence: speed gives no XP', () => {
    const sim = create(4);
    while (sim.state.phase === 'playing') clearRoom(sim);
    const fast = resultsOf(sim.state, STORY, 4, 1_000).results;
    const slow = resultsOf(sim.state, STORY, 4, 900_000).results;
    expect(slow).toEqual(fast);
  });

  it('an untouched room leaves no evidence item', () => {
    const sim = create(4);
    expect(evidenceOf(sim.state, STORY, 4, 0).items).toHaveLength(0);
    expect(nextSteer(sim.state)).not.toBeNull();
  });
});
