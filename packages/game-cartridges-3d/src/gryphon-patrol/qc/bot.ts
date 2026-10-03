/**
 * A bot that plays Gryphon Patrol from the state alone (the QC driver and the tests use it): it
 * shoots the bat that carries the next word when the round is open and nothing flies. QC calls it
 * at a human pace (once every second or two), so the gryphon patrols and waits as a student would
 * see it.
 */
import { rightEnemyOf, type PatrolCommand, type PatrolState } from '../core/index.js';

export function nextChoice(state: PatrolState): PatrolCommand | null {
  if (state.phase !== 'patrol' || state.restMs > 0) return null;
  const enemy = rightEnemyOf(state);
  return enemy ? { type: 'shoot', enemy: enemy.id } : null;
}
