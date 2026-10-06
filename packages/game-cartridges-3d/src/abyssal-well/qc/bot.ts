/**
 * A bot that plays Abyssal Well from the state alone, through the public commands (the QC driver
 * and the tests use it): it shoots the lane of the enemy that holds the next word. It returns
 * null only when the run is over.
 */
import { nextEnemyOf, type AbyssalWellCommand, type AbyssalWellState } from '../core/index.js';

export function nextCommand(state: AbyssalWellState): AbyssalWellCommand | null {
  if (state.phase !== 'playing') return null;
  if (!state.started) return { type: 'start' };
  const next = nextEnemyOf(state);
  return next ? { type: 'fire', lane: next.lane } : null;
}
