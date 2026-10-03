/** The Realm Carver rules of sections 2, 3, and 6 of docs/game-realm-carver-3d.md. */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema, toGameResults } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { STEP_MS, createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  BOARD_SIZE,
  MONSTER_KINDS,
  REALM_CARVER_EVENT_TYPES,
  REALM_WORDS,
  START,
  TUNING,
  beaconOfNext,
  campaignOf,
  createRealmCarver,
  dirOfSteer,
  evidenceOf,
  monsterCountFor,
  monsterIntervalFor,
  realmSentencesOf,
  resultsOf,
  scoreOf,
  sentencesOf,
  stepMonster,
  wildCount,
} from '../../src/realm-carver/core/index.js';
import { manifest } from '../../src/realm-carver/manifest.js';
import type { RealmCarverEvent } from '../../src/realm-carver/core/index.js';
import { LONG_STORY, STORY, create, ofType, parkMonsters, repeat, stepCarver, tickN, walkPath } from './helpers.js';

/** Puts the beacon of word `index` on a cell. */
function place(sim: ReturnType<typeof create>, index: number, col: number, row: number): void {
  const b = sim.state.beacons.find((x) => x.index === index)!;
  b.col = col;
  b.row = row;
}

/** The straight cut up the middle column from the start: it closes on the far border. */
const CUT_UP = repeat('up', BOARD_SIZE - 1);

describe('content', () => {
  it('builds a campaign of up to 4 realms from sentences of 3 to 7 words, in a seeded order', () => {
    const campaign = campaignOf(STORY, createRng(3), TUNING.maxRealms);
    expect(campaign).toHaveLength(4);
    expect(new Set(campaign.map((r) => r.id)).size).toBe(4);
    campaign.forEach((realm, i) => {
      const sentence = STORY.sentences.find((s) => s.id === realm.id)!;
      expect(realm.words).toEqual(sentence.words);
      expect(realm.realmId).toBe(`realm-${i + 1}`);
      expect(realm.words.length).toBeGreaterThanOrEqual(REALM_WORDS.min);
      expect(realm.words.length).toBeLessThanOrEqual(REALM_WORDS.max);
      expect(realm).toMatchObject({ misses: 0, started: false, cleared: false });
    });
    expect(campaignOf(STORY, createRng(3), 4).map((r) => r.id)).toEqual(campaign.map((r) => r.id));
    expect(campaignOf(STORY, createRng(4), 4).map((r) => r.id)).not.toEqual(campaign.map((r) => r.id));
  });

  it('leaves out long sentences', () => {
    const fit = realmSentencesOf(LONG_STORY);
    expect(fit.length).toBeLessThan(LONG_STORY.sentences.length);
    expect(fit.every((s) => s.words.length <= REALM_WORDS.max)).toBe(true);
  });

  it('accepts the APK SentenceInput', () => {
    const input = [
      { term: 'The cat sleeps.', translation: 'x' },
      { term: 'Hi', translation: '' },
      { term: 'The dog runs fast.', translation: '' },
    ];
    expect(sentencesOf(input).map((s) => s.id)).toEqual(['s-1', 's-3']);
    expect(createRealmCarver(input, { seed: 1, helper: false }).state.realms).toBe(2);
    expect(createRealmCarver([], { seed: 1, helper: false }).state.phase).toBe('complete');
  });

  it('the manifest is a story cartridge for A0 to A1', () => {
    expect(manifest).toMatchObject({
      id: 'realm-carver',
      inputMode: 'story',
      simulation: 'realtime',
      levels: ['Pre-A1', 'A0', 'A0+', 'A1'],
      needs: { sentences: 3 },
      briefingKey: 'realmCarver.briefing',
    });
    expect(manifest.renderers).toEqual(['three', 'phaser']);
  });
});

