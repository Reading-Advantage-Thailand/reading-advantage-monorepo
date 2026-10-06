/**
 * A bot that plays Astral Mage from the state alone, through the public commands (the QC driver
 * and the tests use it): it casts a bolt at the crystal of the next word, and waits while a
 * bolt flies or that crystal is dim. Call it a few times per second.
 */
import { nextCrystalOf, type AstralMageCommand, type AstralMageState } from '../core/index.js';

export function nextCast(state: AstralMageState): AstralMageCommand | null {
  if (state.phase !== 'playing' || state.bolt !== null) return null;
  const next = nextCrystalOf(state);
  if (!next || next.dimMs > 0) return null;
  return { type: 'cast', crystalId: next.id };
}
