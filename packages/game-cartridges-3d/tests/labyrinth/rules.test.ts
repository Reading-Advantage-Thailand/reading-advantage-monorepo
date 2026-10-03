/** The Labyrinth rules of sections 2, 3, and 6 of docs/game-labyrinth-3d.md. */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema, toGameResults } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  COINS,
  LABYRINTH_EVENT_TYPES,
  SENTENCE_WORDS,
  TUNING,
  cellIndex,
  createLabyrinth,
  distancesFrom,
  evidenceOf,
  goblinCountFor,
  goblinSpeedFor,
  isCrossing,
  isLastSentence,
  manhattan,
  orbWordsOf,
  resultsOf,
  rightOrbOf,
  sameCell,
  scoreOf,
  sentencesOf,
  shiftOf,
  shiftSentencesOf,
  type Cell,
  type LabyrinthSimulation,
} from '../../src/labyrinth/core/index.js';
import { LONG_STORY, STORY, buildSentence, create, ofType, parkGoblins, stepOnto, stepsOf, takeRight, tickN } from './helpers.js';

const at = (col: number, row: number): Cell => ({ col, row });

/** Orbs obey the placement rules for the hero at `hero`. */
function expectOrbsValid(sim: LabyrinthSimulation, hero: Cell): void {
  const { maze, orbs } = sim.state;
  const near = (a: Cell, b: Cell): boolean => Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row)) <= 1;
  for (const o of orbs) {
    expect(near(o.cell, hero)).toBe(false);
    expect(maze.dens.some((d) => near(d, o.cell))).toBe(false);
  }
  expect(new Set(orbs.map((o) => `${o.cell.col},${o.cell.row}`)).size).toBe(orbs.length);
  const right = rightOrbOf(sim.state)!;
  const fromHero = distancesFrom(maze, hero);
  const fromRight = distancesFrom(maze, right.cell);
  const direct = fromHero[cellIndex(maze, right.cell)]!;
  for (const o of orbs) {
    if (o.id === right.id) continue;
    expect(fromHero[cellIndex(maze, o.cell)]! + fromRight[cellIndex(maze, o.cell)]!).toBeGreaterThan(direct);
  }
}

describe('content', () => {
  it('builds a shift of up to 5 sentences of 3 to 7 words, in a seeded order', () => {
    const shift = shiftOf(STORY, createRng(3), TUNING.maxSentences);
    expect(shift).toHaveLength(5);
    expect(new Set(shift.map((s) => s.id)).size).toBe(5);
    for (const s of shift) {
      const sentence = STORY.sentences.find((x) => x.id === s.id)!;
      expect(s.words).toEqual(sentence.words);
      expect(s.paragraph).toBe(sentence.paragraph);
      expect(s.words.length).toBeGreaterThanOrEqual(SENTENCE_WORDS.min);
      expect(s.words.length).toBeLessThanOrEqual(SENTENCE_WORDS.max);
      expect(s).toMatchObject({ wrong: 0, started: false, built: false });
    }
    expect(shiftOf(STORY, createRng(3), 5).map((s) => s.id)).toEqual(shift.map((s) => s.id));
    expect(shiftOf(STORY, createRng(4), 5).map((s) => s.id)).not.toEqual(shift.map((s) => s.id));
    const fit = shiftSentencesOf(LONG_STORY);
    expect(fit.every((s) => s.words.length <= 7)).toBe(true);
    expect(shiftOf(LONG_STORY, createRng(1), 5)).toHaveLength(Math.min(5, fit.length));
  });

  it('accepts the APK SentenceInput, and a shift with no sentence is over at once', () => {
    const input = [
      { term: 'The cat sleeps.', translation: 'x' },
      { term: 'Hi', translation: '' },
      { term: 'The dog runs fast.', translation: '' },
    ];
    expect(sentencesOf(input)).toEqual([
      { id: 's-1', text: 'The cat sleeps.', words: ['The', 'cat', 'sleeps.'], translation: 'x' },
      { id: 's-3', text: 'The dog runs fast.', words: ['The', 'dog', 'runs', 'fast.'] },
    ]);
    const sim = createLabyrinth(input, { seed: 1, helper: false });
    expect(sim.state.sentences).toBe(2);
    expect(createLabyrinth([], { seed: 1, helper: false }).state.phase).toBe('complete');
    expect(createLabyrinth([], { seed: 1, helper: false }).tick()).toEqual([]);
  });

  it('an orb wave holds the right word once and distractors that never equal it', () => {
    const shift = shiftOf(STORY, createRng(3), 5);
    for (let i = 0; i < shift[0]!.words.length; i++) {
      const words = orbWordsOf(shift, 0, i, 3, createRng(i));
      expect(words).toHaveLength(3);
      expect(words.filter((w) => w === shift[0]!.words[i]).length).toBe(1);
      expect(new Set(words).size).toBe(3);
    }
    // A short sentence borrows distractors from the other sentences of the shift.
    const two = shiftOf([{ term: 'Go now', translation: '' }, { term: 'Sit down', translation: '' }], createRng(1), 5);
    expect(two).toHaveLength(2);
    const words = orbWordsOf(two, 0, 0, 3, createRng(1));
    expect(words).toHaveLength(3);
    expect(words).toContain(two[0]!.words[0]);
    // Alone, a two-word sentence gives two orbs.
    expect(orbWordsOf(two.slice(0, 1), 0, 0, 3, createRng(1))).toHaveLength(2);
  });
});

