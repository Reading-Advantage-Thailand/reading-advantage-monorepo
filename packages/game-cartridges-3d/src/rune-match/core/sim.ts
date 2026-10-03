/**
 * The Rune Match simulation: a turn `Simulation` (`tick` returns []). Rules from sections 2, 3,
 * and 6 of docs/game-rune-match-3d.md: a seeded board with no line at the start, a swap of two
 * neighbors, lines of 3 or more of one kind burst, runes fall and refill, cascades repeat, the
 * target word's line makes a hero strike, a swap with no line is swapped back and the monster
 * strikes (courage -1, a shield blocks it, at 0 the team rests back to 3), and after every
 * settled board there is a swap that makes the target's line. There is no game over.
 *
 * Event order per swap (the view animates them in this order):
 *   no line:  swapped, swapped (back), monsterStrike, [rest], [runesFell (placed)]
 *   lines:    swapped, then per cascade: linesBurst, [heal], [shield],
 *             [heroStrike, [monsterDefeated, [monsterAppeared]], [targetShown]], runesFell;
 *             then [runesFell (placed)] or victory
 */
import { createRng, type Rng, type Simulation } from '@reading-advantage/advantage-play-kit-3d/sim';
import { monstersOf, paletteOf, targetsOf, type RuneMatchInput } from './content.js';
import {
  HEROES,
  type Cell,
  type Monster,
  type Rune,
  type RuneMatchCommand,
  type RuneMatchEvent,
  type RuneMatchState,
  type TargetWord,
} from './types.js';

/** Every tuning number of the game. */
export const TUNING = {
  /** The board: 8 rows of 6 runes; 6 rows of 6 in Helper mode. */
  rows: 8,
  cols: 6,
  helperRows: 6,
  helperCols: 6,
  /** Decoy meanings on the board next to the target's meaning. */
  decoys: 5,
  helperDecoys: 3,
  /** The chance a new rune is a heal or a shield rune (half each). */
  powerRuneChance: 0.12,
  /** Coins per rune of a line, multiplied by the cascade number plus one. */
  coinsPerRune: 10,
  /** Target words per monster; the fire dragon takes every word after the second monster. */
  wordsPerMonster: 4,
  maxCourage: 5,
  restCourage: 3,
  /** Every target line takes this from the monster; its HP counts the words it guards. */
  heroDamage: 1,
  /** Cascade steps and board regenerations are bounded, never endless. */
  maxCascades: 50,
  maxRebuilds: 8,
} as const;

export interface RuneMatchOptions {
  seed: number;
  helper: boolean;
}

export type RuneMatchSimulation = Simulation<RuneMatchState, RuneMatchCommand, RuneMatchEvent>;

/** A line of 3 or more runes of one kind; `kind` is the word id, 'heal', or 'shield'. */
export interface Line {
  cells: Cell[];
  kind: string;
}

// ---------------------------------------------------------------- board helpers (pure)

/** The match key of a rune: the word id of a word rune, else its kind. */
export const keyOf = (rune: Rune): string => (rune.kind === 'word' ? rune.wordId! : rune.kind);

export const isNeighbor = (a: Cell, b: Cell): boolean =>
  Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;

const inside = (board: Rune[][], c: Cell): boolean =>
  Number.isInteger(c.row) &&
  Number.isInteger(c.col) &&
  c.row >= 0 &&
  c.row < board.length &&
  c.col >= 0 &&
  c.col < (board[0]?.length ?? 0);

const swapCells = (board: Rune[][], a: Cell, b: Cell): void => {
  const t = board[a.row]![a.col]!;
  board[a.row]![a.col] = board[b.row]![b.col]!;
  board[b.row]![b.col] = t;
};

/** Every horizontal and vertical run of 3 or more runes of one key, in reading order. */
export function findLines(board: Rune[][]): Line[] {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const lines: Line[] = [];
  const scan = (cellAt: (i: number, j: number) => Cell, outer: number, inner: number): void => {
    for (let i = 0; i < outer; i++) {
      let start = 0;
      for (let j = 1; j <= inner; j++) {
        const same =
          j < inner && keyOf(board[cellAt(i, j).row]![cellAt(i, j).col]!) === keyOf(board[cellAt(i, start).row]![cellAt(i, start).col]!);
        if (same) continue;
        if (j - start >= 3) {
          const cells: Cell[] = [];
          for (let k = start; k < j; k++) cells.push(cellAt(i, k));
          lines.push({ cells, kind: keyOf(board[cells[0]!.row]![cells[0]!.col]!) });
        }
        start = j;
      }
    }
  };
  scan((r, c) => ({ row: r, col: c }), rows, cols);
  scan((c, r) => ({ row: r, col: c }), cols, rows);
  return lines;
}

