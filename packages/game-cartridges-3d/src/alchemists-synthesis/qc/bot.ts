/**
 * A bot that plays Alchemist's Synthesis from the state alone, through the public commands (the QC
 * driver and the tests use it): it chooses the jar whose term is the formula's word, and waits
 * while a pour runs. Call it a few times per second.
 */
import { correctJarOf, type AlchemistsSynthesisCommand, type AlchemistsSynthesisState } from '../core/index.js';

export function nextChoice(state: AlchemistsSynthesisState): AlchemistsSynthesisCommand | null {
  if (state.phase !== 'playing' || state.pour !== null) return null;
  const jar = correctJarOf(state);
  if (!jar || jar.dimMs > 0) return null;
  return { type: 'choose', jarId: jar.id };
}