describe('start and determinism', () => {
  it('starts the hero at the start cell, the goblins in their dens, and valid orbs; the first tick announces the sentence', () => {
    const sim = create(5);
    const { maze, hero, goblins, orbs } = sim.state;
    expect(sim.state.phase).toBe('playing');
    expect(hero).toMatchObject({ cell: maze.start, next: null, progress: 0, dir: null, queued: null, safeMs: 0, lastCrossing: maze.start });
    expect(goblins).toHaveLength(TUNING.goblins);
    goblins.forEach((g, i) => expect(g).toMatchObject({ id: `g${i + 1}`, cell: maze.dens[i], den: maze.dens[i], returning: false, fleeing: false }));
    expect(orbs).toHaveLength(TUNING.orbs);
    expectOrbsValid(sim, maze.start);
    const events = sim.tick();
    expect(ofType(events, 'sentenceStarted')).toHaveLength(1);
    expect(ofType(events, 'sentenceStarted')[0]).toMatchObject({
      sentenceId: sim.state.shift[0]!.id,
      words: sim.state.shift[0]!.words,
      orbs: orbs.map((o) => ({ id: o.id, word: o.word, cell: o.cell })),
    });
    expect(rightOrbOf(sim.state)!.word).toBe(sim.state.shift[0]!.words[0]);
  });

  it('Helper mode places two orbs', () => {
    const sim = create(5, true);
    expect(sim.state.orbs).toHaveLength(TUNING.orbsHelper);
    expect(rightOrbOf(sim.state)).not.toBeNull();
  });

  it('the same seed gives the same maze, shift, orbs, and run; another seed differs', () => {
    const a = createLabyrinth(STORY, { seed: 11, helper: false });
    const b = createLabyrinth(STORY, { seed: 11, helper: false });
    expect(a.snapshot()).toEqual(b.snapshot());
    for (const sim of [a, b]) {
      sim.dispatch({ type: 'turn', dir: 'right' });
      tickN(sim, 60);
      sim.dispatch({ type: 'turn', dir: 'down' });
      tickN(sim, 120);
    }
    expect(a.snapshot()).toEqual(b.snapshot());
    const mazes = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((seed) => createLabyrinth(STORY, { seed, helper: false }).state.maze.id));
    expect(mazes.size).toBeGreaterThan(1);
    const c = createLabyrinth(STORY, { seed: 12, helper: false, maze: a.state.maze.id });
    expect(c.state.orbs.map((o) => o.cell)).not.toEqual(a.state.orbs.map((o) => o.cell));
  });
});

