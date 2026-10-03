/** The Storm Castle Tower rules of sections 2, 3, and 6 of docs/game-storm-castle-tower-3d.md. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema, toGameResults } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { STEP_MS, createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  COLUMNS,
  SCORE,
  START,
  STORM_CASTLE_TOWER_EVENT_TYPES,
  TOWER_WORDS,
  TUNING,
  bareWord,
  createStormCastleTower,
  distractorsOf,
  evidenceOf,
  hazardsThreaten,
  resultsOf,
  rightWindowsOf,
  scoreOf,
  sentencesOf,
  shiftOf,
  summitRowFor,
  towerSentencesOf,
  windowRowFor,
  wordKey,
} from '../../src/storm-castle-tower/core/index.js';
import { LONG_STORY, STORY, buildSentence, calm, clearTower, create, ofType, openRight, standOn, stepsOf, tickN, wrongWindow } from './helpers.js';

describe('content', () => {
  it('builds a climb of up to 4 towers from sentences of 3 to 7 words, in a seeded order', () => {
    const climb = shiftOf(STORY, createRng(3), TUNING.maxTowers);
    expect(climb).toHaveLength(4);
    expect(new Set(climb.map((r) => r.id)).size).toBe(4);
    climb.forEach((tower, i) => {
      const sentence = STORY.sentences.find((s) => s.id === tower.id)!;
      expect(tower.words).toEqual(sentence.words);
      expect(tower.towerId).toBe(`tower-${i + 1}`);
      expect(tower.words.length).toBeGreaterThanOrEqual(TOWER_WORDS.min);
      expect(tower.words.length).toBeLessThanOrEqual(TOWER_WORDS.max);
      expect(tower).toMatchObject({ refusals: 0, started: false, cleared: false });
    });
    expect(shiftOf(STORY, createRng(3), 4).map((r) => r.id)).toEqual(climb.map((r) => r.id));
    expect(shiftOf(STORY, createRng(4), 4).map((r) => r.id)).not.toEqual(climb.map((r) => r.id));
  });

  it('leaves out long sentences', () => {
    const fit = towerSentencesOf(LONG_STORY);
    expect(fit.length).toBeLessThan(LONG_STORY.sentences.length);
    expect(fit.every((s) => s.words.length <= 7)).toBe(true);
  });

  it('accepts the APK SentenceInput', () => {
    const input = [
      { term: 'The cat sat down.', translation: 'a' },
      { term: 'Go', translation: 'b' },
      { term: 'A dog can run fast.', translation: '' },
    ];
    expect(sentencesOf(input).map((s) => s.id)).toEqual(['s-1', 's-3']);
    const sim = createStormCastleTower(input, { seed: 1, helper: false });
    expect(sim.state.towers).toBe(2);
  });

  it('strips punctuation from window words and picks other words as decoys', () => {
    expect(bareWord('home.')).toBe('home');
    expect(bareWord('...')).toBe('...');
    expect(wordKey('Brave,')).toBe('brave');
    const out = distractorsOf(['a', 'b', 'c'], ['d', 'e', 'a'], 'a', createRng(1), 4);
    expect(out).toHaveLength(4);
    expect(out).not.toContain('a');
    expect(new Set(out).size).toBe(4);
  });

  it('a story with no sentences is complete at once', () => {
    const sim = createStormCastleTower([], { seed: 1, helper: false });
    expect(sim.state.phase).toBe('complete');
    expect(sim.tick()).toEqual([]);
  });
});

describe('start', () => {
  it('the first tick tells the tower and the first windows', () => {
    const sim = create();
    const events = sim.tick();
    expect(events.map((e) => e.type)).toEqual(['towerStarted', 'windowsPlaced']);
    expect(sim.state.climber).toMatchObject({ col: START.col, row: START.row });
    expect(sim.state.courage).toBe(TUNING.courage);
    const tower = sim.state.shift[0]!;
    expect(ofType(events, 'towerStarted')[0]).toMatchObject({ towerId: 'tower-1', sentenceId: tower.id, words: tower.words, summitRow: summitRowFor(tower.words.length) });
  });

  it('a row holds the next word and 2 other words in 3 different columns (1 other word in Helper mode)', () => {
    for (const helper of [false, true]) {
      const sim = create(5, helper);
      sim.tick();
      const word = sim.state.shift[0]!.words[0]!;
      const windows = sim.state.windows;
      expect(windows).toHaveLength(helper ? TUNING.helperDecoys + 1 : TUNING.decoys + 1);
      expect(new Set(windows.map((w) => w.col)).size).toBe(windows.length);
      expect(windows.every((w) => w.row === windowRowFor(0) && w.col >= 0 && w.col < COLUMNS)).toBe(true);
      expect(rightWindowsOf(sim.state).map((w) => w.word)).toEqual([bareWord(word)]);
      expect(windows.filter((w) => w.correct)).toHaveLength(1);
      expect(new Set(windows.map((w) => wordKey(w.word))).size).toBe(windows.length);
      // Columns are in order, so the look gives no hint.
      expect(windows.map((w) => w.col)).toEqual([...windows.map((w) => w.col)].sort((a, b) => a - b));
    }
  });
});

describe('climbing', () => {
  it('moves one cell per 240 ms in the held direction (up is z < 0)', () => {
    const sim = create();
    calm(sim);
    sim.tick();
    sim.dispatch({ type: 'steer', x: 0, z: -1 });
    sim.tick();
    expect(sim.state.climber.row).toBe(1);
    expect(tickN(sim, stepsOf(TUNING.moveMs) - 2)).toEqual([]);
    // The next row is the window row; the climber cannot pass it before the window opens.
    sim.state.climber.col = sim.state.windows.every((w) => w.col !== 0) ? 0 : 3;
    tickN(sim, 3);
    expect(sim.state.climber.row).toBeLessThanOrEqual(windowRowFor(0));
    tickN(sim, 60);
    expect(sim.state.climber.row).toBeLessThanOrEqual(windowRowFor(0));
    sim.dispatch({ type: 'steer', x: 1, z: 0 });
    const col = sim.state.climber.col;
    tickN(sim, 12);
    expect(sim.state.climber.col).toBeGreaterThanOrEqual(col);
    expect(sim.state.climber.col).toBeLessThan(COLUMNS);
  });

  it('stops at the side walls, below at the floor, and ignores a bad steer', () => {
    const sim = create();
    calm(sim);
    sim.tick();
    sim.dispatch({ type: 'steer', x: -1, z: 0 });
    tickN(sim, 60);
    expect(sim.state.climber.col).toBe(0);
    sim.dispatch({ type: 'steer', x: 0, z: 1 });
    tickN(sim, 30);
    expect(sim.state.climber.row).toBe(0);
    sim.dispatch({ type: 'steer', x: Number.NaN, z: Number.POSITIVE_INFINITY });
    expect(sim.state.steer.x).toBe(0);
    sim.dispatch({ type: 'steer', x: 5, z: 0 });
    expect(Math.hypot(sim.state.steer.x, sim.state.steer.z)).toBeCloseTo(1);
    sim.dispatch({ type: 'steer', x: 0.1, z: -0.1 });
    const before = { ...sim.state.climber };
    tickN(sim, 20);
    expect(sim.state.climber.row).toBe(before.row);
  });
});

describe('windows', () => {
  it('the right window opens, joins the sentence, and the next row appears two rows higher', () => {
    const sim = create();
    calm(sim);
    sim.tick();
    const right = rightWindowsOf(sim.state)[0]!;
    const events = openRight(sim);
    expect(ofType(events, 'windowOpened')).toEqual([{ type: 'windowOpened', id: right.id, index: 0 }]);
    expect(sim.state).toMatchObject({ next: 1, collected: 1, floorRow: right.row, windowRow: windowRowFor(1) });
    expect(sim.state.checkpoint).toEqual({ col: right.col, row: right.row });
    expect(sim.state.lit).toEqual([{ word: right.word, col: right.col, row: right.row }]);
    expect(ofType(events, 'windowsPlaced')[0]!.row).toBe(windowRowFor(1));
    expect(sim.state.shift[0]!.started).toBe(true);
    expect(sim.state.courage).toBe(TUNING.courage);
  });

  it('a wrong window shuts: a reading attempt, one courage, and it counts once', () => {
    const sim = create();
    calm(sim);
    sim.tick();
    const wrong = wrongWindow(sim);
    const events = standOn(sim, wrong.col, wrong.row);
    expect(ofType(events, 'windowShut')).toEqual([{ type: 'windowShut', id: wrong.id }]);
    expect(ofType(events, 'courageChanged')).toEqual([{ type: 'courageChanged', courage: TUNING.courage - 1 }]);
    expect(sim.state.shift[0]).toMatchObject({ refusals: 1, started: true });
    expect(sim.state.next).toBe(0);
    expect(sim.state.windows.find((w) => w.id === wrong.id)!.spent).toBe(true);
    // Standing on it again, or climbing over it, is not a second attempt.
    expect(ofType(standOn(sim, wrong.col, wrong.row - 1), 'windowShut')).toHaveLength(0);
    expect(ofType(standOn(sim, wrong.col, wrong.row), 'windowShut')).toHaveLength(0);
    expect(sim.state.shift[0]!.refusals).toBe(1);
  });

  it('a window opens only when the climber enters it', () => {
    const sim = create();
    calm(sim);
    sim.tick();
    const right = rightWindowsOf(sim.state)[0]!;
    // The window is below the climber's reach: it does not open from a distance.
    expect(ofType(standOn(sim, right.col, right.row - 1), 'windowOpened')).toHaveLength(0);
    expect(ofType(sim.tick(), 'windowOpened')).toHaveLength(0);
    expect(ofType(standOn(sim, right.col, right.row), 'windowOpened')).toHaveLength(1);
  });
});

describe('hazards', () => {
  it('the first hazard falls after the grace time, then one every 1.8 s, never twice in a column', () => {
    const sim = create();
    const events = tickN(sim, stepsOf(TUNING.graceMs + 5 * TUNING.intervalMs));
    const fell = ofType(events, 'hazardFell');
    expect(fell.length).toBeGreaterThanOrEqual(5);
    expect(fell[0]!.hazard.y).toBe(START.row + TUNING.dropHeight);
    fell.slice(1).forEach((e, i) => expect(e.hazard.col).not.toBe(fell[i]!.hazard.col));
    expect(new Set(fell.map((e) => e.hazard.type))).toEqual(new Set(['oil', 'rock']));
  });

  it('a hazard in the climber column hits: one row down, one courage, protected, never a reading error', () => {
    const sim = create();
    calm(sim);
    sim.tick();
    standOn(sim, 2, 1);
    sim.state.floorRow = 0;
    sim.state.hazards.push({ id: 'h-test', type: 'rock', col: 2, y: 1.6 });
    const events = tickN(sim, 10);
    expect(ofType(events, 'climberHit')).toEqual([{ type: 'climberHit', hazardId: 'h-test' }]);
    expect(sim.state.climber.row).toBe(0);
    expect(sim.state.courage).toBe(TUNING.courage - 1);
    expect(sim.state.climber.protectMs).toBeGreaterThan(0);
    expect(sim.state.hits).toBe(1);
    expect(sim.state.hazards).toEqual([]);
    expect(sim.state.shift[0]!.refusals).toBe(0);
    expect(sim.state.shift[0]!.started).toBe(false);
  });

  it('a hazard in another column, or while protected, does not hit; the climber never falls below the last open window', () => {
    const sim = create();
    calm(sim);
    sim.tick();
    standOn(sim, 1, 0);
    sim.state.hazards.push({ id: 'a', type: 'oil', col: 3, y: 0.3 });
    expect(ofType(tickN(sim, 5), 'climberHit')).toHaveLength(0);
    sim.state.climber.protectMs = 1000;
    sim.state.hazards.push({ id: 'b', type: 'oil', col: 1, y: 0.3 });
    expect(ofType(tickN(sim, 5), 'climberHit')).toHaveLength(0);
    // After the first window the floor is that row.
    openRight(sim);
    const row = sim.state.climber.row;
    sim.state.climber.protectMs = 0;
    sim.state.hazards.push({ id: 'c', type: 'rock', col: sim.state.climber.col, y: row + 0.3 });
    tickN(sim, 5);
    expect(sim.state.climber.row).toBe(row);
    expect(sim.state.courage).toBe(TUNING.courage - 1);
  });

  it('hazardsThreaten reads the column and the rows above the cell', () => {
    const hazards = [{ id: 'h', type: 'oil' as const, col: 2, y: 4 }];
    expect(hazardsThreaten(hazards, 2, 1)).toBe(true);
    expect(hazardsThreaten(hazards, 2, 3)).toBe(true);
    expect(hazardsThreaten(hazards, 2, 5)).toBe(false);
    expect(hazardsThreaten(hazards, 1, 1)).toBe(false);
  });

  it('Helper mode drops hazards slower and less often', () => {
    const normal = ofType(tickN(create(3, false), stepsOf(20_000)), 'hazardFell').length;
    const helper = ofType(tickN(create(3, true), stepsOf(20_000)), 'hazardFell').length;
    expect(helper).toBeLessThan(normal);
  });
});

describe('rests', () => {
  it('three hazard hits: the team rests at the last open window with full courage; there is no game over', () => {
    const sim = create();
    calm(sim);
    sim.tick();
    openRight(sim);
    const checkpoint = { ...sim.state.checkpoint };
    standOn(sim, checkpoint.col, checkpoint.row);
    let rested = false;
    for (let i = 0; i < 3; i++) {
      sim.state.climber.protectMs = 0;
      sim.state.hazards.push({ id: `x${i}`, type: 'rock', col: sim.state.climber.col, y: sim.state.climber.row + 0.2 });
      const events = tickN(sim, 3);
      rested ||= ofType(events, 'teamRested').length > 0;
    }
    expect(rested).toBe(true);
    expect(sim.state.rests).toBe(1);
    expect(sim.state.courage).toBe(TUNING.courage);
    expect(sim.state.climber).toMatchObject({ col: checkpoint.col, row: checkpoint.row });
    expect(sim.state.climber.restMs).toBeGreaterThan(0);
    expect(sim.state.hazards).toEqual([]);
    expect(sim.state.phase).toBe('playing');
    // No control while resting: a steer does nothing until the rest ends.
    sim.dispatch({ type: 'steer', x: 1, z: 0 });
    tickN(sim, 5);
    expect(sim.state.climber.col).toBe(checkpoint.col);
    tickN(sim, stepsOf(TUNING.restMs) + 2);
    expect(sim.state.climber.restMs).toBe(0);
  });

  it('three wrong windows rest the team too, and the tower goes on', () => {
    const sim = create(11);
    calm(sim);
    sim.tick();
    const events: ReturnType<typeof tickN> = [];
    // Wrong windows placed by hand on the window row until courage runs out.
    sim.state.windows = [];
    for (let i = 0; i < 3; i++) {
      sim.state.windows.push({ id: `bad${i}`, word: `bad${i}`, col: i, row: sim.state.windowRow, correct: false, spent: false, contact: false });
      events.push(...standOn(sim, i, sim.state.windowRow));
    }
    expect(ofType(events, 'windowShut')).toHaveLength(3);
    expect(ofType(events, 'teamRested')).toHaveLength(1);
    expect(sim.state.courage).toBe(TUNING.courage);
    expect(sim.state.shift[0]!.refusals).toBe(3);
    expect(sim.state.phase).toBe('playing');
  });
});

describe('the top', () => {
  it('the last window opens the top, stops the hazards, and the tower is cleared at the top', () => {
    const sim = create();
    sim.tick();
    const tower = sim.state.shift[0]!;
    const events = buildSentence(sim);
    expect(ofType(events, 'windowOpened')).toHaveLength(tower.words.length);
    expect(ofType(events, 'summitOpened')).toHaveLength(1);
    expect(sim.state).toMatchObject({ summitOpen: true, windows: [], hazards: [], next: tower.words.length });
    expect(ofType(tickN(sim, stepsOf(10_000)), 'hazardFell')).toHaveLength(0);
    // The top is reachable only in the open state, and only after the climber stands there.
    expect(tower.cleared).toBe(false);
    const cleared = standOn(sim, sim.state.climber.col, sim.state.summitRow);
    expect(ofType(cleared, 'towerCleared')).toEqual([{ type: 'towerCleared', towerId: 'tower-1', sentenceId: tower.id }]);
    expect(tower.cleared).toBe(true);
    expect(ofType(cleared, 'towerStarted')[0]).toMatchObject({ towerId: 'tower-2' });
    expect(sim.state).toMatchObject({ tower: 1, next: 0, summitOpen: false, courage: TUNING.courage, towersCleared: 1 });
    expect(sim.state.climber).toMatchObject({ col: START.col, row: START.row });
  });

  it('the last tower ends the climb with climbComplete', () => {
    const sim = create(2, false, LONG_STORY);
    sim.tick();
    const events: ReturnType<typeof tickN> = [];
    while (sim.state.phase === 'playing') events.push(...clearTower(sim));
    expect(sim.state.phase).toBe('complete');
    expect(ofType(events, 'towerCleared')).toHaveLength(sim.state.towers);
    expect(ofType(events, 'climbComplete')).toEqual([{ type: 'climbComplete', towers: sim.state.towers }]);
    expect(sim.tick()).toEqual([]);
    expect(sim.dispatch({ type: 'steer', x: 1, z: 0 })).toEqual([]);
  });
});

describe('evidence and results', () => {
  it('one sentence item per tower the student touched: attempts = wrong windows + 1; hits never count', () => {
    const sim = create(4);
    calm(sim);
    sim.tick();
    expect(evidenceOf(sim.state, STORY, 4, 0).items).toEqual([]);
    const wrong = wrongWindow(sim);
    standOn(sim, wrong.col, wrong.row);
    sim.state.hits += 5;
    clearTower(sim);
    const evidence = evidenceOf(sim.state, STORY, 4, 12_345.6);
    expect(storyGameEvidenceSchema.safeParse(evidence).success).toBe(true);
    expect(evidence).toMatchObject({ kind: 'story-game', gameId: 'storm-castle-tower', storyId: STORY.id, seed: 4, durationMs: 12_346 });
    expect(evidence.items).toHaveLength(1);
    const tower = sim.state.shift[0]!;
    expect(evidence.items[0]).toMatchObject({ itemId: tower.id, itemKind: 'sentence', label: tower.text, attempts: 2, correctFirstTry: false, solved: true });
    expect(evidence.practice.length).toBeGreaterThan(0);
  });

  it('an unfinished tower is an unsolved item; the score is 100 per right window', () => {
    const sim = create(4);
    calm(sim);
    sim.tick();
    openRight(sim);
    openRight(sim);
    const evidence = evidenceOf(sim.state, STORY, 4, 1000);
    expect(evidence.items[0]).toMatchObject({ solved: false, attempts: 1, correctFirstTry: false });
    expect(scoreOf(sim.state)).toBe(2 * SCORE.word);
    const done = resultsOf(sim.state, STORY, 4, 1000);
    expect(done.outcome).toBe('complete');
    expect(done.results).toEqual(toGameResults(done.evidence, 200));
  });

  it('a finished climb is a victory', () => {
    const sim = create(2, false, LONG_STORY);
    calm(sim);
    sim.tick();
    while (sim.state.phase === 'playing') clearTower(sim);
    const done = resultsOf(sim.state, LONG_STORY, 2, 1000);
    expect(done.outcome).toBe('victory');
    expect(done.evidence.items).toHaveLength(sim.state.towers);
    expect(done.evidence.items.every((i) => i.solved && i.correctFirstTry)).toBe(true);
    expect(done.results.accuracy).toBe(1);
  });
});

describe('contract', () => {
  it('every event type is named once, and the core has no clock or Math.random', () => {
    expect(new Set(STORM_CASTLE_TOWER_EVENT_TYPES).size).toBe(STORM_CASTLE_TOWER_EVENT_TYPES.length);
    for (const file of ['sim.ts', 'content.ts', 'evidence.ts', 'types.ts']) {
      const source = readFileSync(join(process.cwd(), 'src/games/storm-castle-tower/core', file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      expect(source, file).not.toMatch(/Math\.random|Date\.now|performance\.now|setTimeout/);
    }
  });

  it('the step is 1/30 s and the tuning numbers are the ones of the design', () => {
    expect(STEP_MS).toBeCloseTo(33.33, 1);
    expect(TUNING).toMatchObject({ maxTowers: 4, courage: 3, moveMs: 240, rowGap: 2, firstRow: 2 });
  });
});
