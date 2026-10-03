/**
 * A bot that plays Rune Match from the state alone (the QC driver and the tests use it): it
 * swaps the first pair of neighbors that makes a line of the target word. The core guarantees
 * such a swap after every settled board, so the bot returns null only when the run is over.
 */
import { findTargetMove, type RuneMatchCommand, type RuneMatchState } from '../core/index.js';

export function nextSwap(state: RuneMatchState): RuneMatchCommand | null {
  if (state.phase !== 'playing' || !state.target) return null;
  const move = findTargetMove(state.board, state.target.itemId);
  return move ? { type: 'swap', a: move.a, b: move.b } : null;
}
