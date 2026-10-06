/**
 * Hair under head pieces (docs/avatar-system.md, section 4). Pure: the 3D composer and the
 * portraits use it.
 */

/** What the head piece of a loadout does to the hair (`forgeEquip.hair`). */
export type HairForm = 'full' | 'capped' | 'tucked' | 'hidden';

/** The hair form of a set of head piece forms: hidden wins over tucked, tucked over capped, capped over full. */
export function strongestHairForm(forms: readonly HairForm[]): HairForm {
  return (['hidden', 'tucked', 'capped'] as const).find((f) => forms.includes(f)) ?? 'full';
}
