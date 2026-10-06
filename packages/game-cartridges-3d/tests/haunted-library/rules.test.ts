/** Haunted Library rules: rooms, doors, hazards, pads, courage, rests, evidence. */
import { describe, expect, it } from 'vitest';
import {
  FLOOR_COUNT,
  HALF_WIDTH,
  TUNING,
  createHauntedLibrary,
  evidenceOf,
  ghostCountFor,
  nextDoorOf,
  resultsOf,
  scoreOf,
  sentencesOf,
} from '../../src/haunted-library/core/index.js';
import { STORY, create, doorAt, ofType, openNext, parkHazards, standAt, stepsOf, tickN } from './helpers.js';

describe('setup', () => {
  it('a visit has up to 5 rooms of 3 to 7 words, each with one door per word', () => {
    const sim = create(3);
    const s = sim.state;
    expect(s.rooms).toBeGreaterThan(0);
    expect(s.rooms).toBeLessThanOrEqual(TUNING.maxRooms);
    expect(s.shift.every((r) => r.words.length >= 3 && r.words.length <= 7)).toBe(true);
    expect(s.doors.map((d) => d.word)).toEqual(s.shift[0]!.words);
    expect(s.doors.every((d) => d.floor >= 0 && d.floor < FLOOR_COUNT && Math.abs(d.x) <= TUNING.doorX)).toBe(true);
    expect(s.courage).toBe(TUNING.courage);
    expect(s.phase).toBe('playing');
  });

  it('doors on a floor keep their distance', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { doors } = create(seed, false).state;
      for (const a of doors) for (const b of doors) if (a !== b && a.floor === b.floor) expect(Math.abs(a.x - b.x)).toBeGreaterThanOrEqual(TUNING.doorSpacing - 1e-9);
    }
  });

  it('ghosts: three, or two in Helper mode, none starting on the hero', () => {
    expect(create(1, false).state.hazards).toHaveLength(ghostCountFor(false));
    expect(create(1, true).state.hazards).toHaveLength(ghostCountFor(true));
    for (let seed = 1; seed <= 30; seed++) {
      for (const z of create(seed).state.hazards) expect(z.floor === 0 && Math.abs(z.x) < TUNING.ghostKeepOutHero).toBe(false);
    }
  });

  it('the first tick announces the first room', () => {
    const sim = create(2);
    const first = sim.tick();
    expect(ofType(first, 'roomStarted')).toHaveLength(1);
    expect(sim.tick().filter((e) => e.type === 'roomStarted')).toHaveLength(0);
  });

  it('an input with no sentences is complete at once', () => {
    const sim = createHauntedLibrary([], { seed: 1, helper: false });
    expect(sim.state.phase).toBe('complete');
    expect(sim.tick()).toEqual([]);
  });

  it('accepts the APK SentenceInput', () => {
    const sim = createHauntedLibrary(
      [{ term: 'the cat sat down', translation: 'x' }, { term: 'a big red dog ran', translation: 'y' }],
      { seed: 4, helper: false },
    );
    expect(sim.state.shift.map((r) => r.id).sort()).toEqual(['s-1', 's-2']);
    expect(sentencesOf([{ term: 'one', translation: '' }])).toEqual([]);
  });
});

