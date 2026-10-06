/**
 * The starter sets (docs/avatar-system.md, section 6): one per hero class. A new student picks a
 * class and receives its set for free: base colors, a hair style, and one tier 1 piece per slot
 * that the class uses. Every id is a `ready` row of docs/avatar-catalog.tsv
 * (`tests/apk3d/avatar-starters.test.ts` checks the rows, the slots, and the hands).
 */

export interface StarterSet {
  /** The hero class (a Forge hero asset name). */
  readonly id: string;
  /** Base colors: an option per color slot of the avatar base. */
  readonly tints: Readonly<Record<'skin' | 'hair' | 'eyes' | 'cloth', string>>;
  /** Catalog ids: the hair style first, then one piece per slot. */
  readonly pieces: readonly string[];
}

export const STARTER_SETS: readonly StarterSet[] = [
  {
    id: 'knight',
    tints: { skin: 'fair', hair: 'brown', eyes: 'blue', cloth: 'sky' },
    pieces: ['avatar-hair-short', 'leather-cap', 'studded-leather', 'gloves', 'boots', 'adventurer-sword', 'round-shield'],
  },
  {
    id: 'wizard',
    tints: { skin: 'light', hair: 'silver', eyes: 'violet', cloth: 'slate' },
    pieces: ['avatar-hair-long', 'wizard-hat', 'cape', 'boots', 'mage-wand'],
  },
  {
    id: 'cleric',
    tints: { skin: 'tan', hair: 'blond', eyes: 'hazel', cloth: 'linen' },
    pieces: ['avatar-hair-short', 'cloth-hood', 'leather-armor', 'belt', 'boots', 'mace', 'buckler'],
  },
  {
    id: 'rogue',
    tints: { skin: 'light', hair: 'black', eyes: 'green', cloth: 'moss' },
    pieces: ['avatar-hair-swept', 'rogue-hood', 'leather-armor', 'gloves', 'boots', 'rogue-dagger'],
  },
  {
    id: 'ranger',
    tints: { skin: 'tan', hair: 'auburn', eyes: 'green', cloth: 'moss' },
    pieces: ['avatar-hair-ponytail', 'explorer-hat', 'leather-armor', 'bracers', 'boots', 'shortbow'],
  },
  {
    id: 'bard',
    tints: { skin: 'fair', hair: 'auburn', eyes: 'blue', cloth: 'rose' },
    pieces: ['avatar-hair-ponytail', 'bard-hat', 'cape', 'boots', 'dagger'],
  },
  {
    id: 'witch',
    tints: { skin: 'light', hair: 'black', eyes: 'violet', cloth: 'slate' },
    pieces: ['avatar-hair-long', 'witch-hat', 'cape', 'boots', 'witch-broom', 'witch-potion'],
  },
  {
    id: 'druid',
    tints: { skin: 'brown', hair: 'brown', eyes: 'green', cloth: 'moss' },
    pieces: ['avatar-hair-long', 'druid-cap', 'belt', 'boots', 'quarterstaff'],
  },
  {
    id: 'shaman',
    tints: { skin: 'deep', hair: 'black', eyes: 'brown', cloth: 'linen' },
    pieces: ['avatar-hair-ponytail', 'shaman-cap', 'bracers', 'club', 'shaman-feather'],
  },
  {
    id: 'duelist',
    tints: { skin: 'fair', hair: 'black', eyes: 'brown', cloth: 'rose' },
    pieces: ['avatar-hair-swept', 'duelist-hat', 'gloves', 'boots', 'short-sword'],
  },
  {
    id: 'swashbuckler',
    tints: { skin: 'tan', hair: 'black', eyes: 'hazel', cloth: 'rose' },
    pieces: ['avatar-hair-swept', 'swashbuckler-bandana', 'belt', 'boots', 'swashbuckler-dagger'],
  },
  {
    id: 'treasure-hunter',
    tints: { skin: 'tan', hair: 'brown', eyes: 'hazel', cloth: 'linen' },
    pieces: ['avatar-hair-short', 'treasure-hunter-hat', 'leather-armor', 'boots', 'treasure-hunter-whip', 'treasure-hunter-torch'],
  },
  {
    id: 'explorer',
    tints: { skin: 'brown', hair: 'blond', eyes: 'blue', cloth: 'linen' },
    pieces: ['avatar-hair-short', 'explorer-hat', 'belt', 'boots', 'spear', 'explorer-map'],
  },
  {
    id: 'gladiator',
    tints: { skin: 'deep', hair: 'black', eyes: 'brown', cloth: 'rose' },
    pieces: ['avatar-hair-short', 'bracers', 'belt', 'boots', 'gladiator-sword', 'gladiator-shield'],
  },
  {
    id: 'shield-maiden',
    tints: { skin: 'fair', hair: 'blond', eyes: 'blue', cloth: 'sky' },
    pieces: ['avatar-hair-ponytail', 'studded-leather', 'bracers', 'boots', 'shield-maiden-axe', 'shield-maiden-shield'],
  },
];
