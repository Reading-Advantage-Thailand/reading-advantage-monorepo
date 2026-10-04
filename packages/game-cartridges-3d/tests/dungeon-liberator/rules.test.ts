/** The Dungeon Liberator rules of sections 2, 3, and 6 of docs/game-dungeon-liberator-3d.md. */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema, toGameResults } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { STEP_MS, createRng, distance } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  DUNGEON_LIBERATOR_EVENT_TYPES,
  GATE,
  KNIGHT_START,
  ROOM,
  ROOM_WORDS,
  TUNING,
  VILLAGER_KINDS,
  createDungeonLiberator,
  evidenceOf,
  nextVillagerOf,
  resultsOf,
  roomSentencesOf,
  scoreOf,
  sentencesOf,
  shiftOf,
  skeletonCountFor,
  skeletonSpeedFor,
} from '../../src/dungeon-liberator/core/index.js';
import { manifest } from '../../src/dungeon-liberator/manifest.js';
import { nextSteer } from '../../src/dungeon-liberator/qc/bot.js';
import { LONG_STORY, STORY, create, freeAll, ofType, parkSkeletons, stepsOf, tickN, touch, villagerAt } from './helpers.js';

describe('content', () => {
  it('builds a shift of up to 5 rooms from sentences of 3 to 7 words, in a seeded order', () => {
    const shift = shiftOf(STORY, createRng(3), TUNING.maxRooms);
    expect(shift).toHaveLength(5);
    expect(new Set(shift.map((r) => r.id)).size).toBe(5);
    shift.forEach((room, i) => {
      const sentence = STORY.sentences.find((s) => s.id === room.id)!;
      expect(room.words).toEqual(sentence.words);
      expect(room.text).toBe(sentence.text);
      expect(room.paragraph).toBe(sentence.paragraph);
      expect(room.roomId).toBe(`room-${i + 1}`);
      expect(room.words.length).toBeGreaterThanOrEqual(ROOM_WORDS.min);
      expect(room.words.length).toBeLessThanOrEqual(ROOM_WORDS.max);
      expect(room).toMatchObject({ refusals: 0, started: false, cleared: false });
    });
    expect(shiftOf(STORY, createRng(3), 5).map((r) => r.id)).toEqual(shift.map((r) => r.id));
    expect(shiftOf(STORY, createRng(4), 5).map((r) => r.id)).not.toEqual(shift.map((r) => r.id));
  });

  it('leaves out sentences longer than 7 words and uses fewer rooms when the story has fewer', () => {
    const fit = roomSentencesOf(LONG_STORY);
    expect(fit.length).toBeLessThan(LONG_STORY.sentences.length);
    expect(fit.every((s) => s.words.length <= 7)).toBe(true);
    const shift = shiftOf(LONG_STORY, createRng(1), TUNING.maxRooms);
    expect(shift).toHaveLength(Math.min(5, fit.length));
  });

  it('accepts the APK SentenceInput, and falls back to every sentence when none fits', () => {
    const input = [
      { term: 'The cat sleeps.', translation: 'x' },
      { term: 'Hi', translation: '' },
      { term: 'The dog runs fast.', translation: '' },
    ];
    expect(sentencesOf(input)).toEqual([
      { id: 's-1', text: 'The cat sleeps.', words: ['The', 'cat', 'sleeps.'], translation: 'x' },
      { id: 's-3', text: 'The dog runs fast.', words: ['The', 'dog', 'runs', 'fast.'] },
    ]);
    const sim = createDungeonLiberator(input, { seed: 1, helper: false });
    expect(sim.state.rooms).toBe(2);
    expect(sim.state.shift.map((r) => r.id).sort()).toEqual(['s-1', 's-3']);
    const tiny = createDungeonLiberator([{ term: 'Go now', translation: '' }], { seed: 1, helper: false });
    expect(tiny.state.rooms).toBe(1);
    expect(tiny.state.villagers).toHaveLength(2);
    expect(createDungeonLiberator([], { seed: 1, helper: false }).state.phase).toBe('complete');
  });

  it('the manifest is a story cartridge for A0 to A1 with the heroes, folk, monster, and vault packs', () => {
    expect(manifest).toMatchObject({
      id: 'dungeon-liberator',
      inputMode: 'practice',
      simulation: 'realtime',
      orientation: 'any',
      levels: ['Pre-A1', 'A0', 'A0+', 'A1'],
      needs: { sentences: 3 },
      packs: ['heroes', 'folk', 'dungeon-monsters', 'sunken-vault'],
      briefingKey: 'dungeonLiberator.briefing',
    });
  });
});