describe('movement', () => {
  it('move walks along the floor and stops at the ends', () => {
    const sim = create(5);
    parkHazards(sim);
    sim.dispatch({ type: 'move', dir: 1 });
    const x0 = sim.state.hero.x;
    tickN(sim, 3);
    expect(sim.state.hero.x).toBeGreaterThan(x0);
    expect(sim.state.hero.facing).toBe(1);
    sim.dispatch({ type: 'move', dir: 0 });
    const still = sim.state.hero.x;
    tickN(sim, 5);
    expect(sim.state.hero.x).toBe(still);
  });

  it('a pad at the end bounces the hero up one floor, then a cooldown stops a chain', () => {
    const sim = create(5);
    parkHazards(sim);
    sim.dispatch({ type: 'move', dir: 1 });
    const events: ReturnType<typeof tickN> = [];
    while (ofType(events, 'landed').length === 0) events.push(...tickN(sim, 1));
    expect(ofType(events, 'bounced')).toHaveLength(1);
    expect(sim.state.hero.floor).toBe(1);
    expect(Math.abs(sim.state.hero.x)).toBeLessThanOrEqual(TUNING.landX);
    // The held walk does not bounce again until the pad cooldown has run.
    expect(ofType(tickN(sim, stepsOf(TUNING.padCooldownMs) - 2), 'bounced')).toHaveLength(0);
  });

  it('there is nothing above the top floor: the pad does not bounce there', () => {
    const sim = create(5);
    parkHazards(sim);
    sim.state.hero.floor = 3;
    sim.state.hero.toFloor = 3;
    sim.dispatch({ type: 'move', dir: -1 });
    const events = tickN(sim, stepsOf(4000));
    expect(ofType(events, 'bounced')).toHaveLength(0);
    expect(sim.state.hero.x).toBeCloseTo(-(HALF_WIDTH - TUNING.heroMargin));
  });

  it('drop goes down one floor; on the ground floor it does nothing', () => {
    const sim = create(5);
    parkHazards(sim);
    expect(sim.dispatch({ type: 'drop' })).toEqual([]);
    sim.state.hero.floor = 2;
    sim.state.hero.toFloor = 2;
    expect(sim.dispatch({ type: 'drop' })).toEqual([{ type: 'dropped', toFloor: 1 }]);
    const events = tickN(sim, stepsOf(1000));
    expect(ofType(events, 'landed')).toEqual([{ type: 'landed', floor: 1 }]);
    expect(sim.state.hero.floor).toBe(1);
  });

  it('commands are ignored while the hero is in the air', () => {
    const sim = create(5);
    parkHazards(sim);
    sim.state.hero.floor = 2;
    sim.state.hero.toFloor = 2;
    sim.dispatch({ type: 'drop' });
    expect(sim.dispatch({ type: 'drop' })).toEqual([]);
    const door = doorAt(sim, 0);
    sim.state.hero.x = door.x;
    expect(sim.dispatch({ type: 'open' })).toEqual([]);
  });

  it('bad input is harmless', () => {
    const sim = create(5);
    sim.dispatch({ type: 'move', dir: Number.NaN });
    expect(sim.state.move).toBe(0);
    sim.dispatch({ type: 'move', dir: 9 });
    expect(sim.state.move).toBe(1);
    standAt(sim, doorAt(sim, 0), TUNING.openRange + 1);
    expect(sim.dispatch({ type: 'open' })).toEqual([]);
  });
});

