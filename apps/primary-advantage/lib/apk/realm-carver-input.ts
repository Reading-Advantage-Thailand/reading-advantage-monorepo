/**
 * Realm Carver places one word per interior grid cell and throws when a
 * session has more. The cartridge does not export its limit, so this mirrors
 * `(REALM_CARVER_GRID_SIZE - 2) ** 2` from packages/game-cartridges/src/realm-carver.ts
 * (grid size 12 -> 10 x 10 = 100 words).
 */
export const REALM_CARVER_MAX_WORDS = 100;

/**
 * Limits sentence cards to the Realm Carver word cap.
 *
 * Rule: walk the cards in the order the content API delivered them (soonest
 * due first), keep a card only if all of its words still fit, and skip any
 * card that would overflow. Cards are never split, so no sentence is cut.
 * @param items Sentence cards as delivered by the content API.
 * @returns The kept cards, in the original order, with at most the cap in words.
 */
export function capRealmCarverSentences<T extends { term: string }>(items: readonly T[]): T[] {
  const kept: T[] = [];
  let words = 0;
  for (const item of items) {
    const size = item.term.trim().split(/\s+/u).filter(Boolean).length;
    if (words + size > REALM_CARVER_MAX_WORDS) continue;
    words += size;
    kept.push(item);
  }
  return kept;
}
