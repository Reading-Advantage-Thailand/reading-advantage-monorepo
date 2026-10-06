/**
 * The Realm Carver 3D simulation: a real-time `Simulation` on the fixed step. Rules from
 * sections 2, 3, and 6 of docs/game-realm-carver-3d.md. The carver walks the board one cell at a
 * time. On claimed land it is safe. Walking into the wild draws a trail; walking back onto claimed
 * land closes the loop: the trail and every part of the wild that no monster can reach turn into
 * claimed land. Word beacons stand in the wild. Carving the beacon of the next word (it lies on
 * the trail or inside the claimed part) wins the word. Carving only other words costs courage.
 * A monster that touches the trail fades it and sends the carver back to the border, also at the
 * cost of courage. Courage never ends the game: the team rests, comes back, and goes on. No
 * timer decides a result.
 */
import { STEP_MS, createRng, type Rng, type Simulation } from '@reading-advantage/advantage-play-kit-3d/sim';
import { campaignOf, monsterKindsOf, type RealmCarverInput } from './content.js';
import {
  BOARD_SIZE,
  DIR_STEP,
  type Beacon,
  type Cell,
  type CellState,
  type Dir,
  type Monster,
  type RealmCarverCommand,
  type RealmCarverEvent,
  type RealmCarverState,
  type RealmSentence,
  type SetbackCause,
} from './types.js';

/** Where the carver starts each realm and returns after a rest: the middle of the near border. */
export const START: Cell = { col: 5, row: BOARD_SIZE - 1 };

/** Every tuning number of the game (section 6 of the design). */
export const TUNING = {
  /** The most realms in one campaign. */
  maxRealms: 4,
  maxCourage: 3,
  /** The carver steps one cell this often while a direction is held. */
  carverMs: 150,
  /** A monster steps one cell this often in the first realm; later realms are faster, Helper mode slower. */
  monsterMs: 280,
  monsterSpeedUpMs: 15,
  monsterMinMs: 190,
  helperSlowMs: 90,
  /** Monsters: 1 in the first realm, up to 3 (Helper mode up to 2). */
  monstersMax: 3,
  monstersHelperMax: 2,
  /** Word beacons shown at once: the next word and up to three after it. */
  window: 4,
  /** Beacons keep this far apart (in cells, Chebyshev) and never share a row or a column. */
  beaconSpacing: 3,
  beaconKeepOutMonster: 2,
  beaconKeepOutCarver: 3,
  /** Monsters start this far from the carver and from each other. */
  monsterKeepOutCarver: 5,
  monsterSpacing: 3,
  /** After a setback the carver waits this long. */
  setbackPauseMs: 500,
  /** When fewer wild cells than this remain, the wild grows back. */
  regrowBelow: 30,
  /** A stick shorter than this holds no direction. */
  deadZone: 0.35,
} as const;

export interface RealmCarverOptions {
  seed: number;
  helper: boolean;
}

export type RealmCarverSimulation = Simulation<RealmCarverState, RealmCarverCommand, RealmCarverEvent>;

/** Monsters in realm `realm` (zero-based). */
export function monsterCountFor(realm: number, helper: boolean): number {
  return helper ? Math.min(TUNING.monstersHelperMax, 1 + Math.floor(realm / 2)) : Math.min(TUNING.monstersMax, 1 + Math.ceil(realm / 2));
}

/** Milliseconds between two steps of a monster in realm `realm` (zero-based). */
export function monsterIntervalFor(realm: number, helper: boolean): number {
  return Math.max(TUNING.monsterMinMs, TUNING.monsterMs - TUNING.monsterSpeedUpMs * realm) + (helper ? TUNING.helperSlowMs : 0);
}

/** The direction a stick asks for, or null inside the dead zone. The stronger axis wins; vertical wins a tie. */
export function dirOfSteer(x: number, z: number): Dir | null {
  if (Math.hypot(x, z) < TUNING.deadZone) return null;
  if (Math.abs(z) >= Math.abs(x)) return z < 0 ? 'up' : 'down';
  return x < 0 ? 'left' : 'right';
}

const inBounds = (col: number, row: number): boolean => col >= 0 && col < BOARD_SIZE && row >= 0 && row < BOARD_SIZE;

/** The beacon of the word to carve next, or null. */
export function beaconOfNext(state: RealmCarverState): Beacon | null {
  return state.beacons.find((b) => b.index === state.next) ?? null;
}

/** The number of wild cells on the board. */
export function wildCount(grid: readonly (readonly CellState[])[]): number {
  let n = 0;
  for (const row of grid) for (const cell of row) if (cell === 'wild') n += 1;
  return n;
}

/** Every cell of the board in row order. */
export function cellsOf(): Cell[] {
  const cells: Cell[] = [];
  for (let row = 0; row < BOARD_SIZE; row++) for (let col = 0; col < BOARD_SIZE; col++) cells.push({ col, row });
  return cells;
}