describe('movement', () => {
  it('walls block: a turn into a wall keeps the hero still, and the queued turn waits', () => {
    const sim = create();
    parkGoblins(sim);
    sim.dispatch({ type: 'turn', dir: 'up' });
    tickN(sim, 30);
    expect(sim.state.hero).toMatchObject({ cell: at(0, 0), next: null, progress: 0, queued: 'up' });
    sim.dispatch({ type: 'turn', dir: 'left' });
    tickN(sim, 30);
    expect(sim.state.hero).toMatchObject({ cell: at(0, 0), next: null, queued: 'left' });
  });

  it('the hero walks at 3 cells per second and keeps going until a wall', () => {
    const sim = create();
    parkGoblins(sim);
    sim.state.orbs = [];
    sim.dispatch({ type: 'turn', dir: 'right' });
    tickN(sim, 5);
    expect(sim.state.hero).toMatchObject({ cell: at(0, 0), next: at(1, 0), dir: 'right', queued: null });
    expect(sim.state.hero.progress).toBeCloseTo(0.5, 5);
    tickN(sim, 5);
    expect(sim.state.hero).toMatchObject({ cell: at(1, 0), next: at(2, 0) });
    expect(sim.state.hero.progress).toBeCloseTo(0, 5);
    tickN(sim, 30);
    expect(sim.state.hero).toMatchObject({ cell: at(3, 0), next: null, progress: 0, dir: 'right' });
  });

  it('a queued turn is taken at the first cell that allows it', () => {
    const sim = create();
    parkGoblins(sim);
    sim.state.orbs = [];
    sim.dispatch({ type: 'turn', dir: 'right' });
    tickN(sim, 12); // between (1,0) and (2,0)
    sim.dispatch({ type: 'turn', dir: 'down' }); // (1,0) and (2,0) have no way down; (3,0) has
    tickN(sim, 8);
    expect(sim.state.hero).toMatchObject({ cell: at(2, 0), next: at(3, 0), dir: 'right', queued: 'down' });
    tickN(sim, 12);
    expect(sim.state.hero).toMatchObject({ cell: at(3, 0), next: at(3, 1), dir: 'down', queued: null });
  });

  it('the reverse direction applies at once, between cells', () => {
    const sim = create();
    parkGoblins(sim);
    sim.state.orbs = [];
    sim.dispatch({ type: 'turn', dir: 'right' });
    tickN(sim, 3);
    expect(sim.state.hero.progress).toBeCloseTo(0.3, 5);
    sim.dispatch({ type: 'turn', dir: 'left' });
    expect(sim.state.hero).toMatchObject({ cell: at(1, 0), next: at(0, 0), dir: 'left', queued: null });
    expect(sim.state.hero.progress).toBeCloseTo(0.7, 5);
    tickN(sim, 4);
    expect(sim.state.hero).toMatchObject({ cell: at(0, 0), next: null, progress: 0 });
  });

  it('stop halts the hero at the next cell; a turn starts it again', () => {
    const sim = create();
    parkGoblins(sim);
    sim.state.orbs = [];
    sim.dispatch({ type: 'turn', dir: 'right' });
    tickN(sim, 3);
    sim.dispatch({ type: 'stop' });
    tickN(sim, 20);
    expect(sim.state.hero).toMatchObject({ cell: at(1, 0), next: null, progress: 0, stopping: false });
    sim.dispatch({ type: 'turn', dir: 'right' });
    tickN(sim, 5);
    expect(sim.state.hero.next).toEqual(at(2, 0));
  });

  it('remembers the last crossing the hero walked through', () => {
    const sim = create();
    parkGoblins(sim);
    sim.state.orbs = [];
    expect(isCrossing(sim.state.maze, at(2, 2))).toBe(true);
    stepOnto(sim, at(2, 2));
    expect(sim.state.hero.lastCrossing).toEqual(at(2, 2));
    stepOnto(sim, at(1, 0)); // a corridor cell: not a crossing
    expect(sim.state.hero.lastCrossing).toEqual(at(2, 2));
  });

  it('ignores commands and ticks once the shift is complete', () => {
    const sim = create();
    sim.state.phase = 'complete';
    expect(sim.dispatch({ type: 'turn', dir: 'right' })).toEqual([]);
    expect(sim.tick()).toEqual([]);
    expect(sim.state.timeMs).toBe(0);
  });
});

