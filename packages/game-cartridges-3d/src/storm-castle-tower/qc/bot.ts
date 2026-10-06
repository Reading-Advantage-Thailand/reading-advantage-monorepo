/**
 * A bot that plays Storm Castle Tower from the state alone (the QC driver and the tests use it):
 * it climbs to the window that holds the next word (or to the top when the sentence is built),
 * never steps into a wrong window, and steps aside when oil or a rock falls in its column. Call
 * it a few times per second; it returns one public command, or null when the team cannot act.
 */
import { COLUMNS, hazardsThreaten, rightWindowsOf, type StormCastleTowerCommand, type StormCastleTowerState } from '../core/index.js';

/** The four steps the bot may take, then standing still. */
const STEPS = [
  { dc: 0, dr: 1 },
  { dc: -1, dr: 0 },
  { dc: 1, dr: 0 },
  { dc: 0, dr: -1 },
  { dc: 0, dr: 0 },
] as const;

/** The steps of every cell to the goal around the wrong windows (a breadth-first search from the goal cells). */
function stepsToGoal(goals: readonly { col: number; row: number }[], minRow: number, maxRow: number, blocked: (col: number, row: number) => boolean): Map<string, number> {
  const key = (col: number, row: number): string => `${col},${row}`;
  const dist = new Map<string, number>();
  const queue: { col: number; row: number }[] = [];
  for (const g of goals) {
    dist.set(key(g.col, g.row), 0);
    queue.push(g);
  }
  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i]!;
    const d = dist.get(key(cell.col, cell.row))!;
    for (const step of STEPS) {
      if (step.dc === 0 && step.dr === 0) continue;
      const col = cell.col + step.dc;
      const row = cell.row + step.dr;
      if (col < 0 || col >= COLUMNS || row < minRow || row > maxRow || blocked(col, row) || dist.has(key(col, row))) continue;
      dist.set(key(col, row), d + 1);
      queue.push({ col, row });
    }
  }
  return dist;
}

export function nextCommand(state: StormCastleTowerState): StormCastleTowerCommand | null {
  if (state.phase !== 'playing') return null;
  const c = state.climber;
  if (c.restMs > 0) return null;
  const right = rightWindowsOf(state);
  const rightIds = new Set(right.map((w) => w.id));
  const maxRow = state.summitOpen ? state.summitRow : state.windowRow;
  const goals = state.summitOpen ? Array.from({ length: COLUMNS }, (_, col) => ({ col, row: state.summitRow })) : right.map((w) => ({ col: w.col, row: w.row }));
  if (goals.length === 0) return null;
  const wrong = state.windows.filter((w) => !rightIds.has(w.id) && !w.spent);
  const dist = stepsToGoal(goals, state.floorRow, maxRow, (col, row) => wrong.some((w) => w.col === col && w.row === row));
  const safe = (col: number, row: number): boolean => c.protectMs > 0 || !hazardsThreaten(state.hazards, col, row);

  let best: { dc: number; dr: number; cost: number } | null = null;
  for (const step of STEPS) {
    const col = c.col + step.dc;
    const row = c.row + step.dr;
    const distance = dist.get(`${col},${row}`);
    if (distance === undefined) continue;
    const cost = distance + (safe(col, row) ? 0 : 100) + (step.dc === 0 && step.dr === 0 ? 0.25 : 0);
    if (best === null || cost < best.cost) best = { ...step, cost };
  }
  if (best === null) return { type: 'steer', x: 0, z: 0 };
  return { type: 'steer', x: best.dc, z: -best.dr };
}
