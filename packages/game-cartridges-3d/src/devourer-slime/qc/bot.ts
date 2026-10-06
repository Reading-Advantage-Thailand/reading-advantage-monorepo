/**
 * A bot that plays Devourer Slime from the state alone (the QC driver and the tests use it): it
 * moves to the bubble of the next word, bends around bigger guards and other bubbles when they
 * are close, and waits out a spat bubble's cooldown. Guards smaller than the slime are food, not
 * obstacles. Call it a few times per second.
 */
import { steerAround, type Circle } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  CLEARING,
  TUNING,
  nextBubbleOf,
  radiusOf,
  type DevourerSlimeCommand,
  type DevourerSlimeState,
} from '../core/index.js';

/** How far ahead the bot looks for guards and bubbles in the way. */
export const LOOK_AHEAD = 2.2;
/** Guards are avoided where they will be this many seconds ahead. */
export const PREDICT_S = 0.5;

export function nextSteer(state: DevourerSlimeState): DevourerSlimeCommand | null {
  if (state.phase !== 'playing') return null;
  if (state.slime.bumpedMs > 0) return null;
  const next = nextBubbleOf(state);
  if (!next) return null;
  if (next.spatMs > 0) return { type: 'steer', x: 0, z: 0 };
  const slimeRadius = radiusOf(state.slime.size);
  const obstacles: Circle[] = [];
  for (const g of state.guards) {
    if (state.slime.poweredMs > 0) continue;
    obstacles.push({ x: g.x + g.vx * PREDICT_S, z: g.z + g.vz * PREDICT_S, r: radiusOf(g.size) + slimeRadius + 0.5 });
  }
  for (const b of state.bubbles) {
    if (b.eaten || b.id === next.id) continue;
    obstacles.push({ x: b.x, z: b.z, r: TUNING.bubbleRadius + slimeRadius + 0.45 });
  }
  const steer = steerAround(state.slime, next, obstacles, LOOK_AHEAD, CLEARING);
  return { type: 'steer', x: steer.x, z: steer.z };
}