describe('orbs', () => {
  it('the right orb joins the sentence, gives coins, and the next word gets new orbs off the direct way', () => {
    const sim = create(3);
    sim.tick();
    const right = rightOrbOf(sim.state)!;
    const before = sim.state.orbs.map((o) => o.id);
    const events = takeRight(sim);
    expect(ofType(events, 'orbTaken')).toEqual([{ type: 'orbTaken', id: right.id, index: 0 }]);
    expect(sim.state).toMatchObject({ next: 1, wordsTaken: 1, coins: COINS.word });
    expect(sim.state.shift[0]).toMatchObject({ started: true, wrong: 0, built: false });
    const placed = ofType(events, 'orbsPlaced');
    expect(placed).toHaveLength(1);
    expect(placed[0]!.orbs.map((o) => o.id)).toEqual(sim.state.orbs.map((o) => o.id));
    expect(sim.state.orbs.some((o) => before.includes(o.id))).toBe(false);
    expect(rightOrbOf(sim.state)!.word).toBe(sim.state.shift[0]!.words[1]);
    expectOrbsValid(sim, right.cell);
  });

  it('a wrong orb fizzles, counts an attempt, and moves every orb; no life is lost', () => {
    const sim = create(3);
    sim.tick();
    const right = rightOrbOf(sim.state)!;
    const wrong = sim.state.orbs.find((o) => o.id !== right.id)!;
    const wrongCell = { ...wrong.cell };
    const ids = sim.state.orbs.map((o) => o.id);
    const events = stepOnto(sim, wrongCell);
    expect(ofType(events, 'orbWrong')).toEqual([{ type: 'orbWrong', id: wrong.id }]);
    expect(ofType(events, 'orbTaken')).toHaveLength(0);
    const moved = ofType(events, 'orbsMoved');
    expect(moved).toHaveLength(1);
    expect(moved[0]!.orbs.map((o) => o.id)).toEqual(ids);
    expect(sim.state.orbs.map((o) => o.id)).toEqual(ids);
    expect(sim.state.shift[0]).toMatchObject({ started: true, wrong: 1 });
    expect(sim.state).toMatchObject({ next: 0, coins: 0, phase: 'playing' });
    expectOrbsValid(sim, wrongCell);
    expect(sim.state.orbs.find((o) => o.id === wrong.id)!.cell).not.toEqual(wrongCell);
  });

  it('orbs keep apart when the maze allows it', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const sim = createLabyrinth(STORY, { seed, helper: false });
      const cells = sim.state.orbs.map((o) => o.cell);
      for (let i = 0; i < cells.length; i++)
        for (let j = i + 1; j < cells.length; j++) expect(manhattan(cells[i]!, cells[j]!)).toBeGreaterThanOrEqual(TUNING.orbSpacing);
    }
  });
});

