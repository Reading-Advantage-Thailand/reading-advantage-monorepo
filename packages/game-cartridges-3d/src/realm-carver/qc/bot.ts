/**
 * A bot that plays Realm Carver from the state alone (the QC driver and the tests use it). It
 * picks the beacon of the next word and a cut through it from claimed land to claimed land: a
 * straight run to the beacon, then on in the same direction or around a corner to the nearest
 * claimed land (beacons never share a row or a column, so a cut meets no other word). It walks the
 * claimed land to the start of the cut, waits while a forecast monster would meet the new trail,
 * and cuts. Call it at least every 150 ms (the carver's step time), as the QC driver does.
 */
import {
  BOARD_SIZE,
  DIRS,
  DIR_STEP,
  START,
  TUNING,
  beaconOfNext,
  stepMonster,
  type Cell,
  type Dir,
  type RealmCarverCommand,
  type RealmCarverState,
} from '../core/index.js';
import { STEP_MS } from '@reading-advantage/advantage-play-kit-3d/sim';

const inBounds = (c: Cell): boolean => c.col >= 0 && c.col < BOARD_SIZE && c.row >= 0 && c.row < BOARD_SIZE;
const same = (a: Cell, b: Cell): boolean => a.col === b.col && a.row === b.row;
const steerOf = (dir: Dir): RealmCarverCommand => ({ type: 'steer', x: DIR_STEP[dir].dc, z: DIR_STEP[dir].dr });
const STOP: RealmCarverCommand = { type: 'steer', x: 0, z: 0 };

function dirBetween(from: Cell, to: Cell): Dir {
  return DIRS.find((d) => from.col + DIR_STEP[d].dc === to.col && from.row + DIR_STEP[d].dr === to.row) ?? 'up';
}

interface Cut {
  dir: Dir;
  /** The claimed cell where the cut starts. */
  entry: Cell;
  /** The wild cells of the cut in order, ending before the claimed cell that closes it. */
  line: Cell[];
}

const stepFrom = (c: Cell, d: Dir): Cell => ({ col: c.col + DIR_STEP[d].dc, row: c.row + DIR_STEP[d].dr });
const perpendicular = (d: Dir): Dir[] => (d === 'up' || d === 'down' ? ['left', 'right'] : ['up', 'down']);

/** The wild cells from `from` (left out) along `dir` up to the first claimed cell, or null at a trail or an edge. */
function runTo(state: RealmCarverState, from: Cell, dir: Dir): Cell[] | null {
  const cells: Cell[] = [];
  let at = stepFrom(from, dir);
  for (;;) {
    if (!inBounds(at)) return null;
    const cell = state.grid[at.row]![at.col]!;
    if (cell === 'claimed') return cells;
    if (cell === 'trail') return null;
    cells.push(at);
    at = stepFrom(at, dir);
  }
}

/** Whether a run of cells meets a beacon other than the target. */
const meetsBeacon = (state: RealmCarverState, target: Cell, cells: readonly Cell[]): boolean =>
  state.beacons.some((b) => !same(b, target) && cells.some((c) => same(c, b)));

/**
 * The cuts through `target`: a straight run in `dir` from claimed land to the target, then on in
 * the same direction or around a corner to claimed land.
 */
function cutsThrough(state: RealmCarverState, target: Cell, dir: Dir): Cut[] {
  const back = runTo(state, target, dir === 'up' ? 'down' : dir === 'down' ? 'up' : dir === 'left' ? 'right' : 'left');
  if (!back) return [];
  const before = back.slice().reverse();
  const entry = stepFrom(before[0] ?? target, dir === 'up' ? 'down' : dir === 'down' ? 'up' : dir === 'left' ? 'right' : 'left');
  const cuts: Cut[] = [];
  for (const out of [dir, ...perpendicular(dir)]) {
    const after = runTo(state, target, out);
    if (!after) continue;
    const line = [...before, target, ...after];
    if (meetsBeacon(state, target, line)) continue;
    cuts.push({ dir, entry, line });
  }
  return cuts;
}

/** Ticks the carver needs until its next step, given the cooldown left (a step takes at least one tick). */
const ticksTo = (cooldownMs: number): number => Math.max(1, Math.ceil((cooldownMs - 1e-6) / STEP_MS));
/** Ticks between two carver steps (the cooldown rounded up to whole ticks). */
const TICKS_PER_CELL = Math.ceil((TUNING.carverMs - 1e-6) / STEP_MS);

/**
 * Whether a forecast monster would meet the trail of `line` when the carver walks `pathSteps` cells
 * on claimed land first and then cuts. Cell k of the line is trail from the tick the carver enters
 * it; a monster in that cell from then on is a hit (a margin covers a late call of the bot).
 */