describe('doors', () => {
  it('the right door opens, scores, and stuns ghosts near it', () => {
    const sim = create(6);
    parkHazards(sim);
    const door = doorAt(sim, 0);
    const ghost = sim.state.hazards[0]!;
    ghost.stunMs = 0;
    ghost.floor = door.floor;
    ghost.x = door.x + 1;
    ghost.vx = 0;
    standAt(sim, door, 0.2);
    const events = sim.dispatch({ type: 'open' });
    expect(ofType(events, 'doorOpened')).toEqual([{ type: 'doorOpened', id: door.id, index: 0, stunned: [ghost.id] }]);
    expect(door.open).toBe(true);
    expect(ghost.stunMs).toBe(TUNING.ghostStunMs);
    expect(sim.state.next).toBe(1);
    expect(scoreOf(sim.state)).toBe(100);
  });

  it('a door out of order costs a reading attempt, courage, and lets a bat out', () => {
    const sim = create(6);
    parkHazards(sim);
    const wrong = doorAt(sim, 1);
    standAt(sim, wrong);
    const events = sim.dispatch({ type: 'open' });
    expect(ofType(events, 'doorWrong')).toHaveLength(1);
    expect(ofType(events, 'courageChanged')).toEqual([{ type: 'courageChanged', courage: TUNING.courage - 1 }]);
    expect(wrong.open).toBe(false);
    expect(sim.state.next).toBe(0);
    expect(sim.state.shift[0]!.refusals).toBe(1);
    const bats = sim.state.hazards.filter((z) => z.kind === 'bat');
    expect(bats).toHaveLength(1);
    expect(bats[0]!.floor).toBe(wrong.floor);
  });

  it('too far from any door: nothing happens, and nothing is counted', () => {
    const sim = create(6);
    const door = doorAt(sim, 0);
    standAt(sim, door, TUNING.openRange + 0.5);
    expect(sim.dispatch({ type: 'open' })).toEqual([]);
    expect(sim.state.shift[0]!.started).toBe(false);
  });

  it('a door on another floor cannot be opened', () => {
    const sim = create(6);
    const door = doorAt(sim, 0);
    standAt(sim, door);
    sim.state.hero.floor = (door.floor + 1) % FLOOR_COUNT;
    sim.state.hero.toFloor = sim.state.hero.floor;
    expect(sim.dispatch({ type: 'open' })).toEqual([]);
  });

  it('at most three bats at a time: the oldest leaves', () => {
    const sim = create(6);
    parkHazards(sim);
    const wrong = doorAt(sim, 1);
    const removed: (string | null)[] = [];
    for (let i = 0; i < 4; i++) {
      sim.state.courage = 3;
      sim.state.hero.hurtMs = 0;
      standAt(sim, wrong);
      removed.push(...ofType(sim.dispatch({ type: 'open' }), 'doorWrong').map((e) => e.removed));
      parkHazards(sim);
    }
    expect(sim.state.hazards.filter((z) => z.kind === 'bat')).toHaveLength(TUNING.maxBats);
    expect(removed).toEqual([null, null, null, 'b1']);
  });

  it('opening every door in order clears the room and starts the next one', () => {
    const sim = create(8);
    sim.tick();
    parkHazards(sim);
    const first = sim.state.shift[0]!;
    let events = [] as ReturnType<typeof openNext>;
    for (let i = 0; i < first.words.length; i++) events = openNext(sim);
    expect(ofType(events, 'roomCleared')).toEqual([{ type: 'roomCleared', roomId: 'room-1', sentenceId: first.id }]);
    expect(first.cleared).toBe(true);
    if (sim.state.rooms > 1) {
      expect(ofType(events, 'roomStarted')).toHaveLength(1);
      expect(sim.state.room).toBe(1);
      expect(sim.state.next).toBe(0);
      expect(sim.state.doors.map((d) => d.word)).toEqual(sim.state.shift[1]!.words);
    }
  });

  it('the last room ends the visit, once', () => {
    const sim = create(9);
    const events = [] as ReturnType<typeof openNext>;
    while (sim.state.phase === 'playing') {
      parkHazards(sim);
      events.push(...openNext(sim));
    }
    expect(ofType(events, 'visitComplete')).toHaveLength(1);
    expect(sim.state.roomsCleared).toBe(sim.state.rooms);
    expect(sim.dispatch({ type: 'open' })).toEqual([]);
    expect(sim.tick()).toEqual([]);
  });
});

describe('hazards', () => {
  it('ghosts and bats turn around at the ends of the floor', () => {
    const sim = create(2);
    const g = sim.state.hazards[0]!;
    g.floor = 2;
    g.x = HALF_WIDTH - TUNING.hazardMargin - 0.01;
    g.vx = TUNING.ghostSpeed;
    g.stunMs = 0;
    tickN(sim, 3);
    expect(g.vx).toBeLessThan(0);
    expect(Math.abs(g.x)).toBeLessThanOrEqual(HALF_WIDTH - TUNING.hazardMargin);
  });

  it('a stunned ghost stands still and is harmless, then moves again', () => {
    const sim = create(2);
    parkHazards(sim);
    const g = sim.state.hazards[0]!;
    g.floor = sim.state.hero.floor;
    g.x = sim.state.hero.x;
    g.stunMs = 500;
    g.vx = TUNING.ghostSpeed;
    const x = g.x;
    tickN(sim, 5);
    expect(g.x).toBe(x);
    expect(sim.state.courage).toBe(TUNING.courage);
    tickN(sim, stepsOf(800));
    expect(g.stunMs).toBe(0);
    expect(g.x).not.toBe(x);
  });

  it('a touch costs courage, knocks the hero back, and protects it for a while', () => {
    const sim = create(2);
    parkHazards(sim);
    const g = sim.state.hazards[0]!;
    g.stunMs = 0;
    g.floor = sim.state.hero.floor;
    g.x = sim.state.hero.x + 0.3;
    g.vx = 0;
    const events = tickN(sim, 1);
    expect(ofType(events, 'heroHit')).toHaveLength(1);
    expect(sim.state.courage).toBe(TUNING.courage - 1);
    expect(sim.state.hero.hurtMs).toBeGreaterThan(0);
    expect(sim.state.hero.push).toBe(-1);
    // Protected: standing on the ghost again costs nothing.
    g.x = sim.state.hero.x;
    expect(ofType(tickN(sim, 5), 'heroHit')).toHaveLength(0);
    // A hit is not a reading error.
    expect(sim.state.shift[0]!.refusals).toBe(0);
  });

  it('a hazard on another floor, or a hero in the air, is no danger', () => {
    const sim = create(2);
    parkHazards(sim);
    const g = sim.state.hazards[0]!;
    g.stunMs = 0;
    g.floor = 1;
    g.x = sim.state.hero.x;
    expect(ofType(tickN(sim, 3), 'heroHit')).toHaveLength(0);
    g.floor = 0;
    sim.state.hero.floor = 0;
    sim.state.hero.toFloor = 1;
    sim.state.hero.travelMs = 400;
    expect(ofType(tickN(sim, 3), 'heroHit')).toHaveLength(0);
  });
});