describe('the room', () => {
  it('starts with the Knight at the start, a villager per word, and the roomStarted event on the first tick', () => {
    const sim = create(3);
    const room = sim.state.shift[0]!;
    expect(sim.state.knight).toMatchObject({ x: KNIGHT_START.x, z: KNIGHT_START.z, bumpedMs: 0 });
    expect(sim.state.villagers.map((v) => v.word)).toEqual(room.words);
    expect(sim.state.villagers.map((v) => v.index)).toEqual(room.words.map((_, i) => i));
    for (const v of sim.state.villagers) {
      expect(VILLAGER_KINDS).toContain(v.kind);
      expect(v).toMatchObject({ following: false, refusedMs: 0, returning: false, homeX: v.x, homeZ: v.z });
      expect(v.x).toBeGreaterThanOrEqual(ROOM.minX);
      expect(v.x).toBeLessThanOrEqual(ROOM.maxX);
      expect(v.z).toBeGreaterThanOrEqual(ROOM.minZ);
      expect(v.z).toBeLessThanOrEqual(ROOM.maxZ);
      expect(distance(v, KNIGHT_START)).toBeGreaterThanOrEqual(TUNING.villagerKeepOutKnight);
      for (const o of sim.state.villagers) if (o !== v) expect(distance(v, o)).toBeGreaterThanOrEqual(TUNING.villagerSpacing);
    }
    expect(sim.state).toMatchObject({ line: [], next: 0, gateOpen: false, room: 0, rooms: 5, phase: 'playing' });
    const events = sim.tick();
    expect(ofType(events, 'roomStarted')).toHaveLength(1);
    const started = ofType(events, 'roomStarted')[0]!;
    expect(started).toMatchObject({ roomId: 'room-1', sentenceId: room.id, words: room.words });
    expect(started.villagers.map((v) => v.id)).toEqual(sim.state.villagers.map((v) => v.id));
    expect(started.skeletons.map((s) => s.id)).toEqual(sim.state.skeletons.map((s) => s.id));
    expect(ofType(sim.tick(), 'roomStarted')).toHaveLength(0);
  });

  it('skeletons: 1 in Helper mode, 2 otherwise, +1 from the third room, at most 3; speed +10% per room, at most +30%', () => {
    expect(skeletonCountFor(0, true)).toBe(1);
    expect(skeletonCountFor(0, false)).toBe(2);
    expect(skeletonCountFor(1, false)).toBe(2);
    expect(skeletonCountFor(2, true)).toBe(2);
    expect(skeletonCountFor(2, false)).toBe(3);
    expect(skeletonCountFor(4, false)).toBe(3);
    expect(skeletonSpeedFor(0)).toBeCloseTo(1.4);
    expect(skeletonSpeedFor(1)).toBeCloseTo(1.54);
    expect(skeletonSpeedFor(3)).toBeCloseTo(1.82);
    expect(skeletonSpeedFor(4)).toBeCloseTo(1.82);
    expect(create(1, true).state.skeletons).toHaveLength(1);
    const sim = create(1, false);
    expect(sim.state.skeletons).toHaveLength(2);
    for (const s of sim.state.skeletons) {
      expect(Math.hypot(s.vx, s.vz)).toBeCloseTo(1.4);
      expect(distance(s, KNIGHT_START)).toBeGreaterThanOrEqual(TUNING.skeletonKeepOutKnight);
    }
  });

  it('skeletons patrol and bounce off the walls', { timeout: 60_000 }, () => {
    const sim = create(2);
    const speed = Math.hypot(sim.state.skeletons[0]!.vx, sim.state.skeletons[0]!.vz);
    let bounced = 0;
    let last = sim.state.skeletons.map((s) => [s.vx, s.vz]);
    for (let i = 0; i < stepsOf(60_000); i++) {
      sim.tick();
      sim.state.skeletons.forEach((s, j) => {
        expect(s.x).toBeGreaterThanOrEqual(ROOM.minX + TUNING.skeletonRadius - 1e-9);
        expect(s.x).toBeLessThanOrEqual(ROOM.maxX - TUNING.skeletonRadius + 1e-9);
        expect(s.z).toBeGreaterThanOrEqual(ROOM.minZ + TUNING.skeletonRadius - 1e-9);
        expect(s.z).toBeLessThanOrEqual(ROOM.maxZ - TUNING.skeletonRadius + 1e-9);
        expect(Math.hypot(s.vx, s.vz)).toBeCloseTo(speed);
        if (s.vx !== last[j]![0] || s.vz !== last[j]![1]) bounced += 1;
      });
      last = sim.state.skeletons.map((s) => [s.vx, s.vz]);
    }
    expect(bounced).toBeGreaterThan(3);
  });
});

