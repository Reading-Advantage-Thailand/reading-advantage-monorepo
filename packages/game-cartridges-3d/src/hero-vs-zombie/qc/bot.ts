/**
 * A bot that plays Hero vs. Zombie from the state alone (the QC driver and the tests use it): it
 * runs to the orb with the round word's meaning, bends around walking zombies and the other orbs
 * when they are close, and fires the Blast when two or more zombies are within 3 m and a charge
 * is ready. The QC calls it every 150 ms.
 */
import { directionTo, distance, steerAround, type Circle } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  TUNING,
  YARD,
  correctOrbOf,
  isWalking,
  zombieSpeedFor,
  type HeroVsZombieCommand,
  type HeroVsZombieState,
} from '../core/index.js';

/** How far ahead the bot looks for zombies and orbs in the way. */
export const LOOK_AHEAD = 2.2;
/** Zombies are avoided where they will be this many seconds ahead. */
export const PREDICT_S = 0.5;
/** The Blast fires with this many walking zombies within this distance. */
export const BLAST_RANGE = 3;
export const BLAST_ZOMBIES = 2;

export function nextCommand(state: HeroVsZombieState): HeroVsZombieCommand | null {
  if (state.phase !== 'night') return null;
  const hero = state.hero;
  const walkers = state.zombies.filter(isWalking);
  const near = walkers.filter((z) => distance(z, hero) <= BLAST_RANGE).length;
  if (state.charges > 0 && near >= BLAST_ZOMBIES) return { type: 'blast' };
  if (hero.bumpedMs > 0) return null;
  const target = correctOrbOf(state);
  if (!target) return null;
  // A zombie counts where it will be in half a second, with room to pass.
  const speed = zombieSpeedFor(state.helper);
  const obstacles: Circle[] = walkers.map((z) => {
    const dir = directionTo(z, hero);
    return {
      x: z.x + dir.x * speed * PREDICT_S,
      z: z.z + dir.z * speed * PREDICT_S,
      r: TUNING.zombieRadius + TUNING.heroRadius + 0.5,
    };
  });
  for (const orb of state.orbs) {
    if (orb.id === target.id) continue;
    obstacles.push({ x: orb.x, z: orb.z, r: TUNING.orbRadius + TUNING.heroRadius + 0.3 });
  }
  const steer = steerAround(hero, target, obstacles, LOOK_AHEAD, YARD);
  return { type: 'steer', x: steer.x, z: steer.z };
}
