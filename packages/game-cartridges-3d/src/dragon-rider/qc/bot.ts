/**
 * A bot that plays Dragon Rider from the state alone (the QC driver and the tests use it): it
 * chooses the gate that carries the current word's meaning when the round has no choice yet.
 */
import { correctGateOf, type DragonRiderCommand, type DragonRiderState } from '../core/index.js';

export function nextChoice(state: DragonRiderState): DragonRiderCommand | null {
  if (state.phase !== 'riding' || !state.round || state.round.chosen !== null) return null;
  const gate = correctGateOf(state);
  return gate === null ? null : { type: 'choose', gate };
}