describe('walking', () => {
  it('a steer moves the Knight at 3.2 m/s, holds until the next steer, and is clamped to length 1 and the room', () => {
    const sim = create(1);
    parkSkeletons(sim);
    expect(sim.dispatch({ type: 'steer', x: 0, z: -1 })).toEqual([]);
    sim.tick();
    expect(sim.state.knight.z).toBeCloseTo(KNIGHT_START.z - (TUNING.knightSpeed * STEP_MS) / 1000);
    expect(sim.state.knight.facing).toBeCloseTo(180);
    const before = sim.state.knight.z;
    sim.tick();
    expect(sim.state.knight.z).toBeLessThan(before);
    sim.dispatch({ type: 'steer', x: 3, z: 4 });
    expect(Math.hypot(sim.state.steer.x, sim.state.steer.z)).toBeCloseTo(1);
    sim.dispatch({ type: 'steer', x: 0.5, z: 0 });
    const x0 = sim.state.knight.x;
    sim.tick();
    expect(sim.state.knight.x - x0).toBeCloseTo((0.5 * TUNING.knightSpeed * STEP_MS) / 1000);
    expect(sim.state.knight.facing).toBeCloseTo(90);
    sim.dispatch({ type: 'steer', x: 1, z: 0 });
    tickN(sim, stepsOf(10_000));
    expect(sim.state.knight.x).toBeCloseTo(ROOM.maxX - TUNING.knightRadius);
    sim.dispatch({ type: 'steer', x: 0, z: 0 });
    const held = { ...sim.state.knight };
    sim.tick();
    expect(sim.state.knight).toMatchObject({ x: held.x, z: held.z, facing: held.facing });
  });
});