/**
 * One step of a monster over `grid`: it moves one cell on the diagonal and bounces off claimed
 * land and the border (trail cells are open to it). Returns true when it moved. Pure but for the
 * monster; the bot forecasts monsters with it.
 */
export function stepMonster(grid: readonly (readonly CellState[])[], m: Pick<Monster, 'col' | 'row' | 'dc' | 'dr'>): boolean {
  const open = (col: number, row: number): boolean => inBounds(col, row) && grid[row]![col] !== 'claimed';
  const ox = open(m.col + m.dc, m.row);
  const oy = open(m.col, m.row + m.dr);
  const od = open(m.col + m.dc, m.row + m.dr);
  if (!(od && ox && oy)) {
    if (!ox && oy) m.dc = (-m.dc) as -1 | 1;
    else if (ox && !oy) m.dr = (-m.dr) as -1 | 1;
    else {
      m.dc = (-m.dc) as -1 | 1;
      m.dr = (-m.dr) as -1 | 1;
    }
  }
  if (open(m.col + m.dc, m.row + m.dr) && (open(m.col + m.dc, m.row) || open(m.col, m.row + m.dr))) {
    m.col += m.dc;
    m.row += m.dr;
    return true;
  }
  // A narrow place: slide along the open side.
  if (open(m.col, m.row + m.dr)) {
    m.row += m.dr;
    return true;
  }
  if (open(m.col + m.dc, m.row)) {
    m.col += m.dc;
    return true;
  }
  return false;
}

/** One step off a timer; float dust below a microsecond counts as zero. */
const countDown = (ms: number): number => (ms - STEP_MS < 1e-6 ? 0 : ms - STEP_MS);

const chebyshev = (a: Cell, b: Cell): number => Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row));

const freshGrid = (): CellState[][] =>
  Array.from({ length: BOARD_SIZE }, (_, row) =>
    Array.from({ length: BOARD_SIZE }, (_, col): CellState => (col === 0 || row === 0 || col === BOARD_SIZE - 1 || row === BOARD_SIZE - 1 ? 'claimed' : 'wild')),
  );