/** The longest run through `cell` (horizontal or vertical) of the cell's own key. */
function runThrough(board: Rune[][], cell: Cell): number {
  const key = keyOf(board[cell.row]![cell.col]!);
  const count = (dr: number, dc: number): number => {
    let n = 0;
    for (let r = cell.row + dr, c = cell.col + dc; inside(board, { row: r, col: c }); r += dr, c += dc) {
      if (keyOf(board[r]![c]!) !== key) break;
      n += 1;
    }
    return n;
  };
  return Math.max(1 + count(0, -1) + count(0, 1), 1 + count(-1, 0) + count(1, 0));
}

/**
 * The first swap of neighbors (in reading order, right then down) that makes a line of
 * `wordId`, or null. The bot plays it; the core uses it for the guarantee.
 */
export function findTargetMove(board: Rune[][], wordId: string): { a: Cell; b: Cell } | null {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const a = { row, col };
      for (const b of [
        { row, col: col + 1 },
        { row: row + 1, col },
      ]) {
        if (!inside(board, b) || keyOf(board[a.row]![a.col]!) === keyOf(board[b.row]![b.col]!)) continue;
        swapCells(board, a, b);
        const made = [a, b].some((c) => keyOf(board[c.row]![c.col]!) === wordId && runThrough(board, c) >= 3);
        swapCells(board, a, b);
        if (made) return { a, b };
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------- the simulation

export function createRuneMatch(input: RuneMatchInput, options: RuneMatchOptions): RuneMatchSimulation {
  const rng: Rng = createRng(options.seed);
  const targets = targetsOf(input, rng);
  const monsters = monstersOf(targets.length, TUNING.wordsPerMonster);
  const decoys = options.helper ? TUNING.helperDecoys : TUNING.decoys;
  const first = targets[0];

  const state: RuneMatchState = {
    phase: first ? 'playing' : 'victory',
    helper: options.helper,
    rows: options.helper ? TUNING.helperRows : TUNING.rows,
    cols: options.helper ? TUNING.helperCols : TUNING.cols,
    board: [],
    targets,
    targetIndex: 0,
    targetCount: targets.length,
    target: first ? { itemId: first.id, term: first.term } : null,
    palette: first ? paletteOf(targets, first.id, decoys, rng) : [],
    monster: monsters[0] ? { ...monsters[0] } : null,
    monsterIndex: 0,
    courage: TUNING.maxCourage,
    maxCourage: TUNING.maxCourage,
    shield: false,
    coins: 0,
    heroTurn: 0,
    swaps: 0,
    started: false,
    spawned: 0,
  };

  const wordById = new Map(targets.map((t) => [t.id, t]));
  const currentTarget = (): TargetWord | null => state.targets[state.targetIndex] ?? null;

  // ------------------------------------------------------------ runes

  const makeRune = (key: string): Rune => {
    state.spawned += 1;
    const id = `r${state.spawned}`;
    if (key === 'heal' || key === 'shield') return { id, kind: key };
    return { id, kind: 'word', wordId: key, text: wordById.get(key)!.translation };
  };

  /** A new rune whose key is not in `forbid`: a heal or shield rune sometimes, else a palette word. */
  const drawRune = (forbid: ReadonlySet<string> = new Set()): Rune => {
    const words = state.palette.filter((id) => !forbid.has(id));
    const powers = ['heal', 'shield'].filter((k) => !forbid.has(k));
    const power = powers.length > 0 && (words.length === 0 || rng.next() < TUNING.powerRuneChance);
    return makeRune(power ? rng.pick(powers) : rng.pick(words));
  };

  /** A rune for `cell` that makes no line with the two runes to its left or above it. */
  const drawNoLine = (board: Rune[][], cell: Cell): Rune => {
    const forbid = new Set<string>();
    const row = board[cell.row]!;
    if (cell.col >= 2 && keyOf(row[cell.col - 1]!) === keyOf(row[cell.col - 2]!)) forbid.add(keyOf(row[cell.col - 1]!));
    if (cell.row >= 2) {
      const up = board[cell.row - 1]![cell.col]!;
      if (keyOf(up) === keyOf(board[cell.row - 2]![cell.col]!)) forbid.add(keyOf(up));
    }
    return drawRune(forbid);
  };

  /** A whole board with no line. */
  const freshBoard = (): Rune[][] => {
    const board: Rune[][] = [];
    for (let row = 0; row < state.rows; row++) {
      board.push([]);
      for (let col = 0; col < state.cols; col++) board[row]!.push(drawNoLine(board, { row, col }));
    }
    return board;
  };

  // ------------------------------------------------------------ the guaranteed target move

  /** Every way to write three target runes so that one swap makes a line: two in a row and one beside the gap. */
  const placements = (): { fill: Cell[]; gap: Cell }[] => {
    const out: { fill: Cell[]; gap: Cell }[] = [];
    const add = (triple: Cell[], gapIndex: number, across: Cell[]): void => {
      const gap = triple[gapIndex]!;
      const rest = triple.filter((_, i) => i !== gapIndex);
      for (const n of across) if (n.row >= 0 && n.row < state.rows && n.col >= 0 && n.col < state.cols) out.push({ fill: [...rest, n], gap });
    };
    for (let row = 0; row < state.rows; row++)
      for (let col = 0; col + 2 < state.cols; col++)
        for (let g = 0; g < 3; g++) {
          const triple = [0, 1, 2].map((i) => ({ row, col: col + i }));
          add(triple, g, [{ row: row - 1, col: col + g }, { row: row + 1, col: col + g }]);
        }
    for (let col = 0; col < state.cols; col++)
      for (let row = 0; row + 2 < state.rows; row++)
        for (let g = 0; g < 3; g++) {
          const triple = [0, 1, 2].map((i) => ({ row: row + i, col }));
          add(triple, g, [{ row: row + g, col: col - 1 }, { row: row + g, col: col + 1 }]);
        }
    return out;
  };

  /** Writes target runes into one placement of `board` that leaves no line; returns the changed cells or null. */
  const tryPlace = (board: Rune[][], wordId: string): { cell: Cell; rune: Rune }[] | null => {
    const options = placements();
    const start = rng.int(options.length);
    for (let i = 0; i < options.length; i++) {
      const { fill } = options[(start + i) % options.length]!;
      const changed = fill.filter((c) => keyOf(board[c.row]![c.col]!) !== wordId);
      const saved = changed.map((c) => board[c.row]![c.col]!);
      const placed = changed.map((cell) => ({ cell, rune: makeRune(wordId) }));
      for (const p of placed) board[p.cell.row]![p.cell.col] = p.rune;
      if (findLines(board).length === 0 && findTargetMove(board, wordId)) return placed;
      changed.forEach((c, k) => (board[c.row]![c.col] = saved[k]!));
    }
    return null;
  };

  /** Makes sure a swap makes the target's line: places target runes, or rebuilds the board. */
  const ensureTargetMove = (events: RuneMatchEvent[]): void => {
    const target = state.target;
    if (!target || findTargetMove(state.board, target.itemId)) return;
    const placed = tryPlace(state.board, target.itemId);
    if (placed) {
      events.push({ type: 'runesFell', moves: [], runes: placed });
      return;
    }
    for (let attempt = 0; attempt < TUNING.maxRebuilds; attempt++) {
      const board = freshBoard();
      const again = findTargetMove(board, target.itemId) ? [] : tryPlace(board, target.itemId);
      if (!again) continue;
      state.board = board;
      const runes: { cell: Cell; rune: Rune }[] = [];
      board.forEach((row, r) => row.forEach((rune, c) => runes.push({ cell: { row: r, col: c }, rune })));
      events.push({ type: 'runesFell', moves: [], runes });
      return;
    }
    throw new Error(`rune match: no board with a move for ${target.itemId}`);
  };

  // ------------------------------------------------------------ bursts and falls

  /** Removes `cells`, drops the runes above them, and fills the top with new runes. */
  const fall = (cells: readonly Cell[], events: RuneMatchEvent[]): void => {
    const gone = new Set(cells.map((c) => `${c.row}:${c.col}`));
    const moves: { from: Cell; to: Cell }[] = [];
    const runes: { cell: Cell; rune: Rune }[] = [];
    for (let col = 0; col < state.cols; col++) {
      const survivors: { rune: Rune; row: number }[] = [];
      for (let row = state.rows - 1; row >= 0; row--) {
        if (!gone.has(`${row}:${col}`)) survivors.push({ rune: state.board[row]![col]!, row });
      }
      for (let row = state.rows - 1; row >= 0; row--) {
        const next = survivors.shift();
        if (next) {
          state.board[row]![col] = next.rune;
          if (next.row !== row) moves.push({ from: { row: next.row, col }, to: { row, col } });
        } else {
          const rune = drawRune();
          state.board[row]![col] = rune;
          runes.push({ cell: { row, col }, rune });
        }
      }
    }
    events.push({ type: 'runesFell', moves, runes });
  };

  const nextMonster = (events: RuneMatchEvent[]): void => {
    state.monsterIndex += 1;
    const next = monsters[state.monsterIndex];
    state.monster = next ? { ...next } : null;
    if (next) events.push({ type: 'monsterAppeared', kind: next.kind });
  };

  /** The target's line burst: a hero strikes, the monster may fall, the next word comes up. */
  const strike = (word: TargetWord, events: RuneMatchEvent[]): void => {
    word.solved = true;
    if (word.attempts === 0) {
      // A cascade made the line before the student swapped for this word: one correct try.
      word.attempts = 1;
      word.correctFirstTry = true;
    }
    const hero = HEROES[state.heroTurn % HEROES.length]!;
    state.heroTurn += 1;
    events.push({ type: 'heroStrike', hero, damage: TUNING.heroDamage });
    const monster: Monster | null = state.monster;
    if (monster) {
      monster.hp = Math.max(0, monster.hp - TUNING.heroDamage);
      if (monster.hp === 0) {
        events.push({ type: 'monsterDefeated', kind: monster.kind });
        nextMonster(events);
      }
    }
    state.targetIndex += 1;
    const next = currentTarget();
    state.target = next ? { itemId: next.id, term: next.term } : null;
    if (next) {
      if (!state.palette.includes(next.id)) state.palette[state.palette.indexOf(word.id)] = next.id;
      events.push({ type: 'targetShown', itemId: next.id, term: next.term });
    }
  };

  /** One cascade step: the lines burst (coins, heal, shield, the strike), then the runes fall. */
  const burst = (lines: Line[], cascade: number, events: RuneMatchEvent[]): void => {
    const seen = new Set<string>();
    const cells: Cell[] = [];
    for (const c of lines.flatMap((l) => l.cells)) {
      const k = `${c.row}:${c.col}`;
      if (!seen.has(k)) {
        seen.add(k);
        cells.push(c);
      }
    }
    const word = currentTarget();
    const target = word !== null && lines.some((l) => l.kind === word.id);
    const coins = lines.reduce((sum, l) => sum + l.cells.length * TUNING.coinsPerRune, 0) * (cascade + 1);
    state.coins += coins;
    events.push({ type: 'linesBurst', cascade, cells, kinds: lines.map((l) => l.kind), target, coins });
    const heals = lines.filter((l) => l.kind === 'heal').length;
    if (heals > 0 && state.courage < state.maxCourage) {
      state.courage = Math.min(state.maxCourage, state.courage + heals);
      events.push({ type: 'heal', courage: state.courage });
    }
    if (lines.some((l) => l.kind === 'shield') && !state.shield) {
      state.shield = true;
      events.push({ type: 'shield' });
    }
    if (target && word) strike(word, events);
    fall(cells, events);
  };

  const monsterStrike = (events: RuneMatchEvent[]): void => {
    if (state.shield) {
      state.shield = false;
      events.push({ type: 'monsterStrike', blocked: true, courage: state.courage });
      return;
    }
    state.courage = Math.max(0, state.courage - 1);
    events.push({ type: 'monsterStrike', blocked: false, courage: state.courage });
    if (state.courage === 0) {
      state.courage = TUNING.restCourage;
      events.push({ type: 'rest', courage: state.courage });
    }
  };

  // ------------------------------------------------------------ commands

  const start = (): RuneMatchEvent[] => {
    if (state.started) return [];
    state.started = true;
    const events: RuneMatchEvent[] = [];
    if (state.monster) events.push({ type: 'monsterAppeared', kind: state.monster.kind });
    if (state.target) events.push({ type: 'targetShown', ...state.target });
    return events;
  };

  const swap = (a: Cell, b: Cell): RuneMatchEvent[] => {
    const events: RuneMatchEvent[] = [];
    if (!inside(state.board, a) || !inside(state.board, b) || !isNeighbor(a, b)) {
      events.push({ type: 'swapRejected', a, b });
      return events;
    }
    a = { row: a.row, col: a.col };
    b = { row: b.row, col: b.col };
    state.swaps += 1;
    swapCells(state.board, a, b);
    events.push({ type: 'swapped', a, b });
    let lines = findLines(state.board);
    if (lines.length === 0) {
      swapCells(state.board, a, b);
      events.push({ type: 'swapped', a: b, b: a });
      monsterStrike(events);
      ensureTargetMove(events);
      return events;
    }
    const word = currentTarget()!;
    word.attempts += 1;
    if (word.attempts === 1) word.correctFirstTry = lines.some((l) => l.kind === word.id);
    for (let cascade = 0; lines.length > 0 && cascade < TUNING.maxCascades; cascade++) {
      burst(lines, cascade, events);
      lines = findLines(state.board);
    }
    if (state.target === null) {
      state.phase = 'victory';
      events.push({ type: 'victory' });
      return events;
    }
    ensureTargetMove(events);
    return events;
  };

  // ------------------------------------------------------------ the first board

  if (state.phase === 'playing') {
    state.board = freshBoard();
    ensureTargetMove([]);
  }

  return {
    get state() {
      return state;
    },
    dispatch(command) {
      if (state.phase !== 'playing') return [];
      switch (command.type) {
        case 'start':
          return start();
        case 'swap':
          return swap(command.a, command.b);
        default:
          return [];
      }
    },
    tick: () => [],
    snapshot: () => structuredClone(state),
  };
}
