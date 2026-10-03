/**
 * A bot that plays Enchanted Library from the state alone (the QC driver and the tests use it):
 * it raises the shield when a spirit comes close, and steers to the right book around the
 * decoys. It never touches a wrong book on purpose. Call it a few times per second; it returns
 * one public command, or null when the team cannot act.
 */
import { HALL, TOUCH, targetBookOf, type LibraryCommand, type LibraryState } from '../core/index.js';
import { distance, steerAround } from '@reading-advantage/advantage-play-kit-3d/sim';

/** The bot raises the shield when a spirit is this close. */
export const DANGER = 2;
/** The bot keeps this far from the middle of a decoy book. */
const AVOID = TOUCH + 0.25;

export function nextCommand(state: LibraryState): LibraryCommand | null {
  if (state.phase !== 'playing') return null;
  const hero = state.hero;
  if (hero.controlMs > 0) return null;
  if (hero.charges > 0 && hero.shieldMs === 0 && hero.hurtMs === 0 && state.spirits.some((s) => distance(s, hero) <= DANGER)) return { type: 'shield' };
  const target = targetBookOf(state);
  if (!target) return null;
  const obstacles = state.books.filter((b) => !b.correct && !b.spent).map((b) => ({ x: b.x, z: b.z, r: AVOID }));
  const dir = steerAround(hero, target, obstacles, 3, HALL);
  return { type: 'steer', x: dir.x, z: dir.z };
}