describe('the realm', () => {
  it('starts with a claimed border, a wild inside, the carver at the start, and realmStarted on the first tick', () => {
    const sim = create(3);
    const s = sim.state;
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const edge = col === 0 || row === 0 || col === BOARD_SIZE - 1 || row === BOARD_SIZE - 1;
        expect(s.grid[row]![col]).toBe(edge ? 'claimed' : 'wild');
      }
    }
    expect(s.carver).toMatchObject({ col: START.col, row: START.row, dir: null, origin: null });
    expect(s).toMatchObject({ next: 0, realm: 0, realms: 4, courage: 3, maxCourage: 3, phase: 'playing', trail: [] });
    const started = ofType(sim.tick(), 'realmStarted');
    expect(started).toHaveLength(1);
    expect(started[0]).toMatchObject({ realmId: 'realm-1', sentenceId: s.shift[0]!.id, words: s.shift[0]!.words });
    expect(started[0]!.beacons.map((b) => b.id)).toEqual(s.beacons.map((b) => b.id));
    expect(ofType(sim.tick(), 'realmStarted')).toHaveLength(0);
  });

  it('shows the next word and up to three after it, in the wild, apart, each in its own row and column', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const sim = create(seed);
      const s = sim.state;
      const words = s.shift[0]!.words;
      expect(s.beacons.map((b) => b.index)).toEqual(Array.from({ length: Math.min(TUNING.window, words.length) }, (_, i) => i));
      for (const b of s.beacons) {
        expect(b.word).toBe(words[b.index]);
        expect(s.grid[b.row]![b.col]).toBe('wild');
        for (const o of s.beacons) {
          if (o === b) continue;
          expect(o.col).not.toBe(b.col);
          expect(o.row).not.toBe(b.row);
        }
      }
      expect(beaconOfNext(s)!.index).toBe(0);
    }
  });

  it('monsters: more in later realms, fewer in Helper mode, slower in Helper mode, and away from the start', () => {
    expect([0, 1, 2, 3].map((r) => monsterCountFor(r, false))).toEqual([1, 2, 2, 3]);
    expect([0, 1, 2, 3].map((r) => monsterCountFor(r, true))).toEqual([1, 1, 2, 2]);
    expect(monsterIntervalFor(0, false)).toBe(280);
    expect(monsterIntervalFor(3, false)).toBe(235);
    expect(monsterIntervalFor(0, true)).toBe(370);
    const sim = create(2);
    expect(sim.state.monsters).toHaveLength(1);
    for (const m of sim.state.monsters) {
      expect(MONSTER_KINDS).toContain(m.kind);
      expect(sim.state.grid[m.row]![m.col]).toBe('wild');
      expect(Math.max(Math.abs(m.col - START.col), Math.abs(m.row - START.row))).toBeGreaterThanOrEqual(TUNING.monsterKeepOutCarver);
    }
  });

  it('a monster bounces on the diagonal off claimed land and stays in the wild', () => {
    const grid = create(1).state.grid;
    const m = { col: 10, row: 10, dc: 1 as const, dr: 1 as const };
    stepMonster(grid, m);
    expect(m).toMatchObject({ dc: -1, dr: -1, col: 9, row: 9 }); // the corner turns both
    const wall = { col: 10, row: 5, dc: 1 as const, dr: 1 as const };
    stepMonster(grid, wall);
    expect(wall).toMatchObject({ dc: -1, dr: 1, col: 9, row: 6 }); // a side wall turns one axis
    const sim = create(5);
    for (let i = 0; i < 600; i++) {
      sim.tick();
      for (const x of sim.state.monsters) {
        expect(x.col).toBeGreaterThanOrEqual(1);
        expect(x.col).toBeLessThanOrEqual(BOARD_SIZE - 2);
        expect(x.row).toBeGreaterThanOrEqual(1);
        expect(x.row).toBeLessThanOrEqual(BOARD_SIZE - 2);
      }
    }
  });
});

