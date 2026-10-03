/**
 * The Storm Castle Tower simulation: a real-time `Simulation` on the fixed step. Rules from
 * sections 2, 3, and 6 of docs/game-storm-castle-tower-3d.md: the climber scales a four-column
 * tower wall and opens the word windows in the order of the sentence, one row of windows per
 * word. A row holds the next word and other words; the right window joins the sentence, a wrong
 * one shuts (a reading attempt and one courage). Oil and rocks fall down the columns; a hit costs
 * one courage and one row, and is never a reading error. At 0 courage the team rests and returns
 * to the last open window with full courage. When the sentence is built, the top opens, the
 * hazards stop, and the tower is cleared at the top. No lives, no defeat, no timer.
 */
import { STEP_MS, createRng, type Rng, type Simulation } from '@reading-advantage/advantage-play-kit-3d/sim';
import { bareWord, distractorsOf, sentencesOf, shiftOf, wordKey, type StormCastleTowerInput } from './content.js';
import type {
  Climber,
  Hazard,
  HazardType,
  StormCastleTowerCommand,
  StormCastleTowerEvent,
  StormCastleTowerState,
  TowerWindow,
} from './types.js';

/** The tower wall is this many columns wide. */
export const COLUMNS = 4;
/** The climber starts at the foot of the wall, in the second column. */
export const START = { col: 1, row: 0 } as const;

/** Every tuning number of the game (section 6 of the design). */
export const TUNING = {
  /** The most towers in one climb. */
  maxTowers: 4,
  /** Rows between the windows of two words, and the row of the first windows. */
  rowGap: 2,
  firstRow: 2,
  /** Milliseconds the climber needs for one cell. */
  moveMs: 240,
  /** Courage per tower. */
  courage: 3,
  /** Other words in a row of windows (Helper mode: fewer). */
  decoys: 2,
  helperDecoys: 1,
  /** Hazards: the first falls after `graceMs`, then one every `intervalMs`. */
  graceMs: 2600,
  intervalMs: 1800,
  helperIntervalMs: 2600,
  /** Fall speed in rows per second. */
  oilSpeed: 2.0,
  rockSpeed: 2.6,
  helperSpeedScale: 0.8,
  /** A hazard starts this many rows above the climber. */
  dropHeight: 6,
  /** A hazard hits inside this many rows of the climber. */
  hitRadius: 0.55,
  /** Protection after a hit, and after a rest. */
  hitProtectMs: 1500,
  restProtectMs: 2000,
  /** No control after a rest. */
  restMs: 1200,
  /** The bot and the view read a hazard as a threat this far above a cell. */
  threatAhead: 3.6,
  threatBehind: 0.6,
} as const;

export type StormCastleTowerSimulation = Simulation<StormCastleTowerState, StormCastleTowerCommand, StormCastleTowerEvent>;

export interface StormCastleTowerOptions {
  seed: number;
  helper: boolean;
}

/** The row of the windows of word `index` (zero-based). */
export const windowRowFor = (index: number): number => TUNING.firstRow + TUNING.rowGap * index;

/** The row of the top of a tower of `words` words. */
export const summitRowFor = (words: number): number => windowRowFor(words);

/** The windows that hold the word the climber must open now (more than one when a word repeats). */
export function rightWindowsOf(state: StormCastleTowerState): TowerWindow[] {
  const word = state.shift[state.tower]?.words[state.next];
  if (word === undefined) return [];
  return state.windows.filter((w) => wordKey(w.word) === wordKey(word));
}

/** True when a hazard in column `col` falls on the cell at row `row` soon (the bot and the view read it). */
export function hazardsThreaten(hazards: readonly Hazard[], col: number, row: number): boolean {
  return hazards.some((h) => h.col === col && h.y >= row - TUNING.threatBehind && h.y <= row + TUNING.threatAhead);
}

const DT = STEP_MS / 1000;
const down = (ms: number): number => (ms - STEP_MS < 1e-6 ? 0 : ms - STEP_MS);

