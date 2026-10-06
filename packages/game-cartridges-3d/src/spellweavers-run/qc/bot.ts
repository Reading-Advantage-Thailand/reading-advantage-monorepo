/**
 * A bot that plays Spellweaver's Run from the state alone (the QC driver and the tests use it):
 * it picks the lane that carries the next word when the round has no choice yet. QC calls it at a
 * human pace (once every second or two), so the wizard runs and waits as a student would see it.
 */
import { correctLaneOf, type SpellweaversCommand, type SpellweaversState } from '../core/index.js';

export function nextChoice(state: SpellweaversState): SpellweaversCommand | null {
  if (state.phase !== 'running' || !state.round || state.round.chosen !== null || state.restMs > 0) return null;
  const lane = correctLaneOf(state);
  return lane === null ? null : { type: 'choose', lane };
}
