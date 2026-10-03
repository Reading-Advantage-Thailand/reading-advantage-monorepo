/**
 * A bot that plays Village Guardian from the state alone (the QC driver and the tests use it):
 * it walks to the villager of the next word (or to the barn door when the line is complete),
 * bends around threats and other callable villagers when they are close, and waits when the next
 * villager is not callable yet (hiding or running home). Call it a few times per second.
 */
import { directionTo, steerAround, type Circle } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  BARN_DOOR,
  GREEN,
  TUNING,
  nextVillagerOf,
  type VillageGuardianCommand,
  type VillageGuardianState,
} from '../core/index.js';

/** How far ahead the bot looks for threats and villagers in the way. */
export const LOOK_AHEAD = 2.2;
/** Threats are avoided where they will be this many seconds ahead. */
export const PREDICT_S = 0.5;

export function nextSteer(state: VillageGuardianState): VillageGuardianCommand | null {
  if (state.phase !== 'playing') return null;
  if (state.guardian.bumpedMs > 0) return null;
  const next = state.barnOpen ? null : nextVillagerOf(state);
  if (!state.barnOpen && !next) return null;
  if (next && (next.refusedMs > 0 || next.returning)) return { type: 'steer', x: 0, z: 0 };
  // Standing on the next villager's spot without a call (a pushed guardian): step off, then come back.
  if (next && next.contact) {
    const away = directionTo(next, state.guardian);
    const out = Math.hypot(away.x, away.z) < 1e-9 ? { x: 0, z: 1 } : away;
    return { type: 'steer', x: out.x, z: out.z };
  }
  const target = next ?? BARN_DOOR;
  // A threat counts where it will be in half a second, with room to pass (goblins get more room).
  const obstacles: Circle[] = state.barnOpen
    ? []
    : state.threats.map((s) => ({
        x: s.x + s.vx * PREDICT_S,
        z: s.z + s.vz * PREDICT_S,
        r: TUNING.threatRadius + TUNING.guardianRadius + (s.kind === 'goblin-warrior' ? 0.8 : 0.5),
      }));
  for (const v of state.villagers) {
    if (v.following || (next && v.id === next.id)) continue;
    obstacles.push({ x: v.x, z: v.z, r: TUNING.villagerRadius + TUNING.guardianRadius + 0.45 });
  }
  const steer = steerAround(state.guardian, target, obstacles, LOOK_AHEAD, GREEN);
  return { type: 'steer', x: steer.x, z: steer.z };
}