describe('goblins', () => {
  it('a goblin never turns back in a corridor, and turns back at a dead end', () => {
    const sim = create();
    sim.state.orbs = [];
    const g = sim.state.goblins[0]!;
    sim.state.goblins = [g];
    Object.assign(g, { cell: at(1, 0), next: at(2, 0), progress: 0.5, dir: 'right', restMs: 0 });
    tickN(sim, 20); // the hero rests at (0,0) behind the goblin
    expect(g).toMatchObject({ cell: at(2, 0), next: at(3, 0), dir: 'right' });
    Object.assign(g, { cell: at(4, 5), next: null, progress: 0, dir: 'up' });
    sim.tick();
    expect(g).toMatchObject({ cell: at(4, 5), next: at(4, 6), dir: 'down' });
  });

  it('a goblin chases: at a crossing it takes the way nearer the hero', () => {
    const sim = create();
    sim.state.orbs = [];
    const g = sim.state.goblins[0]!;
    sim.state.goblins = [g];
    Object.assign(sim.state.hero, { cell: at(3, 1), next: null, progress: 0, dir: null });
    Object.assign(g, { cell: at(2, 0), next: null, progress: 0, dir: null, restMs: 0 });
    sim.tick();
    expect(g).toMatchObject({ next: at(3, 0), dir: 'right' });
    expect(goblinSpeedFor(0, 5)).toBe(TUNING.goblinSpeed);
    expect(g.progress).toBeCloseTo(TUNING.goblinSpeed / 30, 5);
  });

  it('a bump sends the hero to the last crossing, the goblin home, and gives 1.5 s of safety', () => {
    const sim = create();
    sim.state.orbs = [];
    const g = sim.state.goblins[0]!;
    sim.state.goblins = [g];
    stepOnto(sim, at(2, 2));
    // (2,3) is a crossing too, so the hero walks right along the corridor (3,2), (4,2).
    sim.dispatch({ type: 'turn', dir: 'right' });
    Object.assign(g, { cell: at(4, 2), next: null, progress: 0, dir: null, restMs: 0 });
    const events = tickN(sim, 30);
    const bumps = ofType(events, 'heroBumped');
    expect(bumps).toEqual([{ type: 'heroBumped', goblinId: 'g1', cell: at(2, 2) }]);
    expect(g.returning).toBe(true);
    // The hero rests at the crossing, safe; the goblin walks home and rests there.
    const after = tickN(sim, 1);
    expect(after).toEqual([]);
    expect(sim.state.hero).toMatchObject({ next: null, queued: null });
    expect(sim.state.hero.safeMs).toBeGreaterThan(0);
    const home = tickN(sim, stepsOf(10_000));
    expect(ofType(home, 'goblinReturned')).toEqual([{ type: 'goblinReturned', goblinId: 'g1', cell: g.den }]);
    expect(ofType(home, 'heroBumped')).toHaveLength(0);
    expect(sim.state.phase).toBe('playing');
  });

  it('a safe hero is not bumped; after the safety a goblin bumps again', () => {
    const sim = create();
    sim.state.orbs = [];
    const g = sim.state.goblins[0]!;
    sim.state.goblins = [g];
    sim.state.hero.safeMs = TUNING.safeMs;
    Object.assign(g, { cell: at(0, 0), next: null, progress: 0, dir: null, restMs: 0 });
    expect(ofType(tickN(sim, 5), 'heroBumped')).toHaveLength(0);
    sim.state.hero.safeMs = 0;
    Object.assign(g, { cell: at(0, 0), next: null, progress: 0, dir: null, restMs: 0, returning: false });
    expect(ofType(tickN(sim, 1), 'heroBumped')).toHaveLength(1);
  });

  it('the last sentences have three faster goblins', () => {
    expect([0, 1, 2, 3, 4].map((i) => isLastSentence(i, 5))).toEqual([false, false, false, true, true]);
    expect([0, 1, 2].map((i) => isLastSentence(i, 3))).toEqual([false, false, true]);
    expect([0, 1].map((i) => isLastSentence(i, 2))).toEqual([false, false]);
    expect(goblinCountFor(4, 5)).toBe(TUNING.goblinsLast);
    expect(goblinSpeedFor(4, 5)).toBe(TUNING.goblinSpeedLast);
    const sim = create(2);
    for (let i = 0; i < 3; i++) buildSentence(sim);
    expect(sim.state.sentence).toBe(3);
    expect(sim.state.goblins).toHaveLength(3);
    expect(sim.state.goblins[2]).toMatchObject({ id: 'g3', cell: sim.state.maze.dens[2], fleeing: true });
  });
});

