/**
 * A bot that plays Potion Rush from the state alone (the QC driver and the tests use it): it
 * serves any ready potion, then drops the belt item nearest to leaving into a cauldron that
 * needs its word next. A word only one cauldron needs is a tap (`targetFor`); a word two
 * cauldrons need goes, as a drag, to the customer with the least patience left.
 * Call it once per step until it returns null, then tick.
 */
import { nextWordOf, targetFor, type PotionRushCommand, type PotionRushState } from '../core/index.js';

/** The cauldron to drag the item into: the one `targetFor` names, else the neediest of those that want the word. */
export function cauldronFor(state: PotionRushState, itemId: string): number | null {
  const tapped = targetFor(state, itemId);
  if (tapped !== null) return tapped;
  const item = state.belt.find((i) => i.id === itemId);
  if (!item) return null;
  const word = item.word.toLowerCase();
  let best: number | null = null;
  let patience = Infinity;
  for (let i = 0; i < state.cauldrons.length; i++) {
    const next = nextWordOf(state, i);
    const slot = state.slots[i];
    if (next === null || !slot || next.toLowerCase() !== word) continue;
    if (slot.patienceMs < patience) {
      patience = slot.patienceMs;
      best = i;
    }
  }
  return best;
}

export function nextDrop(state: PotionRushState): PotionRushCommand | null {
  if (state.phase !== 'playing') return null;
  const ready = state.cauldrons.find((c) => c.ready);
  if (ready) return { type: 'serve', cauldron: ready.index };
  const items = state.belt.slice().sort((a, b) => a.position - b.position);
  for (const item of items) {
    const cauldron = cauldronFor(state, item.id);
    if (cauldron !== null) return { type: 'drop', itemId: item.id, cauldron };
  }
  return null;
}