describe('freeing villagers', () => {
  it('the villager of the next word joins the line and follows the Knight at line spacing', () => {
    const sim = create(3);
    parkSkeletons(sim);
    const first = villagerAt(sim, 0);
    const events = touch(sim, first.id);
    expect(ofType(events, 'villagerFreed')).toEqual([{ type: 'villagerFreed', id: first.id, index: 0 }]);
    expect(sim.state.line).toEqual([first.id]);
    expect(sim.state.next).toBe(1);
    expect(first.following).toBe(true);
    expect(sim.state.freed).toBe(1);
    expect(sim.state.shift[0]!.started).toBe(true);
    expect(nextVillagerOf(sim.state)).toBe(villagerAt(sim, 1));
    // Walk away: the villager follows 0.8 m behind along the path.
    sim.dispatch({ type: 'steer', x: 0, z: -1 });
    tickN(sim, stepsOf(2000));
    expect(distance(first, sim.state.knight)).toBeCloseTo(TUNING.lineSpacing, 1);
    const second = villagerAt(sim, 1);
    touch(sim, second.id);
    sim.dispatch({ type: 'steer', x: 1, z: 0 });
    tickN(sim, stepsOf(2000));
    expect(distance(first, sim.state.knight)).toBeCloseTo(TUNING.lineSpacing, 1);
    expect(distance(second, first)).toBeCloseTo(TUNING.lineSpacing, 1);
    expect(sim.state.line).toEqual([first.id, second.id]);
  });

  it('a villager out of order refuses: counts an attempt, steps back for 1.5 s, then returns to its spot', () => {
    const sim = create(3);
    parkSkeletons(sim);
    const wrong = villagerAt(sim, 2);
    const home = { x: wrong.homeX, z: wrong.homeZ };
    const events = touch(sim, wrong.id);
    expect(ofType(events, 'villagerRefused')).toEqual([{ type: 'villagerRefused', id: wrong.id }]);
    expect(ofType(events, 'villagerFreed')).toHaveLength(0);
    expect(sim.state.shift[0]!.refusals).toBe(1);
    expect(sim.state.shift[0]!.started).toBe(true);
    expect(sim.state.line).toEqual([]);
    expect(sim.state.next).toBe(0);
    expect(wrong.refusedMs).toBe(TUNING.refusedMs);
    expect(wrong.following).toBe(false);
    expect(distance(wrong, home)).toBeCloseTo(TUNING.refusedStepBack, 1);
    // Standing on the villager again while it steps back does nothing more.
    const again = tickN(sim, stepsOf(TUNING.refusedMs) - 1);
    expect(ofType(again, 'villagerRefused')).toHaveLength(0);
    expect(wrong.refusedMs).toBeGreaterThan(0);
    sim.tick();
    expect(wrong.refusedMs).toBe(0);
    expect(wrong.returning).toBe(true);
    tickN(sim, stepsOf(1000));
    expect(wrong.returning).toBe(false);
    expect(wrong.x).toBeCloseTo(home.x);
    expect(wrong.z).toBeCloseTo(home.z);
    // The Knight went elsewhere; a second refusal counts a second attempt.
    sim.state.knight.x = KNIGHT_START.x;
    sim.state.knight.z = KNIGHT_START.z;
    sim.tick();
    touch(sim, wrong.id);
    expect(sim.state.shift[0]!.refusals).toBe(2);
  });

  it('a refusal does not undo the line', () => {
    const sim = create(3);
    parkSkeletons(sim);
    touch(sim, villagerAt(sim, 0).id);
    touch(sim, villagerAt(sim, 2).id);
    expect(sim.state.line).toEqual([villagerAt(sim, 0).id]);
    expect(sim.state.next).toBe(1);
  });

  it('the whole sentence opens the gate; the Knight at the gate clears the room and the next room starts', () => {
    const sim = create(3);
    const room = sim.state.shift[0]!;
    const events = freeAll(sim);
    expect(ofType(events, 'villagerFreed').map((e) => e.index)).toEqual(room.words.map((_, i) => i));
    expect(ofType(events, 'gateOpened')).toEqual([{ type: 'gateOpened', roomId: 'room-1' }]);
    expect(sim.state.gateOpen).toBe(true);
    expect(sim.state.line).toHaveLength(room.words.length);
    expect(nextVillagerOf(sim.state)).toBeNull();
    // Not at the gate yet: nothing.
    expect(ofType(sim.tick(), 'roomCleared')).toHaveLength(0);
    sim.state.knight.x = GATE.x;
    sim.state.knight.z = GATE.z + 0.5;
    const cleared = sim.tick();
    expect(ofType(cleared, 'roomCleared')).toEqual([{ type: 'roomCleared', roomId: 'room-1', sentenceId: room.id }]);
    expect(room.cleared).toBe(true);
    expect(sim.state.roomsCleared).toBe(1);
    const started = ofType(cleared, 'roomStarted');
    expect(started).toHaveLength(1);
    expect(started[0]).toMatchObject({ roomId: 'room-2', sentenceId: sim.state.shift[1]!.id });
    expect(sim.state).toMatchObject({ room: 1, line: [], next: 0, gateOpen: false });
    expect(sim.state.knight).toMatchObject({ x: KNIGHT_START.x, z: KNIGHT_START.z });
    expect(sim.state.villagers.map((v) => v.word)).toEqual(sim.state.shift[1]!.words);
    expect(sim.state.villagers.every((v) => !v.following && !v.returning && v.refusedMs === 0)).toBe(true);
    expect(sim.state.skeletons).toHaveLength(2);
  });

  it('the third room adds a skeleton and speeds them up', () => {
    const sim = create(5);
    for (let r = 0; r < 2; r++) {
      freeAll(sim);
      sim.state.knight.x = GATE.x;
      sim.state.knight.z = GATE.z + 0.5;
      sim.tick();
    }
    expect(sim.state.room).toBe(2);
    expect(sim.state.skeletons).toHaveLength(3);
    for (const s of sim.state.skeletons) expect(Math.hypot(s.vx, s.vz)).toBeCloseTo(1.4 * 1.2);
  });
});

