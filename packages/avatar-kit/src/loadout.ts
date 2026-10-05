import { AVATAR_BASE, AVATAR_CATALOG } from "./catalog.js";
import { PORTRAIT_INDEX } from "./pack-index.js";
import { portraitPlan, type PortraitItem, type PortraitLoadout } from "./portrait.js";
import { STARTER_SETS, type StarterSet } from "./starters.js";
import type { TintChoice } from "./tint.js";

/** The color slots of the avatar base a student chooses. */
export const TINT_SLOTS = ["skin", "hair", "eyes", "cloth"] as const;
export type TintSlot = (typeof TINT_SLOTS)[number];

/** The hair style every loadout falls back to. */
export const DEFAULT_HAIR = "avatar-hair-swept";

/**
 * The starter set of a hero class.
 * @param classId The hero class (a starter set id).
 * @returns The set, or undefined for an unknown class.
 */
export const starterSet = (classId: string): StarterSet | undefined => STARTER_SETS.find((s) => s.id === classId);

/**
 * The portrait item of a catalog piece in its default dyes (the first option of each dye slot).
 * @param id A catalog id of the pack.
 * @returns The item for the portrait composer.
 * @throws When the id is not in the pack catalog.
 */
export function catalogItem(id: string): PortraitItem {
  const item = AVATAR_CATALOG[id];
  if (!item) throw new Error(`no catalog item '${id}'`);
  const dyes = item.table ? Object.fromEntries(Object.entries(item.table.slots).map(([slot, s]) => [slot, Object.keys(s.options)[0]!])) : {};
  return { id, slot: item.slot, hides: item.hides, hair: item.hair, table: item.table, dyes };
}

/**
 * The portrait loadout of a hero class in the student's colors: the class pieces, the base
 * table, and the tints (the student's choice over the set's own colors).
 * @param classId A starter set id.
 * @param tints The student's option per color slot; missing slots take the set's colors.
 * @returns The loadout for `portraitPlan`.
 * @throws When the class is unknown or a tint is not an option of the base.
 */
export function starterLoadout(classId: string, tints: Partial<Record<TintSlot, string>> = {}): PortraitLoadout {
  const set = starterSet(classId);
  if (!set) throw new Error(`no starter set '${classId}'`);
  const merged: Record<string, string> = { ...set.tints };
  for (const slot of TINT_SLOTS) {
    const option = tints[slot];
    if (option === undefined) continue;
    if (!AVATAR_BASE.slots[slot]?.options[option]) throw new Error(`no option '${option}' in color slot '${slot}'`);
    merged[slot] = option;
  }
  return { base: AVATAR_BASE, tints: merged as TintChoice, pieces: set.pieces.map(catalogItem), defaultHair: catalogItem(DEFAULT_HAIR) };
}

/**
 * The layer files of a loadout in draw order, with the color multipliers of each.
 * @param loadout A portrait loadout (see `starterLoadout`).
 * @returns Per layer: the color and mask file paths under the pack root and the scales.
 * @throws When the pack index has no file for a planned layer.
 */
export function portraitFiles(loadout: PortraitLoadout): { layer: string; color: string; mask: string; scales: [number, number, number][] }[] {
  return portraitPlan(loadout).map(({ layer, scales }) => {
    const files = PORTRAIT_INDEX[layer];
    if (!files) throw new Error(`no portrait layer '${layer}'`);
    return { layer, color: files.color, mask: files.mask, scales };
  });
}
