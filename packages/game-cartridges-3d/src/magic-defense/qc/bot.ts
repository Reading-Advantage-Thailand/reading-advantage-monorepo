/**
 * A bot that plays Magic Defense from the state alone (the QC driver and the tests use it): it
 * casts the spell word of the missile. It returns null only when the run is over.
 */
import type { MagicDefenseCommand, MagicDefenseState } from '../core/index.js';

export function nextCommand(state: MagicDefenseState): MagicDefenseCommand | null {
  if (state.phase !== 'playing') return null;
  if (!state.started) return { type: 'start' };
  const round = state.round;
  const choice = round?.choices.find((c) => c.wordId === round.wordId && !c.blocked);
  return choice ? { type: 'cast', choice: choice.index } : null;
}
