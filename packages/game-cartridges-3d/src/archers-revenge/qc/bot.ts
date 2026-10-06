/**
 * A bot that plays Archer's Revenge from the state alone (the QC driver and the tests use it): it
 * shoots the lane that carries the word of the prompt. It returns null only when the run is over.
 */
import type { ArchersRevengeCommand, ArchersRevengeState } from '../core/index.js';

export function nextCommand(state: ArchersRevengeState): ArchersRevengeCommand | null {
  if (state.phase !== 'playing') return null;
  if (!state.started) return { type: 'start' };
  const round = state.round;
  const lane = round?.lanes.find((l) => l.wordId === round.wordId && !l.blocked);
  return lane ? { type: 'fire', lane: lane.lane } : null;
}
