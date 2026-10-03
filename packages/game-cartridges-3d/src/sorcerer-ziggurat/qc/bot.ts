/**
 * A bot that plays the Sorcerer's Ziggurat from the state alone, through the public commands
 * (the QC driver and the tests use it): it steps onto the cube with the next word. It never
 * steps onto a wrong cube. It returns one command, or null when the climb is over.
 */
import { correctCubeOf, type ZigguratCommand, type ZigguratState } from '../core/index.js';

export function nextStep(state: ZigguratState): ZigguratCommand | null {
  if (state.phase !== 'climbing') return null;
  const cube = correctCubeOf(state);
  return cube ? { type: 'step', cubeId: cube.id } : null;
}