export function createRealmCarver(input: RealmCarverInput, options: RealmCarverOptions): RealmCarverSimulation {
  const rng: Rng = createRng(options.seed);
  const shift = campaignOf(input, rng, TUNING.maxRealms);

  const state: RealmCarverState = {
    phase: 'playing',
    helper: options.helper,
    timeMs: 0,
    shift,
    realm: 0,
    realms: shift.length,
    grid: freshGrid(),
    carver: { col: START.col, row: START.row, dir: null, origin: null, cooldownMs: 0 },
    trail: [],
    beacons: [],
    monsters: [],
    next: 0,
    courage: TUNING.maxCourage,
    maxCourage: TUNING.maxCourage,
    carved: 0,
    realmsCleared: 0,
    setbacks: 0,
    steer: { x: 0, z: 0 },
    beaconSeq: 0,
  };

  const current = (): RealmSentence => state.shift[state.realm]!;
  const wildCells = (): Cell[] => cellsOf().filter((c) => state.grid[c.row]![c.col] === 'wild');

  // ------------------------------------------------------------ beacons

  /** A wild cell for a beacon, with the strictest placement that still has a cell. */
  const pickBeaconCell = (skip: Beacon | null): Cell => {
    const others = state.beacons.filter((b) => b !== skip);
    const wild = wildCells();
    const apart = (c: Cell): boolean => others.every((b) => chebyshev(c, b) >= TUNING.beaconSpacing && c.col !== b.col && c.row !== b.row);
    const lines = (c: Cell): boolean => others.every((b) => c.col !== b.col && c.row !== b.row);
    const clear = (c: Cell): boolean =>
      state.monsters.every((m) => chebyshev(c, m) >= TUNING.beaconKeepOutMonster) && chebyshev(c, state.carver) >= TUNING.beaconKeepOutCarver;
    const tiers = [wild.filter((c) => apart(c) && clear(c)), wild.filter(apart), wild.filter(lines), wild];
    const tier = tiers.find((t) => t.length > 0) ?? cellsOf().filter((c) => state.grid[c.row]![c.col] !== 'claimed');
    return rng.pick(tier);
  };

  const spawnBeacon = (index: number): Beacon => {
    const at = pickBeaconCell(null);
    state.beaconSeq += 1;
    const beacon: Beacon = { id: `b${state.beaconSeq}`, index, word: current().words[index]!, col: at.col, row: at.row };
    state.beacons.push(beacon);
    return beacon;
  };

  /** Makes sure every word of the window has its beacon. */
  const syncBeacons = (events: RealmCarverEvent[] | null): void => {
    const words = current().words;
    for (let index = state.next; index < Math.min(words.length, state.next + TUNING.window); index++) {
      if (state.beacons.some((b) => b.index === index)) continue;
      const b = spawnBeacon(index);
      events?.push({ type: 'beaconAppeared', id: b.id, index });
    }
  };

  const relocate = (beacon: Beacon, events: RealmCarverEvent[]): void => {
    const at = pickBeaconCell(beacon);
    beacon.col = at.col;
    beacon.row = at.row;
    events.push({ type: 'beaconMoved', id: beacon.id });
  };

  // ------------------------------------------------------------ realms

  const startRealm = (events: RealmCarverEvent[]): void => {
    const sentence = current();
    state.grid = freshGrid();
    // A new realm waits for a new steer: a stick held across the border does not carve at once.
    state.steer = { x: 0, z: 0 };
    state.carver = { col: START.col, row: START.row, dir: null, origin: null, cooldownMs: 0 };
    state.trail = [];
    state.beacons = [];
    state.monsters = [];
    state.next = 0;
    state.courage = state.maxCourage;
    const count = monsterCountFor(state.realm, state.helper);
    const kinds = monsterKindsOf(rng, count);
    const interval = monsterIntervalFor(state.realm, state.helper);
    for (let i = 0; i < count; i++) {
      const wild = wildCells();
      const far = wild.filter(
        (c) => chebyshev(c, START) >= TUNING.monsterKeepOutCarver && state.monsters.every((m) => chebyshev(c, m) >= TUNING.monsterSpacing),
      );
      const at = rng.pick(far.length > 0 ? far : wild);
      state.monsters.push({
        id: `m${i + 1}`,
        kind: kinds[i]!,
        col: at.col,
        row: at.row,
        dc: rng.next() < 0.5 ? -1 : 1,
        dr: rng.next() < 0.5 ? -1 : 1,
        waitMs: (interval * (i + 1)) / (count + 1),
      });
    }
    syncBeacons(null);
    events.push({
      type: 'realmStarted',
      realmId: sentence.realmId,
      sentenceId: sentence.id,
      words: sentence.words.slice(),
      beacons: state.beacons.map(({ id, index, word, col, row }) => ({ id, index, word, col, row })),
      monsters: state.monsters.map(({ id, kind, col, row }) => ({ id, kind, col, row })),
    });
  };

  // ------------------------------------------------------------ courage

  /** A rest: courage is full again and the carver is back at the start. Never a game over. */
  const rest = (events: RealmCarverEvent[]): void => {
    state.courage = state.maxCourage;
    state.carver.col = START.col;
    state.carver.row = START.row;
    state.carver.origin = null;
    state.carver.cooldownMs = TUNING.setbackPauseMs;
    events.push({ type: 'rested' });
  };

  const hurt = (events: RealmCarverEvent[]): void => {
    state.courage -= 1;
    if (state.courage <= 0) rest(events);
  };

  const setback = (monster: Monster, cause: SetbackCause, events: RealmCarverEvent[]): void => {
    for (const c of state.trail) state.grid[c.row]![c.col] = 'wild';
    state.trail = [];
    const home = state.carver.origin ?? START;
    state.carver.col = home.col;
    state.carver.row = home.row;
    state.carver.origin = null;
    state.carver.cooldownMs = TUNING.setbackPauseMs;
    state.setbacks += 1;
    events.push({ type: 'setback', monsterId: monster.id, cause });
    hurt(events);
  };

  // ------------------------------------------------------------ claiming land

  /** Brings the wild back when little of it is left; the carver steps to the nearest border cell. */
  const regrowIfNeeded = (events: RealmCarverEvent[]): void => {
    if (wildCount(state.grid) >= TUNING.regrowBelow) return;
    state.grid = freshGrid();
    const c = state.carver;
    const toBorder: [number, () => void][] = [
      [c.col, () => (c.col = 0)],
      [BOARD_SIZE - 1 - c.col, () => (c.col = BOARD_SIZE - 1)],
      [c.row, () => (c.row = 0)],
      [BOARD_SIZE - 1 - c.row, () => (c.row = BOARD_SIZE - 1)],
    ];
    toBorder.reduce((best, entry) => (entry[0] < best[0] ? entry : best))[1]();
    events.push({ type: 'regrown' });
  };

  const closeTrail = (events: RealmCarverEvent[]): void => {
    const claimed: Cell[] = [...state.trail];
    for (const c of state.trail) state.grid[c.row]![c.col] = 'claimed';
    state.trail = [];
    state.carver.origin = null;
    // The wild a monster can reach stays wild; every other part of the wild is claimed.
    const reach = Array.from({ length: BOARD_SIZE }, () => Array<boolean>(BOARD_SIZE).fill(false));
    const queue: Cell[] = [];
    for (const m of state.monsters) {
      if (state.grid[m.row]![m.col] === 'claimed' || reach[m.row]![m.col]) continue;
      reach[m.row]![m.col] = true;
      queue.push({ col: m.col, row: m.row });
    }
    for (let i = 0; i < queue.length; i++) {
      const at = queue[i]!;
      for (const step of Object.values(DIR_STEP)) {
        const col = at.col + step.dc;
        const row = at.row + step.dr;
        if (!inBounds(col, row) || reach[row]![col] || state.grid[row]![col] !== 'wild') continue;
        reach[row]![col] = true;
        queue.push({ col, row });
      }
    }
    for (const c of cellsOf()) {
      if (state.grid[c.row]![c.col] === 'wild' && !reach[c.row]![c.col]) {
        state.grid[c.row]![c.col] = 'claimed';
        claimed.push(c);
      }
    }
    events.push({ type: 'landClaimed', cells: claimed });

    const sentence = current();
    const hit = state.beacons.filter((b) => state.grid[b.row]![b.col] === 'claimed').sort((a, b) => a.index - b.index);
    if (hit.length > 0) {
      sentence.started = true;
      const expected = sentence.words[state.next]!;
      const right = hit.find((b) => b.index === state.next) ?? hit.find((b) => b.word === expected);
      if (right) {
        // A beacon with the same word as the next one counts: they trade places.
        const standIn = state.beacons.find((b) => b.index === state.next);
        if (standIn && standIn !== right) {
          standIn.index = right.index;
          standIn.word = right.word;
        }
        state.beacons = state.beacons.filter((b) => b !== right);
        events.push({ type: 'wordCarved', id: right.id, index: state.next });
        state.next += 1;
        state.carved += 1;
        for (const other of hit) if (other !== right) relocate(other, events);
      } else {
        sentence.misses += 1;
        events.push({ type: 'wordMissed', id: hit[0]!.id, index: hit[0]!.index });
        for (const other of hit) relocate(other, events);
        hurt(events);
      }
    }
    if (state.next >= sentence.words.length) {
      sentence.cleared = true;
      state.realmsCleared += 1;
      state.beacons = [];
      events.push({ type: 'realmCleared', realmId: sentence.realmId, sentenceId: sentence.id });
      if (state.realm + 1 >= state.realms) {
        state.phase = 'complete';
        events.push({ type: 'campaignComplete', realms: state.realmsCleared });
        return;
      }
      state.realm += 1;
      startRealm(events);
      return;
    }
    syncBeacons(events);
    regrowIfNeeded(events);
  };

  // ------------------------------------------------------------ movement

  const stepCarver = (events: RealmCarverEvent[]): void => {
    const c = state.carver;
    c.cooldownMs = countDown(c.cooldownMs);
    if (!c.dir || c.cooldownMs > 0) return;
    const step = DIR_STEP[c.dir];
    const col = c.col + step.dc;
    const row = c.row + step.dr;
    if (!inBounds(col, row)) return;
    const cell = state.grid[row]![col]!;
    // The carver never crosses its own trail.
    if (cell === 'trail') return;
    c.cooldownMs = TUNING.carverMs;
    if (cell === 'wild') {
      if (state.trail.length === 0) c.origin = { col: c.col, row: c.row };
      c.col = col;
      c.row = row;
      state.grid[row]![col] = 'trail';
      state.trail.push({ col, row });
      const monster = state.monsters.find((m) => m.col === col && m.row === row);
      if (monster) setback(monster, 'monster-carver', events);
      return;
    }
    c.col = col;
    c.row = row;
    if (state.trail.length > 0) closeTrail(events);
  };

  const stepMonsters = (events: RealmCarverEvent[]): void => {
    const interval = monsterIntervalFor(state.realm, state.helper);
    for (const m of state.monsters) {
      m.waitMs -= STEP_MS;
      if (m.waitMs > 1e-6) continue;
      m.waitMs += interval;
      if (!stepMonster(state.grid, m)) continue;
      if (state.grid[m.row]![m.col] === 'trail') {
        setback(m, 'monster-trail', events);
        return;
      }
    }
  };

  // ------------------------------------------------------------ the simulation

  // The first realm is set up at creation (the view reads the state before the first tick); its
  // `realmStarted` event comes with the first tick. A campaign with no realms is over before it starts.
  const pending: RealmCarverEvent[] = [];
  if (shift.length === 0) state.phase = 'complete';
  else startRealm(pending);

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
      state.carver.dir = dirOfSteer(state.steer.x, state.steer.z);
      return [];
    },
    tick() {
      if (state.phase !== 'playing') return [];
      const events = pending.splice(0);
      state.timeMs += STEP_MS;
      stepCarver(events);
      if (state.phase === 'playing') stepMonsters(events);
      return events;
    },
    snapshot: () => structuredClone(state),
  };
}
