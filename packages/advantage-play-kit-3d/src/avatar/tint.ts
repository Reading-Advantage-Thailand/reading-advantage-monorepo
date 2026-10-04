/**
 * Avatar colors (docs/color-variants.md): the slot table of a GLB (`forgeVariants`) and the color
 * multipliers of its tint mask channels. Pure: the 3D composer and the portraits use it.
 */
export type TintChannel = 'R' | 'G' | 'B' | 'A';

/** One color slot of a GLB's slot table (`forgeVariants.slots`): options in linear RGB. */
export interface VariantSlot {
  readonly channel: TintChannel;
  readonly default: string;
  readonly options: Readonly<Record<string, readonly [number, number, number]>>;
}

/** The slot table in the GLB root extras (`forgeVariants`). */
export interface VariantTable {
  readonly slots: Readonly<Record<string, VariantSlot>>;
  readonly presets: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /** The name of the tint mask texture, or null for a vertex-color build. */
  readonly mask: string | null;
}

/** A preset name or an option per color slot. */
export type TintChoice = string | Readonly<Record<string, string>>;

const CHANNELS: readonly TintChannel[] = ['R', 'G', 'B', 'A'];

/**
 * The color multipliers of the four mask channels (R, G, B, A): option / default per channel for
 * each chosen slot, 1 elsewhere. `choice` is a preset name or an option per slot; an unknown slot
 * or option throws.
 */
export function tintScales(table: VariantTable, choice: TintChoice | undefined): [number, number, number][] {
  const picks = typeof choice === 'string' ? table.presets[choice] : choice;
  if (typeof choice === 'string' && !picks) throw new Error(`no tint preset '${choice}'`);
  const scales: [number, number, number][] = CHANNELS.map(() => [1, 1, 1]);
  for (const [slot, option] of Object.entries(picks ?? {})) {
    const s = table.slots[slot];
    if (!s) throw new Error(`no color slot '${slot}'`);
    const to = s.options[option];
    if (!to) throw new Error(`no option '${option}' in color slot '${slot}'`);
    const from = s.options[s.default]!;
    scales[CHANNELS.indexOf(s.channel)] = [0, 1, 2].map((i) => (from[i]! > 1e-5 ? to[i]! / from[i]! : 1)) as [number, number, number];
  }
  return scales;
}

/** The base hair option of a tint choice (a hair style takes it): from the preset or the choice. */
export function hairTint(base: VariantTable | null, choice: TintChoice | undefined): string | undefined {
  return typeof choice === 'string' ? base?.presets[choice]?.hair : choice?.hair;
}
