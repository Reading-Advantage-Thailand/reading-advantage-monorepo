/**
 * The launch avatar in a game (docs/avatar-system.md, section 11; track avatar_in_games_20261006):
 * the pure rules. `src/apk3d/stage/avatar.ts` loads and composes the avatar.
 */
import { launchAvatarSchema, type AvatarClassId, type LaunchAvatar } from '../contracts/avatar.js';
import type { HairForm } from './hair.js';
import { AVATAR_PACK_VERSION } from './pack.js';
import { STARTER_SETS } from './starters.js';
import type { VariantTable } from './tint.js';

/** The hair style worn when the loadout has none (the base hair is the swept style). */
export const DEFAULT_HAIR = 'avatar-hair-swept';

/** One piece of the pack's `catalog.json` (scripts/avatar-pack.ts), the fields a game reads. */
export interface AvatarCatalogItem {
  readonly id: string;
  readonly slot: string;
  readonly equip: { readonly hides: readonly string[]; readonly hair: HairForm } | null;
  readonly dyes: VariantTable | null;
  readonly files: { readonly model: string; readonly capped?: string; readonly tucked?: string };
}

/** The pack's `catalog.json`, the fields a game reads. */
export interface AvatarCatalog {
  readonly version: string;
  readonly base: { readonly file: string; readonly clips: readonly string[]; readonly variants: VariantTable | null };
  readonly items: readonly AvatarCatalogItem[];
}

/**
 * The color option of each dye slot of a piece in one dye: the dye where the slot has it as an
 * option, else the slot's first option. No dye (null) is the first option of every slot. This is
 * the rule of the monorepo `avatar-kit` (`catalogItem`), so a game shows what the shop sold.
 */
export function pieceDyes(table: VariantTable | null, dye: string | null): Record<string, string> {
  if (!table) return {};
  return Object.fromEntries(Object.entries(table.slots).map(([slot, s]) => [slot, dye && s.options[dye] ? dye : Object.keys(s.options)[0]!]));
}

/** The place a class takes in a party of heroes. */
export type AvatarRole = 'fighter' | 'caster' | 'healer';

/** The role of each class: casters and healers by their magic, every other class fights. */
export const CLASS_ROLES: Readonly<Record<AvatarClassId, AvatarRole>> = {
  knight: 'fighter',
  wizard: 'caster',
  cleric: 'healer',
  rogue: 'fighter',
  ranger: 'fighter',
  bard: 'healer',
  witch: 'caster',
  druid: 'caster',
  shaman: 'caster',
  duelist: 'fighter',
  swashbuckler: 'fighter',
  'treasure-hunter': 'fighter',
  explorer: 'fighter',
  gladiator: 'fighter',
  'shield-maiden': 'fighter',
};

/** The fixed hero of each role: the heroes of the party games and of the 2D pack. */
export const ROLE_HEROES: Readonly<Record<AvatarRole, 'knight' | 'wizard' | 'cleric'>> = { fighter: 'knight', caster: 'wizard', healer: 'cleric' };

/** The fixed hero whose place the avatar of a class takes. */
export const roleHero = (classId: AvatarClassId): 'knight' | 'wizard' | 'cleric' => ROLE_HEROES[CLASS_ROLES[classId]];

/**
 * The player's hero in a 2D view: the hero of the avatar's role when the session has an avatar,
 * else the chosen hero; `fallback` when `heroes` (the heroes the view has) does not hold it. With
 * an avatar, the view shows the student's own figure (view2d `Figure2D`), never this hero's sprite:
 * the hero only gives the clip names and the effects of the role.
 */
export function shownHero(heroes: readonly string[], options: { readonly hero: string; readonly avatar?: LaunchAvatar | undefined }, fallback: string): string {
  const hero = options.avatar ? roleHero(options.avatar.classId) : options.hero;
  return heroes.includes(hero) ? hero : fallback;
}

/**
 * Hero clips that the avatar base names differently: a game asks for the hero clip and the avatar
 * plays its own. Content is rated G, so a defeated avatar rests; it does not die.
 */
export const AVATAR_CLIP_ALIASES: Readonly<Record<string, string>> = { victory: 'cheer', death: 'rest' };

/**
 * The launch avatar, or the reason it is not valid (each issue with its path). A game keeps its
 * fixed hero for an invalid avatar and reports the reason as a warning; it never stops for it.
 */
export function readLaunchAvatar(value: unknown): { avatar: LaunchAvatar } | { error: string } {
  const result = launchAvatarSchema.safeParse(value);
  if (result.success) return { avatar: result.data };
  return { error: result.error.issues.map((i) => `${i.path.join('.') || 'avatar'}: ${i.message}`).join('; ') };
}

/**
 * The launch avatar of a starter set (every piece in its own colors), for hosts and tests that
 * have no student: the Forge demo's `?avatar=<class>`. Undefined for an unknown class.
 */
export function starterLaunchAvatar(classId: string, catalogVersion: string = AVATAR_PACK_VERSION): LaunchAvatar | undefined {
  const set = STARTER_SETS.find((s) => s.id === classId);
  if (!set) return undefined;
  return launchAvatarSchema.parse({ catalogVersion, classId: set.id, tints: set.tints, pieces: set.pieces.map((itemId) => ({ itemId, dye: null })) });
}

/**
 * Reads from the pack of the launch version, or from the current pack when that version is not
 * served (a profile saved against an older pack). Returns the value and the version it came from.
 */
export async function fromServedVersion<T>(version: string, read: (version: string) => Promise<T>): Promise<{ value: T; version: string }> {
  try {
    return { value: await read(version), version };
  } catch (error) {
    if (version === AVATAR_PACK_VERSION) throw error;
    return { value: await read(AVATAR_PACK_VERSION), version: AVATAR_PACK_VERSION };
  }
}