describe('carving', () => {
  it('a stick asks for one direction: the stronger axis, vertical on a tie, nothing inside the dead zone', () => {
    expect(dirOfSteer(0, -1)).toBe('up');
    expect(dirOfSteer(0.2, 0.9)).toBe('down');
    expect(dirOfSteer(-0.9, 0.2)).toBe('left');
    expect(dirOfSteer(0.8, 0)).toBe('right');
    expect(dirOfSteer(0.5, 0.5)).toBe('down');
    expect(dirOfSteer(0.1, 0.1)).toBeNull();
  });

  it('the carver steps one cell per 150 ms, holds its direction until the next steer, and stays on the board', () => {
    const sim = create(1);
    parkMonsters(sim);
    sim.dispatch({ type: 'steer', x: 0, z: -1 });
    expect(sim.state.carver.dir).toBe('up');
    tickN(sim, 1);
    expect(sim.state.carver.row).toBe(START.row - 1);
    tickN(sim, 4);
    expect(sim.state.carver.row).toBe(START.row - 1);
    tickN(sim, 1);
    expect(sim.state.carver.row).toBe(START.row - 2);
    expect(TUNING.carverMs / STEP_MS).toBeCloseTo(4.5);
    sim.dispatch({ type: 'steer', x: 1, z: 0 });
    tickN(sim, 5);
    sim.dispatch({ type: 'steer', x: Number.NaN, z: 0 });
    expect(sim.state.steer).toEqual({ x: 0, z: 0 });
    expect(sim.state.carver.dir).toBeNull();
    sim.state.trail.length = 0;
    const edge = create(1);
    edge.dispatch({ type: 'steer', x: 0, z: 1 });
    tickN(edge, 30);
    expect(edge.state.carver.row).toBe(BOARD_SIZE - 1);
  });

  it('leaving claimed land starts a trail from the border cell; the carver cannot cross its own trail', () => {
    const sim = create(1);
    parkMonsters(sim);
    walkPath(sim, ['up', 'up', 'left', 'down']);
    expect(sim.state.carver.origin).toEqual({ col: START.col, row: START.row });
    expect(sim.state.trail).toEqual([
      { col: 5, row: 10 },
      { col: 5, row: 9 },
      { col: 4, row: 9 },
      { col: 4, row: 10 },
    ]);
    expect(sim.state.grid[9]![5]).toBe('trail');
    // Right would cross the trail at (5, 10): the carver does not move.
    sim.dispatch({ type: 'steer', x: 1, z: 0 });
    tickN(sim, 12);
    expect(sim.state.carver).toMatchObject({ col: 4, row: 10 });
  });

  it('closing a loop claims the trail and every part of the wild that no monster reaches; the monster side stays wild', () => {
    const sim = create(1);
    parkMonsters(sim); // monsters wait in the top left corner
    sim.tick();
    const events = walkPath(sim, CUT_UP);
    const claimed = ofType(events, 'landClaimed');
    expect(claimed).toHaveLength(1);
    const s = sim.state;
    expect(s.trail).toEqual([]);
    expect(s.carver.origin).toBeNull();
    // The cut is column 5; the right part is empty of monsters and is claimed; the left stays wild.
    for (let row = 1; row < BOARD_SIZE - 1; row++) {
      expect(s.grid[row]![5]).toBe('claimed');
      expect(s.grid[row]![8]).toBe('claimed');
      expect(s.grid[row]![2]).toBe('wild');
    }
    expect(claimed[0]!.cells.length).toBe(10 + 10 * 5);
    expect(s.carver).toMatchObject({ col: 5, row: 0 });
  });

  it('a loop that holds a monster on both sides claims only the trail', () => {
    const sim = create(1);
    parkMonsters(sim);
    sim.tick();
    sim.state.monsters.push({ id: 'm9', kind: 'slime', col: 9, row: 9, dc: 1, dr: 1, waitMs: 1e9 });
    const before = wildCount(sim.state.grid);
    walkPath(sim, CUT_UP);
    expect(wildCount(sim.state.grid)).toBe(before - 10);
  });
});