export function createStormCastleTower(input: StormCastleTowerInput, options: StormCastleTowerOptions): StormCastleTowerSimulation {
  const rng: Rng = createRng(options.seed);
  const shift = shiftOf(input, rng, TUNING.maxTowers);
  const allSentences = sentencesOf(input);
  const interval = options.helper ? TUNING.helperIntervalMs : TUNING.intervalMs;
  const speedScale = options.helper ? TUNING.helperSpeedScale : 1;

  const climber = (): Climber => ({ col: START.col, row: START.row, moveMs: 0, protectMs: 0, restMs: 0 });
  const state: StormCastleTowerState = {
    phase: 'playing',
    helper: options.helper,
    timeMs: 0,
    shift,
    tower: 0,
    towers: shift.length,
    climber: climber(),
    windows: [],
    lit: [],
    hazards: [],
    next: 0,
    windowRow: windowRowFor(0),
    summitRow: summitRowFor(shift[0]?.words.length ?? 0),
    summitOpen: false,
    steer: { x: 0, z: 0 },
    floorRow: 0,
    checkpoint: { col: START.col, row: START.row },
    courage: TUNING.courage,
    maxCourage: TUNING.courage,
    spawnMs: TUNING.graceMs,
    hazardSerial: 0,
    lastHazardCol: -1,
    collected: 0,
    towersCleared: 0,
    rests: 0,
    hits: 0,
  };

  const current = () => state.shift[state.tower]!;
  const maxRow = (): number => (state.summitOpen ? state.summitRow : state.windowRow);

  // ------------------------------------------------------------ windows

  /** Places the windows of the word `next`: the word and other words, in seeded columns of its row. */
  const placeWindows = (events: StormCastleTowerEvent[]): void => {
    const tower = current();
    const answer = tower.words[state.next]!;
    const others = allSentences.filter((s) => s.id !== tower.id).flatMap((s) => s.words);
    const count = options.helper ? TUNING.helperDecoys : TUNING.decoys;
    const words = [bareWord(answer), ...distractorsOf(tower.words, others, answer, rng, count)];
    const cols = rng.shuffle(Array.from({ length: COLUMNS }, (_, i) => i));
    state.windowRow = windowRowFor(state.next);
    state.windows = words.map((word, i) => ({
      id: `w${state.next + 1}-${i + 1}`,
      word,
      col: cols[i]!,
      row: state.windowRow,
      correct: i === 0,
      spent: false,
      contact: false,
    }));
    // The view must not read the look from the order: sort by column.
    state.windows.sort((a, b) => a.col - b.col);
    events.push({
      type: 'windowsPlaced',
      row: state.windowRow,
      windows: state.windows.map(({ id, word, col, row }) => ({ id, word, col, row })),
    });
  };

  const startTower = (events: StormCastleTowerEvent[]): void => {
    const tower = current();
    state.climber = climber();
    state.next = 0;
    state.summitOpen = false;
    state.summitRow = summitRowFor(tower.words.length);
    state.lit = [];
    state.hazards = [];
    state.floorRow = START.row;
    state.checkpoint = { col: START.col, row: START.row };
    state.courage = state.maxCourage;
    state.spawnMs = TUNING.graceMs;
    events.push({ type: 'towerStarted', towerId: tower.towerId, sentenceId: tower.id, words: tower.words.slice(), summitRow: state.summitRow });
    placeWindows(events);
  };

  const clearTower = (events: StormCastleTowerEvent[]): void => {
    const tower = current();
    tower.cleared = true;
    state.towersCleared += 1;
    events.push({ type: 'towerCleared', towerId: tower.towerId, sentenceId: tower.id });
    if (state.tower + 1 >= state.towers) {
      state.phase = 'complete';
      state.summitOpen = false;
      events.push({ type: 'climbComplete', towers: state.towersCleared });
      return;
    }
    state.tower += 1;
    startTower(events);
  };

  // ------------------------------------------------------------ courage

  /** One courage lost; at 0 the team rests and returns to the last open window. */
  const loseCourage = (events: StormCastleTowerEvent[]): void => {
    state.courage -= 1;
    events.push({ type: 'courageChanged', courage: state.courage });
    if (state.courage > 0) return;
    state.rests += 1;
    state.courage = state.maxCourage;
    state.climber.col = state.checkpoint.col;
    state.climber.row = state.checkpoint.row;
    state.climber.restMs = TUNING.restMs;
    state.climber.protectMs = TUNING.restProtectMs;
    state.climber.moveMs = 0;
    state.hazards = [];
    state.spawnMs = TUNING.graceMs;
    for (const w of state.windows) w.contact = false;
    events.push({ type: 'teamRested', courage: state.courage });
  };

  // ------------------------------------------------------------ movement and windows

  const moveClimber = (): void => {
    const c = state.climber;
    c.moveMs = down(c.moveMs);
    c.protectMs = down(c.protectMs);
    c.restMs = down(c.restMs);
    if (c.restMs > 0 || c.moveMs > 0) return;
    const { x, z } = state.steer;
    const ax = Math.abs(x);
    const az = Math.abs(z);
    if (Math.max(ax, az) < 0.4) return;
    let dc = 0;
    let dr = 0;
    if (ax >= az) dc = x > 0 ? 1 : -1;
    else dr = z < 0 ? 1 : -1;
    const col = Math.min(COLUMNS - 1, Math.max(0, c.col + dc));
    const row = Math.min(maxRow(), Math.max(state.floorRow, c.row + dr));
    if (col === c.col && row === c.row) return;
    c.col = col;
    c.row = row;
    c.moveMs = TUNING.moveMs;
  };

  /** An opening counts when the climber *enters* a window cell while in control. One per step. */
  const touchWindows = (events: StormCastleTowerEvent[]): void => {
    const c = state.climber;
    let touched: TowerWindow | null = null;
    for (const w of state.windows) {
      const touching = w.col === c.col && w.row === c.row;
      const entered = touching && !w.contact;
      w.contact = touching;
      if (entered && !w.spent && c.restMs <= 0 && touched === null) touched = w;
    }
    if (!touched) return;
    const tower = current();
    tower.started = true;
    if (wordKey(touched.word) === wordKey(tower.words[state.next]!)) {
      events.push({ type: 'windowOpened', id: touched.id, index: state.next });
      state.lit.push({ word: touched.word, col: touched.col, row: touched.row });
      state.checkpoint = { col: touched.col, row: touched.row };
      state.floorRow = touched.row;
      state.next += 1;
      state.collected += 1;
      if (state.next >= tower.words.length) {
        state.windows = [];
        state.hazards = [];
        state.summitOpen = true;
        events.push({ type: 'summitOpened', towerId: tower.towerId });
      } else placeWindows(events);
    } else {
      touched.spent = true;
      tower.refusals += 1;
      events.push({ type: 'windowShut', id: touched.id });
      loseCourage(events);
    }
  };

  // ------------------------------------------------------------ hazards

  const spawnHazards = (events: StormCastleTowerEvent[]): void => {
    if (state.summitOpen || state.climber.restMs > 0) return;
    state.spawnMs -= STEP_MS;
    if (state.spawnMs > 1e-6) return;
    state.spawnMs += interval;
    const type: HazardType = rng.next() < 0.5 ? 'oil' : 'rock';
    let col = rng.int(COLUMNS);
    if (col === state.lastHazardCol) col = (col + 1 + rng.int(COLUMNS - 1)) % COLUMNS;
    state.lastHazardCol = col;
    state.hazardSerial += 1;
    const hazard: Hazard = { id: `h${state.hazardSerial}`, type, col, y: state.climber.row + TUNING.dropHeight };
    state.hazards.push(hazard);
    events.push({ type: 'hazardFell', hazard: { ...hazard } });
  };

  const fallHazards = (events: StormCastleTowerEvent[]): void => {
    const c = state.climber;
    const kept: Hazard[] = [];
    const restsBefore = state.rests;
    for (const h of state.hazards) {
      h.y -= (h.type === 'oil' ? TUNING.oilSpeed : TUNING.rockSpeed) * speedScale * DT;
      const hits = c.protectMs <= 0 && c.restMs <= 0 && h.col === c.col && Math.abs(h.y - c.row) < TUNING.hitRadius;
      if (hits) {
        state.hits += 1;
        c.row = Math.max(state.floorRow, c.row - 1);
        c.protectMs = TUNING.hitProtectMs;
        c.moveMs = 0;
        events.push({ type: 'climberHit', hazardId: h.id });
        loseCourage(events);
        if (state.rests !== restsBefore) break;
        continue;
      }
      if (h.y > state.floorRow - 1.5) kept.push(h);
    }
    // A rest in this loop cleared the list; keep that.
    if (state.rests === restsBefore) state.hazards = kept;
  };

  const reachSummit = (events: StormCastleTowerEvent[]): void => {
    if (state.summitOpen && state.climber.row >= state.summitRow) clearTower(events);
  };

  // ------------------------------------------------------------ the simulation

  // The first tower is set up at creation (the view reads the state before the first tick); its
  // events come with the first tick. A climb with no towers is over before it starts.
  const pending: StormCastleTowerEvent[] = [];
  if (shift.length === 0) state.phase = 'complete';
  else startTower(pending);

  return {
    get state() {
      return state;
    },
    dispatch(command) {
      if (state.phase !== 'playing') return [];
      if (command.type !== 'steer') return [];
      const x = Number.isFinite(command.x) ? command.x : 0;
      const z = Number.isFinite(command.z) ? command.z : 0;
      const len = Math.hypot(x, z);
      const scale = len > 1 ? 1 / len : 1;
      state.steer = { x: x * scale, z: z * scale };
      return [];
    },
    tick() {
      if (state.phase !== 'playing') return [];
      const events = pending.splice(0);
      state.timeMs += STEP_MS;
      moveClimber();
      touchWindows(events);
      reachSummit(events);
      if (state.phase !== 'playing') return events;
      spawnHazards(events);
      fallHazards(events);
      return events;
    },
    snapshot: () => structuredClone(state),
  };
}