describe('skeletons', () => {
  it('a skeleton on the Knight bumps it back for 0.8 s and scatters the whole line; not a reading error', () => {
    const sim = create(3);
    parkSkeletons(sim);
    const a = villagerAt(sim, 0);
    const b = villagerAt(sim, 1);
    touch(sim, a.id);
    touch(sim, b.id);
    const refusals = sim.state.shift[0]!.refusals;
    const k = sim.state.knight;
    const s = sim.state.skeletons[0]!;
    s.x = k.x + 0.5;
    s.z = k.z;
    s.vx = -1.4;
    s.vz = 0;
    const events = sim.tick();
    expect(ofType(events, 'knightBumped')).toEqual([{ type: 'knightBumped', skeletonId: s.id }]);
    expect(ofType(events, 'lineScattered')).toEqual([{ type: 'lineScattered', ids: [a.id, b.id], by: 'skeleton-knight' }]);
    expect(k.bumpedMs).toBe(TUNING.bumpedMs);
    expect(sim.state.line).toEqual([]);
    expect(sim.state.next).toBe(0);
    expect(a.following).toBe(false);
    expect(a.returning).toBe(true);
    expect(sim.state.shift[0]!.refusals).toBe(refusals);
    expect(s.vx).toBeGreaterThan(0); // the skeleton walks away
    // No control while bumped: the steer is ignored, the Knight slides away from the skeleton.
    const x0 = k.x;
    sim.dispatch({ type: 'steer', x: 1, z: 0 });
    tickN(sim, stepsOf(TUNING.bumpedMs) - 1);
    expect(k.x).toBeLessThan(x0);
    expect(k.bumpedMs).toBeGreaterThan(0);
    sim.tick();
    expect(k.bumpedMs).toBe(0);
    const x1 = k.x;
    sim.tick();
    expect(k.x).toBeGreaterThan(x1);
    // The scattered villagers ran home (asserted `returning` above) and stand on their spots.
    tickN(sim, stepsOf(5000));
    expect(a.returning).toBe(false);
    expect(a.x).toBeCloseTo(a.homeX);
    expect(a.z).toBeCloseTo(a.homeZ);
  });

  it('a skeleton on the line scatters the line from that villager on; the front of the line stays', () => {
    const sim = create(3);
    parkSkeletons(sim);
    const ids = [0, 1].map((i) => villagerAt(sim, i).id);
    for (const id of ids) touch(sim, id);
    sim.dispatch({ type: 'steer', x: 0, z: -1 });
    tickN(sim, stepsOf(1500));
    expect(sim.state.line).toEqual(ids);
    expect(sim.state.gateOpen).toBe(false);
    const second = villagerAt(sim, 1);
    const s = sim.state.skeletons[0]!;
    s.x = second.x;
    s.z = second.z;
    const events = sim.tick();
    expect(ofType(events, 'lineScattered')).toEqual([{ type: 'lineScattered', ids: [ids[1]], by: 'skeleton-line' }]);
    expect(ofType(events, 'knightBumped')).toHaveLength(0);
    expect(sim.state.line).toEqual([ids[0]]);
    expect(sim.state.next).toBe(1);
    expect(sim.state.knight.bumpedMs).toBe(0);
    expect(villagerAt(sim, 0).following).toBe(true);
    expect(second.returning).toBe(true);
    expect(sim.state.shift[0]!.refusals).toBe(0);
    // The scattered villagers rejoin in order once home; the line resumes at word 2.
    parkSkeletons(sim);
    tickN(sim, stepsOf(6000));
    expect(second.returning).toBe(false);
    touch(sim, second.id);
    expect(sim.state.line).toEqual([ids[0], ids[1]]);
  });

  it('a scatter gives 1 s of grace: a touch out of order right after it is ignored, not refused', () => {
    const sim = create(3);
    parkSkeletons(sim);
    const ids = [0, 1].map((i) => villagerAt(sim, i).id);
    for (const id of ids) touch(sim, id);
    sim.dispatch({ type: 'steer', x: 0, z: -1 });
    tickN(sim, stepsOf(1500));
    const s = sim.state.skeletons[0]!;
    s.x = villagerAt(sim, 0).x;
    s.z = villagerAt(sim, 0).z;
    expect(ofType(sim.tick(), 'lineScattered')).toHaveLength(1);
    expect(sim.state.graceMs).toBe(TUNING.scatterGraceMs);
    parkSkeletons(sim);
    sim.dispatch({ type: 'steer', x: 0, z: 0 });
    // Word 2 was the target a moment ago; touching it now is not a reading error.
    const passed = touch(sim, villagerAt(sim, 2).id);
    expect(ofType(passed, 'villagerRefused')).toHaveLength(0);
    expect(sim.state.shift[0]!.refusals).toBe(0);
    expect(villagerAt(sim, 2).refusedMs).toBe(0);
    // After the grace, the same touch (entered again) is a refusal.
    sim.state.knight.x = KNIGHT_START.x;
    sim.state.knight.z = KNIGHT_START.z;
    tickN(sim, stepsOf(TUNING.scatterGraceMs));
    expect(sim.state.graceMs).toBe(0);
    expect(ofType(touch(sim, villagerAt(sim, 2).id), 'villagerRefused')).toHaveLength(1);
  });

  it('a touch counts on entering contact only: a pushed or parked Knight touches no one', () => {
    const sim = create(3);
    parkSkeletons(sim);
    const wrong = villagerAt(sim, 1);
    // Parked on the villager's spot while it steps back and returns: no second refusal.
    touch(sim, wrong.id);
    expect(sim.state.shift[0]!.refusals).toBe(1);
    const events = tickN(sim, stepsOf(TUNING.refusedMs + 1500));
    expect(ofType(events, 'villagerRefused')).toHaveLength(0);
    expect(wrong).toMatchObject({ returning: false, refusedMs: 0, contact: true });
    expect(sim.state.shift[0]!.refusals).toBe(1);
    // Step off and back on: a refusal again.
    sim.state.knight.x = KNIGHT_START.x;
    sim.state.knight.z = KNIGHT_START.z;
    sim.tick();
    expect(wrong.contact).toBe(false);
    expect(ofType(touch(sim, wrong.id), 'villagerRefused')).toHaveLength(1);
    // A bumped Knight sliding into a villager does not touch it.
    const other = villagerAt(sim, 2);
    sim.state.knight.x = KNIGHT_START.x;
    sim.state.knight.z = KNIGHT_START.z;
    sim.tick();
    sim.state.knight.bumpedMs = TUNING.bumpedMs;
    sim.state.knight.pushX = 0;
    sim.state.knight.pushZ = 0;
    const bumped = touch(sim, other.id);
    expect(ofType(bumped, 'villagerRefused')).toHaveLength(0);
    expect(other.contact).toBe(true);
    expect(sim.state.shift[0]!.refusals).toBe(2);
  });

  it('a skeleton on a villager that is not in the line does nothing', () => {
    const sim = create(3);
    parkSkeletons(sim);
    const v = villagerAt(sim, 1);
    const s = sim.state.skeletons[0]!;
    s.x = v.x;
    s.z = v.z;
    const events = sim.tick();
    expect(ofType(events, 'lineScattered')).toHaveLength(0);
    expect(v).toMatchObject({ following: false, returning: false, refusedMs: 0 });
  });

  it('with the gate open, skeletons no longer bump or scatter', () => {
    const sim = create(3);
    freeAll(sim);
    expect(sim.state.gateOpen).toBe(true);
    const k = sim.state.knight;
    const s = sim.state.skeletons[0]!;
    s.x = k.x;
    s.z = k.z;
    const events = tickN(sim, 3);
    expect(ofType(events, 'knightBumped')).toHaveLength(0);
    expect(ofType(events, 'lineScattered')).toHaveLength(0);
    expect(sim.state.line).toHaveLength(sim.state.villagers.length);
    expect(sim.state.gateOpen).toBe(true);
  });
});