describe('aura', () => {
  it('a built sentence starts the aura: goblins flee, a touched goblin is caught for coins and rests in its den', () => {
    const sim = create(2);
    sim.tick();
    const events = buildSentence(sim);
    expect(ofType(events, 'sentenceComplete')).toEqual([{ type: 'sentenceComplete', sentenceId: sim.state.shift[0]!.id }]);
    expect(ofType(events, 'sentenceStarted')).toHaveLength(1);
    expect(sim.state).toMatchObject({ sentence: 1, next: 0, auraMs: TUNING.auraMs, sentencesBuilt: 1 });
    expect(sim.state.shift[0]).toMatchObject({ built: true, wrong: 0 });
    expect(sim.state.goblins.every((g) => g.fleeing)).toBe(true);
    // A fleeing goblin takes the way farther from the hero.
    const g = sim.state.goblins[0]!;
    Object.assign(sim.state.hero, { cell: at(0, 0), next: null, progress: 0, dir: null });
    Object.assign(g, { cell: at(2, 0), next: null, progress: 0, dir: null, restMs: 0 });
    sim.tick();
    expect(g).toMatchObject({ next: at(3, 0), dir: 'right' });
    expect(g.progress).toBeCloseTo(TUNING.goblinFleeSpeed / 30, 5);
    // The hero touches it: caught.
    const coins = sim.state.coins;
    Object.assign(sim.state.hero, { cell: g.cell, next: null, progress: 0 });
    Object.assign(g, { cell: at(2, 0), next: null, progress: 0 });
    const caught = sim.tick();
    expect(ofType(caught, 'goblinCaught')).toEqual([{ type: 'goblinCaught', goblinId: 'g1', coins: COINS.goblin }]);
    expect(ofType(caught, 'goblinReturned')).toEqual([{ type: 'goblinReturned', goblinId: 'g1', cell: g.den }]);
    expect(ofType(caught, 'heroBumped')).toHaveLength(0);
    expect(sim.state.coins).toBe(coins + COINS.goblin);
    expect(sim.state.goblinsCaught).toBe(1);
    expect(g).toMatchObject({ cell: g.den, next: null });
    expect(g.restMs).toBeGreaterThan(0);
    // The aura ends; goblins chase again.
    const ended = tickN(sim, stepsOf(TUNING.auraMs));
    expect(ofType(ended, 'auraEnded')).toHaveLength(1);
    expect(sim.state.auraMs).toBe(0);
    expect(sim.state.goblins.every((g) => !g.fleeing)).toBe(true);
  });

  it('a resting goblin in its den cannot be caught again or bump', () => {
    const sim = create(2);
    sim.tick();
    sim.state.auraMs = TUNING.auraMs;
    const g = sim.state.goblins[0]!;
    g.restMs = TUNING.denRestMs;
    Object.assign(sim.state.hero, { cell: g.den, next: null, progress: 0 });
    expect(tickN(sim, 3)).toEqual([]);
    sim.state.auraMs = 0;
    expect(tickN(sim, 3)).toEqual([]);
  });
});

