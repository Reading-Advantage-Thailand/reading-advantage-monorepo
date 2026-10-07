/**
 * A bot that plays Dragon Flight from the state alone (the QC driver and the tests use it): it
 * picks the gate that carries the current word's meaning when the round has no choice yet.
 * QC calls it at a human pace (once every second or two), so the dragon flies and hovers as a
 * student would see it.
 */
import { correctGateOf, type DragonFlightCommand, type DragonFlightState } from '../core/index.js';

export function nextChoice(state: DragonFlightState): Extract<DragonFlightCommand, { type: 'choose' }> | null {
  if (state.phase !== 'flying' || !state.round || state.round.chosen !== null) return null;
  const gate = correctGateOf(state);
  return gate === null ? null : { type: 'choose', gate };
}