describe('words', () => {
  it('carving the beacon of the next word wins it: it leaves the wild and the next beacon appears', () => {
    const sim = create(2);
    parkMonsters(sim);
    sim.tick();
    place(sim, 0, 5, 5); // on the cut
    const s = sim.state;
    const first = s.beacons.find((b) => b.index === 0)!.id;
    const words = s.shift[0]!.words;
    for (let i = 1; i < s.beacons.length; i++) place(sim, i, 2 + i, 2 + i); // keep the others out of the cut
    const events = walkPath(sim, CUT_UP);
    expect(ofType(events, 'wordCarved')).toEqual([{ type: 'wordCarved', id: first, index: 0 }]);
    expect(s.next).toBe(1);
    expect(s.carved).toBe(1);
    expect(s.shift[0]).toMatchObject({ started: true, misses: 0, cleared: false });
    expect(s.beacons.some((b) => b.id === first)).toBe(false);
    expect(s.courage).toBe(3);
    // The window slides: the beacons now show words 1 to 4 (when the sentence has so many).
    expect(s.beacons.map((b) => b.index).sort()).toEqual(
      Array.from({ length: Math.min(TUNING.window, words.length - 1) }, (_, i) => i + 1),
    );
    if (words.length > TUNING.window) expect(ofType(events, 'beaconAppeared')).toHaveLength(1);
    for (const b of s.beacons) expect(s.grid[b.row]![b.col]).toBe('wild');
  });

  it('a beacon with the same word as the next one counts and trades places with it', () => {
    const sim = create(2);
    parkMonsters(sim);
    sim.tick();
    const s = sim.state;
    const spare = s.beacons.find((b) => b.index === 1)!;
    spare.word = s.shift[0]!.words[0]!; // the same word as the next
    place(sim, 0, 2, 2);
    place(sim, 1, 5, 5);
    for (let i = 2; i < s.beacons.length; i++) place(sim, i, 2 + i, 2 + i);
    const events = walkPath(sim, CUT_UP);
    expect(ofType(events, 'wordCarved')).toEqual([{ type: 'wordCarved', id: spare.id, index: 0 }]);
    expect(ofType(events, 'wordMissed')).toHaveLength(0);
    expect(s.next).toBe(1);
    expect(s.beacons.find((b) => b.index === 1)).toBeTruthy();
    expect(s.beacons.filter((b) => b.index === 0)).toHaveLength(0);
  });

  it('carving only other words is a miss: a reading attempt, one courage, the words return to the wild', () => {
    const sim = create(2);
    parkMonsters(sim);
    sim.tick();
    const s = sim.state;
    place(sim, 0, 2, 2); // left, where the monsters are: stays wild
    place(sim, 1, 5, 5); // on the cut
    for (let i = 2; i < s.beacons.length; i++) place(sim, i, 2, 3 + i); // left too
    const wrong = s.beacons.find((b) => b.index === 1)!.id;
    const events = walkPath(sim, CUT_UP);
    expect(ofType(events, 'wordMissed')).toEqual([{ type: 'wordMissed', id: wrong, index: 1 }]);
    expect(ofType(events, 'beaconMoved').map((e) => e.id)).toEqual([wrong]);
    expect(s.next).toBe(0);
    expect(s.courage).toBe(2);
    expect(s.shift[0]).toMatchObject({ started: true, misses: 1 });
    const moved = s.beacons.find((b) => b.id === wrong)!;
    expect(s.grid[moved.row]![moved.col]).toBe('wild');
    expect(s.phase).toBe('playing');
  });

  it('the whole sentence clears the realm; the next realm has a fresh board, full courage, and monsters', () => {
    const sim = create(4);
    parkMonsters(sim);
    sim.tick();
    const s = sim.state;
    const n = s.shift[0]!.words.length;
    const cleared: RealmCarverEvent[] = [];
    for (let i = 0; i < n; i++) {
      // Word i: its beacon on the cut up the middle column, the other beacons on the left.
      s.carver.col = START.col;
      s.carver.row = START.row;
      for (let row = 1; row < BOARD_SIZE - 1; row++) for (let col = 1; col < BOARD_SIZE - 1; col++) s.grid[row]![col] = 'wild';
      s.beacons.forEach((b, k) => {
        const onCut = b.index === s.next;
        b.col = onCut ? 5 : 1 + (k % 3);
        b.row = onCut ? 6 : 2 + k * 2;
      });
      parkMonsters(sim);
      cleared.push(...ofType(walkPath(sim, CUT_UP), 'realmCleared'));
      expect(s.next).toBe(s.realm === 0 ? i + 1 : 0);
    }
    expect(cleared).toHaveLength(1);
    expect(s.shift[0]).toMatchObject({ cleared: true, misses: 0 });
    expect(s.realm).toBe(1);
    expect(s.realmsCleared).toBe(1);
    expect(s.carved).toBe(n);
    expect(s.next).toBe(0);
    expect(s.courage).toBe(3);
    expect(s.trail).toEqual([]);
    expect(wildCount(s.grid)).toBe((BOARD_SIZE - 2) ** 2);
    expect(s.monsters).toHaveLength(2);
    expect(s.carver).toMatchObject({ col: START.col, row: START.row });
  });
});

