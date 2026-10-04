/**
 * GP price of an avatar item (docs/avatar-system.md, section 6).
 *
 *   price = round5(slotBase x (1 + triangleBonus + ratingBonus) x tierMultiplier)
 *
 * The slot and the hand-set tier decide the price. The triangle count and the review rating only
 * adjust it (at most +30% and +20%). A missing rating adds nothing. The P0 or P1 priority and the
 * source character are not inputs.
 */

export type AvatarSlot =
  | 'hair' | 'head' | 'chest' | 'robe' | 'shoulders' | 'back' | 'hands' | 'waist' | 'feet'
  | 'mainhand' | 'offhand' | 'accessory' | 'tool' | 'none';

/** Hair styles are free (docs/avatar-system.md, section 3). */
export const SLOT_BASE: Readonly<Record<AvatarSlot, number>> = {
  hair: 0, head: 40, chest: 50, robe: 50, shoulders: 30, back: 30, hands: 20, waist: 20, feet: 20,
  mainhand: 50, offhand: 40, accessory: 30, tool: 30, none: 0,
};

/** Tier 1 opens at level 1, tier 2 at level 5, tier 3 at level 10. */
export const TIER_MULTIPLIER: Readonly<Record<number, number>> = { 1: 1, 2: 2, 3: 4 };
export const TIER_LEVEL: Readonly<Record<number, number>> = { 1: 1, 2: 5, 3: 10 };

/** Bonus for the triangle count of the piece's GLB. Capped at +30%. */
export function triangleBonus(triangles: number | null): number {
  if (triangles === null) return 0;
  if (triangles < 2500) return 0;
  if (triangles <= 5000) return 0.1;
  if (triangles <= 8000) return 0.2;
  return 0.3;
}

/** Bonus for the review rating (0 to 10). An unrated piece gets 0. */
export function ratingBonus(rating: number | null): number {
  if (rating === null || rating < 7) return 0;
  return rating >= 8 ? 0.2 : 0.1;
}

export interface PriceInput {
  slot: AvatarSlot;
  tier: number;
  triangles: number | null;
  rating: number | null;
}

/** The computed GP price, rounded to 5. */
export function avatarPrice({ slot, tier, triangles, rating }: PriceInput): number {
  const multiplier = TIER_MULTIPLIER[tier];
  if (multiplier === undefined) throw new Error(`Unknown tier ${tier}`);
  const raw = SLOT_BASE[slot] * (1 + triangleBonus(triangles) + ratingBonus(rating)) * multiplier;
  return Math.round(raw / 5) * 5;
}