describe('the shift', () => {
  it('ends after the last room with shiftComplete; nothing happens after', () => {
    const sim = create(21);
    const all = [];
    while (sim.state.phase === 'playing') {
      all.push(...freeAll(sim));
      sim.state.knight.x = GATE.x;
      sim.state.knight.z = GATE.z + 0.5;
      all.push(...sim.tick());
    }
    expect(sim.state.roomsCleared).toBe(5);
    expect(ofType(all, 'roomCleared')).toHaveLength(5);
    expect(ofType(all, 'roomStarted')).toHaveLength(5);
    expect(ofType(all, 'shiftComplete')).toEqual([{ type: 'shiftComplete', rooms: 5 }]);
    expect(all.at(-1)!.type).toBe('shiftComplete');
    expect(sim.state.shift.every((r) => r.cleared)).toBe(true);
    expect(sim.state.freed).toBe(sim.state.shift.reduce((n, r) => n + r.words.length, 0));
    expect(sim.tick()).toEqual([]);
    expect(sim.dispatch({ type: 'steer', x: 1, z: 0 })).toEqual([]);
    expect(nextSteer(sim.state)).toBeNull();
  });

  it('no lives, no defeat: 6 minutes of bumps end nothing', { timeout: 60_000 }, () => {
    const sim = create(4);
    // Walk into the room and stand there; the skeletons pass through the Knight again and again.
    sim.dispatch({ type: 'steer', x: 0, z: -1 });
    tickN(sim, stepsOf(1500));
    sim.dispatch({ type: 'steer', x: 0, z: 0 });
    const events = tickN(sim, stepsOf(6 * 60_000));
    for (const e of events) expect(DUNGEON_LIBERATOR_EVENT_TYPES).toContain(e.type);
    expect(events.some((e) => /over|lost|defeat|fail|life|lives/i.test(e.type))).toBe(false);
    expect(ofType(events, 'knightBumped').length).toBeGreaterThan(0);
    expect(sim.state.phase).toBe('playing');
    expect(sim.state.shift.every((r) => r.refusals === 0)).toBe(true);
    expect(Object.keys(sim.state)).not.toContain('lives');
  });

  it('the Knight, the villagers, and the skeletons stay in the room under random steering (property)', { timeout: 60_000 }, () => {
    for (let seed = 1; seed <= 6; seed++) {
      const sim = create(seed, seed % 2 === 0);
      const chaos = createRng(seed * 31);
      for (let step = 0; step < 900 && sim.state.phase === 'playing'; step++) {
        if (chaos.next() < 0.1) sim.dispatch({ type: 'steer', x: chaos.next() * 2 - 1, z: chaos.next() * 2 - 1 });
        const events = sim.tick();
        for (const e of events) expect(DUNGEON_LIBERATOR_EVENT_TYPES).toContain(e.type);
        const inside = (p: { x: number; z: number }) =>
          p.x >= ROOM.minX - 1e-9 && p.x <= ROOM.maxX + 1e-9 && p.z >= ROOM.minZ - 1e-9 && p.z <= ROOM.maxZ + 1e-9;
        expect(inside(sim.state.knight)).toBe(true);
        for (const v of sim.state.villagers) expect(inside(v)).toBe(true);
        for (const s of sim.state.skeletons) expect(inside(s)).toBe(true);
        expect(sim.state.line.map((id) => sim.state.villagers.find((v) => v.id === id)!.index)).toEqual(
          sim.state.line.map((_, i) => i),
        );
        expect(sim.state.next).toBe(sim.state.line.length);
      }
    }
  });
});

