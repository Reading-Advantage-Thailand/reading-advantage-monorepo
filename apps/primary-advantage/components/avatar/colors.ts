import { AVATAR_BASE, TINT_SLOTS, type TintSlot } from "@reading-advantage/avatar-kit";

/**
 * A linear light value as an sRGB byte.
 * @param v The linear value, 0 to 1.
 * @returns The byte, 0 to 255.
 */
const toSrgb = (v: number): number => Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055));

/**
 * The CSS color of a color option of the avatar base, for a swatch.
 * @param slot The color slot.
 * @param option The option name.
 * @returns A hex color.
 * @throws When the slot or the option is unknown.
 */
export function swatchColor(slot: TintSlot, option: string): string {
  const rgb = AVATAR_BASE.slots[slot]?.options[option];
  if (!rgb) throw new Error(`no option '${option}' in color slot '${slot}'`);
  return `#${rgb.map((v) => toSrgb(v).toString(16).padStart(2, "0")).join("")}`;
}

/** The options of every color slot, in the order of the base table. */
export const TINT_OPTIONS: Readonly<Record<TintSlot, readonly string[]>> = Object.fromEntries(TINT_SLOTS.map((slot) => [slot, Object.keys(AVATAR_BASE.slots[slot]!.options)])) as unknown as Record<TintSlot, readonly string[]>;
