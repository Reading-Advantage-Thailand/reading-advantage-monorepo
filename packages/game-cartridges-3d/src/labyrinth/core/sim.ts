/**
 * The Labyrinth of the Goblin King simulation: a real-time `Simulation` on the fixed step.
 * Rules from sections 2, 3, and 6 of docs/game-labyrinth-3d.md: the hero walks the maze from
 * cell to cell with a queued turn and takes the orb with the next word of the sentence (a wrong
 * orb fizzles and every orb moves); goblins chase the hero through the maze (a bump sends the
 * hero back to the last crossing and the goblin to its den); a built sentence gives an aura
 * during which goblins flee and a touched goblin is caught; after the last sentence the gate
 * opens and the hero walks out. No lives, no defeat, no timer.
 */
import { STEP_MS, createRng, type Rng, type Simulation } from '@reading-advantage/advantage-play-kit-3d/sim';
import { orbWordsOf, shiftOf, type LabyrinthInput } from './content.js';
import { COINS } from './evidence.js';
import {
  MAZES,
  canMove,
  cellsOf,
  cloneMaze,
  cellIndex,
  distancesFrom,
  exitsOf,
  isCrossing,
  manhattan,
  mazeById,
  neighborOf,
  oppositeOf,
  positionOf,
  sameCell,
} from './mazes.js';
import type {
  Cell,
  Dir,
  Goblin,
  Hero,
  LabyrinthCommand,
  LabyrinthEvent,
  LabyrinthState,
  Maze,
  Mover,
  Orb,
  OrbSpawn,
  ShiftSentence,
} from './types.js';

/** Every tuning number of the game (section 6 of the design). Speeds are cells per second. */
export const TUNING = {
  /** The most sentences in one shift. */
  maxSentences: 5,
  heroSpeed: 3,
  /** Goblin chase speed in the first sentence: half the old fixed speed of 2. */
  goblinSpeed: 1,
  /** Each later sentence makes the goblins this much faster (compounding); by sentence 5 they reach about 2. */
  goblinSpeedGrowth: 1.2,
  /** A fleeing goblin (the aura, the open gate). */
  goblinFleeSpeed: 1.5,
  /** A goblin walking home after a bump. */
  goblinReturnSpeed: 3,
  /** Goblins in a sentence, and in the last sentences. */
  goblins: 2,
  goblinsLast: 3,
  /** Orbs per wave, and in Helper mode. */
  orbs: 3,
  orbsHelper: 2,
  /** Orbs keep this many cells (walking on the grid) apart when the maze allows it. */
  orbSpacing: 3,
  /** A bump makes the hero safe for this long. */
  safeMs: 1500,
  /** A goblin back in its den (after a bump or a catch) rests this long before it comes out. */
  denRestMs: 2000,
  auraMs: 5000,
  /** Two movers touch inside this distance in cell units. */
  touchRadius: 0.5,
  /**
   * A side turn pressed within this share of a cell after the hero left a crossing still takes
   * that crossing (the hero steps back into it), so a late press never skips the corridor the
   * student aimed at. It applies only when the turn is closed at the cell ahead (a press for the
   * cell ahead keeps its meaning). Beyond the grace, the turn waits for the next crossing.
   */
  turnGrace: 0.5,
} as const;

export interface LabyrinthOptions {
  seed: number;
  helper: boolean;
  /** A maze id to force (tests and the QC driver); the default is a seeded choice. */
  maze?: string;
}

export type LabyrinthSimulation = Simulation<LabyrinthState, LabyrinthCommand, LabyrinthEvent>;

/** True for the last sentences of a shift of `count`: the last two of 4 or more, the last of 3, none below. */
export function isLastSentence(index: number, count: number): boolean {
  return count >= 3 && index >= Math.max(2, count - 2);
}

export function goblinCountFor(index: number, count: number): number {
  return isLastSentence(index, count) ? TUNING.goblinsLast : TUNING.goblins;
}

export function goblinSpeedFor(index: number, _count: number): number {
  return TUNING.goblinSpeed * TUNING.goblinSpeedGrowth ** index;
}

/** The orb with the next word of the sentence, or null (the gate is open, or no shift). */
export function rightOrbOf(state: LabyrinthState): Orb | null {
  const sentence = state.shift[state.sentence];
  if (!sentence || state.gateOpen) return null;
  const word = sentence.words[state.next];
  return state.orbs.find((o) => o.word === word) ?? null;
}

const DT = STEP_MS / 1000;

/** One step off a timer; float dust below a microsecond counts as zero. */
const countDown = (ms: number): number => (ms - STEP_MS < 1e-6 ? 0 : ms - STEP_MS);