describe('setbacks', () => {
  it('a monster on the trail fades it and sends the carver back to where it left: one courage, never a reading error', () => {
    const sim = create(1);
    parkMonsters(sim);
    sim.tick();
    walkPath(sim, ['up', 'up']);
    const m = sim.state.monsters[0]!;
    Object.assign(m, { col: 4, row: 8, dc: 1, dr: 1, waitMs: 0.001 });
    const events = tickN(sim, 1);
    expect(ofType(events, 'setback')).toEqual([{ type: 'setback', monsterId: m.id, cause: 'monster-trail' }]);
    const s = sim.state;
    expect(s.trail).toEqual([]);
    expect(s.grid[9]![5]).toBe('wild');
    expect(s.grid[10]![5]).toBe('wild');
    expect(s.carver).toMatchObject({ col: START.col, row: START.row, origin: null });
    expect(s.courage).toBe(2);
    expect(s.setbacks).toBe(1);
    expect(s.shift[0]!.misses).toBe(0);
    // The carver waits a moment before it may step again.
    sim.dispatch({ type: 'steer', x: 0, z: -1 });
    tickN(sim, 3);
    expect(s.carver.row).toBe(START.row);
  });

  it('the carver walking into a monster is a setback too', () => {
    const sim = create(1);
    parkMonsters(sim);
    sim.tick();
    const m = sim.state.monsters[0]!;
    Object.assign(m, { col: 5, row: 10, waitMs: 1e9 });
    sim.dispatch({ type: 'steer', x: 0, z: -1 });
    const events = tickN(sim, 1);
    expect(ofType(events, 'setback')).toEqual([{ type: 'setback', monsterId: m.id, cause: 'monster-carver' }]);
    expect(sim.state.courage).toBe(2);
    expect(sim.state.carver).toMatchObject({ col: START.col, row: START.row });
  });

  it('courage at zero is a rest, not a game over: courage is full again and the carver starts over', () => {
    const sim = create(1);
    parkMonsters(sim);
    sim.tick();
    let rested = 0;
    for (let i = 0; i < 3; i++) {
      stepCarver(sim, 'up');
      const m = sim.state.monsters[0]!;
      Object.assign(m, { col: 4, row: 9, dc: 1, dr: 1, waitMs: 0.001 });
      rested += ofType(tickN(sim, 1), 'rested').length;
      tickN(sim, 20);
    }
    expect(rested).toBe(1);
    expect(sim.state.courage).toBe(3);
    expect(sim.state.phase).toBe('playing');
    expect(sim.state.setbacks).toBe(3);
    expect(sim.state.carver).toMatchObject({ col: START.col, row: START.row });
  });

  it('three misses are a rest too', () => {
    const sim = create(2);
    parkMonsters(sim);
    sim.tick();
    const s = sim.state;
    let rested = 0;
    for (let i = 0; i < 3; i++) {
      s.carver.col = START.col;
      s.carver.row = START.row;
      for (let row = 1; row < BOARD_SIZE - 1; row++) for (let col = 1; col < BOARD_SIZE - 1; col++) s.grid[row]![col] = 'wild';
      // The next word (index 0) waits on the left, with the monsters; word 1 is on the cut.
      s.beacons.forEach((b, k) => {
        b.col = b.index === 1 ? 5 : 1 + (k % 3);
        b.row = b.index === 1 ? 6 : 2 + k * 2;
      });
      rested += ofType(walkPath(sim, CUT_UP), 'rested').length;
    }
    expect(s.shift[0]!.misses).toBe(3);
    expect(rested).toBe(1);
    expect(s.courage).toBe(3);
    expect(s.phase).toBe('playing');
    expect(s.carver).toMatchObject({ col: START.col, row: START.row });
  });
});

