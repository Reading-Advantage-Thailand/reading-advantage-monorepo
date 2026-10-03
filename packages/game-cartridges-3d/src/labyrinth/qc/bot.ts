/**
 * A bot that plays the Labyrinth from the state alone (the QC driver and the tests use it): it
 * walks the hero along the shortest path to the right orb (to the gate once it is open) by a
 * breadth-first search on the maze. It ignores goblins; a bump only costs time. Call it a few
 * times per second: it names the direction to take from the cell the hero reaches next.
 */
import {
  cellIndex,
  distancesFrom,
  exitsOf,
  neighborOf,
  rightOrbOf,
  sameCell,
  type Dir,
  type LabyrinthCommand,
  type LabyrinthState,
} from '../core/index.js';

export function nextTurn(state: LabyrinthState): LabyrinthCommand | null {
  if (state.phase !== 'playing') return null;
  const target = state.gateOpen ? state.maze.gate : rightOrbOf(state)?.cell;
  if (!target) return null;
  const from = state.hero.next ?? state.hero.cell;
  if (sameCell(from, target)) return null;
  const dist = distancesFrom(state.maze, target);
  let best: { dir: Dir; d: number } | null = null;
  for (const dir of exitsOf(state.maze, from)) {
    const d = dist[cellIndex(state.maze, neighborOf(from, dir))]!;
    if (!best || d < best.d) best = { dir, d };
  }
  return best ? { type: 'turn', dir: best.dir } : null;
}
