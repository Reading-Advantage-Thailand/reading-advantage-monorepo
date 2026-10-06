/**
 * A bot that plays Dungeon Liberator from the state alone (the QC driver and the tests use it):
 * it walks to the villager of the next word (or to the gate when the line is complete), bends
 * around skeletons and other touchable villagers when they are close, and waits when the next
 * villager is not touchable yet (stepping back or running home). Call it a few times per second.
 */
import { steerAround, type Circle } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  GATE,
  ROOM,
  TUNING,
  nextVillagerOf,
  type DungeonLiberatorCommand,
  type DungeonLiberatorState,
} from '../core/index.js';

/** How far ahead the bot looks for skeletons and villagers in the way. */
export const LOOK_AHEAD = 2.2;
/** Skeletons are avoided where they will be this many seconds ahead. */
export const PREDICT_S = 0.5;

export function nextSteer(state: DungeonLiberatorState): DungeonLiberatorCommand | null {
  if (state.phase !== 'playing') return null;
  if (state.knight.bumpedMs > 0) return null;
  const next = state.gateOpen ? null : nextVillagerOf(state);
  if (!state.gateOpen && !next) return null;
  if (next && (next.refusedMs > 0 || next.returning)) return { type: 'steer', x: 0, z: 0 };
  const target = next ?? GATE;
  // A skeleton counts where it will be in half a second, with room to pass.
  const obstacles: Circle[] = state.gateOpen
    ? []
    : state.skeletons.map((s) => ({
        x: s.x + s.vx * PREDICT_S,
        z: s.z + s.vz * PREDICT_S,
        r: TUNING.skeletonRadius + TUNING.knightRadius + 0.5,
      }));
  for (const v of state.villagers) {
    if (v.following || (next && v.id === next.id)) continue;
    obstacles.push({ x: v.x, z: v.z, r: TUNING.villagerRadius + TUNING.knightRadius + 0.45 });
  }
  const steer = steerAround(state.knight, target, obstacles, LOOK_AHEAD, ROOM);
  return { type: 'steer', x: steer.x, z: steer.z };
}
