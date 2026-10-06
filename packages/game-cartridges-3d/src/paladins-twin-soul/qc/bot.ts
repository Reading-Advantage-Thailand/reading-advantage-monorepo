/**
 * A bot that plays Paladin's Twin Soul from the state alone (the QC driver and the tests use it):
 * it strikes the shade that holds the target's term. It returns null only when the run is over.
 */
import type { TwinSoulCommand, TwinSoulState } from '../core/index.js';

export function nextStrike(state: TwinSoulState): TwinSoulCommand | null {
  if (state.phase !== 'playing' || !state.target) return null;
  const captor = state.shades.find((s) => s.wordId === state.target!.itemId && !s.fallen);
  return captor ? { type: 'strike', shade: captor.id } : null;
}
