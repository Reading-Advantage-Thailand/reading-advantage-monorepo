/** Shared helpers of the Rune Match core tests: story fixtures, board setup, and the bot run. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseStoryInput, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import {
  createRuneMatch,
  findLines,
  keyOf,
  type Cell,
  type Rune,
  type RuneMatchEvent,
  type RuneMatchSimulation,
} from '../../src/rune-match/core/index.js';
import { nextSwap } from '../../src/rune-match/qc/bot.js';

const STORIES_DIR = join(process.cwd(), 'tests', 'fixtures', 'stories');

/** Every story of the demo, in selector order. */
export const STORY_IDS = [
  'pip-is-brave',
  'squeaky-the-small-mouse',
  'pip-and-the-red-car',
  'fun-day-at-the-beach',
  'pips-happy-night',
  'pip-sees-colors',
  'the-new-student',
  'the-school-garden',
];

export const loadStory = (id: string): StoryInput =>
  parseStoryInput(JSON.parse(readFileSync(join(STORIES_DIR, id, 'story.json'), 'utf8')), id);

export const STORY = loadStory('pip-is-brave');
export const SHORT_STORY = loadStory('the-school-garden');

export const create = (seed = 7, helper = false, story: StoryInput = STORY): RuneMatchSimulation =>
  createRuneMatch(story, { seed, helper });

export const ofType = <T extends RuneMatchEvent['type']>(events: readonly RuneMatchEvent[], type: T) =>
  events.filter((e): e is Extract<RuneMatchEvent, { type: T }> => e.type === type);

export const types = (events: readonly RuneMatchEvent[]) => events.map((e) => e.type);

/** A swap of neighbors that makes no line, or null. */
export function findWrongSwap(board: Rune[][]): { a: Cell; b: Cell } | null {
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[0]!.length; col++) {
      for (const b of [
        { row, col: col + 1 },
        { row: row + 1, col },
      ]) {
        if (b.row >= board.length || b.col >= board[0]!.length) continue;
        const a = { row, col };
        const ra = board[a.row]![a.col]!;
        const rb = board[b.row]![b.col]!;
        board[a.row]![a.col] = rb;
        board[b.row]![b.col] = ra;
        const none = findLines(board).length === 0;
        board[a.row]![a.col] = ra;
        board[b.row]![b.col] = rb;
        if (none) return { a, b };
      }
    }
  }
  return null;
}

/** Sends one wrong swap (no line) and returns its events. */
export function wrongSwap(sim: RuneMatchSimulation): RuneMatchEvent[] {
  const move = findWrongSwap(sim.state.board);
  if (!move) throw new Error('no wrong swap on this board');
  return sim.dispatch({ type: 'swap', ...move });
}

let arranged = 0;

/** Writes a rune of `key` (a word id, 'heal', or 'shield') into a cell of the live board. */
export function put(sim: RuneMatchSimulation, cell: Cell, key: string): Rune {
  arranged += 1;
  const rune: Rune =
    key === 'heal' || key === 'shield'
      ? { id: `t${arranged}`, kind: key }
      : { id: `t${arranged}`, kind: 'word', wordId: key, text: sim.state.targets.find((t) => t.id === key)?.translation ?? key };
  sim.state.board[cell.row]![cell.col] = rune;
  return rune;
}

/** A key that is on the board but is none of `avoid` (a filler for arranged rows). */
export function otherKey(sim: RuneMatchSimulation, avoid: readonly string[]): string {
  const keys = new Set(sim.state.board.flat().map(keyOf));
  for (const t of sim.state.targets) keys.add(t.id);
  keys.add('heal');
  keys.add('shield');
  const key = [...keys].find((k) => !avoid.includes(k));
  if (!key) throw new Error('no other key');
  return key;
}

/**
 * Fills the whole board with a line-free checker of three keys, then writes `cells` with `key`.
 * The board has no line afterwards unless `cells` make one. Returns the three filler keys.
 */
export function arrange(sim: RuneMatchSimulation, cells: readonly Cell[], key: string): string[] {
  const fillers = [otherKey(sim, [key]), '', ''];
  fillers[1] = otherKey(sim, [key, fillers[0]!]);
  fillers[2] = otherKey(sim, [key, fillers[0]!, fillers[1]!]);
  for (let row = 0; row < sim.state.rows; row++)
    for (let col = 0; col < sim.state.cols; col++) put(sim, { row, col }, fillers[(col + 2 * row) % 3]!);
  for (const cell of cells) put(sim, cell, key);
  if (findLines(sim.state.board).length > 0) throw new Error('arrange made a line');
  return fillers;
}

/** Plays the run to the end with the bot; returns every event. */
export function playToEnd(sim: RuneMatchSimulation, limit = 400): RuneMatchEvent[] {
  const events: RuneMatchEvent[] = [...sim.dispatch({ type: 'start' })];
  for (let i = 0; i < limit && sim.state.phase === 'playing'; i++) {
    const c = nextSwap(sim.state);
    if (!c) throw new Error(`the bot found no target move at swap ${i}`);
    events.push(...sim.dispatch(c));
  }
  return events;
}
