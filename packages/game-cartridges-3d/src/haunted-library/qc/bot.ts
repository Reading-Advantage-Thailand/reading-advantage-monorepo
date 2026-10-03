/**
 * A bot that plays Haunted Library from the state alone (the QC driver and the tests use it):
 * it goes to the floor of the next door (to the nearer end pad to go up, a drop to go down),
 * walks to the door, and opens it. It never opens a door out of order. Call it a few times per
 * second; it returns one public command, or null when the hero cannot act.
 */
import { TUNING, nextDoorOf, type LibraryCommand, type LibraryState } from '../core/index.js';

/** The bot stops and opens a door when it stands this close (inside the core's open range). */
export const REACH = TUNING.openRange * 0.8;

export function nextCommand(state: LibraryState): LibraryCommand | null {
  if (state.phase !== 'playing') return null;
  const hero = state.hero;
  if (hero.travelMs > 0 || hero.controlMs > 0) return null;
  const door = nextDoorOf(state);
  if (!door) return null;
  if (hero.floor > door.floor) return { type: 'drop' };
  if (hero.floor < door.floor) {
    // Up: walk to the nearer end of the floor; the pad there bounces the hero.
    return { type: 'move', dir: hero.x >= 0 ? 1 : -1 };
  }
  const dx = door.x - hero.x;
  if (Math.abs(dx) <= REACH) {
    // Stop first (the walk direction holds), then open on the next call.
    return state.move !== 0 ? { type: 'move', dir: 0 } : { type: 'open' };
  }
  return { type: 'move', dir: Math.sign(dx) };
}