describe('gate and results', () => {
  it('after the last sentence the gate opens, goblins keep fleeing, and the hero at the gate completes the shift', () => {
    const sim = create(4);
    sim.tick();
    let events: ReturnType<typeof buildSentence> = [];
    for (let i = 0; i < sim.state.sentences; i++) events = buildSentence(sim);
    expect(ofType(events, 'gateOpened')).toEqual([{ type: 'gateOpened', cell: sim.state.maze.gate }]);
    expect(sim.state).toMatchObject({ gateOpen: true, orbs: [], phase: 'playing', sentencesBuilt: 5 });
    expect(rightOrbOf(sim.state)).toBeNull();
    tickN(sim, stepsOf(TUNING.auraMs + 100));
    expect(sim.state.auraMs).toBe(0);
    expect(sim.state.goblins.every((g) => g.fleeing)).toBe(true);
    // A goblin on the hero never bumps while the gate is open.
    const g = sim.state.goblins[0]!;
    Object.assign(g, { cell: sim.state.hero.cell, next: null, progress: 0, restMs: 0, returning: false });
    expect(ofType(tickN(sim, 2), 'heroBumped')).toHaveLength(0);
    parkGoblins(sim);
    const done = stepOnto(sim, sim.state.maze.gate);
    expect(ofType(done, 'shiftComplete')).toEqual([{ type: 'shiftComplete', sentences: 5 }]);
    expect(sim.state.phase).toBe('complete');
    expect(sim.tick()).toEqual([]);
    expect(sim.state.shift.every((s) => s.built)).toBe(true);
  });

  it('the gate cell is only an exit once the gate is open', () => {
    const sim = create(4);
    sim.state.orbs = [];
    parkGoblins(sim);
    const events = stepOnto(sim, sim.state.maze.gate);
    expect(ofType(events, 'shiftComplete')).toHaveLength(0);
    expect(sim.state.phase).toBe('playing');
  });

  it('evidence: one sentence item per started sentence; attempts = wrong + 1; results follow the apps rule', () => {
    const sim = create(2);
    sim.tick();
    buildSentence(sim); // sentence 1: no wrong orb
    const right = rightOrbOf(sim.state)!;
    stepOnto(sim, sim.state.orbs.find((o) => o.id !== right.id)!.cell); // sentence 2: one wrong orb
    buildSentence(sim);
    takeRight(sim); // sentence 3: started, not built
    const evidence = evidenceOf(sim.state, STORY, 9, 12_345.6);
    expect(storyGameEvidenceSchema.parse(evidence)).toEqual(evidence);
    expect(evidence).toMatchObject({ gameId: 'labyrinth', storyId: STORY.id, level: STORY.level, seed: 9, durationMs: 12_346 });
    expect(evidence.items).toEqual([
      { itemId: sim.state.shift[0]!.id, itemKind: 'sentence', label: sim.state.shift[0]!.text, attempts: 1, correctFirstTry: true, solved: true, paragraph: sim.state.shift[0]!.paragraph },
      { itemId: sim.state.shift[1]!.id, itemKind: 'sentence', label: sim.state.shift[1]!.text, attempts: 2, correctFirstTry: false, solved: true, paragraph: sim.state.shift[1]!.paragraph },
      { itemId: sim.state.shift[2]!.id, itemKind: 'sentence', label: sim.state.shift[2]!.text, attempts: 1, correctFirstTry: false, solved: false, paragraph: sim.state.shift[2]!.paragraph },
    ]);
    expect(evidence.practice).toEqual([sim.state.shift[1]!.text, sim.state.shift[2]!.text]);
    const words = sim.state.shift[0]!.words.length + sim.state.shift[1]!.words.length + 1;
    expect(scoreOf(sim.state)).toBe(words * COINS.word);
    const { results, outcome } = resultsOf(sim.state, STORY, 9, 12_345);
    expect(results).toEqual(toGameResults(evidence, scoreOf(sim.state)));
    expect(results).toMatchObject({ correctAnswers: 2, totalAttempts: 4, accuracy: 0.5, xp: 1, score: words * COINS.word });
    expect(outcome).toBe('complete');
    sim.state.phase = 'complete';
    expect(resultsOf(sim.state, STORY, 9, 0).outcome).toBe('victory');
  });

  it('bumps never count and there is no game over', () => {
    const sim = create(2);
    sim.state.orbs = [];
    const g = sim.state.goblins[0]!;
    sim.state.goblins = [g];
    for (let i = 0; i < 40; i++) {
      sim.state.hero.safeMs = 0;
      Object.assign(g, { cell: sim.state.hero.cell, next: null, progress: 0, restMs: 0, returning: false });
      expect(ofType(sim.tick(), 'heroBumped')).toHaveLength(1);
    }
    expect(sim.state.phase).toBe('playing');
    expect(evidenceOf(sim.state, STORY, 1, 0).items).toEqual([]);
    expect(resultsOf(sim.state, STORY, 1, 0).results).toMatchObject({ totalAttempts: 0, xp: 0, score: 0 });
  });

  it('every event the core emits is a listed type', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 3; seed++) {
      const sim = create(seed);
      seen.add(sim.tick()[0]!.type);
      for (let i = 0; i < sim.state.sentences; i++) for (const e of buildSentence(sim)) seen.add(e.type);
      for (const e of stepOnto(sim, sim.state.maze.gate)) seen.add(e.type);
    }
    for (const type of seen) expect(LABYRINTH_EVENT_TYPES).toContain(type);
    expect(seen).toContain('shiftComplete');
    expect(sameCell(at(1, 1), at(1, 1))).toBe(true);
  });
});