describe('courage and rests', () => {
  it('no courage left: the team rests, returns to the entrance, and the game goes on', () => {
    const sim = create(6);
    parkHazards(sim);
    const wrong = doorAt(sim, 1);
    let rested = [] as ReturnType<typeof openNext>;
    for (let i = 0; i < TUNING.courage; i++) {
      sim.state.hero.hurtMs = 0;
      standAt(sim, wrong);
      sim.state.hero.controlMs = 0;
      rested = sim.dispatch({ type: 'open' });
      parkHazards(sim);
    }
    expect(ofType(rested, 'teamRested')).toEqual([{ type: 'teamRested', courage: TUNING.courage }]);
    expect(sim.state.courage).toBe(TUNING.courage);
    expect(sim.state.rests).toBe(1);
    expect(sim.state.hero).toMatchObject({ x: 0, floor: 0, toFloor: 0, travelMs: 0 });
    expect(sim.state.hero.controlMs).toBeGreaterThan(0);
    expect(sim.state.hazards.some((z) => z.kind === 'bat')).toBe(false);
    expect(sim.state.phase).toBe('playing');
    // Control returns.
    tickN(sim, stepsOf(TUNING.restControlMs) + 1);
    expect(sim.state.hero.controlMs).toBe(0);
  });

  it('no timer decides anything: a long idle changes nothing but the clock and the hazards', () => {
    const sim = create(3);
    parkHazards(sim);
    tickN(sim, stepsOf(120_000));
    expect(sim.state.phase).toBe('playing');
    expect(sim.state.next).toBe(0);
    expect(sim.state.courage).toBe(TUNING.courage);
  });
});

describe('evidence', () => {
  it('one item per room touched: attempts = wrong doors + 1; hits never count', () => {
    const sim = create(10);
    parkHazards(sim);
    const wrong = doorAt(sim, 1);
    standAt(sim, wrong);
    sim.dispatch({ type: 'open' });
    parkHazards(sim);
    sim.state.hero.hurtMs = 0;
    const words = sim.state.shift[0]!.words.length;
    for (let i = 0; i < words; i++) {
      parkHazards(sim);
      openNext(sim);
    }
    const ev = evidenceOf(sim.state, STORY, 10, 1234);
    expect(ev.items).toHaveLength(1);
    expect(ev.items[0]).toMatchObject({ itemId: sim.state.shift[0]!.id, itemKind: 'sentence', attempts: 2, correctFirstTry: false, solved: true });
    expect(ev.gameId).toBe('haunted-library');
    const { results, outcome } = resultsOf(sim.state, STORY, 10, 1234);
    expect(results.score).toBe(words * 100);
    expect(outcome).toBeDefined();
    expect(nextDoorOf(sim.state)).not.toBeNull();
  });

  it('rooms the student never touched are not in the evidence', () => {
    const sim = create(10);
    expect(evidenceOf(sim.state, STORY, 10, 0).items).toEqual([]);
  });
});
