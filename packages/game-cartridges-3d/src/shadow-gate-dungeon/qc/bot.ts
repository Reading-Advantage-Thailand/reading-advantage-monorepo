/**
 * A bot that plays Shadow Gate Dungeon from the state alone (the QC driver and the tests use it):
 * it walks to the crystal that holds the next word (or to the gate when the sentence is built),
 * bends around the shadows and the wrong crystals when they are close, and waits while it is
 * pushed back. Call it a few times per second.
 */
import { steerAround, type Circle } from '@reading-advantage/advantage-play-kit-3d/sim';
import { GATE, ROOM, TUNING, rightCrystalsOf, type ShadowGateCommand, type ShadowGateState } from '../core/index.js';

/** How far ahead the bot looks for shadows and crystals in the way. */
export const LOOK_AHEAD = 2.2;
/** Shadows are avoided where they will be this many seconds ahead. */
export const PREDICT_S = 0.4;

export function nextSteer(state: ShadowGateState): ShadowGateCommand | null {
  if (state.phase !== 'playing') return null;
  if (state.hero.bumpedMs > 0) return null;
  const right = rightCrystalsOf(state);
  const target = state.gateOpen
    ? GATE
    : right.slice().sort((a, b) => Math.hypot(a.x - state.hero.x, a.z - state.hero.z) - Math.hypot(b.x - state.hero.x, b.z - state.hero.z))[0];
  if (!target) return null;
  const obstacles: Circle[] = [];
  if (!state.gateOpen) {
    for (const s of state.shadows) {
      const d = Math.hypot(state.hero.x - s.x, state.hero.z - s.z) || 1;
      const resting = s.restMs > 700;
      const speed = resting ? 0 : 1.2;
      obstacles.push({
        x: s.x + ((state.hero.x - s.x) / d) * speed * PREDICT_S,
        z: s.z + ((state.hero.z - s.z) / d) * speed * PREDICT_S,
        r: TUNING.shadowRadius + TUNING.heroRadius + (resting ? 0.15 : 0.35),
      });
    }
    for (const c of state.crystals) {
      if (c === target || right.includes(c)) continue;
      obstacles.push({ x: c.x, z: c.z, r: TUNING.crystalRadius + TUNING.heroRadius + 0.45 });
    }
  }
  const steer = steerAround(state.hero, target, obstacles, LOOK_AHEAD, ROOM);
  return { type: 'steer', x: steer.x, z: steer.z };
}