describe('evidence', () => {
  it('reports one sentence item per room touched: attempts = refusals + 1, first try, solved, paragraph', () => {
    const sim = create(3);
    parkSkeletons(sim);
    const room0 = sim.state.shift[0]!;
    touch(sim, villagerAt(sim, 1).id); // out of order first
    sim.state.knight.x = KNIGHT_START.x;
    sim.state.knight.z = KNIGHT_START.z;
    tickN(sim, stepsOf(3000));
    freeAll(sim);
    sim.state.knight.x = GATE.x;
    sim.state.knight.z = GATE.z + 0.5;
    sim.tick();
    const room1 = sim.state.shift[1]!;
    freeAll(sim);
    sim.state.knight.x = GATE.x;
    sim.state.knight.z = GATE.z + 0.5;
    sim.tick();
    const evidence = evidenceOf(sim.state, STORY, 3, sim.state.timeMs);
    expect(storyGameEvidenceSchema.parse(evidence)).toEqual(evidence);
    expect(evidence).toMatchObject({ gameId: 'dungeon-liberator', inputId: STORY.id, level: STORY.level, seed: 3 });
    expect(evidence.items).toEqual([
      { itemId: room0.id, itemKind: 'sentence', label: room0.text, attempts: 2, correctFirstTry: false, solved: true, paragraph: room0.paragraph },
      { itemId: room1.id, itemKind: 'sentence', label: room1.text, attempts: 1, correctFirstTry: true, solved: true, paragraph: room1.paragraph },
    ]);
    expect(evidence.practice).toEqual([room0.text]);
    const results = toGameResults(evidence, scoreOf(sim.state));
    expect(results).toMatchObject({ score: scoreOf(sim.state), correctAnswers: 2, totalAttempts: 3 });
    expect(scoreOf(sim.state)).toBe(10 * (room0.words.length + room1.words.length) + 100);
    const full = resultsOf(sim.state, STORY, 3, sim.state.timeMs);
    expect(full.results).toEqual(results);
    expect(full.outcome).toBe('complete');
  });

  it('a room with a refusal and no clear is unsolved; untouched rooms are left out; scatters never count', () => {
    const sim = create(3);
    parkSkeletons(sim);
    const room0 = sim.state.shift[0]!;
    touch(sim, villagerAt(sim, 0).id);
    const k = sim.state.knight;
    const s = sim.state.skeletons[0]!;
    s.x = k.x;
    s.z = k.z;
    sim.tick(); // bump + scatter
    expect(sim.state.line).toEqual([]);
    let evidence = evidenceOf(sim.state, STORY, 3, 1234.6);
    expect(evidence.items).toEqual([
      { itemId: room0.id, itemKind: 'sentence', label: room0.text, attempts: 1, correctFirstTry: false, solved: false, paragraph: room0.paragraph },
    ]);
    expect(evidence.durationMs).toBe(1235);
    parkSkeletons(sim);
    tickN(sim, stepsOf(TUNING.scatterGraceMs + 100));
    touch(sim, villagerAt(sim, 2).id);
    evidence = evidenceOf(sim.state, STORY, 3, 0);
    expect(evidence.items[0]).toMatchObject({ attempts: 2, correctFirstTry: false, solved: false });
    expect(evidenceOf(create(3).state, STORY, 3, 0).items).toEqual([]);
  });

  it('a played shift is a victory with 5 solved items', () => {
    const sim = create(2);
    while (sim.state.phase === 'playing') {
      freeAll(sim);
      sim.state.knight.x = GATE.x;
      sim.state.knight.z = GATE.z + 0.5;
      sim.tick();
    }
    const { evidence, results, outcome } = resultsOf(sim.state, STORY, 2, sim.state.timeMs);
    expect(outcome).toBe('victory');
    expect(evidence.items).toHaveLength(5);
    expect(evidence.items.every((i) => i.solved && i.correctFirstTry)).toBe(true);
    expect(results).toMatchObject({ correctAnswers: 5, totalAttempts: 5, accuracy: 1, score: scoreOf(sim.state) });
    expect(results.score).toBeGreaterThan(0);
  });
});