const touching = (a: Mover, b: Mover): boolean => {
  const p = positionOf(a);
  const q = positionOf(b);
  return Math.hypot(p.x - q.x, p.y - q.y) < TUNING.touchRadius;
};

const restAt = (mover: Mover, cell: Cell): void => {
  mover.cell = { ...cell };
  mover.next = null;
  mover.progress = 0;
};

export function createLabyrinth(input: LabyrinthInput, options: LabyrinthOptions): LabyrinthSimulation {
  const rng: Rng = createRng(options.seed);
  const maze: Maze = cloneMaze(options.maze ? mazeById(options.maze) : rng.pick(MAZES));
  const shift = shiftOf(input, rng, TUNING.maxSentences);

  const state: LabyrinthState = {
    phase: 'playing',
    helper: options.helper,
    timeMs: 0,
    maze,
    shift,
    sentence: 0,
    sentences: shift.length,
    next: 0,
    hero: {
      cell: { ...maze.start },
      next: null,
      progress: 0,
      dir: null,
      queued: null,
      stopping: false,
      safeMs: 0,
      lastCrossing: { ...maze.start },
    },
    goblins: [],
    orbs: [],
    wave: 0,
    auraMs: 0,
    gateOpen: false,
    coins: 0,
    wordsTaken: 0,
    sentencesBuilt: 0,
    goblinsCaught: 0,
  };

  const current = (): ShiftSentence => state.shift[state.sentence]!;

  // ------------------------------------------------------------ orbs

  /**
   * Seeded cells for a wave of orbs, the right orb at `rightSlot`: free cells are not the hero's
   * cell or its neighbors and not a den or a den's neighbor. The wrong orbs stay off every
   * shortest path from the hero to the right orb, so the direct way never forces a wrong orb.
   * Orbs keep `orbSpacing` apart when the maze allows it.
   */
  const orbCells = (count: number, rightSlot: number): Cell[] => {
    const hero = state.hero.next ?? state.hero.cell;
    const near = (a: Cell, b: Cell): boolean => Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row)) <= 1;
    const pool = rng.shuffle(cellsOf(maze).filter((c) => !near(c, hero) && !maze.dens.some((d) => near(d, c))));
    const right = pool[0]!;
    const fromHero = distancesFrom(maze, hero);
    const fromRight = distancesFrom(maze, right);
    const direct = fromHero[cellIndex(maze, right)]!;
    const offPath = pool.filter((c) => fromHero[cellIndex(maze, c)]! + fromRight[cellIndex(maze, c)]! > direct);
    let wrong: Cell[] = [];
    for (let spacing = TUNING.orbSpacing; spacing >= 0 && wrong.length < count - 1; spacing--) {
      wrong = [];
      for (const c of offPath) {
        if (manhattan(c, right) >= spacing && wrong.every((o) => manhattan(o, c) >= spacing)) wrong.push(c);
        if (wrong.length === count - 1) break;
      }
    }
    wrong.splice(rightSlot, 0, right);
    return wrong;
  };

  const placeWave = (): OrbSpawn[] => {
    state.wave += 1;
    const answer = current().words[state.next]!;
    const words = orbWordsOf(state.shift, state.sentence, state.next, state.helper ? TUNING.orbsHelper : TUNING.orbs, rng);
    const cells = orbCells(words.length, words.indexOf(answer));
    state.orbs = words.map((word, i) => ({ id: `o${state.wave}-${i + 1}`, word, cell: cells[i]! }));
    return state.orbs.map((o) => ({ id: o.id, word: o.word, cell: { ...o.cell } }));
  };

  const moveOrbs = (): { id: string; cell: Cell }[] => {
    const answer = current().words[state.next]!;
    const cells = orbCells(state.orbs.length, state.orbs.findIndex((o) => o.word === answer));
    state.orbs.forEach((o, i) => (o.cell = cells[i]!));
    return state.orbs.map((o) => ({ id: o.id, cell: { ...o.cell } }));
  };

  // ------------------------------------------------------------ sentences and goblins

  const spawnGoblins = (): void => {
    const count = goblinCountFor(state.sentence, state.sentences);
    while (state.goblins.length < count) {
      const i = state.goblins.length;
      const den = maze.dens[i % maze.dens.length]!;
      state.goblins.push({
        id: `g${i + 1}`,
        cell: { ...den },
        next: null,
        progress: 0,
        dir: null,
        den: { ...den },
        returning: false,
        restMs: 0,
        fleeing: state.auraMs > 0,
      });
    }
  };

  const startSentence = (events: LabyrinthEvent[]): void => {
    state.next = 0;
    spawnGoblins();
    const orbs = placeWave();
    events.push({ type: 'sentenceStarted', sentenceId: current().id, words: current().words.slice(), orbs });
  };

  const setFleeing = (fleeing: boolean): void => {
    for (const g of state.goblins) g.fleeing = fleeing;
  };

  const completeSentence = (events: LabyrinthEvent[]): void => {
    const sentence = current();
    sentence.built = true;
    state.sentencesBuilt += 1;
    state.orbs = [];
    state.auraMs = TUNING.auraMs;
    setFleeing(true);
    events.push({ type: 'sentenceComplete', sentenceId: sentence.id });
    if (state.sentence + 1 < state.sentences) {
      state.sentence += 1;
      startSentence(events);
      return;
    }
    state.gateOpen = true;
    events.push({ type: 'gateOpened', cell: { ...maze.gate } });
  };

  const takeOrbAt = (cell: Cell, events: LabyrinthEvent[]): void => {
    const orb = state.orbs.find((o) => sameCell(o.cell, cell));
    if (!orb) return;
    const sentence = current();
    sentence.started = true;
    if (orb.word !== sentence.words[state.next]) {
      sentence.wrong += 1;
      events.push({ type: 'orbWrong', id: orb.id });
      events.push({ type: 'orbsMoved', orbs: moveOrbs() });
      return;
    }
    state.next += 1;
    state.wordsTaken += 1;
    state.coins += COINS.word;
    events.push({ type: 'orbTaken', id: orb.id, index: state.next - 1 });
    if (state.next < sentence.words.length) events.push({ type: 'orbsPlaced', orbs: placeWave() });
    else completeSentence(events);
  };

  // ------------------------------------------------------------ movement

  /**
   * Walks a mover for one step at `speed`. `decide(arrived)` names the next direction: at rest
   * (`arrived` false) or right after a cell is reached (`arrived` true); null keeps the mover at
   * the cell. `arrive` runs at every cell reached (false ends the walk). The distance left after
   * an arrival carries into the next cell, so speed is exact; an arrival within a float hair
   * of the cell counts.
   */
  const walk = (mover: Mover, speed: number, decide: (arrived: boolean) => Dir | null, arrive: () => boolean): void => {
    const start = (dir: Dir): void => {
      mover.dir = dir;
      mover.next = neighborOf(mover.cell, dir);
      mover.progress = 0;
    };
    let budget = speed * DT;
    if (mover.next === null) {
      const dir = decide(false);
      if (dir === null) return;
      start(dir);
    }
    for (let guard = 0; guard < 4; guard++) {
      const left = 1 - mover.progress;
      if (budget + 1e-9 < left) {
        mover.progress += budget;
        return;
      }
      budget = Math.max(0, budget - left);
      restAt(mover, mover.next!);
      if (!arrive()) return;
      const dir = decide(true);
      if (dir === null) return;
      start(dir);
      if (budget <= 1e-9) return;
    }
  };

  /** The hero's next direction: the queued turn when the cell allows it; else straight on, only while walking. */
  const heroDecide = (arrived: boolean): Dir | null => {
    const h = state.hero;
    if (h.queued && canMove(maze, h.cell, h.queued)) {
      const dir = h.queued;
      h.queued = null;
      h.stopping = false;
      return dir;
    }
    if (h.stopping) {
      h.stopping = false;
      return null;
    }
    return arrived && h.dir && canMove(maze, h.cell, h.dir) ? h.dir : null;
  };

  const moveHero = (events: LabyrinthEvent[]): void => {
    const h = state.hero;
    h.safeMs = countDown(h.safeMs);
    walk(h, TUNING.heroSpeed, heroDecide, () => {
      if (isCrossing(maze, h.cell)) h.lastCrossing = { ...h.cell };
      if (state.gateOpen && sameCell(h.cell, maze.gate)) {
        state.phase = 'complete';
        h.dir = maze.gateSide;
        events.push({ type: 'shiftComplete', sentences: state.sentencesBuilt });
        return false;
      }
      takeOrbAt(h.cell, events);
      return true;
    });
  };

  /** The exit of `g` that brings it nearest (or, fleeing, farthest from) the cells `dist` measures; seeded ties. */
  const goblinChoice = (g: Goblin, dist: number[], farthest: boolean, allowBack: boolean): Dir | null => {
    const exits = exitsOf(maze, g.cell);
    const back = g.dir ? oppositeOf(g.dir) : null;
    let options = allowBack ? exits : exits.filter((d) => d !== back);
    if (options.length === 0) options = exits;
    if (options.length === 0) return null;
    const scored = options.map((dir) => ({ dir, d: dist[cellIndex(maze, neighborOf(g.cell, dir))]! }));
    const best = farthest ? Math.max(...scored.map((s) => s.d)) : Math.min(...scored.map((s) => s.d));
    const ties = scored.filter((s) => s.d === best).map((s) => s.dir);
    return ties.length === 1 ? ties[0]! : rng.pick(ties);
  };

  const moveGoblins = (events: LabyrinthEvent[]): void => {
    let fromHero: number[] | null = null;
    const heroDist = (): number[] => (fromHero ??= distancesFrom(maze, state.hero.next ?? state.hero.cell));
    const chaseSpeed = goblinSpeedFor(state.sentence, state.sentences);
    for (const g of state.goblins) {
      if (g.restMs > 0) {
        g.restMs = countDown(g.restMs);
        continue;
      }
      if (g.returning) {
        const home = distancesFrom(maze, g.den);
        walk(
          g,
          TUNING.goblinReturnSpeed,
          () => (sameCell(g.cell, g.den) ? null : goblinChoice(g, home, false, true)),
          () => {
            if (!sameCell(g.cell, g.den)) return true;
            g.returning = false;
            g.restMs = TUNING.denRestMs;
            events.push({ type: 'goblinReturned', goblinId: g.id, cell: { ...g.den } });
            return false;
          },
        );
        continue;
      }
      walk(g, g.fleeing ? TUNING.goblinFleeSpeed : chaseSpeed, () => goblinChoice(g, heroDist(), g.fleeing, false), () => true);
    }
  };

  // ------------------------------------------------------------ contacts

  const contacts = (events: LabyrinthEvent[]): void => {
    const h = state.hero;
    for (const g of state.goblins) {
      if (g.returning || g.restMs > 0 || !touching(h, g)) continue;
      if (state.auraMs > 0) {
        state.goblinsCaught += 1;
        state.coins += COINS.goblin;
        restAt(g, g.den);
        g.dir = null;
        g.restMs = TUNING.denRestMs;
        events.push({ type: 'goblinCaught', goblinId: g.id, coins: COINS.goblin });
        events.push({ type: 'goblinReturned', goblinId: g.id, cell: { ...g.den } });
        continue;
      }
      if (state.gateOpen || h.safeMs > 0) continue;
      restAt(h, h.lastCrossing);
      h.queued = null;
      h.stopping = false;
      h.safeMs = TUNING.safeMs;
      g.returning = true;
      events.push({ type: 'heroBumped', goblinId: g.id, cell: { ...h.cell } });
      return; // one bump per step
    }
  };

  const runAura = (events: LabyrinthEvent[]): void => {
    if (state.auraMs <= 0) return;
    state.auraMs = countDown(state.auraMs);
    if (state.auraMs > 0) return;
    events.push({ type: 'auraEnded' });
    if (!state.gateOpen) setFleeing(false);
  };

  // ------------------------------------------------------------ the simulation

  // The first sentence is set up at creation (the view reads the state before the first tick);
  // its `sentenceStarted` event comes with the first tick. A shift with no sentences is over.
  const pending: LabyrinthEvent[] = [];
  if (shift.length === 0) state.phase = 'complete';
  else startSentence(pending);

  return {
    get state() {
      return state;
    },
    dispatch(command) {
      if (state.phase !== 'playing') return [];
      const h = state.hero;
      if (command.type === 'stop') {
        h.queued = null;
        h.stopping = true;
        return [];
      }
      if (command.type !== 'turn' || !['up', 'down', 'left', 'right'].includes(command.dir)) return [];
      h.stopping = false;
      if (h.next && h.dir && command.dir === oppositeOf(h.dir)) {
        // The reverse applies at once: the hero walks back to the cell it came from.
        const from = h.cell;
        h.cell = h.next;
        h.next = from;
        h.progress = 1 - h.progress;
        h.dir = command.dir;
        h.queued = null;
        return [];
      }
      if (h.next && h.dir && command.dir !== h.dir && h.progress < TUNING.turnGrace && canMove(maze, h.cell, command.dir) && !canMove(maze, h.next, command.dir)) {
        // A late side turn: back into the cell just left, then out along the new direction.
        h.dir = command.dir;
        h.next = neighborOf(h.cell, command.dir);
        h.progress = 0;
        h.queued = null;
        return [];
      }
      h.queued = command.dir;
      return [];
    },
    tick() {
      if (state.phase !== 'playing') return [];
      const events = pending.splice(0);
      state.timeMs += STEP_MS;
      runAura(events);
      moveHero(events);
      if (state.phase === 'playing') {
        moveGoblins(events);
        contacts(events);
      }
      return events;
    },
    snapshot: () => structuredClone(state),
  };
}
