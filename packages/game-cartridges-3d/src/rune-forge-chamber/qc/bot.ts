/**
 * A bot that plays Rune Forge Chamber from the state alone, through the public commands (the QC
 * driver and the tests use it): it chooses the rune that holds the next word, and waits while a
 * strike runs. Call it a few times per second.
 */
import { rightRuneOf, type RuneForgeChamberCommand, type RuneForgeChamberState } from '../core/index.js';

export function nextChoice(state: RuneForgeChamberState): RuneForgeChamberCommand | null {
  if (state.phase !== 'playing' || state.strike !== null) return null;
  const rune = rightRuneOf(state);
  if (!rune || rune.dimMs > 0) return null;
  return { type: 'choose', runeId: rune.id };
}