function lineDanger(state: RealmCarverState, line: readonly Cell[], pathSteps: number): boolean {
  const monsters = state.monsters.map((m) => ({ ...m }));
  const interval = Math.max(TUNING.monsterMinMs, TUNING.monsterMs - TUNING.monsterSpeedUpMs * state.realm) + (state.helper ? TUNING.helperSlowMs : 0);
  const entry0 = (ticksTo(state.carver.cooldownMs) + (pathSteps > 0 ? TICKS_PER_CELL * pathSteps : 0)) * STEP_MS;
  const margin = 50 + 15 * pathSteps;
  const end = entry0 + line.length * TICKS_PER_CELL * STEP_MS + 150;
  const meets = (t: number): boolean =>
    monsters.some((m) => {
      const k = line.findIndex((c) => same(c, m));
      return k >= 0 && t >= entry0 + k * TICKS_PER_CELL * STEP_MS - margin;
    });
  for (let t = 0; t <= end; t += STEP_MS) {
    if (meets(t)) return true;
    for (const m of monsters) {
      m.waitMs -= STEP_MS;
      if (m.waitMs > 1e-6) continue;
      m.waitMs += interval;
      stepMonster(state.grid, m);
    }
  }
  return false;
}

/** The claimed-land path (4-neighbors) from `from` to `to`, or null. */
function walk(state: RealmCarverState, from: Cell, to: Cell): Cell[] | null {
  const parent = new Map<number, number>();
  const key = (c: Cell): number => c.row * BOARD_SIZE + c.col;
  const queue: Cell[] = [from];
  parent.set(key(from), -1);
  for (let i = 0; i < queue.length; i++) {
    const at = queue[i]!;
    if (same(at, to)) {
      const path: Cell[] = [];
      for (let k = key(at); k !== -1; k = parent.get(k)!) path.unshift({ col: k % BOARD_SIZE, row: Math.floor(k / BOARD_SIZE) });
      return path;
    }
    for (const d of DIRS) {
      const next = { col: at.col + DIR_STEP[d].dc, row: at.row + DIR_STEP[d].dr };
      if (!inBounds(next) || parent.has(key(next)) || state.grid[next.row]![next.col] !== 'claimed') continue;
      parent.set(key(next), key(at));
      queue.push(next);
    }
  }
  return null;
}

export function nextSteer(state: RealmCarverState): RealmCarverCommand | null {
  if (state.phase !== 'playing') return null;
  const target = beaconOfNext(state);
  if (!target) return null;
  const me = state.carver;
  // On the way: keep cutting in the same direction; at the beacon, choose how to leave.
  if (state.trail.length > 0) {
    const head = state.trail[state.trail.length - 1]!;
    const prev = state.trail.length > 1 ? state.trail[state.trail.length - 2]! : (me.origin ?? START);
    const heading = dirBetween(prev, head);
    const ray = (c: Cell): boolean => {
      const step = DIR_STEP[heading];
      return step.dc === 0 ? c.col === head.col && (c.row - head.row) * step.dr > 0 : c.row === head.row && (c.col - head.col) * step.dc > 0;
    };
    const reached = state.trail.some((c) => same(c, target));
    // On the way to the beacon, or past it: keep going.
    if (!same(head, target) && (reached || ray(target))) return steerOf(heading);
    let best: { dir: Dir; danger: boolean; length: number } | null = null;
    for (const out of [heading, ...perpendicular(heading)]) {
      const run = runTo(state, head, out);
      if (!run || (reached && meetsBeacon(state, target, run))) continue;
      const option = { dir: out, danger: lineDanger(state, run, 0), length: run.length };
      if (!best || (option.danger ? 1 : 0) < (best.danger ? 1 : 0) || (option.danger === best.danger && option.length < best.length)) best = option;
    }
    return steerOf(best?.dir ?? heading);
  }
  let best: { cut: Cut; path: Cell[]; danger: boolean; cost: number } | null = null;
  for (const dir of DIRS) {
    for (const cut of cutsThrough(state, target, dir)) {
      const path = walk(state, me, cut.entry);
      if (!path) continue;
      const danger = lineDanger(state, cut.line, path.length - 1);
      const cost = path.length + (danger ? 30 : 0) + cut.line.length * 0.3;
      if (!best || cost < best.cost) best = { cut, path, danger, cost };
    }
  }
  if (!best) return STOP;
  if (best.path.length > 1) return steerOf(dirBetween(best.path[0]!, best.path[1]!));
  // At the start of the cut: wait for a gap, but never for ever.
  if (best.danger && Math.floor(state.timeMs / 1000) % 10 !== 9) return STOP;
  return steerOf(best.cut.dir);
}