describe('the wild grows back', () => {
  it('when too little of it is left, the board is wild again and the carver stands on the border', () => {
    const sim = create(1);
    parkMonsters(sim);
    sim.tick();
    const s = sim.state;
    // Claim most of the wild by hand, leaving the left strip (the monsters' corner) and the cut.
    for (let row = 1; row < BOARD_SIZE - 1; row++) for (let col = 2; col < BOARD_SIZE - 1; col++) if (col !== 5) s.grid[row]![col] = 'claimed';
    for (let row = 1; row < BOARD_SIZE - 1; row++) s.grid[row]![5] = 'wild';
    place(sim, 0, 5, 5);
    const events = walkPath(sim, CUT_UP);
    expect(ofType(events, 'regrown')).toHaveLength(1);
    expect(wildCount(s.grid)).toBe((BOARD_SIZE - 2) ** 2);
    expect(s.carver.col === 0 || s.carver.row === 0 || s.carver.col === BOARD_SIZE - 1 || s.carver.row === BOARD_SIZE - 1).toBe(true);
    for (const b of s.beacons) expect(s.grid[b.row]![b.col]).toBe('wild');
  });
});

describe('evidence and results', () => {
  it('one sentence item per realm touched; attempts = misses + 1; score = 10 per word + 50 per realm; setbacks never count', () => {
    const sim = create(2);
    const s = sim.state;
    expect(evidenceOf(s, STORY, 2, 0).items).toEqual([]);
    s.shift[0]!.started = true;
    s.shift[0]!.misses = 2;
    s.shift[0]!.cleared = true;
    s.shift[1]!.started = true;
    s.carved = 5;
    s.realmsCleared = 1;
    s.setbacks = 9;
    const evidence = evidenceOf(s, STORY, 2, 12_345.6);
    expect(storyGameEvidenceSchema.parse(evidence)).toEqual(evidence);
    expect(evidence).toMatchObject({ gameId: 'realm-carver', storyId: STORY.id, level: STORY.level, seed: 2, durationMs: 12_346 });
    expect(evidence.items.map((i) => [i.itemId, i.attempts, i.correctFirstTry, i.solved])).toEqual([
      [s.shift[0]!.id, 3, false, true],
      [s.shift[1]!.id, 1, false, false],
    ]);
    expect(scoreOf(s)).toBe(5 * 10 + 50);
    const out = resultsOf(s, STORY, 2, 1000);
    expect(out.results).toEqual(toGameResults(out.evidence, 100));
    expect(out.outcome).toBeDefined();
  });

  it('every event type is listed', () => {
    expect(new Set(REALM_CARVER_EVENT_TYPES).size).toBe(11);
  });
});
