/**
 * A bot that plays Griffin Riders Escape from the state alone (the QC driver and the tests use
 * it): it sends the griffin to the lane of the next word, and around a storm through a free lane
 * (the one nearest to the next word's lane). QC calls it at a human pace, so the griffin flies
 * and the student sees the lanes change one by one.
 */
import { type EscapeCommand, type EscapeState } from '../core/index.js';

/** The lane the griffin should fly in now, or null with nothing ahead. */
export function wantedLane(state: EscapeState): number | null {
  const wave = state.waves[0];
  if (!wave) return null;
  const gates = state.waves.find((w) => w.kind === 'gates');
  if (wave.kind === 'gates') return wave.rightLane;
  const free = Array.from({ length: state.laneCount }, (_, i) => i).filter((l) => !wave.stormLanes.includes(l));
  const goal = gates ? gates.rightLane : state.griffin.lane;
  return free.sort((a, b) => Math.abs(a - goal) - Math.abs(b - goal) || a - b)[0] ?? null;
}

export function nextChoice(state: EscapeState): EscapeCommand | null {
  if (state.phase !== 'flight') return null;
  const lane = wantedLane(state);
  if (lane === null || lane === state.griffin.lane) return null;
  return { type: 'lane', lane };
}
